# SMP 그림 참조 보완

기존 [챕터 수정 기록](bootloader-chapter31-33-2026-10-22.md)의 기술 검증 범위와 한계를 유지한다. 존재하지 않는 이미지 참조를 제거했다. 유사한 기존 그림 두 개도 일반적인 PSCI/spin-table 계약과 맞지 않아 대신 연결하지 않았다.

1. **contextAndScope**: Final release follow-up: remove one broken legacy SMP diagram reference. Existing bootloader chapter33 technical repair and its limits remain authoritative.
2. **signalAndRefutation**: SVG accessibility audit found a nonexistent embedded/bootloader asset path. Two similarly named surviving diagrams depict a universal single-primary TF-A/hold-WFI sequence that conflicts with the repaired chapter platform-conditional explanation.
3. **causeAndAlternatives**: Stale illustration survived the earlier text repair. Changing only its URL would display obsolete semantics; neither existing illustration is a general PSCI/spin-table contract.
4. **evidence**: Read the chapter opening/contracts and both existing diagram TeX sources. Removed only the missing illustration reference. Restoring that line reproduces the prior recorded SHA exactly.
5. **sampleScope**: One Markdown image reference and following blank line; no diagram asset, executable example, frontmatter or technical paragraph changed.
6. **decision**: Remediated: remove the broken obsolete illustration; retain the PSCI/spin-table comparison table and conditional platform explanation.
7. **smallestSafeChangeAndRollback**: Only remove that image reference. No asset deletion or change to public article URL/date/order/publication. Historical repair/evaluation records preserved.
8. **verificationAndResidualRisk**: Scoped blocking publish gate and full diagram reference audit pass. Full rendered build follows. No board boot or secondary CPU runtime test.

Before SHA: `9c53686caccdd5ac9120eb3506178f550e088dbfb17a703eb40e10469d7a06d4`

After SHA: `cec4c3f0e7fd4a27f75cb8d1b57e114971f7ed347ed74084a578f634b3a81eaf`

[발행 검사](repair-final-smp-gate-2026-10-24.log) · [그림 참조 검사](repair-final-diagram-references-2026-10-24.log)
