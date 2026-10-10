---
name: fact-check-round
description: Fact-check one published series chapter by chapter against primary sources (CLAUDE.md §14 stage ③). Wrong → fix, unsupported → delete or TBD, one commit per chapter with its sources, then PR → CI → merge → deploy check. Use for the published fact-check rounds, not for drafts.
argument-hint: "<series directory under src/content/blog>"
allowed-tools: Bash, Read, Edit, Grep, Glob, WebFetch, WebSearch
---

# Fact-check round

Series: `$ARGUMENTS`. Only published chapters (`draft: false`) are in scope.

The regex gates (`audit-suspect-claims`, `verify-known-facts`, cited symbols)
cannot see an invented number, command output or behaviour; every error fixed in
the HBM, CXL and embedded rounds was of that kind. This round is the check that
does see them, so it is done claim by claim, from data, never from recall.

## Setup

1. Branch from `origin/main` (a worktree is fine). Never commit to `main`.
2. List the published chapters in reading order (by `seriesOrder`; series may
   nest chapters in subdirectories):
   ```bash
   grep -rL '^draft: true' --include='*.md' "$ARGUMENTS" \
     | xargs grep -H '^seriesOrder:' | sort -t: -k3 -n | cut -d: -f1
   ```
   Drafts are out of scope; never flip `draft:` (§13).
3. Collect the primary sources before reading the first chapter: the spec
   (revision and date), the upstream repository at a pinned commit, the man
   pages or the tool source that prints the output the posts quote. If the
   series is in `data/upstream-tracking.yaml`, fetch its clone
   (`python3 scripts/audit-upstream-freshness.py --fetch --series <id>`).

## Per chapter

1. List every checkable claim: numbers and units, names and expansions, spec
   sections, API/struct/Kconfig/env names, command lines and their output, error
   messages, version and date claims, "always/never/standard/typically N" claims.
2. Check each against a primary source and keep the location (spec §, `file`
   at commit, man page). Command output must match the format the tool's own
   source prints (e.g. pciutils `ls-ecaps.c` for `lspci -vvv`).
3. Apply the rule:
   - **Wrong** → correct it to what the source says.
   - **Unsupported** (no source found, or an invented example/log/output) →
     delete the prose. Do not soften it ("보통", "~할 수 있습니다"): a hedged
     version is a new claim with no more source than the old one.
   - An unsupported **table cell** → `TBD`; a value the vendor never publishes
     → `—` with a note saying so.
   - A "typical" number or an absolute ("반드시", "표준", "N%의 사고") with no
     source is unsupported.
   - Trace a quoted source to its origin; a secondary page can be the one that
     is wrong.
4. A precise wrong token (invented symbol, wrong expansion, fabricated message)
   goes into `data/known-falsehoods.yaml` with `source` and `fixed_in`, then:
   ```bash
   npm run audit:falsehoods -- --include-drafts
   ```
   Hits in another *published* series are fixed in this round as their own
   commits; hits in drafts are left for that series.
5. If you renamed a heading, find links to its old anchor
   (`grep -rn '<chapter-slug>#' src/content/blog`); `audit:anchors` in
   `verify:release` fails on them after the build.
6. Run the gate on the chapter: `./scripts/audit-publish-gate.sh <file>`.
7. Commit the chapter alone. The message body is the evidence and is required:
   ```
   fix(content): fact-check <Series> Ch N against <sources>

   Wrong, corrected:
   - "<old claim>": <what the source says> (<source location>).

   Unsupported, removed: <claims>.

   Sources: <spec rev §…; repo@commit path; man page>.
   ```
   A subject-only commit ("Qualify … guidance") leaves the next reviewer no way
   to tell a checked change from a guess.

## Close the round

1. Update the series' source footer to the sources actually used (CXL #61).
2. If you verified against a newer upstream revision, move the series baseline
   in `data/upstream-tracking.yaml` in its own `chore(data)` commit.
3. `npm run verify:release`, push, open the PR listing per-chapter results.
4. After CI passes: merge as the user has instructed, then confirm the deploy
   workflow succeeded and spot-check one fixed page on the live site.
5. Record anything found but out of scope (other series, drafts) in the PR
   description, not silently.
