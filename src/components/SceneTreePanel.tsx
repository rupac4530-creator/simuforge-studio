// ============================================================
// SimuForge Studio — 180 cm Biomimetic Anatomical Scene Tree
// 110+ DoF, 68.4 kg Anthropomorphic Architecture Hierarchy
// Integrated Layer Peeling & X-Ray Dissection Controls
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  LayerOpacityState, Selectable3DPart, AnatomicalLayer,
  EyeballOpticsState, FACSState
} from '../types/biomimetic';
import {
  ChevronRight, ChevronDown, Layers, Eye, EyeOff, Search,
  Cpu, Activity, Flame, Shield, Sparkles, Sliders, Box,
  Disc, Terminal, Heart, Hand, Zap
} from 'lucide-react';

export interface BiomimeticTreeNode {
  id: string;
  name: string;
  layer: AnatomicalLayer;
  category: string;
  dofCount?: number;
  massKg?: number;
  worldPosition?: [number, number, number];
  boundingBoxRadiusM?: number;
  activeSpecId?: string;
  availableSwaps?: string[];
  details?: string;
  children?: BiomimeticTreeNode[];
}

export const BIOMIMETIC_SCENE_GRAPH: BiomimeticTreeNode[] = [
  {
    id: 'layer_1_integumentary',
    name: 'Layer 1: Integumentary & Dermis',
    layer: 'integumentary',
    category: 'layer_group',
    massKg: 6.20,
    details: 'Living human skin emulation with SSS PBR & tactile array',
    children: [
      {
        id: 'silicone_face_skin',
        name: 'Facial_Silicone_Dermis (Ecoflex 00-20 SSS)',
        layer: 'integumentary',
        category: 'silicone_skin',
        massKg: 0.85,
        worldPosition: [0, 1.68, 0.08],
        boundingBoxRadiusM: 0.12,
        activeSpecId: 'ecoflex_0020',
        availableSwaps: ['ecoflex_0010', 'ecoflex_0020', 'frubber', 'dragonskin_10'],
        details: 'Shore 00-20, Modulus 0.08 MPa, SSS transmission'
      },
      {
        id: 'follicular_hair_array',
        name: 'Follicular_Hair_Array (Eyebrows, Lashes, Hairline)',
        layer: 'integumentary',
        category: 'hair_follicles',
        massKg: 0.12,
        worldPosition: [0, 1.74, 0.07],
        boundingBoxRadiusM: 0.09,
        details: 'Dense instanced 3D hair punched at 15°-45° angles'
      },
      {
        id: 'subdermal_heater_mesh',
        name: 'SubDermal_Kapton_Heater_Mesh (36.0°C)',
        layer: 'integumentary',
        category: 'thermal_heater',
        massKg: 0.45,
        worldPosition: [0, 1.65, 0.06],
        boundingBoxRadiusM: 0.15,
        details: 'Resistive Kapton wire matrix maintaining physiological warmth'
      },
      {
        id: 'tactile_eskin_matrix',
        name: 'Tactile_eSkin_Taxel_Matrix (Fingertips 1mm / Face 10mm)',
        layer: 'integumentary',
        category: 'tactile_sensor',
        massKg: 0.78,
        worldPosition: [0, 0.95, 0.0],
        boundingBoxRadiusM: 0.20,
        details: '14,800 active piezoresistive taxels with SPI bus'
      }
    ]
  },
  {
    id: 'layer_2_musculoskeletal',
    name: 'Layer 2: Cranial FACS & Musculoskeletal Actuators',
    layer: 'musculoskeletal',
    category: 'layer_group',
    massKg: 23.40,
    dofCount: 78,
    details: '32-DoF cranial Bowden rig, McKibben hydro-muscles & QDDs',
    children: [
      {
        id: 'cranial_bowden_cluster',
        name: 'Cranial_Bowden_Cluster (AU1, AU2, AU4, AU6, AU12, AU26)',
        layer: 'musculoskeletal',
        category: 'cranial_actuators',
        massKg: 1.85,
        dofCount: 32,
        worldPosition: [0, 1.66, 0.04],
        boundingBoxRadiusM: 0.10,
        activeSpecId: 'coreless_linear_servo',
        availableSwaps: ['sub_micro_pwm', 'coreless_linear_servo'],
        details: '32 PTFE Bowden cables from clavicle to sub-dermal anchor pins'
      },
      {
        id: 'thoracic_hydro_pump',
        name: 'Thoracic_Hydro_Pump (500W Electro-Hydraulic Heart)',
        layer: 'musculoskeletal',
        category: 'hydro_pump',
        massKg: 2.40,
        worldPosition: [0, 1.25, 0.03],
        boundingBoxRadiusM: 0.12,
        details: '500W brushless motor, 3.5 L/min at 120 bar pressure'
      },
      {
        id: 'l_arm_mckibben_hand',
        name: 'Left_Arm_McKibben_Muscles & 24_DoF_Tendon_Hand',
        layer: 'musculoskeletal',
        category: 'limb_actuators',
        massKg: 3.10,
        dofCount: 31,
        worldPosition: [-0.28, 1.15, 0.0],
        boundingBoxRadiusM: 0.22,
        details: 'Braided McKibben hydro-muscles with 24-DoF tendon-driven hand'
      },
      {
        id: 'r_arm_mckibben_hand',
        name: 'Right_Arm_McKibben_Muscles & 24_DoF_Tendon_Hand',
        layer: 'musculoskeletal',
        category: 'limb_actuators',
        massKg: 3.10,
        dofCount: 31,
        worldPosition: [0.28, 1.15, 0.0],
        boundingBoxRadiusM: 0.22,
        details: 'Braided McKibben hydro-muscles with 24-DoF tendon-driven hand'
      },
      {
        id: 'lower_body_qdd_actuators',
        name: 'Lower_Body_QDD_Actuators (Hip 360Nm, Knee 8000N Roller)',
        layer: 'musculoskeletal',
        category: 'lower_actuators',
        massKg: 12.95,
        dofCount: 12,
        worldPosition: [0, 0.65, 0.0],
        boundingBoxRadiusM: 0.35,
        details: 'Frameless PMSM QDDs + inverted planetary roller screws'
      }
    ]
  },
  {
    id: 'layer_3_endoskeleton',
    name: 'Layer 3: Endoskeleton & Thermal Vascularity',
    layer: 'endoskeletal',
    category: 'layer_group',
    massKg: 22.80,
    details: '7075-T6 CNC aluminum, 24-vertebrae spine & liquid cooling',
    children: [
      {
        id: 'cranium_carbon_tmj',
        name: 'Cranium_Carbon_Cage & 4Bar_TMJ_Mandible',
        layer: 'endoskeletal',
        category: 'skull_skeleton',
        massKg: 1.10,
        dofCount: 1,
        worldPosition: [0, 1.67, 0.02],
        boundingBoxRadiusM: 0.11,
        details: 'Carbon-fiber skull with drop-and-translate TMJ jaw linkage'
      },
      {
        id: 'articulated_24_vertebrae_spine',
        name: 'Articulated_24_Vertebrae_Spine',
        layer: 'endoskeletal',
        category: 'spine_column',
        massKg: 3.60,
        dofCount: 3,
        worldPosition: [0, 1.22, -0.04],
        boundingBoxRadiusM: 0.20,
        details: '24 segmented discs with elastomeric damping discs'
      },
      {
        id: 'cnc_7075_structural_skeleton',
        name: '7075_T6_Ribcage_Pelvis_Femur_Tibia',
        layer: 'endoskeletal',
        category: 'aluminum_skeleton',
        massKg: 16.50,
        worldPosition: [0, 0.85, 0.0],
        boundingBoxRadiusM: 0.45,
        details: 'Hard-anodized aerospace aluminum with high torsional stiffness'
      },
      {
        id: 'liquid_cooling_capillaries',
        name: 'Closed_Loop_Liquid_Cooling_Capillaries',
        layer: 'endoskeletal',
        category: 'cooling_network',
        massKg: 1.60,
        worldPosition: [0, 1.30, 0.02],
        boundingBoxRadiusM: 0.25,
        details: 'Deionized water + propylene glycol conduit network'
      }
    ]
  },
  {
    id: 'layer_4_electronics_power',
    name: 'Layer 4: Bionic Eyeballs, Compute & Power Core',
    layer: 'electronics',
    category: 'layer_group',
    massKg: 16.00,
    dofCount: 12,
    details: '24mm bionic eyeballs, NVIDIA Orin cerebrum, 16S battery',
    children: [
      {
        id: 'left_eyeball_camera',
        name: 'Left_24mm_Bionic_Eyeball_Assembly',
        layer: 'electronics',
        category: 'eyeball_camera',
        massKg: 0.048,
        dofCount: 3,
        worldPosition: [-0.032, 1.68, 0.095],
        boundingBoxRadiusM: 0.02,
        activeSpecId: 'imx219',
        availableSwaps: ['imx219', 'ov9281', 'ov5640', 'prophesee_event'],
        details: '24mm sclera, cornea dome, Nitinol iris & 8x8mm MIPI camera PCB',
        children: [
          { id: 'l_cornea_dome', name: 'L_Cornea_Optical_Dome (n=1.376)', layer: 'electronics', category: 'cornea', worldPosition: [-0.032, 1.68, 0.103], boundingBoxRadiusM: 0.008, details: 'Clear optical transmission dome' },
          { id: 'l_sclera_shell', name: 'L_Veined_Sclera_Shell (24mm)', layer: 'electronics', category: 'sclera', worldPosition: [-0.032, 1.68, 0.095], boundingBoxRadiusM: 0.012, details: 'Ivory spherical housing with capillary relief' },
          { id: 'l_nitinol_iris', name: 'L_Nitinol_6Blade_Iris_Diaphragm (2-7mm)', layer: 'electronics', category: 'iris_mechanism', worldPosition: [-0.032, 1.68, 0.10], boundingBoxRadiusM: 0.006, details: 'Nitinol SMA-actuated 6-blade pupil constrictor' },
          { id: 'l_camera_pcb', name: 'L_Internal_MIPI_Camera_PCB', layer: 'electronics', category: 'camera_sensor', worldPosition: [-0.032, 1.68, 0.092], boundingBoxRadiusM: 0.005, details: '8x8mm micro-PCB with CMOS die & MIPI CSI-2 flex' },
          { id: 'l_gimbal_rig', name: 'L_Dual_Gimbal_Yaw_Pitch_Eyelid_Rig', layer: 'electronics', category: 'gimbal_rig', worldPosition: [-0.032, 1.68, 0.088], boundingBoxRadiusM: 0.015, details: 'Independent vergence yaw & coupled pitch pushrods' }
        ]
      },
      {
        id: 'right_eyeball_camera',
        name: 'Right_24mm_Bionic_Eyeball_Assembly',
        layer: 'electronics',
        category: 'eyeball_camera',
        massKg: 0.048,
        dofCount: 3,
        worldPosition: [0.032, 1.68, 0.095],
        boundingBoxRadiusM: 0.02,
        activeSpecId: 'imx219',
        availableSwaps: ['imx219', 'ov9281', 'ov5640', 'prophesee_event'],
        details: '24mm sclera, cornea dome, Nitinol iris & 8x8mm MIPI camera PCB',
        children: [
          { id: 'r_cornea_dome', name: 'R_Cornea_Optical_Dome (n=1.376)', layer: 'electronics', category: 'cornea', worldPosition: [0.032, 1.68, 0.103], boundingBoxRadiusM: 0.008, details: 'Clear optical transmission dome' },
          { id: 'r_sclera_shell', name: 'R_Veined_Sclera_Shell (24mm)', layer: 'electronics', category: 'sclera', worldPosition: [0.032, 1.68, 0.095], boundingBoxRadiusM: 0.012, details: 'Ivory spherical housing with capillary relief' },
          { id: 'r_nitinol_iris', name: 'R_Nitinol_6Blade_Iris_Diaphragm (2-7mm)', layer: 'electronics', category: 'iris_mechanism', worldPosition: [0.032, 1.68, 0.10], boundingBoxRadiusM: 0.006, details: 'Nitinol SMA-actuated 6-blade pupil constrictor' },
          { id: 'r_camera_pcb', name: 'R_Internal_MIPI_Camera_PCB', layer: 'electronics', category: 'camera_sensor', worldPosition: [0.032, 1.68, 0.092], boundingBoxRadiusM: 0.005, details: '8x8mm micro-PCB with CMOS die & MIPI CSI-2 flex' },
          { id: 'r_gimbal_rig', name: 'R_Dual_Gimbal_Yaw_Pitch_Eyelid_Rig', layer: 'electronics', category: 'gimbal_rig', worldPosition: [0.032, 1.68, 0.088], boundingBoxRadiusM: 0.015, details: 'Independent vergence yaw & coupled pitch pushrods' }
        ]
      },
      {
        id: 'cerebrum_ai_core',
        name: 'Cerebrum_AI_Core (Dual NVIDIA Jetson Thor 800 TOPS)',
        layer: 'electronics',
        category: 'compute_module',
        massKg: 1.85,
        worldPosition: [0, 1.35, 0.01],
        boundingBoxRadiusM: 0.10,
        activeSpecId: 'jetson_thor_automotive',
        availableSwaps: ['jetson_orin_agx', 'jetson_thor_automotive'],
        details: 'Dual Thor SoM running VLA policies & dual MIPI CSI-2 video'
      },
      {
        id: 'cerebellum_realtime_mcu',
        name: 'Cerebellum_RealTime_MCU (TI C2000 EtherCAT Master)',
        layer: 'electronics',
        category: 'microcontroller',
        massKg: 0.35,
        worldPosition: [0, 1.30, -0.02],
        boundingBoxRadiusM: 0.08,
        details: 'TMS320F28388D 1000 Hz real-time EtherCAT deterministic bus'
      },
      {
        id: 'battery_pack',
        name: 'Structural_Battery_Pack (16S 58.8V 2.4kWh Silicon 4680)',
        layer: 'electronics',
        category: 'battery_core',
        massKg: 9.80,
        worldPosition: [0, 0.92, 0.0],
        boundingBoxRadiusM: 0.16,
        activeSpecId: 'silicon_anode_4680_24kwh',
        availableSwaps: ['nmc_21700_18kwh', 'silicon_anode_4680_24kwh'],
        details: '16S6P 40Ah Silicon-Anode cell pack in pelvic center of mass'
      }
    ]
  }
];

interface SceneTreePanelProps {
  selectedPartId: string | null;
  onSelectPart: (part: Selectable3DPart) => void;
  layers: LayerOpacityState;
  onChangeLayers: (layers: LayerOpacityState) => void;
  onSelectPreset: (preset: 'full' | 'dissection' | 'muscle' | 'core') => void;
  eyeballShellOpacity: number;
  onChangeEyeballShellOpacity: (val: number) => void;
}

export const SceneTreePanel: React.FC<SceneTreePanelProps> = ({
  selectedPartId,
  onSelectPart,
  layers,
  onChangeLayers,
  onSelectPreset,
  eyeballShellOpacity,
  onChangeEyeballShellOpacity
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    layer_1_integumentary: true,
    layer_2_musculoskeletal: true,
    layer_3_endoskeleton: true,
    layer_4_electronics_power: true,
    left_eyeball_camera: true,
    right_eyeball_camera: false
  });

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateLayer = (key: keyof LayerOpacityState, value: any) => {
    onChangeLayers({ ...layers, [key]: value });
  };

  const handleNodeClick = (node: BiomimeticTreeNode) => {
    onSelectPart({
      id: node.id,
      name: node.name,
      layer: node.layer,
      category: node.category,
      worldPosition: node.worldPosition || [0, 1.5, 0],
      boundingBoxRadiusM: node.boundingBoxRadiusM || 0.1,
      activeSpecId: node.activeSpecId || node.id,
      availableSwaps: node.availableSwaps || []
    });
  };

  // Filtered nodes
  const filterTree = (nodes: BiomimeticTreeNode[]): BiomimeticTreeNode[] => {
    if (!searchQuery.trim()) return nodes;
    const q = searchQuery.toLowerCase();

    return nodes.reduce<BiomimeticTreeNode[]>((acc, node) => {
      const matches = node.name.toLowerCase().includes(q) || (node.details && node.details.toLowerCase().includes(q));
      const filteredChildren = node.children ? filterTree(node.children) : [];

      if (matches || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children
        });
      }
      return acc;
    }, []);
  };

  const filteredTree = useMemo(() => filterTree(BIOMIMETIC_SCENE_GRAPH), [searchQuery]);

  const getNodeIcon = (node: BiomimeticTreeNode) => {
    switch (node.category) {
      case 'layer_group':
        return <Layers className="w-3.5 h-3.5 text-cyan-400" />;
      case 'silicone_skin':
        return <Shield className="w-3.5 h-3.5 text-rose-400" />;
      case 'cranial_actuators':
        return <Activity className="w-3.5 h-3.5 text-purple-400" />;
      case 'eyeball_camera':
        return <Eye className="w-3.5 h-3.5 text-emerald-400" />;
      case 'compute_module':
        return <Cpu className="w-3.5 h-3.5 text-cyan-300" />;
      case 'battery_core':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'hydro_pump':
        return <Heart className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Box className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const renderTree = (nodes: BiomimeticTreeNode[], level = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedNodes[node.id];
      const hasChildren = node.children && node.children.length > 0;
      const isSelected = selectedPartId === node.id;

      return (
        <div key={node.id} className="select-none text-xs">
          <div
            onClick={() => handleNodeClick(node)}
            className={`flex items-center space-x-1.5 py-1 px-2 cursor-pointer transition-colors rounded ${
              isSelected
                ? 'bg-cyan-600/30 text-white font-medium border-l-2 border-cyan-400'
                : 'text-slate-300 hover:bg-slate-800/60'
            }`}
            style={{ paddingLeft: `${level * 12 + 6}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-0.5 hover:text-white text-slate-500 rounded"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5" />
            )}

            {getNodeIcon(node)}

            <span className="truncate flex-1 font-mono text-[11px]">{node.name}</span>

            {node.massKg !== undefined && (
              <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1 py-0.2 rounded border border-slate-800">
                {node.massKg}kg
              </span>
            )}
          </div>

          {hasChildren && (isExpanded || searchQuery) && (
            <div className="relative">
              <div
                className="absolute top-0 bottom-0 w-[1px] bg-slate-800/80"
                style={{ left: `${level * 12 + 12}px` }}
              />
              {renderTree(node.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <aside className="w-[280px] bg-[#111827] border-r border-[#1e293b] flex flex-col h-full select-none shrink-0 overflow-hidden">
      {/* Top Header & Search */}
      <div className="p-2 border-b border-[#1e293b] bg-[#0f172a] shrink-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-bold text-cyan-400 text-xs">
            <Layers className="w-4 h-4" />
            <span className="uppercase tracking-wider">180 cm Anatomical Tree</span>
          </div>
          <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            68.4 kg • 110 DoF
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Search organs, eyes, actuators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0e17] border border-slate-800 rounded-md py-1 pl-6 pr-2 text-[10px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Anatomical Tree (Top Half) */}
      <div className="flex-1 overflow-y-auto py-1 px-1 border-b border-[#1e293b]">
        {renderTree(filteredTree)}
      </div>

      {/* Layer Opacity Peeling & X-Ray Dissection (Bottom Half) */}
      <div className="p-3 bg-[#0a0e17] shrink-0 space-y-2 border-t border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-cyan-300">
            <Sliders className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider text-[10px]">Anatomical Layer Peel</span>
          </div>
          <button
            onClick={() => updateLayer('xrayMode', !layers.xrayMode)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
              layers.xrayMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Enable X-Ray picking to click inside eyeball & skull"
          >
            X-RAY
          </button>
        </div>

        {/* 4 Layer Opacity Sliders */}
        <div className="space-y-1.5 text-[10px]">
          <div>
            <div className="flex justify-between text-slate-300 mb-0.5">
              <span className="font-semibold text-rose-300">L1: Integumentary (Skin)</span>
              <span className="font-mono">{Math.round(layers.integumentary * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={layers.integumentary}
              onChange={(e) => updateLayer('integumentary', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-0.5">
              <span className="font-semibold text-purple-400">L2: Musculoskeletal (Bowden)</span>
              <span className="font-mono">{Math.round(layers.musculoskeletal * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={layers.musculoskeletal}
              onChange={(e) => updateLayer('musculoskeletal', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-0.5">
              <span className="font-semibold text-slate-300">L3: Endoskeleton & Coolant</span>
              <span className="font-mono">{Math.round(layers.endoskeletal * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={layers.endoskeletal}
              onChange={(e) => updateLayer('endoskeletal', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-0.5">
              <span className="font-semibold text-cyan-300">L4: Bionic Eyes, Brain & Power</span>
              <span className="font-mono">{Math.round(layers.electronics * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={layers.electronics}
              onChange={(e) => updateLayer('electronics', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Dedicated Eyeball Cutaway Slider */}
          <div className="pt-1 border-t border-slate-800">
            <div className="flex justify-between text-slate-300 mb-0.5">
              <span className="font-semibold text-emerald-400">Eyeball Sclera Cutaway</span>
              <span className="font-mono">{Math.round(eyeballShellOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={eyeballShellOpacity}
              onChange={(e) => onChangeEyeballShellOpacity(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-400"
              title="Peel sclera shell to see internal 8x8mm PCB and iris blades"
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-800">
          <button
            onClick={() => onSelectPreset('full')}
            className="px-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[9px] font-medium border border-slate-700 text-center"
          >
            Full
          </button>
          <button
            onClick={() => onSelectPreset('dissection')}
            className="px-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[9px] font-medium border border-slate-700 text-center"
          >
            Dissect
          </button>
          <button
            onClick={() => onSelectPreset('muscle')}
            className="px-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[9px] font-medium border border-slate-700 text-center"
          >
            Muscle
          </button>
          <button
            onClick={() => onSelectPreset('core')}
            className="px-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[9px] font-medium border border-slate-700 text-center"
          >
            Core
          </button>
        </div>

        {/* Overlays */}
        <div className="flex gap-1 pt-1">
          <button
            onClick={() => updateLayer('showThermalLoop', !layers.showThermalLoop)}
            className={`flex-1 py-1 px-1 rounded text-[8px] font-bold border flex items-center justify-center space-x-1 ${
              layers.showThermalLoop
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            <Flame className="w-2.5 h-2.5" />
            <span>COOLANT</span>
          </button>
          <button
            onClick={() => updateLayer('showStrainMap', !layers.showStrainMap)}
            className={`flex-1 py-1 px-1 rounded text-[8px] font-bold border flex items-center justify-center space-x-1 ${
              layers.showStrainMap
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            <Activity className="w-2.5 h-2.5" />
            <span>STRAIN</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SceneTreePanel;