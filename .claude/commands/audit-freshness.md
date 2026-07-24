---
name: audit-freshness
description: Check upstream drift + cited-symbol existence for tracked series (CLAUDE.md §14 stage ③⑥). Finds chapters lagging upstream code/spec changes and API names that were renamed/removed/invented.
argument-hint: "[series id — folly|abseil|cxl_internals|pcie_deep_dive; empty = all]"
allowed-tools: Bash, Read, Grep, Glob
---

# Upstream freshness + cited-symbol audit

Assess how far tracked series have drifted from upstream, and whether any cited
library symbol no longer exists. Series id (optional): `$ARGUMENTS`.

## Steps

1. **Drift** — which chapters lag upstream code/spec (fetches upstream):
   ```bash
   python3 scripts/audit-upstream-freshness.py --top 15 ${ARGUMENTS:+--series $ARGUMENTS}
   ```
2. **Cited-symbol existence** — renamed/removed/invented API names:
   ```bash
   python3 scripts/audit-cited-symbols.py ${ARGUMENTS:+--series $ARGUMENTS}
   ```
3. Triage, do not mass-rewrite. Most symbol churn is internal refactoring that
   does NOT invalidate conceptual prose — verify against the local clone
   (`~/Workspaces/code-review-sources/<repo>`) before editing. For a MISSING
   symbol, confirm the real current name in the clone and fix the exact citation;
   for a stale claim, correct it with the upstream fact (data over recall).
4. If a series was reconciled against current HEAD, bump its `baseline_commit`
   in `data/upstream-tracking.yaml` (see that file's rules). Add intentional
   non-existent citations (version namespaces etc.) to `cited_symbol_whitelist`.
5. Report: affected-chapter shortlist + confirmed symbol fixes, separating
   verified issues from false positives.
