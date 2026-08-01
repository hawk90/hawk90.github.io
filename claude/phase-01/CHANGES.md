# Changes

## PH-ARC-01 · Domain model

- Added `src/lib/content/types.ts` with `ContentDocument`, content type/status,
  topic contract, and publication decision contract.

## PH-ARC-02 · Astro entry normalizer

- Added the deterministic `normalizeBlogEntry()` adapter. It retains the Astro
  entry as `source` for compatibility while exposing stable ID and URL fields.

## PH-ARC-03 · Content manifest

- Added a cached blog manifest exposing `documents`, `byId`, and `byUrl`.
  Duplicate IDs or URLs now fail explicitly instead of selecting an entry by
  iteration order.
- Updated only `getPublishedPosts()` to prove the manifest path; its result,
  sorting, and public URLs are unchanged.

## PH-ARC-04 · Publication policy

- Added `getPublicationDecision()` as the central draft/noindex/featured rule.
  It declares render, index, search, sitemap, RSS, featured, and ad eligibility
  without migrating search, RSS, sitemap, or UI consumers in this batch.

## Rollback

- Revert the `src/lib/content/` directory and restore the previous
  `getCollection('blog', ({ data }) => !data.draft)` implementation in
  `src/lib/posts.ts`.

## PH-ARC-05 · Topic registry

- Added the domain-facing `TOPIC_REGISTRY`, with stable lookup and top-level
  queries. The existing category constants remain the compatibility source
  while domain consumers no longer repeat category lookup logic.

## PH-ARC-06 · Homepage curation

- Moved homepage selection to `getHomepageCuration()`. The homepage still
  renders the six newest published entries; no visual or URL behavior changed.

## PH-ARC-07 · Topic Hub query

- Added `getTopicHubQuery()` with automatic document, Start Here, featured,
  and recently-updated sets. It is intentionally UI-free until the Topic Hub
  page phase.

## PH-ARC-08 · Search manifest migration

- Changed `search.json` to select documents through the manifest and its
  `search` publication decision, preserving the existing JSON shape.

## PH-ARC-09 · Sitemap and RSS publication policy

- Changed RSS to select documents through the `rss` decision.
- Connected Astro sitemap serialization to the `sitemap` decision. The
  manifest is dynamically loaded inside the hook because the config phase
  cannot resolve Astro's virtual content module.

## PH-ARC-10 · Duplicate loader removal

- Migrated blog static paths and learning-path coverage queries from direct
  `getCollection('blog')` calls to the shared manifest. The manifest module is
  now the sole direct blog collection loader.

## PH-B-01 · Topic Hub role

- Added explicit Hub definitions for PCIe & CXL and Firmware & Bootloader.
  The model records the introduction, learning-map, and curated-entry-point
  role while intentionally excluding tag-archive and full-search behavior.

## PH-B-02 · Shared Hub structure

- Added a reusable static `TopicHub` template with Hero, Start Here, Core
  Concepts, Featured Guides, Related Topics, and Recently Updated sections.
- The template has no client hydration and no route yet; publishing either Hub
  remains the next, separately recorded batch.

## PH-B-03 · PCIe & CXL Hub

- Added the static `/topics/pcie-cxl/` route. Hub publication is explicit in
  its registry definition, so the prepared Firmware Hub is not exposed early.

## PH-B-04 · PCIe & CXL concept structure

- Defined the Hub's internal concept map: Enumeration, BAR & MMIO, Interrupt
  & DMA, and CXL Memory. These remain sections of one Hub rather than creating
  shallow sub-topic pages.

## PH-B-05 · PCIe & CXL Start Here

- Curated three stable entry documents by ID: PCIe fundamentals, BAR & MMIO,
  and CXL.mem. The query validates that each selected document remains inside
  the Hub's category scope before rendering it.
