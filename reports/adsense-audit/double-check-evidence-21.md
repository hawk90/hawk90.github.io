# 초벌 근거 대조 — 공개 루프 21

Sol 최종 검토용. 점수나 확정오류를 재평가 결과로 복제하지 않았다. 글 원문은 전부 줄번호로 읽음; D 비교는 기재된 원문 쌍의 해당 range를 열어 확인하고, F의 실제 다음 order·related target·라벨을 확인했다. 외부 spec/compiler/커널 실행은 미수행이면 별도로 남김.

## 글별

### `part4-05-mutex.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part4-05-mutex.md`; 읽은 범위 1–256 전체.
- A–G 증거: A(24–105,127–192) futex/robust/unfair-lock 등 내용은 있으나 기본 mutex 관례도 상당함. B(38–78,107–125) pseudo/API/출력의 내부 일관성. C(107–125,225–239) 환경·버전·측정기록 미달. D: adaptive spin 63–78 ↔ `part4-04-spinlock.md` 187–202; mutex/semaphore 156–166 ↔ RTOS `part1-08-mutex.md` 48–60; PI 80–105 ↔ `part3-05-priority-inheritance.md` 101–135. E(2,5,38–105,127–192) promised items present; F(250–256) next verified; G no linked source.
- F actual: 250 next RW-Lock → public `part4-06-rw-lock.md`, order35; 254–256 4-03/4-04/4-06 links match label/title/order. No trailing explanation.
- Factcheck: 117–123 gives 2345 blocked events, maximum 45µs and total 1234ms. If total time is accumulated over those 2345 events, the maximum sum is 105.525ms; this is a direct 3-1 arithmetic contradiction candidate. Verify whether the trace tool defines these counters over the same population before finalizing. Futex/API, adaptive threshold, RTOS trace output require kernel/libc/FreeRTOS/trace tool source and run.

### `part4-06-rw-lock.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part4-06-rw-lock.md`; read 1–265 entire.
- A–G: A(24–85,103–198), four-protocol overview and measured data; B(26–55,87–101,133–160,176–198) writer function appears incomplete (no unlock/waiting decrement), seqlock example omitted declarations; C(236–248) no harness/compiler. D pairs: RCU 103–131 ↔ Recipes `part9-03-rcu-basics.md` 22–48·191–210; seqlock/double-buffer 133–162·176–198 ↔ Recipes `part9-02-wait-free.md` 45–75·77–104; same-series lock contention 151–169 ↔ `part4-03-lock-contention.md` 151–169. E title topics at 59–174; F(259–265) actual links; G no refs.
- F: 259 next Lock-Free → public `part4-07-lock-free.md`, order36; 263–265 links 4-05/4-07/RTOS part3-11 match targets. No explanatory trailing note.
- Factcheck candidate: 97–99 says 90:10 RW lock 1.5–3×, 243 gives 4.2/1.1 ≈3.82×. Could reflect specific benchmark outside stated general range; ask whether benchmark same conditions before error conclusion. Arithmetic is simple but semantics/conditions matter. Official pthread/kernel/RCU docs and actual runnable benchmark required for API/performance claims.

### `part4-07-lock-free.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part4-07-lock-free.md`; read 1–305 entire.
- A–G: A(24–77,79–192,194–245) algorithms and reclamation options included; B(81–108,142–166,194–237) illustrative snippets have missing context/association (HP registration); C(274–288) benchmark describes platform but not build/setup. D pairs: ABA 110–123 ↔ Recipes `part9-08-aba-problem.md` 24–33; lock-free basics 34–59·194–237 ↔ Embedded C++ `part4-03-lock-free-basics.md` 69·96–115·156·221; tagged pointer/container 125–140 ↔ Embedded C++ `part4-04-lock-free-container.md` 95·144. E required CAS/ABA/HP/epoch sections present, depth varies. F(299–305) next/link check. G references by name but no links.
- F: 299 next Memory Ordering → public `part4-08-memory-ordering.md`, order37; 303–305 links 4-06/4-08/Embedded C++ 4-03 resolve to matching titles. No trailing explanation.
- Factcheck: no certain internal contradiction from reviewed claims. 276/284 LSE claim against A72, algorithm correctness, atomic function signatures, epoch/RCU and library adoption need ARM/C standards/library docs and compile/TSAN/benchmark tests; treat all as unresolved external matters.

### `part4-08-memory-ordering.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part4-08-memory-ordering.md`; read 1–279 entire.
- A–G: A(24–119,121–179) memory orders and architecture descriptions; B(80–108,121–140,154–192,236–244) barriers, cost claims and snippets have internal inconsistency candidates. C(246–262) no methods/toolchain. D: C/C++ order 26–78 ↔ same series `part4-01-concurrency-basics.md` 110–159; barrier 94–119 ↔ Recipes `part2-10-memory-barrier.md` 112–119·170–192; atomic cost ↔ Recipes `part9-06-atomic-cost.md` 82–90·210–226. E includes promised orders/ARM but analysis mostly unsourced. F(273–279) all links target check. G no primary links.
- F: 273 next Cache Coherency → public `part4-09-cache-coherency.md`, order38; 277–279 link targets valid; trailing text on TSan link explains its use.
- Existing 3-1 cases: 89 vs134 (seq_cst store `STLR + barrier` vs 5 cycle equal release) and 244 vs104/186–192 (barrier allegedly only orders already-atomic accesses while non-atomic data+DMA example relies on DMB) are direct text-level conflict candidates; Sol final. ARM ARM/C standard/compiler mapping and MCU DMA visibility must be checked before external correctness assertions. `DMB` does not itself make a C data race legal; separate distinction needed.

### `part4-09-cache-coherency.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part4-09-cache-coherency.md`; read 1–247 entire.
- A–G: A(24–100,102–169) states/protocol and use cases, some generalization. B(37–87,102–135,137–169) broad but exact core/protocol boundaries unreferenced. C(102–117,171–230) sample commands/tables lack reproducible context. D: false sharing 89–100·171–184 ↔ `part4-02-false-sharing.md` 19–37·170–184; CXL.cache 137–146 ↔ CXL series `part3-11-cxl-interconnect.md` 141–155; DMA coherence 192–199 ↔ 4-02/Recipes DMA material. E topics covered, some overly broad examples; F 241–247 verify. G no links.
- F: 241 next SMP Analysis → public `part4-10-smp-analysis.md`, order39; 245–247 4-02/4-08/4-10 links resolve. No trailing description.
- Factcheck: no definitive internal 3-1 contradiction besides diagram/table issue candidate: image source `public/images/blog/perf-eng/diagrams/part4-09-mesi-states.tex` 48–50 gives remote-read M→S, while 41 says M owner flushes then I for the other-cache read miss; reconcile diagram and MESI transition before final. ARM Cortex MOESI/CCI capabilities, event IDs r2A/r2B/r2D, CXL version claims and lock-step behavior require Arm PMU/TRM, CXL spec and perf event docs. Sample values need target execution.

### `part4-10-smp-analysis.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part4-10-smp-analysis.md`; read 1–293 entire.
- A–G: A(24–99,101–189,191–229,262–276) broad scheduler/NUMA/scaling coverage. B(63–85,101–147,205–229,262–276) claims and measurement story need validation. C(26–53,74–99,262–276) commands plus illustrative tables, no environment/method. D: CFS migration/affinity compare `part3-09-power-vs-performance.md` 109–121; coherency/NUMA compare `part4-09-cache-coherency.md` 119–135; affinity strategy compare Recipes IRQ affinity material. E title suggests analysis but 63–72 only brief overview and 276 says fitting without method. F(287–293) actual link check. G no primary citations.
- F: 287 next Tooling and Profiling → actual public next order40 `part5-01-perf-basics.md`; 291–293 4-09/4-02/RTOS links resolve. No trailing explanation.
- Factcheck: 209 USL equation with α=.1, β=.01 yields approx S(4)=2.82, S(8)=3.54, S(16)=3.27, S(32)=2.28, unlike 217–220's 3.0/4.7/5.8/5.7; equation peaks near N≈9.5, not 16–32. Direct equation/table internal inconsistency candidate. Migration costs (79–85), NUMA ratios (97–99), scheduler intervals, FreeRTOS/Zephyr API/version need sources/measurement. E also lowered because promised fitting method absent, not factual error.

### `part5-01-perf-basics.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part5-01-perf-basics.md`; read 1–307 entire.
- A–G: A(24–64,66–117,119–222,224–289) tutorial is procedural; B coherent progression, thresholds/CPU examples unsupported. C has commands and sample outputs but no target Linux/kernel/perf versions or measured provenance. D: PMU/perf 57–71 ↔ `part2-10-pmu.md` 57–71; perf advanced next `part5-02`; D report also pairs `part1-08` 72–89 etc. E title/description all three commands present. F 300–307 actual next and other links. G no sources.
- F: 300 next advanced perf → public `part5-02-perf-advanced.md`, order41; 304–307 links 5-02/1-01/2-10/RTOS observability resolve. Last link trailing explanation describes tracing/observability link.
- Factcheck: 168–174 annotate sample marks line 12 `add` at 23.4% as “가장 hot”, while line 19 `jne` is 76.0%; the ratios sum to 100.4%, outside rounding allowance. Direct 3-1 internal inconsistency candidate. IPC/cache thresholds and perf security-level behavior vary by system; capabilities, event definitions and sampling overhead require perf/kernel docs or execution.

### `part5-02-perf-advanced.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part5-02-perf-advanced.md`; read 1–255 entire (tool transcript was clipped).
- A–G: A(24–65,67–126,128 onward) event/tracepoint/script coverage; B examples and output, scripting completeness to inspect. C commands but version-dependent events. D comparisons verified in loop report: `part2-10-pmu.md` 65·199–202; `part5-03-ftrace.md` 138–159; Recipes `part9-09-false-sharing.md` 169–180. E raw events/script promised; F next target and labels in source footer; G official event/overhead refs absent.
- F: title footers indicate next is ftrace (`part5-03-ftrace.md`, order42); verify exact next/related target title before root final. Related links as report source.
- Factcheck: existing report says no confirmed issue. Group semantics, raw events, tracepoint stability/zero overhead, DWARF overhead and Python callback API require perf docs/kernel build and runnable test.

### `part5-03-ftrace.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part5-03-ftrace.md`; read 1–260 entire. A(24–101,103–190) tracer taxonomy and workflow; B(77–134,180–204) latency table/content overlap; C commands/samples, no kernel/build version. D: latency tracer 125–132 ↔ `tools/debugging/kernel/chapter03-ftrace-tracepoints.md` 48–58; perf/events ↔ same-series part5-02. E ftrace topics present. F(253–260) next/link targets. G source citations absent.
- F actual: next eBPF = public `part5-04-ebpf.md` order43; 257–260 5-02,5-04,RTOS and kernel-debugging targets. Last trailing text explains debug-oriented use.
- Factcheck: no decisive internal contradiction. Loop report notes D lowered 6→4 because debugging chapter is a superset for listed latency tracer table; both original ranges checked. Overhead and “nop 1–2%” descriptions appear potentially inconsistent with “zero” in H2/summary; require trace docs/measurement. Kernel tracer availability depends on config/build.

### `part5-04-ebpf.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part5-04-ebpf.md`; read 1–234 entire.
- A–G: A(24–139,141–180) good conceptual and applied breadth; B scenario steps but verify command semantics. C commands include known `profile-bpfcc` example, kernel compatibility broad; D comparisons in report includes debugging `chapter04-ebpf-kernel` and `part5-03`; E title topics present. F(227–234) next and links. G no linked source.
- D: profiling/kprobe/tracepoint topic ↔ `tools/debugging/kernel/chapter04-ebpf-kernel` relevant eBPF section; ftrace/kprobe ↔ `part5-03-ftrace.md` 180–190. Read both only for stated overlap; final D score remains Sol.
- F: 227 next Flamegraph → current public order44 `part5-05-flamegraph.md`; 231–234 5-03/5-05/5-10/debugging targets exist; final link has trailing explanation clarifying debugging perspective.
- Factcheck: 118 `profile-bpfcc -F 99 -ag 30` is a failed-command candidate supported by the detailed report’s upstream `iovisor/bcc/tools/profile.py` check (master c398a9a7 lines93–134 plus v0.5.0/v0.12.0/v0.18.0/v0.29.1 tags: no `-g`; `-a` annotations, `-f` folded). This is a primary-source/API basis, not internal contradiction; Sol should independently review as this pass did not fetch upstream. 145/148 vs166 duration requires argument semantics, so leave as a question. Kernel BPF loop/stack/LSM availability and profiling overhead depend on kernel/docs/runtime.

## 범위

- Only evidence-21 created; article text and published-loop primary report unchanged. No tests (audit notes only). The final score/error authority remains Sol.
