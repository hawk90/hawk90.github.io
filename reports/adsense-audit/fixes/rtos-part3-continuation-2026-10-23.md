# RTOS Part3 continuation repair — 2026-10-23

No re-score. Evaluation ledger preserved. Scope: Eight full chapters and evaluation entries reviewed; specific source defects corrected; normal/invalid examples validated with actual FreeRTOS V11.2.0 POSIX and scoped Cortex-M/header/pure-function checks.

## Checks and limits

No physical MCU IRQ/DMA, target throughput/WCET, timer-daemon ISR saturation, flight trace, exhaustive PCP proof or full PI-chain/timeout runtime executed. Policy/model and actual POSIX behavior are distinguished. Upstream clone-only gate checks skipped, not passed. Whole-site checks follow final checkpoint.

Gate: [rtos-part3-continuation-2026-10-23-gate.log](rtos-part3-continuation-2026-10-23-gate.log).
Execution: [rtos-part3-continuation-2026-10-23.log](rtos-part3-continuation-2026-10-23.log).

## Per-article evidence

### `part3-04-priority-inversion.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part3-04-priority-inversion.md
2. **problemSignalAndCounterevidence:** Invented configUSE_MUTEX_PI; unbounded/finite wait conflation and unsupported PCP/chain guarantees.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Reeves firsthand article; V11.2.0 tasks.c/queue.c; Zephyr3.7 mutex docs; original PCP paper.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected H/M/L model, historical scope, real FreeRTOS setting and source-bound PI limitations.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Full-source/document comparison; existing actual POSIX holder boost/retention/restoration tests in rtos-lock-semaphore-2026-10-22.log support the scoped kernel explanation. No flight trace or general schedulability proof. No physical MCU IRQ/DMA, target throughput/WCET, timer-daemon ISR saturation, flight trace, exhaustive PCP proof or full PI-chain/timeout runtime executed. Policy/model and actual POSIX behavior are distinguished. Upstream clone-only gate checks skipped, not passed. Whole-site checks follow final checkpoint.

Before SHA-256: `75806646b92f616225b9d080d6c70ea7b8a5bd29857a0d23a43e58143e39ac27`. After SHA-256: `69e61af057f3e66ff09cd61666e65584af6a52874c2cf864b74df89b0bfb0231`.

Next action: manual-review. Which arrival/interference bounds, mutex graph and concrete RTOS configuration establish the product response-time bound?

### `part3-05-priority-inheritance.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance.md
2. **problemSignalAndCounterevidence:** Fake vTaskPriorityInherit/xTaskCheckForChainedInheritance; blocked owner moved to ready; incorrect extra-boost and timeout claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** V11.2.0 tasks.c lines6639–6930 plus queue.c caller; Zephyr3.7 and Linux rtmutex design.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Mapped actual xTaskPriorityInherit/disinherit and timeout conditions; preserved timeline while narrowing state/chain/cost claims; manually corrected description.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Source branches and symbol presence/absence checked; existing real-kernel two-mutex PI test confirms retained boost and final restore. No exhaustive chain/timeout runtime. No physical MCU IRQ/DMA, target throughput/WCET, timer-daemon ISR saturation, flight trace, exhaustive PCP proof or full PI-chain/timeout runtime executed. Policy/model and actual POSIX behavior are distinguished. Upstream clone-only gate checks skipped, not passed. Whole-site checks follow final checkpoint.

Before SHA-256: `37a3145a90f5af7f48aedcae06991d441b75f91cc31a719f0d333cb4169d6e05`. After SHA-256: `a59155b6fb83592aa02fc32aa37b2ce061b3009fd1790bf302478ea33b07ff91`.

Next action: manual-review. What exact block order and remaining-waiter graph produce the observed chain and timeout restoration?

### `part3-06-priority-ceiling.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part3-06-priority-ceiling.md
2. **problemSignalAndCounterevidence:** Incorrect PCP enable Kconfig, fake k_mutex.ceiling/VxWorks API and unconditional deadlock proof.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Sha/Rajkumar/Lehoczky1990; Zephyr3.7 CONFIG_PRIORITY_CEILING is integer PI limit; V11.2.0 semphr.h.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Separated Original admission and Immediate boost; removed fake APIs and supplied executable bounded admission model; manually corrected description.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted JS model: strict greater-than, own-resource exclusion, zero/normal priorities and invalid numeric/ceiling rejection pass. Not a full scheduler/protocol proof. No physical MCU IRQ/DMA, target throughput/WCET, timer-daemon ISR saturation, flight trace, exhaustive PCP proof or full PI-chain/timeout runtime executed. Policy/model and actual POSIX behavior are distinguished. Upstream clone-only gate checks skipped, not passed. Whole-site checks follow final checkpoint.

Before SHA-256: `c9dc049b92fd6737abffb2961b1d1a18bfe9b660c8bbac9125267532e692a61a`. After SHA-256: `99010c9e5e8c6aea59577b138ea75a010e35fe10948aef5c813cdb0621aebd6b`.

Next action: manual-review. Does the selected implementation satisfy the single-CPU, task, nesting and resource-ceiling assumptions required for the cited property?

### `part3-07-queue-impl.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part3-07-queue-impl.md
2. **problemSignalAndCounterevidence:** Fake Queue union and copy implementation; empty overwrite count0; reversed Rx/Tx locks; fixed cycle claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** V11.2.0 queue.c Queue_t, copy functions, xQueueGenericSend/Receive and deferred locks.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Replaced incorrect internals with actual field/call descriptions and executable real-API copy/front/wrap/mailbox boundaries.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted source C passes actual POSIX kernel FIFO/copy/front/wrap/full/empty, and overwrite empty→1/replacement stays1 tests. No physical MCU IRQ/DMA, target throughput/WCET, timer-daemon ISR saturation, flight trace, exhaustive PCP proof or full PI-chain/timeout runtime executed. Policy/model and actual POSIX behavior are distinguished. Upstream clone-only gate checks skipped, not passed. Whole-site checks follow final checkpoint.

Before SHA-256: `24bfe66268cc386bf3f45788de1e2432e43b9ddac7e04cb1ad727f32b962dbd0`. After SHA-256: `b29d923ce3d786ab8d5d65c5a932c9142113e6323d91b6909c70cc5c0ea74302`.

Next action: manual-review. Which target port/IRQ priority, queue-lock trace and measured payload/wake conditions validate deferred ISR behavior?

### `part3-08-event-group.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part3-08-event-group.md
2. **problemSignalAndCounterevidence:** Hard-coded24bit; broken pseudo set/wait; broadcast mistaken for exclusive consume; missing deferred-queue failure.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** V11.2.0 event_groups.c and include/event_groups.h.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected8/24/56 user-bit widths, snapshot/clear/broadcast semantics and daemon limits; description corrected manually.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted C passes actual POSIX OR/AND/clear/three-tick timeout; two blocked waiters both see same set despite clear. Header asserts8/24/56 compile for16/32/64-bit configs. No physical MCU IRQ/DMA, target throughput/WCET, timer-daemon ISR saturation, flight trace, exhaustive PCP proof or full PI-chain/timeout runtime executed. Policy/model and actual POSIX behavior are distinguished. Upstream clone-only gate checks skipped, not passed. Whole-site checks follow final checkpoint.

Before SHA-256: `f161938146ea1ba634d2a3c2a9ab898296dbbd9c55174e046ad343e63237543f`. After SHA-256: `d7c6a781b14f1ca337831c9e4b2fd9c2e299b5e4bdb57556cb869fa807ec92dd`.

Next action: manual-review. What timer-daemon priority/queue capacity and real ISR load establish enqueue failure handling and application state reset semantics?

### `part3-09-isr-safe-api.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api.md
2. **problemSignalAndCounterevidence:** Fake port assembly and timer switch; task API called compile error; 0xBF universal priority; volatile increment/yield guarantees.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** V11.2.0 ARM_CM4F portmacro.h, queue.c and timers.c.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Pinned ARM_CM4F path, corrected mask/priority/woken scope, bounded IRQ integration and queue-full handling.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted deferred-queue-irq.c compiled for Cortex-M4F against actual headers. No IRQ execution or board UART ACK validated. No physical MCU IRQ/DMA, target throughput/WCET, timer-daemon ISR saturation, flight trace, exhaustive PCP proof or full PI-chain/timeout runtime executed. Policy/model and actual POSIX behavior are distinguished. Upstream clone-only gate checks skipped, not passed. Whole-site checks follow final checkpoint.

Before SHA-256: `f9ba48e478c1422f7330bcfa11d09ef735131fe1205e451e3256007a6e11f347`. After SHA-256: `53d5beeb87a29698c438c0009124744f57df3d254cc663985e1c44538d5415a3`.

Next action: manual-review. Which MCU priority-bit/grouping, encoded threshold, ACK sequence and saturation trace establish the ISR contract?

### `part3-10-deadlock.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part3-10-deadlock.md
2. **problemSignalAndCounterevidence:** Coffman sufficient-condition claim; timeout called forced preemption; fake TaskStatus field and lockdep model; unsafe heartbeat and universal timeout policy.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Linux lockdep design; V11.2.0 task.h/semphr.h.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Clarified wait/dependency graphs, real snapshot limits and rollback; added executable take-pair with failure release; removed fake watchdog and corrected navigation.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted take-pair passes actual POSIX null/same-lock rejection, second-lock failure releases first and successful pair acquisition. No watchdog/reset or full lockgraph trace. No physical MCU IRQ/DMA, target throughput/WCET, timer-daemon ISR saturation, flight trace, exhaustive PCP proof or full PI-chain/timeout runtime executed. Policy/model and actual POSIX behavior are distinguished. Upstream clone-only gate checks skipped, not passed. Whole-site checks follow final checkpoint.

Before SHA-256: `6a439ae77602f2f5082cb0fe53cdf810c9c760298bbf557815f3fb3fa4a9a428`. After SHA-256: `9dff7de054367bb334d7aed275e5f9efb2c7f2755b26ee011c0e4a66858db65c`.

Next action: manual-review. Which actual owner/waiter trace, rollback state and progress/recovery policy distinguish deadlock from slow service or livelock?

### `part3-11-stream-message-buffer.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part3-11-stream-message-buffer.md
2. **problemSignalAndCounterevidence:** Unsafe wrapping memcpy and unbounded command copy/cast; fixed4-byte prefix; universal lock-free/10x claims; trigger and nonexistent next article.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** V11.2.0 stream_buffer.c, stream_buffer.h, message_buffer.h and FreeRTOS.h length-type default.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Replaced broken ring example with actual API tests and checked byte-order parser; corrected SPSC, prefix, trigger, notification and frame scope; manual title/description correction.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual POSIX extracted stream partial/wrap/empty, message too-small receive retention and oversized send rejection pass. Extracted parser ASan/UBSan tests cover endian, empty, short, mismatch/null/oversized header. No physical MCU IRQ/DMA, target throughput/WCET, timer-daemon ISR saturation, flight trace, exhaustive PCP proof or full PI-chain/timeout runtime executed. Policy/model and actual POSIX behavior are distinguished. Upstream clone-only gate checks skipped, not passed. Whole-site checks follow final checkpoint.

Before SHA-256: `7610818559ea35b4e61c38c0aceae403410e47b1cf4357c10d4a4c82dbf8a092`. After SHA-256: `0f083e8993a041804b554ebeb1bb05069817153f9a7bf9a63a87ec4014ddcb95`.

Next action: manual-review. Which real writer/reader topology, notification index, DMA/cache ownership and measured trigger/drop behavior validate the board integration?

## Primary sources

- [https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0)
- [https://docs.zephyrproject.org/3.7.0/kernel/services/synchronization/mutexes.html](https://docs.zephyrproject.org/3.7.0/kernel/services/synchronization/mutexes.html)
- [https://docs.kernel.org/locking/rt-mutex-design.html](https://docs.kernel.org/locking/rt-mutex-design.html)
- [https://docs.kernel.org/locking/lockdep-design.html](https://docs.kernel.org/locking/lockdep-design.html)
- [https://jacobfilipp.com/DrDobbs/articles/DDJ/1999/9911/9911a/9911as1.htm](https://jacobfilipp.com/DrDobbs/articles/DDJ/1999/9911/9911a/9911as1.htm)
- [https://www.math.unipd.it/~tullio/RTS/2009/SRL-1990.pdf](https://www.math.unipd.it/~tullio/RTS/2009/SRL-1990.pdf)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
