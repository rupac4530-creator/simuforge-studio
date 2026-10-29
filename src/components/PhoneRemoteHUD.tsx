import React, { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceCommand, VOICE_COMMANDS } from '../types/simulation';
import {
  Smartphone, Wifi, Battery, Home, AlertOctagon, Volume2, X, Play,
  Mic, MicOff, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Zap, Square, BatteryCharging, Signal
} from 'lucide-react';

interface PhoneRemoteHUDProps {
  onJoystickChange: (stick: 'left' | 'right', x: number, y: number) => void;
  onVoiceCommand: (cmd: VoiceCommand | string) => void;
  onToggleArm: () => void;
  onEmergencyStop: () => void;
  onHomePosition: () => void;
  batteryVoltage: number;
  rssi: number;
  connected: boolean;
  isVisible: boolean;
  onToggleVisible: () => void;
}

// Icon + label for every voice command
const GESTURE_MAP: { name: VoiceCommand; icon: string }[] = [
  { name: 'Say Hi', icon: '👋' },
  { name: 'Shake Hands', icon: '🤝' },
  { name: 'Hands Up', icon: '🙌' },
  { name: 'Hands Down', icon: '⬇️' },
  { name: 'Left Bicep', icon: '💪' },
  { name: 'Double Biceps', icon: '🦾' },
  { name: 'Bow', icon: '🙇' },
  { name: 'Sit Down', icon: '🪑' },
  { name: 'Stand Up', icon: '🧍' },
  { name: 'Turn Left', icon: '↩️' },
  { name: 'Turn Right', icon: '↪️' },
  { name: 'Move Forward', icon: '🚶' },
  { name: 'Move Backward', icon: '🔙' },
  { name: 'Push Up', icon: '🏋️' },
  { name: 'Dance', icon: '💃' },
  { name: 'Home Position', icon: '🏠' },
];

export const PhoneRemoteHUD: React.FC<PhoneRemoteHUDProps> = ({
  onJoystickChange,
  onVoiceCommand,
  onToggleArm,
  onEmergencyStop,
  onHomePosition,
  batteryVoltage,
  rssi,
  connected,
  isVisible,
  onToggleVisible,
}) => {
  const [isArmed, setIsArmed] = useState(true);
  const [activeTab, setActiveTab] = useState<'gestures' | 'dpad'>('gestures');
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [lastCmd, setLastCmd] = useState('');
  const recognitionRef = useRef<any>(null);

  // Battery percentage from voltage (2S LiPo: 6.0V=0%, 8.4V=100%)
  const battPct = Math.max(0, Math.min(100, ((batteryVoltage - 6.0) / 2.4) * 100));
  const battColor = battPct > 50 ? 'text-emerald-400' : battPct > 20 ? 'text-amber-400' : 'text-rose-400';

  // Web Speech API for real voice control
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceText('Speech API not supported in this browser');
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setVoiceText(transcript);

      if (event.results[event.resultIndex].isFinal) {
        const lower = transcript.toLowerCase().trim();
        // Match against known commands
        const matched = VOICE_COMMANDS.find(cmd =>
          lower.includes(cmd.toLowerCase().replace(/_/g, ' '))
        );
        if (matched) {
          setLastCmd(matched);
          onVoiceCommand(matched);
          setVoiceText('✅ ' + matched);
        } else {
          setVoiceText('❓ "' + transcript + '" — not recognized');
        }
        setTimeout(() => setIsListening(false), 800);
      }
    };

    recognition.onerror = (event: any) => {
      setVoiceText('⚠️ ' + event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setVoiceText('🎤 Listening...');
  }, [onVoiceCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisible}
        className="fixed bottom-4 right-4 z-40 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white p-3 rounded-full shadow-lg shadow-blue-500/30 flex items-center space-x-2 border border-blue-400/40 transition-transform hover:scale-105"
        title="Open Phone Controller"
      >
        <Smartphone className="w-5 h-5" />
        <span className="text-xs font-semibold pr-1">PHONE REMOTE</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-2 right-2 z-40 flex flex-col items-end select-none">
      {/* Smartphone Shell */}
      <div className="w-[320px] h-[600px] bg-black rounded-[36px] p-2.5 shadow-2xl border-4 border-slate-700/80 flex flex-col relative ring-1 ring-white/10 backdrop-blur-md">
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full flex items-center justify-center space-x-1.5 z-20">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
          <div className="w-6 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Close Button */}
        <button onClick={onToggleVisible} className="absolute top-3 right-4 z-30 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/80">
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Phone Screen */}
        <div className="w-full h-full bg-gradient-to-b from-[#0f172a] to-[#020617] rounded-[28px] overflow-hidden flex flex-col pt-6 pb-1 px-2.5 text-white border border-slate-800">
          {/* Status Bar */}
          <div className="flex items-center justify-between text-[9px] text-slate-400 px-1 mb-1.5 font-mono">
            <div className="flex items-center space-x-1">
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300 font-bold">ESP32-BLE</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-0.5">
                <Signal className="w-2.5 h-2.5 text-cyan-400" />
                <span>{Math.round(rssi)}dBm</span>
              </div>
              <div className={`flex items-center space-x-0.5 ${battColor}`}>
                <Battery className="w-3 h-3" />
                <span>{Math.round(battPct)}%</span>
              </div>
            </div>
          </div>

          {/* App Header */}
          <div className="text-center mb-1.5">
            <div className="text-[11px] font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              HASH V3 CONTROLLER
            </div>
            <div className="text-[8px] text-slate-500 font-mono">17-DOF Bipedal • BLE Connected</div>
          </div>

          {/* Tab Switcher */}
          <div className="flex mb-1.5 bg-slate-900/60 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setActiveTab('gestures')}
              className={`flex-1 text-[9px] py-1 rounded-md font-bold transition-all ${activeTab === 'gestures' ? 'bg-blue-600/40 text-blue-300 border border-blue-500/40' : 'text-slate-500 hover:text-slate-300'}`}
            >
              🎤 VOICE GESTURES
            </button>
            <button
              onClick={() => setActiveTab('dpad')}
              className={`flex-1 text-[9px] py-1 rounded-md font-bold transition-all ${activeTab === 'dpad' ? 'bg-blue-600/40 text-blue-300 border border-blue-500/40' : 'text-slate-500 hover:text-slate-300'}`}
            >
              🕹️ LOCOMOTION
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'gestures' ? (
              /* ===== GESTURE GRID ===== */
              <div className="flex-1 overflow-y-auto pr-0.5 custom-scrollbar">
                <div className="grid grid-cols-4 gap-1">
                  {GESTURE_MAP.map((btn) => (
                    <button
                      key={btn.name}
                      onClick={() => { onVoiceCommand(btn.name); setLastCmd(btn.name); }}
                      className={`bg-slate-800/80 hover:bg-blue-600/30 active:scale-90 transition-all p-1 rounded-lg border flex flex-col items-center justify-center space-y-0.5 ${
                        lastCmd === btn.name ? 'border-blue-400/60 bg-blue-900/30 ring-1 ring-blue-400/30' : 'border-slate-700/60'
                      }`}
                    >
                      <span className="text-sm leading-none">{btn.icon}</span>
                      <span className="text-[7px] text-slate-300 truncate w-full text-center leading-tight">{btn.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ===== D-PAD + JOYSTICKS ===== */
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                {/* D-Pad */}
                <div className="text-[9px] text-slate-400 font-mono">WALK / TURN</div>
                <div className="relative w-32 h-32">
                  {/* Forward */}
                  <button
                    onClick={() => onVoiceCommand('Move Forward')}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-slate-800 hover:bg-emerald-600/40 active:scale-90 border border-slate-700 rounded-lg flex items-center justify-center transition-all"
                  >
                    <ArrowUp className="w-5 h-5 text-emerald-400" />
                  </button>
                  {/* Backward */}
                  <button
                    onClick={() => onVoiceCommand('Move Backward')}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-slate-800 hover:bg-rose-600/40 active:scale-90 border border-slate-700 rounded-lg flex items-center justify-center transition-all"
                  >
                    <ArrowDown className="w-5 h-5 text-rose-400" />
                  </button>
                  {/* Left */}
                  <button
                    onClick={() => onVoiceCommand('Turn Left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-800 hover:bg-amber-600/40 active:scale-90 border border-slate-700 rounded-lg flex items-center justify-center transition-all"
                  >
                    <ArrowLeft className="w-5 h-5 text-amber-400" />
                  </button>
                  {/* Right */}
                  <button
                    onClick={() => onVoiceCommand('Turn Right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-800 hover:bg-amber-600/40 active:scale-90 border border-slate-700 rounded-lg flex items-center justify-center transition-all"
                  >
                    <ArrowRight className="w-5 h-5 text-amber-400" />
                  </button>
                  {/* Center Stop */}
                  <button
                    onClick={onHomePosition}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900 hover:bg-slate-700 active:scale-90 border border-slate-600 rounded-full flex items-center justify-center transition-all"
                  >
                    <Square className="w-3 h-3 text-slate-400 fill-current" />
                  </button>
                </div>

                {/* Quick gesture row */}
                <div className="grid grid-cols-4 gap-1 w-full px-1">
                  {[
                    { name: 'Say Hi' as VoiceCommand, icon: '👋' },
                    { name: 'Dance' as VoiceCommand, icon: '💃' },
                    { name: 'Bow' as VoiceCommand, icon: '🙇' },
                    { name: 'Push Up' as VoiceCommand, icon: '🏋️' },
                  ].map((btn) => (
                    <button
                      key={btn.name}
                      onClick={() => { onVoiceCommand(btn.name); setLastCmd(btn.name); }}
                      className="bg-slate-800/80 hover:bg-blue-600/30 active:scale-90 transition-all p-1.5 rounded-lg border border-slate-700/60 flex flex-col items-center space-y-0.5"
                    >
                      <span className="text-sm">{btn.icon}</span>
                      <span className="text-[7px] text-slate-300">{btn.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Voice Input Bar */}
          <div className="mt-1.5 mb-1">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-full py-2 rounded-xl font-bold text-[11px] flex items-center justify-center space-x-2 transition-all border ${
                isListening
                  ? 'bg-rose-500/30 text-rose-200 border-rose-500/50 animate-pulse'
                  : 'bg-gradient-to-r from-blue-600/40 to-cyan-600/40 text-cyan-200 border-cyan-500/40 hover:from-blue-600/50 hover:to-cyan-600/50'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListening ? 'STOP LISTENING' : '🎤 TAP TO SPEAK'}</span>
            </button>
            {voiceText && (
              <div className="text-[8px] text-center text-slate-400 mt-0.5 truncate px-2 font-mono">{voiceText}</div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800">
            <button
              onClick={() => { setIsArmed(!isArmed); onToggleArm(); }}
              className={`p-1.5 rounded-lg text-[9px] font-bold border transition-all flex items-center justify-center space-x-1 ${
                isArmed ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>{isArmed ? 'ARMED' : 'DISARM'}</span>
            </button>

            <button
              onClick={onHomePosition}
              className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 active:scale-95 text-blue-300 border border-blue-500/40 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center space-x-1"
            >
              <Home className="w-3 h-3" />
              <span>HOME</span>
            </button>

            <button
              onClick={onEmergencyStop}
              className="p-1.5 bg-rose-500/20 hover:bg-rose-600/40 active:scale-95 text-rose-300 border border-rose-500/40 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center space-x-1"
            >
              <AlertOctagon className="w-3 h-3" />
              <span>E-STOP</span>
            </button>
          </div>

          {/* Battery Bar */}
          <div className="mt-1 px-1">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${battPct > 50 ? 'bg-emerald-500' : battPct > 20 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: battPct + '%' }}
              />
            </div>
            <div className="flex justify-between text-[7px] text-slate-500 mt-0.5 font-mono">
              <span>{batteryVoltage.toFixed(2)}V</span>
              <span>2S Li-Ion 7.4V</span>
              <span>{Math.round(battPct)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneRemoteHUD;
