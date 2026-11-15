# 공개 글 독립 재검토 — 루프 19

평가일: 2026-10-18. 기준 HEAD: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2·anchors·antipatterns(AP-C-23/24)를 적용했다. 대상 전문과 기존 보고서 근거를 직접 읽고 아래와 같이 재판정했다. 원문·기존 보고서·사용자 작업은 수정하지 않았다. 전편 score_status=잠정, confidence=중간이다.

역사 앵커 UART=`part1-04-uart-hardware.md`(49), ISR=`part6-09-isr-api.md`(40), Build=`part7-05-kernel-build.md`(50)는 `10550ca1` 원문 기준이다. 현재 수정된 Recipes 점수를 역사 앵커에 연결하지 않았다. Recipes는 재채점에서 제외하고 명시한 D 구간 비교만 허용했다.

이 루프의 짧은 비교 파일명은 src/content/blog/embedded/performance-engineering/ 기준이다. Recipes는 src/content/blog/embedded/modern-recipes/, RTOS는 embedded/rtos/practical-internals/ 기준이다. F는 실제 slug/title/seriesOrder/draft와 라벨 전체를 확인했다. 다음 글은 각 order+1이며, 2-10의 Compiler 안내만 실제 Bus Architecture와 다르다.

[공통 게이트](double-check-gates-2026-10-18.md)의 check/build/links/sitemap/ads/anchors/reading 결과를 인용한다. 본문 정확성·실제 target 실행·모바일 육안 확인과 구분한다. P0는 본문 검토 범위에서 미발견이며 전체 구체 주장의 1차 자료 대조는 완료하지 않았다. 사실 불확실 B≤13, 출처·환경 없는 수치 C≤8, 절차뿐 C≤9, 잘못된 안내 F≤5를 먼저 적용했다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `part2-06-cache-miss.md` | 10 | 11 | 5 | 9 | 6 | 6 | 1 | 48 | 미검증 | 병합 검토 |
| `part2-07-cache-line.md` | 9 | 9 | 5 | 5 | 6 | 6 | 1 | 41 | 미검증 | 병합 검토 |
| `part2-08-memory-bandwidth.md` | 10 | 8 | 5 | 9 | 5 | 6 | 1 | 44 | 오류 확인 | 우선 조치 |
| `part2-09-simd-neon.md` | 8 | 9 | 5 | 3 | 6 | 6 | 1 | 38 | 미검증 | 제외 검토 |
| `part2-10-pmu.md` | 10 | 10 | 6 | 9 | 5 | 4 | 1 | 45 | 미검증 | 병합 검토 |
| `part3-01-bus-architecture.md` | 10 | 9 | 4 | 8 | 6 | 6 | 1 | 44 | 오류 확인 | 우선 조치 |
| `part3-02-bus-contention.md` | 10 | 10 | 5 | 11 | 5 | 6 | 1 | 48 | 미검증 | 병합 검토 |
| `part3-03-dma-performance.md` | 9 | 8 | 4 | 10 | 6 | 6 | 1 | 44 | 미검증 | 병합 검토 |
| `part3-04-dma-vs-cpu.md` | 11 | 10 | 6 | 10 | 5 | 6 | 1 | 49 | 오류 확인 | 우선 조치 |
| `part3-05-interrupt-latency.md` | 9 | 8 | 5 | 9 | 4 | 6 | 1 | 42 | 미검증 | 병합 검토 |

기존 합계 436 → 새 합계 443; 평균 43.6 → 44.3. 기존 오류 5편 중 2-06·3-03의 근거는 아래 이유로 철회한다. 오류 확인은 2-08·3-01·3-04의 내부 산술·직접 진술 모순 3편이다. 이 3편도 전체 주장을 검증한 상태는 아니다. D는 실제로 대조한 범위로 다시 한정했다.

| 파일 | 기존 | 새점수 | 차이 | 게이트·점수 재판정 |
| --- | ---: | ---: | ---: | --- |
| part2-06-cache-miss.md | 47 | 48 | 1 | B10→11; 오류 확인→미검증. working set의 포함 범위와 replacement 조건 가정은 확정 오류 근거에서 제외. |
| part2-07-cache-line.md | 41 | 41 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part2-08-memory-bandwidth.md | 43 | 44 | 1 | D8→9: 실제 비교한 같은 시리즈 Roofline/NT-store/PMU 범위와 별도 SoC 메모리 사례의 비중으로 재판정. 오류 게이트 유지하되 자동차 표 보조 근거 철회. |
| part2-09-simd-neon.md | 38 | 38 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part2-10-pmu.md | 45 | 45 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part3-01-bus-architecture.md | 44 | 44 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part3-02-bus-contention.md | 48 | 48 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part3-03-dma-performance.md | 41 | 44 | 3 | B7→8,D8→10.오류확인→미검증:본문이elapsed cost와CPU offload를직접구분하며일반controller수치와M4모델을동일조건으로묶지않음. |
| part3-04-dma-vs-cpu.md | 47 | 49 | 2 | D8→10:3-03손익절과겹치지만이글35~76행일부와cache개요에한정,대부분copy전용질문.산술오류게이트유지. |
| part3-05-interrupt-latency.md | 42 | 42 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |

## 글별 근거

### part2-06-cache-miss.md

source_file: `src/content/blog/embedded/performance-engineering/part2-06-cache-miss.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part2-06-cache-miss`

score_status: 잠정 · score: 48 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 127~139행 4-way conflict·malloc 정렬, 168/174행 working set 정의, 191~217행 prefetch/cache 일반화, 229행 random cold miss와 235행 atomic 배치; TRM·allocator·C 전처리 대조 필요.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 17~94행 3C의 정의·대응은 입문, 98~122행 A53 PMU와 증상표·127~129행 set 계산이 추가 가치. 미출처 문턱값 때문에 상위 분석 대역은 아니다. |
| B | 11 | 17~268행 원인→해법→측정→함정→정리 흐름은 완결. working set 범위가 불명확하고 관찰로 3C를 분리하지 못하나 확정 내부 오류라는 기존 감점은 철회하여11. 열린 불확실 B≤13. |
| C | 5 | 110행 perf 명령·tiling 조각은 있지만 보드/컴파일러·전후 결과 없다.112~113행 문턱과202행100cycle에 환경·출처 없어 C≤8; 예시 단계5. |
| D | 9 | 141~163행 ↔ part2-07 65~79행·part4-02 17~37행 false-sharing,187~204행 ↔ part2-07 132~157행 prefetch,165~185행 ↔ part6-02-case-cache-thrashing 105~132행 GEMM tiling.3C 원인 분류 자체는 고유하므로9 유지. |
| E | 6 | 2·5행 Compulsory/Capacity/Conflict는17~94행에 모두 있다. 분석 약속의 근거는118~122행 증상표 정도이고 후반은 여러 최적화로 넓어진다. |
| F | 6 | 270~276행 next/관련2-05(order13)/2-07(15)/2-08(16)는 실제 공개 title/slug와 일치. 기본 흐름6, 별도 고유 전제 길잡이는 없다. |
| G | 1 | 98~105행 PMU·191행 prefetch·208~217행 cache 주장을 연결한 외부1차자료·버전이 없다. |

게이트 재판정: 기존 working set 8MB와48KB는 배열 타입·working set에 포함하는 행렬 범위가 명시되지 않아 3×4B를 동일하게 가정해야 모순이 된다. conflict 예도 replacement/접근 의미의 아키텍처 해석이 필요하다. 의심은 남기되 이번 원문만으로 오류 확인은 철회한다.

병합 대상·다음 조치: 3C 독립 검색 의도로 병합 대상 없음; 후반 false-sharing은part4-02, prefetch는part2-07과 정리하며 3C별 관찰·공식 근거로 보강.


### part2-07-cache-line.md

source_file: `src/content/blog/embedded/performance-engineering/part2-07-cache-line.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part2-07-cache-line`

score_status: 잠정 · score: 41 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 59행 misalignment 비용,161행 MEMCTL/CCR.BP,176행 STNP,202~212행 비동기 DMA/maintenance 순서,24~25행 line size의 공식자료·빌드 대조 미완료.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 9 | 38~237행 alignment/false-sharing/hot-cold/SoA/prefetch/DMA의 일반 패턴 목록.157행 거리 계산과 DMA 구체 예는 있지만 관찰·선택 결과는 없다. |
| B | 9 | 248행 sizeof를 질문으로 남기고 각 절 한계·결과가 짧다.161~166행 prefetch register 설명·206~209행 DMA 처리의 검증 필요.5~9구간9, B≤13 준수. |
| C | 5 | 59행2cycle·81행10x는 출처/환경 없어 C≤8. 코드 조각은 있으나 실행·실측5. |
| D | 5 | 38~51/65~79/110~130/184~198행 ↔ 현재 Recipes part8-03 51~64/68~80/104~127/84~96행 alignas·padding·particle SoA·SPSC.83~108행 hot/cold도Recipes130~147행과 같은 질문. Performance part4-02 137~155행 queue padding도 반복. 현재 Recipes와 직접 비교하여5 유지. |
| E | 6 | 2·5행 alignment/prefetch/false-sharing/SoA는 모두 본문에 있다. 적용 결과보다는 소개여서6. |
| F | 6 | 282~287행 next Memory Bandwidth와2-06/2-08 라벨을 공개order14/16 실제 대상과 대조. 기본 구조6; 단계별 실험 안내는 부족. |
| G | 1 | 19~25행 line 크기 표·143~147행 builtin·222~226행 CMSIS 함수에 공식자료/판이 없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: part4-02 false-sharing·Recipes part8-03과 중복 후보. 독립 cache-layout 선택 의도를 남기려면 prefetch/SoA 전후 관찰로 보강.


### part2-08-memory-bandwidth.md

source_file: `src/content/blog/embedded/performance-engineering/part2-08-memory-bandwidth.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part2-08-memory-bandwidth`

score_status: 잠정 · score: 44 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P1 44행 수식의 등호 양변 산술 불일치. P0 미발견.

uncertainties: 37~42행 STREAM 실측조건,69행CCN,84행 BUS_ACCESS 환산,95~99행H743,110행Snapdragon 대역폭,131행rad-hard 비용/속도·162행256B 기준 모두 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 21~26행 STREAM표·59~64행Roofline·77~85행PMU·93~150행여러 메모리계층은 폭넓은 개요. RPi/모바일 수치는 출처 없이 있어 고유 분석 대역은 못 준다. |
| B | 8 | 44행 산술 오류와 Roofline ridge/peak 값 부재. Bus Saturation 판정은84행 환산식뿐이다.5~9구간8. |
| C | 5 | 37~42행 RPi 결과는 compiler/OS/STREAM버전/스레드 수 없다.110/131/162행 수치도 미출처 C≤8; perf·numactl 실행 조각5. |
| D | 9 | 55~64행 ↔ part1-07-modeling 53~100행 Roofline,166~175행 ↔ part2-07 168~182행 NT-store,77~85행 ↔ part3-02 119~129행 r19/r1d.별도 SoC·NUMA 사례는 남아9. 이전 hbm 비교를 열지 않은 채 복제하지 않았다. |
| E | 5 | 2·5행 STREAM/Roofline/Bus Saturation 측정 약속에 비해 명령·정의가 중심이며 해석 사례가 없다.3~5구간5. |
| F | 6 | 221~226행 next SIMD/NEON(order17), 관련2-07(15)/2-09(17)의title/slug/공개와 일치. 기본6. |
| G | 1 | 19·53행 벤치마크/논문 이름만 있고 링크/서지/판이 없으며 수치출처도 없다. |

게이트 재판정: 44행 3200×4/8=1600,1600MB/s×2=3200MB/s인데 같은 등호 끝은12.8GB/s다. 단위 표기까지 고치지 않아도 등호 산술이 성립하지 않아 오류 확인 유지.218행 자동차·항공 rad-hard 요약은 자동차 전체를 부정하는 표가 아니므로 별도 오류 근거로 쓰지 않는다.

병합 대상·다음 조치: 단일 병합 대상 없음.44행 산술부터 조치한 뒤 독립 STREAM으로 실제 DRAM 대역폭 비교 의도로 보강; Roofline은part1-07과 연결.


### part2-09-simd-neon.md

source_file: `src/content/blog/embedded/performance-engineering/part2-09-simd-neon.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part2-09-simd-neon`

score_status: 잠정 · score: 38 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 140행A78/X1 SVE,212행gather/scatter 범위,251행NaN/FTZ,121~126행MVE tail,19/26/37행ISA·compiler 혼재.언어/API 추측을 오류로 확정하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 8 | 30~108행scale/restrict/add/dot은 표준 예제이고 MVE·SVE를 모아 소개한다.111·173·207행 speedup은 출처 없이 있어8. |
| B | 9 | NEON→vectorizer→intrinsics→MVE/SVE→함정 흐름은 있으나186~197행 reduction 합산/tail·실측해석이 빠진다.기술불확실 B≤13이며9. |
| C | 5 | 222~226행 vectorizer 명령/예상진단이 단서다.컴파일러/ISA 환경을 고정하지 않고111/173/207행 수치에 출처 없어 C≤8;5. |
| D | 3 | 30~34/66~76/145~155/186~196행 ↔ 현재 Recipes part8-07 55~59/94~104/142~153/185~196행 scale/add/SVE/4누산기 반복.현재Recipes는 predicatedMVE를 고쳤지만 전반 핵심예제 중복은 여전. dot product는 고유하여3 유지. |
| E | 6 | 2·5행 Vector/Auto-vectorization/Intrinsics/Helium/SVE는 있다.SVE2는212행언급수준이라6. |
| F | 6 | 262~267행 next PMU/order18 및2-08(16)/2-10(18) 라벨·slug·공개대조 정상.기본6. |
| G | 1 | intrinsics reference·compiler판·벤치마크 출처가 없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: 현재 Recipes part8-07과 핵심예제 중복으로 제외 검토 유지.별도 유지하려면 고유 dot/MVE 적용의 실패·결과부터 검증해야 한다.


### part2-10-pmu.md

source_file: `src/content/blog/embedded/performance-engineering/part2-10-pmu.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part2-10-pmu`

score_status: 잠정 · score: 45 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 21~22행counter폭/수,114~125행 DWT/CPI,141~145행U74 IDs,219행barrier,245행ISR제외 방법,82~93행 문턱값. 공식TRM/privileged spec 대조 미완료.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 38~71행event표/perf는 기본목록.77~93행비율·183~193행WCET overrun·199~207행multiplex주의는 있지만 실험 없는문턱으로10. |
| B | 10 | PMU구조→perf→metric→DWT/HPM→sampling→함정 흐름완결.125행CPI식설명·245행ISR제외법이 없고 기술 불확실 B≤13;10. |
| C | 6 | 26~34/147~151행register·57~71/155~164행perf명령은있으나실측/버전/예상출력없다.166행1~3%·문턱값미출처 C≤8;6. |
| D | 9 | 23/33/38~51/197~207행 ↔ part1-03-measurement 122~141행PMU cycles·event·multiplex.2-06 98~113행과65행rawcounter도반복. 하드웨어카운터전담은있으나초반측정소개와상당중복9. |
| E | 5 | 2행 정밀성능진단/분석에비해 진단출력해석이없다.5행metric들은본문에있어3~5상단5. |
| F | 4 | 257행Compiler & Optimization·262행무링크3-01 Compiler는실제다음order19 Bus Architecture와불일치.261행2-09는정상이나잘못된안내상한≤5로4. |
| G | 1 | 38~51행event표·137~145행U74·DWT에1차자료URL/판이없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: part1-03의PMU소개와중복이지만독립PMU의도있어차별화보강.현실perf출력과해석·공식counter매핑확인,다음편안내우선수정.


### part3-01-bus-architecture.md

source_file: `src/content/blog/embedded/performance-engineering/part3-01-bus-architecture.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part3-01-bus-architecture`

score_status: 잠정 · score: 44 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P1 APB단일사이클표와2-cycle단계직접충돌.P0미발견.

uncertainties: ARLEN15는최댓값아닌예시일수있어오류확정안함.105행outstanding·142행CCI·155~175행H7matrix·209행deadlock은공식자료미대조.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 17~27/41~89/190~195행AMBA·signal·burst·RESP는명세요약,92행cachefill·157~175행H7예가추가되나출처없음10. |
| B | 9 | AMBA→AXI→AHB/APB→NoC→측정→응용흐름.21행APB직접충돌·CHI/ACE는한줄소개·측정방법없어9.B≤13. |
| C | 4 | 144~153행metric정의만있고수집절차/관찰없다.105/142행수치미출처C≤8,예시수준4. |
| D | 8 | 37/61/94~103/203~211/186행 ↔ 현재Recipes part11-04 32~44/147~162/100~120/164~175/177~191행handshake·outstanding·4KB·ID·QoS반복.3-02 51~74/76~87행과181~186/155~177행도겹침.AHB/APB개요는별도8. |
| E | 6 | 2·5행AHB/AXI/5채널은본문에있지만CHI/ACE는24~25/136/142행정도.부분미이행6. |
| F | 6 | 230~235행next Bus Contention/order20,2-10/order18·3-02/order20라벨과공개slug/title대조정상.기본6. |
| G | 1 | AMBA판·H7RM·CCI/A72TRM의본문출처가없다. |

게이트 재판정: 21행표의APB단일사이클과123~126행명시한setup/access두cycle,219행2-cycle은동일protocol의직접상반된설명이다.오류확인유지;어떤정정이맞는지는공식APB명세대조별도.

병합 대상·다음 조치: Recipes part11-04와AXI기초중복후보.우선APB표충돌조치,Part3도입의AMBA계층/SoC구조역할로보강.


### part3-02-bus-contention.md

source_file: `src/content/blog/embedded/performance-engineering/part3-02-bus-contention.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part3-02-bus-contention`

score_status: 잠정 · score: 48 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: CCI-400지원포트/레지스터,78행H7matrix,86행HAL함수,122행event·125행utilization,158행TCM,164행cachelocking,235행ARID인코딩·245행fallback은공식자료미대조.3쌍/4simultaneous개수서술은오류게이트대상아님.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 17~55행arbitration은일반입문,89~115행starvation해법·231~258행ID/QoS/polling함정이추가가치이나가상레지스터중심10. |
| B | 10 | 정책→starvation→측정→해법→함정은끝까지간다.117~143행측정은명령/차트뿐실제starvation해석없고기술불확실B≤13;10. |
| C | 5 | 128행perf·129행예시값은환경없으며설정코드는가상구조체다.97/202/223행수치미출처C≤8;5. |
| D | 11 | 51~74/76~87행 ↔ part3-01 179~186/155~177행QoS·matrix.69~74/239~242행 ↔ 현재Recipes part11-04 177~191행QoS예.별도89~115/209~225행starvation/regulator역할로11유지. |
| E | 5 | 2·5행진단/Starvation측정약속대비perf한줄과시나리오뿐.BUSY counter라는이름은본문BUS_CYCLES와다르며관측해석부족5. |
| F | 6 | 269~274행nextDMA Performance/order21·관련3-01/order19·3-03/order21제목/slug/공개와일치.기본6. |
| G | 1 | CCI/H7/PMU/A72의TRM/RM·HAL판·벤치출처없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: part3-01의QoS/matrix와절중복.전체흡수대상없음;독립starvation진단의도로공식레지스터·관찰조건부터보강.


### part3-03-dma-performance.md

source_file: `src/content/blog/embedded/performance-engineering/part3-03-dma-performance.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part3-03-dma-performance`

score_status: 잠정 · score: 44 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 61행DMA1/2범위·31~37행HAL구문·56행MDMAlength·84~87행descriptor형식·176행linker·185~194행setup/transfer수치·125행2배·229행체인비용.공식HAL/RM/실측미대조.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 9 | 17~179행burst/MDMA/SG/buffer/cache는사용패턴목록.250~260행MPU경계/FIFO함정은있으나관찰없어9. |
| B | 8 | burst→SG→doublebuffer→cache/MPU→cost→Linux→함정구조완결.93~103행chain은짧고overrun/descriptor조건없음.확정내부모순으로봤던감점철회하여8,B≤13. |
| C | 4 | 31~37/75~88/163~179행code는일부의사코드·linker생략.38/125/185~194행수치미출처C≤8.예시의재현조건약해4. |
| D | 10 | 181~202행 ↔ part3-04 35~76행negativebreak-even/CPUoffload질문중복,129~148행 ↔ part2-07 200~226행cachemaintenance.그러나43~125/163~179행MDMA·SG·doublebuffer·MPU전담이남아5~9보다10~14하단10.미열람Recipes근거를복제하지않았다. |
| E | 6 | 2·5행Burst/SG/Chain/Cache/doublebuffer는27~179행에있다.Chain은그림두문장이라부분이행6. |
| F | 6 | 270~275행nextDMA vs CPU/order22와3-02/order20·3-04/order22의공개title/slug대조정상.기본6. |
| G | 1 | RM/HAL/kernel판·수치출처없음.여러controller/MCU값을모았으나직접비교할환경없다. |

게이트 재판정: 196~198행N=-100을스스로밝히고200행CPU offload가진짜이득이라고바로구분한다.202행DMA유리를오직elapsedtime의명제로읽어야모순이된다.185행STM32~5cycle과193행M4memcpy를같은transfer모델로묶을환경도없다.기존오류를철회하며256B의미출처는유지한다.

병합 대상·다음 조치: part3-04와손익절중복;오류단정대신모델조건검증이먼저.독립DMA설정/버퍼의도로보강,손익절은3-04에모을후보.


### part3-04-dma-vs-cpu.md

source_file: `src/content/blog/embedded/performance-engineering/part3-04-dma-vs-cpu.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part3-04-dma-vs-cpu`

score_status: 잠정 · score: 49 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P1 49행cycle↔byte등가가같은글53행모델과불일치.P0미발견.

uncertainties: 202행H743/DDR3실측주장,148행1080p처리량,86/263행instructioncycle·222행mtune/libc선택·267행DMAcache영향미검증.다른코어표끼리비교해내부오류확정안함.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | 63~76행PathA/B와133~183행DMA/CPU유리조건·224~253행함정은질문별구조다.결과출처/규칙유도없어11. |
| B | 10 | 35~59행등가산술오류,실제parallelbreak-even은다른일조건없이규칙으로제시된다.그래도copy→cost→최적화→측정→함정완결10,B≤13. |
| C | 6 | 187~198행DWT측정은있지만기대값·환경고정없다.25~31/41~47/202~209행미출처표C≤8.실행단서6. |
| D | 10 | 35~76행 ↔ part3-03 181~202행negative모델·CPUoffload반복.3-03의MDMA/SG/MPU와달리이글25~33/78~131/185~222행memcpy최적화·표·측정이전담.부분겹침의10~14하단10으로재판정. |
| E | 5 | 2·5행실측/Break-even약속에비해53~59행음수모델과환경없는202~209행표다.측정절차와검증된실측을구분해야해5. |
| F | 6 | 290~295행nextIRQlatency/order23와관련3-03/order21·3-05/order23의공개title/slug정상.기본6. |
| G | 1 | 23/125/215~220행libc판·측정조건·TRM출처없다. |

게이트 재판정: 49행200cycle≈60B는53행CPUcost=N/3과동시에참일수없다.같은모델이면600B이고60B는20cycle이다.표의64B=28cycle도60B등가를지지하지않는다.이내부산술만으로오류게이트유지.

병합 대상·다음 조치: 3-03손익절을이글로모을후보.먼저49행등가산술과실측환경주장확인,독립copy/offload비교로보강.


### part3-05-interrupt-latency.md

source_file: `src/content/blog/embedded/performance-engineering/part3-05-interrupt-latency.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part3-05-interrupt-latency`

score_status: 잠정 · score: 42 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 19~26행각코어latency·46행FPU·113~121행priority·145~154행GIC/R5·172~185행FreeRTOS예산·measurement동기화/API미대조.36행효율과그림다른비교기준을직접모순으로만들지않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 9 | 19~28행latency표·79~141행top/bottom/NVIC/BASEPRI는입문.171~186행FreeRTOS예산이구체적이지만미출처9. |
| B | 8 | 32~57행tail/late/FP설명이그림중심이고61~77행측정은DWT활성화·IRQ완료확인없다.종료설명은184행정도라8,B≤13. |
| C | 5 | 61~77행측정코드·19~26행ns환산은있지만MCU/기대값없다.46/154/172~185행미출처수치C≤8;5. |
| D | 9 | 79~108/156~167행 ↔ part3-06 30~49/85~133행defer/coalescing.19~42행 ↔ RTOS part1-05-interrupts-rtos 127~140행latency/tail설명.고유DWT측정·GIC/FreeRTOS예산은남아9. |
| E | 4 | 2·5행진입/종료/tail/late분석약속대비그림·한문장과예산표중심.6cycle은그림과233행정리에있어없는내용으로기록하지않았으나깊이부족4. |
| F | 6 | 239~244행nextstorm/order24와3-04/order22·3-06/order24title/slug/공개대조정상.기본6. |
| G | 1 | TRM/CMSIS/FreeRTOSport판이나각cycle의주장출처가없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: part3-06의storm/defer와부분중복하지만독립IRQlatency의도.병합대상없음;진입/종료관찰과공식조건으로보강.

## 원문 스냅샷과 검증 범위

아래 전문과 SHA-256은 이번 근거 읽기 스냅샷이다. 종료 시 동일 해시를 다시 확인했다. target/compiler 실행은 별도 실행 기록이 있는 경우만 인정하며, 실행하지 않은 예제나 공식 자료를 확인했다고 쓰지 않았다.

| 파일 | 전문 | SHA-256 |
| --- | --- | --- |
| part2-06-cache-miss.md | 1~276행 | f21a51829f5ead59348a74a531667b0ef94a715e88494fb5fa391c2590278ca8 |
| part2-07-cache-line.md | 1~287행 | 48ab27f52830019b4f3cdc25f022e58d5dc95be764038cb266c588d49f56bb36 |
| part2-08-memory-bandwidth.md | 1~226행 | f8ed73816e4121f8d8c0ee50ff31af83a90f6c5694269d15438a45d4b65d2598 |
| part2-09-simd-neon.md | 1~267행 | 061f408b20f4903d0b70b90fb0ab6796d3e4a25e6da821428fc305ce8e22c7d6 |
| part2-10-pmu.md | 1~262행 | 15cd6aeb54788e5d3de89f42e7e6d322862b48c519f2c5c72455791c7a431ee8 |
| part3-01-bus-architecture.md | 1~235행 | d3ce22337f06f673462ced235e30cef776c9bf3e14b9ef56676ad1e8f246b35b |
| part3-02-bus-contention.md | 1~274행 | b67d4096c3235a9ed4ba269ae01da5731f46bf50aadb04b7abe11f50e7a91952 |
| part3-03-dma-performance.md | 1~275행 | 38c21080e74c2291983e878753d8fc2d388f035ba2c3868a9a3e4d43c551fc15 |
| part3-04-dma-vs-cpu.md | 1~295행 | 79d6cd6374b1c286b85bd9076716d29b93fdea9ab3dada100cc11b823ad94e93 |
| part3-05-interrupt-latency.md | 1~244행 | 825fc8e08964c513382252a402f5a791603440b42baf50fc48590a01d83111e6 |
