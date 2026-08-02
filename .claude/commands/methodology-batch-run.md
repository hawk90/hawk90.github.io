---
name: methodology-batch-run
description: Review exactly one AP-D batch with atomic evidence and dispositions.
argument-hint: "[batch ID, e.g. MD-01]"
allowed-tools: Bash, Read, Grep, Glob, Edit
---

# Run one AP-D batch

1. Run `npm run audit:methodology-policy`, `npm run plan:methodology-batches`, and read the requested batch in `reports/methodology/batches.md`.
2. Work only on its listed AP IDs. For each ID, read the linked source block and record a concrete repository finding before deciding.
3. Update `methodology-registry.json` only with an evidence-backed `remediated`, `accepted`, or `superseded` disposition, a scoped rationale, affected files, verification command/result, and residual risk. An AP disposition never authorizes deleting, merging, drafting, archiving, renaming, or bulk-rewriting published content.
4. Do not mark a similarly named feature as remediation without checking the original AP condition and scope.
5. Run `npm run audit:methodology`, `npm run audit:remediation-graph`, and the relevant narrow checks. Regenerate batches before handoff.
