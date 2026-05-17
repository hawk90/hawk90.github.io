import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_CONFIG } from '../consts/config';
import { getPublishedPosts } from '../lib/posts';

export async function GET(context: APIContext) {
  const sortedPosts = await getPublishedPosts();

  return rss({
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    site: context.site!,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/blog/${post.id}`,
      categories: post.data.tags,
    })),
    customData: `<language>${SITE_CONFIG.lang}</language>`,
  });
}
