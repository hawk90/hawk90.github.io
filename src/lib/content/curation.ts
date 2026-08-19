import { getPublicationDecision } from './publication';
import { HOMEPAGE_GUIDE_IDS } from '../../consts/homepage-guides';
import type { ContentDocument, ContentManifest } from './types';

function newestFirst(documents: readonly ContentDocument[]): ContentDocument[] {
  return [...documents].sort((a, b) => b.publishedAt.valueOf() - a.publishedAt.valueOf());
}

function renderable(documents: readonly ContentDocument[]): ContentDocument[] {
  return documents.filter((document) => getPublicationDecision(document).render);
}

export interface HomepageCuration {
  latest: readonly ContentDocument[];
  featured: readonly ContentDocument[];
  guides: readonly ContentDocument[];
}

/**
 * A curated id that no longer resolves is a silently empty homepage section,
 * so it fails the build instead. This replaces the same guarantee that
 * `assertTopicHubIntegrity` used to give the hub's start-here list.
 */
function assertHomepageGuidesExist(manifest: ContentManifest): void {
  const missing = HOMEPAGE_GUIDE_IDS.filter((id) => {
    const document = manifest.byId.get(id);
    return !document || !getPublicationDecision(document).render;
  });
  if (missing.length) {
    throw new Error(`Homepage guide ids are missing or unpublished: ${missing.join(', ')}`);
  }
}

/** Keeps homepage selection rules out of page components and favors learning entry points over chronology. */
export function getHomepageCuration(manifest: ContentManifest, limit = 6): HomepageCuration {
  const documents = renderable(manifest.documents);
  assertHomepageGuidesExist(manifest);
  const guides = HOMEPAGE_GUIDE_IDS
    .map((id) => manifest.byId.get(id))
    .filter((document): document is ContentDocument => !!document)
    .slice(0, 3);
  return {
    latest: newestFirst(documents).slice(0, limit),
    featured: newestFirst(documents.filter((document) => getPublicationDecision(document).featured)),
    guides,
  };
}
