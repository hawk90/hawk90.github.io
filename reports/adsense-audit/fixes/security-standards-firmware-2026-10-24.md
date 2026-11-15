# Embedded Security Ch8–9 standards and firmware analysis repair

No re-score. Evaluation ledger preserved. Scope: Full originals and frozen loop24 entries read. Selected official EC/UK/ETSI/NIST/IEC/KISA and upstream tool documents compared; actual extracted C/shell compiled to ARM ELF and strings executed.

## Checks and limits

CRA legal text retrieval was blocked/empty, not claimed read; EC official summary/implementation/manufacturers/conformity/reporting plus downloaded EC FAQ selected4.5/6.2 sections used instead. IEC public scope only, not paid full standards. KISA program search-index scope only; no certificate/grade/legal applicability validation. No physical acquisition, actual binwalk/Ghidra/r2/firmware runtime/network/CVE reproduction. Synthetic object is not bootable firmware. Generic clone gate skipped, not passed. Frozen scores unchanged.

Gate: [security-standards-firmware-2026-10-24.gate.log](security-standards-firmware-2026-10-24.gate.log).
Execution: [security-firmware-analysis-2026-10-24.verify.log](security-firmware-analysis-2026-10-24.verify.log).
Execution: [security-standards-firmware-2026-10-24.math.log](security-standards-firmware-2026-10-24.math.log).

## Per-article evidence

### `chapter08-iot-standards.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/embedded-security/chapter08-iot-standards.md
2. **problemSignalAndCounterevidence:** Original conflicting CRA dates, RED conflation, incorrect I/II/III default/class model, UKPSTI whole-ETSI adoption, unsupported80percent mapping/KCSP/KICS/penalties and universal support/sector dates.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** EC summary establishes Dec10,2024/Jun11,2026/Sep11,2026/Dec11,2027; official reporting distinguishes24/72h and vulnerability14days-after-measure vs incident1month-after-notification. Downloaded EC FAQ4.5/6.2 confirms support exception and ClassII assessment condition. UK government confirms three security requirements and SoC accompanies product. ETSI2.1.1/IEC scope/NIST8259series/8425 compared.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Correct CRA dates, reporting kinds/clocks and support exception; distinguish standard vs law, product/class/system/process scopes, remove unsupported equivalence/cost/grade claims and fictitious SoC. Preserve comparison purpose and requirement/evidence workflow. Manually narrow description to supported scope.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Gate/math/diff pass; primary-document comparison only, no legal conformity assessment or certificate. CRA legal text retrieval was blocked/empty, not claimed read; EC official summary/implementation/manufacturers/conformity/reporting plus downloaded EC FAQ selected4.5/6.2 sections used instead. IEC public scope only, not paid full standards. KISA program search-index scope only; no certificate/grade/legal applicability validation. No physical acquisition, actual binwalk/Ghidra/r2/firmware runtime/network/CVE reproduction. Synthetic object is not bootable firmware. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `622a9a9cc638f2f98924904728d8d0e880fbd8dcae4feb65e00c8f6dbb5631b6`. After SHA-256: `ea60c0b9ff9c9c225a0878471b2557056ced7efc49018cf292cb762181e49e9a`.

Next action: manual-review. For the actual product, market and support period, which dated clauses and assessment route bind each required artifact and operating owner?

### `chapter09-firmware-analysis.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/embedded-security/chapter09-firmware-analysis.md
2. **problemSignalAndCounterevidence:** Original invented UART/flashrom/binwalk/firmwalker/decompiler outputs and CVE discovery history, Cutter/r2 pdc misidentification, source matchers called binary tools, root chroot and generic httpd fuzz example; NDEBUG allegedly removes printf.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** AppleClang21.0.0 compiled exact article C/shell to ELF32LE ARM relocatable; ELF header checked, actual system strings finds planted diagnostic and benign tokenization false positive. Both-g/-g0 NDEBUG variants retain text; independent clean object has no pattern. Official Cutter usesRizin, radare2 pdc vs pdg, Binwalk3Rust, FACT vs Firmadyne docs compared.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Preserve acquisition/static/dynamic investigation intent but replace fake demonstrations with explicit tool-contract descriptions and actual ARM ELF synthetic string fixture. Separate format/secret candidates from exploit proof and emulator/hardware boundaries. Remove unsupported vulnerability attribution/timings.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted C/shell actual compile+strings normal/false-positive/clean cases pass; gate/math/diff pass. No product firmware or tool GUI/runtime validation. CRA legal text retrieval was blocked/empty, not claimed read; EC official summary/implementation/manufacturers/conformity/reporting plus downloaded EC FAQ selected4.5/6.2 sections used instead. IEC public scope only, not paid full standards. KISA program search-index scope only; no certificate/grade/legal applicability validation. No physical acquisition, actual binwalk/Ghidra/r2/firmware runtime/network/CVE reproduction. Synthetic object is not bootable firmware. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `3f3d83dfd2fb1d04684da694f215be27c5995163879a49b4923d878e5564fd8c`. After SHA-256: `d198baedd9426f19c73e7bb41b45ecd3070876129c4fd6553b948e50d31a7177`.

Next action: manual-review. Does each candidate in the actual released image reach a security-relevant use, and can the claim be reproduced on the pinned product/version without emulator assumptions?

## Primary sources

- [https://digital-strategy.ec.europa.eu/en/policies/cra-summary](https://digital-strategy.ec.europa.eu/en/policies/cra-summary)
- [https://digital-strategy.ec.europa.eu/en/policies/cra-reporting](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting)
- [https://digital-strategy.ec.europa.eu/en/policies/cra-conformity-assessment](https://digital-strategy.ec.europa.eu/en/policies/cra-conformity-assessment)
- [https://ec.europa.eu/newsroom/dae/redirection/document/122331](https://ec.europa.eu/newsroom/dae/redirection/document/122331)
- [https://single-market-economy.ec.europa.eu/sectors/electrical-and-electronic-engineering-industries-eei/radio-equipment-directive-red_en](https://single-market-economy.ec.europa.eu/sectors/electrical-and-electronic-engineering-industries-eei/radio-equipment-directive-red_en)
- [https://www.gov.uk/government/publications/the-uk-product-security-and-telecommunications-infrastructure-product-security-regime](https://www.gov.uk/government/publications/the-uk-product-security-and-telecommunications-infrastructure-product-security-regime)
- [https://www.etsi.org/deliver/etsi_en/303600_303699/303645/02.01.01_60/en_303645v020101p.pdf](https://www.etsi.org/deliver/etsi_en/303600_303699/303645/02.01.01_60/en_303645v020101p.pdf)
- [https://www.nist.gov/itl/applied-cybersecurity/nist-cybersecurity-iot-program/nistir-8259-series](https://www.nist.gov/itl/applied-cybersecurity/nist-cybersecurity-iot-program/nistir-8259-series)
- [https://webstore.iec.ch/en/publication/7033](https://webstore.iec.ch/en/publication/7033)
- [https://webstore.iec.ch/en/publication/33615](https://webstore.iec.ch/en/publication/33615)
- [https://webstore.iec.ch/en/publication/34421](https://webstore.iec.ch/en/publication/34421)
- [https://www.kisa.or.kr/1050608](https://www.kisa.or.kr/1050608)
- [https://github.com/ReFirmLabs/binwalk](https://github.com/ReFirmLabs/binwalk)
- [https://github.com/NationalSecurityAgency/ghidra](https://github.com/NationalSecurityAgency/ghidra)
- [https://cutter.re/](https://cutter.re/)
- [https://book.rada.re/arch/decompile.html](https://book.rada.re/arch/decompile.html)
- [https://github.com/fkie-cad/FACT_core](https://github.com/fkie-cad/FACT_core)
- [https://github.com/firmadyne/firmadyne](https://github.com/firmadyne/firmadyne)
- [https://aflplus.plus/docs/fuzzing_in_depth/](https://aflplus.plus/docs/fuzzing_in_depth/)
- [https://www.tenable.com/security/research/tra-2021-13](https://www.tenable.com/security/research/tra-2021-13)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
