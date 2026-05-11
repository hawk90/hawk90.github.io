#!/usr/bin/env node
// sync-book-notes.mjs — copy book-notes chapters into the blog with frontmatter.
//
// Source:  ../book-notes/linear-algebra/NN-topic/*.md + figures/
// Target:  src/content/blog/math/linear-algebra/chNN-<topic>/XX-slug.md
//          public/images/blog/linear-algebra/chNN/*.{svg,png,...}
//
// Re-runnable: overwrites synced files. Author in book-notes, run this to publish.

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.resolve(ROOT, '../book-notes/linear-algebra');
const DEST_POSTS = path.join(ROOT, 'src/content/blog/math/linear-algebra');
const DEST_IMAGES = path.join(ROOT, 'public/images/blog/linear-algebra');

const SERIES = 'Linear Algebra';
const TAGS = ['Linear Algebra', 'Mathematics', 'Hoffman & Kunze'];
const SKIP_FILES = new Set(['README.md', 'notes.md.legacy']);
const AUX_ORDER = { 'examples.md': 90, 'exercises.md': 91, 'self-check.md': 92, 'summary.md': 93 };
const IMG_EXT = /\.(svg|png|jpe?g|webp|gif)$/i;

async function main() {
  await fs.mkdir(DEST_POSTS, { recursive: true });
  await fs.mkdir(DEST_IMAGES, { recursive: true });

  const chapters = await listChapters(SOURCE);
  let count = 0;
  for (const ch of chapters) count += await syncChapter(ch);
  console.log(`done. ${count} posts written.`);
}

async function listChapters(srcRoot) {
  const entries = await fs.readdir(srcRoot, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && /^\d+-/.test(e.name))
    .map((e) => {
      const m = e.name.match(/^(\d+)-(.+)$/);
      return { num: parseInt(m[1], 10), slug: m[2], dir: path.join(srcRoot, e.name) };
    })
    .sort((a, b) => a.num - b.num);
}

async function syncChapter({ num, slug, dir }) {
  const chNum = `ch${String(num).padStart(2, '0')}`;
  const chFolder = `${chNum}-${slug}`;
  await copyFigures(path.join(dir, 'figures'), path.join(DEST_IMAGES, chNum));
  await fs.mkdir(path.join(DEST_POSTS, chFolder), { recursive: true });

  const files = await fs.readdir(dir);
  let written = 0;
  for (const f of files) {
    if (SKIP_FILES.has(f) || !f.endsWith('.md')) continue;
    const meta = parseFilename(f, num);
    if (!meta) {
      console.warn(`  skip: ${f} (unrecognized filename)`);
      continue;
    }
    const raw = await fs.readFile(path.join(dir, f), 'utf-8');
    const { title, description, body } = transform(raw, chNum);
    const frontmatter = buildFrontmatter({
      title,
      description,
      seriesOrder: num * 100 + meta.order,
    });
    const outPath = path.join(DEST_POSTS, chFolder, `${meta.suffix}.md`);
    await fs.writeFile(outPath, `${frontmatter}\n${body}`);
    console.log(`  wrote: ${chFolder}/${meta.suffix}.md`);
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

function parseFilename(name, chapterNum) {
  const sec = name.match(/^(\d+)\.(\d+)-(.+)\.md$/);
  if (sec) {
    const chapter = parseInt(sec[1], 10);
    if (chapter !== chapterNum) return null;
    const section = parseInt(sec[2], 10);
    return { order: section, suffix: `${String(section).padStart(2, '0')}-${sec[3]}` };
  }
  if (AUX_ORDER[name] != null) {
    return { order: AUX_ORDER[name], suffix: name.replace(/\.md$/, '') };
  }
  return null;
}

function transform(raw, chKey) {
  let body = raw;
  const h1 = raw.match(/^#\s+(.+)$/m);
  const title = h1 ? cleanTitle(h1[1]) : 'Untitled';
  if (h1) body = body.replace(/^#\s+.+\n+/m, '');

  const imgBase = `/images/blog/linear-algebra/${chKey}`;
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

function buildFrontmatter({ title, description, seriesOrder }) {
  const today = new Date().toISOString().split('T')[0] + 'T10:00:00';
  const lines = [
    '---',
    `title: ${yaml(title)}`,
    `date: ${today}`,
  ];
  if (description) lines.push(`description: ${yaml(description)}`);
  lines.push(
    `tags: [${TAGS.map((t) => yaml(t)).join(', ')}]`,
    `series: ${yaml(SERIES)}`,
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
