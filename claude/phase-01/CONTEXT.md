# Context

## Authoritative source material

- [Phase 1 tasks](../../archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/llm-phases/foundation.md)
- [Information architecture anti-patterns](../../archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/llm-antipatterns/information_architecture-01.md)
- [Content strategy anti-patterns](../../archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/llm-antipatterns/content-01.md)

## Likely implementation touchpoints

- `src/content.config.ts` — collection schema
- `src/lib/posts.ts` — current content queries/loading
- `src/consts/categories.ts`, `src/consts/config.ts` — current taxonomy/config
- `src/pages/search.json.ts`, `src/pages/rss.xml.ts` — future consumers; inspect
  but do not migrate in this batch

## Design constraints

- One document must not be independently reclassified by every consumer.
- The normalizer should be deterministic and side-effect-free.
- Duplicate ID and URL detection must fail clearly rather than choosing an
  arbitrary document.
- Preserve current public URLs and frontmatter compatibility.

## Relevant anti-pattern intent

Avoid scattered taxonomy, repeated content loading, consumer-specific
publication rules, and implicit relationships inferred from paths or titles.
