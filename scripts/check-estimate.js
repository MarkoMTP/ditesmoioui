const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const config = require('../js/estimate-config');
const { calculateEstimate } = require('../js/estimate');
const target = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const report = { calculations: [], widths: [], delivery: [], motion: [] };
const active = page => page.locator('.estimate-step.is-active');
async function activate(page) {
  await page.locator('#estimate').scrollIntoViewIfNeeded();
  if (await page.evaluate(() => window.DMOMobile?.active)) await page.locator('.estimate-start').click();
  await page.locator('#estimate-quiz').waitFor({ state: 'visible' });
}
async function continueQuiz(page) {
  await page.locator('.estimate-next').click();
  await page.waitForFunction(() => !document.querySelector('.estimate-next').disabled);
}
async function choose(page, name, value) {
  await active(page).locator(`input[name="${name}"][value="${value}"]`).check();
  await continueQuiz(page);
}
async function reachContact(page) {
  await activate(page);
  await choose(page, 'destination', 'provence');
  await choose(page, 'season', 'summer');
  await choose(page, 'guests', '100_150');
  await choose(page, 'style', 'weekend');
  await choose(page, 'investment', 'range_2');
}
async function fillContact(page) {
  for (const [name, value] of Object.entries({ firstName: 'Alex', partnerName: 'Sam', email: 'alex@example.test', country: 'United Kingdom', weddingDate: '2028-06-20', message: 'A weekend among the olive trees.' })) {
    await page.locator(`[name="${name}"]`).fill(value);
  }
}
async function waitResult(page) {
  await page.waitForFunction(() => document.querySelector('.estimate-result').classList.contains('is-active') && getComputedStyle(document.querySelector('.estimate-result')).visibility === 'visible' && !document.querySelector('.estimate-back').disabled);
}
async function axe(page) {
  const result = await new AxeBuilder({ page }).include('#estimate').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
}
async function snapshot(page, path) {
  if (await page.locator('#mobile-estimate-sheet[open]').count()) { await page.screenshot({ path }); return; }
  const clip = await page.locator('#estimate-quiz').evaluate(el => {
    const r = el.getBoundingClientRect();
    return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
  });
  await page.screenshot({ path, fullPage: true, clip, style: '.site-header, .enquire-pill { visibility: hidden !important; }' });
}
(async () => {
  for (const d of config.destinations) {
    const result = calculateEstimate({ destination: d.id, guests: '50_100', style: 'intimate' }, config);
    assert.equal(result.min, config.pricing.basePrices[d.id].min);
    assert.equal(result.max, config.pricing.basePrices[d.id].max);
    report.calculations.push(d.id);
  }
  const selected = { destination: 'provence', guests: '100_150', style: 'weekend', investment: 'range_1' };
  assert.deepEqual(calculateEstimate(selected, config), { min: 70000, max: 112000, currency: 'EUR', placeholder: true, formattedRange: '€70,000–€112,000' });
  assert.deepEqual(calculateEstimate(selected, config), calculateEstimate({ ...selected, investment: 'range_3' }, config));
  assert.throws(() => calculateEstimate({ ...selected, destination: 'invalid' }, config));
  assert.throws(() => calculateEstimate({ ...selected, guests: 'invalid' }, config));
  const browser = await chromium.launch();
  try {
    for (const width of [390, 768, 1024, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', hasTouch: width < 1024 });
      const page = await context.newPage();
      const errors = [];
      const logs = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.text().startsWith('[DMO estimate')) logs.push(m.text()); });
      await page.goto(target);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => Boolean(window.DMO_ESTIMATE_CONFIG)), false, 'Quiz loaded on the hero critical path');
      const reservedGridHeight = await page.locator('.estimate-grid').evaluate(el => el.offsetHeight);
      await activate(page);
      assert.equal(await page.locator('.estimate-grid').evaluate(el => el.offsetHeight), reservedGridHeight, 'Lazy quiz changed the reserved section height');
      if (!await page.evaluate(() => window.DMOMobile?.active)) await page.locator('#estimate-quiz').scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      const stageHeight = await page.locator('.estimate-stage').evaluate(el => el.offsetHeight);
      for (let step = 0; step < 6; step++) {
        assert.equal(await page.locator('.estimate-step:visible').count(), 1);
        assert.equal(await active(page).getAttribute('data-step'), String(step));
        assert.equal(await page.locator('.estimate-stage').evaluate(el => el.offsetHeight), stageHeight, 'Quiz height shifted');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await axe(page);
        await continueQuiz(page);
        assert.ok((await page.locator('#estimate-error').textContent()).length, 'Missing validation feedback');
        if (step === 0) {
          await page.keyboard.press('Space'); // Error focused the first native radio.
          await page.keyboard.press('ArrowRight');
          assert.equal(await page.locator('[name="destination"]:checked').inputValue(), 'riviera');
          await page.keyboard.press('ArrowLeft');
          await page.keyboard.press('Enter');
          await page.waitForFunction(() => document.querySelector('.estimate-step.is-active')?.dataset.step === '1');
          await page.locator('.estimate-back').click();
          assert.equal(await page.locator('[name="destination"]:checked').inputValue(), 'provence');
          await continueQuiz(page);
        } else if (step === 1) {
          await active(page).locator('[value="summer"]').check();
          await page.locator('[name="year"]').fill('1900');
          await continueQuiz(page);
          assert.match(await page.locator('#estimate-error').textContent(), /whole year/);
          await page.locator('[name="year"]').fill('');
          await continueQuiz(page);
        } else if (step === 2) await choose(page, 'guests', '100_150');
        else if (step === 3) await choose(page, 'style', 'weekend');
        else if (step === 4) await choose(page, 'investment', 'range_2');
        else {
          assert.equal(await page.evaluate(() => document.activeElement.name), 'firstName');
          await fillContact(page);
          await page.locator('[name="email"]').fill('invalid');
          await continueQuiz(page);
          assert.match(await page.locator('#estimate-error').textContent(), /valid email/);
          await page.locator('[name="email"]').fill('alex@example.test');
          if (width === 390 || width === 1440) await snapshot(page, `preview/estimate-contact-${width}.png`);
          await page.locator('.estimate-next').dblclick();
          await waitResult(page);
        }
        if (step === 0 && (width === 390 || width === 1440)) {
          await page.locator('.estimate-back').click();
          await snapshot(page, `preview/estimate-quiz-${width}.png`);
          await continueQuiz(page);
        }
      }
      assert.equal(await page.locator('.estimate-result .estimate-range').textContent(), '€70,000–€112,000');
      assert.equal(await page.locator('.estimate-result h3').textContent(), 'Your celebration in Provence');
      assert.equal(await page.locator('.estimate-preview-note').isVisible(), true);
      assert.equal(await page.locator('.estimate-stage').evaluate(el => el.offsetHeight), stageHeight);
      assert.equal(await page.locator('.estimate-grid').evaluate(el => el.offsetHeight), reservedGridHeight, 'Result changed the section height');
      const events = await page.evaluate(() => dataLayer.filter(e => e.event === 'estimate_submitted'));
      assert.equal(events.length, 1, 'Duplicate conversion');
      assert.deepEqual(Object.keys(events[0]).sort(), ['currency', 'destination', 'estimate_max', 'estimate_min', 'event', 'guests', 'range', 'style', 'submission_mode'].sort());
      assert.equal(events[0].submission_mode, 'demo');
      assert.equal(logs.length, 1);
      assert.deepEqual(errors, []);
      await axe(page);
      if (width === 390 || width === 1440) await snapshot(page, `preview/estimate-result-${width}.png`);
      await page.getByRole('button', { name: 'Start again' }).click();
      assert.equal(await page.locator('input:checked').count(), 0);
      report.widths.push({ width, stableHeight: stageHeight, keyboard: true, validation: true, back: true, noOverflow: true, axeViolations: 0, demoEvent: 1 });
      await context.close();
    }
    // Real HTTP code, intercepted locally: no enquiry reaches an external service.
    for (const mode of ['success', 'error', 'timeout']) {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.route('**/js/estimate-config.js', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace("endpoint: ''", "endpoint: '/__test-estimate'").replace('timeoutMs: 15000', 'timeoutMs: 150') });
      });
      let attempt = 0;
      let payload;
      await page.route('**/__test-estimate', async route => {
        payload = route.request().postDataJSON(); attempt++;
        if (mode === 'timeout' && attempt === 1) await new Promise(r => setTimeout(r, 400));
        try { await route.fulfill({ status: mode === 'error' && attempt === 1 ? 503 : 200, contentType: 'application/json', body: JSON.stringify({ ok: !(mode === 'error' && attempt === 1) }) }); } catch (_) { /* request timed out */ }
      });
      await page.goto(target);
      await reachContact(page); await fillContact(page);
      await page.locator('.estimate-next').click();
      if (mode !== 'success') {
        await page.waitForFunction(() => document.querySelector('#estimate-error').textContent.includes('try again'));
        assert.equal(await page.locator('[name="email"]').inputValue(), 'alex@example.test');
        assert.equal(await page.evaluate(() => (window.dataLayer || []).filter(e => e.event === 'estimate_submitted').length), 0);
        await page.locator('.estimate-next').click();
      }
      await waitResult(page);
      assert.equal(payload.estimate.min, 70000);
      assert.equal(payload.email, 'alex@example.test');
      assert.equal(await page.locator('.estimate-preview-note').isVisible(), false);
      assert.equal(await page.evaluate(() => dataLayer.filter(e => e.event === 'estimate_submitted' && e.submission_mode === 'live').length), 1);
      report.delivery.push({ mode, attempts: attempt, expectedResult: true });
      await context.close();
    }
    for (const mode of ['normal', 'preference-switch', 'no-library']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      if (mode === 'no-library') await page.route('**/assets/vendor/*.js', route => route.abort());
      await page.goto(target); await page.evaluate(() => document.fonts.ready);
      await reachContact(page); await fillContact(page);
      if (mode === 'preference-switch') {
        await page.locator('.estimate-back').click();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => !document.querySelector('.estimate-next').disabled);
        await continueQuiz(page);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
      }
      await page.locator('.estimate-next').click();
      if (mode === 'normal') {
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.estimate-envelope-scene')).visibility === 'visible');
        await page.waitForTimeout(1700);
        await snapshot(page, 'preview/estimate-envelope.png');
      } else if (mode === 'preference-switch') await page.emulateMedia({ reducedMotion: 'reduce' });
      await waitResult(page);
      assert.deepEqual(errors, []);
      await axe(page);
      report.motion.push({ mode, completed: true, axeViolations: 0 });
      await context.close();
    }
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(target);
    assert.equal(await noJS.locator('.estimate-fallback a').isVisible(), true);
    await noJS.close();
    for (const asset of ['js/estimate-config.js', 'js/estimate.js', 'css/estimate.css']) {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      await page.route(`**/${asset}`, route => route.abort());
      await page.goto(target);
      await page.locator('#estimate').scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      assert.equal(await page.locator('.estimate-fallback a').isVisible(), true);
      assert.equal(await page.locator('#estimate-quiz').isVisible(), false);
      await page.close();
    }
    await fs.writeFile('preview/estimate-results.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
