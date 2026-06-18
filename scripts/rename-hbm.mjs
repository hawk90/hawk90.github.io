#!/usr/bin/env node
// Rename HBM·GDDR 심화 titles.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DIR = join(REPO_ROOT, 'src', 'content', 'blog', 'embedded', 'hardware', 'hbm');
const DRY = process.argv.includes('--dry-run');

const PLAN = [
  [1, 'chapter01-overview.md',             'HBM과 GDDR 분기점 분석 — Bandwidth·Capacity·Cost 트레이드오프',          '2026-05-16T09:01:00'],
  [2, 'chapter02-hbm-stack.md',            'HBM 3D 스택 구조 분해 — TSV·Microbump·Base Die의 역할',                  '2026-05-16T09:02:00'],
  [3, 'chapter03-hbm-generations.md',      'HBM2·HBM2E·HBM3·HBM3E 세대 비교 — JEDEC 표준 진화 흐름',                  '2026-05-16T09:03:00'],
  [4, 'chapter04-gddr.md',                 'GDDR6·GDDR6X·GDDR7 분석 — PAM 신호로 32 Gbps 도달한 경로',               '2026-05-16T09:04:00'],
  [5, 'chapter05-bandwidth-bottleneck.md', '메모리 대역폭 병목 분석 — Theoretical vs Achievable·Roofline·Memory Wall', '2026-05-16T09:05:00'],
  [6, 'chapter06-thermal-power.md',        'HBM 열 설계와 전력 관리 — Stack 열 부하·Refresh Cost·냉각 솔루션',         '2026-05-16T09:06:00'],
  [7, 'chapter07-memory-controller.md',    'HBM 메모리 컨트롤러 분석 — Bank·Row·Column·Address Mapping·Scheduling',   '2026-05-16T09:07:00'],
  [8, 'chapter08-npu-gpu-usage.md',        'NPU·GPU에서의 HBM 활용 — Weight·Activation·KV Cache 배치 분석',           '2026-05-16T09:08:00'],
];

function applyEdit(filePath, newTitle, newDate) {
  const raw = readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`no frontmatter: ${filePath}`);
  const [, fm, body] = m;

  let newFm = fm;
  newFm = newFm.replace(/^title:\s*.*$/m, `title: "${newTitle}"`);
  newFm = newFm.replace(/^date:\s*.*$/m, `date: ${newDate}`);

  if (!/^title:/m.test(newFm) || !/^date:/m.test(newFm)) {
    throw new Error(`missing title/date after replace: ${filePath}`);
  }

  const out = `---\n${newFm}\n---\n${body}`;
  if (!DRY) writeFileSync(filePath, out);
}

let count = 0;
for (const [order, file, title, date] of PLAN) {
  const path = join(DIR, file);
  console.log(`[Ch ${order}] ${file}`);
  console.log(`        → ${title}`);
  console.log(`        → date: ${date}`);
  applyEdit(path, title, date);
  count++;
}
console.log(`\n${DRY ? 'DRY RUN' : 'APPLIED'}: ${count} files`);
