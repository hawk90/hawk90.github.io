#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const base = 'src/content/blog/tools/debugging/postmortem';
const out = 'reports/adsense-audit/fixes';
const names = [
  'chapter01-core-generation.md', 'chapter02-elf-core-format.md',
  'chapter03-gdb-core-analysis.md', 'chapter04-debuginfod-minidump-automation.md',
  'chapter05-cxl-device-postmortem.md', 'chapter06-cxl-fabric-postmortem.md',
];
const paths = names.map((name) => `${base}/${name}`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'postmortem-examples-'));
const logs = [];
const checks = new Map(names.map((_, i) => [String(i + 1).padStart(2, '0'), []]));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: tmp, encoding: 'utf8', timeout: 30_000, ...options });
  if (result.error) throw result.error;
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

function record(chapter, message) {
  checks.get(chapter).push(message);
  logs.push(`[${chapter}] ${message}`);
}

function expect(condition, message) {
  assert.ok(condition, message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function head(relativePath) {
  const result = spawnSync('git', ['show', `HEAD:${relativePath}`], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, `cannot read HEAD:${relativePath}`);
  return result.stdout;
}

function code(markdown, language, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\x60\\x60\\x60${language} title="${escaped}"[^\\n]*\\n([\\s\\S]*?)^\\x60\\x60\\x60\\s*$`, 'm');
  const match = markdown.match(pattern);
  expect(match, `missing named ${language} fence: ${title}`);
  return `${match[1]}\n`;
}

function sha(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableFrontmatter(value) {
  const fm = value.match(/^---\n[\s\S]*?\n---\n/)?.[0] ?? '';
  return ['slug', 'date', 'series', 'seriesOrder', 'draft'].map((key) => {
    const match = fm.match(new RegExp(`^${key}:.*$`, 'm'));
    return `${key}=${match?.[0] ?? '<missing>'}`;
  }).join('\n');
}

function frontmatterField(value, key) {
  const fm = value.match(/^---\n[\s\S]*?\n---\n/)?.[0] ?? '';
  return fm.match(new RegExp(`^${key}:.*$`, 'm'))?.[0] ?? '';
}

function write(name, value) {
  fs.writeFileSync(path.join(tmp, name), value);
  return path.join(tmp, name);
}

function makeElfNoteFixture() {
  const note = Buffer.alloc(24);
  note.writeUInt32LE(5, 0); // namesz, including NUL
  note.writeUInt32LE(4, 4); // descsz
  note.writeUInt32LE(1, 8); // NT_PRSTATUS
  note.write('CORE\0', 12, 'ascii');
  note.writeUInt32LE(0x12345678, 20);

  const elf = Buffer.alloc(120 + note.length);
  elf.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1], 0); // ELF64, little-endian
  elf.writeUInt16LE(4, 16); // ET_CORE
  elf.writeUInt16LE(62, 18); // EM_X86_64
  elf.writeUInt32LE(1, 20); // EV_CURRENT
  elf.writeBigUInt64LE(64n, 32); // e_phoff
  elf.writeUInt16LE(64, 52); // e_ehsize
  elf.writeUInt16LE(56, 54); // e_phentsize
  elf.writeUInt16LE(1, 56); // e_phnum
  elf.writeUInt32LE(4, 64); // PT_NOTE
  elf.writeUInt32LE(0, 68); // p_flags
  elf.writeBigUInt64LE(120n, 72); // p_offset
  elf.writeBigUInt64LE(BigInt(note.length), 96); // p_filesz
  elf.writeBigUInt64LE(BigInt(note.length), 104); // p_memsz
  elf.writeBigUInt64LE(4n, 112); // p_align
  note.copy(elf, 120);
  return elf;
}

const dispositions = [
  { status: 'remediated', reason: '확인된 API·시그널·설명 오류를 수정했으며, Linux core 생성은 실행하지 않음.' },
  { status: 'remediated', reason: '확인된 시그널 상수 오류를 수정하고 노트 레이아웃 모델을 검증했으며, 실제 커널 core/ABI는 검증하지 않음.' },
  { status: 'remediated', reason: 'GDB 실행/자동화 설명과 시그널 상수를 바로잡았으며, 로컬 GDB 부재로 실제 세션은 미실행.' },
  { status: 'remediated', reason: 'Build-ID·debuginfod·CI·Python 예제의 확인된 오류를 수정하고 정적/fixture 검증; 실제 GDB/CI/minidump 운영은 미실행.' },
  { status: 'unassessed', reason: '커널 소스에 관한 기존 근거는 있으나 drgn 예제와 CXL 하드웨어/vmcore 동작을 이 루프에서 검증하지 않음.', nextAction: 'manual-review', reviewQuestion: '명시한 drgn 버전과 고정 Linux kernel build/vmcore에서 각 필드와 walker가 실행되는가?' },
  { status: 'unassessed', reason: 'fabric 시나리오, 로그/API, 시간 정렬, tracepoint를 실제 환경에서 확인하지 않음.', nextAction: 'manual-review', reviewQuestion: '지원되는 CXL fabric, FM, switch, kernel 조합에서 각 자료원과 시나리오를 재현할 수 있는가?' },
];

const fieldTemplate = {
  contextAndScope: '', signalAndRefutation: '', causeAndAlternatives: '', evidence: '',
  sampleScope: '', decision: '', smallestSafeChangeAndRollback: '', validationAndResidualRisk: '',
};
const evidence = [
  {
    contextAndScope: 'Linux 프로세스의 core 생성 설정, `/blog/tools/debugging/postmortem/chapter01-core-generation`.',
    signalAndRefutation: '`PR_SET_DUMPABLE=2`를 쓰는 API 예제와 suid_dumpable 설명 혼동이 문제 신호. 두 설정은 별개이며 2는 현대 API 값이 아님.',
    causeAndAlternatives: '역사적 `suid_dumpable` mode 2를 `PR_SET_DUMPABLE` 인자로 옮긴 혼동. 각각의 man page와 커널 sysctl 문서로 분리해 설명.',
    evidence: '[PR_SET_DUMPABLE man page](https://man7.org/linux/man-pages/man2/PR_SET_DUMPABLE.2const.html), [kernel suid_dumpable docs](https://docs.kernel.org/admin-guide/sysctl/fs.html#suid-dumpable), [core_pattern docs](https://docs.kernel.org/admin-guide/sysctl/kernel.html#core-pattern).',
    sampleScope: '본문 전체와 titled C fence를 확인; C 예제는 Linux API가 없는 로컬 환경에서 컴파일/실행하지 않았고, 코드 상수는 정적 검사.',
    decision: 'remediated: 0/1 API 호출만 보이고, 별도 sysctl=2 의미와 pipe/file 경로 조건을 분리해 서술.',
    smallestSafeChangeAndRollback: '본문 두 설정 설명과 named example만 변경. URL/frontmatter 보존. 되돌릴 경계는 이 파일의 diff.',
    validationAndResidualRisk: 'static contract PASS. Linux core 생성, systemd-coredump와 핸들러 실행은 미검증; 대상 배포판에서 재검토 필요.',
  },
  {
    contextAndScope: 'ELF core notes와 Linux siginfo 설명, `/blog/tools/debugging/postmortem/chapter02-elf-core-format`.',
    signalAndRefutation: 'SEGV_BNDERR/PKUERR 및 ILL_PRVOPC/PRVREG의 숫자가 Linux ABI 값과 달랐음.',
    causeAndAlternatives: '상수 값의 오기. 구조 전체가 동일하다고 확장하지 않고 아키텍처/커널 의존 caveat 유지.',
    evidence: '[Linux sigaction si_code docs](https://man7.org/linux/man-pages/man2/sigaction.2.html#The_si_code_field); 공식 값: SIGSEGV 3/4, SIGILL 5/6.',
    sampleScope: '전체 글과 titled ELF note arithmetic C fixture 확인; 실제 core ABI·아키텍처 레지스터 layout은 시험하지 않음.',
    decision: 'remediated: 잘못된 값 수정, note layout C 예제는 ABI 구현이 아니라 align 계산 모델로 한정.',
    smallestSafeChangeAndRollback: '상수/범위 표현과 모델 주석만 변경. 고정 URL과 메타데이터 보존.',
    validationAndResidualRisk: 'clang compile 및 모델 체크 PASS; 실제 Linux kernel note emit/reader interop 미검증.',
  },
  {
    contextAndScope: 'GDB로 core 파일을 여는 절차와 시그널 표, `/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis`.',
    signalAndRefutation: 'siginfo 숫자 6/7은 Linux 정의와 불일치; `coredumpctl debug` 설명은 자동 debuginfo 확보까지 단정했음; Ch4를 series 마지막으로 표기.',
    causeAndAlternatives: '상수 복사 오류 및 debugger 시작과 심볼 다운로드를 같은 기능으로 묶은 설명. 실행 파일/core 지정과 debuginfod 설정을 구분.',
    evidence: '[Linux si_code docs](https://man7.org/linux/man-pages/man2/sigaction.2.html#The_si_code_field), [GDB command-line docs](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Invocation.html), [GDB debuginfod settings](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Debuginfod-Settings.html).',
    sampleScope: 'GDB batch/open commands directly extracted and shell syntax checked; GDB is unavailable, no actual core opened.',
    decision: 'remediated: corrected table, described debugger launch without promising symbols, added non-running batch invocation and fixed series handoff.',
    smallestSafeChangeAndRollback: 'Text and two titled shell snippets only; URL and order preserved. Revert is confined to chapter03 diff.',
    validationAndResidualRisk: 'static check and bash -n PASS; user GDB config, auto-load behavior, actual core symbols and outputs remain unverified.',
  },
  {
    contextAndScope: 'Build-ID matching, debuginfod, minidump, CI, and Python/pyelftools examples, `/blog/tools/debugging/postmortem/chapter04-debuginfod-minidump-automation`.',
    signalAndRefutation: 'SHA-1 length claim, unconditional core build-id, noninteractive GDB download assumption, CI `|| true` plus `failure()`, Python join TypeError and incomplete ELF parser were incorrect or overbroad.',
    causeAndAlternatives: 'Format lengths, core contents, debugger defaults, Actions status conditions and Python types were conflated. Clarify conditional behavior; require explicit inputs; keep unsupported ABI decoding out of sample.',
    evidence: '[GNU ld build-id docs](https://sourceware.org/binutils/docs/ld/Options.html), [GDB debuginfod settings](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Debuginfod-Settings.html), [elfutils debuginfod](https://sourceware.org/elfutils/Debuginfod.html), [GitHub Actions status functions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions), [Sanitizer common flags](https://github.com/google/sanitizers/wiki/SanitizerCommonFlags).',
    sampleScope: 'Named shell/Python/YAML excerpts extracted from the article; bash syntax, Python syntax, synthetic ELF PT_NOTE fixture tested. No GDB, CI runner, production debuginfod, Breakpad/crashpad, Sentry or real core.',
    decision: 'remediated: corrected SHA-1 to 20 bytes; made build-id/core and debuginfod conditional; fixed CI and join; limited pyelftools output to note inventory; made minidump claims variable.',
    smallestSafeChangeAndRollback: 'Only confirmed description/body/fence corrections; URL/date/order unchanged. Revert boundary is this chapter.',
    validationAndResidualRisk: 'bash -n, Python compile, synthetic PT_NOTE parser and static contracts PASS. Service URLs, versions, YAML workflow integration and real artifacts still need environment testing.',
  },
  {
    contextAndScope: 'CXL device vmcore/drgn article, `/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem`.',
    signalAndRefutation: 'Prior published-loop calls factcheck verified based on source inspection; that does not establish drgn execution or device/vmcore behavior.',
    causeAndAlternatives: 'Source-code inspection and runtime/hardware evidence are different scopes. Preserve source-derived explanation but state runtime limit.',
    evidence: '[Linux CXL core RAS source](https://github.com/torvalds/linux/blob/master/drivers/cxl/core/ras.c), [CXL structures](https://github.com/torvalds/linux/blob/master/drivers/cxl/cxl.h), [kernel CXL docs](https://cdn.kernel.org/doc/html/latest/driver-api/cxl/linux/cxl-driver.html).',
    sampleScope: 'Read the chapter and named drgn Python fences; syntax compilation only. No drgn, Linux kernel vmcore, CXL device, or live host used.',
    decision: 'unassessed: added an explicit source/hardware validation limit. Do not treat previous source comparison as runtime verification.',
    smallestSafeChangeAndRollback: 'Added scope note and fence labels only; no CXL implementation claim changed. Revert confined to this chapter.',
    validationAndResidualRisk: 'Python syntax and text-scope checks PASS; field validity and runtime walker behavior remain unverified; manual review question: ' + dispositions[4].reviewQuestion,
  },
  {
    contextAndScope: 'CXL fabric multi-host postmortem article, `/blog/tools/debugging/postmortem/chapter06-cxl-fabric-postmortem`.',
    signalAndRefutation: 'The article contains unverified ptime, tracepoint, BISnp, time-accuracy, drgn and LWP claims; a proposed scenario is not reproduced evidence.',
    causeAndAlternatives: 'Conceptual operational guidance is written in declarative form. Explicitly label examples as plans and avoid claiming kernel-version support for a fabric helper.',
    evidence: 'Published-loop-34 marks the entire article unverified and lists ptime/PROC TIME, BISnp count, cxl_mem read/write tracepoint and LWP as unconfirmed. No new hardware source was available for those claims.',
    sampleScope: 'Full article read and conceptual Python fence syntax-compiled. No CXL fabric, FM, switch, CXL kernel, vmcore, or trace session.',
    decision: 'unassessed: retain the scenario framework with an explicit validation caveat; no technical claims promoted to verified.',
    smallestSafeChangeAndRollback: 'Added conceptual-scope note, marked precision estimates as environment-dependent, removed unverified kernel 6.5+ helper claim; preserve article URL and order.',
    validationAndResidualRisk: 'Syntax/static scope checks PASS only; all environment-specific claims need manual review. Review question: ' + dispositions[5].reviewQuestion,
  },
];

try {
  const docs = paths.map(read);
  for (let i = 0; i < paths.length; i++) {
    const old = head(paths[i]);
    expect(stableFrontmatter(docs[i]) === stableFrontmatter(old), `slug/date/series/order/draft changed: ${paths[i]}`);
    expect(frontmatterField(docs[i], 'title') === frontmatterField(old, 'title'), `title changed unexpectedly: ${paths[i]}`);
    if (i !== 3) expect(frontmatterField(docs[i], 'description') === frontmatterField(old, 'description'), `description changed unexpectedly: ${paths[i]}`);
    else expect(frontmatterField(docs[i], 'description') !== frontmatterField(old, 'description'), 'chapter04 confirmed description correction missing');
    record(String(i + 1).padStart(2, '0'), 'slug/date/series/seriesOrder/draft match HEAD');
  }

  const [ch1, ch2, ch3, ch4, ch5, ch6] = docs;
  expect(ch1.includes('PR_SET_DUMPABLE, 0') && ch1.includes('PR_SET_DUMPABLE, 1') && !/PR_SET_DUMPABLE\s*,\s*2/.test(ch1), 'chapter01 dumpable API values incorrect');
  expect(ch1.includes('suid_dumpable') && ch1.includes('core_pipe_limit'), 'chapter01 distinction/pipe contract missing');
  record('01', 'static API contract passed: PR_SET_DUMPABLE 0/1 separated from suid_dumpable; pipe limit caveat present');

  for (const needle of ['3 (SEGV_BNDERR)', '4 (SEGV_PKUERR)', '5 (ILL_PRVOPC)', '6 (ILL_PRVREG)']) expect(ch2.includes(needle), `chapter02 missing ${needle}`);
  for (const needle of ['3=SEGV_BNDERR', '4=SEGV_PKUERR']) expect(ch3.includes(needle), `chapter03 missing ${needle}`);
  expect(!/SEGV_BNDERR\s*[=|: ]+6|SEGV_PKUERR\s*[=|: ]+7/.test(ch2 + ch3), 'stale SIGSEGV codes remain');
  record('02', 'Linux si_code values checked against official signal documentation');
  record('03', 'Linux si_code values checked; series handoff points to chapters 5 and 6');

  const yaml = code(ch4, 'yaml', 'test.yml');
  expect(yaml.includes('if: always()') && !yaml.includes('|| true') && yaml.includes('shopt -s nullglob'), 'CI failure path contract not repaired');
  expect(ch4.includes('20바이트') && ch4.includes('비대화형 실행에서는 필요한 경우 명시적으로 활성화'), 'Build-ID/debuginfod qualification missing');
  expect(ch4.includes('frame.split()[1:3]') && ch4.includes('" ".join(parts)') && !ch4.includes('"|".join(frame.split()[1:3]'), 'stack grouping join repair missing');
  expect(ch4.includes('개념 예시') && ch4.includes('minidump의 크기와 포함 정보'), 'minidump limits not qualified');
  record('04', 'static contracts passed: CI step ordering, Python string grouping, SHA-1 length, debuginfod defaults and variable minidump scope');

  const cc = run('clang', ['--version'], { cwd: root });
  expect(cc.status === 0, 'clang is required');
  const cNote = write('elf-note-layout.c', code(ch2, 'c', 'elf-note-layout.c'));
  let result = run('clang', ['-std=c11', '-Wall', '-Wextra', '-Werror', cNote, '-o', path.join(tmp, 'elf-note-layout')]);
  expect(result.status === 0, `ELF layout model compile failed: ${result.output}`);
  result = run(path.join(tmp, 'elf-note-layout'), []);
  expect(result.status === 0, `ELF layout model assertions failed: ${result.output}`);
  record('02', 'named C layout arithmetic model compile/run and SIZE_MAX overflow rejection passed; this is not a kernel ABI test');

  for (const [chapter, title] of [['03', 'gdb-core-batch.sh'], ['04', 'postmortem.sh']]) {
    const markdown = docs[Number(chapter) - 1];
    const source = code(markdown, 'bash', title);
    const script = write(`${title}.bash`, source);
    result = run('bash', ['-n', script]);
    expect(result.status === 0, `${title} shell syntax failed: ${result.output}`);
    record(chapter, `named ${title} extracted from article and bash -n passed`);
  }

  for (const [chapter, title] of [['04', 'analyze-and-alert.py'], ['04', 'core-notes.py'], ['05', 'drgn-cxl-region.py'], ['05', 'drgn-cxl-nodes.py'], ['06', 'drgn-fabric-concept.py']]) {
    const markdown = docs[Number(chapter) - 1];
    const source = code(markdown, 'python', title);
    const script = write(`${title.replaceAll('/', '-')}` , source);
    result = run('python3', ['-m', 'py_compile', script]);
    expect(result.status === 0, `${title} Python syntax failed: ${result.output}`);
    record(chapter, `named ${title} extracted and Python syntax-compiled (no GDB/drgn execution)`);
  }

  const notes = write('core-notes.py', code(ch4, 'python', 'core-notes.py'));
  fs.writeFileSync(path.join(tmp, 'synthetic-core.elf'), makeElfNoteFixture());
  result = run('python3', [notes, path.join(tmp, 'synthetic-core.elf')], {
    cwd: root,
    env: { ...process.env, PYTHONPATH: '/private/tmp/adsense-pyelftools-2026-10-22' },
  });
  expect(result.status === 0 && result.output.includes('NT_PRSTATUS') && result.output.includes('description-bytes= 4'), `synthetic PT_NOTE parse failed: ${result.output}`);
  record('04', 'named pyelftools example parsed a synthetic ELF64 PT_NOTE fixture with pyelftools 0.32; not a Linux core test');

  const dumpable = code(ch1, 'c', 'dumpable-values.c');
  expect(dumpable.includes('PR_SET_DUMPABLE, 0') && dumpable.includes('PR_SET_DUMPABLE, 1') && !dumpable.includes('PR_SET_DUMPABLE, 2'), 'dumpable example includes invalid API value');
  record('01', 'named Linux C sample source checked; Linux headers/runtime unavailable, so no compile or execution');

  expect(ch5.includes('CXL 하드웨어나 vmcore에서 실행 검증한 절차를 보고하지 않습니다'), 'chapter05 runtime caveat missing');
  expect(ch6.includes('실제 vmcore에서 확인되지 않았습니다') && ch6.includes('환경별 편차 있음') && !ch6.includes('kernel 6.5+ 필요'), 'chapter06 unassessed caveat incomplete');
  record('05', 'CXL runtime boundary explicitly stated; no hardware/vmcore validation claimed');
  record('06', 'concept-only scope explicit; unverified runtime identifiers are not marked as verified');

  const gateArgs = paths;
  const gate = run('bash', ['scripts/audit-publish-gate.sh', ...gateArgs], { cwd: root });
  expect(gate.status === 0, `publish gate failed: ${gate.output}`);
  const upstreamSkipped = gate.output.includes('SKIPPED — upstream clone이 없어 아무것도 검사하지 않음');
  expect(upstreamSkipped, 'expected upstream symbol check to explicitly report SKIPPED');
  for (const chapter of ['01', '02', '03', '04', '05', '06']) record(chapter, 'article publish gate blocking checks PASS; upstream cited-symbol audit SKIPPED (not a pass)');

  const math = run('node', ['scripts/check-inline-math.mjs', ...gateArgs], { cwd: root });
  expect(math.status === 0, `inline math check failed: ${math.output}`);
  for (const chapter of ['01', '02', '03', '04', '05', '06']) record(chapter, 'inline math check PASS');

  const diff = run('git', ['diff', '--check', '--', ...gateArgs, 'scripts/verify-postmortem-examples.mjs'], { cwd: root });
  expect(diff.status === 0, `git diff --check failed: ${diff.output}`);
  for (const chapter of ['01', '02', '03', '04', '05', '06']) record(chapter, 'git diff --check PASS');

  const articles = paths.map((pathname, i) => ({
    path: pathname,
    beforeSha256: sha(head(pathname)),
    afterSha256: sha(docs[i]),
    status: dispositions[i].status,
    validation: checks.get(String(i + 1).padStart(2, '0')).join('; '),
    dispositionEvidence: { ...fieldTemplate, ...evidence[i] },
    ...(dispositions[i].nextAction ? { nextAction: dispositions[i].nextAction, reviewQuestion: dispositions[i].reviewQuestion } : {}),
  }));

  fs.mkdirSync(path.join(root, out), { recursive: true });
  const compiler = cc.output.split('\n')[0];
  const log = [
    'Postmortem debugging article example verification',
    'date: 2026-10-22',
    `compiler: ${compiler}`,
    'pyelftools: 0.32 (PYTHONPATH=/private/tmp/adsense-pyelftools-2026-10-22)',
    'NOT RUN: Linux core generation, GDB, coredumpctl, systemd, debuginfod server, CI runner, Breakpad/crashpad runtime, CXL hardware/fabric, CXL vmcore/drgn runtime.',
    'PUBLISH GATE: blocking checks PASS; upstream cited-symbol audit SKIPPED because upstream clones are unavailable (SKIPPED is not a pass).',
    'INLINE MATH: PASS for all six chapters.',
    'GIT DIFF CHECK: PASS for all six chapters and verifier script.',
    ...logs,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, `${out}/postmortem-examples-2026-10-22.log`), log);
  fs.writeFileSync(path.join(root, `${out}/postmortem-2026-10-22.json`), JSON.stringify({
    date: '2026-10-22',
    baseline: 'HEAD source hashes; chapters 01 and 02 already had partial workspace edits before this continuation, so their original pre-edit workspace hashes are unavailable.',
    rescored: false,
    articles,
  }, null, 2) + '\n');
  process.stdout.write(log);
} catch (error) {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
