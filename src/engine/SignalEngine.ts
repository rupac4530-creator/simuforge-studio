// ============================================================
// SimuForge Studio — RF Signal Propagation Engine
// Log-Distance Path Loss Model with Material Attenuation
// ============================================================

import { RFConfig, RFState, RFBand, RF_MATERIALS } from '../types/simulation';

/** Band preset configuration */
interface BandPreset {
  frequency: number;       // Hz
  pathLossExponent: number;
  txPower: number;         // dBm
  noiseFloor: number;      // dBm
  txGain: number;          // dBi
  rxGain: number;          // dBi
}

const BAND_PRESETS: Record<RFBand, BandPreset> = {
  '2.4GHz_WiFi': {
    frequency: 2.4e9,
    pathLossExponent: 3.0,
    txPower: 20,
    noiseFloor: -95,
    txGain: 2,
    rxGain: 2,
  },
  '2.4GHz_BLE': {
    frequency: 2.4e9,
    pathLossExponent: 2.5,
    txPower: 4,
    noiseFloor: -97,
    txGain: 0,
    rxGain: 0,
  },
  '915MHz_LoRa': {
    frequency: 915e6,
    pathLossExponent: 2.8,
    txPower: 14,
    noiseFloor: -120,
    txGain: 2,
    rxGain: 2,
  },
  '5.8GHz_FPV': {
    frequency: 5.8e9,
    pathLossExponent: 3.5,
    txPower: 25,
    noiseFloor: -90,
    txGain: 5,
    rxGain: 3,
  },
};

/** Shadow fading standard deviation in dB */
const SHADOW_FADING_SIGMA = 2.0;

/** SNR threshold below which packet loss becomes significant */
const SNR_THRESHOLD_DB = 6.0;

/** Base round-trip time in ms */
const BASE_RTT_MS = 5.0;

/** Jitter standard deviation in ms */
const JITTER_SIGMA_MS = 1.5;

/**
 * Generate a normally distributed random number using the Box-Muller transform.
 */
function gaussianRandom(mean: number, stddev: number): number {
  let u1 = Math.random();
  let u2 = Math.random();
  // Avoid log(0)
  while (u1 === 0) u1 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + stddev * z;
}

/**
 * 3D Euclidean distance between two points.
 */
function distance3D(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Ray-AABB (axis-aligned bounding box) intersection test.
 * Returns true if the ray from `origin` in direction `dir`
 * intersects the box defined by `boxMin` and `boxMax`
 * within the parametric range [0, maxT].
 *
 * Uses the slab method.
 */
function rayIntersectsAABB(
  origin: [number, number, number],
  dir: [number, number, number],
  boxMin: [number, number, number],
  boxMax: [number, number, number],
  maxT: number
): boolean {
  let tMin = 0;
  let tMax = maxT;

  for (let i = 0; i < 3; i++) {
    const invD = dir[i] !== 0 ? 1.0 / dir[i] : (dir[i] >= 0 ? Infinity : -Infinity);
    let t0 = (boxMin[i] - origin[i]) * invD;
    let t1 = (boxMax[i] - origin[i]) * invD;

    if (invD < 0) {
      const tmp = t0;
      t0 = t1;
      t1 = tmp;
    }

    tMin = Math.max(tMin, t0);
    tMax = Math.min(tMax, t1);

    if (tMax < tMin) {
      return false;
    }
  }

  return true;
}

/**
 * Check which obstacles a ray from baseStation to robot passes through.
 * Returns array of { material, loss } for each obstacle penetrated.
 */
function findWallIntersections(
  baseStation: [number, number, number],
  robot: [number, number, number],
  obstacles: Array<{
    position: [number, number, number];
    size: [number, number, number];
    material: string;
  }>
): Array<{ material: string; loss: number }> {
  const dx = robot[0] - baseStation[0];
  const dy = robot[1] - baseStation[1];
  const dz = robot[2] - baseStation[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (dist < 1e-9) return [];

  const dir: [number, number, number] = [dx / dist, dy / dist, dz / dist];
  const result: Array<{ material: string; loss: number }> = [];

  for (const obs of obstacles) {
    const halfX = obs.size[0] / 2;
    const halfY = obs.size[1] / 2;
    const halfZ = obs.size[2] / 2;

    const boxMin: [number, number, number] = [
      obs.position[0] - halfX,
      obs.position[1] - halfY,
      obs.position[2] - halfZ,
    ];
    const boxMax: [number, number, number] = [
      obs.position[0] + halfX,
      obs.position[1] + halfY,
      obs.position[2] + halfZ,
    ];

    if (rayIntersectsAABB(baseStation, dir, boxMin, boxMax, dist)) {
      const materialName = obs.material;
      const loss = RF_MATERIALS[materialName] ?? 0;
      if (loss > 0) {
        result.push({ material: materialName, loss });
      }
    }
  }

  return result;
}

/**
 * RF Signal Propagation Engine
 *
 * Implements Log-Distance Path Loss model with:
 * - Free Space Path Loss (FSPL)
 * - Configurable path loss exponent per band
 * - 3D ray-box intersection for wall/obstacle detection
 * - Material-specific attenuation from RF_MATERIALS
 * - Gaussian shadow fading
 * - SNR computation with per-band noise floor
 * - Sigmoidal packet loss when SNR is low
 * - Latency with base RTT + Gaussian jitter
 * - Link quality percentage
 */
export class SignalEngine {
  private config: RFConfig;
  private baseStationPos: [number, number, number];
  private noiseFloor: number;
  private frequency: number;

  constructor() {
    const preset = BAND_PRESETS['2.4GHz_WiFi'];
    this.config = {
      band: '2.4GHz_WiFi',
      txPower: preset.txPower,
      txGain: preset.txGain,
      rxGain: preset.rxGain,
      pathLossExponent: preset.pathLossExponent,
      noiseFigure: 6,
    };
    this.noiseFloor = preset.noiseFloor;
    this.frequency = preset.frequency;
    this.baseStationPos = [0, 2, 0]; // default base station at 2m height
  }

  /**
   * Partially update the RF configuration.
   */
  setConfig(config: Partial<RFConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.band) {
      // Also update internal band-dependent values
      const preset = BAND_PRESETS[config.band];
      this.noiseFloor = preset.noiseFloor;
      this.frequency = preset.frequency;
    }
  }

  /**
   * Switch to a predefined band, loading all its defaults.
   */
  setBand(band: RFBand): void {
    const preset = BAND_PRESETS[band];
    this.config = {
      band,
      txPower: preset.txPower,
      txGain: preset.txGain,
      rxGain: preset.rxGain,
      pathLossExponent: preset.pathLossExponent,
      noiseFigure: this.config.noiseFigure,
    };
    this.noiseFloor = preset.noiseFloor;
    this.frequency = preset.frequency;
  }

  /**
   * Set the position of the base station / access point in 3D space (meters).
   */
  setBaseStationPosition(pos: [number, number, number]): void {
    this.baseStationPos = [...pos] as [number, number, number];
  }

  /**
   * Compute the full RF state given the robot's position and obstacles in the scene.
   *
   * Model:
   *   RSSI(d) = Ptx + Gtx + Grx - FSPL(1m) - 10*n*log10(d) - Σ(Lwall) + N(0, σ)
   *
   * Where:
   *   FSPL(1m) = 20*log10(f) + 20*log10(1) - 147.55  (for d=1m)
   *            = 20*log10(f) - 147.55
   *   n        = path loss exponent
   *   Lwall    = material-specific wall attenuation in dB
   *   N(0,σ)   = Gaussian shadow fading with σ = 2.0 dB
   */
  compute(
    robotPos: [number, number, number],
    obstacles: Array<{
      position: [number, number, number];
      size: [number, number, number];
      material: string;
    }>
  ): RFState {
    const dist = distance3D(this.baseStationPos, robotPos);
    const { txPower, txGain, rxGain, pathLossExponent, noiseFigure } = this.config;

    // --- Free Space Path Loss at 1m reference distance ---
    // FSPL(1m) = 20*log10(1) + 20*log10(f) - 147.55
    //          = 20*log10(f) - 147.55
    const fspl1m = 20 * Math.log10(this.frequency) - 147.55;

    // --- Log-Distance path loss beyond 1m ---
    // If distance <= 0, clamp to a very small value to avoid -Infinity
    const effectiveDist = Math.max(dist, 0.01);
    const logDistanceLoss = 10 * pathLossExponent * Math.log10(effectiveDist);

    // --- Wall / obstacle attenuation ---
    const wallLosses = findWallIntersections(this.baseStationPos, robotPos, obstacles);
    const totalWallLoss = wallLosses.reduce((sum, w) => sum + w.loss, 0);

    // --- Gaussian shadow fading ---
    const shadowFading = gaussianRandom(0, SHADOW_FADING_SIGMA);

    // --- RSSI ---
    // RSSI = Ptx + Gtx + Grx - FSPL(1m) - 10*n*log10(d) - wallLosses + fading
    const rssi = txPower + txGain + rxGain - fspl1m - logDistanceLoss - totalWallLoss + shadowFading;

    // --- Effective noise floor (including receiver noise figure) ---
    const effectiveNoiseFloor = this.noiseFloor + noiseFigure;

    // --- SNR ---
    const snr = rssi - effectiveNoiseFloor;

    // --- Packet Loss ---
    // Sigmoid-based model: as SNR drops below threshold, packet loss increases
    // packetLoss = 100 / (1 + exp(k * (SNR - threshold)))
    // k controls steepness; positive k means loss decreases as SNR increases
    let packetLoss: number;
    if (snr >= 30) {
      packetLoss = 0;
    } else {
      const k = 1.2; // steepness factor
      packetLoss = 100.0 / (1.0 + Math.exp(k * (snr - SNR_THRESHOLD_DB)));
    }
    packetLoss = Math.max(0, Math.min(100, packetLoss));

    // --- Latency ---
    // Base RTT + jitter (always positive)
    const jitter = Math.abs(gaussianRandom(0, JITTER_SIGMA_MS));
    // Additional latency from retransmissions due to packet loss
    const retransmissionDelay = (packetLoss / 100) * BASE_RTT_MS * 2;
    const latency = Math.max(0.1, BASE_RTT_MS + jitter + retransmissionDelay);

    // --- Link Quality ---
    // Map RSSI to 0-100% quality
    // -30 dBm or better = 100%, -100 dBm or worse = 0%
    const rssiMin = -100;
    const rssiMax = -30;
    let linkQuality = ((rssi - rssiMin) / (rssiMax - rssiMin)) * 100;
    linkQuality = Math.max(0, Math.min(100, linkQuality));

    return {
      rssi: Math.round(rssi * 100) / 100,
      snr: Math.round(snr * 100) / 100,
      linkQuality: Math.round(linkQuality * 10) / 10,
      latency: Math.round(latency * 100) / 100,
      packetLoss: Math.round(packetLoss * 100) / 100,
      distance: Math.round(effectiveDist * 1000) / 1000,
      wallLosses,
    };
  }

  /**
   * Return a copy of the current RF configuration.
   */
  getConfig(): RFConfig {
    return { ...this.config };
  }
}
