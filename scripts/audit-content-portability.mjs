#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const normalize = await readFile('src/lib/content/normalize.ts', 'utf8');
const config = await readFile('src/content.config.ts', 'utf8');
const utils = await readFile('src/lib/utils.ts', 'utf8');
const findings = [];

for (const [name, marker] of [
  // The document model must take its URL from the one function that defines
  // it, not rebuild the path itself.
  ['stable-url', 'url: getPostUrl(entry)'],
  ['explicit-topics', 'if (!explicitTopics.length)'],
  ['date-schema', 'date: z.coerce.date()'],
  ['publication-policy', 'status: entry.data.draft'],
]) if (!(name === 'date-schema' ? config : normalize).includes(marker)) findings.push(name);

if (!config.includes('topics: z.array(z.string()).min(1)')) findings.push('frontmatter-topics');

// The single definition itself has to exist, and the route param has to come
// from the same place as the links — otherwise the two drift and a link starts
// pointing at a page that was generated under a different path.
if (!utils.includes('export function getPostUrl')) findings.push('url-helper-missing');
if (!utils.includes('export function getPostRouteParam')) findings.push('route-param-helper-missing');
const slugRoute = await readFile('src/pages/blog/[...slug].astro', 'utf8');
if (!slugRoute.includes('params: { slug: getPostRouteParam(post) }')) findings.push('route-param-handbuilt');

/**
 * A post URL assembled by hand anywhere else. Each one is a second definition
 * of where a post lives, so changing the rule silently leaves it behind. Only
 * `getPostUrl` may write the path out; `/images/blog/...` is a different tree
 * and is not a post URL.
 */
const sourceRoots = ['src/components', 'src/pages', 'src/layouts', 'src/lib'];
const handBuilt = [];
async function scan(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { await scan(path); continue; }
    if (!/\.(astro|ts|tsx|mjs|js)$/.test(entry.name)) continue;
    const text = await readFile(path, 'utf8');
    for (const [index, line] of text.split('\n').entries()) {
      if (!/`\/blog\/\$\{/.test(line)) continue;
      if (path === 'src/lib/utils.ts') continue;   // the definition itself
      handBuilt.push(`${path}:${index + 1}`);
    }
  }
}
for (const root of sourceRoots) await scan(root);
if (handBuilt.length) findings.push(`hand-built-post-url (${handBuilt.length})`);

await mkdir('reports/content-portability', { recursive: true });
await writeFile('reports/content-portability/latest.md', [
  '# Content portability audit',
  '',
  `- Findings: ${findings.length}`,
  ...findings.map((x) => `- ${x}`),
  ...(handBuilt.length ? ['', '## Hand-built post URLs', ...handBuilt.map((x) => `- \`${x}\``)] : []),
  '',
].join('\n'));

console.log(`Content portability: ${findings.length} finding(s).`);
for (const site of handBuilt) console.log(`  hand-built post URL: ${site}`);
if (findings.length) process.exitCode = 1;
