# RTOS selection, NuttX and PREEMPT_RT repairs — 2026-10-23

No re-score. Evaluation ledger preserved. Scope: Three full chapters/evaluations and primary sources reviewed; unsupported recommendation/benchmark/adoption claims removed and actual contracts distinguished.

## Checks and limits

macOS POSIX prefix helper and synthetic parser only. No NuttX/simulator/board/PX4 flight, real Linux/EVL/cyclictest/IRQ/driver/power/benchmark, supplier price, legal/certification determination or WCET proof. Clone-only gate skipped.

Gate: [rtos-selection-posix-2026-10-23-gate.log](rtos-selection-posix-2026-10-23-gate.log).
Execution: [rtos-selection-posix-2026-10-23.log](rtos-selection-posix-2026-10-23.log).

## Per-article evidence

### `part5-05-selection-guide.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part5-05-selection-guide.md
2. **problemSignalAndCounterevidence:** Unsourced fixed footprints/cycles/certification/prices/market and platform recommendations, binary-patch blanket, NASA adoption and future EOL wording.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Pinned FreeRTOS/Zephyr/RT-Thread license/source; official ThreadX license, NuttX/PX4 docs and Arm Mbed EOL notice index verified2026-10-23.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Replaced unsupported ranking/data with same-board/config/failure-path selection contracts, separated license/support/assurance scopes; corrected EOL timing and withdrew NASA claim; manual description correction.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Full source/evaluation and primary-document comparison. No benchmark, vendor quote or legal/certification determination claimed. Linked NuttX NASA correction and precise source licenses checked. macOS POSIX prefix helper and synthetic parser only. No NuttX/simulator/board/PX4 flight, real Linux/EVL/cyclictest/IRQ/driver/power/benchmark, supplier price, legal/certification determination or WCET proof. Clone-only gate skipped.

Before SHA-256: `e2cd83d0789b18f68113ea4fdf09ae5e5e6b0fe105ef7b6e826354b152e2ec05`. After SHA-256: `b2f4e69b62432e0c0ebc682b387767dfac8e71d7f0f93ce9659d79aa30b08e7f`.

Next action: manual-review. Which concrete hardware/workload/API/assurance scope, comparable measured image/latency and supplier terms establish this product selection?

### `part5-06-nuttx.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part5-06-nuttx.md
2. **problemSignalAndCounterevidence:** Untraceable NASA quote/adoption/space-grade claim and wrong hardware table; POSIX/procfs/build/process/Spresense generalized beyond source.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** NuttX official memory/task/procfs/config docs; PX4v1.15 architecture; NASA/JPL2021-07-08 FPrime report; Sony official SDK SMP/ASMP docs.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Withdrew unsupported quote/validation and corrected title/description manually; bounded API/three-mode/PX4/SDK and ASMP-vs-SMP; added checked prefix reader.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted POSIX helper ASan/UBSan on macOS: full/empty/truncation/missing/null/zero capacity tests. Document scope comparison only for NuttX/PX4/SDK, no kernel/board/flight executed. macOS POSIX prefix helper and synthetic parser only. No NuttX/simulator/board/PX4 flight, real Linux/EVL/cyclictest/IRQ/driver/power/benchmark, supplier price, legal/certification determination or WCET proof. Clone-only gate skipped.

Before SHA-256: `c11a7a4bb821140057763a1ce1d7538f7e836658d3fe94780803f27a0fd1a0aa`. After SHA-256: `05de8d8f64334020118b9fe0309189139b0d573f1e26040322e71870bcc17580`.

Next action: manual-review. Which pinned NuttX/apps/board config and target API/resource/fault/timing tests establish the intended protected/process/driver behavior?

### `part5-07-preempt-rt-linux.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux.md
2. **problemSignalAndCounterevidence:** nonRT spin_lock incorrectly masksIRQ; allIRQ threading, arbitrary sleep, fixed RTOS/RT/EVL latency guarantee, EVL API, Yocto and60+count.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Linux6.12 locking/NO_HZ,6.18 real-time differences (revision distinguished); LF cyclictest FAQ; official EVL thread/API revisions.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected lock/IRQ/config and observedMax/WCET scope; removed fake vendor/timing/safety guarantees; added checked output parser and corrected actual53chapter count; manual description correction.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted parser synthetic two-row/CRLF and no/unsupported/zero/unsafe/range negatives pass. Actual Linux kernel, cyclictest, EVL or hardware timing not executed. macOS POSIX prefix helper and synthetic parser only. No NuttX/simulator/board/PX4 flight, real Linux/EVL/cyclictest/IRQ/driver/power/benchmark, supplier price, legal/certification determination or WCET proof. Clone-only gate skipped.

Before SHA-256: `16f6980405cdf2a0e038b9817be1cf187a04704ef2e2bc4009c6f74a5b5d6c0d`. After SHA-256: `a074a90bff3c032d8178835c2d2939bdc8c3c8531b756ed8db55525b60f31775`.

Next action: manual-review. Which Linux/kernel/driver or EVL core/lib configuration and representative overload/IRQ/power experiment plus deadline analysis establish the target response bound?

## Primary sources

- [https://github.com/eclipse-threadx/threadx/blob/master/LICENSE.txt](https://github.com/eclipse-threadx/threadx/blob/master/LICENSE.txt)
- [https://nuttx.apache.org/docs/latest/introduction/about.html](https://nuttx.apache.org/docs/latest/introduction/about.html)
- [https://nuttx.apache.org/docs/latest/implementation/memory_configurations.html](https://nuttx.apache.org/docs/latest/implementation/memory_configurations.html)
- [https://nuttx.apache.org/docs/latest/reference/user/01_task_control.html](https://nuttx.apache.org/docs/latest/reference/user/01_task_control.html)
- [https://nuttx.apache.org/docs/latest/os/filesystem/procfs.html](https://nuttx.apache.org/docs/latest/os/filesystem/procfs.html)
- [https://docs.px4.io/v1.15/en/concept/architecture](https://docs.px4.io/v1.15/en/concept/architecture)
- [https://www.jpl.nasa.gov/news/meet-the-open-source-software-powering-nasas-ingenuity-mars-helicopter/](https://www.jpl.nasa.gov/news/meet-the-open-source-software-powering-nasas-ingenuity-mars-helicopter/)
- [https://developer.sony.com/spresense/development-guides/sdk_tutorials_en](https://developer.sony.com/spresense/development-guides/sdk_tutorials_en)
- [https://docs.kernel.org/6.12/locking/locktypes.html](https://docs.kernel.org/6.12/locking/locktypes.html)
- [https://docs.kernel.org/6.12/timers/no_hz.html](https://docs.kernel.org/6.12/timers/no_hz.html)
- [https://wiki.linuxfoundation.org/realtime/documentation/howto/tools/cyclictest/start](https://wiki.linuxfoundation.org/realtime/documentation/howto/tools/cyclictest/start)
- [https://evlproject.org/core/user-api/thread/](https://evlproject.org/core/user-api/thread/)
- [https://evlproject.org/core/user-api/api-revs/](https://evlproject.org/core/user-api/api-revs/)
- [https://forums.mbed.com/latest](https://forums.mbed.com/latest)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
