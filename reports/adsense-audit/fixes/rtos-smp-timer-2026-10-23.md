# RTOS SMP, spinlock and timer repairs — 2026-10-23

No re-score. Evaluation ledger preserved. Scope: Three full chapters and evaluation entries reviewed; concrete ready-queue, atomic race, ISA and timer-source errors repaired.

## Checks and limits

No real SMP/IPI/IRQ, Zephyr/ESP-IDF board, WFE/SEV power, physical cache or WCET/fairness measurement. SMP fixture and ARM assembly only compile. Native multithread loop is not exhaustive weak-memory proof. POSIX timer timing is not MCU timing. Clone-only gate skipped.

Gate: [rtos-smp-timer-2026-10-23-gate.log](rtos-smp-timer-2026-10-23-gate.log).
Execution: [rtos-smp-timer-2026-10-23.log](rtos-smp-timer-2026-10-23.log).

## Per-article evidence

### `part4-07-smp-rtos.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part4-07-smp-rtos.md
2. **problemSignalAndCounterevidence:** Wrong Zephyr per-CPU queue and API/runnable mask contract; RP2040 stale SRAM blamed on absent data-cache flush; unverified performance tables.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** V11.2.0 tasks.c/task.h/FreeRTOS.h; Zephyr3.7 SMP/thread API; RP2040 datasheet.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected actual shared queue and CPU-mask state; SMP port/affinity-at-create and IRQ contracts; removed fabricated cycles and mandatory pinning; manual description correction.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted xTaskCreateAffinitySet syntax matches actual V11.2.0 headers with explicit no-op SMP macro fixture only. No SMP port execution. No real SMP/IPI/IRQ, Zephyr/ESP-IDF board, WFE/SEV power, physical cache or WCET/fairness measurement. SMP fixture and ARM assembly only compile. Native multithread loop is not exhaustive weak-memory proof. POSIX timer timing is not MCU timing. Clone-only gate skipped.

Before SHA-256: `ab857f7cf6ef3454d71e9d3924b0aa33882d7856ec0f8a12b4e8428da61a0125`. After SHA-256: `d77554a98b4ec425713ca12c21701d2a70965955cb969331578ea522be04134f`.

Next action: manual-review. Which supported port/config, task reservation/affinity and IPI/IRQ timing validate the real SMP placement and exclusion?

### `part4-08-spinlock-smp.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp.md
2. **problemSignalAndCounterevidence:** MCS next non-atomic race/type-punned CAS; A72 LSE support/performance false; ordinary load reservation and WFE event rules wrong.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Original MCS authors pseudocode; compiler target feature assembler checks; ESP-IDFv5.4 ESP32 docs.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Replaced racy MCS with atomic typed links and unique-node lifetime; unsigned ticket wrap; separated A32/LSE/ISA and removed fake speed/power evidence.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted TTAS/ticket/MCS each pass four native threads x10000 protected increments under ASan/UBSan; ticket UINT_MAX wrap. A32 and LSE assemble; baseline AArch64 rejects LSE. No exhaustive memory-model proof. No real SMP/IPI/IRQ, Zephyr/ESP-IDF board, WFE/SEV power, physical cache or WCET/fairness measurement. SMP fixture and ARM assembly only compile. Native multithread loop is not exhaustive weak-memory proof. POSIX timer timing is not MCU timing. Clone-only gate skipped.

Before SHA-256: `6b01f32f8a4bac5aa359062eb32904b71e5a3fece519bb8a420e84b11b1228b5`. After SHA-256: `29912630cf3be79897c9d2b022f681bf73ea901aa0508ccdcc9fe8afc51cf9c0`.

Next action: manual-review. Which lock-free target atomics, scheduler/ISR owner progress, node layout and event protocol establish target latency and safety?

### `part4-09-software-timer.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part4-09-software-timer.md
2. **problemSignalAndCounterevidence:** hrtimer called wheel, invented Timer_t/single list, all API asynchronous, unlimited counts and fake latency/tickless implementation.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** V11.2.0 timers.c/h; Linux hrtimer design.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected actual two-list/status/daemon/reload semantics and tree distinction; checked single one-shot and ISR wrappers; bounded enqueue, lifetime and timing claims.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual POSIX timer daemon runs extracted one-shot, pre-scheduler dormant state, two-command queue full rejection, auto-reload, stop/delete barriers; extracted FromISR wrapper M4F compile only. No real SMP/IPI/IRQ, Zephyr/ESP-IDF board, WFE/SEV power, physical cache or WCET/fairness measurement. SMP fixture and ARM assembly only compile. Native multithread loop is not exhaustive weak-memory proof. POSIX timer timing is not MCU timing. Clone-only gate skipped.

Before SHA-256: `dd5b4aca30f8344d51f0e2ec6fa98f4af81c24839f26d872faadb5cf44fa1d9f`. After SHA-256: `84bcb60a68d722745881ee84d02613978cabbe68647ec109680fe39853bc7eaf`.

Next action: manual-review. Which target command arrival/service bounds, timer/receiver/payload lifetime and IRQ conditions establish callback deadline and saturation handling?

## Primary sources

- [https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0)
- [https://docs.zephyrproject.org/3.7.0/kernel/services/smp/smp.html](https://docs.zephyrproject.org/3.7.0/kernel/services/smp/smp.html)
- [https://docs.zephyrproject.org/3.7.0/doxygen/html/group__thread__apis.html](https://docs.zephyrproject.org/3.7.0/doxygen/html/group__thread__apis.html)
- [https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf](https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf)
- [https://www.cs.rochester.edu/research/synchronization/pseudocode/ss.html](https://www.cs.rochester.edu/research/synchronization/pseudocode/ss.html)
- [https://docs.espressif.com/projects/esp-idf/en/v5.4/esp32/api-reference/system/freertos_idf.html](https://docs.espressif.com/projects/esp-idf/en/v5.4/esp32/api-reference/system/freertos_idf.html)
- [https://docs.kernel.org/timers/hrtimers.html](https://docs.kernel.org/timers/hrtimers.html)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
