import { CATEGORIES } from '../../consts/categories';
import type { TopicDefinition } from './types';

/**
 * Domain-facing taxonomy registry. `consts/categories` remains the raw source
 * during the compatibility migration; all new content-domain code uses this
 * registry rather than repeating category lookups.
 */
const topics: readonly TopicDefinition[] = CATEGORIES.map((category) => ({
  id: category.id,
  label: category.name,
  description: category.description,
  icon: category.icon,
  parentId: category.parent,
  categoryIds: [category.id],
}));

const byId = new Map(topics.map((topic) => [topic.id, topic]));

export const TOPIC_REGISTRY = {
  topics,
  byId,
} as const;

export function getTopicDefinition(id: string): TopicDefinition | undefined {
  return TOPIC_REGISTRY.byId.get(id);
}

export function getTopLevelTopics(): readonly TopicDefinition[] {
  return TOPIC_REGISTRY.topics.filter((topic) => !topic.parentId);
}
