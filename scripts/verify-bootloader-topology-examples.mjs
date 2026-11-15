import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const base = 'src/content/blog/embedded/bootloader/';
const names = [
  'chapter34-pcie-enumeration.md', 'chapter35-uefi-cxl-init.md',
  'chapter36-boot-memory-topology.md', 'chapter37-secureboot-cert-rollover.md',
];
const work = mkdtempSync(join(tmpdir(), 'boot-topology-'));
const files = new Map();
for (const name of names) {
  const source = readFileSync(base + name, 'utf8');
  const original = execFileSync('git', ['show', 'HEAD:' + base + name], {encoding: 'utf8'});
  for (const key of ['slug', 'date', 'series', 'seriesOrder', 'draft', 'tags', 'topics']) {
    const value = s => s.match(new RegExp(`^${key}:.*$`, 'm'))?.[0];
    assert.equal(value(source), value(original), `${name}: ${key} unchanged`);
  }
  for (const [, name, body] of source.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm)) {
    assert.ok(!files.has(name), `unique named example: ${name}`);
    const file = join(work, name);
    writeFileSync(file, body);
    files.set(name, file);
    if (name.endsWith('.sh')) {
      execFileSync('/bin/sh', ['-n', file]);
      console.log(`PASS shell syntax only: ${name}`);
    }
  }
}
assert.equal(files.size, 6, 'all six named source examples extracted');
const {memoryBarSize} = await import(pathToFileURL(files.get('memory-bar-size.mjs')));
assert.equal(memoryBarSize(0xfff00000n), 1n << 20n);
assert.equal(memoryBarSize(0xfff00008n), 1n << 20n);
assert.equal(memoryBarSize(0xfffff000n), 4096n);
assert.equal(memoryBarSize(0xfffffff0n), 16n);
assert.equal(memoryBarSize(0xffffffff00000004n, 64), 1n << 32n);
assert.equal(memoryBarSize(0xfffffffffffffff4n, 64), 16n);
for (const [mask, width] of [
  [0n, 32], [4n, 64], [0xfff01000n, 32], [0xfff00001n, 32],
  [0xfff00002n, 32], [0xfff00004n, 32], [0xffffffff00000000n, 64],
  [-1n, 32], [1n << 32n, 32], [0xfff00000n, 16], [123, 32],
]) assert.throws(() => memoryBarSize(mask, width), RangeError);
console.log('PASS extracted BAR arithmetic: 32/64-bit, prefetch flag, minimum size; ambiguous/invalid/type/non-contiguous mask rejection');

const {validateMemoryLeaves} = await import(pathToFileURL(files.get('memory-leaves.mjs')));
const a = {base: 0x100000000n, size: 0x80000000n};
const b = {base: 0x180000000n, size: 0x80000000n};
assert.deepEqual(validateMemoryLeaves([b, a]), [
  {base: a.base, end: b.base}, {base: b.base, end: 0x200000000n},
]);
assert.deepEqual(validateMemoryLeaves([]), []);
assert.deepEqual(validateMemoryLeaves([{base: (1n << 64n) - 1n, size: 1n}]), [
  {base: (1n << 64n) - 1n, end: 1n << 64n},
]);
for (const leaves of [
  [a, {base: b.base - 1n, size: b.size}], [a, a],
  [a, {base: a.base + 1n, size: 1n}], [{base: -1n, size: 1n}],
  [{base: 0n, size: 0n}], [{base: 0n, size: -1n}],
  [{base: 1n << 64n, size: 1n}], [{base: 0, size: 1n}],
]) assert.throws(() => validateMemoryLeaves(leaves), RangeError);
console.log('PASS extracted leaf ranges: unsorted adjacent ranges, 64-bit end; one-byte overlap/nesting/duplicate/zero/negative/overflow/type rejection');
console.log('PASS preserved routing metadata. NOT RUN: PCI config writes, U-Boot/EDK II/QEMU builds, Linux CXL/ACPI/EFI tools, firmware variable updates or physical hardware.');
