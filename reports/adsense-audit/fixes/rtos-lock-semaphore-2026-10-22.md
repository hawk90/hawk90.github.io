# RTOS critical section, semaphore and mutex repair — 2026-10-22

Part 3 chapters 01–03. Original full sources and published-loop-37 entries read; no re-score or ledger modification.

## Verification and limits

[Execution log](rtos-lock-semaphore-2026-10-22.log) records source extraction, host policy/thread tests with ASan/UBSan, four ARM object builds, actual POSIX kernel scenarios and expected non-owner assertion. [Chapter gate](rtos-lock-semaphore-2026-10-22-gate.log) passes blocking checks; unconfigured upstream clone checks are SKIPPED, not PASS. The final 11-chapter gate and whole-site build/anchor/reading results are in the resume checkpoint.

The first full compile stopped on two set-only globals in unchanged upstream tasks.c/POSIX port under Clang 23 -Werror. Those diagnostics remain visible as warnings; other warnings still fail. A later sanitizer subprocess startup timed out before entering its tiny test; direct execution passed, and the complete verifier passed again with a 60-second startup bound for that subprocess. No target timing claim is inferred.

NOT RUN: physical Cortex-M mask/IRQ, SMP RTOS lock integration, DWT/GPIO/WCET, exhaustive interleavings or priority-chain/timeout behavior. POSIX tests verify only the declared real-kernel API scenarios.

## Chapter evidence

### `part3-01-critical-section.md` — remediated

1. **contextAndScope:** Scope of PRIMASK/BASEPRI, actual task/ISR critical nesting, SMP and memory-model boundaries.
2. **problemSignalAndCounterevidence:** Unconditional IRQ enable discarded prior state; fake wrapper combined critical masking and scheduler suspension; unsafe CAS reclamation/barrier example and unmeasured cycle/latency tables.
3. **causeHypothesisAndAlternatives:** Unpinned pseudocode mixed API contracts, port-specific mechanisms and timing/algorithm guarantees. Reconcile exact V11.2.0 functions and states, then verify source examples with real kernel API behavior and clearly separated policy fakes.
4. **evidence:** Read V11.2.0 ARM_CM4F vPortEnterCritical/vPortExitCritical and portmacro.h; CMSIS 6.1.0 compiler accessor source; GCC atomic memory-model documentation.
5. **sampleCoverage:** Full current original source and corresponding published-loop-37 entry read; normal and invalid paths exercised on macOS arm64 with LLVM Clang 23.1.4 and FreeRTOS V11.2.0 POSIX. Cortex-M samples are object-only compilations; no physical IRQ or performance trace.
6. **decision:** Replaced pseudo implementation with source-bounded call flow and explicit mask contracts. Added executable nested-update, PRIMASK policy and atomic_flag try-lock examples; removed universal timing and lock-free guarantees.
7. **smallestSafeChange:** Only this chapter, shared source-example verifier and fixed batch evidence. Routing/date/draft/seriesOrder/tags/topics preserved; only chapter03 description manually corrected. No score ledger, series membership or public URLs changed.
8. **validationAndResidualRisk:** Extracted PRIMASK nested/initial-mask policy ran with fake accessors under ASan/UBSan; atomic_flag guarded 40000 host pthread updates; actual FreeRTOS POSIX ran 4000 nested updates and consistent snapshots; task/ISR APIs compiled for Cortex-M4F. Publish blocking checks, inline math and source diff pass. No exhaustive interleaving, target mask/SMP/IRQ, timing/WCET, hardware spinlock or multi-task PI chain/timeout validation.

Before tracked-HEAD SHA-256: `6681ce0fe204bf73e3813e44f775346f13e4d4ae57fb5a09e21fc5430b1e4183`. After SHA-256: `b123b3c87a093acc129d9a426cd8a0d5d699a32b59a0c01ffe3103cd3452454c`.

Next action: manual-review. Which exact Cortex-M/SMP port, priority encoding, competing IRQ/DMA access and outermost hold-time trace establish exclusion and response bounds?

### `part3-02-semaphore-impl.md` — remediated

1. **contextAndScope:** Queue-backed count, wake priority, recheck/block registration, deferred events and timeout.
2. **problemSignalAndCounterevidence:** Original pseudocode omitted actual recheck/lock/unlock loop, registered event lists incorrectly, left ISR savedStatus undefined, and claimed fixed Queue size and blanket FIFO acquisition.
3. **causeHypothesisAndAlternatives:** Unpinned pseudocode mixed API contracts, port-specific mechanisms and timing/algorithm guarantees. Reconcile exact V11.2.0 functions and states, then verify source examples with real kernel API behavior and clearly separated policy fakes.
4. **evidence:** Read V11.2.0 semphr.h creation/API contracts; queue.c xQueueSemaphoreTake, cRxLock/cTxLock, prvLockQueue/prvUnlockQueue and tasks.c event-list flow.
5. **sampleCoverage:** Full current original source and corresponding published-loop-37 entry read; normal and invalid paths exercised on macOS arm64 with LLVM Clang 23.1.4 and FreeRTOS V11.2.0 POSIX. Cortex-M samples are object-only compilations; no physical IRQ or performance trace.
6. **decision:** Kept internal semaphore question and mapped the real loop instead of presenting truncated C as working kernel. Added test-task count/timeout contract and correctly scoped ISR integration.
7. **smallestSafeChange:** Only this chapter, shared source-example verifier and fixed batch evidence. Routing/date/draft/seriesOrder/tags/topics preserved; only chapter03 description manually corrected. No score ledger, series membership or public URLs changed.
8. **validationAndResidualRisk:** Extracted binary/counting tests executed with actual POSIX kernel: initially empty, successful give/take, full give failure, three-tick timeout. Additional actual blocked high/low waiter test verifies higher priority acquires first under specified task priorities; ISR sample cross-compiles only. Publish blocking checks, inline math and source diff pass. No exhaustive interleaving, target mask/SMP/IRQ, timing/WCET, hardware spinlock or multi-task PI chain/timeout validation.

Before tracked-HEAD SHA-256: `71b50de8262c3b29367965ad322d01b9ff6090094ac0a96188b758ba8e0598f5`. After SHA-256: `d8a8648bc230bbf77972738d019c7faf221b2e7fe2a21dfe67dbd778d16a3e6a`.

Next action: manual-review. Which target port, interrupt priority and trace demonstrate ISR give during block registration, saturation handling and timeout ordering under actual workload?

### `part3-03-mutex-impl.md` — remediated

1. **contextAndScope:** Queue/TCB ownership, recursive count, ordinary misuse and priority inheritance/disinheritance.
2. **problemSignalAndCounterevidence:** Waiter/owner inheritance direction was reversed; base priority 0 was a sentinel; generic give was falsely guaranteed safe pdFAIL; ISR misuse called a compile error; multi-mutex chain behavior was over-promised.
3. **causeHypothesisAndAlternatives:** Unpinned pseudocode mixed API contracts, port-specific mechanisms and timing/algorithm guarantees. Reconcile exact V11.2.0 functions and states, then verify source examples with real kernel API behavior and clearly separated policy fakes.
4. **evidence:** Read V11.2.0 queue.c recursive APIs, semaphore take and common give; tasks.c xTaskPriorityInherit/xTaskPriorityDisinherit/vTaskPriorityDisinheritAfterTimeout; semphr.h API requirements.
5. **sampleCoverage:** Full current original source and corresponding published-loop-37 entry read; normal and invalid paths exercised on macOS arm64 with LLVM Clang 23.1.4 and FreeRTOS V11.2.0 POSIX. Cortex-M samples are object-only compilations; no physical IRQ or performance trace.
6. **decision:** Corrected direction/state location and separate give/timeout paths, assertion behavior and limited PI algorithm; retained deadlock/static-allocation material with scoped claims. Manually corrected description to match actual field/scope.
7. **smallestSafeChange:** Only this chapter, shared source-example verifier and fixed batch evidence. Routing/date/draft/seriesOrder/tags/topics preserved; only chapter03 description manually corrected. No score ledger, series membership or public URLs changed.
8. **validationAndResidualRisk:** Actual POSIX kernel executes extracted ordinary/recursive and static mutex tests; separate tasks verify recursive non-owner failure and first/final give boundary. Two-lock scenario observes holder priority 1→4, retention at 4 after contended lock release, and restoration to 1 after last release. Expected negative subprocess aborts at actual holder/current-task configASSERT for ordinary non-owner give. Publish blocking checks, inline math and source diff pass. No exhaustive interleaving, target mask/SMP/IRQ, timing/WCET, hardware spinlock or multi-task PI chain/timeout validation.

Before tracked-HEAD SHA-256: `38d346346e39dbe87d7acf43971256a9a1cb548a061b5d4350b6f1927902cd34`. After SHA-256: `723ef80164bdd4f328fe7bf0d34eeac4da71af06768e89c6090901d6b3f28ea8`.

Next action: manual-review. Which product-specific nested-lock graph, wait/timeout order and configured assertions validate PI propagation, restoration and recovery on the target?

## Primary sources

- [https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c)
- [https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c)
- [https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h)
- [https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c)
- [https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h)
- [https://github.com/ARM-software/CMSIS_6/blob/v6.1.0/CMSIS/Core/Include/cmsis_gcc.h](https://github.com/ARM-software/CMSIS_6/blob/v6.1.0/CMSIS/Core/Include/cmsis_gcc.h)
- [https://gcc.gnu.org/onlinedocs/gcc/_005f_005fatomic-Builtins.html](https://gcc.gnu.org/onlinedocs/gcc/_005f_005fatomic-Builtins.html)

Final current-source batch checks and hashes agree; readyForIntegration=true. See [resume checkpoint](repair-resume-checkpoint-2026-10-22.md).
