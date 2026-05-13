---
title: "Chapter 10: Concurrent Queue와 ABA 문제"
date: 2026-05-12
description: "Michael-Scott Lock-Free Queue. ABA 문제와 그 해법 — version counter, hazard pointer, epoch."
series: "The Art of Multiprocessor Programming"
seriesOrder: 10
tags: [parallel, concurrency, book-review, amp, queue, michael-scott, aba, hazard-pointer]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 10 요약

## 10.1 Queue의 동시성 도전

Queue는 두 끝(head, tail)에서 동시 작업이 일어난다. enqueue는 tail, dequeue는 head.

![동시 큐 구조](/images/blog/parallel/diagrams/concurrent-queue.svg)

좋은 디자인 — **dequeue와 enqueue가 서로 안 막아야** 한다. 락을 두 개 따로 잡으면 가능.

## 10.2 Two-Lock Queue

```python
class TwoLockQueue<T>:
    head: Node
    tail: Node
    headLock: Lock
    tailLock: Lock
    
    def enqueue(item):
        newNode = Node(item)
        tailLock.acquire()
        tail.next = newNode
        tail = newNode
        tailLock.release()
    
    def dequeue():
        headLock.acquire()
        if head.next is null:
            headLock.release()
            return null
        item = head.next.item
        head = head.next
        headLock.release()
        return item
```

**Sentinel node** 트릭 — `head`는 항상 dummy를 가리킨다. `head.next`가 실제 첫 항목. 이게 enqueue/dequeue를 분리하기 쉽게 한다.

## 10.3 Michael-Scott Lock-Free Queue

가장 유명한 lock-free queue. 표준 라이브러리들이 자주 이 알고리즘 사용.

### Enqueue

```python
def enqueue(item):
    newNode = Node(item)
    while True:
        last = tail
        next = last.next
        if last == tail:                       # 일관성 확인
            if next is null:
                if last.next.cas(null, newNode):
                    tail.cas(last, newNode)    # tail 갱신 (실패해도 OK)
                    return
            else:
                tail.cas(last, next)            # 다른 스레드 도와줌
```

**핵심 아이디어**:

1. tail이 실제 마지막 노드를 가리키지 않을 수도 있다 (다른 스레드의 enqueue가 진행 중)
2. 그런 경우 도와준다 — tail을 다음 노드로 진행

이게 lock-free의 핵심 — **다른 스레드가 멈춰 있어도 진행 가능**.

### Dequeue

```python
def dequeue():
    while True:
        first = head
        last = tail
        next = first.next
        if first == head:
            if first == last:
                if next is null:
                    return null  # 비어 있음
                tail.cas(last, next)  # tail 늦음 — 도와줌
            else:
                value = next.item
                if head.cas(first, next):
                    return value
```

**역시 helping** — tail이 뒤처져 있으면 진행시켜 준다.

## 10.4 ABA 문제

Lock-free 자료구조의 악명 높은 함정.

```
시나리오:
1. 스레드 X: ptr 읽음 = A
2. 스레드 X: 잠시 멈춤 (interrupt)
3. 스레드 Y: pop(A), push(B), pop(B), push(A)
   → ptr이 다시 A지만, 내부 구조는 다름
4. 스레드 X: CAS(ptr, A, new) → 성공
   → 그러나 의도와 다른 결과
```

A → B → A로 돌아왔다. CAS는 단순히 "값이 같으면 성공"이므로 이 변화를 못 잡는다.

### 왜 위험한가

```
Lock-free stack:
1. X가 top 읽음 = A
2. Y가 pop(A) — A는 메모리 풀로
3. Y가 pop(B) — B도
4. Y가 push(A) — 재사용, 그러나 next 포인터가 다름
5. X가 CAS(top, A, ...) — 성공
6. → next 포인터가 잘못된 곳을 가리킴 → 메모리 손상
```

## 10.5 ABA 해법 — Version Counter

CAS의 대상에 **버전 카운터**를 추가.

```python
class CountedPtr:
    ptr: Pointer
    version: int

class Stack<T>:
    top: AtomicCountedPtr
    
    def push(item):
        newNode = Node(item)
        while True:
            old = top.read()
            newNode.next = old.ptr
            new = CountedPtr(newNode, old.version + 1)
            if top.cas(old, new):
                return
```

매 변경마다 version을 1씩 증가. ABA가 와도 version이 다르므로 CAS 실패.

**문제** — 64비트 atomic만 보장되는 시스템에서는 ptr (8 byte) + version (8 byte) = 16 byte의 atomic이 필요. **DCAS** (double CAS) 또는 128비트 atomic 필요.

x86-64는 `CMPXCHG16B` 명령어 제공. C++에서는 `std::atomic<__int128>`.

## 10.6 ABA 해법 — Hazard Pointer

Michael의 hazard pointer (2004) — 메모리 회수와 ABA를 함께 해결.

```python
class HazardPointer<T>:
    hp: thread_local Pointer  # 내가 지금 보는 포인터
    
    def access(ptr):
        while True:
            p = ptr.read()
            hp[me] = p          # 선언: "나 이거 보는 중"
            if p == ptr.read(): # 그 사이 변경 없음?
                return p
            # 변경됐음 — 다시
```

다른 스레드가 메모리를 회수하기 전에 hazard pointer를 검사한다 — 누군가 보고 있으면 회수 보류.

**장점**: 안전한 메모리 회수 + ABA 회피.
**단점**: 매번 hazard pointer 갱신 비용.

## 10.7 ABA 해법 — Epoch-Based Reclamation

각 스레드가 **epoch**을 가진다. 글로벌 epoch과 비교해 안전한 회수 시점 결정.

```
모든 스레드가 epoch N에 있을 때:
  epoch N-1에서 unlink된 노드는 안전하게 회수
```

**장점**: hazard pointer보다 비용 적음 (per-thread epoch만 관리).
**단점**: 한 스레드가 epoch을 안 진행하면 모든 회수가 멈춤.

C++의 `crossbeam`, Rust의 `crossbeam-epoch`이 이 방식.

## 10.8 GC 언어의 이점

Java / C# / Go 같은 GC 언어는 **ABA가 자동으로 해결되는 경우가 많다**.

- ABA에서 A가 두 번 등장하려면 메모리 회수가 일어나야 함
- GC 언어는 "누가 보고 있는 동안"은 회수 안 함
- 그래서 ABA가 발생 안 함

C++은 수동 회수 — hazard pointer / epoch / version counter 필요.

이게 lock-free 알고리즘 구현이 C++에서 특히 어려운 이유 중 하나.

## 10.9 실용적 권장

| 상황 | 추천 |
|---|---|
| 짧은 임계 영역, 코어 ≈ 스레드 | Spin lock |
| 긴 임계 영역 | Mutex / condition variable |
| 단순 컨테이너 | Two-Lock Queue (락 두 개) |
| 고성능 lock-free | folly::MPMCQueue, moodycamel::ConcurrentQueue |
| 표준 | std::mutex + std::queue |

직접 lock-free queue를 짜는 것은 거의 항상 잘못이다. **검증된 라이브러리**를 쓴다.

## 정리

- Queue 동시성은 **두 끝(head/tail) 분리**가 핵심
- **Two-Lock Queue**가 가장 단순한 동시 구현
- **Michael-Scott**가 lock-free queue의 표준
- **ABA 문제** — 같은 값이지만 다른 의미
- ABA 해법 — version counter, hazard pointer, epoch
- GC 언어가 lock-free 구현에 유리
- 실용적으로는 **검증된 라이브러리** 사용

## 다음 장 예고

다음 장은 **Concurrent Stack과 Elimination** — Stack의 lock-free 디자인.

## 관련 항목

- [Ch 9: Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists-the-role-of-locking)
- [C++ Concurrency in Action Ch 7: Lock-free](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
