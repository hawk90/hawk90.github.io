# Embedded Performance Engineering Part 5 remediation

> Source correction and scoped validation only; no score reassessment. Published score ledgers were not edited.

Issue context: published-loop-21.md and published-loop-22.md. URL/date/draft/seriesOrder frontmatter was preserved.

## part5-01-perf-basics.md — remediated

1. **Context and scope:** Chapter source and its named examples in Embedded Performance Engineering Part 5.
2. **Signal and refutation:** Corrected perf_event_paranoid/capability scope, event-relative Overhead, arbitrary IPC/miss/sample thresholds and arithmetic in the illustrative annotate output.
3. **Cause and alternatives:** Generalizations were applied beyond the tool/target conditions documented in the source; versioned configuration may explain remaining variation.
4. **Evidence:** The chapter was compared with its prior evaluation; relevant official documentation is linked in the source or listed below.
5. **Sample:** Full chapter and all non-empty fences inspected; relevant target hardware/tool unavailable where noted.
6. **Decision:** remediated — Corrected perf_event_paranoid/capability scope, event-relative Overhead, arbitrary IPC/miss/sample thresholds and arithmetic in the illustrative annotate output.
7. **Smallest change and rollback:** Only the named chapter prose/examples changed; frontmatter and URL remain. Revert that chapter diff to roll back.
8. **Validation and residual risk:** Source verifier plus scoped publish gate, inline-math and diff checks; platform runtime remains unexecuted.

## part5-02-perf-advanced.md — unassessed

1. **Context and scope:** Chapter source and its named examples in Embedded Performance Engineering Part 5.
2. **Signal and refutation:** Removed generalized PMU counter count, DWARF and tracepoint costs; qualified raw events and perf-mem by target CPU/kernel.
3. **Cause and alternatives:** Generalizations were applied beyond the tool/target conditions documented in the source; versioned configuration may explain remaining variation.
4. **Evidence:** The chapter was compared with its prior evaluation; relevant official documentation is linked in the source or listed below.
5. **Sample:** Full chapter and all non-empty fences inspected; relevant target hardware/tool unavailable where noted.
6. **Decision:** unassessed — Removed generalized PMU counter count, DWARF and tracepoint costs; qualified raw events and perf-mem by target CPU/kernel.
7. **Smallest change and rollback:** Only the named chapter prose/examples changed; frontmatter and URL remain. Revert that chapter diff to roll back.
8. **Validation and residual risk:** Source verifier plus scoped publish gate, inline-math and diff checks; platform runtime remains unexecuted.

**Next action:** manual-review: run named commands on supported CPU/kernel combinations and verify unavailable-event behavior.

**Review question:** Do raw-event codes, event groups, call-graph modes and perf-mem fields match supported targets?

## part5-03-ftrace.md — remediated

1. **Context and scope:** Chapter source and its named examples in Embedded Performance Engineering Part 5.
2. **Signal and refutation:** Scoped function tracing to CONFIG_DYNAMIC_FTRACE and available_filter_functions; removed generic all-functions and cost-table claims.
3. **Cause and alternatives:** Generalizations were applied beyond the tool/target conditions documented in the source; versioned configuration may explain remaining variation.
4. **Evidence:** The chapter was compared with its prior evaluation; relevant official documentation is linked in the source or listed below.
5. **Sample:** Full chapter and all non-empty fences inspected; relevant target hardware/tool unavailable where noted.
6. **Decision:** remediated — Scoped function tracing to CONFIG_DYNAMIC_FTRACE and available_filter_functions; removed generic all-functions and cost-table claims.
7. **Smallest change and rollback:** Only the named chapter prose/examples changed; frontmatter and URL remain. Revert that chapter diff to roll back.
8. **Validation and residual risk:** Source verifier plus scoped publish gate, inline-math and diff checks; platform runtime remains unexecuted.

## part5-04-ebpf.md — remediated

1. **Context and scope:** Chapter source and its named examples in Embedded Performance Engineering Part 5.
2. **Signal and refutation:** Corrected BCC profile-bpfcc invalid -ag option to -f; qualified JIT and tracepoint names/fields by kernel.
3. **Cause and alternatives:** Generalizations were applied beyond the tool/target conditions documented in the source; versioned configuration may explain remaining variation.
4. **Evidence:** The chapter was compared with its prior evaluation; relevant official documentation is linked in the source or listed below.
5. **Sample:** Full chapter and all non-empty fences inspected; relevant target hardware/tool unavailable where noted.
6. **Decision:** remediated — Corrected BCC profile-bpfcc invalid -ag option to -f; qualified JIT and tracepoint names/fields by kernel.
7. **Smallest change and rollback:** Only the named chapter prose/examples changed; frontmatter and URL remain. Revert that chapter diff to roll back.
8. **Validation and residual risk:** Source verifier plus scoped publish gate, inline-math and diff checks; platform runtime remains unexecuted.

## part5-05-flamegraph.md — remediated

1. **Context and scope:** Chapter source and its named examples in Embedded Performance Engineering Part 5.
2. **Signal and refutation:** Corrected FlameGraph inverted/reverse use; removed false sched_switch off-CPU conversion and generic prime/sample-rate assertions.
3. **Cause and alternatives:** Generalizations were applied beyond the tool/target conditions documented in the source; versioned configuration may explain remaining variation.
4. **Evidence:** The chapter was compared with its prior evaluation; relevant official documentation is linked in the source or listed below.
5. **Sample:** Full chapter and all non-empty fences inspected; relevant target hardware/tool unavailable where noted.
6. **Decision:** remediated — Corrected FlameGraph inverted/reverse use; removed false sched_switch off-CPU conversion and generic prime/sample-rate assertions.
7. **Smallest change and rollback:** Only the named chapter prose/examples changed; frontmatter and URL remain. Revert that chapter diff to roll back.
8. **Validation and residual risk:** Source verifier plus scoped publish gate, inline-math and diff checks; platform runtime remains unexecuted.

## part5-06-arm-ds-lauterbach.md — unassessed

1. **Context and scope:** Chapter source and its named examples in Embedded Performance Engineering Part 5.
2. **Signal and refutation:** Corrected Cortex-M0/M0+ trace scope, OS-awareness and certification language; removed product buffer/price/throughput values; marked sample output illustrative.
3. **Cause and alternatives:** Generalizations were applied beyond the tool/target conditions documented in the source; versioned configuration may explain remaining variation.
4. **Evidence:** The chapter was compared with its prior evaluation; relevant official documentation is linked in the source or listed below.
5. **Sample:** Full chapter and all non-empty fences inspected; relevant target hardware/tool unavailable where noted.
6. **Decision:** unassessed — Corrected Cortex-M0/M0+ trace scope, OS-awareness and certification language; removed product buffer/price/throughput values; marked sample output illustrative.
7. **Smallest change and rollback:** Only the named chapter prose/examples changed; frontmatter and URL remain. Revert that chapter diff to roll back.
8. **Validation and residual risk:** Source verifier plus scoped publish gate, inline-math and diff checks; platform runtime remains unexecuted.

**Next action:** manual-review: validate supported core/SoC, probe, RTOS integration and assurance level.

**Review question:** Which target/probe/RTOS combination produces the stated trace and coverage data?

## part5-07-baremetal-profiling.md — unassessed

1. **Context and scope:** Chapter source and its named examples in Embedded Performance Engineering Part 5.
2. **Signal and refutation:** Qualified DWT/CYCCNT availability by implementation; removed universal GPIO/DWT/ITM cost table.
3. **Cause and alternatives:** Generalizations were applied beyond the tool/target conditions documented in the source; versioned configuration may explain remaining variation.
4. **Evidence:** The chapter was compared with its prior evaluation; relevant official documentation is linked in the source or listed below.
5. **Sample:** Full chapter and all non-empty fences inspected; relevant target hardware/tool unavailable where noted.
6. **Decision:** unassessed — Qualified DWT/CYCCNT availability by implementation; removed universal GPIO/DWT/ITM cost table.
7. **Smallest change and rollback:** Only the named chapter prose/examples changed; frontmatter and URL remain. Revert that chapter diff to roll back.
8. **Validation and residual risk:** Source verifier plus scoped publish gate, inline-math and diff checks; platform runtime remains unexecuted.

**Next action:** manual-review: inspect a named MCU TRM and measure costs with a calibrated setup.

**Review question:** Does the target implement and enable the cited blocks, and what intrusion does each path add?

## part5-08-nsight.md — unassessed

1. **Context and scope:** Chapter source and its named examples in Embedded Performance Engineering Part 5.
2. **Signal and refutation:** Replaced download placeholder and GUI command, fixed copy-before-kernel same-stream dependency, qualified synchronization and framework instrumentation.
3. **Cause and alternatives:** Generalizations were applied beyond the tool/target conditions documented in the source; versioned configuration may explain remaining variation.
4. **Evidence:** The chapter was compared with its prior evaluation; relevant official documentation is linked in the source or listed below.
5. **Sample:** Full chapter and all non-empty fences inspected; relevant target hardware/tool unavailable where noted.
6. **Decision:** unassessed — Replaced download placeholder and GUI command, fixed copy-before-kernel same-stream dependency, qualified synchronization and framework instrumentation.
7. **Smallest change and rollback:** Only the named chapter prose/examples changed; frontmatter and URL remain. Revert that chapter diff to roll back.
8. **Validation and residual risk:** Source verifier plus scoped publish gate, inline-math and diff checks; platform runtime remains unexecuted.

**Next action:** manual-review: run CUDA example on supported hardware and compare stream modes/framework instrumentation.

**Review question:** Does the example overlap on the selected GPU with pinned memory and stated stream mode?

## part5-09-tracy-hotspot.md — remediated

1. **Context and scope:** Chapter source and its named examples in Embedded Performance Engineering Part 5.
2. **Signal and refutation:** Corrected uftrace replay entry/return duration and removed unsupported fixed Tracy/uftrace cost values.
3. **Cause and alternatives:** Generalizations were applied beyond the tool/target conditions documented in the source; versioned configuration may explain remaining variation.
4. **Evidence:** The chapter was compared with its prior evaluation; relevant official documentation is linked in the source or listed below.
5. **Sample:** Full chapter and all non-empty fences inspected; relevant target hardware/tool unavailable where noted.
6. **Decision:** remediated — Corrected uftrace replay entry/return duration and removed unsupported fixed Tracy/uftrace cost values.
7. **Smallest change and rollback:** Only the named chapter prose/examples changed; frontmatter and URL remain. Revert that chapter diff to roll back.
8. **Validation and residual risk:** Source verifier plus scoped publish gate, inline-math and diff checks; platform runtime remains unexecuted.

## part5-10-ebpf-continuous.md — unassessed

1. **Context and scope:** Chapter source and its named examples in Embedded Performance Engineering Part 5.
2. **Signal and refutation:** Removed unsupported profiling overhead/resource/storage/privacy assertions, corrected ordinary stack-profile privacy, pointed series continuation to Part6.
3. **Cause and alternatives:** Generalizations were applied beyond the tool/target conditions documented in the source; versioned configuration may explain remaining variation.
4. **Evidence:** The chapter was compared with its prior evaluation; relevant official documentation is linked in the source or listed below.
5. **Sample:** Full chapter and all non-empty fences inspected; relevant target hardware/tool unavailable where noted.
6. **Decision:** unassessed — Removed unsupported profiling overhead/resource/storage/privacy assertions, corrected ordinary stack-profile privacy, pointed series continuation to Part6.
7. **Smallest change and rollback:** Only the named chapter prose/examples changed; frontmatter and URL remain. Revert that chapter diff to roll back.
8. **Validation and residual risk:** Source verifier plus scoped publish gate, inline-math and diff checks; platform runtime remains unexecuted.

**Next action:** manual-review: verify current product releases, defaults, platform support, permissions, fields and resource cost.

**Review question:** For which product versions and target configuration are the claims true?

## part5-11-cxl-profiling-tools.md — unassessed

1. **Context and scope:** Chapter source and its named examples in Embedded Performance Engineering Part 5.
2. **Signal and refutation:** Removed unstable CXL kernel probe scripts/arguments and universal PMU-level assertion; added discovery steps and DAMON source link.
3. **Cause and alternatives:** Generalizations were applied beyond the tool/target conditions documented in the source; versioned configuration may explain remaining variation.
4. **Evidence:** The chapter was compared with its prior evaluation; relevant official documentation is linked in the source or listed below.
5. **Sample:** Full chapter and all non-empty fences inspected; relevant target hardware/tool unavailable where noted.
6. **Decision:** unassessed — Removed unstable CXL kernel probe scripts/arguments and universal PMU-level assertion; added discovery steps and DAMON source link.
7. **Smallest change and rollback:** Only the named chapter prose/examples changed; frontmatter and URL remain. Revert that chapter diff to roll back.
8. **Validation and residual risk:** Source verifier plus scoped publish gate, inline-math and diff checks; platform runtime remains unexecuted.

**Next action:** manual-review: test on named CXL kernel/ndctl/perf stack and record device/tracing support.

**Review question:** Which topology and software versions support the commands and memory-source fields?

## Validation limits

Linux perf/ftrace/BCC, ARM probes, MCU/SWO/SystemView, CUDA/Nsight, and CXL hardware workflows were not run. Source-level assertions and arithmetic are not hardware or API runtime validation. No whole-site build was run; parent owns it.

## Sources checked

- Linux perf security and CAP_PERFMON: https://docs.kernel.org/admin-guide/perf-security.html
- Linux ftrace: https://docs.kernel.org/trace/ftrace.html
- BCC profile CLI flags: https://github.com/iovisor/bcc/blob/master/tools/profile.py
- FlameGraph output and palette options: https://github.com/brendangregg/FlameGraph
- Arm Cortex-M0 and Cortex-M3 datasheet; CMSIS Core register availability: https://developer.arm.com/documentation/dui0497/latest/ ; https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/Processor%20Datasheets/Arm%20Cortex-M3%20Processor%20Datasheet.pdf ; https://arm-software.github.io/CMSIS_6/latest/Core/group__Core__Register.html
- NVIDIA Nsight Systems and CUDA stream synchronization: https://docs.nvidia.com/nsight-systems/UserGuide/index.html ; https://docs.nvidia.com/cuda/cuda-runtime-api/stream-sync-behavior.html
- uftrace replay field semantics: https://github.com/namhyung/uftrace/blob/master/doc/uftrace-replay.md
- DAMON sampling and aggregation guidance: https://docs.kernel.org/mm/damon/design.html

## Final scoped checks

`node scripts/verify-performance-engineering-part5-examples.mjs` passed source-fence extraction, metadata preservation, sample-share arithmetic, BCC option checks, flamegraph option checks, CUDA copy/kernel source ordering, uftrace row shape, and CXL probe-claim checks. The per-file publish gate returned exit 0 for all 11 chapters; inline-math returned exit 0; `git diff --check` returned exit 0 for the scoped chapter files. The cited-symbol gate reported `SKIPPED` because upstream clones are absent; this is not treated as a pass. Translation/hallucination candidates in the gate remain manual-review warnings. No site-wide build was run.
