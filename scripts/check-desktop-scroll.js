const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4173');
    await page.waitForFunction(() => window.ditesmoiMotion?.ready && ditesmoiIntro.done);
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const result = await page.evaluate(async () => {
      const samples = [];
      for (const region of ['page', 'destinations']) {
        const pin = ditesmoiMotion.horizontal;
        const start = region === 'page' ? 900 : pin.start;
        const end = region === 'page' ? pin.start : pin.end;
        const frames = []; const stalls = []; let previous;
        await new Promise(resolve => {
          const began = performance.now();
          function tick(now) {
            if (previous) { frames.push(now - previous); if (now - previous > 33.4) stalls.push({ ms: now - previous, progress: pin.progress, y: scrollY }); }
            previous = now;
            const progress = Math.min(1, (now - began) / 4000);
            ditesmoiMotion.lenis.scrollTo(start + (end - start) * progress, { immediate: true, force: true });
            if (progress < 1) requestAnimationFrame(tick); else resolve();
          }
          requestAnimationFrame(tick);
        });
        const sorted = frames.slice().sort((a, b) => a - b);
        samples.push({ region, stalls, p95: sorted[Math.floor(sorted.length * .95)], max: Math.max(...frames), over33: frames.filter(v => v > 33.4).length });
      }
      return { smoothWheel: ditesmoiMotion.lenis.options.smoothWheel, triggers: ScrollTrigger.getAll().length,
        parallaxLayers: document.querySelectorAll('.image-parallax').length, cpuSlowdown: 4, samples };
    });
    assert.equal(result.smoothWheel, false);
    assert.equal(result.parallaxLayers, 0);
    assert.ok(result.triggers <= 2);
    await page.screenshot({ path: 'preview/desktop-scroll-destinations.png' });
    await fs.writeFile('preview/desktop-scroll-results.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
