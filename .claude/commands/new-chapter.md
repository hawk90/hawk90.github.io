---
name: new-chapter
description: Scaffold a new blog chapter with correct frontmatter and structure per CLAUDE.md §3/§4. Picks tone from the series, wires series/seriesOrder, defaults to draft.
argument-hint: "<series dir under src/content/blog> [chapter topic]"
allowed-tools: Bash, Read, Grep, Glob, Write
---

# New chapter scaffold

Create a new chapter for: `$ARGUMENTS` (series directory, then topic).

## Steps

1. **Inspect the series first** (CLAUDE.md §13 — check pattern before writing):
   - `ls` the series dir; read the latest chapter's frontmatter and one body.
   - Determine the series **tone** (A `~합니다` vs B `~다`) from existing posts —
     never mix (§1). Note the `series` name and the next free `seriesOrder`
     (gaps may be intentional; confirm before filling).
2. **Write the stub** with required frontmatter (§4): `title` (with `Ch N:`/`Item N:`
   prefix if the series uses one), `date`, `description` (one search-meaningful
   sentence), `series`, `seriesOrder`, `tags` (≤5), `draft: true`. Add
   `type: book-review` + `bookTitle`/`bookAuthor` if it's a book series.
3. **Body skeleton** (§3): start at H2 (H1 is the title). Include a motivation
   paragraph before any formal definition (§11), then section stubs, and the
   standard tail: `## 정리`, `## 다음 장 예고`, `## 관련 항목`.
4. Every code block gets a language tag (§5). No overview/00- file for new series
   unless it's one of the four whitelisted series (§13).
5. Leave it as `draft: true`. Tell the user it's a stub to iterate on.
