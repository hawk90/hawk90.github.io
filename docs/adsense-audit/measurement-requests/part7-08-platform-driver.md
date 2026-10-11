# 작성자 측정 요청 — `part7-08-platform-driver.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part7-08-platform-driver.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 4 (루프 종료 점수 71)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어·도구로 얻은 값과 기록이 있어야 오른다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 작성자가 직접 얻은 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. Build and load the post's driver on real hardware. This is the baseline 'success' row of the probe-result table (L245-251). The code is currently unbuilt, and every expected observation was derived from reading source.

- **준비:** A board the author owns that boots a v6.12 kernel built locally by the author, with its configured build tree. State the board, SoC, toolchain version and kernel config fragment (CONFIG_DEBUG_FS, CONFIG_DYNAMIC_DEBUG, CONFIG_MODULES). The DT node can come from a DT overlay or a DTS edit. Pick one of two options: (a) re-target the driver at a real, unused SoC IP on that board, with real reg, interrupts, clocks and resets, and real IRQ enable/status offsets from that SoC's reference manual; or (b) point the node at fixed-clock/regulator-fixed providers and remove the MMIO writel/readl, so nothing touches an unmapped address. Record which option was used.
- **절차:** 1) `make -C <ktree> M=$PWD ARCH=<arch> CROSS_COMPILE=<prefix> modules` with the three C code blocks (L47-85, L87-142, L144-170) joined into one file. Keep the full warning/error output. 2) Apply the overlay or DTB and boot. 3) Run the post's command block (L235-241): enable dd.c dynamic debug, `insmod foo.ko`, `ls -l /sys/bus/platform/drivers/foo/`, `dmesg | tail -n 20`, `cat /sys/kernel/debug/devices_deferred`. 4) `echo <devname> > /sys/bus/platform/drivers/foo/unbind`, then rebind, and check /proc/interrupts before and after for the foo IRQ line.
- **기록할 것:** The exact compiler output (or 'no warnings'), the kernel version string (`uname -r`), the board and SoC, the verbatim ls/dmesg/devices_deferred output, and the /proc/interrupts lines before and after unbind. If anything in the post's code had to change to build or run, record the diff.
- **글에 넣을 위치:** ### 로드 후 확인 (L231-255): add a short 'tested on <board>, v6.12' environment line, with the captured output shown under the command block (after L241). Fold any required code fixes into the code blocks at L33-170.
- **오르는 항목:** C (moves from source-derived to observed results with a stated environment, and toward 12+ when combined with the items below). It also lets lastVerified be kept honestly (G).

## 2. Capture the observed log for each row of the probe-result table, including the -ENODEV/-ENXIO row vs the compatible-mismatch row, which the post separates only from source reading (L253).

- **준비:** Same board, kernel and module as item 1. CONFIG_DYNAMIC_DEBUG=y and debugfs mounted at /sys/kernel/debug.
- **절차:** Before each insmod, run the post's first command (`echo 'file drivers/base/dd.c +p' > /proc/dynamic_debug/control`). Then trigger each row in turn. (1) Success: the unmodified module. (2) -ENODEV: a temporary build whose probe starts with `return -ENODEV;`. Repeat with -ENXIO. (3) Other error: remove `vendor,mode` from the node, or use a temporary `return -EIO;`. (4) -EPROBE_DEFER: point vdd-supply or clocks at a provider that is built as a module and not yet loaded, insmod foo.ko, then load the provider module afterwards. (5) Compatible mismatch: an overlay with `vendor,fooo-v1` (the pitfall at L259-265). For each case run the commands from L236-240, plus `cat /sys/bus/platform/devices/<dev>/of_node/compatible` and `cat /sys/bus/platform/devices/<dev>/driver_override` (or check that a driver link is missing).
- **기록할 것:** For each of the 5-6 cases: the verbatim dmesg lines, both the driver's dev_err_probe line and dd.c's 'rejects match' / 'failed with error' / 'requests probe deferral' lines, the ls output, and the devices_deferred contents. For case 4, also record the output after the provider module loads, to show whether the retry succeeds. Mark any row whose observation differs from the post's table.
- **글에 넣을 위치:** ### 로드 후 확인: annotate the table at L245-251 with the observed log strings (or add an 'observed' column), and back the L253 paragraph ('다섯 행은 dmesg 열에서 모두 갈립니다 …') with the observed differentiator: the 'probing driver foo with device' line present vs absent, or the compatible string from sysfs. This also keeps the description at L5 and the body in agreement (E).
- **오르는 항목:** C (a reproducible procedure with observed, distinguishable results for every row: 11 to 12+), E (description and body agree) and A (a first-hand decision table that is not in the kernel docs).

## 3. Record the actual errno returned by of_property_read_u32 and of_property_read_string for empty and short properties on a real FDT. This checks the source-read errno list at L227 (empty or short u32 → -EOVERFLOW, empty string → -ENODATA).

- **준비:** Same board and module as item 1. The module prints `ret` through its existing dev_err_probe path for vendor,sample-rate and vendor,mode.
- **절차:** Boot three overlay variants in turn: (a) `vendor,sample-rate;` (empty), (b) `vendor,sample-rate = /bits/ 8 <0x01>;` (1 byte), (c) `vendor,sample-rate = <44100>;` (valid). For the string case, also boot `vendor,mode;` (empty). insmod and capture dmesg each time.
- **기록할 것:** The verbatim dmesg line with the errno for each variant. For the valid case, the rate value the driver used (add a temporary dev_info if needed, and say so).
- **글에 넣을 위치:** ### DT property 읽기, the L227 paragraph: keep or correct the errno list to match what was observed, and quote one captured line.
- **오르는 항목:** C (an observed result backs a source-read claim) and accuracy/fact-check.

## 4. Observe the boot-time 'deferred probe pending' timing, to back the timer-extension description at L255 with an observed timing.

- **준비:** Same board, with foo built in (=y) or loaded from an initramfs. Its supplier (regulator or clock provider) is deliberately absent or disabled in DT, so the device stays deferred. Record any `deferred_probe_timeout=` value on the kernel command line, or its absence.
- **절차:** Boot, then `dmesg | grep -E 'deferred probe pending|Registered|driver'`, using printk timestamps (CONFIG_PRINTK_TIME). Note the timestamp of the last driver registration before the warning. Repeat once with `deferred_probe_timeout=30` on the command line.
- **기록할 것:** The timestamp of the 'deferred probe pending: <reason>' line, the timestamp of the last driver_register/late_initcall activity before it, and the difference, for both the default and the 30 s boots. Include the verbatim warning line.
- **글에 넣을 위치:** ### 로드 후 확인, the L255 paragraph (deferred_probe_timeout, default 10 s with CONFIG_MODULES, extended by each driver registration): add the observed delay relative to the last driver registration, and quote the warning line.
- **오르는 항목:** C (observed timing behaviour and how it changes with a configuration setting) and a fact-check of L255.

## 5. Attempt to reproduce the remove-before-devres hazard (L279-290): clk_disable_unprepare in .remove while the devm IRQ is still registered.

- **준비:** Only possible with option (a) from item 1: a real IP whose interrupt can be raised on demand, plus a register read that faults, hangs or returns garbage when the clock is gated. State the SoC and IP. Build a variant that uses devm_clk_get + clk_prepare_enable in probe and clk_disable_unprepare in remove.
- **절차:** Generate interrupts continuously (hardware stimulus or a loop that triggers the IP), then unbind repeatedly: `for i in $(seq 100); do echo <dev> > .../unbind; echo <dev> > .../bind; done`. To widen the window, optionally add a temporary mdelay() after clk_disable_unprepare in the variant, and record that it was added. Run the same loop on the post's correct version.
- **기록할 것:** The iteration count, the number of failures and their verbatim form (SError/abort/oops log, hang, or bad status value), and the result for the correct version. If nothing happens, record that it did not reproduce, the iteration count, and why (for example, that IP's register reads return 0 without a clock).
- **글에 넣을 위치:** ## 자주 보는 함정, under the clock/remove pitfall at L279-290 (after the L290 paragraph): one or two sentences with the observed failure signature, or the honest 'not reproduced on <SoC>; the window exists but needs X'.
- **오르는 항목:** A (a first-hand failure case, toward 20+) and C (a measured failure and its trade-off: 12+). Do not write this unless it was actually run.

## 6. Add the author's own field record, if one exists: a real platform-driver bring-up failure (wrong compatible, a swallowed -EPROBE_DEFER, a missing supply, or a remove/devres ordering bug) on a named board and kernel.

- **준비:** Only from the author's real past work: board, SoC, kernel version and the symptom as it was seen.
- **절차:** Retrieve the original log, commit or notes from the author's own records. If needed, re-trigger the bug on that board to recapture the log.
- **기록할 것:** Symptom, the log line that identified it, the root cause, and the fix (one diff hunk). Nothing reconstructed from memory without a log.
- **글에 넣을 위치:** One short case paragraph in ## 자주 보는 함정 (L257-290), attached to the matching pitfall (compatible typo L259-265, overwritten -EPROBE_DEFER L267-277, or remove/devres order L279-290).
- **오르는 항목:** A (the author's own failure case and judgement: the 20-25 band) and C (the real environment where it differed).
