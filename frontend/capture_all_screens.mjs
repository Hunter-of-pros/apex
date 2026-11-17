import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

const SCREENSHOTS_DIR = resolve('../screenshots');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function run() {
  console.log('Launching headless browser via Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();

  const views = [
    {
      name: '01_worklist.png',
      url: 'http://127.0.0.1:3000/?view=worklist',
      waitFor: 'table tbody tr'
    },
    {
      name: '02_imaging_case.png',
      url: 'http://127.0.0.1:3000/?view=case&id=1',
      waitFor: 'img[alt="Thoracic Radiograph"]'
    },
    {
      name: '03_tabular_case.png',
      url: 'http://127.0.0.1:3000/?view=case&id=23',
      waitFor: 'svg'
    },
    {
      name: '04_model_transparency.png',
      url: 'http://127.0.0.1:3000/?view=transparency',
      waitFor: 'svg'
    },
    {
      name: '05_quality_alert_case.png',
      url: 'http://127.0.0.1:3000/?view=case&id=13',
      waitFor: 'img[alt="Thoracic Radiograph"]'
    },
    {
      name: '06_audit_trail.png',
      url: 'http://127.0.0.1:3000/?view=audit',
      waitFor: 'table tbody tr'
    }
  ];

  for (const v of views) {
    console.log(`Capturing ${v.name} at ${v.url}...`);
    try {
      await page.goto(v.url, { waitUntil: 'networkidle0', timeout: 15000 });
      if (v.waitFor) {
        await page.waitForSelector(v.waitFor, { timeout: 8000 }).catch(() => {});
      }
      // Brief pause for SVG rendering and canvas drawing
      await new Promise((r) => setTimeout(r, 600));

      const outPath = `${SCREENSHOTS_DIR}/${v.name}`;
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Saved screenshot: ${outPath}`);
    } catch (err) {
      console.error(`Failed to capture ${v.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
}

run().catch((err) => {
  console.error('Fatal error capturing screenshots:', err);
  process.exit(1);
});
