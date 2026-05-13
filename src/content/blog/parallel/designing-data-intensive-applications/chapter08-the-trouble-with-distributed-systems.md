---
title: "Ch 8: 분산 시스템의 문제들"
date: 2025-07-02T04:00:00
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

## 1. 네트워크의 문제

네트워크 호출이 실패할 수 있는 방식.

- 패킷 loss
- 패킷 지연 (millisecond? second? minute?)
- 잘못된 라우팅
- 네트워크 partition (한 그룹이 다른 그룹과 분리)
- 패킷 corruption
- 받는 쪽의 부하 / 큐 overflow

### 단방향 실패 vs 양방향 실패

```
A → B: 요청 갔는가?
B → A: 응답 갔는가?
```

A가 응답을 못 받았다면 — 어느 쪽이 깨졌는지 모름. 두 가지 가능:

1. B에 도달 못 함 (B는 알 바 없음)
2. B는 처리, 응답이 안 옴 (B는 처리했다고 알고 있음)

이 두 경우의 처리가 다른데 — A는 구분 불가.

**해법** — Idempotency. 같은 요청을 여러 번 해도 한 번 한 것과 같은 결과.

### Timeout — 얼마면 되는가

응답이 안 오면 — 얼마나 기다릴까?

- 짧게: 잘 동작하는 서버를 죽었다고 오해
- 길게: 진짜 죽은 서버에 영원히 기다림

**좋은 답이 없음**. 보통은 통계 기반 — p99의 N배.

## 2. 시계의 문제

각 노드가 자기 시계를 가짐. 시계는 **드리프트**한다.

- Quartz oscillator — ~10^-6 의 정확도, 하루에 수 ms 드리프트
- NTP synchronization — 인터넷을 통해 시간 동기화
- GPS 시계 — 정확하지만 인공위성 신호 필요

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

### 분산에서의 시계 동기화

두 노드의 시계를 어떻게 일치시키나? 완벽히는 불가능.

```
Node A: NTP → 12:00:00.000
Node B: NTP → 12:00:00.005

5ms 차이 — 정상
```

NTP의 정확도: 인터넷으로 수 ms ~ 수십 ms, LAN에서는 수 µs.

### 시계가 분산 시스템을 깰 때

**Last-Write-Wins** 충돌 해결.

```
Leader 1 (시계 빠름): write("alice", "Alice Kim", timestamp=100)
Leader 2 (시계 느림): write("alice", "Alice Lee", timestamp=99)

→ "Alice Kim"이 이김 (timestamp 큼)
→ 실제로는 Alice Lee가 나중에 쓴 것일 수 있는데
```

시계 차이만큼 잘못된 결정.

### Logical Clock — 시간 없는 시간

진짜 시간 대신 **인과 관계**만 추적.

**Lamport Timestamp** — 각 노드가 카운터. 메시지에 timestamp 첨부. 받으면 max.

```
A: 5 → send msg(5) to B
B: counter = max(3, 5) + 1 = 6
```

**Vector Clock** — 각 노드의 카운터 벡터.

```
[A:3, B:5, C:2]
```

인과 관계가 더 정확. 두 이벤트가 인과적으로 비교 가능한지 알 수 있음.

## 3. 부분 실패

단일 머신은 보통 **전체 작동** 또는 **전체 죽음**. 분산 시스템은 **부분 실패**.

- 일부 노드는 작동, 일부는 죽음
- 일부는 응답, 일부는 timeout
- 일부는 옛 데이터, 일부는 새 데이터

이게 본질적으로 분산 시스템이 어려운 이유.

### Process Pause

GC, virtual memory swap, OS scheduling — 한 프로세스가 갑자기 수 초 멈출 수 있다.

```
T1: lock 잡음 (1초 후 만료)
T1: GC pause 5초
T1: 깨어남 → 자기는 락 가지고 있다고 생각
   ← 그러나 lease는 이미 만료, 다른 노드가 락 가짐
```

이게 "split brain"의 흔한 원인.

해법: **fencing token**. 락을 받을 때 monotonic ID 받음. 자원에 접근할 때마다 ID 검증.

```
T1: get lock → token=33
T1: pause 5초
T1: write with token=33
Storage: "이미 token=34 처리함" → reject
```

### 신뢰할 수 없는 노드

비잔틴 (Byzantine) 실패 — 노드가 **거짓말**까지 한다.

- 일반 fault — 죽거나 응답 안 함
- 비잔틴 fault — 잘못된 응답, 다른 노드마다 다른 응답, 악의적

대부분의 분산 알고리즘은 **non-Byzantine** 가정. 비잔틴 견딤은 매우 비싸다 (3f+1 노드 필요, f는 비잔틴 노드 수).

블록체인은 비잔틴 친화 — 신뢰 없는 노드들 사이에서 동작.

## 진실의 정의 — Quorum

분산 시스템에서 "진실"은 무엇인가? 한 노드가 알고 있는 게 아니라 **다수**가 동의하는 것.

```
N=5 노드 중 3개가 X에 동의 → X가 진실
```

이게 quorum의 본질. 5장의 quorum read/write의 정확성 기반.

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

## 정리

- **네트워크**는 신뢰할 수 없음 — 패킷 loss, 지연, 단방향 실패
- **시계**는 동기 안 됨 — NTP도 ms 단위 차이
- **부분 실패** — 일부만 죽음, 일부만 응답
- **Process pause** — GC, swap이 split brain 만듦 — fencing token
- **비잔틴**은 노드가 거짓말까지 — 대부분 알고리즘은 가정 안 함
- **Quorum** — 진실은 다수 동의
- 시스템 모델 — 가정을 명시해야 정확성 분석 가능

## 다음 장 예고

다음 장은 **Consistency and Consensus** — 분산에서 합의는 가능한가, 어떻게.

## 관련 항목

- [Ch 7: Transactions](/blog/parallel/designing-data-intensive-applications/chapter07-transactions)
- [Ch 5: Replication](/blog/parallel/designing-data-intensive-applications/chapter05-replication) — 복제 지연
