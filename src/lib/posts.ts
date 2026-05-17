import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE_CONFIG } from '../consts/config';
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

export interface HomepageLatestWriting {
  featuredLatestPosts: BlogPost[];
  heroPost: BlogPost | undefined;
  secondaryLatestPosts: BlogPost[];
}

/**
 * 발행된 포스트를 날짜 내림차순으로 가져오기
 */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  if (!publishedPostsPromise) {
    publishedPostsPromise = getCollection('blog', ({ data }) => !data.draft).then(sortByDate);
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
 * 홈 최신 글 섹션용 데이터
 */
export function getHomepageLatestWriting(posts: BlogPost[]): HomepageLatestWriting {
  const featuredLatestPosts = getLatestPosts(posts, 6);
  const heroPost = featuredLatestPosts[0];
  return {
    featuredLatestPosts,
    heroPost,
    secondaryLatestPosts: featuredLatestPosts.slice(heroPost ? 1 : 0, 5),
  };
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
 * 포스트에서 모든 고유 시리즈 추출 (알파벳순)
 */
export function getAllSeries(posts: BlogPost[]): string[] {
  return [...new Set(posts.filter((p) => p.data.series).map((p) => p.data.series!))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/**
 * 카테고리별 포스트 필터링
 */
export function filterByCategory(posts: BlogPost[], categoryId: string): BlogPost[] {
  return posts.filter((p) => p.id.startsWith(categoryId + '/'));
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
 * 관련 글 찾기 (태그 유사도 기반, 같은 시리즈 우선)
 */
export function getRelatedPosts(
  currentPost: BlogPost,
  allPosts: BlogPost[],
  maxPosts: number = 3,
): BlogPost[] {
  const candidates = allPosts.filter((p) => p.id !== currentPost.id);

  const scored = candidates.map((post) => {
    let score = 0;

    // Same series gets highest priority
    if (currentPost.data.series && post.data.series === currentPost.data.series) {
      score += 10;
    }

    // Tag overlap
    const currentTags = new Set(currentPost.data.tags.map((t) => t.toLowerCase()));
    for (const tag of post.data.tags) {
      if (currentTags.has(tag.toLowerCase())) {
        score += 3;
      }
    }

    // Same type
    if (post.data.type === currentPost.data.type) {
      score += 1;
    }

    return { post, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.post.data.date.valueOf() - a.post.data.date.valueOf())
    .slice(0, maxPosts)
    .map((s) => s.post);
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
