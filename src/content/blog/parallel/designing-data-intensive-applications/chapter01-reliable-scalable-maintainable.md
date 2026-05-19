---
title: "Ch 1: 신뢰할 수 있고, 확장 가능하고, 유지보수 가능한 애플리케이션"
date: 2026-05-12T01:00:00
description: "데이터 집약 애플리케이션의 세 가지 품질 — Reliability, Scalability, Maintainability. 각 단어가 무엇을 의미하는가."
tags: [DDIA, Reliability, Scalability, Maintainability]
series: "Designing Data-Intensive Applications"
seriesOrder: 1
draft: true
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

데이터의 *세 가지 V*가 산업에서 자주 인용된다.

- **Volume** — 데이터의 양 (TB → PB)
- **Velocity** — 변화 속도 (초당 백만 이벤트)
- **Variety** — 형식 다양성 (JSON, Parquet, image, video, ...)

CPU-intensive 문제는 *Moore의 법칙*이 한동안 풀어 줬다. data-intensive 문제는 *Moore가 못 푸는* 문제다 — 디스크·네트워크는 CPU만큼 빠르게 발전하지 않았다. 그래서 *분산 시스템 디자인*이 필요하다.

## 빌딩 블록

데이터 집약 시스템은 다음 도구들의 조합.

- **Database** — 데이터 저장 / 검색
- **Cache** — 빠른 응답
- **Search index** — 키워드 검색 / 필터
- **Stream processing** — 비동기 이벤트 처리
- **Batch processing** — 주기적 대량 데이터 처리

대부분의 모던 시스템이 이 도구들을 조합해 만들어진다. 모두를 한 도구로 풀 수 없다 — 각자 적합한 영역이 다르다.

```text
사용자 → API → Cache(Redis) → Primary DB(Postgres)
                  │
                  ├─ Search Index(Elasticsearch)
                  ├─ Stream(Kafka) → Stream proc(Flink)
                  └─ Warehouse(BigQuery) ← Batch(Airflow)
```

각 도구가 *자기 영역의 일을 잘하도록* 진화했고, 그래서 시스템 디자이너는 *경계와 통합*을 책임진다. 어떤 데이터가 어디로 흐르는지, 일관성은 어떻게 유지되는지, 한 도구의 fault가 다른 도구에 어떻게 영향을 주는지 — *시스템 사고*가 필요하다.

## 1. Reliability — 신뢰성

> 시스템이 어려운 상황(fault)에서도 **정확히 작동**해야 한다.

**Reliability ≠ Availability**.

- Availability — 시스템이 응답하는가
- Reliability — 시스템이 **정확하게** 응답하는가

비유로 옮기면 항공기 안전과 비슷하다. 비행기는 단순히 이륙·착륙을 하는 것만으로 충분하지 않다. **수십만 시간을 안전하게 운항**해야 한다. 엔진 한 개가 멈춰도 다른 엔진으로 안전 착륙해야 하고, 센서가 오작동해도 조종사가 대처할 수 있어야 한다. 데이터 시스템도 같다 — *대부분의 시간 응답*만으로는 부족하다. *오류 상황에서도 정확*해야 한다.

### Fault vs Failure — 정확한 구분

이 책에서 가장 중요한 용어 구분 중 하나다. Kleppmann이 명시적으로 정의한다.

**Fault**
: 시스템의 한 *구성요소*가 명세(spec)대로 동작하지 않는 사건.

**Failure**
: 시스템 *전체*가 사용자에게 약속한 서비스를 제공하지 못하는 사건.

```text
Fault     → 디스크 한 대가 망가짐
Failure   → 사용자가 서비스를 못 씀

Fault     → 한 마이크로서비스가 응답 안 함
Failure   → 결제가 완전히 실패함
```

두 단어를 섞어 쓰면 안 된다. **모든 failure는 fault에서 시작하지만, 모든 fault가 failure가 되지는 않는다**. 좋은 시스템 디자인의 목표는 *fault를 격리해 failure로 번지지 않게* 하는 것이다.

이게 **fault tolerance**(결함 허용)의 정확한 정의다. *결함이 없는* 시스템이 아니라 *결함을 견디는* 시스템이다.

### Chaos Engineering — 의도된 fault 주입

Netflix가 2011년 도입한 **Chaos Monkey**가 이 사고방식의 극단적 사례다. 프로덕션 환경에서 *무작위로 인스턴스를 죽인다*.

```text
Chaos Monkey:    무작위 EC2 인스턴스 종료
Chaos Gorilla:   AZ(Availability Zone) 하나 통째 다운
Chaos Kong:      region 하나 통째 다운
Latency Monkey:  네트워크 지연 주입
Conformity Monkey: 표준 위반 인스턴스 자동 종료
```

가설은 단순하다. *어차피 fault는 발생할 것이다. 그렇다면 우리가 깨어 있을 때 일부러 일으켜서 대응 능력을 검증하자.* Reliability를 *증명*하는 가장 확실한 방법이다.

조직적 효과도 크다. *프로덕션이 무작위로 죽는다는 것을 모두가 안다*면, 모든 팀이 *자기 서비스를 fault-tolerant하게* 만들지 않을 수 없다. 코드 리뷰에서 "*만약 이 호출이 실패하면?*" 이 자동으로 물어진다. 이것이 *Chaos*의 진짜 가치다 — 기술이 아니라 *문화*.

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

연구에 따르면 시스템 장애의 **가장 큰 원인**. ACM Queue 2004년의 한 연구는 인터넷 서비스 장애의 *원인 1순위가 운영자 설정 실수*임을 밝혔다.

해법:
- 자동화된 도구
- Sandbox / staging 환경
- 신속한 롤백
- 명확한 모니터링
- 단위·통합 테스트, 카오스 엔지니어링
- *되돌릴 수 없는 변경*에 추가 확인 단계

### AWS regional failover — 산업의 fault 모델

AWS는 *지역 단위*로 격리된 데이터센터 그룹(region)을 두고, 그 안에 다시 *물리적으로 분리된 가용성 영역*(AZ)을 둔다.

```text
region: us-east-1
  ├─ AZ a (별도 건물, 별도 전원)
  ├─ AZ b (별도 건물, 별도 전원)
  └─ AZ c (별도 건물, 별도 전원)
```

목적은 명확하다. *한 AZ가 fault를 일으켜도 다른 AZ로 트래픽이 흘러*가 failure를 막는다. 더 큰 사고로 region 전체가 다운되면 *다른 region으로 failover*. Multi-region active-active 설계가 가장 강한 reliability 모델이다.

### SLI / SLO / SLA — Google SRE의 frame

Google SRE 책이 표준화한 용어. *얼마나 신뢰할 수 있어야 하는가*를 숫자로 적는다.

**SLI** (Service Level **Indicator**)
: 실제 측정값. 예를 들면 *p99 응답 시간*, *5xx 에러율*, *가용성 percentage*.

**SLO** (Service Level **Objective**)
: 내부 목표. 예를 들면 *p99 < 200ms*, *가용성 > 99.9%*.

**SLA** (Service Level **Agreement**)
: 외부 고객과의 *계약*. SLO보다 *느슨한* 임계값으로 잡는다. 위반 시 환불·페널티가 따른다.

```text
SLI:  실측한 가용성 = 99.95%
SLO:  목표 가용성  >= 99.9%   (내부)
SLA:  약속 가용성  >= 99.0%   (외부, 위반 시 환불)
```

SLA를 SLO보다 *느슨하게* 잡는 이유는 *버퍼*다. 내부 목표를 잠깐 못 맞춰도 *외부 계약을 위반하지는 않는다*. **error budget** — SLO와 100% 사이의 여유 — 안에서 위험한 배포·실험을 허용한다.

```text
SLO = 99.9% 가용성 →  error budget = 0.1% = 한 달 약 43분의 다운타임
이 43분을 어디에 쓸 것인가:
  - 새 기능 배포의 위험
  - 의도된 chaos 테스트
  - 마이그레이션 작업
```

error budget이 *바닥나면 배포 동결*. 이 단순한 규칙이 *개발 속도와 안정성의 trade-off*를 자동화한다. 100% 가용성을 추구하지 *않는다* — 그것은 *비용 대비 효과*가 나쁘다. 99.999%("five nines")을 목표로 하면 한 달에 *26초*만 허용된다. *비용이 폭발*한다.

## 2. Scalability — 확장성

> 부하가 증가할 때 시스템이 **대응할 수 있는** 능력.

"확장 가능"은 단순한 boolean이 아니다. 다음을 정확히 정의해야 한다.

비유로 옮기면 도시 인구 증가 대응과 비슷하다. 인구 10만의 도시에 맞춰 설계된 상수도·도로·전력망은 인구 100만이 되었을 때 *그대로는 작동하지 않는다*. 단순히 *더 많은 수도관*을 까는 것(scale up)으로 풀리는 문제가 있고, *분산된 정수장*을 새로 짓는 것(scale out)으로 풀리는 문제가 있다. **부하의 성격이 무엇이냐**에 따라 대응 방식이 달라진다.

### 부하의 표현 (Load Parameters)

부하를 어떻게 측정하는가가 결정적. *틀린 파라미터*로 측정하면 *틀린 결정*을 한다.

- **웹 서버** — 초당 요청 수 (RPS)
- **데이터베이스** — 초당 읽기/쓰기 비율
- **채팅** — 동시 활성 사용자 수
- **캐시** — hit rate
- **추천 시스템** — 사용자 수 × 추천할 아이템 수
- **그래프 DB** — 노드 차수의 분포 (특히 *최댓값*)

부하 파라미터는 **시스템마다 다르다**. 그리고 한 시스템 안에서도 *시기에 따라* 달라진다. 작은 트래픽에서는 *총 요청 수*가 중요하지만, 규모가 커지면 *fan-out 패턴*이나 *데이터 분포의 skew*가 더 중요해진다.

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

```text
사용자 follower 수 < 임계값 (예: 100만):
  → fan-out on write (타임라인 미리 계산)
사용자 follower 수 ≥ 임계값:
  → fan-out on read (타임라인 조회 시 합성)
```

이 하이브리드 결정의 핵심은 *fault에 대한 인식*과 같다. *극단값(tail)이 시스템 설계를 정의*한다는 점이다. 평균 follower 수에 맞춰 fan-out on write를 하면, *Obama가 트윗하는 순간* 시스템이 마비된다.

이 사례가 강조하는 핵심은 *부하의 표현*이 부하의 양과 무관하다는 점이다. 단순히 *초당 트윗 수*만으로는 Twitter의 부하가 정의되지 않는다. **fan-out 비율** — 한 트윗이 평균 몇 명의 타임라인에 복사되는가 — 이 핵심 부하 파라미터다.

### Throughput vs Response Time — 헷갈리기 쉬운 구분

성능을 말할 때 *두 개의 독립된 축*이 있다. Kleppmann이 강조하는 구분이다.

**Throughput** (처리량)
: 단위 시간당 처리한 *요청 수* 또는 *데이터 양*. 예를 들면 *초당 트윗 1만 개 처리*, *시간당 1TB 처리*.

**Response Time** (응답 시간)
: 한 요청을 보낸 사용자가 *결과를 받기까지 걸리는 시간*. 예를 들면 *p99 < 200ms*.

```text
Throughput:    초당 처리 건수    (batch / offline 시스템의 주 지표)
Response Time: 한 요청의 지연    (사용자 대면 시스템의 주 지표)
```

batch 시스템(Hadoop, Spark)에서는 throughput이 핵심이다. *총 작업 완료 시간*만 중요하고 개별 작업의 지연은 의미가 없다. 사용자 대면 시스템에서는 response time이 핵심이다. *p99이 1초 늘면 매출이 떨어진다*.

두 지표는 **서로 다른 방향으로 최적화**된다. throughput을 올리려면 batching을 키우는데, batching을 키우면 response time이 늘어난다. 둘은 거의 항상 trade-off다.

### Latency vs Response Time

또 하나의 미묘한 구분.

- **Latency** — 요청이 *처리 대기 중*인 시간 (서비스를 받기 *전*)
- **Response Time** — 사용자가 보는 *전체* 시간 (네트워크 + 큐 대기 + 처리 + 응답 전송)

Response time = network delay + queueing delay + service time.

### Percentile — p50 / p95 / p99 / p99.9

**평균은 거의 의미 없다**. 분포를 본다.

- **p50** (median) — 절반의 사용자가 이보다 빠르다.
- **p95** — 5%의 사용자가 이보다 느리다.
- **p99** — 1%의 사용자가 이보다 느리다.
- **p99.9** ("three nines") — 0.1%의 사용자가 이보다 느리다.

```text
구간       의미                                  대표 응답 시간
p50        보통의 사용자 경험                    200ms
p95        조금 느린 사용자                       400ms
p99        가장 느린 1%                          1.2s
p99.9      가장 느린 0.1%                        4.0s
average    분포에 가려진 무의미한 수             280ms
```

높은 percentile은 *VIP 고객*을 가린다. **데이터를 많이 가진 사용자**일수록 응답 시간이 길어진다. Amazon의 경우 *p99.9가 1초 느려지면 매출이 1% 감소*한다는 보고가 있다. 그런 사용자가 *주문을 많이 하는 고객*이기 때문이다.

### Queueing — head-of-line blocking

높은 percentile이 잘 안 떨어지는 이유. 서버의 CPU 코어 수가 한정되면, 느린 요청 하나가 *뒤의 빠른 요청들을 막는다*.

```text
요청 도착:  [빠름] [빠름] [느림] [빠름] [빠름]
처리 순서:  [빠름] [빠름] [느림(대기)......] [빠름(대기)] [빠름(대기)]
```

부하 테스트할 때 *클라이언트가 응답을 받은 다음에 다음 요청을 보내는 closed-loop*이면 이 효과가 가려진다. 실제 사용자는 *서버 응답과 무관하게 요청을 보내는 open-loop*. 부하 테스트는 open-loop으로 해야 진짜 tail latency가 보인다.

### Tail Latency

높은 percentile의 latency가 시스템 디자인을 결정.

```
한 요청이 N개의 백엔드 호출 → 가장 느린 백엔드의 latency가 전체 latency
```

각 백엔드 p99 = 1초 → N=100 백엔드 → 전체 p99 = 거의 항상 1초 이상.

이게 **tail latency amplification**. 마이크로서비스 디자인의 큰 함정.

```text
백엔드 p99 = 100ms
호출 수 = 1   →  p99 ≈ 100ms
호출 수 = 10  →  적어도 한 개가 p99에 걸릴 확률 ≈ 10%
호출 수 = 100 →  적어도 한 개가 p99에 걸릴 확률 ≈ 63%
```

수학적으로 *N개의 독립 호출 중 적어도 하나가 느릴 확률* = $1 - 0.99^N$. N이 100이면 *거의 확실히 한 호출은 p99에 걸린다*. 그래서 마이크로서비스 시스템에서는 *각 서비스의 p99을 매우 낮게* 잡지 않으면 전체 시스템의 p99이 폭발한다.

대응:
- **hedged requests** — 같은 요청을 두 백엔드에 보내고 *먼저 도착한 응답* 채택
- **timeout + retry** — 너무 느린 요청은 포기
- **bulkhead** — 한 백엔드의 지연이 다른 백엔드로 전파되지 않게 격리

### Scaling Up vs Scaling Out

- **Scaling Up** (vertical) — 더 큰 머신
- **Scaling Out** (horizontal) — 더 많은 머신

산업 트렌드는 scale out. 그러나 단순한 시스템은 scale up이 더 쉽다 (단일 머신).

```text
Scaling Up:    8코어 / 64GB  →  64코어 / 1TB
Scaling Out:   8코어 / 64GB  ×  100대
```

scaling up의 매력 — *코드 변경 없음*. scaling out의 매력 — *상한 없음*. 일반적인 전략은 *적절한 지점까지 scale up*하고 *그 이상은 scale out*하는 hybrid.

**Elasticity** — 부하 변화에 *자동으로* 머신을 추가·제거하는 능력. 클라우드 환경의 핵심 가치다. 그러나 *상태 있는 시스템*(데이터베이스)은 elastic하기 어렵다. *재분할*과 *데이터 이동* 비용이 크기 때문이다.

> *Stateless* 시스템(웹 서버, API)은 쉽게 scale out한다 — 새 인스턴스를 LB에 추가만 하면 된다. *Stateful* 시스템(DB)은 어렵다 — 데이터를 옮기거나 분할해야 한다.

확장의 한계는 **상태**에 있다. 이것이 책 후반부의 핵심 주제 — replication, partitioning, consistency.

## 3. Maintainability — 유지보수성

> 다양한 사람이 시스템에서 **효율적으로 일할 수 있는** 능력.

소프트웨어 비용의 **대부분이 유지보수**다 — 처음 짓는 비용이 아니다.

비유로 옮기면 집 리모델링과 비슷하다. 신축은 청사진이 명확하고 한 사람이 일관되게 짓는다. 리모델링은 *이미 사람이 살고 있는 집*을 *주말마다 조금씩* 고친다. 벽 뒤의 배선이 어떻게 깔렸는지 알 수 없고, 한 벽을 허물면 *다른 벽이 어떻게 반응할지* 모른다. 좋은 집은 *나중에 고치기 쉽게* 지어진 집이다. 좋은 시스템도 같다.

세 가지 원칙.

### Operability — 운영 친화

운영 팀이 시스템을 쉽게 운영할 수 있어야 한다.

- 좋은 모니터링 — 메트릭, 로그, 트레이싱
- 자동화 도구 — 배포, rollback, scaling
- 표준 도구의 활용 (외계어 같은 자체 도구 X)
- 문서화 — runbook, post-mortem
- 단순한 운영 모델 — *덜 놀라운* 동작
- *시스템이 사람에게 적응*해야지, 사람이 시스템에 적응할 수는 없다

```text
좋은 operability:
  새벽 3시에 호출된 신입 운영자도 5분 안에 상태를 파악할 수 있다.
나쁜 operability:
  창립 엔지니어 한 명만 시스템을 이해한다 — bus factor 1.
```

### Simplicity — 단순성

새 엔지니어가 시스템을 이해하기 쉬워야 한다.

- 우연적 복잡도(accidental complexity) 제거
- 좋은 추상화
- 명확한 이름
- 일관된 패턴

Fred Brooks가 *No Silver Bullet*에서 구분한 두 복잡도.

- **Essential complexity** — 문제 자체의 본질적 복잡도. 줄일 수 없다.
- **Accidental complexity** — 도구·구현·역사 때문에 생긴 복잡도. *제거 가능*하다.

> "Out of the tar pit" — Moseley & Marks가 강조한 simplicity의 중요성. 특히 *공유된 상태(shared mutable state)* 가 accidental complexity의 핵심 원천이라고 지적한다.

좋은 *추상화*가 simplicity의 가장 강력한 도구다. 데이터베이스 같은 도구는 *디스크의 복잡도*를 *키-값 API*로 가리는 것이다. 좋은 시스템에는 좋은 *내부 추상화* — 모듈, 인터페이스 — 가 있다.

**좋은 추상화의 예** — *고수준 프로그래밍 언어*가 어셈블리의 복잡도를 추상화한다. 트랜잭션이 *동시성 + 부분 실패*의 복잡도를 추상화한다. 좋은 추상화는 *내부 구현이 바뀌어도 사용자 코드가 안 깨진다*.

### Evolvability — 진화 가능성

시스템이 변화에 대응할 수 있어야 한다.

- 새 요구사항을 쉽게 추가
- 기술 부채 줄이기
- 리팩터링 가능한 디자인

Agile 운동이 *evolvability를 위한 방법론*이다. TDD, refactoring, CI/CD 모두 *변경 비용을 일정하게 유지*하려는 시도다.

Clean Architecture / Refactoring이 다룬 정확히 그 영역. 데이터 시스템에서는 *스키마 변경*, *백워드 호환*, *마이그레이션* 능력이 evolvability의 핵심.

```text
저-evolvability 시스템:
  새 칼럼 추가 → 다운타임 4시간
  새 마이크로서비스 → 6개월
고-evolvability 시스템:
  새 칼럼 추가 → 무중단 마이그레이션
  새 마이크로서비스 → 1주
```

### 세 원칙의 우선순위

세 원칙 중 **simplicity가 다른 둘을 가능하게 한다**. 복잡한 시스템은 *운영*할 수도 *진화*할 수도 없다.

> *"Inside every large program is a small program struggling to get out."* — Tony Hoare

처음부터 simplicity를 우선시한 시스템만이 *나중에 evolvability를 가질 수 있다*. 복잡도가 한 번 누적되면 *되돌리기 어렵다*.

## 책의 나머지 구조

이 세 품질을 어떻게 달성하는가가 책의 나머지 11장이다.

- **Part I (Ch 2-4)** — 단일 노드에서의 도구
- **Part II (Ch 5-9)** — 여러 노드, 분산 시스템
- **Part III (Ch 10-12)** — 파생 데이터, batch / stream

각 챕터가 reliability / scalability / maintainability에 어떻게 기여하는지 본다.

## 세 품질의 상호작용

세 품질은 *독립적이지 않다*. 한 축을 강화하면 다른 축에 영향이 간다.

| 결정 | Reliability | Scalability | Maintainability |
|---|---|---|---|
| 복제(replication) 추가 | 향상 | 향상 | *악화* (복잡도) |
| 마이크로서비스로 분할 | 부분 향상 | 향상 | 양면적 (격리 vs 분산 디버깅) |
| 강한 일관성 보장 | 향상 | *악화* | 향상 (단순한 모델) |
| 캐시 추가 | 영향 없음 | 향상 | *악화* (캐시 무효화) |
| 비동기화(eventual) | 부분 악화 | 향상 | 악화 (race 디버깅) |

**모든 결정에 한 가지 답이 없다**. 이게 *engineering*의 본질 — *trade-off의 의도된 선택*이다. 책의 나머지가 *각 trade-off의 정확한 모양*을 그린다.

## 작은 예시 — 전체 적용

가상의 e-commerce 시스템을 생각해 보자.

```text
요구사항:
  - 사용자 1억, 주문 일 100만, 검색 일 1000만
  - p99 응답 < 200ms (사용자 페이지)
  - 가용성 SLO 99.95%
  - 새 결제 수단 추가가 *분기마다* 일어남
```

세 품질 lens로 본 결정.

**Reliability**:
- DB는 master + 2 replica (다른 AZ)
- 결제는 *exactly-once* 보장 (트랜잭션)
- 재고는 *at-least-once* 허용 (사후 보정)
- Chaos Monkey가 매일 인스턴스 죽임

**Scalability**:
- 읽기는 cache(Redis) → replica → primary 순
- 검색은 별도 Elasticsearch 클러스터
- 사용자 ID로 *파티션*된 주문 테이블
- 분석 쿼리는 BigQuery로 분리(OLAP)

**Maintainability**:
- 결제 모듈은 *strategy 패턴*으로 추상화 (Stripe / PayPal / Toss)
- 모든 서비스에 *분산 트레이싱* (OpenTelemetry)
- 스키마는 *protobuf*로 정의, 버전 관리
- 새 결제 수단 = *plugin* 추가만

세 품질이 *각각 다른 결정 축*을 정의했다. 하나만 보면 *나머지가 무너진다*.

## 정리

- **Data-Intensive** 시스템 — 데이터의 양 / 복잡도 / 속도가 병목
- **세 품질** — Reliability / Scalability / Maintainability
- **Reliability** — fault가 failure 안 되게, 사람 에러가 가장 큰 원인
- **Fault vs Failure** — 구성요소의 fault와 시스템의 failure는 다르다
- **Chaos Engineering** — 의도된 fault 주입으로 reliability 검증 (Netflix)
- **SLI/SLO/SLA** — 신뢰성을 숫자로 표현, error budget으로 위험 관리 (Google SRE)
- **Scalability** — 부하 정의 → 성능 정의 → 트레이드오프
- **Throughput vs Response time** — 처리량과 지연은 독립된 두 축, 보통 trade-off
- **Percentile** — p50/p95/p99/p99.9, 평균은 의미 없다
- **Tail latency** — p99, p999가 시스템 디자인 결정
- **Twitter 사례** — fan-out-on-write vs fan-out-on-read의 hybrid
- **Maintainability** — Operability / Simplicity / Evolvability
- **세 품질은 trade-off** — 한 축 강화는 다른 축에 영향

## 다음 장 예고

다음 장은 **Data Models and Query Languages** — 데이터를 어떻게 표현할 것인가. Relational, Document, Graph 모델.

## 관련 항목

- [Clean Architecture Ch 1: 디자인](/blog/programming/design/clean-architecture/chapter01-what-is-design-and-architecture) — 변경 비용 일정성
- [Refactoring Ch 2: 원칙](/blog/programming/design/refactoring/ch02) — Design Stamina Hypothesis
- [Distributed Systems Ch 8: Fault Tolerance](/blog/parallel/distributed-systems-tanenbaum/chapter08-fault-tolerance) — fault model의 분류
- *Site Reliability Engineering* (Google) — SLI/SLO/SLA, error budget의 원전
- *The Phoenix Project* — operability와 DevOps 문화
