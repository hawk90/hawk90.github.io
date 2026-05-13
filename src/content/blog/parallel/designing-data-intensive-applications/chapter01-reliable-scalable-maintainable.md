---
title: "Ch 1: 신뢰할 수 있고, 확장 가능하고, 유지보수 가능한 애플리케이션"
date: 2026-07-01T01:00:00
description: "데이터 집약 애플리케이션의 세 가지 품질 — Reliability, Scalability, Maintainability. 각 단어가 무엇을 의미하는가."
tags: [DDIA, Reliability, Scalability, Maintainability]
series: "Designing Data-Intensive Applications"
seriesOrder: 1
---

## 이 챕터의 메시지

DDIA의 출발점. 책 전체에서 던지는 질문은 단순하다.

> **모던 데이터 시스템은 무엇을 만족시켜야 하는가?**

Kleppmann의 답 — 세 가지 품질.

1. **Reliability** — 신뢰성
2. **Scalability** — 확장성
3. **Maintainability** — 유지보수성

이 세 단어가 책 전체의 frame이다. 각 후속 챕터가 어떻게 이 셋을 달성하는지에 답한다.

## CPU-bound vs Data-Intensive

먼저 이 책이 다루는 영역.

**CPU-Intensive**:
- 영상 인코딩, 수치 계산, 시뮬레이션
- 병목: CPU 속도
- 해법: 더 빠른 CPU, 더 좋은 알고리즘

**Data-Intensive**:
- 웹 앱, 비즈니스 시스템, 분석
- 병목: **데이터의 양, 복잡도, 변화 속도**
- 해법: 데이터를 다루는 시스템 디자인

DDIA는 **Data-Intensive** 시스템을 다룬다. 대부분의 산업 시스템이 여기에 속한다.

## 빌딩 블록

데이터 집약 시스템은 다음 도구들의 조합.

- **Database** — 데이터 저장 / 검색
- **Cache** — 빠른 응답
- **Search index** — 키워드 검색 / 필터
- **Stream processing** — 비동기 이벤트 처리
- **Batch processing** — 주기적 대량 데이터 처리

대부분의 모던 시스템이 이 도구들을 조합해 만들어진다. 모두를 한 도구로 풀 수 없다 — 각자 적합한 영역이 다르다.

## 1. Reliability — 신뢰성

> 시스템이 어려운 상황(fault)에서도 **정확히 작동**해야 한다.

**Reliability ≠ Availability**.

- Availability: 시스템이 응답하는가
- Reliability: 시스템이 **정확하게** 응답하는가

### Fault vs Failure

**Fault** — 시스템의 한 구성요소가 명세대로 동작 안 함.
**Failure** — 시스템 전체가 사용자에게 서비스를 못 함.

좋은 시스템은 **fault가 failure가 되지 않게** 디자인된다. 결함 허용(fault-tolerant).

### 결함의 종류

**1. Hardware Fault**

디스크 고장, RAM 오류, 네트워크 단절, 정전, ...

- MTTF(Mean Time To Failure) — 디스크 한 개: 10~50년
- 데이터센터 1만 대 디스크 → **하루에 한 대 고장**

해법: RAID, 다중 PSU, 다중 네트워크, 다른 데이터센터 복제.

**2. Software Fault**

버그, 카스케이드 실패, 한 컴포넌트의 메모리 누수, ...

해법: 신중한 디자인, 테스트, 모니터링.

**3. Human Error**

설정 오류, 잘못된 배포, ...

연구에 따르면 시스템 장애의 **가장 큰 원인**.

해법:
- 자동화된 도구
- Sandbox / staging 환경
- 신속한 롤백
- 명확한 모니터링

## 2. Scalability — 확장성

> 부하가 증가할 때 시스템이 **대응할 수 있는** 능력.

"확장 가능"은 단순한 boolean이 아니다. 다음을 정확히 정의해야 한다.

### 부하의 표현 (Load Parameters)

부하를 어떻게 측정하는가가 결정적.

- **웹 서버** — 초당 요청 수 (RPS)
- **데이터베이스** — 초당 읽기/쓰기 비율
- **채팅** — 동시 활성 사용자 수
- **캐시** — hit rate

부하 파라미터는 **시스템마다 다르다**.

### Twitter 사례

책에서 Kleppmann이 든 유명한 예. Twitter의 부하 파라미터는 무엇인가?

- 트윗 발행 — 평균 4.6K rps, 피크 12K rps
- 홈 타임라인 읽기 — 300K rps

**12K vs 300K** — 읽기가 평균 100배 많다. 따라서 디자인은 **읽기 친화적**으로.

**접근 1 — Pull on Read**:
```sql
-- 사용자가 타임라인을 볼 때
SELECT tweets WHERE user_id IN (followers of me)
ORDER BY time
LIMIT 100
```

쓰기는 단순 — 자기 트윗만 저장. 읽기가 비싼 join.

**접근 2 — Push on Write (fan-out)**:
```
사용자 A가 트윗 발행:
- A의 follower 모두의 타임라인 캐시에 추가
- 읽기는 자기 캐시에서만
```

쓰기가 비쌈 (fan-out 비용) — 그러나 읽기는 단순.

**현실** — 두 가지의 혼합. 일반 사용자는 push, 천만 follower의 유명인은 pull. **트레이드오프 인식**.

### 성능의 표현

부하를 정의한 후 — 성능 측정.

**Latency vs Response Time**:

- Latency — 요청이 처리 대기 중인 시간 (서비스를 받기 전)
- Response time — 사용자가 보는 전체 시간

**평균은 거의 의미 없다**. 분포를 본다.

- **median** (p50) — 절반의 사용자가 이보다 빠름
- **p95, p99, p99.9** — 꼬리 latency

Amazon의 유명한 데이터 — p999가 1초 늘면 매출 1% 감소.

### Tail Latency

높은 percentile의 latency가 시스템 디자인을 결정.

```
한 요청이 N개의 백엔드 호출 → 가장 느린 백엔드의 latency가 전체 latency
```

각 백엔드 p99 = 1초 → N=100 백엔드 → 전체 p99 = 거의 항상 1초 이상.

이게 **tail latency amplification**. 마이크로서비스 디자인의 큰 함정.

### Scaling Up vs Scaling Out

- **Scaling Up** (vertical) — 더 큰 머신
- **Scaling Out** (horizontal) — 더 많은 머신

산업 트렌드는 scale out. 그러나 단순한 시스템은 scale up이 더 쉽다 (단일 머신).

## 3. Maintainability — 유지보수성

> 다양한 사람이 시스템에서 **효율적으로 일할 수 있는** 능력.

소프트웨어 비용의 **대부분이 유지보수**다 — 처음 짓는 비용이 아니다.

세 가지 원칙.

### Operability

운영 팀이 시스템을 쉽게 운영할 수 있어야 한다.

- 좋은 모니터링
- 자동화 도구
- 표준 도구의 활용 (외계어 같은 자체 도구 X)
- 문서화
- 단순한 운영 모델

### Simplicity

새 엔지니어가 시스템을 이해하기 쉬워야 한다.

- 우연적 복잡도(accidental complexity) 제거
- 좋은 추상화
- 명확한 이름
- 일관된 패턴

> "Out of the tar pit" — Moseley & Marks가 강조한 simplicity의 중요성.

### Evolvability

시스템이 변화에 대응할 수 있어야 한다.

- 새 요구사항을 쉽게 추가
- 기술 부채 줄이기
- 리팩터링 가능한 디자인

Clean Architecture / Refactoring이 다룬 정확히 그 영역.

## 책의 나머지 구조

이 세 품질을 어떻게 달성하는가가 책의 나머지 11장이다.

- **Part I (Ch 2-4)** — 단일 노드에서의 도구
- **Part II (Ch 5-9)** — 여러 노드, 분산 시스템
- **Part III (Ch 10-12)** — 파생 데이터, batch / stream

각 챕터가 reliability / scalability / maintainability에 어떻게 기여하는지 본다.

## 정리

- **Data-Intensive** 시스템 — 데이터의 양 / 복잡도 / 속도가 병목
- **세 품질** — Reliability / Scalability / Maintainability
- **Reliability** — fault가 failure 안 되게, 사람 에러가 가장 큰 원인
- **Scalability** — 부하 정의 → 성능 정의 → 트레이드오프
- **Tail latency** — p99, p999가 시스템 디자인 결정
- **Maintainability** — Operability / Simplicity / Evolvability

## 다음 장 예고

다음 장은 **Data Models and Query Languages** — 데이터를 어떻게 표현할 것인가. Relational, Document, Graph 모델.

## 관련 항목

- [Clean Architecture Ch 1: 디자인](/blog/programming/design/clean-architecture/chapter01-what-is-design-and-architecture) — 변경 비용 일정성
- [Refactoring Ch 2: 원칙](/blog/programming/design/refactoring/ch02) — Design Stamina Hypothesis
