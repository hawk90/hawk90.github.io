import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const base = 'src/content/blog/embedded/performance-engineering';
const files = [
  'part3-01-bus-architecture.md', 'part3-02-bus-contention.md',
  'part3-03-dma-performance.md', 'part3-04-dma-vs-cpu.md',
  'part3-05-interrupt-latency.md', 'part3-06-interrupt-storm.md',
  'part3-07-mmio.md', 'part3-08-peripheral-clock.md',
  'part3-09-power-vs-performance.md', 'part3-10-thermal.md',
  'part3-11-cxl-interconnect.md', 'part3-12-cxl-mem-latency.md',
];
const docs = new Map(files.map((file) => [file, readFileSync(path.join(base, file), 'utf8')]));
const fences = (text) => [...text.matchAll(/^```([^\n]*)\n([\s\S]*?)^```\s*$/gm)]
  .map(([, info, body]) => ({ info: info.trim(), body }));

for (const [file, text] of docs) {
  const blocks = fences(text);
  assert.ok(blocks.length > 0, `${file}: expected source examples`);
  assert.ok(blocks.every(({ body }) => body.trim().length > 0), `${file}: empty fence`);
  console.log(`PASS ${file}: extracted ${blocks.length} non-empty source fences (static extraction only)`);
}

const apb = docs.get(files[0]);
assert.match(apb, /최소 2단계\(Setup·Access\)/);
assert.doesNotMatch(apb, /APB[^\n]*단일 사이클/);
console.log('PASS part3-01 positive APB two-phase assertion; negative single-cycle contradiction rejected');

const bus = docs.get(files[1]);
assert.match(bus, /access\/cycle 비/);
assert.match(bus, /bus utilization이 아닙니다/);
assert.doesNotMatch(bus, /BUS_ACCESS=10M[^\n]*10% utilization/);
assert.match(bus, /19개 bus master와 18개 bus slave/);
assert.doesNotMatch(bus, /7×6 bus matrix/);
console.log('PASS part3-02 positive counter-scope and STM32H743 connectivity checks; negative utilization/7x6 claims rejected');

const dma = docs.get(files[2]);
assert.match(dma, /HAL_DMA_Init\(&hdma\)/);
assert.doesNotMatch(dma, /HAL_DMA_Init\(&hdma,\s*\./);
assert.match(dma, /DMA1\/2도 memory bus로 memory-to-memory 전송이 가능/);
assert.doesNotMatch(dma, /일반 DMA1\/2는 \*peripheral ↔ memory\*만 지원/);
console.log('PASS part3-03 source-fence API-shape and DMA capability assertions (no MCU build/run)');

const dmaVsCpu = docs.get(files[3]);
const cpuCyclesPerByte = 1 / 3;
const bytesFor200Cycles = 200 / cpuCyclesPerByte;
assert.equal(bytesFor200Cycles, 600);
assert.match(dmaVsCpu, /약 600 byte/);
assert.doesNotMatch(dmaVsCpu, /200 cycle은 약 60 byte/);
assert.doesNotMatch(dmaVsCpu, /STM32H743 실측/);
console.log('PASS part3-04 normal 200-cycle model=600B and negative 60B assertion; model is not target timing');

const irq = docs.get(files[4]);
assert.match(irq, /zero-wait-state 조건에서 Cortex-M3\/M4 IRQ latency는 \*\*12 cycle\*\*/);
assert.doesNotMatch(irq, /Cortex-M33 \| 11/);
console.log('PASS part3-05 reference-condition and unsupported-table-row checks');

const storm = docs.get(files[5]);
const lineRatePps = 1e9 / (84 * 8);
const isrShare = 112 * lineRatePps / 1e9;
assert.ok(Math.abs(lineRatePps - 1_488_095.238) < 1);
assert.ok(Math.abs(isrShare - 0.1666667) < 1e-6);
assert.match(storm, /1\.488 Mpps/);
assert.match(storm, /약 16\.7%/);
assert.doesNotMatch(storm, /1\.95 Mpps|220 Mcycle\/sec|22% ISR/);
console.log('PASS part3-06 normal Ethernet wire-rate/CPU model; negative 1.95Mpps/22% model rejected');

const mmio = docs.get(files[6]);
assert.match(mmio, /고정된 배수로 표현하지 않습니다/);
assert.doesNotMatch(mmio, /bandwidth가 8배/);
console.log('PASS part3-07 positive platform-dependent WC scope; unsupported 8x assertion rejected');

const clocks = docs.get(files[7]);
assert.match(clocks, /reset 상태는 MCU별로 다릅니다/);
assert.match(clocks, /앞선 register write의 완료를 보장; clock 안정화 대기는 아님/);
console.log('PASS part3-08 reset-value and DSB contract checks');

const thermal = docs.get(files[9]);
assert.match(thermal, /일반 workload 평균을 뜻하지 않음/);
assert.doesNotMatch(thermal, /SDP ~30 W/);
assert.doesNotMatch(thermal, /TDP\*\*와 \*\*SDP\*\*는 각각 평균과 peak/);
console.log('PASS part3-10 positive power-term scope and negative SDP-average assertion');

const cxl = docs.get(files[10]);
assert.match(cxl, /프로토콜별 유효 데이터량은 다르므로/);
assert.match(cxl, /cntfrq_el0/);
assert.match(cxl, /cache miss 자체를 보장하지는 않음/);
assert.doesNotMatch(cxl, /\(end - start\) \/ 1000000/);
console.log('PASS part3-11 positive flit/timer scope and negative tick-as-nanoseconds check');

const paper = docs.get(files[11]);
assert.match(paper, /Sun et al\. \(MICRO 2023\)/);
assert.match(paper, /논문이 보고한 측정값/);
console.log('PASS part3-12 citation and rounded-ratio scope checks; no CXL hardware run');

// Positive/negative model tests above validate article arithmetic and scope text.
// Extracted target code remains static evidence; this verifier does not execute it.
