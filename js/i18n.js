/* Only these two trusted, same-origin dictionaries can supply translated HTML. */
(() => {
  'use strict';
  const root = document.documentElement;
  const dictionaries = {};
  const requests = {};
  let language = 'en';
  let changing = false;
  let pending;
  let languageFade;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  reduced.addEventListener('change', event => { if (event.matches) languageFade?.finish(); });
  const valueAt = (object, key) => key.split('.').reduce((value, part) => value?.[part], object);
  function loadLanguage(lang) {
    if (dictionaries[lang]) return Promise.resolve();
    if (!requests[lang]) requests[lang] = fetch(`i18n/${lang}.json`, { credentials: 'same-origin' }).then(async response => {
      if (!response.ok) throw new Error('Translation dictionary unavailable');
      dictionaries[lang] = await response.json();
    }).catch(error => { delete requests[lang]; throw error; });
    return requests[lang];
  }
  function t(key, variables = {}, lang = language) {
    const value = valueAt(dictionaries[lang], key) ?? valueAt(dictionaries.en, key);
    if (typeof value !== 'string') return key;
    return value.replace(/\{(\w+)\}/g, (match, name) => variables[name] === undefined ? match : String(variables[name]));
  }
  function apply(scope = document) {
    const elements = [...scope.querySelectorAll('[data-i18n], [data-i18n-alt], [data-i18n-content], [data-i18n-aria-label], [data-i18n-aria-roledescription], [data-i18n-lang]')];
    for (const element of elements) {
      let variables = {};
      try { variables = JSON.parse(element.dataset.i18nVars || '{}'); } catch (_) { /* Static keys need no variables. */ }
      if (element.dataset.i18n) {
        const text = t(element.dataset.i18n, variables);
        if (element.hasAttribute('data-i18n-html')) {
          const template = document.createElement('template');
          template.innerHTML = text;
          if (element.innerHTML !== template.innerHTML) element.innerHTML = text;
        } else if (element.textContent !== text) element.textContent = text;
      }
      for (const attribute of ['alt', 'content', 'aria-label', 'aria-roledescription']) {
        const key = element.getAttribute('data-i18n-' + attribute);
        if (key) element.setAttribute(attribute, t(key, variables));
      }
      if (element.dataset.i18nLang === 'opposite') element.lang = language === 'en' ? 'fr' : 'en';
    }
    document.querySelectorAll('[data-language]').forEach(button => {
      const active = button.dataset.language === language;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  async function setLanguage(next, { persist = true, updateURL = true, initial = false } = {}) {
    if (!['en', 'fr'].includes(next)) return;
    if (changing) { pending = next; return; }
    if (!initial && next === language) return;
    changing = true;
    try { await loadLanguage(next); }
    catch (error) { changing = false; console.warn('[DMO language]', error.message); return; }
    const fade = !initial && !reduced.matches && document.body.animate
      ? document.body.animate([{ opacity: 1 }, { opacity: 0.45 }], { duration: 120, fill: 'forwards' }) : null;
    languageFade = fade;
    if (fade) await fade.finished.catch(() => {});
    window.dispatchEvent(new CustomEvent('ditesmoi:before-language-change', { detail: { language: next, initial } }));
    language = next;
    root.lang = next;
    // Conditional writes keep the dictionaries authoritative while avoiding a
    // replacement of identical English first-screen text before its first paint.
    apply();
    if (persist) { try { localStorage.setItem('ditesmoi-language', next); } catch (_) { /* Language switching still works without storage. */ } }
    if (updateURL) {
      try {
        const url = new URL(location.href);
        url.searchParams.set('lang', next);
        history.replaceState(history.state, '', url);
      } catch (_) { /* A restricted preview may not allow history updates. */ }
    }
    window.dispatchEvent(new CustomEvent('ditesmoi:language-change', { detail: { language: next, initial } }));
    if (!initial) document.querySelector('.language-status').textContent = t('a11y.languageChanged');
    fade?.cancel();
    if (!initial && !reduced.matches && document.body.animate) {
      const reveal = document.body.animate([{ opacity: 0.45 }, { opacity: 1 }], { duration: 160 });
      languageFade = reveal;
      await reveal.finished.catch(() => {});
    }
    changing = false;
    languageFade = null;
    if (pending) { const queued = pending; pending = null; await setLanguage(queued); }
  }
  const api = window.DMOI18n = { t, apply, setLanguage, get language() { return language; }, get locale() { return language === 'fr' ? 'fr-FR' : 'en-GB'; } };
  let chosen = 'en';
  try { const stored = localStorage.getItem('ditesmoi-language'); if (['en', 'fr'].includes(stored)) chosen = stored; } catch (_) { /* Default EN. */ }
  try { const query = new URL(location.href).searchParams.get('lang'); if (['en', 'fr'].includes(query)) chosen = query; } catch (_) { /* Default/storage choice. */ }
  // EN is also the canonical analytics vocabulary. Direct FR visits load both;
  // default EN visits warm the other dictionary after the existing hero intro.
  api.ready = Promise.all((chosen === 'fr' ? ['en', 'fr'] : ['en']).map(loadLanguage)).then(async () => {
    await setLanguage(chosen, { initial: true, updateURL: false, persist: true });
    root.dataset.i18nReady = 'true';
    if (chosen === 'en') setTimeout(() => loadLanguage('fr').catch(() => {}), 2100);
  }).catch(error => {
    // The complete English HTML remains readable if local dictionaries cannot load.
    root.dataset.i18nReady = 'fallback';
    console.warn('[DMO language]', error.message);
  });
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-language]');
    if (!button) return;
    await api.ready;
    if (!dictionaries.en) return;
    await setLanguage(button.dataset.language);
  });
})();
