const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const target = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
(async () => {
  await fs.mkdir('preview/motion-recording', { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference', recordVideo: { dir: 'preview/motion-recording', size: { width: 960, height: 667 } } });
    const page = await context.newPage();
    const video = page.video();
    await page.goto(target);
    await page.waitForFunction(() => ditesmoiIntro.done && ditesmoiMotion.ready);
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'preview/motion-hero.png' });
    async function travel(y, settle = 1800) {
      await page.evaluate(y => ditesmoiMotion.lenis.scrollTo(y, { duration: 1.15, force: true }), y);
      await page.waitForTimeout(settle);
    }
    const position = selector => page.locator(selector).evaluate(el => el.getBoundingClientRect().top + scrollY);
    await travel((await position('.stats-band')) - 240, 2200);
    await page.screenshot({ path: 'preview/motion-stats.png' });
    await travel((await position('.gallery-canvas')) - 280, 2500);
    const box = await page.locator('.gallery-image').first().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(850);
    await page.screenshot({ path: 'preview/motion-gallery.png' });
    await page.mouse.move(10, 100);
    const pin = await page.evaluate(() => ({ start: ditesmoiMotion.horizontal.start, end: ditesmoiMotion.horizontal.end }));
    for (let i = 0; i < 4; i++) {
      await travel(pin.start + (pin.end - pin.start) * i / 3, 2600);
      await page.screenshot({ path: `preview/motion-destination-0${i + 1}.png` });
    }
    await travel((await position('.closing-cta')) - 96, 2000);
    await page.screenshot({ path: 'preview/motion-consultation.png' });
    await context.close();
    await fs.rename(await video.path(), 'preview/motion-tour.webm');
    console.log('Saved normal-motion screenshots and preview/motion-tour.webm');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
