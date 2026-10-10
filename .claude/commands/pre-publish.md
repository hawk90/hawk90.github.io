---
name: pre-publish
description: Run the integrated publish gate (CLAUDE.md §14 stage ④) on a series dir/file, or on all published content. Blocks on ASCII diagrams, TikZ overlap heuristic, tone mixing, known falsehoods; flags prose-in-code, translationese, hallucination and cited-symbol candidates for review.
argument-hint: "[path — series dir or file; empty = all published]"
allowed-tools: Bash, Read, Grep, Glob
---

# Pre-publish gate

Run the blog's pre-publish verification for `$ARGUMENTS` (a series directory or
file). If no path is given, audit all published content.

## Steps

1. Run the integrated gate:
   ```bash
   ./scripts/audit-publish-gate.sh $ARGUMENTS
   ```
2. Read the output. **Blocking** checks (ASCII box diagrams, TikZ text-proximity
   heuristic, Tone A/B mixing, known falsehoods, internal link rot, series
   integrity, a missing checker or a checker that errors) must pass — if any fail, fix the offending file per
   §6/§1 and re-run. Do not publish while blocked.
3. **Informational** checks are candidates, not violations:
   - Hallucination candidates (§10, 7 categories) and cited-symbol MISSING —
     verify each against upstream/known-facts before trusting. Cited-symbol
     "SKIPPED" means no upstream clone was present and nothing was checked.
     The gate's checks are regexes: none of them catches an invented number,
     command output or behaviour. Those need `/fact-check-round`. For a deeper pass,
     hand the candidates to the `hallucination-triage` agent.
   - Korean prose in code blocks (§5) and translationese (§2) — warn-only; hand
     prose candidates to the `korean-prose-critic` agent.
   - Image coverage — review but non-blocking.
   - `--strict` turns every warn stage into a block, not only hallucination.
4. Report a concise verdict: blocking pass/fail, and the shortlist of candidates
   a human should confirm. Never claim "all clear" if candidates were surfaced —
   say what still needs a human check.

Do NOT flip `draft: false` yourself. Publishing is the user's decision (§13).
