#!/usr/bin/env node

/** Build an LLM-oriented, lossless view of a ChatGPT anti-pattern archive. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const archive = option('--archive', 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273');
const output = option('--output', join(archive, 'llm-antipatterns'));
const chunkSize = Number(option('--chunk-size', '60'));
if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new Error('--chunk-size must be a positive integer');

const [classification, conversation] = await Promise.all([
  readFile(join(archive, 'classification.json'), 'utf8').then(JSON.parse),
  readFile(join(archive, 'conversation.json'), 'utf8').then(JSON.parse),
]);
const sourceCapturedAt = conversation.capturedAt ?? null;
const messagesById = new Map(conversation.messages.filter(({ id }) => id).map((message) => [message.id, message]));
const categories = {
  content: { label: 'Content strategy and structure', prefixes: ['A', 'C', 'G'] },
  information_architecture: { label: 'Information architecture and knowledge graph', prefixes: ['I', 'K'] },
  performance: { label: 'Performance and build efficiency', prefixes: ['P'] },
  search_seo: { label: 'Search and SEO', prefixes: ['S'] },
  ux: { label: 'Reading experience and UI', prefixes: ['U'] },
  metadata: { label: 'Metadata and schema', prefixes: ['M'] },
  security: { label: 'Security and supply chain', prefixes: ['SEC'] },
  observability: { label: 'Measurement and observability', prefixes: ['O'] },
  localization: { label: 'Localization and terminology', prefixes: ['L'] },
  quality: { label: 'Quality and testing', prefixes: ['T'] },
  repository: { label: 'Repository and delivery', prefixes: ['R'] },
  methodology: { label: 'Catalog and review methodology', prefixes: ['D'] },
};
const categoryForPrefix = new Map(Object.entries(categories).flatMap(([key, value]) => value.prefixes.map((prefix) => [prefix, key])));
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function sectionFromMessage(record) {
  const message = messagesById.get(record.sourceMessageId);
  if (!message) throw new Error(`Missing source message for ${record.id}`);
  const headingPattern = `^#{${record.level}}\\s+${escapeRegExp(record.id)}(?:[.\\s-]|$).*$`;
  const heading = new RegExp(headingPattern, 'm');
  const match = heading.exec(message.markdown);
  if (!match) throw new Error(`Could not locate ${record.id} in source message ${record.sourceMessageId}`);
  const following = /^#{1,6}\s+/gm;
  following.lastIndex = match.index + match[0].length;
  let end = message.markdown.length;
  let next;
  while ((next = following.exec(message.markdown))) {
    if (next[0].trimStart().match(/^#+/)[0].length <= record.level) { end = next.index; break; }
  }
  const source = message.markdown.slice(match.index, end).trim();
  return {
    source,
    body: source.replace(/^#{1,6}\s+[^\n]+\n?/, '').trim(),
    createdAt: message.createdAt,
  };
}

const extracted = classification.antiPatterns.map((record) => {
  const prefix = record.id.split('-')[0];
  const category = categoryForPrefix.get(prefix);
  if (!category) throw new Error(`No category mapping for ${record.id}`);
  const section = sectionFromMessage(record);
  const fingerprint = createHash('sha256').update(section.body.replace(/\s+/g, ' ').trim(), 'utf8').digest('hex');
  return { ...record, ...section, category, fingerprint };
});

// Only byte-for-byte-equivalent source sections are merged automatically.
const canonicalByFingerprint = new Map();
for (const item of extracted) {
  const canonical = canonicalByFingerprint.get(item.fingerprint);
  if (canonical) canonical.mergedFrom.push(item);
  else {
    item.mergedFrom = [item];
    canonicalByFingerprint.set(item.fingerprint, item);
  }
}
const canonicalItems = [...canonicalByFingerprint.values()];
const canonicalIdCounts = new Map();
for (const item of canonicalItems) {
  const baseId = `AP-${item.id}`;
  const occurrence = (canonicalIdCounts.get(baseId) || 0) + 1;
  canonicalIdCounts.set(baseId, occurrence);
  item.canonicalId = occurrence === 1 ? baseId : `${baseId}-${occurrence}`;
}
const byCategory = Object.groupBy(canonicalItems, ({ category }) => category);
await mkdir(output, { recursive: true });

const manifest = [];
const mergeMap = [];
for (const [categoryKey, definition] of Object.entries(categories)) {
  const items = (byCategory[categoryKey] || []).sort((left, right) => left.id.localeCompare(right.id, 'en'));
  const chunks = [];
  for (let offset = 0; offset < items.length; offset += chunkSize) {
    const part = items.slice(offset, offset + chunkSize);
    const filename = `${categoryKey}-${String(chunks.length + 1).padStart(2, '0')}.md`;
    chunks.push(filename);
    const document = [
      '---',
      `title: ${JSON.stringify(`${definition.label} (${part.length} anti-patterns)`)}`,
      `category: ${categoryKey}`,
      `item_count: ${part.length}`,
      '---',
      '',
      `# ${definition.label}`,
      '',
      '> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.',
      '',
      ...part.flatMap((item) => {
        const originalIds = item.mergedFrom.map(({ id }) => id);
        const related = extracted.filter((candidate) => candidate.category === item.category && candidate.id !== item.id && candidate.title === item.title).map(({ canonicalId }) => canonicalId).filter(Boolean);
        const location = `${filename}#${item.canonicalId.toLowerCase()}`;
        manifest.push({ id: item.canonicalId, title: item.title, category: item.category, file: location, originalIds, sourceMessageIds: item.mergedFrom.map(({ sourceMessageId }) => sourceMessageId) });
        mergeMap.push({ canonicalId: item.canonicalId, originalIds, automatic: originalIds.length > 1, fingerprint: item.fingerprint });
        return [
          `## ${item.canonicalId} — ${item.title.replace(/^[A-Z]{1,5}-\d{1,3}[.\s-]+/, '')}`,
          '',
          `- Category: ${definition.label}`,
          `- Original IDs: ${originalIds.join(', ')}`,
          `- Source messages: ${item.mergedFrom.map(({ sourceMessageId }) => sourceMessageId).join(', ')}`,
          `- Merge status: ${originalIds.length > 1 ? 'exact duplicate merged' : 'canonical source'}`,
          related.length ? `- Related IDs: ${related.join(', ')}` : '',
          '',
          '### Source material',
          '',
          item.body,
          '',
        ];
      }),
    ].filter(Boolean).join('\n');
    await writeFile(join(output, filename), `${document}\n`);
  }
  definition.chunks = chunks;
  definition.items = items.length;
}

const index = [
  '# Anti-pattern knowledge base',
  '',
  '> Generated from the lossless conversation archive. Read one category chunk at a time, then use `manifest.json` for targeted retrieval.',
  '',
  '| Category | Canonical items | Files |',
  '| --- | ---: | --- |',
  ...Object.entries(categories).map(([, value]) => `| ${value.label} | ${value.items} | ${value.chunks.map((file) => `[${file}](${file})`).join(', ')} |`),
  '',
  '## Merge policy',
  '',
  '- Automatic merge only occurs when the normalized source body has the same SHA-256 hash.',
  '- Semantic similarity is intentionally not auto-merged; it requires an LLM or human review and must preserve the original IDs.',
  '',
].join('\n');
await writeFile(join(output, 'index.md'), index);
await writeFile(join(output, 'manifest.json'), `${JSON.stringify({ sourceCapturedAt, canonicalItems: manifest }, null, 2)}\n`);
await writeFile(join(output, 'merge-map.json'), `${JSON.stringify({ policy: 'Exact normalized source-body SHA-256 only', canonicalItems: mergeMap }, null, 2)}\n`);
await writeFile(join(output, 'README.md'), `# LLM anti-pattern corpus\n\nStart with [index.md](index.md). Use [manifest.json](manifest.json) for ID-based retrieval and [merge-map.json](merge-map.json) to trace exact merges.\n`);
console.log(`Created ${canonicalItems.length} canonical anti-patterns in ${output}`);
