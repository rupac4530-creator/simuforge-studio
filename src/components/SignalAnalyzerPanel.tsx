import React from 'react';
import { RFState, RFConfig, RFBand, RF_MATERIALS } from '../types/simulation';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Radio, Wifi, Signal, Activity, Zap, ShieldAlert, Cpu } from 'lucide-react';

interface SignalAnalyzerPanelProps {
  rfState: RFState;
  rfConfig: RFConfig;
  rssiHistory: { time: number; rssi: number; snr: number }[];
  onBandChange: (band: RFBand) => void;
  onTxPowerChange: (power: number) => void;
  onPathLossChange: (n: number) => void;
  onTxGainChange: (gain: number) => void;
  onRxGainChange: (gain: number) => void;
  onNoiseFigureChange: (nf: number) => void;
}

export const SignalAnalyzerPanel: React.FC<SignalAnalyzerPanelProps> = ({
  rfState,
  rfConfig,
  rssiHistory,
  onBandChange,
  onTxPowerChange,
  onPathLossChange,
  onTxGainChange,
  onRxGainChange,
  onNoiseFigureChange,
}) => {
  const getRssiColor = (rssi: number) => {
    if (rssi > -65) return 'text-emerald-400';
    if (rssi > -80) return 'text-amber-400';
    return 'text-rose-400';
  };

  const bands: { id: RFBand; label: string; freq: string }[] = [
    { id: '2.4GHz_WiFi', label: '2.4G Wi-Fi', freq: '2.412 GHz' },
    { id: '2.4GHz_BLE', label: 'BLE 5.0', freq: '2.402 GHz' },
    { id: '915MHz_LoRa', label: '915M LoRa', freq: '915 MHz' },
    { id: '5.8GHz_FPV', label: '5.8G FPV', freq: '5.800 GHz' },
  ];

  return (
    <aside className="w-72 bg-[#111827] border-l border-[#1e293b] flex flex-col h-full select-none shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="h-9 px-3 border-b border-[#1e293b] flex items-center justify-between text-xs font-semibold text-slate-300 bg-[#0f172a] shrink-0">
        <div className="flex items-center space-x-2">
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>RF SIGNAL PROPAGATION</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-mono">LIVE RX</span>
      </div>

      <div className="p-3 space-y-4">
        {/* Band Selector */}
        <div>
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Frequency Band
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {bands.map((b) => (
              <button
                key={b.id}
                onClick={() => onBandChange(b.id)}
                className={`p-2 rounded text-left transition-all border ${
                  rfConfig.band === b.id
                    ? 'bg-blue-600/20 border-blue-500/50 text-white font-medium'
                    : 'bg-[#0a0e17] border-[#1e293b] text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-semibold">{b.label}</div>
                <div className="text-[10px] text-slate-500 font-mono">{b.freq}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Live Gauges Grid */}
        <div className="grid grid-cols-2 gap-2 bg-[#0a0e17] p-2.5 rounded-lg border border-[#1e293b]">
          <div>
            <div className="text-[10px] text-slate-500 font-mono">RSSI</div>
            <div className={`text-base font-bold font-mono ${getRssiColor(rfState.rssi)}`}>
              {Math.round(rfState.rssi)} <span className="text-xs font-normal">dBm</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-500 font-mono">SNR</div>
            <div className="text-base font-bold font-mono text-cyan-400">
              {rfState.snr.toFixed(1)} <span className="text-xs font-normal">dB</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-500 font-mono">RTT LATENCY</div>
            <div className="text-sm font-semibold font-mono text-slate-200">
              {Math.round(rfState.latency)} <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-500 font-mono">PACKET LOSS</div>
            <div className={`text-sm font-semibold font-mono ${rfState.packetLoss > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {rfState.packetLoss.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Link Quality Progress Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Link Quality:</span>
            <span className="text-cyan-400 font-mono font-semibold">{Math.round(rfState.linkQuality)}%</span>
          </div>
          <div className="w-full bg-[#0a0e17] h-2 rounded-full overflow-hidden border border-[#1e293b]">
            <div
              className={`h-full transition-all duration-300 ${
                rfState.linkQuality > 70
                  ? 'bg-emerald-500'
                  : rfState.linkQuality > 40
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${rfState.linkQuality}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 flex justify-between">
            <span>Range: {rfState.distance.toFixed(2)}m</span>
            <span>NF: {rfConfig.noiseFigure}dB</span>
          </div>
        </div>

        {/* Real-time Oscilloscope LineChart */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>RF Waveform History</span>
            <span className="text-[9px] text-cyan-400 font-mono">RSSI (Blue) / SNR (Cyan)</span>
          </div>
          <div className="h-28 bg-[#0a0e17] rounded border border-[#1e293b] p-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rssiHistory}>
                <XAxis dataKey="time" hide />
                <YAxis domain={[-110, 0]} hide />
                <ReferenceLine y={-85} stroke="#f43f5e" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="rssi"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="snr"
                  stroke="#06b6d4"
                  strokeWidth={1.2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Editable RF Parameters */}
        <div className="space-y-2 bg-[#0a0e17] p-2.5 rounded-lg border border-[#1e293b]">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">RF Parameters</div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Tx Power:</span>
              <span className="text-white font-mono">{rfConfig.txPower} dBm</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={rfConfig.txPower}
              onChange={(e) => onTxPowerChange(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Path Loss Exp (n):</span>
              <span className="text-white font-mono">{rfConfig.pathLossExponent.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="2.0"
              max="4.5"
              step="0.1"
              value={rfConfig.pathLossExponent}
              onChange={(e) => onPathLossChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Tx Antenna Gain:</span>
              <span className="text-white font-mono">{rfConfig.txGain} dBi</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="1"
              value={rfConfig.txGain}
              onChange={(e) => onTxGainChange(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Rx Antenna Gain:</span>
              <span className="text-white font-mono">{rfConfig.rxGain} dBi</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="1"
              value={rfConfig.rxGain}
              onChange={(e) => onRxGainChange(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Noise Figure:</span>
              <span className="text-white font-mono">{rfConfig.noiseFigure} dB</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={rfConfig.noiseFigure}
              onChange={(e) => onNoiseFigureChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
        </div>

        {/* Wall Loss Intersections Table */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Obstacle Attenuation</span>
            <span className="text-[10px] text-amber-400 font-mono">
              -{rfState.wallLosses.reduce((acc, w) => acc + w.loss, 0)} dB total
            </span>
          </div>

          <div className="bg-[#0a0e17] rounded border border-[#1e293b] p-2 text-[11px] space-y-1">
            {rfState.wallLosses.length === 0 ? (
              <div className="text-emerald-400 font-mono flex items-center space-x-1">
                <span>✓ Clear Line-of-Sight (LOS)</span>
              </div>
            ) : (
              rfState.wallLosses.map((w, idx) => (
                <div key={idx} className="flex justify-between text-slate-300 font-mono">
                  <span>{w.material}</span>
                  <span className="text-rose-400">-{w.loss} dB</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Material Loss Reference Chart */}
        <div className="text-[10px] text-slate-500 font-mono space-y-0.5 pt-1">
          <div className="font-semibold text-slate-400 text-[11px]">Material Loss Reference:</div>
          <div className="flex justify-between"><span>Glass: 3 dB</span><span>Wood: 4 dB</span></div>
          <div className="flex justify-between"><span>Brick: 12 dB</span><span>Concrete: 25 dB</span></div>
          <div className="flex justify-between"><span>Metal: 45 dB (RF Shield)</span></div>
        </div>
      </div>
    </aside>
  );
};

export default SignalAnalyzerPanel;
