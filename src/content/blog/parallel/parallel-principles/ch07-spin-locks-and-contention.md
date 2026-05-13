---
title: "Chapter 7: 스핀 락과 경합"
date: 2026-05-12
description: "스핀 락의 설계 — TAS, TTAS, exponential backoff, queue locks (Anderson, CLH, MCS)."
series: "The Art of Multiprocessor Programming"
seriesOrder: 7
tags: [parallel, concurrency, book-review, amp, spinlock, mcs, clh, cache]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
---

> **The Art of Multiprocessor Programming** Chapter 7 요약

## 7.1 왜 스핀 락인가

뮤텍스 / 세마포어는 OS의 도움을 받는다. 락을 못 잡으면 OS가 스레드를 재운다 (block). 깨우는 데 컨텍스트 스위치 비용이 든다.

**스핀 락**(spin lock)은 OS를 안 부른다. 락을 못 잡으면 그냥 **반복해서 시도**한다.

```python
class SpinLock:
    def acquire():
        while not tryLock(): pass  # 계속 시도
    
    def release():
        unlock()
    
    def tryLock(): ...
```

**언제 스핀 락이 좋은가**:
- 락 보유 시간이 매우 짧을 때 (수 µs 이하)
- 컨텍스트 스위치 비용이 클 때
- 멀티코어 (싱글 코어에서는 의미 없음)

**언제 안 좋은가**:
- 락 보유 시간이 길 때
- 스레드 수 ≥ 코어 수일 때
- 우선순위 역전 가능 시스템

## 7.2 가장 단순한 스핀 락 — TAS Lock

```python
class TASLock:
    state: AtomicBool
    
    def acquire():
        while state.testAndSet():
            pass  # busy-wait
    
    def release():
        state = false
```

**문제** — 모든 스레드가 같은 변수에 대해 testAndSet을 반복한다.

- testAndSet은 **write** 연산 (보통)
- 매 testAndSet마다 **캐시 무효화** (다른 코어의 cache line invalidation)
- 캐시 라인이 코어 사이를 핑퐁한다 (cache line bouncing)
- 결과: 락이 풀려 있을 때조차 성능 저하

## 7.3 TTAS Lock — 캐시 친화적

```python
class TTASLock:
    state: AtomicBool
    
    def acquire():
        while True:
            while state.read():  # 먼저 그냥 읽기 (cache에서)
                pass
            if not state.testAndSet():
                return
    
    def release():
        state = false
```

**Test-and-test-and-set**.

먼저 **read**만 한다 — 캐시에서 읽으므로 다른 코어에 영향 없음. 락이 풀린 것 같으면 그때 testAndSet 시도.

```
TAS:  매 시도마다 write → cache invalidation
TTAS: read만 반복 → cache hit
       풀려야 testAndSet → write 한 번만
```

성능이 크게 개선된다. 다만 락이 풀린 직후엔 여전히 모두가 동시에 testAndSet을 시도해 경합 발생.

## 7.4 Exponential Backoff

경합이 심하면 — **기다린다**.

```python
class BackoffLock:
    state: AtomicBool
    
    def acquire():
        backoff_ms = 1
        while True:
            while state.read(): pass
            if not state.testAndSet():
                return
            sleep_us(random(0, backoff_ms))
            backoff_ms = min(backoff_ms * 2, MAX)
```

매번 락 획득 실패하면 대기 시간을 늘린다 (지수적). 경합이 심할수록 더 오래 기다리고, 경합이 줄어들면 다시 짧아진다.

TCP의 혼잡 제어와 비슷한 아이디어.

**한계** — 여전히 모든 스레드가 같은 변수를 본다. 폭발적 경합에는 한계.

## 7.5 Queue Locks — 공정한 락

지금까지의 락은 **공정하지 않다**. 다른 스레드가 우연히 먼저 락을 잡을 수 있고, 어떤 스레드는 영원히 못 잡을 수도 있다 (starvation).

**Queue Lock**은 대기 순서를 큐로 관리한다.

- 락을 원하는 스레드는 큐에 등록
- 큐의 앞부터 순서대로 락 획득
- FIFO 공정성

세 가지 유명한 queue lock — Anderson, CLH, MCS.

## 7.6 Anderson Queue Lock

```python
class AndersonLock:
    flags: AtomicArray of bool  # 각 슬롯
    tail: AtomicInt = 0
    my_slot: ThreadLocal of int
    
    def init():
        flags[0] = true  # 첫 슬롯은 락 보유
        flags[1..] = false
    
    def acquire():
        slot = (tail.getAndIncrement()) % size
        my_slot = slot
        while not flags[slot]: pass  # 내 슬롯이 true 될 때까지
    
    def release():
        flags[my_slot] = false       # 내 슬롯 해제
        flags[(my_slot + 1) % size] = true  # 다음 슬롯 신호
```

각 스레드가 **자기 슬롯**을 본다. 다른 스레드의 슬롯과 캐시 라인 분리하면 false sharing 없음.

**문제** — 슬롯 수 = 스레드 수만큼 필요. 메모리 비용.

## 7.7 CLH Lock

```python
class QNode:
    locked: AtomicBool

class CLHLock:
    tail: AtomicRef of QNode
    my_node: ThreadLocal of QNode
    my_pred: ThreadLocal of QNode
    
    def acquire():
        my_node.locked = true
        my_pred = tail.getAndSet(my_node)  # 큐 끝에 추가
        while my_pred.locked: pass         # 선임자가 풀 때까지 대기
    
    def release():
        my_node.locked = false   # 후임자에게 신호
        my_node = my_pred         # 노드 재사용 (가비지 회피)
```

각 스레드가 **선임자의 노드**를 본다. 노드는 캐시 라인 단위로 정렬되어 false sharing 없음.

**장점** — 메모리 O(N + L), 매우 효율적.
**단점** — NUMA 시스템에서 선임자 노드가 다른 메모리 노드에 있을 수 있음.

## 7.8 MCS Lock

```python
class QNode:
    locked: AtomicBool
    next: AtomicRef of QNode

class MCSLock:
    tail: AtomicRef of QNode
    my_node: ThreadLocal of QNode
    
    def acquire():
        my_node.locked = true
        my_node.next = null
        pred = tail.getAndSet(my_node)
        if pred is not null:
            pred.next = my_node       # 큐 연결
            while my_node.locked: pass  # 내 노드 대기
    
    def release():
        if my_node.next is null:
            if tail.cas(my_node, null):
                return  # 후임자 없음
            while my_node.next is null: pass  # 후임자가 연결 중
        my_node.next.locked = false  # 후임자 깨움
```

각 스레드가 **자기 노드**를 본다 — 진정으로 local. NUMA 친화적.

**장점** — NUMA에서도 좋음, 진정한 local spin.
**단점** — release가 복잡 (next 포인터 동기화 필요).

CLH와 MCS는 실전에서 가장 자주 보이는 queue lock.

## 7.9 비교

| 락 | 경합 시 캐시 트래픽 | 공정성 | 메모리 | NUMA |
|---|---|---|---|---|
| TAS | 매우 높음 | 없음 | 1 단어 | 나쁨 |
| TTAS | 중간 | 없음 | 1 단어 | 나쁨 |
| Backoff TTAS | 낮음 | 없음 | 1 단어 | 나쁨 |
| Anderson | 매우 낮음 | FIFO | O(L × N) | 보통 |
| CLH | 매우 낮음 | FIFO | O(N + L) | 보통 |
| MCS | 매우 낮음 | FIFO | O(N + L) | 좋음 |

L = 스레드 수, N = 락의 개수.

## 7.10 실제 OS의 락

Linux 커널 / glibc의 락은 더 복잡하다.

- **Adaptive Mutex** — 짧게 스핀하다가 실패하면 sleep
- **Futex** — 빠른 경로 (atomic) + 느린 경로 (kernel)
- **Hierarchical Lock** — NUMA 토폴로지를 고려

이 챕터의 알고리즘들이 그 토대가 된다.

## 정리

- **스핀 락**은 짧은 락 보유 + 멀티 코어에서 효율적
- **TAS** — 단순하지만 캐시 트래픽 폭발
- **TTAS** — read만 반복 후 testAndSet, 캐시 친화적
- **Exponential Backoff** — 경합 심할 때 대기
- **Queue Lock** — 공정성 + 로컬 스핀 (Anderson / CLH / MCS)
- 실전에서는 CLH / MCS가 가장 인기

## 다음 장 예고

다음 장은 **Monitors와 Blocking Synchronization** — 스핀이 아닌 OS 도움 받는 동기화.

## 관련 항목

- [Ch 6: Consensus](/blog/parallel/parallel-principles/ch06-universality-of-consensus)
- [C++ Concurrency in Action Ch 3: Sharing Data](/blog/parallel/cpp-concurrency-in-action/chapter03-sharing-data-between-threads)
