# SimuForge Studio — 17-DOF Humanoid Robot Digital Twin & Multi-Physics Simulator

[![Hugging Face Spaces](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Spaces%20Live-FFD21E?style=flat&logo=huggingface&logoColor=black)](https://huggingface.co/spaces/Bedanta12/simuforge-studio)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-22c55e?style=flat&logo=github&logoColor=white)](https://rupac4530-creator.github.io/simuforge-studio/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

| Deployment | Live URL | Platform |
| :--- | :--- | :--- |
| **🤗 Hugging Face Space** | [huggingface.co/spaces/Bedanta12/simuforge-studio](https://huggingface.co/spaces/Bedanta12/simuforge-studio) | Hugging Face Static Space |
| **⚡ Direct Web App** | [bedanta12-simuforge-studio.static.hf.space](https://bedanta12-simuforge-studio.static.hf.space/index.html) | Hugging Face CDN |
| **🌐 GitHub Pages** | [rupac4530-creator.github.io/simuforge-studio](https://rupac4530-creator.github.io/simuforge-studio/) | GitHub Actions Automated Pages |
| **💻 Source Code** | [github.com/rupac4530-creator/simuforge-studio](https://github.com/rupac4530-creator/simuforge-studio) | GitHub Repository |

**SimuForge Studio** is an open-source, browser-native 3D robotics simulator, rigid-body multi-physics testbed, and digital twin engineered specifically for the **17-DOF Hash V3 Humanoid Robot**.

Combining principles from foundational physics simulators (**MuJoCo**, **Drake**, **Webots**, **Gazebo**), SimuForge Studio delivers generalized coordinate kinematics, static inverse dynamics, ground reaction spring-damper contact mechanics, 6-DOF MEMS IMU sensor fusion, an interactive circuit workbench, and sandboxed firmware scripting—all running in real time in standard WebGL browsers.

---

## 🌟 Key Capabilities

### 1. OmniSim Rigid-Body Dynamics & Multi-Physics Engine
- **Accurate Mass Distribution**: Real mass and inertia table spanning 13 distinct rigid bodies totaling ~1.30 kg (torso 380g, pelvis 260g, head 95g, thighs 75g×2, shins 60g×2, feet 40g×2, upper arms 50g×2, forearms 57g×2).
- **Generalized Coordinates Kinematics**: Forward kinematics chain with accumulated 3×3 rotation matrices and spatial transforms for all 17 degrees of freedom.
- **Center of Mass (CoM) & Zero Moment Point (ZMP)**: Live 3D CoM position tracking, velocity estimation, ground projection, and quasi-static ZMP prediction.
- **Spring-Damper Contact Mechanics**: Linear spring-damper ground contact model ($k=5000\text{ N/m}$, $d=50\text{ N}\cdot\text{s/m}$) evaluating 4-corner sole penetration and active contact patch surface area.
- **Support Polygon & Stability Margin**: Real-time Graham scan 2D convex hull calculation in the ground plane ($XZ$), point-in-polygon containment check, and edge-distance stability margin.
- **Inverse Dynamics Gravity Compensation**: Analytical static torque estimation per joint:
  $$\tau_i = \hat{\mathbf{e}}_i \cdot \sum_{j \in \text{distal}(i)} (\mathbf{r}_{\text{CoM}, j} - \mathbf{r}_{\text{joint}, i}) \times (m_j \mathbf{g})$$
- **System Energy & Work**: Conservation of energy monitoring tracking gravitational potential energy ($PE = \sum m_i g h_i$), translational kinetic energy ($KE = \frac{1}{2} M v_{\text{CoM}}^2$), and mechanical work.
- **Gait Phase Detection**: Automatic classification into *Double Support*, *Left Stance*, *Right Stance*, and *Flight/Falling*.

### 2. Physical Sensor Suite & Actuator Telemetry
- **6-DOF MEMS IMU (MPU6050 / BNO055 Emulation)**:
  - Proper **specific force** computation:
    $$\mathbf{a}_{\text{measured}} = \mathbf{R}^T (\mathbf{a}_{\text{linear}} - \mathbf{g}_{\text{world}})$$
    Reads $[0, +9.81, 0]\text{ m/s}^2$ at rest on flat ground.
  - Allan variance bias random walk model and Box-Muller Gaussian sensor noise.
  - Two-state complementary filter ($\alpha = 0.98$) fusing accelerometer gravity vectors and gyro rates for roll, pitch, and yaw.
  - Sensor self-heating thermal curve ($25^\circ\text{C} \rightarrow 37^\circ\text{C}$).
- **Foot Pressure & Center of Pressure (CoP)**: Ground reaction force distribution across feet with dynamic CoP coordinates.
- **Motor Current, Power & Heat**: Per-servo mechanical power, electrical draw (nominal 6V rail), PWM duty cycle from position error, and actuator coil thermal estimation ($15^\circ\text{C/W}$).
- **2S Li-ion Battery Discharge**: Dynamic cell voltage sag under instantaneous load ($R_{\text{int}} = 150\text{ m}\Omega$), capacity percentage, and remaining runtime.

### 3. Dynamics Analyzer Panel (MuJoCo / Drake / Gazebo Quality)
- **Top Bar View Mode Switcher**: Seamlessly toggle between **3D SIMULATOR**, **CIRCUIT EDITOR**, and **DYNAMICS**.
- **World Statistics Status Bar**: High-level simulation telemetry: solver type, contact model, coordinates formulation, rigid body count, DOF count, simulation step count, sim time, active contact count, and total torque $\sum |\tau|$.
- **Four Dedicated Analysis Tabs**:
  - **Overview**: Circular stability gauge with percentage margin, gait phase badges, CoM/ZMP XYZ readouts, 200×200 2D support polygon SVG, 6-DOF IMU data grid, link mass breakdown table, energy progress bars, and battery status.
  - **Joint Inspector**: Detailed 17-joint telemetry table with current angle, color-coded load bars, torque ($\text{N}\cdot\text{m}$), electrical wattage, mechanical stop limit badges (0–100%), angular velocity, and coil temperature.
  - **Contacts & Stability**: Expanded ground projection canvas with CoM, ZMP, and CoP markers; left and right foot contact cards with normal forces ($\text{N}$), penetration depths ($\text{mm}$), and contact surface areas ($\text{mm}^2$); physical spring-damper parameter readouts.
  - **Energy & Power**: Potential, kinetic, and total mechanical energy charts; electrical power breakdown; individual servo current and PWM duty cycle tables; Li-ion battery pack specifications.

### 4. 3D Viewport Dynamics Overlays
- **Pulsing CoM Marker**: Yellow sphere rendered directly at the 3D Center of Mass with a dashed ground projection drop line and ground projection dot.
- **Support Polygon Projection**: Semi-transparent ground polygon (green when dynamically stable, pulsating red during fall risk).
- **Contact Patches & Force Vectors**: Blue/purple ground contact soles with vertical force lines proportional to normal force.

### 5. Interactive Circuit & Wiring Workbench
- **Full-Screen Photorealistic Hardware Schematic**: SVG models of ESP32 DevKit V1, Dual PCA9685 drivers, SSD1306 0.96" OLED, MAX98357A I2S DAC, PAM8403 amplifier, HC-SR04 ultrasonic sensor, 2S 7.4V battery pack, 6V 5A UBEC, 5V 3A buck converter, speaker, and status LED.
- **Interactive Wiring & Pin Routing**: Click pins to create or disconnect wires with smooth bezier routing.
- **Signal-Type Color Coding**: Power (Red), Ground (Dark Grey), I²C (Blue), I²S (Green), GPIO (Orange), and PWM (Violet).
- **C++/Arduino Code Inspection**: Click any wire connection to inspect the matching Arduino/ESP32 C++ firmware snippet and library call.
- **Live OLED & Servo Monitor**: Test all 8 facial expressions and observe 17-channel PCA9685 servo telemetry in real time.

### 6. Smartphone Remote & Voice Operations
- **Live Speech Recognition**: Uses the Web Speech API (`webkitSpeechRecognition`) for natural voice control.
- **16 Pre-Programmed Gestures & Gaits**: *Say Hi*, *Shake Hands*, *Hands Up/Down*, *Bicep Flexes*, *Bow*, *Sit Down*, *Stand Up*, *Forward Walk*, *Backward Walk*, *Turn Left/Right*, *Push-Ups*, and *Celebration Dance*.
- **D-Pad Locomotion**: Precise walking and turning with visual feedback.
- **Safety**: Motor arm/disarm toggle and Emergency Stop (E-Stop).

### 7. Integrated Monaco Code Studio & Extended API
- Sandboxed JavaScript runtime with full robot control and physics introspection API:
  - `robot.setServo(name, angle)`
  - `robot.homePosition()`
  - `robot.wait(ms)`
  - `robot.log(msg)`
  - `robot.speak(text)`
  - `robot.getIMU()` — Accelerometer, gyroscope, and complementary filtered roll/pitch/yaw
  - `robot.getCoM()` — Center of mass coordinates and stability margin
  - `robot.getJointTorques()` — Real-time gravity compensation torques
  - `robot.getFootContacts()` — Left and right foot normal forces and contact states
  - `robot.getPowerDraw()` — Total watts, current, and battery runtime
  - `robot.getGaitPhase()` — Current gait state (*double_support*, *left_stance*, etc.)
  - `robot.getZMP()` — Zero moment point coordinates

---

## 📐 Engineering Diagrams & Hardware Documentation

The kinematic model, electronic interfaces, and structural dimensions are derived directly from the physical humanoid robot build documentation:

### 1. Structural Dimensions & Physical Specifications
![Structure and Dimensions](docs/diagrams/01-complete-structure-and-dimensions.jpg)

* **Overall Dimensions**: 420 mm standing height (expandable to 450 mm), 280 mm shoulder-to-shoulder width, 120 mm front-to-back depth, with an assembled weight of 1.2–1.5 kg.
* **Materials & Chassis**: Cut and bent 1.0–2.0 mm lightweight aluminum alloy sheet for torso and limb linkages, 3.0–5.0 mm laser-cut acrylic chest and head covers, 3D printed PLA/ABS head frame, aluminum U-channels, and silicone anti-vibration foot soles.
* **Kinematic Degrees of Freedom (17-DOF)**:
  * **Legs (5 DOF × 2 = 10 DOF)**: Hip Yaw, Hip Roll, Hip Pitch, Knee Pitch, Ankle Pitch.
  * **Arms (3 DOF × 2 = 6 DOF)**: Shoulder Pitch, Shoulder Roll, Elbow Pitch.
  * **Head (1 DOF)**: Neck Yaw rotation.
* **Head & Facial Unit**: Integrates a 0.96" SSD1306 OLED screen (128×64 pixels) for animated facial expressions and dual HC-SR04 ultrasonic transducers for obstacle awareness.

---

### 2. Mechanical Exploded View & Joint Assembly
![Mechanical Assembly and Exploded View](docs/diagrams/02-mechanical-assembly-and-exploded-view.jpg)

* **Sub-Assembly Breakdown**:
  * **Head Assembly**: Front faceplate, OLED display bracket, ultrasonic sensor mounting cradle, 3D printed rear enclosure, and pan servo bracket.
  * **Torso Enclosure**: Heavy-duty structural aluminum frame with front, back, and side plates enclosing the electronics bay, battery compartment, and dual servo driver stack.
  * **Arm Assemblies (x2)**: Shoulder pitch bracket, upper arm U-channel link (100 mm), elbow pitch servo, forearm bracket (90 mm), and passive multi-jointed gripping hand (70 mm).
  * **Leg Assemblies (x2)**: Pelvis mounting bracket, hip rotation joint, thigh link (100 mm), knee bend joint, shin link (100 mm), ankle pivot, and broad aluminum foot plate (100 × 60 × 20 mm).
* **Hardware & Fasteners**: High-tensile M3 (8–12 mm) and M4 (12–16 mm) stainless steel hex-socket machine screws, aluminum standoffs/spacers, flange bearings, and nylon locknuts.
* **Assembly Workflow**: Follows an 8-stage pipeline from individual servo electrical zeroing (90° neutral calibration), sub-chassis assembly, harness routing, to final center-of-mass alignment.

---

### 3. Internal Electronics & Hardware Placement
![Internal Electronics and Hardware Placement](docs/diagrams/03-internal-electronics-hardware-layout.jpg)

* **Torso Interior Layout**:
  * **Primary Controller**: ESP32 DevKit V1 (Xtensa dual-core @ 240 MHz, integrated BLE 4.2 & 802.11 b/g/n Wi-Fi) mounted in the upper torso.
  * **Servo Driver Stack**: Dual PCA9685 16-channel 12-bit PWM controllers communicating over I²C (`0x40` primary, `0x41` auxiliary).
  * **Audio Subsystem**: PAM8403 / MAX98357A audio amplifier paired with a 4Ω 3W dynamic speaker located behind the upper chest vent.
  * **Power Bay**: Low-center-of-mass bottom compartment housing the 2S 7.4V Li-ion battery pack and high-efficiency switching buck converters.
* **Wiring Channels**: Recessed internal raceways protect servo signal lines (PWM), I²C buses, and high-current power cables from pinching during multi-axis articulation.

---

### 4. Software & Control System Architecture
![Software and Control Architecture](docs/diagrams/04-software-and-control-architecture.jpg)

* **Communication Pipeline**:
  $$\text{Voice / Smartphone UI} \xrightarrow{\text{BLE / Web Speech}} \text{ESP32 DevKit} \xrightarrow{\text{I²C Bus}} \text{Dual PCA9685} \xrightarrow{\text{50 Hz PWM}} \text{17× Servos}$$
* **System Flow & State Machine**:
  * Non-blocking command dispatcher parses incoming Bluetooth/serial strings.
  * Forward kinematics trajectory generator computes smoothstep joint interpolation curves.
  * Synchronized multi-modal feedback triggers matching OLED facial bitmaps and audio playback via I²S DAC.
* **Extensible Firmware**: Designed for seamless transition from the browser simulator to physical C++/Arduino IDE firmware (`Adafruit_PWMServoDriver`, `Wire`, `ESP32Servo`, `U8g2lib`).

---

### 5. Wiring Schematic & Power Distribution
![Wiring and Power Distribution Diagram](docs/diagrams/05-wiring-and-power-distribution-diagram.jpg)

* **Dual-Rail Power Architecture**:
  * **High-Current Servo Rail**: 2S 7.4V Li-ion $\rightarrow$ 10A Master Fuse $\rightarrow$ Toggle Switch $\rightarrow$ 6V 5A UBEC $\rightarrow$ PCA9685 V+ terminals. Prevents motor back-EMF and inductive current spikes from resetting the controller.
  * **Logic Rail**: 7.4V $\rightarrow$ 5V 3A Buck Converter $\rightarrow$ ESP32 VIN, logic VCC for PCA9685 drivers, OLED display, and audio amplifier.
  * **Sensor Rail**: 3.3V regulated output from ESP32 for low-noise sensor references.
* **Pinout & Bus Topology**:
  * **I²C Bus**: SDA (GPIO 21), SCL (GPIO 22) operating at 400 kHz fast mode, shared by PCA9685 #1 (`0x40`), PCA9685 #2 (`0x41`), and SSD1306 OLED (`0x3C`).
  * **Ultrasonic (HC-SR04)**: Trigger $\rightarrow$ GPIO 12, Echo $\rightarrow$ GPIO 14 (with 5V-to-3.3V voltage divider).
  * **I²S Audio DAC**: BCLK $\rightarrow$ GPIO 26, LRC $\rightarrow$ GPIO 25, DOUT $\rightarrow$ GPIO 27.
  * **Status Telemetry**: Onboard Heartbeat LED $\rightarrow$ GPIO 2.

---

## 💻 Tech Stack

| Category | Technologies |
| :--- | :--- |
| **Frontend Core** | React 18, TypeScript 5.6, Vite 6 |
| **3D Rendering** | Three.js (r170), `@react-three/fiber`, `@react-three/drei` |
| **Physics & Dynamics**| Generalized Coordinates FK, Inverse Dynamics Gravity Solver, Spring-Damper Contact |
| **Sensors & Fusion**| Specific Force MEMS IMU, Complementary Filter, Allan Variance Bias Walk |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Charts & Signals**| SVG Vector Visualization, Custom Responsive Canvases |
| **Styling & UI** | TailwindCSS 3.4, Lucide React Icons |
| **Voice Recognition**| HTML5 Web Speech API |

---

## 🚀 Quick Start (Local Development)

### Prerequisites

Ensure you have **Node.js 18+** and **npm / pnpm / yarn** installed:

```bash
node -v
npm -v
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/rupac4530-creator/simuforge-studio.git
   cd simuforge-studio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx vite --host
   ```

4. Open your browser at:
   ```
   http://localhost:5173
   ```

### Production Build

To verify TypeScript typing and create an optimized production build:

```bash
npx vite build
```

The compiled static assets will be output to the `dist/` directory ready for deployment to any static hosting provider.

---

## 📁 Repository Structure

```
simuforge-studio/
├── docs/
│   └── diagrams/                     # High-resolution robot blueprints & schematics
│       ├── 01-complete-structure-and-dimensions.jpg
│       ├── 02-mechanical-assembly-and-exploded-view.jpg
│       ├── 03-internal-electronics-hardware-layout.jpg
│       ├── 04-software-and-control-architecture.jpg
│       └── 05-wiring-and-power-distribution-diagram.jpg
├── public/                           # Static assets & icons
├── src/
│   ├── components/
│   │   ├── CameraControlHUD.tsx       # Orbit, top, chase, side, FPV camera presets & HUD toggles
│   │   ├── CircuitEditorPanel.tsx     # Interactive SVG hardware workbench, editable wiring & code
│   │   ├── CodeSpaceIDE.tsx           # Monaco code editor with ESP32 sandboxed runtime
│   │   ├── DynamicsAnalyzerPanel.tsx  # 4-tab MuJoCo/Drake dynamics & energy analyzer
│   │   ├── HardwareInspectorPanel.tsx # 6-tab modal for diagnostic telemetry
│   │   ├── HumanoidModel.tsx          # 17-DOF articulated 3D mesh with semi-transparent torso
│   │   ├── PhoneRemoteHUD.tsx         # Virtual mobile remote with Web Speech & D-pad
│   │   ├── SceneTreePanel.tsx         # Webots-style hierarchical scene & servo inspector
│   │   ├── SignalAnalyzerPanel.tsx    # RF link propagation & oscilloscope panel
│   │   ├── TopControlBar.tsx          # Transport, view switcher (Simulator/Circuit/Dynamics), status
│   │   └── Viewport3D.tsx             # Three.js Canvas, shadow maps, lighting, dynamics overlays
│   ├── engine/
│   │   ├── DynamicsEngine.ts          # 13-link rigid body kinematics, CoM, ZMP, torques, energy
│   │   ├── HumanoidKinematics.ts      # 17-DOF forward kinematics & gait animator
│   │   ├── SensorSuite.ts             # 6-DOF IMU specific force, complementary filter, power profile
│   │   └── SignalEngine.ts            # RF propagation & multi-layer wall loss calculator
│   ├── types/
│   │   └── simulation.ts              # Master TypeScript interfaces, PCA map & constants
│   ├── App.tsx                        # Root application orchestrator
│   ├── index.css                      # Global styles & custom scrollbars
│   └── main.tsx                       # React DOM entry point
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🛠️ Usage Guide

1. **Viewing Dynamics & Multi-Physics**:
   * Click **DYNAMICS** in the top navigation bar to access the full-screen physics dashboard.
   * Switch between **Overview**, **Joint Inspector**, **Contacts & Stability**, and **Energy & Power** tabs to monitor real-time mechanical and electrical telemetry.
   * Switch back to **3D SIMULATOR** and check **CoM** and **Forces** on the floating Camera HUD to see 3D visual markers for the Center of Mass, support polygon, and contact forces.
2. **Switching to Circuit Editor**:
   * Click **CIRCUIT EDITOR** in the top bar to inspect hardware wiring. Click pins to route wires, click wires to inspect firmware C++ snippets, or test OLED facial expressions.
3. **Walking & Turning**:
   * Open the **Phone Remote** $\rightarrow$ tap the Arrow buttons to command walking and turning routines.
4. **Natural Voice Control**:
   * Tap **🎤 TAP TO SPEAK** on the Phone Remote and speak gestures like *"Say Hi"*, *"Move Forward"*, *"Turn Left"*, *"Dance"*, or *"Sit Down"*.
5. **Writing Custom Scripts with Extended API**:
   * Use the **Controller Code Space** at the bottom to write custom routines:
     ```javascript
     async function stabilizeGait() {
       robot.log("Checking IMU and CoM stability...");
       const imu = robot.getIMU();
       robot.log(`Current Pitch: ${imu.pitch.toFixed(1)}°, Roll: ${imu.roll.toFixed(1)}°`);
       const com = robot.getCoM();
       robot.log(`CoM Stable: ${com.isStable}, Margin: ${(com.stabilityMargin * 1000).toFixed(1)}mm`);
       const torques = robot.getJointTorques();
       robot.log(`R_Knee_Pitch Torque: ${torques.R_Knee_Pitch.toFixed(3)} N·m`);
     }
     stabilizeGait();
     ```

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).

Developed with ❤️ by **[BEDANTA CHATTERJEE](https://github.com/rupac4530-creator)** ([@Bedanta12 on Hugging Face](https://huggingface.co/Bedanta12)).
