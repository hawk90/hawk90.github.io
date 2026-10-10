# Modern Embedded Recipes — 루프 02 (seriesOrder 10~19)

> 분석 단계: 루브릭 기반 검사·분류 1차  
> 대상: 공개 글 10편  
> 기준: AdSense 공개 글 평가 루브릭  
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

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

