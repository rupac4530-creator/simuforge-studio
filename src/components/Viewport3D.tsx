import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Environment,
  PerspectiveCamera,
  OrthographicCamera,
  Stats,
  GizmoHelper,
  GizmoViewport,
  Text,
  Line,
} from '@react-three/drei';
import { ServoName, CameraPreset, SimulationConfig, ROBOT_DIMS } from '../types/simulation';
import HumanoidModel from './HumanoidModel';

// ==========================
// Props
// ==========================
interface Viewport3DProps {
  servoAngles: Record<ServoName, number>;
  config: SimulationConfig;
  cameraPreset: CameraPreset;
  cameraHeight: number;
  cameraPitch: number;
  cameraYaw: number;
  cameraFov: number;
  baseStationPos: [number, number, number];
  robotPosition?: [number, number, number];
  robotYaw?: number;
  rfHeatmapData?: { position: [number, number]; rssi: number }[];
}

// ==========================
// Arena obstacle definition
// ==========================
interface Obstacle {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  material: string;
}

const OBSTACLES: Obstacle[] = [
  { position: [2.5, 0.75, 0], size: [0.3, 1.5, 2.0], color: '#6b7280', material: 'Concrete' },
  { position: [-2.0, 0.75, 1.5], size: [2.0, 1.5, 0.3], color: '#92400e', material: 'Brick' },
  { position: [0, 0.75, 2.5], size: [2.0, 1.5, 0.1], color: '#93c5fd', material: 'Glass' },
  { position: [-1.5, 0.5, -2.0], size: [1.0, 1.0, 1.0], color: '#71717a', material: 'Metal' },
];

// ==========================
// Sub-components rendered INSIDE the Canvas
// ==========================

/** Ground plane that receives shadows */
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#0d1117" metalness={0.1} roughness={0.9} />
    </mesh>
  );
}

/** Arena obstacle boxes with floating label */
function ArenaObstacles() {
  return (
    <group>
      {OBSTACLES.map((ob, i) => (
        <group key={i} position={ob.position}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={ob.size} />
            <meshStandardMaterial
              color={ob.color}
              metalness={ob.material === 'Metal' ? 0.9 : ob.material === 'Glass' ? 0.3 : 0.4}
              roughness={ob.material === 'Glass' ? 0.1 : 0.6}
              transparent={ob.material === 'Glass'}
              opacity={ob.material === 'Glass' ? 0.35 : 1}
            />
          </mesh>
          {/* Material label */}
          <Text
            position={[0, ob.size[1] / 2 + 0.15, 0]}
            fontSize={0.12}
            color="#94a3b8"
            anchorX="center"
            anchorY="bottom"
          >
            {ob.material}
          </Text>
        </group>
      ))}
    </group>
  );
}

/** Base station: pole + blinking blue sphere */
function BaseStation({ position }: { position: [number, number, number] }) {
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (sphereRef.current) {
      const mat = sphereRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.6 + Math.sin(clock.getElapsedTime() * 4) * 0.4;
    }
  });

  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.03, 1.5, 12]} />
        <meshStandardMaterial color="#4b5563" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Blinking sphere */}
      <mesh ref={sphereRef} position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.06, 20, 20]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1} metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Label */}
      <Text position={[0, 1.75, 0]} fontSize={0.1} color="#60a5fa" anchorX="center" anchorY="bottom">
        Base Station
      </Text>
    </group>
  );
}

/** Line-of-sight ray from base station to robot */
function LOSRay({ from, to, obstructed }: { from: [number, number, number]; to: [number, number, number]; obstructed: boolean }) {
  return (
    <Line
      points={[from, to]}
      color={obstructed ? '#ef4444' : '#22c55e'}
      lineWidth={1.5}
      dashed
      dashScale={20}
      dashSize={0.15}
      gapSize={0.08}
    />
  );
}

/** RF Heatmap rendered as colored dots on the ground */
function RFHeatmap({ data }: { data: { position: [number, number]; rssi: number }[] }) {
  const meshes = useMemo(() => {
    return data.map((pt, i) => {
      // Map rssi (-100 to -30) → 0 to 1
      const t = THREE.MathUtils.clamp((pt.rssi + 100) / 70, 0, 1);
      const color = new THREE.Color().setHSL(t * 0.33, 0.9, 0.5); // red→green
      return (
        <mesh key={i} position={[pt.position[0], 0.005, pt.position[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.15, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} />
        </mesh>
      );
    });
  }, [data]);

  return <group>{meshes}</group>;
}

/** Check simple AABB ray–box intersection for LOS obstruction */
function isLOSObstructed(from: THREE.Vector3, to: THREE.Vector3): boolean {
  const dir = new THREE.Vector3().subVectors(to, from);
  const ray = new THREE.Ray(from, dir.clone().normalize());
  const len = dir.length();

  for (const ob of OBSTACLES) {
    const halfSize = new THREE.Vector3(ob.size[0] / 2, ob.size[1] / 2, ob.size[2] / 2);
    const box = new THREE.Box3(
      new THREE.Vector3(ob.position[0] - halfSize.x, ob.position[1] - halfSize.y, ob.position[2] - halfSize.z),
      new THREE.Vector3(ob.position[0] + halfSize.x, ob.position[1] + halfSize.y, ob.position[2] + halfSize.z),
    );
    const hit = new THREE.Vector3();
    if (ray.intersectBox(box, hit)) {
      if (hit.distanceTo(from) < len) return true;
    }
  }
  return false;
}

/** Manages camera presets and orbit controls together */
function CameraRig({
  preset,
  height,
  pitch,
  yaw,
  fov,
}: {
  preset: CameraPreset;
  height: number;
  pitch: number;
  yaw: number;
  fov: number;
}) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  // Robot approximate head position for FPV
  const robotHeadY = (ROBOT_DIMS.foot.h + ROBOT_DIMS.shin.length + ROBOT_DIMS.thigh.length + ROBOT_DIMS.pelvis.h + ROBOT_DIMS.torso.h + ROBOT_DIMS.neck.h + ROBOT_DIMS.head.h) / 1000;

  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    switch (preset) {
      case 'orbit':
        controls.enabled = true;
        break;
      case 'top':
        controls.enabled = false;
        camera.position.set(0, 5, 0.001);
        camera.lookAt(0, 0, 0);
        break;
      case 'iso':
        controls.enabled = true;
        camera.position.set(2, 2, 2);
        camera.lookAt(0, 0.2, 0);
        controls.target.set(0, 0.2, 0);
        controls.update();
        break;
      case 'chase':
        controls.enabled = false;
        camera.position.set(0, 0.5, -1.5);
        camera.lookAt(0, 0.25, 0);
        break;
      case 'side':
        controls.enabled = false;
        camera.position.set(2, 0.3, 0);
        camera.lookAt(0, 0.2, 0);
        break;
      case 'fpv':
        controls.enabled = false;
        camera.position.set(0, robotHeadY, 0.035);
        camera.lookAt(0, robotHeadY, 2);
        break;
    }
  }, [preset, camera, robotHeadY]);

  // For free-form camera control with sliders in orbit mode
  useEffect(() => {
    if (preset !== 'orbit' || !controlsRef.current) return;
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;
    const dist = height / Math.max(Math.sin(Math.max(Math.abs(pitchRad), 0.1)), 0.1);
    const adjustedDist = Math.min(dist, 10);

    camera.position.set(
      adjustedDist * Math.cos(pitchRad) * Math.sin(yawRad),
      height,
      adjustedDist * Math.cos(pitchRad) * Math.cos(yawRad),
    );
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    controlsRef.current.target.set(0, 0.2, 0);
    controlsRef.current.update();
  }, [height, pitch, yaw, fov, preset, camera]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[1.5, 1.2, 1.5]} fov={fov} near={0.01} far={100} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={0.3}
        maxDistance={15}
        target={[0, 0.2, 0]}
      />
    </>
  );
}

// ==========================
// Main Viewport component
// ==========================
const Viewport3D: React.FC<Viewport3DProps> = ({
  servoAngles,
  config,
  cameraPreset,
  cameraHeight,
  cameraPitch,
  cameraYaw,
  cameraFov,
  baseStationPos,
  robotPosition: robotPositionProp,
  robotYaw: robotYawProp,
  rfHeatmapData,
}) => {
  const robotPosition = robotPositionProp ?? [0, 0, 0] as [number, number, number];
  const robotYaw = robotYawProp ?? 0;
  // Robot world position (from kinematics engine)
  const robotPos: [number, number, number] = robotPosition;

  // Approx robot center for LOS
  const robotCenterY = ROBOT_DIMS.totalHeight / 2000;
  const losFrom = new THREE.Vector3(baseStationPos[0], baseStationPos[1] + 1.55, baseStationPos[2]);
  const losTo = new THREE.Vector3(robotPos[0], robotCenterY, robotPos[2]);
  const obstructed = isLOSObstructed(losFrom, losTo);

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        style={{ background: '#0a0e17' }}
      >
        {/* Camera rig */}
        <CameraRig preset={cameraPreset} height={cameraHeight} pitch={cameraPitch} yaw={cameraYaw} fov={cameraFov} />

        {/* Lighting */}
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[5, 8, 3]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
          shadow-camera-near={0.1}
          shadow-camera-far={20}
        />
        <directionalLight position={[-3, 4, -2]} intensity={0.3} />
        <pointLight position={[0, 3, 0]} intensity={0.2} />

        {/* Environment for reflections */}
        <Environment preset="city" />

        {/* Ground */}
        <GroundPlane />

        {/* Grid overlay */}
        {config.showGrid && (
          <Grid
            args={[10, 10]}
            position={[0, 0.001, 0]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#1e293b"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#334155"
            fadeDistance={12}
            fadeStrength={1}
            infiniteGrid
          />
        )}

        {/* Robot */}
        <HumanoidModel
          servoAngles={servoAngles}
          showColliders={config.showColliders}
          showCoM={config.showCoM}
          position={robotPos}
          robotYaw={robotYaw}
        />

        {/* Arena obstacles */}
        <ArenaObstacles />

        {/* Base station */}
        <BaseStation position={baseStationPos} />

        {/* LOS Ray */}
        <LOSRay
          from={[losFrom.x, losFrom.y, losFrom.z]}
          to={[losTo.x, losTo.y, losTo.z]}
          obstructed={obstructed}
        />

        {/* RF Heatmap overlay */}
        {config.showRFHeatmap && rfHeatmapData && rfHeatmapData.length > 0 && (
          <RFHeatmap data={rfHeatmapData} />
        )}

        {/* Orientation gizmo */}
        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="#e2e8f0" />
        </GizmoHelper>

        {/* FPS Stats */}
        <Stats className="!absolute !left-2 !top-2" />
      </Canvas>
    </div>
  );
};

export default Viewport3D;
