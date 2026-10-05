# Context

- [Shared workflow](../WORKFLOW.md)
- [Findings that motivated this workstream](./FINDINGS.md)
- Publish gate: `scripts/audit-publish-gate.sh` (hook: `lefthook.yml` pre-commit/pre-push)
- Release verification: `scripts/verify-release.mjs` (`npm run verify:release`, CI deploy)
- Content schema (draft default false): `src/content.config.ts`

Before changing code, record in `FINDINGS.md` the exact call sites (npm scripts,
hooks, gate steps, skills under `.claude/`) of each tool in the active batch.
