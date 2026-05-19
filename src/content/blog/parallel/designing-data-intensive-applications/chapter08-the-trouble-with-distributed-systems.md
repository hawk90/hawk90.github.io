---
title: "Ch 8: 분산 시스템의 문제들"
date: 2026-05-12T08:00:00
description: "신뢰할 수 없는 네트워크, 동기 안 된 시계, 부분 실패. 분산 시스템이 본질적으로 어려운 이유."
tags: [DDIA, Distributed, Network, Clock, Failure]
series: "Designing Data-Intensive Applications"
seriesOrder: 8
draft: true
---

## 이 챕터의 메시지

분산 시스템은 단일 노드 프로그래밍보다 **본질적으로** 어렵다. Kleppmann의 이 챕터는 그 어려움을 정리한다.

세 가지 큰 문제.

1. **네트워크는 신뢰할 수 없다**
2. **시계는 동기 안 된다**
3. **부분 실패**가 발생한다

각 문제를 단순히 인지하는 것 자체가 첫 단계. 단일 노드 사고방식으로 분산 시스템을 짜면 거의 항상 깨진다.

일상의 비유 — **우편으로 합의**. 한 마을 사람들이 편지로만 의사소통한다. 편지는 늦게 오기도 하고, 분실되기도 하고, 누가 먼저 보냈는지 우체국 직인이 다 다르다. 그래도 "다수가 동의한 결정"을 만들어야 한다. 이게 분산 합의의 본질이다.

## 8가지 분산 컴퓨팅의 오류 (Fallacies of Distributed Computing)

1990년대 Sun의 Peter Deutsch가 정리. 신입 분산 시스템 엔지니어가 자주 하는 잘못된 가정.

1. The network is reliable.
2. Latency is zero.
3. Bandwidth is infinite.
4. The network is secure.
5. Topology doesn't change.
6. There is one administrator.
7. Transport cost is zero.
8. The network is homogeneous.

이 챕터에서 다루는 거의 모든 문제가 이 8가지 중 하나의 반박이다. 분산 시스템 설계는 "이 가정 중 어떤 것이 깨질 때 시스템이 어떻게 동작하는가"를 묻는 일이다.

## 1. 네트워크의 문제

네트워크 호출이 실패할 수 있는 방식.

- 패킷 loss
- 패킷 지연 (millisecond? second? minute?)
- 잘못된 라우팅
- 네트워크 partition (한 그룹이 다른 그룹과 분리)
- 패킷 corruption
- 받는 쪽의 부하 / 큐 overflow

이 모든 게 한 timeout 이벤트로 묶인다. "응답이 안 옴." 응답이 안 오는 이유는 알 수 없다.

### 단방향 실패 vs 양방향 실패

```text
A → B: 요청 갔는가?
B → A: 응답 갔는가?
```

A가 응답을 못 받았다면 — 어느 쪽이 깨졌는지 모름. 두 가지 가능:

1. B에 도달 못 함 (B는 알 바 없음)
2. B는 처리, 응답이 안 옴 (B는 처리했다고 알고 있음)

이 두 경우의 처리가 다른데 — A는 구분 불가.

**해법** — Idempotency. 같은 요청을 여러 번 해도 한 번 한 것과 같은 결과. HTTP의 GET / PUT / DELETE가 idempotent로 설계된 이유다. POST는 그렇지 않아 — 클라이언트가 unique request ID를 부여하고 서버가 중복을 거부하는 패턴 (idempotency key)을 자주 쓴다.

### Timeout — 얼마면 되는가

응답이 안 오면 — 얼마나 기다릴까?

- 짧게: 잘 동작하는 서버를 죽었다고 오해 (false positive)
- 길게: 진짜 죽은 서버에 영원히 기다림 (false negative)

**좋은 답이 없음**. 보통은 통계 기반 — p99 latency의 N배. 또는 적응형 — 최근 응답 시간의 EWMA에 마진을 더함.

Phi accrual failure detector (Cassandra가 사용)는 timeout을 binary가 아닌 연속 값으로 다룬다. "이 노드가 죽었을 확률"을 계산해 — 0.9 이상이면 죽은 것으로 간주. 노드별 응답 시간 분포를 학습한다.

### Network Partition

부분의 노드 간 통신이 끊어진 상태. 흔히 **split brain**이라 불린다.

```text
정상:
  A ↔ B ↔ C   (모두 연결)

Partition:
  A ↔ B   |   C   (A, B는 통신, C는 격리)
```

C는 자기가 격리된 걸 모를 수도 있다. C 입장에서는 A와 B가 죽은 것처럼 보임. C가 leader였다면 — A, B는 새 leader를 뽑으려 한다. 그러면 두 leader가 생기고 — 둘 다 자기가 진짜라고 믿는다.

해법은 **quorum**과 **fencing**. 다수 (N/2 + 1) 노드가 동의한 결정만 유효. 격리된 소수는 결정을 못 내림.

## 2. 시계의 문제

각 노드가 자기 시계를 가짐. 시계는 **드리프트**한다.

- Quartz oscillator — ~10⁻⁶ 의 정확도, 하루에 수 ms 드리프트
- NTP synchronization — 인터넷을 통해 시간 동기화
- GPS 시계 — 정확하지만 인공위성 신호 필요

일상 비유. **각 도시의 시계가 다름**. 서울 시계, 부산 시계가 매일 조금씩 빨라지거나 느려진다. 라디오 시보로 가끔 맞추지만 그것도 전파 지연만큼 오차. "12시 정각"이라 적힌 메시지가 서울 시계로 11:59:59에 도착할 수도 12:00:01에 도착할 수도 있다.

### 두 가지 시계

**Time-of-day Clock**

```python
time.time()  # 1722345678.123 (Unix epoch)
```

벽시계. 사람이 이해하는 시간.

**문제**:

- NTP가 시계를 갑자기 앞/뒤로 점프시킬 수 있음
- 음수 duration 계산 가능
- 시간 측정에 부적합

**Monotonic Clock**

```python
time.monotonic()  # 매번 증가, 절대값 의미 없음
```

단조 증가. NTP에 영향 안 받음. **시간 측정**에 사용.

**원칙** — 시점은 time-of-day, 간격은 monotonic.

C++의 `std::chrono::system_clock`는 wall clock, `std::chrono::steady_clock`은 monotonic clock. 두 개를 헷갈리지 말 것. 락 타임아웃이나 retry 백오프는 무조건 monotonic.

### NTP의 한계

NTP의 정확도는 환경에 따라 다르다.

- LAN — 수십 µs ~ 수 ms
- 인터넷 — 수 ms ~ 수십 ms
- 부하 / 비대칭 경로 — 수백 ms까지 튐

NTP 자체가 — server 응답에 stratum 단계가 있고, 각 단계마다 추가 오차. Stratum 1 (원자시계나 GPS 직결)에서 멀어질수록 오차 누적.

### Leap Second — 시간이 멈춘다

지구 자전 속도와 원자시간의 차이를 보정하기 위해 가끔 1초가 삽입되거나 빠진다. UTC에 추가되는 leap second.

```text
23:59:59
23:59:60   ← leap second 삽입
00:00:00
```

문제는 — Linux 커널과 많은 애플리케이션이 60초를 못 받아들임. `tv_sec`이 같은 값에 머무르거나, time-of-day가 갑자기 1초 점프.

**Cloudflare 2017 leap second outage** — 2016년 12월 31일에 추가된 leap second 때문에 Cloudflare의 RNG가 음수 duration을 계산. `panic`. DNS resolution 일부 실패. 영향은 글로벌. 원인 — `time.Now().Sub(start)`가 시간이 거꾸로 가서 음수를 반환했고, 그 음수를 받지 못한 코드가 죽었다.

교훈 — duration 계산은 무조건 monotonic clock.

### 분산에서의 시계 동기화

두 노드의 시계를 어떻게 일치시키나? 완벽히는 불가능.

```text
Node A: NTP → 12:00:00.000
Node B: NTP → 12:00:00.005

5ms 차이 — 정상
```

NTP의 정확도: 인터넷으로 수 ms ~ 수십 ms, LAN에서는 수 µs.

### 시계가 분산 시스템을 깰 때

**Last-Write-Wins** 충돌 해결.

```text
Leader 1 (시계 빠름): write("alice", "Alice Kim", timestamp=100)
Leader 2 (시계 느림): write("alice", "Alice Lee", timestamp=99)

→ "Alice Kim"이 이김 (timestamp 큼)
→ 실제로는 Alice Lee가 나중에 쓴 것일 수 있는데
```

시계 차이만큼 잘못된 결정. Cassandra가 LWW를 쓰면 — 노드 간 시계 오차가 그대로 데이터 분실로 이어진다.

### Logical Clock — 시간 없는 시간

진짜 시간 대신 **인과 관계**만 추적.

**Lamport Timestamp** — 각 노드가 카운터. 메시지에 timestamp 첨부. 받으면 max.

```text
A: 5 → send msg(5) to B
B: counter = max(3, 5) + 1 = 6
```

**Vector Clock** — 각 노드의 카운터 벡터.

```text
[A:3, B:5, C:2]
```

인과 관계가 더 정확. 두 이벤트가 인과적으로 비교 가능한지 알 수 있음.

### Google TrueTime — 시간을 구간으로

Google Spanner의 비밀 무기. 모든 데이터센터에 GPS 수신기와 원자시계 둘 다 설치. 둘의 합의로 시간 + **불확실성 bound**를 함께 부여.

```text
TT.now() = [earliest, latest]   ← 보통 7ms 폭
```

Spanner의 commit은 — write timestamp T를 부여한 뒤 `wait_until(T < TT.now().earliest)` 까지 기다린다. 이걸 **commit wait**라 부른다. 7ms 정도 기다리면 — 어떤 다른 노드의 시계로도 T가 과거임이 보장. 그 후의 모든 트랜잭션은 T 이후의 timestamp를 받는다.

이렇게 — 시계 오차를 **bound된 양**으로 만들고, 그 bound만큼 기다림으로써 external consistency를 얻는다. Ch 9에서 이어진다.

## 3. 부분 실패

단일 머신은 보통 **전체 작동** 또는 **전체 죽음**. 분산 시스템은 **부분 실패**.

- 일부 노드는 작동, 일부는 죽음
- 일부는 응답, 일부는 timeout
- 일부는 옛 데이터, 일부는 새 데이터

이게 본질적으로 분산 시스템이 어려운 이유.

### Process Pause

GC, virtual memory swap, OS scheduling, **virtualization suspend** — 한 프로세스가 갑자기 수 초 멈출 수 있다.

```text
T1: lock 잡음 (1초 후 만료)
T1: GC pause 5초
T1: 깨어남 → 자기는 락 가지고 있다고 생각
   ← 그러나 lease는 이미 만료, 다른 노드가 락 가짐
```

이게 "split brain"의 흔한 원인.

가능한 pause 원인:

- **GC** — Java의 JVM이 stop-the-world GC. 수 초까지.
- **Virtualization suspend** — VM을 옮길 때 (live migration) 잠시 정지. 게스트 OS는 모름.
- **Page swap** — 메모리 부족 시 swap. 디스크 I/O가 끝날 때까지 정지.
- **OS scheduling** — 다른 process가 CPU를 독점. 우리는 ready queue에서 대기.
- **CPU throttling** — 컨테이너 cgroup CPU 한도에 걸려 throttle.

해법: **fencing token**. 락을 받을 때 monotonic ID 받음. 자원에 접근할 때마다 ID 검증.

```text
T1: get lock → token=33
T1: pause 5초
[다른 노드가 T1을 죽었다고 판단, token=34 발급]
T1: write with token=33
Storage: "이미 token=34 처리함" → reject
```

스토리지 측이 — 받은 token이 자기가 본 최대보다 작으면 거부. 옛 lease holder의 좀비 write가 차단된다.

### 신뢰할 수 없는 노드 — Byzantine

비잔틴 (Byzantine) 실패 — 노드가 **거짓말**까지 한다.

- 일반 fault — 죽거나 응답 안 함 (crash fault)
- 비잔틴 fault — 잘못된 응답, 다른 노드마다 다른 응답, 악의적

대부분의 분산 알고리즘은 **non-Byzantine** 가정. 비잔틴 견딤은 매우 비싸다 (3f+1 노드 필요, f는 비잔틴 노드 수).

블록체인은 비잔틴 친화 — 신뢰 없는 노드들 사이에서 동작. 그 대가는 처리량. Bitcoin의 7 TPS 같은 수치.

데이터센터 내부의 시스템은 — 보통 비잔틴을 가정하지 않는다. 운영자가 같은 조직이고, 노드가 악의적으로 거짓말할 동기가 없다. 그러나 멀티 테넌트 클라우드, 오픈 인터넷, 보안 위협 모델에서는 다르다.

## 진실의 정의 — Quorum

분산 시스템에서 "진실"은 무엇인가? 한 노드가 알고 있는 게 아니라 **다수**가 동의하는 것.

```text
N=5 노드 중 3개가 X에 동의 → X가 진실
```

이게 quorum의 본질. 5장의 quorum read/write의 정확성 기반.

Quorum은 — partition 발생 시 한쪽만 진행 가능하게 만드는 도구다. 다수가 한쪽에만 있을 수 있으므로 — 다른 쪽은 진행을 멈춘다. Split brain이 발생할 수 없다 (정의상).

## 시스템 사례

### AWS S3 outage 2017

2017년 2월 28일. AWS Northern Virginia (us-east-1) 리전의 S3가 4시간 다운. 원인 — 운영자가 단순한 디버깅 명령을 잘못 입력해 의도보다 많은 서버를 종료. 그러나 진짜 교훈은 — S3가 너무 많은 다른 AWS 서비스의 의존성이 되어 있었다는 점. CloudWatch, EC2, Lambda 등이 메타데이터를 S3에 저장. S3가 죽자 다른 서비스도 줄줄이 못 시작.

부분 실패가 **계단형 cascade**로 번지는 전형적 사례. 분산 시스템의 의존성 그래프를 평소에 그려두지 않으면 — 한 서비스의 fault가 어디까지 번질지 모른다.

### Cloudflare 2017 leap second

위에서 다룸. 시계 가정의 실패.

### Google Spanner — TrueTime의 가치

위에서 다룸. 시계 오차를 명시적으로 다룬 보기 드문 예.

## 네트워크 측정과 관측

분산 시스템 운영에서 — 네트워크 상태를 측정하지 않으면 디버깅 불가능. 핵심 지표.

- **RTT** (Round Trip Time) — ping의 기본. p50, p99, p999.
- **Packet loss** — 보통 0.01% 미만. 1% 넘으면 의심.
- **Bandwidth** — iperf3로 측정. TCP / UDP 별도.
- **Connection rate** — 새 connection 초당 몇 개.

운영 인시던트의 흔한 패턴 — "p99 latency가 갑자기 100배 튐". 원인은 거의 항상 — 한 노드의 네트워크 카드 / 케이블 / 스위치 포트의 부분 실패. 완전히 죽지 않고 "느려졌을 뿐"이라 health check가 통과한다. Tail latency를 모니터링하지 않으면 못 잡는다.

## 메시지 큐 — 비동기로 부분 실패 흡수

위에 다룬 모든 문제를 — 직접 마주하지 않고 회피하는 도구가 메시지 큐.

```text
직접 호출:
  Service A → Service B
  B가 죽으면 → A도 에러

큐 경유:
  Service A → Queue → Service B
  B가 죽어도 → 큐에 메시지 쌓임, B 복구 시 처리
```

Kafka, RabbitMQ, AWS SQS 같은 도구. **At-least-once** delivery가 기본 — 메시지가 한 번 이상 전달됨. 중복은 receiver의 idempotency로 처리.

**Exactly-once**는 매우 어렵다 (Ch 11에서 자세히). 일반적으로 — at-least-once + idempotent consumer 패턴이 실용.

## 부분 실패에 대한 설계 원칙

운영 경험에서 정리되는 원칙.

- **Idempotency** — 모든 외부 호출은 같은 요청 여러 번 받아도 안전.
- **Timeout** — 무한 대기는 없음. 모든 호출에 timeout.
- **Retry with backoff** — 즉시 재시도 X, exponential backoff + jitter.
- **Circuit breaker** — 연속 실패 시 일시적 호출 차단. 폭주 방지.
- **Bulkhead** — 한 컴포넌트 실패가 다른 곳으로 안 번지게 격리.
- **Graceful degradation** — 의존 서비스 죽어도 핵심 기능은 동작.
- **Backpressure** — 받는 쪽이 느리면 보내는 쪽에 압력. 큐가 무한히 자라는 걸 방지.

이 원칙들을 처음부터 박아 설계하면 — 부분 실패의 대부분이 시스템 전체 다운으로 번지지 않는다.

## 시스템 모델 — 가정의 명시

분산 알고리즘을 설계할 때 — 어떤 가정을 하느냐가 정확성을 결정.

**Timing**:

- **Synchronous** — 메시지 전달 / 처리에 상한
- **Partially Synchronous** — 보통 빠르지만 가끔 느림
- **Asynchronous** — 상한 없음

**Failure**:

- **Crash-stop** — 노드가 멈추면 영원히
- **Crash-recovery** — 다시 시작 가능
- **Byzantine** — 거짓말 포함

실제 시스템은 거의 **partial synchronous + crash-recovery**.

알고리즘의 정확성을 증명할 때 — 어떤 timing / failure 모델에서 안전한지를 명시해야 한다. Paxos는 "asynchronous + crash-recovery + non-Byzantine"에서 안전. Termination은 partial synchronous를 추가로 가정.

## Real-Time Constraints — 하드 vs 소프트

분산 시스템의 timing 가정은 — 실시간 시스템과 다르다.

- **Hard real-time** — 자동차 ABS, 항공기 제어. 마감을 놓치면 시스템 실패.
- **Soft real-time** — 비디오 스트리밍. 마감을 놓치면 품질 저하.
- **Non real-time** — 일반 웹 서비스. 마감 개념 없음, 단지 average latency.

대부분의 분산 데이터 시스템은 — non real-time. 평균 latency가 좋으면 OK. 그러나 tail latency가 SLA에 들어가면 — soft real-time에 가까운 보장이 필요해진다.

JVM의 GC, OS의 scheduling, network jitter — 모두 tail latency를 부풀린다. 그래서 — 실시간 보장이 필요한 부분은 — JVM이 아닌 Rust/C++ 같은 GC-free 언어, real-time kernel, 전용 하드웨어가 동원된다.

## Failure Detection의 정확성

부분 실패 검출은 — 본질적으로 불완전하다.

- **Completeness** — 죽은 노드는 결국 죽었다고 검출.
- **Accuracy** — 살아 있는 노드를 죽었다고 잘못 검출하지 않음.

Async 시스템에서 — 양쪽을 동시에 보장 불가능. 죽은 노드와 느린 노드를 구별 못 하기 때문.

실용적 검출기는 — **eventually strong**. 결국 모든 죽은 노드 검출 + 결국 잘못된 의심은 철회. "결국"이 partial synchronous에서 보장.

이게 — Raft의 leader election이 — false positive (멀쩡한 leader를 죽었다고 의심)를 가끔 받아들이는 이유. 잘못된 의심이 일어나도 — election이 일어나고 새 leader가 뽑힐 뿐, safety는 깨지지 않는다.

## 안전성과 진행성

- **Safety** — 나쁜 일이 일어나지 않음. ("두 노드가 다른 결정 안 함")
- **Liveness** — 좋은 일이 결국 일어남. ("모든 fault-free 노드가 결국 결정")

FLP impossibility (Ch 9에서 자세히)는 — async에서 양쪽을 동시에 보장할 수 없다는 결과. 그래서 실용 시스템은 safety를 항상 보장하고, liveness는 partial synchronous 가정 아래 보장한다. 통신이 영원히 깨지면 진행을 못 하더라도 — 잘못된 결정은 안 한다.

## Knowledge, Truth, and Lies — 인식의 한계

분산 시스템에서 한 노드가 "알고 있는" 것은 — 자기 입력의 누적일 뿐이다. 다른 노드의 상태에 대해 — 가장 최근에 받은 메시지의 시점까지만 안다. 그 후로 변했을 수 있다.

```text
Node A의 인식:
  "B는 5초 전에 살아 있었다"
  → "B는 지금 살아 있을 것이다" (?)
  ← 보장 X. B는 5초 전 죽었을 수도.
```

이게 분산 시스템의 인식론적 한계. 한 노드의 결정은 — 항상 옛 정보에 기반한다. "현재"는 알 수 없다.

해법은 — 결정을 **다수의 합의**로 만들고, 결정 후에 fencing token으로 옛 인식 기반 행동을 거부한다. Ch 9의 consensus가 이 한계를 다루는 도구다.

## 분산 시스템 디버깅의 도구

부분 실패의 진단은 어렵다. 한 요청이 5개 서비스를 거치고 그 중 어디가 느렸는지 — 로그만 봐서는 알 수 없다.

도구.

- **Distributed tracing** — OpenTelemetry, Jaeger, Zipkin. 한 요청에 trace ID를 부여, 모든 서비스가 span을 emit. 시각화하면 어디서 시간이 갔는지 보임.
- **Structured logging** — JSON 로그. trace ID, request ID, user ID 같은 표준 필드. ElasticSearch나 Loki에 집계.
- **Metrics** — Prometheus 같은 시계열 DB. RED (Rate, Errors, Duration), USE (Utilization, Saturation, Errors) 패턴.
- **Chaos engineering** — Netflix의 Chaos Monkey. 일부러 노드를 죽여 시스템이 견디는지 확인.

이런 관측 인프라 없이는 — 부분 실패가 어디서 일어났는지 확인조차 못 한다. 그래서 — 분산 시스템 설계 단계에서 관측 가능성을 같이 설계해야 한다.

## Geographically Distributed Systems — 추가 비용

같은 데이터센터의 분산도 어렵지만 — 데이터센터 간 (cross-region)은 훨씬 어렵다.

| | LAN | Cross-DC (같은 region) | Cross-region |
|---|---|---|---|
| RTT | 0.1 ms | 1 ms | 50–300 ms |
| 대역폭 | 10–100 Gbps | 10 Gbps | 1–10 Gbps |
| 가용성 | 99.9% | 99.99% | 99.9% (각 DC) |
| 비용 | 무료 | 무료 (사내) | $$$ (AWS data transfer) |

Cross-region에서 — strong consistency를 유지하면 latency가 RTT × 알고리즘 round 수 만큼 늘어남. Spanner의 cross-region write가 100ms 넘는 이유. 그래서 — cross-region에서는 eventual consistency 또는 region-local strong consistency가 일반적.

운영 인식 — "지구 반대편에서는 빛도 67ms 걸린다." 물리 법칙에 의한 하한. 어떤 알고리즘도 못 줄임. 그래서 — cross-region 응답 시간 SLA는 RTT를 기준으로 설계.

## 정리

- **네트워크**는 신뢰할 수 없음 — 패킷 loss, 지연, 단방향 실패
- **8 Fallacies** — 분산 시스템 설계의 흔한 잘못된 가정
- **시계**는 동기 안 됨 — NTP도 ms 단위 차이, leap second는 1초 점프
- **두 시계** — time-of-day vs monotonic. 간격은 무조건 monotonic
- **TrueTime** — 시계 오차를 bound된 양으로 만든 보기 드문 사례
- **부분 실패** — 일부만 죽음, 일부만 응답
- **Process pause** — GC, swap, VM suspend가 split brain 만듦 — fencing token으로 방어
- **비잔틴**은 노드가 거짓말까지 — 대부분 알고리즘은 가정 안 함
- **Quorum** — 진실은 다수 동의
- **System model** — timing과 failure의 가정을 명시해야 정확성 분석 가능
- **Safety vs Liveness** — safety는 항상 보장, liveness는 partial sync 가정

## 다음 장 예고

다음 장은 **Consistency and Consensus** — 분산에서 합의는 가능한가, 어떻게. Linearizability, FLP, Paxos, Raft, 2PC.

## 관련 항목

- [Ch 7: Transactions](/blog/parallel/designing-data-intensive-applications/chapter07-transactions)
- [Ch 9: 일관성과 합의](/blog/parallel/designing-data-intensive-applications/chapter09-consistency-and-consensus)
- [Ch 5: Replication](/blog/parallel/designing-data-intensive-applications/chapter05-replication) — 복제 지연
