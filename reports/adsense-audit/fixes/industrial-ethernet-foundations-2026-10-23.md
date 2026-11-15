# Industrial Ethernet timing and EtherCAT frame repairs — 2026-10-23

No re-score. Evaluation ledger preserved. Scope: Four full chapters and loop29 evaluations read. Primary implementation/doc comparisons plus unchanged extracted actual SOEM packet writers and article parser/timestamp helpers tested.

## Checks and limits

No physical NIC/slave/control equipment, packet send/capture, clock adjustment, PTP/DC accuracy, real deadline/jitter, WKC reply, drive operation, firmware update or functional safety/conformance test. Actual SOEM packet writers use actual headers and minimal synthetic port-length storage, not NIC backend. Generic upstream clone gate skipped, not passed; pinned temporary source checks are separate.

Gate: [industrial-ethernet-foundations-2026-10-23-gate.log](industrial-ethernet-foundations-2026-10-23-gate.log).
Execution: [industrial-ethernet-foundations-2026-10-23.log](industrial-ethernet-foundations-2026-10-23.log).

## Per-article evidence

### `chapter01-overview.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/protocols/industrial-ethernet/chapter01-overview.md
2. **problemSignalAndCounterevidence:** Unattributed factory/ping measurements, safety response and fixed TCP timeout; 64B×32/250us labelled8Mbps; incomplete6-of12 roadmap and incorrect linked chapter number.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Direct dimensional arithmetic and pinned SOEM packet/communication implementation; primary linuxptp documentation distinguishes synchronization from host/network scheduling.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Removed unverified site-specific measurements and guarantees; replaced traffic example with explicit hypothetical65.536/204.8Mbps payload budget, separated wire overhead and deadlines; completed roadmap and corrected link descriptions.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Payload rates independently recomputed; four-chapter gate and math checks pass. No factory, network timing or functional-safety test. No physical NIC/slave/control equipment, packet send/capture, clock adjustment, PTP/DC accuracy, real deadline/jitter, WKC reply, drive operation, firmware update or functional safety/conformance test. Actual SOEM packet writers use actual headers and minimal synthetic port-length storage, not NIC backend. Generic upstream clone gate skipped, not passed; pinned temporary source checks are separate.

Before SHA-256: `03a52ca04cb7cc0ff45ebf148b3afc668ec8e10b213d55f3b5e8e96ca6f3d2b6`. After SHA-256: `fdb5f2fa5eb7454fda9bd97c80d06359b5bfbfb5b6cc7fa7e591c63c7b562020`.

Next action: manual-review. Which actual topology, devices, traffic, cycle/deadline definitions and measured worst-case budgets establish this installation requirement?

### `chapter02-realtime-requirements.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements.md
2. **problemSignalAndCounterevidence:** Timeconstant1/10 rule contradicted1/4 example and Nyquist; percentile equated with worstcase; invented timing/ethtool/PTP output; hardware/RT/PTP guarantees and incorrect DC initialization procedure.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Actual pinned SOEM ethercatdc.c/ethercatmain.c; official linuxptp ptp4l options, software/hardware timestamp and asymmetry contracts; algebra stated assumptions.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Removed unsupported cycle recommendations and measurement transcripts; separated percentile/bounds, fixed latency vs jitter and clock domains; added exact BigInt four-timestamp calculator with asymmetry caveat; actual SOEM DC latch/read/delay/offset/FRMW flow cited.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Extracted timestamp calculator tested symmetric/asymmetric cases, large epoch and invalid sequences; no timestamp/PHC adjustment, actual synchronization accuracy or external reference measurements. No physical NIC/slave/control equipment, packet send/capture, clock adjustment, PTP/DC accuracy, real deadline/jitter, WKC reply, drive operation, firmware update or functional safety/conformance test. Actual SOEM packet writers use actual headers and minimal synthetic port-length storage, not NIC backend. Generic upstream clone gate skipped, not passed; pinned temporary source checks are separate.

Before SHA-256: `5b3c10e4811eff136e0a355ab250826c10b4ba8ccf8083f356bfb4fc029bd955`. After SHA-256: `ced93b588d99008d58e0b289059f88f37cea469d447cb129f85879a4dfbbc577`.

Next action: manual-review. Which profile, clock domains, correction/asymmetry model and hardware event measurements establish slave synchronization and deadline margins separately?

### `chapter03-ethercat-architecture.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture.md
2. **problemSignalAndCounterevidence:** Loopback called electrical termination; cycle equated with frame RTT; false ESC binary compatibility/resources, always-fresh SM, wrong BWR/DC sequence and unverified license/membership/company claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Microchip AN1907C migration guide, Beckhoff ET1100 datasheet v2i1, pinned SOEM DC/type/frame implementation.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected loopback/cycle distinction; sourced ET1100/LAN9252 resource differences, removed blanket compatibility and adoption/fee assertions; distinguished buffered consistency from freshness; actual pinned DC initialization/periodic flow and optional application/state limits.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual command enums/header sizes compiled in ASan/UBSan fixture; DC source flow compared. No ESC hardware/PDI/SM/state/clock or conformance test. No physical NIC/slave/control equipment, packet send/capture, clock adjustment, PTP/DC accuracy, real deadline/jitter, WKC reply, drive operation, firmware update or functional safety/conformance test. Actual SOEM packet writers use actual headers and minimal synthetic port-length storage, not NIC backend. Generic upstream clone gate skipped, not passed; pinned temporary source checks are separate.

Before SHA-256: `dba618b86d8177892213a8e0c55bf3446040ed29fbe97627d4e6d4502b930aa8`. After SHA-256: `04f35d7a103c8fb9eab27cd37a7f419f01f6e1eb9b21dfa19df3777bc8576a78`.

Next action: manual-review. Which selected ESC/PDI/SM/FMMU configuration, application ownership and measured event timing establish consistency, freshness and safe state transitions?

### `chapter04-ethercat-frame.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame.md
2. **problemSignalAndCounterevidence:** Incorrect FPWR/BWR/LRD/LWR command values and IRQ/M fields; WKC interpreted as failed-slave count; broken fabricated capture offsets; wrong mailbox header, unconditional Controlword enable/FoE state/chunk/eof and mailbox no-cycle-impact claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Actual SOEM v1.4.0 ethercattype.h/ethercatbase.c/ethercatcoe.c/ethercatfoe.c, synthetic-only fixtures and original protocol scope.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected enum and weighted WKC interpretation; replaced capture with exact synthetic44-byte LRW plus bounded parser, checked against actual SOEM writer; fixed12-byte datagram overhead/1486 payload,6-byte mailbox header and synthetic SDO; sourced segmentation/zero-final FoE and runtime/drive-state conditions.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Unchanged actual upstream packet writers with real headers and a minimal port-length fixture compiled ASan/UBSan. Article hex equals writer; single/two datagrams, all truncations, wrong type/reserved/length/M, padding and copied-data lifetime pass. No physical transmit/response/WKC, CoE drive operation, FoE update or wire capture. No physical NIC/slave/control equipment, packet send/capture, clock adjustment, PTP/DC accuracy, real deadline/jitter, WKC reply, drive operation, firmware update or functional safety/conformance test. Actual SOEM packet writers use actual headers and minimal synthetic port-length storage, not NIC backend. Generic upstream clone gate skipped, not passed; pinned temporary source checks are separate.

Before SHA-256: `cfb77139a7a1f7d70220ca41be67b3cc8883cae3ba997c5f151df601b36dde4e`. After SHA-256: `0f1e35e22335fa01fb56651b033e3b2f03e3f591e30c8dcb0616b31d381adda5`.

Next action: manual-review. Which actual capture/VLAN/FCS settings and configured mappings/state/WKC increments establish application semantics and mailbox/periodic scheduling behavior?

## Primary sources

- [https://github.com/OpenEtherCATsociety/SOEM/tree/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd](https://github.com/OpenEtherCATsociety/SOEM/tree/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd)
- [https://www.linuxptp.org/documentation/ptp4l/](https://www.linuxptp.org/documentation/ptp4l/)
- [https://www.microchip.com/content/dam/mchp/documents/OTH/ApplicationNotes/ApplicationNotes/00001907C.pdf](https://www.microchip.com/content/dam/mchp/documents/OTH/ApplicationNotes/ApplicationNotes/00001907C.pdf)
- [https://download.beckhoff.com/download/document/io/ethercat-development-products/ethercat_et1100_datasheet_v2i1.pdf](https://download.beckhoff.com/download/document/io/ethercat-development-products/ethercat_et1100_datasheet_v2i1.pdf)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
