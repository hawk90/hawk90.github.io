export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  {
    id: 'programming',
    name: 'Programming',
    description: '프로그래밍 관련 기술 글',
    icon: '💻',
  },
  {
    id: 'embedded',
    name: 'Embedded Systems',
    description: '임베디드 시스템 — RTOS, 성능, C++, 트러블슈팅',
    icon: '🔧',
  },
  {
    id: 'math',
    name: 'Mathematics',
    description: '수학 학습 노트 — 선형대수, 집합론',
    icon: '📐',
  },
  {
    id: 'parallel',
    name: 'Parallel Programming',
    description: '병렬 프로그래밍 원리 / 패턴 / 성능',
    icon: '⚡',
  },
  {
    id: 'writing',
    name: 'Writing',
    description: '글쓰기 — 영문 / 한국어 / 학술 / 논리',
    icon: '✍️',
  },
  {
    id: 'books',
    name: 'Books',
    description: '서평 / 도서 리뷰',
    icon: '📚',
  },
  {
    id: 'presentations',
    name: 'Presentations',
    description: '발표 자료 / Slidev / 슬라이드',
    icon: '🎤',
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: '코드 리뷰 원칙 / 도구 / 문화 / 패턴',
    icon: '👀',
  },
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}
