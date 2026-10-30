// ============================================================
// SimuForge Studio — Sensor Suite Engine
// Proper 6-DOF IMU (specific force), foot pressure,
// motor feedback, complementary filter, power monitoring
// Inspired by: MuJoCo, Drake, real MPU6050/BNO055 MEMS
// ============================================================

import { ServoName, SERVO_NAMES, ServoState } from '../types/simulation';
import { DynamicsState } from './DynamicsEngine';

// ================== NOISE & BIAS PARAMETERS ==================

const IMU_ACCEL_NOISE_STD = 0.08;
const IMU_GYRO_NOISE_STD = 0.015;
const IMU_ACCEL_BIAS_WALK = 0.0001;
const IMU_GYRO_BIAS_WALK = 0.00005;
const GRAVITY_Y = 9.81;

// ================== OUTPUT TYPES ==================

export interface IMUReading {
  /** Specific force in body frame (m/s²). At rest: [0, +9.81, 0] */
  accelX: number; accelY: number; accelZ: number;
  /** Angular velocity in body frame (rad/s) */
  gyroX: number; gyroY: number; gyroZ: number;
  /** Fused orientation (degrees) via complementary filter */
  roll: number; pitch: number; yaw: number;
  /** Magnitude of acceleration vector */
  accelMagnitude: number;
  /** Temperature estimate (°C) — typical MEMS self-heating */
  temperature: number;
}

export interface FootPressure {
  leftInContact: boolean;
  leftForceN: number;
  rightInContact: boolean;
  rightForceN: number;
  /** Center of pressure XZ (weighted average of contact positions) */
  copX: number;
  copZ: number;
}

export interface MotorFeedback {
  positionError: number;  // |target - current| degrees
  velocity: number;       // estimated angular velocity deg/s
  current: number;        // Amps draw estimate
  dutyCycle: number;      // 0-1 PWM duty cycle
  temperature: number;    // estimated motor temp °C
}

export interface PowerProfile {
  totalWatts: number;
  perServo: Record<ServoName, number>;
  totalCurrentAmps: number;
  estimatedRuntimeMin: number;
  batteryVoltage: number;
  batteryPercentage: number;
}

export interface SensorState {
  imu: IMUReading;
  footPressure: FootPressure;
  power: PowerProfile;
  motorFeedback: Record<ServoName, MotorFeedback>;
}

// ================== SENSOR SUITE ==================

export class SensorSuite {
  private accelBias = [0, 0, 0];
  private gyroBias = [0, 0, 0];
  private filteredRoll = 0;
  private filteredPitch = 0;
  private filteredYaw = 0;
  private prevTorsoPos: [number, number, number] | null = null;
  private prevTorsoVel: [number, number, number] = [0, 0, 0];
  private torsoAccel: [number, number, number] = [0, 0, 0];
  private prevAngles: Record<string, number> = {};
  private motorTemps: Record<string, number> = {};
  private simTimeSec = 0;

  private randn(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  }

  update(
    dynamics: DynamicsState,
    servos: Record<ServoName, ServoState>,
    robotYaw: number,
    dt: number,
  ): SensorState {
    this.simTimeSec += dt;

    // ===== 1. IMU — Proper Specific Force =====
    const torsoPos = dynamics.com;
    if (this.prevTorsoPos && dt > 0.001) {
      const vel: [number, number, number] = [
        (torsoPos[0] - this.prevTorsoPos[0]) / dt,
        (torsoPos[1] - this.prevTorsoPos[1]) / dt,
        (torsoPos[2] - this.prevTorsoPos[2]) / dt,
      ];
      this.torsoAccel = [
        (vel[0] - this.prevTorsoVel[0]) / dt,
        (vel[1] - this.prevTorsoVel[1]) / dt,
        (vel[2] - this.prevTorsoVel[2]) / dt,
      ];
      this.prevTorsoVel = vel;
    }
    this.prevTorsoPos = [...torsoPos] as [number, number, number];

    const cy = Math.cos(robotYaw), sy = Math.sin(robotYaw);

    // Specific force: a_measured = R^T * (a_linear - g_world)
    const specificForceWorld: [number, number, number] = [
      this.torsoAccel[0],
      this.torsoAccel[1] - (-GRAVITY_Y),
      this.torsoAccel[2],
    ];

    const accelBody: [number, number, number] = [
      cy * specificForceWorld[0] - sy * specificForceWorld[2],
      specificForceWorld[1],
      sy * specificForceWorld[0] + cy * specificForceWorld[2],
    ];

    // Bias random walk
    const sqrtDt = Math.sqrt(Math.max(dt, 0.001));
    for (let i = 0; i < 3; i++) {
      this.accelBias[i] += IMU_ACCEL_BIAS_WALK * sqrtDt * this.randn();
      this.gyroBias[i] += IMU_GYRO_BIAS_WALK * sqrtDt * this.randn();
      this.accelBias[i] = Math.max(-0.3, Math.min(0.3, this.accelBias[i]));
      this.gyroBias[i] = Math.max(-0.05, Math.min(0.05, this.gyroBias[i]));
    }

    const ax = accelBody[0] + this.accelBias[0] + IMU_ACCEL_NOISE_STD * this.randn();
    const ay = accelBody[1] + this.accelBias[1] + IMU_ACCEL_NOISE_STD * this.randn();
    const az = accelBody[2] + this.accelBias[2] + IMU_ACCEL_NOISE_STD * this.randn();
    const accelMagnitude = Math.sqrt(ax*ax + ay*ay + az*az);

    let gx = 0, gy = 0, gz = 0;
    if (dt > 0.001) {
      const prevYaw = this.prevAngles['__yaw'] || robotYaw;
      gy = (robotYaw - prevYaw) / dt;
      this.prevAngles['__yaw'] = robotYaw;
    }
    gx += this.gyroBias[0] + IMU_GYRO_NOISE_STD * this.randn();
    gy += this.gyroBias[1] + IMU_GYRO_NOISE_STD * this.randn();
    gz += this.gyroBias[2] + IMU_GYRO_NOISE_STD * this.randn();

    // ===== 2. Complementary Filter =====
    const ALPHA = 0.98;
    const accelRoll = Math.atan2(az, ay) * 180 / Math.PI;
    const accelPitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az)) * 180 / Math.PI;

    if (dt > 0.001) {
      this.filteredRoll = ALPHA * (this.filteredRoll + (gx * 180 / Math.PI) * dt) + (1 - ALPHA) * accelRoll;
      this.filteredPitch = ALPHA * (this.filteredPitch + (gz * 180 / Math.PI) * dt) + (1 - ALPHA) * accelPitch;
      this.filteredYaw += (gy * 180 / Math.PI) * dt;
    }

    // IMU self-heating temperature model (stabilizes around 35-40°C)
    const imuTemp = 25 + 12 * (1 - Math.exp(-this.simTimeSec / 60));

    const imu: IMUReading = {
      accelX: ax, accelY: ay, accelZ: az,
      gyroX: gx, gyroY: gy, gyroZ: gz,
      roll: this.filteredRoll,
      pitch: this.filteredPitch,
      yaw: this.filteredYaw,
      accelMagnitude,
      temperature: imuTemp,
    };

    // ===== 3. Foot Pressure + Center of Pressure =====
    const lf = dynamics.leftFootContact;
    const rf = dynamics.rightFootContact;
    const totalF = lf.normalForce + rf.normalForce;
    let copX = 0, copZ = 0;
    if (totalF > 0.01) {
      copX = (lf.position[0] * lf.normalForce + rf.position[0] * rf.normalForce) / totalF;
      copZ = (lf.position[2] * lf.normalForce + rf.position[2] * rf.normalForce) / totalF;
    }

    const footPressure: FootPressure = {
      leftInContact: lf.inContact,
      leftForceN: lf.normalForce,
      rightInContact: rf.inContact,
      rightForceN: rf.normalForce,
      copX,
      copZ,
    };

    // ===== 4. Motor Feedback =====
    const motorFeedback = {} as Record<ServoName, MotorFeedback>;
    for (const name of SERVO_NAMES) {
      const servo = servos[name];
      const js = dynamics.jointStates[name];

      // Motor temperature model: base 30°C + proportional to power draw
      const prevTemp = this.motorTemps[name] || 30;
      const targetTemp = 30 + (js?.power || 0) * 15; // 15°C per Watt
      const motorTemp = prevTemp + (targetTemp - prevTemp) * Math.min(1, dt * 0.5);
      this.motorTemps[name] = motorTemp;

      // PWM duty cycle from position error
      const posErr = Math.abs(servo.targetAngle - servo.angle);
      const dutyCycle = Math.min(1, posErr / 45); // full duty at 45° error

      motorFeedback[name] = {
        positionError: js?.positionError || posErr,
        velocity: js?.velocity || 0,
        current: js?.current || 0,
        dutyCycle,
        temperature: motorTemp,
      };
    }

    // ===== 5. Power Profile =====
    const totalCurrentAmps = dynamics.totalCurrentAmps;
    // Battery voltage sag under load
    const internalR = 0.15; // Ohms typical for 2S Li-ion
    const batteryVoltage = Math.max(6.0, 7.4 - totalCurrentAmps * internalR);
    const batteryPercentage = Math.max(0, Math.min(100, ((batteryVoltage - 6.0) / (8.4 - 6.0)) * 100));

    const power: PowerProfile = {
      totalWatts: dynamics.totalPowerWatts,
      perServo: { ...dynamics.perServoPower },
      totalCurrentAmps,
      estimatedRuntimeMin: dynamics.estimatedRuntimeMinutes,
      batteryVoltage,
      batteryPercentage,
    };

    return { imu, footPressure, power, motorFeedback };
  }

  reset(): void {
    this.accelBias = [0, 0, 0];
    this.gyroBias = [0, 0, 0];
    this.filteredRoll = 0;
    this.filteredPitch = 0;
    this.filteredYaw = 0;
    this.prevTorsoPos = null;
    this.prevTorsoVel = [0, 0, 0];
    this.torsoAccel = [0, 0, 0];
    this.prevAngles = {};
    this.motorTemps = {};
    this.simTimeSec = 0;
  }
}

export default SensorSuite;
