# Embedded security threat model, boot and crypto repair

No re-score. Evaluation ledger preserved. Scope: Full current originals and frozen loop23 entries read; inherited partial edits preserved and completed. Primary document comparison. Mbed TLS3.6.4 c765c831 built with ASan/UBSan two jobs, framework2a3e2c5 pinned; actual extracted article C linked and executed on macOS arm64.

## Checks and limits

Host crypto functional checks and document review only. No MCU accelerator/entropy/DMA, side-channel or physical-fault resistance, bootROM image-parser or TPM execution, fuse/RDP changes, production key/nonce lifecycle, secure-boot/rollback/power-failure hardware certification. Generic clone gate skipped, not passed. Frozen scores unchanged.

Gate: [security-foundations-2026-10-24.gate.log](security-foundations-2026-10-24.gate.log).
Execution: [security-foundations-2026-10-24.verify.log](security-foundations-2026-10-24.verify.log).
Execution: [security-foundations-2026-10-24.math.log](security-foundations-2026-10-24.math.log).

## Per-article evidence

### `chapter01-threat-model.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/embedded-security/chapter01-threat-model.md
2. **problemSignalAndCounterevidence:** Prior edits qualified invented risk/performance values but storage encryption still implied integrity, protocol pinning and Merkle tree were presented as interchangeable secure-boot shortcuts, and DFD lacked review steps.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Microsoft STRIDE primary page and Linux6.12 dm-verity trusted root hash scope compared; ST RDP product-specific source linked through boot chapter. Full source/frozen entry read. Risk scores are invented team examples, not measurements.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Preserve STRIDE and explicit hypothetical five-axis DREAD inputs; cite Microsoft, distinguish trusted integrity from basic LUKS, qualify fault countermeasures and protocol choices; add flow/assumption/rejection plan and clarify TLS CA versus boot anchor.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Blocking gate, inline math, scoped diff and declared host crypto checks pass. Static review and host tests do not certify hardware or product security. Host crypto functional checks and document review only. No MCU accelerator/entropy/DMA, side-channel or physical-fault resistance, bootROM image-parser or TPM execution, fuse/RDP changes, production key/nonce lifecycle, secure-boot/rollback/power-failure hardware certification. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `e12364552e21fd4b464bfb60062d6f0193b3bb487118b065ca655b6a372f37c6`. After SHA-256: `5afe93d3e956177d44104f4e6f99578375c948ae60783356387128ffd204c705`.

Next action: manual-review. For a named product/revision and threat model, what target rejection, recovery, key lifecycle and physical-security evidence closes the remaining assumptions?

### `chapter02-secure-boot.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/embedded-security/chapter02-secure-boot.md
2. **problemSignalAndCounterevidence:** Prior partial edits fixed PCR contradiction but retained ASCII chains, unverified CST output/image mixing, raw platform commands and generic key-slot/algorithm/RDP claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** NXP HAB collateral covers6/7/8M; actual ESP-IDF5.1.6C3ECO3RSA-PSS/SHA256signature block and firmware verification flow read. TFA2.12CoT/keyownership, MCUboot counter documentation, tpm2_pcrextend bank/digest and RFC8032 variants compared. No actual boot or signer execution.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Keep boot trust and failure decisions; replace ASCII with verification-subject table; distinguish algorithm prehash and trusted digest, RDP from authentication, iMX8M HAB from other AHAB parts, CST CSF output from assembled image. Pin ESP-IDF5.1.6 and TFA2.12 docs; remove unverified build/provisioning examples and qualify counters/PCR/recovery.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Blocking gate, inline math, scoped diff and declared host crypto checks pass. Static review and host tests do not certify hardware or product security. Host crypto functional checks and document review only. No MCU accelerator/entropy/DMA, side-channel or physical-fault resistance, bootROM image-parser or TPM execution, fuse/RDP changes, production key/nonce lifecycle, secure-boot/rollback/power-failure hardware certification. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `4ccaef0377fc89803a8a7db2d37f0386a6072cc44683cf9605a62e3249f8cba4`. After SHA-256: `dbf935cbef9de15521370431437800bf625b8cfb17055350f98376b321911ae0`.

Next action: manual-review. For a named product/revision and threat model, what target rejection, recovery, key lifecycle and physical-security evidence closes the remaining assumptions?

### `chapter03-mcu-crypto.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/embedded-security/chapter03-mcu-crypto.md
2. **problemSignalAndCounterevidence:** Unsafe unchecked zero-key/nonce snippets, unbounded final SHA chunk and invented platform API mixtures; RSA2048=P256 strength assertion, unconditional algorithm/fallback/constant-time claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Actual sanitizer-built Mbed TLS3.6.4 self-tests AES/GCM/SHA; article functions extracted unchanged. AES known answer crosschecked with Node/OpenSSL and actuallibrary, five mutations reject/zerooutput,3Btag invalid.112 independentSHA chunk cases and zerochunk rejection; RFC4231 HMAC and32memcmp differences. NIST800-57Table2 confirms RSA2048=112 versusP256=128; CMSE/crypto target not tested.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Manually narrow title/description to API and accelerator verification. Provide actual built3.6.4 GCM/SHA functions with checked results and bounded final chunks; distinguish authentication, security strength, engine/driver/async/fallback, entropy/DRBG and target side-channel scope. Remove unpinned HAL/DCP/PSA/libsodium fragments.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Blocking gate, inline math, scoped diff and declared host crypto checks pass. Static review and host tests do not certify hardware or product security. Host crypto functional checks and document review only. No MCU accelerator/entropy/DMA, side-channel or physical-fault resistance, bootROM image-parser or TPM execution, fuse/RDP changes, production key/nonce lifecycle, secure-boot/rollback/power-failure hardware certification. Generic clone gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `ef892daab16a54fdf059cdbc7fd693f3779f96676b88b0f206e2f033f22b8a64`. After SHA-256: `ad17f8b276b4f14778a6a5258ca6490d305e2e3c52c1d96c68f356347f25c839`.

Next action: manual-review. For a named product/revision and threat model, what target rejection, recovery, key lifecycle and physical-security evidence closes the remaining assumptions?

## Primary sources

- [https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- [https://www.kernel.org/doc/html/v6.12/admin-guide/device-mapper/verity.html](https://www.kernel.org/doc/html/v6.12/admin-guide/device-mapper/verity.html)
- [https://community.nxp.com/t5/i-MX-Security/i-MX-Security-Features-amp-Collateral/ta-p/1192496](https://community.nxp.com/t5/i-MX-Security/i-MX-Security-Features-amp-Collateral/ta-p/1192496)
- [https://docs.espressif.com/projects/esp-idf/en/v5.1.6/esp32c3/security/secure-boot-v2.html](https://docs.espressif.com/projects/esp-idf/en/v5.1.6/esp32c3/security/secure-boot-v2.html)
- [https://trustedfirmware-a.readthedocs.io/en/v2.12.0/design/trusted-board-boot.html](https://trustedfirmware-a.readthedocs.io/en/v2.12.0/design/trusted-board-boot.html)
- [https://docs.mcuboot.com/design.html](https://docs.mcuboot.com/design.html)
- [https://github.com/Mbed-TLS/mbedtls/tree/c765c831e5c2a0971410692f92f7a81d6ec65ec2](https://github.com/Mbed-TLS/mbedtls/tree/c765c831e5c2a0971410692f92f7a81d6ec65ec2)
- [https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
