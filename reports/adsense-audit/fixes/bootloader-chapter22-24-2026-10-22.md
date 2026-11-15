# Bootloader Internals chapter22–24 remediation record

Manifest: [`bootloader-chapter22-24-2026-10-22.json`](./bootloader-chapter22-24-2026-10-22.json)

`rescore: false`; this fixed companion records article remediation, evidence, validation, SHA-256 and unanswered target questions only. No score or rubric result was generated.

## `chapter22-debugging.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; target runtime `not_run`.
- Before SHA-256: `e82450905c76d302fd311215ec0f54ad4a604495f3386baace95164f4c75a280`
- After SHA-256: `fc123a89fd8cdb5ba4c28351b8f09581aaa1cf34e2805cac08108bb765a9c8bd`
- Decision: Remediated by removing fabricated outputs, inconsistent addresses, unbounded/destructive recipes and unsupported retention assumptions; kept safe placeholder command shapes and qualified target-dependent behaviors. Corrected the inaccurate next-chapter/series-final wording. Frontmatter slug/date/series/order/draft unchanged.
- Residual risk: Blocking publish gate, inline-math check, diff check, markdown fence and required metadata invariants passed. Upstream clone-only checks were SKIPPED (not PASS). U-Boot command availability, debug UART, JTAG, relocated symbols, pstore persistence and all target behavior remain untested.
- Unassessed question: 어떤 U-Boot tag, 보드/메모리 맵, debug probe와 pstore 설정을 대상으로 early UART, relocation 전후 GDB, mtest 안전 범위 및 재부팅 로그 보존을 실제 재현할 것인가?

## `chapter23-bootrom-efuse-otp.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; target runtime `not_run`.
- Before SHA-256: `901583f051b174343f68ebcd73a5f0dcd51849ccacf0f4a20316ef2e528611ff`
- After SHA-256: `86a8483d83aa9d9d47f59291ee01dbf1b27ed07fb2840471ceb6543f319c41bc`
- Decision: Remediated by deleting unsupported cross-vendor maps, irreversible programming steps and universal anti-rollback assertions. Replaced them with a review checklist and a clear boundary that provisioning must follow exact vendor documentation. Updated description to reflect the narrower generic article; slug/date/series/order/draft unchanged.
- Residual risk: Blocking publish gate, inline-math, diff, fence and metadata invariants passed; description exception is recorded. Upstream clone-only checks were SKIPPED (not PASS). All SoC-specific boot order, fuse fields, lifecycle transitions, secure boot verification and rollback policy remain unassessed pending exact part/revision primary sources.
- Unassessed question: 어떤 정확한 SoC 부품·silicon revision·ROM/security manual revision과 승인된 provisioning 절차를 기준으로 BootROM 경로, fuse field, 인증 체인, rollback 및 debug lifecycle을 검증할 것인가?

## `chapter24-spl-deep.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; target runtime `not_run`.
- Before SHA-256: `e38ad4ddfa9a58f66942663cf37b4bfef9f658a6ec0523349545134c39c0dd04`
- After SHA-256: `4cb5fe4b0b3db8edefa755a5a89501b33321ea66184dceb5448c4aaa01d2de69`
- Decision: Remediated by aligning generic phase description with U-Boot v2025.01 documentation and removing board-specific figures/API behavior that lacked a pinned source. Updated description to avoid promising a universal SRAM/DDR model; slug/date/series/order/draft unchanged.
- Residual risk: Blocking publish gate, inline-math, diff, fence and metadata invariants passed; description exception is recorded. Upstream clone-only checks were SKIPPED (not PASS). Board-specific phase chain, SRAM/SDRAM timing, image loading/authentication, linker/BSS placement, Falcon behavior and runtime remain unassessed.
- Unassessed question: 어떤 SoC/board revision, ROM media specification, U-Boot tag/configuration, linker map 및 signed-image fixture를 대상으로 각 phase·memory layout·load/authentication·handoff를 재현할 것인가?

The manifest contains the required eight evidence fields for each article and the canonical status. `readyForIntegration: true` means the declared source-remediation and static-check scope is complete; it does not mean target hardware passed.
