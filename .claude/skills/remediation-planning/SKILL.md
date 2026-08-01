---
name: remediation-planning
description: Use for planning or advancing anti-pattern remediation phases without losing AP/PH traceability.
---

# Remediation planning skill

Start from `archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/README.md`.

Use `antipattern-triage.json` only as initial routing, then revise priority and
effort from real code findings. Respect `phase-dependencies.json`: later phases
may be inspected but not implemented before their dependency gate is approved.

For each decision, retain the AP ID, PH task ID, affected files, verification
command, and residual risk in the phase packet. Never collapse semantic
anti-pattern relationships into one task without preserving both IDs.
