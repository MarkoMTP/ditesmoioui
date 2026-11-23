/* Capture pixels only. No reference source, text, styles, or assets are exported. */
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

const target = process.argv[2] || 'https://loveonlakecomo.com/';
const directory = process.argv[3] || 'reference';

async function settle(page) {
  await page.evaluate(async () => {
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await pause(180);
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.waitForTimeout(1800);
}

async function dismissCookies(page) {
  for (const label of [/reject all/i, /accept all/i, /accept cookies/i, /^accept$/i, /^agree$/i, /^got it$/i]) {
    const button = page.getByRole('button', { name: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      break;
    }
  }
}

(async () => {
  await fs.mkdir(directory, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await dismissCookies(page);
      await settle(page);
      await page.screenshot({ path: path.join(directory, `${name}-full.png`), fullPage: true });
      if (name === 'desktop') {
        // Inspect geometry only, never serialize the reference site's source or copy.
        let regions = await page.evaluate(() => {
          if (document.querySelector('.hero-section > .hero') && document.querySelector('.site-footer')) {
            return [...document.querySelectorAll('main > section, body > footer')].map(el => {
              const r = el.getBoundingClientRect();
              return { y: Math.round(r.top + scrollY), height: Math.round(r.height) };
            });
          }
          const selectors = ['main > section', 'main .elementor-top-section', '[data-elementor-type="wp-page"] > .elementor-section', 'main > .e-con', 'body > .elementor > .elementor-section'];
          for (const selector of selectors) {
            const boxes = [...document.querySelectorAll(selector)].map(el => {
              const r = el.getBoundingClientRect();
              return { y: Math.round(r.top + window.scrollY), height: Math.round(r.height) };
            }).filter(r => r.height > 80);
            if (boxes.length >= 5) return boxes;
          }
          return [];
        });
        const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        if (new URL(target).hostname === 'loveonlakecomo.com') {
          // Section boundaries measured by eye from the initial full-page capture.
          const boundaries = [0, 766, 1595, 2502, 3130, 4517, 5629, 6588, 7322, 8252, 9293, 9821, fullHeight];
          regions = boundaries.slice(0, -1).map((y, i) => ({ y, height: boundaries[i + 1] - y }));
        }
        if (!regions.length) {
          for (let y = 0; y < fullHeight; y += 900) regions.push({ y, height: Math.min(900, fullHeight - y) });
        }
        await fs.writeFile(path.join(directory, 'regions.json'), JSON.stringify({ width, fullHeight, regions }, null, 2));
        for (let i = 0; i < regions.length; i++) {
          const { y, height: regionHeight } = regions[i];
          await page.screenshot({ path: path.join(directory, `section-${String(i + 1).padStart(2, '0')}.png`), fullPage: true, clip: { x: 0, y, width, height: Math.min(regionHeight, fullHeight - y) } });
        }
        console.log(`${name}: ${fullHeight}px, ${regions.length} section captures`);
      } else {
        console.log(`${name}: ${await page.evaluate(() => document.documentElement.scrollHeight)}px`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
