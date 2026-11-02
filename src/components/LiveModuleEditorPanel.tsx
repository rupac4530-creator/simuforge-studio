// ============================================================
// SimuForge Studio — Live Modular Component Editor Panel
// Hot-swapping hardware parts with real-time consequence feedback
// ============================================================

import React from 'react';
import {
  Selectable3DPart, CameraModelId, SiliconeMaterialId,
  BatteryPackType, BiomimeticConsequenceMetrics
} from '../types/biomimetic';
import {
  CAMERA_REGISTRY, SILICONE_REGISTRY, BATTERY_REGISTRY
} from '../engine/ComponentRegistry';
import {
  Cpu, Camera, Shield, Eye, X, Zap, Thermometer,
  AlertTriangle, RefreshCw, Sliders, CheckCircle2, ChevronRight
} from 'lucide-react';

interface LiveModuleEditorPanelProps {
  selectedPart: Selectable3DPart | null;
  onClose: () => void;
  metrics: BiomimeticConsequenceMetrics;
  // Hot-swap handlers
  activeCameraId: CameraModelId;
  onSwapCamera: (id: CameraModelId) => void;
  activeSiliconeId: SiliconeMaterialId;
  onSwapSilicone: (id: SiliconeMaterialId) => void;
  activeBatteryId: BatteryPackType;
  onSwapBattery: (id: BatteryPackType) => void;
  // Live parameter controls
  pupilApertureMm: number;
  onChangePupilAperture: (val: number) => void;
  targetDistanceM: number;
  onChangeTargetDistance: (val: number) => void;
  coolantFlowFactor: number;
  onChangeCoolantFlow: (val: number) => void;
}

export const LiveModuleEditorPanel: React.FC<LiveModuleEditorPanelProps> = ({
  selectedPart,
  onClose,
  metrics,
  activeCameraId,
  onSwapCamera,
  activeSiliconeId,
  onSwapSilicone,
  activeBatteryId,
  onSwapBattery,
  pupilApertureMm,
  onChangePupilAperture,
  targetDistanceM,
  onChangeTargetDistance,
  coolantFlowFactor,
  onChangeCoolantFlow,
}) => {
  if (!selectedPart) return null;

  const isCamera = selectedPart.category === 'eyeball_camera';
  const isSkin = selectedPart.category === 'silicone_skin';
  const isBattery = selectedPart.category === 'battery_core';
  const isCompute = selectedPart.category === 'compute_module';

  const camera = CAMERA_REGISTRY[activeCameraId];
  const silicone = SILICONE_REGISTRY[activeSiliconeId];
  const battery = BATTERY_REGISTRY[activeBatteryId];

  return (
    <div className="absolute top-14 left-4 z-30 bg-[#0f172a]/95 backdrop-blur-md border border-cyan-500/40 rounded-xl p-4 shadow-2xl w-84 max-w-sm text-xs select-none max-h-[85vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5 mb-3">
        <div className="flex items-center space-x-2">
          {isCamera && <Camera className="w-4 h-4 text-cyan-400" />}
          {isSkin && <Shield className="w-4 h-4 text-rose-400" />}
          {isBattery && <Zap className="w-4 h-4 text-emerald-400" />}
          {isCompute && <Cpu className="w-4 h-4 text-blue-400" />}
          <div>
            <h3 className="font-bold text-white text-xs leading-tight">{selectedPart.name}</h3>
            <span className="text-[10px] text-cyan-400/80 uppercase tracking-wider font-mono">
              Layer: {selectedPart.layer}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto space-y-3.5 pr-1 flex-1">
        {/* ======================================================== */}
        {/* CAMERA MODULE EDITOR & HOT-SWAP                          */}
        {/* ======================================================== */}
        {isCamera && (
          <>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Select Eyeball Camera Module:
              </label>
              <select
                value={activeCameraId}
                onChange={(e) => onSwapCamera(e.target.value as CameraModelId)}
                className="w-full bg-[#1e293b] text-cyan-300 font-mono text-xs p-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {Object.values(CAMERA_REGISTRY).map((cam) => (
                  <option key={cam.id} value={cam.id} className="bg-[#0f172a] text-white">
                    {cam.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Camera Technical Datasheet */}
            <div className="bg-[#111827] rounded-lg p-2.5 border border-slate-800 space-y-1 font-mono text-[10px]">
              <div className="flex justify-between text-slate-400">
                <span>Manufacturer:</span>
                <span className="text-white">{camera.manufacturer}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Resolution:</span>
                <span className="text-cyan-300 font-bold">{camera.resolution[0]} × {camera.resolution[1]}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Max Frame Rate:</span>
                <span className="text-emerald-400 font-bold">{camera.maxFps} FPS</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Shutter Type:</span>
                <span className={`font-bold ${camera.shutterType === 'global' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {camera.shutterType.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>MIPI Bus Load:</span>
                <span className="text-white">{camera.mipiBandwidthGbps} Gbps ({Math.round(metrics.mipiBusSaturationPct)}%)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Sensor Power:</span>
                <span className="text-white">{camera.powerMw} mW</span>
              </div>
            </div>

            {/* Iris Aperture Slider */}
            <div className="bg-[#111827] rounded-lg p-2.5 border border-slate-800">
              <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                <span className="font-bold flex items-center gap-1 text-cyan-300">
                  <Sliders className="w-3 h-3" /> Nitinol Iris Pupil Aperture
                </span>
                <span className="font-mono text-cyan-400">{pupilApertureMm.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="7.0"
                step="0.1"
                value={pupilApertureMm}
                onChange={(e) => onChangePupilAperture(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                <span>2.0mm (f/{metrics.effectiveFocalRatio.toFixed(1)} / Sharp DoF)</span>
                <span>7.0mm (+{metrics.opticalThroughputGain.toFixed(1)}x Light / Low DoF)</span>
              </div>
            </div>

            {/* Stereo Vergence Target Distance */}
            <div className="bg-[#111827] rounded-lg p-2.5 border border-slate-800">
              <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                <span className="font-bold text-amber-300">Stereo Vergence Target Distance</span>
                <span className="font-mono text-white">{targetDistanceM.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.05"
                value={targetDistanceM}
                onChange={(e) => onChangeTargetDistance(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="text-[9px] text-slate-500 mt-1">
                Closer distance causes left & right 24mm eyeballs to cross inward toward center.
              </div>
            </div>
          </>
        )}

        {/* ======================================================== */}
        {/* SILICONE SKIN MATERIAL HOT-SWAP                          */}
        {/* ======================================================== */}
        {isSkin && (
          <>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Select Dermal Silicone Material:
              </label>
              <select
                value={activeSiliconeId}
                onChange={(e) => onSwapSilicone(e.target.value as SiliconeMaterialId)}
                className="w-full bg-[#1e293b] text-rose-300 font-mono text-xs p-2 rounded-lg border border-slate-700 focus:outline-none focus:border-rose-400 cursor-pointer"
              >
                {Object.values(SILICONE_REGISTRY).map((mat) => (
                  <option key={mat.id} value={mat.id} className="bg-[#0f172a] text-white">
                    {mat.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[10px] text-slate-300 leading-relaxed italic bg-[#111827] p-2 rounded border border-slate-800">
              {silicone.description}
            </p>

            {/* Silicone Mechanical Specs */}
            <div className="bg-[#111827] rounded-lg p-2.5 border border-slate-800 space-y-1 font-mono text-[10px]">
              <div className="flex justify-between text-slate-400">
                <span>Shore Hardness:</span>
                <span className="text-white font-bold">{silicone.shoreHardness}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Young's Modulus (E):</span>
                <span className="text-rose-300 font-bold">{silicone.youngsModulusMpa} MPa</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Servo Torque Multiplier:</span>
                <span className={`font-bold ${silicone.servoTorqueMultiplier > 2.0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {silicone.servoTorqueMultiplier}×
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Thermal Conductivity (k):</span>
                <span className="text-white">{silicone.thermalConductivityWPerMK} W/(m·K)</span>
              </div>
            </div>

            {/* Stall Warning */}
            {metrics.servoStallWarning && (
              <div className="bg-red-950/60 border border-red-500/50 rounded-lg p-2.5 animate-pulse text-red-300">
                <div className="flex items-center gap-1.5 font-bold text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>CRANIAL SERVO STALL WARNING</span>
                </div>
                <p className="text-[10px] mt-1 text-red-200">
                  {silicone.name} exceeds maximum pulling torque of the Bowden cable actuators. Stalled: {metrics.stalledServoNames.join(', ')}.
                </p>
              </div>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* BATTERY CORE HOT-SWAP                                    */}
        {/* ======================================================== */}
        {isBattery && (
          <>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Select 16S Power Core:
              </label>
              <select
                value={activeBatteryId}
                onChange={(e) => onSwapBattery(e.target.value as BatteryPackType)}
                className="w-full bg-[#1e293b] text-emerald-300 font-mono text-xs p-2 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                {Object.values(BATTERY_REGISTRY).map((bat) => (
                  <option key={bat.id} value={bat.id} className="bg-[#0f172a] text-white">
                    {bat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#111827] rounded-lg p-2.5 border border-slate-800 space-y-1 font-mono text-[10px]">
              <div className="flex justify-between text-slate-400">
                <span>Chemistry:</span><span className="text-white">{battery.chemistry}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Energy Capacity:</span><span className="text-emerald-300 font-bold">{battery.energyKwh} kWh</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Pack Weight:</span><span className="text-white">{battery.packWeightKg} kg</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Operating Runtime:</span><span className="text-cyan-300 font-bold">{metrics.batteryRuntimeHours.toFixed(1)} Hours</span>
              </div>
            </div>
          </>
        )}

        {/* ======================================================== */}
        {/* COOLANT FLOW RATE SLIDER                                 */}
        {/* ======================================================== */}
        <div className="bg-[#111827] rounded-lg p-2.5 border border-slate-800">
          <div className="flex justify-between text-[10px] text-slate-300 mb-1">
            <span className="font-bold flex items-center gap-1 text-cyan-300">
              <Thermometer className="w-3 h-3" /> Thoracic Coolant Pump Rate
            </span>
            <span className="font-mono text-cyan-400">{Math.round(coolantFlowFactor * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={coolantFlowFactor}
            onChange={(e) => onChangeCoolantFlow(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
            <span>Flow: {metrics.liquidCoolantFlowLpm.toFixed(1)} L/min</span>
            <span>Skull: {metrics.skullInternalTempC.toFixed(1)}°C</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* REAL-TIME CONSEQUENCE SUMMARY CARD                       */}
        {/* ======================================================== */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-lg p-3 border border-slate-700 space-y-1.5">
          <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">
            Multi-Physics Impact Cascade:
          </span>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="bg-[#111827]/80 p-1.5 rounded border border-slate-800">
              <div className="text-slate-500 text-[9px]">Total Robot Mass</div>
              <div className="text-white font-bold">{metrics.totalRobotMassKg.toFixed(1)} kg</div>
            </div>
            <div className="bg-[#111827]/80 p-1.5 rounded border border-slate-800">
              <div className="text-slate-500 text-[9px]">System Power Draw</div>
              <div className="text-amber-300 font-bold">{metrics.totalSystemPowerWatts.toFixed(0)} W</div>
            </div>
            <div className="bg-[#111827]/80 p-1.5 rounded border border-slate-800">
              <div className="text-slate-500 text-[9px]">Thoracic Core Temp</div>
              <div className={`font-bold ${metrics.thoracicCoreTempC > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {metrics.thoracicCoreTempC.toFixed(1)}°C
              </div>
            </div>
            <div className="bg-[#111827]/80 p-1.5 rounded border border-slate-800">
              <div className="text-slate-500 text-[9px]">Stability Margin</div>
              <div className="text-emerald-400 font-bold">{metrics.stabilityMarginMm.toFixed(0)} mm</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveModuleEditorPanel;
