# 공개 글 AdSense 평가 — 루프 36

> 대상: 공개 글 10편 (Practical RTOS Internals `seriesOrder` 12~21, part2-02~part2-11)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 서른여섯 번째 루프다. 대상은 `src/content/blog/embedded/rtos/practical-internals/`의 Part 2 열 편(part2-02 blocked list부터 part2-11 tracing까지, seriesOrder 12~21)이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part2-02-blocked-list.md` | 10 | 9 | 4 | 10 | 6 | 6 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part2-03-scheduler-algorithm.md` | 9 | 8 | 4 | 5 | 5 | 6 | 1 | **38** | 미검증 | 제외 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part2-04-context-switch.md` | 12 | 12 | 6 | 10 | 5 | 7 | 1 | **53** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part2-05-cortex-m-context.md` | 13 | 12 | 5 | 10 | 7 | 5 | 1 | **53** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part2-06-cortex-a-context.md` | 9 | 8 | 4 | 11 | 5 | 6 | 1 | **44** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part2-07-riscv-context.md` | 10 | 10 | 5 | 10 | 6 | 6 | 1 | **48** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part2-08-tick-timer.md` | 11 | 10 | 6 | 7 | 7 | 6 | 1 | **48** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part2-09-tickless.md` | 10 | 7 | 4 | 9 | 6 | 4 | 1 | **41** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part2-10-scheduler-latency.md` | 10 | 8 | 6 | 7 | 6 | 4 | 1 | **42** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part2-11-tracing-observability.md` | 12 | 12 | 7 | 9 | 7 | 5 | 1 | **53** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |

평균 46.6점(10편, 합 466점), 범위 38~53점이다. 판정은 우선 조치 8편, 병합 검토 1편(part2-08), 제외 검토 1편(part2-03)이고 유지·검증 대기·보강은 없다. 점수 구간으로는 part2-03(38)만 제외 검토(0~39)이고 나머지 9편은 병합 검토(40~59)다. 오류 확인은 8편이다. 모두 원문 내부 모순(두 구체 진술, 코드와 산문, 산술이 함께 참일 수 없음)에서 나왔고 1차 자료를 열어 확인한 것은 없다. 10편 모두 git 이력에 1차 자료 대조 커밋이 없어(85a2d46f는 번역투 수정·공개) 검증됨은 없다. 이번 루프 대상은 시리즈 허브가 아니라 허브 예외를 적용하지 않았다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·`draft`, part2-10의 SVG 존재까지이고 렌더링·광고 배치·sitemap·외부 유사도는 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `part2-02-blocked-list.md` | 46 | 46 | 0 | 없음 |
| `part2-03-scheduler-algorithm.md` | 40 | 38 | -2 | 없음 |
| `part2-04-context-switch.md` | 53 | 53 | 0 | 없음 |
| `part2-05-cortex-m-context.md` | 53 | 53 | 0 | 없음 |
| `part2-06-cortex-a-context.md` | 44 | 44 | 0 | 없음 |
| `part2-07-riscv-context.md` | 48 | 48 | 0 | 없음 |
| `part2-08-tick-timer.md` | 48 | 48 | 0 | 없음 |
| `part2-09-tickless.md` | 40 | 41 | +1 | 없음 |
| `part2-10-scheduler-latency.md` | 43 | 42 | -1 | 없음 |
| `part2-11-tracing-observability.md` | 53 | 53 | 0 | 없음 |

- 기각한 오류 확인: 없음.
- 미검증에서 오류 확인으로 올린 글(3편): part2-06(127행 '수십 µs' 대 183행 '수 µs 단위', 같은 MMU·cache·TLB 비용), part2-10(57행 `GPIO_TOGGLE` 때문에 두 번째 이벤트부터 46행 SET이 edge를 만들지 못해 63·67행 '세 edge로 분리 측정'과 맞지 않음), part2-11(133~137행 'ITM이 자동으로 만들어 주는 이벤트' 대 143행 'ITM은 명시적 print만'). 판정도 병합 검토에서 우선 조치로 바뀌었다.
- 오류 확인 근거를 더한 글(판정 변화 없음): part2-02는 175~181행 메모리 표 산술에 130행 '한 번에 하나의 list에만 속함' 대 141·206행 '두 list에 동시에 link'를 보조 근거로 더했다. part2-07은 87~89행 4바이트 간격 패턴이면 x31이 120이어야 하는데 91·107행이 124(sp)를 쓰는 산술 불일치를 근거 (3)으로 옮겼다.
- 오류 확인으로 올리지 않은 의심: part2-08 163~165행 경과 tick 계산(약 995 tick 보충)은 configSYSTICK_CLOCK_HZ 의미를 알아야 판단되어 루브릭 3-1 예외로 uncertainties에 두었다. part2-03 81행(time slicing 기본값 1)과 134행은 85a2d46f의 표현 문제일 가능성이 커서 올리지 않았다. 글 사이 불일치(SMP 버전, FPU 저장 범위, RISC-V latency 방향 등)는 모두 uncertainties다.
- part2-03: D 7→5. part5-01-freertos-source.md 149~168행에 같은 vTaskSwitchContext·선택 매크로·round-robin이, 340~346행에 SMP pxCurrentTCBs가 있다. 합계 40→38로 구간이 병합 검토에서 제외 검토로 바뀌었다.
- part2-09: E 5→6. 제목 키워드 세 개 중 'Wake 보정' 하나만 부분 미이행(111행 placeholder)이라 루브릭 E 규칙상 6~8 구간 감점이다. '구현'은 3~5 강제 키워드가 아니다. 합계 40→41.
- part2-10: B 9→8. GPIO 코드와 산문의 모순을 반영했고, 'PendSV 분리 설명 부재' 감점은 1차 자료 위치가 없어 AP-C-31에 따라 근거에서 뺐다. 합계 43→42.
- part2-06·part2-11의 B 근거에서도 1차 자료 없는 '빠진 메커니즘' 감점(srsdb/cps 설명, TraceRecorder 통합 절차)을 빼고 내부 모순으로 근거를 바꿨다(점수 유지).
- 줄 번호·근거 보정(점수 영향 없음): part2-02 B(156행 산문 한 줄), D(2-01 L230~243), part2-04 p0(draft 상태), D(part2-06 112~116행), part2-05 134행·136~170행·141~151행, D(part5-04 104~114행, part2-04 56~70·163~167행), part2-07 D(esp32-c3 ch02 100~110행), part2-08 D(recipes 6-03 72~82행), part2-09 D(2-08 148~170행, freertos-mastering ch11 추가), part2-10 D(part1-10 163~169행 등), part2-11 D(freertos-mastering ch14 추가, part2-10 151~171행).
- 부풀림 판정은 10편 모두 없음이다. part2-09의 +1은 루브릭 E 구간 규칙을 바르게 적용한 것이다.

## 글별 근거

### `part2-02-blocked-list.md` — 46점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 안에서 산술이 맞지 않는다. 111~116행은 `List_t`를 `UBaseType_t uxNumberOfItems` + `ListItem_t *pxIndex` + 값으로 들어 있는 `MiniListItem_t xListEnd`로 정의하는데, 177·179행 표는 `List_t`를 '20 byte (Cortex-M)', `MiniListItem_t`를 '16 byte'로 적었다. 16 byte 멤버를 값으로 담고 4 byte 포인터와 카운트를 더 가진 구조체는 20 byte가 될 수 없다(최소 24). 같은 표 178행 `ListItem_t` 24 byte도 포인터 4 byte 전제와 맞는다. 이 표는 181행 '약 500 byte' 추정의 근거다. 보조 근거로 130행 'task는 한 번에 하나의 list에만 속합니다'와 141행 '두 개의 list에 동시에 link됩니다'·206행 'TCB는 state list와 event list에 동시에 link됩니다'가 충돌한다. git log(--follow)는 42ebbcbb(stub), a90a6bae(본문 양산), 845231cf(date), 85a2d46f(번역투 수정·공개), ac24bb76(제목), be973200·0a9dd7bc(메타데이터)뿐이라 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | delta list 그림(31~37행), FreeRTOS 두 list 선언(56~61행), insert overflow 분기(65~72행), tick ISR swap(78~89행)은 tasks.c를 단순화해 옮긴 수준이다. 이 글의 분석은 delta list(27~48행)와 절대값 정렬 + two-list(50~91행)를 나란히 놓은 구성뿐이고, 왜 FreeRTOS가 절대값 정렬을 쓰는지·언제 무엇을 고르는지는 없다. 48·107·199행은 근거 없는 일반론이다. 앵커 part6-09(A=10)와 같은 수준. |
| B | 9 | 17~25행 요구사항에서 범위는 넓지만 절마다 코드 한 조각에 한두 문장이다. 148~152행 Timer List는 세 문장, 154~171행 suspend는 156행 한 문장에 코드뿐이다. 130행과 141·206행 충돌, 99행 `TickValue_t`, 42행 후위 감소, 161~170행 return 누락 같은 불확실이 열려 있어 AP-C-24의 B ≤ 13. 한계·예외 설명이 빠져 5~9 구간. |
| C | 4 | 코드가 모두 의사 코드다(42행 `head_delta--`, 81행 `swap()`, 87행 `move_to_ready()`, return 없는 161~170행 `xTaskResumeAll`). FreeRTOS 버전·포트·tick 폭이 없다. 52·191행 '49일'은 1 kHz 전제를 같은 문장에 두지 않았다. 177~179행 byte 수와 181행 '약 500 byte'는 출처·환경 없는 수치라 C ≤ 8. 측정·검증 절차가 없어 4~7 하단. 앵커 part6-09(C=4)와 같다. |
| D | 10 | 같은 시리즈 part2-01-ready-list.md 230~243행에 같은 xDelayedTaskList1/2 선언(2-01 L232~233 대 이 글 L57~58), 같은 while 루프(2-01 L236~240 대 L84~88), 같은 swap 설명(2-01 L243 대 L74)이 있다. 2-01 L225·L265도 이 글 L141~146·L206과 겹친다. part4-09-software-timer.md L104~112의 delta list 설명은 이 글 L27~48과 거의 같다. 다른 시리즈 modern-recipes/part6-11-timer-services.md L65가 V11.1.0 timer 두 list를 출처와 함께 다뤄 L148~152와 겹친다. 'xDelayedTaskList2·pxOverflowDelayedTaskList·delta list' grep 결과는 이 세 글뿐이다. part2-03과는 겹치지 않는다. blocked list 전용이라는 역할은 구별돼 10~14 하단. |
| E | 6 | 제목의 Timeout 정렬(15·27~48행), Delta List(27~48행), Two-List Scheme(50~91행)과 description의 tick wraparound(52·67·80행)를 다룬다. Delta List는 9줄 남짓이고 FreeRTOS가 쓰는지 밝히지 않아 선택 기준이 약하다. 6~8 하단. |
| F | 6 | 209행 다음 편 안내는 seriesOrder 13 part2-03-scheduler-algorithm.md와 맞다. 213~215행 관련 링크 라벨(2-01 Ready List, 2-03, 2-08 Tick과 타이머)은 대상 제목과 맞다. 전제 지식 안내와 절 간 연결이 없고, 2-01 L243이 'wrap은 2-08편'이라 하는데 실제 wrap 처리는 이 글에 있다는 관계도 언급하지 않는다. 글 고유 구조가 없어 7 이상은 주지 않았다. |
| G | 1 | 본문에 출처 링크가 없다. FreeRTOS 버전, tasks.c·list.h 위치, 177행 'Cortex-M' 외 포트·컴파일러 조건이 없다. 99행 `TickValue_t`를 대조할 근거가 본문에 없다. 앵커 part6-09(G=1)와 같다. |

uncertainties:
- List_t 20 byte 판정은 Cortex-M 포인터 4 byte 전제에 기댄다. 178행(ListItem_t 24 byte)도 같은 전제와 맞아 오류 확인으로 두었지만 list.h를 직접 대조하지는 않았다.
- 99행 `TickValue_t`: 실제 타입 이름(TickType_t로 기억)을 1차 자료로 확인하지 않았다.
- 42행 `if (head_delta-- == 0)`: 후위 감소로 delta 50 항목이 51번째 tick에 깨어나는 off-by-one인지 미확인.
- 84행: 실제 xTaskIncrementTick이 head 비교 대신 xNextTaskUnblockTime을 쓰는지 미확인.
- 156행 '보류 중에는 tick 카운트만 진행'과 165~167행 resume 때 xPendedTicks만큼 xTaskIncrementTick 재호출이 함께 성립하면 tick이 이중으로 세어진다. 보류 중 tick ISR 동작이 정의되지 않아 단정하지 않았다.
- 161~170행: BaseType_t 반환 함수에 return이 없다(언어 규칙 판단).
- 124행 xPendingReadyList가 xEventListItem으로 연결되는지 tasks.c로 확인 필요(130행과 관련).
- 181행 '약 500 byte'는 산식이 없다. task 10 × ListItem 2 × 24 = 480에 sync object 5 × List_t를 더하면 500을 넘는다.
- 150행 `pxCurrentTimerList` 이름, 187행 'vTaskDelay(0)은 yield와 같다'는 미확인.

병합 대상(점수 구간 병합 검토, 판정은 오류 확인으로 우선 조치): 후보는 `part2-01-ready-list.md` 230~243행(같은 delayed list 코드와 swap 설명)이다. 먼저 175~181행 메모리 표를 버전을 명시한 list.h로 고치거나 TBD로 두고, 130행과 141·206행의 list 소속 진술을 하나로 맞춘다. 그다음 2-01의 delayed list 절을 이 글로 넘기고 이 글은 two-list와 delta list 비교에 집중한다. blocked list 전용 검색 의도가 분명해 다음 조치는 보강이다.

### `part2-03-scheduler-algorithm.md` — 38점, 제외 검토

confidence: 중간

factcheck: 미검증. git log(85a2d46f 번역투 수정·28편 일괄 공개, ac24bb76 제목 변경, be973200 topic 메타, 0a9dd7bc slug 고정 등)에 FreeRTOS-Kernel tasks.c·portmacro.h·FreeRTOS.h와 대조한 커밋이 없다. 로컬 FreeRTOS-Kernel clone이 없어 1차 자료도 열지 못했다. 원문만으로 성립하는 기술 주장 모순은 찾지 못했다(81·134행은 uncertainties).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | vTaskSwitchContext(31~40행), generic 선택 매크로(44~55행), CLZ 매크로(62~65행), listGET_OWNER_OF_NEXT_ENTRY(71~79행)는 FreeRTOS 소스를 짧게 옮기고 한두 줄 설명을 붙인 수준이다. 이 글만의 것은 진입 경로 표(19~25행)인데 설명이 없다. SMP 절(89~101행)은 세 문장이고 101행은 기준 없는 일반론이다. 앵커 part6-09(A 10)보다 조금 낮다. |
| B | 8 | 절마다 코드 한 조각과 한두 문장이다. 34행 xYieldPending 처리 시점 설명이 없고, 139행 정리는 'CLZ와 bitmap'을 말하지만 본문은 bitmap 유지 방법을 다루지 않고 2-01 안내도 없다. 105행 cooperative, 116행 uxCriticalNesting은 한 문장이다. 21·89·111·130행 불확실이 열려 있어 B ≤ 13. 앵커 part6-09(B 8)와 같다. |
| C | 4 | 44~55·62~65행 매크로 발췌에 FreeRTOS 버전·포트·FreeRTOSConfig 전제가 없고 실행·관찰 절차가 없다. 67행 'CLZ는 단일 cycle'은 출처·코어 없는 수치라 C ≤ 8. round-robin(73~79행)을 trace hook(120~124행)으로 관찰하는 방법도 없다. 4~7 하단. |
| D | 5 | 거의 모든 절이 겹친다. part2-01: 이 글 44~58행 ↔ 2-01 58~68행, 62~67행 CLZ·1 cycle·ARMv6-M ↔ 2-01 96~112·132행, 71행 ↔ 2-01 54행. part5-01-freertos-source.md: 31~40행 vTaskSwitchContext·xYieldPending ↔ 5-01 149~160행, 44~55행 ↔ 5-01 162~166행, 71행 ↔ 5-01 168행, 89~93행 SMP pxCurrentTCBs ↔ 5-01 340~346행. part4-07-smp-rtos.md 98·213행 ↔ 95~98행. part3-01-critical-section.md 43·61·65행 ↔ 111·116행. part2-08 120·130행·part1-03 45행 ↔ 81·134행. part2-04 35~40행 ↔ 19~25행 일부. 다른 시리즈 modern-recipes/part6-03-scheduler-internals.md 56~82행 ↔ 81·105·134행. part2-02와는 겹침이 적다. 남는 고유 부분은 진입 경로 표와 generic 하향 탐색 코드뿐이라 5~9 하단. |
| E | 5 | 제목 '구현 추적 — Next-Task Selection 로직'과 description(5행)의 pxCurrentTCB·CLZ·tie-breaking·entry points는 절(17·60·69행)이 있지만 표 한 개·코드 두 줄·문장 한 개 수준이다. 호출 경로를 따라가는 부분은 31~40행 하나다. '추적'을 약속하고 개념 소개 수준이라 루브릭 E 주석대로 3~5. |
| F | 6 | 143행 다음 편 안내는 seriesOrder 14 part2-04-context-switch.md와 맞다. 147행 2-01, 148행 2-04 라벨이 대상 제목과 맞다. 관련 항목이 두 개뿐이고 같은 내용을 더 자세히 다루는 5-01·4-07·3-01 링크와 전제 지식(2-01 bitmap) 안내가 없어 7 이상은 주지 않았다. |
| G | 1 | 본문에 출처 링크가 하나도 없다. 버전은 89행 'SMP(10.5 이상)' 한 곳뿐이고 44~65행 매크로의 버전·파일, 67행 CLZ cycle 수의 TRM 기준이 없다. 앵커 part6-09(G 1)와 같다. |

uncertainties:
- 81행 'configUSE_TIME_SLICING = 1(기본값)'과 134행 '자주 하는 실수: time slicing이 기본이라고 가정합니다'가 반대 인상을 준다. 134행 본문은 81행과 맞고 85a2d46f의 표현 문제일 가능성이 커서 오류 확인으로 올리지 않았다. FreeRTOS.h 기본값 확인 필요.
- 111행 'taskENTER_CRITICAL() = scheduler suspended + IRQ masked'는 critical section과 vTaskSuspendAll을 섞은 설명일 수 있다(3-01 43행도 같음).
- 130행 'suspended 상태에서는 ISR을 제외한 task가 멈춥니다'는 suspend를 호출한 task가 계속 도는 동작과 맞지 않을 수 있다.
- 21행 표의 Tick ISR → vTaskSwitchContext() 직접 호출은 Cortex-M에서 PendSV pend 경로일 수 있다(27행과 정합성).
- 89행 'SMP(10.5 이상)'은 part5-01 340행 'FreeRTOS 11에서 공식화'와 다르다(다른 글과의 모순). 92행 pxCurrentTCBs 선언, 98행 vTaskCoreAffinitySet 시그니처 미확인.
- 67행 'CLZ는 단일 cycle'은 출처 없는 수치다.
- part2-01 58~66행은 generic 선택을 0부터 위로, 이 글 47~50행은 uxTopReadyPriority에서 아래로 찾는다. tasks.c로 정해야 한다.
- 점수 38은 병합 검토 하한(40)과 2점 차이다. 실제 조치는 2-01·5-01로의 병합과 진입 경로 표만 살린 차별화 보강을 함께 비교해야 한다.

### `part2-04-context-switch.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다. 69행 'callee-saved (R4-R11) 8개만 더 push하면 context 전체가 보존됩니다. 합쳐서 16 word, 64 byte입니다'와 210행 '합쳐서 16 word, 64 byte의 frame'에 대해 151행 'context 자체는 17 word (68 byte)면 끝나지만', 155행 표 'Context (full save)'가 17 × 4 = 68, 197행 '68 byte context'라고 적는다. 글은 두 값을 port로 구분하지 않고 둘 다 '전체 context'로 적어 동시에 참일 수 없다. git log(0a9dd7bc, 68525f0c, be973200, ac24bb76, 85a2d46f, 845231cf, fa6eb0c8, a90a6bae, 42ebbcbb)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 22~29행 Cortex-M·Cortex-A·RISC-V context 비교 표, 87~96행 'TCB는 pxTopOfStack 하나만 들고 있다', 98~119행 첫 schedule용 가짜 frame은 글 고유의 정리다. 47~50행 caller/callee-saved 표, 125~130행 cooperative vs preemptive 표, 187~189행 MMU 비용 목록은 입문서 수준이고 실패 사례·선택 기준이 없다. 130행 '모든 현대 RTOS'(132행은 '거의 모두'), 191행 '수십 µs'는 근거 없는 일반론. 6~12 상단. |
| B | 12 | 발생 시점(33~41행) → 저장 범위(43~71행) → 7단계(77~85행) → 초기 frame(98~119행) → 비용(134~147행) → stack 크기(149~161행) → FPU·RISC-V·Cortex-A(163~191행) → 실수·정리(193~214행)로 흐름은 완성됐다. context 크기가 69·210행(16 word)과 151·155·197행(17 word)에서 어긋나고 165행 FPU 33 word는 HW/SW 분담을 다루지 않는다. 불확실이 열려 있어 B ≤ 13. |
| C | 6 | 138~145행 비용 표(HW entry 12 cycle, SW push ~10, 스케줄러 20~100, 합계 ~70 cycle·~0.4 µs)는 136행 'Cortex-M4 @ 168 MHz'만 있고 측정 방법·출처·RTOS 버전이 없어 C ≤ 8. 합계 ~70은 단계 범위(64~144)의 하단만 쓴 값이다. 실행 가능한 코드가 없고 161행 uxTaskGetStackHighWaterMark 언급 외에 검증 절차가 없다. 앵커 part1-04(C 6) 수준. |
| D | 10 | 비교한 글: part2-03, part2-05, part2-06, part2-07, modern-recipes/part2-03-arm-registers.md, performance-engineering/part3-05-interrupt-latency.md. 77~83행 7단계 ↔ part2-05 115~117행, 163~167행 lazy stacking ↔ part2-05 207~219행·perf part3-05 44~55행·recipes part2-03 191행, 58~69행 ↔ recipes part2-03 206행, 169~181행 RISC-V ↔ part2-07 116·227행(~70 cycle까지 같음), 183~191행 MMU 비용 ↔ part2-06 112~116행. 아키텍처 중립 개요(22~29·87~96·98~119행)로 역할이 구별돼 10~14 하단. |
| E | 5 | 제목의 저장·복원·Stack Frame은 56~119행에서 다룬다. description은 '아키텍처 중립적으로'와 '비용은 얼마인지'를 약속하지만 설명은 FreeRTOS + Cortex-M 기준이고 비용(136행)도 Cortex-M4 하나, RISC-V·Cortex-A는 169~191행 한 절씩이다. '분석'에 비해 개념 소개 수준이라 3~5. 앵커 part1-04(E 5)와 같다. |
| F | 7 | 216행 다음 편 안내는 seriesOrder 15 part2-05-cortex-m-context.md와 맞다. 220~223행 관련 항목(2-03, 2-05, 2-06, 2-07)은 대상 파일 제목·번호와 모두 맞다. 205행 '다음 편에서 다룹니다' 연결과 85행이 77~83행 단계를 다시 가리키는 고유 구조가 있어 7. 전제 지식 안내가 없고 audit:reading을 하지 않아 8 이상은 아니다. |
| G | 1 | 본문에 출처 링크가 없다. 45행 'ARM AAPCS', 102행 pxPortInitialiseStack, 140행 12 cycle entry, 167행 FPCA bit 모두 문서·버전 표기가 없다. 앵커 part1-04·part6-09(G 1)와 같다. |

uncertainties:
- 151·155행 17 word가 FreeRTOS ARM_CM4F port의 EXC_RETURN 추가 저장일 가능성이 있다. 그래도 글은 69·210행과 구분하지 않아 내부 모순은 남는다. port.c로 확인 필요.
- 165·156행 'FPU S0-S31 + FPSCR 33 word, 매 switch마다 다 push'는 part2-05 218행·recipes part2-03 191행(HW S0-S15·FPSCR, SW S16-S31)과 다르다(글 간 모순).
- 58행 'HW 자동 push 8개는 caller-saved에 해당': LR·PC·xPSR은 49행 표의 caller-saved에 없다.
- 138~145행 SW push·스케줄러 cycle의 출처 없음. perf part3-05 178행은 ~100 cycle로 이 글 ~70과 다르다.
- 181행 'RISC-V latency는 ARM보다 살짝 느림'과 part2-07 227행 '12 cycle vs 6 cycle (entry만)'이 방향이 다르다.
- 107~115행 초기 stack 패턴과 LR = task_exit_error가 현재 pxPortInitialiseStack과 같은지 미확인.
- 181행 ARMv8-M secure/non-secure stacking 비유 근거 미확인.
- 191행 '수십 µs', 130행 '옛 Mac OS, Win 3.1 / 모든 현대 RTOS'는 출처 없는 일반화.
- 161행 'printf 한 번이 200 byte 가까이'·권장 256 word는 출처 없는 수치이고 197행 '256 byte도 부족'과 단위가 섞여 읽힌다.

병합 대상(점수 구간 병합 검토, 판정은 오류 확인으로 우선 조치): 글 전체 병합 대상 없음. 아키텍처 중립 개요라는 시리즈 내 역할이 있다. 69·210행과 151·155·197행의 context 크기를 port별로 나눠 맞춘 뒤 보강한다.

### `part2-05-cortex-m-context.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다. 243행 주석 'R8-R11을 R0-R3에 옮긴 뒤 push'와 244~247행 코드 'mov r4, r8 … mov r7, r11'은 대상 레지스터부터 다르다. 248행에서 r8-r11 값을 담은 r4-r7을 저장한 뒤 249~250행 '그 다음 R4-R7 push'가 같은 r4-r7을 다시 저장하므로 원래 R4-R7 값은 저장되지 않는다. 그런데 253행은 '명령 수가 더 많지만 결과는 같습니다'라고 단정한다. git log 12건(42ebbcbb, a90a6bae, fa6eb0c8, 845231cf, 85a2d46f, e9ea2b8e, 86fff64f, 3a5602d3, ac24bb76, be973200, 68525f0c, 0a9dd7bc)에 1차 자료 대조 커밋이 없다. FreeRTOS ARM_CM0 port 원문은 열지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | PendSV 핸들러를 (1)~(15) 번호 주석으로 풀고(81~111행) 세 묶음으로 요약한 것(115~117행), SVC로 첫 task를 시작하는 이유와 코드(136~170행), SVC·PendSV 비교 표(223~228행)가 고유하다. MSP/PSP 표(55~58행), EXC_RETURN 표(125~132행), BASEPRI(194~205행)는 입문 자료의 표준 내용이다. 205행 '자동차 ESC'는 이름뿐이고 253행 '95%는 동일'은 근거 없는 수치다. 13~19 하단. |
| B | 12 | trigger(34~49행)부터 정리(273~283행)까지 흐름은 완결된다. 213~217행 FPU 조각이 81~111행 핸들러 어디에 들어가는지 설명이 없고, 핸들러가 lr을 task stack에 저장하지 않는데 134행 'FP 쓰는 task면 0xFFFFFFED'가 task별로 어떻게 성립하는지 연결이 없다. 242~251행 M0 코드는 내부 모순이 있다. B ≤ 13. |
| C | 5 | FreeRTOS 버전, port 디렉터리(ARM_CM3/CM4F/CM0), 대상 MCU가 없다. 81~111행은 FPU 처리가 빠진 형태이고 213~217행은 FPU 조각이라 한 port로 재현되지 않는다. 측정값·관찰·검증 절차가 없다. 253행 '95%'는 출처 없는 수치(C ≤ 8). 242~251행 M0 코드는 그대로 쓰면 원래 R4-R7을 잃는다. 4~7 구간. |
| D | 10 | 비교한 글: part2-04, part2-06, part5-01-freertos-source.md, part5-04-porting.md, modern-recipes/part2-03-arm-registers.md, part2-04-cortex-m-exceptions.md, part6-03-scheduler-internals.md. 81~111행 PendSV 핸들러 ↔ part5-01 174~201행, part5-04 147~176행(lr·FPU 포함 형태). 176~188행 SysTick ↔ part5-04 104~114행. 115행 ↔ part2-04 56~70행. 207~219행 lazy FPU ↔ part2-04 163~167행. part2-06은 역할이 다르다. Cortex-M 심화 편으로 구별되나 같은 핸들러가 시리즈 안에서 세 번 나온다. |
| E | 7 | 제목 'PendSV·MSP/PSP 어셈블리 추적'은 81~117·51~75행이 이행하고 description의 EXC_RETURN(121~134행), BASEPRI(192~205행), lazy FPU(207~219행)도 절이 있다. lazy FPU는 3줄 조각과 두 문단뿐이고 핸들러 추적과 연결되지 않는다. |
| F | 5 | 283행 다음 편 안내는 seriesOrder 16 part2-06-cortex-a-context.md와 맞다. 287~289행 라벨(2-04, 2-06, 1-05)은 맞다. 290행 '1-06: ISR 안에서 RTOS API 호출'은 part3-09-isr-safe-api.md(seriesOrder 30)로 가고 실제 1-06은 part1-06-sync-basics.md('동기화 기초 분석')라 번호가 틀렸다. 틀린 관련 링크 라벨이라 F ≤ 5. |
| G | 1 | 본문에 1차 출처 링크가 없다. FreeRTOS-Kernel 버전·port 경로, ARMv7-M/ARMv6-M ARM, Cortex-M4 Generic User Guide 인용이 없다. 27행 'port.c' 이름만 나온다. |

uncertainties:
- 196행 'BASEPRI는 priority가 N 이하인 IRQ만 mask'와 199~202행은 '이하'를 숫자로 읽으면 반대, 긴급도로 읽으면 맞다. 199행 configMAX_SYSCALL_INTERRUPT_PRIORITY를 shift 없이 5로 둔 것이 포트 정의와 맞는지 미확인.
- 81~111행 핸들러는 lr을 저장하지 않는데 part5-01 184행·part5-04 161행은 'stmdb r0!, {r4-r11, lr}'로 저장한다. 134행과 213~217행이 이 핸들러로 task별로 성립하지 않을 수 있다(다른 글과의 모순이라 오류 근거 아님).
- 79행 '16 줄이 채 안 되지만'과 82~110행 명령 수 불일치(산문 개수 표기).
- 209행 'CONTROL.FPCA bit'와 214행 'EXC_RETURN bit 4 = FPCA'가 다른 레지스터의 비트를 같은 것처럼 쓴다. 219행 'FPU 안 쓴 task 오버헤드 0' 근거 미확인.
- 259행 'configKERNEL_INTERRUPT_PRIORITY보다 높게 두면 context가 망가질 수 있다'의 메커니즘 미확인.
- 141~151행 vPortStartFirstTask, 157~167행 vPortSVCHandler가 현재 port.c와 같은지 미확인(로컬 clone 없음).
- 253행 '95%'는 출처 없는 수치.

병합 대상(점수 구간 병합 검토, 판정은 오류 확인으로 우선 조치): 글 전체 병합 대상 없음. 같은 핸들러가 있는 part5-01 174~201행·part5-04 147~176행 중 정본 하나를 정하고 나머지는 링크로 줄이는 구조 결정이 필요하다. 먼저 242~253행 M0 코드와 결론을 고치고 290행 라벨을 바로잡는다.

### `part2-06-cortex-a-context.md` — 44점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다. 127행 'TLB invalidate·cache flush·ASID 갱신 … 이 과정만으로도 수십 µs가 추가됩니다'와 183행 정리 'MMU, cache, TLB 처리로 수 µs 단위의 비용이 듭니다'는 같은 대상에 자릿수가 다른 값을 단정한다(AP-C-16 유형, 본문과 정리가 어긋남). 보조로 147행 'Context switch ~300 cycle + cache/TLB (수 µs)'와 149행 'TLB flush 10 µs'도 같은 처리를 다른 크기로 적는다. git log(0a9dd7bc, be973200, ac24bb76, 85a2d46f, 그 이전 작성·다이어그램 커밋)에 ARM ARM·FreeRTOS·Zephyr와 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 모드 비트 표(19~27행), banked register 도식(33~40행), IRQ 진입 4단계(44~50행)는 ARMv7-A 입문 자료의 표준 내용이다. 이 글만의 것은 Cortex-M3 대 Cortex-A53 비용 표(145~149행)와 151행 'RTOS가 single process 다중 thread를 택하는 이유'인데 출처·측정 환경이 없다. NEON(131행)과 TrustZone(141행)은 한 문장 일반론이다. 6~12 구간의 9. |
| B | 8 | 모드 → banked → 진입 → 저장 asm → SVC → MMU → 비용 흐름은 있으나 절마다 짧다. NEON은 131행 한 줄, TrustZone은 135~141행, Zephyr 포트는 '/* ... */'만 있는 코드(155~161행)다. SVC 절(102~110행)은 handler가 번호를 꺼내는 방법이 없다. 127행과 183행 비용 모순이 열려 있어 B ≤ 13, 한계·결과가 빠져 5~9. |
| C | 4 | 어셈블리(58~94행)와 TLB 시퀀스(120~125행)에 대상 코어·툴체인·포트 버전이 없고 실행·관찰 절차가 없다. 145~149행 '~70 cycle (0.4 µs)', '~300 cycle', 'TLB flush 10 µs + cold cache 100 µs+'와 127행 '수십 µs'는 출처 없는 수치라 C ≤ 8이고 수치끼리도 어긋난다. 4~7 하단. |
| D | 11 | 비교한 글: part2-04, part2-05, part2-07, modern-recipes/part2-03-arm-registers.md, modern-recipes/part2-08-arm-mmu.md, bootloader/chapter25-tfa-optee.md. 114~127행(TLB invalidate·cache flush·ASID, '수십 µs')은 part2-04 185~191행과 같은 목록·같은 수치다. 114~125행 TLB·ASID는 part2-08-arm-mmu 58~67행이 v6.12 소스 인용과 함께 더 자세히 다룬다. 141행 SMC→EL3는 chapter25 102~124행이 자세하다. AArch32 모드·banked register·Cortex-A RTOS 포트 저장 순서를 다루는 공개 글은 이 글뿐이라 역할은 구별된다. |
| E | 5 | Mode 전환·SVC·Banked Registers는 17~52·98~110·31~40행에 있지만 얕다. 제목은 'ARM Cortex-A' 전체인데 19~93행은 AArch32 전용이고 122행 'tlbi vmalle1is', 141행 'EL3', 145행 Cortex-A53은 AArch64 쪽이라 범위가 섞인다(AP-C-24 E ≤ 8). description(5행)은 명사 나열 조각문이라 3~5. |
| F | 6 | 186행 다음 편 안내는 seriesOrder 17 part2-07-riscv-context.md와 맞다. 190행 2-05, 191행 2-07 라벨이 대상 제목과 맞다. 전제 지식 안내(2-04)나 글 고유 내부 안내가 없어 7 이상 근거가 없다. |
| G | 1 | 본문에 출처 링크가 없다. ARM ARM 판, FreeRTOS 포트 이름·버전, Zephyr 버전이 없다. 156행 Zephyr 경로만 있고 버전·태그가 없다. |

uncertainties:
- 15·17·181행 '7 모드' 표(19~27행)에 Monitor·Hyp가 없는데 141행은 Monitor로 trap한다고 쓴다. 모드 수를 ARM ARM으로 확인하지 않았다.
- 122행 'tlbi vmalle1is'(A64)와 58~93행 AArch32 코드가 같은 실행 상태에서 쓰일 수 있는지 미확인.
- 65~66·86행 d16-d31 저장은 D32 VFP 코어에서만 유효하다. 대상 코어 미명시.
- 58~94행이 FreeRTOS Cortex-A 포트 저장 순서(ulCriticalNesting, FPU 플래그 등)와 맞는지 portASM.S 미확인.
- 156~157행 Zephyr 경로와 'z_arm_pendsv' 레이블이 Cortex-A/R AArch32 포트에 있는지 미확인.
- 163행 'FreeRTOS-Plus의 Cortex-A 포트'는 커널 본체 portable/GCC/ARM_CA9·ARM_CA53와 어긋날 수 있다.
- 114~118·127행 'context switch 시 TLB invalidate 추가'는 modern-recipes/part2-08-arm-mmu 66행('cpu_do_switch_mm에는 TLB invalidate가 없다', ASID로 회피)과 다르다(다른 글과의 모순).
- 145행 'Cortex-M3 (168MHz)'와 part2-04 136·213행 'Cortex-M4 @ 168 MHz'가 다르다.
- 169행 'User mode에서 privileged 명령 → Undef trap'은 명령에 따라 무시되는 경우가 있어 일반화 미확인.
- 177행 'coherent cache는 비싸서 명시적으로 관리하는 경우가 많다'는 출처 없는 주장.

병합 대상(점수 구간 병합 검토, 판정은 오류 확인으로 우선 조치): 병합 대상 없음. part2-04 185~191행과 MMU 비용 부분만 겹치고 AArch32 모드·Cortex-A 포트 저장 순서를 다루는 공개 글은 이 글뿐이다. 127·183행(및 147·149행) 비용을 하나로 맞추거나 TBD로 바꾼 뒤 다음 조치는 보강이다. 제목 범위를 AArch32로 좁히거나 AArch64 EL 모델을 따로 다루고, 58~93행을 ARM_CA9 portASM.S나 Zephyr 소스와 버전을 붙여 대조하며, 114~127행 MMU 비용은 part2-04와 한쪽으로 모으고 part2-08-arm-mmu로 링크한다.

### `part2-07-riscv-context.md` — 48점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 세 건이다. (1) 83행 `csrrw sp, mscratch, sp` 뒤에는 158행 설명대로 'sp = ISR stack, mscratch = task SP'인데 88행 `sw x2, 4(sp)` 주석은 'original sp 저장 (mscratch에 있음)'이다. x2에는 ISR stack 주소가 있어 원래 task SP를 저장하지 않는다. (2) 86행 `addi sp, sp, -128`로 128바이트만 잡고 95·97행에서 mepc·mstatus를 128(sp)·132(sp)에 저장하며 110행도 128만 되돌린다. 154행 mscratch = ISR_stack_top이므로 128(sp)는 스택 꼭대기 바깥이다. (3) 87~89행 패턴(x1@0, x2@4, x3@8)이면 x31은 120인데 91·107행은 124(sp)다. git log(a90a6bae 본문 작성, 85a2d46f 번역투 수정, c38cb67c·ac24bb76·be973200·0a9dd7bc·3232b1be 형식·메타데이터·태그)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | Privilege level 표(19~23행), 레지스터 목록(29~41행), CSR 표(47~56행), trap 진입 5단계(60~75행), mret(120~125행)은 RISC-V privileged spec 요약 수준이다. 고유한 것은 Cortex-M 대비 표(221~228행)와 CLZ/Zbb 때문에 generic 선택을 쓴다는 설명(207~217행)인데 226~227행 cycle 값에 출처가 없고 217행 '성능 차이 자체는 작습니다', 230행 '살짝 느립니다'는 근거 없는 일반론이다. 6~12 중간. |
| B | 10 | 권한 모드(17행)부터 정리(260행)까지 흐름은 끝까지 간다. 제목의 핵심인 task 간 SP 교체(TCB 저장·vTaskSwitchContext)는 82~114행 ISR 예제에 없고 165~190행은 첫 task 시작만 보여 준다. 90·108·185행 `...` 생략. 내부 모순이 열려 있어 B ≤ 13, 한계 설명이 없어 10. |
| C | 5 | 82~114·166~190행 어셈블리에 툴체인·보드·FreeRTOS 버전이 없고 생략 부호로 빌드되지 않는다. 116행 '12 cycle auto-push', 226~227행 cycle 값, 238~239행 ESP32-C3 mtime 주소는 출처·환경 없는 수치라 C ≤ 8. 측정·검증 절차가 없고 ISR 예제 프레임 산술이 틀려(86·91·95·97행) 4~7 안에서 낮게 줬다. |
| D | 10 | 비교한 글: part2-06(주제 다름), part2-08 105~116행(RISC-V mtime/mtimecmp가 이 글 236~240행과 일부 겹침), part2-04 169~181행(`csrrw ... mscratch` 후 x1..x31 저장, 'HW auto-push 없음·살짝 느림' 결론이 이 글 77·83~91·230행과 같음), part5-04-porting.md 184~205행(mscratch swap → 32*4 프레임 → mret이 이 글 82~113·150~161행과 거의 같고 207행이 이 글로 링크). 다른 시리즈 esp32-c3-mastering/chapter02-riscv-core.md 100~110행 CSR 표와 211~213행 CLIC 변형 설명이 47~56·192~203행과 겹친다. RISC-V 전용 장이라 역할은 구별되나 반복이 커서 10~14 하단. |
| E | 6 | 제목 키워드 ECALL(129~146행), mret(118~127행), CSR(45~56행)과 description의 mscratch(148~161행)·mepc·mcause·mstatus를 다룬다. 'Context Switch 분석'에 비해 task 간 전환 절이 없어 부분 미이행, 6~8 하단. |
| F | 6 | 268행 다음 편 'tick과 타이머'는 seriesOrder 18 part2-08-tick-timer.md와 맞다. 272행 2-06, 273행 2-08, 274행 'ESP32-C3 Mastering'(esp32-c3-mastering/chapter01-overview.md, 공개) 라벨이 맞다. 전제 지식(2-04·2-05) 안내가 없고 60~75행 단계가 굵은 줄과 빈 줄로 흩어져 7 이상 근거가 없다. |
| G | 1 | 본문에 1차 출처 링크가 없다. RISC-V Privileged Spec 판, FreeRTOS 버전·포트 경로(166행 'portasm.S' 이름만), ESP32-C3 TRM이 없고 226~227행 cycle 수치에 대상 코어가 없다. |

uncertainties:
- 25행 'RTOS는 M-mode에서만 동작'과 146행 'RTOS API 호출은 보통 ecall을 거칩니다'가 어긋나 보이나 146행이 단서를 달아 단정하지 않았다. Zephyr userspace U-mode 사용은 미확인.
- 183~186행 FreeRTOS 예제 오프셋 배치가 실제 portASM.S와 맞는지 미확인.
- 199행 CLIC 외부 IRQ '256', 198행 'extension (대부분 vendor)', 201행 'Greenwich SiFive E' 표기는 CLIC 사양으로 확인하지 않았다.
- 201·265행 ESP32-C3 CLIC 채택 서술은 esp32-c3-mastering/chapter02 213행('CLIC와 비슷하지만 호환되지 않는 자체 구현')과 다르다(다른 글과의 차이).
- 238~239행 ESP32-C3 configMTIME_BASE_ADDRESS 0x4400BFF8 등은 ESP-IDF·TRM 미확인.
- 226~227행 cycle 수치, 211행 '__clz 1 cycle', 207행 RISC-V 포트 generic 선택 주장은 upstream 미확인.

병합 대상(점수 구간 병합 검토, 판정은 오류 확인으로 우선 조치): 후보는 `part2-04-context-switch.md` 169~181행과 `part5-04-porting.md` 184~205행이지만 이 글이 RISC-V 전용 장이고 5-04 207행이 이미 이 글로 링크하므로 다음 조치는 보강이다. ISR 예제의 프레임 크기·오프셋·x2 저장을 고치고, task 간 SP 교체 절을 추가하고, cycle 수치는 1차 자료로 확인하거나 지우며, 2-04·5-04의 중복 코드는 이 글 링크로 정리한다.

### `part2-08-tick-timer.md` — 48점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic 메타, ac24bb76 제목 변경, 85a2d46f 번역투 수정·발행, 그 이전 본문·다이어그램 커밋)에 FreeRTOS port.c, ARM ARM, RISC-V privileged spec, 데이터시트와 대조한 커밋이 없다. 원문 산술(82행 0.07~0.3%, 85행 0.7~3%, 103행 약 24,000년, 178행 1296초≈21분, 181행 4.3초, 213행 ±1%→약 14분, 80행 합계 122~522)은 직접 계산해 모두 맞았다. 157~165행 tickless 코드의 의심점은 configSYSTICK_CLOCK_HZ 의미를 알아야 판단되어 루브릭 3-1 예외로 uncertainties에 두었다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | SysTick 설정(21~39행), handler(43~58행), tick rate 표(62~69행), vTaskDelay/vTaskDelayUntil(134~146행), pdMS_TO_TICKS(201~205행)는 입문 자료의 표준 내용이다. 고유한 것은 ISR cycle 분해와 CPU 비율(73~85행), Cortex-A Generic Timer·RISC-V mtime 비교(87~116행), HSI/HSE 하루 drift 계산(176~182행), RTC·tick 비교 표(188~195행)다. 75~79행 cycle 수와 174행 ±1~2%·±50 ppm은 출처가 없고 66·170행은 근거 없는 단정이다. 6~12 상단. |
| B | 10 | tick source(17행)부터 정리(219행)까지 흐름은 끝난다. 97~101행 Generic Timer 코드는 CNTP_CTL 활성화·IRQ 연결이 없고, 107~114행 RISC-V 코드는 64-bit mtimecmp 쓰기 순서 같은 한계가 없다. 154~167행 tickless 코드는 19행의 24-bit 상한과 abort 경로를 다루지 않는다. B ≤ 13이고 한계 누락이 여럿이라 10. |
| C | 6 | 코드 조각과 산술(39행 168,000 cycle, 82·103·178·181행)은 있으나 보드·FreeRTOS 버전·측정 환경이 없다. 75~80행 ISR cycle 수는 출처 없는 수치라 C ≤ 8. tick ISR 시간을 재는 절차(GPIO 토글·DWT CYCCNT)나 기대 관찰이 없다. 앵커 part1-04(C=6) 수준. |
| D | 7 | 비교한 글: part1-04-preemption, part2-05, part2-09-tickless, modern-recipes part4-06-systick-timer·part6-03-scheduler-internals·part1-02-clock-timing. 62~69행 tick rate 표 ≈ part1-04 122~130행(문구 동일, 500 Hz 행만 추가). 43~51행 xPortSysTickHandler ≈ part2-05 177~187행. 148~170·207~209행 tickless·wake source 함정 ≈ part2-09 구현 절·243~245행, part1-04 132~140행. 29~39행 RELOAD ≈ recipes 4-06 38~45·76행(DUI 0553A 출처 포함). 118~130행 time slicing ≈ recipes 6-03 72~82행. 174행 HSI ±1~2% ≈ recipes 1-02 103행. 고유 역할은 87~116·176~182행이라 5~9 구간. |
| E | 7 | 제목의 SysTick(17~58행), Generic Timer(87~103행), configTICK_RATE_HZ(23·62~69·201행)를 다룬다. description의 'Hz 선택의 trade-off'는 62~69·71~85행으로 답하지만 선택 기준이 표 한 줄씩이다. RISC-V mtime·tickless·drift는 제목 밖이고 독자·문제가 드러나지 않아 9 이상은 아니다. |
| F | 6 | 227행 '다음 편은 tickless 모드 구현'은 seriesOrder 19 part2-09-tickless와 맞다. 231행 '1-04: Preemption (tickless)'는 part1-04-preemption(132행 근처 Tickless Mode 절)으로 맞고 232행 2-09도 맞다. 전제 지식 안내가 없고 handler가 기대는 part2-05, tick 위 software timer(part4-09) 링크가 없다. 7 이상은 주지 않았다. |
| G | 1 | 본문에 출처 링크가 없다. 22~36행 코드에 커널 버전·port 경로가 없고, 92~94행 Generic Timer 레지스터와 109~110행 CLINT 주소(0x0200BFF8, 0x02004000)에 ARM ARM·RISC-V spec·SoC 문서 인용이 없다. 174행 HSI/HSE 오차도 데이터시트 표기가 없다. |

uncertainties:
- 152행 'Idle 동안 SysTick을 멈춰 두고'와 157~158행 코드(reload만 늘려 계속 돌림)가 다른 동작이다. part2-09는 SysTick을 먼저 멈춘다. port.c 미확인.
- 163~165행 경과 tick 계산이 158행 ulReloadValue가 아니라 configSYSTICK_CLOCK_HZ에서 현재 값을 뺀다. 19·39행 전제로 바로 깨면 (168,000,000 − 약 840,000)/168,000 ≈ 995 tick을 보충하게 되어 162행 주석과 맞지 않아 보인다. API 의미 판단이라 오류 확인으로 올리지 않았다. 157행 곱이 24-bit를 넘는 경우(xExpectedIdleTime > 99 tick @168 MHz/1 kHz) 처리도 없다.
- 75~80행 SysTick ISR cycle 수는 출처 없는 수치다. 223행 '약 0.1%'는 82행 범위의 하단 근처만 적었다.
- 66·222행 '1 kHz가 대부분 RTOS 기본'은 각 RTOS 기본값으로 확인하지 않았다.
- 108행 'PLIC·CLINT의 mtime'과 109~110행 주소(SiFive CLINT 배치로 보임)의 대상 SoC 미표기.
- 92행 'CNTFRQ_EL0 보통 24 MHz'는 출처가 없다(103행 산술은 맞음).
- 174행 HSI ±1~2%, HSE ±50 ppm 출처 없음(recipes 1-02 103행은 ±20 ppm). 191행 'µs 단위' 정밀도는 tick rate에 따라 달라 모순으로 확정하지 않았다.
- 45행 주석 'IRQ mask'는 BASEPRI가 일부만 막는다는 점(part2-05)과 표현이 다르다.

병합 대상: tickless 절(148~170행)과 wake source 함정(207~209행)은 `part2-09-tickless.md`(구현 절·243~245행)와, tick rate 표(62~69행)는 `part1-04-preemption.md` 122~130행과, handler 코드(43~51행)는 `part2-05-cortex-m-context.md` 177~187행과 겹친다. '아키텍처별 tick source와 tick rate 선택'이라는 독립 검색 의도가 있어 글 전체 병합은 권하지 않는다. 다음 조치는 보강이다. 중복 절은 2-09·2-05 링크로 줄이고, 고유 부분(87~116행, 172~184행)에 1차 출처(FreeRTOS port.c 버전, ARM ARM Generic Timer 절, RISC-V privileged spec mtime 절, MCU 데이터시트)와 tick ISR 측정 절차를 붙인다. 157~165행은 port.c와 대조해 고치거나 2-09로 넘긴다.

### `part2-09-tickless.md` — 41점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건이다. (1) 19행 '매 ms wake가 누적되면 평균 mA가 됩니다. 결국 배터리는 1주일을 못 갑니다'와 23~25행 '30 nC/ms + 1 nC/ms → 평균: ~31 µA (1년 = 270 mAh)'가 충돌한다. 31 µA × 8760 h ≈ 272 mAh로 25행 산술이 맞고, 연 270 mAh면 1주일에 약 5 mAh라 19행과 맞지 않는다. (2) 259행 'Stop·Standby에서 쓸 수 있는 유일한 wake source는 사실상 RTC alarm'과 127행 표(Stop wake source 'EXTI·RTC')·128행(Standby 'RTC·WKUP pin')·154행(EXTI)이 충돌한다. git log(0a9dd7bc, be973200, ac24bb76, c38cb67c 코드 블록 변환, 85a2d46f 번역투 수정·공개)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 고유한 것은 21~26행 ms당 전하 계산과 64~118행 eTaskConfirmSleepModeStatus abort 경로(76~81행)를 포함한 vPortSuppressTicksAndSleep 재구성 정도다. 121~128행 전력 모드 표, 148~156행 wake source 목록, 211~224행 TI LPM3, 237~253행 함정은 일반론이다. 209행 '한층 정교한 방식', 224행 '사실상 표준'은 근거 없는 평가다. 앵커 part1-04(A 10)와 같은 구간. |
| B | 7 | 30~56행 '동작 원리' 9단계는 굵은 제목만 있고 본문이 비어 있다. wake 보정 코드는 105행 `if (/* SysTick interrupt가 trigger 됐다면 */)`, 111행 `ulCompleteTickPeriods = /* 계산 */;`로 핵심 분기가 빠졌다. Zephyr(190~209행)와 TI(211~224행)는 코드 한 조각과 한두 문장이다. 결과·한계가 빠져 5~9. |
| C | 4 | 105·111행 placeholder로 코드가 컴파일되지 않고 108행 `ulCompleteTickPeriods`는 65~66행 선언 목록에 없다. 125~128행 모드별 전류·latency, 230~232행 측정기 가격·정밀도는 출처·대상 MCU 없는 수치라 C ≤ 8. 226~235행 '측정' 절에 절차·환경·결과가 없고 235행 '정확히 예측할 수 있습니다'로 끝난다. 4~7 하단. |
| D | 9 | 비교한 글: part2-08, part2-10, part1-04-preemption, modern-recipes/part8-11-power-optimization.md, freertos-mastering/chapter11-low-power.md(draft). 2-08 148~170행 Tickless Idle 절(170행 '5년 이상 … IoT')이 이 글 58~119·15·261행과 같은 설명이고 2-08 207~209행이 이 글 243~245행과 같다. 1-04 132~140행이 61~62·253행과 같다. recipes 8-11 66~91·108~114·154·216~223행이 이 글 121~145·173~188·226~233·247~249행과 겹친다. freertos-mastering ch11 36~98행은 draft라 공개 중복은 아니다. port 구현 상세(64~118행)는 공개 글 중 이 글에만 있어 역할은 남지만 반복이 커 5~9 구간. |
| E | 6 | 제목 키워드 Idle Tick Suppression(64~88행)과 Sleep(90~97·121~188행)은 다룬다. 'Wake 보정'은 106~108·113행은 있으나 다른 IRQ로 깬 경우가 111행 `/* 계산 */`로 비어 부분 미이행이다. description의 'SysTick 멈춤 + CPU sleep, 동적 timer 설정'은 이행한다. 키워드 하나 부분 미이행이라 6~8 구간에서 감점해 6. |
| F | 4 | 263행 '다음 편은 Part 2의 마지막인 Scheduler Latency 측정': seriesOrder 20 part2-10-scheduler-latency.md는 맞지만 seriesOrder 21 part2-11-tracing-observability.md가 공개 상태라 'Part 2의 마지막'이 틀렸다. 다음 편 안내가 틀려 F ≤ 5. 267~269행 관련 항목(2-08, 2-10, 1-04)은 라벨과 맞다. 30~56행 빈 굵은 제목 9개가 흐름을 끊고 전제 지식 안내가 없다. |
| G | 1 | 본문에 출처 링크가 없다. 64~118행은 port.c를 옮긴 형태지만 버전·경로가 없고, 132~146·177~186행 HAL 호출과 249행 'Stop 후 HSI로 시작'은 대상 STM32 계열·reference manual 판이 없다. 125~128·230~232행 수치에도 출처가 없다. |

uncertainties:
- 69~72행 SysTick을 끈 뒤 IRQ disable 순서와 84~85행 reload 식이 ARM_CM port.c와 같은지 미확인.
- 133~139행 configPRE_SLEEP_PROCESSING을 값 인자 함수로 정의했는데 FreeRTOS는 인자를 수정할 수 있는 매크로다(recipes 8-11 114행, freertos-mastering ch11 112행은 &(x)). PRE_SLEEP 안에서 STOP(WFI)에 들어간 뒤 93~96행에서 다시 WFI하는 흐름도 미확인.
- 175행 'SysTick은 Stop mode에서 멈춘다'와 132~139행(기본 tickless 경로 안에서 Stop 진입)이 긴장 관계다. freertos-mastering ch11 34행은 configUSE_TICKLESS_IDLE=1로는 STOP을 쓸 수 없다고 한다. 코드 의미 판단이라 오류 확인에 넣지 않았다.
- part2-08 160~162행 경과 tick 계산식이 이 글 106~108행과 다르다(글 간 모순).
- 125~128행 전류·latency, 230~232행 Otii Arc·PPK II·JouleScope 가격·정밀도는 출처가 없다.
- 249행 'Stop에서 빠져나오면 HSI로 시작'은 reference manual로 확인하지 않았다.
- 258행 'µA에서 nA 단위까지'는 128행 표 최저값(1~5 µA) 밖의 주장이다.
- 198·203·204행 Zephyr power-state devicetree 속성이 현재 바인딩과 맞는지 미확인.
- 15·261행 '5년 넘게 동작'은 전제 없는 수치다.

병합 대상(점수 구간 병합 검토, 판정은 오류 확인으로 우선 조치): 후보는 `part2-08-tick-timer.md` 148~170행 Tickless Idle 절이다. port 구현 상세(64~118행)는 공개 글 중 이 글에만 있고 2-08 227행이 이 글을 독립 편으로 예고하므로 다음 조치는 보강이다. 19행 대 23~25행, 259행 대 127~128행 모순을 먼저 고친다. 105·111행 placeholder를 버전을 명시한 port.c와 대조해 채우거나 TBD로 두고, 30~56행 빈 단계를 채우고, 263행 'Part 2의 마지막'을 바로잡는다. recipes 8-11과 겹치는 측정기·Stop/Standby 일반론은 줄인다.

### `part2-10-scheduler-latency.md` — 42점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 코드와 산문의 내부 모순이다. 46행 `GPIO_SET(DEBUG_PIN); // t2`, 50행 `GPIO_CLR(DEBUG_PIN); // t4`, 57행 `GPIO_TOGGLE(DEBUG_PIN); // t7`이고, 63행은 'ISR 시작, ISR 끝, task 시작이 세 개의 edge로 나타납니다', 67행은 't2·t4·t7 사이 폭으로 분리해 측정'이라고 쓴다. 57행 TOGGLE은 50행 CLR 뒤 낮은 핀을 높여 첫 이벤트 뒤 핀이 high로 남는다. 다음 이벤트의 46행 SET은 이미 high인 핀에 쓰므로 t2 edge가 생기지 않아 두 번째 이벤트부터 63·67행 설명이 성립하지 않는다. git log(a90a6bae, 845231cf·3235d76c 다이어그램, 85a2d46f, ac24bb76, be973200, 0a9dd7bc, 35baac92)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 고유한 것은 t1~t7 구간 정의(19~39행)로 interrupt, scheduler, total wake latency를 나눈 점과 µs 버킷 histogram 코드(189~205행)다. 41~173행은 GPIO toggle, DWT, ftrace, irqsoff, cyclictest, SystemView, Tracealyzer를 도구마다 한두 문단씩 나열한다. SystemView(151~162행)·Tracealyzer(164~173행)는 init 한 줄과 162행 같은 일반 문장뿐이다. 177~185·211~218행 표는 출처가 없어 분석으로 치지 않았다. 앵커 part6-09(A=10) 수준. |
| B | 8 | 정의 → 도구 → 원인 표 → histogram → 사례 → 실수 → 정리 순서는 있다. GPIO 예(43~61행)는 `woken`을 선언하지 않고 57행 TOGGLE 때문에 63·67행 설명과 맞지 않는다. DWT 예(77~93행)의 ISR은 semaphore를 give하지 않아 88행 task가 깨어날 경로가 없고 90행 `t_task - t_isr_end`는 그대로는 재지 못한다(AP-C-35). 37행 t7-t4 구간과 ftrace·cyclictest(98~149행)의 Linux wakeup latency가 같은 구간이 아닌데 차이를 말하지 않는다. B ≤ 13이고 코드 모순까지 있어 8. |
| C | 6 | 132행 cyclictest, 116~121행 irqsoff 명령과 73~75행 레지스터 코드는 있다. 보드·커널·FreeRTOS·rt-tests 버전이 없다. 145~146·125~126행 출력은 환경 없는 예시다. 211~218행 '실제 측정 사례' 표는 환경·출처 없이 Avg·p99·Max만 있어 C ≤ 8. 179~185행도 출처 없는 범위다. 합격·실패 관찰 표가 없어 C ≥ 10 조건을 채우지 못한다. |
| D | 7 | 비교한 글: part2-09(겹침 없음), part2-11, part1-10-realtime-analysis.md, part5-07-preempt-rt-linux.md, performance-engineering/part1-05-realtime.md·part3-05-interrupt-latency.md·part6-01-case-isr-latency.md. 132·145·149행 cyclictest 명령·출력(Min:5 Avg:7 Max:23)·설명 문장이 part1-10 163~169행과 거의 같고 Perf-Eng part1-05 118~120행도 같은 명령·숫자다. 43~63행 ↔ part1-10 171~181행, 71~96행 DWT ↔ Perf-Eng part3-05 59~76행, 151~173행 ↔ part2-11 44~116행, 112~127행 irqsoff ↔ Perf-Eng part6-01 61~79행, 211~218행 ↔ part5-07 103~120행. 고유 질문은 t4→t7 구간 정의(19~39행)뿐이라 5~9 구간. |
| E | 6 | 제목 키워드 GPIO Toggle·DWT·ftrace·cyclictest는 41·69·98·129행 절이 있고 description의 'worst-case 추적'은 187행 절이 있다. description이 정의한 'ISR 종료 → ready task 실행' 구간은 Cortex-M 코드(43~93행)에서만 재고 그 코드도 그대로는 재지 못한다. ftrace는 schedule 호출을 보는 데 그치고 cyclictest는 다른 구간이다. 6~8 하단. |
| F | 4 | 240행 '정리 — Part 2 마무리'와 247행 'Part 3에서는 IPC와 Sync 내부 구현으로 넘어갑니다'는 틀렸다. seriesOrder 21은 공개된 part2-11-tracing-observability.md이고 Part 3 첫 글 part3-01-critical-section.md는 seriesOrder 22다. 다음 편 안내가 틀려 F ≤ 5. 251행 1-10, 252행 2-05 라벨은 맞다. 253행 'Performance Engineering Part 1'은 performance-engineering/00-preface.md('…시리즈 소개')로 가 라벨과 대상이 다르다. 65~67행은 다이어그램과 edge를 잇는 고유 안내다. |
| G | 1 | 본문에 1차 출처 링크가 없다. FreeRTOS·커널·rt-tests 버전과 대상 MCU, 96·213행 168 MHz 보드가 없다. 211~218행 '실제 측정 사례'는 누가 어디서 잰 값인지 없다. |

uncertainties:
- GPIO_SET·GPIO_CLR·GPIO_TOGGLE은 글에 정의가 없다. 오류 확인은 이름의 일반적 의미를 전제로 했다.
- 211~218행 측정 표와 245행 정리 수치는 출처가 없다. part5-07 113~118행 PREEMPT_RT worst case(100-300 µs)는 이 글 216·245행(30-100 µs)과 다르다(글 간 모순).
- 103행 `echo 'schedule:*' > set_ftrace_filter` 문법, 110행 'function entry/exit를 추적'이 맞는지 ftrace 문서 미확인.
- 125~126행 irqsoff 출력 형식 미확인.
- 146행 두 번째 thread의 I:1500·C:66667은 rt-tests 문서 미확인.
- 238행 '최고 priority' 권고와 132행 -p 80 예제가 맞지 않는다. 의도 불명.
- 49~50행 portYIELD_FROM_ISR 뒤 GPIO_CLR이 t4를 정확히 표시하는지(PendSV 실행 시점) 미확인.
- 213행 FreeRTOS 행 비고 'Bare-metal'은 RTOS 위 측정과 맞지 않는 표기로 보인다.

병합 대상(점수 구간 병합 검토, 판정은 오류 확인으로 우선 조치): 후보는 `part1-10-realtime-analysis.md`(163~181행 cyclictest·bare-metal 측정 절이 이 글 132~149·43~63행과 거의 같음)와 `part2-11-tracing-observability.md`(44~116행이 이 글 151~173행을 대신함)다. 'ISR 종료 → task 실행' scheduler latency 측정은 독립 검색 의도가 있어 오류 수정 뒤 다음 조치는 보강이다. 57행 TOGGLE을 SET/CLR 쌍이나 별도 핀으로 바꾸고, DWT 예 ISR에 give와 yield를 넣고, 1-10·2-11과 겹치는 설명을 줄이고, 211~218행 표는 1차 자료로 확인하거나 TBD로 두고, 247행 다음 편 안내를 part2-11로 고친다.

### `part2-11-tracing-observability.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다. 133~137행 'ITM이 자동으로 만들어 주는 이벤트도 있습니다'(PC sampling·Exception trace·Watchpoint trace)와 143행 'ITM은 *명시적 print*만 보내지만 ETM은 모든 branch를 자동으로 기록합니다'는 ITM이 내보내는 데이터에 대해 동시에 참일 수 없다. git log(0a9dd7bc, be973200, ac24bb76, 85a2d46f 등)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 33~40행 SW·HW trace 비교 표, 107~113행 Tracealyzer·SystemView 선택 표, 201~217행 'Task B가 5 ms 늦게 깨는' 인과 추적 시나리오, 225~227행 hook 안 RTOS API 재진입, 241~243행 두 trace 시계 정렬 함정은 도구 소개를 넘는 관점이다. 209~215행 trace는 가상의 예이고 188~197행 '실측' 표·184행 '2~3% 미만'·82행 'μs 단위'는 출처가 없다. 44~53·117~139행은 벤더 소개 수준이라 13 이상은 아니다. |
| B | 12 | 16~29행 문제 정의 → 31~42행 두 접근 → 44~156행 도구별 설명 → 158~184행 run-time stats → 186~199행 오버헤드 → 201~217행 시나리오 → 219~243행 함정 → 245~253행 정리로 기본 흐름은 완성됐다. 133~137행과 143행이 ITM 동작을 다르게 말하고 82·194·199행 수치 불확실이 열려 있어 B ≤ 13. 76행 통합 절차 누락 의심은 1차 자료 없이 감점하지 않았다(AP-C-31). |
| C | 7 | 55~74행 TraceRecorder 초기화, 84~101행 SystemView 초기화·Mark, 121~128행 ITM 송신, 162~182행 run-time stats 코드가 있다. 188행 '대표적인 실측 오버헤드(Cortex-M4F @ 168 MHz)'는 측정 도구·방법·출처가 없어 C ≤ 8. 176~181행 출력과 209~215행 trace는 예시이고 합격·실패 관찰 절차가 없다. TraceRecorder·SystemView·FreeRTOS 버전이 없다. |
| D | 9 | 비교한 글: part2-10(seriesOrder 20), part3-01(22), modern-recipes/part6-12-rtos-debugging.md, performance-engineering/part5-07-baremetal-profiling.md·part5-06-arm-ds-lauterbach.md, freertos-mastering/chapter14-trouble-shooting.md(draft). part2-10 151~171행이 이 글 44~115행을 짧게 반복. part6-12 118~152행이 158~184·78~103행과 겹침. part5-07 123~131행 ITM 송신 코드가 123~127행과 거의 같고 148~170·196~206행이 78~103·186~197행과 같은 질문에 답함. part5-06 45·75~81행이 141~156행과 겹침. freertos-mastering ch14 165~221행(draft). part3-01과는 겹치지 않음. 이 글이 가장 넓게 다루지만 네 시리즈에 반복돼 5~9 상단. |
| E | 7 | 제목 키워드 Tracealyzer(44~76행)·SystemView(78~115행)·ITM(117~139행)·ETM(141~156행)을 모두 절로 다룬다. description의 'queue·mutex 이벤트 인과 추적'은 201~217행 queue 시나리오가 답하지만 mutex는 24행 나열뿐이고, ETM 절(154행 수 GB/s)은 Cortex-M 범위와 수치가 섞여 9 이상은 아니다. |
| F | 5 | 255행 '다음 편은 2-12: 임베디드 시스템의 시간 동기화'인데 part2-12 파일이 없고 seriesOrder 22는 part3-01-critical-section.md다. 다음 편 안내가 틀려 F ≤ 5. 259~262행 관련 항목(part2-10, part2-05, perf part5-06, part5-07)은 대상 제목과 맞다. 전제 지식 안내가 없다. |
| G | 1 | 본문에 1차 출처 링크가 없다. TraceRecorder·SystemView·FreeRTOS 버전이 없고 188행 'Cortex-M4F @ 168 MHz'만 있는데 측정 출처가 없다. 119행 stimulus port 32개, 231행 Full-speed USB 12 Mbps도 ARMv7-M ARM·USB 규격 인용이 없다. |

uncertainties:
- 82행 'RTT 평균 오버헤드 μs 단위'와 194행 'SystemView RTT 이벤트당 100~200 ns'가 같은 지표인지 불명확하다. 같다면 내부 모순이다.
- 199행 'ITM이 SW trace보다 10~30배 가볍다'는 표(196행 5~10 ns 대 194~195행 100~300 ns)의 10~60배와 범위가 다르다.
- 184행 '2~3% 미만'과 193·252행 '<1%'가 다른 값을 제시한다(포함 관계라 모순은 아님).
- 37·193~197행 이벤트당 비용·CPU %는 출처가 없고 perf part5-07 136·203~204행(ITM ~100 ns, SystemView RTT ~0.5 us)과 다르다.
- 76행 'xTraceEnable() 이후 추가 코드 불필요'가 맞는지 Percepio 문서 미확인.
- 135~137행 PC sampling 등의 생성 주체가 DWT이고 ITM은 전송만 하는지 ARMv7-M ARM 미확인(133 대 143행 수정 때 함께 정해야 함).
- 154행 Cortex-M ETM '수 GB/s' 미확인(part5-06 45행은 Cortex-A 코어당 수 Gbps).
- 223행 snapshot buffer '수 MB', 231행 RTT '수십 Mbps' 미확인.
- 119행 ITM 탑재 범위(ARMv8-M 포함 여부) 미확인.

병합 대상(점수 구간 병합 검토, 판정은 오류 확인으로 우선 조치): 병합 대상 없음. RTOS trace 도구 선택을 가장 넓게 다루는 글이라 133 대 143행 ITM 서술을 바로잡고 255행 다음 편 안내를 part3-01로 고친 뒤 보강한다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)으로 묶었다.

- 본문 1차 출처·버전 부재(G 1, 10편 모두): part2-02 99·177행, part2-03 44~67·89행, part2-04 45·102·140·167행, part2-05 27행, part2-06 156행, part2-07 166·226~227·238~239행, part2-08 22~36·92~94·109~110·174행, part2-09 64~118·132~146·249행, part2-10 96·211~218행, part2-11 119·188·231행. FreeRTOS 커널 버전·port 경로, ARM ARM·RISC-V spec 절, 데이터시트가 본문 어디에도 없다. modern-recipes part6-11 65행처럼 V11.1.0 태그 링크로 고정하는 방식을 기준으로 삼을 수 있다.
- fact-check 커밋 부재(10편 모두): 이력이 42ebbcbb(stub) → a90a6bae(Part 2 본문 일괄) → 85a2d46f(번역투 수정·28편 일괄 공개) → 메타데이터 커밋뿐이다. 8편의 오류 확인이 모두 원문 내부 모순에서 나왔으므로 Part 2 전체가 `/fact-check-round` 대상이다.
- 다음 편·관련 항목 안내 오류(4편): part2-09 263행('Part 2의 마지막'), part2-10 240·247행('Part 2 마무리 … Part 3으로'), part2-11 255행(없는 '2-12'), part2-05 290행('1-06' 라벨 → part3-09). part2-10 253행은 'Performance Engineering Part 1' 라벨이 00-preface로 간다. part2-11을 나중에 끼워 넣으면서 앞뒤 안내를 고치지 않은 것으로 보이고, part3-11 304행 '3-12'도 같은 패턴이다.
- 출처 없는 cycle·µs·전류 비용 표(6편): part2-04 138~145행, part2-06 145~149행, part2-07 221~228행, part2-08 75~80행, part2-10 211~218행, part2-11 188~197행(part2-09 125~128·230~232행도 유사). C ≤ 8 상한이 반복된다.
- 글 사이 수치·동작 불일치(5편 이상): context 크기·FPU 저장 범위(part2-04 69·151·165행 대 part2-05 218행), context switch cycle(part2-04 145행 ~70 대 perf part3-05 178행 ~100), RISC-V latency 방향(part2-04 181행 대 part2-07 227행), SMP 도입 버전(part2-03 89행 대 part5-01 340행), generic 탐색 방향(part2-01 58~66행 대 part2-03 47~50행), 168 MHz 코어(part2-06 145행 M3 대 part2-04 136행 M4), tickless 동작(part2-08 152~165행 대 part2-09 구현 절), RISC-V 프레임 오프셋(part2-04 x1@0, part5-04 x1@4, part2-07 x31@124).
- 같은 코드·설명의 시리즈 안팎 반복: delayed list(part2-01 230~243행, part2-02 56~89행, part4-09 104~112행), next-task 선택(part2-01, part2-03 31~98행, part5-01 149~168행), PendSV 핸들러(part2-05 81~111행, part5-01 174~201행, part5-04 147~176행), RISC-V trap 저장(part2-04 173~179행, part2-07 82~113행, part5-04 186~203행), tickless(part1-04 132~140행, part2-08 148~170행, part2-09), cyclictest(part1-10 163~169행, part2-10 132~149행, perf part1-05 118~120행), SystemView·Tracealyzer(part2-10 151~171행, part2-11 44~115행, recipes part6-12, perf part5-07). 정본을 정하고 나머지는 링크로 줄이는 구조 결정이 필요하다.
- 그대로는 동작하지 않는 의사 코드(5편): part2-02(81행 `swap()`, return 없는 161~170행), part2-05(242~251행 M0), part2-07(90·108·185행 `...`, 86~110행 프레임 산술), part2-09(105·111행 placeholder), part2-10(`woken` 미선언, give 없는 DWT ISR). 실제 FreeRTOS 코드처럼 보이게 쓰여 있어 AP-C-35 대상이다.
- 공통 H2 뼈대: '한 줄 요약 → … → 자주 하는 실수 → 정리 → 관련 항목'이 10편 모두에 있다(part2-02 13·183·201·211행, part2-03 13·128·136·145행, part2-04 12·193·207·218행, part2-06 13·165·179·188행, part2-07 13·242·260·270행, part2-08 13·197·219·229행 등). 각 글에 고유 본문이 있어 글 단위 P0는 아니지만 9절 scaled content 수치 기록 대상이다.
- outline 변환 흔적(본문 없는 굵은 단계 제목): part2-07 60~75행, part2-09 30~56행, freertos-mastering ch11 50~65행.

## 다음 조치

- 우선 조치(8편, 원문 내부 모순): part2-02 175~181행 메모리 표와 130·141·206행, part2-04 69·210행 대 151·155·197행 context 크기, part2-05 242~253행 M0 코드, part2-06 127·183행(147·149행) 비용, part2-07 83~110행 ISR 프레임, part2-09 19행 대 23~25행·259행 대 127~128행, part2-10 57행 TOGGLE과 DWT ISR, part2-11 133~137행 대 143행. 이 루프에서는 원문을 고치지 않았다.
- 다음 편 안내 정리: part2-09 263행, part2-10 247·253행, part2-11 255행, part2-05 290행을 실제 seriesOrder와 대상 제목에 맞춘다.
- part2-03(제외 검토, 38점): part2-01·part5-01로 병합할지, 진입 경로 표만 살린 차별화 보강을 할지 사용자에게 올린다.
- part2-08(병합 검토): 중복 절은 part2-09·part2-05 링크로 줄이고 아키텍처별 tick source·drift 절에 1차 출처를 붙이는 보강이 다음 조치다.
- 시리즈 단위: Practical RTOS Internals Part 2 `/fact-check-round`(FreeRTOS-Kernel 버전 고정, ARM ARM·RISC-V spec 대조)로 글 간 수치 불일치를 한 번에 정하고, 반복 코드의 정본 위치를 정한다. upstream clone이 없으면 인용 심볼 검사는 SKIPPED이므로 clone을 먼저 받는다.
- 렌더링·`audit:reading`·`audit:anchors`는 다음 루프나 릴리스 검사에서 확인한다.
