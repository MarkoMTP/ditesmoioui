const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const target = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
(async () => {
  const { default: lighthouse } = await import('lighthouse');
  const { launch } = await import('chrome-launcher');
  const browser = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'], logLevel: 'silent' });
  const results = {};
  try {
    await fs.mkdir('preview/mobile-pass', { recursive: true });
    for (const lang of ['en', 'fr']) {
      const url = new URL(target); url.searchParams.set('lang', lang);
      const run = await lighthouse(url.href, { port: browser.port, output: ['html', 'json'], logLevel: 'error', onlyCategories: ['performance', 'accessibility'] });
      await fs.writeFile(`preview/mobile-pass/lighthouse-${lang}.html`, run.report[0]); await fs.writeFile(`preview/mobile-pass/lighthouse-${lang}.json`, run.report[1]);
      results[lang] = { performance: Math.round(run.lhr.categories.performance.score * 100), accessibility: Math.round(run.lhr.categories.accessibility.score * 100), cls: run.lhr.audits['cumulative-layout-shift'].numericValue, lcp: run.lhr.audits['largest-contentful-paint'].displayValue, tbt: run.lhr.audits['total-blocking-time'].displayValue };
      console.log(lang, JSON.stringify(results[lang]));
    }
    await fs.writeFile('preview/mobile-pass/performance.json', JSON.stringify(results, null, 2));
    if (Object.values(results).some(value => value.performance < 85 || value.cls >= .05)) process.exitCode = 1;
  } finally { await browser.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
