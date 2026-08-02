#!/usr/bin/env node
// Move canonical path classification into explicit frontmatter without rewriting document bodies.
// Usage:
//   node scripts/migrate-explicit-topics.mjs          # preview only
//   node scripts/migrate-explicit-topics.mjs --apply  # write validated topics metadata

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import yaml from 'js-yaml';

const root = process.cwd();
const contentRoot = join(root, 'src/content/blog');
const reportDir = join(root, 'reports/content-classification');
const apply = process.argv.includes('--apply');
const categoriesSource = await readFile(join(root, 'src/consts/categories.ts'), 'utf8');
const categoryIds = new Set([...categoriesSource.matchAll(/\bid:\s*'([^']+)'/g)].map((match) => match[1]));

async function* walk(directory) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(file);
    else if (entry.isFile() && entry.name.endsWith('.md')) yield file;
  }
}

function parseFrontmatter(raw, file) {
  const match = raw.match(/^(---\s*\n)([\s\S]*?)(\n---\s*\n)/);
  if (!match) throw new Error(`${relative(root, file)}: frontmatter is required for topic migration.`);
  return { prefix: match[1], body: match[2], suffix: match[3], rest: raw.slice(match[0].length), data: yaml.load(match[2]) ?? {} };
}

function inferredTopics(id) {
  const folders = id.split('/').slice(0, -1);
  return [...categoryIds]
    .filter((category) => folders.join('/').startsWith(category))
    .sort((left, right) => left.split('/').length - right.split('/').length || left.localeCompare(right));
}

function topicLine(topicIds) {
  return `topics: [${topicIds.map((topic) => JSON.stringify(topic)).join(', ')}]`;
}

const report = { mode: apply ? 'apply' : 'dry-run', scanned: 0, added: [], alreadyExplicit: [], conflicts: [], unclassified: [] };
for await (const file of walk(contentRoot)) {
  report.scanned++;
  const raw = await readFile(file, 'utf8');
  const frontmatter = parseFrontmatter(raw, file);
  const id = relative(contentRoot, file).replace(/\.md$/, '').split(sep).join('/');
  const explicitTopics = Array.isArray(frontmatter.data.topics) ? frontmatter.data.topics : [];
  const legacyTopics = Array.isArray(frontmatter.data.categories)
    ? frontmatter.data.categories.filter((topic) => categoryIds.has(topic))
    : [];
  const expectedTopics = legacyTopics.length ? legacyTopics : inferredTopics(id);

  if (explicitTopics.length) {
    if (explicitTopics.some((topic) => !categoryIds.has(topic)) || explicitTopics.join('\u0000') !== expectedTopics.join('\u0000')) {
      report.conflicts.push({ id, explicitTopics, expectedTopics });
    } else {
      report.alreadyExplicit.push(id);
    }
    continue;
  }
  if (!expectedTopics.length) {
    report.unclassified.push(id);
    continue;
  }

  report.added.push({ id, topics: expectedTopics });
  if (apply) {
    const next = `${frontmatter.prefix}${frontmatter.body.trimEnd()}\n${topicLine(expectedTopics)}${frontmatter.suffix}${frontmatter.rest}`;
    await writeFile(file, next);
  }
}

await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'topic-migration.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(join(reportDir, 'topic-migration.md'), [
  '# Explicit topic migration', '',
  `- Mode: ${report.mode}`,
  `- Documents scanned: ${report.scanned}`,
  `- Metadata additions: ${report.added.length}`,
  `- Already explicit: ${report.alreadyExplicit.length}`,
  `- Conflicts requiring review: ${report.conflicts.length}`,
  `- Unclassified documents: ${report.unclassified.length}`,
  '',
  ...report.conflicts.map(({ id }) => `- Conflict: \`${id}\``),
  ...report.unclassified.map((id) => `- Unclassified: \`${id}\``),
].join('\n'));

console.log(`Explicit topic migration (${report.mode}): ${report.scanned} scanned; ${report.added.length} additions; ${report.conflicts.length} conflicts; ${report.unclassified.length} unclassified.`);
console.log(`Report: ${relative(root, reportDir)}/topic-migration.md`);
if (report.conflicts.length || report.unclassified.length) process.exitCode = 1;
