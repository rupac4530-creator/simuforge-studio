// ============================================================
// SimuForge Studio — Hardware Component Registry
// Complete Database of 20+ Real-World Biomimetic Components
// Sony, OmniVision, Prophesee, Smooth-On, Hanson, Maxon, Faulhaber, Samsung
// ============================================================

import {
  CameraModelId, CameraSpec,
  SiliconeMaterialId, SiliconeMaterialSpec,
  ActuatorSpec, BatteryPackType, BatterySpec
} from '../types/biomimetic';

// ============================================================
// 1. SWAPPABLE BIONIC EYEBALL CAMERAS (8x8 mm Sensor PCBs)
// ============================================================

export const CAMERA_REGISTRY: Record<CameraModelId, CameraSpec> = {
  imx219: {
    id: 'imx219',
    name: 'Sony IMX219 (8MP Back-Illuminated CMOS)',
    manufacturer: 'Sony Semiconductor Solutions',
    resolution: [3280, 2464],
    maxFps: 60,
    shutterType: 'rolling',
    fovDiagonalDeg: 77.0,
    focalLengthMm: 3.04,
    powerMw: 180,
    mipiLanes: 2,
    mipiBandwidthGbps: 1.5,
    latencyMs: 16.6,
    pixelPitchUm: 1.12,
    features: [
      'High-resolution 8MP photorealistic imagery',
      'Exmor R back-illuminated sensor architecture',
      'Visible rolling shutter skew during high-velocity eye saccades (>200°/s)',
      'Integrated optical lens barrel with fixed focus',
    ],
  },

  ov9281: {
    id: 'ov9281',
    name: 'OmniVision OV9281 (1MP Global Shutter)',
    manufacturer: 'OmniVision Technologies',
    resolution: [1280, 800],
    maxFps: 120,
    shutterType: 'global',
    fovDiagonalDeg: 110.0,
    focalLengthMm: 2.1,
    powerMw: 140,
    mipiLanes: 2,
    mipiBandwidthGbps: 0.8,
    latencyMs: 8.3,
    pixelPitchUm: 3.0,
    features: [
      'OmniPixel3-GS global shutter (zero motion distortion)',
      'Ultra-wide 110° diagonal FOV for spatial awareness',
      'High-speed 120 FPS tracking for real-time visual SLAM',
      'Monochrome spectral sensitivity optimized for feature matching',
    ],
  },

  ov5640: {
    id: 'ov5640',
    name: 'OmniVision OV5640 (5MP Voice-Coil Auto-Focus)',
    manufacturer: 'OmniVision Technologies',
    resolution: [2592, 1944],
    maxFps: 90,
    shutterType: 'rolling',
    fovDiagonalDeg: 68.0,
    focalLengthMm: 3.5,
    powerMw: 220,
    mipiLanes: 2,
    mipiBandwidthGbps: 1.2,
    latencyMs: 22.0,
    pixelPitchUm: 1.4,
    features: [
      'Micro voice-coil motor (VCM) dynamic autofocus (10cm to infinity)',
      'Natural optical focal breathing effect during saccades',
      'OmniBSI high-sensitivity color processing',
      'Integrated JPEG encoder hardware engine',
    ],
  },

  prophesee_event: {
    id: 'prophesee_event',
    name: 'Prophesee Metavision Gen4.1 (Neuromorphic Event Sensor)',
    manufacturer: 'Prophesee / Sony Joint Sensor',
    resolution: [1280, 720],
    maxFps: 10000, // Equivalent temporal sampling
    shutterType: 'neuromorphic_event',
    fovDiagonalDeg: 90.0,
    focalLengthMm: 2.8,
    powerMw: 50,
    mipiLanes: 2,
    mipiBandwidthGbps: 0.4,
    latencyMs: 0.8, // Microsecond temporal resolution
    pixelPitchUm: 4.86,
    features: [
      'Biomimetic neuromorphic pixel design (event-based delta firing)',
      '120 dB extreme dynamic range (immune to harsh backlight)',
      'Sub-millisecond hand-eye reflex tracking',
      'Asynchronous microsecond event stream with ultra-low compute load',
    ],
  },
};

// ============================================================
// 2. SWAPPABLE SILICONE DERMAL FORMULATIONS
// ============================================================

export const SILICONE_REGISTRY: Record<SiliconeMaterialId, SiliconeMaterialSpec> = {
  ecoflex_0010: {
    id: 'ecoflex_0010',
    name: 'Smooth-On Ecoflex 00-10 (Ultra-Soft Silicone)',
    manufacturer: 'Smooth-On Inc.',
    shoreHardness: '00-10',
    youngsModulusMpa: 0.05,
    elongationAtBreakPct: 800,
    densityGPerCm3: 1.04,
    thermalConductivityWPerMK: 0.15,
    tearStrengthKnM: 17.5,
    sssRadiusMm: 3.5,
    wrinkleFidelityScore: 92,
    servoTorqueMultiplier: 1.0,
    description: 'Extremely soft, compliant platinum-cure silicone. Requires minimal cranial servo pulling torque, enabling expressive, organic mouth corners and brow furrows without motor stall.',
  },

  ecoflex_0020: {
    id: 'ecoflex_0020',
    name: 'Smooth-On Ecoflex 00-20 (Standard Animatronic Silicone)',
    manufacturer: 'Smooth-On Inc.',
    shoreHardness: '00-20',
    youngsModulusMpa: 0.08,
    elongationAtBreakPct: 700,
    densityGPerCm3: 1.05,
    thermalConductivityWPerMK: 0.16,
    tearStrengthKnM: 22.0,
    sssRadiusMm: 3.0,
    wrinkleFidelityScore: 88,
    servoTorqueMultiplier: 1.6,
    description: 'Industry standard for movie animatronics. Offers higher tear resistance around eye and mouth cutouts while remaining moderately supple. Requires 60% more servo torque.',
  },

  frubber: {
    id: 'frubber',
    name: 'Nanoporous Frubber (Hanson Robotics Biomimetic Elastomer)',
    manufacturer: 'Hanson Robotics Limited',
    shoreHardness: 'Porous Gel Matrix',
    youngsModulusMpa: 0.03,
    elongationAtBreakPct: 950,
    densityGPerCm3: 0.35, // Cellular micro-porous structure
    thermalConductivityWPerMK: 0.09,
    tearStrengthKnM: 14.0,
    sssRadiusMm: 4.2,
    wrinkleFidelityScore: 98,
    servoTorqueMultiplier: 0.6,
    description: 'Proprietary porous cellular elastomer mimicking human lipid and dermal layers. Extremely lightweight (35% density of solid silicone) with micro-folds and 40% reduced servo power draw.',
  },

  dragonskin_10: {
    id: 'dragonskin_10',
    name: 'Smooth-On Dragon Skin 10 Medium (High-Tear Dermal Rubber)',
    manufacturer: 'Smooth-On Inc.',
    shoreHardness: '10A',
    youngsModulusMpa: 0.59, // 11.8x stiffer than Ecoflex 00-10!
    elongationAtBreakPct: 1000,
    densityGPerCm3: 1.07,
    thermalConductivityWPerMK: 0.18,
    tearStrengthKnM: 102.0,
    sssRadiusMm: 2.1,
    wrinkleFidelityScore: 45,
    servoTorqueMultiplier: 11.8,
    description: 'High-strength Shore 10A silicone. Immensely tear-resistant for industrial robots, but far too stiff for human facial expression—causes severe cranial servo stall and overloaded Bowden cables.',
  },
};

// ============================================================
// 3. SWAPPABLE ACTUATOR HARDWARE
// ============================================================

export const CRANIAL_ACTUATORS: Record<string, ActuatorSpec> = {
  sub_micro_pwm: {
    id: 'sub_micro_pwm',
    name: 'KST X08 Micro Digital PWM Servos (x32 Cluster)',
    category: 'cranial',
    peakTorqueOrForce: 0.28, // N·m (2.8 kg·cm)
    maxSpeed: 14.0,          // rad/s (0.07s/60°)
    powerPeakW: 3.2,
    weightG: 8.5,
    voltageV: 5.0,
    backlashArcMin: 18,
    efficiencyPct: 62,
  },
  coreless_linear: {
    id: 'coreless_linear',
    name: 'Faulhaber 0615 Coreless Linear Micro-Actuators (x32 Cluster)',
    category: 'cranial',
    peakTorqueOrForce: 18.0, // N linear thrust
    maxSpeed: 85.0,          // mm/s
    powerPeakW: 4.8,
    weightG: 12.0,
    voltageV: 6.0,
    backlashArcMin: 2,
    efficiencyPct: 78,
  },
  piezo_ultrasonic: {
    id: 'piezo_ultrasonic',
    name: 'Physik Instrumente Silent Piezo Ultrasonic Actuators (x32 Cluster)',
    category: 'cranial',
    peakTorqueOrForce: 25.0, // N linear force
    maxSpeed: 120.0,         // mm/s
    powerPeakW: 2.1,
    weightG: 6.2,
    voltageV: 12.0,
    backlashArcMin: 0,       // Zero backlash
    efficiencyPct: 91,
  },
};

export const UPPER_BODY_ACTUATORS: Record<string, ActuatorSpec> = {
  mckibben_hydro: {
    id: 'mckibben_hydro',
    name: 'Festo DMSP Hydraulic McKibben Braided Muscle Array',
    category: 'upper_body',
    peakTorqueOrForce: 850.0, // N contraction tension
    maxSpeed: 300.0,          // mm/s
    powerPeakW: 500.0,        // Driven by central pump
    weightG: 180.0,
    voltageV: 48.0,
    backlashArcMin: 0,
    efficiencyPct: 82,
  },
  brushless_tendon_winch: {
    id: 'brushless_tendon_winch',
    name: 'Maxon ECX TORQUE 22L Planetary Tendon Winch Servos',
    category: 'upper_body',
    peakTorqueOrForce: 4.5,   // N·m
    maxSpeed: 45.0,           // rad/s
    powerPeakW: 180.0,
    weightG: 165.0,
    voltageV: 48.0,
    backlashArcMin: 8,
    efficiencyPct: 86,
  },
};

export const LOWER_BODY_ACTUATORS: Record<string, ActuatorSpec> = {
  qdd_planetary: {
    id: 'qdd_planetary',
    name: 'RoboDrive ILM 70x18 Frameless PMSM + 8:1 Planetary QDD (Pelvis & Ankle)',
    category: 'lower_body',
    peakTorqueOrForce: 220.0, // N·m peak
    maxSpeed: 28.0,           // rad/s
    powerPeakW: 1200.0,
    weightG: 980.0,
    voltageV: 48.0,
    backlashArcMin: 12,
    efficiencyPct: 89,
  },
  roller_screw_linear: {
    id: 'roller_screw_linear',
    name: 'Moog Inverted Planetary Roller Screw Linear Actuators (Femur & Tibia)',
    category: 'lower_body',
    peakTorqueOrForce: 6500.0, // N axial thrust
    maxSpeed: 350.0,           // mm/s
    powerPeakW: 1600.0,
    weightG: 1450.0,
    voltageV: 48.0,
    backlashArcMin: 3,
    efficiencyPct: 92,
  },
};

// ============================================================
// 4. SWAPPABLE 16S LI-ION BATTERY CORES
// ============================================================

export const BATTERY_REGISTRY: Record<BatteryPackType, BatterySpec> = {
  nmc_21700_18kwh: {
    id: 'nmc_21700_18kwh',
    name: '16S6P Samsung 50G NMC 21700 Lithium Array (1.76 kWh)',
    chemistry: 'Nickel Manganese Cobalt (NMC)',
    configuration: '16S6P (96 Cylindrical Cells)',
    nominalVoltageV: 58.8,
    maxVoltageV: 67.2,
    capacityAh: 30.0,
    energyKwh: 1.76,
    packWeightKg: 11.2,
    maxContinuousDischargeA: 90.0,
    internalResistanceMOhm: 85.0,
  },

  silicon_anode_4680_24kwh: {
    id: 'silicon_anode_4680_24kwh',
    name: '16S4P Silicon-Anode 4680 Structural Cell Pack (2.40 kWh)',
    chemistry: 'High-Nickel Silicon-Carbon Anode',
    configuration: '16S4P (64 Tabless Cells)',
    nominalVoltageV: 60.0,
    maxVoltageV: 68.0,
    capacityAh: 40.0,
    energyKwh: 2.40,
    packWeightKg: 9.8, // 1.4 kg lighter!
    maxContinuousDischargeA: 140.0,
    internalResistanceMOhm: 52.0,
  },
};

// ============================================================
// 5. DUAL-BRAIN COMPUTE & THERMAL COOLING SPECS
// ============================================================

export const COMPUTE_STACK = {
  cerebrum: {
    name: 'NVIDIA Jetson AGX Orin / Thor Automotive Industrial Module',
    architecture: 'Ampere GPU (2048 cores) + 16x Arm Cortex-A78AE',
    topsInt8: 275,
    tdpWatts: 60,
    mipiPorts: '16-lane MIPI CSI-2 (D-PHY 2.5 Gbps/lane)',
    ramGb: 64,
  },
  cerebellum: {
    name: 'Dual TI TMS320F28388D C2000 Real-Time Control Nodes',
    clockMhz: 200,
    fieldbus: 'EtherCAT Slave (1 kHz synchronous deterministic cycle) + CAN-FD',
    pwmChannels: 32,
    tdpWatts: 8,
  },
};

export const THERMAL_LOOP_SPECS = {
  pumpPowerW: 45,
  maxFlowLpm: 3.8,
  coolantType: 'Deionized Water + 15% Propylene Glycol',
  heatCapacityJPerKgK: 3950,
  radiatorExhaustCfm: 28,
  skinThermalResistanceKPerW: 1.4,
};
