#!/usr/bin/env node
// Mark book-derived and standards-walkthrough posts as draft for AdSense compliance.
// Usage:
//   node scripts/bulk-draft.mjs            # apply changes
//   node scripts/bulk-draft.mjs --dry-run  # report only

import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const BLOG_ROOT = join(REPO_ROOT, 'src', 'content', 'blog');
const DRY_RUN = process.argv.includes('--dry-run');

// Series that are book-derived or external-standard walkthroughs.
// Anything matching here → draft. Plus all `type: book-review` posts.
const DROP_SERIES = new Set([
  // Book-derived (tech-typed but still book summaries)
  'The Pragmatic Programmer',
  'GoF Design Patterns',
  'Growing Object-Oriented Software',
  'Linear Algebra',
  'Khorikov Unit Testing',
  'C++ Concurrency in Action',
  'Mastering the FreeRTOS Real Time Kernel',
  'Effective Modern C++',
  'BoW 개요',
  'Set Theory',
  'Agile & Lean Software Engineering',

  // External standards / style guides
  'UML 2.5.1',
  'MISRA C',
  'CERT C',
  'AUTOSAR C++14',
  'JSF C++',
  'DO-178C',
  'Google C++ Style',
  'ECSS-Q-ST-80C',
  'Linux Kernel Coding Style',
  'Python Style Guide (PEP 8)',
  'NASA JPL Power of 10',
]);

// Series we explicitly keep — used only for the final report.
const KEEP_SERIES = new Set([
  'Modern Embedded Recipes',
  'Embedded Performance Engineering',
  'Practical RTOS Internals',
  'Embedded C++ for Real Systems',
  'Bootloader Internals',
  'BSP Development',
  'Buildroot Practical',
  'Industrial Ethernet 심화',
  'ESP32-C3 Mastering',
  'Embedded Security',
  'HBM·GDDR 심화',
  'Driver-RTL Co-simulation',
  'DWARF and ELF Internals',
  'GDB and LLDB',
  'CMake',
  'Kernel Debugging',
  'Embedded Debugging',
  'GNU Make',
  'GDB Extension and IDE',
  'Valgrind',
  'Sanitizers',
  'Python Debugging',
  'Memory Diagnostics',
  'Postmortem Debugging',
  'Folly Code Review',
  'Abseil Code Review',
]);

// Extract a frontmatter field value. Handles `key: value`, `key: "value"`, `key: 'value'`.
function getField(fm, key) {
  const re = new RegExp(`^${key}:\\s*(.*)$`, 'm');
  const m = fm.match(re);
  if (!m) return null;
  let v = m[1].trim();
  // Strip wrapping quotes — handle matched quotes, and also the malformed
  // `'value"` mixed-quote case that exists in some legacy frontmatters.
  if (v.length >= 2) {
    const first = v[0];
    const last = v[v.length - 1];
    if ((first === '"' || first === "'") && (last === '"' || last === "'")) {
      v = v.slice(1, -1);
    }
  }
  return v;
}

// Replace draft: false → draft: true, or insert draft: true if missing.
function applyDraftTrue(fm) {
  if (/^draft:\s*true\s*$/m.test(fm)) return { fm, changed: false };
  if (/^draft:\s*false\s*$/m.test(fm)) {
    return { fm: fm.replace(/^draft:\s*false\s*$/m, 'draft: true'), changed: true };
  }
  // No draft field — insert before the closing --- of frontmatter
  return { fm: fm.trimEnd() + '\ndraft: true\n', changed: true };
}

async function main() {
  const files = [];
  for await (const entry of glob('**/*.{md,mdx}', { cwd: BLOG_ROOT })) {
    files.push(join(BLOG_ROOT, entry));
  }

  const stats = {
    total: files.length,
    alreadyDraft: 0,
    droppedByType: 0,
    droppedBySeries: new Map(),
    keptBySeries: new Map(),
    keptOther: 0,
    changedFiles: 0,
    skippedNoFrontmatter: 0,
  };

  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) {
      stats.skippedNoFrontmatter++;
      continue;
    }
    const [, fm, body] = m;
    const draft = getField(fm, 'draft');
    const type = getField(fm, 'type') ?? 'tech';
    const series = getField(fm, 'series');

    const isAlreadyDraft = draft === 'true';
    if (isAlreadyDraft) stats.alreadyDraft++;

    let shouldDraft = false;
    let reason = '';
    if (type === 'book-review') {
      shouldDraft = true;
      reason = 'book-review';
    } else if (series && DROP_SERIES.has(series)) {
      shouldDraft = true;
      reason = `series:${series}`;
    }

    if (shouldDraft) {
      if (reason === 'book-review') stats.droppedByType++;
      else {
        const k = reason.slice('series:'.length);
        stats.droppedBySeries.set(k, (stats.droppedBySeries.get(k) || 0) + 1);
      }

      if (isAlreadyDraft) continue; // nothing to do

      const { fm: newFm, changed } = applyDraftTrue(fm);
      if (changed) {
        stats.changedFiles++;
        if (!DRY_RUN) {
          const out = `---\n${newFm}\n---\n${body}`;
          writeFileSync(file, out);
        }
      }
    } else if (!isAlreadyDraft) {
      // This post stays published
      if (series) {
        stats.keptBySeries.set(series, (stats.keptBySeries.get(series) || 0) + 1);
      } else {
        stats.keptOther++;
      }
    }
  }

  const totalKept = [...stats.keptBySeries.values()].reduce((a, b) => a + b, 0) + stats.keptOther;
  const totalDroppedSeries = [...stats.droppedBySeries.values()].reduce((a, b) => a + b, 0);

  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY'}`);
  console.log(`Total files scanned: ${stats.total}`);
  console.log(`Files without frontmatter: ${stats.skippedNoFrontmatter}`);
  console.log(`Files changed: ${stats.changedFiles}`);
  console.log('');
  console.log(`=== Drafted ===`);
  console.log(`  type:book-review: ${stats.droppedByType}`);
  console.log(`  by series:`);
  for (const [s, n] of [...stats.droppedBySeries.entries()].sort((a, b) => b[1] - a[1])) {
    const flag = KEEP_SERIES.has(s) ? '  <!! IN KEEP LIST !!>' : '';
    console.log(`    ${n.toString().padStart(4)}  ${s}${flag}`);
  }
  console.log(`  total drafted by series: ${totalDroppedSeries}`);
  console.log(`  grand total drafted: ${stats.droppedByType + totalDroppedSeries}`);
  console.log('');
  console.log(`=== Kept (published) ===`);
  for (const [s, n] of [...stats.keptBySeries.entries()].sort((a, b) => b[1] - a[1])) {
    const flag = KEEP_SERIES.has(s) ? '' : '  <!! NOT IN KEEP LIST !!>';
    console.log(`    ${n.toString().padStart(4)}  ${s}${flag}`);
  }
  if (stats.keptOther > 0) console.log(`    ${stats.keptOther.toString().padStart(4)}  (no series)`);
  console.log(`  grand total kept: ${totalKept}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
