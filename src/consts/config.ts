// ============================================================
// Site Configuration
// Edit this file to customize your blog.
// ============================================================

// --- Site Basic Info ---
export const SITE_CONFIG = {
  title: "Hawk's Blog",
  description: 'C++, 시스템 프로그래밍, 임베디드 개발에 대한 기술 블로그',
  author: 'Hawk',
  locale: 'ko-KR',
  lang: 'ko' as 'ko' | 'en',
  url: 'https://hawk90.github.io',
};

// --- Branding ---
export const BRAND_CONFIG = {
  logoText: 'Hawk',
  logoSuffix: '.dev',
  copyright: 'Hawk',
  tagline: 'Developer Blog',
  heroTitle: 'Hawk',
  heroDescription: 'Software Engineer who loves C++, Modern C++, and sharing knowledge through writing.',
};

// --- Navigation ---
export const NAV_CONFIG = [
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/resume', label: 'Resume' },
];

// --- Social Links ---
export const SOCIAL_CONFIG = [
  {
    name: 'GitHub',
    href: 'https://github.com/hawk90',
    icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`,
  },
  {
    name: 'RSS',
    href: '/rss.xml',
    icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/></svg>`,
  },
];

// --- Comments (Premium) ---
export const COMMENTS_CONFIG = {
  enabled: true,
  provider: 'giscus' as const,
  repo: 'hawk90/hawk90.github.io',
  repoId: '',
  category: 'Announcements',
  categoryId: '',
  lang: 'ko',
};

// --- Analytics (Premium) ---
export const ANALYTICS_CONFIG = {
  enabled: false,
  provider: 'google' as 'google' | 'umami' | 'plausible',
  id: '',
  // Umami-specific
  src: '', // e.g. 'https://analytics.example.com/script.js'
};

// --- Share Buttons (Premium) ---
export const SHARE_CONFIG = {
  enabled: true,
};

// --- Related Posts (Premium) ---
export const RELATED_POSTS_CONFIG = {
  enabled: true,
  maxPosts: 3,
};

// --- Blog ---
export const BLOG_CONFIG = {
  postsPerPage: 10,
  maxTagsInCard: 2,
  maxTagsInSidebar: 12,
};

// --- UI ---
export const UI_CONFIG = {
  paginationDelta: 1,
  tocHeadingDepth: { min: 2, max: 3 },
  tocScrollOffset: 100,
};

// --- Storage Keys (internal) ---
export const STORAGE_KEYS = {
  theme: 'theme',
  codeThemeDark: 'code-theme-dark',
  codeThemeLight: 'code-theme-light',
  showLineNumbers: 'show-line-numbers',
};

// --- Default Code Themes (internal) ---
export const DEFAULT_CODE_THEMES = {
  dark: 'github-dark-dimmed',
  light: 'github-light',
};
