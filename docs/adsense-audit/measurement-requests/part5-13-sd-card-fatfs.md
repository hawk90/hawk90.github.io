# 작성자 측정 요청 — `part5-13-sd-card-fatfs.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part5-13-sd-card-fatfs.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 4 (루프 종료 점수 76)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어·도구로 얻은 값과 기록이 있어야 오른다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 작성자가 직접 얻은 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. Trace the SPI-mode init per card: the bytes each command returns, and how long ACMD41 takes to reach ready.

- **준비:** The author's STM32F407 board (record the board name and revision) running the post's sd_init() exactly as published, at the post's 328.125 kHz init SCLK. FatFs R0.16. A logic analyzer on PA4 CS, PA5 SCK, PA6 MISO and PA7 MOSI with an SPI decoder (record the tool and version, for example sigrok/PulseView or Saleae Logic 2). At least two real cards, ideally one SDHC and one SDXC, plus an SDSC if one is available. For each card record the brand, model, capacity, speed class and the type reported by CCS.
- **절차:** 1) Add temporary counters to sd_init(): the number of CMD55+ACMD41 loops, and t_ready = millis() - t0, with t0 taken where the post takes it (after the first ACMD41 response). Print R1 for CMD0, the 4 R7 bytes for CMD8, and the 4 OCR bytes for CMD58. 2) Power-cycle the board and run sd_init() 10 times per card, cold boot each time. 3) Capture one full init per card on the analyzer and export the decoded byte list or a screenshot. 4) Measure the SCLK frequency on the capture, during init and after spi_set_speed_high(), and compare it with the post's set values (328.125 kHz and 21 MHz).
- **기록할 것:** For each card: model and capacity; CMD0 R1; CMD8 R1 and the R7 echo bytes; the OCR hex value and the CCS bit; the min, max and median ACMD41 loop count and t_ready in ms over 10 cold boots; the measured SCLK in both phases. Include one analyzer capture image (alt text required) or the decoded byte table.
- **글에 넣을 위치:** ### SPI 모드 초기화 순서: a new short '초기화 실측' paragraph and table right after the init-order table (L45-52), or under ## 동작 확인 (L347). Put the per-card numbers in a small table and add a sentence that compares the measured t_ready with the 1 s requirement and the code's 1100 ms timeout described at L174 (SD PLS 4.2.3).
- **오르는 항목:** C (real measurement and environment differences between cards, which together with the existing procedure moves C out of the procedure-only cap) and A (first-hand data on how much margin the ACMD41 timeout actually has on real cards).

## 2. Check whether the 16 KiB write actually goes out as CMD25 (counters), and time 512 B vs 16 KiB writes.

- **준비:** Same board and cards. Each card formatted FAT32 on the author's PC with a known allocation unit; record the OS and format tool, and include at least one run with the default allocation unit and one with a larger unit if the default gives csize 1. Add two counters to sd_write_blocks(): cnt_cmd25 (incremented on the n > 1 branch) and cnt_cmd24 (incremented on the n == 1 branch). Optionally add a third counter for disk_write calls with count > 1.
- **절차:** 1) Reset the counters, run write_bench(512) and print csize, ms, cnt_cmd24 and cnt_cmd25. 2) Reset the counters and run write_bench(16384), printing the same values. 3) Repeat each run 5 times per card and per allocation unit. Delete bench.bin between runs, or note that FA_CREATE_ALWAYS reuses the clusters.
- **기록할 것:** A table per card: allocation unit and csize, chunk size, cnt_cmd24, cnt_cmd25, and the min/median/max ms. Derive KB/s from the median and compare it with the post's 3.125 MB/s raw bound (L34). Paste the exact printf lines from one run.
- **글에 넣을 위치:** ### 다중 블록 쓰기: replace or extend the pass/fail table at L403-408 with the actual counter values. The pass case is CMD25 > 0 and CMD24 near 0 for the 16 KiB run. Put the timings next to it as secondary data, and add one sentence on the observed ratio, given that L364 already says the app note's 10x figure has no basis for this SPI setup.
- **오르는 항목:** C (a direct observation that separates the pass case from the named failure, plus real throughput on named cards) and A (the measured 512 B vs 16 KiB ratio over SPI is the post's own result, which no source gives).

## 3. Measure card busy time after the write: per-block busy after the data response, and busy after Stop Tran (0xFD).

- **준비:** Same board, cards and logic analyzer as above, at the post's 21 MHz SCLK. Use the 16 KiB write_bench run, a single 512 B write, and a sd_sync() call.
- **절차:** 1) Trigger the analyzer on the 0xFC token. 2) Measure how long MISO stays low (busy) after each data response inside the CMD25 transfer. 3) Measure how many bytes after 0xFD MISO first goes low and how long it stays low. 4) Measure the busy time that sd_sync() waits for after re-selecting the card. 5) Repeat over about 20 transfers per card and note the worst case.
- **기록할 것:** Per card: typical and worst per-block busy (µs or ms); the byte count from 0xFD to the start of busy (does the first byte read 0xFF, as L254 says can happen?); the typical and worst busy time inside sd_sync(); the worst observed busy compared with the 250 ms / 500 ms values from 4.6.2.2 and the post's 1000 ms timeout (L252).
- **글에 넣을 위치:** ### 2. 블록 읽기와 쓰기, right after the timeout paragraph (L252) and the Stop Tran paragraph (L254), as 2-4 sentences plus a small table. This turns the 'Simplified 판에서 빠져 있습니다' remark about 7.5.3 timing into an observed number on named cards.
- **오르는 항목:** C (a measured trade-off: how much of the timeout budget is actually used, and differences between cards) and A (an original observation on the Stop Tran busy gap that the Simplified spec leaves open).

## 4. Count single-sector writes per second for each f_sync period, on the device.

- **준비:** Same board and one card. A logger loop that writes a 64-byte line 10 times per second (from millis()), with f_sync never / every 10 s / every line. Add a disk_write call counter (split into count == 1 and count > 1) and, if practical, a tally per target sector type (data, directory, FAT, FSInfo; compare the sector against fs->fatbase, fs->dirbase and fs->winsect).
- **절차:** Run each configuration for 60 s from a fresh file on a freshly formatted card, and also once on a file that has to allocate new clusters during the run. Print the counters at the end.
- **기록할 것:** For each period: total single-sector disk_write calls in 60 s and the rate per second, with the FAT and FSInfo writes broken out. Compare these with the post's computed minimums of 1.25 / 1.45 / 20 per s in the table at L418-422.
- **글에 넣을 위치:** ### f_sync 주기: add a 'measured' column to the table at L418-422 (or a second row per period), with one sentence on how far the real FAT/FSInfo writes push the count above the minimum the post calculates (L416 says FAT·FSInfo writes are excluded).
- **오르는 항목:** C (replaces a calculated-only table with measured values and states the gap between them) and A (the measured FAT/FSInfo overhead is the author's own data behind the loss-budget rule).

## 5. Run a power-cut test for the f_sync loss budget.

- **준비:** Same logger (64 B lines at 10 lines/s, each line carrying a sequence number and millis()), f_sync every 10 s. Cut power with a switchable bench supply, a relay driven by a second MCU board, or a USB power switch, at random times. Record how power was cut and how the board is powered. Use the author's PC with chkdsk (Windows) or fsck.fat -n (Linux, record the dosfstools version).
- **절차:** 1) Cut power 20 or more times at random points per card. 2) After each cut, move the card to the PC, run fsck.fat -n or chkdsk in read-only mode, and read log.txt. 3) Find the last sequence number in the file and compare it with the time of the cut (from a log on the second MCU or a scope timestamp) to compute the lines lost. 4) Note any run where the file reverted to an earlier size, fsck reported lost clusters or cross-links, or the volume would not mount.
- **기록할 것:** Number of cuts; lines and bytes lost per cut (min/median/max), compared with the post's computed 6,400 B bound for the 10 s period; the number and description of runs with filesystem damage reported by fsck or chkdsk, with the exact message; whether any damage coincided with a cut during f_sync or cluster allocation (the critical-section caveat at L412).
- **글에 넣을 위치:** ### f_sync 주기, after the loss table and the period-selection paragraph (L418-424), as a short result table plus one paragraph. Any run with damage goes in ## 자주 보는 함정 (L428) as a first-hand failure case.
- **오르는 항목:** C (a real failure and trade-off record, which the 12-15 band requires) and A (the author's own evidence for the f_sync selection rule and its typical-case scope, instead of restating the app note).
