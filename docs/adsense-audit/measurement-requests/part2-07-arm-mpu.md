# 작성자 측정 요청 — `part2-07-arm-mpu.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part2-07-arm-mpu.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 2 (최종 점수 77, 상태 `max_rounds`)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어에서 잰 값과 기록이 있어야 오른다. 아래 항목을 측정해 주면 글에 넣는다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 측정값은 작성자가 직접 잰 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. Guard self-test on real silicon: turn the L161-169 expected-value table into observed values (CFSR/MMFSR bits, MMFAR, stacked PC, plus MPU->TYPE.DREGION and SHCSR as configured).

- **준비:** An STM32F407 board (e.g. STM32F4DISCOVERY, part STM32F407VGT6; record the board revision and the silicon rev from DBGMCU->IDCODE REV_ID). Toolchain: arm-none-eabi-gcc (exact version from `arm-none-eabi-gcc --version`), CMSIS_5 5.9.0 and cmsis-device-f4 v2.6.9 as cited, -O0 and -O2 builds. Debug probe: on-board ST-LINK/V2 with OpenOCD (record version) or STM32CubeProgrammer/GDB.
- **절차:** 1) Build the post's mpu_setup(), MemManage_Handler() and mpu_guard_selftest() unchanged. Set up a privileged thread on PSP with stack 0x20018000-0x2001FFFF (CONTROL.SPSEL=1, MSP outside that range). 2) Call mpu_setup(), then mpu_guard_selftest() with PRIMASK=0. 3) Halt in the handler's for(;;) and in GDB run: `p/x g_cfsr`, `p/x g_mmfar`, `p/x *(uint32_t*)0xE000ED24` (SHCSR), `p/x *(uint32_t*)0xE000ED90` (MPU_TYPE), `p/x $psp`, `x/8wx $psp` (stacked frame; word 6 = stacked PC). 4) `arm-none-eabi-objdump -d` the ELF and find the store instruction in mpu_guard_selftest at that PC. 5) Repeat at -O2.
- **기록할 것:** Raw hex of CFSR, the decoded MMFSR bits (DACCVIOL, MMARVALID, MSTKERR, MUNSTKERR, IACCVIOL), MMFAR, SHCSR, MPU_TYPE (DREGION should read 8, but record the actual value), PSP at fault, the 8 stacked words, the stacked PC, and the matching objdump line (address + `str` instruction). Board, silicon rev, gcc version, optimization level, probe/OpenOCD version and date. If any value differs from the expected table, record the discrepancy as-is.
- **글에 넣을 위치:** Replace the sentence at L161 ('측정값이 아닙니다') and add an 'observed' column to the L163-169 table, with a short environment line (board/rev/gcc/-O level/probe/date) directly above it. Paste the GDB output as a ```text output block.
- **오르는 항목:** C: moves the guard check from a procedure (capped at 9 under rubric 3-1 L96) to a reproducible procedure with observed results (8-11 band, top of it). A: confirms the Table 4-25 derivation empirically, e.g. that MMARVALID=1 and stacked PC = faulting store.

## 2. Real overflow (not a direct store): a recursion that walks the PSP down into the guard, to observe whether the fault is DACCVIOL or MSTKERR and how lazy FP stacking changes it (L173 claim).

- **준비:** Same board/toolchain as item 1. Two builds: (a) no FPU use in the thread (CONTROL.FPCA=0), (b) the recursive function does one float operation so FPCA=1 and the extended frame (S0-S15, FPSCR) is stacked. Record FPU->FPCCR (LSPEN/ASPEN) values.
- **절차:** 1) Write a recursive function with a small fixed frame (check the frame size with -fstack-usage and record the .su line). 2) Run it on the guarded PSP stack until it faults. 3) In the handler record CFSR, MMFAR, PSP, and whether MMARVALID is set. 4) Repeat with build (b). 5) Repeat with the frame size chosen so the fault hits on a normal push versus during exception-entry stacking, if achievable; record which case you got rather than forcing a result.
- **기록할 것:** For each build: the .su frame size, CFSR raw + decoded bits (DACCVIOL vs MSTKERR vs MLSPERR), MMFAR and MMARVALID, PSP at entry, FPCCR, and whether the stacked PC was usable or garbage. Note any case where you got HardFault instead (HFSR raw, FORCED bit).
- **글에 넣을 위치:** New short subsection after L173 ('실제 overflow에서 관찰한 것'), as a two-row table (FPCA=0 / FPCA=1) with the environment line. It replaces L173's purely derived description with observed behaviour while keeping the DUI 0553A citations.
- **오르는 항목:** C: real measurement plus a failure mode and an environment difference (FP context on/off), which is the 12-15 band wording ('실제 측정·실패·환경 차이'). A: confirms or corrects the MSTKERR/stacked-context claim.

## 3. Guard-skip demonstration (the L137 claim that a frame larger than the guard jumps past it into the privileged background map without a fault).

- **준비:** Same board/toolchain. A function with a local buffer larger than the guard (e.g. uint8_t buf[128]) that writes only buf[0] first, built at -O0 and -O2; check in objdump that SP is decremented by more than 32 B in one `sub sp` and that the first store lands below 0x20018000. Put a known canary pattern (e.g. 0xDEADBEEF) in 0x20017F00-0x20017FFF before the test.
- **절차:** 1) Bring PSP to just above the guard (e.g. 0x20018020 + small margin) via a controlled call depth. 2) Call the large-frame function once with the 32 B guard (SIZE=4). 3) Check whether a MemManage fault occurred and dump 0x20017F00-0x20017FFF to see if the canary was overwritten. 4) Change region 7 to 256 B (SIZE=7, base aligned to 256, e.g. 0x20018000 still works) and repeat.
- **기록할 것:** objdump of the function prologue (the `sub sp, #N` value), PSP before the call, whether a fault occurred (CFSR/MMFAR if so), the canary dump before/after (`x/64wx 0x20017F00`), for both guard sizes. If the 32 B guard does fault in practice (e.g. the compiler stores near the top first), record that and say so instead of the expected result.
- **글에 넣을 위치:** Directly after L137 as a measured example: 'guard 32 B: no fault, canary at 0x2001xxxx overwritten / guard 256 B: DACCVIOL, MMFAR=...'. Also gives evidence for fixing the sibling rtos/practical-internals/part4-06 L150 and for a known-falsehoods entry.
- **오르는 항목:** C: a recorded failure and the trade-off (guard size vs region budget) on real hardware, the 12-15 band criterion. A: turns L137 from derivation into an observed fact; also backs the D cross-series contradiction fix.

## 4. Unprivileged task boundary test after drop_to_unprivileged(): which accesses fault and with which fault type (resolves the L177 vs L197 SCS/vector-table wording).

- **준비:** Same board/toolchain. A task running on PSP inside region 1 (0x20000000-0x20000FFF) after drop_to_unprivileged(). Enable BusFault and UsageFault in SHCSR too (BUSFAULTENA, USGFAULTENA) so they do not escalate, and give each handler the same capture code.
- **절차:** From the unprivileged task, one access per run: (a) read 0x20000FFC (inside region 1, expect no fault), (b) write 0x20001000, (c) read GPIOD->ODR (0x40020C14), (d) read SCB->CPUID (0xE000ED00), (e) read the vector table word at 0x08000004, (f) execute an SVC to confirm the escape path works. Record which handler runs for each.
- **기록할 것:** Per access: handler entered (none / MemManage / BusFault / HardFault), CFSR raw, MMFAR or BFAR with valid bit, CONTROL value read before the access (nPRIV=1, SPSEL=1). Record the actual result for (d) and (e) even if it contradicts the post's current wording.
- **글에 넣을 위치:** A small results table after the drop_to_unprivileged() code at L179-185, and rewrite L177 to match what was observed for peripheral, SCS and vector-table accesses (citing 4.5.2 alongside the observation).
- **오르는 항목:** A: settles the L177/L197 contradiction with first-hand evidence instead of guessing. C: observed results for the task-isolation half (also helps E/B since 'Task 격리' is the weakest delivered keyword).

## 5. Context-switch region 1 rewrite on real hardware: a minimal two-task PendSV switch that reprograms region 1 per task, with cycle cost.

- **준비:** Same board/toolchain. DWT->CYCCNT enabled (CoreDebug->DEMCR TRCENA, DWT->CTRL CYCCNTENA). Two unprivileged tasks with RAM at 0x20000000 (4 KB) and 0x20001000 (4 KB). Record SYSCLK (e.g. 168 MHz from HSE 8 MHz, as actually configured) and flash wait states/ART settings (FLASH->ACR).
- **절차:** 1) In PendSV, call mpu_write_region(1, next_base, rasr) then __DSB() (no ISB, per the 4.5.8 exception-entry case). 2) Read CYCCNT before and after the region write+DSB, over e.g. 1000 switches; record min/max/mean. 3) Verify isolation: have task A try to write task B's RAM and confirm MemManage with MMFAR in B's range. 4) Optionally repeat with an ISB added and report whether behaviour or cycle count changes.
- **기록할 것:** Cycle counts (min/max/mean, sample count), SYSCLK, FLASH->ACR, gcc version and -O level, the CFSR/MMFAR from the cross-task write, and the PendSV code actually used.
- **글에 넣을 위치:** Expand L187 into a short code block (PendSV region-1 rewrite) plus a one-line measured cost and the isolation check result, with the environment line.
- **오르는 항목:** C: adds runnable code with observed results and a measured cost (trade-off) for the task-isolation part. A: gives a concrete basis for the DSB-only vs DSB+ISB choice discussed under 4.5.8.

## 6. HardFault fallback conditions (L171): selftest with MEMFAULTENA=0 and with the caller holding PRIMASK=1.

- **준비:** Same board/toolchain, HardFault_Handler with the same capture code plus HFSR (0xE000ED2C).
- **절차:** Run mpu_guard_selftest() three ways: (a) normal (PRIMASK=0, MEMFAULTENA=1), (b) MEMFAULTENA cleared, (c) call mpu_setup() and the selftest with PRIMASK=1 set by the caller. Record which handler runs.
- **기록할 것:** For each case: handler entered, HFSR raw (FORCED bit), CFSR raw (DACCVIOL/MMARVALID still set or not), MMFAR, PRIMASK value at the store.
- **글에 넣을 위치:** L171 and the MEMFAULTENA pitfall at L199-201: list both escalation conditions with the observed HFSR/CFSR values.
- **오르는 항목:** A and C: confirms the escalation conditions from 2.4.2 on hardware and turns the troubleshooting line into an observed result.

## 7. Toolchain record for the drop_to_unprivileged() ISB question (L179-184): whether __set_CONTROL in the CMSIS version actually linked already emits ISB.

- **준비:** The firmware ELF from item 4, built with the stated gcc version and CMSIS_5 5.9.0 (record the actual CMSIS version used in the project).
- **절차:** `arm-none-eabi-objdump -d firmware.elf | grep -A6 '<drop_to_unprivileged>:'` and count `isb` instructions after `msr CONTROL`.
- **기록할 것:** The disassembly lines (msr CONTROL, isb, isb) and the CMSIS and gcc versions.
- **글에 넣을 위치:** One sentence after the L179-185 code: either drop the explicit __ISB() or say it is kept deliberately for CMSIS versions without the built-in ISB, citing the observed disassembly.
- **오르는 항목:** A: removes the redundant-ISB ambiguity with evidence from the actual build (a firmware build record, not a dev-machine runtime measurement).
