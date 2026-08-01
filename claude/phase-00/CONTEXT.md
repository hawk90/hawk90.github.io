# Context

- `npm run check` currently reports pre-existing diagnostics; record rather than
  silently suppress them.
- `.github/workflows/deploy.yml` caches `node_modules` and skips `npm ci` on a
  cache hit.
- `npm run audit:antipatterns` writes deterministic findings to the archive.
- Related APs: `AP-SEC-51`, `AP-SEC-52`, `AP-SEC-29`, `AP-T-98`.

Use [the remediation plan](../../archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/README.md) as the planning source.
