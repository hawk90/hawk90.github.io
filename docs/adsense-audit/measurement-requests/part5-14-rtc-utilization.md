# 작성자 측정 요청 — `part5-14-rtc-utilization.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part5-14-rtc-utilization.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 4 (루프 종료 점수 72)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어·도구로 얻은 값과 기록이 있어야 오른다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 작성자가 직접 얻은 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. Observe the calendar read-order behavior: the correct SSR → TR → DR order vs the two failure orders that the verdict table currently only infers.

- **준비:** The author's STM32F407 board, recorded by exact name and revision (for example STM32F4DISCOVERY MB997 with its revision, or a custom board). Record whether an LSE 32.768 kHz crystal is fitted and its load caps. Also record the SYSCLK/PCLK1 frequencies, the toolchain and version (arm-none-eabi-gcc -v), the CMSIS version already cited (cmsis-device-f4 v2.6.9), and the UART terminal and baud rate.
- **절차:** 1) Build the post's main() unchanged and capture at least 30 s of UART output to a file (for example `picocom -b 115200 /dev/ttyACM0 | tee order_ok.log`). 2) Build variant B, where rtc_read reads TR and DR first and SSR last, and capture again. 3) Build variant C, where rtc_read never reads DR, and capture again. Keep the 100 ms loop for all three.
- **기록할 것:** For each variant, paste 3-5 consecutive log lines around one second rollover, unedited. Count how many rollovers out of N (for example N = 30) show the ms wrap and the second increment on the same line vs one line later. For variant C, record whether H:M:S freezes and after how long.
- **글에 넣을 위치:** ## 측정 / 동작 확인, the first verdict table (L313-317): replace or annotate the L316 and L317 rows, and the L319 sentence ('이 글이 추론한 증상입니다'), with the observed logs. Put the board/toolchain line at the top of the section (before the main() block at L297).
- **오르는 항목:** C (a procedure-only table becomes observed results plus failure cases, which lifts C out of the procedure-only cap toward 12+) and A (first-hand failure cases unique to this post).

## 2. Actually run the VBAT retention test, with real times and battery voltage.

- **준비:** Same board, with a coin cell (or a bench supply) on VBAT and its voltage measured with a multimeter. Record how VDD is switched (USB unplug, jumper, bench supply). The host clock should be NTP-synced so the off duration is known.
- **절차:** Follow the post's 3 steps (L323-325) exactly. Run it at least twice: once with VDD off for about 60 s and once for 10 minutes or more. Then run the 'VBAT tied to VDD / no battery' variant once (remove the cell, or use a board where VBAT is tied to VDD) to see the reset-to-default row.
- **기록할 것:** For each run: the last line before VDD off, the host timestamp at off and on, the first line after power-on including the 'calendar kept / reset to default' line, the VBAT voltage, and the RTC elapsed time vs the host elapsed time (difference in seconds).
- **글에 넣을 위치:** ## 측정 / 동작 확인, the VBAT table (L327-331). Put the observed rows or log right under the table, and move the long VBAT-tied-to-VDD note out of the last cell (L331) into that observation paragraph.
- **오르는 항목:** C (observed results plus an environment difference: battery vs tied VBAT) and F (fixes the long table cell).

## 3. Measure LSE accuracy/drift in ppm on this board.

- **준비:** Same board and crystal (record the crystal part number and load caps if known). Either (a) a frequency counter, or a logic analyzer with a known timebase, on the RTC_AF1 calibration output (CR.COE = 1, COSEL = 0 for the 512 Hz output on PC13; run this separately from the tamper test because PC13 is shared), or (b) a host NTP clock. Record the ambient temperature.
- **절차:** (a) Enable COE, measure the calibration output frequency over a gate time of at least 10 s, and repeat 3 times. Or (b) set the RTC from host time and log the RTC time vs host UTC every hour for at least 24 h (a script on the author's host compares the two).
- **기록할 것:** The measured frequency, or the accumulated offset in seconds after 24 h, converted to ppm and s/day, with the temperature, the instrument model and the gate time.
- **글에 넣을 위치:** A new short 'LSE 오차' paragraph or row in ## 측정 / 동작 확인, linked from the L19 sentence that puts smooth calibration (RTC_CALR) out of scope. It gives the reader a real number for when calibration might be needed.
- **오르는 항목:** C (real measurement plus a trade-off: when calibration is worth it) and A (a board-specific number not found in the RM or HAL).

## 4. Measure the LSE startup time, and the failure mode with a dead or missing crystal (the LSERDY wait without a timeout).

- **준비:** Same board. The DWT cycle counter (DWT->CYCCNT) at a known SYSCLK, or a GPIO toggle plus a logic analyzer. A backup domain reset (BDCR.BDRST, or remove both VDD and VBAT) before each cold LSE start.
- **절차:** 1) Measure the time from LSEON = 1 to LSERDY = 1 over at least 10 cold starts. 2) If the board allows it safely, do one run with the crystal disconnected or a load cap removed (or on a board without the LSE fitted) and observe whether rtc_init hangs. Optionally repeat with an added timeout to show the fallback path.
- **기록할 것:** Min/typ/max startup time in ms over N runs. For the failure run: whether LSERDY ever set and how long you waited, plus a debugger snapshot of the PC in the while loop.
- **글에 넣을 위치:** ### 2. LSE 활성화 + RTC init, in the prose after the code block (L148-150), and a new pitfall in ## 자주 보는 함정 (L333-349, for example 'LSE가 발진하지 않음'), justifying a timeout value from the measured max. The existing DBP pitfall (L337) already names the same LSERDY wait loop.
- **오르는 항목:** C (an observed failure plus a measured number that sets the timeout). B indirectly (closes the 'no timeout' issue with evidence).

## 5. Observe the alarm behavior: the each-minute alarm, and the 'mask seconds → flag every second' statement.

- **준비:** Same board. Add a call to alarm_init_each_min() in main. The handler logs the time (SSR/TR/DR) and a counter over UART.
- **절차:** 1) Run for at least 5 minutes and log each ALRAF interrupt with its RTC time. 2) Variant: set MSK1 = 1 while keeping the minute compare (or the daily 09:00 with seconds masked) and log the interrupts within the matching minute.
- **기록할 것:** The timestamp of each alarm interrupt, plus the SSR value showing where in the second it landed. For the variant, the number of interrupts within the matching minute, next to the post's stated 60 matches (L74).
- **글에 넣을 위치:** ### 4. Alarm — 매분 0초 (after the L240 paragraph), and ## 측정 / 동작 확인 as a third check. It also backs the 정리 bullet on MSKx (L357).
- **오르는 항목:** C (adds the alarm verification that the review says is missing).

## 6. Check tamper and backup-register behavior on real hardware, including a tamper event while VDD is off.

- **준비:** Same board, with PC13 wired to a switch with a pull-down (low = closed case). VBAT is battery-backed. Record that RTC_AF1/COE is not used in this test.
- **절차:** 1) With VDD on: boot (rtc_init → tamper_init → bkp_check), confirm bkp_check returns 1 on the second boot, then press the switch, and on the next boot check what bkp_check returns. 2) With VDD off (VBAT only): press the switch, then restore VDD. Before tamper_init runs, print RTC->ISR (TAMP1F, TSF, TSOVF), TSTR/TSDR and BKP0R. 3) Hold PC13 high while booting, so it is already high when tamper_init re-arms. Print ISR and BKP0R right after bkp_check and again 10 ms later.
- **기록할 것:** For each case, the raw register values printed (ISR hex, TSTR/TSDR decoded, BKP0R before/after), whether the handler fired, and the bkp_check return values across boots.
- **글에 넣을 위치:** ### 5. Tamper detection (after the L270-272 paragraphs) and ### 6. Backup register (after L293), plus a tamper check in ## 측정 / 동작 확인. Case 2 decides whether the L19 use case ('케이스 열림을 감지하는 tamper 기록') and the L80 statement that detection works while VDD is off hold for power-off events, and whether tamper_init must log TSTR/TSDR before it clears the flags (L248). Case 3 decides the bkp_check re-check question and backs the pitfall at L347-349.
- **오르는 항목:** C (observed results for the tamper/backup path, which is currently untested) and A (first-hand failure cases: the power-off tamper and the level-at-re-arm event). It also resolves B uncertainties with evidence.

## 7. Measure the shadow register update period. The post states two different intervals: 'every 2 RTCCLK' at L61 (RM0090 26.3.2), and the 1 RTCCLK re-read interval at L208 (RM0090 26.3.6).

- **준비:** Same board, BYPSHAD = 0, a known SYSCLK, with the DWT cycle counter enabled.
- **절차:** In a loop: clear RSF with rtc_clear_flags(RTC_ISR_RSF), read CYCCNT, poll until RSF = 1, read CYCCNT again, then store the delta. Collect at least 1000 samples and compute the max and a histogram. For reference, the post gives 1 RTCCLK as about 30.5 µs (L208).
- **기록할 것:** The min/max/histogram of the RSF re-set interval in µs, with SYSCLK and how the count was converted to time.
- **글에 넣을 위치:** ### Shadow register와 읽기 순서 (L61): state the RM inconsistency and give the observed interval on this board as the tie-breaker, labelled clearly as a measurement, not as an RM statement. Adjust the L208 sentence in ### 3. 시간 읽기·쓰기 to match.
- **오르는 항목:** A (resolves the RM conflict with first-hand data, an original added value) and C (another observed measurement).
