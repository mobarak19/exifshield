// ─────────────────────────────────────────────────────────────────────────────
// Monetization settings: the ONLY file you need to edit.
//
// • Replace every value that contains "REPLACE" with your real ID or link.
// • Anything still containing "REPLACE" is shown as a dashed placeholder in
//   `npm run dev` and automatically HIDDEN in production builds, so you
//   never ship a broken link.
// • In affiliate URLs you can use the token {placement}. It is replaced with
//   where the link was shown (e.g. "after-clean", "guide-exif"), so your
//   affiliate dashboard can tell you which placement earns. Most programs
//   accept a sub-ID parameter (subid, sid, u1, tag suffix…).
// • Everything here is plain links and one Apple <meta> tag: no third-party
//   scripts, so the "photos never leave your device" promise and the CSP
//   stay intact.
// ─────────────────────────────────────────────────────────────────────────────

export interface Offer {
  id: string;
  /** Short label above the title, e.g. "Recommended". */
  kicker: string;
  title: string;
  text: string;
  cta: string;
  url: string;
  icon: string;
  /** true = affiliate/sponsored link (adds rel="sponsored" and a disclosure). */
  sponsored: boolean;
}

export const MONETIZATION = {
  /** Shown under any block that contains affiliate links. */
  disclosure: 'Some links are affiliate links. If you buy, we may earn a commission at no extra cost to you. It helps keep these tools free.',

  /** Your iOS app: powers Apple's Smart App Banner on iPhone/iPad Safari. */
  app: {
    appStoreId: 'REPLACE_APP_STORE_ID', // numbers only, e.g. 1234567890
    name: 'REPLACE App Name',
  },

  /** Footer + About page "support" link (Buy Me a Coffee, Ko-fi, GitHub Sponsors…). */
  donate: {
    label: 'Buy me a coffee',
    url: 'REPLACE_DONATION_URL',
  },

  offers: {
    // Your own app: the most valuable placement.
    app: {
      id: 'app',
      kicker: 'iPhone app',
      title: 'Remove location before you share, on your iPhone',
      text: 'Clean photos right from your camera roll, with no computer needed.',
      cta: 'Get it on the App Store',
      url: 'https://apps.apple.com/app/idREPLACE_APP_STORE_ID',
      icon: 'shieldCheck',
      sponsored: false,
    },
    restore: {
      id: 'restore',
      kicker: 'From the same developer',
      title: 'Bring old & blurry photos back to life',
      text: 'Restore faded prints and sharpen blurry shots with AI, on iPhone.',
      cta: 'See the app',
      url: 'https://apps.apple.com/app/idREPLACE_RESTORE_APP_ID',
      icon: 'sparkles',
      sponsored: false,
    },
    backup: {
      id: 'backup',
      kicker: 'Recommended',
      title: 'Keep your originals safe & private',
      text: 'Back up the full-quality originals in end-to-end encrypted cloud storage, and share only clean copies.',
      cta: 'Try encrypted backup',
      url: 'REPLACE_BACKUP_AFFILIATE_URL?subid={placement}',
      icon: 'lock',
      sponsored: true,
    },
    editor: {
      id: 'editor',
      kicker: 'Recommended',
      title: 'Edit like a pro',
      text: 'The photo editor we recommend for RAW editing, AI masking and batch exports.',
      cta: 'Try it free',
      url: 'REPLACE_PHOTO_EDITOR_AFFILIATE_URL?subid={placement}',
      icon: 'sliders',
      sponsored: true,
    },
    enhance: {
      id: 'enhance',
      kicker: 'Recommended',
      title: 'Sharpen, denoise & upscale',
      text: 'Fix high-ISO noise and motion blur, and upscale small photos for print.',
      cta: 'Try it free',
      url: 'REPLACE_AI_ENHANCER_AFFILIATE_URL?subid={placement}',
      icon: 'zap',
      sponsored: true,
    },
    privacy: {
      id: 'privacy',
      kicker: 'Recommended',
      title: 'Go further with your privacy',
      text: 'An encrypted email, VPN and password manager suite from a privacy-first company.',
      cta: 'Learn more',
      url: 'REPLACE_PRIVACY_SUITE_AFFILIATE_URL?subid={placement}',
      icon: 'shield',
      sponsored: true,
    },
    gear: {
      id: 'gear',
      kicker: 'Photo gear',
      title: 'Fast, reliable memory cards',
      text: 'The SD cards and portable SSDs we trust for long shoots and 4K video.',
      cta: 'See prices',
      url: 'REPLACE_AMAZON_AFFILIATE_URL?tag=REPLACE-20&ascsubtag={placement}',
      icon: 'camera',
      sponsored: true,
    },
  } satisfies Record<string, Offer>,

  /** Which offers appear where. Reorder or remove ids freely. */
  placements: {
    afterClean: ['app', 'backup'],
    privacyRisk: ['app'],
    camera: ['editor', 'enhance'],
    batch: ['backup', 'gear'],
    guideExif: ['editor', 'app', 'privacy'],
    guideLocation: ['app', 'privacy', 'backup'],
    toolSidebar: ['restore'],
  },
} as const;

export type OfferId = keyof typeof MONETIZATION.offers;
export type PlacementId = keyof typeof MONETIZATION.placements;

export const isConfigured = (value: string) => !!value && !value.includes('REPLACE');
