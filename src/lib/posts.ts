import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE_CONFIG } from '../consts/config';

export type BlogPost = CollectionEntry<'blog'>;

/**
 * 발행된 포스트를 날짜 내림차순으로 가져오기
 */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return sortByDate(posts);
}

/**
 * 포스트를 날짜 내림차순으로 정렬
 */
export function sortByDate(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/**
 * 태그별 포스트 수 계산 (카운트 내림차순)
 */
export function getTagsWithCount(posts: BlogPost[]): [string, number][] {
  const counts: Record<string, number> = {};
  posts.flatMap((p) => p.data.tags).forEach((tag) => {
    counts[tag] = (counts[tag] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/**
 * 모든 고유 태그 (알파벳순)
 */
export function getAllTags(posts: BlogPost[]): string[] {
  return [...new Set(posts.flatMap((p) => p.data.tags))].sort();
}

/**
 * 포스트에서 모든 고유 시리즈 추출
 */
export function getAllSeries(posts: BlogPost[]): string[] {
  return [...new Set(posts.filter((p) => p.data.series).map((p) => p.data.series!))];
}

/**
 * 카테고리별 포스트 필터링
 */
export function filterByCategory(posts: BlogPost[], categoryId: string): BlogPost[] {
  return posts.filter((p) => p.slug.startsWith(categoryId + '/'));
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
  const candidates = allPosts.filter((p) => p.slug !== currentPost.slug);

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
