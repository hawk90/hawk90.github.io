---
name: audit-freshness
description: Check upstream drift + cited-symbol existence + prose staleness for published series (CLAUDE.md §14 stage ③⑥). Finds chapters lagging upstream code/spec changes, API names renamed/removed/invented, and future-tense prose that has since resolved.
argument-hint: "[series id — folly|abseil|cxl_internals|pcie_deep_dive; empty = all]"
allowed-tools: Bash, Read, Grep, Glob
---

# Upstream freshness + cited-symbol + prose-staleness audit

Assess how far tracked series have drifted from upstream, whether any cited
library symbol no longer exists, and whether any *future-tense prose* has since
resolved (a "곧 출시" product that shipped, a "YYYY년 현재" anchor that aged).
Series id (optional): `$ARGUMENTS`.

## Steps

1. **Drift** — which chapters lag upstream code/spec (fetches upstream):
   ```bash
   python3 scripts/audit-upstream-freshness.py --top 15 ${ARGUMENTS:+--series $ARGUMENTS}
   ```
2. **Cited-symbol existence** — renamed/removed/invented API names:
   ```bash
   python3 scripts/audit-cited-symbols.py ${ARGUMENTS:+--series $ARGUMENTS}
   ```
3. **Prose staleness** — future-tense claims / dated anchors that may have
   resolved (roadmap SKU shipped, spec ratified, "N년 현재" year passed).
   Covers *all* published series, not only upstream-tracked ones:
   ```bash
   python3 scripts/audit-prose-staleness.py
   ```
   Each hit is a *watch item*, not an error — open it and confirm it still holds
   as of today. When a "예정/미발표" claim has resolved, correct it with the real
   release fact (verify against a primary source — data over recall) and, if it
   is a registered SKU, move it from `*_roadmap` to `*_verified` in
   `data/known-facts.yaml`.
4. Triage, do not mass-rewrite. Most symbol churn is internal refactoring that
   does NOT invalidate conceptual prose — verify against the local clone
   (`~/Workspaces/code-review-sources/<repo>`) before editing. For a MISSING
   symbol, confirm the real current name in the clone and fix the exact citation;
   for a stale claim, correct it with the upstream fact (data over recall).
5. If a series was reconciled against current HEAD, bump its `baseline_commit`
   in `data/upstream-tracking.yaml` (see that file's rules). Add intentional
   non-existent citations (version namespaces etc.) to `cited_symbol_whitelist`.
6. Report: affected-chapter shortlist + confirmed symbol fixes + resolved
   staleness items, separating verified issues from false positives.
