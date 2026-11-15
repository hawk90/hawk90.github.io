# 공개 글 독립 재검토 — 루프 21

평가일: 2026-10-19. 기준 HEAD: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2·anchors·antipatterns(AP-C-23/24)를 적용했다. 대상 전문과 기존 보고서 근거를 직접 읽고 아래와 같이 재판정했다. 원문·기존 보고서·사용자 작업은 수정하지 않았다. 전편 score_status=잠정, confidence=중간이다.

역사 앵커 UART=`part1-04-uart-hardware.md`(49), ISR=`part6-09-isr-api.md`(40), Build=`part7-05-kernel-build.md`(50)는 `10550ca1` 원문 기준이다. 현재 수정된 Recipes 점수를 역사 앵커에 연결하지 않았다. Recipes는 재채점에서 제외하고 명시한 D 구간 비교만 허용했다.

2026-10-19 재개 검토. 10-18 공통 스냅샷의 HEAD와 대상 원문은 그대로다. 짧은 파일명은 embedded/performance-engineering/ 기준, RTOS=embedded/rtos/practical-internals/, Recipes=embedded/modern-recipes/, Cpp=embedded/embedded-cpp/, Debug=tools/debugging/kernel/이다. F는 모든 관련 대상의 slug/title/order/public 및 뒤 설명까지 확인했다. draft 키 부재는 공개로 취급한다.

[공통 게이트](double-check-gates-2026-10-18.md)의 check/build/links/sitemap/ads/anchors/reading 결과를 인용한다. 본문 정확성·실제 target 실행·모바일 육안 확인과 구분한다. P0는 본문 검토 범위에서 미발견이며 전체 구체 주장의 1차 자료 대조는 완료하지 않았다. 사실 불확실 B≤13, 출처·환경 없는 수치 C≤8, 절차뿐 C≤9, 잘못된 안내 F≤5를 먼저 적용했다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `part4-05-mutex.md` | 11 | 11 | 6 | 8 | 6 | 6 | 1 | 49 | 오류 확인 | 우선 조치 |
| `part4-06-rw-lock.md` | 10 | 11 | 6 | 10 | 6 | 6 | 1 | 50 | 미검증 | 병합 검토 |
| `part4-07-lock-free.md` | 12 | 12 | 7 | 7 | 6 | 6 | 1 | 51 | 미검증 | 병합 검토 |
| `part4-08-memory-ordering.md` | 10 | 9 | 5 | 6 | 6 | 6 | 1 | 43 | 오류 확인 | 우선 조치 |
| `part4-09-cache-coherency.md` | 9 | 10 | 6 | 9 | 6 | 6 | 1 | 47 | 오류 확인 | 우선 조치 |
| `part4-10-smp-analysis.md` | 9 | 9 | 6 | 8 | 5 | 5 | 1 | 43 | 오류 확인 | 우선 조치 |
| `part5-01-perf-basics.md` | 10 | 12 | 7 | 8 | 7 | 7 | 1 | 52 | 오류 확인 | 우선 조치 |
| `part5-02-perf-advanced.md` | 9 | 9 | 6 | 6 | 6 | 7 | 1 | 44 | 미검증 | 병합 검토 |
| `part5-03-ftrace.md` | 10 | 11 | 7 | 4 | 7 | 6 | 1 | 46 | 미검증 | 병합 검토 |
| `part5-04-ebpf.md` | 11 | 11 | 6 | 8 | 7 | 7 | 1 | 51 | 오류 확인 | 우선 조치 |

기존 합계 474 → 새 합계 476; 평균 47.4 → 47.6. 기존474→476. RW-lock은 일반적 범위와 특정 실험을 동일 조건으로 묶을 수 없어 오류 확인을 철회했다. perf 고급은 전제와 후처리 단계가 실제로 있어 F6→7. 다른 항목은 아래 관찰로 유지했다. 일부 오류 확인과 전체 검증 완료는 다르다.

| 파일 | 기존 | 새점수 | 차이 | 게이트·점수 재판정 |
| --- | ---: | ---: | ---: | --- |
| part4-05-mutex.md | 49 | 49 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part4-06-rw-lock.md | 49 | 50 | 1 | B10→11; 오류 확인→미검증. 일반 범위와 특정 환경 결과를 직접 모순으로 단정한 기존 근거 철회. |
| part4-07-lock-free.md | 51 | 51 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part4-08-memory-ordering.md | 43 | 43 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part4-09-cache-coherency.md | 47 | 47 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part4-10-smp-analysis.md | 43 | 43 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part5-01-perf-basics.md | 52 | 52 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part5-02-perf-advanced.md | 43 | 44 | 1 | F6→7:18행전제명시와142~172행skeleton생성→콜백편집→실행단계가고유길잡이로기능. |
| part5-03-ftrace.md | 46 | 46 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part5-04-ebpf.md | 51 | 51 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |

## 글별 근거

### part4-05-mutex.md

source_file: `src/content/blog/embedded/performance-engineering/part4-05-mutex.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part4-05-mutex`

score_status: 잠정 · score: 49 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 42~78행 futex/adaptive,105행 chain깊이3,192행unfair_lock,199행FreeRTOS축약 API와225~237행 실측 조건을 공식자료/target으로 검증하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | 24~61행 비용 분해/futex상태·127~143행 robust·182~192행unfair_lock이 구체 예지만 관찰 없는 개요라11. |
| B | 11 | 16~248행 흐름은 완결.117~123행 통계 산술이 맞지 않고 도구·spin상한의 조건이 없어서11,B≤13. |
| C | 6 | 109~123행 tick측정/출력과225~237행표는 있지만 compiler/OS/반복이 없다. 미출처 수치 C≤8,실행단서6. |
| D | 8 | 63~78행 ↔ part4-04 187~202행adaptive.156~166행 ↔ RTOS part1-08 48~60행mutex/semaphore,99~105행 ↔ RTOS part3-05 101~135행PI chain. futex/robust 고유역할은 남아8. |
| E | 6 | 2·5행 Futex/Adaptive/PI는38~105행 이행. 성능은 미출처표 중심이라6. |
| F | 6 | 250~256행 next4-06/order35와4-03/4-04/4-06의 제목·공개·slug 정상. 기본 구조6. |
| G | 1 | 본문에 futex/glibc/FreeRTOS/Apple의 주장별1차자료·버전이 없다. |

게이트 재판정: 117~123행 같은 Mutex_DB 통계:2345회×최대45µs=105.525ms이므로 total1234ms와 동시에 성립하지 않는다. API가 실제로 이 출력을 내는지와 별개로 예시 통계 자체의 산술 모순을 유지.

병합 대상·다음 조치: 전체 병합 대상 없음. 독립 mutex비용/복구 의도로 통계 산술부터 조치하고 재현 조건으로 보강.


### part4-06-rw-lock.md

source_file: `src/content/blog/embedded/performance-engineering/part4-06-rw-lock.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part4-06-rw-lock`

score_status: 잠정 · score: 50 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 97~99/243행 일반·특정 성능범위 차이,26~55행writer상태복원,116행rcu_assign_pointer,149~157행continue,198행doublebuffer race와RCU API/실측 조건은미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 59~85/103~162행 정책·RCU·seqlock은입문.77~83행FIFObatch·174행자료형선택이 추가되나 검증된결과는없어10. |
| B | 11 | 기본구조→정책→대안→함정→실측까지완결.미완writer/read예제는남으나확정성능모순감점철회로11.B≤13. |
| C | 6 | 238~246행A72/4thread외OS/lock구현/critical크기·실행코드없어C≤8.코드단서6. |
| D | 10 | 103~131/164~174행 ↔ 현재Recipes part9-03 22~48행RCU교체/grace흐름.133~162/176~198행 ↔ Recipes part9-02 45~105행sequence/sensorbuffer.정책비교전담은구별되어10. |
| E | 6 | 2·5행 priority/RCU/seqlock은59~174행에있다.성능선택의이유·검증은약해6. |
| F | 6 | 259~265행 next4-07/order36,4-05/4-07 및RTOS3-11 Stream Buffer(order32)의 실제title/slug/public일치.기본6. |
| G | 1 | pthread/RCU/glibc/kernel의본문자료·판없다. |

게이트 재판정: 97~99행약1.5~3배는일반설명이고243행4.2/1.1≈3.82배는A72/4thread의특정실험이다.동일측정·동일lock/critical조건임을밝히지않아이범위차이만으로오류확인을유지할수없다.언어/API의다른의심은미검증.

병합 대상·다음 조치: 전체병합없음;RCU/seqlock은Recipes9-03/9-02와부분중복후보.정책선택과실측환경을보강.


### part4-07-lock-free.md

source_file: `src/content/blog/embedded/performance-engineering/part4-07-lock-free.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part4-07-lock-free`

score_status: 잠정 · score: 51 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 276/284행A72 LDADD,LSE,93/101/256행atomic API,147~166행HP등록/회수,168행library채택,190행RCU관계·표의latency/throughput정의미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | 26~192행progress/CAS/stack/회수전략을연결하고192행per-pointer/per-thread비교가있어12.성능자료출처는없다. |
| B | 12 | 18~297행문제→구현/위험→해법→측정흐름.147행hp와148행hp_list연결및MPMC구현이빠져12,B≤13. |
| C | 7 | 276~286행A72표는벤치/컴파일러/방법없어C≤8.기본코드가있어7이나전체실행확인아님. |
| D | 7 | 34~59/110~123/194~222행 ↔ Cpp part4-03 69~78/96~115/156~200행CAS/ABA/SPSC.본루프4-06 103~131행RCU와190행epoch도인접주제.회수전략별개요는남지만핵심패턴중복7. |
| E | 6 | 2·5행CAS/ABA/HP/epoch절은있으나성능분석은미출처표와192행정성문단이라6. |
| F | 6 | 299~305행 next4-08/order37와4-06/4-08/Cpp4-03라벨·title·public정상.기본6. |
| G | 1 | 168행Michael논문·Vyukov/Harris이름은있으나본문1차자료URL/판·측정출처없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: 병합대상없음;Cpp4-03과겹치는입문예는줄이고독립reclamation성능으로보강.


### part4-08-memory-ordering.md

source_file: `src/content/blog/embedded/performance-engineering/part4-08-memory-ordering.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part4-08-memory-ordering`

score_status: 잠정 · score: 43 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 89행실제SCmapping,152행consume표준시점,119행DMBscope,184~192행DMAvisibility,248~262행A72/연산cycle은공식ARM/표준/실측대조미완료.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 26~119행order/barrier기본목록.123~140/248~262행비용표가고유하지만환경·출처없어10. |
| B | 9 | 18~271행흐름은완결이나155~166행SPSC생략과89/134행비용모델간극이있어9,B≤13. |
| C | 5 | 248행A72명칭외SoC/clock/측정코드없고123~136행ARM/x86값도환경없어C≤8,코드단서5. |
| D | 6 | 26~78/94~106행 ↔ part4-01 110~159/171~179행order/acquire-release/barrier반복.현재Recipes part2-10 59~83행도DMA/clockbarrier를전담한다.핵심입문중복6. |
| E | 6 | 2·5행Acquire/Release/SC/ARM은본문에있으나비용근거없는분석이라6. |
| F | 6 | 273~279행 next4-09/order38와4-07/4-09/TSan라벨정상.후행memory_order설명은TSan chapter04 195~211행relaxed flag예와실제대응.기본6. |
| G | 1 | C11/ARM/TRM·kernelbarrier자료와버전의본문인용없다. |

게이트 재판정: 89행SCstore=STLR+barrier,133~135행STLR5cycle·DMB20~50cycle인데134행SCstore도동일5cycle로설명한다.글이자체제시한비용모델은동시에성립하지않아유지.244행only-atomic은104행일반access및186~192행buffer/DMA예와도범위가불명확하나C/C++race와ISAordering구분의외부검증없이별도확정오류로확장하지않는다.

병합 대상·다음 조치: part4-01 memorymodel절중복후보.자체비용모델부터조치한뒤고유order선택/실행관찰로보강.


### part4-09-cache-coherency.md

source_file: `src/content/blog/embedded/performance-engineering/part4-09-cache-coherency.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part4-09-cache-coherency`

score_status: 잠정 · score: 47 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: ARM-MOESI일반화·CCI포트수·r2A/r2B/r2D·non-shareable coherency·CXL/lockstep·실측표는미검증.다이어그램모순확인은외부MESI전체검증과다름.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 9 | 24~87행MESI/MOESI/snoop/directory는일반입문.102~169행PMU/NUMA/CXL/MPU를모으지만검증된분석없어9. |
| B | 10 | 개념→원인→측정→응용→함정완결.41행전이와그림이충돌하고플랫폼구분이약해10,B≤13. |
| C | 6 | 102~117/171~184행perf와217~230행표는있으나보드/도구/방법없어C≤8,6. |
| D | 9 | 89~100/171~184행 ↔ part4-02 19~37/170~182행false-sharing/c2c,137~146행 ↔ part3-11 141~155행CXL cache흐름.일반protocol입문역할은남아9. |
| E | 6 | 2·5행MESI/MOESI/snoop/directory/측정본문은있으나원인별관측사례부족6. |
| F | 6 | 241~247행 next4-10/order39와4-02/4-08/4-10라벨·title·slug/public일치.기본6. |
| G | 1 | AMBA/CCI/ARM PMU/CXL의본문1차자료·판없다. |

게이트 재판정: 41행read miss:기존Mcache가flush후I라고쓴반면본문그림의TikZ public/images/blog/perf-eng/diagrams/part4-09-mesi-states.tex48~50행은remote read(flush) M→S다.같은동작의기존소유cache전이가직접다르므로오류확인유지.어느수정이맞는지는공식자료검증별도.

병합 대상·다음 조치: part4-02 false-sharing/c2c와부분중복.전이표/그림충돌우선조치후독립coherency모델로보강.


### part4-10-smp-analysis.md

source_file: `src/content/blog/embedded/performance-engineering/part4-10-smp-analysis.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part4-10-smp-analysis`

score_status: 잠정 · score: 43 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 63~99행scheduler/migration/NUMA비용,101~147행RTOS/EAS/IPI,167행RT balancing·191행isolcpus범위·262~276행실측조건미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 9 | 24~99행utilization/affinity/NUMA와101~229행scheduler/scaling목록.원인두가지구조는있으나실제원인분리사례약해9. |
| B | 9 | 도구→배치→scaling모델→함정흐름.209/217~220행계산모순과276행fitting방법부재로9,B≤13. |
| C | 6 | 26~53행mpstat/taskset예있으나79~99/262~276행수치환경/출처없어C≤8,6. |
| D | 8 | 87~99행NUMA ↔ part4-09 119~135행nodebinding/latency,207~220행Amdahl ↔ part1-07 19~38행serial한계.109~121행big.LITTLE배치는part3-09 109~121/88~107행과인접주제.공통기술소개가많아8. |
| E | 5 | 2·5행부하/affinity/scalability범위는맞지만분석대비설명목록이며실제fitting결과없어5. |
| F | 5 | 291~293행세라벨대상정상.287행다음파트perf/ftrace/LTTng중Part5에LTTng내용이없어예고전체일치안함,F≤5로5.다음perf자체는order40에있다. |
| G | 1 | kernel/libnuma/USL공식자료·실측출처없고FreeRTOS11표기만있다. |

게이트 재판정: 209행USL식에α=.1,β=.01을넣으면N4/8/16/32의speedup은2.82/3.54/3.27/2.28이다.217~220행3.0/4.7/5.8/5.7은이조건의식과성립하지않아오류유지.다른262행실측표는별도워크로드라오류근거로묶지않는다.

병합 대상·다음 조치: part4-09 NUMA·part1-07 모델과부분중복.독립배치/확장진단의도로USL산술부터조치하고실제곡선해석으로보강.


### part5-01-perf-basics.md

source_file: `src/content/blog/embedded/performance-engineering/part5-01-perf-basics.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part5-01-perf-basics`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 46~49행paranoid/capability,177행sampling해석,194행framepointer,265~281행overhead/문턱수치와표본/집계의미는공식perf자료·실행미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 28~222행설치/stat/record/report/annotate/top/diff는일반tutorial.236~249행낮은IPC원인을좁히는구조가추가가치10. |
| B | 12 | 22행범위부터298행결론까지실행순서는완결.171/174행annotate최대비율충돌과cross환경생략으로12,B≤13. |
| C | 7 | 30~249행명령/예시출력은있지만측정target/perf판없고overhead수치미출처C≤8.실행단서7. |
| D | 8 | 183~194/268~281행 ↔ part5-02 111~120/209~236행callgraph/overhead/함정,66~144행 ↔ part2-10 57~71행perf소개.별도설치/최초해석역할은남아8. |
| E | 7 | 2·5행stat/record/report/권한/핫스팟은이행.표해석오류로결과신뢰약해7. |
| F | 7 | 300~307행 next5-02/order41와네관련title/public정상.22행입문범위/후속구분·236~249행원인별측정순서가글고유길잡이라7. |
| G | 1 | perf권한/threshold/비율의1차자료·kernel/perf버전없다. |

게이트 재판정: 171행23.4% add를가장hot이라고하지만174행jne76.0%가더크다.동일annotate블록의최대값설명충돌로오류유지.예시합0.5+23.4+.3+.2+76=100.4도100%분포로읽을경우0.1자리반올림범위최대.25를넘는다.

병합 대상·다음 조치: part5-02 callgraph/overhead부분중복.핫스팟해석오류부터조치,독립perf입문으로예시환경/해석보강.


### part5-02-perf-advanced.md

source_file: `src/content/blog/embedded/performance-engineering/part5-02-perf-advanced.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part5-02-perf-advanced`

score_status: 잠정 · score: 44 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 54~65행eventgroup/multiplex,102행tracepoint안정성/비용,120/209행overhead,151~163행Pythoncallback API,196행mem/c2c지원의공식자료·target미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 9 | 24~120행event분류/명령은일반활용목록,142~172행Python후처리예는있지만latency계산결과없어9. |
| B | 9 | raw→group→tracepoint→script→sched/mem흐름은있으나group조건과custom계산예가불완전9,B≤13. |
| C | 6 | 명령/예시sched출력은있으나kernel/perf/target없고120/209행수치미출처C≤8,6. |
| D | 6 | 46~65/217~226행 ↔ part2-10 65/199~207행raw/multiplex.104~108행 ↔ part5-03 138~159행schedtrace,111~126/201~209행 ↔ part5-01 183~194/265~268행callgraph/overhead.반복상당6. |
| E | 6 | 2·5행raw/tracepoint/script는본문에있으나custom분석기완성결과는없어6. |
| F | 7 | 18행5-01전제·142~172행생성/편집/실행안내가고유구조다.247~255행next5-03/order42·다섯관련정상,마지막CFI설명은실제DWARF chapter05의CFA/FDE자료와대응하여7. |
| G | 1 | 50행TRM언급만있고문서/절·perf/kernel판·수치출처없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: part5-01 callgraph/overhead·part2-10 raw와중복후보.독립custom분석의도로콜백의실제관측/실패조건보강.


### part5-03-ftrace.md

source_file: `src/content/blog/embedded/performance-engineering/part5-03-ftrace.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part5-03-ftrace`

score_status: 잠정 · score: 46 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 20행hook/NOP·132행wakeup_rt범위·196~202행overhead·230행기본buffer와kernel tracer/config차이미검증.완곡본문/단정정리차이는새오류게이트로쓰지않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 24~190행tracefs/tracer/event/cmd/probe기본목록.77~101행callgraph읽기와103~134행latency관점이있으나고유실험없어10. |
| B | 11 | mount→tracer→filter→graph→latency→도구흐름완결.전제kernel/config와예시재현범위가빠져11,B≤13. |
| C | 7 | 27~159행수집/정지/출력명령은실행단서다.196~202행비용수치미출처C≤8;환경/실제관찰없어7. |
| D | 4 | 24~75/77~101/125~132행 ↔ Debug chapter03-ftrace-tracepoints18~75/48~58행tracefs·function·latencytaxonomy.5-02 102~108행과138~159행schedtrace도반복.전용디버깅글과핵심흐름중복이커4. |
| E | 7 | 2·5행function/function_graph/latency는본문이행,실제사용범위설정/출력예있어7. |
| F | 6 | 253~260행next5-04/order43·5-02/5-04/RTOS2-11/Debugchapter03공개대상정상.후행디버깅관점설명도실제ftrace글과대응.기본6. |
| G | 1 | ftrace.rst/trace-cmd공식자료·kernel/도구판·표의출처없다. |

게이트 재판정: 원문만으로 확정할 기술 모순을 찾지 못했다. 미검증 유지이며 구체 주장이 검증되었다는 뜻은 아니다.

병합 대상·다음 조치: Debug chapter03와병합후보.성능관점고유latency분석을보강해야독립의도유지가능.


### part5-04-ebpf.md

source_file: `src/content/blog/embedded/performance-engineering/part5-04-ebpf.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part5-04-ebpf`

score_status: 잠정 · score: 51 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: 30/36/170행kernel기능판·195행stack제한·tracepoint안정성·overhead표·verifier범위와145~166행시나리오총시간은전체미검증.구체옵션한건의확인만으로전편검증됨아님.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | 24~139행VM/verifier/probe/tool소개에141~166행증상별단계가추가되어11.자체관찰은없다. |
| B | 11 | 개념→one-liner→probe→BCC→시나리오→함정완결.118행명령옵션실패와총시간설명의실행전제미비로11,B≤13. |
| C | 6 | 62~72/105~125/143~163행실행코드가있으나kernel/BCC판없고overhead미출처C≤8.118행-g미지원은공식parser확인하여6유지. |
| D | 8 | 62~99/105~125/24~39행 ↔ Debug chapter04-ebpf-kernel43~92/238~273/368~385행one-liner/probe/BCC/verifier.180~190행ftrace동적probe와도일부주제겹침.고유시나리오는남아8. |
| E | 7 | 2·5행동적관측/VM/verifier/probes/BCC는이행.적용시나리오가구체적이어서7. |
| F | 7 | 227~234행next5-05/order44와5-03/5-05/5-10/Debug04정상.180행Tetragon안내는5-10 166~180행실제절과대응,143~163행번호단계가고유길잡이라7. |
| G | 1 | kernel/BCC/bpftrace주장의1차자료URL/버전은본문에없다.이번외부자료확인은G가산근거아님. |

게이트 재판정: [공식BCC profile.py](https://github.com/iovisor/bcc/blob/master/tools/profile.py)의전체Process Arguments를2026-10-19웹으로열었다.-a(annotations)/-f(folded)/-F(frequency)는있고-g는등록되지않는다.118행profile-bpfcc -F99 -ag30에서이옵션을쓰는기존오류판정유지.본문125/148행-af는별도정상형식이다.코드를실제BPFtarget에서실행한검증은아니다.

병합 대상·다음 조치: Debug chapter04와기본probe/tool절중복후보.잘못된옵션우선조치후독립증상별관측결과로보강.

## 원문 스냅샷과 검증 범위

아래 전문과 SHA-256은 이번 근거 읽기 스냅샷이다. 종료 시 동일 해시를 다시 확인했다. target/compiler 실행은 별도 실행 기록이 있는 경우만 인정하며, 실행하지 않은 예제나 공식 자료를 확인했다고 쓰지 않았다.

| 파일 | 전문 | SHA-256 |
| --- | --- | --- |
| part4-05-mutex.md | 1~256행 | 929a88b59db11c970df0b290f9537bae788c38b685c1d97910472373a1070f81 |
| part4-06-rw-lock.md | 1~265행 | 330e9700dd240bc1953ae58a3ad270dafb81dab9eca74837c2353e7240f0b587 |
| part4-07-lock-free.md | 1~305행 | d98392621084e971041720161a0ee861a373cc519c79b19cb91cbe6a1f033899 |
| part4-08-memory-ordering.md | 1~279행 | 39e2100b8d48f6b08fc9641fed5cf64cff11c4dd1ccb59430dad917e44da4336 |
| part4-09-cache-coherency.md | 1~247행 | a3987e8db0b724d34cdc4bc6b9a54faa9616464aec59c649101897f80378248c |
| part4-10-smp-analysis.md | 1~293행 | e1240e383e19d61b5bd4d4705421ba3583a74a56fdf157784eebd37500b75b81 |
| part5-01-perf-basics.md | 1~307행 | a5ec07299f934acd8920c2363b688fa3f9b8e9fa13bb122cf676c8f526e86a88 |
| part5-02-perf-advanced.md | 1~255행 | 59b7f67062fb8def527abdf65cd7a0430edb0392aafa95c1891193b79c67264b |
| part5-03-ftrace.md | 1~260행 | 99f741a6370caaa8c27c93bbef63b15795b191a5ac2fcbc2d563485661e70c91 |
| part5-04-ebpf.md | 1~234행 | 067ecdfe5c376bae64d5fbb95cf0145128f37cebd50498cfb9ae8a7d4ca46dde |
