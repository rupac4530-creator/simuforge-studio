// ============================================================
// SimuForge Studio — Layer Control Bar
// 4-Layer Concentric Anatomical Opacity & Dissection Controls
// ============================================================

import React from 'react';
import { LayerOpacityState } from '../types/biomimetic';
import { Layers, Eye, Shield, Activity, Flame, Grid, Sparkles } from 'lucide-react';

interface LayerControlBarProps {
  layers: LayerOpacityState;
  onChangeLayers: (layers: LayerOpacityState) => void;
  onSelectPreset: (preset: 'full' | 'dissection' | 'muscle' | 'core') => void;
}

export const LayerControlBar: React.FC<LayerControlBarProps> = ({
  layers,
  onChangeLayers,
  onSelectPreset,
}) => {
  const updateLayer = (key: keyof LayerOpacityState, value: any) => {
    onChangeLayers({ ...layers, [key]: value });
  };

  return (
    <div className="absolute top-14 right-4 z-30 bg-[#111827]/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl w-72 text-xs select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center space-x-1.5 font-bold text-cyan-400">
          <Layers className="w-4 h-4" />
          <span className="tracking-wide uppercase text-[11px]">Anatomical Layers (180 cm)</span>
        </div>
        <button
          onClick={() => updateLayer('xrayMode', !layers.xrayMode)}
          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
            layers.xrayMode
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
          }`}
          title="Enable X-Ray to click inside eyeball and skull"
        >
          X-RAY PICK
        </button>
      </div>

      {/* Layer Opacity Sliders */}
      <div className="space-y-2.5">
        {/* Layer 1: Skin */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-300 mb-1">
            <span className="font-semibold text-rose-300">L1: Integumentary (Skin/Hair)</span>
            <span className="font-mono">{Math.round(layers.integumentary * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={layers.integumentary}
            onChange={(e) => updateLayer('integumentary', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
          />
        </div>

        {/* Layer 2: Musculoskeletal */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-300 mb-1">
            <span className="font-semibold text-red-400">L2: Musculoskeletal (Bowden/Hydro)</span>
            <span className="font-mono">{Math.round(layers.musculoskeletal * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={layers.musculoskeletal}
            onChange={(e) => updateLayer('musculoskeletal', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>

        {/* Layer 3: Endoskeleton */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-300 mb-1">
            <span className="font-semibold text-slate-300">L3: Endoskeleton & Coolant</span>
            <span className="font-mono">{Math.round(layers.endoskeletal * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={layers.endoskeletal}
            onChange={(e) => updateLayer('endoskeletal', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
          />
        </div>

        {/* Layer 4: Electronics */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-300 mb-1">
            <span className="font-semibold text-cyan-300">L4: Bionic Eyes, Brain & Power</span>
            <span className="font-mono">{Math.round(layers.electronics * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={layers.electronics}
            onChange={(e) => updateLayer('electronics', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2 border-t border-slate-800">
        <button
          onClick={() => onSelectPreset('full')}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-medium border border-slate-700 text-center"
        >
          Full Clone
        </button>
        <button
          onClick={() => onSelectPreset('dissection')}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-medium border border-slate-700 text-center"
        >
          Dissection
        </button>
        <button
          onClick={() => onSelectPreset('muscle')}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-medium border border-slate-700 text-center"
        >
          Muscles
        </button>
        <button
          onClick={() => onSelectPreset('core')}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-medium border border-slate-700 text-center"
        >
          Bionic Core
        </button>
      </div>

      {/* Overlays Toggle */}
      <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-800">
        <button
          onClick={() => updateLayer('showThermalLoop', !layers.showThermalLoop)}
          className={`flex-1 py-1 px-1.5 rounded text-[9px] font-bold border flex items-center justify-center space-x-1 ${
            layers.showThermalLoop
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
          }`}
          title="Toggle liquid coolant loops"
        >
          <Flame className="w-3 h-3" />
          <span>COOLANT</span>
        </button>
        <button
          onClick={() => updateLayer('showStrainMap', !layers.showStrainMap)}
          className={`flex-1 py-1 px-1.5 rounded text-[9px] font-bold border flex items-center justify-center space-x-1 ${
            layers.showStrainMap
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
          }`}
          title="Toggle skin strain stress heatmap"
        >
          <Activity className="w-3 h-3" />
          <span>STRAIN</span>
        </button>
      </div>
    </div>
  );
};

export default LayerControlBar;
