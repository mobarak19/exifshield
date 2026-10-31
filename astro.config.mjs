// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/data/site.ts';

// SITE_URL is set as a Cloudflare Pages environment variable (the live site
// URL, used for canonical links and the sitemap). BASE_PATH is only needed
// when serving from a sub-path.
const base = process.env.BASE_PATH || '/';

// Cloudflare Pages sets CF_PAGES=1. Production builds must set SITE_URL, or
// canonical links and the sitemap would point at the placeholder SITE.url.
// Preview builds fall back to their own deployment URL.
const onCloudflare = process.env.CF_PAGES === '1';
if (onCloudflare && process.env.CF_PAGES_BRANCH === 'main' && !process.env.SITE_URL) {
  throw new Error('SITE_URL is not set. In Cloudflare Pages, add it under Settings → Variables and Secrets (e.g. https://your-project.pages.dev), then redeploy.');
}

export default defineConfig({
  site: process.env.SITE_URL || (onCloudflare && process.env.CF_PAGES_URL) || SITE.url,
  base,
  trailingSlash: 'always',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'never' },
  // Never inline scripts: the Content-Security-Policy only allows script files
  // from this site (script-src 'self'), so inline scripts would be blocked.
  vite: { build: { assetsInlineLimit: 0 } },
});
