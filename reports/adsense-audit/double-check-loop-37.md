# 공개 글 독립 재검토 — 루프 37

기준 커밋: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2. 원문 전문을 직접 읽고 근거·중복 비교·링크 의미를 다시 판단했다. 초벌 evidence는 위치 탐색 참고로 사용했으며 점수를 확정 복사하지 않았다. 원문과 기존 보고서 및 사용자 파일 수정·커밋 없음.

공통 검사: [double-check-gates-2026-10-18.md](./double-check-gates-2026-10-18.md). 정적 검사 통과는 사실 검증 완료가 아니다. 앵커는 `10550ca1`의 UART(49)·Build(50) 역사 원문을 기준으로 하고, 현행 Recipes는 D 비교에만 사용한다. 실행/컴파일 검증 없이 예시를 실측으로 인정하지 않는다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `part3-01-critical-section.md` | 10 | 10 | 5 | 8 | 7 | 7 | 1 | 48 | 미검증 | 병합 검토 |
| `part3-02-semaphore-impl.md` | 11 | 10 | 4 | 11 | 7 | 7 | 1 | 51 | 미검증 | 병합 검토 |
| `part3-03-mutex-impl.md` | 9 | 9 | 4 | 7 | 6 | 7 | 1 | 43 | 오류 확인 | 우선 조치 |
| `part3-04-priority-inversion.md` | 8 | 9 | 3 | 7 | 6 | 6 | 1 | 40 | 미검증 | 병합 검토 |
| `part3-05-priority-inheritance.md` | 11 | 9 | 4 | 10 | 7 | 7 | 1 | 49 | 미검증 | 병합 검토 |
| `part3-06-priority-ceiling.md` | 9 | 8 | 4 | 8 | 6 | 7 | 1 | 43 | 오류 확인 | 우선 조치 |
| `part3-07-queue-impl.md` | 11 | 8 | 4 | 8 | 7 | 7 | 1 | 46 | 오류 확인 | 우선 조치 |
| `part3-08-event-group.md` | 12 | 10 | 5 | 11 | 7 | 7 | 1 | 53 | 미검증 | 병합 검토 |
| `part3-09-isr-safe-api.md` | 10 | 10 | 5 | 7 | 7 | 7 | 1 | 47 | 미검증 | 병합 검토 |
| `part3-10-deadlock.md` | 11 | 11 | 5 | 11 | 7 | 6 | 1 | 52 | 미검증 | 병합 검토 |

기존 합계 444 → 재검토 472. 2026-10-19독립재검토.3편기존오류유지,7편미검증유지. PCP오류의취약한기존내부근거는공식Zephyr PI상한설명으로대체했다. Deadlock의다음part안내를다음편오류와구별해F상한을철회했다.실행/컴파일검증없음.

### part3-01-critical-section.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part3-01-critical-section.md`
url: `/blog/embedded/rtos/practical-internals/part3-01-critical-section`

score_status: 잠정 · score: 48 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 모든ISR50us라는일반문장은PRIMASK/BASEPRI범위가모호해단독오류로확정하지않았다.실제FreeRTOSport와C11barrier/SMP조건확인대기.

| 항목 | 근거 |
| --- | --- |
| A10 | IRQ/BASEPRI/RTOSwrapper에서nested/ISRvariant/spinlock/측정으로잇지만원측정사례는없어A10유지. |
| B10 | 구현별구분과중첩복원은설명되나port별실제wrapper와holdtime일반화의조건이없어B10유지. |
| C5 | DWT측정wrapper와spinlock코드가있어도실제board/결과가없다.IRQ1cycle·RTOS별시간표는무출처라C5유지. |
| D8 | 앞서전문을직접읽은sync1-06 49–107·142–162행과본문17–63·195–210행을비교했다.구조는반복되나nested복원/측정wrapper가구현질문을남겨D7→8. |
| E7 | IRQDisable/BASEPRI/Spinlock을각코드와장단점으로실제설명하므로E6→7. |
| F7 | 다음semaphore23의counter/wait설명과relatedsync6/sem23/spin40의실제공개slug/order/title·도입내용일치.중첩복원의호출흐름이있어F6→7. |
| G1 | port원소스·ARM문서·RTOS별시간원자료연결없어G1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~255행. SHA-256: `6681ce0fe204bf73e3813e44f775346f13e4d4ae57fb5a09e21fc5430b1e4183`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part3-02-semaphore-impl.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl.md`
url: `/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl`

score_status: 잠정 · score: 51 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: savedStatus/API이름·timeoutwaitlist등록·실제FreeRTOS구조는버전별대조대기.축약코드의언어/API기억만으로error로올리지않는다.

| 항목 | 근거 |
| --- | --- |
| A11 | itemsize0Queue재활용과priority역순key를counter/wait/ISR/timeout으로풀어A11유지. |
| B10 | 구조와흐름은완결되지만실제queue.c어느버전의함수인지없고축약실행조건이불명확해B10유지. |
| C4 | counter/timeout/ISR코드가있어도빌드·반환값/경쟁trace검증이없다.80B크기는환경무출처라C4유지. |
| D11 | 같이전문을연queue3-07 84–140행과mutex3-03 19–95행및앞서연semaphore1-07을비교.공유Queue뼈대속itemsize0/counter해석이독립이라D11유지. |
| E7 | Counter/WaitList/ISRSafeVariant를실제코드단위로나누어설명하므로E5→7. |
| F7 | nextmutexorder24의owner/PI설명과relatedsem7/mutex24/PI26의실제공개title/order/slug일치.역순key→최고대기자와timeout연결설명이있어F6→7. |
| G1 | 실제semphr.h/queue.c태그·구조크기원자료가없어G1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~252행. SHA-256: `71b50de8262c3b29367965ad322d01b9ff6090094ac0a96188b758ba8e0598f5`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part3-03-mutex-impl.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part3-03-mutex-impl.md`
url: `/blog/embedded/rtos/practical-internals/part3-03-mutex-impl`

score_status: 잠정 · score: 43 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 보인코드의holderboost와바로뒤대기자상속서술이반대임을확인.다중mutex정확보장은코드에추적조건이없어미입증.실제upstream전체동작을검증한것은아니다.

| 항목 | 근거 |
| --- | --- |
| A9 | Queueunion/recursivecount/ownercheck를코드로나누지만자체포트실험없어A9유지. |
| B9 | inherit코드는holderpriority를현재waiter값으로올리는데설명은대기task가ownerpriority를상속한다고반대로적는다.또base0를미boost표시로써원priority0과충돌한다.오류유지/B9. |
| C4 | 축약take/give/PI코드만있고정상/timeout/복수mutex실행결과없어C4유지. |
| D7 | 전문을직접읽은mutex1-08의recursive/ISR/lockorder/timeout과같이연PI3-05 32–87행코드를비교.뒤설명은반복되지만Queueunion/owner기계는독립이라D6→7. |
| E6 | Owner/RecursionCount/ISR금지제목을각각설명하므로E5→6. |
| F7 | nextinversionorder25와MarsPathfinder후행설명및relatedmutex8/inversion25/PI26공개title/order/slug일치.단계별take/give와recursive예제로F6→7. |
| G1 | FreeRTOS/Zephyr원소스버전직접연결이없어G1유지. |

전문 읽기: 1~242행. SHA-256: `38d346346e39dbe87d7acf43971256a9a1cb548a061b5d4350b6f1927902cd34`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part3-04-priority-inversion.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part3-04-priority-inversion.md`
url: `/blog/embedded/rtos/practical-internals/part3-04-priority-inversion`

score_status: 잠정 · score: 40 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: MarsPathfinder기록·configUSE_MUTEX_PI실재·Linuxmutex분류및각RTOS의PCP지원확인대기.서로다른RTOS옵션표만으로모순확정하지않는다.

| 항목 | 근거 |
| --- | --- |
| A8 | bounded/unbounded를나누고Pathfinder→PIP/PCP로설명하지만사례원기록이나독자분석없어A8유지. |
| B9 | 문제/사례/해법/한계는있으나원인추론과실제VxWorks설정의재현정보가없어B9유지. |
| C3 | 재현가능실험·trace·코드가거의없고µs권고조건도없어C3유지. |
| D7 | 전문을연mutex1-08 97–124·168–181행및이루프PCP3-06/PI3-05와비교.동일사례와표중복은크지만bounded/unbounded분류질문을인정해D6→7. |
| E6 | 제목의사례와bounded/unbounded를실제로다루지만깊이가짧아E6유지. |
| F6 | relatedmutex8/muteximpl24/PI26의공개title/order/slug확인.명시next는없어도PI26으로갈수있다.잘못된next가있는것은아니므로F5→6;표준관련목록만으로7을주지않는다. |
| G1 | NASA/JPL/VxWorks/FreeRTOS공식기록이나구현연결이없어G1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~135행. SHA-256: `75806646b92f616225b9d080d6c70ea7b8a5bd29857a0d23a43e58143e39ac27`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part3-05-priority-inheritance.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance.md`
url: `/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance`

score_status: 잠정 · score: 49 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: xTaskCheckForChainedInheritance실재·정확한boost전파조건·timeout복원은upstream대조대기.50cycles/168MHz≈.298us계산자체는맞다.

| 항목 | 근거 |
| --- | --- |
| A11 | base/current/held와inherit/disinherit/chain/timeout을연결해A11유지.자체관찰없음. |
| B9 | 코드로ready위치재배치와held0복원을설명하나실제버전과chain함수근거가없어B9유지. |
| C4 | code와50cycle수치만있고실제depth별trace/설정/benchmark없어C4유지. |
| D10 | 같이직접연mutex3-03 98–134행과inversion3-04 94–100행을비교.반복이있지만이글은heldcount와부분복원논의를구별해D9→10. |
| E7 | Inherit/Disinherit/Chain을실제절과코드로설명해E6→7. |
| F7 | nextPCPorder27과relatedinversion25/PCP27의공개title/order/slug및설명일치.다중mutex단계와그림전후설명이글고유구조여서F6→7. |
| G1 | FreeRTOStasks.c/Zephyr/Linuxrtmutex의원문tag/문서직접연결이없어G1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~189행. SHA-256: `37a3145a90f5af7f48aedcae06991d441b75f91cc31a719f0d333cb4169d6e05`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part3-06-priority-ceiling.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part3-06-priority-ceiling.md`
url: `/blog/embedded/rtos/practical-internals/part3-06-priority-ceiling`

score_status: 잠정 · score: 43 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 기존불필요boost표와서로다른Kconfig이름만으로본내부모순은단독근거에서철회.공식Zephyr문서는CONFIG_PRIORITY_CEILING을PI상한으로설명해PCP활성화예제와다름을확인.

| 항목 | 근거 |
| --- | --- |
| A9 | Immediate/Original비교와systemceiling·증명·축약구현은있지만적용가정분석이약해A9유지. |
| B8 | CONFIG_PRIORITY_CEILING=y로take즉시boostPCP를설정한다고하지만공식Zephyrmutex문서는이설정을waiter기반PI상한정수로설명한다.공식근거로오류유지/B9→8. |
| C4 | 증명/구현이있어도우선순위동률·중첩·blocking실행검증과대상RTOS버전없어C4유지. |
| D8 | 같이전문을연inversion3-04의63–90행및mutex1-08 168–181행과비교.정의/표반복은있지만systemceiling/구현질문은독립이라D7→8. |
| E6 | ImmediatevsOriginal비교제목에표/systemceiling으로답하나가정없는보장서술이강해E6유지. |
| F7 | nextqueueorder28와relatedPI26/queue28실제공개title/order/slug일치.단순템플릿외systemceiling/증명/구현안내가있어F6→7. |
| G1 | PCP논문·Zephyr/VxWorks실제API문서가본문에연결되지않아G1유지. |

전문 읽기: 1~176행. SHA-256: `c9dc049b92fd6737abffb2961b1d1a18bfe9b660c8bbac9125267532e692a61a`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part3-07-queue-impl.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part3-07-queue-impl.md`
url: `/blog/embedded/rtos/practical-internals/part3-07-queue-impl`

score_status: 잠정 · score: 46 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 보인overwrite경로의빈큐count0유지와receive조건을따라확인.실제FreeRTOSqueue.c까지이코드와동일하다고단정하지않는다.

| 항목 | 근거 |
| --- | --- |
| A11 | queue구조→send/wrap/receive→ISRlock을코드로다뤄A11유지.실제관찰없음. |
| B8 | cRxLock주석은ISRsendcount라지만바로뒤send코드는cTxLock을올린다.빈큐overwrite는count를올리지않아receive가empty가되는실행경로도설명과맞지않음.오류유지/B8. |
| C4 | copycycles/전체cycle표에환경·측정근거없고mailbox빈상태테스트없어C4유지. |
| D8 | 전문을직접읽은queue1-09 76–114·166–187행과본문22–97·194–209행비교.구조/변종중복크지만receive/ISRlock구현을구별해D7→8. |
| E7 | RingBuffer/2WaitLists/AtomicSendReceive를코드절로다루므로E6→7. |
| F7 | nextEventGroup29와relatedqueue9/event29의공개title/order/slug및내용일치.송수신대칭과lock처리의단계안내로F6→7. |
| G1 | queue.c/streambuffer원자료tag와cycle근거없어G1유지. |

전문 읽기: 1~242행. SHA-256: `24bfe66268cc386bf3f45788de1e2432e43b9ddac7e04cb1ad727f32b962dbd0`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part3-08-event-group.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part3-08-event-group.md`
url: `/blog/embedded/rtos/practical-internals/part3-08-event-group`

score_status: 잠정 · score: 53 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: SetBits변수/pxNext축약,WaitBits timeout/clear원자성,TickType별bit폭을upstream과대조하지않았다.가상변수명/생략만으로오류확정하지않는다.

| 항목 | 근거 |
| --- | --- |
| A12 | bit/controlmask와전체waiter순회·clear누적·barrier를코드와WiFi예제로연결해A12유지. |
| B10 | AND/OR/clear와defer흐름은있으나FreeRTOS버전/진짜구현경계와완전한실행예가없어B10유지. |
| C5 | 코드와비용모델은있지만N별실제실행·조건/로그없어C5유지.무출처cycle상한적용. |
| D11 | 현재Recipes6-07전문을직접열어AND/OR/broadcast/barrier/ISR사용절과비교.활용중복은있지만19–144행Set/Wait내부순회/clear누적은이글역할이어서D10→11. |
| E7 | BitFlag/ANDORWait/SyncBarrier를각각코드와동작설명으로풀어E7유지. |
| F7 | nextISRsafeorder30의FromISR함수군설명과relatedqueue28/ISR30의공개title/order/slug일치.구조→set→wait→barrier흐름의고유설명이있어F6→7. |
| G1 | event_groups.c공식태그/버전별조건및성능근거연결이없어G1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~264행. SHA-256: `f161938146ea1ba634d2a3c2a9ab898296dbbd9c55174e046ad343e63237543f`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part3-09-isr-safe-api.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api.md`
url: `/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api`

score_status: 잠정 · score: 47 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: xSemaphoreTake컴파일에러vsxQueueSend런타임은API가다르므로단독모순확정안함.포트별API매크로와BASEPRI경계/ISR문맥에대한공식대조대기.

| 항목 | 근거 |
| --- | --- |
| A10 | woken/yield/save-mask/daemon/deferred를한흐름으로묶으나독자port검증없어A10유지. |
| B10 | task/ISR차이와yield책임은설명되나실제port버전과오류결과조건이없어B10유지. |
| C5 | UART/deferred/daemon예시는있지만interrupt부하·실행trace없고정량근거가약해C5유지. |
| D7 | 전문을직접읽은ISR1-05 57–118행과이글39–54·99–125·161–173행비교.예제가반복되나mask복원과daemon내부구조를인정해D6→7. |
| E7 | FromISR/HigherPriorityWake/DeferredWork를각각코드/설명으로풀어E6→7. |
| F7 | nextdeadlock31의발견/예방내용과relatedevent29/deadlock31의공개title/order/slug일치.시나리오별yield와작업위임의단계안내로F6→7. |
| G1 | FreeRTOS공식API/port코드tag연결없어G1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~264행. SHA-256: `f9ba48e478c1422f7330bcfa11d09ef735131fe1205e451e3256007a6e11f347`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part3-10-deadlock.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part3-10-deadlock.md`
url: `/blog/embedded/rtos/practical-internals/part3-10-deadlock`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: lockdep모델·hier_take timeout반환무시·TaskStatus_t필드·RWupgrade지원은공식/실행확인대기.실제커널전체보장이나가상for(each...)코드를실행코드로검증하지않았다.

| 항목 | 근거 |
| --- | --- |
| A11 | Coffman→cycle→4해법→RW/livelock/watchdog까지문제분류가있어A11유지. |
| B11 | 검출/회피예시가있으나timeout/rollback보장의조건과graph의범위·lockdep비교가불명확해B11유지. |
| C5 | 코드/graph는있지만실제deadlockdump·watchdog결과·toolversion이없어C5유지. |
| D11 | 전문을직접읽은mutex1-08 183–210행과mutex3-03 157–180행의lockorder/timeout을비교.그부분은반복이나Coffman/hierarchy/livelock이라는독립질문으로D10→11. |
| E7 | 4조건/WaitGraph/LockOrder/Timeout제목요소가각각구체절과예제로있어E5→7. |
| F6 | 다음part가memory라는문장은실제Part4(order33)와맞으며다음편이즉시memory라고한것은아니다.따라서3-11(order32)누락만으로잘못된next상한은철회해F4→6.관련inversion25/ISR30및3-05본문안내실제공개target일치. |
| G1 | Coffman원논문·Linuxlockdep공식문서·FreeRTOS구조체태그가없어G1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~295행. SHA-256: `6a439ae77602f2f5082cb0fe53cdf810c9c760298bbf557815f3fb3fa4a9a428`. 기준 HEAD 원문과 바이트 일치를 확인했다.

## 적용 상한과 검증 한계

정확성 불확실이 열리면 B≤13(AP-C-24), 무출처 수치 C≤8, 절차만 있는 경우 C≤9를 우선 적용했다. F는 실제 slug/order/draft/title과 안내 뒤 설명을 대조하고 틀린 대상/설명이 있으면5 이하, 템플릿 외 글 고유 안내가 있을 때7 이상으로 판단했다. 축약 제목과 실질적인 오안내를 구분했다. 다른 시나리오·산문 개수·완곡한 본문/단정 요약·언어/API 기억만으로 오류를 확정하지 않았다. 실행하지 않은 코드와 관찰되지 않은 로그는 검증 완료로 기록하지 않는다.

## 원출처와 검증 범위

[Zephyr 공식 Mutex 문서 Priority Inheritance](https://docs.zephyrproject.org/latest/kernel/services/synchronization/mutexes.html#priority-inheritance)는CONFIG_PRIORITY_CEILING을waiter에의해상속되는priority의상한으로설명한다.이는PCP글의take즉시boost를설정하는예제와다르다.최신문서를대조했으며글에고정버전이없어이차이는적용버전보강도요구한다.다른Zephyr/FreeRTOS/Linux주장전체를검증완료로기록하지않았다.원문전문과기존점수표,직접연D비교문단,공개target메타데이터와안내후행설명을근거로판단했다.Recipes는현행D비교에만사용하고재채점하지않았다.
