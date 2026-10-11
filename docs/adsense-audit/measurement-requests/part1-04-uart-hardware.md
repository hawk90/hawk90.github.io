# 작성자 측정 요청 — `part1-04-uart-hardware.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part1-04-uart-hardware.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 2 (최종 점수 77, 상태 `max_rounds`)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어에서 잰 값과 기록이 있어야 오른다. 아래 항목을 측정해 주면 글에 넣는다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 측정값은 작성자가 직접 잰 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. Actual HSI frequency of the author's own STM32H743 at room temperature, compared with DS12110 Table 37 (63.7 to 64.3 MHz at 30 °C). This turns the ±0.47% production-test bound into one observed value.

- **준비:** The author's STM32H743 board (e.g. NUCLEO-H743ZI/ZI2). Record the board revision and the silicon revision read from DBGMCU_IDCODE REV_ID (0x1003 = rev Y, 0x2003 = rev V). Use a frequency counter or an oscilloscope with a frequency measurement function, referenced to a known-accurate timebase. Record the instrument model and its stated accuracy. Log the toolchain (STM32CubeIDE or arm-none-eabi-gcc version) and the cmsis-device-h7 version.
- **절차:** 1) Leave HSIDIV = 00 (hsi_ck = 64 MHz). 2) Route HSI to MCO1 on PA8 (RCC_CFGR MCO1SEL = HSI) with an MCO1 prescaler such as /4 = 16 MHz so the probe and counter can follow it. 3) Read the counter after at least 10 minutes of warm-up, at a stated ambient temperature. 4) Optionally read the die temperature from the internal temperature sensor (ADC3 VSENSE with TS_CAL1/TS_CAL2) at the same moment. 5) Repeat on a second board if one is available.
- **기록할 것:** Board and silicon revision, VDD (measured with a multimeter), ambient and die temperature, MCO1 prescaler, measured frequency (at least 6 significant digits) times the prescaler = f_HSI, and the deviation from 64 MHz in %. Include a counter or scope screenshot. Leave every field blank until it has been measured.
- **글에 넣을 위치:** New subsection right after the DS12110 table in '내부 RC(HSI)로 통신해도 되나', e.g. '내 보드의 HSI'. State that this is one sample and does not replace the datasheet worst case. The silicon revision also settles the rev Y/V qualifier for Table 37 (criterion G).
- **오르는 항목:** C (moves from formula-only toward recorded measurement with environment, 8-11 → 12+), A (first-hand data that other UART posts lack)

## 2. Actual baud on the wire at 115200, 921600 and 3,000,000 with BRR 556, 69 and 21 on the HSI kernel clock. This checks the DQUANT column (−0.08%, +0.64%, +1.59%) plus the measured HSI offset.

- **준비:** Same STM32H743 board, USART1 TX on its pin, kernel clock HSI 64 MHz (USART16SEL = 011, PRESC = 0, OVER8 = 0). Use a logic analyzer or oscilloscope sampling at least 50 MS/s (3 Mbaud needs at least about 16 samples per bit). Record the model, sample rate and analyzer software version.
- **절차:** 1) Transmit 0x55 continuously in 8N1. That gives an alternating bit pattern, so the bit period is easy to measure. 2) Capture at least 1000 bit periods. 3) Measure the average bit period, or the frequency of the 0x55 square wave (baud/2), with the analyzer's timing or measurement tool. Do not read single edges by eye. 4) Repeat for each BRR, and also for the truncated BRR 555 at 115200 to show truncation vs rounding. 5) Optionally clock the same USART from HSE (crystal) and repeat, to separate quantization error from HSI error.
- **기록할 것:** For each baud: BRR value, measured bit period (ns), measured baud, % deviation from target, the predicted deviation (DQUANT + measured HSI offset from item 1), and the difference between them. Save one analyzer capture image for the 3 Mbaud case.
- **글에 넣을 위치:** A short '측정' paragraph and a new column in the BRR table of 'BRR: 버림이 아니라 반올림' (measured baud next to computed DQUANT), with the setup line listed once.
- **오르는 항목:** C (computed table gets an observed counterpart with a reproducible procedure), A (rounding vs truncation shown on real signals)

## 3. An empirical receive-error curve: FE/NE/byte-mismatch counts as the transmitter's baud is deliberately offset from the receiver's, for 8N1 and 8E1. This shows where the RM0433 worst-case limits (3.33% / 3.03%) sit relative to where errors actually start on this hardware.

- **준비:** Receiver: STM32H743 USART on HSE- or HSI-derived kernel clock, with the measured offset known from items 1-2. Transmitter: a second STM32H743, or the same MCU on another USART wired TX→RX on short wires and no transceiver. Its BRR is stepped away from the nominal value. Near 115200 at 64 MHz, one BRR LSB is about 0.18%, so steps of ±1..±25 LSB cover 0 to about 4.5%. Record the wire length, the ground arrangement, and the measured actual offset of each step (use the item 2 method on the transmitter).
- **절차:** 1) Pick a test pattern (e.g. a counting sequence 0x00..0xFF repeated, at least 100,000 bytes per step). 2) For each transmitter offset (both + and − directions), stream the pattern. On the receiver, count ISR_FE, ISR_NE, ISR_ORE (clear via ICR) and compare received bytes against the expected sequence. 3) Run with ONEBIT = 0, then ONEBIT = 1, in 8N1 and in 8E1 (M = 01, PCE = 1, also count PE). 4) Print the counters over a debug channel or read them with the debugger after each step.
- **기록할 것:** A table: measured offset % (signed) | bytes sent | FE | NE | PE | mismatched bytes, per format and ONEBIT setting. Note the smallest offset where any error appeared in each direction. Record board, silicon revision and temperature. Do not extrapolate beyond the steps actually run.
- **글에 넣을 위치:** New subsection at the end of '허용 오차: 3.33% 안에 무엇이 들어가나' (e.g. '실제로 어디서 깨지나'). It must say that RM0433's values are a design budget, and that the observed onset on one board at one temperature is not a guarantee.
- **오르는 항목:** C (real measurement, failure observation and environment, to 12-15), A (author-specific result and interpretation that no datasheet restatement provides)

## 4. Transceiver skew (DTCL) on an RS-485 or RS-232 link, measured as the difference between falling- and rising-edge propagation delay, expressed as % of bit time at 115200 and 921600. This answers the open question of whether the 0.24%p / 0.18%p margins survive a transceiver.

- **준비:** The author's actual transceiver part (e.g. the RS-485 transceiver used in 1-11; record the part number and datasheet revision), the cable type and length used in practice, and a 2-channel oscilloscope with its bandwidth recorded.
- **절차:** 1) Probe the MCU TX pin (channel 1) and the far-end receiver's RO output (channel 2). 2) Send 0x55 at 115200 and at 921600. 3) Measure tPHL and tPLH (50% to 50%) averaged over at least 100 edges with the scope's statistics. 4) Compute the skew |tPHL − tPLH| and the resulting bit-width distortion as % of the bit time.
- **기록할 것:** Part number, cable length, termination, tPHL, tPLH, skew (ns), distortion % at each baud, and the remaining margin when this is subtracted from the HSI judgment table's margins. Include a scope capture.
- **글에 넣을 위치:** After the HSI judgment table, replacing the sentence '트랜시버나 긴 배선이 끼면 DTCL이 위 여유에서 더 빠집니다' with the measured value and its scope (this part, this cable).
- **오르는 항목:** C (measured trade-off and environment difference), B (closes the open DTCL item, so the verdict for transceiver links is decided)

## 5. FIFO threshold and receiver-timeout behaviour at 921600: the ISR interval with RXFTCFG = 1/2, and the RTOF latency after the last stop bit, compared with the computed 86.8 µs and 21.7 µs. Also the interrupt count with and without the FIFO.

- **준비:** STM32H743 receiver running the post's exact FIFO/RTO register snippet. The sender is a USB-UART adapter or a second board at 921600 8N1; record its model. A logic analyzer captures the RX line plus one spare GPIO toggled at RXFT ISR entry and another toggled at RTOF ISR entry.
- **절차:** 1) Send a burst whose length is not a multiple of 8 (e.g. 1003 bytes) back-to-back. 2) Capture RX and both GPIOs. 3) Measure the period between RXFT ISR toggles, and the time from the last stop bit's end to the RTOF toggle. 4) Count RXFT and RTOF interrupts and verify all 1003 bytes arrived (count ORE). 5) Repeat with FIFOEN = 0 and RXNEIE per character. Count interrupts and measure their interval. 6) Optionally add a known CPU load (e.g. a busy higher-priority ISR) and record when ORE first appears in each mode.
- **기록할 것:** Measured RXFT interval (µs), RTOF latency (µs), number of RXFT and RTOF interrupts, bytes received vs sent, ORE count, and per-character interval without FIFO. Include one analyzer capture showing the burst tail and RTOF. Record compiler optimization level and the core clock.
- **글에 넣을 위치:** After the code block in 'FIFO: 16단, 임계값, receiver timeout', as an '예상 관찰과 실제' paragraph or small table. This makes the snippet an executable artifact with an expected and an observed result.
- **오르는 항목:** C (code plus expected and observed results, to 8-11 at minimum, 12+ with the load/ORE trade-off), A (first-hand interrupt-rate comparison)
