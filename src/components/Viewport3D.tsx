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
import { DynamicsState, Vec3 } from '../engine/DynamicsEngine';
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
  dynamicsState?: DynamicsState | null;
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
      const t = THREE.MathUtils.clamp((pt.rssi + 100) / 70, 0, 1);
      const color = new THREE.Color().setHSL(t * 0.33, 0.9, 0.5);
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

// ==========================
// Dynamics Overlays (Phase 5 — Drake/MuJoCo-style)
// ==========================

/** CoM sphere + ground projection line + support polygon */
function DynamicsOverlays({ dynamics, showCoM, showForces }: {
  dynamics: DynamicsState;
  showCoM: boolean;
  showForces: boolean;
}) {
  const comRef = useRef<THREE.Mesh>(null);

  // Pulsing CoM sphere
  useFrame(({ clock }) => {
    if (comRef.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.15;
      comRef.current.scale.setScalar(s);
    }
  });

  const groundY = dynamics.groundLevel + 0.002;

  // Build support polygon shape for ground plane rendering
  const supportShape = useMemo(() => {
    if (dynamics.supportPolygon.length < 3) return null;
    const shape = new THREE.Shape();
    const pts = dynamics.supportPolygon;
    shape.moveTo(pts[0][0], pts[0][1]); // XZ mapped to XY of shape
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i][0], pts[i][1]);
    }
    shape.closePath();
    return shape;
  }, [dynamics.supportPolygon]);

  return (
    <group>
      {/* CoM sphere (yellow, translucent) */}
      {showCoM && (
        <>
          <mesh ref={comRef} position={[dynamics.com[0], dynamics.com[1], dynamics.com[2]]}>
            <sphereGeometry args={[0.012, 16, 16]} />
            <meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.8}
              transparent opacity={0.9} />
          </mesh>
          {/* CoM label */}
          <Text
            position={[dynamics.com[0] + 0.025, dynamics.com[1] + 0.015, dynamics.com[2]]}
            fontSize={0.02} color="#eab308" anchorX="left" anchorY="middle"
          >
            CoM
          </Text>
          {/* Ground projection dashed line */}
          <Line
            points={[
              [dynamics.com[0], dynamics.com[1], dynamics.com[2]],
              [dynamics.com[0], groundY, dynamics.com[2]],
            ]}
            color="#eab308" lineWidth={1} dashed dashScale={50} dashSize={0.01} gapSize={0.008}
          />
          {/* Ground projection dot */}
          <mesh position={[dynamics.com[0], groundY, dynamics.com[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.008, 16]} />
            <meshBasicMaterial color="#eab308" transparent opacity={0.7} />
          </mesh>
        </>
      )}

      {/* Support polygon on ground plane */}
      {showForces && supportShape && (
        <mesh position={[0, groundY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <shapeGeometry args={[supportShape]} />
          <meshBasicMaterial
            color={dynamics.isStable ? '#22c55e' : '#ef4444'}
            transparent opacity={0.15} side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Foot contact patches */}
      {showForces && (
        <>
          {dynamics.leftFootContact.inContact && (
            <mesh position={[dynamics.leftFootContact.position[0], groundY + 0.001, dynamics.leftFootContact.position[2]]}
              rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.055, 0.10]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.25} side={THREE.DoubleSide} />
            </mesh>
          )}
          {dynamics.rightFootContact.inContact && (
            <mesh position={[dynamics.rightFootContact.position[0], groundY + 0.001, dynamics.rightFootContact.position[2]]}
              rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.055, 0.10]} />
              <meshBasicMaterial color="#8b5cf6" transparent opacity={0.25} side={THREE.DoubleSide} />
            </mesh>
          )}
        </>
      )}

      {/* Contact force arrows (vertical lines from ground) */}
      {showForces && dynamics.leftFootContact.inContact && dynamics.leftFootContact.normalForce > 0.1 && (
        <Line
          points={[
            [dynamics.leftFootContact.position[0], groundY, dynamics.leftFootContact.position[2]],
            [dynamics.leftFootContact.position[0], groundY + dynamics.leftFootContact.normalForce * 0.02, dynamics.leftFootContact.position[2]],
          ]}
          color="#3b82f6" lineWidth={2}
        />
      )}
      {showForces && dynamics.rightFootContact.inContact && dynamics.rightFootContact.normalForce > 0.1 && (
        <Line
          points={[
            [dynamics.rightFootContact.position[0], groundY, dynamics.rightFootContact.position[2]],
            [dynamics.rightFootContact.position[0], groundY + dynamics.rightFootContact.normalForce * 0.02, dynamics.rightFootContact.position[2]],
          ]}
          color="#8b5cf6" lineWidth={2}
        />
      )}
    </group>
  );
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
  dynamicsState,
}) => {
  const robotPosition = robotPositionProp ?? [0, 0, 0] as [number, number, number];
  const robotYaw = robotYawProp ?? 0;
  const robotPos: [number, number, number] = robotPosition;

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

        {/* Dynamics Overlays — CoM, support polygon, contact forces */}
        {dynamicsState && (config.showCoM || config.showForces) && (
          <DynamicsOverlays
            dynamics={dynamicsState}
            showCoM={config.showCoM}
            showForces={config.showForces}
          />
        )}

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
