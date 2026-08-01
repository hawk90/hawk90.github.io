#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const inputIndex = args.indexOf('--archive');
const archive = inputIndex === -1 ? 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273' : args[inputIndex + 1];
const output = join(archive, 'llm-phases');
const [classification, conversation] = await Promise.all([
  readFile(join(archive, 'classification.json'), 'utf8').then(JSON.parse),
  readFile(join(archive, 'conversation.json'), 'utf8').then(JSON.parse),
]);
const messages = new Map(conversation.messages.filter(({ id }) => id).map((message) => [message.id, message]));
const groups = {
  foundation: { label: 'Phase 1 — Domain and information foundation', prefixes: ['ARC', 'CPM', 'B'] },
  discovery: { label: 'Phase 2 — Content, relationship, and search discovery', prefixes: ['REL', 'ART', 'SEA'] },
  content: { label: 'Phase 3 — Content workflow and migration', prefixes: ['EWF', 'MIG'] },
  quality: { label: 'Phase 4 — Performance and quality controls', prefixes: ['E', 'H', 'TST'] },
  delivery: { label: 'Phase 5 — URL migration and operations', prefixes: ['F', 'OPS', 'PRN'] },
  experience: { label: 'Phase 6 — Visual system', prefixes: ['VIS'] },
  monetization: { label: 'Phase 7 — Indexability and ads review', prefixes: ['ADS'] },
};
const groupForPrefix = new Map(Object.entries(groups).flatMap(([key, value]) => value.prefixes.map((prefix) => [prefix, key])));
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function source(record) {
  const message = messages.get(record.sourceMessageId);
  if (!message) throw new Error(`Missing source message for ${record.id}`);
  const re = new RegExp(`^#{${record.level}}\\s+${escape(record.id)}(?:[.\\s-]|$).*$`, 'm');
  const match = re.exec(message.markdown);
  if (!match) throw new Error(`Missing ${record.id} in its source message`);
  const headings = /^#{1,6}\s+/gm;
  headings.lastIndex = match.index + match[0].length;
  let end = message.markdown.length, next;
  while ((next = headings.exec(message.markdown))) if (next[0].trimStart().match(/^#+/)[0].length <= record.level) { end = next.index; break; }
  return message.markdown.slice(match.index, end).trim().replace(/^#{1,6}\s+[^\n]+\n?/, '').trim();
}
const phases = classification.phases.map((record) => ({ ...record, group: groupForPrefix.get(record.id.split('-')[0]), body: source(record) }));
if (phases.some(({ group }) => !group)) throw new Error('Unmapped phase prefix');
await mkdir(output, { recursive: true });
const manifest = [];
for (const [group, definition] of Object.entries(groups)) {
  const items = phases.filter((item) => item.group === group).sort((left, right) => left.id.localeCompare(right.id, 'en'));
  const filename = `${group}.md`;
  const markdown = [
    '---', `title: ${JSON.stringify(definition.label)}`, `item_count: ${items.length}`, '---', '', `# ${definition.label}`, '',
    '> Execute these tasks in order within this phase. Do not mark a task complete without linking evidence or a verification command.', '',
    ...items.flatMap((item) => {
      manifest.push({ id: `PH-${item.id}`, title: item.title, phase: definition.label, file: `${filename}#ph-${item.id.toLowerCase()}`, sourceMessageId: item.sourceMessageId });
      return [`## PH-${item.id} — ${item.title.replace(/^[A-Z]{1,5}-\d{1,3}[.\s-]+/, '')}`, '', `- Original task: ${item.id}`, `- Source message: ${item.sourceMessageId}`, '- Status: pending', '', '### Task details', '', item.body, ''];
    }),
  ].join('\n');
  await writeFile(join(output, filename), `${markdown}\n`);
}
await writeFile(join(output, 'manifest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), phases: manifest }, null, 2)}\n`);
await writeFile(join(output, 'index.md'), ['# Execution phases', '', '> LLM instructions: retrieve the current phase only, preserve task IDs, and update task status with evidence.', '', '| Phase | Tasks | File |', '| --- | ---: | --- |', ...Object.entries(groups).map(([key, value]) => `| ${value.label} | ${phases.filter((item) => item.group === key).length} | [${key}.md](${key}.md) |`), ''].join('\n'));
console.log(`Created ${phases.length} phase tasks in ${output}`);
