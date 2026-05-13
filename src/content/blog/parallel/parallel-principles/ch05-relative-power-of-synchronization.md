---
title: "Chapter 5: 동기화 프리미티브의 상대적 능력"
date: 2026-05-12
description: "Consensus 문제로 동기화 도구의 위계를 정의한다. read/write는 0, FAA·test-and-set는 2, CAS는 무한대."
series: "The Art of Multiprocessor Programming"
seriesOrder: 5
tags: [parallel, concurrency, book-review, amp, consensus, cas]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 5 요약

## 5.1 왜 동기화의 "능력"인가

하드웨어가 제공하는 동기화 프리미티브는 다양하다.

- read / write (그냥 메모리)
- test-and-set
- fetch-and-add (FAA)
- compare-and-swap (CAS)
- load-link / store-conditional (LL/SC)

이 도구들은 모두 같은 능력을 가지는가? **아니다**. Herlihy의 충격적 결과는 이 도구들 사이에 **위계**가 존재한다는 것이다.

## 5.2 Consensus 문제

위계를 정의하는 도구는 **consensus**다.

**Consensus 문제**:
- N개의 스레드가 각자 입력값을 가진다
- 모두가 같은 출력값에 동의해야 한다
- 그 출력값은 누군가의 입력값이어야 한다
- **Wait-free**해야 한다

```
스레드 1: input = 5
스레드 2: input = 7
스레드 3: input = 9

→ 모두 같은 출력 (5 또는 7 또는 9 중 하나)
```

## 5.3 Consensus Number

객체 X의 **consensus number** = X와 read/write 레지스터만 사용해서 N 스레드 consensus를 wait-free로 풀 수 있는 최대 N.

이 수가 동기화 프리미티브의 "능력"이다.

## 5.4 Read/Write의 Consensus Number

**놀라운 사실** — read/write 레지스터만으로는 **2-consensus도 못 푼다**.

증명은 우아하다. 2 스레드 consensus를 read/write만으로 풀려고 시도하면, 어느 시점에서 두 스레드의 상태가 구분 불가능한 "두 가지 가능한 결과"의 상태에 도달할 수 있고, 그 상태에서 어느 쪽이 먼저 작업해도 결과가 갈린다 — wait-free 불가능.

```
Read/Write의 Consensus Number = 1
```

이게 5장의 핵심 결과 중 하나다. **read/write만으로는 wait-free 동기화를 거의 못 한다**.

## 5.5 Test-and-Set, FAA의 Consensus Number

```java
class TestAndSet:
    state: bool
    def testAndSet(): atomic {
        old = state
        state = true
        return old
    }
```

**Test-and-Set**으로 2-consensus를 풀 수 있다.

```python
def consensus(my_input):
    if lock.testAndSet() == false:
        # 내가 첫 번째
        decision.write(my_input)
        return my_input
    else:
        # 다른 스레드가 먼저
        return decision.read()
```

첫 testAndSet에서 false를 받은 스레드가 자기 input을 결정으로 쓴다. 다른 스레드는 그것을 읽는다.

그러나 **3 스레드** consensus는 풀 수 없다. (자세한 증명 생략)

```
Test-and-Set, FAA의 Consensus Number = 2
```

## 5.6 Compare-and-Swap의 Consensus Number

```java
class CAS:
    state: value
    def compareAndSwap(expected, new): atomic {
        if state == expected:
            state = new
            return true
        else:
            return false
    }
```

**CAS**는 무한히 많은 스레드의 consensus를 풀 수 있다.

```python
def consensus(my_input):
    if decision.cas(null, my_input):
        # 내가 처음 — 내 input이 결정
        return my_input
    else:
        # 다른 스레드가 먼저 — 그 값을 읽음
        return decision.read()
```

CAS는 **첫 번째 시도자만 성공**하게 만든다. 나머지는 그 결과를 따른다. 스레드 수가 N개여도 작동한다.

```
CAS의 Consensus Number = ∞
```

## 5.7 결과 — 동기화 위계

| Consensus Number | 동기화 도구 |
|---|---|
| 1 | read / write 레지스터 |
| 2 | test-and-set, fetch-and-add, 큐, 스택 |
| ∞ | compare-and-swap, load-link/store-conditional |

이게 동기화 도구의 위계다. 낮은 수의 도구로는 높은 수의 도구를 시뮬레이션할 수 없다.

## 5.8 왜 이게 중요한가

이 결과의 실용적 의미.

**1. CAS는 "universal"**

CAS만 있으면 어떤 wait-free 동기화 문제도 풀 수 있다. 그래서 모든 모던 lock-free 자료구조가 CAS를 핵심 도구로 쓴다.

**2. test-and-set은 부족**

스핀 락을 구현하는 데는 test-and-set으로 충분하다. 그러나 더 복잡한 wait-free 자료구조 (queue, stack, list)에는 CAS가 필요하다.

**3. read/write만으로는 한계**

순수 read/write만 쓰는 알고리즘은 wait-free가 불가능하거나, 매우 제한적이다. Lamport's Bakery 같은 알고리즘이 가능한 건 그것이 **wait-free가 아니기 때문**이다 (다른 스레드의 진행에 의존).

## 5.9 ARM/x86의 실제 프리미티브

| 아키텍처 | 프리미티브 | Consensus Number |
|---|---|---|
| x86 | LOCK CMPXCHG (CAS) | ∞ |
| x86 | LOCK XADD (FAA) | 2 |
| ARM | LDREX/STREX (LL/SC) | ∞ |
| ARM | LDADD (FAA, ARMv8.1) | 2 |

모던 CPU는 CAS 또는 LL/SC를 제공한다. 그래서 lock-free 알고리즘이 가능하다.

## 5.10 Universal Construction

다음 장의 예고 — **임의의 객체를 wait-free로 구현할 수 있다**, CAS만 있으면.

```
Universal Construction:
순차 명세 + CAS → wait-free 구현
```

이게 6장에서 본격적으로 다룬다. CAS가 "universal"이라는 의미가 명확해진다.

## 정리

- **동기화 도구의 위계** — Consensus Number로 정의
- **Read/Write** — Consensus Number 1, wait-free 동기화 거의 못 함
- **Test-and-Set, FAA** — Consensus Number 2, 스핀 락 OK
- **CAS** — Consensus Number ∞, universal
- 모든 모던 lock-free 자료구조의 핵심 도구가 CAS인 이유

## 다음 장 예고

다음 장은 **Universality of Consensus** — CAS가 왜 universal한지의 증명.

## 관련 항목

- [Ch 4: 공유 메모리 기초](/blog/parallel/parallel-principles/ch04-foundations-of-shared-memory)
- [C++ Concurrency in Action Ch 5: 메모리 모델](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types) — `compare_exchange_strong`
