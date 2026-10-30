// ===================================================================
// SimuForge Studio — Interactive Circuit Editor
// Realistic hardware visualization with editable wiring, code view,
// signal animation, change history, and OLED preview
// ===================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ServoName, ServoState, SERVO_NAMES, PCA_CHANNEL_MAP, HOME_ANGLES } from '../types/simulation';
import {
  Undo2, Redo2, Cpu, Zap, Cable, Info, Code, History as HistoryIcon,
  Monitor, Eye, AlertTriangle, CheckCircle, Trash2, Link2, Unlink,
  Volume2, X, ChevronDown, ChevronRight, RotateCcw, Lightbulb
} from 'lucide-react';

// ================== TYPES ==================

interface CPin {
  id: string;
  label: string;
  type: 'power' | 'ground' | 'i2c' | 'i2s' | 'gpio' | 'pwm';
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
  enabled: boolean;
}

interface HistEntry {
  id: number;
  time: string;
  action: 'connect' | 'disconnect' | 'reset';
  desc: string;
}

// ================== WIRE COLORS ==================

const WIRE_COLORS: Record<string, string> = {
  power: '#ef4444',
  ground: '#6b7280',
  i2c: '#3b82f6',
  i2s: '#22c55e',
  gpio: '#f59e0b',
  pwm: '#a855f7',
  audio: '#ec4899',
};

// ================== MODULE DEFINITIONS ==================

const MODULES: CModule[] = [
  {
    id: 'battery', name: '2S Li-Ion Battery', subtitle: '7.4V 5200mAh 18650',
    x: 660, y: 15, w: 180, h: 55, color: '#1a3652', icon: '🔋',
    pins: [
      { id: 'vp', label: 'V+ (7.4V)', type: 'power', side: 'bottom', index: 0 },
      { id: 'gnd', label: 'GND', type: 'ground', side: 'bottom', index: 1 },
    ],
    specs: { 'Chemistry': 'Li-Ion 18650', 'Cells': '2S1P', 'Nominal': '7.4V', 'Capacity': '5200mAh', 'Max Discharge': '10A', 'Connector': 'XT30' },
  },
  {
    id: 'bec', name: '6V BEC', subtitle: 'UBEC Switching Regulator',
    x: 310, y: 15, w: 150, h: 55, color: '#2d3436', icon: '⚡',
    pins: [
      { id: 'inp', label: 'IN+ (7.4V)', type: 'power', side: 'left', index: 0 },
      { id: 'ing', label: 'IN-', type: 'ground', side: 'left', index: 1 },
      { id: 'outp', label: 'OUT+ (6V)', type: 'power', side: 'right', index: 0 },
      { id: 'outg', label: 'OUT-', type: 'ground', side: 'right', index: 1 },
    ],
    specs: { 'Input': '6.5-28V', 'Output': '6.0V', 'Max Current': '5A', 'Efficiency': '92%', 'Type': 'UBEC Switching' },
  },
  {
    id: 'buck', name: '5V Buck Converter', subtitle: 'Step-Down DC-DC',
    x: 1040, y: 15, w: 150, h: 55, color: '#2d3436', icon: '⚡',
    pins: [
      { id: 'inp', label: 'IN+ (7.4V)', type: 'power', side: 'left', index: 0 },
      { id: 'ing', label: 'IN-', type: 'ground', side: 'left', index: 1 },
      { id: 'outp', label: 'OUT+ (5V)', type: 'power', side: 'right', index: 0 },
      { id: 'outg', label: 'OUT-', type: 'ground', side: 'right', index: 1 },
    ],
    specs: { 'Input': '6.5-28V', 'Output': '5.0V', 'Max Current': '3A', 'Efficiency': '96%', 'Type': 'Buck Converter' },
  },
  {
    id: 'esp32', name: 'ESP32 DevKit V1', subtitle: 'Dual-Core 240MHz • BLE 4.2',
    x: 560, y: 130, w: 200, h: 360, color: '#16213e', icon: '🧠',
    pins: [
      // Left side
      { id: '3v3', label: '3V3', type: 'power', side: 'left', index: 0 },
      { id: 'gnd1', label: 'GND', type: 'ground', side: 'left', index: 1 },
      { id: 'sda', label: 'GPIO21 SDA', type: 'i2c', side: 'left', index: 2 },
      { id: 'scl', label: 'GPIO22 SCL', type: 'i2c', side: 'left', index: 3 },
      { id: 'lrc', label: 'GPIO25 LRC', type: 'i2s', side: 'left', index: 4 },
      { id: 'bclk', label: 'GPIO26 BCLK', type: 'i2s', side: 'left', index: 5 },
      { id: 'dout', label: 'GPIO27 DOUT', type: 'i2s', side: 'left', index: 6 },
      { id: 'gpio33', label: 'GPIO33', type: 'gpio', side: 'left', index: 7 },
      // Right side
      { id: 'vin', label: 'VIN (5V)', type: 'power', side: 'right', index: 0 },
      { id: 'gnd2', label: 'GND', type: 'ground', side: 'right', index: 1 },
      { id: 'trig', label: 'GPIO12 TRIG', type: 'gpio', side: 'right', index: 2 },
      { id: 'echo', label: 'GPIO14 ECHO', type: 'gpio', side: 'right', index: 3 },
      { id: 'led', label: 'GPIO2 LED', type: 'gpio', side: 'right', index: 4 },
      { id: 'gpio4', label: 'GPIO4', type: 'gpio', side: 'right', index: 5 },
      { id: 'gpio5', label: 'GPIO5', type: 'gpio', side: 'right', index: 6 },
      { id: 'gpio18', label: 'GPIO18', type: 'gpio', side: 'right', index: 7 },
    ],
    specs: { 'CPU': 'Xtensa LX6 Dual-Core 240MHz', 'RAM': '520 KB SRAM', 'Flash': '4 MB', 'WiFi': '802.11 b/g/n', 'BLE': '4.2', 'I2C': 'SDA=21 SCL=22', 'I2S': 'BCLK=26 LRC=25 DOUT=27', 'GPIO': '34 Programmable' },
  },
  {
    id: 'pca1', name: 'PCA9685 #1', subtitle: 'I2C Servo Driver @ 0x40',
    x: 70, y: 170, w: 210, h: 270, color: '#1e3a5f', icon: '🎛️',
    pins: [
      // Right side (connects to ESP32)
      { id: 'sda', label: 'SDA', type: 'i2c', side: 'right', index: 0 },
      { id: 'scl', label: 'SCL', type: 'i2c', side: 'right', index: 1 },
      { id: 'vcc', label: 'VCC (5V)', type: 'power', side: 'right', index: 2 },
      { id: 'gnd', label: 'GND', type: 'ground', side: 'right', index: 3 },
      { id: 'vplus', label: 'V+ (6V)', type: 'power', side: 'right', index: 4 },
      // Left side (servo outputs shown as labels)
      { id: 'ch0', label: 'Ch0 R_Hip_Yaw', type: 'pwm', side: 'left', index: 0 },
      { id: 'ch1', label: 'Ch1 R_Hip_Roll', type: 'pwm', side: 'left', index: 1 },
      { id: 'ch2', label: 'Ch2 R_Hip_Pitch', type: 'pwm', side: 'left', index: 2 },
      { id: 'ch3', label: 'Ch3 R_Knee', type: 'pwm', side: 'left', index: 3 },
      { id: 'ch4', label: 'Ch4 R_Ankle', type: 'pwm', side: 'left', index: 4 },
      { id: 'ch5', label: 'Ch5 L_Hip_Yaw', type: 'pwm', side: 'left', index: 5 },
      { id: 'ch6', label: 'Ch6 L_Hip_Roll', type: 'pwm', side: 'left', index: 6 },
      { id: 'ch7', label: 'Ch7 L_Hip_Pitch', type: 'pwm', side: 'left', index: 7 },
    ],
    specs: { 'Channels': '16 (0-15)', 'Frequency': '50 Hz PWM', 'Resolution': '12-bit (4096)', 'I2C Address': '0x40', 'Servo Voltage': '6V (V+)', 'Logic Voltage': '5V (VCC)' },
  },
  {
    id: 'pca2', name: 'PCA9685 #2', subtitle: 'I2C Servo Driver @ 0x41',
    x: 70, y: 490, w: 210, h: 130, color: '#1e3a5f', icon: '🎛️',
    pins: [
      { id: 'sda', label: 'SDA', type: 'i2c', side: 'right', index: 0 },
      { id: 'scl', label: 'SCL', type: 'i2c', side: 'right', index: 1 },
      { id: 'vcc', label: 'VCC (5V)', type: 'power', side: 'right', index: 2 },
      { id: 'vplus', label: 'V+ (6V)', type: 'power', side: 'right', index: 3 },
      { id: 'ch0', label: 'Ch0 Head_Yaw', type: 'pwm', side: 'left', index: 0 },
    ],
    specs: { 'Channels': '16 (Ch0 used)', 'Frequency': '50 Hz PWM', 'I2C Address': '0x41', 'Active Servo': 'Head_Yaw', 'Logic': '5V', 'Servo': '6V' },
  },
  {
    id: 'oled', name: 'SSD1306 OLED', subtitle: '128×64 Mono @ 0x3C',
    x: 1100, y: 130, w: 150, h: 110, color: '#1a1a2e', icon: '📺',
    pins: [
      { id: 'vcc', label: 'VCC', type: 'power', side: 'left', index: 0 },
      { id: 'gnd', label: 'GND', type: 'ground', side: 'left', index: 1 },
      { id: 'scl', label: 'SCL', type: 'i2c', side: 'left', index: 2 },
      { id: 'sda', label: 'SDA', type: 'i2c', side: 'left', index: 3 },
    ],
    specs: { 'Resolution': '128×64 px', 'Size': '0.96"', 'Color': 'Monochrome White', 'Interface': 'I2C', 'Address': '0x3C', 'Driver': 'SSD1306' },
  },
  {
    id: 'amp', name: 'MAX98357A', subtitle: 'I2S Audio Amplifier',
    x: 1100, y: 300, w: 150, h: 110, color: '#3f1d38', icon: '🔊',
    pins: [
      { id: 'vin', label: 'VIN (5V)', type: 'power', side: 'left', index: 0 },
      { id: 'gnd', label: 'GND', type: 'ground', side: 'left', index: 1 },
      { id: 'bclk', label: 'BCLK', type: 'i2s', side: 'left', index: 2 },
      { id: 'lrc', label: 'LRC', type: 'i2s', side: 'left', index: 3 },
      { id: 'din', label: 'DIN', type: 'i2s', side: 'left', index: 4 },
      { id: 'spkp', label: 'SPK+', type: 'gpio', side: 'right', index: 0 },
      { id: 'spkn', label: 'SPK-', type: 'ground', side: 'right', index: 1 },
    ],
    specs: { 'Output': '3.2W @ 4Ω', 'Interface': 'I2S', 'Sample Rate': '8-96 kHz', 'Bit Depth': '16/32-bit', 'Gain': '+6/+9/+12/+15 dB' },
  },
  {
    id: 'sonic', name: 'HC-SR04', subtitle: 'Ultrasonic Distance Sensor',
    x: 1100, y: 460, w: 150, h: 90, color: '#1e3a5f', icon: '📡',
    pins: [
      { id: 'vcc', label: 'VCC (5V)', type: 'power', side: 'left', index: 0 },
      { id: 'trig', label: 'TRIG', type: 'gpio', side: 'left', index: 1 },
      { id: 'echo', label: 'ECHO', type: 'gpio', side: 'left', index: 2 },
      { id: 'gnd', label: 'GND', type: 'ground', side: 'left', index: 3 },
    ],
    specs: { 'Range': '2cm — 400cm', 'Accuracy': '±3mm', 'Angle': '15°', 'Trigger Pin': 'GPIO 12', 'Echo Pin': 'GPIO 14', 'Frequency': '40 kHz' },
  },
  {
    id: 'speaker', name: 'Speaker', subtitle: '4Ω 3W',
    x: 1350, y: 310, w: 90, h: 80, color: '#374151', icon: '🔈',
    pins: [
      { id: 'pos', label: '+', type: 'gpio', side: 'left', index: 0 },
      { id: 'neg', label: '−', type: 'ground', side: 'left', index: 1 },
    ],
    specs: { 'Impedance': '4Ω', 'Power': '3W', 'Frequency': '300Hz-20kHz', 'Type': 'Full Range' },
  },
  {
    id: 'led', name: 'Status LED', subtitle: 'GPIO2 Blue',
    x: 1150, y: 590, w: 80, h: 50, color: '#1e293b', icon: '💡',
    pins: [
      { id: 'anode', label: 'Anode', type: 'gpio', side: 'left', index: 0 },
      { id: 'cathode', label: 'GND', type: 'ground', side: 'left', index: 1 },
    ],
    specs: { 'Color': 'Blue', 'GPIO': '2', 'Type': 'Built-in on DevKit', 'Voltage': '3.3V' },
  },
];

// ================== DEFAULT WIRES ==================

const INITIAL_WIRES: CWire[] = [
  // Power distribution
  { id: 'w1', fromModule: 'battery', fromPin: 'vp', toModule: 'bec', toPin: 'inp', color: WIRE_COLORS.power, label: '7.4V → BEC IN', signalType: 'power', code: '// Hardware: Battery V+ → BEC input\n// 7.4V from 2S Li-Ion feeds the BEC regulator', enabled: true },
  { id: 'w2', fromModule: 'battery', fromPin: 'gnd', toModule: 'bec', toPin: 'ing', color: WIRE_COLORS.ground, label: 'GND → BEC', signalType: 'ground', code: '// Hardware: Common ground bus', enabled: true },
  { id: 'w3', fromModule: 'battery', fromPin: 'vp', toModule: 'buck', toPin: 'inp', color: WIRE_COLORS.power, label: '7.4V → Buck IN', signalType: 'power', code: '// Hardware: Battery V+ → Buck converter input\n// Steps down 7.4V to 5V for logic', enabled: true },
  { id: 'w4', fromModule: 'battery', fromPin: 'gnd', toModule: 'buck', toPin: 'ing', color: WIRE_COLORS.ground, label: 'GND → Buck', signalType: 'ground', code: '// Hardware: Common ground bus', enabled: true },
  { id: 'w5', fromModule: 'buck', fromPin: 'outp', toModule: 'esp32', toPin: 'vin', color: WIRE_COLORS.power, label: '5V → ESP32 VIN', signalType: 'power', code: '// Hardware: 5V regulated → ESP32 VIN pin\n// Powers the microcontroller and 3.3V regulator', enabled: true },
  { id: 'w6', fromModule: 'buck', fromPin: 'outg', toModule: 'esp32', toPin: 'gnd2', color: WIRE_COLORS.ground, label: 'GND → ESP32', signalType: 'ground', code: '// Hardware: Common ground', enabled: true },
  { id: 'w7', fromModule: 'bec', fromPin: 'outp', toModule: 'pca1', toPin: 'vplus', color: WIRE_COLORS.power, label: '6V → PCA1 V+', signalType: 'power', code: '// Hardware: 6V BEC → PCA9685 #1 V+ terminal\n// Powers all 16 servo motors at 6V', enabled: true },
  { id: 'w8', fromModule: 'bec', fromPin: 'outp', toModule: 'pca2', toPin: 'vplus', color: WIRE_COLORS.power, label: '6V → PCA2 V+', signalType: 'power', code: '// Hardware: 6V BEC → PCA9685 #2 V+ terminal\n// Powers Head_Yaw servo at 6V', enabled: true },
  // I2C bus: ESP32 → PCA9685 #1
  { id: 'w9', fromModule: 'esp32', fromPin: 'sda', toModule: 'pca1', toPin: 'sda', color: WIRE_COLORS.i2c, label: 'I2C SDA → PCA1', signalType: 'i2c', code: '#include <Wire.h>\n#include <Adafruit_PWMServoDriver.h>\n\nAdafruit_PWMServoDriver pca1(0x40);\n\nvoid setup() {\n  Wire.begin(21, 22); // SDA=21, SCL=22\n  pca1.begin();\n  pca1.setPWMFreq(50); // 50Hz for servos\n}', enabled: true },
  { id: 'w10', fromModule: 'esp32', fromPin: 'scl', toModule: 'pca1', toPin: 'scl', color: WIRE_COLORS.i2c, label: 'I2C SCL → PCA1', signalType: 'i2c', code: '// I2C Clock line (SCL = GPIO22)\n// Shared bus with PCA2, OLED\n// Speed: 400kHz (Fast Mode)', enabled: true },
  // I2C bus: ESP32 → PCA9685 #2
  { id: 'w11', fromModule: 'esp32', fromPin: 'sda', toModule: 'pca2', toPin: 'sda', color: WIRE_COLORS.i2c, label: 'I2C SDA → PCA2', signalType: 'i2c', code: 'Adafruit_PWMServoDriver pca2(0x41);\n\nvoid setup() {\n  pca2.begin();\n  pca2.setPWMFreq(50);\n  // Head_Yaw on Channel 0\n}', enabled: true },
  { id: 'w12', fromModule: 'esp32', fromPin: 'scl', toModule: 'pca2', toPin: 'scl', color: WIRE_COLORS.i2c, label: 'I2C SCL → PCA2', signalType: 'i2c', code: '// Shared I2C clock with PCA1 and OLED', enabled: true },
  // I2C bus: ESP32 → OLED
  { id: 'w13', fromModule: 'esp32', fromPin: 'sda', toModule: 'oled', toPin: 'sda', color: WIRE_COLORS.i2c, label: 'I2C SDA → OLED', signalType: 'i2c', code: '#include <Adafruit_SSD1306.h>\n\nAdafruit_SSD1306 display(128, 64, &Wire);\n\nvoid setup() {\n  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);\n  display.clearDisplay();\n  display.display();\n}', enabled: true },
  { id: 'w14', fromModule: 'esp32', fromPin: 'scl', toModule: 'oled', toPin: 'scl', color: WIRE_COLORS.i2c, label: 'I2C SCL → OLED', signalType: 'i2c', code: '// Shared I2C clock bus', enabled: true },
  // I2S: ESP32 → MAX98357A
  { id: 'w15', fromModule: 'esp32', fromPin: 'bclk', toModule: 'amp', toPin: 'bclk', color: WIRE_COLORS.i2s, label: 'I2S BCLK', signalType: 'i2s', code: '#include <driver/i2s.h>\n\ni2s_config_t i2s_config = {\n  .mode = I2S_MODE_MASTER | I2S_MODE_TX,\n  .sample_rate = 16000,\n  .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,\n  .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,\n  .communication_format = I2S_COMM_FORMAT_I2S,\n  .dma_buf_count = 8,\n  .dma_buf_len = 64\n};', enabled: true },
  { id: 'w16', fromModule: 'esp32', fromPin: 'lrc', toModule: 'amp', toPin: 'lrc', color: WIRE_COLORS.i2s, label: 'I2S LRC', signalType: 'i2s', code: '// Left/Right Clock (Word Select)\n// GPIO25 → MAX98357A LRC pin', enabled: true },
  { id: 'w17', fromModule: 'esp32', fromPin: 'dout', toModule: 'amp', toPin: 'din', color: WIRE_COLORS.i2s, label: 'I2S DOUT→DIN', signalType: 'i2s', code: '// I2S data out from ESP32\n// GPIO27 → MAX98357A DIN\ni2s_pin_config_t pins = {\n  .bck_io_num = 26,\n  .ws_io_num = 25,\n  .data_out_num = 27\n};', enabled: true },
  // Audio output
  { id: 'w18', fromModule: 'amp', fromPin: 'spkp', toModule: 'speaker', toPin: 'pos', color: WIRE_COLORS.audio, label: 'SPK+', signalType: 'audio', code: '// Amplified audio signal to speaker\n// MAX98357A → Speaker (+)\n// 3.2W @ 4Ω class D output', enabled: true },
  { id: 'w19', fromModule: 'amp', fromPin: 'spkn', toModule: 'speaker', toPin: 'neg', color: WIRE_COLORS.audio, label: 'SPK-', signalType: 'audio', code: '// Speaker ground return\n// MAX98357A → Speaker (−)', enabled: true },
  // GPIO: ESP32 → HC-SR04
  { id: 'w20', fromModule: 'esp32', fromPin: 'trig', toModule: 'sonic', toPin: 'trig', color: WIRE_COLORS.gpio, label: 'GPIO12→TRIG', signalType: 'gpio', code: '#define TRIG_PIN 12\n#define ECHO_PIN 14\n\nvoid triggerUltrasonic() {\n  digitalWrite(TRIG_PIN, LOW);\n  delayMicroseconds(2);\n  digitalWrite(TRIG_PIN, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(TRIG_PIN, LOW);\n}', enabled: true },
  { id: 'w21', fromModule: 'esp32', fromPin: 'echo', toModule: 'sonic', toPin: 'echo', color: WIRE_COLORS.gpio, label: 'GPIO14→ECHO', signalType: 'gpio', code: 'long readDistance() {\n  triggerUltrasonic();\n  long duration = pulseIn(ECHO_PIN, HIGH);\n  return duration * 0.034 / 2; // cm\n}', enabled: true },
  // GPIO: ESP32 → LED
  { id: 'w22', fromModule: 'esp32', fromPin: 'led', toModule: 'led', toPin: 'anode', color: WIRE_COLORS.gpio, label: 'GPIO2→LED', signalType: 'gpio', code: '#define LED_PIN 2\n\nvoid setup() {\n  pinMode(LED_PIN, OUTPUT);\n}\n\nvoid blinkLED() {\n  digitalWrite(LED_PIN, HIGH);\n  delay(100);\n  digitalWrite(LED_PIN, LOW);\n}', enabled: true },
  // Power to peripherals
  { id: 'w23', fromModule: 'buck', fromPin: 'outp', toModule: 'oled', toPin: 'vcc', color: WIRE_COLORS.power, label: '5V → OLED', signalType: 'power', code: '// 5V regulated power to OLED module', enabled: true },
  { id: 'w24', fromModule: 'buck', fromPin: 'outp', toModule: 'amp', toPin: 'vin', color: WIRE_COLORS.power, label: '5V → AMP', signalType: 'power', code: '// 5V regulated power to MAX98357A', enabled: true },
  { id: 'w25', fromModule: 'buck', fromPin: 'outp', toModule: 'sonic', toPin: 'vcc', color: WIRE_COLORS.power, label: '5V → HC-SR04', signalType: 'power', code: '// 5V regulated power to ultrasonic sensor', enabled: true },
  { id: 'w26', fromModule: 'buck', fromPin: 'outp', toModule: 'pca1', toPin: 'vcc', color: WIRE_COLORS.power, label: '5V → PCA1 Logic', signalType: 'power', code: '// 5V logic power to PCA9685 #1', enabled: true },
  { id: 'w27', fromModule: 'buck', fromPin: 'outp', toModule: 'pca2', toPin: 'vcc', color: WIRE_COLORS.power, label: '5V → PCA2 Logic', signalType: 'power', code: '// 5V logic power to PCA9685 #2', enabled: true },
];

// ================== HELPERS ==================

function getPinPos(modules: CModule[], moduleId: string, pinId: string): { x: number; y: number; side: string } | null {
  const mod = modules.find(m => m.id === moduleId);
  if (!mod) return null;
  const pin = mod.pins.find(p => p.id === pinId);
  if (!pin) return null;

  const sameSize = mod.pins.filter(p => p.side === pin.side).length;
  const padding = 18;

  switch (pin.side) {
    case 'left': {
      const spacing = (mod.h - padding * 2) / Math.max(sameSize - 1, 1);
      return { x: mod.x, y: mod.y + padding + pin.index * spacing, side: 'left' };
    }
    case 'right': {
      const spacing = (mod.h - padding * 2) / Math.max(sameSize - 1, 1);
      return { x: mod.x + mod.w, y: mod.y + padding + pin.index * spacing, side: 'right' };
    }
    case 'top': {
      const spacing = (mod.w - padding * 2) / Math.max(sameSize - 1, 1);
      return { x: mod.x + padding + pin.index * spacing, y: mod.y, side: 'top' };
    }
    case 'bottom': {
      const spacing = (mod.w - padding * 2) / Math.max(sameSize - 1, 1);
      return { x: mod.x + padding + pin.index * spacing, y: mod.y + mod.h, side: 'bottom' };
    }
  }
  return null;
}

function makeWirePath(x1: number, y1: number, s1: string, x2: number, y2: number, s2: string): string {
  const off = Math.max(35, Math.abs(x2 - x1) * 0.35, Math.abs(y2 - y1) * 0.25);
  let cx1 = x1, cy1 = y1, cx2 = x2, cy2 = y2;
  if (s1 === 'right') cx1 += off; else if (s1 === 'left') cx1 -= off;
  else if (s1 === 'bottom') cy1 += off; else if (s1 === 'top') cy1 -= off;
  if (s2 === 'right') cx2 += off; else if (s2 === 'left') cx2 -= off;
  else if (s2 === 'bottom') cy2 += off; else if (s2 === 'top') cy2 -= off;
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

// OLED face data
const OLED_FACES: Record<string, string[]> = {
  happy:   ['  ○     ○  ', '           ', '  \\_____/  '],
  sad:     ['  ○     ○  ', '           ', '  /_____\\  '],
  blink:   ['  —     —  ', '           ', '  \\_____/  '],
  surprise:['  ◎     ◎  ', '           ', '    ooo    '],
  angry:   ['  \\○   ○/  ', '           ', '  /_____\\  '],
  love:    ['  ♥     ♥  ', '           ', '  \\_____/  '],
  sleep:   ['  —     —  ', '    z z    ', '  \\_____/  '],
  cool:    ['  ■■   ■■  ', '           ', '  \\_____/  '],
};

// ================== COMPONENT ==================

interface CircuitEditorPanelProps {
  servos: Record<ServoName, ServoState>;
  batteryVoltage: number;
  simTime: number;
  isVisible: boolean;
}

export const CircuitEditorPanel: React.FC<CircuitEditorPanelProps> = ({
  servos, batteryVoltage, simTime, isVisible,
}) => {
  const [modules] = useState<CModule[]>(MODULES);
  const [wires, setWires] = useState<CWire[]>(INITIAL_WIRES);
  const [history, setHistory] = useState<HistEntry[]>([
    { id: 0, time: new Date().toLocaleTimeString(), action: 'reset', desc: 'Circuit loaded with default connections (27 wires)' },
  ]);
  const [selectedModule, setSelectedModule] = useState<string | null>('esp32');
  const [selectedWire, setSelectedWire] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ moduleId: string; pinId: string } | null>(null);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'code' | 'history' | 'oled' | 'servos'>('info');
  const [oledExpression, setOledExpression] = useState('happy');

  // Get pin color
  const pinColor = (type: string) => WIRE_COLORS[type] || '#94a3b8';

  // Selected objects
  const selMod = useMemo(() => modules.find(m => m.id === selectedModule), [selectedModule, modules]);
  const selWire = useMemo(() => wires.find(w => w.id === selectedWire), [selectedWire, wires]);

  // Connected wires for a module
  const moduleWires = useMemo(() => {
    if (!selectedModule) return [];
    return wires.filter(w => w.enabled && (w.fromModule === selectedModule || w.toModule === selectedModule));
  }, [selectedModule, wires]);

  // Add history entry
  const addHistory = useCallback((action: HistEntry['action'], desc: string) => {
    setHistory(prev => [...prev, { id: prev.length, time: new Date().toLocaleTimeString(), action, desc }]);
  }, []);

  // Disconnect a wire
  const disconnectWire = useCallback((wireId: string) => {
    setWires(prev => prev.map(w => w.id === wireId ? { ...w, enabled: false } : w));
    const wire = wires.find(w => w.id === wireId);
    if (wire) addHistory('disconnect', `Disconnected: ${wire.label}`);
    setSelectedWire(null);
  }, [wires, addHistory]);

  // Reconnect a wire
  const reconnectWire = useCallback((wireId: string) => {
    setWires(prev => prev.map(w => w.id === wireId ? { ...w, enabled: true } : w));
    const wire = wires.find(w => w.id === wireId);
    if (wire) addHistory('connect', `Reconnected: ${wire.label}`);
  }, [wires, addHistory]);

  // Reset all wires
  const resetAll = useCallback(() => {
    setWires(INITIAL_WIRES);
    addHistory('reset', 'Reset all connections to default');
  }, [addHistory]);

  // Pin click handler
  const handlePinClick = useCallback((moduleId: string, pinId: string) => {
    if (connectingFrom) {
      // Complete connection — find a matching wire
      const match = wires.find(w =>
        !w.enabled &&
        ((w.fromModule === connectingFrom.moduleId && w.fromPin === connectingFrom.pinId && w.toModule === moduleId && w.toPin === pinId) ||
         (w.toModule === connectingFrom.moduleId && w.toPin === connectingFrom.pinId && w.fromModule === moduleId && w.fromPin === pinId))
      );
      if (match) {
        reconnectWire(match.id);
      }
      setConnectingFrom(null);
    } else {
      // Start connection
      setConnectingFrom({ moduleId, pinId });
    }
  }, [connectingFrom, wires, reconnectWire]);

  // Power consumption
  const powerDraw = useMemo(() => {
    let total = 0.15; // ESP32 base
    const servoMoving = Object.values(servos).filter(s => Math.abs(s.angle - s.targetAngle) > 1).length;
    total += servoMoving * 0.5 + (17 - servoMoving) * 0.02;
    total += 0.02; // OLED
    total += 0.01; // HC-SR04
    return total;
  }, [servos]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectingFrom(null);
        setSelectedWire(null);
      }
      if (e.key === 'Delete' && selectedWire) {
        disconnectWire(selectedWire);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedWire, disconnectWire]);

  if (!isVisible) return null;

  // Count active/disabled wires
  const activeWires = wires.filter(w => w.enabled).length;
  const disabledWires = wires.filter(w => !w.enabled).length;

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0e17] text-white overflow-hidden">
      {/* Toolbar */}
      <div className="h-10 px-4 bg-[#111827] border-b border-slate-700 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
            <Cable className="w-4 h-4 text-cyan-400" />
            <span>CIRCUIT EDITOR</span>
          </div>
          <div className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
            {activeWires} active • {disabledWires} disconnected
          </div>
          {connectingFrom && (
            <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded animate-pulse">
              🔌 Click target pin to connect...
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={resetAll} className="flex items-center space-x-1 px-2 py-1 text-[10px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-all">
            <RotateCcw className="w-3 h-3" />
            <span>RESET ALL</span>
          </button>
          <div className="text-[10px] text-slate-500 font-mono">
            ⚡ {powerDraw.toFixed(2)}A • {(powerDraw * batteryVoltage).toFixed(1)}W
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: SVG Circuit Canvas */}
        <div className="flex-1 overflow-auto bg-[#080c14] relative">
          <svg viewBox="0 0 1500 700" className="w-full h-full" style={{ minWidth: '1200px', minHeight: '600px' }}>
            <defs>
              {/* Animated signal dot */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <polygon points="0 0, 6 2, 0 4" fill="#475569" />
              </marker>
            </defs>

            {/* Background grid */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#111827" strokeWidth="0.5" />
            </pattern>
            <rect width="1500" height="700" fill="url(#grid)" />

            {/* BUS LABELS */}
            <text x="430" y="108" fill="#3b82f6" fontSize="9" fontWeight="bold" opacity="0.6">── I2C BUS (SDA/SCL) ──</text>
            <text x="430" y="500" fill="#22c55e" fontSize="9" fontWeight="bold" opacity="0.6">── I2S BUS (BCLK/LRC/DOUT) ──</text>
            <text x="620" y="8" fill="#ef4444" fontSize="9" fontWeight="bold" opacity="0.6">── POWER DISTRIBUTION ──</text>

            {/* Render wires (behind modules) */}
            {wires.map(wire => {
              const from = getPinPos(modules, wire.fromModule, wire.fromPin);
              const to = getPinPos(modules, wire.toModule, wire.toPin);
              if (!from || !to) return null;
              const path = makeWirePath(from.x, from.y, from.side, to.x, to.y, to.side);
              const isSelected = selectedWire === wire.id;
              return (
                <g key={wire.id} onClick={(e) => { e.stopPropagation(); setSelectedWire(wire.id); setSelectedModule(null); setDetailTab('code'); }} style={{ cursor: 'pointer' }}>
                  {/* Wire shadow for selection */}
                  {isSelected && <path d={path} fill="none" stroke={wire.color} strokeWidth="6" opacity="0.3" filter="url(#glow)" />}
                  {/* Wire path */}
                  <path
                    d={path}
                    fill="none"
                    stroke={wire.enabled ? wire.color : '#374151'}
                    strokeWidth={isSelected ? 3 : 1.8}
                    strokeDasharray={wire.enabled ? 'none' : '6 4'}
                    opacity={wire.enabled ? 0.85 : 0.35}
                  />
                  {/* Animated signal dot when enabled */}
                  {wire.enabled && (
                    <circle r="3" fill={wire.color} opacity="0.9" filter="url(#glow)">
                      <animateMotion dur={wire.signalType === 'power' ? '3s' : '1.5s'} repeatCount="indefinite" path={path} />
                    </circle>
                  )}
                  {/* Wire label at midpoint */}
                  {isSelected && (
                    <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} fill={wire.color} fontSize="8" textAnchor="middle" fontWeight="bold">
                      {wire.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Render modules */}
            {modules.map(mod => {
              const isSelected = selectedModule === mod.id;
              return (
                <g key={mod.id} onClick={(e) => { e.stopPropagation(); setSelectedModule(mod.id); setSelectedWire(null); setDetailTab('info'); }} style={{ cursor: 'pointer' }}>
                  {/* Selection glow */}
                  {isSelected && (
                    <rect x={mod.x - 3} y={mod.y - 3} width={mod.w + 6} height={mod.h + 6} rx="7" fill="none" stroke="#22d3ee" strokeWidth="2" opacity="0.6" filter="url(#glow)" />
                  )}
                  {/* PCB board */}
                  <rect x={mod.x} y={mod.y} width={mod.w} height={mod.h} rx="5" fill={mod.color} stroke={isSelected ? '#22d3ee' : '#334155'} strokeWidth={isSelected ? 1.5 : 1} />
                  {/* Chip/IC representation */}
                  {(mod.id === 'esp32' || mod.id === 'pca1' || mod.id === 'pca2') && (
                    <rect x={mod.x + mod.w * 0.2} y={mod.y + 25} width={mod.w * 0.6} height={Math.min(mod.h * 0.25, 40)} rx="2" fill="#111" stroke="#333" strokeWidth="0.5" />
                  )}
                  {/* OLED screen area */}
                  {mod.id === 'oled' && (
                    <rect x={mod.x + 15} y={mod.y + 30} width={mod.w - 30} height={mod.h - 45} rx="2" fill="#001100" stroke="#333" strokeWidth="0.5" />
                  )}
                  {/* Ultrasonic transducers */}
                  {mod.id === 'sonic' && (
                    <>
                      <circle cx={mod.x + mod.w * 0.35} cy={mod.y + mod.h * 0.5} r="12" fill="#333" stroke="#555" />
                      <circle cx={mod.x + mod.w * 0.65} cy={mod.y + mod.h * 0.5} r="12" fill="#333" stroke="#555" />
                    </>
                  )}
                  {/* Speaker cone */}
                  {mod.id === 'speaker' && (
                    <circle cx={mod.x + mod.w / 2} cy={mod.y + mod.h / 2} r={Math.min(mod.w, mod.h) * 0.35} fill="#222" stroke="#444" strokeWidth="2" />
                  )}
                  {/* Module icon + name */}
                  <text x={mod.x + mod.w / 2} y={mod.y + 14} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="bold">{mod.icon} {mod.name}</text>
                  <text x={mod.x + mod.w / 2} y={mod.y + 24} textAnchor="middle" fill="#64748b" fontSize="7">{mod.subtitle}</text>

                  {/* Render pins */}
                  {mod.pins.map(pin => {
                    const pos = getPinPos(modules, mod.id, pin.id);
                    if (!pos) return null;
                    const pinKey = `${mod.id}.${pin.id}`;
                    const isConnecting = connectingFrom?.moduleId === mod.id && connectingFrom?.pinId === pin.id;
                    const isHovered = hoveredPin === pinKey;
                    const hasWire = wires.some(w => w.enabled && ((w.fromModule === mod.id && w.fromPin === pin.id) || (w.toModule === mod.id && w.toPin === pin.id)));

                    return (
                      <g key={pin.id}
                        onClick={(e) => { e.stopPropagation(); handlePinClick(mod.id, pin.id); }}
                        onMouseEnter={() => setHoveredPin(pinKey)}
                        onMouseLeave={() => setHoveredPin(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Pin dot */}
                        <circle
                          cx={pos.x} cy={pos.y} r={isConnecting ? 6 : isHovered ? 5 : 3.5}
                          fill={isConnecting ? '#22d3ee' : pinColor(pin.type)}
                          stroke={hasWire ? '#fff' : '#555'}
                          strokeWidth={hasWire ? 1.5 : 0.5}
                          opacity={isConnecting ? 1 : 0.9}
                        />
                        {/* Pin label */}
                        <text
                          x={pin.side === 'left' ? pos.x - 7 : pin.side === 'right' ? pos.x + 7 : pos.x}
                          y={pin.side === 'top' ? pos.y - 5 : pin.side === 'bottom' ? pos.y + 12 : pos.y + 3}
                          textAnchor={pin.side === 'left' ? 'end' : pin.side === 'right' ? 'start' : 'middle'}
                          fill={isHovered ? '#fff' : '#94a3b8'}
                          fontSize="7"
                          fontFamily="monospace"
                        >
                          {pin.label}
                        </text>
                        {/* Hover tooltip */}
                        {isHovered && (
                          <rect x={pos.x - 2} y={pos.y - 2} width="4" height="4" fill="none" stroke="#22d3ee" strokeWidth="1.5" opacity="0.8">
                            <animate attributeName="width" values="4;10;4" dur="1s" repeatCount="indefinite" />
                            <animate attributeName="height" values="4;10;4" dur="1s" repeatCount="indefinite" />
                            <animate attributeName="x" values={`${pos.x-2};${pos.x-5};${pos.x-2}`} dur="1s" repeatCount="indefinite" />
                            <animate attributeName="y" values={`${pos.y-2};${pos.y-5};${pos.y-2}`} dur="1s" repeatCount="indefinite" />
                          </rect>
                        )}
                      </g>
                    );
                  })}

                  {/* Status LED indicator */}
                  <circle cx={mod.x + mod.w - 10} cy={mod.y + 10} r="3" fill="#22c55e" opacity="0.8">
                    <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}

            {/* Servo channels visual (bottom) */}
            <g>
              <text x="80" y="655" fill="#94a3b8" fontSize="10" fontWeight="bold">SERVO CHANNELS (17-DOF)</text>
              {SERVO_NAMES.map((name, i) => {
                const col = i % 9;
                const row = Math.floor(i / 9);
                const sx = 80 + col * 52;
                const sy = 665 + row * 22;
                const s = servos[name];
                const pca = PCA_CHANNEL_MAP[name];
                const deviation = Math.abs(s.angle - HOME_ANGLES[name]);
                const color = deviation > 60 ? '#ef4444' : deviation > 30 ? '#f59e0b' : '#22c55e';
                return (
                  <g key={name}>
                    <rect x={sx} y={sy} width="48" height="18" rx="3" fill="#1e293b" stroke={color} strokeWidth="0.8" />
                    <text x={sx + 3} y={sy + 8} fill="#94a3b8" fontSize="5.5" fontFamily="monospace">P{pca.board + 1}:Ch{pca.channel}</text>
                    <text x={sx + 3} y={sy + 15} fill="#e2e8f0" fontSize="5" fontFamily="monospace">{name.replace('_', ' ').substring(0, 8)} {Math.round(s.angle)}°</text>
                  </g>
                );
              })}
            </g>

            {/* Legend */}
            <g>
              {Object.entries(WIRE_COLORS).map(([type, color], i) => (
                <g key={type} transform={`translate(1340, ${140 + i * 18})`}>
                  <line x1="0" y1="5" x2="20" y2="5" stroke={color} strokeWidth="2" />
                  <text x="25" y="8" fill="#94a3b8" fontSize="8" style={{ textTransform: 'capitalize' }}>{type}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* RIGHT: Detail Panel */}
        <div className="w-[340px] bg-[#111827] border-l border-slate-700 flex flex-col shrink-0 overflow-hidden">
          {/* Detail tabs */}
          <div className="flex px-2 pt-2 space-x-1 border-b border-slate-800 shrink-0 bg-[#0f172a]">
            {([
              { key: 'info' as const, label: '📋 Info' },
              { key: 'code' as const, label: '💻 Code' },
              { key: 'history' as const, label: '📜 Log' },
              { key: 'oled' as const, label: '📺 OLED' },
              { key: 'servos' as const, label: '⚙️ Servos' },
            ]).map(t => (
              <button key={t.key} onClick={() => setDetailTab(t.key)}
                className={`px-2 py-1.5 text-[10px] font-semibold rounded-t-md transition-all ${
                  detailTab === t.key ? 'text-cyan-300 bg-[#111827] border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >{t.label}</button>
            ))}
          </div>

          {/* Detail content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* INFO TAB */}
            {detailTab === 'info' && selMod && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{selMod.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-white">{selMod.name}</div>
                    <div className="text-[10px] text-slate-400">{selMod.subtitle}</div>
                  </div>
                </div>
                {/* Specs */}
                <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 font-semibold mb-1.5">SPECIFICATIONS</div>
                  {Object.entries(selMod.specs).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[10px] py-0.5 border-b border-slate-800 last:border-0">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-slate-200 font-mono">{v}</span>
                    </div>
                  ))}
                </div>
                {/* Connected wires */}
                <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 font-semibold mb-1.5">CONNECTIONS ({moduleWires.length})</div>
                  {moduleWires.map(w => (
                    <div key={w.id} className="flex items-center justify-between text-[10px] py-1 border-b border-slate-800 last:border-0">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color }} />
                        <span className="text-slate-300">{w.label}</span>
                      </div>
                      <button onClick={() => disconnectWire(w.id)} className="text-rose-400 hover:text-rose-300 text-[9px]">✕</button>
                    </div>
                  ))}
                </div>
                {/* Pins */}
                <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 font-semibold mb-1.5">PINS ({selMod.pins.length})</div>
                  {selMod.pins.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-[10px] py-0.5">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pinColor(p.type) }} />
                        <span className="text-slate-300 font-mono">{p.label}</span>
                      </div>
                      <span className="text-slate-500">{p.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab === 'info' && !selMod && !selWire && (
              <div className="text-center text-slate-500 text-xs py-8">
                Click a module or wire to view details
              </div>
            )}

            {/* CODE TAB */}
            {detailTab === 'code' && selWire && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selWire.color }} />
                  <div>
                    <div className="text-sm font-bold text-white">{selWire.label}</div>
                    <div className="text-[10px] text-slate-400">{selWire.signalType.toUpperCase()} • {selWire.fromModule} → {selWire.toModule}</div>
                  </div>
                </div>
                {/* Status */}
                <div className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg text-[10px] border ${
                  selWire.enabled ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                }`}>
                  {selWire.enabled ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  <span>{selWire.enabled ? 'Connected — signal flowing' : 'Disconnected — no signal'}</span>
                </div>
                {/* Code */}
                <div className="bg-[#0a0e17] rounded-lg border border-slate-700 overflow-hidden">
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/80 border-b border-slate-700 text-[10px] text-slate-400">
                    <Code className="w-3 h-3 text-cyan-400" />
                    <span>Arduino / ESP32 Code</span>
                  </div>
                  <pre className="p-3 text-[10px] font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {selWire.code}
                  </pre>
                </div>
                {/* Actions */}
                <div className="flex space-x-2">
                  {selWire.enabled ? (
                    <button onClick={() => disconnectWire(selWire.id)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition-all">
                      <Unlink className="w-3 h-3" /><span>DISCONNECT</span>
                    </button>
                  ) : (
                    <button onClick={() => reconnectWire(selWire.id)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-all">
                      <Link2 className="w-3 h-3" /><span>RECONNECT</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {detailTab === 'code' && !selWire && (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-400">Click a wire to view its code.</div>
                {/* Show disconnected wires */}
                {wires.filter(w => !w.enabled).length > 0 && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5">
                    <div className="text-[10px] text-rose-400 font-semibold mb-1.5">⚠ DISCONNECTED WIRES</div>
                    {wires.filter(w => !w.enabled).map(w => (
                      <div key={w.id} className="flex items-center justify-between text-[10px] py-1">
                        <span className="text-rose-300">{w.label}</span>
                        <button onClick={() => reconnectWire(w.id)} className="text-emerald-400 hover:text-emerald-300 text-[9px] font-semibold">⟳ Fix</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HISTORY TAB */}
            {detailTab === 'history' && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-400 mb-2">Change log — all wiring modifications</div>
                {[...history].reverse().map(entry => (
                  <div key={entry.id} className={`flex items-start space-x-2 p-2 rounded-lg border text-[10px] ${
                    entry.action === 'disconnect' ? 'bg-rose-500/5 border-rose-500/20' :
                    entry.action === 'connect' ? 'bg-emerald-500/5 border-emerald-500/20' :
                    'bg-slate-800/50 border-slate-700/50'
                  }`}>
                    <span>{entry.action === 'disconnect' ? '🔴' : entry.action === 'connect' ? '🟢' : '🔄'}</span>
                    <div className="flex-1">
                      <div className="text-slate-300">{entry.desc}</div>
                      <div className="text-slate-500 text-[9px]">{entry.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* OLED TAB */}
            {detailTab === 'oled' && (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-400">SSD1306 OLED Display Preview — 128×64 px, I2C @ 0x3C</div>
                {/* OLED preview */}
                <div className="flex justify-center">
                  <div className="bg-black border-4 border-slate-600 rounded-lg p-3 w-56">
                    <div className="bg-[#001a00] rounded p-2.5 font-mono text-[11px] leading-relaxed text-center" style={{ color: '#00ff88', textShadow: '0 0 8px #00ff88' }}>
                      {(OLED_FACES[oledExpression] || OLED_FACES.happy).map((line, i) => (
                        <div key={i} className="whitespace-pre">{line}</div>
                      ))}
                      <div className="mt-1 text-[8px]" style={{ color: '#009955' }}>Hash V3 • {oledExpression}</div>
                    </div>
                  </div>
                </div>
                {/* Expression selector */}
                <div className="text-[10px] text-slate-400 font-semibold">Select Expression:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {Object.keys(OLED_FACES).map(face => (
                    <button key={face} onClick={() => setOledExpression(face)}
                      className={`px-2 py-1.5 rounded-md text-[10px] font-semibold border transition-all ${
                        oledExpression === face ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >{face}</button>
                  ))}
                </div>
                {/* OLED code */}
                <div className="bg-[#0a0e17] rounded-lg border border-slate-700 overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-800/80 border-b border-slate-700 text-[10px] text-slate-400">Arduino Code</div>
                  <pre className="p-3 text-[9px] font-mono text-emerald-300 whitespace-pre-wrap">{`display.clearDisplay();
display.setTextSize(2);
display.setCursor(10, 10);
// Draw "${oledExpression}" face
display.println("${(OLED_FACES[oledExpression] || [''])[0]}");
display.display();`}</pre>
                </div>
              </div>
            )}

            {/* SERVOS TAB */}
            {detailTab === 'servos' && (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-400">All 17 servo channels — live angles from simulator</div>
                {SERVO_NAMES.map(name => {
                  const s = servos[name];
                  const pca = PCA_CHANNEL_MAP[name];
                  const dev = Math.abs(s.angle - HOME_ANGLES[name]);
                  return (
                    <div key={name} className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <div className={`w-2 h-2 rounded-full ${dev > 60 ? 'bg-rose-500' : dev > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <span className="text-[10px] font-semibold text-white">{name}</span>
                          <span className="text-[8px] text-slate-500 font-mono">PCA{pca.board+1} Ch{pca.channel}</span>
                        </div>
                        <span className="text-[10px] text-cyan-400 font-mono">{Math.round(s.angle)}°</span>
                      </div>
                      <div className="w-full h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${(s.angle / 180) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircuitEditorPanel;
