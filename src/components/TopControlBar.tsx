import React from 'react';
import { SimState, VoiceCommand, VOICE_COMMANDS } from '../types/simulation';
import { Play, Pause, SkipForward, RotateCcw, Wifi, Bot, Layers, Cable, Box, BarChart3 } from 'lucide-react';

type ViewMode = 'simulator' | 'circuit' | 'dynamics';

interface TopControlBarProps {
  simState: SimState;
  simTime: number;
  simSpeed: number;
  dt: number;
  rfLinkQuality: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onVoiceCommand: (cmd: VoiceCommand) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const TopControlBar: React.FC<TopControlBarProps> = ({
  simState,
  simTime,
  simSpeed,
  dt,
  rfLinkQuality,
  onPlay,
  onPause,
  onStep,
  onReset,
  onSpeedChange,
  onVoiceCommand,
  viewMode,
  onViewModeChange,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 75) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (quality >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <header className="h-12 w-full bg-[#111827] border-b border-[#1e293b] px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Left: Branding + View Switcher */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-blue-400 font-bold tracking-wider text-sm bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-800/40">
          <Bot className="w-4 h-4 text-cyan-400" />
          <span className="text-white">SIMU<span className="text-blue-400">FORGE</span></span>
          <span className="text-xs px-1.5 py-0.2 bg-blue-500/20 text-cyan-300 rounded font-mono">STUDIO</span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-[#0a0e17] rounded-lg p-0.5 border border-[#1e293b]">
          <button
            onClick={() => onViewModeChange('simulator')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
              viewMode === 'simulator'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Box className="w-3 h-3" />
            <span>3D SIMULATOR</span>
          </button>
          <button
            onClick={() => onViewModeChange('circuit')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
              viewMode === 'circuit'
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Cable className="w-3 h-3" />
            <span>CIRCUIT EDITOR</span>
          </button>
          <button
            onClick={() => onViewModeChange('dynamics')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
              viewMode === 'dynamics'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>DYNAMICS</span>
          </button>
        </div>

        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-400 bg-[#0f172a] px-2 py-1 rounded border border-slate-800">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Hash V3 Humanoid (17-DOF)</span>
        </div>
      </div>

      {/* Center: Transport Controls & Speed */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center bg-[#0a0e17] rounded-lg p-0.5 border border-[#1e293b]">
          {simState === 'running' ? (
            <button
              onClick={onPause}
              title="Pause Simulation"
              className="flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all border border-amber-500/40"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE</span>
            </button>
          ) : (
            <button
              onClick={onPlay}
              title="Run Simulation"
              className="flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all border border-emerald-500/40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>PLAY</span>
            </button>
          )}

          <button
            onClick={onStep}
            title="Step dt (8ms)"
            className="p-1.5 px-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors text-xs flex items-center space-x-1"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">STEP</span>
          </button>

          <button
            onClick={onReset}
            title="Reset Robot & Simulation"
            className="p-1.5 px-2 hover:bg-slate-800 text-slate-300 hover:text-rose-400 rounded transition-colors text-xs flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESET</span>
          </button>
        </div>

        {/* Speed multiplier */}
        <div className="flex items-center space-x-1.5 text-xs bg-[#0a0e17] px-2 py-1 rounded-md border border-[#1e293b]">
          <span className="text-slate-400">Speed:</span>
          <select
            value={simSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="bg-transparent text-cyan-400 font-mono text-xs focus:outline-none cursor-pointer"
          >
            <option value={0.1} className="bg-[#111827]">0.1x</option>
            <option value={0.25} className="bg-[#111827]">0.25x</option>
            <option value={0.5} className="bg-[#111827]">0.5x</option>
            <option value={1.0} className="bg-[#111827]">1.0x</option>
            <option value={2.0} className="bg-[#111827]">2.0x</option>
            <option value={5.0} className="bg-[#111827]">5.0x</option>
          </select>
        </div>

        {/* Timestep & Clock */}
        <div className="hidden lg:flex items-center space-x-2 font-mono text-xs text-slate-400 bg-[#0a0e17] px-2.5 py-1 rounded-md border border-[#1e293b]">
          <span className="text-slate-500">dt:</span>
          <span className="text-slate-300">{Math.round(dt * 1000)}ms</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">T:</span>
          <span className="text-cyan-300">{formatTime(simTime)}</span>
        </div>
      </div>

      {/* Right: Voice Command & RF Badge */}
      <div className="flex items-center space-x-3">
        {/* Voice Command Quick Trigger */}
        <div className="flex items-center space-x-1.5 bg-[#0a0e17] px-2 py-1 rounded-md border border-[#1e293b]">
          <span className="text-xs text-slate-400 hidden sm:inline">Voice Cmd:</span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onVoiceCommand(e.target.value as VoiceCommand);
                e.target.value = '';
              }
            }}
            className="bg-transparent text-amber-300 font-medium text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
          >
            <option value="" disabled className="bg-[#111827]">⚡ Trigger Gesture...</option>
            {VOICE_COMMANDS.map((cmd) => (
              <option key={cmd} value={cmd} className="bg-[#111827] text-white">
                {cmd}
              </option>
            ))}
          </select>
        </div>

        {/* RF Signal Link Status */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-xs font-mono ${getQualityColor(rfLinkQuality)}`}>
          <Wifi className="w-3.5 h-3.5" />
          <span>{Math.round(rfLinkQuality)}%</span>
        </div>
      </div>
    </header>
  );
};

export default TopControlBar;
