// Static site generator for Diplomats of Sound. Run: node build.mjs
// Content lives in /data (JSON). Output goes to /dist.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (f) => JSON.parse(readFileSync(new URL(`./data/${f}`, import.meta.url), 'utf8'));
const site = read('site.json');
const artists = read('artists.json');
const tours = read('tours.json');
const instagram = read('instagram.json');

const OUT = fileURLToPath(new URL('./dist/', import.meta.url));
if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Artist photos live in src/img/artists/<slug>/ (main.jpg is the portrait; 1.jpg, 2.jpg... are the extra carousel photos)
const img = (a, root) => `${root}assets/img/artists/${a.slug}/main.jpg`;
const contain = (a) => (a.fit === 'contain' ? ' contain' : '');
const genres = [...new Set(artists.flatMap((a) => a.genres))].sort();
const mail = (subject) => `mailto:${site.email}?subject=${encodeURIComponent(subject)}`;

const icons = {
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.200-.1-2.300-.1-2.300 0-3.800 1.400-3.800 3.900v2.300H7.900v3h2.600V21z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.500" y="5.500" width="19" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="currentColor" d="M10 9.300v5.400l4.700-2.700z"/></svg>'
};
const socialLinks = (links, cls = '') =>
  Object.entries(links).map(([k, u]) => `<a class="social ${cls}" href="${esc(u)}" target="_blank" rel="noopener" aria-label="${esc(k[0].toUpperCase() + k.slice(1))}">${icons[k] || ''}<span>${esc(k[0].toUpperCase() + k.slice(1))}</span></a>`).join('');

const nav = [
  ['Artists', 'artists/'],
  ['Tours', 'tours/'],
  ['About', 'about/'],
  ['Contact', 'contact/']
];

// Split a headline into words so each can rise into place on page load
const riseWords = (text) => text.split(' ').map((w, i) => `<span class="w"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');

function layout({ title, desc, root, path = '', body, jsonld, carousel = false }) {
  const full = title === site.name ? title : `${title} | ${site.name}`;
  const canonical = `${site.url}/${path}`;
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta name="theme-color" content="#FCF8EE">
<meta property="og:image" content="${site.url}/assets/img/icon-192.png">
<link rel="icon" type="image/png" sizes="32x32" href="${root}assets/img/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="${root}assets/img/icon-192.png">
<link rel="apple-touch-icon" href="${root}assets/img/apple-touch-icon.png">
<script>document.documentElement.classList.add('js')</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${root}assets/styles.css">
${carousel ? `<link rel="stylesheet" href="${root}assets/carousels.css">` : ''}
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand lockup" href="${root || './'}" aria-label="${esc(site.name)}, home"><img class="brand-icon" src="${root}assets/img/dos-logo-icon.png" alt="" width="172" height="195"><img class="brand-text" src="${root}assets/img/dos-logo-text.png" alt="" width="605" height="195"></a>
    <button class="menu-btn" aria-expanded="false" aria-controls="primary-nav">Menu</button>
    <nav id="primary-nav" class="primary" aria-label="Primary">
      ${nav.map(([l, h]) => `<a href="${root}${h}"${path.startsWith(h) ? ' aria-current="page"' : ''}>${l}</a>`).join('')}
      <a class="btn btn-primary" href="${root}contact/">Book an artist</a>
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap foot">
    <div>
      <a class="foot-logo lockup" href="${root || './'}" aria-label="${esc(site.name)}, home"><img class="brand-icon" src="${root}assets/img/dos-logo-icon.png" alt="" width="172" height="195" loading="lazy"><img class="brand-text" src="${root}assets/img/dos-logo-text.png" alt="" width="605" height="195" loading="lazy"></a>
      <p>Getting brilliant artists in front of crowds, since ${site.founded}.</p>
      <ul class="partners">
        <li><a class="partner partner-chai" href="${site.chai}" target="_blank" rel="noopener" aria-label="Chai Wallahs (opens in a new tab)"><span class="logo-mask"></span></a></li>
        <li><a class="partner partner-gr" href="${site.grassroots}" target="_blank" rel="noopener" aria-label="Grassroots Rising (opens in a new tab)"><span class="logo-mask"></span></a></li>
      </ul>
    </div>
    <div>
      <h2>Explore</h2>
      <ul>${nav.map(([l, h]) => `<li><a href="${root}${h}">${l}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h2>Contact</h2>
      <p><a href="mailto:${site.email}">${site.email}</a></p>
      <div class="socials">${socialLinks(site.social)}</div>
    </div>
  </div>
  <div class="wrap legal"><p>&copy; ${new Date().getFullYear()} Diplomats of Sound</p></div>
</footer>
<script src="${root}assets/main.js" defer></script>
${carousel ? `<script src="${root}assets/carousels.js" defer></script>` : ''}
</body>
</html>`;
}

const write = (rel, html) => {
  const dir = join(OUT, rel);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
};

const genreList = (a) => a.genres.map(esc).join(', ');

/* ---------- Home ---------- */
const orgLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.name,
  url: site.url,
  logo: `${site.url}/assets/img/dos-logo.png`,
  foundingDate: String(site.founded),
  email: site.email,
  description: 'Booking agency, tour management and event programming company for independent live music.',
  sameAs: Object.values(site.social),
  parentOrganization: { '@type': 'Organization', name: 'Chai Wallahs', url: site.chai }
};

const home = `
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <h1 aria-label="We get great artists in front of crowds.">${riseWords('We get great artists in front of crowds.')}</h1>
      <p class="lede">Diplomats of Sound is a booking agency run by people who love live music. We look after a roster of independent artists who play all kinds of music, and we work alongside festivals, venues and promoters to make brilliant events happen. It all started on the Chai Wallahs stage, and the grassroots scene is still home.</p>
      <div class="actions">
        <a class="btn btn-primary" href="artists/">Meet the artists</a>
        <a class="btn btn-secondary" href="contact/">Contact Us</a>
      </div>
    </div>
    <aside class="road" aria-labelledby="road-h">
      <h2 id="road-h">On the road</h2>
      <ul>
        ${site.upcoming.map((u) => `<li>
          <a href="artists/${u.slug}/">
            <strong>${esc(u.artist)}</strong>
            <span>${esc(u.title)}, ${esc(u.when)}</span>
            <span class="muted">${esc(u.where)}</span>
          </a>
        </li>`).join('')}
      </ul>
      <a class="text-link" href="tours/">See all tours</a>
    </aside>
  </div>
  <div class="wrap">
    <dl class="facts">
      <div><dt>Founded</dt><dd>${site.founded}, Bristol</dd></div>
      <div><dt>Roster</dt><dd>${artists.length} artists</dd></div>
      <div><dt>Touring</dt><dd>UK, Europe and North America</dd></div>
      <div><dt>Services</dt><dd>Booking, tours, programming</dd></div>
    </dl>
  </div>
  <div class="wrap film" data-film role="region" aria-label="Highlights reel: our artists playing live">
    <div class="film-frame">
      <video muted loop playsinline preload="auto" poster="assets/video/dos-reel-poster.jpg" aria-hidden="true" tabindex="-1">
        <source src="assets/video/dos-reel.mp4" type="video/mp4">
      </video>
      <button type="button" class="btn btn-secondary film-toggle" data-film-toggle aria-pressed="false">Pause video</button>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="roster-h">
  <div class="wrap">
    <div class="section-head">
      <h2 id="roster-h">The roster</h2>
      <a class="btn btn-primary" href="artists/">Filter Artists</a>
    </div>
    <div class="index-layout">
      <ol class="index" data-index>
        ${artists.map((a, i) => `<li>
          <a href="artists/${a.slug}/" data-img="${img(a, '')}" data-i="${i}">
            <img class="thumb${contain(a)}" src="${img(a, '')}" alt="" width="60" height="75" loading="lazy">
            <span class="ix-name">${esc(a.name)}</span>
            <span class="ix-genre">${genreList(a)}</span>
            <span class="ix-base">${esc(a.base)}</span>
            <svg class="ix-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>
          </a>
        </li>`).join('')}
      </ol>
      <div class="index-preview" aria-hidden="true" data-tilt>
        <div class="frame" data-preview>
          ${artists.map((a, i) => `<img src="${img(a, '')}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}" data-i="${i}" class="${i === 0 ? 'on' : ''}${contain(a)}">`).join('')}
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section tint" aria-labelledby="do-h">
  <div class="wrap">
    <h2 id="do-h" class="narrow-h">How we work with festivals and bookers</h2>
    <div class="services">
      <article data-reveal>
        <h3>Artist booking</h3>
        <p>We know our artists inside out, on stage and off it. Tell us about your crowd and your stage, and we will help you find the right act, from a solo set to a full band.</p>
      </article>
      <article data-reveal>
        <h3>Tour management</h3>
        <p>Routing, contracts and advancing, all sorted, so artists and venues can get on with the music.</p>
      </article>
      <article data-reveal>
        <h3>Event production and programming</h3>
        <p>We programme stages and whole events, and we love building a line-up together. There is more than twenty years of festival experience from Chai Wallahs behind it.</p>
      </article>
      <article data-reveal>
        <h3>Artist strategy and brand development</h3>
        <p>We work with our artists on what comes next, from growing their audience to building a career that lasts.</p>
      </article>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="hist-h">
  <div class="wrap">
    <h2 id="hist-h" class="narrow-h">Where we come from</h2>
    <ol class="timeline">
      ${site.timeline.map((t, i) => `<li data-reveal style="--d:${i * 70}ms"><span class="yr">${esc(t.year)}</span><p>${esc(t.text)}</p></li>`).join('')}
    </ol>
    <a class="text-link" href="about/">Read our story</a>
  </div>
</section>

<section class="section ig" aria-labelledby="ig-h" data-ig data-feed="${esc(site.instagram.feedUrl)}" data-profile="${esc(site.instagram.url)}">
  <div class="wrap">
    <div class="section-head">
      <div>
        <h2 id="ig-h">Latest from Instagram</h2>
        <p class="ig-sub">Tour announcements and news from our artists. Follow <a href="${site.instagram.url}" target="_blank" rel="noopener">@${site.instagram.handle}</a>.</p>
      </div>
      <a class="btn btn-primary" href="${site.instagram.url}" target="_blank" rel="noopener" aria-label="Follow us on Instagram (opens in a new tab)">Follow us on Instagram</a>
    </div>
    <ul class="ig-grid" data-ig-grid>
      ${instagram.map((p) => `<li><a class="ig-tile" href="${site.instagram.url}" target="_blank" rel="noopener" aria-label="${esc(p.alt)} (opens Instagram in a new tab)"><img src="assets/img/instagram/${p.image}" alt="" width="720" height="720" loading="lazy"><span class="ig-cap">${esc(p.caption)}</span></a></li>`).join('')}
    </ul>
  </div>
</section>

<section class="cta">
  <div class="wrap cta-grid">
    <h2>Got an event in mind? Let's talk.</h2>
    <div>
      <p>Tell us about it: the date, the place and the crowd. We will suggest artists who would suit, and help make it a great night.</p>
      <a class="btn btn-primary" href="contact/">Get in touch</a>
    </div>
  </div>
</section>`;
write('', layout({
  title: site.name,
  desc: 'Diplomats of Sound is a UK booking agency that gets independent artists, playing all kinds of music, in front of crowds. Started in 2010 by the team behind Chai Wallahs.',
  root: '', body: home, jsonld: orgLd
}));

/* ---------- Roster ---------- */
const rosterBody = `
<section class="page-head">
  <div class="wrap">
    <h1>Artists</h1>
    <p class="lede">${artists.length} artists we love, playing all kinds of music. Browse everyone, filter by genre to find what suits your event, or open an artist to find out more and get in touch.</p>
  </div>
</section>
<section class="section flush-top">
  <div class="wrap">
    <div class="filters" role="group" aria-label="Filter by genre" data-filters>
      <button type="button" class="chip" aria-pressed="true" data-genre="all">All <span>${artists.length}</span></button>
      ${genres.map((g) => `<button type="button" class="chip" aria-pressed="false" data-genre="${esc(g)}">${esc(g)} <span>${artists.filter((a) => a.genres.includes(g)).length}</span></button>`).join('')}
    </div>
    <p class="count" aria-live="polite" data-count>Showing all ${artists.length} artists</p>
    <ul class="grid" data-grid>
      ${artists.map((a, i) => `<li data-genres="${esc(a.genres.join('|'))}" data-reveal style="--d:${(i % 4) * 70}ms">
        <a class="card" href="${a.slug}/">
          <span class="ph"><img class="${contain(a).trim()}" src="${img(a, '../')}" alt="" width="${a.main.w}" height="${a.main.h}" loading="lazy"><span class="view">View artist</span></span>
          <h2>${esc(a.name)}</h2>
          <p class="meta">${genreList(a)}</p>
          <p class="meta muted">${esc(a.base)}</p>
        </a>
      </li>`).join('')}
    </ul>
  </div>
</section>`;
write('artists', layout({
  title: 'Artists',
  desc: `Meet the ${artists.length} artists on the Diplomats of Sound roster. All kinds of music, and all keen to play your festival, venue or night.`,
  root: '../', path: 'artists/', body: rosterBody
}));

/* ---------- Artist pages ---------- */
const arrow = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>`;
const iconPause = '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/></svg>';
const iconPlay = '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>';

// Photo carousel. The style comes from the artist's "carousel" field in artists.json:
//   (none) slide    a sliding strip
//   coverflow       a 3D coverflow
//   panels          expanding panels
// All of them advance by themselves, pause on hover or focus, and have their own pause button.
function gallery(a) {
  const root = '../../';
  const base = `${root}assets/img/artists/${a.slug}/`;
  const slides = [];
  if (a.fit !== 'contain') slides.push({ src: base + 'main.jpg', alt: a.name, w: a.main.w, h: a.main.h });
  (a.gallery || []).forEach((g) => slides.push({ src: base + g.file, alt: g.alt, caption: g.caption, w: g.w, h: g.h, credit: g.credit, flat: g.flat, pos: g.pos }));
  const multi = slides.length > 1;
  const style = multi ? (a.carousel || 'slide') : 'slide';
  const pic = (s) => `<div class="pic${s.w / s.h > 1.6 ? ' land' : ''}${s.flat ? ' flat' : ''}" style="--bg:url('${s.src}')${s.flat ? `;--flat:${s.flat}` : ''}${s.pos ? `;--pos:${s.pos}` : ''}"><img src="${s.src}" alt="${esc(s.alt)}" width="${s.w}" height="${s.h}" decoding="async" draggable="false"></div>`;
  const attrs = (s, i, cls) => `class="${cls}" data-item role="group" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}" data-caption="${esc(s.caption || s.alt)}" data-credit="${esc(s.credit || '')}"`;
  let stage;
  if (style === 'coverflow') {
    stage = `<div class="frame cflow"><ul class="cf-stage">${slides.map((s, i) => `<li ${attrs(s, i, 'cf')}>${pic(s)}</li>`).join('')}</ul></div>`;
  } else if (style === 'panels') {
    stage = `<div class="frame"><ul class="panels">${slides.map((s, i) => `<li ${attrs(s, i, 'panel')}>${pic(s)}<button type="button" class="panel-btn" data-panel="${i}" aria-label="Show photo ${i + 1}: ${esc(s.alt)}"><span class="panel-num" aria-hidden="true">0${i + 1}</span></button></li>`).join('')}</ul></div>`;
  } else {
    stage = `<div class="frame"><ul class="slides" data-track${multi ? ' tabindex="0"' : ''}>${slides.map((s, i) => `<li ${attrs(s, i, 'slide')}>${pic(s)}</li>`).join('')}</ul></div>`;
  }
  return `<div class="portrait">
        <div class="gallery gal-${style}" data-gallery data-style="${style}" role="group" aria-roledescription="carousel" aria-label="Photos of ${esc(a.name)}">
          ${stage}
          ${multi ? `<div class="gal-bar">
            <span class="gal-count" aria-hidden="true"><b data-n>1</b> / ${slides.length}</span>
            <span class="gal-prog" aria-hidden="true"></span>
            <button type="button" class="gal-btn" data-pause aria-label="Pause the slideshow">${iconPause}${iconPlay}</button>
            <button type="button" class="gal-btn" data-prev aria-label="Previous photo">${arrow('M15 5l-7 7 7 7')}</button>
            <button type="button" class="gal-btn" data-next aria-label="Next photo">${arrow('M9 5l7 7-7 7')}</button>
          </div>` : ''}
          <p class="gal-cap" data-cap>${esc(slides[0].caption || slides[0].alt)}${slides[0].credit ? ` <span>Photo: ${esc(slides[0].credit)}</span>` : ''}</p>
        </div>
      </div>`;
}

artists.forEach((a, i) => {
  const related = artists.filter((b) => b.slug !== a.slug && b.genres.some((g) => a.genres.includes(g))).slice(0, 3);
  const links = Object.keys(a.links).length ? `<div class="socials">${socialLinks(a.links)}</div>` : '';
  const body = `
<section class="artist-head">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="../">Artists</a> <span aria-hidden="true">/</span> <span>${esc(a.name)}</span></nav>
    <div class="artist-grid">
      ${gallery(a)}
      <div class="artist-main">
        <h1>${esc(a.name)}</h1>
        <p class="lede">${esc(a.line)}</p>
        <dl class="spec">
          <div><dt>Genre</dt><dd>${genreList(a)}</dd></div>
          <div><dt>Based in</dt><dd>${esc(a.base)}</dd></div>
          ${a.format ? `<div><dt>Format</dt><dd>${esc(a.format)}</dd></div>` : ''}
          <div><dt>Booking agent</dt><dd>${esc(a.agent)}</dd></div>
        </dl>
        <h2>About</h2>
        <p class="bio">${esc(a.bio)}</p>
        <h2>Highlights</h2>
        <ul class="highlights">${a.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        <h2>Listen</h2>
        <div class="listen"><iframe src="https://open.spotify.com/embed/artist/${a.spotify}?utm_source=generator&amp;theme=0" width="100%" height="152" style="border:0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Listen to ${esc(a.name)} on Spotify"></iframe></div>
        ${links}
      </div>
    </div>
  </div>
</section>
<section class="section tint">
  <div class="wrap split">
    <div>
      <h2>Want ${esc(a.name)} at your event?</h2>
    </div>
    <div>
      <p>Tell us about your event: the date, the place and the crowd. We will get back to you about availability. If you would like a press kit, tech rider, stage plot or photos, just ask.</p>
      <div class="actions">
        <a class="btn btn-primary" href="../../contact/?artist=${a.slug}">Enquire about ${esc(a.name)}</a>
        <a class="btn btn-secondary" href="${mail(`Promoter pack request: ${a.name}`)}">Request the promoter pack</a>
      </div>
    </div>
  </div>
</section>
${related.length ? `<section class="section">
  <div class="wrap">
    <div class="section-head"><h2>You might also like</h2><a class="text-link" href="../">All artists</a></div>
    <ul class="grid three">
      ${related.map((r) => `<li><a class="card" href="../${r.slug}/"><span class="ph"><img class="${contain(r).trim()}" src="${img(r, '../../')}" alt="" loading="lazy" width="${r.main.w}" height="${r.main.h}"><span class="view">View artist</span></span><h3>${esc(r.name)}</h3><p class="meta">${genreList(r)}</p><p class="meta muted">${esc(r.base)}</p></a></li>`).join('')}
    </ul>
  </div>
</section>` : ''}`;
  write(`artists/${a.slug}`, layout({
    title: `${a.name}: booking and tour enquiries`,
    desc: `${a.name}, ${a.genres.join(', ').toLowerCase()} from ${a.base}. ${a.line} Get in touch with Diplomats of Sound to have them play your event.`,
    root: '../../', path: `artists/${a.slug}/`, body, carousel: true,
    jsonld: {
      '@context': 'https://schema.org', '@type': 'MusicGroup', name: a.name, genre: a.genres,
      description: a.bio, image: `${site.url}/assets/img/artists/${a.slug}/main.jpg`, url: `${site.url}/artists/${a.slug}/`,
      sameAs: Object.values(a.links)
    }
  }));
});

/* ---------- Tours ---------- */
const years = [...new Set(tours.map((t) => t.year))].sort((x, y) => y - x);
const toursBody = `
<section class="page-head">
  <div class="wrap">
    <h1>Tours</h1>
    <p class="lede">Where our artists are playing, and where they have been. If a tour is passing through your area, get in touch. We can often fit in another date.</p>
  </div>
</section>
<section class="section flush-top">
  <div class="wrap">
    <h2>Upcoming</h2>
    <ul class="upcoming">
      ${site.upcoming.map((u) => `<li>
        <div><a class="up-artist" href="../artists/${u.slug}/">${esc(u.artist)}</a><p>${esc(u.title)}</p></div>
        <div><p>${esc(u.when)}</p><p class="muted">${esc(u.where)}</p></div>
        <div class="up-cta">${u.tickets
          ? `<a class="btn btn-primary" href="${esc(u.tickets)}" target="_blank" rel="noopener" aria-label="Get tickets for ${esc(u.artist)}, ${esc(u.title)} (opens in a new tab)">Get tickets</a>`
          : '<span class="badge">Tickets coming soon</span>'}</div>
      </li>`).join('')}
    </ul>
  </div>
</section>
<section class="section tint">
  <div class="wrap">
    <h2 class="tour-history-title">Tour history</h2>
    ${years.map((y) => `<div class="year-block" data-reveal>
      <h3>${y}</h3>
      <table>
        <caption class="sr">Tours in ${y}</caption>
        <colgroup><col class="c-artist"><col class="c-tour"><col class="c-date"><col class="c-venue"></colgroup>
        <thead class="sr"><tr><th scope="col">Artist</th><th scope="col">Tour</th><th scope="col">Date</th><th scope="col">Venue or region</th></tr></thead>
        <tbody>
          ${tours.filter((t) => t.year === y).map((t) => `<tr><th scope="row">${esc(t.artist)}</th><td>${esc(t.title)}</td><td>${esc(t.date)}</td><td>${esc(t.venue)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('')}
  </div>
</section>`;
write('tours', layout({
  title: 'Tours',
  desc: 'Where Diplomats of Sound artists are playing next, and the tours we have worked on, from Nubya Garcia in North America to The Mouse Outfit across the UK.',
  root: '../', path: 'tours/', body: toursBody
}));

/* ---------- About ---------- */
const aboutBody = `
<section class="page-head">
  <div class="wrap">
    <h1>Made by people who love live music.</h1>
    <p class="lede">Diplomats of Sound was started in ${site.founded} by Si Chai and Thomas Smallwood (Toast), the people behind the Chai Wallahs stage. Our job is simple: to get brilliant artists playing in front of crowds.</p>
  </div>
</section>
<section class="section flush-top">
  <div class="wrap prose-grid">
    <div class="prose">
      <h2>Why we started</h2>
      <p>Running the Chai Wallahs stage, we watched brilliant artists get their moment in front of a crowd, and then struggle to keep it going. Many did not have the contacts with promoters, help putting a tour together, or anyone to look after the contracts and paperwork.</p>
      <p>So we started Diplomats of Sound, with Joss Stone's support, to be that help. We work alongside our artists so they can concentrate on the music, and alongside promoters and festivals so the right act ends up on the right stage.</p>
      <h2>What we care about</h2>
      <p>We love our artists, the grassroots scene they come up through, and the wider industry around them. A good live scene needs all of it: festivals of every size, independent venues, promoters, musicians, and the people in the crowd. We want to work with festivals and bookers to make brilliant events, and to keep that scene thriving for everyone in it.</p>
    </div>
    <aside class="prose side">
      <h2>What we do</h2>
      <dl class="services-dl">
        <div><dt>Artist booking</dt><dd>Finding the right artist for your event, and looking after everything from the first hello to the show.</dd></div>
        <div><dt>Tour management</dt><dd>Routing, advancing and admin, so a run of dates goes smoothly.</dd></div>
        <div><dt>Event production and programming</dt><dd>Building stages and events with festivals and venues.</dd></div>
        <div><dt>Artist strategy and brand development</dt><dd>Planning what comes next with the artists we work with.</dd></div>
      </dl>
    </aside>
  </div>
</section>
<section class="section tint">
  <div class="wrap">
    <h2 class="narrow-h">Our history</h2>
    <ol class="timeline">
      ${site.timeline.map((t, i) => `<li data-reveal style="--d:${i * 70}ms"><span class="yr">${esc(t.year)}</span><p>${esc(t.text)}</p></li>`).join('')}
    </ol>
  </div>
</section>
<section class="cta cta-flush cta-white">
  <div class="wrap cta-grid">
    <h2>Planning a stage, festival or night?</h2>
    <div>
      <p>We are always happy to talk through ideas and line-ups, long before anything is booked.</p>
      <a class="btn btn-primary" href="../contact/">Contact Us</a>
    </div>
  </div>
</section>`;
write('about', layout({
  title: 'About',
  desc: 'Diplomats of Sound was started in 2010 by Si Chai and Thomas Smallwood, the team behind the Chai Wallahs stage, to get brilliant independent artists playing in front of crowds.',
  root: '../', path: 'about/', body: aboutBody
}));

/* ---------- Contact ---------- */
const contactBody = `
<section class="page-head">
  <div class="wrap">
    <h1>Book an artist</h1>
    <p class="lede">Tell us about your event and we will get back to you. The more you can share, the easier it is for us to suggest the right artists.</p>
  </div>
</section>
<section class="section flush-top">
  <div class="wrap contact-grid">
    <form class="form" data-contact novalidate>
      <div class="field"><label for="name">Your name</label><input id="name" name="name" autocomplete="name" required></div>
      <div class="field"><label for="org">Festival, venue or company</label><input id="org" name="org" autocomplete="organization" required></div>
      <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required></div>
      <fieldset class="field wide artist-pick">
        <legend>Artists you are interested in <span class="opt">Pick as many as you like, or none and we will suggest some</span></legend>
        <div class="picks">
          ${artists.map((a) => `<label class="pick"><input type="checkbox" name="artist" value="${esc(a.name)}" data-slug="${a.slug}"><span>${esc(a.name)}</span></label>`).join('')}
        </div>
        <p class="picked" aria-live="polite" data-picked>No artists chosen yet</p>
      </fieldset>
      <div class="field"><label for="date">Event date or window</label><input id="date" name="date" placeholder="For example, 18 to 21 June 2027"></div>
      <div class="field"><label for="place">Location and capacity</label><input id="place" name="place" placeholder="For example, Cambridgeshire, 3,000 capacity"></div>
      <div class="field wide"><label for="msg">Anything else</label><textarea id="msg" name="msg" rows="5" placeholder="Slot length, the stage, who else is on the bill, the vibe you are after"></textarea></div>
      <div class="wide"><button class="btn btn-primary" type="submit">Send enquiry</button>
      <p class="hint" data-hint role="status">This opens your email app with the enquiry ready to send to ${esc(site.email)}.</p></div>
    </form>
    <aside class="prose side">
      <h2>Direct contact</h2>
      <p class="email-row"><a href="mailto:${site.email}">${site.email}</a> <button type="button" class="copy" data-copy="${site.email}">Copy</button></p>
      <h2>Useful to include</h2>
      <ul class="highlights">
        <li>Event name and date</li>
        <li>Location and capacity</li>
        <li>Set length and stage</li>
        <li>The kind of crowd and atmosphere you have in mind</li>
      </ul>
    </aside>
  </div>
</section>`;
write('contact', layout({
  title: 'Book an artist',
  desc: 'Tell Diplomats of Sound about your festival, venue or night and we will help you find the right artist.',
  root: '../', path: 'contact/', body: contactBody
}));

/* ---------- 404 + assets ---------- */
writeFileSync(join(OUT, '404.html'), layout({
  title: 'Page not found', desc: 'That page does not exist.', root: '/',
  body: `<section class="page-head"><div class="wrap"><h1>Page not found</h1><p class="lede">That link does not lead anywhere. Try meeting <a href="/artists/">our artists</a> or <a href="/contact/">getting in touch</a>.</p></div></section>`
}));
cpSync(new URL('./src/', import.meta.url), join(OUT, 'assets'), { recursive: true });

// sitemap + robots
const urls = ['', 'artists/', ...artists.map((a) => `artists/${a.slug}/`), 'tours/', 'about/', 'contact/'];
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site.url}/${u}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
console.log(`Built ${urls.length} pages to dist/`);
