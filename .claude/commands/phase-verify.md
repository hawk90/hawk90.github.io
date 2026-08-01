---
name: phase-verify
description: Independently verify a completed Claude remediation batch before the manager activates the next one.
argument-hint: "[phase number, e.g. 01]"
allowed-tools: Bash, Read, Grep, Glob
---

# Verify a remediation phase batch

Read the packet's `TASK.md`, `CHANGES.md`, `VERIFICATION.md`, and `STATE.json`.

- Confirm every claimed task has changed files and a command result.
- Re-run the narrowest relevant checks; distinguish unrelated baseline failures.
- Check that no out-of-scope task IDs or later phases were changed.
- Return `approved`, `needs-evidence`, or `regression-found` with exact paths.

Do not edit application code in this command.
