# Embedded Performance Engineering Part 1 remediation (2026-10-22)

Nine assigned files (introduction + Part 1-01 through 1-08) were reviewed against the published-loop notes and primary references. `status` is `remediated` for all nine because the confirmed claims/examples were corrected. This does not mean the target hardware paths were executed.

## Per-article evidence

Each disposition contains the required eight fields.

### 00 — src/content/blog/embedded/performance-engineering/00-preface.md
- **Status / SHA:** `remediated`; before `489caa216cfa6ef4a244f7ef2ee189350dd0f0778de289e6e1be3ed4c23ecbee`, after `d4c0cb6ac6b08ec7a3dffee308b757eead96c695b885efe679fe0e8a02b4af3f`.
- **맥락과 범위:** "Embedded Performance Engineering — 임베디드 성능 엔지니어링 시리즈 소개"; scope: src/content/blog/embedded/performance-engineering/00-preface.md; series order 0.
- **신호와 반증:** 시리즈 길이와 Part 3/5/6의 편수가 파일 실재 개수와 달랐다.
- **원인과 대안:** 57개 markdown 파일을 세어 56개 numbered article과 소개 1편을 확인했다.
- **근거:** Local exact inventory of 57 series Markdown files and series-order frontmatter.
- **표본 범위:** 전체 article 본문, frontmatter, 관련 named fences를 비교했다. 기사 내 markdown 예제를 추출하여 host에서 검증할 수 있는 fencing/model을 실행했다. ARM object compile과 physical board/WCET runtime은 하지 않았으며 이를 target 검증으로 표기하지 않았다.
- **결정:** 소개 글의 총편수와 세 part의 편수 및 누락된 Part 3-12, 5-11, 6-05 목차 행을 정정했다.
- **최소 안전 변경과 rollback:** 해당 글의 확인된 문장·예제와 필요한 단일 saturation SVG source/output만 정정했다. 모든 article의 slug/date/series/seriesOrder/draft 보존. 되돌림 범위는 이 파일 diff; 점수 원장/loop ledger 수정 없음.
- **검증과 잔여 위험:** part1 verifier의 파일 수·각 Part count 검사와 article gate 통과. 날짜·slug·seriesOrder 유지. Target-specific PMU/DWT/RTOS/Linux runtime, ARM object, simulator and board WCET are unverified. Publish-gate upstream-symbol check is SKIPPED because external source clones are absent; SKIPPED is not PASS.

### 01 — src/content/blog/embedded/performance-engineering/part1-01-methodology.md
- **Status / SHA:** `remediated`; before `a0d7b124a1e2d1b49dd76c4d3f7ba5d687314ef1d382f3a267b66e6e136761f2`, after `b91cd3d1f667b428a8134f1413575637dd62caf10876326df1c07a0ca15c8f4d`.
- **맥락과 범위:** "임베디드 성능 분석 방법론 — Measure → Analyze → Optimize 사이클"; scope: src/content/blog/embedded/performance-engineering/part1-01-methodology.md; series order 1.
- **신호와 반증:** 80% 개발자 오추정, 병목 비율 40/25/15/10/5/5, cache/ISR 등에 USE 일괄 적용, cycle만으로 함수 실행시간을 보장하는 표현이 근거 없이 일반화됐다.
- **원인과 대안:** USE는 자원에 따라 지표 정의가 달라지고 병목 분포는 시스템별이라는 Gregg의 정의 및 Arm PMU 이벤트 가용성 문서를 대조했다.
- **근거:** [Brendan Gregg USE Method](https://www.brendangregg.com/usemethod.html); [Arm PMU overview](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/profile-firmware-with-performance-monitor-unit-in-armv8-a-cpu).
- **표본 범위:** 전체 article 본문, frontmatter, 관련 named fences를 비교했다. 기사 내 markdown 예제를 추출하여 host에서 검증할 수 있는 fencing/model을 실행했다. ARM object compile과 physical board/WCET runtime은 하지 않았으며 이를 target 검증으로 표기하지 않았다.
- **결정:** 인구/병목 비율을 제거하고 USE 적용 범위를 제한했다. Roofline preview에서 peak FLOPS와 BW×OI를 비교하도록 수정했다.
- **최소 안전 변경과 rollback:** 해당 글의 확인된 문장·예제와 필요한 단일 saturation SVG source/output만 정정했다. 모든 article의 slug/date/series/seriesOrder/draft 보존. 되돌림 범위는 이 파일 diff; 점수 원장/loop ledger 수정 없음.
- **검증과 잔여 위험:** 본문 전문, 공개 PMU 자료 및 named example verifier·gate를 확인; PMU/hardware runtime은 실행하지 않았다. Target-specific PMU/DWT/RTOS/Linux runtime, ARM object, simulator and board WCET are unverified. Publish-gate upstream-symbol check is SKIPPED because external source clones are absent; SKIPPED is not PASS.

### 02 — src/content/blog/embedded/performance-engineering/part1-02-metrics.md
- **Status / SHA:** `remediated`; before `27e604315404d4bc82787c02b264a017b060dc3809de10fed59e1fb3bd970a19`, after `2d06d2daf8c5f25b2d42f2885efb4586d1aab43610a10c9c463506d5f1be0b68`.
- **맥락과 범위:** "성능 지표 정의 — Latency·Throughput·Utilization 분석"; scope: src/content/blog/embedded/performance-engineering/part1-02-metrics.md; series order 2.
- **신호와 반증:** 고정 80% queue threshold, IPC/cache/CoreMark universal scores, FreeRTOS tick count와 CYCCNT epoch 혼합, 64-bin에서 32/64-bit shifts UB가 결함 신호였다.
- **원인과 대안:** FreeRTOS absolute-delay API semantics, CoreMark run rules, arithmetic boundary analysis를 확인했다.
- **근거:** [FreeRTOS vTaskDelayUntil API](https://freertos.org/Documentation/02-Kernel/04-API-references/02-Task-control/02-vTaskDelayUntil); [EEMBC CoreMark README](https://github.com/eembc/coremark/blob/main/README.md).
- **표본 범위:** 전체 article 본문, frontmatter, 관련 named fences를 비교했다. 기사 내 markdown 예제를 추출하여 host에서 검증할 수 있는 fencing/model을 실행했다. ARM object compile과 physical board/WCET runtime은 하지 않았으며 이를 target 검증으로 표기하지 않았다.
- **결정:** Utilization universal threshold와 칩 점수를 제거/한정하고 phase error sample을 cumulative counter로 바꿨다. 32-bin uint32 bucket helper로 경계를 안전하게 처리했다.
- **최소 안전 변경과 rollback:** 해당 글의 확인된 문장·예제와 필요한 단일 saturation SVG source/output만 정정했다. 모든 article의 slug/date/series/seriesOrder/draft 보존. 되돌림 범위는 이 파일 diff; 점수 원장/loop ledger 수정 없음.
- **검증과 잔여 위험:** Clang host C compile/run: 0,1,2,UINT32_MAX 경계 통과; target FreeRTOS timing과 보드 clock/tick calibration은 미실행. Target-specific PMU/DWT/RTOS/Linux runtime, ARM object, simulator and board WCET are unverified. Publish-gate upstream-symbol check is SKIPPED because external source clones are absent; SKIPPED is not PASS.

### 03 — src/content/blog/embedded/performance-engineering/part1-03-measurement.md
- **Status / SHA:** `remediated`; before `c13c7ce252f038048377441565f6a5b3529277739ad7fc53836c08681d57f43e`, after `b6742e6dede5914788a491264be6a59c5da2834807f4e2bec3852f3212391d57`.
- **맥락과 범위:** "성능 측정의 기본 — Wall-Clock·CPU Cycle·Instruction Count"; scope: src/content/blog/embedded/performance-engineering/part1-03-measurement.md; series order 3.
- **신호와 반증:** CYCCNT를 함수 전용 실행 시간으로 취급, Cortex-M3+ 전 범위 내장 단정, 고정 측정 오버헤드, ETM/ITM 비침습성·지원 보장이 문제였다.
- **원인과 대안:** Arm processor datasheet와 PMU 설명은 옵션·target 의존 기능임을 확인한다.
- **근거:** [Arm Cortex-M7 datasheet](https://developer.arm.com/documentation/100166/latest/); [Arm PMU overview](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/profile-firmware-with-performance-monitor-unit-in-armv8-a-cpu).
- **표본 범위:** 전체 article 본문, frontmatter, 관련 named fences를 비교했다. 기사 내 markdown 예제를 추출하여 host에서 검증할 수 있는 fencing/model을 실행했다. ARM object compile과 physical board/WCET runtime은 하지 않았으며 이를 target 검증으로 표기하지 않았다.
- **결정:** DWT/PMU/ETM/GPIO 비용을 target별 확인 항목으로 바꾸고 fixed-cycle 표를 제거했다.
- **최소 안전 변경과 rollback:** 해당 글의 확인된 문장·예제와 필요한 단일 saturation SVG source/output만 정정했다. 모든 article의 slug/date/series/seriesOrder/draft 보존. 되돌림 범위는 이 파일 diff; 점수 원장/loop ledger 수정 없음.
- **검증과 잔여 위험:** 전체 본문과 공식 Arm 자료 검토; host toolset만 있고 ARM cross-object·target board 측정은 실행하지 않았다. Target-specific PMU/DWT/RTOS/Linux runtime, ARM object, simulator and board WCET are unverified. Publish-gate upstream-symbol check is SKIPPED because external source clones are absent; SKIPPED is not PASS.

### 04 — src/content/blog/embedded/performance-engineering/part1-04-statistics.md
- **Status / SHA:** `remediated`; before `ceef2391cec6cd8b2a248121aaef7fc7f08d81bc94cc30d9ec9bca244f8545f7`, after `41a837dc91207ec1a617e512406cdbcf0146776e98cd952ef745e6997863c79d`.
- **맥락과 범위:** "성능 데이터 통계적 분석 — Percentile·Histogram·평균의 함정"; scope: src/content/blog/embedded/performance-engineering/part1-04-statistics.md; series order 4.
- **신호와 반증:** p99를 보편 표준/하드 real-time max를 표본 보장으로 서술, fixed N=1000 신뢰 주장, 64-bin 1u<<63 및 출력 shift UB가 문제였다.
- **원인과 대안:** HdrHistogram footprint가 범위/자릿수 설정에 의존하며 p99 tail sample count는 N에 의존한다. C unsigned shift 경계는 host compiler/runtime으로 재현했다.
- **근거:** [HdrHistogram source and configuration](https://github.com/HdrHistogram/HdrHistogram).
- **표본 범위:** 전체 article 본문, frontmatter, 관련 named fences를 비교했다. 기사 내 markdown 예제를 추출하여 host에서 검증할 수 있는 fencing/model을 실행했다. ARM object compile과 physical board/WCET runtime은 하지 않았으며 이를 target 검증으로 표기하지 않았다.
- **결정:** 통계 목표를 요구사항/표본 수에 연결하고 histogram을 uint32 32-bin helper로 교체했다.
- **최소 안전 변경과 rollback:** 해당 글의 확인된 문장·예제와 필요한 단일 saturation SVG source/output만 정정했다. 모든 article의 slug/date/series/seriesOrder/draft 보존. 되돌림 범위는 이 파일 diff; 점수 원장/loop ledger 수정 없음.
- **검증과 잔여 위험:** Named C fence host compile/run 통과; negative fixture에서 잘못된 bucket expectation 실패. HdrHistogram 라이브러리 실행은 없음. Target-specific PMU/DWT/RTOS/Linux runtime, ARM object, simulator and board WCET are unverified. Publish-gate upstream-symbol check is SKIPPED because external source clones are absent; SKIPPED is not PASS.

### 05 — src/content/blog/embedded/performance-engineering/part1-05-realtime.md
- **Status / SHA:** `remediated`; before `25f8bd87db0b51dd3a51b334859595f4c99c985b10b61c74fd722865dc7caa57`, after `545acd9f179bfaed6dd051d23802b0038f17dea83ea497e92e883da66e776f24`.
- **맥락과 범위:** "실시간 성능 분석 — WCET·Jitter·Deadline Miss 측정"; scope: src/content/blog/embedded/performance-engineering/part1-05-realtime.md; series order 5.
- **신호와 반증:** 표본 최대×1.2–1.5를 WCET로 부르는 것, task 실행시간+delay를 jitter로 측정, 매 반복 현재 tick으로 deadline 갱신, cyclictest를 worst-case proof로 표현한 부분이 결함 신호였다.
- **원인과 대안:** Liu–Layland 원 논문 모델 전제, FreeRTOS delay semantics, Linux PREEMPT_RT/rtla 문서가 분석·측정의 범위를 뒷받침한다.
- **근거:** [Liu & Layland original paper](https://web.cs.wpi.edu/~cs3013/a09/Papers/Liu%20%26%20Layland%2C%20Real-time%20Scheduling.pdf); [Linux PREEMPT_RT theory](https://docs.kernel.org/core-api/real-time/theory.html); [Linux RT configuration](https://docs.kernel.org/next/core-api/real-time/kernel-configuration.html); [rtla timerlat hist](https://docs.kernel.org/tools/rtla/rtla-timerlat-hist.html); [FreeRTOS delay API](https://freertos.org/Documentation/02-Kernel/04-API-references/02-Task-control/02-vTaskDelayUntil).
- **표본 범위:** 전체 article 본문, frontmatter, 관련 named fences를 비교했다. 기사 내 markdown 예제를 추출하여 host에서 검증할 수 있는 fencing/model을 실행했다. ARM object compile과 physical board/WCET runtime은 하지 않았으며 이를 target 검증으로 표기하지 않았다.
- **결정:** observed max/model bound 구분, scheduled-release phase sample, 고정 release 기준 deadline check를 제시하고 RTA에 blocking term을 포함했다. 공통 RTOS load는 observed load와 target WCET proof를 구별하도록 했다.
- **최소 안전 변경과 rollback:** 해당 글의 확인된 문장·예제와 필요한 단일 saturation SVG source/output만 정정했다. 모든 article의 slug/date/series/seriesOrder/draft 보존. 되돌림 범위는 이 파일 diff; 점수 원장/loop ledger 수정 없음.
- **검증과 잔여 위험:** Host C model의 sample max, deadline 경계(정확 deadline 통과/초과) 통과. FreeRTOS, Linux cyclictest, RTOS task/board WCET 실행 없음. Target-specific PMU/DWT/RTOS/Linux runtime, ARM object, simulator and board WCET are unverified. Publish-gate upstream-symbol check is SKIPPED because external source clones are absent; SKIPPED is not PASS.

### 06 — src/content/blog/embedded/performance-engineering/part1-06-benchmark.md
- **Status / SHA:** `remediated`; before `2818be4e153c3ef26db44a03978f13b0e1d8abc433d4ec81780baf3f5f963645`, after `e2553524a271ed74d23b8737484ce03ca5347929d3b101fdd4289e8b417dcb21`.
- **맥락과 범위:** "임베디드 벤치마킹 기초 — 재현성·Warmup·노이즈 제거"; scope: src/content/blog/embedded/performance-engineering/part1-06-benchmark.md; series order 6.
- **신호와 반증:** N=100, warmup 10–100, ±5%, generic CoreMark/MHz and fixed device scores were stated as universal benchmark rules/results.
- **원인과 대안:** EEMBC CoreMark primary README requires validation, run duration, common flags and target-specific reporting; barebones port notes benchmark may fit L1.
- **근거:** [EEMBC CoreMark README/run rules](https://github.com/eembc/coremark/blob/main/README.md); [barebones port guidance](https://github.com/eembc/coremark/blob/main/barebones_porting.md).
- **표본 범위:** 전체 article 본문, frontmatter, 관련 named fences를 비교했다. 기사 내 markdown 예제를 추출하여 host에서 검증할 수 있는 fencing/model을 실행했다. ARM object compile과 physical board/WCET runtime은 하지 않았으며 이를 target 검증으로 표기하지 않았다.
- **결정:** Universal cutoffs and unverified device scores were removed; CoreMark comparison conditions, validation, and memory-footprint limits are stated.
- **최소 안전 변경과 rollback:** 해당 글의 확인된 문장·예제와 필요한 단일 saturation SVG source/output만 정정했다. 모든 article의 slug/date/series/seriesOrder/draft 보존. 되돌림 범위는 이 파일 diff; 점수 원장/loop ledger 수정 없음.
- **검증과 잔여 위험:** 본문/공식 EEMBC run rules 확인. CoreMark binary/device run is not performed; no ARM object or board score generated. Target-specific PMU/DWT/RTOS/Linux runtime, ARM object, simulator and board WCET are unverified. Publish-gate upstream-symbol check is SKIPPED because external source clones are absent; SKIPPED is not PASS.

### 07 — src/content/blog/embedded/performance-engineering/part1-07-modeling.md
- **Status / SHA:** `remediated`; before `1f29fb4b4915e95ad45153f5764ff051c0986b31e0e931d580b8411f06fcce6b`, after `c8821523247b4b65ec40e0e180a48184fbf1de918ae797a54aa7a97f69db1508`.
- **맥락과 범위:** "성능 모델링 — Amdahl·Gustafson·Roofline Model 적용"; scope: src/content/blog/embedded/performance-engineering/part1-07-modeling.md; series order 7.
- **신호와 반증:** OI omitted specified hierarchy; STREAM scalar multiply traffic and naive matmul bytes were wrong/underspecified; Roofline lower-bound wording and independent path claims overreached.
- **원인과 대안:** Roofline primary paper defines arithmetic intensity using data transfer and an applicable memory level; simple STREAM example assumes 2 float loads+1 store before target-specific effects.
- **근거:** [Williams, Waterman & Patterson, Roofline paper](https://escholarship.org/uc/item/5tz795vq).
- **표본 범위:** 전체 article 본문, frontmatter, 관련 named fences를 비교했다. 기사 내 markdown 예제를 추출하여 host에서 검증할 수 있는 fencing/model을 실행했다. ARM object compile과 physical board/WCET runtime은 하지 않았으며 이를 target 검증으로 표기하지 않았다.
- **결정:** OI includes byte traffic at specified level; STREAM assumption is 12 bytes/element plus explicit caveats; matmul has no fixed traffic; scaling/budget values marked illustrative.
- **최소 안전 변경과 rollback:** 해당 글의 확인된 문장·예제와 필요한 단일 saturation SVG source/output만 정정했다. 모든 article의 slug/date/series/seriesOrder/draft 보존. 되돌림 범위는 이 파일 diff; 점수 원장/loop ledger 수정 없음.
- **검증과 잔여 위험:** Formula and source review; model arithmetic only. No target counter/memory bandwidth or ARM object measurement. Target-specific PMU/DWT/RTOS/Linux runtime, ARM object, simulator and board WCET are unverified. Publish-gate upstream-symbol check is SKIPPED because external source clones are absent; SKIPPED is not PASS.

### 08 — src/content/blog/embedded/performance-engineering/part1-08-profiling-overview.md
- **Status / SHA:** `remediated`; before `1d3f39683b9d1f98983a676d6a8d69ee3b1a5b5e5c5182d7c1c397d2e25210ef`, after `a28ecdad5efc064682344f60a01c93c0f7c260660533b5c3152f32085822db4b`.
- **맥락과 범위:** "프로파일링 기법 개요 — Sampling vs Instrumentation·PGO·LTO"; scope: src/content/blog/embedded/performance-engineering/part1-08-profiling-overview.md; series order 8.
- **신호와 반증:** perf default frequency, fixed overhead, “accurate” instrumentation, `-pg` generating `__cyg_profile_func_*`, eBPF bytecode injection, and fixed PGO/LTO uplift claims were incorrect or overbroad.
- **원인과 대안:** GCC official docs distinguish `-pg` gprof profiling from function instrumentation and PGO; perf manual makes sampling rate configurable.
- **근거:** [GCC instrumentation options](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html); [Linux perf-record manual](https://man7.org/linux/man-pages/man1/perf-record.1.html).
- **표본 범위:** 전체 article 본문, frontmatter, 관련 named fences를 비교했다. 기사 내 markdown 예제를 추출하여 host에서 검증할 수 있는 fencing/model을 실행했다. ARM object compile과 physical board/WCET runtime은 하지 않았으며 이를 target 검증으로 표기하지 않았다.
- **결정:** Corrected hook flag explanation, qualified sampling/probe overhead, removed fixed gains, updated confirmed description metadata only.
- **최소 안전 변경과 rollback:** 해당 글의 확인된 문장·예제와 필요한 단일 saturation SVG source/output만 정정했다. 모든 article의 slug/date/series/seriesOrder/draft 보존. 되돌림 범위는 이 파일 diff; 점수 원장/loop ledger 수정 없음.
- **검증과 잔여 위험:** Named GCC hook C fence compiles as host object. Linux perf, gprof, eBPF and PGO runtime were not executed. Target-specific PMU/DWT/RTOS/Linux runtime, ARM object, simulator and board WCET are unverified. Publish-gate upstream-symbol check is SKIPPED because external source clones are absent; SKIPPED is not PASS.

## Validation and scope
- `node scripts/verify-performance-engineering-part1-examples.mjs` — named article C fences compiled/executed with host Clang; tested zero/one/two/UINT32_MAX bins, observed maximum vs unseen path, deadline exact-boundary vs miss; intentionally wrong bucket assertion rejected. GCC function-hook example compiled to host object.
- `bash scripts/audit-publish-gate.sh <article>` — executed separately for all nine files. Blocking gates pass. A low-confidence Korean translationese soft flag remains on 1-05 and is recorded in the gate log. Upstream cited-symbol checks are `SKIPPED` because clones are unavailable; this is not PASS.
- `node scripts/check-inline-math.mjs <nine paths>` — PASS. `git diff --check` — PASS for owned article/assets/script/report changes.
- Checks are host logic models/static content checks. No ARM cross-compiled object, simulator, Linux perf/cyclictest, FreeRTOS execution, board run, physical PMU/DWT measurement, or WCET proof was performed.
- Metadata: URL/slug, publication date, series order and draft fields preserved. Only the confirmed inaccurate description on 1-08 was corrected. The intro counts were matched against the 57 series markdown files. Scores and published-loop score ledgers were not edited.
- Queue: Postmortem 05/06 remain unassessed and are not counted complete; Performance Part 2+ awaits assignment; RTOS part1-07~10 spacing-only cleanup is queued but not performed in this batch.
