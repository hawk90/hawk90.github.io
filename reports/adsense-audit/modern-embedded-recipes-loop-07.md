# Modern Embedded Recipes — 루프 07 (seriesOrder 60~69)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

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

## v1.2 재평가 (2026-10-11)

루브릭 v1.2와 `docs/adsense-audit/anchors.md` 앵커 4편을 기준으로 10편을 원문 전체를 읽고 다시 채점했다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 공통 필드: 10편 모두 `score_status: 잠정`이다. P0는 확인되지 않았다(확인 범위: 원문 본문과 내부 링크 대상의 존재·라벨까지이고, 렌더링·광고 배치는 보지 않았다). factcheck는 git 이력 기준으로 10편 모두 출처 없는 `Qualify …` 커밋만 거쳐 `미검증`이고, 원문만으로 성립하는 내부 모순·산술 오류가 있는 4편만 `오류 확인`으로 바꿨다. 1차 자료는 가져오지 않았으며 의심은 글별 `uncertainties`에 적었다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part5-12-ethernet-mac-phy.md` | 11 | 10 | 7 | 12 | 6 | 6 | 2 | 54 | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md` |
| `part5-13-sd-card-fatfs.md` | 12 | 11 | 8 | 13 | 6 | 6 | 1 | 57 | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `part5-14-rtc-utilization.md` | 12 | 11 | 7 | 13 | 6 | 6 | 1 | 56 | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `part6-01-rtos-decision.md` | 13 | 11 | 4 | 8 | 5 | 6 | 1 | 48 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part6-02-task-design.md` | 12 | 11 | 4 | 9 | 6 | 6 | 1 | 49 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part6-03-scheduler-internals.md` | 12 | 11 | 4 | 7 | 5 | 6 | 2 | 47 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part6-04-semaphore-usage.md` | 12 | 12 | 5 | 6 | 7 | 6 | 1 | 49 | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md` |
| `part6-05-mutex-usage.md` | 11 | 12 | 5 | 5 | 7 | 5 | 1 | 46 | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md` |
| `part6-06-queue-usage.md` | 13 | 13 | 5 | 7 | 7 | 5 | 1 | 51 | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md` |
| `part6-07-event-group.md` | 11 | 11 | 4 | 6 | 6 | 6 | 1 | 45 | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md` |

### part5-12-ethernet-mac-phy.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 21행이 STM32F4/F7 + LAN8742 조합을 정하고, MDIO read/write와 PHYSCSR로 속도·duplex를 읽는 코드(79~114행), Cortex-M7 cache coherency 함정(273~275행)은 이 글만의 내용이다. RMII clock 방향(39·49행), RMII clock 허용 오차(259행), descriptor 수(267행), lwIP buffer 크기(271행)는 "확인합니다"·"정합니다"로 끝나 구체 기준이 없다. 실제 칩 조합이 있어 `part1-04` 앵커(10)보다 1점 높게 줬다. |
| B | 10 | PHY → MAC → lwIP → link 감시 → ping 확인 흐름은 있다. 제목의 DMA Descriptor는 `setup_dma_rings()` 호출 한 줄(143행)뿐이라 descriptor 구조·소유 비트 설명이 없다. description의 HTTP server는 `httpd_init()`와 makefsdata 한 문장(195~205행)이다. 285행은 "UDP/TCP/HTTP 모두 callback"이라 정리하지만 TCP 예제는 없다. |
| C | 7 | 레지스터 수준 MDIO 코드, ping·nc·curl 확인 명령(232~245행), ping 실패 시 점검 순서(247~251행)가 있다. 출력 예(236행 `time=1.234 ms`)는 보드·lwIP 버전 없이 제시됐고, MAC 초기화의 GPIO 설정이 `// ...`(130행)로 빠져 그대로 재현되지 않는다. 253행 "idle 95% + brief packets 5%"는 근거 없는 수치다. |
| D | 12 | 시리즈에서 Ethernet MAC·PHY·lwIP 통합을 다루는 유일한 글이다. DMA 일반론은 4-10과 겹칠 수 있지만 이 글은 통합 절차에 집중한다. |
| E | 6 | 제목·description·본문이 같은 주제를 향하지만 제목 키워드 DMA Descriptor와 description의 HTTP server가 거의 다뤄지지 않아 6~8 구간 하단이다. |
| F | 6 | 289행 다음 편(SD card + FatFs)이 seriesOrder 61과 맞고, 관련 항목 4개(293~296행)의 대상·라벨이 일치한다. 코드 절 번호(1~5)는 있으나 전제 지식 안내는 없어 템플릿 수준이다. |
| G | 2 | IEEE 802.3 register(55행), LAN8742, `stm32f4xx_hal_eth.c`(119행)를 이름으로 밝혔지만 링크·lwIP 버전·reference manual 판이 없다. |

uncertainties:
- 104~110행: LAN8742 PHYSCSR(reg 31) bit[4:2] 속도 코드 매핑을 데이터시트로 확인하지 않았다.
- 83·90행: MDC 분주 `(4 << 2)` 값이 어떤 HCLK 범위에 해당하는지 미확인.
- 176~178행: `netif_add`에 `netif_input`을 넘기면서 main loop(189~192행)에서 `ethernetif_input`을 poll하는 구성이 NO_SYS 환경에 맞는지 미확인.
- 253행 트래픽 비율 수치는 출처 없음.

병합 대상: 병합 대상 없음. Ethernet 통합은 시리즈에서 이 글뿐이므로 DMA descriptor 구조와 HTTP 예제를 채우는 `보강`을 다음 조치로 둔다.

### part5-13-sd-card-fatfs.md

`factcheck: 오류 확인` — 64행은 "diskio.c의 5개 disk I/O 함수"라 쓰고 66~72행에 함수 5개를 나열하지만, 325행 정리는 "FatFs diskio.c의 4개 함수만 구현하면"이라고 쓴다. 같은 글에서 개수가 어긋나므로 3-1절에 따라 `오류 확인`이고 판정은 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 단계마다 timeout을 두지 않으면 카드가 없을 때 hang한다는 지적(49행, 119~126행), byte/block addressing 분기(150행), 매번 open/close하면 metadata write가 wear를 키운다는 함정(313~315행), power-loss 함정(317~319행)이 실전 관점이다. 15·34행은 SDIO 선택 기준을 "검토합니다"로 비운다. |
| B | 11 | init → block I/O → diskio → 사용 예 → LFN → 측정 흐름이 끝까지 간다. 21행은 "SDIO 모드 init을 다루고"라고 약속하지만 SDIO는 27~31행 비교표뿐이고, 제목의 CSD/CID는 본문에 한 번도 나오지 않는다. |
| C | 8 | SPI driver(80~143행)·block I/O·diskio·FatFs 사용 코드가 이어져 재현 절차가 있고, PC에서 파일을 확인하는 절차(270~278행)와 write 속도 측정 코드(282~290행)가 있다. 293행 "SPI 25 MHz ~2 MB/s, SDIO 4-bit ~10-15 MB/s"는 카드·보드 없는 수치이고, 96행 주석 "max 8 tries"와 98행 루프 10회가 어긋난다. |
| D | 13 | 저장장치·FAT 통합은 이 글만 다루고, SPI 전송은 84행에서 4-08로 넘겨 역할이 분리된다. |
| E | 6 | 제목 키워드 중 CSD/CID는 다루지 않고 Wear는 315행 한 문단이라 부분 미이행이다. |
| F | 6 | 329행 다음 편(RTC)이 seriesOrder 62와 맞고 관련 항목 4개(333~336행)가 맞다. 그 밖의 글 고유 안내는 없다. |
| G | 1 | FatFs 작성자(ChaN, 64행)만 밝히고 SD Physical Layer 사양·FatFs 버전·링크가 없다. |

uncertainties:
- 319행: journaling이 필요하면 LittleFS를 고려하라면서 "wear-leveling FS"로 부른다. LittleFS의 power-loss 보호 방식과 FatFs 대비 차이를 1차 자료로 확인하지 않았다.
- 299행 "CMD0 단계는 100-400 kHz만 허용", 307행 "~500 ms", 140행 "10-25 MHz"는 사양 출처가 없다.
- 113~117행: CMD8 뒤 R7 4바이트를 `sd_cmd` 반환 후 이어 읽는 구조가 사양 타이밍과 맞는지 미확인.

### part5-14-rtc-utilization.md

`factcheck: 오류 확인` — 196행 `(255 - ss) * 1000 / 256`의 정수 결과는 0, 3, 7, …, 117, 121, 125처럼 약 3.9 ms 간격의 값만 나온다. 263~267행 예상 출력의 `.123`, `.225`, `.326`, `.001`은 이 식으로 나올 수 없는 값이다. 또 207행은 backup register 수가 family마다 다르다고 하고 306행 정리는 "Backup register 42개"로 단정한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | BCD 인코딩(37행), PREDIV_A/PREDIV_S 산술(52~57행), TR을 읽은 뒤 DR을 읽어야 shadow가 풀린다는 함정(284~286행), boot magic으로 cold start를 가리는 방법(205~220행)은 실전 내용이다. 15·29·207·243행은 구체 동작을 RM 확인으로 넘긴다. |
| B | 11 | LSE init, 시간 read/set, alarm, sub-second, backup register, tamper까지 다룬다. 제목의 Wake-up Timer는 본문에 없다(19행에 "wake-up" 단어 한 번뿐). |
| C | 7 | 레지스터 코드와 출력 확인 루프(251~260행)가 있지만 예상 출력이 자기 식과 맞지 않는다. VBAT 시험(272행)은 "충분히 기다린 뒤"로 조건이 없고, 89·108·243행은 family RM 확인 주석이라 21행의 F4에서 그대로 동작하는지 판단할 수 없다. |
| D | 13 | RTC는 시리즈에서 이 글뿐이고 4-11 저전력과 역할이 갈린다. |
| E | 6 | Calendar·Alarm·Backup Domain은 다루지만 제목의 Wake-up Timer가 빠졌다. |
| F | 6 | 308행이 Part 5 종료와 Part 6 시작을 안내해 seriesOrder 63과 맞고, 관련 항목 4개(312~315행)의 대상·라벨이 맞다. |
| G | 1 | 21행 "STM32F4"만 있고 reference manual 판·문서 링크가 없다. |

uncertainties:
- 66행 "매일 09:00 → mask date, second": 63행의 mask 정의대로면 second를 mask할 때 09:00:00~09:00:59 동안 매초 일치한다. 68행 "mask all + second match"도 표현이 모순된다. RM으로 확인하지 않았다.
- 145~150행 `rtc_set`은 DR의 WDU 필드를 0으로 쓰는데, 294행은 WDU가 잘못되면 alarm이 일치하지 않는다고 경고한다. WDU=0 허용 여부 미확인.
- 233~235행 tamper EXTI line 21, 306행 backup register 42개를 F4 RM과 대조하지 않았다.

### part6-01-rtos-decision.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | "RTOS가 주는 것은 time-slicing이 아니라 blocking primitive"(33행)와 "결정이 애매하면 super-loop으로 시작"(192행)은 선택 기준이 있는 주장이다. 다만 결정표(26~31행)는 모든 칸이 "검토"로 끝나고, 35행 "비용을 숫자로 보면 결정이 쉽습니다" 다음 표(37~43행)는 칸이 "달라짐"이다. |
| B | 11 | 문제 → 기준 → super-loop·state machine·RTOS·hybrid 코드 → 측정 → 함정 → 정리 흐름은 완성됐다. 핵심 질문인 "몇 개의 마감부터 RTOS인가"는 187행 "1~2개면"으로만 남는다. |
| C | 4 | 130행은 "Cortex-M4 72 MHz에서 측정한 예시"라고 쓰는데 표(132~136행)는 전부 "측정 필요"·"workload 의존"이다. 140~144행 RAM 1.2 KB/5.6 KB는 heap 설정·포트 없이 제시돼 재현할 수 없다. |
| D | 8 | PRTOS 1-01 `why-rtos`가 "언제 RTOS를 안 써야 하나" 절로 같은 질문을 다루고, 198행이 그 글을 링크한다. hybrid 구조(108~126행)는 이 글이 더한 부분이다. |
| E | 5 | 제목이 "트레이드오프 분석", description이 "RAM/Flash 비용"을 약속하지만 비용 표가 비어 결과가 불명확하다. |
| F | 6 | 194행 다음 편(Task 설계 패턴)이 seriesOrder 64와 맞고, 관련 항목 4개(198~201행)가 모두 존재하고 라벨이 맞다. |
| G | 1 | FreeRTOS 버전·문서 출처가 없다. |

uncertainties:
- 174행 "FromISR을 쓰지 않으면 … deadlock이 발생합니다": 결과가 deadlock인지 assert·상태 손상인지 FreeRTOS 소스로 확인하지 않았다.
- 18행 "Datasheet에 FreeRTOS가 포함되어 있으니"의 의미가 불명확하다.
- 140~144행 RAM 수치 출처 없음.

병합 대상: PRTOS `part1-01-why-rtos.md`(같은 "RTOS를 쓸지" 질문). 비용 표를 실제 map 파일 수치로 채우지 못하면 hybrid 구조 절만 PRTOS 1-01로 옮기는 방안을 검토한다.

### part6-02-task-design.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 하드웨어가 아니라 입력·마감 기준으로 task를 자르라는 주장(20행, 181~189행)과 단일 코어에서 worker pool은 병렬이 아니라는 단서(154행)가 이 글의 관점이다. 18행 "80%의 문제가 해결"은 근거 없는 수치다. |
| B | 11 | 세 패턴, priority 배정, producer-consumer, worker pool, 함정까지 간다. 제목의 "스택"은 154·177행의 "stack RAM" 언급뿐이고 stack 크기 산정이 없다. |
| C | 4 | 측정 표 두 개(160~165행, 171~175행)가 모두 "측정 필요"·"workload 의존"이다. 코드는 FreeRTOS API 조각이고 실행 조건·예상 결과가 없다. |
| D | 9 | PRTOS 1-03이 Rate Monotonic을, 6-06이 producer-consumer를 다루지만 "task를 무엇 기준으로 나누나"라는 질문은 이 글 고유다. |
| E | 6 | 우선순위·State Machine은 다루지만 제목의 스택이 빠졌다. |
| F | 6 | 228행 다음 편(Scheduler)이 seriesOrder 65와 맞고 관련 항목 4개(232~235행)가 맞다. |
| G | 1 | 출처·RTOS 버전 없음. |

uncertainties:
- 32행 "마감이 짧을수록 높게 … Rate Monotonic": RM은 주기 기준이고 마감 기준은 deadline monotonic이다. 표(34~40행)는 주기로 배정해 의도는 RM으로 보이나 1차 자료로 확인하지 않았다.
- 42행 "같은 값을 사용해도 되는지 검증"과 209행 "같은 priority면 우선순위의 의미가 사라집니다"의 권고 강도가 다르다.

병합 대상: 병합 대상 없음. PRTOS 1-02는 TCB·상태 개념이라 역할이 다르다. 스택 산정과 jitter 측정 절차를 채우는 `보강`을 다음 조치로 둔다.

### part6-03-scheduler-internals.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | scheduler가 다시 도는 네 시점(24~31행)과 "tick rate를 올리면 jitter가 좋아진다는 오해"(155~161행)는 쓸모 있는 정리다. 104·115·142·151행은 효과·비용을 "측정해 선택"으로 넘긴다. |
| B | 11 | preemptive·cooperative·time-slice·idle·tickless·context switch를 모두 짚지만 context switch는 4단계 목록(108~113행)뿐이고 tickless의 tick 보정 원리는 없다. |
| C | 4 | 표 두 개(133~140행, 144~149행)가 전부 "측정 필요"다. 131행은 "FreeRTOS 10.5에서 측정하는 예시 항목"이라 쓰고 값이 없다. |
| D | 7 | PRTOS 2-04 context switch, 2-08 tick timer, 2-09 tickless가 같은 주제를 더 깊게 다루고, 이 글이 206~208행에서 그 글들을 링크한다. |
| E | 5 | 제목이 "동작 분석"을 약속하지만 본문은 개념과 설정 매크로 수준이다(루브릭 E 주석 3~5점). |
| F | 6 | 202행 다음 편(Semaphore)이 seriesOrder 66과 맞고 관련 항목 5개(206~210행)가 모두 존재·일치한다. |
| G | 2 | 131행에 FreeRTOS 10.5 버전 표기가 있으나 출처 링크가 없다. |

uncertainties:
- 110·113행 "R0~R12, LR, PSR은 HW가 자동 push/pop"은 115행 "일부 register를 hardware가 저장"과 범위가 다르다. Cortex-M exception frame 구성을 ARMv7-M ARM으로 확인하지 않았다.
- 196행 "context switch는 1~3 µs 수준", 198행 "WFI 한 줄이 mA 단위 차이"는 131·151행에서 일반값으로 쓸 수 없다고 한 내용과 어긋나는 출처 없는 수치다.
- 101행 "tick interrupt를 끄고 RTC로 깨움": FreeRTOS 기본 Cortex-M tickless 구현의 wake source 미확인.

병합 대상: PRTOS `part2-04-context-switch.md`, `part2-09-tickless.md`. 네 시점·tick rate 오해 절만 남기고 나머지는 PRTOS 링크로 줄이는 방안을 검토한다.

### part6-04-semaphore-usage.md

`factcheck: 오류 확인` — 140행은 task notification이 semaphore보다 "4 byte 정도 절약"된다고 쓰지만, 같은 글 197~199행 표는 binary semaphore 80 B, notification 4 B로 약 76 B 차이를 제시한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | event count 용도는 initial 0, resource pool은 max와 같게 둔다는 규칙(225~231행), binary는 두 번 give해도 1이라 이벤트가 사라진다는 함정(241~248행)이 실전적이다. |
| B | 12 | binary·counting(pool·event count)·notification·barrier·static을 모두 다루고 mutex와의 경계(233~239행)도 적었다. |
| C | 5 | 코드 조각은 완결적이나 181행 "측정한 latency입니다" 다음 표(183~189행)가 전부 "측정 필요"다. RAM 표(195~199행)만 수치가 있고 출처가 없다. |
| D | 6 | PRTOS 1-07 semaphore가 binary/counting, resource pool, event counting, ISR 사용, mutex와의 차이를 같은 순서로 다룬다. barrier 예제(142~164행)는 6-07 `xEventGroupSync`와도 겹친다. |
| E | 7 | 제목·description·본문이 Binary·Counting·ISR Give로 일치한다. |
| F | 6 | 259행 다음 편(Mutex)이 seriesOrder 67과 맞고 관련 항목 4개(263~266행)가 맞다. |
| G | 1 | 출처·버전 없음. |

uncertainties:
- 209·213행 "ISR에서 take는 안 됨"과 `xSemaphoreTakeFromISR` 사용 예: 6-05 207행은 같은 API를 "존재하지 않음"이라 써서 두 글이 어긋난다. FreeRTOS API 존재 여부 미확인.
- 197~198행 semaphore 80 B 크기 출처 없음.

### part6-05-mutex-usage.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | lock ordering(165~180행), timeout을 deadlock 감지로 쓰는 패턴(153~161행), owner가 아닌 task의 give 함정(213~220행)은 실무 규칙이지만 PRTOS 1-08과 같은 목록이다. RAII guard(62~82행) 정도가 더해졌다. |
| B | 12 | 차이표 → SPI 보호 → RAII → static → recursive → PI 시연 → timeout → lock order → 함정까지 완결된다. |
| C | 5 | PI 시연 코드(125~149행)가 priority를 명시해 재현 형태는 있으나, 결과(196~198행)는 환경 없이 "50 ms", "영구 굶음"이고 측정 표(184~191행)는 비어 있다. |
| D | 5 | PRTOS 1-08 mutex가 owner 추적·recursive·PI(Mars Pathfinder)·PCP·lock ordering·timeout·hold time을 같은 순서로 다룬다. Mars Pathfinder(20행)는 6-10에서도 반복된다. |
| E | 7 | 제목의 Recursive·Priority Inheritance를 코드로 다룬다. |
| F | 5 | 다음 편(257행)과 관련 항목(261~265행)은 맞지만, 34~37행 표가 머리행 없이 첫 내용 행을 머리행으로 써서 렌더링 구조가 깨진다. |
| G | 1 | 출처가 없고, 20행 Mars Pathfinder 언급에도 출처가 없다. |

uncertainties:
- 137·198행 "PI 없으면 Low를 영원히 preempt / 영구 굶음": 같은 코드의 `task_med`가 138행에서 매 반복 `vTaskDelay(1)`로 block하므로 Low가 실행될 틈이 있다. 151행도 "길어질 수 있습니다"로 적었다. 실행으로 확인하지 않았다.
- 217행 "error 반환 — 풀리지 않음"과 220행 "silently 무시"가 같은 함정에서 엇갈린다. FreeRTOS 소스 미확인.

병합 대상: PRTOS `part1-08-mutex.md`. RAII guard와 timeout 정책만 이 글에 남길 가치가 있는지 확인한다.

### part6-06-queue-usage.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 데이터 성격별 backpressure 선택(drop·block·overwrite, 128~141행), pool과 counting semaphore로 pointer를 넘기는 패턴(77~111행), create와 send의 sizeof 불일치 함정(225~233행)은 구체적인 선택 기준이다. |
| B | 13 | by-value·by-pointer·ISR·backpressure·queue set·stream buffer와 lifetime·pool 고갈 함정까지 별도 검색 없이 따라갈 수 있다. |
| C | 5 | RAM 산술(196~197행: 64×12 B = 768 B, 8×4 B = 32 B)은 맞지만 시간 표(183~190행)는 비어 있고, 192행 "64 byte를 넘으면 pointer 방식"은 근거가 없다. |
| D | 7 | PRTOS 1-09 queues가 by-value/by-reference와 stream·message buffer를 다룬다. 6-02 producer-consumer 예제(112~131행)와도 겹친다. |
| E | 7 | 제목의 By-Value·By-Reference·Timeout 패턴을 다룬다. |
| F | 5 | 260행 "2-02: Lock-Free Ring Buffer"가 `part9-01`로 간다. 번호 라벨이 틀린 링크라 5점 이하 규칙을 적용했다. 253행 다음 편(Event Group)은 맞다. |
| G | 1 | 출처·버전 없음. |

uncertainties:
- 206~212행 lifetime 함정 예제는 `xQueueSend(q, &buf, 0)`로 배열 내용 앞부분을 복사하므로, 32행의 memcpy 설명대로라면 pointer 소멸 문제를 보여 주지 못한다(코드 의도 불명확).
- 36행 "32 B 이하면 by-value"와 192행 "64 byte를 넘으면 pointer"의 경계가 다르다.
- 164행 "queue set은 memory를 더 쓴다"의 크기 근거 없음.

병합 대상: PRTOS `part1-09-queues.md`. backpressure 정책과 pool 패턴은 이 글 고유이므로 그 부분을 살리고 개념 설명은 PRTOS로 넘기는 방안을 검토한다.

### part6-07-event-group.md

`factcheck: 오류 확인` — 14·24·219·224행은 event group을 "24비트"로 고정해 쓰고, 195행은 "사용자 bit 수는 tick type·설정에 따라 달라집니다"라고 쓴다. 같은 글에서 bit 폭을 고정값과 가변값으로 함께 주장한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 부팅 조건 AND wait(18행, 49~82행), queue와 달리 broadcast가 된다는 비교(20행), clear 누락 시 busy loop(180~187행)이 있지만 대부분 FreeRTOS API 설명 순서다. |
| B | 11 | AND·OR·broadcast·sync·ISR을 다룬다. 제목의 Notify는 다루지 않는다. |
| C | 4 | 측정 표 두 개(159~166행, 171~174행)가 모두 "측정 필요"인데 176행은 "event group이 훨씬 효율적"이라고 결론 낸다. |
| D | 6 | PRTOS 3-08 event group이 SetBits·WaitBits(AND/OR/clear-on-exit)·Sync barrier·ISR variant·Wi-Fi 연결 예를 같은 순서로 다룬다. barrier는 6-04 142~164행과도 겹친다. |
| E | 6 | 제목의 Notify(task notification)가 빠졌다. |
| F | 6 | 226행 다음 편(Software Timer)이 seriesOrder 70과 맞고 관련 항목 4개(230~233행)가 맞다. |
| G | 1 | 출처·버전 없음. |

uncertainties:
- 24행 `EventBits_t = uint24_t`: C 표준에 없는 타입명이다. FreeRTOS 정의 미확인.
- 155행 "FromISR 변종은 daemon task에 메시지를 보내 deferred 처리" 미확인.
- 192행 "상위 8비트는 system reserved" 미확인.

### 시리즈 공통 문제

- 측정 표를 "측정 필요"·"달라짐"으로 채우고, 그 앞에 "측정한 예시/latency입니다"라고 쓰거나 뒤에 근거 없는 단정을 붙인다(C를 빈 표로 채점): `part6-01`(130~138행), `part6-02`(158~175행), `part6-03`(131~149행, 196행), `part6-04`(181~189행), `part6-05`(184~191행), `part6-06`(183~192행), `part6-07`(159~176행).
- 같은 사이트의 공개 시리즈 Practical RTOS Internals에 같은 질문을 같은 순서로 답하는 글이 있다: `part6-01`↔PRTOS 1-01, `part6-03`↔PRTOS 2-04·2-09, `part6-04`↔PRTOS 1-07, `part6-05`↔PRTOS 1-08, `part6-06`↔PRTOS 1-09, `part6-07`↔PRTOS 3-08. 개별 보강 전에 Part 6과 PRTOS의 역할 분담을 먼저 정해야 한다.
- 제목 키워드 일부를 본문이 다루지 않는다: `part5-12`(DMA Descriptor), `part5-13`(CSD/CID), `part5-14`(Wake-up Timer), `part6-02`(스택), `part6-07`(Notify).
- 같은 글 안의 모순·산술 불일치로 `오류 확인`: `part5-13`(64·325행), `part5-14`(196·263~267행), `part6-04`(140·197~199행), `part6-07`(24·195행).
- 본문에 주장과 연결된 1차 출처·버전 표기가 없다(G 1~2): 10편 모두.
