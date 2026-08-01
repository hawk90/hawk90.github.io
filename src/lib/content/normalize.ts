import type { CollectionEntry } from 'astro:content';
import type { ContentDocument, ContentType } from './types';

function contentType(type: CollectionEntry<'blog'>['data']['type']): ContentType {
  return type === 'tech' ? 'article' : type;
}

function pathCategories(id: string): string[] {
  return id.split('/').slice(0, -1).filter(Boolean);
}

/** Converts a blog collection entry into the shared, URL-stable document model. */
export function normalizeBlogEntry(entry: CollectionEntry<'blog'>): ContentDocument {
  const categories = [...new Set([...(entry.data.categories ?? []), ...pathCategories(entry.id)])];

  return {
    id: entry.id,
    url: `/blog/${entry.id}`,
    contentType: contentType(entry.data.type),
    status: entry.data.draft ? 'draft' : 'published',
    title: entry.data.title,
    description: entry.data.description,
    publishedAt: entry.data.date,
    updatedAt: entry.data.updated,
    // Until PH-ARC-05 provides a canonical registry, tags are the existing
    // topic annotations and remain lossless rather than being reclassified.
    topics: entry.data.tags,
    categories,
    tags: entry.data.tags,
    series: entry.data.series,
    isFeatured: entry.data.featured,
    noIndex: entry.data.seo?.noindex === true,
    source: entry,
  };
}
