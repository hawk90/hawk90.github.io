#!/usr/bin/env node
// check-script-modes.mjs — 직접 실행되는 스크립트의 실행 비트 검사
//
// `./scripts/x`, `$ROOT/scripts/x`, `"$ROOT/scripts/x"`처럼 인터프리터 없이
// 실행되는 스크립트는 git 모드가 100755여야 한다. 실행 비트를 잃은
// detect-prose-in-code.sh가 publish gate에서 "SKIPPED"로 조용히 빠져
// 산문 검사가 꺼져 있던 일이 있었다. `node scripts/x.mjs`처럼 인터프리터로
// 부르는 파일은 실행 비트가 필요 없으므로 검사하지 않는다.
//
// Usage: node scripts/check-script-modes.mjs   (exit 1 = 실행 비트 누락)

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });

// 직접 실행 호출을 찾을 곳: 훅·CI·npm scripts·다른 스크립트
const callers = [
  'package.json',
  'lefthook.yml',
  ...git('ls-files', '.github/workflows').split('\n'),
  ...git('ls-files', 'scripts').split('\n'),
].filter((f) => f && existsSync(f));

const directExec = /(?:^|[\s"'`(=;&|])(?:\.\/|\$ROOT\/|"\$ROOT"\/|\$\{ROOT\}\/)scripts\/([A-Za-z0-9._-]+)/g;
const invoked = new Map(); // script -> first caller
for (const file of callers) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(directExec)) {
    const name = m[1];
    // `python3 "$ROOT/scripts/x.py"`처럼 인터프리터가 바로 앞에 있으면 제외
    const before = text.slice(Math.max(0, m.index - 12), m.index + 1);
    if (/(?:bash|sh|python3?|node)\s+["']?$/.test(before)) continue;
    if (!invoked.has(name)) invoked.set(name, file);
  }
  // publish gate는 require_checker "x"로 실행 비트를 요구한 뒤 직접 실행한다.
  for (const m of text.matchAll(/require_checker "([A-Za-z0-9._-]+)"/g)) {
    if (!invoked.has(m[1])) invoked.set(m[1], file);
  }
}

const modes = new Map(
  git('ls-files', '-s', 'scripts')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [meta, path] = line.split('\t');
      return [path.replace(/^scripts\//, ''), meta.split(' ')[0]];
    }),
);

const missing = [];
for (const [name, caller] of [...invoked].sort()) {
  const mode = modes.get(name);
  if (!mode) continue; // 미추적·생성 파일은 다른 검사 몫
  if (mode !== '100755') missing.push(`scripts/${name} (mode ${mode}, called from ${caller})`);
}

if (missing.length) {
  console.error('✗ 직접 실행되는데 실행 비트가 없는 스크립트:');
  for (const m of missing) console.error(`  - ${m}`);
  console.error('  고치기: git update-index --chmod=+x <file> && chmod +x <file>');
  process.exit(1);
}
console.log(`✓ 직접 실행 스크립트 ${invoked.size}개 모두 실행 비트 있음`);
