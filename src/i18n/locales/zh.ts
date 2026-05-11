import { defineLocale } from '../define';
import ko from './ko';

// 简体中文 — translation by maintainer; reviewed by native speaker recommended.
const zh: typeof ko = defineLocale({
  search_placeholder: '输入搜索关键词...',
  search_close: '关闭',
  search_results_count: ' 条结果',
  search_empty: '输入关键词后将显示结果',
  search_no_results: '没有找到结果',
  search_loading: '正在加载搜索索引...',
  search_error: '无法加载搜索索引,请重试。',
  search_select: '选择',
  search_navigate: '导航',
  search_trigger_hint: '搜索文章',
  search_filter_tag: '标签:',
  search_filter_series: '系列:',

  page_not_found: '页面未找到',
  page_not_found_description: '您请求的页面不存在或已被移动。',
  back_to_home: '返回首页',
  view_blog: '查看博客',
  search: '搜索',

  prev: '上一页',
  next: '下一页',
  prev_page: '上一页',
  next_page: '下一页',
  page_of: '页',

  toc: '目录',
  toc_open_close: '切换目录',
  recent_posts: '最近文章',
  view_all: '查看全部 →',
  reading_time_min: ' 分钟阅读',

  keyboard_shortcuts: '键盘快捷键',
  shortcut_open_search: '打开搜索',
  shortcut_help: '显示此帮助',
  shortcut_close_modal: '关闭弹窗',

  settings_saved: '设置已保存',

  share_twitter: '分享到 Twitter/X',
  share_linkedin: '分享到 LinkedIn',
  share_copy_link: '复制链接',
  share_copied: '已复制!',

  related_posts: '相关文章',

  skip_to_content: '跳到主要内容',

  giscus_setup_required: '评论功能需要配置 Giscus。',
  giscus_setup_link: '前往 giscus.app 配置 →',
});

export default zh;
