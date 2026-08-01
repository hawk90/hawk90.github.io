# Phase 0 · Batch 1 — CI and project governance baseline

## Active task IDs

- `PH-00-01` CI baseline classification
- `PH-00-02` Reproducible dependency installation
- `PH-00-03` Layered CI quality gates
- `PH-00-04` Static artifact security assertion

## Goal

Make CI an accurate signal before any architectural remediation. Do not fix
unrelated product features in this batch; classify failures, make installation
reproducible, and add narrow gates with actionable output.

## Completion criteria

1. Existing `npm run check` failures are classified as baseline, fixed, or
   newly introduced — with exact file ownership.
2. CI does not treat a restored `node_modules` cache as a substitute for a
   lockfile-verified install.
3. Build, type/content checks, and anti-pattern audit run as separately visible
   CI steps.
4. A static artifact assertion checks the intended admin/OAuth boundary.
5. The Phase 0 handoff names any remaining baseline failures; it does not hide
   them by weakening checks.

## Out of scope

- Domain model, Topic Hub, UI, content migration, or broad TypeScript cleanup.
- Changing deployment provider or enabling OAuth/hybrid output without a
  separate approved task.
