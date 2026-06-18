#!/usr/bin/env node
// Strip markdown links from published posts that point to drafted slugs.
// `[anchor text](/blog/path)` → `anchor text` when /blog/path is a drafted slug.
//
// Usage:
//   node scripts/strip-dead-links.mjs --dry-run   # report only
//   node scripts/strip-dead-links.mjs             # apply

import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_ROOT = join(__dirname, '..', 'src', 'content', 'blog');
const DRY_RUN = process.argv.includes('--dry-run');

function isDraft(raw) {
  return /^draft:\s*true\s*$/m.test(raw);
}

async function collectFiles() {
  const files = [];
  for await (const entry of glob('**/*.{md,mdx}', { cwd: BLOG_ROOT })) {
    files.push(join(BLOG_ROOT, entry));
  }
  return files;
}

function slugFromPath(absPath) {
  // /.../src/content/blog/a/b/c.md → /blog/a/b/c
  let rel = absPath.slice(BLOG_ROOT.length + 1);
  rel = rel.replace(/\.(md|mdx)$/, '');
  return '/blog/' + rel;
}

async function main() {
  const files = await collectFiles();
  const draftedSlugs = new Set();
  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    if (isDraft(raw)) draftedSlugs.add(slugFromPath(f));
  }

  let scannedFiles = 0;
  let touchedFiles = 0;
  let strippedLinks = 0;
  const examples = [];

  // Match a markdown link whose URL starts with /blog/. We restrict to
  // bare paths (no fragment) to avoid touching anchors-in-page like
  // /blog/x#section, which would still resolve fine if the page exists.
  // For drafted-page links we strip regardless of fragment.
  // Pattern: [text](/blog/...) with optional trailing slash and optional #frag
  const LINK_RE = /\[([^\]]+)\]\((\/blog\/[^\s)#]+)(\/?)(#[^\s)]+)?\)/g;

  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    if (isDraft(raw)) continue; // only touch published posts
    scannedFiles++;

    let changed = false;
    const next = raw.replace(LINK_RE, (match, text, path, trailingSlash, frag) => {
      // Normalize candidate to a slug — strip trailing slash
      const candidate = path.replace(/\/$/, '');
      if (!draftedSlugs.has(candidate)) return match; // healthy link, keep
      strippedLinks++;
      changed = true;
      if (examples.length < 8) {
        examples.push({ file: f.slice(BLOG_ROOT.length + 1), text, path });
      }
      return text;
    });

    if (changed) {
      touchedFiles++;
      if (!DRY_RUN) writeFileSync(f, next);
    }
  }

  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY'}`);
  console.log(`Scanned (published) files: ${scannedFiles}`);
  console.log(`Files touched: ${touchedFiles}`);
  console.log(`Links stripped: ${strippedLinks}`);
  if (examples.length) {
    console.log('');
    console.log('Sample strips:');
    for (const e of examples) {
      console.log(`  ${e.file}`);
      console.log(`    [${e.text}](${e.path})  →  ${e.text}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
