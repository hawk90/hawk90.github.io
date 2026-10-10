# Modern Embedded Recipes — 루프 05 (seriesOrder 40~49)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

## 결론

이번 루프의 10편은 산문 중앙값 3,302자다. 산문 2,500자 미만은 0편, 1,500자 미만은 0편이며, 코드가 산문보다 긴 글은 5편이다.

이번 결과는 공개 유지 여부를 확정하지 않는다. 외부 URL·실전 경험·출처의 자동 신호는 누락될 수 있으므로, 다음 정성 검토에서 원문 위치와 실제 절차를 확인해야 한다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 정성 검토 우선 | 5 | 코드 비중과 설명의 역할을 먼저 확인할 후보. 최종 판정 아님 |
| 근거·실전성 검토 | 5 | 외부 출처·근거 신호를 우선 확인할 후보. 최종 판정 아님 |
| 1차 유지 후보 | 0 | 기계 신호만으로 유지 후보로 올릴 글 없음 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 외부 출처 없음 | 10 |
| 산문 <2500 | 0 |
| 산문 <1500 | 0 |
| 코드 우세 | 5 |
| 실전 신호 약함 | 0 |

## 검사 포인트

- UART·SPI·I2C·워치독·PWM 글은 코드가 설명을 대체하지 않는지, 코드별 전제와 실패 조건이 설명되는지 확인한다.
- UART·SPI·I2C가 모두 드라이버 구현이라는 공통 형식을 가지므로, 프로토콜별 독립적인 문제·트레이드오프·검증 절차가 있는지 비교한다.
- DMA·저전력·Flash 글은 하드웨어별 조건과 측정 방법이 구체적인지 확인한다.
- DDR 초기화 실패 글은 일반적인 메모리 설명과 실제 진단 순서가 분리되어 있는지 확인한다.
- 외부 링크가 없다는 자동 신호만으로 출처 부재를 확정하지 않고, 원문에 표준명·칩 제조사 문서·데이터시트가 인용 또는 명시되는지 확인한다.
- 근거 없는 보편 수치나 모든 MCU에 적용되는 것처럼 보이는 기준은 P0/P1 근거 태그로 기록한다.
- Abseil·Folly와 달리 Modern Embedded Recipes는 이 단계에서 일괄 제외하지 않는다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part4-06-systick-timer.md | SysTick 타이머 활용 — 24-bit Counter·1ms Tick·delay 구현 | 3,206 | 2,112 | 0 | 5 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 2 | part4-07-uart-driver.md | UART 드라이버 구현 — polling·interrupt·DMA 3가지 방식 비교 | 3,270 | 4,408 | 0 | 6 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 3 | part4-08-spi-driver.md | SPI 드라이버 구현 — Master·Slave·CRC·DMA | 3,334 | 3,938 | 0 | 8 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 4 | part4-09-i2c-driver.md | I2C 드라이버 구현 — Master·7-bit/10-bit·Clock Stretching 처리 | 3,175 | 4,516 | 0 | 2 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 5 | part4-10-dma-basics.md | 임베디드 DMA 기초 — Memory-to-Memory·Peripheral·Circular Mode | 4,114 | 3,307 | 0 | 3 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 6 | part4-11-low-power-modes.md | 저전력 모드 분석 — Sleep·Stop·Standby·Wake-up Source | 3,774 | 1,800 | 0 | 11 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 7 | part4-12-watchdog.md | IWDG·WWDG 워치독 구현 — Independent vs Window 비교 | 2,890 | 2,966 | 0 | 3 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 8 | part4-13-flash-programming.md | 임베디드 Flash 프로그래밍 — Erase·Program·Read While Write | 3,922 | 3,714 | 0 | 6 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 9 | part4-14-ddr-init-failure.md | DDR 초기화 실패 진단 — Timing·Calibration·Walking Bit Test | 3,624 | 2,045 | 0 | 6 | 17 | 외부 출처 없음 | 근거·실전성 검토 |
| 10 | part5-01-pwm-output.md | PWM 출력 실전 — LED 밝기·모터 속도 제어 | 3,005 | 3,855 | 0 | 3 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |

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

원문 10편을 직접 대조해 루브릭 7개 항목으로 잠정 점수화했다. 점수는 Google의 공식 점수나 승인 확률이 아니라 콘텐츠 품질·독립 가치·검증 가능성을 비교하기 위한 내부 지표다. P0 정책 차단 요소는 확인되지 않았다. 실제 보드·칩·계측기·툴체인 버전별 실행 결과와 제조사 문서 대조 전이므로 신뢰도는 중간이다.

### 요약

| 파일 | 점수 | 잠정 판정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part4-06-systick-timer.md` | **74/100** | 보강 후 유지 | register·tick 계산·overflow-safe timeout과 periodic task를 연결한다 |
| `part4-07-uart-driver.md` | **77/100** | 유지 후보 | polling·interrupt·DMA를 코드·throughput·CPU 점유율 비교로 구분한다 |
| `part4-08-spi-driver.md` | **76/100** | 유지 후보 | SPI mode·divider·DMA·multi-slave CS까지 구현 선택을 다룬다 |
| `part4-09-i2c-driver.md` | **76/100** | 유지 후보 | state machine·7/10-bit·repeated START·bus recovery가 독립적인 문제를 푼다 |
| `part4-10-dma-basics.md` | **78/100** | 유지 후보 | circular/half-transfer·cache coherency·ADC/UART 예제가 실전적이다 |
| `part4-11-low-power-modes.md` | **74/100** | 보강 후 유지 | Sleep/Stop/Standby와 wake source를 코드로 연결하지만 전류 측정값이 없다 |
| `part4-12-watchdog.md` | **74/100** | 보강 후 유지 | IWDG/WWDG·window·멀티태스크 check-in·reset 원인 확인을 다룬다 |
| `part4-13-flash-programming.md` | **77/100** | 유지 후보 | erase/program·전압 범위·EEPROM emulation·dual-bank OTA를 연결한다 |
| `part4-14-ddr-init-failure.md` | **80/100** | 유지 후보 | timing·training·walking bit·March·eye 측정까지 장애 진단 흐름이 강하다 |
| `part5-01-pwm-output.md` | **77/100** | 유지 후보 | LED·RGB·complementary/dead-time·DMA waveform으로 적용 범위가 넓다 |

### 항목별 점수

| 파일 | 독창성 25 | 완결성 20 | 실전 검증 15 | 중복/병합 15 | 검색 의도 10 | UX/내부링크 10 | 신뢰/출처 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part4-06-systick-timer.md` | 18 | 16 | 10 | 11 | 9 | 8 | 2 | **74** |
| `part4-07-uart-driver.md` | 19 | 17 | 11 | 11 | 9 | 8 | 2 | **77** |
| `part4-08-spi-driver.md` | 18 | 16 | 11 | 11 | 9 | 8 | 3 | **76** |
| `part4-09-i2c-driver.md` | 18 | 16 | 11 | 11 | 9 | 8 | 3 | **76** |
| `part4-10-dma-basics.md` | 19 | 17 | 12 | 12 | 9 | 7 | 2 | **78** |
| `part4-11-low-power-modes.md` | 18 | 16 | 9 | 11 | 9 | 8 | 3 | **74** |
| `part4-12-watchdog.md` | 17 | 16 | 10 | 11 | 9 | 8 | 3 | **74** |
| `part4-13-flash-programming.md` | 18 | 17 | 11 | 12 | 9 | 8 | 2 | **77** |
| `part4-14-ddr-init-failure.md` | 20 | 18 | 12 | 12 | 9 | 7 | 2 | **80** |
| `part5-01-pwm-output.md` | 19 | 17 | 11 | 11 | 9 | 8 | 2 | **77** |

### 공통 근거와 우선순위

- 이 루프는 코드뿐 아니라 선택 기준, 실패 조건, 측정/동작 확인 절이 있어 실전성이 높다. 특히 DDR 초기화 진단은 다른 드라이버 구현 글과 겹치지 않는 독립 가치가 크다.
- UART·SPI·I2C는 모두 드라이버 코드 형식이므로, 프로토콜별 실패 증거를 차별화해야 한다. UART는 framing/overrun, SPI는 CPOL/CPHA·CS timing, I2C는 stuck SDA·clock stretching의 실제 파형 또는 로그가 우선이다.
- DMA·PWM·Flash는 cache, bus, erase/program timing, voltage range, timer clock처럼 칩 구현에 민감하다. STM32F4 기준임을 제목·본문·코드에 일관되게 고정해야 한다.
- 저전력 글은 mode 이름보다 측정 조건이 중요하다. 보드 누설, regulator, clock, wake source, 측정기와 안정화 시간을 기록하지 않은 전류 비교는 일반 수치로 사용하면 안 된다.
- Watchdog은 LSI 오차와 window refresh 조건, DDR은 메모리 파트·PHY·PCB length matching·training firmware 조건을 공식 reference manual과 함께 검증해야 한다.
- 이번 평가는 점수 기록만 수행했다. 원문 수정·비공개·삭제·URL 변경은 하지 않았다.

## v1.2 재평가 (2026-10-11)

루브릭 v1.2와 `docs/adsense-audit/anchors.md` 앵커 4편을 기준으로 10편 원문 전체를 다시 읽고 채점했다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다.

- factcheck는 git 이력으로 정했다. `part4-14-ddr-init-failure.md`만 커밋 `d3237cfb`에서 JEDEC 표준·데이터시트·U-Boot와 대조한 기록이 있어 `검증됨`이다. 나머지 9편은 출처 없는 `Qualify …` 커밋만 거쳐 `미검증`이 기본값이다.
- 평가 중 외부 자료를 가져오지 않았다. `오류 확인`은 같은 글 안의 모순·산술 불일치를 두 위치로 보일 수 있을 때만 줬고, 기억에 기댄 의심은 `uncertainties`에 적었다.
- P0 확인 범위는 원문 본문, 내부 링크 대상의 존재와 라벨, 이미지 파일 존재 여부다. 렌더링·광고 배치는 보지 않았다. 10편 모두 P0 없음.
- 10편 모두 `score_status: 잠정`이다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part4-06-systick-timer.md` | 13 | 13 | 8 | 12 | 8 | 6 | 1 | 61 | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `part4-07-uart-driver.md` | 13 | 14 | 9 | 10 | 7 | 6 | 1 | 60 | 미검증 | 보강 | 중간 | `part1-04-uart-hardware.md` |
| `part4-08-spi-driver.md` | 11 | 10 | 7 | 9 | 6 | 6 | 1 | 50 | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md` |
| `part4-09-i2c-driver.md` | 12 | 11 | 8 | 9 | 6 | 6 | 1 | 53 | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `part4-10-dma-basics.md` | 13 | 14 | 8 | 10 | 8 | 6 | 1 | 60 | 미검증 | 보강 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part4-11-low-power-modes.md` | 10 | 10 | 5 | 11 | 5 | 6 | 1 | 48 | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md` |
| `part4-12-watchdog.md` | 14 | 14 | 8 | 12 | 8 | 6 | 1 | 63 | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `part4-13-flash-programming.md` | 11 | 11 | 6 | 12 | 7 | 4 | 1 | 52 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part4-14-ddr-init-failure.md` | 17 | 14 | 8 | 11 | 7 | 7 | 3 | 67 | 검증됨 | 보강 | 높음 | `part12-10-on-device-llm.md` |
| `part5-01-pwm-output.md` | 12 | 13 | 7 | 9 | 6 | 6 | 1 | 54 | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md` |

### part4-06-systick-timer.md

`factcheck: 오류 확인` — 204행 함정 제목은 `delay_ms(0)`이 "99% 1 ms 대기"한다고 적었다. 그런데 206행 본문은 "즉시 반환"이라고 하고, 92행 코드 `(g_jiffies - start) < ms`는 `ms = 0`이면 처음부터 거짓이라 바로 빠져나온다. 같은 글 안의 모순이라 판정은 `우선 조치`다. `score_status: 잠정`, blockers: 204행 수정.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 50~60행이 wrap-safe 비교를 Linux `time_after()`와 연결하고, 148~161행은 `next_run += 10`과 `g_jiffies + 10`(slip)을 구분한다. 127~146행 DWT µs delay와 wrap 주기 계산도 이 글의 것이다. 15·19행 도입은 "많은 Cortex-M 구현에서", "사용하지 않을 수 있습니다"처럼 단정을 피한 문장이라 일반론으로 봤다. |
| B | 13 | tick 계산(38~46행) → init → delay → timeout → periodic task → 확인 → 함정으로 흐름이 닫히고, 125행이 비교 가능한 간격은 범위의 절반 미만이라는 한계를 적었다. 129행 "`__WFI()`는 1 ms 단위"는 다른 IRQ도 깨운다는 전제를 빼먹었다. |
| C | 8 | 165~188행에 LED 1초 toggle과 ISR 첫 줄 GPIO pulse로 "1 ms 주기 pulse가 보인다"는 예상 결과와 판단 기준(두 배 빠르거나 느리면 reload 재확인)이 있다. 실제 파형·보드 기록은 없다. |
| D | 12 | 4-05 `interrupt-handling`의 "TIM2 periodic interrupt" 절과 주기 처리 주제가 닿지만, jiffies·timeout·periodic 패턴은 이 글에만 있다. |
| E | 8 | 제목의 24-bit counter·1 ms tick·delay 구현을 모두 다룬다. 대상(RTOS 없는 펌웨어, 19행)은 있으나 description이 한 줄이라 9점은 아니다. |
| F | 6 | 224행 다음 편(UART 드라이버)이 seriesOrder 41과 맞고, 228~231행 관련 항목 네 개가 라벨과 같은 클럭·인터럽트·저전력·워치독 글로 간다. 전제 지식 안내는 없다. |
| G | 1 | 출처 링크·CMSIS 버전·대상 코어가 없다. 46·146행 168 MHz 계산이 어느 보드 값인지 밝히지 않는다. |

uncertainties:
- 194행 "`while (g_jiffies < target)`이 영원히 false": volatile 누락 시 조건이 갱신되지 않아 무한 루프가 된다는 뜻이면 "false"가 아니라 계속 참이다. 표현 오류인지 미확인.
- 210행 "priority 0~4에 두면 다른 ISR이 막힌다"의 구간 근거 없음.
- 214행 break 중 SysTick 동작을 SoC debug freeze 설정과 연결한 설명이 맞는지 1차 자료로 확인하지 않았다.

### part4-07-uart-driver.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 없음.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 40~51행 BRR 계산(42 MHz·115200 → 0x16D)을 끝까지 풀고, 78행 반올림식이 같은 값을 낸다(검산 일치). 248~250행은 TXE와 TC 차이를 RS-485 enable 제어에 연결한다. 57~61행 trade-off 표는 일반론이고, 53·238·258행은 "~에 따라 달라집니다"로 기준을 대신한다. |
| B | 14 | polling·interrupt·DMA 코드가 모두 있고 함정 6개가 한계를 짚는다. DMA RX는 207행 "main은 NDTR을 폴링"이라는 설명뿐 소비 코드가 없고, TX DMA는 194행에서 TCIE를 켰지만 handler가 없다. |
| C | 9 | 213~230행 byte 간 gap과 1 KB 전송 시간 표가 있고, 89 ms는 1024 × 10 bit / 115200으로 검산된다. CPU 점유율(~5%, <1%)과 gap 수치는 측정 환경·방법이 없어 12점 이상 근거로 쓰지 않았다. |
| D | 10 | 162~207행 DMA RX circular(DMA2 Stream2, channel 4)가 4-10 `dma-basics` 131~166행과 같은 설정이다. 53·236~238행 baud 오차 주의는 1-04 `uart-hardware`의 "Baud rate 정확도" 절과 겹친다. |
| E | 7 | 제목·description의 세 방식 비교를 이행한다. description의 latency 비교는 61행 표 한 칸뿐이다. |
| F | 6 | 268행 다음 편(SPI)이 seriesOrder 42와 맞고, 272~275행 관련 항목이 UART 하드웨어·SPI·DMA·UART 진단 글로 라벨대로 간다. |
| G | 1 | 25~36행에서 STM32F4 레지스터 이름을 밝혔지만 reference manual 문서·판과 측정 보드가 없다. |

uncertainties:
- 226~230행 CPU 점유율 수치의 측정 근거가 없다.
- 202행 `DMA2->HIFCR = 0x3F << 22`가 Stream7 플래그 범위와 맞는지 미확인.
- 63행 "짧은 전송에는 DMA가 손해"의 기준 길이가 없다.

### part4-08-spi-driver.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 없음.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 137·227행 "BSY 해제 전 CS를 올리면 마지막 비트가 잘린다"와 192~219행 slave별 mode·divider를 select 시점에 다시 거는 구조체가 이 글의 것이다. 38~43행 mode 표와 55~62행 divider 표는 1-05에도 있고, 19·45·64·188·243·247행은 "datasheet로 확인", "target에서 측정"으로 결론을 미룬다. |
| B | 10 | 제목이 약속한 Slave와 CRC가 본문에 없다(21행 스스로 "master 드라이버"로 한정). DMA 예제는 153~157행 TX stream에 TCIE를 켜고 handler를 두지 않았다. |
| C | 7 | 코드는 있으나 PCLK2·보드 같은 실행 조건이 없고, 221~229행 측정 절은 다이어그램 한 장과 "divider 검증이 된다" 한 줄이다. |
| D | 9 | 1-05 `spi-hardware`의 "Mode 0~3", "Multi-slave — CS vs Daisy-chain", "클럭 속도 한계" 절이 이 글 36~64행·253~255행과 같은 질문에 답한다. |
| E | 6 | 제목 키워드 넷 중 Slave·CRC를 다루지 않는다. 범위 불일치가 아니라 부분 미이행으로 보고 6~8 구간 하단을 줬다. |
| F | 6 | 265행 다음 편(I2C)이 seriesOrder 43과 맞고, 269~272행 관련 항목이 SPI 하드웨어·I2C·DMA·SD 글로 라벨대로 간다. |
| G | 1 | 출처와 대상 MCU 판이 없다. 255행 "flying wire로 50 MHz 동작 안 함, 25-50 MHz 안정"은 근거 없는 수치다. |

병합 대상: `part1-05-spi-hardware.md` (mode 표·multi-slave CS·clock 한계 중복). 109~217행 드라이버 코드는 1-05에 없으므로 1차 조치는 제목에서 Slave·CRC를 빼거나 해당 절을 쓰는 `보강`이고, 그 뒤 1-05와 겹치는 개념 절을 정리한다.

uncertainties:
- 160행은 DMA2_Stream0 IRQ만 켜고, 157행 Stream3 TCIE는 handler 없이 켜져 있다. default handler로 빠지는지 미확인.
- 255행 "5-10 MHz"와 263행 "5 MHz"가 prototype 시작 clock을 다르게 적었다.
- 34행 "STM32의 HW NSS는 한 핀만 지원" 미확인.

### part4-09-i2c-driver.md

`factcheck: 오류 확인` — 251행은 "1-byte read는 ADDR clear 전에 NACK + STOP을 set"하라고 적었다. 같은 글 163~167행 코드는 ACK를 끈 뒤(164행) ADDR을 clear하고(166행) 그 다음에 STOP을 set한다(167행). 본문 규칙과 코드가 서로 다른 순서를 제시하는 모순이라 판정은 `우선 조치`다. `score_status: 잠정`, blockers: 251행과 163~167행 중 하나를 고쳐 일치시킬 것(어느 쪽이 맞는지는 reference manual 대조 필요).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 41~49행 flag별 state machine 표, 99~105행 timeout wrapper, 192~221행 bus recovery(9 clock 후 수동 STOP)가 실전 패턴이다. recovery 코드는 1-06에도 있고, 239·243·266행은 결론을 "계산·검증해야"로 넘긴다. |
| B | 11 | write·repeated START read·recovery 흐름은 완성됐다. 제목의 10-bit 주소는 본문에 한 번도 안 나오고, clock stretching "처리"는 19·232행 두 문장뿐이다. |
| C | 8 | 모든 wait에 timeout을 둔 코드와 230~233행 증상별 진단(NACK·SCL stuck·SDA stuck)이 있다. 67행 CCR 35·TRISE 13은 42 MHz 기준 식으로 검산된다. 실제 파형·로그는 없다. |
| D | 9 | 1-06 `i2c-hardware`의 프레임·풀업 계산·clock stretching 절과 150행 bus recovery 코드가 이 글 25~39행·192~221행과 겹친다. |
| E | 6 | 제목 키워드 중 10-bit와 clock stretching 처리를 이행하지 않는다(부분 미이행). |
| F | 6 | 269행 다음 편(DMA)이 seriesOrder 44와 맞고, 273~276행 관련 항목이 I2C 하드웨어·SPI·DMA·환경 센서 글로 라벨대로 간다. |
| G | 1 | 21행 "STM32F4 I2C peripheral 기준" 외에 reference manual이나 I2C 규격 인용이 없다. |

uncertainties:
- 251행과 163~167행 중 어느 쪽이 STM32F4 reference manual 절차와 맞는지 1차 자료로 확인하지 않았다.
- 64행 fast mode TRISE 식 `(PCLK × 0.3) + 1`의 단위(MHz)가 표기되지 않았다.
- 175~182행 N-byte read에서 BTF를 보지 않고 마지막 byte 직전에 ACK·STOP을 거는 순서가 F4 절차와 맞는지 미확인.

### part4-10-dma-basics.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 없음.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 48~56행 HT/TC로 반쪽씩 처리하는 표, 150~166행 NDTR로 쓰기 위치를 계산하는 UART RX와 overrun 경고, 67~74행 clean과 invalidate를 전송 방향별로 나눈 설명이 판단을 돕는다. 189행 memcpy 비교는 "달라집니다"로 끝난다. |
| B | 14 | 세 전송 방향을 모두 코드로 보이고 alignment·stack buffer·cache 함정까지 짚는다. memory-to-memory를 지원하는 controller 제약과, HT/TC 처리가 늦을 때 덮어쓰기 정책은 다루지 않는다. |
| C | 8 | 196~197행 gdb NDTR 출력 예와 204~205행 sample rate 검산이 있다. 다만 200~205행은 TIM2 외부 trigger를 전제하는데 코드(104~105행)는 CONT+SWSTART라 측정 절차와 코드가 맞지 않고, 197행은 halfword ADC 전송을 "78 bytes"로 적었다. |
| D | 10 | 131~164행 UART RX circular 설정이 4-07 162~207행과 같다. 67~74·231~233행 cache 설명은 2-06 `arm-cache`와 겹친다. |
| E | 8 | 제목의 memory-to-memory·peripheral·circular를 모두 다룬다. |
| F | 6 | 247행 다음 편(저전력)이 seriesOrder 45와 맞고, 251~254행 관련 항목이 캐시·UART·SPI·zero-copy 글로 라벨대로 간다. |
| G | 1 | 35행이 "datasheet의 DMA request mapping table"을 가리키지만 문서명·판이 없다. |

uncertainties:
- 172행 `dma_memcpy`가 ADC 예제와 같은 DMA2_Stream0을 쓴다. 217행 함정(한 stream 한 source)과 함께 쓰면 충돌한다는 안내가 없다.
- 237행 "odd address 16-bit DMA write → bus fault"의 실제 동작 미확인.
- 19행 "latency는 줄며"는 4-07 61행 "DMA latency 약간 느림"과 시리즈 안에서 어긋난다.

### part4-11-low-power-modes.md

`factcheck: 오류 확인` — 65행은 10 ms 30 mA + 990 ms 100 µA의 평균을 "≈ 30 mA × 10 ms / 1000 ms = 0.3 mA"로 적었다. 바로 아래 67행이 제시한 식 (active × active_time + sleep × sleep_time) / period로 계산하면 (300 + 99) / 1000 ≈ 0.40 mA다. sleep 항을 빼서 결과가 실제보다 25% 작다. 원문 안의 산술 불일치라 판정은 `우선 조치`다. `score_status: 잠정`, blockers: 65행 계산.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 61·151행 SBF로 standby wake를 구분하는 방법, 117·194행 Stop wake 후 HSI 복귀와 PLL 재구성, 190행 DBGMCU clear는 실전 정보다. 그러나 27~32행 모드 표의 칸 대부분이 "device-dependent"라 이 글만의 비교 결과가 없다. |
| B | 10 | 모드·wake source·코드 세 개는 있지만 description의 "전류 측정" 결과가 없다. 136행 WUTR 계산은 레지스터 폭에 따른 최대 시간을 적지 않았다. |
| C | 5 | 172~178행 측정 표의 모든 칸이 "~에 따라 측정"이라 내용이 없는 표로 봤다(루브릭 3-1). 168행 측정 장비 이름만 있고 절차·조건이 없다. |
| D | 11 | 119~148행 RTC wake-up timer 설정이 5-14 `rtc-utilization`의 wake-up timer 주제와 겹친다. 모드 비교 자체는 이 글에만 있다. |
| E | 5 | 제목 "분석"과 description "전류 측정"을 약속하지만 본문은 모드 소개와 레지스터 코드 수준이다(루브릭 E 주석, 3~5점). |
| F | 6 | 216행 다음 편(워치독)이 seriesOrder 46과 맞고, 220~223행 관련 항목이 클럭·SysTick·워치독·RTC 글로 라벨대로 간다. |
| G | 1 | 출처가 없고, 29행 표는 F411 값인데 102·117행 코드는 168 MHz로 복귀한다. 대상 MCU가 하나로 고정되지 않는다. |

uncertainties:
- 29행 "F411 typ 30 mA" 출처 없음. F411의 최대 SYSCLK와 102행 `clock_init_168mhz()`가 양립하는지 미확인.
- 51행 Comparator, 52행 "STOP 1 only"는 F4가 아닌 family의 용어로 보인다. 미확인.
- 186행 "Schmitt trigger가 수십 µA" 출처 없음.

### part4-12-watchdog.md

`factcheck: 오류 확인` — 126행은 window를 W부터 0x40까지로 계산해 W = 0x60이면 32 step(25 ms)이라고 적었다. 같은 계산으로 221행이 "wide window"로 권한 W = 0x50은 16 step이라 코드 예제보다 오히려 좁다. 원문 안의 모순이라 판정은 `우선 조치`다. `score_status: 잠정`, blockers: 221행 권장값.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 39~50행 IWDG timeout 예(0.512·8.19·32.77 s, 검산 일치), 124~127행 WWDG step·window 계산, 92~116행 task check-in mask, 153~183행 reset 원인 판별과 기록 제안이 선택 기준을 준다. 217행은 3~5배 규칙 대신 "측정해야 합니다"로 끝난다. |
| B | 14 | IWDG·WWDG·멀티태스크·debug freeze·reset 원인·검증까지 별도 검색 없이 따라간다. 172~178행 플래그 판별 순서의 근거는 설명하지 않는다. |
| C | 8 | 189~199행 의도적 hang으로 reset을 확인하는 절차와 예상 LED 동작이 있다. LSI 편차를 반영한 실제 주기 측정은 없다. |
| D | 12 | 시리즈 안에서 워치독을 다루는 글은 이 글뿐이다. 4-05 인터럽트 글과는 ISR refresh 주의 정도만 닿는다. |
| E | 8 | 제목의 Independent vs Window 비교를 25~35행 표와 두 코드 예제로 이행한다. |
| F | 6 | 236행 다음 편(Flash)이 seriesOrder 47과 맞고, 240~243행 관련 항목이 라벨대로 간다. |
| G | 1 | 29·32행 LSI 32 kHz·±10% 같은 수치에 출처와 대상 part가 없다. |

uncertainties:
- 129~131행 `(1u << 8)`과 `(3u << 7)`이 bit 8을 겹쳐 쓴다. 주석(WDGTB = /8, EWI off)과 실제 필드 값이 맞는지 미확인.
- 56~61행 window 표의 "> 0x80 초기 상태" 행은 7-bit counter와 어떻게 맞는지 불명.
- 32행 LSI "±10%" 출처 없음.

### part4-13-flash-programming.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 286·292행 내비게이션 오류(F 감점 사유, 정확성 게이트 아님).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 25~38행 F411 sector 지도, 145~198행 append-only EEPROM 코드, 262~272행 linker에서 EEPROM 영역을 예약하는 예가 이 글의 것이다. 52~73행 시간·PSIZE 표는 모든 칸이 "device-specific"·"달라짐"이다. |
| B | 11 | erase·write·EEPROM·dual bank 흐름은 있지만 compact는 198행 한 문장이고, 제목의 Read While Write는 202행 완곡한 한 단락이다. 211행에 `TODO: TikZ` 주석이 남아 있다. |
| C | 6 | 218~235행 erase 후 0xFF 확인과 read-back 코드는 재현 가능하다. 239~242행 결과 칸은 "measure on the target device"라 비어 있고, 237행 "수백 ms 걸리므로"는 56~58행이 수치를 비워 둔 것과 맞지 않는다. |
| D | 12 | 3-12 Bootloader 체인과 OTA·bank 전환이 닿지만 내부 Flash erase·program은 이 글에만 있다. |
| E | 7 | erase·program은 이행했고 Read While Write는 부분 미이행이다. |
| F | 4 | 286행은 "다음 편부터 Part 5 — PWM"이라고 하지만 seriesOrder 48은 `part4-14-ddr-init-failure`다. 292행 "3-09: Bootloader 체인" 라벨은 `part3-12`로 간다. 둘 다 틀린 안내라 5점 이하다. |
| G | 1 | 출처·reference manual 판이 없다. 198행 "STM32CubeF4의 EEPROM emulation library가 표준 구현"도 링크·버전이 없다. |

병합 대상: 병합 대상 없음. 내부 Flash 조작을 다루는 다른 글이 없어 독립 역할은 있다. 다음 조치는 `보강` — 52~73행 표를 reference manual 값으로 채우거나 `TBD`로 바꾸고, 286·292행 안내를 고친다.

uncertainties:
- 248행 "PGAERR/PGSERR set" 조건 미확인.
- 40행 "보통 sector 1, 2", 166~168행 코드(sector 1만), 269행 linker(32K)가 서로 다른 범위를 가리킨다.
- 186행 `entry` 변수는 선언만 하고 쓰지 않는다.

### part4-14-ddr-init-failure.md

`factcheck: 검증됨` (커밋 `d3237cfb`, JEDEC 표준·Micron 데이터시트·U-Boot 드라이버 대조). `score_status: 잠정`(원문 수정 전), blockers: 없음.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 17 | 30~41행 DDR3 init 순서, 45~64행 timing을 cycle로 바꾸는 계산(13.75 / 1.25 = 11 등 검산 일치), 124~143행 address bus test와 March 테스트를 구분하는 설명, 203행 controller 계보(uMCTL2·MMDC)가 작성자 분석이다. 75·179행은 ZQCS 주기·length 허용 오차를 "벤더 문서 값을 그대로"로 넘겨 20점대는 아니다. |
| B | 14 | 표준·init·timing·calibration·training·테스트·보드·종단·온도까지 별도 검색 없이 따라간다. 제목의 "진단"에 해당하는 증상 → 원인 대응표가 없고, training 실패 시 다음 단계는 102행 주석 한 줄이다. |
| C | 8 | walking bit·address·패턴 테스트 코드와 memtester·MemTest86·U-Boot `mtest`(168행)가 있다. 실행 결과나 실패 로그 예는 없고 eye 측정(205~207행)은 한 문장이다. |
| D | 11 | Bootloader Internals 9·26장, BSP Development 5장이 DDR controller·training을 다루고 250~252행이 그 글들을 "더 깊이"로 연결한다. 첫 bring-up 점검이라는 역할은 구별되지만 training 설명이 겹친다. |
| E | 7 | 제목의 timing·calibration·walking bit test는 이행했고 "진단"은 부분 이행이다. |
| F | 7 | 245행 다음 편(PWM)이 seriesOrder 49와 맞고, 249~252행 관련 항목 네 개가 존재하며 라벨이 대상 제목과 맞는다. 다른 시리즈 심화 글을 "더 깊이"로 구분한 것은 이 글 고유의 안내다. H2가 17개라 목차가 길다. |
| G | 3 | 21·24행 JESD79-3F·JESD79-5C, 203행 U-Boot 드라이버 경로, 218행 `PGSR.IDONE`처럼 1차 출처를 본문에 이름으로 적었다. 링크·판 날짜·대조 시점이 없어 4점은 아니다. |

uncertainties:
- 129·134행 `log2(words)`는 words가 2의 거듭제곱이 아니면 최상위 주소 비트를 빠뜨린다.
- 235행 "반드시 동일 device 사용"은 대조 커밋 메시지에 없는 주장이다.
- 207행 "수 GHz BW" 측정 조건 출처 없음.

### part5-01-pwm-output.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 없음.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 45~46·83~84·152행 주파수 계산(20 kHz, 약 20.5 kHz, center-aligned 40 → 20 kHz, 검산 일치), 136행 공유 ARR의 결과, 176~202행 DMA로 CCR을 갱신하는 sine 출력이 있다. 66·212·234행은 resolution·주파수 선택을 "함께 결정/측정"으로 넘긴다. |
| B | 13 | 단일·RGB·complementary·DMA 네 예제와 함정 6개가 있다. 제목의 "모터 속도 제어"는 212행 한 단락이고, 187~198행 DMA 예제는 어떤 request인지 설명이 없다. |
| C | 7 | 코드는 실행 가능한 수준이지만 204~212행 측정 절은 다이어그램 한 장과 일반론이다. |
| D | 9 | 1-09 `pwm-signal`이 duty·frequency 선택·dead-time·complementary와 TIM1 예제를 다룬다. 이 글 138~174행 complementary 절과 같은 질문이다. |
| E | 6 | 제목이 "실전"과 모터 속도 제어를 약속하지만 모터는 한 단락이다. LED 부분은 이행했다. |
| F | 6 | 248행 다음 편(DC motor)이 seriesOrder 50과 맞고, 252~255행 관련 항목이 라벨대로 간다. |
| G | 1 | 출처가 없고, 45행 "APB1 × 2" 타이머 클럭 규칙의 근거 문서도 없다. |

병합 대상: `part1-09-pwm-signal.md` (dead-time·complementary·주파수 선택 중복). 1-09는 신호 개념, 이 글은 레지스터 구현이라 역할을 나눌 여지가 있으므로 다음 조치는 complementary·dead-time 설명을 1-09에 맡기고 이 글을 DMA 갱신·다채널 구현으로 좁히는 `보강`이다. 그게 어려우면 1-09로 병합한다.

uncertainties:
- 21행 "TIM2/3/4 같은 general purpose timer로 … complementary PWM"은 140·243행 "advanced timer만 지원"과 어긋난다(도입 문장의 범위 서술).
- 188~198행 TIM3 update DMA가 DMA1 Stream4 channel 5인지 미확인.
- 160행 BDTR dead-time 값 42가 몇 ns인지 적지 않았다.

### 시리즈 공통 문제

- 같은 H2 뼈대: `part4-14`를 뺀 9편(`part4-06`, `part4-07`, `part4-08`, `part4-09`, `part4-10`, `part4-11`, `part4-12`, `part4-13`, `part5-01`)이 "한 줄 요약 / 어떤 상황에서 쓰나 / 핵심 개념 / 코드 예제 / 측정·동작 확인 / 자주 보는 함정 / 정리 / 관련 항목"을 같은 순서로 쓴다. 루브릭 9절의 scaled content 사이트 신호라 개별 수정 전에 시리즈 구조를 재검토한다.
- 원문 내부 모순·산술 불일치(오류 확인 4편): `part4-06`(204↔206), `part4-09`(251↔163~167), `part4-11`(65↔67), `part4-12`(126↔221). 함정 제목·요약과 본문·코드가 따로 고쳐진 흔적이다.
- 본문 출처·버전 없음(G = 1): `part4-14`를 뺀 9편 전부.
- 완곡 표현과 빈 표: `part4-11`(27~32·172~178행), `part4-13`(52~73·239~242행), `part4-08`(19·45·64·188·243·247행), `part4-07`(53·238·258행).
- part1 하드웨어 글과 같은 질문: `part4-07`↔`part1-04`, `part4-08`↔`part1-05`, `part4-09`↔`part1-06`, `part5-01`↔`part1-09`.
- 제목 키워드 미이행: `part4-08`(Slave·CRC), `part4-09`(10-bit·clock stretching), `part4-11`(전류 측정), `part4-13`(Read While Write).
- 대상 MCU 혼용: `part4-07`(36행 F7/H7 언급과 F4 코드), `part4-10`(F4 코드와 H7/F7 cache), `part4-11`(F411 표와 168 MHz 코드), `part4-13`(F411 sector 지도와 STM32F4 일반 서술).
