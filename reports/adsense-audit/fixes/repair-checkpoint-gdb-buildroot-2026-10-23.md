# Repair checkpoint — GDB extension and Buildroot security, 2026-10-23

Seven additional scoped repairs recorded with matching SHA, after full article/evaluation and primary-source review. No rescoring, commit, push or deployment.

- GDB Extension and IDE: all six chapters recorded. Actual temporary GDB17.2 with Python3.14 and x86-64 Linux target inspected a synthetic ELF core, exercised Python commands/printers/unwinder/RGB export and MI3 varobjs. DAP split/error tests passed. A synthetic core is not an executed inferior; live return callbacks, GUI, remote server and board tests remain open.
- Buildroot Practical chapter18: pinned2024.02 source contracts, actual extracted upstream JSON serializer and legal-manifest make helper, corrected CVE comparison CLI and failure paths verified. No complete image/feed/security/compliance certification claimed.
- Overall queue:303 recorded +6 external-validation-pending;83 not_started +14 review_unassessed. Matching repair record is scoped evidence, not an all-claims verification status.

Validation after both batches:

- [Build](repair-checkpoint-gdb-buildroot-2026-10-23-build.log):1135 pages, complete in69s with NODE_OPTIONS=--max-old-space-size=4096.
- [Anchors](repair-checkpoint-gdb-buildroot-2026-10-23-anchors.log):67 checked, zero findings.
- [Reading audit](repair-checkpoint-gdb-buildroot-2026-10-23-reading.log):1136 HTML pages,1646 tables,3793 images,135303 links; zero findings.
- Scoped publish gates, six+one-file inline math checks and diff whitespace checks passed. Clone-only unrelated symbol gates skipped, not pass.

The44 original score/evaluation ledger SHA hashes remain frozen and are asserted by each record operation. Published URLs, dates, draft flags and series order preserved; chapter-specific title/description corrections are documented.
