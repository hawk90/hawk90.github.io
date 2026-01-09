export interface SearchItem {
  title: string;
  description: string;
  slug: string;
  tags: string[];
  date: string;
  series: string | null;
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

function calculateScore(item: SearchItem, query: string): number {
  const q = query.toLowerCase();
  const title = item.title.toLowerCase();
  const desc = item.description.toLowerCase();
  let score = 0;

  // 제목 매칭
  if (title === q) {
    score += SCORE_WEIGHTS.titleExact;
  } else if (title.startsWith(q)) {
    score += SCORE_WEIGHTS.titleStart;
  } else if (title.includes(q)) {
    score += SCORE_WEIGHTS.titleContains;
  }

  // 설명 매칭
  if (desc.includes(q)) {
    score += SCORE_WEIGHTS.descContains;
  }

  // 태그 매칭
  for (const tag of item.tags) {
    const t = tag.toLowerCase();
    if (t === q) {
      score += SCORE_WEIGHTS.tagExact;
    } else if (t.includes(q)) {
      score += SCORE_WEIGHTS.tagContains;
    }
  }

  // 시리즈 매칭
  if (item.series?.toLowerCase().includes(q)) {
    score += SCORE_WEIGHTS.seriesContains;
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
  const q = (opts.query || '').toLowerCase().trim();
  const filterTag = opts.filterTag?.toLowerCase();
  const filterSeries = opts.filterSeries?.toLowerCase();

  // 필터만 있고 검색어 없는 경우
  if ((filterTag || filterSeries) && !q) {
    return items
      .filter((item) => {
        if (filterTag && !item.tags.some((t) => t.toLowerCase() === filterTag)) return false;
        if (filterSeries && item.series?.toLowerCase() !== filterSeries) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf());
  }

  if (!q) return [];

  let candidates = items;

  // 필터가 있으면 먼저 필터링
  if (filterTag || filterSeries) {
    candidates = items.filter((item) => {
      if (filterTag && !item.tags.some((t) => t.toLowerCase() === filterTag)) return false;
      if (filterSeries && item.series?.toLowerCase() !== filterSeries) return false;
      return true;
    });
  }

  const scored: ScoredItem[] = candidates
    .map((item) => ({ item, score: calculateScore(item, q) }))
    .filter((s) => s.score > 0);

  // 스코어 내림차순, 같으면 최신순
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.item.date).valueOf() - new Date(a.item.date).valueOf();
  });

  return scored.map((s) => s.item);
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);

  const escapedText = escapeHtml(text);
  const escapedQuery = escapeHtml(query);
  const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

  return escapedText.replace(
    regex,
    '<mark class="bg-[var(--color-accent-muted)] text-[var(--color-accent)] px-0.5 rounded">$1</mark>'
  );
}
