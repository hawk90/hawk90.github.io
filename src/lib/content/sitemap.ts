import type { SitemapItem } from '@astrojs/sitemap';
import { getPublicationDecision } from './publication';

/** Applies the domain publication policy to generated sitemap entries. */
export async function serializeSitemapItem(item: SitemapItem): Promise<SitemapItem | undefined> {
  // Astro config is evaluated before its `astro:content` virtual module exists.
  // Loading the manifest here runs inside the sitemap build hook instead.
  const { getBlogContentManifest } = await import('./manifest');
  const pathname = new URL(item.url).pathname.replace(/\/$/, '') || '/';
  const document = (await getBlogContentManifest()).byUrl.get(pathname);

  return document && !getPublicationDecision(document).sitemap ? undefined : item;
}
