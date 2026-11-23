const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const target = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
(async () => {
  const { default: lighthouse } = await import('lighthouse');
  const { launch } = await import('chrome-launcher');
  const browser = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'], logLevel: 'silent' });
  try {
    await fs.mkdir('preview', { recursive: true });
    const scores = {};
    for (const formFactor of ['mobile', 'desktop']) {
      const run = await lighthouse(target, { port: browser.port, output: ['html', 'json'], logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices'], ...(formFactor === 'desktop' ? { formFactor: 'desktop', screenEmulation: { mobile: false, width: 1440, height: 1000, deviceScaleFactor: 1, disabled: false }, throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 } } : {}) });
      await fs.writeFile(`preview/lighthouse-${formFactor}.html`, run.report[0]);
      await fs.writeFile(`preview/lighthouse-${formFactor}.json`, run.report[1]);
      scores[formFactor] = Object.fromEntries(Object.entries(run.lhr.categories).map(([key, value]) => [key, Math.round(value.score * 100)]));
      scores[formFactor].metrics = { lcp: run.lhr.audits['largest-contentful-paint'].displayValue, cls: run.lhr.audits['cumulative-layout-shift'].displayValue, tbt: run.lhr.audits['total-blocking-time'].displayValue };
      console.log(formFactor, JSON.stringify(scores[formFactor]));
    }
    await fs.writeFile('preview/performance-results.json', JSON.stringify(scores, null, 2));
  } finally { await browser.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
