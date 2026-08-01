# Claude Code execution workflow

You are the implementation agent. Work only on the active packet under
`claude/phase-XX/`; do not begin another phase or batch unless its packet is
explicitly activated.

## Required loop

1. Read `TASK.md`, `CONTEXT.md`, and the active phase source before editing.
2. Inspect the current implementation and record concrete findings in `FINDINGS.md`.
3. Implement only the task IDs named in `TASK.md`.
4. Run the listed verification commands. Do not claim success for a failed command.
5. Record file-level changes, decisions, and remaining risks in `CHANGES.md`.
6. Update the relevant task status and append command output summaries to `VERIFICATION.md`.

## Guardrails

- Preserve the lossless source archive under `archives/`; it is reference data, not application code.
- Do not make broad refactors, dependency upgrades, visual redesigns, or content rewrites unless the active task requires them.
- Keep a task `pending` when evidence is insufficient. Use `blocked` with a concrete reason rather than guessing.
- Treat `npm run check` failures already present outside the changed files as baseline issues; record them, but do not silently fix unrelated errors.
- Every completed task needs: changed files, a verification command, and a short result.

## Cross-phase workstreams

- For the security and admin boundary, use `/security-admin-run` rather than
  selecting unrelated phase tasks. It begins with `npm run audit:security-admin`
  and cannot hand off while `npm run gate:security-admin` reports an open P0.
- Use `/security-admin-verify` as an independent read-only check before
  considering the workstream complete. Record its outcome in
  `claude/security-admin/HANDOFF.md`.

## Handoff format

End each run with this exact summary:

```text
Completed: PH-...
Deferred: PH-...
Changed: <files>
Verified: <commands and result>
Risks: <none or concrete items>
Next recommended batch: <IDs>
```
