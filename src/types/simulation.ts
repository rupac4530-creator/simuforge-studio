// ============================================================
// SimuForge Studio — Master Type Definitions
// Tailored for 17-DOF Hash V3 Humanoid Robot
// ============================================================

// ---- Servo / Joint System ----
export const SERVO_NAMES = [
  'R_Hip_Yaw', 'R_Hip_Roll', 'R_Hip_Pitch', 'R_Knee_Pitch', 'R_Ankle_Pitch',
  'L_Hip_Yaw', 'L_Hip_Roll', 'L_Hip_Pitch', 'L_Knee_Pitch', 'L_Ankle_Pitch',
  'R_Shoulder_Pitch', 'R_Shoulder_Roll', 'R_Elbow_Pitch',
  'L_Shoulder_Pitch', 'L_Shoulder_Roll', 'L_Elbow_Pitch',
  'Head_Yaw',
] as const;

export type ServoName = typeof SERVO_NAMES[number];

export interface ServoState {
  name: ServoName;
  angle: number;        // current angle in degrees
  targetAngle: number;  // target angle in degrees
  minAngle: number;
  maxAngle: number;
  speed: number;        // degrees per second
  pcaBoard: 0 | 1;     // which PCA9685
  pcaChannel: number;   // channel on PCA9685
}

// PCA9685 Channel Mapping (from master spec)
export const PCA_CHANNEL_MAP: Record<ServoName, { board: 0 | 1; channel: number }> = {
  R_Hip_Yaw:         { board: 0, channel: 0 },
  R_Hip_Roll:        { board: 0, channel: 1 },
  R_Hip_Pitch:       { board: 0, channel: 2 },
  R_Knee_Pitch:      { board: 0, channel: 3 },
  R_Ankle_Pitch:     { board: 0, channel: 4 },
  L_Hip_Yaw:         { board: 0, channel: 5 },
  L_Hip_Roll:        { board: 0, channel: 6 },
  L_Hip_Pitch:       { board: 0, channel: 7 },
  L_Knee_Pitch:      { board: 0, channel: 8 },
  L_Ankle_Pitch:     { board: 0, channel: 9 },
  R_Shoulder_Pitch:  { board: 0, channel: 10 },
  R_Shoulder_Roll:   { board: 0, channel: 11 },
  R_Elbow_Pitch:     { board: 0, channel: 12 },
  L_Shoulder_Pitch:  { board: 0, channel: 13 },
  L_Shoulder_Roll:   { board: 0, channel: 14 },
  L_Elbow_Pitch:     { board: 0, channel: 15 },
  Head_Yaw:          { board: 1, channel: 0 },
};

// ---- Robot Dimensions (mm) — 180 cm Biomimetic Humanoid Master Spec ----
export const ROBOT_DIMS = {
  totalHeight: 1800,
  shoulderWidth: 480,
  maxDepth: 260,
  head: { w: 190, h: 240, d: 200 },
  neck: { h: 100 },
  torso: { w: 360, h: 520, d: 220 },
  pelvis: { w: 320, h: 160, d: 200 },
  upperArm: { length: 320, w: 90, d: 90 },
  forearm: { length: 280, w: 80, d: 75 },
  hand: { length: 190, w: 95, d: 35 },
  thigh: { length: 440, w: 130, d: 130 },
  shin: { length: 420, w: 100, d: 95 },
  foot: { length: 260, w: 100, h: 80 },
};

// ---- Simulation State ----
export type SimState = 'stopped' | 'running' | 'paused';

export interface SimulationConfig {
  dt: number;           // physics timestep in seconds (0.008 = 125 Hz)
  speed: number;        // simulation speed multiplier
  gravity: number;      // m/s² (default -9.81)
  showColliders: boolean;
  showCoM: boolean;
  showForces: boolean;
  showLidarRays: boolean;
  showRFHeatmap: boolean;
  showGrid: boolean;
}

export interface SimulationState {
  status: SimState;
  time: number;         // elapsed simulation time in seconds
  frameCount: number;
  servos: Record<ServoName, ServoState>;
  robotPosition: [number, number, number];
  robotRotation: [number, number, number];
  sensorData: SensorData;
  rfState: RFState;
}

// ---- Sensors ----
export interface SensorData {
  ultrasonic: { distance: number; detected: boolean };
  imu: {
    roll: number; pitch: number; yaw: number;
    accX: number; accY: number; accZ: number;
    gyroX: number; gyroY: number; gyroZ: number;
  };
  battery: { voltage: number; current: number; percentage: number };
}

// ---- RF / Signal Engine ----
export type RFBand = '2.4GHz_WiFi' | '2.4GHz_BLE' | '915MHz_LoRa' | '5.8GHz_FPV';

export interface RFConfig {
  band: RFBand;
  txPower: number;      // dBm
  txGain: number;       // dBi
  rxGain: number;       // dBi
  pathLossExponent: number;
  noiseFigure: number;  // dBm
}

export interface RFState {
  rssi: number;         // dBm
  snr: number;          // dB
  linkQuality: number;  // 0-100%
  latency: number;      // ms
  packetLoss: number;   // 0-100%
  distance: number;     // meters
  wallLosses: { material: string; loss: number }[];
}

// ---- Scene Tree ----
export type SceneNodeType =
  | 'world' | 'robot' | 'solid' | 'joint' | 'sensor'
  | 'actuator' | 'electronics' | 'antenna' | 'group';

export interface SceneNode {
  id: string;
  name: string;
  type: SceneNodeType;
  children: SceneNode[];
  expanded: boolean;
  visible: boolean;
  properties: Record<string, string | number | boolean>;
}

// ---- Camera ----
export type CameraPreset = 'orbit' | 'top' | 'iso' | 'chase' | 'side' | 'fpv';

export interface CameraState {
  preset: CameraPreset;
  height: number;
  pitch: number;
  yaw: number;
  fov: number;
  distance: number;
}

// ---- Code Editor ----
export interface CodeScript {
  id: string;
  name: string;
  language: 'javascript' | 'python';
  code: string;
}

// ---- Phone Remote ----
export interface RemoteState {
  leftStick: { x: number; y: number };
  rightStick: { x: number; y: number };
  buttons: Record<string, boolean>;
  tilt: { pitch: number; roll: number };
  connected: boolean;
}

// ---- Predefined Voice Commands ----
export const VOICE_COMMANDS = [
  'Say Hi', 'Shake Hands', 'Hands Up', 'Hands Down',
  'Left Bicep', 'Double Biceps', 'Bow',
  'Sit Down', 'Stand Up', 'Turn Left', 'Turn Right',
  'Move Forward', 'Move Backward', 'Push Up', 'Dance',
  'Home Position',
] as const;

export type VoiceCommand = typeof VOICE_COMMANDS[number];

// ---- Arena Obstacle Materials for RF ----
export const RF_MATERIALS: Record<string, number> = {
  'Free Space': 0,
  'Glass': 3,
  'Wood': 4,
  'Brick': 12,
  'Concrete': 25,
  'Metal': 45,
};

// ---- Default initial servo angles (home position) ----
export const HOME_ANGLES: Record<ServoName, number> = {
  R_Hip_Yaw: 90, R_Hip_Roll: 90, R_Hip_Pitch: 90,
  R_Knee_Pitch: 90, R_Ankle_Pitch: 90,
  L_Hip_Yaw: 90, L_Hip_Roll: 90, L_Hip_Pitch: 90,
  L_Knee_Pitch: 90, L_Ankle_Pitch: 90,
  R_Shoulder_Pitch: 0, R_Shoulder_Roll: 90, R_Elbow_Pitch: 90,
  L_Shoulder_Pitch: 180, L_Shoulder_Roll: 90, L_Elbow_Pitch: 90,
  Head_Yaw: 90,
};
