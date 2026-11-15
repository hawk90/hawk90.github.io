# 공개 글 평가 독립 재검토 — 루프 18

> independent_review: completed
> 검토일: 2026-10-18. 원문 변경 없음.
> 범위: `published-loop-18.md`의 Performance Engineering 10편, seriesOrder 4~13. 10편 전문과 아래 비교 파일 구간을 읽었다.
> 루브릭 v1.2. score_status: 잠정. confidence: 중간. P0는 원문 범위에서 확인하지 못했다.

blockers: 10편 모두 아래에 적은 정확성 오류로 `우선 조치`다. 렌더링·광고 배치·기기 실측은 이 검토의 범위가 아니다.

기존 10편의 오류 확인 판정은 유지한다. 다만 pipeline의 load→add와 load→mul을 같은 조건으로 강제한 보조 근거, modeling의 명시적으로 바뀐 원소 크기 가정을 충돌로 처리한 보조 근거는 제외한다. 두 편에는 외부 지식이 필요 없는 더 강한 산술 근거가 이미 있다. pipeline-stall은 “Harvard라는 말의 내부 정의만으로 증명”이라는 기존 논증보다 Arm 공식 TRM의 실제 버스 구성을 대조한 근거로 바꾼다.

앵커는 loop17과 동일하게 `10550ca1`의 UART·ISR API·kernel-build·기존 part12-10 LLM을 기준으로 삼았다. 그 파일들의 수정 후 현재 점수를 새 앵커로 섞지 않았다. F 7점에 전제 지식 목록이나 모바일 검사를 필수화한 기존 설명은 루브릭보다 엄격하므로 바로잡았다. F 7~8은 글 고유의 구분·진행 구조가 근거이며 모바일/reading 검사는 9점 이상에서 요구된다.

## 새 평가

파일은 모두 `src/content/blog/embedded/performance-engineering/` 아래다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `part1-04-statistics.md` | 11 | 11 | 6 | 9 | 7 | 7 | 2 | 53 | 오류 확인 | 우선 조치 |
| `part1-05-realtime.md` | 9 | 10 | 6 | 4 | 6 | 7 | 1 | 43 | 오류 확인 | 우선 조치 |
| `part1-06-benchmark.md` | 8 | 9 | 5 | 9 | 6 | 7 | 2 | 46 | 오류 확인 | 우선 조치 |
| `part1-07-modeling.md` | 9 | 9 | 5 | 8 | 6 | 6 | 1 | 44 | 오류 확인 | 우선 조치 |
| `part1-08-profiling-overview.md` | 8 | 9 | 5 | 8 | 6 | 6 | 1 | 43 | 오류 확인 | 우선 조치 |
| `part2-01-pipeline.md` | 9 | 9 | 5 | 8 | 5 | 5 | 1 | 42 | 오류 확인 | 우선 조치 |
| `part2-02-pipeline-stall.md` | 10 | 10 | 5 | 6 | 6 | 7 | 1 | 45 | 오류 확인 | 우선 조치 |
| `part2-03-branch-prediction.md` | 9 | 10 | 5 | 10 | 5 | 7 | 1 | 47 | 오류 확인 | 우선 조치 |
| `part2-04-speculative-execution.md` | 10 | 10 | 5 | 9 | 5 | 6 | 1 | 46 | 오류 확인 | 우선 조치 |
| `part2-05-cache-basics.md` | 9 | 10 | 5 | 9 | 7 | 7 | 1 | 48 | 오류 확인 | 우선 조치 |

합계 457점, 평균 45.7점(기존 45.1점)이다. 6편의 1점 차이는 F의 평가 재량을 조정한 결과다. 새 정밀 측정 결과를 뜻하지 않는다.

## 기존 평가와 비교

| 파일 | 이전 | 새 점수 | 변화 | 판정 변경 |
| --- | ---: | ---: | ---: | --- |
| part1-04-statistics | 52 | 53 | +1 F | 없음 |
| part1-05-realtime | 42 | 43 | +1 F | 없음 |
| part1-06-benchmark | 45 | 46 | +1 F | 없음 |
| part1-07-modeling | 44 | 44 | 0 | 없음 |
| part1-08-profiling-overview | 43 | 43 | 0 | 없음 |
| part2-01-pipeline | 42 | 42 | 0 | 없음 |
| part2-02-pipeline-stall | 44 | 45 | +1 F | 없음 |
| part2-03-branch-prediction | 46 | 47 | +1 F | 없음 |
| part2-04-speculative-execution | 46 | 46 | 0 | 없음 |
| part2-05-cache-basics | 47 | 48 | +1 F | 없음 |

## 글별 근거

### part1-04-statistics.md

source_file: `src/content/blog/embedded/performance-engineering/part1-04-statistics.md`

anchor_ref: `part6-09-isr-api.md`, `part7-05-kernel-build.md`

factcheck: 오류 확인 유지. 89행은 입력0을 bucket0에 기록하고 97행은 같은 bucket0을 1~1μs로 출력한다. 큰 shift나 __clz 동작을 몰라도 성립하는 입력/표시 불일치다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 19~27행 평균 함정 예와 127~137행 coordinated omission은 도움이 되나 통상 개념 소개가 중심이라 11. |
| B | 분포·HdrHistogram·고정 bucket·표본·부하 곡선까지 있지만 83~98행 예시 오류, 표본수 보편 단정의 조건 누락으로 11. |
| C | 67~74행 API 호출과 83~98행 코드는 있으나 라이브러리 설정·결과 검증이 없고 버킷 출력이 틀려 6. |
| D | metrics 117~124행 percentile 표 ↔ 이 글 33~40행, metrics 205~225행 histogram ↔ 83~98행을 전문에서 실제 비교했다. 기존 보고서의 “log2 bucket은 이 글에만”은 틀렸다. HdrHistogram·omission이라는 별도 설명을 감안해 점수9는 유지한다. |
| E | 2·5행 percentile/histogram/평균 약속을 17~101행이 다뤄 7. |
| F | 17~55행 수치 예→분포, 59~101행 도구 크기별 구분, 208행 다음 및 212~213행 맞는 관련 대상이 있다. 고유 진행 구조를 인정해 7. |
| G | 61·214행 HdrHistogram URL은 있지만 버전·구체 성능 주장 연결이 부족해 2. |

uncertainties: 90행 1u<<63, 114행 mean/stdev의 정규분포 가정, 163행 최소1000 및 180행80% 보편값은 별도 검증 대상이다. API/언어 지식이 필요한 의심을 내부 오류로 추가하지 않는다.

병합 대상: metrics의 percentile·histogram 절. 오류 수정 후 HdrHistogram의 실제 설정/결과와 omission 실험을 보강한다.

### part1-05-realtime.md

source_file: `src/content/blog/embedded/performance-engineering/part1-05-realtime.md`

anchor_ref: `part6-09-isr-api.md`, `part7-05-kernel-build.md`

factcheck: 오류 확인 유지. 177행 5ms 슬롯 실제값은5.12인데 178행은5.30−5.00으로 jitter를 계산한다. 15ms 슬롯의15.30과 혼동한 것으로 보이나, 적힌 계산 대상은 동일 데이터와 맞지 않는다. 단순 “몇 가지” 같은 개수 오기가 아니라 기술 수치 예의 결과다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | WCET 네 방법·jitter·예산은 유용하지만 다른 RTOS 글과 같은 예가 대부분이라 9. |
| B | 방법·측정·예산·RTA·함정 흐름은 있지만 89~99행 miss 측정 코드의 검증과 177~178행 데이터 대응이 부족해 10. |
| C | 39~47·62~73행 DWT 예와 118행 cyclictest 명령은 구체적이지만 측정 조건/실행 결과 없는 수치가 많아 6. |
| D | `rtos/practical-internals/part1-10-realtime-analysis.md` 66~93행 WCET4방법 ↔ 27~58행, 165~166행 cyclictest출력 ↔ 118~120행, 185~196행 PID예산110μs/89% ↔ 128~138행을 직접 대조했다. 질문·예·결론 반복이 강해 4. |
| E | 제목의 WCET/jitter/deadline는 모두 다루지만 측정 약속의 실제 검증 깊이가 부족해 6. |
| F | WCET4방법 구분·latency budget을 별도 단계로 둔 구조, 227행 맞는 다음, 231~233행 공개 대상3개의 정확한 제목을 인정해 7. |
| G | 233행 내부 글만 있고 WCET·안전계수·cyclictest 주장에 연결한 1차 출처/판이 없어 1. |

uncertainties: 47행1.2~1.5계수, 77행±10% OK, 89~99행 miss-code의 시간 기준, 217행 PREEMPT_RT/메인라인 관계는 별도 1차 검증 대상이다.

병합 대상: Practical RTOS part1-10. 같은 질문을 반복하므로 시리즈 역할을 먼저 결정하고, 오류 수정 및 measurement 절 차별화를 검토한다.

### part1-06-benchmark.md

source_file: `src/content/blog/embedded/performance-engineering/part1-06-benchmark.md`

anchor_ref: `part1-04-uart-hardware.md`, `part6-09-isr-api.md`

factcheck: 오류 확인 유지. 77~78행100ms의 실제95~110ms를±5%라 적는다. 100ms 기준은−5%/+10%이며 30행100ms±5% 예의 범위95~105와도 다르다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 17~23행5조건·warmup/isolation은 표준 조언이고 독립 측정 해석이 없어 8. |
| B | 조건→실행→비교→회귀 흐름은 있지만 147~156행 microbench 예시와 통계 판정이 완결되지 않아 9. |
| C | 50~64행 환경 제어·95~102행 CoreMark·173~188행 반복 측정은 있으나 실행 환경/원시 결과 없고±5% 예도 틀려 5. |
| D | metrics 186~187행 M0+100/M4F850 ↔ 109~110행, measurement64~72행 DWT ↔ 35~42·181~183행을 실제 대조했다. 지표글과 중복되지만 warmup/isolation/A-B 역할은 구별되어 9. |
| E | 2·5행 재현성·warmup·도구 약속은 각 절이 이행하나 재현성 확인 예는 부족해 6. |
| F | Linux/baremetal 격리 구분·173~188행 warmup/measure단계, 246행 다음과 250~251행 공개 대상2개가 정확해 7. |
| G | 96행upstream,159행도구repo,252행EEMBC가 있으나 표의 실측값·버전 연결이 없어 2. |

uncertainties: 61행irqbalance 중지가 IRQ off라는 설명, 147~156행Google Benchmark 서명, 206행10%미만noise 보편 기준은 별도 검증 대상이다.

병합 대상: metrics의 benchmark 점수 표. 방법론 질문은 독립이므로 다음 조치는 실제 환경과 반복 결과·비교 판정을 보강하는 것이다.

### part1-07-modeling.md

source_file: `src/content/blog/embedded/performance-engineering/part1-07-modeling.md`

anchor_ref: `part1-04-uart-hardware.md`, `part6-09-isr-api.md`

factcheck: 오류 확인 유지. 47행 `S−P(S−1)=1+P(S−1)`은 같은 P=.9,S=8을 대입하면 좌1.7/우7.3이다. 두 식을 등호로 연결한 자체가 틀렸다. 이 확실한 기존 근거를 주근거로 쓴다. 75행1byte와77행float4byte는 양쪽에 가정이 명시되어 있어 그것만을 모순이라고 하지 않는다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 여러 법칙·cycle budget을 모았지만 자체 관찰/적용 사례가 없어 9. |
| B | 법칙→예→활용 흐름은 있고 한계도 언급한다. 핵심 동등식이 틀리고 memorytraffic 가정 설명이 불충분해 9. |
| C | 70~90행 메모리 산술·130~140행budget은 있으나 실제 검증 절차/환경이 없어 5. |
| D | `part2-08-memory-bandwidth.md` 22~31행STREAM ↔ 68~77행, 55~64행Roofline ↔ 53~66행을 직접 읽었다. metrics57~63행Little'sLaw ↔ 102~108행도 반복된다. 모델 종합 역할이 있지만 8. |
| E | 2·5행 모델 적용의 개념·예는 다루지만 실제 workload에 적용해 판정하는 과정은 짧아 6. |
| F | 193행 다음과197~199행 관련3개는 맞는다. 158행“인터프리터 모델” 절은 내용과 맞지 않고 모델 간 전환 기준/연결이 약해 기존6 유지. |
| G | 논문·공식 자료 URL이나 버전이 없어 1. |

uncertainties: 75~90행STREAM/matmul 메모리트래픽 회계, 174행memorybound이면SIMD무의미 단정, 182행2~4core plateau 일반화는 별도 검증 대상이다. 일부 가정 전환을 오류로 과장하지 않는다.

병합 대상: bandwidth/lock-contention/SMP 글의 반복 법칙 절. 다음 조치는 등호를 고치고 한 workload에 모델을 적용하는 예를 보강하는 것이다.

### part1-08-profiling-overview.md

source_file: `src/content/blog/embedded/performance-engineering/part1-08-profiling-overview.md`

anchor_ref: `part1-04-uart-hardware.md`, `part6-09-isr-api.md`

factcheck: 오류 확인 유지. 230~232행bar90+baz5+self5=100이고235행inclusive100이다. bar·baz를 뺀self는5인데236행10이라고 적는다. “exclusive” 의미도214·236행에서 글이 직접 정의한다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | sampling/instrumentation·도구 목록 중심이고 독자 분석이 약해 8. |
| B | 도구→PGO/LTO→출력해석 흐름은 있지만 핵심self 예 오류와 성능향상 일반화가 남아 9. |
| C | 75~87·138~146행명령은 있지만 대상app·설치조건·관측결과가 없고 비용/향상표 수치도 출처 없어 5. |
| D | measurement227~235행PGO3단계 ↔ 이 글138~146행, `part5-05-flamegraph.md`34~48행record/script/collapse/svg ↔ 86~87행을 직접 읽었다. 뒤편 요약 반복으로 8. |
| E | 2·5행sampling/instrumentation/PGO/LTO는 각 절에 있어 6. |
| F | 267행Part2 안내는 방향만 있고 실제 다음 글 링크가 없다. 관련271~273행은 존재/제목이 맞지만 구체 다음 편 부재 상한6을 유지한다. |
| G | 본문 끝까지 1차 출처 링크·도구판 연결이 없어 1. |

uncertainties: 48행-pg와__cyg_profile_func_enter 대응, perf기본rate, SystemView의J-Link필수 주장, 257행production에서는sampling만이라는단정은 별도 검증 대상이다.

병합 대상: PGO는measurement, 도구는Part5 정본. 다음 조치는 잘못된 출력과 비용 단정을 고치고 선택 기준을 보강하는 것이다.

### part2-01-pipeline.md

source_file: `src/content/blog/embedded/performance-engineering/part2-01-pipeline.md`

anchor_ref: `part1-04-uart-hardware.md`, `part6-09-isr-api.md`

factcheck: 오류 확인 유지. 112행 식에N1000이면no-pipeline5000/pipeline1004 ≈4.98배인데114행200배다. 기존의60행load→add와145~149행load→mul forwarding 비교는 연산 종류가 달라 같은 지연 조건으로 강제할 수 없어 uncertainties로 내린다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 코어별 단계/IPC 소개는 있지만 독립분석 없이 사양 목록이라 9. |
| B | 구조→tradeoff→hazard→측정 흐름은 있으나 자체 수식/결과가 맞지 않고 코어별근거가 부족해 9. |
| C | 159~166행DWT 예는instruction-count helper가 미정의이고 목표IPC 표에 환경·출처 없어 5. |
| D | 다음stall글21~26행RAW ↔ 이 글126~131행, 다음글52~74행load-use/reorder ↔ 142~155행, 78~99행structural/control ↔ 118~140행을 전문 대조했다. 코어별stage 외 반복이 많아 8. |
| E | 2·5행비교 약속은 표로 다루나 “분석”의 검증 깊이가 약해 5. |
| F | 227행실제다음stall은맞으나140행branch prediction을“다음 편”이라 한다. 실제branch는다다음seriesOrder11로 잘못된 안내 상한5 적용. |
| G | 마이크로아키텍처 수치에 연결한TRM·버전·출처가 없어 1. |

uncertainties: M0/M0+동일stage, A72fetchwidth, add/mul loadforwarding조건,209행DMB/DSB필수조건은 1차자료 검증 대상이다.

병합 대상: 다음stall의공통hazard. 다음 조치는 산술을 고치고 각코어TRM에연결한비교로역할을분리하는 것이다.

### part2-02-pipeline-stall.md

source_file: `src/content/blog/embedded/performance-engineering/part2-02-pipeline-stall.md`

anchor_ref: `part1-04-uart-hardware.md`, `part6-09-isr-api.md`

factcheck: 오류 확인 유지, 근거를 1차 자료로 강화. 88행은Cortex-M3/M4를singleportHarvard/I-D통합bus라고일반화한다. 이번에 연 [Arm Cortex-M4 TRM r0p1, 100166_0001_04, §2.3.1](https://documentation-service.arm.com/static/5fce431be167456a35b36ade)은 세AHB-Lite인터페이스와Code공간의별도ICode(fetch)/DCode(data), System버스의공유/중재를구별한다(문서2-24~25쪽). 따라서Cortex-M4전체를I/D통합단일bus로기술한주장은틀리다. System경로에서는공유될수있으므로“Harvard라면모든경로동시접근”으로단순반증하지않는다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | RAW/WAR/WAW·측정원인·재정렬을모았지만독립결과없어 10. |
| B | hazard→forwarding→측정→회피는있다.88행구조오류와CPU조건생략으로 10. |
| C | 103~133행비교코드와147~151행perf_event_open조각은있으나clobber/설정/실측출력이없고정량근거도없어 5. |
| D | 앞pipeline126~131행 ↔21~26행RAW,142~155행 ↔52~74행loaduse,뒤speculative54~60행 ↔157~174행renaming을전문대조했다.겹침이커서 6. |
| E | 제목/설명의hazard·forwarding·PMU는다루지만실험완결성이없어 6. |
| F | 19~44행유형별예→63~74행재정렬→101~133행비교→240~257행독립accumulator로단계가나뉜다.268행다음/272~273행공개대상맞아 7. |
| G | 이번TRM확인은보고서근거일뿐본문출처가아니다.원문은TRM/판/실험출처없어 1. |

uncertainties: 61행코어별load-usepenalty,141~143행A53event지원,76·230행volatile가fence라는설명,211행vectoradd의scalarreduction대체는별도검증대상이다.

병합 대상: 앞pipelinehazard·뒤speculative의rename절. 다음 조치는bus구조오류수정과한코어에서재현되는stall비교다.

### part2-03-branch-prediction.md

source_file: `src/content/blog/embedded/performance-engineering/part2-03-branch-prediction.md`

anchor_ref: `part6-09-isr-api.md`, `part1-04-uart-hardware.md`

factcheck: 오류 확인 유지.93행Cortex-A53 BHT는256entry×4way인데155행같은BHT는6144entry다.154행256entry4way는BTB로적혀있다.각숫자의실제사양을몰라도같은BHT에대한두값이맞지않는다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | static→1bit→2bit→BHT/BTB→global/return의일반교과설명중심으로 9. |
| B | 구조·비용·측정·회피흐름은있지만같은사양표불일치·분기없는코드검증누락으로 10. |
| C | 170행perf명령은있으나target/결과가없고예측률/penalty표는출처없어 5. |
| D | 다음speculative79~101행wrongpath/cache ↔222~231행Spectre를전문대조,part2-10-pmu45~50행event표 ↔164~166행을읽었다.이벤트값은다르지만주제중복은작고예측기구조가독립이라 10. |
| E | 제목키워드는모두절로있지만“분석”약속에사양/개념위주이며틀린사양표까지있어 5. |
| F | 예측기를단계별로나누고두상태/포화업데이트를71~80행에구분한다.271행다음/275~276행관련대상정확해 7. |
| G | CPU사양·event번호·CVE주장에1차출처가없어 1. |

uncertainties: 164~166행rawPMU번호,231행Spectre/CVE대응,187~199행branchless예의동등성은언어/ISA자료대조대상이다.다른글과의event불일치는그자체만으로게이트오류로쓰지않는다.

병합 대상: 없음.예측기구조질문은독립이다.다음조치는TRM고정과실제branchmiss실험·예제검증이다.

### part2-04-speculative-execution.md

source_file: `src/content/blog/embedded/performance-engineering/part2-04-speculative-execution.md`

anchor_ref: `part1-04-uart-hardware.md`, `part6-09-isr-api.md`

factcheck: 오류 확인 유지.65행fetch순서라고한ROB에서66행add/sub가ldr보다앞에있는데71행은그앞entry도뒤ldr를기다린다고한다.208행자체in-ordercommit규칙과동시에성립하지않는다.56행rename전sub를rename후덧셈으로쓴것은보조근거다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | ROB·storequeue예는독립설명가치가있으나일반개관으로 10. |
| B | in-order/OoO·rename·ROB·wrongpath·tradeoff흐름은있지만핵심ROB예가자체규칙과맞지않아 10. |
| C | 127행perf명령과예제는있지만플랫폼/실행관측이없고A72/Apple사양값에출처없어 5. |
| D | stall157~174행rename ↔54~60행,branch222~231행speculativecache ↔75~101행을직접읽었다.ROB/storequeue는별도역할이라 9. |
| E | 제목ROB/rename/OoO는다루나구체검증없이설명이고주예제도틀려 5. |
| F | 214행다음/218~219행관련정확.65~69행미완성ROB도식/TODO,어셈블리의c표시와단계전환불명확성때문에6유지. |
| G | A72ROB/physicalregister·Appleentry·보안주장에원자료링크/판없어 1. |

uncertainties: 127행perfeventalias,73·140~147행microarch사양,192행mitigation이름/비활성화조건은1차검증대상이다.

병합 대상: stall의rename·branch의Spectre절.다음조치는ROB예를고치고그림과실험을이어주는보강이다.

### part2-05-cache-basics.md

source_file: `src/content/blog/embedded/performance-engineering/part2-05-cache-basics.md`

anchor_ref: `part1-04-uart-hardware.md`

factcheck: 오류 확인 유지.72행64KB directmapped/64Bline에index8bit라적지만64KB/64B=1024line이므로10bit가필요하다.55행M4cache16B와184행M4cache없음도내부범위가맞지않는다.131행logNbit/134행4way3bits도서로다르다.228행struct68B주장은int4바이트가전제되므로환경확인없이주게이트로쓰지않는다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | hierarchy/mapping/replacement의표준소개중심으로9. |
| B | 계층→mapping→정책→MCU/DMA→함정은완성됐지만mapping산술과M4서술이맞지않아10. |
| C | 192~193행enable·210행perf·249~261행DMA조각은있으나조건/기대결과/검증이없고기본계산도틀려5. |
| D | part2-06-cache-miss208~217행inclusive/exclusive ↔44~48행,124~139행stride/conflict ↔237~244행,part2-07-cache-line17~23행size표 ↔52~56행을직접읽었다.mapping/replacement는독립역할이라9. |
| E | 2·5행hierarchy/set/replacement약속을각절이이행해7. |
| F | policy별하위절→MCU→TCM→측정→잘못된접근의연결구조가있다.273행다음과277~279행공개대상3개가맞고그림도실재해7. |
| G | 원문수치/설계/정책에공식source·TRM판이없어1. |

uncertainties: 97행A72associativity,148행random정책의WCET예측가능단정,167행ARM전체writepolicy,258행정렬조건은1차자료대조대상이다.

병합 대상: 후속cachemiss/cacheline의공통절.다음조치는mapping계산과코어별사양을고치고교과개념과플랫폼별조건을구별하는보강이다.

## 공통 검증

10편의 내부 Markdown blog 링크 24개는 slug로 해석해 대상 제목·seriesOrder·draft 상태를 대조했다. 누락/draft 대상은 없고 위 F에 기록한 안내문 자체 문제는 별개다. 직접 비교한 D 대응 구간과 1차 자료 URL은 글별로 남겼다. 본문 코드 전체 실행·기기 측정·모바일 렌더는 하지 않았으므로 C/사실 검증을 과장하지 않고 모든 점수를 잠정으로 둔다.
