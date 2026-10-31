// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/data/site.ts';

// SITE_URL is set as a Cloudflare Pages environment variable (the live site
// URL, used for canonical links and the sitemap). BASE_PATH is only needed
// when serving from a sub-path.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site: process.env.SITE_URL || SITE.url,
  base,
  trailingSlash: 'always',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'never' },
  // Never inline scripts: the Content-Security-Policy only allows script files
  // from this site (script-src 'self'), so inline scripts would be blocked.
  vite: { build: { assetsInlineLimit: 0 } },
});
