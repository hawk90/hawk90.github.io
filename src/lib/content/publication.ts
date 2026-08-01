import type { ContentDocument, PublicationDecision } from './types';

/**
 * The only place that translates document metadata into distribution rules.
 * Consumers should use the relevant decision field instead of duplicating
 * draft/noindex/featured checks.
 */
export function getPublicationDecision(document: ContentDocument): PublicationDecision {
  const render = document.status === 'published';
  const discoverable = render && !document.noIndex;

  return {
    render,
    index: discoverable,
    search: discoverable,
    sitemap: discoverable,
    rss: discoverable,
    featured: render && document.isFeatured,
    adEligible: discoverable,
  };
}
