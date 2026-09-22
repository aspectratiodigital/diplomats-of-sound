// Artist page photo carousels. Every style advances by itself, pauses while you hover, focus or press on it,
// pauses when it is off screen, and has a pause button. With "reduce motion" switched on it starts paused.
(() => {
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const INTERVAL = 5200;

// The auto-advance clock. It drives the progress line (--p from 0 to 1) and calls onAdvance when it fills.
function makeClock(gal, onAdvance) {
  const reasons = new Set(reduced ? ['user'] : []);
  let elapsed = 0, last = 0, raf = 0;
  const running = () => reasons.size === 0;
  const setP = (v) => gal.style.setProperty('--p', v.toFixed(4));
  const tick = (t) => {
    if (!running()) { last = 0; return; }
    if (!last) last = t;
    elapsed += Math.min(t - last, 100);
    last = t;
    if (elapsed >= INTERVAL) { elapsed = 0; setP(0); onAdvance(); } else setP(elapsed / INTERVAL);
    raf = requestAnimationFrame(tick);
  };
  const refresh = () => {
    cancelAnimationFrame(raf);
    last = 0;
    gal.dataset.stopped = String(reasons.has('user'));
    if (running()) raf = requestAnimationFrame(tick);
  };
  refresh();
  return {
    pause(r) { if (!reasons.has(r)) { reasons.add(r); refresh(); } },
    resume(r) { if (reasons.delete(r)) refresh(); },
    reset() { elapsed = 0; setP(0); },
    toggle() { if (reasons.has('user')) reasons.delete('user'); else reasons.add('user'); refresh(); return !reasons.has('user'); }
  };
}

// Horizontal drag or swipe on an element
function onDrag(el, { move, end, threshold = 6 }) {
  let x0 = null, id = null, dragging = false, lastDx = 0;
  el.addEventListener('pointerdown', (e) => { if (e.button === 0) { x0 = e.clientX; id = e.pointerId; dragging = false; lastDx = 0; } });
  window.addEventListener('pointermove', (e) => {
    if (x0 === null || e.pointerId !== id) return;
    const dx = e.clientX - x0;
    lastDx = dx;
    if (!dragging && Math.abs(dx) > threshold) { dragging = true; try { el.setPointerCapture(id); } catch (_) { /* fine */ } }
    if (dragging) move && move(dx);
  });
  const up = (e) => {
    if (x0 === null || e.pointerId !== id) return;
    const dx = e.type === 'pointercancel' ? lastDx : e.clientX - x0;   // a cancelled pointer reports no position
    const was = dragging;
    x0 = null; dragging = false;
    end && end(dx, was);
    if (was) { const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; el.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => el.removeEventListener('click', stop, true), 50); }
  };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

/* ---------- The styles. Each returns { show(to, dir, from), init?(), busy?() } ---------- */
const styles = {
  // A strip you can swipe. Keeps scrolling by itself.
  slide(gal, items, ctx) {
    const track = gal.querySelector('[data-track]');
    const w = () => track.clientWidth;
    let lock = 0, raf = 0;
    track.addEventListener('scroll', () => {
      if (performance.now() < lock) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ctx.sync(Math.round(track.scrollLeft / w())));
    }, { passive: true });
    window.addEventListener('resize', () => { track.scrollLeft = ctx.current() * w(); });
    const mark = (i) => items.forEach((s, k) => s.classList.toggle('is-current', k === i));
    return {
      init() { mark(0); },
      show(to, dir, from) {
        lock = performance.now() + 800;
        mark(to);
        if (Math.abs(to - from) > 1 && !reduced) {
          track.classList.remove('jump'); void track.offsetWidth; track.classList.add('jump');
          track.scrollTo({ left: to * w(), behavior: 'auto' });
        } else {
          track.scrollTo({ left: to * w(), behavior: reduced ? 'auto' : 'smooth' });
        }
      },
      mark
    };
  },

  // Photos on a 3D wheel. Click a side photo or drag to turn it.
  coverflow(gal, items, ctx) {
    const n = items.length;
    const stage = gal.querySelector('.cflow');
    const place = (to) => items.forEach((c, k) => {
      let d = (k - to + n) % n;
      if (d > n / 2) d -= n;
      c.style.setProperty('--d', d);
      c.style.setProperty('--ad', Math.min(Math.abs(d), 2));
      c.dataset.active = String(d === 0);
      c.dataset.far = String(Math.abs(d) > 1);
    });
    items.forEach((c, k) => c.addEventListener('click', () => { if (k !== ctx.current()) ctx.go(k); }));
    onDrag(stage, {
      move() { stage.classList.add('dragging'); },
      end(dx, was) {
        stage.classList.remove('dragging');
        if (was && Math.abs(dx) > 45) ctx.go(ctx.current() + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      }
    });
    return { init() { place(0); }, show(to) { place(to); } };
  },

  // Slim strips; the open one widens. Hover, click or tab to open another.
  panels(gal, items, ctx) {
    const on = (i) => items.forEach((p, k) => p.classList.toggle('on', k === i));
    items.forEach((p, k) => {
      const b = p.querySelector('.panel-btn');
      b.addEventListener('click', () => ctx.go(k));
      b.addEventListener('focus', () => ctx.go(k));
      if (finePointer) p.addEventListener('pointerenter', () => ctx.go(k));
    });
    return { init() { on(0); }, show(to) { on(to); } };
  }
};

document.querySelectorAll('[data-gallery]').forEach((gal) => {
  const items = [...gal.querySelectorAll('[data-item]')];
  const n = items.length;
  if (n < 2) return;
  const num = gal.querySelector('[data-n]');
  const cap = gal.querySelector('[data-cap]');
  let current = 0;

  const paint = (i) => {
    current = i;
    num.textContent = String(i + 1);
    cap.textContent = items[i].dataset.caption;
    if (items[i].dataset.credit) {
      const c = document.createElement('span');
      c.textContent = `Photo: ${items[i].dataset.credit}`;
      cap.append(' ', c);
    }
  };
  let wasT = 0;
  // the photo we are leaving keeps its slow zoom going while it slides away, so it does not jump
  const leaving = (from) => {
    items.forEach((s) => s.classList.remove('was'));
    items[from].classList.add('was');
    clearTimeout(wasT);
    wasT = setTimeout(() => items[from].classList.remove('was'), 1300);
  };
  const clock = makeClock(gal, () => go(current + 1, 1));
  const ctx = { current: () => current, go: (i, d) => go(i, d), sync: (i) => sync(i), clock };
  const impl = (styles[gal.dataset.style] || styles.slide)(gal, items, ctx);

  function go(i, dir) {
    const to = (i + n) % n;
    if (to === current || (impl.busy && impl.busy())) return;
    const from = current;
    const d = dir || (to > from ? 1 : -1);
    gal.dataset.dir = String(d);
    leaving(from);
    paint(to);
    impl.show(to, d, from);
    clock.reset();
  }
  // the person moved it themselves (swiped the strip)
  function sync(i) {
    const to = Math.max(0, Math.min(n - 1, i));
    if (to === current) return;
    leaving(current);
    paint(to);
    impl.mark && impl.mark(to);
    clock.reset();
  }

  gal.querySelectorAll('[data-prev]').forEach((b) => b.addEventListener('click', () => go(current - 1, -1)));
  gal.querySelectorAll('[data-next]').forEach((b) => b.addEventListener('click', () => go(current + 1, 1)));
  const pauseBtn = gal.querySelector('[data-pause]');
  pauseBtn.addEventListener('click', () => {
    const playing = clock.toggle();
    pauseBtn.setAttribute('aria-label', playing ? 'Pause the slideshow' : 'Play the slideshow');
  });
  if (reduced) pauseBtn.setAttribute('aria-label', 'Play the slideshow');
  gal.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1, 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1, -1); }
  });

  // Pause while the person is interacting or the gallery is out of sight
  if (finePointer) {
    gal.addEventListener('pointerenter', () => clock.pause('hover'));
    gal.addEventListener('pointerleave', () => clock.resume('hover'));
  }
  gal.addEventListener('pointerdown', () => clock.pause('press'));
  ['pointerup', 'pointercancel'].forEach((t) => window.addEventListener(t, () => clock.resume('press')));
  gal.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) clock.pause('focus'); });
  gal.addEventListener('focusout', () => clock.resume('focus'));
  clock.pause('away');
  let seen = false;
  const away = () => (seen && !document.hidden ? clock.resume('away') : clock.pause('away'));
  new IntersectionObserver(([en]) => { seen = en.isIntersecting; away(); }, { threshold: 0.35 }).observe(gal);
  document.addEventListener('visibilitychange', away);

  impl.init && impl.init();
  paint(0);
});
})();
