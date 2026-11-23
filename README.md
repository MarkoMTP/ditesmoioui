# Dites Moi Oui — weddings in France & beyond

Original, buildless HTML, CSS and JavaScript. Local client preview with `noindex, nofollow`. The homepage features a full-screen wedding film and three destination stories: **Provence, French Riviera and Corsica**, using the supplied Dites Moi Oui photography and film.

## Run

Requires Node.js 20.19 or newer. No build or dependency installation is needed to serve the site:

```sh
npm start
```

Open **http://127.0.0.1:4173**. Restart the server after editing `scripts/serve.js`; it now supports MP4 content types, streaming, HEAD and byte-range requests. Any ordinary static server with MP4 support also works. Use `PORT=8080 npm start` to select another port.

## Current media

- The original `pictures ditesmoi/hero ditesmoi.mp4` is unchanged. `assets/video/hero-wide.mp4` is an optimized 1440px-wide version of the full 31.6-second clip for desktop/tablet. `assets/video/hero-mobile.mp4` is a separate 390 × 844px, lower-frame-rate mobile encode that reduces decoding work on phones. The prior portrait file `hero.mp4` is retained but is no longer requested by the page.
- The hero now fills the viewport edge to edge (`100svh`), with a soft ivory title and underline CTAs over a graduated dark scrim. The longer introduction sits immediately below the film. Navigation overlays the video in ivory and becomes solid on scroll.
- Video autoplays muted and loops on desktop and mobile where the browser permits it. Every size has play/pause controls. Reduced-motion visitors see a still frame until they explicitly play; playback pauses outside the viewport and in a hidden tab.
- `assets/images/hero-wide.webp` is the desktop poster; `assets/images/hero.webp` is its responsive mobile counterpart. Both are stills from the supplied film and remain visible if playback or JavaScript is unavailable.
- Both sisters appear in separate, overlapping arches. The saved `amandine.html` / `geraldine.html` files referenced their portraits remotely rather than containing the image files. Those exact portrait images were retrieved and optimized locally. Their source URLs, including the photographer information in the original filenames, are retained in `assets/images/manifest.json`.
- Selected supplied portfolio photos are distributed through planning, production, the six-image collage, the Beyond feature, estimates and portfolio cards. The three newly supplied location photos are used specifically for Provence (lavender fields), the French Riviera (coastal bay) and Corsica (aerial coastline). Selection is fixed rather than reshuffled on each visit.
- All rendered photographs have descriptive alt text, dimensions and local optimized WebP files. Below-fold images are lazy-loaded. Source photos are unchanged.
- No publication logos were provided, so the press row is hidden. Its four original slots remain available if genuine logos are supplied. The typographic brand wordmark remains the fallback until `assets/logo/logo.svg` is provided.

### Current image files

The dimensions below are the optimized files actually in use. `manifest.json` maps each slot back to the supplied original for easy replacement.

| Filename | Export dimensions |
| --- | --- |
| `amandine.webp` | 1000 × 1009 |
| `destination-beyond.webp` | 1050 × 1400 |
| `destination-corsica.webp` | 1000 × 799 |
| `destination-french-riviera.webp` | 1050 × 1400 |
| `destination-provence.webp` | 1050 × 1400 |
| `estimate-1.webp` | 850 × 1133 |
| `estimate-2.webp` | 850 × 1133 |
| `gallery-1.webp` | 850 × 1133 |
| `gallery-10.webp` | 420 × 525 |
| `gallery-2.webp` | 850 × 564 |
| `gallery-3.webp` | 850 × 1133 |
| `gallery-4.webp` | 850 × 850 |
| `gallery-5.webp` | 850 × 1133 |
| `gallery-6.webp` | 850 × 566 |
| `gallery-7.webp` | 405 × 540 |
| `gallery-8.webp` | 405 × 540 |
| `gallery-9.webp` | 405 × 540 |
| `geraldine.webp` | 1000 × 962 |
| `hero.webp` | 900 × 1098 |
| `hero-wide.webp` | 1600 × 626 |
| `planning-1.webp` | 1012 × 1350 |
| `portfolio-1.webp` | 850 × 566 |
| `portfolio-2.webp` | 850 × 568 |
| `portfolio-3.webp` | 850 × 1063 |
| `production-1.webp` | 1050 × 1050 |

The inactive optional press files are `press-1.webp` through `press-4.webp`; recommended dimensions are 400 × 150px. Do not replace these with portfolio photographs, since that would imply publication coverage.

## Branding and layout

Edit the tokens at the top of `css/styles.css`. The six supplied brand colours are preserved. `--color-olive-deep` and `--color-terracotta-deep` are accessible companion colours. `--font-heading` is Bodoni Moda 400, `--font-body` is Manrope 300/400, and `--font-signature` is Mrs Saint Delafield. Change the Google Fonts stylesheet and font preload links in `index.html` together with those tokens when swapping fonts.

`--arch-shape` controls the common mask on both sisters and the four destination photos. The hero uses a rectangular, full-viewport layout; its video fills the space with `object-fit: cover`. Desktop navigation is centred around the wordmark; mobile/tablet use a full-screen modal. Paper grain is an inline SVG layer at 3% opacity; section rules use the original olive token.

## Destination content

The four destination stories are **Provence**, **Corsica**, **Marrakech** and **Apulia** (Corse and Pouilles in French). All four original image slots, filenames and photographs are unchanged, as requested. Their original subject mappings remain in `assets/images/manifest.json`; the labels do not imply that the existing second, third and fourth photographs have been replaced with verified destination imagery. The statistics now use the supplied real values: 2005, two sisters and four signature destinations.

## Interactions

- The sticky ivory header, focus-trapped mobile menu, Escape dismissal, navigation remain intact. The FR/EN toggle is now fully functional.
- The six-image gallery overlaps on desktop and scrolls horizontally on mobile. Four complementary gallery slots appear in the service sections.
- Testimonials cross-fade every seven seconds, with dot selection, keyboard arrows/Home/End and touch swipes. Rotation pauses on hover, focus, hidden tabs or leaving the viewport. An explicit pause/resume button is available, and reduced motion disables autoplay and transitions.
- Primary CTAs use animated underline links; **Book a Free Consultation** remains the only filled button.
- Enquiry/consultation links open the supplied email address; the phone link uses the supplied number. Nothing is sent automatically.
- Journal, Client Access and Privacy Policy remain translated preview dialogs. The five supplied testimonials and all three real portfolio titles/couple lines are in place; portfolio links now open the supplied galleries. Social links retain the requested `href="#"`.

## Verification and captures

Optional browser tooling:

```sh
npm ci
npx playwright install chromium
# Keep npm start running in another terminal:
npm run check
npm run capture:preview
npm run check:performance
```

`PREVIEW_URL` selects another server for checks and Lighthouse. `scripts/capture.js [URL] [directory]` saves 1440px desktop and 390px mobile full-page screenshots and twelve desktop section captures. Captures use reduced motion, so the hero displays its responsive poster. The active video is separately verified in normal-motion browser checks.

New screenshots are in `preview/desktop-full.png` and `preview/mobile-full.png`. The historical reference is retained in `reference/`; the previous approved preview is in `preview/previous/`. `preview/comparison.html` shows the original preview beside the current France homepage.

Checks cover all four requested widths (390 / 768 / 1024 / 1440), loaded photos, no overflow or JavaScript exceptions, the four destination labels/photos, image dimensions, arch masks, centred logo, full-viewport hero sizing, mobile gallery scrolling, video play/pause and reduced motion, modal focus/navigation, testimonial timing and controls, and axe WCAG A/AA checks. Reports are saved in `preview/check-results.json` and `preview/performance-results.json`; full Lighthouse reports are also in `preview/`.


Earlier static verification, 22 November 2026: the full-viewport hero, desktop/mobile autoplay, pause/play controls, all four destination labels/photos, responsive layouts, menu and testimonial controls passed at 390 / 768 / 1024 / 1440px. There were no horizontal overflows, JavaScript errors or axe WCAG A/AA violations. Lighthouse scored **92 mobile performance / 100 desktop performance**, with **100 accessibility**, zero layout shift and 0 ms total blocking time on both. Desktop and mobile captures are current; the reduced-motion screenshots show the responsive video posters.

## Premium motion layer

Installed npm packages: **GSAP 3.15.1** (core, ScrollTrigger and SplitText) and **Lenis 1.3.27**. Browser bundles, source maps and original licence notices are served locally from `assets/vendor/`; there is no motion CDN dependency or build step. After updating either package, run `npm run sync:motion` to refresh the committed browser files.

### Added behavior

1. **Smooth desktop scrolling:** Lenis runs only at desktop widths with a fine pointer and no touch capability. It shares GSAP’s ticker with ScrollTrigger. Touch devices and reduced-motion visitors retain native scrolling. Modal dialogs stop Lenis, and anchor navigation still works.
2. **First-visit intro:** an ivory modal draws a small custom “oui” SVG stroke, then two arched shutter outlines open across the existing full-screen hero while the headline rises. `sessionStorage` is guarded with `try/catch`. Click, Enter or Escape skips the intro; a fail-open deadline clears it within 1.9 seconds. Storage restrictions skip the intro rather than replaying it on every page load.
3. **Headline lines:** Homepage H1/H2 headings use responsive SplitText line masks, `yPercent: 100 → 0`, a 0.1s stagger and 0.8–1.1s reveals. Italic accents fade 0.2s later. Original accessible heading labels are preserved, and width/font changes re-split the lines.
4. **Image wipes:** fixed clipping masks expose images from the bottom using paired transform layers, with image scale `1.08 → 1` over 1.4s. The mask geometry itself is not animated, avoiding per-frame clip-path work on phones. The image frames retain their dimensions.
5. **Arch parallax:** the inner photo layers overscan their frames and scrub from `yPercent: -8 → 8`; the arch frames remain fixed. The overscan prevents empty edges.
6. **Desktop destination story:** at ≥1024px with a fine pointer, the destination scene pins and the four rows move horizontally. Colour layers cross-fade using opacity; no background colour is animated per frame. A 01–04 progress indicator, arrow/Home/End controls, and focus navigation keep the sequence operable by keyboard. Mobile/touch and reduced-motion visitors keep the original vertical stack.
7. **Statistics:** all three supplied values count up on entry. The year starts at 1990 and ends at 2005; the other counters end at 2 and 4. Final values remain available to screen readers throughout.
8. **Cursor and photo viewing:** fine-pointer devices get a small lagged olive dot, growing to an 80px “View” circle over gallery/portfolio images. It hides over form controls and dialogs. The native pointer remains available; gallery image buttons open an accessible photograph dialog; portfolio cards link to their supplied galleries with Escape dismissal and focus return.
9. **Enquiry pill:** appears after the hero and hides while the consultation section, footer or a modal is visible. It is an ordinary anchor to Contact, including in reduced-motion mode.
10. **Buttons:** underline links sweep left to right; the filled consultation button has a fine-pointer magnetic pull clamped to a total displacement of 6px and returns gently on leave.

### Content and palette decisions

The current **Provence / French Riviera / Corsica / BEYOND** names and their supplied photos remain intact. The named Provence and Corsica colours are preserved: Provence `#B7AFC9` and Corsica `#9FB4C2`. The other two supplied tones are used for French Riviera `#C99A7E` and Beyond `#A8B293`, without reintroducing the older Marrakech/Apulia labels. The existing six brand tokens remain unchanged.

### Accessibility, failure behavior and performance trade-offs

- Reduced motion shows final states immediately: no intro, smooth scrolling, pinning, parallax, cursor animation, magnetic movement, or count-up. Live preference changes dispose ScrollTriggers and observers before restoring the original markup/styles. Existing video and testimonial controls continue to respect reduced motion.
- All image/heading reveals use transforms and opacity through fixed masks. The short SVG stroke is the deliberate paint-based exception. The destination colours are static layers with opacity cross-fades.
- The four library bundles total **144,810 bytes uncompressed**, approximately **55,658 bytes with gzip**. Local server transfer size depends on whether compression is enabled. Extra heading/image wrappers and desktop pin spacing are the main DOM costs. No permanent `will-change` is applied to every image.
- The cursor, Lenis and magnetic effect are omitted on touch devices; destination pinning is also omitted there. This keeps native scrolling and avoids unnecessary mobile work.
- The first session includes a short intentional reveal; repeat visits skip it. If libraries fail, the content and native scrolling remain usable, and the intro deadline still clears the overlay. Real video decoding/downloads remain the page’s largest media cost.
- The horizontal story adds deliberate desktop scroll distance. Reduced-motion and touch layouts keep their normal document flow. Unknown counts are not replaced with invented statistics.

### Motion checks

Run `npm run check:motion` in addition to `npm run check`. `preview/motion-results.json` records intro timing/session behavior, skipping, pinned panels and progress, keyboard navigation, native mobile scrolling, cursor/magnetic behavior, enquiry visibility, photo viewing, runtime preference cleanup, blocked storage, library failure and normal-motion axe checks. Existing four-width baseline checks remain in `preview/check-results.json`.

Implementation references: [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP SplitText](https://gsap.com/docs/v3/Plugins/SplitText/), and [Lenis integration guidance](https://github.com/darkroomengineering/lenis).

Motion verification: all desktop and native-touch checks passed, including live reduced-motion cleanup/rebuilding, blocked sessionStorage, and unavailable animation libraries. The final first-visit intro check completed in **1,806 ms**; forced click-skip completed in about **41 ms**. Normal-motion and reduced-motion axe checks returned zero WCAG A/AA violations. The magnetic displacement stayed within a 6px radius.

Motion-layer baseline Lighthouse run: **85 mobile performance / 99 desktop performance**, with **100 accessibility** on both. Mobile: LCP 3.8s, CLS 0.002, TBT 20ms. Desktop: LCP 0.8s, CLS 0.001, TBT 0ms. These are fresh-session measurements with the first-visit motion layer enabled against the existing local server without gzip compression. The main trade-off against the preceding static-motion preview is mobile first-screen load time from the added libraries and intro; it meets the requested 85+ performance threshold. The desktop experience has more scroll distance and composited layers, while touch devices avoid those costs.

`npm run capture:motion` records `preview/motion-tour.webm` and normal-motion screenshots for the hero, stats, gallery, consultation and all four destination colour states. `npm run capture:preview` remains a reduced-motion final-state capture at 1440px and 390px.


## Interactive wedding estimate

The former Wedding Estimate section is now a six-screen quiz with arched radio cards, season and optional year, guest count, celebration style, investment preference and contact details. Native radios support arrow keys and Space; Enter continues, Back preserves answers, errors focus the first invalid field and every new question receives keyboard focus. Inactive screens are disabled and inert. All screens share a grid cell, reserving their height during transitions. The original two estimate photos remain in a desktop arch composition; mobile gives the form the full column. The enquiry pill hides while the quiz is visible.

`js/estimate-config.js` contains all choices, the `investmentRanges` array, `pricing` and `submission` settings. **Every price and multiplier is an illustrative placeholder.** The formula applies the destination base minimum/maximum × guest multiplier × style multiplier, rounding the lower value down and the upper value up to `roundTo`. Investment preferences do not affect this calculation. For example, the current placeholder Provence base (€35,000–€55,000), 100–150 guests (1.35) and a destination weekend (1.5) produce €70,000–€112,000 after rounding. This is a calculation example, not a real Dites Moi Oui quote.

Delivery defaults to **preview mode**: `submission.endpoint` is empty, nothing is posted, the payload is logged once with `console.info`, and the result clearly says no enquiry was sent. To enable delivery, replace the empty string with a public form URL such as `https://formspree.io/f/YOUR_FORM_ID`; never add API secrets to browser code. The existing adapter POSTs JSON with `Accept: application/json`, checks HTTP and JSON errors, and times out after `timeoutMs`. Before using real enquiries, approve the pricing and investment labels, update the placeholder disclosures, set `submission.debug` to `false` to stop logging contact details, and verify the receiving form's delivery settings. No contact data is stored in localStorage or sessionStorage.

Successful preview or live completion queues one `dataLayer` event named `estimate_submitted`: `destination`, `guests`, `style`, `range`, `estimate_min`, `estimate_max`, `currency` and `submission_mode`. Contact names, email, country, date and message are excluded from analytics. **Filter `submission_mode = live` when configuring production Google Ads / GA4 conversions**, so preview tests do not count as leads. This change queues the requested event; it does not install a Google tag or create conversion actions in an external account. Failed requests never emit a conversion and preserve every answer for retry. The submission ID stays the same for a retry so a compatible backend can deduplicate requests; generic form endpoints may not provide idempotency.

The quiz stylesheet and scripts load only when the estimate section comes within 1,400px of the viewport. A small loader and reserved section space keep that work off the hero loading path. If a quiz asset fails, the original email enquiry remains available. This saves initial bytes and DOM work; the trade-off is a brief loading opportunity when jumping straight to the section on a slow connection.

The envelope uses the existing GSAP library: the contact screen folds away, the letter slips inside, the flap closes, a DMO wax seal stamps and the envelope slides away after acceptance. No extra runtime dependency was added. With reduced motion or unavailable GSAP, the same journey reaches its final state without animation. Switching reduced motion on also completes in-progress quiz animations. Form fields and option cards keep native cursor behavior.

Run `npm run check:estimate` against the local server for calculation tests and browser checks. It covers all six screens at 390 / 768 / 1024 / 1440px, radio keyboard controls, validation, back/reset, stable screen height, duplicate-submit protection, preview analytics without contact details, intercepted delivery success/error/timeout/retry, normal motion, live reduced-motion changes, unavailable libraries and no-JavaScript email fallback. Mock deliveries remain local. Results are in `preview/estimate-results.json`; quiz, contact and result screenshots are saved at 390px and 1440px, plus `preview/estimate-envelope.png`.

Implementation references: [Formspree AJAX submissions](https://help.formspree.io/articles/building-your-form/submit-forms-with-javascript-ajax/) and [MDN disabled controls and fieldsets](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled).


Quiz verification, 22 November 2026: the six-step journey passed at **390 / 768 / 1024 / 1440px**, including native keyboard selection, required/contact/year validation, preserved answers, reset, stable panel height, local mocked delivery success/error/timeout/retry, duplicate-submit protection and conversion payloads without contact details. Normal motion, switching reduced motion during navigation/submission, missing animation libraries and the no-JavaScript email fallback passed. All quiz screens and results returned **zero axe WCAG A/AA violations**. Desktop and mobile quiz/contact/result/envelope captures are in `preview/`.

Final quiz Lighthouse result: **85 mobile performance / 99 desktop performance**, with **100 accessibility** on both. Mobile: LCP 3.7s, CLS 0.002, TBT 30ms. Desktop: LCP 0.8s, CLS 0.001, TBT 0ms. Measurements use a fresh first-visit session and the existing uncompressed local server. The quiz adds roughly 10 KB gzipped of component JavaScript/CSS plus a small loader, with no new dependency. Loading the whole component with the hero initially measured 84 mobile; deferring it restored the requested 85+ target. Reserved section space and an inert result sizing copy avoid section/panel jumps when loading and showing the estimate. Slow connections may briefly show the email fallback when jumping directly to the section.


## Final bilingual homepage copy — 23 November 2026

`i18n/en.json` and `i18n/fr.json` are the source of all homepage, quiz, helper and accessibility copy (matching keys in both languages). The static HTML retains the final English text as a no-JavaScript fallback. Elements use `data-i18n` and attribute variants such as `data-i18n-alt`. Only explicitly marked trusted dictionary strings render as HTML; visitor input and interpolated results use text/attribute APIs.

English is the default. A valid `?lang=fr` or `?lang=en` overrides `localStorage['ditesmoi-language']`; selection is remembered with guarded storage access. Header and mobile-menu toggles update the document language, title, description, alt text, controls, dialogs, quiz labels/errors/result/currency and footer. Switching has a short opacity fade, with immediate final states for reduced motion. The current quiz step, selections, typed fields, slider selection and approximate scroll context survive a language switch. No additional conversion is fired by translating a result; analytics labels remain canonical English, and enquiry payloads include the chosen language.

Before replacing translated headings, motion disposes the previous SplitText and ScrollTrigger context; it then splits the new copy, reuses the existing reveal animation and restores pinned destination progress when relevant. The French hero alone has a small font-size adjustment to accommodate the longer supplied heading. No image files, slots, video, colour tokens, section order, scrolling effects or timings were changed. Added text elements are limited to the supplied captions, service list, Start link, testimonial heading/trust line/link, portfolio couple lines and footer location.

The testimonial slider has all five supplied quotes verbatim in both languages and retains its seven-second cross-fade, dots, keyboard, hover/focus pause and reduced-motion behaviour. Portfolio cards and the supplied portfolio/testimonial links use the exact provided URLs with `target="_blank" rel="noopener"`; no external destination was visited or verified. Journal, client access and privacy content remain preview notices because their real content was not supplied. Investment labels, illustrative pricing and the empty delivery endpoint remain intentionally provisional from the estimate task.

Run `npm run check:i18n` alongside the existing homepage, motion and estimate checks. Its report is `preview/i18n-results.json`. EN/FR captures are `preview/en-1440-full.png`, `preview/fr-1440-full.png`, `preview/en-390-full.png` and `preview/fr-390-full.png`, plus per-section captures. The copy audit is `preview/copy-audit.json`; it separates active project code, generated/archived material, supplied website archives and third-party dependencies.


Final bilingual checks passed at 390 / 768 / 1024 / 1440px in both EN and FR, with no overflow, JavaScript errors or axe WCAG A/AA violations. All supplied quotes and portfolio titles/couple lines matched the dictionaries; direct French URLs, storage override/persistence, blocked storage, repeated normal-motion headline splitting, three count-ups and quiz state preservation passed. Existing homepage, motion and estimate regression checks also passed.

Final bilingual Lighthouse measurement: **88 mobile performance / 99 desktop performance**, with **100 accessibility** on both. Mobile: LCP 3.2s, CLS 0.015, TBT 50ms. Desktop: LCP 0.8s, CLS 0.010, TBT 0ms. The English dictionary is discovered with a preload and identical English DOM content is preserved during hydration. The French dictionary warms after the intro on English visits, or loads immediately on first selection; direct French visits load it immediately. The exact existing Lenis rules are now inline, removing one render-blocking request. `npm run sync:motion` keeps that inline copy aligned with the installed vendor stylesheet. These changes alter loading only; motion effects and durations are unchanged.


Destination correction: the featured homepage section is restored to **Provence, French Riviera and Corsica** (Provence, Côte d’Azur et Corse), with their matching existing photographs. The fourth row is removed, the signature destination counter is 3, and pinned scrolling/progress/keyboard controls now use three panels (01–03). Other supplied bilingual copy and quiz options are unchanged.


Destination follow-up: Provence, French Riviera and Corsica remain the first three rows. A fourth “And beyond” row (“Et au-delà” in French) now uses the original beyond photograph, with “Italy, Marrakech…” / “Italie, Marrakech…” in small secondary text. Progress and pinned scrolling cover 01–04.


## Mobile motion and UX pass

The mobile mode is `(max-width: 1023px), (pointer: coarse)`. `js/mobile-loader.js` loads the touch controller only in that mode; desktop keeps the existing gallery collage, quote cross-fade, horizontal pinned destinations, cursor, magnetic button, inline estimate and floating enquiry pill. The touch CSS is non-blocking, with first-screen dimensions reserved inline. Mobile uses the same four existing font files directly; desktop retains its original font stylesheet. No photographs, video files or destination copy were changed by this pass.

- Hero height is `100svh` with `100vh` fallback. No JavaScript viewport-height replacement is applied to the hero. ScrollTrigger still ignores mobile height-only resizes. Native touch scrolling stays enabled; `normalizeScroll` is not used because the measured native scroll sample showed no recurring frame drops.
- The mobile intro runs independently of font/translation/motion-controller loading: 1.2-second SVG drawing, a brief hold, then shutters, about 2.3 seconds after DOM readiness. It remains session-only and tap/keyboard skippable. Desktop timing is unchanged.
- The four destinations are native sticky cards with increasing 10px offsets. Each card keeps its 01–04 label; its inner surface scales to 0.94 and receives a 0.12-opacity shade as the next arrives. Non-sticky flow markers make refresh/language-change measurements reliable. The existing palette cross-fades through opacity layers. Short viewports (609px or less) use regular cards so content is not trapped behind the contact bar.
- Gallery, testimonials and portfolio are native horizontal snap rails with roughly 15% of the next card visible on the tested phone widths, momentum scrolling and progress dots. Testimonials retain their seven-second automatic advance, pause during touch and resume after the gesture/scroll settles; focus and explicit pause controls remain. The testimonial scroller is keyboard-focusable.
- Touch cards/buttons scale to 0.97 over 120ms; underlines respond on tap. Hover feedback, cursor and magnetic movement are disabled in mobile mode. Headlines retain 0.6s reveals with 0.06s stagger. Mobile images use a single 0.7s opacity/translate reveal instead of nested wipes and continuous arch parallax. One shared IntersectionObserver starts reveals. The fixed SVG turbulence overlay is disabled on mobile to reduce rendering work; desktop keeps its texture and image motion.
- A fixed, safe-area-aware bottom bar replaces the pill: Enquire opens the estimate sheet, and WhatsApp uses `WHATSAPP_NUMBER` at the top of `js/mobile.js`. The constant is intentionally empty. Until a real number is configured, the WhatsApp action shows a translated availability message and sends nothing. The bar hides at the hero, closing consultation/footer and while a dialog is open.
- The existing form node moves into a native full-screen modal sheet, retaining answers, validation, delivery, tracking and language state. The sheet slides using transform only; a 48px handle supports drag-down dismissal, with a close button and Escape alternative. Focus returns to the opener and background scroll is preserved. Quiz controls meet 48px touch targets; input font size stays 16px to prevent iOS focus zoom. `VisualViewport` updates only the sheet and scrolls focused fields clear of the keyboard.
- Reduced motion skips the intro, disables video/quote autoplay, parallax, wipes, scales, dimming and smooth programmatic scrolling. Cards use normal document flow; the sheet opens/closes instantly. Native swipe and keyboard controls remain usable.

### Mobile verification

Run `npm run check:mobile`, `npm run capture:mobile`, `npm run check:performance:mobile`, plus the existing motion and estimate checks. WebKit must be installed for the Safari-engine checks (`npx playwright install webkit`). This session uses a temporary WebKit runtime in `/private/tmp/dmo-playwright`; the checker also uses the normal Playwright cache when available.

`preview/mobile-pass/index.html` is the screenshot/report index. It links to every section in EN/FR for iPhone 14 (WebKit, 390×664 viewport / 390×844 screen) and Pixel 7 (Chromium, 412×839), all four sticky cards, the sheet/result, simulated keyboard clearance and full reduced-motion pages. `results.json` records normal/reduced motion, tap skip, trusted Android swipe gestures, drag dismissal, state preservation, autoplay/touch pause, desktop isolation and breakpoint cleanup. `final-checks.json` verifies the identical loaded font families, sticky refresh/language changes, 48px quiz buttons and a 320×568 fallback.

Measured Lighthouse mobile: **EN 85 / FR 85 performance**, **100 accessibility** in both; CLS **0.002 EN / 0.033 FR**, below the 0.05 target. LCP is 4.3s EN / 4.2s FR under Lighthouse mobile throttling. Navigation, keyboard, form delivery/retry and desktop motion regression checks passed with no JavaScript errors or axe WCAG A/AA violations.

The 4× CPU destination-scroll sample recorded approximately 16.7ms median and 95th-percentile rAF cadence with no intervals over 33ms. This is not proof of physical-phone GPU performance: browser emulation does not reproduce device thermals, Safari browser-chrome collapse or the real software keyboard. Those still require a physical-device pass. The keyboard test explicitly simulates visual-viewport height changes and confirms that inputs remain clear while hero height stays unchanged. The requested WhatsApp number remains the only new configuration placeholder.
### Mobile video playback correction

The old running preview process served MP4 files as `application/octet-stream` and ignored byte ranges. Safari rejected the hero with media error 4 (`NotSupportedError`). Restarting the existing preview with the current `scripts/serve.js` restored `video/mp4` and HTTP 206 range responses. Production hosting must preserve both.

Playback now keeps browser interruptions separate from an explicit visitor pause, retries an interrupted request once, and can recover on a trusted tap, visibility return or page restoration. Muted inline playback is explicitly set before loading. Reduced motion still prevents automatic downloading/playback; the visible play control permits an intentional start. OS/browser autoplay restrictions retain the manual control.

`npm run check:video` passed in Pixel 7 Chromium and iPhone 14 WebKit emulation: real decoded autoplay, MP4 range responses, offscreen pause/resume, persistent manual pause, reduced-motion handling and recovery from an injected interrupted playback request.

# ditesmoioui
