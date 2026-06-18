#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'blog', 'tools', 'emulation', 'driver-cosim');
const DRY = process.argv.includes('--dry-run');

const PLAN = [
  [ 1, 'chapter01-why-cosim.md',     'Pre-Silicon Driver Verification — RTL Co-simulation이 푸는 문제',                  '2026-05-22T09:01:00'],
  [ 2, 'chapter02-dpi-c-basics.md',  'SystemVerilog DPI-C 기초 — C와 RTL을 잇는 표준 인터페이스',                         '2026-05-22T09:02:00'],
  [ 3, 'chapter03-verilator.md',     'Verilator 분석 — Open Source SystemVerilog Simulator',                              '2026-05-22T09:03:00'],
  [ 4, 'chapter04-cocotb.md',        'CocoTB 분석 — Python으로 작성하는 RTL Testbench',                                    '2026-05-22T09:04:00'],
  [ 5, 'chapter05-systemc-tlm.md',   'SystemC TLM 분석 — Transaction-Level Modeling으로 빠른 검증',                       '2026-05-22T09:05:00'],
  [ 6, 'chapter06-bfm.md',           'C로 구현하는 Bus Functional Model — Driver 검증용 BFM 설계',                         '2026-05-22T09:06:00'],
  [ 7, 'chapter07-uvm-c-model.md',   'UVM C Reference Model 통합 — DUT와 황금 모델 비교 검증',                              '2026-05-22T09:07:00'],
  [ 8, 'chapter08-end-to-end.md',    'End-to-End Driver + RTL Co-simulation — 실전 통합 흐름',                              '2026-05-22T09:08:00'],
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
