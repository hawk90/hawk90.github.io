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

- `sync-book-notes.mjs` — scaffolding for the book-notes series.
