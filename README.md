# Hawk Blog Theme

A premium Astro blog theme focused on long-form technical writing — series, math, code blocks, diagrams, and reading-first design.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhawk90%2Fhawk90.github.io)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/hawk90/hawk90.github.io)

## Highlights

- **Series-aware** — chaptered tables of contents, prev/next navigation, sticky title with progress
- **Multi-theme code blocks** — 8 themes (GitHub, Dracula, Tokyo Night, …) switchable at runtime
- **First-class math** — KaTeX with horizontal-scroll fallback on mobile
- **Diagrams as code** — TikZ → SVG pipeline (`npm run diagrams:watch`)
- **Real zen reading mode** — hides every chrome element, bumps typography
- **View transitions** — SPA-style navigation with title morphs
- **Auto OG images** — per-series themed Open Graph cards
- **Search** — full-text JSON index + keyboard navigation modal (`/` to open)
- **Print-ready** — paper-friendly stylesheet with proper page breaks
- **A11y baked in** — skip link, focus rings, `prefers-reduced-motion`, semantic HTML

## Quick start

```bash
# Requires Node ≥ 22.12  (an .nvmrc / engines field is shipped)
git clone https://github.com/hawk90/hawk90.github.io.git my-blog
cd my-blog
npm install
npm run dev          # open http://localhost:4321
```

## Configure

Almost everything is in **one file**:

```ts
// src/consts/config.ts
import { defineSite, defineBranding, defineNewsletter /* … */ } from '../lib/define';

export const SITE_CONFIG = defineSite({
  title: 'My Blog',
  description: 'Posts about X',
  author: 'Me',
  url: 'https://example.com',
  locale: 'en-US',
  lang: 'en',
});
```

Every `define*` helper is the identity function at runtime but gives you typed
autocomplete in your editor and a clear contract.

| What | Where | Helper |
|---|---|---|
| Site title / lang / url | `src/consts/config.ts` | `defineSite` |
| Brand + tagline | `src/consts/config.ts` | `defineBranding` |
| Header navigation | `src/consts/config.ts` | `defineNav` |
| Social icons | `src/consts/config.ts` | `defineSocial` |
| Comments (Giscus) | `src/consts/config.ts` | `defineComments` |
| Analytics | `src/consts/config.ts` | `defineAnalytics` |
| Newsletter | `src/consts/config.ts` | `defineNewsletter` |
| About page data | `src/consts/about.ts` | `ABOUT_DATA` |
| Resume page data | `src/consts/resume.ts` | `resume` |

## Writing a post

```md
---
title: "Hello world"
date: 2026-05-12T10:00:00
description: "My first post"
tags: [intro]
series: "Getting Started"
seriesOrder: 1
---

# Hello

Plain markdown, with a few extras:

:::tip[Pro tip]
Use ::: blocks for callouts.
:::

Math: $E = mc^2$ inline, or display:

$$ \int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2} $$

Diagrams come from `.tex` files committed alongside the post — see
`scripts/README.md`.
```

Drop `.md` files anywhere under `src/content/blog/`. Folder structure becomes URL structure.

## Newsletter integration

Edit `NEWSLETTER_CONFIG` in `src/consts/config.ts`:

```ts
export const NEWSLETTER_CONFIG = defineNewsletter({
  enabled: true,
  provider: 'beehiiv',           // 'substack' | 'convertkit' | 'buttondown' | 'custom'
  publication: 'your-pub-id',
  title: 'Get new posts in your inbox',
  description: 'No spam. Unsubscribe anytime.',
  buttonText: 'Subscribe',
});
```

Then drop `<Newsletter />` anywhere on a page — or import inside an article's
MDX. The component reads config and renders the right embed.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Astro dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run check` | Type + content check (`@astrojs/check`) |
| `npm run diagrams` | Build all TikZ diagrams (`.tex` → `.svg`) |
| `npm run diagrams:watch` | Auto-rebuild diagrams on save |

## Tech stack

- **[Astro 6](https://astro.build)** with `ClientRouter` for SPA navigation
- **[Tailwind v4](https://tailwindcss.com)** via the Vite plugin
- **[Expressive Code](https://expressive-code.com)** for syntax highlighting
- **[KaTeX](https://katex.org)** for math
- **[Giscus](https://giscus.app)** for comments
- **[Satori](https://github.com/vercel/satori) + Resvg** for OG image generation
- **[Pretendard](https://github.com/orioncactus/pretendard)** as the default Korean/English sans

## License

Commercial use permitted. See [LICENSE](./LICENSE) for the exact terms.

## Support

- Open an issue on GitHub for bugs
- Read the inline JSDoc in `src/lib/define.ts` for the full config surface
