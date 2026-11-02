import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const brainDir = 'C:/Users/BEDANTA/.gemini/antigravity/brain/1146138f-4ff9-4144-8ec4-e8ede2cb960d';
const outDir = path.join(brainDir, 'photos');
const publicDir = 'C:/Users/BEDANTA/.gemini/antigravity/scratch/simuforge-studio/public/screenshots';
const docsDir = 'C:/Users/BEDANTA/.gemini/antigravity/scratch/simuforge-studio/docs/diagrams/screenshots';

for (const d of [brainDir, outDir, publicDir, docsDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function saveScreenshot(page, filename) {
  const destBrain = path.join(brainDir, filename);
  const destOut = path.join(outDir, filename);
  const destPublic = path.join(publicDir, filename);
  const destDocs = path.join(docsDir, filename);

  await page.screenshot({ path: destOut, type: 'png' });
  fs.copyFileSync(destOut, destBrain);
  fs.copyFileSync(destOut, destPublic);
  fs.copyFileSync(destOut, destDocs);
  console.log(`Saved: ${filename} (${(fs.statSync(destOut).size / 1024).toFixed(1)} KB)`);
}

async function run() {
  console.log('Launching browser for 10-shot project showcase...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--enable-webgl',
      '--window-size=1920,1080',
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
  });

  const page = await browser.newPage();
  console.log('Navigating to http://localhost:4173 ...');
  await page.goto('http://localhost:4173', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await delay(4500); // Wait for WebGL 3D scene render

  // Helper to click element by text
  const clickByText = async (text, tag = 'button') => {
    return await page.evaluate((t, tg) => {
      const elements = Array.from(document.querySelectorAll(tg));
      const el = elements.find(e => e.textContent && e.textContent.toLowerCase().includes(t.toLowerCase()));
      if (el) {
        el.click();
        return true;
      }
      return false;
    }, text, tag);
  };

  // -------------------------------------------------------------
  // Photo 1: Full 180 cm Biomimetic Humanoid Twin (Clean 4-Panel Architecture)
  // -------------------------------------------------------------
  console.log('Capturing Photo 1: Full 180 cm Biomimetic Twin in Clean 4-Panel Layout...');
  await delay(1000);
  await saveScreenshot(page, '01_biomimetic_humanoid_180cm_full.png');

  // -------------------------------------------------------------
  // Photo 2: Anatomical X-Ray Dissection Mode (Translucent Dermis, Internal Optics)
  // -------------------------------------------------------------
  console.log('Capturing Photo 2: Anatomical X-Ray Dissection...');
  await clickByText('Dissection');
  await delay(1200);
  await saveScreenshot(page, '02_anatomical_xray_dissection.png');

  // -------------------------------------------------------------
  // Photo 3: Musculoskeletal Hydro-Muscles & 24 Vertebrae
  // -------------------------------------------------------------
  console.log('Capturing Photo 3: Musculoskeletal Hydro-Muscles & Spine...');
  await clickByText('Muscles');
  await delay(1200);
  await saveScreenshot(page, '03_musculoskeletal_and_spine_vascularity.png');

  // -------------------------------------------------------------
  // Photo 4: Bionic Core Preset (24 mm Eyes & Internal Orin AI Brain / 16S Battery)
  // -------------------------------------------------------------
  console.log('Capturing Photo 4: Bionic Core (24mm Eyeballs & Compute)...');
  await clickByText('Bionic Core');
  await delay(1200);
  await saveScreenshot(page, '04_bionic_core_and_internal_compute.png');

  // -------------------------------------------------------------
  // Photo 5: Right Dock Tab 2 — FACS 32-DoF Expression & Lip-Sync Studio
  // -------------------------------------------------------------
  console.log('Capturing Photo 5: FACS & Lip-Sync Studio in Right Dock...');
  await clickByText('Full Clone'); // Back to full living skin
  await delay(600);
  await clickByText('FACS & LIP-SYNC');
  await delay(1200);
  await saveScreenshot(page, '05_facs_facial_expression_studio.png');

  // -------------------------------------------------------------
  // Photo 6: Joy & Duchenne Smile with Audio2Face Lip-Sync Active
  // -------------------------------------------------------------
  console.log('Capturing Photo 6: Smile & Audio2Face Phoneme in Right Dock...');
  await clickByText('Smile');
  await delay(600);
  await clickByText('Phoneme "A"');
  await delay(1200);
  await saveScreenshot(page, '06_audio2face_smile_and_lipsync.png');

  // -------------------------------------------------------------
  // Photo 7: Synthetic Bionic Eye PiP Viewport (120 FPS Sensor HUD)
  // -------------------------------------------------------------
  console.log('Capturing Photo 7: Robot Eye PiP Sensor Viewport...');
  // Click depth map toggle inside PiP
  await page.evaluate(() => {
    const depthBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('DEPTH'));
    if (depthBtn) depthBtn.click();
  });
  await delay(1000);
  await saveScreenshot(page, '07_robot_eye_pip_sensor_view.png');

  // -------------------------------------------------------------
  // Photo 8: Macro Zoom — Left 24mm Eyeball & Internal 8x8mm Camera Cutaway
  // -------------------------------------------------------------
  console.log('Capturing Photo 8: Macro Left 24mm Eyeball Cutaway...');
  // Switch back to Hardware Swap tab in right dock
  await clickByText('HARDWARE SWAP');
  await delay(500);
  // Click Camera Focus toolbar preset: "Eyeball Cutaway"
  await page.evaluate(() => {
    const macroBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent && (b.textContent.includes('Eyeball Cutaway') || b.textContent.includes('Eyeball'))
    );
    if (macroBtn) macroBtn.click();
  });
  await delay(2000);
  await saveScreenshot(page, '08_bionic_eyeball_24mm_micro_zoom.png');

  // -------------------------------------------------------------
  // Photo 9: 68.4 kg Dynamics & Stability Telemetry (MuJoCo/Drake Quality)
  // -------------------------------------------------------------
  console.log('Capturing Photo 9: Dynamics & Stability Analyzer...');
  await clickByText('DYNAMICS & STABILITY');
  await delay(2000);
  await saveScreenshot(page, '09_dynamics_analyzer_stability_telemetry.png');

  // -------------------------------------------------------------
  // Photo 10: Nervous System & Bus Architecture (Orin + EtherCAT + MIPI)
  // -------------------------------------------------------------
  console.log('Capturing Photo 10: Nervous System & Bus Architecture...');
  await clickByText('NERVOUS SYSTEM & BUS');
  await delay(2000);
  await saveScreenshot(page, '10_interactive_circuit_schematic_workbench.png');

  console.log('All 10 showcase photos captured successfully!');
  await browser.close();
}

run().catch(console.error);
