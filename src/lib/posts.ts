import { type CollectionEntry } from 'astro:content';
import { SITE_CONFIG } from '../consts/config';
import { getCategoryTrail } from '../consts/categories';
import { getBlogContentManifest, getPublicationDecision } from './content';
import { formatDate } from './utils';

export type BlogPost = CollectionEntry<'blog'>;
const postMetaCache = new WeakMap<BlogPost, PostMeta>();
const backlinkIndexCache = new WeakMap<readonly BlogPost[], Map<string, BlogPost[]>>();
let publishedPostsPromise: Promise<BlogPost[]> | null = null;
export interface PostMeta {
  formattedDate: string;
  formattedUpdatedDate: string | null;
  readingTime: number;
  wasUpdated: boolean;
  thumbnail: string;
}

export interface RelatedPost {
  post: BlogPost;
  /** The reader-visible reason is intentional, never an opaque relevance score. */
  reason: string;
  source: 'curated' | 'inferred';
}

/**
 * 발행된 포스트를 날짜 내림차순으로 가져오기
 */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  if (!publishedPostsPromise) {
    publishedPostsPromise = getBlogContentManifest().then((manifest) =>
      sortByDate(
        manifest.documents
          .filter((document) => getPublicationDecision(document).render)
          .map((document) => document.source),
      ),
    );
  }
  return publishedPostsPromise;
}

/**
 * 최신 발행 글
 */
export function getLatestPosts(posts: BlogPost[], limit: number): BlogPost[] {
  return sortByDate(posts).slice(0, limit);
}

/**
 * 최근 수정 글 (updated 기준 내림차순)
 */
export function getRecentlyUpdatedPosts(posts: BlogPost[], limit: number): BlogPost[] {
  return [...posts]
    .filter(isUpdatedPost)
    .sort((a, b) => (b.data.updated?.valueOf() || 0) - (a.data.updated?.valueOf() || 0))
    .slice(0, limit);
}

/**
 * 포스트를 날짜 내림차순으로 정렬
 */
export function sortByDate(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/**
 * 수정 글 여부
 */
export function isUpdatedPost(post: BlogPost): boolean {
  return !!post.data.updated && post.data.updated.valueOf() > post.data.date.valueOf();
}

/**
 * 카드/리스트 표시용 메타
 */
export function getPostMeta(post: BlogPost): PostMeta {
  const cached = postMetaCache.get(post);
  if (cached) return cached;
  const wasUpdated = isUpdatedPost(post);
  const meta = {
    formattedDate: formatDate(post.data.date, 'short'),
    formattedUpdatedDate: wasUpdated && post.data.updated ? formatDate(post.data.updated, 'short') : null,
    readingTime: getReadingTime(post.body || ''),
    wasUpdated,
    thumbnail: post.data.image || getDefaultThumbnail(post),
  };
  postMetaCache.set(post, meta);
  return meta;
}

function getDefaultThumbnail(post: BlogPost): string {
  const tags = post.data.tags;
  if (tags.includes('C++') || tags.includes('cpp')) return '/images/thumbnails/cpp.svg';
  if (tags.includes('TypeScript') || tags.includes('JavaScript')) return '/images/thumbnails/code.svg';
  if (post.data.type === 'book-review') return '/images/thumbnails/book.svg';
  return '/images/thumbnails/default.svg';
}

/**
 * 태그별 포스트 수 계산 (카운트 내림차순, 이름 오름차순)
 */
export function getTagsWithCount(posts: BlogPost[]): [string, number][] {
  const counts: Record<string, number> = {};
  posts.flatMap((p) => p.data.tags).forEach((tag) => {
    counts[tag] = (counts[tag] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/**
 * 모든 고유 태그 (알파벳순)
 */
export function getAllTags(posts: BlogPost[]): string[] {
  return [...new Set(posts.flatMap((p) => p.data.tags))].sort((a, b) => a.localeCompare(b));
}

/**
 * Tag 페이지를 생성할 가치가 있는 태그만 — 빌드 시간 단축용.
 * 1-post 태그가 전체의 ~70%라 페이지 생성 비용이 크다.
 * Threshold 이상 게시물이 있는 태그만 페이지를 만든다.
 */
export function getTagsForPageGeneration(posts: BlogPost[], minPosts = 2): string[] {
  const tags = new Map<string, { label: string; count: number }>();
  for (const p of posts) {
    for (const t of p.data.tags) {
      const key = t.toLocaleLowerCase();
      const current = tags.get(key);
      tags.set(key, {
        // Keep the first spelling for display, but match the URL's
        // case-insensitive semantics when counting and generating routes.
        label: current?.label ?? t,
        count: (current?.count ?? 0) + 1,
      });
    }
  }
  return [...tags.values()]
    .filter(({ count }) => count >= minPosts)
    .map(({ label }) => label)
    .sort((a, b) => a.localeCompare(b));
}

let routableTagKeysPromise: Promise<Set<string>> | null = null;

/**
 * The tags that actually have a page, keyed the way the URL is.
 *
 * Anything rendering a tag as a link has to ask this first. The threshold in
 * `getTagsForPageGeneration` used to be applied only where routes are made,
 * so every post linked all of its tags while only the shared ones existed:
 * 1465 tags were linked and 468 had pages, leaving 997 hrefs that 404'd. The
 * threshold is right — most tags are carried by a single post and a page for
 * each is thin — but a rule about which pages exist has to reach the code
 * that points at them, or it is a rule about nothing.
 *
 * Derived from the same function the route uses, so the two cannot drift.
 */
export async function getRoutableTagKeys(): Promise<Set<string>> {
  if (!routableTagKeysPromise) {
    routableTagKeysPromise = getPublishedPosts().then(
      (posts) => new Set(getTagsForPageGeneration(posts).map((tag) => tag.toLocaleLowerCase())),
    );
  }
  return routableTagKeysPromise;
}

/**
 * URL prefixes that appear inside post URLs but address nothing.
 *
 * Every post URL is a path, so every prefix of it looks like a place: a reader
 * who trims `/blog/embedded/modern-recipes/part10-05-uart-not-printing` back to
 * `/blog/embedded/modern-recipes/` is asking for the 152 posts under it. On a
 * static host that request 404s unless something is built there, and 28 such
 * prefixes covering all 726 published posts were dead.
 *
 * They are not categories — `categories.ts` describes a level above, so
 * `embedded` has a page and `embedded/modern-recipes` does not. What each one
 * actually corresponds to is a series, and today every one of the 28 holds
 * exactly one. So the prefix is not a missing page; it is a second address for
 * a page that exists, and the caller renders a redirect rather than a copy —
 * two URLs listing the same posts is the duplication this avoids.
 *
 * A prefix holding two series has no unambiguous destination and is skipped
 * rather than guessed at.
 */
export function getSeriesUrlPrefixes(
  posts: BlogPost[],
  isAddressable: (prefix: string) => boolean,
): Array<{ prefix: string; series: string }> {
  const seriesByPrefix = new Map<string, Set<string>>();
  for (const post of posts) {
    if (!post.data.series) continue;
    const segments = post.id.split('/');
    for (let i = 1; i < segments.length; i++) {
      const prefix = segments.slice(0, i).join('/');
      if (isAddressable(prefix)) continue;
      if (!seriesByPrefix.has(prefix)) seriesByPrefix.set(prefix, new Set());
      seriesByPrefix.get(prefix)!.add(post.data.series);
    }
  }
  return [...seriesByPrefix.entries()]
    .filter(([, series]) => series.size === 1)
    .map(([prefix, series]) => ({ prefix, series: [...series][0] }))
    .sort((a, b) => a.prefix.localeCompare(b.prefix));
}

/**
 * 포스트에서 모든 고유 시리즈 추출 (알파벳순)
 */
export function getAllSeries(posts: BlogPost[]): string[] {
  return [...new Set(posts.filter((p) => p.data.series).map((p) => p.data.series!))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/**
 * 카테고리별 포스트 필터링
 *
 * Reads the declared `topics`, not the post's id. The id is the frozen URL, and
 * routing membership off it made the folder, the URL and the taxonomy one
 * string: a post could not be reclassified without moving the file, and moving
 * the file changed the URL. `topics` is the field that already exists for this
 * — required on every post and validated against the same registry — and it
 * was being written by every post while no page read it.
 *
 * A topic implies its ancestors, so a post declaring `embedded/hardware` still
 * appears under `embedded`. At the switchover the two rules agreed on all 726
 * published posts, so this changed nothing visible; what it changes is that
 * they can now disagree, which is the point.
 */
export function filterByCategory(posts: BlogPost[], categoryId: string): BlogPost[] {
  return posts.filter((p) => categoryIdsOf(p).has(categoryId));
}

/** Every category a post belongs to: its declared topics plus their ancestors. */
export function categoryIdsOf(post: BlogPost): Set<string> {
  const ids = new Set<string>();
  for (const topic of post.data.topics ?? []) {
    for (const category of getCategoryTrail(topic)) ids.add(category.id);
  }
  return ids;
}

/**
 * 태그별 포스트 필터링 (대소문자 무시)
 */
export function filterByTag(posts: BlogPost[], tag: string): BlogPost[] {
  const lowerTag = tag.toLowerCase();
  return posts.filter((p) => p.data.tags.some((t) => t.toLowerCase() === lowerTag));
}

/**
 * 읽기 시간 계산
 * 한국어: 분당 500자 / 영어: 분당 200단어
 */
export function getReadingTime(content: string): number {
  const lang = SITE_CONFIG.lang;

  if (lang === 'ko') {
    // Korean: count characters (excluding spaces and markdown syntax)
    const text = content
      .replace(/```[\s\S]*?```/g, '') // remove code blocks
      .replace(/`[^`]*`/g, '')        // remove inline code
      .replace(/!?\[.*?\]\(.*?\)/g, '') // remove links/images
      .replace(/#{1,6}\s/g, '')        // remove headings
      .replace(/[*_~`>#\-|]/g, '')     // remove markdown symbols
      .replace(/\s+/g, '');            // remove whitespace
    return Math.max(1, Math.ceil(text.length / 500));
  }

  // English: count words
  const text = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!?\[.*?\]\(.*?\)/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_~`>#\-|]/g, '');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * 관련 글 찾기. 명시적으로 큐레이션된 관계가 먼저 오고, 남은 칸만
 * 시리즈·태그 유사도 기반 추천으로 채운다.
 */
export function getRelatedPosts(
  currentPost: BlogPost,
  allPosts: BlogPost[],
  maxPosts: number = 3,
  curatedPosts: readonly { post: BlogPost; reason: string }[] = [],
): RelatedPost[] {
  const selected = curatedPosts.slice(0, maxPosts).map(({ post, reason }) => ({ post, reason, source: 'curated' as const }));
  if (selected.length >= maxPosts) return selected;

  const selectedIds = new Set([currentPost.id, ...selected.map(({ post }) => post.id)]);
  const candidates = allPosts.filter((p) => !selectedIds.has(p.id));
  const currentTags = new Set(currentPost.data.tags.map((t) => t.toLowerCase()));

  const scored = candidates.map((post) => {
    const sameSeries = !!currentPost.data.series && post.data.series === currentPost.data.series;
    const sharedTags = post.data.tags.filter((tag) => currentTags.has(tag.toLowerCase())).length;
    const sameType = post.data.type === currentPost.data.type;
    return {
      post,
      sameSeries,
      sharedTags,
      score: (sameSeries ? 10 : 0) + sharedTags * 3 + (sameType ? 1 : 0),
    };
  });

  const remaining = maxPosts - selected.length;

  /**
   * Within a series, "related" means what to read next — not what was written
   * most recently. Ranking by date sent every reader to the end of the book:
   * chapter 1 of the PCIe series recommended chapters 19, 18 and 17, because
   * every sibling scores the same and the newest chapter won the tiebreak.
   * Ordering by distance in reading order, with later chapters ahead of
   * earlier ones, makes chapter 1 point at chapter 2.
   */
  const readingDistance = (post: BlogPost) => {
    const here = currentPost.data.seriesOrder ?? 0;
    const there = post.data.seriesOrder ?? 0;
    // Earlier chapters are still useful, just after everything still ahead.
    return there > here ? there - here : here - there + 1_000;
  };

  const sameSeries = scored
    .filter((s) => s.sameSeries)
    .sort((a, b) => readingDistance(a.post) - readingDistance(b.post));

  /**
   * One slot is held for a post outside the current series, because the block
   * sits directly under the full chapter list — three same-series cards there
   * repeat what the reader can already see and offer no way out of the series.
   * Shared tags are required: `type` matches almost everything, so allowing a
   * type-only match would fill the slot with an unrelated post.
   */
  const crossSeries = scored
    .filter((s) => !s.sameSeries && s.sharedTags > 0)
    .sort((a, b) => b.score - a.score || b.post.data.date.valueOf() - a.post.data.date.valueOf());

  const picks: typeof scored = [];
  const crossQuota = sameSeries.length && crossSeries.length ? 1 : 0;
  picks.push(...sameSeries.slice(0, Math.max(0, remaining - crossQuota)));
  picks.push(...crossSeries.slice(0, remaining - picks.length));
  // Whichever list ran short, the other one finishes the row.
  if (picks.length < remaining) {
    const taken = new Set(picks.map(({ post }) => post.id));
    picks.push(
      ...scored
        .filter((s) => s.score > 0 && !taken.has(s.post.id))
        .sort((a, b) => b.score - a.score || b.post.data.date.valueOf() - a.post.data.date.valueOf())
        .slice(0, remaining - picks.length),
    );
  }

  const fallback = picks.map(({ post, sameSeries: isSibling }) => ({
    post,
    reason: isSibling ? '같은 시리즈에서 이어 읽기' : '공통 태그 기반 추천',
    source: 'inferred' as const,
  }));

  return [...selected, ...fallback];
}

/**
 * 백링크 조회
 * 전체 본문 스캔 인덱스를 1회만 만들고 재사용한다.
 */
export function getBacklinks(currentId: string, posts: BlogPost[]): BlogPost[] {
  let index = backlinkIndexCache.get(posts);
  if (!index) {
    index = buildBacklinkIndex(posts);
    backlinkIndexCache.set(posts, index);
  }
  return index.get(currentId) ?? [];
}

function buildBacklinkIndex(posts: BlogPost[]): Map<string, BlogPost[]> {
  const index = new Map<string, BlogPost[]>();
  const blogLinkPattern = /\/blog\/([^\s)"'#<]+)/g;

  for (const post of posts) {
    const body = post.body ?? '';
    const seen = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = blogLinkPattern.exec(body)) !== null) {
      const rawSlug = match[1]?.replace(/\/$/, '');
      if (!rawSlug || rawSlug === post.id || seen.has(rawSlug)) continue;
      seen.add(rawSlug);
      const bucket = index.get(rawSlug);
      if (bucket) bucket.push(post);
      else index.set(rawSlug, [post]);
    }
  }

  for (const [, refs] of index) {
    refs.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  }

  return index;
}
