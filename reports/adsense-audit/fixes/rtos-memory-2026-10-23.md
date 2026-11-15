# RTOS memory repairs — 2026-10-23

No re-score. Evaluation ledger preserved. Scope: Six full sources and their evaluation entries reviewed; pinned allocator/kernel examples and explicit negative paths checked.

## Checks and limits

Host allocator checks use no-op scheduler/critical stubs and are sequential only. POSIX static-only API test does not exclude native host allocations. No physical MCU overflow/MPU/DMA, concurrent allocator/SMP, WCET or certification executed. Clone-only gate checks skipped.

Gate: [rtos-memory-2026-10-23-gate.log](rtos-memory-2026-10-23-gate.log).
Execution: [rtos-memory-2026-10-23.log](rtos-memory-2026-10-23.log).

## Per-article evidence

### `part4-01-realtime-memory.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part4-01-realtime-memory.md
2. **problemSignalAndCounterevidence:** False 6KiB-vs-8KiB fragmentation example, invented stats member and unsupported certification assertions.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** V11.2.0 task.h and heap_4.c; CERT MEM34 provenance.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected contiguous failure arithmetic, real stats field and static task storage; separated finite system bounds from allocator complexity.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual Cortex-M4F compile of extracted static-task-storage.c; fragmentation arithmetic and source field review. Host allocator checks use no-op scheduler/critical stubs and are sequential only. POSIX static-only API test does not exclude native host allocations. No physical MCU overflow/MPU/DMA, concurrent allocator/SMP, WCET or certification executed. Clone-only gate checks skipped.

Before SHA-256: `0a2abc40306eaad8d38200601ca70e7391d7a9209224f9bfc1a01055afac23e0`. After SHA-256: `146c8b8ed45bbf530056b4af3cb7a62634a02476d302c531c3922a17fa5578c1`.

Next action: manual-review. Which actual heap state, largest block and synchronization/IRQ bounds establish the product allocation bound?

### `part4-02-freertos-heap.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part4-02-freertos-heap.md
2. **problemSignalAndCounterevidence:** heap1 free described as no-op, heap4 best-fit, heap5 region filling and universal timing/statistics claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Pinned V11.2.0 portable/MemMang/heap_1.c through heap_5.c.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected heap1 assertion, heap2 size-sorted best-fit/no coalesce, heap4 address-first-fit and heap5 gaps/marker stats; removed fake timing.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual heap1–5 host runs with no-op scheduler/critical stubs: allocation/alignment, heap1 negative SIGABRT, SIZE_MAX rejection, extracted heap2 vs heap4 coalescing, heap5 noncontiguous allocation failure and intermediate marker count. Host allocator checks use no-op scheduler/critical stubs and are sequential only. POSIX static-only API test does not exclude native host allocations. No physical MCU overflow/MPU/DMA, concurrent allocator/SMP, WCET or certification executed. Clone-only gate checks skipped.

Before SHA-256: `bef9f706d62436d57dd6e0671a48efc817ee1730555d24aaf39b00b3d91407a1`. After SHA-256: `3ab8d62a54e169628f84bd95ff3f2acf35dc59e767c758015a3573e3b49f7bdd`.

Next action: manual-review. Which real port allocator exclusion and heap lifetime make these sequential semantics valid under task/ISR/SMP concurrency?

### `part4-03-tlsf.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part4-03-tlsf.md
2. **problemSignalAndCounterevidence:** TLSF mislabeled MIT, 16 SL buckets portrayed as source and unsafe mapping/shift/usage fragments.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** mattconte/tlsf commit deff9ab509341f264addbd3c8ada533678591905, tlsf.c/h README.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected BSD license, actual 32 SL mapping versus retained illustrative diagram; added checked subdivision model and opaque allocator usage; manual description correction.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted subdivision valid/invalid inputs pass; actual pinned TLSF plus extracted wrapper ASan/UBSan: init/reinit, zero/varied/oversize requests, alignment, coalescing/realloc preservation and integrity. Host allocator checks use no-op scheduler/critical stubs and are sequential only. POSIX static-only API test does not exclude native host allocations. No physical MCU overflow/MPU/DMA, concurrent allocator/SMP, WCET or certification executed. Clone-only gate checks skipped.

Before SHA-256: `ba10b20134e699f12dcab00a9c00a27006222f1f69ce0823c75f7b70a977fcd1`. After SHA-256: `0b6a7797e74a6bb214f7abe57df335a6c1113c1944da6c216e8f9450241cf167`.

Next action: manual-review. What target alignment/size configuration, shared access policy and measured bound validate this allocator integration?

### `part4-04-static-allocation.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part4-04-static-allocation.md
2. **problemSignalAndCounterevidence:** Static storage confused with compile-time initialization and global zero heap; NOLOAD zero-fill and universal static hook claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** V11.2.0 FreeRTOS.h/tasks.c; GNU ld NOLOAD; GCC stack usage.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected runtime initialization, conditional hooks, no-dynamic API compilation, map and stack-analysis limits; manually corrected title/description.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted IPC compiles for M4F and actual static-only POSIX kernel runs task/queue/mutex/event without MemMang. Host port allocation not excluded. Host allocator checks use no-op scheduler/critical stubs and are sequential only. POSIX static-only API test does not exclude native host allocations. No physical MCU overflow/MPU/DMA, concurrent allocator/SMP, WCET or certification executed. Clone-only gate checks skipped.

Before SHA-256: `ac8f7e6cd7b2bbe631e55cb67648772e324dcd56a297cf5efd3c3e046f3805a6`. After SHA-256: `9132a3b984a37679faea1370cead22a212d88562976c90036d46eb7cf753d824`.

Next action: manual-review. Which linker/startup/library/port evidence proves the entire intended product path has no heap allocation?

### `part4-05-memory-pool.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part4-05-memory-pool.md
2. **problemSignalAndCounterevidence:** Misaligned payload cast, unsafe bare CAS pool, fake APIs and average burst treated as maximum.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** CMSIS6 memory pool contract; Zephyr3.7 slab contract; extracted ISO C11 implementation.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Replaced unsafe example with aligned typed pool and separate ownership metadata; stated sequential-only and bounded search cost; manual description correction.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** ASan/UBSan extracted pool: 32 unique max_align_t-aligned blocks, exhaustion/reuse and NULL/foreign/interior/double-free rejection. No concurrent ABA guarantee. Host allocator checks use no-op scheduler/critical stubs and are sequential only. POSIX static-only API test does not exclude native host allocations. No physical MCU overflow/MPU/DMA, concurrent allocator/SMP, WCET or certification executed. Clone-only gate checks skipped.

Before SHA-256: `0318d5e9bbf76fef42b583dda64e452d90a9322a7ce14f31301fbab096a78618`. After SHA-256: `9e48949ba2050959e101293d3dbada4f3a7e7eae350d4dddc33c3cb8c5b3cdb5`.

Next action: manual-review. Which ownership/lifetime and synchronization contract handles real concurrent clients, stale aliases and configured bursts?

### `part4-06-stack-overflow.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part4-06-stack-overflow.md
2. **problemSignalAndCounterevidence:** Method2 one-byte corruption said undetectable, MPU/protector immediate universal guarantee and watermark exactness.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** V11.2.0 stack_macros.h and tasks.c; GCC instrumentation options.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected actual V11 downward non-MPU conditions, observation limits, fault/guard/compiler scope and PSP/MSP split; manually corrected description.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual macro fixture detects intact/corrupt-byte/SP boundary; beyond-sentinel write with restored SP demonstrates blind spot. Extracted hook M4F compile; strong-protector object references __stack_chk_fail. Host allocator checks use no-op scheduler/critical stubs and are sequential only. POSIX static-only API test does not exclude native host allocations. No physical MCU overflow/MPU/DMA, concurrent allocator/SMP, WCET or certification executed. Clone-only gate checks skipped.

Before SHA-256: `48881ab2587980d50897fbb074d074418e5cc8c08da933e5de2356db078bf378`. After SHA-256: `d95020c098d4b29db9b58b9cad56ca2fbad1a5d51ed9d5f62eee38bf16406f06`.

Next action: manual-review. Which physical port/MPU/frame layout, worst path and fault handler validate target detection and response?

## Primary sources

- [https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0)
- [https://github.com/mattconte/tlsf/tree/deff9ab509341f264addbd3c8ada533678591905](https://github.com/mattconte/tlsf/tree/deff9ab509341f264addbd3c8ada533678591905)
- [https://sourceware.org/binutils/docs/ld/Output-Section-Type.html](https://sourceware.org/binutils/docs/ld/Output-Section-Type.html)
- [https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html)
- [https://arm-software.github.io/CMSIS_6/latest/RTOS2/group__CMSIS__RTOS__PoolMgmt.html](https://arm-software.github.io/CMSIS_6/latest/RTOS2/group__CMSIS__RTOS__PoolMgmt.html)
- [https://docs.zephyrproject.org/3.7.0/kernel/memory_management/slabs.html](https://docs.zephyrproject.org/3.7.0/kernel/memory_management/slabs.html)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
