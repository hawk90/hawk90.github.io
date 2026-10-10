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

