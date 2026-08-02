#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const registry = JSON.parse(await readFile(`${archive}/remediation-plan/category-registries/quality.json`, 'utf8'));
const expected = ['AP-T-01','AP-T-02','AP-T-03','AP-T-04','AP-T-08','AP-T-09','AP-T-16','AP-T-17','AP-T-18','AP-T-19','AP-T-20','AP-T-21','AP-T-22','AP-T-23','AP-T-24','AP-T-25','AP-T-26','AP-T-32','AP-T-33','AP-T-34','AP-T-36','AP-T-37','AP-T-38','AP-T-39','AP-T-40','AP-T-41','AP-T-42','AP-T-43','AP-T-44','AP-T-45','AP-T-61','AP-T-62','AP-T-74','AP-T-76','AP-T-77','AP-T-78','AP-T-81','AP-T-83','AP-T-85','AP-T-91','AP-T-92','AP-T-93','AP-T-94','AP-T-95','AP-T-96','AP-T-98','AP-T-99'];
const findings = expected.filter((id) => { const item = registry.items.find((entry) => entry.id === id); return item?.disposition !== 'remediated' || !item.evidence?.length; }).map((id) => `${id}: missing release-control evidence`);
await mkdir('reports/quality', { recursive: true });
await writeFile('reports/quality/controls.md', ['# Quality control audit', '', `- Controls expected: ${expected.length}`, `- Findings: ${findings.length}`, ...findings.map((finding) => `- ${finding}`)].join('\n'));
console.log(`Quality controls: ${expected.length - findings.length}/${expected.length} verified; ${findings.length} finding(s).`);
if (findings.length) process.exitCode = 1;
