# Repository recovery runbook

This is an operational checklist, not evidence that recovery has already been tested. It deliberately contains no credentials, token values, DNS secrets, or account-recovery codes.

## Scope and ownership

- Source of truth: the Git repository and its verified default branch.
- Published artifact: the GitHub Pages deployment artifact produced by `.github/workflows/deploy.yml`.
- Preservation boundary: source files, published URLs, and frontmatter are retained unless an evidence-backed change is approved separately.
- External systems: Git hosting, DNS registrar/provider, GitHub account recovery, and any emergency static host. Their state cannot be inferred from this repository.

## Recovery priority

1. Preserve the current source and Git history.
2. Restore a readable static site with canonical URLs unchanged.
3. Restore redirect behavior and sitemap/RSS discovery.
4. Restore optional integrations such as comments and analytics only after the static site is healthy.

## Required external evidence

Record the date, responsible person, non-secret evidence location, and result for each item. A failed test is a finding, not a reason to erase the record.

| Control | Anti-patterns | Minimum evidence | Pass condition |
| --- | --- | --- | --- |
| Independent backup and restore test | AP-R-01–16 | A restore test from a copy outside the primary Git-hosting failure domain | Fresh clone/artifact restores, `npm ci`, and the release verification completes without using the original workspace |
| Domain and DNS recovery | AP-R-17–20, AP-R-95–96 | Registrar/provider owner, renewal state, export of required DNS record names (values redacted), and recovery exercise | The primary domain can be pointed to the approved static host while preserving canonical URL policy; emergency host is noindex |
| Account recovery | AP-R-06, AP-R-30, AP-R-98–99 | Named owners, recovery method location, and a non-secret confirmation that access recovery was exercised | A maintainer can regain required Git-hosting/DNS access without a browser-stored production credential |
| Emergency static hosting | AP-R-08–15, AP-R-20 | Provider and deployment procedure, plus a successful artifact deployment | A known-good static artifact can be published without a manual rebuild of unknown local state |

## Local rehearsal

Run these from a fresh clone or disposable worktree. Do not paste secret values into terminal history or reports.

```bash
npm ci
npm run gate:repository
npm run audit:repository-resilience
npm run audit:content-portability
npm run verify:release
```

Then inspect the generated site, representative stable `/blog/<id>` URLs, sitemap, RSS, redirect behavior, and the static admin boundary. If a deployment is needed, use the CI workflow rather than a hand-assembled artifact.

## Incident record

For every recovery exercise or incident, create a dated record outside generated reports with:

- trigger and failure classification;
- affected source, artifact, URLs, and external systems;
- chosen recovery priority and why;
- commands/checks run and their results;
- root cause or an explicit statement that it is not yet known;
- residual risk, owner, and reassessment date.

Do not mark the AP-R category complete until the external evidence above exists and the relevant atomic registry items have individual evidence-backed dispositions.
