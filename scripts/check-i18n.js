const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const dictionaries = { en: require('../i18n/en.json'), fr: require('../i18n/fr.json') };
const target = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const get = (dictionary, key) => key.split('.').reduce((value, part) => value?.[part], dictionary);
const flatten = (value, prefix = '') => Object.entries(value).flatMap(([key, item]) => typeof item === 'object' ? flatten(item, prefix + key + '.') : [prefix + key]);
const report = { widths: [], preferences: [], normalMotion: {}, imageSlots: 'original photographs retained; Provence, French Riviera, Corsica and beyond' };
async function ready(page, lang) {
  await page.waitForFunction(lang => document.documentElement.dataset.i18nReady === 'true' && document.documentElement.lang === lang, lang);
  await page.evaluate(() => document.fonts.ready);
}
async function switchLanguage(page, lang) {
  const location = await page.locator('#mobile-estimate-sheet[open]').count() ? '#mobile-estimate-sheet' : '.site-header';
  await page.locator(`${location} [data-language="${lang}"]`).click();
  await page.waitForFunction(lang => document.documentElement.lang === lang, lang);
  await page.waitForTimeout(350);
}
async function activate(page) {
  await page.locator('#estimate').scrollIntoViewIfNeeded();
  if (await page.evaluate(() => window.DMOMobile?.active)) await page.locator('.estimate-start').click();
  await page.locator('#estimate-quiz').waitFor({ state: 'visible' });
}
async function next(page) {
  await page.locator('.estimate-next').click();
  await page.waitForFunction(() => !document.querySelector('.estimate-next').disabled);
}
async function choose(page, name, value) {
  await page.locator(`.estimate-step.is-active [name="${name}"][value="${value}"]`).check();
  await next(page);
}
async function axe(page, include) {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);
  if (include) builder.include(include);
  const result = await builder.analyze();
  assert.deepEqual(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
}
async function settle(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 70)); }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(250);
}
(async () => {
  assert.deepEqual(flatten(dictionaries.en).sort(), flatten(dictionaries.fr).sort());
  report.translationKeys = flatten(dictionaries.en).length;
  const browser = await chromium.launch();
  try {
    for (const width of [390, 768, 1024, 1440]) for (const lang of ['en', 'fr']) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce', hasTouch: width < 1024 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${target}/?lang=${lang}`);
      await ready(page, lang);
      assert.equal(await page.title(), dictionaries[lang].meta.title);
      assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), dictionaries[lang].meta.description);
      assert.equal(await page.locator('h1').textContent(), dictionaries[lang].hero.h1);
      assert.deepEqual(await page.locator('.testimonial-quote').allTextContents(), dictionaries[lang].testimonials.items.map(item => item.quote));
      assert.deepEqual(await page.locator('.testimonial-slide figcaption').allTextContents(), dictionaries[lang].testimonials.items.map(item => item.name));
      assert.deepEqual(await page.locator('.destination-copy h3').allTextContents(), dictionaries[lang].destinations.items.map(item => item.title));
      assert.equal(await page.locator('.testimonial-dot').count(), 5);
      assert.equal(await page.locator('.portfolio-card > a[target="_blank"][rel="noopener"]').count(), 3);
      assert.equal(await page.locator('.portfolio-card .media-view-control').count(), 0, 'Portfolio link intercepted by lightbox');
      assert.deepEqual(await page.locator('.portfolio-card h3').allTextContents(), dictionaries[lang].portfolio.items.map(item => item.title));
      await settle(page);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow: ${lang}/${width}`);
      assert.equal(await page.locator('.image-slot:visible img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth)), true);
      const missing = await page.locator('[data-i18n], [data-i18n-alt], [data-i18n-aria-label]').evaluateAll(elements => elements.flatMap(element => [...element.attributes].filter(a => a.name.startsWith('data-i18n') && !['data-i18n-html', 'data-i18n-vars', 'data-i18n-lang'].includes(a.name)).map(a => a.value)));
      assert.deepEqual(missing.filter(key => typeof get(dictionaries[lang], key) !== 'string'), []);
      await axe(page);
      if ([390, 1440].includes(width)) {
        await page.screenshot({ path: `preview/${lang}-${width}-full.png`, fullPage: true });
        for (const section of ['home', 'sisters', 'services', 'destinations', 'estimate', 'portfolio']) {
          const clip = await page.locator('#' + section).evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; });
          await page.screenshot({ path: `preview/${lang}-${width}-${section}.png`, fullPage: true, clip });
        }
      }
      await activate(page);
      const height = await page.locator('.estimate-stage').evaluate(el => el.offsetHeight);
      for (const [name, value] of Object.entries({ destination: 'provence', season: 'summer', guests: '100_150', style: 'weekend', investment: 'range_2' })) {
        await next(page);
        assert.equal(await page.locator('#estimate-error').textContent(), dictionaries[lang].quiz.validation.choice);
        await axe(page, '#estimate');
        await choose(page, name, value);
        assert.equal(await page.locator('.estimate-stage').evaluate(el => el.offsetHeight), height);
      }
      for (const [name, value] of Object.entries({ firstName: 'Alex', partnerName: 'Sam', email: 'alex@example.test', country: 'France', message: 'Notre célébration.' })) await page.locator(`[name="${name}"]`).fill(value);
      await switchLanguage(page, lang === 'en' ? 'fr' : 'en');
      assert.equal(await page.locator('[name="firstName"]').inputValue(), 'Alex');
      assert.equal(await page.locator('[name="message"]').inputValue(), 'Notre célébration.');
      assert.equal(await page.locator('[name="destination"]:checked').inputValue(), 'provence');
      await switchLanguage(page, lang);
      await axe(page, '#estimate');
      await page.locator('.estimate-next').click();
      await page.waitForFunction(() => document.querySelector('.estimate-result.is-active') && !document.querySelector('.estimate-back').disabled);
      assert.equal(await page.locator('.estimate-result h3').textContent(), dictionaries[lang].quiz.result.titles.provence);
      const money = new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
      assert.equal(await page.locator('.estimate-result .estimate-range').textContent(), `${money.format(70000)}–${money.format(112000)}`);
      await switchLanguage(page, lang === 'en' ? 'fr' : 'en');
      assert.equal(await page.evaluate(() => dataLayer.filter(e => e.event === 'estimate_submitted').length), 1, 'Language switch duplicated conversion');
      assert.deepEqual(errors, []);
      report.widths.push({ width, lang, noOverflow: true, exactQuotes: 5, portfolioLinks: 3, translatedQuiz: true, answersPreserved: true, axeViolations: 0 });
      await context.close();
    }
    const preference = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await preference.newPage();
    await page.goto(target); await ready(page, 'en');
    await switchLanguage(page, 'fr');
    await page.goto(target); await ready(page, 'fr');
    await page.goto(`${target}/?lang=en`); await ready(page, 'en');
    await page.goto(`${target}/?lang=fr`); await ready(page, 'fr');
    report.preferences.push('Default EN, remembered choice, URL overrides storage in both directions');
    await preference.close();
    const blocked = await browser.newContext({ reducedMotion: 'reduce' });
    await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
    const blockedPage = await blocked.newPage();
    await blockedPage.goto(`${target}/?lang=fr`); await ready(blockedPage, 'fr');
    await switchLanguage(blockedPage, 'en');
    report.preferences.push('Blocked localStorage: direct French URL and toggle remain functional');
    await blocked.close();
    const motion = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    const normal = await motion.newPage();
    const errors = [];
    normal.on('pageerror', error => errors.push(error.message));
    await normal.goto(`${target}/?lang=en`);
    await normal.waitForFunction(() => window.ditesmoiMotion?.ready && window.ditesmoiIntro.done);
    for (const lang of ['fr', 'en', 'fr']) {
      await switchLanguage(normal, lang);
      await normal.waitForTimeout(1300);
      assert.equal(await normal.locator('#hero-title').getAttribute('aria-label'), dictionaries[lang].hero.h1);
      assert.ok(await normal.locator('#hero-title .motion-line').count());
      assert.equal(await normal.locator('.image-wipe .image-wipe').count(), 0);
      assert.equal(await normal.evaluate(() => !!ditesmoiMotion.lenis && !!ditesmoiMotion.horizontal), true);
    }
    const statsY = await normal.locator('.stats-band').evaluate(el => el.getBoundingClientRect().top + scrollY - 250);
    await normal.evaluate(y => ditesmoiMotion.lenis.scrollTo(y, { immediate: true, force: true }), statsY);
    await normal.waitForTimeout(1450);
    assert.deepEqual(await normal.locator('[data-count]').allTextContents(), ['2005', '2', '4']);
    assert.equal(await normal.locator('[data-count="2005"]').getAttribute('data-count-from'), '1990');
    await activate(normal);
    const before = await normal.locator('#estimate').evaluate(el => el.getBoundingClientRect().top);
    await switchLanguage(normal, 'en');
    const after = await normal.locator('#estimate').evaluate(el => el.getBoundingClientRect().top);
    assert.ok(Math.abs(before - after) < 8, 'Language switch lost the current section');
    await axe(normal);
    assert.deepEqual(errors, []);
    report.normalMotion = { headlineResplit: true, repeatedSwitches: true, smoothScroll: true, pinning: true, threeCountUps: true, scrollContextPreserved: true, axeViolations: 0 };
    await motion.close();
    await fs.writeFile('preview/i18n-results.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
