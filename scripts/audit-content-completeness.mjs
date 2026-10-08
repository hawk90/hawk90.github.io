#!/usr/bin/env node
// How finished is each post? Read-only.
//
// Draft status says whether a post is published, not whether it is written:
// long drafts exist, and so do one-line "(작성 예정)" pages. This reads the body
// instead and sorts every post into one status:
//
//   - plan     STORYBOARD.md / 00-series-plan.md — a series plan, not a chapter.
//   - stub     a placeholder marker and little else: the chapter is not written.
//   - partial  a placeholder marker inside an otherwise substantial body —
//              written, with a hole left in it.
//   - thin     no marker, but a very short body. Often a deliberate short
//              summary (OSTEP chapters), so it is a review signal, not a defect.
//   - complete none of the above.
//
// Markers are the forms the content actually uses: `(작성 예정)`,
// `> Outline —` / `* Outline —`, a `예정 내용` or `작성 중` heading, and a line
// that starts with `TODO:` (the RISC-V skeletons). Running text is not a marker:
// `작성 중` there is ordinary Korean ("작성 중단"), and Clean Code's chapter on
// comments talks about `TODO` as a subject. Code fences are skipped. `<!-- TODO … -->` is a pending diagram, kept
// apart as diagramTodos because the text around it is written.
//
// --enforce fails when a published post is a stub or a plan.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
// Namespace import, not default: js-yaml 5 drops the default export, and this
// form resolves under both 4 and 5.
import * as yaml from 'js-yaml';

const contentRoot = 'src/content/blog';
const reportDir = 'reports/content-completeness';
const enforce = process.argv.includes('--enforce');

// A marker plus this much prose is a stub; more than this is a partial chapter.
const STUB_PROSE_LIMIT = 1500;
// With no marker, a body (code included) under this is thin.
const THIN_BODY_LIMIT = 1000;

const MARKERS = [
  ['planned', /\(작성 (?:중\/)?예정\)/],
  ['outline', /^\s*(?:>|\*)\s*\**Outline\**\s*[—:–-]/],
  ['planned-heading', /^#{1,6}\s*예정 내용/],
  ['wip-heading', /^#{1,6}\s*작성 중/],
  ['todo', /^\s*TODO:/],
];

async function walk(dir, out = []) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file, out);
    else if (entry.isFile() && file.endsWith('.md')) out.push(file);
  }
  return out;
}

function scan(body, firstLine) {
  const markers = [];
  let diagramTodos = 0;
  let prose = 0;
  let fence = null;
  body.split('\n').forEach((text, i) => {
    const open = text.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (open && open[1][0] === fence[0] && open[1].length >= fence.length) fence = null;
      return;
    }
    if (open) { fence = open[1]; return; }
    if (/<!--\s*TODO/.test(text)) { diagramTodos += 1; return; }
    const hit = MARKERS.find(([, re]) => re.test(text));
    if (hit) markers.push({ kind: hit[0], line: firstLine + i });
    else prose += text.trim().length;
  });
  return { markers, diagramTodos, prose };
}

function classify(file, body, scanned) {
  const name = basename(file);
  if (name === 'STORYBOARD.md' || name.startsWith('00-series-plan')) return 'plan';
  if (scanned.markers.length) return scanned.prose < STUB_PROSE_LIMIT ? 'stub' : 'partial';
  if (body.trim().length < THIN_BODY_LIMIT) return 'thin';
  return 'complete';
}

const posts = [];
for (const file of await walk(contentRoot)) {
  const raw = await readFile(file, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  let data = {};
  if (match) { try { data = yaml.load(match[1]) ?? {}; } catch { data = {}; } }
  const body = match ? raw.slice(match[0].length) : raw;
  const firstLine = match ? match[0].split('\n').length : 1;
  const scanned = scan(body, firstLine);
  const rel = relative(contentRoot, file);
  posts.push({
    path: relative('.', file),
    category: rel.split('/')[0],
    series: data.series ? String(data.series) : null,
    seriesOrder: Number(data.seriesOrder) || null,
    draft: data.draft === true,
    status: classify(file, body, scanned),
    proseChars: scanned.prose,
    bodyChars: body.trim().length,
    markers: scanned.markers,
    diagramTodos: scanned.diagramTodos,
  });
}

const STATUSES = ['stub', 'partial', 'thin', 'plan', 'complete'];
function tally(list) {
  const row = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const { status } of list) row[status] += 1;
  return { total: list.length, ...row, diagramTodos: list.reduce((n, p) => n + p.diagramTodos, 0) };
}
function groupBy(list, key) {
  const map = new Map();
  for (const item of list) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

const byCategory = [...groupBy(posts, (p) => p.category)]
  .map(([category, list]) => ({ category, ...tally(list) }))
  .sort((a, b) => a.category.localeCompare(b.category));
const bySeries = [...groupBy(posts.filter((p) => p.series), (p) => p.series)]
  .map(([series, list]) => ({ series, category: list[0].category, published: list.filter((p) => !p.draft).length, ...tally(list) }))
  .filter((s) => s.stub + s.partial > 0)
  .sort((a, b) => (b.stub + b.partial) - (a.stub + a.partial) || a.series.localeCompare(b.series));
const publishedUnfinished = posts.filter((p) => !p.draft && (p.status === 'stub' || p.status === 'plan'));

// No timestamp: the report changes only when content does, so running the gate
// leaves the tree clean.
const report = {
  thresholds: { stubProseChars: STUB_PROSE_LIMIT, thinBodyChars: THIN_BODY_LIMIT },
  summary: tally(posts),
  publishedUnfinished: publishedUnfinished.map((p) => p.path),
  byCategory,
  bySeries,
  posts: posts.filter((p) => p.status !== 'complete' || p.diagramTodos),
};

const cell = (n) => (n ? String(n) : '·');
const md = [
  '# Content completeness',
  '',
  `Generated by \`npm run audit:completeness\`. A marker with under ${STUB_PROSE_LIMIT} prose characters is a **stub**; a marker in a longer body is **partial**; no marker and under ${THIN_BODY_LIMIT} body characters is **thin** (review signal only). Per-post detail with line numbers is in \`latest.json\`, written next to this file on each run and not committed.`,
  '',
  `Total ${report.summary.total}: stub ${report.summary.stub}, partial ${report.summary.partial}, thin ${report.summary.thin}, plan ${report.summary.plan}, complete ${report.summary.complete}. Diagram TODO comments: ${report.summary.diagramTodos}.`,
  '',
  `Published stubs or plans: ${publishedUnfinished.length}${publishedUnfinished.length ? '' : ' (none)'}`,
  ...publishedUnfinished.map((p) => `- \`${p.path}\` (${p.status})`),
  '',
  '## By category',
  '',
  '| Category | Total | Stub | Partial | Thin | Plan | Complete | Diagram TODO |',
  '|---|---:|---:|---:|---:|---:|---:|---:|',
  ...byCategory.map((c) => `| ${c.category} | ${c.total} | ${cell(c.stub)} | ${cell(c.partial)} | ${cell(c.thin)} | ${cell(c.plan)} | ${c.complete} | ${cell(c.diagramTodos)} |`),
  '',
  '## Series with stub or partial chapters',
  '',
  '| Category | Series | Chapters | Published | Stub | Partial | Thin |',
  '|---|---|---:|---:|---:|---:|---:|',
  ...bySeries.map((s) => `| ${s.category} | ${s.series.replace(/\|/g, '\\|')} | ${s.total} | ${s.published} | ${cell(s.stub)} | ${cell(s.partial)} | ${cell(s.thin)} |`),
  '',
].join('\n');

await mkdir(reportDir, { recursive: true });
await writeFile(`${reportDir}/latest.json`, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(`${reportDir}/latest.md`, md);

const s = report.summary;
console.log(`content completeness: ${s.total} posts — stub ${s.stub}, partial ${s.partial}, thin ${s.thin}, plan ${s.plan}, complete ${s.complete}`);
console.log(`published stubs/plans: ${publishedUnfinished.length}`);
for (const p of publishedUnfinished) console.log(`  ${p.status.padEnd(7)} ${p.path}`);
console.log(`report: ${reportDir}/latest.md`);
if (enforce && publishedUnfinished.length) process.exit(1);
