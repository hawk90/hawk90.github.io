# CXL Ch13–15 scoped repair

No re-score. Evaluation ledger preserved. Scope: Full originals/frozen entries, selected primary specification sections and pinned implementation paths reviewed. No synthetic protocol test claimed as runtime.

## Checks and limits

Specification/source comparison and static checks only. Hardware, cryptographic protocol, fabric ownership, OS memory online/offline, error recovery and performance follow-ups remain open. Generic clone gate skipped, not passed. Frozen scores unchanged.

Gate: [cxl-fabric-security-ras-2026-10-24.gate.log](cxl-fabric-security-ras-2026-10-24.gate.log).
Execution: [cxl-fabric-security-ras-2026-10-24.math.log](cxl-fabric-security-ras-2026-10-24.math.log).

## Per-article evidence

### `chapter13-switching-fabric.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/cxl/chapter13-switching-fabric.md
2. **problemSignalAndCounterevidence:** Loop10 highlighted duplication and unclear protocol version. Original equated PID space with fabric size and left bind/DC event completion too close to usable host memory.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Full chapter and frozen entry read. CXL3.1 selected sections 7.6.1/2, bind/unbind 5201/5202, DC add/release 5604/5605/4803 and 7.7.5.1 compared. DMTF DSP0234 1.0.0 scope/encapsulation and DSP0236 1.3.1 identification confirmed. Spec explicitly gives tree/fat-tree example; physical mesh is not forbidden.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Preserve separate control-plane role. Pin CXL3.1 and DMTF bindings, clarify existing FM API versus 3.1 extensions, PID encoding limits and channel dependencies. Add state/evidence matrix for partial failure and memory ownership; distinguish extent acceptance from online.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Static gates, math and diff pass. No FM transport, bind/unbind, OS hotplug, capacity acceptance or safe memory return executed. Specification/source comparison and static checks only. Hardware, cryptographic protocol, fabric ownership, OS memory online/offline, error recovery and performance follow-ups remain open. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `9a5b37f2dd8bcf5f0180579665c96dbc98531a33583b7379eaf71f629f041b65`. After SHA-256: `8811fb19c363d2875812fc5ff860454f789f27bcdbef849ef4308ee73b26cea8`.

Next action: manual-review. Which device and host observations prove matching ownership after timeout or rejected active-memory release?

### `chapter14-security.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/cxl/chapter14-security.md
2. **problemSignalAndCounterevidence:** Loop11 left IDE counts, protection fields, SPDM references and automatic ERROR transition uncertain; future Linux7.3 support claims were not established in this run.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Full chapter and frozen loop11 entry read. CXL3.1 11.3 fields/CRC order/PCRC, 11.3.5 counts 5/2 and128/32, 11.5.2/11.5.3.2 SPDM1.2+, 11.5.4.8 automatic unlock only after secure-session/data cleanup confirmed. DSP0274 1.2.3 section7 identity/trusted anchor/measurement/session reviewed.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Keep protocol boundary chapter. Verify actual normative details, remove unverified latest OS support table, add identity/measurement/session/IDE/TSP evidence and failure matrix, qualify Skid timing and post-cleanup state transition.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Static gates, math and diff pass. No cryptographic conformance, certificate validation, IDE stream activation, TSP lock/reset or attack execution. Specification/source comparison and static checks only. Hardware, cryptographic protocol, fabric ownership, OS memory online/offline, error recovery and performance follow-ups remain open. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `527255b82b119d4513abad1dd5c0da61623d59361371e5e1691c05334ee9f64c`. After SHA-256: `3f6c2a5187c3478bf08db507b8836d47c7c90d91417e20fe103cd12438af4ad3`.

Next action: manual-review. On a declared platform, what evidence proves trust-policy approval, active protected streams and access denial plus cleanup after transport-security failure?

### `chapter15-ras-performance.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/cxl/chapter15-ras-performance.md
2. **problemSignalAndCounterevidence:** Loop11 left bandwidth direction, trace symbol locations, efficiency scope and current implementation absence uncertain. Original mixed future trace symbols and compliance counts with runtime expectations.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Full chapter and frozen loop11 entry read. Actual cxlmem.h constants and trace.h events compared. CXL3.1 Tables12-1,13-1/2 and8-213 plus Late Poison selected clauses reviewed. Raw arithmetic 16/32/64GT x16 /8=32/64/128GB per direction; spec efficiency is estimate, targets sequential idle pin-to-pin with IDE off. ndctl80 list/monitor docs compared.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Pin Linux6.12/ndctl80 and CXL3.1. Remove absent memory_sparing trace name and unverified latest CHMU statements; define poison request versus global bound, optional CVME granularities, one-way nominal bandwidth and exact idle target conditions. Replace catalog counts and unexecuted bpftrace example with evidence interpretation and missing/overflow counter handling.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Static gates, math and diff pass. No actual health collection, error injection, recovery, media testing, performance measurement or compliance execution. Specification/source comparison and static checks only. Hardware, cryptographic protocol, fabric ownership, OS memory online/offline, error recovery and performance follow-ups remain open. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `5af62ae0c7e959e3d4ee2478a9cf51943fd1d2adac0353ee545ef41b0a6ce432`. After SHA-256: `6cf5eba4c859cee476f5510ddd2fae6be3d427b1d446ebf07b6442de0fdab77b`.

Next action: manual-review. For fixed device/firmware/kernel, what complete time-window and workload observations distinguish log loss, corrected errors, recovery and measured tail latency?

## Primary sources

- [https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)
- [https://www.dmtf.org/sites/default/files/standards/documents/DSP0234_1.0.0.pdf](https://www.dmtf.org/sites/default/files/standards/documents/DSP0234_1.0.0.pdf)
- [https://www.dmtf.org/sites/default/files/standards/documents/DSP0274_1.2.3.pdf](https://www.dmtf.org/sites/default/files/standards/documents/DSP0274_1.2.3.pdf)
- [https://github.com/torvalds/linux/tree/adc218676eef25575469234709c2d87185ca223a/drivers/cxl](https://github.com/torvalds/linux/tree/adc218676eef25575469234709c2d87185ca223a/drivers/cxl)
- [https://github.com/pmem/ndctl/tree/v80/Documentation/cxl](https://github.com/pmem/ndctl/tree/v80/Documentation/cxl)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
