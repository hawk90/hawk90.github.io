#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const inputIndex = args.indexOf('--input');
const corpus = inputIndex === -1 ? 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/llm-antipatterns' : args[inputIndex + 1];
const manifest = JSON.parse(await readFile(join(corpus, 'manifest.json'), 'utf8'));
const stopWords = new Set(['안티패턴', '문제', '개선', '없는', '대한', '위한', '에서', '으로', '하는', '하지', '있음', 'without', 'with', 'the', 'and', 'for', 'to']);
const clean = (title) => title.replace(/^[A-Z]{1,5}-\d{1,3}[.\s-]+/, '').normalize('NFKC').toLocaleLowerCase('ko').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const words = (title) => new Set(clean(title).match(/[\p{L}\p{N}]{2,}/gu)?.filter((word) => !stopWords.has(word)) || []);
const grams = (title) => {
  const compact = clean(title).replace(/\s/g, '');
  return new Set(Array.from({ length: Math.max(0, compact.length - 2) }, (_, index) => compact.slice(index, index + 3)));
};
const common = (left, right) => [...left].filter((value) => right.has(value)).length;
const score = (left, right) => {
  const leftWords = words(left.title), rightWords = words(right.title), leftGrams = grams(left.title), rightGrams = grams(right.title);
  return {
    exactTitle: clean(left.title) === clean(right.title),
    tokenScore: leftWords.size && rightWords.size ? common(leftWords, rightWords) / Math.min(leftWords.size, rightWords.size) : 0,
    trigramScore: leftGrams.size && rightGrams.size ? (2 * common(leftGrams, rightGrams)) / (leftGrams.size + rightGrams.size) : 0,
  };
};

const candidates = [];
for (const [category, items] of Object.entries(Object.groupBy(manifest.canonicalItems, ({ category: key }) => key))) {
  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
    const similarity = score(items[leftIndex], items[rightIndex]);
    if (!similarity.exactTitle && !(similarity.trigramScore >= 0.72 && similarity.tokenScore >= 0.5)) continue;
    candidates.push({ category, left: items[leftIndex], right: items[rightIndex], ...similarity });
  }
}
candidates.sort((left, right) => Number(right.exactTitle) - Number(left.exactTitle) || right.trigramScore - left.trigramScore || right.tokenScore - left.tokenScore);
await writeFile(join(corpus, 'semantic-merge-candidates.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), policy: 'Review-only; title similarity is not duplicate evidence.', candidates }, null, 2)}\n`);
const review = [
  '# Semantic merge review queue', '',
  '> Open both atomic blocks before deciding. Return `merge` only when problem, scope, and remedy are materially the same; otherwise use `related` or `keep`.', '',
  '| # | Category | Pair | Title similarity |', '| ---: | --- | --- | ---: |',
  ...candidates.map((candidate, index) => `| ${index + 1} | ${candidate.category} | [${candidate.left.id}](${candidate.left.file}) ↔ [${candidate.right.id}](${candidate.right.file}) | ${(candidate.trigramScore * 100).toFixed(0)}% |`), '',
].join('\n');
await writeFile(join(corpus, 'semantic-merge-review.md'), review);
await writeFile(join(corpus, 'semantic-merge-review-prompt.md'), '# Semantic merge reviewer prompt\n\nReview each pair in `semantic-merge-review.md` after reading both linked blocks. Return JSON only:\n\n```json\n[{"left":"AP-*","right":"AP-*","decision":"merge|related|keep","canonical":"AP-*|null","reason":"one sentence"}]\n```\n\nNever delete original IDs.\n');
console.log(`Prepared ${candidates.length} semantic merge candidates in ${corpus}`);
