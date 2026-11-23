const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const target = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
(async () => {
  const browser = await chromium.launch();
  const report = { widths: [], interactions: [], accessibility: [] };
  try {
    for (const width of [390, 768, 1024, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(target);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
          scrollTo(0, y); await new Promise(r => setTimeout(r, 50));
        }
        scrollTo(0, 0);
      });
      await page.waitForTimeout(500);
      await page.evaluate(() => scrollTo(0, 0));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}`);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
      assert.equal(await page.locator('.image-slot:visible:not(.is-missing):not(.has-image)').count(), 0, 'Unresolved placeholder');
      assert.equal(await page.locator('img:not([width]), img:not([height])').count(), 0);
      assert.deepEqual(errors, []);
      assert.equal(await page.locator('.gallery-canvas .gallery-image').count(), 6);
      assert.equal(await page.locator('.destination-row').count(), 4);
      assert.deepEqual(await page.locator('.destination-copy h3').allTextContents(), ['Provence', 'French Riviera', 'Corsica', 'And beyond']);
      assert.equal(await page.locator('a[href="#destinations"]').count(), 3);
      assert.equal(await page.locator('.image-slot:visible img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)), true, 'Photo failed to load');
      assert.equal(await page.locator('.sisters-portraits img').count(), 2);
      assert.equal(await page.locator('.hero-video').evaluate(video => !video.getAttribute('src') && video.paused), true, 'Reduced motion downloaded or autoplayed the video');
      await page.getByRole('button', { name: 'Play hero video' }).click();
      await page.waitForFunction(() => !document.querySelector('.hero-video').paused && document.querySelector('.hero-video').readyState >= 2);
      await page.getByRole('button', { name: 'Pause hero video' }).click();
      assert.equal(await page.locator('.hero-video').evaluate(video => video.paused), true);
      assert.equal(await page.locator('.sisters-portraits .arch-image, .destination-row .arch-image').count(), 6);
      assert.equal(await page.locator('.button-filled').count(), 1);
      assert.equal(await page.locator('main > section').evaluateAll(sections => sections.slice(0, 3).map(s => s.id || s.className).join('|')), 'home|sisters|stats-band');
      assert.equal(await page.locator('main h2:not(#portfolio-title):not(:has(em))').count(), 0, 'Heading missing italic accent');
      assert.equal(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily.includes('Bodoni Moda')), true);
      if (width === 1440) {
        const logoCenter = await page.locator('.site-header > .wordmark').evaluate(el => { const r = el.getBoundingClientRect(); return r.x + r.width / 2; });
        assert.ok(Math.abs(logoCenter - width / 2) < 2, 'Logo is not centred');
        const geometry = await page.locator('.hero').evaluate(el => {
          const r = el.getBoundingClientRect(); const v = el.querySelector('.hero-video').getBoundingClientRect();
          return { width: r.width, height: r.height, videoWidth: v.width, videoHeight: v.height };
        });
        assert.equal(geometry.width, width);
        assert.equal(geometry.height, 900);
        assert.equal(geometry.videoWidth, width);
        assert.equal(geometry.videoHeight, 900);
      }
      if (width === 390) {
        const gallery = page.locator('.gallery-canvas');
        assert.ok(await gallery.evaluate(el => el.scrollWidth > el.clientWidth), 'Mobile strip does not scroll');
        await gallery.evaluate(el => { el.scrollLeft = 300; });
        await page.waitForTimeout(100);
        assert.ok(await gallery.evaluate(el => el.scrollLeft > 0));
      }

      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      report.accessibility.push({ width, violations: results.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => n.target) })) });
      assert.equal(results.violations.length, 0, JSON.stringify(report.accessibility.at(-1)));
      report.widths.push({ width, overflow: false, images: await page.locator('.image-slot:visible').count(), errors });
      await page.evaluate(() => scrollTo(0, 1300));
      await page.waitForTimeout(100);
      assert.equal(await page.locator('.site-header').evaluate(el => getComputedStyle(el).position), 'fixed');
      if (width < 1280) {
        await page.getByRole('button', { name: 'Open menu' }).click();
        assert.equal(await page.locator('#mobile-menu').evaluate(el => el.open), true);
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('#mobile-menu'))), true, 'Menu focus escaped');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#mobile-menu').evaluate(el => el.open), false);
        await page.waitForFunction(() => document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'false');
        assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
        await page.getByRole('button', { name: 'Open menu' }).click();
        await page.locator('#mobile-menu').getByRole('link', { name: 'The Sisters', exact: true }).click();
        assert.equal(await page.locator('#mobile-menu').evaluate(el => el.open), false);
      }
      const slider = page.locator('.testimonial-slider');
      await slider.scrollIntoViewIfNeeded();
      assert.equal(await slider.locator('.rotation-toggle').getAttribute('aria-pressed'), 'true', 'Reduced motion must disable automatic rotation');
      await slider.getByRole('button', { name: 'Show testimonial 2 of 5' }).click();
      assert.equal(await page.locator('.testimonial-slide.is-active').getAttribute('aria-label'), '2 of 5');
      await slider.focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('.testimonial-slide.is-active').getAttribute('aria-label'), '3 of 5');
      await page.keyboard.press('Home');
      if (await page.evaluate(() => window.DMOMobile?.active)) {
        await page.locator('.testimonial-slides').evaluate(track => {
          const slide = track.children[1]; track.scrollTo({ left: slide.offsetLeft + slide.offsetWidth / 2 - track.clientWidth / 2, behavior: 'instant' });
        });
        await page.waitForFunction(() => document.querySelector('.testimonial-slide.is-active').getAttribute('aria-label') === '2 of 5');
      } else {
      await slider.evaluate(el => {
        const touch = new Touch({ identifier: 1, target: el, clientX: 250, clientY: 400 });
        el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], bubbles: true }));
        const end = new Touch({ identifier: 1, target: el, clientX: 100, clientY: 410 });
        el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [end], bubbles: true }));
      });
      }
      assert.equal(await page.locator('.testimonial-slide.is-active').getAttribute('aria-label'), '2 of 5');
      await slider.getByRole('button', { name: 'Show testimonial 1 of 5' }).click();
      assert.equal(await page.locator('.testimonial-slide.is-active').getAttribute('aria-label'), '1 of 5');
      await page.locator('[data-dialog="privacy"]').click();
      assert.equal(await page.locator('#preview-dialog').evaluate(el => el.open), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#preview-dialog').evaluate(el => el.open), false);
      report.interactions.push({ width, stickyHeader: true, menu: width < 1280 ? 'passed' : 'desktop navigation', dotControls: true, keyboard: true, swipe: true, placeholderDialog: true });
      await context.close();
    }
    const motionContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    const motionPage = await motionContext.newPage();
    await motionPage.clock.install();
    await motionPage.goto(target);
    await motionPage.evaluate(() => document.fonts.ready);
    await motionPage.waitForFunction(() => !document.querySelector('.hero-video').paused && document.querySelector('.hero-video').readyState >= 2);
    report.heroVideo = { autoplay: true, muted: await motionPage.locator('.hero-video').evaluate(video => video.muted), loop: await motionPage.locator('.hero-video').evaluate(video => video.loop), reducedMotion: true, manualPlayPause: true };

    const autoSlider = motionPage.locator('.testimonial-slider');
    await autoSlider.scrollIntoViewIfNeeded();
    await motionPage.mouse.move(1, 1);
    await motionPage.waitForTimeout(200);
    await motionPage.clock.pauseAt(new Date());
    const active = () => motionPage.locator('.testimonial-slide.is-active').getAttribute('aria-label');
    await motionPage.clock.runFor(6500);
    assert.equal(await active(), '1 of 5', 'Rotation happened before seven seconds');
    await motionPage.clock.runFor(700);
    assert.equal(await active(), '2 of 5', 'Automatic rotation did not run');
    await autoSlider.dispatchEvent('mouseenter');
    await motionPage.clock.runFor(7500);
    assert.equal(await active(), '2 of 5', 'Hover did not pause rotation');
    await autoSlider.dispatchEvent('mouseleave');
    await autoSlider.focus();
    await motionPage.clock.runFor(7500);
    assert.equal(await active(), '2 of 5', 'Keyboard focus did not pause rotation');
    await autoSlider.getByRole('button', { name: 'Pause automatic testimonials' }).click();
    await motionPage.evaluate(() => document.activeElement.blur());
    await motionPage.mouse.move(1, 1);
    await motionPage.clock.runFor(7500);
    assert.equal(await active(), '2 of 5', 'Explicit pause did not stop rotation');
    await autoSlider.getByRole('button', { name: 'Resume automatic testimonials' }).click();
    await motionPage.evaluate(() => document.activeElement.blur());
    await motionPage.mouse.move(1, 1);
    await motionPage.clock.runFor(7200);
    assert.equal(await active(), '3 of 5', 'Resume did not restart rotation');
    report.automaticTestimonials = { interval: '7000ms', hoverPause: true, focusPause: true, pauseResume: true, reducedMotion: true };
    await motionContext.close();
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(target);
    await mobilePage.evaluate(() => document.fonts.ready);
    await mobilePage.waitForFunction(() => !document.querySelector('.hero-video').paused && document.querySelector('.hero-video').readyState >= 2);
    await mobilePage.waitForFunction(() => !document.querySelector('.hero-video').paused && document.querySelector('.hero-video').readyState >= 2);
    await mobilePage.getByRole('button', { name: 'Pause hero video' }).click();
    assert.equal(await mobilePage.locator('.hero-video').evaluate(video => video.paused), true);
    report.heroVideo.mobileAutoplay = true;
    report.heroVideo.fullViewport = true;
    await mobileContext.close();
    const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await noJS.goto(target);
    assert.equal(await noJS.locator('#contact-title').isVisible(), true);
    report.noJavaScriptContent = 'passed';
    await noJS.close();
    await fs.mkdir('preview', { recursive: true });
    await fs.writeFile('preview/check-results.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
