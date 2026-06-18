#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'blog', 'tools', 'debugging', 'embedded');
const DRY = process.argv.includes('--dry-run');

const PLAN = [
  [ 1, 'chapter01-rsp-protocol.md',          'GDB Remote Serial Protocol 분석 — 디버거-타겟 통신 메커니즘',                 '2026-05-26T09:01:00'],
  [ 2, 'chapter02-jtag-swd-coresight.md',    'JTAG·SWD·CoreSight 분석 — ARM 디버그 인터페이스 비교',                       '2026-05-26T09:02:00'],
  [ 3, 'chapter03-openocd.md',               'OpenOCD 심화 분석 — Configuration·Adapter·Target 통합',                       '2026-05-26T09:03:00'],
  [ 4, 'chapter04-jlink.md',                 'J-Link 도구 체인 분석 — JLinkExe·RTT·GDB Server 활용',                         '2026-05-26T09:04:00'],
  [ 5, 'chapter05-elf-map.md',               'ELF와 MAP 파일 분석 — 베어메탈 메모리 레이아웃 추적',                          '2026-05-26T09:05:00'],
  [ 6, 'chapter06-trace.md',                 '임베디드 Trace 비교 — RTT·ITM·SWO·ETM·Semihosting 선택',                        '2026-05-26T09:06:00'],
  [ 7, 'chapter07-rtos-troubleshooting.md',  'RTOS-aware 디버깅과 트러블슈팅 — Task·Queue·Stack 분석',                      '2026-05-26T09:07:00'],
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
