import { escapeHtml } from './utils';
import { expandSearchTerms, normalizeSearchText } from './search-aliases';

export interface SearchItem {
  title: string;
  description: string;
  slug: string;
  tags: string[];
  date: number;
  series: string | null;
  /** Position within the series, when the post belongs to one. */
  order?: number | null;
}

interface ScoredItem {
  item: SearchItem;
  score: number;
}

// 스코어 가중치
const SCORE_WEIGHTS = {
  titleExact: 100,    // 제목 정확 일치
  titleStart: 50,     // 제목 시작 일치
  titleContains: 30,  // 제목 포함
  descContains: 15,   // 설명 포함
  tagExact: 20,       // 태그 정확 일치
  tagContains: 10,    // 태그 포함
  seriesContains: 5,  // 시리즈 포함
};

function containsTerm(text: string, term: string): boolean {
  if (!/^[a-z0-9]+$/.test(term)) return text.includes(term);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(text);
}

function calculateScore(item: SearchItem, query: string): number {
  const terms = expandSearchTerms(query);
  const title = normalizeSearchText(item.title);
  const desc = normalizeSearchText(item.description);
  let score = 0;

  for (const term of terms) {
    let termScore = 0;
    if (title === term) termScore += SCORE_WEIGHTS.titleExact;
    else if (title.startsWith(term)) termScore += SCORE_WEIGHTS.titleStart;
    else if (containsTerm(title, term)) termScore += SCORE_WEIGHTS.titleContains;

    if (containsTerm(desc, term)) termScore += SCORE_WEIGHTS.descContains;

    for (const tag of item.tags) {
      const normalizedTag = normalizeSearchText(tag);
      if (normalizedTag === term) termScore += SCORE_WEIGHTS.tagExact;
      else if (containsTerm(normalizedTag, term)) termScore += SCORE_WEIGHTS.tagContains;
    }

    if (item.series && containsTerm(normalizeSearchText(item.series), term)) {
      termScore += SCORE_WEIGHTS.seriesContains;
    }
    // A synonym should find the document, but must not inflate relevance by
    // adding every spelling variant to the same result.
    score = Math.max(score, termScore);
  }

  return score;
}

export interface SearchOptions {
  query?: string;
  filterTag?: string;
  filterSeries?: string;
}

export function searchPosts(items: SearchItem[], options: SearchOptions | string): SearchItem[] {
  // 하위 호환: string이면 query로 처리
  const opts: SearchOptions = typeof options === 'string' ? { query: options } : options;
  const q = normalizeSearchText(opts.query || '');
  const filterTag = opts.filterTag && normalizeSearchText(opts.filterTag);
  const filterSeries = opts.filterSeries && normalizeSearchText(opts.filterSeries);

  // 필터만 있고 검색어 없는 경우
  if ((filterTag || filterSeries) && !q) {
    return items
      .filter((item) => {
        if (filterTag && !item.tags.some((tag) => normalizeSearchText(tag) === filterTag)) return false;
        if (filterSeries && (!item.series || normalizeSearchText(item.series) !== filterSeries)) return false;
        return true;
      })
      .sort((a, b) => b.date - a.date);
  }

  if (!q) return [];

  let candidates = items;

  // 필터가 있으면 먼저 필터링
  if (filterTag || filterSeries) {
    candidates = items.filter((item) => {
      if (filterTag && !item.tags.some((tag) => normalizeSearchText(tag) === filterTag)) return false;
      if (filterSeries && (!item.series || normalizeSearchText(item.series) !== filterSeries)) return false;
      return true;
    });
  }

  const scored: ScoredItem[] = candidates
    .map((item) => ({ item, score: calculateScore(item, q) }))
    .filter((s) => s.score > 0);

  // Score first. Equal scores are the normal case inside one series — every
  // chapter carries the same terms — and breaking that tie by date is reverse
  // reading order, which put chapter 12 above chapter 1 for a query like
  // "cxl". Reading order decides instead, and date only settles what is left.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const orderA = a.item.order ?? Number.POSITIVE_INFINITY;
    const orderB = b.item.order ?? Number.POSITIVE_INFINITY;
    if (orderA !== orderB) return orderA - orderB;
    return b.item.date - a.item.date;
  });

  return scored.map((s) => s.item);
}

export function highlightMatch(text: string, query: string): string {
  const q = query.trim();
  if (!q) return escapeHtml(text);

  const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');

  const parts = text.split(regex);
  const lowerQ = q.toLowerCase();
  return parts
    .map((part) =>
      part.toLowerCase() === lowerQ
        ? `<mark class="bg-[var(--color-accent-muted)] text-[var(--color-accent)] px-0.5 rounded">${escapeHtml(part)}</mark>`
        : escapeHtml(part)
    )
    .join('');
}
