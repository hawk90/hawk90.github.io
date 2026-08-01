# Findings

## 2026-08-01 baseline

- `npm run check` initially reported 76 errors across Astro configuration,
  configuration narrowing, admin lifecycle callbacks, and author/social types.
  Those errors are now resolved without disabling or weakening the check.
- `npm run build` completes the static build path after the check run.
- `.github/workflows/deploy.yml` restores a `node_modules` cache and skips
  `npm ci` when the cache hits. This makes the cached directory part of the
  build input rather than treating `package-lock.json` as authoritative.
- `npm run audit:antipatterns` records open P0 findings for browser token
  storage, OAuth deployment boundary, and raw HTML insertion review.
- The successful build still reports pre-existing tag route conflicts for
  `arm`, `c`, `concurrency`, `debugging`, `elf`, `jtag`, and `stl`. These do
  not fail the build, but need route-generation ownership analysis in a later
  phase before warnings can be promoted to CI failures.
