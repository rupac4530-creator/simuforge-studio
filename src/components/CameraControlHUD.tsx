import React from 'react';
import { CameraPreset } from '../types/simulation';
import {
  Camera,
  Eye,
  Crosshair,
  Move3d,
  ArrowUp,
  RotateCw,
  Maximize2,
  MonitorSpeaker,
  Box,
  Globe,
} from 'lucide-react';

interface CameraControlHUDProps {
  preset: CameraPreset;
  height: number;
  pitch: number;
  yaw: number;
  fov: number;
  onPresetChange: (p: CameraPreset) => void;
  onHeightChange: (h: number) => void;
  onPitchChange: (p: number) => void;
  onYawChange: (y: number) => void;
  onFovChange: (f: number) => void;
  showColliders: boolean;
  showCoM: boolean;
  showForces: boolean;
  showLidarRays: boolean;
  showRFHeatmap: boolean;
  showGrid: boolean;
  onToggle: (key: string, value: boolean) => void;
}

// ---- Preset buttons config ----
const PRESETS: { id: CameraPreset; label: string; icon: React.ReactNode }[] = [
  { id: 'orbit', label: 'Orbit', icon: <Globe size={14} /> },
  { id: 'top', label: 'Top', icon: <ArrowUp size={14} /> },
  { id: 'iso', label: 'Iso', icon: <Box size={14} /> },
  { id: 'chase', label: 'Chase', icon: <Move3d size={14} /> },
  { id: 'side', label: 'Side', icon: <MonitorSpeaker size={14} /> },
  { id: 'fpv', label: 'FPV', icon: <Eye size={14} /> },
];

// ---- Slider row helper ----
interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step, unit, onChange }) => (
  <div className="flex items-center gap-2">
    <span className="text-[11px] text-[#94a3b8] w-12 shrink-0">{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flex-1 h-1 accent-[#3b82f6] bg-[#1e293b] rounded cursor-pointer appearance-none
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6] [&::-webkit-slider-thumb]:cursor-pointer
        [&::-webkit-slider-track]:rounded [&::-webkit-slider-track]:bg-[#1e293b]"
    />
    <span className="text-[11px] text-[#e2e8f0] w-14 text-right font-mono tabular-nums">
      {value.toFixed(step < 1 ? 1 : 0)}{unit}
    </span>
  </div>
);

// ---- Toggle checkbox helper ----
interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none group">
    <div
      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
        checked
          ? 'bg-[#3b82f6] border-[#3b82f6]'
          : 'bg-transparent border-[#475569] group-hover:border-[#64748b]'
      }`}
      onClick={() => onChange(!checked)}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
    <span className="text-[11px] text-[#cbd5e1] group-hover:text-[#e2e8f0] transition-colors">{label}</span>
  </label>
);

// ==========================
// Main component
// ==========================
const CameraControlHUD: React.FC<CameraControlHUDProps> = ({
  preset,
  height,
  pitch,
  yaw,
  fov,
  onPresetChange,
  onHeightChange,
  onPitchChange,
  onYawChange,
  onFovChange,
  showColliders,
  showCoM,
  showForces,
  showLidarRays,
  showRFHeatmap,
  showGrid,
  onToggle,
}) => {
  return (
    <div className="absolute top-3 right-3 z-20 w-[240px] bg-black/60 backdrop-blur-md rounded-lg border border-[#1e293b]/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#1e293b]/50">
        <Camera size={13} className="text-[#3b82f6]" />
        <span className="text-[11px] font-semibold text-[#e2e8f0] uppercase tracking-wider">Camera</span>
      </div>

      {/* Preset buttons */}
      <div className="px-3 pt-2 pb-1">
        <div className="grid grid-cols-3 gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => onPresetChange(p.id)}
              className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium transition-all ${
                preset === p.id
                  ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20'
                  : 'bg-[#1e293b]/60 text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#e2e8f0]'
              }`}
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="px-3 py-2 space-y-1.5 border-t border-[#1e293b]/50">
        <SliderRow label="Height" value={height} min={0.2} max={10} step={0.1} unit="m" onChange={onHeightChange} />
        <SliderRow label="Pitch" value={pitch} min={-90} max={90} step={1} unit="°" onChange={onPitchChange} />
        <SliderRow label="Yaw" value={yaw} min={0} max={360} step={1} unit="°" onChange={onYawChange} />
        <SliderRow label="FOV" value={fov} min={30} max={120} step={1} unit="°" onChange={onFovChange} />
      </div>

      {/* Debug overlay toggles */}
      <div className="px-3 py-2 space-y-1.5 border-t border-[#1e293b]/50">
        <div className="flex items-center gap-1.5 mb-1">
          <Crosshair size={11} className="text-[#64748b]" />
          <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Overlays</span>
        </div>
        <ToggleRow label="Colliders" checked={showColliders} onChange={(v) => onToggle('colliders', v)} />
        <ToggleRow label="Center of Mass" checked={showCoM} onChange={(v) => onToggle('com', v)} />
        <ToggleRow label="Force Vectors" checked={showForces} onChange={(v) => onToggle('forces', v)} />
        <ToggleRow label="LiDAR Rays" checked={showLidarRays} onChange={(v) => onToggle('lidar', v)} />
        <ToggleRow label="RF Heatmap" checked={showRFHeatmap} onChange={(v) => onToggle('rf', v)} />
        <ToggleRow label="Ground Grid" checked={showGrid} onChange={(v) => onToggle('grid', v)} />
      </div>
    </div>
  );
};

export default CameraControlHUD;
