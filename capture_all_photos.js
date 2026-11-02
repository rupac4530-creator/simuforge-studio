import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const brainDir = 'C:\\Users\\BEDANTA\\.gemini\\antigravity\\brain\\1146138f-4ff9-4144-8ec4-e8ede2cb960d';
const outDir = path.join(brainDir, 'photos');
const publicDir = 'C:\\Users\\BEDANTA\\.gemini\\antigravity\\scratch\\simuforge-studio\\public\\screenshots';

for (const d of [outDir, publicDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function saveScreenshot(page, filename) {
  const dest1 = path.join(outDir, filename);
  const dest2 = path.join(publicDir, filename);
  await page.screenshot({ path: dest1, type: 'png' });
  fs.copyFileSync(dest1, dest2);
  console.log(`Saved: ${filename} (${(fs.statSync(dest1).size / 1024).toFixed(1)} KB)`);
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
  await page.goto('http://localhost:4173', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await delay(4000); // Wait for initial 3D scene render

  // Helper to click by text
  const clickByText = async (text, tag = 'button') => {
    return await page.evaluate((t, tg) => {
      const elements = Array.from(document.querySelectorAll(tg));
      const el = elements.find(e => e.textContent && e.textContent.includes(t));
      if (el) {
        el.click();
        return true;
      }
      return false;
    }, text, tag);
  };

  // -------------------------------------------------------------
  // Photo 1: Full 180 cm Biomimetic Humanoid Twin (Living Skin & HUD)
  // -------------------------------------------------------------
  console.log('Capturing Photo 1: Full 180 cm Biomimetic Twin...');
  await delay(1000);
  await saveScreenshot(page, '01_biomimetic_humanoid_180cm_full.png');

  // -------------------------------------------------------------
  // Photo 2: Anatomical X-Ray Dissection Mode (Coolant + Strain)
  // -------------------------------------------------------------
  console.log('Capturing Photo 2: Anatomical X-Ray Dissection...');
  await clickByText('Dissection');
  await delay(500);
  await clickByText('COOLANT');
  await delay(500);
  await clickByText('STRAIN');
  await delay(1000);
  await saveScreenshot(page, '02_anatomical_xray_dissection.png');

  // -------------------------------------------------------------
  // Photo 3: Musculoskeletal & Spine Vascularity Preset
  // -------------------------------------------------------------
  console.log('Capturing Photo 3: Musculoskeletal Hydro-Muscles...');
  await clickByText('Muscles');
  await delay(1000);
  await saveScreenshot(page, '03_musculoskeletal_and_spine_vascularity.png');

  // -------------------------------------------------------------
  // Photo 4: Bionic Core Preset (24 mm Eyes & Internal Brain/Battery)
  // -------------------------------------------------------------
  console.log('Capturing Photo 4: Bionic Core (24mm Eyeballs & Compute)...');
  await clickByText('Bionic Core');
  await delay(1000);
  await saveScreenshot(page, '04_bionic_core_and_internal_compute.png');

  // -------------------------------------------------------------
  // Photo 5: FACS Facial Expression & Audio2Face Studio
  // -------------------------------------------------------------
  console.log('Capturing Photo 5: FACS Expression Studio Opening...');
  await clickByText('Full Clone'); // Back to full skin
  await delay(500);
  await clickByText('FACS EXPRESSION STUDIO');
  await delay(1000);
  await saveScreenshot(page, '05_facs_facial_expression_studio.png');

  // -------------------------------------------------------------
  // Photo 6: Joy & Duchenne Smile Lip-Sync in Expression Studio
  // -------------------------------------------------------------
  console.log('Capturing Photo 6: Smile & Lip-Sync in FACS Studio...');
  await clickByText('Joy / Smile');
  await delay(500);
  // Trigger phoneme A
  await clickByText('Phoneme "A"');
  await delay(1000);
  await saveScreenshot(page, '06_audio2face_smile_and_lipsync.png');

  // Close FACS studio by clicking close button or its header toggle
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[title*="Close"]');
    if (closeBtn) closeBtn.click();
    else {
      // Find the toggle
      const btns = Array.from(document.querySelectorAll('button'));
      const xBtn = btns.find(b => b.textContent && b.textContent.includes('×') || b.querySelector('svg'));
    }
  });
  await delay(500);

  // -------------------------------------------------------------
  // Photo 7: Synthetic "Robot Eye View" PiP Viewport Closeup
  // -------------------------------------------------------------
  console.log('Capturing Photo 7: Robot Eye View PiP Viewport...');
  // Toggle eye in PiP or show depth map
  await page.evaluate(() => {
    const depthBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('DEPTH'));
    if (depthBtn) depthBtn.click();
  });
  await delay(1000);
  await saveScreenshot(page, '07_robot_eye_pip_sensor_view.png');

  // -------------------------------------------------------------
  // Photo 8: Micro-Zoom into Cranial Assembly & 24mm Eyeball
  // -------------------------------------------------------------
  console.log('Capturing Photo 8: Cranial Micro-Zoom...');
  // Set camera height and yaw to focus tightly on the head
  await page.evaluate(() => {
    // Dispatch custom camera preset or click Head preset in Camera HUD if available
    const headPresetBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Head') || b.title?.includes('head'));
    if (headPresetBtn) headPresetBtn.click();
  });
  await delay(1500);
  await saveScreenshot(page, '08_bionic_eyeball_24mm_micro_zoom.png');

  // -------------------------------------------------------------
  // Photo 9: MuJoCo / Drake Quality Dynamics Analyzer Panel
  // -------------------------------------------------------------
  console.log('Capturing Photo 9: Dynamics Analyzer Panel...');
  await clickByText('DYNAMICS');
  await delay(2000);
  await saveScreenshot(page, '09_dynamics_analyzer_stability_telemetry.png');

  // -------------------------------------------------------------
  // Photo 10: Interactive Circuit & Wiring Workbench
  // -------------------------------------------------------------
  console.log('Capturing Photo 10: Interactive Circuit Workbench...');
  await clickByText('CIRCUIT EDITOR');
  await delay(2000);
  await saveScreenshot(page, '10_interactive_circuit_schematic_workbench.png');

  console.log('All 10 project photos captured successfully!');
  await browser.close();
}

run().catch(console.error);
