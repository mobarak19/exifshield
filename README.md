# ExifShield: Photo Metadata & EXIF Toolkit

A privacy-first photo metadata website. Every tool runs **in the browser**: photos are never uploaded, so there's no backend and hosting is free.

**Inspect → Clean → Analyze**

| Page | Tool |
|---|---|
| `/` | Home + viewer (accepts 1–100 photos) |
| `/exif-viewer/` | EXIF viewer |
| `/remove-exif/` | Lossless metadata remover (presets + custom) |
| `/photo-privacy-checker/` | Privacy score + plain-language report |
| `/photo-location-finder/` | GPS location + opt-in map |
| `/remove-gps-from-photo/` | Remove location only |
| `/batch-exif-viewer/` | Table, gear statistics, duplicates, map, ZIP cleaning |
| `/exif-to-csv/` | CSV / JSON export |
| `/guides/…` | SEO guides (2 to start) |
| `/privacy/`, `/about/` | Trust pages |

## Run it

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static site in dist/
npm run preview   # serve the production build
```

## Deploy to Cloudflare Pages

Cloudflare Pages builds and deploys on every push to `main` (Workers & Pages → Create → Pages → Import an existing Git repository):

- Framework preset: Astro · Build command: `npm run build` · Output directory: `dist`
- Environment variables: `NODE_VERSION=24`, `SITE_URL=https://<project>.pages.dev` (or your custom domain), used for canonical links and the sitemap.

`public/_headers` (CSP and security headers) is applied by Cloudflare automatically.

**Always use `u('/path/')` (from `src/lib/url.ts`) for internal links**, never a bare `"/path/"`, so the site also works under a sub-path. Submit the sitemap (`/sitemap-index.xml`) in Search Console.

Local test of a sub-path build:
```bash
BASE_PATH=/exif-toolkit SITE_URL=https://you.github.io npm run build
```

## Before launch: checklist

1. **Name**: edit `src/data/site.ts` (`name`, fallback `url`) and `public/manifest.webmanifest`. "ExifShield" is a placeholder; check domain and trademark availability.
2. **Contact**: add an email or form on `src/pages/about.astro`.
3. Add the site to **Google Search Console** and submit `sitemap-index.xml`.

## Monetization (Phase 1)

Everything is configured in **one file: `src/data/monetization.ts`**.

| What | Setting | Where it appears |
|---|---|---|
| Smart App Banner (iPhone/iPad Safari) | `app.appStoreId` | Top of every page in Safari |
| Your apps | `offers.app.url`, `offers.restore.url` | After cleaning, privacy report (when risky), tool sidebar, guides |
| Affiliate offers | `offers.backup / editor / enhance / privacy / gear` | After cleaning, Camera tab, batch view, guides |
| Donation button | `donate.url` | Footer, About page |
| Which offer goes where | `placements` | Reorder or remove ids freely |

- Values containing `REPLACE` show as **dashed placeholders in `npm run dev`** and are **hidden in production builds**, so you can deploy any time without broken links.
- Use `{placement}` in affiliate URLs (e.g. `?subid={placement}`) to see which placement earns in each affiliate dashboard.
- Affiliate links get `rel="sponsored"`, an "Affiliate" label and a disclosure line. The full policy is at `/disclosure/`. It includes the Amazon Associates statement; remove it if you don't use Amazon.
- The only third-party script is the cookie-free Cloudflare Web Analytics beacon (allowed in the CSP, described on `/privacy/`). It never sees photos, so the "photos never leave your device" promise stays intact. **Never add ad scripts to tool pages.**
- Payments for a future Pro tier: Stripe doesn't support Bangladesh, so use Lemon Squeezy, Paddle or Gumroad (merchant of record, Payoneer payouts).

## How it works

```
src/
  lib/            framework-free engine (unit-testable)
    analyze.ts    reads a file → PhotoRecord (exifr + own container parser)
    inspect.ts    JPEG/PNG/WebP/GIF parsing: dimensions, DQT quality estimate,
                  subsampling, which metadata blocks exist (EXIF/XMP/IPTC/ICC/C2PA/MPF)
    fields.ts     raw tags → labelled, grouped, human-readable fields
    privacy.ts    privacy findings + score (100 = nothing personal found)
    clean.ts      lossless cleaning: JPEG segment rewrite (selective EXIF via piexifjs,
                  orientation preserved, MPF secondary images dropped), PNG chunk and
                  WebP RIFF chunk filtering; canvas re-encode for HEIC/TIFF/AVIF
    export.ts     JSON / CSV (formula-injection safe, UTF-8 BOM) / TXT
  app/
    workspace.ts  client controller: intake (drop anywhere, paste, picker), state, events
    views.ts      render functions (all file data escaped)
    map.ts        Leaflet, lazy-loaded only when the user clicks "Show map"
  data/tools.ts   one entry per tool page: SEO title/description, copy, steps, FAQ
  pages/[tool].astro  generates every tool page from data/tools.ts
```

Adding a new tool page = add an entry to `src/data/tools.ts` (and a new `mode` in `workspace.ts` if it needs different behaviour).

### Verified behaviour
- JPEG/PNG/WebP cleaning leaves **pixels byte-identical** (checked by decoding before/after).
- "Remove location only" removes GPS and keeps camera, settings and date.
- Custom cleaning (e.g. serial + author only) removes exactly those.
- Orientation is preserved (rotated photos don't come out sideways).
- After cleaning, the tool re-reads the output and shows a before/after verification.

## UX decisions
- **Privacy summary first, raw tags last.** Normal users get a score and plain language; experts get searchable "All data" with raw tag names.
- **GPS is impossible to miss**: red alert, dot on the tab, and a "Remove location" button next to it.
- **Fix next to the problem**: every risk has a one-click action beside it.
- **Proof, not promises**: the result card re-reads the cleaned file; the privacy page explains how to verify (airplane mode / DevTools).
- **Map is opt-in**, because loading tiles tells a map server the area.
- **Try a sample photo** so visitors without a photo at hand still see the value.
- **Drop anywhere, paste, or pick**; multiple files switch to batch view automatically.
- Accessible: keyboard-operable dropzone, ARIA tabs with arrow keys, live regions, visible focus, `prefers-reduced-motion`, dark mode, no horizontal scroll at 390 px.

## Roadmap (from the research)
- **Phase 2**: metadata comparison (A vs B), IPTC/XMP viewer page, metadata editor (date/copyright/caption), EXIF date shifter, HEIC → JPG converter page, GPS coordinate converter.
- **Phase 3**: exposure analyzer page, duplicate finder (perceptual hash), RAW support (CR3/NEF/ARW), C2PA / “Is this AI-generated?” checker (verify manifests with the `c2pa` JS SDK).
- **Content**: guides on what Instagram/WhatsApp/Facebook strip (test yourself and date them), iPhone metadata, Android metadata.
- **Monetization** (see the idea PDF): keep ads off the tool area, add a funnel to your photo apps with a Smart App Banner, and add photography affiliate links on guide pages.
