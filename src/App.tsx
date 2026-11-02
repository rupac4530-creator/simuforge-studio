import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ServoName,
  ServoState,
  SimState,
  SimulationConfig,
  RFConfig,
  RFState,
  RFBand,
  CameraPreset,
  VoiceCommand,
  HOME_ANGLES,
} from './types/simulation';
import {
  LayerOpacityState,
  EyeballOpticsState,
  FACSState,
  SiliconeMaterialId,
  CameraModelId,
  BatteryPackType,
  Selectable3DPart,
  PhonemeId,
  BiomimeticConsequenceMetrics,
} from './types/biomimetic';
import { HumanoidKinematics } from './engine/HumanoidKinematics';
import { SignalEngine } from './engine/SignalEngine';
import { DynamicsEngine, DynamicsState } from './engine/DynamicsEngine';
import { SensorSuite, SensorState } from './engine/SensorSuite';
import { BiomimeticConsequenceEngine } from './engine/BiomimeticConsequenceEngine';
import TopControlBar, { ModelScale } from './components/TopControlBar';
import SceneTreePanel from './components/SceneTreePanel';
import Viewport3D from './components/Viewport3D';
import CameraControlHUD from './components/CameraControlHUD';
import SignalAnalyzerPanel from './components/SignalAnalyzerPanel';
import CodeSpaceIDE from './components/CodeSpaceIDE';
import PhoneRemoteHUD from './components/PhoneRemoteHUD';
import HardwareInspectorPanel from './components/HardwareInspectorPanel';
import CircuitEditorPanel from './components/CircuitEditorPanel';
import DynamicsAnalyzerPanel from './components/DynamicsAnalyzerPanel';
import LayerControlBar from './components/LayerControlBar';
import LiveModuleEditorPanel from './components/LiveModuleEditorPanel';
import RobotEyePiPViewport from './components/RobotEyePiPViewport';
import FacialExpressionStudio from './components/FacialExpressionStudio';

// Arena Obstacles for RF attenuation calculation
const ARENA_OBSTACLES = [
  { position: [2.5, 0.75, 0] as [number, number, number], size: [0.3, 1.5, 2.0] as [number, number, number], material: 'Concrete' },
  { position: [-2.0, 0.75, 1.5] as [number, number, number], size: [2.0, 1.5, 0.3] as [number, number, number], material: 'Brick' },
  { position: [0, 0.75, 2.5] as [number, number, number], size: [2.0, 1.5, 0.1] as [number, number, number], material: 'Glass' },
  { position: [-1.5, 0.5, -2.0] as [number, number, number], size: [1.0, 1.0, 1.0] as [number, number, number], material: 'Metal' },
];

export const App: React.FC = () => {
  // Engine Instances
  const kinematicsRef = useRef<HumanoidKinematics>(new HumanoidKinematics());
  const signalEngineRef = useRef<SignalEngine>(new SignalEngine());
  const dynamicsEngineRef = useRef<DynamicsEngine>(new DynamicsEngine());
  const sensorSuiteRef = useRef<SensorSuite>(new SensorSuite());
  const biomimeticEngineRef = useRef<BiomimeticConsequenceEngine>(new BiomimeticConsequenceEngine());

  // Simulation State
  const [simState, setSimState] = useState<SimState>('running');
  const [simTime, setSimTime] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const dt = 0.008; // 8ms = 125 Hz fixed timestep

  // Model Scale: 180cm Biomimetic vs 45cm Table Model
  const [modelScale, setModelScale] = useState<ModelScale>('180cm_biomimetic');

  // ========================================================
  // BIOMIMETIC 180 CM STATE & MULTI-LAYER CONTROLS
  // ========================================================
  const [layers, setLayers] = useState<LayerOpacityState>({
    integumentary: 0.90,     // Layer 1: Skin, Hair, Taxels
    musculoskeletal: 0.85,   // Layer 2: Hydro-muscles, Bowden cables, QDDs
    endoskeletal: 0.90,      // Layer 3: 7075-T6 Skeleton, cooling loops
    electronics: 1.0,        // Layer 4: 24mm Eyeballs, Brain, Battery
    xrayMode: false,
    showTaxels: false,
    showThermalLoop: true,
    showStrainMap: false,
  });

  const [optics, setOptics] = useState<EyeballOpticsState>({
    targetDistanceM: 1.2,
    leftEyeYawDeg: 3.5,
    rightEyeYawDeg: 3.5,
    coupledPitchDeg: 0,
    upperEyelidPitchDeg: 0,
    lowerEyelidPitchDeg: 0,
    pupilApertureMm: 4.5, // 4.5 mm nominal pupil diameter
    selectedCameraId: 'imx219',
    pipActiveEye: 'left',
    showDepthMap: false,
    activeExposureEv: 0,
    depthOfFieldBlurPx: 1.5,
    slamLatencyMs: 16.6,
  });

  const [facs, setFacs] = useState<FACSState>({
    au1_innerBrowRaiser: 0,
    au2_outerBrowRaiser: 0,
    au4_browLowerer: 0,
    au5_upperLidRaiser: 0,
    au6_cheekRaiser: 0,
    au7_lidTightener: 0,
    au45_blink: 0,
    au9_noseWrinkler: 0,
    au10_upperLipRaiser: 0,
    au12_lipCornerPuller: 0,
    au14_dimpler: 0,
    au15_lipCornerDepressor: 0,
    au17_chinRaiser: 0,
    au20_lipStretcher: 0,
    au25_lipsPart: 0,
    au26_jawDrop: 0,
  });

  const [siliconeId, setSiliconeId] = useState<SiliconeMaterialId>('ecoflex_0010');
  const [cranialActuatorId, setCranialActuatorId] = useState<string>('sub_micro_pwm');
  const [batteryId, setBatteryId] = useState<BatteryPackType>('nmc_21700_18kwh');
  const [coolantFlowFactor, setCoolantFlowFactor] = useState<number>(0.85);

  // Selected 3D part for live hot-swapping
  const [selectedPart, setSelectedPart] = useState<Selectable3DPart | null>(null);
  const [focusedPartTarget, setFocusedPartTarget] = useState<[number, number, number] | null>(null);
  const [facsStudioVisible, setFacsStudioVisible] = useState<boolean>(false);

  // Multi-physics consequence metrics
  const [biomimeticMetrics, setBiomimeticMetrics] = useState<BiomimeticConsequenceMetrics>(() =>
    biomimeticEngineRef.current.evaluate(
      optics,
      facs,
      siliconeId,
      optics.selectedCameraId,
      cranialActuatorId,
      batteryId,
      0,
      coolantFlowFactor,
      false
    )
  );

  // Servos State
  const [servos, setServos] = useState<Record<ServoName, ServoState>>(() =>
    kinematicsRef.current.getAllServos()
  );

  // Dynamics & Sensor State
  const [dynamicsState, setDynamicsState] = useState<DynamicsState | null>(null);
  const [sensorState, setSensorState] = useState<SensorState | null>(null);

  // Simulation Debug View Config
  const [config, setConfig] = useState<SimulationConfig>({
    dt: 0.008,
    speed: 1.0,
    gravity: -9.81,
    showColliders: false,
    showCoM: false,
    showForces: false,
    showLidarRays: false,
    showRFHeatmap: false,
    showGrid: true,
  });

  // Camera State
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('orbit');
  const [cameraHeight, setCameraHeight] = useState<number>(1.8);
  const [cameraPitch, setCameraPitch] = useState<number>(-10);
  const [cameraYaw, setCameraYaw] = useState<number>(35);
  const [cameraFov, setCameraFov] = useState<number>(50);

  // RF Engine State
  const [baseStationPos, setBaseStationPos] = useState<[number, number, number]>([3.0, 0, 3.0]);
  const [rfConfig, setRfConfig] = useState<RFConfig>(() => signalEngineRef.current.getConfig());
  const [rfState, setRfState] = useState<RFState>(() =>
    signalEngineRef.current.compute([0, 1.0, 0], ARENA_OBSTACLES)
  );
  const [rssiHistory, setRssiHistory] = useState<{ time: number; rssi: number; snr: number }[]>([]);

  // Robot position and yaw state
  const [robotPosition, setRobotPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [robotYaw, setRobotYaw] = useState<number>(0);

  // Keep signal engine base station position in sync
  useEffect(() => {
    signalEngineRef.current.setBaseStationPosition(baseStationPos);
  }, [baseStationPos]);

  // Code Space & Logs
  const [logs, setLogs] = useState<string[]>([
    'SimuForge Studio Biomimetic Core Initialized.',
    '180 cm Biomimetic Digital Twin loaded (4 Anatomical Layers).',
    'Dual 24 mm Bionic Eyeball Gimbal online with Vergence & Eyelid-Gaze.',
    'Nitinol 6-Blade Iris Diaphragm active (2mm - 7mm pupil aperture).',
    '32-DoF Cranial FACS Bowden Actuator Cluster mapped.',
    'Closed-Loop Thoracic Liquid Cooling Network flowing at 3.2 L/min.',
    'Dual Cerebrum (NVIDIA Orin) & Cerebellum (TI C2000 EtherCAT) synchronized.',
    'Multi-Physics Consequence Engine online.',
  ]);
  const [isCodeRunning, setIsCodeRunning] = useState<boolean>(false);
  const stopCodeExecutionRef = useRef<boolean>(false);

  // Scene Tree & Inspector Selection
  const [selectedNode, setSelectedNode] = useState<string | null>('servo_head_yaw');

  // Phone Remote Visibility
  const [phoneVisible, setPhoneVisible] = useState<boolean>(true);

  // Hardware Inspector Visibility
  const [hwInspectorVisible, setHwInspectorVisible] = useState<boolean>(false);

  // Last voice command for code editor sync
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string>('');

  // View Mode: simulator vs circuit editor vs dynamics analyzer
  const [viewMode, setViewMode] = useState<'simulator' | 'circuit' | 'dynamics'>('simulator');

  // Log Helper
  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-150), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // ========================================
  // Robot Speech Synthesis
  // ========================================
  const handleRobotSpeak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 0.85;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google')));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => {
        addLog(`🔊 Biomimetic Audio2Face: "${text}"`);
        // Trigger mouth phoneme animation
        setFacs(f => ({ ...f, au25_lipsPart: 0.6, au26_jawDrop: 0.45 }));
        setTimeout(() => {
          setFacs(f => ({ ...f, au25_lipsPart: 0.0, au26_jawDrop: 0.0 }));
        }, 1200);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      addLog(`🔊 Speaker: "${text}"`);
    }
  }, [addLog]);

  // Main Simulation Loop (125 Hz physics accumulator)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaSec = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (simState === 'running') {
        const stepDt = dt * simSpeed;

        // 1. Advance kinematics
        kinematicsRef.current.update(stepDt);
        const updatedServos = kinematicsRef.current.getAllServos();
        setServos({ ...updatedServos });

        const pos = kinematicsRef.current.getPosition();
        const yaw = kinematicsRef.current.getYaw();
        setRobotPosition(pos);
        setRobotYaw(yaw);

        // 2. Advance time
        setSimTime((t) => t + stepDt);

        // 3. Compute rigid-body dynamics
        const dynState = dynamicsEngineRef.current.compute(updatedServos, pos, yaw, simTime + stepDt);
        setDynamicsState(dynState);

        // 4. Compute physical sensors
        const senState = sensorSuiteRef.current.update(dynState, updatedServos, yaw, stepDt);
        setSensorState(senState);

        // 5. Evaluate Multi-Physics Consequence (Optics, Skin Stress, Thermal, Bus Bandwidth)
        const isWalking = Math.abs(pos[0]) > 0.01 || Math.abs(pos[2]) > 0.01;
        const newMetrics = biomimeticEngineRef.current.evaluate(
          optics,
          facs,
          siliconeId,
          optics.selectedCameraId,
          cranialActuatorId,
          batteryId,
          simTime + stepDt,
          coolantFlowFactor,
          isWalking
        );
        setBiomimeticMetrics(newMetrics);

        // 6. Compute RF signal propagation
        const newRfState = signalEngineRef.current.compute(
          [pos[0], pos[1] + 1.0, pos[2]],
          ARENA_OBSTACLES
        );
        setRfState(newRfState);

        // 7. Update oscilloscope history every ~50ms
        if (Math.random() < 0.3) {
          setRssiHistory((prev) => [
            ...prev.slice(-60),
            {
              time: Math.round(currentTime),
              rssi: newRfState.rssi,
              snr: newRfState.snr,
            },
          ]);
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [simState, simSpeed, dt, optics, facs, siliconeId, cranialActuatorId, batteryId, coolantFlowFactor]);

  // Voice Command Trigger
  const handleVoiceCommand = useCallback((cmd: VoiceCommand | string) => {
    addLog(`Voice Command Received: "${cmd}"`);
    setLastVoiceCommand(cmd as string);
    kinematicsRef.current.executeCommand(cmd as VoiceCommand);

    // Synchronize facial expression with command
    if (cmd === 'Say Hi' || cmd === 'Shake Hands') {
      setFacs(f => ({ ...f, au12_lipCornerPuller: 0.9, au6_cheekRaiser: 0.6 }));
      setTimeout(() => setFacs(f => ({ ...f, au12_lipCornerPuller: 0, au6_cheekRaiser: 0 })), 3000);
    }
  }, [addLog]);

  // Camera HUD debug toggles
  const handleHudToggle = useCallback((key: string, value: boolean) => {
    setConfig((prev) => {
      switch (key) {
        case 'colliders': return { ...prev, showColliders: value };
        case 'com': return { ...prev, showCoM: value };
        case 'forces': return { ...prev, showForces: value };
        case 'lidar': return { ...prev, showLidarRays: value };
        case 'rf': return { ...prev, showRFHeatmap: value };
        case 'grid': return { ...prev, showGrid: value };
        default: return prev;
      }
    });
  }, []);

  // RF Controls
  const handleBandChange = useCallback((band: RFBand) => {
    signalEngineRef.current.setBand(band);
    setRfConfig(signalEngineRef.current.getConfig());
    addLog(`RF Band Switched to: ${band}`);
  }, [addLog]);

  // Joystick Input from Phone Remote
  const handleJoystickChange = useCallback((stick: 'left' | 'right', x: number, y: number) => {
    if (stick === 'left') {
      if (Math.abs(y) > 0.1) {
        kinematicsRef.current.setServoTarget('R_Hip_Pitch', 90 - y * 25);
        kinematicsRef.current.setServoTarget('L_Hip_Pitch', 90 - y * 25);
      }
      if (Math.abs(x) > 0.1) {
        kinematicsRef.current.setServoTarget('R_Hip_Yaw', 90 + x * 20);
        kinematicsRef.current.setServoTarget('L_Hip_Yaw', 90 + x * 20);
      }
    } else {
      if (Math.abs(x) > 0.1) {
        // Gaze Saccade: Move head yaw + dual-eye vergence
        kinematicsRef.current.setServoTarget('Head_Yaw', 90 - x * 45);
        setOptics(o => ({ ...o, leftEyeYawDeg: 3.5 + x * 15, rightEyeYawDeg: 3.5 - x * 15 }));
      }
      if (Math.abs(y) > 0.1) {
        kinematicsRef.current.setServoTarget('R_Shoulder_Pitch', 90 + y * 60);
        kinematicsRef.current.setServoTarget('L_Shoulder_Pitch', 90 - y * 60);
        setOptics(o => ({ ...o, coupledPitchDeg: y * 20 }));
      }
    }
  }, []);

  // Layer Preset Selector
  const handleLayerPreset = (preset: 'full' | 'dissection' | 'muscle' | 'core') => {
    switch (preset) {
      case 'full':
        setLayers({
          integumentary: 1.0,
          musculoskeletal: 0.85,
          endoskeletal: 0.9,
          electronics: 1.0,
          xrayMode: false,
          showTaxels: false,
          showThermalLoop: false,
          showStrainMap: false,
        });
        addLog('Anatomical Layer Preset: Full Clone (Living Humanoid Skin)');
        break;
      case 'dissection':
        setLayers({
          integumentary: 0.15,
          musculoskeletal: 0.9,
          endoskeletal: 0.9,
          electronics: 1.0,
          xrayMode: true,
          showTaxels: false,
          showThermalLoop: true,
          showStrainMap: true,
        });
        addLog('Anatomical Layer Preset: Dissection Mode (Translucent Skin, Internal Optics)');
        break;
      case 'muscle':
        setLayers({
          integumentary: 0.0,
          musculoskeletal: 1.0,
          endoskeletal: 0.7,
          electronics: 0.8,
          xrayMode: false,
          showTaxels: false,
          showThermalLoop: true,
          showStrainMap: true,
        });
        addLog('Anatomical Layer Preset: Musculoskeletal (Hydro-Muscles & Bowden Rig)');
        break;
      case 'core':
        setLayers({
          integumentary: 0.0,
          musculoskeletal: 0.15,
          endoskeletal: 0.4,
          electronics: 1.0,
          xrayMode: true,
          showTaxels: false,
          showThermalLoop: true,
          showStrainMap: false,
        });
        addLog('Anatomical Layer Preset: Bionic Core (24mm Eyeballs, Orin Brain, 16S Pack)');
        break;
    }
  };

  // Phoneme Trigger
  const handleTriggerPhoneme = (phoneme: PhonemeId) => {
    switch (phoneme) {
      case 'A':
        setFacs(f => ({ ...f, au25_lipsPart: 0.8, au26_jawDrop: 0.6 }));
        break;
      case 'E':
        setFacs(f => ({ ...f, au20_lipStretcher: 0.7, au25_lipsPart: 0.5, au26_jawDrop: 0.3 }));
        break;
      case 'O':
        setFacs(f => ({ ...f, au25_lipsPart: 0.7, au26_jawDrop: 0.4, au20_lipStretcher: 0.0 }));
        break;
      case 'B_P_M':
        setFacs(f => ({ ...f, au25_lipsPart: 0.0, au26_jawDrop: 0.0 }));
        break;
      case 'L_T':
        setFacs(f => ({ ...f, au25_lipsPart: 0.4, au26_jawDrop: 0.25 }));
        break;
      case 'neutral':
      default:
        setFacs(f => ({ ...f, au25_lipsPart: 0.0, au26_jawDrop: 0.0, au20_lipStretcher: 0.0 }));
        break;
    }
  };

  // Asynchronous Script Runner with Extended Biomimetic API
  const runCode = async (userCode: string) => {
    if (isCodeRunning) return;
    setIsCodeRunning(true);
    stopCodeExecutionRef.current = false;
    addLog('Executing controller script in biomimetic runtime...');

    const robot = {
      setServo: (name: ServoName, angle: number) => {
        kinematicsRef.current.setServoTarget(name, angle);
      },
      homePosition: () => {
        kinematicsRef.current.homePosition();
      },
      wait: (ms: number) => {
        return new Promise<void>((resolve) => {
          const start = Date.now();
          const timer = setInterval(() => {
            if (stopCodeExecutionRef.current || Date.now() - start >= ms) {
              clearInterval(timer);
              resolve();
            }
          }, 20);
        });
      },
      log: (msg: string) => {
        addLog(String(msg));
      },
      speak: (text: string) => {
        handleRobotSpeak(text);
      },
      // Biomimetic API
      setFACS: (actionUnit: keyof FACSState, value: number) => {
        setFacs(f => ({ ...f, [actionUnit]: Math.max(0, Math.min(1, value)) }));
      },
      setPupilAperture: (apertureMm: number) => {
        setOptics(o => ({ ...o, pupilApertureMm: Math.max(2.0, Math.min(7.0, apertureMm)) }));
      },
      setVergenceDistance: (distM: number) => {
        setOptics(o => ({
          ...o,
          targetDistanceM: distM,
          leftEyeYawDeg: (Math.atan(0.032 / distM) * 180) / Math.PI,
          rightEyeYawDeg: (Math.atan(0.032 / distM) * 180) / Math.PI,
        }));
      },
      setLayerOpacity: (layer: keyof LayerOpacityState, val: number) => {
        setLayers(l => ({ ...l, [layer]: val }));
      },
      getBiomimeticMetrics: () => biomimeticMetrics,
      getIMU: () => sensorState?.imu || { accelX: 0, accelY: 9.81, accelZ: 0, gyroX: 0, gyroY: 0, gyroZ: 0, roll: 0, pitch: 0, yaw: 0 },
      getCoM: () => dynamicsState ? { x: dynamicsState.com[0], y: dynamicsState.com[1], z: dynamicsState.com[2], isStable: dynamicsState.isStable, stabilityMargin: dynamicsState.stabilityMargin } : null,
      getJointTorques: () => dynamicsState?.jointTorques || {},
    };

    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const fn = new AsyncFunction('robot', userCode);
      await fn(robot);
      addLog('Script execution completed.');
    } catch (err: any) {
      addLog(`Runtime Error: ${err?.message || err}`);
    } finally {
      setIsCodeRunning(false);
    }
  };

  const stopCode = () => {
    stopCodeExecutionRef.current = true;
    setIsCodeRunning(false);
    addLog('Script execution stopped.');
    kinematicsRef.current.homePosition();
  };

  const handleReset = useCallback(() => {
    kinematicsRef.current.clearAnimation();
    kinematicsRef.current.homePosition();
    kinematicsRef.current.resetPosition();
    setServos({ ...kinematicsRef.current.getAllServos() });
    setRobotPosition([0, 0, 0]);
    setRobotYaw(0);
    setSimTime(0);
    dynamicsEngineRef.current.reset();
    sensorSuiteRef.current.reset();
    setDynamicsState(null);
    setSensorState(null);
    setFacs({
      au1_innerBrowRaiser: 0,
      au2_outerBrowRaiser: 0,
      au4_browLowerer: 0,
      au5_upperLidRaiser: 0,
      au6_cheekRaiser: 0,
      au7_lidTightener: 0,
      au45_blink: 0,
      au9_noseWrinkler: 0,
      au10_upperLipRaiser: 0,
      au12_lipCornerPuller: 0,
      au14_dimpler: 0,
      au15_lipCornerDepressor: 0,
      au17_chinRaiser: 0,
      au20_lipStretcher: 0,
      au25_lipsPart: 0,
      au26_jawDrop: 0,
    });
    setOptics(o => ({ ...o, pupilApertureMm: 4.5, leftEyeYawDeg: 3.5, rightEyeYawDeg: 3.5 }));
    addLog('Reset simulation to t=0, home posture, origin position.');
  }, [addLog]);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0a0e17] text-[#e2e8f0] overflow-hidden select-none">
      {/* 1. TOP CONTROL BAR */}
      <TopControlBar
        simState={simState}
        simTime={simTime}
        simSpeed={simSpeed}
        dt={dt}
        rfLinkQuality={rfState.linkQuality}
        onPlay={() => setSimState('running')}
        onPause={() => setSimState('paused')}
        onStep={() => {
          kinematicsRef.current.update(dt);
          const updatedServos = kinematicsRef.current.getAllServos();
          setServos({ ...updatedServos });
          setSimTime((t) => t + dt);
          const pos = kinematicsRef.current.getPosition();
          const yaw = kinematicsRef.current.getYaw();
          const dynState = dynamicsEngineRef.current.compute(updatedServos, pos, yaw, simTime + dt);
          setDynamicsState(dynState);
          const senState = sensorSuiteRef.current.update(dynState, updatedServos, yaw, dt);
          setSensorState(senState);
        }}
        onReset={handleReset}
        onSpeedChange={setSimSpeed}
        onVoiceCommand={handleVoiceCommand}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        modelScale={modelScale}
        onModelScaleChange={setModelScale}
      />

      {/* 2. MAIN CONTENT */}
      {viewMode === 'simulator' ? (
        <>
          <div className="flex-1 flex overflow-hidden relative">
            {/* LEFT: Scene Hierarchy */}
            <SceneTreePanel
              servos={servos}
              onServoAngleChange={(name, angle) => {
                kinematicsRef.current.setServoTarget(name, angle);
                setServos({ ...kinematicsRef.current.getAllServos() });
              }}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />

            {/* CENTER: 3D Multi-Scale Viewport with 4-Layer Biomimetic Model */}
            <div className="flex-1 relative flex flex-col bg-[#0a0e17] overflow-hidden">
              <Viewport3D
                servoAngles={Object.fromEntries(
                  Object.entries(servos).map(([k, v]) => [k, v.angle])
                ) as Record<ServoName, number>}
                config={config}
                cameraPreset={cameraPreset}
                cameraHeight={cameraHeight}
                cameraPitch={cameraPitch}
                cameraYaw={cameraYaw}
                cameraFov={cameraFov}
                baseStationPos={baseStationPos}
                robotPosition={robotPosition}
                robotYaw={robotYaw}
                dynamicsState={dynamicsState}
                modelScale={modelScale}
                layers={layers}
                optics={optics}
                facs={facs}
                siliconeId={siliconeId}
                selectedPartId={selectedPart?.id || null}
                onSelectPart={(part) => {
                  setSelectedPart(part);
                  addLog(`Selected: ${part.name} (Layer: ${part.layer})`);
                  setFocusedPartTarget(part.worldPosition);
                }}
                focusedPartTarget={focusedPartTarget}
              />

              {/* Floating Camera Control HUD */}
              <CameraControlHUD
                preset={cameraPreset}
                height={cameraHeight}
                pitch={cameraPitch}
                yaw={cameraYaw}
                fov={cameraFov}
                onPresetChange={setCameraPreset}
                onHeightChange={setCameraHeight}
                onPitchChange={setCameraPitch}
                onYawChange={setCameraYaw}
                onFovChange={setCameraFov}
                showColliders={config.showColliders}
                showCoM={config.showCoM}
                showForces={config.showForces}
                showLidarRays={config.showLidarRays}
                showRFHeatmap={config.showRFHeatmap}
                showGrid={config.showGrid}
                onToggle={handleHudToggle}
              />

              {/* Floating Layer Control Bar (180 cm Anatomical Peeling) */}
              {modelScale === '180cm_biomimetic' && (
                <LayerControlBar
                  layers={layers}
                  onChangeLayers={setLayers}
                  onSelectPreset={handleLayerPreset}
                />
              )}

              {/* Live Module Editor Slide-out Drawer */}
              {selectedPart && (
                <LiveModuleEditorPanel
                  selectedPart={selectedPart}
                  onClose={() => {
                    setSelectedPart(null);
                    setFocusedPartTarget(null);
                  }}
                  metrics={biomimeticMetrics}
                  activeCameraId={optics.selectedCameraId}
                  onSwapCamera={(camId) => {
                    setOptics(o => ({ ...o, selectedCameraId: camId }));
                    addLog(`Hot-Swapped Eyeball Camera to: ${camId.toUpperCase()}`);
                  }}
                  activeSiliconeId={siliconeId}
                  onSwapSilicone={(silId) => {
                    setSiliconeId(silId);
                    addLog(`Hot-Swapped Dermal Silicone to: ${silId}`);
                  }}
                  activeBatteryId={batteryId}
                  onSwapBattery={(batId) => {
                    setBatteryId(batId);
                    addLog(`Hot-Swapped Power Core to: ${batId}`);
                  }}
                  pupilApertureMm={optics.pupilApertureMm}
                  onChangePupilAperture={(val) => setOptics(o => ({ ...o, pupilApertureMm: val }))}
                  targetDistanceM={optics.targetDistanceM}
                  onChangeTargetDistance={(val) => {
                    const yaw = (Math.atan(0.032 / val) * 180) / Math.PI;
                    setOptics(o => ({ ...o, targetDistanceM: val, leftEyeYawDeg: yaw, rightEyeYawDeg: yaw }));
                  }}
                  coolantFlowFactor={coolantFlowFactor}
                  onChangeCoolantFlow={setCoolantFlowFactor}
                />
              )}

              {/* Synthetic Robot Eye Picture-in-Picture (PiP) Viewport */}
              {modelScale === '180cm_biomimetic' && (
                <RobotEyePiPViewport
                  optics={optics}
                  onChangeEye={(eye) => setOptics(o => ({ ...o, pipActiveEye: eye }))}
                  metrics={biomimeticMetrics}
                  onToggleDepthMap={() => setOptics(o => ({ ...o, showDepthMap: !o.showDepthMap }))}
                />
              )}
            </div>

            {/* RIGHT: Signal Propagation & RF Analyzer */}
            <SignalAnalyzerPanel
              rfState={rfState}
              rfConfig={rfConfig}
              rssiHistory={rssiHistory}
              onBandChange={handleBandChange}
              onTxPowerChange={(power) => {
                signalEngineRef.current.setConfig({ txPower: power });
                setRfConfig(signalEngineRef.current.getConfig());
              }}
              onPathLossChange={(n) => {
                signalEngineRef.current.setConfig({ pathLossExponent: n });
                setRfConfig(signalEngineRef.current.getConfig());
              }}
              onTxGainChange={(gain) => {
                signalEngineRef.current.setConfig({ txGain: gain });
                setRfConfig(signalEngineRef.current.getConfig());
              }}
              onRxGainChange={(gain) => {
                signalEngineRef.current.setConfig({ rxGain: gain });
                setRfConfig(signalEngineRef.current.getConfig());
              }}
              onNoiseFigureChange={(nf) => {
                signalEngineRef.current.setConfig({ noiseFigure: nf });
                setRfConfig(signalEngineRef.current.getConfig());
              }}
            />
          </div>

          {/* BOTTOM: Controller Code Space */}
          <CodeSpaceIDE
            onExecuteCommand={handleVoiceCommand}
            logs={logs}
            isRunning={isCodeRunning}
            onRunCode={runCode}
            onStopCode={stopCode}
            onClearLogs={() => setLogs([])}
            lastVoiceCommand={lastVoiceCommand}
          />
        </>
      ) : viewMode === 'dynamics' ? (
        <DynamicsAnalyzerPanel
          dynamics={dynamicsState}
          sensors={sensorState}
          simTime={simTime}
          isVisible={viewMode === 'dynamics'}
        />
      ) : (
        <CircuitEditorPanel
          servos={servos}
          batteryVoltage={7.4}
          simTime={simTime}
          isVisible={viewMode === 'circuit'}
        />
      )}

      {/* 3. HARDWARE INSPECTOR MODAL */}
      <HardwareInspectorPanel
        servos={servos}
        batteryVoltage={7.4}
        simTime={simTime}
        rfRssi={rfState.rssi}
        rfLinkQuality={rfState.linkQuality}
        robotPosition={robotPosition}
        isVisible={hwInspectorVisible}
        onToggleVisible={() => setHwInspectorVisible(!hwInspectorVisible)}
        onServoAngleChange={(name, angle) => {
          kinematicsRef.current.setServoTarget(name, angle);
          setServos({ ...kinematicsRef.current.getAllServos() });
        }}
      />

      {/* Floating: FACS Facial Expression & Audio2Face Studio */}
      {modelScale === '180cm_biomimetic' && (
        <FacialExpressionStudio
          facs={facs}
          onChangeFACS={setFacs}
          metrics={biomimeticMetrics}
          onTriggerPhoneme={handleTriggerPhoneme}
          isVisible={facsStudioVisible}
          onToggleVisible={() => setFacsStudioVisible(!facsStudioVisible)}
        />
      )}

      {/* Hardware Inspector Toggle Button */}
      {!hwInspectorVisible && (
        <button
          onClick={() => setHwInspectorVisible(true)}
          className="fixed bottom-4 left-4 z-40 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-3.5 py-2.5 rounded-full shadow-lg shadow-violet-500/30 flex items-center space-x-1.5 border border-violet-400/40 transition-transform hover:scale-105 text-xs font-semibold"
          title="Open Hardware Inspector"
        >
          <span>🔧</span>
          <span>HARDWARE</span>
        </button>
      )}

      {/* Floating Phone Remote Controller */}
      <PhoneRemoteHUD
        onJoystickChange={handleJoystickChange}
        onVoiceCommand={handleVoiceCommand}
        onToggleArm={() => addLog('Motors toggled.')}
        onEmergencyStop={() => {
          stopCode();
          setSimState('paused');
          kinematicsRef.current.clearAnimation();
          kinematicsRef.current.homePosition();
          kinematicsRef.current.resetPosition();
          setRobotPosition([0, 0, 0]);
          setRobotYaw(0);
          setServos({ ...kinematicsRef.current.getAllServos() });
          dynamicsEngineRef.current.reset();
          sensorSuiteRef.current.reset();
          setDynamicsState(null);
          setSensorState(null);
          if ('speechSynthesis' in window) window.speechSynthesis.cancel();
          addLog('🚨 EMERGENCY STOP ENGAGED! All motor power cut.');
        }}
        onHomePosition={() => {
          kinematicsRef.current.clearAnimation();
          kinematicsRef.current.homePosition();
          kinematicsRef.current.resetPosition();
          setRobotPosition([0, 0, 0]);
          setRobotYaw(0);
          setServos({ ...kinematicsRef.current.getAllServos() });
          addLog('Returned to home position.');
        }}
        onRobotSpeak={handleRobotSpeak}
        batteryVoltage={7.4}
        rssi={rfState.rssi}
        connected={rfState.linkQuality > 10}
        isVisible={phoneVisible}
        onToggleVisible={() => setPhoneVisible(!phoneVisible)}
      />
    </div>
  );
};

export default App;
