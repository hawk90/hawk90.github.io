# ESP32-C3 core and memory repairs — 2026-10-23

No re-score. Evaluation ledger preserved. Scope: Three full article sources and loop24 evaluations read; pinned ESP-IDFv5.4.2 source/TRM/datasheet contracts compared, extracted arithmetic/instruction/API/partition examples executed within declared scope.

## Checks and limits

No full IDF project, target toolchain install, board/flash/CSR/fault/interrupt/NVS/OTA/wireless/power executed. Native tests use actual API headers and explicitly fake NVS/heap backend. Arithmetic/crosscompile are not hardware tests. Correctedch02diagram0overlap0touch; strict broader riscv sweepfails on unchangedch06diagram2overlaps and remains an implementation follow-up withch06. Unrelated clone-only gate skipped.

Gate: [esp32-c3-core-memory-2026-10-23-gate.log](esp32-c3-core-memory-2026-10-23-gate.log).
Execution: [esp32-c3-core-memory-2026-10-23.log](esp32-c3-core-memory-2026-10-23.log).
Execution: [esp32-c3-core-memory-2026-10-23-diagrams.log](esp32-c3-core-memory-2026-10-23-diagrams.log).

## Per-article evidence

### `chapter01-overview.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/riscv/esp32-c3-mastering/chapter01-overview.md
2. **problemSignalAndCounterevidence:** Unsupported IP-cost/strategy/pricing/95% compatibility, ECC-HMAC conflation, ADC unit assumption, fixed available heap/range/battery claims and wrong roadmap links.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Pinned ESP-IDFv5.4.2 soc_caps/cpu-region source and official datasheetv2.4.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Narrowed manual title/description to actual introduction; removed unsupported cause/rank/guarantees; corrected target/ADC/crypto/flash bounds, version pin, hello includes/tick conversion and roadmap.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Chapter/source/evaluation comparison and actual headers/encoding checks in companion verifier. Hello board flash/log, radio/power and vendor-cost claims not executed or asserted. No full IDF project, target toolchain install, board/flash/CSR/fault/interrupt/NVS/OTA/wireless/power executed. Native tests use actual API headers and explicitly fake NVS/heap backend. Arithmetic/crosscompile are not hardware tests. Correctedch02diagram0overlap0touch; strict broader riscv sweepfails on unchangedch06diagram2overlaps and remains an implementation follow-up withch06. Unrelated clone-only gate skipped.

Before SHA-256: `a1fe2df663313f0031a945d01b40b8d684ae3d9be12977cd528213219315cc0c`. After SHA-256: `19361c2f206a61adaafa13ce605ef9faccbe6e731ca3400eada10f2680341fc8`.

Next action: manual-review. Which actual part/module, SDK configuration and board measurements establish available pins, heap, wireless/power budget and port compatibility?

### `chapter02-riscv-core.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/riscv/esp32-c3-mastering/chapter02-riscv-core.md
2. **problemSignalAndCounterevidence:** U-mode falsely absent, C.SWSP encoded as C.SW, L=0 M-mode protection falsely promised, unsupported CLIC/priority1..7/CPU0..30, IRAM flag/linker and scheduler order wrong.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** ESP32-C3 TRMv1.4 CPU/PMP/interrupt sections; pinned IDFcpu_region_protect.c/intr_alloc/vector/app_startup source.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected M/U vs SDK execution, actual PMP/lock/nonoverlap initialization and interrupt number/priority contracts; removed unsafe runtime PMP rewrite; added pure checked NAPOT encoder, CSR mask save/restore and correct explicit instruction encodings; corrected source diagram.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** ExactRV32 byte comparison, CSRcrosscompile/disassembly, ASan/UBSan NAPOT sizes/alignment/bounds/null tests pass. Corrected diagram rebuilt:0 overlap/0touch; wider riscv sweep still reports2 overlaps in unchanged chapter06 diagram, next implementation tracked. No CSR/PMP/fault/interrupt board execution. No full IDF project, target toolchain install, board/flash/CSR/fault/interrupt/NVS/OTA/wireless/power executed. Native tests use actual API headers and explicitly fake NVS/heap backend. Arithmetic/crosscompile are not hardware tests. Correctedch02diagram0overlap0touch; strict broader riscv sweepfails on unchangedch06diagram2overlaps and remains an implementation follow-up withch06. Unrelated clone-only gate skipped.

Before SHA-256: `9abb1abc845748072fb3593c7136ed4a57fd2b2a226b0524f7902ff8b6a0d24e`. After SHA-256: `785a2eafca0d579cc3c6b1ff216b8e4b4a607b19150d882d32d46ea91a4c0691`.

Next action: manual-review. Which boot/runtime config and complete privilege/PMP/alias/reset and interrupt-threshold observations establish isolation and latency on the actual C3?

### `chapter03-memory-flash.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash.md
2. **problemSignalAndCounterevidence:** 6MiB CSV falsely fits4MiB, alias/physical memory conflation, Xtensa GPIO address, unchecked NVS errors, RTC heap persistence, external LittleFS presented builtin and unconditional timed OTA rollback.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Pinned actualsoc.h/memory_layout.c/nvs.h/partitiongenerator/OTA source and manual; actual target API headers.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected fixed source memory windows and RTC config/lifetime; replaced overflow partition with exact4MiB custom6-row example, checked heap/NVS helpers and explicit trust-anchor/rollback contracts. Removed unpinned filesystem mount procedure and unsupported rankings; manual description correction.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actualgen_esp32part.py CSV->binary->CSV passes; overflow/overlap/misalignment rejected. Actual pinned NVS/heap headers plus explicit fake backends verify open/set/commit/get/shortbuffer/allocation failures and resource lifetime underASan/UBSan. No actualflash/OTA/powercut. No full IDF project, target toolchain install, board/flash/CSR/fault/interrupt/NVS/OTA/wireless/power executed. Native tests use actual API headers and explicitly fake NVS/heap backend. Arithmetic/crosscompile are not hardware tests. Correctedch02diagram0overlap0touch; strict broader riscv sweepfails on unchangedch06diagram2overlaps and remains an implementation follow-up withch06. Unrelated clone-only gate skipped.

Before SHA-256: `06abb9a251fc2cf1be3cdede3947aeebb75e6acb2b1d1f39ec45c5beaba4187b`. After SHA-256: `6b3c38a45526199e5556817f4fecfa696b1f8d03f3738b0baeacf7014fe50a63`.

Next action: manual-review. Which complete application/config, actual flash part/image sizes, filesystem revision and NVS/OTA power-cut/reset test establish data durability and rollback behavior?

## Primary sources

- [https://github.com/espressif/esp-idf/tree/f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0](https://github.com/espressif/esp-idf/tree/f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0)
- [https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf](https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf)
- [https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf)
- [https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/intr_alloc.html](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/intr_alloc.html)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
