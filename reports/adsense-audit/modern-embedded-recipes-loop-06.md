# Modern Embedded Recipes — 루프 06 (seriesOrder 50~59)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

## 결론

이번 루프의 10편은 산문 중앙값 3,313자다. 산문 2,500자 미만은 0편, 1,500자 미만은 0편이며, 코드가 산문보다 긴 글은 6편이다.

이번 결과는 공개 유지 여부를 확정하지 않는다. 외부 URL·실전 경험·출처의 자동 신호는 누락될 수 있으므로, 다음 정성 검토에서 원문 위치와 실제 절차를 확인해야 한다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 정성 검토 우선 | 6 | 코드 비중 또는 실전 신호를 먼저 확인할 후보. 최종 판정 아님 |
| 근거·실전성 검토 | 4 | 외부 출처·근거 신호를 우선 확인할 후보. 최종 판정 아님 |
| 1차 유지 후보 | 0 | 기계 신호만으로 유지 후보로 올릴 글 없음 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 외부 출처 없음 | 10 |
| 산문 <2500 | 0 |
| 산문 <1500 | 0 |
| 코드 우세 | 6 |
| 실전 신호 약함 | 1 |

## 검사 포인트

- 모터·디스플레이·센서·통신 글이 모두 장치 제어 예제 형식을 공유하므로, 장치별 독립적인 문제·트레이드오프·검증 절차가 있는지 비교한다.
- 서보 모터·SPI OLED·TFT·환경 센서·CAN·USB 글은 코드가 설명을 대체하지 않는지, 하드웨어 전제와 실패 조건이 설명되는지 확인한다.
- `part5-11-usb-device.md`는 프로토콜 범위가 넓으므로 개념 나열에 그치지 않고 실제 enumeration 또는 endpoint 진단 절차가 있는지 확인한다.
- `part5-08-environmental-sensors.md`는 센서 비교의 근거와 실제 측정 조건이 분리되어 제시되는지 확인한다.
- 외부 링크가 없다는 자동 신호만으로 출처 부재를 확정하지 않고, 원문에 표준명·제조사 문서·데이터시트가 인용 또는 명시되는지 확인한다.
- PWM 범위·분해능·샘플링 주기·통신 속도처럼 하드웨어 의존적인 수치는 적용 조건과 출처를 함께 확인한다.
- Abseil·Folly와 달리 Modern Embedded Recipes는 이 단계에서 일괄 제외하지 않는다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part5-02-dc-motor.md | DC 모터 제어 — H-Bridge·PWM Duty·Encoder Feedback | 3,802 | 3,073 | 0 | 6 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 2 | part5-03-stepper-motor.md | 스테퍼 모터 제어 — Full Step·Half Step·Microstepping | 3,573 | 3,175 | 0 | 4 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 3 | part5-04-servo-motor.md | 서보 모터 제어 — PWM 1ms~2ms·Closed Loop·PID | 2,923 | 3,600 | 0 | 4 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 4 | part5-05-character-lcd.md | Character LCD 제어 — HD44780·4-bit Mode·Custom Char | 3,525 | 3,384 | 0 | 2 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 5 | part5-06-spi-oled.md | SPI OLED 제어 — SSD1306·Frame Buffer·Page 단위 갱신 | 2,848 | 4,618 | 0 | 3 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 6 | part5-07-tft-display.md | TFT 디스플레이 구동 — RGB565·FSMC·LTDC·DMA2D | 3,126 | 3,817 | 0 | 1 | 8 | 코드 우세, 외부 출처 없음, 실전 신호 약함 | 정성 검토 우선 |
| 7 | part5-08-environmental-sensors.md | 환경 센서 활용 — BME280 온습압·SHT3x 비교 | 2,745 | 4,433 | 0 | 10 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 8 | part5-09-imu-sensor.md | IMU 센서 활용 — MPU6050·BMI270·Sensor Fusion | 3,514 | 3,233 | 0 | 4 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 9 | part5-10-can-communication.md | CAN 통신 구현 — bxCAN·Filter·Mailbox·CAN-FD | 3,501 | 5,026 | 0 | 2 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 10 | part5-11-usb-device.md | USB Device 기초 — Descriptor·Enumeration·Endpoint·HID/CDC | 3,106 | 4,053 | 0 | 5 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |

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

원문 10편을 직접 대조해 루브릭 7개 항목으로 잠정 점수화했다. 점수는 Google의 공식 점수나 승인 확률이 아니라 콘텐츠 품질·독립 가치·검증 가능성을 비교하기 위한 내부 지표다. P0 정책 차단 요소는 확인되지 않았다. 실제 장치·보드·센서·프로토콜 분석기 결과와 제조사 데이터시트·USB/CAN 표준 대조 전이므로 신뢰도는 중간이다.

### 요약

| 파일 | 점수 | 잠정 판정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part5-02-dc-motor.md` | **78/100** | 유지 후보 | H-bridge·shoot-through·driver 선택·ramp·current sensing을 연결한다 |
| `part5-03-stepper-motor.md` | **77/100** | 유지 후보 | step mode·current limit·timer pulse·acceleration ramp을 실제 제어 흐름으로 묶었다 |
| `part5-04-servo-motor.md` | **72/100** | 보강 | PWM·다채널·보정 코드는 있으나 제품별 pulse 범위·토크·closed-loop 주장이 불안정하다 |
| `part5-05-character-lcd.md` | **74/100** | 보강 후 유지 | HD44780 4-bit·초기화·CGRAM·I2C backpack까지 재현 범위가 넓다 |
| `part5-06-spi-oled.md` | **77/100** | 유지 후보 | SSD1306 초기화·framebuffer·그리기·partial DMA 갱신이 연결된다 |
| `part5-07-tft-display.md` | **75/100** | 보강 후 유지 | SPI/FSMC/LTDC·RGB565·double buffer를 장치 선택 문제로 설명한다 |
| `part5-08-environmental-sensors.md` | **75/100** | 유지 후보 | BME280 보정·SHT3x CRC·outlier 처리로 단순 센서 비교를 넘어선다 |
| `part5-09-imu-sensor.md` | **79/100** | 유지 후보 | register·calibration·sampling·complementary filter·INT 동기화가 실전적이다 |
| `part5-10-can-communication.md` | **78/100** | 유지 후보 | frame·bit timing·filter·error/bus-off·loopback을 하나의 진단 흐름으로 묶었다 |
| `part5-11-usb-device.md` | **77/100** | 유지 후보 | descriptor·endpoint·TinyUSB CDC/HID 예제와 enumeration 확인을 연결한다 |

### 항목별 점수

| 파일 | 독창성 25 | 완결성 20 | 실전 검증 15 | 중복/병합 15 | 검색 의도 10 | UX/내부링크 10 | 신뢰/출처 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part5-02-dc-motor.md` | 19 | 17 | 11 | 12 | 9 | 8 | 2 | **78** |
| `part5-03-stepper-motor.md` | 18 | 17 | 11 | 12 | 9 | 8 | 2 | **77** |
| `part5-04-servo-motor.md` | 16 | 15 | 9 | 11 | 9 | 8 | 4 | **72** |
| `part5-05-character-lcd.md` | 18 | 16 | 10 | 11 | 9 | 8 | 2 | **74** |
| `part5-06-spi-oled.md` | 18 | 17 | 11 | 12 | 9 | 8 | 2 | **77** |
| `part5-07-tft-display.md` | 18 | 16 | 10 | 11 | 9 | 8 | 3 | **75** |
| `part5-08-environmental-sensors.md` | 18 | 16 | 10 | 11 | 9 | 8 | 3 | **75** |
| `part5-09-imu-sensor.md` | 19 | 17 | 12 | 12 | 9 | 8 | 2 | **79** |
| `part5-10-can-communication.md` | 19 | 17 | 11 | 12 | 9 | 8 | 2 | **78** |
| `part5-11-usb-device.md` | 18 | 17 | 11 | 12 | 9 | 8 | 2 | **77** |

### 공통 근거와 우선순위

- 이번 루프는 장치별 코드뿐 아니라 실패 조건과 확인 절이 있어 실전성이 높다. DC 모터·스테퍼·IMU·CAN·USB는 서로 다른 문제를 풀므로 병합보다는 개별 유지가 적절하다.
- 모터 글은 전류 제한, 전원, 부하, dead-time, 가속 프로파일이 핵심이다. 드라이버 데이터시트와 실제 전류/온도/실속 조건을 기록해야 일반적인 제어 예제를 넘어선다.
- 디스플레이 글은 해상도·framebuffer·버스 대역폭·DMA·TE/vsync와 보드 RAM 조건을 함께 제시해야 한다. 단순 색상 코드와 드라이버 구현만으로는 충분하지 않다.
- 센서 글은 BME280 보정식, SHT3x CRC, IMU scale/filter처럼 독립 가치가 높다. 센서 정확도·샘플링·온도 drift·calibration 결과를 측정 조건과 함께 제시하는 것이 우선이다.
- CAN·USB는 표준 및 class/descriptor 동작이 버전·스택에 의존한다. loopback/virtual host만으로 끝내지 말고 실제 bus analyzer·호스트 enumeration 로그와 사용한 스택 버전을 고정해야 한다.
- 서보 글은 SG90/MG996R의 pulse·토크·전압이 제조사와 제품 변형에 따라 달라질 수 있어 현재 루프에서 가장 먼저 수치 출처를 보강할 대상이다.
- 이번 평가는 점수 기록만 수행했다. 원문 수정·비공개·삭제·URL 변경은 하지 않았다.

## v1.2 재평가 (2026-10-11)

루브릭 v1.2와 `docs/adsense-audit/anchors.md` 앵커 4편을 기준으로 10편 원문 전체를 다시 읽고 채점했다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다.

- factcheck는 git 이력으로 정했다. 이 루프의 10편은 출처 없는 `Qualify …` 커밋만 거쳐 모두 `미검증`이 기본값이다.
- 평가 중 외부 자료를 가져오지 않았다. `오류 확인`은 같은 글 안의 모순·산술 불일치를 두 위치로 보일 수 있을 때만 줬고, 기억에 기댄 의심은 `uncertainties`에 적었다.
- P0 확인 범위는 원문 본문, 내부 링크 대상의 존재와 라벨, 이미지 파일 존재 여부다. 렌더링·광고 배치는 보지 않았다. 10편 모두 P0 없음.
- 10편 모두 `score_status: 잠정`이다.
- 관련 항목의 "9-05: PID 제어 기본"은 링크가 없는 글자 항목이다. 실제 seriesOrder 9-05 글은 `part9-05-cas-patterns.md`(Compare-And-Swap 패턴)이고 PID 글은 시리즈에 없다. 라벨이 다른 글을 가리키는 관련 글 안내로 보고 F를 5점 이하로 뒀다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part5-02-dc-motor.md` | 13 | 11 | 7 | 12 | 6 | 6 | 1 | 56 | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md` |
| `part5-03-stepper-motor.md` | 12 | 12 | 7 | 12 | 8 | 5 | 1 | 57 | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md` |
| `part5-04-servo-motor.md` | 10 | 10 | 7 | 10 | 6 | 5 | 1 | 49 | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md` |
| `part5-05-character-lcd.md` | 11 | 14 | 8 | 13 | 8 | 6 | 1 | 61 | 미검증 | 보강 | 중간 | `part1-04-uart-hardware.md` |
| `part5-06-spi-oled.md` | 12 | 13 | 8 | 12 | 7 | 6 | 1 | 59 | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md` |
| `part5-07-tft-display.md` | 12 | 10 | 7 | 11 | 6 | 6 | 1 | 53 | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `part5-08-environmental-sensors.md` | 12 | 12 | 8 | 12 | 6 | 5 | 2 | 57 | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md` |
| `part5-09-imu-sensor.md` | 13 | 13 | 8 | 12 | 7 | 5 | 1 | 59 | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md` |
| `part5-10-can-communication.md` | 13 | 13 | 8 | 10 | 7 | 6 | 1 | 58 | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md` |
| `part5-11-usb-device.md` | 13 | 12 | 9 | 13 | 7 | 6 | 1 | 61 | 미검증 | 보강 | 중간 | `part7-05-kernel-build.md` |

### part5-02-dc-motor.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 없음.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 25~37행 H-bridge 스위치 조합과 brake·coast·shoot-through 표, 51~68행 sign-magnitude와 locked anti-phase 비교, 110~118행 brake·coast 함수, 166~189행 shunt → ADC → mA 변환(검산 일치)이 이 글의 것이다. 39~47행 driver 비교 표는 전류·전압 칸이 모두 "datasheet/thermal condition dependent"라 비교가 없다. |
| B | 11 | 제목의 Encoder Feedback이 본문에 한 번도 나오지 않는다. description의 역기전력 보호는 70~72·211~213행에 있다. |
| C | 7 | DRV8833·TB6612 코드와 over-current trip이 있지만 191~199행 측정 절은 다이어그램과 "측정하고 정합니다"다. |
| D | 12 | PWM 설정은 5-01과 같은 패턴이지만 H-bridge 방향·제동 제어는 이 글에만 있다. |
| E | 6 | 제목 키워드 셋 중 Encoder Feedback을 이행하지 않는다(부분 미이행). |
| F | 6 | 235행 다음 편(스테퍼)이 seriesOrder 51과 맞고, 239~242행 관련 항목이 PWM·모터 글로 라벨대로 간다. |
| G | 1 | driver IC 다섯 개(43~47행)를 들지만 datasheet 링크·판이 없다. |

병합 대상: 병합 대상 없음. DC 모터 H-bridge 제어를 다루는 다른 글이 없다. 다음 조치는 `보강` — Encoder 절을 쓰거나 제목에서 빼고, 41~47행 표를 datasheet 값 또는 `TBD`로 채운다.

uncertainties:
- 62~65행 locked anti-phase에서 75% duty를 "forward 25%"로 적었다. 평균 전압 기준이면 2D − 1 = 50%라 표현의 의미가 불명하다.
- 103~106행 reverse에서 AIN2 high + AIN1 PWM이면 duty가 클수록 제동 구간이 길어지는 배선으로 보인다. speed 매핑이 반전되는지 미확인.
- 231행 "L298 등 driver IC가 flyback 제공"은 213행 설명과 비교하면 driver별 차이를 단정한다. 미확인.
- 217행 "20~30 kHz는 한 가지 선택지"와 233행 "PWM 20 kHz+"의 어조가 다르다.

### part5-03-stepper-motor.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 254행 관련 항목.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 159~175행 v² = 2ad로 감속 시작점을 정하는 ramp 함수, 111~145행 timer IRQ step 생성, 29~34행 full-step 상 순서가 있다. 40~46행 표의 torque 칸은 "변동", 60~62행 VREF 식은 "driver-specific"이라 수치 판단 근거가 비었다. |
| B | 12 | step·ramp·micro-step·함정까지 이어지지만 159행 ramp 함수를 135행 timer 코드와 묶는 방법이 없고, micro-step 핀 매핑은 185행 주석이 "datasheet 확인"으로 넘긴다. |
| C | 7 | 104~108행 200 step/s → 5 ms/step, 205행 1000 step/s → 1 ms 주기처럼 예상 파형은 있으나 측정 결과·보드가 없다. |
| D | 12 | 모터 3편 중 step 위치 제어라는 질문은 이 글에만 있다. |
| E | 8 | 제목의 full·half·micro step을 모두 다룬다. |
| F | 5 | 254행 "9-05: PID 제어 기본"은 링크가 없고, 실제 9-05는 CAS 패턴 글이다. 247행 다음 편(서보)은 seriesOrder 52와 맞다. |
| G | 1 | DRV8825·A4988 datasheet 출처가 없다. 59행 VMOT 8 ~ 45 V도 근거 표기가 없다. |

병합 대상: 병합 대상 없음. 다음 조치는 `보강` — ramp와 timer 코드 연결, torque·VREF 칸 정리(`TBD` 또는 datasheet 값), 254행 수정.

uncertainties:
- 192~193행 1/16 = 0b100, 1/32 = 0b111 매핑이 DRV8825와 A4988 중 어느 표인지 미확인.
- 46행 "1/32 거의 무음" 근거 없음.
- 140행 빈 루프로 만든 STEP high 폭은 clock에 따라 달라지는데 225행 함정과 연결하지 않았다.

### part5-04-servo-motor.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 243행 관련 항목.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 167~188행 min·center·max 보정 구조체와 139~165행 보간이 이 글 고유다. 65~98·100~137행 PWM 설정은 5-01의 TIM3 코드와 같은 구조이고, 15·38·196·214·218·222행은 사양을 "datasheet 확인"으로 미룬다. |
| B | 10 | 제목의 Closed Loop·PID는 19행 "servo 내부에 PID가 들어 있다" 한 문장뿐이다. 190~200행 측정 절도 다이어그램과 두 문장이다. |
| C | 7 | 1 µs 분해능 TIM 설정(73~77행)과 clamp 코드는 재현 가능하다. 178행 `{550, 1480, 2400}  // 실측값`은 어느 servo에서 잰 값인지 없다. |
| D | 10 | 100~137행 4채널 TIM3 PWM 설정이 5-01 106~134행 RGB 예제와 레지스터 값까지 거의 같다. |
| E | 6 | 제목이 Closed Loop·PID를 내걸지만 본문은 개루프 PWM 지령만 다룬다(부분 미이행 하단). |
| F | 5 | 243행 "9-05: PID 제어 기본"이 링크 없이 CAS 패턴 글 번호를 가리킨다. 236행 다음 편(LCD)은 seriesOrder 53과 맞다. |
| G | 1 | 44·47행 SG90 1.8 kg·cm, MG996R 11 kg·cm에 출처가 없다. |

병합 대상: `part5-01-pwm-output.md`. 서보 고유 내용(pulse 매핑·보정·보간)은 5-01의 한 절 분량이고 나머지 PWM 설정은 5-01과 같다. 다음 조치는 제목에서 Closed Loop·PID를 빼고, 5-01로 합칠지 시리즈 구조 재검토에서 정한다.

uncertainties:
- 51행 "TIM 3개로 12 channel"과 232행 "12 channel 이상은 PCA9685"가 경계를 다르게 말한다.
- 206행 "대부분의 servo는 3.3V signal로도 동작" 출처 없음.
- 46행 digital servo "300 Hz 가능" 출처 없음.

### part5-05-character-lcd.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 없음.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 41~54행 4-bit 배선, 141~165행 init sequence, 205~236행 PCF8574 backpack 매핑과 코드가 있다. 범위는 HD44780 입문 자료의 표준 범위이고 선택 기준·비교는 없다. 19행 "전원 OFF에도 잔상이 없는 장점"은 무슨 뜻인지 불명하다. |
| B | 14 | 핀·배선·timing·DDRAM·CGRAM·init·custom char·I2C backpack·문제 해결 순서까지 별도 검색 없이 완성된다. busy flag 읽기는 62행 표에만 있고 코드는 고정 delay다. |
| C | 8 | 240~251행 contrast → backlight → init → 배선 순서의 진단 절차와 "E 핀이 명령마다 두 번 펄스"라는 관찰 기준이 있다. 실제 화면·파형 기록은 없다. |
| D | 13 | 시리즈에서 HD44780을 다루는 글은 이 글뿐이고, 5-06 OLED와는 출력 장치가 다르다. |
| E | 8 | 제목의 HD44780·4-bit mode·custom char를 모두 이행한다. |
| F | 6 | 287행 다음 편(SPI OLED)이 seriesOrder 54와 맞고, 291~294행 관련 항목이 GPIO·I2C·OLED·TFT 글로 라벨대로 간다. |
| G | 1 | HD44780 datasheet 인용이 없다. 71~72행 1.52 ms·37 µs도 출처 표기가 없다. |

uncertainties:
- 91행은 heart를 "code 0x01"이라 적었지만 197·201행 코드는 code 0을 쓴다.
- 50행 배선은 DB0~3을 GND에 묶는데 39행은 "사용하지 않는 핀을 임의로 bus에 연결하지 않는다"고 적었다.
- 238행 "I2C는 delay가 자동으로 ms 단위" 근거 없음.
- 242행 확인 문자열 "HELLO WORLD"와 200행 데모 문자열 "Hello LCD"가 다르다.

### part5-06-spi-oled.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 없음.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 41~52행 page 구조와 149~155행 좌표 → byte·bit 계산, 166~181행 Bresenham, 211·244행 1024 byte @ 10 MHz ≈ 820 µs(검산 일치)가 있다. 54·68행 orientation·charge pump는 "확인해야"로 넘긴다. |
| B | 13 | init → framebuffer → 그리기 → 글자 → DMA flush → 진단까지 흐름이 닫힌다. description의 partial update와 제목의 "Page 단위 갱신"은 구현이 없고, 209행 "Partial update — DMA" 절은 1024 byte 전체를 보낸다. |
| C | 8 | 235~245행 진단 목록과 계산된 transaction 시간이 있다. 214~224행 DMA 예제는 4-08의 stream 설정에 기대며 이 글에 초기화가 없다. |
| D | 12 | 96~111행 SPI 송신 함수가 5-07 77~92행 ILI9341 함수와 같지만 page 구조 framebuffer는 이 글에만 있다. |
| E | 7 | SSD1306·frame buffer는 이행했고 page 단위 갱신은 미이행이다. |
| F | 6 | 281행 다음 편(TFT)이 seriesOrder 55와 맞고, 285~288행 관련 항목이 라벨대로 간다. |
| G | 1 | SSD1306 datasheet 인용과 71~88행 init 값의 출처가 없다. |

병합 대상: 병합 대상 없음. SSD1306 framebuffer는 독립 검색 의도가 있다. 다음 조치는 `보강` — page 단위 dirty 갱신을 구현하거나 제목·description에서 뺀다.

uncertainties:
- 279행 "DMA flush로 CPU 0%"는 211행 "setup·cache 관리·completion 처리는 CPU가 수행"과 어긋난다.
- 237행 "5V는 OLED 파괴"가 regulator를 단 모듈에도 해당하는지 미확인.
- 221~223행 TX DMA만 켜면 4-08 설정의 RXDMAEN과 함께 RX overrun이 생기는지 미확인.

### part5-07-tft-display.md

`factcheck: 오류 확인` — 56행은 240 × 320 × 2 framebuffer를 153 KB로 적었고, 60행은 "STM32F411 (128 KB SRAM)은 240×320만 가능"이라고 적었다. 153 KB는 128 KB보다 커서 같은 글의 수치로는 60행이 성립하지 않는다(235행은 같은 논리로 261 KB를 link error로 판단한다). 원문 안의 산술 모순이라 판정은 `우선 조치`다. `score_status: 잠정`, blockers: 60행.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 52~60행 해상도별 framebuffer 표, 147~171행 LTDC 타이밍 레지스터, 186~211행 vsync swap ISR이 있다. 19·29~31행 인터페이스 표는 칸 대부분이 "~에 따라 결정"이다. |
| B | 10 | 제목의 FSMC는 30행 표 한 칸이고 DMA2D는 본문에 없다. SPI와 LTDC 두 경로는 코드로 완결된다. |
| C | 7 | 135행 153600 byte @ 30 MHz ≈ 41 ms, 227행 HSYNC 18 kHz는 검산된다. 그러나 227행의 한 frame 300 line은 157행 TWCR 설정(288 line)과 다르다. 측정 결과는 없다. |
| D | 11 | 77~92행 SPI 송신 함수가 5-06과 같고, framebuffer·DMA 주제가 12-09 zero-copy와 닿는다. |
| E | 6 | 제목 키워드 넷 중 FSMC·DMA2D를 이행하지 않는다(부분 미이행). |
| F | 6 | 265행 다음 편(환경 센서)이 seriesOrder 56과 맞고, 269~272행 관련 항목이 라벨대로 간다. |
| G | 1 | ILI9341·LTDC 문서 인용이 없다. 57행 "STM32F7-DISCO LCD"는 보드 이름뿐이다. |

uncertainties:
- 135행 "DMA로 옮기면 CPU 0%"는 182행 "DMA/cache coherency 관리는 별도로 필요"와 어긋난다.
- 255행 backlight "100% 30 mA, 50% 15 mA"는 출처·패널이 없다.
- 166행 CFBLR line length의 "+3" 값 근거 미확인.

### part5-08-environmental-sensors.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 296행 관련 항목.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 116~147행 BME280 calibration 읽기(H4·H5 nibble 분할 포함), 176~207행 SHT3x CRC-8 코드, 212~234행 median 필터, 253행 손·입김으로 하는 동작 확인이 있다. 29·32행 BME280 사양은 "datasheet 확인"으로 비워 두었다. |
| B | 12 | 두 센서 driver는 완결되지만 제목의 "비교"(정확도·전력·인터페이스 차이) 절이 없다. 164·165행 `compensate_pres`·`compensate_humid`는 정의 없이 169행 "Bosch reference에서 가져옴"이다. |
| C | 8 | 241~253행 정상값·이상값·손/입김 테스트로 동작을 판단하는 기준이 있다. 정상값의 측정 환경은 없다. |
| D | 12 | 4-09 I2C와 driver 패턴이 닿지만 센서 보정·CRC는 이 글에만 있다. |
| E | 6 | 제목의 "SHT3x 비교"를 이행하지 않는다(부분 미이행). |
| F | 5 | 296행 "9-05: PID 제어 기본"은 센서 글과 무관하고 실제 9-05는 CAS 패턴 글이다. 289행 다음 편(IMU)은 seriesOrder 57과 맞다. |
| G | 2 | 64행에 Bosch 공식 driver 저장소 `BoschSensortec/BME280_driver`를 이름으로 적었다. 링크·버전·datasheet 판은 없다. |

병합 대상: 병합 대상 없음. 다음 조치는 `보강` — BME280과 SHT3x 비교 절을 쓰거나 제목을 바꾸고, 296행을 고친다.

uncertainties:
- 249~251행 이상값(-40 °C, +85 °C, P = 0)과 원인 대응 근거 없음.
- 271행 self-heating "+0.5 °C" 출처 없음.
- 287행 "외부 pull-up 4.7 kΩ"을 고정값처럼 적었지만 4-09 239행은 4.7 kΩ을 "흔한 예시일 뿐"이라고 했다(시리즈 안 불일치).

### part5-09-imu-sensor.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 330행 관련 항목.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 61~75행 scale 표와 159~164행 환산, 169~199행 gyro bias 평균, 202~238행 accel roll/pitch와 complementary filter, 307~309행 I2C 대역 계산이 이어진다. Madgwick·Kalman은 242행에 이름만 있다. |
| B | 13 | 레지스터·환산·보정·fusion·INT 동기화·확인까지 있다. 제목의 BMI270은 21행 한 문장뿐이고 코드가 없으며, magnetometer 보정은 103~106행 bullet이다. |
| C | 8 | 278~287행 평평한 책상·90° 회전 시 예상 값과 drift 판단 기준이 있다. 실제 측정 로그는 없다. |
| D | 12 | 시리즈에서 IMU를 다루는 글은 이 글뿐이다. |
| E | 7 | MPU6050과 sensor fusion은 이행했고 BMI270은 미이행이다. |
| F | 5 | 330행 "9-05: PID 제어 기본"이 링크 없이 CAS 패턴 글 번호를 가리킨다. 323행 다음 편(CAN)은 seriesOrder 58과 맞다. |
| G | 1 | 47~57행 MPU6050 register map의 출처(datasheet·register map 문서)가 없다. |

병합 대상: 병합 대상 없음. 다음 조치는 `보강` — BMI270 예제를 쓰거나 제목에서 빼고, 330행을 고친다.

uncertainties:
- 309행 "14 byte @ 400 kHz = 280 µs"는 데이터 비트만 센 값이다. 주소·ACK 비트를 넣으면 더 길다.
- 187행 gyro_calibrate는 2 ms 간격으로 읽는데 135행 sample rate는 100 Hz라 같은 샘플을 반복해 읽는다.
- 305행 DLPF 권장값(drone 44 Hz, 일반 10 Hz) 출처 없음.

### part5-10-can-communication.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 없음.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 50~62행 bit timing 계산(2 µs, 85.7%, 검산 일치), 130~160행 mask·pass-all filter, 163~188행 mailbox 송신, 190~233행 RX FIFO ring, 235~246행 loopback이 실제 구현 순서를 따른다. 64행은 87.5%를 "고정 권장값이 아니다"라고 했다가 297행 정리에서 "87.5% 권장"으로 돌아간다. |
| B | 13 | 송수신·filter·error 상태·검증까지 완결된다. 제목의 CAN-FD는 본문에 없고, bus-off 복구는 91행 "규격 조건 또는 controller 절차"로 끝난다. |
| C | 8 | 250~263행 두 보드 + transceiver 구성, 정상 송수신 예, TEC 증가로 ACK 문제를 판단하는 절차가 있다. |
| D | 10 | 1-10 `can-electrical`의 차동 신호·120 Ω 종단·sample point 절과 pass-all filter 코드가 이 글 25~36·50~64·150~160행과 겹친다. CAN-FD는 오히려 1-10에만 있다. |
| E | 7 | bxCAN·filter·mailbox는 이행했고 CAN-FD는 미이행이다. |
| F | 6 | 301행 다음 편(USB)이 seriesOrder 59와 맞고, 305~308행 관련 항목 네 개가 존재하며 라벨과 맞는다. 308행 Matter·Thread는 주제 연관이 약하다. |
| G | 1 | ISO 11898·CiA 문서 인용이 없다. 61행 "CiA recommended 87.5%"도 문서 번호가 없다. |

병합 대상: `part1-10-can-electrical.md` (전기 특성·bit timing·pass-all filter 중복, CAN-FD는 1-10에만 있음). 다음 조치는 제목에서 CAN-FD를 빼거나 1-10과 역할을 다시 나눌지 시리즈 구조 재검토에서 정한다. 드라이버 코드(130~246행)는 1-10에 없으므로 통째 병합보다 차별화 `보강`이 우선이다.

uncertainties:
- 19행 "OBD-II가 곧 CAN" 단정 미확인.
- 113행 NART(자동 재전송 끔) 설정과 259행 "TEC가 +8씩 증가"하는 관찰 시나리오의 관계 미확인.
- 61행 sample point 87.5% 권장의 출처 미확인.

### part5-11-usb-device.md

`factcheck: 미검증`, `score_status: 잠정`, blockers: 없음.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 92~135행 TinyUSB 설정·descriptor, 139~166행 CDC echo, 170~184행 printf retarget, 186~222행 vendor HID report descriptor, 250~265행 `lsusb`·`dmesg` 확인이 PC 연결까지 한 흐름이다. 15·39·295행 "직접 쓰지 마세요"는 근거 없는 단정이다. |
| B | 12 | CDC는 완결이지만 HID 예제는 122~126행 configuration descriptor에 HID interface가 없어 그대로는 enumerate되지 않는다. 제목의 Enumeration 과정(reset·주소 할당·descriptor 요청 순서)은 설명이 없다. |
| C | 9 | 250~261행 명령과 예상 출력(`ID cafe:4001`, `ttyACM0`, echo)이 있어 재현 절차가 분명하다. MCU·TinyUSB 버전·호스트 OS는 없다. |
| D | 13 | 시리즈에서 USB device를 다루는 글은 이 글뿐이다. |
| E | 7 | descriptor·endpoint·HID/CDC는 이행했고 Enumeration은 부분 미이행이다. |
| F | 6 | 301행 다음 편(Ethernet)이 seriesOrder 60과 맞고, 305~308행 관련 항목 네 개가 존재하며 라벨과 맞는다. |
| G | 1 | TinyUSB 저장소·버전, USB 2.0 규격·class 명세 인용이 없다. |

uncertainties:
- 279행 "직렬 22 Ω가 표준"이 STM32F4 OTG FS 내장 PHY 구성에도 해당하는지 미확인.
- 123행 configuration total length 75가 CDC descriptor 길이와 맞는지 미확인.
- 240행 `tud_hid_keyboard_report` 인자 형태가 현재 TinyUSB API와 맞는지 미확인.

### 시리즈 공통 문제

- 같은 H2 뼈대: 10편 전부(`part5-02`~`part5-11`)가 "한 줄 요약 / 어떤 상황에서 쓰나 / 핵심 개념 / 코드 예제 / 측정·동작 확인 / 자주 보는 함정 / 정리 / 관련 항목"을 같은 순서로 쓴다. 루브릭 9절의 scaled content 사이트 신호라 개별 수정 전에 시리즈 구조를 재검토한다.
- 제목 키워드 미이행(8편): `part5-02`(Encoder Feedback), `part5-04`(Closed Loop·PID), `part5-06`(Page 단위 갱신), `part5-07`(FSMC·DMA2D), `part5-08`(SHT3x 비교), `part5-09`(BMI270), `part5-10`(CAN-FD), `part5-11`(Enumeration). 제목 일괄 재작성 또는 절 보강 결정이 먼저다.
- 없는 관련 글 "9-05: PID 제어 기본": `part5-03`(254행), `part5-04`(243행), `part5-08`(296행), `part5-09`(330행). 실제 9-05는 CAS 패턴 글이다.
- 본문 출처·버전 없음: 10편 모두 G ≤ 2(`part5-08`만 Bosch 저장소 이름).
- 빈 비교 표·완곡 표현: `part5-02`(41~47행), `part5-03`(40~46·52~62행), `part5-07`(27~31행), `part5-08`(27~33행), `part5-04`(15·38·196·214·218·222행).
- 본문은 완곡하게 고치고 정리·요약은 단정으로 남은 불일치: `part5-02`(217↔233행), `part5-06`(211↔279행), `part5-07`(135↔182행), `part5-10`(64↔297행).
- 환경 없는 측정값: `part5-04`(178행 "실측값"), `part5-07`(255행 backlight 전류), `part5-08`(243~245·271행).
