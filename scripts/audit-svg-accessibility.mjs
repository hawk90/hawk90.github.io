#!/usr/bin/env node

// Check SVG title/description metadata. The default is read-only; pass --apply
// only after reviewing the proposed filenames and keeping the generated SVGs in
// the same source-controlled directory.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { relative } from 'node:path';

const root = 'public/images/blog';
const apply = process.argv.includes('--apply');
const files = [];

async function walk(dir) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await walk(file);
    else if (entry.isFile() && entry.name.endsWith('.svg')) files.push(file);
  }
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fallbackTitle(file) {
  return file.split('/').pop().replace(/\.svg$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

await walk(root);
const missing = [];
for (const file of files) {
  const source = await readFile(file, 'utf8');
  const hasTitle = /<title(?:\s[^>]*)?>[\s\S]*?<\/title>/i.test(source);
  const hasDesc = /<desc(?:\s[^>]*)?>[\s\S]*?<\/desc>/i.test(source);
  if (hasTitle && hasDesc) continue;
  missing.push({ file: relative('.', file), hasTitle, hasDesc });
  if (!apply) continue;
  const open = source.match(/<svg\b[^>]*>/i);
  if (!open) continue;
  const title = escapeXml(fallbackTitle(file));
  const additions = `${hasTitle ? '' : `\n  <title>${title}</title>`}${hasDesc ? '' : `\n  <desc>Diagram: ${title}</desc>`}`;
  await writeFile(file, source.slice(0, open.index + open[0].length) + additions + source.slice(open.index + open[0].length));
}

console.log(`SVG accessibility: ${files.length} scanned; ${missing.length} missing title/desc; mode=${apply ? 'apply' : 'check'}.`);
if (missing.length && !apply) {
  console.log('Use --apply only after review; no files were modified.');
  for (const row of missing.slice(0, 20)) console.log(`- ${row.file} (${row.hasTitle ? 'desc' : 'title'} missing)`);
  if (missing.length > 20) console.log(`- … +${missing.length - 20} more`);
}
