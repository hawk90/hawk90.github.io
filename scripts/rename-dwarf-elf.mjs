#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'blog', 'tools', 'debugging', 'dwarf-elf');
const DRY = process.argv.includes('--dry-run');

const PLAN = [
  [ 1, 'chapter01-elf-overview.md',         'ELF 포맷 분해 — Section·Segment·Symbol Table 구조 추적',                     '2026-05-23T09:01:00'],
  [ 2, 'chapter02-dwarf-overview.md',       'DWARF 디버그 정보 분해 — DIE 트리와 .debug_abbrev',                           '2026-05-23T09:02:00'],
  [ 3, 'chapter03-debug-line.md',           'DWARF .debug_line 분석 — Source-to-PC 매핑 바이트코드 VM',                    '2026-05-23T09:03:00'],
  [ 4, 'chapter04-debug-loc.md',            'DWARF .debug_loc 분석 — Variable Location Expression VM',                     '2026-05-23T09:04:00'],
  [ 5, 'chapter05-cfi-eh-frame.md',         'DWARF Call Frame Information — .debug_frame과 .eh_frame 분해',                '2026-05-23T09:05:00'],
  [ 6, 'chapter06-split-dwarf-tools.md',    'DWARF 도구 생태계 — split-DWARF·dwz·debuginfod·pyelftools',                    '2026-05-23T09:06:00'],
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
