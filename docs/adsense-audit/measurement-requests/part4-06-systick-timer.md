# 작성자 측정 요청 — `part4-06-systick-timer.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part4-06-systick-timer.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 3 (루프 종료 점수 76)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어·도구로 얻은 값과 기록이 있어야 오른다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 작성자가 직접 얻은 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. Measured SysTick tick period and jitter at the post's configuration (HCLK = 168 MHz, RELOAD = 167999), taken from the ISR pulse described in the '측정 / 동작 확인' section

- **준비:** The actual STM32F407 board, named with board name, MCU revision (read DBGMCU_IDCODE REV_ID) and crystal frequency. Note that STM32F4DISCOVERY has its LEDs on PD12-PD15, not PA5, so record the pin you actually used and fix the post's pin if it differs. Toolchain name and version (e.g. arm-none-eabi-gcc x.y, -O level), CMSIS 5.9.0 / cmsis-device-f4 v2.6.9, clock_init_168mhz() from 4-04. Oscilloscope or logic analyzer: model, sample rate, probe point.
- **절차:** 1. Build the post's code: clock_init_168mhz(); systick_init_1ms(168000000u); SysTick_Handler with the BSRR pulse. 2. Use MCO2 (PC9, SYSCLK with a prescaler) to confirm the actual SYSCLK. 3. Capture at least 10 s of pulses. Use the analyzer's period statistics, or export the edges to CSV and compute mean, min, max and std-dev of the interval. 4. Run once idle and once with another higher-priority IRQ (e.g. TIM2 from 4-05) firing, to show the jitter caused by preemption.
- **기록할 것:** Scope/LA model and sample rate. Measured SYSCLK (via MCO). Number of pulses. Mean, min, max and std-dev of the interval in µs, idle and under the TIM2 load. One screenshot of the capture with cursors. Pulse width of the BS5/BR5 pair.
- **글에 넣을 위치:** '측정 / 동작 확인': right after 'pulse 간격은 1 ms여야 하고' (L221) add a short result table (environment line + measured numbers) and the capture image with alt text.
- **오르는 항목:** C (from 'expected result only' toward 12-15: real measurement with environment and limits); A (first-hand data no reference manual gives, e.g. jitter under a preempting IRQ)

## 2. Reproduce the three rows of the misconfiguration table and measure the real tick period for each

- **준비:** Same board and toolchain as item 1. Logic analyzer on the ISR pulse pin. Three builds: (a) SysTick_Config(SystemCoreClock/1000u) with no SystemCoreClock update after 4-04's register-level clock_init_168mhz(); (b) SystemCoreClockUpdate() called with HSE_VALUE left undefined; (c) the post's init with CLKSOURCE = 0 (or HAL_SYSTICK_CLKSourceConfig(SYSTICK_CLKSOURCE_HCLK_DIV8)).
- **절차:** For each build: flash it, read SystemCoreClock and SysTick->LOAD with the debugger (or print them over UART), and capture the pulse interval for at least 100 ticks. Also time the LED toggle state length with the analyzer.
- **기록할 것:** For each row: SystemCoreClock value read, SysTick->LOAD read, measured tick interval (mean), and measured LED state length. Note any row where the measurement disagrees with the computed value (≈95.24 µs, 3.125 ms, 8 ms) and by how much.
- **글에 넣을 위치:** The misconfiguration table at L203-L207: add a 'measured' column next to the computed '1 tick' and 'LED 한 상태' columns, plus an environment note under the table.
- **오르는 항목:** C (moves the table from computed predictions to verified observations, the failure cases the 12-15 band asks for); A (verified failure cases)

## 3. Actual delay_ms(n) duration distribution, including the worst case, to inform the open '(n-1, n]' vs 'n+1' bound issue

- **준비:** Same board and toolchain. Instrument with DWT->CYCCNT (after confirming it increments), or toggle a GPIO around the call and measure it on the LA. One run with a background IRQ load (e.g. TIM2 at a rate that is not a multiple of 1 kHz, or UART RX) so that wakeups from non-SysTick interrupts land near tick edges.
- **절차:** 1. Call delay_ms(n) for n = 0, 1, 2, 10, 100, at least 1000 times each, starting at random phases (e.g. after a pseudo-random CYCCNT busy-wait). 2. Record CYCCNT before and after each call and convert to µs at 168 MHz. 3. Repeat with the IRQ load enabled. 4. If the author changes delay_ms to the PRIMASK-guarded check+WFI form, repeat for both versions.
- **기록할 것:** For each n and each version: sample count, min, max and mean duration in µs, and whether any sample exceeded n ms (count and maximum excess). Toolchain -O level. State clearly that a test cannot prove the race window absent; it only shows the observed max.
- **글에 넣을 위치:** Section '2. delay_ms', after the resolution paragraph (L117), as a small table. Adjust the '(n-1, n]' wording and the 정리 bullet (L241) to the analytically correct bound, and cite the measurement as supporting evidence only.
- **오르는 항목:** C (measured limit and trade-off: WFI power saving vs bound tightness); A (analysis the reference docs don't give)

## 4. delay_us_dwt accuracy and overhead, and a DWT presence check

- **준비:** Same STM32F407 board; dwt_init() from performance-engineering 5-07. Build at -O0 and -O2 (record the compiler version). LA on a GPIO toggled around the call.
- **절차:** 1. After dwt_init(), read CYCCNT twice with a known gap to confirm it increments (log both values). 2. Measure delay_us_dwt(us, 168000000u) for us = 1, 2, 5, 10, 100, 1000, 100 runs each, with GPIO set/reset around the call. 3. Subtract the measured cost of an empty GPIO set/reset pair. 4. Repeat with SysTick running to show ISR-induced overshoot.
- **기록할 것:** CYCCNT sanity values. For each us and -O level: min, max and mean measured duration and overshoot in ns/cycles. Fixed call overhead in cycles. Max overshoot with SysTick active.
- **글에 넣을 위치:** Section '4. Microsecond delay — DWT cycle counter', after L165: one table plus one sentence on the smallest practical us value.
- **오르는 항목:** C (real measurement with environment and limits); A (selection criterion: below which us value the call overhead dominates)

## 5. SysTick_Handler cost and CPU load at 1 kHz

- **준비:** Same board and toolchain (-O level noted). DWT CYCCNT, or LA on the ISR pulse plus a main-loop GPIO toggle.
- **절차:** 1. Measure ISR cost: either sample CYCCNT around the handler body, or use the LA to measure the gap that appears in a tight main-loop toggle every ms (this gap includes exception entry and exit). 2. Compute load = cycles_per_tick / 168000. 3. Optionally compare with HAL's HAL_IncTick-based handler if HAL is linked.
- **기록할 것:** Handler cycles (min/max over 1000 ticks), main-loop gap in ns from the LA, computed CPU load %, compiler flags.
- **글에 넣을 위치:** '측정 / 동작 확인', next to the item 1 results: one or two sentences, or a row in that table.
- **오르는 항목:** A (first-hand cost figure that supports the 1 ms jiffies choice); C

## 6. Behaviour after Stop-mode wake without clock re-init: tick period and g_jiffies lag

- **준비:** Same board. Stop-mode entry/exit code from 4-11 (EXTI wake-up), RTC or LA as the external time reference, LA on the ISR pulse pin.
- **절차:** 1. Record g_jiffies and an RTC timestamp (or an LA marker GPIO) before Stop. 2. Stay in Stop for a measured interval (e.g. about 5 s, woken by a button/EXTI). 3. Right after wake, before calling clock_init_168mhz() again, capture the SysTick pulse interval for about 20 ticks. 4. Re-init the clocks and capture again. 5. Compare the g_jiffies delta with the external elapsed time.
- **기록할 것:** Time spent in Stop (external reference), g_jiffies delta, lag in ms. Measured tick interval right after wake (before re-init) and after re-init. RCC->CFGR SWS value read after wake.
- **글에 넣을 위치:** '자주 보는 함정' → 'Stop mode 동안 jiffies가 멈춤' (L233-L235): add the measured lag and post-wake tick period as observed values with the environment line, next to the HAL source citations.
- **오르는 항목:** C (failure case recorded on hardware, environment difference); also closes the B issue about the post-wake HSI clock with evidence

## 7. Debugger-halt lag measurement

- **준비:** Same board, the debug probe and GDB/IDE in use (name and version), LA or RTC as reference, DBGMCU settings recorded.
- **절차:** 1. At a breakpoint, read g_jiffies and the RTC (or note an LA marker on a GPIO). 2. Stay halted for a timed interval (best measured on the LA as the gap in the SysTick pulses). 3. Resume to a second breakpoint and read g_jiffies and the RTC again.
- **기록할 것:** Halt duration (external), g_jiffies delta, computed lag. Probe and debugger versions. Whether any DBGMCU freeze bits were set.
- **글에 넣을 위치:** 'Debugger break 뒤 시간이 밀림' (L229-L231): one sentence with the measured numbers and environment.
- **오르는 항목:** C (observed, reproducible pitfall with environment)

## 8. On-target check of the wrap-safe comparison against the naive comparison, and of the periodic task across the wrap

- **준비:** Same board (or a host build, labelled as such), with g_jiffies preset to 0xFFFFFFF0 by the debugger or in code. UART or RTT for logging.
- **절차:** 1. Preset g_jiffies = 0xFFFFFFF0u and call timeout_start(&t, 0x20). 2. Every tick until past 0x00000020, log time_reached() and the naive now >= deadline result. 3. Run task_100hz across the wrap and log the intervals between do_work() calls.
- **기록할 것:** The real log excerpt around the wrap: tick value, naive result, time_reached result. The do_work intervals across the wrap as actually logged.
- **글에 넣을 위치:** 'Wrap에 안전한 시간 비교', after the code block (L62-L66): a short block of real output with the environment line.
- **오르는 항목:** C (reproducible procedure plus observed result instead of assertion); A slightly
