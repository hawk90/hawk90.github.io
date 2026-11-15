# Bootloader Internals chapter19–21 remediation record

Manifest: [`bootloader-chapter19-21-2026-10-22.json`](./bootloader-chapter19-21-2026-10-22.json)

`rescore: false`. This companion records source remediation, validation scope, SHA-256 and unanswered target questions only. No scores or rubric results are produced.

## `chapter19-kernel-handoff.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; runtime `not_run.
- Before SHA-256: `83ca86f021e84f491873abda22a97f27e51551a03a38d3208d21313be184bdfa`
- After SHA-256: `aeae38ef9ddad6e657109d05c08925e6453edc557d2840a4f99995212b8fcbfb`
- Scope: Linux ARM32, AArch64, RISC-V and x86 entry requirements, U-Boot image commands, memory placement, cache/MMU/interrupt state and diagnostic guidance in chapter19.
- Decision: Corrected verified protocol errors, removed unverified behavior, pinned explanation to Linux v6.12 and U-Boot v2025.01 sources, and manually aligned title/description with the four architectures in scope. Slug/date/series/order/draft unchanged.
- Residual risk: Static blocking publish gate, inline-math, diff and metadata invariants passed with title/description exception recorded. Upstream clone-only checks SKIPPED (not PASS). Actual ARM/ARM64/RISC-V/x86 boot, SoC register state, U-Boot command path and EFI handoff remain unassessed.
- Unassessed question: 어떤 kernel tag와 board/firmware path로 AArch64, ARM32, RISC-V, x86 protocol의 entry state, load range, DT/ACPI/initrd 및 U-Boot command 결과를 각각 검증할 것인가?

## `chapter20-rauc-swupdate.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; runtime `not_run.
- Before SHA-256: `3c83c82cbd0422f91529b4bd0d92c2603e3764340c589b2c41ca77632f5fcdd9`
- After SHA-256: `1db2ea6e640b30915adfbbf4e8457e82f50aca475b88c2fbdf2e80a80ce62509`
- Scope: RAUC system.conf/manifest, signing/bundle/install/mark-good and U-Boot bootchooser integration; SWUpdate parser, archive, bootenv, collection/mode and product selection guidance.
- Decision: Corrected confirmed framework contract errors; retained syntax examples supported by official docs with placeholders and explicit non-execution; replaced tool ranking with target-specific criteria. Metadata unchanged.
- Residual risk: Static blocking publish gate, inline-math, diff and frontmatter invariants passed. Upstream clone-only checks SKIPPED (not PASS). Pinned RAUC/SWUpdate version, board-specific script, slot map, health timing, interruption recovery and signature-failure behavior remain unassessed.
- Unassessed question: 어떤 pinned RAUC/SWUpdate version, bootloader script, slot map, update bundle/SWU와 power-cut fixture로 signature rejection, inactive-slot write, state update, mark-good 및 rollback을 검증할 것인가?

## `chapter21-board-porting.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; runtime `not_run.
- Before SHA-256: `52a2f72dee216e48d59af178aa5ab780ea57bab5db6c621a2d0e2442695a86d2`
- After SHA-256: `75985fb699a387e99b4786004bd83b285204667f66e209dc4f504e50c5a552fd`
- Scope: New U-Boot board-port workflow, reference port selection, config/Kconfig/Kbuild, DT/SPL phase tagging, DRAM/UART initialization, build/flashing and first-boot evidence.
- Decision: Corrected unsupported generic port claims, destructive host write and synthetic output; aligned next chapter link with existing series and corrected BSP link label. No title/description change was needed; all frontmatter preserved.
- Residual risk: Static blocking publish gate, inline-math, diff and metadata invariants passed. Upstream clone-only checks SKIPPED (not PASS). Actual Kconfig resolution, SPL/DDR initialization, ROM packaging, UART output and first boot require pinned board/toolchain/hardware and remain unassessed.
- Unassessed question: 어떤 SoC/board revision, U-Boot tag, DRAM/PMIC datasheet, ROM media layout 및 approved recovery method를 기준으로 defconfig/SPL/DDR/UART/first boot를 검증할 것인가?

The manifest contains complete eight-field evidence, primary sources and validation commands. `readyForIntegration: true` means the declared source and static validation work is complete; it does not represent target hardware validation.
