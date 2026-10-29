// ============================================================
// SimuForge Studio — Humanoid Kinematics Engine
// 17-DOF Forward Kinematics with Animation Queue
// ============================================================

import {
  ServoName,
  SERVO_NAMES,
  ServoState,
  HOME_ANGLES,
  PCA_CHANNEL_MAP,
  ROBOT_DIMS,
  VoiceCommand,
} from '../types/simulation';

export interface JointTransform {
  name: ServoName;
  position: [number, number, number]; // relative to parent, in meters
  rotation: [number, number, number]; // euler angles in radians
  axis: 'x' | 'y' | 'z';            // rotation axis for this joint
}

/** Convert degrees to radians */
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Convert mm to meters */
function mm(val: number): number {
  return val / 1000;
}

/** Animation frame: a set of target servo angles and the duration to reach them */
interface AnimationFrame {
  targets: Partial<Record<ServoName, number>>;
  duration: number; // seconds
  /** Position delta in robot-local frame: [right, up, forward] */
  moveDelta?: [number, number, number];
  /** Y-axis rotation delta in radians (positive = turn left / CCW from above) */
  yawDelta?: number;
}

/**
 * Humanoid Kinematics Engine
 *
 * Manages 17 servo joints, forward kinematics for 3D rendering,
 * and an animation queue for executing voice commands with smooth
 * interpolation. Tracks robot world position and yaw.
 */
export class HumanoidKinematics {
  private servos: Map<ServoName, ServoState>;
  private animationQueue: AnimationFrame[];
  private animating: boolean;
  private animationTime: number;
  private animationStartAngles: Partial<Record<ServoName, number>>;

  // World-space position and yaw tracking
  private _position: [number, number, number] = [0, 0, 0];
  private _yaw: number = 0;
  private _framePosStart: [number, number, number] = [0, 0, 0];
  private _framePosEnd: [number, number, number] = [0, 0, 0];
  private _frameYawStart: number = 0;
  private _frameYawEnd: number = 0;

  constructor() {
    this.servos = new Map();
    this.animationQueue = [];
    this.animating = false;
    this.animationTime = 0;
    this.animationStartAngles = {};

    // Initialize all 17 servos at home angles
    for (const name of SERVO_NAMES) {
      const mapping = PCA_CHANNEL_MAP[name];
      const homeAngle = HOME_ANGLES[name];
      this.servos.set(name, {
        name,
        angle: homeAngle,
        targetAngle: homeAngle,
        minAngle: 0,
        maxAngle: 180,
        speed: 300, // degrees per second
        pcaBoard: mapping.board,
        pcaChannel: mapping.channel,
      });
    }
  }

  /**
   * Get the state of a single servo.
   */
  getServoState(name: ServoName): ServoState {
    const state = this.servos.get(name);
    if (!state) {
      throw new Error(`Unknown servo: ${name}`);
    }
    return { ...state };
  }

  /**
   * Get states for all 17 servos.
   */
  getAllServos(): Record<ServoName, ServoState> {
    const result = {} as Record<ServoName, ServoState>;
    for (const name of SERVO_NAMES) {
      result[name] = this.getServoState(name);
    }
    return result;
  }

  /** Get the robot's current world position. */
  getPosition(): [number, number, number] {
    return [...this._position] as [number, number, number];
  }

  /** Get the robot's current Y-axis rotation in radians. */
  getYaw(): number {
    return this._yaw;
  }

  /** Reset position and yaw to origin. */
  resetPosition(): void {
    this._position = [0, 0, 0];
    this._yaw = 0;
  }

  /**
   * Immediately set a servo's current and target angle (clamped to min/max).
   */
  setServoAngle(name: ServoName, angle: number): void {
    const state = this.servos.get(name);
    if (!state) return;
    const clamped = clamp(angle, state.minAngle, state.maxAngle);
    state.angle = clamped;
    state.targetAngle = clamped;
  }

  /**
   * Set a servo's target angle (the servo will smoothly move there via update()).
   */
  setServoTarget(name: ServoName, angle: number): void {
    const state = this.servos.get(name);
    if (!state) return;
    state.targetAngle = clamp(angle, state.minAngle, state.maxAngle);
  }

  /**
   * Advance all servos toward their targets at their configured speed.
   * Also processes the animation queue.
   *
   * @param dt - time step in seconds
   * @returns true if any servo is still moving or animations are queued
   */
  update(dt: number): boolean {
    let anyMoving = false;

    // Process animation queue
    if (this.animating && this.animationQueue.length > 0) {
      const currentFrame = this.animationQueue[0];
      this.animationTime += dt;

      const t = currentFrame.duration > 0
        ? Math.min(this.animationTime / currentFrame.duration, 1.0)
        : 1.0;

      // Smoothstep interpolation for natural motion
      const smooth = t * t * (3 - 2 * t);

      // Interpolate each target servo from its start angle
      for (const [servoName, targetAngle] of Object.entries(currentFrame.targets)) {
        const name = servoName as ServoName;
        const startAngle = this.animationStartAngles[name];
        if (startAngle !== undefined) {
          const state = this.servos.get(name);
          if (state) {
            const interpolated = startAngle + (targetAngle - startAngle) * smooth;
            state.angle = clamp(interpolated, state.minAngle, state.maxAngle);
            state.targetAngle = clamp(targetAngle, state.minAngle, state.maxAngle);
          }
        }
      }

      // Interpolate position and yaw
      this._position = [
        this._framePosStart[0] + (this._framePosEnd[0] - this._framePosStart[0]) * smooth,
        this._framePosStart[1] + (this._framePosEnd[1] - this._framePosStart[1]) * smooth,
        this._framePosStart[2] + (this._framePosEnd[2] - this._framePosStart[2]) * smooth,
      ];
      this._yaw = this._frameYawStart + (this._frameYawEnd - this._frameYawStart) * smooth;

      if (t >= 1.0) {
        // Snap servo angles to final values
        for (const [servoName, targetAngle] of Object.entries(currentFrame.targets)) {
          const name = servoName as ServoName;
          const state = this.servos.get(name);
          if (state) {
            state.angle = clamp(targetAngle, state.minAngle, state.maxAngle);
            state.targetAngle = state.angle;
          }
        }

        // Snap position and yaw to final values
        this._position = [...this._framePosEnd] as [number, number, number];
        this._yaw = this._frameYawEnd;

        // Move to next frame
        this.animationQueue.shift();
        this.animationTime = 0;

        if (this.animationQueue.length > 0) {
          // Capture current angles as start for next frame
          this.captureStartAngles(this.animationQueue[0]);
        } else {
          this.animating = false;
        }
      }

      anyMoving = true;
    }

    // Also move any servos that have manual targets set outside the animation queue
    if (!this.animating) {
      for (const state of this.servos.values()) {
        if (Math.abs(state.angle - state.targetAngle) > 0.01) {
          const maxDelta = state.speed * dt;
          const diff = state.targetAngle - state.angle;
          if (Math.abs(diff) <= maxDelta) {
            state.angle = state.targetAngle;
          } else {
            state.angle += Math.sign(diff) * maxDelta;
          }
          anyMoving = true;
        }
      }
    }

    return anyMoving || this.animationQueue.length > 0;
  }

  /**
   * Capture current servo angles and position/yaw as start values for a frame.
   */
  private captureStartAngles(frame: AnimationFrame): void {
    this.animationStartAngles = {};
    for (const servoName of Object.keys(frame.targets)) {
      const name = servoName as ServoName;
      const state = this.servos.get(name);
      if (state) {
        this.animationStartAngles[name] = state.angle;
      }
    }
    // Capture position/yaw start and compute end for this frame
    this._framePosStart = [...this._position] as [number, number, number];
    this._frameYawStart = this._yaw;
    this._frameYawEnd = this._yaw + (frame.yawDelta ?? 0);
    if (frame.moveDelta) {
      const [lx, ly, lz] = frame.moveDelta; // local: [right, up, forward]
      const cos = Math.cos(this._yaw);
      const sin = Math.sin(this._yaw);
      this._framePosEnd = [
        this._position[0] + lx * cos + lz * sin,
        this._position[1] + ly,
        this._position[2] - lx * sin + lz * cos,
      ];
    } else {
      this._framePosEnd = [...this._position] as [number, number, number];
    }
  }

  /**
   * Queue animation frames and start playing.
   */
  private queueAnimation(frames: AnimationFrame[]): void {
    this.animationQueue.push(...frames);
    if (!this.animating && this.animationQueue.length > 0) {
      this.animating = true;
      this.animationTime = 0;
      this.captureStartAngles(this.animationQueue[0]);
    }
  }

  /**
   * Compute forward kinematics transforms for all joints.
   * Returns transforms with positions relative to parent joint, in meters.
   *
   * Joint hierarchy:
   *   Torso (root)
   *     ├─ Head_Yaw
   *     ├─ R_Shoulder_Pitch
   *     │   └─ R_Shoulder_Roll
   *     │       └─ R_Elbow_Pitch
   *     ├─ L_Shoulder_Pitch
   *     │   └─ L_Shoulder_Roll
   *     │       └─ L_Elbow_Pitch
   *     ├─ R_Hip_Yaw
   *     │   └─ R_Hip_Roll
   *     │       └─ R_Hip_Pitch
   *     │           └─ R_Knee_Pitch
   *     │               └─ R_Ankle_Pitch
   *     └─ L_Hip_Yaw
   *         └─ L_Hip_Roll
   *             └─ L_Hip_Pitch
   *                 └─ L_Knee_Pitch
   *                     └─ L_Ankle_Pitch
   */
  getJointTransforms(): JointTransform[] {
    const dims = ROBOT_DIMS;
    const transforms: JointTransform[] = [];

    // Helper to get angle in radians, centered around 90° = 0 radians
    const getAngleRad = (name: ServoName): number => {
      const state = this.servos.get(name)!;
      return degToRad(state.angle - 90); // 90° is neutral
    };

    // Torso root position: center of torso
    // Standing height: foot.h + shin.length + thigh.length + pelvis.h + torso.h/2
    const legLength = mm(dims.foot.h + dims.shin.length + dims.thigh.length);
    const torsoHalfH = mm(dims.torso.h) / 2;
    const pelvisH = mm(dims.pelvis.h);

    // --- Head ---
    const headYawAngle = getAngleRad('Head_Yaw');
    transforms.push({
      name: 'Head_Yaw',
      position: [0, torsoHalfH + mm(dims.neck.h), 0],
      rotation: [0, headYawAngle, 0],
      axis: 'y',
    });

    // --- Right Arm Chain ---
    const rShoulderPitchAngle = getAngleRad('R_Shoulder_Pitch');
    transforms.push({
      name: 'R_Shoulder_Pitch',
      position: [-mm(dims.shoulderWidth) / 2, torsoHalfH - mm(10), 0],
      rotation: [rShoulderPitchAngle, 0, 0],
      axis: 'x',
    });

    const rShoulderRollAngle = getAngleRad('R_Shoulder_Roll');
    transforms.push({
      name: 'R_Shoulder_Roll',
      position: [0, -mm(dims.upperArm.length) / 2, 0],
      rotation: [0, 0, rShoulderRollAngle],
      axis: 'z',
    });

    const rElbowPitchAngle = getAngleRad('R_Elbow_Pitch');
    transforms.push({
      name: 'R_Elbow_Pitch',
      position: [0, -mm(dims.upperArm.length) / 2, 0],
      rotation: [rElbowPitchAngle, 0, 0],
      axis: 'x',
    });

    // --- Left Arm Chain ---
    const lShoulderPitchAngle = getAngleRad('L_Shoulder_Pitch');
    transforms.push({
      name: 'L_Shoulder_Pitch',
      position: [mm(dims.shoulderWidth) / 2, torsoHalfH - mm(10), 0],
      rotation: [lShoulderPitchAngle, 0, 0],
      axis: 'x',
    });

    const lShoulderRollAngle = getAngleRad('L_Shoulder_Roll');
    transforms.push({
      name: 'L_Shoulder_Roll',
      position: [0, -mm(dims.upperArm.length) / 2, 0],
      rotation: [0, 0, lShoulderRollAngle],
      axis: 'z',
    });

    const lElbowPitchAngle = getAngleRad('L_Elbow_Pitch');
    transforms.push({
      name: 'L_Elbow_Pitch',
      position: [0, -mm(dims.upperArm.length) / 2, 0],
      rotation: [lElbowPitchAngle, 0, 0],
      axis: 'x',
    });

    // --- Right Leg Chain ---
    const rHipYawAngle = getAngleRad('R_Hip_Yaw');
    transforms.push({
      name: 'R_Hip_Yaw',
      position: [-mm(dims.pelvis.w) / 2, -(torsoHalfH + pelvisH), 0],
      rotation: [0, rHipYawAngle, 0],
      axis: 'y',
    });

    const rHipRollAngle = getAngleRad('R_Hip_Roll');
    transforms.push({
      name: 'R_Hip_Roll',
      position: [0, 0, 0],
      rotation: [0, 0, rHipRollAngle],
      axis: 'z',
    });

    const rHipPitchAngle = getAngleRad('R_Hip_Pitch');
    transforms.push({
      name: 'R_Hip_Pitch',
      position: [0, 0, 0],
      rotation: [rHipPitchAngle, 0, 0],
      axis: 'x',
    });

    const rKneePitchAngle = getAngleRad('R_Knee_Pitch');
    transforms.push({
      name: 'R_Knee_Pitch',
      position: [0, -mm(dims.thigh.length), 0],
      rotation: [rKneePitchAngle, 0, 0],
      axis: 'x',
    });

    const rAnklePitchAngle = getAngleRad('R_Ankle_Pitch');
    transforms.push({
      name: 'R_Ankle_Pitch',
      position: [0, -mm(dims.shin.length), 0],
      rotation: [rAnklePitchAngle, 0, 0],
      axis: 'x',
    });

    // --- Left Leg Chain ---
    const lHipYawAngle = getAngleRad('L_Hip_Yaw');
    transforms.push({
      name: 'L_Hip_Yaw',
      position: [mm(dims.pelvis.w) / 2, -(torsoHalfH + pelvisH), 0],
      rotation: [0, lHipYawAngle, 0],
      axis: 'y',
    });

    const lHipRollAngle = getAngleRad('L_Hip_Roll');
    transforms.push({
      name: 'L_Hip_Roll',
      position: [0, 0, 0],
      rotation: [0, 0, lHipRollAngle],
      axis: 'z',
    });

    const lHipPitchAngle = getAngleRad('L_Hip_Pitch');
    transforms.push({
      name: 'L_Hip_Pitch',
      position: [0, 0, 0],
      rotation: [lHipPitchAngle, 0, 0],
      axis: 'x',
    });

    const lKneePitchAngle = getAngleRad('L_Knee_Pitch');
    transforms.push({
      name: 'L_Knee_Pitch',
      position: [0, -mm(dims.thigh.length), 0],
      rotation: [lKneePitchAngle, 0, 0],
      axis: 'x',
    });

    const lAnklePitchAngle = getAngleRad('L_Ankle_Pitch');
    transforms.push({
      name: 'L_Ankle_Pitch',
      position: [0, -mm(dims.shin.length), 0],
      rotation: [lAnklePitchAngle, 0, 0],
      axis: 'x',
    });

    return transforms;
  }

  /**
   * Clear the current animation queue and stop any running animation.
   */
  clearAnimation(): void {
    this.animationQueue = [];
    this.animating = false;
    this.animationTime = 0;
    this.animationStartAngles = {};
  }

  /**
   * Execute a voice command — clears any running animation first,
   * then queues the new movement sequence.
   */
  executeCommand(cmd: VoiceCommand): void {
    this.clearAnimation();
    switch (cmd) {
      case 'Say Hi':        this.sayHi(); break;
      case 'Shake Hands':   this.shakeHands(); break;
      case 'Hands Up':      this.handsUp(); break;
      case 'Hands Down':    this.handsDown(); break;
      case 'Left Bicep':    this.leftBicep(); break;
      case 'Double Biceps': this.doubleBiceps(); break;
      case 'Bow':           this.bow(); break;
      case 'Sit Down':      this.sitDown(); break;
      case 'Stand Up':      this.standUp(); break;
      case 'Turn Left':     this.turnLeft(); break;
      case 'Turn Right':    this.turnRight(); break;
      case 'Move Forward':  this.moveForward(); break;
      case 'Move Backward': this.moveBackward(); break;
      case 'Push Up':       this.pushUp(); break;
      case 'Dance':         this.dance(); break;
      case 'Home Position': this.homePosition(); break;
    }
  }

  /**
   * Reset all servos to their home position.
   */
  homePosition(): void {
    const targets: Partial<Record<ServoName, number>> = {};
    for (const name of SERVO_NAMES) {
      targets[name] = HOME_ANGLES[name];
    }
    this.queueAnimation([{ targets, duration: 0.8 }]);
  }

  // ---- Predefined Movement Sequences ----

  /**
   * Say Hi: Raise right arm and wave the forearm back and forth.
   */
  private sayHi(): void {
    this.queueAnimation([
      // Raise right arm up, elbow bent
      {
        targets: { R_Shoulder_Pitch: 180, R_Elbow_Pitch: 90 },
        duration: 0.5,
      },
      // Wave 1: elbow out
      { targets: { R_Elbow_Pitch: 60 }, duration: 0.25 },
      // Wave 1: elbow in
      { targets: { R_Elbow_Pitch: 120 }, duration: 0.25 },
      // Wave 2: elbow out
      { targets: { R_Elbow_Pitch: 60 }, duration: 0.25 },
      // Wave 2: elbow in
      { targets: { R_Elbow_Pitch: 120 }, duration: 0.25 },
      // Wave 3: elbow out
      { targets: { R_Elbow_Pitch: 60 }, duration: 0.25 },
      // Wave 3: elbow in
      { targets: { R_Elbow_Pitch: 120 }, duration: 0.25 },
      // Return to home
      {
        targets: { R_Shoulder_Pitch: HOME_ANGLES.R_Shoulder_Pitch, R_Elbow_Pitch: HOME_ANGLES.R_Elbow_Pitch },
        duration: 0.5,
      },
    ]);
  }

  /**
   * Shake Hands: Extend right arm forward with elbow slightly bent.
   */
  private shakeHands(): void {
    this.queueAnimation([
      // Extend arm
      {
        targets: { R_Shoulder_Pitch: 90, R_Elbow_Pitch: 45 },
        duration: 0.6,
      },
      // Shake up
      { targets: { R_Elbow_Pitch: 55 }, duration: 0.2 },
      // Shake down
      { targets: { R_Elbow_Pitch: 35 }, duration: 0.2 },
      // Shake up
      { targets: { R_Elbow_Pitch: 55 }, duration: 0.2 },
      // Shake down
      { targets: { R_Elbow_Pitch: 35 }, duration: 0.2 },
      // Hold briefly
      { targets: { R_Elbow_Pitch: 45 }, duration: 0.3 },
      // Return to home
      {
        targets: { R_Shoulder_Pitch: HOME_ANGLES.R_Shoulder_Pitch, R_Elbow_Pitch: HOME_ANGLES.R_Elbow_Pitch },
        duration: 0.5,
      },
    ]);
  }

  /**
   * Hands Up: Raise both arms fully up.
   */
  private handsUp(): void {
    this.queueAnimation([
      {
        targets: {
          R_Shoulder_Pitch: 180,
          L_Shoulder_Pitch: 0,
          R_Elbow_Pitch: 90,
          L_Elbow_Pitch: 90,
        },
        duration: 0.7,
      },
    ]);
  }

  /**
   * Hands Down: Lower both arms to home position.
   */
  private handsDown(): void {
    this.queueAnimation([
      {
        targets: {
          R_Shoulder_Pitch: HOME_ANGLES.R_Shoulder_Pitch,
          L_Shoulder_Pitch: HOME_ANGLES.L_Shoulder_Pitch,
          R_Elbow_Pitch: HOME_ANGLES.R_Elbow_Pitch,
          L_Elbow_Pitch: HOME_ANGLES.L_Elbow_Pitch,
        },
        duration: 0.7,
      },
    ]);
  }

  /**
   * Left Bicep: Flex the left arm into a bicep curl pose.
   */
  private leftBicep(): void {
    this.queueAnimation([
      {
        targets: {
          L_Shoulder_Pitch: 0,
          L_Elbow_Pitch: 45,
        },
        duration: 0.5,
      },
      // Hold the pose
      { targets: {}, duration: 1.0 },
      // Return home
      {
        targets: {
          L_Shoulder_Pitch: HOME_ANGLES.L_Shoulder_Pitch,
          L_Elbow_Pitch: HOME_ANGLES.L_Elbow_Pitch,
        },
        duration: 0.5,
      },
    ]);
  }

  /**
   * Double Biceps: Both arms in a classic bodybuilder double bicep flex.
   */
  private doubleBiceps(): void {
    this.queueAnimation([
      {
        targets: {
          R_Shoulder_Pitch: 90,
          R_Elbow_Pitch: 45,
          L_Shoulder_Pitch: 90,
          L_Elbow_Pitch: 45,
        },
        duration: 0.6,
      },
      // Hold the pose
      { targets: {}, duration: 1.5 },
      // Return home
      {
        targets: {
          R_Shoulder_Pitch: HOME_ANGLES.R_Shoulder_Pitch,
          R_Elbow_Pitch: HOME_ANGLES.R_Elbow_Pitch,
          L_Shoulder_Pitch: HOME_ANGLES.L_Shoulder_Pitch,
          L_Elbow_Pitch: HOME_ANGLES.L_Elbow_Pitch,
        },
        duration: 0.6,
      },
    ]);
  }

  /**
   * Bow: Tilt the torso forward by rotating both hip pitch servos.
   */
  private bow(): void {
    this.queueAnimation([
      // Bow forward
      {
        targets: {
          R_Hip_Pitch: 120,
          L_Hip_Pitch: 120,
        },
        duration: 0.8,
      },
      // Hold bow
      { targets: {}, duration: 1.0 },
      // Stand back up
      {
        targets: {
          R_Hip_Pitch: HOME_ANGLES.R_Hip_Pitch,
          L_Hip_Pitch: HOME_ANGLES.L_Hip_Pitch,
        },
        duration: 0.8,
      },
    ]);
  }

  /**
   * Sit Down: Bend knees and hips to a sitting position.
   */
  private sitDown(): void {
    this.queueAnimation([
      {
        targets: {
          R_Knee_Pitch: 45,
          L_Knee_Pitch: 45,
          R_Hip_Pitch: 45,
          L_Hip_Pitch: 45,
          R_Ankle_Pitch: 120,
          L_Ankle_Pitch: 120,
        },
        duration: 1.0,
      },
    ]);
  }

  /**
   * Stand Up: Return all leg servos to home (standing upright).
   */
  private standUp(): void {
    this.queueAnimation([
      {
        targets: {
          R_Hip_Yaw: HOME_ANGLES.R_Hip_Yaw,
          R_Hip_Roll: HOME_ANGLES.R_Hip_Roll,
          R_Hip_Pitch: HOME_ANGLES.R_Hip_Pitch,
          R_Knee_Pitch: HOME_ANGLES.R_Knee_Pitch,
          R_Ankle_Pitch: HOME_ANGLES.R_Ankle_Pitch,
          L_Hip_Yaw: HOME_ANGLES.L_Hip_Yaw,
          L_Hip_Roll: HOME_ANGLES.L_Hip_Roll,
          L_Hip_Pitch: HOME_ANGLES.L_Hip_Pitch,
          L_Knee_Pitch: HOME_ANGLES.L_Knee_Pitch,
          L_Ankle_Pitch: HOME_ANGLES.L_Ankle_Pitch,
        },
        duration: 0.8,
      },
    ]);
  }

  /**
   * Turn Left: Alternate hip yaw servos to rotate left (CCW from above).
   * Each step rotates ~π/6 radians (~30°), 2 steps = ~60° total.
   */
  private turnLeft(): void {
    this.queueAnimation([
      // Shift weight right, rotate left hip yaw outward
      {
        targets: {
          R_Hip_Yaw: 90,
          L_Hip_Yaw: 60,
        },
        duration: 0.4,
        yawDelta: Math.PI / 6,
      },
      // Bring right foot to meet
      {
        targets: {
          R_Hip_Yaw: 60,
          L_Hip_Yaw: 60,
        },
        duration: 0.3,
      },
      // Second step: rotate again
      {
        targets: {
          R_Hip_Yaw: 60,
          L_Hip_Yaw: 30,
        },
        duration: 0.4,
        yawDelta: Math.PI / 6,
      },
      // Bring right foot to meet
      {
        targets: {
          R_Hip_Yaw: 30,
          L_Hip_Yaw: 30,
        },
        duration: 0.3,
      },
      // Return to neutral
      {
        targets: {
          R_Hip_Yaw: HOME_ANGLES.R_Hip_Yaw,
          L_Hip_Yaw: HOME_ANGLES.L_Hip_Yaw,
        },
        duration: 0.4,
      },
    ]);
  }

  /**
   * Turn Right: Alternate hip yaw servos to rotate right (CW from above).
   * Each step rotates ~-π/6 radians (~-30°), 2 steps = ~-60° total.
   */
  private turnRight(): void {
    this.queueAnimation([
      // Shift weight left, rotate right hip yaw outward
      {
        targets: {
          R_Hip_Yaw: 120,
          L_Hip_Yaw: 90,
        },
        duration: 0.4,
        yawDelta: -Math.PI / 6,
      },
      // Bring left foot to meet
      {
        targets: {
          R_Hip_Yaw: 120,
          L_Hip_Yaw: 120,
        },
        duration: 0.3,
      },
      // Second step: rotate again
      {
        targets: {
          R_Hip_Yaw: 150,
          L_Hip_Yaw: 120,
        },
        duration: 0.4,
        yawDelta: -Math.PI / 6,
      },
      // Bring left foot to meet
      {
        targets: {
          R_Hip_Yaw: 150,
          L_Hip_Yaw: 150,
        },
        duration: 0.3,
      },
      // Return to neutral
      {
        targets: {
          R_Hip_Yaw: HOME_ANGLES.R_Hip_Yaw,
          L_Hip_Yaw: HOME_ANGLES.L_Hip_Yaw,
        },
        duration: 0.4,
      },
    ]);
  }

  /**
   * Move Forward: Walking cycle with lateral weight shift and arm swing.
   * Each swing phase advances the robot ~0.04m forward, each plant ~0.02m.
   */
  private moveForward(): void {
    this.queueAnimation([
      // Step 1a: Shift weight LEFT, swing right leg forward
      {
        targets: {
          R_Hip_Roll: 80, L_Hip_Roll: 80,
          R_Hip_Pitch: 65, R_Knee_Pitch: 55,
          R_Ankle_Pitch: 105,
          L_Hip_Pitch: 100, L_Ankle_Pitch: 85,
          R_Shoulder_Pitch: 30, L_Shoulder_Pitch: 150,
        },
        duration: 0.35,
        moveDelta: [0, 0, 0.04] as [number, number, number],
      },
      // Step 1b: Plant right foot, shift to center
      {
        targets: {
          R_Hip_Roll: 90, L_Hip_Roll: 90,
          R_Hip_Pitch: 85, R_Knee_Pitch: 90, R_Ankle_Pitch: 90,
          L_Hip_Pitch: 90, L_Ankle_Pitch: 90,
          R_Shoulder_Pitch: HOME_ANGLES.R_Shoulder_Pitch,
          L_Shoulder_Pitch: HOME_ANGLES.L_Shoulder_Pitch,
        },
        duration: 0.25,
        moveDelta: [0, 0, 0.02] as [number, number, number],
      },
      // Step 2a: Shift weight RIGHT, swing left leg forward
      {
        targets: {
          R_Hip_Roll: 100, L_Hip_Roll: 100,
          L_Hip_Pitch: 65, L_Knee_Pitch: 55,
          L_Ankle_Pitch: 105,
          R_Hip_Pitch: 100, R_Ankle_Pitch: 85,
          R_Shoulder_Pitch: 30, L_Shoulder_Pitch: 150,
        },
        duration: 0.35,
        moveDelta: [0, 0, 0.04] as [number, number, number],
      },
      // Step 2b: Plant left foot
      {
        targets: {
          R_Hip_Roll: 90, L_Hip_Roll: 90,
          L_Hip_Pitch: 85, L_Knee_Pitch: 90, L_Ankle_Pitch: 90,
          R_Hip_Pitch: 90, R_Ankle_Pitch: 90,
          R_Shoulder_Pitch: HOME_ANGLES.R_Shoulder_Pitch,
          L_Shoulder_Pitch: HOME_ANGLES.L_Shoulder_Pitch,
        },
        duration: 0.25,
        moveDelta: [0, 0, 0.02] as [number, number, number],
      },
      // Step 3a: One more right step
      {
        targets: {
          R_Hip_Roll: 80, L_Hip_Roll: 80,
          R_Hip_Pitch: 65, R_Knee_Pitch: 55, R_Ankle_Pitch: 105,
          L_Hip_Pitch: 100, L_Ankle_Pitch: 85,
          R_Shoulder_Pitch: 30, L_Shoulder_Pitch: 150,
        },
        duration: 0.35,
        moveDelta: [0, 0, 0.04] as [number, number, number],
      },
      // Return to standing
      {
        targets: {
          R_Hip_Pitch: HOME_ANGLES.R_Hip_Pitch,
          R_Hip_Roll: HOME_ANGLES.R_Hip_Roll,
          R_Knee_Pitch: HOME_ANGLES.R_Knee_Pitch,
          R_Ankle_Pitch: HOME_ANGLES.R_Ankle_Pitch,
          L_Hip_Pitch: HOME_ANGLES.L_Hip_Pitch,
          L_Hip_Roll: HOME_ANGLES.L_Hip_Roll,
          L_Knee_Pitch: HOME_ANGLES.L_Knee_Pitch,
          L_Ankle_Pitch: HOME_ANGLES.L_Ankle_Pitch,
          R_Shoulder_Pitch: HOME_ANGLES.R_Shoulder_Pitch,
          L_Shoulder_Pitch: HOME_ANGLES.L_Shoulder_Pitch,
        },
        duration: 0.4,
        moveDelta: [0, 0, 0.02] as [number, number, number],
      },
    ]);
  }

  /**
   * Move Backward: Walking cycle in reverse — each step moves ~0.04m backward.
   */
  private moveBackward(): void {
    this.queueAnimation([
      // Step 1a: Shift weight LEFT, swing right leg backward
      {
        targets: {
          R_Hip_Roll: 80, L_Hip_Roll: 80,
          R_Hip_Pitch: 115, R_Knee_Pitch: 55,
          R_Ankle_Pitch: 75,
          L_Hip_Pitch: 80, L_Ankle_Pitch: 95,
          R_Shoulder_Pitch: 30, L_Shoulder_Pitch: 150,
        },
        duration: 0.35,
        moveDelta: [0, 0, -0.04] as [number, number, number],
      },
      // Step 1b: Plant right foot
      {
        targets: {
          R_Hip_Roll: 90, L_Hip_Roll: 90,
          R_Hip_Pitch: 95, R_Knee_Pitch: 90, R_Ankle_Pitch: 90,
          L_Hip_Pitch: 90, L_Ankle_Pitch: 90,
          R_Shoulder_Pitch: HOME_ANGLES.R_Shoulder_Pitch,
          L_Shoulder_Pitch: HOME_ANGLES.L_Shoulder_Pitch,
        },
        duration: 0.25,
        moveDelta: [0, 0, -0.02] as [number, number, number],
      },
      // Step 2a: Shift weight RIGHT, swing left leg backward
      {
        targets: {
          R_Hip_Roll: 100, L_Hip_Roll: 100,
          L_Hip_Pitch: 115, L_Knee_Pitch: 55,
          L_Ankle_Pitch: 75,
          R_Hip_Pitch: 80, R_Ankle_Pitch: 95,
          R_Shoulder_Pitch: 30, L_Shoulder_Pitch: 150,
        },
        duration: 0.35,
        moveDelta: [0, 0, -0.04] as [number, number, number],
      },
      // Step 2b: Plant left foot
      {
        targets: {
          R_Hip_Roll: 90, L_Hip_Roll: 90,
          L_Hip_Pitch: 95, L_Knee_Pitch: 90, L_Ankle_Pitch: 90,
          R_Hip_Pitch: 90, R_Ankle_Pitch: 90,
          R_Shoulder_Pitch: HOME_ANGLES.R_Shoulder_Pitch,
          L_Shoulder_Pitch: HOME_ANGLES.L_Shoulder_Pitch,
        },
        duration: 0.25,
        moveDelta: [0, 0, -0.02] as [number, number, number],
      },
      // Return to standing
      {
        targets: {
          R_Hip_Pitch: HOME_ANGLES.R_Hip_Pitch,
          R_Hip_Roll: HOME_ANGLES.R_Hip_Roll,
          R_Knee_Pitch: HOME_ANGLES.R_Knee_Pitch,
          R_Ankle_Pitch: HOME_ANGLES.R_Ankle_Pitch,
          L_Hip_Pitch: HOME_ANGLES.L_Hip_Pitch,
          L_Hip_Roll: HOME_ANGLES.L_Hip_Roll,
          L_Knee_Pitch: HOME_ANGLES.L_Knee_Pitch,
          L_Ankle_Pitch: HOME_ANGLES.L_Ankle_Pitch,
          R_Shoulder_Pitch: HOME_ANGLES.R_Shoulder_Pitch,
          L_Shoulder_Pitch: HOME_ANGLES.L_Shoulder_Pitch,
        },
        duration: 0.4,
      },
    ]);
  }

    /**
   * Push Up: Bow down, then use arms to push back up.
   */
  private pushUp(): void {
    this.queueAnimation([
      // Get into push-up starting position: lean forward, arms out
      {
        targets: {
          R_Hip_Pitch: 140,
          L_Hip_Pitch: 140,
          R_Shoulder_Pitch: 90,
          L_Shoulder_Pitch: 90,
          R_Elbow_Pitch: 90,
          L_Elbow_Pitch: 90,
        },
        duration: 0.7,
      },
      // Push-up down: bend elbows
      {
        targets: {
          R_Elbow_Pitch: 30,
          L_Elbow_Pitch: 30,
        },
        duration: 0.5,
      },
      // Push-up up: extend elbows
      {
        targets: {
          R_Elbow_Pitch: 90,
          L_Elbow_Pitch: 90,
        },
        duration: 0.5,
      },
      // Push-up down again
      {
        targets: {
          R_Elbow_Pitch: 30,
          L_Elbow_Pitch: 30,
        },
        duration: 0.5,
      },
      // Push-up up
      {
        targets: {
          R_Elbow_Pitch: 90,
          L_Elbow_Pitch: 90,
        },
        duration: 0.5,
      },
      // Third push-up down
      {
        targets: {
          R_Elbow_Pitch: 30,
          L_Elbow_Pitch: 30,
        },
        duration: 0.5,
      },
      // Third push-up up
      {
        targets: {
          R_Elbow_Pitch: 90,
          L_Elbow_Pitch: 90,
        },
        duration: 0.5,
      },
      // Return to standing
      {
        targets: {
          R_Hip_Pitch: HOME_ANGLES.R_Hip_Pitch,
          L_Hip_Pitch: HOME_ANGLES.L_Hip_Pitch,
          R_Shoulder_Pitch: HOME_ANGLES.R_Shoulder_Pitch,
          L_Shoulder_Pitch: HOME_ANGLES.L_Shoulder_Pitch,
          R_Elbow_Pitch: HOME_ANGLES.R_Elbow_Pitch,
          L_Elbow_Pitch: HOME_ANGLES.L_Elbow_Pitch,
        },
        duration: 0.7,
      },
    ]);
  }

  /**
   * Dance: A fun sequence combining multiple moves.
   */
  private dance(): void {
    this.queueAnimation([
      // Beat 1: Arms wide, lean right
      {
        targets: {
          R_Shoulder_Pitch: 90,
          L_Shoulder_Pitch: 90,
          R_Shoulder_Roll: 45,
          L_Shoulder_Roll: 135,
          R_Hip_Roll: 70,
          L_Hip_Roll: 70,
        },
        duration: 0.4,
      },
      // Beat 2: Arms up, lean left
      {
        targets: {
          R_Shoulder_Pitch: 180,
          L_Shoulder_Pitch: 0,
          R_Shoulder_Roll: 90,
          L_Shoulder_Roll: 90,
          R_Hip_Roll: 110,
          L_Hip_Roll: 110,
        },
        duration: 0.4,
      },
      // Beat 3: Bicep flex right, twist
      {
        targets: {
          R_Shoulder_Pitch: 90,
          R_Elbow_Pitch: 45,
          L_Shoulder_Pitch: 180,
          L_Elbow_Pitch: 90,
          R_Hip_Yaw: 70,
          L_Hip_Yaw: 70,
          R_Hip_Roll: 90,
          L_Hip_Roll: 90,
        },
        duration: 0.35,
      },
      // Beat 4: Bicep flex left, twist other way
      {
        targets: {
          L_Shoulder_Pitch: 90,
          L_Elbow_Pitch: 45,
          R_Shoulder_Pitch: 0,
          R_Elbow_Pitch: 90,
          R_Hip_Yaw: 110,
          L_Hip_Yaw: 110,
        },
        duration: 0.35,
      },
      // Beat 5: Head bob + both arms up
      {
        targets: {
          R_Shoulder_Pitch: 180,
          L_Shoulder_Pitch: 0,
          R_Elbow_Pitch: 60,
          L_Elbow_Pitch: 60,
          Head_Yaw: 60,
          R_Hip_Yaw: 90,
          L_Hip_Yaw: 90,
          R_Knee_Pitch: 70,
          L_Knee_Pitch: 70,
        },
        duration: 0.3,
      },
      // Beat 6: Head other way, arms down
      {
        targets: {
          R_Shoulder_Pitch: 45,
          L_Shoulder_Pitch: 135,
          R_Elbow_Pitch: 120,
          L_Elbow_Pitch: 120,
          Head_Yaw: 120,
          R_Knee_Pitch: 90,
          L_Knee_Pitch: 90,
        },
        duration: 0.3,
      },
      // Beat 7: Squat pulse
      {
        targets: {
          R_Knee_Pitch: 60,
          L_Knee_Pitch: 60,
          R_Hip_Pitch: 70,
          L_Hip_Pitch: 70,
          R_Shoulder_Pitch: 90,
          L_Shoulder_Pitch: 90,
          R_Shoulder_Roll: 45,
          L_Shoulder_Roll: 135,
          Head_Yaw: 90,
        },
        duration: 0.35,
      },
      // Beat 8: Pop back up
      {
        targets: {
          R_Knee_Pitch: 90,
          L_Knee_Pitch: 90,
          R_Hip_Pitch: 90,
          L_Hip_Pitch: 90,
          R_Shoulder_Roll: 90,
          L_Shoulder_Roll: 90,
        },
        duration: 0.25,
      },
      // Beat 9: Final spin twist with arms wide
      {
        targets: {
          R_Shoulder_Pitch: 120,
          L_Shoulder_Pitch: 60,
          R_Shoulder_Roll: 30,
          L_Shoulder_Roll: 150,
          R_Elbow_Pitch: 90,
          L_Elbow_Pitch: 90,
          R_Hip_Yaw: 60,
          L_Hip_Yaw: 120,
        },
        duration: 0.4,
      },
      // Beat 10: Other direction
      {
        targets: {
          R_Shoulder_Pitch: 60,
          L_Shoulder_Pitch: 120,
          R_Shoulder_Roll: 150,
          L_Shoulder_Roll: 30,
          R_Hip_Yaw: 120,
          L_Hip_Yaw: 60,
        },
        duration: 0.4,
      },
      // Finale: Victory pose - arms up
      {
        targets: {
          R_Shoulder_Pitch: 180,
          L_Shoulder_Pitch: 0,
          R_Shoulder_Roll: 90,
          L_Shoulder_Roll: 90,
          R_Elbow_Pitch: 90,
          L_Elbow_Pitch: 90,
          R_Hip_Yaw: 90,
          L_Hip_Yaw: 90,
        },
        duration: 0.4,
      },
      // Hold finale
      { targets: {}, duration: 0.8 },
      // Return home
      {
        targets: {
          ...Object.fromEntries(SERVO_NAMES.map((n) => [n, HOME_ANGLES[n]])),
        } as Record<ServoName, number>,
        duration: 0.8,
      },
    ]);
  }
}
