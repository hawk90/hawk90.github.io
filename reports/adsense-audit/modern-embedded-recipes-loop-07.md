# Modern Embedded Recipes — 루프 07 (seriesOrder 60~69)

> 분석 단계: 루브릭 기반 검사·분류 1차  
> 대상: 공개 글 10편  
> 기준: AdSense 공개 글 평가 루브릭  
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

## 결론

이번 루프의 10편은 산문 중앙값 약 3,034자다. 산문 2,500자 미만은 0편이며, 코드가 산문보다 긴 글은 6편이다.

이번 결과는 공개 유지 여부를 확정하지 않는다. 외부 URL·실전 경험·출처의 자동 신호는 누락될 수 있으므로, 다음 정성 검토에서 원문 위치와 실제 절차를 확인해야 한다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 정성 검토 우선 | 6 | 코드 비중과 설명의 역할을 먼저 확인할 후보. 최종 판정 아님 |
| 근거·실전성 검토 | 4 | 외부 출처·근거 신호를 우선 확인할 후보. 최종 판정 아님 |
| 1차 유지 후보 | 0 | 기계 신호만으로 유지 후보로 올릴 글 없음 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 외부 출처 없음 | 9 |
| 산문 <2500 | 0 |
| 코드 우세 | 6 |
| 실전 신호 약함 | 0 |

## 검사 포인트

- Ethernet·SD Card·RTC 글은 장치 통합 코드가 설명을 대체하지 않는지, 하드웨어 전제와 실패 조건이 설명되는지 확인한다.
- RTOS 글은 도입 결정·Task·Scheduler·Semaphore·Mutex·Queue·Event Group 사이의 역할 중복이 없는지, 각 글이 독립적인 문제를 해결하는지 비교한다.
- RTOS 동시성 글은 우선순위 역전, ISR 호출 제약, timeout, 메모리 소유권 같은 실패 조건이 구체적인지 확인한다.
- `part5-12-ethernet-mac-phy.md`의 외부 링크 1개는 실제 주장과 연결되는 공식 출처인지 확인한다.
- 외부 링크가 없다는 자동 신호만으로 출처 부재를 확정하지 않고, 원문에 표준명·프로토콜 문서·제조사 데이터시트가 인용 또는 명시되는지 확인한다.
- lwIP·FatFs·FreeRTOS API와 프로토콜 수치는 버전·칩·설정에 따라 달라질 수 있으므로 적용 범위와 출처를 함께 확인한다.
- Abseil·Folly와 달리 Modern Embedded Recipes는 이 단계에서 일괄 제외하지 않는다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part5-12-ethernet-mac-phy.md | Ethernet MAC+PHY 통합 — RMII·lwIP·DMA Descriptor | 3,333 | 3,976 | 1 | 2 | 8 | 코드 우세 | 정성 검토 우선 |
| 2 | part5-13-sd-card-fatfs.md | SD Card + FatFs 구현 — SPI/SDIO 모드·CSD/CID·Wear | 3,028 | 5,049 | 0 | 5 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 3 | part5-14-rtc-utilization.md | RTC 활용 — Calendar·Alarm·Wake-up Timer·Backup Domain | 2,755 | 5,286 | 0 | 3 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 4 | part6-01-rtos-decision.md | RTOS 도입 결정 분석 — Super Loop vs RTOS 트레이드오프 | 3,039 | 1,753 | 0 | 9 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 5 | part6-02-task-design.md | RTOS Task 설계 패턴 — 우선순위·스택·State Machine | 3,299 | 2,134 | 0 | 12 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 6 | part6-03-scheduler-internals.md | RTOS Scheduler 동작 분석 — Tick·Context Switch·Yield | 3,695 | 1,601 | 0 | 16 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 7 | part6-04-semaphore-usage.md | RTOS Semaphore 활용 — Binary·Counting·ISR Give | 2,951 | 2,769 | 0 | 9 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 8 | part6-05-mutex-usage.md | RTOS Mutex 활용 — Recursive·Priority Inheritance 적용 | 2,967 | 3,242 | 0 | 10 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 9 | part6-06-queue-usage.md | RTOS Queue 활용 — By-Value·By-Reference·Timeout 패턴 | 3,105 | 3,262 | 0 | 10 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 10 | part6-07-event-group.md | RTOS Event Group 활용 — Bit Wait·Sync·Notify | 2,507 | 2,905 | 0 | 10 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |

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

기계 triage 대상 10편을 원문으로 읽고 잠정 점수를 추가했다. P0 정책 차단은 확인되지 않았다. 모든 점수는 공식 출처·실행 환경·실측 결과 대조 전의 `잠정` 값이다.

| 파일 | 총점 | 결정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part5-12-ethernet-mac-phy.md` | **71/100** | 보강 | MAC/PHY·lwIP·DMA·측정 흐름은 있으나 보드·PHY·실측 결과가 부족함 |
| `part5-13-sd-card-fatfs.md` | **72/100** | 보강 | SPI/SDIO·FatFs·전원 장애 주제를 다루지만 카드·호스트별 재현 결과가 없음 |
| `part5-14-rtc-utilization.md` | **70/100** | 보강 | RTC 초기화·alarm·tamper 예제는 충분하나 STM32 family 차이와 정확도 측정 근거가 약함 |
| `part6-01-rtos-decision.md` | **76/100** | 보강 | super-loop와 RTOS 선택 기준이 명확하지만 비용 표의 실제 측정값이 없음 |
| `part6-02-task-design.md` | **74/100** | 보강 | periodic/event/state-machine 패턴이 실용적이나 priority·jitter 판단은 환경 의존적임 |
| `part6-03-scheduler-internals.md` | **77/100** | 보강 | scheduler 시점·tickless·context switch 흐름은 좋지만 FreeRTOS 버전/port 근거가 없음 |
| `part6-04-semaphore-usage.md` | **74/100** | 보강 | binary/counting/ISR 패턴이 명확하나 latency 비교가 측정 필요 상태임 |
| `part6-05-mutex-usage.md` | **75/100** | 보강 | ownership·priority inheritance·lock ordering이 유용하나 RTOS별 차이와 실측이 부족함 |
| `part6-06-queue-usage.md` | **74/100** | 보강 | by-value/by-pointer/backpressure 선택이 좋지만 ownership·cache·성능을 환경별로 검증해야 함 |
| `part6-07-event-group.md` | **72/100** | 보강 | AND/OR/broadcast/sync 사용 사례가 있으나 FreeRTOS bit 폭·ISR deferred 동작의 출처 확인이 필요함 |

### 세부 점수

| 파일 | 독창성 25 | 완결성 20 | 실전성 15 | 중복 15 | 검색 의도 10 | UX 10 | 신뢰 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part5-12-ethernet-mac-phy.md` | 15 | 16 | 10 | 11 | 9 | 8 | 2 | **71** |
| `part5-13-sd-card-fatfs.md` | 15 | 17 | 10 | 11 | 9 | 8 | 2 | **72** |
| `part5-14-rtc-utilization.md` | 14 | 16 | 9 | 11 | 9 | 8 | 3 | **70** |
| `part6-01-rtos-decision.md` | 17 | 17 | 10 | 12 | 10 | 8 | 2 | **76** |
| `part6-02-task-design.md` | 16 | 16 | 10 | 11 | 9 | 9 | 3 | **74** |
| `part6-03-scheduler-internals.md` | 17 | 17 | 10 | 12 | 9 | 9 | 3 | **77** |
| `part6-04-semaphore-usage.md` | 16 | 16 | 9 | 11 | 9 | 9 | 4 | **74** |
| `part6-05-mutex-usage.md` | 16 | 17 | 10 | 12 | 9 | 8 | 3 | **75** |
| `part6-06-queue-usage.md` | 16 | 17 | 10 | 11 | 9 | 8 | 3 | **74** |
| `part6-07-event-group.md` | 15 | 16 | 9 | 11 | 9 | 9 | 3 | **72** |

### 공통 근거와 보강 우선순위

- 근거 위치: 각 글의 `핵심 개념`, `코드 / 실제 사용 예`, `측정 / 성능 비교`, `자주 보는 함정`, `정리` 섹션.
- 공통 강점: 모든 글이 문제 상황, API/구조 예제, 함정, 다음 글 링크를 갖고 있어 단순 코드 덤프는 아니다.
- 공통 감점: `측정 필요` 표기가 많고 실제 보드·컴파일러·RTOS 버전·측정 출력이 없다.
- 시리즈 중복: Ethernet/SD/RTC는 주변장치 구현군, RTOS 63~69는 선택·task·scheduler·동기화 API가 연속되어 역할 경계를 더 명확히 해야 한다.
- 다음 확인: FreeRTOS 공식 API 문서, STM32 reference manual/datasheet, lwIP/FatFs 공식 문서, 실제 build·timing·throughput 결과.

원문 수정·비공개·삭제·URL 변경은 하지 않았다.
