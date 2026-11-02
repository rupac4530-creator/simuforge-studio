// ============================================================
// SimuForge Studio — Biomimetic Humanoid Master Types
// 180 cm Anthropomorphic Digital Twin & Modular Simulator
// ============================================================

export type AnatomicalLayer = 'integumentary' | 'musculoskeletal' | 'endoskeletal' | 'electronics';

export interface LayerOpacityState {
  integumentary: number;     // Layer 1: Skin, Hair, Taxels (0.0 - 1.0)
  musculoskeletal: number;   // Layer 2: Hydro-muscles, Bowden cables, QDDs (0.0 - 1.0)
  endoskeletal: number;      // Layer 3: CNC aluminum skeleton, cooling vascularity (0.0 - 1.0)
  electronics: number;       // Layer 4: Bionic eyeballs, Orin brain, 16S battery (0.0 - 1.0)
  xrayMode: boolean;         // X-Ray Dissection Mode (allows picking deep nested parts)
  showTaxels: boolean;       // Taxel tactile grid shader overlay
  showThermalLoop: boolean;  // Cooling fluid circulation flow visualization
  showStrainMap: boolean;    // Mechanical skin strain / muscle load heatmap
}

// ---- Camera Component Models ----
export type CameraModelId = 'imx219' | 'ov9281' | 'ov5640' | 'prophesee_event';

export interface CameraSpec {
  id: CameraModelId;
  name: string;
  manufacturer: string;
  resolution: [number, number]; // width x height
  maxFps: number;
  shutterType: 'rolling' | 'global' | 'neuromorphic_event';
  fovDiagonalDeg: number;
  focalLengthMm: number;
  powerMw: number;
  mipiLanes: number;
  mipiBandwidthGbps: number;
  latencyMs: number;
  pixelPitchUm: number;
  features: string[];
}

// ---- Silicone Dermal Materials ----
export type SiliconeMaterialId = 'ecoflex_0010' | 'ecoflex_0020' | 'frubber' | 'dragonskin_10';

export interface SiliconeMaterialSpec {
  id: SiliconeMaterialId;
  name: string;
  manufacturer: string;
  shoreHardness: string;
  youngsModulusMpa: number;   // Elasticity (lower = softer, less servo torque required)
  elongationAtBreakPct: number;
  densityGPerCm3: number;
  thermalConductivityWPerMK: number;
  tearStrengthKnM: number;
  sssRadiusMm: number;        // Subsurface scattering radius
  wrinkleFidelityScore: number; // 0 - 100
  servoTorqueMultiplier: number; // Stiff silicones increase torque load
  description: string;
}

// ---- Cranial & Body Actuator Models ----
export type CranialActuatorType = 'sub_micro_pwm' | 'coreless_linear' | 'piezo_ultrasonic';
export type UpperBodyActuatorType = 'mckibben_hydro' | 'brushless_tendon_winch';
export type LowerBodyActuatorType = 'qdd_planetary' | 'roller_screw_linear';
export type BatteryPackType = 'nmc_21700_18kwh' | 'silicon_anode_4680_24kwh';

export interface ActuatorSpec {
  id: string;
  name: string;
  category: 'cranial' | 'upper_body' | 'lower_body';
  peakTorqueOrForce: number; // N·m or N
  maxSpeed: number;          // rad/s or mm/s
  powerPeakW: number;
  weightG: number;
  voltageV: number;
  backlashArcMin: number;
  efficiencyPct: number;
}

export interface BatterySpec {
  id: BatteryPackType;
  name: string;
  chemistry: string;
  configuration: string;    // e.g. "16S6P"
  nominalVoltageV: number;
  maxVoltageV: number;
  capacityAh: number;
  energyKwh: number;
  packWeightKg: number;
  maxContinuousDischargeA: number;
  internalResistanceMOhm: number;
}

// ---- Bionic Eyeball & Optics State ----
export interface EyeballOpticsState {
  targetDistanceM: number;   // Distance to focal target for vergence tracking
  leftEyeYawDeg: number;     // Left eye yaw
  rightEyeYawDeg: number;    // Right eye yaw (inward for vergence)
  coupledPitchDeg: number;   // Both eyes pitch elevation
  upperEyelidPitchDeg: number;
  lowerEyelidPitchDeg: number;
  pupilApertureMm: number;   // Nitinol iris diameter: 2.0 mm to 7.0 mm
  selectedCameraId: CameraModelId;
  pipActiveEye: 'left' | 'right';
  showDepthMap: boolean;
  activeExposureEv: number;
  depthOfFieldBlurPx: number;
  slamLatencyMs: number;
}

// ---- Facial Action Coding System (FACS) & Phonemes ----
export interface FACSState {
  // Brows
  au1_innerBrowRaiser: number; // 0 - 1
  au2_outerBrowRaiser: number;
  au4_browLowerer: number;
  // Eyes
  au5_upperLidRaiser: number;
  au6_cheekRaiser: number;
  au7_lidTightener: number;
  au45_blink: number;
  // Nose
  au9_noseWrinkler: number;
  // Mouth & Lips
  au10_upperLipRaiser: number;
  au12_lipCornerPuller: number; // Duchenne Smile
  au14_dimpler: number;
  au15_lipCornerDepressor: number;
  au17_chinRaiser: number;
  au20_lipStretcher: number;
  au25_lipsPart: number;
  au26_jawDrop: number;
}

export type PhonemeId = 'A' | 'E' | 'I' | 'O' | 'U' | 'B_P_M' | 'L_T' | 'F_V' | 'neutral';

// ---- Real-time Consequence & Multi-Physics Metrics ----
export interface BiomimeticConsequenceMetrics {
  // Optical & Vision
  effectiveFocalRatio: number;   // f-number
  opticalThroughputGain: number; // e.g. 1.0x to 12.25x
  depthOfFieldBlurPx: number;
  rollingShutterDistortionPct: number;
  fovHorizontalDeg: number;
  sensorResolution: [number, number];
  sensorFps: number;
  sensorPowerW: number;

  // Mechanical & Skin Stress
  maxSkinStrainPct: number;
  activeSiliconeModulusMpa: number;
  cranialCablePeakTensionN: number;
  overloadedCablesCount: number;
  servoStallWarning: boolean;
  stalledServoNames: string[];

  // Electrical & Thermal Bus
  mipiBandwidthUsedGbps: number;
  mipiBusSaturationPct: number;
  etherCatBusSaturationPct: number;
  busVoltage48V: number;
  totalSystemPowerWatts: number;
  idlePowerWatts: number;
  dynamicPowerWatts: number;
  batteryRuntimeHours: number;
  batteryRemainingPct: number;

  // Thermal Equilibrium
  skullInternalTempC: number;
  thoracicCoreTempC: number;
  liquidCoolantFlowLpm: number;
  coolingHeatDissipationW: number;
  exhaustAirTempC: number;
  thermalThrottleActive: boolean;

  // Whole-Body 180cm Biomechanics
  totalRobotMassKg: number;
  comWorld: [number, number, number];
  zmpWorld: [number, number];
  stabilityMarginMm: number;
  isStaticallyStable: boolean;
}

// ---- Selectable Component in the 3D Hierarchy ----
export interface Selectable3DPart {
  id: string;
  name: string;
  layer: AnatomicalLayer;
  category: string;
  worldPosition: [number, number, number];
  boundingBoxRadiusM: number;
  activeSpecId: string;
  availableSwaps: string[];
}
