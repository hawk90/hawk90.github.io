# Repository resilience audit

- PASS — git-object-integrity
- FAIL — recovery-remote
- PASS — pinned-ci-actions
- PASS — reproducible-install
- PASS — build-once-artifact
- PASS — static-artifact-security
- PASS — source-archive-preservation
- PASS — preservation-first-content

  Remotes configured: 1. Recovery needs the objects on a second host, not a second name for the same one.

## External evidence required

- PENDING — independent-backup-and-restore-test
- PENDING — account-recovery
- PENDING — emergency-static-host

## Not applicable

- N/A — domain-dns-recovery: no public/CNAME — the site is served from a github.io subdomain, so there is no DNS to recover. Becomes pending again if a custom domain is added.
