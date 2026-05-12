export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  parent?: string;
}

export const CATEGORIES: Category[] = [
  // Top-level categories
  {
    id: 'programming',
    name: 'Programming',
    description: '프로그래밍 — C/C++, 디자인, 알고리즘, 소프트웨어 공학',
    icon: '💻',
  },
  {
    id: 'systems',
    name: 'Systems',
    description: 'OS / 커널 / 시스템 프로그래밍',
    icon: '⚙️',
  },
  {
    id: 'embedded',
    name: 'Embedded',
    description: '임베디드 — RTOS, MCU, 성능, 트러블슈팅',
    icon: '🔧',
  },
  {
    id: 'parallel',
    name: 'Parallel & Concurrency',
    description: '병렬 / 동시성 — 원리, 패턴, 성능',
    icon: '⚡',
  },
  {
    id: 'math',
    name: 'Mathematics',
    description: '수학 — 선형대수, 집합론, 문제 해결',
    icon: '📐',
  },
  {
    id: 'writing',
    name: 'Writing',
    description: '글쓰기 — 영문 / 한국어 / 학술',
    icon: '✍️',
  },
  {
    id: 'thinking',
    name: 'Thinking',
    description: '비판적 사고 / 디자인 / 철학',
    icon: '🧠',
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: '코드 리뷰 / 오픈소스 코드 읽기',
    icon: '👀',
  },

  // Sub-categories of programming
  {
    id: 'programming/cpp',
    parent: 'programming',
    name: 'C / C++',
    description: 'C / C++ 언어 — Effective / Modern / Software Design',
    icon: '🔠',
  },
  {
    id: 'programming/design',
    parent: 'programming',
    name: 'Design & Patterns',
    description: '디자인 패턴 / 아키텍처 / 리팩토링',
    icon: '🧩',
  },
  {
    id: 'programming/algorithms',
    parent: 'programming',
    name: 'Algorithms',
    description: '자료구조 / 알고리즘',
    icon: '🔢',
  },
  {
    id: 'programming/engineering',
    parent: 'programming',
    name: 'Software Engineering',
    description: '소프트웨어 공학 — 클래식 / 실무 / 문화',
    icon: '🏗️',
  },
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}

export function getTopLevelCategories(): Category[] {
  return CATEGORIES.filter((cat) => !cat.parent);
}

export function getSubCategories(parentId: string): Category[] {
  return CATEGORIES.filter((cat) => cat.parent === parentId);
}
