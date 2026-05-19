// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import remarkCallouts from './src/lib/remark-callouts.mjs';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeImageLazy from './src/lib/rehype-image-lazy.mjs';

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
    // Limit shiki language bundle — ~44k code blocks across blog, default
    // loads ~200 langs which pushes heap. Only load what's actually used.
    expressiveCode({
      shiki: {
        langs: [
          'cpp', 'c', 'text', 'bash', 'python', 'javascript', 'typescript',
          'java', 'eiffel', 'cmake', 'makefile', 'asm', 'csharp', 'vim',
          'yaml', 'json', 'rust', 'go', 'sql', 'html', 'css', 'verilog',
          'dts', 'tcl', 'cuda', 'glsl',
        ],
      },
      themes: ['github-dark', 'github-light'],
    }),
    // mdx() integration dropped — repo has 0 .mdx files; pure .md only.
    // Removing saves parser load + memory during build.
    sitemap({
      // Exclude admin pages from sitemap (they're not public).
      filter: (page) => !page.includes('/admin'),
    }),
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
      rehypeImageLazy,
    ],
  },

  prefetch: {
    // Avoid eagerly wiring every link for prefetch on content-heavy pages.
    // Hover prefetch keeps navigation snappy without adding as much overhead
    // during initial render and scroll.
    prefetchAll: false,
    defaultStrategy: 'hover',
  },

  // ─── Output Mode ─────────────────────────────────────────────
  // 'static': GitHub Pages compatible (PAT login only)
  // 'hybrid': Vercel/Netlify compatible (OAuth + PAT login)
  //
  // For OAuth support, change to 'hybrid' and add adapter:
  // adapter: vercel(), // or netlify()
  // ─────────────────────────────────────────────────────────────
  output: 'static',
  compressHTML: true,

  // Trim whitespace and merge similar nodes when emitting HTML.
  // Astro 5/6 default — explicitly set to confirm.
  build: {
    inlineStylesheets: 'auto',
  },
});
