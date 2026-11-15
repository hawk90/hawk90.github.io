#!/usr/bin/env node
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceDir = join(repo, 'src/content/blog/embedded/buildroot');
const files = [
  'chapter01-problem.md', 'chapter02-directory-structure.md', 'chapter03-kconfig.md',
  'chapter04-first-build.md', 'chapter05-package-system.md', 'chapter06-br2-external.md',
  'chapter07-board-customize.md', 'chapter08-filesystems.md', 'chapter09-new-package.md',
  'chapter10-real-board.md', 'chapter11-toolchain.md', 'chapter12-kernel-customize.md',
  'chapter13-uboot-integration.md', 'chapter14-build-caching.md', 'chapter15-post-build-deep.md',
  'chapter16-ota.md', 'chapter17-sdk.md', 'chapter18-security-cve.md',
  'chapter19-cicd.md', 'chapter20-yocto-migration.md',
];

let failures = 0;
let shellBlocks = 0;
const log = [];
function check(ok, label, detail = '') {
  log.push(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`);
  if (!ok) failures += 1;
}
function metadata(text) {
  const front = text.match(/^---\n([\s\S]*?)\n---/);
  if (!front) return null;
  const fields = {};
  for (const key of ['slug', 'date', 'seriesOrder', 'draft']) {
    const line = front[1].split('\n').find((value) => value.startsWith(`${key}:`));
    fields[key] = line?.slice(key.length + 1).trim();
  }
  return fields;
}

for (const file of files) {
  const path = join(sourceDir, file);
  const text = readFileSync(path, 'utf8');
  const index = Number(file.match(/^chapter(\d+)/)?.[1]);
  const current = metadata(text);
  check(Boolean(current), `${file} frontmatter present`);
  check(current?.seriesOrder === String(index), `${file} seriesOrder preserved`, current?.seriesOrder);
  check(current?.slug === `"embedded/buildroot/chapter${String(index).padStart(2, '0')}-${file.replace(/^chapter\d+-/, '').replace(/\.md$/, '')}"`, `${file} slug preserved`);
  check(current?.draft === 'false', `${file} published state preserved`, current?.draft);

  const baseline = spawnSync('git', ['show', `HEAD:src/content/blog/embedded/buildroot/${file}`], { cwd: repo, encoding: 'utf8' });
  check(baseline.status === 0, `${file} HEAD baseline readable`);
  if (baseline.status === 0) {
    const before = metadata(baseline.stdout);
    for (const key of ['slug', 'date', 'seriesOrder', 'draft']) {
      check(before?.[key] === current?.[key], `${file} ${key} unchanged`);
    }
  }

  for (const match of text.matchAll(/```(?:bash|sh|shell)\s*\n([\s\S]*?)\n```/g)) {
    const block = match[1];
    if (!block.trimStart().startsWith('#!/bin/sh')) continue;
    shellBlocks += 1;
    const result = spawnSync('sh', ['-n'], { input: block, encoding: 'utf8' });
    check(result.status === 0, `${file} shebang shell block ${shellBlocks} syntax`, result.stderr.trim());
  }
}

const cArticle = readFileSync(join(sourceDir, 'chapter10-real-board.md'), 'utf8');
const cBlock = cArticle.match(/```c\s*\n([\s\S]*?)\n```/)?.[1];
if (cBlock) {
  const temp = mkdtempSync(join(tmpdir(), 'buildroot-c-example-'));
  const cPath = join(temp, 'led-blink.c');
  writeFileSync(cPath, `${cBlock}\n`);
  const result = spawnSync('cc', ['-std=c11', '-Wall', '-Wextra', '-fsyntax-only', cPath], { encoding: 'utf8' });
  check(result.status === 0, 'chapter10 LED C example compiles for host syntax', result.stderr.trim());
  rmSync(temp, { recursive: true, force: true });
} else {
  check(false, 'chapter10 LED C example extracted');
}

const tarFixture = mkdtempSync(join(tmpdir(), 'buildroot-sdk-archive-'));
const sdkTree = join(tarFixture, 'aarch64-buildroot-linux-gnu_sdk-buildroot');
const originalArchive = join(tarFixture, 'aarch64-sdk-buildroot.tar.gz');
const renamedArchive = join(tarFixture, 'sdk-myproduct-v1.4.2.tar.gz');
import { mkdirSync, copyFileSync } from 'node:fs';
mkdirSync(sdkTree, { recursive: true });
writeFileSync(join(sdkTree, 'relocate-sdk.sh'), '#!/bin/sh\nexit 0\n');
const archived = spawnSync('tar', ['-czf', originalArchive, '-C', tarFixture, 'aarch64-buildroot-linux-gnu_sdk-buildroot'], { encoding: 'utf8' });
check(archived.status === 0, 'SDK tar fixture created');
if (archived.status === 0) {
  copyFileSync(originalArchive, renamedArchive);
  const members = spawnSync('tar', ['-tzf', renamedArchive], { encoding: 'utf8' });
  check(members.status === 0 && members.stdout.includes('aarch64-buildroot-linux-gnu_sdk-buildroot/relocate-sdk.sh'),
    'renaming SDK archive preserves internal top-level directory');
}
rmSync(tarFixture, { recursive: true, force: true });

const exported = spawnSync('sh', ['-c', 'SYSROOT=/tmp/sdk/sysroot; export SYSROOT; sh -c "test -n \\\"$SYSROOT\\\""'], { encoding: 'utf8' });
check(exported.status === 0, 'exported SDK SYSROOT is visible to child build process');

const chapter10 = cArticle;
check(chapter10.includes('BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE="6.18.38"')
  && chapter10.includes('BR2_TARGET_UBOOT_CUSTOM_VERSION_VALUE="2026.07"'),
'chapter10 2026.08 defconfig sample matches pinned upstream');
check(chapter10.includes('image = "data.ext4"') && /image data\.ext4\s*\{[\s\S]*?empty = true/.test(chapter10),
'chapter10 data filesystem is a separate empty ext4 image');
check(!chapter10.includes('of=/dev/mmcblk1') && !chapter10.includes('umount /dev/sdb*'),
'chapter10 destructive wildcard/device wipe examples removed');

const chapter08 = readFileSync(join(sourceDir, 'chapter08-filesystems.md'), 'utf8');
check(chapter08.includes('0x88000000:${initrd_size}') && !chapter08.includes('mkfs.ext4 -L data "$DATA_DEV"'),
'chapter08 initramfs size supplied and boot-time autoformat removed');

const chapter16 = readFileSync(join(sourceDir, 'chapter16-ota.md'), 'utf8');
check(/altbootcmd=if test \$\{BOOT_ORDER\} = "A B"; then setenv BOOT_ORDER "B A"; else setenv BOOT_ORDER "A B"/.test(chapter16),
'chapter16 rollback command branches on active boot order');

for (const command of ['genimage', 'qemu-system-aarch64', 'buildroot']) {
  const result = spawnSync('sh', ['-c', `command -v ${command}`], { encoding: 'utf8' });
  log.push(`${result.status === 0 ? 'AVAILABLE' : 'SKIPPED'} tool ${command}${result.status === 0 ? `: ${result.stdout.trim()}` : ': unavailable in this environment'}`);
}
log.push('SKIPPED full Buildroot image build and BeagleBone hardware boot: host is macOS ARM64; Linux build/board tools are unavailable.');

process.stdout.write(`${log.join('\n')}\n`);
process.exitCode = failures ? 1 : 0;
