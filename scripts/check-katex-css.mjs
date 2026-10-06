#!/usr/bin/env node
// check-katex-css.mjs — CDN KaTeX CSS가 빌드 렌더러와 같은 버전인지 검사
//
// 수식 HTML은 빌드 때 node_modules의 katex가 만들고, 그 스타일은
// BaseLayout.astro가 jsDelivr에서 버전을 박아 불러온다. 둘은 따로 움직여서
// 렌더러는 0.16.47인데 CSS는 0.16.9로 남아 있던 일이 있었다. KaTeX는 마이너
// 버전에서도 내부 클래스를 바꾸므로(0.18.0) 어긋나면 수식이 깨질 수 있다.
//
// 검사: (1) CDN URL의 버전 == 설치된 katex 버전
//       (2) integrity == 설치된 dist/katex.min.css의 sha384
// jsDelivr는 npm 패키지 파일을 그대로 서빙하므로 (2)는 오프라인으로 확인된다.
//
// Usage: node scripts/check-katex-css.mjs   (exit 1 = 불일치)

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LAYOUT = 'src/layouts/BaseLayout.astro';

const layout = readFileSync(LAYOUT, 'utf8');
const tag = layout.match(/href="https:\/\/cdn\.jsdelivr\.net\/npm\/katex@([^/]+)\/dist\/katex\.min\.css"\s+integrity="([^"]+)"/);
if (!tag) {
  console.error(`✗ ${LAYOUT}에서 jsDelivr KaTeX CSS 링크(href + integrity)를 찾지 못함`);
  process.exit(1);
}
const [, cdnVersion, integrity] = tag;

const installed = require('katex/package.json').version;
const css = readFileSync(require.resolve('katex/dist/katex.min.css'));
const expected = `sha384-${createHash('sha384').update(css).digest('base64')}`;

const errors = [];
if (cdnVersion !== installed) {
  errors.push(`CDN CSS 버전 ${cdnVersion} ≠ 설치된 katex ${installed}`);
}
if (integrity !== expected) {
  errors.push(`integrity가 katex@${installed} CSS와 다름\n    기대값: ${expected}`);
}

if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`  → ${LAYOUT}의 href 버전과 integrity를 위 값으로 고친다.`);
  process.exit(1);
}
console.log(`✓ KaTeX CSS ${installed} — 렌더러와 버전·integrity 일치`);
