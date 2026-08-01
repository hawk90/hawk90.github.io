# Security & admin workstream handoff

## Scope

This workstream owns browser credential handling, admin HTML rendering, and
the OAuth/static-deployment boundary. Its deterministic source of truth is
[`reports/security-admin/latest.md`](../../reports/security-admin/latest.md).

## Current status

- Open P0 findings must be reduced to zero before this workstream is handed
  off as complete.
- Manual-review findings require an explicit documented deployment decision.

## 2026-08-01 progress

- Completed: `SEC-ADMIN-01` browser credential persistence removal.
  `src/lib/admin/auth.ts` now keeps credentials only in the current tab's
  module memory; refresh requires a new login on the static deployment.
- Completed: `SEC-ADMIN-02` raw HTML insertion removal. Search, admin previews,
  draft lists, and third-party embed cleanup now use DOM APIs. Markdown preview
  fragments block executable/interactive elements and unsafe URL protocols.
- Deployment decision: GitHub Pages is PAT-only (`ADMIN_CONFIG.authMode: 'pat'`).
  OAuth is dormant source for a future hybrid deployment and requires a
  server-adapter review before it can be enabled.
- Manual review: OAuth server-secret boundary remains documented for that future
  hybrid deployment; it is not reachable from the configured static login UI.
- Verified: `npm run audit:security-admin` (P0 2 → 0), `npm run check`
  (0 errors).

## Claude Code handoff template

```text
Completed: SEC-ADMIN-...
Deferred: <IDs and reason>
Changed: <files>
Verified: npm run audit:security-admin; npm run gate:security-admin; npm run check; npm run build
Risks: <none or concrete items>
Next recommended batch: <IDs>
```
