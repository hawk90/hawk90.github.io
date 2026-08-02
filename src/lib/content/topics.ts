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

/** Reject taxonomy states that would make navigation ambiguous or unwalkable. */
export function assertTopicRegistryIntegrity(definitions: readonly TopicDefinition[]): void {
  const byId = new Map<string, TopicDefinition>();
  const issues: string[] = [];
  for (const topic of definitions) {
    if (!topic.id.trim()) issues.push('Topic ID must not be empty');
    if (!topic.label.trim()) issues.push(`${topic.id}: label must not be empty`);
    if (byId.has(topic.id)) issues.push(`Duplicate topic ID: ${topic.id}`);
    byId.set(topic.id, topic);
  }

  for (const topic of definitions) {
    if (topic.parentId && !byId.has(topic.parentId)) issues.push(`${topic.id}: unknown parent ${topic.parentId}`);
    if (topic.parentId === topic.id) issues.push(`${topic.id}: cannot be its own parent`);
  }

  for (const topic of definitions) {
    const seen = new Set<string>();
    let current: TopicDefinition | undefined = topic;
    while (current?.parentId) {
      if (seen.has(current.id)) {
        issues.push(`${topic.id}: parent hierarchy contains a cycle at ${current.id}`);
        break;
      }
      seen.add(current.id);
      current = byId.get(current.parentId);
    }
  }

  if (issues.length) throw new Error(`Topic registry integrity failed:\n- ${issues.join('\n- ')}`);
}

assertTopicRegistryIntegrity(topics);
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
