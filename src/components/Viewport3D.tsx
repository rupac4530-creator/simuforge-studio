// ============================================================
// SimuForge Studio — 180 cm Biomimetic Humanoid 3D Viewport
// Studio Rim Lighting, Laboratory Calibration Grid
// Camera Quick-Focus Presets & 3D Gaze Target Interaction
// ============================================================

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { BiomimeticHumanoidModel } from './BiomimeticHumanoidModel';
import {
  LayerOpacityState, EyeballOpticsState, FACSState,
  Selectable3DPart, SiliconeMaterialId
} from '../types/biomimetic';
import {
  User, Eye, Sparkles, Cpu, Hand, Target, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';

export type CameraPresetFocus = 'full_body' | 'head_face' | 'left_eye_macro' | 'thorax_core' | 'hand_dexterous';

interface Viewport3DProps {
  layers: LayerOpacityState;
  optics: EyeballOpticsState;
  facs: FACSState;
  siliconeId: SiliconeMaterialId;
  selectedPartId: string | null;
  onSelectPart: (part: Selectable3DPart) => void;
  eyeballShellOpacity: number;
  onChangeEyeballShellOpacity: (val: number) => void;
  focusedPartTarget: [number, number, number] | null;
  onTriggerEyeballMacroPreset?: () => void;
}

// ============================================================
// CAMERA RIG WITH SMOOTH TARGET TWEENING & LOGARITHMIC BUFFER
// ============================================================
function CameraRig({
  focusPreset,
  focusedPartTarget,
  controlsRef,
}: {
  focusPreset: CameraPresetFocus;
  focusedPartTarget: [number, number, number] | null;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    // Configure camera near/far for sub-millimeter optics zoom
    camera.near = 0.0005; // 0.5 mm near plane
    camera.far = 50.0;
    camera.updateProjectionMatrix();
  }, [camera]);

  // Target positions based on presets
  const presetConfigs: Record<CameraPresetFocus, { camPos: [number, number, number]; lookAt: [number, number, number] }> = {
    full_body: {
      camPos: [0, 1.15, 3.2],
      lookAt: [0, 0.95, 0],
    },
    head_face: {
      camPos: [0, 1.68, 0.45],
      lookAt: [0, 1.68, 0.06],
    },
    left_eye_macro: {
      // 4 cm from the left eyeball pupil (looking straight through cornea & iris!)
      camPos: [-0.032, 1.68, 0.155],
      lookAt: [-0.032, 1.68, 0.09],
    },
    thorax_core: {
      camPos: [0, 1.35, 0.75],
      lookAt: [0, 1.30, 0],
    },
    hand_dexterous: {
      camPos: [-0.28, 0.95, 0.40],
      lookAt: [-0.28, 0.88, 0],
    },
  };

  useEffect(() => {
    if (!controlsRef.current) return;
    const cfg = presetConfigs[focusPreset];

    // Smoothly fly camera to preset
    camera.position.set(...cfg.camPos);
    controlsRef.current.target.set(...cfg.lookAt);
    controlsRef.current.update();
  }, [focusPreset, camera, controlsRef]);

  // Fly to custom part target if clicked in scene tree
  useEffect(() => {
    if (!focusedPartTarget || !controlsRef.current) return;

    const [tx, ty, tz] = focusedPartTarget;
    // Offset camera slightly in front of the target
    const dist = focusPreset === 'left_eye_macro' ? 0.06 : 0.45;
    camera.position.set(tx, ty + 0.02, tz + dist);
    controlsRef.current.target.set(tx, ty, tz);
    controlsRef.current.update();
  }, [focusedPartTarget, camera, controlsRef, focusPreset]);

  return null;
}

// ============================================================
// LABORATORY SURGICAL CALIBRATION GRID & RIM LIGHTING
// ============================================================
function LaboratoryFloor() {
  return (
    <group position={[0, -0.001, 0]}>
      {/* Matte Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial
          color="#070b12"
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Metric Calibration Grid */}
      <Grid
        args={[16, 16]}
        position={[0, 0.001, 0]}
        cellSize={0.1} // 10 cm subgrid
        cellThickness={0.5}
        cellColor="#1e293b"
        sectionSize={1.0} // 1.0 m major grid lines
        sectionThickness={1.2}
        sectionColor="#06b6d4"
        fadeDistance={14}
        fadeStrength={1.2}
        infiniteGrid
      />
    </group>
  );
}

// ============================================================
// INTERACTIVE DRAGGABLE 3D GAZE TARGET SPHERE
// ============================================================
function DraggableGazeTarget({
  targetPos,
  onMoveTarget,
}: {
  targetPos: [number, number, number];
  onMoveTarget: (pos: [number, number, number]) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.position.y = targetPos[1] + Math.sin(t * 1.8) * 0.02;
    }
  });

  return (
    <group position={targetPos}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.024, 24, 24]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#0891b2"
          emissiveIntensity={1.8}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>
      {/* Reticle Ring */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[0.032, 0.036, 32]} />
        <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ============================================================
// MAIN VIEWPORT COMPONENT
// ============================================================
export const Viewport3D: React.FC<Viewport3DProps> = ({
  layers,
  optics,
  facs,
  siliconeId,
  selectedPartId,
  onSelectPart,
  eyeballShellOpacity,
  onChangeEyeballShellOpacity,
  focusedPartTarget,
  onTriggerEyeballMacroPreset,
}) => {
  const [focusPreset, setFocusPreset] = useState<CameraPresetFocus>('full_body');
  const [showGazeTarget, setShowGazeTarget] = useState(false);
  const [gazeTargetPos, setGazeTargetPos] = useState<[number, number, number]>([0, 1.68, 0.85]);
  const controlsRef = useRef<any>(null);

  const handleSelectPreset = (preset: CameraPresetFocus) => {
    setFocusPreset(preset);

    // If user clicked the Macro 24mm Eyeball Cutaway preset:
    if (preset === 'left_eye_macro') {
      // Auto-peel sclera shell so internal 8x8mm PCB and iris blades are 100% visible
      onChangeEyeballShellOpacity(0.18);
      if (onTriggerEyeballMacroPreset) onTriggerEyeballMacroPreset();
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0a0e17] overflow-hidden select-none">
      {/* ======================================================== */}
      {/* TOP VIEWPORT TOOLBAR: 1-CLICK CAMERA FOCUS PRESETS       */}
      {/* ======================================================== */}
      <div className="absolute top-2 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-1.5 bg-[#111827]/90 backdrop-blur-md p-1 rounded-lg border border-slate-700/80 shadow-2xl pointer-events-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 border-r border-slate-700">
            Camera Focus
          </span>

          <button
            onClick={() => handleSelectPreset('full_body')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
              focusPreset === 'full_body'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <User className="w-3 h-3" />
            <span>1. Full 180cm Body</span>
          </button>

          <button
            onClick={() => handleSelectPreset('head_face')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
              focusPreset === 'head_face'
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>2. Head & 32-DoF Face</span>
          </button>

          <button
            onClick={() => handleSelectPreset('left_eye_macro')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
              focusPreset === 'left_eye_macro'
                ? 'bg-emerald-600/40 text-emerald-300 border border-emerald-500/60 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
            }`}
            title="Macro zoom to 4cm from left eye with cutaway into iris blades & 8x8mm PCB"
          >
            <Eye className="w-3 h-3 text-emerald-400" />
            <span>3. Macro: 24mm Eyeball Cutaway</span>
          </button>

          <button
            onClick={() => handleSelectPreset('thorax_core')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
              focusPreset === 'thorax_core'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>4. Thorax & Heart Pump</span>
          </button>

          <button
            onClick={() => handleSelectPreset('hand_dexterous')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
              focusPreset === 'hand_dexterous'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Hand className="w-3 h-3" />
            <span>5. 24-DoF Hand</span>
          </button>
        </div>

        {/* Gaze Target Toggle */}
        <div className="flex items-center space-x-2 bg-[#111827]/90 backdrop-blur-md p-1 rounded-lg border border-slate-700/80 shadow-2xl pointer-events-auto">
          <button
            onClick={() => setShowGazeTarget(!showGazeTarget)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
              showGazeTarget
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Target className="w-3 h-3" />
            <span>3D Gaze Target Tracking</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3D WEBGL CANVAS WITH STUDIO RIM LIGHTING                 */}
      {/* ======================================================== */}
      <Canvas
        shadows
        gl={{
          antialias: true,
          logarithmicDepthBuffer: true, // Prevents Z-fighting from 1.8m down to 0.5mm
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        style={{ background: '#0a0e17' }}
      >
        <CameraRig
          focusPreset={focusPreset}
          focusedPartTarget={focusedPartTarget}
          controlsRef={controlsRef}
        />

        {/* Orbit Controls with micro-zoom limits */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.06}
          minDistance={0.025} // Allows zooming inside eyeball socket
          maxDistance={12.0}
        />

        {/* Studio Rim & Surgical Key Lighting */}
        <ambientLight intensity={0.45} />
        {/* Surgical Key Light */}
        <directionalLight
          position={[3, 5, 4]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        {/* Blue Rim Backlight */}
        <directionalLight
          position={[-4, 4, -3]}
          intensity={1.2}
          color="#38bdf8"
        />
        {/* Warm Fill Light */}
        <directionalLight
          position={[4, -1, 2]}
          intensity={0.5}
          color="#fef08a"
        />

        {/* Calibration Ground Grid */}
        <LaboratoryFloor />

        {/* 180 cm Biomimetic Humanoid Model */}
        <BiomimeticHumanoidModel
          layers={layers}
          optics={optics}
          facs={facs}
          siliconeId={siliconeId}
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
          eyeballShellOpacity={eyeballShellOpacity}
          gazeTargetPos={showGazeTarget ? gazeTargetPos : null}
        />

        {/* Draggable Gaze Target Sphere */}
        {showGazeTarget && (
          <DraggableGazeTarget
            targetPos={gazeTargetPos}
            onMoveTarget={setGazeTargetPos}
          />
        )}
      </Canvas>
    </div>
  );
};

export default Viewport3D;