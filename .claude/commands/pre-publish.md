---
name: pre-publish
description: Run the integrated publish gate (CLAUDE.md §14 stage ④) on a series dir/file, or on all published content. Blocks on ASCII diagrams, TikZ overlap, prose-in-code, tone mixing; flags hallucination + cited-symbol candidates for review.
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
2. Read the output. **Blocking** checks (ASCII box diagrams, TikZ text overlap,
   Korean prose in code blocks, Tone A/B mixing) must pass — if any fail, fix the
   offending file per CLAUDE.md §2/§6/§1 and re-run. Do not publish while blocked.
3. **Informational** checks are candidates, not violations:
   - Hallucination candidates (§10, 7 categories) and cited-symbol MISSING —
     verify each against upstream/known-facts before trusting. For a deeper pass,
     hand the candidates to the `hallucination-triage` agent.
   - Series integrity warnings, image coverage — review but non-blocking.
4. Report a concise verdict: blocking pass/fail, and the shortlist of candidates
   a human should confirm. Never claim "all clear" if candidates were surfaced —
   say what still needs a human check.

Do NOT flip `draft: false` yourself. Publishing is the user's decision (§13).
