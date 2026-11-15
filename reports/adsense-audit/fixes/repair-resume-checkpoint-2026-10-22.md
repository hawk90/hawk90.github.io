# Resume checkpoint — 2026-10-22

Completed source repairs in this checkpoint: **11 articles**. No re-score, commit, push or deployment performed. Earlier working-tree changes are retained.

## Scope and evidence

- [RTOS Part 2 timing/observability, 4 chapters](rtos-timing-2026-10-22.md)
- [Bootloader chapters34–37, 4 chapters](bootloader-chapter34-37-2026-10-22.md)
- [RTOS Part 3 critical/semaphore/mutex, 3 chapters](rtos-lock-semaphore-2026-10-22.md)

## Current-source verification

- [11-article publish gate](repair-resume-checkpoint-2026-10-22-gate.log): all blocking checks pass. Upstream clone-dependent symbol checks were SKIPPED, not PASS.
- Inline-math check: 11 changed articles pass across the four-article timing and seven-article follow-up runs.
- Scoped git diff --check: pass. Routing metadata compared to tracked HEAD below.
- [Whole-site build](repair-resume-checkpoint-2026-10-22-build.log): npm run build with NODE_OPTIONS=--max-old-space-size=4096 passed, 1135 pages built.
- [Rendered anchor audit](repair-resume-checkpoint-2026-10-22-anchors.log): 67 links checked, zero findings.
- [Rendered reading audit](repair-resume-checkpoint-2026-10-22-reading.log): 1136 HTML pages scanned, no violations. Build and audit counts are the tools’ respective counts.

## Metadata and current hashes

- `src/content/blog/embedded/rtos/practical-internals/part2-08-tick-timer.md`: `cf3cb7a14105f732b58ae3c8d16e9484c606944268b8c7b042e2ade3072951f2`
- `src/content/blog/embedded/rtos/practical-internals/part2-09-tickless.md`: `874f7738192d7c2828d9c8df7209e7ea6010e0625d190ca92a3582f00b330a03`
- `src/content/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency.md`: `9cc3f23a603b4de79e2fba26dad18212eaeefe0fe523a19ffdaa78dd31140643`
- `src/content/blog/embedded/rtos/practical-internals/part2-11-tracing-observability.md`: `fcbfe48bb548b840891ebca25083ea90fef814a2f422f04cf9e94cfbdd81cb5f`
- `src/content/blog/embedded/bootloader/chapter34-pcie-enumeration.md`: `1c355d8c9d07599a38c15a76cc4bd46d14b197340f8e30c194a7cfec3bb966fe`
- `src/content/blog/embedded/bootloader/chapter35-uefi-cxl-init.md`: `6b089fe6c2f24f3085a55e2a23b1a882350961a92d0c12e00a81263b908f5400`
- `src/content/blog/embedded/bootloader/chapter36-boot-memory-topology.md`: `26ad690879c42694530f0fe585432a57ac2f031d6694c6c43fc08b94ab8681c4`
- `src/content/blog/embedded/bootloader/chapter37-secureboot-cert-rollover.md`: `11fefafa4ca40679e101b63a30399be48269763c4d4de155682c336f05b7bd40`
- `src/content/blog/embedded/rtos/practical-internals/part3-01-critical-section.md`: `b123b3c87a093acc129d9a426cd8a0d5d699a32b59a0c01ffe3103cd3452454c`
- `src/content/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl.md`: `d8a8648bc230bbf77972738d019c7faf221b2e7fe2a21dfe67dbd778d16a3e6a`
- `src/content/blog/embedded/rtos/practical-internals/part3-03-mutex-impl.md`: `723ef80164bdd4f328fe7bf0d34eeac4da71af06768e89c6090901d6b3f28ea8`

All routing/date/publication/series/tags/topics fields match tracked HEAD. Manual title/description corrections are scoped in companion records; chapter34–36 titles/descriptions and chapter3-03 description were corrected in this resumed run. Inherited timing descriptions remain as reviewed.

## Runtime limits and next work

Executed host arithmetic, sanitizer policy tests, actual FreeRTOS POSIX functional scenarios, four Cortex-M4F lock/semaphore/mutex API object builds plus the timing batch’s compile checks. No physical MCU/PCIe/CXL/EFI, Linux tracing, low-power current, target performance, QEMU/EDK II boot or certificate rollover was executed. Per-article follow-up questions remain in each manifest.

Next unstarted RTOS chapter: `part3-04-priority-inversion.md`, then `part3-05-priority-inheritance.md` and `part3-06-priority-ceiling.md`; their old PI/PCP claims require independent full-source review and validation. Existing unassessed reports remain unassessed. See regenerated [fix-progress](../fix-progress.md) and [fix-queue](../fix-queue.md) for the full backlog.
