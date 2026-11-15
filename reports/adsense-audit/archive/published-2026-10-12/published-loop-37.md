# 공개 글 AdSense 평가 — 루프 37

> 대상: 공개 글 10편 (Practical RTOS Internals `seriesOrder` 22~31, Part 3 IPC·동기화 내부 3-01~3-10)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 서른일곱 번째 루프다. 대상은 `src/content/blog/embedded/rtos/practical-internals/`의 Part 3 열 편(part3-01 critical section부터 part3-10 deadlock까지, seriesOrder 22~31)이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part3-01-critical-section.md` | 10 | 10 | 5 | 7 | 6 | 6 | 1 | **45** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part3-02-semaphore-impl.md` | 11 | 10 | 4 | 11 | 5 | 6 | 1 | **48** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part3-03-mutex-impl.md` | 9 | 9 | 4 | 6 | 5 | 6 | 1 | **40** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part3-04-priority-inversion.md` | 8 | 9 | 3 | 6 | 6 | 5 | 1 | **38** | 미검증 | 제외 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part3-05-priority-inheritance.md` | 11 | 9 | 4 | 9 | 6 | 6 | 1 | **46** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part3-06-priority-ceiling.md` | 9 | 9 | 4 | 7 | 6 | 6 | 1 | **42** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part3-07-queue-impl.md` | 11 | 8 | 4 | 7 | 6 | 6 | 1 | **43** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part3-08-event-group.md` | 12 | 10 | 5 | 10 | 7 | 6 | 1 | **51** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part3-09-isr-safe-api.md` | 10 | 10 | 5 | 6 | 6 | 6 | 1 | **44** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part3-10-deadlock.md` | 11 | 11 | 5 | 10 | 5 | 4 | 1 | **47** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |

평균 44.4점(10편, 합 444점), 범위 38~51점이다. 판정은 병합 검토 6편(3-01·3-02·3-05·3-08·3-09·3-10), 우선 조치 3편(3-03·3-06·3-07), 제외 검토 1편(3-04)이고 유지·검증 대기·보강은 없다. 점수 구간으로는 3-04(38)만 제외 검토(<40)이고 나머지 9편은 병합 검토(40~59)다. 우선 조치 3편은 모두 원문 내부 모순에 따른 오류 확인이다(3-03 115행 상속 방향 등 3건, 3-06 82 대 86행 표·59 대 101행 Zephyr 옵션 이름, 3-07 148행 주석 대 162행 코드·174행 Mailbox 대 104~108·120행). 병합 검토 6편 중 병합 대상을 정한 것은 3-01(part1-06), 3-02(part3-07), 3-05(part3-03), 3-09(part1-05·part4-09)이고, 3-08·3-10은 병합 대상 없음이다. 여섯 편 모두 다음 조치는 보강이다. 10편 모두 1차 자료 대조 커밋이 없어 오류 확인 3편을 뺀 7편이 미검증이고 G는 모두 1점이다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·`draft`, 3-05·3-09의 다이어그램 경로까지이고 렌더링·광고 배치·외부 유사도는 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `part3-01-critical-section.md` | 45 | 45 | 0 | 없음 |
| `part3-02-semaphore-impl.md` | 49 | 48 | -1 | 없음 |
| `part3-03-mutex-impl.md` | 40 | 40 | 0 | 없음 |
| `part3-04-priority-inversion.md` | 38 | 38 | 0 | 없음 |
| `part3-05-priority-inheritance.md` | 46 | 46 | 0 | 없음 |
| `part3-06-priority-ceiling.md` | 41 | 42 | +1 | 없음 |
| `part3-07-queue-impl.md` | 44 | 43 | -1 | 없음 |
| `part3-08-event-group.md` | 51 | 51 | 0 | 없음 |
| `part3-09-isr-safe-api.md` | 46 | 44 | -2 | 없음 |
| `part3-10-deadlock.md` | 48 | 47 | -1 | 없음 |

- 기각한 오류 확인: 없음.
- 추가한 오류 확인: 3-07은 평가자가 미검증으로 두고 불확실로만 적은 두 문제가 글 안에서만으로 모순이 성립해 오류 확인으로 올렸다. (1) 148행 주석 'cRxLock ... 0+ = ISR queued sends count'와 155~163행 xQueueSendFromISR 코드가 ISR send를 cTxLock++(162행)로 세는 것. (2) 174행 'queueOVERWRITE // Mailbox (1 slot, 덮어쓰기)'와 104~108행(OVERWRITE면 uxMessagesWaiting을 늘리지 않고 return)·120행(uxMessagesWaiting > 0일 때만 수신). 판정이 병합 검토에서 우선 조치로 바뀌었고 B 9→8.
- 3-03은 평가자가 오류 확인으로 올린 115행 상속 방향 모순에 두 건을 더했다. 134행 'chain inheritance도 정확하게 처리' 대 120~131행 코드(보유 mutex 수를 세지 않고 give마다 복원), 106·126행의 0 표시 방식이 boost되지 않은 owner의 priority를 0으로 만드는 것(123~125행) 대 134행 '원래 priority로 복원'.
- 오류 확인으로 올리지 않은 의심: 3-01 43행 'BASEPRI mask + scheduler suspend' 대 50~62행, 3-02 150~155행 깨어난 경로의 counter 미감소, 3-08 48·75행 미선언 식별자, 3-09 87행 '컴파일 에러' 대 225행 '컴파일은 통과', 3-10 193행 xEventListItem 필드는 API 의미를 알아야 판단되는 코드 결함이라 루브릭 3-1 예외에 따라 uncertainties에 두었다. 3-04 60·117행 `configUSE_MUTEX_PI`는 로컬 FreeRTOS-Kernel clone이 없어 1차 자료로 확인하지 못했다.
- 3-02: E 6→5. 제목이 '내부 구현 추적'을 약속하는데 본문이 upstream을 따라가지 않는 재구성 의사코드라 루브릭 E의 3~5 구간이다.
- 3-06: E 5→6. Original PCP가 33~38행 표와 67~76행 System Ceiling 규칙에 있어 키워드 절반 이상이 빠진 것은 아니다. '부분 미이행'으로 6~8 구간 하단.
- 3-09: A 11→10, D 7→6. 평가자가 고유하다고 본 127~159행 daemon task·xTimerPendFunctionCallFromISR 절이 part3-08 179행과 part4-09-software-timer.md 55~86·226~245행에 이미 있다. E는 6 유지하되 '범용 제목 + FreeRTOS 본문(E ≤ 8)' 근거를 뺐다. 제목의 'FromISR'가 범위를 드러낸다.
- 3-10: E 6→5. 제목 'Deadlock 분석'과 description 'wait-for graph 분석'이 분석을 약속하는데 graph는 그림 하나(51~58행)뿐이다. 앵커 part1-04('동작 분석' 5점)에 맞췄다. D는 modern-recipes/part6-12-rtos-debugging.md 51·100~114행과 part3-06 40~50행 비교를 더하고 10 유지.
- 줄 번호·근거 보정(점수 영향 없음): 3-01 part1-06 50 µs 줄을 192→193행, perf part4-04 172행으로 좁힘, anchor_ref를 F 비교에 쓴 part7-05로 교체. 3-02 part3-09 28~35행·part1-07 98~121행. 3-03 part1-08 timeout 201~209행. 3-04 part3-06 표 30~37·78~88행, part3-05 101~111행. 3-06 part3-04 63~71·75~81·83~90행. 3-08 freertos-mastering/chapter08-event-groups.md(draft) 비교 추가, part3-09 150~158행.
- 부풀림 판정은 10편 모두 없음이다. 3-06의 +1은 루브릭 E 구간 규칙을 그대로 적용한 결과다.

## 글별 근거

### `part3-01-critical-section.md` — 45점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(42ebbcbb stub 추가 → 2bb21c78 → 59660dc9 Part 3 본문 작성 → 845231cf TikZ → 85a2d46f 번역투 수정·공개 → 49f2a443 텍스트 블록 변환 → ac24bb76 제목 변경 → be973200 topic 메타 → 0a9dd7bc slug 고정)에 fact-check·datasheet·upstream·port.c 대조 기록이 없다. 평가 중 FreeRTOS 소스나 ARMv7-M ARM을 열지 않아 오류 확인도 주지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | PRIMASK(22~27행)·BASEPRI(31~38행)·taskENTER_CRITICAL(42~65행)·spinlock(100~113행)·memory barrier(195~210행)·lock-free 대안(159~170행)은 RTOS 입문 자료의 표준 목록이다. 고유한 몫은 nesting 카운트를 주석으로 따라가는 예(69~83행), DWT CYCCNT 측정 래퍼(141~155행), tail-chaining 누적 비용 메모(174~182행)다. 134행 '10 µs 이하'와 214~219행 RTOS별 표는 근거 없이 단정한다. 앵커 part6-09(A 10)와 같은 구간. |
| B | 10 | 세 구현 → nesting → ISR variant → SMP → hold time → 측정 → 대안 → 정리(243~247행)로 흐름은 끝까지 간다. taskEXIT_CRITICAL 내부를 보여 주지 않아 83행 설명을 코드로 확인할 수 없고, 측정 래퍼(141~152행)는 nested 진입과 DWT 활성화를 다루지 않는다. 43행 대 50~62행, 119행 심볼 등 정확성 불확실이 열려 있어 AP-C-24로 B ≤ 13, 한계 누락으로 10~15 구간 하단. |
| C | 5 | DWT 측정 코드(141~153행)는 대상 코어·클록·예상 결과가 없고 `last_enter`·`log_max`가 정의되지 않았으며 CYCCNT 활성화(DEMCR TRCENA, DWT CTRL)도 없다. 126~130행 50 µs, 134행 10 µs, 176행 '1 cycle', 214~219행 표는 출처·환경 없는 수치라 C ≤ 8. 관찰·합격 절차가 없어 4~7 구간. |
| D | 7 | part1-06-sync-basics.md 49~107행(세 도구)이 이 글 17~46행과 같은 구성이고, 1-06 142~162행 memory reorder 예는 195~210행, 1-06 210·213행 표는 184~193행과 같다. SMP 절(96~113행)은 part4-08-spinlock-smp.md 24~66·94행이 더 깊게 다룬다. 239행 함정은 performance-engineering/part4-04-spinlock.md 172행과 같다. ISR variant(85~94행)는 part3-09-isr-safe-api.md 56~80행이 더 자세하다. 인접 part2-11-tracing-observability.md·part3-02와는 겹치지 않는다. 고유한 몫은 nesting(67~83행)과 측정 래퍼(139~155행)뿐이라 5~9 구간. |
| E | 6 | 제목 키워드 IRQ Disable(19~27행)·BASEPRI(29~38행)·Spinlock(96~122행)과 description의 hold time(124~137행)은 다룬다. '구현 비교'는 한곳에 모은 비교 없이 절별 나열이고(184~193행 IRQ vs scheduler 비교만 있음), hold time은 출처 없는 수치뿐이라 6~8 구간 하단. |
| F | 6 | 249행 다음 편 'Semaphore 내부 구현'은 seriesOrder 23 part3-02-semaphore-impl.md와 맞다. 253~255행 관련 링크 세 개(1-06, 3-02, 4-08)를 열어 라벨·대상이 맞고 draft가 아님을 확인했다. 전제 지식 안내와 긴 코드의 단계 안내가 없어 7점 이상은 주지 않았다(앵커 part7-05는 내부 안내가 있어 7). |
| G | 1 | 본문 출처 링크가 없다. 50~62행을 '내부'라 하면서 FreeRTOS 버전·포트를 적지 않았고, 27행 PRIMASK 범위·113행 casal도 ARM ARM 인용이 없다. |

uncertainties:
- 43행 주석은 taskENTER_CRITICAL이 'BASEPRI mask + scheduler suspend'를 한다고 쓰지만 50~62행 '내부' 코드에는 scheduler suspend 호출이 없고, 190행은 scheduler suspend를 vTaskSuspendAll로 정의한다. BASEPRI가 PendSV를 막아 사실상 전환을 막는다는 해석이 가능해 API 의미 판단이 필요하므로 오류 확인으로 올리지 않았다.
- 51~62행 portENTER_CRITICAL → vPortRaiseBASEPRI가 uxCriticalNesting을 올린다는 서술은 실제 Cortex-M 포트의 vPortEnterCritical로 확인하지 않았다.
- 119행 `portSPINLOCK_ENTER(&xCoreSpinlock)`가 FreeRTOS SMP에 있는 심볼인지 미확인.
- 113행 'ARMv8 이상에서는 casal'은 part4-08 45행 'ARMv8.1 LSE'와 다르다(다른 글과의 불일치).
- 27행 PRIMASK가 NMI·HardFault를 뺀 모든 IRQ를 막는다는 범위를 ARMv7-M ARM으로 확인하지 않았다.
- 134·245행 '10 µs 이하'는 part1-06 193행 '최대 50 µs까지가 안전'과 어긋난다(다른 글과의 모순, 둘 다 출처 없음).
- 212행 절 제목 'RTOS별 평균'과 214행 열 'Max critical'이 맞지 않는다(표기 실수 수준).
- 126~128행 '모든 ISR이 최대 50 µs 지연'은 38·244행 'BASEPRI는 고우선 HW IRQ를 계속 동작시킨다'와 범위가 다르다.
- 141~152행 측정 래퍼는 전역 last_enter 하나라 nested 진입 시 바깥 값을 덮어쓴다.
- 176행 '__disable_irq 1 cycle'은 출처 없는 수치다.
- 239행 '단일 코어에서 영원히 spin'은 holder 선점·ISR 동일 lock 조건이 빠졌는지 판단을 보류한다.

병합 대상: `src/content/blog/embedded/rtos/practical-internals/part1-06-sync-basics.md`(세 도구, memory ordering, IRQ disable vs scheduler suspend가 겹침). 다만 Part 3 첫 글로 'FreeRTOS critical section 내부 구현'이라는 독립 검색 의도가 있어 다음 조치는 보강(차별화)이다. 1-06과 겹치는 memory barrier 절(195~210행)과 4-08이 더 깊게 다루는 spinlock 절(96~113행)을 줄이고, 버전을 밝힌 FreeRTOS port.c의 vPortEnterCritical/vPortExitCritical 실제 코드, BASEPRI 복원 경로, 환경을 밝힌 측정 결과로 채운다. 보강 뒤에도 1-06과 차이가 없으면 1-06으로 병합한다.

### `part3-02-semaphore-impl.md` — 48점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic 메타, ac24bb76 제목 변경, 85a2d46f 번역투 수정·발행과 그 이전 작성 커밋)에 FreeRTOS-Kernel semphr.h·queue.c·tasks.c와 대조한 커밋이 없다. 평가 중에도 upstream을 열지 않았고, 본문 안 모순은 API 의미를 알아야 판단되는 코드 결함이라 uncertainties로 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 고유한 부분은 event list item 값을 configMAX_PRIORITIES - uxPriority로 뒤집어 높은 priority를 앞에 두는 설명(92~102행), lost wakeup을 counter와 critical section으로 막는 대비(164~183행), Zephyr k_sem 비교(210~218행) 정도다. 나머지는 'Semaphore = item size 0인 Queue'(15·27행)를 재구성 의사코드(31~70·106~125행)로 다시 보여 주고, 49행 prvAddCurrentTaskToWaitList·51행 block_with_timeout처럼 upstream에 없는 이름을 쓴다. 6~12 구간 상단. |
| B | 10 | 구조 → Take/Give → counting → wait list → FromISR → timeout → lost wakeup → 메모리 → Mutex 비교 → 함정 → 정리(13~246행)로 흐름은 간다. 143~144행은 같은 task를 두 함수로 연달아 등록해 41~52행과 맞지 않고, 108행에서 받지 않은 savedStatus를 120·123행에서 쓴다. 150~155행은 깨어난 뒤 counter를 내리지 않고 pdPASS를 돌려 40행 'counter--'와 맞지 않는다. 188행 80 byte는 출처가 없다. 10~15 구간 하단. |
| C | 4 | 실행 환경·FreeRTOS 버전·포트가 없고 코드는 컴파일되지 않는 의사코드다(33행 'SemaphoreHandle_t = Queue {', 23행 매크로로 정의한 xSemaphoreTake를 137행에서 함수로 재정의). 188행 'sizeof(Queue_t) ≈ 80 byte'는 출처·환경 없는 수치라 C ≤ 8. 재현 절차가 없어 4~7 구간 하단. |
| D | 11 | 비교: part3-01-critical-section.md(22), part3-03-mutex-impl.md(24), part1-07-semaphore.md(7), part3-07-queue-impl.md(28), part3-09-isr-safe-api.md(30), modern-recipes/part6-04-semaphore-usage.md. 41~70행 Take/Give는 part3-07 113~140행과 같은 뼈대이고 part3-07 84~90행이 'Semaphore mode'를 이미 다룬다. 106~132행 FromISR 차이는 part3-09 28~35행 표와 같다. part1-07 98~121행은 개념 수준, part6-04 24행은 사용 관점이다. 'semaphore가 queue로 어떻게 구현되나'는 이 글에만 있어 역할은 구별된다. |
| E | 5 | Counter(29~81행)·Wait List(83~102행)·ISR-Safe Variant(104~132행)는 다룬다. 제목이 '내부 구현 추적'을 약속하는데 upstream 파일·함수 위치를 따라가지 않고 upstream에 없는 이름(49·51·92행)을 섞은 재구성 의사코드라 3~5 구간. description(5행)은 메모체 한 줄이다. |
| F | 6 | 246행 다음 편 'Mutex 내부 구현'은 seriesOrder 24 part3-03-mutex-impl.md와 맞다. 250~252행 1-07·3-03·3-05 라벨을 대상 파일과 대조해 맞음을 확인했고 206행 '3-03에서' 안내도 맞다. 전제 글(3-01, 3-07) 안내·링크가 없어 7점 이상은 아니다. |
| G | 1 | 본문 출처 링크·FreeRTOS 버전·queue.c/tasks.c/semphr.h 파일명·Zephyr 버전(210~215행)이 없다. 188행 수치도 조건이 없다. modern-recipes part6-04 24행이 V11.2.0 줄 링크를 단 것과 대조된다. |

uncertainties:
- 143~144행: prvAddCurrentTaskToWaitList와 vTaskPlaceOnEventList를 연달아 불러 같은 xEventListItem을 두 번 넣는 형태. 49행 흐름과도 다르다. queue.c로 확인하지 않았다.
- 108행 portENTER_CRITICAL_FROM_ISR()의 반환값을 받지 않고 120·123행에서 savedStatus를 쓴다. 130행 산문은 taskENTER_CRITICAL_FROM_ISR라고 적는다.
- 57~64행 Give는 counter를 올린 뒤 깨우는데 51·150~155행 Take의 깨어난 경로는 counter를 내리지 않아 40행 'counter--'와 맞지 않는다. 실제 xQueueSemaphoreTake 루프 동작은 upstream으로 확인하지 않았다.
- 107~125행: xSemaphoreGiveFromISR → xQueueGiveFromISR 매핑, cTxLock 상태 처리, 115행 priority 비교 대신 xTaskRemoveFromEventList 반환값 사용 여부는 미확인.
- 188행 'sizeof(Queue_t) ≈ 80 byte'는 출처·포트·config 조건 없는 수치다.
- part1-07 112~121행은 waiter가 있으면 count를 올리지 않고 깨우는데 이 글 57~64행은 올린 뒤 깨운다. 어느 쪽이 맞는지 1차 자료로 정해야 한다.
- 232행 'xSemaphoreTakeFromISR는 timeout 0 의미', 204행 'Mutex ISR Give ✗'의 조건은 semphr.h로 확인하지 않았다.
- 210~215행 struct k_sem 필드 구성은 Zephyr 버전별로 미확인.

병합 대상: `src/content/blog/embedded/rtos/practical-internals/part3-07-queue-impl.md`(84~90행 semaphore mode, 113~140행 receive·wait list 경로가 이 글 41~70행과 같은 뼈대). 'FreeRTOS semaphore 내부 구현'은 독립 검색 의도가 있어 다음 조치는 보강이다. FreeRTOS-Kernel 고정 태그의 semphr.h·queue.c(xQueueSemaphoreTake, xQueueGiveFromISR)·tasks.c와 대조해 의사코드를 실제 경로로 바꾸고, 143~144행 이중 등록·108/120행 savedStatus·150~155행 counter 미감소를 정리하고, 3-07과 겹치는 queue 일반 설명은 링크로 넘긴다.

### `part3-03-mutex-impl.md` — 40점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1, 코드 대 산문) 세 건. (1) 101~112행 코드는 owner에게 대기 task의 priority를 준다(108행 `holder->uxPriority = pxCurrentTCB->uxPriority`). 98행 제목('Owner의 priority 동적 boost')과 184행도 같은 방향인데 115행은 '대기 task가 owner의 priority를 일시적으로 상속'한다고 방향을 거꾸로 적어 둘 다 참일 수 없다. (2) 134행 'mutex가 여러 개 얽힌 chain inheritance도 정확하게 처리'와 120~131행 코드(보유 mutex 수를 세지 않고 give 때마다 바로 복원). (3) 106행은 `uxBasePriority == 0`을 boost 안 된 표시로 쓰고 126행은 복원 뒤 0으로 되돌린다. boost되지 않은 owner(base 0, priority 3)가 give하면 86행이 복원 함수를 부르고 123행 조건(0 != 3)이 참이 되어 125행이 priority를 0으로 만든다. 134행 '원래 priority로 복원'과 함께 참일 수 없다. git log(59660dc9 본문 작성, 85a2d46f 번역투 수정·공개, ac24bb76 제목 변경, be973200·0a9dd7bc 메타, 845231cf 다이어그램)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 고유한 부분은 Queue 공용 영역을 mutex 모드에서 owner와 recursion count로 다시 해석하는 설명(19~36행)과 take/give 흐름 코드(40~95행)다. 실제 소스가 아니라 다시 쓴 의사코드이고(`rebalance_ready_list` 110·127행, `wake_highest_priority_waiter` 90행) 깊은 분석이 없다. 157~186행 deadlock·timeout·hold time, 188~195행 static allocation, 197~208행 Zephyr 구조체는 일반론이거나 part1-08 반복이다. 186행 '수 µs 이하'는 근거 없는 기준이다. |
| B | 9 | 구조 → take → give → PI → recursive → ISR → deadlock → 실수 → 정리로 흐름은 끝까지 간다. 내부 모순 셋과 열린 정확성 불확실로 B ≤ 13(AP-C-24). 15행 'pxMutexHolder만 추가'는 230행 'pxMutexHolder와 uxRecursiveCallCount를 추가'와 다르고, 155행 ISR 금지 이유는 두 문장뿐이다. 5~9 구간 상단. |
| C | 4 | 정의되지 않은 헬퍼(89·90·110·127행)를 쓰는 의사코드라 실행할 수 없다. 20~33행 union 필드는 `u.xSemaphore.xMutexHolder`인데 46·57·71·72·84행은 `mutex->pxMutexHolder`를 읽는다. 106·123·126행 로직은 boost되지 않은 owner의 priority를 0으로 만든다. 버전·포트·보드 환경이 없고 186행 수치는 출처가 없어 C ≤ 8. 4~7 구간 하단. |
| D | 6 | part1-08-mutex.md와 겹친다: 157~169행 lock ordering ↔ 1-08 183~198행, 171~180행 timeout ↔ 1-08 201~209행(거의 글자 단위), 182~186행 hold time ↔ 1-08 212~227행, 149~155행 ISR 금지 ↔ 1-08 229~237행, 136~147행 recursive ↔ 1-08 76~92행. part3-05-priority-inheritance.md 32~87행이 98~134행 PI 코드를 다시 다룬다. part3-02의 'Mutex와의 차이' 절(약 195~206행)은 이 글로 넘겨 역할이 나뉜다. modern-recipes/part6-05-mutex-usage.md 97~117·153~163행도 같은 내용이다. 고유한 것은 19~95행 정도. |
| E | 5 | 제목은 '내부 구현 추적'인데 본문은 실제 소스를 추적하지 않고 의사코드(40~131행)와 개념 반복(157~195행)이라 3~5 구간. 키워드 Owner(64~96행)·Recursion Count(136~147행)·ISR 금지(149~155행)와 description의 uxBasePriority(104~127행)는 다룬다. |
| F | 6 | 236행 다음 편 'Priority Inversion 문제'는 seriesOrder 25 part3-04-priority-inversion.md와 맞다. 240~242행 1-08·3-04·3-05 라벨도 대상 파일을 열어 맞음을 확인했다. 전제 지식 안내(1-08, 3-02)와 긴 코드의 단계 구분이 없어 7점 이상은 아니다. |
| G | 1 | 본문 출처 링크·FreeRTOS 버전·queue.c/tasks.c 파일명·Zephyr 버전(199~205행)이 없다. |

uncertainties:
- 152행 `xSemaphoreTakeFromISR(mutex, ...)`가 '컴파일 에러'라는 주장은 확인하지 않았다. 같은 SemaphoreHandle_t라 런타임 assert일 수 있다.
- 55행 `xQueueGenericReceive`가 10.x 이후에 남아 있는지(xQueueSemaphoreTake로 바뀌었는지) 미확인.
- 86행 `vTaskPriorityDisinheritAfterTimeout`, 117~134행 `vTaskPriorityDisinherit`(반환형 BaseType_t), part3-05 63행 `xTaskPriorityDisinherit` 중 실제 이름·호출 위치 미확인.
- 67~75행 일반 give 경로(xQueueGenericSend)가 non-owner에 pdFAIL을 돌려주는지 미확인.
- 20~33행 union 필드 `xMutexHolder`와 `mutex->pxMutexHolder` 중 실제 Queue_t 필드 이름 미확인.
- 199~205행 Zephyr `struct k_mutex` 필드 구성 미확인.
- 186행 '수 µs 이하'는 출처·환경 없는 수치다.
- 106·123·126행 0 표시 모순은 uxBasePriority 초기값이 0이라는 전제(106행이 암시)에 기댄다.

병합 대상: 판정은 오류 확인 때문에 우선 조치이고 점수 구간은 병합 검토다. 후보는 `src/content/blog/embedded/rtos/practical-internals/part1-08-mutex.md`(157~186·149~155행 중복 절 삭제)와 `src/content/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance.md`(98~134행 PI 코드 이관)다. 남는 19~95행은 독립 가치가 있어 다음 조치는 보강이다. 115행 방향, 134행 chain 주장, 106·123·126행 0 표시 로직을 먼저 고치고 FreeRTOS queue.c·tasks.c 특정 태그와 대조해 의사코드를 다시 쓴다.

### `part3-04-priority-inversion.md` — 38점, 제외 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic 메타, ac24bb76 제목 변경, a746e269 text 코드블록 정리, 85a2d46f 번역투 수정·공개 등)에 FreeRTOS 소스·VxWorks 문서·JPL 보고서와 대조한 커밋이 없다. 원문 안에서 동시에 참일 수 없는 모순도 찾지 못했다(50행 'VxWorks PI로 해결'과 90행 'PCP 채택 VxWorks'는 VxWorks가 둘 다 지원하면 함께 참). 로컬에 FreeRTOS-Kernel clone이 없어 60행 매크로를 확인하지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 8 | Bounded/Unbounded 정의(19~36행), PIP(52~57행), PCP(63~73행), 비교 표 두 개(77~90행)는 입문서의 표준 설명이다. Pathfinder 절(38~50행)은 task 세 개 이름과 'PI 활성화로 해결' 한 줄뿐이고 원인 추적 과정이 없다. 100행 '보통 깊이 제한', 108행 '수 µs'는 근거 없는 일반론이다. 고유 관점은 Bounded/Unbounded 구분과 119행 'bounded일 뿐 zero는 아님' 정도라 6~12 구간 하단. |
| B | 9 | 정의(15행) → 형태(19~36행) → 사례(38~50행) → 해결책(52~73행) → 비교(75~92행) → 한계(94~100행) → 회피(106~111행) → 실수(113~121행) → 정리(123~129행)로 흐름은 있다. 절마다 불릿 서너 개이고 코드는 60행 설정 한 줄뿐이다. 115·129행이 mutex를 쓰라면서 생성 API를 보여 주지 않고, PREEMPT_RT(102~104행)는 두 문장이다. 5~9 구간. |
| C | 3 | inversion 재현 task 구성·trace 확인 절차·예상 관찰이 없다. 59~61행 ```c 블록은 C 문장이 아닌 설정 표기다. 24·108행 '수 µs'는 환경·출처 없는 수치이고, 117행 'configUSE_MUTEX_PI = 0이면 Pathfinder 사례가 재현'도 검증 절차 없는 단정이다. 0~3 구간. |
| D | 6 | 비교: part3-03-mutex-impl.md(24), part3-05-priority-inheritance.md(26), part3-06-priority-ceiling.md(27), part1-08-mutex.md(8), modern-recipes/part6-10-priority-inversion.md, part5-07-preempt-rt-linux.md. 38~61행 Pathfinder·PI·`configUSE_MUTEX_PI = 1`은 part1-08 97~124행, recipes 6-10 37~62행과 같다. 63~73행 PCP는 part1-08 168~181행과 거의 같다. 75~90행 표 두 개는 part3-06 30~37·78~88행 표의 축소판이다. 94~100행 chain은 part3-05 101~111행, recipes 6-10 89~99행과 겹친다. 고유한 것은 19~36행 정도라 5~9 구간. |
| E | 6 | 'Mars Pathfinder 사례'는 38~50행, 'Bounded vs Unbounded'는 19~36행, description의 '1997 화성 탐사선 reset의 원인'은 48행이 답한다. '사례'가 13행 요약이고 본문 절반(52~104행)이 제목에 없는 해결책 비교라 6~8 구간 하단. |
| F | 5 | 다음 편 안내가 없다. 123~129행 정리 뒤 바로 131행 관련 항목이 온다(part3-03 236행, part3-05 184행에는 있음). F ≤ 6. 133~135행 링크 세 개는 대상 파일을 열어 맞음을 확인했다(135행 3-05가 실제 다음 편). PCP를 다루면서 part3-06 링크가 없고 시나리오 그림(1-08 100행, recipes 6-10 21행)도 없어 5. |
| G | 1 | 본문 출처 링크가 없다. Pathfinder(38~50행)에 JPL·Glenn Reeves 설명 같은 1차 출처가 없고, 60·117행 설정, 81·90행 VxWorks·Zephyr 채택 표, 104행 Linux 주장에 버전이 없다. |

uncertainties:
- 60·117행 `configUSE_MUTEX_PI`: FreeRTOS에 이 매크로가 있는지 확인하지 못했다(로컬 clone 없음). 기억으로는 xSemaphoreCreateMutex mutex에 PI가 항상 적용된다. part1-08 124행에도 같은 매크로가 있다.
- 104행 'Mainline mutex에는 PI가 없습니다': mainline에도 rt_mutex·PI futex가 있고, part5-07 14·20행은 PREEMPT_RT가 6.12에서 mainline에 합류했다고 쓴다(다른 글과의 불일치).
- 81행 Immediate PCP 채택 'VxWorks·Zephyr', 90행 PIP 'FreeRTOS·Zephyr', PCP 'VxWorks'는 미확인. 50행과 90·128행의 결이 다르지만 둘 다 참일 수 있다.
- 48행 reset 경로와 45행 통신 task 'long-running'은 JPL 설명 원문과 대조하지 않았다.
- 87행 '단순성 PIP ✓, PCP ✗'는 80행 'Immediate 구현 단순', part3-06 87행과 결이 다르다. Original PCP 기준이면 참일 수 있다.
- 합계 38점은 병합 검토 하한(40)과 2점 차이다. A·E에서 1점씩 해석이 갈리면 병합 검토(대상 part3-05/3-06 또는 part1-08)로 바뀐다.

다음 조치: 제외 검토. 사유는 해결책 설명(52~100행)이 part1-08·part3-05·part3-06을 반복하고 고유 내용이 19~36행 Bounded/Unbounded 구분뿐이라는 점이다. 제외 대신 살린다면 Pathfinder 원인 추적을 JPL 1차 자료로 채우고 PCP·PI 절은 3-05·3-06으로 링크한다.

### `part3-05-priority-inheritance.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(42ebbcbb stub, 2bb21c78 장 추가, 59660dc9 Part 3 본문, 845231cf 다이어그램, 85a2d46f 번역투 수정·발행, fec6fe94 text 블록 정리, ac24bb76 제목 변경, be973200 topics, 0a9dd7bc slug 고정)에 tasks.c·Zephyr·Linux 소스 대조 기록이 없다. 원문 안에서 동시에 참일 수 없는 두 진술은 확정하지 못했다(135행 50 cycle / 168 MHz = 0.298 µs로 산술은 맞음, 87행은 모호성으로 uncertainties).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 고유한 부분은 93~99행 multi-mutex 시나리오에서 uxMutexesHeld 값으로 복원 시점을 따라가는 것, 139~146행 Zephyr owner_orig_prio·152~158행 Linux rt_mutex_base를 24행 uxBasePriority와 나란히 둔 것이다. 34~85행 코드는 3-03 98~134행에도 있는 재구성이고, 101~111행 chain은 시나리오 두 줄과 함수 이름 하나, 115~120행 timeout 함수는 본문이 주석뿐이다. 127·135·148행은 근거 없이 결론만 둔다. 6~12 구간 상단. |
| B | 9 | TCB 필드(19~30행) → inherit(32~58행) → disinherit(60~87행) → multi-mutex(93~99행) → chain(101~111행) → timeout(113~123행) → 다른 RTOS(137~160행) → 실수(162~174행) → 정리(176~182행) 흐름은 있다. 제목의 Chain은 111행 한 문장이고 116~120행 함수는 비어 있으며 58행 호출 위치도 없다. 정확성 불확실(87·97·111·148행)로 B ≤ 13, 핵심 두 절이 비어 5~9 구간. |
| C | 4 | 34~85행 코드는 버전·포트·config가 없어 대조·재현이 불가하다. 131~135행 '~50 cycle', 'Cortex-M4 @ 168 MHz 기준 0.3 µs/op'는 측정 방법·출처가 없어 C ≤ 8. trace 관찰 절차·예상 결과가 없어 4~7 구간 하단. |
| D | 9 | part3-03-mutex-impl.md 98~134행이 같은 함수를 코드로 보인다(uxBasePriority 처리 상이). part3-04-priority-inversion.md 94~100행이 101~111행과 같은 체인 시나리오다. part3-06은 PCP라 역할이 구별된다. 다른 시리즈 modern-recipes/part6-10-priority-inversion.md 64~99행, performance-engineering/part4-05-mutex.md 80~105·236~237행이 101~111·129~135행과 겹친다. 고유한 것은 93~99행 정도라 5~9 구간. |
| E | 6 | 제목 'Inherit·Disinherit·Chain'과 description(5행)이 본문 방향과 맞다. Inherit(32~58행)·Disinherit(60~87행)는 코드로 다뤘지만 Chain은 101~111행 불릿과 한 문장이라 부분 미이행으로 6~8 구간에서 감점. |
| F | 6 | 184행 다음 편 'Priority Ceiling Protocol'은 seriesOrder 27 part3-06-priority-ceiling.md와 맞다. 188·189행 3-04·3-06 라벨도 대상 파일과 맞다. 같은 코드를 가진 3-03 링크와 전제 지식 안내가 없고 91행 다이어그램 외 고유 안내가 없어 7점 이상은 아니다. |
| G | 1 | 본문 출처 링크·FreeRTOS 버전·tasks.c 위치·Zephyr·Linux 버전(139~158행)이 없다. 35행 vTaskPriorityInherit, 111행 xTaskCheckForChainedInheritance의 기준 버전을 알 수 없다. |

uncertainties:
- 111행 xTaskCheckForChainedInheritance()가 FreeRTOS에 있는지, FreeRTOS가 전이적 inheritance를 하는지 tasks.c로 확인하지 않았다. 기억으로는 해당 이름이 없다는 의심이 있다(181행도 같은 주장).
- 35행 vTaskPriorityInherit(void)와 63행 xTaskPriorityDisinherit(BaseType_t)의 명명이 한 글 안에서 다르다.
- 87행 '단계적으로만 복원'은 71~81행 코드(uxMutexesHeld == 0일 때 한 번에 복원)·98~99행과 엇갈려 보이나 해석 여지가 있다.
- 97행 'T_high2가 B를 대기해도 변화 없음'은 high2 ≤ high1일 때만 맞다. 우선순위 관계가 정해지지 않았다.
- 15행 'take 시 boost'는 상위 task의 take 실패 시점(58행)이라 오독될 수 있다.
- 148행 Zephyr k_mutex PI 옵션의 Kconfig 근거 미확인.
- 160행 'futex보다 한층 정교'는 PI futex가 rtmutex를 쓰는 점과 맞는지 미확인.
- 131~135행 ~50 cycle은 출처·환경 없음. performance-engineering/part4-05 236행 'PI inherit (depth 1) 1 µs'와 환경이 달라 직접 모순은 아니다.
- part3-03 106~107·126행은 uxBasePriority를 0 sentinel로 쓰는데 이 글 30행은 영구 값이라고 한다(다른 글과의 모순).

병합 대상: `src/content/blog/embedded/rtos/practical-internals/part3-03-mutex-impl.md` 98~134행(같은 inherit/disinherit 함수). 'FreeRTOS priority inheritance 구현'은 독립 검색 의도가 있어 다음 조치는 보강이다. 3-03의 PI 코드 절을 이 글로 모으고 3-03에는 링크만 남긴다. 이 글은 FreeRTOS 버전을 고정해 tasks.c 원문과 대조한 inherit/disinherit/DisinheritAfterTimeout 코드, 111행 chain 처리 여부의 1차 근거, 3-04 94~100행과의 역할 분담을 채운다.

### `part3-06-priority-ceiling.md` — 42점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건. (1) 같은 PIP vs PCP 표 안에서 82행은 PIP를 'Boost 발생 | Conflict 시'로 적고 86행은 PIP도 'Unnecessary boost | 자주 발생'이라 적는다. conflict가 생길 때만 boost하면 불필요한 boost는 생길 수 없어 두 행은 함께 참일 수 없다. 29행('PI는 conflict가 발생한 후에 boost')과 90~92행도 82행 쪽과 맞는다. (2) 59행 코드는 Zephyr PCP 옵션을 `CONFIG_PRIORITY_CEILING=y`로, 101행 표는 `CONFIG_PRIORITY_CEILING_PROTOCOL`로 적어 같은 설정 이름이 두 가지다. git log(85a2d46f 번역투 수정·발행, fec6fe94 코드블록 정리, ac24bb76 제목 변경, be973200·0a9dd7bc 메타)에 1차 자료 대조 커밋은 없고 Zephyr Kconfig·VxWorks semMCreate 문서는 열지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | PCP 정의와 T_low/T_med 예(21~29행), Immediate/Original 표(33~38행), PIP vs PCP 표(80~88행)는 교재 표준 설명이고 3-04에도 있다. 고유한 것은 deadlock 방지 증명 스케치(40~50행)와 Immediate PCP 구현 예(110~147행)다. 증명은 T1·T2가 같은 priority 5일 때(42·44행) 왜 T1이 시작조차 못 하는지(45행) 설명하지 않고, 161행은 '동적 환경에서는 어렵습니다'라는 일반론으로 끝난다. |
| B | 9 | 개념(19~29행) → 표(31~38행) → 증명(40~50행) → API(52~65행) → System Ceiling(67~76행) → PI 대비(78~94행) → 구현(108~147행) → 함정(149~161행) 순서다. Original PCP는 69~74행 공식과 76행 '구현이 복잡합니다'뿐이고, mutex 여러 개를 다른 순서로 놓을 때 141행 복원이 어긋날 수 있다는 한계가 없다. 내부 모순 두 건으로 B ≤ 13. |
| C | 4 | 구현 예(110~147행)는 `ERROR`·`current_task()`를 정의하지 않고, 불투명 타입 `TaskHandle_t`(114행)를 쓰면서 `current_task()->prio`(127·129·141행)로 TCB를 직접 바꿔 어느 RTOS에서도 빌드되지 않는다. 121행 주석 '대기'와 달리 코드는 바로 ERROR를 돌려준다. 58~62행은 Kconfig 줄과 C 코드를 한 블록에 섞었다. 실행 환경·예상 결과·검증 절차가 없다. |
| D | 7 | 비교: part3-05-priority-inheritance.md(역할 다름), part3-07-queue-impl.md(주제 무관), part3-04-priority-inversion.md, part1-08-mutex.md, modern-recipes/part6-10-priority-inversion.md. 21~29행은 3-04 63~71행, 1-08 168~178행과 예도 문장도 같다. 33~38행 표는 3-04 75~81행과, 80~88행은 3-04 83~90행과 겹친다. recipes 6-10 101~120행도 정의를 되풀이한다. 증명(40~50행)·System Ceiling(67~76행)·구현(108~147행)만 이 글에 있다. |
| E | 6 | Immediate는 21~29·108~147행에서 다룬다. Original은 33~38행 표 한 열과 67~76행(73~74행 규칙)에만 있고 blocking 예제가 없다. 키워드 절반 이상이 빠진 것은 아니라 부분 미이행으로 6~8 구간 하단. description의 'take 즉시 boost'(29행), 'Deadlock 방지'(40~50행)는 다룬다. |
| F | 6 | 171행 다음 편 'Queue 내부 구현'은 seriesOrder 28 part3-07-queue-impl.md와 맞고 175·176행 3-05·3-07 라벨도 대상과 맞다. 관련 항목이 앞뒤 두 편뿐이고 같은 주제 3-04 링크와 전제 지식 안내가 없다. H2는 시리즈 템플릿(13·149·163·173행)이라 7점 이상 근거가 없다. |
| G | 1 | 본문 출처 링크가 없다. PCP 원 논문, VxWorks·Zephyr·QNX 버전, Kconfig·API 문서 위치가 없고 98~104행 지원 표와 54~63행 API 조각에도 출처가 없다. |

uncertainties:
- 56행 VxWorks `semMCreate(SEM_PRIORITY_CEILING, ceiling_priority)`: 인자 개수와 SEM_PRIORITY_CEILING 옵션 존재를 확인하지 않았다.
- 58~62·101·169행: Zephyr k_mutex에 `ceiling` 필드가 있는지, Zephyr에서 PCP를 쓸 수 있는지 미확인(기억에 기댄 의심).
- 103행 QNX PCP(PTHREAD_PRIO_PROTECT), 104행 RTAI 항목 미확인.
- 42~45행 증명에서 T1·T2가 같은 priority 5일 때 'T1은 시작도 못 함'의 근거가 없다.
- 92행 'T_med·T_low가 항상 starved'는 boost되어 실행되는 쪽이 T_low라 맞는지 불분명하다.
- 153행 'PI가 적용되지 않아'는 PCP 글에서 용어가 섞였을 수 있다.
- 121행 주석과 123행 코드가 다르고, mutex를 잡은 순서와 다르게 놓으면 141행 복원이 잘못된 priority를 남길 수 있다(API 의미에 걸린 코드 결함).
- 85행 PCP blocking 'bounded (이론 동일)'이 최대 한 번 blocking이라는 고전 결과와 비교해 맞는지 미확인.

병합 대상: factcheck가 오류 확인이라 판정은 우선 조치이고 점수 구간은 병합 검토다. 후보는 `src/content/blog/embedded/rtos/practical-internals/part3-04-priority-inversion.md`(63~90행 PCP 절이 이 글 21~38·80~88행과 겹침). 다음 조치는 보강이다. 먼저 82·86행과 59·101행을 1차 자료(Zephyr Kconfig·k_mutex 헤더, VxWorks semMCreate 문서, Sha·Rajkumar·Lehoczky 1990)로 고치고, 증명·System Ceiling·구현에 Original PCP blocking 규칙과 예제를 보강한 뒤 3-04의 PCP 절을 줄여 이 글로 링크한다.

### `part3-07-queue-impl.md` — 43점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건(루브릭 3-1). (1) 148행 주석 'cRxLock: -1 = unlocked, 0+ = ISR queued sends count'는 ISR send 횟수를 cRxLock이 센다고 하는데, 같은 절 155~163행 xQueueSendFromISR 코드는 ISR send를 cTxLock++(162행)로 세고 cRxLock은 건드리지 않는다. (2) 174행은 queueOVERWRITE를 'Mailbox (1 slot, 덮어쓰기)'라 하고 52행은 OVERWRITE면 공간 검사 없이 복사하는데, 104~108행 prvCopyDataToQueue는 OVERWRITE일 때 uxMessagesWaiting을 늘리지 않고 return하고 120행 xQueueReceive는 uxMessagesWaiting > 0일 때만 받는다. 빈 mailbox에 쓴 값을 이 글의 코드로는 받을 수 없어 'Mailbox' 설명과 함께 참일 수 없다. git log(42ebbcbb·2bb21c78·59660dc9·845231cf·85a2d46f·ac24bb76·be973200·0a9dd7bc)에 queue.c 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 고유한 부분은 SEND_TO_FRONT가 pcReadFrom을 거꾸로 감아 쓰는 wrap(98~103행), item size 0일 때 mutex give로 갈라지는 분기(85~91행), cTxLock으로 ISR의 wake를 미루는 설명(145~167행)이다. 코드는 생략 범위를 밝히지 않은 축약 의사코드이고 구조체(22~42행)·Send 흐름(47~78행)은 1-09·5-01과 거의 같다. 167행은 prvUnlockQueue를 한 문장으로 끝낸다. 앵커 part6-09(A 10)보다 고유 코드가 조금 많다. |
| B | 8 | 구조체 → Send → wrap → Receive → lock → 변형 → 함정 → 정리 흐름은 있다. 148행 주석 대 155~163행 코드, 104~108·120행 대 174행이 모순이다. 22~42행에 없는 pcTail·pxMutexHolder를 89~90·95·101행이 쓴다. Receive(116~142행)는 yield 판단이 없고 141행이 '/* ... */'로 끝난다. 158행은 unlocked를 'Scheduler running'과 같게 쓰고, 235행 by-pointer variant는 172~174행 목록에 없다. 5~9 구간에서 한 단계 낮춤. |
| C | 4 | 버전·포트·코어가 없고 47~142행은 그대로 실행하거나 upstream과 대조할 수 없는 의사코드다. 183~189행 cycle 값과 192행 '34 cycle, 약 0.2 µs'는 출처·클록·환경이 없어 C ≤ 8(30+16/4=34 산술은 맞지만 0.2 µs는 약 170 MHz를 전제). 측정·검증 절차가 없어 4~7 구간 하단. |
| D | 7 | part1-09-queues.md와 크게 겹친다: 구조체 77~88행 ↔ 22~42행, Send 96~115행 ↔ 47~78·92~97행, Stream Buffer 166~173행 ↔ 194~201행, Message Buffer 175~178행 ↔ 203~209행. part5-01-freertos-source.md 213~232행 구조체도 22~42행과 거의 같다. part3-11-stream-message-buffer.md(32)가 Stream/Message Buffer를 전담해 194~209행은 중복이다. 인접 part3-06·part3-08과는 겹치지 않는다. modern-recipes/part6-06-queue-usage.md는 166~176행 stream buffer 예만 196~198행과 겹친다. 5~9 구간. |
| E | 6 | ring buffer(81~112행)와 두 wait list(30~31·57·125·138행)는 다룬다. 'Atomic Send/Receive'는 portENTER_CRITICAL 호출(50·118행)뿐이고 설명 절이 없다. '추적'을 내걸었지만 소스 파일·버전 없는 의사코드라 실제 경로를 따라갈 수 없다. 키워드 하나가 부분 미이행이라 6~8 구간 하단. |
| F | 6 | 237행 '다음 편은 Event Group'은 seriesOrder 29 part3-08-event-group.md와 맞다. 241행 1-09, 242행 3-08 라벨을 대상 파일과 대조해 맞음을 확인했다. 194~209행 주제의 전담 글 3-11과 전제 글 3-02로 연결하지 않아 6점 위로 주지 않았다. |
| G | 1 | 본문 출처 링크·FreeRTOS 버전·queue.c 경로·대상 포트가 없고 183~192행 수치에도 출처·환경이 없다. |

uncertainties:
- 22~42행 구조체에 없는 pcTail·pxMutexHolder를 89~90·95·101행이 쓴다. 요약본으로 볼 여지가 있어 오류 확인 근거로 쓰지 않았다. 실제 union 배치(QueuePointers_t·SemaphoreData_t)는 queue.c로 확인하지 않았다.
- 148·157~162행: 실제로 ISR send가 cTxLock을, ISR receive가 cRxLock을 세는지와 queueLOCKED_UNMODIFIED 값은 1차 자료로 확인하지 않았다(오류 확인은 글 안 주석·코드 불일치만 근거로 함). 158행 'Scheduler running' 주석도 미확인.
- 104~108행: 실제 queueOVERWRITE 구현의 카운트 보정 방식은 queue.c로 확인하지 않았다.
- 183~192행 cycle 수치와 '0.2 µs'는 출처·클록·환경이 없다.
- 201행 'Stream Buffer는 1:1 전제라 lock-free 구현 가능'은 stream_buffer.c 문서로 확인하지 않았다.
- 219행 'Static queue도 storage buffer를 별도로 할당'은 xQueueCreateStatic 시그니처 미확인.
- frontmatter date(2026-05-06)와 작성 커밋 59660dc9·공개 커밋 85a2d46f 날짜 차이는 점수에 반영하지 않았다.

병합 대상: 점수 구간은 병합 검토(43)지만 오류 확인으로 우선 조치가 먼저다. 후보는 `src/content/blog/embedded/rtos/practical-internals/part1-09-queues.md`(구조체·Send·Stream/Message Buffer 겹침)이고 194~209행은 `src/content/blog/embedded/rtos/practical-internals/part3-11-stream-message-buffer.md`로 넘긴다. part5-01 236행이 송신 경로 상세를 이 글로 넘기므로 'queue.c 내부 구현'이라는 독립 의도는 있다. 먼저 148행 주석과 104~108행 OVERWRITE 카운트를 FreeRTOS queue.c 특정 버전과 대조해 고치고 22~42행 구조체를 실제 union 배치에 맞춘다. 그 뒤 보강(차별화): 194~209행을 지우고 3-11로 연결, 1-09와 같은 골격을 줄이고 xQueueGenericSend 재시도 루프와 prvUnlockQueue를 1차 자료로 다시 쓴다. 대조 전에는 183~192행 cycle 수치를 지우거나 TBD로 둔다.

### `part3-08-event-group.md` — 51점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic 메타, e85d7684 코드 블록 산문 이동, ac24bb76 제목 변경, 85a2d46f 번역투 수정·공개와 그 이전 집필 커밋)에 event_groups.c나 공식 문서와 대조한 커밋이 없다. 평가 중에도 upstream 소스를 열지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 SetBits가 대기 list를 돌며 list item value에서 제어 비트를 떼어(52~54행) OR/AND를 판정하고(56~66행), clear-on-exit 비트를 uxBitsToClear에 모았다가 순회 뒤 한 번에 지우는 흐름(69~71·79~80행), WaitBits가 깨어난 뒤 결과를 list item value에서 읽는 설명(140~142행)이다. 코드는 출처·버전 없는 재구성이고 Sync는 프로토타입과 사용 예(148~165행)뿐이다. Wi-Fi 예(181~207행)와 함정(225~249행)은 활용 글 수준. 앵커 part6-09(10)보다 조금 높고 part12-10(18)에는 못 미친다. |
| B | 10 | 자료구조(19행) → SetBits(36행) → WaitBits(90행) → Sync(146행) → FromISR(169행) → 예제(181행) → 성능(209행) → 함정(225행) → 정리(251행)로 끝까지 간다. xEventGroupSync의 원자적 set+wait(167행)를 코드로 보이지 않고, timeout으로 깨어난 경우(140~142행)를 다루지 않으며, 223행 scheduler suspend와 177행 ISR defer를 연결하지 않는다. 정확성 불확실(48·75·167·179행)로 B ≤ 13. |
| C | 5 | 211~220행 사이클 수(vTaskSuspendAll 5 cycle, 60 + N×40, block+wake ~200)는 코어·클록·컴파일러·측정 방법이 없어 C ≤ 8. 48행 eventGroup과 75행 pxNext는 선언되지 않아 38~85행은 그대로 컴파일되지 않는다. 160~164·189~204행 사용 예는 생성 코드가 없는 조각이고 실행 환경·예상 출력이 없다. 앵커 part6-09(4)와 part7-05(8) 사이. |
| D | 10 | 비교: part3-07-queue-impl.md, part3-09-isr-safe-api.md, modern-recipes/part6-07-event-group.md, rtos/freertos-mastering/chapter08-event-groups.md(draft), riscv/esp32-c3-mastering/chapter10-freertos.md. 154~165행 barrier 예는 6-07 128~141행, 8장 136~194행과 같다. 181~207행 부팅 예는 6-07 49~82행, 8장 198행 이하와 같다. 177~179행은 6-07 155행, 3-09 150~158행과 겹친다. 227~229행 24-bit 함정은 6-07 189~195행, 8장 19~30·270행과 같다. 19~144행 내부 구현은 6-07과 8장에 없고 3-07과는 대상이 달라 10~14 구간 아래쪽. |
| E | 7 | 'Bit Flag·AND/OR Wait·Sync Barrier'와 description의 24-bit flag·AND·OR·clear-on-exit·multi-task sync는 19~34·56~66·104~125·69~70·109~120·146~167행에서 다룬다. '분석'에 비해 Sync Barrier는 프로토타입(148~152행)과 사용 예뿐이라 6~8 구간에서 감점. |
| F | 6 | 259행 다음 편 'ISR-safe API, FromISR 함수군'은 seriesOrder 30 part3-09-isr-safe-api.md와 맞다. 263행 3-07, 264행 3-09 라벨이 대상 제목과 맞다. 관련 항목이 앞뒤 두 편뿐이고 전제 지식(blocked list, unordered event list) 안내가 없다. 6-07이 이 글을 링크(6-07 230행)하는데 이 글은 활용편을 링크하지 않고 177행도 3-09 해당 절을 가리키지 않는다. |
| G | 1 | 본문 출처·FreeRTOS 버전·event_groups.c 경로·공식 문서 링크가 없다. 22~31·38~143행이 발췌인지 재구성인지 밝히지 않고 211~220행에도 대상 코어가 없다. |

uncertainties:
- 48행 'eventGroup->uxEventBits |= uxBitsToSet'의 eventGroup은 선언되지 않았다(인자는 xEventGroup, 46·51·58행). 75행 pxNext도 선언 없이 쓴다. upstream event_groups.c와 대조해야 한다.
- 84행: SetBits가 clear-on-exit 적용 뒤 값을 돌려준다. upstream이 clear 전 값을 돌려주는지는 확인하지 않았다(기억에 근거한 의심).
- 167행 '세 task가 동시에 wake': 마지막 도착 task는 block하지 않고 바로 반환하는지 미확인.
- 229행 'configUSE_16_BIT_TICKS=1이면 8-bit만 가능'은 최신 configTICK_TYPE_WIDTH_IN_BITS 체계에서 맞는지 미확인.
- 216행은 SetBits 비용에 portYIELD_WITHIN_API 50 cycle을 넣었는데 38~85행에 이 호출이 없다. 213·216행 고정비 합은 55 cycle인데 217행은 60이다('≈' 표기라 오류 확인으로 올리지 않음).
- 255행 '모든 대기 task를 동시에 wake'는 88행·56~66행보다 넓게 단정한다.
- 179행 xTimerPendFunctionCallFromISR 인자가 셋인데 3-09 154행은 넷이다(글 간 차이).

병합 대상: 병합 대상 없음. 다음 조치는 보강(차별화)이다. 활용 예(154~165·181~207·227~229행)는 modern-recipes/part6-07-event-group.md와 거의 같지만 19~144행 내부 구현은 'event group 내부 구현'이라는 독립 검색 의도가 있어 병합하지 않는다. 겹치는 활용 예를 줄이고 6-07로 링크하며, 코드를 고정 버전 event_groups.c와 대조해 출처를 밝히고 48·75행 식별자를 고치고, Sync의 원자적 set+wait 구현을 보이고, 출처 없는 사이클 수는 환경을 붙이거나 지운다.

### `part3-09-isr-safe-api.md` — 44점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(42ebbcbb stub, 2bb21c78 재번호, 59660dc9 Part 3 본문, 845231cf 다이어그램, 85a2d46f 번역투 수정·공개, 03012dec text 블록 변환, ac24bb76 제목 변경, be973200 topic 메타, 0a9dd7bc slug 고정)에 FreeRTOS 소스·ARMv7-M ARM 대조 기록이 없다. 로컬 FreeRTOS-Kernel clone이 없어 1차 자료를 열지 못했다. 87행 '컴파일 에러'와 225행 '컴파일은 통과'는 다른 API에 대한 진술이고 매크로 정의를 알아야 가릴 수 있어 uncertainties에 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 명명 비교(19~36행), yield 필요성(38~54행), block 금지(83~97행), deferred 패턴(99~125행), priority 경계(161~173행), 실수(215~249행)는 FreeRTOS 문서와 1-05에 이미 있는 목록이다. 127~159행 daemon task·xTimerPendFunctionCallFromISR 절은 part3-08 179행과 part4-09-software-timer.md 55~86·226행에 이미 있다. 고유한 부분은 66~80행 BASEPRI save/restore asm 정도이고 그마저 출처 없는 재구성이다. 선택 기준(semaphore·PendFunctionCall·task notification)이 없다. 앵커 part6-09(A 10)와 같은 수준. |
| B | 10 | 명명(17~36행) → yield(38~54행) → ISR critical(56~81행) → block 금지(83~97행) → deferred(99~125행) → daemon(127~159행) → priority(161~173행) → yield 매크로(175~192행) → 공유 변수(194~213행) → 실수(215~249행) → 정리(251~257행)로 흐름은 완성됐다. description(5행)과 3-08 259행이 예고한 'FromISR 함수군의 내부 구현'(큐 lock, scheduler suspended 경로)은 없다. 196행 'barrier가 필요'와 달리 198~211행은 critical section을 쓰고, 249행 'stack이 깨집니다'는 메커니즘이 없다. B ≤ 13. |
| C | 5 | 대상 MCU·FreeRTOS 버전·포트가 없고 예상 관찰·검증 절차가 없다. 123행 '수 µs 수준'은 출처 없는 수치라 C ≤ 8. 167행 191(0xBF)은 __NVIC_PRIO_BITS 전제가 없어 1-05 109행 shift 식과 대응을 재현할 수 없다. 87·225행 단정은 독자가 확인할 방법이 없다. 4~7 구간. |
| D | 6 | part1-05-interrupts-rtos.md: 80~100행 ↔ 19~54행, 39~78행 UART top/bottom half ↔ 99~125행(49행 ↔ 123행 '수 µs'), 103~124행 ↔ 161~173행, 192행 부근 ↔ 217~225행, 204행 부근 ↔ 213행. part3-01-critical-section.md 85~94행 ↔ 56~66행. part3-08-event-group.md 179행과 part4-09-software-timer.md 55~86·226~245행 ↔ 127~159행. 다른 시리즈 modern-recipes/part6-09-isr-api.md 103~109·115행~·185~192행, performance-engineering/part3-05-interrupt-latency.md 99~106·169~175행. 인접 part3-10과는 주제가 다르다. 고유 부분은 66~80행뿐이라 5~9 구간 하단. |
| E | 6 | FromISR 패턴(17~36행), Higher Priority Wake(38~54·175~192행), Deferred Work(99~159행)는 다룬다. 제목의 'FromISR'가 FreeRTOS 범위를 드러내 범위 불일치는 아니다. description의 'FromISR API 내부 구조'를 보여 주지 않아 부분 미이행이다. 175행 절 제목 'taskYIELD_FROM_ISR'은 178행 portYIELD_FROM_ISR와 다르다. |
| F | 6 | 259행 다음 편(deadlock)은 seriesOrder 31 part3-10-deadlock.md와 맞다. 263·264행 3-08·3-10 라벨을 대상 파일과 대조해 맞음을 확인했다. 관련 항목이 앞뒤 두 개뿐이고 전제 글 part1-05·part3-01·part4-09 링크와 전제 지식 안내가 없다. 175행 절 제목 불일치도 있다. |
| G | 1 | FreeRTOS 버전, port.c/portmacro.h, ARMv7-M ARM, 공식 문서 링크가 없다. 130행 'FreeRTOS internal', 69~80행 asm, 178~182행 매크로 정의, 213행 '32-bit access는 atomic'에 출처가 없다. |

uncertainties:
- 87행 'xSemaphoreTake를 ISR에서 부르면 컴파일 에러'와 225행 'xQueueSend는 컴파일은 통과'가 어긋난다. 22·33행이 둘 다 block 가능한 Task API로 분류한다. 매크로 정의로 확인하지 않았다.
- 34행 표·56행 절 제목의 `portENTER_CRITICAL_FROM_ISR`와 part3-01 85~94행 taskENTER_CRITICAL_FROM_ISR 중 실제 이름 미확인.
- 69~80행 asm이 실제 ARM_CM3/CM4F 포트(ulPortRaiseBASEPRI, isb/dsb)와 맞는지 미확인.
- 131~145행 prvTimerTask는 part4-09 60~84행 의사코드와 구조가 다르다. 실제 timers.c와 어느 쪽이 가까운지 미확인.
- 209행 `shared_counter++; // 32-bit atomic`은 read-modify-write라 213행 '32-bit access는 atomic'과 같은 의미가 아니다.
- 167행 191(0xBF)의 __NVIC_PRIO_BITS 전제와 1-05 shift 식의 대응 미확인.
- 225행 'hard fault나 데이터 corruption'은 configASSERT로 잡히는지 미확인. part4-09 347행은 'silent corruption'이라 표현이 다르다.
- 249행 'stack이 깨진다'는 메커니즘 출처가 없다.
- 123행 '수 µs 수준'은 출처·환경이 없다.
- 54·180행 portYIELD_FROM_ISR의 SCB->ICSR PENDSVSET 동작을 포트 소스로 확인하지 않았다.

병합 대상: `src/content/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos.md`(FromISR 표·yield·priority 경계·deferred 패턴), daemon task 절(127~159행)은 `src/content/blog/embedded/rtos/practical-internals/part4-09-software-timer.md`(55~86·226~245행). 보조 비교는 modern-recipes/part6-09-isr-api.md. Part 3 '내부 구현' 파트에 있고 description과 3-08 259행이 'FromISR 함수군의 내부 구현'을 약속하므로 1-05와 갈리는 독립 검색 의도가 있어 다음 조치는 보강이다. 겹치는 절(19~36·99~159·161~173·217~225행)은 링크로 줄이고, xQueueGenericSendFromISR 내부 경로·portSET_INTERRUPT_MASK_FROM_ISR·portYIELD_FROM_ISR 실제 포트 정의를 버전 명시한 소스와 대조해 채운다. 보강 뒤에도 1-05와 구별되지 않으면 병합한다.

### `part3-10-deadlock.md` — 47점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(42ebbcbb stub, 2bb21c78 장 추가·재번호, 59660dc9 Part 3 본문 작성, 845231cf TikZ, 85a2d46f 번역투 수정·발행, ac24bb76 제목 변경, be973200 topic, 0a9dd7bc slug 고정)에 FreeRTOS 소스·Coffman 1971 논문·Linux lockdep 문서와 대조한 커밋이 없다. 평가 중에도 1차 자료를 열지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | Coffman 네 조건 표(17~26행), 2 mutex 순환 예(28~47행), lock ordering(62~84행), timeout(86~99행)은 표준 목록이다. 고유한 것은 level 검사형 hier_take(132~157행), uxTaskGetSystemState로 blocked task를 덤프하는 검출 예(183~198행), livelock과 random backoff(228~241행), ISR·long-blocking 함정(263~280행)이다. 해결책 선택 기준이 없고 84·202행은 근거 없는 일반론이다. |
| B | 11 | 조건 → 시나리오 → wait-for graph → 해결 4가지 → RW lock → 검출 도구 → livelock → 함정 → 정리(13~290행)로 흐름은 완성됐다. wait-for graph는 ASCII 그림 하나와 두 문장(49~60행)이고 cycle 검출 방법이 없다. 해결 2·3(86~130행)의 차이·비용과 livelock(228~237행)과의 관계를 설명하지 않고, hier_take(143~154행)는 보유 집합·해제 경로가 없다. 정확성 불확실(157·169·193행)로 B ≤ 13. |
| C | 5 | FreeRTOS API 코드 조각(30~45·88~97·103~130·206~223행)은 있지만 버전·보드·실행 결과가 없다. 검출 예는 190행에서 정의되지 않은 N을 쓰고 188행 반환값을 버리며, 145행 'for (each held lock h)'는 의사코드라 컴파일되지 않는다(AP-C-35). 198행 관찰 기준은 있으나 재현 절차·예상 출력이 없다. 4~7 구간 하단. |
| D | 10 | part1-08-mutex.md 183~210행과 part3-03-mutex-impl.md 157~180행이 30~47·88~99행과 거의 같다. part3-06-priority-ceiling.md 40~50행은 PCP로 lock order 없이 deadlock을 막는 증명인데 이 글은 언급하지 않는다. part3-04는 171~179행과 닿는다. 인접 part3-09·part3-11과는 겹치지 않는다. 다른 시리즈 modern-recipes/part6-05-mutex-usage.md 165~177행이 62~84행과, modern-recipes/part6-12-rtos-debugging.md 51·100~114행이 183~198·86~99행과 겹친다. performance-engineering/part4-03-lock-contention.md 132행은 한 문장 언급. Coffman·hierarchical lock·livelock은 이 글에만 있어 10~14 구간 하단. |
| E | 5 | 4 조건(17~26행), wait-for graph(49~60행), lock ordering(62~84행), timeout(86~99행), description의 hierarchical locking(132~157행)은 절이 있다. 제목 'Deadlock 분석'과 description 'wait-for graph 분석'이 분석을 약속하는데 graph는 그림 하나(51~58행)와 두 문장이라 루브릭 E 주석과 앵커 part1-04('동작 분석' 5점)에 맞춰 5점. 본문은 FreeRTOS API인데 제목·description에 대상 RTOS가 없다. |
| F | 4 | 290행 '다음 part에서는 memory management를 다룹니다'인데 seriesOrder 32는 part3-11-stream-message-buffer.md이고 memory 글 part4-01-realtime-memory.md는 33이다. 다음 편 안내가 틀려 F ≤ 5. 294·295행 3-04·3-09 라벨과 179행 '3-05 참고'는 대상 파일과 맞다. 가장 가까운 part1-08·part3-03·part3-06 연결이 없고 51~58·173~177행이 ASCII text 블록이라(가이드 §6) 4점. |
| G | 1 | 17행 'Coffman의 네 조건 (1971)'은 연도만 있고 논문 인용이 없다. FreeRTOS 버전, 188행 uxTaskGetSystemState·193행 TaskStatus_t 필드 출처, 157행 lockdep 문서 링크가 없다. |

uncertainties:
- 193행 arr[i].xEventListItem: TaskStatus_t에 이 필드가 없는 것으로 기억하나 task.h로 확인하지 못했다. 사실이면 검출 예가 컴파일되지 않는다.
- 132·157행 'Linux lockdep 방식': lockdep은 lock class 의존 graph를 runtime에 기록하는 방식으로 기억하며 고정 level 규칙과 다를 수 있다. lockdep-design.rst 미확인.
- 169행 RW lock 자기 deadlock을 'recursive variant'로 해결한다는 설명은 read→write 업그레이드를 해결하지 않는 것으로 보이나 미확인.
- 171행 절 제목 'ABA 변형'은 lock-free ABA 문제와 무관한 priority inversion 내용이다(명칭 오용 의심).
- 15·284행 '네 조건이 동시에 성립할 때 발생'(충분조건처럼)과 26행 '모두 만족할 때만'(필요조건)이 다르게 읽힌다. 표현 차이라 오류 확인으로 올리지 않았다.
- 60행 '컴파일 타임에 확인할 수 없습니다'와 84행 '컴파일 타임에 도구나 문서로 검증', 200~202행은 대상이 달라 내부 모순으로 보지 않았다.
- 143~154행 hier_take는 xSemaphoreTake 실패를 무시하고 record_held를 부른다(API 의미 판단 필요).
- 258행 'Self-deadlock (mutex 아닌 binary semaphore)' 주석의 한정 이유가 불분명하다.
- part3-11 frontmatter에 draft 필드가 없다. 기본값이 공개라는 전제로 다음 편을 판정했다.

병합 대상: 병합 대상 없음. 시리즈의 deadlock 전용 글이고 'deadlock 회피·검출'이라는 독립 검색 의도가 있어 루브릭 5절에 따라 병합하지 않는다. 다음 조치는 보강이다. part1-08 183~210행·part3-03 157~180행과 겹치는 2 mutex 예·timeout 코드를 두 글에서 줄이고 이 글을 가리키게 하며, 이 글에는 wait-for graph cycle 검출 절차, 해결책 선택 기준(part3-06 연결 포함), FreeRTOS 버전과 1차 출처를 넣는다. 290행 다음 편 안내를 part3-11로 고친다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)으로 묶었다.

- 1차 자료 대조 커밋 없음: 10편 모두 59660dc9(Part 3 본문 작성) → 85a2d46f(번역투 수정·공개) 뒤 제목·메타·slug 커밋만 있다. 10편 중 7편 미검증, 3편(3-03·3-06·3-07)은 내부 모순으로 오류 확인이다. 시리즈 단위 `/fact-check-round` 대상이고, data/upstream-tracking.yaml에 FreeRTOS 등록이 없다는 기록(3-05)은 이번에 다시 확인하지 않았다.
- 본문 출처·FreeRTOS 버전·포트 표기 없음(G 1): 10편 모두. 'FreeRTOS internal'·'내부'라고 소개한 재구성 의사코드가 버전·파일명 없이 나온다(3-01 50~62행, 3-02 19~70행, 3-03 40~131행, 3-05 34~85행, 3-07 47~142행, 3-08 22~143행, 3-09 130행).
- 재구성 의사코드의 주석·코드·산문 불일치: 3-02 108/120행 savedStatus·150~155행 counter, 3-03 115행 방향·20~33 대 46~84행 필드명, 3-06 121 대 123행, 3-07 148 대 162행, 3-08 48·75행 미선언 식별자, 3-10 190·193행. 6편이다. '추적·내부 구현' 제목 아래 upstream에 없는 이름을 섞는 패턴이 E 5~6의 원인이기도 하다.
- 출처·환경 없는 수치 '성능' 절과 hold time 기준: 3-01 126~134·176·214~219행, 3-02 188행, 3-03 186행, 3-04 24·108행, 3-05 131~135행, 3-07 183~192행, 3-08 211~220행, 3-09 123행. hold time 기준은 3-01 134행 10 µs, part1-06 193행 50 µs, part2-10 179~180행처럼 글마다 다르다.
- Part 1 개념 글과 Part 3 구현 글의 절 반복: 3-01 ↔ part1-06(17~46·184~210행), 3-03 ↔ part1-08(136~186행), 3-04·3-06 ↔ part1-08(97~181행), 3-07 ↔ part1-09(22~78·194~209행), 3-09 ↔ part1-05(19~173행), 3-10 ↔ part1-08·part3-03(30~47·88~99행). 시리즈 차원에서 Part 1과 Part 3의 역할을 나눠야 한다.
- Part 3 안의 반복: PI 코드 3-03 98~134행 ↔ 3-05 34~85행(uxBasePriority 처리 상이), PCP 설명 3-04 63~90행 ↔ 3-06 21~38·80~88행 ↔ part1-08 168~180행, chain inheritance 3-04 94~100행 ↔ 3-05 101~111행, daemon task 3-08 179행 ↔ 3-09 127~159행 ↔ part4-09 55~86행.
- 같은 대상의 표기 불일치: FreeRTOS 함수 이름(3-03 120행 vTaskPriorityDisinherit 대 3-05 63행 xTaskPriorityDisinherit), critical 매크로(3-02 108·130행, 3-09 34·56행 port… 대 3-01 85~94행 task…), `configUSE_MUTEX_PI`(3-04 60·117행, part1-08 124행), Zephyr PCP 지원(3-04 81·90행 대 3-06 59·101행), PIP·PCP 단순성 평가(3-04 87행 대 3-06 87행). FreeRTOS·Zephyr 1차 자료로 한 번에 정리해야 한다.
- 관련 항목이 앞뒤 두 편뿐이고 전제 글·같은 주제 글 링크가 없다(F 6 상한): 3-05 188~189행, 3-06 175~176행, 3-07 241~242행, 3-08 263~264행, 3-09 263~264행, 3-10 294~295행. 다음 편 안내 결함은 3-04(안내 없음)와 3-10 290행(seriesOrder 32 대신 memory management)이고, 3-10은 2bb21c78로 part3-11을 끼워 넣은 뒤 갱신되지 않은 것으로 보인다.
- 공통 H2 뼈대 '한 줄 요약 → … → 자주 하는 실수 → 정리 → 관련 항목': 3-01 13·223·241·251행, 3-02 13·220·238·248행, 3-03 13·210·228·238행, 3-07 13·211·229·239행, 3-08 13·225·251·261행, 3-09 13·215·251·261행, 3-10 13·243·282·292행. 9절 scaled content 수치 기록 대상이다.

## 다음 조치

- 우선 조치(이 루프에서는 원문을 고치지 않았다): `part3-03-mutex-impl.md` 115행 상속 방향, 134행 chain 주장, 106·123·126행 0 표시 로직을 FreeRTOS tasks.c 특정 태그로 확인해 고친다. `part3-06-priority-ceiling.md` 82·86행 PIP unnecessary boost 행과 59·101행 Zephyr 옵션 이름을 Zephyr Kconfig·k_mutex 헤더로 정한다. `part3-07-queue-impl.md` 148행 cRxLock/cTxLock 주석과 104~108행 OVERWRITE 카운트를 queue.c로 고친다.
- 제외 검토: `part3-04-priority-inversion.md`는 38점으로 경계에서 2점 아래다. 제외할지, Pathfinder 원인 추적을 JPL 1차 자료로 채우고 PCP·PI 절을 3-05·3-06으로 넘겨 살릴지 사용자에게 올린다. 다음 편 안내도 없다.
- 시리즈 단위 `/fact-check-round`: Part 3 열 편을 FreeRTOS-Kernel 고정 태그(queue.c·tasks.c·event_groups.c·timers.c·port.c)와 Zephyr·ARMv7-M ARM으로 대조한다. FreeRTOS를 data/upstream-tracking.yaml에 등록할지 확인한다.
- 구조 결정(사용자): Part 1 개념 글과 Part 3 구현 글의 역할 분담, PI 코드(3-03 ↔ 3-05)·PCP 설명(3-04 ↔ 3-06)의 정본 지정.
- 내비게이션: 3-10 290행 다음 편 안내를 part3-11로, 3-04에 다음 편 안내 추가, 2bb21c78로 끼워 넣은 장의 앞 글(part2-10, part4-10 등) 안내 점검.
- 렌더링·`audit:reading`·3-10 ASCII 블록(51~58·173~177행)은 다음 루프나 릴리스 검사에서 확인한다.
