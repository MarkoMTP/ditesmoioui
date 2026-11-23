/* Keep the below-fold quiz off the hero's critical loading path. */
window.DMOI18n.ready.then(() => {
  const section = document.getElementById('estimate');
  if (!section) return;
  let started = false;
  let loading;
  const asset = (tag, url) => new Promise((resolve, reject) => {
    const element = document.createElement(tag);
    if (tag === 'link') { element.rel = 'stylesheet'; element.href = url; }
    else element.src = url;
    element.onload = resolve;
    element.onerror = reject;
    document.head.appendChild(element);
  });
  function load() {
    if (started) return loading;
    started = true;
    loading = Promise.all([asset('link', 'css/estimate.css'), asset('script', 'js/estimate-config.js')])
      .then(() => asset('script', 'js/estimate.js'))
      .then(() => { window.ScrollTrigger?.refresh(); })
      .catch(() => { /* The original email enquiry remains available on failure. */ });
    return loading;
  }
  window.DMOLoadEstimate = load;
  section.querySelector('.estimate-start').addEventListener('click', async event => {
    event.preventDefault();
    if (matchMedia('(max-width: 1023px), (pointer: coarse)').matches) {
      await window.DMOMobileReady;
      if (window.DMOMobile?.active) { await window.DMOMobile.openQuiz(event); return; }
    }
    await load();
    window.DMOEstimate?.start();
  });
  if (!('IntersectionObserver' in window)) { load(); return; }
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    load();
  }, { rootMargin: '1400px 0px' });
  observer.observe(section);
});
