// ============================================================
// SimuForge Studio — Dynamics Analyzer Panel (v2)
// Professional MuJoCo/Drake/Gazebo-quality physics dashboard
// World stats, energy monitor, joint inspector, contact forces,
// stability analysis, link mass table, motor feedback
// ============================================================

import React, { useMemo, useState } from 'react';
import { ServoName, SERVO_NAMES } from '../types/simulation';
import { DynamicsState, Vec3 } from '../engine/DynamicsEngine';
import { SensorState } from '../engine/SensorSuite';
import {
  Activity, Gauge, Footprints, Zap, AlertTriangle,
  Battery, Cpu, ArrowDown, Circle, BarChart3,
  Thermometer, Eye, Layers, Box, Target, Info
} from 'lucide-react';

interface DynamicsAnalyzerPanelProps {
  dynamics: DynamicsState | null;
  sensors: SensorState | null;
  simTime: number;
  isVisible: boolean;
}

// ================== HELPERS ==================

const fN = (n: number, d = 2) => n.toFixed(d);
const fMm = (m: number) => (m * 1000).toFixed(1);

function torqueColor(t: number): string {
  const a = Math.abs(t);
  if (a < 0.02) return '#22c55e';
  if (a < 0.06) return '#eab308';
  if (a < 0.10) return '#f97316';
  return '#ef4444';
}

function limitColor(prox: number): string {
  if (prox < 0.5) return '#22c55e';
  if (prox < 0.75) return '#eab308';
  if (prox < 0.9) return '#f97316';
  return '#ef4444';
}

function tempColor(t: number): string {
  if (t < 35) return '#22c55e';
  if (t < 45) return '#eab308';
  if (t < 55) return '#f97316';
  return '#ef4444';
}

const phaseInfo: Record<string, { label: string; color: string; icon: string }> = {
  double_support: { label: 'DOUBLE SUPPORT', color: '#22c55e', icon: '◼◼' },
  left_stance:    { label: 'LEFT STANCE',    color: '#3b82f6', icon: '◼◻' },
  right_stance:   { label: 'RIGHT STANCE',   color: '#8b5cf6', icon: '◻◼' },
  flight:         { label: 'FLIGHT',         color: '#ef4444', icon: '◻◻' },
};

// ================== SUB-TABS ==================
type TabId = 'overview' | 'joints' | 'contacts' | 'energy';

// ================== COMPONENT ==================

export const DynamicsAnalyzerPanel: React.FC<DynamicsAnalyzerPanelProps> = ({
  dynamics, sensors, simTime, isVisible,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  if (!isVisible || !dynamics || !sensors) return null;

  const phase = phaseInfo[dynamics.gaitPhase] || phaseInfo.flight;
  const stabilityPct = Math.min(100, (dynamics.stabilityMargin / 0.03) * 100);

  // Sort servos by absolute torque
  const sortedTorques = useMemo(() =>
    SERVO_NAMES.map(n => ({
      name: n,
      torque: dynamics.jointTorques[n] || 0,
      state: dynamics.jointStates[n],
      motor: sensors.motorFeedback[n],
    })).sort((a, b) => Math.abs(b.torque) - Math.abs(a.torque)),
  [dynamics.jointTorques, dynamics.jointStates, sensors.motorFeedback]);

  const maxTq = Math.max(0.01, ...sortedTorques.map(s => Math.abs(s.torque)));

  // Support polygon SVG
  const polySvg = useMemo(() => {
    if (dynamics.supportPolygon.length < 2) return null;
    const all = [...dynamics.supportPolygon, dynamics.comProjection, dynamics.zmp];
    const xs = all.map(p => p[0]), zs = all.map(p => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const range = Math.max(0.15, Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) * 1.4;
    const scale = 180 / range;
    const toSvg = (p: [number, number]): [number, number] => [
      100 + (p[0] - cx) * scale, 100 - (p[1] - cz) * scale,
    ];
    return { toSvg };
  }, [dynamics.supportPolygon, dynamics.comProjection, dynamics.zmp]);

  const footCorners = useMemo(() => {
    const pts: { pos: [number, number]; side: string }[] = [];
    if (dynamics.leftFootContact.inContact)
      dynamics.leftFootContact.corners.forEach(c => pts.push({ pos: [c[0], c[2]], side: 'L' }));
    if (dynamics.rightFootContact.inContact)
      dynamics.rightFootContact.corners.forEach(c => pts.push({ pos: [c[0], c[2]], side: 'R' }));
    return pts;
  }, [dynamics.leftFootContact, dynamics.rightFootContact]);

  // Link mass entries sorted by mass
  const linkEntries = useMemo(() =>
    Object.entries(dynamics.linkCoMs)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.mass - a.mass),
  [dynamics.linkCoMs]);

  // ================== WORLD STATS BAR (Gazebo-style) ==================
  const WorldStatsBar = () => (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-[#0f172a] border-b border-slate-700 text-[10px] font-mono text-slate-400 flex-wrap">
      <span className="text-slate-500 mr-1">SOLVER:</span>
      <span className="text-cyan-300">{dynamics.solverType}</span>
      <span className="text-slate-600 mx-1">│</span>
      <span className="text-slate-500">CONTACT:</span>
      <span className="text-cyan-300">{dynamics.contactModel}</span>
      <span className="text-slate-600 mx-1">│</span>
      <span className="text-slate-500">COORD:</span>
      <span className="text-cyan-300">{dynamics.coordinateFormulation}</span>
      <span className="text-slate-600 mx-1">│</span>
      <span className="text-slate-500">BODIES:</span>
      <span className="text-white">{dynamics.bodyCount}</span>
      <span className="text-slate-600 mx-1">│</span>
      <span className="text-slate-500">DOF:</span>
      <span className="text-white">{dynamics.dofCount}</span>
      <span className="text-slate-600 mx-1">│</span>
      <span className="text-slate-500">MASS:</span>
      <span className="text-white">{fN(dynamics.totalMass * 1000, 0)}g</span>
      <span className="text-slate-600 mx-1">│</span>
      <span className="text-slate-500">STEP:</span>
      <span className="text-amber-300">#{dynamics.stepCount}</span>
      <span className="text-slate-600 mx-1">│</span>
      <span className="text-slate-500">T:</span>
      <span className="text-cyan-300">{fN(simTime, 2)}s</span>
      <span className="text-slate-600 mx-1">│</span>
      <span className="text-slate-500">CONTACTS:</span>
      <span className={dynamics.contactCount > 0 ? 'text-emerald-400' : 'text-red-400'}>{dynamics.contactCount}</span>
      <span className="text-slate-600 mx-1">│</span>
      <span className="text-slate-500">Σ|τ|:</span>
      <span className="text-orange-300">{fN(dynamics.totalTorqueMagnitude, 4)} N·m</span>
    </div>
  );

  // ================== TAB BAR ==================
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Eye className="w-3 h-3" /> },
    { id: 'joints',   label: 'Joint Inspector', icon: <Layers className="w-3 h-3" /> },
    { id: 'contacts', label: 'Contacts & Stability', icon: <Target className="w-3 h-3" /> },
    { id: 'energy',   label: 'Energy & Power', icon: <Zap className="w-3 h-3" /> },
  ];

  // ================== RENDER ==================
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0e17]">
      {/* World Stats Bar */}
      <WorldStatsBar />

      {/* Tab Bar */}
      <div className="flex items-center gap-0.5 px-3 py-1 bg-[#111827] border-b border-slate-700">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
        {/* Fall alert in tab bar */}
        {!dynamics.isStable && (
          <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 bg-red-950/60 border border-red-500/50 rounded animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] font-bold text-red-400">FALL RISK</span>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'overview' && <OverviewTab dynamics={dynamics} sensors={sensors} simTime={simTime}
          phase={phase} stabilityPct={stabilityPct} polySvg={polySvg} footCorners={footCorners} linkEntries={linkEntries} />}
        {activeTab === 'joints' && <JointsTab sortedTorques={sortedTorques} maxTq={maxTq} sensors={sensors} />}
        {activeTab === 'contacts' && <ContactsTab dynamics={dynamics} sensors={sensors}
          polySvg={polySvg} footCorners={footCorners} stabilityPct={stabilityPct} phase={phase} />}
        {activeTab === 'energy' && <EnergyTab dynamics={dynamics} sensors={sensors} />}
      </div>
    </div>
  );
};

// ================== OVERVIEW TAB ==================

function OverviewTab({ dynamics, sensors, simTime, phase, stabilityPct, polySvg, footCorners, linkEntries }: any) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Col 1: Stability + Gait + CoM */}
      <div className="space-y-3">
        {/* Stability Gauge */}
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Stability</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#1e293b" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none"
                  stroke={dynamics.isStable ? '#22c55e' : '#ef4444'}
                  strokeWidth="3" strokeDasharray={`${stabilityPct * 0.88} 88`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${dynamics.isStable ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stabilityPct.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="text-[10px] space-y-0.5">
              <div className="text-slate-400">Margin: <span className="text-white font-mono">{fMm(dynamics.stabilityMargin)} mm</span></div>
              <div className="text-slate-400">Contacts: <span className="text-white font-mono">{dynamics.contactCount}</span></div>
              <div className="text-slate-400">GRF: <span className="text-white font-mono">{fN(dynamics.totalContactForce, 1)} N</span></div>
              <div className={`font-bold ${dynamics.isStable ? 'text-emerald-400' : 'text-red-400 animate-pulse'}`}>
                {dynamics.isStable ? '✓ STABLE' : '⚠ UNSTABLE'}
              </div>
            </div>
          </div>
        </div>

        {/* Gait Phase */}
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Footprints className="w-4 h-4 text-violet-400" />
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Gait Phase</span>
          </div>
          <div className="text-lg font-mono mb-1" style={{ color: phase.color }}>{phase.icon}</div>
          <div className="text-xs font-bold" style={{ color: phase.color }}>{phase.label}</div>
          <div className="text-[10px] text-slate-400 mt-1 grid grid-cols-2 gap-x-2">
            <div>L: <span className={dynamics.leftFootContact.inContact ? 'text-emerald-400' : 'text-slate-500'}>
              {dynamics.leftFootContact.inContact ? `${fN(dynamics.leftFootContact.normalForce, 1)}N` : 'OFF'}
            </span></div>
            <div>R: <span className={dynamics.rightFootContact.inContact ? 'text-emerald-400' : 'text-slate-500'}>
              {dynamics.rightFootContact.inContact ? `${fN(dynamics.rightFootContact.normalForce, 1)}N` : 'OFF'}
            </span></div>
          </div>
        </div>

        {/* Center of Mass */}
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Circle className="w-4 h-4 text-yellow-400" />
            <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Center of Mass</span>
          </div>
          <div className="text-[10px] font-mono space-y-0.5">
            <div className="grid grid-cols-3 gap-1">
              <div className="text-slate-400">X: <span className="text-white">{fN(dynamics.com[0]*1000,1)}</span></div>
              <div className="text-slate-400">Y: <span className="text-white">{fN(dynamics.com[1]*1000,1)}</span></div>
              <div className="text-slate-400">Z: <span className="text-white">{fN(dynamics.com[2]*1000,1)}</span></div>
            </div>
            <div className="text-slate-500 text-[9px]">Velocity: [{fN(dynamics.comVelocity[0],3)}, {fN(dynamics.comVelocity[1],3)}, {fN(dynamics.comVelocity[2],3)}] m/s</div>
            <div className="border-t border-slate-800 pt-0.5 mt-0.5 grid grid-cols-2 gap-1">
              <div className="text-slate-500">ZMP X: <span className="text-cyan-300">{fN(dynamics.zmp[0]*1000,1)}</span></div>
              <div className="text-slate-500">ZMP Z: <span className="text-cyan-300">{fN(dynamics.zmp[1]*1000,1)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Col 2: Support Polygon + IMU */}
      <div className="space-y-3">
        {/* Support Polygon */}
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Support Polygon (XZ)</span>
          </div>
          <svg viewBox="0 0 200 200" className="w-full bg-[#0a0e17] rounded border border-slate-800">
            <line x1="100" y1="0" x2="100" y2="200" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4,4" />
            <line x1="0" y1="100" x2="200" y2="100" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4,4" />
            <text x="190" y="110" fill="#475569" fontSize="7" textAnchor="end">X</text>
            <text x="105" y="12" fill="#475569" fontSize="7">Z</text>
            {polySvg && dynamics.supportPolygon.length >= 3 && (
              <>
                <polygon
                  points={dynamics.supportPolygon.map((p: [number,number]) => polySvg.toSvg(p).join(',')).join(' ')}
                  fill={dynamics.isStable ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}
                  stroke={dynamics.isStable ? '#22c55e' : '#ef4444'} strokeWidth="1.5" />
                {footCorners.map((fc: any, i: number) => {
                  const [sx, sy] = polySvg.toSvg(fc.pos);
                  return <circle key={i} cx={sx} cy={sy} r="2.5"
                    fill={fc.side === 'L' ? '#3b82f6' : '#8b5cf6'} stroke="#0f172a" strokeWidth="0.5" />;
                })}
                {(() => {
                  const [cx, cy] = polySvg.toSvg(dynamics.comProjection);
                  return (<>
                    <circle cx={cx} cy={cy} r="5" fill="rgba(234,179,8,0.3)" stroke="#eab308" strokeWidth="1.5" />
                    <circle cx={cx} cy={cy} r="2" fill="#eab308" />
                    <text x={cx+8} y={cy+3} fill="#eab308" fontSize="7" fontWeight="bold">CoM</text>
                  </>);
                })()}
                {(() => {
                  const [zx, zy] = polySvg.toSvg(dynamics.zmp);
                  return (<>
                    <circle cx={zx} cy={zy} r="3" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="2,2" />
                    <circle cx={zx} cy={zy} r="1.5" fill="#06b6d4" />
                  </>);
                })()}
              </>
            )}
            {dynamics.supportPolygon.length < 3 && (
              <text x="100" y="105" fill="#ef4444" fontSize="10" textAnchor="middle" fontWeight="bold">NO GROUND CONTACT</text>
            )}
            <circle cx="10" cy="185" r="3" fill="#eab308" /><text x="16" y="188" fill="#94a3b8" fontSize="6">CoM</text>
            <circle cx="45" cy="185" r="3" fill="#06b6d4" /><text x="51" y="188" fill="#94a3b8" fontSize="6">ZMP</text>
            <circle cx="80" cy="185" r="3" fill="#3b82f6" /><text x="86" y="188" fill="#94a3b8" fontSize="6">L</text>
            <circle cx="100" cy="185" r="3" fill="#8b5cf6" /><text x="106" y="188" fill="#94a3b8" fontSize="6">R</text>
          </svg>
        </div>

        {/* IMU */}
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">IMU (MPU6050)</span>
            <span className="ml-auto text-[9px] font-mono" style={{ color: tempColor(sensors.imu.temperature) }}>
              {fN(sensors.imu.temperature, 1)}°C
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono">
            <div className="text-slate-500 col-span-2 border-b border-slate-800 pb-0.5">ACCEL (m/s²) — rest: [0, +9.81, 0]</div>
            <div>aX: <span className="text-cyan-300">{fN(sensors.imu.accelX)}</span></div>
            <div>aY: <span className="text-emerald-300">{fN(sensors.imu.accelY)}</span></div>
            <div>aZ: <span className="text-violet-300">{fN(sensors.imu.accelZ)}</span></div>
            <div className="text-slate-600">|a|={fN(sensors.imu.accelMagnitude)}</div>
            <div className="text-slate-500 col-span-2 border-b border-slate-800 pb-0.5 mt-0.5">GYRO (rad/s)</div>
            <div>ωX: <span className="text-cyan-300">{fN(sensors.imu.gyroX, 4)}</span></div>
            <div>ωY: <span className="text-emerald-300">{fN(sensors.imu.gyroY, 4)}</span></div>
            <div>ωZ: <span className="text-violet-300">{fN(sensors.imu.gyroZ, 4)}</span></div>
            <div></div>
            <div className="text-slate-500 col-span-2 border-b border-slate-800 pb-0.5 mt-0.5">FUSED (complementary α=0.98)</div>
            <div>Roll: <span className="text-amber-300">{fN(sensors.imu.roll, 1)}°</span></div>
            <div>Pitch: <span className="text-amber-300">{fN(sensors.imu.pitch, 1)}°</span></div>
            <div className="col-span-2">Yaw: <span className="text-amber-300">{fN(sensors.imu.yaw, 1)}°</span></div>
          </div>
        </div>
      </div>

      {/* Col 3: Link Mass Table + Quick Torque */}
      <div className="space-y-3">
        {/* Link Mass Inspector (MuJoCo-style) */}
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Box className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link Bodies ({dynamics.bodyCount})</span>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left py-0.5 pr-1">Body</th>
                  <th className="text-right py-0.5 px-1">Mass(g)</th>
                  <th className="text-right py-0.5 px-1">Y(mm)</th>
                  <th className="text-right py-0.5">%</th>
                </tr>
              </thead>
              <tbody>
                {linkEntries.map((l: any) => (
                  <tr key={l.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="text-slate-300 py-0.5 pr-1">{l.id}</td>
                    <td className="text-white text-right px-1">{fN(l.mass * 1000, 0)}</td>
                    <td className="text-cyan-300 text-right px-1">{fN(l.position[1] * 1000, 1)}</td>
                    <td className="text-slate-400 text-right">{fN((l.mass / dynamics.totalMass) * 100, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Energy */}
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Energy</span>
          </div>
          <div className="space-y-1.5 text-[10px]">
            <EnergyBar label="Potential" value={dynamics.potentialEnergy} max={dynamics.totalEnergy * 1.2 || 1} color="#3b82f6" />
            <EnergyBar label="Kinetic" value={dynamics.kineticEnergy} max={dynamics.totalEnergy * 1.2 || 1} color="#f97316" />
            <div className="flex justify-between border-t border-slate-700 pt-1 mt-1">
              <span className="text-slate-400">Total</span>
              <span className="text-white font-mono font-bold">{fN(dynamics.totalEnergy, 4)} J</span>
            </div>
          </div>
        </div>

        {/* Quick Power */}
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Battery className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Power</span>
          </div>
          <div className="text-[10px] space-y-0.5">
            <div className="flex justify-between text-slate-400"><span>Draw</span><span className="text-white font-mono">{fN(sensors.power.totalWatts)} W</span></div>
            <div className="flex justify-between text-slate-400"><span>Current</span><span className="text-white font-mono">{fN(sensors.power.totalCurrentAmps)} A</span></div>
            <div className="flex justify-between text-slate-400"><span>Battery</span>
              <span className="font-mono" style={{ color: sensors.power.batteryPercentage > 30 ? '#22c55e' : '#ef4444' }}>
                {fN(sensors.power.batteryVoltage, 2)}V ({fN(sensors.power.batteryPercentage, 0)}%)
              </span>
            </div>
            <div className="flex justify-between text-slate-400"><span>Runtime</span>
              <span className={`font-mono font-bold ${sensors.power.estimatedRuntimeMin < 30 ? 'text-red-400' : 'text-emerald-400'}`}>
                {sensors.power.estimatedRuntimeMin > 500 ? '>8hr' : `${fN(sensors.power.estimatedRuntimeMin, 0)} min`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================== JOINTS TAB (MuJoCo-style Joint Inspector) ==================

function JointsTab({ sortedTorques, maxTq, sensors }: any) {
  return (
    <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-orange-400" />
        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
          Joint State Inspector — 17 DOF
        </span>
        <span className="ml-auto text-[9px] text-slate-500 font-mono">max|τ|={fN(maxTq, 4)} N·m</span>
      </div>

      {/* Table Header */}
      <div className="grid text-[9px] font-mono text-slate-500 border-b border-slate-700 pb-1 mb-1"
        style={{ gridTemplateColumns: '120px 50px 1fr 55px 45px 40px 45px 40px' }}>
        <span>Joint</span>
        <span className="text-right">Angle°</span>
        <span className="text-center">Torque</span>
        <span className="text-right">τ (N·m)</span>
        <span className="text-right">Power</span>
        <span className="text-right">Limit</span>
        <span className="text-right">Vel°/s</span>
        <span className="text-right">Temp</span>
      </div>

      {/* Joint Rows */}
      <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
        {sortedTorques.map(({ name, torque, state, motor }: any) => {
          const pct = (Math.abs(torque) / maxTq) * 100;
          const tc = torqueColor(torque);
          const lc = limitColor(state?.limitProximity || 0);
          const limPct = ((state?.limitProximity || 0) * 100);
          return (
            <div key={name} className="grid items-center text-[10px] py-0.5 hover:bg-slate-800/30 rounded"
              style={{ gridTemplateColumns: '120px 50px 1fr 55px 45px 40px 45px 40px' }}>
              <span className="text-slate-300 font-mono truncate">{name}</span>
              <span className="text-white font-mono text-right">{fN(state?.angle || 90, 1)}</span>
              {/* Torque bar */}
              <div className="h-3 bg-[#1e293b] rounded-sm overflow-hidden mx-1">
                <div className="h-full rounded-sm transition-all duration-150"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: tc }} />
              </div>
              <span className="font-mono text-right" style={{ color: tc }}>
                {torque >= 0 ? '+' : ''}{fN(torque, 4)}
              </span>
              <span className="text-slate-300 font-mono text-right">{fN(state?.power || 0, 2)}W</span>
              {/* Limit indicator */}
              <div className="flex items-center justify-end gap-0.5">
                <div className="w-3 h-3 rounded-sm border" style={{
                  borderColor: lc,
                  backgroundColor: limPct > 85 ? lc + '40' : 'transparent',
                }} />
                <span className="font-mono text-[9px]" style={{ color: lc }}>{fN(limPct, 0)}</span>
              </div>
              <span className="text-slate-400 font-mono text-right">{fN(state?.velocity || 0, 0)}</span>
              <span className="font-mono text-right" style={{ color: tempColor(motor?.temperature || 30) }}>
                {fN(motor?.temperature || 30, 0)}°
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-700 text-[9px] text-slate-500">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#22c55e]" /> Low load</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#eab308]" /> Moderate</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#f97316]" /> High</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#ef4444]" /> Overloaded</div>
        <span className="ml-auto">Limit: 0%=centered, 100%=at mechanical stop</span>
      </div>
    </div>
  );
}

// ================== CONTACTS & STABILITY TAB ==================

function ContactsTab({ dynamics, sensors, polySvg, footCorners, stabilityPct, phase }: any) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Left: Large Support Polygon */}
      <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Support Polygon — Ground Projection</span>
        </div>
        <svg viewBox="0 0 200 200" className="w-full aspect-square bg-[#0a0e17] rounded border border-slate-800">
          {/* Grid */}
          {[25,50,75,100,125,150,175].map(v => (
            <React.Fragment key={v}>
              <line x1={v} y1="0" x2={v} y2="200" stroke="#1e293b" strokeWidth="0.3" />
              <line x1="0" y1={v} x2="200" y2={v} stroke="#1e293b" strokeWidth="0.3" />
            </React.Fragment>
          ))}
          <line x1="100" y1="0" x2="100" y2="200" stroke="#334155" strokeWidth="0.5" strokeDasharray="4,4" />
          <line x1="0" y1="100" x2="200" y2="100" stroke="#334155" strokeWidth="0.5" strokeDasharray="4,4" />
          <text x="195" y="110" fill="#475569" fontSize="8" textAnchor="end">+X</text>
          <text x="108" y="10" fill="#475569" fontSize="8">+Z</text>

          {polySvg && dynamics.supportPolygon.length >= 3 && (
            <>
              <polygon
                points={dynamics.supportPolygon.map((p: [number,number]) => polySvg.toSvg(p).join(',')).join(' ')}
                fill={dynamics.isStable ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'}
                stroke={dynamics.isStable ? '#22c55e' : '#ef4444'} strokeWidth="2" />
              {footCorners.map((fc: any, i: number) => {
                const [sx, sy] = polySvg.toSvg(fc.pos);
                return <circle key={i} cx={sx} cy={sy} r="3"
                  fill={fc.side === 'L' ? '#3b82f6' : '#8b5cf6'} stroke="#0f172a" strokeWidth="0.5" />;
              })}
              {(() => {
                const [cx, cy] = polySvg.toSvg(dynamics.comProjection);
                return (<>
                  <circle cx={cx} cy={cy} r="6" fill="rgba(234,179,8,0.2)" stroke="#eab308" strokeWidth="1.5" />
                  <circle cx={cx} cy={cy} r="2.5" fill="#eab308" />
                  <line x1={cx} y1={cy} x2={cx} y2={cy+20} stroke="#eab308" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />
                  <text x={cx+10} y={cy-2} fill="#eab308" fontSize="8" fontWeight="bold">CoM</text>
                </>);
              })()}
              {(() => {
                const [zx, zy] = polySvg.toSvg(dynamics.zmp);
                return (<>
                  <circle cx={zx} cy={zy} r="4" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3,2" />
                  <circle cx={zx} cy={zy} r="2" fill="#06b6d4" />
                  <text x={zx+8} y={zy-2} fill="#06b6d4" fontSize="7">ZMP</text>
                </>);
              })()}
              {/* CoP */}
              {sensors.footPressure.leftForceN + sensors.footPressure.rightForceN > 0.1 && (() => {
                const cop: [number, number] = [sensors.footPressure.copX, sensors.footPressure.copZ];
                const [cpx, cpy] = polySvg.toSvg(cop);
                return (<>
                  <rect x={cpx-3} y={cpy-3} width="6" height="6" fill="none" stroke="#f472b6" strokeWidth="1" transform={`rotate(45 ${cpx} ${cpy})`} />
                  <text x={cpx+8} y={cpy+3} fill="#f472b6" fontSize="7">CoP</text>
                </>);
              })()}
            </>
          )}
          {dynamics.supportPolygon.length < 3 && (
            <text x="100" y="105" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="bold">NO GROUND CONTACT</text>
          )}
          {/* Legend */}
          <circle cx="10" cy="188" r="2.5" fill="#eab308" /><text x="16" y="191" fill="#94a3b8" fontSize="6">CoM</text>
          <circle cx="42" cy="188" r="2.5" fill="#06b6d4" /><text x="48" y="191" fill="#94a3b8" fontSize="6">ZMP</text>
          <rect x="72" y="185.5" width="5" height="5" fill="none" stroke="#f472b6" strokeWidth="0.7" transform="rotate(45 74.5 188)" />
          <text x="82" y="191" fill="#94a3b8" fontSize="6">CoP</text>
          <circle cx="105" cy="188" r="2.5" fill="#3b82f6" /><text x="111" y="191" fill="#94a3b8" fontSize="6">L</text>
          <circle cx="125" cy="188" r="2.5" fill="#8b5cf6" /><text x="131" y="191" fill="#94a3b8" fontSize="6">R</text>
        </svg>
      </div>

      {/* Right: Contact Details */}
      <div className="space-y-3">
        {/* Contact Summary */}
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Summary</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-[#0f172a] rounded p-2 border border-slate-800">
              <div className="text-slate-500 mb-0.5">Left Foot</div>
              <div className={`text-lg font-bold font-mono ${dynamics.leftFootContact.inContact ? 'text-blue-400' : 'text-slate-600'}`}>
                {dynamics.leftFootContact.inContact ? 'IN CONTACT' : 'AIRBORNE'}
              </div>
              <div className="text-slate-400 mt-1">Force: <span className="text-white font-mono">{fN(dynamics.leftFootContact.normalForce, 2)} N</span></div>
              <div className="text-slate-400">Penetration: <span className="text-white font-mono">{fN(dynamics.leftFootContact.penetration * 1000, 2)} mm</span></div>
              <div className="text-slate-400">Contact Area: <span className="text-white font-mono">{fN(dynamics.leftFootContact.contactArea * 1e6, 1)} mm²</span></div>
            </div>
            <div className="bg-[#0f172a] rounded p-2 border border-slate-800">
              <div className="text-slate-500 mb-0.5">Right Foot</div>
              <div className={`text-lg font-bold font-mono ${dynamics.rightFootContact.inContact ? 'text-violet-400' : 'text-slate-600'}`}>
                {dynamics.rightFootContact.inContact ? 'IN CONTACT' : 'AIRBORNE'}
              </div>
              <div className="text-slate-400 mt-1">Force: <span className="text-white font-mono">{fN(dynamics.rightFootContact.normalForce, 2)} N</span></div>
              <div className="text-slate-400">Penetration: <span className="text-white font-mono">{fN(dynamics.rightFootContact.penetration * 1000, 2)} mm</span></div>
              <div className="text-slate-400">Contact Area: <span className="text-white font-mono">{fN(dynamics.rightFootContact.contactArea * 1e6, 1)} mm²</span></div>
            </div>
          </div>
        </div>

        {/* Stability Details */}
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Stability Analysis</span>
          </div>
          <div className="text-[10px] space-y-1">
            <div className="flex justify-between text-slate-400"><span>Status</span>
              <span className={`font-bold ${dynamics.isStable ? 'text-emerald-400' : 'text-red-400'}`}>
                {dynamics.isStable ? 'STATICALLY STABLE' : 'UNSTABLE — FALL RISK'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400"><span>Stability Margin</span>
              <span className="text-white font-mono">{fMm(dynamics.stabilityMargin)} mm</span></div>
            <div className="flex justify-between text-slate-400"><span>Phase</span>
              <span className="font-bold" style={{ color: phase.color }}>{phase.label}</span></div>
            <div className="flex justify-between text-slate-400"><span>Active Contacts</span>
              <span className="text-white font-mono">{dynamics.contactCount}</span></div>
            <div className="flex justify-between text-slate-400"><span>Total GRF</span>
              <span className="text-white font-mono">{fN(dynamics.totalContactForce, 2)} N</span></div>
            <div className="flex justify-between text-slate-400"><span>Expected (mg)</span>
              <span className="text-white font-mono">{fN(dynamics.totalMass * 9.81, 2)} N</span></div>
            <div className="flex justify-between text-slate-400"><span>Support Polygon Vertices</span>
              <span className="text-white font-mono">{dynamics.supportPolygon.length}</span></div>
            {/* Stability bar */}
            <div className="mt-1">
              <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${stabilityPct}%`,
                  backgroundColor: dynamics.isStable ? '#22c55e' : '#ef4444',
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Physics Config */}
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDown className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Physics Configuration</span>
          </div>
          <div className="text-[10px] font-mono space-y-0.5">
            <div className="flex justify-between text-slate-400"><span>Gravity</span><span className="text-white">-9.81 m/s²</span></div>
            <div className="flex justify-between text-slate-400"><span>Ground Stiffness</span><span className="text-white">5000 N/m</span></div>
            <div className="flex justify-between text-slate-400"><span>Ground Damping</span><span className="text-white">50 N·s/m</span></div>
            <div className="flex justify-between text-slate-400"><span>Contact Threshold</span><span className="text-white">8 mm</span></div>
            <div className="flex justify-between text-slate-400"><span>Ground Level</span><span className="text-cyan-300">{fN(dynamics.groundLevel * 1000, 1)} mm</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================== ENERGY & POWER TAB ==================

function EnergyTab({ dynamics, sensors }: any) {
  const maxE = Math.max(dynamics.totalEnergy * 1.1, 0.01);
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Energy Monitor */}
      <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Energy Monitor (MuJoCo-style)</span>
        </div>
        <div className="space-y-3">
          <EnergyBar label="Potential Energy (mgh)" value={dynamics.potentialEnergy} max={maxE} color="#3b82f6" unit="J" />
          <EnergyBar label="Kinetic Energy (½mv²)" value={dynamics.kineticEnergy} max={maxE} color="#f97316" unit="J" />
          <div className="border-t border-slate-700 pt-2">
            <EnergyBar label="Total Energy" value={dynamics.totalEnergy} max={maxE} color="#8b5cf6" unit="J" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] mt-2 pt-2 border-t border-slate-700">
            <div className="text-slate-400">CoM Height: <span className="text-white font-mono">{fN(dynamics.com[1] * 1000, 1)} mm</span></div>
            <div className="text-slate-400">CoM Speed: <span className="text-white font-mono">{fN(Math.sqrt(dynamics.comVelocity[0]**2+dynamics.comVelocity[1]**2+dynamics.comVelocity[2]**2)*1000, 1)} mm/s</span></div>
            <div className="text-slate-400">Total Mass: <span className="text-white font-mono">{fN(dynamics.totalMass * 1000, 0)} g</span></div>
            <div className="text-slate-400">Weight: <span className="text-white font-mono">{fN(dynamics.totalMass * 9.81, 2)} N</span></div>
          </div>
        </div>
      </div>

      {/* Power Budget */}
      <div className="space-y-3">
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Power Budget</span>
          </div>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between"><span className="text-slate-400">Total Power</span><span className="text-white font-mono font-bold">{fN(sensors.power.totalWatts, 2)} W</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Total Current</span><span className="text-white font-mono">{fN(sensors.power.totalCurrentAmps, 2)} A</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Battery Voltage</span>
              <span className="text-white font-mono">{fN(sensors.power.batteryVoltage, 2)} V
                <span className="ml-1" style={{color: sensors.power.batteryPercentage > 30 ? '#22c55e' : '#ef4444'}}>({fN(sensors.power.batteryPercentage, 0)}%)</span>
              </span>
            </div>
            <div className="flex justify-between"><span className="text-slate-400">Est. Runtime</span>
              <span className={`font-mono font-bold ${sensors.power.estimatedRuntimeMin < 30 ? 'text-red-400' : sensors.power.estimatedRuntimeMin < 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {sensors.power.estimatedRuntimeMin > 500 ? '>8 hr' : `${fN(sensors.power.estimatedRuntimeMin, 0)} min`}
              </span>
            </div>
            <div className="flex justify-between"><span className="text-slate-400">Σ|Torque|</span><span className="text-orange-300 font-mono">{fN(dynamics.totalTorqueMagnitude, 4)} N·m</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Max |Torque|</span><span className="text-orange-300 font-mono">{fN(dynamics.maxAbsTorque, 4)} N·m</span></div>
          </div>
        </div>

        {/* Per-Servo Power Table */}
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Thermometer className="w-4 h-4 text-rose-400" />
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Per-Servo Power & Temp</span>
          </div>
          <div className="max-h-[250px] overflow-y-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left py-0.5">Servo</th>
                  <th className="text-right py-0.5">Power</th>
                  <th className="text-right py-0.5">Current</th>
                  <th className="text-right py-0.5">Duty</th>
                  <th className="text-right py-0.5">Temp</th>
                </tr>
              </thead>
              <tbody>
                {SERVO_NAMES.map(name => {
                  const w = sensors.power.perServo[name] || 0;
                  const m = sensors.motorFeedback[name];
                  return (
                    <tr key={name} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="text-slate-300 py-0.5 truncate max-w-[100px]">{name}</td>
                      <td className="text-white text-right">{fN(w, 3)}W</td>
                      <td className="text-cyan-300 text-right">{fN(m?.current || 0, 3)}A</td>
                      <td className="text-slate-300 text-right">{fN((m?.dutyCycle || 0) * 100, 0)}%</td>
                      <td className="text-right" style={{ color: tempColor(m?.temperature || 30) }}>
                        {fN(m?.temperature || 30, 0)}°C
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Battery Specs */}
        <div className="bg-[#111827] border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Battery className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">2S Li-Ion Battery</span>
          </div>
          <div className="text-[10px] font-mono space-y-0.5">
            <div className="flex justify-between text-slate-400"><span>Capacity</span><span className="text-white">2000 mAh</span></div>
            <div className="flex justify-between text-slate-400"><span>Nominal</span><span className="text-white">7.4 V</span></div>
            <div className="flex justify-between text-slate-400"><span>Energy</span><span className="text-white">14.8 Wh</span></div>
            <div className="flex justify-between text-slate-400"><span>Internal R</span><span className="text-white">~150 mΩ</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================== SHARED COMPONENTS ==================

function EnergyBar({ label, value, max, color, unit = 'J' }: { label: string; value: number; max: number; color: string; unit?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-mono">{fN(value, 4)} {unit}</span>
      </div>
      <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-200"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default DynamicsAnalyzerPanel;
