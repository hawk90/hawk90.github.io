# Memory Diagnostics Chapters 1–7 remediation record

Date: 2026-10-22. Scope: the seven published Memory Diagnostics articles, selected named-example verifier, and this evidence bundle. Canonical status for all seven articles is `remediated` in the JSON record. Tracked HEAD baseline: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. These files already had worktree edits when this continuation began; the exact stage-start SHA-256 was not captured. JSON `beforeSha256` values therefore mean tracked HEAD, and `handoffStartSha256` is null with that limitation recorded. The JSON also stores final SHA-256 values. URL, date, draft, and series order were preserved. Ch 2 and Ch 4 description corrections are explicitly recorded below. Score files and published summary were not edited or recalculated.

## Chapter 1 — process memory accounting

1. **Context and scope:** RSS/PSS, smaps, OOM and reclaim indicators.
2. **Signal and refutation:** PSS and mapping counters could be read as exact system totals or leak proof. Procfs and cgroup accounting show they have narrower scopes and are diagnostic signals.
3. **Cause and alternatives:** The draft conflated process mappings with system-wide accounting; shared mappings, kernel/page-cache use, allocator retention, and concurrent mapping changes are alternatives.
4. **Evidence:** Compared Linux procfs and cgroup v2 documentation. Qualified PSS, `Private_Dirty`, `MemAvailable`, OOM scoring, smaps races/THP, and free-after-RSS behavior; added primary references.
5. **Sample scope:** Full chapter and commands read. Linux `/proc`, cgroup, and NUMA commands were not executed on this Darwin host.
6. **Decision:** Remediated: counters are estimates and trends, not exact totals or standalone leak diagnoses.
7. **Smallest safe change and rollback:** Clarifications and references in this article only; preserve route/date/draft/order. Rollback boundary is this file.
8. **Verification and residual risk:** Article gate, inline-math, and diff checks pass. No Linux kernel/cgroup execution; no single process counter captures all system memory.

## Chapter 2 — heaptrack

1. **Context and scope:** Linux allocator-call tracing, CLI/GUI workflows, and attach mode.
2. **Signal and refutation:** Universal interception, fixed speedups, exact leak proof, stable attach, and RSS-equivalent GUI claims were too broad. Official README/source documents narrower behavior and caveats.
3. **Cause and alternatives:** Heaptrack observes supported allocator calls and can miss custom pools. Attach risk, compression and analysis options depend on build/version; outstanding allocations alone do not prove logical leaks.
4. **Evidence:** Compared KDE heaptrack README and tracking wrapper. Corrected scope, output compression, `--record-only`, attach warning; removed unsupported environment options and compare command. The article description was manually corrected to match its allocation-stack/hotspot and outstanding-allocation scope.
5. **Sample scope:** Full chapter and named CLI examples reviewed. Linux heaptrack is absent; no trace was recorded or analyzed.
6. **Decision:** Remediated without claiming heaptrack is a general leak detector.
7. **Smallest safe change and rollback:** Description/body corrections only; slug/date/draft/order preserved. Rollback boundary is this file.
8. **Verification and residual risk:** Selected verifier, gates, inline-math pass. Runtime traces, custom allocator coverage, attach, and distro CLI remain untested.

## Chapter 3 — jemalloc and TCMalloc

1. **Context and scope:** jemalloc, gperftools TCMalloc, Google TCMalloc, Rust allocator and profile formats.
2. **Signal and refutation:** Allocator rankings, savings, defaults, and workload recommendations lacked evidence. Primary documentation shows build- and workload-dependent behavior.
3. **Cause and alternatives:** Statistical sampling is not an exact census; allocator forks/profile formats differ; Rust's default allocator is unspecified; Go pprof is Go-runtime scoped.
4. **Evidence:** Compared official jemalloc profiling, gperftools heap profiler, Google TCMalloc overview, and Rust allocator docs. Corrected sample/default claims and removed blanket workload rankings.
5. **Sample scope:** Full chapter/configuration examples read. No Linux allocator/profile runtime or benchmark was available.
6. **Decision:** Remediated: select only after identical representative workload comparisons and build/version support checks.
7. **Smallest safe change and rollback:** Article prose/table only; route/date/draft/order preserved. Rollback boundary is this file.
8. **Verification and residual risk:** Gates, inline-math, verifier and diff pass. `jeprof` exists but allocator runtime and Linux profile collection were unavailable.

## Chapter 4 — glibc tools

1. **Context and scope:** `MALLOC_CHECK_`, perturbation, mtrace, mcheck, mallinfo2 and tunables.
2. **Signal and refutation:** The one-line check framing omitted the glibc 2.34+ debug-library requirement and overstated check modes, byte patterns, and RSS return guarantees.
3. **Cause and alternatives:** Availability depends on glibc version/configuration and `libc_malloc_debug`; debug checks are limited and may change behavior. `mcheck` must be enabled before the first allocation.
4. **Evidence:** Compared GNU libc manual pages for heap checking, tracing and tunables. Corrected preload examples, mode interpretation, mtrace and mcheck conditions, and allocator-statistics/trim claims. The description was manually corrected to disclose version/debug-library conditions.
5. **Sample scope:** Full chapter and code/shell examples read. No GNU/Linux glibc runtime is available here; diagnostic commands were not executed.
6. **Decision:** Remediated; describe these as limited diagnostic options, not production safety guarantees.
7. **Smallest safe change and rollback:** Description/body only; slug/date/draft/order preserved. Rollback boundary is this file.
8. **Verification and residual risk:** Gate, inline-math, diff checks pass. Runtime behavior and library paths remain platform/version dependent.

## Chapter 5 — production leak diagnosis

1. **Context and scope:** PSS trends, profiler sampling, BCC, drgn, cgroup, PSI and graceful degradation.
2. **Signal and refutation:** Trend slopes and outstanding stacks could be mistaken for proof; `ru_maxrss`, PSI, cgroup limits and automatic recovery were overclaimed.
3. **Cause and alternatives:** Signals have different scopes/windows; `ru_maxrss` is maximum RSS, profiler collection has overhead, cgroup reclaim/OOM is group-scoped, and a one-minute 50% trigger misses slow leaks.
4. **Evidence:** Compared kernel PSI/cgroup docs, systemd-oomd docs, and profiler interfaces. Qualified trend interpretation, overhead, PSI some/full, cgroup behavior, and the narrow automatic-dump trigger; removed an unsafe current-RSS/trim example.
5. **Sample scope:** Full article and examples read. Linux PSI/BCC/drgn/cgroup/JVM/Python and allocator-profiler paths were not run.
6. **Decision:** Remediated: use multiple scoped signals; characterize auto-dump as one narrow trigger, not general leak detection.
7. **Smallest safe change and rollback:** Article body only; route/date/draft/order preserved. Rollback boundary is this file.
8. **Verification and residual risk:** Gates, inline-math and selected verifier pass. Production impact and all Linux/runtime integrations remain untested.

## Chapter 6 — CXL memory diagnostics

1. **Context and scope:** NUMA exposure, `cxl-cli` health/poison/event commands, and DAMON access data.
2. **Signal and refutation:** DAMON access output could be read as proof of CXL tier efficacy/promotion, while NUMA exposure could be read as guaranteed.
3. **Cause and alternatives:** Access frequency does not encode placement or successful migration; host configuration, NUMA policy, locality and workload are alternatives.
4. **Evidence:** Compared ndctl CXL list docs, Linux CXL theory and DAMON design. Clarified conditional NUMA exposure and the need for independent node allocation/migration plus application-latency evidence.
5. **Sample scope:** Full article and named commands read. No CXL device/node, Linux `cxl`, DAMON or event tracing available; no device command executed.
6. **Decision:** Remediated: treat DAMON as one input and validate tier placement with independent observations.
7. **Smallest safe change and rollback:** Article clarifications only; route/date/draft/order preserved. Rollback boundary is this file.
8. **Verification and residual risk:** Gates, inline-math and diff pass. Device health, poison, event delivery and actual tier behavior remain hardware/kernel specific.

## Chapter 7 — tiered memory and DAMON/DAMOS

1. **Context and scope:** DAMON/DAMOS tier configuration, migration tracing, NUMA balancing and workload tuning.
2. **Signal and refutation:** A sample trace invented node-direction/page-count fields, monitor output implied node placement, and fixed workload settings looked universally recommended.
3. **Cause and alternatives:** Linux's migration tracepoint exposes aggregate succeeded/failed/reason fields, not source/destination node pairs. Access sampling and NUMA placement are different observations; configuration values are system-specific.
4. **Evidence:** Compared Linux DAMON design/sysfs usage, NUMA balancing sysctl, memory-tier implementation and `include/trace/events/migrate.h`. Removed invented trace fields, qualified the DAMON sample, removed fixed workload recommendations, and labeled outputs illustrative.
5. **Sample scope:** Full article and named examples read. No DAMON, bpftrace, perf, migration tracing, sysfs policy writes, or CXL hardware were used.
6. **Decision:** Remediated: begin with read-only observation, inspect target tracefs schema, and benchmark policy/quota on the target system.
7. **Smallest safe change and rollback:** Article-body/example corrections only; route/date/draft/order preserved. Rollback boundary is this file.
8. **Verification and residual risk:** Verifier checks selected examples/guard phrases and rejects three injected negative fixtures. Per-file gates, inline-math and diff pass. This is not whole-article automated fact-check or Linux execution; kernel/version/platform details remain.

## Verification and execution record

- `node scripts/verify-memory-diagnostics-examples.mjs` — PASS for seven article-scoped semantic checks; three injected negative fixtures rejected. It checks selected examples/guard phrases, not every claim in the seven articles.
- `bash scripts/audit-publish-gate.sh <article>` — blocking gates PASS separately for all seven. Cited-symbol/upstream checks report `SKIPPED` because local source clones are absent; `SKIPPED` is not PASS.
- `node scripts/check-inline-math.mjs <seven article paths>` — PASS.
- `git diff --check` — PASS.
- Host is Darwin 25.6 arm64 with Node 24.21.0. `jeprof` is present. `heaptrack`, Linux/glibc runtime, TCMalloc, `damo`, `bpftrace`, `perf`, `valgrind`, and `cxl` are absent from PATH. No Linux-only code, policy-changing sysfs command, CXL device command or hardware path was run. Full site build is parent-owned and was not run here.
