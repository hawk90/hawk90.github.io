# 작성자 측정 요청 — `part1-07-adc-principles.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part1-07-adc-principles.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 2 (최종 점수 75, 상태 `max_rounds`)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어에서 잰 값과 기록이 있어야 오른다. 아래 항목을 측정해 주면 글에 넣는다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 측정값은 작성자가 직접 잰 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. Compile record for the bare-metal ADC code block (L91-123)

- **준비:** The arm-none-eabi-gcc version the author has installed (record `arm-none-eabi-gcc --version`). Use cmsis-device-f4 v2.6.9 (Include/stm32f407xx.h) plus CMSIS core headers at a pinned version. Target -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard -DSTM32F407xx.
- **절차:** 1) Save the post's code verbatim as adc.c. 2) Run `arm-none-eabi-gcc -c -std=c11 -Wall -Wextra -O2 -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard -DSTM32F407xx -I<cmsis-device-f4>/Include -I<CMSIS>/Core/Include adc.c -o adc.o`. 3) Optionally run `arm-none-eabi-objdump -d adc.o` and check that the stabilization loop is not removed (it has a volatile counter).
- **기록할 것:** The exact command line, the compiler version string, warnings or errors verbatim (or 'no warnings'), and the CMSIS core version or commit used. If anything fails, record the error and the fix.
- **글에 넣을 위치:** One line or short block right after the code block in '코드 / 실제 사용 예', before the bullet list.
- **오르는 항목:** C: removes the 'no compile record' gap noted by the reviewer (AP-C-24). On its own it is only a small step within 8-11.

## 2. DC accuracy and code noise of the actual code at 480 cycles, and the /4096 vs /4095 conversion against a DMM

- **준비:** An STM32F407 board (e.g. STM32F4-DISCOVERY / STM32F407G-DISC1; record the board name, revision and whether VREF+ is tied to VDDA on that board). Clock as in the post: HCLK 120 MHz, PCLK2 60 MHz, ADCPRE /2. Input: a stable DC source on PA0, either a bench supply through a divider or a reference IC, with a low source impedance (<1 kΩ). A calibrated DMM (record the model) on PA0 and on VREF+/VDDA.
- **절차:** 1) Flash the post's adc_init/adc_read. 2) For 3 or more input voltages (e.g. near 0.3 V, 1.65 V, 3.0 V), take N = 4096 conversions per voltage and send them over UART or SWO, or store them in RAM and dump with the debugger. 3) Measure PA0 and VREF+ with the DMM at the same time. 4) Compute mean code, standard deviation (LSB rms), peak-to-peak, and a histogram. 5) Convert the mean code with code*VREF/4096 and code*VREF/4095 and compare both with the DMM reading.
- **기록할 것:** Board and revision, VREF+ measured, input voltages measured with the DMM, mean code, rms noise in LSB, p-p in LSB, histogram (an image or a small table), and the error in mV for /4096 vs /4095 at each point. Also record the ambient conditions and whether USB power or an external supply was used.
- **글에 넣을 위치:** New subsection '측정: F407 내장 ADC 노이즈와 변환 오차' after the code bullets. If the author computes a noise-only ENOB from the shorted or low-impedance input rms noise, its value and definition can replace the 'TBD' in the L54 comparison table only if it is clearly labelled as a measured noise-only ENOB on this board (the same definition as the ADS1256 value, not SINAD).
- **오르는 항목:** C: observed results with environment and limits (8-11 toward 12). B/A: gives the F407 ENOB cell a measured, definition-matched value instead of TBD. It also gives first-hand evidence for the 4096 vs 4095 sibling issue (part5-02).

## 3. Source-impedance x sampling-time sweep with channel switching (verifying the R_AIN table L75-81 and the residual-charge pitfall L141)

- **준비:** The same F407 board. Two inputs: PA0 (IN0) tied to GND or 0.1 V through a low impedance, and PA1 (IN1) driven from a stiff DC source at about 3.0 V through a series resistor R_S in {0, 1k, 4.7k, 10k, 22k, 47k, 100k} (record the measured resistor values). ADC in scan mode IN0 -> IN1, ADCCLK = 30 MHz (and optionally 18 MHz if the author can run VDDA at 1.8 V; record VDD/VDDA).
- **절차:** 1) For each SMP setting in {3, 15, 28, 56, 84, 480} cycles (set the same for IN1) and each R_S, run 1024 scan pairs. 2) Take as reference the IN1 mean at R_S = 0 and 480 cycles, single-channel (no IN0 in between). 3) Record the IN1 mean error in LSB versus the reference for each cell. 4) Repeat with IN0 at the same voltage as IN1 (no channel-to-channel swing) to separate settling or carry-over error from DC leakage effects.
- **기록할 것:** A table of error (LSB, mean and rms) for each R_S x SMP, both for 'IN0 = 0 V before IN1' and 'IN0 = IN1'. Mark which cells exceed 1/4 LSB and 1/2 LSB. Compare against the post's predicted limits (e.g. 15 cycles at 30 MHz: R_AIN + R_ADC <= 12.5 kΩ) and state where measurement and prediction agree or disagree. Include a failure case explicitly (e.g. 3 cycles with 10k showing N LSB error), with numbers only from the actual run.
- **글에 넣을 위치:** New subsection under 'Source impedance와 sampling time', directly after L85, with the measured table next to the computed table. A sentence in the '채널을 바꾼 직후의 잔류 전하' pitfall (L141) citing this measurement, which turns the currently uncited inference into an observed result.
- **오르는 항목:** C: real measurement plus failure and trade-off, which is the 12-15 band. A: a first-hand failure case and measured selection criterion moves it from 13-19 toward 20-25. It also resolves the AP-C-11 issue (carry-over inference) with evidence.

## 4. Op-amp buffer effect on the failing cells

- **준비:** The same sweep rig, plus a unity-gain rail-to-rail op-amp follower between R_S and PA1 (record the part number, supply and decoupling). Record the op-amp datasheet GBW and offset spec.
- **절차:** 1) With R_S = 47k (and 100k), measure IN1 error at 3, 15 and 28 cycles with and without the buffer, using the same IN0 = 0 V scan as above. 2) Measure the buffer output offset with the DMM.
- **기록할 것:** Error in LSB with and without the buffer for each SMP, the measured buffer offset in mV and LSB, and any cell where the buffer did not help (e.g. 3 cycles), with numbers only as observed.
- **글에 넣을 위치:** After L83 (buffer paragraph) and in the summary bullet L151. This replaces the unconditioned buffer claim with measured conditions, addressing AP-C-07 together with the AN2834 4.2.7 conditions.
- **오르는 항목:** C: trade-off and environment difference recorded (12-15). A: a selection criterion with first-hand evidence.

## 5. Measured 8-channel scan throughput at 15 cycles, 30 MHz

- **준비:** The F407 board with ADC1 scanning 8 channels (SQR1 L = 7) at SMP = 15 cycles, continuous mode, DMA circular to a buffer of 8 x M samples. Use a GPIO toggled in the DMA half or full transfer interrupt, and a logic analyzer or scope (record the model and sample rate).
- **절차:** 1) Toggle a GPIO on each DMA transfer-complete interrupt. 2) Measure the toggle period with the logic analyzer over at least 100 periods. 3) Calculate the conversions per second and the per-channel rate. 4) Optionally repeat at 3 and 28 cycles.
- **기록할 것:** The measured period, the derived per-channel rate (compare with the post's computed 138.9 kS/s), the logic-analyzer capture image, and the DMA configuration used.
- **글에 넣을 위치:** Bullet under the comparison table (L58), labelled as measured next to the computed 138.9 kS/s.
- **오르는 항목:** C: observed result for the comparison table's main number (8-11 toward 12). A: a measured comparison rather than datasheet arithmetic only.

## 6. Aliasing demonstration (1 kHz sine sampled at 1.5 kHz) for the Nyquist section

- **준비:** The F407 board with TIM-triggered ADC conversion at 1.5 kHz (record the timer configuration), and a function generator (record the model) producing a 1 kHz sine biased to mid-scale (e.g. 1.65 V +/- 1 V) on PA0 through a low impedance.
- **절차:** 1) Capture 1024 or more samples. 2) Plot them, or compute the FFT on a PC, and identify the dominant frequency. 3) Optionally repeat with an RC LPF in front (record R and C) to show attenuation.
- **기록할 것:** The plot or FFT image, the observed dominant frequency, the input amplitude and frequency measured on the generator or scope, and with the LPF the observed amplitude reduction.
- **글에 넣을 위치:** In 'Sampling과 Nyquist' after L26, as an observed example of the |1 - 1.5| = 0.5 kHz statement.
- **오르는 항목:** C: an observed result for the concept section (supports 8-11 / 12).

## 7. (Optional, only if the author owns an ADS1256 board) Measured 8-channel cycling data rate and shorted-input noise

- **준비:** ADS1256 board (record the module and its clock, e.g. 7.68 MHz crystal), the SPI host (record MCU or SBC and SCLK), 30 kSPS DRATE, PGA 1, buffer on.
- **절차:** 1) Cycle the multiplexer across 8 channels with the SYNC/WAKEUP/RDATA sequence as in SBAS288K Table 14, and measure DRDY intervals with a logic analyzer. 2) Short the inputs and record 4096 samples at 30 kSPS to compute rms noise.
- **기록할 것:** Measured per-channel rate (compare with the post's 546.75 S/s) and measured rms noise and the noise-ENOB (compare with 19.8), plus the SCLK actually used.
- **글에 넣을 위치:** Bullets under the comparison table (L58-59), labelled as measured on this board.
- **오르는 항목:** C: measurement plus environment difference. A: a first-hand cross-architecture comparison, which the reviewer said is missing.
