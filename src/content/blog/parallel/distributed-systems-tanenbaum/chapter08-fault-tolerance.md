---
title: "Ch 8: Fault Tolerance"
date: 2025-05-20T08:00:00
description: "장애 유형, 프로세스 복원, 신뢰성 있는 통신, 분산 커밋, 복구"
series: "Distributed Systems"
seriesOrder: 8
tags: [distributed-systems, fault-tolerance, 2pc, 3pc, paxos, raft]
draft: true
type: book-review
bookTitle: "Distributed Systems: Principles and Paradigms"
bookAuthor: "Maarten van Steen, Andrew S. Tanenbaum"
---

## 장애 유형

분산 시스템은 **부분 장애**가 핵심 도전.

### 장애 분류

```
장애 스펙트럼 (심각도 순):

┌─────────────────────────────────────────────┐
│  Crash-stop   │ 크래시 후 영원히 멈춤       │ 가장 단순
├───────────────┼─────────────────────────────┤
│  Crash-recovery │ 크래시 후 재시작 가능     │
├───────────────┼─────────────────────────────┤
│  Omission     │ 메시지 누락 (송/수신)       │
├───────────────┼─────────────────────────────┤
│  Timing       │ 응답이 너무 늦음            │
├───────────────┼─────────────────────────────┤
│  Byzantine    │ 임의의 잘못된 동작          │ 가장 어려움
└─────────────────────────────────────────────┘
```

### 크래시 장애 (Crash Failure)

```
프로세스가 멈추고 다시는 동작 안 함

특징:
- 감지 가능 (타임아웃)
- fail-stop: 다른 프로세스가 감지 가능
- fail-silent: 감지 불가능 (더 어려움)
```

### 누락 장애 (Omission Failure)

```
메시지가 손실됨

송신 누락: 프로세스가 메시지 전송 실패
수신 누락: 프로세스가 메시지 수신 실패
채널 누락: 네트워크가 메시지 손실

A ──msg──▷ ╳ (네트워크) ──▷ B
           ↑ 손실
```

### 타이밍 장애 (Timing Failure)

```
응답이 시간 제한을 초과

동기 시스템: 시간 보장 → 타이밍 장애 감지 가능
비동기 시스템: 시간 보장 없음 → 구분 불가

문제:
- 느린 응답 vs 장애?
- 타임아웃을 얼마로 설정?
```

### 비잔틴 장애 (Byzantine Failure)

```
임의의 잘못된 동작 — 악의적이거나 버그

예:
- 잘못된 값 반환
- 다른 노드에 다른 값 전송
- 프로토콜 위반

    ┌─────┐
    │ P1  │ "값은 5"
    └──┬──┘
       │ "값은 7" (거짓말)
       ▼
    ┌─────┐
    │ P2  │ "뭐가 진짜?"
    └─────┘

비잔틴 장군 문제: N개 노드 중 f개 비잔틴
→ N ≥ 3f + 1 필요
```

---

## 프로세스 복원

장애 발생 시에도 **서비스 계속 제공**.

### 복제를 통한 복원

**k개 장애 허용** → 최소 **k+1개 복제본** (비잔틴 아닌 경우).

```
크래시 장애:
- k개 장애 허용 → k+1개 복제본
- 하나가 살아있으면 서비스 가능

비잔틴 장애:
- k개 장애 허용 → 3k+1개 복제본
- 2/3 이상이 정직해야 다수결 가능
```

### 합의와 관련 문제

**합의 (Consensus)**: 모든 정상 프로세스가 같은 값에 동의.

```
합의 문제:
- N개 프로세스
- 각자 초기값 제안
- 모든 정상 프로세스가 같은 값 결정

요구사항:
1. 종료 (Termination): 결국 결정
2. 합의 (Agreement): 모든 정상 프로세스가 같은 값
3. 무결성 (Integrity): 결정된 값은 누군가 제안한 것
```

**FLP 불가능성**:

```
비동기 시스템에서 하나의 크래시 장애만 있어도
결정적 합의 알고리즘 불가능

현실적 해결:
- 타임아웃 (동기 가정)
- 확률적 알고리즘
- 장애 감지기 (불완전하더라도)
```

### 장애 감지

**완벽한 장애 감지는 불가능** (비동기 시스템에서).

```
하트비트 기반:
P1 ──heartbeat──▶ P2
P1 ──heartbeat──▶ P2
P1      ╳        (타임아웃)
                  P2: "P1 장애?"

문제:
- 느린 네트워크 vs 장애?
- 너무 짧은 타임아웃 → 오탐
- 너무 긴 타임아웃 → 늦은 감지
```

**장애 감지기 속성**:

| 속성 | 설명 |
|------|------|
| **완전성 (Completeness)** | 모든 장애가 결국 감지됨 |
| **정확성 (Accuracy)** | 정상 프로세스를 장애로 오판 안 함 |

실제로는 **불완전한 감지기** 사용 — 결국 정확 (eventually accurate).

---

## 신뢰성 있는 통신

### 포인트-투-포인트 통신

**TCP가 제공하는 것**:

```
- 순서 보장 (패킷 재정렬)
- 중복 제거
- 손실 복구 (재전송)

TCP가 보장 안 하는 것:
- 연결 끊김 시 메시지 전달 여부
- 프로세스 크래시 vs 네트워크 장애 구분
```

### 그룹 통신

**멀티캐스트의 신뢰성 단계**:

```
1. 기본 멀티캐스트 (Best-effort):
   - 일부만 수신해도 OK

2. 신뢰할 수 있는 멀티캐스트 (Reliable):
   - 정상 프로세스 모두 수신 또는 모두 미수신

3. 전순서 멀티캐스트 (Totally Ordered):
   - 모든 프로세스가 같은 순서로 수신
```

**신뢰할 수 있는 멀티캐스트 구현**:

```
1. ACK 기반:
   Sender → Group: msg
   각 Receiver → Sender: ACK
   Sender: 누락 시 재전송

2. 가십 기반:
   Sender → 일부: msg
   수신자 → 랜덤 피어: msg 전파
   결국 모두 수신 (높은 확률)
```

**전순서 멀티캐스트**:

```
시퀀서 기반:
1. Sender → Sequencer: msg
2. Sequencer: 순서 번호 부여, 브로드캐스트
3. Receivers: 순서 번호 순으로 처리

Lamport 타임스탬프 기반:
1. Sender: Lamport 타임스탬프 포함 브로드캐스트
2. Receivers: 버퍼에 저장, 모든 프로세스에서 ACK 받으면 처리
3. 처리 순서: Lamport 타임스탬프 순
```

---

## 분산 커밋

**모든 참가자가 같은 결정**에 도달해야 함 (커밋 또는 중단).

### 2단계 커밋 (2PC)

가장 널리 쓰이는 **원자적 커밋 프로토콜**.

```
1단계 (Prepare/Vote):
Coordinator → Participants: "커밋 가능?"
Participants → Coordinator: VOTE_COMMIT 또는 VOTE_ABORT

2단계 (Commit/Abort):
모든 VOTE_COMMIT → Coordinator → All: GLOBAL_COMMIT
하나라도 ABORT → Coordinator → All: GLOBAL_ABORT
```

```
성공 시나리오:
Coordinator         Participant A       Participant B
    │                    │                    │
    │──PREPARE─────────▶ │                    │
    │──PREPARE───────────────────────────────▶│
    │                    │                    │
    │◀──VOTE_COMMIT──────│                    │
    │◀──VOTE_COMMIT──────────────────────────│
    │                    │                    │
    │──GLOBAL_COMMIT───▶ │                    │
    │──GLOBAL_COMMIT─────────────────────────▶│
    │                    │                    │
```

**2PC의 문제 — 블로킹**:

```
코디네이터 장애 시:
1. 참가자가 VOTE_COMMIT 보낸 후
2. 코디네이터 크래시
3. 참가자는 결정 대기 (블록됨)
4. 다른 참가자와 통신해도 결정 불가
   (누군가 ABORT 받았을 수도, 아닐 수도)

         ┌───────────┐
         │Coordinator│ ╳ (크래시)
         └───────────┘
              ▲
    VOTE_COMMIT 보냄
              │
         ┌────┴────┐
         │Participant│ "커밋? 중단? 모름..."
         │ (블록됨)  │
         └─────────┘
```

### 3단계 커밋 (3PC)

**블로킹 방지** 시도.

```
1단계 (CanCommit):
Coordinator → Participants: "커밋 가능?"
Participants → Coordinator: YES 또는 NO

2단계 (PreCommit):
모든 YES → Coordinator → All: PRECOMMIT
참가자: PRECOMMIT 받으면 "커밋 예정" 상태

3단계 (DoCommit):
모든 ACK → Coordinator → All: DOCOMMIT

          Can      Pre      Do
           │        │        │
Coord ─────┼────────┼────────┼─────▶
           │        │        │
Part  ─────┴────────┴────────┴─────▶
         Ready   Prepared  Committed
```

**3PC의 장점**:

```
코디네이터 장애 시:
- PRECOMMIT 받은 참가자가 있으면 → 커밋 결정 가능
- 아무도 PRECOMMIT 안 받았으면 → 중단 결정 가능

블로킹 구간이 더 짧음
```

**3PC의 한계**:

```
네트워크 분할 시 문제:
- 분할된 양쪽이 다른 결정 가능
- 여전히 완벽하지 않음
```

### Paxos

**합의 기반 커밋** — 가장 견고.

```
역할:
- Proposer: 값 제안
- Acceptor: 값 수락/거부
- Learner: 결정된 값 학습

2단계:
1. Prepare: 제안 번호 n으로 준비 요청
2. Promise: 다수가 n보다 높은 거 안 받겠다 약속
3. Accept: 값 v를 번호 n으로 제안
4. Accepted: 다수가 수락 → 값 결정
```

```
Proposer        Acceptors (3개)        Learners
    │               │ │ │               │
    │──prepare(n)──▶│ │ │               │
    │──prepare(n)───▶│ │               │
    │──prepare(n)────▶│               │
    │               │ │ │               │
    │◀──promise─────│ │ │               │
    │◀──promise──────│ │               │
    │              (다수 약속)           │
    │               │ │ │               │
    │──accept(n,v)─▶│ │ │               │
    │──accept(n,v)──▶│ │               │
    │──accept(n,v)───▶│               │
    │               │ │ │               │
    │◀──accepted────│ │ │               │
    │◀──accepted─────│ │               │
    │              (다수 수락)           │
    │               │ │ │               │
    │               │──learned(v)──────▶│
```

**Paxos의 특징**:

| 속성 | 설명 |
|------|------|
| 안전성 (Safety) | 잘못된 값 결정 안 함 |
| 활동성 (Liveness) | 결국 결정 (충돌 적으면) |
| 장애 허용 | 다수 살아있으면 진행 |

### Raft

**이해하기 쉬운 합의** — Paxos의 대안.

```
핵심 개념:
1. Leader Election: 리더 선출
2. Log Replication: 로그 복제
3. Safety: 안전성 보장

상태:
- Leader: 모든 클라이언트 요청 처리
- Follower: 리더의 복제 수락
- Candidate: 선거 중

    ┌──────────┐
    │ Follower │
    └────┬─────┘
         │ 타임아웃
         ▼
    ┌──────────┐
    │Candidate │
    └────┬─────┘
         │ 다수 투표
         ▼
    ┌──────────┐
    │  Leader  │
    └──────────┘
```

---

## 복구

장애 후 **상태 복원**.

### 체크포인트 (Checkpointing)

**주기적으로 상태 저장**.

```
독립 체크포인트:
각 프로세스가 독립적으로 저장

문제: 도미노 효과
P1: ──●───●───●───╳ (장애)
P2: ────●───●───●──
     ↑ 롤백 시 연쇄 롤백
```

**협조 체크포인트**:

```
모든 프로세스가 동시에 체크포인트

장점: 일관된 글로벌 상태
단점: 동기화 오버헤드
```

### 메시지 로깅

체크포인트 + **메시지 로그** 조합.

```
복구 시:
1. 마지막 체크포인트로 롤백
2. 로그된 메시지 재생
3. 최신 상태 복원

┌─────────────────────────────────────┐
│ Checkpoint │ Msg1 │ Msg2 │ ... │ ╳ │
└─────────────────────────────────────┘
      ↑                           ↑
   복원 시작                     장애
```

**로깅 방식**:

| 방식 | 설명 | 특징 |
|------|------|------|
| **비관적** | 메시지마다 즉시 로그 | 안전, 느림 |
| **낙관적** | 버퍼링 후 배치 로그 | 빠름, 복잡한 복구 |
| **인과적** | 인과 관계만 로그 | 중간 |

---

## 정리

- **장애 유형**: 크래시, 누락, 타이밍, 비잔틴
- **복제**: 크래시 k개 허용 → k+1개, 비잔틴 → 3k+1개
- **합의**: FLP 불가능성, Paxos/Raft
- **2PC**: 원자적 커밋, 블로킹 문제
- **3PC**: 블로킹 감소, 분할 문제
- **복구**: 체크포인트 + 메시지 로깅

---

## 핵심 비교

| 장애 유형 | 감지 가능 | 허용에 필요한 복제본 |
|----------|----------|-------------------|
| 크래시 | 타임아웃 | k+1 |
| 누락 | 재전송 실패 | k+1 |
| 비잔틴 | 투표 | 3k+1 |

| 커밋 프로토콜 | 라운드 | 블로킹 | 분할 허용 |
|--------------|--------|--------|----------|
| 2PC | 2 | O | X |
| 3PC | 3 | △ | X |
| Paxos | 2+ | X | O (다수) |

---

## 관련 항목

- [Ch 7: Consistency and Replication](/blog/parallel/distributed-systems-tanenbaum/chapter07-consistency-replication) — 일관성
- [Ch 9: Security](/blog/parallel/distributed-systems-tanenbaum/chapter09-security) — 보안
- [AMP Ch 5: The Relative Power of Primitive Synchronization Operations](/blog/parallel/parallel-principles/ch05-relative-power) — 합의 수
- [DDIA Ch 9: Consistency and Consensus](/blog/parallel/designing-data-intensive-applications/chapter09-consistency-and-consensus) — 합의 상세
