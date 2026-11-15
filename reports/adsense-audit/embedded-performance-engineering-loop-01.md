# Embedded Performance Engineering — 루프 01

> 대상: 공개 글 10편 (`seriesOrder` 0~9)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 1회차 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 `src/content/blog/embedded/performance-engineering/`의 다음 10편이다.

`00-preface.md`, `part1-01-methodology.md`~`part1-08-profiling-overview.md`, `part2-01-pipeline.md`.

모두 `draft: true`가 아닌 공개 글이다. 원문, slug, date, seriesOrder는 변경하지 않았다. 이 시리즈에는 기존 루프 보고서가 없어 새 보고서로 기록한다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `00-preface.md` | 15 | 16 | 4 | 13 | 8 | 8 | 3 | **67** | 미검증 | 보강 |
| `part1-01-methodology.md` | 13 | 11 | 5 | 11 | 8 | 7 | 1 | **56** | 미검증 | 병합 검토 |
| `part1-02-metrics.md` | 14 | 15 | 6 | 10 | 8 | 7 | 0 | **60** | 미검증 | 보강 |
| `part1-03-measurement.md` | 15 | 15 | 8 | 11 | 8 | 7 | 0 | **64** | 미검증 | 보강 |
| `part1-04-statistics.md` | 14 | 15 | 6 | 11 | 8 | 7 | 2 | **63** | 미검증 | 보강 |
| `part1-05-realtime.md` | 16 | 16 | 7 | 11 | 8 | 7 | 0 | **65** | 미검증 | 보강 |
| `part1-06-benchmark.md` | 15 | 16 | 7 | 10 | 8 | 7 | 3 | **66** | 미검증 | 보강 |
| `part1-07-modeling.md` | 16 | 16 | 7 | 12 | 8 | 7 | 0 | **66** | 미검증 | 보강 |
| `part1-08-profiling-overview.md` | 16 | 16 | 7 | 11 | 8 | 7 | 0 | **65** | 미검증 | 보강 |
| `part2-01-pipeline.md` | 17 | 16 | 7 | 12 | 8 | 7 | 0 | **67** | 미검증 | 보강 |

평균은 **63.9점**이다. 80점 이상 글은 없고, `factcheck: 검증됨` 글도 없다. `00-preface.md`의 본문은 시리즈 허브로서 보강 판정으로 두었다.

## 공통 문제

- 본문에 공식 1차 자료가 직접 연결된 글이 거의 없다. 참고 링크가 있는 허브와 일부 벤치마크 글도 주장별 연결은 약하다. G는 본문에 연결된 출처만 반영했다.
- 측정 코드와 예시 표가 있으나 대상 보드·코어·컴파일 조건·입력·관측 결과가 없는 글이 많다. 실행하지 않은 결과는 factcheck나 C 점수의 근거로 사용하지 않았다.
- `N=100`, `80%`, 병목 비율, `p99`·`max`의 보편적 우선순위처럼 출처 없는 임계값과 분포 주장이 반복된다. 완곡 표현으로 바꾸지 않고 후속 수정 때 1차 자료 확인 또는 삭제 대상으로 남긴다.
- 시리즈 전체가 `한 줄 요약 → 개념 → 측정/함정 → 정리 → 관련 항목` 구조를 반복한다. 글마다 독립 질문은 있으나 템플릿 반복은 D와 사이트 단위 scaled-content 검토에 기록한다.
- 허브는 `총 6개 Part, 53개 글`(00-preface L62)이라고 안내하지만 현재 공개 파일은 57편이다. 이는 factcheck가 아니라 허브 편수·탐색성 결함으로 F에 반영할 후속 항목이다.

## 글별 근거

### `00-preface.md` — 67점, 보강

- A 15: 대상 독자(L45~58), 학습 로드맵(L175~179), 측정 원칙(L181~204)이 시리즈의 독립적인 안내 가치를 만든다. 다만 성능 분석 일반론이 많다.
- B 16: 시리즈 목적·독자·Part별 목록·사전 지식·레퍼런스·목표(L14~257)가 이어져 허브로서 완결성이 있다.
- C 4: 무엇을 측정할지와 도구를 나열하지만 특정 환경에서 재현할 측정 절차나 결과는 없다.
- D 13: 개별 글을 대체하는 종합 설명은 일부 있지만 허브의 로드맵 역할이 분명하다. 인접 글 `part1-01-methodology.md`와 공통 원칙이 겹친다.
- E 8: 제목과 시리즈 소개 목적은 일치한다. `모든 것`에 가까운 description은 실제 범위보다 넓다.
- F 8: Part 목록과 다음 글 링크(L257)가 허브 탐색을 제공한다. 편수 표기가 실제 공개 글 수와 다르다.
- G 3: 레퍼런스 목록(L219~240)은 있으나 각 주장과 직접 연결된 인라인 출처는 부족하다.
- `anchor_ref`: `part12-10-on-device-llm.md` 앵커의 허브가 아닌 고득점 본문 구조와 비교했다.
- `uncertainties`: 53편 안내가 draft 포함 계획인지 공개 글 수인지 운영상 의도는 확인하지 않았다.

### `part1-01-methodology.md` — 56점, 병합 검토

- A 13: USE·RED·측정→가설→검증 흐름과 임베디드 자원 표(L25~96)가 있으나 핵심 방법론은 허브·인접 글과 반복된다.
- B 11: 개념, 측정 코드, 함정, Roofline 예고까지 흐름은 있으나 대상 환경과 검증 결과가 없다.
- C 5: DWT·PMU 코드 골격(L74~96)은 실행 조건과 기대 관찰이 부족하다. `L1D_CACHE_REFILL`은 대상 PMU 확인 없이 일반화되어 있다.
- D 11: `part1-02-metrics.md`, `part1-03-measurement.md`, `part1-06-benchmark.md`의 측정·분포·벤치마크 설명과 겹친다.
- E 8: 제목의 Measure→Analyze→Optimize 흐름을 본문이 대체로 수행한다.
- F 7: 다음 편과 관련 글(L181~187)은 실제 대상과 맞지만, 공통 템플릿을 제외하면 고유 구조가 제한적이다.
- G 1: 본문 출처가 사실상 Brendan Gregg 링크 하나이고, 다른 기술 주장에는 버전·문서 연결이 없다.
- `uncertainties`: 본문의 USE·RED 적용 범위와 PMU event 의미는 1차 자료 대조 전이다.

### `part1-02-metrics.md` — 60점, 보강

- A 14: latency·throughput·utilization을 service/response time, jitter, deadline, saturation과 연결한다(L17~169).
- B 15: 정의→상호 의존→분포→추가 지표→측정 예→실수→정리 흐름이 있다.
- C 6: 수식과 측정 예(L193~225)는 있으나 실행 환경·관측 결과·출처가 없다.
- D 10: `part1-01-methodology.md`, `part1-04-statistics.md`, `part1-05-realtime.md`와 지표·분포·deadline 설명이 겹친다.
- E 8: 제목의 세 지표와 본문 범위가 맞는다.
- F 7: 다음 편과 관련 항목(L255~261)은 맞지만 고유한 탐색 장치는 없다.
- G 0: 본문 외부 URL이 없고 수식·임계값의 출처 연결도 없다.
- `uncertainties`: `80% 한계`(L63), `90%+` 포화 예시(L51~55)가 보편 기준인지 예시인지 확인하지 않았다.

### `part1-03-measurement.md` — 64점, 보강

- A 15: wall-clock·cycle·instruction count·DWT·PMU·GPIO를 계층별로 비교한다(L17~225).
- B 15: bare-metal, Linux, x86, PMU, 외부 계측, tracing까지 범위가 완결된다.
- C 8: 각 계측 방식의 코드와 조건이 있어 재현 절차에 가깝지만 실제 측정 결과는 없다.
- D 11: `part1-01-methodology.md`, `part1-08-profiling-overview.md`와 도구·프로파일링 설명이 겹친다.
- E 8: 제목이 약속한 세 측정 단위를 모두 다룬다.
- F 7: 다음 편과 관련 글(L266~272)은 맞지만 관련 글 중 일부는 뒤의 다른 Part에 있다.
- G 0: 본문에 1차 문서 링크가 없다. DWT·PMU·RDTSC·ETM 설명 모두 버전이 없다.
- `uncertainties`: `Cortex-M3+`, `DWT 없음`, `32-bit @ 168 MHz` wrap 설명(L58~75)과 `ITM 32 channel`(L219)은 대상 문서 대조 전이다.

### `part1-04-statistics.md` — 63점, 보강

- A 14: percentile·histogram·HdrHistogram·coordinated omission을 임베디드 fixed bucket과 연결한다(L31~153).
- B 15: 평균의 함정부터 sample size·box plot·sustained load까지 기본 흐름이 있다.
- C 6: histogram 코드와 예시는 있으나 실행 환경·입력·관측 결과가 없다.
- D 11: `part1-02-metrics.md`, `part1-05-realtime.md`와 percentile·long tail·deadline 판단이 겹친다.
- E 8: 제목과 분포 분석 내용은 일치한다.
- F 7: 다음 편·관련 항목이 실제 파일을 가리킨다. 본문 고유 탐색성은 제한적이다.
- G 2: HdrHistogram 링크와 한 개의 추가 자료는 있으나 주장별 연결이 약하다.
- `uncertainties`: `1 µs~60 s`, 3자리 정밀도, 수십 KB(L77), capacity knee 80%(L180)의 조건·출처를 확인하지 않았다.

### `part1-05-realtime.md` — 65점, 보강

- A 16: static/measurement-based/hybrid/pWCET를 구분하고 jitter·tardiness·schedulability를 연결한다(L29~171).
- B 16: WCET 방법, deadline miss, cyclictest, budget, hard/soft RT, RTA까지 질문 범위가 넓고 결론이 있다.
- C 7: 절차와 수식은 있으나 보드·커널·입력·관측 결과가 없다.
- D 11: `part1-02-metrics.md`, `part1-04-statistics.md`, `Practical RTOS Internals 1-10`과 중복 가능성이 있다. 직접 대응할 줄 비교는 후속 double-check에서 필요하다.
- E 8: 제목의 WCET·jitter·deadline을 모두 다룬다.
- F 7: 다음 편과 RTOS 관련 글 링크(L227~233)가 맞다.
- G 0: 본문 1차 자료 링크가 없다. Liu–Layland·cyclictest·Linux RT 주장이 버전·문서 없이 제시된다.
- `uncertainties`: `max ≤ deadline`을 hard RT의 충분조건처럼 읽을 수 있는 표현과 pWCET·RTA 설명을 1차 자료로 대조하지 않았다.

### `part1-06-benchmark.md` — 66점, 보강

- A 15: warmup·isolation·micro/system benchmark·comparative benchmark를 임베디드 관점으로 묶는다(L17~208).
- B 16: 조건, 도구, CoreMark/Dhrystone/SPEC, 코드 제거 함정, 지속 벤치마크까지 흐름이 있다.
- C 7: 코드와 명령은 있으나 실행 결과와 특정 보드 조건이 없다.
- D 10: `part1-03-measurement.md`, `part1-04-statistics.md`와 측정·분포 설명이 겹친다.
- E 8: 제목의 재현성·warmup·노이즈 제거를 다룬다.
- F 7: 다음 편과 관련 링크가 맞다. `N=100+` 같은 고정 규칙은 탐색성 점수로 보상하지 않았다.
- G 3: CoreMark·Google Benchmark·Catch2 링크가 있으나 각 수치·권고와 연결되지 않는다.
- `uncertainties`: `WARMUP 10~100`, `N=100`, ±5% 안정성(L19~44)의 근거를 확인하지 않았다.

### `part1-07-modeling.md` — 66점, 보강

- A 16: Amdahl·Gustafson·Roofline·Little's Law·USL·cycle budget을 임베디드 성능 판단으로 연결한다(L17~158).
- B 16: 모델 정의와 예시, 적용·실수·정리까지 완결된다.
- C 7: 계산 예시는 있으나 실제 workload·측정값·모델 오차 검증이 없다.
- D 12: `part1-01-methodology.md`와 Roofline 예고가 겹치지만 이 글은 모델 공식과 적용을 맡는다.
- E 8: 제목에 나열한 모델을 모두 다룬다.
- F 7: 다음 편과 관련 글(L193~199)은 맞다.
- G 0: 본문에 1차 자료 링크가 없고 Amdahl·Gustafson·USL·Roofline의 판·출처가 없다.
- `uncertainties`: Roofline 예시의 peak/bandwidth 수치와 USL 파라미터 해석을 확인하지 않았다.

### `part1-08-profiling-overview.md` — 65점, 보강

- A 16: sampling/instrumentation/PGO/LTO를 Linux·RTOS 도구와 연결한다(L17~200).
- B 16: 도구 종류, output 해석, self/cumulative, micro/system benchmark까지 흐름이 완결된다.
- C 7: 명령과 출력 해석 절차는 있으나 실행 결과·환경·버전이 없다.
- D 11: `part1-03-measurement.md`, `part1-07-modeling.md` 및 후속 perf/flamegraph 글과 범위가 겹친다.
- E 8: 제목의 sampling·instrumentation·PGO·LTO를 모두 다룬다.
- F 7: Part 1 마무리와 다음 Part 안내(L259~273)는 기능한다.
- G 0: 본문 1차 출처 링크가 없고 perf·eBPF·ftrace·PGO·LTO의 버전과 문서 연결이 없다.
- `uncertainties`: `sampling은 가볍고 instrumentation은 무겁다`(L15), PGO 효과(L149), exclusive time 우선 최적화(L239)를 1차 자료와 대조하지 않았다.

### `part2-01-pipeline.md` — 67점, 보강

- A 17: MIPS·Cortex-M·Cortex-A를 pipeline depth, hazard, throughput/latency 관점으로 비교한다(L17~186).
- B 16: 모델별 설명, hazard, forwarding, IPC 측정, 함정과 결론이 이어진다.
- C 7: IPC 코드와 비교표가 있으나 대상 core revision·compiler·workload·실행 결과가 없다.
- D 12: 후속 `part2-02-pipeline-stall.md`, `part2-03-branch-prediction.md`와 주제가 분할되어 역할은 있다.
- E 8: 제목의 5-stage·Cortex-M·Cortex-A 비교를 수행한다.
- F 7: 다음 편과 관련 글(L227~232)은 맞다.
- G 0: 본문 1차 자료 링크와 core별 revision 표기가 없다.
- `uncertainties`: Cortex-M/A pipeline stage 수, Cortex-A53/A72 stage 수, Cortex-M4 forwarding과 IPC 예시(L41~176)를 Arm·MIPS 공식 문서로 대조하지 않았다.

## 덧붙인 내용

없음. 이번 루프에서는 원문에 내용을 추가하지 않았다.

## 더블 체크

이전 점수를 보지 않고 원문 줄 번호와 위 표를 다시 대조했다. 항목 합계는 모두 A~G 합과 일치한다. 직접 실행한 결과나 측정값은 점수 근거로 사용하지 않았다. 1차 자료를 실제로 대조한 글이 없어 `factcheck: 미검증`으로 유지했다. 이중 확인에서 새 안티패턴 항목은 확정하지 않았다.

## 게이트

| 검사 | 결과 |
| --- | --- |
| `./scripts/audit-publish-gate.sh <file>` | 10편 모두 exit 0. 일부 파일은 upstream clone 부재로 symbol/freshness 검사가 `SKIPPED`; 이를 통과로 해석하지 않음 |
| `node scripts/check-inline-math.mjs <file>` | 10편 모두 통과 |

## 다음 조치

다음 회차에서 90점 미만 글의 수정이 승인되면 글별로 1차 자료를 확인한 뒤 unsupported 수치·보편 기준을 삭제하거나 출처를 붙인다. 현재는 수정 승인 전이므로 원문을 바꾸지 않는다. 측정값이 필요한 글은 수정 루프 뒤 별도 측정 요청서를 만든다.
