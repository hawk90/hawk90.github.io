#!/usr/bin/env node

/** Check which restored guidance sections can be traced to canonical anti-pattern IDs. */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const archive = process.argv.includes('--archive')
  ? process.argv[process.argv.indexOf('--archive') + 1]
  : 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const guidancePath = join(archive, 'original-guidance.md');
const manifestPath = join(archive, 'llm-antipatterns/manifest.json');
const output = 'reports/antipattern-guidance/latest.md';
const guidance = await readFile(guidancePath, 'utf8');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const byOriginal = new Map();
for (const item of manifest.canonicalItems) {
  for (const original of item.originalIds || []) {
    if (!byOriginal.has(original)) byOriginal.set(original, []);
    byOriginal.get(original).push(item);
  }
}

const blocks = guidance.split(/(?=^#### \d+\. )/m).filter((block) => /^#### \d+\. /m.test(block));
const idPattern = /\b(?:AP-)?(?:A|I|P|S|U|M|SEC|O|L|T|R|D|G|K)-\d{1,3}\b/g;
const rows = blocks.map((block) => {
  const title = block.match(/^#### \d+\. (.+)$/m)?.[1] || 'untitled';
  const source = block.match(/^<!-- source: (.+?) -->$/m)?.[1] || 'unknown';
  // Include the source path because actionable child sections (e.g. "권장",
  // "검증") inherit their anti-pattern identity from an AP-labelled parent.
  const ids = [...new Set(`${title}\n${source}\n${block}`.match(idPattern)?.map((id) => id.replace(/^AP-/, '')) || [])];
  const canonical = [...new Set(ids.flatMap((id) => (byOriginal.get(id) || []).map((item) => item.id)))];
  const candidate = /anti-pattern|안티패턴|검토|감사|품질|보안|검색|콘텐츠|metadata|migration|CI\/CD/i.test(`${title} ${source}`);
  const text = `${title} ${source}`;
  const priority = /보안|security|CI\/CD|secret|workflow|OAuth/i.test(text) ? 'P0'
    : /품질|테스트|검증|build|migration|fallback|CSS/i.test(text) ? 'P1'
      : 'P2';
  return { title, ids, canonical, source, priority, disposition: canonical.length ? 'linked' : candidate ? 'anti-pattern-candidate' : 'guidance-only' };
});
const linked = rows.filter(({ canonical }) => canonical.length);
const unlinked = rows.filter(({ canonical }) => !canonical.length);
const candidates = unlinked.filter(({ disposition }) => disposition === 'anti-pattern-candidate');
const guidanceOnly = unlinked.filter(({ disposition }) => disposition === 'guidance-only');
const lines = [
  '# Original guidance traceability audit', '',
  `- Source: [${guidancePath}](${guidancePath})`,
  `- Guidance sections: ${rows.length}`,
  `- Sections with canonical AP links: ${linked.length}`,
  `- Anti-pattern candidates requiring manual AP mapping: ${candidates.length}`,
  `- Guidance-only sections (do not force an AP ID): ${guidanceOnly.length}`,
  `- Candidate priority: P0 ${candidates.filter(({ priority }) => priority === 'P0').length}, P1 ${candidates.filter(({ priority }) => priority === 'P1').length}, P2 ${candidates.filter(({ priority }) => priority === 'P2').length}`,
  '',
  '> This is a routing report, not a semantic equivalence claim. Unlinked guidance must be reviewed before assigning or merging anti-pattern IDs.', '',
  '## Linked guidance', '',
  '| Guidance | Original IDs | Canonical IDs | Source |',
  '| --- | --- | --- | --- |',
  ...linked.map(({ title, ids, canonical, source }) => `| ${title.replaceAll('|', '\\|')} | ${ids.join(', ') || '—'} | ${canonical.join(', ')} | ${source} |`),
  '', '## Manual anti-pattern mapping queue', '',
  '| Priority | Guidance | Source |', '| --- | --- | --- |',
  ...candidates.sort((left, right) => left.priority.localeCompare(right.priority)).map(({ title, source, priority }) => `| ${priority} | ${title.replaceAll('|', '\\|')} | ${source} |`),
  '', '## Guidance-only sections', '',
  '| Guidance | Source |', '| --- | --- |',
  ...guidanceOnly.map(({ title, source }) => `| ${title.replaceAll('|', '\\|')} | ${source} |`),
  '',
];
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${lines.join('\n')}\n`, 'utf8');
console.log(`Audited ${rows.length} guidance sections: ${linked.length} linked, ${candidates.length} candidates, ${guidanceOnly.length} guidance-only`);
