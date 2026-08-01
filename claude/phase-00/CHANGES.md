# Changes

## PH-00-02 · Reproducible dependency installation

- Changed `.github/workflows/deploy.yml` to cache the npm download cache through
  `actions/setup-node`, while running `npm ci` on every build.
- Rationale: `package-lock.json`, not a restored `node_modules` directory, is
  now the authoritative dependency input.
- Rollback: remove `cache: npm`; do not restore the former conditional install.

## PH-00-01 · Check baseline repair

- Repaired configuration helper return types so disabled and enabled feature
  variants are checked as their public unions rather than over-narrow literals.
- Made page-load lifecycle callbacks support async initializers and preserve
  cleanup handling across Astro navigation.
- Moved the blog sidebar browser-only lifecycle import into its client script,
  guarded Giscus configuration by provider, and made optional category icons
  safe for the tree component.
- Normalized the Shiki language list at the Astro integration boundary and
  corrected the browser global cast used by theme reactivity.
- Verification: `npm run check` now passes with 0 errors; `npm run build`
  succeeds.
