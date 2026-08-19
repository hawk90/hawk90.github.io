#!/usr/bin/env node
/**
 * Reports published series that no learning path points at, and path nodes
 * that point at a series with nothing published.
 *
 * The learning paths are the site's topic axis over the book-shaped series,
 * and they are hand-written. That is the right call — where a series belongs
 * in a reading order is an editorial judgement, not something to derive. But
 * it means the layer rots in one direction silently: publishing a new series
 * adds it to /blog and to its own /series page, and nothing anywhere notices
 * that the curated index never learned about it.
 *
 * It had already rotted. 20 of 28 published series were reachable from no
 * path, which is most of the published corpus, and the only way to know was
 * to diff two files by hand.
 *
 * The page catches the opposite direction already, but only as a console
 * warning during the build (src/pages/paths/[path].astro), where it renders
 * the node as "예정" — so a renamed series quietly becomes upcoming content.
 * That case is reported here too, where it can be read.
 *
 * Reported, not enforced: placing 20 series in a reading order is editorial
 * work, and blocking every deploy until it is done would make the curation
 * layer a release gate. Pass --enforce to exit non-zero, e.g. once the
 * backlog is cleared and the goal becomes keeping it at zero.
 *
 * Usage: node scripts/audit-learning-path-coverage.mjs [--enforce] [--json]
 */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'vite';

const enforce = process.argv.includes('--enforce');
const asJson = process.argv.includes('--json');
const ROOT = 'src/content/blog';

/** Bundle a TS module so the audit reads the same source the site does. */
async function loadModule(entry) {
  const built = await build({
    configFile: false,
    logLevel: 'error',
    build: { write: false, lib: { entry, formats: ['es'], fileName: 'coverage' } },
  });
  const chunk = (Array.isArray(built) ? built[0] : built).output.find((item) => item.type === 'chunk');
  if (!chunk) throw new Error(`Could not bundle ${entry}.`);
  return import(`data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`);
}

async function walk(dir, out = []) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, out);
    else if (entry.name.endsWith('.md')) out.push(path);
  }
  return out;
}

const { LEARNING_PATHS } = await loadModule('src/consts/learning-paths.ts');

const publishedCounts = new Map();
const draftOnly = new Map();
for (const file of await walk(ROOT)) {
  const text = await readFile(file, 'utf8');
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const series = frontmatter.match(/^series:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  if (!series) continue;
  const target = /^draft:\s*true\s*$/m.test(frontmatter) ? draftOnly : publishedCounts;
  target.set(series, (target.get(series) ?? 0) + 1);
}

const placed = new Map();   // series -> [path names]
for (const path of LEARNING_PATHS) {
  for (const part of path.parts) {
    for (const node of part.nodes) {
      if (!node.series) continue;   // a gap node is a deliberate placeholder
      if (!placed.has(node.series)) placed.set(node.series, []);
      placed.get(node.series).push(path.name);
    }
  }
}

const unplaced = [...publishedCounts]
  .filter(([series]) => !placed.has(series))
  .sort((a, b) => b[1] - a[1]);

const danglingNodes = [...placed]
  .filter(([series]) => !publishedCounts.has(series) && !draftOnly.has(series))
  .map(([series, paths]) => ({ series, paths }))
  .sort((a, b) => a.series.localeCompare(b.series));

const findings = unplaced.length + danglingNodes.length;
const coveredPosts = [...publishedCounts].filter(([s]) => placed.has(s)).reduce((n, [, c]) => n + c, 0);
const totalPosts = [...publishedCounts.values()].reduce((n, c) => n + c, 0);

await mkdir('reports/learning-paths', { recursive: true });
await writeFile('reports/learning-paths/latest.md', [
  '# Learning path coverage',
  '',
  `- Learning paths: ${LEARNING_PATHS.length}`,
  `- Published series: ${publishedCounts.size} (${totalPosts} posts)`,
  `- Series reachable from a path: ${publishedCounts.size - unplaced.length} (${coveredPosts} posts)`,
  `- Published series in no path: ${unplaced.length}`,
  `- Path nodes naming a series that does not exist: ${danglingNodes.length}`,
  '',
  ...(unplaced.length ? ['## Published, but in no learning path', '',
    '| series | published posts |', '|---|---|',
    ...unplaced.map(([series, count]) => `| ${series} | ${count} |`), ''] : []),
  ...(danglingNodes.length ? ['## Path nodes with no such series', '',
    ...danglingNodes.map((entry) => `- \`${entry.series}\` — referenced by ${entry.paths.join(', ')}`), ''] : []),
].join('\n'));

if (asJson) {
  console.log(JSON.stringify({ paths: LEARNING_PATHS.length, publishedSeries: publishedCounts.size, unplaced, danglingNodes }, null, 2));
} else {
  console.log(
    `Learning path coverage: ${publishedCounts.size - unplaced.length}/${publishedCounts.size} published series placed ` +
    `(${coveredPosts}/${totalPosts} posts); ${findings} finding(s).`,
  );
  for (const [series, count] of unplaced.slice(0, 10)) console.log(`  unplaced: ${series} (${count} posts)`);
  if (unplaced.length > 10) console.log(`  … ${unplaced.length - 10} more (reports/learning-paths/latest.md)`);
  for (const entry of danglingNodes) console.log(`  no such series: ${entry.series} — in ${entry.paths.join(', ')}`);
}

if (enforce && findings) process.exitCode = 1;
