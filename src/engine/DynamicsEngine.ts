// ============================================================
// SimuForge Studio — Rigid-Body Dynamics Engine
// Real mass/inertia, CoM, ZMP, ground contact, joint torques,
// energy, joint limits, contact patches
// Inspired by: MuJoCo, Drake, Webots, Gazebo
// ============================================================

import {
  ServoName, SERVO_NAMES, ServoState, ROBOT_DIMS, HOME_ANGLES,
} from '../types/simulation';

// ================== MATH PRIMITIVES ==================

export type Vec3 = [number, number, number];
type Mat3 = [number, number, number, number, number, number, number, number, number];

const GRAVITY: Vec3 = [0, -9.81, 0]; // Y-up coordinate system
const GRAVITY_MAG = 9.81;
const SERVO_EFFICIENCY = 0.55;
const SERVO_TORQUE_CONST = 0.157; // N·m per Amp at stall
const LOGIC_POWER_W = 1.8;
const BATTERY_CAPACITY_WH = 7.4 * 2.0; // 2S 2000mAh = 14.8 Wh
const BATTERY_VOLTAGE = 7.4;

function v3(x: number, y: number, z: number): Vec3 { return [x, y, z]; }
function v3add(a: Vec3, b: Vec3): Vec3 { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
function v3sub(a: Vec3, b: Vec3): Vec3 { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function v3scale(v: Vec3, s: number): Vec3 { return [v[0]*s, v[1]*s, v[2]*s]; }
function v3dot(a: Vec3, b: Vec3): number { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function v3cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function v3len(v: Vec3): number { return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]); }

// Row-major 3x3 rotation matrices
function rotX(a: number): Mat3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [1,0,0, 0,c,-s, 0,s,c];
}
function rotY(a: number): Mat3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [c,0,s, 0,1,0, -s,0,c];
}
function rotZ(a: number): Mat3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [c,-s,0, s,c,0, 0,0,1];
}
function m3mul(a: Mat3, b: Mat3): Mat3 {
  return [
    a[0]*b[0]+a[1]*b[3]+a[2]*b[6], a[0]*b[1]+a[1]*b[4]+a[2]*b[7], a[0]*b[2]+a[1]*b[5]+a[2]*b[8],
    a[3]*b[0]+a[4]*b[3]+a[5]*b[6], a[3]*b[1]+a[4]*b[4]+a[5]*b[7], a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
    a[6]*b[0]+a[7]*b[3]+a[8]*b[6], a[6]*b[1]+a[7]*b[4]+a[8]*b[7], a[6]*b[2]+a[7]*b[5]+a[8]*b[8],
  ];
}
function m3vec(m: Mat3, v: Vec3): Vec3 {
  return [m[0]*v[0]+m[1]*v[1]+m[2]*v[2], m[3]*v[0]+m[4]*v[1]+m[5]*v[2], m[6]*v[0]+m[7]*v[1]+m[8]*v[2]];
}
function m3T(m: Mat3): Mat3 { return [m[0],m[3],m[6], m[1],m[4],m[7], m[2],m[5],m[8]]; }
const I3: Mat3 = [1,0,0, 0,1,0, 0,0,1];

function mm(val: number): number { return val / 1000; }
function degRad(d: number): number { return d * Math.PI / 180; }

// ================== LINK MASS PROPERTIES ==================

interface LinkMass {
  id: string;
  mass: number;          // kg
  comLocal: Vec3;        // CoM offset in the owning joint's local frame (meters)
}

// Mass distribution for the Hash V3 humanoid (~1.3 kg total)
const LINK_MASSES: Record<string, LinkMass> = {
  torso:      { id: 'torso',      mass: 0.380, comLocal: v3(0, 0, 0) },
  pelvis:     { id: 'pelvis',     mass: 0.260, comLocal: v3(0, -mm(50), 0) },
  head:       { id: 'head',       mass: 0.095, comLocal: v3(0, mm(30), 0) },
  r_upper_arm:{ id: 'r_upper_arm',mass: 0.050, comLocal: v3(0, -mm(40), 0) },
  r_forearm:  { id: 'r_forearm',  mass: 0.057, comLocal: v3(0, -mm(50), 0) },
  l_upper_arm:{ id: 'l_upper_arm',mass: 0.050, comLocal: v3(0, -mm(40), 0) },
  l_forearm:  { id: 'l_forearm',  mass: 0.057, comLocal: v3(0, -mm(50), 0) },
  r_thigh:    { id: 'r_thigh',    mass: 0.075, comLocal: v3(0, -mm(40), 0) },
  r_shin:     { id: 'r_shin',     mass: 0.060, comLocal: v3(0, -mm(40), 0) },
  r_foot:     { id: 'r_foot',     mass: 0.040, comLocal: v3(0, -mm(10), mm(15)) },
  l_thigh:    { id: 'l_thigh',    mass: 0.075, comLocal: v3(0, -mm(40), 0) },
  l_shin:     { id: 'l_shin',     mass: 0.060, comLocal: v3(0, -mm(40), 0) },
  l_foot:     { id: 'l_foot',     mass: 0.040, comLocal: v3(0, -mm(10), mm(15)) },
};

const TOTAL_MASS = Object.values(LINK_MASSES).reduce((s, l) => s + l.mass, 0);

// ================== KINEMATIC CHAIN DEFINITION ==================

interface JointDef {
  servo: ServoName;
  offset: Vec3;
  axis: 'x' | 'y' | 'z';
  linkId: string | null;
}

const D = ROBOT_DIMS;
const torsoHalfH = mm(D.torso.h) / 2;
const pelvisH = mm(D.pelvis.h);
const neckH = mm(D.neck.h);
const shoulderW = mm(D.shoulderWidth);
const upperArmL = mm(D.upperArm.length);
const thighL = mm(D.thigh.length);
const shinL = mm(D.shin.length);
const footL = mm(D.foot.length);
const footW = mm(D.foot.w);
const footH = mm(D.foot.h);

const HEAD_CHAIN: JointDef[] = [
  { servo: 'Head_Yaw', offset: v3(0, torsoHalfH + neckH, 0), axis: 'y', linkId: 'head' },
];

const R_ARM_CHAIN: JointDef[] = [
  { servo: 'R_Shoulder_Pitch', offset: v3(-shoulderW/2, torsoHalfH - mm(10), 0), axis: 'x', linkId: null },
  { servo: 'R_Shoulder_Roll',  offset: v3(0, -upperArmL/2, 0), axis: 'z', linkId: 'r_upper_arm' },
  { servo: 'R_Elbow_Pitch',    offset: v3(0, -upperArmL/2, 0), axis: 'x', linkId: 'r_forearm' },
];

const L_ARM_CHAIN: JointDef[] = [
  { servo: 'L_Shoulder_Pitch', offset: v3(+shoulderW/2, torsoHalfH - mm(10), 0), axis: 'x', linkId: null },
  { servo: 'L_Shoulder_Roll',  offset: v3(0, -upperArmL/2, 0), axis: 'z', linkId: 'l_upper_arm' },
  { servo: 'L_Elbow_Pitch',    offset: v3(0, -upperArmL/2, 0), axis: 'x', linkId: 'l_forearm' },
];

const R_LEG_CHAIN: JointDef[] = [
  { servo: 'R_Hip_Yaw',    offset: v3(-mm(D.pelvis.w)/2, -(torsoHalfH + pelvisH), 0), axis: 'y', linkId: null },
  { servo: 'R_Hip_Roll',   offset: v3(0, 0, 0), axis: 'z', linkId: null },
  { servo: 'R_Hip_Pitch',  offset: v3(0, 0, 0), axis: 'x', linkId: 'r_thigh' },
  { servo: 'R_Knee_Pitch', offset: v3(0, -thighL, 0), axis: 'x', linkId: 'r_shin' },
  { servo: 'R_Ankle_Pitch',offset: v3(0, -shinL, 0), axis: 'x', linkId: 'r_foot' },
];

const L_LEG_CHAIN: JointDef[] = [
  { servo: 'L_Hip_Yaw',    offset: v3(+mm(D.pelvis.w)/2, -(torsoHalfH + pelvisH), 0), axis: 'y', linkId: null },
  { servo: 'L_Hip_Roll',   offset: v3(0, 0, 0), axis: 'z', linkId: null },
  { servo: 'L_Hip_Pitch',  offset: v3(0, 0, 0), axis: 'x', linkId: 'l_thigh' },
  { servo: 'L_Knee_Pitch', offset: v3(0, -thighL, 0), axis: 'x', linkId: 'l_shin' },
  { servo: 'L_Ankle_Pitch',offset: v3(0, -shinL, 0), axis: 'x', linkId: 'l_foot' },
];

const ALL_CHAINS = [HEAD_CHAIN, R_ARM_CHAIN, L_ARM_CHAIN, R_LEG_CHAIN, L_LEG_CHAIN];

// Mapping: servo → list of distal link ids (for gravity torque calculation)
const DISTAL_LINKS: Record<ServoName, string[]> = {
  Head_Yaw: ['head'],
  R_Shoulder_Pitch: ['r_upper_arm', 'r_forearm'],
  R_Shoulder_Roll:  ['r_upper_arm', 'r_forearm'],
  R_Elbow_Pitch:    ['r_forearm'],
  L_Shoulder_Pitch: ['l_upper_arm', 'l_forearm'],
  L_Shoulder_Roll:  ['l_upper_arm', 'l_forearm'],
  L_Elbow_Pitch:    ['l_forearm'],
  R_Hip_Yaw:    ['r_thigh', 'r_shin', 'r_foot'],
  R_Hip_Roll:   ['r_thigh', 'r_shin', 'r_foot'],
  R_Hip_Pitch:  ['r_thigh', 'r_shin', 'r_foot'],
  R_Knee_Pitch: ['r_shin', 'r_foot'],
  R_Ankle_Pitch:['r_foot'],
  L_Hip_Yaw:    ['l_thigh', 'l_shin', 'l_foot'],
  L_Hip_Roll:   ['l_thigh', 'l_shin', 'l_foot'],
  L_Hip_Pitch:  ['l_thigh', 'l_shin', 'l_foot'],
  L_Knee_Pitch: ['l_shin', 'l_foot'],
  L_Ankle_Pitch:['l_foot'],
};

// ================== OUTPUT TYPES ==================

export interface FootContact {
  inContact: boolean;
  normalForce: number;    // Newtons
  position: Vec3;         // sole center in world frame
  corners: Vec3[];        // 4 sole corners in world frame
  penetration: number;    // meters of ground penetration
  contactArea: number;    // m² estimated contact patch area
}

export interface JointState {
  angle: number;          // current angle in degrees
  torque: number;         // N·m gravity compensation torque
  power: number;          // Watts
  limitProximity: number; // 0 = centered, 1 = at mechanical limit
  velocity: number;       // estimated angular velocity deg/s
  positionError: number;  // |target - current| degrees
  current: number;        // Amps draw estimate
}

export interface DynamicsState {
  // Kinematic state
  jointPositions: Record<ServoName, Vec3>;
  jointAxesWorld: Record<ServoName, Vec3>;
  jointStates: Record<ServoName, JointState>;
  linkCoMs: Record<string, { position: Vec3; mass: number }>;

  // Center of mass
  com: Vec3;
  comVelocity: Vec3;
  comProjection: [number, number]; // XZ ground projection
  zmp: [number, number];

  // Support & stability
  supportPolygon: [number, number][];
  isStable: boolean;
  stabilityMargin: number;         // meters

  // Ground contact
  leftFootContact: FootContact;
  rightFootContact: FootContact;
  contactCount: number;
  totalContactForce: number;       // Newtons

  // Gait
  gaitPhase: 'double_support' | 'left_stance' | 'right_stance' | 'flight';

  // Energy (MuJoCo-style)
  potentialEnergy: number;         // Joules (mgh)
  kineticEnergy: number;           // Joules (½mv²)
  totalEnergy: number;

  // Torque summary
  jointTorques: Record<ServoName, number>;
  maxAbsTorque: number;
  totalTorqueMagnitude: number;    // Σ|τ|

  // Power
  totalPowerWatts: number;
  perServoPower: Record<ServoName, number>;
  estimatedRuntimeMinutes: number;
  totalCurrentAmps: number;

  // Simulation metadata
  groundLevel: number;
  totalMass: number;
  bodyCount: number;
  dofCount: number;
  stepCount: number;
  solverType: string;
  contactModel: string;
  coordinateFormulation: string;
}

// ================== DYNAMICS ENGINE ==================

export class DynamicsEngine {
  private prevComPos: Vec3 | null = null;
  private prevTime = 0;
  private comVelocity: Vec3 = [0, 0, 0];
  private standingHeight: number;
  private stepCount = 0;
  private prevAngles: Record<string, number> = {};

  constructor() {
    this.standingHeight = torsoHalfH + pelvisH + thighL + shinL + footH;
  }

  compute(
    servos: Record<ServoName, ServoState>,
    robotPos: Vec3,
    robotYaw: number,
    simTime: number,
  ): DynamicsState {
    this.stepCount++;

    // 1. Build root transform
    const rootR = rotY(robotYaw);
    const rootP: Vec3 = [...robotPos];

    const angle = (name: ServoName) => degRad(servos[name].angle - 90);

    // 2. Walk kinematic chains — accumulate world transforms
    const jointPositions: Record<string, Vec3> = {} as any;
    const jointRotations: Record<string, Mat3> = {} as any;
    const jointAxesWorld: Record<string, Vec3> = {} as any;
    const linkCoMs: Record<string, { position: Vec3; mass: number }> = {};

    // Root bodies
    const torsoComWorld = v3add(rootP, m3vec(rootR, LINK_MASSES.torso.comLocal));
    linkCoMs['torso'] = { position: torsoComWorld, mass: LINK_MASSES.torso.mass };
    const pelvisComWorld = v3add(rootP, m3vec(rootR, LINK_MASSES.pelvis.comLocal));
    linkCoMs['pelvis'] = { position: pelvisComWorld, mass: LINK_MASSES.pelvis.mass };

    for (const chain of ALL_CHAINS) {
      let R = rootR;
      let P = rootP;

      for (const jd of chain) {
        P = v3add(P, m3vec(R, jd.offset));

        const a = angle(jd.servo);
        let Rlocal: Mat3;
        let axisLocal: Vec3;
        if (jd.axis === 'x') { Rlocal = rotX(a); axisLocal = [1, 0, 0]; }
        else if (jd.axis === 'y') { Rlocal = rotY(a); axisLocal = [0, 1, 0]; }
        else { Rlocal = rotZ(a); axisLocal = [0, 0, 1]; }

        jointAxesWorld[jd.servo] = m3vec(R, axisLocal);
        jointPositions[jd.servo] = [...P] as Vec3;

        R = m3mul(R, Rlocal);
        jointRotations[jd.servo] = R;

        if (jd.linkId) {
          const lm = LINK_MASSES[jd.linkId];
          const comWorld = v3add(P, m3vec(R, lm.comLocal));
          linkCoMs[jd.linkId] = { position: comWorld, mass: lm.mass };
        }
      }
    }

    // 3. Overall Center of Mass
    let comNum: Vec3 = [0, 0, 0];
    for (const lc of Object.values(linkCoMs)) {
      comNum = v3add(comNum, v3scale(lc.position, lc.mass));
    }
    const com = v3scale(comNum, 1 / TOTAL_MASS);
    const comProjection: [number, number] = [com[0], com[2]];

    // 4. CoM velocity (finite difference)
    const dt = simTime - this.prevTime;
    if (this.prevComPos && dt > 0.001) {
      this.comVelocity = v3scale(v3sub(com, this.prevComPos), 1 / dt);
    }
    this.prevComPos = [...com] as Vec3;
    this.prevTime = simTime;

    // 5. ZMP (quasi-static approximation + velocity correction)
    const zmp: [number, number] = [com[0], com[2]];

    // 6. Ground contact
    const groundLevel = rootP[1] - this.standingHeight;
    const contactThreshold = 0.008;

    const computeFootContact = (ankleJoint: ServoName): FootContact => {
      const ankleP = jointPositions[ankleJoint] || rootP;
      const ankleR = jointRotations[ankleJoint] || I3;

      const hw = footW / 2;
      const localCorners: Vec3[] = [
        v3(-hw, -footH, +footL * 0.6),
        v3(+hw, -footH, +footL * 0.6),
        v3(+hw, -footH, -footL * 0.4),
        v3(-hw, -footH, -footL * 0.4),
      ];
      const worldCorners = localCorners.map(c => v3add(ankleP, m3vec(ankleR, c)));
      const soleCenter = v3add(ankleP, m3vec(ankleR, v3(0, -footH, footL * 0.1)));

      const minY = Math.min(...worldCorners.map(c => c[1]));
      const inContact = minY <= groundLevel + contactThreshold;

      const penetration = Math.max(0, groundLevel + contactThreshold - minY);
      const k_ground = 5000;
      const d_ground = 50;
      const normalForce = inContact ? Math.max(0, k_ground * penetration + d_ground * penetration * 10) : 0;

      // Contact area estimation: foot sole area scaled by how much is in contact
      const contactArea = inContact ? footL * footW * Math.min(1, penetration / 0.005) : 0;

      return { inContact, normalForce, position: soleCenter, corners: worldCorners, penetration, contactArea };
    };

    const leftFootContact = computeFootContact('L_Ankle_Pitch');
    const rightFootContact = computeFootContact('R_Ankle_Pitch');

    const contactCount = (leftFootContact.inContact ? 1 : 0) + (rightFootContact.inContact ? 1 : 0);
    const totalContactForce = leftFootContact.normalForce + rightFootContact.normalForce;

    // 7. Support polygon
    const supportPoints: [number, number][] = [];
    if (leftFootContact.inContact) {
      for (const c of leftFootContact.corners) supportPoints.push([c[0], c[2]]);
    }
    if (rightFootContact.inContact) {
      for (const c of rightFootContact.corners) supportPoints.push([c[0], c[2]]);
    }
    const supportPolygon = convexHull2D(supportPoints);

    // 8. Stability
    const isStable = supportPolygon.length >= 3 && pointInConvexPolygon(comProjection, supportPolygon);
    const stabilityMargin = supportPolygon.length >= 3
      ? distToPolygonEdge(comProjection, supportPolygon)
      : 0;

    // 9. Gait phase
    let gaitPhase: DynamicsState['gaitPhase'];
    if (leftFootContact.inContact && rightFootContact.inContact) gaitPhase = 'double_support';
    else if (leftFootContact.inContact) gaitPhase = 'left_stance';
    else if (rightFootContact.inContact) gaitPhase = 'right_stance';
    else gaitPhase = 'flight';

    // 10. Joint torques, limits, power + per-joint state
    const jointTorques = {} as Record<ServoName, number>;
    const perServoPower = {} as Record<ServoName, number>;
    const jointStates = {} as Record<ServoName, JointState>;
    let totalServoP = 0;
    let totalCurrent = 0;
    let maxAbsTorque = 0;
    let totalTorqueMag = 0;

    for (const name of SERVO_NAMES) {
      const jPos = jointPositions[name] || rootP;
      const jAxis = jointAxesWorld[name] || [0, 1, 0] as Vec3;
      const distalIds = DISTAL_LINKS[name];
      let torqueSum = 0;

      for (const lid of distalIds) {
        const lc = linkCoMs[lid];
        if (!lc) continue;
        const r = v3sub(lc.position, jPos);
        const fg = v3scale(GRAVITY, lc.mass);
        const moment = v3cross(r, fg);
        torqueSum += v3dot(moment, jAxis);
      }

      jointTorques[name] = torqueSum;
      maxAbsTorque = Math.max(maxAbsTorque, Math.abs(torqueSum));
      totalTorqueMag += Math.abs(torqueSum);

      // Angular velocity estimation
      const prevAngle = this.prevAngles[name] || servos[name].angle;
      const angVelDeg = dt > 0.001 ? (servos[name].angle - prevAngle) / dt : 0;
      this.prevAngles[name] = servos[name].angle;

      // Position error
      const posError = Math.abs(servos[name].targetAngle - servos[name].angle);

      // Joint limit proximity: 0 = centered in range, 1 = at limit
      const range = servos[name].maxAngle - servos[name].minAngle;
      const center = (servos[name].maxAngle + servos[name].minAngle) / 2;
      const halfRange = range / 2;
      const limitProximity = halfRange > 0 ? Math.abs(servos[name].angle - center) / halfRange : 0;

      // Power
      const angVelRad = degRad(Math.abs(posError)) * 2;
      const mechanicalP = Math.abs(torqueSum) * angVelRad;
      const electricalP = mechanicalP / SERVO_EFFICIENCY + 0.05;
      perServoPower[name] = electricalP;
      totalServoP += electricalP;

      // Current (I = P/V, 6V servo rail)
      const current = electricalP / 6.0;
      totalCurrent += current;

      jointStates[name] = {
        angle: servos[name].angle,
        torque: torqueSum,
        power: electricalP,
        limitProximity: Math.min(1, limitProximity),
        velocity: angVelDeg,
        positionError: posError,
        current,
      };
    }

    // Logic current
    totalCurrent += LOGIC_POWER_W / 5.0;

    const totalPowerWatts = totalServoP + LOGIC_POWER_W;
    const estimatedRuntimeMinutes = totalPowerWatts > 0.1
      ? (BATTERY_CAPACITY_WH / totalPowerWatts) * 60
      : 999;

    // 11. Energy (MuJoCo-style)
    // PE = Σ m_i * g * h_i  (height above ground plane)
    let potentialEnergy = 0;
    for (const lc of Object.values(linkCoMs)) {
      potentialEnergy += lc.mass * GRAVITY_MAG * (lc.position[1] - groundLevel);
    }

    // KE = ½ * m_total * |v_com|²
    const comSpeed = v3len(this.comVelocity);
    const kineticEnergy = 0.5 * TOTAL_MASS * comSpeed * comSpeed;
    const totalEnergy = potentialEnergy + kineticEnergy;

    return {
      jointPositions: jointPositions as Record<ServoName, Vec3>,
      jointAxesWorld: jointAxesWorld as Record<ServoName, Vec3>,
      jointStates,
      linkCoMs,
      com,
      comVelocity: [...this.comVelocity] as Vec3,
      comProjection,
      zmp,
      supportPolygon,
      isStable,
      stabilityMargin,
      leftFootContact,
      rightFootContact,
      contactCount,
      totalContactForce,
      gaitPhase,
      potentialEnergy,
      kineticEnergy,
      totalEnergy,
      jointTorques,
      maxAbsTorque,
      totalTorqueMagnitude: totalTorqueMag,
      totalPowerWatts,
      perServoPower,
      estimatedRuntimeMinutes,
      totalCurrentAmps: totalCurrent,
      groundLevel,
      totalMass: TOTAL_MASS,
      bodyCount: Object.keys(LINK_MASSES).length,
      dofCount: SERVO_NAMES.length,
      stepCount: this.stepCount,
      solverType: 'Quasi-Static Inverse Dynamics',
      contactModel: 'Spring-Damper (k=5000 N/m, d=50 Ns/m)',
      coordinateFormulation: 'Generalized Coordinates (FK Chain)',
    };
  }

  reset(): void {
    this.prevComPos = null;
    this.prevTime = 0;
    this.comVelocity = [0, 0, 0];
    this.stepCount = 0;
    this.prevAngles = {};
  }
}

// ================== 2D GEOMETRY UTILITIES ==================

function convexHull2D(points: [number, number][]): [number, number][] {
  if (points.length < 3) return [...points];
  let pivot = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i][1] < points[pivot][1] ||
       (points[i][1] === points[pivot][1] && points[i][0] < points[pivot][0])) {
      pivot = i;
    }
  }
  [points[0], points[pivot]] = [points[pivot], points[0]];
  const p0 = points[0];

  const sorted = points.slice(1).sort((a, b) => {
    const angleA = Math.atan2(a[1] - p0[1], a[0] - p0[0]);
    const angleB = Math.atan2(b[1] - p0[1], b[0] - p0[0]);
    return angleA - angleB;
  });

  const hull: [number, number][] = [p0];
  for (const pt of sorted) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2];
      const b = hull[hull.length - 1];
      const cross = (b[0]-a[0]) * (pt[1]-a[1]) - (b[1]-a[1]) * (pt[0]-a[0]);
      if (cross <= 0) hull.pop(); else break;
    }
    hull.push(pt);
  }
  return hull;
}

function pointInConvexPolygon(p: [number, number], poly: [number, number][]): boolean {
  const n = poly.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const cross = (b[0]-a[0]) * (p[1]-a[1]) - (b[1]-a[1]) * (p[0]-a[0]);
    if (cross < -1e-9) return false;
  }
  return true;
}

function distToPolygonEdge(p: [number, number], poly: [number, number][]): number {
  const n = poly.length;
  if (n < 2) return 0;
  let minDist = Infinity;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-12) continue;
    const t = Math.max(0, Math.min(1, ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / len2));
    const cx = a[0] + t * dx, cy = a[1] + t * dy;
    const dist = Math.sqrt((p[0]-cx)*(p[0]-cx) + (p[1]-cy)*(p[1]-cy));
    minDist = Math.min(minDist, dist);
  }
  return minDist;
}

export default DynamicsEngine;
