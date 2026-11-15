# PCIe DMA and virtualization ownership repair

No re-score. Evaluation ledger preserved. Scope: Full originals and frozen loop33 entries read. Linux6.12 DMA/VFIO/IOMMUFD, QEMU9.2.4 VFIO migration, Intel ScalableIOVRev1.1, VirtIO1.2 and PCI-SIGTDISP selected primary references compared. Static checks only.

## Checks and limits

No physical PCI access, setpci, MMIO, IRQ/interrupt-remapping, kernel build/load, live VF allocation, reset/DPC/AER injection, power or performance validation. Host structures/allocators do not validate kernel ABI, locks or hardware. Generic clone gate skipped, not passed. Frozen scores unchanged.

Gate: [pcie-dma-virtualization-2026-10-24.gate.log](pcie-dma-virtualization-2026-10-24.gate.log).
Execution: [pcie-dma-virtualization-2026-10-24.math.log](pcie-dma-virtualization-2026-10-24.math.log).

## Per-article evidence

### `chapter11-linux-dma.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/pcie/chapter11-linux-dma.md
2. **problemSignalAndCounterevidence:** WrongATSID,architecturecachetableanddirectionflushcontracts,incompleteuncheckedmapping,lifetimeandSGomissions;arbitraryIOMMUFDstableversion.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** ActualLinux6.12 DMAHOWTO selectedmapping/barrier/error/SG/syncsectionsandpci_regs.h reviewed;VFIO/IOMMUFD exact docs compared.NoDMAexecuted.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Rewrite around CPU/physical/DMA addresses,coherentordering,streamingownership,mapfailure and completion-before-unmap; SG returnedcount versus originalnents; correctATS/PRI/PASID and separate SVA activation,SWIOTLBconfidentialcase,groupconstraintsandIOMMUFDversions.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Blocking gates, inline math and scoped diff pass. Primary source review only; no target DMA, VFIO, migration, kernel or cryptographic runtime. No physical PCI access, setpci, MMIO, IRQ/interrupt-remapping, kernel build/load, live VF allocation, reset/DPC/AER injection, power or performance validation. Host structures/allocators do not validate kernel ABI, locks or hardware. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `7f219a318bcdca72220765972c1fe52b1b86677e6ed0566f810b5d444181a51a`. After SHA-256: `1cf895748271b383c61648e32789c671ca554f19552fbcfa8df5c5d7a7af1ff1`.

Next action: manual-review. For the pinned device/driver/platform, do ownership, completion, isolation and failure traces meet the declared API and threat-model conditions?

### `chapter12-virtualization-1.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/pcie/chapter12-virtualization-1.md
2. **problemSignalAndCounterevidence:** FabricatedVF BDF output,uncheckedVFIOioctls,ASCIIflow,unverifiedproductsandblanketspeed/isolationsclaims;VFstridewrong.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Linux6.12VFIOgroupviability/cdevbindownership and SRIOVHOWTO read;actualiov.cRIDsourcealreadytested;DPDKofficialdriverdocsandSPDKconfigurationprimaryreview.NoVFcreation/binding/passthrough.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Replace with read-only VFrelationship queries,legacyVFIOpreconditions/failurecleanup anddistinctcdevpath; separategroup/reset/dataisolation;qualifyDPDKbifurcateddrivers,SPDKstorageownership,mdevandvfio-user.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Blocking gates, inline math and scoped diff pass. Primary source review only; no target DMA, VFIO, migration, kernel or cryptographic runtime. No physical PCI access, setpci, MMIO, IRQ/interrupt-remapping, kernel build/load, live VF allocation, reset/DPC/AER injection, power or performance validation. Host structures/allocators do not validate kernel ABI, locks or hardware. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `106784f6e25d32d02b1fdec5052783625e36c603548e93236fecd51a88accc77`. After SHA-256: `0e8e1917d788c77dee719844d09dc79bfdfa0624f418ffc67c570c98b9c4b767`.

Next action: manual-review. For the pinned device/driver/platform, do ownership, completion, isolation and failure traces meet the declared API and threat-model conditions?

### `chapter13-virtualization-2.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/hardware/pcie/chapter13-virtualization-2.md
2. **problemSignalAndCounterevidence:** PRI conflated with migrationdirtytracking;unsupportedaccel-config/QEMUcommands,firstcommercialGPUIDE/TDISPclaimsandroadmap;vIOMMU/ADI/speedguarantees.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** IntelScalableIOVRev1.1selectedADIsections,VirtIO1.2split/packedfeatures,Linux6.12VFIO/IOMMUFD,QEMU9.2.4docs/devel/migration/vfio.rstactualdevice/dirtytrackingandPCI-SIGTDISPscopecompared.Noactualguest/migration/cryptooperation.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Keep independent guest/share/protocol/trust role chapter;separatevIOMMUfromhardwaretwo-stage,SRIOVdynamicNumVFsfromADI,Packednegotiation,softwarevDPA,device/dirtystate/targetmigrationconditions,IDE/SPDM/TDISPboundaries. Removeunsupportedcommands/products/projections.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Blocking gates, inline math and scoped diff pass. Primary source review only; no target DMA, VFIO, migration, kernel or cryptographic runtime. No physical PCI access, setpci, MMIO, IRQ/interrupt-remapping, kernel build/load, live VF allocation, reset/DPC/AER injection, power or performance validation. Host structures/allocators do not validate kernel ABI, locks or hardware. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `f59c32d64100b42ca457fba6788d50d5a9cf731ead769915df9d8ab05bf7439a`. After SHA-256: `fcb5eaaa42102b8864ecc0b9a755972e61324a13d381bfd728b1ddb3013856a2`.

Next action: manual-review. For the pinned device/driver/platform, do ownership, completion, isolation and failure traces meet the declared API and threat-model conditions?

## Primary sources

- [https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/core-api/dma-api-howto.rst](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/core-api/dma-api-howto.rst)
- [https://www.kernel.org/doc/html/v6.12/driver-api/vfio.html](https://www.kernel.org/doc/html/v6.12/driver-api/vfio.html)
- [https://www.kernel.org/doc/html/v6.12/userspace-api/iommufd.html](https://www.kernel.org/doc/html/v6.12/userspace-api/iommufd.html)
- [https://gitlab.com/qemu-project/qemu/-/blob/v9.2.4/docs/devel/migration/vfio.rst](https://gitlab.com/qemu-project/qemu/-/blob/v9.2.4/docs/devel/migration/vfio.rst)
- [https://docs.oasis-open.org/virtio/virtio/v1.2/virtio-v1.2.html](https://docs.oasis-open.org/virtio/virtio/v1.2/virtio-v1.2.html)
- [https://cdrdv2-public.intel.com/671403/intel-scalable-io-virtualization-technical-specification.pdf](https://cdrdv2-public.intel.com/671403/intel-scalable-io-virtualization-technical-specification.pdf)
- [https://doc.dpdk.org/guides/linux_gsg/linux_drivers.html](https://doc.dpdk.org/guides/linux_gsg/linux_drivers.html)
- [https://spdk.io/doc/system_configuration.html](https://spdk.io/doc/system_configuration.html)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
