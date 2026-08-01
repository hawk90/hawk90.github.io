# Phase 1 · Batch 1 — Domain foundation

## Active task IDs

- `PH-ARC-01` Domain 기본 모델 생성
- `PH-ARC-02` Astro Entry Normalizer 생성
- `PH-ARC-03` Content Manifest 생성
- `PH-ARC-04` Publication Policy 중앙화

## Goal

Create a small typed domain layer that converts Astro content entries into one
canonical document model. The model must become the single input for later
search, sitemap, RSS, Topic Hub, and curation tasks — but do not migrate those
consumers in this batch.

## Allowed scope

- Add focused modules under `src/lib/` or `src/lib/content/`.
- Add tests only when the project already has an appropriate test mechanism.
- Make the smallest necessary edits to existing content-loading code to prove
  the normalizer works.

## Explicitly out of scope

- Topic Hub UI (`PH-B-*`), search generation (`PH-ARC-08`), sitemap/RSS
  migration (`PH-ARC-09`), and deletion of existing loaders (`PH-ARC-10`).
- Bulk frontmatter edits, URL migrations, visual changes, or dependency changes.

## Completion criteria

1. A documented `ContentDocument`-style model exists with stable ID, URL,
   content type/status, topics/categories, and publication decision fields.
2. A normalizer converts the current Astro collection entry shape without
   leaking page-specific logic into consumers.
3. A manifest exposes `documents`, `byId`, and `byUrl` with duplicate detection.
4. Publication policy centrally determines whether a document may render,
   index, search, appear in sitemap/RSS, be featured, or be ad-eligible.
5. Existing site behavior remains intact; no consumer is migrated merely to
   satisfy this batch.

## Required verification

```bash
npm run check
npm run build
```

If either baseline failure is unrelated, identify the exact failures and run a
targeted TypeScript/import validation for the new modules instead.
