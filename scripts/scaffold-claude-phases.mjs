#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const archive = option('--archive', 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273');
const root = option('--output', 'claude');
if (!archive || archive.startsWith('--') || !root || root.startsWith('--')) {
  throw new Error('Usage: node scripts/scaffold-claude-phases.mjs [--archive <directory>] [--output <directory>]');
}
const manifest = JSON.parse(await readFile(join(archive, 'llm-phases/manifest.json'), 'utf8'));
const sourceFiles = ['foundation', 'discovery', 'content', 'quality', 'delivery', 'experience', 'monetization'];
const exists = async (path) => access(path).then(() => true).catch(() => false);
const writeIfMissing = async (path, content) => { if (!(await exists(path))) await writeFile(path, content); };

const groups = Object.groupBy(manifest.phases, (task) => Number(task.phase.match(/^Phase (\d+)/)?.[1]));
for (const number of Object.keys(groups).map(Number).sort((a, b) => a - b)) {
  const tasks = groups[number];
  const directory = join(root, `phase-${String(number).padStart(2, '0')}`);
  await mkdir(directory, { recursive: true });
  const batch = tasks.slice(0, 4).map(({ id }) => id);
  await writeIfMissing(join(directory, 'TASK.md'), [
    `# ${tasks[0].phase}`,
    '',
    '## Active batch',
    '',
    ...batch.map((id) => `- \`${id}\``),
    '',
    'Implement only this batch in one Claude Code run. After verification, record the handoff and activate the next four pending tasks; do not start a later phase early.',
    '',
    '## Full phase backlog',
    '',
    ...tasks.map(({ id, title }) => `- [ ] \`${id}\` — ${title}`),
    '',
    '## Shared completion rule',
    '',
    'Every task needs changed files, a verification command, and a result recorded in `CHANGES.md` and `VERIFICATION.md`.',
    '',
  ].join('\n'));
  await writeIfMissing(join(directory, 'CONTEXT.md'), [
    '# Context', '',
    `- [Authoritative phase source](../../${archive}/llm-phases/${sourceFiles[number - 1]}.md)`,
    `- [Phase manifest](../../${archive}/llm-phases/manifest.json)`,
    '- [Shared workflow](../WORKFLOW.md)', '',
    'Before changing code, inspect the current implementation and record the exact files and call paths relevant to the active batch in `FINDINGS.md`.', '',
  ].join('\n'));
  await writeIfMissing(join(directory, 'FINDINGS.md'), '# Findings\n\n_Claude Code records the current implementation before editing._\n');
  await writeIfMissing(join(directory, 'CHANGES.md'), '# Changes\n\n_Claude Code records completed task IDs, files, decisions, and rollback notes._\n');
  await writeIfMissing(join(directory, 'VERIFICATION.md'), '# Verification\n\n_Claude Code records commands, outcomes, and unrelated baseline failures._\n');
  await writeIfMissing(join(directory, 'STATE.json'), `${JSON.stringify({ phase: number, status: number === 1 ? 'active' : 'queued', activeTasks: batch, allTasks: tasks.map(({ id }) => id), completedTasks: [], deferredTasks: [] }, null, 2)}\n`);
}
console.log(`Scaffolded ${Object.keys(groups).length} Claude phase packets in ${root}/`);
