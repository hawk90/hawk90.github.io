# 공개 글 AdSense 평가 — 루프 18

> 대상: 공개 글 10편 (Embedded Performance Engineering, `seriesOrder` 4~13)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 열여덟 번째 루프다. 대상은 `src/content/blog/embedded/performance-engineering/`의 `part1-04-statistics.md`~`part2-05-cache-basics.md` 10편(seriesOrder 4~13)이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part1-04-statistics.md` | 11 | 11 | 6 | 9 | 7 | 6 | 2 | **52** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part1-05-realtime.md` | 9 | 10 | 6 | 4 | 6 | 6 | 1 | **42** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part1-06-benchmark.md` | 8 | 9 | 5 | 9 | 6 | 6 | 2 | **45** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part1-07-modeling.md` | 9 | 9 | 5 | 8 | 6 | 6 | 1 | **44** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part1-08-profiling-overview.md` | 8 | 9 | 5 | 8 | 6 | 6 | 1 | **43** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part2-01-pipeline.md` | 9 | 9 | 5 | 8 | 5 | 5 | 1 | **42** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part2-02-pipeline-stall.md` | 10 | 10 | 5 | 6 | 6 | 6 | 1 | **44** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part2-03-branch-prediction.md` | 9 | 10 | 5 | 10 | 5 | 6 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part2-04-speculative-execution.md` | 10 | 10 | 5 | 9 | 5 | 6 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part2-05-cache-basics.md` | 9 | 10 | 5 | 9 | 7 | 6 | 1 | **47** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |

평균 45.1점(10편 합 451), 범위 42~52점이다. 판정은 10편 모두 우선 조치이고 보강·병합 검토·유지·검증 대기·제외 검토는 없다. 점수 구간으로는 10편 모두 병합 검토(40~59)다. 오류 확인은 10편이고 모두 원문 내부 모순(루브릭 3-1: 코드 vs 출력, 예시 수치 vs 산문, 같은 대상의 두 구체 진술)으로 판정했다. 1차 자료를 열어 확인한 오류는 없다. git log에는 10편 모두 1차 자료와 대조한 fact-check 커밋이 없어, 내부 모순이 없었더라도 `factcheck`는 미검증이다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체, 다음 편(seriesOrder+1)·관련 항목 대상 파일의 존재·제목·seriesOrder, 본문 그림 경로(2-01 39행, 2-04 48행, 2-05 29·36행), 같은 시리즈와 다른 시리즈의 같은 주제 글 대조까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `part1-04-statistics.md` | 52 | 52 | 0 | 없음 |
| `part1-05-realtime.md` | 42 | 42 | 0 | 없음 |
| `part1-06-benchmark.md` | 45 | 45 | 0 | 없음 |
| `part1-07-modeling.md` | 45 | 44 | -1 | 없음 |
| `part1-08-profiling-overview.md` | 43 | 43 | 0 | 없음 |
| `part2-01-pipeline.md` | 43 | 42 | -1 | 없음 |
| `part2-02-pipeline-stall.md` | 44 | 44 | 0 | 없음 |
| `part2-03-branch-prediction.md` | 46 | 46 | 0 | 없음 |
| `part2-04-speculative-execution.md` | 46 | 46 | 0 | 없음 |
| `part2-05-cache-basics.md` | 47 | 47 | 0 | 없음 |

1차 합 453에서 최종 451로 2점 내려갔다. 판정이 바뀐 글은 3편(1-04·1-05·1-06, 병합 검토 → 우선 조치)이다. 부풀림 표시는 없다.

- 추가한 오류 확인: 3편. 평가자가 uncertainties에 둔 수치 불일치를 AP-C-24('평가자가 본 내부 모순은 오류 확인으로 올린다')에 따라 올렸다.
  - 1-04: 89행 `if (us == 0) idx = 0;` vs 97행 `printf("%d-%d us: %u\n", 1<<i, (1<<(i+1))-1, hist[i])`. bucket 0에는 0 us 표본만 들어가는데 i=0 라벨은 '1-1 us'다.
  - 1-05: 177행 '실제: t=0.05, 5.12, 9.98, 15.30' vs 178행 'release jitter = 5.30 - 5.00 = 0.30 ms'. 5 ms 슬롯 실제값이 5.12와 5.30으로 다르다.
  - 1-06: 78행 '실은 95-110 ms 분포 (±5%)'. 폭 15 ms 범위는 어떤 중심값에서도 ±5%가 될 수 없다(100 ms 기준 -5%/+10%).
- 근거를 더한 오류 확인(이미 오류 확인이던 글): 2-01 52·222행 M3/M4 3-stage vs 145~146행 주석 'F D E M W' 5단계, 2-03 265행 '깊이만큼 손실' vs 20~22·27~29행 수치, 2-04 56행 `sub` vs 'p11 = p10 + p4', 2-05 55행 'Cortex-M4 cache 16 bytes' vs 184행 'Cortex-M0/M3/M4 없음'.
- 기각한 오류 확인 근거: 1-07의 '72행 코드는 b[i]·c[i]만 읽어 75행 load 3개와 맞지 않는다'. write-allocate로 a[i]를 읽는 것까지 세면 맞을 수 있어 캐시 동작 지식이 필요하므로 uncertainties로 옮겼다. 같은 근거 안의 원소 크기 충돌(75행 1 byte vs 77행 4 byte)은 유지해 1-07은 오류 확인 그대로다.
- 점수 변경: 1-07 D 9→8. 평가자가 든 비교 줄은 맞지만 cycle budget을 뺀 거의 모든 절(Amdahl·USL·Roofline·Little)이 뒤 글(part2-08·part4-03·part4-10·part6-03)에서 다시 정의된다. 2-01 E 6→5. 제목(2행)이 '분석'을 약속하는데 본문은 코어마다 단계 이름 한 줄과 두세 문장이라 루브릭 E '개념 소개 수준이면 3~5점' 상한을 넘었다(AP-C-24).
- 근거 정정(점수 영향 없음): 1-05 D의 RTOS part1-10 대응 줄(165~166·185~196·221~228행), 1-06 D의 modern-recipes part2-01 108~115행·part2-02 122~126행, 1-08 D의 part1-03 226~238행·part5-01 66~80행·part5-07 148~172행, 2-02 D의 part2-10 50~51행·part2-01 120~122행·part2-04 51~60행, 2-03 D의 part2-10 45~50·85·87~89행, 2-04 D의 part2-02 157~176행·part2-03 220~231행.
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. 감점은 2-01 140행 'branch prediction … 다음 편에서 다룹니다'(실제 다음 편은 seriesOrder 10 pipeline-stall) 한 건이다.

## 글별 근거

### `part1-04-statistics.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 89행 `if (us == 0) idx = 0;`은 bucket 0에 0 us 표본만 넣는데, 97행 `printf("%d-%d us: %u\n", 1<<i, (1<<(i+1))-1, hist[i])`는 i=0일 때 1<<0=1, (1<<1)-1=1이라 bucket 0을 '1-1 us'로 찍는다. 0 us 표본이 1 us로 보고되며 산술만으로 성립한다. git log(0a9dd7bc·be973200·ac24bb76·49f2a443·a746e269·4e66cbfc·3d56a230·845231cf·f3283f25·42ebbcbb)에는 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 평균 함정 예(19~29행), percentile 표(33~40행), 통계 지표 표(105~112행)는 일반 latency 입문 내용이다. 글 고유 요소는 log2 fixed-bucket 코드와 메모리 계산(83~101행), long tail 원인별 시그니처 표(141~149행)인데 출처가 없다. 37행 'user experience의 표준', 77행 'Web과 database benchmark의 표준', 180행 '보통 80% 근처'는 근거 없는 단정이고, 137행은 'HdrHistogram에 내장 지원'이라고만 해 방법이 없다. 6~12 구간. |
| B | 11 | 평균 함정→percentile→histogram→HdrHistogram→fixed-bucket→outlier→coordinated omission→sample size→box plot→실수→정리(17~206행) 흐름은 갖췄다. 101행 'p99와 max는 bucket을 누적해서 계산'은 코드 없는 한 문장이고, 129~137행 coordinated omission은 현상만 있다. 173~178행은 C로 표시했지만 `load = 10%` 같은 의사코드다. 89·97행 내부 모순과 90행 shift 등 정확성 불확실이 열려 있어 B ≤ 13(AP-C-24). |
| C | 6 | HdrHistogram 코드(63~75행)와 fixed-bucket 코드(83~98행)는 있지만 대상 MCU·컴파일러·라이브러리 버전·실행 출력이 없다. 19~27·48~55행 숫자는 설명용 가상 값이다. 77행 '수십 KB', 163·190행 '최소 N=1000', 180행 '보통 80%'는 출처·환경 없는 수치라 rubric 3-1 'C ≤ 8'을 적용했다. 합격·실패 관찰 절차가 없고, 그대로 쓰면 97행 출력이 bucket 0을 잘못 표시한다. 4~7 구간. |
| D | 9 | 같은 시리즈 part1-02-metrics.md 'Percentile 표기' 표(약 115~124행)는 이 글 33~40행과 행·의미가 같고, 42행 'Web은 p99, Real-time은 max'는 1-02의 'Hard는 max, Soft는 p99' 결론과 같다. 1-02 Long Tail 절(약 128~139행)은 이 글 139~151·206행과, 1-02 '평균만 보고 OK 판정'(약 230~232행)은 이 글 184~186행과 같다. part1-01-methodology.md 81·108행도 'p99·max가 중요'를 반복한다. 다른 시리즈 rtos/practical-internals/part2-10-scheduler-latency.md 190~207행은 bucket 배열 histogram 코드와 '평균이 아니라 long tail' 결론으로 이 글 83~101·202행과 겹친다. HdrHistogram·log2 bucket·coordinated omission(59~101·127~137행)은 이 글에만 있다. 5~9 구간. |
| E | 7 | 제목의 Percentile(31~42행)·Histogram(44~57·79~101행)·평균의 함정(17~29행), description의 p99·p999·max·long tail·HdrHistogram·fixed-bucket을 모두 본문에서 다룬다. 범위 불일치는 없다. 대상 독자와 결정 상황이 드러나지 않고 description '평균은 거짓말'은 구호라 9 이상은 아니다. |
| F | 6 | 208행 다음 편 안내(실시간 성능 분석)는 seriesOrder 5 part1-05-realtime.md 제목과 맞다. 212행 '1-03: 측정의 기본'은 part1-03-measurement.md, 213행 '1-05: 실시간 성능 분석'은 part1-05-realtime.md로 라벨과 대상이 맞다. 전제 지식 안내가 없고 audit:reading·폰 폭 확인을 하지 않아 7 이상 근거가 없다. |
| G | 2 | 본문 출처는 61·214행 hdrhistogram.org 링크뿐이고 HdrHistogram_c 버전이 없다. 129행 'Gil Tene의 유명한 글'은 제목·링크가 없다. 91행 `__clz`의 컴파일러·대상 코어, 77행 메모리 수치의 근거 설정이 없다. |

uncertainties:
- 91행 `idx = 32 - __clz(us)`: ARM CLZ 의미라면 us=1이 idx 1에 들어가 97행에서 '2-3 us'로 찍혀 1~31 bucket 전체가 한 칸 어긋난다. `__clz` 의미를 대상 컴파일러 문서로 확인하지 않았다(API 의미가 필요해 오류 확인에 넣지 않음).
- 90행 `1u << (BUCKETS - 1)`은 BUCKETS 64에서 32비트 unsigned를 63비트 shift해 정의되지 않은 동작이고, 97행 `1<<i`도 i≥31에서 int overflow다. uint32_t 입력은 최대 33개 bucket만 쓰므로 101행 '64 bucket × 4 byte' 설명과 다르다. C 표준으로 확인하지 않았다.
- 67행 `hdr_init(1, 60*1000*1000, 3, &h)` 시그니처, 74행 `hdr_max`, 77행 '메모리 수십 KB'를 HdrHistogram_c 소스로 확인하지 않았다.
- 114행 'Mean과 stdev는 정규분포를 가정'은 정의상 분포 가정이 없어 부정확한 표현일 수 있다.
- 163·190행 'p99에 최소 N=1000'은 part1-06-benchmark.md 81·224·241행 'N은 100 이상'과 기준이 다르다(다른 글과의 모순이라 오류 확인 아님).
- 180행 'knee는 보통 80% 근처', 144행 'GC 수십 ms 정기' 등 141~149행 시그니처는 출처 없는 수치다.
- 137행 'HdrHistogram에 coordinated omission 보정 내장 지원'의 구체 API를 upstream으로 확인하지 않았다.
- 61행 'Gil Tene이 Azul Systems에서 만든 도구'는 기억으로만 맞다고 보이며 1차 자료 미확인.

병합 대상: 판정은 오류 확인 때문에 우선 조치이고, 점수 구간 병합 검토 기준 후보는 `part1-02-metrics.md`(Percentile 표기·Long Tail·자주 하는 실수 절)다. HdrHistogram·log2 bucket·coordinated omission은 이 글에만 있어 다음 조치는 보강(차별화)이다. 먼저 89·97행 bucket 0 라벨을 고치고, 1-02와 겹치는 percentile·long tail 설명은 링크로 줄인다.

### `part1-05-realtime.md` — 42점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 177행 '실제: t=0.05, 5.12, 9.98, 15.30'은 5 ms 슬롯의 실제 release를 5.12로 적는데, 178행 'release jitter = 5.30 - 5.00 = 0.30 ms'는 같은 슬롯의 실제값을 5.30으로 쓴다. 5.30은 177행 데이터에 없고(15 ms 슬롯은 15.30), 177행대로면 5 ms 슬롯 jitter는 0.12 ms다. git log(42ebbcbb stub, f3283f25 Part 1 deep dive, 845231cf TikZ, 3d56a230 번역투 수정·발행, 4e66cbfc KaTeX, ac24bb76 제목, be973200 topic, 0a9dd7bc slug)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | WCET 4 방법(27~58행), Hard/Soft 표(143~151행), Liu-Layland·RTA 공식(157~167행)은 실시간 입문 자료의 표준 목록이고 RTOS 1-10과 문장 단위로 같다. 이 글만의 것은 deadline miss 카운터(89~102행), tardiness(104~113행), release jitter 예(171~181행), 측정 함정 세 가지(183~199행)인데 모두 한두 문장이다. 47행 '보통 1.2-1.5×', 77행 '±10% 안이면 OK', 187행 'printf 1 ms'는 출처 없는 기준이다. 앵커 part6-09(A 10)보다 고유 예제가 적다. |
| B | 10 | 지표 표(19~25행) → WCET 방법 → jitter·deadline·tardiness 코드 → cyclictest(115~123행) → budget(125~141행) → schedulability(153~169행) → 함정(183~199행) → 정리(219~227행)로 기본 흐름은 끝까지 간다. hybrid(54행)·pWCET(58행)는 한 문단, Liu-Layland(159행)는 공식만, RTA(167행)는 'Iterative하게 풉니다'만 있다. 178행 수치 불일치와 89~100행 deadline miss 코드 동작 의심이 열려 있어 B ≤ 13(AP-C-24). |
| C | 6 | DWT 측정 루프(39~48행), jitter 루프(62~75행), cyclictest 명령과 출력 한 줄(117~121행)이 있다. 대상 MCU·FreeRTOS 버전·커널·rt-tests 버전이 없고 120행 출력(Min:5 Avg:7 Max:23)과 130~138행 budget 수치는 측정 환경·출처가 없어 C ≤ 8. 89~100행 deadline miss 코드는 97행에서 process() 뒤 deadline을 다시 잡고 93행에서 곧바로 비교해 overrun을 세지 못할 수 있고, 178행 예시 수치도 177행과 맞지 않아 앵커 part7-05(C 8)보다 낮다. |
| D | 4 | 같은 시리즈 part1-04-statistics.md·part1-06-benchmark.md와는 역할이 구별된다. 다른 시리즈 rtos/practical-internals/part1-10-realtime-analysis.md와 직접 대조했다: 이 글 27~58행 WCET 4 방법 ↔ 1-10 66~93행, 117~120행 cyclictest 명령·Min 5/Avg 7/Max 23 ↔ 1-10 165~166행, 128~138행 PID 1 ms budget(~110 µs, 89%) ↔ 1-10 185~196행, 143~151행 Hard/Soft 표 ↔ 1-10 221~228행, 165행 RTA 공식 ↔ 1-10 122행. modern-recipes/part8-12-wcet-analysis.md(137·142·194행)도 aiT·측정 기반 WCET를 더 구체적으로 다룬다. tardiness·release jitter·측정 함정(104~113·171~199행)만 고유해 1~4 구간. |
| E | 6 | 제목과 description(5행) 'WCET 4 방법과 jitter·tardiness 분석'의 키워드를 모두 절로 다룬다(27·60·87·104행). 범위 불일치는 없다. '측정·분석'을 약속하지만 판정 절차는 77행 '±10%' 한 줄과 113행 수준이다. |
| F | 6 | 227행 다음 편 '벤치마킹 기초…'는 seriesOrder 6 part1-06-benchmark.md와 맞다. 231행 '1-04: 통계적 분석', 232행 '1-06', 233행 'Practical RTOS Internals 1-10'은 대상 파일 라벨·번호와 맞다. 전제 지식 안내가 없고 1-04의 percentile·histogram을 77·113행 분포 판정에 연결하는 안내도 없다. |
| G | 1 | 본문에 출처 링크가 없다. aiT·Bound-T(31행), Liu-Layland(157행), RTA(161행), Cheddar·SymTA/S(169행), DO-178C·ISO 26262(151행)를 이름만 댄다. FreeRTOS·커널·rt-tests 버전과 대상 코어 표기도 없다. |

uncertainties:
- 217행 'Mainline은 best-effort, PREEMPT_RT 패치만 RT-capable': PREEMPT_RT가 mainline(6.12 무렵)에 병합되었다는 기억이 있으나 커널 소스·릴리스 노트를 열지 않았다. 글 날짜(2026-04-23) 기준 틀린 진술일 수 있어 fact-check 우선 확인 대상.
- 89~100행 deadline miss 코드: 97행에서 process() 뒤 deadline을 다시 잡고 93행에서 바로 비교해 process 지연을 세지 못할 수 있다. 루프에 주기 대기도 없다. FreeRTOS tick API 의미가 필요해 오류 확인으로 올리지 않았다.
- 178행 release jitter 정의: 177행 오프셋(0.05, 0.12, -0.02, 0.30)을 max-min으로 보면 0.32 ms다. 정의(최대 지연 vs 범위)는 1차 자료로 확인하지 않았다.
- 123행 'p99와 max latency를 측정'인데 120행 출력에는 Min/Avg/Max만 있다. cyclictest가 p99를 내는지 rt-tests 문서로 확인하지 않았다.
- 47행 '보통 1.2-1.5×', 77행 '±10%', 147행 Soft RT '<1%', 187행 'printf 1 ms', 199행 '최소 1분 warmup'은 출처·환경 없는 수치다.
- 62~75행 jitter 코드의 period_actual 기준과 DWT 32-bit wrap 처리 여부 미확인.

병합 대상: `src/content/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis.md`(WCET 4 방법·cyclictest·budget·Hard/Soft 표·RTA가 같은 수치·문장), 보조 후보 `modern-recipes/part8-12-wcet-analysis.md`. 판정은 오류 확인으로 우선 조치이고 먼저 178행 수치를 정정한다. PE 시리즈 '측정' 관점의 독립 검색 의도가 있으므로 다음 조치는 보강(차별화)이다. 겹치는 절(27~58·115~151·157~169행)은 RTOS 1-10 링크로 줄이고 tardiness·release jitter·deadline miss 계측·측정 함정을 1차 자료와 측정 환경으로 키운다. 근거를 채울 수 없으면 고유 절을 RTOS 1-10으로 옮기고 병합한다.

### `part1-06-benchmark.md` — 45점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 77~78행 '한 번 측정: 100 ms / 실은 95-110 ms 분포 (±5%)'. 95~110 ms는 폭 15 ms라 ±5%(폭 0.1c)가 되려면 중심값 c가 150 ms여야 하고, 100 ms 기준으로는 -5%/+10%다. 같은 줄의 범위와 '±5%'가 동시에 참일 수 없다(30행 '100 ms ± 5%'와도 범위가 다르다). git log(f3283f25·845231cf·3d56a230·ac24bb76·be973200·0a9dd7bc)에 수치를 1차 자료와 대조한 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 8 | 17~23행 '좋은 벤치마크의 5 조건', 50~65행 Linux isolation 명령, 145~169행 micro-bench·volatile sink는 벤치마크 입문 표준 목록이다. 이 글만의 것은 107~114행 CoreMark 비교 표와 196~200행 A/B 예시인데, 표는 출처·측정 조건이 없고 A/B 수치는 가상의 예다. 128행 '비판이 있습니다', 206행 'noise일 가능성이 있습니다'는 근거 없이 결론을 흐린다. 언제 CoreMark 대신 자체 micro-bench를 쓰는지 선택 기준이 없다. 앵커 part1-04-uart-hardware(A 10)보다 낮다. |
| B | 9 | warmup(25~44행) → isolation(46~72행) → 반복 수(74~88행) → CoreMark·Dhrystone·SPEC(90~132행) → micro-bench(145~190행) → A/B·CI(192~218행) → 실수·정리(220~244행)로 흐름은 끝까지 간다. 81행은 평균·p99·max·stdev 보고를 요구하지만 84~88행 stats 구조체는 hist[64]를 채우는 코드가 없고, 188행 run_bench는 avg·min·max만 출력한다. 202행 Mann-Whitney U는 이름만, 215행 `check_regression`은 정의되지 않은 자리표시자다. 147~156행 예는 161~169행이 경고하는 결과 제거 대책을 쓰지 않는다. B ≤ 13(AP-C-24). |
| C | 5 | 173~189행 run_bench는 DWT 활성화(DEMCR.TRCENA, CYCCNTENA)가 없고 대상 MCU·클록·컴파일러가 없다. 27~31·76~79·107~114·122~126·196~200행은 출처·측정 환경 없는 구체 수치라 C ≤ 8. 98~102행 CoreMark 빌드·출력은 GCC 11.4.0 -O2를 적었지만 13841을 낸 호스트 CPU가 없다. 검증 절차가 없어 4~7 구간, 앵커 part1-04-uart-hardware(C 6)보다 약간 낮다. |
| D | 9 | 같은 시리즈 part1-02-metrics.md 181~191행 CoreMark 블록(M0+@50MHz 100, M4F@168MHz 850)이 이 글 109~110행과 같은 값이고, 169~179행 DMIPS 절이 이 글 118~128행과 같은 주제다. part1-03-measurement.md 58~71행 DWT 측정이 이 글 35~42·173~189행의 바탕이다. part1-04-statistics.md 44~57·154~163행이 이 글 74~88·222~224행과 같은 질문이다. 다른 시리즈 modern-recipes/part2-01-cortex-m-comparison.md 108~115행 CoreMark/MHz 표, part12-02-edge-pipeline-measurement.md 71~102행 WARMUP 코드, part2-02-cortex-a-comparison.md 122~126행 DMIPS/MHz 표와 겹친다. 방법론(warmup·isolation·A/B) 역할은 구별된다. |
| E | 6 | 제목의 재현성·Warmup·노이즈 제거는 25~88행에서 다룬다. description의 CoreMark·Dhrystone은 90~128행에 있으나 SPEC은 130~132행 두 문장뿐이라 부분 미이행이다. 48~65행 isolation과 134~143행 도구 표는 Linux 호스트 이야기라 '임베디드' 독자 범위가 흐리다. |
| F | 6 | 246행 다음 편 안내(성능 모델링)가 seriesOrder 7 part1-07-modeling.md와 맞다. 250행 '1-05: 실시간 성능 분석'과 251행 '1-07: 성능 모델링'은 대상 파일을 열어 대조했다. 전제 지식(1-03 DWT 설정, 1-04 통계) 안내가 없다. |
| G | 2 | 96행 eembc/coremark 저장소, 159행 Google Benchmark·Catch2, 252행 EEMBC CoreMark 페이지 링크와 102행 GCC 11.4.0 -O2 표기가 있다. 107~114행 CoreMark 표, 122~126행 DMIPS/MHz, 120행 Dhrystone 1984·Weicker에는 출처가 없고 CoreMark 버전 같은 버전·환경 표기가 주장에 붙어 있지 않다. |

uncertainties:
- 107~114행 CoreMark 표 값(M0+ 2.0, M7 6.0 CoreMark/MHz)이 modern-recipes/part2-01-cortex-m-comparison.md 110·113행(M0+ 2.46, M7 5.01)과 다르다. EEMBC 공개 점수 미확인(다른 글과의 모순).
- 113행 SiFive E31 @320MHz 1500 CoreMark가 part1-02-metrics.md 188행 'SiFive E31: 150 CoreMark'와 10배 차이. 1차 자료 미확인.
- 123~124행 DMIPS/MHz(M0+ 0.95, M4 1.25)가 part1-02-metrics.md 174~175행 값과 맞지 않는다. Arm 공개값 미확인.
- 81·222~224행 N≥100으로 p99 보고 가능 취지 vs part1-04-statistics.md 163행 '최소 N=1000'(다른 글과의 모순).
- 98행 `make PORT_DIR=linux64`가 현재 eembc/coremark 포트 디렉터리 이름과 맞는지 미확인.
- 147~156행 `BENCHMARK(bench_memcpy_1k)`를 인자 없는 C 함수로 썼는데 Google Benchmark는 `benchmark::State&` 인자를 요구하는 것으로 기억한다. upstream 미확인.
- 179~186행 sum이 uint32_t라 100회 합에서 오버플로가 날 수 있다(언어 규칙 판단이라 불확실).
- 21·206행 '±5%' 변동과 206·244행 '10% 미만은 noise'는 출처 없는 경험칙이다.
- 120행 Dhrystone 1984·Reinhold Weicker는 1차 자료로 확인하지 않았다.

병합 대상: 글 전체의 병합 대상 없음. warmup·isolation·A/B 방법론 질문은 시리즈 안에서 독립적이다. 90~128행 CoreMark·Dhrystone 절은 `part1-02-metrics.md` 169~191행과 같은 값을 반복하므로 한쪽으로 모으는 부분 병합을 검토한다. 먼저 78행 산술 모순을 고치고(우선 조치), 이어 보강한다. 사유는 수치 출처·측정 환경이 없고(C·G), CoreMark 표가 1-02·modern-recipes part2-01과 값이 달라 EEMBC 공개 점수·Arm 공개값으로 확인하거나 TBD로 두어야 하기 때문이다.

### `part1-07-modeling.md` — 44점, 우선 조치

confidence: 중간

factcheck: 오류 확인. (1) 47행 `S - P·(S-1) = 1 + P·(S-1)`은 같은 P로 두 식을 등호로 잇는다. 차는 (S-1)(1-2P)라 P=0.5 또는 S=1일 때만 같고, 23행은 P를 '병렬화 가능한 비율'로 정의한다. (2) STREAM Triad에서 75행 '3 byte load와 1 byte store (assuming 1 byte per element)'와 77행 'float = 4 byte, total 16 byte/iter'가 원소 크기 1 byte와 4 byte로 충돌한다. (3) matmul에서 88행 '2 byte load + 1 store = 3 byte'인데 90행은 OI를 2/12로 계산한다(3 byte라면 2/3). git log(0a9dd7bc·be973200·ac24bb76·a746e269·4e66cbfc)는 URL·메타데이터·제목·코드 블록·KaTeX 변경뿐이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | Amdahl(17~41행), Gustafson(43~51행), Roofline(53~100행), Little's Law(102~112행), USL(114~125행)은 교과서 공식과 정의를 순서대로 옮겼다. 이 글에만 있는 것은 168 MHz Cortex-M4 1 ms PID cycle budget(129~141행)과 51행 '임베디드는 문제 크기가 고정이라 Amdahl이 우세' 정도이고, cycle budget은 앞 모델과 연결되지 않는다. 158~164행 '인터프리터 모델'은 한 줄 주장뿐이다. 앵커 part1-04(A 10)보다 조금 낮다. |
| B | 9 | 다섯 모델이 모두 공식 하나와 예 하나로 끝난다. Gustafson은 기호 정의 없이 식만 있고(47행) 그 식도 모순이다. Roofline은 읽는 법(65~66행)과 활용 순서(96~100행)는 있지만 실제 CPU의 peak FLOPS·BW로 ridge point를 구한 예가 없다. USL은 α·β를 구하는 법이 없다(118~123행). B ≤ 13(AP-C-24), 5~9 구간. |
| C | 5 | 실행 환경·측정 절차·관찰 결과가 없다. 149~154행 core별 시간 표, 182행 '2-4 core에서 plateau가 흔합니다', 174행 'Cache miss가 90%', 135행 Sensor read 30,000 cycle은 보드·워크로드·출처 없는 수치라 C ≤ 8. 산술(33행 10×, 110행 1000 byte, 139~140행 50,200·30%·117,800, 151~153행 1.67·2.5·2.86)은 맞지만 독자가 공식을 자기 코드에 적용해 검증하는 절차가 없다. |
| D | 8 | 같은 시리즈 part2-08-memory-bandwidth.md 22~26행 STREAM 표, 31행 Triad 코드, 55~64행 Roofline 정의가 이 글 53~92행과 겹친다. part4-03-lock-contention.md 86~96행(Amdahl·Gunther USL), part4-10-smp-analysis.md 205~213행(Amdahl·USL 식·α·β), part6-03 112~118행(USL)이 이 글 17~35·114~125행을 반복한다. part1-02-metrics.md 57행 부근 Little's Law ↔ 이 글 102~108행. 인접 part1-06·part1-08과는 겹치지 않는다. 다른 시리즈 embedded/hardware/hbm/chapter05-bandwidth-bottleneck.md 99~109행(Roofline knee·arithmetic intensity), modern-recipes/part12-03-npu-architecture.md 148~149행. cycle budget을 뺀 거의 모든 절이 뒤 글에서 다시 정의된다. |
| E | 6 | 제목 키워드 Amdahl·Gustafson·Roofline은 17·43·53행에 절로 있다. '적용'의 실제 예는 교과서 수치 예(27~35행)와 STREAM/matmul OI(68~92행)뿐이고 임베디드 적용인 cycle budget(127~143행)은 세 모델과 연결되지 않는다. |
| F | 6 | 193행 다음 편 '프로파일링 개요'는 seriesOrder 8 part1-08-profiling-overview.md와 맞다. 197~199행 part1-06-benchmark, part1-08-profiling-overview, part2-08-memory-bandwidth(seriesOrder 16)는 모두 라벨과 맞고 draft:false다. 전제 지식 안내가 없고 158행 절 제목 '인터프리터 모델'은 내용과 맞지 않는다. |
| G | 1 | 본문에 출처 링크가 없다. Amdahl(1967)·Gustafson(1988)은 연도만 있고(17·43행), Roofline 원 논문과 Gunther USL 원전(116행 이름만)도 인용하지 않는다. 110행 DRAM latency 100 ns·10 GB/s와 130행 168 MHz Cortex-M4는 대상 칩·데이터시트가 없다. |

uncertainties:
- 28~29행 '90 ms는 병렬화 가능 (P = 0.9)'과 '10 ms는 serial (P = 0.1)'은 같은 기호 P에 두 값을 준다. 33행 계산은 1-P=0.1로 맞게 했으므로 표기 실수로 보고 오류 확인 근거에서 뺐다.
- 75행 '3 byte load'와 72행 코드(배열 load가 b[i]·c[i] 두 개)의 불일치는 write-allocate로 a[i]를 읽는 것까지 센 것일 수 있어 독립 근거로 쓰지 않았다. STREAM 정의(McCalpin)는 Triad를 24 byte로 세며 part2-08 25행도 24다. 1차 자료 미확인.
- 92행 'Naive matmul도 memory-bound'와 part2-08 64행 'Matrix multiply … compute bound (큰 N)'는 다른 글 간 모순이다. 캐시 가정에 달려 있어 1차 자료로 정해야 한다.
- 160행 'Performance = Best of (memory, compute, control)'는 65~66행 Roofline의 '낮은 지붕이 bound'(min) 논리와 반대로 읽힌다. 출처·의미 미확인.
- 149~154행 core별 시간 표, 182행 '2-4 core plateau', 174행 'Cache miss가 90%'는 출처·환경 없는 수치다.
- 110~112행 DRAM latency·BW와 130~141행 PID cycle 배분은 측정값인지 가정인지 밝히지 않았다.

병합 대상: 같은 시리즈 `part2-08-memory-bandwidth.md`(Roofline·STREAM)와 `part4-10-smp-analysis.md`(Amdahl·USL). 판정은 오류 확인으로 우선 조치다. Part 1에서 모델 개관 역할을 하는 글이라 독립 의도가 있어 다음 조치는 보강이다. 먼저 47행 Gustafson 식과 75~77·88~90행 OI 계산을 Gustafson 1988 원 논문과 STREAM 정의(McCalpin)로 고치고, 뒤 글과 겹치는 공식 정의를 이 글로 모은 뒤 뒤 글은 링크로 대신한다.

### `part1-08-profiling-overview.md` — 43점, 우선 조치

confidence: 중간

factcheck: 오류 확인. (1) 230~232행 'bar() // 90 ms', 'baz() // 5 ms', 'return; // 5 ms self'와 235행 'inclusive: 100 ms'에서 self는 100-90-5=5 ms인데 236행은 'exclusive (self): 10 ms (bar·baz 제외)'라고 적었다. (2) 219~221행 gprof 출력에서 self 1.0초가 35.00%면 self 0.5초는 17.5%여야 하는데 20.00%로 적었다. git log(0a9dd7bc slug, be973200 topic, ac24bb76 제목, 3d56a230 번역투 수정·발행 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 8 | sampling/instrumentation 장단점(28~34·56~62행), 도구 목록(36~41·64~69행), perf·eBPF·ftrace 명령(73~116행)은 일반 입문 목록이다. 이 글만의 것은 inclusive/exclusive 예(228~239행)와 '자주 하는 실수'(241~257행)인데 전자는 산술이 틀렸고 후자는 253행 '측정이 답' 같은 일반론이 섞였다. 30행 1-5%, 61행 20-200%, 155행 10-15%, 174~175행 5-10%·15-20%, 189행 10-20%는 출처 없는 수치다. 선택 기준은 15행 '상황에 맞춰 골라야 합니다'로 끝난다. |
| B | 9 | sampling → instrumentation → 도구별 명령 → PGO/LTO → 출력 해석 → 실수 → 정리(259~267행) 흐름은 있다. 절마다 코드 한 조각과 한두 문장이고(108~118행 ftrace, 120~134행 RTOS tracer), '언제 무엇을 쓰나'는 15행과 257행 한 줄뿐이다. call graph 수집 방식(fp/dwarf)·skid·MCU sampling(DWT/ITM)·PGO training 데이터 대표성 같은 한계가 없다. |
| C | 5 | 실행 가능한 명령은 있다(75·79행 perf, 86~87행 flamegraph, 98행 bpftrace, 111~115행 ftrace, 140~146행 PGO, 183~184행 arm-none-eabi-gcc). 커널·perf·gcc 버전, 보드, 예상 출력이 없고 153~156·172~176행 효과 수치는 출처·환경이 없어 C ≤ 8. 219~221행 gprof 출력은 백분율 산술이 맞지 않고 183~184행 링크 명령에는 입력 파일이 없다. |
| D | 8 | 같은 시리즈: 136~149행 PGO 절이 part1-03-measurement.md 226~238행과 3단계 명령·결론이 거의 같다. 86~87행 perf record + flamegraph 파이프라인은 part5-05-flamegraph.md 24~48행, part2-10-pmu.md 153~163행과, 79행 perf stat은 part5-01-perf-basics.md 66~80행과 겹친다. 92~106행 eBPF는 part5-04-ebpf.md, 108~118행 ftrace는 part5-03-ftrace.md, 125·129~134행 SystemView는 part5-07-baremetal-profiling.md 148~172행의 축약이다. 인접 part1-07·part2-01과는 겹치지 않는다. 다른 시리즈 tools/debugging/valgrind/chapter01-intro.md는 callgrind 언급 수준이다. |
| E | 6 | 제목(2행)의 Sampling·Instrumentation·PGO·LTO는 17~69·136~178행에서 다룬다. description(5행)도 본문과 맞다. '개요'로서 독자가 얻는 선택 결론이 15행 한 줄이라 6~8 구간 하단. |
| F | 6 | 267행 'Part 2부터는 CPU와 Microarchitecture'는 seriesOrder 9 part2-01-pipeline.md와 맞지만 링크가 없다. 271행 '1-07: 성능 모델링', 272행 '5-01: perf 기초', 273행 '5-05: Flamegraph 분석'은 대상 제목과 맞다. 본문에서 eBPF·ftrace·SystemView 상세 글로 연결하지 않고 전제 지식 안내도 없다. |
| G | 1 | 본문에 1차 출처 링크가 없다. perf·gcc·커널·bpftrace 버전 표기가 없고 106행 'Brendan Gregg가 추천'은 출처 없는 이름 언급이다. |

uncertainties:
- 47~53행 주석은 '-pg'로 자동 삽입된다고 하지만 __cyg_profile_func_enter/exit는 GCC -finstrument-functions hook으로 알고 있다. GCC 매뉴얼 미확인.
- 38행 'perf — 1 kHz 기본': perf record 기본 주파수(4000 Hz로 기억)를 perf 문서로 확인하지 않았다.
- 125행 'SystemView — J-Link가 필수', 127행 'CTF — 모든 RTOS', 94행 eBPF '정확하면서 low overhead', 106행 '자동 출력'은 1차 자료 미확인.
- 112행 set_ftrace_filter 'sys_*'가 현재 커널 syscall 심볼(__arm64_sys_*, __x64_sys_*)과 매치되는지 미확인.
- 214행은 cumulative를 inclusive로 정의하지만 219~221행 gprof flat profile의 cumulative 열(1.0 → 1.5)은 self 누적합 형태다. gprof 문서를 열지 않아 미확인으로 둔다.
- 30·61·155·174~175·189행 수치와 245행 '최소 99 Hz × 30초'는 출처·환경 없는 수치다.

병합 대상: PGO 절(136~160행)은 `part1-03-measurement.md` 226~238행과 중복이라 한쪽으로 합치고, perf·flamegraph·eBPF·ftrace·SystemView 절(71~134행)은 part5-01·5-03·5-04·5-05·5-07 링크만 남기는 방안. 'sampling vs instrumentation 선택'은 Part 1 마무리 질문으로 독립 검색 의도가 있어 글 자체는 병합하지 않고 다음 조치를 보강으로 둔다. 먼저 236행(self 10 ms → 5 ms)과 219~221행 gprof 백분율을 고치고, 출처 없는 효과 수치는 1차 자료로 확인하거나 지운다.

### `part2-01-pipeline.md` — 42점, 우선 조치

confidence: 중간

factcheck: 오류 확인. (1) 60행 "`r0` 의존성이 있지만 load 결과가 같은 cycle에 ALU로 전달됩니다 (forwarding). Stall 없이 진행됩니다"(Cortex-M3/M4 절) vs 142~149행 'ARM Forwarding (Cortex-M4)'의 "Load 결과는 forwarding이 불가능하여 1 cycle bubble이 생깁니다". 같은 코어의 같은 ldr→사용 패턴에 반대 결론이다. (2) 112행 식 T_no pipeline=5N, T_5-stage=N+4에서 N=1000이면 약 4.98배인데 114행은 '200x throughput'이다. (3) 보조: 52·222행은 M3/M4를 3-stage(Execute에 E+M+W 통합)로 쓰는데 145~146행 Cortex-M4 예 주석은 'F D E M W' 5단계와 D' stall로 그린다. git log(0a9dd7bc·be973200·ac24bb76 등)는 메타데이터·형식 커밋뿐이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 5-stage 표(19~25행)·시간축(27~33행)·hazard 3종(116~140행)·길이 trade-off 표(100~106행)는 교과서 표준 목록이다. 고유한 것은 Cortex-M0/M3/M7/A53/A72 단계 나열(41~98행)과 SuperH 비교 표(176~184행)인데 출처 없이 단계 이름과 두세 문장뿐이다. 98행 '전력 소모도 그만큼 큽니다', 201행 '컴파일러가 이미 더 잘 최적화합니다'는 근거 없는 일반론이다. |
| B | 9 | 개념→코어별 비교→trade-off→hazard→측정→실수→정리(219~225행) 흐름은 있다. 60행과 149행이 load-use stall 여부에서 반대이고, 114행 결론 수치가 112행 식과 맞지 않으며, 145행 주석이 52행 3-stage 구조와 다르다. 165행 `count_instructions_in_loop()`가 정의되지 않아 IPC 측정 절차가 끊긴다. |
| C | 5 | 159~167행 DWT CYCCNT 코드, 211~217행 DSB 예가 있으나 보드·클록·컴파일러가 없고 165행 함수가 없어 실행할 수 없다. 170~174행 목표 IPC(M0 ~0.7, M7 ~1.5, A72 ~3.0), 106행 '1.5 GHz↑', 108행 '31 cycle 손실'은 출처·환경 없는 수치라 C ≤ 8. 관찰·기대 결과가 없다. |
| D | 8 | 같은 시리즈 part2-02-pipeline-stall.md: 2-01 126~131행 RAW 예 = 2-02 21~26행(같은 코드), 2-01 118~122행 structural hazard·Harvard ↔ 2-02 78~88행, 2-01 133~140행 control hazard ↔ 2-02 90~99행, 2-01 142~155행 load-use·nop ↔ 2-02 52~74행, 2-01 192~201행 NOP 실수 ↔ 2-02 63~76행. part2-03-branch-prediction.md penalty 표와 2-01 47행이 겹친다. 다른 시리즈 modern-recipes/part11-14-intel-quartus.md 158행, part11-10-hls.md 106행, part12-02-edge-pipeline-measurement.md는 주제가 다르다. 코어별 단계 비교(41~98행)만 고유하다. |
| E | 5 | 제목 'CPU 파이프라인 분석 — 5-stage·Cortex-M·Cortex-A 비교'(2행)의 키워드는 17~98행이 다루지만, '분석'을 약속하면서 본문은 코어마다 단계 이름 한 줄(44·52·65·77·85행)과 두세 문장이라 루브릭 E '개념 소개 수준이면 3~5점'에 해당한다. description(5행) 'Cortex-A는 8~15-stage'도 A53·A72 두 개만 본다. |
| F | 5 | 227행 다음 편 'Pipeline Stall'은 seriesOrder 10 part2-02-pipeline-stall.md와 맞고 231·232행 라벨도 대상 제목과 맞다. 그러나 140행 'branch prediction으로 해결합니다 (다음 편에서 다룹니다)'는 실제 다음 편(seriesOrder 10, stall)과 다르고 branch prediction은 seriesOrder 11이다. 틀린 다음 편 안내라 F ≤ 5. |
| G | 1 | 본문에 출처 링크·문서 인용이 없다. 41~98행 코어별 단계 수에 TRM 인용·판이 없고, 170~174행 IPC, 108행 Pentium 4 31 stage, 176~184행 SuperH 비교도 출처가 없다. |

uncertainties:
- 41·222행 'Cortex-M0/M0+ 2-stage': 기억으로는 M0는 3-stage, M0+가 2-stage. Cortex-M0 TRM 미확인.
- 47행 M0 분기 1 cycle 손실, 2-03 표 M3/M4 2 cycle 등 코어별 분기 penalty 미확인.
- 65~70행 Cortex-M7 단계 이름(F1 F2 D I E1 E2)과 72행 '이론적으로 2.0' 미확인.
- 77행 A53 단계 이름, 82행 A72 '15-stage', 96행 '4-wide superscalar'(3-wide decode로 기억) 미확인.
- 108행 Pentium 4 '31 stage'는 Prescott 기준으로 기억(Willamette 20). 출처 미확인.
- 180행 ARM 'Load delay slot이 묵시적', 182행 'ARM 32 register'(AArch32 범용 레지스터 16개로 기억) 미확인.
- 209행 'DMB와 DSB 없이는 정확하게 측정되지 않습니다'는 근거 없는 단정이고 211~217행은 DSB만 쓴다.
- 2-02 61행 'Cortex-M3/M4 load-use penalty 1 cycle'은 2-01 149행과 같고 60행과 반대다. 시리즈 일관성은 1차 자료로 정할 것.
- 56~58·126~128·135~137·144~154·194~198행 어셈블리가 ```c 블록에 들어 있다(점수 외).

병합 대상: `src/content/blog/embedded/performance-engineering/part2-02-pipeline-stall.md`. 2-01 116~155행(hazard 3종·load-use·nop)이 2-02 17~99행과 겹치므로 2-01은 코어별 파이프라인 비교(41~108행)를 중심으로 남기고 hazard 설명은 2-02로 넘기는 방향이다. 판정은 오류 확인으로 우선 조치이고, 먼저 60행↔149행 모순, 145행 5-stage 주석, 114행 산술을 Cortex-M3/M4 TRM으로 바로잡는다.

### `part2-02-pipeline-stall.md` — 44점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 86행 "Harvard architecture를 쓰면 instruction memory와 data memory가 분리되어 동시에 액세스할 수 있습니다" vs 88행 "ARM Cortex-M3/M4는 single port Harvard입니다 (I/D 통합 bus)". 글이 세운 정의로는 I/D가 통합된 single port 구조에서 명령과 데이터를 동시에 액세스할 수 없으므로, M3/M4가 Harvard라는 진술과 I/D 통합 bus라는 진술이 structural hazard 동작에 대해 동시에 참일 수 없다. git log(618f908e 작성 이후 42ebbcbb·845231cf·3d56a230·a746e269·ac24bb76·be973200·0a9dd7bc)에 1차 자료 대조 커밋은 없다. Cortex-M4 TRM은 열지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | RAW·WAR·WAW 정의(17~44행), forwarding(46~50행), structural·control hazard(78~99행)는 교과서 표준 목록이다. 이 글만의 것은 Cortex-M4 inline asm 세 함수로 stall을 비교하는 예(103~133행), STALL_FRONTEND·STALL_BACKEND 비교 해석(154~155행), 독립 accumulator unroll(242~257행)이다. 133행 측정 결과에 수치가 없고, 50행 'Operand Forwarding Unit', 61행 M7 2 cycle, 199행 'Cortex-A는 IT block 효율이 떨어집니다'는 근거 없이 결론만 있다. 앵커 part1-04와 같은 10점. |
| B | 10 | hazard 3종 → forwarding → load-use → structural → control → 측정 → PMU → renaming → IT → SIMD → 실수 → 정리(13~266행)로 흐름은 끝까지 간다. 99행은 control hazard를 '별도 편'으로 넘기고, 133행은 측정 코드 없이 결과만 쓴다. 204~211행은 scalar 합산과 원소별 덧셈 vadd.f32를 같은 일처럼 비교한다. 86·88행 모순, 108~121행 clobber 누락, 141~143행 이벤트 번호 불확실이 열려 있어 B ≤ 13. |
| C | 5 | 61행 1·2 cycle, 133행 '1 cycle이 더', 211행 '1 cycle'에 보드·컴파일러·클록·출처가 없어 C ≤ 8. 103~131행 asm은 r0~r8을 덮어쓰면서 clobber 목록이 없고, 244행은 C 루프 안에 `; ← RAW chain` 주석을 써 컴파일되지 않으며, 145~152행 perf_event_open 조각은 래퍼·attr.size가 없다. 133행 측정은 코드·수치 없는 결과 주장뿐이다. |
| D | 6 | 인접 part2-01-pipeline.md와 겹친다: 21~26행 RAW 예 ↔ 2-01 126~131행(같은 코드), 86행 Harvard ↔ 2-01 120~122행, 90~99행 control hazard·'별도 편' ↔ 2-01 134~140행, 52~74행 load-use·재정렬 ↔ 2-01 142~155행. 157~174행 renaming ↔ part2-04-speculative-execution.md 51~60행, 176~197행 IT block ↔ part2-03-branch-prediction.md 194~199행, 141~142행 0x23·0x24 ↔ part2-10-pmu.md 50~51행. 다른 시리즈 systems/csapp/ch04.md 95~109행은 draft: true라 공개 중복 위험이 낮다. 고유 부분은 103~133·154~155행 정도다. |
| E | 6 | 제목(2행)의 Data·Structural·Control Hazard·Forwarding과 description(5행)의 RAW·WAR·WAW·forwarding·PMU STALL counter가 모두 절로 있다(17~50·78~99·135~155행). Control Hazard는 92~99행 코드 한 조각과 '별도 편' 한 줄뿐이고 제목의 '분석'에 맞는 실측 stall 수치가 없다. |
| F | 6 | 268행 '다음 편은 Branch Prediction'은 seriesOrder 11 part2-03-branch-prediction.md와 맞다. 272행 '2-01: Pipeline 기초', 273행 '2-03: Branch Prediction'은 두 파일을 열어 라벨과 대조했다. 전제 지식 안내가 없고, PMU 절(135~155행)·renaming 절(157~174행)에서 part2-10·part2-04로 가는 링크가 없으며, 99행 '별도 편'은 어느 편인지 적지 않는다. |
| G | 1 | 본문에 출처 링크가 없다. 61행 load-use cycle 수, 137~143행 Cortex-A53 PMU 이벤트 번호, 50행 Operand Forwarding Unit, 88행 M3/M4 bus 구조에 TRM·ARM ARM 판 표기가 없다. |

uncertainties:
- 88행 'Cortex-M3/M4는 single port Harvard (I/D 통합 bus)': 기억으로는 M3/M4가 ICode·DCode 버스를 따로 둔다. 어느 쪽이 틀렸는지는 Cortex-M4 TRM으로 확인하지 않았다(86행과의 내부 모순은 factcheck 근거로 씀).
- 61행 'M3/M4 load-use penalty 1 cycle, M7 2 cycle'과 127·133행 1 cycle 주장은 TRM 타이밍 표 미확인. part2-01-pipeline.md 60행은 M3/M4에서 stall이 없다고 써 이 글·part2-01 149행과 어긋난다(다른 글과의 모순).
- 133행: 글 자신의 모델로는 test_no_stall(독립 명령 3개)과 test_load_use(명령 2개 + bubble 1)가 같은 cycle 수가 될 수 있는데 '1 cycle이 더'라고 쓴다. ldr 자체 cycle이 글에 없어 산술 모순으로 단정하지 않았다.
- 143행 `0x73` STALL_BACKEND_MEM과 141~142행 0x23·0x24를 ARM ARM·Cortex-A53 TRM으로 대조하지 않았다.
- 108~121행 inline asm이 r0~r8을 clobber 선언 없이 덮어쓴다(언어 규칙 판단). 104행 a,b,c,d 중 a만 쓰인다.
- 204행 '4 element 합산'인데 205~208행은 r1~r5 다섯 값을 더한다. 211행 vadd.f32는 원소별 덧셈이고 '1 cycle'도 출처 없음.
- 244행 C 코드 안의 `; ← RAW chain` 주석은 C 문법이 아니다.
- 230행 'volatile ← 모든 access fence'는 volatile이 메모리 배리어가 아니라는 점에서 부정확할 수 있다(1차 자료 미확인).
- 50행 'ARM Cortex-A에는 Operand Forwarding Unit이 있습니다' 용어·근거 미확인.
- 199행 'Cortex-A는 IT block 효율이 떨어집니다' 출처 없음(ARMv8 AArch32 IT deprecation 범위 미확인).

병합 대상: `part2-01-pipeline.md`(hazard 3종·load-use·Harvard·control hazard가 part2-01 118~155행과 이 글 17~99행에 중복). 판정은 오류 확인으로 우선 조치다. 다음 조치는 86·88행 Harvard 서술과 61행 load-use 값을 Cortex-M4/M7 TRM으로 정한 뒤, 중복 hazard 절을 part2-01로 모으고 이 글은 측정 예(103~133행)와 PMU STALL 해석(135~155행) 중심으로 보강하는 것이다.

### `part2-03-branch-prediction.md` — 46점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 93행 BHT 절 "ARM Cortex-A53은 256 entry × 4-way set associative 구조" vs 154~155행 Cortex-A53 사양 표 "BTB | 256 entry, 4-way set assoc", "BHT | 6144 entry". 같은 코어의 BHT 크기가 두 가지다. 보조: 265행 정리 "Mispredict 비용은 pipeline 깊이만큼 cycle을 손실"은 20~22행 예시(depth 8, 5 cycle 손실)와 27~29행 표(2단 1 cycle, 3단 2 cycle, 6단 4~5 cycle)와 맞지 않는다. git log(3d56a230·49f2a443·ac24bb76·be973200·0a9dd7bc)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | BTFNT(36~52행), 1-bit·2-bit counter(54~83행), BHT·BTB(85~103행), gshare(105~115행), indirect(117~126행), RAS(128~138행)는 교과서 표준 순서이고 절마다 한두 문장이다. 이 글만의 것은 코어별 penalty 표(25~32행)와 A53 사양 표(152~158행)인데 출처가 없고 93행과도 모순된다. 113행은 코드에 없는 'c의 결과'를 말한다. 202행 '더 빠르지 않을 수 있어 측정이 우선', 220행 '일부 ARM에서는 영향'은 구체 기준 대신 들어간 완곡 표현이다. |
| B | 10 | 비용 → static → dynamic → BHT/BTB → gshare → indirect → RAS → 코어 사양 → PMU → branchless/__builtin_expect → Spectre → 실수 → 정리(263~269행)로 흐름은 끝까지 간다. 188~190행 branchless max는 a-b 오버플로를 다루지 않고, 196~199행 IT block이 앞의 max와 같은 동작인지 설명이 없으며, 253행 jump table이 BTB 친화적인 이유가 없다. 정확성 불확실이 남아 B ≤ 13. |
| C | 5 | 재현할 수 있는 것은 170행 `perf stat -e branches,branch-misses`와 코드 조각(179~218행)뿐이다. 보드·커널·perf 버전과 관찰 결과가 없다. 25~32행 penalty 표, 50행 'hit rate 약 70%', 66·83행 정확도, 172~174행 miss rate 기준은 출처·환경 없는 수치라 C ≤ 8. 143~145·197~199행은 어셈블리를 ```c 블록에 넣었다. |
| D | 10 | 같은 시리즈 part2-02-pipeline-stall.md(99행 '별도 편', 236~238행 'predict가 성공하면 stall = 0')와 part2-04-speculative-execution.md 79~101행 Spectre v1·wrong-path가 이 글 222~231행과 겹친다. part2-01-pipeline.md 47·108행 분기 손실·Pentium 4 31 cycle ↔ 이 글 25~34행. part2-10-pmu.md 45~50행 이벤트 표, 85행 perf stat, 87~89행 mispredict rate 식·5% 기준 ↔ 이 글 160~175·268행. 다른 시리즈 embedded-cpp/part2-08-static-polymorphism.md 23·138행은 한 줄 수준, modern-recipes/part8-12-wcet-analysis.md 14·37행은 언급만 한다. 예측기 구조는 시리즈에서 이 글만 다룬다. |
| E | 5 | 제목(2행)의 Static·2-bit·BTB·BHT·Mispredict 비용은 36·68·95·85·17행 절에 있다. 제목은 '분석'을 약속하는데 본문은 개념 소개 수준이라 3~5점이다. description(5행) 'Mispredict 10-20 cycle'은 본문 표(27~32행, 1~15+ cycle)와 범위가 다르다. |
| F | 6 | 271행 '다음 편은 Speculative Execution'은 seriesOrder 12 part2-04-speculative-execution.md와 맞다. 275행 '2-02: Pipeline Stall', 276행 '2-04: Speculative Execution'은 라벨과 대상이 맞다. 관련 항목은 ±1 두 편뿐이고 part2-10·part2-01 연결과 전제 지식 안내가 없다. |
| G | 1 | 본문에 출처 링크가 없다. Cortex-M/A 수치(25~32·93·148·152~158행)에 TRM 이름·판이 없고 PMU 이벤트 번호(164~166행)에 Arm ARM 인용이 없으며 231행 CVE에도 출처가 없다. |

uncertainties:
- 164~166행 PMU 번호(0x10 BR_PRED, 0x11 BR_MIS_PRED, 0x18 BR_RETURN_MIS_PRED)가 part2-10-pmu.md 45·46·50행(0x10 BR_MIS_PRED, 0x11 CPU_CYCLES, 0x18 L2D_CACHE_ACCESS)과 충돌한다. 다른 글과의 모순이라 Arm ARM 이벤트 표로 확인해야 한다.
- 231행 CVE-2017-5754를 'Meltdown·Spectre 계열'이라 하고 KAISER를 완화로 든 부분은 1차 자료 미확인. CVE 번호가 Meltdown 하나에 해당한다는 의심은 기억에 기댄 것이다.
- 196~199행 `it gt; movgt r0,r1`은 r0>r1일 때 r0=r1이 되어 min 동작으로 보인다. ISA 의미 판단이라 미확인.
- 253행 jump table을 'direct jump 형태'라고 한 것은 테이블 경유 indirect branch와 맞지 않아 보이나 미확인.
- 22행 예시와 30·31행 A53 8 cycle, A72 15 cycle은 TRM 미확인.
- 52행 'M0/M3 pure static', 145행 'bx lr 항상 flush', 148행 'M3 mispredict 2 cycle'은 Cortex-M3 TRM 미확인.
- 115·126행 A72 tournament·indirect predictor, 136행 RAS 8~16 entry, 156행 A53 8-entry return stack은 출처가 없다.
- 258행 'asm volatile("b label")은 BHT가 학습 못 함'은 근거가 없어 보이나 미확인.

병합 대상: 병합 대상 없음. 예측기 구조는 시리즈에서 이 글만 다루므로 다음 조치는 보강이다. 판정은 오류 확인으로 우선 조치이고 순서는 93·155행 A53 BHT·BTB 크기를 Cortex-A53 TRM으로 확정 → 265행 정리를 22·27~29행과 맞춤 → 164~166행 PMU 번호를 Arm ARM으로 확인해 part2-10과 맞춤 → 222~231행 Spectre 절은 part2-04로 넘기고 링크만 남김이다.

### `part2-04-speculative-execution.md` — 46점, 우선 조치

confidence: 중간

factcheck: 오류 확인. (1) 65행 'ROB entry (in fetch order):' 그림은 66행에서 add(✓)·sub(✓)를 ldr(⏳)보다 앞 entry에 두는데, 71행은 "이미 실행 완료된 sub, add도 ROB에서 대기합니다. ldr이 완료된 뒤에야 fetch 순서대로 commit합니다"라고 한다. 208행 in-order commit 규칙대로라면 ldr보다 앞선 entry는 ldr을 기다리지 않는다. (2) 66행은 ldr 결과를 `r1=?`로 적지만 20행 `ldr r0, [r1]`에서 ldr이 쓰는 레지스터는 r0이다. (3) 56행 `sub r3, r0, r4   →   physical: p11 = p10 + p4`는 ISA 줄이 뺄셈인데 rename 결과 줄은 덧셈이다. git log(0a9dd7bc·be973200·e85d7684·ac24bb76·3d56a230)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 19~42행 In-order/OoO 비교, 52~60행 renaming, 62~73행 ROB, 103~122행 store forwarding은 교과서 표준 목록이고 저자의 측정·실패 사례가 없다. 이 글만의 것은 136~147행 Cortex-A72 표, 162~168행 임베디드·자동차 코어 표, 174~180행 RISC-V 코어 표인데 셋 다 출처가 없다. 188행 'in-order가 더 빠를 수 있습니다', 192행 '비활성화도 가능합니다'는 기준 없는 완곡 표현이다. 앵커 part1-04(A=10)와 같은 수준. |
| B | 10 | OoO(17행) → renaming(50행) → ROB(62행) → speculative load(75행) → wrong-path(87행) → disambiguation(103행) → 측정(124행) → 단점(149행) → 실수(184행) → 정리(206행)로 기본 흐름은 끝난다. description이 약속한 issue queue는 48행 그림뿐이고 Spectre는 85·101행 한 문장씩이다. ROB 그림 모순(65~71행)과 A72 수치 불확실이 열려 있어 B ≤ 13. |
| C | 5 | 재현 가능한 명령은 127행 `perf stat` 한 줄뿐이고 보드·커널·perf 버전이 없다. 129~131행 'Cortex-A72 ideal: 2-3 / 실제 일반 코드: 1.5-2'는 출처·환경 없는 수치라 C ≤ 8. 134행 해석 규칙은 있으나 예상 출력·합격·실패 관찰이 없다. 19~24·89~97·105~108행은 설명용 어셈블리이고 ```c로 표시돼 있다. |
| D | 9 | 비교: 같은 시리즈 part2-03-branch-prediction.md, part2-05-cache-basics.md, part2-01-pipeline.md, part2-02-pipeline-stall.md, 다른 시리즈 modern-recipes/part2-02-cortex-a-comparison.md. 이 글 54~60행 renaming ↔ part2-02 157~176행, 75~101행 Spectre ↔ part2-03 220~231행, 19~42행 LDR stall 비교 ↔ cortex-a-comparison 40~46행, 136~147행 A72 표 ↔ part2-01 82~97행. part2-05와는 겹침이 없다. ROB·memory disambiguation(62~73·103~122행)은 이 글에만 있다. |
| E | 5 | 제목이 '분석'을 약속하지만 본문은 개념 소개 수준이다(3~5점). 제목 키워드 OoO·ROB·Register Renaming은 17·62·50행에 절이 있다. description(5행)의 'issue queue'는 48행 그림뿐, 'Spectre 측면'은 85·101행 두 문장, 'Cortex-A 사례'는 출처 없는 136~147행 표다. |
| F | 6 | 214행 다음 편 'Cache 기초'는 seriesOrder 13 part2-05-cache-basics.md와 맞다. 218행 '2-03: Branch Prediction', 219행 '2-05: Cache 기초'는 대상을 열어 제목과 맞는 것을 확인했다. 전제 지식(part2-01·2-02) 안내가 없고 69행 `<!-- TODO: TikZ -->`가 남아 ROB 그림이 미완성이며 어셈블리를 ```c로 표시했다(19·89·105·196행). |
| G | 1 | 본문에 출처 링크가 없다. 52·73·136~147행 Cortex-A72 수치(physical register 90, ROB 128, issue queue 32-entry)와 73행 Apple M1 '630+ entry'에 TRM·발표 자료 인용이 없고, 127행 perf 이벤트 이름에 커널·perf 버전이 없다. 192행 패치 이름에도 CVE·커널 문서 연결이 없다. |

uncertainties:
- 52행 'ISA 레벨에서 r0는 16개입니다'는 문장 자체가 성립하지 않는다(레지스터 개수를 뜻한 듯). AArch32 r0~r15, AArch64 x0~x30 중 어느 ISA인지 불명확. 1차 자료 미확인.
- 52·144행 physical register 90+128, 142행 issue queue 32-entry, 143행 ROB 128-entry, 140~141행 3-wide, 145행 실행 유닛 구성은 Cortex-A72 TRM 미확인.
- 141행 Decode 3-wide와 part2-01-pipeline.md 97행 '4-wide superscalar'가 다르다(글 간 모순).
- 73행 Apple M1 ROB '630+ entry'는 출처 없는 수치다.
- 122행 'Cortex-A72는 Memory Order Buffer(MOB)로 관리': MOB는 주로 Intel 문서 용어로, Arm 문서에 같은 이름이 있는지 미확인.
- 127행 perf 이벤트 `br_pred_retired`, `br_misp_retired`가 Linux perf Arm PMU 별칭과 맞는지 미확인.
- 192행 'RETBLEED·SBB 패치': SBB가 무엇인지 불명확하고 Arm 임베디드 대상과의 관련도 미확인.
- 153행 '전력 | die area 2-3배'는 단점 이름과 영향 칸이 다르고 수치 출처가 없다.
- 158행 항공기 flight control의 A53 in-order 사용, 164~166행 R5·R52 용도는 출처 없는 일반화다.
- 204행 Bound-T가 현재도 유지되는 WCET 도구인지 미확인.
- part2-03 231행은 Spectre 영향을 'Cortex-A75 이상'이라 하는데 이 글은 A72를 Spectre와 연결한다(글 간 모순).

병합 대상: renaming 절(54~60행)은 `part2-02-pipeline-stall.md` 157~176행, Spectre 절(75~101행)은 `part2-03-branch-prediction.md` 220~231행과 겹친다. ROB·memory disambiguation은 시리즈 다른 글에 없어 독립 질문이 남으므로 다음 조치는 보강이다. 판정은 오류 확인으로 우선 조치이고, 65~71행 ROB 그림과 66행 r1/r0, 56행 sub/+ 표기를 고친 뒤 겹치는 절은 2-02·2-03 링크로 줄이고 A72 수치를 Cortex-A72 TRM·Software Optimization Guide로 대조한다.

### `part2-05-cache-basics.md` — 47점, 우선 조치

confidence: 중간

factcheck: 오류 확인. (1) 72행은 64 KB direct-mapped, 64 byte line을 Tag 20 / Index 8 / Offset 6으로 나누는데 64 KB / 64 B = 1024 line이라 index는 10 bit여야 하고, 20+8+6=34 bit라 32-bit 주소와도 맞지 않는다. 77~79행(0x1000·0x5000·0x9000이 모두 line 64)은 8 bit index에서만 맞는다. (2) 131행 PLRU 'log N bit' vs 134행 4-way PLRU '3 bits'(log2 4 = 2). (3) 228행 struct Big은 4 + 60 + 4 = 68 byte인데 230행 주석은 '64 byte struct'다. (4) 55행 '16 bytes (Cortex-M4 cache)' vs 184행 'Cortex-M0/M3/M4 | 없음'. git log(0a9dd7bc·be973200·e85d7684·ac24bb76·49f2a443 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | Memory hierarchy 표(19~25행), direct-mapped·set associative·fully associative(67~114행), LRU·PLRU·Random(116~148행), write policy(150~178행)는 교과서 표준 목록이다. 이 글에만 있는 것은 Cortex-M cache 표(182~187행), TCM(198~205행), DMA 뒤 invalidate 함정(246~254행)인데 모두 한두 줄이다. 22~24행 Cortex-A72 지연·크기, 47행 'Exclusive — ARM Cortex-A', 148행 'Random이 WCET 예측 가능'은 출처도 이유도 없다. |
| B | 10 | hierarchy → mapping → replacement → write policy → Cortex-M → TCM → 측정 → 함정 → 정리(13~273행)까지 기본 흐름은 끝까지 간다. 절마다 코드·표 한 조각에 한두 문장이고, 72행 주소 분할과 77~79행 예, 131·134행 PLRU bit 수, 55·184행 M4 cache 유무가 서로 맞지 않는다. 254행 DMA 수신은 invalidate 한 번만 말한다. B ≤ 13, 구간 하단. |
| C | 5 | 재현할 수 있는 것은 210행 `perf stat -e cache-references,cache-misses`와 219~221행 PMU event 이름뿐이고 예상 출력이 없다. 213~215행 miss-rate 기준과 22~24행 cycle 수는 출처·측정 환경 없는 수치라 C ≤ 8. 대상 보드·측정 결과가 없고 230행 크기 주석은 틀렸다. 앵커 part1-04(C 6)보다 실행 코드가 적다. |
| D | 9 | 비교: 같은 시리즈 part2-04-speculative-execution.md(주제 다름), part2-06-cache-miss.md, part2-07-cache-line.md, 다른 시리즈 modern-recipes/part2-06-arm-cache.md. 공개 글 중 PLRU를 다루는 글은 이 글뿐이다(grep). 이 글 44~48행 ↔ 2-06 208~217행, 237~244행 ↔ 2-06 124~139행, 210~215행 ↔ 2-06 110~113행, 52~56행 ↔ 2-07 17~23행, 233행 SoA ↔ 2-07 110~130행, 246~261행 DMA ↔ 2-07 200~218행·modern-recipes 2-06 54~111행, 180~196행 Cortex-M7 cache ↔ modern-recipes 2-06 27~60행. mapping·replacement(67~148행)는 이 글만의 역할이다. |
| E | 7 | 제목의 L1·L2·L3(17~48행), Set Associative(84~104행), Replacement Policy(116~148행)와 description의 direct mapped vs N-way, LRU·PLRU·Random을 모두 본문이 다룬다. 범위 축소는 없다. 독자가 얻는 판단이 15행 한 줄 요약 수준이다. |
| F | 6 | 273행 다음 편 'Cache Miss 분석으로 3C model'은 seriesOrder 14 part2-06-cache-miss.md와 맞다. 277행 2-04, 278행 2-06, 279행 2-07은 대상을 열어 라벨과 제목이 맞음을 확인했다. 그림 두 개(29·36행)가 있다. 전제 지식 안내가 없고 Cortex-M7 DMA 절(196·246행)이 더 정확한 modern-recipes 2-06으로 이어지지 않는다. |
| G | 1 | 본문에 출처 링크가 없다. 22~24·97행 Cortex-A72 cache 크기·associativity, 144행 'Cortex-A53이 PLRU', 167행 write-back + write-allocate, 192~196행 CMSIS 함수에 TRM·CMSIS 버전 표기가 없다. |

uncertainties:
- 97행 'Cortex-A72 L1 D = 4-way'는 기억으로는 2-way라 의심되지만 TRM 미확인(2-06 127행도 같은 값).
- 47행 'Exclusive — ARM Cortex-A'와 2-06 212~217행 'ARM (exclusive)' 일반화는 코어마다 다를 수 있다. TRM 미확인.
- 148행 Random replacement가 'WCET 예측 가능'해 자동차 인증에서 쓴다는 주장은 WCET 문헌에서 LRU를 가장 예측하기 쉬운 정책으로 보는 것과 반대로 보인다. 1차 자료 미확인.
- 21행 Register '32 × 32-bit'를 Cortex-A72 열에 둔 것은 AArch64 범용 레지스터(64-bit)와 맞지 않을 수 있다.
- 184행 'TCM 또는 직접 flash 실행'에서 M0/M3/M4에 TCM이 있는지, 55행 16 byte line이 벤더 flash accelerator를 뜻했는지 미확인(두 줄의 충돌 자체는 오류 확인에 넣었다).
- 27행 '매 단계마다 약 10배 느려지고 10배 커집니다'는 22~23행 표(L1 3-4 → L2 10-15 cycle, 32 KB → 1 MB)와 맞지 않는다. 산문 근사라 오류 확인에는 넣지 않았다.
- 205행 'Cortex-M7·R52 등에 32-256 KB' TCM 크기 범위 출처 없음.
- 254행은 DMA 수신 후 invalidate만 제시하지만 modern-recipes part2-06-arm-cache.md 60~84행은 수신 전 clean+invalidate와 수신 후 invalidate를 둘 다 요구한다(다른 글과의 차이).
- 213~215행 miss-rate 기준(<5%, 10~20%, >30%)과 2-06 112~113행(L1 <5% 좋음, >15% 나쁨)이 다르고 둘 다 출처 없음.
- 22~24행 L1 3-4, L2 10-15, L3 30-50, DRAM 100-300 cycle은 출처·환경 없는 수치다.

병합 대상: 병합 대상 없음. 더블 체크 결과 병합 대상이 지정되지 않았고, D 근거상 mapping·replacement(67~148행, PLRU 포함)는 공개 글 중 이 글만 다룬다. 판정은 오류 확인으로 우선 조치이고, 72·77~79행 주소 분할, 131·134행 PLRU bit 수, 228·230행 struct 크기, 55·184행 M4 cache 유무를 먼저 고친 뒤 보강한다. 실전 절(DMA·Cortex-M7 maintenance·stride)은 part2-06·part2-07·modern-recipes part2-06 링크로 줄이는 방향이다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **1차 자료 대조 커밋 없음 (10편 전부).** git log는 f3283f25·618f908e(작성), 3d56a230(번역투 수정·일괄 발행), 845231cf(TikZ), 4e66cbfc(KaTeX), a746e269·49f2a443·e85d7684(코드 블록·형식), ac24bb76(제목), be973200(topic), 0a9dd7bc(slug)뿐이다. 내부 모순이 없었더라도 10편 모두 `factcheck: 미검증`이다. PE 시리즈 30편이 3d56a230에서 함께 발행되어 시리즈 전체가 같을 가능성이 크다.
- **예시 수치·코드 블록 안의 산술 모순 (8편 이상).** 1-04 89·97행(bucket 0 라벨), 1-05 177·178행(5.12 vs 5.30), 1-06 78행(95~110 ≠ ±5%), 1-07 47·75~77·88~90행, 1-08 219~221·232·236행, 2-01 112·114행(4.98배 vs 200x), 2-04 56행(sub vs +), 2-05 72·77~79·131·134·228·230행. 출처 없는 지어낸 예시 수치를 쓰면서 검산하지 않은 패턴이라, 시리즈 전체 text·코드 예시 블록을 산술 대조해야 한다.
- **본문 1차 출처·버전 표기 부재 (10편 전부, G 1~2).** G는 1-04·1-06이 2(hdrhistogram.org, eembc/coremark 링크), 나머지 8편이 1이다. TRM·Arm ARM·논문(Gustafson 1988, Williams Roofline, Gunther USL)·커널·perf·FreeRTOS 버전이 주장에 붙지 않는다(1-05 31·151·157행, 1-07 17·43·116행, 2-01 41~98행, 2-02 61·137~143행, 2-03 25~32·93·152~158행, 2-04 136~147행, 2-05 22~24·97행).
- **출처·환경 없는 구체 수치로 C ≤ 8, 실제 C 5~6 (10편 전부).** 1-04 77·163·180행, 1-05 47·77·120·130~138행, 1-06 27~31·107~114행, 1-07 135·149~154·174·182행, 1-08 30·61·155·174~175·189행, 2-01 106·108·170~174행, 2-02 61·133·211행, 2-03 25~32·50·66·83·172~174행, 2-04 129~131행, 2-05 22~24·213~215행. 대상 보드·버전·예상 출력이 있는 측정 절차가 한 편도 없다.
- **공통 H2 뼈대 (10편 전부).** '한 줄 요약 → 본문 → 자주 하는 실수(⚠️ 인용 블록) → 정리 → 다음 편은 … → 관련 항목'이 같은 순서다(예: 1-04 13·182·200·210행, 1-05 13·201·219·229행, 1-06 13·220·238·248행, 1-07 13·166·184·193·195행, 1-08 13·241·259·269행, 2-01 13·186·219·229행, 2-02 13·216·260·268·270행, 2-03 13·233·263·271·273행, 2-04 13·184·206·214·216행, 2-05 13·223·264·275행). 각 글에 고유 절이 있어 P0는 아니지만 루브릭 9절 scaled content 수치 기록 대상이다.
- **인접·같은 주제 글과의 내용 반복 (10편 전부, D 4~10).** 1-04 ↔ 1-02(percentile·long tail), 1-05 ↔ RTOS part1-10(같은 cyclictest 출력·PID budget·WCET 문장), 1-06 ↔ 1-02(CoreMark·DMIPS), 1-07 ↔ 2-08·4-03·4-10·6-03(Roofline·Amdahl·USL), 1-08 ↔ 1-03·Part 5(PGO·perf·eBPF·ftrace), 2-01 ↔ 2-02(hazard·load-use), 2-02 ↔ 2-04·2-03·2-10(renaming·IT·PMU), 2-03 ↔ 2-04·2-10(Spectre·PMU), 2-04 ↔ 2-02·2-03(renaming·Spectre), 2-05 ↔ 2-06·2-07·modern-recipes 2-06(DMA·stride). 정본 한 곳을 정하고 나머지는 링크로 줄이는 시리즈 구조 재검토가 필요하다.
- **같은 사실의 글 간 수치 충돌 (6편 관련, 다른 글과의 모순이라 오류 확인 아님).** p99 표본 수(1-04 163행 N=1000 vs 1-06 81·224행 N≥100), CoreMark·DMIPS 값(1-06 107~126행 vs 1-02 174~188행 vs modern-recipes 2-01 110~115행), M3/M4 load-use(2-01 60행 vs 2-01 149행·2-02 61행), Harvard 구조(2-01 122행 vs 2-02 86·88행), PMU 이벤트 번호(2-03 164~166행 vs 2-10 45~50행), A72 decode 폭(2-04 141행 3-wide vs 2-01 97행 4-wide), Triad byte 수·matmul bound(1-07 77·92행 vs 2-08 25·64행). TRM·EEMBC·Arm ARM·McCalpin STREAM으로 한 번에 정한다.
- **제목이 '분석'을 약속하고 본문은 개념 소개 (3편, E 5).** 2-01 2행, 2-03 2행, 2-04 2행. 2-02도 제목에 '분석'이 있으나 PMU 절 덕분에 E 6이다.
- **어셈블리를 ```c 블록에 넣음 (4편).** 2-01 56·126·135·144·194행, 2-02 21·30·54행, 2-03 142~146·196~200행, 2-04 19·89·105·196행.
- **관련 항목이 seriesOrder ±1 두 편뿐이고 같은 주제의 비인접 글 연결 없음 (3편 이상).** 1-06 250~251행(1-03·1-04·modern-recipes part12-02 연결 없음), 2-02 272~273행(part2-10·part2-04 없음), 2-03 275~276행(part2-10·part2-01 없음). 전제 지식 안내는 10편 모두 없어 F가 5~6에 머문다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 10편(전부)은 내부 모순부터 고친다. 산술만으로 정할 수 있는 것(1-04 97행 bucket 0 라벨, 1-05 178행, 1-06 78행, 1-07 47·75~77·88~90행, 1-08 219~221·236행, 2-01 114행, 2-04 56·65~71행, 2-05 72·77~79·131·134·230행)을 먼저 처리하고, 1차 자료가 필요한 것(2-01 60↔149행·145행, 2-02 86·88행, 2-03 93↔155행, 2-05 55↔184행)은 Cortex-M3/M4·A53 TRM을 열어 정한 뒤 출처를 적은 커밋으로 고친다.
- 같은 사실의 글 간 수치 충돌(load-use, Harvard, PMU 이벤트 번호, A72 decode 폭, CoreMark·DMIPS, p99 표본 수, Triad byte 수)은 정본 값을 한 번 정해 관련 글을 함께 고친다. 1-05 217행 PREEMPT_RT mainline 진술은 커널 릴리스 노트로 우선 확인한다.
- 이 시리즈는 `/fact-check-round`로 장마다 1차 자료 대조 커밋을 남기는 대상이다. 그 전까지는 내부 모순을 고쳐도 `factcheck`가 미검증이라 유지 판정이 나오지 않는다.
- 내부 모순 정정 뒤 점수 구간(병합 검토) 기준 후속은 대부분 보강(차별화)이다. 중복 정본 결정이 먼저다: 1-05 ↔ RTOS part1-10, 2-01 ↔ 2-02(hazard 절), 1-07 ↔ 2-08·4-10(공식 정의), 1-08 ↔ 1-03·Part 5(PGO·도구), 1-06 ↔ 1-02(CoreMark·DMIPS). 2-03·2-05는 병합 대상 없이 보강이다.
- F 감점 원인인 2-01 140행 '다음 편' 문장과 2-04 69행 `TODO: TikZ`는 내부 모순 정정과 같은 커밋 범위에서 고칠 수 있다.
- C·G를 올리려면 대상 보드·컴파일러·커널 버전과 실제 측정 출력이 필요하다. 측정 기록이 없으면 수치를 새로 만들지 않고 출처 없는 수치는 지우거나 TBD로 둔다.
