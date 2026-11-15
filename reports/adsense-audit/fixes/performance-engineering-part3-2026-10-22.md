# Embedded Performance Engineering Part 3 — remediation evidence

Date: 2026-10-22. This is a remediation record, not a score or regrade. Scope is the twelve source files `part3-01` through `part3-12` in source order. URL, date, series order, and draft state were preserved. Only `part3-04` title and description were corrected because its headline claimed measured data while the article supplied no reproducible measurement record. No whole-site build was run; that remains the parent task.

## Primary references consulted

- Arm, [Introduction to AMBA AXI4](https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/Learn%20the%20Architecture/102202_0100_01_Introduction_to_AMBA_AXI.pdf) and [Cortex-M interrupt latency guide](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/beginner-guide-on-interrupt-latency-and-interrupt-latency-of-the-arm-cortex-m-processors).
- Arm, [CCI-400 overview](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/extended-system-coherency---part-2---implementation-big-little-gpu-compute-and-enterprise).
- ST, [RM0433 STM32H742/H743/H753/H750 reference manual](https://www.st.com/resource/en/reference_manual/rm0433-stm32h743-753-and-stm32h750-value-line-advanced-arm-based-32-bit-mcus-stmicroelectronics.pdf), [STM32H7 HAL MDMA driver](https://github.com/STMicroelectronics/stm32h7xx-hal-driver/blob/master/Src/stm32h7xx_hal_mdma.c), and [UM2217 HAL/LL user manual](https://www.st.com/resource/en/user_manual/um2217-description-of-stm32h7-hal-and-lowlayer-drivers-stmicroelectronics.pdf).
- Linux kernel docs, [NAPI](https://docs.kernel.org/networking/napi.html), [IP sysctl](https://docs.kernel.org/networking/ip-sysctl.html), [device I/O](https://docs.kernel.org/driver-api/device-io.html), and [memory barriers](https://docs.kernel.org/core-api/wrappers/memory-barriers.html).
- Intel, [Core i7-12700 product specifications](https://www.intel.com/content/www/us/en/products/sku/134591/intel-core-i712700-processor-25m-cache-up-to-4-90-ghz/specifications.html).
- Compute Express Link Consortium, [CXL 3.1 specification](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf). Research data: Sun et al., [“Demystifying CXL Memory with Genuine CXL-Ready Systems and Devices” (MICRO 2023)](https://arxiv.org/abs/2303.15375).

## Chapter decisions (eight-field record)

### part3-01 — Bus Architecture — `remediated`

1. **Context and scope:** APB summary table and APB transaction description in this article.
2. **Signal and refutation:** The table called APB single-cycle while the body described Setup and Access phases, contradicting itself. The APB transaction is not a one-cycle transfer; Access can also be extended by wait states.
3. **Cause and alternatives:** An over-compressed protocol summary likely conflated a clocked protocol with its number of phases. The alternative is describing the phases and their minimum timing directly.
4. **Evidence:** Arm’s AMBA introduction describes APB address/data phases and that APB is not pipelined; source body previously stated Setup/Access.
5. **Sample scope:** One APB explanation and its nearby table; no RTL simulation or SoC bus trace.
6. **Decision:** Correct the table to minimum two phases and explain wait-state extension; retain overview scope.
7. **Smallest safe change / rollback:** Two prose edits in this article only. Revert those two lines to roll back; URL/frontmatter unchanged.
8. **Validation and residual risk:** Static verifier confirms phase text and rejects old single-cycle wording; publish gate blocking checks and inline-math pass. Exact timing still depends on the APB revision and peripheral wait behavior.

### part3-02 — Bus Contention — `remediated`

1. **Context and scope:** PMU ratio, CCI-400 interface counts and examples, STM32H743 matrix, and claimed 4× parallel speedup.
2. **Signal and refutation:** Accesses divided by bus cycles are not utilization; the H743 “7×6/42 path” description conflicted with the reference manual architecture; sample CCI/HAL register calls were not actual APIs.
3. **Cause and alternatives:** Generic arbitration concepts were presented as device register interfaces and topology facts. Use target-manual wording and visibly marked pseudocode for abstract policy examples.
4. **Evidence:** Arm CCI-400 overview documents two ACE processor interfaces and three ACE-Lite I/O-coherent interfaces. ST RM0433 describes H743’s D1 AXI and D2/D3 AHB matrices, bridges, and master/slave connectivity table. Counter meanings vary by PMU; Linux perf examples are not a portable utilization formula.
5. **Sample scope:** The named CCI, STM32H7 and PMU examples were source-inspected. No CCI-400/H743 board or PMU was available for execution.
6. **Decision:** Replace fixed interface/path counts and invented register/API names with sourced topology or explicit pseudocode; distinguish access/cycle from busy-cycle utilization.
7. **Smallest safe change / rollback:** Edits confined to article prose/examples. Restore the saved pre-edit source to roll back; no URL/frontmatter changed.
8. **Validation and residual risk:** Static assertions pass for the H743 connectivity description and negative old claims. Publish gate blocking checks and inline-math pass. No platform PMU event definition or bus saturation was measured; exact QoS controls remain platform-specific.

### part3-03 — DMA Performance — `remediated`

1. **Context and scope:** HAL initialization, H7 MDMA capability, double-buffer gain and latency/break-even rules.
2. **Signal and refutation:** The HAL initializer was shown with invalid function-call/designated-argument syntax; the blanket statement that DMA1/2 cannot do memory-to-memory transfers contradicts H743 RM0433; fixed “2×” and cycle/byte thresholds were not reproducible measurements.
3. **Cause and alternatives:** Several controller families were collapsed into one generic API/cost model. Use HAL handle fields, state missing target initialization, and describe overlap as a theoretical upper bound rather than a measured guarantee.
4. **Evidence:** ST RM0433’s master/slave table and DMA controller sections; ST’s MDMA HAL source documents configuration, start and linked-list APIs. Controller costs and overlap are target/workload dependent.
5. **Sample scope:** Source fence extraction plus static API-shape checks. No STM32 firmware build, DMA transfer, or hardware timing run.
6. **Decision:** Correct the API shape and H743 DMA capability statement; remove universal cycle and size thresholds and qualify maximum overlap.
7. **Smallest safe change / rollback:** Adjust snippets and nearby claims only; all edits are local to this article. Restore pre-edit article to roll back.
8. **Validation and residual risk:** Static verifier confirms corrected `HAL_DMA_Init(&hdma)` shape and removal of the old capability claim. Publish gate and inline-math pass. Required MCU-specific fields, cache maintenance, and successful transfer still require compilation and target testing.

### part3-04 — DMA vs CPU — `remediated`

1. **Context and scope:** CPU memcpy/DMA cost model and claimed STM32H743 measurements.
2. **Signal and refutation:** Under the article’s own model, 200 cycles at N/3 cycles per byte corresponds to 600 bytes, not 60. The “STM32H743 measurement” table had no reproducible measurement log or complete setup.
3. **Cause and alternatives:** An internal arithmetic typo and unsupported measurement labeling. Keep the model explicitly model-only and provide a measurement procedure instead of untraceable target results.
4. **Evidence:** Recalculation of the article’s equation; no board run or source artifact supports the former table.
5. **Sample scope:** 200-cycle conversion checked positively and old 60-byte value rejected; no target benchmark.
6. **Decision:** Correct the conversion, remove the unsubstantiated result table, and change title/description from measured results to a measurement method.
7. **Smallest safe change / rollback:** Only this article’s measurement section and inaccurate title/description changed. URL, date, series order, draft, tags and series identity preserved. Restore the pre-edit article to roll back.
8. **Validation and residual risk:** Host arithmetic/model verifier, publish gate, inline-math and diff checks pass. Actual break-even depends on MCU, compiler, memory, cache and transfer completion path; still needs board measurements.

### part3-05 — Interrupt Latency — `remediated`

1. **Context and scope:** Cortex-M latency table, tail-chaining percentage, and FPU stacking increment.
2. **Signal and refutation:** M7/M33 fixed-cycle entries and “50% efficiency” / “+32 cycles” were stated without common conditions; Arm’s published baseline table specifies M0/M0+/M3/M4 and zero-wait-state assumptions.
3. **Cause and alternatives:** A single ideal timing was generalized across cores and SoCs. Preserve the sourced baseline and describe other effects qualitatively or with device-specific measurements.
4. **Evidence:** Arm Cortex-M interrupt guide gives M0=16, M0+=15, M3/M4=12 cycles with zero-wait-state and other assumptions; tail-chaining can be six cycles for M3/M4 under the documented conditions.
5. **Sample scope:** Table and three unqualified cycle claims; no MCU measurements.
6. **Decision:** Retain only sourced baseline rows and condition them; remove unsupported efficiency and FP fixed-cycle assertions.
7. **Smallest safe change / rollback:** Table and adjacent prose only; restore pre-edit text to roll back.
8. **Validation and residual risk:** Static condition checks, publish gate and inline-math pass. DWT snippet still requires target-specific setup and synchronization; no latency run occurred.

### part3-06 — Interrupt Storm — `remediated`

1. **Context and scope:** Ethernet line-rate model and Linux/embedded mitigation examples.
2. **Signal and refutation:** Minimum Ethernet frames consume 64 bytes on the wire plus 8-byte preamble/SFD and 12-byte inter-frame gap, so 1 Gb/s is about 1.488 Mpps rather than 1.95 Mpps. The old 22% ISR share used that inflated rate. Polling is not zero-cost; `icmp_ratelimit` is not an ingress flood limiter; XDP does not generally guarantee a drop before NIC interrupt generation.
3. **Cause and alternatives:** Packet payload/frame bytes were treated as all wire occupancy, and distinct kernel mechanisms were summarized as generic flood controls. Recalculate line-rate budget and describe kernel API scope precisely.
4. **Evidence:** Arithmetic from 84 wire bytes per minimum frame; [Linux NAPI docs](https://docs.kernel.org/networking/napi.html) describe NAPI polling/busy-poll tradeoffs; [IP sysctl docs](https://docs.kernel.org/networking/ip-sysctl.html) define `icmp_ratelimit` against selected outbound ICMP responses.
5. **Sample scope:** One simplified line-rate model and NAPI/ICMP/XDP claims; no NIC, driver, or Linux runtime.
6. **Decision:** Correct pps/cycle budget; distinguish polling CPU cost, ICMP error response limiting, and XDP RX-path processing. Update NAPI completion call to `napi_complete_done()`.
7. **Smallest safe change / rollback:** Article text and source-fence edits only; restore pre-edit article to roll back.
8. **Validation and residual risk:** Positive model test and negative old-rate assertion pass, as do gate, math and diff checks. Assumed 112 cycles/packet is illustrative only; actual IRQ/NAPI behavior depends on NIC, coalescing and kernel/driver.

### part3-07 — MMIO — `remediated`

1. **Context and scope:** Universal ARM memory-type mapping and write-combining performance claim.
2. **Signal and refutation:** Fixed transaction grouping and 8× bandwidth improvement lacked architecture/device basis; Linux documentation warns that `ioremap_wc()` ordering is architecture-specific and usually requires a prefetchable region.
3. **Cause and alternatives:** Mapping semantics were presented as universal and a possible coalescing effect as a fixed benchmark outcome. Describe the condition and require target measurement.
4. **Evidence:** Linux [device I/O documentation](https://docs.kernel.org/driver-api/device-io.html) contrasts default accessors and WC mapping behavior.
5. **Sample scope:** Table and write-combining section; no PCIe device or SoC measurement.
6. **Decision:** Qualify ARM/OS mapping and remove fixed transaction/bandwidth multiplier claims.
7. **Smallest safe change / rollback:** Replace the generalized prose only; restore old paragraphs to roll back.
8. **Validation and residual risk:** Static positive/negative assertions, publish gate, math and diff pass. Exact attributes, accessor ordering and throughput remain platform-specific.

### part3-08 — Peripheral Clock — `remediated`

1. **Context and scope:** Reset clock assumptions and DSB meaning in the STM32H743 example.
2. **Signal and refutation:** “All peripheral clocks are off after reset” was overbroad; DSB completion was described as waiting for clock stability.
3. **Cause and alternatives:** Register-write ordering was conflated with peripheral-ready status. Use reset values and readiness conditions from the selected MCU manual.
4. **Evidence:** The article targets STM32H743; the ST RM0433 is the controlling reference for its RCC reset values and peripheral clocking. DSB is not a PLL/peripheral ready flag.
5. **Sample scope:** One reset statement and one RCC snippet; no board timing.
6. **Decision:** Make reset state MCU-specific and limit DSB comment to prior write completion.
7. **Smallest safe change / rollback:** Two prose/comments only; restore source to roll back.
8. **Validation and residual risk:** Static assertions, publish gate, math and diff pass. UART/SPI calculations and RCC configuration were not built or measured on a board.

### part3-09 — Power vs Performance — `unassessed`

1. **Context and scope:** Cross-vendor DVFS, energy, governor and power budget claims.
2. **Signal and refutation:** Prior report identified numerous unreferenced model values (e.g. race-to-idle and SoC current/power); no new primary-source evidence was collected for those numbers in this batch.
3. **Cause and alternatives:** Multiple products and OS policies are combined without one named target. A generic model may explain the concept, but does not verify the listed values.
4. **Evidence:** Existing published-loop-20 review flags the claims as unverified; this batch did not establish device or workload measurements.
5. **Sample scope:** Full article read; numerical/model claims not comprehensively source checked.
6. **Decision:** Leave the chapter unchanged and explicitly unassessed; do not imply its numerical claims are verified.
7. **Smallest safe change / rollback:** No source change. No rollback needed.
8. **Validation and residual risk:** Static fence extraction, publish gate, inline-math and diff checks pass. **Next action:** manual review against primary product/OS sources, then reproduce one named target workload. **Review question:** Which specific SoC, firmware/kernel version and workload produce each race-to-idle and power figure?

### part3-10 — Thermal — `remediated`

1. **Context and scope:** TDP/SDP terms and i7-12700 power figures.
2. **Signal and refutation:** SDP was called a general-workload average and the conclusion mapped TDP/SDP to average/peak. Intel’s i7-12700 page lists Processor Base Power and Maximum Turbo Power; it does not establish an SDP value for that product.
3. **Cause and alternatives:** Manufacturer-specific labels were turned into universal thermal definitions. Keep product spec names and distinguish them from a measured average.
4. **Evidence:** Intel product specs list 65 W Processor Base Power and 180 W Maximum Turbo Power for i7-12700; its specifications do not support the former SDP ~30 W claim.
5. **Sample scope:** Power vocabulary and one Intel SKU; no thermal chamber or power measurement.
6. **Decision:** Remove SDP-as-average and state the published Intel spec labels accurately.
7. **Smallest safe change / rollback:** Edit the terminology block, SKU note and summary line only. Restore those lines to roll back.
8. **Validation and residual risk:** Static assertions, publish gate, math and diff pass. Other board/SoC/space thermal values remain unverified and must not be treated as measurements.

### part3-11 — CXL Interconnect — `remediated`

1. **Context and scope:** CXL coherency/address-space summary, 68B Flit payload interpretation, and counter-to-nanosecond example.
2. **Signal and refutation:** The article implied all host/device memory shares one address space, described the entire 68B flit as 64B payload plus fixed overhead, and divided counter ticks by one million while labeling the result nanoseconds.
3. **Cause and alternatives:** Protocol/type constraints and counter frequency conversion were omitted. Scope coherence by supported protocol/configuration and use CNTFRQ to convert ticks.
4. **Evidence:** CXL 3.1 spec §4.2 distinguishes 68B link mode and protocol framing; Arm counter registers expose count/frequency separately. Source arithmetic shows the prior expression has units of ticks, not ns.
5. **Sample scope:** Source-fence static inspection and 1 GHz host conversion model; no CXL device/ARM hardware run.
6. **Decision:** Qualify coherent-sharing statement and flit payload, correct the counter conversion and state cache-miss behavior is not guaranteed by pointer chasing alone.
7. **Smallest safe change / rollback:** Article intro, flit bullet and measurement snippet/prose only. Restore prior article to roll back.
8. **Validation and residual risk:** Positive counter-scope test and negative old conversion check pass. Publish gate, math and diff pass. CXL protocol transactions, cache behavior and measured latency remain untested on target hardware.

### part3-12 — CXL.mem Latency — `remediated`

1. **Context and scope:** Published MICRO 2023 latency ratios, including the DDR4-2400 vs DDR4-3200 comparison.
2. **Signal and refutation:** The published-loop review suspected that “67%” could conflict with table values rounded to “about 2×” and “about 3×.” The paper directly reports the 67% result, so it is not an error.
3. **Cause and alternatives:** A percentage cannot be recomputed exactly from rounded ratios; use the underlying paper statement and make the distinction explicit.
4. **Evidence:** Sun et al. MICRO 2023 §4 and its [primary paper](https://arxiv.org/abs/2303.15375) report CXL-C 67% longer load latency than CXL-B and separately summarize the devices as almost 3× and almost 2× DDR5-R.
5. **Sample scope:** One paper’s three real devices on the authors’ testbed; not a measurement of local hardware.
6. **Decision:** Keep 67%, cite the paper inline, and state it is not derived from rounded table ratios.
7. **Smallest safe change / rollback:** Add a source link and clarify the comparison sentence; restore previous paragraph to roll back.
8. **Validation and residual risk:** Static citation/scope check, gate, math and diff pass. No CXL board, MLC, STREAM or DAMON execution here; switch and pool measurements remain explicitly TBD.

## Verification log summary

- `node scripts/verify-performance-engineering-part3-examples.mjs`: PASS. Extracted all non-empty Markdown fences; positive/negative static assertions and host arithmetic checks passed. Extracted embedded target examples were **not executed** by this script.
- `node scripts/check-inline-math.mjs <12 Part 3 paths>`: PASS, no unintended inline math.
- `git diff --check -- <12 Part 3 paths> scripts/verify-performance-engineering-part3-examples.mjs`: PASS.
- `bash scripts/audit-publish-gate.sh <12 Part 3 paths>`: blocking checks PASS. Manual hallucination candidates remain in the CXL device/Neoverse claims; cited-symbol checks report `SKIPPED` because upstream clones are absent. `SKIPPED` is not PASS. Full details are in the adjacent `.log`.
- Not run: Linux perf/MLC/STREAM/DAMON, CXL or NIC hardware, Cortex-M boards, DMA/IRQ/MMIO/thermal workload measurements, firmware compilation, and whole-site build.
