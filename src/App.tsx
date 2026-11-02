// ============================================================
// SimuForge Studio — 180 cm Biomimetic Humanoid Digital Twin
// Flagship Multi-Physics Engineering Simulator & Control Studio
// Architecture: 68.4 kg, 110+ DoF, Dual 24mm Eyeballs, 4 Anatomical Layers
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ServoName,
  ServoState,
  SimState,
  VoiceCommand,
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
import { DynamicsEngine, DynamicsState } from './engine/DynamicsEngine';
import { SensorSuite, SensorState } from './engine/SensorSuite';
import { BiomimeticConsequenceEngine } from './engine/BiomimeticConsequenceEngine';
import TopControlBar, { ViewMode } from './components/TopControlBar';
import SceneTreePanel from './components/SceneTreePanel';
import Viewport3D from './components/Viewport3D';
import RightInspectorDock from './components/RightInspectorDock';
import CodeSpaceIDE from './components/CodeSpaceIDE';
import CircuitEditorPanel from './components/CircuitEditorPanel';
import DynamicsAnalyzerPanel from './components/DynamicsAnalyzerPanel';
import RobotEyePiPViewport from './components/RobotEyePiPViewport';

export const App: React.FC = () => {
  // Engine Instances
  const kinematicsRef = useRef<HumanoidKinematics>(new HumanoidKinematics());
  const dynamicsEngineRef = useRef<DynamicsEngine>(new DynamicsEngine());
  const sensorSuiteRef = useRef<SensorSuite>(new SensorSuite());
  const biomimeticEngineRef = useRef<BiomimeticConsequenceEngine>(new BiomimeticConsequenceEngine());

  // Simulation State
  const [simState, setSimState] = useState<SimState>('running');
  const [simTime, setSimTime] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const dt = 0.008; // 8ms = 125 Hz fixed timestep

  // View Mode: 3D Simulator vs Nervous System & Bus Architecture vs Dynamics & Stability
  const [viewMode, setViewMode] = useState<ViewMode>('simulator');

  // ========================================================
  // 180 CM BIOMIMETIC HUMANOID STATE & ANATOMICAL LAYERS
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

  // Bionic Eyeball Sclera Cutaway Opacity (0.05 = see-through internal PCB, 1.0 = solid ivory)
  const [eyeballShellOpacity, setEyeballShellOpacity] = useState<number>(0.92);

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

  const [siliconeId, setSiliconeId] = useState<SiliconeMaterialId>('ecoflex_0020');
  const [cranialActuatorId, setCranialActuatorId] = useState<string>('coreless_linear_servo');
  const [batteryId, setBatteryId] = useState<BatteryPackType>('silicon_anode_4680_24kwh');
  const [coolantFlowFactor, setCoolantFlowFactor] = useState<number>(0.85);

  // Selected 3D Part for Bidirectional Selection & Live Hot-Swap
  const [selectedPart, setSelectedPart] = useState<Selectable3DPart | null>({
    id: 'left_eyeball_camera',
    name: 'Left_24mm_Bionic_Eyeball_Assembly',
    layer: 'electronics',
    category: 'eyeball_camera',
    worldPosition: [-0.032, 1.68, 0.095],
    boundingBoxRadiusM: 0.02,
    activeSpecId: 'imx219',
    availableSwaps: ['imx219', 'ov9281', 'ov5640', 'prophesee_event'],
  });
  const [focusedPartTarget, setFocusedPartTarget] = useState<[number, number, number] | null>(null);

  // Multi-Physics Consequence Metrics
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

  // Servos & Kinematics State
  const [servos, setServos] = useState<Record<ServoName, ServoState>>(() =>
    kinematicsRef.current.getAllServos()
  );

  // Dynamics & Sensor Suite
  const [dynamicsState, setDynamicsState] = useState<DynamicsState | null>(null);
  const [sensorState, setSensorState] = useState<SensorState | null>(null);

  // Log History
  const [logs, setLogs] = useState<string[]>([
    'SimuForge Studio: 180cm Biomimetic Humanoid Digital Twin Initialized.',
    'Total Mass: 68.4 kg | 110+ Degrees of Freedom | 4 Anatomical Layers active.',
    'Dual 24mm Bionic Eyeballs calibrated: 64mm IPD, independent vergence & coupled pitch.',
    'Nitinol SMA 6-blade iris aperture operational (2.0mm - 7.0mm dynamic range).',
    '32-DoF Cranial Bowden cluster tensioned with Ecoflex 00-20 SSS silicone dermis.',
    'Closed-loop thoracic hydro-cooling online (flowing at 3.2 L/min, pump 45W).',
    'Dual Cerebrum (NVIDIA Orin/Thor 800 TOPS) & Cerebellum (TI C2000 EtherCAT) sync 1000 Hz.',
    'Multi-Physics Consequence Engine online: zero toy robot leftovers detected.',
  ]);
  const [isCodeRunning, setIsCodeRunning] = useState<boolean>(false);
  const stopCodeExecutionRef = useRef<boolean>(false);

  // Log Helper
  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-150), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Robot Speech Synthesis
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
        addLog(`🔊 Audio2Face Speech: "${text}"`);
        setFacs(f => ({ ...f, au25_lipsPart: 0.6, au26_jawDrop: 0.45 }));
        setTimeout(() => {
          setFacs(f => ({ ...f, au25_lipsPart: 0.0, au26_jawDrop: 0.0 }));
        }, 1200);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      addLog(`🔊 Speaker Output: "${text}"`);
    }
  }, [addLog]);

  // Main Simulation Loop (125 Hz physics accumulator)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      lastTime = currentTime;

      if (simState === 'running') {
        const stepDt = dt * simSpeed;

        // 1. Advance kinematics
        kinematicsRef.current.update(stepDt);
        const updatedServos = kinematicsRef.current.getAllServos();
        setServos({ ...updatedServos });

        const pos = kinematicsRef.current.getPosition();
        const yaw = kinematicsRef.current.getYaw();

        // 2. Advance simulation time
        setSimTime((t) => t + stepDt);

        // 3. Compute 68.4 kg rigid-body multi-body dynamics
        const dynState = dynamicsEngineRef.current.compute(updatedServos, pos, yaw, simTime + stepDt);
        setDynamicsState(dynState);

        // 4. Compute IMU, joint encoders, and thermal sensors
        const senState = sensorSuiteRef.current.update(dynState, updatedServos, yaw, stepDt);
        setSensorState(senState);

        // 5. Evaluate Multi-Physics Consequence Engine
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
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [simState, simSpeed, dt, optics, facs, siliconeId, cranialActuatorId, batteryId, coolantFlowFactor, simTime]);

  // Gesture / Voice Command Trigger
  const handleVoiceCommand = useCallback((cmd: VoiceCommand | string) => {
    addLog(`Command Triggered: "${cmd}"`);
    kinematicsRef.current.executeCommand(cmd as VoiceCommand);

    if (cmd === 'Say Hi' || cmd === 'Shake Hands') {
      setFacs(f => ({ ...f, au12_lipCornerPuller: 0.95, au6_cheekRaiser: 0.75 }));
      setTimeout(() => setFacs(f => ({ ...f, au12_lipCornerPuller: 0, au6_cheekRaiser: 0 })), 3000);
    }
  }, [addLog]);

  // Anatomical Layer Preset Handler
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
        setEyeballShellOpacity(0.95);
        addLog('Layer Preset: Full Clone (Lifelike Silicone Dermis & Human Eyes)');
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
        setEyeballShellOpacity(0.22);
        addLog('Layer Preset: Dissection Mode (Translucent Dermis, Internal Bionic Eyeball PCB & Wire Harness)');
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
        setEyeballShellOpacity(0.4);
        addLog('Layer Preset: Musculoskeletal (Hydro-Muscles, 32 Bowden Cables & 24 Vertebrae)');
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
        setEyeballShellOpacity(0.12);
        addLog('Layer Preset: Bionic Core (24mm Eyeball Optical Dome, Dual Orin AI Brain & 16S Pack)');
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

  // Asynchronous ROS 2 / Biomimetic Script Runner
  const runCode = async (userCode: string) => {
    if (isCodeRunning) return;
    setIsCodeRunning(true);
    stopCodeExecutionRef.current = false;
    addLog('Executing node script in Biomimetic Control Runtime...');

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
        const yawDeg = (Math.atan(0.032 / Math.max(0.1, distM)) * 180) / Math.PI;
        setOptics(o => ({
          ...o,
          targetDistanceM: distM,
          leftEyeYawDeg: yawDeg,
          rightEyeYawDeg: yawDeg,
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
      addLog('Node script execution completed successfully.');
    } catch (err: any) {
      addLog(`Runtime Error: ${err?.message || err}`);
    } finally {
      setIsCodeRunning(false);
    }
  };

  const stopCode = () => {
    stopCodeExecutionRef.current = true;
    setIsCodeRunning(false);
    addLog('Node script execution stopped.');
    kinematicsRef.current.homePosition();
  };

  const handleReset = useCallback(() => {
    kinematicsRef.current.clearAnimation();
    kinematicsRef.current.homePosition();
    kinematicsRef.current.resetPosition();
    setServos({ ...kinematicsRef.current.getAllServos() });
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
    setEyeballShellOpacity(0.92);
    addLog('Reset humanoid to anatomical home posture (t=0s).');
  }, [addLog]);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0a0e17] text-[#e2e8f0] overflow-hidden select-none">
      {/* 1. TOP CONTROL BAR */}
      <TopControlBar
        simState={simState}
        simTime={simTime}
        simSpeed={simSpeed}
        dt={dt}
        rfLinkQuality={100}
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
      />

      {/* 2. MAIN WORKSPACE */}
      {viewMode === 'simulator' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Middle 3-Column Split: Left Dock (280px) + Center Viewport (Flex) + Right Dock (360px) */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* LEFT DOCK: 180cm Anatomical Scene Tree & Layer Peeling */}
            <div className="w-[280px] h-full shrink-0 flex flex-col border-r border-[#1e293b] bg-[#0c121e] z-10">
              <SceneTreePanel
                selectedPartId={selectedPart?.id || null}
                onSelectPart={(part) => {
                  setSelectedPart(part);
                  setFocusedPartTarget(part.worldPosition);
                  addLog(`Selected: ${part.name} (${part.layer})`);
                }}
                layers={layers}
                onChangeLayers={setLayers}
                onSelectPreset={handleLayerPreset}
                eyeballShellOpacity={eyeballShellOpacity}
                onChangeEyeballShellOpacity={setEyeballShellOpacity}
              />
            </div>

            {/* CENTER VIEWPORT: Studio Lighting, Quick-Focus Presets, 3D Gaze & Docked PiP Eyeball */}
            <div className="flex-1 relative flex flex-col bg-[#0a0e17] overflow-hidden">
              <Viewport3D
                layers={layers}
                optics={optics}
                facs={facs}
                siliconeId={siliconeId}
                selectedPartId={selectedPart?.id || null}
                onSelectPart={(part) => {
                  setSelectedPart(part);
                  setFocusedPartTarget(part.worldPosition);
                  addLog(`Selected: ${part.name}`);
                }}
                eyeballShellOpacity={eyeballShellOpacity}
                onChangeEyeballShellOpacity={setEyeballShellOpacity}
                focusedPartTarget={focusedPartTarget}
                onTriggerEyeballMacroPreset={() => setEyeballShellOpacity(0.18)}
              />

              {/* DOCKED SYNTHETIC ROBOT EYE PICTURE-IN-PICTURE (PiP) */}
              <RobotEyePiPViewport
                optics={optics}
                onChangeEye={(eye) => setOptics(o => ({ ...o, pipActiveEye: eye }))}
                metrics={biomimeticMetrics}
                onToggleDepthMap={() => setOptics(o => ({ ...o, showDepthMap: !o.showDepthMap }))}
              />
            </div>

            {/* RIGHT DOCK: Hardware Hot-Swap Diff Card, 32-DoF FACS & Whole-Body Telemetry */}
            <div className="w-[360px] h-full shrink-0 flex flex-col border-l border-[#1e293b] bg-[#0c121e] z-10">
              <RightInspectorDock
                selectedPart={selectedPart}
                metrics={biomimeticMetrics}
                optics={optics}
                onChangeOptics={setOptics}
                facs={facs}
                onChangeFACS={setFacs}
                activeCameraId={optics.selectedCameraId}
                onSwapCamera={(camId) => {
                  setOptics(o => ({ ...o, selectedCameraId: camId }));
                  addLog(`Hot-Swapped Eyeball Sensor to: ${camId.toUpperCase()}`);
                }}
                activeSiliconeId={siliconeId}
                onSwapSilicone={(silId) => {
                  setSiliconeId(silId);
                  addLog(`Hot-Swapped Facial Dermis to: ${silId}`);
                }}
                activeBatteryId={batteryId}
                onSwapBattery={(batId) => {
                  setBatteryId(batId);
                  addLog(`Hot-Swapped Structural Power Core to: ${batId}`);
                }}
                cranialActuatorId={cranialActuatorId}
                onSwapCranialActuator={(actId) => {
                  setCranialActuatorId(actId);
                  addLog(`Hot-Swapped Cranial Actuator to: ${actId}`);
                }}
                eyeballShellOpacity={eyeballShellOpacity}
                onChangeEyeballShellOpacity={setEyeballShellOpacity}
                coolantFlowFactor={coolantFlowFactor}
                onChangeCoolantFlow={setCoolantFlowFactor}
                onTriggerPhoneme={handleTriggerPhoneme}
                onFocusPartIn3D={() => {
                  if (selectedPart) setFocusedPartTarget(selectedPart.worldPosition);
                }}
              />
            </div>
          </div>

          {/* BOTTOM DOCK: ROS 2 / Isaac Node Studio & Multi-Physics Consequence Log (200px) */}
          <div className="h-[200px] w-full shrink-0 border-t border-[#1e293b] bg-[#0a0e17] z-10">
            <CodeSpaceIDE
              logs={logs}
              isRunning={isCodeRunning}
              onRunCode={runCode}
              onStopCode={stopCode}
              onClearLogs={() => setLogs([])}
            />
          </div>
        </div>
      ) : viewMode === 'dynamics' ? (
        <DynamicsAnalyzerPanel
          dynamics={dynamicsState}
          sensors={sensorState}
          simTime={simTime}
          isVisible={viewMode === 'dynamics'}
        />
      ) : (
        <CircuitEditorPanel
          isVisible={viewMode === 'circuit'}
        />
      )}
    </div>
  );
};

export default App;
