import React, { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceCommand, VOICE_COMMANDS } from '../types/simulation';
import {
  Smartphone, Wifi, Battery, Home, AlertOctagon, Volume2, X, Play,
  Mic, MicOff, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Zap, Square, BatteryCharging, Signal, Search, Type, Send
} from 'lucide-react';

interface PhoneRemoteHUDProps {
  onJoystickChange: (stick: 'left' | 'right', x: number, y: number) => void;
  onVoiceCommand: (cmd: VoiceCommand | string) => void;
  onToggleArm: () => void;
  onEmergencyStop: () => void;
  onHomePosition: () => void;
  onRobotSpeak: (text: string) => void;
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

// Response phrases the robot says for each command
const ROBOT_RESPONSES: Record<string, string> = {
  'Say Hi': 'Hello there! Nice to meet you!',
  'Shake Hands': 'Let me shake your hand!',
  'Hands Up': 'Hands up, reaching high!',
  'Hands Down': 'Bringing my hands down.',
  'Left Bicep': 'Check out this muscle!',
  'Double Biceps': 'Look at these guns!',
  'Bow': 'I bow to you respectfully.',
  'Sit Down': 'Taking a seat now.',
  'Stand Up': 'Standing up straight!',
  'Turn Left': 'Turning to the left.',
  'Turn Right': 'Turning to the right.',
  'Move Forward': 'Walking forward now.',
  'Move Backward': 'Stepping backward.',
  'Push Up': 'Push-up time! Here I go!',
  'Dance': 'Let me dance for you!',
  'Home Position': 'Returning to home position.',
};

export const PhoneRemoteHUD: React.FC<PhoneRemoteHUDProps> = ({
  onJoystickChange,
  onVoiceCommand,
  onToggleArm,
  onEmergencyStop,
  onHomePosition,
  onRobotSpeak,
  batteryVoltage,
  rssi,
  connected,
  isVisible,
  onToggleVisible,
}) => {
  const [isArmed, setIsArmed] = useState(true);
  const [activeTab, setActiveTab] = useState<'gestures' | 'dpad' | 'voice'>('gestures');
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [lastCmd, setLastCmd] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Battery percentage from voltage (2S LiPo: 6.0V=0%, 8.4V=100%)
  const battPct = Math.max(0, Math.min(100, ((batteryVoltage - 6.0) / 2.4) * 100));
  const battColor = battPct > 50 ? 'text-emerald-400' : battPct > 20 ? 'text-amber-400' : 'text-rose-400';

  // Execute a command and make the robot speak
  const executeCommand = useCallback((cmd: VoiceCommand | string) => {
    onVoiceCommand(cmd);
    setLastCmd(cmd as string);
    // Robot speaks a response via TTS
    const response = ROBOT_RESPONSES[cmd as string] || `Executing ${cmd}`;
    onRobotSpeak(response);
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 2000);
  }, [onVoiceCommand, onRobotSpeak]);

  // Web Speech API for real voice control
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceText('⚠ Speech API not supported — use text input below');
      setShowTextFallback(true);
      return;
    }

    // Check if we're on HTTPS or localhost
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    try {
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 3;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceText('🎤 ' + transcript);

        if (event.results[event.resultIndex].isFinal) {
          const lower = transcript.toLowerCase().trim();
          // Match against known commands with fuzzy matching
          const matched = VOICE_COMMANDS.find(cmd => {
            const cmdLower = cmd.toLowerCase();
            // Direct match
            if (lower.includes(cmdLower)) return true;
            // Fuzzy: match keywords
            const words = cmdLower.split(' ');
            return words.every(w => lower.includes(w));
          });
          if (matched) {
            setLastCmd(matched);
            executeCommand(matched);
            setVoiceText('✅ ' + matched);
          } else {
            setVoiceText('❓ "' + transcript + '" — not recognized. Try again.');
            setShowTextFallback(true);
          }
          setTimeout(() => setIsListening(false), 800);
        }
      };

      recognition.onerror = (event: any) => {
        const errorMsg = event.error;
        if (errorMsg === 'network') {
          setVoiceText('⚠ Voice requires HTTPS — type command below');
        } else if (errorMsg === 'not-allowed') {
          setVoiceText('⚠ Microphone permission denied');
        } else if (errorMsg === 'no-speech') {
          setVoiceText('⚠ No speech detected — try again');
        } else {
          setVoiceText('⚠ ' + errorMsg);
        }
        setShowTextFallback(true);
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setVoiceText('🎤 Listening... speak a command');
      setShowTextFallback(false);
    } catch (err: any) {
      setVoiceText('⚠ Could not start voice — use text input');
      setShowTextFallback(true);
    }
  }, [executeCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  // Text input command handler
  const handleTextCommand = useCallback(() => {
    if (!textInput.trim()) return;
    const lower = textInput.toLowerCase().trim();
    const matched = VOICE_COMMANDS.find(cmd =>
      cmd.toLowerCase().includes(lower) || lower.includes(cmd.toLowerCase())
    );
    if (matched) {
      executeCommand(matched);
      setVoiceText('✅ ' + matched);
    } else {
      setVoiceText('❓ "' + textInput + '" — not recognized');
    }
    setTextInput('');
  }, [textInput, executeCommand]);

  // Filtered commands for text-based search
  const filteredCommands = commandFilter
    ? GESTURE_MAP.filter(g => g.name.toLowerCase().includes(commandFilter.toLowerCase()))
    : GESTURE_MAP;

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
      <div className="w-[320px] h-[620px] bg-black rounded-[36px] p-2.5 shadow-2xl border-4 border-slate-700/80 flex flex-col relative ring-1 ring-white/10 backdrop-blur-md">
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
              {isSpeaking && <Volume2 className="w-2.5 h-2.5 text-amber-400 animate-pulse" />}
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

          {/* Tab Switcher — 3 tabs now */}
          <div className="flex mb-1.5 bg-slate-900/60 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setActiveTab('gestures')}
              className={`flex-1 text-[8px] py-1 rounded-md font-bold transition-all ${activeTab === 'gestures' ? 'bg-blue-600/40 text-blue-300 border border-blue-500/40' : 'text-slate-500 hover:text-slate-300'}`}
            >
              🎭 GESTURES
            </button>
            <button
              onClick={() => setActiveTab('dpad')}
              className={`flex-1 text-[8px] py-1 rounded-md font-bold transition-all ${activeTab === 'dpad' ? 'bg-blue-600/40 text-blue-300 border border-blue-500/40' : 'text-slate-500 hover:text-slate-300'}`}
            >
              🕹️ MOVE
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`flex-1 text-[8px] py-1 rounded-md font-bold transition-all ${activeTab === 'voice' ? 'bg-blue-600/40 text-blue-300 border border-blue-500/40' : 'text-slate-500 hover:text-slate-300'}`}
            >
              🎤 VOICE
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'gestures' ? (
              /* ===== GESTURE GRID ===== */
              <div className="flex-1 overflow-y-auto pr-0.5 custom-scrollbar">
                {/* Search filter */}
                <div className="flex items-center space-x-1 mb-1 bg-slate-900/60 rounded-lg px-2 py-1 border border-slate-800">
                  <Search className="w-3 h-3 text-slate-500" />
                  <input
                    type="text"
                    value={commandFilter}
                    onChange={(e) => setCommandFilter(e.target.value)}
                    placeholder="Filter gestures..."
                    className="flex-1 bg-transparent text-[9px] text-white placeholder-slate-600 outline-none"
                  />
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {filteredCommands.map((btn) => (
                    <button
                      key={btn.name}
                      onClick={() => executeCommand(btn.name)}
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
            ) : activeTab === 'dpad' ? (
              /* ===== D-PAD + JOYSTICKS ===== */
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                {/* D-Pad */}
                <div className="text-[9px] text-slate-400 font-mono">WALK / TURN</div>
                <div className="relative w-32 h-32">
                  {/* Forward */}
                  <button
                    onClick={() => executeCommand('Move Forward')}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-slate-800 hover:bg-emerald-600/40 active:scale-90 border border-slate-700 rounded-lg flex items-center justify-center transition-all"
                  >
                    <ArrowUp className="w-5 h-5 text-emerald-400" />
                  </button>
                  {/* Backward */}
                  <button
                    onClick={() => executeCommand('Move Backward')}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-slate-800 hover:bg-rose-600/40 active:scale-90 border border-slate-700 rounded-lg flex items-center justify-center transition-all"
                  >
                    <ArrowDown className="w-5 h-5 text-rose-400" />
                  </button>
                  {/* Left */}
                  <button
                    onClick={() => executeCommand('Turn Left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-800 hover:bg-amber-600/40 active:scale-90 border border-slate-700 rounded-lg flex items-center justify-center transition-all"
                  >
                    <ArrowLeft className="w-5 h-5 text-amber-400" />
                  </button>
                  {/* Right */}
                  <button
                    onClick={() => executeCommand('Turn Right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-800 hover:bg-amber-600/40 active:scale-90 border border-slate-700 rounded-lg flex items-center justify-center transition-all"
                  >
                    <ArrowRight className="w-5 h-5 text-amber-400" />
                  </button>
                  {/* Center Stop */}
                  <button
                    onClick={() => { onHomePosition(); setLastCmd('Home Position'); onRobotSpeak('Returning to home.'); }}
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
                      onClick={() => executeCommand(btn.name)}
                      className="bg-slate-800/80 hover:bg-blue-600/30 active:scale-90 transition-all p-1.5 rounded-lg border border-slate-700/60 flex flex-col items-center space-y-0.5"
                    >
                      <span className="text-sm">{btn.icon}</span>
                      <span className="text-[7px] text-slate-300">{btn.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ===== VOICE & TEXT CONTROL TAB ===== */
              <div className="flex-1 flex flex-col space-y-2 overflow-y-auto">
                {/* Big microphone button */}
                <div className="flex flex-col items-center pt-2">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all border-4 shadow-lg ${
                      isListening
                        ? 'bg-rose-500/30 border-rose-500 animate-pulse shadow-rose-500/30'
                        : 'bg-gradient-to-br from-blue-600 to-cyan-600 border-cyan-400/50 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/30'
                    }`}
                  >
                    {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                  </button>
                  <div className="text-[10px] text-slate-400 mt-1.5 font-semibold">
                    {isListening ? 'TAP TO STOP' : 'TAP TO SPEAK'}
                  </div>
                </div>

                {/* Voice status */}
                {voiceText && (
                  <div className={`text-[9px] text-center px-2 py-1 rounded-lg mx-2 font-mono ${
                    voiceText.includes('✅') ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' :
                    voiceText.includes('⚠') ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' :
                    voiceText.includes('❓') ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' :
                    'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                  }`}>
                    {voiceText}
                  </div>
                )}

                {/* Text input fallback — always visible in voice tab */}
                <div className="px-2 space-y-1">
                  <div className="text-[8px] text-slate-500 font-semibold flex items-center space-x-1">
                    <Type className="w-3 h-3" />
                    <span>TYPE COMMAND</span>
                  </div>
                  <div className="flex space-x-1">
                    <input
                      ref={textInputRef}
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleTextCommand(); }}
                      placeholder="e.g. say hi, dance, move forward..."
                      className="flex-1 bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
                    />
                    <button
                      onClick={handleTextCommand}
                      className="bg-cyan-600/40 hover:bg-cyan-600/60 border border-cyan-500/40 rounded-lg px-2 transition-all"
                    >
                      <Send className="w-3 h-3 text-cyan-300" />
                    </button>
                  </div>
                </div>

                {/* Quick command chips */}
                <div className="px-2">
                  <div className="text-[8px] text-slate-500 font-semibold mb-1">QUICK COMMANDS</div>
                  <div className="flex flex-wrap gap-1">
                    {['Say Hi', 'Dance', 'Move Forward', 'Turn Left', 'Bow', 'Sit Down'].map(cmd => (
                      <button
                        key={cmd}
                        onClick={() => executeCommand(cmd as VoiceCommand)}
                        className={`text-[8px] px-2 py-1 rounded-full border transition-all ${
                          lastCmd === cmd 
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                            : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Voice Input Bar — on gestures and dpad tabs */}
          {activeTab !== 'voice' && (
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
              {/* Text fallback when voice fails */}
              {showTextFallback && (
                <div className="flex space-x-1 mt-1">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleTextCommand(); }}
                    placeholder="Type command here..."
                    className="flex-1 bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-1 text-[9px] text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
                  />
                  <button onClick={handleTextCommand} className="bg-cyan-600/40 hover:bg-cyan-600/60 border border-cyan-500/40 rounded-lg px-1.5">
                    <Send className="w-3 h-3 text-cyan-300" />
                  </button>
                </div>
              )}
            </div>
          )}

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
              onClick={() => { onHomePosition(); setLastCmd('Home Position'); onRobotSpeak('Home position.'); }}
              className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 active:scale-95 text-blue-300 border border-blue-500/40 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center space-x-1"
            >
              <Home className="w-3 h-3" />
              <span>HOME</span>
            </button>

            <button
              onClick={() => { onEmergencyStop(); setLastCmd(''); onRobotSpeak('Emergency stop activated!'); }}
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
