// ============================================================
// SimuForge Studio — Nervous System & Bus Architecture
// 180 cm Biomimetic Humanoid Electronic Architecture
// Dual NVIDIA Jetson Thor/Orin, TI C2000 EtherCAT Ring,
// Dual 24mm Eyeball MIPI CSI-2, 16S 58.8V Power Distribution
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  Cpu, Zap, Cable, Info, Code, History as HistoryIcon,
  CheckCircle, Trash2, Link2, Unlink, Activity, Shield,
  Eye, RefreshCw, Sparkles, AlertTriangle
} from 'lucide-react';

interface CPin {
  id: string;
  label: string;
  type: 'power' | 'ground' | 'mipi' | 'ethercat' | 'can' | 'i2c' | 'pwm';
  side: 'left' | 'right' | 'top' | 'bottom';
  index: number;
}

interface CModule {
  id: string;
  name: string;
  subtitle: string;
  x: number; y: number; w: number; h: number;
  color: string;
  pins: CPin[];
  icon: string;
  specs: Record<string, string>;
}

interface CWire {
  id: string;
  fromModule: string; fromPin: string;
  toModule: string; toPin: string;
  color: string;
  label: string;
  signalType: string;
  code: string;
  bandwidth?: string;
}

const WIRE_COLORS: Record<string, string> = {
  power: '#ef4444',
  power48: '#f97316',
  power24: '#f59e0b',
  power12: '#eab308',
  ground: '#64748b',
  mipi: '#10b981',
  ethercat: '#8b5cf6',
  can: '#3b82f6',
  i2c: '#06b6d4',
  pwm: '#ec4899',
};

const BIOMIMETIC_MODULES: CModule[] = [
  {
    id: 'battery_16s',
    name: '16S Structural Power Core',
    subtitle: '58.8V 2.4kWh Silicon-Anode 4680',
    x: 50, y: 35, w: 230, h: 75, color: '#064e3b', icon: '🔋',
    pins: [
      { id: 'v_out_58v', label: 'V_BUS (+58.8V)', type: 'power', side: 'right', index: 0 },
      { id: 'gnd', label: 'GND_MAIN', type: 'ground', side: 'right', index: 1 },
      { id: 'bms_can', label: 'BMS_CAN_H/L', type: 'can', side: 'bottom', index: 0 },
    ],
    specs: { 'Chemistry': 'Silicon-Anode 4680', 'Config': '16S6P (96 cells)', 'Nominal': '58.8 V', 'Capacity': '40.0 Ah (2.35 kWh)', 'Peak Discharge': '140 A', 'BMS Bus': 'CAN-FD 1Mbps' }
  },
  {
    id: 'pdu_rails',
    name: 'High-Voltage PDU & DC-DC Rails',
    subtitle: '58.8V -> 48V, 24V, 12V, 5V Regulators',
    x: 350, y: 35, w: 260, h: 80, color: '#1e293b', icon: '⚡',
    pins: [
      { id: 'v_in_58v', label: 'V_IN (58.8V)', type: 'power', side: 'left', index: 0 },
      { id: 'gnd_in', label: 'GND_IN', type: 'ground', side: 'left', index: 1 },
      { id: 'v_out_48v', label: '48V QDD Rail (1.8kW)', type: 'power', side: 'right', index: 0 },
      { id: 'v_out_24v', label: '24V Hydro Pump (500W)', type: 'power', side: 'right', index: 1 },
      { id: 'v_out_12v', label: '12V Orin Compute', type: 'power', side: 'bottom', index: 0 },
      { id: 'v_out_5v', label: '5V Cranial / Sens Rail', type: 'power', side: 'bottom', index: 1 },
    ],
    specs: { 'Efficiency': '97.4% GaN Synchronous', '48V Rail': '35A continuous (QDDs)', '24V Rail': '22A continuous (Pump)', '12V Rail': '15A (Dual Orin)', '5V Rail': '10A (Servos/Sensors)' }
  },
  {
    id: 'orin_cerebrum',
    name: 'Dual NVIDIA Jetson Thor/Orin Cerebrum',
    subtitle: '800 TOPS AI Compute • Dual MIPI CSI-2',
    x: 180, y: 180, w: 290, h: 90, color: '#0f172a', icon: '🧠',
    pins: [
      { id: 'pwr_12v', label: 'VIN (12V)', type: 'power', side: 'top', index: 0 },
      { id: 'gnd', label: 'GND', type: 'ground', side: 'top', index: 1 },
      { id: 'mipi_csi_l', label: 'MIPI_CSI2_L (2-Lane)', type: 'mipi', side: 'left', index: 0 },
      { id: 'mipi_csi_r', label: 'MIPI_CSI2_R (2-Lane)', type: 'mipi', side: 'right', index: 0 },
      { id: 'iris_i2c', label: 'Nitinol_I2C (0x48)', type: 'i2c', side: 'bottom', index: 0 },
      { id: 'eth_link', label: '1GbE Host Link', type: 'ethercat', side: 'bottom', index: 1 },
    ],
    specs: { 'SoC': 'Dual Jetson Thor / Orin AGX', 'AI Performance': '800 TOPS INT8', 'Camera Interface': '4x 2-Lane MIPI CSI-2 (1.5 Gbps/lane)', 'Host OS': 'Ubuntu 22.04 LTS + Isaac ROS 2' }
  },
  {
    id: 'c2000_cerebellum',
    name: 'TI TMS320F28388D C2000 Cerebellum',
    subtitle: '1000 Hz EtherCAT Real-Time Motion Master',
    x: 550, y: 180, w: 290, h: 90, color: '#172554', icon: '🎛️',
    pins: [
      { id: 'pwr_5v', label: 'VIN (5V)', type: 'power', side: 'top', index: 0 },
      { id: 'gnd', label: 'GND', type: 'ground', side: 'top', index: 1 },
      { id: 'eth_in', label: '1GbE Cerebrum Link', type: 'ethercat', side: 'left', index: 0 },
      { id: 'ecat_ring_out', label: 'EtherCAT_Ring_TX (1kHz)', type: 'ethercat', side: 'right', index: 0 },
      { id: 'ecat_ring_in', label: 'EtherCAT_Ring_RX', type: 'ethercat', side: 'bottom', index: 0 },
      { id: 'can_fd', label: 'CAN-FD Motor Bus', type: 'can', side: 'bottom', index: 1 },
    ],
    specs: { 'Architecture': 'Dual C28x DSP + ARM Cortex-M4', 'EtherCAT Loop': '1000 Hz (1.0 ms deterministic cycle)', 'Jitter': '< 0.8 μs', 'Interfaces': 'EtherCAT, CAN-FD, SPI, PWM' }
  },
  {
    id: 'cam_left_pcb',
    name: 'Left 24mm Eyeball Camera PCB',
    subtitle: 'Sony IMX219 / OV9281 Global Shutter',
    x: 40, y: 330, w: 220, h: 75, color: '#14532d', icon: '👁️',
    pins: [
      { id: 'mipi_out', label: 'MIPI_CSI2_TX (2-Lane)', type: 'mipi', side: 'top', index: 0 },
      { id: 'pwr_3v3', label: 'VDD (3.3V)', type: 'power', side: 'right', index: 0 },
      { id: 'gnd', label: 'GND', type: 'ground', side: 'right', index: 1 },
    ],
    specs: { 'Footprint': '8x8 mm Micro-PCB in 24mm eye', 'Active Sensor': 'Sony IMX219 (8MP) / OV9281 (1MP Global)', 'Bandwidth': '1.5 Gbps MIPI CSI-2', 'Optics': '3.04 mm Gold Lens Barrel' }
  },
  {
    id: 'cam_right_pcb',
    name: 'Right 24mm Eyeball Camera PCB',
    subtitle: 'Sony IMX219 / OV9281 Global Shutter',
    x: 320, y: 330, w: 220, h: 75, color: '#14532d', icon: '👁️',
    pins: [
      { id: 'mipi_out', label: 'MIPI_CSI2_TX (2-Lane)', type: 'mipi', side: 'top', index: 0 },
      { id: 'pwr_3v3', label: 'VDD (3.3V)', type: 'power', side: 'left', index: 0 },
      { id: 'gnd', label: 'GND', type: 'ground', side: 'left', index: 1 },
    ],
    specs: { 'Footprint': '8x8 mm Micro-PCB in 24mm eye', 'Active Sensor': 'Sony IMX219 (8MP) / OV9281 (1MP Global)', 'Bandwidth': '1.5 Gbps MIPI CSI-2', 'Optics': '3.04 mm Gold Lens Barrel' }
  },
  {
    id: 'facs_cranial_node',
    name: '32-Ch Cranial FACS Actuator Node',
    subtitle: 'EtherCAT Slave • Sub-Dermal Bowden Servos',
    x: 600, y: 330, w: 250, h: 75, color: '#581c87', icon: '🎭',
    pins: [
      { id: 'ecat_in', label: 'EtherCAT_IN', type: 'ethercat', side: 'top', index: 0 },
      { id: 'ecat_out', label: 'EtherCAT_OUT', type: 'ethercat', side: 'bottom', index: 0 },
      { id: 'pwr_5v', label: '5V Servo Rail', type: 'power', side: 'left', index: 0 },
    ],
    specs: { 'Channels': '32 Independent Bowden Servos', 'Bus': 'EtherCAT 1kHz sync', 'Peak Current': '18 A at 5V', 'Torque Capacity': '15 N linear force per cable' }
  },
  {
    id: 'qdd_inverters_12x',
    name: '12x Lower-Body QDD FOC Inverters',
    subtitle: '48V GaN Bridge • Hip 360Nm & Knee Rollers',
    x: 880, y: 180, w: 260, h: 85, color: '#7c2d12', icon: '⚙️',
    pins: [
      { id: 'pwr_48v', label: '48V High-Power IN', type: 'power', side: 'left', index: 0 },
      { id: 'ecat_in', label: 'EtherCAT_IN (1kHz)', type: 'ethercat', side: 'top', index: 0 },
      { id: 'ecat_out', label: 'EtherCAT_Return', type: 'ethercat', side: 'bottom', index: 0 },
    ],
    specs: { 'Technology': 'GaN FET 3-Phase FOC Inverters', 'Torque Density': '180-360 Nm Peak', 'Axial Force': '8000 N (Planetary Roller Screw)', 'Bus': 'EtherCAT Distributed Clocks' }
  }
];

const BIOMIMETIC_WIRES: CWire[] = [
  {
    id: 'w1', fromModule: 'battery_16s', fromPin: 'v_out_58v', toModule: 'pdu_rails', toPin: 'v_in_58v',
    color: WIRE_COLORS.power, label: '58.8V Main Power Bus', signalType: 'power',
    code: '// 16S 58.8V Structural Battery Core Feed\nconst float v_bus = 58.8f;\nfloat pdu_efficiency = 0.974f;',
    bandwidth: '140 A Continuous'
  },
  {
    id: 'w2', fromModule: 'pdu_rails', fromPin: 'v_out_12v', toModule: 'orin_cerebrum', toPin: 'pwr_12v',
    color: WIRE_COLORS.power12, label: '12V Orin Compute Rail', signalType: 'power',
    code: '// 12V 15A Regulated Rail for Dual NVIDIA Thor/Orin Cerebrum\nfloat orin_power_w = 65.0f;',
    bandwidth: '15 A Max'
  },
  {
    id: 'w3', fromModule: 'pdu_rails', fromPin: 'v_out_48v', toModule: 'qdd_inverters_12x', toPin: 'pwr_48v',
    color: WIRE_COLORS.power48, label: '48V High-Torque QDD Bus', signalType: 'power',
    code: '// 48V Bus for 12x Lower-Body GaN Brushless Inverters\nfloat qdd_peak_power_w = 1800.0f;',
    bandwidth: '35 A Continuous'
  },
  {
    id: 'w4', fromModule: 'cam_left_pcb', fromPin: 'mipi_out', toModule: 'orin_cerebrum', toPin: 'mipi_csi_l',
    color: WIRE_COLORS.mipi, label: 'Left Eyeball MIPI CSI-2 (2-Lane)', signalType: 'mipi',
    code: '// Left 24mm Eyeball High-Speed Video Stream\n// IMX219 / OV9281 Global Shutter: 120 FPS\nconst int mipi_lanes = 2;\nfloat data_rate_gbps = 1.5f;',
    bandwidth: '1.5 Gbps'
  },
  {
    id: 'w5', fromModule: 'cam_right_pcb', fromPin: 'mipi_out', toModule: 'orin_cerebrum', toPin: 'mipi_csi_r',
    color: WIRE_COLORS.mipi, label: 'Right Eyeball MIPI CSI-2 (2-Lane)', signalType: 'mipi',
    code: '// Right 24mm Eyeball High-Speed Video Stream\nconst int mipi_lanes = 2;\nfloat data_rate_gbps = 1.5f;',
    bandwidth: '1.5 Gbps'
  },
  {
    id: 'w6', fromModule: 'orin_cerebrum', fromPin: 'eth_link', toModule: 'c2000_cerebellum', toPin: 'eth_in',
    color: WIRE_COLORS.ethercat, label: '1GbE Cerebrum <-> Cerebellum Interlink', signalType: 'ethercat',
    code: '// High-Bandwidth AI Policy -> Motion Controller Bridge\n// ROS 2 Joint Trajectory Action Stream @ 1000 Hz',
    bandwidth: '1000 Mbps'
  },
  {
    id: 'w7', fromModule: 'c2000_cerebellum', fromPin: 'ecat_ring_out', toModule: 'qdd_inverters_12x', toPin: 'ecat_in',
    color: WIRE_COLORS.ethercat, label: '1000 Hz EtherCAT Ring Segment 1', signalType: 'ethercat',
    code: '// Deterministic 1kHz EtherCAT Cycle for 12x Leg Actuators\nfloat cycle_time_us = 1000.0f;\nfloat max_jitter_us = 0.8f;',
    bandwidth: '100 Mbps Full-Duplex'
  },
  {
    id: 'w8', fromModule: 'qdd_inverters_12x', fromPin: 'ecat_out', toModule: 'facs_cranial_node', toPin: 'ecat_in',
    color: WIRE_COLORS.ethercat, label: '1000 Hz EtherCAT Ring Segment 2', signalType: 'ethercat',
    code: '// EtherCAT Return Loop Segment through Cranial FACS Servo Node',
    bandwidth: '100 Mbps Full-Duplex'
  }
];

export const CircuitEditorPanel: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  const [selectedWire, setSelectedWire] = useState<CWire | null>(BIOMIMETIC_WIRES[0]);
  const [selectedModule, setSelectedModule] = useState<CModule | null>(BIOMIMETIC_MODULES[2]);

  if (!isVisible) return null;

  return (
    <div className="flex-1 flex flex-col bg-[#070b12] overflow-hidden select-none text-xs">
      {/* Top Banner */}
      <div className="h-10 bg-[#0c121e] border-b border-[#1e293b] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Cable className="w-4 h-4 text-cyan-400" />
          <h2 className="font-bold text-white text-xs tracking-wide uppercase">
            Nervous System & Bus Architecture (180 cm Biomimetic Humanoid)
          </h2>
          <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
            58.8V HV Rail • Dual MIPI CSI-2 • 1000 Hz EtherCAT Ring
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dual MIPI CSI-2 Active</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>EtherCAT Jitter: 0.8 μs</span>
          </span>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Schematic Canvas */}
        <div className="flex-1 relative overflow-auto bg-[#0a0e17] p-4">
          <svg className="w-[1200px] h-[480px]">
            {/* Draw Wires */}
            {BIOMIMETIC_WIRES.map((wire) => {
              const fromMod = BIOMIMETIC_MODULES.find(m => m.id === wire.fromModule);
              const toMod = BIOMIMETIC_MODULES.find(m => m.id === wire.toModule);
              if (!fromMod || !toMod) return null;

              const x1 = fromMod.x + fromMod.w;
              const y1 = fromMod.y + fromMod.h / 2;
              const x2 = toMod.x;
              const y2 = toMod.y + toMod.h / 2;

              const isSelected = selectedWire?.id === wire.id;
              const dx = Math.abs(x2 - x1) * 0.5;

              return (
                <g key={wire.id} onClick={() => setSelectedWire(wire)} className="cursor-pointer">
                  <path
                    d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                    stroke={wire.color}
                    strokeWidth={isSelected ? 4 : 2.5}
                    fill="none"
                    strokeDasharray={wire.signalType === 'mipi' || wire.signalType === 'ethercat' ? '4 2' : 'none'}
                    className="hover:stroke-white transition-colors"
                  />
                  {/* Wire Label Badge */}
                  <rect
                    x={(x1 + x2) / 2 - 40}
                    y={(y1 + y2) / 2 - 9}
                    width={80}
                    height={18}
                    rx={4}
                    fill="#0f172a"
                    stroke={wire.color}
                    strokeWidth={1}
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 + 3}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize={8.5}
                    fontFamily="monospace"
                  >
                    {wire.bandwidth || wire.signalType}
                  </text>
                </g>
              );
            })}

            {/* Draw Modules */}
            {BIOMIMETIC_MODULES.map((mod) => {
              const isSelected = selectedModule?.id === mod.id;

              return (
                <g
                  key={mod.id}
                  transform={`translate(${mod.x}, ${mod.y})`}
                  onClick={() => setSelectedModule(mod)}
                  className="cursor-pointer"
                >
                  {/* Module Card Background */}
                  <rect
                    width={mod.w}
                    height={mod.h}
                    rx={8}
                    fill={mod.color}
                    stroke={isSelected ? '#38bdf8' : '#334155'}
                    strokeWidth={isSelected ? 2.5 : 1.2}
                    className="hover:stroke-cyan-400 transition-all shadow-xl"
                  />
                  {/* Title & Icon */}
                  <text x={12} y={24} fill="#ffffff" fontSize={11} fontWeight="bold" fontFamily="sans-serif">
                    {mod.icon} {mod.name}
                  </text>
                  <text x={12} y={42} fill="#94a3b8" fontSize={9.5} fontFamily="sans-serif">
                    {mod.subtitle}
                  </text>

                  {/* Pins Render */}
                  {mod.pins.map((pin, i) => {
                    const isRight = pin.side === 'right';
                    const isLeft = pin.side === 'left';
                    const px = isRight ? mod.w : isLeft ? 0 : mod.w / 2;
                    const py = isRight || isLeft ? 25 + pin.index * 22 : mod.h;

                    return (
                      <g key={pin.id}>
                        <circle
                          cx={px}
                          cy={py}
                          r={4.5}
                          fill={WIRE_COLORS[pin.type] || '#38bdf8'}
                          stroke="#0a0e17"
                          strokeWidth={1.5}
                        />
                        <text
                          x={isRight ? px - 8 : isLeft ? px + 8 : px}
                          y={py + 3.5}
                          textAnchor={isRight ? 'end' : isLeft ? 'start' : 'middle'}
                          fill="#cbd5e1"
                          fontSize={8}
                          fontFamily="monospace"
                        >
                          {pin.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Inspection Drawer for Selected Chip/Bus */}
        <div className="w-80 bg-[#0f172a] border-l border-[#1e293b] p-4 flex flex-col justify-between overflow-y-auto">
          {selectedModule ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                <span className="text-xl">{selectedModule.icon}</span>
                <div>
                  <h3 className="font-bold text-white text-xs leading-tight">{selectedModule.name}</h3>
                  <span className="text-[9px] text-cyan-400 font-mono">{selectedModule.subtitle}</span>
                </div>
              </div>

              {/* Hardware Specifications Table */}
              <div className="space-y-1.5 bg-[#070b12] p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Technical Specifications:
                </span>
                {Object.entries(selectedModule.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-0.5 border-b border-slate-900">
                    <span className="text-slate-400">{k}:</span>
                    <span className="text-cyan-300 font-semibold">{v}</span>
                  </div>
                ))}
              </div>

              {/* Associated Bus Wire */}
              {selectedWire && (
                <div className="bg-[#070b12] p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">
                    Active Bus: {selectedWire.label}
                  </span>
                  <div className="bg-[#020617] p-2 rounded text-[9.5px] font-mono text-slate-300 max-h-36 overflow-y-auto">
                    <pre className="text-emerald-400">{selectedWire.code}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 italic text-center py-6">
              Click any electronic module or high-speed bus to inspect its hardware parameters.
            </div>
          )}

          <div className="text-[9px] text-slate-500 pt-2 border-t border-slate-800">
            SimuForge Studio Electronic Architecture • 180 cm Biomimetic Humanoid
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircuitEditorPanel;