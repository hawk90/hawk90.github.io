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

// ─── OAuth Support (Optional) ───────────────────────────────
// To enable GitHub OAuth login (instead of PAT only):
// 1. Install adapter: npm install @astrojs/vercel (or @astrojs/netlify)
// 2. Uncomment the adapter import and add to integrations
// 3. Change output to 'hybrid'
// 4. Set GITHUB_CLIENT_SECRET in your environment variables
//
// import vercel from '@astrojs/vercel';
// ─────────────────────────────────────────────────────────────

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

  // ─── Output Mode ─────────────────────────────────────────────
  // 'static': GitHub Pages compatible (PAT login only)
  // 'hybrid': Vercel/Netlify compatible (OAuth + PAT login)
  //
  // For OAuth support, change to 'hybrid' and add adapter:
  // adapter: vercel(), // or netlify()
  // ─────────────────────────────────────────────────────────────
  output: 'static',
});
