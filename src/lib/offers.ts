// Renders offer cards from src/data/monetization.ts. Shared by Astro pages
// (via set:html) and the client-side workspace.
import { MONETIZATION, isConfigured, type Offer, type PlacementId } from '../data/monetization';
import { escapeHtml as esc } from './format';
import { icon } from './icons';
import { u } from './url';

const SHOW_PLACEHOLDERS = import.meta.env.DEV;

function card(o: Offer, placement: string): string {
  const ready = isConfigured(o.url);
  if (!ready && !SHOW_PLACEHOLDERS) return '';
  const href = o.url.replaceAll('{placement}', encodeURIComponent(placement));
  const rel = o.sponsored ? 'sponsored noopener' : 'noopener';
  return `<a class="offer ${ready ? '' : 'placeholder'}" href="${ready ? esc(href) : '#'}" target="_blank" rel="${rel}" data-offer="${esc(o.id)}">
    <span class="offer-icon">${icon(o.icon, 20)}</span>
    <span class="offer-body">
      <span class="offer-kicker">${esc(o.kicker)}${o.sponsored ? ' · Affiliate' : ''}</span>
      <strong>${esc(o.title)}</strong>
      <span class="offer-text">${esc(o.text)}</span>
      ${ready ? '' : `<span class="offer-ph">Placeholder: set <code>offers.${esc(o.id)}.url</code> in src/data/monetization.ts</span>`}
    </span>
    <span class="offer-cta">${esc(o.cta)} ${icon('external', 14)}</span>
  </a>`;
}

/** Offer cards for a placement, with a disclosure if any link is sponsored. */
export function offersHtml(placement: PlacementId, opts: { title?: string; compact?: boolean } = {}): string {
  const offers = MONETIZATION.placements[placement].map((id) => MONETIZATION.offers[id] as Offer);
  const cards = offers.map((o) => card(o, placement)).filter(Boolean);
  if (!cards.length) return '';
  const sponsored = offers.some((o) => o.sponsored && (isConfigured(o.url) || SHOW_PLACEHOLDERS));
  return `<div class="offers ${opts.compact ? 'compact' : ''}" data-placement="${placement}">
    ${opts.title ? `<h3 class="offers-title">${esc(opts.title)}</h3>` : ''}
    <div class="offer-list">${cards.join('')}</div>
    ${sponsored ? `<p class="disclosure">${esc(MONETIZATION.disclosure)} <a href="${u('/disclosure/')}">Learn more</a></p>` : ''}
  </div>`;
}

export const appStoreId = () => (isConfigured(MONETIZATION.app.appStoreId) ? MONETIZATION.app.appStoreId : '');
export const donation = () =>
  isConfigured(MONETIZATION.donate.url) || SHOW_PLACEHOLDERS ? { ...MONETIZATION.donate, ready: isConfigured(MONETIZATION.donate.url) } : null;
