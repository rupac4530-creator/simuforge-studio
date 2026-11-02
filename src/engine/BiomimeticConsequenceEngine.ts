// ============================================================
// SimuForge Studio — Biomimetic Multi-Physics Consequence Engine
// Solves: Optics & PiP exposure, Skin Stress & Servo Stalls,
// Electrical & Bus Bandwidth, Thermal Cascade, 180cm Dynamics
// ============================================================

import {
  CameraModelId, SiliconeMaterialId, BatteryPackType,
  EyeballOpticsState, FACSState, BiomimeticConsequenceMetrics
} from '../types/biomimetic';
import {
  CAMERA_REGISTRY, SILICONE_REGISTRY, BATTERY_REGISTRY,
  COMPUTE_STACK, THERMAL_LOOP_SPECS, CRANIAL_ACTUATORS
} from './ComponentRegistry';

export class BiomimeticConsequenceEngine {
  private ambientTempC = 24.0;
  private headAngularVelocityDegPerS = 0.0;
  private prevHeadYawDeg = 0.0;
  private prevTimeSec = 0.0;

  /**
   * Evaluate complete multi-physics consequence of current hardware configuration,
   * ocular gimbal positions, facial Action Units, and sim state.
   */
  public evaluate(
    optics: EyeballOpticsState,
    facs: FACSState,
    siliconeId: SiliconeMaterialId,
    cameraId: CameraModelId,
    cranialActuatorId: string,
    batteryId: BatteryPackType,
    simTimeSec: number,
    coolantFlowFactor = 1.0, // 0.0 (pump off) to 1.0 (full flow)
    isWalking = false
  ): BiomimeticConsequenceMetrics {
    const dt = Math.max(0.001, simTimeSec - this.prevTimeSec);
    this.prevTimeSec = simTimeSec;

    // Track head angular velocity for rolling shutter skew estimation
    const yawDelta = Math.abs(optics.leftEyeYawDeg - this.prevHeadYawDeg);
    this.headAngularVelocityDegPerS = (yawDelta / dt) * 0.5; // estimated angular rate
    this.prevHeadYawDeg = optics.leftEyeYawDeg;

    const camera = CAMERA_REGISTRY[cameraId] || CAMERA_REGISTRY.imx219;
    const silicone = SILICONE_REGISTRY[siliconeId] || SILICONE_REGISTRY.ecoflex_0010;
    const battery = BATTERY_REGISTRY[batteryId] || BATTERY_REGISTRY.nmc_21700_18kwh;
    const cranialActuator = CRANIAL_ACTUATORS[cranialActuatorId] || CRANIAL_ACTUATORS.sub_micro_pwm;

    // ========================================================
    // 1. OPTICAL & SENSOR CONSEQUENCE (Iris Dilation & Sensor Physics)
    // ========================================================
    const apertureD = Math.max(2.0, Math.min(7.0, optics.pupilApertureMm)); // 2.0mm to 7.0mm
    const fMm = camera.focalLengthMm;
    const effectiveFocalRatio = fMm / (apertureD / 1000 * 1000); // N = f / D
    // Baseline exposure at 2.0mm = 1.0x; at 7.0mm = 12.25x
    const opticalThroughputGain = Math.pow(apertureD / 2.0, 2.0);

    // Depth of field blur radius in pixels (increases with aperture diameter D)
    const depthOfFieldBlurPx = Math.max(0.0, (apertureD - 2.0) * 1.5);

    // Rolling shutter skew during saccades:
    // Global shutter = 0% distortion; Rolling shutter = proportional to sensor readout time x angular rate
    let rollingShutterDistortionPct = 0;
    if (camera.shutterType === 'rolling') {
      const readoutTimeMs = camera.latencyMs;
      rollingShutterDistortionPct = Math.min(45.0, (this.headAngularVelocityDegPerS * readoutTimeMs) / 100.0);
    }

    // ========================================================
    // 2. FACIAL KINEMATICS, SKIN STRESS & SERVO STALL
    // ========================================================
    // Aggregate facial Action Unit strain (0.0 to 1.0)
    const auSum = (
      facs.au1_innerBrowRaiser * 0.8 +
      facs.au2_outerBrowRaiser * 0.7 +
      facs.au4_browLowerer * 1.0 +
      facs.au12_lipCornerPuller * 1.5 + // Duchenne smile creates high strain at cheek
      facs.au20_lipStretcher * 1.2 +
      facs.au25_lipsPart * 0.6 +
      facs.au26_jawDrop * 1.4
    );
    const maxSkinStrainPct = Math.min(100.0, (auSum / 4.0) * 45.0); // max ~45% strain

    // Force required to pull the silicone = E * A * strain (Ogden/Hookean approx)
    const nominalAnchorAreaMm2 = 12.0; // 12 mm² anchor surface area
    const strainFraction = maxSkinStrainPct / 100.0;
    const baseTensionN = (silicone.youngsModulusMpa * nominalAnchorAreaMm2) * strainFraction * 10.0;
    const cranialCablePeakTensionN = Math.max(0.1, baseTensionN * silicone.servoTorqueMultiplier);

    // Check against cranial servo torque limit (pulley radius = 6 mm = 0.006 m)
    const pulleyRadiusM = 0.006;
    const requiredTorqueNm = cranialCablePeakTensionN * pulleyRadiusM;
    const servoMaxTorqueNm = cranialActuator.peakTorqueOrForce;

    const stalledServoNames: string[] = [];
    let overloadedCablesCount = 0;

    if (requiredTorqueNm > servoMaxTorqueNm * 0.85) {
      if (facs.au12_lipCornerPuller > 0.4) {
        stalledServoNames.push('Cable_Zygomaticus_Major_R', 'Cable_Zygomaticus_Major_L');
        overloadedCablesCount += 2;
      }
      if (facs.au4_browLowerer > 0.4) {
        stalledServoNames.push('Cable_Corrugator_Supercilii');
        overloadedCablesCount += 1;
      }
      if (facs.au26_jawDrop > 0.5) {
        stalledServoNames.push('Cable_Masseter_TMJ');
        overloadedCablesCount += 1;
      }
    }
    const servoStallWarning = stalledServoNames.length > 0;

    // ========================================================
    // 3. ELECTRICAL, BANDWIDTH & POWER CASCADE
    // ========================================================
    // Dual camera MIPI CSI-2 bus load (2 cameras x bandwidth)
    const dualCameraMipiGbps = (camera.mipiBandwidthGbps * 2.0);
    const mipiBusCapacityGbps = 5.0; // Jetson Orin 2-port aggregate limit
    const mipiBusSaturationPct = Math.min(100.0, (dualCameraMipiGbps / mipiBusCapacityGbps) * 100.0);

    // Compute power: Idle Orin = 25W; active vision SLAM = 55W
    const computePowerW = COMPUTE_STACK.cerebrum.tdpWatts * (camera.id === 'imx219' ? 0.95 : 0.75) + COMPUTE_STACK.cerebellum.tdpWatts;

    // Cranial servo cluster power (quiescent 5W + 32 servos x active load)
    const cranialPowerW = 5.0 + (auSum * 4.5 * silicone.servoTorqueMultiplier) + (servoStallWarning ? 18.0 : 0.0);

    // Locomotion & hydro-muscle pump power:
    const pumpPowerW = THERMAL_LOOP_SPECS.pumpPowerW * coolantFlowFactor;
    const locomotionPowerW = isWalking ? 480.0 : 45.0; // 480W walking, 45W standing posture balance
    const camerasPowerW = (camera.powerMw * 2.0) / 1000.0;

    const totalSystemPowerWatts = computePowerW + cranialPowerW + pumpPowerW + locomotionPowerW + camerasPowerW;
    const idlePowerWatts = computePowerW * 0.5 + 5.0 + 25.0 + camerasPowerW;
    const dynamicPowerWatts = totalSystemPowerWatts - idlePowerWatts;

    // Battery runtime
    const usableEnergyWh = (battery.energyKwh * 1000.0) * 0.92; // 92% DOD
    const batteryRuntimeHours = totalSystemPowerWatts > 10.0 ? usableEnergyWh / totalSystemPowerWatts : 12.0;
    const batteryRemainingPct = Math.max(15.0, 96.0 - (simTimeSec / 3600.0 / batteryRuntimeHours) * 100.0);

    // EtherCAT bus saturation (1 kHz fieldbus with 32 cranial + 12 limb nodes)
    const etherCatBusSaturationPct = Math.min(100.0, 38.0 + (isWalking ? 32.0 : 8.0) + (servoStallWarning ? 15.0 : 0.0));

    // ========================================================
    // 4. THERMAL CASCADE & EQUILIBRIUM SOLVER
    // ========================================================
    const actualCoolantLpm = THERMAL_LOOP_SPECS.maxFlowLpm * coolantFlowFactor;
    const heatCapacity = THERMAL_LOOP_SPECS.heatCapacityJPerKgK;
    const massFlowKgPerS = (actualCoolantLpm / 60.0) * 1.0;

    // Heat generated in skull: cameras (0.36W) + cranial servos (up to 35W) + anterior skull sensors
    const skullHeatGenerationW = camerasPowerW + cranialPowerW * 0.6;
    // Silicone insulation factor: stiffer/denser silicone traps more heat
    const skinInsulationFactor = silicone.densityGPerCm3 / silicone.thermalConductivityWPerMK;

    // Skull temperature equilibrium
    const skullHeatDissipatedW = (massFlowKgPerS * heatCapacity * 0.02) + (THERMAL_LOOP_SPECS.radiatorExhaustCfm * 0.25);
    const skullNetHeatW = Math.max(0.0, skullHeatGenerationW - skullHeatDissipatedW);
    const skullInternalTempC = this.ambientTempC + 6.0 + (skullNetHeatW * 0.8) + (skinInsulationFactor * 0.5);

    // Thoracic core temperature (housing 60W Orin + battery internal resistance heat)
    const batteryHeatW = Math.pow(totalSystemPowerWatts / battery.nominalVoltageV, 2.0) * (battery.internalResistanceMOhm / 1000.0);
    const thoracicHeatW = computePowerW + pumpPowerW + (isWalking ? 120.0 : 15.0) + batteryHeatW;
    const coolantHeatRemovalW = massFlowKgPerS * heatCapacity * 3.5; // delta T of coolant ~3.5K
    const thoracicNetHeatW = Math.max(0.0, thoracicHeatW - coolantHeatRemovalW);
    const thoracicCoreTempC = this.ambientTempC + 10.0 + (thoracicNetHeatW * 0.22);

    const thermalThrottleActive = skullInternalTempC > 44.0 || thoracicCoreTempC > 58.0;
    const exhaustAirTempC = this.ambientTempC + (thoracicCoreTempC - this.ambientTempC) * 0.65;

    // ========================================================
    // 5. WHOLE-BODY 180 CM DYNAMICS & STABILITY
    // ========================================================
    // Base skeleton & actuators = 56 kg + Battery pack weight + Silicone dermis weight (~5 kg)
    const totalRobotMassKg = 56.0 + battery.packWeightKg + (silicone.densityGPerCm3 * 5.2);
    // Center of Mass height (meters above ground for 1.8m humanoid)
    // Battery mounted in lower pelvic bay lowers CoM
    const comY = 1.02 - (battery.id === 'nmc_21700_18kwh' ? 0.03 : 0.015);
    const comWorld: [number, number, number] = [0.0, comY, 0.012];
    const zmpWorld: [number, number] = [0.0, 0.010];
    const stabilityMarginMm = isWalking ? 38.0 : 64.0; // mm inside foot polygon
    const isStaticallyStable = stabilityMarginMm > 15.0;

    return {
      effectiveFocalRatio,
      opticalThroughputGain,
      depthOfFieldBlurPx,
      rollingShutterDistortionPct,
      fovHorizontalDeg: camera.fovDiagonalDeg * 0.82,
      sensorResolution: camera.resolution,
      sensorFps: camera.maxFps,
      sensorPowerW: camerasPowerW,

      maxSkinStrainPct,
      activeSiliconeModulusMpa: silicone.youngsModulusMpa,
      cranialCablePeakTensionN,
      overloadedCablesCount,
      servoStallWarning,
      stalledServoNames,

      mipiBandwidthUsedGbps: dualCameraMipiGbps,
      mipiBusSaturationPct,
      etherCatBusSaturationPct,
      busVoltage48V: battery.nominalVoltageV,
      totalSystemPowerWatts,
      idlePowerWatts,
      dynamicPowerWatts,
      batteryRuntimeHours,
      batteryRemainingPct,

      skullInternalTempC,
      thoracicCoreTempC,
      liquidCoolantFlowLpm: actualCoolantLpm,
      coolingHeatDissipationW: coolantHeatRemovalW,
      exhaustAirTempC,
      thermalThrottleActive,

      totalRobotMassKg,
      comWorld,
      zmpWorld,
      stabilityMarginMm,
      isStaticallyStable,
    };
  }
}

export default BiomimeticConsequenceEngine;
