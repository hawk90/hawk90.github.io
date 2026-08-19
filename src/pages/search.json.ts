import type { APIContext } from 'astro';
import { getBlogContentManifest, getPublicationDecision } from '../lib/content';

function compactText(text: string, maxLength: number): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export async function GET(_context: APIContext) {
  const manifest = await getBlogContentManifest();

  const searchIndex = manifest.documents
    .filter((document) => getPublicationDecision(document).search)
    .map((document) => ({
    title: document.title,
    description: compactText(document.description || '', 160),
    slug: document.id,
    tags: document.tags.slice(0, 5),
    date: document.publishedAt.valueOf(),
    series: document.series || null,
    // Reading order, so a result set inside one series can be ranked by where
    // a chapter sits rather than by when it happened to be written.
    order: document.seriesOrder ?? null,
  }));

  return new Response(JSON.stringify(searchIndex), {
    headers: { 'Content-Type': 'application/json' },
  });
}
