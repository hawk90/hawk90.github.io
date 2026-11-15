# 공개 글 AdSense 평가 — 루프 19

> 대상: 공개 글 10편 (Embedded Performance Engineering, `seriesOrder` 14~23)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 열아홉 번째 루프다. 대상은 `src/content/blog/embedded/performance-engineering/`의 `part2-06-cache-miss.md`~`part3-05-interrupt-latency.md` 10편(Part 2 후반 5편, Part 3 앞 5편)이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part2-06-cache-miss.md` | 10 | 10 | 5 | 9 | 6 | 6 | 1 | **47** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `part2-07-cache-line.md` | 9 | 9 | 5 | 5 | 6 | 6 | 1 | **41** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part2-08-memory-bandwidth.md` | 10 | 8 | 5 | 8 | 5 | 6 | 1 | **43** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part2-09-simd-neon.md` | 8 | 9 | 5 | 3 | 6 | 6 | 1 | **38** | 미검증 | 제외 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part2-10-pmu.md` | 10 | 10 | 6 | 9 | 5 | 4 | 1 | **45** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part3-01-bus-architecture.md` | 10 | 9 | 4 | 8 | 6 | 6 | 1 | **44** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part3-02-bus-contention.md` | 10 | 10 | 5 | 11 | 5 | 6 | 1 | **48** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part3-03-dma-performance.md` | 9 | 7 | 4 | 8 | 6 | 6 | 1 | **41** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part3-04-dma-vs-cpu.md` | 11 | 10 | 6 | 8 | 5 | 6 | 1 | **47** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `part3-05-interrupt-latency.md` | 9 | 8 | 5 | 9 | 4 | 6 | 1 | **42** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |

평균 43.6점(10편 합 436), 범위 38~48점이다. 판정은 우선 조치 5편(2-06·2-08·3-01·3-03·3-04), 병합 검토 4편(2-07·2-10·3-02·3-05), 제외 검토 1편(2-09)이고 유지·검증 대기·보강은 없다. 우선 조치 5편의 점수 구간은 모두 병합 검토(40~59)다. 오류 확인은 5건이고 모두 원문 안의 산술·진술 모순에서 나왔다(1차 자료를 열어 확인한 오류는 없다). 10편 모두 git log에 1차 자료와 대조한 커밋이 없어 나머지 5편은 미검증이다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체, 다음 편(seriesOrder+1)·관련 항목 대상 파일의 존재·제목·seriesOrder·`draft: false`, D 비교 글(같은 시리즈 인접·같은 주제 글, modern-recipes·rtos·hbm 등 다른 시리즈 글)의 해당 행, 3-05 그림의 TikZ 원본 라벨까지이고, 렌더링·광고 배치·sitemap·외부 유사도는 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `part2-06-cache-miss.md` | 48 | 47 | -1 | 없음 |
| `part2-07-cache-line.md` | 41 | 41 | 0 | 없음 |
| `part2-08-memory-bandwidth.md` | 43 | 43 | 0 | 없음 |
| `part2-09-simd-neon.md` | 38 | 38 | 0 | 없음 |
| `part2-10-pmu.md` | 45 | 45 | 0 | 없음 |
| `part3-01-bus-architecture.md` | 44 | 44 | 0 | 없음 |
| `part3-02-bus-contention.md` | 48 | 48 | 0 | 없음 |
| `part3-03-dma-performance.md` | 41 | 41 | 0 | 없음 |
| `part3-04-dma-vs-cpu.md` | 47 | 47 | 0 | 없음 |
| `part3-05-interrupt-latency.md` | 42 | 42 | 0 | 없음 |

1차 합 437에서 최종 436으로 1점 내려갔다. 판정이 바뀐 글은 2편(2-06 병합 검토→우선 조치, 2-09 우선 조치→제외 검토)이다. 부풀림(AP-C-24)은 없다.

- 추가한 오류 확인(2-06): 168행 '회피 — N=1024, working set 8MB'와 174행 'Good — block 64×64, working set 48 KB'. 48 KB는 3×64×64×4 B일 때만 맞고 같은 조건이면 N=1024 행렬 셋은 12 MB다. 8 MB는 행렬 둘만 세야 나오는데 그러면 블록은 32 KB다. 보조로 127~128행 '4-way, set당 4 line'과 132·135행 '매번 conflict'(두 배열은 set당 2 line만 차지)도 함께 성립하지 않는다. 평가자는 이를 uncertainties에 두었으나 AP-C-24에 따라 오류 확인으로 올렸고, B를 11→10으로 낮췄다.
- 기각한 오류 확인(2-09): 233행 주석 'i=8까지 → tail 2 남음'은 '마지막 묶음에 원소 2개'로 읽으면 루프 코드와 함께 참일 수 있다. 121행 MVE 범위 초과와 133행 'predication이 tail 자동 처리'는 vld1q API 의미에 기대는 코드 결함이라 루브릭 3-1상 uncertainties 대상이다. 오류 확인이 빠지면서 총점 38(<40) 구간 판정인 제외 검토가 적용됐다.
- 기각한 보조 근거(3-01): 88행 ARLEN '0=1 transfer, 15=16 transfer' ↔ 116행 'flexible 1-256'은 88행이 인코딩 예시로도 읽혀 내부 모순으로 확정하지 않았다. 21행 APB '단일 사이클' ↔ 123·125~126·219행 '2-cycle' 모순으로 오류 확인은 유지했다.
- 추가한 보조 근거(2-08): 218행 '자동차·항공용 rad-hard SRAM' vs 124~129행 표(자동차 ECU는 flash+SRAM·LPDDR, rad-hard는 누리·항공기 FCC·위성 OBC뿐). 주 근거는 44행 산술이다.
- 추가한 보조 근거(3-03): 185행 'STM32 DMA: ~5 cycle'과 193행 'memcpy 1 byte ≈ 0.5 cycle'로 계산하면 256 byte memcpy는 약 128 cycle인데 189행은 '<256 byte에서는 setup 비용이 더 큼'이라 한다.
- 근거 정정(점수 영향 없음): 2-06 D 줄 번호(4-02 17~20행, 2-07 150~157행, 6-02 112~125행), 2-07 D(4-02 147~153행, recipes 8-03 SPSC 82~95행), 2-08 D(2-07 168~181행, 1-07 53~93행, 3-02 119~129행, hbm ch05 19·74~97·99~103행), 2-10 D(part5-01·recipes part8-12는 draft 필드가 없는 공개 글, tools/perf-flamegraph ch01 추가), 3-02 D(recipes part4-10은 189행), 3-03 D(recipes part4-10 222~224행, part8-03 244~249행), 3-04 D(3-03 196~198·193~194행), 3-05 B·E(6-cycle은 34행 그림 TikZ 원본 27행 라벨에 있음, 산문 절에는 없음).
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. 감점은 2-10 1건이다: 257행 '다음 파트에서는 Compiler & Optimization'·262행 '3-01: Compiler 최적화 단계'인데 실제 seriesOrder 19는 `part3-01-bus-architecture.md`라 F 4.

## 글별 근거

### `part2-06-cache-miss.md` — 47점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순이다. 168행 '회피 — N=1024, working set 8MB'와 174행 'Good — block 64×64, working set 48 KB'는 원소 크기와 세는 행렬 수를 어떻게 잡아도 함께 성립하지 않는다(48 KB = 3×64×64×4 B, 같은 조건이면 N=1024 셋은 12 MB, 8 MB면 블록은 32 KB). 보조로 127~128행 '4-way set assoc ... set당 4 line'과 132·135행 'A[i] = B[i]; // ← 매번 conflict'는 두 배열이 set당 2 line만 차지해 글이 밝힌 조건으로는 매 access conflict가 성립하지 않는다(72~81행 세 배열 예도 같다). 같은 시리즈 6-02 112행도 같은 GEMM을 '12 MB'로 쓰지만 참고일 뿐이다. git log(0a9dd7bc, be973200, ac24bb76, 49f2a443, 4e66cbfc 등)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 3C 정의(17~94행)는 교과서 내용이다. 이 글만의 것은 32 KB·4-way·64 B line에서 128 set과 8 KB 주기 계산(127~129행), 증상으로 세 miss를 가르는 표(118~122행), Cortex-A53 PMU 이벤트와 miss rate 식(98~107행)이다. 112~113행 'L1 < 5%, L2 < 30%'와 202행 '100 cycle'은 출처 없는 기준이고 217행 'ARM은 작은 L2도 효율적'은 근거 없는 일반론이다. 앵커 part7-05 A 9와 비슷. |
| B | 10 | 3C 정의 → 해결책 → PMU 측정 → 구분 표 → false sharing·tiling·prefetch·inclusive/exclusive → 실수 → 정리(13~268행)로 끝까지 간다. 구분 표(118~122행)에 PMU 수치로 가르는 절차가 없고 Conflict가 67·124행 두 절로 나뉜다. 168·174행과 127~135행 내부 모순 두 건과 열린 정확성 불확실(139·191·208~217·229·235~241행)로 AP-C-24에 따라 B ≤ 13, 평가자 11에서 10으로 낮춤. |
| C | 5 | 110행 `perf stat -e r03,r04,r17,r16 ./prog`와 코드 조각은 있으나 보드·커널·컴파일러와 관찰 결과가 없다. 112~113·202행 수치는 출처·환경 없어 C ≤ 8. 29행 prefetch는 루프 밖에서 `i`를 쓰고 175행 `#define B 64`는 172·182행 행렬 `B`와 겹친다. tiling 전후 측정이 없어 4~7 구간. |
| D | 9 | 비교: 같은 시리즈 part2-05, part2-07, part2-08, part4-02, part6-02, 다른 시리즈 modern-recipes part8-03·part9-09. false sharing 141~163행 ↔ 4-02 17~20행·2-07 65~79행, prefetch 187~204행 ↔ 2-07 150~157행(거리 예 100 vs 12 cycle), tiling 165~185행 ↔ 6-02 112~125행. 3C 분류는 2-05 273행이 이 글로 넘기는 고유 역할이다. 후반 절 절반이 겹쳐 5~9 상단. |
| E | 6 | 제목(2행)·description(5행)의 세 miss는 17~94행에서 다룬다. '분석'은 증상 표(118~122행)와 PMU 이벤트 목록(98~107행)뿐이고 분해 절차가 없다. 141~217행은 false sharing·prefetch·inclusive로 범위가 넓어진다. |
| F | 6 | 270행 다음 편 'Cache Line 최적화'는 seriesOrder 15 part2-07과 맞다. 274~276행 2-05(13)·2-07(15)·2-08(16) 라벨·대상·공개 상태가 맞다. 전제 지식(2-05) 안내와 겹치는 절에서 4-02·2-07로 보내는 본문 링크가 없고, Conflict 절이 흩어져 6. |
| G | 1 | 본문 외부 링크 없음(1~276행). 98행 Cortex-A53 perf events, 163행 C++17 `hardware_destructive_interference_size`, 185행 BLIS·MKL·OpenBLAS, 191행 Cortex-A57 prefetcher에 출처·버전이 없다. |

uncertainties:
- 139행 'C 표준 malloc도 page align'은 glibc 문서로 확인하지 않았다.
- 208~217행 Intel inclusive / ARM exclusive 일반화는 Cortex-A53/A72 TRM, Intel 최적화 매뉴얼로 확인하지 않았다.
- 191행 'Cortex-A57 이상은 stride 자동 감지', 229행 'stride detect만'은 TRM 미확인.
- 229행 'Random access는 매번 cold miss'는 3C 정의상 capacity/conflict miss일 수 있다.
- 235~237행 `atomic_int` + `char name[60]`은 두 atomic이 64 B 떨어져 있어 정렬에 따라 false sharing 예가 성립하지 않을 수 있다.
- 175행 `#define B 64`가 182행 `B[k][j]`를 치환해 컴파일되지 않는 것으로 보인다(언어 규칙 판단). 29행 prefetch는 루프 밖 `i`.
- 98~105행 PMU 이벤트 번호는 ARMv8 공통 이벤트 표와 대조하지 않았다.
- 127~135행 conflict 판정은 replacement 정책(A53 L1D pseudo-random 가능)에 따라 일부 conflict 여지가 있으나 '매번'은 성립하지 않는다고 봤다.
- 112행 문턱값, 202행 'L1 miss 100 cycle'은 출처 없는 수치다(2-07 157행은 12 cycle).

병합 대상: 우선 조치가 먼저다(168·174행 working set을 원소 타입 선언 후 같은 계산으로 고치고, 127~135·72~81행 conflict 예는 배열 수를 way 수보다 많게 하거나 direct-mapped/2-way 전제로 바꾼다). 점수 구간 기준 후보는 3C 개념을 `part2-05-cache-basics.md`에, false sharing 절(141~163행)을 `part4-02-false-sharing.md`에, prefetch 절(187~204행)을 `part2-07-cache-line.md`에 붙이는 것이다. 다만 '3C cache miss'는 독립 검색 의도가 있고 2-05 273행이 이 글을 예고하므로 다음 조치는 보강(차별화): 겹치는 후반 세 절은 링크로 줄이고 PMU로 세 miss를 가르는 절차와 Cortex-A53 TRM PMU 표 출처를 넣으며, 112·202행 수치는 1차 자료로 확인하거나 지운다.

### `part2-07-cache-line.md` — 41점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topics, ac24bb76 제목·날짜, 3d56a230 번역투·공개 등)에 ARM TRM·GCC 문서·CMSIS·C++ 표준과 대조한 커밋이 없다. 원문 안에서 동시에 참일 수 없는 두 진술은 찾지 못했다(161행 MEMCTL과 164~165행 코드의 어긋남은 B로 처리).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | alignment(38~59행), false sharing(65~81행), hot/cold(83~108행), SoA/AoS(110~130행), prefetch(132~157행), NT store(168~182행), DMA maintenance(200~226행), hot/cold 속성(228~237행)이 입문 목록 나열이고 절마다 코드 한 조각에 한두 문장이다. 고유한 것은 157행 prefetch 거리 예와 202~220행 Cortex-M7 DMA 예 정도. 81·260·272행은 일반론. |
| B | 9 | 절마다 한계·결과가 빠졌다. 248행은 struct 크기를 '12 byte? sizeof 확인'으로 남긴다. 161행 'MEMCTL register로 제어'인데 163~166행 코드는 SCB_CCR_BP_Msk만 켜고 165행 주석은 '자동'이다. 206~209행은 비동기 DMA 직후 완료 대기 없이 invalidate한다. 불확실이 열려 B ≤ 13, 실제로는 5~9 구간. |
| C | 5 | 실행 환경·측정 결과가 없다. 59행 '2 cycle 추가', 81행 '10x slowdown'은 출처 없는 수치라 C ≤ 8. 측정 절차는 81행 한 줄. 29~35행 ```c 블록에 C++ 코드, 50행 `alignas(64) struct Foo { ... };`, 194행 `T data[CAPACITY]`는 조각이다. 4~7 구간. |
| D | 5 | 비교: 같은 시리즈 part2-06(14), part2-08(16), part4-02(31), 다른 시리즈 modern-recipes part8-03·part2-06. recipes 8-03과 절 구성이 거의 같다: alignas 38~51 ↔ 51~64, false sharing 65~79 ↔ 66~80, SPSC 184~198 ↔ 82~95(pad 식까지 같음), SoA 110~130 ↔ 99~125, hot/cold 83~108 ↔ 126~142. 4-02 147~153행 queue padding이 186~195행과 같고, 2-06 141~163·187~204행이 65~81·132~157행과 같은 질문이다. DMA 200~226행 ↔ recipes part2-06(제목 대응). 5~9 하단. |
| E | 6 | 제목의 Alignment·Prefetch·False Sharing과 description의 SoA·AoS는 모두 다룬다. 다만 '처리'에 비해 코드 한 조각 수준이고, 제목에 없는 NT store·DMA·hot 속성(168~237행)이 절반 가까이다. |
| F | 6 | 282행 다음 편 'Memory Bandwidth'는 seriesOrder 16 part2-08과 맞다. 286행 2-06, 287행 2-08 라벨과 대상이 맞다. 전제(2-05) 안내와 part4-02 링크가 없어 6. |
| G | 1 | 1차 출처 링크 없음. 19~25행 line size 표, 143~147행 `__builtin_prefetch` 인자, 176행 STNP, 222~226행 CMSIS 함수 표에 문서·버전이 없다. |

uncertainties:
- 161행 Cortex-M7 MEMCTL 레지스터 존재와 164행 CCR.BP 의미는 Cortex-M7 TRM 미확인.
- 176행 'STNP는 cache를 우회'는 ARMv8 ARM상 non-temporal 힌트인지 미확인.
- 179행 `__builtin_nontemporal_store`가 Clang builtin인지 미확인.
- 41·50행 선언자 없이 struct 앞에 둔 정렬 속성이 타입에 적용되는지 미확인.
- 202~212행 DMA 시작·invalidate 순서는 STM32 HAL·AN4839 미대조.
- 251행 'ARMv6+ ... Cortex-M0/M1은 fault'는 M0/M1이 ARMv6-M이라 오해 소지(기억 기반).
- 81행 false sharing 지표로 `cache-references`가 적절한지 미확인.
- 24·25·59·81행 수치는 출처 없음.
- 157행(12 cycle)과 2-06 202행(100 cycle) prefetch 전제 불일치는 글 사이 문제라 오류 확인에 넣지 않았다.
- 248행 struct 크기 답 없음.

병합 대상: `src/content/blog/embedded/modern-recipes/part8-03-cache-alignment.md`(alignas·padding·SPSC·SoA·hot/cold 절이 거의 같음), `src/content/blog/embedded/performance-engineering/part4-02-false-sharing.md`(false sharing·queue padding 코드 중복). 다음 조치는 보강이다. 이 글은 seriesOrder 15 자리를 차지해 지우면 순서가 비므로, false sharing·SPSC 절은 4-02로 넘기고 측정으로 고르는 prefetch 거리·SoA 전환 같은 Part 2 고유 질문(PMU 이벤트, 환경, 결과)으로 좁힌다. 차별화가 안 되면 recipes 8-03과의 중복 때문에 제외 검토로 넘긴다.

### `part2-08-memory-bandwidth.md` — 43점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 44행 "`3200 × 4 byte / 8 = 1600 MB/s × 2 = 12.8 GB/s`"에서 1600 MB/s×2는 3.2 GB/s라 중간값과 결과가 함께 참일 수 없다. 이론치를 3.2 GB/s로 잡으면 39행 실측 Copy 4.2 GB/s가 이론치를 넘는다. 같은 44행 '실측은 그중 25-30%'도 39행 4.2/12.8≈33%와 맞지 않고 215행 정리는 '25-50%'다. 보조로 218행 '자동차·항공용 rad-hard SRAM'은 124~129행 표(자동차 ECU는 126행 내장 flash+SRAM·127행 LPDDR3/4, rad-hard는 128행 누리·항공기 FCC와 129행 위성 OBC뿐)와 맞지 않는다. git log(0a9dd7bc, be973200, ac24bb76, 49f2a443·fec6fe94)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | STREAM 표(21~26행), Roofline 두 줄(59~60행), CCN 한 문장(69·73행), perf 이벤트(77~85행), STM32H743(93~100행), Snapdragon 845(110~117행), rad-hard(124~131행), NUMA(137~150행), DMA(156~162행), NT store(166~175행) 나열. 고유한 RPi 4 수치(39~42행)와 모바일 예산(112~118행)은 출처·환경이 없다. 48·51행은 refresh를 두 번 세고, 181행은 조건 없는 단정. |
| B | 8 | 'Bus Saturation 측정'은 84행 환산식 한 줄이고 판정 기준이 없다. Roofline 절(59~64행)에 ridge point·peak 값이 없다. 169행은 정의되지 않은 `value`를 쓰고 168행에서 쓴 dst[i]에 다시 저장한다. B ≤ 13, 5~9 구간. |
| C | 5 | 37~42행 RPi 4 실측에 OS·컴파일러·STREAM 버전·스레드 수가 없다. 110·131·162·195행 수치도 출처·환경 없어 C ≤ 8. perf stat(79~81행)·numactl(138·145행)에 기대 출력이 없고 204~208행은 의사코드. |
| D | 8 | NT store 166~175행 ↔ part2-07 168~181행(같은 루프·문장), Roofline 55~64행 ↔ part1-07 53~93행(더 자세함), r19·r1d 77~85행 ↔ part3-02 119~129·267행(판정 기준까지 있음), 103행 DTCM ↔ part2-05 201~202행. 다른 시리즈 hbm/chapter05-bandwidth-bottleneck.md 19·74~97·99~103행. 고유 역할은 임베디드 메모리 계층 훑기인데 얕다. 5~9. |
| E | 5 | 제목은 'STREAM·Roofline·Bus Saturation 측정'을 약속하나 STREAM은 표와 한 줄(21~33행), Roofline 두 줄(59~60행), saturation 84행 한 줄이다. description의 'DDR bandwidth'는 44·110행 언급뿐이고 89~150행은 제목에 없는 범위. 3~5. |
| F | 6 | 221행 다음 편 'SIMD/NEON'은 seriesOrder 17 part2-09와 맞다. 225행 2-07, 226행 2-09 라벨·대상이 맞다. part1-07·part3-02 링크와 전제 안내가 없고 목록 구조라 6. |
| G | 1 | 19행 STREAM, 53행 Hennessy & Patterson 논문에 링크·서지가 없다. 93~100행 RM 판, 79~81행 TRM 인용 없음. |

uncertainties:
- 37~42행 RPi 4 STREAM 수치는 출처·환경 없음.
- 53행 논문 실재 여부 미확인.
- 69행 'Cortex-A57 이상 SoC는 4-cluster mesh'는 CCN TRM 미대조.
- 84행 BUS_ACCESS 한 번이 cache line인지 bus beat인지 A53 TRM 미대조.
- 95~99행 STM32H743 wait state는 RM0433 미대조.
- 108행 'Cortex-A72' 절 제목과 Snapdragon 845 코어 일치 여부, 110행 LPDDR4-1866 단위(MT/s면 약 15 GB/s) 미확인.
- 131·141·162행 수치 출처 없음.
- 63행 '1/24 byte' 단위 표기, 64행 '3 N^2 byte' 원소 크기 누락 후보.
- 64행 matmul compute-bound와 part1-07 93행 'memory-bound'는 글 사이 차이라 오류 근거로 쓰지 않았다.
- 169행 `value` 미정의(AP-C-35 후보).
- 181행 DDR4 비교 단정은 workload 조건 없음.

병합 대상: 글 전체를 흡수할 단일 대상은 없다. 절별로 Roofline(55~64행)은 `part1-07-modeling.md`, NT store(164~175행)는 `part2-07-cache-line.md`, BUS_ACCESS 측정(75~85행)은 `part3-02-bus-contention.md`와 겹친다. 우선 조치로 44행 산술과 218행 정리 문장을 먼저 고치고, 다음 조치는 보강이다(사유: '임베디드 SoC에서 STREAM으로 DRAM 대역을 재고 이론치와 비교'하는 독립 검색 의도). 측정 환경·출처를 달고 중복 절은 해당 글 링크로 바꾼다.

### `part2-09-simd-neon.md` — 38점, 제외 검토

confidence: 중간

factcheck: 미검증. git log(3d56a230 번역투·발행, a746e269 코드블록, ac24bb76 제목, be973200 topic, 0a9dd7bc slug)에 1차 자료 대조 커밋이 없다. 평가자가 든 233행은 '마지막 묶음에 원소 2개(10-8=2)'로 읽으면 코드와 함께 참일 수 있어 내부 모순 기준을 넘지 못하고, 121행 MVE 범위 초과는 vld1q API 의미에 기대므로 uncertainties로 옮겼다. 140행 A78·X1 SVE 여부는 Arm 개발자 페이지가 리다이렉트만 돌려줘 확인하지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 8 | 고유한 것은 dot product horizontal sum(102~104행)과 MVE·NEON 차이 세 줄(132~134행) 정도. scale·restrict·add_neon·add_sve·4-accumulator 코드(30~34, 56~58, 66~76, 145~155, 186~196행)는 modern-recipes part8-07과 사실상 같다. 15·111행은 출처 없는 일반론, 251행은 완곡 표현. 6~12 하단. |
| B | 9 | NEON → auto-vectorize → restrict → intrinsics → dot → MVE → SVE → 측정 → reduction → 정렬 → 함정 → 정리 순서는 있다. 측정 절(164~176행)은 주석 세 줄과 한 문장, reduction 예(186~197행)는 accumulator 합산·tail이 없고, MVE 예(120~127행)는 133행 predication을 쓰지 않는다. SVE2는 212·259행뿐. 5~9. |
| C | 5 | 222~226행 `-fopt-info-vec`와 예상 출력은 재현 단서다. 컴파일러·코어·보드가 없고 26행 `-mfpu=neon`(AArch32)과 19행 v0-v31(AArch64)이 섞였다. 173·207·111행 수치는 출처 없어 C ≤ 8. 233행 주석은 실패 양상을 모호하게 적었다. |
| D | 3 | 비교: 같은 시리즈 part2-08·part2-10(겹침 없음), 다른 시리즈 modern-recipes part8-07-simd.md. scale 30~34 ↔ 8-07 55~59, 4-accumulator 186~196 ↔ 185~196, tail 함정 230~238 ↔ 245~252. 고유 내용은 dot product(92~108행)와 MVE 차이(130~134행)뿐. 1~4 구간. |
| E | 6 | 제목의 128-bit Vector(17~21행)·Auto-Vectorization(23~59행)·SVE(138~160행)와 description의 Intrinsics·Helium(61~136행)이 있다. SVE2는 212·259행 한 줄씩이라 부분 이행. |
| F | 6 | 262행 다음 편 'PMU'는 seriesOrder 18 part2-10과 맞다. 266행 2-08(16), 267행 2-10 라벨·대상이 맞다. recipes 8-07·8-08이 이 글을 링크하지만 이 글은 그쪽으로 링크하지 않고 전제 안내가 없다. |
| G | 1 | NEON/MVE/SVE intrinsics reference·GCC 문서 링크 없음, 컴파일러 버전·코어 표기 없음. |

uncertainties:
- 233행 N=10에서 i=8일 때 process_4가 8~11번을 처리해 범위를 넘는다. 주석 해석이 갈려 내부 모순으로 단정하지 않았다. 230행 'Tail handling 누락'과 실제 결함(범위 초과)의 관계는 fact-check에서 정리.
- 121~126행 MVE 예는 predicate 없는 vld1q/vst1q로 범위를 넘을 수 있다. 133행과의 관계는 Arm MVE intrinsics 문서(vctp·_z)로 확인.
- 140행 'A78·X1 등에 SVE 또는 SVE2'는 기억과 어긋나나 Arm 페이지 리다이렉트로 확인 실패. TRM으로 확인하면 오류 확인 후보.
- 212행 'gather/scatter는 SVE2만' 미확인.
- 251행 'NaN/Inf ... flush-to-zero'는 FTZ가 denormal 처리라는 점과 맞지 않아 보인다.
- 19·26·37행 AArch32/AArch64 문법 혼재 미대조.
- 26행 `-ftree-vectorizer-verbose=2` 현행 GCC 존재 미확인.
- 167·171행 비교 대상 코어 불명확.
- 197행 '16-way ILP' 출처 없음.

판정 근거: 총점 38로 40 미만이고 허브·첫 글이 아니어서 보강 예외가 없다. 고유 내용이 dot product·MVE 차이뿐이고 나머지는 modern-recipes part8-07과 같은 코드다.

### `part2-10-pmu.md` — 45점, 병합 검토

confidence: 중간

factcheck: 미검증. git log 11건(42ebbcbb stub, 618f908e 초안, 845231cf TikZ, 3d56a230 번역투·공개, 4e66cbfc KaTeX, fec6fe94, ac24bb76, fa55144d, be973200, 0a9dd7bc, 3232b1be) 중 ARM ARM·TRM·RISC-V priv spec·SiFive U74 manual 대조 커밋이 없다. 231행 2^32/1GHz≈4초, 160행 1000Hz=1ms 산술은 맞고 내부 모순은 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 38~51행 event 표, 57~71행 perf 명령, 107~112행 DWT CYCCNT는 표준 목록이다. 고유한 것은 IPC·MPKI·mispredict·stall 비율과 문턱(77~93행), Cortex-M WCET overrun 로깅(183~193행), multiplex 주의(199~207행)인데 문턱값은 출처가 없다. 53·245행은 완곡 표현, Top-Down(95~101행)은 그림과 두 문장. |
| B | 10 | 흐름은 끝까지 간다. 87행 BRANCHES는 38~51행 표에 없고, 97~101행 Top-Down은 분류 기준·식이 없고, 125행 CPI 식은 설명이 없다. 245행은 ISR 제외 방법을 적지 않았다. 불확실(114·125·141~145·219행)로 B ≤ 13. |
| C | 6 | 26~34·147~151행 레지스터 코드와 57~71·155~164행 perf 명령은 있으나 보드·커널·perf 버전·예상 출력이 없다. 166행 '1-3%', 82~93행 문턱값은 출처 없어 C ≤ 8. 관찰·합격 표가 없다. |
| D | 9 | 인접 part2-09·part3-01은 겹침 없음. part1-03 122~141행(pmccntr_el0, event, multiplex)이 23·33·38~51·197~207행과, part2-03 161~170·268행이 62·87~89행과, part2-06 110행이 65행과, part5-01 45~57·90행이 235~238·77행과, part5-02 46~50행이 65행과, part5-07 182~184행이 185~187행과 겹친다. 다른 시리즈 modern-recipes part8-12 59~61행, tools/perf-flamegraph ch01(draft) 16·20행. 5~9. |
| E | 5 | description의 항목은 본문(17~71·128~151행)에 있으나 제목 '분석 — 정밀 성능 진단'에 비해 진단 사례·측정값 해석이 없다. description '6+ counter'는 21행 '6'·'4~'와 맞지 않는다. |
| F | 4 | 257행 '다음 파트에서는 Compiler & Optimization'인데 seriesOrder 19는 `part3-01-bus-architecture.md`('임베디드 Bus Architecture — AHB·AXI·CHI 진화와 5-Channel')다. 262행 '3-01: Compiler 최적화 단계'는 링크가 없고 라벨이 틀렸다. 261행 2-09는 맞다. 다음 편 안내가 틀려 F ≤ 5. |
| G | 1 | 1차 출처 링크 없음. 38~51행 event 표, 137~145행 U74 event, 103~122행 DWT에 문서·판 표기가 없다. |

uncertainties:
- 21~22행 M-class counter 수·32-bit 폭은 ARMv8.1-M·ARMv8.5 PMU와 대조하지 않았다.
- 105·253행과 part1-03 124행의 Cortex-M PMU 표현이 엇갈린다.
- 114행 LSU·FOLD·CPI counter의 M7 전용 여부, 125행 CPI 식 미확인.
- 48~49행 0x18 L2D_CACHE_ACCESS와 0x16의 관계 미확인.
- 45~46행(0x10 BR_MIS_PRED, 0x11 CPU_CYCLES)과 part2-03 165~166행이 다르다(글 간 모순).
- 141~145행 U74 event ID는 manual 인코딩과 대조하지 않았다.
- 15·249행 'overhead 거의 0'과 166행 '1-3%'는 counting·sampling 구분이 없다.
- 166·82~93행 수치 출처 없음, 195행 KSLV-II 주장 출처 없음.
- 199행 '12개'와 202행 7개 나열(산문 개수, 점수 외).
- 219행 'OoO CPU'를 Cortex-M DWT 예에 적용.

병합 대상: `part1-03-measurement.md` 122~141행 PMU 절(같은 event·multiplex 축약본). 'PMU 하드웨어 카운터'는 독립 검색 의도가 있어 이 글을 합치지 않고 다음 조치는 보강이다. 1-03 PMU 절은 이 글 링크로 줄이고, 이 글은 실제 보드·커널의 perf stat 출력과 IPC·MPKI 해석, ARM ARM·TRM·RISC-V priv spec 출처, Top-Down 계산식을 더한다. 257·262행 다음 편·관련 항목도 함께 고친다.

### `part3-01-bus-architecture.md` — 44점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 21행 AMBA 표는 APB를 '단일 사이클, 단순'으로 적고, 123행은 '2-cycle (setup + access)'에 125~126행 Cycle 1·Cycle 2 절차까지 적으며, 219행도 'APB는 단순한 2-cycle 프로토콜'이라 한다. 같은 프로토콜의 전송 사이클 수에 대한 두 진술은 함께 참일 수 없다. 88행 ARLEN과 116행 '1-256'은 인코딩 예시로도 읽혀 근거에서 뺐다. git log(0a9dd7bc, be973200, ac24bb76, 03012dec·49f2a443)에 1차 자료 대조 커밋이 없고 AMBA 명세는 열지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 17~27행 AMBA 표, 41~59행 채널 신호, 81~89행 burst 인코딩, 190~195행 RESP는 명세 요약이다. 고유한 것은 92행 cache line fill 예, 157~175행 STM32H7 bus matrix, 197행 bus fault 연결 정도. 105·142행은 출처 없는 수치, 153행은 방법 없는 일반론. 앵커 part1-04 수준. |
| B | 9 | AMBA 표 → AXI 채널 → ID/OoO → burst → outstanding → AHB → APB → NoC → A72 → 측정 → STM32H7 → contention → RESP → 함정 → 정리로 끝까지 간다. CHI·ACE는 24·25·136·142행 한 줄씩, 측정 절(144~153행)은 metric 이름뿐. 21↔123·219행 모순으로 B ≤ 13, 5~9. |
| C | 4 | 144~153행 측정 표는 정의만 있고 절차·관찰값이 없다. 105·142·169행 수치는 출처 없어 C ≤ 8. 203행 산술은 정의에서 나온 것뿐. 4~7 하단. |
| D | 8 | 비교: part2-10(18, 겹침 없음), part3-02(20), modern-recipes part11-04-axi.md. 11-04와 37·61행 handshake ↔ 32·44행, 94~103행 outstanding ↔ 147~162행, 203~205행 4KB boundary ↔ 100~103·120행(거의 같은 문장), 207~211행 ID deadlock ↔ 164~175·229~231행, 186행 QoS ↔ 176~191행. 3-02와는 181~186행 ↔ 51~60행. AMBA 표·AHB-Lite·APB·STM32H7은 고유. 5~9. |
| E | 6 | 제목의 AHB·AXI·5-Channel은 33~77·107~119행에서 다루나 CHI는 25행 표 한 칸과 136행 한 문장, description의 ACE는 24·142행 한 줄씩이다. 136행 서버 SoC부터 155행 STM32H7까지 섞여 독자가 흐리다. |
| F | 6 | 230행 다음 편 'Bus Contention 분석'은 seriesOrder 20 part3-02와 맞다. 234행 2-10(18), 235행 3-02 라벨·대상이 맞다. recipes 11-04 연결·전제 안내가 없어 6. |
| G | 1 | 1차 출처 링크 없음. AMBA 판(AXI3/AXI4/AMBA 5)을 밝히지 않아 88·116행 기준을 알 수 없고, 155~175행 RM 번호, 142·105행 TRM 인용이 없다. |

uncertainties:
- 88행 ARLEN 0~15와 116행 1-256은 AXI3·AXI4 혼용으로 보이나 88행이 예시인지 불분명해 확정하지 않았다.
- 142행 'CCI-400은 4 cluster'는 ACE 포트 수와 맞지 않을 수 있다(TRM 미확인).
- 158·162행 M7의 matrix 접속 인터페이스 표기 차이, 161행 M0 ITCM·DTCM master 여부, 169행 AXI SRAM 512 KB는 RM0433 미확인.
- 22~25행 AMBA 도입 연도 미확인.
- 105행 A72 outstanding 수치 출처 없음.
- 209행 ID deadlock 메커니즘 AXI 명세 미확인.
- 116행 AHB-Lite burst 목록에 WRAP·undefined INCR 누락 여부 미확인.
- 81~90·157~175·190~195행 text 블록에 표·목록 내용(§5 후보, 점수 외).

병합 대상: `src/content/blog/embedded/modern-recipes/part11-04-axi.md`(5채널 handshake·outstanding·4KB boundary·ID deadlock·QoS 겹침). 다음 조치는 보강: Part 3 진입 글로 AMBA 계층(AHB-Lite·APB·ACE/CHI)과 STM32H7 bus matrix처럼 11-04에 없는 역할이 있다. 먼저 21행 APB '단일 사이클'을 AMBA APB 명세로 바로잡고, 88·116행에 명세 판을 적고, AXI 세부는 11-04로 링크해 줄이며 측정 절차·CHI/ACE 설명을 보강한다.

### `part3-02-bus-contention.md` — 48점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(42ebbcbb stub, fa6eb0c8 Part 3 본문 9편 일괄 작성, 845231cf, 3d56a230, 4e66cbfc, a746e269·fec6fe94·49f2a443·e85d7684, ac24bb76, be973200, 0a9dd7bc)에 CCI-400 TRM, RM0433, Arm ARM PMU 표 대조 커밋이 없다. 196~199행 3쌍 나열 vs '4 simultaneous'는 표기 실수인지 불명확해 uncertainties로 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 17~55행 arbitration 정책 소개는 입문 목록이다. 고유한 것은 89~115행 starvation 시나리오와 해결, 231~235행 같은 AXI ID로 OoO 불가, 237~245행 '모든 master QoS 최대는 의미 없음', 251~258행 DMA busy-wait 함정. 71~73·104·112·209~211·221~224·240~242행 코드는 가상 구조체라 선택 기준으로 이어지지 않고 178·245행은 근거 없는 단정. |
| B | 10 | 정책 → CCI-400 → STM32H7 → starvation → 측정 → 해결 → 실수 → 정리로 간다. '진단·측정' 절(117~143행)은 perf 한 줄(128행)과 예시 숫자(129행), 막대(138~141행)뿐이고 starvation 관찰 방법이 없다. 86·122·158행 불확실로 B ≤ 13. |
| C | 5 | 128행 `perf stat -e r19,r1d` 하나이고 129행은 환경 없는 예시 수치(C ≤ 8). 설정 코드 대부분이 가상 레지스터, 86행 HAL 함수는 존재 미확인. 97·202·223행 수치 출처 없음. 4~7 하단. |
| D | 11 | part3-01 179~186행 'DMA·CPU Contention'이 51~55·67·104·263행과, part3-01 155~177행 STM32H7 matrix가 76~87·265행과 겹친다. part3-03은 25·264행 한 줄. modern-recipes part11-04-axi.md 177~190행 QoS 예가 69~74·239~242행과 같다. modern-recipes part4-10은 189행 언급뿐. starvation·regulator·실수 절로 역할은 구별된다. |
| E | 5 | 제목은 'Arbitration·QoS·Starvation 측정'을 약속하나 측정은 perf 한 줄과 예시 차트, starvation은 89~99행 텍스트 시나리오뿐이다. description의 'BUSY counter'는 본문에 그 이름으로 없다(123행 BUS_CYCLES). 3~5. |
| F | 6 | 269행 다음 편 'DMA Performance'는 seriesOrder 21 part3-03과 맞다. 273행 3-01(19), 274행 3-03(21) 라벨·대상이 맞다. 전제(3-01 AXI ID·QoS) 안내와 recipes 11-04 연결이 없어 6. |
| G | 1 | CCI-400(55·67·220행), STM32H7(76~87행), PMU(121~128행), A72 ARID(235행)에 TRM·RM·판 번호가 없고 코드에 SoC·HAL 버전이 없다. |

uncertainties:
- 67행 'CCI-400 5 master와 3 slave'는 TRM 미대조, part3-01 142행과 표현이 다르다.
- 85~86행 `__HAL_RCC_AXI_CLK_ENABLE()`, `HAL_AXIBusMatrix_ConfigPriority(...)` 존재 미확인.
- 78행 'slave 6, master 7, 42 path'는 RM0433 미대조, part3-01 158~174행은 master 6개.
- 122행 `BUS_ACCESS_CHKD`, 128행 r19·r1d 번호 미대조.
- 125행 BUS_ACCESS/BUS_CYCLES를 utilization으로 볼 근거 없음.
- 158행 'TCM은 bus matrix 우회'·153행 'DMA와 충돌 없음'은 AHBS 경로로 조건부일 수 있다.
- 164행 `write_l2_lockdown` 존재 미확인.
- 196~199행 3쌍 나열 vs '4 simultaneous', 202행 '4배'.
- 235행 A72 ARID 'thread' 필드는 SMT가 없어 의심.
- 245행 fallback 동작 출처 없음, 97·223·178행 수치·단정 출처 없음.

병합 대상: `src/content/blog/embedded/performance-engineering/part3-01-bus-architecture.md` 179~186행(DMA·CPU Contention)과 155~177행(STM32H7 matrix)이 이 글 51~87행과 겹친다. 'bus contention·starvation 진단'은 독립 검색 의도가 있어 다음 조치는 보강이다. 가상 CCI 레지스터 코드를 CCI-400 TRM의 실제 레지스터로 바꾸거나 의사 코드로 표시하고, starvation을 관찰하는 PMU 절차를 출처·환경과 함께 넣으며, 3-01 Contention 절은 이 글 링크만 남기는 정리를 함께 검토한다.

### `part3-03-dma-performance.md` — 41점, 우선 조치

confidence: 중간

factcheck: 오류 확인. (1) 193~198행은 CPU 0.5·N, DMA 50+N 모델로 교차점을 'N = -100 (?)'로 직접 계산해 양수 N에서 DMA가 사이클로 이기지 못하는데, 202행은 '큰 copy(>256 byte)는 DMA가 유리합니다'라 하고 268행 정리도 같다. (2) 185행 'STM32 DMA: ~5 cycle'과 193행 memcpy 0.5 cycle/byte로 256 byte는 약 128 cycle인데 189행은 '< 256 byte에서는 DMA setup 비용이 더 큽니다'라 한다. 185행(~5)과 194행(~50) 차이는 대상이 달라 보조로만 둔다. git log(0a9dd7bc, be973200, ac24bb76, 49f2a443, 4e66cbfc, 3d56a230, 845231cf, fa6eb0c8, 42ebbcbb)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 17~25행 throughput 표, 129~148행 clean/invalidate, 233~244행 stack 버퍼 함정은 흔한 목록이다. 고유한 것은 250~256행 MPU 경계, 258~260행 burst·FIFO depth 함정인데 근거가 없다. 손익 분기(191~202행)는 음수 해로 끝나고 200행 일반론으로 넘어간다. 38·125행은 근거 없는 단정. |
| B | 7 | 범위는 넓지만 절마다 코드 조각과 한두 문장이다. Chain(93~103행)은 그림과 두 문장, SG descriptor(75~88행)는 컨트롤러 형식 미표기, double buffer(105~125행)는 overrun 한계 없음, 손익 분기 절은 모델과 결론이 맞지 않는다. B ≤ 13, 5~9. |
| C | 4 | 185~187·193~194·38·125행 수치는 출처·환경 없어 C ≤ 8. 31·35~37행은 HAL_DMA_Init 의사 코드, 84~87행은 포인터를 uint32_t에 넣고 `base`가 미선언, 176행 `.uncached` 링커 설정 없음. 4~7 하단(앵커 part6-09 C 4). |
| D | 8 | part3-04 35~76행이 191~202행과 같은 질문(수치는 50 cycle·0.5N vs 200 cycle·N/3), part6-04 126행이 27~125행 세 주제를 사례로, part3-02 145행은 25행 한 줄만. modern-recipes part4-10 59~64·66~73·222~224행이 27~41·129~148·233~244행과, part8-03 244~249행이 150~161행과 겹친다. MDMA(43~61행)·MPU(163~179행)는 고유. 5~9. |
| E | 6 | 제목의 Burst·SG·Chain·Cache 일관성은 27·63·93·127행 절이 있으나 Chain은 부분 이행이고 '성능 최적화'에 측정·전후 비교가 없다. description의 double buffer는 105~125행. |
| F | 6 | 270행 다음 편 'DMA vs CPU 손익 분석'은 seriesOrder 22 part3-04와 맞다. 274행 3-02(20), 275행 3-04 라벨·대상이 맞다. part6-04·cache 글 링크, 전제 안내가 없다. |
| G | 1 | 출처 링크 없음. RM 판·HAL·커널 버전 없음. STM32H7(43~61행), M7(127행), M4(193행), i.MX SDMA(186행)가 섞여 수치 환경이 연결되지 않는다. |

uncertainties:
- 61행 STM32H7 DMA1/2 memory-to-memory 지원 여부는 RM0433 미확인.
- 31·35~37행 `.BurstSize`·`DMA_BURST_INC4`의 HAL 존재 미확인.
- 56행 MDMA BufferTransferLength와 burst의 관계 미확인.
- 84~87행 포인터 대입·`base` 미정의(언어 규칙 판단이라 제외).
- 41행 64-byte sweet spot과 156행 M7 32 byte line의 대상 불명확.
- 216행 dma_sync_wait 현재 권장 여부 미확인.
- 229·125·266행 단정 출처 없음.
- 176행 링커 스크립트 없음.

병합 대상: `src/content/blog/embedded/performance-engineering/part3-04-dma-vs-cpu.md`. 이 글 181~202행(DMA Latency·손익 분기)은 3-04 35~76행과 같은 질문이라 모순된 모델을 지우고 3-04로 넘긴다. 나머지 17~179행은 part6-04·modern-recipes part4-10과 일부 겹치지만 MDMA·MPU 절은 고유하다. 다음 조치는 보강이다: 먼저 189·202행 256 byte 기준과 185·193~198행 산술 모순을 STM32 RM·ARM TRM이나 측정으로 고치거나 지우고, 38·125·185~187행 수치에 출처·환경을 붙이거나 지운다.

### `part3-04-dma-vs-cpu.md` — 47점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 49행 '200 cycle은 약 60 byte의 CPU memcpy에 해당'은 같은 글 25~31행 표(64 B = 28 cycle, 256 B = 92 cycle, 1024 B = 350 cycle)와 53행 공식(CPU cost = N/3 cycle)으로 계산하면 200 cycle ≈ 550~600 byte, 60 byte ≈ 20~28 cycle이라 성립하지 않는다. 이 등가가 283행 정리('60-200 byte 등가')로 이어진다. git log(0a9dd7bc, be973200, ac24bb76, 4e66cbfc 등)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | Path A/B 코드(63~72행)로 CPU offload가 이득이라는 관점, DMA 유리(133~162행)·CPU 유리(164~183행) 구분, setup·polling·alignment 함정(224~253행)이 이 글의 구조다. break-even 공식(53~55행)은 N < 0, 76행 rule of thumb은 유도 없음, 수치 표는 출처 없음, 288행은 결론을 측정으로 넘긴다. 6~12 상단. |
| B | 10 | CPU memcpy → DMA setup → break-even → 최적화 → 사례 → 측정 → 함정 → 정리로 간다. break-even은 55행 N < 0, 59행 '다른 일에 달려 있습니다'로 미뤄지고 49행 등가가 표·공식과 모순된다. NEON·glibc 절(106~131·213~222행)은 연결이 약하다. B ≤ 13. |
| C | 6 | DWT CYCCNT 코드(187~198행)는 있으나 기대 결과·합격 기준이 없다. 25~31·41~47·202~209행 표는 컴파일러·옵션·메모리 영역 없이 수치만 있어 C ≤ 8. 206~209행 '220 - other'처럼 값이 빈 칸이 있다. 4~7. |
| D | 8 | part3-03 181~202행이 35~59행과 같은 질문·방식이다(3-03 196~198행 'N = -100 (?)' ↔ 53~55행 'N < 0', 3-03 200행 ↔ 57·285행, 3-03 268행 ↔ 284행). 상수는 다르다(3-03 193~194행 vs 47·53행). part3-05는 겹침 없음, modern-recipes part4-10 189행 한 문장. 5~9. |
| E | 5 | 제목 'Break-even·Setup Overhead 실측'과 description 'Break-even size. 실측 데이터'를 약속하나 break-even size는 55행에서 구하지 못하고 '실측' 표(202~209행)는 환경·방법이 없고 칸이 비었다. 3~5. |
| F | 6 | 290행 다음 편 'Interrupt Latency'는 seriesOrder 23 part3-05와 맞다. 294행 3-03(21), 295행 3-05 라벨·대상이 맞다. 본문이 3-03 손익 분기 절을 반복하면서 본문에서 가리키지 않고 관련 항목 링크만 있다. |
| G | 1 | 출처 링크 없음. 23·125·215~220행 라이브러리 버전 없음, 86·263행 마이크로아키텍처 주장에 TRM 인용 없음. 환경 표기는 33·202행 정도. |

uncertainties:
- 202행 'STM32H743 (170 MHz Cortex-M7 + 1.4 GB/s DDR3)'의 클록·DDR3 지원은 데이터시트 미확인. 실측 표 진위가 여기에 달렸다.
- 148행 '30 fps × 1080p × 2 byte = 60 MB/s'는 1920×1080이면 약 124 MB/s(해상도 정의 없음). 152행 '33 ms 동안 CPU 100%'도 해석에 따라 갈린다.
- 53행 DMA cost와 208~209행 실측 불일치(코어가 달라 확정하지 않음).
- 86·263행 cycle 주장 TRM 미확인.
- 222행 '-mtune=cortex-a72로 memcpy 자동 선택'은 glibc ifunc와 맞는지 미확인.
- 162·267행 DMA cache 우회 서술은 SoC 의존.
- 179행 'Cortex-M0/M1 (DMA 없거나 1 channel)'은 DMA가 벤더 주변장치라 의심.
- 69행 30 cycle과 47행 ~200 cycle 중 break-even에 쓸 값 구분 없음.

병합 대상: `part3-03-dma-performance.md` 181~202행(DMA Latency·손익 분기 절)을 이 글로 모은다. 우선 조치로 49·283행 등가 수치를 25~31행 표와 맞게 고치거나 1차 자료·실측으로 다시 정하고, 상수 충돌(setup 50 vs 200 cycle, 0.5 vs 1/3 cycle/byte)을 없앤 뒤 보강한다. 이 글이 break-even 전용이므로 이 글을 남기고 3-03 쪽을 줄인다.

### `part3-05-interrupt-latency.md` — 42점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc, be973200, ac24bb76, f38a41a0 TikZ, a746e269 등)에 Cortex-M TRM·Generic User Guide·CMSIS·FreeRTOS 포트 소스와 수치를 대조한 커밋이 없다. 19~26행 ns 환산, 179·185·147~150·152행 산술은 맞고, 152·154행, 36행 대 그림, 119·121행 긴장은 해석 문제라 uncertainties로 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 코어별 latency 표(19~26행), top/bottom half(79~108행), NVIC grouping(110~121행), BASEPRI(133~141행), ISR lock 금지(190~198행)는 표준 목록이다. 고유한 FreeRTOS overhead 예산(171~186행)과 GIC 단계 표(145~152행)는 출처 없는 추정값이다. Tail-chaining(34·36행)·Late arrival(40·42행)은 그림과 한 문장씩. |
| B | 8 | 제목의 '종료'는 184행 한 줄, 'Tail-chaining 6-cycle'은 산문 절(32~36행)에 없고 34행 그림 라벨(part3-05-tail-chaining.tex 27행)과 233행에만 있다. 측정 코드(61~77행)는 DWT 활성화가 없고 ISR 실행 확인·결과 해석이 없다. 113·149·152·46행 불확실로 B ≤ 13, 5~9. |
| C | 5 | 측정 코드(61~77행)에 대상 MCU·클록·예상 출력이 없고, 67·73행 `EXTI->PR1`·`SWIER1`(L4/G4 계열)과 표의 168 MHz(F4) 환산이 섞였다. 36·46·154·172~185행 수치는 출처 없어 C ≤ 8. 4~7. |
| D | 9 | 비교: part3-04(22), part3-06(24), modern-recipes part2-04·part4-05, rtos/practical-internals part1-05. 32~42행 ↔ recipes part2-04 67~73행(TRM 3.9.1·UG 2.3.7 인용, 더 정확)·part4-05 102~104행, 19~28행 ↔ rtos part1-05 127~138행, 156~167행 ↔ part3-06 85~133행, 79~108행 ↔ part3-06 30~49행. 고유는 DWT 측정과 FreeRTOS 예산. 5~9. |
| E | 4 | 제목 '분석 — 진입·종료·Tail-Chaining·Late Arrival'에 비해 tail-chaining·late arrival은 그림과 한 문장씩, 종료는 184행 한 줄이다. description의 'FreeRTOS hooks'는 175행 한 줄, '6-cycle'은 그림 라벨·233행뿐. 3~5. |
| F | 6 | 239행 다음 편 'Interrupt Storm'은 seriesOrder 24 part3-06과 맞다. 243행 3-04(22), 244행 3-06 라벨·대상이 맞다. 전제 안내, recipes part2-04 연결이 없어 6. |
| G | 1 | 출처 링크 없음. 19~26·46·145~150·154·141행 주장에 TRM·User Guide·FreeRTOS 포트 버전, MCU·CMSIS 버전이 없다. |

uncertainties:
- 113행 `NVIC_SetPriorityGrouping(3); // 4 group, 4 sub-priority`는 STM32 4-bit 구현에서 맞는지 미확인.
- 119행과 121행이 동시 pending에서 어긋나는지 미확인.
- 152행 A53 '수백 cycle'과 154행 'sub-µs면 R5' 논리가 글 수치와 맞지 않는다(jitter 얘기인지 불분명).
- 36행 '50% 효율'과 34행 그림 30 대 6 cycle 비율 불일치(효율 정의 없음), 그림 ARM7 'pop/push 8 reg' 미확인.
- 149·152·154행 A53 OoO·R5 in-order 미확인.
- 42행 late arrival이 M0·M0+에도 있는지 미확인.
- 46·25·26·154행 수치 출처 없음.
- 131행 'disable 시간 측정이 곧 worst-case'는 과장일 수 있다.
- 194행 ISR 안 `xSemaphoreTake` → hard fault 설명이 configASSERT 동작과 맞는지 미확인.
- 61~77행 측정 코드: DWT 활성화 없음, ISR 실행 미보장, SWIER·DSB 시간 포함(AP-C-35 후보).
- 171~186행 FreeRTOS 예산은 포트 버전 없는 추정값.

병합 대상: Cortex-M 진입·tail-chaining·late arrival(17~42행)은 `src/content/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions.md`(67~73행)가 더 정확히 다루고, IRQ Storm 회피(156~167행)는 `src/content/blog/embedded/performance-engineering/part3-06-interrupt-storm.md`(85~133행)가 다룬다. 'interrupt latency 측정·예산'이라는 고유 검색 의도가 있어 다음 조치는 보강이다. 메커니즘은 part2-04 링크로 줄이고, DWT 측정을 대상 보드·DWT 활성화·ISR 실행 확인·예상 관찰과 함께 완결하며, 171~186·145~152행 수치를 1차 자료로 확인하거나 TBD로 둔다. 보강 뒤에도 고유 내용이 측정 절 하나뿐이면 part2-04 병합을 다시 본다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **본문 1차 출처·버전 표기 없음, fact-check 커밋 없음 (10편 전부).** G가 10편 모두 1점이다. git log에는 slug 고정(0a9dd7bc), topic(be973200), 제목 변경(ac24bb76), 번역투·공개(3d56a230), 코드블록·KaTeX 정리만 있고 TRM·RM·spec·라이브러리 문서와 대조한 커밋이 없다. Part 3 본문은 fa6eb0c8 일괄 작성 뒤 대조 없이 공개됐다. `/fact-check-round` 대상이다.
- **원문 내부 산술·진술 모순 (5편).** 2-06 168·174행(working set 8 MB vs 48 KB)·127~135행(4-way와 '매번 conflict'), 2-08 44행(1600×2 = 12.8 GB/s)·218행, 3-01 21행 vs 123·219행(APB 사이클), 3-03 193~198·202·189행(손익 분기 모델과 256 byte 결론), 3-04 49·283행(200 cycle ≈ 60 byte). 수치를 손으로 계산해 적고 검산하지 않은 패턴이다.
- **출처·환경 없는 구체 수치로 C ≤ 8, 측정 결과 없음 (10편 전부).** C가 4~6에 머문다. 예: 2-06 112·202행, 2-07 59·81행, 2-08 37~42행, 2-09 173·207행, 2-10 82~93·166행, 3-01 105·142행, 3-02 129행, 3-03 185~187행, 3-04 25~31·202~209행, 3-05 172~185행. 성능 엔지니어링 시리즈인데 측정 절이 metric 이름이나 명령 한 줄로 끝난다(2-08 84행, 3-01 144~153행, 3-02 117~143행).
- **공통 H2 뼈대 (10편 전부).** '한 줄 요약 → 기법 절 나열 → 자주 하는 실수 → 정리 → 다음 편 → 관련 항목'이 같은 순서다(예: 2-06 13·219·261·272행, 2-07 13·239·274·284행, 2-09 13·216·253·264행, 3-03 13·231·262·272행, 3-05 13·200·230·241행). 루브릭 9절 scaled content 수치 기록 대상이다.
- **관련 항목이 직전·직후 편 두 개뿐이고 같은 주제 글로 연결 없음 (8편 이상).** 2-07 286~287행(4-02 없음), 2-08 225~226행(1-07·3-02 없음), 2-09 266~267행(recipes 8-07·8-08 없음), 3-01 234~235행(recipes 11-04 없음), 3-02 273~274행, 3-03 274~275행(6-04 없음), 3-04 294~295행, 3-05 243~244행(recipes part2-04 없음). F가 대부분 6에서 멈추는 이유다.
- **같은 내용의 시리즈 안팎 반복 (8편).** false sharing·SPSC padding(2-06 141~163, 2-07 65~79·184~198, 4-02 147~153, recipes 8-03 66~95행), NT store 코드(2-07 168~181 ↔ 2-08 166~175행, 둘 다 `value` 미정의), PMU·perf 기본(1-03 122~141, 2-03 161~170, 2-06 110, 2-10, 5-01 45~57, 5-02 46~50행), BUS_ACCESS 측정(2-08 77~85 ↔ 3-02 119~129행), 손익 분기 공식(3-03 191~202 ↔ 3-04 51~59행), AXI 세부(3-01 ↔ recipes 11-04), SIMD 코드(2-09 ↔ recipes 8-07), interrupt 메커니즘(3-05 ↔ recipes part2-04·rtos part1-05). 정본 한 곳을 정해야 한다.
- **같은 사실의 글별 수치 충돌 (다른 글 사이라 오류 확인 아님, 5편 관련).** prefetch 거리 전제(2-06 202행 100 cycle vs 2-07 157행 12 cycle), GEMM working set(2-06 168행 8 MB vs 6-02 112행 12 MB), PMU event 번호(2-10 45~46행·1-03 136~140행 vs 2-03 165~166행), STM32H7 matrix master 수(3-01 158~174행 6개 vs 3-02 78행 7개), DMA 손익 상수(3-03 193~194행 vs 3-04 47·53행), Cortex-M tail-chaining 수치(3-05 19~28·233행 vs rtos part1-05 127~138행, recipes part2-04 69행).
- **그대로 컴파일·실행되지 않는 코드 조각 (5편 이상).** 2-06 175행 `#define B`, 2-07·2-08 `value` 미정의, 2-07 29~35행 C 블록에 C++ 코드, 2-09 26행 AArch32 옵션과 AArch64 레지스터 혼재, 3-02 가상 레지스터 구조체, 3-03 31·35~37·84~87행 의사 코드, 3-05 61~77행 DWT 활성화 누락.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 5편의 내부 모순부터 고친다: 2-06 168·174행과 127~135행, 2-08 44·218행, 3-01 21행(AMBA APB 명세 기준), 3-03 189·202행과 193~198행, 3-04 49·283행. 각각 1차 자료나 측정으로 정하고 출처를 적은 커밋을 남긴다. 3-03·3-04는 손익 분기 절을 3-04로 모으는 결정과 함께 처리한다.
- 2-10 257·262행 다음 편·관련 항목(실제 3-01은 bus-architecture)을 고친다. 다른 파트 끝 글(part1-08, part3-12, part4-10 등)도 옛 파트 계획 문구가 남았는지 확인한다.
- 2-09(제외 검토)는 modern-recipes part8-07과의 SIMD 역할 분담을 정한 뒤 제외할지, dot product·MVE·SVE 차이로 좁혀 다시 쓸지 사용자가 결정한다. 발행 여부는 사용자 결정 사항이라 제안만 남긴다.
- 병합 검토 4편(2-07·2-10·3-02·3-05)은 모두 다음 조치가 보강(차별화)이다. 정본 결정이 먼저다: false sharing은 4-02, PMU 기본은 2-10, bus contention은 3-02, Cortex-M 예외 메커니즘은 recipes part2-04.
- 시리즈 전체에 `/fact-check-round`를 돌려 PMU event 번호, STM32H7 matrix, CCI-400, Cortex-M latency 수치를 TRM·RM·ARM ARM으로 한 번에 정하고 본문 주장 옆에 판·절을 붙인다. G·C가 낮은 공통 원인이다. 측정 기록이 없으면 수치를 새로 만들지 않고 TBD로 둔다.
