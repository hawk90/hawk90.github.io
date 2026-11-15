# RTOS timing and observability remediation — 2026-10-22

Scope: Part 2 chapters 08–11. Evaluation ledger remains read-only; no re-score. This finishes an interrupted batch after re-reading its current source and examples.

## Execution and limits

FreeRTOS V11.2.0 commit: `0adc196d4bd52a2d91102b525b0aafc1e14a2386`. Verifier log: [rtos-timing-2026-10-22.log](rtos-timing-2026-10-22.log). Gate log: [rtos-timing-2026-10-22-gate.log](rtos-timing-2026-10-22-gate.log).

The initial POSIX run failed because the port overrides the custom run-time-counter macro and its times().tms_utime counter was still zero. Removed the conflicting macro definitions on POSIX and bounded the real-kernel test by the subprocess timeout while waiting for one CPU accounting tick. Re-run passed, including the undersized-buffer rejection. This is a functional stats test, not a timing benchmark.

Hardware sleep/timer/GPIO/DWT/ITM, Linux ftrace/cyclictest, vendor recorder, board energy and latency tests were NOT RUN. Upstream-symbol gate had no configured clones and was SKIPPED, not PASS. Whole-site build is recorded separately.

## Chapter evidence

### `part2-08-tick-timer.md` — remediated

1. **contextAndScope:** Tick source, quantization, integer SysTick reload, periodic delay and time slicing.
2. **problemSignalAndCounterevidence:** Unpinned timer/clock explanations, fixed-rate assumptions and unchecked integer/width boundaries.
3. **causeHypothesisAndAlternatives:** An unspecified RTOS/MCU implementation and assumed measurement values were mixed with API descriptions. Scope exact source behavior, pure arithmetic and hardware-dependent observations separately.
4. **evidence:** Pinned FreeRTOS V11.2.0 ARM_CM4F source; port.c setup/handler and tasks.c tick/delay behavior; RISC-V machine timer documentation.
5. **sampleCoverage:** Full current source and matching published-loop-36 entry read. Resumed edits inherited from the interrupted session, reviewed current fences, examples, links and summary. beforeSha256 is tracked HEAD, not a claim to have authored every inherited change.
6. **decision:** Remediated the documented content/example defects; no score or hardware-performance claim generated.
7. **smallestSafeChange:** Only this chapter, the timing verifier and batch evidence. Preserved URL/date/seriesOrder/draft; existing manual description corrections retained. Removed nonexistent next-article reference in 2-11.
8. **validationAndResidualRisk:** Source C sanitizer execution covers min/max reload, zero/null/noninteger/overflow rejection; periodic task compiled against the real Cortex-M4F port headers. Batch publish gate and inline math pass. ARM tests are compile-only; physical timer/IRQ/sleep, energy, trace transport and performance remain unassessed.

Before HEAD SHA-256: `c1bc605d393aebfae43b09165094ab4b864bb82e094639d6dc70c171cbbd6045`. Current SHA-256: `cf3cb7a14105f732b58ae3c8d16e9484c606944268b8c7b042e2ade3072951f2`.

Next action: manual-review. Which exact MCU/board, timer and clock setup, IRQ priority, power mode, recorder version and raw trace/current data will validate this chapter’s hardware-dependent behavior?

### `part2-09-tickless.md` — remediated

1. **contextAndScope:** Idle suppression, race recheck, 24-bit interval, hook mutability and assumed energy budget.
2. **problemSignalAndCounterevidence:** Omitted sleep compensation branches, unsupported long SysTick sleeps, MCU mode/current and battery claims without hardware.
3. **causeHypothesisAndAlternatives:** An unspecified RTOS/MCU implementation and assumed measurement values were mixed with API descriptions. Scope exact source behavior, pure arithmetic and hardware-dependent observations separately.
4. **evidence:** Read actual V11.2.0 port.c branches 591–818; maximum suppressed ticks is 0xFFFFFF/counts-per-tick. Zephyr 3.7.0 PM docs define mode-dependent wake responsibility.
5. **sampleCoverage:** Full current source and matching published-loop-36 entry read. Resumed edits inherited from the interrupted session, reviewed current fences, examples, links and summary. beforeSha256 is tracked HEAD, not a claim to have authored every inherited change.
6. **decision:** Remediated the documented content/example defects; no score or hardware-performance claim generated.
7. **smallestSafeChange:** Only this chapter, the timing verifier and batch evidence. Preserved URL/date/seriesOrder/draft; existing manual description corrections retained. Removed nonexistent next-article reference in 2-11.
8. **validationAndResidualRisk:** Compiled actual ARM_CM4F tickless port and verified vPortSuppressTicksAndSleep symbol; source JS validates assumed 30.997 uA and 271.53372 mAh/year plus invalid inputs. No sleep instruction executed. Batch publish gate and inline math pass. ARM tests are compile-only; physical timer/IRQ/sleep, energy, trace transport and performance remain unassessed.

Before HEAD SHA-256: `6eaca58770efb057d1e522927c4dfc6ad45468df982084179fa27f13d0265c15`. Current SHA-256: `874f7738192d7c2828d9c8df7209e7ea6010e0625d190ca92a3582f00b330a03`.

Next action: manual-review. Which exact MCU/board, timer and clock setup, IRQ priority, power mode, recorder version and raw trace/current data will validate this chapter’s hardware-dependent behavior?

### `part2-10-scheduler-latency.md` — remediated

1. **contextAndScope:** GPIO observation boundaries, wrap-aware DWT arithmetic, event tracing and tail histogram.
2. **problemSignalAndCounterevidence:** Repeated single-pin set/clear/toggle loses edges; trace tools measured different intervals; unverified OS timing tables and dropped histogram tail.
3. **causeHypothesisAndAlternatives:** An unspecified RTOS/MCU implementation and assumed measurement values were mixed with API descriptions. Scope exact source behavior, pure arithmetic and hardware-dependent observations separately.
4. **evidence:** V11.2.0 queue API plus Linux ftrace/event docs and cyclictest source distinguish IRQ-off, event wake-to-run and periodic timer wake observations.
5. **sampleCoverage:** Full current source and matching published-loop-36 entry read. Resumed edits inherited from the interrupted session, reviewed current fences, examples, links and summary. beforeSha256 is tracked HEAD, not a claim to have authored every inherited change.
6. **decision:** Remediated the documented content/example defects; no score or hardware-performance claim generated.
7. **smallestSafeChange:** Only this chapter, the timing verifier and batch evidence. Preserved URL/date/seriesOrder/draft; existing manual description corrections retained. Removed nonexistent next-article reference in 2-11.
8. **validationAndResidualRisk:** Extracted markers compile for Cortex-M4F. ASan/UBSan host checks cover modulo wrap, ns conversion, invalid clock/null, tail bucketing and sample saturation; shell syntax passes. No GPIO/DWT/Linux tracing run. Batch publish gate and inline math pass. ARM tests are compile-only; physical timer/IRQ/sleep, energy, trace transport and performance remain unassessed.

Before HEAD SHA-256: `e248b586b858c8da934cd42f4cdb7d208e7e8c134fa2113bef438d71428014ac`. Current SHA-256: `9cc3f23a603b4de79e2fba26dad18212eaeefe0fe523a19ffdaa78dd31140643`.

Next action: manual-review. Which exact MCU/board, timer and clock setup, IRQ priority, power mode, recorder version and raw trace/current data will validate this chapter’s hardware-dependent behavior?

### `part2-11-tracing-observability.md` — remediated

1. **contextAndScope:** Software hooks, ITM/DWT/ETM information, recorder integration and bounded runtime stats.
2. **problemSignalAndCounterevidence:** Contradictory ITM-only-print claim, unlimited busy waiting, unsafe fixed text buffer, unsupported costs/licensing and nonexistent next-chapter link.
3. **causeHypothesisAndAlternatives:** An unspecified RTOS/MCU implementation and assumed measurement values were mixed with API descriptions. Scope exact source behavior, pure arithmetic and hardware-dependent observations separately.
4. **evidence:** CMSIS 6.1.0 core_cm4.h; vendor SystemView/Tracealyzer docs; V11.2.0 task.h/tasks.c raw stats API; actual following article is part3-01-critical-section.
5. **sampleCoverage:** Full current source and matching published-loop-36 entry read. Resumed edits inherited from the interrupted session, reviewed current fences, examples, links and summary. beforeSha256 is tracked HEAD, not a claim to have authored every inherited change.
6. **decision:** Remediated the documented content/example defects; no score or hardware-performance claim generated.
7. **smallestSafeChange:** Only this chapter, the timing verifier and batch evidence. Preserved URL/date/seriesOrder/draft; existing manual description corrections retained. Removed nonexistent next-article reference in 2-11.
8. **validationAndResidualRisk:** ITM conditional policy executes with a CMSIS-shaped fake only. Extracted raw snapshot compiled for ARM and executed with actual POSIX kernel: reports tasks and rejects more than 8 tasks. No physical ITM or host recorder executed. Batch publish gate and inline math pass. ARM tests are compile-only; physical timer/IRQ/sleep, energy, trace transport and performance remain unassessed.

Before HEAD SHA-256: `43b5870d93e7ad55212bc89f5e852ff8ea7dd79afc362f8102f34a91b838a033`. Current SHA-256: `fcbfe48bb548b840891ebca25083ea90fef814a2f422f04cf9e94cfbdd81cb5f`.

Next action: manual-review. Which exact MCU/board, timer and clock setup, IRQ priority, power mode, recorder version and raw trace/current data will validate this chapter’s hardware-dependent behavior?

## Primary sources

- [https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0)
- [https://docs.zephyrproject.org/3.7.0/services/pm/system.html](https://docs.zephyrproject.org/3.7.0/services/pm/system.html)
- [https://doc.segger.com/UM08027_SystemView.html](https://doc.segger.com/UM08027_SystemView.html)
- [https://github.com/ARM-software/CMSIS_6/blob/v6.1.0/CMSIS/Core/Include/core_cm4.h](https://github.com/ARM-software/CMSIS_6/blob/v6.1.0/CMSIS/Core/Include/core_cm4.h)
- [https://docs.kernel.org/trace/ftrace.html](https://docs.kernel.org/trace/ftrace.html)

readyForIntegration means the declared source repair and scoped checks passed, not that target behavior is verified.
