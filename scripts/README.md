# scripts

## Diagrams (TikZ → SVG)

All diagrams live as `.tex` next to their compiled `.svg` under `public/images/blog/<series>/`. The shared design tokens are in `public/images/blog/_design.tex`.

```bash
npm run diagrams         # incremental — only rebuild changed .tex
npm run diagrams:force   # full rebuild
npm run diagrams:watch   # auto-rebuild on .tex save (requires fswatch)

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

### Security & admin workstream

```bash
npm run audit:security-admin # updates reports/security-admin/latest.{md,json}
npm run gate:security-admin  # fails while deterministic P0 findings remain
```

Run the report before a Claude Code security batch. The gate deliberately does
not treat OAuth deployment decisions as pass/fail source checks; those remain
explicit manual reviews in the report.

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
