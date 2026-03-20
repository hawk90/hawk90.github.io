import { SITE_CONFIG } from './config';

const strings: Record<string, Record<string, string>> = {
  ko: {
    // Search
    search_placeholder: '검색어를 입력하세요...',
    search_close: '닫기',
    search_results_count: '개의 결과',
    search_empty: '검색어를 입력하면 결과가 표시됩니다',
    search_no_results: '검색 결과가 없습니다',
    search_loading: '검색 인덱스 로딩 중...',
    search_error: '검색 인덱스를 불러올 수 없습니다. 다시 시도해주세요.',
    search_select: '선택',
    search_filter_tag: '태그:',
    search_filter_series: '시리즈:',

    // 404
    page_not_found: '페이지를 찾을 수 없습니다',
    page_not_found_description: '요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.',
    back_to_home: '홈으로 돌아가기',
    view_blog: '블로그 보기',
    search: '검색하기',

    // Pagination
    prev: '이전',
    next: '다음',
    prev_page: '이전 페이지',
    next_page: '다음 페이지',
    page_of: '페이지',

    // Blog
    toc: '목차 (On this page)',
    toc_open_close: '목차 열기/닫기',
    recent_posts: 'Recent Posts',
    view_all: 'View all →',
    reading_time_min: '분 읽기',

    // Shortcuts
    keyboard_shortcuts: '키보드 단축키',
    shortcut_open_search: '검색 열기',
    shortcut_help: '이 도움말 보기',
    shortcut_close_modal: '모달 닫기',

    // Settings
    settings_saved: '설정이 저장되었습니다',

    // Share
    share_twitter: 'Twitter/X에 공유',
    share_linkedin: 'LinkedIn에 공유',
    share_copy_link: '링크 복사',
    share_copied: '복사됨!',

    // Related Posts
    related_posts: '관련 글',

    // Accessibility
    skip_to_content: '본문으로 건너뛰기',

    // Giscus
    giscus_setup_required: '댓글 기능을 사용하려면 Giscus 설정이 필요합니다.',
    giscus_setup_link: 'giscus.app에서 설정하기 →',
  },
  en: {
    // Search
    search_placeholder: 'Type to search...',
    search_close: 'Close',
    search_results_count: ' results',
    search_empty: 'Type to search for posts',
    search_no_results: 'No results found',
    search_loading: 'Loading search index...',
    search_error: 'Failed to load search index. Please try again.',
    search_select: 'Select',
    search_filter_tag: 'Tag:',
    search_filter_series: 'Series:',

    // 404
    page_not_found: 'Page Not Found',
    page_not_found_description: 'The page you requested does not exist or has been moved.',
    back_to_home: 'Back to Home',
    view_blog: 'View Blog',
    search: 'Search',

    // Pagination
    prev: 'Prev',
    next: 'Next',
    prev_page: 'Previous page',
    next_page: 'Next page',
    page_of: 'Page',

    // Blog
    toc: 'On this page',
    toc_open_close: 'Toggle table of contents',
    recent_posts: 'Recent Posts',
    view_all: 'View all →',
    reading_time_min: ' min read',

    // Shortcuts
    keyboard_shortcuts: 'Keyboard Shortcuts',
    shortcut_open_search: 'Open search',
    shortcut_help: 'Show this help',
    shortcut_close_modal: 'Close modal',

    // Settings
    settings_saved: 'Settings saved',

    // Share
    share_twitter: 'Share on Twitter/X',
    share_linkedin: 'Share on LinkedIn',
    share_copy_link: 'Copy link',
    share_copied: 'Copied!',

    // Related Posts
    related_posts: 'Related Posts',

    // Accessibility
    skip_to_content: 'Skip to content',

    // Giscus
    giscus_setup_required: 'Giscus configuration is required for comments.',
    giscus_setup_link: 'Configure at giscus.app →',
  },
};

/**
 * Get a translated UI string based on the configured language.
 */
export function t(key: string): string {
  const lang = SITE_CONFIG.lang;
  return strings[lang]?.[key] ?? strings['ko']?.[key] ?? key;
}
