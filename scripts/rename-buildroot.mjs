#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DIR = join(REPO_ROOT, 'src', 'content', 'blog', 'embedded', 'buildroot');
const DRY = process.argv.includes('--dry-run');

const PLAN = [
  [ 1, 'chapter01-problem.md',              'Buildroot가 푸는 문제 — Yocto와의 핵심 차이 분석',                           '2026-05-19T09:01:00'],
  [ 2, 'chapter02-directory-structure.md',  'Buildroot 디렉터리 구조 분해 — board·configs·dl·output',                      '2026-05-19T09:02:00'],
  [ 3, 'chapter03-kconfig.md',              'Buildroot Kconfig 설정 — menuconfig와 defconfig 작성',                         '2026-05-19T09:03:00'],
  [ 4, 'chapter04-first-build.md',          'Buildroot 첫 빌드 — QEMU에서 동작하는 시스템 만들기',                          '2026-05-19T09:04:00'],
  [ 5, 'chapter05-package-system.md',       'Buildroot 패키지 시스템 분석 — .mk와 Config.in 동작 추적',                     '2026-05-19T09:05:00'],
  [ 6, 'chapter06-br2-external.md',         'Buildroot 외부 트리 — BR2_EXTERNAL 구성과 활용',                               '2026-05-19T09:06:00'],
  [ 7, 'chapter07-board-customize.md',      'Buildroot 보드 Customize — overlay·post-build·post-image 흐름',                '2026-05-19T09:07:00'],
  [ 8, 'chapter08-filesystems.md',          'Buildroot 출력 파일시스템 — initramfs·squashfs·ext4·cpio 선택',                 '2026-05-19T09:08:00'],
  [ 9, 'chapter09-new-package.md',          'Buildroot 새 패키지 작성 — autotools·cmake·python 통합',                       '2026-05-19T09:09:00'],
  [10, 'chapter10-real-board.md',           'Buildroot 실전 — BeagleBone Black 시스템 처음부터 끝까지',                      '2026-05-19T09:10:00'],
  [11, 'chapter11-toolchain.md',            'Buildroot Toolchain 선택 — Internal vs External 비교',                         '2026-05-19T09:11:00'],
  [12, 'chapter12-kernel-customize.md',     'Buildroot 커널 Customize — defconfig fragment와 DTS 통합',                    '2026-05-19T09:12:00'],
  [13, 'chapter13-uboot-integration.md',    'Buildroot U-Boot 통합 — 빌드·env·fw_env 흐름',                                  '2026-05-19T09:13:00'],
  [14, 'chapter14-build-caching.md',        'Buildroot 빌드 캐싱 분석 — dl·ccache·per-package',                              '2026-05-19T09:14:00'],
  [15, 'chapter15-post-build-deep.md',      'Buildroot post-build·post-image 심화 — rootfs 최종 수정 흐름',                  '2026-05-19T09:15:00'],
  [16, 'chapter16-ota.md',                  'Buildroot OTA 이미지 업데이트 — RAUC·swupdate 통합',                            '2026-05-19T09:16:00'],
  [17, 'chapter17-sdk.md',                  'Buildroot SDK 생성·배포 — make sdk와 application 워크플로',                    '2026-05-19T09:17:00'],
  [18, 'chapter18-security-cve.md',         'Buildroot Security·CVE 추적 — pkg-stats와 Reproducible Builds',                 '2026-05-19T09:18:00'],
  [19, 'chapter19-cicd.md',                 'Buildroot CI/CD 구축 — Container Build와 Cache 공유',                            '2026-05-19T09:19:00'],
  [20, 'chapter20-yocto-migration.md',      'Buildroot → Yocto 마이그레이션 — 언제·어떻게 옮길까',                            '2026-05-19T09:20:00'],
];

function applyEdit(filePath, newTitle, newDate) {
  const raw = readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`no frontmatter: ${filePath}`);
  const [, fm, body] = m;
  let newFm = fm.replace(/^title:\s*.*$/m, `title: "${newTitle}"`).replace(/^date:\s*.*$/m, `date: ${newDate}`);
  if (!DRY) writeFileSync(filePath, `---\n${newFm}\n---\n${body}`);
}

let count = 0;
for (const [order, file, title, date] of PLAN) {
  applyEdit(join(DIR, file), title, date);
  count++;
}
console.log(`${DRY ? 'DRY RUN' : 'APPLIED'}: ${count} files`);
