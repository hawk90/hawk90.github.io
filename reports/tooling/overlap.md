# Tooling command overlap

- Package scripts: 101
- Shared command profiles: 7
- Unclassified profiles: 0

Shared command profiles are not automatically duplicates. Audit/gate and preview/apply variants are intentional; unclassified profiles require review before adding another alias.

## Expected variant — og, og:force, og:prune, prebuild

- Normalized command: `node scripts/build-og.mjs`

## Expected variant — diagrams, diagrams:force

- Normalized command: `bash scripts/build-diagrams.sh`

## Expected variant — audit:classification, gate:classification

- Normalized command: `node scripts/audit-content-classification.mjs`

## Expected variant — audit:tooling, gate:tooling

- Normalized command: `node scripts/audit-tooling.mjs`

## Expected variant — audit:secrets, gate:secrets

- Normalized command: `node scripts/scan-secrets.mjs`

## Expected variant — audit:security-admin, gate:security-admin

- Normalized command: `node scripts/security-admin-gate.mjs`

## Expected variant — audit:upstream, audit:upstream:json

- Normalized command: `python3 scripts/audit-upstream-freshness.py`
