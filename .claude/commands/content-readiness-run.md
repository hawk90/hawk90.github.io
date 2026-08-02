---
name: content-readiness-run
description: Refresh the global content-quality queue and review one explicitly requested candidate.
argument-hint: "[candidate path or queue priority]"
allowed-tools: Bash, Read, Grep, Glob, Edit
---

# Run the content readiness workflow

1. Run `npm run audit:content-readiness` and read `reports/content-readiness/latest.md`.
2. Treat P1 staleness signals as verification work, P2 fact-density signals as source-review work, and P3 visual-aid signals as UX candidates. They are not automatic defects.
3. If no candidate was requested, report the queue summary; do not choose and edit a document autonomously.
4. For a requested candidate, inspect its full document and primary evidence before editing. Preserve the published text and URL by default: never delete, merge, bulk-rewrite, draft, archive, rename, or mark a document superseded to clear a queue item. Never bulk-mark `lastVerified`, infer evidence status, or add decorative images solely to clear a queue item.
5. If metadata is approved for change, use only a preview-first, explicit-`--apply` migration script with an affected-file report and post-change verifier; do not hand-edit frontmatter. Re-run `npm run audit:content-readiness` and the narrowest applicable check. Record the decision and evidence.
