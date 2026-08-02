#!/usr/bin/env node
// Verifies the local Git database and that the repository has a recovery remote.

import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const run = (args) => spawnSync('git', args, { encoding: 'utf8' });
const remotes = run(['remote', '-v']);
const fsck = run(['fsck', '--no-reflogs', '--connectivity-only']);
const findings = [];
if (remotes.status !== 0 || !remotes.stdout.trim()) findings.push('No Git remote is configured for recovery.');
if (fsck.status !== 0) findings.push((fsck.stderr || fsck.stdout || 'git fsck failed').trim());
await mkdir('reports/repository-health', { recursive: true });
await writeFile('reports/repository-health/latest.md', ['# Repository health audit', '', `- Recovery remotes configured: ${remotes.status === 0 && remotes.stdout.trim() ? 'yes' : 'no'}`, `- Git object connectivity: ${fsck.status === 0 ? 'pass' : 'fail'}`, ...findings.map((finding) => `- Finding: ${finding}`)].join('\n'));
console.log(`Repository health: ${findings.length} finding(s).`);
if (findings.length) process.exitCode = 1;
