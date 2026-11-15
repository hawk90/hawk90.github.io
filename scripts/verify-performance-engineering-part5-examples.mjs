import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = 'src/content/blog/embedded/performance-engineering';
const names = [
  'part5-01-perf-basics.md', 'part5-02-perf-advanced.md', 'part5-03-ftrace.md',
  'part5-04-ebpf.md', 'part5-05-flamegraph.md', 'part5-06-arm-ds-lauterbach.md',
  'part5-07-baremetal-profiling.md', 'part5-08-nsight.md', 'part5-09-tracy-hotspot.md',
  'part5-10-ebpf-continuous.md', 'part5-11-cxl-profiling-tools.md',
];
const docs = new Map(names.map((name) => [name, readFileSync(path.join(root, base, name), 'utf8')]));
const fences = (s) => [...s.matchAll(/^```([^\n]*)\n([\s\S]*?)^```\s*$/gm)].map(([, info, body]) => ({ info: info.trim(), body }));
const hash = (s) => createHash('sha256').update(s).digest('hex');
for (const [name, source] of docs) {
  const blocks = fences(source);
  assert.ok(blocks.length > 0, `${name}: named fences present`);
  assert.ok(blocks.every(({ body }) => body.trim()), `${name}: no empty code fences`);
  const sourcePath = path.posix.join(base, name);
  const head = execFileSync('git', ['show', `HEAD:${sourcePath}`], { encoding: 'utf8' });
  const metadata = (text, key) => text.match(/^---\n([\s\S]*?)\n---/)[1].match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1] ?? null;
  for (const key of ['slug', 'date', 'seriesOrder', 'draft']) assert.equal(metadata(source, key), metadata(head, key), `${name}: ${key} unchanged`);
  console.log(`PASS fence extraction and metadata preservation ${name}: ${blocks.length} non-empty fences`);
}
console.log('PASS all Part5 URL/date/draft/seriesOrder frontmatter values match HEAD');

const p01 = docs.get(names[0]);
assert.match(p01, /Overhead.*selected event|Overhead.*선택한 이벤트/);
assert.match(p01, /75\.6\s+│ 19:\s+jne/);
assert.doesNotMatch(p01, /1\.0 이상 양호|999~4000 Hz가 표준|4000 Hz에서 2~5% overhead/);
const annotation = [...p01.matchAll(/^\s*(\d+\.\d+)\s+│/gm)].map((m) => Number(m[1]));
assert.equal(annotation.reduce((a, n) => a + n, 0), 100);
console.log(`PASS 5-01 sample-share arithmetic (${annotation.join('+')}=100); fixed event-relative overhead and removed universal thresholds`);

const p02 = docs.get(names[1]);
assert.doesNotMatch(p02, /almost zero overhead|거의 zero overhead|1-4 kHz가 표준|4 kHz\)/i);
assert.match(p02, /PMU counter 수는 CPU에 따라 다릅니다/);
console.log('PASS 5-02 unsupported fixed counter/rate/overhead guidance removed; runtime PMU checks remain unrun');

const p03 = docs.get(names[2]);
assert.match(p03, /CONFIG_DYNAMIC_FTRACE/);
assert.match(p03, /available_filter_functions/);
assert.match(p03, /정확한 비용은 빌드·CPU에 따라 다릅니다/);
assert.doesNotMatch(p03, /모든 함수 진입과 이탈|비활성 \(nop\):\s+~1-2%/);
console.log('PASS 5-03 ftrace scope is config/function availability dependent; no fixed cost table');

const p04 = docs.get(names[3]);
assert.match(p04, /profile-bpfcc -F 99 -f 30/);
assert.doesNotMatch(p04, /profile-bpfcc -F 99 -ag/);
assert.match(p04, /커널 내부 이벤트는 안정된 userspace ABI로 보장되지 않으므로/);
assert.match(p04, /interpreter 또는 JIT 경로/);
console.log('PASS 5-04 BCC option/source assertions and tracepoint/JIT scope');

const p05 = docs.get(names[4]);
assert.match(p05, /--inverted < out\.folded > icicle\.svg/);
assert.match(p05, /--reverse < out\.folded > reversed-stack\.svg/);
assert.doesNotMatch(p05, /sched:sched_switch -g --call-graph dwarf/);
assert.doesNotMatch(p05, /99 Hz는 .*prime number|99 Hz 또는 999 Hz가 표준/);
assert.equal(99 % 3, 0);
assert.equal(999 % 3, 0);
console.log('PASS 5-05 flamegraph option/off-CPU corrections and composite sample-rate arithmetic');

const p06 = docs.get(names[5]);
assert.match(p06, /Cortex-M0에는 ETM이 없습니다/);
assert.doesNotMatch(p06, /ETM-M0|Cortex-M3 이상부터 ETM-M3|초당 10 Gbit|32 GB trace buffer/);
assert.match(p06, /가상 값/);
assert.match(p06, /인증 근거가 필요/);
console.log('PASS 5-06 core/SoC trace scope, illustrative output, certification caveat; no hardware trace run');

const p07 = docs.get(names[6]);
assert.match(p07, /DWT\(Data Watchpoint and Trace\)와 `CYCCNT`의 제공 여부는 core와 SoC 구현에 따라 다릅니다/);
assert.doesNotMatch(p07, /1-2 cycle|100배 빠른|~100 ns|~0\.5 us/);
assert.match(p07, /SysTick/);
console.log('PASS 5-07 removes universal DWT/GPIO/ITM costs; no MCU runtime');

const p08 = docs.get(names[7]);
const h2dA = p08.indexOf('cudaMemcpyAsync(d_a, h_a, n, cudaMemcpyHostToDevice, s1)');
const kernelA = p08.indexOf('kernel<<<grid, block, 0, s1>>>(d_a)');
const h2dB = p08.indexOf('cudaMemcpyAsync(d_b, h_b, n, cudaMemcpyHostToDevice, s2)');
const kernelB = p08.indexOf('kernel<<<grid, block, 0, s2>>>(d_b)');
assert.ok(h2dA >= 0 && h2dA < kernelA && h2dB < kernelB);
assert.match(p08, /nsys-ui/);
assert.match(p08, /GUI\(`nsys-ui`\)/);
assert.doesNotMatch(p08, /nsight-systems-2024-x-x-linux|보통 5-20 us 수준|추가 작업 없이 layer별 분석이 가능합니다|1\.5-2배로 늘어납니다/);
console.log('PASS 5-08 same-stream H2D-before-kernel order, documented GUI command, qualified overlap; no CUDA/GPU run');

const p09 = docs.get(names[8]);
assert.match(p09, /uftrace의 replay 출력에서 duration은 함수 실행시간/);
assert.match(p09, /\[ 1234\] \|   parse_input\(\) \{/);
assert.doesNotMatch(p09, /12\.345 us \[ 1234\] \|   parse_input\(\) \{|45\.678 us \[ 1234\] \|   process\(\) \{/);
assert.doesNotMatch(p09, /50-100 ns|5-20% overhead/);
console.log('PASS 5-09 uftrace entry rows have no duration and unmeasured fixed costs removed');

const p10 = docs.get(names[9]);
assert.doesNotMatch(p10, /1% 이하 overhead|<1%|30-50 MB|api_key.*profile에 노출|수십 TB/);
assert.match(p10, /local 변수 값이나 inline 상수는 자동으로 포함되지 않습니다/);
assert.match(p10, /다음 Part 6/);
console.log('PASS 5-10 unsupported fleet/privacy overhead claims removed and correct continuation');

const p11 = docs.get(names[10]);
assert.match(p11, /커널 버전·설정에 따라 달라집니다/);
assert.doesNotMatch(p11, /args->reason|args->succeeded|kprobe:cxl_event_thread|PERF_MEM_LVLNUM_CXL/);
assert.match(p11, /본 환경에는 CXL 장치와 Linux tracing stack이 없어/);
assert.match(p11, /기본 권장 비율은 1\/20/);
console.log('PASS 5-11 unstable probe/PMU claims removed; DAMON source and no-hardware scope recorded');

const manifest = JSON.parse(readFileSync(path.join(root, 'reports/adsense-audit/fixes/performance-engineering-part5-2026-10-22.json'), 'utf8'));
assert.equal(manifest.readyForIntegration, true, 'readyForIntegration set only after scoped checks/logs/hashes finalized');
assert.equal(manifest.articles.length, names.length);
for (let i=0;i<names.length;i++) {
  const a=manifest.articles[i];
  assert.equal(a.path, path.posix.join(base,names[i]));
  assert.match(a.status,/^(remediated|accepted|unassessed)$/);
  assert.equal(a.afterSha256, hash(readFileSync(path.join(root,a.path))));
  assert.ok(a.validation.length);
  if(a.status==='unassessed') assert.ok(a.nextAction && a.reviewQuestion);
}
console.log('PASS manifest order/status/validation and after SHA; readyForIntegration=true after scoped finalization');
console.log('LIMIT: The examples were extracted and source-checked; Linux perf/ftrace/eBPF, ARM probes, MCU, CUDA/Nsight, and CXL commands were not executed. No whole-site build was run.');
