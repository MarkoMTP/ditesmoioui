const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { existsSync, readFileSync } = require('node:fs');
const { chromium, webkit, devices } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const target = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const directory = 'preview/mobile-pass';
const dictionaries = { en: require('../i18n/en.json'), fr: require('../i18n/fr.json') };
const report = { devices: [], reducedMotion: [], desktop: {}, profile: {}, limitations: ['Browser emulation does not reproduce physical phone GPUs, thermal throttling, Safari browser chrome or the real software keyboard. Keyboard geometry is simulated separately.'] };
const sleep = (page, ms) => page.waitForTimeout(ms);
async function ready(page) {
  await page.waitForFunction(() => window.ditesmoiMotion?.ready && window.DMOMobile?.active && window.ditesmoiIntro.done);
  await page.evaluate(() => document.fonts.ready);
}
async function go(page, locator, offset = 104) {
  const y = await locator.evaluate((node, offset) => node.getBoundingClientRect().top + scrollY - offset, offset);
  await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), Math.max(0, y));
}
async function next(page) {
  await page.locator('.estimate-next').click();
  await page.waitForFunction(() => !document.querySelector('.estimate-next').disabled);
}
async function choose(page, name, value) {
  await page.locator(`.estimate-step.is-active [name="${name}"][value="${value}"]`).check();
  await next(page);
}
async function axe(page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
}
async function gesture(page, session, rail) {
  if (!session) {
    await rail.evaluate(node => node.scrollTo({ left: node.clientWidth * .8, behavior: 'smooth' }));
  } else {
    const box = await rail.boundingBox();
    const y = Math.min(page.viewportSize().height - 100, Math.max(130, box.y + Math.min(box.height / 2, 150)));
    const start = page.viewportSize().width - 55;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start, y }] });
    for (let step = 1; step <= 8; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start - step * 24, y }] });
      await sleep(page, 20);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await sleep(page, 650);
}
(async () => {
  await fs.mkdir(directory, { recursive: true });
  const wkPath = existsSync(webkit.executablePath()) ? webkit.executablePath() : '/private/tmp/dmo-playwright/webkit-2388/pw_run.sh';
  assert.ok(existsSync(wkPath), 'Install WebKit before running the Safari checks.');
  const chrome = await chromium.launch();
  const safari = await webkit.launch({ executablePath: wkPath });
  try {
    for (const [name, browser, descriptor] of [['iphone14', safari, devices['iPhone 14']], ['pixel7', chrome, devices['Pixel 7']]]) {
      for (const lang of ['en', 'fr']) {
        const context = await browser.newContext({ ...descriptor, reducedMotion: 'no-preference' });
        await context.route('https://ditesmoioui.com/**', route => route.abort());
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(`${target}/?lang=${lang}`);
        await ready(page);
        const introMs = await page.evaluate(() => ditesmoiIntro.finishedAt - ditesmoiIntro.started);
        assert.ok(introMs <= 1150, `Mobile intro too long: ${introMs}`);
        assert.equal(await page.evaluate(() => !!ditesmoiMotion.lenis || !!ditesmoiMotion.horizontal), false);
        assert.equal(await page.locator('.motion-cursor').evaluate(e => getComputedStyle(e).display), 'none');
        assert.ok(Math.abs(await page.locator('.hero').evaluate(e => e.offsetHeight) - descriptor.viewport.height) <= 1);
        await sleep(page, 700);
        console.log(name, lang, 'capturing sections');
        const sections = page.locator('main > section, body > footer');
        for (let index = 0; index < await sections.count(); index++) {
          const section = sections.nth(index);
          await go(page, section, index ? 100 : 0);
          await sleep(page, 850);
          const slug = await section.evaluate((node, index) => node.id || (node.classList.contains('testimonials') ? 'testimonials' : node.tagName === 'FOOTER' ? 'footer' : `section-${index + 1}`), index);
          await page.screenshot({ path: `${directory}/${name}-${lang}-${slug}.png` });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow ${name}/${lang}/${slug}`);
        }
        // Capture every sticky card when it is readable, then check the covered surface.
        const cards = page.locator('.destination-row');
        for (let index = 0; index < 4; index++) {
          const row = cards.nth(index);
          const top = await row.evaluate(node => parseFloat(getComputedStyle(node).top));
          // Restore the natural document geometry before measuring the next sticky item.
          await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
          await go(page, row, top);
          await sleep(page, 750);
          assert.equal(await row.evaluate(node => getComputedStyle(node).position), 'sticky');
          const bounds = await row.locator('.mobile-card-surface').boundingBox();
          assert.ok(bounds.y + bounds.height <= descriptor.viewport.height - 50 + 2, 'Card content covered by bottom bar');
          await page.screenshot({ path: `${directory}/${name}-${lang}-destination-0${index + 1}.png` });
        }
        const stacked = await cards.first().locator('.mobile-card-surface').evaluate(node => ({ scale: Number(gsap.getProperty(node, 'scale')), shade: Number(gsap.getProperty(node.querySelector('.mobile-card-shade'), 'opacity')) }));
        assert.ok(stacked.scale <= .945 && stacked.scale >= .935, JSON.stringify(stacked));
        assert.ok(stacked.shade > .1);
        assert.deepEqual(await cards.locator('.destination-copy h3').allTextContents(), dictionaries[lang].destinations.items.map(item => item.title));
        const session = name === 'pixel7' ? await context.newCDPSession(page) : null;
        for (const selector of ['.gallery-canvas', '.portfolio-grid', '.testimonial-slides']) {
          const rail = page.locator(selector);
          await go(page, rail, 150); await sleep(page, 700);
          assert.equal(await rail.evaluate(node => getComputedStyle(node).scrollSnapType), 'x mandatory');
          await rail.evaluate(node => node.scrollTo({ left: 0, behavior: 'instant' }));
          await gesture(page, session, rail);
          assert.ok(await rail.evaluate(node => node.scrollLeft > 50), `Rail did not swipe: ${selector}`);
        }
        // The bar follows the hero/closing/footer and cannot launch a fabricated WhatsApp number.
        await go(page, page.locator('#sisters'), 110); await sleep(page, 200);
        assert.equal(await page.locator('.mobile-bottom-bar').isVisible(), true);
        await page.locator('.mobile-bottom-bar > a').click({ force: true });
        assert.equal(await page.locator('.mobile-bar-status').textContent(), dictionaries[lang].mobile.whatsappSoon);
        const backgroundY = await page.evaluate(() => scrollY);
        await page.locator('.mobile-bottom-bar > button').click();
        await page.waitForSelector('#mobile-estimate-sheet[open] #estimate-quiz');
        await sleep(page, 100);
        assert.equal(await page.locator('.mobile-bottom-bar').isVisible(), false);
        assert.equal(await page.locator('#mobile-estimate-sheet').evaluate(node => node.offsetHeight), descriptor.viewport.height);
        await axe(page);
        await next(page);
        assert.equal(await page.locator('#estimate-error').textContent(), dictionaries[lang].quiz.validation.choice);
        await choose(page, 'destination', 'provence');
        await page.locator('.estimate-step.is-active [value="summer"]').check();
        await page.screenshot({ path: `${directory}/${name}-${lang}-quiz.png` });
        const handle = await page.locator('.mobile-sheet-drag').boundingBox();
        await page.mouse.move(handle.x + handle.width / 2, handle.y + 20); await page.mouse.down();
        await page.mouse.move(handle.x + handle.width / 2, handle.y + 170, { steps: 8 }); await page.mouse.up();
        await page.waitForFunction(() => !document.querySelector('#mobile-estimate-sheet').open);
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - backgroundY) < 3, 'Sheet close changed background scroll');
        assert.equal(await page.locator('.mobile-bottom-bar > button').evaluate(node => node === document.activeElement), true, 'Close did not restore focus');
        await page.locator('.mobile-bottom-bar > button').click();
        await page.waitForSelector('#mobile-estimate-sheet[open] #estimate-quiz');
        assert.equal(await page.locator('[name="season"][value="summer"]').isChecked(), true);
        await next(page); await choose(page, 'guests', '100_150'); await choose(page, 'style', 'weekend'); await choose(page, 'investment', 'range_2');
        for (const [field, value] of Object.entries({ firstName: 'Alex', partnerName: 'Sam', email: 'alex@example.test', country: 'France', message: 'A celebration with our favourite people.' })) await page.locator(`[name="${field}"]`).fill(value);
        // Simulate a keyboard viewport without claiming to reproduce Safari's browser chrome.
        await page.evaluate(() => {
          window.mobileHeroHeight = document.querySelector('.hero').offsetHeight;
          Object.defineProperty(visualViewport, 'height', { configurable: true, get: () => Math.max(280, innerHeight - 300) });
          visualViewport.dispatchEvent(new Event('resize'));
          document.querySelector('[name="message"]').focus();
        });
        await sleep(page, 400);
        const keyboard = await page.locator('[name="message"]').evaluate(node => ({ bottom: node.getBoundingClientRect().bottom, viewport: visualViewport.height, font: getComputedStyle(node).fontSize, heroStable: document.querySelector('.hero').offsetHeight === window.mobileHeroHeight }));
        assert.ok(keyboard.bottom <= keyboard.viewport - 5, JSON.stringify(keyboard));
        assert.equal(keyboard.font, '16px'); assert.equal(keyboard.heroStable, true);
        await page.screenshot({ path: `${directory}/${name}-${lang}-keyboard-geometry.png` });
        await page.evaluate(() => { document.activeElement.blur(); delete visualViewport.height; visualViewport.dispatchEvent(new Event('resize')); });
        await sleep(page, 100);
        const other = lang === 'en' ? 'fr' : 'en';
        await page.locator(`#mobile-estimate-sheet [data-language="${other}"]`).click();
        await page.waitForFunction(lang => document.documentElement.lang === lang, other); await sleep(page, 350);
        assert.equal(await page.locator('[name="email"]').inputValue(), 'alex@example.test');
        await page.locator(`#mobile-estimate-sheet [data-language="${lang}"]`).click();
        await page.waitForFunction(lang => document.documentElement.lang === lang, lang); await sleep(page, 350);
        await page.locator('.estimate-next').click();
        await page.waitForFunction(() => document.querySelector('.estimate-result.is-active') && !document.querySelector('.estimate-back').disabled);
        assert.equal(await page.locator('.estimate-result h3').textContent(), dictionaries[lang].quiz.result.titles.provence);
        assert.equal(await page.evaluate(() => dataLayer.filter(event => event.event === 'estimate_submitted').length), 1);
        await axe(page);
        await page.screenshot({ path: `${directory}/${name}-${lang}-result.png` });
        await page.locator('.mobile-sheet-close').click(); await page.waitForFunction(() => !document.querySelector('#mobile-estimate-sheet').open);
        await go(page, page.locator('#contact')); await sleep(page, 200); assert.equal(await page.locator('.mobile-bottom-bar').isVisible(), false);
        await go(page, page.locator('.site-footer')); await sleep(page, 200); assert.equal(await page.locator('.mobile-bottom-bar').isVisible(), false);
        await page.reload(); await ready(page); await sleep(page, 1300); assert.equal(await page.evaluate(() => ditesmoiIntro.first), false);
        await axe(page); assert.deepEqual(errors, []);
        report.devices.push({ name, engine: name === 'iphone14' ? 'WebKit' : 'Chromium', lang, viewport: descriptor.viewport, introMs: Math.round(introMs), stickyStack: stacked, rails: true, trustedTouchSwipe: !!session, bottomBar: true, dragClose: true, keyboardGeometry: keyboard, quizStateAndTranslation: true, accessibilityViolations: 0, errors });
        console.log(name, lang, 'passed'); await context.close();
      }
    }
    // Reduced motion must be static, including sheet navigation and media.
    for (const [name, browser, descriptor] of [['iphone14', safari, devices['iPhone 14']], ['pixel7', chrome, devices['Pixel 7']]]) {
      const context = await browser.newContext({ ...descriptor, reducedMotion: 'reduce' });
      const page = await context.newPage(); await page.goto(`${target}/?lang=fr`); await ready(page);
      assert.equal(await page.evaluate(() => ditesmoiIntro.first), false);
      assert.equal(await page.locator('.destination-row').first().evaluate(node => getComputedStyle(node).position), 'relative');
      assert.equal(await page.locator('.hero-video').evaluate(node => node.paused && !node.getAttribute('src')), true);
      await page.locator('.estimate-start').click(); await page.waitForSelector('#mobile-estimate-sheet[open] #estimate-quiz');
      assert.equal(await page.locator('.mobile-sheet-panel').evaluate(node => node.getAnimations().length), 0);
      await page.locator('.mobile-sheet-close').click(); await page.waitForFunction(() => !document.querySelector('#mobile-estimate-sheet').open);
      await axe(page); report.reducedMotion.push({ name, staticCards: true, noIntro: true, noVideoAutoplay: true, instantSheet: true, accessibilityViolations: 0 });
      await context.close();
    }
    // Desktop's geometry and scrolling mode stay unchanged, and the mobile controller is not fetched.
    const desktop = await chrome.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    const page = await desktop.newPage(); const mobileRequests = [];
    page.on('request', request => { if (/\/js\/mobile\.js$/.test(request.url())) mobileRequests.push(request.url()); });
    await page.goto(target); await page.waitForFunction(() => window.ditesmoiMotion?.ready && ditesmoiIntro.done);
    assert.deepEqual(mobileRequests, []); assert.equal(await page.locator('.mobile-card-surface, .mobile-bottom-bar, .mobile-estimate-sheet').count(), 0);
    assert.equal(await page.evaluate(() => !!ditesmoiMotion.lenis && !!ditesmoiMotion.horizontal), true);
    assert.equal(await page.locator('.gallery-canvas').evaluate(node => getComputedStyle(node).display), 'block');
    assert.equal(await page.locator('.testimonial-slides').evaluate(node => getComputedStyle(node).display), 'grid');
    report.desktop = { unchangedLayout: true, lenisAndHorizontalPin: true, noMobileControllerRequest: true };
    // Exercise both breakpoint directions, retaining the same form node.
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForFunction(() => window.DMOMobile?.active && document.querySelectorAll('.mobile-card-surface').length === 4);
    await sleep(page, 150); await page.setViewportSize({ width: 1440, height: 1000 }); await page.waitForFunction(() => !DMOMobile.active && !!ditesmoiMotion.horizontal);
    assert.equal(await page.locator('.mobile-card-surface, .mobile-bottom-bar, .mobile-estimate-sheet').count(), 0);
    report.desktop.breakpointCleanup = true; await desktop.close();
    // Profile steady destination scrolling without screenshot/axe work in the sample.
    const profileContext = await chrome.newContext({ ...devices['Pixel 7'], reducedMotion: 'no-preference' });
    const profilePage = await profileContext.newPage(); await profilePage.goto(target); await ready(profilePage);
    const session = await profileContext.newCDPSession(profilePage); await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    report.profile = await profilePage.evaluate(async () => {
      const rows = [...document.querySelectorAll('.destination-row')];
      const start = rows[0].getBoundingClientRect().top + scrollY - 110;
      const end = rows.at(-1).getBoundingClientRect().top + scrollY - 130;
      const samples = []; let previous; const began = performance.now();
      return new Promise(resolve => {
        function frame(now) {
          if (previous) samples.push(now - previous); previous = now;
          const progress = Math.min(1, (now - began) / 4000);
          scrollTo({ top: start + (end - start) * progress, behavior: 'instant' });
          if (progress < 1) requestAnimationFrame(frame);
          else { const sorted = samples.slice().sort((a, b) => a - b); const percentile = p => sorted[Math.floor((sorted.length - 1) * p)]; resolve({ cpuSlowdown: 4, sampleMs: 4000, frames: samples.length, medianFrameMs: percentile(.5), p95FrameMs: percentile(.95), maxFrameMs: Math.max(...samples), framesOver33ms: samples.filter(v => v > 33.4).length }); }
        }
        requestAnimationFrame(frame);
      });
    });
    await profileContext.close();
    const autoContext = await chrome.newContext({ ...devices['Pixel 7'], reducedMotion: 'no-preference' });
    const autoPage = await autoContext.newPage(); await autoPage.goto(`${target}/?lang=en`); await ready(autoPage);
    await go(autoPage, autoPage.locator('.testimonial-slider'), 150);
    await autoPage.evaluate(() => document.activeElement.blur());
    await sleep(autoPage, 8100);
    assert.equal(await autoPage.locator('.testimonial-slide.is-active').getAttribute('aria-label'), '2 of 5', 'Mobile automatic advance failed');
    await autoPage.locator('.testimonial-slider').evaluate(node => {
      const event = new Event('touchstart', { bubbles: true }); Object.defineProperty(event, 'touches', { value: [{ clientX: 200, clientY: 300 }] }); node.dispatchEvent(event);
    });
    await sleep(autoPage, 8100);
    assert.equal(await autoPage.locator('.testimonial-slide.is-active').getAttribute('aria-label'), '2 of 5', 'Touch did not pause autoplay');
    await autoPage.locator('.testimonial-slider').evaluate(node => {
      const event = new Event('touchend', { bubbles: true }); Object.defineProperty(event, 'changedTouches', { value: [{ clientX: 200, clientY: 300 }] }); node.dispatchEvent(event);
    });
    await sleep(autoPage, 8100);
    assert.equal(await autoPage.locator('.testimonial-slide.is-active').getAttribute('aria-label'), '3 of 5', 'Mobile autoplay did not resume after touch');
    report.testimonialAutoAdvance = { intervalMs: 7000, advances: true, pausesDuringTouch: true, resumesAfterTouch: true };
    await autoContext.close();
    const skipContext = await chrome.newContext({ ...devices['Pixel 7'], reducedMotion: 'no-preference' });
    const skipPage = await skipContext.newPage(); await skipPage.goto(target, { waitUntil: 'domcontentloaded' });
    await skipPage.locator('#motion-intro[open]').waitFor({ state: 'visible' });
    const began = Date.now(); await skipPage.touchscreen.tap(200, 300); await skipPage.waitForFunction(() => ditesmoiIntro.done);
    report.introTapSkipMs = Date.now() - began; assert.ok(report.introTapSkipMs < 350);
    await skipContext.close();
    await fs.writeFile(`${directory}/results.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  } finally { await safari.close(); await chrome.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
