# Bootloader Internals chapter31–33 remediation record

Manifest: [`bootloader-chapter31-33-2026-10-22.json`](./bootloader-chapter31-33-2026-10-22.json)

`rescore: false`. This companion records source changes, performed validation, SHA-256 and unassessed target questions only. No scores, grades, rubric results or new evaluation states were generated. The published-loop-04 evaluation is read-only.

## `chapter31-tfa-bl31-runtime.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; runtime `not_run`.
- Before SHA-256: `6f145d7d0dfa415e1dce0f1b3a8bbf271a61877c4b49578bfdb9e43f1cfe5ffb`
- After SHA-256: `ab8e2c1787a99504bd011030013b580b22039bc30da7328b55e84e19839cafc3`
- Decision: Remediated as a framework-boundary guide. Corrected the title and description because the previous metadata promised a PSCI/SDEI/RAS dispatcher trace and latency analysis that the supported, reproducible scope could not substantiate.
- Residual risk: The blocking publish gate, inline-math check, diff check, fence balance and required metadata invariants passed. Upstream clone-only checks were SKIPPED (not PASS). Exact handler path, included services, platform memory protection and performance remain unassessed until a pinned TF-A release/platform image and target measurement are supplied.
- Unassessed question: 어떤 TF-A tag, platform port/defconfig, BL31 ELF와 board memory/security map을 기준으로 등록 service, 실제 dispatcher 경로, BL33 진입 상태와 SMC 성능을 확인할 것인가?

## `chapter32-psci-smccc.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; runtime `not_run`.
- Before SHA-256: `f52f74b276bfeb85925256652523609295b59fee8eb8a4b5d5a1fd0f6f195ba3`
- After SHA-256: `f6a89c31fab5bf189e0d6b498c70cdadaaf19ef238e01e35cb7a0467d18d9a17`
- Decision: Remediated around the interface distinction and version/capability checks. Narrowed the description to the retained PSCI/SMCCC and Linux binding scope; title remains accurate at that scope.
- Residual risk: The blocking publish gate, inline-math check, diff check, fence balance and required metadata invariants passed. Upstream clone-only checks were SKIPPED (not PASS). Exact supported calls, conduit, function-ID semantics and return behavior must still be checked against the deployed PSCI/SMCCC revisions and kernel tree.
- Unassessed question: 어떤 Arm PSCI/SMCCC revision, Linux tag, 실제 DT/ACPI, firmware build와 target board로 conduit·지원 function·CPU_ON 반환 및 online 전이를 확인할 것인가?

## `chapter33-smp-secondary-cpu-bringup.md`

- Status: `remediated`
- Validation: blocking gate `pass`, inline-math `pass`, diff `pass`; upstream checks `skipped_not_pass`; runtime `not_run`.
- Before SHA-256: `61d3e18dd53df0122657be3b3c34a678eccb4d026c9ade22d9487092dc4f96a1`
- After SHA-256: `9c53686caccdd5ac9120eb3506178f550e088dbfb17a703eb40e10469d7a06d4`
- Decision: Remediated to distinguish documented startup contracts from kernel implementation details. Corrected the malformed address example into an explicit placeholder, removed invented measurements, and corrected title/description and next-chapter metadata text to match the actual article scope and series order.
- Residual risk: The blocking publish gate, inline-math check, diff check, fence balance and required metadata invariants passed. Upstream clone-only checks were SKIPPED (not PASS). Actual CPU release address/reservation, firmware protocol, kernel tag, GIC behavior, hotplug and timing remain unassessed pending a pinned board/kernel setup.
- Unassessed question: 어떤 board revision, 실제 전달 DT/예약 메모리, firmware와 Linux tag를 사용해 spin-table release 주소 또는 PSCI CPU_ON, secondary 진입, CPU-online 상태 및 오류 경로를 확인할 것인가?

`readyForIntegration: true` means the declared article remediation and static-validation scope is complete; it does not mean firmware, Linux, QEMU or hardware validation passed.
