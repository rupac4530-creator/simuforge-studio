import React, { useState } from 'react';
import { ServoName, ServoState, PCA_CHANNEL_MAP, SERVO_NAMES } from '../types/simulation';
import {
  ChevronRight,
  ChevronDown,
  Box,
  Cpu,
  Radio,
  Cog,
  CircuitBoard,
  Volume2,
  Tv,
  Eye,
  Sliders,
  Folder,
  SlidersHorizontal,
  BatteryCharging
} from 'lucide-react';

interface SceneTreePanelProps {
  servos: Record<ServoName, ServoState>;
  onServoAngleChange: (name: ServoName, angle: number) => void;
  selectedNode: string | null;
  onSelectNode: (id: string) => void;
}

interface TreeNode {
  id: string;
  name: string;
  type: 'world' | 'solid' | 'arena' | 'antenna' | 'robot' | 'group' | 'servo' | 'elec';
  servoKey?: ServoName;
  details?: string;
  children?: TreeNode[];
}

const SCENE_GRAPH: TreeNode[] = [
  {
    id: 'world',
    name: 'WorldInfo',
    type: 'world',
    details: 'gravity: -9.81 m/s², dt: 8ms',
  },
  {
    id: 'ground',
    name: 'Ground Plane (Solid)',
    type: 'solid',
    details: 'friction: 0.85, grid: 10x10m',
  },
  {
    id: 'arena',
    name: 'Obstacle Arena',
    type: 'arena',
    children: [
      { id: 'wall_concrete', name: 'ConcreteWall_01 (25dB)', type: 'solid', details: 'loss: 25 dB, RF attenuation' },
      { id: 'wall_brick', name: 'BrickWall_01 (12dB)', type: 'solid', details: 'loss: 12 dB, RF attenuation' },
      { id: 'wall_glass', name: 'GlassPartition_01 (3dB)', type: 'solid', details: 'loss: 3 dB, RF attenuation' },
      { id: 'metal_box', name: 'MetalContainer_01 (45dB)', type: 'solid', details: 'loss: 45 dB, Shielding' },
    ],
  },
  {
    id: 'base_station',
    name: 'Base Station Antenna',
    type: 'antenna',
    details: 'Tx: +20 dBm, 2.4/5.8GHz / 915MHz',
  },
  {
    id: 'robot_root',
    name: 'Hash_V3_Humanoid',
    type: 'robot',
    details: '17-DOF Humanoid • 450mm • 2.1kg',
    children: [
      {
        id: 'group_torso',
        name: 'Torso Assembly',
        type: 'group',
        children: [
          { id: 'elec_esp32', name: 'ESP32 DevKit V1 (Main MCU)', type: 'elec', details: 'Dual-Core 240MHz, BLE/Wi-Fi' },
          { id: 'elec_pca1', name: 'PCA9685 #1 (I²C 0x40)', type: 'elec', details: '16-Ch PWM Servo Driver' },
          { id: 'elec_pca2', name: 'PCA9685 #2 (I²C 0x41)', type: 'elec', details: '16-Ch PWM Servo Driver' },
          { id: 'elec_batt', name: '2S Li-ion Battery 7.4V', type: 'elec', details: '2200mAh 25C Discharge' },
          { id: 'elec_bec', name: '6V 8A High-Current BEC', type: 'elec', details: 'Dedicated Servo Power Rail' },
          { id: 'elec_buck', name: '5V 3A Logic Buck Reg', type: 'elec', details: 'ESP32 & Sensors Power Rail' },
          { id: 'elec_amp', name: 'MAX98357A + 4Ω 3W Speaker', type: 'elec', details: 'I²S Digital Audio Pipeline' },
        ],
      },
      {
        id: 'group_head',
        name: 'Head Assembly',
        type: 'group',
        children: [
          { id: 'servo_head_yaw', name: 'Head_Yaw (Neck)', type: 'servo', servoKey: 'Head_Yaw' },
          { id: 'sensor_oled', name: '0.96" OLED (128x64)', type: 'elec', details: 'I²C SSD1306 Expressive Face' },
          { id: 'sensor_sonar', name: 'HC-SR04 Ultrasonic (Eyes)', type: 'elec', details: 'Range 2cm-400cm, Echo shifted' },
        ],
      },
      {
        id: 'group_r_arm',
        name: 'Right Arm (3-DOF)',
        type: 'group',
        children: [
          { id: 'servo_r_sh_p', name: 'R_Shoulder_Pitch', type: 'servo', servoKey: 'R_Shoulder_Pitch' },
          { id: 'servo_r_sh_r', name: 'R_Shoulder_Roll', type: 'servo', servoKey: 'R_Shoulder_Roll' },
          { id: 'servo_r_elb', name: 'R_Elbow_Pitch', type: 'servo', servoKey: 'R_Elbow_Pitch' },
        ],
      },
      {
        id: 'group_l_arm',
        name: 'Left Arm (3-DOF)',
        type: 'group',
        children: [
          { id: 'servo_l_sh_p', name: 'L_Shoulder_Pitch', type: 'servo', servoKey: 'L_Shoulder_Pitch' },
          { id: 'servo_l_sh_r', name: 'L_Shoulder_Roll', type: 'servo', servoKey: 'L_Shoulder_Roll' },
          { id: 'servo_l_elb', name: 'L_Elbow_Pitch', type: 'servo', servoKey: 'L_Elbow_Pitch' },
        ],
      },
      {
        id: 'group_r_leg',
        name: 'Right Leg (5-DOF)',
        type: 'group',
        children: [
          { id: 'servo_r_hip_y', name: 'R_Hip_Yaw', type: 'servo', servoKey: 'R_Hip_Yaw' },
          { id: 'servo_r_hip_r', name: 'R_Hip_Roll', type: 'servo', servoKey: 'R_Hip_Roll' },
          { id: 'servo_r_hip_p', name: 'R_Hip_Pitch', type: 'servo', servoKey: 'R_Hip_Pitch' },
          { id: 'servo_r_knee', name: 'R_Knee_Pitch', type: 'servo', servoKey: 'R_Knee_Pitch' },
          { id: 'servo_r_ank', name: 'R_Ankle_Pitch', type: 'servo', servoKey: 'R_Ankle_Pitch' },
        ],
      },
      {
        id: 'group_l_leg',
        name: 'Left Leg (5-DOF)',
        type: 'group',
        children: [
          { id: 'servo_l_hip_y', name: 'L_Hip_Yaw', type: 'servo', servoKey: 'L_Hip_Yaw' },
          { id: 'servo_l_hip_r', name: 'L_Hip_Roll', type: 'servo', servoKey: 'L_Hip_Roll' },
          { id: 'servo_l_hip_p', name: 'L_Hip_Pitch', type: 'servo', servoKey: 'L_Hip_Pitch' },
          { id: 'servo_l_knee', name: 'L_Knee_Pitch', type: 'servo', servoKey: 'L_Knee_Pitch' },
          { id: 'servo_l_ank', name: 'L_Ankle_Pitch', type: 'servo', servoKey: 'L_Ankle_Pitch' },
        ],
      },
    ],
  },
];

export const SceneTreePanel: React.FC<SceneTreePanelProps> = ({
  servos,
  onServoAngleChange,
  selectedNode,
  onSelectNode,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    world: true,
    ground: true,
    arena: false,
    robot_root: true,
    group_torso: false,
    group_head: true,
    group_r_arm: true,
    group_l_arm: true,
    group_r_leg: true,
    group_l_leg: true,
  });

  const [activeTab, setActiveTab] = useState<'tree' | 'servos'>('tree');

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getNodeIcon = (node: TreeNode) => {
    switch (node.type) {
      case 'world':
        return <Box className="w-3.5 h-3.5 text-blue-400" />;
      case 'solid':
      case 'arena':
        return <Box className="w-3.5 h-3.5 text-amber-400" />;
      case 'antenna':
        return <Radio className="w-3.5 h-3.5 text-rose-400" />;
      case 'robot':
        return <Cpu className="w-3.5 h-3.5 text-cyan-400" />;
      case 'group':
        return <Folder className="w-3.5 h-3.5 text-indigo-400" />;
      case 'servo':
        return <Cog className="w-3.5 h-3.5 text-emerald-400" />;
      case 'elec':
        return <CircuitBoard className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Box className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedNodes[node.id];
      const hasChildren = node.children && node.children.length > 0;
      const isSelected = selectedNode === node.id;
      const servo = node.servoKey ? servos[node.servoKey] : null;

      return (
        <div key={node.id} className="select-none text-xs">
          <div
            onClick={() => onSelectNode(node.id)}
            className={`flex items-center space-x-1.5 py-1 px-2 cursor-pointer transition-colors rounded ${
              isSelected
                ? 'bg-blue-600/30 text-white font-medium border-l-2 border-blue-400'
                : 'text-slate-300 hover:bg-slate-800/60'
            }`}
            style={{ paddingLeft: `${level * 14 + 8}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-0.5 hover:text-white text-slate-500 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5" />
            )}

            {getNodeIcon(node)}

            <span className="truncate flex-1">{node.name}</span>

            {servo && (
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/40">
                {Math.round(servo.angle)}°
              </span>
            )}
          </div>

          {hasChildren && isExpanded && (
            <div className="relative">
              <div
                className="absolute left-[15px] top-0 bottom-0 w-[1px] bg-slate-800/60"
                style={{ left: `${level * 14 + 14}px` }}
              />
              {renderTree(node.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Find servo by walking the scene tree to find the selected node's servoKey
  const findServoKey = (nodes: TreeNode[], targetId: string): ServoName | null => {
    for (const node of nodes) {
      if (node.id === targetId && node.servoKey) return node.servoKey;
      if (node.children) {
        const found = findServoKey(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  let currentActiveServo: ServoState | null = null;
  if (selectedNode) {
    const servoKey = findServoKey(SCENE_GRAPH, selectedNode);
    if (servoKey) {
      currentActiveServo = servos[servoKey];
    }
  }

  return (
    <aside className="w-64 bg-[#111827] border-r border-[#1e293b] flex flex-col h-full select-none shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-9 px-1 border-b border-[#1e293b] flex items-center text-[10px] font-semibold text-slate-400 bg-[#0f172a] shrink-0">
        <button
          onClick={() => setActiveTab('tree')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
            activeTab === 'tree' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          SCENE TREE
        </button>
        <button
          onClick={() => setActiveTab('servos')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
            activeTab === 'servos' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Sliders className="w-3 h-3" />
          ALL SERVOS
        </button>
      </div>

      {/* Tree view list */}
      {activeTab === 'tree' && (
        <div className="flex-1 overflow-y-auto py-1 px-1">{renderTree(SCENE_GRAPH)}</div>
      )}

      {activeTab === 'servos' && (
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {SERVO_NAMES.map((name) => {
            const servo = servos[name];
            const pca = PCA_CHANNEL_MAP[name];
            return (
              <div key={name} className="bg-[#0a0e17] rounded p-2 border border-[#1e293b]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-slate-200 truncate">{name}</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1 rounded">
                    {Math.round(servo.angle)}°
                  </span>
                </div>
                <input
                  type="range"
                  min={servo.minAngle}
                  max={servo.maxAngle}
                  step="1"
                  value={Math.round(servo.targetAngle)}
                  onChange={(e) => onServoAngleChange(name, parseFloat(e.target.value))}
                  className="w-full accent-blue-500 h-1"
                />
                <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-0.5">
                  <span>PCA#{pca.board + 1}:CH{pca.channel}</span>
                  <span>{servo.minAngle}°–{servo.maxAngle}°</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspector Panel at bottom */}
      <div className="border-t border-[#1e293b] p-3 bg-[#0a0e17] shrink-0">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Node Inspector</span>
          {currentActiveServo && (
            <span className="text-cyan-400 font-mono text-[10px]">
              PCA#{PCA_CHANNEL_MAP[currentActiveServo.name].board + 1}:CH{PCA_CHANNEL_MAP[currentActiveServo.name].channel}
            </span>
          )}
        </div>

        {currentActiveServo ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">{currentActiveServo.name}</span>
              <span className="text-amber-400 font-mono font-bold">
                {Math.round(currentActiveServo.angle)}°
              </span>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                <span>0°</span>
                <span>Target: {Math.round(currentActiveServo.targetAngle)}°</span>
                <span>180°</span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                step="1"
                value={Math.round(currentActiveServo.targetAngle)}
                onChange={(e) => onServoAngleChange(currentActiveServo!.name, parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 bg-[#111827] p-2 rounded border border-[#1e293b]">
              <div>Speed: <span className="text-slate-200 font-mono">300°/s</span></div>
              <div>Torque: <span className="text-slate-200 font-mono">13 kg·cm</span></div>
              <div>Board: <span className="text-slate-200 font-mono">PCA9685 #{PCA_CHANNEL_MAP[currentActiveServo.name].board + 1}</span></div>
              <div>Channel: <span className="text-cyan-400 font-mono">Ch {PCA_CHANNEL_MAP[currentActiveServo.name].channel}</span></div>
            </div>
          </div>
        ) : (
          <div className="text-center py-3 text-slate-500 text-xs italic">
            Select any joint from the tree to inspect and control its servo angle.
          </div>
        )}
      </div>
    </aside>
  );
};

export default SceneTreePanel;
