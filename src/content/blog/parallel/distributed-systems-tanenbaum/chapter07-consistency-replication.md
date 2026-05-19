---
title: "Ch 7: Consistency and Replication"
date: 2025-05-20T07:00:00
description: "데이터 중심 vs 클라이언트 중심 일관성, 복제 프로토콜, CAP 정리"
series: "Distributed Systems"
seriesOrder: 7
tags: [distributed-systems, consistency, replication, cap, eventual-consistency]
draft: true
type: book-review
bookTitle: "Distributed Systems: Principles and Paradigms"
bookAuthor: "Maarten van Steen, Andrew S. Tanenbaum"
---

## 복제의 이유

**복제 (Replication)**: 같은 데이터를 여러 노드에 저장.

```
복제가 필요한 이유:

1. 성능
   ┌──────┐     멀리
   │ User │ ──────────────▶ Origin (느림)
   └──────┘
      │ 가까이
      └──────────▶ Replica (빠름)

2. 가용성
   Primary ╳ (장애) → Replica가 서비스 계속

3. 확장성
   읽기 부하를 여러 복제본에 분산
```

**핵심 문제**: 복제본 간 **일관성 유지**.

```
일관성 vs 성능 트레이드오프:
- 강한 일관성 → 동기화 비용 ↑, 지연 ↑
- 약한 일관성 → 성능 ↑, 일시적 불일치 허용
```

---

## 데이터 중심 일관성 모델

**저장소(데이터) 관점**에서 정의.

### 엄격 일관성 (Strict Consistency)

모든 읽기가 **가장 최근 쓰기**를 반환.

```
이상적 모델 (분산에서 불가능):
- 쓰기 즉시 모든 복제본에 반영
- 글로벌 클럭 필요

현실: 빛의 속도 제한으로 불가능
```

### 순차 일관성 (Sequential Consistency)

모든 프로세스가 **같은 순서**로 연산을 본다.

```
유효한 순차 일관성:
P1: W(x)1 ─────────────────────────▶
P2: ─────────── W(x)2 ─────────────▶
P3: ─────────────── R(x)2 ── R(x)1 ▶  ✓ (2→1 순서 가능)
P4: ─────────────── R(x)2 ── R(x)1 ▶  ✓ (같은 순서)

유효하지 않은:
P1: W(x)1 ─────────────────────────▶
P2: ─────────── W(x)2 ─────────────▶
P3: ─────────────── R(x)2 ── R(x)1 ▶  (2→1 순서)
P4: ─────────────── R(x)1 ── R(x)2 ▶  ✗ (1→2 순서, 불일치)
```

### 인과 일관성 (Causal Consistency)

**인과 관계**가 있는 연산만 순서 보장.

```
인과 관계 정의:
- P가 x를 읽고 나서 y를 쓰면 → W(y)는 R(x)에 인과적으로 의존

유효한 인과 일관성:
P1: W(x)1 ─────────────────────────▶
P2: ───── R(x)1 ── W(x)2 ─────────▶  (W(x)2 인과적으로 W(x)1에 의존)
P3: ───────────────── R(x)2 ─ R(x)1 ▶  ✓ (인과 관계 유지)
P4: ───────────────── R(x)1 ─ R(x)2 ▶  ✓ (동시 쓰기는 순서 자유)
```

### 최종 일관성 (Eventual Consistency)

**업데이트가 멈추면** 결국 모든 복제본이 동일해진다.

```
시간 흐름:
t1: 쓰기 발생
    Replica A: [v2]
    Replica B: [v1]  (아직 전파 안 됨)
    Replica C: [v1]

t2: 전파 중
    Replica A: [v2]
    Replica B: [v2]  (전파됨)
    Replica C: [v1]  (아직)

t3: 전파 완료 (최종 수렴)
    Replica A: [v2]
    Replica B: [v2]
    Replica C: [v2]
```

**실용적 선택**: DNS, CDN, NoSQL (Cassandra, DynamoDB).

---

## 클라이언트 중심 일관성 모델

**클라이언트 관점**에서 정의. 같은 클라이언트가 보는 일관성.

### 단조 읽기 (Monotonic Reads)

한 번 본 값보다 **오래된 값은 안 본다**.

```
허용:
Client: R(x)1 ──────── R(x)2 ─────▶  (1→2, OK)

금지:
Client: R(x)2 ──────── R(x)1 ─────▶  (2→1, 금지)
        ↑새값         ↑구값
```

**예**: 이메일 읽기 — 한 번 본 메일이 사라지면 안 됨.

### 단조 쓰기 (Monotonic Writes)

쓰기가 **순서대로 전파**.

```
허용:
Client: W(x)1 ──────── W(x)2 ─────▶
전파:    x=1 먼저 ──── x=2 나중

금지:
전파:    x=2 먼저 ──── x=1 나중  (순서 역전)
```

**예**: 비밀번호 변경 — 이전 비밀번호가 나중에 덮어쓰면 안 됨.

### 자기 쓰기 읽기 (Read Your Writes)

자신이 **쓴 값을 즉시 읽을 수 있다**.

```
허용:
Client: W(x)1 ──────── R(x)1 ─────▶  (자기가 쓴 거 읽음)

금지:
Client: W(x)1 ──────── R(x)0 ─────▶  (이전 값 읽음)
        ↑썼는데        ↑안 보임
```

**예**: 게시글 작성 후 즉시 확인.

### 자기 읽기 후 쓰기 (Writes Follow Reads)

읽은 값에 **의존하는 쓰기**가 순서대로 전파.

```
허용:
Client: R(x)1 ──────── W(y)2 ─────▶
전파:   x=1이 y=2보다 먼저 보장

의미: y=2가 보이면 x=1도 이미 보여야 함
```

**예**: 댓글 — 원글을 읽고 댓글을 달면, 댓글이 보이면 원글도 보여야 함.

---

## CAP 정리

**분산 시스템의 근본적 트레이드오프**.

```
세 속성 중 두 가지만 동시에 만족 가능:

    C (Consistency)
         ╱╲
        ╱  ╲
       ╱    ╲
      ╱  CA  ╲  ← 단일 노드 (분산 아님)
     ╱────────╲
    ╱          ╲
   A ──── CP ───── P
     ╲          ╱
      ╲   AP   ╱
       ╲      ╱
        ╲    ╱
         ╲  ╱
          ╲╱

C: Consistency (일관성)
A: Availability (가용성)
P: Partition Tolerance (분할 허용)
```

**분할 (Partition)**: 네트워크가 끊어져 노드들이 통신 불가.

| 선택 | 설명 | 예 |
|------|------|-----|
| **CP** | 분할 시 일관성 유지, 가용성 포기 | 분산 락, ZooKeeper |
| **AP** | 분할 시 가용성 유지, 일관성 포기 | DNS, Cassandra |
| **CA** | 분할 없음 가정 | 단일 노드 DB |

**현실**: 네트워크 분할은 **반드시 발생**. CP 또는 AP 선택 필수.

### PACELC

CAP의 확장. 분할이 **없을 때도** 트레이드오프 존재.

```
if Partition:
    choose A or C
else (no partition):
    choose L (Latency) or C (Consistency)

PA/EL: 분할 시 가용성, 평상시 지연 최적화 (Cassandra)
PC/EC: 분할 시 일관성, 평상시도 일관성 (ZooKeeper)
PA/EC: 분할 시 가용성, 평상시 일관성 (섞인 시스템)
```

---

## 복제 관리

### 복제본 서버 배치

**어디에** 복제본을 둘 것인가?

```
고려 요소:
1. 지리적 분산 — 사용자 가까이
2. 읽기/쓰기 패턴 — 읽기 많으면 복제본 많이
3. 네트워크 토폴로지 — 지연 최소화
4. 비용 — 서버, 네트워크 비용

전략:
- 고정 배치: 미리 정해진 위치
- 동적 배치: 부하에 따라 이동/추가
```

### 콘텐츠 복제 및 배치

**영구 복제본 (Permanent Replicas)**:

```
- 초기 배치된 고정 복제본
- 예: 원본 서버 + 미러 사이트
```

**서버 초기화 복제본 (Server-Initiated Replicas)**:

```
- 서버가 부하에 따라 동적으로 생성/삭제
- 예: CDN 엣지 캐시
```

**클라이언트 초기화 복제본 (Client-Initiated Replicas)**:

```
- 클라이언트 캐시
- 예: 브라우저 캐시, 로컬 캐시
```

---

## 일관성 프로토콜

### 프라이머리 기반 프로토콜

**하나의 프라이머리**가 쓰기 담당.

**원격 쓰기 (Remote-Write)**:

```
Client → Primary: 쓰기 요청
Primary: 로컬 업데이트
Primary → Backups: 전파
Backups: 업데이트, ACK
Primary → Client: 완료

┌────────┐
│ Client │
└───┬────┘
    │ W(x)
    ▼
┌────────┐     전파      ┌────────┐
│Primary │ ────────────▶ │ Backup │
│   x    │ ◀── ACK ───── │   x    │
└────────┘               └────────┘
```

**로컬 쓰기 (Local-Write / 프라이머리 이동)**:

```
쓰기 요청 시 프라이머리를 클라이언트 가까이로 이동

장점: 로컬 쓰기 지연 감소
단점: 프라이머리 이동 오버헤드
```

### 복제된 쓰기 프로토콜

**여러 복제본에서 쓰기 허용**.

**활성 복제 (Active Replication)**:

```
Client → 모든 Replicas: 같은 연산 브로드캐스트
각 Replica: 동일 순서로 실행 (전순서 멀티캐스트)

요구사항: 결정적 연산, 전순서 멀티캐스트

┌────────┐
│ Client │
└───┬────┘
    │ 브로드캐스트
    ├─────────────────┐
    ▼                 ▼
┌────────┐       ┌────────┐
│Replica │       │Replica │
│   A    │       │   B    │
└────────┘       └────────┘
    │                 │
    └── 같은 순서로 실행 ──┘
```

**쿼럼 기반 프로토콜**:

```
N개 복제본, 쓰기 쿼럼 W, 읽기 쿼럼 R

조건:
- W + R > N  (읽기가 최신 쓰기 하나 이상 만남)
- W > N/2   (쓰기 충돌 방지)

예: N=5, W=3, R=3
   쓰기 시: 3개 이상에 성공
   읽기 시: 3개 이상에서 읽고 최신 선택

┌──────┐
│ N=5  │  R1  R2  R3  R4  R5
└──────┘   ✓   ✓   ✓   ─   ─   (W=3)
           ─   ─   ✓   ✓   ✓   (R=3)
                   ↑ 겹침
```

**Paxos / Raft**:

```
합의 알고리즘 — 다수가 동의해야 값 확정

Paxos 단계:
1. Prepare: 제안 번호 획득
2. Promise: 다수가 약속
3. Accept: 값 제안
4. Accepted: 다수가 수락

Raft: Paxos의 이해하기 쉬운 버전
- Leader Election
- Log Replication
- Safety
```

---

## 정리

- **복제 이유**: 성능, 가용성, 확장성
- **데이터 중심 일관성**: 순차, 인과, 최종 일관성
- **클라이언트 중심 일관성**: 단조 읽기/쓰기, 자기 쓰기 읽기
- **CAP**: 분할 시 일관성 or 가용성 선택
- **프로토콜**: 프라이머리 기반, 활성 복제, 쿼럼

---

## 핵심 비교

| 일관성 모델 | 강도 | 적합한 경우 |
|-------------|------|-------------|
| 엄격 일관성 | 최강 | (분산에서 불가능) |
| 순차 일관성 | 강함 | 금융, 예약 |
| 인과 일관성 | 중간 | 소셜 미디어, 채팅 |
| 최종 일관성 | 약함 | DNS, CDN, 캐시 |

| 프로토콜 | 쓰기 노드 | 복잡도 | 일관성 |
|----------|----------|--------|--------|
| 프라이머리 기반 | 1개 | 낮음 | 강함 |
| 활성 복제 | N개 | 높음 | 강함 |
| 쿼럼 기반 | W개 | 중간 | 조정 가능 |

---

## 관련 항목

- [Ch 6: Coordination](/blog/parallel/distributed-systems-tanenbaum/chapter06-coordination) — 조정
- [Ch 8: Fault Tolerance](/blog/parallel/distributed-systems-tanenbaum/chapter08-fault-tolerance) — 장애 허용
- [DDIA Ch 5: Replication](/blog/parallel/designing-data-intensive-applications/chapter05-replication) — 복제 상세
- [DDIA Ch 9: Consistency and Consensus](/blog/parallel/designing-data-intensive-applications/chapter09-consistency-and-consensus) — 합의
