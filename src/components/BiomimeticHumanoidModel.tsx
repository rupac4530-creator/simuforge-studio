// ============================================================
// SimuForge Studio — 180 cm Biomimetic Humanoid 3D Model
// 4-Layer Concentric Anatomical Architecture & 24 mm Bionic Eyeballs
// Layer 1: Silicone Dermis, Hair, Taxels
// Layer 2: 32-DoF FACS Bowden Cables, McKibben Hydro-Muscles, QDDs
// Layer 3: 7075-T6 Skeleton, 24-Vertebrae Spine, Coolant Capillaries
// Layer 4: 24 mm Dual Eyeballs, 6-Blade Iris, 8x8mm Camera PCB, Orin Brain, 16S Pack
// ============================================================

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  LayerOpacityState, EyeballOpticsState, FACSState,
  Selectable3DPart, SiliconeMaterialId
} from '../types/biomimetic';
import { SILICONE_REGISTRY, CAMERA_REGISTRY } from '../engine/ComponentRegistry';

interface BiomimeticHumanoidModelProps {
  layers: LayerOpacityState;
  optics: EyeballOpticsState;
  facs: FACSState;
  siliconeId: SiliconeMaterialId;
  selectedPartId: string | null;
  onSelectPart?: (part: Selectable3DPart) => void;
  position?: [number, number, number];
  robotYaw?: number;
}

export const BiomimeticHumanoidModel: React.FC<BiomimeticHumanoidModelProps> = ({
  layers,
  optics,
  facs,
  siliconeId,
  selectedPartId,
  onSelectPart,
  position = [0, 0, 0],
  robotYaw = 0,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const leftIrisRef = useRef<THREE.Group>(null);
  const rightIrisRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Group>(null);

  const activeSilicone = SILICONE_REGISTRY[siliconeId] || SILICONE_REGISTRY.ecoflex_0010;
  const activeCamera = CAMERA_REGISTRY[optics.selectedCameraId] || CAMERA_REGISTRY.imx219;

  // 180 cm anatomical height proportions (in meters)
  const H = {
    head: 0.24,
    neck: 0.10,
    torso: 0.52,
    pelvis: 0.16,
    thigh: 0.44,
    shin: 0.42,
    footH: 0.08,
    footL: 0.26,
    footW: 0.10,
    shoulderWidth: 0.44,
    armL: 0.32,
    forearmL: 0.28,
    handL: 0.18,
  };

  const standingCenterY = H.footH + H.shin + H.thigh + H.pelvis + H.torso * 0.5;

  // Dynamic eye tracking and vergence computation
  useFrame(() => {
    // Left & Right vergence yaw: crossing inward when tracking near targets
    const vergenceInwardYawRad = (optics.leftEyeYawDeg * Math.PI) / 180;
    const pitchRad = (optics.coupledPitchDeg * Math.PI) / 180;

    if (leftEyeRef.current) {
      leftEyeRef.current.rotation.y = vergenceInwardYawRad; // Inward to right
      leftEyeRef.current.rotation.x = pitchRad;
    }
    if (rightEyeRef.current) {
      rightEyeRef.current.rotation.y = -vergenceInwardYawRad; // Inward to left
      rightEyeRef.current.rotation.x = pitchRad;
    }

    // Nitinol Iris 6-blade aperture scaling (2.0 mm to 7.0 mm diameter)
    const irisScale = Math.max(0.4, Math.min(1.4, optics.pupilApertureMm / 5.0));
    if (leftIrisRef.current) leftIrisRef.current.scale.set(irisScale, irisScale, 1.0);
    if (rightIrisRef.current) rightIrisRef.current.scale.set(irisScale, irisScale, 1.0);

    // Jaw TMJ 4-bar linkage drop driven by FACS AU26
    if (jawRef.current) {
      jawRef.current.rotation.x = facs.au26_jawDrop * 0.28; // up to ~16 degrees drop
    }
  });

  // ============================================================
  // PBR MATERIALS WITH LAYER OPACITY
  // ============================================================
  const mats = useMemo(() => {
    const isXray = layers.xrayMode;
    const skinAlpha = isXray ? Math.min(layers.integumentary, 0.25) : layers.integumentary;

    // Skin tint based on selected silicone formulation
    const skinColor =
      siliconeId === 'frubber' ? '#e2d3c2' :
      siliconeId === 'dragonskin_10' ? '#c7c2bc' :
      siliconeId === 'ecoflex_0020' ? '#f0ded0' : '#f5e4d5';

    return {
      // Layer 1: Skin
      skin: new THREE.MeshStandardMaterial({
        color: skinColor,
        roughness: 0.55,
        metalness: 0.05,
        transparent: skinAlpha < 0.98,
        opacity: skinAlpha,
        depthWrite: skinAlpha > 0.4,
        side: THREE.DoubleSide,
      }),
      hair: new THREE.MeshStandardMaterial({
        color: '#1a1815',
        roughness: 0.8,
        metalness: 0.1,
        transparent: skinAlpha < 0.98,
        opacity: skinAlpha,
      }),
      // Layer 2: Musculoskeletal
      muscle: new THREE.MeshStandardMaterial({
        color: '#991b1b',
        roughness: 0.45,
        metalness: 0.2,
        transparent: layers.musculoskeletal < 0.98,
        opacity: layers.musculoskeletal,
      }),
      tendonCable: new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        roughness: 0.3,
        metalness: 0.85,
        transparent: layers.musculoskeletal < 0.98,
        opacity: layers.musculoskeletal,
      }),
      qddMotor: new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.35,
        metalness: 0.8,
        transparent: layers.musculoskeletal < 0.98,
        opacity: layers.musculoskeletal,
      }),
      // Layer 3: Endoskeleton
      bone: new THREE.MeshStandardMaterial({
        color: '#334155', // Anodized 7075-T6 CNC aluminum
        roughness: 0.3,
        metalness: 0.85,
        transparent: layers.endoskeletal < 0.98,
        opacity: layers.endoskeletal,
      }),
      carbonFrame: new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.5,
        metalness: 0.5,
        transparent: layers.endoskeletal < 0.98,
        opacity: layers.endoskeletal,
      }),
      coolantBlue: new THREE.MeshStandardMaterial({
        color: '#06b6d4',
        emissive: '#0891b2',
        emissiveIntensity: layers.showThermalLoop ? 1.2 : 0.2,
        roughness: 0.2,
        metalness: 0.6,
        transparent: layers.endoskeletal < 0.98,
        opacity: layers.endoskeletal,
      }),
      coolantRed: new THREE.MeshStandardMaterial({
        color: '#ef4444',
        emissive: '#dc2626',
        emissiveIntensity: layers.showThermalLoop ? 1.2 : 0.2,
        roughness: 0.2,
        metalness: 0.6,
        transparent: layers.endoskeletal < 0.98,
        opacity: layers.endoskeletal,
      }),
      // Layer 4: Electronics & Eyeballs
      sclera: new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.2,
        metalness: 0.1,
        transparent: layers.electronics < 0.98,
        opacity: layers.electronics,
      }),
      irisNitinol: new THREE.MeshStandardMaterial({
        color: '#1d4ed8', // Biometric deep iris blue
        roughness: 0.35,
        metalness: 0.7,
        transparent: layers.electronics < 0.98,
        opacity: layers.electronics,
      }),
      pupilHole: new THREE.MeshBasicMaterial({ color: '#000000' }),
      corneaLens: new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transmission: 0.95,
        opacity: 0.3,
        transparent: true,
        roughness: 0.05,
        ior: 1.376,
      }),
      cameraPcb: new THREE.MeshStandardMaterial({
        color: '#15803d',
        roughness: 0.4,
        metalness: 0.6,
        emissive: '#16a34a',
        emissiveIntensity: selectedPartId === 'eye_cam_left' || selectedPartId === 'eye_cam_right' ? 1.5 : 0.2,
      }),
      goldLensBarrel: new THREE.MeshStandardMaterial({
        color: '#d97706',
        metalness: 0.9,
        roughness: 0.2,
      }),
      orinBrain: new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.3,
        metalness: 0.85,
        emissive: '#3b82f6',
        emissiveIntensity: selectedPartId === 'orin_brain' ? 1.2 : 0.1,
      }),
      batteryPack: new THREE.MeshStandardMaterial({
        color: '#0f766e',
        roughness: 0.4,
        metalness: 0.6,
        emissive: selectedPartId === 'battery_pack' ? '#14b8a6' : '#000000',
        emissiveIntensity: 0.8,
      }),
    };
  }, [layers, siliconeId, selectedPartId]);

  // Handle clickable part selection
  const handlePartClick = (e: any, part: Selectable3DPart) => {
    e.stopPropagation();
    if (onSelectPart) onSelectPart(part);
  };

  // ============================================================
  // 24 mm BIONIC EYEBALL SUB-ASSEMBLY BUILDER
  // ============================================================
  const buildBionicEyeball = (side: 'left' | 'right') => {
    const isLeft = side === 'left';
    const xOffset = isLeft ? 0.032 : -0.032; // 64 mm human inter-pupillary distance (IPD)
    const eyeRef = isLeft ? leftEyeRef : rightEyeRef;
    const irisRef = isLeft ? leftIrisRef : rightIrisRef;
    const camPartId = isLeft ? 'eye_cam_left' : 'eye_cam_right';

    return (
      <group position={[xOffset, 0.035, 0.075]}>
        {/* Gimbal Support Frame (Layer 3/4) */}
        {layers.electronics > 0.05 && (
          <mesh position={[0, 0, -0.012]} material={mats.bone}>
            <boxGeometry args={[0.032, 0.032, 0.01]} />
          </mesh>
        )}

        {/* Rotatable Eyeball Sphere Group (24 mm diameter = 0.012 m radius) */}
        <group ref={eyeRef}>
          {layers.electronics > 0.05 && (
            <>
              {/* 1. Sclera ivory housing (24 mm hollow sphere) */}
              <mesh material={mats.sclera}>
                <sphereGeometry args={[0.012, 32, 32]} />
              </mesh>

              {/* 2. Cornea transparent dome */}
              <mesh position={[0, 0, 0.008]} material={mats.corneaLens}>
                <sphereGeometry args={[0.007, 24, 24]} />
              </mesh>

              {/* 3. Nitinol 6-Blade Iris Diaphragm (2 mm to 7 mm pupil aperture) */}
              <group ref={irisRef} position={[0, 0, 0.0118]}>
                <mesh material={mats.irisNitinol}>
                  <ringGeometry args={[0.002, 0.006, 24]} />
                </mesh>
                {/* Pupil Center Hole */}
                <mesh material={mats.pupilHole}>
                  <circleGeometry args={[0.002, 24]} />
                </mesh>
              </group>

              {/* 4. INTERNAL 8x8 mm CAMERA SENSOR PCB (Clickable / Swappable!) */}
              <group
                position={[0, 0, 0.003]}
                onClick={(e) =>
                  handlePartClick(e, {
                    id: camPartId,
                    name: `${isLeft ? 'Left' : 'Right'} Bionic Eyeball Camera (${activeCamera.name})`,
                    layer: 'electronics',
                    category: 'eyeball_camera',
                    worldPosition: [xOffset, standingCenterY + H.torso * 0.5 + H.neck + 0.035, 0.075],
                    boundingBoxRadiusM: 0.015,
                    activeSpecId: optics.selectedCameraId,
                    availableSwaps: ['imx219', 'ov9281', 'ov5640', 'prophesee_event'],
                  })
                }
              >
                {/* Gold Lens Barrel */}
                <mesh position={[0, 0, 0.004]} rotation={[Math.PI / 2, 0, 0]} material={mats.goldLensBarrel}>
                  <cylinderGeometry args={[0.0025, 0.0025, 0.004, 16]} />
                </mesh>
                {/* 8x8 mm Micro-PCB */}
                <mesh material={mats.cameraPcb}>
                  <boxGeometry args={[0.008, 0.008, 0.0015]} />
                </mesh>
                {/* Rear MIPI CSI-2 Ribbon Cable */}
                <mesh position={[0, -0.006, -0.005]} rotation={[0.4, 0, 0]} material={mats.bone}>
                  <boxGeometry args={[0.004, 0.01, 0.0004]} />
                </mesh>
              </group>
            </>
          )}

          {/* Conformal Upper Eyelid */}
          {layers.integumentary > 0.05 && (
            <mesh position={[0, 0.006, 0.006]} rotation={[-facs.au5_upperLidRaiser * 0.4 + facs.au45_blink * 0.8, 0, 0]} material={mats.skin}>
              <sphereGeometry args={[0.0125, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.35]} />
            </mesh>
          )}
        </group>
      </group>
    );
  };

  return (
    <group ref={rootRef} position={position} rotation={[0, robotYaw, 0]}>
      {/* Root positioned at standing center */}
      <group position={[0, standingCenterY, 0]}>

        {/* ======================================================== */}
        {/* LAYER 3: ENDOSKELETON & THORACIC STRUCTURE              */}
        {/* ======================================================== */}
        {layers.endoskeletal > 0.05 && (
          <group>
            {/* 24-Vertebrae Articulated Biomechanical Spine */}
            {Array.from({ length: 8 }).map((_, i) => (
              <mesh key={`vert_${i}`} position={[0, -H.torso * 0.4 + i * (H.torso / 9), -0.02]} material={mats.bone}>
                <cylinderGeometry args={[0.022, 0.025, 0.035, 12]} />
              </mesh>
            ))}

            {/* Thoracic Ribcage (12 Curved Rib Arches) */}
            {Array.from({ length: 5 }).map((_, i) => (
              <group key={`rib_${i}`} position={[0, -0.05 + i * 0.06, 0]}>
                <mesh material={mats.carbonFrame}>
                  <torusGeometry args={[0.14 - i * 0.01, 0.007, 8, 24, Math.PI * 1.3]} />
                </mesh>
              </group>
            ))}

            {/* CNC 7075 Aluminum Pelvis Saddle Ring */}
            <mesh position={[0, -H.torso * 0.5 - H.pelvis * 0.4, 0]} material={mats.bone}>
              <boxGeometry args={[0.32, 0.12, 0.18]} />
            </mesh>

            {/* Liquid Cooling Capillary Conduits (Blue = Supply, Red = Return) */}
            {layers.showThermalLoop && (
              <group>
                <mesh position={[-0.05, 0, 0.04]} material={mats.coolantBlue}>
                  <cylinderGeometry args={[0.004, 0.004, H.torso * 0.8, 8]} />
                </mesh>
                <mesh position={[0.05, 0, 0.04]} material={mats.coolantRed}>
                  <cylinderGeometry args={[0.004, 0.004, H.torso * 0.8, 8]} />
                </mesh>
              </group>
            )}
          </group>
        )}

        {/* ======================================================== */}
        {/* LAYER 4: THORACIC COMPUTE & 16S BATTERY CORE             */}
        {/* ======================================================== */}
        {layers.electronics > 0.05 && (
          <group>
            {/* Dual NVIDIA Jetson Orin/Thor AI Cerebrum Module */}
            <mesh
              position={[0, 0.10, 0.01]}
              material={mats.orinBrain}
              onClick={(e) =>
                handlePartClick(e, {
                  id: 'orin_brain',
                  name: 'NVIDIA Jetson AGX Orin / Thor Dual-Brain Stack',
                  layer: 'electronics',
                  category: 'compute_module',
                  worldPosition: [0, standingCenterY + 0.10, 0.01],
                  boundingBoxRadiusM: 0.08,
                  activeSpecId: 'jetson_orin_agx',
                  availableSwaps: ['jetson_orin_agx', 'jetson_thor_automotive'],
                })
              }
            >
              <boxGeometry args={[0.14, 0.14, 0.045]} />
            </mesh>

            {/* 16S NMC / Silicon-Anode Battery Pack (Lower Pelvic Core) */}
            <mesh
              position={[0, -H.torso * 0.35, 0]}
              material={mats.batteryPack}
              onClick={(e) =>
                handlePartClick(e, {
                  id: 'battery_pack',
                  name: '16S Li-Ion High-Current Power Core',
                  layer: 'electronics',
                  category: 'battery_core',
                  worldPosition: [0, standingCenterY - H.torso * 0.35, 0],
                  boundingBoxRadiusM: 0.12,
                  activeSpecId: 'nmc_21700_18kwh',
                  availableSwaps: ['nmc_21700_18kwh', 'silicon_anode_4680_24kwh'],
                })
              }
            >
              <boxGeometry args={[0.22, 0.18, 0.14]} />
            </mesh>
          </group>
        )}

        {/* ======================================================== */}
        {/* LAYER 2: MUSCULOSKELETAL HYDRO-MUSCLES & QDDS           */}
        {/* ======================================================== */}
        {layers.musculoskeletal > 0.05 && (
          <group>
            {/* McKibben Hydro-Muscles: Pectorals & Latissimus */}
            <mesh position={[-0.11, 0.12, 0.07]} rotation={[0, 0, 0.4]} material={mats.muscle}>
              <capsuleGeometry args={[0.035, 0.18, 8, 16]} />
            </mesh>
            <mesh position={[0.11, 0.12, 0.07]} rotation={[0, 0, -0.4]} material={mats.muscle}>
              <capsuleGeometry args={[0.035, 0.18, 8, 16]} />
            </mesh>

            {/* QDD Rotary Actuator Drums (Pelvis / Hip Hubs) */}
            <mesh position={[-0.14, -H.torso * 0.5 - 0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.qddMotor}>
              <cylinderGeometry args={[0.048, 0.048, 0.06, 16]} />
            </mesh>
            <mesh position={[0.14, -H.torso * 0.5 - 0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.qddMotor}>
              <cylinderGeometry args={[0.048, 0.048, 0.06, 16]} />
            </mesh>
          </group>
        )}

        {/* ======================================================== */}
        {/* HEAD & CRANIAL MULTI-LAYER ASSEMBLY                      */}
        {/* ======================================================== */}
        <group position={[0, H.torso * 0.5 + H.neck, 0]}>
          {/* Cranial Skull Bone (Layer 3) */}
          {layers.endoskeletal > 0.05 && (
            <mesh position={[0, 0.02, -0.01]} material={mats.bone}>
              <sphereGeometry args={[0.095, 24, 24]} />
            </mesh>
          )}

          {/* 32-DoF FACS Bowden Micro-Cables (Layer 2) */}
          {layers.musculoskeletal > 0.05 && (
            <group>
              {/* Zygomaticus Major (Smile cables) */}
              <mesh position={[-0.045, -0.03, 0.055]} rotation={[0.4, 0, 0.5]} material={mats.tendonCable}>
                <cylinderGeometry args={[0.0015, 0.0015, 0.09, 6]} />
              </mesh>
              <mesh position={[0.045, -0.03, 0.055]} rotation={[0.4, 0, -0.5]} material={mats.tendonCable}>
                <cylinderGeometry args={[0.0015, 0.0015, 0.09, 6]} />
              </mesh>
              {/* Corrugator Brow Cables */}
              <mesh position={[-0.025, 0.065, 0.065]} rotation={[-0.2, 0, 0.3]} material={mats.tendonCable}>
                <cylinderGeometry args={[0.0012, 0.0012, 0.05, 6]} />
              </mesh>
              <mesh position={[0.025, 0.065, 0.065]} rotation={[-0.2, 0, -0.3]} material={mats.tendonCable}>
                <cylinderGeometry args={[0.0012, 0.0012, 0.05, 6]} />
              </mesh>
            </group>
          )}

          {/* 4-Bar Linkage TMJ Jaw (Layer 3) */}
          <group ref={jawRef} position={[0, -0.04, 0.02]}>
            {layers.endoskeletal > 0.05 && (
              <mesh position={[0, -0.02, 0.03]} material={mats.bone}>
                <boxGeometry args={[0.07, 0.035, 0.06]} />
              </mesh>
            )}
            {/* Lower Lip Skin (Layer 1) */}
            {layers.integumentary > 0.05 && (
              <mesh position={[0, -0.015, 0.065]} material={mats.skin}>
                <capsuleGeometry args={[0.012, 0.035, 8, 16]} />
              </mesh>
            )}
          </group>

          {/* LEFT & RIGHT 24 mm BIONIC EYEBALLS */}
          {buildBionicEyeball('left')}
          {buildBionicEyeball('right')}

          {/* Layer 1: Silicone Dermis (Face Mesh with SSS) */}
          {layers.integumentary > 0.05 && (
            <group
              onClick={(e) =>
                handlePartClick(e, {
                  id: 'silicone_face_skin',
                  name: `Facial Silicone Dermis (${activeSilicone.name})`,
                  layer: 'integumentary',
                  category: 'silicone_skin',
                  worldPosition: [0, standingCenterY + H.torso * 0.5 + H.neck + 0.02, 0.06],
                  boundingBoxRadiusM: 0.12,
                  activeSpecId: siliconeId,
                  availableSwaps: ['ecoflex_0010', 'ecoflex_0020', 'frubber', 'dragonskin_10'],
                })
              }
            >
              {/* Cranial Face Shell */}
              <mesh position={[0, 0.02, 0.02]} material={mats.skin}>
                <sphereGeometry args={[0.105, 32, 32]} />
              </mesh>

              {/* Nose Bridge */}
              <mesh position={[0, 0.02, 0.09]} rotation={[-0.3, 0, 0]} material={mats.skin}>
                <coneGeometry args={[0.015, 0.045, 12]} />
              </mesh>

              {/* Eyebrow Hair Follicles (Layer 1) */}
              <mesh position={[-0.035, 0.062, 0.088]} rotation={[0, 0, -0.15]} material={mats.hair}>
                <boxGeometry args={[0.04, 0.007, 0.004]} />
              </mesh>
              <mesh position={[0.035, 0.062, 0.088]} rotation={[0, 0, 0.15]} material={mats.hair}>
                <boxGeometry args={[0.04, 0.007, 0.004]} />
              </mesh>
            </group>
          )}
        </group>

        {/* ======================================================== */}
        {/* TORSO SILICONE DERMIS (Layer 1 Outer Skin)               */}
        {/* ======================================================== */}
        {layers.integumentary > 0.05 && (
          <mesh position={[0, 0, 0]} material={mats.skin}>
            <capsuleGeometry args={[0.19, 0.36, 16, 24]} />
          </mesh>
        )}

        {/* ======================================================== */}
        {/* 180 CM LIMB ASSEMBLIES (Bilateral Arms & Legs)           */}
        {/* ======================================================== */}
        {/* Right & Left Arms */}
        {[-1, 1].map((side) => {
          const x = side * (H.shoulderWidth * 0.5);
          return (
            <group key={`arm_${side}`} position={[x, 0.18, 0]}>
              {/* Shoulder QDD joint (Layer 2/3) */}
              {layers.musculoskeletal > 0.05 && (
                <mesh material={mats.qddMotor}>
                  <sphereGeometry args={[0.045, 16, 16]} />
                </mesh>
              )}
              {/* Upper Arm McKibben Bicep (Layer 2) */}
              {layers.musculoskeletal > 0.05 && (
                <mesh position={[0, -H.armL * 0.5, 0]} material={mats.muscle}>
                  <capsuleGeometry args={[0.035, H.armL * 0.7, 8, 16]} />
                </mesh>
              )}
              {/* Forearm & 24-DoF Dexterous Hand */}
              <group position={[0, -H.armL, 0]}>
                {layers.endoskeletal > 0.05 && (
                  <mesh position={[0, -H.forearmL * 0.5, 0]} material={mats.bone}>
                    <cylinderGeometry args={[0.02, 0.025, H.forearmL, 12]} />
                  </mesh>
                )}
                {/* 24-DoF Hand Assembly */}
                <mesh position={[0, -H.forearmL - H.handL * 0.5, 0]} material={layers.integumentary > 0.2 ? mats.skin : mats.bone}>
                  <boxGeometry args={[0.085, H.handL, 0.03]} />
                </mesh>
              </group>
            </group>
          );
        })}

        {/* Right & Left Legs */}
        {[-1, 1].map((side) => {
          const x = side * 0.14;
          return (
            <group key={`leg_${side}`} position={[x, -H.torso * 0.5 - H.pelvis * 0.5, 0]}>
              {/* Thigh (Femur + Roller Screw) */}
              {layers.endoskeletal > 0.05 && (
                <mesh position={[0, -H.thigh * 0.5, 0]} material={mats.bone}>
                  <cylinderGeometry args={[0.035, 0.04, H.thigh, 16]} />
                </mesh>
              )}
              {layers.integumentary > 0.05 && (
                <mesh position={[0, -H.thigh * 0.5, 0]} material={mats.skin}>
                  <capsuleGeometry args={[0.075, H.thigh * 0.75, 12, 16]} />
                </mesh>
              )}
              {/* Knee Hub & Shank (Tibia) */}
              <group position={[0, -H.thigh, 0]}>
                {layers.musculoskeletal > 0.05 && (
                  <mesh material={mats.qddMotor}>
                    <cylinderGeometry args={[0.042, 0.042, 0.07, 16]} />
                  </mesh>
                )}
                {layers.endoskeletal > 0.05 && (
                  <mesh position={[0, -H.shin * 0.5, 0]} material={mats.bone}>
                    <cylinderGeometry args={[0.03, 0.035, H.shin, 16]} />
                  </mesh>
                )}
                {/* Articulated Foot Sole */}
                <group position={[0, -H.shin, H.footL * 0.2]}>
                  <mesh position={[0, -H.footH * 0.5, 0]} material={layers.integumentary > 0.2 ? mats.skin : mats.bone}>
                    <boxGeometry args={[H.footW, H.footH, H.footL]} />
                  </mesh>
                </group>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
};

export default BiomimeticHumanoidModel;
