import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';
import { SITE_CONFIG } from './consts/config';

const blogCollection = defineCollection({
  // Modern content layer (Astro 5+, required in Astro 6).
  // Replaces the deprecated `type: 'content'` option.
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/blog',
  }),
  schema: z.object({
    // Required
    title: z.string(),
    date: z.coerce.date(),

    // Optional metadata
    description: z.string().optional(),
    author: z.string().default(SITE_CONFIG.author),

    // Classification
    /** Canonical topic IDs from src/lib/content/topics.ts. Prefer this over path inference. */
    // Canonical topic IDs are required; URLs and folders are not taxonomy.
    topics: z.array(z.string()).min(1),
    tags: z.array(z.string()).default([]),
    type: z.enum(['tech', 'book-review', 'presentation']).default('tech'),

    // Series (for multi-part articles like Effective Modern C++)
    series: z.string().optional(),
    seriesOrder: z.number().optional(),

    // Book review specific
    bookTitle: z.string().optional(),
    bookAuthor: z.string().optional(),
    bookCover: z.string().optional(),
    rating: z.number().min(1).max(5).optional(),

    // Presentation specific
    slidevUrl: z.url().optional(),
    pdfUrl: z.string().optional(),

    // Meta
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    image: z.string().optional(),

    // Per-post SEO overrides (all optional — sensible defaults otherwise)
    seo: z.object({
      /** Custom <title> override (defaults to the post title) */
      title: z.string().optional(),
      /** Override the OG image URL (defaults to the auto-generated /og/<slug>.png) */
      ogImage: z.string().optional(),
      /** Canonical URL — use if the post is also published elsewhere */
      canonical: z.url().optional(),
      /** Tell crawlers to skip indexing this post */
      noindex: z.boolean().optional(),
      /** Tell crawlers not to follow outbound links */
      nofollow: z.boolean().optional(),
    }).optional(),

    /** When the post was last updated — shown in article header if set */
    updated: z.coerce.date().optional(),

    // Editorial lifecycle is deliberately separate from publication. These
    // fields support review queues without making unreviewed content vanish.
    lastVerified: z.coerce.date().optional(),
    reviewStatus: z.enum(['current', 'needs-review', 'archived']).default('needs-review'),
    evidenceStatus: z.enum(['primary', 'documented', 'experience', 'mixed']).optional(),

    // Legacy (for Jekyll migration)
    categories: z.array(z.string()).optional(),
  }),
});

export const collections = {
  blog: blogCollection,
};
