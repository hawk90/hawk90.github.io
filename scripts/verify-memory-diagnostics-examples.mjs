#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paths = [
  'src/content/blog/tools/debugging/memory/chapter01-memory-accounting.md',
  'src/content/blog/tools/debugging/memory/chapter02-heaptrack.md',
  'src/content/blog/tools/debugging/memory/chapter03-jemalloc-tcmalloc.md',
  'src/content/blog/tools/debugging/memory/chapter04-glibc-tools.md',
  'src/content/blog/tools/debugging/memory/chapter05-prod-leak-diagnosis.md',
  'src/content/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics.md',
  'src/content/blog/tools/debugging/memory/chapter07-tiered-memory-diagnostics.md',
];

function codeBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let open = null;
  let body = [];
  for (const line of lines) {
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!open && fence) {
      open = { marker: fence[1][0], length: fence[1].length, language: fence[2].trim() };
      body = [];
    } else if (open && fence && fence[1][0] === open.marker && fence[1].length >= open.length && !fence[2].trim()) {
      blocks.push({ language: open.language, body: body.join('\n') });
      open = null;
      body = [];
    } else if (open) {
      body.push(line);
    }
  }
  return blocks;
}

function validate({ ch1, ch2, ch3, ch4, ch5, ch6, ch7 }) {
  const errors = [];
  const requireText = (name, text, pattern, message) => {
    if (!pattern.test(text)) errors.push(`${name}: ${message}`);
  };
  const requireBlock = (name, text, pattern, message) => {
    if (!codeBlocks(text).some(({ body }) => pattern.test(body))) errors.push(`${name}: ${message}`);
  };

  requireText('chapter01', ch1, /PSS는 공유 매핑을 나눈[\s\S]{0,80}시스템 전체 회계와는 같지는 않습니다|커널 메모리와 회수 가능한 page cache까지 포함한 시스템 전체 사용량과 같지는 않습니다/, 'PSS must be bounded as process-mapping accounting.');
  requireText('chapter02', ch2, /unstable[\s\S]{0,160}crash/i, 'attach limitations must be disclosed.');
  requireText('chapter02', ch2, /해제되지 않았다는 사실만으로 논리적 누수가 확정되지는 않음/, 'outstanding allocations must not be equated with logical leaks.');
  requireText('chapter03', ch3, /같은 조건으로 측정합니다/, 'allocator selection must require representative comparison.');
  requireText('chapter03', ch3, /프로파일링은 샘플링과 backtrace 비용/, 'profiler overhead must be disclosed.');
  requireBlock('chapter04', ch4, /LD_PRELOAD=libc_malloc_debug\.so\s+MALLOC_CHECK_=/, 'MALLOC_CHECK_ example must preload the debug library.');
  requireText('chapter04', ch4, /LD_PRELOAD=libc_malloc_debug\.so`와 `MALLOC_TRACE`/, 'mtrace runtime requirements must be stated.');
  requireBlock('chapter05', ch5, /some 150000 1000000/, 'PSI trigger example must retain documented resource/window arguments.');
  requireText('chapter05', ch5, /ru_maxrss`는 현재 RSS가 아니라 최대 RSS/, 'ru_maxrss must not be described as current RSS.');
  requireText('chapter06', ch6, /damo report access` 결과만으로 CXL tier의 효율이나 promotion 성공을 판정하지 않습니다/, 'DAMON access data must not alone prove tier placement/success.');
  if (!codeBlocks(ch7).some(({ body }) => body.includes('tracepoint:migrate:mm_migrate_pages') && body.includes('args->succeeded') && body.includes('args->failed'))) {
    errors.push('chapter07: bpftrace example must use fields present in the migration tracepoint.');
  }
  requireText('chapter07', ch7, /source\/destination node 쌍은 제공하지 않습니다/, 'migration tracepoint must not imply node direction.');
  requireText('chapter07', ch7, /특정 애플리케이션 종류에 보편적인/, 'workload settings must not claim universal recommended values.');

  const traceBlocks = codeBlocks(ch7).filter(({ body }) => body.includes('tracepoint:migrate:mm_migrate_pages'));
  if (traceBlocks.some(({ body }) => /args->(?:from_node|to_node|nr_pages)/.test(body))) {
    errors.push('chapter07: bpftrace example refers to fields absent from the cited tracepoint.');
  }
  return errors;
}

const docs = await Promise.all(paths.map(async (articlePath) => readFile(path.join(root, articlePath), 'utf8')));
const articles = Object.fromEntries(docs.map((doc, index) => [`ch${index + 1}`, doc]));
const errors = validate(articles);
assert.deepEqual(errors, [], errors.join('\n'));

// Negative fixtures exercise three guards. These mutations are in-memory only.
const noDebugPreload = { ...articles, ch4: articles.ch4.replaceAll('LD_PRELOAD=libc_malloc_debug.so ', '') };
assert(validate(noDebugPreload).some((error) => error.includes('MALLOC_CHECK_ example must preload')));
const inventedMigrationFields = { ...articles, ch7: articles.ch7.replace('args->succeeded', 'args->from_node') };
assert(validate(inventedMigrationFields).some((error) => error.includes('fields absent from the cited tracepoint')));
const overclaimedPss = { ...articles, ch1: articles.ch1.replace('프로세스들의 PSS 합은 프로세스 매핑 회계에 유용하지만 커널 메모리와 회수 가능한 page cache까지 포함한 시스템 전체 사용량과 같지는 않습니다.', 'PSS is the exact system-wide total.') };
assert(validate(overclaimedPss).some((error) => error.includes('PSS must be bounded')));

console.log(`PASS: ${paths.length} article-scoped semantic checks; 3 injected negative fixtures rejected.`);
console.log('Scope: selected named examples and guard phrases only; not a complete article fact-check or Linux execution.');
