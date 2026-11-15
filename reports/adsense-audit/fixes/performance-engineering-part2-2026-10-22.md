# Embedded Performance Engineering Part 2 remediation

Scope: the ten existing Part 2 articles, `part2-01` through `part2-10`. Their `title`, `slug`, `date`, `seriesOrder`, and `draft` metadata were preserved. No score, fact-check verdict, or aggregate from historical evaluation ledgers is reproduced here. The existing published-loop-18 and published-loop-19 records were used only to locate claims and review notes.

## Chapter decisions

### part2-01-pipeline.md — remediated

1. **Context and scope:** Introductory five-stage pipeline model and processor examples in this article.
2. **Signal and refutation:** The stated 200× result contradicted the article’s own equations: 5N versus N+4. Arm sources also distinguish three-stage Cortex-M0 from two-stage M0+.
3. **Cause and alternatives:** A simple stage-throughput model was confused with architectural speedup; model names were generalized across different cores.
4. **Evidence:** Recomputed N=1000: 5000/1004 = 4.98008. Arm describes Cortex-M0 as three-stage, M0+ as two-stage, Cortex-M3/M4 as three-stage, Cortex-M7 as six-stage dual-issue, Cortex-A53 as eight-stage in-order, and Cortex-A72 as a distinct OoO implementation.
5. **Sample scope:** The article’s pipeline schedule and equation were reviewed; the host model checks the arithmetic. No instruction timing on a physical core was measured.
6. **Decision:** Correct the arithmetic, M0/M0+ stage distinction, and unsupported fixed A72 width. Qualify load-use and barrier timing as target-dependent.
7. **Smallest safe change and rollback:** Edit affected prose only; retain URL, date, title, description, series order, and all unrelated examples. Rollback is limited to this article’s diff.
8. **Validation and residual risk:** `verify-performance-engineering-part2-examples.mjs` passed, including a negative 200× assertion. Publish gate passed its blocking checks; upstream symbol lookup was SKIPPED because source clones are absent, not counted as PASS. Target cycle behavior remains unmeasured.

### part2-02-pipeline-stall.md — remediated

1. **Context and scope:** Hazard, forwarding, Cortex-M bus, volatile, and PMU event explanations.
2. **Signal and refutation:** Cortex-M3/M4 were called single-port Harvard with an integrated I/D bus. Arm documents separate ICode, DCode, and System AHB-Lite interfaces; shared System-path arbitration still means not every access can be assumed concurrent.
3. **Cause and alternatives:** Harvard instruction/data paths were conflated with system-level bus topology; generic compiler behavior was described as guaranteed.
4. **Evidence:** Arm Cortex-M4 datasheet/TRM identifies three AHB-Lite interfaces; Arm’s Cortex-M documentation describes I-Code and D-Code roles. The article’s fixed load-use penalties are now target/TRM-dependent.
5. **Sample scope:** Structural-hazard and load-use fences were extracted and inspected. No MCU pipeline or bus was simulated.
6. **Decision:** Correct the interface description and narrow claims about compiler reordering and `volatile`.
7. **Smallest safe change and rollback:** Change only the affected explanations; preserve the example sequences and article metadata. Rollback is limited to this file.
8. **Validation and residual risk:** Extracted hazard example and text checks passed; publish gate passed blocking checks with upstream symbol lookup SKIPPED, not PASS. No board timing test was run.

### part2-03-branch-prediction.md — remediated

1. **Context and scope:** Predictor tables, Cortex-A53 implementation values, branch PMU IDs, and Spectre paragraph.
2. **Signal and refutation:** The article assigned incompatible BHT/BTB sizes and mislabeled PMU event IDs; it also grouped Meltdown CVE-2017-5754 with Spectre and described KAISER as a Spectre mitigation.
3. **Cause and alternatives:** Implementation-specific predictor dimensions and event aliases were presented as portable architectural guarantees; vulnerability identifiers and mitigation families were conflated.
4. **Evidence:** Arm’s PMUv3 event definitions distinguish BR_MIS_PRED (0x10), CPU_CYCLES (0x11), and BR_PRED (0x12). NIST CVE records and the original Spectre publication identify CVE-2017-5753/5715 as Spectre and CVE-2017-5754 as Meltdown. Arm’s Cortex-A53/A72 materials distinguish core microarchitecture from ISA guarantees.
5. **Sample scope:** The article’s 2-bit predictor fence and event table were reviewed. The host checker validates state labels and corrected identifiers; it does not predict a real core’s branches.
6. **Decision:** Remove unverified fixed predictor sizes/penalties, correct event labels and CVE distinction, and make performance thresholds target/workload measurements rather than pass criteria.
7. **Smallest safe change and rollback:** Edit only the predictor specification, PMU table, and affected claims. Keep route and metadata unchanged.
8. **Validation and residual risk:** Source-derived checks passed, including the negative old predictor-table assertion. Gate blocking checks passed; upstream clone check SKIPPED, not PASS. No `perf` or hardware predictor run was performed.

### part2-04-speculative-execution.md — remediated

1. **Context and scope:** ROB example, core-specific queue sizes, transient execution, and security discussion.
2. **Signal and refutation:** The ROB picture put younger `add/sub` entries before an older load while claiming program-order retirement. Several queue/register counts had no revision-specific source.
3. **Cause and alternatives:** Execution completion order was mistaken for ROB program order; physical-resource counts were generalized from unverified sources.
4. **Evidence:** Reordered the example as an older pending load followed by younger completed independent operations. Arm’s Cortex-A72 TRM describes a superscalar variable-length OoO pipeline; no source found in this review supported the article’s exact queue/ROB count table.
5. **Sample scope:** ROB fence order was programmatically checked. No OoO core or Spectre proof of concept was run.
6. **Decision:** Correct the ROB order, remove unsourced counts, qualify transient-execution language and avoid generic safety-core prescriptions.
7. **Smallest safe change and rollback:** Keep the same diagram area and example topic while changing only ordering and unsupported claims. Revert only this article if needed.
8. **Validation and residual risk:** Extracted ROB-order check passed; publish gate blocking checks passed, with upstream symbol lookup SKIPPED, not PASS. The security and core-specific behavior still require product-specific review.

### part2-05-cache-basics.md — remediated

1. **Context and scope:** Cache hierarchy, cache-line sizes, direct-mapped address split, Cortex-M cache summary, and policy generalizations.
2. **Signal and refutation:** 64 KiB / 64-byte direct-mapped cache has 1024 lines and therefore 10 index bits, not 8. The article simultaneously assigned a 16-byte cache line to Cortex-M4 while stating Cortex-M4 has no cache.
3. **Cause and alternatives:** An arithmetic error and confusion between core cache, optional SoC system cache, and cache-line implementation values.
4. **Evidence:** Direct calculation gives `64 KiB / 64 B = 1024 = 2^10`. Arm states Cortex-M4 has no internal cache, while a SoC may integrate a system cache; Cortex-A72 TRM specifies its cache hierarchy/configuration.
5. **Sample scope:** Address split fence, cache table and hierarchy wording reviewed; arithmetic also checked by a negative 8-bit-index assertion.
6. **Decision:** Correct the index width, remove the nonexistent Cortex-M4 cache-line entry, and qualify unsupported latency/policy universals.
7. **Smallest safe change and rollback:** Retain the conceptual sections and examples; change only inconsistent values and overgeneralized claims. Metadata and URL preserved.
8. **Validation and residual risk:** Host geometry checks and publish gate passed blocking checks. Upstream symbol check SKIPPED, not PASS. No cache hierarchy was measured on hardware.

### part2-06-cache-miss.md — remediated

1. **Context and scope:** 3C examples, conflict-miss set mapping, PMU events, malloc alignment, and prefetcher claims.
2. **Signal and refutation:** Three 8 KiB arrays mapped to the same set do not, by themselves, thrash a four-way set; three lines can coexist. “Random access always misses” and page-aligned `malloc` were unjustified absolutes.
3. **Cause and alternatives:** A conditional set-mapping assumption was presented as a guaranteed conflict; cache state and allocator behavior were omitted.
4. **Evidence:** Set occupancy arithmetic (3 ways used in a 4-way set) and the article’s own 3C definitions; official Arm PMU materials require matching raw events to the target core/TRM and perf driver.
5. **Sample scope:** The conflict fence and PMU section were reviewed. The verifier models three-versus-five lines for four ways; this is a simple associativity model, not a cache simulator.
6. **Decision:** Keep the example conditional, explicitly reject the three-line thrash conclusion, and qualify PMU, allocation, prefetcher, and random-access statements.
7. **Smallest safe change and rollback:** Modify only the false guarantee and its explanatory prose. Preserve the 3C structure and route.
8. **Validation and residual risk:** Positive/negative host associativity checks and gate passed. Upstream symbol lookup SKIPPED, not PASS. No cache simulator, board, or `perf` measurement was run.

### part2-07-cache-line.md — remediated

1. **Context and scope:** Cache-line table, alignment penalties, false-sharing cost, Cortex-M7 prefetch register, non-temporal stores, and DMA cache maintenance.
2. **Signal and refutation:** Fixed line-size and misalignment values were generalized across cores; `CCR.BP` was presented as prefetch control; `STNP` was said to bypass cache unconditionally.
3. **Cause and alternatives:** Core-specific geometry, branch-prediction control, and a non-temporal hint were conflated with portable guarantees.
4. **Evidence:** Arm M-profile register documentation identifies CCR.BP as branch-prediction control; AArch64 defines STNP as a non-temporal pair-store instruction, not a universal cache-bypass contract. Arm cache/DMA guidance makes maintenance dependent on cache and system coherency.
5. **Sample scope:** False-sharing C fence was extracted; claim checks confirmed target-dependent wording. No SMP workload or DMA ran.
6. **Decision:** Remove unsupported fixed values and state the requirements in terms of target ISA/TRM, cache state, and DMA coherency.
7. **Smallest safe change and rollback:** Preserve all example structures while correcting the explanatory claims. Route and metadata unchanged.
8. **Validation and residual risk:** Static/source checks and gate passed. Upstream symbol lookup SKIPPED, not PASS. No multicore or DMA hardware was available.

### part2-08-memory-bandwidth.md — remediated

1. **Context and scope:** STREAM arithmetic, Roofline intensity, PMU bus-event conversion, SoC throughput tables, DMA crossover, and throughput rules of thumb.
2. **Signal and refutation:** The DDR equation mixed data rate and clock rate and produced inconsistent equalities. The float32 vector-add intensity was also computed using the wrong byte count. Pi/phone, STM32, radiation-hard memory, and DMA crossover numbers lacked reproducible conditions.
3. **Cause and alternatives:** Units and DDR transfer rate were mixed; illustrative platform values were presented as measured/specification facts without a device, version, or benchmark setup.
4. **Evidence:** Under the stated assumption of 3200 MT/s and a 32-bit (4-byte) bus, peak transfer arithmetic is `3200 × 4 = 12,800 MB/s` (12.8 GB/s decimal). Float32 vector add with two 4-byte loads and one 4-byte store is 1/12 FLOP/byte. Removed unsupported platform benchmark numbers rather than inventing sources.
5. **Sample scope:** Roofline code fence was extracted; host arithmetic includes positive and negative DDR-unit cases. No STREAM run occurred.
6. **Decision:** Fix equations, remove unsourced measurements/thresholds, and require platform-specific memory-controller event semantics before converting counters to bytes/s.
7. **Smallest safe change and rollback:** Keep the topic flow and sections; replace invalid arithmetic and unsupported values. Metadata preserved.
8. **Validation and residual risk:** Host arithmetic/model and publish gate passed blocking checks. Upstream symbol lookup SKIPPED, not PASS. No STREAM, `perf`, or target board run was possible.

### part2-09-simd-neon.md — remediated

1. **Context and scope:** Compiler vectorization, NEON/MVE/SVE target claims, vector tail handling, speedup, alignment and floating-point behavior.
2. **Signal and refutation:** `-O3` was said to guarantee vectorization; MVE loop wrote past non-multiple-of-eight tails; predication was said to handle tails automatically; SVE was assigned to cores without an established source.
3. **Cause and alternatives:** ISA capability was mistaken for per-core feature availability and compiler outcome; vector predication was mistaken for automatic source-level loop handling.
4. **Evidence:** Arm ACLE documents NEON intrinsics across AArch32/AArch64; Arm documentation describes SVE as scalable vector-length architecture. Updated MVE example includes a scalar tail, and the implementation claims now require target feature verification.
5. **Sample scope:** NEON and MVE fences were extracted verbatim and cross-compiled to AArch64 and M-profile MVE object files. A host model checked N=10 boundaries; neither object was executed.
6. **Decision:** Keep the algorithm examples, fix MVE tail, and remove unsubstantiated speedup/core-feature absolutes.
7. **Smallest safe change and rollback:** Modify only the MVE loop and claims about target/compiler/performance; retain metadata and routes.
8. **Validation and residual risk:** Clang AArch64/MVE object compilation and host tail-model check passed. Publish gate passed blocking checks; upstream symbol lookup SKIPPED, not PASS. No ARM runtime or board benchmark was run.

### part2-10-pmu.md — remediated

1. **Context and scope:** Arm PMU counters/events, DWT/CPI, RISC-V HPM, perf sampling and WCET claims.
2. **Signal and refutation:** Counter count/width, CPI expression, event aliases, HPM count and sampling overhead were presented as universal. DWT CYCCNT plus CPICNT cannot yield CPI without retired instruction count.
3. **Cause and alternatives:** Architectural slots, optional implementation counters, OS perf aliases, and measurement-derived statistics were conflated.
4. **Evidence:** Arm PMUv3 documentation identifies event 0x10 as BR_MIS_PRED and distinguishes event support/multiplexing by implementation and OS PMU driver. RISC-V Privileged Architecture defines 64-bit-precision `mcycle`/`minstret`, 29 HPM slots, platform-defined event meanings, and privilege access controls.
5. **Sample scope:** PMU event and CPI sections were source-reviewed; host formula check exercises a valid denominator and zero-instruction negative case. No PMU registers or perf tool ran.
6. **Decision:** Correct CPI definition and RISC-V count, qualify counter/event availability and sampling overhead, and remove generic thresholds.
7. **Smallest safe change and rollback:** Restrict edits to inaccurate values/formulas and their usage notes. Preserve metadata and links.
8. **Validation and residual risk:** Host arithmetic/source checks and gate passed blocking checks. Upstream symbol lookup SKIPPED, not PASS. No Linux perf session, target PMU, or WCET proof was run.

## Official and primary references consulted

- Arm, [Five things you may not know about Cortex-M0](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/five-things-you-may-not-know-about-arm-cortex-m0) — M0 three-stage / M0+ two-stage distinction.
- Arm, [Cortex-M4 Processor Datasheet](https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/Processor%20Datasheets/Arm%20Cortex-M4%20Processor%20Datasheet.pdf?hash=A2E52C6191D2F8DBF16DEDA88FF8E4A0CC9CA151&revision=904a9fc1-9c66-4816-80bf-ff8c76420e5a) — three AHB-Lite interfaces.
- Arm, [Cortex-M4 Technical Reference Manual r0p1](https://developer.arm.com/documentation/100166/0001/Programmers-Model/Processor-memory-model/Private-Peripheral-Bus), and [Cortex-M programming guide to memory barriers](https://documentation-service.arm.com/static/5efefb97dbdee951c1cd5aaf) — bus/memory model and cache scope.
- Arm, [DSP capabilities of Cortex-M4 and Cortex-M7](https://developer.arm.com/cfs-file/__key/communityserver-blogs-components-weblogfiles/00-00-00-21-42/7563.ARM-white-paper-_2D00_-DSP-capabilities-of-Cortex_2D00_M4-and-Cortex_2D00_M7.pdf) — M4 three-stage and M7 six-stage dual-issue.
- Arm, [Introducing the Arm architecture](https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/Learn%20the%20Architecture/Introducing%20the%20Arm%20architecture.pdf?revision=0b6b67ea-edd7-4975-b23c-d4904ac0cb35), [Cortex-A53 overview](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/the-top-5-things-to-know-about-cortex-a53), and [Cortex-A72 TRM](https://documentation-service.arm.com/static/60368ce38f952d2e4134dc2e) — core-specific pipeline and cache properties.
- Arm, [PMU profiling on Armv8-A](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/profile-firmware-with-performance-monitor-unit-in-armv8-a-cpu) and [PMU event examples](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/p2-perf-pmu-feature-armv8-cpus) — event IDs, perf aliases, multiplexing.
- NIST, [CVE-2017-5715](https://nvd.nist.gov/vuln/detail/cve-2017-5715) and [CVE-2017-5754](https://nvd.nist.gov/vuln/detail/CVE-2017-5754); [original Spectre paper](https://meltdownattack.com/spectre.pdf).
- Arm, [ACLE Neon intrinsic reference](https://developer.arm.com/documentation/101028/0009/Advanced-SIMD--Neon--intrinsics) and [SVE and Neon coding compared](https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/Learn%20the%20Architecture/102131_0100_01_SVE_and_Neon_coding_compared.pdf?revision=feaaf72e-a941-461c-bd92-0d960d0f8615).
- RISC-V International, [Machine-level ISA: Hardware Performance Monitor](https://docs.riscv.org/reference/isa/priv/machine.html); SiFive, [U74 Core Complex Manual](https://starfivetech.com/uploads/u74_core_complex_manual_21G1.pdf) was consulted for platform-specific HPM access scope; no U74 event map is asserted here.

## Validation scope and records

- Source-derived checks: `node scripts/verify-performance-engineering-part2-examples.mjs` — PASS. Checks include positive/negative host arithmetic and model cases, source fence extraction, and AArch64/MVE object compilation.
- Inline math: `node scripts/check-inline-math.mjs <the ten Part 2 paths>` — PASS.
- Publish gate: `bash scripts/audit-publish-gate.sh <each of the ten article paths>` — blocking checks PASS. Every run reports upstream cited-symbol lookup as **SKIPPED** because upstream clones are absent; SKIPPED is not PASS.
- `git diff --check` on the ten articles and verifier — PASS.
- Not run: full site build (parent-owned), simulator, physical ARM/SoC board, Linux `perf`, STREAM benchmark, cache/DMA/SMP runtime tests, and WCET measurement. Object compilation proves only that the selected intrinsic fences compile for the named target triples.
- Detailed command log: [performance-engineering-part2-2026-10-22.log](./performance-engineering-part2-2026-10-22.log).
