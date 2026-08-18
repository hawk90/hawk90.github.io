#!/usr/bin/env node
// Inventory classification sources before migrating path-derived taxonomy.

import fs from 'node:fs/promises';
import path from 'node:path';
// Namespace import, not default: js-yaml 5 drops the default export, and this
// form resolves under both 4 and 5.
import * as yaml from 'js-yaml';

const root = process.cwd();
const enforce = process.argv.includes('--enforce');
const contentRoot = path.join(root, 'src/content/blog');
const categoriesSource = await fs.readFile(path.join(root, 'src/consts/categories.ts'), 'utf8');
const categoryIds = new Set([...categoriesSource.matchAll(/\bid:\s*'([^']+)'/g)].map((match) => match[1]));
const reportDir = path.join(root, 'reports/content-classification');

async function* walk(directory) {
  for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(file);
    else if (entry.isFile() && entry.name.endsWith('.md')) yield file;
  }
}

function frontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  return match ? yaml.load(match[1]) ?? {} : {};
}

function pathTopics(id) {
  const parts = id.split('/').slice(0, -1);
  return [...categoryIds].filter((category) => parts.join('/').startsWith(category));
}

const documents = [];
for await (const file of walk(contentRoot)) {
  const id = path.relative(contentRoot, file).replace(/\.md$/, '').split(path.sep).join('/');
  const data = frontmatter(await fs.readFile(file, 'utf8'));
  const explicitTopics = Array.isArray(data.topics) ? data.topics : [];
  const legacyCategories = Array.isArray(data.categories) ? data.categories : [];
  const inferredTopics = pathTopics(id);
  const unknown = [...explicitTopics, ...legacyCategories].filter((topic) => !categoryIds.has(topic));
  documents.push({ id, explicitTopics, legacyCategories, inferredTopics, unknown, series: data.series ?? null });
}

const sourceCounts = { explicit: 0, legacy: 0, pathOnly: 0, unclassified: 0 };
const conflicts = [];
const unknown = [];
const unregisteredPathBuckets = new Map();
for (const document of documents) {
  if (document.explicitTopics.length) sourceCounts.explicit++;
  else if (document.legacyCategories.length) sourceCounts.legacy++;
  else if (document.inferredTopics.length) sourceCounts.pathOnly++;
  else sourceCounts.unclassified++;
  if (document.unknown.length) unknown.push(document);
  if (document.explicitTopics.length && document.inferredTopics.length && !document.explicitTopics.some((topic) => document.inferredTopics.includes(topic))) {
    conflicts.push(document);
  }
  const folders = document.id.split('/').slice(0, -1);
  const deepestRegistered = document.inferredTopics
    .sort((left, right) => right.split('/').length - left.split('/').length)[0];
  const nextDepth = deepestRegistered ? deepestRegistered.split('/').length : 0;
  if (folders.length > nextDepth) {
    const bucket = folders.slice(0, nextDepth + 1).join('/');
    const current = unregisteredPathBuckets.get(bucket) ?? { documents: 0, series: new Map() };
    current.documents++;
    if (document.series) current.series.set(document.series, (current.series.get(document.series) ?? 0) + 1);
    unregisteredPathBuckets.set(bucket, current);
  }
}

const taxonomyGaps = [...unregisteredPathBuckets.entries()]
  .map(([path, value]) => {
    const series = [...value.series.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    const dominantSeries = series[0];
    const dominantSeriesDocuments = dominantSeries?.[1] ?? 0;
    const seriesShare = dominantSeriesDocuments / value.documents;
    const ungroupedDocuments = value.documents - [...value.series.values()].reduce((total, count) => total + count, 0);
    const recommendation = seriesShare >= 0.8 ? 'review-as-series' : 'review-as-topic';
    return {
      path,
      documents: value.documents,
      seriesCount: series.length,
      dominantSeries: dominantSeries?.[0] ?? null,
      dominantSeriesDocuments,
      dominantSeriesShare: Number(seriesShare.toFixed(3)),
      ungroupedDocuments,
      recommendation,
      rationale: recommendation === 'review-as-series'
        ? 'One named series accounts for at least 80% of documents; keep its navigation in the series layer unless a separate reader-facing domain is approved.'
        : 'No single named series accounts for 80% of documents; review as a potential stable reader-facing topic before creating a category.',
    };
  })
  .sort((left, right) => right.documents - left.documents || left.path.localeCompare(right.path));

const report = {
  total: documents.length,
  categoryCount: categoryIds.size,
  sourceCounts,
  unknownMetadata: unknown.map(({ id, unknown: values }) => ({ id, values })),
  explicitPathConflicts: conflicts.map(({ id, explicitTopics, inferredTopics }) => ({ id, explicitTopics, inferredTopics })),
  taxonomyGaps,
  taxonomySummary: taxonomyGaps.reduce((summary, gap) => {
    summary[gap.recommendation] = (summary[gap.recommendation] ?? 0) + 1;
    return summary;
  }, {}),
};

await fs.mkdir(reportDir, { recursive: true });
await Promise.all([
  fs.writeFile(path.join(reportDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`),
  fs.writeFile(path.join(reportDir, 'latest.md'), [
    '# Content classification inventory', '',
    '> Informational baseline for migrating from path-derived categories to explicit canonical topic IDs.', '',
    `- Documents: ${report.total}`,
    `- Registered category IDs: ${report.categoryCount}`,
    `- Explicit topic metadata: ${sourceCounts.explicit}`,
    `- Legacy category metadata: ${sourceCounts.legacy}`,
    `- Path-derived only: ${sourceCounts.pathOnly}`,
    `- No current classification: ${sourceCounts.unclassified}`,
    `- Unknown metadata values: ${unknown.length}`,
    `- Explicit/path conflicts: ${conflicts.length}`,
    `- Unregistered path buckets: ${taxonomyGaps.length}`,
    `- Review as series: ${report.taxonomySummary['review-as-series'] ?? 0}`,
    `- Review as topic: ${report.taxonomySummary['review-as-topic'] ?? 0}`,
    '',
    '## Taxonomy expansion candidates', '',
    '> These are folder buckets below the deepest registered topic. They are candidates, not automatic categories: create one only when it represents a stable reader-facing domain.', '',
    ...taxonomyGaps.map(({ path: bucket, documents: count, seriesCount, dominantSeries, dominantSeriesDocuments, dominantSeriesShare, ungroupedDocuments, recommendation, rationale }) => `- \`${bucket}\` — ${count} documents; ${seriesCount} series; ${recommendation}${dominantSeries ? ` (${dominantSeries}: ${dominantSeriesDocuments}/${count}, ${(dominantSeriesShare * 100).toFixed(1)}%)` : ''}; ${ungroupedDocuments} without a series. ${rationale}`),
    '',
  ].join('\n')),
]);

console.log(`Content classification: ${documents.length} documents; ${sourceCounts.pathOnly} path-derived only; ${unknown.length} unknown metadata values.`);
console.log(`Report: ${path.relative(root, reportDir)}/latest.md`);
if (enforce && (sourceCounts.legacy || sourceCounts.pathOnly || sourceCounts.unclassified || unknown.length || conflicts.length)) {
  console.error('Explicit topic classification gate failed; review the report for non-canonical metadata.');
  process.exitCode = 1;
}
