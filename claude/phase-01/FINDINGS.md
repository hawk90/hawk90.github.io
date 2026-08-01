# Findings

## 2026-08-01

- The only Astro collection is `blog`; its entries carry draft, featured,
  SEO noindex, tags, optional legacy categories, and a path-stable `id`.
- `src/lib/posts.ts` was the shared published-content loader. Search and RSS
  consume that loader, while some future migration targets still query the
  collection directly.
- Public post URLs are deterministically `/blog/${entry.id}`. Legacy category
  metadata is preserved when present; otherwise path segments are exposed as
  provisional categories until the topic registry phase.
- Existing build warnings for several tag route collisions predate this batch.
- Astro's sitemap integration evaluates configuration before `astro:content`
  exists. Its `serialize` hook runs later, so the policy bridge must dynamically
  load the manifest there.
- In this environment, successful static builds do not emit a sitemap file
  despite `public/robots.txt` referring to one. No sitemap serialization error
  is logged; this pre-existing output discrepancy needs deployment-level review.
- Topic Hub work needs its own curated configuration: the existing category
  tree is useful taxonomy, but it cannot express a stable Hub URL, audience,
  concept map, or related-Hub intent.
