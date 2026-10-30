// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/data/site.ts';

// SITE_URL / BASE_PATH are set by the GitHub Pages workflow (from
// actions/configure-pages), so the same code works for a project site
// (user.github.io/repo/), a user site or a custom domain.
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
