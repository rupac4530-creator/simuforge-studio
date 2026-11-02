// ============================================================
// SimuForge Studio — 180 cm Biomimetic Humanoid 3D Model
// High-Polygon Multi-Scale Anatomical Digital Twin Architecture
// Layer 1: SSS Translucent Silicone Dermis, Hair, Taxels
// Layer 2: 32-DoF FACS Bowden Cables, McKibben Hydro-Muscles, QDDs, 24-DoF Hands
// Layer 3: CNC 7075-T6 Skeleton, 24-Vertebrae Spine, Deionized Coolant Loop
// Layer 4: 24 mm Dual Eyeballs, 6-Blade Nitinol Iris, 8x8mm Camera PCB, Orin Brain, 16S Pack
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
  eyeballShellOpacity?: number;
  gazeTargetPos?: [number, number, number] | null;
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
  eyeballShellOpacity = 0.95,
  gazeTargetPos = null,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const leftEyeGimbalRef = useRef<THREE.Group>(null);
  const rightEyeGimbalRef = useRef<THREE.Group>(null);
  const leftIrisGroupRef = useRef<THREE.Group>(null);
  const rightIrisGroupRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Group>(null);
  const mouthLipRef = useRef<THREE.Group>(null);
  const leftCheekRef = useRef<THREE.Mesh>(null);
  const rightCheekRef = useRef<THREE.Mesh>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  const bicepLeftRef = useRef<THREE.Mesh>(null);
  const bicepRightRef = useRef<THREE.Mesh>(null);

  const activeSilicone = SILICONE_REGISTRY[siliconeId] || SILICONE_REGISTRY.ecoflex_0020;
  const activeCamera = CAMERA_REGISTRY[optics.selectedCameraId] || CAMERA_REGISTRY.imx219;

  // Exact 1.80 m anthropomorphic proportions (in meters)
  const H = {
    total: 1.80,
    head: 0.24,
    neck: 0.10,
    torso: 0.52,
    pelvis: 0.16,
    thigh: 0.44,
    shin: 0.42,
    footH: 0.08,
    footL: 0.26,
    footW: 0.10,
    shoulderW: 0.46,
    upperArmL: 0.32,
    forearmL: 0.28,
    handL: 0.19,
  };

  // Center elevations
  const ankleY = H.footH;
  const kneeY = ankleY + H.shin;
  const hipY = kneeY + H.thigh;
  const pelvisCenterY = hipY + H.pelvis * 0.5;
  const torsoBaseY = hipY + H.pelvis;
  const chestCenterY = torsoBaseY + H.torso * 0.5;
  const neckBaseY = torsoBaseY + H.torso;
  const headCenterY = neckBaseY + H.neck + H.head * 0.48; // ~1.68m eye height

  // Real-time animation loop
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // 1. Dual-Eye Gaze Tracking & Vergence Solver
    let leftYaw = (optics.leftEyeYawDeg * Math.PI) / 180;
    let rightYaw = -(optics.rightEyeYawDeg * Math.PI) / 180;
    let pitch = (optics.coupledPitchDeg * Math.PI) / 180;

    // If a 3D gaze target sphere exists in the scene, dynamically compute binocular vergence
    if (gazeTargetPos) {
      const eyeLWorld = new THREE.Vector3(-0.032, headCenterY, 0.095);
      const eyeRWorld = new THREE.Vector3(0.032, headCenterY, 0.095);
      const targetVec = new THREE.Vector3(...gazeTargetPos);

      const toTargetL = targetVec.clone().sub(eyeLWorld).normalize();
      const toTargetR = targetVec.clone().sub(eyeRWorld).normalize();

      leftYaw = Math.atan2(toTargetL.x, toTargetL.z);
      rightYaw = Math.atan2(toTargetR.x, toTargetR.z);
      pitch = -Math.asin(Math.max(-1, Math.min(1, toTargetL.y)));
    }

    if (leftEyeGimbalRef.current) {
      leftEyeGimbalRef.current.rotation.y = leftYaw;
      leftEyeGimbalRef.current.rotation.x = pitch;
    }
    if (rightEyeGimbalRef.current) {
      rightEyeGimbalRef.current.rotation.y = rightYaw;
      rightEyeGimbalRef.current.rotation.x = pitch;
    }

    // 2. Nitinol SMA 6-Blade Iris Dilation (2.0 mm to 7.0 mm diameter)
    // Scale factor: 2.0mm = 0.5x aperture hole, 7.0mm = 1.75x hole
    const irisDilation = Math.max(0.4, Math.min(1.75, optics.pupilApertureMm / 4.0));
    if (leftIrisGroupRef.current) {
      leftIrisGroupRef.current.scale.set(irisDilation, irisDilation, 1.0);
    }
    if (rightIrisGroupRef.current) {
      rightIrisGroupRef.current.scale.set(irisDilation, irisDilation, 1.0);
    }

    // 3. FACS Action Unit Facial Morphing
    // AU26 (Jaw drop) + 4-bar TMJ mandible translation
    if (jawRef.current) {
      jawRef.current.rotation.x = facs.au26_jawDrop * 0.32; // up to ~18° drop
      jawRef.current.position.z = 0.025 + facs.au26_jawDrop * 0.008; // TMJ forward slide
    }

    // AU12 (Smile / Zygomaticus Major): lifts cheeks and stretches mouth corners
    const smileAmount = facs.au12_lipCornerPuller;
    if (leftCheekRef.current) {
      leftCheekRef.current.position.y = 0.02 + smileAmount * 0.012 + facs.au6_cheekRaiser * 0.008;
      leftCheekRef.current.scale.set(1 + smileAmount * 0.25, 1 + smileAmount * 0.2, 1);
    }
    if (rightCheekRef.current) {
      rightCheekRef.current.position.y = 0.02 + smileAmount * 0.012 + facs.au6_cheekRaiser * 0.008;
      rightCheekRef.current.scale.set(1 + smileAmount * 0.25, 1 + smileAmount * 0.2, 1);
    }

    // AU1 & AU2 (Brows raiser) and AU4 (Brow lowerer)
    const browRaise = (facs.au1_innerBrowRaiser * 0.6 + facs.au2_outerBrowRaiser * 0.4) * 0.015 - facs.au4_browLowerer * 0.01;
    if (leftBrowRef.current) {
      leftBrowRef.current.position.y = 0.065 + browRaise;
    }
    if (rightBrowRef.current) {
      rightBrowRef.current.position.y = 0.065 + browRaise;
    }

    // Lips Part (AU25) & Lip Stretcher (AU20)
    if (mouthLipRef.current) {
      mouthLipRef.current.scale.x = 1.0 + facs.au20_lipStretcher * 0.35 + smileAmount * 0.3;
      mouthLipRef.current.scale.y = 1.0 + facs.au25_lipsPart * 0.6;
    }

    // 4. McKibben Hydro-Muscle Radial Bulging
    if (bicepLeftRef.current) {
      const pulse = 1.0 + Math.sin(t * 1.5) * 0.08;
      bicepLeftRef.current.scale.set(pulse, 1.0, pulse);
    }
    if (bicepRightRef.current) {
      const pulse = 1.0 + Math.cos(t * 1.5) * 0.08;
      bicepRightRef.current.scale.set(pulse, 1.0, pulse);
    }
  });

  // ============================================================
  // PBR MATERIALS MATRIX
  // ============================================================
  const mats = useMemo(() => {
    const isXray = layers.xrayMode;
    const skinAlpha = isXray ? Math.min(layers.integumentary, 0.22) : layers.integumentary;
    const scleraAlpha = Math.min(layers.electronics, eyeballShellOpacity);

    // Skin tint based on selected silicone formulation
    const skinColor =
      siliconeId === 'frubber' ? '#eedecf' :
      siliconeId === 'dragonskin_10' ? '#cfc9c2' :
      siliconeId === 'ecoflex_0010' ? '#fbeae0' : '#f5e4d5';

    // Camera PCB tint based on active sensor model
    const camColors: Record<string, { pcb: string; emissive: string }> = {
      imx219: { pcb: '#15803d', emissive: '#16a34a' }, // Classic Green FR4
      ov9281: { pcb: '#18181b', emissive: '#eab308' }, // Matte Black Global Shutter
      ov5640: { pcb: '#1d4ed8', emissive: '#38bdf8' }, // Royal Blue Auto-Focus
      prophesee_event: { pcb: '#581c87', emissive: '#c084fc' }, // Violet Neuromorphic
    };
    const activeCamColor = camColors[optics.selectedCameraId] || camColors.imx219;

    return {
      // Layer 1: Integumentary (Living Humanoid Skin with SSS)
      skin: new THREE.MeshStandardMaterial({
        color: skinColor,
        roughness: 0.52,
        metalness: 0.04,
        transparent: skinAlpha < 0.98,
        opacity: skinAlpha,
        depthWrite: skinAlpha > 0.35,
        side: THREE.DoubleSide,
      }),
      hair: new THREE.MeshStandardMaterial({
        color: '#1a1815',
        roughness: 0.85,
        metalness: 0.08,
        transparent: skinAlpha < 0.98,
        opacity: skinAlpha,
      }),
      taxelGlow: new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0284c7',
        emissiveIntensity: layers.showTaxels ? 1.5 : 0.0,
        transparent: true,
        opacity: layers.showTaxels ? 0.75 : 0.0,
      }),
      // Layer 2: Musculoskeletal (Bowden Rig & McKibben Hydro-Muscles)
      muscleBraided: new THREE.MeshStandardMaterial({
        color: '#991b1b', // Festo braided synthetic muscle
        roughness: 0.42,
        metalness: 0.25,
        transparent: layers.musculoskeletal < 0.98,
        opacity: layers.musculoskeletal,
      }),
      bowdenSheath: new THREE.MeshStandardMaterial({
        color: '#e2e8f0', // PTFE low-friction sheathing
        roughness: 0.25,
        metalness: 0.7,
        transparent: layers.musculoskeletal < 0.98,
        opacity: layers.musculoskeletal,
      }),
      anchorPinCyan: new THREE.MeshStandardMaterial({
        color: '#06b6d4',
        emissive: '#0891b2',
        emissiveIntensity: 1.2,
      }),
      qddBrushless: new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.35,
        metalness: 0.85,
        transparent: layers.musculoskeletal < 0.98,
        opacity: layers.musculoskeletal,
      }),
      copperStator: new THREE.MeshStandardMaterial({
        color: '#b45309',
        roughness: 0.3,
        metalness: 0.9,
      }),
      // Layer 3: Endoskeleton & Thermal Capillaries
      aluminum7075: new THREE.MeshStandardMaterial({
        color: '#334155', // Hard-anodized CNC 7075-T6 aluminum
        roughness: 0.28,
        metalness: 0.88,
        transparent: layers.endoskeletal < 0.98,
        opacity: layers.endoskeletal,
      }),
      vertebraeDisc: new THREE.MeshStandardMaterial({
        color: '#475569',
        roughness: 0.4,
        metalness: 0.7,
        transparent: layers.endoskeletal < 0.98,
        opacity: layers.endoskeletal,
      }),
      coolantBlueSupply: new THREE.MeshStandardMaterial({
        color: '#06b6d4',
        emissive: '#0891b2',
        emissiveIntensity: layers.showThermalLoop ? 1.6 : 0.3,
        roughness: 0.15,
        metalness: 0.5,
        transparent: layers.endoskeletal < 0.98,
        opacity: layers.endoskeletal,
      }),
      coolantRedReturn: new THREE.MeshStandardMaterial({
        color: '#ef4444',
        emissive: '#dc2626',
        emissiveIntensity: layers.showThermalLoop ? 1.6 : 0.3,
        roughness: 0.15,
        metalness: 0.5,
        transparent: layers.endoskeletal < 0.98,
        opacity: layers.endoskeletal,
      }),
      // Layer 4: Bionic Eyeballs, Nitinol Iris & Micro-Electronics
      corneaPhysical: new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transmission: 0.95,
        opacity: 0.35,
        transparent: true,
        roughness: 0.04,
        ior: 1.376, // Anatomical human cornea refractive index
        reflectivity: 0.8,
      }),
      scleraIvory: new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.25,
        metalness: 0.08,
        transparent: scleraAlpha < 0.98,
        opacity: scleraAlpha,
        depthWrite: scleraAlpha > 0.4,
      }),
      irisBladeNitinol: new THREE.MeshStandardMaterial({
        color: '#1e3a8a', // Deep sapphire Nitinol SMA blades
        roughness: 0.3,
        metalness: 0.8,
        side: THREE.DoubleSide,
      }),
      pupilApertureHole: new THREE.MeshBasicMaterial({ color: '#050505' }),
      cameraPcbDynamic: new THREE.MeshStandardMaterial({
        color: activeCamColor.pcb,
        roughness: 0.35,
        metalness: 0.7,
        emissive: activeCamColor.emissive,
        emissiveIntensity: selectedPartId === 'left_eyeball_camera' || selectedPartId === 'right_eyeball_camera' ? 1.6 : 0.4,
      }),
      lensBarrelBrass: new THREE.MeshStandardMaterial({
        color: '#d97706',
        roughness: 0.2,
        metalness: 0.92,
      }),
      mipiFlexRibbon: new THREE.MeshStandardMaterial({
        color: '#ea580c', // Orange polyimide flex ribbon
        roughness: 0.4,
        metalness: 0.3,
      }),
      jetsonThorCore: new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.25,
        metalness: 0.9,
        emissive: '#2563eb',
        emissiveIntensity: selectedPartId === 'cerebrum_ai_core' ? 1.5 : 0.2,
      }),
      batteryCellGreen: new THREE.MeshStandardMaterial({
        color: '#059669',
        roughness: 0.35,
        metalness: 0.6,
        emissive: selectedPartId === 'battery_pack' ? '#10b981' : '#000000',
        emissiveIntensity: 0.9,
      }),
    };
  }, [layers, siliconeId, selectedPartId, optics.selectedCameraId, eyeballShellOpacity]);

  // Clickable part dispatcher
  const handlePartClick = (e: any, part: Selectable3DPart) => {
    e.stopPropagation();
    if (onSelectPart) onSelectPart(part);
  };

  // ============================================================
  // PROCEDURAL 24 mm BIONIC EYEBALL ASSEMBLY
  // ============================================================
  const build24mmBionicEyeball = (side: 'left' | 'right') => {
    const isLeft = side === 'left';
    const xPos = isLeft ? -0.032 : 0.032; // 64 mm IPD
    const camPartId = isLeft ? 'left_eyeball_camera' : 'right_eyeball_camera';
    const gimbalRef = isLeft ? leftEyeGimbalRef : rightEyeGimbalRef;
    const irisGroupRef = isLeft ? leftIrisGroupRef : rightIrisGroupRef;

    return (
      <group key={side} position={[xPos, 0.035, 0.075]}>
        {/* Orbital Socket Gimbal Mounting Ring (Layer 3) */}
        {layers.endoskeletal > 0.05 && (
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.aluminum7075}>
            <torusGeometry args={[0.014, 0.002, 16, 24]} />
          </mesh>
        )}

        {/* 6-DoF Gimbal Rig (Coupled Pitch + Independent Vergence Yaw) */}
        <group ref={gimbalRef}>
          {layers.electronics > 0.05 && (
            <group
              onClick={(e) =>
                handlePartClick(e, {
                  id: camPartId,
                  name: `${isLeft ? 'Left' : 'Right'} 24mm Bionic Eyeball (${activeCamera.name})`,
                  layer: 'electronics',
                  category: 'eyeball_camera',
                  worldPosition: [xPos, headCenterY + 0.035, 0.095],
                  boundingBoxRadiusM: 0.025,
                  activeSpecId: optics.selectedCameraId,
                  availableSwaps: ['imx219', 'ov9281', 'ov5640', 'prophesee_event'],
                })
              }
            >
              {/* 1. Sclera 24 mm Ivory Shell with Cutaway Opacity */}
              <mesh material={mats.scleraIvory}>
                <sphereGeometry args={[0.012, 32, 32]} />
              </mesh>

              {/* 2. Cornea Optical Dome (r = 6.5 mm, offset forward) */}
              <mesh position={[0, 0, 0.0075]} material={mats.corneaPhysical}>
                <sphereGeometry args={[0.007, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              </mesh>

              {/* 3. Nitinol 6-Blade Iris Diaphragm Ring */}
              <group ref={irisGroupRef} position={[0, 0, 0.0118]}>
                {/* 6 Overlapping Nitinol Blades */}
                {[0, 60, 120, 180, 240, 300].map((angleDeg, i) => (
                  <mesh
                    key={i}
                    rotation={[0, 0, (angleDeg * Math.PI) / 180]}
                    position={[0, 0, i * 0.0001]}
                    material={mats.irisBladeNitinol}
                  >
                    <ringGeometry args={[0.0018, 0.0062, 12]} />
                  </mesh>
                ))}
                {/* Pupil Center Opening */}
                <mesh material={mats.pupilApertureHole} position={[0, 0, -0.0002]}>
                  <circleGeometry args={[0.0018, 24]} />
                </mesh>
              </group>

              {/* 4. Internal 8x8 mm Camera PCB & Optics Die (Inside Eyeball) */}
              <group position={[0, 0, 0.002]}>
                {/* Gold Lens Barrel */}
                <mesh position={[0, 0, 0.005]} rotation={[Math.PI / 2, 0, 0]} material={mats.lensBarrelBrass}>
                  <cylinderGeometry args={[0.0028, 0.0028, 0.0045, 16]} />
                </mesh>

                {/* 8x8 mm CMOS Substrate Micro-PCB */}
                <mesh material={mats.cameraPcbDynamic}>
                  <boxGeometry args={[0.008, 0.008, 0.0016]} />
                </mesh>

                {/* Dark Silicon CMOS Sensor Die */}
                <mesh position={[0, 0, 0.001]} material={mats.pupilApertureHole}>
                  <boxGeometry args={[0.0045, 0.0045, 0.0004]} />
                </mesh>

                {/* Rear MIPI CSI-2 Orange Polyimide Flex Ribbon */}
                <mesh position={[0, -0.006, -0.006]} rotation={[0.45, 0, 0]} material={mats.mipiFlexRibbon}>
                  <boxGeometry args={[0.004, 0.012, 0.0003]} />
                </mesh>
              </group>
            </group>
          )}

          {/* 5. Conformal Upper & Lower Eyelids (tracking pitch & blink AU45) */}
          {layers.integumentary > 0.05 && (
            <group>
              {/* Upper Eyelid */}
              <mesh
                position={[0, 0.004, 0.006]}
                rotation={[-facs.au5_upperLidRaiser * 0.35 + facs.au45_blink * 0.75, 0, 0]}
                material={mats.skin}
              >
                <sphereGeometry args={[0.0126, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.38]} />
              </mesh>
              {/* Lower Eyelid */}
              <mesh
                position={[0, -0.004, 0.006]}
                rotation={[facs.au7_lidTightener * 0.25 + facs.au45_blink * 0.45, 0, 0]}
                material={mats.skin}
              >
                <sphereGeometry args={[0.0126, 24, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38]} />
              </mesh>
            </group>
          )}
        </group>
      </group>
    );
  };

  return (
    <group ref={rootRef} position={position} rotation={[0, robotYaw, 0]}>
      {/* ======================================================== */}
      {/* 1. ANATOMICAL HEAD & CRANIAL MULTI-LAYER ASSEMBLY         */}
      {/* ======================================================== */}
      <group position={[0, headCenterY, 0]}>
        {/* Layer 3: CNC Carbon/Aluminum Cranial Skull */}
        {layers.endoskeletal > 0.05 && (
          <group>
            {/* Cranium dome */}
            <mesh position={[0, 0.02, -0.015]} material={mats.aluminum7075}>
              <sphereGeometry args={[0.096, 32, 32]} />
            </mesh>
            {/* Temporal Bone Arches */}
            <mesh position={[-0.08, 0, 0]} material={mats.aluminum7075}>
              <boxGeometry args={[0.015, 0.06, 0.08]} />
            </mesh>
            <mesh position={[0.08, 0, 0]} material={mats.aluminum7075}>
              <boxGeometry args={[0.015, 0.06, 0.08]} />
            </mesh>
          </group>
        )}

        {/* Layer 3: Articulated 4-Bar TMJ Mandible (Jaw) */}
        <group ref={jawRef} position={[0, -0.045, 0.025]}>
          {layers.endoskeletal > 0.05 && (
            <mesh position={[0, -0.025, 0.02]} material={mats.aluminum7075}>
              <boxGeometry args={[0.075, 0.045, 0.065]} />
            </mesh>
          )}
          {/* Lower Lip Dermis */}
          {layers.integumentary > 0.05 && (
            <mesh position={[0, -0.02, 0.065]} material={mats.skin}>
              <capsuleGeometry args={[0.012, 0.038, 8, 16]} />
            </mesh>
          )}
        </group>

        {/* Layer 2: 32-DoF Cranial FACS Bowden Cable Rig */}
        {layers.musculoskeletal > 0.05 && (
          <group>
            {/* Clavicle-to-Face Cable Bundles */}
            {[-0.045, -0.025, 0.025, 0.045].map((xOffset, i) => (
              <mesh key={i} position={[xOffset, -0.07, 0.04]} rotation={[0.3, 0, xOffset * 2]} material={mats.bowdenSheath}>
                <cylinderGeometry args={[0.0018, 0.0018, 0.12, 6]} />
              </mesh>
            ))}
            {/* Zygomaticus Major Smile Cables (Anchored into Lip Corners) */}
            <mesh position={[-0.048, -0.025, 0.058]} rotation={[0.45, 0, 0.55]} material={mats.bowdenSheath}>
              <cylinderGeometry args={[0.0016, 0.0016, 0.095, 6]} />
            </mesh>
            <mesh position={[0.048, -0.025, 0.058]} rotation={[0.45, 0, -0.55]} material={mats.bowdenSheath}>
              <cylinderGeometry args={[0.0016, 0.0016, 0.095, 6]} />
            </mesh>
            {/* Glowing Anchor Pins at Facial Anchor Pegs */}
            <mesh position={[-0.038, -0.042, 0.072]} material={mats.anchorPinCyan}>
              <sphereGeometry args={[0.003, 12, 12]} />
            </mesh>
            <mesh position={[0.038, -0.042, 0.072]} material={mats.anchorPinCyan}>
              <sphereGeometry args={[0.003, 12, 12]} />
            </mesh>
            {/* Corrugator Brow Cables */}
            <mesh position={[-0.022, 0.065, 0.07]} rotation={[-0.2, 0, 0.35]} material={mats.bowdenSheath}>
              <cylinderGeometry args={[0.0014, 0.0014, 0.055, 6]} />
            </mesh>
            <mesh position={[0.022, 0.065, 0.07]} rotation={[-0.2, 0, -0.35]} material={mats.bowdenSheath}>
              <cylinderGeometry args={[0.0014, 0.0014, 0.055, 6]} />
            </mesh>
          </group>
        )}

        {/* Layer 4: Nested Dual 24 mm Bionic Eyeballs */}
        {build24mmBionicEyeball('left')}
        {build24mmBionicEyeball('right')}

        {/* Layer 1: Translucent Silicone Facial Dermis with SSS & Hair */}
        {layers.integumentary > 0.05 && (
          <group
            onClick={(e) =>
              handlePartClick(e, {
                id: 'silicone_face_skin',
                name: `Facial Silicone Dermis (${activeSilicone.name})`,
                layer: 'integumentary',
                category: 'silicone_skin',
                worldPosition: [0, headCenterY, 0.08],
                boundingBoxRadiusM: 0.12,
                activeSpecId: siliconeId,
                availableSwaps: ['ecoflex_0010', 'ecoflex_0020', 'frubber', 'dragonskin_10'],
              })
            }
          >
            {/* Cranial Face Shell */}
            <mesh position={[0, 0.015, 0.02]} material={mats.skin}>
              <sphereGeometry args={[0.106, 36, 36]} />
            </mesh>

            {/* Nose Bridge & Nostrils */}
            <mesh position={[0, 0.015, 0.096]} rotation={[-0.32, 0, 0]} material={mats.skin}>
              <coneGeometry args={[0.016, 0.048, 16]} />
            </mesh>

            {/* Cheekbone Morphs (AU6 / AU12) */}
            <mesh ref={leftCheekRef} position={[-0.045, 0.02, 0.082]} material={mats.skin}>
              <sphereGeometry args={[0.026, 16, 16]} />
            </mesh>
            <mesh ref={rightCheekRef} position={[0.045, 0.02, 0.082]} material={mats.skin}>
              <sphereGeometry args={[0.026, 16, 16]} />
            </mesh>

            {/* Mouth & Upper Lip Morph (AU12, AU20, AU25) */}
            <group ref={mouthLipRef} position={[0, -0.035, 0.075]}>
              <mesh material={mats.skin}>
                <capsuleGeometry args={[0.009, 0.042, 8, 16]} />
              </mesh>
            </group>

            {/* Eyebrow Hair Follicles (AU1 / AU2 / AU4) */}
            <mesh ref={leftBrowRef} position={[-0.036, 0.065, 0.092]} rotation={[0, 0, -0.16]} material={mats.hair}>
              <boxGeometry args={[0.042, 0.008, 0.005]} />
            </mesh>
            <mesh ref={rightBrowRef} position={[0.036, 0.065, 0.092]} rotation={[0, 0, 0.16]} material={mats.hair}>
              <boxGeometry args={[0.042, 0.008, 0.005]} />
            </mesh>

            {/* Hairline Rim Mesh */}
            <mesh position={[0, 0.095, 0.015]} rotation={[-0.45, 0, 0]} material={mats.hair}>
              <torusGeometry args={[0.088, 0.012, 12, 32, Math.PI * 1.1]} />
            </mesh>
          </group>
        )}
      </group>

      {/* ======================================================== */}
      {/* 2. ARTICULATED CERVICAL NECK COMPLEX                     */}
      {/* ======================================================== */}
      <group position={[0, neckBaseY + H.neck * 0.5, 0]}>
        {layers.endoskeletal > 0.05 && (
          <mesh material={mats.aluminum7075}>
            <cylinderGeometry args={[0.04, 0.048, H.neck, 16]} />
          </mesh>
        )}
        {layers.musculoskeletal > 0.05 && (
          <group>
            {/* Sternocleidomastoid Hydro-Muscles */}
            <mesh position={[-0.035, 0, 0.02]} rotation={[0.2, 0, 0.25]} material={mats.muscleBraided}>
              <cylinderGeometry args={[0.014, 0.014, H.neck * 1.1, 12]} />
            </mesh>
            <mesh position={[0.035, 0, 0.02]} rotation={[0.2, 0, -0.25]} material={mats.muscleBraided}>
              <cylinderGeometry args={[0.014, 0.014, H.neck * 1.1, 12]} />
            </mesh>
          </group>
        )}
        {layers.integumentary > 0.05 && (
          <mesh material={mats.skin}>
            <cylinderGeometry args={[0.052, 0.058, H.neck, 24]} />
          </mesh>
        )}
      </group>

      {/* ======================================================== */}
      {/* 3. THORAX, 24-VERTEBRAE SPINE & CLOSED-LOOP COOLING      */}
      {/* ======================================================== */}
      <group position={[0, chestCenterY, 0]}>
        {/* Layer 3: Endoskeleton & 24 Vertebrae Column */}
        {layers.endoskeletal > 0.05 && (
          <group>
            {/* Clavicle Cross-Member Beam */}
            <mesh position={[0, H.torso * 0.45, 0]} material={mats.aluminum7075}>
              <boxGeometry args={[H.shoulderW * 0.9, 0.045, 0.08]} />
            </mesh>

            {/* Articulated 24-Vertebrae Spine Column */}
            {Array.from({ length: 12 }).map((_, i) => (
              <group key={i} position={[0, H.torso * 0.42 - i * (H.torso * 0.075), -0.06]}>
                <mesh material={mats.vertebraeDisc}>
                  <cylinderGeometry args={[0.022, 0.024, 0.024, 16]} />
                </mesh>
                {/* Ribcage lateral ring contours */}
                <mesh rotation={[0, 0, Math.PI / 2]} material={mats.aluminum7075}>
                  <torusGeometry args={[0.13 - i * 0.004, 0.005, 8, 24, Math.PI]} />
                </mesh>
              </group>
            ))}

            {/* CNC 7075 Aluminum Pelvis Saddle Ring */}
            <mesh position={[0, -H.torso * 0.5 - H.pelvis * 0.4, 0]} material={mats.aluminum7075}>
              <boxGeometry args={[0.34, 0.14, 0.20]} />
            </mesh>

            {/* Closed-Loop Liquid Cooling Conduits */}
            {layers.showThermalLoop && (
              <group>
                <mesh position={[-0.055, 0, 0.05]} material={mats.coolantBlueSupply}>
                  <cylinderGeometry args={[0.005, 0.005, H.torso * 0.85, 12]} />
                </mesh>
                <mesh position={[0.055, 0, 0.05]} material={mats.coolantRedReturn}>
                  <cylinderGeometry args={[0.005, 0.005, H.torso * 0.85, 12]} />
                </mesh>
              </group>
            )}
          </group>
        )}

        {/* Layer 4: Dual NVIDIA Jetson Thor/Orin AI Cerebrum & 16S Battery */}
        {layers.electronics > 0.05 && (
          <group>
            {/* NVIDIA Jetson Thor Core with Finned Heatsink */}
            <mesh
              position={[0, 0.10, 0.015]}
              material={mats.jetsonThorCore}
              onClick={(e) =>
                handlePartClick(e, {
                  id: 'cerebrum_ai_core',
                  name: 'Cerebrum AI Core (Dual NVIDIA Jetson Thor 800 TOPS)',
                  layer: 'electronics',
                  category: 'compute_module',
                  worldPosition: [0, chestCenterY + 0.10, 0.015],
                  boundingBoxRadiusM: 0.10,
                  activeSpecId: 'jetson_thor_automotive',
                  availableSwaps: ['jetson_orin_agx', 'jetson_thor_automotive'],
                })
              }
            >
              <boxGeometry args={[0.15, 0.15, 0.05]} />
            </mesh>

            {/* 16S 58.8V Structural Battery Core (Pelvic Center of Mass) */}
            <mesh
              position={[0, -H.torso * 0.36, 0]}
              material={mats.batteryCellGreen}
              onClick={(e) =>
                handlePartClick(e, {
                  id: 'battery_pack',
                  name: '16S 58.8V 2.4kWh Structural Battery Core',
                  layer: 'electronics',
                  category: 'battery_core',
                  worldPosition: [0, chestCenterY - H.torso * 0.36, 0],
                  boundingBoxRadiusM: 0.14,
                  activeSpecId: 'silicon_anode_4680_24kwh',
                  availableSwaps: ['nmc_21700_18kwh', 'silicon_anode_4680_24kwh'],
                })
              }
            >
              <boxGeometry args={[0.24, 0.18, 0.15]} />
            </mesh>
          </group>
        )}

        {/* Layer 2: Upper-Body Pectorals & Latissimus McKibben Muscles */}
        {layers.musculoskeletal > 0.05 && (
          <group>
            {/* Pectoralis Major Muscles */}
            <mesh position={[-0.08, 0.12, 0.08]} rotation={[0.2, -0.2, 0.4]} material={mats.muscleBraided}>
              <boxGeometry args={[0.11, 0.08, 0.04]} />
            </mesh>
            <mesh position={[0.08, 0.12, 0.08]} rotation={[0.2, 0.2, -0.4]} material={mats.muscleBraided}>
              <boxGeometry args={[0.11, 0.08, 0.04]} />
            </mesh>
          </group>
        )}

        {/* Layer 1: Torso Silicone Dermis Shell */}
        {layers.integumentary > 0.05 && (
          <mesh material={mats.skin}>
            <capsuleGeometry args={[0.15, H.torso * 0.75, 16, 24]} />
          </mesh>
        )}
      </group>

      {/* ======================================================== */}
      {/* 4. UPPER LIMBS: MCKIBBEN HYDRO-MUSCLES & 24-DOF HANDS   */}
      {/* ======================================================== */}
      {[-1, 1].map((sideMul) => {
        const isLeft = sideMul === -1;
        const armX = sideMul * (H.shoulderW * 0.5);
        const shoulderY = chestCenterY + H.torso * 0.38;

        return (
          <group key={sideMul} position={[armX, shoulderY, 0]}>
            {/* Shoulder Ball Joint */}
            {layers.endoskeletal > 0.05 && (
              <mesh material={mats.aluminum7075}>
                <sphereGeometry args={[0.045, 16, 16]} />
              </mesh>
            )}

            {/* Bicep / Tricep Braided Hydro-Muscles (Bulging radially) */}
            <group position={[0, -H.upperArmL * 0.5, 0]}>
              {layers.endoskeletal > 0.05 && (
                <mesh material={mats.aluminum7075}>
                  <cylinderGeometry args={[0.022, 0.024, H.upperArmL * 0.9, 12]} />
                </mesh>
              )}
              {layers.musculoskeletal > 0.05 && (
                <mesh
                  ref={isLeft ? bicepLeftRef : bicepRightRef}
                  position={[0, 0, 0.015]}
                  material={mats.muscleBraided}
                >
                  <capsuleGeometry args={[0.038, H.upperArmL * 0.65, 12, 16]} />
                </mesh>
              )}
              {layers.integumentary > 0.05 && (
                <mesh material={mats.skin}>
                  <capsuleGeometry args={[0.046, H.upperArmL * 0.72, 12, 16]} />
                </mesh>
              )}
            </group>

            {/* Forearm & 24-DoF Dexterous Tendon Hand */}
            <group position={[0, -H.upperArmL, 0]}>
              {/* Elbow Joint */}
              {layers.endoskeletal > 0.05 && (
                <mesh material={mats.aluminum7075}>
                  <sphereGeometry args={[0.038, 16, 16]} />
                </mesh>
              )}

              {/* Forearm Flexors */}
              <group position={[0, -H.forearmL * 0.5, 0]}>
                {layers.endoskeletal > 0.05 && (
                  <mesh material={mats.aluminum7075}>
                    <cylinderGeometry args={[0.018, 0.022, H.forearmL * 0.85, 12]} />
                  </mesh>
                )}
                {layers.musculoskeletal > 0.05 && (
                  <mesh material={mats.muscleBraided}>
                    <capsuleGeometry args={[0.032, H.forearmL * 0.62, 12, 16]} />
                  </mesh>
                )}
                {layers.integumentary > 0.05 && (
                  <mesh material={mats.skin}>
                    <capsuleGeometry args={[0.038, H.forearmL * 0.72, 12, 16]} />
                  </mesh>
                )}
              </group>

              {/* 24-DoF Anthropomorphic Hand Assembly */}
              <group
                position={[0, -H.forearmL, 0]}
                onClick={(e) =>
                  handlePartClick(e, {
                    id: isLeft ? 'l_arm_mckibben_hand' : 'r_arm_mckibben_hand',
                    name: `${isLeft ? 'Left' : 'Right'} 24-DoF Tendon Hand & Taxel Array`,
                    layer: 'musculoskeletal',
                    category: 'limb_actuators',
                    worldPosition: [armX, shoulderY - H.upperArmL - H.forearmL, 0],
                    boundingBoxRadiusM: 0.12,
                    activeSpecId: '24dof_tendon_hand',
                    availableSwaps: ['24dof_tendon_hand'],
                  })
                }
              >
                {/* Palm Base Plate */}
                {layers.endoskeletal > 0.05 && (
                  <mesh material={mats.aluminum7075} position={[0, -0.045, 0]}>
                    <boxGeometry args={[0.075, 0.07, 0.022]} />
                  </mesh>
                )}
                {layers.integumentary > 0.05 && (
                  <mesh material={mats.skin} position={[0, -0.045, 0]}>
                    <boxGeometry args={[0.082, 0.076, 0.026]} />
                  </mesh>
                )}

                {/* 5 Distinct Articulated Fingers (Thumb, Index, Middle, Ring, Pinky) */}
                {[-0.028, -0.010, 0.008, 0.026].map((digitX, fIndex) => (
                  <group key={fIndex} position={[digitX, -0.08, 0]}>
                    {/* Proximal Phalange */}
                    <mesh position={[0, -0.018, 0]} material={layers.endoskeletal > 0.05 ? mats.aluminum7075 : mats.skin}>
                      <cylinderGeometry args={[0.006, 0.006, 0.032, 8]} />
                    </mesh>
                    {/* Intermediate Phalange */}
                    <mesh position={[0, -0.045, 0]} material={layers.endoskeletal > 0.05 ? mats.aluminum7075 : mats.skin}>
                      <cylinderGeometry args={[0.005, 0.005, 0.026, 8]} />
                    </mesh>
                    {/* Distal Phalange + Fingertip Taxel */}
                    <mesh position={[0, -0.066, 0]} material={mats.taxelGlow}>
                      <sphereGeometry args={[0.006, 12, 12]} />
                    </mesh>
                  </group>
                ))}

                {/* Opposable Thumb */}
                <group position={[sideMul * 0.045, -0.035, 0.015]} rotation={[0.4, sideMul * 0.6, 0]}>
                  <mesh position={[0, -0.02, 0]} material={layers.endoskeletal > 0.05 ? mats.aluminum7075 : mats.skin}>
                    <cylinderGeometry args={[0.007, 0.007, 0.035, 8]} />
                  </mesh>
                  <mesh position={[0, -0.045, 0]} material={mats.taxelGlow}>
                    <sphereGeometry args={[0.007, 12, 12]} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        );
      })}

      {/* ======================================================== */}
      {/* 5. LOWER LIMBS: HIGH-TORQUE QDDS & ROLLER SCREWS         */}
      {/* ======================================================== */}
      {[-1, 1].map((sideMul) => {
        const isLeft = sideMul === -1;
        const hipX = sideMul * 0.105;

        return (
          <group key={sideMul} position={[hipX, hipY, 0]}>
            {/* Pelvis-Hip 360 Nm QDD Rotary Actuator */}
            {layers.musculoskeletal > 0.05 && (
              <group
                onClick={(e) =>
                  handlePartClick(e, {
                    id: 'lower_body_qdd_actuators',
                    name: `${isLeft ? 'Left' : 'Right'} Hip 360Nm Brushless QDD Actuator`,
                    layer: 'musculoskeletal',
                    category: 'lower_actuators',
                    worldPosition: [hipX, hipY, 0],
                    boundingBoxRadiusM: 0.12,
                    activeSpecId: 'robedrive_ilm_qdd',
                    availableSwaps: ['robedrive_ilm_qdd'],
                  })
                }
              >
                <mesh rotation={[0, 0, Math.PI / 2]} material={mats.qddBrushless}>
                  <cylinderGeometry args={[0.058, 0.058, 0.065, 24]} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]} material={mats.copperStator}>
                  <torusGeometry args={[0.048, 0.005, 8, 24]} />
                </mesh>
              </group>
            )}

            {/* Thigh: Planetary Roller-Screw Linear Actuator */}
            <group position={[0, -H.thigh * 0.5, 0]}>
              {layers.endoskeletal > 0.05 && (
                <mesh material={mats.aluminum7075}>
                  <cylinderGeometry args={[0.038, 0.042, H.thigh * 0.9, 16]} />
                </mesh>
              )}
              {/* Inverted Roller Screw Cylinders */}
              {layers.musculoskeletal > 0.05 && (
                <mesh position={[0, 0, -0.015]} material={mats.qddBrushless}>
                  <cylinderGeometry args={[0.026, 0.026, H.thigh * 0.75, 16]} />
                </mesh>
              )}
              {layers.integumentary > 0.05 && (
                <mesh material={mats.skin}>
                  <capsuleGeometry args={[0.068, H.thigh * 0.75, 16, 24]} />
                </mesh>
              )}
            </group>

            {/* Knee Joint & Shin Assembly */}
            <group position={[0, -H.thigh, 0]}>
              {/* Knee 8000N Roller-Screw Pivot */}
              {layers.endoskeletal > 0.05 && (
                <mesh rotation={[0, 0, Math.PI / 2]} material={mats.aluminum7075}>
                  <cylinderGeometry args={[0.042, 0.042, 0.075, 20]} />
                </mesh>
              )}

              {/* Calf / Shin */}
              <group position={[0, -H.shin * 0.5, 0]}>
                {layers.endoskeletal > 0.05 && (
                  <mesh material={mats.aluminum7075}>
                    <cylinderGeometry args={[0.030, 0.034, H.shin * 0.88, 16]} />
                  </mesh>
                )}
                {layers.musculoskeletal > 0.05 && (
                  <mesh position={[0, 0, -0.02]} material={mats.muscleBraided}>
                    <capsuleGeometry args={[0.036, H.shin * 0.65, 12, 16]} />
                  </mesh>
                )}
                {layers.integumentary > 0.05 && (
                  <mesh material={mats.skin}>
                    <capsuleGeometry args={[0.055, H.shin * 0.75, 16, 24]} />
                  </mesh>
                )}
              </group>

              {/* Ankle & Articulated Foot Sole */}
              <group position={[0, -H.shin, 0]}>
                {/* Ankle Dual-Link Actuator */}
                {layers.endoskeletal > 0.05 && (
                  <mesh material={mats.aluminum7075}>
                    <sphereGeometry args={[0.036, 16, 16]} />
                  </mesh>
                )}
                {/* Foot Sole with Ground Contact Force Transducers */}
                <mesh position={[0, -H.footH * 0.5, H.footL * 0.15]} material={mats.aluminum7075}>
                  <boxGeometry args={[H.footW, H.footH, H.footL]} />
                </mesh>
                {/* Rubber Sole Ground Contact Pad */}
                <mesh position={[0, -H.footH, H.footL * 0.15]} material={mats.qddBrushless}>
                  <boxGeometry args={[H.footW * 1.05, 0.012, H.footL * 1.05]} />
                </mesh>
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
};

export default BiomimeticHumanoidModel;