# Modern Embedded Recipes — 루프 05 (seriesOrder 40~49)

> 분석 단계: 루브릭 기반 검사·분류 1차  
> 대상: 공개 글 10편  
> 기준: AdSense 공개 글 평가 루브릭  
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

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

