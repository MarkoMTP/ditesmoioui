/* Mobile/touch-only enhancement. Use international digits without + or spaces. */
const WHATSAPP_NUMBER = ''; // Placeholder: set the team's real WhatsApp number here.

window.DMOMobileUIReady = Promise.all([window.DMOI18n.ready, window.DMOMobileStylesReady]).then(([, styled]) => {
  if (styled === false) return;
  'use strict';
  const media = matchMedia('(max-width: 1023px), (pointer: coarse)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const i18n = window.DMOI18n;
  const t = (...args) => i18n.t(...args);
  let dispose;
  let openQuiz = async () => {};
  const api = window.DMOMobile = { get active() { return media.matches; }, openQuiz: (...args) => openQuiz(...args) };

  function element(tag, className, key) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (key) { node.dataset.i18n = key; node.textContent = t(key); }
    return node;
  }
  function label(node, key, variables) {
    node.dataset.i18nAriaLabel = key;
    if (variables) node.dataset.i18nVars = JSON.stringify(variables);
    node.setAttribute('aria-label', t(key, variables));
  }
  function setup() {
    const cleanup = [];
    const rows = [...document.querySelectorAll('.destination-row')];
    rows.forEach((row, index) => {
      const marker = element('span', 'mobile-card-marker'); marker.setAttribute('aria-hidden', 'true'); row.before(marker);
      const surface = element('div', 'mobile-card-surface');
      row.style.setProperty('--stack-index', index);
      surface.style.setProperty('--card-tone', row.dataset.tone);
      while (row.firstChild) surface.append(row.firstChild);
      surface.append(element('span', 'mobile-card-shade'));
      surface.lastChild.setAttribute('aria-hidden', 'true');
      row.append(surface);
      cleanup.push(() => {
        surface.querySelector('.mobile-card-shade').remove();
        surface.replaceWith(...surface.childNodes);
        row.style.removeProperty('--stack-index');
        marker.remove();
      });
    });

    function swipeRail(selector, itemSelector, progressKey, itemKey) {
      const rail = document.querySelector(selector);
      const items = [...rail.querySelectorAll(itemSelector)];
      const dots = element('div', 'mobile-rail-dots');
      dots.setAttribute('role', 'group'); label(dots, progressKey);
      const originalTabindex = rail.getAttribute('tabindex');
      rail.tabIndex = 0;
      const buttons = items.map((item, index) => {
        const button = element('button'); button.type = 'button';
        label(button, itemKey, { current: index + 1, total: items.length });
        dots.append(button); return button;
      });
      rail.after(dots);
      let centers = [];
      let current = -1;
      let frame;
      const measure = () => { centers = items.map(item => item.offsetLeft + item.offsetWidth / 2); update(); };
      function update() {
        frame = null;
        const center = rail.scrollLeft + rail.clientWidth / 2;
        const next = centers.reduce((best, value, index) => Math.abs(value - center) < Math.abs(centers[best] - center) ? index : best, 0);
        if (next === current) return;
        current = next;
        buttons.forEach((button, index) => button.setAttribute('aria-current', String(index === current)));
      }
      const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
      const go = index => { if (!centers.length) measure(); rail.scrollTo({ left: centers[index] - rail.clientWidth / 2, behavior: reduce.matches ? 'instant' : 'smooth' }); };
      buttons.forEach((button, index) => button.addEventListener('click', () => go(index)));
      const keydown = event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1)));
        go(next); items[next].querySelector('a, button')?.focus({ preventScroll: true });
      };
      rail.addEventListener('scroll', scroll, { passive: true }); rail.addEventListener('keydown', keydown);
      const observer = new ResizeObserver(measure); observer.observe(rail);
      cleanup.push(() => { observer.disconnect(); cancelAnimationFrame(frame); rail.removeEventListener('scroll', scroll); rail.removeEventListener('keydown', keydown); dots.remove(); if (originalTabindex === null) rail.removeAttribute('tabindex'); else rail.setAttribute('tabindex', originalTabindex); rail.scrollLeft = 0; });
    }
    swipeRail('.gallery-canvas', '.gallery-image', 'mobile.galleryProgress', 'mobile.galleryItem');
    swipeRail('.portfolio-grid', '.portfolio-card', 'mobile.portfolioProgress', 'mobile.portfolioItem');

    const bar = element('nav', 'mobile-bottom-bar'); bar.hidden = true; label(bar, 'mobile.quickContact');
    const enquire = element('button', '', 'sticky.label'); enquire.type = 'button';
    const whatsapp = element('a', '', 'mobile.whatsapp');
    const validWhatsApp = /^\d{8,15}$/.test(WHATSAPP_NUMBER);
    whatsapp.href = 'https://wa.me/' + (validWhatsApp ? WHATSAPP_NUMBER : 'WHATSAPP_NUMBER');
    whatsapp.target = '_blank'; whatsapp.rel = 'noopener';
    if (!validWhatsApp) whatsapp.setAttribute('aria-disabled', 'true');
    bar.append(enquire, whatsapp);
    const barStatus = element('p', 'mobile-bar-status'); barStatus.setAttribute('role', 'status');
    document.body.append(bar, barStatus);
    let messageTimer;
    whatsapp.addEventListener('click', event => {
      if (validWhatsApp) return;
      event.preventDefault(); barStatus.dataset.i18n = 'mobile.whatsappSoon'; barStatus.textContent = t('mobile.whatsappSoon');
      clearTimeout(messageTimer); messageTimer = setTimeout(() => { barStatus.textContent = ''; delete barStatus.dataset.i18n; }, 5000);
    });

    const sheet = element('dialog', 'mobile-estimate-sheet'); sheet.id = 'mobile-estimate-sheet'; sheet.setAttribute('aria-labelledby', 'mobile-estimate-title');
    const panel = element('div', 'mobile-sheet-panel');
    const drag = element('button', 'mobile-sheet-drag'); drag.type = 'button'; label(drag, 'mobile.dragClose');
    const heading = element('div', 'mobile-sheet-header');
    const title = element('h2', '', 'mobile.quizTitle'); title.id = 'mobile-estimate-title';
    const languages = element('div', 'languages'); label(languages, 'languages.selection');
    ['fr', 'en'].forEach(language => {
      const button = element('button', '', 'languages.' + language); button.type = 'button'; button.lang = language; button.dataset.language = language;
      label(button, language === 'fr' ? 'languages.french' : 'languages.english'); languages.append(button);
    });
    const close = element('button', 'mobile-sheet-close', 'common.close'); close.type = 'button'; label(close, 'mobile.closeQuiz');
    heading.append(title, languages, close);
    const scroller = element('div', 'mobile-sheet-scroll'); scroller.setAttribute('data-lenis-prevent', '');
    const message = element('p', 'mobile-sheet-message', 'mobile.loadingQuiz'); message.setAttribute('role', 'status');
    const fallback = element('a', 'text-link mobile-sheet-fallback', 'mobile.emailInstead'); fallback.href = 'mailto:contact@ditesmoioui.com'; fallback.hidden = true;
    scroller.append(message, fallback); panel.append(drag, heading, scroller); sheet.append(panel); document.body.append(sheet);
    i18n.apply(sheet);
    const form = document.querySelector('#estimate-quiz');
    const home = document.createComment('mobile estimate form home'); form.before(home);
    let opener;
    let opening = false;
    let closing = false;
    let animation;
    let viewportFrame;
    let keyboardTimer;
    let pointer;

    function visibleInput() {
      const input = document.activeElement;
      if (!sheet.open || !input?.matches('input, textarea') || !sheet.contains(input)) return;
      const box = input.getBoundingClientRect(); const bounds = scroller.getBoundingClientRect();
      if (box.bottom > bounds.bottom - 20) scroller.scrollTop += box.bottom - bounds.bottom + 20;
      else if (box.top < bounds.top + 12) scroller.scrollTop += box.top - bounds.top - 12;
    }
    function viewport() {
      cancelAnimationFrame(viewportFrame);
      if (!sheet.open) return;
      viewportFrame = requestAnimationFrame(() => {
        const visual = window.visualViewport;
        sheet.style.setProperty('--mobile-viewport-height', `${visual?.height || innerHeight}px`);
        sheet.style.setProperty('--mobile-viewport-top', `${visual?.offsetTop || 0}px`);
        visibleInput();
      });
    }
    function transition(from, to, duration) {
      animation?.cancel();
      if (reduce.matches || !panel.animate) { panel.style.transform = to; return Promise.resolve(); }
      animation = panel.animate([{ transform: from }, { transform: to }], { duration, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
      return animation.finished.catch(() => {});
    }
    function finalize() {
      animation?.cancel(); panel.style.removeProperty('transform');
      root.classList.remove('mobile-sheet-open'); closing = false; opening = false;
      sheet.style.removeProperty('--mobile-viewport-height'); sheet.style.removeProperty('--mobile-viewport-top');
      updateBar();
      const target = opener?.isConnected && opener.getClientRects().length ? opener : document.querySelector('.estimate-start');
      target?.focus({ preventScroll: true });
    }
    async function closeSheet(instant = false) {
      if (!sheet.open || closing) return;
      closing = true;
      if (!instant) await transition(panel.style.transform || 'translateY(0)', 'translateY(100%)', 320);
      if (sheet.open) sheet.close();
    }
    openQuiz = async trigger => {
      if (sheet.open || opening) return;
      opening = true; opener = trigger?.currentTarget || document.activeElement;
      message.dataset.i18n = 'mobile.loadingQuiz'; message.textContent = t('mobile.loadingQuiz'); message.hidden = !!window.DMOEstimate && !form.hidden; fallback.hidden = true;
      root.classList.add('mobile-sheet-open'); sheet.showModal(); viewport(); updateBar();
      const entry = transition('translateY(100%)', 'translateY(0)', 450);
      const loading = window.DMOLoadEstimate?.();
      await Promise.all([entry, loading]);
      if (!sheet.open || closing) return;
      animation?.cancel(); panel.style.removeProperty('transform');
      opening = false;
      if (!window.DMOEstimate || form.hidden) {
        message.dataset.i18n = 'mobile.quizUnavailable'; message.textContent = t('mobile.quizUnavailable'); fallback.hidden = false;
        return;
      }
      scroller.append(form); message.hidden = true;
      window.DMOEstimate.start();
    };
    enquire.addEventListener('click', openQuiz);
    close.addEventListener('click', () => closeSheet());
    drag.addEventListener('click', event => { if (pointer?.moved) event.preventDefault(); else closeSheet(); });
    sheet.addEventListener('cancel', event => { event.preventDefault(); closeSheet(); });
    sheet.addEventListener('close', finalize);
    scroller.addEventListener('focusin', () => { clearTimeout(keyboardTimer); keyboardTimer = setTimeout(visibleInput, 280); viewport(); });
    const down = event => {
      pointer = { id: event.pointerId, y: event.clientY, time: performance.now(), distance: 0, moved: false };
      animation?.cancel(); drag.setPointerCapture(event.pointerId);
    };
    const move = event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      pointer.distance = Math.max(0, event.clientY - pointer.y); pointer.moved ||= pointer.distance > 8;
      panel.style.transform = `translateY(${pointer.distance}px)`;
    };
    const up = async event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      const current = pointer;
      if (!current.moved) { pointer = null; return; }
      const velocity = current.distance / Math.max(1, performance.now() - current.time);
      if (current.distance > 100 || current.distance > 35 && velocity > .65) await closeSheet();
      else { await transition(`translateY(${current.distance}px)`, 'translateY(0)', 250); animation?.cancel(); panel.style.removeProperty('transform'); }
      setTimeout(() => { if (pointer === current) pointer = null; }, 0);
    };
    drag.addEventListener('pointerdown', down); drag.addEventListener('pointermove', move); drag.addEventListener('pointerup', up);
    drag.addEventListener('pointercancel', () => { pointer = null; panel.style.removeProperty('transform'); });
    window.visualViewport?.addEventListener('resize', viewport); window.visualViewport?.addEventListener('scroll', viewport);
    const motionChange = () => { if (reduce.matches && animation?.playState === 'running') animation.finish(); };
    reduce.addEventListener('change', motionChange);

    let heroPassed = false;
    let closingVisible = false;
    let closingPassed = false;
    let footerVisible = false;
    function updateBar() { bar.hidden = !media.matches || !heroPassed || closingVisible || closingPassed || footerVisible || !!document.querySelector('dialog[open]'); }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target.classList.contains('hero')) heroPassed = entry.boundingClientRect.bottom <= 0;
        if (entry.target.classList.contains('closing-cta')) { closingVisible = entry.isIntersecting; closingPassed = entry.boundingClientRect.bottom <= 0; }
        if (entry.target.classList.contains('site-footer')) footerVisible = entry.isIntersecting;
      }
      updateBar();
    });
    document.querySelectorAll('.hero, .closing-cta, .site-footer').forEach(node => observer.observe(node));
    const dialogs = new MutationObserver(updateBar);
    document.querySelectorAll('dialog').forEach(node => dialogs.observe(node, { attributes: true, attributeFilter: ['open'] }));
    cleanup.push(() => {
      if (sheet.open) sheet.close();
      if (form.parentElement !== home.parentElement) home.before(form);
      home.remove(); sheet.remove(); bar.remove(); barStatus.remove();
      observer.disconnect(); dialogs.disconnect(); clearTimeout(messageTimer); clearTimeout(keyboardTimer); cancelAnimationFrame(viewportFrame);
      window.visualViewport?.removeEventListener('resize', viewport); window.visualViewport?.removeEventListener('scroll', viewport);
      reduce.removeEventListener('change', motionChange); root.classList.remove('mobile-sheet-open'); openQuiz = async () => {};
    });
    api.sheet = sheet;
    return () => { cleanup.reverse().forEach(fn => fn()); delete api.sheet; };
  }
  function sync() {
    dispose?.(); dispose = null;
    root.classList.toggle('mobile-ux', media.matches);
    if (media.matches) dispose = setup();
    window.dispatchEvent(new Event('ditesmoi:mobile-ready'));
  }
  media.addEventListener('change', sync);
  sync();
});
