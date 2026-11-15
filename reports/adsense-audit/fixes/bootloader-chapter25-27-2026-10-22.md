# Bootloader Internals chapter25–27 remediation record

Manifest: [`bootloader-chapter25-27-2026-10-22.json`](./bootloader-chapter25-27-2026-10-22.json)

`rescore: false`; this companion records article remediation, evidence, validation, SHA-256 and unanswered target questions only. No score or rubric result was generated.

## `chapter25-tfa-optee.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; target runtime `not_run`.
- Before SHA-256: `2d6a0167cc8268dd20444c472a1f937744c9ab85368129f641a93411890d0252`
- After SHA-256: `97465a3456af12f760d44a85dccf4f6a9da94c58b957d62e5f8459a5e2ba3cb4`
- Decision: Remediated by qualifying BL stages as TF-A reference roles, explaining optional TBB/BL32 and platform-specific memory, packaging and runtime services. Updated description to remove the universal secure boot framing. URL/date/series/order/draft preserved.
- Residual risk: Blocking publish gate, inline-math, diff, fences and metadata invariants passed; description exception recorded. Upstream clone-only checks SKIPPED (not PASS). Specific platform stage chain, EL/entry ABI, memory reservation, PSCI, OP-TEE dispatcher and FIP/package integration remain unassessed.
- Unassessed question: 어떤 SoC/board revision, TF-A/OP-TEE/U-Boot tag와 vendor package를 고정해 stage chain, EL, memory carveout, FIP, PSCI와 성공/거부 경로를 실행 검증할 것인가?

## `chapter26-ddr-training.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; target runtime `not_run`.
- Before SHA-256: `f22716dd176b1ce4cd2fa9056a8398e8243ca578af02656687b6512b456ac091`
- After SHA-256: `ef9897de6289de1fdbf77906ebe214006494ec35036ac05c1a5158a274f49a5e`
- Decision: Remediated as a source-oriented diagnostic method: match SoC/PHY/DRAM/board/tool revisions, consult component-specific source, distinguish logs from hardware evidence and note destructive test behavior. Metadata unchanged.
- Residual risk: Blocking publish gate, inline-math, diff, fences and metadata invariants passed. Upstream clone-only checks SKIPPED (not PASS). Actual PHY training, board signal integrity, DRAM timing/electrical limits, vendor tool output, temperature/voltage margins and production sign-off remain unassessed.
- Unassessed question: 어떤 board revision, 정확한 DRAM 부품/datasheet, PHY firmware, BSP/tool version과 환경 fixture로 training result, memory test 범위 및 margin을 검증할 것인가?

## `chapter27-chain-of-trust.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; target runtime `not_run`.
- Before SHA-256: `4483737c979c5619204424427d91c2be80cbe02cfa93a004d695f9dee328a529`
- After SHA-256: `ce348cdbf90bd7ebc7f1d8f283029f42ec175289183dddd98c5c574964857912`
- Decision: Remediated by separating TF-A TBB, FIT verification, module policy and verity boundaries; qualify optional config and enforcement; remove unsupported vendor commands/output and update description to match article scope. URL/date/series/order/draft preserved.
- Residual risk: Blocking publish gate, inline-math, diff, fences and metadata invariants passed; description exception recorded. Upstream clone-only checks SKIPPED (not PASS). Exact ROM/TF-A/FIT chain, fuse lifecycle, key rotation, rollback enforcement, module denial and verity root-hash provenance remain unassessed.
- Unassessed question: 어떤 SoC/revision security manual과 승인된 key fixture로 ROM/TF-A/FIT enforcement, negative-image rejection, module policy, rollback state 및 verity root-hash 전달을 확인할 것인가?

The manifest contains all eight required evidence fields per article. `readyForIntegration: true` means the declared source and static checks are complete; it is not a statement of board-level or security sign-off.
