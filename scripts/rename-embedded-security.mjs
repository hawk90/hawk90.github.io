#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'blog', 'embedded', 'embedded-security');
const DRY = process.argv.includes('--dry-run');

const PLAN = [
  [ 1, 'chapter01-threat-model.md',     '임베디드 보안 위협 모델 — STRIDE·DFD·자산 식별 흐름',                           '2026-05-21T09:01:00'],
  [ 2, 'chapter02-secure-boot.md',      'Secure Boot 분석 — 부트 체인 서명 검증과 RoT 구축',                              '2026-05-21T09:02:00'],
  [ 3, 'chapter03-mcu-crypto.md',       'MCU Crypto HW Accelerator 분석 — AES·SHA·ECC 가속기',                            '2026-05-21T09:03:00'],
  [ 4, 'chapter04-trustzone.md',        'ARM TrustZone 분석 — Cortex-A·Cortex-M 격리 메커니즘',                           '2026-05-21T09:04:00'],
  [ 5, 'chapter05-tee.md',              'TEE 비교 분석 — OP-TEE·ARM CCA·SGX',                                              '2026-05-21T09:05:00'],
  [ 6, 'chapter06-ota-update.md',       'OTA Update 보안 — 서명·Rollback 방지·롤백 카운터',                                '2026-05-21T09:06:00'],
  [ 7, 'chapter07-side-channel.md',     '임베디드 Side-channel 공격 — Power·Timing·EM 분석',                                '2026-05-21T09:07:00'],
  [ 8, 'chapter08-iot-standards.md',    'IoT 보안 표준 비교 — ETSI EN 303 645·IEC 62443·NIST 8259·EU CRA',                  '2026-05-21T09:08:00'],
  [ 9, 'chapter09-firmware-analysis.md','펌웨어 분석과 리버싱 — Binwalk·Ghidra·radare2 활용',                                '2026-05-21T09:09:00'],
  [10, 'chapter10-sdlc.md',             '임베디드 보안 개발 라이프사이클 — Secure SDLC 적용',                                '2026-05-21T09:10:00'],
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
