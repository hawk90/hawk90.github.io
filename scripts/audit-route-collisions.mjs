#!/usr/bin/env node
/**
 * Fails when two posts would claim the same URL.
 *
 * A post's URL comes from its file path unless frontmatter sets `slug:`, which
 * Astro's glob loader substitutes for the entry id. That substitution is what
 * makes it possible to reorganise folders without moving published URLs — and
 * it is also how two posts can end up pointing at one page.
 *
 * Astro notices, but only warns:
 *
 *   [WARN] [glob-loader] **blog** contains multiple entries with the same
 *   slug: `…`. Slugs must be unique.
 *
 * and then drops one of them. The build succeeds, the release gate passes, and
 * a published post is simply gone. A warning in a 1500-line build log is not a
 * guard, so this reads the frontmatter directly — before the loader has had a
 * chance to deduplicate — and exits non-zero.
 *
 * Draft posts are included: a collision between a draft and a published post
 * still silences one of them the day the draft is published.
 *
 * Usage: node scripts/audit-route-collisions.mjs [--json]
 */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const asJson = process.argv.includes('--json');
const ROOT = 'src/content/blog';

async function walk(dir, out = []) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, out);
    else if (entry.name.endsWith('.md')) out.push(path);
  }
  return out;
}

/** Only the frontmatter block, and only a top-level scalar `slug:`. */
function frontmatterSlug(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const line = match[1].match(/^slug:\s*(.+)$/m);
  if (!line) return null;
  return line[1].trim().replace(/^['"]|['"]$/g, '').trim() || null;
}

const files = await walk(ROOT);
const byRoute = new Map();

for (const file of files) {
  const text = await readFile(file, 'utf8');
  const pathId = file.slice(`${ROOT}/`.length, -'.md'.length);
  const route = frontmatterSlug(text) ?? pathId;
  const draft = /^draft:\s*true\s*$/m.test(text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '');
  if (!byRoute.has(route)) byRoute.set(route, []);
  byRoute.get(route).push({ file, draft, explicit: frontmatterSlug(text) !== null });
}

const collisions = [...byRoute]
  .filter(([, claimants]) => claimants.length > 1)
  .map(([route, claimants]) => ({ route, claimants }));

const explicitSlugs = [...byRoute.values()].flat().filter((entry) => entry.explicit).length;

await mkdir('reports/route-collisions', { recursive: true });
await writeFile('reports/route-collisions/latest.md', [
  '# Route collision audit',
  '',
  `- Posts scanned: ${files.length}`,
  `- Frozen slugs in frontmatter: ${explicitSlugs}`,
  `- Colliding routes: ${collisions.length}`,
  ...collisions.flatMap(({ route, claimants }) => [
    '',
    `## /blog/${route}`,
    ...claimants.map((entry) => `- \`${entry.file}\`${entry.draft ? ' (draft)' : ''}${entry.explicit ? ' — explicit slug' : ' — from path'}`),
  ]),
  '',
].join('\n'));

if (asJson) {
  console.log(JSON.stringify({ scanned: files.length, explicitSlugs, collisions }, null, 2));
} else {
  console.log(`Route collisions: ${collisions.length} across ${files.length} post(s); ${explicitSlugs} frozen slug(s).`);
  for (const { route, claimants } of collisions) {
    console.log(`  /blog/${route}`);
    for (const entry of claimants) console.log(`    ${entry.file}${entry.draft ? ' (draft)' : ''}`);
  }
}

if (collisions.length) process.exitCode = 1;
