# Security & admin remediation gate

Generated: 2026-08-01T09:11:08.686Z

> `open` P0 findings fail `npm run gate:security-admin`. `manual-review` requires an explicit deployment/design decision before enabling the affected capability.

## SEC-ADMIN-01 — passed

- Priority: P0
- Browser persistence of an access token
- Required remediation: Move credentials to a server-owned session or disable browser-side admin writes in static deployments.

## SEC-ADMIN-02 — passed

- Priority: P0
- Raw HTML insertion sinks
- Required remediation: Replace string HTML rendering with DOM APIs, or sanitize a narrowly documented trusted input before insertion.

## SEC-ADMIN-03 — manual-review

- Priority: P0
- OAuth server secret boundary
- Required remediation: Keep GitHub client secrets in server-only routes and require a hybrid/server deployment before enabling OAuth.
- Evidence: `src/pages/api/auth/callback.ts:40` — `import.meta.env.GITHUB_CLIENT_SECRET`

## SEC-ADMIN-04 — passed

- Priority: P1
- Static deployment OAuth compatibility
- Required remediation: Assert that OAuth is disabled when Astro output is static, or deploy a server adapter before enabling it.
