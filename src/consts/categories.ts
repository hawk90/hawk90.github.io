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
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}
