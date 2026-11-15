# Embedded Performance Engineering Part 4 — remediation evidence

Date: 2026-10-22. This is an evidence/remediation record, not a score, fact-check verdict, or regrade. Scope is the ten Part 4 articles in source order. URL, date, series order, and draft state were preserved. No score ledger was edited. The manifest starts with `readyForIntegration: false`; it is set true only after the source, hashes, verifier, and scoped checks are recorded.

## Evidence and validation boundary

- Read each complete article and its existing evidence in `published-loop-20.md` and `published-loop-21.md`; confirmed errors and unresolved claims are listed per chapter below.
- Official references used: Linux man-pages for [`futex(2)`](https://man7.org/linux/man-pages/man2/futex.2.html), [robust mutex setup](https://man7.org/linux/man-pages/man3/pthread_mutexattr_setrobust.3.html), [`pthread_mutex_consistent(3)`](https://man7.org/linux/man-pages/man3/pthread_mutex_consistent.3.html), [`pthread_mutexattr_setpshared(3)`](https://man7.org/linux/man-pages/man3/pthread_mutexattr_setpshared.3.html), and [`pthread_rwlockattr_setkind_np(3)`](https://man7.org/linux/man-pages/man3/pthread_rwlockattr_setkind_np.3.html); Linux kernel [6.1 lock types](https://docs.kernel.org/6.1/locking/locktypes.html); Intel’s [core-to-core MESI explanation](https://www.intel.com/content/www/us/en/developer/articles/technical/fast-core-to-core-communications.html); and Gunther’s [USL paper](https://arxiv.org/abs/0808.1431).
- `node scripts/verify-performance-engineering-part4-examples.mjs`: PASS. It extracted all fenced examples from the ten articles, compiled and ran the article’s MCS source plus a four-thread 1,000,000-acquisition host stress harness, compiled the named C++ atomic mapping example for `arm64-apple-macos13`, checked emitted instructions, tested USL arithmetic, and asserted specific corrected and rejected claims. The stress harness is a local host test, not a Linux kernel test or target performance measurement.
- Publish gate: exit 0; all blocking checks PASS. Three soft translationese candidates were reported in 4-02, 4-03, and 4-08 and remain editorial review signals. Cited-symbol audit reported `SKIPPED` because source clones are absent; this is not a pass.
- `node scripts/check-inline-math.mjs` on the ten scoped articles: PASS. `git diff --check` on those articles: PASS. Frontmatter `slug`, `date`, `seriesOrder`, and `draft` match HEAD in the verifier.
- No Linux runtime, kernel lock implementation, RTOS, NUMA platform, cache-coherence hardware, Cortex-A benchmark, or whole-site build was available/run. Static text checks and the host MCS stress test are not evidence for those targets.

## Chapter decisions (eight-field record)

### part4-01 — Concurrency basics — `remediated`

1. **Context and scope:** Data-race illustration, weak-memory example, and ARM/POWER cycle claim in `part4-01-concurrency-basics.md`.
2. **Signal and refutation condition:** The original shared plain `int` concurrent increment and plain `x/y` litmus were C data races, so an interleaving alone could not define their C behavior. A fixed `seq_cst` barrier and cycle claim had no target context. This concern would not apply to a correctly synchronized or explicitly atomic example.
3. **Cause and alternatives:** Hardware interleaving examples had been written as if they were valid C concurrency programs. A minimal correction is relaxed atomics that preserve race-free demonstrations while allowing the relevant outcomes; assembly/cycle claims require a compiler and target.
4. **Evidence:** C11 atomic examples now use `_Atomic`/`atomic_*` relaxed operations. The lost-update outcome remains possible when separate atomic load/store operations race logically; atomic RMW is shown separately. Unsupported fixed ARM cycle text was removed. The verifier checks positive corrected wording and rejects the old fixed number.
5. **Sample scope:** Two memory-model examples and the fixed cost claim; no target CPU execution or memory-model model checker.
6. **Decision:** Replace undefined data-race examples with race-free relaxed-atomic demonstrations and remove the unsupported fixed-cost statement.
7. **Smallest safe change / rollback:** Edit only the examples and adjacent explanation in this article. Restore the original two snippets and cost paragraph to roll back; metadata and URL remain unchanged.
8. **Validation and residual risk:** Scoped publish gate/math/diff checks pass. Verifier asserts the atomic examples. The exact allowed outcomes are language-model claims, not an empirical CPU result; a formal litmus/model-checker run remains future validation.

### part4-02 — False sharing — `unassessed`

1. **Context and scope:** Cache-line size assumptions and reported benchmark figures in `part4-02-false-sharing.md`.
2. **Signal and refutation condition:** The old evaluation found environment-dependent cache-line and benchmark figures without compiler/OS/command details. They are not proven wrong solely by missing provenance; another CPU or benchmark could produce different results.
3. **Cause and alternatives:** Hardware-specific numbers may have been generalized from an unstated test. Preserve them only after identifying exact target and command, or replace with a sourced example.
4. **Evidence:** Full article and prior loop record reviewed; no matching hardware/compiler/runtime was available to reproduce the figures.
5. **Sample scope:** Complete article and named code fences extracted; benchmark/hardware samples were not executed.
6. **Decision:** Leave the article unchanged and unassessed; do not recast an unverified measurement as a confirmed error.
7. **Smallest safe change / rollback:** No source change; none to roll back. URL and metadata are untouched.
8. **Validation and residual risk:** Static fence extraction and scoped gates pass. **Next action:** `manual-review` on the original machine/build record or rerun with recorded CPU, compiler, OS, affinity, and command. **Review question:** Are the cited cache-line-size and speedup values reproducible under that recorded setup?

### part4-03 — Lock contention — `unassessed`

1. **Context and scope:** `perf`, ftrace, kernel settings, and numerical thresholds in `part4-03-lock-contention.md`.
2. **Signal and refutation condition:** The existing review identified commands/settings and thresholds without kernel/version or workload evidence. The presence of commands is not itself a factual error.
3. **Cause and alternatives:** Linux tooling can change by kernel/configuration and available events. Check the exact command against a target kernel and document unsupported-event behavior rather than generalizing one host.
4. **Evidence:** Complete article and prior evaluation read; no Linux host/runtime is available in this environment. The publish gate’s cited-symbol checks also skipped due missing upstream clones.
5. **Sample scope:** All fenced snippets extracted, but no `perf`, ftrace, kernel or contention experiment ran.
6. **Decision:** Keep unchanged and mark unassessed.
7. **Smallest safe change / rollback:** No source edit. Restore no files.
8. **Validation and residual risk:** Fence extraction, publish gate, math and diff checks pass; these do not validate Linux commands. **Next action:** `manual-review` against the supported kernel versions, then execute normal and missing-event cases. **Review question:** Do the stated tracepoints, events and sysctls exist and produce the described data on the supported kernels?

### part4-04 — Spinlock — `remediated`

1. **Context and scope:** MCS lock implementation and coherence-traffic description in `part4-04-spinlock.md`.
2. **Signal and refutation condition:** The prior implementation had invalid/inconsistent atomic pointer and API use. Correctness can be refuted by a lost update, stale queue link, stuck contender, or wrong final count in a concurrent run.
3. **Cause and alternatives:** The queue-lock concept had been compressed into an untyped sketch. It is now a complete C11 implementation with explicit per-contender nodes, atomics, and release/acquire handoff. It does not promise zero coherence traffic.
4. **Evidence:** The exact MCS C fence was extracted, compiled with Apple Clang C11, then exercised by four host threads for 250,000 acquisitions each; final count was 1,000,000. The Rochester synchronization pseudocode is the algorithm reference: https://www.cs.rochester.edu/research/synchronization/pseudocode/ss.html.
5. **Sample scope:** One lock implementation under a host stress harness; no ARM/Linux target, fairness-latency distribution, or cache event measurement.
6. **Decision:** Replace the broken sketch with compilable C11 queue-lock code and qualify that successor handoff still causes coherence traffic.
7. **Smallest safe change / rollback:** Replace only the MCS example and its immediate explanation. Restore the prior fence and paragraph to roll back.
8. **Validation and residual risk:** Compiler and host stress test pass; publish gate/math/diff pass. Node ownership/reuse is caller responsibility, and the run does not prove lock-freedom on every platform because C11 pointer atomics may not be lock-free there. Performance numbers and target `qspinlock` behavior remain unverified.

### part4-05 — Mutex — `remediated`

1. **Context and scope:** Mutex timing table, inconsistent sample statistics, futex summary, robust mutex setup, and PI limits.
2. **Signal and refutation condition:** The sample had 2,345 blocked waits and a 45 µs maximum but 1,234 ms total, exceeding the possible 105.525 ms sum bound. Fixed latency numbers had no reproducible environment. The robust-mutex snippet lacked process-shared setup while the text generalized to multiple processes.
3. **Cause and alternatives:** Illustrative samples and implementation details were presented as measured/general behavior. Replace timing figures with measurement dimensions, correct the arithmetic sample, and state the omitted process-shared attribute and robust recovery semantics.
4. **Evidence:** Arithmetic bound `2345 × 45 µs = 105.525 ms`; Linux man-pages for futex, robust mutex, `EOWNERDEAD`, `pthread_mutex_consistent()`, and `PTHREAD_PROCESS_SHARED` linked in source.
5. **Sample scope:** Table, futex, robust-mutex examples and PI depth assertions; no Linux/glibc execution.
6. **Decision:** Remove unsupported latency estimates, make the displayed totals arithmetically possible, describe futex as an implementation primitive, and document process-shared/robust conditions. Remove unsupported common PI chain-depth limit.
7. **Smallest safe change / rollback:** Edits confined to timing, sample-statistics and API-explanation sections. Restore those paragraphs/table to roll back; URL/frontmatter unchanged.
8. **Validation and residual risk:** Static positive/negative assertions, gate/math/diff pass. Actual pthread ABI behavior, futex syscall path, and latency still require Linux/libc tests. The pseudocode is not a production mutex implementation.

### part4-06 — Reader-writer lock — `remediated`

1. **Context and scope:** Linux `rwlock_t` fairness, glibc writer preference, and purported Cortex-A72 results.
2. **Signal and refutation condition:** The prior text called Linux kernel `rwlock_t` unfair/reader-preferring; current Linux 6.1 docs describe non-PREEMPT_RT implementation as fair and explain PREEMPT_RT semantic changes. `PTHREAD_RWLOCK_PREFER_WRITER_NP` is ignored by glibc. The old numeric table was called measured but had no benchmark source/log.
3. **Cause and alternatives:** Kernel and userspace lock APIs and configurations were conflated; untraceable figures implied a reproducible target run. Separate the contracts and give a benchmark-record template instead of unverifiable results.
4. **Evidence:** Linux kernel 6.1 lock-type docs; glibc man-page notes for `PTHREAD_RWLOCK_PREFER_WRITER_NP` and the nonrecursive writer preference extension. Original performance table has no matching code/log in the repository.
5. **Sample scope:** Fairness claims and all reported throughput rows; no kernel, glibc, RCU, or seqlock runtime run.
6. **Decision:** Correct kernel/glibc policy descriptions, preserve the nonrecursive-read precondition, and replace the claimed measurement table with controlled-comparison fields.
7. **Smallest safe change / rollback:** Only policy and measurement sections changed. Restore those sections to roll back.
8. **Validation and residual risk:** Verifier positive/negative policy assertions, publish gate/math/diff pass. Current Linux docs are a versioned reference; exact running kernel and library behavior must still be checked. Comparison results remain unmeasured.

### part4-07 — Lock-free — `unassessed`

1. **Context and scope:** CAS, lock-free stack, reclamation, and SPSC/MPMC examples.
2. **Signal and refutation condition:** Existing review found incomplete hazard-pointer/MPMC details and unverified A72 performance tables. The article explicitly labels the bare stack as ABA/use-after-free unsafe, so that snippet is not by itself evidence of a hidden claim that it is safe.
3. **Cause and alternatives:** These algorithms rely on memory reclamation and platform atomic guarantees omitted by short examples. A confirmed treatment needs an end-to-end queue/stack implementation, reclamation proof, and target benchmark.
4. **Evidence:** Complete source and prior review read; no complete matching reclamation implementation or ARM/Linux target available to run.
5. **Sample scope:** All named fences extracted; no lock-free correctness model or throughput benchmark run.
6. **Decision:** Keep unchanged and mark unassessed rather than infer correctness from pseudocode or static text.
7. **Smallest safe change / rollback:** No source edits.
8. **Validation and residual risk:** Static extraction and scoped gates pass only. **Next action:** `manual-review` with a complete supported implementation and reclamation test suite. **Review question:** Are each memory-reclamation example and progress guarantee correct under the stated language/platform assumptions, and are the reported performance figures reproducible?

### part4-08 — Memory ordering — `remediated`

1. **Context and scope:** Seq-cst store mapping and fixed x86/ARM cycle table in `part4-08-memory-ordering.md`.
2. **Signal and refutation condition:** The old text claimed seq-cst store was STLR plus a barrier but also assigned it the same fixed five cycles as STLR while separately assigning a large DMB cost. The claims could not all be true under the article’s own model. Fixed cycle comparisons also omitted compiler and target.
3. **Cause and alternatives:** Language-level ordering, ISA instruction mapping, and measured cycle latency had been merged. Describe compiler/target assembly separately from benchmark latency.
4. **Evidence:** Removed the contradictory cycle table. The named C++ atomic example was compiled with Apple Clang 21.0 for `arm64-apple-macos13`; the generated stores were relaxed=`STR`, release=`STLR`, seq-cst=`STLR` for that exact compiler/target. This is not a universal Arm mapping or cycle measurement.
5. **Sample scope:** One compiler, target triple, optimization setting, and three store functions; no target CPU runtime.
6. **Decision:** Retain a reproducible assembly inspection example and remove unsupported cross-ISA fixed cycle costs.
7. **Smallest safe change / rollback:** Replace only cost/mapping explanations; restore the old table/claims to roll back.
8. **Validation and residual risk:** Verifier compiled the exact code fence and checked each function’s emitted instruction. Publish gate/math/diff pass. Other compilers/targets, load/RMW mappings and actual latency remain untested.

### part4-09 — Cache coherency — `remediated`

1. **Context and scope:** MESI table’s remote read from an M-owned line versus its included transition diagram.
2. **Signal and refutation condition:** The old table moved the existing M owner to I, while the source diagram showed M→S for remote read. This internal contradiction was confirmed by Intel’s description of the owner supplying modified data and moving to shared when another core reads.
3. **Cause and alternatives:** A generic transition summary had used an invalidation path for a read-sharing event. The safe correction is M→S with owner data supply, while noting implementation details can vary.
4. **Evidence:** Intel core-to-core communication article documents the owning agent moving to Shared and returning modified data; table now states M→S and requester S.
5. **Sample scope:** One table transition and matching diagram; no coherence hardware trace.
6. **Decision:** Correct table to match both the included diagram and cited MESI example; qualify implementation-specific messages.
7. **Smallest safe change / rollback:** One transition row plus citation. Restore that row/citation to roll back.
8. **Validation and residual risk:** Scoped gate/math/diff pass. Coherence event names, CCI/CHI/CXL topology, `perf c2c`, MPU attributes, and hardware result tables remain unverified and were not treated as validated by the transition fix.

### part4-10 — SMP analysis — `remediated`

1. **Context and scope:** USL speedup table, package power wording, and scalability example in `part4-10-smp-analysis.md`.
2. **Signal and refutation condition:** Substitution into the printed USL formula with α=.1, β=.01 yields 2.82/3.54/3.27/2.28 at N=4/8/16/32, not the former values. The power example conflated a TDP label with a package power budget. A separate throughput curve was presented as measured without environment or raw data.
3. **Cause and alternatives:** Formula output and thermal product terminology had been simplified into unsupported performance conclusions. Recompute directly, state the assumed budget as an illustrative model, and label the throughput curve hypothetical.
4. **Evidence:** Gunther’s USL equation; direct substitution was independently checked in the verifier. The source says the 65 W budget is an assumption and that it cannot predict turbo behavior; the scaling curve is now explicitly hypothetical.
5. **Sample scope:** Four USL points and two illustrative power/scaling examples; no Linux scheduler, NUMA or power telemetry run.
6. **Decision:** Correct formula values and scope both power and scalability figures as examples, not device results.
7. **Smallest safe change / rollback:** Update only the table and nearby scope wording; restore those lines to roll back.
8. **Validation and residual risk:** USL positive arithmetic test and old-value negative checks, publish gate/math/diff pass. α/β fitting requires representative measured data; no actual SMP scaling or thermal behavior was validated.

## Artifacts

- Manifest: `reports/adsense-audit/fixes/performance-engineering-part4-2026-10-22.json`
- Verifier: `scripts/verify-performance-engineering-part4-examples.mjs`
- Run log: `reports/adsense-audit/fixes/performance-engineering-part4-2026-10-22.log`
