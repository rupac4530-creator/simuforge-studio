// ============================================================
// SimuForge Studio — Right Dock Inspector
// Tab 1: Live Hardware Hot-Swap & Consequence Diff Card
// Tab 2: 32-DoF FACS Facial Coding & Audio2Face Lip-Sync Studio
// Tab 3: Whole-Body Consequence & Multi-Physics Telemetry
// ============================================================

import React, { useState } from 'react';
import {
  Selectable3DPart, CameraModelId, SiliconeMaterialId,
  BatteryPackType, BiomimeticConsequenceMetrics, FACSState,
  PhonemeId, EyeballOpticsState
} from '../types/biomimetic';
import {
  CAMERA_REGISTRY, SILICONE_REGISTRY, BATTERY_REGISTRY, CRANIAL_ACTUATORS
} from '../engine/ComponentRegistry';
import {
  Cpu, Camera, Shield, Eye, Zap, Thermometer, AlertTriangle,
  RefreshCw, Sliders, CheckCircle2, ChevronRight, Activity,
  Sparkles, Smile, Mic, Flame, Gauge, ArrowRight, Layers
} from 'lucide-react';

interface RightInspectorDockProps {
  selectedPart: Selectable3DPart | null;
  metrics: BiomimeticConsequenceMetrics;
  optics: EyeballOpticsState;
  onChangeOptics: React.Dispatch<React.SetStateAction<EyeballOpticsState>>;
  facs: FACSState;
  onChangeFACS: React.Dispatch<React.SetStateAction<FACSState>>;
  activeCameraId: CameraModelId;
  onSwapCamera: (id: CameraModelId) => void;
  activeSiliconeId: SiliconeMaterialId;
  onSwapSilicone: (id: SiliconeMaterialId) => void;
  activeBatteryId: BatteryPackType;
  onSwapBattery: (id: BatteryPackType) => void;
  cranialActuatorId: string;
  onSwapCranialActuator: (id: string) => void;
  eyeballShellOpacity: number;
  onChangeEyeballShellOpacity: (val: number) => void;
  coolantFlowFactor: number;
  onChangeCoolantFlow: (val: number) => void;
  onTriggerPhoneme: (phoneme: PhonemeId) => void;
  onFocusPartIn3D?: () => void;
}

export const RightInspectorDock: React.FC<RightInspectorDockProps> = ({
  selectedPart,
  metrics,
  optics,
  onChangeOptics,
  facs,
  onChangeFACS,
  activeCameraId,
  onSwapCamera,
  activeSiliconeId,
  onSwapSilicone,
  activeBatteryId,
  onSwapBattery,
  cranialActuatorId,
  onSwapCranialActuator,
  eyeballShellOpacity,
  onChangeEyeballShellOpacity,
  coolantFlowFactor,
  onChangeCoolantFlow,
  onTriggerPhoneme,
  onFocusPartIn3D,
}) => {
  const [activeTab, setActiveTab] = useState<'swap' | 'facs' | 'telemetry'>('swap');

  const camera = CAMERA_REGISTRY[activeCameraId] || CAMERA_REGISTRY.imx219;
  const silicone = SILICONE_REGISTRY[activeSiliconeId] || SILICONE_REGISTRY.ecoflex_0020;
  const battery = BATTERY_REGISTRY[activeBatteryId] || BATTERY_REGISTRY.silicon_anode_4680_24kwh;

  // Predefined FACS Emotion Presets
  const applyEmotionPreset = (preset: 'smile' | 'surprise' | 'anger' | 'sadness' | 'neutral') => {
    switch (preset) {
      case 'smile':
        onChangeFACS(f => ({
          ...f,
          au1_innerBrowRaiser: 0.1,
          au2_outerBrowRaiser: 0.1,
          au4_browLowerer: 0.0,
          au6_cheekRaiser: 0.85,
          au12_lipCornerPuller: 0.95, // Duchenne smile
          au25_lipsPart: 0.45,
          au26_jawDrop: 0.22,
        }));
        break;
      case 'surprise':
        onChangeFACS(f => ({
          ...f,
          au1_innerBrowRaiser: 0.95,
          au2_outerBrowRaiser: 0.9,
          au4_browLowerer: 0.0,
          au5_upperLidRaiser: 0.85,
          au6_cheekRaiser: 0.0,
          au12_lipCornerPuller: 0.0,
          au25_lipsPart: 0.7,
          au26_jawDrop: 0.75,
        }));
        break;
      case 'anger':
        onChangeFACS(f => ({
          ...f,
          au1_innerBrowRaiser: 0.0,
          au2_outerBrowRaiser: 0.0,
          au4_browLowerer: 0.95,
          au5_upperLidRaiser: 0.6,
          au7_lidTightener: 0.8,
          au9_noseWrinkler: 0.75,
          au12_lipCornerPuller: 0.0,
          au15_lipCornerDepressor: 0.6,
          au25_lipsPart: 0.3,
          au26_jawDrop: 0.15,
        }));
        break;
      case 'sadness':
        onChangeFACS(f => ({
          ...f,
          au1_innerBrowRaiser: 0.8,
          au4_browLowerer: 0.5,
          au15_lipCornerDepressor: 0.85,
          au17_chinRaiser: 0.6,
          au25_lipsPart: 0.2,
          au26_jawDrop: 0.1,
        }));
        break;
      case 'neutral':
      default:
        onChangeFACS({
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
        break;
    }
  };

  const updateAU = (auKey: keyof FACSState, val: number) => {
    onChangeFACS(f => ({ ...f, [auKey]: val }));
  };

  return (
    <aside className="w-[360px] bg-[#111827] border-l border-[#1e293b] flex flex-col h-full select-none shrink-0 overflow-hidden text-xs">
      {/* Tab Switcher Header */}
      <div className="h-10 bg-[#0f172a] border-b border-[#1e293b] flex items-center px-1 shrink-0">
        <button
          onClick={() => setActiveTab('swap')}
          className={`flex-1 flex items-center justify-center space-x-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'swap'
              ? 'text-cyan-400 border-cyan-400 bg-cyan-950/20'
              : 'text-slate-500 border-transparent hover:text-slate-300'
          }`}
        >
          <RefreshCw className="w-3 h-3" />
          <span>1. Hardware Swap</span>
        </button>

        <button
          onClick={() => setActiveTab('facs')}
          className={`flex-1 flex items-center justify-center space-x-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'facs'
              ? 'text-rose-400 border-rose-400 bg-rose-950/20'
              : 'text-slate-500 border-transparent hover:text-slate-300'
          }`}
        >
          <Smile className="w-3 h-3" />
          <span>2. FACS & Lips</span>
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex-1 flex items-center justify-center space-x-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'telemetry'
              ? 'text-amber-400 border-amber-400 bg-amber-950/20'
              : 'text-slate-500 border-transparent hover:text-slate-300'
          }`}
        >
          <Gauge className="w-3 h-3" />
          <span>3. Telemetry</span>
        </button>
      </div>

      {/* Main Tab Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ======================================================== */}
        {/* TAB 1: LIVE HARDWARE HOT-SWAP & CONSEQUENCE DIFF CARD    */}
        {/* ======================================================== */}
        {activeTab === 'swap' && (
          <div className="space-y-3">
            {/* Selected Component Header Card */}
            <div className="bg-[#0a0e17] rounded-lg p-3 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target 3D Component:
                </span>
                <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                  {selectedPart ? selectedPart.category.toUpperCase() : 'BIONIC_EYEBALL'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white leading-tight">
                {selectedPart ? selectedPart.name : 'Left 24mm Bionic Eyeball Camera'}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Click any part in the Left Scene Tree or 3D viewport to inspect its physics & swap hardware.
              </p>
            </div>

            {/* Hardware Swap Selectors */}
            <div className="bg-[#0f172a] rounded-lg p-3 border border-slate-800 space-y-3">
              {/* Camera Swap */}
              <div>
                <label className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>Eyeball Camera Die:</span>
                  <span className="text-[9px] font-mono text-slate-400">{camera.resolution[0]}x{camera.resolution[1]}</span>
                </label>
                <select
                  value={activeCameraId}
                  onChange={(e) => onSwapCamera(e.target.value as CameraModelId)}
                  className="w-full bg-[#0a0e17] border border-emerald-500/40 rounded p-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                >
                  <option value="imx219">Sony IMX219 (8MP, 60 FPS, Rolling Shutter)</option>
                  <option value="ov9281">OmniVision OV9281 (1MP, 120 FPS, Global Shutter)</option>
                  <option value="ov5640">OmniVision OV5640 (5MP, 90 FPS, Auto-Focus)</option>
                  <option value="prophesee_event">Prophesee Gen4.1 (120dB Neuromorphic Event)</option>
                </select>
              </div>

              {/* Dermal Silicone Swap */}
              <div>
                <label className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>Dermal Elastomer:</span>
                  <span className="text-[9px] font-mono text-slate-400">E = {silicone.youngsModulusMpa} MPa</span>
                </label>
                <select
                  value={activeSiliconeId}
                  onChange={(e) => onSwapSilicone(e.target.value as SiliconeMaterialId)}
                  className="w-full bg-[#0a0e17] border border-rose-500/40 rounded p-1.5 text-xs text-white font-mono focus:outline-none focus:border-rose-400"
                >
                  <option value="ecoflex_0010">Smooth-On Ecoflex 00-10 (Soft, E=0.05 MPa)</option>
                  <option value="ecoflex_0020">Smooth-On Ecoflex 00-20 (Balanced, E=0.08 MPa)</option>
                  <option value="frubber">Nanoporous Frubber (Porous, E=0.03 MPa)</option>
                  <option value="dragonskin_10">Smooth-On Dragon Skin 10 (Stiff, E=0.59 MPa - Stall Risk)</option>
                </select>
              </div>

              {/* Power Core Battery Swap */}
              <div>
                <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>16S Power Core:</span>
                  <span className="text-[9px] font-mono text-slate-400">{battery.energyKwh} kWh • {battery.packWeightKg} kg</span>
                </label>
                <select
                  value={activeBatteryId}
                  onChange={(e) => onSwapBattery(e.target.value as BatteryPackType)}
                  className="w-full bg-[#0a0e17] border border-amber-500/40 rounded p-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                >
                  <option value="silicon_anode_4680_24kwh">16S Silicon-Anode 4680 (2.4 kWh, 9.8 kg, 5.2h)</option>
                  <option value="nmc_21700_18kwh">16S NMC 21700 (1.8 kWh, 11.2 kg, 3.5h)</option>
                </select>
              </div>

              {/* Cranial Actuators Swap */}
              <div>
                <label className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block mb-1">
                  <span>Cranial Actuation Cluster:</span>
                </label>
                <select
                  value={cranialActuatorId}
                  onChange={(e) => onSwapCranialActuator(e.target.value)}
                  className="w-full bg-[#0a0e17] border border-purple-500/40 rounded p-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                >
                  <option value="coreless_linear_servo">Faulhaber Coreless Linear Servos (15N, 0 backlash)</option>
                  <option value="sub_micro_pwm">Sub-Micro PWM Servos (0.28 Nm, budget)</option>
                </select>
              </div>
            </div>

            {/* Impact Comparison Diff Card */}
            <div className="bg-[#0a0e17] rounded-lg p-3 border border-cyan-800/50 space-y-2">
              <div className="flex items-center space-x-1.5 text-cyan-300 font-bold text-[10px] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Live Hardware Swap Consequence Impact</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Saccade Motion Skew</span>
                  <span className={`font-bold ${metrics.rollingShutterDistortionPct > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {metrics.rollingShutterDistortionPct.toFixed(1)}% {camera.shutterType === 'global' ? '(Zero Blur)' : ''}
                  </span>
                </div>

                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Camera Frame Rate</span>
                  <span className="text-cyan-300 font-bold">{camera.maxFps} FPS</span>
                </div>

                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">MIPI CSI-2 Bus</span>
                  <span className="text-white font-bold">{metrics.mipiBandwidthUsedGbps.toFixed(2)} Gbps</span>
                </div>

                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">SLAM Pipeline Latency</span>
                  <span className="text-emerald-400 font-bold">{optics.slamLatencyMs.toFixed(1)} ms</span>
                </div>

                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Peak Cable Tension</span>
                  <span className={`font-bold ${metrics.cranialCablePeakTensionN > 12 ? 'text-red-400' : 'text-slate-200'}`}>
                    {metrics.cranialCablePeakTensionN.toFixed(1)} N
                  </span>
                </div>

                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">58.8V Battery Runtime</span>
                  <span className="text-emerald-400 font-bold">{metrics.batteryRuntimeHours.toFixed(1)} hrs</span>
                </div>
              </div>
            </div>

            {/* Real-time Optics & Iris Controls */}
            <div className="bg-[#0f172a] rounded-lg p-3 border border-slate-800 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block border-b border-slate-800 pb-1">
                Active Bionic Eye Optics
              </span>

              {/* Pupil Aperture Slider */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                  <span>Nitinol Iris Aperture (2mm–7mm)</span>
                  <span className="text-cyan-300 font-mono font-bold">{optics.pupilApertureMm.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="7.0"
                  step="0.1"
                  value={optics.pupilApertureMm}
                  onChange={(e) => onChangeOptics(o => ({ ...o, pupilApertureMm: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                  <span>f/{metrics.effectiveFocalRatio.toFixed(1)} (Bright)</span>
                  <span>Gain: {metrics.opticalThroughputGain.toFixed(1)}x</span>
                  <span>DoF: {metrics.depthOfFieldBlurPx.toFixed(1)}px</span>
                </div>
              </div>

              {/* Vergence Target Distance */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                  <span>Gaze Focal Target Distance</span>
                  <span className="text-cyan-300 font-mono font-bold">{optics.targetDistanceM.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="4.0"
                  step="0.05"
                  value={optics.targetDistanceM}
                  onChange={(e) => {
                    const dist = parseFloat(e.target.value);
                    const yaw = (Math.atan(0.032 / dist) * 180) / Math.PI;
                    onChangeOptics(o => ({
                      ...o,
                      targetDistanceM: dist,
                      leftEyeYawDeg: yaw,
                      rightEyeYawDeg: yaw
                    }));
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Eyeball Cutaway Slider */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                  <span>Sclera Shell Cutaway Opacity</span>
                  <span className="text-emerald-400 font-mono font-bold">{Math.round(eyeballShellOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={eyeballShellOpacity}
                  onChange={(e) => onChangeEyeballShellOpacity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: 32-DoF FACS FACIAL CODING & AUDIO2FACE LIP-SYNC   */}
        {/* ======================================================== */}
        {activeTab === 'facs' && (
          <div className="space-y-3">
            {/* Servo Stall Alert Banner (if stiff silicone chosen) */}
            {metrics.servoStallWarning && (
              <div className="bg-red-950/80 border border-red-500/80 rounded-lg p-2.5 flex items-start space-x-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-[10px]">
                  <h4 className="font-bold text-red-300 uppercase">Cranial Servo Stall Alert!</h4>
                  <p className="text-red-200/80">
                    Active silicone ({silicone.name}) has high modulus ({silicone.youngsModulusMpa} MPa), requiring {metrics.cranialCablePeakTensionN.toFixed(1)} N tension which exceeds sub-micro servo limits!
                  </p>
                </div>
              </div>
            )}

            {/* Emotion Presets */}
            <div className="bg-[#0a0e17] rounded-lg p-2.5 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Emotion Presets:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => applyEmotionPreset('smile')}
                  className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded text-[10px] font-bold border border-rose-500/40 text-center"
                >
                  Joy / Smile
                </button>
                <button
                  onClick={() => applyEmotionPreset('surprise')}
                  className="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 rounded text-[10px] font-bold border border-cyan-500/40 text-center"
                >
                  Surprise
                </button>
                <button
                  onClick={() => applyEmotionPreset('anger')}
                  className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 rounded text-[10px] font-bold border border-amber-500/40 text-center"
                >
                  Anger
                </button>
                <button
                  onClick={() => applyEmotionPreset('sadness')}
                  className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded text-[10px] font-bold border border-indigo-500/40 text-center"
                >
                  Sorrow
                </button>
                <button
                  onClick={() => applyEmotionPreset('neutral')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold border border-slate-700 text-center col-span-2"
                >
                  Reset Neutral
                </button>
              </div>
            </div>

            {/* Audio2Face Phoneme Trigger Pads */}
            <div className="bg-[#0f172a] rounded-lg p-2.5 border border-slate-800">
              <div className="flex items-center space-x-1.5 text-cyan-400 font-bold text-[10px] uppercase tracking-wider mb-1.5">
                <Mic className="w-3.5 h-3.5" />
                <span>Audio2Face Speech Phonemes (TMJ Jaw Sync):</span>
              </div>
              <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
                {(['A', 'E', 'I', 'O', 'U', 'B_P_M', 'L_T', 'F_V'] as PhonemeId[]).map((phoneme) => (
                  <button
                    key={phoneme}
                    onClick={() => onTriggerPhoneme(phoneme)}
                    className="p-1.5 bg-[#0a0e17] hover:bg-cyan-600/30 text-slate-200 hover:text-cyan-300 rounded border border-slate-800 text-center transition-colors font-bold"
                  >
                    /{phoneme}/
                  </button>
                ))}
              </div>
            </div>

            {/* 32-DoF Action Unit Sliders */}
            <div className="bg-[#0a0e17] rounded-lg p-3 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-1">
                FACS Action Units (AUs)
              </span>

              {/* Brow Region */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-cyan-400 uppercase">Cranial Brows:</span>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                    <span>AU1: Inner Brow Raiser</span>
                    <span className="font-mono">{Math.round(facs.au1_innerBrowRaiser * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={facs.au1_innerBrowRaiser}
                    onChange={(e) => updateAU('au1_innerBrowRaiser', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                    <span>AU4: Brow Lowerer (Corrugator)</span>
                    <span className="font-mono">{Math.round(facs.au4_browLowerer * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={facs.au4_browLowerer}
                    onChange={(e) => updateAU('au4_browLowerer', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>

              {/* Mouth & Cheeks */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800">
                <span className="text-[9px] font-bold text-rose-400 uppercase">Mouth, TMJ & Cheeks:</span>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                    <span>AU12: Zygomatic Smile</span>
                    <span className="font-mono text-rose-300">{Math.round(facs.au12_lipCornerPuller * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={facs.au12_lipCornerPuller}
                    onChange={(e) => updateAU('au12_lipCornerPuller', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                    <span>AU26: Jaw Drop (TMJ Linkage)</span>
                    <span className="font-mono text-rose-300">{Math.round(facs.au26_jawDrop * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={facs.au26_jawDrop}
                    onChange={(e) => updateAU('au26_jawDrop', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                    <span>AU25: Lips Part</span>
                    <span className="font-mono text-rose-300">{Math.round(facs.au25_lipsPart * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={facs.au25_lipsPart}
                    onChange={(e) => updateAU('au25_lipsPart', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-400"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: WHOLE-BODY CONSEQUENCE & MULTI-PHYSICS TELEMETRY */}
        {/* ======================================================== */}
        {activeTab === 'telemetry' && (
          <div className="space-y-3">
            {/* Thermal Equilibrium Status */}
            <div className="bg-[#0a0e17] rounded-lg p-3 border border-slate-800 space-y-2">
              <div className="flex items-center space-x-1.5 text-cyan-300 font-bold text-[10px] uppercase tracking-wider">
                <Thermometer className="w-3.5 h-3.5" />
                <span>Thermal Vascularity & Cooling Cascade</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Skull Internal Temp</span>
                  <span className={`font-bold ${metrics.skullInternalTempC > 45 ? 'text-red-400' : 'text-cyan-300'}`}>
                    {metrics.skullInternalTempC.toFixed(1)} °C
                  </span>
                </div>

                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Thoracic Core Temp</span>
                  <span className="text-white font-bold">{metrics.thoracicCoreTempC.toFixed(1)} °C</span>
                </div>

                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Coolant Flow Rate</span>
                  <span className="text-cyan-400 font-bold">{metrics.liquidCoolantFlowLpm.toFixed(2)} L/min</span>
                </div>

                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Heat Removal Rate</span>
                  <span className="text-amber-300 font-bold">{metrics.coolingHeatDissipationW.toFixed(0)} W</span>
                </div>
              </div>

              {/* Coolant Pump Slider */}
              <div className="pt-1">
                <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                  <span>Thoracic Coolant Pump Rate</span>
                  <span className="text-cyan-300 font-mono font-bold">{(coolantFlowFactor * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.05"
                  value={coolantFlowFactor}
                  onChange={(e) => onChangeCoolantFlow(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>

            {/* Electrical & Real-Time Bus Load */}
            <div className="bg-[#0a0e17] rounded-lg p-3 border border-slate-800 space-y-2">
              <div className="flex items-center space-x-1.5 text-amber-300 font-bold text-[10px] uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                <span>58.8V Power Rail & Bus Bandwidth</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Total System Draw</span>
                  <span className="text-amber-300 font-bold">{metrics.totalSystemPowerWatts.toFixed(0)} W</span>
                </div>

                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">High-Voltage Bus</span>
                  <span className="text-white font-bold">{metrics.busVoltage48V.toFixed(1)} V (16S)</span>
                </div>

                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">MIPI CSI-2 Load</span>
                  <span className="text-cyan-300 font-bold">{metrics.mipiBusSaturationPct.toFixed(0)}%</span>
                </div>

                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">EtherCAT 1kHz Ring</span>
                  <span className="text-emerald-400 font-bold">{metrics.etherCatBusSaturationPct.toFixed(0)}% (3.2μs)</span>
                </div>
              </div>
            </div>

            {/* 180cm Whole-Body Biomechanics */}
            <div className="bg-[#0a0e17] rounded-lg p-3 border border-slate-800 space-y-2">
              <div className="flex items-center space-x-1.5 text-purple-300 font-bold text-[10px] uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" />
                <span>180 cm Biomechanics & Mass</span>
              </div>

              <div className="space-y-1 text-[10px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Total Robot Mass:</span>
                  <span className="text-white font-bold">{metrics.totalRobotMassKg.toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>3D Center of Mass (CoM):</span>
                  <span className="text-cyan-300 font-bold">
                    [{metrics.comWorld[0].toFixed(2)}, {metrics.comWorld[1].toFixed(2)}, {metrics.comWorld[2].toFixed(2)}] m
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Stability Margin:</span>
                  <span className="text-emerald-400 font-bold">{metrics.stabilityMarginMm.toFixed(1)} mm</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Statically Stable:</span>
                  <span className={`font-bold ${metrics.isStaticallyStable ? 'text-emerald-400' : 'text-red-400'}`}>
                    {metrics.isStaticallyStable ? 'YES (In Convex Hull)' : 'NO (Fall Risk)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default RightInspectorDock;