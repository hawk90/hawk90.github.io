// ============================================================
// Site Configuration
// Edit this file to customize your blog.
// All exports use `define*` helpers for type-safe autocomplete.
// ============================================================

import {
  defineSite,
  defineBranding,
  defineNav,
  defineSocial,
  defineComments,
  defineAnalytics,
  defineNewsletter,
  defineBlog,
  defineUi,
  defineAdmin,
} from '../lib/define';

// --- Site Basic Info ---
export const SITE_CONFIG = defineSite({
  title: "Hawk's Blog",
  description: 'C++, 시스템 프로그래밍, 임베디드 개발에 대한 기술 블로그',
  author: 'Hawk',
  locale: 'ko-KR',
  lang: 'ko',
  url: 'https://hawk90.github.io',
});

// --- Branding ---
export const BRAND_CONFIG = defineBranding({
  logoText: 'Hawk',
  logoSuffix: '.dev',
  copyright: 'Hawk',
  tagline: 'Developer Blog',
  heroTitle: 'Hawk',
  heroDescription: 'Software Engineer who loves C++, Modern C++, and sharing knowledge through writing.',
});

// --- Navigation ---
export const NAV_CONFIG = defineNav([
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog', match: ['/blog', '/tags', '/series'] },
  { href: '/resume', label: 'Resume' },
]);

// --- Social Links ---
export const SOCIAL_CONFIG = defineSocial([
  {
    name: 'GitHub',
    href: 'https://github.com/hawk90',
    icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`,
  },
  {
    name: 'Email',
    href: 'mailto:hawking90a@gmail.com',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
  },
  {
    name: 'RSS',
    href: '/rss.xml',
    icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/></svg>`,
  },
]);

// --- Footer Links ---
// Extra links shown in footer (separate from main nav)
export const FOOTER_LINKS = [
  { href: '/archive', label: 'Archive' },
  { href: '/now', label: 'Now' },
  { href: '/uses', label: 'Uses' },
  { href: '/stats', label: 'Stats' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/rss.xml', label: 'RSS' },
];

// --- Comments ---
export const COMMENTS_CONFIG = defineComments({
  enabled: true,
  provider: 'giscus',
  repo: 'hawk90/hawk90.github.io',
  repoId: '',
  category: 'Announcements',
  categoryId: '',
  lang: 'ko',
});

// --- Analytics ---
export const ANALYTICS_CONFIG = defineAnalytics({
  enabled: false,
});

// --- Newsletter ---
export const NEWSLETTER_CONFIG = defineNewsletter({
  enabled: false,
  // To enable, replace with:
  // enabled: true, provider: 'beehiiv',
  // publication: 'your-publication-id',
  // title: 'Get new posts in your inbox',
  // description: 'No spam. Unsubscribe anytime.',
  // buttonText: 'Subscribe',
});

// --- Share Buttons ---
export const SHARE_CONFIG = {
  enabled: true,
};

// --- Related Posts ---
export const RELATED_POSTS_CONFIG = {
  enabled: true,
  maxPosts: 3,
};

// --- Blog ---
export const BLOG_CONFIG = defineBlog({
  postsPerPage: 10,
  maxTagsInCard: 2,
  maxTagsInSidebar: 12,
});

// --- UI ---
export const UI_CONFIG = defineUi({
  paginationDelta: 3,
  tocHeadingDepth: { min: 2, max: 3 },
  tocScrollOffset: 100,
});

// --- Storage Keys (internal — don't change unless you know why) ---
export const STORAGE_KEYS = {
  theme: 'theme',
  codeTheme: 'code-theme',
  showLineNumbers: 'show-line-numbers',
  // Theme customizer (settings page)
  fontFamily: 'font-family',     // 'sans' | 'serif' | 'mono' | 'system'
  density: 'ui-density',         // 'compact' | 'cozy' | 'comfortable'
  accent: 'accent-color',        // 'purple' | 'blue' | 'green' | 'rose' | 'amber'
};

// --- Default Code Themes (internal) ---
export const DEFAULT_CODE_THEMES = {
  dark: 'github-dark-dimmed',
  light: 'github-light',
};

// --- Admin Panel ---
export const ADMIN_CONFIG = defineAdmin({
  enabled: true,
  // Authentication mode:
  // - 'pat': Personal Access Token only (works everywhere)
  // - 'oauth': GitHub OAuth only (requires Vercel/Netlify)
  // - 'both': Show both options (default)
  authMode: 'both',
  clientId: 'Ov23lim7LA7j5Np59mgw',
  allowedUsers: ['hawk90'],
  contentRepo: 'hawk90/hawk90.github.io',
  branch: 'main',
  contentPath: 'src/content/blog',
  imagePath: 'public/images/blog',
  notifications: {
    enabled: true,
    pollInterval: 5,
  },
});
