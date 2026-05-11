import { defineLocale } from '../define';
import ko from './ko';

// English. Every key in `ko` must appear here; the helper enforces it.
const en: typeof ko = defineLocale({
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

  page_not_found: 'Page Not Found',
  page_not_found_description: 'The page you requested does not exist or has been moved.',
  back_to_home: 'Back to Home',
  view_blog: 'View Blog',
  search: 'Search',

  prev: 'Prev',
  next: 'Next',
  prev_page: 'Previous page',
  next_page: 'Next page',
  page_of: 'Page',

  toc: 'On this page',
  toc_open_close: 'Toggle table of contents',
  recent_posts: 'Recent Posts',
  view_all: 'View all →',
  reading_time_min: ' min read',

  keyboard_shortcuts: 'Keyboard Shortcuts',
  shortcut_open_search: 'Open search',
  shortcut_help: 'Show this help',
  shortcut_close_modal: 'Close modal',

  settings_saved: 'Settings saved',

  share_twitter: 'Share on Twitter/X',
  share_linkedin: 'Share on LinkedIn',
  share_copy_link: 'Copy link',
  share_copied: 'Copied!',

  related_posts: 'Related Posts',

  skip_to_content: 'Skip to content',

  giscus_setup_required: 'Giscus configuration is required for comments.',
  giscus_setup_link: 'Configure at giscus.app →',
});

export default en;
