import type { CollectionEntry } from 'astro:content';

/** The content kinds currently supported by the blog collection. */
export type ContentType = 'article' | 'book-review' | 'presentation';

/** Publication state is intentionally separate from discoverability policy. */
export type ContentStatus = 'draft' | 'published';

/**
 * A future-facing topic definition. Phase 1 only defines the contract; the
 * registry itself is introduced in PH-ARC-05.
 */
export interface TopicDefinition {
  id: string;
  label: string;
  categoryIds: readonly string[];
  description?: string;
  icon?: string;
  parentId?: string;
}

export interface PublicationDecision {
  render: boolean;
  index: boolean;
  search: boolean;
  sitemap: boolean;
  rss: boolean;
  featured: boolean;
  adEligible: boolean;
}

/**
 * Canonical representation of one Astro blog entry.
 *
 * `source` is retained during the migration so existing renderers can keep
 * using Astro's collection API while new consumers depend on stable fields.
 */
export interface ContentDocument {
  id: string;
  url: string;
  contentType: ContentType;
  status: ContentStatus;
  title: string;
  description?: string;
  publishedAt: Date;
  updatedAt?: Date;
  topics: readonly string[];
  categories: readonly string[];
  tags: readonly string[];
  series?: string;
  isFeatured: boolean;
  noIndex: boolean;
  source: CollectionEntry<'blog'>;
}

export interface ContentManifest {
  documents: readonly ContentDocument[];
  byId: ReadonlyMap<string, ContentDocument>;
  byUrl: ReadonlyMap<string, ContentDocument>;
}
