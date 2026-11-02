import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outDir = 'C:\\Users\\BEDANTA\\.gemini\\antigravity\\brain\\1146138f-4ff9-4144-8ec4-e8ede2cb960d\\screenshots';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('Launching Edge...');
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
  await page.goto('http://localhost:4173', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('DOM content loaded. Waiting 4000ms for WebGL scene...');
  await new Promise(r => setTimeout(r, 4000));

  const testFile = path.join(outDir, '00_test.png');
  await page.screenshot({ path: testFile });
  console.log('Saved test screenshot to:', testFile);

  await browser.close();
}

run().catch(console.error);
