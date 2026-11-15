# SOEM master API and configuration repair — 2026-10-23

No re-score. Evaluation ledger preserved. Scope: Full chapter05 and loop29 evaluation read; actual SOEM v1.4.0 source/license, EtherLab1.6 application contracts reviewed. Actual SOEM macOS library built and adapter enumeration executed; real headers plus synthetic error/lifetime cases tested.

## Checks and limits

Actual host adapter enumeration only, exit0. No ec_init/config_init, physical slave discovery, OP/SAFE_OP/mapping/state/output changes, frame transmission, WKC replies, RT/clock/IgH/TwinCAT runtime or real XML schema validation. C unit fixtures use actual API headers with explicit synthetic adapter backend. No system installation or module/driver setup.

Gate: [industrial-ethernet-master-2026-10-23-gate.log](industrial-ethernet-master-2026-10-23-gate.log).
Execution: [industrial-ethernet-master-2026-10-23.log](industrial-ethernet-master-2026-10-23.log).

## Per-article evidence

### `chapter05-ethercat-master.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master.md
2. **problemSignalAndCounterevidence:** Nonexistent ec_group.expectedWKC, GPLv2-exception source labelled BSD, unbounded4096B map and fabricated OP log, 40×50ms labelled200ms, WKC1/3 calledhalf, ENI/XML/SII byte-word confusion and fixed driver/timing/price/market claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Pinned SOEM v1.4.0 actual headers/LICENSE/simple_test/ethercatmain/type/config/DC; actual full macOS library build. EtherLab official1.6 API docs.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Manually narrowed title/description to tested API/configuration scope. Replaced unverified full OP loop with complete adapter list and real-type WKC helpers; pinned build/license, removed fabricated output/XML and module installation recipe, clarified SII word offsets, optional driver/config/import boundaries and source-reviewed periodicFRMW.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Real library built and unchanged adapter program linked/executed exit0 (names omitted). Real headers plus explicit fake adapter backend tested null-list/two-node allocation/free ASan/UBSan. WKC0/3/196605/null and SII0x10/0x14/0x18 offsets pass. Gate/math/diff pass; no physical master protocol run. Actual host adapter enumeration only, exit0. No ec_init/config_init, physical slave discovery, OP/SAFE_OP/mapping/state/output changes, frame transmission, WKC replies, RT/clock/IgH/TwinCAT runtime or real XML schema validation. C unit fixtures use actual API headers with explicit synthetic adapter backend. No system installation or module/driver setup.

Before SHA-256: `d4c9dc82dbec5d1ded58a751b7ba3f2e34c0beedebce0d68d5eedc3034fcfcfe`. After SHA-256: `f7e9569f8e1744bbdd7490258c25d847812e58237e6dc7fe308e4c5350190640`.

Next action: manual-review. Which exact slave/PDO/ESI/SII topology and bounded IOmap allocation, output initialization/state/WKC/error recovery and repeated RT measurements establish a complete target master?

## Primary sources

- [https://github.com/OpenEtherCATsociety/SOEM/tree/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd](https://github.com/OpenEtherCATsociety/SOEM/tree/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd)
- [https://www.linuxptp.org/documentation/ptp4l/](https://www.linuxptp.org/documentation/ptp4l/)
- [https://www.microchip.com/content/dam/mchp/documents/OTH/ApplicationNotes/ApplicationNotes/00001907C.pdf](https://www.microchip.com/content/dam/mchp/documents/OTH/ApplicationNotes/ApplicationNotes/00001907C.pdf)
- [https://download.beckhoff.com/download/document/io/ethercat-development-products/ethercat_et1100_datasheet_v2i1.pdf](https://download.beckhoff.com/download/document/io/ethercat-development-products/ethercat_et1100_datasheet_v2i1.pdf)
- [https://docs.etherlab.org/ethercat/1.6/doxygen/group__ApplicationInterface.html](https://docs.etherlab.org/ethercat/1.6/doxygen/group__ApplicationInterface.html)
- [https://etherlab.org/en_GB/ethercat](https://etherlab.org/en_GB/ethercat)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
