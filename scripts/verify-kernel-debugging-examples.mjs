#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const defaults = Array.from({ length: 9 }, (_, i) =>
  `src/content/blog/tools/debugging/kernel/chapter${String(i + 1).padStart(2, '0')}-${[
    'user-kernel-boundary', 'printk-dmesg', 'ftrace-tracepoints', 'ebpf-kernel',
    'kdb-kgdb', 'crash-drgn', 'panic-oops', 'cxl-driver-debug', 'drivers-cxl-walkthrough',
  ][i]}.md`);
const paths = process.argv.slice(2).length ? process.argv.slice(2) : defaults;
const scores = JSON.parse(readFileSync('reports/adsense-audit/published-scores.json', 'utf8'));
const scoreByPath = new Map(scores.articles.map((row) => [row.path, row]));
const checksByChapter = [
  (s) => { assert.match(s, /\| 8 \| A \|/); assert.match(s, /\| 19 \| J \|/); assert.doesNotMatch(s, /\| 9 \| A \|/); },
  (s) => { assert.match(s, /5초 간격, burst 10회/); assert.match(s, /printk_ratelimited/); },
  (s) => { assert.match(s, /set_ftrace_filter/); assert.match(s, /trace-cmd extract -i vmcore`는 일반적인 vmcore 변환 명령이 아닙니다/); },
  (s) => { assert.doesNotMatch(s, /args->/); assert.match(s, /args\.filename/); assert.match(s, /args\.error_code/); },
  (s) => { assert.doesNotMatch(s, /kgdbwait kgdboe=/); assert.match(s, /kgdboc=ttyS1,115200 kgdbwait/); },
  (s) => { assert.match(s, /drgn -c .*vmcore/); assert.match(s, /prog\.stack_trace/); assert.equal(0xffffffffc0123456n - 0xffffffffc0123410n, 0x46n); },
  (s) => { assert.match(s, /scripts\/faddr2line/); assert.match(s, /my_function\+0x42\/0x80/); },
  (s) => { assert.match(s, /@seen\[tid\]/); assert.match(s, /retval < 0/); assert.match(s, /delete\(@op\[tid\]\)/); },
  (s) => { assert.match(s, /v7\.3-rc6/); assert.match(s, /subsys_initcall\(efisubsys_init\)/); assert.match(s, /cxl_internal_send_cmd/); },
];
const results = [];
for (const [index, relativePath] of paths.entries()) {
  const path = resolve(relativePath);
  const current = readFileSync(path, 'utf8');
  const baseline = execFileSync('git', ['show', `HEAD:${relativePath}`], { encoding: 'utf8' });
  const row = scoreByPath.get(relativePath);
  assert(row, `score ledger row missing: ${relativePath}`);
  const hash = (text) => createHash('sha256').update(text).digest('hex');
  assert.equal(hash(baseline), row.sourceSha256, `HEAD differs from score snapshot: ${relativePath}`);
  const frontmatter = (text) => text.match(/^---\n([\s\S]*?)\n---/)[1];
  const fields = ['slug', 'date', 'series', 'seriesOrder', 'draft'];
  for (const field of fields) {
    const re = new RegExp(`^${field}:\\s*(.+)$`, 'm');
    assert.equal(frontmatter(current).match(re)?.[1], frontmatter(baseline).match(re)?.[1], `${field} changed: ${relativePath}`);
  }
  checksByChapter[index](current);
  const fences = current.match(/^```/gm) ?? [];
  assert.equal(fences.length % 2, 0, `unbalanced code fences: ${relativePath}`);
  results.push({ path: relativePath, beforeSha256: hash(baseline), afterSha256: hash(current), status: 'PASS', checks: ['score-snapshot-baseline', 'url-date-series-order-draft-preserved', 'chapter-specific-factual-invariants', 'balanced-code-fences'], codeExecution: 'NOT_RUN: requires Linux kernel tracing/debugging tools or target system; static checks are not runtime validation' });
}
process.stdout.write(`${JSON.stringify({ verifier: 'scripts/verify-kernel-debugging-examples.mjs', scope: paths, results, failures: 0 }, null, 2)}\n`);
