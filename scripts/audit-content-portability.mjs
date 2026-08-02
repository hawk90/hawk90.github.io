#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const normalize = await readFile('src/lib/content/normalize.ts', 'utf8');
const config = await readFile('src/content.config.ts', 'utf8');
const findings = [];
for (const [name, marker] of [['stable-url', 'url: `/blog/${entry.id}`'], ['explicit-topics', 'if (!explicitTopics.length)'], ['date-schema', 'date: z.coerce.date()'], ['publication-policy', 'status: entry.data.draft']]) if (!(name === 'date-schema' ? config : normalize).includes(marker)) findings.push(name);
if (!config.includes('topics: z.array(z.string()).min(1)')) findings.push('frontmatter-topics');
await mkdir('reports/content-portability', {recursive:true});
await writeFile('reports/content-portability/latest.md', ['# Content portability audit','',`- Findings: ${findings.length}`,...findings.map(x=>`- ${x}`),''].join('\n'));
console.log(`Content portability: ${findings.length} finding(s).`); if(findings.length)process.exitCode=1;
