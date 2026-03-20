import { defineCollection, z } from 'astro:content';
import { SITE_CONFIG } from '../consts/config';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // Required
    title: z.string(),
    date: z.coerce.date(),

    // Optional metadata
    description: z.string().optional(),
    author: z.string().default(SITE_CONFIG.author),

    // Classification
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
    slidevUrl: z.string().url().optional(),
    pdfUrl: z.string().optional(),

    // Meta
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    image: z.string().optional(),

    // Legacy (for Jekyll migration)
    categories: z.array(z.string()).optional(),
  }),
});

export const collections = {
  blog: blogCollection,
};
