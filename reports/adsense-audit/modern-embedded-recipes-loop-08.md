# Modern Embedded Recipes — 루프 08 (seriesOrder 70~79)

> 분석 단계: 루브릭 기반 검사·분류 1차  
> 대상: 공개 글 10편  
> 기준: AdSense 공개 글 평가 루브릭  
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

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

