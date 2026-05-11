import { defineLocale } from '../define';
import ko from './ko';

// 日本語 — translation by maintainer; reviewed by native speaker recommended.
const ja: typeof ko = defineLocale({
  search_placeholder: '検索キーワードを入力...',
  search_close: '閉じる',
  search_results_count: '件の結果',
  search_empty: 'キーワードを入力すると結果が表示されます',
  search_no_results: '結果が見つかりません',
  search_loading: '検索インデックスを読み込み中...',
  search_error: '検索インデックスを読み込めませんでした。再試行してください。',
  search_select: '選択',
  search_navigate: '移動',
  search_trigger_hint: '記事を検索',
  search_filter_tag: 'タグ:',
  search_filter_series: 'シリーズ:',

  page_not_found: 'ページが見つかりません',
  page_not_found_description: 'お探しのページは存在しないか、移動された可能性があります。',
  back_to_home: 'ホームに戻る',
  view_blog: 'ブログを見る',
  search: '検索',

  prev: '前へ',
  next: '次へ',
  prev_page: '前のページ',
  next_page: '次のページ',
  page_of: 'ページ',

  toc: '目次',
  toc_open_close: '目次の開閉',
  recent_posts: '最近の投稿',
  view_all: 'すべて見る →',
  reading_time_min: '分で読了',

  keyboard_shortcuts: 'キーボードショートカット',
  shortcut_open_search: '検索を開く',
  shortcut_help: 'このヘルプを表示',
  shortcut_close_modal: 'モーダルを閉じる',

  settings_saved: '設定を保存しました',

  share_twitter: 'Twitter/X で共有',
  share_linkedin: 'LinkedIn で共有',
  share_copy_link: 'リンクをコピー',
  share_copied: 'コピーしました!',

  related_posts: '関連記事',

  skip_to_content: 'メインコンテンツへスキップ',

  giscus_setup_required: 'コメント機能を使用するには Giscus の設定が必要です。',
  giscus_setup_link: 'giscus.app で設定する →',
});

export default ja;
