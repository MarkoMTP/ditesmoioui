(function (root) {
  'use strict';

  function calculateEstimate(answers, config) {
    const p = config.pricing;
    const base = p.basePrices[answers.destination];
    const guests = p.guestMultipliers[answers.guests];
    const style = p.styleMultipliers[answers.style];
    if (!base || ![base.min, base.max, guests, style, p.roundTo].every(n => Number.isFinite(n) && n > 0) || base.max < base.min) {
      throw new Error('Please check the estimate pricing configuration and selected answers.');
    }
    const min = Math.floor(base.min * guests * style / p.roundTo) * p.roundTo;
    const max = Math.ceil(base.max * guests * style / p.roundTo) * p.roundTo;
    const money = new Intl.NumberFormat(p.locale, { style: 'currency', currency: p.currency, maximumFractionDigits: 0 });
    return { min, max, currency: p.currency, placeholder: p.placeholder, formattedRange: `${money.format(min)}–${money.format(max)}` };
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { calculateEstimate }; return; }
  const config = root.DMO_ESTIMATE_CONFIG;
  const form = document.getElementById('estimate-quiz');
  if (!form || !config) return;
  const i18n = root.DMOI18n;
  const t = (...args) => i18n.t(...args);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const year = new Date().getFullYear();
  const demo = !config.submission.endpoint.trim();
  const text = (tag, key, attrs = '') => `<${tag} data-i18n="${key}" ${attrs}>${escape(t(key))}</${tag}>`;
  const label = item => t(item.labelKey);
  const options = (name, entries, modifier = '') => `<div class="estimate-options ${modifier}">${entries.map(entry => {
    const item = typeof entry === 'string' ? { id: entry, labelKey: 'quiz.seasons.' + entry } : entry;
    return `<label class="estimate-option"><input type="radio" name="${name}" value="${escape(item.id)}" required aria-describedby="estimate-hint-${name} estimate-error">${text('span', item.labelKey, 'class="estimate-option-title"')}${item.noteKey ? text('span', item.noteKey, 'class="estimate-option-note"') : ''}</label>`;
  }).join('')}</div>`;
  const step = (index, name, content) => `<fieldset class="estimate-step${index === 0 ? ' is-active' : ''}" data-step="${index}" ${index ? 'disabled inert aria-hidden="true"' : 'aria-hidden="false"'}><legend tabindex="-1" data-i18n="quiz.steps.${name}.title" data-i18n-html>${t('quiz.steps.' + name + '.title')}</legend>${text('p', 'quiz.steps.' + name + '.hint', `class="estimate-hint" id="estimate-hint-${name}"`)}${content}</fieldset>`;
  const field = (name, attrs = '', wide = false) => `<label class="estimate-field${wide ? ' estimate-field--wide' : ''}">${text('span', 'quiz.fields.' + name)}<input name="${name}" ${attrs} aria-describedby="estimate-hint-contact estimate-error"></label>`;
  form.innerHTML = `
    <div class="estimate-progress-heading">${text('span', 'quiz.progressTitle')}<span class="estimate-step-count"></span></div>
    <div class="estimate-progress" role="progressbar" data-i18n-aria-label="a11y.estimateProgress" aria-label="${escape(t('a11y.estimateProgress'))}" aria-valuemin="0" aria-valuemax="6" aria-valuenow="1"><span class="estimate-progress-fill"></span></div>
    <div class="estimate-stage">
      ${step(0, 'destination', options('destination', config.destinations, 'estimate-options--destination'))}
      ${step(1, 'season', options('season', config.seasons) + `<label class="estimate-field estimate-year">${text('span', 'quiz.fields.year')}<input name="year" type="number" inputmode="numeric" min="${year}" max="${year + 20}" step="1" placeholder="${year + 1}" aria-describedby="estimate-hint-season estimate-error"></label>`)}
      ${step(2, 'guests', options('guests', config.guests))}
      ${step(3, 'style', options('style', config.styles, 'estimate-options--style'))}
      ${step(4, 'investment', options('investment', config.investmentRanges))}
      ${step(5, 'contact', `<div class="estimate-fields">
        ${field('firstName', 'type="text" required maxlength="80" autocomplete="section-you given-name"')}
        ${field('partnerName', 'type="text" required maxlength="80" autocomplete="section-partner given-name"')}
        ${field('email', 'type="email" required maxlength="254" autocomplete="email"', true)}
        ${field('country', 'type="text" required maxlength="100" autocomplete="country-name"')}
        ${field('weddingDate', 'type="date"')}
        <label class="estimate-field estimate-field--wide">${text('span', 'quiz.fields.message')}<textarea name="message" rows="2" maxlength="3000" data-lenis-prevent aria-describedby="estimate-hint-contact estimate-error"></textarea></label>
      </div>`)}
      <div class="estimate-result estimate-result-layout" inert aria-hidden="true">
        ${text('span', 'common.oui', 'class="estimate-result-mark" aria-hidden="true"')}
        <h3 tabindex="-1"></h3><p class="estimate-range"></p>
        ${text('p', 'quiz.result.label', 'class="estimate-result-label"')}
        <p class="estimate-result-details"></p>
        ${text('p', 'quiz.result.reply', 'class="estimate-result-reply"')}
      </div>
      <div class="estimate-envelope-scene" aria-hidden="true" inert><div class="estimate-envelope">${text('div', 'common.oui', 'class="estimate-envelope-paper"')}<div class="estimate-envelope-front"></div><div class="estimate-envelope-flap"></div>${text('div', 'common.seal', 'class="estimate-envelope-seal"')}</div></div>
    </div>
    <p class="estimate-error" id="estimate-error" role="alert" aria-atomic="true"></p>
    <div class="estimate-controls"><button class="text-link estimate-back" type="button" disabled></button><button class="text-link estimate-next" type="submit"></button></div>
    ${text('p', 'quiz.disclaimer', 'class="estimate-disclaimer"')}
    ${text('p', 'quiz.previewNote', `class="estimate-disclaimer estimate-preview-note" ${demo ? '' : 'hidden'}`)}
    <p class="estimate-delivery-status" role="status" aria-atomic="true"></p>`;
  const steps = Array.from(form.querySelectorAll('.estimate-step'));
  const result = form.querySelector('.estimate-result');
  // Reserve the longest result before any interaction, including after fonts load
  // or the viewport changes. This inert sizing copy never enters the reading order.
  const reserve = result.cloneNode(true);
  reserve.className = 'estimate-result-layout estimate-result-reserve';
  form.querySelector('.estimate-stage').appendChild(reserve);
  const next = form.querySelector('.estimate-next');
  const back = form.querySelector('.estimate-back');
  const progress = form.querySelector('.estimate-progress');
  const error = form.querySelector('.estimate-error');
  const status = form.querySelector('.estimate-delivery-status');
  const scene = form.querySelector('.estimate-envelope-scene');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  let current = 0;
  let moving = false;
  let sending = false;
  let completed = false;
  let submissionId = null;
  let lastData;
  let lastEstimate;
  let errorKey;
  let errorVariables = {};
  let statusKey;
  function setError(key, variables = {}) { errorKey = key; errorVariables = variables; error.textContent = key ? t(key, variables) : ''; }
  function setStatus(key) { statusKey = key; status.textContent = key ? t(key) : ''; }
  function destinationTitle(data) {
    return t('quiz.result.titles.' + data.destination);
  }
  function details(data) {
    return t('quiz.result.details', { guests: label(choice(config.guests, data.guests)), style: label(choice(config.styles, data.style)), season: t('quiz.seasons.' + data.season), year: data.year ? ' ' + data.year : '' });
  }
  function renderSizer() {
    const longest = items => items.reduce((a, b) => a.length > b.length ? a : b, '');
    reserve.querySelector('h3').textContent = longest(config.destinations.map(d => destinationTitle({ destination: d.id })));
    reserve.querySelector('h3').removeAttribute('tabindex');
    reserve.querySelector('.estimate-range').textContent = new Intl.NumberFormat(i18n.locale, { style: 'currency', currency: config.pricing.currency, maximumFractionDigits: 0 }).format(999000) + '–' + new Intl.NumberFormat(i18n.locale, { style: 'currency', currency: config.pricing.currency, maximumFractionDigits: 0 }).format(999000);
    reserve.querySelector('.estimate-result-details').textContent = t('quiz.result.details', { guests: longest(config.guests.map(label)), style: longest(config.styles.map(label)), season: longest(config.seasons.map(id => t('quiz.seasons.' + id))), year: ' ' + (year + 20) });
  }
  function renderResult() {
    if (!lastData) return;
    lastEstimate = calculateEstimate(lastData, { ...config, pricing: { ...config.pricing, locale: i18n.locale } });
    result.querySelector('h3').dataset.i18n = 'quiz.result.titles.' + lastData.destination;
    result.querySelector('h3').textContent = destinationTitle(lastData);
    result.querySelector('.estimate-range').textContent = lastEstimate.formattedRange;
    result.querySelector('.estimate-result-details').textContent = details(lastData);
  }

  function animate(build) {
    if (motion.matches || !root.gsap) return Promise.resolve();
    return new Promise(resolve => {
      const timeline = root.gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, onComplete: () => { animations.delete(timeline); resolve(); } });
      animations.add(timeline);
      build(timeline);
      if (root.DMOMobile?.active) timeline.timeScale(1.6);
      timeline.play();
    });
  }
  motion.addEventListener('change', event => {
    if (event.matches) [...animations].forEach(timeline => timeline.progress(1));
  });
  function clearStyle(element) { element.removeAttribute('style'); }
  function showQuestion() {
    const sheet = form.closest('.mobile-sheet-scroll');
    if (sheet) {
      sheet.scrollTo({ top: 0, behavior: motion.matches ? 'instant' : 'smooth' });
      return;
    }
    const header = document.querySelector('.site-header');
    const inset = (header?.getBoundingClientRect().height || 88) + 18;
    const top = Math.max(0, form.getBoundingClientRect().top + scrollY - inset);
    // Continue is often below the fold on a phone; bring the next question back
    // into view without stealing focus or leaving the visitor at an empty footer.
    if (root.ditesmoiMotion?.lenis && !motion.matches) root.ditesmoiMotion.lenis.scrollTo(top, { duration: 0.85, force: true });
    else root.scrollTo({ top, behavior: motion.matches ? 'instant' : 'smooth' });
  }
  function setPanel(panel, active) {
    panel.inert = !active;
    panel.setAttribute('aria-hidden', String(!active));
    if (panel.tagName === 'FIELDSET') panel.disabled = !active;
    panel.classList.toggle('is-active', active);
  }
  function controls() {
    back.disabled = moving || sending || (!completed && current === 0);
    next.disabled = moving || sending || completed;
    next.setAttribute('aria-hidden', String(completed));
    back.dataset.i18n = completed ? 'quiz.restart' : 'quiz.back';
    back.textContent = t(back.dataset.i18n);
    next.dataset.i18n = current === 5 ? (demo ? 'quiz.previewSubmit' : 'quiz.submit') : 'quiz.continue';
    next.innerHTML = escape(t(next.dataset.i18n)) + (current < 5 ? '<span aria-hidden="true">&nbsp; ' + escape(t('common.nextArrow')) + '</span>' : '');
    const value = completed ? 6 : current + 1;
    progress.setAttribute('aria-valuenow', value);
    progress.setAttribute('aria-valuetext', completed ? t('quiz.complete') : t('quiz.step', { current: value, total: 6 }));
    form.querySelector('.estimate-step-count').textContent = completed ? t('quiz.yourEstimate') : t('quiz.counter', { current: String(value).padStart(2, '0'), total: '06' });
    form.querySelector('.estimate-progress-fill').style.transform = `scaleX(${value / 6})`;
  }
  function clearError() {
    setError(null);
    form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  }
  async function goTo(index) {
    if (moving || sending) return;
    moving = true;
    clearError();
    setStatus(null);
    const old = completed ? result : steps[current];
    const incoming = steps[index];
    completed = false;
    current = index;
    setPanel(old, false);
    old.classList.add('is-leaving');
    setPanel(incoming, true);
    controls();
    incoming.querySelector('legend').focus({ preventScroll: true });
    showQuestion();
    await animate(t => t.to(old, { y: -12, opacity: 0, duration: 0.5 }, 0).fromTo(incoming, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.12));
    old.classList.remove('is-leaving');
    clearStyle(old); clearStyle(incoming);
    moving = false;
    controls();
  }
  function validate() {
    clearError();
    const panel = steps[current];
    panel.querySelectorAll('input[type="text"], input[type="email"], textarea').forEach(input => { input.value = input.value.trim(); });
    const invalid = Array.from(panel.querySelectorAll('input, textarea')).filter(input => !input.checkValidity());
    if (!invalid.length) return true;
    invalid.forEach(input => input.setAttribute('aria-invalid', 'true'));
    const first = invalid[0];
    setError(first.type === 'radio' ? 'quiz.validation.choice' : first.name === 'year' ? 'quiz.validation.year' : first.type === 'email' && first.value ? 'quiz.validation.email' : first.type === 'date' ? 'quiz.validation.date' : 'quiz.validation.required', { min: year, max: year + 20 });
    first.focus({ preventScroll: true });
    showQuestion();
    return false;
  }
  function answers() {
    const value = name => form.querySelector(`[name="${name}"]:checked`)?.value || '';
    const fieldValue = name => form.querySelector(`[name="${name}"]`).value.trim();
    return {
      destination: value('destination'), season: value('season'), year: fieldValue('year'),
      guests: value('guests'), style: value('style'), investment: value('investment'),
      firstName: fieldValue('firstName'), partnerName: fieldValue('partnerName'),
      email: fieldValue('email'), country: fieldValue('country'), weddingDate: fieldValue('weddingDate'), message: fieldValue('message')
    };
  }
  const choice = (items, id) => items.find(item => item.id === id);
  async function deliver(payload) {
    if (config.submission.debug) console.info('[DMO estimate — ' + (demo ? 'preview only' : 'submission') + ']', payload);
    if (demo) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.submission.timeoutMs);
    try {
      const response = await fetch(config.submission.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'omit', body: JSON.stringify(payload), signal: controller.signal
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok === false || body?.errors?.length) throw new Error('delivery');
    } finally { clearTimeout(timer); }
  }
  async function fold() {
    [scene, ...scene.querySelectorAll('div')].forEach(clearStyle);
    await animate(t => t
      .to(steps[5], { opacity: 0, scale: 0.92, rotationX: 18, y: 25, duration: 0.8 }, 0)
      .set(scene, { autoAlpha: 1 }, 0.2)
      .fromTo('.estimate-envelope', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.2)
      .fromTo('.estimate-envelope-paper', { y: -100 }, { y: 0, duration: 0.8 }, 0.35)
      .fromTo('.estimate-envelope-flap', { rotationX: 180 }, { rotationX: 0, duration: 0.65 }, 1)
      .fromTo('.estimate-envelope-seal', { opacity: 0, scale: 1.9 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'expo.out' }, 1.5));
  }
  async function submit() {
    if (sending || moving || completed) return;
    let estimate;
    const data = answers();
    try { estimate = calculateEstimate(data, { ...config, pricing: { ...config.pricing, locale: i18n.locale } }); }
    catch (_) { setError('quiz.validation.unavailable'); return; }
    const destination = choice(config.destinations, data.destination);
    const guests = choice(config.guests, data.guests);
    const style = choice(config.styles, data.style);
    const investment = choice(config.investmentRanges, data.investment);
    submissionId ||= root.crypto?.randomUUID?.() || `dmo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const payload = {
      ...data, submissionId, language: i18n.language, destinationLabel: label(destination), guestsLabel: label(guests),
      styleLabel: label(style), investmentLabel: label(investment), estimate,
      submissionMode: demo ? 'demo' : 'live'
    };
    sending = true;
    form.setAttribute('aria-busy', 'true');
    steps[5].disabled = true;
    controls();
    setStatus(demo ? 'quiz.status.preparing' : 'quiz.status.sending');
    // Handle delivery rejection immediately, even while the decorative fold runs.
    const delivery = deliver(payload).then(() => ({ ok: true }), cause => ({ ok: false, cause }));
    const [response] = await Promise.all([delivery, fold()]);
    if (!response.ok) {
      sending = false;
      steps[5].disabled = false;
      clearStyle(steps[5]); clearStyle(scene);
      form.removeAttribute('aria-busy');
      setStatus(null);
      setError(response.cause?.name === 'AbortError' ? 'quiz.validation.timeout' : 'quiz.validation.delivery');
      controls(); next.focus({ preventScroll: true });
      return;
    }
    // No contact information is sent to analytics. Demo conversions are explicitly
    // tagged; filter submission_mode=live when creating production conversions.
    root.dataLayer = root.dataLayer || [];
    root.dataLayer.push({ event: 'estimate_submitted', destination: t(destination.labelKey, {}, 'en'), guests: t(guests.labelKey, {}, 'en'), style: t(style.labelKey, {}, 'en'), range: calculateEstimate(data, config).formattedRange, estimate_min: estimate.min, estimate_max: estimate.max, currency: estimate.currency, submission_mode: demo ? 'demo' : 'live' });
    await animate(t => t.to('.estimate-envelope', { x: 380, y: -50, rotation: -8, opacity: 0, duration: 0.9, ease: 'expo.out' }));
    setPanel(steps[5], false);
    clearStyle(steps[5]); clearStyle(scene);
    lastData = data; lastEstimate = estimate;
    renderResult();
    setPanel(result, true);
    form.removeAttribute('aria-busy');
    result.querySelector('h3').focus({ preventScroll: true });
    showQuestion();
    await animate(t => t.fromTo(result, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }));
    clearStyle(result);
    sending = false;
    completed = true;
    setStatus(demo ? 'quiz.status.previewReady' : 'quiz.status.sent');
    controls();
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (moving || sending || completed || !validate()) return;
    if (current < 5) goTo(current + 1);
    else submit();
  });
  back.addEventListener('click', () => {
    if (moving || sending) return;
    if (completed) { form.reset(); submissionId = null; lastData = null; lastEstimate = null; goTo(0); }
    else if (current > 0) goTo(current - 1);
  });
  form.addEventListener('input', () => { if (error.textContent) clearError(); });
  renderSizer();
  root.addEventListener('ditesmoi:language-change', () => {
    renderSizer(); renderResult(); controls();
    setError(errorKey, errorVariables); setStatus(statusKey);
  });
  root.DMOEstimate = { calculateEstimate, start() {
    (completed ? result.querySelector('h3') : steps[current].querySelector('legend')).focus({ preventScroll: true });
    showQuestion();
  } };
  controls();
  form.hidden = false;
  document.querySelector('.estimate-fallback').hidden = true;
})(typeof window !== 'undefined' ? window : globalThis);
