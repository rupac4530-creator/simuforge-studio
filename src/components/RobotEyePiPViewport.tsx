// ============================================================
// SimuForge Studio — Synthetic Robot Eye Picture-in-Picture (PiP)
// Real-time camera view from inside the 24 mm Bionic Eyeball
// Simulates: Rolling Shutter vs Global Shutter, Iris Dilation Exposure,
// Neuromorphic Event Streams, and Binocular Vergence Parallax
// ============================================================

import React, { useState } from 'react';
import { EyeballOpticsState, CameraModelId, BiomimeticConsequenceMetrics } from '../types/biomimetic';
import { CAMERA_REGISTRY } from '../engine/ComponentRegistry';
import { Camera, Eye, Maximize2, Minimize2, Radio, Crosshair, Sparkles } from 'lucide-react';

interface RobotEyePiPViewportProps {
  optics: EyeballOpticsState;
  onChangeEye: (eye: 'left' | 'right') => void;
  metrics: BiomimeticConsequenceMetrics;
  onToggleDepthMap: () => void;
}

export const RobotEyePiPViewport: React.FC<RobotEyePiPViewportProps> = ({
  optics,
  onChangeEye,
  metrics,
  onToggleDepthMap,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const activeCamera = CAMERA_REGISTRY[optics.selectedCameraId] || CAMERA_REGISTRY.imx219;
  const isLeft = optics.pipActiveEye === 'left';

  // Exposure brightness factor (derived from pupil dilation)
  const brightness = Math.min(1.8, Math.max(0.6, metrics.opticalThroughputGain * 0.25 + 0.5));
  const blurPx = metrics.depthOfFieldBlurPx;

  return (
    <div className={`absolute top-12 right-3 z-20 bg-[#0a0e17]/95 backdrop-blur-md border border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 select-none ${
      isMinimized ? 'w-48 h-8' : 'w-64 sm:w-72 h-48'
    }`}>
      {/* PiP Header */}
      <div className="h-8 bg-[#111827] border-b border-slate-800 px-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 font-bold text-cyan-300">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] tracking-wide uppercase">Bionic Eye View ({isLeft ? 'L' : 'R'})</span>
        </div>

        <div className="flex items-center space-x-1">
          {/* Eye Switcher */}
          {!isMinimized && (
            <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800 mr-1 text-[9px] font-mono">
              <button
                onClick={() => onChangeEye('left')}
                className={`px-1.5 py-0.5 rounded ${isLeft ? 'bg-cyan-600/40 text-cyan-300 font-bold' : 'text-slate-500 hover:text-white'}`}
              >
                L
              </button>
              <button
                onClick={() => onChangeEye('right')}
                className={`px-1.5 py-0.5 rounded ${!isLeft ? 'bg-cyan-600/40 text-cyan-300 font-bold' : 'text-slate-500 hover:text-white'}`}
              >
                R
              </button>
            </div>
          )}

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Viewport Canvas & Synthetic Optical Feed */}
      {!isMinimized && (
        <div className="relative w-full h-[calc(100%-2rem)] bg-[#05070c] overflow-hidden flex items-center justify-center">

          {/* SENSOR FILTER SIMULATION */}
          {/* 1. Prophesee Neuromorphic Event stream: Black background with green/cyan sparse spikes */}
          {activeCamera.shutterType === 'neuromorphic_event' ? (
            <div className="w-full h-full bg-black relative flex items-center justify-center">
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:8px_8px]" />
              <div className="absolute text-[10px] text-cyan-400 font-mono top-2 left-2 bg-black/60 px-1.5 py-0.5 rounded">
                NEUROMORPHIC EVENT STREAM (120dB D-RANGE)
              </div>
              <Crosshair className="w-12 h-12 text-cyan-500/40 animate-pulse" />
            </div>
          ) : activeCamera.shutterType === 'global' ? (
            /* 2. OmniVision OV9281 Global Shutter: Crisp high-speed monochrome */
            <div
              className="w-full h-full bg-slate-900 relative flex items-center justify-center grayscale contrast-125"
              style={{ filter: `brightness(${brightness}) blur(${blurPx * 0.3}px)` }}
            >
              {/* SLAM feature tracking crosshairs */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
              <Crosshair className="w-8 h-8 text-emerald-400/70" />
              <div className="absolute text-[9px] font-mono text-emerald-400 top-2 left-2 bg-black/70 px-1 rounded">
                GLOBAL SHUTTER — ZERO MOTION BLUR
              </div>
            </div>
          ) : (
            /* 3. Rolling Shutter RGB (Sony IMX219 / OV5640) */
            <div
              className="w-full h-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 relative flex items-center justify-center"
              style={{ filter: `brightness(${brightness}) blur(${blurPx * 0.4}px)` }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:14px_14px] opacity-15" />
              <Crosshair className="w-8 h-8 text-cyan-400/50" />

              {/* Rolling shutter skew lines if moving fast */}
              {metrics.rollingShutterDistortionPct > 10 && (
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/10 to-transparent animate-pulse" />
              )}
            </div>
          )}

          {/* Depth map point-cloud overlay (if toggled) */}
          {optics.showDepthMap && (
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 via-transparent to-purple-500/20 pointer-events-none mix-blend-color-dodge" />
          )}

          {/* Optical Telemetry OSD (On-Screen Display) */}
          <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-white/90 bg-black/70 px-2 py-0.5 rounded backdrop-blur-sm">
            <div>
              <span className="text-cyan-300">{activeCamera.name.split(' ')[1]}</span>
              <span className="text-slate-400 ml-1">f/{metrics.effectiveFocalRatio.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-amber-300">{activeCamera.maxFps} FPS</span>
              <span className="text-slate-400 ml-1.5">{optics.pupilApertureMm.toFixed(1)}mm</span>
            </div>
          </div>

          {/* Depth map button */}
          <button
            onClick={onToggleDepthMap}
            className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border transition-colors ${
              optics.showDepthMap ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-black/60 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            DEPTH
          </button>
        </div>
      )}
    </div>
  );
};

export default RobotEyePiPViewport;
