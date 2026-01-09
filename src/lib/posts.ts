import { getCollection, type CollectionEntry } from 'astro:content';

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
