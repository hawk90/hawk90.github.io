#!/usr/bin/env node
// sync-book-notes.mjs — copy book-notes chapters into the blog with frontmatter.
//
// Source:  ../book-notes/<series>/<chapter-dir>/*.md + figures/
// Target:  src/content/blog/math/<series>/ch<NN>[-<topic>]/<MM-slug|aux>.md
//          public/images/blog/<series>/ch<NN>/*.{svg,png,...}
//
// Two source layouts supported (one per series, see SERIES below):
//   linear-algebra: chapter dir "NN-topic", section "N.M-slug.md", aux files
//   set-theory:     chapter dir "chNN",     section "MM-slug.md", no aux files
//
// Re-runnable: overwrites synced files only with --apply.
// Usage: node scripts/sync-book-notes.mjs [--apply]

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const BOOK_NOTES_ROOT = path.resolve(ROOT, '../book-notes');
// Vector-only — blog uses SVG. PNG/raster intentionally skipped (duplicates of SVG).
const IMG_EXT = /\.svg$/i;
const SKIP_FILES = new Set(['README.md', 'notes.md', 'notes.md.legacy', 'roadmap.md', 'storyboard.md']);

const SERIES = [
  {
    name: 'Linear Algebra',
    sourceSlug: 'linear-algebra',
    destSlug: 'linear-algebra',
    // Must match the tag keys already on disk: these become /tags/<key>
    // URLs, and 'Linear Algebra' would fold to a different key than the
    // 'linear-algebra' the published posts use, splitting one concept in two.
    tags: ['linear-algebra', 'Mathematics', 'hoffman-kunze'],
    // Required by the content schema and validated against the category
    // registry. Declared per series because it is a classification decision,
    // not something derivable from the source tree.
    topics: ['math'],
    chapterRe: /^(\d+)-(.+)$/,
    sectionRe: /^(\d+)\.(\d+)-(.+)\.md$/,
    sectionPick: (m, chapterNum) => {
      if (parseInt(m[1], 10) !== chapterNum) return null;
      const n = parseInt(m[2], 10);
      return { order: n, name: `${pad(n)}-${m[3]}.md` };
    },
    aux: { 'examples.md': 90, 'exercises.md': 91, 'self-check.md': 92, 'summary.md': 93 },
  },
  {
    name: 'Set Theory',
    sourceSlug: 'set-theory',
    destSlug: 'set-theory',
    tags: ['set-theory', 'Mathematics', 'Enderton'],
    topics: ['math'],
    chapterRe: /^ch(\d+)$/,
    sectionRe: /^(\d+)-(.+)\.md$/,
    sectionPick: (m) => {
      const n = parseInt(m[1], 10);
      return { order: n, name: `${pad(n)}-${m[2]}.md` };
    },
    aux: {},
  },
];

async function main() {
  let total = 0;
  for (const s of SERIES) total += await syncSeries(s);
  console.log(`done. ${total} posts ${APPLY ? 'written' : 'to write (dry run)'}.`);
}

async function syncSeries(series) {
  const source = path.join(BOOK_NOTES_ROOT, series.sourceSlug);
  const destPosts = path.join(ROOT, 'src/content/blog/math', series.destSlug);
  const destImages = path.join(ROOT, 'public/images/blog', series.destSlug);

  try {
    await fs.access(source);
  } catch {
    console.warn(`[${series.name}] source not found: ${source} (skipping)`);
    return 0;
  }

  if (APPLY) {
    await fs.mkdir(destPosts, { recursive: true });
    await fs.mkdir(destImages, { recursive: true });
  }
  console.log(`\n[${series.name}]`);

  const chapters = await listChapters(source, series.chapterRe);
  let written = 0;
  for (const ch of chapters) {
    written += await syncChapter(series, ch, destPosts, destImages);
  }
  return written;
}

async function listChapters(srcRoot, chapterRe) {
  const entries = await fs.readdir(srcRoot, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && chapterRe.test(e.name))
    .map((e) => {
      const m = e.name.match(chapterRe);
      return {
        num: parseInt(m[1], 10),
        slug: m[2] || null,
        dir: path.join(srcRoot, e.name),
      };
    })
    .sort((a, b) => a.num - b.num);
}

async function syncChapter(series, { num, slug, dir }, destPosts, destImages) {
  const chNum = `ch${pad(num)}`;
  const chFolder = slug ? `${chNum}-${slug}` : chNum;
  await copyFigures(path.join(dir, 'figures'), path.join(destImages, chNum));
  if (APPLY) await fs.mkdir(path.join(destPosts, chFolder), { recursive: true });

  const files = await fs.readdir(dir);
  let written = 0;
  for (const f of files) {
    if (SKIP_FILES.has(f) || !f.endsWith('.md')) continue;
    const meta = resolveFile(series, f, num);
    if (!meta) {
      console.warn(`  skip: ${f} (unrecognized filename)`);
      continue;
    }
    const srcPath = path.join(dir, f);
    const raw = await fs.readFile(srcPath, 'utf-8');
    const stat = await fs.stat(srcPath);
    const { title, description, body } = transform(raw, series.destSlug, chNum);
    const outPath = path.join(destPosts, chFolder, meta.name);
    const frontmatter = buildFrontmatter({
      title,
      description,
      date: stat.mtime,
      tags: series.tags,
      seriesName: series.name,
      seriesOrder: num * 100 + meta.order,
      slug: `math/${series.destSlug}/${chFolder}/${meta.name.replace(/\.md$/, '')}`,
      topics: series.topics,
      draft: await existingDraftFlag(outPath),
    });
    if (APPLY) await fs.writeFile(outPath, `${frontmatter}\n${body}`);
    console.log(`  ${APPLY ? 'wrote' : 'would write'}: ${chFolder}/${meta.name}`);
    written++;
  }
  return written;
}

async function copyFigures(srcDir, destDir) {
  let files;
  try {
    files = await fs.readdir(srcDir);
  } catch (e) {
    if (e.code === 'ENOENT') return;
    throw e;
  }
  if (APPLY) await fs.mkdir(destDir, { recursive: true });
  for (const f of files) {
    if (!IMG_EXT.test(f)) continue;
    if (APPLY) await fs.copyFile(path.join(srcDir, f), path.join(destDir, f));
  }
}

function resolveFile(series, filename, chapterNum) {
  const m = filename.match(series.sectionRe);
  if (m) return series.sectionPick(m, chapterNum);
  if (series.aux[filename] != null) {
    return { order: series.aux[filename], name: filename };
  }
  return null;
}

function transform(raw, seriesSlug, chKey) {
  let body = raw;
  const h1 = raw.match(/^#\s+(.+)$/m);
  const title = h1 ? cleanTitle(h1[1]) : 'Untitled';
  if (h1) body = body.replace(/^#\s+.+\n+/m, '');

  const imgBase = `/images/blog/${seriesSlug}/${chKey}`;
  body = body.replace(/\]\((?:\.\/)?figures\/([^)]+)\)/g, `](${imgBase}/$1)`);
  body = body.replace(/(src=")(?:\.\/)?figures\/([^"]+")/g, `$1${imgBase}/$2`);

  const description = extractDescription(body);
  return { title, description, body };
}

function cleanTitle(raw) {
  let t = raw.replace(/§(\d+(?:\.\d+)*)/g, '$1');
  const dashIdx = t.search(/\s[—–-]\s/);
  if (dashIdx > 0) t = t.slice(0, dashIdx);
  t = t.replace(/\$[^$]+\$/g, '').replace(/\s+/g, ' ').trim();
  return t || 'Untitled';
}

function extractDescription(body) {
  for (const block of body.split(/\n{2,}/)) {
    const line = block.trim();
    if (!line || line.startsWith('#') || line.startsWith('>') || line.startsWith('|')) continue;
    if (line.startsWith('---') || line.startsWith('![') || line.startsWith('```')) continue;
    const cleaned = line
      .replace(/\$[^$]+\$/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length < 10) continue;
    return cleaned.length > 150 ? cleaned.slice(0, 147) + '…' : cleaned;
  }
  return '';
}

/**
 * The frontmatter for one synced section.
 *
 * Three fields here are not cosmetic:
 *
 * `slug` freezes the URL at the path this file is being written to, the same
 * way every hand-authored post does it. Without it the URL is the file path,
 * so a rename in ../book-notes would move a published URL — and the rename
 * happens in a repository where nothing knows this blog exists.
 *
 * `topics` is required by the content schema and validated against the
 * category registry. It was absent here while every file on disk carried it,
 * which means the output had been corrected by hand and the next sync would
 * have written files the build rejects.
 *
 * `draft` is carried over from the file being replaced rather than asserted.
 * Publishing is the author's decision (CLAUDE.md 13), and this function had
 * been emitting `draft: false` against 12 files on disk that all say `true` —
 * one sync would have published a chapter series nobody chose to publish.
 * Unknown means unpublished.
 */
function buildFrontmatter({ title, description, date, tags, seriesName, seriesOrder, slug, topics, draft }) {
  const dt = (date instanceof Date ? date : new Date()).toISOString().slice(0, 19);
  const lines = ['---', `title: ${yaml(title)}`, `slug: ${yaml(slug)}`, `date: ${dt}`];
  if (description) lines.push(`description: ${yaml(description)}`);
  lines.push(
    `tags: [${tags.map((t) => yaml(t)).join(', ')}]`,
    `series: ${yaml(seriesName)}`,
    `seriesOrder: ${seriesOrder}`,
    `draft: ${draft}`,
    `topics: [${topics.map((t) => yaml(t)).join(', ')}]`,
    '---',
    '',
  );
  return lines.join('\n');
}

/** The `draft:` of the file about to be overwritten; true when there is none. */
async function existingDraftFlag(outPath) {
  try {
    const raw = await fs.readFile(outPath, 'utf-8');
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    return !/^draft:\s*false\s*$/m.test(frontmatter);
  } catch {
    return true;
  }
}

function yaml(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
