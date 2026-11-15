#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const manifestPath = 'reports/adsense-audit/fixes/bsp-development-2026-10-22.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const preflight = process.argv.includes('--preflight');
const expect = (ok, message) => { if (!ok) throw new Error(message); console.log(`PASS ${message}`); };
const sha = (data) => createHash('sha256').update(data).digest('hex');
const git = (args) => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
};

expect(manifest.readyForIntegration === !preflight, `manifest readiness is ${preflight ? 'false during preflight' : 'true after final checks'}`);
expect(manifest.articles.length === 21, 'manifest contains 21 BSP articles');
expect(new Set(manifest.articles.map((a) => a.path)).size === 21, 'manifest article paths are unique');

const sourceDir = 'src/content/blog/embedded/bsp';
const actualFiles = readdirSync(join(root, sourceDir)).filter((name) => /^chapter\d{2}-.*\.md$/.test(name)).sort();
expect(actualFiles.length === 21, 'BSP source directory contains exactly 21 numbered chapters');
expect(actualFiles.join('\n') === manifest.articles.map((a) => a.path.split('/').at(-1)).sort().join('\n'), 'manifest covers the exact 21 chapter files');
expect(sha(readFileSync(manifest.scoreLedgerPath)) === manifest.scoreLedgerSha256AtRecordCreation, 'score ledger unchanged since evidence record creation');

for (const article of manifest.articles) {
  const source = readFileSync(join(root, article.path));
  const original = Buffer.from(git(['show', `HEAD:${article.path}`]));
  expect(article.beforeSha256 === sha(original), `${article.path}: beforeSha256 matches HEAD baseline`);
  expect(article.afterSha256 === sha(source), `${article.path}: afterSha256 matches working tree`);
  expect(article.status === 'remediated', `${article.path}: canonical status remediated`);
  expect(article.validation.decision === 'remediated', `${article.path}: validation decision agrees with status`);
  for (const key of ['contextScope','signalAndRefutation','causeAndAlternatives','evidence','sampleRange','decision','minimalSafeChangeAndRollback','verificationAndResidualRisk']) {
    expect(typeof article.validation[key] === 'string' && article.validation[key].trim().length > 0, `${article.path}: evidence field ${key} present`);
  }
  expect(Array.isArray(article.sources) && article.sources.length > 0, `${article.path}: primary source references recorded`);
  const oldText = original.toString('utf8');
  const newText = source.toString('utf8');
  const frontmatter = (text) => text.match(/^---\n([\s\S]*?)\n---\n/)[1];
  for (const key of ['slug','date','series','seriesOrder','draft']) {
    const value = (text) => frontmatter(text).match(new RegExp(`^${key}:.*$`, 'm'))?.[0];
    expect(value(oldText) === value(newText), `${article.path}: ${key} preserved`);
  }
}

const temp = mkdtempSync(join(tmpdir(), 'bsp-verify-'));
try {
  let bashBlocks = 0;
  for (const article of manifest.articles) {
    const text = readFileSync(join(root, article.path), 'utf8');
    const blocks = [...text.matchAll(/^```bash\s*\n([\s\S]*?)^```\s*$/gm)].map((m) => m[1]);
    for (const [index, block] of blocks.entries()) {
      if (/^\s*(?:\$|=>)\s/m.test(block) || /^\s*\[[^\]]+\]/m.test(block)) continue;
      const file = join(temp, `bash-${bashBlocks}.sh`);
      writeFileSync(file, block);
      const parsed = spawnSync('bash', ['-n', file], { encoding: 'utf8' });
      expect(parsed.status === 0, `${article.path}: executable Bash block ${index + 1} parses with bash -n`);
      bashBlocks++;
    }
  }
  expect(bashBlocks > 0, `Bash syntax checked for ${bashBlocks} executable blocks; transcript/output blocks excluded`);

  const negative = join(temp, 'invalid.sh');
  writeFileSync(negative, 'if then\n  echo invalid\nfi\n');
  const bad = spawnSync('bash', ['-n', negative], { encoding: 'utf8' });
  expect(bad.status !== 0, 'negative fixture with malformed Bash is rejected');

  const ch15 = readFileSync(join(root, 'src/content/blog/embedded/bsp/chapter15-boot-time-optimization.md'), 'utf8');
  const script = [...ch15.matchAll(/^```bash\s*\n([\s\S]*?)^```\s*$/gm)].map((m) => m[1]).find((body) => body.includes('boot-time-analyze.sh'));
  expect(Boolean(script), 'chapter 15 boot-time analyzer source block found');
  const kernelAwk = script.match(/dmesg\s*\|\s*awk '([^']*)'/)?.[1];
  const journalAwk = script.match(/journalctl -b -o short-monotonic\s*\|\s*awk '([^']*)'/)?.[1];
  expect(Boolean(kernelAwk && journalAwk), 'chapter 15 kernel and journal parser expressions extracted from source block');
  const positiveKernel = spawnSync('awk', [kernelAwk], { encoding: 'utf8', input: '[    1.234567] Freeing unused kernel image (initmem) memory: 1234K\n' });
  expect(positiveKernel.status === 0 && positiveKernel.stdout.includes('kernel milestone: 1.234567'), 'chapter 15 parser extracts timestamp from representative kernel log line');
  const missingKernel = spawnSync('awk', [kernelAwk], { encoding: 'utf8', input: '[    0.100000] Booting Linux\n' });
  expect(missingKernel.status !== 0, 'chapter 15 parser rejects a log fixture without the requested kernel milestone');
  const positiveJournal = spawnSync('awk', [journalAwk], { encoding: 'utf8', input: '[    2.345678] Reached target Multi-User System.\n' });
  expect(positiveJournal.status === 0 && positiveJournal.stdout.includes('Reached target Multi-User System.'), 'chapter 15 journal parser recognizes representative userspace milestone');
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log('NOTE Static source/metadata checks and host-shell fixtures only; no BSP image build, DTB compile, target boot, flash, or hardware test was performed.');
