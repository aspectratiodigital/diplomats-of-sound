# Diplomats of Sound website

Static site, no dependencies. Requires Node 18+.

```
node build.mjs    # generates dist/ from data/ and src/
node serve.mjs    # preview at http://localhost:4173
```

Deploy by uploading the contents of `dist/` to any static host (Netlify, Cloudflare Pages, GitHub Pages, etc).

## Editing content

- `data/artists.json`: the roster. Add an artist by copying an entry. Each one gets its own page automatically. Per artist: `agent` (booking agent shown on their page), `spotify` (the ID from their Spotify artist link, used for the player) and `gallery` (the extra carousel photos, saved in `src/img/artists/<slug>/`; `main.jpg` is the portrait). Add `"credit": "Name"` to a gallery entry to show a photo credit.
- `data/tours.json`: tour history table.
- `data/site.json`: contact email, social links, "On the road" list, and the history timeline.
- `src/styles.css`, `src/main.js`: design and behaviour.

## To confirm before launch

- Contact email: the old site shows `harry@diplomatsofsound.com` but links to `admin@diplomatsofsound.com`.
- Artist photos: the carousel photos were collected from the artists' own sites, Bandcamp pages, agency and venue pages, and our Instagram. Check we have permission to use each one and add photographer credits where needed. Some artists have only 2 to 3 photos so far, and a few slides are album or tour artwork rather than live shots.
- Spotify IDs were matched by search and checked by name. Franz Von in particular is worth a look.
- Booking agent is set to Harry for every artist (the `agent` field in `data/artists.json`).
- Promoter pack (EPK, rider, stage plot): the site currently offers these "on request".
- Festival and client logos, press quotes and testimonials: none were available on the old site.

## Instagram feed

The "Latest from Instagram" section on the home page shows six saved posts (`data/instagram.json`, images in
`src/img/instagram/`). To make it show your newest posts automatically:

1. Sign up at [behold.so](https://behold.so) (free plan: up to 6 posts, refreshed daily) and connect the
   @diplomatsofsound account. Instagram's own rules usually need a Business or Creator account for this.
2. Create a feed there and copy its link, which looks like `https://feeds.behold.so/YOUR_FEED_ID`.
3. Paste it into `data/site.json` under `instagram` > `feedUrl`, then run `node build.mjs` and redeploy.

If the link is empty, or the feed can't be reached (or the free plan's monthly view limit is used up), the saved
posts are shown instead, so the section is never blank. The saved posts link to the Instagram profile; live
posts link straight to each post.

To refresh the saved posts by hand, replace the images in `src/img/instagram/` (square, 720px) and edit
`data/instagram.json`.

## Artist photo carousels

Each artist page has a photo carousel that moves on by itself (about every 5 seconds). It pauses while you hover, focus
or press on it, and when it is off screen, and every one has a pause button. With "reduce motion" switched on in the
visitor's system it starts paused.

The style is set per artist with the `carousel` field in `data/artists.json`:

- (no field) `slide`: a strip you can swipe, the default (Kolinga and most artists)
- `panels`: slim strips where the open one widens; hover, click or tab to open another (Izo FitzRoy)
- `coverflow`: a 3D wheel of 4:5 photos; click a side photo or drag (Franz Von)

All three use a slow zoom-out on the photo that is showing. To give every artist the same style, set the same `carousel` value on each. The code is in `src/carousels.js` and `src/carousels.css`. A gallery item can also have `"pos": "66% 30%"` to choose which part of the photo stays in view when it is cropped. Coverflow photos are shown 4:5, so portrait or square photos suit it best.
