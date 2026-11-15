# Embedded Debugging Ch 1–9 remediation record

Date: 2026-10-22. Scope: the nine published articles under `tools/debugging/embedded`, their named-example verifier, and this evidence bundle. The existing score ledger and published summary were not edited or recalculated. Article `slug`, `date`, `draft`, and `seriesOrder` values match `HEAD` for all nine files.

Canonical disposition in the JSON is `status: remediated` for Chapters 1–9. The HEAD SHA-256 is the tracked-source baseline. Chapters 1–4 already had an unverified worktree draft when this handoff began; that draft's SHA was not captured, so its handoff-start SHA is reported as unavailable. Chapters 5–9 had no worktree diff at handoff and therefore began at the HEAD SHA. Chapter 9 was initially recorded as `unassessed`; this continuation completed the official-source comparison, corrected the article, and replaced that disposition. The after SHA is the final article content recorded in the JSON file.

## Chapter 1 — RSP

1. **Context and scope:** Published RSP guide, slug `tools/debugging/embedded/chapter01-rsp-protocol`; packet examples, RLE/escaping, and article description.
2. **Signal and refutation:** The handoff draft contained an unterminated JavaScript string/fence that swallowed the article's summary and related links. The description called every packet ASCII although the article covers binary `X` data. A healthy source fence and correct framing description would refute those signals.
3. **Cause and alternatives:** A malformed insertion boundary was the cause; this was not a general Markdown renderer failure. The summary also existed twice because the insertion duplicated the ending.
4. **Evidence:** Rebuilt the local checksum/escaping/RLE example from the article body and ran it with Node 24.21.0. It checks valid checksum vectors, special-byte escape round trip, RLE example, bad checksum, and truncated escape. Compared the framing discussion with the cited GDB Remote Protocol documentation listed in the article.
5. **Sample range:** Complete chapter and its sole named executable example; no GDB stub, probe, serial link, or target board was available.
6. **Decision:** Remediated. Closed the code block, removed the duplicated tail, corrected the description, and retained one summary/navigation section.
7. **Smallest safe change and rollback:** Edit only this article's body and description; preserve slug/date/draft/order. Rollback boundary is this article file.
8. **Verification and remaining risk:** `node scripts/verify-embedded-debugging-examples.mjs <nine files>` passes. Per-article publish gate and inline-math check pass. Actual GDB interoperability, RSP negotiation with a real stub, and production-parser edge cases remain untested.

## Chapter 2 — JTAG / SWD / CoreSight

1. **Context and scope:** Published interface and CoreSight guide; SWD switching, request fields, ADIv5 AP access, and DHCSR/AP/SWJ named example.
2. **Signal and refutation:** The reviewed draft reversed APnDP, conflated AP bank bits, treated AP reads as immediate, and had a DHCSR decoder whose displayed masks could contradict the table. Matching the defined bit fields and a passing independent vector would refute these signals.
3. **Cause and alternatives:** Mixed bit-numbering conventions and treating a posted AP read as a completed read caused the conflict; board-specific SWD timing is a separate question.
4. **Evidence:** Corrected APnDP labels and the 16-bit SWJ sequence's LSB-first value; clarified ADIv5 APBANKSEL `[7:4]` versus request address `[3:2]`, and that posted read data is collected from a later response/RDBUFF. Extracted and ran `dhcsr-check.mjs`; its DHCSR bits, AP bank/address vectors, and SWJ bit order pass.
5. **Sample range:** The named host-side bit decoder and affected prose; no SWD wire capture or board-specific comparator/trace validation.
6. **Decision:** Remediated in the handoff draft and verified its named vectors.
7. **Smallest safe change and rollback:** Correct field descriptions and the named checker only; retain all frontmatter identity. Rollback boundary is this article file.
8. **Verification and remaining risk:** Node checker and article gates pass. ADIv6 differences, device-specific register behavior, actual probe timing, and trace availability remain outside the sample.

## Chapter 3 — OpenOCD

1. **Context and scope:** Published OpenOCD guide; the `flash-plan.tcl` named automation example and the failure-to-run safety claim.
2. **Signal and refutation:** The relevant signal is whether reset/run can occur after programming/verify fails. A trace showing `reset run` after a failing `program` would refute the safety claim.
3. **Cause and alternatives:** Tcl's normal error propagation stops the procedure at the failed command; the exact hardware `program` implementation and target configuration remain separate variables.
4. **Evidence:** Extracted the exact article block. A mock Tcl interpreter records the success call order and injects a `program` error; the success path reaches `reset run` and the failure path does not. The article states that this mock is not a flash test.
5. **Sample range:** One named Tcl block, both normal and forced-error paths; no OpenOCD binary, cfg, adapter, target, or flash memory was available.
6. **Decision:** Keep the guarded example; verified host-side control flow. The earlier draft's conflicting debug-level wording was normalized before this loop's gate run.
7. **Smallest safe change and rollback:** Retain the article's configuration and commands; the mock stays in the verifier. Roll back only the article or verifier independently.
8. **Verification and remaining risk:** Tcl mock, per-article gates, and inline-math checks pass. OpenOCD version-specific command registration, target initialization, erase/write/verify, and reset behavior remain unverified.

## Chapter 4 — J-Link

1. **Context and scope:** Published J-Link workflow guide; load transcript arithmetic, RTT process lifetime, licensing wording, and named BIN-plan checker.
2. **Signal and refutation:** The shown section sizes total `0x1c0 + 0x9d20 + 0x4c0 + 0x140 = 42,208`; a different total for the same load would be contradictory. A BIN plan that accepts ELF input would also contradict the described verifybin flow.
3. **Cause and alternatives:** The prior load-size total was arithmetic drift. RTT polling also depends on a running J-Link connection process; treating the client as independent would be another possible but unsupported explanation.
4. **Evidence:** The displayed load size now equals 42,208. Ran extracted `jlink-plan-check.mjs`: valid raw BIN passes; `.elf`, ELF magic under a `.bin` name, and empty input fail. The article cites SEGGER Commander/RTT materials for tool behavior.
5. **Sample range:** Arithmetic plus the named host-only plan generator; no SEGGER application, J-Link probe, or target board was available.
6. **Decision:** Remediated the transcript total and preserved explicit RTT lifetime and license qualification in the handoff draft.
7. **Smallest safe change and rollback:** Update the contradictory output and explanatory wording only; preserve frontmatter identity. Rollback boundary is this article file.
8. **Verification and remaining risk:** Named Node checker and article gates pass. Device-specific flash algorithm, erase/write/verify, Unlimited Flash BP effects, live RTT behavior, and current license terms were not exercised.

## Chapter 5 — ELF / MAP

1. **Context and scope:** Published ELF memory-layout guide; the first `PT_LOAD` segment and startup copy symbol.
2. **Signal and refutation:** The first load ended at `0x08009f80`, while its mapped sections reached `0x0800a3b0`; `__etext` was referenced in startup but never defined by the accompanying linker script, which defines `_sidata`. A segment covering the mapped extent and a matching linker symbol refute these contradictions.
3. **Cause and alternatives:** The sample output and startup/linker snippets had drifted independently. Zero-sized/omitted sections can explain some table gaps, but cannot make the old LOAD end cover the listed section addresses.
4. **Evidence:** Recomputed the segment end and changed its file/memory size to `0x0a3b0`; changed the copy source to the `_sidata` symbol defined by the same article's linker script. The independent `size` excerpt is explicitly partial; its ellipsis means its section rows are not presented as a complete sum.
5. **Sample range:** Internal arithmetic and symbol-name cross-reference across the article; no generated ELF, ARM linker, or final target link was available.
6. **Decision:** Remediated the internally provable range and symbol mismatch; leave real linker output as a future reproducibility check.
7. **Smallest safe change and rollback:** Correct only the example segment and symbol; retain article routing and metadata. Rollback boundary is this article file.
8. **Verification and remaining risk:** Manual arithmetic and article gates pass. The example's complete section-to-segment mapping and actual GNU ld output have not been regenerated.

## Chapter 6 — Trace

1. **Context and scope:** Published embedded trace comparison; Semihosting operation table and the claim that all five methods are nonblocking.
2. **Signal and refutation:** SYS_EXIT/HEAPINFO/ELAPSED were listed as `0x0c/0x12/0x13`, conflicting with the pinned Arm ABI operation table; Semihosting also stops the target during host service. The fixed operation identifiers and mode-dependent wording refute both signals.
3. **Cause and alternatives:** Incorrect operation identifiers and a blanket latency description collapsed unlike mechanisms. RTT behavior depends on buffer mode; hardware ETM has different overhead from host-mediated Semihosting.
4. **Evidence:** Updated the three IDs to `0x18/0x16/0x30`, pinned the citation to Arm ABI 2025Q4, and rewrote the opening to describe blocking and timing effects by method.
5. **Sample range:** Table rows and opening/next-chapter text; no target-side trace path or throughput measurement.
6. **Decision:** Remediated against the cited Semihosting revision; remove the nonexistent MMU promise from the Ch7 preview.
7. **Smallest safe change and rollback:** Correct three IDs and scope statements only; retain URL/date/draft/order. Rollback boundary is this article file.
8. **Verification and remaining risk:** Article gates and inline-math pass. Actual ITM/SWO/RTT/ETM throughput, nonblocking behavior under each buffer policy, and debug-probe combinations remain untested.

## Chapter 7 — RTOS and troubleshooting

1. **Context and scope:** Published RTOS troubleshooting article; CFSR bit grouping, FreeRTOS stack examples, title/description, and series navigation.
2. **Signal and refutation:** The article placed BFARVALID bit 15 outside its stated BFSR `[12:8]` range; it claimed Queue analysis in the title without a queue section and called itself the last series chapter despite Ch8–9. Incomplete GDB Python used ellipses and undefined values.
3. **Cause and alternatives:** The register table's range omitted BFARVALID; metadata promised more than the body delivered; the sample attempted to infer task stack ranges without showing a real source of those values. FreeRTOS high-water mark is an available API when enabled, so hand-written stack archaeology was unnecessary.
4. **Evidence:** Changed BFSR range to `[15:8]`; inspected FreeRTOS Kernel 11.2.0 `tasks.c`, `stack_macros.h`, and configuration defaults for `tskSTACK_FILL_BYTE`, overflow modes, and `INCLUDE_uxTaskGetStackHighWaterMark`. Replaced the incomplete Python listing with the configured high-water-mark API and units. Corrected the CMSIS 5/6 link label, removed the “last chapter” claim, linked Ch8–9, and corrected title/description to match the actual scope.
5. **Sample range:** Internal register-range consistency plus the supplied FreeRTOS 11.2.0 source; no CMSIS/FreeRTOS target build or fault board execution.
6. **Decision:** Remediated. Title/description edits are manual chapter-level corrections recorded here; queue internals remain out of this chapter's advertised scope.
7. **Smallest safe change and rollback:** Edit the inconsistent register range, stack example, and inaccurate title/description/navigation; preserve slug/date/draft/order. Rollback boundary is this article file.
8. **Verification and remaining risk:** FreeRTOS source grep, named-example suite for the series, publish gates, and inline-math pass. The C fault snippets, MPU configuration, port-specific stack checks, and physical fault recovery are not compiled or executed here.

## Chapter 8 — CXL link debug

1. **Context and scope:** Published host enumeration and CXL link-training guide; device invisibility and the Recipes cross-link label.
2. **Signal and refutation:** `lspci` absence was presented as proof that LTSSM had not reached L0, which infers controller state from an enumeration result alone. A controller LTSSM register or analyzer capture is the evidence needed to name that state. The cross-link labeled order 149 while the target is seriesOrder 150.
3. **Cause and alternatives:** The prose treated a useful symptom as a sufficient cause. Power/reset, firmware setup, host enumeration, and link state are distinct checkpoints; the article's own controller-register caveat supports separating them.
4. **Evidence:** Reworded the `lspci` symptom and checklist to say enumeration failed and that LTSSM must be observed separately. Corrected the target label to Ch150 after comparing its slug and series order.
5. **Sample range:** Article-level logic, local target metadata, and link validation; no CXL host, analyzer, or controller register access.
6. **Decision:** Remediated both overclaim and wrong chapter label; no score change was made.
7. **Smallest safe change and rollback:** Correct the symptom inference and link text only; preserve target URL and article metadata. Rollback boundary is this article file.
8. **Verification and remaining risk:** Internal-link and series gates pass. LTSSM interpretation, lspci/cxl output, DVSEC, CEDT, and kernel behavior need a specified host/kernel/device capture.

## Chapter 9 — CXL device troubleshooting

1. **Context and scope:** Full CXL RAS/poison/media-error guide; focused on state-changing Clear Poison semantics, ndctl poison-list source/offset interpretation, and any universal replacement threshold.
2. **Signal and refutation:** The command was presented as a routine remove operation without warning that clearing poison does not restore data. Linux's implementation supplies 64 bytes of zero write-data. Restricting clear to confirmed test-injected poison and explaining data recovery refutes routine production use.
3. **Cause and alternatives:** The command name invites a metadata-only interpretation; actual effects depend on device/protocol behavior. A cleared poison-list entry does not prove old contents were restored. Backup/recovery and vendor/platform guidance are needed before an operational action.
4. **Evidence:** Compared official ndctl CXL list documentation with Linux `drivers/cxl/core/memdev.c` Clear Poison payload, `core/trace.h` fields, and `pci.c` event handling. Removed a universal replacement threshold and added the official sources to the article.
5. **Sample range:** Full article prose and all named command/trace examples were reviewed against official docs/source. No `cxl` command, CXL host/device, poison injection, or event path was executed.
6. **Decision:** Remediated. Query the target DPA/source first, clear only test-injected poison, explain that Linux sends zero write-data and that clear is not data recovery, and compare metric trends with vendor service criteria rather than a universal threshold.
7. **Smallest safe change and rollback:** Changed command framing, added data-loss/recovery guidance and source links, and qualified replacement criteria. Preserve slug/date/draft/order; rollback boundary is this article file.
8. **Verification and remaining risk:** Per-file gate, inline-math, and diff checks pass. Upstream symbol check is `SKIPPED` because the Linux source clone is absent, not PASS. Hardware and version-specific ndctl/kernel/device behavior remain untested.

## Execution record and artifacts

- Named body examples: `node scripts/verify-embedded-debugging-examples.mjs src/content/blog/tools/debugging/embedded/chapter0{1,2,3,4,5,6,7,8,9}-*.md` — four named examples pass; chapters 5–9 contain no named executable block.
- `bash scripts/audit-publish-gate.sh <article>` — run separately for all nine articles; blocking checks pass. Cited-symbol/upstream clone checks report `SKIPPED` because source clones are absent; this is not PASS.
- `node scripts/check-inline-math.mjs <nine article paths>` — pass.
- `git diff --check` on owned articles and verifier — pass.
- No site build, final ARM linker output, OpenOCD/J-Link session, board/probe, or CXL device test was run. No commit, push, ledger edit, or score recalculation was performed.
- Verifier output is in `embedded-debugging-2026-10-22-verifier-output.txt`; per-file gate and inline-math output is in `embedded-debugging-2026-10-22-gates-output.txt`. The machine-readable records and HEAD/after hashes are in `embedded-debugging-2026-10-22.json`.
