# Quality evidence overlap audit

- Decided AP items: 100
- Shared evidence profiles: 5
- Duplicate AP IDs: 0

Shared evidence is not itself an anti-pattern duplicate. Keep atomic AP IDs for traceability; update the shared control once and rerun this report.

## Shared profiles

### Profile 01 — 47 AP items

- Verification: `npm run verify:release`
- Files: `scripts/audit-frontmatter-portability.mjs`, `scripts/verify-release.mjs`, `scripts/verify-search.mjs`
- AP items: AP-T-01 (remediated) T-01. Build Success Equals Correctness; AP-T-02 (remediated) T-02. Type Safety as Content Safety; AP-T-03 (remediated) T-03. Test Only the Framework; AP-T-04 (remediated) T-04. Content Is Not Code; AP-T-08 (remediated) T-08. No Parser Fixture; AP-T-09 (remediated) T-09. Happy-Path Fixture Only; AP-T-16 (remediated) T-16. No End-to-End Content Pipeline Test; AP-T-17 (remediated) T-17. Production Build Never Tested in CI; AP-T-18 (remediated) T-18. Full Build Only Test; AP-T-19 (remediated) T-19. No Generated Output Inspection; AP-T-20 (remediated) T-20. One Representative Page; AP-T-21 (remediated) T-21. No Large-Article Test; AP-T-22 (remediated) T-22. No Empty-State Test; AP-T-23 (remediated) T-23. No Error-State Test; AP-T-24 (remediated) T-24. Preview and Production Divergence; AP-T-25 (remediated) T-25. Test Against Source, Not Dist; AP-T-26 (remediated) T-26. HTTP Status Only Link Check; AP-T-32 (remediated) T-32. Link Checker Parses Code Blocks; AP-T-33 (remediated) T-33. Link Checker Ignores Reference Links; AP-T-34 (remediated) T-34. Link Fixer Chooses Nearest Title; AP-T-36 (remediated) T-36. Search Works Means Search Is Good; AP-T-37 (remediated) T-37. No Golden Query Set; AP-T-38 (remediated) T-38. Only Exact Query Tests; AP-T-39 (remediated) T-39. No Negative Search Cases; AP-T-40 (remediated) T-40. Rank-One-Only Evaluation; AP-T-41 (remediated) T-41. Search Snapshot by Score; AP-T-42 (remediated) T-42. Search Test Ignores Content Status; AP-T-43 (remediated) T-43. Search Test Ignores Canonical Guide; AP-T-44 (remediated) T-44. Search Test Dataset Too Small; AP-T-45 (remediated) T-45. Search Quality Tested Only Manually; AP-T-61 (remediated) T-61. Modal Escape Not Tested; AP-T-62 (remediated) T-62. Reduced Motion Untested; AP-T-74 (remediated) T-74. Updated Date Automatically Means Verified; AP-T-76 (remediated) T-76. Schema Valid, Relation Invalid; AP-T-77 (remediated) T-77. Self-Referential Relation; AP-T-78 (remediated) T-78. Duplicate Relation; AP-T-81 (remediated) T-81. Series Order Collision; AP-T-83 (remediated) T-83. Topic Hub References Draft; AP-T-85 (remediated) T-85. Canonical Slug Collision; AP-T-91 (remediated) T-91. Search Manifest and Page Set Diverge; AP-T-92 (remediated) T-92. RSS Contains Draft or Superseded Content; AP-T-93 (remediated) T-93. Sitemap Contains Redirect Targets Twice; AP-T-94 (remediated) T-94. OG Generation Failure Silently Falls Back; AP-T-95 (remediated) T-95. Dependency Scan Only Security Test; AP-T-96 (remediated) T-96. No Secret Scan in Content; AP-T-98 (remediated) T-98. Admin Route Hidden Test; AP-T-99 (remediated) T-99. Workflow Permission Not Tested

### Profile 02 — 2 AP items

- Verification: `npm run audit:content-readiness && npm run verify:release`
- Files: `scripts/audit-content-readiness.mjs`, `scripts/audit-prose-staleness.py`, `scripts/verify-release.mjs`
- AP items: AP-T-67 (accepted) T-67. Minimum Word Count Rule; AP-T-73 (accepted) T-73. Environment Section Presence Only

### Profile 03 — 2 AP items

- Verification: `npm run audit:product-experience && npm run audit:diagram-quality && npm run verify:release`
- Files: `scripts/audit-diagram-quality.mjs`, `scripts/audit-product-experience.mjs`, `scripts/build-diagram-review-index.mjs`, `scripts/verify-release.mjs`
- AP items: AP-T-46 (accepted) T-46. Screenshot Every Page; AP-T-47 (accepted) T-47. No Visual Regression Test

### Profile 04 — 2 AP items

- Verification: `npm run audit:product-experience && npm run verify:release`
- Files: `scripts/audit-product-experience.mjs`, `scripts/verify-release.mjs`, `src/components/admin/AdminGuard.astro`, `src/components/common/SearchModal.astro`
- AP items: AP-T-60 (accepted) T-60. Focus Order Follows DOM Accidentally; AP-T-64 (accepted) T-64. Screen Reader Label Snapshot

### Profile 05 — 2 AP items

- Verification: `npm run verify:release`
- Files: `scripts/audit-cited-symbols.py`, `scripts/audit-suspect-claims.sh`, `scripts/verify-release.mjs`
- AP items: AP-T-72 (accepted) T-72. Citation Count as Trust Score; AP-T-75 (accepted) T-75. Broken Claim Detection by Keyword

## Review rule

- Merge only when the anti-pattern claims are semantically identical and source traceability can be preserved.
- Otherwise retain separate AP IDs and consolidate implementation in the shared control or verifier.

