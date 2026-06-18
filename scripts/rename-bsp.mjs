#!/usr/bin/env node
// Rename BSP Development titles.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DIR = join(REPO_ROOT, 'src', 'content', 'blog', 'embedded', 'bsp');
const DRY = process.argv.includes('--dry-run');

const PLAN = [
  [ 1, 'chapter01-what-is-bsp.md',            'BSP의 본질 분해 — 새 보드 부팅을 위한 코드의 자리',                             '2026-05-18T09:01:00'],
  [ 2, 'chapter02-datasheet.md',              'SoC 데이터시트 읽기 — Pin Mux·Clock·Memory Map 파악법',                          '2026-05-18T09:02:00'],
  [ 3, 'chapter03-device-tree-design.md',     '새 보드 Device Tree 설계 — node·property·phandle 작성 흐름',                     '2026-05-18T09:03:00'],
  [ 4, 'chapter04-pinmux-clock.md',           'Pin Mux와 Clock Tree 분석 — 보드 부팅의 첫 두 관문',                              '2026-05-18T09:04:00'],
  [ 5, 'chapter05-ddr-params.md',             'DDR 매개변수 결정 — 보드별 Timing·Training 추출',                                 '2026-05-18T09:05:00'],
  [ 6, 'chapter06-u-boot-porting.md',         'U-Boot 새 보드 포팅 — defconfig·board.c·DTS 작성 흐름',                            '2026-05-18T09:06:00'],
  [ 7, 'chapter07-tfa-trustzone.md',          'TF-A·TrustZone 통합 — BL31·secure world·SMC 흐름 적용',                            '2026-05-18T09:07:00'],
  [ 8, 'chapter08-kernel-config.md',          'Linux 커널 BSP 설정 — defconfig·Kconfig·DT 통합',                                  '2026-05-18T09:08:00'],
  [ 9, 'chapter09-smp-bringup.md',            'Multi-core SMP Bring-up — PSCI·Secondary CPU 깨우기',                              '2026-05-18T09:09:00'],
  [10, 'chapter10-first-boot.md',             '첫 부팅 추적 — 0%부터 login prompt까지의 단계 분석',                              '2026-05-18T09:10:00'],
  [11, 'chapter11-bootlog-debugging.md',      '부트로그 디버깅 — earlyprintk·loglevel·serial 추적',                                '2026-05-18T09:11:00'],
  [12, 'chapter12-driver-add.md',             'BSP 드라이버 추가 — 보드별 Peripheral 통합 흐름',                                   '2026-05-18T09:12:00'],
  [13, 'chapter13-power-management.md',       'BSP Power Management — Suspend/Resume·Runtime PM·Regulator',                       '2026-05-18T09:13:00'],
  [14, 'chapter14-thermal-watchdog.md',       'BSP Thermal과 Watchdog — Trip Point·Cooling Device·Hardware Reset',                '2026-05-18T09:14:00'],
  [15, 'chapter15-boot-time-optimization.md', 'BSP 부트 시간 최적화 — Bootchart·initcall_debug·Parallel Init',                    '2026-05-18T09:15:00'],
  [16, 'chapter16-rootfs.md',                 'BSP RootFS 통합 — Buildroot·Yocto와 보드별 패키지 묶기',                            '2026-05-18T09:16:00'],
  [17, 'chapter17-image-packaging.md',        'BSP 이미지 패키징 — Flash Layout·Partition·GPT 설계',                               '2026-05-18T09:17:00'],
  [18, 'chapter18-ota-recovery.md',           'BSP OTA와 Field Recovery — A/B 슬롯·롤백·BootCount',                                '2026-05-18T09:18:00'],
  [19, 'chapter19-stability-testing.md',      'BSP Stability Testing — Stress·Soak·Power Cycle 시나리오',                          '2026-05-18T09:19:00'],
  [20, 'chapter20-production.md',             'BSP 양산 환경 구축 — CI/CD·재현 가능 빌드·서명',                                    '2026-05-18T09:20:00'],
  [21, 'chapter21-maintenance.md',            'BSP 유지보수 — 업스트림 기여·커널 버전업·LTS 전략',                                  '2026-05-18T09:21:00'],
];

function applyEdit(filePath, newTitle, newDate) {
  const raw = readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`no frontmatter: ${filePath}`);
  const [, fm, body] = m;

  let newFm = fm;
  newFm = newFm.replace(/^title:\s*.*$/m, `title: "${newTitle}"`);
  newFm = newFm.replace(/^date:\s*.*$/m, `date: ${newDate}`);

  const out = `---\n${newFm}\n---\n${body}`;
  if (!DRY) writeFileSync(filePath, out);
}

let count = 0;
for (const [order, file, title, date] of PLAN) {
  const path = join(DIR, file);
  applyEdit(path, title, date);
  count++;
}
console.log(`${DRY ? 'DRY RUN' : 'APPLIED'}: ${count} files`);
