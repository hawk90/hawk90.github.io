#!/usr/bin/env node
// Build a human-in-the-loop SVG review sheet. It never edits SVGs or content.
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const output = 'reports/diagrams/review.html';
const reportFiles = ['reports/diagrams/overlap-heuristic.txt', 'reports/diagrams/overlap-stronger.txt'];
const candidates = new Set();
for (const report of reportFiles) {
  const text = await readFile(report, 'utf8').catch(() => '');
  for (const line of text.split('\n')) {
    const match = line.match(/^([^\s].*\.svg)(?:: \d+ text-on-shape candidate\(s\))?$/);
    if (match) candidates.add(match[1].trim());
  }
}
const rows = [...candidates].sort().map((rel, index) => {
  const src = `../../public/images/blog/${rel}`;
  const key = `diagram-review:${rel}`;
  return `<article data-key="${key}" data-path="${rel}"><header><strong>${index + 1}. ${rel}</strong><label><input type="checkbox" data-review="${key}"> reviewed</label></header><img loading="lazy" src="${src}" alt="${rel.replaceAll('"', '&quot;')}"><p><a href="${src}" target="_blank" rel="noopener">open SVG</a></p></article>`;
}).join('\n');
await mkdir('reports/diagrams', { recursive: true });
await writeFile(output, `<!doctype html>
<meta charset="utf-8"><title>Diagram visual review</title>
<style>body{font:14px system-ui;margin:24px;background:#f6f7f9;color:#17202a}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px}article{background:white;border:1px solid #d8dee6;border-radius:8px;padding:12px}header{display:flex;justify-content:space-between;gap:8px;word-break:break-word}img{display:block;width:100%;height:260px;object-fit:contain;background:#fff;border:1px solid #eee;margin-top:10px}p{margin:8px 0 0}body[data-hide-reviewed=true] article[data-reviewed=true]{display:none}</style>
<h1>Diagram visual review</h1><p>Heuristic candidates only. Automated checks do not decide visual correctness. <button id="toggle">hide reviewed</button> <span id="count"></span></p><main>${rows}</main>
<script>const boxes=[...document.querySelectorAll('input[data-review]')],body=document.body;function refresh(){let n=0;for(const b of boxes){const k=b.dataset.review;b.checked=localStorage.getItem(k)==='yes';b.closest('article').dataset.reviewed=b.checked?'true':'false';if(!b.checked)n++}document.querySelector('#count').textContent=n+' pending / '+boxes.length+' candidates'}for(const b of boxes)b.addEventListener('change',()=>{localStorage.setItem(b.dataset.review,b.checked?'yes':'no');refresh()});document.querySelector('#toggle').onclick=()=>{body.dataset.hideReviewed=body.dataset.hideReviewed==='true'?'false':'true';refresh()};refresh()</script>`);
console.log(`Diagram review index: ${candidates.size} heuristic candidate(s) -> ${output}`);
