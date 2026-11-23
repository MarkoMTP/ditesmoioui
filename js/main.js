window.DMOI18n.ready.then(() => {
  'use strict';
  const i18n = window.DMOI18n;
  const t = (...args) => i18n.t(...args);
  const mobileMedia = matchMedia('(max-width: 1023px), (pointer: coarse)');

  function imageReady(img) {
    const slot = img.closest('.image-slot, .wordmark');
    if (!slot) return;
    const missing = !img.naturalWidth;
    slot.classList.toggle('is-missing', missing);
    slot.classList.toggle('has-image', !missing);
  }
  document.querySelectorAll('img').forEach(img => {
    img.onerror = () => imageReady(img);
    img.onload = () => imageReady(img);
    if (img.complete) imageReady(img);
  });

  const header = document.querySelector('.site-header');
  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 35);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const menu = document.querySelector('#mobile-menu');
  const menuButton = document.querySelector('.menu-toggle');
  function closeMenu() { menu.close(); }
  menuButton.addEventListener('click', () => {
    menu.showModal();
    document.body.classList.add('menu-open');
    menuButton.setAttribute('aria-expanded', 'true');
    menu.querySelector('.menu-close').focus();
  });
  menu.querySelector('.menu-close').addEventListener('click', closeMenu);
  menu.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...menu.querySelectorAll('a[href], button:not([disabled])')];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || !menu.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !menu.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });
  menu.addEventListener('close', () => {
    document.body.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  window.matchMedia('(min-width: 1280px)').addEventListener('change', e => {
    if (e.matches && menu.open) closeMenu();
  });

  const dialog = document.querySelector('#preview-dialog');
  let dialogTrigger;
  document.querySelectorAll('[data-dialog]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    dialogTrigger = link.closest('.mobile-menu') ? menuButton : link;
    const title = document.querySelector('#preview-dialog-title');
    title.dataset.i18n = 'preview.' + link.dataset.dialog;
    title.setAttribute('data-i18n-html', '');
    i18n.apply(dialog);
    dialog.showModal();
  }));
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialogTrigger?.focus());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });

  const viewer = document.querySelector('.image-viewer');
  let viewerTrigger;
  let viewerImage;
  document.querySelectorAll('.gallery-image').forEach(frame => {
    const image = frame.querySelector('img');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'media-view-control';
    button.dataset.i18nAriaLabel = 'a11y.viewPhoto';
    button.dataset.i18nVars = JSON.stringify({ description: image.alt });
    button.setAttribute('aria-label', t('a11y.viewPhoto', { description: image.alt }));
    frame.append(button);
    function openPhotograph() {
      viewerTrigger = button;
      viewerImage = image;
      const enlarged = viewer.querySelector('img');
      enlarged.src = image.currentSrc || image.src;
      enlarged.alt = image.alt;
      enlarged.width = image.naturalWidth || image.width;
      enlarged.height = image.naturalHeight || image.height;
      viewer.showModal();
    }
    button.addEventListener('click', openPhotograph);
  });
  viewer.querySelector('button').addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => viewerTrigger?.focus({ preventScroll: true }));
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const heroVideo = document.querySelector('.hero-video');
  const heroVideoToggle = document.querySelector('.hero-video-toggle');
  if (heroVideo && heroVideoToggle) {
    const heroFigure = heroVideo.closest('.hero-image');
    let videoPausedByUser = reducedMotion.matches;
    let videoInView = false;
    let posterReady = false;
    heroVideo.muted = true;
    heroVideoToggle.hidden = false;
    function updateVideoControl() {
      heroVideoToggle.classList.toggle('is-paused', heroVideo.paused);
      heroVideoToggle.setAttribute('aria-pressed', String(heroVideo.paused));
      heroVideoToggle.dataset.i18nAriaLabel = heroVideo.paused ? 'a11y.playVideo' : 'a11y.pauseVideo';
      heroVideoToggle.setAttribute('aria-label', t(heroVideoToggle.dataset.i18nAriaLabel));
    }
    function syncVideoPlayback() {
      if (!posterReady || videoPausedByUser || !videoInView || document.hidden) {
        heroVideo.pause();
        return;
      }
      if (!heroVideo.getAttribute('src')) {
        heroVideo.src = window.matchMedia('(max-width: 767px)').matches
          ? heroVideo.dataset.mobileSrc : heroVideo.dataset.src;
        heroVideo.load();
      }
      heroVideo.play().catch(() => { videoPausedByUser = true; updateVideoControl(); });
    }
    heroVideoToggle.addEventListener('click', () => {
      videoPausedByUser = !heroVideo.paused;
      syncVideoPlayback();
    });
    heroVideo.addEventListener('play', updateVideoControl);
    heroVideo.addEventListener('pause', updateVideoControl);
    heroVideo.addEventListener('playing', () => heroFigure.classList.add('has-video-frame'));
    heroVideo.addEventListener('error', () => {
      heroFigure.classList.remove('has-video-frame');
      heroVideoToggle.hidden = true;
    });
    const videoObserver = new IntersectionObserver(entries => {
      videoInView = entries[0].isIntersecting;
      syncVideoPlayback();
    }, { threshold: .1 });
    videoObserver.observe(heroVideo);
    document.addEventListener('visibilitychange', syncVideoPlayback);
    window.addEventListener('ditesmoi:intro-complete', syncVideoPlayback);
    reducedMotion.addEventListener('change', event => {
      if (event.matches) videoPausedByUser = true;
      syncVideoPlayback();
    });
    // Let the poster render before downloading motion media.
    heroFigure.querySelector('img').decode().catch(() => {}).then(() => {
      const ready = () => { posterReady = true; syncVideoPlayback(); };
      if ('requestIdleCallback' in window) requestIdleCallback(ready, { timeout: 1500 });
      else setTimeout(ready, 200);
    });
    updateVideoControl();
  }
  const slider = document.querySelector('.testimonial-slider');
  const slides = [...slider.querySelectorAll('.testimonial-slide')];
  const dots = [...slider.querySelectorAll('[data-slide]')];
  const rotationButton = slider.querySelector('.rotation-toggle');
  const status = slider.querySelector('.slider-status');
  let activeSlide = 0;
  let timer;
  let pausedByUser = reducedMotion.matches;
  let hovered = false;
  let focused = false;
  let inView = !('IntersectionObserver' in window);
  let touching = false;
  let swipeTimer;
  let scrollFrame;
  const slideTrack = slider.querySelector('.testimonial-slides');

  function scheduleRotation() {
    clearTimeout(timer);
    if (pausedByUser || hovered || focused || touching || !inView || document.hidden) return;
    timer = setTimeout(() => selectSlide(activeSlide + 1, false), 7000);
  }
  function updateRotationButton() {
    rotationButton.classList.toggle('is-paused', pausedByUser);
    rotationButton.setAttribute('aria-pressed', String(pausedByUser));
    rotationButton.dataset.i18nAriaLabel = pausedByUser ? 'a11y.resumeTestimonials' : 'a11y.pauseTestimonials';
    rotationButton.setAttribute('aria-label', t(rotationButton.dataset.i18nAriaLabel));
  }
  function selectSlide(index, announce = true, scroll = true) {
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const current = i === activeSlide;
      slide.classList.toggle('is-active', current);
      slide.setAttribute('aria-hidden', String(mobileMedia.matches ? false : !current));
      slide.inert = mobileMedia.matches ? false : !current;
    });
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === activeSlide)));
    if (announce) status.textContent = t('a11y.slideStatus', { current: activeSlide + 1, total: slides.length });
    if (mobileMedia.matches && scroll) {
      const selected = slides[activeSlide];
      slideTrack.scrollTo({ left: selected.offsetLeft + selected.offsetWidth / 2 - slideTrack.clientWidth / 2, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
    scheduleRotation();
  }
  dots.forEach(dot => dot.addEventListener('click', () => selectSlide(Number(dot.dataset.slide))));
  rotationButton.addEventListener('click', () => {
    pausedByUser = !pausedByUser;
    updateRotationButton();
    scheduleRotation();
  });
  slider.addEventListener('mouseenter', () => { if (!mobileMedia.matches) { hovered = true; scheduleRotation(); } });
  slider.addEventListener('mouseleave', () => { hovered = false; scheduleRotation(); });
  slider.addEventListener('focusin', () => { focused = true; scheduleRotation(); });
  slider.addEventListener('focusout', event => {
    focused = slider.contains(event.relatedTarget);
    scheduleRotation();
  });
  document.addEventListener('visibilitychange', scheduleRotation);
  if ('IntersectionObserver' in window) {
    const visibilityObserver = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      scheduleRotation();
    }, { threshold: .2 });
    visibilityObserver.observe(slider);
  }
  reducedMotion.addEventListener('change', event => {
    if (event.matches) pausedByUser = true;
    updateRotationButton();
    scheduleRotation();
  });
  updateRotationButton();
  scheduleRotation();
  function carouselMode() {
    hovered = false; touching = false;
    if (mobileMedia.matches) {
      slideTrack.tabIndex = 0; slideTrack.setAttribute('role', 'group');
      slideTrack.dataset.i18nAriaLabel = 'mobile.testimonialRail';
      slideTrack.setAttribute('aria-label', t('mobile.testimonialRail'));
    } else {
      ['tabindex', 'role', 'data-i18n-aria-label', 'aria-label'].forEach(name => slideTrack.removeAttribute(name));
    }
    selectSlide(activeSlide, false, false);
    if (!mobileMedia.matches || activeSlide === 0) slideTrack.scrollLeft = 0;
    else {
      const selected = slides[activeSlide];
      slideTrack.scrollTo({ left: selected.offsetLeft + selected.offsetWidth / 2 - slideTrack.clientWidth / 2, behavior: 'instant' });
    }
  }
  mobileMedia.addEventListener('change', carouselMode);
  carouselMode();
  slideTrack.addEventListener('scroll', () => {
    if (!mobileMedia.matches) return;
    clearTimeout(timer); clearTimeout(swipeTimer);
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      const center = slideTrack.scrollLeft + slideTrack.clientWidth / 2;
      let next = 0;
      slides.forEach((slide, index) => {
        if (Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center) < Math.abs(slides[next].offsetLeft + slides[next].offsetWidth / 2 - center)) next = index;
      });
      if (next !== activeSlide) selectSlide(next, false, false);
    });
    swipeTimer = setTimeout(scheduleRotation, 180);
  }, { passive: true });
  window.addEventListener('ditesmoi:language-change', () => {
    updateRotationButton();
    status.textContent = '';
    if (heroVideoToggle && !heroVideoToggle.hidden) {
      heroVideoToggle.dataset.i18nAriaLabel = heroVideo.paused ? 'a11y.playVideo' : 'a11y.pauseVideo';
      heroVideoToggle.setAttribute('aria-label', t(heroVideoToggle.dataset.i18nAriaLabel));
    }
    document.querySelectorAll('.gallery-image').forEach(frame => {
      const image = frame.querySelector('img');
      const button = frame.querySelector('.media-view-control');
      button.dataset.i18nVars = JSON.stringify({ description: image.alt });
      button.setAttribute('aria-label', t('a11y.viewPhoto', { description: image.alt }));
    });
    if (viewer.open && viewerImage) viewer.querySelector('img').alt = viewerImage.alt;
    scheduleRotation();
  });
  slider.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') selectSlide(0);
    else if (event.key === 'End') selectSlide(slides.length - 1);
    else selectSlide(activeSlide + (event.key === 'ArrowRight' ? 1 : -1));
  });
  let touchStart;
  slider.addEventListener('touchstart', event => {
    touching = true; scheduleRotation();
    if (event.touches.length === 1) touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  slider.addEventListener('touchend', event => {
    touching = false;
    if (mobileMedia.matches) { touchStart = undefined; clearTimeout(swipeTimer); swipeTimer = setTimeout(scheduleRotation, 180); return; }
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) selectSlide(activeSlide + (dx < 0 ? 1 : -1));
    touchStart = undefined;
  }, { passive: true });
  slider.addEventListener('touchcancel', () => { touching = false; touchStart = undefined; scheduleRotation(); }, { passive: true });

});
