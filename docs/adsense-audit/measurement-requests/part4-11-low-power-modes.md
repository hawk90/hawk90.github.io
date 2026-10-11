# 작성자 측정 요청 — `part4-11-low-power-modes.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part4-11-low-power-modes.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 3 (루프 종료 점수 69)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어·도구로 얻은 값과 기록이 있어야 오른다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 작성자가 직접 얻은 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. Steady-state IDD in each mode on a real STM32F407, set beside the DS8626 typical values already in the table: Run at 168 MHz, Sleep at 168 MHz, Stop with the low-power regulator (flash in Stop), and Standby with LSE and RTC on

- **준비:** STM32F4DISCOVERY (MB997, STM32F407VGT6). Record the board revision and the silicon revision (DBGMCU->IDCODE REV_ID). Measure on the IDD jumper JP1, and check in UM1472 which rails JP1 covers. Use a Nordic PPK2 in ampere-meter mode, a Joulescope, or a DMM in series, and record the model and range. Build the post's own code with the toolchain version and firmware commit hash recorded. Note that the board uses an 8 MHz HSE where DS8626 assumes a 4 MHz external clock with PLL, so record the actual PLL settings. Record ambient temperature and VDD measured at the MCU.
- **절차:** 1) Remove JP1 and connect the meter across it. 2) Disconnect the ST-LINK debugger, or power the board from an external supply after flashing, and clear DBGMCU->CR to 0. 3) Make one firmware build per mode, each of which sets all unused GPIO to analog first. Run mode: a busy loop at 168 MHz with every peripheral clock off. Sleep mode: sleep_now() with SysTick disabled. Stop mode: stop_mode_enter() with LPDS=1 and FPDS=0. Standby mode: standby_with_rtc_wake(32). 4) Let the reading settle for 10 s and record the average over 5 s. 5) Repeat with the peripheral clocks the post's code enables (GPIOA, USART2, PWR, SYSCFG) turned on, so the post's '40 mA is a lower bound' claim gets a real number.
- **기록할 것:** For each mode: the average current in mA or µA, the meter range and resolution, VDD, and temperature. Record both 'no peripheral clocks' and 'post-code peripheral clocks' values for Run and Sleep. Capture a screenshot or log of each reading. Do not write the table cell in advance. If a value is far from the datasheet value (for example, Stop well above 0.31 mA because of board leakage), record the gap as it is, along with the suspected cause, such as other loads on the JP1 path.
- **글에 넣을 위치:** Add a 'Measured on board' column to the '세 가지 저전력 모드' table (L33-38), or a new section '측정 절차와 결과' after the 핵심 개념 section, with the setup line. Put the post-code peripheral-clock Run value next to the L88 assumption bullet.
- **오르는 항목:** C: adds a reproducible procedure, observed results and environment differences (board vs datasheet conditions), which moves C from the 8-11 band toward 12-15. A: first-hand hardware measurement.

## 2. Average current over a 1 s duty cycle (10 ms Run + 990 ms Stop, and 10 ms Run + Standby with an RTC wake every 1 s), to test the computed 0.71 mA and 0.40 mA and the effect of the excluded wake and inrush terms

- **준비:** The same board and JP1 path. Use a PPK2 or Joulescope at 100 kS/s or more, because a DMM cannot average this pulse shape. Build firmware where the active phase toggles a GPIO and spins for 10 ms at 168 MHz. Standby variant: the RTC wake timer at 1 s (WUCKSEL=000, WUTR=2047). Stop variant: the RTC wakeup via EXTI line 22, or an external 1 Hz pulse generator on PA0.
- **절차:** 1) Flash each variant and detach the debugger. 2) Capture at least 20 consecutive periods. 3) Use the tool's region average over a whole number of periods. 4) Zoom into one wake event and integrate the charge (µC) of the Standby wake spike, and the time from wake to the start of the 10 ms active window (reset, clock init, C runtime).
- **기록할 것:** For each variant: the measured average current over N periods. For Standby: the charge per wake and the length of the post-wake init interval. Export a screenshot of one full period and one zoomed wake event. State the difference from the post's calculated 0.71 and 0.40 mA, and which assumption (L88-91) explains it.
- **글에 넣을 위치:** Under the duty-cycle table (L74-79), as a 'measured' row or a paragraph with the capture. Replace or annotate the L81/L84 ERUSH upper-bound reasoning with the measured inrush charge at 3.3 V and 25 °C, which also resolves the 'ERUSH 5.4 µC is not a 3.3 V bound' issue.
- **오르는 항목:** C: shows the real tradeoff between Stop and Standby, including the terms the calculation leaves out. Moves C toward 12-15 and removes a factual (C) issue.

## 3. Wake latency from the wake event to the first application instruction, for Stop (LP regulator) and Standby, set against Table 29 (17 µs and 375 µs)

- **준비:** The same board. Use a two-channel oscilloscope or a logic analyser (record the model and sample rate). Drive the wake source from a function generator or button on PA0 (EXTI0 for Stop, WKUP for Standby). Set a spare GPIO, for example PD12, as an output that goes high as the first action.
- **절차:** Stop: set PD12 at the top of EXTI0_IRQHandler, or right after __WFI(). Measure the time from the PA0 rising edge to the PD12 rising edge, over 20 samples. Standby: set PD12 in the first lines of Reset_Handler (before SystemInit) and a second pin after clock_init_168mhz() and before main logic. Measure PA0 rising to pin 1, and PA0 rising to pin 2.
- **기록할 것:** The minimum, typical and maximum latency for each. For Standby, both the 'first instruction' time (comparable to 375 µs) and the 'ready at 168 MHz' time (not in Table 29). Include a scope capture. Note that GPIO-write overhead adds a few cycles.
- **글에 넣을 위치:** Next to the L40 paragraph that says the 375 µs excludes clock and C runtime init, and next to the L91 assumption that init must fit in the 10 ms active window.
- **오르는 항목:** C: puts an observed result next to a datasheet figure and quantifies the init cost the post only states qualitatively.

## 4. Boot-cause log showing the SBF and WUF flags for a cold power-on, an NRST reset, and an RTC wake from Standby

- **준비:** The same board, with USART2 (PA2) at 115200 baud to a USB-UART adapter, or the ST-LINK VCP if the board revision has it. Use a terminal program such as screen or minicom, with its version recorded.
- **절차:** At the start of main, read PWR->CSR, print SBF and WUF, and print RCC->CSR reset flags (PORRSTF, PINRSTF). Then clear them with PWR_CR_CSBF and RCC_CSR_RMVF and call standby_with_rtc_wake(5). Test three cases: power-cycle the board, press NRST, and let it wake from the RTC.
- **기록할 것:** The verbatim UART log lines for each case, for example 'SBF=1 WUF=1' after an RTC wake. Note any case where a flag behaved differently than expected.
- **글에 넣을 위치:** In code section 3, after the L183 SBF explanation. This keeps the SBF explanation in one place, as the padding issue asks.
- **오르는 항목:** C: adds an expected and observed output for the Standby code path, which the reviewer flagged as missing ('what the SBF check should print after an RTC wake').

## 5. Reproduce the three pitfalls with numbers: (a) DBG_STOP or a debugger left connected in Stop, (b) a floating unused GPIO port vs analog mode, (c) the UART baud error when clock_init_168mhz() is skipped after Stop

- **준비:** The same board and meter as item 1. For (c), use the UART adapter plus a logic analyser to measure the bit time.
- **절차:** (a) Measure Stop current with DBGMCU->CR DBG_STOP=1 and the ST-LINK attached, then with DBG_STOP=0 and ST-LINK detached. (b) Measure Stop current with GPIOD left in its reset state (input, floating) and touch or near the pins, then with GPIOD MODER=0xFFFFFFFF (analog). (c) After a Stop wake, skip the clock re-init and send 'U' at the configured 115200 baud. Capture the bit width on the logic analyser and the garbled terminal output. Then repeat with re-init.
- **기록할 것:** (a) Two Stop current values. (b) Two values, plus the spread over a few readings for the floating case. (c) The measured bit time and actual baud, the terminal capture, and the expected ratio given APB1 = HSI 16 MHz instead of 42 MHz.
- **글에 넣을 위치:** Under each matching pitfall in '자주 보는 함정' (L201-211), and the clock-restore note at L145.
- **오르는 항목:** C: rubric 12-15 explicitly rewards recorded failures. A: first-hand failure records instead of datasheet paraphrase.
