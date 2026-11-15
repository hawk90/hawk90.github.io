# Embedded Performance Engineering Part 6 remediation

Date: 2026-10-22  
Scope: `src/content/blog/embedded/performance-engineering/part6-01` through `part6-05` (all five files present in the series directory).  
Status vocabulary: canonical `remediated` or `unassessed`; machine-readable paths and SHA-256 values are in the companion JSON.

I read the complete five article sources and the corresponding Part 6 entries in `reports/adsense-audit/published-loop-22.md`. I did not change the evaluation ledger or derive, revise, or add any score. The evaluation ledger contains prior entries for 01–04; 05 has no score entry, and no score was added. All new or existing performance outputs are explicitly treated as scenario examples unless reproduced below.

## Chapter dispositions

### `part6-01-case-isr-latency.md` — remediated

1. **Context and scope:** Linux industrial sensor latency case; local IRQ masking, IRQ handling, tracing, affinity, threaded IRQ, and deadline reporting.
2. **Signal and countercondition:** The article treated `irqsoff` maximum latency as the SDHCI handler duration and as proof of end-to-end deadline failure. That inference is invalid when the trace measures only IRQ-disabled time; it would need a separately measured sensor-to-buffer latency and matching trace.
3. **Cause hypotheses and alternatives:** A long local-IRQ-off section could delay hard IRQ response; handler work, scheduling, device service, affinity, and measurement boundary are separate alternatives that this example does not discriminate.
4. **Evidence:** [Linux ftrace documentation](https://docs.kernel.org/trace/ftrace.html) defines `irqsoff` as time interrupts are disabled and documents the latency trace format. [Generic IRQ documentation](https://docs.kernel.org/core-api/genericirq.html) describes threaded IRQ handling. The sample had no raw trace or source revision.
5. **Sample:** One scenario article; no board/kernel sample, repeated run, or original measurement log was available. The five-article batch includes both code/API examples and hardware-dependent cases.
6. **Decision:** Corrected tracer scope and output shape; removed unsupported SD-card causal certainty, made the histogram's `hitcount` role count-only, corrected the threaded-IRQ explanation, and made the deadline table internally consistent. The article status is `remediated` for those source-content defects; the board diagnosis remains unassessed.
7. **Smallest safe change and rollback:** Edited this file's body and manually revised its title/description from a claimed confirmed SD-card root cause to a diagnostic procedure because the source evidence did not support that claim. Slug, date, draft state, and series order remain unchanged. Rollback boundary is this article and its report/verifier entries.
8. **Validation and residual risk:** Named-fence/source checks, per-file publish gate, inline-math check, diff check, and deadline-table consistency check passed. No Linux kernel, ftrace, IRQ, SDHCI driver, or sensor-board runtime was executed. End-to-end latency and sample sufficiency remain unverified.

### `part6-02-case-cache-thrashing.md` — remediated

1. **Context and scope:** Row-major 1024×1024 FP32 matrix multiplication, cache locality, transpose, tiling, and an AArch32 NEON dot-product excerpt.
2. **Signal and countercondition:** The original throughput formula multiplied an already-per-second GFLOP rate by clock frequency and core count; its units were wrong. Tiled code also read uninitialized `C` and did not handle non-multiple tile dimensions. The original counter output and ARM binary are unavailable.
3. **Cause hypotheses and alternatives:** Column-stride access is a plausible locality problem; compiler vectorization, target PMU event definitions, thread count, memory hierarchy, and benchmark setup are alternatives. The source no longer declares a real board bottleneck from absent outputs.
4. **Evidence:** Arithmetic gives `2 × 1024³ = 2.147 GFLOP`; at the explicitly assumed 15 GFLOP/s, the idealized time is 0.143 s. [Arm ACLE](https://developer.arm.com/documentation/101028/0009/Advanced-SIMD--Neon--intrinsics) documents Advanced SIMD intrinsics. Local Clang compiled the extracted NEON excerpt for `armv7-none-eabi`; an extracted host C harness compared scalar and tiled output for N=3, 32, and 33 and detected a deliberately wrong B/BT layout.
5. **Sample:** Host execution covers small matrices, including a non-tile-multiple and a negative-layout case; it does not represent Cortex-A72 cache/PMU performance. No benchmark output was reproduced.
6. **Decision:** Fixed units, C initialization and edge bounds; completed horizontal reduction for the first NEON excerpt; made timing/counter results scenario-only and removed universal cache/IPC thresholds. Status `remediated` refers to source defects and executable arithmetic, not target performance.
7. **Smallest safe change and rollback:** Edited article prose and named examples; manually changed title/description because the original “10×” causal account relied on the invalid theoretical-rate formula and unverified measurements. URL/date/draft/order remain unchanged.
8. **Validation and residual risk:** Extracted scalar/tiled C passed host comparisons; AArch32 NEON syntax-only cross-target compilation passed. Publish gate, inline-math and diff checks passed. No A72/NEON runtime or performance test ran; compiler/PMU/counter semantics on target remain unassessed.

### `part6-03-case-lock-contention.md` — unassessed

1. **Context and scope:** Userspace packet-counter daemon, pthread mutex, kernel lock profiling, cache coherence, scalability model, and worker-local counters.
2. **Signal and countercondition:** The original table attributed a named `pthread_mutex_t` directly to `perf lock`, and unsynchronized concurrent reads of non-atomic counters were described as acceptable. `perf lock` output is not evidence of an arbitrary userspace mutex; ordinary C data races cannot be accepted as approximate statistics.
3. **Cause hypotheses and alternatives:** A global mutex, cache-line ownership transfer, memory bandwidth, scheduler/run-queue behavior, and measurement artifacts may each affect scaling. The illustrative evidence cannot distinguish these causes.
4. **Evidence:** [perf-lock manual](https://man7.org/linux/man-pages/man1/perf-lock.1.html) scopes the tool to recorded lock events; [WG14 N1570 §5.1.2.4](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf) defines data races. The revised worker-local sample uses C atomics and passed a host functional check for positive and invalid-worker input.
5. **Sample:** One synthetic scaling table; no raw pthread wait trace, PMU/C2C sample, target CPU run, or repeated benchmark. Host check verifies only the snippet's counter behavior.
6. **Decision:** Removed causal confirmation and rewrote counters as worker-owned atomics; kept the case `unassessed` because the stated measurements and real lock/cache cause are not verified.
7. **Smallest safe change and rollback:** Edited this article and manually softened its title/description to investigation guidance. Kept path metadata (slug/date/draft/order) unchanged. Rollback boundary is the single article and its scoped artifacts.
8. **Validation and residual risk:** Extracted worker/aggregate C compiled and ran on host; per-file gate, inline-math, and diff checks passed. **Next action:** reproduce userspace lock and supported PMU/C2C observations on the stated kernel/CPU and review snapshot consistency. **Review question:** What supported tracing/PMU setup produced the named mutex wait, cache-line traffic, and scaling values?

### `part6-04-case-dma-tuning.md` — remediated

1. **Context and scope:** Camera frame payload sizing, DMA burst assumptions, DMAengine client configuration, scatter-gather, and buffering.
2. **Signal and countercondition:** The pixel payload calculation was rounded imprecisely; the transaction model's time/throughput terms were confused; the original DMA API example used a non-kernel `dma_engine_start_chain()` call and conflated burst words with AXI beats. A controller-specific binding could be valid only if that controller and binding are identified.
3. **Cause hypotheses and alternatives:** Short transfers/gaps, controller limits, arbitration, memory traffic, descriptor scheduling, and the input stream may each reduce throughput. The simple assumed model predicts ~50% at 128 B and ~94.1% at 2048 B for a 6.4 GB/s payload rate plus a 20 ns gap; those assumptions do not explain 124 MB/s on their own.
4. **Evidence:** Payload math is 1920×1080×2×60 = 248,832,000 B/s = 248.832 MB/s decimal. [Linux DMAengine client documentation](https://docs.kernel.org/driver-api/dmaengine/client.html) documents client setup, mapping via the DMA device, SG preparation, submit and issue-pending flow. Original SoC, monitor counters and DMA controller were unidentified.
5. **Sample:** The analytic throughput calculation is a hand-checkable model, not a transfer benchmark. No SoC, camera, DMA controller, AXI monitor, or kernel runtime was available.
6. **Decision:** Corrected payload/model math, removed the fake API and generic `snps,*` device-tree recommendation, qualified the burst units and descriptor chaining, and replaced claimed stepwise results with unverified scenario guidance. Status `remediated` is scoped to these content/API corrections; hardware performance remains unassessed.
7. **Smallest safe change and rollback:** Edited this article and manually revised title/description because the original metadata claimed a measured camera drop and confirmed DMA root cause unsupported by trace or hardware evidence. Slug/date/draft/order remain unchanged.
8. **Validation and residual risk:** Arithmetic/source checks, per-file gate, inline-math, and diff checks passed. No Linux DMAengine build, camera capture, device-tree validation, AXI monitor, or hardware test ran. Controller binding and all original throughput values remain unverified.

### `part6-05-case-cxl-llm-kv-cache.md` — unassessed

1. **Context and scope:** Hypothetical H100/CXL memory capacity and possible LLM KV offload across GPU, host and CXL tiers.
2. **Signal and countercondition:** The source claimed H100 SXM5 96 GB, five-card 480 GB HBM, bidirectional PCIe 64 GB/s, CXL latency/bandwidth, and automatic DAMON/vLLM placement. The official SKU specification contradicts H100 capacity; product/API support and runtime values otherwise need exact hardware/software provenance.
3. **Cause hypotheses and alternatives:** KV capacity pressure could be relevant only for a specified model, context, concurrency, dtype, parallelism, runtime reserve and connector. CXL adds a slower memory tier but does not itself establish vLLM placement, KV semantics or throughput recovery.
4. **Evidence:** [NVIDIA HGX specification](https://docs.nvidia.com/enterprise-reference-architectures/hgx-ai-factory-h100-h200-b200/latest/components.html) lists H100 SXM at 80 GB and 3.35 TB/s per GPU. [PCI-SIG](https://pcisig.com/what-bit-rates-does-pcie-50-specification-support-and-how-does-it-compare-prior-pcie-generations) defines PCIe 5.0 rate by direction. [Astera Labs A1000/Leo specs](https://www.asteralabs.com/products/leo-smart-memory-controllers/) specify product capacity, but not the article's measured latency/bandwidth. [vLLM KV offloading docs](https://docs.vllm.ai/en/latest/features/kv_offloading_usage/) describe CPU primary plus secondary tiers, not a verified CXL backend. [Linux CXL early-boot](https://docs.kernel.org/driver-api/cxl/linux/early-boot.html) and [reclaim](https://docs.kernel.org/driver-api/cxl/allocation/reclaim.html) docs explain configuration-dependent NUMA/memory-tier behavior.
5. **Sample:** Five-GPU arithmetic only; no GPU, CXL device, Linux CXL topology, vLLM deployment, Nsight trace, or production dataset was available. Article throughput, KV sizes, latency and DAMON table outputs were removed.
6. **Decision:** Corrected nominal HBM and per-direction PCIe statements; narrowed the CXL product capacity claim; replaced unsupported vLLM YAML/DAMON automation and measurements with a design/validation checklist. Keep `unassessed` pending exact platform and workload evidence.
7. **Smallest safe change and rollback:** Edited this article and manually revised title/description because the old metadata claimed H100/CXL throughput recovery unsupported by the article's trace or its conflicting capacity table. Slug/date/draft/order remain unchanged.
8. **Validation and residual risk:** Official-source assertions, per-file gate, inline-math and diff checks passed. No GPU/CXL/vLLM/Nsight/DAMON hardware execution occurred. **Next action:** validate the precise GPU SKU, CXL card/DIMM/firmware topology, Linux release, connector, model and workload on hardware. **Review question:** What platform and measurement trace substantiate the claimed recovery and KV placement?

## Manual metadata correction record

All five titles/descriptions were manually aligned with the corrected article scope because their earlier wording asserted observed root causes, throughput outcomes, or a hardware configuration that the source could not substantiate. No slug, publication date, draft flag, or `seriesOrder` was changed. No title/description edits were made outside these five chapters.

## Checks and execution limits

The chapter verifier extracts named fences, checks selected arithmetic/API statements and frontmatter invariants, executes the matrix and atomic-counter examples on host, and syntax-checks the NEON excerpt for AArch32. Per-file gate logs are `performance-engineering-part6-01-gate.log` through `-05-gate.log`; the combined verification log is `performance-engineering-part6-2026-10-22.log`. The companion JSON starts with `readyForIntegration: false`; it is set true only after all five per-file gates, inline-math, verifier, final hashes, and scoped diff checks pass.

Runtime limits: no Linux ftrace/perf/DMAengine host, camera SoC, target Cortex-A72 NEON execution, GPU/CUDA/Nsight, CXL hardware, or vLLM deployment was used. The checks do not validate performance numbers, runtime bindings, IRQ affinity, DMA configuration, memory placement, or site build. Cited-symbol clone checks are not run as a pass. Whole-site build remains parent-owned.

## Continuation review and integration — 2026-10-22

A second complete read of the five current chapters and the Part 6 evaluation entries found residual claims that contradicted the scenario-only scope. Corrected the confirmed-IRQ-root-cause summary, removed the wrong unlinked RTOS chapter number, qualified observed maxima versus worst-case guarantees, corrected the AArch32 disassembly example, removed fixed SIMD speedup and cache-hit assertions, and calculated transpose storage as 12→16 MiB for these four arrays. The lock case no longer excludes memory bandwidth from mpstat or interprets mem_access counts as measured DRAM saturation; see the [upstream sysstat manual](https://github.com/sysstat/sysstat/blob/master/man/mpstat.1). Coherence behavior is now implementation-qualified. DMA model gaps consistently use ns, and hypothetical descriptor/burst changes are no longer narrated as executed experiments. CXL batch and compute-bound advice no longer guarantees benefit or lack of impact. Added next-case links to 01–03.

After these edits all five per-file gates, the five-file inline-math check, scoped diff check, extracted scalar/tiled comparisons (N=3,32,33 plus wrong-layout rejection), atomic-counter checks and AArch32 syntax check passed again. Final SHA values were refreshed and readyForIntegration is now true. Cases 03 and 05 remain unassessed; no board, Linux tracing, GPU/CXL or performance run was added. No score changed.
