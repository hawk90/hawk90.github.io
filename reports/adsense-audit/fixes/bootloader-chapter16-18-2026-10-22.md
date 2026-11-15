# Bootloader Internals chapter16–18 remediation record

Manifest: [`bootloader-chapter16-18-2026-10-22.json`](./bootloader-chapter16-18-2026-10-22.json)

`rescore: false`. This companion records source corrections, SHA-256 values, validation scope and remaining runtime questions. It contains no new score, grade, rubric assessment or evaluation status.

## `chapter16-verified-boot.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; target runtime `not_run.
- Before SHA-256: `1274a34cbaceef40c688b13128678c69abd81f7f8465da23e5e471b6c830e05d`
- After SHA-256: `8385c4f5e96d98832410bb871a0421bd8d06f4a2f99e0a35f023c0f751bf68fe`
- Scope: U-Boot FIT signatures, required-key policy, signing/control-FDT sample, bootm path, anti-rollback boundary, dm-verity handoff and all remaining command/transcript claims.
- Decision: Retain a compact account of the U-Boot FIT verification boundary; remove duplicated unsupported internals and fabricated step-by-step logs. Mark the remaining console snippets illustrative, not executed.
- Residual: Static blocking gate, inline-math, diff check and metadata invariants passed. Upstream clone checks SKIPPED (not PASS). FIT generation, trusted-key enrollment, positive/negative verification, config selection and actual anti-rollback remain unassessed.
- Unassessed question: 어떤 pinned U-Boot tag, board defconfig, signing key/control-DT pipeline과 unsigned/invalid FIT samples로 required-signature의 positive/negative boot 결과를 확인할 것인가?

## `chapter17-ab-update.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; target runtime `not_run.
- Before SHA-256: `210d343f7d4bcfda491bfc01b70b4977e2836f26a12ab98c256559b7906a4e94`
- After SHA-256: `37aa6e95f89d23cd4935c27c757e78becd0aab6f4c6e6697b02fd2f5f4f890b9`
- Scope: A/B slot layout and update flow, U-Boot bootcount/altbootcmd semantics, userspace success, backend behavior, Android metadata and RAUC contract.
- Decision: Remove unverified generic command recipes and backend table; state the documented boundaries and retain only the framework contract checked against the official docs.
- Residual: Static blocking gate, inline-math, diff check and metadata invariants passed with the recorded description exception. Upstream clone checks SKIPPED (not PASS). Board-specific backend persistence, slot transition, watchdog/health, RAUC runtime and power-loss recovery remain unassessed.
- Unassessed question: 어떤 board revision, U-Boot bootcount backend와 RAUC/update-framework version/script를 기준으로 bootcount, health marker, slot fallback 및 power-loss recovery를 시험할 것인가?

## `chapter18-efi-in-uboot.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; target runtime `not_run.
- Before SHA-256: `17271443b6eeda9390c7a0309fb8c8e899908ece645d6b245433203050e7f2f0`
- After SHA-256: `868650e6a14cbf2382ec14d39ea72f3ef99897697c2d471f9aef49b05f746ef2`
- Scope: U-Boot EFI command/configuration, Boot Manager, variable persistence, Secure Boot, EBBR/SystemReady, UEFI partition formats, Linux EFI stub and distro installer examples.
- Decision: Narrow config and compatibility claims; remove unsupported provisioning/backend recipes and qualify synthetic outputs. Link the UEFI primary source for media access rules.
- Residual: Static blocking gate, inline-math, diff check and metadata invariants passed. Upstream clone checks SKIPPED (not PASS). Board Kconfig, variable retention, secure-boot enforcement, Boot Manager, initrd and distro boot remain unassessed.
- Unassessed question: 어떤 U-Boot tag/board configuration, EFI variable backend와 UEFI test suite로 Boot Manager, variable retention, Secure Boot 및 distro image compatibility를 확인할 것인가?

Primary sources and the complete eight-field remediation evidence are in the manifest. `readyForIntegration: true` means this batch’s declared edits, static checks, evidence and SHA records are complete; it does not mean board/runtime validation passed.
