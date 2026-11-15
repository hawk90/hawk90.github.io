# RTOS source tours and port repairs — 2026-10-23

No re-score. Evaluation ledger preserved. Scope: Four full chapters and original evaluation entries read and checked against exact pinned kernel sources. Unsafe substitute internals replaced with source maps and scoped examples.

## Checks and limits

Actual POSIX CMake integration and host frame/model checks only. Zephyr/RT-Thread contracts are source-reviewed, not executed kernels. No new MCU/ISA port, FP/IRQ nesting, SMP/MPU/tickless, board power/timing/WCET or certification. Clone-only gate checks skipped.

Gate: [rtos-source-port-2026-10-23-gate.log](rtos-source-port-2026-10-23-gate.log).
Execution: [rtos-source-port-2026-10-23.log](rtos-source-port-2026-10-23.log).

## Per-article evidence

### `part5-01-freertos-source.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part5-01-freertos-source.md
2. **problemSignalAndCounterevidence:** Incomplete xTaskCreate omitted stack hookup/failures; EXC_RETURN absent and fake FAULTMASK/PendSV sequence; Queue/SMP/priority and CMake ordering wrong.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Actual V11.2.0 tasks.c, queue.c, ARM_CM4F port.c/portmacro.h and CMakeLists.txt.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Replaced unsafe substitute kernel fragments with pinned caller/failure path map; corrected frame/IRQ/SMP/heap1 and defined freertos_config before add_subdirectory.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted CMake config builds actual kernel and runs POSIX task/delay/end; source provenance hashes and actual CM4F initializer host layout comparison. No MCU task/IRQ/FP runtime. Actual POSIX CMake integration and host frame/model checks only. Zephyr/RT-Thread contracts are source-reviewed, not executed kernels. No new MCU/ISA port, FP/IRQ nesting, SMP/MPU/tickless, board power/timing/WCET or certification. Clone-only gate checks skipped.

Before SHA-256: `656007737196324dfaf84b479eb9e7d9da222ae2e7787bfbc0e51d9e3c5fb0be`. After SHA-256: `945588bd4dd674f36d743ffd651024e44484346851a5871ebdb0b6784bd88884`.

Next action: manual-review. Which exact board/port/config and creation/wake/failure trace validate this source map beyond the declared POSIX execution?

### `part5-02-zephyr-source.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part5-02-zephyr-source.md
2. **problemSignalAndCounterevidence:** Invented sem->lock and k_thread fields, wrong per-CPU queue, instance macro scope, west path and USERSPACE activation.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Zephyr v3.7.0 commit36940db938a8f4a1e919496793ed439850a221c2 kernel/sem.c/thread.h/device.h and SMP/object docs.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected pinned structures/common semaphore lock, per-config scheduler and single-instance macro versus foreach; repaired workspace commands and bounded subsystem/stack/cert claims.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Full source/evaluation review; exact source hashes logged and lock/pend/macro contracts compared. No Zephyr kernel or board runtime. Actual POSIX CMake integration and host frame/model checks only. Zephyr/RT-Thread contracts are source-reviewed, not executed kernels. No new MCU/ISA port, FP/IRQ nesting, SMP/MPU/tickless, board power/timing/WCET or certification. Clone-only gate checks skipped.

Before SHA-256: `389e2ae669e3f63d25d0a2449b7a644d8358f8e38206d9b42c5180f61f209402`. After SHA-256: `178e35bfcc8249b321d7dee0ff1a09130ed11747bf6d6a172cfe3e7dc8aebf2b`.

Next action: manual-review. Which supported Zephyr SDK/manifest/board/config build and semaphore normal/timeout/IRQ/SMP/user validation establish the target behavior?

### `part5-03-rt-thread.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part5-03-rt-thread.md
2. **problemSignalAndCounterevidence:** Reconstructed thread base differed from real parent; group-only scheduler skipped subpriority/-1; obsolete IRQ-only IPC and unsupported market/Smart bounds.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** RT-Thread v5.1.0 commit4f7940167d172858e37373bc330c7093e8765d5b rtdef.h/scheduler_up.c/ipc.c/thread.c/components/lwp.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Pinned actual RT-Thread structures and two-stage FFS, semaphore spinlock and bind contract; removed unsupported adoption/size/minimum-RAM claims.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted host priority model checks all256 bits, multi-ready lowest and invalid group/table/empty bucket; source provenance/contracts checked. No real RT-Thread runtime/Smart/Studio/BSP. Actual POSIX CMake integration and host frame/model checks only. Zephyr/RT-Thread contracts are source-reviewed, not executed kernels. No new MCU/ISA port, FP/IRQ nesting, SMP/MPU/tickless, board power/timing/WCET or certification. Clone-only gate checks skipped.

Before SHA-256: `aad4a5dc7fc3c3a2b15933998d99348a4478917605bc8010222c441f8f40b85b`. After SHA-256: `b0b6c8f610e24eb172698bfaac38de5b583a3625e2549f17e3cb9df5a751e1d1`.

Next action: manual-review. Which exact BSP/config and scheduler/IPC normal/timeout/SMP traces validate the product beyond the arithmetic model?

### `part5-04-porting.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part5-04-porting.md
2. **problemSignalAndCounterevidence:** Missing EXC_RETURN, incorrect first-PendSV/mask/yield guarantee, partial RV trap/AArch32-64 mixture, unsafe tickless and 2–3day claim.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** V11.2.0 ARM_CM4F and RISC-V port; Zephyrv3.7.0 source; prior actual port object checks in rtos-context-examples.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Replaced unsafe port substitutes with actual pinned port contracts and frame fixture; corrected ABI/IRQ/ISA/SMP/tickless and validation scope.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted fixture compared under ASan/UBSan with actual pinned initializer offsets and untouched slots. Previous pinned M4F/CA9 compile/disassembly evidence retained; no new-board/FP/IRQ/timing execution. Actual POSIX CMake integration and host frame/model checks only. Zephyr/RT-Thread contracts are source-reviewed, not executed kernels. No new MCU/ISA port, FP/IRQ nesting, SMP/MPU/tickless, board power/timing/WCET or certification. Clone-only gate checks skipped.

Before SHA-256: `889a1f560ba070a05cd7f97ad54c03bf762b9c99fd51201b39a26d3a37e90906`. After SHA-256: `dc8c8937d80e8a7be67f3471b7515d31590cb5341099b305b4896572b03f988b`.

Next action: manual-review. Which real initial/FP/nested IRQ/tick wrap/sleep/SMP/MPU traces and ABI checks establish a complete functioning port?

## Primary sources

- [https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0)
- [https://github.com/zephyrproject-rtos/zephyr/tree/v3.7.0](https://github.com/zephyrproject-rtos/zephyr/tree/v3.7.0)
- [https://github.com/RT-Thread/rt-thread/tree/v5.1.0](https://github.com/RT-Thread/rt-thread/tree/v5.1.0)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
