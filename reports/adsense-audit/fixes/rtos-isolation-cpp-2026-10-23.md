# RTOS isolation, OpenAMP and C++ repairs — 2026-10-23

No re-score. Evaluation ledger preserved. Scope: Four full chapters and original evaluation entries read; privilege, CMSE, crypto/boot, RPMsg and C++ lifetime defects corrected against pinned sources.

## Checks and limits

No physical MPU/TrustZone faults or privilege transitions, full TF-M crypto/attestation/boot, RPMsg peer/cache/mailbox transport or MCU latency/certification executed. CMSE/MPU examples compile only; RPMsg lower transport is an explicit stub. C++ object API test uses real POSIX FreeRTOS. Clone-only gate checks skipped.

Gate: [rtos-isolation-cpp-2026-10-23-gate.log](rtos-isolation-cpp-2026-10-23-gate.log).
Execution: [rtos-isolation-cpp-2026-10-23.log](rtos-isolation-cpp-2026-10-23.log).

## Per-article evidence

### `part4-10-syscall.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part4-10-syscall.md
2. **problemSignalAndCounterevidence:** Unprivileged example set privilege bit; wrong PSP-only handler, ECALL next-mode rule, unsafe bitmap shift and unversioned wrapper.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** V11.2.0 ARM_CM4_MPU/task.h/mpu_wrappers_v2.c; Zephyr3.7 object docs; RISC-V privileged ISA.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected bit, pinned MPU v2 distinction and Zephyr object startup; replaced fake handler with declared compile ABI/model; removed unsupported timing/certification claims; description corrected.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted bitmap model ASan/UBSan allow/deny/table/bit31/32/huge index; SVC and restricted API actual M4/MPU-v2 header compile. No fault/transition/runtime MPU. No physical MPU/TrustZone faults or privilege transitions, full TF-M crypto/attestation/boot, RPMsg peer/cache/mailbox transport or MCU latency/certification executed. CMSE/MPU examples compile only; RPMsg lower transport is an explicit stub. C++ object API test uses real POSIX FreeRTOS. Clone-only gate checks skipped.

Before SHA-256: `b6e7031120cc4b1ebc74fe50d173e85dcda162bf46e41f0edb357b46279362a6`. After SHA-256: `1e4f9d8f0e1f6689f1848f55334ed6591b26fe43eac4b736e7bb0b6678d233e5`.

Next action: manual-review. Which actual linker/MPU/PMP regions, wrapper config, exception frame and object/pointer authorization validate the target boundary?

### `part4-11-trustzone-tfm.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm.md
2. **problemSignalAndCounterevidence:** Alias bit arithmetic false; all registers banked/only SG transition, incomplete pointer checks, export-key absence, GCM zero nonce reuse, measured/verified boot confusion and false SoC/certification table.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** TF-Mv2.1.0 commit0c4c99ba33b3e66deea070e149279278dc7647f4 boot/isolation sources; Arm CMSE issue2024; PSA3.6.3 and official scheme/NXP docs.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected bit26 and SoC-specific mapping; CMSE read/write/snapshot contract; removed unsafe crypto fragments and fake timings; pinned TF-M boot/image/isolation and corrected certification scope.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted M33 -mcmse entry compiles with actual arm_cmse.h; TT/BXNS and __acle_se symbol verified. Boot/image/export/nonce contracts source-reviewed only. No secure image or crypto/attestation runtime. No physical MPU/TrustZone faults or privilege transitions, full TF-M crypto/attestation/boot, RPMsg peer/cache/mailbox transport or MCU latency/certification executed. CMSE/MPU examples compile only; RPMsg lower transport is an explicit stub. C++ object API test uses real POSIX FreeRTOS. Clone-only gate checks skipped.

Before SHA-256: `899198836f6e5b744990811db976fc28962ac8af05cf1a105a4de942b48d37db`. After SHA-256: `469f5465a71275c4fb5942209d38300004417f9660fac2b60f6052783663ad5c`.

Next action: manual-review. Which complete secure/nonsecure image, attribution/debug/DMA policy, key/nonce lifecycle and verifier/fault tests establish the actual security claim?

### `part4-12-amp-openamp.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part4-12-amp-openamp.md
2. **problemSignalAndCounterevidence:** rpmsg_send called nonblocking; driver/device ring ownership reversed; firmware name called immediate load; RP2350 core/ISA and timing generalizations.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** open-amp/libmetal v2024.10.0 commits a2cd944/f8a0e51; Virtio1.2; Linux RPMsg/remoteproc/sysfs ABI; ST/RaspberryPi primary docs.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Pinned API, bounded checked nonwaiting echo adapter, corrected ring roles/cache/mapping/sysfs/ISA/lifetimes and removed fake transport measurements; manual description correction.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted echo + actual configured libmetal/RPMsg inline headers ASan/UBSan: wait=false and src destination, full/partial/null/zero/INT_MAX handling. Explicit lower transport stub; no vring/mailbox/runtime board. No physical MPU/TrustZone faults or privilege transitions, full TF-M crypto/attestation/boot, RPMsg peer/cache/mailbox transport or MCU latency/certification executed. CMSE/MPU examples compile only; RPMsg lower transport is an explicit stub. C++ object API test uses real POSIX FreeRTOS. Clone-only gate checks skipped.

Before SHA-256: `74bc795dd695a74cb6b714893e48f90b12eb54496290f335ac3cb9f2fb23b645`. After SHA-256: `83e1b98fab4d7210cbb7a8c9b0149e6f5473adcb39358cb4ce1fb85ac70da5dd`.

Next action: manual-review. Which real board resource table, cache/barrier ownership, notification and peer-reset/overload trace validate IPC and endpoint lifetime?

### `part4-13-cpp-in-rtos.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/rtos/practical-internals/part4-13-cpp-in-rtos.md
2. **problemSignalAndCounterevidence:** std::thread said autojoin/detach; raw queue allowed nontrivial types; ignored lock failure, task deletion treated as C++ cleanup, false ARM64 atomics/ETL/flag/timing guarantees and leaked coroutine.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** C++ draft thread destructor/BasicLockable/coroutine; actual V11.2.0 queue/semphr/task contracts; ETL error settings and GCC options.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected lifetime and BasicLockable contracts; extracted static wrappers enforce raw-copy type and fail-stop; added owned coroutine and removed unsupported performance/standard promises; manual description correction.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual POSIX FreeRTOS C++ guard early-return/take-failure, lock_guard/try-lock and queue FIFO/full/empty pass; string payload compile rejects. Coroutine ASan/UBSan initial/active/done destruction and no-resume-after-done pass. No external cancellation/ISR/target timing. No physical MPU/TrustZone faults or privilege transitions, full TF-M crypto/attestation/boot, RPMsg peer/cache/mailbox transport or MCU latency/certification executed. CMSE/MPU examples compile only; RPMsg lower transport is an explicit stub. C++ object API test uses real POSIX FreeRTOS. Clone-only gate checks skipped.

Before SHA-256: `16c72a03deb26f7e8dfe8fdbfda8fa98d275677812022ec0b6224910f8250895`. After SHA-256: `5c771aa322e8b910c32deb3965be61c647cbdb0798d435d1a99ce53cb8974746`.

Next action: manual-review. Which cooperative task stop/ack, waiter-free destruction, payload ownership and coroutine cancellation/resume contract validate the actual product?

## Primary sources

- [https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0)
- [https://docs.zephyrproject.org/3.7.0/kernel/usermode/kernelobjects.html](https://docs.zephyrproject.org/3.7.0/kernel/usermode/kernelobjects.html)
- [https://arm-software.github.io/acle/cmse/cmse.html](https://arm-software.github.io/acle/cmse/cmse.html)
- [https://git.trustedfirmware.org/TF-M/trusted-firmware-m.git/tree/?h=TF-Mv2.1.0](https://git.trustedfirmware.org/TF-M/trusted-firmware-m.git/tree/?h=TF-Mv2.1.0)
- [https://mbed-tls.readthedocs.io/projects/api/en/v3.6.3/api/file/crypto_8h/](https://mbed-tls.readthedocs.io/projects/api/en/v3.6.3/api/file/crypto_8h/)
- [https://www.psacertified.org/getting-certified/](https://www.psacertified.org/getting-certified/)
- [https://github.com/OpenAMP/open-amp/tree/v2024.10.0](https://github.com/OpenAMP/open-amp/tree/v2024.10.0)
- [https://github.com/OpenAMP/libmetal/tree/v2024.10.0](https://github.com/OpenAMP/libmetal/tree/v2024.10.0)
- [https://docs.oasis-open.org/virtio/virtio/v1.2/virtio-v1.2.html](https://docs.oasis-open.org/virtio/virtio/v1.2/virtio-v1.2.html)
- [https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-class-remoteproc](https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-class-remoteproc)
- [https://www.raspberrypi.com/products/rp2350/](https://www.raspberrypi.com/products/rp2350/)
- [https://eel.is/c++draft/thread.thread.destr](https://eel.is/c++draft/thread.thread.destr)
- [https://eel.is/c++draft/thread.req.lockable.basic](https://eel.is/c++draft/thread.req.lockable.basic)
- [https://www.etlcpp.com/docs/utilities/error-handler/](https://www.etlcpp.com/docs/utilities/error-handler/)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
