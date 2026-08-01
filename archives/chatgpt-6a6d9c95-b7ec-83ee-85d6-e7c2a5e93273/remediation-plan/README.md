# Remediation plan

> These values are initial routing heuristics, not completion claims. Confirm priority, effort, and task-level dependencies from real findings before implementation.

## Anti-pattern queue

| Priority | Items | Meaning |
| --- | ---: | --- |
| P0 | 100 | risk/security first |
| P1 | 530 | structural reliability |
| P2 | 617 | planned improvement |
| P3 | 125 | defer unless needed |

- Detailed queue: [antipattern-triage.json](antipattern-triage.json)
- Phase dependency graph: [phase-dependencies.json](phase-dependencies.json)

## Phase dependency graph

```text
PHASE-00 (start)
PHASE-01 ← PHASE-00
PHASE-02 ← PHASE-01
PHASE-03 ← PHASE-02
PHASE-04 ← PHASE-03
PHASE-05 ← PHASE-04
PHASE-06 ← PHASE-05
PHASE-07 ← PHASE-06
```
