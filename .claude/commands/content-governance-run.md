Run the content-governance workflow for exactly one queue item.

1. Run `npm run audit:knowledge-model`. It refreshes the lifecycle, classification, and governance reports while also checking the global terminology, topic, and relation contracts.
2. Read `reports/content-governance/latest.md` and choose only the first item in the requested queue (`lifecycle`, `taxonomy`, or `relations`).
3. Inspect the relevant documents and registry before changing anything. Do not infer factual verification, prerequisites, or evidence from filenames.
4. Make one bounded change, then run the relevant audit plus `npm run test:topics`, `npm run test:relations`, or `npm run check`.
5. Record the decision, evidence, changed files, and verification result in the handoff message. If evidence is insufficient, leave the item as `needs-review` and record why.

Never bulk-mark content as `current`, bulk-create taxonomy IDs, or bulk-create semantic relationships.
