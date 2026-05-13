---
title: "Chapter 12: Counting, Sorting, Distributed Coordination"
date: 2026-05-12
description: "Counting Network, Bitonic Sorting Network. Combining Tree로 카운터 경합 분산."
series: "The Art of Multiprocessor Programming"
seriesOrder: 12
tags: [parallel, concurrency, book-review, amp, counting-network, combining-tree]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
---

> **The Art of Multiprocessor Programming** Chapter 12 요약

## 12.1 카운터의 동시성 문제

가장 단순한 자료구조 — 카운터.

```python
def increment():
    counter.atomicAdd(1)
```

수 천 스레드가 같은 카운터를 동시에 증가하면 — 모두가 같은 cache line을 경쟁한다. 11장의 stack과 같은 문제.

해법은 **경합을 분산**하는 것.

## 12.2 Combining Tree

여러 스레드의 증가를 트리로 **합쳐서** 처리.

```
스레드들의 증가:
  T1: +1, T2: +1, T3: +1, T4: +1
       │       │       │       │
       └───┬───┘       └───┬───┘
           │ +2             │ +2
           └───────┬────────┘
                   │ +4
                CENTRAL COUNTER
```

리프에서 시작해 트리를 올라가면서 증가량을 합친다. 루트에서는 한 번의 atomic 증가만.

**장점**: 루트의 경합이 O(N)에서 O(1)로.
**단점**: 트리 순회 비용. 그리고 각 노드도 동기화 필요.

## 12.3 Counting Network

더 강력한 아이디어 — **counting network**.

```
           ┌── balancer ──┐
입력 N ────┤               ├──── 출력 (균등 분산)
           └── balancer ──┘
```

**Balancer** — 입력 두 개를 받아 두 개를 출력. 출력은 번갈아 교차.

```
balancer:
  in[0], in[1] → out[0], out[1]
  
  매번 호출:
    state = (state + 1) % 2
    return out[state]
```

이 balancer들을 트리로 엮으면 — N 입력이 N 출력으로 균등하게 분배된다. **counting** = 각 출력 라인의 호출 횟수가 거의 같음.

### Bitonic Counting Network

가장 유명한 counting network. Bitonic sorting network와 같은 구조.

```
8 입력 → 8 출력
깊이: O(log² N)
폭: N
```

## 12.4 왜 Network인가

카운터를 N개로 쪼개면 카운팅 자체는 빠르다. 그러나 **각 카운터의 인덱스 분배**가 새 문제.

Counting network는 그 분배를 **하드웨어 없이 분산적으로** 해결.

```
요청 → counting network → 카운터[i] 증가
              ↑
        각 카운터는 거의 같은 빈도로 증가
```

여러 카운터의 합 = 전체 카운트. 각 카운터의 경합은 N분의 1.

## 12.5 Sorting Network

Counting network와 같은 구조 — 다만 balancer 대신 **comparator**.

```
comparator:
  in[0], in[1] → out[0], out[1]
  out[0] = min(in[0], in[1])
  out[1] = max(in[0], in[1])
```

**Bitonic Sorting Network** — N 개의 값을 O(log² N) 깊이로 정렬.

```
입력: [3, 1, 4, 1, 5, 9, 2, 6]
출력: [1, 1, 2, 3, 4, 5, 6, 9]
```

CPU의 SIMD 명령어나 GPU에서 정렬을 구현할 때 자주 사용. 깊이가 작아서 병렬화에 유리.

## 12.6 Combining Tree vs Counting Network

| 측면 | Combining Tree | Counting Network |
|---|---|---|
| 깊이 | O(log N) | O(log² N) |
| 경합 | 트리 노드마다 | balancer마다 (적음) |
| 메모리 | O(N) | O(N log N) |
| 복잡도 | 보통 | 매우 복잡 |
| 실용성 | 가끔 사용 | 거의 안 사용 |

Counting network는 이론적으로 우아하지만 실용성은 제한적. Combining tree나 sharded counter가 더 흔히 쓰인다.

## 12.7 실용적 대안 — Sharded Counter

```python
class ShardedCounter:
    shards: AtomicLong[NUM_SHARDS]
    
    def increment():
        i = currentThreadId() % NUM_SHARDS
        shards[i].atomicAdd(1)
    
    def get():
        return sum(shards[i] for i in range(NUM_SHARDS))
```

각 스레드가 자기 샤드만 증가. 경합 분산.

- `NUM_SHARDS`를 코어 수에 맞춤
- 읽기는 모든 샤드 합산 (느림)
- 쓰기는 매우 빠름

`Striped64` (Java), `Cache::aligned_padded_t` (folly) 등이 비슷한 패턴.

## 12.8 분산 좌표 — 더 넓은 컨텍스트

이 챕터의 다른 메시지 — **카운팅 자체가 분산 좌표 문제**.

```
여러 스레드 → 각자 고유 번호 받고 싶음
```

이게 분산 ID 생성, 분산 트랜잭션의 타임스탬프, 분산 락의 토큰 같은 문제로 일반화된다.

- **Lamport Timestamp** — 인과 관계 보존하는 분산 카운터
- **Vector Clock** — 더 정밀한 인과 관계
- **Snowflake ID** — Twitter의 분산 ID 생성

이런 알고리즘들이 counting network의 분산 시스템 친척이다.

## 12.9 Lock-Free Counter

```python
class LockFreeCounter:
    value: AtomicLong
    
    def increment():
        while True:
            old = value.read()
            if value.cas(old, old + 1):
                return old + 1
```

단일 카운터의 lock-free 구현. 경합 시 매우 느림.

`fetch_and_add`가 있으면 한 명령으로:

```python
def increment():
    return value.fetchAndAdd(1) + 1
```

x86의 `LOCK XADD`. 매우 빠르지만 여전히 경합 심하면 한계.

## 정리

- 카운터의 경합 — 모든 스레드가 같은 cache line 경쟁
- **Combining Tree** — 트리로 증가량 합산, 루트 경합 O(1)
- **Counting Network** — balancer로 균등 분산
- **Sorting Network** — comparator로 정렬, GPU/SIMD에 유리
- 실용적으로는 **Sharded Counter**가 가장 단순하고 효과적
- 분산 좌표 문제 — Lamport timestamp, vector clock 등으로 일반화

## 다음 장 예고

다음 장은 **Concurrent Hashing** — 동시 해시 테이블의 설계.

## 관련 항목

- [Ch 11: Stack과 Elimination](/blog/parallel/parallel-principles/ch11-concurrent-stacks-and-elimination)
- [Ch 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention) — Anderson queue lock이 비슷한 구조
