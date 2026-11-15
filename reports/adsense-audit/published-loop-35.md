# 공개 글 AdSense 평가 — 루프 35

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-35.md) · [재검토 기록](double-check-loop-35.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

기준 커밋: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2. 원문 전문을 직접 읽고 근거·중복 비교·링크 의미를 다시 판단했다. 초벌 evidence는 위치 탐색 참고로 사용했으며 점수를 확정 복사하지 않았다. 원문과 기존 보고서 및 사용자 파일 수정·커밋 없음.

공통 검사: [double-check-gates-2026-10-18.md](./double-check-gates-2026-10-18.md). 정적 검사 통과는 사실 검증 완료가 아니다. 앵커는 `10550ca1`의 UART(49)·Build(50) 역사 원문을 기준으로 하고, 현행 Recipes는 D 비교에만 사용한다. 실행/컴파일 검증 없이 예시를 실측으로 인정하지 않는다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part1-02-task-thread.md` | 9 | 10 | 5 | 11 | 6 | 7 | 1 | **49** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part1-03-scheduling-algorithms.md` | 10 | 10 | 6 | 10 | 7 | 7 | 2 | **52** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part1-04-preemption.md` | 9 | 9 | 5 | 8 | 7 | 7 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part1-05-interrupts-rtos.md` | 10 | 10 | 5 | 8 | 7 | 7 | 1 | **48** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part1-06-sync-basics.md` | 9 | 9 | 5 | 9 | 6 | 7 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part1-07-semaphore.md` | 9 | 9 | 4 | 8 | 7 | 7 | 1 | **45** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part1-08-mutex.md` | 9 | 11 | 5 | 7 | 7 | 7 | 1 | **47** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part1-09-queues.md` | 9 | 10 | 5 | 8 | 7 | 7 | 1 | **47** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part1-10-realtime-analysis.md` | 9 | 10 | 6 | 3 | 7 | 7 | 2 | **44** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part2-01-ready-list.md` | 12 | 11 | 5 | 9 | 7 | 5 | 1 | **50** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |

기존 합계 455 → 재검토 474. 2026-10-19 독립 최종 재검토. 기존오류4편유지, 미검증preemption/sync2편은 공식FreeRTOS Cortex-M자료로새오류확인. realtime의기존WCET·그림단독모순과ready의무ready OOB근거는철회했다. 나머지정확성은검증대기.

### `part1-02-task-thread.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part1-02-task-thread.md`
url: `/blog/embedded/rtos/practical-internals/part1-02-task-thread`

score_status: 잠정 · score: 49 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 80% stack overflow 비율·task return·TCB의 버전 조건은 확인 대기. 256word×4=1KB는 산술상 맞다.

| 항목 | 근거 |
| --- | --- |
| A | 9 | stack/TCB/state를 생성→전이→idle 정리로 묶는다. 실제 사례 대신 표와 축약 구조체라 A9 유지. |
| B | 10 | 5상태와 생성 실패 처리를 갖췄으나 FreeRTOS 버전·조건부 TCB 필드, idle 동작 범위가 빠져 B10 유지. |
| C | 5 | xTaskCreate 및 static 비교가 있어도 실행 환경·결과가 없다. 80% 비율과 일반 stack 크기는 무출처라 C5 유지. |
| D | 11 | 직접 연 part5-01 59–104행 TCB와 비교했다. 필드는 겹치지만 그쪽은 소스 경로, 이 글은 생명주기와 전이 표이므로 D10→11. |
| E | 6 | 제목의 TCB·상태 머신·생명주기를 각각 설명한다. 분석 단어만으로 감점하지 않아 E5→6. |
| F | 7 | 다음 order3의 RR/Priority/EDF/RMS, 관련1-01/1-03/2-04의 공개 제목·slug/order 확인. 전이 주체와 실수 절이 독자 흐름을 도와 F6→7. |
| G | 1 | 코드 출처·태그·80% 통계 근거가 없어 G1 유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~211행. SHA-256: `1021c6b73fbd6d951c697d62c502104fe8b75c63d7bfbdc974d4c0171ee81287`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `part1-03-scheduling-algorithms.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms.md`
url: `/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: RMS의 적용 가정과 SMP 분류·Zephyr/EDF 채택은 공식 대조 대기. 완곡 본문과 단정 정리 차이로 오류 처리하지 않는다.

| 항목 | 근거 |
| --- | --- |
| A | 10 | 4알고리즘을 실제 priority 예제·RMA 계산·SMP 비교로 잇는다. 새 측정이나 프로젝트 판단 근거는 적어 A10 유지. |
| B | 10 | 순서·수식·예제가 끝까지 있으나 독립 periodic/deadline 가정 및 RTOS별 정책 설명이 부족해 B10 유지. |
| C | 6 | U=.25+.40+.10=.75, n3 bound≈.78은 직접 재계산해 일치. 95%/99%·5–10단계는 무출처이고 실행 검증 없어 C6 유지. |
| D | 10 | 같이 전문을 연1-10 RMA와1-04 cooperative 설명을 비교. 공식과 yield 예제는 겹치지만 알고리즘 선택 입문이라는 질문이 달라 D9→10. |
| E | 7 | RR/Priority/EDF/RMS 비교 제목에 모두 답하고 장단점과 예제가 있어 E7 유지. |
| F | 7 | 다음1-04의 강제/자발 전환 설명 및1-02/1-10 라벨/실제 공개 order 일치. 알고리즘별 비교 구조가 있어 F7 유지. |
| G | 2 | Liu/Layland 이름/연도는 있으나 실제 논문 링크·구현 tag 연결이 부족해 G2 유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~257행. SHA-256: `5aa0c21a61309d904acefa5be100aba25a20b936d92a4e0f90f2e833011ebbff`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `part1-04-preemption.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part1-04-preemption.md`
url: `/blog/embedded/rtos/practical-internals/part1-04-preemption`

score_status: 잠정 · score: 46 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: BASEPRI로 모든 ISR이 막힌다는 주장을 공식 Cortex-M 문서로 한정해 오류 확인. 포트에 따라 PRIMASK일 수 있으므로 모든 RTOS에 일반화하지 않는다.

| 항목 | 근거 |
| --- | --- |
| A | 9 | tick/IRQ/yield로 전환을 나누고 PID와 log를 대비한다. 경험/관찰 결과가 없어 A9 유지. |
| B | 9 | 본문이 BASEPRI critical section을 명시하면서 모든 ISR이 막힌다고 한다. 공식 FreeRTOS 문서는 syscall 경계보다 높은 IRQ가 커널에 mask되지 않음을 명시해 새 오류 확인. B9 유지. |
| C | 5 | 코드/비교표는 있지만 실행 시간·tick 기본값의 고정 환경이 없다. C5 유지. |
| D | 8 | 1-03 147–170행 cooperative 코드·1-05 ISR 전문 및2-08 62–69행 tick표를 직접 비교했다. 반복이 커도 전환 선택 질문과 PID 시나리오는 독립이어서 D7→8. |
| E | 7 | 강제 전환과 자발 양보를 trigger/코드/시나리오로 실제 설명하므로 E6→7. |
| F | 7 | 다음1-05의 ISR/deferred/FromISR 설명과 공개 title/order/slug, 관련 tick18 확인. 비교 타임라인과 선택 시나리오가 있어 F6→7. |
| G | 1 | 설정 기본값·점유율·포트 동작의 원출처가 본문에 없어 G1 유지. |

전문 읽기: 1~181행. SHA-256: `fb0e66a4563157f73e5ee3c8cc68dd7c88d06b6d8ea822286f2fd9b744bb69f4`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `part1-05-interrupts-rtos.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos.md`
url: `/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos`

score_status: 잠정 · score: 48 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: ISR latency 표의 직렬 구간으로 적힌 값의 합과 Total이 다르다. 실제 Cortex-M 파이프라인 중첩 모델/세대는 확인 대기이며 어떤 수치로 고칠지는 확정하지 않았다.

| 항목 | 근거 |
| --- | --- |
| A | 10 | UART 수신 top/bottom half와 syscall priority 경계를 함께 제시해 A10 유지. 실제 측정은 없다. |
| B | 10 | latency 구간 하한2+12+4=18cycle이 Total 하한12와 맞지 않는다. 구간 합의 내부 불일치로 오류 유지하며 TRM 수치 자체를 맞다고 검증한 것은 아니다. |
| C | 5 | FromISR 예제·priority설정은 있으나 MCU/core·컴파일·실측이 없다. throughput 칸의 시간값도 지표가 모호해 C5 유지. |
| D | 8 | part3-09 99–125·161–173행의 deferred task/IRQ priority를 직접 비교했다. 반복이 있지만 ISR 입문과 안전 API 설계의 깊이는 달라 D7→8. |
| E | 7 | ISR context·deferred·FromISR 세 제목 요소에 각각 코드와 설명이 있어 E7 유지. |
| F | 7 | 다음sync1-06, 관련preemption1-04/ISR-safe3-09의 실제 공개 title/order/slug 일치. UART 흐름과 경계 설명이 고유 안내여서 F6→7. |
| G | 1 | cycle·통신 효율·port priority 근거가 원자료에 연결되지 않아 G1 유지. |

전문 읽기: 1~220행. SHA-256: `31801742b34797bb7e0bec57ce0965b801ee6cda4a2cab91e7d871edff45ffdd`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `part1-06-sync-basics.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part1-06-sync-basics.md`
url: `/blog/embedded/rtos/practical-internals/part1-06-sync-basics`

score_status: 잠정 · score: 46 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: BASEPRI와 portDISABLE_INTERRUPTS를 서로 다른 보호 단계라고만 본 기존 판단을 수정. Cortex-M3/4 FreeRTOS에서는 높은 IRQ가 살아 있어 완전 mask 주장이 틀리다. C11/ARM ordering 전체 검증 아님.

| 항목 | 근거 |
| --- | --- |
| A | 9 | counter race→보호도구→atomic/barrier→false sharing으로 넓게 묶는다. 범위별 상세는 짧아 A9 유지. |
| B | 9 | API 표의 portDISABLE_INTERRUPTS=IRQ완전mask와 BASEPRI critical에서 모든ISR이막힌다는 설명을 공식 FreeRTOS Cortex-M 범위와 대조해 오류 확인/B10→9. |
| C | 5 | assembly·atomic·padding 예시는 있으나 target/실측이 없다. 50ns/1us/10us/50us 권장의 환경이 없어 C5 유지. |
| D | 9 | part3-01 19–63·96–137·195–210행을 직접 열었다. IRQ/BASEPRI/spinlock/barrier 중복이 크지만 입문 선택과 구현 심화가 달라 D8→9. |
| E | 6 | Critical Section·Mutual Exclusion·Race Condition을 각각 예제/선택표로 풀어 E5→6. |
| F | 7 | 다음semaphore1-07의 counting/binary 설명, 관련ISR1-05/critical3-01의 실제 제목·order·공개 slug 일치. 도구 선택표가 있어 F6→7. |
| G | 1 | FreeRTOS/ARM/C11의 출처·버전을 제시하지 않아 G1 유지. |

전문 읽기: 1~249행. SHA-256: `7666d1d2248c34b94cfe3188a49583ec27d128c97d3afb7b7a462afb152b584f`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `part1-07-semaphore.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part1-07-semaphore.md`
url: `/blog/embedded/rtos/practical-internals/part1-07-semaphore`

score_status: 잠정 · score: 45 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: Lost Wakeup 예제의 동일 (1)→ISR give→(2) 순서를 두 설명이 반대로 결론낸다는 점만 확인. 다른 조건의 interleaving이나 일반 API 기억을 근거로 하지 않았다.

| 항목 | 근거 |
| --- | --- |
| A | 9 | P/V→binary/counting→pool/event/throttling 세 활용을 설명한다. 실측/독자 사례가 없어 A9 유지. |
| B | 9 | 코드가 (1)직후 ISR ready=1/give를 명시한 뒤 (2)를 영원히대기라고 적지만 바로 뒤 산문은 같은 순서에서 count1로 take가능/문제없다고 한다. 동일 시나리오의 직접 모순으로 오류 유지/B9. |
| C | 4 | 개념 코드·pool5·token10 예시는 있어도 구성·출력·계수 변화 trace가 없다. C4 유지. |
| D | 8 | part3-02 31–70·162–204행의 counter/give/lost-wakeup·mutex표와 직접 비교. 공통 설명은 많지만 이 글의 P/V와 활용 분류는 독립이어서 D7→8. |
| E | 7 | Counting·Binary·P/V 제목을 각각 설명하고 사용 패턴도 있어 E7 유지. |
| F | 7 | 다음mutex의 ownership/recursive/PI 설명과 관련sync/mutex/구현3-02의 공개title/order/slug 일치. resource/event/throttle 구분이 있어 F6→7. |
| G | 1 | Dijkstra/FreeRTOS 구현과 통계에 직접 원자료 링크가 없어 G1 유지. |

전문 읽기: 1~264행. SHA-256: `8f027d8a4d18a679d4c6d723e8d8fb0e7f9f2cf98798a00aebf4d1552b1d5ff0`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `part1-08-mutex.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part1-08-mutex.md`
url: `/blog/embedded/rtos/practical-internals/part1-08-mutex`

score_status: 잠정 · score: 47 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: configUSE_MUTEX_PI라는 옵션의 실재·다중 mutex의 priority복원·PCP조건을 확인 대기. 언어/API 기억으로 오류 확정하지 않는다.

| 항목 | 근거 |
| --- | --- |
| A | 9 | SPI보호에서 owner/recursive/PI/PCP/deadlock을 잇는다. 대부분 표준 설명이고 실제 사건 증거가 없어 A9 유지. |
| B | 11 | owner와 대기자 우선순위 변경의 흐름은 있으나 여러 mutex 및 timeout 처리는 생략되어 B11 유지. |
| C | 5 | 축약 mutex구조/코드와 lock order 예시는 있지만 빌드/실행/프로파일 결과가 없다. C5 유지. |
| D | 7 | 직접 연part3-03 17–80행의 owner/recursive take/give와 본문의62–164행 비교. 기초 개념과 FreeRTOS queue구현 역할을 구별해 D6→7; semaphore1-07 표도 반복. |
| E | 7 | Ownership·Recursive·PI를 각각 구조체와 예제로 설명해 E7 유지. |
| F | 7 | 다음queue의 producer/consumer·ringbuffer 안내와 relatedsemaphore/PI3-04/3-05의 공개 메타데이터 일치. lock order/holdtime 실수 안내가 있어 F7 유지. |
| G | 1 | NASA·FreeRTOS 설정값을 원출처에 연결하지 않아 G1 유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~273행. SHA-256: `713908a77acebb4691d4b7aa97f1f4c8eeb743fb8c6b063717cca282622eac7f`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `part1-09-queues.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part1-09-queues.md`
url: `/blog/embedded/rtos/practical-internals/part1-09-queues`

score_status: 잠정 · score: 47 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: copy성능4byte/cycle·BigMsg_t padding과 item-size mismatch의 정확조건, stream/message 제약은 확인 대기. 다른 concurrency 조건을 모순으로 처리하지 않는다.

| 항목 | 근거 |
| --- | --- |
| A | 9 | 공유buffer polling→blocking queue→pointer수명→변종을 잇지만 자체 실험이 없어 A9 유지. |
| B | 10 | queue 구조와송신/수신·수명책임을 다룬다. blocking 및 에러 처리 생략과 환경 없는 성능 단정이 있어 B10 유지. |
| C | 5 | 복사32/4=8,1024/4≈250 산술은 확인했으나 throughput가정은 무출처이다. 명령 실행·산출물 없어 C5 유지. |
| D | 8 | part3-07 15–105행의 ringbuffer구조·send·wrap코드와 직접 비교. 코드 중복은 크지만 by-value/reference와 사용자 수명관리 질문을 인정해 D7→8. |
| E | 7 | Producer-Consumer·RingBuffer·전달 의미를 각각 코드와 by-value/reference로 설명하므로 E6→7. |
| F | 7 | Part1마지막인 다음1-10 안내와7/8/10/3-07 실제공개 title/order/slug 일치. 수명관리와도구 선택 구조가 있어 F6→7. |
| G | 1 | FreeRTOS tag·복사cycle·API공식자료가 없어 G1 유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~288행. SHA-256: `6f2fd784b04f1b5292626627d2229a63efaad2771de2a0dcca0094256906d5b8`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `part1-10-realtime-analysis.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis.md`
url: `/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis`

score_status: 잠정 · score: 44 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 기존 Max95=보장WCET 근거는 그 분포가 측정치라고 명시하지 않아 단독 모순 근거에서 철회. latency 그림 경계도 모호해 철회. BASEPRI모델의 모든ISR50us지연은 공식 자료와 불일치해 오류 유지.

| 항목 | 근거 |
| --- | --- |
| A | 9 | 4지표·WCET4방법·RMA/RTA·budget을 묶지만 자체 측정은 없어 A9 유지. |
| B | 10 | taskENTER_CRITICAL 예제가 모든ISR을50us지연시킨다는 단정은 공식 FreeRTOS의 높은 IRQ 비마스킹 조건에 맞지 않는다. 기존 취약한 WCET/그림 근거를 대체하고 B11→10. |
| C | 6 | GPIO/DWT/cyclictest 예제와 계산은 있어도 하드웨어·test load·관찰값출처가 없다. 보장과sample max의 경계는 여전히 설명 부족하여 C6 유지. |
| D | 3 | Performance part1-05 27–58·117–168행을 직접 읽었다. WCET4방법·동일cyclictest·50ns/2us/3us/95us/10us/110us/89% 예산까지 같다. D3 유지; 병합 후보는 그 글이며 RTOS 관점 보강 가능. |
| E | 7 | Latency/Jitter/Deadline/WCET/RMA를 각각 구체 절로 설명하므로 E6→7. |
| F | 7 | 다음Part2자료구조 안내는 공개order11 readylist와 일치하며 관련RMS/queue/latency20/성능허브도 실제title·slug·설명과 맞는다. 예산→testcase 구조가 있어 F6→7. |
| G | 2 | 논문명·도구명은 있으나 공식논문/버전 링크가 부족해 G2 유지. |

전문 읽기: 1~266행. SHA-256: `e0b578eb0365d7cb9d6704b045500b6cbb3319fbc75340193ac6e74fccf3720f`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### `part2-01-ready-list.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part2-01-ready-list.md`
url: `/blog/embedded/rtos/practical-internals/part2-01-ready-list`

score_status: 잠정 · score: 50 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: ready가 전혀 없는 경우 OOB는 idle항상ready 조건 때문에 도달성 미확인이어서 주근거에서 철회. 낮은priority선택 및8x8/256 산술 모순만 확인.

| 항목 | 근거 |
| --- | --- |
| A | 12 | generic/CLZ/uC-OS/CFS와 TCB두link를 비교한다. 자체 실측이 없어 A12 유지. |
| B | 11 | generic이0부터첫nonempty선택인데 같은글bitmap은큰bit가최고priority이며 목표는최고task선택이다. 1bytegroup×8detail=64인데256을표현한다는 산술도 맞지 않아 오류 유지/B11. |
| C | 5 | 코드·구조체·복잡도 표는 있지만 upstream tag/빌드/사이클실측이 없고 overhead숫자가무출처라 C5 유지. |
| D | 9 | part2-03 42–89행의 generic/CLZ 및part2-02 52–86행 overflow설명을 직접 비교. 반복은 있으나 자료구조비교와호출경로 구별로 D8→9. |
| E | 7 | LinkedList/Bitmap/O(1)제목에 실제 코드·계산/비교가 대응하므로 E7 유지. |
| F | 5 | 다음blockedorder12/관련2-03·2-04메타일치. 하지만 overflow두list의 상세를2-08로보내는데 직접연timer글은swap상세가없고실제는2-02여서 F5상한유지. |
| G | 1 | 상수·구현·복잡도표 원소스 버전링크가없어 G1 유지. |

전문 읽기: 1~274행. SHA-256: `f33689de8cef1f2cae15b3453f6f5ec747d1f8a6a871dbef2f8139d4a2ea5158`. 기준 HEAD 원문과 바이트 일치를 확인했다.

## 적용 상한과 검증 한계

정확성 불확실이 열리면 B≤13(AP-C-24), 무출처 수치 C≤8, 절차만 있는 경우 C≤9를 우선 적용했다. F는 실제 slug/order/draft/title과 안내 뒤 설명을 대조하고 틀린 대상/설명이 있으면5 이하, 템플릿 외 글 고유 안내가 있을 때7 이상으로 판단했다. 축약 제목과 실질적인 오안내를 구분했다. 다른 시나리오·산문 개수·완곡한 본문/단정 요약·언어/API 기억만으로 오류를 확정하지 않았다. 실행하지 않은 코드와 관찰되지 않은 로그는 검증 완료로 기록하지 않는다.

## 공식 확인과 실행 한계

[FreeRTOS Reference Manual v10.0.0 §7.3](https://www.freertos.org/media/2018/FreeRTOS_Reference_Manual_V10.0.0.pdf)의 인쇄342쪽(파일342번째페이지)은 syscall priority경계보다 높은ISR은커널이mask하지않는다고명시한다. [공식 Cortex-M3/M4포트 설명](https://freertos.org/Documentation/02-Kernel/03-Supported-devices/04-Demos/ARM-Cortex/RTOS-Cortex-M3-M4)은 critical section에서BASEPRI에syscall경계를쓴다고설명한다(검색색인확인,동적본문은추출불가). 이판정은BASEPRI를명시한FreeRTOS모델에한정한다. API전체·C11memorymodel·모든RTOS에대한검증아님. ISR지연의실제모델과세마포어시스템·scheduler예제는실행하지않았다. 내부숫자/서술비교와원출처확인만수행했다.
