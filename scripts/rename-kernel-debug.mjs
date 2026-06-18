#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'blog', 'tools', 'debugging', 'kernel');
const DRY = process.argv.includes('--dry-run');

const PLAN = [
  [ 1, 'chapter01-user-kernel-boundary.md', '리눅스 커널 디버깅 개론 — User/Kernel 경계와 도구 선택',                  '2026-05-25T09:01:00'],
  [ 2, 'chapter02-printk-dmesg.md',         'printk·dmesg·dynamic_debug 분석 — 커널 로그 추적',                          '2026-05-25T09:02:00'],
  [ 3, 'chapter03-ftrace-tracepoints.md',   'ftrace와 tracepoints 활용 — 커널 함수 호출 트레이싱',                      '2026-05-25T09:03:00'],
  [ 4, 'chapter04-ebpf-kernel.md',          'eBPF·bpftrace로 커널 디버깅 — 동적 관측의 신세대',                          '2026-05-25T09:04:00'],
  [ 5, 'chapter05-kdb-kgdb.md',             'kdb·kgdb 인터랙티브 커널 디버깅 — Source-level Step·Breakpoint',            '2026-05-25T09:05:00'],
  [ 6, 'chapter06-crash-drgn.md',           'crash와 drgn 분석 — vmcore에서 커널 상태 복원하기',                          '2026-05-25T09:06:00'],
  [ 7, 'chapter07-panic-oops.md',           'Kernel Panic·Oops 메시지 해석 — Decoder Ring 만들기',                       '2026-05-25T09:07:00'],
];

function applyEdit(filePath, newTitle, newDate) {
  const raw = readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const [, fm, body] = m;
  let newFm = fm.replace(/^title:\s*.*$/m, `title: "${newTitle}"`).replace(/^date:\s*.*$/m, `date: ${newDate}`);
  if (!DRY) writeFileSync(filePath, `---\n${newFm}\n---\n${body}`);
}

let count = 0;
for (const [, file, title, date] of PLAN) { applyEdit(join(DIR, file), title, date); count++; }
console.log(`${DRY ? 'DRY RUN' : 'APPLIED'}: ${count} files`);
