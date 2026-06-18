#!/usr/bin/env node
// Rename Bootloader Internals chapter titles to descriptive, original-analysis style.
// Also normalize invalid hour fields (e.g., 33:00:00).
//
// Usage:
//   node scripts/rename-bootloader.mjs --dry-run
//   node scripts/rename-bootloader.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DIR = join(REPO_ROOT, 'src', 'content', 'blog', 'embedded', 'bootloader');
const DRY = process.argv.includes('--dry-run');

// seriesOrder → { file, newTitle, newDate }
const PLAN = [
  [ 1, 'chapter01-boot-problem.md',          'ROM부터 init까지 — 임베디드 부팅 단계의 빈자리 분석',                          '2026-05-09T09:01:00'],
  [ 2, 'chapter02-u-boot-position.md',       'Das U-Boot vs TF-A vs EDK II — 임베디드 부트로더 생태계 비교',                  '2026-05-09T09:02:00'],
  [ 3, 'chapter03-build-system.md',          'U-Boot 빌드 시스템 분석 — Kconfig·Makefile·defconfig 동작 추적',                '2026-05-09T09:03:00'],
  [ 4, 'chapter04-boot-stages.md',           'ARM 임베디드 부트 4단계 분해 — BL1·SPL·TPL·U-Boot Proper의 역할',               '2026-05-09T09:04:00'],
  [ 5, 'chapter05-falcon-mode.md',           'U-Boot Falcon Mode — SPL이 U-Boot Proper 없이 커널 직접 부팅',                  '2026-05-09T09:05:00'],
  [ 6, 'chapter06-device-tree.md',           'Device Tree DTB 부트로더 처리 — 로딩 시점과 fixup 메커니즘 추적',                '2026-05-09T09:06:00'],
  [ 7, 'chapter07-driver-model.md',          'U-Boot Driver Model 내부 — uclass·driver·device 추상화 구조',                   '2026-05-09T09:07:00'],
  [ 8, 'chapter08-board-init.md',            'U-Boot 보드 초기화 시퀀스 — board_init_f와 board_init_r 분리 이유',              '2026-05-09T09:08:00'],
  [ 9, 'chapter09-dram-init.md',             'DDR Controller 프로그래밍과 PHY Training — SPL의 가장 어려운 작업',              '2026-05-09T09:09:00'],
  [10, 'chapter10-storage-boot.md',          '임베디드 스토리지 부팅 분석 — MMC·SCSI·NAND·SPI Flash 비교',                    '2026-05-09T09:10:00'],
  [11, 'chapter11-network-boot.md',          '임베디드 네트워크 부팅 — TFTP·PXE·BOOTP 시퀀스 분석',                            '2026-05-09T09:11:00'],
  [12, 'chapter12-usb-boot.md',              'U-Boot USB 부팅 — fastboot·UMS·USB host 메커니즘',                              '2026-05-09T09:12:00'],
  [13, 'chapter13-env-bootcmd.md',           'U-Boot 환경 변수와 bootcmd — 부팅 시나리오 정의하기',                            '2026-05-09T09:13:00'],
  [14, 'chapter14-bootflow-bootmeth.md',     'Modern U-Boot bootflow / bootmeth — 새 추상화 레이어 분석',                       '2026-05-09T09:14:00'],
  [15, 'chapter15-fit-image.md',             'FIT image 구조 분석 — multi-image·hash·configuration 추적',                      '2026-05-09T09:15:00'],
  [16, 'chapter16-verified-boot.md',         'U-Boot Verified Boot — RSA 서명과 public key 임베딩 흐름',                       '2026-05-09T09:16:00'],
  [17, 'chapter17-ab-update.md',             '임베디드 A/B 부팅 이중화 — OTA 안전성을 위한 부트 슬롯 설계',                     '2026-05-09T09:17:00'],
  [18, 'chapter18-efi-in-uboot.md',          'U-Boot의 EFI 호환 분석 — bootefi 명령과 EFI loader 동작 원리',                   '2026-05-09T09:18:00'],
  [19, 'chapter19-kernel-handoff.md',        'Linux Boot ABI — ARM/ARM64 커널 진입 규약 추적',                                 '2026-05-09T09:19:00'],
  [20, 'chapter20-rauc-swupdate.md',         '임베디드 펌웨어 업데이트 — RAUC vs SWUpdate 비교',                               '2026-05-09T09:20:00'],
  [21, 'chapter21-board-porting.md',         '새 보드 U-Boot 포팅 실전 — defconfig 작성부터 첫 부팅까지',                       '2026-05-09T09:21:00'],
  [22, 'chapter22-debugging.md',             '부트로더 디버깅 기법 — DEBUG·JTAG·serial·post-mortem 분석',                      '2026-05-09T09:22:00'],
  [23, 'chapter23-bootrom-efuse-otp.md',     'SoC BootROM·eFuse·OTP — 부팅의 0단계 분석',                                       '2026-05-19T09:23:00'],
  [24, 'chapter24-spl-deep.md',              'SPL·TPL 내부 해부 — 가장 작은 부트 단계의 동작 추적',                             '2026-05-19T09:24:00'],
  [25, 'chapter25-tfa-optee.md',             'ARM Trusted Firmware-A 통합 — BL1·BL2·BL31·BL32·BL33 흐름',                       '2026-05-19T09:25:00'],
  [26, 'chapter26-ddr-training.md',          'DDR Training과 PHY Calibration — 보드별 파라미터 튜닝',                            '2026-05-19T09:26:00'],
  [27, 'chapter27-chain-of-trust.md',        '임베디드 Chain of Trust — 다단계 서명 검증의 전체 흐름',                            '2026-05-19T09:27:00'],
  [28, 'chapter28-flash-layout.md',          '임베디드 Flash Layout 설계 — partition·NAND·eMMC·UBI 비교',                         '2026-05-19T09:28:00'],
  [29, 'chapter29-distro-boot.md',           'U-Boot Distro Boot — extlinux·boot.scr 표준화 분석',                                '2026-05-19T09:29:00'],
  [30, 'chapter30-bootloader-ci.md',         '부트로더 CI 구축 — build matrix와 자동 부팅 테스트',                                  '2026-05-19T09:30:00'],
  [31, 'chapter31-tfa-bl31-runtime.md',      'TF-A BL31 EL3 Runtime 분석 — PSCI·SDEI·RAS dispatcher 추적',                        '2026-05-22T09:31:00'],
  [32, 'chapter32-psci-smccc.md',            'PSCI와 SMCCC ABI — ARM 표준 SMC 호출 규약 분석',                                     '2026-05-22T09:32:00'],
  [33, 'chapter33-smp-secondary-cpu-bringup.md', 'ARM64 Secondary Core Bring-up — PSCI CPU_ON 호출부터 EL1 진입까지',              '2026-05-22T09:33:00'],
];

function applyEdit(filePath, newTitle, newDate) {
  const raw = readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`no frontmatter: ${filePath}`);
  const [, fm, body] = m;

  let newFm = fm;
  // title: must replace whole quoted value
  newFm = newFm.replace(/^title:\s*.*$/m, `title: "${newTitle}"`);
  // date: replace value
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
  console.log(`         → ${title}`);
  console.log(`         → date: ${date}`);
  applyEdit(path, title, date);
  count++;
}
console.log(`\n${DRY ? 'DRY RUN' : 'APPLIED'}: ${count} files`);
