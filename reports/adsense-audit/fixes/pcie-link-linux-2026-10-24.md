# PCIe link and Linux lifecycle repair

No re-score. Evaluation ledger preserved. Scope: Full original chapters and frozen loop33 entries read; PCI-SIG public Flit/FAQ, AMD PG239, actual Linux6.12 headers/driver and pciutils3.13 output implementation compared. Static checks only.

## Checks and limits

No physical PCI access, setpci, MMIO, IRQ/interrupt-remapping, kernel build/load, live VF allocation, reset/DPC/AER injection, power or performance validation. Host structures/allocators do not validate kernel ABI, locks or hardware. Generic clone gate skipped, not passed. Frozen scores unchanged.

Gate: [pcie-link-linux-2026-10-24.gate.log](pcie-link-linux-2026-10-24.gate.log).
Execution: [pcie-link-linux-2026-10-24.math.log](pcie-link-linux-2026-10-24.math.log).

## Per-article evidence

### `chapter08-dllp.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/pcie/chapter08-dllp.md
2. **problemSignalAndCounterevidence:** Wrong Replay Rollover UE classification, universal framing and same-flit/deterministic claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Actual pci_regs.h correctable status and PCI-SIG public Flit article compared; original/frozen full read. No encoder/CRC/replay execution.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Separate Non-Flit wrapper from Flit packing/DLP, correct correctable error and 236+6+8+6 layout, qualify credit/QoS, mode negotiation, AER status versus counters, remove unsupported buffer sizes.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Blocking gates, inline math and scoped diff pass. Document/source comparison only; no target execution. No physical PCI access, setpci, MMIO, IRQ/interrupt-remapping, kernel build/load, live VF allocation, reset/DPC/AER injection, power or performance validation. Host structures/allocators do not validate kernel ABI, locks or hardware. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `fa1cdf43913fe1221ee463c8102587437301c8def98f3ec449edbaaf2a9fc2bb`. After SHA-256: `d0952e600d6bd61ff2098a839270d6a0b8a371a4bfa5b842fcd59832535a4161`.

Next action: manual-review. Which actual platform observations distinguish negotiated link or lifecycle state from a static capability/configuration listing?

### `chapter09-physical-layer.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/pcie/chapter09-physical-layer.md
2. **problemSignalAndCounterevidence:** Partial mixed-level LTSSM list claimed all11, fabricated LnkSta RT recovery counter and universal TS/EQ/latency/encoding claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Actual pciutils3.13 Link Status prints Speed/Width/TrErr/Train/etc with noRTcounter. PCI-SIG FAQ and AMD PG239 selected training sections compared; no analyzer/PHY run.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Narrow manually description, distinguish substates and basicNRZ example, add Loopback, qualify phasedEQ direction, SKP purpose and PHY limits; remove inventedRTcounter/FTScount and blanket noLinuxtraces.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Blocking gates, inline math and scoped diff pass. Document/source comparison only; no target execution. No physical PCI access, setpci, MMIO, IRQ/interrupt-remapping, kernel build/load, live VF allocation, reset/DPC/AER injection, power or performance validation. Host structures/allocators do not validate kernel ABI, locks or hardware. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `21ac7d1684c08a4944f53a9834570e06706a6bef23bea1c83ff0687cbe2e09e9`. After SHA-256: `9c879c20d5c355037464e300e1ca2cabddebf847d457d456c40b8344492fcdb7`.

Next action: manual-review. Which actual platform observations distinguish negotiated link or lifecycle state from a static capability/configuration listing?

### `chapter10-linux-basics.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/pcie/chapter10-linux-basics.md
2. **problemSignalAndCounterevidence:** Wrong pci_dev member types/resource size/driver_data, HPET hotplug, automatic driver priority and unchecked fake broadNIC driver skeleton.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Actual pci.h, pci-driver.c, PCI docs, ecam.c and acpiphp_glue.c selected paths compared. No kernel module build/load or liveenumeration.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Use actual v6.12 members/accessors and matching policy; remove unsupported probe skeleton, explain supportedID restriction, DMA mask and failure/remove ownership, qualify MCFG/platform/backend and service scope.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Blocking gates, inline math and scoped diff pass. Document/source comparison only; no target execution. No physical PCI access, setpci, MMIO, IRQ/interrupt-remapping, kernel build/load, live VF allocation, reset/DPC/AER injection, power or performance validation. Host structures/allocators do not validate kernel ABI, locks or hardware. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `7e74829776fb2c4bf40928a249429739accacbf259b07e31994fb2d5e36b4391`. After SHA-256: `fe115e076e68db6506c1c6819b0079478011ddca7f2b2afd73a2c12ef628e3de`.

Next action: manual-review. Which actual platform observations distinguish negotiated link or lifecycle state from a static capability/configuration listing?

## Primary sources

- [https://pcisig.com/blog/evolution-pci-express-specification-its-sixth-generation-third-decade-and-still-going-strong](https://pcisig.com/blog/evolution-pci-express-specification-its-sixth-generation-third-decade-and-still-going-strong)
- [https://pcisig.com/faq?keys=LTSSM](https://pcisig.com/faq?keys=LTSSM)
- [https://docs.amd.com/r/en-US/pg239-pcie-phy/Equalization-Sequences](https://docs.amd.com/r/en-US/pg239-pcie-phy/Equalization-Sequences)
- [https://github.com/torvalds/linux/tree/adc218676eef25575469234709c2d87185ca223a/drivers/pci](https://github.com/torvalds/linux/tree/adc218676eef25575469234709c2d87185ca223a/drivers/pci)
- [https://github.com/pciutils/pciutils/blob/v3.13.0/ls-caps.c](https://github.com/pciutils/pciutils/blob/v3.13.0/ls-caps.c)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
