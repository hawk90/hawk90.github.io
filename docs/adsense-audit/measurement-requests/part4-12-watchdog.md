# 작성자 측정 요청 — `part4-12-watchdog.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part4-12-watchdog.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 3 (루프 종료 점수 75)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어·도구로 얻은 값과 기록이 있어야 오른다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 작성자가 직접 얻은 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. Run the post's own '동작 확인' IWDG test on real hardware and time it. Measure how long the LED stays on with refresh, and how long it takes from the last kick to the IWDG reset.

- **준비:** Record the exact board (for example NUCLEO-F4xx or STM32F4DISCOVERY), the exact part number from the package marking (STM32F405xx or F407xx), the silicon revision (DBGMCU_IDCODE REV_ID read through the debugger), HSE/PLL settings giving PCLK1 = 42 MHz, the toolchain and version (arm-none-eabi-gcc -v, or the CubeIDE version), and the CMSIS and HAL tags used. You need a logic analyzer or scope (record its model and sample rate) on PA5 and on NRST. If the board's LED is not on PA5, change the pin and say so in the post.
- **절차:** 1) Build and flash the 동작 확인 code. First make the RESET_IWDG branch blink PA5 at a distinctive rate (for example 100 ms on/off) so a pass is visible without a debugger. 2) Disconnect the debugger session (or set DBG_IWDG_STOP = 0 and power-cycle) and power the board from a cold start. 3) Capture PA5 and NRST from power-on through at least the first IWDG reset. 4) Measure t1 = PA5 rising to PA5 falling (refresh segment) and t2 = PA5 falling to NRST low (no-kick timeout). 5) Repeat 5 times and record each t2.
- **기록할 것:** Board, part, and REV_ID; t1 for each run; t2 for each run (in ms, three significant figures); min/max of t2; one logic-analyzer screenshot showing PA5 on, PA5 off, the NRST pulse, and the blink pattern that follows; the raw RCC_CSR hex value read in the reset branch (via debugger or UART).
- **글에 넣을 위치:** ## 동작 확인: add a 'Measured result' paragraph and the capture image after the pass-condition paragraph (L216), with an environment line (board/part/REV_ID/toolchain). Put the measured t2 next to the LSI table at L43-47 as 'this chip: X.XXX s'.
- **오르는 항목:** C (moves from 8-11 'reproducible procedure' toward 12-15 'actual measurement with environment'). It also resolves the pass/fail ambiguity flagged in the 동작 확인 section.

## 2. Measure the real LSI frequency on this chip with the TIM5 CH4 input-capture method the post cites at L49, and compare the computed IWDG timeout with the t2 measured above.

- **준비:** Same board and part as above. TIM5 clocked from APB1 timer clock (84 MHz when PCLK1 = 42 MHz with APB1 prescaler ≠ 1). LSI routed to TIM5_CH4 via TIM5->OR (TI4_RMP = LSI). Record the ambient temperature (thermometer reading) and VDD (multimeter).
- **절차:** 1) Enable LSI, remap TIM5 CH4 to LSI, and capture N = 8 consecutive rising edges with the input-capture prescaler at /8. 2) Compute f_LSI = f_TIM5 × 8 / Δcapture, averaged over at least 100 captures, and log it over UART. 3) Compute the predicted timeout = 500 × 64 / f_LSI and compare it with the measured t2. 4) Optionally, repeat after 10 minutes of warm-up and with the board in a freezer or under a heat gun, recording the temperature each time.
- **기록할 것:** f_LSI (Hz) mean and min/max over the captures; temperature and VDD; predicted timeout vs measured t2 and their difference (%). Do not claim anything about the 17-47 kHz extremes from one chip. Record only what this chip showed.
- **글에 넣을 위치:** ### IWDG timeout과 LSI 편차: add a short paragraph after L49 with the measured value and the capture code (or a short snippet), stating that it is one sample within the DS8626 range.
- **오르는 항목:** C (actual measurement plus environment difference) and A (an author-made result that shows where one real chip sits inside the datasheet range, which other pages do not give).

## 3. Measure WWDG timing on hardware: the time to reset without refresh, the window-open boundary, and the EWI-to-reset gap. The goal is to confirm the post's 1-step uncertainty claim, (49.15, 49.93] ms and (23.4, 24.2] ms.

- **준비:** Same board, PCLK1 = 42 MHz verified by outputting SYSCLK/PCLK on MCO (PA8 or PC9) and measuring it with the analyzer. WWDG configured exactly as in wwdg_init(). The logic analyzer is on a debug GPIO and NRST, sampling at 1 MHz or faster.
- **절차:** 1) No-refresh test: set a GPIO high immediately before writing WWDG_CR in wwdg_init(), then spin. Measure GPIO high → NRST low. Repeat 20 times. 2) Window boundary: after one wwdg_kick(), wait a calibrated delay D (via a DWT cycle counter) and then kick again. Sweep D from 23.0 to 25.0 ms in 0.1 ms steps, with 10 trials per step, and record whether each trial reset. 3) EWI: enable EWI, toggle a GPIO at ISR entry, and measure ISR entry → NRST low.
- **기록할 것:** 20 no-refresh times (min/max/mean); a reset/no-reset table versus D, giving the smallest D with 0/10 resets and the largest D with 10/10 resets; EWI-entry-to-reset times (min/max); the measured MCO frequency.
- **글에 넣을 위치:** ### WWDG with window: add a table or paragraph after L144 that gives the measured ranges next to the computed (49.15, 49.93] ms and (23.4, 24.2] ms. Put the EWI gap after L148.
- **오르는 항목:** C (measured timing with a stated environment) and B/AP-C-07 (backs the stated uncertainty range with data). It also gives A a result that the HAL comment's single 49.93 ms figure does not show.

## 4. Read the raw RCC_CSR value after each reset type, to validate the get_reset_cause() order and the POR → PORRSTF|PINRSTF|BORRSTF claim at L192.

- **준비:** Same board. Use a UART log or a debugger memory read of RCC_CSR at the first line of main, before RMVF. Use the board's own startup code with no bootloader that writes RMVF, and state which startup was used.
- **절차:** Trigger each cause in turn and read RCC_CSR before clearing it: (a) a cold power-on from USB or a bench supply, (b) the NRST button, (c) NVIC_SystemReset(), (d) IWDG timeout, (e) WWDG timeout, (f) optionally a brown-out, by slowly lowering VDD on a bench supply below the BOR threshold with the BOR level set in the option bytes. Record the option-byte BOR level used.
- **기록할 것:** A table of trigger → raw RCC_CSR hex → the value get_reset_cause() returned. Include whether BORRSTF was set on the plain power-on (expected per RM0090 7.3.21).
- **글에 넣을 위치:** ### Reset 원인 확인: add the table after L192. The same data can be cited when the sibling part10-12 BORRSTF defect is fixed.
- **오르는 항목:** C (observed results for each branch of the code shown) and A (first-hand evidence for the post's distinctive point about the BORRSTF order). It also supports the AP-C-18 sibling fix with data.

## 5. Reproduce, on purpose, the WDG_SW = 0 boot-loop failure described at L89, and the debug-freeze persistence claim at L159.

- **준비:** Same board. Use STM32CubeProgrammer (record its version) to set the WDG_SW option bit to 0 (hardware watchdog), and restore it to 1 afterwards. Run the debugger with a breakpoint, with OpenOCD or ST-LINK GDB server (record which, and its version).
- **절차:** 1) With WDG_SW = 0, flash firmware whose first kick comes after a deliberate busy-wait of 200 ms, then 500 ms (longer than the 0.349 s LSI-max bound). Capture NRST over 5 s and count the resets. 2) Restore WDG_SW = 1. 3) Freeze test: halt at a breakpoint for 5 s with DBG_IWDG_STOP = 0 and then = 1, and note whether a reset occurs. Then set the bit, run NVIC_SystemReset(), and read DBGMCU_APB1_FZ. Power-cycle and read it again.
- **기록할 것:** For each busy-wait value: reset or no reset, and the loop period from NRST (ms). Freeze test: reset yes/no for each bit value. DBGMCU_APB1_FZ hex after the system reset and after the power cycle.
- **글에 넣을 위치:** The boot-loop result goes after L89, as a measured failure case linked to 10-06. The freeze result goes after L159 in ### Debug freeze.
- **오르는 항목:** C (a recorded real failure plus the conditions that cause it) and A (a failure case seen first-hand, which raises A toward the 20-25 band).
