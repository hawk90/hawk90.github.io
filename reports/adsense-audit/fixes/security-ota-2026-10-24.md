# Embedded Security Ch6 scoped repair

No re-score. Evaluation ledger preserved. Scope: Full original and frozen loop23 entry read; selected primary documents and actual pinned host examples checked.

## Checks and limits

No MCUboot target build, boot, physical flash, secure-counter backend, OTA server, recovery/watchdog or power-cut testing. Payload is a synthetic host fixture, not executable firmware. Generic upstream clone gate skipped, not passed. Frozen evaluation ledgers unchanged.

Gate: [security-ota-2026-10-24.gate.log](security-ota-2026-10-24.gate.log).
Execution: [security-ota-2026-10-24.verify.log](security-ota-2026-10-24.verify.log).
Execution: [security-ota-2026-10-24.math.log](security-ota-2026-10-24.math.log).

## Per-article evidence

### `chapter06-ota-update.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/embedded-security/chapter06-ota-update.md
2. **problemSignalAndCounterevidence:** Original combined signature, hashes, antirollback and recovery, used unverified image format/tool snippets and universal timers.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Pinned MCUboot v2.1.0 imgtool signed a non-executable synthetic payload with disposable keys. Five changed payload/counter/signature/magic/wrong-key cases rejected; correctly signed lower counter passed host verification. Exact article command executed and TLV layout parsed. SWUpdate2024.12 documentation establishes cpio plus signed sw-description and per-image hashes.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Correct protected/normal TLV and algorithms, distinguish key-based authenticity from hash-only verification, device rollback policy and power-loss recovery; remove non-executable product commands.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual host imgtool CLI and format/negative tests passed, gate/math/diff passed. No MCUboot target build, boot, physical flash, secure-counter backend, OTA server, recovery/watchdog or power-cut testing. Payload is a synthetic host fixture, not executable firmware. Generic upstream clone gate skipped, not passed. Frozen evaluation ledgers unchanged.

Before SHA-256: `8ce715097ec920d4e2ed06e721969ecf4726bc6c076bd1fcf9efb09112e29636`. After SHA-256: `3a598596721ce76542ecedce224b5d36bb9efa59c741da0ff4f0d36522b1814e`.

Next action: manual-review. Does device-side counter commitment preserve the required signed fallback under reset at each swap/confirmation step?

## Primary sources

- [https://github.com/mcu-tools/mcuboot/tree/9c99326b9756dbcc35b524636d99ed5f3e6cb29b](https://github.com/mcu-tools/mcuboot/tree/9c99326b9756dbcc35b524636d99ed5f3e6cb29b)
- [https://sbabic.github.io/swupdate/2024.12/swupdate.html](https://sbabic.github.io/swupdate/2024.12/swupdate.html)
- [https://sbabic.github.io/swupdate/2024.12/signed_images.html](https://sbabic.github.io/swupdate/2024.12/signed_images.html)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
