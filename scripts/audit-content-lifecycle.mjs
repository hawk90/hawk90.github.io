#!/usr/bin/env node
// Inventory editorial review and evidence metadata without changing publication.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import yaml from 'js-yaml';

const root = process.cwd();
const contentRoot = join(root, 'src/content/blog');
const reportDir = join(root, 'reports/content-lifecycle');
const counts = { total: 0, verified: 0, current: 0, needsReview: 0, archived: 0, evidence: 0 };
const reviewQueue = [];

async function* walk(dir) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(file);
    else if (entry.isFile() && entry.name.endsWith('.md')) yield file;
  }
}

for await (const file of walk(contentRoot)) {
  const raw = await readFile(file, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  const data = match ? yaml.load(match[1]) ?? {} : {};
  counts.total++;
  if (data.lastVerified) counts.verified++;
  if (data.evidenceStatus) counts.evidence++;
  if (data.reviewStatus === 'current') counts.current++;
  else if (data.reviewStatus === 'archived') counts.archived++;
  else counts.needsReview++;
  if (data.draft !== true && data.reviewStatus !== 'current') {
    reviewQueue.push({
      id: relative(contentRoot, file).replace(/\.md$/, ''),
      title: data.title ?? '',
      date: data.date ?? '',
      score: (data.featured ? 100 : 0) + (data.series ? 10 : 0),
    });
  }
}

reviewQueue.sort((a, b) => b.score - a.score || String(a.date).localeCompare(String(b.date)));

await mkdir(reportDir, { recursive: true });
const report = { ...counts, reviewQueue: reviewQueue.slice(0, 100), generatedAt: new Date().toISOString() };
await writeFile(join(reportDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(join(reportDir, 'latest.md'), [
  '# Content lifecycle inventory', '',
  `- Documents: ${counts.total}`,
  `- Last verified: ${counts.verified}`,
  `- Review status — current: ${counts.current}, needs review: ${counts.needsReview}, archived: ${counts.archived}`,
  `- Evidence status recorded: ${counts.evidence}`,
  '',
  '## Review queue (top 100)', '',
  ...reviewQueue.slice(0, 100).map(({ id, title, score }) => `- [${score}] \`${id}\` — ${title}`),
  '',
  '> New and existing content defaults to `needs-review` until an editorial review records its evidence and verification date.',
].join('\n'));
console.log(`Content lifecycle: ${counts.total} documents; ${counts.needsReview} need review; ${counts.verified} verified.`);
console.log(`Report: ${relative(root, reportDir)}/latest.md`);
