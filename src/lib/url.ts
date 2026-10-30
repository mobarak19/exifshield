// Prefixes internal paths with the deploy base path, so the site works at a
// domain root (custom domain, username.github.io) or a sub-path
// (username.github.io/repo/). Works in Astro templates and client code.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export const u = (path: string) => `${BASE}${path}`;
