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
// Re-runnable: overwrites synced files. Author in book-notes, run this to publish.

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BOOK_NOTES_ROOT = path.resolve(ROOT, '../book-notes');
const IMG_EXT = /\.(svg|png|jpe?g|webp|gif)$/i;
const SKIP_FILES = new Set(['README.md', 'notes.md', 'notes.md.legacy', 'roadmap.md', 'storyboard.md']);

const SERIES = [
  {
    name: 'Linear Algebra',
    sourceSlug: 'linear-algebra',
    destSlug: 'linear-algebra',
    tags: ['Linear Algebra', 'Mathematics', 'Hoffman & Kunze'],
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
    tags: ['Set Theory', 'Mathematics', 'Enderton'],
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
  console.log(`done. ${total} posts written.`);
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

  await fs.mkdir(destPosts, { recursive: true });
  await fs.mkdir(destImages, { recursive: true });
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
  await fs.mkdir(path.join(destPosts, chFolder), { recursive: true });

  const files = await fs.readdir(dir);
  let written = 0;
  for (const f of files) {
    if (SKIP_FILES.has(f) || !f.endsWith('.md')) continue;
    const meta = resolveFile(series, f, num);
    if (!meta) {
      console.warn(`  skip: ${f} (unrecognized filename)`);
      continue;
    }
    const raw = await fs.readFile(path.join(dir, f), 'utf-8');
    const { title, description, body } = transform(raw, series.destSlug, chNum);
    const frontmatter = buildFrontmatter({
      title,
      description,
      tags: series.tags,
      seriesName: series.name,
      seriesOrder: num * 100 + meta.order,
    });
    const outPath = path.join(destPosts, chFolder, meta.name);
    await fs.writeFile(outPath, `${frontmatter}\n${body}`);
    console.log(`  wrote: ${chFolder}/${meta.name}`);
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
  await fs.mkdir(destDir, { recursive: true });
  for (const f of files) {
    if (!IMG_EXT.test(f)) continue;
    await fs.copyFile(path.join(srcDir, f), path.join(destDir, f));
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

function buildFrontmatter({ title, description, tags, seriesName, seriesOrder }) {
  const today = new Date().toISOString().split('T')[0] + 'T10:00:00';
  const lines = ['---', `title: ${yaml(title)}`, `date: ${today}`];
  if (description) lines.push(`description: ${yaml(description)}`);
  lines.push(
    `tags: [${tags.map((t) => yaml(t)).join(', ')}]`,
    `series: ${yaml(seriesName)}`,
    `seriesOrder: ${seriesOrder}`,
    'draft: false',
    '---',
    '',
  );
  return lines.join('\n');
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
