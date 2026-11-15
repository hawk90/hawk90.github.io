# CXL io/cache/mem protocol contract repairs

No re-score. Evaluation ledger preserved. Scope: Full originals/loop10 entries, selected CXL3.1 transaction/channel semantics and actual pinned Linux/ndctl/pciutils source. Actual host pciutils build and offline synthetic dump decoding; extracted bounded two-way address mapper.

## Checks and limits

No live PCI access/write, DOE request, physical device/cache/snoop trace, decoder/region configuration, DAX/NUMA mutation or CXL memory performance result. pciutils builds on host with upstream deprecation/format warnings; no install; lspci -F dump backend only. Synthetic config variants test output decoder, not valid complete device profiles. Two-way model excludes multilevel/skip/non-power-of-two ways. Generic clone gate skipped, not passed. Frozen ledgers unchanged.

Gate: [cxl-protocols-2026-10-24.gate.log](cxl-protocols-2026-10-24.gate.log).
Execution: [cxl-protocols-2026-10-24.verify.log](cxl-protocols-2026-10-24.verify.log).
Execution: [cxl-protocols-2026-10-24.math.log](cxl-protocols-2026-10-24.math.log).

## Per-article evidence

### `chapter06-cxl-io.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/cxl/chapter06-cxl-io.md
2. **problemSignalAndCounterevidence:** Loop10 flags mandatory-DVSEC registration assumption,Boutique name,unreproducible fake outputs and wrong recipes number. Actual v6.12 probe warns and proceeds after missing DeviceDVSEC rather than unconditional return.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Original188lines/evaluation read. Actual v6.12 cxl_pci_probe,class050210 and pciutils v3.13.0 7c5bf915 ls-ecaps/header compared. Actual pciutils built and lspci-F generated4096Bdump plus3bit/vendor variants; no physical config access. Output exact key fields checked.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Separate PCIe mechanisms/CXL-specific objects, DeviceID vs DVSECVendor, capability vs enable and management probe vs usable memory. Replace false live output with actual lspci decoding of explicit synthetic fixture, qualify DOE vsMCTP auth and correct crosslink. Add versioned sources/repro verifier.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Offline actual tool verifier,gate/math/diff pass. Device/port negotiation and real DOE discovery remain unmeasured. No live PCI access/write, DOE request, physical device/cache/snoop trace, decoder/region configuration, DAX/NUMA mutation or CXL memory performance result. pciutils builds on host with upstream deprecation/format warnings; no install; lspci -F dump backend only. Synthetic config variants test output decoder, not valid complete device profiles. Two-way model excludes multilevel/skip/non-power-of-two ways. Generic clone gate skipped, not passed. Frozen ledgers unchanged.

Before SHA-256: `29f61e993debb2aef7137945ece4c7c021257e826259cf3a02d784a4bc1dea24`. After SHA-256: `624d8c68b78d17cc95b7acd288a497fa1b7780df120799454a242db573627c0b`.

Next action: manual-review. Which live BDF/driver/config capabilities are enabled, and do real DOE exchanges/memory initialization succeed under declared conditions?

### `chapter07-cxl-cache.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/cxl/chapter07-cxl-cache.md
2. **problemSignalAndCounterevidence:** Loop10 flags RdOwn alwaysModified,unqualified HBM/Type1/output and snoop state uncertainty. Original PCIe alwaysnoncoherent/per-accessDMA and Type2HBM generalizations lack platform scope.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Original194lines/evaluation read. CXL3.1§3.2.1 channels,§3.2.4.2.6–.9RdCurr/RdOwn/RdShared/RdAny and§3.2.4.4SnpData/Inv/Cur read. SnpData can downgradeShared or invalidate and dirty data return is required, so preserved qualified transition. lspci synthetic cache-bit variant verifies print only.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Preserve channel/MESI/snoop chapter; correct RdOwnGO-EorGO-M vs actual write,normal/error read paths,independent response/data and Type2memory scope. Remove fake lspci hardware capture and mandatory64bytepadding promise; separate capability/enable/coherence runtime.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Source semantics review and shared offline tool verifier,gate/math/diff pass; no CXL.cache hardware/analyzer,actualMESIstate or false-sharing benchmark. No live PCI access/write, DOE request, physical device/cache/snoop trace, decoder/region configuration, DAX/NUMA mutation or CXL memory performance result. pciutils builds on host with upstream deprecation/format warnings; no install; lspci -F dump backend only. Synthetic config variants test output decoder, not valid complete device profiles. Two-way model excludes multilevel/skip/non-power-of-two ways. Generic clone gate skipped, not passed. Frozen ledgers unchanged.

Before SHA-256: `d2b71af2d8652ec52e4a2d9cc35612deae48ffe909061fdcb431d9fd80cdf247`. After SHA-256: `2593efa1e4d55d7eb375e526f5cbd6558b68872ac5df29ec758f67836253afa6`.

Next action: manual-review. For a real caching device, what GO/data/snoop trace and application synchronization demonstrate coherent state handling under sharing/errors?

### `chapter08-cxl-mem.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/cxl/chapter08-cxl-mem.md
2. **problemSignalAndCounterevidence:** Loop10 flags opcode/host routing/rootgranularity/performance scope. Original instruction-to-transaction and Cmp-to-retirement implication,allrandom/smallvssequential/large rule and live region/DAX recipes overstate safe universal behavior.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Original213lines/evaluation read. CXL3.1§3.3NDRTable3-50 confirmsCmp-M optionalhostsupport/disable; actualLinux/ndctlv80constraints read. Extractedmapper65536inversechecks,table/endboundary,above2^53andinvalidranges/granularity/type verified. SunXeonGold6430Linux6.2three-device scope read in priorHBMreview.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Separate CPU cache/store retirement from protocol messages/completion/durability; qualify NDR/DRS and optionalCmp-M. Add exact bounded two-way HPA-DPA mapper and remove blanketgranularityadvice. Replace mutations/fakeNUMAoutput with readonlyobservations and versionedram/pmemvsDAX/SystemRAM discussion;boundSunresearch.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Host mapper+offline decoder,gate/math/diff pass. No actualHDM programming,region/DAXmodechanges or physicalmemory access; mapping model is explicitly narrower than silicon implementation. No live PCI access/write, DOE request, physical device/cache/snoop trace, decoder/region configuration, DAX/NUMA mutation or CXL memory performance result. pciutils builds on host with upstream deprecation/format warnings; no install; lspci -F dump backend only. Synthetic config variants test output decoder, not valid complete device profiles. Two-way model excludes multilevel/skip/non-power-of-two ways. Generic clone gate skipped, not passed. Frozen ledgers unchanged.

Before SHA-256: `54340563117546e1ba29dd20b882746c7ade35bb6bd98380c3b9c7c954319588`. After SHA-256: `66592a6c3346bdc76be984e464a6e233715d4082d505476d310d075831789953`.

Next action: manual-review. For an actual multilevel decoder path, what HPA-DPA mapping,root/endpoint constraints and measured valid-load/write completion semantics apply?

## Primary sources

- [https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)
- [https://github.com/pciutils/pciutils/tree/7c5bf915f87d8e4c62be66275c8e73a5f03fa5ee](https://github.com/pciutils/pciutils/tree/7c5bf915f87d8e4c62be66275c8e73a5f03fa5ee)
- [https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/pci.c](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/pci.c)
- [https://github.com/pmem/ndctl/blob/04815e5f8b87e02a4fb5a61aeebaa5cad25a15c3/Documentation/cxl/cxl-create-region.txt](https://github.com/pmem/ndctl/blob/04815e5f8b87e02a4fb5a61aeebaa5cad25a15c3/Documentation/cxl/cxl-create-region.txt)
- [https://tianyin.github.io/pub/cxl-mem.pdf](https://tianyin.github.io/pub/cxl-mem.pdf)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
