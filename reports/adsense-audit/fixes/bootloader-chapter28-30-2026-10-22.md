# Bootloader Internals chapter28–30 remediation record

Manifest: [`bootloader-chapter28-30-2026-10-22.json`](./bootloader-chapter28-30-2026-10-22.json)

`rescore: false`; this companion records source remediation, validation, SHA-256 and unanswered target questions only. No score or rubric result was generated.

## `chapter28-flash-layout.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; runtime `not_run`.
- Before SHA-256: `07b6cbd43aba0d6a353dd93697a1bc5ae10ff2ac4d741f20582fadfa41ba743a`
- After SHA-256: `ad8bb47b350f7d7bf14cdbfd4ba790cf0b4fb0d366865a55fc37de0aefa94b61`
- Decision: Remediated as a device-specific design/verification workflow; distinguished MTD/UBI from block devices; removed synthetic logs, unsupported values and persistent-write recipes. No metadata exception.
- Residual risk: Publish gate, inline-math, diff, fences and metadata invariants passed. Upstream clone-only checks SKIPPED (not PASS). Device geometry, boot-ROM read path, partition map, UBI/UBIFS settings, RPMB use, update interruption and recovery remain unassessed.
- Unassessed question: 어떤 storage part/revision, SoC ROM boot flow, filesystem/update stack, U-Boot tag, 실제 최대 artifact 및 power-cut fixture를 기준으로 partition geometry·A/B·recovery를 검증할 것인가?

## `chapter29-distro-boot.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; runtime `not_run`.
- Before SHA-256: `4ffdeeba333a0ad59f1ea8893c4bec78c402a2e6d9f1e83b31718ecd154b7245`
- After SHA-256: `69969eb2495f109c77b0b2f0fc74c111d5a187824863a2fa85f53fb46d3379ba`
- Decision: Remediated with versioned U-Boot documentation; separated Distro Boot, script format and Standard Boot policy; corrected legacy CRC versus cryptographic verification and narrowed fallback/distribution claims. Metadata unchanged.
- Residual risk: Publish gate, inline-math, diff, fences and metadata invariants passed. Upstream clone-only checks SKIPPED (not PASS). Actual release/config feature availability, distro installer behavior, board boot order, script side effects, FIT policy, EFI variables and fallback remain unassessed.
- Unassessed question: 어떤 pinned U-Boot tag/defconfig, distro installer image, partition map과 board recovery fixture로 extlinux, script/FIT, Standard Boot 순서 및 failure fallback을 실행 검증할 것인가?

## `chapter30-bootloader-ci.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; runtime `not_run`.
- Before SHA-256: `1650bcd37c225feeee0188d303f8ff5925df8ce3208034ad839cea3f7f3fa139`
- After SHA-256: `84c4f3199e0ee1f3f5366941656e75c68d32c4b7ecd950ce0075145e3f373e79`
- Decision: Remediated by separating build/sandbox/QEMU/hardware test scopes, using official documented QEMU and pytest invocation shapes, preserving artifact provenance and conditioning thresholds and signing policy on product requirements. Description narrowed to that scope.
- Residual risk: Publish gate, inline-math, diff, fences and metadata invariants passed with description exception recorded. Upstream clone-only checks SKIPPED (not PASS). U-Boot sandbox, QEMU, device boot, DDR, CI-provider workflow, hardware farm, production signing and failure bisect remain unassessed.
- Unassessed question: 어떤 U-Boot commit/config, QEMU version/machine, board revision, CI provider, reproducible artifacts, board hook and test-key fixture를 기준으로 각 test tier와 negative/recovery case를 검증할 것인가?

`readyForIntegration: true` means the declared article and static-validation scope is complete; it is not a hardware or product qualification result.
