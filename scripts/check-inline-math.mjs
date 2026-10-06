#!/usr/bin/env node
// check-inline-math.mjs — 의도하지 않은 인라인 수식($…$) 검사
//
// remark-math는 한 단락 안의 `$`두 개 사이를 수식으로 만든다. 그래서
// "대당 $20K~$40K", "($$$)", "TARGET_DIR → ${D}" 같은 가격·셸 변수가
// KaTeX 수식으로 렌더되어 문장이 깨진 채 발행된 일이 있었다. 이 검사는
// 실제 파이프라인(remark-parse + gfm + math + directive)으로 파싱한 뒤,
// 수식 노드 안에 수식일 수 없는 신호가 있으면 보고한다.
//
//   hangul     \text{…} 밖에 한글이 있음 ("$2K*에 살 수 … *$25K")
//   currency   숫자로 시작해 ~, -, 공백으로 끝남 ("$500K~$5M", "$5 * 2 = $10")
//   shell-var  ${VAR} 형태 ("${D}")
//   code       백틱이 들어 있음
//
// 고치는 법: 문자 그대로의 `$`는 `\$`로 쓴다. 코드라면 백틱으로 감싼다.
//
// Usage: node scripts/check-inline-math.mjs [files...]
//        인자가 없으면 발행된 글 전체(draft: true 제외). exit 1 = 위반.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// ../book-notes에서 동기화되는 수학 시리즈는 여기서 고치지 않는다 (CLAUDE.md §12).
const SYNCED = /^src\/content\/blog\/math\/(linear-algebra|set-theory)\//;

const args = process.argv.slice(2);
const explicit = args.length > 0;
const files = (explicit
  ? args
  : execFileSync('git', ['ls-files', 'src/content/blog/**/*.md'], { encoding: 'utf8' }).trim().split('\n')
).filter((f) => f.endsWith('.md') && !SYNCED.test(f) && existsSync(f));

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkDirective);
const outsideText = (tex) => tex.replace(/\\(?:text\w*|mathrm|operatorname)\{[^{}]*\}/g, '');

function reasons(tex) {
  const r = [];
  if (/[가-힣]/.test(outsideText(tex))) r.push('hangul');
  if (/^\d/.test(tex) && /[~\-\s]$/.test(tex)) r.push('currency');
  if (/^\{[A-Z_][A-Z0-9_]*\}/.test(tex)) r.push('shell-var');
  if (tex.includes('`')) r.push('code');
  return r;
}

let violations = 0;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  // 인자 없이 돌 때는 발행된 글만 본다. 명시한 파일(pre-commit)은 draft도 본다.
  if (!explicit && /^draft:\s*true\s*$/m.test(src.split('\n---')[0])) continue;
  // frontmatter를 같은 줄 수의 빈 줄로 바꿔 줄 번호를 원본과 맞춘다.
  const body = src.replace(/^---\n[\s\S]*?\n---\n/, (m) => '\n'.repeat(m.split('\n').length - 1));
  visit(parser.parse(body), 'inlineMath', (node) => {
    const why = reasons(node.value);
    if (!why.length) return;
    violations++;
    console.error(`✗ ${file}:${node.position.start.line} [${why.join(',')}] $${node.value.slice(0, 50)}$`);
  });
}

if (violations) {
  console.error(`\n${violations}개의 의도하지 않은 인라인 수식. 문자 그대로의 $는 \\$로 쓴다.`);
  process.exit(1);
}
console.log(`✓ 의도하지 않은 인라인 수식 없음 (${files.length}개 파일)`);
