# Modern Embedded Recipes — 루프 08 (seriesOrder 70~79)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

## 결론

이번 루프의 10편은 산문 중앙값 약 3,194자다. 산문 2,500자 미만은 2편, 1,500자 미만은 0편이며, 코드가 산문보다 긴 글은 3편이다.

이번 결과는 공개 유지 여부를 확정하지 않는다. 외부 URL·실전 경험·출처의 자동 신호는 누락될 수 있으므로, 다음 정성 검토에서 원문 위치와 실제 절차를 확인해야 한다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 정성 검토 우선 | 3 | 짧은 산문·코드 비중·실전 신호를 먼저 확인할 후보. 최종 판정 아님 |
| 근거·실전성 검토 | 6 | 외부 출처·근거 신호를 우선 확인할 후보. 최종 판정 아님 |
| 1차 유지 후보 | 1 | 자동 신호상 상대적으로 균형이지만 최종 판정 아님 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 외부 출처 없음 | 8 |
| 산문 <2500 | 2 |
| 산문 <1500 | 0 |
| 코드 우세 | 3 |
| 실전 신호 약함 | 3 |

## 검사 포인트

- `part6-09-isr-api.md`, `part6-11-timer-services.md`, `part7-03-device-tree-basics.md`는 산문·실전 신호·코드 비중을 함께 정성 확인한다.
- RTOS Timer·ISR·Priority Inversion·디버깅 글은 앞선 RTOS 글과 개념이 겹치지 않고 독립적인 진단 가치를 제공하는지 비교한다.
- Device Tree 기초와 Overlay 글은 같은 개념의 반복 설명인지, 기초 개념과 실제 적용 절차가 분리되는지 확인한다.
- `part5-01` 이후의 임베디드 Linux 부팅·U-Boot·커널 빌드 글은 플랫폼과 명령의 전제가 명확한지 확인한다.
- `part7-05-kernel-build.md`의 외부 링크 2개는 실제 명령·주장과 연결되는 공식 문서인지 확인한다.
- 외부 링크가 없다는 자동 신호만으로 출처 부재를 확정하지 않고, 원문에 표준명·프로젝트 문서·제조사 자료가 인용 또는 명시되는지 확인한다.
- O(1), stack usage, tick, boot 단계처럼 조건 의존적인 표현은 적용 범위와 근거를 함께 확인한다.
- Abseil·Folly와 달리 Modern Embedded Recipes는 이 단계에서 일괄 제외하지 않는다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part6-08-software-timer.md | RTOS Software Timer 활용 — One-shot·Auto-reload·Daemon Task | 3,239 | 2,298 | 0 | 13 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 2 | part6-09-isr-api.md | ISR-Safe API 설계 — Reentrant·Atomic·Defer 패턴 | 2,046 | 2,957 | 0 | 1 | 15 | 산문<2500, 코드 우세, 외부 출처 없음, 실전 신호 약함 | 정성 검토 우선 |
| 3 | part6-10-priority-inversion.md | Priority Inversion 진단·예방 — Mars Pathfinder Lesson 추적 | 3,728 | 1,811 | 0 | 5 | 17 | 외부 출처 없음 | 근거·실전성 검토 |
| 4 | part6-11-timer-services.md | Timer Wheel 분석 — Hashed·Hierarchical·O(1) Tick | 3,148 | 3,234 | 0 | 1 | 16 | 코드 우세, 외부 출처 없음, 실전 신호 약함 | 정성 검토 우선 |
| 5 | part6-12-rtos-debugging.md | RTOS 디버깅 기법 — Tracealyzer·SystemView·Stack 추적 | 3,546 | 2,826 | 0 | 18 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 6 | part7-01-linux-boot-flow.md | 임베디드 Linux 부팅 흐름 분석 — BootROM·U-Boot·Kernel·init | 3,937 | 1,558 | 0 | 14 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 7 | part7-02-uboot-usage.md | U-Boot 활용 — bootcmd·env·tftp·boot.scr 분석 | 3,118 | 2,835 | 0 | 10 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 8 | part7-03-device-tree-basics.md | Device Tree 실전 — DTS·DTB·Overlay·Phandle 추적 | 1,817 | 4,502 | 0 | 0 | 17 | 산문<2500, 코드 우세, 외부 출처 없음, 실전 신호 약함 | 정성 검토 우선 |
| 9 | part7-04-device-tree-overlay.md | Device Tree Overlay 적용 — Runtime fragment·dtoverlay | 2,822 | 2,628 | 0 | 9 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 10 | part7-05-kernel-build.md | 임베디드 커널 빌드 — defconfig·menuconfig·Image·zImage | 3,404 | 1,898 | 2 | 11 | 8 | 해당 없음 | 1차 유지 후보 |

## 판정 보류와 다음 조치

이번 루프에서는 원문을 수정하지 않는다. 다음 정성 검토에서 각 글의 다음 근거를 원문 위치와 함께 기록한다.

1. 실제 보드·툴체인·칩 범위와 재현 가능한 절차
2. 측정값 또는 관찰 결과와 조건
3. 공식 문서·데이터시트·표준 등 주장에 대응하는 출처
4. 인접 글과 겹치지 않는 독립적인 문제 해결 가치
5. 코드만 복사해도 이해할 수 있도록 하는 설명·실패 조건·트레이드오프

정성 검토 결과에 따라 유지·보강 검토·병합 후보를 나누되, 근거 없는 수치나 경험을 새로 만들어 넣지 않는다. 원문 수정은 별도 승인 후 별도 루프에서 수행한다.

## 루프 종료 조건

- [x] 공개 글 10편을 모두 행으로 기록
- [x] 산문·코드·외부 링크·실전 신호를 동일 기준으로 검사
- [x] 자동 분류를 최종 판정으로 사용하지 않음
- [x] 원문 수정·비공개·삭제·URL 변경 없음
- [x] 보고서 자체의 diff 공백 오류 없음

## 정성 평가 업데이트

기계 triage 후 원문을 직접 읽은 `part6-09-isr-api.md`와 `part7-03-device-tree-basics.md`의 잠정 평가를 추가한다. 두 글 모두 P0 정책 차단은 확인되지 않았다.

| 파일 | 상태 | 총점 | 결정 | 핵심 근거 |
| --- | --- | ---: | --- | --- |
| `part6-09-isr-api.md` | 잠정 | **64/100** | 보강 | ISR 조건·FromISR·deferred work 예제는 충실하지만 원자성·동시성의 공식 근거와 실제 측정 결과가 부족함 |
| `part7-03-device-tree-basics.md` | 잠정 | **65/100** | 보강 | DTS·DTB·phandle·overlay 흐름은 넓게 설명하지만 보드·커널별 검증 결과와 범위가 불명확함 |

### `part6-09-isr-api.md`

| 항목 | 점수 |
| --- | ---: |
| 독창성 | 15/25 |
| 완결성 | 14/20 |
| 실전성·검증 가능성 | 8/15 |
| 중복·병합 위험 | 9/15 |
| 검색 의도 일치 | 8/10 |
| 탐색성·가독성·내부 연결 | 8/10 |
| 작성자·출처·신뢰성 | 2/5 |

근거 위치: `ISR-Safe 함수의 조건`, `Atomic 변수만 공유`, `ISR ↔ Task — Lock-Free Ring`, `자주 하는 실수`, `정리`. `volatile`과 Cortex-M 원자성 설명의 적용 범위, 공식 ARM/FreeRTOS 출처, 실제 ISR latency 측정 조건을 보강 검토한다.

### `part7-03-device-tree-basics.md`

| 항목 | 점수 |
| --- | ---: |
| 독창성 | 13/25 |
| 완결성 | 16/20 |
| 실전성·검증 가능성 | 8/15 |
| 중복·병합 위험 | 8/15 |
| 검색 의도 일치 | 9/10 |
| 탐색성·가독성·내부 연결 | 9/10 |
| 작성자·출처·신뢰성 | 2/5 |

근거 위치: `DTS·DTB·DTBO`, `#address-cells·#size-cells`, `Compatible — Driver Matching`, `Device Tree Overlay`, `/proc/device-tree·dtdiff`, `자주 하는 실수`, `정리`. 기초 문법·overlay·부팅 흐름의 역할 중복과 특정 보드에서의 `dtc` 실행 결과를 정성 확인한다.

### 추가 정성 평가

| 파일 | 총점 | 결정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part6-08-software-timer.md` | **74/100** | 보강 | one-shot/auto-reload와 callback race를 설명하지만 실제 jitter·tick·priority 측정이 없음 |
| `part6-10-priority-inversion.md` | **76/100** | 보강 | timeline·PI/PCP·trace 진단이 유용하지만 사례 출처와 RTOS별 검증이 부족함 |
| `part6-11-timer-services.md` | **70/100** | 보강 | timer wheel 구조와 여러 구현을 넓게 다루지만 O(1) 표현과 버전별 구현 근거가 약함 |
| `part6-12-rtos-debugging.md` | **78/100** | 보강 | stack/heap/trace 진단 경로가 실용적이나 도구 overhead·양산 조건의 실측이 없음 |
| `part7-01-linux-boot-flow.md` | **76/100** | 보강 | BootROM부터 init까지 흐름은 완결되지만 SoC별 boot chain과 측정 결과가 없음 |
| `part7-02-uboot-usage.md` | **75/100** | 보강 | environment/TFTP/A-B fallback 명령이 좋지만 board·U-Boot 버전별 차이가 큼 |
| `part7-04-device-tree-overlay.md` | **75/100** | 보강 | fragment·symbol·configfs와 probe 확인이 있으나 지원 플랫폼별 검증이 없음 |
| `part7-05-kernel-build.md` | **80/100** | 유지 후보 | 공식 Linux 링크와 실제 build 명령 흐름이 명확하지만 build 결과·보드 전제가 필요함 |

| 파일 | 독창성 25 | 완결성 20 | 실전성 15 | 중복 15 | 검색 의도 10 | UX 10 | 신뢰 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part6-09-isr-api.md` | 15 | 14 | 8 | 9 | 8 | 8 | 2 | **64** |
| `part7-03-device-tree-basics.md` | 13 | 16 | 8 | 8 | 9 | 9 | 2 | **65** |
| `part6-08-software-timer.md` | 16 | 16 | 9 | 11 | 9 | 9 | 4 | **74** |
| `part6-10-priority-inversion.md` | 17 | 17 | 10 | 11 | 9 | 9 | 3 | **76** |
| `part6-11-timer-services.md` | 16 | 15 | 9 | 10 | 9 | 8 | 3 | **70** |
| `part6-12-rtos-debugging.md` | 17 | 18 | 11 | 12 | 9 | 8 | 3 | **78** |
| `part7-01-linux-boot-flow.md` | 17 | 17 | 10 | 11 | 9 | 9 | 3 | **76** |
| `part7-02-uboot-usage.md` | 16 | 17 | 10 | 11 | 9 | 9 | 3 | **75** |
| `part7-04-device-tree-overlay.md` | 16 | 16 | 10 | 11 | 9 | 9 | 4 | **75** |
| `part7-05-kernel-build.md` | 17 | 18 | 12 | 12 | 9 | 9 | 3 | **80** |

근거 위치: 각 글의 `핵심 개념`, `코드 / 실제 사용 예`, `측정 / 성능 비교`, `자주 보는 함정`, `정리`. 공통적으로 예제와 다음 행동은 있으나 실제 실행 로그·보드·버전·성능 수치가 부족하다. `part7-05-kernel-build.md`의 외부 Linux 링크 2개는 강점이지만 특정 BSP 결과를 확인한 뒤 확정 점수로 전환한다.


## v1.2 재평가 (2026-10-11)

루브릭 v1.2와 `docs/adsense-audit/anchors.md` 앵커 4편을 기준으로 10편을 원문 전체를 읽고 다시 채점했다. `part6-09-isr-api.md`와 `part7-05-kernel-build.md`는 앵커 글이라 다시 채점하지 않고 anchors.md의 점수와 근거 요약을 옮겼다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 공통 필드: 10편 모두 `score_status: 잠정`이다. P0는 확인되지 않았다(확인 범위: 원문 본문과 내부 링크 대상의 존재·라벨, `part6-10`의 다이어그램 파일 존재까지이고, 렌더링·광고 배치는 보지 않았다). factcheck는 git 이력 기준으로 10편 모두 출처 없는 `Qualify …` 커밋만 거쳐 `미검증`이고, 원문만으로 성립하는 내부 모순·산술 오류가 있는 2편만 `오류 확인`으로 바꿨다. 1차 자료는 가져오지 않았으며 의심은 글별 `uncertainties`에 적었다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part6-08-software-timer.md` | 12 | 12 | 4 | 7 | 7 | 4 | 1 | 47 | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md` |
| `part6-09-isr-api.md` | 10 | 8 | 4 | 8 | 6 | 3 | 1 | 40 | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md` (앵커 자신) |
| `part6-10-priority-inversion.md` | 12 | 11 | 4 | 4 | 5 | 3 | 1 | 40 | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md` |
| `part6-11-timer-services.md` | 13 | 10 | 5 | 8 | 6 | 3 | 2 | 47 | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md` |
| `part6-12-rtos-debugging.md` | 14 | 13 | 6 | 7 | 6 | 6 | 1 | 53 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part7-01-linux-boot-flow.md` | 12 | 13 | 6 | 6 | 5 | 6 | 1 | 49 | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md` |
| `part7-02-uboot-usage.md` | 13 | 13 | 8 | 9 | 7 | 4 | 1 | 55 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part7-03-device-tree-basics.md` | 9 | 10 | 7 | 6 | 4 | 3 | 1 | 40 | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md` |
| `part7-04-device-tree-overlay.md` | 13 | 13 | 8 | 8 | 7 | 6 | 1 | 56 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part7-05-kernel-build.md` | 9 | 10 | 8 | 10 | 4 | 7 | 2 | 50 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` (앵커 자신) |

### part6-08-software-timer.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | `xTimerStop`·`xTimerDelete`가 명령만 queue에 넣을 뿐 실행 중 callback을 멈추지 않는다는 race(154~167행, 228~235행), callback에서 block하면 모든 timer가 멈춘다는 점(192~200행)이 실전 포인트다. 129·152행은 "검토할 수 있습니다"·"측정합니다"로 끝난다. |
| B | 12 | one-shot·auto-reload·timer ID·static·ISR·HW timer 비교·종료 race를 다룬다. 167·243행이 권하는 reference count 정리는 코드가 없다. |
| C | 4 | 표 두 개(171~176행, 182~186행)가 "측정"으로만 채워졌고, 수치는 178행 "0~1 ms 늦게" 하나뿐이다. |
| D | 7 | PRTOS 4-09 software timer가 HW vs SW, daemon task, one-shot/auto-reload, callback context를 다룬다. 같은 시리즈 6-11도 timer 자료구조를 다룬다. |
| E | 7 | 제목의 One-shot·Auto-reload·Daemon Task를 모두 다룬다. |
| F | 4 | 246행 "다음 편부터 6-09~6-11은 별도로 다루고, 본 시리즈에서 마지막은 RTOS 디버깅"은 틀린 안내다. seriesOrder 71(6-09 ISR API)이 같은 시리즈에 공개되어 있다. 관련 항목 4개(250~253행)는 맞다. |
| G | 1 | 출처·버전 없음. |

uncertainties:
- 14·38행 "timer task가 매 tick마다 list를 훑어": FreeRTOS timer task가 다음 만료까지 block하는 구조인지 미확인.
- 129행 "static 변종을 검토할 수 있습니다"와 244행 "양산은 static timer를 표준으로"의 권고 강도가 다르다.

병합 대상: PRTOS `part4-09-software-timer.md`. 종료 race 절(154~167행, 228~235행)은 이 글 고유이므로 남길지 함께 판단한다.

### part6-09-isr-api.md

앵커 점수를 그대로 옮겼다(anchors.md 2절, 40점). 근거 요약:

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | reentrant·SPSC ring·FromISR·BASEPRI·printf 회피는 RTOS 입문 자료의 표준 목록이다. "자동차 ISR — 최소 처리"(137~157행)가 유일한 고유 예제이고, 157·195행은 구체 기준 대신 완곡 표현을 둔다. |
| B | 8 | 절마다 코드 한 조각과 한두 문장이다. SPSC ring(75~101행)에 메모리 순서 언급이 없고 deferred work 예제(117~133행)의 race를 설명하지 않는다. |
| C | 4 | 실행 조건·예상 결과·측정 절차가 없고, 예제 일부는 그대로 쓰면 문제가 될 수 있다. |
| D | 8 | Lock-free ring 절(75~101행)이 9-01을 앞당겨 다루고, FromISR·critical section은 4-05, 6-04, 6-06과 겹친다. 고유한 것은 19~24행 조건표 정도다. |
| E | 6 | 제목·description·본문이 같은 패턴 목록을 향하지만 "설계"에 걸맞은 선택 기준이 없다. |
| F | 3 | 256행 다음 편 안내(Lock-Free Ring Buffer)가 seriesOrder 72(Priority Inversion)와 다르고, 260행 "1-06: JTAG·SWD"는 `part10-02`, 261행 "2-02: Lock-Free Ring"은 `part9-01`로 가서 번호가 틀렸다. |
| G | 1 | 출처·FreeRTOS 버전·대상 코어 표기가 없고, 73행 원자성 주장에 ARM 문서 인용이 없다. |

uncertainties (앵커와 같음):
- 65행 `isr_counter++`는 load-modify-store라 73행의 단일 접근 원자성 설명과 맞지 않는다.
- 117~131행 `rx_pending` 갱신 race와 `rx_buffer` 범위 초과 가능성.
- 145행 `CAN->RDLR >> (i*8)`를 8바이트까지 반복하는 구조.
- 189행 `configMAX_SYSCALL_INTERRUPT_PRIORITY` 재-shift 형태.
- 113행 Zephyr ISR variant, 245행 `atomic_load_64` 존재 여부.

병합 대상: PRTOS `part3-09-isr-safe-api.md`(같은 제목 "ISR-Safe API 설계"로 FromISR·deferred work·`configMAX_SYSCALL_INTERRUPT_PRIORITY`·공유 변수 atomic 절이 겹친다). Lock-free ring 절은 `part9-01-lock-free-ring.md`로 넘긴다.

### part6-10-priority-inversion.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | PI와 PCP, chain inheritance, PREEMPT_RT의 `PTHREAD_PRIO_PROTECT`(126~130행), 짧은 critical section의 회피/권장 코드(165~176행)를 한 글에 모았다. 55~60행 인용문, 99행 "보통 3 이하", 208행 "자동차와 항공 분야의 표준"은 출처가 없다. |
| B | 11 | 시나리오 → 사례 → 해결 3종 → 진단 → 예방까지 간다. 진단 절(134~150행)은 trace 화면 설명 세 줄과 필드만 있는 struct뿐이다. |
| C | 4 | 재현 코드나 trace 수집 절차가 없고 WCET 표(199~206행)는 "측정·분석 필요"다. |
| D | 4 | PRTOS 3-04 priority inversion이 Mars Pathfinder 1997, PIP, PCP, Immediate vs Original PCP, chained inheritance, PREEMPT_RT를 같은 순서로 다룬다. 같은 질문을 두 공개 글이 나눠 답하고, 6-05의 PI 시연(123~151행)과도 겹친다. |
| E | 5 | 제목이 "진단·추적"을 약속하지만 진단은 개념 설명 수준이다(루브릭 E 주석 3~5점). |
| F | 3 | 256행 "다음 편은 Memory Barrier"인데 seriesOrder 73은 Timer Wheel이다. 260행 "2-02: Lock-Free Ring"은 `part9-01`, 261행 "2-04: Memory Barrier"는 `part2-10`으로 가서 번호 라벨이 틀렸다. |
| G | 1 | Mars Pathfinder·Boeing 787 사례와 인용문에 출처가 없다. 문헌 표기는 112행 "Sha 1990" 하나다. |

uncertainties:
- 55~60행 "Tony Hoare의 회상" 인용문의 출처와 화자 미확인.
- 39행 "Sojourner rover 시스템": 문제가 lander 소프트웨어였는지 rover였는지 미확인.
- 188~193행 Boeing 787 "248일 후 RTOS counter overflow → priority inversion-like" 연결 근거 미확인.
- 154행 "ISR에는 priority 개념이 없으므로" 미확인.
- 167행 `xSemaphoreTake(&mtx, …)`는 77행 `xSemaphoreTake(mtx, …)`와 인자 형태가 다르다.

병합 대상: PRTOS `part3-04-priority-inversion.md`. 이 글 고유의 ASIL-D 절(178~186행)과 POSIX PCP 예(126~130행)만 옮길 가치가 있는지 판단한다.

### part6-11-timer-services.md

`factcheck: 오류 확인` — 110~115행 hierarchical wheel 표는 level마다 slot 256개라면서 단위를 8 ms → 256 ms → 16 s → ~1 hour로 적었다. 125행 설명대로 level 0의 256 tick마다 level 1 slot 하나가 내려오려면 level 1 단위는 8 ms × 256 = 2,048 ms여야 하고, 표의 단위들은 서로 256배 관계도 아니다(256 ms → 16 s는 62.5배). 275행 주석 "slot 996 = (current+1000) % 256"도 1000 % 256 = 232와 맞지 않는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | sorted list·min-heap·hashed wheel·hierarchical wheel·Linux timer_list(cascade 제거)·DPDK skiplist·FreeRTOS sorted list를 한 축으로 비교한 구성은 이 글만의 것이다. |
| B | 10 | 도입 상황과 "임베디드에서는 무엇을 고르나"라는 결론이 없다. hierarchical 구현(211~247행)은 `...`와 정의 없는 `cascade()`로 끝난다. |
| C | 5 | 비교 코드 조각은 있지만 실행·측정 절차가 없고, 266행 "1 µs+ per add"는 근거 없는 수치다. |
| D | 8 | PRTOS 4-09의 "자료구조 — Sorted List, Delta List, Timer Wheel, Heap" 절과 겹친다. 6-08과는 역할이 갈린다. |
| E | 6 | Hashed·Hierarchical은 다루지만 "O(1) Tick"은 15행에서 "구현에 따라 달라진다"고 하고 298행에서 "Wheel은 O(1)"로 단정해 약속이 흔들린다. |
| F | 3 | 다음 편 안내가 없다. 307행 "2-05: Wait-Free"는 `part9-02`로 가서 번호 라벨이 틀렸고 timer 주제와도 무관하다. |
| G | 2 | 59행 "Varghese·Lauck 1987", 143·259행 "Linux 4.8+"로 문헌·버전 앵커는 있지만 링크가 없다. |

uncertainties:
- 132~138행 Linux timer_list "9 level, 각 64 slot"과 1 ms 기준 단위(HZ 의존)를 kernel 소스로 확인하지 않았다.
- 153행 DPDK timer가 skiplist 기반이고 add·tick이 O(log N)인지 미확인.
- 201~205행 FreeRTOS timer list가 sorted list라는 설명 미확인.

### part6-12-rtos-debugging.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 디버깅을 "측정 인프라"로 보는 관점(14행), 10초 주기 stack 감시 task(46~64행), heartbeat로 감싼 watchdog(156~173행), free heap만 보고 안심하는 fragmentation 함정(201~208행)은 실무 구성이다. |
| B | 13 | stack·heap·deadlock·runtime stats·trace·watchdog을 모두 다룬다. `dump_owners()`(106행)와 owner 기록 구조체(111행)는 선언만 있고 구현이 없다. |
| C | 6 | config 네 줄(33~38행)과 코드가 바로 쓸 수 있는 형태이고 runtime stats 출력 예(127~132행)가 있다. overhead 표(177~183행)는 "측정 필요"이고 출력 예의 보드·버전이 없다. |
| D | 7 | PRTOS 2-11 tracing(Tracealyzer·SystemView·run-time stats·overhead), 4-06 stack overflow, 4-02 heap이 각 절을 더 깊게 다루고, 248~250행이 그 글들을 링크한다. 8-09 스택 분석과도 겹친다. |
| E | 6 | 제목의 Tracealyzer는 이름만 나오고 SystemView는 143~145행 한 조각뿐이다. |
| F | 6 | 244행 다음 편(Part 7 부팅 흐름)이 seriesOrder 75와 맞고 관련 항목 5개(248~252행)가 맞다. |
| G | 1 | FreeRTOS·SEGGER 문서와 버전 표기가 없다. |

uncertainties:
- 143~145행: task 안에서 `SEGGER_SYSVIEW_RecordEnterISR`/`ExitISR`을 쓰는 용법이 맞는지 미확인.
- 72행: overflow hook이 "ISR context, scheduler suspended"에서 호출되는지 미확인.
- 18행 "거의 대부분 stack overflow 또는 heap 고갈"과 238행 "전원·clock·bus·assert 등 다양"의 주장 강도가 다르다.
- 189행 "~16 B / task" 출처 없음.

병합 대상: 병합 대상 없음. PRTOS 쪽이 세 글(2-11, 4-06, 4-02)로 나뉘어 한 곳으로 합치기 어렵고, 이 글은 시리즈의 통합 체크리스트 역할을 한다. overhead 측정 절차와 SystemView 용법 확인을 채우는 `보강`을 다음 조치로 둔다.

### part7-01-linux-boot-flow.md

`factcheck: 오류 확인` — 30행은 root mount를 Kernel 단계의 책임으로 적고, 118행 표는 "root direct: U-Boot가 mmcblk0p2를 root로 직접 mount"라고 적어 같은 글에서 root mount 주체가 엇갈린다(199행도 U-Boot를 loader로 정의한다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | "DRAM이 살아나는 순간"으로 단계를 나누는 관점(14행)과 단계별 실패 메시지(160~194행: pin strapping, `dram_init failed`, DTB 누락 panic, `/init: -8`)는 쓸모 있다. 단계별 시간은 모두 "측정"으로 비어 있다. |
| B | 13 | BootROM → SPL → ATF/OP-TEE → U-Boot → Kernel → init의 책임과 initramfs·init 선택, 함정이 이어진다. |
| C | 6 | bootcmd·bootargs 예(82~98행)와 `gzip -t` 점검(186행)이 있지만 시간 표(137~153행)가 "보드 계측값"·"계측 필요"로 비어 있다. 84행은 `zImage`/`bootz`를, 135행은 arm64인 i.MX8M Mini를 예로 들어 한 보드에서 재현되는 조합이 아니다. |
| D | 6 | 같은 시리즈 3-12 `bootloader-chain`이 BootROM·SPL·U-Boot proper·TF-A·i.MX8 부팅·부팅 디버깅을 다룬다. 10-06 boot failure와도 일부 겹친다. |
| E | 5 | 제목이 "흐름 분석"을 약속하지만 본문은 단계 개념과 예시 수준이다(루브릭 E 주석 3~5점). |
| F | 6 | 205행 다음 편(U-Boot 활용)이 seriesOrder 76과 맞고 관련 항목 4개(209~212행)가 맞다. |
| G | 1 | SoC reference manual·TF-A 문서 출처, U-Boot·kernel 버전이 없다. |

uncertainties:
- 117행: initramfs에서 `pivot_root`로 전환한다는 설명(initramfs는 `switch_root`를 쓰는지) 미확인.
- 146행 "가장 큰 비중은 보통 kernel init과 userland"와 203행 "silent mode, kernel 최소화, init 단순화 순으로 효과가 큽니다"의 순서가 어긋나고 둘 다 측정 근거가 없다.
- 120행 "유용하거나 필요할 수 있습니다"와 202행 "필수입니다"의 강도가 다르다.
- 51~55행 BOOT_SEL 값 표는 특정 SoC 표기 없이 제시됐다.

### part7-02-uboot-usage.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | bootcount/bootlimit/altbootcmd로 구성한 A/B fallback(102~117행), altbootcmd도 실패하는 reset loop 함정(207~214행), PHY 초기화 지연 때 dhcp 뒤 tftp를 나누는 우회(199~205행), custom command(145~157행)가 실무 내용이다. |
| B | 13 | environment, TFTP, boot.scr, A/B, fastboot, UEFI, custom command, 함정까지 description의 범위를 다 다룬다. |
| C | 8 | U-Boot 명령, `mkimage` 명령(96행), 오류 문자열(202·219행)이 그대로 따라 할 수 있는 형태다. U-Boot 버전·보드가 없고 시간 표(161~166행)는 비어 있다. |
| D | 9 | 3-12 `bootloader-chain`의 A/B Boot 절과 7-01의 bootcmd 예(82~88행)가 겹치지만, U-Boot 조작 자체를 다루는 역할은 구별된다. |
| E | 7 | 제목·description·본문이 같은 U-Boot 실습을 향한다. |
| F | 4 | 233행 "다음 편부터 7-03은 별도 다루고, 본 시리즈에서는 Device Tree Overlay로 넘어갑니다"는 틀린 안내다. seriesOrder 77(7-03 Device Tree 실전)이 같은 시리즈에 공개되어 있다. 관련 항목 4개(237~240행)는 맞다. |
| G | 1 | U-Boot 문서·버전 출처가 없다. |

uncertainties:
- 58행 `env reset` 명령의 존재와 동작 미확인.
- 73행 "위 네 줄"이 가리키는 범위가 66~70행 다섯 줄, 76~78행 세 명령과 모두 맞지 않는다.
- 168행 "가장 큰 boot time 절감은 autoboot delay 0과 console silent"는 표가 비어 근거가 없고, 7-01 146행의 서술과도 다르다.

병합 대상: 병합 대상 없음. U-Boot 실습은 이 글만의 역할이므로 3-12와 겹치는 A/B 절을 링크로 정리하고 U-Boot 버전·보드를 명시하는 `보강`을 다음 조치로 둔다.

### part7-03-device-tree-basics.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | DTS 문법·`#address-cells`·phandle·interrupt·pinctrl·compatible 순서는 커널 Device Tree 문서와 같은 구성이다. 고유한 부분은 함정 절(288~336행)의 label 누락·disabled parent·옛 DTB 정도다. |
| B | 10 | 문법 → driver 매칭 → overlay → 확인까지 흐름은 있지만 도입 절 없이 17행에서 바로 시작해 이 글이 푸는 문제와 결론이 없다. |
| C | 7 | `dtc` 명령(22·257·273·281행)과 `/proc/device-tree` 확인(267~276행)이 있다. 대상 보드·커널 버전과 예상 출력이 없다. |
| D | 6 | Overlay 절(236~263행)과 `-@` 절(278~284행)이 7-04와 같은 내용이고, driver probe 절(198~234행)은 7-08 platform driver와 겹친다. |
| E | 4 | 제목이 "실전 … Phandle 추적"을 약속하지만 본문은 문법 소개 수준이고 phandle 추적 절차가 없다(루브릭 E 주석 3~5점). 265행 절 제목의 dtdiff도 실제로는 쓰지 않는다. |
| F | 3 | 347행 "다음 편은 Bootloader U-Boot"인데 seriesOrder 78은 Device Tree Overlay다. 351행 "1-03: PCIe BAR"은 `part11-03`, 352행 "1-05: Bootloader"는 `part3-12`로 가서 번호 라벨이 틀렸고, PCIe BAR은 주제와도 무관하다. |
| G | 1 | Devicetree Specification·kernel binding 문서 출처와 버전이 없다. |

uncertainties:
- 162행 `rtc@68`이 있는 `&i2c1`에 249행 overlay가 `sensor@68`을 추가해 같은 주소를 쓴다(예제 간 충돌, 의도 불명).
- 63~66행 `interrupts = <23>`과 122~123행 `<GIC_SPI 33 …>`이 같은 `uart0`에 다른 IRQ를 준다(분리된 조각인지 불명).
- 238행 "PR Capes" 표기의 의미 불명.

병합 대상: `part7-04-device-tree-overlay.md`. overlay 절을 7-04로 넘기고 기초 문법을 7-04 앞부분과 합쳐 Device Tree 글 하나로 만드는 방안을 검토한다.

### part7-04-device-tree-overlay.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | Raspberry Pi `config.txt`(97~107행), configfs runtime 적용과 제거(120~132행), `__overrides__` parameter(163~175행), UART pin을 빼앗아 console이 사라지는 함정(221~230행), remove 시 driver leak(232~239행)이 실전 내용이다. |
| B | 13 | fragment/target/symbol 개념 → base DT build → overlay 작성·컴파일 → 적용 → 결과 확인 → 제거까지 이어진다. |
| C | 8 | `dtc`·`cp`·config.txt·configfs 명령과 `/proc/device-tree` 예상 출력(111~116행)이 있다. Raspberry Pi 모델·커널 버전이 없고 측정 표(179~191행)는 비어 있다. |
| D | 8 | 7-03의 overlay 절(236~284행)과 같은 내용이 반복되고, 같은 overlay 코드가 이 글 안에서도 두 번(34~53행, 71~90행) 나온다. |
| E | 7 | 제목의 Runtime fragment·dtoverlay를 모두 다룬다. |
| F | 6 | 250행 다음 편(커널 빌드)이 seriesOrder 79와 맞고 관련 항목 5개(254~258행)가 맞다. 같은 코드 블록의 중복 때문에 7점은 주지 않았다. |
| G | 1 | kernel overlay 문서·Raspberry Pi 문서 출처가 없다. |

uncertainties:
- 170행 `addr = <&bme280>, "reg:0"`은 `bme280` label을 참조하지만 46·83행 노드에 label이 없다.
- 64행 `CONFIG_DTC_PLUGINS_OUTPUT` 옵션의 존재 미확인.
- 123행 `CONFIG_OF_CONFIGFS`가 mainline 옵션인지 vendor patch인지 미확인.

병합 대상: `part7-03-device-tree-basics.md`(7-03의 overlay 절을 이 글로 흡수하는 쪽). 병합하면 이 글이 기준 글이 된다.

### part7-05-kernel-build.md

앵커 점수를 그대로 옮겼다(anchors.md 3절, 50점). 근거 요약:

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | defconfig → menuconfig → build → install 흐름(26~31행)은 커널 문서와 같다. 고유한 부분은 vendor BSP 태그(59행)와 `INSTALL_MOD_PATH` 사고 함정(226~232행)이고, 측정 표(171~186행)는 "환경별 측정"뿐이다. |
| B | 10 | 받기부터 패키징까지 기본 흐름은 끝까지 가지만 zImage는 185행 표 한 칸, Kbuild Makefile은 `obj-m` 한 줄(115행)이다. |
| C | 8 | 실제 명령·경로·산출물 위치(35~41행, 93~97행)와 vermagic 오류 출력(208~213행)이 있다. 241행 "70% 이상 단축"은 167·175행의 "측정합니다"와 어긋난다. |
| D | 10 | out-of-tree module 절(111~132행)이 7-06 66~86행과 거의 같고, 나머지는 역할이 구별된다. |
| E | 4 | 제목의 zImage를 설명하지 않고 description의 "KBuild 전 과정"도 과장이다. |
| F | 7 | 26~31행 단계 목록이 코드 절과 1:1로 대응하고, 132행 본문 링크와 244행 다음 편(7-06)이 seriesOrder 80과 맞는다. |
| G | 2 | v6.6과 vendor 태그(56·59행)로 버전은 적었지만 Kbuild 문서 같은 1차 출처 링크가 없다. |

uncertainties (앵커와 같음):
- 129행: Makefile에 `modules` 타깃이 없는데 `make … modules`로 호출한다.
- 138행: arm64 cross build 산출물 이름을 `_amd64.deb`로 적었다.
- 99행 "8 코어에서 8~15분", 241행 "70% 이상"은 출처·환경 없는 수치다.
- 200~202행 산문을 `text` 코드 블록에 넣었다(점수 외).

병합 대상: 글 전체의 병합 대상은 없다. 111~132행 out-of-tree module 절만 `part7-06-kernel-module.md`와 겹치므로 그 절을 7-06 링크로 줄이고, zImage 설명과 측정 표를 채우는 `보강`을 다음 조치로 둔다.

### 시리즈 공통 문제

- 다음 편 안내나 관련 글 링크 라벨이 실제 seriesOrder·대상과 다르다(F 5점 이하): `part6-08`(246행), `part6-09`(256·260~261행), `part6-10`(256·260~261행), `part6-11`(307행, 다음 편 안내 없음), `part7-02`(233행), `part7-03`(347·351~352행). 6-08·7-02는 같은 시리즈에 공개된 다음 글을 "별도로 다룬다"며 건너뛴다. 개별 수정 전에 시리즈 전체의 다음 편 문구와 `N-NN:` 라벨 체계를 한 번에 재검토해야 한다.
- 같은 사이트의 공개 시리즈 Practical RTOS Internals와 같은 질문을 다룬다: `part6-08`↔PRTOS 4-09, `part6-09`↔PRTOS 3-09, `part6-10`↔PRTOS 3-04, `part6-11`↔PRTOS 4-09, `part6-12`↔PRTOS 2-11·4-06·4-02.
- 같은 시리즈 안에서도 역할이 겹친다: `part7-01`·`part7-02`↔`part3-12-bootloader-chain`(부트 단계·A/B), `part7-03`↔`part7-04`(overlay 절), `part7-05`↔`part7-06`(out-of-tree module).
- 측정·비교 표가 "측정 필요"·"환경별 측정"·"보드 계측값"으로 채워져 C를 빈 표로 채점했다: `part6-08`(171~186행), `part6-10`(199~206행), `part6-12`(177~183행), `part7-01`(137~153행), `part7-02`(161~166행), `part7-04`(179~191행), `part7-05`(171~186행).
- 제목이 "분석·진단·추적·실전"을 약속하지만 본문이 개념 수준이다(E 3~5점): `part6-10`, `part7-01`, `part7-03`, `part7-05`.
- 본문에 주장과 연결된 1차 출처·버전 표기가 없다(G 1~2): 10편 모두.
