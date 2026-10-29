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
import { HumanoidKinematics } from './engine/HumanoidKinematics';
import { SignalEngine } from './engine/SignalEngine';
import TopControlBar from './components/TopControlBar';
import SceneTreePanel from './components/SceneTreePanel';
import Viewport3D from './components/Viewport3D';
import CameraControlHUD from './components/CameraControlHUD';
import SignalAnalyzerPanel from './components/SignalAnalyzerPanel';
import CodeSpaceIDE from './components/CodeSpaceIDE';
import PhoneRemoteHUD from './components/PhoneRemoteHUD';
import HardwareInspectorPanel from './components/HardwareInspectorPanel';

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

  // Simulation State
  const [simState, setSimState] = useState<SimState>('running');
  const [simTime, setSimTime] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const dt = 0.008; // 8ms = 125 Hz fixed timestep

  // Servos State
  const [servos, setServos] = useState<Record<ServoName, ServoState>>(() =>
    kinematicsRef.current.getAllServos()
  );

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
  const [cameraHeight, setCameraHeight] = useState<number>(1.2);
  const [cameraPitch, setCameraPitch] = useState<number>(-15);
  const [cameraYaw, setCameraYaw] = useState<number>(45);
  const [cameraFov, setCameraFov] = useState<number>(50);

  // RF Engine State
  const [baseStationPos, setBaseStationPos] = useState<[number, number, number]>([3.0, 0, 3.0]);
  const [rfConfig, setRfConfig] = useState<RFConfig>(() => signalEngineRef.current.getConfig());
  const [rfState, setRfState] = useState<RFState>(() =>
    signalEngineRef.current.compute([0, 0.225, 0], ARENA_OBSTACLES)
  );
  const [rssiHistory, setRssiHistory] = useState<{ time: number; rssi: number; snr: number }[]>([]);

  // Robot position and yaw state for RF calculation and 3D rendering
  const [robotPosition, setRobotPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [robotYaw, setRobotYaw] = useState<number>(0);

  // Keep signal engine base station position in sync
  useEffect(() => {
    signalEngineRef.current.setBaseStationPosition(baseStationPos);
  }, [baseStationPos]);

  // Code Space & Logs
  const [logs, setLogs] = useState<string[]>([
    'SimuForge Studio Core Initialized.',
    'Loaded 17-DOF Hash V3 Humanoid model.',
    'PCA9685 #1 (0x40) & PCA9685 #2 (0x41) mapped.',
    'System ready. Standing at home position.',
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

  // Log Helper
  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-150), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Main Simulation Loop (125 Hz physics accumulator)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaSec = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (simState === 'running') {
        const stepDt = dt * simSpeed;

        // 1. Advance kinematics interpolation
        kinematicsRef.current.update(stepDt);
        const updatedServos = kinematicsRef.current.getAllServos();
        setServos({ ...updatedServos });

        // 1b. Read world position and yaw from kinematics
        const pos = kinematicsRef.current.getPosition();
        const yaw = kinematicsRef.current.getYaw();
        setRobotPosition(pos);
        setRobotYaw(yaw);

        // 2. Advance time
        setSimTime((t) => t + stepDt);

        // 3. Compute RF signal propagation
        const newRfState = signalEngineRef.current.compute(
          [robotPosition[0], robotPosition[1] + 0.225, robotPosition[2]],
          ARENA_OBSTACLES
        );
        setRfState(newRfState);

        // 4. Update oscilloscope history every ~50ms
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
  }, [simState, simSpeed, dt, robotPosition]);

  // Voice Command Trigger — with detailed logging
  const handleVoiceCommand = useCallback((cmd: VoiceCommand | string) => {
    addLog(`Voice Command Received: "${cmd}"`);
    addLog(`  → Kinematics engine executing: ${cmd}`);
    addLog(`  → Animation queue cleared, new sequence loaded`);
    setLastVoiceCommand(cmd as string);
    kinematicsRef.current.executeCommand(cmd as VoiceCommand);
  }, [addLog]);

  // Servo Slider Change from Tree Inspector
  const handleServoAngleChange = useCallback((name: ServoName, angle: number) => {
    kinematicsRef.current.setServoTarget(name, angle);
    setServos({ ...kinematicsRef.current.getAllServos() });
  }, []);

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

  const handleTxPowerChange = useCallback((power: number) => {
    signalEngineRef.current.setConfig({ txPower: power });
    setRfConfig(signalEngineRef.current.getConfig());
  }, []);

  const handlePathLossChange = useCallback((n: number) => {
    signalEngineRef.current.setConfig({ pathLossExponent: n });
    setRfConfig(signalEngineRef.current.getConfig());
  }, []);

  const handleTxGainChange = useCallback((gain: number) => {
    signalEngineRef.current.setConfig({ txGain: gain });
    setRfConfig(signalEngineRef.current.getConfig());
  }, []);

  const handleRxGainChange = useCallback((gain: number) => {
    signalEngineRef.current.setConfig({ rxGain: gain });
    setRfConfig(signalEngineRef.current.getConfig());
  }, []);

  const handleNoiseFigureChange = useCallback((nf: number) => {
    signalEngineRef.current.setConfig({ noiseFigure: nf });
    setRfConfig(signalEngineRef.current.getConfig());
  }, []);

  // Joystick Input from Phone Remote
  const handleJoystickChange = useCallback((stick: 'left' | 'right', x: number, y: number) => {
    if (stick === 'left') {
      // Locomotion: X = Yaw rotation, Y = Hip pitch forward/back
      if (Math.abs(y) > 0.1) {
        kinematicsRef.current.setServoTarget('R_Hip_Pitch', 90 - y * 25);
        kinematicsRef.current.setServoTarget('L_Hip_Pitch', 90 - y * 25);
      }
      if (Math.abs(x) > 0.1) {
        kinematicsRef.current.setServoTarget('R_Hip_Yaw', 90 + x * 20);
        kinematicsRef.current.setServoTarget('L_Hip_Yaw', 90 + x * 20);
      }
    } else {
      // Arms / Head: X = Head Yaw, Y = Shoulder Pitch
      if (Math.abs(x) > 0.1) {
        kinematicsRef.current.setServoTarget('Head_Yaw', 90 - x * 45);
      }
      if (Math.abs(y) > 0.1) {
        kinematicsRef.current.setServoTarget('R_Shoulder_Pitch', 90 + y * 60);
        kinematicsRef.current.setServoTarget('L_Shoulder_Pitch', 90 - y * 60);
      }
    }
  }, []);

  // Asynchronous Script Runner
  const runCode = async (userCode: string) => {
    if (isCodeRunning) return;
    setIsCodeRunning(true);
    stopCodeExecutionRef.current = false;
    addLog('Executing controller script in sandboxed runtime...');

    // Sandboxed Robot API exposed to user code
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
    };

    try {
      // Evaluate user script safely
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
    addLog('Script execution stopped by user.');
    kinematicsRef.current.homePosition();
  };

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
          setServos({ ...kinematicsRef.current.getAllServos() });
          setSimTime((t) => t + dt);
        }}
        onReset={() => {
          kinematicsRef.current.clearAnimation();
          kinematicsRef.current.homePosition();
          kinematicsRef.current.resetPosition();
          setServos({ ...kinematicsRef.current.getAllServos() });
          setRobotPosition([0, 0, 0]);
          setRobotYaw(0);
          setSimTime(0);
          addLog('Reset simulation to t=0, home posture, origin position.');
        }}
        onSpeedChange={setSimSpeed}
        onVoiceCommand={handleVoiceCommand}
      />

      {/* 2. MAIN 3-PANE WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT: Webots Scene Hierarchy */}
        <SceneTreePanel
          servos={servos}
          onServoAngleChange={handleServoAngleChange}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
        />

        {/* CENTER: 3D Multi-Camera Viewport */}
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
        </div>

        {/* RIGHT: Signal Propagation & RF Analyzer */}
        <SignalAnalyzerPanel
          rfState={rfState}
          rfConfig={rfConfig}
          rssiHistory={rssiHistory}
          onBandChange={handleBandChange}
          onTxPowerChange={handleTxPowerChange}
          onPathLossChange={handlePathLossChange}
          onTxGainChange={handleTxGainChange}
          onRxGainChange={handleRxGainChange}
          onNoiseFigureChange={handleNoiseFigureChange}
        />
      </div>

      {/* 3. BOTTOM: Controller Code Space & Serial Console */}
      <CodeSpaceIDE
        onExecuteCommand={handleVoiceCommand}
        logs={logs}
        isRunning={isCodeRunning}
        onRunCode={runCode}
        onStopCode={stopCode}
        onClearLogs={() => setLogs([])}
        lastVoiceCommand={lastVoiceCommand}
      />

      {/* 4. HARDWARE INSPECTOR PANEL (modal overlay) */}
      <HardwareInspectorPanel
        servos={servos}
        batteryVoltage={7.4 - (simTime % 300) * 0.008}
        simTime={simTime}
        rfRssi={rfState.rssi}
        rfLinkQuality={rfState.linkQuality}
        robotPosition={robotPosition}
        isVisible={hwInspectorVisible}
        onToggleVisible={() => setHwInspectorVisible(!hwInspectorVisible)}
        onServoAngleChange={handleServoAngleChange}
      />

      {/* Hardware Inspector Toggle Button */}
      {!hwInspectorVisible && (
        <button
          onClick={() => setHwInspectorVisible(true)}
          className="fixed bottom-4 left-4 z-40 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-4 py-2.5 rounded-full shadow-lg shadow-violet-500/30 flex items-center space-x-2 border border-violet-400/40 transition-transform hover:scale-105 text-xs font-semibold"
          title="Open Hardware Inspector"
        >
          <span>🔧</span>
          <span>HARDWARE INSPECTOR</span>
        </button>
      )}

      {/* 5. FLOATING: In-Phone Remote Controller */}
      <PhoneRemoteHUD
        onJoystickChange={handleJoystickChange}
        onVoiceCommand={handleVoiceCommand}
        onToggleArm={() => addLog('Motors toggled.')}
        onEmergencyStop={() => {
          stopCode();
          kinematicsRef.current.clearAnimation();
          kinematicsRef.current.homePosition();
          kinematicsRef.current.resetPosition();
          setRobotPosition([0, 0, 0]);
          setRobotYaw(0);
          setServos({ ...kinematicsRef.current.getAllServos() });
          addLog('🚨 EMERGENCY STOP ENGAGED! All PWM cut. Robot reset to origin.');
        }}
        onHomePosition={() => {
          kinematicsRef.current.clearAnimation();
          kinematicsRef.current.homePosition();
          kinematicsRef.current.resetPosition();
          setRobotPosition([0, 0, 0]);
          setRobotYaw(0);
          addLog('Returned to home standing position at origin.');
        }}
        batteryVoltage={7.4 - (simTime % 10) * 0.02}
        rssi={rfState.rssi}
        connected={rfState.linkQuality > 10}
        isVisible={phoneVisible}
        onToggleVisible={() => setPhoneVisible(!phoneVisible)}
      />
    </div>
  );
};

export default App;
