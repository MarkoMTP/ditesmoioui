const fs = require('node:fs');
const directory = 'preview/mobile-pass';
const results = JSON.parse(fs.readFileSync(`${directory}/results.json`, 'utf8'));
const performance = JSON.parse(fs.readFileSync(`${directory}/performance.json`, 'utf8'));
const names = { iphone14: 'iPhone 14 · WebKit · 390px', pixel7: 'Pixel 7 · Chromium · 412px' };
const sections = ['home', 'sisters', 'section-3', 'services', 'production', 'section-6', 'destinations', 'estimate', 'testimonials', 'portfolio', 'contact', 'footer', 'destination-01', 'destination-02', 'destination-03', 'destination-04', 'quiz', 'keyboard-geometry', 'result'];
const labels = { 'section-3': 'Statistics', 'section-6': 'Gallery', 'keyboard-geometry': 'Simulated keyboard viewport' };
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const cards = Object.entries(names).map(([device, name]) => ['en', 'fr'].map(lang => `
  <section><h2>${escape(name)} · ${lang.toUpperCase()}</h2>
  <p><a href="${device}-${lang}-full-reduced.png">Full page — reduced-motion final states</a></p>
  <div class="screens">${sections.map(section => {
    const file = `${device}-${lang}-${section}.png`;
    return fs.existsSync(`${directory}/${file}`) ? `<figure><a href="${file}"><img loading="lazy" src="${file}" alt="${escape(name + ' ' + lang.toUpperCase() + ' ' + (labels[section] || section))}" width="390" height="750"></a><figcaption>${escape(labels[section] || section)}</figcaption></figure>` : '';
  }).join('')}</div></section>`).join('')).join('');
const rows = Object.entries(performance).map(([lang, result]) => `<tr><td>${lang.toUpperCase()}</td><td>${result.performance}</td><td>${result.accessibility}</td><td>${result.cls.toFixed(3)}</td><td>${escape(result.lcp)}</td><td><a href="lighthouse-${lang}.html">Lighthouse report</a></td></tr>`).join('');
const startup = results.startupProfile ? `<p>Cold 4× CPU sample: ${results.startupProfile.allStartupOver33} startup intervals exceeded 33ms; ${results.startupProfile.visibleIntroOver33} occurred during the visible intro. Maximum startup interval: ${results.startupProfile.allStartupMaxMs.toFixed(1)}ms.</p>` : '';
fs.writeFileSync(`${directory}/index.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Dites Moi Oui — mobile QA</title><style>
  *{box-sizing:border-box}body{margin:0;padding:32px max(20px,5vw);background:#f7f3ec;color:#2e2a26;font:15px/1.7 system-ui,sans-serif}h1,h2{font-family:Georgia,serif;font-weight:400}h1{font-size:38px}h2{font-size:28px;margin-top:60px}a{color:#414b39;text-underline-offset:4px}table{border-collapse:collapse;display:block;overflow:auto}td,th{padding:10px 20px;text-align:left;border-bottom:1px solid #8c9a7b}.screens{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:24px}.screens figure{margin:0}.screens img{display:block;width:100%;height:auto;max-height:550px;object-fit:contain;object-position:top;background:#efe7da;border:1px solid #d9cfc0}figcaption{margin-top:8px;text-transform:capitalize}.note{max-width:900px;padding:16px 20px;background:#efe7da}code{overflow-wrap:anywhere}
  </style><h1>Dites Moi Oui · mobile UX verification</h1>
  <p>Mobile-only sticky cards, swipe rails, touch feedback, safe-area contact bar and a full-screen estimate sheet. Desktop regression checks passed.</p>
  <table><thead><tr><th>Language</th><th>Performance</th><th>Accessibility</th><th>CLS</th><th>LCP</th><th>Detail</th></tr></thead><tbody>${rows}</tbody></table>
  <p>4× CPU destination-scroll sample: median ${results.profile.medianFrameMs.toFixed(1)}ms, 95th percentile ${results.profile.p95FrameMs.toFixed(1)}ms, ${results.profile.framesOver33ms} intervals over 33ms.</p>${startup}
  <p class="note">These are browser-engine emulations and rAF cadence samples, not physical-phone GPU benchmarks. Safari browser-chrome collapse and the real software keyboard cannot be reproduced here; keyboard viewport clearance is simulated. WhatsApp remains a placeholder until <code>WHATSAPP_NUMBER</code> is set in <code>js/mobile.js</code>.</p>
  <p><a href="results.json">Interaction/profile results</a> · <a href="final-checks.json">Final font, refresh and touch-target checks</a> · <a href="performance.json">Performance data</a></p>${cards}</html>`);
console.log('Saved preview/mobile-pass/index.html');
