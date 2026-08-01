import { getCollection } from 'astro:content';
import { normalizeBlogEntry } from './normalize';
import type { ContentDocument, ContentManifest } from './types';

function addUnique(
  index: Map<string, ContentDocument>,
  key: string,
  document: ContentDocument,
  kind: 'ID' | 'URL',
): void {
  const existing = index.get(key);
  if (existing) {
    throw new Error(`Duplicate content ${kind} "${key}" for "${existing.id}" and "${document.id}".`);
  }
  index.set(key, document);
}

/** Creates a deterministic content manifest and rejects ambiguous routing. */
export function createContentManifest(documents: readonly ContentDocument[]): ContentManifest {
  const byId = new Map<string, ContentDocument>();
  const byUrl = new Map<string, ContentDocument>();

  for (const document of documents) {
    if (!document.id || !document.url) {
      throw new Error('Content documents require non-empty IDs and URLs.');
    }
    addUnique(byId, document.id, document, 'ID');
    addUnique(byUrl, document.url, document, 'URL');
  }

  return {
    documents: Object.freeze([...documents]),
    byId,
    byUrl,
  };
}

let blogManifestPromise: Promise<ContentManifest> | undefined;

/** Loads every blog entry once; publication filtering belongs to the policy. */
export function getBlogContentManifest(): Promise<ContentManifest> {
  blogManifestPromise ??= getCollection('blog').then((entries) =>
    createContentManifest(entries.map(normalizeBlogEntry)),
  );
  return blogManifestPromise;
}
