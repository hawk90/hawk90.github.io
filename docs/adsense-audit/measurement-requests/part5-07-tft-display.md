# 작성자 측정 요청 — `part5-07-tft-display.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part5-07-tft-display.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 4 (루프 종료 점수 74)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어·도구로 얻은 값과 기록이 있어야 오른다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 작성자가 직접 얻은 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. Measure full-screen and partial-window SPI transfer times on the F407 + ILI9341 path, and compare them with the SCL-only lower bounds in the post's table at L134-138 (the post's computed values: 234.07 ms, 6.11 ms, 1.52 s). This separates the bit time from the per-byte RXNE wait and the CS toggling that L140 only describes in words.

- **준비:** STM32F407 board (give the exact board, for example STM32F407G-DISC1 or a custom board, and the silicon revision from DBGMCU->IDCODE). Use clock_init_168mhz() from 4-04 (SYSCLK 168 MHz, PCLK2 84 MHz) and spi_init_master(3), which the post computes as 5.25 MHz SCL. Record the ILI9341 module vendor/part name and whether it exposes SDO. Note the toolchain and optimization level (arm-none-eabi-gcc version, -O level). You need a logic analyzer or oscilloscope on SCL/CS/DC and a spare GPIO for markers.
- **절차:** 1) Enable the DWT cycle counter (CoreDebug->DEMCR |= TRCENA; DWT->CTRL |= CYCCNTENA). 2) Read DWT->CYCCNT before and after each of tft_fill(0xF800), tft_fill_rect(0,0,99,19,0x07E0) and a full-screen loop of tft_pixel(). Run each 10 times. 3) At the same time, raise a GPIO marker around each call and capture SCL on the logic analyzer. Measure the SCL frequency directly, the gap between bytes, and the CS-high time between commands. 4) If the author has the 4-10 DMA transfer code, repeat the full-screen fill with it, to check whether the SCL-bound lower limit moves.
- **기록할 것:** For each case: min/median/max cycles and the ms value at 168 MHz; the measured SCL frequency, next to the post's computed 5.25 MHz; the measured inter-byte gap in ns; the ratio measured/lower-bound. Save one logic-analyzer screenshot of the gap between two pixel bytes. Record the compiler version and -O level, because spi_xfer8() overhead depends on them.
- **글에 넣을 위치:** ### 1. ILI9341 SPI driver: add a 'measured' column to the lower-bound table at L134-138, or a short table right after it, with an environment line above it. In the L140 paragraph, replace the qualitative sentence on RXNE wait and CS toggling ('표의 값은 SCL 비트 시간만 센 하한이고 …') with the measured gap. If DMA was measured, put that result in the same paragraph, next to the 4-10 DMA sentence.
- **오르는 항목:** C (real measurement plus environment, the 12-15 band) and A (the author's own measured overhead factor is a result no datasheet gives).

## 2. Capture LTDC HSYNC/VSYNC on STM32F746G-DISCO with a scope, and read back the registers that tell apart the two causes of the 33.92 kHz failure row: PLLSAIDIVR left at /2, or a PLLSAI input of 2 MHz instead of 1 MHz.

- **준비:** STM32F746G-DISCO (record the board revision, for example the MB1191 revision on the silkscreen) with the RK043FN48H panel; the post's ltdc_init(); the main PLL configured by the author's own clock code (record HSE 25 MHz and its PLLM value). An oscilloscope or logic analyzer on the LCD_HSYNC/LCD_VSYNC pins (find the test points or connector pins in the board schematic) and on LCD_CLK if the probe allows it. A debugger (ST-LINK with STM32CubeIDE, OpenOCD or pyOCD; record which and its version) to read registers.
- **절차:** 1) Normal case: measure the HSYNC, VSYNC and LCD_CLK frequency. Read back RCC->PLLCFGR (PLLM field), RCC->PLLSAICFGR (N, R) and RCC->DCKCFGR1 (PLLSAIDIVR) with the debugger. 2) Fault A: remove the DCKCFGR1 write (PLLSAIDIVR stays 00), re-measure and read back the same registers. 3) Fault B: restore DIVR = /4 but set PLLM so that HSE/PLLM is about 2 MHz (for example PLLM = 12 with HSE 25 MHz; record the exact value used), re-measure and read back. Check that the PLLSAI VCO limits are respected before doing this, or note that RDY never came up.
- **기록할 것:** For each of the three cases: measured HSYNC (kHz), VSYNC (Hz) and LCD_CLK (MHz), plus the raw hex of PLLCFGR, PLLSAICFGR and DCKCFGR1. One scope screenshot per case. Whether the panel image was stable, rolled or blank in each fault case.
- **글에 넣을 위치:** ## 동작 확인, the **LTDC 타이밍** table (L260-264): split the 33.92 kHz row (L263) into two rows, each with its own register-readback discriminator (DCKCFGR1.PLLSAIDIVR = 00, or PLLCFGR.PLLM giving a 2 MHz input). Put the measured normal-case values next to the post's computed 16.96 kHz / 59.30 Hz on L262, with the board revision.
- **오르는 항목:** C (measured discriminator for the two causes; recorded failure cases) and A (first-hand failure record).

## 3. Measure the wait time in ltdc_swap(). This checks the post's 'at most one frame, 16.86 ms' (the post's computed value, L245), and with the stale-flag clear removed it shows whether a stale RRIF really ends the wait at once.

- **준비:** Same F746G-DISCO setup as item 2. The DWT cycle counter at the author's SYSCLK (record the value). The post's ltdc_init() and ltdc_swap().
- **절차:** 1) Wrap ltdc_swap() with DWT->CYCCNT reads. Call it 1000 times, both back-to-back and with random delays between calls, and log the cycle counts over SWO, UART or into a RAM array. 2) Variant: delete the `LTDC->ICR = LTDC_ICR_CRRIF` line before RRIE in ltdc_swap(), call ltdc_swap() right after ltdc_init(), and record the wait time. 3) Optionally toggle a GPIO in LTDC_IRQHandler and capture it against VSYNC on the scope, to see where the reload lands relative to blanking.
- **기록할 것:** Min/max/median of the wait in µs over the 1000 calls. Whether the max is within the post's computed 16.86 ms. The wait time in the no-clear variant. One scope capture of the IRQ GPIO against VSYNC, if taken.
- **글에 넣을 위치:** ### 3. 이중 버퍼 + vertical blanking reload, the paragraph at L245: add the measured distribution after the last sentence ('기다리는 시간은 … 최대 한 frame, 16.86 ms입니다'). Put the no-clear result next to the sentence in the same paragraph that explains why the flag is cleared before the interrupt is enabled ('앞서 set된 채 남은 reload 플래그가 있으면 …').
- **오르는 항목:** C (measured timing, plus a failure variant that shows why a line of code is there).

## 4. Observe tearing with a single buffer vs ltdc_swap() double buffering, and count FIFO underruns under SDRAM load. This backs the post's computed read bandwidth (19.2 MB/s active, 15.49 MB/s frame average) with an observation.

- **준비:** F746G-DISCO, framebuffers at 0xC0000000 in SDRAM through BSP_SDRAM_Init(). A test pattern: a vertical bar moving horizontally by N px per frame. A phone camera in slow-motion mode, or a photo with a fast shutter. For the underrun test, enable LTDC_IER_FUIE and count FUIF in the IRQ handler.
- **절차:** 1) Single buffer: redraw the moving bar directly into the front buffer, and photograph or record the panel, looking for a split bar. 2) Double buffer: same pattern through ltdc_back()/ltdc_swap(), and record again. 3) Underrun: with FUIE enabled, run 60 s each of (a) idle CPU, (b) a CPU memset/memcpy loop over the back buffer in SDRAM, (c) a DMA2D fill of the back buffer, if available. Count FUIF events in each.
- **기록할 것:** Photos or video frames for both buffer modes, with the movement speed. FUIF counts per 60 s for each load case. SYSCLK/HCLK and the FMC SDRAM clock that the BSP configured (read back FMC_SDCR/SDTR). Whether any visible glitch matched an underrun.
- **글에 넣을 위치:** Photos and description go in a new short **Tearing 확인** block in ## 동작 확인, after the LTDC 타이밍 table (after L264). Underrun counts go after the bandwidth sentence at L210 ('LTDC가 framebuffer에서 읽는 양은 … 19.2 MB/s, frame 평균 … 15.49 MB/s'). Also update the L208 note that this code does not enable the FIFO underrun interrupt, saying it was enabled for the test.
- **오르는 항목:** C (trade-off and measured limit), B (the bandwidth figure backed by observation) and A.

## 5. Check the COLMOD default and the 'omitted COLMOD' failure: what the panel shows when 0x3A is not sent, or when 0x66 is sent, while 2-byte pixels are streamed. Read the pixel format back with RDDCOLMOD (0x0C) if the module exposes SDO.

- **준비:** F407 + ILI9341 module as in item 1. Record whether the module wires SDO/MISO. The 4-08 SPI driver with a read path.
- **절차:** 1) After HW reset and SLPOUT, send RDDCOLMOD (0x0C) and read the parameter before any COLMOD write. 2) Run tft_init() with the COLMOD line removed, then call tft_fill(0xF800) and a 2-color stripe pattern; photograph. 3) Run with COLMOD 0x66 and the same pattern; photograph. 4) Read RDDCOLMOD again after each init.
- **기록할 것:** The raw RDDCOLMOD byte(s) read in each case. A photo of the screen for no COLMOD, 0x66 and 0x55. Whether the 'no COLMOD' and '0x66' images look the same, which is what the post's cited 8.2.33 default (110b, 18 bit/pixel) implies.
- **글에 넣을 위치:** ## 자주 보는 함정, the pitfall at L268-270 ('18 bit/pixel로 남은 채 2바이트씩 전송'): add the measured default readback and the photo or description for the 'COLMOD omitted' trigger, next to the 8.2.33 citation in L270.
- **오르는 항목:** C (recorded failure with readback) and A (the author's own failure case).

## 6. Record the color-order result on the author's actual ILI9341 module: does MADCTL 0x48 give red for 0xF800?

- **준비:** F407 + ILI9341, recording the module vendor and PCB marking (BGR wiring varies between modules).
- **절차:** Run tft_init() with MADCTL 0x48, then tft_fill(0xF800) and tft_fill(0x001F). Photograph. Repeat with 0x40.
- **기록할 것:** The observed color for each MADCTL value and the module identification.
- **글에 넣을 위치:** ## 동작 확인, the **색 순서** table (L253-256): one line after it stating which row this specific module hit, with the module ID.
- **오르는 항목:** C (observed result with environment).
