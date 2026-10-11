# 작성자 측정 요청 — `part3-10-map-file-analysis.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part3-10-map-file-analysis.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 3 (루프 종료 점수 74)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어·도구로 얻은 값과 기록이 있어야 오른다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 작성자가 직접 얻은 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. A real GNU ld map file from one actual build, to replace the constructed excerpt at L58-89 and the made-up archive-member lines at L105-110

- **준비:** The author's own Cortex-M project or one public example: an STM32CubeF4 project, or a blinky linked against a small static library that the author builds. Record the exact arm-none-eabi-gcc version (`arm-none-eabi-gcc --version`) and binutils version (`arm-none-eabi-ld --version`). Name the MCU part (for example STM32F411RE), its FLASH and SRAM sizes, and where the linker script came from (Cube-generated or hand-written).
- **절차:** Compile each source separately so ld sees the real object names: `arm-none-eabi-gcc -mcpu=... -ffunction-sections -fdata-sections -c main.c -o main.o` (repeat for each file, startup included). Build the library with `arm-none-eabi-ar rcs libdrv.a uart.o dma.o ...`. Link with `arm-none-eabi-gcc -T app.ld -Wl,--gc-sections -Wl,-Map=app.map -Wl,--print-memory-usage startup.o main.o gpio.o libdrv.a -o app.elf`. Keep app.map.
- **기록할 것:** Verbatim excerpts copied from app.map, not retyped: the order of the section headers actually printed; 2-4 real `Archive member included ...` lines, ideally a chain where one library member pulled in another; the `.data` line with its `load address`; the `.bss` line; the `_sdata`/`_edata`/`_sbss`/`_ebss` assignment lines; and the `--print-memory-usage` table printed on stdout. Record the toolchain version string and the map file size in lines.
- **글에 넣을 위치:** Replace the 'constructed' disclaimer and the excerpt at L56-89 and L105-110 with the real excerpt and its environment line. Replace the L32-36 command with the separate -c compiles plus the .o/.a link, which also fixes the main.o naming issue. Put the --print-memory-usage output under L52.
- **오르는 항목:** C: lifts it from 8 (procedure, nothing observed) into the 8-11 band with observed output. Also fixes the C/factcheck blocker about the one-step gcc command and temporary object names. A: gives the post first-hand, non-generic examples.

## 2. Reconcile map, size -A and --print-memory-usage on the same real ELF

- **준비:** The same app.elf and app.map as item 1, with the same binutils version.
- **절차:** Run `arm-none-eabi-size -A app.elf` and `arm-none-eabi-size -B app.elf`. From app.map, add up the alloc output sections that land in FLASH (including the .data LMA copy) and in SRAM. Compare the results with the --print-memory-usage lines.
- **기록할 것:** The exact size -A table (all rows, including non-alloc rows such as .ARM.attributes, .comment and .debug_*, if present), the size -B text/data/bss line, the FLASH and SRAM totals computed from the map, the --print-memory-usage Used numbers, and the observed differences in bytes. Also record any difference that is not explained by .data, such as alignment padding, .ARM.exidx, or the heap/stack reservation sections the linker script defines.
- **글에 넣을 위치:** The 'ELF 도구와 맞춰 볼 때' section (L141-143), replacing the computed 6,384/6,448 example. Rewrite the L158 summary bullet from the observed result, keeping the alloc-section limit.
- **오르는 항목:** C: a real measurement plus an environment difference, which points toward the 12-15 band. B: the factcheck issue at L158 is settled by observed output. A: an author-found reconciliation is original analysis.

## 3. A real --gc-sections removal list and one KEEP failure or near-failure

- **준비:** The same project. Build once with -Wl,--gc-sections -Wl,--print-gc-sections. Optionally build a second time with KEEP removed from `.isr_vector` in a scratch copy of the linker script.
- **절차:** Capture stderr: `... -Wl,--print-gc-sections 2> gc.txt`. Count the lines with `wc -l gc.txt`. Compare them with the `Discarded input sections` block in app.map. For the optional experiment, drop KEEP and relink, then check whether .isr_vector shrinks to 0 or disappears (map and `arm-none-eabi-size -A`), and whether the board still boots. Record the observed result as it happened.
- **기록할 것:** 3-5 verbatim `removing unused section '...' in file '...'` lines, the total line count, whether the map's Discarded block lists the same sections, the FLASH bytes before and after --gc-sections (from --print-memory-usage, one build without it and one with it), and the result of the KEEP experiment (section size in the map, and the board behaviour if it was flashed).
- **글에 넣을 위치:** The '제거된 section' section (L116-126), right after the --print-gc-sections command. The KEEP result can go there or become a third '자주 보는 함정' entry.
- **오르는 항목:** C: a trade-off and failure case backed by real numbers (12-15 band). A: a first-hand failure case, which is the 20-25 band signal in rubric A.

## 4. Observed archive scan behaviour: archive placed before the objects, and the member-to-member chain

- **준비:** The same project, with libdrv.a containing at least uart.o, which calls dma_start, and dma.o.
- **절차:** Link once with `libdrv.a` placed before main.o, and once in the correct order. In the correct-order map, check whether dma.o is pulled in by libdrv.a(uart.o) in the same archive pass.
- **기록할 것:** The exact linker error text for the wrong order (for example `undefined reference to 'uart_init'`). The Archive member block for the correct order, showing the `libdrv.a(dma.o)  libdrv.a(uart.o) (dma_start)` line as ld actually prints it.
- **글에 넣을 위치:** The L112-114 explanation (fixes the '만' claim with observed behaviour) and the 'archive를 object보다 앞에 둠' pitfall at L151-153 (paste the real error message).
- **오르는 항목:** C: an observed failure plus a reproducible command. B: the factcheck point at L114 is backed by real output.

## 5. Find which object uses the most SRAM, run on the real map

- **준비:** The same app.map from item 1, where the SRAM is spread across several objects, unlike the constructed single-object case.
- **절차:** Run the L135-136 sed/grep pipeline for each object, or an awk script that adds up input-section sizes per file under the .data and .bss output sections. Cross-check with `arm-none-eabi-nm --size-sort -S app.elf | grep -i ' [bBdD] '`.
- **기록할 것:** A table of the top 3-5 objects by SRAM bytes from the real map, the largest single symbol and its share of SRAM, and any discrepancy between the map and nm (for example COMMON symbols, or alignment padding fill lines such as `*fill*`).
- **글에 넣을 위치:** The '한 object가 쓰는 SRAM 찾기' section (L130-139), replacing the 16/17 main.o example. This also sets the post apart from debugging/chapter05-elf-map (rubric D).
- **오르는 항목:** C: observed results with real numbers. A: the author's own analysis and choice of what to shrink first. D: a different angle from chapter05-elf-map.
