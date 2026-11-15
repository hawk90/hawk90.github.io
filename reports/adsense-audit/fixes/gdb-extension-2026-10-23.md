# GDB extension and frontend repairs — 2026-10-23

No re-score. Evaluation ledger preserved. Scope: All six full chapters and evaluation entries reviewed; actual pinned GDB17.2 Python/MI inspection of a generated ELF core plus extracted host protocol checks.

## Checks and limits

Synthetic core is static memory/register input, not an executed Linux inferior. No live breakpoint/FinishBreakpoint return, actual process stop/resume, runtime JIT, GUI/editor installation, remote server or board/probe tested. JSON syntax is not adapter integration. Clone-only unrelated gate checks skipped, not pass. GDB17.2 temporary cross build configured ac_cv_func_pipe2=no because host SDK detected an unavailable weak pipe2 symbol; no upstream source patch, install or system setting change.

Gate: [gdb-extension-2026-10-23-gate.log](gdb-extension-2026-10-23-gate.log).
Execution: [gdb-extension-2026-10-23.log](gdb-extension-2026-10-23.log).

## Per-article evidence

### `chapter01-python-api-basics.md` — remediated

1. **contextAndScope:** src/content/blog/tools/debugging/gdb-extension/chapter01-python-api-basics.md
2. **problemSignalAndCounterevidence:** Nonexistent Type.target_type, Python slice on gdb.Value, bytes(Value), unchecked symbol/frame and address-zero search assumptions.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** GDB17.2 py-value/py-type/py-frame/py-symbol source plus actual synthetic-core inspection.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected actual GDB API/type/exception contracts and added bounded whereami/findstr commands.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** 11 extracted scripts compile; actual Value/Type/Frame, whereami, bounded first-match/absent/rejected searches pass. Synthetic core is static memory/register input, not an executed Linux inferior. No live breakpoint/FinishBreakpoint return, actual process stop/resume, runtime JIT, GUI/editor installation, remote server or board/probe tested. JSON syntax is not adapter integration. Clone-only unrelated gate checks skipped, not pass. GDB17.2 temporary cross build configured ac_cv_func_pipe2=no because host SDK detected an unavailable weak pipe2 symbol; no upstream source patch, install or system setting change.

Before SHA-256: `0b865b0094f96ab0295d518a5048d7cb025cc29ebdeca37ff9aaa5a112836ec9`. After SHA-256: `bcb769a9541501957b32a1514a655a2cef4716279f7185e4dfda00a0ce7757b5`.

Next action: manual-review. Which exact target ABI, stopped context, symbol availability and readable ranges establish safe inspection on the intended binary?

### `chapter02-commands-events.md` — remediated

1. **contextAndScope:** src/content/blog/tools/debugging/gdb-extension/chapter02-commands-events.md
2. **problemSignalAndCounterevidence:** Unbounded Python worker, duplicate event hooks, ABI-unqualified return capture and malloc/free leak claims.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** GDB17.2 Python event/Breakpoint/FinishBreakpoint source/manual; actual command/function/registration on core.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Added repeat-source cleanup and bounded UTF-8 convenience function; separated live callback contracts and return-watch scope from complete allocation tracing.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual hello/strlen2 normal and rejected lengths, hook disconnect/idempotence and registration pass; no live stop/return hit claimed. Synthetic core is static memory/register input, not an executed Linux inferior. No live breakpoint/FinishBreakpoint return, actual process stop/resume, runtime JIT, GUI/editor installation, remote server or board/probe tested. JSON syntax is not adapter integration. Clone-only unrelated gate checks skipped, not pass. GDB17.2 temporary cross build configured ac_cv_func_pipe2=no because host SDK detected an unavailable weak pipe2 symbol; no upstream source patch, install or system setting change.

Before SHA-256: `b86300a75a50584191932f375579fd7c9ec69db0d21d415ad53ddc51bd1000a3`. After SHA-256: `971f4669c572811c4ac3b9a8fbccf5c978375b530117dae4d8276f7400056bdd`.

Next action: manual-review. Do live normal return, exception/longjmp, optimized frame and signal/exit paths preserve the intended callback lifetime on this target?

### `chapter03-pretty-printers.md` — remediated

1. **contextAndScope:** src/content/blog/tools/debugging/gdb-extension/chapter03-pretty-printers.md
2. **problemSignalAndCounterevidence:** Fabricated STL map/vector internals, vector<bool> arithmetic, invalid TypePrinter and xmethod examples, misleading dynamic MI child counts.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** GDB17.2 bundled Python printing source/manual and actual CLI/Python/MI3 queue fixtures.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Replaced unsafe printer with a bounded version-specific DebugQueue and corrected registration/child/ABI contracts.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Wrapped queue yields 1,2,3; zero-capacity invalid and empty distinguished; repeat registration count1; MI3 dynamic varobj/children pass. Synthetic core is static memory/register input, not an executed Linux inferior. No live breakpoint/FinishBreakpoint return, actual process stop/resume, runtime JIT, GUI/editor installation, remote server or board/probe tested. JSON syntax is not adapter integration. Clone-only unrelated gate checks skipped, not pass. GDB17.2 temporary cross build configured ac_cv_func_pipe2=no because host SDK detected an unavailable weak pipe2 symbol; no upstream source patch, install or system setting change.

Before SHA-256: `8e4c6e571b62be573ad470fb72354adce43ddeae7472c24647aa417962ba31da`. After SHA-256: `c6ed6c34db000650b13203fb0c8a8abea8c89cbb821c39cbccc0b5d2396cf71c`.

Next action: manual-review. Which pinned standard-library/container ABI and corrupted metadata tests establish a production printer without excessive reads?

### `chapter04-frame-unwinder.md` — remediated

1. **contextAndScope:** src/content/blog/tools/debugging/gdb-extension/chapter04-frame-unwinder.md
2. **problemSignalAndCounterevidence:** Wrong SymValueWrapper interface, assumed function name strings, fabricated JIT state/FDE mechanisms and generic unwinder without saved-register contract.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** GDB17.2 FrameDecorator.py, py-unwind.c and local documentation.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Preserved symbol/value wrappers; added one-PC x86-64 fixture unwinder with stable frame ID, saved RIP/RSP/RBP and scope checks; separated runtime JIT interfaces.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** Actual synthetic-core SmartArgsDecorator and custom unwinder recover main, caller RSP0x800110/RBP0. No real JIT code executed. Synthetic core is static memory/register input, not an executed Linux inferior. No live breakpoint/FinishBreakpoint return, actual process stop/resume, runtime JIT, GUI/editor installation, remote server or board/probe tested. JSON syntax is not adapter integration. Clone-only unrelated gate checks skipped, not pass. GDB17.2 temporary cross build configured ac_cv_func_pipe2=no because host SDK detected an unavailable weak pipe2 symbol; no upstream source patch, install or system setting change.

Before SHA-256: `bd20b48e00a2527aebe71d7612cb4e9bce33117f621a2c4126220f405edb6704`. After SHA-256: `a5a758223406f654a59e5af20368ef16f546a84c17e8bfb70238d6cd184238a8`.

Next action: manual-review. Which pinned runtime, PC range, ABI and prologue/epilogue/exception states provide the actual saved-register and frame-ID contract?

### `chapter05-mi-dap-protocol.md` — remediated

1. **contextAndScope:** src/content/blog/tools/debugging/gdb-extension/chapter05-mi-dap-protocol.md
2. **problemSignalAndCounterevidence:** DAP incorrectly called JSON-RPC2.0; fixed byte lengths and incomplete snippets, record/token/variable/thread/logpoint claims conflated.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** Official DAP schema and GDB17.2 MI manual; extracted JavaScript framing and actual MI3 run.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected DAP envelope/UTF-8 byte framing and added bounded stream parser; distinguished MI records, adapter capability and state/lifetime rules.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** All281 split points, bytewise/coalesced UTF-8, malformed/oversized/non-ASCII/poisoned/truncated negatives pass; actual MI tokens and dynamic printer children pass. Synthetic core is static memory/register input, not an executed Linux inferior. No live breakpoint/FinishBreakpoint return, actual process stop/resume, runtime JIT, GUI/editor installation, remote server or board/probe tested. JSON syntax is not adapter integration. Clone-only unrelated gate checks skipped, not pass. GDB17.2 temporary cross build configured ac_cv_func_pipe2=no because host SDK detected an unavailable weak pipe2 symbol; no upstream source patch, install or system setting change.

Before SHA-256: `2deb40af246414a59711925a1d1bc6c69392397887364f46980bb4f543342daf`. After SHA-256: `b0069d993fb07869e3888fa967e6a0bbff1782760aea7be9f64bd26dc58eebd7`.

Next action: manual-review. Does the actual client/adapter combination negotiate capabilities and preserve request, stop, thread/frame and variable-reference lifetime under asynchronous events?

### `chapter06-frontends.md` — remediated

1. **contextAndScope:** src/content/blog/tools/debugging/gdb-extension/chapter06-frontends.md
2. **problemSignalAndCounterevidence:** TUI mouse support denied, installation overwrote gdbinit, wrong Lua/Vimspector settings, unlimited image reads/overwrite/GUI launch, unsupported rankings.
3. **causeHypothesisAndAlternatives:** The source mixed an unpinned implementation, simplified examples or unsupported generalizations with interface contracts. Compare exact source/documents and separate host-functional checks from target behavior.
4. **evidence:** GDB17.2 TUI manual; upstream cgdb/dashboard/nvim-dap/Vimspector/Cortex-Debug docs; actual GDB memory fixture.
5. **sampleCoverage:** Full chapter source and its pre-existing evaluation entry were read; source examples and relevant primary references reviewed. Validation covers only the declared configuration and normal/failure cases.
6. **decision:** Corrected TUI controls and frontend-specific config boundaries; replaced image command with bounded RGB8 export and exclusive new-file creation.
7. **smallestSafeChange:** Only this article, scoped verification examples and batch evidence. Public URL/date/draft/seriesOrder preserved; manual title/description corrections, if any, documented with the chapter. No score ledger changed.
8. **validationAndResidualRisk:** JSON fences parse; extracted RGB layout normal/invalid/overbudget, exact PPM bytes and existing-file refusal pass on real GDB/synthetic core. GUI/probe not run. Synthetic core is static memory/register input, not an executed Linux inferior. No live breakpoint/FinishBreakpoint return, actual process stop/resume, runtime JIT, GUI/editor installation, remote server or board/probe tested. JSON syntax is not adapter integration. Clone-only unrelated gate checks skipped, not pass. GDB17.2 temporary cross build configured ac_cv_func_pipe2=no because host SDK detected an unavailable weak pipe2 symbol; no upstream source patch, install or system setting change.

Before SHA-256: `45eb3b408ee9c612f1162327883f8616e1d32bbe94c8aa112851a3918a886f2f`. After SHA-256: `a96f056f30db3d115f6c9b4d778ff6d5b771cd713a79c7069dece4ef0122dd04`.

Next action: manual-review. Do installed frontend/adapter revisions, terminal keys, stdin, reconnect and probe-specific memory/register access work with the actual target?

## Primary sources

- [https://sourceware.org/pub/gdb/releases/gdb-17.2.tar.xz](https://sourceware.org/pub/gdb/releases/gdb-17.2.tar.xz)
- [https://github.com/microsoft/debug-adapter-protocol/blob/main/debugAdapterProtocol.json](https://github.com/microsoft/debug-adapter-protocol/blob/main/debugAdapterProtocol.json)
- [https://cgdb.github.io/docs/cgdb.html](https://cgdb.github.io/docs/cgdb.html)
- [https://github.com/cyrus-and/gdb-dashboard](https://github.com/cyrus-and/gdb-dashboard)
- [https://github.com/mfussenegger/nvim-dap/blob/master/doc/dap.txt](https://github.com/mfussenegger/nvim-dap/blob/master/doc/dap.txt)
- [https://github.com/puremourning/vimspector](https://github.com/puremourning/vimspector)
- [https://github.com/Marus/cortex-debug/blob/master/debug_attributes.md](https://github.com/Marus/cortex-debug/blob/master/debug_attributes.md)

readyForIntegration records only the declared repair/verification scope; target follow-ups remain open.
