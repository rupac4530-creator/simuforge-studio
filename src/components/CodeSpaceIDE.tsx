// ============================================================
// SimuForge Studio — ROS 2 / Isaac Biomimetic Node Studio
// Real Python & C++ Control Nodes + Multi-Physics Consequence Log
// ============================================================

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Code, Play, Square, Terminal, Trash2, Copy, ChevronDown,
  ChevronUp, CheckCircle, FileCode, Cpu, Sparkles, TerminalSquare
} from 'lucide-react';

interface CodeSpaceIDEProps {
  logs: string[];
  isRunning: boolean;
  onRunCode: (code: string) => void;
  onStopCode: () => void;
  onClearLogs: () => void;
}

const CONTROL_NODES = {
  vergence_py: {
    name: 'BionicEyeVergenceNode.py',
    lang: 'python',
    code: `#!/usr/bin/env python3
# ============================================================
# SimuForge Studio: 180cm Biomimetic Humanoid
# ROS 2 Humble / Isaac Node: Bionic Eye Vergence & Iris Controller
# Subsystems: 24mm Eyeball Gimbals + Nitinol SMA 6-Blade Iris
# ============================================================

import math
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from geometry_msgs.msg import PointStamped
from std_msgs.msg import Float32MultiArray

class BionicEyeVergenceNode(Node):
    def __init__(self):
        super().__init__('bionic_eye_vergence_node')
        self.ipd_meters = 0.064  # 64 mm Inter-Pupillary Distance
        self.focal_length_mm = 3.04  # Sony IMX219 / OV9281 baseline
        
        # Publishers: Left/Right Gimbal Angles & Iris Aperture
        self.gimbal_pub = self.create_publisher(Float32MultiArray, '/head/ocular_gimbal_targets', 10)
        self.iris_pub = self.create_publisher(Float32MultiArray, '/head/nitinol_iris_aperture_mm', 10)
        
        # Subscriber: 3D Gaze Target from Vision SLAM
        self.target_sub = self.create_subscription(PointStamped, '/vision/gaze_target_3d', self.on_target_update, 10)
        self.get_logger().info("🟢 BionicEyeVergenceNode initialized (64mm IPD, 120Hz loop)")

    def on_target_update(self, msg: PointStamped):
        x = msg.point.x
        y = msg.point.y
        z = max(0.15, msg.point.z)  # Target distance in meters
        
        # Trigonometric binocular vergence: theta = 2 * atan((IPD / 2) / z)
        vergence_angle_rad = 2.0 * math.atan((self.ipd_meters / 2.0) / z)
        left_eye_yaw = (vergence_angle_rad / 2.0) * (180.0 / math.pi)
        right_eye_yaw = left_eye_yaw  # Symmetric inward convergence
        coupled_pitch = -math.atan2(y, z) * (180.0 / math.pi)

        # Dynamic Nitinol Iris Aperture Adaptation (2.0mm to 7.0mm)
        ambient_lux = 450.0  # Simulated interior lab lighting
        target_aperture_mm = min(7.0, max(2.0, 5.0 * (100.0 / ambient_lux)**0.5))

        # Command Actuators
        gimbal_cmd = Float32MultiArray(data=[left_eye_yaw, right_eye_yaw, coupled_pitch])
        self.gimbal_pub.publish(gimbal_cmd)
        self.iris_pub.publish(Float32MultiArray(data=[target_aperture_mm]))

# Execute in Biomimetic Simulator runtime:
robot.log("▶ Initializing ROS 2 BionicEyeVergenceNode...")
robot.setVergenceDistance(0.45) # 45 cm near focus (vergence crossing)
robot.setPupilAperture(5.2)     # Dilate Nitinol iris to 5.2 mm
robot.log("✅ Stereo vergence and iris aperture updated live!")
`
  },
  audio2face_cpp: {
    name: 'Audio2FaceBlendshapeSolver.cpp',
    lang: 'cpp',
    code: `// ============================================================
// SimuForge Studio: 180cm Biomimetic Humanoid
// High-Speed FACS Blendshape Solver & Cable Tension Evaluator
// Targets: 32 Cranial Bowden Micro-Cables + TMJ Jaw Linkage
// ============================================================

#include <iostream>
#include <vector>
#include <cmath>

struct FACSActionUnits {
    float au1_inner_brow_raiser; // 0.0 to 1.0
    float au2_outer_brow_raiser;
    float au4_brow_lowerer;
    float au6_cheek_raiser;
    float au12_smile;            // Zygomaticus Major
    float au25_lips_part;
    float au26_jaw_drop;         // 4-Bar TMJ Mandible
};

class Audio2FaceBlendshapeSolver {
public:
    float silicone_youngs_modulus_mpa = 0.08f; // Ecoflex 00-20
    float servo_max_torque_nm = 0.28f;         // Sub-micro servo limit
    float pulley_radius_m = 0.006f;            // 6 mm cranial pulley

    float computePeakCableTension(const FACSActionUnits& facs) {
        float strain = facs.au12_smile * 0.45f + facs.au26_jaw_drop * 0.35f;
        float anchor_area_mm2 = 12.0f;
        // Ogden / Hookean continuum tension: F = E * A * strain * multiplier
        float cable_tension_n = (silicone_youngs_modulus_mpa * anchor_area_mm2) * strain * 10.0f;
        return std::max(0.1f, cable_tension_n);
    }
};

// Simulation script invocation:
robot.log("▶ Applying Duchenne Smile + Audio2Face Phoneme /A/...");
robot.setFACS("au12_lipCornerPuller", 0.95);
robot.setFACS("au6_cheekRaiser", 0.85);
robot.setFACS("au25_lipsPart", 0.60);
robot.setFACS("au26_jawDrop", 0.25);
robot.log("✅ Facial Action Units active. TMJ jaw dropped, cheeks lifted.");
`
  },
  qdd_balance_py: {
    name: 'WholeBodyQDDImpedanceController.py',
    lang: 'python',
    code: `#!/usr/bin/env python3
# ============================================================
# SimuForge Studio: 180cm Biomimetic Humanoid
# Whole-Body Bipedal Balance & QDD Joint Impedance Controller
# Model: 68.4 kg, 1.80m, 110-DoF Biomechanical Architecture
# ============================================================

import numpy as np

class WholeBodyQDDImpedanceController:
    def __init__(self):
        self.robot_mass_kg = 68.4
        self.com_nominal_height_m = 0.98
        self.gravity = 9.81
        self.kp_cartesian = np.diag([1800.0, 2400.0, 1800.0]) # N/m
        self.kd_cartesian = np.diag([120.0, 150.0, 120.0])    # N*s/m
        
    def solve_joint_torques(self, com_actual, com_target, com_vel):
        error = np.array(com_target) - np.array(com_actual)
        wrench_f = self.kp_cartesian @ error - self.kd_cartesian @ np.array(com_vel)
        wrench_f[1] += self.robot_mass_kg * self.gravity # Gravity compensation (671 N)
        return wrench_f

# Simulation runner:
robot.log("▶ Verifying 68.4 kg Whole-Body Dynamic Balance...");
metrics = robot.getBiomimeticMetrics();
robot.log("  → Total Mass: " + metrics.totalRobotMassKg.toFixed(1) + " kg");
robot.log("  → Stability Margin: " + metrics.stabilityMarginMm.toFixed(1) + " mm");
robot.log("  → Statically Stable: " + metrics.isStaticallyStable);
`
  }
};

type ActiveNodeKey = keyof typeof CONTROL_NODES;

export const CodeSpaceIDE: React.FC<CodeSpaceIDEProps> = ({
  logs,
  isRunning,
  onRunCode,
  onStopCode,
  onClearLogs,
}) => {
  const [activeNodeKey, setActiveNodeKey] = useState<ActiveNodeKey>('vergence_py');
  const [userCode, setUserCode] = useState<string>(CONTROL_NODES.vergence_py.code);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const handleSelectNode = (key: ActiveNodeKey) => {
    setActiveNodeKey(key);
    setUserCode(CONTROL_NODES[key].code);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(userCode);
  };

  return (
    <div className={`w-full bg-[#0a0e17] border-t border-[#1e293b] flex flex-col shrink-0 transition-all duration-200 select-none ${
      isCollapsed ? 'h-9' : 'h-52'
    }`}>
      {/* Header Bar */}
      <div className="h-9 bg-[#0f172a] border-b border-[#1e293b] px-3 flex items-center justify-between shrink-0 text-xs">
        {/* Left: Tab Selectors */}
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center space-x-1 font-bold text-cyan-400 mr-2 text-[11px]">
            <Code className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">ROS 2 / Isaac Biomimetic Node Studio</span>
          </div>

          {(Object.keys(CONTROL_NODES) as ActiveNodeKey[]).map((key) => {
            const node = CONTROL_NODES[key];
            return (
              <button
                key={key}
                onClick={() => handleSelectNode(key)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                  activeNodeKey === key
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {node.name}
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {isRunning ? (
            <button
              onClick={onStopCode}
              className="px-2.5 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded text-[10px] font-bold border border-red-500/50 flex items-center space-x-1"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              <span>STOP</span>
            </button>
          ) : (
            <button
              onClick={() => onRunCode(userCode)}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow-md shadow-emerald-600/30 flex items-center space-x-1 transition-all"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>EXECUTE NODE</span>
            </button>
          )}

          <button
            onClick={handleCopyCode}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            title="Copy script"
          >
            <Copy className="w-3 h-3" />
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            title={isCollapsed ? 'Expand Dock' : 'Collapse Dock'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Split View: Left = Monaco Editor, Right = Real-Time Consequence Log */}
      {!isCollapsed && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Code Editor (60%) */}
          <div className="flex-[3] border-r border-[#1e293b] overflow-hidden">
            <Editor
              height="100%"
              language={CONTROL_NODES[activeNodeKey].lang === 'cpp' ? 'cpp' : 'python'}
              theme="vs-dark"
              value={userCode}
              onChange={(val) => setUserCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 11,
                fontFamily: 'Consolas, "Fira Code", monospace',
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                automaticLayout: true,
                padding: { top: 6, bottom: 6 },
              }}
            />
          </div>

          {/* Right: Multi-Physics Consequence Log (40%) */}
          <div className="flex-[2] bg-[#070b12] flex flex-col overflow-hidden text-[11px] font-mono">
            <div className="h-6 px-2 bg-[#0c121e] border-b border-slate-800 flex items-center justify-between text-slate-400 shrink-0">
              <div className="flex items-center space-x-1.5 text-[10px]">
                <TerminalSquare className="w-3 h-3 text-cyan-400" />
                <span className="font-bold text-slate-300 uppercase">Multi-Physics Consequence Log</span>
              </div>
              <button
                onClick={onClearLogs}
                className="text-[9px] text-slate-500 hover:text-slate-300 flex items-center space-x-1"
                title="Clear console"
              >
                <Trash2 className="w-2.5 h-2.5" />
                <span>CLEAR</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 text-slate-300">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic py-2">
                  Console idle. Run node or manipulate actuators to view timestamped physics telemetry...
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex space-x-1 leading-relaxed">
                    <span className="text-cyan-500/70 select-none">›</span>
                    <span className={log.includes('WARN') || log.includes('🚨') ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                      {log}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeSpaceIDE;