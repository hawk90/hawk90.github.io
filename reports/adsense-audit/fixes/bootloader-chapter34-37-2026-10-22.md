# Bootloader chapter34–37 repair — 2026-10-22

Evaluation: [published-loop-04](../published-loop-04.md), read-only. No re-score. All four original sources and their evaluation entries were read. Supported concepts and chapter questions retained; unsupported code/log/product assumptions corrected at chapter scope.

## Executed verification

[Verifier log](bootloader-chapter34-37-2026-10-22.log): extracted BAR-size and memory-leaf arithmetic normal/invalid cases, six named example extractions and four shell syntax checks; routing metadata preserved. [Publish-gate log](bootloader-chapter34-37-2026-10-22-gate.log): all blocking checks pass; clone-only symbol checks SKIPPED, not PASS. Inline-math and scoped diff results are part of the final batch checkpoint.

No U-Boot/EDK II/QEMU build/boot, Linux CXL/ACPI/EFI tool run, firmware variable update, SPDM/IDE, target measurements or authenticated certificate rollover executed. Official source review does not validate these platform outcomes.

## Evidence by chapter

### `chapter34-pcie-enumeration.md` — remediated

1. **contextAndScope:** PCI driver-model discovery, BAR sizing/resource allocation and handoff.
2. **problemSignalAndCounterevidence:** CXL DRAM capacity was mapped as a giant PCI BAR; unverified pci_cxl.c/CEDT auto-creation and Jetson CXL support were presented as general U-Boot behavior.
3. **causeHypothesisAndAlternatives:** An implementation-independent interface description was mixed with assumed platform code, unsupported product behavior or hypothetical logs. Exact platform/release behavior must be distinguished from interface semantics and executable arithmetic.
4. **evidence:** U-Boot v2025.01 driver-model PCI documentation shows lazy probe/bind and legitimate PCI DT nodes; QEMU distinguishes register/mailbox BARs from HDM memory translation.
5. **sampleCoverage:** Read the full pre-edit source and published-loop-04 chapter entry, edited and reviewed source examples/prose/summary/links. These four chapters cover MMIO/CXL address separation, firmware handoff, Linux memory state and key rollover. No target platform or empirical performance dataset available.
6. **decision:** Kept the chapter’s device-discovery question, replaced fake implementation excerpts with executable mask arithmetic and bounded discovery guidance. Corrected title/description to match supported scope.
7. **smallestSafeChange:** Only this article, the scoped source-example verifier and fixed evidence. URLs/date/series/seriesOrder/draft/tags/topics preserved. Chapter34–36 body corrections required replacing unsupported examples and associated claims; no content merged/deleted or score ledger changed.
8. **validationAndResidualRisk:** 32/64-bit BAR masks, 16-byte lower bound, prefetch flag, absent/ambiguous, malformed and unsupported-width masks executed on host. U-Boot target commands and PCI config writes NOT RUN. Blocking publish gate and inline math pass. Verification covers declared source repair, not firmware, hardware, Linux CXL or rollout correctness on an unspecified device.

Before SHA-256: `55b2b5925f6863203772d06ea1fef32f2ac9bc4f746587f6ae5e60fca5f207ac`. After SHA-256: `1c355d8c9d07599a38c15a76cc4bd46d14b197340f8e30c194a7cfec3bb966fe`.

Next action: manual-review. Which U-Boot commit/defconfig, RC binding and target config/resource dump substantiate discovery, resource placement and CXL support?

### `chapter35-uefi-cxl-init.md` — remediated

1. **contextAndScope:** ACPI CEDT handoff, decoder programming responsibility, guest inspection and security boundary.
2. **problemSignalAndCounterevidence:** Source asserted mandatory pre-programming, fixed DXE modules, unsupported CEDT types/encodings, active/disabled SPDM entries, a CXL_ENABLED OVMF build switch and commercial BIOS equivalence.
3. **causeHypothesisAndAlternatives:** An implementation-independent interface description was mixed with assumed platform code, unsupported product behavior or hypothetical logs. Exact platform/release behavior must be distinguished from interface semantics and executable arithmetic.
4. **evidence:** Linux CEDT and BIOS/EFI docs describe CHBS/CFMWS and explicitly permit runtime decoder programming. QEMU CXL docs scope functional emulation; decoder operation docs distinguish commit, lock and region discovery.
5. **sampleCoverage:** Read the full pre-edit source and published-loop-04 chapter entry, edited and reviewed source examples/prose/summary/links. These four chapters cover MMIO/CXL address separation, firmware handoff, Linux memory state and key rollover. No target platform or empirical performance dataset available.
6. **decision:** Preserved the firmware handoff topic and named sections; replaced unsupported product/module/API claims with table semantics and read-only help/dump procedures. Corrected title/description.
7. **smallestSafeChange:** Only this article, the scoped source-example verifier and fixed evidence. URLs/date/series/seriesOrder/draft/tags/topics preserved. Chapter34–36 body corrections required replacing unsupported examples and associated claims; no content merged/deleted or score ledger changed.
8. **validationAndResidualRisk:** Extracted QEMU-help and ACPICA dump scripts pass shell syntax. No QEMU, OVMF/EDK II build, CEDT guest dump, SPDM or IDE run occurred. Blocking publish gate and inline math pass. Verification covers declared source repair, not firmware, hardware, Linux CXL or rollout correctness on an unspecified device.

Before SHA-256: `82ddbdba9a131c248f4dfbf131abc03572baa17a341f0d4bcf66485ba3c88715`. After SHA-256: `6b089fe6c2f24f3085a55e2a23b1a882350961a92d0c12e00a81263b908f5400`.

Next action: manual-review. Which platform DSC/FDF/INF and firmware/QEMU/kernel versions produced the actual CEDT, decoder commit/lock and security state?

### `chapter36-boot-memory-topology.md` — remediated

1. **contextAndScope:** Firmware memory description versus Linux NUMA, tier, zone, online and runtime placement.
2. **problemSignalAndCounterevidence:** Source conflated Genoa-X cache with HBM, claimed every server has four tiers, fixed SLIT values and DAMON migration, firmware-selected ZONE_MOVABLE and invented tier names/log formats.
3. **causeHypothesisAndAlternatives:** An implementation-independent interface description was mixed with assumed platform code, unsupported product behavior or hypothetical logs. Exact platform/release behavior must be distinguished from interface semantics and executable arithmetic.
4. **evidence:** ACPI 6.5 section 5 separates SRAT/SLIT/HMAT; Linux CXL early-boot explains PXM/node and tier information; CXL and generic memory-hotplug docs distinguish add/online and Linux zone policy.
5. **sampleCoverage:** Read the full pre-edit source and published-loop-04 chapter entry, edited and reviewed source examples/prose/summary/links. These four chapters cover MMIO/CXL address separation, firmware handoff, Linux memory state and key rollover. No target platform or empirical performance dataset available.
6. **decision:** Retained the memory-topology investigation with corrected subjects and responsibilities. Removed unsupported product performance tables and fabricated command outputs, added a bounded executable leaf-range check and actual inspection commands. Corrected title/description and link to chapter37.
7. **smallestSafeChange:** Only this article, the scoped source-example verifier and fixed evidence. URLs/date/series/seriesOrder/draft/tags/topics preserved. Chapter34–36 body corrections required replacing unsupported examples and associated claims; no content merged/deleted or score ledger changed.
8. **validationAndResidualRisk:** Extracted JS validates adjacent/unsorted ranges, one-byte overlap, nested/duplicate leaves, zero/negative/type errors and 64-bit end/overflow. Shell syntax passes. No ACPI parser, Linux CXL system or hardware measurements executed. Blocking publish gate and inline math pass. Verification covers declared source repair, not firmware, hardware, Linux CXL or rollout correctness on an unspecified device.

Before SHA-256: `1d80d21b8dcbcab01e1ce74071f2a8a4a27f2cea16a4ed1e1f96998dd8cc2037`. After SHA-256: `26ad690879c42694530f0fe585432a57ac2f031d6694c6c43fc08b94ab8681c4`.

Next action: manual-review. Which actual ACPI/memory map, kernel version/config, driver/region/online state and HMAT/CDAT data produce the observed NUMA and tier layout?

### `chapter37-secureboot-cert-rollover.md` — remediated

1. **contextAndScope:** Microsoft 2011→2023 certificate rollout and UEFI authenticated-variable authority; PQC scope.
2. **problemSignalAndCounterevidence:** KEK enrollment was incorrectly authorized by KEK instead of PK; new KEK name omitted 2K; expiration effects were generalized into an impossible post-expiry update rule; PQC cost/eFuse claims and nonexistent chapter38 were unsupported.
3. **causeHypothesisAndAlternatives:** An implementation-independent interface description was mixed with assumed platform code, unsupported product behavior or hypothetical logs. Exact platform/release behavior must be distinguished from interface semantics and executable arithmetic.
4. **evidence:** UEFI 2.10 §32.3.5 requires PK authorization for User Mode KEK enrollment; §32.6.3 allows PK or enrolled KEK for db/dbx. Microsoft KB5062710 supplies exact dates and Microsoft Corporation KEK 2K CA 2023. NIST FIPS 204/203 distinguish signatures and KEM.
5. **sampleCoverage:** Read the full pre-edit source and published-loop-04 chapter entry, edited and reviewed source examples/prose/summary/links. These four chapters cover MMIO/CXL address separation, firmware handoff, Linux memory state and key rollover. No target platform or empirical performance dataset available.
6. **decision:** Corrected update authority, dates/name and rollout scope without treating expiration as blanket cryptographic rejection. Removed subject-only completion test, universal PQC cost/eFuse claim and unsupported next-chapter promise. Title/description unchanged.
7. **smallestSafeChange:** Only this article, the scoped source-example verifier and fixed evidence. URLs/date/series/seriesOrder/draft/tags/topics preserved. Chapter34–36 body corrections required replacing unsupported examples and associated claims; no content merged/deleted or score ledger changed.
8. **validationAndResidualRisk:** Read-only EFI script passes shell syntax; official specification sections and Microsoft table read directly. No EFI variable reads/writes, authenticated update or post-expiry boot/recovery test was run. Blocking publish gate and inline math pass. Verification covers declared source repair, not firmware, hardware, Linux CXL or rollout correctness on an unspecified device.

Before SHA-256: `24253a686da46feb95d33cea1d3548b2f983a6ff4527af21b66e315e331ca641`. After SHA-256: `11fefafa4ca40679e101b63a30399be48269763c4d4de155682c336f05b7bd40`.

Next action: manual-review. Which OEM firmware/OS versions, enrolled certificate fingerprints, update-authority chain and signed loader/recovery images validate this device’s rollover?

## Primary sources

- [https://docs.u-boot.org/en/v2025.01/develop/driver-model/pci-info.html](https://docs.u-boot.org/en/v2025.01/develop/driver-model/pci-info.html)
- [https://www.qemu.org/docs/master/system/devices/cxl.html](https://www.qemu.org/docs/master/system/devices/cxl.html)
- [https://docs.kernel.org/driver-api/cxl/platform/acpi/cedt.html](https://docs.kernel.org/driver-api/cxl/platform/acpi/cedt.html)
- [https://docs.kernel.org/driver-api/cxl/platform/bios-and-efi.html](https://docs.kernel.org/driver-api/cxl/platform/bios-and-efi.html)
- [https://docs.kernel.org/driver-api/cxl/linux/cxl-driver.html](https://docs.kernel.org/driver-api/cxl/linux/cxl-driver.html)
- [https://docs.kernel.org/driver-api/cxl/linux/early-boot.html](https://docs.kernel.org/driver-api/cxl/linux/early-boot.html)
- [https://docs.kernel.org/driver-api/cxl/linux/memory-hotplug.html](https://docs.kernel.org/driver-api/cxl/linux/memory-hotplug.html)
- [https://docs.kernel.org/admin-guide/mm/memory-hotplug.html](https://docs.kernel.org/admin-guide/mm/memory-hotplug.html)
- [https://uefi.org/specs/ACPI/6.5/05_ACPI_Software_Programming_Model.html](https://uefi.org/specs/ACPI/6.5/05_ACPI_Software_Programming_Model.html)
- [https://uefi.org/specs/UEFI/2.10/32_Secure_Boot_and_Driver_Signing.html?highlight=authenticated+variable](https://uefi.org/specs/UEFI/2.10/32_Secure_Boot_and_Driver_Signing.html?highlight=authenticated+variable)
- [https://support.microsoft.com/en-us/servicing/os/secure-boot/2025/06/windows-secure-boot-certificate-expiration-and-ca-updates](https://support.microsoft.com/en-us/servicing/os/secure-boot/2025/06/windows-secure-boot-certificate-expiration-and-ca-updates)
- [https://csrc.nist.gov/pubs/fips/204/final](https://csrc.nist.gov/pubs/fips/204/final)
- [https://csrc.nist.gov/pubs/fips/203/final](https://csrc.nist.gov/pubs/fips/203/final)

Final current-source gate, diff and hash checks passed; readyForIntegration=true. See [resume checkpoint](repair-resume-checkpoint-2026-10-22.md). This records source-remediation scope, never target validation.
