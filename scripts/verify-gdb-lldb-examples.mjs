#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const chapter01 = readFileSync(resolve(root, 'src/content/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install.md'), 'utf8');
const chapter08 = readFileSync(resolve(root, 'src/content/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging.md'), 'utf8');

function extractFence(markdown, language, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\x60\\x60\\x60${language} title="${escaped}"[^\\n]*\\n([\\s\\S]*?)^\\x60\\x60\\x60\\s*$`, 'm');
  const match = markdown.match(pattern);
  assert.ok(match, `Could not find fenced ${language} example ${title}`);
  return match[1];
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 30_000, ...options });
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

const temp = mkdtempSync(join(tmpdir(), 'gdb-lldb-examples-'));
const report = {
  timestamp: new Date().toISOString(),
  checks: [],
  limitations: [
    'GDB is not installed in this environment; no GDB session was run.',
    'No remote gdbserver, OpenOCD, J-Link probe, or target board was contacted.',
    'The RSP example checks ASCII framing only; it is not a complete RSP implementation.'
  ]
};
const logPath = resolve(root, 'reports/adsense-audit/fixes/gdb-lldb-2026-10-22.log');

function recordReport() {
  const body = JSON.stringify(report, null, 2) + '\n';
  writeFileSync(logPath, body);
  process.stdout.write(body);
}

try {
  const rsp = extractFence(chapter08, 'js', 'rsp-check.mjs');
  const rspPath = join(temp, 'rsp-check.mjs');
  writeFileSync(rspPath, rsp);
  const rspResult = run(process.execPath, [rspPath]);
  assert.equal(rspResult.status, 0, rspResult.stderr || rspResult.stdout);
  assert.match(rspResult.stdout, /ASCII RSP framing checks passed/);
  report.checks.push({ name: 'chapter08 named RSP code fence', status: 'PASS', command: `node ${rspPath}`, output: rspResult.stdout.trim() });

  const hello = extractFence(chapter01, 'c', 'hello.c');
  const sourcePath = join(temp, 'hello.c');
  const binaryPath = join(temp, 'hello');
  writeFileSync(sourcePath, hello);
  const compiler = process.env.GDB_LLDB_CC || 'clang';
  const compile = run(compiler, ['-g', '-O0', sourcePath, '-o', binaryPath]);
  assert.equal(compile.status, 0, compile.stderr || `Compiler exited ${compile.status}`);
  report.checks.push({ name: 'chapter01 named C code fence', status: 'PASS', command: `${compiler} -g -O0 <extracted hello.c> -o <temporary binary>` });

  const lldb = process.env.GDB_LLDB_LLDB || 'lldb';
  const args = [
    '--batch',
    '-o', `target create ${binaryPath}`,
    '-o', 'breakpoint set --name factorial',
    '-o', 'run',
    '-o', 'frame variable n',
    '-o', 'thread backtrace',
    '-o', 'breakpoint disable 1',
    '-o', 'continue'
  ];
  const live = run(lldb, args);
  assert.equal(live.status, 0, live.stderr || live.stdout || `LLDB exited ${live.status}`);
  assert.match(live.stdout, /n\s*=\s*5/);
  assert.match(live.stdout, /5! = 120/);
  report.checks.push({ name: 'chapter01 LLDB launch/breakpoint/inspection/normal exit', status: 'PASS', command: `${lldb} ${args.join(' ')}`, evidence: 'Stopped with n=5 in factorial, printed thread backtrace, then reached 5! = 120.' });
  recordReport();
} catch (error) {
  report.checks.push({ name: 'verification', status: 'FAIL', error: String(error) });
  const body = JSON.stringify(report, null, 2) + '\n';
  writeFileSync(logPath, body);
  process.stderr.write(body);
  process.exitCode = 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
