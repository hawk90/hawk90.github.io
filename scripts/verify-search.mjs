#!/usr/bin/env node
// Regression tests for search normalization, aliases, and short-acronym bounds.

import { build } from 'vite';

async function loadModule(entry) {
  const built = await build({
    configFile: false,
    logLevel: 'error',
    build: { write: false, lib: { entry, formats: ['es'], fileName: 'verification' } },
  });
  const output = (Array.isArray(built) ? built[0] : built).output;
  const chunk = output.find((item) => item.type === 'chunk');
  if (!chunk) throw new Error(`Could not bundle ${entry} for verification.`);
  return import(`data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`);
}

const { searchPosts } = await loadModule('src/lib/search.ts');
const { SEARCH_TERMS, formatFirstMention, normalizeSearchText } = await loadModule('src/lib/search-aliases.ts');

const variantOwners = new Map();
for (const term of SEARCH_TERMS) {
  if (!term.canonical.trim()) throw new Error('Search term has an empty canonical spelling.');
  for (const variant of [term.canonical, term.expansion, ...term.aliases].filter(Boolean)) {
    const normalized = normalizeSearchText(variant);
    const owner = variantOwners.get(normalized);
    if (owner && owner !== term.canonical) {
      throw new Error(`Search variant "${variant}" is assigned to both ${owner} and ${term.canonical}.`);
    }
    variantOwners.set(normalized, term.canonical);
  }
}
console.log(`PASS dictionary integrity -> ${SEARCH_TERMS.length} canonical terms, ${variantOwners.size} unique variants`);

const fixtures = [
  { title: 'PCI Express BAR', description: 'interconnect', slug: 'pcie', tags: ['pcie'], date: 10, series: null },
  { title: 'RISC-V ISA', description: 'architecture', slug: 'riscv', tags: ['risc-v'], date: 9, series: null },
  { title: 'C++ 동시성', description: 'code', slug: 'cpp', tags: ['c++'], date: 8, series: null },
  { title: 'NVMe Queue', description: 'storage', slug: 'nvme', tags: ['nvme'], date: 7, series: null },
  { title: 'RTOS 스케줄러', description: 'real-time scheduling', slug: 'rtos', tags: ['rtos'], date: 6, series: null },
  { title: 'Post processing', description: 'unrelated', slug: 'post', tags: ['writing'], date: 5, series: null },
  { title: 'PCIe', description: 'exact title', slug: 'pcie-exact', tags: [], date: 1, series: null },
  { title: 'PCIe Guide', description: 'title prefix', slug: 'pcie-prefix', tags: [], date: 20, series: null },
  { title: 'Device Guide', description: 'pcie in description', slug: 'pcie-description', tags: [], date: 30, series: null },
  { title: 'Device Notes', description: 'unrelated', slug: 'pcie-tag', tags: ['pcie'], date: 40, series: null },
  { title: 'PCIe Series Part 2', description: 'series member', slug: 'pcie-series-2', tags: [], date: 12, series: 'PCIe Series' },
  { title: 'PCIe Series Part 1', description: 'series member', slug: 'pcie-series-1', tags: [], date: 11, series: 'PCIe Series' },
  { title: 'Rankterm', description: 'exact title', slug: 'rank-exact', tags: [], date: 1, series: null },
  { title: 'Rankterm Guide', description: 'title prefix', slug: 'rank-prefix', tags: [], date: 20, series: null },
  { title: 'Device Guide', description: 'rankterm in description', slug: 'rank-description', tags: [], date: 30, series: null },
  { title: 'Device Notes', description: 'unrelated', slug: 'rank-tag', tags: ['rankterm'], date: 40, series: null },
];

const cases = new Map([
  ['pcie', 'pcie'],
  ['PCI Express', 'pcie'],
  ['riscv', 'riscv'],
  ['cpp', 'cpp'],
  ['c plus plus', 'cpp'],
  ['non volatile memory express', 'nvme'],
  ['real time operating system', 'rtos'],
  ['os', ''], // must not match the "Post" fixture as a substring
]);

const basicFixtures = fixtures.slice(0, 6);
for (const [query, expected] of cases) {
  const actual = searchPosts(basicFixtures, query).map((item) => item.slug).join(',');
  if (actual !== expected) throw new Error(`Search query "${query}": expected "${expected}", got "${actual}".`);
  console.log(`PASS ${query} -> ${actual || 'no result'}`);
}

const ranking = searchPosts(fixtures, 'rankterm').map((item) => item.slug);
const expectedRanking = ['rank-exact', 'rank-prefix', 'rank-tag', 'rank-description'];
if (expectedRanking.some((slug, index) => ranking[index] !== slug)) {
  throw new Error(`Search ranking regression: expected ${expectedRanking.join(',')}, got ${ranking.join(',')}`);
}
console.log(`PASS ranking precedence -> ${expectedRanking.join(' > ')}`);

const filtered = searchPosts(fixtures, { query: 'pcie', filterSeries: 'PCIe Series' }).map((item) => item.slug);
if (filtered.join(',') !== 'pcie-series-2,pcie-series-1') {
  throw new Error(`Search filter regression: expected series members, got ${filtered.join(',')}`);
}
console.log('PASS combined query and series filter');

for (const [canonical, expected] of new Map([
  ['PCIe', 'PCIe (Peripheral Component Interconnect Express)'],
  ['NVMe', 'NVMe (Non-Volatile Memory Express)'],
  ['C++', 'C++'],
])) {
  const term = SEARCH_TERMS.find((candidate) => candidate.canonical === canonical);
  const actual = term && formatFirstMention(term);
  if (actual !== expected) throw new Error(`First mention for ${canonical}: expected "${expected}", got "${actual}".`);
  console.log(`PASS canonical ${canonical} -> ${actual}`);
}
