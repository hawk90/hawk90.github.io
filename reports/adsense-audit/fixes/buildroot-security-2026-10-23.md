# Buildroot security source-contract repair — 2026-10-23

No re-score. Evaluation ledger preserved. Scope: Full chapter and loop08 evaluation read; pinned Buildroot2024.02 full source reviewed for pkg-stats/CPE/ignore/legal-info/config contracts; extracted serializer and article tool executed.

## Checks and limits

No full Buildroot image, online NVD/feed/current CVE applicability, SBOM conversion, two-rootfs reproducibility, target hardening benchmark or board authentication executed. Legal-info collection is not a legal determination. Old2024.02 pin identifies source contract, not a production-release recommendation. Unrelated clone-only gate checks skipped.

Gate: [buildroot-security-2026-10-23-gate.log](buildroot-security-2026-10-23-gate.log).
Execution: [buildroot-security-2026-10-23.log](buildroot-security-2026-10-23.log).

## Per-article evidence

### `chapter18-security-cve.md` — remediated

1. **contextAndScope:** src/content/blog/embedded/buildroot/chapter18-security-cve.md
2. **problemSignalAndCounterevidence:** Fake CVE JSON and jq schema; ignored_CVEs/CPE handling misstated; invented reproducibility/legal/PIC options and SBOM command; unsupported compliance guarantee, costs, password escaping and empty-password generalization.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Pinned Buildroot2024.02 SHA87e979e4572449ecb7d2058b02d642b38cc3b0f8, actual Package/dump_json, legal-manifest Make helper, package/manual/config source.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected pinned actual JSON/metadata/ignore/legal scope, removed nonexistent APIs and unsupported blanket claims, bounded reproducibility and authentication assumptions; replaced snapshot script with validated explicit-input CVE comparison. Manual description correction.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual upstream serializer instantiated with synthetic packages; extracted Node parser tests confirmed/uncertain/ignore/dedup/schema/CLI0/1/2/space+symlink paths pass. Actual legal-manifest helper emits exact7-column header. Option existence/absence and password escaping checked at pinned SHA. Scoped gate/math/diff pass. No full Buildroot image, online NVD/feed/current CVE applicability, SBOM conversion, two-rootfs reproducibility, target hardening benchmark or board authentication executed. Legal-info collection is not a legal determination. Old2024.02 pin identifies source contract, not a production-release recommendation. Unrelated clone-only gate checks skipped.

Before SHA-256: `aa765ad82e1e590e33878630469369c2ddabb78a03c86072e80dbd626f45fdc8`. After SHA-256: `6fb754e44a936ca35e4b6ddb29cce9edc26e6ac5b4e4d9f9b2d425d42ab257b8`.

Next action: manual-review. Which supported product branch/config, current feed/triage evidence, reviewed license delivery, reproducibility comparison, ELF checks and actual console/SSH negative tests establish this shipped image?

## Primary sources

- [https://github.com/buildroot/buildroot/tree/87e979e4572449ecb7d2058b02d642b38cc3b0f8](https://github.com/buildroot/buildroot/tree/87e979e4572449ecb7d2058b02d642b38cc3b0f8)
- [https://github.com/buildroot/buildroot/blob/87e979e4572449ecb7d2058b02d642b38cc3b0f8/support/scripts/pkg-stats](https://github.com/buildroot/buildroot/blob/87e979e4572449ecb7d2058b02d642b38cc3b0f8/support/scripts/pkg-stats)
- [https://github.com/buildroot/buildroot/blob/87e979e4572449ecb7d2058b02d642b38cc3b0f8/docs/manual/legal-notice.adoc](https://github.com/buildroot/buildroot/blob/87e979e4572449ecb7d2058b02d642b38cc3b0f8/docs/manual/legal-notice.adoc)
- [https://github.com/buildroot/buildroot/blob/87e979e4572449ecb7d2058b02d642b38cc3b0f8/system/Config.in](https://github.com/buildroot/buildroot/blob/87e979e4572449ecb7d2058b02d642b38cc3b0f8/system/Config.in)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
