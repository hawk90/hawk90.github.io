# Archived remediation batch scripts

One-shot scripts that recorded a batch of governance dispositions into the
registries under `archives/chatgpt-6a6d9c95-…/remediation-plan/`. Each ran
once; rerunning them now finds 0 eligible items or fails its own drift guard
(the items they record are already dispositioned). They are kept because
the registries' evidence and commit history refer to what they did.

They are not npm scripts and are not part of any check. Paths inside them
are relative to the repository root, as they were when they ran.

Living governance tooling stays in `scripts/` (record-repository-controls,
record-quality-controls, record-repository-external-evidence, the audit-*
and build-* registry scripts).
