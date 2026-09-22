const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Mobile menu
const btn = document.querySelector('.menu-btn');
const nav = document.getElementById('primary-nav');
if (btn && nav) {
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
}

// Header condenses on scroll
const header = document.querySelector('.site-header');
let ticking = false;
const onScroll = () => {
  ticking = false;
  // Two thresholds, so it can't flip back and forth near the top
  const y = window.scrollY;
  if (y > 24) header.classList.add('scrolled');
  else if (y < 6) header.classList.remove('scrolled');
};
window.addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
onScroll();

// Film: autoplays muted once it can, pauses off-screen, and can always be paused
const film = document.querySelector('[data-film]');
if (film) {
  const video = film.querySelector('video');
  const toggle = film.querySelector('[data-film-toggle]');
  let userPaused = reduced;   // reduced-motion visitors get a still frame until they press play
  const inView = () => { const r = film.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };
  const setLabel = () => {
    toggle.textContent = video.paused ? 'Play video' : 'Pause video';
    toggle.setAttribute('aria-pressed', String(video.paused));
  };
  const tryPlay = () => { if (!userPaused && inView()) video.play().catch(() => {}); };
  video.addEventListener('play', setLabel);
  video.addEventListener('pause', setLabel);
  video.addEventListener('canplay', tryPlay);
  window.addEventListener('load', tryPlay);
  toggle.addEventListener('click', () => {
    userPaused = !video.paused;
    if (userPaused) video.pause(); else video.play().catch(() => {});
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) tryPlay(); else video.pause(); });
    }, { threshold: 0.1 }).observe(film);
  }
  tryPlay();
  setLabel();
}

// Instagram: if a live feed link is set in the site data, swap in the newest posts.
// If it is empty, or the feed can't be reached, the saved posts stay.
const ig = document.querySelector('[data-ig]');
if (ig && ig.dataset.feed) {
  const grid = ig.querySelector('[data-ig-grid]');
  const tidy = (t) => String(t || '').replace(/\s+/g, ' ').trim();
  const tile = (p) => {
    const src = (p.sizes && p.sizes.medium && p.sizes.medium.mediaUrl) || p.thumbnailUrl || p.mediaUrl;
    if (!src) return null;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'ig-tile';
    a.href = p.permalink || ig.dataset.profile;
    a.target = '_blank';
    a.rel = 'noopener';
    const words = tidy(p.altText || p.prunedCaption || p.caption) || 'Instagram post';
    a.setAttribute('aria-label', `${words.slice(0, 110)} (opens Instagram in a new tab)`);
    const img = document.createElement('img');
    img.src = src; img.alt = ''; img.width = 720; img.height = 720; img.loading = 'lazy';
    const cap = document.createElement('span');
    cap.className = 'ig-cap';
    cap.textContent = tidy(p.prunedCaption || p.caption);
    a.append(img, cap);
    li.append(a);
    return li;
  };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  fetch(ig.dataset.feed, { signal: ctl.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then((data) => {
      const tiles = (data.posts || []).map(tile).filter(Boolean).slice(0, 6);
      if (tiles.length) grid.replaceChildren(...tiles);
    })
    .catch(() => {})
    .finally(() => clearTimeout(timer));
}

// Reveal elements as they enter the viewport
const revealEls = [...document.querySelectorAll('[data-reveal]')];
if (revealEls.length) {
  const done = (el) => {
    el.classList.add('in');
    // Once settled, drop the reveal hooks so later interactions (filtering, hover) aren't delayed
    setTimeout(() => { el.removeAttribute('data-reveal'); el.style.transitionDelay = ''; }, 1400);
  };
  if (reduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(done);
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { done(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  }
}

// Home: roster index swaps the preview photo on hover or keyboard focus
const index = document.querySelector('[data-index]');
const preview = document.querySelector('[data-preview]');
if (index && preview) {
  const imgs = [...preview.querySelectorAll('img')];
  const rows = [...index.querySelectorAll('a')];
  const show = (i) => {
    imgs.forEach((im) => im.classList.toggle('on', im.dataset.i === String(i)));
    rows.forEach((a) => a.classList.toggle('on', a.dataset.i === String(i)));
  };
  rows.forEach((a) => {
    a.addEventListener('mouseenter', () => show(a.dataset.i));
    a.addEventListener('focus', () => show(a.dataset.i));
  });
  if (finePointer) show(0);
}

// Photos tilt gently toward the pointer
if (finePointer && !reduced) {
  document.querySelectorAll('[data-tilt]').forEach((wrap) => {
    const frame = wrap.querySelector('.frame');
    if (!frame || wrap.querySelector('[data-gallery]')) return;   // carousels stay flat so their buttons and swiping feel steady
    wrap.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      frame.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
      frame.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
    });
    wrap.addEventListener('pointerleave', () => {
      frame.style.setProperty('--rx', '0deg');
      frame.style.setProperty('--ry', '0deg');
    });
  });
}

// Roster page: genre filter with animated in and out
const filters = document.querySelector('[data-filters]');
const grid = document.querySelector('[data-grid]');
if (filters && grid) {
  const count = document.querySelector('[data-count]');
  const items = [...grid.children];
  const apply = (genre) => {
    let n = 0;
    items.forEach((li) => {
      const match = genre === 'all' || li.dataset.genres.split('|').includes(genre);
      if (match) n++;
      if (reduced) { li.hidden = !match; return; }
      if (match) {
        if (li.hidden) {
          li.hidden = false;
          li.classList.add('out');
          void li.offsetWidth; // let the browser register the starting state
        }
        li.classList.remove('out');
      } else if (!li.hidden) {
        li.classList.add('out');
        setTimeout(() => { if (li.classList.contains('out')) li.hidden = true; }, 260);
      }
    });
    filters.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.genre === genre)));
    count.textContent = genre === 'all' ? `Showing all ${n} artists` : `Showing ${n} ${genre} ${n === 1 ? 'artist' : 'artists'}`;
    history.replaceState(null, '', genre === 'all' ? location.pathname : `#${encodeURIComponent(genre)}`);
  };
  filters.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) apply(chip.dataset.genre);
  });
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash && filters.querySelector(`[data-genre="${CSS.escape(hash)}"]`)) apply(hash);
}

// Contact: copy email, prefill the artist, send as an email draft
const copyBtn = document.querySelector('[data-copy]');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyBtn.dataset.copy);
      copyBtn.textContent = 'Copied';
      copyBtn.classList.add('done');
      setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('done'); }, 1800);
    } catch {
      copyBtn.textContent = 'Press Ctrl+C';
    }
  });
}

const form = document.querySelector('[data-contact]');
if (form) {
  const params = new URLSearchParams(location.search);
  const picks = [...form.querySelectorAll('input[name="artist"]')];
  const picked = form.querySelector('[data-picked]');
  const chosen = () => picks.filter((c) => c.checked).map((c) => c.value);
  const showPicked = () => {
    const n = chosen();
    picked.textContent = n.length ? `${n.length} chosen: ${n.join(', ')}` : 'No artists chosen yet';
  };
  params.getAll('artist').forEach((slug) => {
    const box = picks.find((c) => c.dataset.slug === slug);
    if (box) box.checked = true;
  });
  picks.forEach((c) => c.addEventListener('change', showPicked));
  showPicked();
  const hint = form.querySelector('[data-hint]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const required = ['name', 'org', 'email'];
    const missing = required.filter((k) => !form.elements[k].value.trim());
    required.forEach((k) => form.elements[k].setAttribute('aria-invalid', String(missing.includes(k))));
    if (missing.length) {
      hint.textContent = 'Add your name, organisation and email so we can reply.';
      hint.classList.add('error');
      form.elements[missing[0]].focus();
      return;
    }
    hint.classList.remove('error');
    const f = (k) => form.elements[k].value.trim();
    const body = [
      `Name: ${f('name')}`, `Organisation: ${f('org')}`, `Email: ${f('email')}`,
      `Artists: ${chosen().join(', ') || 'Open to suggestions'}`, `Date: ${f('date')}`,
      `Location and capacity: ${f('place')}`, '', f('msg')
    ].join('\n');
    const to = form.closest('main').querySelector('a[href^="mailto:"]').getAttribute('href').replace('mailto:', '');
    const names = chosen();
    const who = names.length === 0 ? f('org')
      : names.length <= 2 ? names.join(' and ')
      : `${names[0]}, ${names[1]} and ${names.length - 2} more`;
    const subject = `Booking enquiry: ${who}`;
    hint.textContent = 'Opening your email app. If nothing happens, email us directly at the address on this page.';
    const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    form.dataset.mailto = url;
    location.href = url;
  });
}
