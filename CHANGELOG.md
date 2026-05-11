# Changelog

All notable changes to this theme are documented here.
The format roughly follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- `Newsletter` component with multi-provider support (Beehiiv, Substack,
  ConvertKit, Buttondown, custom POST endpoint).
- `define*()` typed helper functions for all theme config (`defineSite`,
  `defineBranding`, `defineNav`, `defineSocial`, `defineComments`,
  `defineAnalytics`, `defineNewsletter`, `defineAuthor`, `defineBlog`,
  `defineUi`). Identity at runtime, full type safety at edit time.
- README, LICENSE, CHANGELOG for marketplace listings.
- Deploy buttons for Vercel and Netlify.

## [1.0.0] — 2026-05-12

### Added
- Astro 6 + ClientRouter view transitions
- Series-aware blog with chapter folding
- 8 switchable code themes
- KaTeX math with mobile horizontal scroll
- TikZ → SVG diagram pipeline + watch mode
- Reading mode (true zen) with floating exit toggle
- Sticky article mini-header with series progress
- Per-series themed Open Graph image generator
- `:::note` / `:::tip` / `:::warning` / `:::danger` / `:::tldr` callouts
- Heading anchor links (rehype-autolink-headings)
- Drop-cap on the first paragraph of every article
- Image lightbox (`.prose img` → fullscreen)
- Back-to-top floating button
- Search modal with keyboard navigation (`/` to open)
- Author bio card at the end of every article
- Print-ready stylesheet
- Tag empty state
- Polished 404 page

### Fixed
- Theme icon FOUC and duplicate id
- Reading-mode FOUC
- Code-theme switching via `data-code-theme` propagation
- 16 TypeScript errors uncovered by `astro check`
- Broken internal link in EMC++ item42
- Missing aria-label on search filter clear-badge
- Duplicate progress bar under sticky title
