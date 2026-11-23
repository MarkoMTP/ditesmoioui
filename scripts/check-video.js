const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const { chromium, webkit, devices } = require('playwright');
const target = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';

async function playing(page) {
  await page.waitForFunction(() => {
    const video = document.querySelector('.hero-video');
    return !video.paused && video.readyState >= 2 && video.currentTime > .1;
  });
}
async function returnToHero(page) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(400);
}
(async () => {
  const wkPath = existsSync(webkit.executablePath()) ? webkit.executablePath()
    : '/private/tmp/dmo-playwright/webkit-2388/pw_run.sh';
  for (const [name, engine, device] of [['Pixel 7', chromium, devices['Pixel 7']], ['iPhone 14', webkit, devices['iPhone 14']]]) {
    const browser = await engine.launch(engine === webkit ? { executablePath: wkPath } : {});
    try {
      const context = await browser.newContext({ ...device, reducedMotion: 'no-preference' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(target);
      await playing(page);
      const range = await page.request.get(`${target}/assets/video/hero-mobile.mp4`, { headers: { Range: 'bytes=0-1' } });
      assert.equal(range.status(), 206);
      assert.equal(range.headers()['content-type'], 'video/mp4');
      assert.match(range.headers()['content-range'], /^bytes 0-1\//);
      assert.equal((await range.body()).length, 2);
      assert.equal(await page.locator('video').evaluate(v => v.muted && v.defaultMuted && v.playsInline && !v.error), true);
      await page.waitForFunction(() => window.ditesmoiIntro?.done);
      await page.evaluate(() => scrollTo({ top: innerHeight * 2, behavior: 'instant' }));
      await page.waitForFunction(() => document.querySelector('video').paused);
      await returnToHero(page);
      await playing(page);
      await page.getByRole('button', { name: 'Pause hero video' }).click();
      await page.evaluate(() => scrollTo({ top: innerHeight * 2, behavior: 'instant' }));
      await page.waitForTimeout(200);
      await returnToHero(page);
      assert.equal(await page.locator('video').evaluate(v => v.paused), true, 'Visitor pause must persist');
      await page.getByRole('button', { name: 'Play hero video' }).click();
      await playing(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.querySelector('video').paused);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await playing(page);
      assert.deepEqual(errors, []);
      await context.close();

      const reduced = await browser.newContext({ ...device, reducedMotion: 'reduce' });
      const staticPage = await reduced.newPage();
      await staticPage.goto(target);
      await staticPage.waitForTimeout(1000);
      assert.equal(await staticPage.locator('video').evaluate(v => v.paused && !v.getAttribute('src')), true);
      await staticPage.getByRole('button', { name: 'Play hero video' }).click();
      await playing(staticPage);
      await reduced.close();

      // Interrupt the first JS playback request, as happens when loading/visibility races.
      const interrupted = await browser.newContext({ ...device, reducedMotion: 'no-preference' });
      await interrupted.addInitScript(() => {
        const original = HTMLMediaElement.prototype.play;
        window.videoPlayRequests = 0;
        HTMLMediaElement.prototype.play = function () {
          this.autoplay = false;
          if (++window.videoPlayRequests === 1) return Promise.reject(new DOMException('Interrupted test request', 'AbortError'));
          return original.call(this);
        };
      });
      const retryPage = await interrupted.newPage();
      await retryPage.goto(target);
      await playing(retryPage);
      assert.ok(await retryPage.evaluate(() => videoPlayRequests >= 2));
      await interrupted.close();
      console.log(`${name}: MP4 ranges, muted inline autoplay, offscreen resume, explicit pause, reduced motion and interrupted-play recovery passed.`);
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
