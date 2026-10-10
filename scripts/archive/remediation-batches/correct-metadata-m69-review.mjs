#!/usr/bin/env node
// Corrects the AP-M-69 review question after the diagram accessibility audit was
// pointed at the surface that actually carries the accessible name.
// Preview by default; --apply is required. Disposition stays unassessed.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/metadata.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));

const question = 'The previous review question assumed 1038 SVGs needed internal <title>/<desc>; that premise was wrong, because every diagram is embedded through <img> and the alt attribute is the accessible name. Corrected measurement: alt coverage is 837 of 837 references, 1 reference is broken (embedded/hardware/hbm/chapter09-cxl-mem.md points at a missing ch09-cxl-mem-tier.svg on a published post), and 223 SVGs are unreferenced. Should the broken diagram be authored or its reference removed, and are the unreferenced artifacts retired or kept as imported assets?';

const item = registry.items.find(({ id }) => id === 'AP-M-69');
if (!item) throw new Error('AP-M-69 not found');
if (item.disposition !== 'unassessed') throw new Error(`AP-M-69 is ${item.disposition}; refusing to rewrite a recorded decision.`);

console.log(`AP-M-69 review question correction; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
console.log(`  from: ${item.reviewQuestion}`);
console.log(`  to  : ${question}`);
if (!apply) process.exit(0);

item.reviewQuestion = question;
item.nextAction = 'implementation';
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log('Recorded corrected AP-M-69 review question; disposition stays unassessed.');
