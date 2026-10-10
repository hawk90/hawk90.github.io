# Modern Embedded Recipes — 루프 11 (seriesOrder 100~109)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음
>
> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

## 결론

이번 루프의 10편은 산문 중앙값 3,175자다. 산문 2,500자 미만은 0편, 1,500자 미만은 0편이며, 코드가 산문보다 긴 글은 4편이다.

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
| 실전 신호 약함 | 0 |

## 검사 포인트

- Lock-free Ring Buffer·Wait-Free·CAS 글은 코드가 설명을 대체하지 않는지, 메모리 순서·진행 보장·실패 조건을 구분해 설명하는지 확인한다.
- RCU·Hazard Pointer·ABA 글은 메모리 회수와 수명 관리라는 공통 주제가 중복되지 않고 독립적인 문제를 해결하는지 비교한다.
- Atomic 비용·False Sharing 글의 성능 주장은 CPU 아키텍처, 캐시 계층, 컴파일러, 측정 조건과 함께 검증한다.
- Spinlock과 Mutex 비교는 보편적인 우열로 표현하지 않고 hold time·컨텍스트·스케줄러 조건을 명시하는지 확인한다.
- 외부 링크가 없다는 자동 신호만으로 출처 부재를 확정하지 않고, 원문에 C++ 표준·Linux 커널·아키텍처 문서가 인용 또는 명시되는지 확인한다.
- lock-free·wait-free·RCU·hazard pointer를 같은 의미처럼 사용하는 표현이 있는지 P0/P1 근거 태그로 기록한다.
- Abseil·Folly와 달리 Modern Embedded Recipes는 이 단계에서 일괄 제외하지 않는다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part8-12-wcet-analysis.md | WCET 분석 기법 — Static·Measurement·Hybrid 방법론 | 3,577 | 2,093 | 0 | 21 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 2 | part9-01-lock-free-ring.md | Lock-Free Ring Buffer 구현 — SPSC·Power-of-2·Memory Order | 2,901 | 5,104 | 0 | 8 | 19 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 3 | part9-02-wait-free.md | Wait-Free Signaling — Atomic Flag·Sequence·Latest-Value | 2,995 | 3,452 | 0 | 3 | 16 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 4 | part9-03-rcu-basics.md | RCU (Read-Copy-Update) 기초 — Quiescent State·Grace Period | 3,110 | 2,775 | 0 | 11 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 5 | part9-04-hazard-pointer.md | Hazard Pointer 분석 — Lock-Free Memory Reclamation | 3,240 | 3,209 | 0 | 5 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 6 | part9-05-cas-patterns.md | Compare-And-Swap 패턴 — Stack·Counter·Linked List 적용 | 2,804 | 3,519 | 0 | 11 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 7 | part9-06-atomic-cost.md | Atomic Operation 비용 분석 — Fence·Cache Line·Contention | 2,877 | 3,122 | 0 | 16 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 8 | part9-07-spinlock-vs-mutex.md | Spinlock vs Mutex 결정 가이드 — Context Switch·Hold Time | 3,430 | 3,098 | 0 | 15 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 9 | part9-08-aba-problem.md | ABA 문제 회피 — Tagged Pointer·Hazard·Generation Counter | 3,403 | 3,002 | 0 | 4 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 10 | part9-09-false-sharing.md | False Sharing 해결 — Cache Line Padding·SoA 적용 | 3,252 | 2,893 | 0 | 6 | 8 | 외부 출처 없음 | 근거·실전성 검토 |

## 판정 보류와 다음 조치

이번 루프에서는 원문을 수정하지 않는다. 다음 정성 검토에서 각 글의 다음 근거를 원문 위치와 함께 기록한다.

1. 실제 CPU·컴파일러·툴체인 범위와 재현 가능한 절차
2. 기준선과 비교한 성능·지연·메모리 회수 측정값 및 조건
3. 공식 표준·커널·아키텍처 자료 등 주장에 대응하는 출처
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

기계 triage 대상 10편을 원문으로 읽고 잠정 점수를 추가했다. P0 정책 차단은 확인되지 않았다. 동시성 보장·WCET·성능 주장은 target과 formal/실측 검증 전의 `잠정` 값이다.

| 파일 | 총점 | 결정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part8-12-wcet-analysis.md` | **80/100** | 유지 후보 | WCET/ACET·입력·cache·ISR jitter·static/measurement 한계를 잘 구분하지만 실제 분석 결과가 없음 |
| `part9-01-lock-free-ring.md` | **79/100** | 보강 | SPSC·release/acquire·DMA·SMP 경계를 폭넓게 다루지만 구현별 memory model 검증이 필요함 |
| `part9-02-wait-free.md` | **67/100** | 보강 | 개념과 주의점은 있으나 요약에서 여러 패턴을 wait-free로 묶어 본문 caveat와 정합성이 흔들림 |
| `part9-03-rcu-basics.md` | **77/100** | 보강 | kernel/URCU·grace period·reclamation을 연결하지만 flavor별 실제 적용과 측정이 없음 |
| `part9-04-hazard-pointer.md` | **78/100** | 보강 | reader 보호·retire/scan·RCU 비교가 좋지만 표준화·구현별 메모리 상한 검증이 필요함 |
| `part9-05-cas-patterns.md` | **77/100** | 보강 | CAS loop·weak/strong·backoff·ABA를 실제 패턴으로 연결하지만 contention 결과가 없음 |
| `part9-06-atomic-cost.md` | **78/100** | 보강 | ISA와 memory order별 비용 관점이 명확하지만 LSE/LL-SC/lock 비교 실측이 없음 |
| `part9-07-spinlock-vs-mutex.md` | **76/100** | 보강 | hold time·contention·전력 기준은 유용하지만 kernel/user/RT 환경이 넓게 섞임 |
| `part9-08-aba-problem.md` | **76/100** | 보강 | tagged/version/hazard/RCU 해결책을 비교하지만 128-bit CAS와 reclamation 전제가 target별임 |
| `part9-09-false-sharing.md` | **78/100** | 보강 | padding/per-CPU/perf c2c 해결 흐름이 좋지만 CPU topology별 benchmark가 없음 |

| 파일 | 독창성 25 | 완결성 20 | 실전성 15 | 중복 15 | 검색 의도 10 | UX 10 | 신뢰 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part8-12-wcet-analysis.md` | 18 | 18 | 12 | 12 | 9 | 8 | 3 | **80** |
| `part9-01-lock-free-ring.md` | 18 | 18 | 11 | 11 | 9 | 9 | 3 | **79** |
| `part9-02-wait-free.md` | 17 | 14 | 8 | 8 | 9 | 8 | 3 | **67** |
| `part9-03-rcu-basics.md` | 17 | 17 | 10 | 11 | 9 | 9 | 4 | **77** |
| `part9-04-hazard-pointer.md` | 18 | 17 | 10 | 11 | 9 | 9 | 4 | **78** |
| `part9-05-cas-patterns.md` | 17 | 17 | 10 | 11 | 9 | 9 | 4 | **77** |
| `part9-06-atomic-cost.md` | 18 | 17 | 10 | 11 | 9 | 9 | 4 | **78** |
| `part9-07-spinlock-vs-mutex.md` | 17 | 16 | 10 | 11 | 9 | 9 | 4 | **76** |
| `part9-08-aba-problem.md` | 17 | 17 | 9 | 11 | 9 | 9 | 4 | **76** |
| `part9-09-false-sharing.md` | 18 | 17 | 10 | 11 | 9 | 9 | 4 | **78** |

### 공통 근거와 보강 우선순위

- 근거 위치: 각 글의 `핵심 개념`, `코드 / 실제 사용 예`, `측정 / 성능 비교`, `자주 보는 함정`, `정리` 섹션.
- 공통 강점: lock-free/wait-free/RCU/hazard/CAS를 서로 다른 progress와 reclamation 문제로 구분하려고 시도한다.
- 주요 감점: 실제 interleaving 검증, formal proof, compiler/ISA 조건, contention/WCET 측정 결과가 없다.
- 우선 보강: `part9-02-wait-free.md`의 요약 문구를 본문 caveat와 일치시키고, 모든 wait-free 주장을 bounded step 조건과 함께 확정한다.
- 다음 확인: C/C++ atomic 표준, ARM architecture manual, Linux RCU/hazard 구현 문서, target별 litmus test·benchmark 결과.

원문 수정·비공개·삭제·URL 변경은 하지 않았다.

## v1.2 재평가 (2026-10-11)

루브릭 v1.2와 `docs/adsense-audit/anchors.md`의 앵커 네 편을 기준으로 10편을 원문 전체를 읽고 다시 채점했다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. factcheck는 git 이력으로 고정했다. 10편 모두 출처 없는 `Qualify …` 커밋만 거쳐 `미검증`이고, 1차 자료를 가져와 대조하지 않았다. `오류 확인`은 같은 글 안의 두 위치가 서로 성립할 수 없는 경우에만 줬다. 기억에 기댄 의심은 `uncertainties`에 적었다.

공통 필드: 10편 모두 `score_status: 잠정`이다. P0는 확인되지 않았다. 확인 범위는 원문 본문, 내부 링크 대상의 존재 여부와 라벨 일치, 다음 편 안내와 실제 seriesOrder+1 대조까지다. 렌더링과 광고 배치는 보지 않았다. 내부 링크 대상 파일은 모두 존재하고 draft가 아니다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part8-12-wcet-analysis.md` | 12 | 13 | 7 | 8 | 6 | 6 | 1 | 53 | 오류 확인 | 우선 조치 | 중간 | part7-05-kernel-build, part1-04-uart-hardware |
| `part9-01-lock-free-ring.md` | 13 | 12 | 6 | 9 | 7 | 4 | 1 | 52 | 미검증 | 병합 검토 | 중간 | part6-09-isr-api, part7-05-kernel-build |
| `part9-02-wait-free.md` | 11 | 9 | 4 | 9 | 5 | 3 | 1 | 42 | 오류 확인 | 우선 조치 | 높음 | part6-09-isr-api |
| `part9-03-rcu-basics.md` | 12 | 13 | 6 | 11 | 6 | 6 | 1 | 55 | 오류 확인 | 우선 조치 | 중간 | part7-05-kernel-build |
| `part9-04-hazard-pointer.md` | 14 | 14 | 6 | 12 | 6 | 6 | 1 | 59 | 미검증 | 병합 검토 | 낮음 | part7-05-kernel-build, part12-10-on-device-llm |
| `part9-05-cas-patterns.md` | 12 | 13 | 6 | 9 | 6 | 6 | 1 | 53 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build, part6-09-isr-api |
| `part9-06-atomic-cost.md` | 12 | 11 | 5 | 10 | 4 | 6 | 1 | 49 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build |
| `part9-07-spinlock-vs-mutex.md` | 13 | 13 | 6 | 8 | 7 | 6 | 1 | 54 | 오류 확인 | 우선 조치 | 높음 | part7-05-kernel-build, part1-04-uart-hardware |
| `part9-08-aba-problem.md` | 14 | 14 | 6 | 9 | 6 | 6 | 1 | 56 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build |
| `part9-09-false-sharing.md` | 14 | 15 | 8 | 6 | 6 | 6 | 1 | 56 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build, part12-10-on-device-llm |

판정 분포: `우선 조치` 4편(점수 구간과 무관하게 factcheck `오류 확인`), `병합 검토` 6편. 80점 이상 글은 없다. v1.1 대비 평균은 76.6점에서 52.9점으로 내려갔다. 주 원인은 측정 표 공란(C), 템플릿 요소를 뺀 F, 본문 출처 0(G), 같은 예제의 시리즈 내 반복(D)이다.

### part8-12-wcet-analysis.md

`factcheck: 오류 확인` — 185행 표는 같은 PID loop의 "worst input, cold cache"를 13,800 cycles로 측정했다고 적는데, 194행은 aiT가 "증명된 상한"으로 11,400 cycles를 냈다고 하고 197행은 정적 분석이 "항상 더 보수적"이라고 한다. 관측된 실행 시간보다 낮은 값은 상한이 될 수 없으므로 두 위치는 함께 성립하지 않는다. 판정은 총점과 무관하게 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | hot/cold·nominal/worst 조합 측정 표(180~187행)와 escape 문자 worst-case 입력 예(87~99행)는 이 글만의 구성이다. 그러나 68·123·142·163·174행은 "확인해야", "다릅니다", "검토합니다"로 구체 기준 대신 완곡 표현을 둬 일반론으로 본다. part1-04 앵커(10)보다 예제가 구체적이라 2점 높였다. |
| B | 13 | ACET/WCET 정의 → 측정 → 정적 도구 → cache 대책 → 함정 흐름은 완성됐다. 제목의 "Hybrid"는 30~33행이 측정·정적 두 갈래만 나열하고 본문에 한 번도 나오지 않는다. |
| C | 7 | DWT 측정 코드(53~66행)는 CYCCNT 활성화(DEMCR·DWT_CTRL)가 빠져 그대로는 0만 읽힐 수 있다. 측정 표는 Cortex-M4 72 MHz를 적었지만 178행이 "측정 결과 예시"라 실제 측정인지 알 수 없고 명령·도구 버전이 없다. part7-05(8)보다 재현 절차가 약하다. |
| D | 8 | PE 1-05 `realtime`과 PRTOS 1-10 `realtime-analysis`가 둘 다 "WCET — 측정 4 방법(Static·Measurement·Hybrid·pWCET)" 절을 갖고 있어 같은 질문을 세 글이 나눠 답한다. 이 글의 고유 부분은 cache lock·disable 절(156~174행) 정도다. |
| E | 6 | 제목·description·본문이 WCET 분석을 향하지만 제목에 나열한 Hybrid를 다루지 않아 부분 미이행으로 6~8 구간 하단을 줬다. |
| F | 6 | 249행 "다음 편부터 Part 9"는 seriesOrder 101(`part9-01`)과 맞고, 253~257행 관련 링크 다섯 개도 라벨과 대상이 일치한다. 이 글 고유의 전제 지식 안내나 단계 구분은 없어 6점이다. |
| G | 1 | 135~140행 도구 표에 출처·버전이 없고, 본문 어디에도 1차 자료 링크가 없다. |

uncertainties:
- 140행 "TimeWeaver — Microsoft Research", 138행 "Bound-T 오픈 source"의 출처를 확인하지 않았다.
- 189행 "평균 75 µs"는 182행 표에서 nominal·hot cache 값이다. 평균(ACET)을 잰 행은 표에 없다.
- 54행 `#include "DWT.h"`는 CMSIS 표준 헤더 이름이 아니다.
- 30행만 `~다` 체이고 나머지는 `~합니다` 체다(톤 혼용, 점수 외).

### part9-01-lock-free-ring.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | DMA NDTR로 head를 계산하는 polling 구성(260~281행)과 byte마다 semaphore를 주지 않고 flag로 묶는 알림(166~196행)은 이 글만의 예제다. 61·119·164·228·258·281행은 비용·처리율을 모두 "측정합니다", "확인해야 하며"로 넘겨 일반론이다. |
| B | 12 | SPSC 기본 → memory order → SMP → 정렬 → DMA → 함정까지 이어진다. 83행 설명("buf[h] write가 consumer의 head read 이후에 가시화")은 release/acquire 관계를 거꾸로 적어 핵심 절이 흔들리고, 94행(volatile만으로 ordering 보장 안 함)과 337행("Cortex-M single core에서는 volatile만으로 충분")이 정리에서 어긋난다. |
| C | 6 | 코드는 많지만 측정 절이 아예 없다. 140행 "byte loop보다 빠릅니다", 295행 "약간 느리지만"은 수치·환경이 없다. 71·73행은 `volatile uint16_t`(29~30행)에 `atomic_load_explicit`를 써서 그대로는 컴파일 조건이 맞지 않는다. |
| D | 9 | Vyukov MPMC 절(198~228행)은 9-10 `mpmc-queue`의 본론을 앞당겨 쓰고, SPSC·false sharing 절은 ECPP 4-04 `lock-free-container`의 "SPSC Ring Buffer", "False Sharing — alignas(64)의 의의" 절과 겹친다. 6-09 `isr-api`의 SPSC ring과도 반복된다. |
| E | 7 | 제목의 SPSC·Power-of-2·Memory Order를 모두 다룬다. Memory Order 절(65~83행)이 짧고 설명이 뒤집혀 9점 이상은 아니다. |
| F | 4 | 342행 "다음 편은 Priority Inversion"인데 seriesOrder 102는 `part9-02-wait-free`다. 347행 라벨 "2-03"은 `part6-10-priority-inversion`으로 가 번호가 틀렸고, 346행 "2-01: ISR-Safe API"는 링크가 없다. 틀린 다음 편 안내라 5점 이하다. |
| G | 1 | DPDK·FreeRTOS·HAL 버전이나 공식 문서 링크가 없다. |

uncertainties:
- 212~219행 Vyukov enqueue의 `seq < pos` 부호 없는 비교가 원 알고리즘의 부호 있는 차이 비교와 같은지 확인하지 않았다.
- 264행 `HAL_UART_Receive_DMA`가 circular 모드 설정 없이 269행 NDTR 기반 head 계산과 맞는지 미확인.
- 295행 FreeRTOS stream buffer가 "내부적으로 locking을 함께 쓴다"는 서술 미확인.

병합 대상: `src/content/blog/embedded/embedded-cpp/part4-04-lock-free-container.md`(SPSC Ring Buffer·False Sharing 절). 이 글의 DMA NDTR·알림 합치기 예제만 남기고 SPSC 기본 구현은 그쪽으로 모으는 방향이다. 독립 검색 의도("lock-free ring buffer")가 남아 있으므로 실제 병합 전에 시리즈 구조 재검토를 먼저 한다.

### part9-02-wait-free.md

`factcheck: 오류 확인` — 75행은 seqlock reader가 "일반적으로 wait-free가 아니라 lock-free/obstruction-free 성질"이라고 하는데, 283행 정리는 "Atomic flag, sequence number, latest-value는 모두 wait-free 패턴"이라고 한다. 같은 방식으로 138행은 triple buffer의 race 여부가 "상태 전이와 동시성 모델에 달려 있다"고 하고 285행은 "Triple buffer에서는 race가 없습니다"라고 단정한다. 판정은 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | progress property, seqlock, double/triple buffer, LDADD는 동시성 입문 자료의 표준 목록이다. 43·100·104·138·160·170·230행이 모두 "보장하지 않습니다", "검증해야 합니다"로 끝나 구체 기준이 없다. part6-09 앵커(10)와 같은 패턴 목록형이다. |
| B | 9 | 각 패턴이 코드 한 조각과 "보장하지 않는다"는 문장으로 끝나 결론이 없다. Kogan-Petrank 절(140~148행)은 글머리표 세 줄이다. 본문과 정리가 서로 반대라 독자가 어느 쪽을 믿어야 할지 알 수 없다. |
| C | 4 | 실행 환경·예상 결과·측정이 없다. 278행은 "retry 횟수와 timing을 측정합니다"라고만 하고 절차가 없다. |
| D | 9 | RCU 절(174~192행)은 9-03, CAS retry 함정(245~254행)은 9-05, 32-bit 단일 접근(150~160행)은 6-09 `isr-api` 73행과 같은 내용이다. |
| E | 5 | 제목은 wait-free signaling 패턴을 약속하지만 본문이 그 패턴 대부분을 wait-free가 아니라고 정정한다. 독자가 얻는 결과가 불명확해 3~5 구간이다. |
| F | 3 | 290행 "다음 편은 Timer Wheel"인데 seriesOrder 103은 `part9-03-rcu-basics`다. 294행 라벨 "2-04"는 `part2-10-memory-barrier`로 가 번호가 틀렸고, 295행 "2-06: Timer Wheel"은 링크가 없다. |
| G | 1 | Kogan-Petrank 논문, ARMv8.1 LSE 문서 등 본문이 이름을 든 자료의 링크가 없다. |

uncertainties:
- 162행 절 제목 "SwiftLM"이 무엇을 가리키는지 본문에 설명이 없다.
- 125~130행 triple buffer reader가 `active`와 `next`를 교환하는 방식이 133~136행 상태 설명과 맞는지 미확인.
- 241행 "진행 보장이 곧 deadline 보장"은 230행(HW spinlock은 대기 상한을 별도로 분석)과 결이 다르다.

### part9-03-rcu-basics.md

`factcheck: 오류 확인` — 44행은 reader 경로 비용이 "0이라고 보장하지 않습니다", 78행은 "lock과 atomic이 없더라도 비용이 0은 아니므로"라고 하는데, 262행 정리는 "RCU는 reader 비용 0"이라고 쓴다. 판정은 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | API 표(24~31행), kernel·URCU·call_rcu·rculist 예제는 커널 문서의 기본 구성과 같다. 189행은 per-CPU counter를 "RCU와 같은 정신"이라고 묶어 개념을 흐린다. 20·78·199행은 완곡 표현이다. |
| B | 13 | grace period → kernel 예제 → URCU → call_rcu → list → 함정 → SRCU까지 별도 검색 없이 따라갈 수 있다. description이 약속한 "임베디드 적용"은 110행 한 문장("임베디드 Linux daemon에 적합합니다")뿐이다. |
| C | 6 | 커널 API 코드가 실제 이름으로 쓰였지만 빌드·실행 환경이 없다. 측정 표(193~207행)는 RCU 행과 writer 표 전체가 "측정 필요"라 내용이 없는 표로 보고, spinlock 100 ns·rwlock 150 ns(195~196행)는 출처·환경이 없다. part7-05 앵커(8)보다 명령·산출물이 적다. |
| D | 11 | 9-02 174~192행과 9-08 167~181행이 같은 RCU 예제를 반복하고, PE 4-07과 개념 설명이 겹친다. 그래도 이 글이 RCU의 주 글이라 역할은 구별된다. |
| E | 6 | 제목의 "Quiescent State"는 14·28행에 단어로만 나오고 무엇이 quiescent state인지 설명하는 절이 없다. 부분 미이행이다. |
| F | 6 | 270행 다음 편(Hazard Pointer)이 seriesOrder 104와 맞고 274~277행 링크 네 개도 라벨과 대상이 일치한다. 그 외는 시리즈 공통 템플릿이다. |
| G | 1 | 커널 버전, liburcu 버전, `Documentation/RCU` 같은 1차 출처가 없다. |

uncertainties:
- 26행 "`rcu_read_lock`은 사실상 `preempt_disable` 또는 그보다 가벼움"은 flavor·CONFIG에 따라 다를 수 있으나 확인하지 않았다.
- 216행 "unlock 밖 — UB"의 근거 문서 미확인.

### part9-04-hazard-pointer.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | publish 후 재확인이 왜 필요한지(85행), 현재+다음 노드를 보호하는 다중 슬롯(135~151행), HP로 감싼 stack pop(153~185행)이 문제 해결 관점으로 이어진다. 20·22·57·201·212행은 메모리 상한·표준화·성능을 모두 완곡 표현으로 넘겨 20점대는 아니다. |
| B | 14 | reader·writer·scan 흐름, RCU 비교, 함정까지 기본 흐름이 완성됐다. 22행이 "특정 표준 버전에 들어왔다고 전제하지 말라"고 해 놓고 187행 절 제목은 "C++26 표준"이라 결론이 엇갈린다. |
| C | 6 | 코드가 컴파일 단위로 닫혀 있지 않다(117행 `all_hps()` 미정의). 측정 표(205~210행)는 reader latency·throughput 수치가 있지만 CPU·컴파일러·측정 방법이 없고 바로 212행이 "측정해야 합니다"로 수치를 무력화한다. |
| D | 12 | PE 4-07 `lock-free`에 "해결 2 — Hazard Pointer" 절이 있고 9-08 145~165행이 같은 acquire/re-validate 코드를 반복한다. 이 글이 HP 주 글이라 역할은 구별된다. |
| E | 6 | description은 "ABA 회피"를 약속하지만 269행은 "hazard pointer만으로 ABA 해결되지 않음"이라고 한다. 제목 범위(memory reclamation)는 지킨다. |
| F | 6 | 281행 다음 편(CAS 패턴)이 seriesOrder 105와 맞고 285~289행 링크 다섯 개가 라벨과 일치한다. 템플릿 외 고유 구조는 없다. |
| G | 1 | C++ 제안 문서 번호, folly 등 구현 출처가 없다. |

uncertainties:
- 20행(HP 메모리 사용량은 "자동으로 고정 상한이 되지는 않습니다")과 220·279행(메모리 상한이 필요하면 HP가 더 안전, 우선 고려)은 결이 다르다. 논리적으로 정면 모순은 아니라 `오류 확인`에 넣지 않았다.
- 261행 "임계(보통 thread 수 × 2)"와 111행 코드의 고정 임계 64가 다르다. 출처 미확인.
- 59점으로 `보강` 경계 바로 아래라 confidence를 `낮음`으로 뒀다.

병합 대상: `src/content/blog/embedded/performance-engineering/part4-07-lock-free.md`("해결 2 — Hazard Pointer" 절). 다만 HP는 독립 검색 의도가 있어 루브릭 5절에 따라 병합보다 차별화 보강(ABA 관계 정리, 출처·측정 조건 기입)을 먼저 검토한다.

### part9-05-cas-patterns.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | saturating counter(45~61행)는 fetch_add로 안 되는 경우를 짚은 고유 예제다. 나머지 stack push, try-lock, tagged pointer, Vyukov enqueue는 인접 글과 입문 자료의 표준 예제다. 18·31·61·214행은 완곡 표현이다. |
| B | 13 | CAS 의미 → strong/weak → backoff → ABA → 함정 → 정리가 이어진다. 31·214행("항상 weak가 더 빠르다고 단정하지 않음")과 108·114·211행("ARM에서 빠름", "weak가 더 빠름")이 같은 글 안에서 엇갈린다. |
| C | 6 | 측정 표(184~191행)는 Cortex-A72 행이 전부 "측정 필요"라 내용이 없다. 196~200행 backoff 효과(8.2 s→2.3 s)와 230행 "1/10 이하"는 환경·코드·명령이 없다. 38행 text 블록은 `cur`를 do 블록 안에서 선언해 while 조건에서 쓸 수 없다. |
| D | 9 | tagged pointer push(133~151행)는 9-08 63~86행, Vyukov enqueue(155~180행)는 9-01·9-10, try-lock(81~97행)은 9-07 85~104행과 같은 예제다. ECPP 4-03 `lock-free-basics`에도 CAS·ABA 절이 있다. |
| E | 6 | 제목의 "Linked List 적용"은 244행 함정 코드 한 줄뿐이다. 부분 미이행이다. |
| F | 6 | 259행 다음 편(Atomic 비용)이 seriesOrder 106과 맞고 263~267행 링크가 라벨과 일치한다. |
| G | 1 | C++ 표준 조항, ARM 문서 등 출처가 없다. |

uncertainties:
- 163~177행 `try_enqueue`는 `diff > 0`일 때 재시도 없이 false를 반환한다. 180행이 "Vyukov MPMC queue의 핵심 패턴"이라고 하지만 9-10 76~78행 구현과 동작이 다르다.
- 254행 "ABA는 tagged pointer나 hazard pointer가 필요"는 9-04 269행("hazard pointer만으로 ABA 해결되지 않음")과 시리즈 안에서 반대다.

병합 대상: `src/content/blog/embedded/embedded-cpp/part4-03-lock-free-basics.md`(CAS·ABA 절). saturating counter와 strong/weak 선택 기준만 남기면 독립 가치가 약하다.

### part9-06-atomic-cost.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | memory_order별 ARMv8 명령 매핑(35~49행)과 LL/SC·LSE 어셈블리 비교(83~95행), `-moutline-atomics`(101~110행)는 구체적이다. 그러나 "비용 분석"의 결론(185·195·204행)이 근거 없이 단정된다. |
| B | 11 | 개념·코드·함정 흐름은 있으나 글의 핵심 질문인 "얼마나 비싼가"에 답이 없다. 18행은 lock보다 "비슷하거나 더 느릴 수도"라고만 한다. |
| C | 5 | 측정 표 두 개(175~193행)가 모든 칸 "측정 필요"라 내용이 없는 표다. 199~201행 store latency(4·60+·8 cycle)만 수치가 있는데 CPU·측정 방법이 없다. 컴파일 명령(103·106행)은 재현 가능해 part7-05(8)보다 3점 낮게 뒀다. |
| D | 10 | PE 4-08 `memory-ordering`의 "ARM 명령", "측정 — 실측 비용" 절과 주제가 같고, per-CPU counter(129~149행)는 9-03·9-09와 반복, hot spin·yield는 9-05와 반복이다. |
| E | 4 | description이 "atomic 연산의 실측 비용을 정리"한다고 약속하지만 실측 값이 없다. 제목의 "분석"을 이행하지 않아 3~5 구간이다. |
| F | 6 | 260행 다음 편(Spinlock vs Mutex)이 seriesOrder 107과 맞고 264~268행 링크가 라벨과 일치한다. |
| G | 1 | ARMv8 ARM, GCC 문서 등 출처 없음. |

uncertainties:
- 44행 seq_cst store를 "STLR + DMB ISH"로 매핑한 부분은 컴파일러 매핑 표와 대조하지 않았다.
- 167행 "32-bit arch에서 `atomic<int64_t>`는 false"는 ARMv7-A의 LDREXD/STREXD 존재 여부에 따라 다를 수 있으나 미확인.
- 102행 "Cortex-A55, A76 이상" LSE 지원 범위 미확인.

병합 대상: `src/content/blog/embedded/performance-engineering/part4-08-memory-ordering.md`("ARM 명령", "측정 — 실측 비용" 절). 측정 값을 채우지 못하면 이 글은 그 글의 하위 절로 들어가는 편이 독자에게 낫다.

### part9-07-spinlock-vs-mutex.md

`factcheck: 오류 확인` — 206행 표는 hold 100 µs에서 spinlock 80 µs/op, mutex 105 µs/op로 spinlock이 더 빠르다고 적는데, 바로 아래 209행은 "hold time이 길어지면 mutex가 더 효율적"이라고 결론짓는다. 또 4 thread가 lock을 잡고 100 µs씩 머무는데 op당 80 µs는 hold time보다 짧다. 46행은 qspinlock이 "짧은 contention은 ticket"이라고 하고 163행 표는 "짧은 contention: MCS 1단계"라고 해 서로 다르다. 판정은 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | sleep 가능 여부 → hold time → contention 규모 순의 decision tree(170~182행)와 ticket·MCS 구현은 선택 기준을 주려는 고유 구성이다. 14·35~37·168·263행은 임계값을 "측정합니다", "검토"로 넘긴다. |
| B | 13 | kernel·userspace·ticket·MCS·qspinlock·함정까지 흐름이 완성됐다. 182행 "코어 8개 이상·동시 thread 4개 초과면 MCS"는 근거 없는 기준이고, 측정 표와 결론이 어긋나 결론이 흔들린다. |
| C | 6 | Linux API 예제는 실제 이름이다. 측정 표(186~198행)는 전부 "측정 필요"라 내용이 없고 200행 "MCS가 압도적"은 근거가 없다. 204~206행만 수치가 있는데 위 모순이 있다. |
| D | 8 | PE 4-04 `spinlock`이 "Spin vs Sleep — 손익 분기", "Ticket Lock", "MCS Lock", "Linux Kernel — spin_lock" 절을 같은 순서로 갖고 있고 PE 4-05 `mutex`, 6-05 `mutex-usage`와도 겹친다. 같은 질문을 여러 글이 나눠 답하는 5~9 구간이다. |
| E | 7 | 제목의 "결정 가이드"는 decision tree로 이행한다. 제목의 "Context Switch" 비용은 수치가 없다. |
| F | 6 | 271행 다음 편(ABA 문제 회피)이 seriesOrder 108과 맞고 275~280행 링크 여섯 개가 라벨과 일치한다. |
| G | 1 | 커널 버전, `Documentation/locking` 같은 출처 없음. |

uncertainties:
- 39행 "single-CPU: spinlock 의미 없음"과 216·219행 UP 설명은 일치하지만 CONFIG_PREEMPT 여부에 따른 차이는 미확인.
- 139~155행 MCS 구현의 memory order 선택이 올바른지 검증하지 않았다.

### part9-08-aba-problem.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 128-bit 구조체 CAS, 상위 16-bit packed tag, "별도 version counter는 깨진다"는 반례(123~143행), MTE/PAC 환경에서 packed tag가 위험하다는 지적(231~237행)은 선택 기준을 주는 고유 내용이다. 20·121·185행은 완곡 표현이다. |
| B | 14 | 시나리오 → 해결책 네 가지 → 비교 → 함정 → 정리가 완성됐다. 183행 절 제목 "실제 사례 — IBM의 lock-free queue"의 본문(185~187행)은 사례 없이 일반론이다. |
| C | 6 | 코드는 구체적이지만 실행 환경이 없다. 191~199행 "8 thread stack 1M op ABA 발생률" 표는 측정처럼 보이지만 CPU·allocator·코드가 없고, 205행은 "target에서 측정"이다. |
| D | 9 | hazard pointer 절(145~165행)은 9-04, RCU 절(167~181행)은 9-03, tagged pointer는 9-05 133~151행, naive stack은 9-04·9-05와 같은 예제다. PE 4-07에도 "ABA 문제·해결 1~3" 절이 있다. |
| E | 6 | description의 "실제 사례"는 183~187행에서 이행되지 않았다. 제목 범위는 지킨다. |
| F | 6 | 267행 다음 편(False sharing)이 seriesOrder 109와 맞고 165행 본문 링크와 271~275행 링크가 라벨과 일치한다. |
| G | 1 | Michael & Scott 논문, CMPXCHG16B·LDAXP 문서 링크가 없다. |

uncertainties:
- 31행 "해결책 세 가지입니다" 다음에 33~36행이 네 가지를 나열하고 260행은 "네 가지"라고 한다. 단순 개수 오기로 보고 `오류 확인`에는 넣지 않았다(시리즈 공통 문제 참고).
- 165·263행 "hazard pointer는 ABA를 근본 해결"은 9-04 269행과 반대다.
- 196행 "16-bit tag 양산 환경에서 거의 0"의 근거 미확인.

병합 대상: `src/content/blog/embedded/performance-engineering/part4-07-lock-free.md`("ABA 문제", "해결 1~3" 절). MTE/PAC·version counter 반례는 이 글에만 있으므로 병합 시 보존한다.

### part9-09-false-sharing.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | Cortex-A72·Xeon 수치 비교(184~200행), `hardware_destructive_interference_size`의 한계(87행), stack 변수 정렬 함정(234~242행)은 구체적이다. 202행 "Intel이 ARM보다 더 큰 격차 경향"은 표 한 쌍으로 일반화했다. |
| B | 15 | 원리 → 감지(perf c2c) → 해결 다섯 가지 → 측정 → 함정까지 별도 검색 없이 따라갈 수 있다. 제목의 SoA는 다루지 않는다. |
| C | 8 | 측정 표는 CPU·thread 수·반복 수를 적었고 throughput 계산(2억 op / 7.8 s ≈ 26 M ops/s)과 배율(8.7배, 31배, 13배, 74배)이 서로 맞는다. 다만 컴파일러·코드·명령이 없어 재현할 수 없다. `perf c2c` 명령(171~178행)은 재현 가능하다. |
| D | 6 | 같은 시리즈 8-03 `cache-alignment`가 "Element 사이 padding으로 false sharing 차단", "SPSC ring buffer head/tail 분리", "Per-CPU counter", "Linux 커널 매크로" 절을 같은 순서로 갖고 있고 `____cacheline_aligned` 예제도 같다. PE 4-02 `false-sharing`도 padding·per-CPU·perf c2c를 다룬다. |
| E | 6 | 제목이 "SoA 적용"을 내걸지만 본문에 SoA가 없다(SoA 절은 8-03에 있다). 부분 미이행이다. |
| F | 6 | 262행 다음 편(MPMC 큐)이 seriesOrder 110과 맞고 266~271행 링크 여섯 개가 라벨과 일치한다. |
| G | 1 | 측정 환경 외에 출처·버전이 없다. |

uncertainties:
- 134행 "thread_local이면 자동으로 다른 page에 위치"는 TLS 배치 방식과 맞는지 미확인.
- 31행 Apple M1/M2 128 B, 238행 "stack은 16/32 B만 보장" 미확인.
- 184~200행 수치가 실제 측정인지 예시인지 본문이 밝히지 않는다.

병합 대상: `src/content/blog/embedded/modern-recipes/part8-03-cache-alignment.md`. 측정 표와 perf c2c 절을 그 글로 옮기면 제목의 SoA까지 한 글에서 해결된다.

### 시리즈 공통 문제

- 측정 표를 `측정 필요`로 채우고, 바로 아래 문장은 결론을 단정한다. 루브릭 3-1절에 따라 C에서 내용 없는 표로 봤다: `part9-03`(193~209행), `part9-05`(184~193행), `part9-06`(175~195행), `part9-07`(186~200행).
- 출처·환경 없이 측정처럼 보이는 수치 표가 있다. 실제 측정인지 예시인지 밝히지 않는다: `part8-12`(180~195행), `part9-04`(205~210행), `part9-05`(196~200행), `part9-08`(191~199행), `part9-09`(184~200행).
- 본문은 `Qualify …` 커밋으로 완곡하게 고쳤는데 한 줄 요약·정리 절은 예전 단정을 그대로 둬 같은 글 안에서 모순이 생겼다: `part9-01`(94·337행), `part9-02`(75·283행), `part9-03`(78·262행), `part9-04`(20·279행), `part9-05`(31·211행). 이 가운데 정면 모순인 `part9-02`·`part9-03`은 `오류 확인`으로 처리했다.
- 같은 예제를 여러 글이 반복한다. Vyukov enqueue: `part9-01`(198~228행)·`part9-05`(155~180행)·루프 12의 `part9-10`. per-CPU counter: `part9-03`(172~189행)·`part9-06`(129~149행)·`part9-09`(89~112행). RCU reader/writer: `part9-02`(174~192행)·`part9-03`·`part9-08`(167~181행). tagged pointer stack: `part9-05`(133~151행)·`part9-08`(63~86행).
- hazard pointer가 ABA를 해결하는지에 대해 글마다 답이 다르다: `part9-04`(269행 "해결되지 않음") 대 `part9-05`(254행)·`part9-08`(165·263행 "근본 해결").
- 본문 안에 1차 출처·버전 표기가 없다(G=1): 10편 모두.
