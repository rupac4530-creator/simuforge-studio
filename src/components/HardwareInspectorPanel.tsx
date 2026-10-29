import React, { useState, useMemo } from 'react';
import {
  ServoName, ServoState, SERVO_NAMES, PCA_CHANNEL_MAP, ROBOT_DIMS, HOME_ANGLES
} from '../types/simulation';
import {
  Cpu, Battery, Radio, Volume2, Tv, Eye, Zap, Thermometer,
  CircuitBoard, Monitor, Cable, AlertTriangle, CheckCircle, Info,
  Settings, ChevronDown, ChevronRight, Gauge, Activity, X
} from 'lucide-react';

interface HardwareInspectorPanelProps {
  servos: Record<ServoName, ServoState>;
  batteryVoltage: number;
  simTime: number;
  rfRssi: number;
  rfLinkQuality: number;
  robotPosition: [number, number, number];
  isVisible: boolean;
  onToggleVisible: () => void;
  onServoAngleChange: (name: ServoName, angle: number) => void;
}

// Component definitions
interface HWComponent {
  id: string;
  name: string;
  type: string;
  icon: React.ReactNode;
  specs: Record<string, string | number>;
  status: 'ok' | 'warning' | 'error';
  statusMsg: string;
  bus?: string;
  address?: string;
  power?: string;
}

export const HardwareInspectorPanel: React.FC<HardwareInspectorPanelProps> = ({
  servos, batteryVoltage, simTime, rfRssi, rfLinkQuality,
  robotPosition, isVisible, onToggleVisible, onServoAngleChange,
}) => {
  const [activeTab, setActiveTab] = useState<'components' | 'servos' | 'battery' | 'oled' | 'sensors' | 'wiring'>('components');
  const [expandedComponent, setExpandedComponent] = useState<string | null>('esp32');
  const [oledExpression, setOledExpression] = useState('happy');

  // Battery simulation
  const battPct = Math.max(0, Math.min(100, ((batteryVoltage - 6.0) / 2.4) * 100));
  const currentDraw = Object.values(servos).reduce((sum, s) => {
    const movement = Math.abs(s.angle - s.targetAngle);
    return sum + (movement > 1 ? 0.5 : 0.02); // 500mA moving, 20mA idle per servo
  }, 0);
  const totalCurrent = currentDraw + 0.15; // +150mA for ESP32
  const estimatedRuntime = battPct > 0 ? (battPct / 100 * 5200) / (totalCurrent * 1000) * 60 : 0; // minutes

  // Compute servo stress levels
  const servoStress = useMemo(() => {
    const stress: Record<string, { level: number; warning: string }> = {};
    for (const name of SERVO_NAMES) {
      const s = servos[name];
      const deviation = Math.abs(s.angle - HOME_ANGLES[name]);
      const speed = Math.abs(s.angle - s.targetAngle);
      const level = Math.min(100, deviation * 0.5 + speed * 2);
      let warning = '';
      if (level > 80) warning = 'High torque load!';
      else if (level > 50) warning = 'Moderate stress';
      stress[name] = { level, warning };
    }
    return stress;
  }, [servos]);

  // Ultrasonic distance simulation
  const obstacles = [
    { pos: [2.5, 0], size: [0.3, 2.0] },
    { pos: [-2.0, 1.5], size: [2.0, 0.3] },
    { pos: [0, 2.5], size: [2.0, 0.1] },
    { pos: [-1.5, -2.0], size: [1.0, 1.0] },
  ];
  const ultrasonicDist = useMemo(() => {
    let minDist = 4000; // 4m max range
    for (const ob of obstacles) {
      const dx = ob.pos[0] - robotPosition[0];
      const dz = ob.pos[1] - robotPosition[2];
      const dist = Math.sqrt(dx * dx + dz * dz) * 1000; // to mm
      if (dist < minDist) minDist = dist;
    }
    return Math.round(minDist);
  }, [robotPosition]);

  // Hardware components list
  const components: HWComponent[] = [
    {
      id: 'esp32', name: 'ESP32 DevKit V1', type: 'Microcontroller',
      icon: <Cpu className="w-4 h-4 text-emerald-400" />,
      specs: { 'CPU': 'Dual-Core Xtensa 240MHz', 'RAM': '520 KB SRAM', 'Flash': '4 MB', 'BLE': '4.2', 'WiFi': '802.11 b/g/n', 'GPIO': '34 pins', 'I2C': 'SDA=21, SCL=22', 'I2S': 'GPIO 25, 26, 27' },
      status: 'ok', statusMsg: 'Running at 240MHz', bus: 'I2C Master', address: '—', power: '5V / 150mA',
    },
    {
      id: 'pca1', name: 'PCA9685 #1', type: 'Servo Driver',
      icon: <CircuitBoard className="w-4 h-4 text-blue-400" />,
      specs: { 'Channels': '16 (Ch 0-15)', 'Servos Connected': '16', 'Frequency': '50 Hz PWM', 'Resolution': '12-bit (4096 steps)', 'I2C Address': '0x40' },
      status: 'ok', statusMsg: '16 channels active', bus: 'I2C Slave', address: '0x40', power: '5V logic / 6V servo',
    },
    {
      id: 'pca2', name: 'PCA9685 #2', type: 'Servo Driver',
      icon: <CircuitBoard className="w-4 h-4 text-blue-400" />,
      specs: { 'Channels': '16 (Ch 0 used)', 'Servos Connected': '1 (Head Yaw)', 'Frequency': '50 Hz PWM', 'Resolution': '12-bit (4096 steps)', 'I2C Address': '0x41' },
      status: 'ok', statusMsg: 'Ch 0: Head_Yaw', bus: 'I2C Slave', address: '0x41', power: '5V logic / 6V servo',
    },
    {
      id: 'oled', name: 'SSD1306 OLED', type: 'Display',
      icon: <Monitor className="w-4 h-4 text-cyan-400" />,
      specs: { 'Resolution': '128x64 px', 'Size': '0.96"', 'Color': 'Monochrome (White)', 'Interface': 'I2C', 'Address': '0x3C', 'Driver': 'SSD1306' },
      status: 'ok', statusMsg: 'Displaying: ' + oledExpression, bus: 'I2C Slave', address: '0x3C', power: '3.3V / 20mA',
    },
    {
      id: 'amp', name: 'MAX98357A', type: 'I2S Audio Amp',
      icon: <Volume2 className="w-4 h-4 text-amber-400" />,
      specs: { 'Output': '3.2W @ 4Ω', 'Interface': 'I2S', 'Sample Rate': '8-96 kHz', 'Bit Depth': '16/32-bit', 'Gain': '+6/+9/+12/+15 dB' },
      status: 'ok', statusMsg: 'I2S connected', bus: 'I2S', address: '—', power: '5V / 3.2W max',
    },
    {
      id: 'ultrasonic', name: 'HC-SR04', type: 'Ultrasonic Sensor',
      icon: <Eye className="w-4 h-4 text-violet-400" />,
      specs: { 'Range': '2cm - 400cm', 'Accuracy': '±3mm', 'Angle': '15°', 'Trigger': 'GPIO 12', 'Echo': 'GPIO 14', 'Current Distance': ultrasonicDist + 'mm' },
      status: ultrasonicDist < 200 ? 'warning' : 'ok',
      statusMsg: ultrasonicDist < 200 ? 'Object very close!' : 'Clear: ' + ultrasonicDist + 'mm',
      bus: 'GPIO', address: '—', power: '5V / 15mA',
    },
    {
      id: 'battery', name: '2S Li-Ion Pack', type: 'Power Source',
      icon: <Battery className="w-4 h-4 text-blue-400" />,
      specs: { 'Nominal': '7.4V', 'Capacity': '5200mAh', 'Chemistry': 'Li-Ion 18650', 'Cells': '2S1P', 'Current Voltage': batteryVoltage.toFixed(2) + 'V', 'Charge': Math.round(battPct) + '%' },
      status: battPct < 15 ? 'error' : battPct < 30 ? 'warning' : 'ok',
      statusMsg: battPct < 15 ? 'CRITICAL — Charge now!' : battPct < 30 ? 'Low battery' : Math.round(battPct) + '% charged',
      bus: '—', address: '—', power: 'Source',
    },
    {
      id: 'bec', name: '6V BEC', type: 'Voltage Regulator',
      icon: <Zap className="w-4 h-4 text-yellow-400" />,
      specs: { 'Input': '7.4V (2S)', 'Output': '6.0V', 'Max Current': '5A', 'Type': 'UBEC Switching' },
      status: 'ok', statusMsg: 'Servo power OK', bus: 'Power', address: '—', power: '7.4V → 6V',
    },
    {
      id: 'buck5v', name: '5V Buck Converter', type: 'Voltage Regulator',
      icon: <Zap className="w-4 h-4 text-orange-400" />,
      specs: { 'Input': '7.4V (2S)', 'Output': '5.0V', 'Max Current': '3A', 'Type': 'Buck Converter' },
      status: 'ok', statusMsg: 'Logic power OK', bus: 'Power', address: '—', power: '7.4V → 5V',
    },
  ];

  // OLED expressions
  const OLED_FACES: Record<string, string[]> = {
    happy:   ['  ○     ○  ', '           ', '  \\_____/  '],
    sad:     ['  ○     ○  ', '           ', '  /_____\\  '],
    angry:   ['  \\○   ○/  ', '           ', '  /_____\\  '],
    blink:   ['  —     —  ', '           ', '  \\_____/  '],
    surprise:['  ◎     ◎  ', '           ', '    ooo    '],
    sleep:   ['  —     —  ', '    z z    ', '  \\_____/  '],
    love:    ['  ♥     ♥  ', '           ', '  \\_____/  '],
    cool:    ['  ■■   ■■  ', '           ', '  \\_____/  '],
  };

  const tabs = [
    { key: 'components' as const, label: '🔧 Components' },
    { key: 'servos' as const, label: '⚙️ Servos' },
    { key: 'battery' as const, label: '🔋 Battery' },
    { key: 'oled' as const, label: '📺 OLED' },
    { key: 'sensors' as const, label: '📡 Sensors' },
    { key: 'wiring' as const, label: '🔌 Wiring' },
  ];

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[900px] max-h-[85vh] bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#111827] border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
            <div>
              <div className="text-sm font-bold text-white">Hardware Inspector</div>
              <div className="text-[10px] text-slate-400 font-mono">Hash V3 Humanoid — All Internal Modules</div>
            </div>
          </div>
          <button onClick={onToggleVisible} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-3 pt-2 pb-0 space-x-1 bg-[#111827] border-b border-slate-800">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-t-lg border-b-2 transition-all ${
                activeTab === t.key
                  ? 'text-cyan-300 border-cyan-400 bg-[#0f172a]'
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'components' && (
            <div className="space-y-2">
              {components.map(comp => (
                <div key={comp.id} className="bg-slate-800/50 border border-slate-700/60 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedComponent(expandedComponent === comp.id ? null : comp.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {comp.icon}
                      <div className="text-left">
                        <div className="text-xs font-semibold text-white">{comp.name}</div>
                        <div className="text-[10px] text-slate-400">{comp.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full border ${
                        comp.status === 'ok' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : comp.status === 'warning' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                        : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                      }`}>
                        {comp.status === 'ok' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        <span>{comp.statusMsg}</span>
                      </div>
                      {expandedComponent === comp.id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>
                  {expandedComponent === comp.id && (
                    <div className="px-4 pb-3 border-t border-slate-700/40">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2">
                        {Object.entries(comp.specs).map(([key, val]) => (
                          <div key={key} className="flex justify-between text-[10px] py-0.5">
                            <span className="text-slate-500">{key}:</span>
                            <span className="text-slate-200 font-mono">{String(val)}</span>
                          </div>
                        ))}
                        {comp.bus && (
                          <div className="flex justify-between text-[10px] py-0.5">
                            <span className="text-slate-500">Bus:</span>
                            <span className="text-cyan-400 font-mono">{comp.bus}</span>
                          </div>
                        )}
                        {comp.address && (
                          <div className="flex justify-between text-[10px] py-0.5">
                            <span className="text-slate-500">Address:</span>
                            <span className="text-blue-400 font-mono">{comp.address}</span>
                          </div>
                        )}
                        {comp.power && (
                          <div className="flex justify-between text-[10px] py-0.5">
                            <span className="text-slate-500">Power:</span>
                            <span className="text-amber-400 font-mono">{comp.power}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'servos' && (
            <div className="space-y-1.5">
              <div className="text-xs text-slate-400 mb-2">Click any servo to adjust. Green = low stress, Red = high stress.</div>
              {SERVO_NAMES.map(name => {
                const s = servos[name];
                const stress = servoStress[name];
                const pca = PCA_CHANNEL_MAP[name];
                return (
                  <div key={name} className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${stress.level > 70 ? 'bg-rose-500' : stress.level > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <span className="text-[11px] font-semibold text-white">{name}</span>
                        <span className="text-[9px] text-slate-500 font-mono">PCA{pca.board + 1} Ch{pca.channel}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-[10px] text-cyan-400 font-mono w-8 text-right">{Math.round(s.angle)}°</span>
                        <span className="text-[9px] text-slate-500">Stress: {Math.round(stress.level)}%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={s.minAngle}
                      max={s.maxAngle}
                      value={Math.round(s.angle)}
                      onChange={(e) => onServoAngleChange(name, parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                    />
                    {stress.warning && (
                      <div className="text-[9px] text-amber-400 mt-0.5 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{stress.warning}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'battery' && (
            <div className="space-y-4">
              {/* Big gauge */}
              <div className="flex items-center justify-center py-4">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke={battPct > 50 ? '#22c55e' : battPct > 20 ? '#eab308' : '#ef4444'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${battPct * 2.64} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">{Math.round(battPct)}%</span>
                    <span className="text-xs text-slate-400">{batteryVoltage.toFixed(2)}V</span>
                  </div>
                </div>
              </div>

              {/* Battery stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Voltage', value: batteryVoltage.toFixed(2) + 'V', sub: 'Nominal: 7.4V' },
                  { label: 'Current Draw', value: totalCurrent.toFixed(2) + 'A', sub: '17 servos + ESP32' },
                  { label: 'Power', value: (totalCurrent * batteryVoltage).toFixed(1) + 'W', sub: 'Total consumption' },
                  { label: 'Est. Runtime', value: estimatedRuntime.toFixed(0) + ' min', sub: 'At current draw' },
                  { label: 'Cell 1', value: (batteryVoltage / 2).toFixed(2) + 'V', sub: 'Balance: OK' },
                  { label: 'Cell 2', value: (batteryVoltage / 2).toFixed(2) + 'V', sub: 'Balance: OK' },
                  { label: 'Temperature', value: (25 + totalCurrent * 3).toFixed(1) + '°C', sub: totalCurrent > 2 ? '⚠️ Warm' : '✅ Normal' },
                  { label: 'Cycles', value: '~' + Math.floor(simTime / 60), sub: 'Simulated' },
                ].map(item => (
                  <div key={item.label} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                    <div className="text-[10px] text-slate-500">{item.label}</div>
                    <div className="text-lg font-bold text-white">{item.value}</div>
                    <div className="text-[9px] text-slate-500">{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'oled' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">SSD1306 OLED Display Preview — 128×64 pixels, I2C @ 0x3C</div>
              {/* OLED Preview */}
              <div className="flex justify-center">
                <div className="bg-black border-4 border-slate-600 rounded-lg p-4 w-64">
                  <div className="bg-[#001a00] rounded p-3 font-mono text-[11px] leading-relaxed text-center" style={{ color: '#00ff88', textShadow: '0 0 8px #00ff88' }}>
                    {(OLED_FACES[oledExpression] || OLED_FACES.happy).map((line, i) => (
                      <div key={i} className="whitespace-pre">{line}</div>
                    ))}
                    <div className="mt-1 text-[9px]" style={{ color: '#009955' }}>Hash V3 • {oledExpression}</div>
                  </div>
                </div>
              </div>
              {/* Expression selector */}
              <div className="text-xs text-slate-400 mt-2">Select Expression:</div>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(OLED_FACES).map(face => (
                  <button
                    key={face}
                    onClick={() => setOledExpression(face)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      oledExpression === face
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {face}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sensors' && (
            <div className="space-y-4">
              {/* Ultrasonic */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Eye className="w-5 h-5 text-violet-400" />
                  <span className="text-sm font-bold text-white">HC-SR04 Ultrasonic Sensor</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    ultrasonicDist < 200 ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' :
                    ultrasonicDist < 500 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                    'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  }`}>
                    {ultrasonicDist < 200 ? '⚠️ OBSTACLE CLOSE' : ultrasonicDist < 500 ? 'Object detected' : 'Clear'}
                  </span>
                </div>
                <div className="text-4xl font-bold text-white mb-1">{ultrasonicDist} <span className="text-lg text-slate-400">mm</span></div>
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      ultrasonicDist < 200 ? 'bg-rose-500' : ultrasonicDist < 500 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: Math.min(100, (ultrasonicDist / 4000) * 100) + '%' }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                  <span>0mm</span>
                  <span>Range: 20mm — 4000mm</span>
                  <span>4000mm</span>
                </div>
              </div>

              {/* IMU (simulated) */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-bold text-white">IMU (Simulated)</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {['Roll', 'Pitch', 'Yaw'].map((axis, i) => (
                    <div key={axis} className="bg-slate-900/50 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-slate-500">{axis}</div>
                      <div className="text-lg font-bold text-cyan-400">{(Math.sin(simTime * (0.5 + i * 0.3)) * 5).toFixed(1)}°</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RF Signal */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Radio className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-bold text-white">BLE Signal Strength</span>
                </div>
                <div className="flex items-end space-x-4">
                  <div className="text-3xl font-bold text-white">{Math.round(rfRssi)} <span className="text-sm text-slate-400">dBm</span></div>
                  <div className="text-sm text-slate-400">Link: {Math.round(rfLinkQuality)}%</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wiring' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 mb-2">I2C Bus, I2S Bus, Power Rails & GPIO Connections</div>
              {[
                { bus: 'I2C (SDA=21, SCL=22)', color: 'text-cyan-400 border-cyan-500/30', devices: [
                  'ESP32 (Master)', 'PCA9685 #1 @ 0x40', 'PCA9685 #2 @ 0x41', 'SSD1306 OLED @ 0x3C'
                ]},
                { bus: 'I2S (BCLK=26, LRC=25, DOUT=27)', color: 'text-amber-400 border-amber-500/30', devices: [
                  'ESP32 (TX)', 'MAX98357A Amp → Speaker'
                ]},
                { bus: 'Power Rail: 6V BEC → Servos', color: 'text-emerald-400 border-emerald-500/30', devices: [
                  '2S Battery 7.4V → BEC → PCA9685 #1 V+ (16 servos)', '2S Battery 7.4V → BEC → PCA9685 #2 V+ (1 servo)'
                ]},
                { bus: 'Power Rail: 5V Buck → Logic', color: 'text-orange-400 border-orange-500/30', devices: [
                  '2S Battery 7.4V → Buck → ESP32 VIN', '→ PCA9685 VCC (logic)', '→ OLED VCC', '→ MAX98357A VIN'
                ]},
                { bus: 'GPIO Direct', color: 'text-violet-400 border-violet-500/30', devices: [
                  'GPIO 12 → HC-SR04 Trigger', 'GPIO 14 → HC-SR04 Echo', 'GPIO 2 → Status LED'
                ]},
              ].map(conn => (
                <div key={conn.bus} className={`bg-slate-800/50 border rounded-xl p-3 ${conn.color.split(' ')[1]}`}>
                  <div className={`text-xs font-bold mb-2 flex items-center space-x-2 ${conn.color.split(' ')[0]}`}>
                    <Cable className="w-4 h-4" />
                    <span>{conn.bus}</span>
                  </div>
                  <div className="space-y-1">
                    {conn.devices.map((dev, i) => (
                      <div key={i} className="flex items-center space-x-2 text-[11px] text-slate-300">
                        <div className={`w-1.5 h-1.5 rounded-full ${conn.color.split(' ')[0].replace('text-', 'bg-')}`} />
                        <span>{dev}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HardwareInspectorPanel;
