// ============================================================
// SimuForge Studio — Facial Expression & Audio2Face Studio
// FACS Action Units (32-DoF) + Phoneme Lip-Sync + Mechanical Strain Telemetry
// ============================================================

import React, { useState } from 'react';
import { FACSState, PhonemeId, BiomimeticConsequenceMetrics } from '../types/biomimetic';
import { Smile, Mic, AlertTriangle, Play, Sparkles, Sliders } from 'lucide-react';

interface FacialExpressionStudioProps {
  facs: FACSState;
  onChangeFACS: (facs: FACSState) => void;
  metrics: BiomimeticConsequenceMetrics;
  onTriggerPhoneme: (phoneme: PhonemeId) => void;
  isVisible: boolean;
  onToggleVisible: () => void;
}

export const FacialExpressionStudio: React.FC<FacialExpressionStudioProps> = ({
  facs,
  onChangeFACS,
  metrics,
  onTriggerPhoneme,
  isVisible,
  onToggleVisible,
}) => {
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisible}
        className="fixed bottom-4 left-44 z-40 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white px-3.5 py-2.5 rounded-full shadow-lg shadow-rose-500/30 flex items-center space-x-1.5 border border-rose-400/40 transition-transform hover:scale-105 text-xs font-semibold select-none"
        title="Open FACS Facial Expression & Audio2Face Studio"
      >
        <Smile className="w-4 h-4" />
        <span>FACS EXPRESSION STUDIO</span>
      </button>
    );
  }

  // Predefined FACS Emotion presets
  const applyPreset = (preset: 'smile' | 'surprise' | 'anger' | 'sadness' | 'neutral') => {
    switch (preset) {
      case 'smile':
        onChangeFACS({
          ...facs,
          au1_innerBrowRaiser: 0.1,
          au2_outerBrowRaiser: 0.1,
          au4_browLowerer: 0.0,
          au6_cheekRaiser: 0.8,
          au12_lipCornerPuller: 0.95, // Duchenne smile
          au25_lipsPart: 0.5,
          au26_jawDrop: 0.2,
        });
        break;
      case 'surprise':
        onChangeFACS({
          ...facs,
          au1_innerBrowRaiser: 0.9,
          au2_outerBrowRaiser: 0.9,
          au4_browLowerer: 0.0,
          au5_upperLidRaiser: 0.8,
          au6_cheekRaiser: 0.0,
          au12_lipCornerPuller: 0.0,
          au25_lipsPart: 0.8,
          au26_jawDrop: 0.85,
        });
        break;
      case 'anger':
        onChangeFACS({
          ...facs,
          au1_innerBrowRaiser: 0.0,
          au2_outerBrowRaiser: 0.0,
          au4_browLowerer: 0.95, // Corrugator furrow
          au5_upperLidRaiser: 0.0,
          au7_lidTightener: 0.8,
          au10_upperLipRaiser: 0.6,
          au12_lipCornerPuller: 0.0,
          au26_jawDrop: 0.1,
        });
        break;
      case 'sadness':
        onChangeFACS({
          ...facs,
          au1_innerBrowRaiser: 0.85,
          au2_outerBrowRaiser: 0.0,
          au4_browLowerer: 0.4,
          au15_lipCornerDepressor: 0.85,
          au17_chinRaiser: 0.6,
          au26_jawDrop: 0.05,
        });
        break;
      case 'neutral':
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

  // Play an automated sentence phoneme sequence
  const playSpeechPhonemes = async () => {
    if (isPlayingSpeech) return;
    setIsPlayingSpeech(true);
    const seq: PhonemeId[] = ['B_P_M', 'E', 'L_T', 'A', 'O', 'neutral'];
    for (const p of seq) {
      onTriggerPhoneme(p);
      await new Promise((r) => setTimeout(r, 220));
    }
    setIsPlayingSpeech(false);
  };

  const updateAU = (key: keyof FACSState, val: number) => {
    onChangeFACS({ ...facs, [key]: val });
  };

  return (
    <div className="fixed bottom-4 left-44 z-40 bg-[#0f172a]/95 backdrop-blur-md border border-rose-500/50 rounded-xl p-4 shadow-2xl w-80 text-xs select-none max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2.5">
        <div className="flex items-center space-x-1.5 font-bold text-rose-300">
          <Smile className="w-4 h-4 text-rose-400" />
          <span className="uppercase text-[11px] tracking-wide">FACS Cranial Studio (32 DoF)</span>
        </div>
        <button
          onClick={onToggleVisible}
          className="text-slate-400 hover:text-white p-0.5 rounded transition-colors text-sm"
        >
          ✕
        </button>
      </div>

      <div className="overflow-y-auto space-y-3 flex-1 pr-1">
        {/* Emotion Preset Chips */}
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
            FACS Emotion Presets:
          </span>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => applyPreset('smile')}
              className="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 border border-rose-800/60 rounded text-[10px] font-semibold text-center"
            >
              Smile
            </button>
            <button
              onClick={() => applyPreset('surprise')}
              className="px-2 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 border border-amber-800/60 rounded text-[10px] font-semibold text-center"
            >
              Surprise
            </button>
            <button
              onClick={() => applyPreset('anger')}
              className="px-2 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-200 border border-red-800/60 rounded text-[10px] font-semibold text-center"
            >
              Furrow
            </button>
            <button
              onClick={() => applyPreset('sadness')}
              className="px-2 py-1 bg-blue-950/40 hover:bg-blue-900/60 text-blue-200 border border-blue-800/60 rounded text-[10px] font-semibold text-center"
            >
              Sadness
            </button>
            <button
              onClick={() => applyPreset('neutral')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[10px] font-semibold text-center col-span-2"
            >
              Neutral Face
            </button>
          </div>
        </div>

        {/* Action Unit Sliders */}
        <div className="space-y-2 bg-[#111827] p-2.5 rounded-lg border border-slate-800">
          <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
            <Sliders className="w-3 h-3" /> Action Unit Controls:
          </span>

          <div>
            <div className="flex justify-between text-[9px] text-slate-300 mb-0.5">
              <span>AU12: Zygomaticus (Smile)</span>
              <span className="font-mono">{Math.round(facs.au12_lipCornerPuller * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={facs.au12_lipCornerPuller}
              onChange={(e) => updateAU('au12_lipCornerPuller', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-[9px] text-slate-300 mb-0.5">
              <span>AU4: Corrugator (Brow Furrow)</span>
              <span className="font-mono">{Math.round(facs.au4_browLowerer * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={facs.au4_browLowerer}
              onChange={(e) => updateAU('au4_browLowerer', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-[9px] text-slate-300 mb-0.5">
              <span>AU26: TMJ 4-Bar Jaw Drop</span>
              <span className="font-mono">{Math.round(facs.au26_jawDrop * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={facs.au26_jawDrop}
              onChange={(e) => updateAU('au26_jawDrop', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-[9px] text-slate-300 mb-0.5">
              <span>AU1/AU2: Frontalis (Brow Raiser)</span>
              <span className="font-mono">{Math.round(facs.au1_innerBrowRaiser * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={facs.au1_innerBrowRaiser}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeFACS({ ...facs, au1_innerBrowRaiser: val, au2_outerBrowRaiser: val });
              }}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
        </div>

        {/* Audio2Face Phoneme Lip-Sync */}
        <div className="bg-[#111827] p-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
              <Mic className="w-3 h-3" /> Audio2Face Lip-Sync:
            </span>
            <button
              onClick={playSpeechPhonemes}
              disabled={isPlayingSpeech}
              className="px-2 py-0.5 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 rounded text-[9px] font-bold flex items-center gap-1"
            >
              <Play className="w-2.5 h-2.5" />
              <span>TEST SPEECH</span>
            </button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['A', 'E', 'I', 'O', 'U', 'B_P_M', 'L_T'] as PhonemeId[]).map((p) => (
              <button
                key={p}
                onClick={() => onTriggerPhoneme(p)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[9px] font-mono border border-slate-700"
              >
                /{p}/
              </button>
            ))}
          </div>
        </div>

        {/* Mechanical Strain & Servo Stall Gauge */}
        <div className="bg-[#111827] p-2.5 rounded-lg border border-slate-800 space-y-1 font-mono text-[10px]">
          <div className="flex justify-between text-slate-400">
            <span>Peak Cable Tension:</span>
            <span className="text-white font-bold">{metrics.cranialCablePeakTensionN.toFixed(1)} N</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Skin Max Strain:</span>
            <span className="text-rose-400 font-bold">{metrics.maxSkinStrainPct.toFixed(1)}%</span>
          </div>

          {metrics.servoStallWarning && (
            <div className="flex items-center gap-1.5 text-red-400 font-bold text-[9px] mt-1 pt-1 border-t border-slate-800 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>STALL: Active skin elasticity exceeds servo torque!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacialExpressionStudio;
