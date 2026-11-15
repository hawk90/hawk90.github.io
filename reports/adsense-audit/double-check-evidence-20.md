# 초벌 근거 대조 — 공개 루프 20

Sol 최종 검토용 evidence 메모다. 기존 점수/판정을 새로운 최종 평가로 복제하지 않았다. 대상 각 글은 전문 전체를 줄번호와 함께 읽었고 D는 보고서 기재 비교 구간의 원문 쌍, F는 현재 대상 파일의 title/order/public status와 후행 설명을 대조했다. 추측성 사양 claims는 확인 질문·공식 source/실행 필요로 남겼다. 원문 변경 없음.

## 1. `part3-06-interrupt-storm.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part3-06-interrupt-storm.md`, 읽은 구간 1–248 전체.
- A–G 근거: A(19–26, 30–166, 170–196) 계산표와 대응기법 목록 존재, 선택 기준은 얕음. B(30–49, 51–83, 85–109, 180–196) NAPI·IRQ mask/unmask 설명 흐름 확인, 49행 주장과 실제 코드 재호출 가능성은 확인 질문. C(19–26, 89–109, 115–153, 170–176) 구체 수치/명령 있으나 환경 및 측정 output 없음. D 아래 대조. E(2,5,51–141,156–166) NAPI/coalescing/polling 다룸, rate limit은 ICMP 한 줄. F(243–248) next 및 링크 확인. G(1–248) 출처 링크 없음.
- D 원문쌍: storm/top-bottom/BASEPRI 30–49·180–196 ↔ 같은 시리즈 `part3-05-interrupt-latency.md` 79–108·123–141·156–167; ISR storm/NAPI 30–49·72–83 ↔ RTOS `part1-05-interrupts-rtos.md` 140–163; IRQ affinity 143–149 ↔ Recipes `part7-13-irq-affinity.md` 해당 affinity 절. Recipes는 비교 가능.
- F 실대상: 243행 다음 MMIO는 공개 `part3-07-mmio.md`(order25); 247–248행 3-05/3-07 links 라벨·경로 일치. 설명은 없음.
- Factcheck: 기존 미검증에 동의. 산술 19–26, 170–178은 계산 확인 가능. 49행 “storm 끝날 때까지 ISR 한 번”은 35–45행이 unmask를 되풀이하므로 코드가 말하는 동작과 충돌 후보이나 재발 interrupt semantics 및 ISR/task race 검토가 필요. 1.95Mpps, coalesce default, NAPI budget, busy_poll, XDP timing, DPDK throughput은 Linux/kernel/NIC 문서·target 실행 필요.

## 2. `part3-07-mmio.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part3-07-mmio.md`, 읽은 구간 1–258 전체.
- A–G: A(19–62, 64–105, 107–201) 표준 MMIO 개념과 PCIe posted-write 사례. B(21–41, 90–105, 150–201, 221–242) Device type·barrier·access width 설명의 단서/대상 모순 후보를 분리. C(36–41, 92–105, 152–201) STM32/Linux/ARM 혼재, 수치 실행근거 없음. D 아래. E title의 성능과 본문 정확성 설명의 상대 비중 점검. F(253–258) next 확인. G 출처 링크 없음.
- D 원문쌍: MMIO/volatile/BSRR 64–78·107–130·193–201 ↔ Recipes `part4-02-mmio-access.md` 25–50·158–171; barrier 90–105·178–191 ↔ Recipes `part2-10-memory-barrier.md` 59–80·189–193; PCIe posted/write-combining 44–62·160–176 ↔ Recipes `part11-09-pcie-streaming.md` 37–42·121–141.
- F 실대상: 253행 Peripheral Clock은 공개 `part3-08-peripheral-clock.md`(order26); 257–258행 3-06/3-08 link 대상 확인, 짧은 설명 없음.
- Factcheck: 31 vs 38행 Device-nGnRE/nGnRnE, 25 vs 155행 speculation, 201행 word access vs 같은 행 iowrite widths는 용어·아키텍처 조건 확인 전 오류 확정 불가. `ioremap` attributes, barriers, bit-band support, PCIe ordering은 ARM ARM/Linux source/PCIe spec 필요; 58행 8배 throughput 주장은 별도 benchmark 필요.

## 3. `part3-08-peripheral-clock.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part3-08-peripheral-clock.md`, 읽은 구간 1–250 전체.
- A–G: A(17–76, 78–163, 165–207) UART 산술과 RCC/DVFS 소개 확인; B(17–40, 97–146, 165–197) H2 나열 및 PLL·저전력 설명의 근거 부족. C(42–76 재계산 가능, 119–146·180–197 외부 사양 수치) 환경이 제한됨. D 아래. E(2,5,42–76,97–146,165–207) PLL 계산 약속은 lock wait 위주. F(245–250) next 확인. G no primary citations.
- D 쌍: DVFS/governor 97–115, ESP32 sleep 186–197, powertop 199–207 ↔ `part3-09-power-vs-performance.md` 17–39·54–86·142–175. PLLRDY/ENR/DSB 17–40·136–146 ↔ Recipes `part4-04-clock-setup.md` 112–126·130–149·202–204. Sleep/Stop/Standby 165–184 ↔ Recipes `part4-11-low-power-modes.md` 31–46.
- F 실대상: 245행 Power vs Performance는 공개 `part3-09-power-vs-performance.md`(order27); 249–250행 3-07/3-09 labels match; trailing description 없음.
- Factcheck: 원문 산술 66·72·74 및 SPI 주기는 내부 계산상 일치. 141/146/242 PLL 시간 근사는 내부 불일치 확정 근거 아님. RCC register names, clock source, current/wakeup, ESP-IDF, CCF behavior는 RM0433/SoC TRM/kernel+ESP-IDF official docs 및 target 확인 필요.

## 4. `part3-09-power-vs-performance.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part3-09-power-vs-performance.md`, 읽은 구간 1–244 전체.
- A–G: A(17–52, 54–175) power relation/governor 목록에 비해 독자 선택에 필요한 실측·조건은 제한됨. B(28–52, 54–86, 88–160, 164–237) 넓은 범위, race-to-idle 예제의 조건 설명 부족. C(58–82, 111–147, 164–189) commands present but incomplete paths/config and no experimental source. D below. E(28–52,88–107,109–175) title topics present but trade-off conclusion weak. F(239–244) target check. G sources absent.
- D pairs: 3-08 DVFS 97–116 ↔ 19–26·54–82; 3-08 sleep/powertop 186–207 ↔ 142–175; 3-10 thermal/benchmark 195–201 ↔ 152–160·222–228; BSP `chapter13-power-management.md` 181–275 ↔ 54–86·123–140.
- F: 239행 next Thermal is public `part3-10-thermal.md` order28; 243–244행 3-08/3-10 targets match; no trailing explanation.
- Factcheck: 25행 -10% V→-19% dynamic power and 35–36 37x arithmetic check; 48행 108mJ also arithmetic-correct. 50행 and 233행 generalized race-to-idle conclusion have different conditions, so not an internal contradiction yet. Sweet spot, governor default/deprecation, Snapdragon data, thermal thresholds, ESP32 current/sleep and power budget require primary source/measurements.

## 5. `part3-10-thermal.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part3-10-thermal.md`, 읽은 구간 1–241 전체.
- A–G: A(19–48,69–146,161–225) overview tables and thin case examples. B(63–92,135–146,227–241) trip point table differs from sysfs example; TDP/SDP summary conflict direct. C(40–48,52–92,96–225) commands/code but no board/kernel/source. D pairs: linux thermal 52–67·81–90 ↔ BSP `chapter14-thermal-watchdog.md` 91–113 and Recipes `part12-08-thermal.md` 61–73; grade table 19–26 ↔ BSP 76–85; sustained test 197–203 ↔ Recipes 148. E title topics found, analysis depth limited. F(236–241) mismatch. G citations absent.
- F: 236행 next “Toolchain & Profiling” is not current order successor; order29 is public `part3-11-cxl-interconnect.md`. 241행 bare “4-01: Compiler Optimization” is not linked and actual order30 public title is “Concurrency 기초”; 240행 3-09 link matches.
- Existing factcheck: 138–139 define TDP sustained peak / SDP ordinary workload average and 146 says SDP idle+light ~30W; 232 reverses average vs peak. Direct internal contradiction and 3-1 basis exists; Sol to own final conclusion. Intel TDP/SDP official definitions still needed to adjudicate external terminology. Thermal thresholds, DAPA, SoC temps/power/cold boot claims need datasheet/standard sources.

## 6. `part3-11-cxl-interconnect.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part3-11-cxl-interconnect.md`, read 1–181 full. Frontmatter has no `draft` key; existing loop marks published. Do not infer draft solely from missing key.
- A–G: A(16–100,102–149,151–163) specific CXL mechanisms/examples and citation-backed RD-V2/latency. B(16–163) evidence explains limits and TODO explicitly. C(92–128) command/code plus direct measurement method; pointer chase code itself needs build/runtime validation. D below. E(2,5,24–24,37–149) promised protocol/types/latency mostly located. F(174–181) obsolete next-item claim. G (104–149) citations are in history 4c77e2bf but not verified anew here; no live primary pages opened.
- D pairs: type table 57–61 ↔ Recipes `part11-15-pcie-to-cxl.md` 48–50, HBM `chapter11-cxl-device-types.md` 27–29, CXL `chapter01-cxl-position.md` 27–29·46–47; cache false sharing 141–155 ↔ `hardware/cxl/chapter07-cxl-cache.md` 40–60·104–110·124; latency/peak assumptions 104–110·161–163 ↔ same-series `part3-12-cxl-mem-latency.md` 40–44·96–98. D overlap is real topic overlap, not fact error.
- F: 174행 claims absent “3-12: next-gen SoC trends”; current order30 is public `part4-01-concurrency-basics.md`. Filename `part3-12-cxl-mem-latency.md` is order54. 178–181 related link targets exist; label 3-01 differs title phrasing but points to correct file. No trailing explainer.
- Existing `verified` basis: referenced commit 4c77e2bf has CXL 3.1 spec, Arm RD-V2 doc, MICRO 2023 citation trail; this preliminary pass did not reopen those primary sources, so treat as report-supported, not independently reverified. The original’s explicit TBD for unmeasured switch/cache bandwidth is good uncertainty handling. Code's timer units/NUMA placement require implementation test if claiming measured result.

## 7. `part4-01-concurrency-basics.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part4-01-concurrency-basics.md`, read 1–281 full.
- A–G: A(17–108,110–179,181–233) broad introductory scope; B(23–81,83–179,181–257) examples but oversimplified memory model/cost statements. C(27–65,95–156,181–205) snippets illustrative, not a runnable artifact. D below. E(2,5,17–233) title topics included, memory model is substantial. F(276–281) next labels check. G no external citations.
- D pairs: false-sharing teaser 209–218 ↔ `part4-02-false-sharing.md` 15–37·63–90; memory ordering 110–179 ↔ `part4-08-memory-ordering.md` 24–37·48–63·94–106; ABA/lockfree 220–233 ↔ `part4-07-lock-free.md` 110–140·194 onward; similar order costs ↔ Recipes `part9-06-atomic-cost.md` 39·44·185·208–212.
- F: 276 next False Sharing is public order31 `part4-02-false-sharing.md`; 280 3-10 label and 281 4-02 label target exist, although 3-10 not immediate predecessor (3-11 order29); no explanatory text.
- Factcheck: no confirmed internal contradiction. ARM reorder claims and DMB comment 95–97 (DMB is ordering; “all accesses completed” more like DSB) require ARM ARM/CMSIS. C11 seq_cst/acq_rel litmus is language-model question requiring C++/C standard and allowed-execution verification; do not assert wrong from prose alone. Cost 30/5 cycles needs compiler+microbenchmark.

## 8. `part4-02-false-sharing.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part4-02-false-sharing.md`, read 1–305 full.
- A–G: A(17–61,63–115,117–202,204–248) MESI/padding/examples; B(63–90,117–156,192–202,238–289) code vs claims; C(63–90,170–182,254–266) benchmark has platform but no reproduction command/compiler/source. D below. E title/description terms are covered, though some claims absolute. F(300–305) order successor verified. G two citations only (including general references) and no benchmark citation.
- D pairs: false-sharing/padding code 63–115·117–156·238–248 ↔ Recipes `part9-09-false-sharing.md` 169–193·206–238; cache-line diagnosis 170–182 ↔ same series `part2-07-cache-line.md` 76–81·188 vicinity; MESI transition 19–37·170–182 ↔ `part4-09-cache-coherency.md` 89–100·171–184. Compared both source sides at noted ranges; Recipes is valid comparator.
- F: 300 next Lock Contention is public order32 `part4-03-lock-contention.md`; 304–305 4-01/4-03 links map to order30/32 and titles.
- Existing factcheck: 15 “10–100x” vs 89 “14x” can both hold because 14x is inside a range; no 3-1 contradiction. But 199 `counters[NUM_CORES] aligned(64)` aligns array base only and elements may still share lines, contrary to intended fix: code/claim pairing should be checked as an internal explanatory mismatch; not upgraded without Sol. Also 122–124 says 8×4=32B within one line assumes cache line=64B; line explicitly states 64-byte line there. Test data, cache-line sizes, perf c2c minimum version and C++ interference constant need source/benchmark.

## 9. `part4-03-lock-contention.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part4-03-lock-contention.md`, read 1–279 full.
- A–G: A(24–108,110–213) metrics, tooling, patterns and examples. B(24–39,41–84,86–108,250–262) strong structure but threshold/rules without evidence. C(41–84,250–262) commands/sample data but no version/environment. D below. E(2,5,24–67,250–262) wait/hold/convoy measurement promised and present. F(273–279) next and three links. G primary source links absent.
- D pairs: perf lock command/report 41–55 ↔ `part6-03-case-lock-contention.md` 59–66·204; Amdahl 86–96 ↔ `part1-07-modeling.md` 19–38 and `part4-10-smp-analysis.md` 207–215; RW-lock 151–169 ↔ `part4-06-rw-lock.md` 20 onward; hold-time comparison 171–187 ↔ `part4-04-spinlock.md` 14·38 and `part4-05-mutex.md` 18. Same-series `part4-02`/`part4-04` and case study exact ranges reviewed; D 10→11 concern in old score report (preliminary says dropped to 10, source current D evidence confirms overlap).
- F: 273 next Spinlock performance = public order33 `part4-04-spinlock.md`; 277–279 labels target order31/33/34 files. 169 “4-06” is bare textual reference, no hyperlink.
- Factcheck: internal arithmetic 94, 49–50, 256–259 reconciles to definitions. Thresholds (<5%, >20%), 30% write threshold, Linux/FreeRTOS tool commands and benchmark values need kernel/API/runtime evidence. 239 “32-bit aligned read atomic” is architecture/compiler/platform specific—official docs needed, not assumed.

## 10. `part4-04-spinlock.md`
- `source_file`: `src/content/blog/embedded/performance-engineering/part4-04-spinlock.md`, read 1–283 full.
- A–G: A(24–38,40–143,145–185,187–214) algorithms and comparison. B(40–143,155–214,254–266) broad flow; pseudocode/kernel-specific statements need scope. C(254–266) table names Cortex-A72 but lacks build/run/method. D below. E title and ticket/MCS terms occur, with no quantified comparison procedure. F(277–283) next and labels. G no primary citations.
- D pairs: spin vs sleep 24–38 ↔ Recipes `part9-07-spinlock-vs-mutex.md` 22–46; TTAS 71–87, ticket 89–111, MCS/qspinlock 113–143 ↔ RTOS `part4-08-spinlock-smp.md` approx 96–118·145–170·174–219; single-core issue 218–225 ↔ RTOS `part3-01-critical-section.md` 237–239; adaptive 187–202 ↔ same-series `part4-05-mutex.md` 63–78. D 5 rationale: duplicated concepts dominate; only wait table and Zephyr example stand apart.
- F: 277 next Mutex performance = public order34 `part4-05-mutex.md`; 281–283 links 4-03/4-05/RTOS 3-01 all resolve; trailing description absent.
- Factcheck: no source-internal decisive contradiction found. 18–38 cycle thresholds, “MCS bus traffic 0”, Linux qspinlock algorithm/version, IRQ-save semantics, Cortex-M SMP device examples, YIELD SMT/power behavior, 10µs benchmark transition need official kernel/ISA/Zephyr sources or runnable benchmarks. MCS code/pseudocode should not be treated as a compilable implementation without atomic memory orders.

## 범위/보존

- 이번 루프에서 대상 원문, 정식 published-loop report, 사용자가 수정 중인 package/scripts/loop-01 파일을 수정하지 않았다. Evidence-20만 생성.
- 3-11에는 frontmatter `draft` 속성이 없어 공개 상태는 기존 공개 queue/report로 확인. 이 속성 누락만으로 비공개라 판정하지 않았다.
- 점수 재평가/정식 factcheck 오류 확정은 Sol 소관이다. 사용한 범위 밖: cited external primary source 재열람, 모든 snippet을 실제 toolchain/target으로 실행, 렌더링/사이트 광고 suitability.
