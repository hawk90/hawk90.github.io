// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import remarkCallouts from './src/lib/remark-callouts.mjs';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// https://astro.build/config
export default defineConfig({
  site: 'https://hawk90.github.io',

  vite: {
    plugins: [tailwindcss()],
    build: { sourcemap: false },
  },

  integrations: [
    expressiveCode(),
    mdx(),
    sitemap(),
  ],

  markdown: {
    remarkPlugins: [
      remarkMath,
      remarkDirective,
      remarkCallouts,
    ],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'prepend',
          properties: {
            class: 'heading-anchor',
            ariaLabel: 'Link to section',
            tabIndex: -1,
          },
          content: { type: 'text', value: '#' },
        },
      ],
      rehypeKatex,
    ],
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },

  experimental: {
    clientPrerender: true,
  },

  output: 'static',
});
