/* Desktop does not download or initialise the touch controller. */
(() => {
  const query = matchMedia('(max-width: 1023px), (pointer: coarse)');
  function load() {
    if (!query.matches || window.DMOMobileReady) return;
    window.DMOMobileReady = new Promise(resolve => {
      const style = document.getElementById('mobile-styles');
      const styled = window.DMOMobileStylesReady = new Promise(ready => {
        if (style.sheet) { style.media = 'all'; ready(true); return; }
        style.addEventListener('load', () => { style.media = 'all'; ready(true); }, { once: true });
        style.addEventListener('error', () => ready(false), { once: true });
      });
      const script = document.createElement('script');
      script.src = 'js/mobile.js';
      script.onload = () => Promise.all([styled, window.DMOMobileUIReady]).then(([ready]) => { if (!ready) document.documentElement.classList.remove('mobile-ux'); resolve(ready); });
      script.onerror = () => { document.documentElement.classList.remove('mobile-ux'); resolve(false); };
      document.head.append(script);
    });
  }
  query.addEventListener('change', load);
  load();
})();
