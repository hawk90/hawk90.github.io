---
name: security-admin-verify
description: Independently verify the security and admin remediation gate.
allowed-tools: Bash, Read, Grep, Glob
---

# Verify the security & admin workstream

1. Run `npm run gate:security-admin`.
2. Inspect every manual-review item in `reports/security-admin/latest.md`.
3. Run `npm run check` and `npm run build`.
4. Return `approved` only when no deterministic P0 finding remains and OAuth is not exposed by a static deployment.

Do not edit application code in this command.
