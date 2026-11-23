(() => {
  'use strict';
  const root = document.documentElement;
  const boot = window.ditesmoiIntro;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMedia = matchMedia('(max-width: 1023px), (pointer: coarse)');
  const state = window.ditesmoiMotion = { ready: false, reduced: reduced.matches, lenis: null, horizontal: null };
  const pill = document.querySelector('.enquire-pill');
  const hero = document.querySelector('.hero');
  const closing = document.querySelector('.closing-cta');
  const footer = document.querySelector('.site-footer');
  const quiz = document.querySelector('.estimate-quiz');
  let pillTween;
  let heroPassed = false;
  let closingVisible = false;
  let footerVisible = false;
  let quizVisible = false;
  let pillVisible = false;

  function updatePill() {
    const show = !mobileMedia.matches && heroPassed && !closingVisible && !footerVisible && !quizVisible && !document.querySelector('dialog[open]');
    if (show === pillVisible) return;
    pillVisible = show;
    pillTween?.kill();
    if (reduced.matches || !window.gsap) {
      pill.hidden = !show;
      pill.removeAttribute('style');
    } else if (show) {
      pill.hidden = false;
      pillTween = window.gsap.fromTo(pill, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: 'power3.out' });
    } else {
      pill.hidden = true;
      pill.removeAttribute('style');
    }
  }
  const pillObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.target === hero) heroPassed = entry.boundingClientRect.bottom <= 0;
      if (entry.target === closing) closingVisible = entry.isIntersecting;
      if (entry.target === footer) footerVisible = entry.isIntersecting;
      if (entry.target === quiz) quizVisible = entry.isIntersecting;
    }
    updatePill();
  });
  [hero, closing, footer, quiz].filter(Boolean).forEach(el => pillObserver.observe(el));
  mobileMedia.addEventListener('change', updatePill);
  const modalObserver = new MutationObserver(() => {
    updatePill();
    if (state.lenis) document.querySelector('dialog[open]') ? state.lenis.stop() : state.lenis.start();
  });
  document.querySelectorAll('dialog').forEach(el => modalObserver.observe(el, { attributes: true, attributeFilter: ['open'] }));

  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) {
    boot?.finish();
    state.ready = true;
    root.dataset.motionReady = 'fallback';
    return;
  }
  const { gsap, ScrollTrigger, SplitText } = window;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ duration: 1.1, ease: 'power3.out' });
  ScrollTrigger.config({ ignoreMobileResize: true });

  function initialize() {
    const desktopMedia = matchMedia('(min-width: 1024px)');
    const fineMedia = matchMedia('(hover: hover) and (pointer: fine)');
    let activeContext;
    let cleanupMotion;
    function setup({ reduce, desktop, fine, mobile }) {
      state.reduced = reduce;
      state.mobile = mobile;
      const cleanup = [];
      const splits = [];
      const images = [];
      let introTimeline;
      let heroAnimation;
      let pan;
      let panTrigger;
      const horizontalReveals = [];
      root.classList.toggle('motion-active', !reduce);
      if (reduce) {
        boot?.finish();
        pillTween?.kill();
        pill.removeAttribute('style');
        state.ready = true;
        root.dataset.motionReady = 'reduced';
        return () => { root.classList.remove('motion-active'); };
      }

      if (!mobile && desktop && fine && navigator.maxTouchPoints === 0 && window.Lenis) {
        // Native wheel/trackpad response; Lenis handles explicit anchor navigation only.
        const lenis = new Lenis({ autoRaf: false, duration: .65, smoothWheel: false, syncTouch: false, anchors: false,
          prevent: node => Boolean(node.closest('dialog, [data-lenis-prevent]')) });
        const tick = time => lenis.raf(time * 1000);
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        state.lenis = lenis;
        if (document.querySelector('dialog[open]')) lenis.stop();
        cleanup.push(() => { gsap.ticker.remove(tick); lenis.destroy(); state.lenis = null; });
      }
      function scrollToPosition(target, immediate = false) {
        if (state.lenis) state.lenis.scrollTo(target, { immediate, force: true, duration: 1.15 });
        else window.scrollTo({ top: target, behavior: immediate ? 'instant' : 'smooth' });
      }
      const anchorClick = event => {
        const link = event.target.closest('a[href^="#"]');
        if (!link || link.dataset.dialog || event.defaultPrevented || !state.lenis || event.metaKey || event.ctrlKey) return;
        const id = link.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (!id || !target) return;
        event.preventDefault();
        const position = target.getBoundingClientRect().top + scrollY - 96;
        history.pushState(null, '', `#${id}`);
        state.lenis.scrollTo(Math.max(0, position), { offset: 0, force: true, duration: 1.15 });
      };
      document.addEventListener('click', anchorClick);
      cleanup.push(() => document.removeEventListener('click', anchorClick));

      const section = document.querySelector('#destinations');
      const viewport = section.querySelector('.destination-viewport');
      const track = section.querySelector('.destination-rows');
      const rows = [...track.children].filter(node => node.classList.contains('destination-row'));
      section.style.setProperty('--destination-count', rows.length);
      const progress = section.querySelector('.destination-progress');
      const current = progress.querySelector('.destination-current');
      const status = progress.querySelector('.destination-status');
      const tints = [...section.querySelectorAll('.destination-tints > span')];
      // Load/decode upcoming panels before horizontal movement brings them onscreen.
      if (!mobile) {
        const preload = new IntersectionObserver(entries => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          rows.forEach(row => row.querySelectorAll('img').forEach(img => {
            img.loading = 'eager';
            img.decode().catch(() => {});
          }));
          preload.disconnect();
        }, { rootMargin: '150% 0px' });
        preload.observe(section);
        cleanup.push(() => preload.disconnect());
      }
      if (!mobile && desktop && fine) {
        section.classList.add('motion-horizontal');
        progress.hidden = false;
        viewport.setAttribute('tabindex', '0');
        viewport.setAttribute('role', 'region');
        viewport.setAttribute('aria-label', window.DMOI18n.t('a11y.destinationKeyboard'));
        gsap.set(tints, { opacity: 0 });
        gsap.set(tints[0], { opacity: 1 });
        section.dataset.destinationIndex = '0';
        current.textContent = '01';
        let active = -1;
        const fill = gsap.quickSetter(progress.querySelector('.destination-progress-fill'), 'scaleX');
        pan = gsap.timeline({ scrollTrigger: {
          id: 'destinations-pan', trigger: section, start: 'top top', end: () => `+=${innerHeight * (rows.length - 1) * .95}`,
          pin: true, pinSpacing: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1,
          onUpdate(self) {
            fill(1 / rows.length + self.progress * (1 - 1 / rows.length));
            horizontalReveals.forEach(reveal => {
              if (!reveal.played && self.progress >= Math.max(0, (reveal.index - .85) / (rows.length - 1))) {
                reveal.played = true;
                reveal.animation.play();
              }
            });
            const next = Math.round(self.progress * (rows.length - 1));
            if (next !== active) {
              active = next;
              current.textContent = String(next + 1).padStart(2, '0');
              section.dataset.destinationIndex = String(next);
              status.textContent = window.DMOI18n.t('a11y.destinationStatus', { current: next + 1, total: rows.length, name: rows[next].querySelector('h3').textContent });
            }
          }
        } });
        pan.to(track, { x: () => -viewport.clientWidth * (rows.length - 1), duration: rows.length - 1, ease: 'none' }, 0);
        tints.slice(1).forEach((tint, index) => pan.to(tint, { opacity: 1, duration: .4, ease: 'none' }, index + .6));
        panTrigger = pan.scrollTrigger;
        panTrigger.refresh();
        state.horizontal = panTrigger;
        const goTo = (index, immediate = false) => scrollToPosition(panTrigger.start + Math.max(0, Math.min(rows.length - 1, index)) / (rows.length - 1) * (panTrigger.end - panTrigger.start), immediate);
        const keydown = event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const index = Math.round(panTrigger.progress * (rows.length - 1));
          goTo(event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : index + (event.key === 'ArrowRight' ? 1 : -1));
        };
        const focus = event => {
          const row = event.target.closest('.destination-row');
          if (row) goTo(rows.indexOf(row), true);
        };
        viewport.addEventListener('keydown', keydown);
        viewport.addEventListener('focusin', focus);
        cleanup.push(() => {
          viewport.removeEventListener('keydown', keydown);
          viewport.removeEventListener('focusin', focus);
          viewport.removeAttribute('tabindex'); viewport.removeAttribute('role'); viewport.removeAttribute('aria-label');
          section.classList.remove('motion-horizontal');
          progress.hidden = true;
          delete section.dataset.destinationIndex;
          state.horizontal = null;
        });
      }

      const revealAnimations = new Map();
      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          revealAnimations.get(entry.target)?.play();
          revealAnimations.delete(entry.target); revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px 8% 0px' });
      if (revealObserver) cleanup.push(() => { revealObserver.disconnect(); revealAnimations.clear(); });
      function revealOnce(animation, element) {
        if (pan && element.closest('.destination-row')) return;
        if (!revealObserver) return;
        revealAnimations.set(element, animation); revealObserver.observe(element);
      }
      function triggerFor(element) {
        if (pan && element.closest('.destination-row')) return null;
        if (element.getBoundingClientRect().bottom <= 0) return false;
        return null;
      }
      function registerHorizontal(animation, element) {
        const row = pan && element.closest('.destination-row');
        if (row) {
          const index = rows.indexOf(row);
          const passed = section.getBoundingClientRect().top < innerHeight * .9 && pan.scrollTrigger.progress >= Math.max(0, (index - .85) / (rows.length - 1));
          if (passed) animation.progress(1);
          horizontalReveals.push({ animation, index, played: passed });
        }
      }
      document.querySelectorAll('.image-slot:not(.hero-image):not(.press-image)').forEach(frame => {
        const img = frame.querySelector('img');
        if (!img) return;
        if (mobile || !pan || !frame.closest('.destination-row')) {
          // A single compositor animation avoids nested full-image scroll layers.
          const animation = gsap.fromTo(img, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .7, paused: true });
          revealOnce(animation, frame);
          return;
        }
        // Pinned panels already move horizontally; avoid additional image surfaces.
        const destinationReveal = gsap.fromTo(img, { opacity: 0 }, { opacity: 1, duration: .7, paused: true });
        registerHorizontal(destinationReveal, frame);

      });

      function splitHeading(heading) {
        if (!heading.textContent.trim()) return;
        const split = SplitText.create(heading, { type: 'lines', mask: 'lines', linesClass: 'motion-line', autoSplit: true, aria: 'auto',
          onSplit(self) {
            self.masks?.forEach(mask => mask.classList.add('motion-line-mask'));
            const isHero = heading.id === 'hero-title';
            const trigger = triggerFor(heading);
            const tl = gsap.timeline(isHero || !trigger ? { paused: true } : { scrollTrigger: trigger });
            tl.fromTo(self.lines, { yPercent: 100 }, { yPercent: 0, duration: mobile ? .6 : isHero ? .85 : 1.1, stagger: mobile ? .06 : .1, ease: 'power3.out' }, 0);
            const accents = heading.querySelectorAll('em');
            if (accents.length) tl.fromTo(accents, { opacity: 0 }, { opacity: 1, duration: mobile ? .4 : .8, ease: 'expo.out' }, mobile ? .1 : .2);
            if (!isHero && trigger === false) tl.progress(1);
            else if (!isHero) revealOnce(tl, heading);
            if (isHero) heroAnimation = tl;
            return tl;
          }
        });
        splits.push(split);
      }
      document.querySelectorAll('main h1, main h2').forEach(splitHeading);
      const copy = document.querySelectorAll('.section-copy > p, .sisters-panel > p, .hero-intro > p, .destination-intro > p, .section-action, .portfolio-card h3');
      copy.forEach(element => {
        if (mobile && element.closest('.portfolio-grid')) return;
        const trigger = triggerFor(element);
        const animation = gsap.fromTo(element, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: mobile ? .6 : 1.1, ...(trigger ? { scrollTrigger: trigger } : { paused: true }) });
        if (trigger === false) animation.progress(1);
        else revealOnce(animation, element);
      });
      rows.forEach(row => {
        const trigger = triggerFor(row);
        const animation = gsap.fromTo(row.querySelector('.destination-copy'), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: mobile ? .6 : 1.1, ...(trigger ? { scrollTrigger: trigger } : { paused: true }) });
        if (trigger === false) animation.progress(1);
        else revealOnce(animation, row.querySelector('.destination-copy'));
        registerHorizontal(animation, row);
      });
      if (pan) ScrollTrigger.create({ trigger: section, start: 'top 90%', once: true, onEnter: () => {
        horizontalReveals.filter(reveal => reveal.index === 0).forEach(reveal => { reveal.played = true; reveal.animation.play(); });
      } });
      if (mobile) {
        gsap.set(tints, { opacity: 0 }); gsap.set(tints[0], { opacity: 1 });
        rows.forEach((row, index) => {
          if (!index) return;
          const previous = rows[index - 1].querySelector('.mobile-card-surface');
          if (!previous) return;
          const top = () => parseFloat(getComputedStyle(row).top) || 100;
          const marker = row.previousElementSibling?.classList.contains('mobile-card-marker') ? row.previousElementSibling : row;
          const timeline = gsap.timeline({ scrollTrigger: { trigger: marker, start: () => `top ${top() + previous.offsetHeight * .65}px`, end: () => `top ${top()}px`, scrub: true, invalidateOnRefresh: true } });
          timeline.to(previous, { scale: .94, duration: 1, ease: 'none' }, 0)
            .to(previous.querySelector('.mobile-card-shade'), { opacity: .12, duration: 1, ease: 'none' }, 0)
            .to(tints[index], { opacity: 1, duration: 1, ease: 'none' }, 0);
        });
      }
      document.querySelectorAll('[data-count]').forEach(element => {
        const final = Number(element.dataset.count);
        if (!Number.isFinite(final)) return;
        if (element.getBoundingClientRect().bottom <= 0) { element.textContent = String(final); return; }
        const number = { value: Number(element.dataset.countFrom || 0) };
        const count = gsap.to(number, { value: final, duration: 1.2, ease: 'expo.out', snap: { value: 1 }, onUpdate: () => { element.textContent = String(number.value); },
          paused: true });
        revealOnce(count, element);
        cleanup.push(() => { element.textContent = String(final); });
      });

      const finishIntro = () => {
        if (introTimeline && introTimeline.progress() < 1) introTimeline.progress(1);
        heroAnimation?.progress(1);
      };
      window.addEventListener('ditesmoi:intro-complete', finishIntro);
      cleanup.push(() => window.removeEventListener('ditesmoi:intro-complete', finishIntro));
      if (mobile && boot?.first && !boot.done) {
        // The independent SVG intro owns its timing, including slow font loads.
        heroAnimation?.pause(0);
      } else if (boot?.first && !boot.done && performance.now() - boot.started < 1550) {
        const dialog = document.getElementById('motion-intro');
        if (!dialog.open) dialog.showModal();
        const path = dialog.querySelector('.oui-stroke');
        const dot = dialog.querySelector('.oui-dot');
        gsap.set(path, { strokeDasharray: path.getTotalLength(), strokeDashoffset: path.getTotalLength() });
        gsap.set(dot, { strokeDasharray: 8, strokeDashoffset: 8 });
        introTimeline = gsap.timeline({ onComplete: () => boot.finish() });
        introTimeline.to(path, { strokeDashoffset: 0, duration: mobile ? .44 : .8, ease: 'power3.out' }, 0)
          .to(dot, { strokeDashoffset: 0, duration: mobile ? .1 : .2 }, mobile ? .32 : .6)
          .to(dialog, { opacity: 0, duration: mobile ? .12 : .2 }, mobile ? .4 : .75)
          .call(() => { if (dialog.open) dialog.close(); }, [], mobile ? .52 : .95)
          .to('.shutter-left', { xPercent: -101, duration: mobile ? .45 : .85, ease: 'expo.out' }, mobile ? .45 : .75)
          .to('.shutter-right', { xPercent: 101, duration: mobile ? .45 : .85, ease: 'expo.out' }, mobile ? .45 : .75);
        if (heroAnimation) introTimeline.add(heroAnimation.play(0), mobile ? .4 : .75);
        const remaining = Math.max(.2, ((mobile ? 1050 : 1850) - (performance.now() - boot.started)) / 1000);
        introTimeline.timeScale(Math.max(1, introTimeline.duration() / remaining));
      } else {
        if (!mobile || !boot?.first || boot.done) boot?.finish();
        if (languageRebuild && hero.getBoundingClientRect().bottom > 0 && hero.getBoundingClientRect().top < innerHeight) heroAnimation?.play(0);
        else if (boot?.first) heroAnimation?.progress(1);
        else heroAnimation?.play(0);
      }

      const cursor = document.querySelector('.motion-cursor');
      if (!mobile && fine && navigator.maxTouchPoints === 0) {
        cursor.classList.add('is-enabled');
        gsap.set(cursor, { scale: .1 });
        const x = gsap.quickTo(cursor, 'x', { duration: .22, ease: 'power3.out' });
        const y = gsap.quickTo(cursor, 'y', { duration: .22, ease: 'power3.out' });
        let view = false;
        let previousHidden;
        const move = event => {
          const hidden = Boolean(event.target.closest('input, textarea, select, [contenteditable], dialog, .estimate-quiz'));
          if (hidden !== previousHidden) {
            gsap.set(cursor, { opacity: hidden ? 0 : 1 });
            previousHidden = hidden;
          }
          x(event.clientX); y(event.clientY);
          const next = Boolean(event.target.closest('.gallery-image, .portfolio-card .image-slot'));
          if (next !== view) {
            view = next;
            cursor.classList.toggle('is-view', view);
            gsap.to(cursor, { scale: view ? 1 : .1, duration: .8, overwrite: 'auto' });
          }
        };
        const leave = () => gsap.set(cursor, { opacity: 0 });
        document.addEventListener('pointermove', move, { passive: true });
        document.addEventListener('pointerleave', leave);
        const magnetic = document.querySelector('.button-filled');
        const pull = event => {
          const r = magnetic.getBoundingClientRect();
          const x = (event.clientX - r.left - r.width / 2) * .08;
          const y = (event.clientY - r.top - r.height / 2) * .08;
          const factor = Math.min(1, 6 / (Math.hypot(x, y) || 1));
          gsap.to(magnetic, { x: x * factor, y: y * factor, duration: .8, overwrite: true });
        };
        const reset = () => gsap.to(magnetic, { x: 0, y: 0, duration: 1, ease: 'expo.out', overwrite: true });
        magnetic.addEventListener('pointermove', pull);
        magnetic.addEventListener('pointerleave', reset);
        cleanup.push(() => {
          document.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave);
          magnetic.removeEventListener('pointermove', pull); magnetic.removeEventListener('pointerleave', reset);
          gsap.killTweensOf([cursor, magnetic]);
          cursor.classList.remove('is-enabled', 'is-view'); cursor.removeAttribute('style'); magnetic.removeAttribute('style');
        });
      }
      state.ready = true;
      root.dataset.motionReady = 'active';
      const refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
      cleanup.push(() => cancelAnimationFrame(refreshFrame));
      return () => {
        boot?.finish();
        splits.forEach(split => split.kill());
        ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        pillTween?.kill();
        cleanup.reverse().forEach(fn => fn());
        splits.forEach(split => split.revert());
        images.forEach(({ img, wipe }) => wipe.replaceWith(img));
        root.classList.remove('motion-active');
        updatePill();
      };
    }
    function rebuild(force = false) {
      const options = { reduce: reduced.matches, desktop: desktopMedia.matches, fine: fineMedia.matches, mobile: mobileMedia.matches };
      const signature = JSON.stringify(options);
      if (!force && activeContext && signature === state.mediaSignature) return;
      state.mediaSignature = signature;
      // Dispose observers/triggers before reverting their timelines and DOM masks.
      cleanupMotion?.();
      activeContext?.revert();
      activeContext = gsap.context(() => {
        cleanupMotion = setup(options);
      });
    }
    let languageRebuild = false;
    let languageScroll;
    window.addEventListener('ditesmoi:before-language-change', () => {
      const pin = state.horizontal;
      const anchor = [...document.querySelectorAll('main > section, .site-footer')].find(element => {
        const r = element.getBoundingClientRect();
        return r.top <= 140 && r.bottom > 140;
      });
      languageScroll = { y: scrollY, anchor, top: anchor?.getBoundingClientRect().top, progress: pin && scrollY >= pin.start && scrollY <= pin.end ? pin.progress : null };
      cleanupMotion?.(); cleanupMotion = null;
      activeContext?.revert(); activeContext = null;
    });
    window.addEventListener('ditesmoi:language-change', () => {
      languageRebuild = true;
      rebuild();
      ScrollTrigger.refresh();
      if (languageScroll) {
        const pin = state.horizontal;
        const target = pin && languageScroll.progress !== null ? pin.start + languageScroll.progress * (pin.end - pin.start) : languageScroll.anchor ? languageScroll.anchor.getBoundingClientRect().top + scrollY - languageScroll.top : languageScroll.y;
        if (state.lenis) state.lenis.scrollTo(target, { immediate: true, force: true });
        else window.scrollTo({ top: target, behavior: 'instant' });
      }
      state.headlineLanguage = document.documentElement.lang;
      languageRebuild = false;
    });
    [reduced, desktopMedia, fineMedia, mobileMedia].forEach(media => media.addEventListener('change', () => rebuild()));
    window.addEventListener('ditesmoi:mobile-ready', () => rebuild(true));
    rebuild();
    reduced.addEventListener('change', () => {
      if (reduced.matches) boot?.finish();
      updatePill();
    });
  }
  Promise.all([window.DMOI18n.ready, document.fonts.ready, window.DMOMobileReady]).then(initialize).catch(() => { boot?.finish(); root.dataset.motionReady = 'fallback'; state.ready = true; });
})();
