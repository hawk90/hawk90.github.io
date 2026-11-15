# Embedded Security Ch13 device lifecycle evidence repair

No re-score. Evaluation ledger preserved. Scope: Full original and frozen loop24 entry read. Selected CXL3.1scope/threat/session/state clauses and Linux7.0PCI ABI compared; no target runtime.

## Checks and limits

Document review only. No actual TSM platform/TVM/TDISP/TSP device, sysfs connect/bind, firmware, SPDM/IDE traffic, reset/cleanup or tenant reuse validation. Linux7.0ABI scope only; later-driver unique implementation or absence claims not certified. Attempted Linux7.3 sparse clone is not treated as passed source/runtime evidence. Generic gate clone checks skipped, not passed. Frozen scores unchanged.

Gate: [security-tee-lifecycle-2026-10-24.gate.log](security-tee-lifecycle-2026-10-24.gate.log).
Execution: [security-tee-lifecycle-2026-10-24.math.log](security-tee-lifecycle-2026-10-24.math.log).

## Per-article evidence

### `chapter13-cxl-tee.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/embedded-security/chapter13-cxl-tee.md
2. **problemSignalAndCounterevidence:** Original unpinned current/unique Linuxdriver claims and fullstackguarantee, bound state couldbeERROR butreadasattachsuccess, TSP SPDMrequirementsectionmismatch, pooling/sharing scope notclear, fakeclassoutput/mutatingcommandsunrun andwrongCh151/HBMTEElinks.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Linux7.0ABIexplicitlyconditions tsmdir anddriverreadiness;connectreadsemptyorTSMname;boundincludesLOCKED/RUN/ERROR and VFIO/IOMMUFDinitiatedbind. CXL3.1 11.5.2includesdirectType3HDMH256Bpooling,butexcludesswitch/PBR68B/sharing;11.5.4.8ERRORcontinuestoprotectTVMdata/stopsfutureTEEtransactions/autounlocksaftercleanup.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** PinLinux7.0ABIreviewandCXL3.1selectedclauses; separate TDISP connect/bind/state fromTSPmemoryprotection. Addconditionsandnegativeevidenceplan, correctSPDMscopepointer/poolingvsconcurrentsharing and cleanup-before-reuse. Removeunverifiedlatest/uniqueimplementationguarantees and fakeoutput, correctlinks/order.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Gate/math/scoped diff pass; per-scenario expected evidence labelled unexecuted, no hardware claim. Document review only. No actual TSM platform/TVM/TDISP/TSP device, sysfs connect/bind, firmware, SPDM/IDE traffic, reset/cleanup or tenant reuse validation. Linux7.0ABI scope only; later-driver unique implementation or absence claims not certified. Attempted Linux7.3 sparse clone is not treated as passed source/runtime evidence. Generic gate clone checks skipped, not passed. Frozen scores unchanged.

Before SHA-256: `6cc8edf7a85a95c5596651d2001fbe64008d98ba22d5a32ae4775c5a6c4f3349`. After SHA-256: `cb356d0d4cbca7acfe5d325932875e3614ce6f96fa73c7fc890668de4955d96d`.

Next action: manual-review. On the pinned Type3/platform stack, do failed authentication, partial lock, transport failure and reset preserve ownership/data until session/key/TVM cleanup completes before reassignment?

## Primary sources

- [https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)
- [https://github.com/torvalds/linux/blob/v7.0/Documentation/ABI/testing/sysfs-bus-pci](https://github.com/torvalds/linux/blob/v7.0/Documentation/ABI/testing/sysfs-bus-pci)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
