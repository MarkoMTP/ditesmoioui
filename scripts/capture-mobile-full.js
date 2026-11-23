const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const { chromium, webkit, devices } = require('playwright');
const target = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
(async () => {
  const chrome = await chromium.launch();
  const wkPath = existsSync(webkit.executablePath()) ? webkit.executablePath() : '/private/tmp/dmo-playwright/webkit-2388/pw_run.sh';
  const safari = await webkit.launch({ executablePath: wkPath });
  const checks = [];
  try {
    for (const [name, browser, descriptor] of [['iphone14', safari, devices['iPhone 14']], ['pixel7', chrome, devices['Pixel 7']]]) {
      for (const lang of ['en', 'fr']) {
        const context = await browser.newContext({ ...descriptor, reducedMotion: 'reduce' });
        const page = await context.newPage();
        await page.goto(`${target}/?lang=${lang}`); await page.waitForFunction(() => window.ditesmoiMotion?.ready && window.DMOMobile?.active);
        await page.evaluate(async () => {
          document.querySelectorAll('img[loading="lazy"]').forEach(image => { if (!image.closest('[hidden]')) image.loading = 'eager'; });
          await document.fonts.ready;
          await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode().catch(() => {})));
          scrollTo({ top: 0, behavior: 'instant' });
        });
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const fonts = await page.evaluate(() => [...document.fonts].filter(font => ['Bodoni Moda', 'Manrope', 'Mrs Saint Delafield'].includes(font.family.replaceAll('"', '').replaceAll("'", ''))).map(font => ({ family: font.family, weight: font.weight, style: font.style, status: font.status })));
        assert.ok(fonts.length >= 4 && fonts.every(font => font.status === 'loaded'), JSON.stringify(fonts));
        await page.screenshot({ path: `preview/mobile-pass/${name}-${lang}-full-reduced.png`, fullPage: true });
        checks.push({ name, lang, fonts, noOverflow: true });
        await context.close();
      }
      // Natural-flow markers keep sticky animation bounds correct after refresh/translation.
      const context = await browser.newContext({ ...descriptor, reducedMotion: 'no-preference' });
      const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${target}/?lang=fr`); await page.waitForFunction(() => window.ditesmoiMotion?.ready && window.DMOMobile?.active && ditesmoiIntro.done);
      const y = await page.locator('.destination-row').last().evaluate(node => node.previousElementSibling.getBoundingClientRect().top + scrollY - 130);
      await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y); await page.waitForTimeout(800);
      await page.evaluate(() => ScrollTrigger.refresh()); await page.waitForTimeout(100);
      assert.ok(await page.locator('.mobile-card-surface').first().evaluate(node => Math.abs(Number(gsap.getProperty(node, 'scale')) - .94) < .005));
      await page.locator('.site-header [data-language="en"]').click(); await page.waitForFunction(() => document.documentElement.lang === 'en'); await page.waitForTimeout(750);
      assert.ok(await page.locator('.mobile-card-surface').first().evaluate(node => Math.abs(Number(gsap.getProperty(node, 'scale')) - .94) < .005));
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(100);
      assert.ok(await page.locator('.mobile-card-surface').first().evaluate(node => Math.abs(Number(gsap.getProperty(node, 'scale')) - 1) < .005));
      await page.locator('.estimate-start').click(); await page.waitForSelector('#mobile-estimate-sheet[open] #estimate-quiz');
      assert.equal(await page.locator('.estimate-controls button').evaluateAll(buttons => buttons.every(button => { const r = button.getBoundingClientRect(); return r.width >= 48 && r.height >= 48; })), true);
      await page.locator('.mobile-sheet-close').click(); await page.waitForFunction(() => !document.querySelector('#mobile-estimate-sheet').open);
      assert.deepEqual(errors, []); checks.push({ name, stickyRefreshAndLanguage: true, allQuizButtons48px: true, errors });
      await context.close();
    }
    const small = await chrome.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true });
    const page = await small.newPage(); await page.goto(target); await page.waitForFunction(() => window.ditesmoiMotion?.ready && window.DMOMobile?.active);
    assert.equal(await page.locator('.destination-row').first().evaluate(node => getComputedStyle(node).position), 'relative');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('.estimate-start').click(); await page.waitForSelector('#mobile-estimate-sheet[open] #estimate-quiz');
    await page.screenshot({ path: 'preview/mobile-pass/small-phone-sheet.png' });
    await small.close(); checks.push({ smallPhone: '320×568', staticCardFallback: true, noOverflow: true });
    await fs.writeFile('preview/mobile-pass/final-checks.json', JSON.stringify(checks, null, 2));
    console.log(JSON.stringify(checks, null, 2));
  } finally { await chrome.close(); await safari.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
