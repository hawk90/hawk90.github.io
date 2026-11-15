# Embedded Security Ch10 lifecycle evidence repair

No re-score. Evaluation ledger preserved. Scope: Full original and frozen loop24 entry read; selected Microsoft SDL, compiler/libc, Yocto5.0.6, SLSA1.0, CycloneDX VEX, RFC9116 and EC reporting documents compared. Actual extracted copy helper executed.

## Checks and limits

Only host buffer-contract runtime checked. No target hardening build/runtime, formal security assessment, penetration test, SBOM generation/schema validation, provenance/builder certification, artifact signing, production incident response or legal conformity. SLSA1.0 explicitly archived comparison, not latest claim. Generic upstream gate skipped, not passed. Frozen scores unchanged.

Gate: [security-sdlc-2026-10-24.gate.log](security-sdlc-2026-10-24.gate.log).
Execution: [security-sdlc-2026-10-24.verify.log](security-sdlc-2026-10-24.verify.log).
Execution: [security-sdlc-2026-10-24.math.log](security-sdlc-2026-10-24.math.log).

## Per-article evidence

### `chapter10-sdlc.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/embedded-security/chapter10-sdlc.md
2. **problemSignalAndCounterevidence:** Original ended10chapterseries despite13, unsupported12practice/4h training, pointer sizeof buffer snippets, x86CET flag calledARM BTI, oldSLSA4, incompleteVEX/fakeCVE, wrongYoctoSBOM/blanketlaw, CRA72hpublicCVE90dpatch timeline and invalidemailContactURI.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Actual unchanged article C compiled with ASanUBSan,1089length/capacity cases plus null/zero verify return and all guard bytes/unchanged rejection. Microsoft current practices differs from claimed12. GCC sources separate x86CET/AArch64branch protection; glibc fortify scoped. Yocto5.0.6INHERITcreate-spdx, SLSA1.0BuildL0-L3, RFC9116URI and EC reporting compared.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Preserve seven-stage lifecycle purpose with release-linked artifacts and negative evidence; correct architecture/libc/tool preconditions and explicit Yocto5.0.6/SLSA1.0 references. Replace unsafe buffer snippets with actual explicit-size helper; fix security.txt mailto and CRA clocks; remove unsupported timing/training/coverage claims. Manual description removes false series ending.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Host extracted-helper test, gate, math and scoped diff pass. Other workflow/tool commands explicitly not executed. Only host buffer-contract runtime checked. No target hardening build/runtime, formal security assessment, penetration test, SBOM generation/schema validation, provenance/builder certification, artifact signing, production incident response or legal conformity. SLSA1.0 explicitly archived comparison, not latest claim. Generic upstream gate skipped, not passed. Frozen scores unchanged.

Before SHA-256: `e1dd8a617e53455df51f468d1a57ed0984e93907ead84348ffd51a1e5a542150`. After SHA-256: `8f378c451a35da289551624c5c492af7240ec93fb0c10a9caa618044b64c25a3`.

Next action: manual-review. For each actual release, can the final image, SBOM, provenance, signature policy, field inventory and incident owner be traced to the same build with tested failure and handoff paths?

## Primary sources

- [https://www.microsoft.com/en-us/securityengineering/sdl/practices](https://www.microsoft.com/en-us/securityengineering/sdl/practices)
- [https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html)
- [https://gcc.gnu.org/onlinedocs/gcc-13.4.0/gcc/AArch64-Options.html](https://gcc.gnu.org/onlinedocs/gcc-13.4.0/gcc/AArch64-Options.html)
- [https://sourceware.org/glibc/manual/latest/html_node/Source-Fortification.html](https://sourceware.org/glibc/manual/latest/html_node/Source-Fortification.html)
- [https://docs.yoctoproject.org/5.0.6/dev-manual/sbom.html](https://docs.yoctoproject.org/5.0.6/dev-manual/sbom.html)
- [https://cyclonedx.org/capabilities/vex/](https://cyclonedx.org/capabilities/vex/)
- [https://slsa.dev/spec/v1.0/levels](https://slsa.dev/spec/v1.0/levels)
- [https://www.rfc-editor.org/rfc/rfc9116.html](https://www.rfc-editor.org/rfc/rfc9116.html)
- [https://digital-strategy.ec.europa.eu/en/policies/cra-reporting](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
