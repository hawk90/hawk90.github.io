# Modern Embedded Recipes — 루프 12 (seriesOrder 110~119)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음
>
> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

## 결론

이번 루프의 10편은 산문 중앙값 약 3,347자다. 산문 2,500자 미만은 0편, 1,500자 미만은 0편이며, 코드가 산문보다 긴 글은 4편이다.

이번 결과는 공개 유지 여부를 확정하지 않는다. 외부 URL·실전 경험·출처의 자동 신호는 누락될 수 있으므로, 다음 정성 검토에서 원문 위치와 실제 절차를 확인해야 한다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 정성 검토 우선 | 4 | 코드 비중과 설명의 역할을 먼저 확인할 후보. 최종 판정 아님 |
| 근거·실전성 검토 | 6 | 외부 출처·근거 신호를 우선 확인할 후보. 최종 판정 아님 |
| 1차 유지 후보 | 0 | 기계 신호만으로 유지 후보로 올릴 글 없음 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 외부 출처 없음 | 10 |
| 산문 <2500 | 0 |
| 산문 <1500 | 0 |
| 코드 우세 | 4 |
| 실전 신호 약함 | 1 |

## 검사 포인트

- MPMC Queue 글은 코드가 설명을 대체하지 않는지, 진행 보장·메모리 순서·메모리 회수 조건을 구분해 설명하는지 확인한다.
- 디버깅 마인드셋·JTAG/SWD·GDB·HardFault·UART·부팅·인터럽트·메모리·Race 글은 진단 순서와 관찰 가능한 증거가 실제로 제공되는지 확인한다.
- 디버깅 글이 같은 “체크리스트” 템플릿만 반복하지 않고 문제 유형별로 독립적인 분기와 종료 조건을 갖는지 비교한다.
- `part10-04-hardfault-analysis.md`는 실전 신호가 약한 후보로, 레지스터 설명과 실제 fault 재현·판독 절차가 연결되는지 우선 확인한다.
- 외부 링크가 없다는 자동 신호만으로 출처 부재를 확정하지 않고, 원문에 ARM·CMSIS·OpenOCD·J-Link·GDB 공식 자료가 인용 또는 명시되는지 확인한다.
- 전압·클럭·우선순위·레지스터 비트·fault frame처럼 플랫폼 의존적인 수치는 적용 범위와 근거를 함께 기록한다.
- Abseil·Folly와 달리 Modern Embedded Recipes는 이 단계에서 일괄 제외하지 않는다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part9-10-mpmc-queue.md | MPMC Queue 구현 — Multi-producer Multi-consumer Lock-Free | 3,279 | 4,194 | 0 | 15 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 2 | part10-01-debug-mindset.md | 임베디드 디버깅 마인드셋 — 가설·격리·재현·이분탐색 | 3,904 | 971 | 0 | 19 | 16 | 외부 출처 없음 | 근거·실전성 검토 |
| 3 | part10-02-jtag-swd.md | JTAG·SWD 안 붙을 때 — 핀·전압·속도·세션 진단 | 3,038 | 2,425 | 0 | 3 | 19 | 외부 출처 없음 | 근거·실전성 검토 |
| 4 | part10-03-gdb-remote-debug.md | GDB 원격 디버깅 — OpenOCD·J-Link·target remote 구성 | 2,946 | 4,421 | 0 | 2 | 17 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 5 | part10-04-hardfault-analysis.md | Cortex-M 하드폴트 분석 — Stacked Frame·CFSR 읽기 | 4,329 | 3,313 | 0 | 1 | 13 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 6 | part10-05-uart-not-printing.md | UART 안 찍힐 때 — Bare-metal 체크리스트 | 3,091 | 2,241 | 0 | 3 | 17 | 외부 출처 없음 | 근거·실전성 검토 |
| 7 | part10-06-boot-failure.md | 임베디드 부팅 실패 진단 — 단계별 Isolation | 3,841 | 1,962 | 0 | 11 | 16 | 외부 출처 없음 | 근거·실전성 검토 |
| 8 | part10-07-interrupt-debugging.md | 인터럽트 누락·중복 진단 — Priority·Pending·Re-entry 추적 | 4,036 | 3,195 | 0 | 3 | 17 | 외부 출처 없음 | 근거·실전성 검토 |
| 9 | part10-08-memory-corruption.md | 메모리 오버플로우·오염 진단 — Canary·MPU·Pattern 분석 | 3,414 | 4,036 | 0 | 5 | 17 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 10 | part10-09-timing-race-diag.md | 타이밍·Race 진단 — Heisenbug 잡는 법 | 3,186 | 3,663 | 0 | 9 | 16 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |

## 판정 보류와 다음 조치

이번 루프에서는 원문을 수정하지 않는다. 다음 정성 검토에서 각 글의 다음 근거를 원문 위치와 함께 기록한다.

1. 실제 보드·디버거·툴체인·칩 범위와 재현 가능한 절차
2. 로그·레지스터·파형·트레이스 등 관찰 결과와 조건
3. 공식 문서·데이터시트·디버거 자료 등 주장에 대응하는 출처
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

기계 triage 후 원문을 직접 읽은 `part10-04-hardfault-analysis.md`의 잠정 평가를 추가한다. P0 정책 차단은 확인되지 않았다.

| 파일 | 상태 | 총점 | 결정 | 핵심 근거 |
| --- | --- | ---: | --- | --- |
| `part10-04-hardfault-analysis.md` | 잠정 | **77/100** | 보강 | stacked frame·CFSR·addr2line·NVRAM 진단 흐름은 강하지만 Cortex-M 변형 조건과 사례 재현 근거가 부족함 |

| 항목 | 점수 |
| --- | ---: |
| 독창성 | 18/25 |
| 완결성 | 17/20 |
| 실전성·검증 가능성 | 11/15 |
| 중복·병합 위험 | 12/15 |
| 검색 의도 일치 | 9/10 |
| 탐색성·가독성·내부 연결 | 8/10 |
| 작성자·출처·신뢰성 | 2/5 |

근거 위치: `사례 — "그냥 멈춰요"`, `Step 1 — Handler에서 SP 잡기`, `Step 2 — CFSR 비트 해석`, `Step 3 — PC를 source line으로`, `사례 마무리`, `Imprecise BFSR`, `사용 권장 패턴`, `정리`. FPU stacking, Cortex-M 변형, `CCR.STKALIGN`, fault enable 조건과 사례 출력의 실제성 여부를 확인한다. 원문은 수정하지 않았다.

### 추가 정성 평가

| 파일 | 총점 | 결정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part9-10-mpmc-queue.md` | **70/100** | 보강 | Vyukov/Disruptor와 benchmark 구조는 있으나 “5~10배” 주장과 실제 contention 결과가 없음 |
| `part10-01-debug-mindset.md` | **80/100** | 유지 후보 | 가설·재현·bisect·노트 작성이 실제 행동으로 이어지지만 사례와 방법론의 공식 근거가 없음 |
| `part10-02-jtag-swd.md` | **78/100** | 보강 | 전기·핀·속도·잠금·복구 순서가 실용적이나 probe/MCU별 명령 검증이 필요함 |
| `part10-03-gdb-remote-debug.md` | **80/100** | 유지 후보 | OpenOCD/pyOCD/GDB/RTOS/CI 흐름이 풍부하지만 모든 MCU 조합에 대한 일반화는 제한됨 |
| `part10-05-uart-not-printing.md` | **80/100** | 유지 후보 | 전기→핀→clock→baud→logic analyzer→polling 순서가 재현 가능하지만 MCU별 표준 출처가 없음 |
| `part10-06-boot-failure.md` | **80/100** | 유지 후보 | 전원·reset·clock·vector·main을 단계적으로 격리하고 실제 crystal 불량 사례를 제시함 |
| `part10-07-interrupt-debugging.md` | **79/100** | 보강 | pending/mask/priority/level/shared IRQ와 GPIO/DWT 측정이 연결되지만 peripheral별 차이가 큼 |
| `part10-08-memory-corruption.md` | **80/100** | 유지 후보 | canary/MPU/watchpoint/ASan/fill pattern을 원인 추적 흐름으로 연결하지만 target별 구현 확인 필요 |
| `part10-09-timing-race-diag.md` | **78/100** | 보강 | GPIO/DWT/SWO/RTT로 관찰 간섭을 줄이는 방법이 좋지만 사례 원인과 memory-order 조건을 확정해야 함 |

| 파일 | 독창성 25 | 완결성 20 | 실전성 15 | 중복 15 | 검색 의도 10 | UX 10 | 신뢰 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part10-04-hardfault-analysis.md` | 18 | 17 | 11 | 12 | 9 | 8 | 2 | **77** |
| `part9-10-mpmc-queue.md` | 17 | 15 | 9 | 9 | 9 | 8 | 3 | **70** |
| `part10-01-debug-mindset.md` | 18 | 18 | 12 | 12 | 9 | 8 | 3 | **80** |
| `part10-02-jtag-swd.md` | 17 | 18 | 11 | 11 | 9 | 9 | 3 | **78** |
| `part10-03-gdb-remote-debug.md` | 18 | 18 | 12 | 12 | 9 | 8 | 3 | **80** |
| `part10-05-uart-not-printing.md` | 18 | 18 | 12 | 11 | 9 | 9 | 3 | **80** |
| `part10-06-boot-failure.md` | 18 | 18 | 12 | 11 | 9 | 9 | 3 | **80** |
| `part10-07-interrupt-debugging.md` | 18 | 18 | 11 | 11 | 9 | 9 | 3 | **79** |
| `part10-08-memory-corruption.md` | 18 | 18 | 12 | 11 | 9 | 9 | 3 | **80** |
| `part10-09-timing-race-diag.md` | 18 | 17 | 11 | 11 | 9 | 9 | 3 | **78** |

### 공통 근거와 보강 우선순위

- 근거 위치: 각 글의 `사례`, `Step`, `진단 도구`, `측정`, `자주 보는 함정`, `정리` 섹션.
- 공통 강점: 증상에서 바로 수정하지 않고 전기·레지스터·파형·trace·재현 단계로 원인을 좁히는 절차가 있다.
- 공통 감점: 일부 사례의 출력과 수치가 실제 기록인지 예시인지 구분되지 않고, MCU/probe/tool version이 고정되지 않았다.
- 중복 위험: GDB·HardFault·메모리 오염·Race·Interrupt 디버깅은 인접 진단 글과 일부 겹치므로 각 글의 관찰 도구와 종료 조건을 명확히 해야 한다.
- 우선 확인: ARM/CMSIS·OpenOCD·GDB·FreeRTOS 공식 문서, Cortex-M 변형별 fault/trace 조건, 실제 board-in-loop 로그.

원문 수정·비공개·삭제·URL 변경은 하지 않았다.

## v1.2 재평가 (2026-10-11)

루브릭 v1.2와 `docs/adsense-audit/anchors.md`의 앵커 네 편을 기준으로 10편을 원문 전체를 읽고 다시 채점했다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. factcheck는 git 이력으로 고정했다. 10편 모두 출처 없는 `Qualify …` 커밋만 거쳐 `미검증`이고, 1차 자료를 가져와 대조하지 않았다. `오류 확인`은 같은 글 안의 두 위치가 서로 성립할 수 없는 경우에만 줬다. 기억에 기댄 의심은 `uncertainties`에 적었다.

공통 필드: 10편 모두 `score_status: 잠정`이다. P0는 확인되지 않았다. 확인 범위는 원문 본문, 내부 링크 대상의 존재 여부와 라벨 일치, 다음 편 안내와 실제 seriesOrder+1 대조까지다. 렌더링과 광고 배치는 보지 않았다. 내부 링크 대상 파일은 모두 존재하고 draft가 아니다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part9-10-mpmc-queue.md` | 12 | 12 | 5 | 8 | 4 | 3 | 1 | 45 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build, part6-09-isr-api |
| `part10-01-debug-mindset.md` | 15 | 14 | 9 | 12 | 7 | 4 | 1 | 62 | 미검증 | 보강 | 중간 | part12-10-on-device-llm, part6-09-isr-api |
| `part10-02-jtag-swd.md` | 13 | 13 | 8 | 11 | 7 | 3 | 1 | 56 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build, part6-09-isr-api |
| `part10-03-gdb-remote-debug.md` | 13 | 15 | 10 | 11 | 6 | 6 | 1 | 62 | 미검증 | 보강 | 중간 | part12-10-on-device-llm, part7-05-kernel-build |
| `part10-04-hardfault-analysis.md` | 16 | 16 | 10 | 12 | 8 | 5 | 1 | 68 | 미검증 | 보강 | 중간 | part12-10-on-device-llm, part1-04-uart-hardware |
| `part10-05-uart-not-printing.md` | 12 | 14 | 9 | 10 | 8 | 4 | 1 | 58 | 미검증 | 병합 검토 | 중간 | part1-04-uart-hardware, part7-05-kernel-build |
| `part10-06-boot-failure.md` | 16 | 16 | 10 | 12 | 8 | 6 | 1 | 69 | 오류 확인 | 우선 조치 | 중간 | part12-10-on-device-llm, part1-04-uart-hardware |
| `part10-07-interrupt-debugging.md` | 16 | 16 | 10 | 12 | 8 | 5 | 1 | 68 | 미검증 | 보강 | 중간 | part12-10-on-device-llm, part6-09-isr-api |
| `part10-08-memory-corruption.md` | 15 | 16 | 10 | 11 | 8 | 6 | 1 | 67 | 미검증 | 보강 | 중간 | part12-10-on-device-llm |
| `part10-09-timing-race-diag.md` | 15 | 13 | 9 | 11 | 8 | 6 | 1 | 63 | 오류 확인 | 우선 조치 | 높음 | part12-10-on-device-llm, part1-04-uart-hardware |

판정 분포: `보강` 5편, `병합 검토` 3편, `우선 조치` 2편(점수 구간과 무관하게 factcheck `오류 확인`). 80점 이상 글은 없다. v1.1 대비 평균은 78.2점에서 61.8점으로 내려갔다. 디버깅 글(10-0x)은 진단 절차·관찰 출력이 있어 C가 8~10이지만, 사례가 실제 기록인지 밝히지 않고 다음 편·링크 라벨이 틀린 글이 많다.

### part9-10-mpmc-queue.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | Vyukov bounded MPMC 전체 구현(43~106행)과 sequence 상태 설명(108행)은 이 시리즈에서 가장 완결된 MPMC 코드다. 그러나 18행 "lock-free MPMC는 보통 5~10배", 202행 "MPMC는 잘 짜도 SPSC의 1/3 이하", 267행 "Disruptor throughput 최고"가 근거 없이 단정된다. |
| B | 12 | 개념 표 → Vyukov → SPSC 비교 → Disruptor → 라이브러리 → 함정 흐름은 있다. Disruptor는 의사 코드 7줄(143~153행)이고, description이 약속한 "bounded와 unbounded 비교"는 39행 한 문장이다. |
| C | 5 | 측정 표 두 개(191~209행)가 모든 칸 "측정 필요"라 내용이 없다. 189행이 측정 조건을 고정하라고 하지만 절차가 없다. 코드가 완결돼 part6-09(4)보다 1점 높였다. |
| D | 8 | Vyukov 코드는 9-01 198~228행, 9-05 155~180행에 이미 나오고, SPSC 비교(110~139행)는 9-01과 같다. ECPP 4-04 `lock-free-container`에 Boost.Lockfree·moodycamel 절이 있고 PE 4-07에 MPMC 절이 있다. |
| E | 4 | description이 "실측과 함께 정리"한다고 약속하지만 실측 값이 하나도 없다. 약속 불이행이라 3~5 구간이다. |
| F | 3 | 272행 "Part 9의 마지막 챕터… 시리즈 전체를 마무리"라고 하지만 seriesOrder 111(`part10-01`)부터 Part 10이 이어진다. 276행 라벨 "2-02"는 `part9-01-lock-free-ring`으로 가 번호가 틀렸다. |
| G | 1 | Vyukov 원문, Disruptor 논문, 라이브러리 버전 링크가 없다. |

uncertainties:
- 30행 "MPMC의 두 대표 패턴"이라고 한 뒤 33~37행 표는 네 행(Vyukov, Disruptor, boost, moodycamel)이다. 개수 오기로 보고 `오류 확인`에는 넣지 않았다.
- 168행 "boost::lockfree::queue = Michael & Scott + tagged pointer" 미확인.
- 185행은 moodycamel의 bounded 여부를 "확인해야" 한다고 하고 266행은 unbounded로 권한다.

병합 대상: `src/content/blog/embedded/embedded-cpp/part4-04-lock-free-container.md`(Boost.Lockfree·moodycamel 절). Vyukov 구현과 sequence 설명은 이 글이 가장 완결돼 있으므로 병합 시 그 부분을 보존하고, 9-01·9-05의 Vyukov 조각을 이 구현 하나로 모으는 것이 먼저다.

### part10-01-debug-mindset.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 증상·모델·차이·가설·측정을 분리하는 틀(24~32행), LED 가설 사이클(36~48행), "SPI flash 간헐 쓰기 실패" 노트 표(132~138행), 측정 도구 hierarchy(154~166행)가 방법론을 임베디드 예로 구체화한다. 182행 "두 가지를 같이 바꾸고 동작하면 어느 쪽도 진짜 원인이 아닐 가능성이 큽니다"는 근거 없는 단정이다. |
| B | 14 | 가설 → bisect → 공간 이분 탐색 → changelog → 재현 → 노트 → 수정 검증까지 흐름이 완성됐다. 제목의 "격리(isolation)"는 별도 절이 없다. |
| C | 9 | git bisect·git log 명령(56~65·87~90행)은 그대로 재현된다. SPI flash 사례는 칩(STM32F407, W25Q64)·SPI 속도·전압 dip 값·1만 회 결과를 적어 8~11 구간 상단이다. 사례가 실제 기록인지 확인할 수 없어 12점 이상은 주지 않았다. |
| D | 12 | heisenbug 언급(152행)은 10-09, 단계 격리는 10-06과 겹치지만 이 글은 Part 10의 방법론 글로 역할이 구별된다. |
| E | 7 | 제목·description·본문이 같은 질문을 향한다. "격리"는 부분 미이행이다. |
| F | 4 | 202행 "다음 편은 하드폴트 분석"인데 seriesOrder 112는 `part10-02-jtag-swd`다. 관련 링크 206~208행 라벨은 대상과 맞는다. 틀린 다음 편 안내라 5점 이하다. |
| G | 1 | 디버깅 방법론 출처가 없다. |

uncertainties:
- 132행 사례 날짜 "2026년 5월 16일"은 frontmatter 날짜(4행, 2026-04-19)보다 뒤다. git 이력상 이 문단은 109편을 한 번에 쓴 커밋 `62e5e6fc`(2026-05-19)에서 들어왔다. 실제 경험 기록인지 확인하지 못했다.
- 36~47행 예에서 가설 A의 측정("시작 직후 LED ON")이 성공했다면 LED 포트 설정이 맞았다는 뜻이라 가설 C(GPIOA/GPIOC 혼동)와 어긋날 수 있다. 시작 시 LED 코드가 별도 포트를 썼는지 본문이 밝히지 않는다.
- 100행 "자주 봅니다"는 출처 없는 경험 주장이다.

### part10-02-jtag-swd.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 펌웨어가 SWD 핀을 GPIO로 바꿨을 때 connect-under-reset으로 복구하는 절(246~263행), `DBGMCU->CR`로 sleep 중 디버그를 유지하는 코드(131~134행)는 실전 정보다. 20핀·10핀 핀 배치 표(32~57행)와 RDP 레벨 설명은 공식 자료의 반복이다. |
| B | 13 | 전기 → 핀 → 속도 → reset → 보안 잠금 → 전원 상태 → 복구 순 체크리스트가 끝까지 간다. 17~26행 비교 표의 26행은 칸이 비고 문장이 깨졌다. |
| C | 8 | OpenOCD·GDB·J-Link Commander 명령(145~189행)은 재현 가능하다. 관찰 결과는 233행 에러 한 줄뿐이고, 169행 `sudo cp /etc/udev/rules.d/99-stlink.rules ...`는 복사 원본과 대상이 같은 디렉터리라 명령이 성립하지 않는다. part7-05(8)와 같은 수준이다. |
| D | 11 | OpenOCD·GDB 연결(143~163행)은 10-03의 주제이고, connect-under-reset·RDP Level 2 경고는 10-06 85~91·125·234행과 반복된다. "JTAG 안 붙을 때"라는 검색 의도는 독립적이다. |
| E | 7 | 제목의 핀·전압·속도는 이행한다. "세션 진단"에 해당하는 절은 udev·권한(165~177행) 정도다. |
| F | 3 | 295행 "다음 part는 Cortex-M Bring-up"인데 seriesOrder 113은 `part10-03-gdb-remote-debug`다. 299행 라벨 "1-05: Bootloader"는 `part3-12-bootloader-chain`으로 가 번호가 틀렸다. |
| G | 1 | ARM Debug Interface 문서, OpenOCD 버전, ST·Nordic 문서 링크가 없다. |

uncertainties:
- 244행 "Debugger TDI → Target TDI"는 커넥터 신호 이름 규칙(타깃 기준 표기)과 맞는지 확인하지 않았다.
- 25행 "Cortex-A: SWD 가능 (cJTAG 변종)"의 의미가 불명확하다.
- 84행 "flash erase ~분 단위", 191행 "J-Link는 양산 라인의 표준"은 출처 없는 주장이다.
- 105·121행(RDP Level 2는 영구, 칩 교체 외 답 없음)과 267~270행 복구 절차는 RDP 레벨별 적용 범위를 구분하지 않는다.

병합 대상 없음. "JTAG·SWD가 안 붙을 때"는 10-03(GDB 구성)·10-06(부팅 실패)과 다른 독립 검색 의도다. 다음 조치는 `보강`: 내비게이션 수정, 10-03과 겹치는 OpenOCD 절을 링크로 대체, 칩별 명령에 출처·버전 기입.

### part10-03-gdb-remote-debug.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | `.gdbinit`의 `connect`·`dump_regs` 매크로(119~143행), SVD 로드(239~257행), CI board-in-loop 스크립트(259~283행)는 도구를 엮는 관점이 있다. 핵심 명령 모음(74~94행)은 GDB 문서와 같은 내용이다. |
| B | 15 | 연결 → 명령 → watchpoint → 자동화 → RTOS → pyOCD → SWO → IDE → CI → 함정까지 별도 검색 없이 따라갈 수 있다. |
| C | 10 | OpenOCD 실행 결과(50~54행), watchpoint 출력(100~111행), RTOS thread 목록(154~159행) 같은 예상 출력이 있어 8~11 구간이다. OpenOCD·GDB 버전과 보드가 고정돼 있지 않고 출력이 실제 캡처인지 밝히지 않아 12점 이상은 아니다. |
| D | 11 | OpenOCD 연결 부분은 10-02 143~163행과, watchpoint 절은 10-08 107~131행과 겹친다. GDB 구성이라는 역할은 구별된다. |
| E | 6 | 제목이 J-Link를 내걸지만 J-Link GDB server 구성은 없고 209~213행 RTT 한 줄뿐이다. description의 pyOCD·.gdbinit은 이행한다. 부분 미이행이다. |
| F | 6 | 342행 다음 편(하드폴트 분석)이 seriesOrder 114와 맞고 346~348행 링크가 라벨과 일치한다. 24~29행 구성도는 ASCII라 가이드 §6 위반 후보다(점수 외). |
| G | 1 | OpenOCD·GDB·pyOCD 버전과 공식 문서 링크가 없다. |

uncertainties:
- 199행 `tpiu config internal …` 구문이 현재 OpenOCD 버전에서 유효한지 미확인.
- 206행 `itm-parse`가 어떤 도구인지 본문에 설명이 없다.
- 319행 "OpenOCD 일부 버전이 reset 후 sync를 놓칩니다"는 버전이 없다.

### part10-04-hardfault-analysis.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 16 | CFSR 값 `0x00008200`·`0x00020000`을 비트로 풀어 원인과 잇는 표(132~135행), BFAR `0x00000004`에서 `NULL->next`를 읽어 내는 사례(160~183행), NVRAM fault record(201~232행), CFSR W1C clear(272~280행)가 고유하다. 비트 계산(0x8200 = bit 15·bit 9)은 맞다. part12-10(18)보다 사례 실재성이 불명해 2점 낮게 뒀다. |
| B | 16 | 사례 → stacked frame → handler → CFSR → addr2line → 사례 마무리 → imprecise → 현장 저장 → 함정까지 완결된다. 38행이 FPU frame을 언급하지만 77~85행 코드는 8 word frame만 가정한다. |
| C | 10 | handler 코드, `addr2line`·`list *` 명령과 예상 출력(139~156행)이 있다. 대상 core·컴파일러가 고정돼 있지 않고 사례 출력이 실제 캡처인지 밝히지 않는다. |
| D | 12 | NULL+4 사례는 10-08 231~237행, `dump_regs`는 10-03 134~140행과 겹치지만 이 글이 fault 분석의 주 글이다. |
| E | 8 | 제목의 stacked frame·CFSR 읽기를 정확히 이행한다. 제목은 Cortex-M 전체를 내걸지만 CFSR이 없는 ARMv6-M(Cortex-M0) 예외를 언급하지 않아 9점은 아니다. |
| F | 5 | 292행 다음 편(UART 안 찍힐 때)은 seriesOrder 115와 맞지만, 299행 "Embedded Performance Ch 8: Crash 분석"은 `part5-08-nsight`(NVIDIA Nsight Systems)로 가 라벨과 내용이 다르다. 틀린 관련 링크라 5점 이하다. |
| G | 1 | Cortex-M TRM·ARMv7-M ARM 같은 1차 출처와 대상 core 표기가 없다. |

uncertainties:
- 85~86·154행: `buffers[-1]`은 RAM의 포인터 값을 읽는 것이라 그 자체로는 fault가 나지 않을 수 있다. fault는 memcpy의 쓰레기 `dst`에서 나고 BFAR은 그 값이 될 것으로 보이는데, 본문은 "buffers 직전 주소"라고 적는다. ARM 문서로 확인하지 않았다.
- 196행 ACTLR `DISDEFWBUF`(bit 1)는 Cortex-M3/M4 기준이며 M7 적용 여부 미확인.
- 258행 "stacked frame을 못 push하면 HFSR.FORCED"와 lockup 관계 미확인.
- 50·84행("PC = fault 발생 명령 주소")과 286행("정확한 faulting instruction과 다를 수 있음")은 완곡 수정 뒤 표가 갱신되지 않은 흔적이다. 286행이 조건을 달아 정면 모순은 아니다.

### part10-05-uart-not-printing.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | newlib-nano의 `%f` 공백과 `-u _printf_float`(178·228~234행), MCU별 UART 주의 표(155~163행), logic analyzer 관찰→의미 표(121~126행)가 실용적이다. 나머지 체크리스트(GND·교차·baud·AF·clock)는 UART 입문 자료의 표준 목록이다. |
| B | 14 | 전기부터 printf 리다이렉트·SWO·semihosting까지 10단계가 끝까지 간다. description의 "종단"은 123행 표 한 칸이다. |
| C | 9 | `stty`·`screen` 명령(53~57행), STM32 HAL 설정 코드, bit time 계산(114~116행: 1/115200 ≈ 8.68 µs, 10 bit ≈ 86.8 µs)이 맞는다. 실제 파형 캡처나 관찰 결과는 없다. |
| D | 10 | 앵커가 지적한 대로 1-04 `uart-hardware` 132~142행의 TX/RX 교차·baud mismatch 함정과 Step 2·3·6이 겹친다. 진단 순서라는 역할은 구별된다. |
| E | 8 | "UART 안 찍힐 때 — 체크리스트"라는 제목이 대상 독자와 문제를 명확히 하고 본문이 이행한다. "종단"이 약해 9점은 아니다. |
| F | 4 | 254~255행 링크는 "왜 그 값인지", "다음 단계"를 붙인 이 글 고유의 안내지만, 250행 "다음 편은 DDR 초기화"는 seriesOrder 116(`part10-06-boot-failure`)과 다르다. 254행 설명의 "오차 3%"는 본문에서 이미 지워진 값이다(104·244행). 256~257행은 링크 없는 옛 번호다. |
| G | 1 | reference manual·HAL 버전 표기와 출처가 없다. |

uncertainties:
- 124행 "0과 1만 줄줄이 = baud mismatch" 해석의 근거 미확인.
- 198행 semihosting이 "breakpoint로 멈추므로 production 불가"의 조건(디버거 미연결 시 동작) 미확인.
- 19행 "USB-UART converter VCC와 보드 GND 공유?"는 문장이 깨졌다.

병합 대상: `src/content/blog/embedded/modern-recipes/part1-04-uart-hardware.md`(함정 절 132~142행). 다만 "UART가 안 찍힐 때"는 독립 검색 의도가 분명하므로 루브릭 5절에 따라 이 글을 남기고 1-04의 중복 함정 절을 이 글 링크로 바꾸는 차별화 보강을 먼저 검토한다.

### part10-06-boot-failure.md

`factcheck: 오류 확인` — 같은 사례의 원인을 두 번 다르게 적는다. 153행은 "찾았습니다. 외부 crystal 미장착 보드에 HSE 코드로 빌드한 firmware를 flash한 것"이라고 하고, 175행 "사례 마무리"는 "OSC_IN 신호 없음. Crystal 솔더링 불량"이라고 한다. 또 18행은 JTAG 연결이 "Target not responding"이라고 하는데 143~150행은 같은 보드에 GDB로 붙어 PC를 읽는다. 18행은 1장째 보드가 같은 firmware로 동작했다고 해 "HSE 코드로 빌드한 firmware"가 원인이라는 153행과도 맞지 않는다. 판정은 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 16 | vector table 첫 8 byte를 hexdump로 읽는 법(95~110행), DPIDR 출력 유무로 debug port를 가르는 법(75~83행), reset reason flag(214~220행), 기준 보드를 두라는 교훈(183행)이 고유한 진단 관점이다. |
| B | 16 | 전원 → reset → clock → JTAG → flash → boot pin → SystemInit → main 순서가 완결되고 DFU·stm32flash 백업 경로까지 있다. 14행 순서(클럭 → reset)와 본문·252행 순서(reset → 클럭)가 다르다. |
| C | 10 | OpenOCD·hexdump·GDB 명령과 예상 출력(75~83·100~103·143~150행), DFU 명령(189~195행)이 있다. 측정 조건·보드 정보가 없고 사례 출력의 실재성을 알 수 없다. |
| D | 12 | connect-under-reset(91행)과 RDP Level 2(125·234행)는 10-02와 반복되지만 부팅 단계 격리라는 역할은 구별된다. |
| E | 8 | 제목·description의 단계별 isolation을 이행한다. |
| F | 6 | 261행 다음 편(인터럽트 누락/중복)이 seriesOrder 117과 맞고 265~267행 링크가 라벨과 일치한다. 사례로 시작해 사례로 닫는 구성은 있지만 위 모순 때문에 7점을 주지 않았다. |
| G | 1 | reference manual·OpenOCD 버전 등 출처가 없다. |

uncertainties:
- 214행 "`CRRCR` 같은 register"의 존재 여부 미확인.
- 30행 "GND와 VDD 단락 → 0.7V만 떨어짐", 226행 "최소 5장"은 출처 없는 수치다.
- 177행 "정상 부팅했다는 사례입니다"는 사례를 전언으로 바꾼 표현이라 실제 경험인지 알 수 없다.

### part10-07-interrupt-debugging.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 16 | pending bit 하나로 원인을 둘로 가르는 절차(31~45행), `nvic_dump`(49~63행), TIM_SR W0C와 EXTI_PR W1C 대비(115행), priority 5가 register에 0x50으로 쓰이는 설명(153행)이 구체적이다. |
| B | 16 | IRQ 경로 6단계 → 진단 함수 → 사례 7개 → 가시화 도구 → 함정까지 완결된다. 18행이 꺼낸 "1초 타이머가 가끔 2초"는 본문에서 다시 다루지 않는다. 14행의 6단계와 22~27행의 6단계 구성이 다르다. |
| C | 10 | 진단 코드·GPIO toggle·DWT 측정 코드가 그대로 쓸 수 있는 형태다. 233행은 DEMCR TRCENA 설정 없이 CYCCNTENA만 켠다. 실제 logic analyzer 캡처나 측정값은 없다. |
| D | 12 | GPIO toggle·DWT 절(217~246행)은 10-09 64~104행과 같은 기법이고, FreeRTOS priority 함정은 6-09와 겹친다. 진단 대상(인터럽트)은 구별된다. |
| E | 8 | 제목의 Priority·Pending·Re-entry를 모두 다룬다. Re-entry는 tail-chaining 사례(182~199행)로 짧게 다룬다. |
| F | 5 | 305행 다음 편(메모리 오버플로우)은 seriesOrder 118과 맞지만, 311행 "RTOS 3-04: ISR 디자인"은 `part2-04-context-switch`(Context Switch 원리)로 가 번호와 내용이 다르다. |
| G | 1 | STM32 reference manual, ARMv7-M ARM, FreeRTOS 문서 출처가 없다. |

uncertainties:
- 199행 "Counter 증가 자체는 atomic"은 Cortex-M에서 `++`가 load-modify-store라는 점과 맞지 않을 수 있다(앵커 part6-09의 같은 의심 참고). 미확인.
- 109행 `TIM2->SR &= ~TIM_SR_UIF`는 read-modify-write라 다른 flag를 지울 위험이 있는지 미확인.

### part10-08-memory-corruption.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | canary·MPU·watchpoint·ASan·fill pattern·sentinel을 "현장 대 증상"(22~29행)으로 묶는 관점, 디버거 없이 DWT를 직접 설정하는 코드(121~131행), DMA 주소 오프셋 사례(212~229행)가 고유하다. |
| B | 16 | 도구 7종 → 사례 4개 → 오염처럼 보이는 함정(cache) → 정리까지 완결된다. |
| C | 10 | MPU 설정 값 계산이 맞는다(98행 SIZE 4 = 32 byte, 244행 SIZE 7 = 256 byte). 206행 "n = 100 → 68 byte overflow"도 32 byte buffer 기준으로 맞다. ASan·gdb 예상 출력이 있다. 대상 core·툴체인 버전이 없다. |
| D | 11 | NULL+4 사례(231~237행)는 10-04 160~169행, watchpoint 출력(109~117행)은 10-03 100~111행과 거의 같다. |
| E | 8 | 제목의 Canary·MPU·Pattern을 이행한다. |
| F | 6 | 313행 다음 편(타이밍/race 진단)이 seriesOrder 119와 맞고 317~319행 링크가 라벨과 일치한다. |
| G | 1 | GCC·newlib·ARM 문서 출처가 없다. |

uncertainties:
- 125행 `DWT->FUNCTION0 = 5`를 "write 시"로 설명한 부분은 ARMv7-M 인코딩과 대조하지 않았다.
- 286~289행: `uint8_t *`를 통한 접근은 C의 문자형 예외에 해당해 "strict aliasing 위반" 예로 맞지 않을 수 있다. 미확인.
- 48행 "Newlib에는 `__stack_chk_fail`이 없습니다", 278행 `__invalidate_dcache_range`(CMSIS 이름 아님) 미확인.
- 119행 "DWT는 보통 4 comparator"는 10-03 113행("core 구현별로 다름")과 표현이 다르다.

### part10-09-timing-race-diag.md

`factcheck: 오류 확인` — 사례 코드 26행은 처음부터 `volatile uint16_t head, tail;`로 선언돼 있는데, 126~140행은 "진짜 원인"을 `head`가 volatile이 아니었던 것으로 결론 내리고 "수정 → `head`를 `volatile`로 선언"한다. 또 22행 증상은 "문자 한 글자가 사라지는" 것인데 132행이 설명한 원인의 결과는 "main은 무한 루프"다. 사례의 원인과 증상이 같은 글 안에서 맞지 않는다. 판정은 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 가설 표(56~60행)로 원인을 줄이고 GPIO·DWT·SWO 세 측정으로 가시화하는 흐름, DWT 기반 trace ring buffer(225~256행), LDREX/STREX TOCTOU 예(193~210행)가 고유하다. |
| B | 13 | 사례 → 가설 → 측정 3종 → 원인 → 추가 사례 → 함정까지 흐름은 있다. 그러나 중심 사례의 결론이 위 모순으로 성립하지 않아 B를 깎았다. |
| C | 9 | 측정 코드는 그대로 쓸 수 있는 형태지만 99행 `cyc_main_section_start`가 정의되지 않았다. 캡처 결과·측정값이 없다. |
| D | 11 | GPIO toggle·DWT는 10-07 217~246행, heisenbug 설명은 10-01 152·166행, ring buffer 예는 9-01과 겹친다. race 진단이라는 역할은 구별된다. |
| E | 8 | 제목·description의 non-intrusive 관찰 방법을 이행한다. |
| F | 6 | 313행 다음 편(통신 프로토콜 분석)이 seriesOrder 120 `part10-10-protocol-analyzer`와 맞고 317~319행 링크가 라벨과 일치한다. |
| G | 1 | ARM barrier 문서·CMSIS 출처가 없다. |

uncertainties:
- 191행 "M0/M3는 in-order라 문제 없지만 M4/M7은 반드시 barrier"의 M4 분류를 ARM 문서로 확인하지 않았다.
- 277행 "16/32-bit aligned write까지만 atomic", 58행 판정 근거의 출처 미확인.
- 18행 "1000번에 한 번 이상 동작합니다"는 문장이 깨졌다.

### 시리즈 공통 문제

- 다음 편 안내나 관련 링크 라벨이 실제 seriesOrder·대상과 다르다(옛 번호 체계 `1-0x`·`2-0x`·`Ch N` 잔존). F를 5점 이하로 제한했다: `part9-10`(272·276행), `part10-01`(202행), `part10-02`(295·299행), `part10-04`(299행), `part10-05`(250·256~257행), `part10-07`(311행).
- 사례가 실제 기록인지 예시인지 밝히지 않고, 일부는 같은 글 안에서 앞뒤가 맞지 않는다: `part10-01`(132행 날짜가 글 날짜보다 뒤), `part10-04`(18~32·160~183행), `part10-06`(153행 대 175행), `part10-09`(26행 대 132~137행).
- 같은 진단 예제·출력이 여러 글에 반복된다. watchpoint "Old value = 5" 출력: `part10-03`(100~111행)·`part10-08`(109~117·218~225행). BFAR `0x00000004` NULL+4 사례: `part10-04`(160~169행)·`part10-08`(231~237행). connect-under-reset·RDP Level 2 경고: `part10-02`(121·246~263·276행)·`part10-06`(91·125·234행). GPIO toggle·DWT 측정: `part10-07`(217~246행)·`part10-09`(64~104행).
- 측정 표가 `측정 필요`로 채워져 있거나 실측을 약속하고 값이 없다: `part9-10`(191~209행). 루프 11의 `part9-03`·`part9-05`·`part9-06`·`part9-07`과 같은 문제다.
- 레지스터 주소·비트·동작을 단일 STM32F4/Cortex-M3·M4 기준으로 쓰면서 core 범위를 밝히지 않는다: `part10-04`(196행 ACTLR, ARMv6-M 미언급), `part10-07`(153행 priority bit), `part10-08`(119·125행 DWT), `part10-09`(191행 barrier).
- 본문 안에 1차 출처·버전 표기가 없다(G=1): 10편 모두.
