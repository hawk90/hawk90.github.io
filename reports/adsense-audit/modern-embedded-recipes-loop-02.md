# Modern Embedded Recipes — 루프 02 (seriesOrder 10~19)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음
>
> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

## 결론

이번 루프의 10편은 모두 분석 대상 범위에 들어왔고, 산문 중앙값은 2,977자다. 1편이 산문 2,500자 미만이고, 0편이 1,500자 미만이다. 0편은 코드가 산문보다 길다.

이번 루프에서도 외부 URL·작성자 측정 근거·실패 사례의 존재는 자동 신호만으로 확정하지 않는다. 보고서의 후보는 사람의 원문 확인을 위한 우선순위이며, 자동 분류만으로 글을 제외하지 않는다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 근거·실전성 검토 | 10 | 기계 신호 기반 후보. 최종 판정 아님 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 외부 출처 없음 | 10 |
| 실전 신호 약함 | 5 |
| 산문 <2500 | 1 |

## 공통 검사 결과

- 제목·본문 주제는 모두 Modern Embedded Recipes의 하드웨어·신호·저수준 주제 범위에 있음.
- 공통 섹션 수는 아래 표에 기록했으며, 이전 루프의 템플릿 반복 여부와 함께 비교해야 함.
- 외부 URL 수가 0이면 실제 출처가 전혀 없다는 뜻이 아니라, Markdown 원문에서 절대 URL을 자동 추출하지 못했다는 뜻이다.
- 실전 신호 단어 수는 경험의 증거가 아니다. 환경, 절차, 관찰값이 함께 있는지 다음 정성 단계에서 확인한다.

## 다음 판단 우선순위

1. 산문 1,500~2,500자 글 중 코드·표가 설명을 대체하고 있지 않은지 확인
2. 실제 장비·보드 조건·실패 모형·선택 기준이 본문에 존재하는지 확인
3. 이전 루프와 동일한 섹션이 반복되더라도 각 글의 독립 질문이 분명한지 확인
4. Abseil·Folly 제외 결정과 달리 이 시리즈는 아직 일괄 제외하지 않고 루프 결과를 누적

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part1-10-can-electrical.md | CAN 버스 전기적 특성 — Differential·Termination·Dominant/Recessive | 2,550 | 1,174 | 0 | 1 | 8 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 2 | part1-11-rs485-rs422.md | RS-485·RS-422 차동 신호 분석 — Termination·Biasing·Topology | 2,658 | 1,079 | 0 | 1 | 8 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 3 | part1-12-lvds-differential.md | LVDS 차동 신호 분석 — Common-Mode·Impedance·Eye Pattern | 2,977 | 350 | 0 | 1 | 8 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 4 | part2-01-cortex-m-comparison.md | ARM Cortex-M 시리즈 비교 — M0·M3·M4·M7·M33·M55 분석 | 2,842 | 731 | 0 | 7 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 5 | part2-02-cortex-a-comparison.md | ARM Cortex-A 시리즈 비교 — A53·A55·A72·A78·X1 분석 | 3,032 | 719 | 0 | 7 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 6 | part2-03-arm-registers.md | ARM 레지스터 구조 분석 — R0~R15·CPSR·SPSR·Banked Registers | 3,067 | 1,466 | 0 | 3 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 7 | part2-04-cortex-m-exceptions.md | Cortex-M 예외 처리 — Vector Table·NVIC·Tail-Chaining 추적 | 3,137 | 1,546 | 0 | 2 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 8 | part2-05-arm-memory-map.md | ARM 메모리 맵 분석 — Normal·Device·Strongly-Ordered Region | 3,116 | 1,553 | 0 | 1 | 8 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 9 | part2-06-arm-cache.md | ARM L1·L2 캐시 분석 — Set Associative·Inclusive·Maintenance | 2,665 | 1,867 | 0 | 9 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 10 | part2-07-arm-mpu.md | ARM MPU 활용 — Region·Attribute·Privilege Separation | 2,458 | 1,689 | 0 | 1 | 8 | 산문 <2500, 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |

## 루프 종료 조건

- 대상 10편과 보고서 행 10개 일치
- 원문 콘텐츠 파일 변경 없음
- git diff --check 통과
- 다음 루프에서 비교할 공통 패턴과 미해결 질문 기록

## 정성 평가 업데이트

원문 10편을 직접 대조해 루브릭 7개 항목으로 잠정 점수화했다. 점수는 Google의 공식 점수나 승인 확률이 아니라 콘텐츠 품질·독립 가치·검증 가능성을 비교하기 위한 내부 지표다. P0 정책 차단 요소는 확인되지 않았다. 실제 보드·계측기·벤치마크 결과와 ARM/CAN/RS-485/LVDS 공식 문서 대조 전이므로 신뢰도는 중간이다.

### 요약

| 파일 | 점수 | 잠정 판정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part1-10-can-electrical.md` | **70/100** | 보강 | 전압·종단·bit timing·CAN-FD를 연결하지만 실제 파형과 트랜시버 조건이 없다 |
| `part1-11-rs485-rs422.md` | **70/100** | 보강 | termination·biasing·turn-around을 다루지만 케이블·unit load·실패 측정이 부족하다 |
| `part1-12-lvds-differential.md` | **71/100** | 보강 | swing·common-mode·임피던스·eye를 설명하지만 부품/stackup 조건과 측정 근거가 약하다 |
| `part2-01-cortex-m-comparison.md` | **71/100** | 보강 | M 계열 기능 비교와 선택 맥락은 좋지만 코어별 수치의 출처·칩 조건이 없다 |
| `part2-02-cortex-a-comparison.md` | **70/100** | 보강 | A 계열·big.LITTLE 비교는 유용하지만 성능·전력 표의 실험 조건이 불명확하다 |
| `part2-03-arm-registers.md` | **75/100** | 유지 후보 | AAPCS·예외 진입·특수 레지스터를 코드와 연결해 독립적인 디버깅 가치가 있다 |
| `part2-04-cortex-m-exceptions.md` | **76/100** | 유지 후보 | vector table·stacking·tail-chaining·late arrival을 추적 절차와 연결한다 |
| `part2-05-arm-memory-map.md` | **67/100** | 보강 | 메모리 영역·attribute·MPU 흐름은 있으나 코어/제품별 조건과 수치 근거가 약하다 |
| `part2-06-arm-cache.md` | **72/100** | 보강 후 유지 | cache 정책·maintenance·DMA 함정을 설명하지만 코어별 결과와 측정 조건이 부족하다 |
| `part2-07-arm-mpu.md` | **71/100** | 보강 | region·permission·attribute·sub-region을 다루지만 실제 fault 재현과 RTOS 조건이 없다 |

### 항목별 점수

| 파일 | 독창성 25 | 완결성 20 | 실전 검증 15 | 중복/병합 15 | 검색 의도 10 | UX/내부링크 10 | 신뢰/출처 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part1-10-can-electrical.md` | 16 | 15 | 9 | 11 | 9 | 8 | 2 | **70** |
| `part1-11-rs485-rs422.md` | 16 | 15 | 9 | 11 | 9 | 8 | 2 | **70** |
| `part1-12-lvds-differential.md` | 17 | 15 | 9 | 11 | 9 | 8 | 2 | **71** |
| `part2-01-cortex-m-comparison.md` | 17 | 15 | 9 | 11 | 9 | 8 | 2 | **71** |
| `part2-02-cortex-a-comparison.md` | 16 | 15 | 9 | 11 | 9 | 8 | 2 | **70** |
| `part2-03-arm-registers.md` | 18 | 16 | 10 | 12 | 9 | 8 | 2 | **75** |
| `part2-04-cortex-m-exceptions.md` | 18 | 16 | 11 | 12 | 9 | 8 | 2 | **76** |
| `part2-05-arm-memory-map.md` | 16 | 14 | 8 | 10 | 9 | 8 | 2 | **67** |
| `part2-06-arm-cache.md` | 17 | 15 | 10 | 11 | 9 | 8 | 2 | **72** |
| `part2-07-arm-mpu.md` | 17 | 15 | 9 | 11 | 9 | 8 | 2 | **71** |

### 공통 근거와 우선순위

- CAN·RS-485·RS-422·LVDS는 표의 대표 전압·거리·속도만으로는 독립적인 경험이 되기 어렵다. 트랜시버 부품, 케이블, 종단·bias 값, probe 위치와 실제 파형을 함께 기록해야 한다.
- Cortex-M/A 비교 글의 CoreMark·DMIPS·SPEC·전력 수치는 칩 구현, 컴파일러, 클럭, 메모리·온도 조건에 따라 달라진다. 출처와 측정 조건 없는 숫자는 범위 또는 예시로 명시할 필요가 있다.
- 레지스터·예외 글은 코드와 진단 순서가 있어 이번 루프에서 상대적으로 독립 가치가 높다. 다만 M0/M3/M4/M7의 예외 cycle과 FPU 동작을 한 표로 일반화하지 않도록 코어별 범위를 분리해야 한다.
- 메모리 맵·cache·MPU 글은 ARM 아키텍처와 특정 MCU 구현을 구분해야 한다. 특히 attribute, bit-band, cache line, barrier의 적용 범위를 공식 ARM 문서와 칩 reference manual로 대조해야 한다.
- 공통 템플릿 자체는 문제라기보다, 각 글에 서로 다른 실패 재현·선택 기준·측정 결과가 있는지가 핵심이다.
- 이번 평가는 점수 기록만 수행했다. 원문 수정·비공개·삭제·URL 변경은 하지 않았다.

## v1.2 재평가 (2026-10-11)

루브릭 v1.2(`docs/adsense-audit/rubric.md`)와 앵커(`docs/adsense-audit/anchors.md`)를 먼저 읽고, 10편을 원문 전체로 다시 읽어 채점했다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다.

공통 필드: 10편 모두 `score_status: 잠정`이다. P0는 찾지 못했다. 확인 범위는 원문 본문과 내부 링크 대상의 존재 여부까지이고, 렌더링·광고 배치는 보지 않았다. factcheck는 git 이력으로 정했다. `part2-03-arm-registers.md`만 커밋 `49d3a567`에서 1차 자료와 대조한 기록이 있어 `검증됨`이고, 나머지 9편은 출처 없는 `Qualify …` 커밋만 거쳐 `미검증`에서 출발했다. 원문 안에서 두 위치가 서로 맞지 않는 글은 루브릭 3-1절에 따라 `오류 확인`으로 올렸다. 외부 자료는 가져오지 않았고, 기억에 기댄 의심은 `uncertainties`에 적었다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part1-10-can-electrical.md` | 11 | 12 | 6 | 7 | 7 | 5 | 1 | 49 | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `part1-11-rs485-rs422.md` | 11 | 10 | 6 | 11 | 5 | 6 | 1 | 50 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part1-12-lvds-differential.md` | 9 | 9 | 4 | 12 | 5 | 5 | 1 | 45 | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `part2-01-cortex-m-comparison.md` | 11 | 11 | 5 | 12 | 6 | 5 | 1 | 51 | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md` |
| `part2-02-cortex-a-comparison.md` | 9 | 10 | 7 | 12 | 4 | 6 | 1 | 49 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part2-03-arm-registers.md` | 16 | 15 | 8 | 11 | 8 | 5 | 2 | 65 | 검증됨 | 보강 | 높음 | `part12-10-on-device-llm.md` |
| `part2-04-cortex-m-exceptions.md` | 10 | 10 | 5 | 6 | 4 | 5 | 1 | 41 | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md` |
| `part2-05-arm-memory-map.md` | 11 | 12 | 7 | 9 | 6 | 6 | 1 | 52 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part2-06-arm-cache.md` | 11 | 10 | 6 | 9 | 3 | 5 | 1 | 45 | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `part2-07-arm-mpu.md` | 12 | 12 | 7 | 8 | 6 | 5 | 1 | 51 | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |

v1.1 대비: 67~76점이던 점수가 41~65점으로 내려갔다. v1.1이 `유지 후보`로 적은 `part2-03`(75)은 1차 자료 대조를 거친 유일한 글이고 v1.2에서도 이 루프 최고점이지만, 틀린 "더 깊이" 링크(F)와 본문 출처 부재(G) 때문에 `보강`이다. 같은 `유지 후보`였던 `part2-04`(76)는 원문 안의 cycle 수치 모순으로 `우선 조치`가 됐다.

### part1-10-can-electrical.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | dominant/recessive 전압 표(28~31행), bxCAN BTR 계산(72~82행), bit rate별 길이·stub 표(111~123행)가 구체적이다. 길이·stub 표는 출처가 없고, 55·59행은 sample point·bitrate 상한을 "정합니다"·"고정값은 아닙니다"로 비웠다. |
| B | 12 | 차동·wired-AND·종단·bit timing·CAN-FD·초기화·송신·함정까지 흐름이 완성됐다. |
| C | 6 | 레지스터 코드는 있으나 BTR 값이 주석의 목표 bitrate와 맞지 않고(아래 factcheck), 측정·파형이 없다. 101~102행은 `len`과 무관하게 8 byte를 읽는다. |
| D | 7 | 5-10 `can-communication`이 CAN 신호(25행~), bit timing(50행~), BTR 초기화(119~122행), filter·송신을 같은 레지스터로 다룬다. 이 글만의 몫은 전기 특성 표와 stub 길이다. |
| E | 7 | 제목·description(차동·120Ω·1Mbit 한계)과 본문이 같은 질문을 향하고 과장이 없다. 대상 독자는 명시하지 않았다. |
| F | 5 | 155행 다음 편(RS-485)은 맞다. 162행 "Practical RTOS Internals: 통신 ISR 패턴" 링크가 `00-preface`로 간다. |
| G | 1 | ISO 11898·transceiver 데이터시트 인용이 없다. |

factcheck `오류 확인`: 72행 목표는 500 kbit/s·87.5%이고 80~82행 설정은 TSEG1 = 13, TSEG2 = 2라서 1 + 13 + 2 = 16 TQ다. 78행 스스로 계산한 대로 42 MHz / 6 / 16 = 437.5 kbit/s인데, 79행은 "정확: 42M / 6 / 14 = 500k"로 코드에 없는 14 TQ를 쓴다. 판정은 `우선 조치`(점수 구간: 병합 검토)다.

uncertainties:
- 55행은 75~87.5%가 "표준 고정값은 아닙니다"라 하고 151행은 "75~87.5% 표준"이라 한다. 완곡 수정 뒤 정리에서 남은 문장으로 보인다.
- 145행 common-mode "-2 ~ +7 V", 113~117행 bit rate별 길이는 transceiver·표준 문서로 확인하지 않았다.
- 101~102행 `*(uint32_t *)data` 비정렬 접근 여부는 호출부가 없어 판단하지 못했다.

### part1-11-rs485-rs422.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | RS-422 vs RS-485 표(29~35행), `TC` flag를 기다린 뒤 DE를 내리는 코드(66~74행), Modbus RTU 3.5 char 송수신 예(80~112행)가 실무에 가깝다. 차동 전압 표(41~44행)는 칸이 "데이터시트의 논리 상태"·"조건 확인"이라 정보가 없다. |
| B | 10 | 종단·bias·half-duplex·Modbus는 다루지만 bias 저항 계산이 없고, 136행 "680Ω + 680Ω"은 앞에서 소개되지 않은 값이 함정 절에 처음 나온다. |
| C | 6 | Modbus 코드는 재현할 수 있으나 104~109행 수신 루프에 전체 응답 timeout과 `buf` 범위 검사가 없다. 측정·파형이 없다. |
| D | 11 | 종단 설명(52행)은 스스로 "CAN과 마찬가지로"라 하고, 공통 GND 함정(146~148행)도 1-10과 같다. Modbus·DE/RE 전환은 이 글만의 역할이다. |
| E | 5 | 제목의 "Topology"는 그림과 52행 한 줄뿐이고 "분석"에 비해 개념 소개 수준이다. |
| F | 6 | 166행 다음 편(LVDS)이 seriesOrder 12와 맞고, 관련 항목 세 개(170~172행)가 실제 UART·CAN·LVDS 글로 간다. 전제 지식 안내가 없어 7점은 주지 않았다. |
| G | 1 | TIA/EIA-485·Modbus 사양 인용이 없다. |

uncertainties:
- 122행 RS-485 "거리 (low speed) 1.2 km"와 130행 "10 kbit → 1500 m"가 같은 표준의 최대 거리로 서로 다르다.
- 152행 "중간 노드 종단 시 진폭 절반"은 계산 근거가 없다.
- 82행 "3.5 char time = 4 ms @ 9600"은 8N1(10 bit) 기준으로 약 3.65 ms라, 11 bit 문자 기준인지 원문에 없다.

병합 대상: 병합 대상 없음. Modbus·RS-485는 CAN과 검색 의도가 다르다. 다음 조치는 `보강`(차동 threshold 표 채우기 또는 `TBD`, bias 저항 계산, topology 절)이다.

### part1-12-lvds-differential.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 전류 모드 swing 계산(36행, 3.5 mA × 100 Ω = 350 mV)은 맞다. 차동 패밀리 표(63~67행)는 LVPECL·CML 행이 전부 "부품별 상이"이고, 임피던스 표(53~57행)는 stack-up 조건만 있고 출처가 없다. |
| B | 9 | 정의·종단·패밀리·pre-emphasis·eye까지 항목은 있지만 46~50행에 의미 없는 ASCII 조각과 `<!-- TODO: TikZ -->`가 남아 차동 pair 배치 설명이 비었다. eye diagram은 개념(80~86행)뿐이다. |
| C | 4 | OBUFDS 인스턴스(92~102행)와 DT 예(106~113행)는 실행 조건·결과가 없다. 측정 절차가 없다. |
| D | 12 | 시리즈 유일의 고속 차동 글이다. 신호 무결성 일반론은 1-01과 일부 겹친다. |
| E | 5 | 제목의 Eye Pattern을 "분석"하지 않고 소개만 한다. description의 LVPECL·CML은 빈 칸 표다. |
| F | 5 | 163행 다음 편(2-01)과 관련 항목은 맞다. 그러나 46~49행 ASCII 조각이 본문에 그대로 렌더링돼 읽기를 끊는다. |
| G | 1 | TIA/EIA-644 등 1차 출처가 없다. |

factcheck `오류 확인`: 70행은 "USB 3.x와 MIPI·HDMI는 각각 별도의 전기 규격을 사용"한다고 하는데, 158행은 "LVPECL, CML, HCSL 등 변종이 PCIe, SATA, USB 3.0의 기반"이라 하고 22행도 USB 3.0을 LVDS 계열의 "기반 신호" 용례로 든다. 20행은 MIPI CSI-2를 "별도의 D-PHY/C-PHY 계층"이라 하고 104행은 "DPHY 블록이 LVDS 신호를 처리"한다고 한다. 판정은 `우선 조치`(점수 구간: 병합 검토)다.

uncertainties:
- 128~130행 FR-4 손실 길이, 140행 "길이 차가 클럭 한 cycle의 5%", 119행 "LVDS 3 Gbit × 8 lane"은 출처 없는 수치다.
- 70행 마지막 문장 "LVDS를 단순히 저속 버전으로 볼 수는 없습니다"는 앞 문장과 논리 연결이 없다.

### part2-01-cortex-m-comparison.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 코어 표(25~36행)·FPU 표(63~69행)·선택 요약(144행)과 같은 FIR을 손 코드·CMSIS-DSP로 비교한 예(81~104행)가 있다. 성능 표(108~115행)는 수치가 있으나 출처·클럭·컴파일러가 없다. |
| B | 11 | "어느 코어를 언제 쓰나"라는 질문에 144행이 답한다. description의 M85는 표 한 행과 Helium 언급뿐이다. |
| C | 5 | 108~115행 FIR 시간은 어떤 클럭·보드에서 쟀는지 없고, 81~95행 코드는 `coef`가 선언되지 않았다. 102행 `state`는 위 함수의 static 배열과 이름만 같다. |
| D | 12 | 선택 가이드라는 역할이 분명하다. 2-02와 구조만 같고 내용은 겹치지 않는다. |
| E | 6 | 제목의 M0~M55와 본문 표가 맞는다. "분석"이라 하기엔 수치 근거가 없다. |
| F | 5 | 149행 다음 편(2-02)은 맞다. 156행 "Embedded C++ for Real Systems: 코어별 최적화" 링크가 `00-preface`로 간다. |
| G | 1 | Arm 코어 TRM·CoreMark 결과 출처가 없다. |

uncertainties:
- 108행 표 머리는 "전력 (mA/MHz)"인데 칸은 "11 µA"처럼 단위가 다르다.
- 117행 "같은 1 MHz라도 성능과 전력이 2~7배"는 표의 CoreMark/MHz 비(약 2.6배), 전력 비(약 2.7배), FIR 비(60배) 어느 것과도 맞지 않는다.
- 127행 "`-mcpu=cortex-m4`만으로는 DSP 명령이 안 나오고 `-mfpu`·`-mfloat-abi`를 추가해야"는 DSP와 FPU 옵션을 섞은 것으로 보이나 GCC 문서로 확인하지 않았다.
- 131행 "Helium은 GCC 10+" 버전 미확인.

병합 대상: 병합 대상 없음. 코어 선택은 독립 검색 의도다. 다음 조치는 `보강`(성능 표에 출처·조건, 없으면 `TBD`)이다.

### part2-02-cortex-a-comparison.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 패밀리 표(28~38행)에서 제목에 나온 A53·A55·A72·A78 행이 파이프라인·issue·캐시 모두 "구현별"이다. 남은 고유 내용은 RK3588 구성 예(57~61행)와 AArch32/64 표(71~77행) 정도다. |
| B | 10 | in-order/OoO·big.LITTLE·AArch64·Neoverse·affinity까지 다루지만 제목의 코어들에 대한 비교 수치가 비어 있다. |
| C | 7 | `/proc/cpuinfo`·`lscpu`·`taskset`·`pthread_setaffinity_np` 코드(91~117행)는 그대로 실행할 수 있다. 전력 표(133~137행)는 SoC·조건이 없다. |
| D | 12 | 응용 코어 선택이라는 역할이 분명하다. affinity 예는 7-13 `irq-affinity`·8-06 `numa`의 `taskset`과 겹친다. |
| E | 4 | 제목의 X1이 본문에 한 번도 나오지 않고, 제목에 나열한 코어 넷이 표에서 빈 칸이다. description의 Neoverse가 오히려 본문 비중이 크다. |
| F | 6 | 169행 다음 편(2-03)과 관련 항목(173~176행, MMU·bootloader 글)이 실제 내용과 맞는다. 전제 지식 안내는 없다. |
| G | 1 | 코어 TRM·SPEC 결과 출처가 없다. |

uncertainties:
- 141행 함정 제목은 "A53과 A72"인데 143행 본문은 "A55만으로 동작"이라 한다.
- 73행은 범용 레지스터를 X0~X30으로 세면서 75행은 LR을 "별도"로 적었다. LR이 X30인지 원문 안에서 정리되지 않았다.
- 155행 "60℃ 이상이면 governor가 frequency를 떨어뜨린다", 122~131행 DMIPS·SPECint 수치는 출처 없음.

병합 대상: 병합 대상 없음. Cortex-A 선택은 2-01과 검색 의도가 다르다. 다음 조치는 `보강`(제목 코어 표 채우기 또는 제목에서 X1 제거 결정)이다.

### part2-03-arm-registers.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 16 | AAPCS 표에 R9 플랫폼 역할(33행), PSP를 먼저 쓰고 SPSEL을 바꿔야 하는 순서(52~57행), FP context가 쌓이면 EXC_RETURN bit 4가 0이 되는 값과 그것을 보는 `tst r14, #0x10`(71행), IPSR이 IRQ 번호가 아니라 exception 번호라는 점(85~90행), BASEPRI shift 함정(193~195행)이 구체적이다. 출처를 본문에 연결하지 않아 20점대는 아니다. |
| B | 15 | 범용·특수 레지스터, EXC_RETURN, xPSR, context switch, 함정까지 별도 검색 없이 따라간다. 203행이 A-profile과의 차이(CPSR·SPSR 없음)를 정리한다. FAULTMASK는 표 한 줄(101행)뿐이고 M0 계열 차이를 다루지 않아 앵커 12-10(B 16)보다 한 점 낮게 뒀다. |
| C | 8 | PendSV context switch 어셈블리(120~157행)와 FreeRTOS 포트와의 차이 설명(159행)이 있어 8~11 구간이다. 실행 결과·검증 절차는 없다. 161~177행 "측정 / 비교" 표는 레지스터 개수라 측정이 아니다. |
| D | 11 | HW stacking 8 word·FP lazy stacking(174~177, 189~191행)이 2-04와, BASEPRI·FreeRTOS critical section(110~114행)이 6-09와, PendSV는 3-06과 겹친다. 레지스터 지도라는 역할은 구별된다. |
| E | 8 | 제목·description("register set 전체 지도")·본문·정리가 같은 질문을 향하고 과장이 없다. 대상 독자는 19~22행 상황 목록으로만 드러난다. |
| F | 5 | 210행 다음 편(2-04)은 맞다. 217행 "Practical RTOS Internals: Context Switch 구현" 링크가 `00-preface`로 가서 5점 이하 규칙을 적용했다. |
| G | 2 | 1차 대조 기록(커밋 `49d3a567`)은 factcheck에만 반영했다. 본문은 FreeRTOS `ARM_CM4F` 포트·`xPortPendSVHandler`(159행), CMSIS `NVIC_USER_IRQ_OFFSET`(85행)을 이름으로만 언급하고 버전·링크가 없다. |

uncertainties:
- 57행 "CMSIS 구현이 MSR 뒤 ISB까지 실행"은 CMSIS 버전에 따라 다를 수 있으나 본문에 버전이 없다.
- 132·148행은 LR까지 9 word를 저장·복원한다. 새 task의 초기 stack frame도 같은 배치여야 하는데 그 생성 코드는 글에 없다.

### part2-04-cortex-m-exceptions.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | vector table offset(30~43행), entry 6단계(54~61행), tail-chaining·late-arrival 설명은 표준 자료와 같은 수준이다. 63행은 12 cycle을 "대표값이며 … 늘어날 수 있습니다"로 완곡하게 바꿨고 157행 표 칸은 "구현별"이다. |
| B | 10 | 기본 흐름은 있지만 65~67행은 그림 자리에 `<!-- TODO: TikZ flow diagram -->`만 남았다. late-arrival 예(88~92행)는 결과 cycle이 없다. |
| C | 5 | handler·NVIC 코드(116~151행)는 있으나 제목이 약속한 "추적" 절차(DWT·로직 분석기 등)가 없다. |
| D | 6 | 4-05 `interrupt-handling`이 vector table과 ISR 명명(25행~), priority·pre-empt vs sub-priority(79~101행), tail-chaining·late arrival(102행), EXTI pending 클리어를 같은 코드로 다룬다. HW stacking은 2-03과도 겹친다. |
| E | 4 | 제목이 "추적"을 내걸지만 본문은 개념 설명이다(루브릭 E 주석: 3~5점). |
| F | 5 | 207행 다음 편(2-05)은 맞다. 214행 "Practical RTOS Internals: PendSV 구현" 링크가 `00-preface`로 간다. |
| G | 1 | ARMv7-M ARM·코어 TRM 인용이 없다. |

factcheck `오류 확인`:
- 82행은 tail-chaining이 "5~6 cycle을 절약"한다고 하는데, 같은 글 158~160행 표는 exit 12 + entry 12 cycle 대 tail-chained 6 cycle이라 표대로면 18 cycle 차이다.
- 149행은 EXTI0에 priority 2를 주는데, 166~167행 표는 "Priority 0~3: Reset, NMI, HardFault, MemManage", "Priority 4~255: NVIC IRQ"라 적었다.

판정은 `우선 조치`(점수 구간: 병합 검토)다.

uncertainties:
- 15행 "12 cycle 안에 … 끝나고"는 63·201행의 "측정해야" 문장과 어조가 다르다(완곡 수정 뒤 남은 문장).
- 158~162행 M7 cycle 수(11·7·+17)는 출처가 없다.
- 186행 "FPCAR 활용 필수"의 구체 의미가 없다.

### part2-05-arm-memory-map.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | STM32F4 주소 예(45~53행, SRAM1 112 KB·SRAM2 16 KB 산술이 맞음), bitband 주소식과 매크로(80~97행), linker script(120~137행)가 구체적이다. 접근 cycle 표(143~151행)는 출처가 없고 30·139행은 "확인해야 합니다"로 끝난다. |
| B | 12 | 영역·attribute·bitband·MPU override·linker·함정까지 흐름이 완성됐다. |
| C | 7 | bitband 매크로와 linker script는 그대로 쓸 수 있다. 관찰 결과·검증 절차는 없다. |
| D | 9 | MPU override 절(101~114행)과 stack guard 함정(168~170행)이 2-07과, DMA cacheable 함정(160~162행)이 2-06과, MEMORY 블록이 3-04 `linker-script-basics`와 겹친다. |
| E | 6 | 제목의 Normal·Device·Strongly-Ordered는 59~63행 표와 코드 한 조각으로 다룬다. description의 bitband·MPU는 본문에 있다. |
| F | 6 | 188행 다음 편(2-06)과 관련 항목 네 개(192~195행)가 실제 내용과 맞는다. 전제 지식 안내는 없다. |
| G | 1 | ARMv7-M ARM·STM32F4 reference manual 인용이 없다. |

uncertainties:
- 106~112행은 `B` 비트만 켜고 "bufferable, non-cacheable"이라 DMA buffer용으로 쓴다. 2-07 72행 표는 같은 TEX=000·C=0·B=1을 Device로 적었다(다른 글과의 모순이라 이 글의 factcheck에는 넣지 않았다).
- 74행 "DMA buffer를 strongly-ordered에 두면 throughput이 큰 폭으로 떨어진다"는 근거가 없다.
- 145~151행 cycle 수는 출처 없음.

병합 대상: 병합 대상 없음. 메모리 맵은 독립 검색 의도다. 다음 조치는 `보강`(MPU 절은 2-07로 넘기고 attribute 절을 1차 자료로 정리)이다.

### part2-06-arm-cache.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | DMA write·read 방향별 maintenance 순서(68~93행)와 "단순 invalidate는 dirty data를 잃을 수 있어 clean 후 invalidate"(71~72행)는 실전 판단이다. 코어 표(151~157행)는 대부분 "구현별"이고 성능 배수 표(165~169행)는 출처가 없다. |
| B | 10 | maintenance·enable·DMA 패턴은 있지만 제목의 set associative·inclusive가 본문에 없다. |
| C | 6 | 코드 순서는 재현할 수 있으나 113~133행 "안전한 패턴"이 위 절차와 맞지 않는다(아래 factcheck). 측정 조건이 없다. |
| D | 9 | 4-10 `dma-basics`의 cache coherency 절(67행), 2-10 `memory-barrier`의 `SCB_InvalidateDCache_by_Addr` 예와 겹친다. |
| E | 3 | 제목 키워드 셋 중 Set Associative·Inclusive 둘이 본문에 한 번도 나오지 않는다. 일부 미이행이 아니라 제목 범위의 대부분이 빠져 3점으로 뒀다. |
| F | 5 | 201행 다음 편(2-07)은 맞다. 208행 "Embedded Performance Engineering: Cache 분석" 링크가 `00-preface`로 간다. |
| G | 1 | 코어 TRM·CMSIS 문서 인용이 없다. |

factcheck `오류 확인`:
- 78~79행은 DMA 완료 뒤 "다시 invalidate해 CPU cache의 stale line 제거"를 필수 단계로 두는데, 113~133행 "안전하게 사용하는 패턴"은 시작 전 invalidate만 하고 130행에서 "cache는 비어 있음 (위에서 invalidate)"이라며 완료 뒤 invalidate를 생략한다.
- 114행 주석은 "64-byte aligned buffer"인데 115행 코드는 `aligned(32)`다.

판정은 `우선 조치`(점수 구간: 병합 검토)다.

uncertainties:
- 145~146행 `TEX=1`·`B=1`을 "non-cacheable"로 적었는데 2-07 75행 표의 non-cacheable은 TEX=001·C=0·B=0이다(다른 글과의 모순).
- 159~163행 "Cortex-M7 @ 400 MHz L2 hit 5~10"은 153행 "L2 option (chip별)"과 함께 어떤 칩 기준인지 없다.
- 187행 "성능이 1/10" 출처 없음.

### part2-07-arm-mpu.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | SIZE 필드 표(43~51행, log2 − 1 산술이 맞음), AP 표(55~63행), TEX/C/B 표(69~76행), stack guard 코드(94~111행), MemManage handler(117~134행)가 구체적이다. region 수 표(146~152행)는 전부 "구현별"이다. |
| B | 12 | region·크기·권한·attribute·sub-region·stack guard·fault 분석까지 흐름이 완성됐다. 제목의 privilege separation은 136~142행 세 줄이고 `mpu_set_region()`은 정의가 없다. |
| C | 7 | stack guard와 fault handler는 재현할 수 있다. guard에 닿았을 때 기대 로그·CFSR 값 예시가 없다. |
| D | 8 | 8-09 `stack-analysis`의 "MPU stack guard (Cortex-M)" 절(114행~)과 `MemManage_Handler`가 같은 내용이고, 2-05의 MPU override 절과도 겹친다. |
| E | 6 | 제목의 Region·Attribute는 다루지만 Privilege Separation은 얕다. |
| F | 5 | 194행 다음 편(2-08 MMU)은 맞다. 201행 "Practical RTOS Internals: Task isolation" 링크가 `00-preface`로 간다. |
| G | 1 | ARMv7-M ARM 인용이 없다. |

factcheck `오류 확인`: 85행은 1 KB region을 128 B sub-region 8개로 나누고 86행 `SRD = 0x18`(sub-region 3·4)을 끈다고 하는데, 87행은 제외 범위를 "0x20000180~0x200002FF"로 적었다. sub-region 3·4는 0x180~0x27F이고, 0x2FF까지는 sub-region 5가 포함된다. 판정은 `우선 조치`(점수 구간: 병합 검토)다.

uncertainties:
- 33행 region 2 "0x20020000 ~ 0x20030000"은 끝 주소를 포함하면 64 KB + 1 byte다.
- 140행 `MPU_AP_RW_RW`로 task A "만" 접근 가능하게 한다는 설명은 PRIVDEFENA·unprivileged 설정이 함께 있어야 성립하는데 그 조건이 이 조각에 없다.

### 시리즈 공통 문제

- 틀린 "더 깊이" 링크: 라벨은 통신 ISR 패턴, 코어별 최적화, Context Switch 구현, PendSV 구현, Cache 분석, Task isolation인데 대상은 모두 자매 시리즈 `00-preface`다. 해당: `part1-10`(162행), `part2-01`(156행), `part2-03`(217행), `part2-04`(214행), `part2-06`(208행), `part2-07`(201행). 검증된 `part2-03`도 이 때문에 F가 5점이다.
- 같은 H2 뼈대: 10편이 모두 루프 01과 같은 `한 줄 요약 / 어떤 상황에서 쓰나 / 핵심 개념 / 코드 / 측정 / 비교 / 자주 보는 함정 / 정리 / 관련 항목` 순서다. 사이트 게이트(9절) scaled content 수치에 넣는다. 해당: 10편 전부.
- 완곡 표현으로 비운 표: "구현별"·"부품별 상이"·"데이터시트의 논리 상태" 칸이 핵심 표를 차지한다. 해당: `part1-11`(41~44행), `part1-12`(63~67행), `part2-02`(28~38행), `part2-04`(157행), `part2-06`(151~157행), `part2-07`(146~152행).
- 출처·조건 없는 성능 수치 표: `part1-10`(111~123행), `part2-01`(108~115행), `part2-02`(122~137행), `part2-05`(143~151행), `part2-06`(159~169행).
- 제목 키워드 미이행: `part2-02`(X1 없음), `part2-06`(Set Associative·Inclusive 없음), `part2-04`("추적" 절차 없음), `part1-11`(Topology 한 줄).
- 원문 안의 수치·설명 모순: `part1-10`(72·79↔80~82행), `part1-12`(70↔158·22행, 20↔104행), `part2-04`(82↔158~160행, 149↔166행), `part2-06`(78~79↔130행, 114↔115행), `part2-07`(85~86↔87행). 루프 01의 4편과 합치면 Part 1~2에서 9편이다. 개별 수정 전에 Part 1~2 전체의 계산·코드 주석을 한 번에 대조하는 작업이 필요하다.
- MPU attribute 인코딩이 글마다 다르다: `part2-05`(106~112행, TEX=000·B=1을 non-cacheable로 사용), `part2-06`(145~146행, TEX=1·B=1을 non-cacheable로 표기), `part2-07`(69~78행, TEX=000·B=1은 Device, non-cacheable은 TEX=001·C=0·B=0). 셋 중 어느 것이 맞는지 1차 자료로 정한 뒤 함께 고친다.
- 뒤 Part의 구현 글과 겹침: `part1-10`↔`part5-10`, `part2-04`↔`part4-05`, `part2-06`↔`part4-10`, `part2-07`↔`part8-09`. Part 1~2를 "원리", Part 4~5·8을 "구현"으로 나눈 구조가 실제 본문에서는 같은 레지스터 코드로 반복된다.
- 본문 출처 부재: `part2-03`(G 2)을 뺀 9편이 G 1점이다.
