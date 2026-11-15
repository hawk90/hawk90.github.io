# Embedded Security Ch7 scoped repair

No re-score. Evaluation ledger preserved. Scope: Full original and frozen loop23 entry read; selected primary documents and actual pinned host examples checked.

## Checks and limits

Synthetic statistical test only: known leakage model planted in generated data. No physical power/EM/ChipWhisperer capture, target key recovery, timing absence, masking/hiding effectiveness, certification or fault-resistance validation. Generic upstream clone gate skipped, not passed. Frozen evaluation ledgers unchanged.

Gate: [security-side-channel-2026-10-24.gate.log](security-side-channel-2026-10-24.gate.log).
Execution: [security-side-channel-2026-10-24.verify.log](security-side-channel-2026-10-24.verify.log).
Execution: [security-side-channel-2026-10-24.math.log](security-side-channel-2026-10-24.math.log).

## Per-article evidence

### `chapter07-side-channel.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/embedded-security/chapter07-side-channel.md
2. **problemSignalAndCounterevidence:** Original presented overflowing RSA arithmetic as safe, nonexistent capture/model API, unconditional physical defense/certification claims and unsigned CPA ranking.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Extracted article Pearson function executed with algebraic/invalid/constant oracles. Pinned Mbed TLS3.6.4 actual AES S-box generated 512 synthetic samples and 256 candidate models; planted0x2b ranks first for both polarities, r0.998009; one-sample misalignment r0.136416. Sparse inputs now reject. Kocher papers, NewAE Analyzer API and NIST FIPS140-3 scope compared.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Replace fake hardware capture with explicit synthetic statistics, use absolute correlation rank, remove homemade safe-RSA/constant-time code and unsupported certification equivalence. Distinguish passive leakage and fault models.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual Node extracted-code synthetic experiment passed, gate/math/diff passed. Synthetic statistical test only: known leakage model planted in generated data. No physical power/EM/ChipWhisperer capture, target key recovery, timing absence, masking/hiding effectiveness, certification or fault-resistance validation. Generic upstream clone gate skipped, not passed. Frozen evaluation ledgers unchanged.

Before SHA-256: `8d4947575544fcaf30e6889ea2783629b255a9146caf0667576cd4eadd58ebaf`. After SHA-256: `8db70dedd710d660a67b3231c37e3f2c9ff11a0e6bcfddbcafa4c168d32b120b`.

Next action: manual-review. Under independently captured target traces, what leakage model, alignment and success criterion remain valid after compiler and countermeasure changes?

## Primary sources

- [https://www.paulkocher.com/doc/DifferentialPowerAnalysis.pdf](https://www.paulkocher.com/doc/DifferentialPowerAnalysis.pdf)
- [https://www.paulkocher.com/doc/TimingAttacks.pdf](https://www.paulkocher.com/doc/TimingAttacks.pdf)
- [https://chipwhisperer.readthedocs.io/en/latest/analyzer-api.html](https://chipwhisperer.readthedocs.io/en/latest/analyzer-api.html)
- [https://csrc.nist.gov/pubs/fips/140-3/final](https://csrc.nist.gov/pubs/fips/140-3/final)
- [https://github.com/Mbed-TLS/mbedtls/tree/c765c831e5c2a0971410692f92f7a81d6ec65ec2](https://github.com/Mbed-TLS/mbedtls/tree/c765c831e5c2a0971410692f92f7a81d6ec65ec2)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
