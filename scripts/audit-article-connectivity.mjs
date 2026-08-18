#!/usr/bin/env node
// How published articles connect to each other. Read-only.
//
// audit-internal-links.py checks that a link resolves. This checks whether the
// links exist at all, and whether an article can be reached without one.
//
//   - Dead end: a published article whose body links nowhere else under /blog/.
//     CLAUDE.md section 7 asks every article to carry prev/next and related
//     links, so a dead end is a chapter a reader finishes with nowhere to go.
//   - Unreachable: no inbound body link AND no series AND no tags. Series and
//     tag pages are real navigation, so an article carrying either is reachable
//     even with zero inbound prose links; only the combination strands it.
//   - Bare anchor: link text like "여기" or "click here", which tells a reader
//     nothing about the destination and reads as nothing to a screen reader.
//
// Findings are reported, never fixed: the right link is an editorial choice.

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import yaml from 'js-yaml';

const contentRoot = 'src/content/blog';
const enforce = process.argv.includes('--enforce');
const BARE_ANCHOR = /^\s*(여기|이곳|링크|자세히|더\s*보기|here|click\s*here|link|read\s*more)\s*$/i;

async function walk(dir, out = []) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file, out);
    else if (entry.isFile() && file.endsWith('.md')) out.push(file);
  }
  return out;
}

const posts = new Map();
for (const file of await walk(contentRoot)) {
  const raw = await readFile(file, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) continue;
  let data;
  try { data = yaml.load(match[1]) ?? {}; } catch { continue; }
  if (data.draft === true) continue;
  const id = relative(contentRoot, file).replace(/\.md$/, '');
  posts.set(id, {
    file: relative('.', file),
    series: data.series ? String(data.series) : null,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    body: raw.slice(match[0].length),
  });
}

const inbound = new Map([...posts.keys()].map((id) => [id, 0]));
for (const [id, post] of posts) {
  for (const [, href] of post.body.matchAll(/\]\((\/blog\/[^)\s#]+)/g)) {
    const target = href.replace(/^\/blog\//, '').replace(/\/$/, '');
    if (target !== id && inbound.has(target)) inbound.set(target, inbound.get(target) + 1);
  }
}

const findings = [];
for (const [id, post] of posts) {
  if (!/\]\(\/blog\//.test(post.body)) {
    findings.push({ type: 'dead-end', id, detail: `no outbound /blog/ link${post.series ? ` (series ${post.series})` : ''}` });
  }
  if (inbound.get(id) === 0 && !post.series && !post.tags.length) {
    findings.push({ type: 'unreachable', id, detail: 'no inbound link, no series, no tags' });
  }
  for (const [, label] of post.body.matchAll(/\[([^\]]{1,30})\]\(\/blog\//g)) {
    if (BARE_ANCHOR.test(label)) findings.push({ type: 'bare-anchor', id, detail: `link text ${JSON.stringify(label)} says nothing about the destination` });
  }
}

const counts = findings.reduce((acc, { type }) => ({ ...acc, [type]: (acc[type] ?? 0) + 1 }), {});
const noInbound = [...inbound.values()].filter((count) => count === 0).length;
console.log(`Article connectivity: ${posts.size} published article(s); ${findings.length} finding(s).`);
console.log(`  (${noInbound} have no inbound prose link but stay reachable through their series or tags.)`);
for (const [type, count] of Object.entries(counts)) console.log(`  ${type}: ${count}`);
for (const { type, id, detail } of findings.slice(0, 40)) console.log(`  ✗ [${type}] ${id} — ${detail}`);
if (findings.length > 40) console.log(`  … +${findings.length - 40} more`);
if (enforce && findings.length) process.exitCode = 1;
