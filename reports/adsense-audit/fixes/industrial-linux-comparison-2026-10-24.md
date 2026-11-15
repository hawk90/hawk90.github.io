# Industrial Linux timing and final selection repair

No re-score. Evaluation ledger preserved. Scope: Full chapter/evaluation review, primary versioned kernel and actual rt-tests parser comparison; extracted C overrun-policy arithmetic with sanitizers; ODVA/Sercos/PI/IEEE/IEC scope review and static article gates.

## Checks and limits

No Linux/RT kernel or rt-tests build/run, scheduling/affinity/mlock/boot/IRQ/NIC changes, physical EtherCAT exchange, actual IgH build, end-to-end timing, product selection benchmark, factory adoption survey or safety certification. Selection matrix is hypothetical. Generic clone checks skipped, not passed; frozen score ledgers unchanged.

Gate: [industrial-linux-comparison-2026-10-24.gate.log](industrial-linux-comparison-2026-10-24.gate.log).
Execution: [industrial-linux-2026-10-24.verify.log](industrial-linux-2026-10-24.verify.log).
Execution: [industrial-linux-comparison-2026-10-24.math.log](industrial-linux-comparison-2026-10-24.math.log).

## Per-article evidence

### `chapter11-linux-realtime.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime.md
2. **problemSignalAndCounterevidence:** Frozen loop30 confirmed 200000x250us count vs1h/14400000 inconsistency. Source fabricated observed cyclictest logs/universal50us production threshold, obsolete -n and unsupported fixed kernel/NIC prescriptions, undefined full IgH loop and ec_master_open API.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Full original426 lines and loop30 entry read. Kernel6.12 lock/selected parameter docs and IgH1.6.13 ecrt declarations read. Actual pinned rt-tests v2.6 commit217cd851 options checked, -n absent in parser. Extracted article C checked against iterative reference for100100 cases plus null/alias/overflow/exact boundary/time order ASan/UBSan. Shell bash-n only;50s vs1h arithmetic checked.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Retain industrial operation focus. Separate scheduling/app/driver/wire/IO timing; remove fake results and blanket dangerous boot/NIC changes; qualify RT/isolation/IRQ/mlock assumptions; provide current actual cyclictest count/duration syntax, overflow-safe explicit skipped-release arithmetic and correct IgH lifecycle table. Manually narrow description and fix IRQ cross-link label.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Host verification, publish gate, inline math and scoped diff pass. No cyclictest output or target latency claim; arithmetic cannot establish controller overrun/safety policy. No Linux/RT kernel or rt-tests build/run, scheduling/affinity/mlock/boot/IRQ/NIC changes, physical EtherCAT exchange, actual IgH build, end-to-end timing, product selection benchmark, factory adoption survey or safety certification. Selection matrix is hypothetical. Generic clone checks skipped, not passed; frozen score ledgers unchanged.

Before SHA-256: `36127f91e0894b04d023f5737b67e83a23b7b7ff99c6dcb67ad98533ce2bb5d5`. After SHA-256: `2d233cdcbfa1576c41350f8665ee22bdf7b4d1b7f15e1de49c6042c125ae46ae`.

Next action: manual-review. For a pinned target/app/IRQ topology, what are measured end-to-end deadline misses and valid-data age under representative load and recovery?

### `chapter12-comparison.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/protocols/industrial-ethernet/chapter12-comparison.md
2. **problemSignalAndCounterevidence:** Frozen loop30 found unsupported real factories/pilots/market/price/SIL claims and wrong IRQ link/draft aviation certification recommendation. Source conflated TSN with full IO protocol,clock sync with motion,availability with safety and guaranteed allSIL3equivalence.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Full original336 lines and loop30 entry read. ODVA actual CIP Motion/Sync service scopes, Sercos real-time channel, prior PI/IEEE class/profile evidence and IEC61784-3-13 public scope compared. No vendor selection/benchmark pretended. Internal links preserve public series and use actual target topics.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Retain series synthesis as evidence-based requirements/selection article. Remove unsourced factory adoption/cost/mincycle/jitter/market claims and predicted replacement timeline. Introduce explicitly hypothetical requirements and A/B/C evidence matrix separating failure,unknown,configuration acceptance and measured result. Separate safety/security/availability and remove misleading aviation SIL3 recommendation. Manually narrow description.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Publish gate, inline math and scoped diff pass. Editorial/primary-source review only; no invented product/factory field evidence or safety conclusions. No executable article code added, so no mirrored artificial tests. No Linux/RT kernel or rt-tests build/run, scheduling/affinity/mlock/boot/IRQ/NIC changes, physical EtherCAT exchange, actual IgH build, end-to-end timing, product selection benchmark, factory adoption survey or safety certification. Selection matrix is hypothetical. Generic clone checks skipped, not passed; frozen score ledgers unchanged.

Before SHA-256: `a847a40d211e7ffae3057489e895bc4bcb6ec219bcbae99499ee6ae93fe68983`. After SHA-256: `4ffa33feb2963448181a0a34a773df4a802b405fdf53432c1389111915cf6d05`.

Next action: manual-review. For an actual project, which named product/version combinations satisfy mandatory requirements with comparable measured evidence and lifecycle cost?

## Primary sources

- [https://kernel.org/doc/html/v6.12/locking/locktypes.html](https://kernel.org/doc/html/v6.12/locking/locktypes.html)
- [https://docs.kernel.org/6.12/admin-guide/kernel-parameters.html](https://docs.kernel.org/6.12/admin-guide/kernel-parameters.html)
- [https://git.kernel.org/pub/scm/utils/rt-tests/rt-tests.git/tree/src/cyclictest/cyclictest.c?h=v2.6](https://git.kernel.org/pub/scm/utils/rt-tests/rt-tests.git/tree/src/cyclictest/cyclictest.c?h=v2.6)
- [https://docs.etherlab.org/ethercat/1.6/doxygen/ecrt_8h.html](https://docs.etherlab.org/ethercat/1.6/doxygen/ecrt_8h.html)
- [https://www.odva.org/technology-standards/distinct-cip-services/cip-motion/](https://www.odva.org/technology-standards/distinct-cip-services/cip-motion/)
- [https://www.odva.org/technology-standards/distinct-cip-services/cip-sync/](https://www.odva.org/technology-standards/distinct-cip-services/cip-sync/)
- [https://www.sercos.org/technology/functions-and-features/real-time-channel/](https://www.sercos.org/technology/functions-and-features/real-time-channel/)
- [https://www.profinet.com/community/faq](https://www.profinet.com/community/faq)
- [https://1.ieee802.org/tsn/](https://1.ieee802.org/tsn/)
- [https://webstore.iec.ch/en/publication/68897](https://webstore.iec.ch/en/publication/68897)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
