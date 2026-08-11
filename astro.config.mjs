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
          'java', 'cmake', 'makefile', 'asm', 'csharp', 'vim',
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
          // Shiki does not ship grammars for these legacy/domain-specific
          // fence labels; preserve their source while making the text
          // fallback explicit and warning-free.
          eiffel: 'text',
          fortran: 'text',
          gdb: 'text',
          systemverilog: 'text',
          promela: 'text',
          thrift: 'text',
          nasm: 'text',
          scl: 'text',
          tla: 'text',
          kconfig: 'text',
          conf: 'text',
          cocci: 'text',
          meson: 'text',
          simula: 'text',
        },
      },
      themes: ['github-dark', 'github-light'],
    }),
    // mdx() integration dropped — repo has 0 .mdx files; pure .md only.
    // Removing saves parser load + memory during build.
    sitemap({
    // Admin pages are not public. Author archives are noindex while there is a
    // single author, because they re-list exactly what /blog already lists;
    // keep the sitemap and the robots directive saying the same thing.
    filter: (page) => !page.includes('/admin') && !page.includes('/authors/'),
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
        // Technical notes intentionally use Korean labels and arrows inside
        // `\\text{}`. Keep rendering strict enough for parse errors while
        // suppressing KaTeX's noisy Unicode strict-mode warnings; the
        // `audit:math-unicode` report remains the review surface.
        [rehypeKatex, { strict: false }],
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
