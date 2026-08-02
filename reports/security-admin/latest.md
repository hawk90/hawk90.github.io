# Security & admin remediation gate

Generated deterministically from the current source tree and `dist`.

> `open` P0 findings fail `npm run gate:security-admin`. `manual-review` requires an explicit deployment/design decision before enabling the affected capability.

## SEC-ADMIN-01 — passed

- Priority: P0
- Browser persistence of an access token
- Required remediation: Move credentials to a server-owned session or disable browser-side admin writes in static deployments.

## SEC-ADMIN-02 — passed

- Priority: P0
- Raw HTML insertion sinks
- Required remediation: Replace string HTML rendering with DOM APIs, or sanitize a narrowly documented trusted input before insertion.

## SEC-ADMIN-03 — passed

- Priority: P0
- OAuth server secret in a static site
- Required remediation: Do not keep OAuth callback code or GitHub client secrets in this static deployment.

## SEC-ADMIN-04 — passed

- Priority: P1
- Static deployment OAuth compatibility
- Required remediation: Static output must stay PAT-only; move OAuth to a separately deployed server application.

## SEC-ADMIN-05 — passed

- Priority: P1
- OAuth route source in a static site
- Required remediation: Remove API OAuth routes from static deployments; they can only emit broken, pre-rendered redirects.

## SEC-ADMIN-06 — passed

- Priority: P1
- OAuth endpoint in production artifact
- Required remediation: Production artifact must not contain /api/auth routes when this project builds as a static site.
