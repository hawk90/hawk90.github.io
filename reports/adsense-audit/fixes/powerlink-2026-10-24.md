# POWERLINK addressing/API and safety boundary repair

No re-score. Evaluation ledger preserved. Scope: Pinned openPOWERLINK V2.7.2 public header/API/demo/license comparison; extracted host wire-floor and prefix decoder, real header layout/synthetic-prefix sanitizer check; IEC public scope comparison.

## Checks and limits

No full stack/driver build, NIC/NMT/PDO exchange or timing. Linux target definition selection only permits host public-header layout check, not Linux platform execution. IEC publication abstract read, not full paid 422-page standard. No openSAFETY wire implementation or safety certification verified. Generic clone gate skipped. No scores changed.

Gate: [powerlink-2026-10-24.gate.log](powerlink-2026-10-24.gate.log).
Execution: [powerlink-2026-10-24.verify.log](powerlink-2026-10-24.verify.log).
Execution: [powerlink-2026-10-24.math.log](powerlink-2026-10-24.math.log).

## Per-article evidence

### `chapter10-powerlink.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink.md
2. **problemSignalAndCounterevidence:** Frozen loop30 found CN1..240 conflicting with MN240. Source also used nonexistent oplk_readPdo/writePdo, wrong build options/license and safety CRC pseudocode/profile conflation plus automatic SIL3/uniqueness/cycle claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Read original353 lines and full frozen loop30 entry. Actual V2.7.2 048650a8 headers, CN demo, target definitions and repository license compared. Article JS extracted: CN1..239 and invalid rates/counts; actual tPlkFrame generates synthetic17B prefix, public headers compiled with Linux target definition selection on host, ASan/UBSan; decoder all truncations/bad type/raw256message values. IEC61784-3-13:2021 public scope limits implementation to safety devices.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Keep basic polling/timing and implementation chapter. Correct CN/MN range, explicit 6.72us and 443.52us lower-bound assumptions, real process-image API and target-specific licensing. Remove fabricated build/CLI/capture, unsupported mode/performance rules and all invented safety wire fields/receiver code. Manually narrow description.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Host verifier, gate, math, scoped diff pass. No motor outputs, stack/driver execution, full frame validity, physical cycle/safety result. No claim to complete licensed standard review. No full stack/driver build, NIC/NMT/PDO exchange or timing. Linux target definition selection only permits host public-header layout check, not Linux platform execution. IEC publication abstract read, not full paid 422-page standard. No openSAFETY wire implementation or safety certification verified. Generic clone gate skipped. No scores changed.

Before SHA-256: `6ddadc492c90803878f782fe8ff712b6e14f597939e36b7df253011ac866f591`. After SHA-256: `139c26f368bf17973e161981108f8a91854c049081f3d0482b729039551434b6`.

Next action: manual-review. With a named target/configuration and real CNs, do NMT/PDO mapping, measured cycle/response and separately assessed safety function satisfy their respective requirements?

## Primary sources

- [https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/tree/048650a80db37fa372330c3a900d2c8edb327e47](https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/tree/048650a80db37fa372330c3a900d2c8edb327e47)
- [https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/blob/048650a80db37fa372330c3a900d2c8edb327e47/license.md](https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2/blob/048650a80db37fa372330c3a900d2c8edb327e47/license.md)
- [https://webstore.iec.ch/en/publication/68897](https://webstore.iec.ch/en/publication/68897)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
