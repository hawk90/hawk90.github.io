# Changelog

이 저장소의 변경 기록입니다. 형식은 [Keep a Changelog](https://keepachangelog.com/)를
대략 따릅니다.

## [Unreleased]

없음.

## 배포되지 않은 테마 작업 (1.0.0 이후, 역사 기록)

아래는 이 저장소를 블로그 테마로 배포하려던 시기에 만들어진 것들입니다. 테마 배포는
진행되지 않았고 저장소는 개인 블로그로 운영됩니다. 코드는 그대로 쓰이고 있으므로
지우지 않고, "출시 예정"이 아니라 "지나간 맥락"으로 남겨 둡니다.

- `Newsletter` 컴포넌트 — Beehiiv·Substack·ConvertKit·Buttondown·커스텀 POST 지원.
  현재 블로그에서도 그대로 씁니다.
- `define*()` 타입 헬퍼 (`defineSite`, `defineBranding`, `defineNav`, `defineSocial`,
  `defineComments`, `defineAnalytics`, `defineNewsletter`, `defineAuthor`,
  `defineBlog`, `defineUi`). 런타임 항등 함수, 편집 시 타입 안전. 계속 쓰입니다.
- 마켓플레이스 등재용 README·LICENSE·CHANGELOG. README는 운영자용으로 다시
  썼습니다. LICENSE는 손대지 않았습니다.
- Vercel·Netlify 배포 버튼. 실제 배포는 GitHub Pages이므로 README에서 내렸습니다.

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
