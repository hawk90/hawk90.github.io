# scripts

## Diagrams (TikZ → SVG)

All diagrams live as `.tex` next to their compiled `.svg` under `public/images/blog/<series>/`. The shared design tokens are in `public/images/blog/_design.tex`.

```bash
npm run diagrams         # incremental — only rebuild changed .tex
npm run diagrams:force   # full rebuild
npm run diagrams:watch   # auto-rebuild on .tex save (requires fswatch)
npm run audit:diagrams   # verify .tex/.svg structure and report accessibility gaps
npm run audit:diagram-accessibility # read-only title/desc metadata check
npm run fix:diagram-accessibility   # add fallback metadata only with explicit apply
npm run review:diagrams  # build a human review sheet for visual candidates
npm run audit:diagram-quality # rank palette/effect candidates for visual review

# build a single file
bash scripts/build-diagrams.sh public/images/blog/dsa/diagrams/item20-quicksort-partition.tex
```

The build script auto-selects `xelatex` (when `fontspec` or Hangul is present) or `pdflatex`, then converts via `pdftocairo -svg`.

### Embedding in markdown

```mdx
import Diagram from '@components/blog/Diagram.astro';

<Diagram src="dsa/diagrams/item20-quicksort-partition" alt="Quicksort partition" />
<Diagram src="gof/relationships" alt="GoF 23 patterns" caption="패턴 관계도" />
```

The `src` is the path under `/images/blog/`, with or without `.svg`.

### Adding a new diagram

1. Create `public/images/blog/<series>/diagrams/<name>.tex` (input `../../_design.tex` for shared styles).
2. Run `npm run diagrams` (or have `npm run diagrams:watch` running).
3. Reference via `<Diagram>` in markdown.

## Other scripts

### Write safety

Scripts that rewrite content now preview by default. Pass `--apply` only after
reviewing their output. The ChatGPT archiver refuses to replace an existing
archive unless `--overwrite` is explicit. `npm run gate:tooling` enforces these
contracts for content-migration scripts.

### Security & admin workstream

```bash
npm run audit:security-admin # updates reports/security-admin/latest.{md,json}
npm run gate:security-admin  # fails while deterministic P0 findings remain
npm run gate:security-admin -- --artifact dist # also asserts no static OAuth routes shipped
npm run test:search          # terminology aliases and short-acronym regressions
npm run test:topics          # topic ID, parent, and hierarchy-cycle regressions
npm run test:classification  # explicit-topic migration and fallback regressions
npm run test:relations       # curated learning-path relation validation
npm run audit:classification # classification-source inventory before taxonomy migration
npm run gate:classification  # fails if a document falls back to legacy/path taxonomy
npm run audit:lifecycle      # review/evidence lifecycle inventory
npm run build:governance-queue # bounded Claude review queue from all inventories
npm run audit:knowledge-model # verifies terminology, taxonomy, relations, and refreshes governance reports
npm run audit:content-readiness # refreshes global staleness, fact-density, image, and series review queue
npm run audit:coverage          # counts published + draft content and flags draft-only series
npm run audit:staleness:all    # detects stale date/future-tense claims in published + draft content
npm run audit:resource-freshness # finds curated books/sites due for a fresh web review
npm run audit:industry-watch    # reads feeds, GitHub releases, and arXiv into an industry-change queue
npm run migrate:topics       # preview path → explicit topic migration (add -- --apply to write)
```

Run the report before a Claude Code security batch. The gate deliberately does
not treat OAuth deployment decisions as pass/fail source checks; those remain
explicit manual reviews in the report.

`audit:content-readiness` is deliberately informational: its P1/P2/P3 signals
rank review work but never assert a correction or bulk-change frontmatter. Its
companion Claude command is `.claude/commands/content-readiness-run.md`.

`audit:content-readiness` includes draft content when running prose staleness
checks. Unpublished manuscripts can contain expired dates, future-tense claims,
and obsolete recommendations before publication. The coverage report separates
published, draft, and draft-only series; it never publishes or changes frontmatter.

`audit:resource-freshness` and `audit:industry-watch` are discovery aids, not
automatic recommendation engines. The former schedules a fresh review of the
curated inventory in `data/resource-tracking.yaml`; the latter collects recent
items from `data/industry-watch.json` and writes a queue under
`reports/industry-watch/`, while `state.json` remembers items already seen.
A reviewer still verifies edition, authority,
relevance, and overlap before updating `READING_ROADMAP.md`.

For a recurring weekly pass:

```bash
npm run audit:industry-watch -- --since-days 14
npm run audit:resource-freshness
npm run audit:content-readiness
```

### Secret scan

```bash
npm run audit:secrets # updates reports/secrets/latest.{md,json}
npm run gate:secrets  # fails on credential-shaped content or artifacts
npm run gate:dependencies # fails on high-severity production dependency advisories
```

The scan covers Markdown, public text assets, and the final `dist` artifact.

### Tooling contract audit

```bash
npm run audit:tooling # validates every script's static syntax and npm entrypoint
npm run gate:tooling  # fails on a syntax or missing-entrypoint finding
npm run verify:release # runs every publish-blocking check and creates a verified dist artifact
```

- `sync-book-notes.mjs` — scaffolding for the book-notes series.
- `archive-chatgpt-share.mjs` — stores a share page as original HTML, per-message JSON, readable Markdown, and downloaded images.

  ```bash
  npm run archive:chatgpt -- 'https://chatgpt.com/share/<id>'
  # If ChatGPT serves an empty shell, save the fully rendered page in your browser first:
  npm run archive:chatgpt -- --input ~/Downloads/chat.html
  ```

  A share page's embedded conversation stream is preferred over rendered HTML, so
  its original Markdown code, lists, and tables are not round-tripped through an
  HTML converter. Each archive includes:

  - `conversation.full.md` and `conversation.json` — every extracted message;
  - `conversation.md` — exact duplicate blocks removed;
  - `duplicates.json` — removed block → retained block mapping, using a SHA-256
    fingerprint of `role + NUL + original Markdown`;
  - `topics/` — one Markdown file per top-level (`#`) topic, plus `index.json`.
  - `verification.json` — message-ID, role, duplicate, and topic-source integrity checks.
  - `antipatterns.md` / `phases.md` — numbered sections classified separately;
    `classification.json` keeps their source-message mapping.

### LLM anti-pattern corpus

```bash
npm run build:llm-antipatterns -- --archive archives/chatgpt-<id>
```

Builds `llm-antipatterns/`: category chunks of at most 60 atomic `AP-*`
sections, a retrieval manifest, and an exact-duplicate merge map. It does not
silently apply semantic merges; those need a separately reviewed LLM pass.

```bash
npm run review:semantic-merges -- --input archives/chatgpt-<id>/llm-antipatterns
```

This creates a conservative same-category candidate queue and an LLM review prompt without changing the corpus.
