# Embedded Security Ch11–12 link-state and measurement policy repair

No re-score. Evaluation ledger preserved. Scope: Full originals and frozen loop24 entries read; selected CXL3.1/DSP0274 1.2.3/OpenDICE2.6/PCI-SIG2020educational material and Linux7.0ABI compared. Actual pinned pciutils dump backend and custom host measurement policy executed.

## Checks and limits

PCI-SIG2020 presentation was pre-publication educational material, not a substitute for a complete current PCIe Base Specification audit. CXL selected clauses only. Synthetic registers and custom P256DER envelope are not hardware/runtime protocol proof. No actual IDE stream/key/ciphertext, DOE discovery, SPDM wire/transcript/session/certificate validation, DICE target, firmware measurement, physical failure or performance measurement. Generic clone gate skipped, not passed. Frozen scores unchanged.

Gate: [security-link-attestation-2026-10-24.gate.log](security-link-attestation-2026-10-24.gate.log).
Execution: [security-pci-decode-2026-10-24.verify.log](security-pci-decode-2026-10-24.verify.log).
Execution: [security-measurement-policy-2026-10-24.verify.log](security-measurement-policy-2026-10-24.verify.log).
Execution: [security-link-attestation-2026-10-24.math.log](security-link-attestation-2026-10-24.math.log).

## Per-article evidence

### `chapter11-pcie-cxl-ide.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/embedded-security/chapter11-pcie-cxl-ide.md
2. **problemSignalAndCounterevidence:** Original made universal protected-field/device security claims, unpinned source citations, conflated display/enable/secure state with actual link protection, and used PCIe status display as physical verification.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Actual compiled pciutils3.13.0 decodes15complete4096Bfixtures withabsent/Link/Selective/both/8Link16Selective and0/1/2states. Two opposingEnable/PCRC-bit fixtures reproduceupstreamLinkPCRCdisplayusingEnablebit;Selectiveusesproperbit. LinkStatusprefixdiffersfromSelective. DOEdecoderregistersonly,noprotocolenumeration. CXL3.1selected11.1-11.4reviewed.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** DifferentiatePCIe/CXL.io/cachemem and protected/AAD/excluded fields; preserve formal CXLalgorithm scope but correctIV-consumption wording. Add actual synthetic decode+failure-evidence matrix and pinned decoder limitation; link CXL14detail rather than claimingfullPCIe audit.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual synthetic decode, gate/math/diff pass; no device config access/writes or link security assertion. PCI-SIG2020 presentation was pre-publication educational material, not a substitute for a complete current PCIe Base Specification audit. CXL selected clauses only. Synthetic registers and custom P256DER envelope are not hardware/runtime protocol proof. No actual IDE stream/key/ciphertext, DOE discovery, SPDM wire/transcript/session/certificate validation, DICE target, firmware measurement, physical failure or performance measurement. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `49b4764e522c688d9f38bd7fc022ba165060b414ea6aead72f19eae2805f162e`. After SHA-256: `7f4530a1f4de8a91348995959ae9c93b4fb00aad8107a5d3e7f7ac465ed01d1f`.

Next action: manual-review. On both real ports, do raw association/control/status, key lifecycle, failure containment and actual traffic agree despite tool display limitations?

### `chapter12-spdm-cma.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/embedded-security/chapter12-spdm-cma.md
2. **problemSignalAndCounterevidence:** Original mandatory18step/auth-guarantee wording, latestfutureversionanchor, incomplete0..4measurementtypes, unlabelledfakeDOEoutput, SPDMone-time-only, and DICEsingleCDIoversimplification.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** DSP0274Tables38-43comparefieldsandconditionalSignatureRequested. Linux7.0ABI listsDOEfeatures and conditions. OpenDICE2.6distinguishesCDI_Attest/CDI_Sealinputs. Actual extractedNodepolicychecksvalidaccept, eightwrong/truncated/oversizecases,16invalidfieldcases; independentlyvalidold-digestsignaturerejectsbypolicyandother-key signatureundertrustedkeyrejects.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** PinDSP0274 1.2.3selectedtables, optionalcapability/error/session paths and signedmeasurement/freshness; addtypes5..7anddigest/rawbit; separate hostreferencepolicy, DICEattest/sealing, DOEdiscovery and SPDMstandardsauthority. Add explicitly non-SPDMhostP256DERdemo.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** ActualNodecryptoP256/SHA256customenvelopepolicycases, gate/math/diff pass. Not actualSPDMencoding/transcriptorattestation. PCI-SIG2020 presentation was pre-publication educational material, not a substitute for a complete current PCIe Base Specification audit. CXL selected clauses only. Synthetic registers and custom P256DER envelope are not hardware/runtime protocol proof. No actual IDE stream/key/ciphertext, DOE discovery, SPDM wire/transcript/session/certificate validation, DICE target, firmware measurement, physical failure or performance measurement. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `5af6e56b3171089f717f4dae3154a985859b76231bdbc91875f1a0596e26ee94`. After SHA-256: `6e37407be8a209623715fc10fbc43fcd6c5c7792aa210b7339deea9c870ee27f`.

Next action: manual-review. For the real device/measurementindex/configuration, who authenticates the reference and credential policy, and which replay, downgrade, capability and session-failure cases are tested?

## Primary sources

- [https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)
- [https://pcisig.com/sites/default/files/files/PCIe%20Security%20Webinar_Aug%202020_PDF.pdf](https://pcisig.com/sites/default/files/files/PCIe%20Security%20Webinar_Aug%202020_PDF.pdf)
- [https://github.com/pciutils/pciutils/blob/7c5bf915f87d8e4c62be66275c8e73a5f03fa5ee/ls-ecaps.c](https://github.com/pciutils/pciutils/blob/7c5bf915f87d8e4c62be66275c8e73a5f03fa5ee/ls-ecaps.c)
- [https://www.dmtf.org/sites/default/files/standards/documents/DSP0274_1.2.3.pdf](https://www.dmtf.org/sites/default/files/standards/documents/DSP0274_1.2.3.pdf)
- [https://github.com/torvalds/linux/blob/v7.0/Documentation/ABI/testing/sysfs-bus-pci](https://github.com/torvalds/linux/blob/v7.0/Documentation/ABI/testing/sysfs-bus-pci)
- [https://pigweed.googlesource.com/open-dice/+/refs/heads/main/docs/specification.md](https://pigweed.googlesource.com/open-dice/+/refs/heads/main/docs/specification.md)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
