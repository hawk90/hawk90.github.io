import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_CONFIG } from '../consts/config';
import { getBlogContentManifest, getPublicationDecision } from '../lib/content';

export async function GET(context: APIContext) {
  const manifest = await getBlogContentManifest();
  const documents = manifest.documents
    .filter((document) => getPublicationDecision(document).rss)
    .sort((a, b) => b.publishedAt.valueOf() - a.publishedAt.valueOf());

  return rss({
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    site: context.site!,
    items: documents.map((document) => ({
      title: document.title,
      pubDate: document.publishedAt,
      description: document.description,
      link: document.url,
      categories: [...document.tags],
    })),
    customData: `<language>${SITE_CONFIG.lang}</language>`,
  });
}
