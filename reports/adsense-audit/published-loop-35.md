# 공개 글 AdSense 평가 — 루프 35

> 대상: 공개 글 10편 (Practical RTOS Internals, `seriesOrder` 2~11)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 서른다섯 번째 루프다. 대상은 `src/content/blog/embedded/rtos/practical-internals/`의 part1-02~part1-10과 part2-01, 곧 Practical RTOS Internals 시리즈 `seriesOrder` 2부터 11까지다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part1-02-task-thread.md` | 9 | 10 | 5 | 10 | 5 | 6 | 1 | **46** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part1-03-scheduling-algorithms.md` | 10 | 10 | 6 | 9 | 7 | 7 | 2 | **51** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part1-04-preemption.md` | 9 | 9 | 5 | 7 | 6 | 6 | 1 | **43** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part1-05-interrupts-rtos.md` | 10 | 10 | 5 | 7 | 7 | 6 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part1-06-sync-basics.md` | 9 | 10 | 5 | 8 | 5 | 6 | 1 | **44** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part1-07-semaphore.md` | 9 | 9 | 4 | 7 | 7 | 6 | 1 | **43** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part1-08-mutex.md` | 9 | 11 | 5 | 6 | 7 | 7 | 1 | **46** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part1-09-queues.md` | 9 | 10 | 5 | 7 | 6 | 6 | 1 | **44** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part1-10-realtime-analysis.md` | 9 | 11 | 6 | 3 | 6 | 6 | 2 | **43** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part2-01-ready-list.md` | 12 | 11 | 5 | 8 | 7 | 5 | 1 | **49** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |

평균 45.5점(10편, 합 455점), 범위 43~51점이다. 판정은 우선 조치 4편, 병합 검토 6편이고 유지·검증 대기·보강·제외 검토는 없다. 점수 구간으로는 10편 모두 병합 검토(40~59)다. 오류 확인 4건(part1-05·part1-07·part1-10·part2-01)은 모두 원문 내부 모순·산술 불일치이고, 평가 중 1차 자료를 연 것은 없다. 10편 모두 git log에 1차 자료 대조 커밋이 없어 '검증됨'은 0편이다. 병합 검토 6편은 모두 '병합 대상 없음' 또는 후보를 적되 다음 조치를 보강으로 두었다(Part 1 개념 장으로서 독립 검색 의도가 있음). P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`, 다이어그램 파일 존재까지이고, 렌더링·광고 배치·외부 유사도는 보지 않았다. part1-10이 `performance-engineering/part1-05-realtime.md`와 같은 수치로 겹치는 것은 같은 사이트 안 중복이라 글 단위 P0가 아니라 D 감점과 시리즈 단위 점검으로 넘겼다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `part1-02-task-thread.md` | 46 | 46 | 0 | 없음 |
| `part1-03-scheduling-algorithms.md` | 51 | 51 | 0 | 없음 |
| `part1-04-preemption.md` | 43 | 43 | 0 | 없음 |
| `part1-05-interrupts-rtos.md` | 46 | 46 | 0 | 없음 |
| `part1-06-sync-basics.md` | 44 | 44 | 0 | 없음 |
| `part1-07-semaphore.md` | 43 | 43 | 0 | 없음 |
| `part1-08-mutex.md` | 46 | 46 | 0 | 없음 |
| `part1-09-queues.md` | 44 | 44 | 0 | 없음 |
| `part1-10-realtime-analysis.md` | 43 | 43 | 0 | 없음 |
| `part2-01-ready-list.md` | 50 | 49 | -1 | 없음 |

- 추가한 오류 확인(part1-10): 평가자는 64행 '측정 max를 WCET·보장 한계로 적음'만 오류 확인으로 올리고 두 번째 건은 uncertainties에 두었다. 24~26행 그림은 'wake latency (수 µs)'를 ISR start → Task wake 한 구간으로 표시하는데 33행 표는 'Wake latency | 모든 합'(31~32행 ISR latency + Scheduler latency)으로 정의한다. 같은 용어의 두 정의가 동시에 참일 수 없으므로 AP-C-24에 따라 오류 확인으로 올렸다. 판정(우선 조치)과 점수는 그대로다.
- 기각한 오류 확인은 없다. part1-03 248행 'EDF는 임베디드에서 채택되지 않습니다'와 143·145행의 충돌은 완곡한 본문과 단정적 정리의 충돌이라 A·C 감점과 시리즈 공통 문제로만 처리했다. part1-06 113행(≤10 µs → IRQ disable)과 190행(10 µs → mutex), part1-02 86행(다른 task가 Running task를 suspend)과 73행도 조건·전제가 달라 uncertainties에 두었다.
- part2-01 D 9→8, 합계 50→49: CLZ·generic 선택 설명이 part2-03 42~67행, part5-01 92~104행과 세 번 반복되고, 이 글 고유 부분인 uC/OS 절에 오류가 있어 5~9 구간 상단을 주지 않았다. 판정(우선 조치)은 그대로다.
- part1-05·part1-06·part1-10 B 근거: 평가자가 1차 자료 위치 없이 '빠진 한계'로 든 사유(part1-05 NAPI 157~158행 신호 유실·192행 assert, part1-06 'BASEPRI 위 IRQ', part1-10 safety margin)는 AP-C-31에 따라 감점 근거에서 빼고 uncertainties로 옮겼다. 글 내부 근거(part1-05 78↔171행 단절·136행 표 불일치, part1-06 63행 vs 210·215행, part1-10 RTA 예 부재)와 B ≤ 13 상한으로 같은 점수를 유지했다.
- 줄 번호 보정(점수 영향 없음): part1-02 D(31~46행), part1-03 D(part4-07 근거를 5·20·108행으로 좁힘)·series_issues(part1-04 '99%' 위치 70→74행), part1-04 D(modern-recipes 함정 대응 163~165·159~161행), part1-05 D(1-04 101~119행, perf-eng 3-05 232~233행 추가, 줄 대응 없는 modern-recipes/part4-05 제외), part1-06 uncertainties(part3-01 131→134행)·D(3-01 19~63·96~122행), part1-07 D(1-08 표 50~58행, 6-04 30~75·77·122~150·26행), part1-08 D(modern-recipes part6-05 22~28·165·232~238행, perf-eng part4-05 161행), part1-09 D(ESP32 비교 경로 `riscv/esp32-c3-mastering/chapter10-freertos.md`, part3-07 82~97행, part3-11 28~101행, recipes 226~233행), part2-01 D(part2-02 140~146행, part1-02 32~34행, part5-01 92~104행).
- 부풀림 판정은 10편 모두 없음이다. 최종 점수는 1차보다 같거나 낮다.

## 글별 근거

### `part1-02-task-thread.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. git log -- 파일은 0a9dd7bc(slug 고정), be973200(topic 메타), ac24bb76(제목 일괄 변경), 85a2d46f(번역투 수정·공개)와 그 이전 본문 작성·다이어그램 커밋뿐이다. FreeRTOS tasks.c·공식 문서 같은 1차 자료와 대조했다는 커밋이 없다. 원문 안에서 동시에 참일 수 없는 두 진술도 찾지 못했다(62행 '256 × sizeof(StackType_t) = 1 KB (32-bit)'와 183행 '256 word (1 KB)', 103행 '0 = lowest'와 153행 idle priority 0, 65행 '80%'와 203행 '1위 원인'이 서로 맞음).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 구성 요소 표(19~23행), 5상태 표(71~77행), static vs dynamic 표(157~163행), 용어 표(171~175행)는 FreeRTOS 입문 자료의 표준 목록이다. 이 글만의 해석은 46행 'pxTopOfStack이 context switch의 모든 것'과 91행 'Running → Blocked는 자발적, Running → Ready는 강제적' 정도다. 65행 '디버깅의 80%', 50행 '보통 256-2048 byte'는 출처 없는 수치이고, 165행 'Safety-critical은 static을 선호'는 선택 기준 없이 일반론으로 끝난다. |
| B | 10 | 구성(17~25행) → TCB(27~46행) → stack(48~65행) → 상태·전이(67~91행) → 생성(93~117행) → task 함수(119~137행) → idle task(139~153행) → static/dynamic(155~165행) → 실수(179~195행) → 정리(197~203행)로 기본 흐름은 완성됐다. 77행 'TCB만 살아있고 idle task가 정리'는 자기 삭제와 다른 task 삭제를 구분하지 않고, 113행 'heap_X 또는 static'은 heap 선택 기준이 없다. 142~149행 idle task 코드는 `xExpectedIdleTime`이 정의되지 않은 의사 코드인데 표시가 없다. 201행 정리는 전이를 자발적/강제적 둘로만 요약해 86·88·89행 suspend·resume·delete를 빠뜨린다. 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 5 | xTaskCreate 호출(98~109행)과 task 함수 패턴(121~134행)은 있으나 대상 MCU·FreeRTOS 버전·예상 결과가 없다. 183행은 `uxTaskGetStackHighWaterMark()`로 측정하라고만 하고 절차·기대 출력이 없다. 65·50·183행 수치는 출처·환경이 없어 C ≤ 8. 검증 절차가 사실상 없어 4~7 구간. |
| D | 10 | 같은 시리즈: TCB 발췌(31~46행) ↔ `part5-01-freertos-source.md` 59~83행(같은 필드, #if 조건까지 있어 더 깊음), static vs dynamic(155~165행) ↔ `part4-04-static-allocation.md` 22~55행, stack overflow(65·181~183행) ↔ `part4-06-stack-overflow.md` 40·82~96행, 46행 ↔ `part2-04-context-switch.md`. 인접 `part1-01-why-rtos.md`·`part1-03-scheduling-algorithms.md`는 역할이 다르다. 다른 시리즈: `modern-recipes/part6-02-task-design.md` 12~44행은 task 분할 패턴이라 질문이 다르고, `tools/debugging/embedded/chapter07-rtos-troubleshooting.md` 268행 이후 stack overflow 절이 65·183행과 일부 겹친다. 5상태 전이 표(81~89행)는 시리즈 안에서 이 글만 다룬다. |
| E | 5 | 제목(2행)이 'TCB·상태 머신·생명 주기 분석'을 약속하지만 본문은 표와 짧은 코드 중심의 개념 소개다('분석' 약속 + 개념 소개 = 3~5). 키워드 TCB(27~46행)·상태 머신(67~91행)·생명 주기(112~117·77·89·133행)와 description(5행)은 모두 다뤄 구간 상단. |
| F | 6 | 205행 다음 편 안내는 seriesOrder 3 `part1-03-scheduling-algorithms.md`와 맞다. 209~211행 관련 항목(1-01, 1-03, 2-04)은 대상 파일 제목과 라벨이 맞다. 전제 지식 안내 같은 글 고유 구조가 없어 7 이상은 주지 않았다. audit:reading·폰 폭 확인은 하지 않았다. |
| G | 1 | 본문 출처 링크가 없다. 29행 'FreeRTOS의 TCB_t 발췌'에 버전·tasks.c 위치가 없고, 163행 MISRA·DO-178C도 조항 인용이 없다. |

uncertainties:
- 86행 'Running → Suspended: 다른 task가 vTaskSuspend()'는 73행 '한 코어당 정확히 1개'와 함께 보면 단일 코어에서는 자기 호출이어야 하는지, SMP 전제인지 FreeRTOS 문서로 확인하지 않았다.
- 77행 Deleted 상태에서 다른 task가 삭제할 때 즉시 해제되는지, 자기 삭제일 때만 idle이 정리하는지 tasks.c로 미확인.
- 153행 idle task 실행 조건과 priority 0 task 간 time slice(configIDLE_SHOULD_YIELD)의 관계 미확인.
- 137행 'return 하면 RTOS가 충돌'과 prvTaskExitError 동작, 117행 스케줄러 시작 전 생성 시 preempt 동작 미확인.
- 142~149행 prvIdleTask 코드가 실제 tasks.c와 다른 의사 코드인지, 32~43행 TCB 필드가 어느 버전 기준인지 미확인.
- 129행 주석 'process(); // Ready → Running'은 호출이 전이를 일으키는 것처럼 읽힌다(표현 점검).
- 65행 '80%', 50행 '256-2048 byte', 191행 '데드락이나 크래시'는 출처 없는 주장.

병합 대상: 병합 대상 없음. 다음 조치: 보강. TCB·stack overflow·static 할당은 part5-01·part4-06·part4-04가 더 깊게 다루지만 'task 5상태와 전이'라는 입문 질문은 시리즈 안에서 이 글만 답한다. 겹치는 절은 해당 글 링크로 줄이고, 전이 표(81~89행)와 idle task 설명(142~153행)을 FreeRTOS 버전을 밝힌 tasks.c와 대조해 보강한다.

### `part1-03-scheduling-algorithms.md` — 51점, 병합 검토

confidence: 중간

factcheck: 미검증. git log -- 파일은 0a9dd7bc(slug 고정), 28524a9d(언어 태그), be973200(topic), ac24bb76(제목 변경)과 본문·다이어그램·번역투 커밋뿐이고, Liu & Layland 논문·FreeRTOS 소스·Zephyr 문서와 대조한 커밋이 없다. 248행 'EDF는 … 임베디드에서는 채택되지 않습니다'와 143행 '거의 채택되지 않습니다'·145행 '자동차 안전 시스템에서 일부 채택합니다'는 완곡한 본문과 단정적 정리의 충돌이라 오류 확인이 아니라 A·C 감점으로 처리했다. 산술(108~113행 합 0.75, 3×(2^(1/3)−1)≈0.78, 102행 ln2≈0.693)은 맞다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 19~24행 비교 표, 98~113행 utilization bound와 n=3 예, 134~145행 EDF 장단점은 교과서 표준 구성이다. 이 글만의 것은 FreeRTOS 설정과의 대응(45행 configUSE_TIME_SLICING, 170행 configUSE_PREEMPTION)과 주기별 priority 할당 코드(211~221행) 정도다. 15·22·223행 '95%'·'99%'는 출처 없는 단정이고 115행 'RTA로 정확히 확인할 수 있습니다'는 방법 없이 끝난다. 248행 정리가 143·145행 본문과 어긋난다. |
| B | 10 | RR(28행)·Fixed-Priority(53행)·RMS(94행)·EDF(117행)·cooperative(147행)·SMP(182행)·함정(225행)·정리(243행)까지 흐름은 완성됐다. 96~102행 bound에 전제(독립 task, deadline = 주기, preemptive, 공유 자원 없음)가 없어 102행 'CPU 69%까지 사용해도 안전'이 무조건 참처럼 읽히고, 136행 EDF 100%도 전제가 없다. 115행 RTA는 식·절차가 없다. 77행은 compute_pid 실행 시간이 없어 판단할 수 없다. B ≤ 13. |
| C | 6 | xTaskCreate 조각(47~51·211~221행)과 bound 산술(106~113행)은 있으나 실행 환경·관찰·검증 절차가 없다. 15·22·223행 백분율, 237행 '보통 5-10단계', 241행 '80%'는 출처·환경 없는 수치라 C ≤ 8. 92행 RMS timeline 그림 외에 trace·측정 방법이 없다. |
| D | 9 | 같은 시리즈: 98~113행 ↔ `part1-10-realtime-analysis.md` 97~116행(같은 공식, n=3 0.78), 147~170·77행 ↔ `part1-04-preemption.md` 33~55·74~86행, 172~180행 Mars Pathfinder(5/3/1) ↔ `part1-08-mutex.md` 98~110행, 182~205행 ↔ `part2-03-scheduler-algorithm.md` 87~89행·`part4-07-smp-rtos.md` 5·20·108행. 인접 `part1-02-task-thread.md`는 겹침 없음. 다른 시리즈: `performance-engineering/part1-05-realtime.md` 157~168행이 같은 공식·RTA, `modern-recipes/part6-02-task-design.md` 32·224행은 RM 한 줄. 비교 입문 역할은 남지만 절 절반이 반복된다. |
| E | 7 | 제목의 RR·Priority·EDF·RMS를 19~24행 표와 28·53·94·117행 절에서 모두 다루고 description 결론이 209행과 같다. EDF·RMS 선택 기준이 141~145행 단점 나열뿐이고 본문이 FreeRTOS 위주라 9 이상은 아니다. |
| F | 7 | 251행 다음 편은 seriesOrder 4 `part1-04-preemption.md`와 맞다. 255~257행 관련 항목(1-02, 1-04, 1-10)은 대상 제목과 라벨이 맞다. 180행 '3-04, 3-05 챕터'도 `part3-04-priority-inversion.md`·`part3-05-priority-inheritance.md`와 맞지만 링크가 없다. 전제 지식 안내가 없고 audit:reading을 하지 않아 9 이상은 주지 않았다. |
| G | 2 | 81행 'Liu & Layland (1973)'는 이름만 있고 제목·링크가 없다. 45·170행 설정 이름에 커널 버전이 없고 205행 'FreeRTOS SMP (10.4+)'만 버전이 있으나 출처가 없다. 143·145행 OS 언급도 출처가 없다. |

uncertainties:
- 205행 'FreeRTOS SMP (10.4+)는 partitioned + task affinity'는 part2-03 89행(10.5 이상), part4-07 5행(FreeRTOS 11 SMP 단일 ready list)과 다르다. tasks.c로 미확인.
- 205행 'Zephyr SMP는 global with affinity hint'와 part4-07 108행 'per-CPU runqueue + global priority scheduler'가 다르다(1차 자료 미확인).
- 143행 'FreeRTOS, Zephyr, VxWorks 모두 RMS 기반': Zephyr CONFIG_SCHED_DEADLINE 존재와 RMS가 priority 할당 규칙이라는 점을 문서로 확인하지 않았다.
- 145행 'MIRTOS' 실존 여부와 ERIKA Enterprise '학술 OS' 분류 미확인.
- 248행과 143·145행의 EDF 채택 서술 충돌(A·C 감점으로 처리).
- 102행 69%와 136행 EDF 100%의 성립 전제가 본문에 없다.
- 45행 'configUSE_TIME_SLICING = 1이 기본값'을 FreeRTOS.h로 미확인.
- 64행 vTaskDelay(1)은 tick 1 ms 전제이고 상대 지연이라 주기가 늘어난다(API 의미 미확인).
- 174~178행 Mars Pathfinder priority 5/3/1이 실제 task 구성인지 NASA/JPL 자료로 미확인.
- 15·22·223·237·241행 수치는 출처 없음.

병합 대상: 후보는 `part1-10-realtime-analysis.md` 97~116행(RMS bound·n=3 예가 같음). 'RR·Priority·EDF·RMS 비교'라는 독립 검색 의도가 있어 병합하지 않고 다음 조치는 보강이다. RMS 계산은 1-10 링크로, cooperative·Mars Pathfinder·SMP 절은 1-04·1-08·4-07 링크로 줄이고, EDF vs RMS 선택 기준과 bound 전제를 1차 자료(Liu & Layland 1973, FreeRTOS 설정 문서) 인용과 함께 보강한다.

### `part1-04-preemption.md` — 43점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), be973200(topics), ac24bb76(제목 변경), fec6fe94(text 코드블록 정리), 85a2d46f(번역투 정리·발행) 등이고 FreeRTOS 소스·문서와 대조한 기록이 없다. 원문 안 기술 모순은 찾지 못했다. 99행 BASEPRI와 157행 '모든 ISR이 막힘'의 충돌은 BASEPRI 의미를 알아야 판단되므로 uncertainties로 둔다. 로컬에 FreeRTOS-Kernel clone이 없어 1차 자료로 확인하지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 비교 표(62~70행), tick rate 표(124~128행), critical section(88~99행)·tickless(132~141행)·SMP(143~147행)는 입문서의 흔한 목록이다. 이 글만의 것은 1 ms PID + 5 ms 작업 시나리오(74~86행)와 타임라인 그림(58행)뿐이고, 79행 '6-7 ms 안에 끝납니다'는 PID 실행 시간 전제가 없다. 15·70·171행 '99% 임베디드 RTOS' 등은 근거 없는 일반론이고 86행 선택 기준은 한 줄이다. |
| B | 9 | 개념(17~54행) → 비교(56~70행) → 시나리오(72~86행) → critical section·ISR·tick·tickless·SMP → 함정(149~165행) → 정리(167~173행)로 이어지나 절 대부분이 코드 한 조각과 한두 문장이다. tickless(132~141행)는 두 문장, SMP(143~147행)는 세 문장이다. description의 'latency와 predictability의 trade-off'는 65·68행 표 칸과 시나리오 하나로 끝난다. 99·157·130·54행 불확실이 열려 있어 B ≤ 13, 5~9 구간. |
| C | 5 | 코드 조각(37~44·92~97·109~120·136~139행)은 있지만 MCU·버전·포트가 없고 실행 결과·관찰 방법이 없다. 79행 '6-7 ms', 68행 'µs 단위', 153행 '수 µs', 157행 '수 ms'는 출처·환경 없는 수치라 C ≤ 8. 58행 그림은 개념도다. |
| D | 7 | 같은 시리즈: `part1-03-scheduling-algorithms.md` 147~170행이 이 글 33~54행과 같은 taskYIELD 루프(151~158행 vs 37~44행)·configUSE_PREEMPTION=0 설명(170행 vs 50~54행)·장단점(160~168행 vs 66~69행)을 담는다. `part1-05-interrupts-rtos.md` 17~37행 ↔ 101~120행. `part2-08-tick-timer.md` 62~67·69행 ↔ 124~128·130행(행·문구까지 거의 같음). 다른 시리즈 `modern-recipes/part6-03-scheduler-internals.md` 35~36·56~69·95~104·155~161·173~181행 ↔ 48~54·132~141·163~165·159~161행. 고유한 것은 PID 시나리오(72~86행)뿐. |
| E | 6 | 제목과 17~86행은 같은 질문을 향하고 description의 'tick과 IRQ에서 강제 전환'(21~31행), 'yield 명시'(33~46행)도 답한다. trade-off는 시나리오 하나라 약하고 predictability는 따로 설명하지 않는다. tick rate·tickless·SMP(122~147행)는 곁가지다. |
| F | 6 | 175행 다음 편은 seriesOrder 5 `part1-05-interrupts-rtos.md`와 맞다. 179~181행 관련 항목(1-03, 1-05, 2-08 → seriesOrder 3·5·18)은 라벨이 맞다. 전제 지식 안내가 없고 critical section·tickless·SMP 심화 글(part3-01, part2-09, part4-07) 링크가 없다. audit:reading은 돌리지 않았다. |
| G | 1 | 본문 출처 링크가 없다. FreeRTOS 매크로(51·99·130·137~138행)에 커널 버전·포트가 없고 130행 'configTICK_RATE_HZ = 1000이 기본값'도 출처가 없다. |

uncertainties:
- 99행 'taskENTER_CRITICAL()은 BASEPRI와 scheduler suspend를 합친 것'을 port.c로 확인하지 않았다(Cortex-M 포트는 BASEPRI + nesting count, vTaskSuspendAll과 별개라는 기억).
- 157행 '모든 ISR과 task가 막힙니다'는 99행대로라면 configMAX_SYSCALL_INTERRUPT_PRIORITY보다 높은 ISR은 막히지 않는다. 포트 소스 미확인.
- 130행 'configTICK_RATE_HZ = 1000이 기본값'은 데모 config 값이라는 기억, FreeRTOS.h 미확인(로컬 clone 없음).
- 54행 'Tick 인터럽트는 time keeping만'과 configUSE_PREEMPTION=0에서 portYIELD_FROM_ISR·blocking API 전환 여부, 64행 표 'yield만'과 46행 implicit yield 표현 차이 미확인.
- 79행 '6-7 ms'는 PID 실행 시간 전제가 없다.
- 145행 '다른 코어 task에 직접 영향 없음'과 147행 IPI 예의 관계 미확인.
- 70행 '99%', 153행 '수 µs'는 출처 없음.

병합 대상: 후보는 `part1-03-scheduling-algorithms.md`(147~170행 cooperative 절이 이 글 33~54행과 같음), tick rate 표는 `part2-08-tick-timer.md` 62~69행과 중복, 다른 시리즈 `modern-recipes/part6-03-scheduler-internals.md`도 같은 질문을 답한다. 다음 조치: 보강. 'preemptive vs cooperative 선택'은 독립 검색 의도가 있으므로 tick rate 표·tickless 절은 part2-08/part2-09 링크로 줄이고, PID 시나리오(72~86행)를 실행 시간 전제와 응답 시간 계산이 있는 비교로 키운다. part1-03 cooperative 절은 이 글로 링크한다.

### `part1-05-interrupts-rtos.md` — 46점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 불일치다. 130~136행 ISR latency 표의 구간 값은 CPU 인지 '< 1 cycle'(132행), Pipeline flush '2-12 cycle'(133행), context push '12 cycle (Cortex-M)'(134행), Vector table read + branch '4-6 cycle'(135행)이라 하한만 더해도 18 cycle, 상한은 30 cycle을 넘는데 136행 Total은 '~12-25 cycle'이다. 134행 stacking 하나가 이미 12 cycle이므로 Total 하한 12와 133·135행 하한(2, 4)은 동시에 참일 수 없다. 어느 쪽이 틀렸는지는 Cortex-M TRM으로 정해야 한다. git log(0a9dd7bc, be973200, ac24bb76, 85a2d46f 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | ISR context 규칙(19~24행), top/bottom-half(39~78행), FromISR 대응표(82~89행), Cortex-M priority(103~124행)는 표준 목록이다. 이 글만의 것은 ISR·task 통신 수단 비교표(167~174행)와 Linux NAPI를 ISR storm 대책으로 옮긴 예(144~163행)인데, 비교표는 출처·환경이 없고 169행 'Volatile flag 처리량 수십 µs'는 의미가 불분명하다. 196행 '데이터시트를 확인해야 합니다'는 완곡 표현이다. |
| B | 10 | 개념(17~37행) → 패턴(39~78행) → API(80~101행) → priority(103~124행) → latency(126~138행) → storm(140~163행) → 비교(165~186행) → 실수(188~204행) → 정리(206~212행)로 흐름은 끝까지 간다. 78행 '1바이트씩 큐에 넣는' UART 예의 처리량 한계를 171행 ring buffer와 연결하지 않고, 136행 Total이 구간 합과 맞지 않는 표를 그대로 결론 근거로 쓴다. B ≤ 13. |
| C | 5 | 코드 조각은 있으나 MCU·FreeRTOS 버전·포트가 없다. 30행 `woken`·`sem`은 선언이 없고 63행 `USART1->RDR`은 특정 계열 레지스터다. 130~136행 cycle 수, 138행 '6-12 cycle 절약', 200행 '50 µs 이상'은 출처·환경 없는 수치라 C ≤ 8. DWT 측정 같은 검증 절차가 없다. |
| D | 7 | 같은 시리즈: 19~24·93~100행 ↔ `part1-04-preemption.md` 101~119행(같은 규칙·TIM1 FromISR 코드), 57~78행 ↔ `part3-09-isr-safe-api.md` 99~125행, 103~118행 ↔ 3-09 161~173행, 202~204행 ↔ 3-09 194~213행. 다른 시리즈: 57~78행 ↔ `modern-recipes/part6-09-isr-api.md` 103~135행, 126~138·140~163행 ↔ `performance-engineering/part3-05-interrupt-latency.md` 17~36·232~233·156행 이하. 인접 `part1-06-sync-basics.md`는 겹침이 적다. |
| E | 7 | 제목의 ISR Context(17~37행)·Deferred Processing(39~78행)·FromISR API(80~101행)와 description이 모두 본문에 있다. 제목은 일반 'RTOS'인데 API·설정(82~116행)은 FreeRTOS·Cortex-M 전용이라 E ≤ 8, 대상 독자 표기가 없어 7. |
| F | 6 | 214행 다음 편은 seriesOrder 6 `part1-06-sync-basics.md`와 맞다. 218~220행 관련 항목(1-04, 1-06, 3-09 → seriesOrder 4·6·30)은 라벨·주제가 맞다. 전제 지식 안내가 없고 audit:reading·폰 폭 렌더는 보지 않았다. |
| G | 1 | 본문 출처 링크가 없다. FreeRTOS 버전, Cortex-M 코어, Armv7-M ARM·TRM 인용이 없고 136행 '@ 168 MHz'만 클록을 밝힌다. 196행 PowerPC·MIPS 주장에도 출처가 없다. |

uncertainties:
- 130~136행: Cortex-M3/M4는 stacking과 vector fetch가 병렬이라 entry가 12 cycle로 알려져 있어(기억, 미확인) 틀린 쪽은 Total이 아니라 구간 분해일 수 있다.
- 138행 'tail-chaining 6-12 cycle 절약' vs `performance-engineering/part3-05-interrupt-latency.md` 233행 '6 cycle'(다른 글과의 불일치).
- 21행 'ISR은 현재 task의 stack을 사용': Cortex-M 포트는 task PSP, ISR MSP라는 기억, port.c 미확인.
- 22행 'scheduler가 비활성화됩니다'의 정확한 의미(PendSV 최저 priority) 미확인.
- 35행 printf 내부 mutex block은 libc 구현에 따라 다름.
- 109~110행 configMAX_SYSCALL 5<<4 예와 part3-09 167행 191(0xBF) 예가 다르다(둘 다 유효할 수 있음).
- 192행 'xQueueSend()를 ISR에서 부르면 crash나 deadlock'과 configASSERT 동작 미확인.
- 152~159행 NAPI 예의 IRQ 재활성화와 대기 사이 신호 유실 여부는 wait_for_signal 구현에 달림(출처 없음).
- 196행 'PowerPC, MIPS는 반대', 167~174행 비교표 수치는 출처 없음.
- 204행 '32-bit read와 write는 atomic'은 정렬 조건이 없다(3-09 213행은 적음). Armv7-M ARM 미확인.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 후보는 `part1-04-preemption.md` 101~119행과 `part3-09-isr-safe-api.md`(deferred·priority·atomic 절)다. Part 1에서 'RTOS에서 ISR을 어떻게 다루나'라는 독립 검색 의도가 있어 다음 조치는 보강이다. 130~136행 latency 표를 Cortex-M TRM으로 고쳐 구간 합과 Total을 맞추고, 1-04·3-09와 겹치는 규칙·코드는 링크로 줄인다.

### `part1-06-sync-basics.md` — 44점, 병합 검토

confidence: 중간

factcheck: 미검증. git log -- 파일은 42ebbcbb(stub 생성), f5e1d8d3(stub→본문), 845231cf(다이어그램 일괄), 85a2d46f(번역투 수정·28편 공개), ac24bb76(제목 변경), be973200(topic 메타), 0a9dd7bc(slug 고정)다. FreeRTOS 소스·ARM ARM·C11 표준과 대조한 커밋이 없다. 원문 안에서 동시에 참일 수 없는 두 기술 진술은 찾지 못했다(55·113·193·190행 µs 기준 어긋남, 63행과 210·215행 taskENTER_CRITICAL 범위 어긋남은 권장값·표현 수준이라 uncertainties).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | counter++ race(19~47행), IRQ disable·spinlock·mutex(53~107행), atomic·LDREX/STREX(118~140행), memory barrier(142~164행), false sharing(166~182행), volatile≠atomic(195~204행)은 동시성 입문서의 표준 목록이다. 이 글만의 것은 선택 기준 표(111~116행)와 길이 표(186~191행)인데 둘 다 출처·환경이 없다. 15행 '간헐 버그의 1위'는 출처 없는 단정이고 55·225행 '짧게 유지해야 합니다'는 일반론이다. |
| B | 10 | race(17~47행) → 3도구(49~107행) → 선택 기준(109~116행) → atomic → memory ordering → false sharing → 길이 권장(184~193행) → volatile → API 표(206~215행) → 실수·정리(217~243행)로 완성됐다. 각 절이 코드 한 조각과 불릿 몇 줄이고, 116행 'Lock-free 가능'의 기준이 없으며 113행(≤10 µs)과 114행(>100 µs) 사이가 비어 있다. 63행은 taskENTER_CRITICAL을 __disable_irq의 대안으로 두는데 210·215행은 BASEPRI와 '완전 mask'를 구분해 범위를 판단할 수 없다. B ≤ 13. |
| C | 5 | 코드 조각(19~30·57~66·96~100·122~138·146~162행)은 있으나 코어·버전·빌드 환경과 실행 결과가 없다. 186~191행 50 ns·1 µs·10 µs, 193행 '최대 50 µs'는 출처·환경 없는 수치라 C ≤ 8. race 재현이나 길이 측정 절차가 없다. |
| D | 8 | 인접 `part1-05-interrupts-rtos.md`·`part1-07-semaphore.md`는 역할이 다르다. 같은 시리즈 `part3-01-critical-section.md`와 겹침이 크다: 53~66 ↔ 19~63행, 75~90 ↔ 96~122행, 184~193 ↔ 124~137행, 142~164 ↔ 195~210행, 210·213 ↔ 43·190행. 다른 시리즈 `performance-engineering/part4-01-concurrency-basics.md`: 17~47 ↔ 23~46행, 146~162 ↔ 128~138행, 195~202 ↔ 237~244행. `performance-engineering/part4-02-false-sharing.md`: 166~182 ↔ 17~23·92~100행. |
| E | 5 | 제목(2행)이 '동기화 기초 분석'을 내걸지만 본문은 개념 소개와 불릿 장단점 수준이다. Critical Section(49~107행)·Race Condition(17~47행)은 다루고 Mutual Exclusion은 mutex 절(92~107행)로만 다룬다. description의 '언제 어느 것을'은 111~116행 표로 답하지만 경계값 근거가 없다. |
| F | 6 | 243행 다음 편은 seriesOrder 7 `part1-07-semaphore.md`와 맞다. 247~249행 관련 항목(part1-05, part1-07, part3-01)은 라벨이 맞다. 전제 지식 안내 같은 글 고유 구조가 없다. audit:reading·폰 폭 확인은 하지 않았다. |
| G | 1 | 본문 1차 출처 링크가 없다. FreeRTOS 버전·포트(206~215행), 코어(129행 'ARMv7+', 164행 DMB ST), C11 표준(122~127행) 모두 판·버전이 없다. 105행 'Mars Pathfinder 해결'도 출처가 없다. |

uncertainties:
- 55행 '수십 µs', 113행 '≤ 10 µs', 193행 '최대 50 µs'가 서로 다른 기준이고 셋 다 출처가 없다(part3-01 134행은 '10 µs 이하'). 190행은 10 µs 작업을 mutex로 보내 113행과 경계에서 어긋난다(공유 대상 조건이 달라 오류 확인으로 올리지 않음).
- 186~191행 작업별 시간은 클록·코어 없는 수치.
- 63·210·215·225행 taskENTER_CRITICAL 범위를 단일 코어 Cortex-M 포트 소스로 확인하지 않았다.
- 129행 LDREX/STREX 'ARMv7+'는 ARMv6 도입이라는 의심, ARM ARM 미확인.
- 158~164행은 producer 쪽 barrier만 보이고 consumer 쪽 읽기 순서를 다루지 않는다(출처 없어 감점 사유로 쓰지 않음).
- 233행 'ISR에서 mutex take → crash'와 configASSERT 동작 미확인.
- 204행 volatile 'single-byte flag에만' 근거, 105·15행 출처 미확인.

병합 대상: 후보는 `part3-01-critical-section.md`(IRQ disable·spinlock·hold time·memory barrier), `performance-engineering/part4-01-concurrency-basics.md`(race 타임라인·data=42/ready·volatile 예), `performance-engineering/part4-02-false-sharing.md`(false sharing 절). 다음 조치: 보강. Part 1 개념편으로 '동기화 기초' 검색 의도가 있으므로 memory ordering·false sharing 상세는 4-01·4-02 링크로 줄이고, 111~116·186~193행 수치는 1차 자료로 확인하거나 TBD로 두며, taskENTER_CRITICAL 범위(63·210·215·225행)를 포트 소스로 하나로 맞춘다. 보강해도 3-01과 구별되지 않으면 3-01로 병합한다.

### `part1-07-semaphore.md` — 43점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다. '함정 — Lost Wakeup' 절에서 201행 코드 주석은 `xSemaphoreTake(sem, portMAX_DELAY); // (2) 영원히 대기`라고 적었고, 205행 산문은 '(1)과 (2) 사이에 ISR이 give 하면 counter가 1이 되고, (2)에서 take가 가능합니다. 문제 없습니다'라고 적었다. 같은 코드에 대해 '영원히 대기'와 'take 가능, 문제 없음'은 동시에 참일 수 없다. git log(42ebbcbb, f5e1d8d3, 845231cf, 85a2d46f, ac24bb76, be973200, 0a9dd7bc)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | P/V 표(19~22행), binary·counting 구분(33~85행), Semaphore vs Mutex 표(168~175행)는 입문 자료의 기본 내용이다. 이 글 고유의 것은 직접 hand-off 구현(96~121행)과 token bucket throttling(146~164행) 정도인데 refill은 152행 주석뿐이다. 56행 'FreeRTOS 의존성을 줄이려는 코드에서는 semaphore'는 바로 위 코드가 FreeRTOS API라 기준 구실을 못 한다. 230·244행은 근거 없는 일반론이다. |
| B | 9 | 개념 → 두 종류 → 구현 → 패턴 → Mutex 비교 → ISR → 함정 → 정리(13~256행) 흐름은 있다. 함정 절(190~207행)은 201행 주석과 205행 산문이 반대 결론이다. Event Counting(139행)은 timeout 0 루프라 블록하지 않는데 144행은 'task가 깨어나서'라고 쓴다. max 초과 give(242~244행)는 반환값을 말하지 않는다. B ≤ 13. |
| C | 4 | API 조각(37~54·62~83·132~162·221~228행)은 있으나 FreeRTOS 버전·코어·FreeRTOSConfig.h 전제, 예상 결과·관찰 절차가 없다. 89~121행은 `add_to_wait_list`, `timeout_expired`, `block_with_timeout` 같은 정의 없는 이름을 쓰는 의사 코드다. |
| D | 7 | 인접 `part1-06-sync-basics.md`는 겹침이 적다. `part1-08-mutex.md` 50~58행 표 ↔ 168~175행. `part3-02-semaphore-impl.md`와 많이 겹친다: 89~121 ↔ 31~70행, 185~187 ↔ 230~232행, 190~207 ↔ 162~183행, 236 ↔ 236행(거의 같은 문장), 242~244 ↔ 222~224행, 168~175 ↔ 199~204행. 다른 시리즈 `modern-recipes/part6-04-semaphore-usage.md`가 37~54 ↔ 30~75행, 62~85 ↔ 77행~, 130~144 ↔ 122~150행, 177 ↔ 26행을 V11.2.0 소스 링크와 함께 다룬다. 고유한 몫은 P/V 표와 throttling 정도다. |
| E | 7 | 제목의 Counting·Binary·P/V는 19~29·33~85행에서, description의 Dijkstra P/V(1965)·ISR→task 신호는 17~22·37~56행에서 다룬다. 과장은 없으나 190~207행 모순과 대상 독자 불명확으로 9 이상은 아니다. |
| F | 6 | 258행 다음 편은 seriesOrder 8 `part1-08-mutex.md`와 맞다. 262~264행 관련 항목(1-06, 1-08, 3-02)은 라벨과 대상이 맞다. 전제 지식 안내가 없고 211~215행은 산문 시나리오를 ```c 블록에 넣었다(§5). audit:reading·모바일 렌더는 확인하지 않았다. |
| G | 1 | 본문 1차 출처 링크가 없다. FreeRTOS 버전, semphr.h, Dijkstra 원문(EWD) 인용이 없고 21~22·173·236·244행 주장이 출처와 이어져 있지 않다. 같은 주제 modern-recipes 6-04는 V11.2.0 semphr.h·tasks.c 줄 링크를 단다(20·24·26행). |

uncertainties:
- 244행 'max 초과 give는 무시(count 5에서 cap)'는 3-02 224행·modern-recipes 6-04 148·192행 'errQUEUE_FULL 반환'과 다르다. 글 사이 모순이라 semphr.h·queue.c로 확인해야 한다.
- 112~121행 sem_give(대기자에게 직접 hand-off)와 3-02 54~70행(count++ 후 wake)의 구현 차이, queue.c 미확인.
- 56행 주장의 의도 불명.
- 248행 'Mutex는 owner가 있어 unlock 누락 deadlock이 명확히 드러남' 미확인.
- 21~22행 P/V 어원과 'counter--; < 0 → 대기' 정의를 EWD로 확인하지 않았다. 96~121행 구현(count>0 검사)과 정의 방식이 다르다.
- 164행 '1초당 10 요청 제한'은 초기 burst 10건이 더해지고 refill timer 설정이 없어 확인할 수 없다.
- 139~144행 event counting 루프가 블록하지 않는데 '깨어나서'라고 쓴다.
- 175행 Mutex 'ISR Give ✗'와 187행 xSemaphoreTakeFromISR 사용 조건 미확인.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 후보는 같은 시리즈 `part3-02-semaphore-impl.md`(구현·ISR take·초기값·max 초과 give·Mutex 비교 절 겹침)다. 1-07은 P/V 개념과 사용 패턴(throttling)만 남기고 구현 절은 3-02로 넘기는 방향을 검토하며, `modern-recipes/part6-04-semaphore-usage.md`를 차별화 기준으로 삼는다. 먼저 190~207행 Lost Wakeup 절의 주석·산문 모순부터 고친다.

### `part1-08-mutex.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. git log -- part1-08-mutex.md는 0a9dd7bc(slug 고정), be973200(topics), ac24bb76(제목 변경), 85a2d46f(번역투 수정·공개)와 그 이전 본문·다이어그램 커밋이다. FreeRTOS 소스·NASA/JPL 자료와 대조한 커밋이 없다. 로컬에서 FreeRTOS-Kernel clone(semphr.h)을 찾지 못해 평가 중에도 대조하지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 50~58행 Mutex vs Binary Semaphore 표, 102~112행 Pathfinder, 168~181행 PCP, 185~199행 lock ordering은 입문 자료의 표준 목록이다. 이 글만의 것은 64~72행 가상 Mutex_t(owner·recursion_count·original_priority)와 128~165행 PI 의사 코드지만 실제 RTOS 구현과 연결하지 않는다. 96행 '나쁜 신호일 때가 많습니다', 227행 'µs 단위로 유지해야 합니다'는 근거 없는 일반론이다. |
| B | 11 | 필요성(17~46행) → 차이(48~60행) → owner(62~74행) → recursive(76~96행) → PI(98~166행) → PCP(168~181행) → deadlock(183~210행) → hold time(212~227행) → ISR(229~237행) → 실수·정리(239~266행)로 끝까지 간다. PI 의사 코드는 block 뒤 소유권 획득·timeout 시 priority 복원·여러 mutex 보유 시 복원(154행)을 설명하지 않는다. 124·233·247행 불확실로 B ≤ 13. |
| C | 5 | API 조각(37~45·81~93·204~207행)은 있으나 버전·포트·보드·예상 결과가 없다. 128~165행은 의사 코드이고 148행 void 함수가 152행에서 값을 반환해 그대로는 컴파일되지 않는다. 217행 '5 ms', 227행 'µs 단위'는 출처·환경 없는 수치(C ≤ 8). PI on/off 차이를 관찰할 절차가 없다. |
| D | 6 | 같은 시리즈: `part1-07-semaphore.md` 166~177행 표 ↔ 50~58행. 인접 `part1-09-queues.md`는 겹침 없음. `part3-03-mutex-impl.md` 17~36 ↔ 62~74행, `part3-04-priority-inversion.md` 38~60·117 ↔ 98~124·247행, `part3-06-priority-ceiling.md` ↔ 168~181행. 다른 시리즈 `modern-recipes/part6-05-mutex-usage.md` 18·22~28·97~117·165 이후·207·232~238행 ↔ 19~45·50~58·76~96·185~199·229~237·249~251행, `performance-engineering/part4-05-mutex.md` 82·145~154·161행도 겹친다. |
| E | 7 | 제목 세 키워드(Ownership·Recursive·Priority Inheritance)를 62~74·76~96·98~166행에서 다룬다. description(5행) '공유 자원 보호의 정답'은 근거 없는 단정이고 독자가 얻을 결과가 구체적이지 않다. |
| F | 7 | 266행 다음 편은 seriesOrder 9 `part1-09-queues.md`와 맞다. 270~273행 관련 항목(1-07, 1-09, 3-04, 3-05)은 대상 title과 일치한다. owner 구조 구현 글 part3-03, PCP 심화 글 part3-06은 링크하지 않았고 전제 지식 안내가 없다. |
| G | 1 | 본문 출처 링크가 없다. 124·247행 configUSE_MUTEX_PI 기본값, 102~112행 Mars Pathfinder(1997), 181행 'VxWorks 채택' 모두 1차 자료·버전이 없다. |

uncertainties:
- 124·247행 'configUSE_MUTEX_PI = 1이 FreeRTOS 기본값': 이 매크로 존재를 확인하지 못했다(로컬 clone 없음). FreeRTOS mutex PI는 configUSE_MUTEXES만으로 동작한다는 기억이 있어 semphr.h·tasks.c 대조가 필요하다. part3-04 60·117행에도 같은 문구가 있다.
- 233행 'xSemaphoreTakeFromISR — 컴파일 에러 또는 crash' vs modern-recipes part6-05 207행 '존재하지 않음'(다른 글과의 모순).
- 148~152행 void mutex_give의 반환, block 뒤 소유권·timeout 경로 부재, 154행 multi-mutex 복원 문제는 의사 코드 결함이라 오류 확인으로 올리지 않았다.
- 74행 'error를 내거나 무시합니다'와 243행 'error가 발생합니다'의 단정 수준 차이.
- 109행 '영원히 대기'와 괄호 'T_med이 끝나야 T_low 실행'의 표현 어긋남.
- 112행 'reset 원인', 181행 'VxWorks 채택'은 JPL·Wind River 자료로 미확인.
- 217행 '5 ms', 227행 'µs 단위'는 출처 없음.

병합 대상: 후보는 `modern-recipes/part6-05-mutex-usage.md`(SPI 동기·비교 표·recursive·ISR 금지·lock ordering 반복)와 같은 시리즈 `part1-07-semaphore.md` 166~177행(비교 표). 다음 조치: 보강. Part 1 개념 글이 Part 3(3-03~3-06) 구현 글의 전제 역할을 하므로 URL을 유지하고, Pathfinder·PCP·비교 표 반복은 3-04·3-06으로 넘기며, owner 추적이 PI·recursive·unlock 권한을 가능하게 하는 방식을 버전을 밝힌 FreeRTOS 소스와 대조해 차별화한다. 차별화가 안 되면 modern-recipes part6-05와 병합을 다시 검토한다.

### `part1-09-queues.md` — 44점, 병합 검토

confidence: 중간

factcheck: 미검증. git log -- 파일은 42ebbcbb(stub), f5e1d8d3(Part 1 10편 deep dive), 46b27c5a·845231cf(TikZ), 85a2d46f(번역투 수정·발행), ac24bb76(제목 변경), be973200(topic 메타), 0a9dd7bc(slug 고정)다. FreeRTOS queue.c·API 문서와 대조한 커밋이 없다. 원문 안 모순도 찾지 못했다(216·219·222행 산술 32/4=8·1024/4=256≈250이 맞고, 168행 '1:1 전제'와 176행 'Multi-producer는 외부 동기화 필요', 102행 wrap 조건과 79행 pcTail 정의가 맞음).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | Mutex+공유 buffer→Queue 전환(21~68행), by-value/by-reference(121~162행), Stream/Message Buffer·Mailbox(164~198행), ISR send(226~233행), static 할당(237~249행)은 FreeRTOS 입문의 흔한 목록이다. 이 글만의 것은 5×1 KB=5 KB RAM 계산(137행)과 출처 없는 memcpy cycle 추정(214~222행) 정도다. 210·249행은 근거 없는 단정이고 queue 길이·pointer queue 전환 기준이 없다. |
| B | 10 | 문제(21~47행) → 해법(49~68행) → 내부 구조(70~119행) → 전달 방식(121~162행) → 변종(164~198행) → ISR·static(224~249행) → 실수(251~272행) → 정리(274~279행)로 끝까지 간다. Receive는 119행 한 문장뿐이고 Send 의사 코드는 timeout 반환을 113행 '/* ... */'로 생략한다. 105행 wake_first_waiter 대상, queue 길이 산정이 없다. 146~150행 producer는 while 루프 없이 끝나는 task 함수다. |
| C | 5 | API 조각(50~65·143~159·170~195·226~246행)은 있지만 FreeRTOS 버전·MCU·config 같은 실행 조건이 없다. 96~114행은 의사 코드다. 216·219·222행 cycle 수치는 출처·환경이 없어 C ≤ 8. 측정·검증 절차가 없다. |
| D | 7 | 인접 `part1-08-mutex.md`·`part1-10-realtime-analysis.md`는 주제가 다르다. 같은 시리즈 `part3-07-queue-impl.md`: 15행 한 줄 요약이 같은 문장이고 76~88·96~114행이 22~42·47~79·82~97행과 겹친다. `part3-11-stream-message-buffer.md` 28~101행이 166~187행을 더 깊게 다룬다. 다른 시리즈 `modern-recipes/part6-06-queue-usage.md`: 121~162 ↔ 44~113행(같은 1 KB 구조체 78행), 194 ↔ 138행, 170~174 ↔ 166~176행, 257~264 ↔ 204~214행, 270~272 ↔ 226~233행. `riscv/esp32-c3-mastering/chapter10-freertos.md` 83~112행도 49~65행과 같은 구도다. |
| E | 6 | 제목 키워드 Producer-Consumer(17~68행)·Ring Buffer(70~119행)·전달 의미(121~162행)와 description(5행)이 맞는다. 전달 의미가 copy/pointer 두 가지 나열에 그치고 선택 기준이 약하다. |
| F | 6 | 281행 다음 편은 seriesOrder 10 `part1-10-realtime-analysis.md`와 맞고 'Part 1 마지막'도 맞다. 285~288행 관련 항목(part1-07, part1-08, part1-10, part3-07)은 라벨이 맞다. 전제 지식 안내가 없고 166~187행에 대응하는 part3-11, 233행에 대응하는 part1-05로 가는 본문 링크가 없다. audit:reading은 하지 않았다. |
| G | 1 | 본문 출처 링크가 없다. 버전 표기는 166·178행 'FreeRTOS 10+'뿐이고, 76~88행 구조체가 어느 판 queue.c인지, 216~222행 cycle 수치가 어느 코어·컴파일러 기준인지 없다. |

uncertainties:
- 216·219·222행 'ARMv7-M memcpy 약 4 byte/cycle' 등은 출처·코어·컴파일러가 없다.
- 29행 '← race condition 위험' 주석이 mutex 안 접근 줄에 붙어 무엇이 race인지 불분명하다(47행은 polling을 문제로 듦).
- 76~88행 구조체(pcTail·pcReadFrom 일반 필드)와 part3-07 22~42행(pcReadFrom union, pcTail 없음, 그런데 본문은 q->pcTail 사용)이 다르다. 다른 글과의 모순이라 queue.c로 정해야 한다.
- 268행 'ISR에서 xQueueSend() → crash'는 configASSERT·포트 설정에 따라 다를 수 있다.
- 166·178행 'FreeRTOS 10+' 변경 이력 미확인, 191행 xQueueOverwrite 길이 1 조건 미인용.
- 133행 '1024 byte memcpy'는 sizeof(BigMsg_t)가 1024+sizeof(int) 이상이라 정확히는 더 크다(사소한 산술 생략).

병합 대상: 후보는 내부 구조(76~119행) → `part3-07-queue-impl.md`, Stream/Message Buffer(164~187행) → `part3-11-stream-message-buffer.md`, 활용 패턴(121~162·193~195·251~272행) → `modern-recipes/part6-06-queue-usage.md`. Part 1 개념 장으로 'RTOS에서 queue로 메시지를 넘기는 이유'라는 독립 검색 의도가 있어 다음 조치는 보강(차별화)이다. 구조체·Send 의사 코드는 3-07로 넘기고 링크만 남기며, 공유 메모리 vs message passing 선택, queue 길이 산정, copy vs 소유권 이전 비교에 집중한다. 216~222행 cycle 수치는 1차 자료나 측정으로 확인하고 안 되면 지운다.

### `part1-10-realtime-analysis.md` — 43점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건이다(1차 자료 대조 아님). (1) 57~64행 'PID 실행 시간 분포 예'는 Average 50·Median 48·p99 70을 가진 측정 분포인데 64행은 그 Max 95 µs를 'WCET, 보장 가능 한계'라고 적는다. 같은 글 72행은 '수학적 보장'을 static analysis의 장점으로, 85행은 measurement-based의 단점을 '모든 path를 커버하지 못한다'로 적어 측정 최대값은 보장 한계가 될 수 없다. 192·196행 예산은 이 95 µs를 WCET로 써 '안전합니다'라는 결론을 낸다. (2) 24~26행 그림은 'wake latency (수 µs)'를 ISR start → Task wake 한 구간으로 표시하는데 33행 표는 Wake latency를 '모든 합'(31~32행 ISR latency + Scheduler latency)으로 정의한다. git log(0a9dd7bc, 28524a9d, be973200, ac24bb76 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 4 지표 정의(19~64행), WCET 4 방법(66~93행), Liu & Layland bound(97~107행), RTA 식(122행)은 표준 목록이고 `performance-engineering/part1-05-realtime.md`에도 같은 순서로 있다. 이 글만의 것은 3 task RMA 계산(109~116행), latency 원인 6가지(130~158행), path coverage 테스트 케이스(204~219행) 정도다. 146·150·154행 cycle 수는 출처·코어 없는 수치이고 240행 '느려질 수 있습니다'·'수일간 측정해야 합니다'는 일반론이다. |
| B | 11 | 지표 → WCET → schedulability → latency 원인 → 측정 → 예산 → 테스트 → hard/soft → 실수 → 정리(250~257행)로 완성됐다. RTA는 식(122행)과 두 문장(124·126행)뿐이고 109~113행 task 집합에 반복 계산을 적용한 예가 없어 description의 '증명하는 방법'을 끝까지 보여 주지 않는다. 64행이 측정 max를 보장 한계로 적어 196행 결론의 전제가 흔들린다. B ≤ 13. |
| C | 6 | DWT CYCCNT 측정(78~83행), GPIO pulse(175~181행), cyclictest 명령(164~166행), path별 테스트 케이스(215~219행)가 있다. 166행 'Min 5/Avg 7/Max 23 µs', 59~64행 분포, 187~194행 예산은 보드·커널·클록 없는 수치라 C ≤ 8. 82행 log_max는 정의가 없다. |
| D | 3 | 인접 `part1-09-queues.md`·`part2-01-ready-list.md`는 겹침 없음. 다른 시리즈 `performance-engineering/part1-05-realtime.md`와 핵심이 거의 같다: 66~93 ↔ 27~58행(aiT·Bound-T, '99.999%로 80 µs'까지 같음), 164~166 ↔ 117~120행(같은 명령, Min 5/Avg 7/Max 23), 185~196 ↔ 127~138행(50 ns·2 µs·3 µs·95 µs·10 µs·110 µs·89% 같음), 221~230 ↔ 143~151행, 122 ↔ 165행, 104 ↔ 159행. 같은 시리즈 `part1-03-scheduling-algorithms.md` 94~115행을 97~126행이 숫자만 바꿔 반복하고, cyclictest 출력은 `part2-10-scheduler-latency.md` 145행과도 같다. 고유한 부분은 128~158·200~219행뿐. |
| E | 6 | 제목의 Latency·Jitter·Deadline·WCET·RMA가 모두 절로 있고(19~116행) description의 hard/soft(47~51·221~230행)·RMA(97~116행)도 다룬다. '분석'·'증명하는 방법'에 비해 RTA는 식만 있고 지표가 정의와 표 수준이다. |
| F | 6 | 259행 다음 안내(Part 2 스케줄러 자료구조)는 seriesOrder 11 `part2-01-ready-list.md`와 맞지만 링크가 없다. 263~266행 관련 항목(1-03, 1-09, 2-10, performance-engineering/00-preface)은 대상이 맞다. 본문이 거의 같은 `performance-engineering/part1-05-realtime.md` 링크가 없고, 23~27행은 화살표 다이어그램을 text 코드 블록에 넣었다. audit:reading은 보지 않았다. |
| G | 2 | 99행 'Liu & Layland 1973 논문', 70행 aiT·Bound-T, 228행 DO-178C·ISO 26262가 이름으로만 나오고 링크·판·절이 없다. 146·150행 cycle 수에 버전·코어·출처가 없고 162행 cyclictest도 rt-tests 버전이 없다. |

uncertainties:
- 64행 오류 확인은 57~64행 표를 측정 분포로 읽는 해석(Average·Median·p99)에 기댄다. 표 출처가 명시되지 않아 확신도는 중간.
- 169행 'Max 값이 worst-case wake latency'도 같은 문제로 보이나 85·240행과 직접 충돌한다고 단정하기 약하다.
- 138행 'taskENTER_CRITICAL 동안 모든 ISR이 50 µs 지연'과 configMAX_SYSCALL_INTERRUPT_PRIORITY mask 범위, 포트 소스 미확인.
- 142행 'ISR_B가 시작되면 A가 끝나야 B가 실행'은 '시작'과 '대기'가 한 문장에서 충돌한다(우선순위 조건 불명).
- 146·150·154행 cycle 수는 출처 없음, ARM 문서 미확인.
- 166행 cyclictest 결과가 part2-10 145행, performance-engineering/part1-05 120행과 같은 값이라 실측인지 불명.
- 198행 'log_uart() 5 ms 점유해도 영향 없음'은 critical section·공유 mutex 미사용 전제가 빠졌다.
- 244행 'RMS bound 69% 권장'과 116행 n=3 0.78의 관계 설명이 없다.
- 49~50행 Hard·Firm 예와 228행 'Soft 인증 없음'은 출처 없는 분류.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 후보는 `performance-engineering/part1-05-realtime.md`(WCET 4 방법·cyclictest·latency 예산·hard/soft 표가 거의 같음)다. 먼저 64행 'WCET, 보장 가능 한계'(측정 max와 WCET 구분)와 24~26행 그림 ↔ 33행 표의 wake latency 정의를 고치고, 두 글의 역할을 정한다. 이 글을 남긴다면 RTOS 관점(latency 원인 128~158행, RMA·RTA 반복 계산 예)으로 좁히고 중복 절은 PE 1-05로 링크한다. RMA bound와 예는 `part1-03-scheduling-algorithms.md` 94~115행으로 넘기는 방안도 함께 본다.

### `part2-01-ready-list.md` — 49점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건이다(1차 자료는 열지 않음). (1) 86행 'bit N = priority N', 90행, 100행 '31UL - __clz(...)'와 92행 'CLZ 한 명령으로 가장 높은 priority'는 index가 클수록 높은 priority라는 전제인데, 60~62행 generic 코드는 uxTopReadyPriority = 0에서 ++로 올라가며 처음 비어 있지 않은 list를 골라 가장 낮은 priority를 선택한다. 20행 목표('가장 높은 priority')와 함께 참일 수 없다. 62행 break 뒤 index가 configMAX_PRIORITIES가 되어 64~65행이 배열 범위를 넘는다. (2) 134·136·189·263행은 '8×8 bitmap'으로 256 priority를 다룬다고 하는데, 139행 OSPrioRdyGrp는 1 byte(group 8개)이고 143행 group = p/8이면 p=255에서 group 31, 140행 OSPrioTbl도 32 byte라 8 bit group에 표시할 수 없다(8×8은 64 priority). git log(0a9dd7bc, be973200, ac24bb76, 85a2d46f, 이하 작성 커밋)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 정렬 단일 list(30~44행) → FreeRTOS generic(46~79행) → bitmap+CLZ(81~132행) → uC/OS LUT(134~159행) → CFS RB tree(161~181행)를 한 흐름으로 비교하고 185~192행 표로 묶은 구성은 이 글의 정리다. 각 단계는 교재 표준 설명이고 선택 판단은 257행 'M4에서 generic이면 공짜 O(1)을 버린다' 정도다. 253행 '문서 확인이 필요합니다'는 완곡 표현이다. |
| B | 11 | 문제 정의(16~28행)부터 비교 표(183~194행), wait·delayed list(196~243행), 함정(245~257행), 정리(259~265행)까지 완성됐다. 60~65행 generic 선택 코드가 산문과 반대 방향이고 범위를 넘으며, uC/OS 절(138~156행)은 256 priority와 1 byte group이 맞지 않는다. RT-Thread·Zephyr는 190~191행 표 한 칸씩뿐이다. B ≤ 13. |
| C | 5 | 코드 조각(58~66·98~112·118~128·147~157행)은 있으나 FreeRTOS 버전·포트·컴파일러가 없고 실행·관찰 절차가 없다. 105행 'CLZ 명령은 1 cycle', 187~192행 TCB 오버헤드 '~24 B'·'~20 B'·최대 prio 값은 출처 없는 수치라 C ≤ 8. 109~112행 어셈블리도 어떤 컴파일러 출력인지 없다. |
| D | 8 | 같은 시리즈 `part2-03-scheduler-algorithm.md` 42~67행(generic 매크로, 31-__clz, ARMv6-M generic)이 56~68·96~105·132행과 같은 질문에 답한다. `part2-02-blocked-list.md` 52~86·140~146행 ↔ 227~243·213~225행. `part1-02-task-thread.md` 32~34행도 같은 두 ListItem을 다룬다. `part5-01-freertos-source.md` 92~104행이 uxTopReadyPriority·CLZ를 다시 설명한다. 다른 시리즈 `modern-recipes/part6-03-scheduler-internals.md`는 tick·yield 시점 중심이라 역할이 갈린다(평가자 인용, 미재확인). 고유한 부분은 uC/OS LUT(오류 포함)·CFS 비교와 185~192행 표뿐이고 CLZ 설명이 시리즈 안에서 세 번 반복된다. |
| E | 7 | 제목의 Linked List·Bitmap·O(1) Scheduler와 description의 array-of-lists·bitmap+CLZ·uC/OS 8×8 LUT를 46~159행이 다룬다. description(5행) '자료구조 선택이 곧 스케줄러 latency를 결정'에 비해 latency 수치·비교가 없고(105행 1 cycle뿐), 제목 범위 밖 CFS·wait/delayed list(161~243행) 비중이 크다. |
| F | 5 | 267행 다음 편은 seriesOrder 12 `part2-02-blocked-list.md`와 맞고 271~274행 관련 항목(part1-02, part2-02, part2-03, part2-04)도 라벨이 맞다. 그러나 243행 '자세한 동작은 2-08편에서 다룹니다'의 2-08은 `part2-08-tick-timer.md`(SysTick·Generic Timer)로, xDelayedTaskList·overflow·swap이 나오지 않고 실제 설명은 part2-02 52~86행에 있다. 본문 안내가 틀린 글을 가리켜 F ≤ 5. audit:reading은 하지 않았다. |
| G | 1 | 본문 1차 출처 링크가 없다. FreeRTOS tasks.c·portmacro.h, uC/OS 소스, Linux kernel/sched/fair.c를 옮긴 듯한 코드(51·100·139~156·166~176행)에 버전·경로가 없고, 132행 ARMv6-M CLZ 부재도 ARM ARM 인용이 없다. |

uncertainties:
- 134~159행: OSRdyGrp/OSUnMapTbl 8×8 LUT는 uC/OS-II(최대 64 priority), uC/OS-III는 CPU_CntLeadZeros 기반 OSPrioTbl이라는 기억. 소스 미확인.
- 187행 generic 모드 최대 priority 32는 optimised 모드에만 있는 제한이라는 기억, tasks.c 미확인.
- 132행 '자동으로 generic 모드로 떨어집니다'와 257행 'M0에서 1로 두면 빌드가 깨집니다'의 관계를 ARM_CM0 포트로 미확인.
- 215·265행 'ready list와 wait list 양쪽에 동시에'와 220·225행 'delayed list와 wait list' 사이의 어긋남(엄밀한 모순은 아님).
- 190~192행 RT-Thread·Zephyr·Linux 수치는 출처 없음.
- 105행 'CLZ 명령은 1 cycle'은 Cortex-M3/M4 TRM 미확인.
- 이 글 60~62행(0부터 증가)과 part2-03 42~50행(uxTopReadyPriority부터 감소)이 다르다. 글 사이 모순이라 tasks.c로 정한다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 후보는 같은 시리즈 `part2-03-scheduler-algorithm.md`(next-task 선택·CLZ 설명이 42~67행에서 겹침)다. uC/OS LUT·CFS 비교와 185~192행 표는 2-03에 없는 질문이라, 먼저 60~65행 generic 코드와 134~159행 uC/OS 절을 1차 자료(FreeRTOS tasks.c taskSELECT_HIGHEST_PRIORITY_TASK, uC/OS-II/III os_core.c·os_prio.c)로 고치고, 243행 '2-08편'을 2-02로 바로잡은 뒤 2-03과 겹치는 CLZ 설명을 줄이는 차별화 보강을 다음 조치로 둔다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- git 이력에 1차 자료 대조 커밋 없음: 10편 모두 factcheck '검증됨'이 아니다. 이력은 f5e1d8d3(Part 1 10편 일괄 작성), 85a2d46f(번역투 수정·28편 일괄 공개), ac24bb76(제목 일괄 변경), be973200(topic 메타), 0a9dd7bc(slug 고정) 같은 일괄 커밋뿐이다. Practical RTOS Internals는 `/fact-check-round`를 거치지 않았다.
- 본문 1차 출처·FreeRTOS 버전 표기 없음: G가 8편 1점, part1-03·part1-10만 2점이다. FreeRTOS 소스 발췌·매크로(part1-02 31~43, part1-04 51·99·130, part1-09 76~88, part2-01 51·100행)에 버전·파일 경로가 없다. 출처·환경 없는 µs·cycle·백분율 수치 때문에 10편 모두 C ≤ 8 상한이 걸렸다(part1-02 50·65, part1-03 15·22·223, part1-04 70·79, part1-05 130~138, part1-06 186~193, part1-09 216~222, part1-10 146~154, part2-01 105·187~192행).
- 시리즈 템플릿 H2 뼈대: '한 줄 요약 → 본문 → 자주 하는 실수 → 정리 → 관련 항목'이 10편에 같은 순서로 있다(예: part1-02 13·179·197·207행, part1-05 13·188·206·216행, part1-06 13·217·235·245행, part1-07 13·232·250·260행, part1-10 13·232·250·261행). 사이트 단위 scaled content 신호로 시리즈 전체를 집계해야 한다.
- Part 1 개념 장과 Part 3·4·5 구현 장의 반복: part1-02 ↔ part5-01·part4-04·part4-06, part1-06 ↔ part3-01, part1-07 ↔ part3-02(236행 거의 같은 문장), part1-08 ↔ part3-03·3-04·3-06, part1-09 ↔ part3-07(15행 같은 한 줄 요약)·part3-11, part2-01 ↔ part2-03·part5-01(CLZ 설명 세 번). 시리즈 안 역할 분담을 정해야 한다.
- 다른 시리즈와의 중복: performance-engineering(part1-03·part1-10 ↔ part1-05-realtime, part1-05 ↔ part3-05, part1-06 ↔ part4-01·4-02, part1-08 ↔ part4-05), modern-recipes(part1-04 ↔ part6-03, part1-07 ↔ part6-04, part1-08 ↔ part6-05, part1-09 ↔ part6-06). D가 part1-10 3점, part1-08 6점, 나머지 7~10점이다.
- 같은 예시·수치의 반복: RMS bound·n=3 0.78(part1-03 98~113, part1-10 97~116행, performance-engineering part1-05 157~168행), Mars Pathfinder 5/3/1(part1-03 172~180, part1-08 98~110행, part3-04), cyclictest 'Min 5/Avg 7/Max 23'(part1-10 166, part2-10 145, performance-engineering part1-05 120행), ISR 규칙·xHigherPriorityTaskWoken 코드(part1-04 101~119, part1-05 19~24·93~100, part3-09 38~52행).
- '분석' 제목과 개념 소개 본문: ac24bb76에서 제목을 '… 분석' 형태로 바꿔 part1-02(2행)·part1-06(2행)이 E 5점이고, part1-10·part2-01도 description이 약속한 증명·latency 결정을 끝까지 보여 주지 않는다.
- taskENTER_CRITICAL·BASEPRI 범위 서술이 글마다 다르다: part1-04 99·157행, part1-06 63·210·215·225행, part1-10 138행. 'ISR에서 일반 API 호출 → crash' 단정도 part1-05 192, part1-06 233, part1-09 268행에 반복된다. FreeRTOS Cortex-M 포트 소스로 한 번에 정해야 한다.
- 글 사이 모순(오류 확인 아님): FreeRTOS SMP 설명(part1-03 205 ↔ part2-03 89 ↔ part4-07 5·20행), max 초과 give(part1-07 244 ↔ part3-02 224 ↔ modern-recipes 6-04 192행), queue 구조체(part1-09 76~88 ↔ part3-07 22~42행), generic 선택 방향(part2-01 60~62 ↔ part2-03 42~50행), configUSE_MUTEX_PI(part1-08 124·247 ↔ part3-04 60·117행). 한쪽만 고치면 다른 쪽에 남는다.
- 본문 안 다른 장 참조가 링크 없이 번호로만 있거나 틀리다: part1-03 180행 '3-04, 3-05 챕터', part1-10 259행 다음 편 산문, part2-01 243행 '2-08편'(실제 내용은 2-02). 관련 항목 라벨도 '1-06'·'3-02' 같은 Part 번호 체계라 seriesOrder와 다르다(part1-04 179~181, part1-07 262~264행).

## 다음 조치

- 우선 조치(4편, 오류 확인): part1-05 130~136행 ISR latency 표(구간 합 ↔ Total)를 Cortex-M TRM으로, part1-07 190~207행 Lost Wakeup 절의 201행 주석·205행 산문 모순을, part1-10 64행 '측정 max = WCET' 서술과 24~26행 ↔ 33행 wake latency 정의를, part2-01 60~65행 generic 선택 코드와 134~159행 uC/OS 8×8 LUT·243행 '2-08편' 안내를 먼저 고친다.
- part1-10은 정정 뒤 `performance-engineering/part1-05-realtime.md`와 역할을 정한다(RTOS 관점으로 좁히거나 병합).
- 병합 검토(6편): part1-02·part1-03·part1-04·part1-06·part1-08·part1-09는 Part 1 개념 장으로 남기되, Part 3·4·5 구현 장과 performance-engineering·modern-recipes에 겹치는 절을 링크로 줄이고 이 글만의 질문(전이 표, 선택 기준, 시나리오 계산)을 키우는 보강으로 간다. part1-06은 보강해도 part3-01과 구별되지 않으면 병합한다.
- taskENTER_CRITICAL 범위, configUSE_MUTEX_PI, max 초과 give, FreeRTOS SMP 구조처럼 여러 글에 걸친 주장은 FreeRTOS-Kernel clone을 받아 한 번에 대조하고, 틀린 문자열은 `data/known-falsehoods.yaml` 등재를 검토한다.
- Practical RTOS Internals 시리즈 전체를 `/fact-check-round` 대상으로 올리고, `data/upstream-tracking.yaml` 등록 여부를 확인한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
