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
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}
