# Repository resilience audit

- PASS — git-object-integrity
- ACCEPTED — recovery-remote (would fail; covered by the backup risk acceptance)
- PASS — pinned-ci-actions
- PASS — reproducible-install
- PASS — build-once-artifact
- PASS — static-artifact-security
- PASS — source-archive-preservation
- PASS — preservation-first-content

  Remotes configured: 1. Recovery needs the objects on a second host, not a second name for the same one.

## External evidence required

- PENDING — account-recovery
- PENDING — emergency-static-host

## Accepted

- ACCEPTED — independent-backup-and-restore-test. Not covered: Both copies depend on one machine and one account. Simultaneous loss — an account taken away while the local disk is gone — destroys everything, and no commit hash helps without objects. account-recovery is deliberately left open because this acceptance leans on it.

## Not applicable

- N/A — domain-dns-recovery: no public/CNAME — the site is served from a github.io subdomain, so there is no DNS to recover. Becomes pending again if a custom domain is added.
