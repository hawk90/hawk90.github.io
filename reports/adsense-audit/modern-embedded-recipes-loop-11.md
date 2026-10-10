# Modern Embedded Recipes — 루프 11 (seriesOrder 100~109)

> 분석 단계: 루브릭 기반 검사·분류 1차  
> 대상: 공개 글 10편  
> 기준: AdSense 공개 글 평가 루브릭  
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

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

