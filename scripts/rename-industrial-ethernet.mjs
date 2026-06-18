#!/usr/bin/env node
// Rename Industrial Ethernet 심화 titles.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DIR = join(REPO_ROOT, 'src', 'content', 'blog', 'embedded', 'protocols', 'industrial-ethernet');
const DRY = process.argv.includes('--dry-run');

const PLAN = [
  [ 1, 'chapter01-overview.md',              '산업용 이더넷 분석 — 일반 이더넷과 결정성 요구의 차이',                       '2026-05-13T09:01:00'],
  [ 2, 'chapter02-realtime-requirements.md', '산업용 통신 실시간 요구사항 — Determinism·Jitter·Cycle Time',                    '2026-05-13T09:02:00'],
  [ 3, 'chapter03-ethercat-architecture.md', 'EtherCAT 아키텍처 분해 — Processing on the Fly 메커니즘',                          '2026-05-13T09:03:00'],
  [ 4, 'chapter04-ethercat-frame.md',        'EtherCAT 프레임 구조 분석 — Datagram·WKC·Address 모드',                            '2026-05-13T09:04:00'],
  [ 5, 'chapter05-ethercat-master.md',       'EtherCAT Master 구현 비교 — SOEM·IgH·TwinCAT 분석',                                 '2026-05-13T09:05:00'],
  [ 6, 'chapter06-profinet.md',              'PROFINET 개요 분석 — RT·IRT 클래스와 실시간 등급',                                  '2026-05-13T09:06:00'],
  [ 7, 'chapter07-profinet-io.md',           'PROFINET IO 모델 — Controller·Device·Supervisor 역할 추적',                         '2026-05-13T09:07:00'],
  [ 8, 'chapter08-tsn.md',                   'TSN 표준 분석 — IEEE 802.1 Time-Sensitive Networking 개요',                          '2026-05-13T09:08:00'],
  [ 9, 'chapter09-tsn-scheduling.md',        'TSN 스케줄링 메커니즘 — Qbv·Qbu·gPTP 동기화 분석',                                  '2026-05-13T09:09:00'],
  [10, 'chapter10-powerlink.md',             'POWERLINK과 OpenSAFETY 분석 — 산업 안전 통신 프로토콜',                              '2026-05-13T09:10:00'],
  [11, 'chapter11-linux-realtime.md',        '리눅스 실시간 산업 통신 — PREEMPT_RT·EtherCAT Master 운영',                          '2026-05-13T09:11:00'],
  [12, 'chapter12-comparison.md',            '산업용 이더넷 프로토콜 비교 — EtherCAT·PROFINET·POWERLINK·TSN 선택',                 '2026-05-13T09:12:00'],
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
  console.log(`[Ch ${order.toString().padStart(2)}] ${file}`);
  console.log(`        → ${title}`);
  console.log(`        → date: ${date}`);
  applyEdit(path, title, date);
  count++;
}
console.log(`\n${DRY ? 'DRY RUN' : 'APPLIED'}: ${count} files`);
