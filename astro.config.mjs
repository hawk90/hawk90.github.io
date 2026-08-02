// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
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

// This site is intentionally static and PAT-only. OAuth needs a separately
// deployed server boundary; do not add OAuth callback routes to this project.

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
        langs: /** @type {any} */ ([
          'cpp', 'c', 'text', 'bash', 'python', 'javascript', 'typescript',
          'java', 'eiffel', 'cmake', 'makefile', 'asm', 'csharp', 'vim',
          'yaml', 'json', 'rust', 'go', 'sql', 'html', 'css', 'verilog',
          'tcl', 'glsl',
        ]),
        // Shiki has no grammars for these fence labels. Map each to the
        // closest supported grammar instead of silently rendering as text.
        langAlias: {
          dts: 'c',
          bitbake: 'makefile',
          cuda: 'cpp',
          ld: 'text',
        },
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
    processor: unified({
      remarkPlugins: [remarkMath, remarkDirective, remarkCallouts],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, {
          behavior: 'prepend',
          properties: { class: 'heading-anchor', ariaLabel: 'Link to section', tabIndex: -1 },
          content: { type: 'text', value: '#' },
        }],
        rehypeKatex,
        rehypeImageLazy,
      ],
    }),
  },

  prefetch: {
    // Avoid eagerly wiring every link for prefetch on content-heavy pages.
    // Hover prefetch keeps navigation snappy without adding as much overhead
    // during initial render and scroll.
    prefetchAll: false,
    defaultStrategy: 'hover',
  },

  // ─── Output Mode ─────────────────────────────────────────────
  // GitHub Pages deployment: no server routes or OAuth callbacks.
  output: 'static',
  compressHTML: true,

  // Trim whitespace and merge similar nodes when emitting HTML.
  // Astro 5/6 default — explicitly set to confirm.
  build: {
    inlineStylesheets: 'auto',
  },
});
