# 공개 글 AdSense 평가 — 루프 25

> 대상: 공개 글 10편 (ESP32-C3 Mastering `seriesOrder` 5~12, GDB and LLDB `seriesOrder` 1~2)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 스물다섯 번째 루프다. 대상은 `src/content/blog/embedded/riscv/esp32-c3-mastering/`의 chapter05~chapter12(시리즈 끝까지) 8편과 `src/content/blog/tools/debugging/gdb-lldb/`의 chapter01~chapter02 2편이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `esp32-c3-mastering/chapter05-uart-spi-i2c-i2s.md` | 11 | 11 | 6 | 11 | 6 | 5 | 2 | **52** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `esp32-c3-mastering/chapter06-adc-touch.md` | 10 | 10 | 6 | 12 | 4 | 4 | 2 | **48** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `esp32-c3-mastering/chapter07-wifi-stack.md` | 12 | 11 | 7 | 11 | 7 | 7 | 2 | **57** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `esp32-c3-mastering/chapter08-ble-gap-gatt.md` | 11 | 11 | 6 | 12 | 7 | 5 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `esp32-c3-mastering/chapter09-esp-idf-build.md` | 10 | 11 | 7 | 10 | 5 | 5 | 2 | **50** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `esp32-c3-mastering/chapter10-freertos.md` | 11 | 11 | 6 | 9 | 7 | 5 | 2 | **51** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `esp32-c3-mastering/chapter11-security.md` | 14 | 12 | 7 | 11 | 7 | 5 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `esp32-c3-mastering/chapter12-power-management.md` | 12 | 12 | 6 | 10 | 6 | 5 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `gdb-lldb/chapter01-intro-and-install.md` | 9 | 11 | 7 | 10 | 5 | 5 | 3 | **50** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `gdb-lldb/chapter02-basic-commands.md` | 9 | 11 | 7 | 9 | 7 | 7 | 2 | **52** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |

평균 52.5점(10편, 합 525점), 범위 48~58점이다. 판정은 우선 조치 6편, 병합 검토 4편이고 유지·검증 대기·보강·제외 검토는 없다. 10편 모두 점수 구간은 병합 검토(40~59)이며, gdb-lldb chapter01은 시리즈 첫 글·허브라 점수 구간 판정이 보강이지만 오류 확인 때문에 우선 조치가 됐다. 오류 확인은 6건(ESP32-C3 ch05·ch06·ch08·ch11·ch12, gdb-lldb ch01)이고 모두 원문 내부 모순·산술 불일치로 판정했다. 1차 자료를 열어 확인한 오류는 없다. 10편 모두 git log에 1차 자료 대조 커밋이 없어 '검증됨'은 0편이다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다. ESP32-C3 시리즈 12편을 한 커밋(7b2b5e69)으로 쓴 이력과 공통 H2 뼈대는 글 단위 P0가 아니라 시리즈 단위 scaled content 점검 대상으로 넘겼다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `esp32-c3-mastering/chapter05-uart-spi-i2c-i2s.md` | 52 | 52 | 0 | 없음 |
| `esp32-c3-mastering/chapter06-adc-touch.md` | 48 | 48 | 0 | 없음 |
| `esp32-c3-mastering/chapter07-wifi-stack.md` | 57 | 57 | 0 | 없음 |
| `esp32-c3-mastering/chapter08-ble-gap-gatt.md` | 54 | 54 | 0 | 없음 |
| `esp32-c3-mastering/chapter09-esp-idf-build.md` | 50 | 50 | 0 | 없음 |
| `esp32-c3-mastering/chapter10-freertos.md` | 51 | 51 | 0 | 없음 |
| `esp32-c3-mastering/chapter11-security.md` | 58 | 58 | 0 | 없음 |
| `esp32-c3-mastering/chapter12-power-management.md` | 53 | 53 | 0 | 없음 |
| `gdb-lldb/chapter01-intro-and-install.md` | 50 | 50 | 0 | 없음 |
| `gdb-lldb/chapter02-basic-commands.md` | 52 | 52 | 0 | 없음 |

- 판정을 바꾼 글: chapter11-security는 평가자가 미검증·병합 검토로 냈으나 더블 체크에서 오류 확인·우선 조치로 올렸다. 평가자가 불확실 목록에 '절차상 모순 의심'으로만 남긴 232행 대 108~111행은 원문만으로 성립하는 내부 모순이다(AP-C-24: 평가자가 본 내부 모순은 메모가 아니라 오류 확인). 점수 58은 그대로이고, 새 모순은 이미 B ≤ 13 상한 안에서 반영된다.
- 추가한 오류 확인: chapter11 161행 'SPI_BOOT_CRYPT_CNT를 1로 burn (Development = 홀수)'와 184행 '3 또는 7로 burn (Release = 마지막 비트도 burn)'. 3·7도 홀수라 홀짝 구분이 성립하지 않고 3(0b011)은 3비트 필드의 마지막 비트가 켜지지 않은 값이다. 보조로 138행 '한 번 burn 후 RD_DIS=1'과 183·187행 'Release에서 RD_DIS·WR_DIS를 burn'.
- 추가한 오류 확인: chapter06 28행 'ADC1_CH4 = GPIO4'(+29행 핀 목록 GPIO4)와 35행 'CH4는 별도 IO가 아닌 내부 reference channel'.
- 추가한 오류 확인: chapter08 L56 'S=2 또는 S=8 … 거리 4배'와 L60·L62 표(1M ~30 m, Coded S=2 ~60 m = 2배). 판정은 이미 L296 MTU 산술로 오류 확인이라 바뀌지 않는다.
- 기각한 오류 확인 근거: chapter06 216행 'RC low-pass filter (1 kΩ + 100 nF) | 100 Hz 이상 cutoff' 대 계산값 약 1.59 kHz. '100 Hz 이상'을 차단 주파수가 100 Hz 이상이라는 뜻으로 읽으면 함께 참일 수 있어 uncertainties로 옮겼다. 오류 확인 판정은 description 대 15·260행, 73·80행 대 116~117행, 28 대 35행 근거로 유지된다.
- chapter12 F 근거: 241행 라벨이 대상과 맞지 않는다는 평가자 지적을 뺐다(시리즈 추천 링크가 첫 장으로 가는 것은 정상). F 5는 244행 링크 없는 'FreeRTOS Mastering' 추천 때문에 유지했다.
- 근거 보강(점수 영향 없음): chapter05 B에 223행 외부 풀업 필수 대 207·214~215행 내부 풀업 예제 불일치, chapter07 B에 212행 Security 2 권장 대 209행 SECURITY_1, chapter10 B에 231~238·257~268행 함수 밖 조각, chapter02(gdb) C에 202행 $1 = 42와 222행 $1 = {field1 …}이 다른 세션 값이라는 점, gdb chapter01 factcheck에 L281·L297 `int result` 9행(실제 11행)을 추가했다.
- 줄 번호 보정(점수 영향 없음): chapter05 D(ch04 65~75·395행), chapter07(123행, ch01 97행, ch12 42~45·26·47행), chapter08 p0 내부 링크 4개(대상 파일 3개), chapter09 factcheck(6205e212는 seriesOrder 재정렬, 575ac7e8 추가)·196·214행, chapter10 D(ch12 83행, part6-07 60~74행), chapter12 D(ch10 188~199·208행, ch03 331~333행), gdb ch02 D(recipes 10-03 76~97행).
- 부풀림 판정은 10편 모두 없음이다. 최종 점수는 1차와 같다.

## 글별 근거

### `esp32-c3-mastering/chapter05-uart-spi-i2c-i2s.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순(루브릭 3-1). 278행 앞 문장은 128×64 OLED 한 프레임 1024 bytes가 400 kHz I2C에서 '약 22 ms'라고 적고, 같은 행 뒷 문장은 '30 fps를 노리면 I2C는 부족'하다고 결론짓는다. 30 fps의 프레임 예산은 약 33.3 ms이고 22 ms는 그 안에 들어가므로(약 45 fps) 두 진술은 동시에 참일 수 없다. 렌더 시간·오버헤드 같은 다른 근거는 글에 없다. git log(ac24bb76 제목 변경, fa55144d 링크 일괄 수정, be973200·0a9dd7bc 메타데이터 등)에 1차 자료 대조 커밋이 없어 오류가 없었더라도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | C3 페리퍼럴 수·속도 비교표(23~31행), OLED 프레임 시간 계산(278행), 크기별 메커니즘 선택 규칙(348~352행), 자주 하는 실수 6개(356~392행)가 이 글의 몫이다. 나머지는 ESP-IDF 드라이버 API 사용 예(41~89, 100~127, 202~220, 286~327행)로 공식 문서 예제 수준이다. 32/512 bytes 기준(350~352행)과 64/1024 bytes 표(159~163행)는 출처 없이 서로 다른 값을 내고, 376행 '동작하는지 확인합니다', 392행 '해결되는 경우가 많습니다'는 완곡 표현이라 일반론으로 본다. 앵커 part1-04(A 10)보다 ESP-IDF 특화 함정이 조금 더 있다. |
| B | 11 | 인터페이스 4종을 설정→예제→실습 흐름으로 다루고 정리(394~402행)까지 있다. 그러나 133~157행 'Polling vs Queued vs DMA'의 1번(142행)과 3번(156행)이 같은 `spi_device_polling_transmit` 호출이라 메커니즘 차이를 코드로 보이지 못하고, 159~163행과 350~352행의 경계값이 다르다. 223행은 400 kHz 이상에서 외부 풀업이 필수라면서 207·214~215행 예제는 400 kHz에 내부 풀업만 켠다. 예제 핀 충돌(UART TX 7=SPI MOSI 7, 45·104행; I2C 4·5=I2S BCK/WS 4·5, 205·206·289·290행)도 적지 않았다. 정확성 문제가 열려 있어 AP-C-24에 따라 B ≤ 13이다. |
| C | 6 | 실행 환경(보드, ESP-IDF 버전)·예상 출력이 없다. 레거시 `driver/i2c.h`(203행)와 v5 계열 `driver/i2s_std.h`(287행)·`UART_SCLK_DEFAULT`(56행)가 섞여 한 IDF 버전에서 재현되는지 알 수 없다. 22 ms(278행), 내부 풀업 약 45 kΩ(223행), 5.4 ms(338행), 32/512 bytes(350~352행)는 출처·환경 없는 수치라 C ≤ 8이다. 측정 절차도 없다. |
| D | 11 | 같은 시리즈 `chapter04-gpio-ledc-pwm.md`: UART1 GPIO 7·8 설정(본 글 50~62행 vs ch04 65~75행), IO MUX 80 MHz·Matrix 40 MHz 설명(본 글 386~388행 vs ch04 83~90·395행)이 반복된다. `chapter06-adc-touch.md`는 겹침 없음. 다른 시리즈 `modern-recipes/part5-06-spi-oled.md`와 SSD1306 init(본 글 259·264행 vs 72·77행)·1024 byte 프레임(본 글 278행 vs 51·211행)이 겹치지만 I2C·ESP-IDF 대 SPI·STM32로 역할이 갈린다. modern-recipes part4-07~4-10은 STM32 드라이버 글이다. |
| E | 6 | 제목(2행)의 네 키워드와 description(5행)의 'DMA 활용, 인터럽트 vs polling'은 각 절과 340~354행에서 다룬다. '분석'에 비해 본문은 API 사용 예와 출처 없는 경험 규칙(348~352행)이고, 비교표(342~346행)는 '중·높음' 같은 정성값뿐이다. |
| F | 5 | 406행 다음 편 'Ch 6: ADC·터치 센서'는 seriesOrder 6 `chapter06-adc-touch.md`와 맞고 411·412행 링크 라벨도 맞다. 그러나 413행 'Modern Embedded Recipes Part 4.7: DMA descriptor 설계'와 414행 'Practical RTOS Internals Part 2.5: ISR + queue 패턴'은 링크 없는 텍스트이고, modern-recipes part4-07은 uart-driver(DMA 글은 part4-10-dma-basics)라 번호도 다르다. |
| G | 2 | 415~417행 ESP-IDF SPI Master·I2C·I2S API 문서 링크는 관련 항목 목록에 있고 'latest' 경로라 버전이 없으며 본문 주장과 연결되지 않는다. 컨트롤러 수(25행)·최대 속도(28행)·내부 풀업 값(223행)에 TRM·데이터시트 인용이 없고, 245·401행 'ESP-IDF 4.x 이상'만 있다. |

uncertainties:
- 17·25행 'SPI 2개(GP-SPI 2/3)': C3의 범용 SPI는 GP-SPI2 하나로 기억하나 TRM·`soc_caps.h`로 확인하지 않았다.
- 28행 최대 속도(UART 5 Mbps, I2C 1 MHz, I2S 24 Mbps)는 C3 TRM으로 확인하지 않았다.
- 338행 '기본 2 descriptor, 240 sample/desc (= 약 5.4 ms)': 5.4 ms는 descriptor 1개 분량이고 2개 합은 약 10.9 ms라 표현이 모호하다. `I2S_CHANNEL_DEFAULT_CONFIG` 기본값도 미확인.
- 245·401행 'ESP-IDF 4.x 이상'의 `i2s_channel_write`: 새 I2S 드라이버는 v5.0 이후로 기억하나 미확인.
- 324행: STEREO 슬롯(302행)에 16-bit 샘플을 하나씩 쓰면 L/R이 번갈아 채워져 의도한 440 Hz와 다를 수 있다.
- 165행 'polling_transmit은 내부적으로 DMA를 활용'과 156행을 DMA 예로 든 서술은 ESP-IDF 문서로 확인하지 않았다.
- 223행 내부 풀업 '약 45 kΩ'은 출처 없음. 392행 'i2c_filter_enable 비활성'이 clock stretching 대책인지 미확인.
- 159~163행과 350~352행 경계값 차이는 둘 다 경험 규칙이라 오류 확인 대신 B 감점으로 처리했다.

점수 구간 메모(병합 검토 구간): 병합 대상 없음. ESP-IDF 기준 C3 시리얼 4종을 다루는 다른 글이 없고 ch04·modern-recipes part5-06과는 역할이 구별된다. 다음 조치는 보강이다(278행 산술 모순 수정, 159~163행과 350~352행 경계값 통일 또는 삭제, 413·414행 관련 항목을 실제 글로 연결하거나 삭제, ESP-IDF 버전과 TRM 출처 명시).

### `esp32-c3-mastering/chapter06-adc-touch.md` — 48점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 세 건(루브릭 3-1). (1) 5행 description '정전식 터치 9 채널'과 15행 '터치 센서는 없습니다', 260행 'C3에는 터치 페리퍼럴이 없습니다'. (2) 73·80행은 `ADC_ATTEN_DB_12`로 설정하고 46행 표는 이 설정의 범위를 '0 ~ 3.10 V'라고 적는데, 116~117행 fallback은 같은 설정에서 full-scale 1100 mV를 가정해 `raw * 1100 / 4095`로 변환한다. (3) 28행 'ADC1_CH4 = GPIO4'와 29행 핀 목록 GPIO4, 35행 'CH4는 별도 IO가 아닌 내부 reference channel'. git log(0a9dd7bc slug 고정, be973200 topic, fa55144d 링크 일괄 수리, ac24bb76 제목 변경과 그 이전 작성·형식 커밋)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | oneshot·cali·continuous 코드(56~94행, 156~203행)는 ESP-IDF 공식 예제 흐름 수준이다. 이 글에만 있는 것은 배터리 분압·누설 전류 계산(127행, 4.2 V/200 kΩ = 21 µA, 산술 맞음)과 터치 대안 표(268~271행, 285~289행)다. 209행 '유효 bit 10~11', 256행 '64 sample 평균 + median + EMA가 센서급 안정성', 275행 'official 예제에 이 패턴'(예제 이름 없음)은 근거 없는 단정이다. |
| B | 10 | 사양(21~50행) → oneshot → eFuse → 배터리 실습 → continuous → 노이즈 → 터치 대안 → 함정 → 정리(324~332행) 흐름은 완결된다. 코드 조각은 완결되지 않는다(113행 `cfg`, 117행 `voltage_mv`·`raw` 미선언, 242행 `int_compare` 미정의). 터치 대안 2·3(273~279행)에는 코드·회로가 없다. 오류 확인 3건이 열려 있어 B ≤ 13이다. |
| C | 6 | 실제 API 코드(56~94행, 156~203행)는 있지만 ESP-IDF 버전·보드·예상 출력이 없다. 150행 '32회 평균으로 ±2 mV', 30행 '최대 ~2 MSPS', 302행 '0~50 mV로 보정', 300행 '100~200으로 깔린다'는 측정 환경·출처 없는 수치라 C ≤ 8이다. 합격·실패 기준이 있는 측정 절차가 없다. |
| D | 12 | 같은 시리즈: chapter05는 ADC를 31·96·282행에서 한 줄씩만 언급하고 chapter07(WiFi)은 겹치지 않는다. chapter01-overview 35~36·41행이 이 글 15·17·260행과 겹치고, chapter12 68~70행 GPIO wake 코드가 이 글 291~295행과 같다. 다른 시리즈: `modern-recipes/part1-07-adc-principles.md` 141행(잔류 전하)이 316~318행 charge sharing 함정과, 145행(star ground)이 219행 단일점 접지와 겹친다. `esp_adc`·`adc_oneshot`을 쓰는 다른 글은 grep으로 찾지 못했다. |
| E | 4 | 제목(2행) 'ADC와 터치 센서'와 description(5행) '정전식 터치 9 채널'은 터치 센서 내용을 약속하지만 본문은 15·260행에서 터치 센서가 없다고 하고 258~296행에서 대안만 짧게 다룬다. description이 본문과 반대다. ADC 부분은 제목과 맞아 2점 이하로는 내리지 않는다. |
| F | 4 | 336행 다음 편 'Ch 7: WiFi 4'는 seriesOrder 7 `chapter07-wifi-stack.md`와 주제는 맞지만 링크가 없고 부제 'scan·WPA2/3'가 대상 제목의 'Mesh'와 다르다. 343행 '[Ch 9: RTC·저전력] — GPIO wake-up'은 `chapter09-esp-idf-build.md`(빌드)로 가서 라벨이 틀렸다(실제 전력 글은 chapter12). 292행 주석 '9장에서 다룰 deep-sleep'도 같다. 344행 'Part 4.9: ADC 노이즈 대책'은 링크가 없고 실제 part4-09는 i2c-driver다. 345행도 링크가 없다. |
| G | 2 | 346~347행 adc_oneshot·adc_calibration 문서 링크는 'latest' 경로이고 본문 주장과 연결되지 않는다. 48행 'ESP-IDF 5.x에서 _12로 통일'은 출처가 없다. 사양 표(25~31행), attenuation 표(41~46행), eFuse 블록 표(102~106행)에 데이터시트·TRM 판 표기가 없다. |

uncertainties:
- 216행 '1 kΩ + 100 nF | 100 Hz 이상 cutoff': 계산값은 약 1.59 kHz다. '차단 주파수 ≥ 100 Hz'로 읽으면 참이라 오류 확인에서 뺐다.
- 15행 'GPIO0~GPIO4로 6 채널', 28행 'Channels 6'은 29행 핀 다섯 개, 35행 '5개(GPIO0~4)'와 개수가 다르다(개수 표기 실수).
- 205행 '20 kHz × 32 samples = 256 bytes per 1.6 ms': sample당 8바이트가 된다. `adc_digi_output_data_t` 크기를 헤더로 확인하지 않았다.
- 30행 '최대 ~2 MSPS', 154·330행 'MHz급 sample rate', 41~46행 attenuation별 범위, 310행 '2.5 V 이상 비선형'은 데이터시트·ESP-IDF 문서로 대조하지 않았다.
- 102~106행 eFuse BLK1~3 배치, 110·314행 '양산 초기 일부 batch는 캘리브레이션 미기록'은 출처가 없다.
- 123행 'ADC 한계인 3.3 V'와 46행 12 dB 실용 범위 3.10 V가 다르다.
- 260행 'ESP32(원조)는 10채널 정전식 터치'와 5행 '터치 9 채널'의 채널 수가 다르다.
- 294행 GPIO_NUM_9 deep sleep wake와 chapter12 68행 'RTC GPIO0~5'는 글 사이 모순이라 오류 확인에 넣지 않았다.
- 318행 oneshot API의 sample time 설정 항목 존재 여부 미확인.

점수 구간 메모(병합 검토 구간): 병합 대상 없음. ESP32-C3 ADC API를 다루는 다른 글이 없다. 다음 조치는 보강이다(description '터치 9 채널' 수정, 117행 fallback을 12 dB 범위에 맞춤, 28·35행 채널 설명을 데이터시트로 정리, 343행 링크를 `chapter12-power-management.md`로 교체).

### `esp32-c3-mastering/chapter07-wifi-stack.md` — 57점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(575ac7e8 스텁, 7b2b5e69 시리즈 12장 일괄 집필, b05e5d1d text 코드블록 정리, 20c1b507 ASCII→TikZ, ac24bb76 제목 변경, be973200 topic, 0a9dd7bc slug 고정)에 ESP-IDF 문서·ESP32-C3 데이터시트와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고, 원문 안에서 동시에 참일 수 없는 두 구체 진술도 확정하지 못했다(150행 대 255행, 188행 대 243행은 해석 여지가 있어 uncertainties).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글만의 관점은 15·93행 'esp_wifi_start는 드라이버만 켜고 연결 결과는 event로 온다', 135행 APSTA 단일 라디오로 AP 채널이 STA 채널로 끌려간다는 설명, 259행 reconnect 폭주와 백오프, 249~257행 증상·원인·해결 표다. 25~30행 계층 표, 61~91행 STA 초기화, 141~164행 보안 표, 174~186행 mesh, 200~210행 provisioning은 ESP-IDF 예제 순서의 소개다. 17·238~243행 throughput, 227~232행 전류, 123행 '4~6대 현실적 한계'는 출처 없는 단정이라 고유 분석으로 세지 않았다. |
| B | 11 | 19행 범위 안내부터 261~270행 정리까지 흐름은 간다. 19·264행 '4가지 모드'에 NULL 절이 없다. provisioning(200~210행)은 완료 event·deinit이 없고, 212행 Security 2 권장과 209행 예제 SECURITY_1이 다르다. 259행이 백오프를 '반드시' 두라는데 46~47행 예제는 즉시 재연결한다. 102행 SoftAP 예제는 91행이 '엄격'하다고 한 초기화를 생략한다. 정확성 불확실이 열려 있어 B ≤ 13이다. |
| C | 7 | ESP-IDF API 초기화 코드(62~88행), 호출 순서와 반환 오류(91행), 증상·해결 표(249~257행)가 있다. listen_interval별 전류 표(227~232행)와 throughput 표(238~243행)는 보드·IDF 버전·AP·측정 도구 없이 수치만 있어 C ≤ 8이다. 기대 로그는 50행 한 줄뿐이고, 46~47·102행 코드는 글이 경고한 상태를 그대로 담는다. |
| D | 11 | 같은 시리즈: chapter06(ADC) 겹침 없음, chapter08 262~282행 WiFi·BLE 시분할은 이 글에 없다. chapter12 42~45행 `esp_wifi_set_ps(WIFI_PS_MIN_MODEM/MAX_MODEM)`와 주석이 이 글 218~223행과 같고, 12장 26·47행 '15 mA'가 229·268행과 겹친다. chapter01-overview 93~101행 WiFi 사양 요약이 17행과 일부 겹친다. 다른 시리즈: `esp_wifi_`·ESP-MESH·`wifi_prov_mgr`·listen_interval을 쓰는 글은 이 글, 12장, riscv-practice/chapter06(draft: true)뿐이다. |
| E | 7 | 제목 키워드 Station(57행)·SoftAP(95행)·Mesh(166행)에 모두 절이 있고 description의 WPA2/WPA3도 137~164행에서 다룬다. '4가지 모드' 중 NULL은 264행에서 이름만 나와 부분 미이행이다. 제목에 없는 provisioning·절전·처리량 절이 더해져 결과가 넓게 퍼진다. |
| F | 7 | 274행 다음 편(Ch 8 BLE 5.0)은 seriesOrder 8 `chapter08-ble-gap-gatt.md`와 맞다. 278~282행 관련 항목 대상(chapter06·08·09·12, industrial-ethernet/chapter08-tsn)을 열어 라벨·번호가 모두 맞음을 확인했고 281행은 이어 읽을 이유를 적었다. 19행이 절 순서를, 91행이 호출 순서를 정리한다. 전제 지식 안내가 없고 audit:reading·폰 폭 확인을 하지 않아 9점 이상은 주지 않는다. |
| G | 2 | 본문 출처는 283·284행 ESP-IDF WiFi API·ESP-MESH 가이드 링크 두 개이고 'latest' 경로다. 17행 PHY 비율, 168행 '최대 6 layer', 212행 provisioning 보안 같은 주장과 연결되지 않는다. 236행 '데이터시트가 약속하는 PHY 비율'에 데이터시트 판·링크가 없다. |

uncertainties:
- 17·236행 '최대 PHY 비율 72.2 Mbps'는 chapter01-overview 97행 '최대 150 Mbps (HT40)'와 다르다(글 간 모순이라 오류 확인 아님).
- 17·240~243·269행 TCP 약 20 Mbps·UDP 약 30 Mbps와 거리별 표는 출처·측정 환경이 없다.
- 229~232행 listen_interval별 전류와 268행 '15 mA → 1.5 mA'는 출처가 없다. 12장 26행은 Modem Sleep 15 mA를 'WiFi/BLE OFF'로 적어 조건이 다를 수 있다.
- 188행 'layer마다 절반, layer 3쯤 1 Mbps 이하'와 243행 'Mesh L2 노드 TCP 3~5 Mbps'는 근사라 내부 오류로 확정하지 않았다.
- 150행 'pmf_cfg.required = true'와 255행 'pmf_cfg.capable = true', 158행 예제(required=false) 중 WPA3-only AP에 필요한 설정을 확인하지 않았다.
- 168·266행 'ESP-MESH 최대 6 layer'가 기본값인지 상한인지 미확인.
- 245행 'ESP32-S3(2×2 듀얼 코어)', 245행 'LwIP가 zero-copy가 아니라 사본을 만든다'는 출처 없음.
- 164행 `esp_wifi_sta_wpa2_ent_*`, 203행 `WIFI_PROV_SCHEME_BLE_EVENT_HANDLER_FREE_BTDM`이 현재 IDF·C3에 맞는지 미확인.
- 123행 SoftAP '10대 이하', 'DHCP 192.168.4.1/24', '4~6대 현실적 한계'는 출처가 없다.
- 19·264행 '4가지 모드' 대 본문 절 3개는 개수 표기 문제라 오류 확인 아님.

병합 대상: 병합 대상 없음. chapter12 42~45행과 Modem Sleep 코드가 겹치지만 ESP32-C3 WiFi 모드 구성·보안·mesh·provisioning은 공개 글 중 이 글만 다루는 독립 검색 의도다. 다음 조치는 보강이다(17·227~243행 수치를 데이터시트·ESP-IDF 문서로 확인하거나 TBD·환경 명시, 46~47행 백오프 재연결 코드와 102행 초기화 전제·209행 Security 2 정합, 216~232행 절전 절은 12장으로 넘기고 링크만 남김, 버전 고정 1차 출처, NULL 모드 처리).

### `esp32-c3-mastering/chapter08-ble-gap-gatt.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순(루브릭 3-1). L296 'BLE 기본 MTU는 23 byte이고, 헤더 빼면 20 byte의 payload'는 헤더를 3 byte로 두는데, 같은 문단 'ble_att_set_preferred_mtu(247)로 키워야 224 byte의 payload'는 헤더를 23 byte로 계산한다. 같은 연산이면 247-3=244여야 하므로 둘 다 참일 수 없고 L307 정리도 224를 되풀이한다. 추가로 L56 'S=2 또는 S=8 적용 … 거리가 4배'와 L60·L62 표(1M ~30 m, Coded S=2 ~60 m = 2배)가 S=2 거리 배수를 다르게 말한다. git log(0a9dd7bc slug, be973200 topic, e85d7684 코드 블록 산문 정리, ac24bb76 제목 변경, 그 이전 집필 커밋)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 내용은 C3 관점의 NimBLE vs Bluedroid 선택 표(L81~91, 'SRAM 400 KB라 50 KB 차이가 크다'), coex Kconfig(L276~280)와 'BLE 주로 쓸 때 WiFi disconnect' 권고(L282), 증상·원인·해결 표(L286~294)다. GAP/GATT 표(L25~37), BLE 4.2/5.0 비교(L45~54), 표준 UUID(L225~234), 페어링 모드(L242~247)는 입문 자료의 표준 목록이다. PHY별 거리(L60~63), 스택 RAM/Flash(L84~85), 광고 주기별 전류(L142~147)는 출처 없는 수치다. |
| B | 11 | GAP/GATT(L21)부터 정리(L298)까지 흐름은 간다. L211·L214의 `current_conn_handle`·`battery_level_attr_handle`은 정의·갱신되는 곳이 없고, L184~188 characteristic 정의에 `val_handle`이 없어 notify 대상 handle을 얻을 수 없다. L109는 선언 전인 `ble_advertise_start`를 부르고 nimble_port 초기화·host sync 콜백이 없다. 정확성 불확실(L204, L67~72)이 열려 있어 B ≤ 13이다. |
| C | 6 | NimBLE API 코드(L65~73, L97~137, L166~201, L206~219, L251~258)와 Kconfig 이름(L278~279)은 있지만 ESP-IDF 버전·보드·측정 환경이 없다. L60~63 거리, L84~85 RAM ~25/~70 KB·Flash ~150/~430 KB, L142~147 평균 전류는 출처·환경 없는 수치라 C ≤ 8이다. nRF Connect 화면이나 로그 같은 기대 관찰이 없고 notify 코드가 정의되지 않은 변수에 의존한다. |
| D | 12 | 같은 시리즈: chapter07은 L197 provisioning BLE 방식 한 행, chapter09는 L180~181 sdkconfig 예시, chapter12는 L180 'BLE beacon 듣기' 한 칸뿐이다. chapter01-overview L106~116 'BLE 5.0' 절이 이 글 L15·L56·L301의 '2M 2배, Coded 4배'(ch01 L116)를 반복하고, L264·L274 시분할 설명은 ch01 L91과 겹친다. 다른 시리즈 `embedded/wireless/getting-started-with-ble/`(chapter04-gap·05-gatt·07-pairing-bonding·10-ble5-features 등 10편)은 모두 draft: true다. 공개 글 중 GATT·Coded PHY grep 결과는 embedded-security/chapter07-side-channel.md(키워드 우연 일치)뿐이다. |
| E | 7 | 제목의 GAP·GATT·Coded PHY는 L21~39, L151~236, L56~75에서 다루고 description의 '2M 2배, Coded 4배, GATT 서버'도 L58~63, L166~201로 이행한다. Coded PHY 12 dB·4배(L56)는 출처 없는 한 문장이고 표(L62)와 어긋나며, GATT 서버 코드는 notify handle이 빠져 완결되지 않는다. |
| F | 5 | L311 다음 편은 seriesOrder 9 `chapter09-esp-idf-build.md`와 맞고 L315 Ch 7 링크도 맞다. 그러나 L317 'Ch 12 … — BLE advertise 절전 패턴'은 대상 `chapter12-power-management.md`에 BLE advertise 내용이 없다(BLE 관련은 L23 표 열 이름, L54, L180 한 칸뿐). 라벨들(L311·L315·L316·L317)은 ac24bb76 이전의 'Ch N: X' 제목을 쓴다. L266 `<!-- TODO: TikZ timeline diagram -->`과 L268~272 ASCII 타임라인이 공개 글에 남아 있다. |
| G | 2 | L318~320 Apache NimBLE Tutorials, ESP-IDF NimBLE examples(master), Bluetooth Core 5.0 Specification 링크는 끝에 붙은 '원문' 목록이고 L56 12 dB, L84~85 스택 크기, L142~147 전류, L278~279 Kconfig, L296 MTU와 연결되지 않는다. ESP-IDF·NimBLE 버전 표기가 없다. |

uncertainties:
- L56 Coded PHY S=2·S=8의 링크 budget 이득(12 dB가 S=8 기준인지)을 Core spec으로 확인하지 않았다.
- L60~63 거리, L84~85 RAM·Flash, L142~147 전류는 출처 없는 수치다.
- L67~72 `struct ble_gap_set_phy_args`, `ble_gap_set_prefered_le_phy`, `BLE_HCI_LE_PHY_CODED_S8_PREF`를 upstream으로 대조하지 않았다.
- L204 CCCD가 켜졌을 때만 NOTIFY 발송, L213 `ble_gatts_notify_custom`의 구독 검사 여부 미확인.
- L39 네 GAP 역할 동시 지원, L52·L149 Extended Advertising '255 byte'의 기준(PDU 하나/체인), L75 iPhone 12·Android 8.0 Coded PHY 지원 미확인.
- L260 bond 저장 위치(NVS `ble_hs_store`)와 partition table 변경 시 삭제 설명 미확인.
- L277~279 Kconfig 이름·menuconfig 위치의 버전별 차이, L132~133 `BLE_GAP_ADV_FAST_INTERVAL1_MIN/MAX` 30/60 ms 미확인.

점수 구간 메모(병합 검토 구간): 병합 대상 없음. 같은 주제의 getting-started-with-ble 시리즈는 전부 draft이고 이 시리즈에서 BLE를 맡는 공개 글은 이 글뿐이다. 다음 조치는 보강이다(L296·L307 MTU payload 244와 L56·L62 Coded PHY 거리 배수를 Core spec으로 확인해 수정, notify 코드 handle 정의, L317 라벨, L266 TODO·ASCII 도식 정리 후 재채점).

### `esp32-c3-mastering/chapter09-esp-idf-build.md` — 50점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(575ac7e8 stub 추가, 7b2b5e69 시리즈 12편 작성, b05e5d1d text 코드블록 정리, 6205e212 seriesOrder 재정렬, ac24bb76 제목 변경, fa55144d 내부 링크 일괄 수정, be973200 topic, 0a9dd7bc slug 고정)에 ESP-IDF 문서·upstream 소스와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고 원문 안에서 동시에 참일 수 없는 두 진술도 확정하지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 프로젝트 생성(23~37행), `idf_component_register`(85~106행), Kconfig(112~134행), menuconfig(157~169행), `idf_component.yml`(192~212행)은 ESP-IDF Build System 문서 순서를 따른다. 이 글만의 것은 REQUIRES/PRIV_REQUIRES를 헤더 포함 그래프로 설명한 95행, SDKCONFIG_DEFAULTS 목록과 -B로 Debug·Release를 나누는 246~286행, 증상·원인·해결 표(311~320행)다. 300행 'LTO로 5~10%', 307행 '빌드 시간 2~3배'는 출처·환경 없는 수치다. 앵커 part7-05(A 9)보다 조금 낫다. |
| B | 11 | 프로젝트 → 컴포넌트 → Kconfig → menuconfig·sdkconfig.defaults → Component Manager → 파티션 → 플레이버 → 툴체인 → 함정 → 정리(333~340행) 흐름은 완성됐다. 제목의 'CMake 통합'에 해당하는 최상위 CMakeLists.txt 내용이 없고(45·58행에 이름만) idf.py가 CMake를 구동하는 방식은 17행 한 문장뿐이다. 플래시 크기 불일치를 242행 '빌드 실패 원인', 322행 '빌드했는데 reset 루프', 338행 '파티션 테이블의 flash size'로 다르게 설명한다. 정확성 불확실이 열려 있어 B ≤ 13이다. |
| C | 7 | 따라 칠 명령·설정(23~37, 85~106, 256~264, 268~286행)과 관찰 출력 예(292~298행 gcc 버전, 324~329행 esptool flash_id)가 있다. ESP-IDF 판이 17행 'v5.x'로만 적혀 재현 환경이 고정되지 않고 idf.py size나 Debug·Release 차이 측정이 없다. 300·307행 LTO 수치는 C ≤ 8 상한에 걸리고 315·317·320행 함정 표 원인·해결도 출처가 없다. |
| D | 10 | 같은 시리즈 chapter08(BLE)·chapter10(21·186·243행)과는 겹치지 않는다. `chapter03-memory-flash.md` 102~138행 파티션 절(110·111행 nvs·otadata, 136~138행 menuconfig 경로)이 본 글 214~240행(221·231·238~239행)과 겹치고, chapter01-overview 144~157행 set-target·build 명령이 28~36행과 겹친다. 다른 시리즈 riscv-practice/chapter06-esp-idf-freertos.md 37~51행은 draft: true다. `idf_component_register`·`sdkconfig.defaults`를 다루는 공개 글은 이 글뿐이라 69~212·244~286행 역할은 구별된다. |
| E | 5 | 제목 'ESP-IDF 빌드 시스템 분석 — 컴포넌트 구조와 CMake 통합'(2행)은 분석을 약속하지만 본문은 사용법 안내 수준이고 의존성 해석 순서·CMake 단계·Ninja 생성 같은 내부 동작이 없다. 'CMake 통합'은 85~106행 호출뿐이라 부분 미이행이다. description(5행)은 본문과 맞다. |
| F | 5 | 344행 다음 편 Ch 10은 seriesOrder 10 `chapter10-freertos.md`이고 예고 내용이 그 글 21·186·243행과 맞다. 348행(chapter08)·350행(chapter11) 라벨도 맞다. 그러나 351행 'Modern Embedded Recipes Part 2: 빌드 시스템'은 00-preface.md로 가고, preface 81행 기준 Part 2는 'ARM 아키텍처 실용 관점'(빌드는 98행 Part 3)이라 라벨이 틀렸다. 전제 지식 안내도 없다. |
| G | 2 | 본문 출처는 352행 ESP-IDF Build System(latest)과 353행 Component Registry 두 개로 관련 항목에 모여 있고 300행 LTO, 315행 0x103, 320행 정렬 단위와 연결되지 않는다. 버전 표기는 17행 'v5.x', 196행 '>=5.1', 294·297행 esp-13.2.0_20230928 정도다. |

uncertainties:
- 28·43~54행 `idf.py create-project`의 생성물 목록(idf_component.yml·components/·sdkconfig·partitions.csv까지) 미확인.
- 39행 'set-target 변경 시 fullclean 필요', 190행 'ESP-IDF 4.4 이후 Component Manager 도입' 미확인.
- 300행 'v5.x는 GCC 13 기반': 297행 esp-13.2.0은 특정 판 툴체인이고, chapter01 146행은 release/v5.1 설치다.
- 304행 `CONFIG_COMPILER_OPTIMIZATION_LTO` 존재, 300·307행 LTO 5~10%·2~3배 출처 없음.
- 315행 0x103 ↔ flash size mismatch, 320행 'offset을 0x1000 배수로'(app 파티션 정렬 단위가 더 클 수 있음) 미확인.
- 317행 'PRIV_REQUIRES만 있고 헤더 노출 → 링커 undefined reference'는 95·316행 설명대로라면 컴파일 단계 오류일 것이라 의심되나 1차 자료 미확인.
- 242·322·338행 flash size 설명 차이: 설정 위치를 1차 자료로 확인하지 않아 오류 확인으로 올리지 않았다.
- 284행 `CONFIG_COMPILER_CXX_EXCEPTIONS=n` 표기 형식, 197~200행 레지스트리 패키지 이름·버전 범위 현행 여부 미확인.

병합 대상: 글 전체의 병합 대상 없음. 컴포넌트 모델·Kconfig·Component Manager·Debug/Release 플레이버(69~212, 244~286행)를 다루는 다른 공개 글이 없다. 파티션 절(214~240행)은 `chapter03-memory-flash.md` 102~138행과 겹치므로 줄이고 chapter03으로 링크하는 부분 정리 후보다. 다음 조치는 보강이다(최상위 CMakeLists.txt와 idf.py→CMake 구동 설명, 242·322·338행 통일, 300·307행과 315·317·320행을 ESP-IDF 문서로 확인하거나 삭제, 351행 라벨을 Part 3으로 수정, ESP-IDF 판 고정).

### `esp32-c3-mastering/chapter10-freertos.md` — 51점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic, fa55144d 내부 링크 기계 치환, 그 밖에 작성·제목·text 블록 정리 커밋)에 ESP-IDF 문서·Kconfig·`esp_task.h`·FreeRTOS 소스와 대조한 커밋이 없다. 로컬에 ESP-IDF clone이 없어 평가 중에도 1차 자료를 열지 못했고, 원문 안의 기술 모순도 확정하지 못했다(70·72·334행 개수 차이는 산문 개수 실수라 제외, 188행 대 52행은 해석이 갈림).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 내용은 시스템 task 우선순위 표(58~66행), Task WDT 설정(254~268행), 사용자 pm lock 예(210~218행), 증상·원인·해결 표(317~326행)다. 동기화 절(70~184행)은 Queue·Mutex·Event Group·Stream Buffer API를 일반 FreeRTOS 수준으로 나열하고 C3 고유 해석은 118행 'SRAM 400 KB' 한 문장이다. 68행 '5~10이 안전 구간', 313행 '500 byte 이하면 늘리는 패턴이 안전'은 근거 없는 경험칙이다. |
| B | 11 | 태스크 생성 → 동기화 → tickless idle(186~218행) → software timer(220~241행) → WDT(243~295행) → 스택 검출(297~313행) → 증상 표 → 정리로 흐름은 간다. Event Group 예(146~157행)는 비트를 셋하는 쪽이 없고, Stream Buffer 예(166~181행)는 생성 코드와 `byte`·`xHigherPriorityTaskWoken` 선언이 없다. 123행은 파일 범위에서 `xSemaphoreCreateMutex()`를 부르고 231~238·257~268행도 함수 밖 조각이다. 70·72행 '네 가지'와 표 6개(74~81행), 334행 5개가 어긋난다. 정확성 불확실이 열려 있어 B ≤ 13이다. |
| C | 6 | ESP-IDF API 코드와 sdkconfig 항목(201~206, 277~280, 301~304행)은 있지만 버전·보드·실행 결과가 없다. 208행 'Active 80 mA → Modem sleep 15 mA → Light sleep 130 µA', 282행 'ISR은 수십 µs', 295행 '수십 µs 늘어나는'은 출처·환경 없는 수치라 C ≤ 8이다. 합격·실패 관찰이 있는 검증 절차가 없고 코드 조각 다수가 선언 누락으로 그대로 컴파일되지 않는다. |
| D | 9 | 비교한 글: 같은 시리즈 chapter09(겹침 없음), chapter11(겹침 없음), chapter12. 다른 시리즈 `modern-recipes/part6-05-mutex-usage.md`, `part6-07-event-group.md`, `rtos/practical-internals/part2-09-tickless.md`·`part3-08-event-group.md`. 겹침: 193~198행 `esp_pm_config_t {160, 40, true}`와 208행 전류가 chapter12 83행과 25~27·250행에 반복되고, 134행 mutex vs binary semaphore 결론이 part6-05 20~27행과, 146~153행 부팅 비트 AND 대기가 part6-07 60~74행과 같다. 우선순위 표·WDT·pm lock은 이 글에만 있다. |
| E | 7 | 제목 범위(ESP32-C3)와 본문 범위가 일치한다. description의 '우선순위 25 단계'(51행), 'tickless idle'(186~218행), 'software timer'(220~241행)는 다뤄진다. 'modified FreeRTOS'는 17행 한 문장뿐이고 vanilla와의 차이가 없으며, '단일 코어 전략'도 21~23행 뒤로는 일반 사용법이다. |
| F | 5 | 343행 다음 편은 seriesOrder 11 `chapter11-security.md`와 맞고 347·348·349행 Ch 9·11·12 라벨도 맞다. 그러나 350행 'Practical RTOS Internals — Part 2 FreeRTOS'는 rtos/practical-internals/00-preface('시리즈 소개')로, 351행 'Modern Embedded Recipes — 동기화 패턴'은 modern-recipes/00-preface로 간다. 라벨과 대상이 다르다. 전제 지식·절 사이 안내는 없다. |
| G | 2 | 본문 출처는 352~353행 ESP-IDF FreeRTOS Reference·Power Management 링크 두 개뿐이고 `en/latest`라 버전이 없다. 우선순위 표(58~66행), 전류(208행), INT WDT 기본 300 ms(275행)에 출처가 연결되지 않는다. |

uncertainties:
- 60~61행 esp_timer_task 24, ipc_task 23의 실제 값과 단일 코어 C3의 ipc_task 존재를 `esp_task.h`로 확인하지 않았다.
- 257~262행: 기본 설정에서 TWDT가 이미 초기화돼 있으면 `esp_task_wdt_init`이 오류를 반환할 수 있다. 271행 '기본은 idle task만 감시'와의 관계도 미확인.
- 295행 C3 PSRAM 인터페이스 부재는 데이터시트 미확인.
- 302~303행 CHECK_STACKOVERFLOW_PTRVAL과 _CANARY가 Kconfig choice라면 둘 다 =y는 불가하다. Kconfig 미확인.
- 310행 ESP-IDF `uxTaskGetStackHighWaterMark`가 byte 단위면 `* sizeof(StackType_t)`는 4배 과대다. 53행과 맞물리는 문제로 미확인.
- 188행 '기본 FreeRTOS는 tick이 매 ms'와 52행 'Tick rate 100 Hz (기본)'은 188행이 vanilla를 뜻할 수 있어 오류 확인으로 올리지 않았다.
- 322행 대기 0 send 실패 원인 서술이 의심되나 API 의미를 1차 자료로 확인하지 않았다.
- 208행 전류, 118행 SRAM 400 KB, 275행 INT WDT 300 ms, 52행 CONFIG_FREERTOS_HZ 기본 100 Hz는 데이터시트·Kconfig 미대조.
- 70·72행 '네 가지' 대 표 6개 대 334행 5개는 산문 개수 실수로 오류 확인에서 제외했다.

병합 대상: 글 전체 병합 대상 없음. 'ESP32-C3 FreeRTOS'라는 독립 검색 의도가 있고 시스템 task 우선순위·WDT·pm lock은 다른 글에 없다. tickless idle 절(186~218행)은 `chapter12-power-management.md` 25~27·83·250행과 같은 코드·수치라 chapter12로 모으고 링크로 넘기는 부분 병합을 검토한다. 다음 조치는 보강이다(동기화 절 일반 API 나열은 modern-recipes part6-05·6-07 링크로 줄임, ESP-IDF 버전을 밝히고 우선순위 표·WDT 기본값·Kconfig를 1차 자료로 대조, 350·351행 링크를 실제 글로 교체).

### `esp32-c3-mastering/chapter11-security.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). (1) 161행 'SPI_BOOT_CRYPT_CNT를 1로 burn (Development = 홀수)'와 184행 'SPI_BOOT_CRYPT_CNT를 3 또는 7로 burn (Release = 마지막 비트도 burn)': 3과 7도 홀수라 홀짝 구분이 Release 값과 겹치고, 3(0b011)은 3비트 필드의 마지막 비트가 켜지지 않은 값이라 괄호 설명과도 맞지 않는다. (2) 232행 1단계 'Secure Boot은 켜고 키 burn은 안 함 · 펌웨어가 잘 부팅·OTA되는지 확인'과 108~111행 'Secure Boot를 켜고 플래시하면 부팅 때 bootloader가 공개키 digest와 SECURE_BOOT_EN을 자동으로 burn', 그리고 87행(Secure Boot를 켜려면 서명 키 지정 필요)과 233행(서명 키 생성은 2단계): 글 자신의 설명대로라면 1단계를 그 순서로 할 수 없다. (3) 보조: 138행 '한 번 burn 후 RD_DIS=1'과 183·187행 'Development와 다름 … 키 블록의 RD_DIS·WR_DIS를 burn'이 키 읽기 보호 시점을 다르게 말한다. git log(7b2b5e69 일괄 작성, b05e5d1d·a080ac90 text 블록 정리, ac24bb76 제목 변경, fa55144d 링크 수리, be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 이 글만의 것은 Development→Release 5단계 전환 표(226~236행), 영구 brick 시나리오 4가지(238~245행), 증상·원인·해결 표(249~258행)다. eFuse 블록 표(25~32행), Secure Boot V2 체인 표(65~70행), Flash Encryption 속성 표(134~140행)는 Espressif 문서 구성을 따라간다. 235행 '24~48시간'에 근거가 없고, 고유 부분인 전환 표가 본문 설명과 모순된다(232행 대 108~111행). 13~19 구간 하단이다. |
| B | 12 | eFuse(21행) → Secure Boot V2(61행) → Flash Encryption Dev/Release(130~190행) → anti-rollback(192행) → HMAC/DS(210행) → 전환 워크플로(226행) → troubleshooting(247행) → 정리(262행)까지 흐름은 간다. 161·184행, 232·108~111행의 내부 모순과 열린 불확실 때문에 B ≤ 13이다. DS peripheral(224행)은 한 문단뿐이다. |
| C | 7 | `espefuse.py summary`·`burn_efuse`(36~59행), `espsecure.py`(76~126, 166~170행), sdkconfig 항목(148~153, 176~179, 196~200행)으로 절차는 있다. ESP-IDF·esptool 버전과 칩 리비전이 없고 41~51행 summary 출력이 실제 실행 결과인지 알 수 없다. 첫 플래시 뒤 관찰할 부트 로그·eFuse 변화가 없다. 235행 '24~48시간'은 출처 없는 수치라 C ≤ 8이다. |
| D | 11 | 인접 글 chapter10(단일 코어·동기화·tickless·WDT)과 chapter12(전력)는 주제가 겹치지 않는다. 다른 시리즈 `embedded-security/chapter02-secure-boot.md` 221~245행(generate_signing_key 227행, burn_efuse SECURE_BOOT_EN 242행)이 이 글 74~88·56~57행과, 247~267행(anti-rollback, fuse 유한성 267행)이 192~208행과 겹친다. SPI_BOOT_CRYPT_CNT·encrypted-flash는 블로그 안에서 이 글에만 있어 C3 Flash Encryption Dev/Release(130~190행)와 brick 워크플로(226~245행)로 역할이 구별된다. |
| E | 7 | 제목·description(5행)의 Secure Boot V2·Flash Encryption·eFuse 키워드를 모두 절로 다룬다(21·61·130행). 범위(C3)도 일치한다. '분석'에 비해 동작 원리보다 절차·체크리스트 중심이라 9점 이상은 아니다. |
| F | 5 | 19행이 범위를 안내하고 275행 다음 편 링크는 seriesOrder 12 `chapter12-power-management.md`와 맞다. 279~281행 Ch9·Ch10·Ch12 링크도 맞다. 그러나 282행 'Embedded Security 시리즈 — Secure Boot 일반 원리'는 `embedded-security/chapter01-threat-model.md`('임베디드 보안 위협 모델')로 가고, Secure Boot 글은 chapter02-secure-boot.md다. 라벨과 대상이 다르다. |
| G | 2 | 283~285행 ESP-IDF Secure Boot V2·Flash Encryption·espefuse 문서 링크는 관련 항목 목록에만 있고 72행 digest 3개, 139행 암호화 단위, 186행 eFuse 이름, 206행 카운터 폭과 연결되지 않는다. 링크가 모두 '/latest/'이고 본문에 ESP-IDF·esptool 버전, 칩 리비전이 없다. |

uncertainties:
- 63행 '3단계 체인'인데 65~70행 표는 4행이고 266행은 ROM을 빼고 3단계로 센다(산문 개수 표기라 제외).
- 68행 'Secondary bootloader가 partition table 서명 검증'과 69행 '(다음 단계가 검증)'의 뜻이 불명확하다. V2에서 partition table이 별도 서명되는지(68·90·97·258행) 미확인.
- 206행 '0~31 | 32-bit 카운터'와 208·269행 '최대 32까지'의 관계, C3 SECURE_VERSION eFuse 폭 미확인.
- 186행 'EFUSE_HARD_DIS_JTAG', 185행 DIS_DOWNLOAD_MODE, 190행 'UART·esptool 모두 차단'이 C3 eFuse 이름·기본 동작과 맞는지 미확인.
- 85행 'One-time flash' 메뉴, 96행 '64-byte trailer', 103·106행 idf.py flash의 bootloader 쓰기 여부 미확인.
- 139행 '암호화 단위 32-byte sector', 168행 C3용 XTS 옵션, 164행 Development 모드 평문 flash 재암호화 설명 미확인.
- 224행 DS peripheral '부팅 시 복호화'와 Google Cloud IoT 언급(서비스 종료 여부) 미확인.
- 256행 'encrypted binary는 약간 더 큼'은 XTS가 크기를 바꾸지 않는다면 틀린 원인일 수 있다.
- 235행 '24~48시간'은 출처 없는 수치. 41~51행 summary 출력의 출처·버전 불명.

### `esp32-c3-mastering/chapter12-power-management.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건(루브릭 3-1). (1) 194행 '평균 전류: 248.985 / 1800 = 138 µA'와 201행 '실제 일자 … 약 301 일'은 동시에 참일 수 없다. 2000 mAh / 0.138 mA ≈ 14,490시간 ≈ 604일이고 199행 식도 7,200,000 / 248.985 ≈ 28,917 사이클 × 0.5시간 ≈ 602일이다. 이 오류가 203행 '약 10개월'과 214행 '6배 더 자주 보고하면 수명이 1/3'(211행 103일 기준 실제 약 1/6)로 이어진다. 211행 5분 시나리오(805 µA, 103일)는 맞다. (2) 50행 'CPU가 도는 비용이 80 mA의 거의 전부였다'는 25~26행 표(CPU가 도는 Modem Sleep 15 mA, 라디오를 끄면 약 65 mA가 빠짐)와 같은 줄 'CPU + DRAM 액티브가 라디오보다 무겁지 않습니다'와 동시에 참일 수 없다. git log(575ac7e8 stub, 7b2b5e69 집필, b05e5d1d·49f2a443 코드 블록 정리, ac24bb76 제목 변경, fa55144d·8bf4703f 링크 수정, be973200·0a9dd7bc frontmatter)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글만의 내용은 ULP 유무 시나리오 표(176~180행), RTC GPIO 0~5 제약과 PCB 단계 경고(131~141행), 외부 회로 leak(229행), troubleshooting 표(218~227행), 보고 주기별 배터리 수명 계산(184~214행)이다. 수명 계산은 산술이 틀렸고 결론 '1/3'(214행)도 그 오류에서 나왔다. 모드별 전류(23~28행)는 출처 없는 대표값이고 41~127행 API 나열은 ESP-IDF Sleep Modes 문서 범위다. 50행 해석은 표와 모순된다. |
| B | 12 | 모드 표 → Modem/Light/Deep 절(41~127행) → wake 원인 → RTC GPIO(129~141행) → RTC SRAM(143~168행) → ULP 부재(170~182행) → 배터리 계산(184~214행) → 함정(216~229행) → 정리로 흐름은 간다. 정확성 불확실(68행 대 137행, 110~112행 API 인자, 224행 RTC 클럭)이 열려 있어 B ≤ 13이다. 231~246행 시리즈 맺음말이 전력 주제와 무관한 분량을 차지한다. |
| C | 6 | 코드(56~65·67~77·81~90·103~116·120~127·147~166행)는 ESP-IDF API로 쓰였지만 버전·보드·측정 환경이 없다. 23~28행 전류값(80 mA·15 mA·130 µA·5 µA), 94행 '200 ms 안에', 224행 '50초쯤 깸', 229행 '실측이 50~200 µA'는 출처·환경 없는 수치라 C ≤ 8이다. 배터리 계산은 출처 없는 수치에서 유도했고 30분 시나리오는 틀렸다. 전류 측정 절차(측정기·션트·기대값)가 없다. |
| D | 10 | 같은 시리즈: 43~48행 `esp_wifi_set_ps`와 DTIM 설명은 chapter07 214~222행과 같고, 79~90행 `esp_pm_configure`(160/40/true)는 chapter10 188~199행과, ch10 208행은 같은 80 mA→15 mA→130 µA 수치를 반복한다. 222행 peripheral lock 함정은 ch10 325행과 같다. 143~168행 RTC_DATA_ATTR boot_count와 223행 함정은 chapter03 54~70·331~333행과 겹친다. chapter11은 겹치지 않는다. 다른 시리즈 `performance-engineering/part3-09-power-vs-performance.md` 142~147행, `part3-08-peripheral-clock.md` 186~193행은 짧은 사례 절이라 역할이 갈린다. |
| E | 6 | 제목 'Modem·Light·Deep Sleep와 Wake 소스'는 41~127·129~141행에서 이행한다. description(5행) '5단계 power mode'는 본문 4단계(15·17·21·250행, 23~28행 표 4행)와 맞지 않고, 'RTC 도메인 활용'·'ULP 미지원'은 143~182행에서 이행한다. 231~246행 시리즈 맺음말은 제목 질문과 무관하다. |
| F | 5 | 시리즈 마지막 글(seriesOrder 12, chapter13 없음)이고 19행이 마지막 장임을 밝히며 237~246행이 다음 시리즈를 안내한다. 261~266행 관련 항목 대상(ch07·ch10·ch11, embedded-security/chapter01-threat-model, rtos/practical-internals/00-preface, modern-recipes/00-preface — 모두 공개)은 라벨과 맞다. 그러나 244행 'FreeRTOS Mastering 시리즈'는 링크 없는 추천이고 rtos/freertos-mastering 14편이 모두 draft라 독자가 갈 곳이 없다(8bf4703f에서 링크만 지운 결과). |
| G | 2 | 본문 출처는 267~268행 ESP-IDF Sleep Modes·Power Management 링크 두 개뿐이고 'latest' 경로다. 23~28행 전류값, 131행 RTC GPIO 0~5, 145행 RTC SRAM 8 KB에 데이터시트·TRM 인용과 판 표기가 없다. |

uncertainties:
- 5행 '5단계'와 본문 '4단계'는 개수 표기 차이라 오류 확인에 넣지 않았다(E 감점).
- 17행 '15,000배 이상'과 30·250행 '16,000배'는 모순이 아니다. 21행 제목 '15,000배'만 표기 불일치.
- 68행 light sleep GPIO wake 'RTC GPIO0~5 중 하나'와 137~138행 '일반 GPIO도 light sleep wake'는 TRM·ESP-IDF 문서로 미확인.
- 110~112행 `esp_deep_sleep_enable_gpio_wakeup` 인자와 `ESP_GPIO_WAKEUP_GPIO_LOW` 상수의 현행 헤더 일치 여부 미확인.
- 224행 'RTC 클럭이 RC 8 MHz'로 60초 wake가 50초쯤 된다는 설명은 C3 RTC slow clock 기본 소스와 대조하지 않았다.
- 186행 '2000 mAh CR123A'는 CR123A 일반 용량(기억으로 약 1500 mAh)과 맞지 않을 수 있다.
- 182·256행 'ULP가 있는 ESP32-H2' 미확인.
- 23~28행 Light Sleep 130 µA는 chapter01 131행 '~140 µA', performance-engineering part3-09 147행 '30 µA'와 다르다(다른 글과의 모순).
- 233행 회고의 '터치'는 chapter06 17행 '터치 센서의 부재'·5행 '정전식 터치 9 채널'과 충돌한다.
- 235행 '모듈당 2달러', 94행 'fast boot path 200 ms', 229행 '50~200 µA'는 출처 없는 수치다.

### `gdb-lldb/chapter01-intro-and-install.md` — 50점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). L243~257 hello.c 목록에서 `// hello.c`가 1행이므로 `int factorial(int n) {` 4행, `if (n <= 1) return 1;` 5행, `int main() {` 9행, `int n = 5;` 10행, `int result = factorial(n);` 11행이다. 그런데 GDB 출력은 L273·L277~278에서 `int n = 5;`를 8행, L281·L297에서 `int result`를 9행, L287~288에서 `if (n <= 1)`을 4행으로 찍고, LLDB 소스 목록 L323~327도 `5 }`, `7 int main() {`, `8 int n = 5;`이다. 주석 줄을 빼고 세도 `int n = 5;`는 9행이라 맞지 않는다. 코드와 예시 출력이 동시에 참일 수 없다. git log(0a9dd7bc slug 고정, 28524a9d 코드 블록 언어 태그, 07cc1988 관련 항목 추가 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | ptrace·Mach·DebugActiveProcess 소개(L49~80), 출신·플랫폼 비교표(L88~96), 명령 대조표(L100~111)는 L450에 링크한 LLDB 'GDB to LLDB Command Map'과 공식 문서 수준이다. 고유한 것은 같은 factorial 프로그램을 두 디버거로 따라간 세션(L264~358)과 첫 문제 네 가지(L362~412)인데, 세션 출력이 코드와 줄 번호가 맞지 않는다. 선택 기준(L117~124)의 '통합 최강'(L122), '공식 지원되는 유일한 디버거'(L120)는 근거 없는 단정이다. |
| B | 11 | 메커니즘(L27~80) → 차이(L84~124) → 설치(L128~188) → 컴파일 옵션(L192~237) → 첫 세션(L241~358) → 첫 문제(L362~412) → 로드맵·정리(L416~440) 흐름은 완성됐다. 세션 출력이 코드와 맞지 않고(L273·L278·L288 대 L247~255), macOS GDB 사이닝(L157~160)은 주석 두 줄과 URL뿐이다. 정확성 문제가 열려 있어 B ≤ 13이다. |
| C | 7 | 설치 명령(L132~174), 컴파일 명령(L197, L261), 출력이 붙은 GDB·LLDB 세션(L266~356), 오류 메시지와 해결 명령(L366~412)이 있다. 출력이 코드와 맞지 않고, LLDB 세션은 Linux 경로 /tmp/hello·x86_64·0x5555… 주소를 쓰면서 L321·L341에 `queue = 'com.apple.main-thread'`를 적어 한 환경의 출력인지 알 수 없다. 'GDB 10+, LLDB 13+'(L188), 'GCC 4.8+'(L212)는 출처 없는 수치라 C ≤ 8이고 출력 불일치로 1점을 더 뺐다. |
| D | 10 | 같은 시리즈 `chapter02-basic-commands.md` L13~30 명령 표가 이 글 L100~111과 같은 명령을 다루지만 ch02 L15가 역할을 나눈다. 디버그 심볼 분리 objcopy 절차(L223~235)는 gdb-lldb chapter11 L246, chapter12 L399, postmortem chapter04 L45, dwarf-elf chapter06 L129, embedded chapter05 L529에 거의 같은 명령으로 반복된다. ptrace_scope(L403~412)는 chapter08-remote-debugging L220과 겹친다. 입문·설치·첫 세션 역할은 구별된다. |
| E | 5 | 제목 'GDB vs LLDB 분석 — 설치·차이·선택 기준'(L2)의 설치(L128~188), 차이(L84~113), 선택 기준(L115~124)은 다룬다. '분석'에 해당할 메커니즘 설명은 ptrace 코드 다섯 줄과 불릿 넷(L55~70), Mach 두 문장(L74), Windows 두 문장(L78)뿐이라 루브릭 E '분석을 약속하고 개념 소개 수준이면 3~5'를 적용했다. |
| F | 5 | 다음 장 안내(L444)는 seriesOrder 2 `chapter02-basic-commands.md`와 맞고 관련 항목(L455~458: ch02, ch11 '.gdbinit 추천' L120, dwarf-elf ch01, sanitizers ch02) 라벨도 맞다. 그러나 허브 역할의 로드맵 표(L418~431)가 Ch 11까지만 적어 공개 글 `chapter12-dwarf.md`(seriesOrder 12)를 빠뜨렸고, L430 Ch 11 설명('.gdbinit, signal, watchpoint 함정')이 실제 제목('STL·최적화 코드·시간 역행 디버깅')과 다르다. L19 Concurrency는 링크 없이 이름만 있다. |
| G | 3 | 참고 자료(L448~451)에 GDB 문서, LLDB 튜토리얼, 명령 대조표, DWARF 표준이 있고 대조표(L450)는 L100~111 표와 연결된다. macOS 사이닝은 sourceware 위키(L159)를 가리킨다. 버전 출력(L182 'GNU gdb 12.1', L185 'lldb 15.0.7')으로 환경을 일부 밝혔다. 'GDB 10+, LLDB 13+'(L188), L120, 'LLVM 프로젝트(2007)'(L90)에는 출처가 없다. |

uncertainties:
- L90 'LLVM 프로젝트 (2007)', 'GNU 프로젝트 (1986)' 시작 연도를 1차 자료로 확인하지 않았다.
- L94 'lldb의 내장 GUI', L120 'macOS에서 공식 지원되는 유일한 디버거', L74 'macOS는 ptrace가 제한적이고 Mach 메시지로 같은 일을 함'은 Apple·LLDB 문서로 확인하지 않았다.
- L106 대조표 행 라벨 '한 줄 실행 (스텝아웃)'이 `finish` 의미와 맞지 않는다(표기 실수로 보고 오류 확인 제외).
- L188 'GDB 10+, LLDB 13+ 권장', L212 'GCC 4.8+'(-Og 도입)는 릴리스 노트로 확인하지 않았다.
- L321·L341 Linux x86_64 LLDB 세션에 `queue = 'com.apple.main-thread'`가 찍히는지 의심스럽다.
- L380 'Cannot find bounds of current function' 원인 설명, L411 `/etc/sysctl.conf` 방식의 최신 배포판 적용 여부 미확인.

점수 구간 메모: 점수 구간은 병합 검토(40~59)이나 시리즈 첫 글·허브라 루브릭 5절에 따라 보강이다. 오류 확인 때문에 최종 판정은 우선 조치다.

### `gdb-lldb/chapter02-basic-commands.md` — 52점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, 28524a9d 코드 블록 언어 태그, 07cc1988 관련 항목 추가, be973200 topic, ac24bb76 제목 변경, ffe6517b 주석 언어 복원, f38a41a0 TikZ 변환, 400892d7 린터 일괄, 60ec7a24 다이어그램)에 GDB 매뉴얼·LLDB 문서와 명령 의미를 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고 원문 안에서 동시에 참일 수 없는 두 진술도 찾지 못했다(158행 next 3→5와 165행 next 4→5, 282~286행 display 값, 330·336행 list 줄 수는 어긋나지 않는다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 17~28행 명령 10개 표, 61~133행 break 변형, 229~237행 포맷 지정자, 302~312행 info 서브 명령은 GDB 매뉴얼과 479행 cheat sheet 수준의 목록이다. 고유한 것은 141~166행 add() 예제에 위치 번호를 붙여 next·step·finish 도착 줄을 표로 비교한 부분과 270~276행 set var로 분기를 강제하는 예 정도다. 30행 '이 10개를 외우면 디버거 사용 90%가 끝납니다', 357행 '변수 상태가 안 맞으면 죽음'은 근거 없는 단정이다. 앵커 part7-05(A 9)와 같은 수준이다. |
| B | 11 | 13행 명령 표부터 run/continue, break, 진행 명령, print, info, list, jump/return, quit·help·init 파일, cheatsheet(441~458행), 정리(462~469행)까지 흐름은 간다. 184행은 stepi를 최적화 코드용이라고만 하고 최적화 빌드에서 next·step이 튀는 모습은 없다. 209행 함수 호출 side effect는 '주의'로 끝나고 454행 cheatsheet의 backtrace는 본문 설명이 없다. 정확성 불확실(45·165~166·189~192·236행)이 열려 있어 B ≤ 13이다. |
| C | 7 | 명령과 일부 예상 출력(202·206행 $1·$2, 222~224행, 282~286행 display, 373~375행 quit 확인)이 있다. 141~151행 예제의 빌드 명령(-g, -O0)과 GDB·LLDB 버전·OS가 없고, 202행 $1 = 42와 222행 $1 = {field1 …}이 다른 세션 값이라 한 세션 기록이 아니다. 30행 '90%'는 출처 없는 수치라 C ≤ 8이다. |
| D | 9 | 비교한 글: 같은 시리즈 chapter01·03·05·11, 다른 시리즈 `python/chapter01-pdb-basics.md`, `embedded/modern-recipes/part10-03-gdb-remote-debug.md`. 89~95행 조건부 break는 ch05 21~27행과 두 줄이 같고, 99~106행 tbreak·`--one-shot`은 ch05 109~120행, 110~114행 rbreak는 ch05 124~132행, 123~124행 disable/enable은 ch05 293~294행과 겹친다. 17~28·441~458행은 ch01 98~111행 대조표와 같은 명령 집합이고, 403~425행 .gdbinit은 ch11 120행 절과 겹친다(138행 pagination 공통). ch03 13~15행은 본 글을 전제로 해 역할이 갈리고 pdb 95~193행·recipes 10-03 76~97행은 도구·대상이 다르다. |
| E | 7 | 제목 'break·step·next·print 동작 비교'와 description '핵심 명령 10가지'는 본문 범위와 맞고 154~171행이 step·next·finish를 실제로 비교한다. 제목이 'GDB·LLDB'를 내걸었는데 137~192행 진행 명령, 200~237행 print 대부분, 349~365행 jump/return에 LLDB 대응이 없다. |
| F | 7 | 473행 다음 장 예고는 seriesOrder 3 `chapter03-inspecting-state.md`이고 '메모리, 레지스터, STL 컨테이너, 포인터 트리'가 그 글 27·134·196·274행 절과 맞다. 483~486행 관련 항목 라벨도 각 대상과 맞다. 15행이 전제 글로 Ch1을, 437행이 .gdbinit 심화로 Ch11을 가리킨다. audit:reading·폰 폭 렌더는 확인하지 않아 9 이상은 주지 않았다. |
| G | 2 | 본문 출처는 477~479행 참고 자료와 487행 명령 매핑 링크뿐이고 문서 최상위 링크라 45행 continue N, 189행 until, 236행 p/f 같은 주장과 연결되지 않는다. 479행은 제3자 cheat sheet다. 본문에 GDB·LLDB 버전과 OS가 없다. |

uncertainties:
- 45행 'continue N으로 N번 무시': GDB 매뉴얼은 ignore count를 N-1로 둔다고 기억하나 확인하지 않았다.
- 165~166행 위치 4에서 next와 finish가 모두 '5'로 간다는 표: 149행 z 대입이 남아 finish는 149행(위치 3)으로 돌아올 가능성이 있다.
- 189~192행 until 50 설명: until이 사용자 breakpoint를 무시하지 않는 것으로 기억하나 미확인.
- 236행 p/f '정수 메모리를 float으로'의 최근 GDB 동작 미확인.
- 268행 'print x = 100도 동일 효과', 380행 -q, 427행 auto-load safe-path, 433행 LLDB stop-disassembly-display 값, 24행 'fin' 약어는 문서로 대조하지 않았다.
- 30행 '디버거 사용 90%'는 출처 없는 수치다. 285행 display 예시의 '6' 줄이 소스 줄인지 값인지 모호하다.

병합 대상: 부분 병합 후보 `chapter05-breakpoints-watchpoints.md`(본 글 89~133행 조건부·tbreak·rbreak·enable/disable이 ch05 21~27·109~132·293~294행과 겹침). 글 전체를 합칠 대상은 없다. 'GDB 기본 명령'은 독립 검색 의도가 있으므로 다음 조치는 보강이다(break 변형은 한 줄 소개 뒤 ch05로 넘김, LLDB 대응이 빠진 진행 명령·print 절 보강, 141~151행 예제에 빌드 명령·버전·실제 세션 출력, 45·165~166·189~192·236행 명령 의미를 GDB 매뉴얼과 대조).

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- 공통 H2 뼈대(ESP32-C3 8편): '한 줄 요약 → 본문 → 자주 하는 실수와 troubleshooting → 정리 → 다음 편 → 관련 항목'이 이 루프의 ESP32-C3 8편 모두에 있다(예: ch05 13·356·394·404·409행, ch06 13·298·324·334·339행, ch07 13·247·261·272·276행, ch08 13·284·298·309·313행, ch09 13·309·331·342·346행, ch10 13·315·330·341·345행, ch11 13·247·262·273·277행, ch12 13·216·248·259행). 12편이 한 커밋 7b2b5e69로 작성됐다. 9절 scaled content 기록 대상이다.
- git 이력에 1차 자료 대조 커밋 없음: 10편 모두 factcheck '검증됨'이 아니다. ESP32-C3 Mastering과 GDB and LLDB 모두 `/fact-check-round`를 거치지 않았다.
- 원문 내부 수치·서술 모순: ch05 278행(22 ms 대 30 fps), ch06 5·15·260행과 116~117행, ch08 L296·L307(MTU)과 L56 대 L60·L62, ch11 161·184행과 232 대 108~111행, ch12 194 대 201행과 50 대 25~26행, gdb ch01 L243~257 대 L273~297·L323~327. 1차 자료 없이 원문만으로 확인된 오류가 6편이다. 같은 일괄 작성 글의 수치를 전수 검산해야 한다.
- 출처·환경 없는 측정 수치(C ≤ 8): ch05 223·278·338행, ch06 30·150·300~302행, ch07 227~243행, ch08 L60~63·L84~85·L142~147, ch09 300·307행, ch10 208·282행, ch11 235행, ch12 23~28·94·224·229행, gdb ch01 L188·L212, gdb ch02 30행. 10편 모두 C ≤ 8 상한이 걸렸다.
- 본문 1차 출처·버전 표기 없음: ESP32-C3 8편 모두 G = 2이고 출처가 관련 항목 끝 docs.espressif.com '/latest/' 링크뿐이다(ch05 415~417, ch06 346~347, ch07 283~284, ch08 L318~320, ch09 352~353, ch10 352~353, ch11 283~285, ch12 267~268행). gdb ch02도 G = 2다.
- 관련 항목·다음 편 라벨과 대상 불일치, 링크 없는 항목: ch05 413·414행, ch06 336·343~345행, ch08 L317, ch09 351행, ch10 350·351행, ch11 282행, ch12 244행, gdb ch01 L418~431(로드맵에서 chapter12 누락)·L430. fa55144d(SERIES 일괄 치환·STRIP)와 8bf4703f(draft 대상 링크 삭제)가 남긴 패턴으로 보인다. 같은 커밋이 손댄 다른 글도 대조해야 한다.
- 옛 'Ch N: X' 제목을 쓰는 링크 라벨: ch06 336·343행, ch08 L311·L315~L317, ch07 L274·L279. ac24bb76 제목 변경 뒤 라벨이 따라가지 않았다.
- 시리즈 내부 중복과 수치 불일치: 전력 수치(80 mA·15 mA·130/140 µA)가 ch01 129~132행, ch07 229·268행, ch10 208행, ch12 23~28·250행에 반복되고 값이 글마다 다르다. `esp_pm_config_t`·`esp_wifi_set_ps` 코드가 ch07 218~223행, ch10 193~198행, ch12 42~48·79~90행에 반복된다. 파티션 설명은 ch03 102~138행과 ch09 214~240행에 중복된다. WiFi PHY 비율은 ch01 97행 150 Mbps와 ch07 17·236행 72.2 Mbps가 다르다.
- '터치 센서' 표기 충돌: ch05 406·412행과 ch06 제목·5행 description은 터치 센서를 내걸고, ch06 15·260행은 없다고 하며, ch12 233행 회고는 '터치'를 다뤘다고 한다.
- ESP-IDF 판 미고정: ch05 245·401행 '4.x 이상', ch06 48행 '5.x', ch09 17행 'v5.x'·196행 '>=5.1', chapter01 146행 release/v5.1, ch10·ch11·ch12 표기 없음.

## 다음 조치

- 우선 조치(6편, 오류 확인): ESP32-C3 ch05 278행, ch06 5행 description·116~117행·28/35행, ch08 L296·L307 MTU와 L56·L62 거리 배수, ch11 161·184행 SPI_BOOT_CRYPT_CNT와 226~236행 전환 표 순서, ch12 194~214행 배터리 계산과 50행 해석, gdb-lldb ch01 L243~257 코드와 L273~327 세션 출력 줄 번호를 먼저 정정한다. 근거를 만들 수 없는 수치는 지우거나 TBD로 둔다.
- 관련 항목·다음 편 라벨을 실제 대상과 맞춘다: ch05 413·414, ch06 336·343~345, ch08 L317, ch09 351, ch10 350·351, ch11 282, ch12 244행, gdb ch01 로드맵(L418~431)에 chapter12-dwarf 추가와 L430 설명 수정.
- 병합 검토(4편): ch07은 절전 절을 ch12로 넘기고 수치 출처를 보강한다. ch09는 파티션 절을 ch03 링크로 줄이고 'CMake 통합'을 채운다. ch10은 tickless 절을 ch12로 모으고 동기화 절을 modern-recipes part6-05·6-07 링크로 줄인다. gdb ch02는 break 변형을 ch05로 넘기고 LLDB 대응을 채운다. 네 편 모두 글 전체 병합 대상은 없다.
- ESP32-C3 Mastering 전체와 GDB and LLDB ch01~ch02를 `/fact-check-round` 대상으로 올린다. 7b2b5e69 일괄 작성 글의 전력·throughput·메모리 수치는 데이터시트·ESP-IDF 문서로 정본을 한 곳에 정하고 나머지는 링크로 대체한다. 시리즈 간 모순 수치는 정본 확정 뒤 `data/known-falsehoods.yaml` 등재를 검토한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
