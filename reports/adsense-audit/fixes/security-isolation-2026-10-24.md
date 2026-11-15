# TrustZone call directions and OP-TEE object lifetime repair

No re-score. Evaluation ledger preserved. Scope: Full originals/frozen loop23 entries read. Arm CMSE requirements, Linux6.12 SMCCC header, OP-TEE4.5.0 source/secure-storage docs and TFA2.12RME selected sections compared. Actual Cortex-M33 compile and GP-header host mock executed. Native partition diagram rebuilt, visually inspected and five series figures overlap-checked.

## Checks and limits

Compile and host mock only. No linked NSC/import library, SAU/IDAU/GTZC/stack configuration, firmware/TA/devkit ABI run, OP-TEE boot/xtest, real storage/RPMB/HUK provisioning, TOCTOU/authorization/side-channel or CCA attestation test. Macro namespace adaptations only for macOS public-header compile. No physical isolation certification. Generic clone gate skipped, not passed. Frozen scores unchanged.

Gate: [security-isolation-2026-10-24.gate.log](security-isolation-2026-10-24.gate.log).
Execution: [security-isolation-2026-10-24.verify.log](security-isolation-2026-10-24.verify.log).
Execution: [security-isolation-2026-10-24.storage.log](security-isolation-2026-10-24.storage.log).
Execution: [security-isolation-2026-10-24.math.log](security-isolation-2026-10-24.math.log).
Execution: [security-isolation-2026-10-24.diagram.log](security-isolation-2026-10-24.diagram.log).
Execution: [security-isolation-2026-10-24.overlap.log](security-isolation-2026-10-24.overlap.log).

## Per-article evidence

### `chapter04-trustzone.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/embedded-security/chapter04-trustzone.md
2. **problemSignalAndCounterevidence:** Original inverted BLXNS direction, used fake MMU register names and unverified NSC/HAL snippets; native L552 diagram showed invented address ranges. Other OS/stack/controller guarantees overgeneralized.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Actual Arm CMSE describes BLXNS Secure-to-NS, SG NS-to-S, BXNS return/FNC_RETURN. Article C compiled unchanged with Clang CortexM33-mcmse; assembly verifies BXNS/BLXNS and independent NS caller ordinary BL. Linux6.12SMCCC bits reviewed. Native SVG rebuilt, raster visually checked; all five embedded-security figures0overlap/0touch, near counts reported separately.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Separate A/M example configurations and RME scope; qualify GIC/EL/SMCCC and context management. Replace unsafe crypto entry with actual compile-only CMSE call-direction example; clarify shared memory TOCTOU/DMA/lock/stack limits. Preserve diagram path but replace fictitious addresses with explicit conceptual partition roles.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Compiler check, gate, math, diff, native diagram build and overlap pass. No hardware/linker isolation validation. Compile and host mock only. No linked NSC/import library, SAU/IDAU/GTZC/stack configuration, firmware/TA/devkit ABI run, OP-TEE boot/xtest, real storage/RPMB/HUK provisioning, TOCTOU/authorization/side-channel or CCA attestation test. Macro namespace adaptations only for macOS public-header compile. No physical isolation certification. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `d7faf5687cca86a645907e41171a6ec22007ea127b9739a143f401224556486d`. After SHA-256: `cf86e7424e0bf737d4a128e78c6ce9563c4a868dfe7dbbc1736a0383f090c3b5`.

Next action: manual-review. In the actual firmware map and linked veneers, do forbidden entry, pointer mutation, DMA and reset tests preserve the intended security boundary?

### `chapter05-tee.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/embedded-security/chapter05-tee.md
2. **problemSignalAndCounterevidence:** Unverified fake AES TA and logs, API size types, session/load/RPC confusion, storage rollback/strongest-backend assertions and ungrounded CCA comparisons. Title promised broadcomparison beyond body evidence.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** OPTEE4.5.0 0919de0f source actual tee_internal_api.h has size_t ReadObjectData and distinctGP11compat; actual headers used unmodified with three macOS macro undef adaptations. Extracted article helper mocked four object APIs underASan/UBSan:validread,open/info/readfailures,nullcontract,short/zerocapacityandclosecounts. Docs explicitlyPRIVATEprefersREEandnoCFG_RPMB_FSmeansnorollbackprotection. TF-A2.12RMEfourstates/GPC compared.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Manually narrow title/description to OP-TEE call/storage trust. Remove incomplete CA/AES/manifest/QEMU examples; pin4.5.0 source and provide complete internal config-read helper with checked failures/close ownership. Clarify TA/pTA, supplicant, session versus invoke, shared buffer TOCTOU, REE/RPMB/PRIVATEselection and CCA access-control scope.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual header host compile/mock, gate, math and scoped diff pass. No actual TA/storage/RPMB or fullOPTEEbuild/run. Compile and host mock only. No linked NSC/import library, SAU/IDAU/GTZC/stack configuration, firmware/TA/devkit ABI run, OP-TEE boot/xtest, real storage/RPMB/HUK provisioning, TOCTOU/authorization/side-channel or CCA attestation test. Macro namespace adaptations only for macOS public-header compile. No physical isolation certification. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `c2e08a4775422e92d709dceb67d2556985bb5e9690d80a6f07fef9c541313db1`. After SHA-256: `6565dbc3545b2e11fab61e23b834eb48a42c0f544626a8de1b2efd3b6f055e0e`.

Next action: manual-review. For a pinned platform, which trusted-storage selection, key derivation, rollback and CA/TA negative tests prove the intended authorization and recovery contracts?

## Primary sources

- [https://arm-software.github.io/acle/cmse/cmse.html](https://arm-software.github.io/acle/cmse/cmse.html)
- [https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/include/linux/arm-smccc.h](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/include/linux/arm-smccc.h)
- [https://github.com/OP-TEE/optee_os/tree/0919de0f7c79ad35ad3c8ace5f823ad1344b4716](https://github.com/OP-TEE/optee_os/tree/0919de0f7c79ad35ad3c8ace5f823ad1344b4716)
- [https://optee.readthedocs.io/en/4.5.0/architecture/secure_storage.html](https://optee.readthedocs.io/en/4.5.0/architecture/secure_storage.html)
- [https://trustedfirmware-a.readthedocs.io/en/v2.12.0/components/realm-management-extension.html](https://trustedfirmware-a.readthedocs.io/en/v2.12.0/components/realm-management-extension.html)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
