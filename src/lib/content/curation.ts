import { getPublicationDecision } from './publication';
import type { ContentDocument, ContentManifest } from './types';

function newestFirst(documents: readonly ContentDocument[]): ContentDocument[] {
  return [...documents].sort((a, b) => b.publishedAt.valueOf() - a.publishedAt.valueOf());
}

function updatedFirst(documents: readonly ContentDocument[]): ContentDocument[] {
  return [...documents].sort(
    (a, b) => (b.updatedAt ?? b.publishedAt).valueOf() - (a.updatedAt ?? a.publishedAt).valueOf(),
  );
}

function renderable(documents: readonly ContentDocument[]): ContentDocument[] {
  return documents.filter((document) => getPublicationDecision(document).render);
}

export interface HomepageCuration {
  latest: readonly ContentDocument[];
  featured: readonly ContentDocument[];
}

/** Keeps homepage selection rules out of page components. */
export function getHomepageCuration(manifest: ContentManifest, limit = 6): HomepageCuration {
  const documents = renderable(manifest.documents);
  return {
    latest: newestFirst(documents).slice(0, limit),
    featured: newestFirst(documents.filter((document) => getPublicationDecision(document).featured)),
  };
}

export interface TopicHubQuery {
  topicId: string;
  documents: readonly ContentDocument[];
  startHere: readonly ContentDocument[];
  featured: readonly ContentDocument[];
  recentlyUpdated: readonly ContentDocument[];
}

/** Query contract for a future Topic Hub UI; it deliberately has no UI concern. */
export function getTopicHubQuery(
  manifest: ContentManifest,
  topicId: string,
  categoryIds: readonly string[] = [topicId],
  startHereIds: readonly string[] = [],
): TopicHubQuery {
  const documents = newestFirst(
    renderable(manifest.documents).filter((document) =>
      document.categories.some((category) =>
        categoryIds.some((topicCategory) => category === topicCategory || category.startsWith(`${topicCategory}/`)),
      ),
    ),
  );
  const featured = documents.filter((document) => getPublicationDecision(document).featured);
  const curatedStartHere: ContentDocument[] = [];
  for (const id of startHereIds) {
    const document = manifest.byId.get(id);
    if (document && documents.some((candidate) => candidate.id === document.id)) {
      curatedStartHere.push(document);
    }
  }

  return {
    topicId,
    documents,
    startHere: (curatedStartHere.length ? curatedStartHere : featured.length ? featured : documents).slice(0, 3),
    featured,
    recentlyUpdated: updatedFirst(documents).slice(0, 6),
  };
}
