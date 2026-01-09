export const SITE_CONFIG = {
  title: "Hawk's Blog",
  description: 'C++, 시스템 프로그래밍, 임베디드 개발에 대한 기술 블로그',
  author: 'Hawk',
  locale: 'ko-KR',
};

export const BLOG_CONFIG = {
  postsPerPage: 10,
  maxTagsInCard: 2,
  maxTagsInSidebar: 12,
};

export const UI_CONFIG = {
  paginationDelta: 1,
  tocHeadingDepth: { min: 2, max: 3 },
  tocScrollOffset: 100,
};

export const STORAGE_KEYS = {
  theme: 'theme',
  codeThemeDark: 'code-theme-dark',
  codeThemeLight: 'code-theme-light',
  showLineNumbers: 'show-line-numbers',
};

export const DEFAULT_CODE_THEMES = {
  dark: 'github-dark-dimmed',
  light: 'github-light',
};
