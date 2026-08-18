import type { CollectionEntry } from 'astro:content';
import { TOPIC_REGISTRY } from './topics';
import { getPostUrl } from '../utils';
import type { ContentDocument, ContentType } from './types';

function contentType(type: CollectionEntry<'blog'>['data']['type']): ContentType {
  return type === 'tech' ? 'article' : type;
}

function pathCategories(id: string): string[] {
  const parts = id.split('/').slice(0, -1).filter(Boolean);
  return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
}

export function classifyTopicIds(id: string, explicitTopics: readonly string[]) {
  if (!explicitTopics.length) throw new Error(`${id}: explicit canonical topic ID(s) are required.`);
  const topicIds = explicitTopics;
  const classificationSource = 'explicit' as const;
  const unknownTopics = topicIds.filter((topic) => !TOPIC_REGISTRY.byId.has(topic));
  if (unknownTopics.length) throw new Error(`${id}: unknown canonical topic ID(s): ${unknownTopics.join(', ')}`);
  return { topicIds, classificationSource } as const;
}

/** Converts a blog collection entry into the shared, URL-stable document model. */
export function normalizeBlogEntry(entry: CollectionEntry<'blog'>): ContentDocument {
  const categories = [...new Set([...(entry.data.categories ?? []), ...pathCategories(entry.id)])];
  const { topicIds, classificationSource } = classifyTopicIds(entry.id, entry.data.topics);

  return {
    id: entry.id,
    url: getPostUrl(entry),
    contentType: contentType(entry.data.type),
    status: entry.data.draft ? 'draft' : 'published',
    title: entry.data.title,
    description: entry.data.description,
    publishedAt: entry.data.date,
    updatedAt: entry.data.updated,
    lastVerifiedAt: entry.data.lastVerified,
    reviewStatus: entry.data.reviewStatus,
    evidenceStatus: entry.data.evidenceStatus,
    topicIds,
    classificationSource,
    categories,
    tags: entry.data.tags,
    series: entry.data.series,
    isFeatured: entry.data.featured,
    noIndex: entry.data.seo?.noindex === true,
    source: entry,
  };
}
