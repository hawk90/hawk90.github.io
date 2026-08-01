---
name: security-admin-run
description: Remediate the security and admin workstream as one bounded Claude Code batch.
allowed-tools: Bash, Read, Edit, Grep, Glob
---

# Security & admin workstream

1. Run `npm run audit:security-admin` and read `reports/security-admin/latest.md`.
2. Read `src/lib/admin/`, `src/pages/admin/`, and `src/pages/api/auth/` before editing.
3. Fix all deterministic open P0 findings as one coherent boundary change; do not suppress rules or weaken the gate.
4. Treat OAuth deployment support as a design boundary: do not expose OAuth in a static build.
5. Run `npm run audit:security-admin`, `npm run gate:security-admin`, `npm run check`, and `npm run build`.
6. Record changed files, residual manual reviews, and command results in
   `claude/security-admin/HANDOFF.md`.

Do not begin unrelated Topic Hub, visual, or content work in this command.
