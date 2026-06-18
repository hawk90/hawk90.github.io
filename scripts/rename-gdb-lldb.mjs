#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'blog', 'tools', 'debugging', 'gdb-lldb');
const DRY = process.argv.includes('--dry-run');

const PLAN = [
  [ 1, 'chapter01-intro-and-install.md',        'GDB vs LLDB 분석 — 두 디버거의 설치·차이·선택 기준',                       '2026-05-24T09:01:00'],
  [ 2, 'chapter02-basic-commands.md',           'GDB·LLDB 기본 명령 — break·step·next·print 동작 비교',                      '2026-05-24T09:02:00'],
  [ 3, 'chapter03-inspecting-state.md',         '디버거로 상태 들여다보기 — 변수·메모리·레지스터·STL 추적',                  '2026-05-24T09:03:00'],
  [ 4, 'chapter04-backtrace-frames.md',         'GDB·LLDB Backtrace와 프레임 이동 — Call Stack 분석',                         '2026-05-24T09:04:00'],
  [ 5, 'chapter05-breakpoints-watchpoints.md',  'Breakpoint와 Watchpoint 분석 — Conditional·Hardware·Catchpoint',             '2026-05-24T09:05:00'],
  [ 6, 'chapter06-multithread-multiprocess.md', '멀티스레드·멀티프로세스 디버깅 — Non-Stop·Scheduler-Locking·Fork',           '2026-05-24T09:06:00'],
  [ 7, 'chapter07-core-dump.md',                'Core Dump 분석 기법 — gcore·coredumpctl·디버거 활용',                        '2026-05-24T09:07:00'],
  [ 8, 'chapter08-remote-debugging.md',         'GDB 원격 디버깅 — gdbserver·OpenOCD·J-Link 통합',                              '2026-05-24T09:08:00'],
  [ 9, 'chapter09-python-scripting.md',         'GDB·LLDB Python 스크립팅 — Pretty-Printer·Custom Command',                    '2026-05-24T09:09:00'],
  [10, 'chapter10-tui-frontends.md',            'GDB·LLDB TUI와 프런트엔드 — gdb-dashboard·gef·pwndbg·VS Code',                '2026-05-24T09:10:00'],
  [11, 'chapter11-practical-tips.md',           'GDB·LLDB 실전 팁 — STL·최적화 코드·시간 역행 디버깅',                         '2026-05-24T09:11:00'],
  [12, 'chapter12-dwarf.md',                    'DWARF 디버그 정보 — 디버거가 변수와 라인을 찾는 방식',                        '2026-05-24T09:12:00'],
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
