---
name: phase-run
description: Execute one bounded Claude remediation batch from the active phase packet and leave an auditable handoff.
argument-hint: "[phase number, e.g. 01]"
allowed-tools: Bash, Read, Edit, Grep, Glob
---

# Run a remediation phase batch

1. Read `claude/WORKFLOW.md`, `claude/phase-$ARGUMENTS/TASK.md`, `CONTEXT.md`, and `STATE.json`.
2. Work only on `activeTasks` in `STATE.json`; do not activate the next batch yourself.
3. Before editing, write concrete code-path findings to `FINDINGS.md`.
4. Implement the smallest safe change set and run the required verification.
5. Update `CHANGES.md`, `VERIFICATION.md`, and `STATE.json` with evidence.
6. Finish using the handoff format required by `claude/WORKFLOW.md`.

Do not claim a phase complete from task titles alone. A task is complete only
when its completion criteria and verification evidence are recorded.
