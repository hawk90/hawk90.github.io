import type { APIContext } from 'astro';
import { getPublishedPosts } from '../lib/posts';

function compactText(text: string, maxLength: number): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export async function GET(_context: APIContext) {
  const posts = await getPublishedPosts();

  const searchIndex = posts.map((post) => ({
    title: post.data.title,
    description: compactText(post.data.description || '', 160),
    slug: post.id,
    tags: post.data.tags.slice(0, 5),
    date: post.data.date.valueOf(),
    series: post.data.series || null,
  }));

  return new Response(JSON.stringify(searchIndex), {
    headers: { 'Content-Type': 'application/json' },
  });
}
