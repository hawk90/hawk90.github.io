# 작성자 측정 요청 — `part4-09-i2c-driver.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part4-09-i2c-driver.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 3 (루프 종료 점수 71)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어·도구로 얻은 값과 기록이 있어야 오른다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 작성자가 직접 얻은 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. Compile check of the post's code against the real 4-03 and 4-06 helpers. This is a first-hand build record, not a result to invent.

- **준비:** arm-none-eabi-gcc (record the exact version from `arm-none-eabi-gcc --version`), cmsis-device-f4 v2.6.9 and CMSIS 5.9.0 headers as cited in the post, plus the gpio_init/gpio_config_t code from part4-03 and the millis/delay_us_dwt/dwt_init code from part4-06 copied verbatim. Target flags: -mcpu=cortex-m4 -mthumb -DSTM32F407xx -std=c11 -Wall -Wextra.
- **절차:** 1) Put the post's code blocks 1 to 4 in i2c.c and the 4-03/4-06 helpers in their own files. 2) Run `arm-none-eabi-gcc -c i2c.c ... 2>&1 | tee build.log`. 3) Fix what fails (expected: delay_us_dwt takes (us, cpu_hz), so the one-argument calls at L248/L261/L267-270 should not compile). Rebuild until clean. 4) Run `arm-none-eabi-size` on the object.
- **기록할 것:** Toolchain version, the full command line, the first build.log errors verbatim, the diff that fixed them, the final clean build, and the .text size of i2c.o.
- **글에 넣을 위치:** A short 'Build environment' paragraph at the top of '## 코드 예제' (toolchain, flags, header versions). Apply the fixed delay_us_dwt calls in the code block itself.
- **오르는 항목:** C (reproducible code and command with an observed result, 8-11 band). It also removes the C<=8 cap the reviewer imposed while the recovery block does not compile.

## 2. Logic-analyzer captures for each return code in the diagnostic table

- **준비:** STM32F405/407 board (record the exact board, e.g. STM32F4DISCOVERY MB997 rev or a custom board, and the silicon revision from DBGMCU_IDCODE REV_ID). Clock from 4-04 (SYSCLK 168 MHz, PCLK1 42 MHz). One real I2C target on PB8/PB9 (record part number and 7-bit address, e.g. a BME280 at 0x76), external pull-up values in ohms, wire length, supply voltage. Logic analyzer model, sample rate (at least 10 MS/s) and software version (e.g. Saleae Logic 2.x or sigrok/PulseView with the i2c decoder).
- **절차:** 1) i2c_write to the real address with 2 bytes → capture. 2) i2c_read_reg with n=1, n=2 and n=6 → capture each. 3) i2c_write to an address with no device → capture and confirm return -2. 4) Hold SCL low mid-transaction (jumper SCL to GND through about 100 ohm after START, or use a target that stretches indefinitely) → capture, record the return value and the time from the last edge to the return (toggle a spare GPIO on return). 5) Start a transaction with SDA held low → confirm -3.
- **기록할 것:** For each case: the return value printed over UART/SWO, a decoder screenshot (PNG) showing START/ACK/NACK/STOP, the measured time to timeout return in ms (expected near I2C_TIMEOUT_MS=50, so record the real value), and for the n=1/2/N reads that only the last byte has NACK followed by STOP.
- **글에 넣을 위치:** '## 측정 / 동작 확인': replace the 'expected waveform' column with captured screenshots and measured values per row, and add an environment line above the table.
- **오르는 항목:** C (actual measurements and environment, toward the 12-15 band). A (the author's own observed results, not a restated RM0090).

## 3. Real SCL frequency and rise time at CCR=35, TRISE=13 with PCLK1=42 MHz, to settle the RM0090 note that 400 kHz needs a PCLK1 that is a multiple of 10 MHz

- **준비:** Same board and target. An oscilloscope (record model and bandwidth, at least 100 MHz) with a 10x probe on SCL and SDA close to the target pins. Record the pull-up value and the estimated bus capacitance if known. Optionally a second pull-up value (e.g. 4.7k and 2.2k).
- **절차:** 1) Run a continuous i2c_read_reg loop. 2) Measure the SCL period and frequency with scope cursors or the measurement function, averaged over at least 100 cycles. 3) Measure the 30%-70% rise time on SCL and SDA. 4) Repeat with DUTY=1 (CCR = 42e6/(25*400e3), rounded, and record the value used) and, if possible, with the 2.2k pull-up. 5) Optionally repeat with PCLK1 = 40 MHz (CR2=40, recomputed CCR/TRISE) to check the 10 MHz-multiple claim.
- **기록할 것:** Measured SCL frequency in kHz, tHIGH and tLOW in ns, rise time in ns for each configuration (pull-up × DUTY × PCLK1), and scope screenshots. Compare each against UM10204 Table 11 Fm limits (tLOW >= 1.3 us, tHIGH >= 0.6 us, tr <= 300 ns).
- **글에 넣을 위치:** '### Clock 설정': one small table after the L60 paragraph showing formula vs measured values. This also lets the author decide honestly between renaming i2c_init_400k and stating that 400 kHz is the formula target.
- **오르는 항목:** C (measurement plus environment difference and trade-off, 12-15 band). A (a first-hand answer to a question the RM0090 note leaves open).

## 4. Bus recovery on a real stuck-SDA condition

- **준비:** Same board, plus a target that can hold SDA low (e.g. a sensor that is mid-read when the MCU resets). Logic analyzer as above. A spare GPIO marks the entry to and exit from i2c_bus_recover.
- **절차:** 1) Start an i2c_read_reg of 6 bytes in a loop and press MCU reset (or trigger NVIC_SystemReset from a timer) at random points until a boot finds SDA low (wait_idle returns -3). 2) Call i2c_bus_recover() and capture. 3) Repeat about 20 times. 4) Separately, tie SCL to GND to confirm the SCL-stuck path returns its code without hanging.
- **기록할 것:** How many trials reproduced stuck SDA, how many clock pulses each recovery needed before SDA rose (distribution over trials), the return codes observed, a capture showing the clocks plus the STOP (with no spurious START), total recovery time in us, and whether the next transaction succeeded. Record any trial where 9 clocks did not free the bus.
- **글에 넣을 위치:** '### 4. Bus recovery': add a short 'measured' paragraph and one capture after L279. Add rows for the recovery return codes in the diagnostic table.
- **오르는 항목:** C (a real failure induced and recovered, with numbers). A (a failure case from the author's own experience).

## 5. What the PRIMASK guard in the 1-byte read prevents, shown by a controlled delay between the ADDR clear and STOP

- **준비:** Same board and target, with a register read where 1 byte is enough (e.g. the chip-ID register). Logic analyzer. Build a test variant that removes the PRIMASK guard and inserts a busy-wait of D us (via delay_us_dwt) between the ADDR clear and the STOP set, to simulate an interrupt.
- **절차:** 1) D = 0: capture the baseline. 2) D = 10, 25, 50 and 100 us (bytes at 400 kHz take about 22.5 us): capture each. 3) Note whether more than one byte is clocked, whether the last byte is ACKed instead of NACKed, where the STOP lands, and whether BUSY or the next transaction is affected. 4) Restore the guard and confirm the D=0 waveform.
- **기록할 것:** For each D: the number of bytes clocked, the ACK/NACK on each byte, the position of the STOP, the state of SR1/SR2 after the call, and screenshots. Report this as observed behavior on this silicon revision, not as a general rule.
- **글에 넣을 위치:** The L232 paragraph: replace 'RM0090이 지켜 주지 않는다' with the observed consequence and the D threshold at which it appeared, labeled as a measurement on the named board and revision. Cite ST AN2824 if the author also finds the matching section.
- **오르는 항목:** A (a concrete failure and a selection rationale, 20-25 band). C (measurement plus trade-off).

## 6. BUSY flag stuck after a line glitch, cleared with SWRST. This replaces the current pitfall, which only repeats the body.

- **준비:** Same board. A jumper or pushbutton that pulses SDA or SCL to GND briefly while the bus is idle. Debugger (record the probe and the IDE or OpenOCD/pyOCD version) for reading SR2.
- **절차:** 1) With PE=1 and the bus idle, short SDA to GND for about 1 ms. 2) Read SR2.BUSY in the debugger and call i2c_write: record whether it returns -3 although both lines are high. 3) Apply the SWRST sequence (i2c_init_400k) and record BUSY again. 4) Repeat 10 times.
- **기록할 것:** The SR2 value before and after, the line levels from IDR at that moment, the return code, how many of the 10 trials left BUSY stuck, and whether SWRST alone cleared it.
- **글에 넣을 위치:** '## 자주 보는 함정': replace the ADDR-order pitfall with 'BUSY stays set after a glitch' (symptom, measured reproduction rate, fix). Cite the RM0090 SWRST note as the documented basis.
- **오르는 항목:** A (a field failure case the body does not cover). C (reproduction steps with observed results). It also removes the AP-C-26 padding issue.
