# Anti-pattern audit results

> Generated from deterministic repository rules. `open` needs remediation; `manual-review` means the rule needs an artifact or deployment check.

## AP-SEC-52 — open

- Priority: P0
- Recommended phase: PHASE-04
- PAT stored in browser localStorage
- Evidence: `src/lib/admin/auth.ts:164` — `localStorage.setItem(STORAGE_KEYS.accessToken, accessToken`

## AP-SEC-51 — open

- Priority: P0
- Recommended phase: PHASE-04
- OAuth secret/server route boundary requires deployment review
- Evidence: `src/pages/api/auth/callback.ts:40` — `import.meta.env.GITHUB_CLIENT_SECRET`

## AP-SEC-29 — open

- Priority: P0
- Recommended phase: PHASE-04
- Raw HTML insertion requires sanitizer review
- Evidence: `src/components/blog/Disqus.astro:61` — `.innerHTML =`
- Evidence: `src/components/blog/Utterances.astro:32` — `.innerHTML =`
- Evidence: `src/components/blog/Utterances.astro:61` — `.innerHTML =`
- Evidence: `src/components/common/SearchModal.astro:262` — `.innerHTML =`
- Evidence: `src/components/common/SearchModal.astro:268` — `.innerHTML =`
- Evidence: `src/components/common/SearchModal.astro:281` — `.innerHTML =`
- Evidence: `src/components/common/SearchModal.astro:328` — `.innerHTML =`
- Evidence: `src/components/common/SearchModal.astro:333` — `.innerHTML =`
- Evidence: `src/components/common/SearchModal.astro:344` — `.innerHTML =`
- Evidence: `src/lib/admin/post-document.ts:65` — `.innerHTML =`
- Evidence: `src/pages/admin/edit.astro:533` — `.innerHTML =`
- Evidence: `src/pages/admin/edit.astro:543` — `.innerHTML =`
- Evidence: `src/pages/admin/index.astro:179` — `.innerHTML =`
- Evidence: `src/pages/admin/new.astro:445` — `.innerHTML =`
- Evidence: `src/pages/admin/new.astro:455` — `.innerHTML =`

## AP-T-98 — manual-review

- Priority: P1
- Recommended phase: PHASE-04
- Admin artifact exclusion needs an explicit build assertion
