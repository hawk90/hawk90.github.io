import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(_context: APIContext) {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  const searchIndex = posts.map((post) => ({
    title: post.data.title,
    description: post.data.description || '',
    slug: post.slug,
    tags: post.data.tags,
    date: post.data.date.toISOString(),
    series: post.data.series || null,
  }));

  return new Response(JSON.stringify(searchIndex), {
    headers: { 'Content-Type': 'application/json' },
  });
}
