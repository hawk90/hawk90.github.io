# Supplemental anti-pattern candidates

> These are review candidates discovered from the current repository. They are
> **not** part of the canonical 1,372-item corpus until `phase-guardian` decides
> `promote`, `merge`, or `reject`.

## SUP-SEC-001 — OAuth State Cookie Without `Secure`

- Evidence: `src/pages/api/auth/github.ts:42`
- Candidate priority: P0 · effort: S
- Related corpus: `AP-SEC-57` (OAuth state), `AP-SEC-58` (redirect URI)
- Why review: the OAuth state cookie is `HttpOnly` and `SameSite=Lax`, but does
  not declare `Secure`; HTTPS-only deployment should make that explicit.
- Promote when: the production OAuth route can be served over HTTPS and the
  cookie policy is not centrally enforced elsewhere.
- Merge when: existing OAuth-state guidance already requires all cookie flags.

## SUP-SEC-002 — OAuth Flow Assumes a Server Route in Static Output

- Evidence: `src/pages/api/auth/{github,callback}.ts` both export `prerender = true`; `astro.config.mjs` sets `output: 'static'`.
- Candidate priority: P1 · effort: M
- Related corpus: `AP-SEC-51`, `AP-SEC-56`, `AP-R-30`
- Why review: comments describe a server-side OAuth exchange, while the default
  deployment mode cannot serve the route as a server endpoint.
- Promote when: the UI can expose a non-functional OAuth path in static builds.
- Merge when: this is fully covered by the existing static-admin/OAuth boundary item.

## SUP-SEC-003 — Authorization Normalization Differs by Code Path

- Evidence: `src/lib/admin/auth.ts:isAllowedUser()` lowercases logins; `src/pages/api/auth/callback.ts:92` uses exact `includes()`.
- Candidate priority: P1 · effort: S
- Related corpus: `AP-SEC-56`
- Why review: the same allowlist can yield different results between browser and
  callback paths, which makes authorization policy non-canonical.
- Promote when: `ADMIN_CONFIG.allowedUsers` is not already normalized at input.

## SUP-SEC-004 — Fragment-to-Storage Token Handoff Has No Explicit Threat Boundary

- Evidence: `src/pages/api/auth/callback.ts:102`; `src/lib/admin/auth.ts:213-241`.
- Candidate priority: P0 · effort: M
- Related corpus: `AP-SEC-52`, `AP-SEC-59`
- Why review: a token is delivered in a fragment, then persisted in browser
  storage. Fragments avoid server logs but do not protect against same-origin XSS.
- Promote when: the admin is intended for more than a local personal workflow.
- Merge when: it is a concrete instance of `AP-SEC-52` with no distinct remedy.

## SUP-T-001 — Security Boundary Has No Deployment-Mode Regression Test

- Evidence: `astro.config.mjs:output`; `src/pages/api/auth/*.ts`.
- Candidate priority: P1 · effort: M
- Related corpus: `AP-T-98`
- Why review: static and hybrid deployments have different admin/OAuth security
  boundaries, but no build artifact check asserts the intended mode.
- Promote when: no CI/build check validates the built admin artifact and routes.
- Merge when: `AP-T-98` already covers the exact artifact assertion required.

## SUP-SEC-005 — Hand-Rolled HTML Sanitizer Without an Allowlist

- Evidence: `src/lib/admin/post-document.ts:sanitizePreviewHtml()`
- Candidate priority: P0 · effort: M
- Related corpus: raw HTML / `innerHTML` security items
- Why review: the sanitizer blocks several tags and `javascript:` URLs, but it
  does not define an explicit element/attribute/URL-scheme allowlist. New HTML
  features or non-`javascript:` dangerous protocols can bypass a denylist over time.
- Promote when: preview HTML can receive untrusted or remotely sourced Markdown.
- Merge when: the existing raw-HTML entry already requires an allowlist-based
  sanitizer and this is only its repository-specific finding.

## SUP-T-002 — Dependency Install Skipped on Restored `node_modules` Cache

- Evidence: `.github/workflows/deploy.yml:cache node_modules`; install step is
  conditional on cache miss.
- Candidate priority: P1 · effort: S
- Related corpus: dependency lockfile and reproducible-build items
- Why review: a build may treat a restored dependency directory as authoritative
  instead of validating it with `npm ci`; cache corruption or incomplete restore
  becomes a different failure mode from a clean lockfile install.
- Promote when: CI is expected to prove reproducible builds rather than only
  accelerate deployments.
- Merge when: the existing reproducible-install guidance already bans this pattern.
