# Postmortem debugging remediation evidence — 2026-10-22

Re-scoring was not performed. `beforeSha256` uses repository `HEAD` as the baseline. Chapters 01 and 02 already contained partial workspace edits when this continuation began, so their original workspace hashes are unavailable; those edits were preserved and continued. All six slugs, dates, series names, order numbers, and draft flags match `HEAD`.

## Chapter 01 — Core generation

- **Context and scope:** Linux core generation and settings; `/blog/tools/debugging/postmortem/chapter01-core-generation`.
- **Signal and refutation:** The example passed `2` to `PR_SET_DUMPABLE` and conflated it with `/proc/sys/fs/suid_dumpable`. The former accepts 0/1 on current Linux; mode 2 belongs to the separate sysctl.
- **Cause and alternatives:** Historical `suid_dumpable` mode 2 was transferred to the wrong API. The article now distinguishes the syscall API from the sysctl and explains pipe/file conditions.
- **Evidence:** [PR_SET_DUMPABLE man page](https://man7.org/linux/man-pages/man2/PR_SET_DUMPABLE.2const.html), [kernel suid_dumpable docs](https://docs.kernel.org/admin-guide/sysctl/fs.html#suid-dumpable), [core_pattern docs](https://docs.kernel.org/admin-guide/sysctl/kernel.html#core-pattern).
- **Sample scope:** Full chapter and named C fence reviewed; constants checked statically. Linux headers/runtime were unavailable, so the sample was not compiled or run.
- **Decision:** `remediated`; removed invalid API value and separated the sysctl explanation.
- **Smallest safe change and rollback:** Updated the two explanations and named example; kept URL/frontmatter. Rollback is limited to this file's diff.
- **Validation and residual risk:** Static API check, article publish-gate blocking checks, inline-math, and `git diff --check` passed. Linux core generation and systemd/handler behavior remain untested.

## Chapter 02 — ELF core format

- **Context and scope:** ELF core notes and Linux `siginfo`; `/blog/tools/debugging/postmortem/chapter02-elf-core-format`.
- **Signal and refutation:** The listed SIGSEGV and SIGILL `si_code` values differed from Linux values.
- **Cause and alternatives:** Constant-value errors; no claim is made that all ELF note layouts are identical across architectures.
- **Evidence:** [Linux `sigaction` si_code documentation](https://man7.org/linux/man-pages/man2/sigaction.2.html#The_si_code_field): SIGSEGV BNDERR/PKUERR are 3/4; SIGILL PRVOPC/PRVREG are 5/6.
- **Sample scope:** Full chapter and named C layout example checked. The C program tests alignment arithmetic and rejects `SIZE_MAX` overflow; no kernel-generated core or architecture ABI was exercised.
- **Decision:** `remediated`; corrected constants and labelled the note example as a layout model.
- **Smallest safe change and rollback:** Changed the constants and scope explanation; kept URL/frontmatter. Rollback is limited to this file's diff.
- **Validation and residual risk:** Clang compile/run of the arithmetic model including overflow rejection, article publish-gate blocking checks, inline-math, and `git diff --check` passed. Kernel note emission and reader interoperability remain untested.

## Chapter 03 — GDB core analysis

- **Context and scope:** Opening and interpreting process cores; `/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis`.
- **Signal and refutation:** SIGSEGV values 6/7 were wrong; `coredumpctl debug` was described as guaranteeing debuginfo; chapter 4 was called the series finale.
- **Cause and alternatives:** Signal constants were copied incorrectly, debugger launch was conflated with symbol retrieval, and the series handoff omitted chapters 5–6.
- **Evidence:** [Linux `si_code` documentation](https://man7.org/linux/man-pages/man2/sigaction.2.html#The_si_code_field), [GDB invocation](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Invocation.html), [GDB debuginfod settings](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Debuginfod-Settings.html).
- **Sample scope:** Named GDB batch command extracted and checked with `bash -n`. GDB is unavailable; no core was opened.
- **Decision:** `remediated`; corrected signal values, qualified symbol availability, added a batch example that does not run the inferior, and fixed the handoff.
- **Smallest safe change and rollback:** Text and two titled shell fences; URL/order preserved. Rollback is limited to this file's diff.
- **Validation and residual risk:** Static checks, shell syntax, article publish-gate blocking checks, inline-math, and `git diff --check` passed. Actual GDB configuration, auto-loading and core symbols remain unverified.

## Chapter 04 — debuginfod, minidump, automation

- **Context and scope:** Build-ID, debuginfod, minidump, CI, Python and pyelftools examples; `/blog/tools/debugging/postmortem/chapter04-debuginfod-minidump-automation`.
- **Signal and refutation:** SHA-1 length, unconditional core build-ID, noninteractive debuginfod defaults, CI `|| true` plus `failure()`, Python `join` type error, and incomplete note parsing were wrong or overbroad.
- **Cause and alternatives:** Format sizes, conditional core content, GDB defaults, Actions status predicates and Python types had been conflated. The examples now take explicit executable/core paths, preserve CI failure state, and only inventory ELF notes.
- **Evidence:** [GNU ld build-ID options](https://sourceware.org/binutils/docs/ld/Options.html), [GDB debuginfod settings](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Debuginfod-Settings.html), [elfutils debuginfod](https://sourceware.org/elfutils/Debuginfod.html), [GitHub Actions status functions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions), [Sanitizer common flags](https://github.com/google/sanitizers/wiki/SanitizerCommonFlags).
- **Sample scope:** Named shell/Python/YAML blocks extracted from the article; shell syntax and Python syntax checked; pyelftools 0.32 parsed a synthetic ELF64 `PT_NOTE` fixture. No real core, GDB, CI runner, debuginfod server, Breakpad/crashpad or Sentry was run.
- **Decision:** `remediated`; corrected SHA-1 to 20 bytes, qualified core/build-ID and debuginfod behavior, repaired CI and stack grouping, narrowed minidump claims, and removed unsupported ABI decoding from the sample.
- **Smallest safe change and rollback:** Corrected description/body/fences only; URL/date/order unchanged. Rollback is limited to this file's diff.
- **Validation and residual risk:** `bash -n`, Python compile, synthetic PT_NOTE parsing, static checks, article publish-gate blocking checks, inline-math, and `git diff --check` passed. Real service, version, workflow and artifact behavior still requires environment testing.

## Chapter 05 — CXL device postmortem

- **Context and scope:** CXL device vmcore/drgn article; `/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem`.
- **Signal and refutation:** The previous loop's “verified” source inspection does not prove that the drgn examples run or match a particular vmcore/device.
- **Cause and alternatives:** Source review and runtime evidence have different scopes. The article now says that the examples are not hardware/vmcore-tested.
- **Evidence:** Existing source references: [Linux CXL RAS source](https://github.com/torvalds/linux/blob/master/drivers/cxl/core/ras.c), [CXL structures](https://github.com/torvalds/linux/blob/master/drivers/cxl/cxl.h), [kernel CXL docs](https://cdn.kernel.org/doc/html/latest/driver-api/cxl/linux/cxl-driver.html). These do not verify runtime behavior.
- **Sample scope:** Named drgn Python examples syntax-compiled only. No drgn, CXL hardware, Linux vmcore or live host was available.
- **Decision:** `unassessed`; source assertions are not promoted to runtime-verified claims. Next action: `manual-review`.
- **Smallest safe change and rollback:** Added a scope caveat and fence labels; kept implementation details and URL. Rollback is limited to this file's diff.
- **Validation and residual risk:** Python syntax, article publish-gate blocking checks, inline-math, and `git diff --check` passed. Manual question: Do the fields and walker work with a named drgn version and pinned kernel/vmcore?

## Chapter 06 — CXL fabric postmortem

- **Context and scope:** CXL fabric multi-host scenarios; `/blog/tools/debugging/postmortem/chapter06-cxl-fabric-postmortem`.
- **Signal and refutation:** The prior loop marks the full article unverified and lists `ptime`/PROC TIME, BISnp counts, `cxl_mem` read/write tracepoints and LWP as unconfirmed.
- **Cause and alternatives:** Conceptual operational guidance was written declaratively. The introduction now labels scenarios and identifiers as unverified and version/environment-dependent.
- **Evidence:** `published-loop-34.md` records the unresolved claims; no hardware source or runtime evidence became available in this pass.
- **Sample scope:** Full article read; conceptual drgn fence syntax-compiled. No CXL fabric, FM, switch, kernel, vmcore or trace session.
- **Decision:** `unassessed`; no CXL behavior is marked verified. Next action: `manual-review`.
- **Smallest safe change and rollback:** Added concept-only scope, qualified time-precision estimates, removed the unsupported kernel-6.5+ helper claim; URL and order remain fixed.
- **Validation and residual risk:** Python syntax, article publish-gate blocking checks, inline-math, and `git diff --check` passed. Manual question: Can each source and scenario be reproduced on a supported fabric/FM/switch/kernel configuration?

## Aggregate verification

- `node scripts/verify-postmortem-examples.mjs` passed and wrote [JSON results](postmortem-2026-10-22.json) and [run log](postmortem-examples-2026-10-22.log).
- Article publish-gate blocking checks passed; the upstream cited-symbol audit was **SKIPPED** because its source clones are unavailable. This is not a pass.
- Inline-math and `git diff --check` passed for all six chapters.
- Not run: Linux core generation, GDB/coredumpctl, systemd-coredump, production debuginfod, CI, Breakpad/crashpad runtime, CXL hardware/fabric, or vmcore/drgn runtime.
- No score ledger was edited and no rescore was performed.
