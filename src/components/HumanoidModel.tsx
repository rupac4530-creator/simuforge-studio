import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ServoName, ROBOT_DIMS, HOME_ANGLES } from '../types/simulation';

interface HumanoidModelProps {
  servoAngles: Record<ServoName, number>;
  showColliders?: boolean;
  showCoM?: boolean;
  position?: [number, number, number];
  robotYaw?: number;
}

// Convert servo angle (0-180°) to radians centered on 90° neutral
// Used for hips, knees, ankles, elbows, rolls, head yaw
function servoToRad(angle: number): number {
  return (angle - 90) * (Math.PI / 180);
}

// Shoulder pitch servos have different mounting:
//   R_Shoulder_Pitch: 0°=arm down, 90°=arm forward, 180°=arm up
//   L_Shoulder_Pitch: 180°=arm down, 90°=arm forward, 0°=arm up
function shoulderPitchToRad(angle: number, side: 1 | -1): number {
  if (side === 1) {
    // Right: 0°→0rad(down), 90°→-π/2(forward), 180°→-π(up)
    return -angle * (Math.PI / 180);
  } else {
    // Left: 180°→0rad(down), 90°→-π/2(forward), 0°→-π(up)
    return (angle - 180) * (Math.PI / 180);
  }
}

// Dimensions converted from mm to meters
const D = {
  head: { w: ROBOT_DIMS.head.w / 1000, h: ROBOT_DIMS.head.h / 1000, d: ROBOT_DIMS.head.d / 1000 },
  neck: { h: ROBOT_DIMS.neck.h / 1000, r: 0.015 },
  torso: { w: ROBOT_DIMS.torso.w / 1000, h: ROBOT_DIMS.torso.h / 1000, d: ROBOT_DIMS.torso.d / 1000 },
  pelvis: { w: ROBOT_DIMS.pelvis.w / 1000, h: ROBOT_DIMS.pelvis.h / 1000, d: ROBOT_DIMS.pelvis.d / 1000 },
  upperArm: { w: ROBOT_DIMS.upperArm.w / 1000, l: ROBOT_DIMS.upperArm.length / 1000, d: ROBOT_DIMS.upperArm.d / 1000 },
  forearm: { w: ROBOT_DIMS.forearm.w / 1000, l: ROBOT_DIMS.forearm.length / 1000, d: ROBOT_DIMS.forearm.d / 1000 },
  hand: { w: ROBOT_DIMS.hand.w / 1000, l: ROBOT_DIMS.hand.length / 1000, d: ROBOT_DIMS.hand.d / 1000 },
  thigh: { w: ROBOT_DIMS.thigh.w / 1000, l: ROBOT_DIMS.thigh.length / 1000, d: ROBOT_DIMS.thigh.d / 1000 },
  shin: { w: ROBOT_DIMS.shin.w / 1000, l: ROBOT_DIMS.shin.length / 1000, d: ROBOT_DIMS.shin.d / 1000 },
  foot: { l: ROBOT_DIMS.foot.length / 1000, w: ROBOT_DIMS.foot.w / 1000, h: ROBOT_DIMS.foot.h / 1000 },
};

// Joint sphere radius
const JOINT_R = 0.012;
// Servo indicator cylinder dimensions
const SERVO_R = 0.006;
const SERVO_H = 0.012;

/** Small blue sphere rendered at each joint pivot */
function JointSphere({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[JOINT_R, 16, 16]} />
      <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

/** Small yellow cylinder representing a servo motor */
function ServoIndicator({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation ?? [0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[SERVO_R, SERVO_R, SERVO_H, 12]} />
      <meshStandardMaterial color="#eab308" metalness={0.6} roughness={0.3} />
    </mesh>
  );
}

/** Wireframe collider box overlay */
function ColliderBox({ size, position }: { size: [number, number, number]; position?: [number, number, number] }) {
  return (
    <mesh position={position ?? [0, 0, 0]}>
      <boxGeometry args={size} />
      <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.35} />
    </mesh>
  );
}

const HumanoidModel: React.FC<HumanoidModelProps> = ({
  servoAngles,
  showColliders = false,
  showCoM = false,
  position = [0, 0, 0],
  robotYaw = 0,
}) => {
  // Refs for smooth interpolation
  const currentAngles = useRef<Record<ServoName, number>>({ ...servoAngles });
  const rootRef = useRef<THREE.Group>(null);

  // Smoothly interpolate toward target angles each frame
  useFrame((_state, delta) => {
    const lerpFactor = 1 - Math.pow(0.001, delta);
    for (const key of Object.keys(servoAngles) as ServoName[]) {
      currentAngles.current[key] = THREE.MathUtils.lerp(
        currentAngles.current[key],
        servoAngles[key],
        lerpFactor,
      );
    }
  });

  // Compute standing height so feet rest on y=0.
  // From bottom up: foot_h + shin_l + thigh_l + pelvis_h/2
  const standingHeight =
    D.foot.h + D.shin.l + D.thigh.l + D.pelvis.h / 2;

  // ---------- Materials (memoised) ----------
  const mats = useMemo(() => ({
    torso: new THREE.MeshStandardMaterial({ color: '#2a2d35', metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
    pelvis: new THREE.MeshStandardMaterial({ color: '#22252d', metalness: 0.7, roughness: 0.35, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
    head: new THREE.MeshStandardMaterial({ color: '#3a3d45', metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }),
    arm: new THREE.MeshStandardMaterial({ color: '#1e2028', metalness: 0.7, roughness: 0.3 }),
    leg: new THREE.MeshStandardMaterial({ color: '#1e2028', metalness: 0.7, roughness: 0.3 }),
    hand: new THREE.MeshStandardMaterial({ color: '#404550', metalness: 0.6, roughness: 0.35 }),
    foot: new THREE.MeshStandardMaterial({ color: '#404550', metalness: 0.6, roughness: 0.35 }),
    oled: new THREE.MeshStandardMaterial({ color: '#06b6d4', emissive: '#06b6d4', emissiveIntensity: 1.5, metalness: 0.2, roughness: 0.5 }),
    eye: new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.2 }),
    neck: new THREE.MeshStandardMaterial({ color: '#25282f', metalness: 0.7, roughness: 0.3 }),
    // Inner electronics materials
    pcb: new THREE.MeshStandardMaterial({ color: '#166534', emissive: '#15803d', emissiveIntensity: 0.3, metalness: 0.4, roughness: 0.5 }),
    pcbBlue: new THREE.MeshStandardMaterial({ color: '#1e3a5f', emissive: '#2563eb', emissiveIntensity: 0.2, metalness: 0.5, roughness: 0.4 }),
    battery: new THREE.MeshStandardMaterial({ color: '#1e40af', emissive: '#3b82f6', emissiveIntensity: 0.15, metalness: 0.6, roughness: 0.3 }),
    chip: new THREE.MeshStandardMaterial({ color: '#111827', metalness: 0.8, roughness: 0.2 }),
    wire: new THREE.MeshStandardMaterial({ color: '#ef4444', metalness: 0.5, roughness: 0.4 }),
    wireBlack: new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.5, roughness: 0.4 }),
    wireYellow: new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.5, roughness: 0.4 }),
    connector: new THREE.MeshStandardMaterial({ color: '#f5f5f4', metalness: 0.7, roughness: 0.3 }),
    speaker: new THREE.MeshStandardMaterial({ color: '#374151', metalness: 0.5, roughness: 0.6 }),
    amp: new THREE.MeshStandardMaterial({ color: '#7c2d12', metalness: 0.4, roughness: 0.5 }),
  }), []);

  // Helper: get current servo radians
  const rad = (name: ServoName) => servoToRad(currentAngles.current[name]);

  // ---- Arm builder (side = 1 for right, -1 for left) ----
  const buildArm = (side: 1 | -1) => {
    const prefix = side === 1 ? 'R' : 'L';
    const shoulderPitch: ServoName = `${prefix}_Shoulder_Pitch` as ServoName;
    const shoulderRoll: ServoName = `${prefix}_Shoulder_Roll` as ServoName;
    const elbowPitch: ServoName = `${prefix}_Elbow_Pitch` as ServoName;

    const shoulderX = side * (D.torso.w / 2 + D.upperArm.w / 2);
    const shoulderY = D.torso.h / 2 - 0.01;

    return (
      <group key={`arm_${prefix}`} position={[shoulderX, shoulderY, 0]}>
        {/* Joint sphere at shoulder */}
        <JointSphere position={[0, 0, 0]} />
        <ServoIndicator position={[side * 0.012, 0, 0]} />

        {/* Shoulder Roll group (Z axis) */}
        <group rotation={[0, 0, rad(shoulderRoll) * side]}>
          {/* Shoulder Pitch group (X axis) — uses special shoulder mapping */}
          <group rotation={[shoulderPitchToRad(currentAngles.current[shoulderPitch], side), 0, 0]}>
            {/* Upper arm mesh — hanging down from shoulder */}
            <mesh position={[0, -D.upperArm.l / 2, 0]} material={mats.arm} castShadow>
              <boxGeometry args={[D.upperArm.w, D.upperArm.l, D.upperArm.d]} />
            </mesh>
            {showColliders && <ColliderBox size={[D.upperArm.w, D.upperArm.l, D.upperArm.d]} position={[0, -D.upperArm.l / 2, 0]} />}

            {/* Elbow joint at bottom of upper arm */}
            <group position={[0, -D.upperArm.l, 0]}>
              <JointSphere position={[0, 0, 0]} />
              <ServoIndicator position={[side * 0.01, 0, 0]} />

              {/* Elbow Pitch (X axis) */}
              <group rotation={[rad(elbowPitch), 0, 0]}>
                {/* Forearm */}
                <mesh position={[0, -D.forearm.l / 2, 0]} material={mats.arm} castShadow>
                  <boxGeometry args={[D.forearm.w, D.forearm.l, D.forearm.d]} />
                </mesh>
                {showColliders && <ColliderBox size={[D.forearm.w, D.forearm.l, D.forearm.d]} position={[0, -D.forearm.l / 2, 0]} />}

                {/* Hand at bottom of forearm */}
                <mesh position={[0, -D.forearm.l - D.hand.l / 2, 0]} material={mats.hand} castShadow>
                  <boxGeometry args={[D.hand.w, D.hand.l, D.hand.d]} />
                </mesh>
                {showColliders && <ColliderBox size={[D.hand.w, D.hand.l, D.hand.d]} position={[0, -D.forearm.l - D.hand.l / 2, 0]} />}
              </group>
            </group>
          </group>
        </group>
      </group>
    );
  };

  // ---- Leg builder (side = 1 for right, -1 for left) ----
  const buildLeg = (side: 1 | -1) => {
    const prefix = side === 1 ? 'R' : 'L';
    const hipYaw: ServoName = `${prefix}_Hip_Yaw` as ServoName;
    const hipRoll: ServoName = `${prefix}_Hip_Roll` as ServoName;
    const hipPitch: ServoName = `${prefix}_Hip_Pitch` as ServoName;
    const kneePitch: ServoName = `${prefix}_Knee_Pitch` as ServoName;
    const anklePitch: ServoName = `${prefix}_Ankle_Pitch` as ServoName;

    const hipX = side * (D.pelvis.w / 2 - D.thigh.w / 2);

    return (
      <group key={`leg_${prefix}`} position={[hipX, -D.pelvis.h / 2, 0]}>
        {/* Joint sphere at hip */}
        <JointSphere position={[0, 0, 0]} />
        <ServoIndicator position={[side * 0.014, 0, 0]} />

        {/* Hip Yaw (Y axis) */}
        <group rotation={[0, rad(hipYaw), 0]}>
          {/* Hip Roll (Z axis) */}
          <group rotation={[0, 0, rad(hipRoll) * side]}>
            {/* Hip Pitch (X axis) */}
            <group rotation={[rad(hipPitch), 0, 0]}>
              {/* Thigh */}
              <mesh position={[0, -D.thigh.l / 2, 0]} material={mats.leg} castShadow>
                <boxGeometry args={[D.thigh.w, D.thigh.l, D.thigh.d]} />
              </mesh>
              {showColliders && <ColliderBox size={[D.thigh.w, D.thigh.l, D.thigh.d]} position={[0, -D.thigh.l / 2, 0]} />}

              {/* Knee joint at bottom of thigh */}
              <group position={[0, -D.thigh.l, 0]}>
                <JointSphere position={[0, 0, 0]} />
                <ServoIndicator position={[side * 0.012, 0, 0]} />

                {/* Knee Pitch (X axis) */}
                <group rotation={[rad(kneePitch), 0, 0]}>
                  {/* Shin */}
                  <mesh position={[0, -D.shin.l / 2, 0]} material={mats.leg} castShadow>
                    <boxGeometry args={[D.shin.w, D.shin.l, D.shin.d]} />
                  </mesh>
                  {showColliders && <ColliderBox size={[D.shin.w, D.shin.l, D.shin.d]} position={[0, -D.shin.l / 2, 0]} />}

                  {/* Ankle joint at bottom of shin */}
                  <group position={[0, -D.shin.l, 0]}>
                    <JointSphere position={[0, 0, 0]} />
                    <ServoIndicator position={[side * 0.01, 0, 0]} />

                    {/* Ankle Pitch (X axis) */}
                    <group rotation={[rad(anklePitch), 0, 0]}>
                      {/* Foot — extends forward (positive Z), centred under ankle */}
                      <mesh position={[0, -D.foot.h / 2, D.foot.l * 0.2]} material={mats.foot} castShadow>
                        <boxGeometry args={[D.foot.w, D.foot.h, D.foot.l]} />
                      </mesh>
                      {showColliders && <ColliderBox size={[D.foot.w, D.foot.h, D.foot.l]} position={[0, -D.foot.h / 2, D.foot.l * 0.2]} />}
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    );
  };

  // Torso center Y is standing height above ground
  const torsoCenterY = standingHeight + D.torso.h / 2;

  // Centre of mass estimate (simple geometric average)
  const comY = standingHeight * 0.55;

  return (
    <group ref={rootRef} position={position} rotation={[0, robotYaw, 0]}>
      {/* Root positioned so feet sit on y=0 */}
      <group position={[0, torsoCenterY, 0]}>
        {/* ===== TORSO ===== */}
        <mesh material={mats.torso} castShadow receiveShadow>
          <boxGeometry args={[D.torso.w, D.torso.h, D.torso.d]} />
        </mesh>
        {showColliders && <ColliderBox size={[D.torso.w, D.torso.h, D.torso.d]} />}

        {/* ===== INNER ELECTRONICS (visible through transparent torso) ===== */}
        <group>
          {/* ESP32 DevKit V1 — main controller PCB (green board) */}
          <mesh position={[0, D.torso.h * 0.18, D.torso.d * 0.15]} material={mats.pcb}>
            <boxGeometry args={[0.028, 0.055, 0.003]} />
          </mesh>
          {/* ESP32 chip on PCB */}
          <mesh position={[0, D.torso.h * 0.2, D.torso.d * 0.15 + 0.003]} material={mats.chip}>
            <boxGeometry args={[0.012, 0.012, 0.002]} />
          </mesh>
          {/* USB connector on ESP32 */}
          <mesh position={[0, D.torso.h * 0.18 + 0.03, D.torso.d * 0.15]} material={mats.connector}>
            <boxGeometry args={[0.008, 0.004, 0.006]} />
          </mesh>

          {/* PCA9685 #1 (0x40) — left side servo driver */}
          <mesh position={[-D.torso.w * 0.22, -D.torso.h * 0.05, 0]} material={mats.pcbBlue}>
            <boxGeometry args={[0.025, 0.06, 0.003]} />
          </mesh>
          {/* IC chip on PCA9685 #1 */}
          <mesh position={[-D.torso.w * 0.22, -D.torso.h * 0.03, 0.003]} material={mats.chip}>
            <boxGeometry args={[0.008, 0.008, 0.0015]} />
          </mesh>

          {/* PCA9685 #2 (0x41) — right side servo driver */}
          <mesh position={[D.torso.w * 0.22, -D.torso.h * 0.05, 0]} material={mats.pcbBlue}>
            <boxGeometry args={[0.025, 0.06, 0.003]} />
          </mesh>
          {/* IC chip on PCA9685 #2 */}
          <mesh position={[D.torso.w * 0.22, -D.torso.h * 0.03, 0.003]} material={mats.chip}>
            <boxGeometry args={[0.008, 0.008, 0.0015]} />
          </mesh>

          {/* 2S 7.4V Li-Ion Battery Pack (blue block in pelvis area) */}
          <mesh position={[0, -D.torso.h * 0.32, 0]} material={mats.battery}>
            <boxGeometry args={[0.04, 0.024, 0.02]} />
          </mesh>
          {/* Battery label / voltage indicator */}
          <mesh position={[0, -D.torso.h * 0.32, 0.012]} material={mats.connector}>
            <boxGeometry args={[0.015, 0.006, 0.001]} />
          </mesh>

          {/* BEC (Buck Converter 6V) — small green PCB */}
          <mesh position={[D.torso.w * 0.15, D.torso.h * 0.3, -D.torso.d * 0.1]} material={mats.pcb}>
            <boxGeometry args={[0.015, 0.012, 0.005]} />
          </mesh>

          {/* 5V Buck Converter for ESP32 */}
          <mesh position={[-D.torso.w * 0.15, D.torso.h * 0.3, -D.torso.d * 0.1]} material={mats.pcb}>
            <boxGeometry args={[0.012, 0.012, 0.005]} />
          </mesh>

          {/* MAX98357A I2S Amplifier (small brown PCB) */}
          <mesh position={[D.torso.w * 0.1, D.torso.h * 0.35, D.torso.d * 0.15]} material={mats.amp}>
            <boxGeometry args={[0.014, 0.014, 0.003]} />
          </mesh>

          {/* Speaker (behind head, inside upper torso) */}
          <mesh position={[0, D.torso.h * 0.38, -D.torso.d * 0.05]} material={mats.speaker}>
            <cylinderGeometry args={[0.012, 0.012, 0.006, 16]} />
          </mesh>
          {/* Speaker cone */}
          <mesh position={[0, D.torso.h * 0.38, -D.torso.d * 0.05 + 0.004]} material={mats.chip}>
            <cylinderGeometry args={[0.008, 0.01, 0.002, 16]} />
          </mesh>

          {/* I2C Wiring — red/black pairs between ESP32 and PCA boards */}
          {/* Wire from ESP32 to PCA #1 */}
          <mesh position={[-D.torso.w * 0.11, D.torso.h * 0.06, D.torso.d * 0.08]} rotation={[0, 0, 0.4]} material={mats.wire}>
            <cylinderGeometry args={[0.001, 0.001, 0.04, 6]} />
          </mesh>
          <mesh position={[-D.torso.w * 0.11, D.torso.h * 0.06, D.torso.d * 0.075]} rotation={[0, 0, 0.4]} material={mats.wireBlack}>
            <cylinderGeometry args={[0.001, 0.001, 0.04, 6]} />
          </mesh>
          {/* Wire from ESP32 to PCA #2 */}
          <mesh position={[D.torso.w * 0.11, D.torso.h * 0.06, D.torso.d * 0.08]} rotation={[0, 0, -0.4]} material={mats.wire}>
            <cylinderGeometry args={[0.001, 0.001, 0.04, 6]} />
          </mesh>
          <mesh position={[D.torso.w * 0.11, D.torso.h * 0.06, D.torso.d * 0.075]} rotation={[0, 0, -0.4]} material={mats.wireBlack}>
            <cylinderGeometry args={[0.001, 0.001, 0.04, 6]} />
          </mesh>
          {/* Power wires from battery to BECs */}
          <mesh position={[D.torso.w * 0.08, -D.torso.h * 0.01, -D.torso.d * 0.05]} rotation={[0.3, 0, 0.8]} material={mats.wire}>
            <cylinderGeometry args={[0.0012, 0.0012, 0.06, 6]} />
          </mesh>
          <mesh position={[-D.torso.w * 0.08, -D.torso.h * 0.01, -D.torso.d * 0.05]} rotation={[0.3, 0, -0.8]} material={mats.wireBlack}>
            <cylinderGeometry args={[0.0012, 0.0012, 0.06, 6]} />
          </mesh>
          {/* I2S data wire to amp (yellow) */}
          <mesh position={[D.torso.w * 0.05, D.torso.h * 0.27, D.torso.d * 0.15]} rotation={[0, 0, 0.3]} material={mats.wireYellow}>
            <cylinderGeometry args={[0.0008, 0.0008, 0.03, 6]} />
          </mesh>
        </group>

        {/* ===== PELVIS (below torso) ===== */}
        <group position={[0, -(D.torso.h / 2 + D.pelvis.h / 2), 0]}>
          <mesh material={mats.pelvis} castShadow>
            <boxGeometry args={[D.pelvis.w, D.pelvis.h, D.pelvis.d]} />
          </mesh>
          {showColliders && <ColliderBox size={[D.pelvis.w, D.pelvis.h, D.pelvis.d]} />}

          {/* ===== LEGS ===== */}
          {buildLeg(1)}
          {buildLeg(-1)}
        </group>

        {/* ===== NECK + HEAD ===== */}
        <group position={[0, D.torso.h / 2 + D.neck.h / 2, 0]}>
          {/* Neck cylinder */}
          <mesh material={mats.neck} castShadow>
            <cylinderGeometry args={[D.neck.r, D.neck.r, D.neck.h, 16]} />
          </mesh>

          {/* Head Yaw pivot at top of neck */}
          <group position={[0, D.neck.h / 2, 0]}>
            <JointSphere position={[0, 0, 0]} />
            <ServoIndicator position={[0, 0, 0.015]} rotation={[Math.PI / 2, 0, 0]} />

            <group rotation={[0, rad('Head_Yaw'), 0]}>
              {/* Head box */}
              <mesh position={[0, D.head.h / 2, 0]} material={mats.head} castShadow>
                <boxGeometry args={[D.head.w, D.head.h, D.head.d]} />
              </mesh>
              {showColliders && <ColliderBox size={[D.head.w, D.head.h, D.head.d]} position={[0, D.head.h / 2, 0]} />}

              {/* OLED display on front face */}
              <mesh position={[0, D.head.h / 2, D.head.d / 2 + 0.001]}>
                <planeGeometry args={[0.03, 0.02]} />
                <meshStandardMaterial
                  color="#06b6d4"
                  emissive="#06b6d4"
                  emissiveIntensity={2.0}
                  metalness={0.2}
                  roughness={0.5}
                  side={THREE.FrontSide}
                />
              </mesh>

              {/* Ultrasonic sensor "eyes" */}
              <mesh position={[-0.015, D.head.h * 0.65, D.head.d / 2 + 0.001]}>
                <circleGeometry args={[0.006, 20]} />
                <meshStandardMaterial {...mats.eye} side={THREE.FrontSide} />
              </mesh>
              <mesh position={[0.015, D.head.h * 0.65, D.head.d / 2 + 0.001]}>
                <circleGeometry args={[0.006, 20]} />
                <meshStandardMaterial {...mats.eye} side={THREE.FrontSide} />
              </mesh>
            </group>
          </group>
        </group>

        {/* ===== ARMS ===== */}
        {buildArm(1)}
        {buildArm(-1)}
      </group>

      {/* ===== Center of Mass indicator ===== */}
      {showCoM && (
        <mesh position={[0, comY, 0]}>
          <sphereGeometry args={[0.015, 16, 16]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.2} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
};

export default HumanoidModel;
