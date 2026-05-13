---
title: "Chapter 6: Consensus의 보편성"
date: 2026-05-12
description: "CAS가 universal한 이유 — Universal Construction. 어떤 순차 객체든 wait-free 동시 객체로 변환 가능."
series: "The Art of Multiprocessor Programming"
seriesOrder: 6
tags: [parallel, concurrency, book-review, amp, universal-construction, cas]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 6 요약

## 6.1 Universal이란 무엇인가

5장에서 CAS의 Consensus Number가 ∞임을 봤다. 그것이 "universal하다"는 뜻은 다음이다.

> **CAS가 있으면 어떤 순차 객체든 wait-free 동시 객체로 만들 수 있다.**

이걸 증명하는 알고리즘이 **Universal Construction**이다. 6장의 핵심 내용.

## 6.2 기본 아이디어 — 명령의 순서 합의

순차 객체에 대한 동시 접근을 다음과 같이 본다.

```
입력: 여러 스레드가 명령을 던진다 (push, pop, enqueue, ...)
출력: 모든 스레드가 같은 명령 순서에 합의한다
```

명령의 순서가 합의되면, 그 순서대로 순차 객체에 적용하면 된다. 모든 스레드가 같은 결과를 본다.

문제는 — **여러 스레드가 동시에 명령을 던질 때 누구의 명령이 먼저인지를 어떻게 합의할 것인가**.

답: **CAS를 통한 consensus**.

## 6.3 Universal Construction — 의사 코드

```java
class UniversalConstruction<T> {
    head: Node*  // 명령 로그의 끝
    
    public Response apply(Invocation op) {
        myNode = new Node(op, null)
        
        while (true) {
            currentHead = head
            // CAS로 내 명령을 로그 끝에 붙임
            if (CAS(&head, currentHead, myNode)) {
                myNode.prev = currentHead
                // 성공: 명령이 로그에 추가됨
                break
            }
            // 실패: 다른 스레드가 먼저 추가함
        }
        
        // 로그를 처음부터 끝까지 재생하여 결과 계산
        result = sequentialObject.replay(getLog())
        return result
    }
}
```

**핵심**:

1. 각 명령을 노드로 만든다
2. 명령들을 연결 리스트로 잇는다 (head 포인터로)
3. CAS로 head를 내 노드로 업데이트한다 — **순서 합의**
4. 합의된 순서대로 명령을 재생하면 결과가 나온다

CAS가 명령 순서에 합의하는 역할을 한다.

## 6.4 Wait-Free 보장

위 코드는 **lock-free**다 — 적어도 한 스레드는 진행한다. 그러나 **wait-free**는 아니다 — 한 스레드가 무한히 CAS 실패를 반복할 수 있다.

Wait-free로 만들려면 **helping** 메커니즘이 필요하다.

```
A가 B의 명령을 도와준다:
- A가 자기 명령을 CAS로 붙이려 시도
- B도 같은 시도를 하고 있다면
- A가 B의 명령을 먼저 붙여 줌 (도움)
- 그 다음 A 자신의 명령을 붙임
```

다른 스레드가 도와주므로 모든 스레드가 유한 시간 안에 진행한다.

### Helping의 메커니즘

각 스레드가 "announce array"에 자신의 명령을 announce한다.

```
class WaitFreeUC<T> {
    head: Node*
    announce: Invocation[N]   // 각 스레드가 자기 명령을 announce
    
    public Response apply(Invocation op) {
        myId = currentThreadId()
        announce[myId] = op
        
        // 다른 스레드도 도와주기
        for (i in 0..N) {
            if (announce[i] != processed) {
                tryToAppend(announce[i])
            }
        }
        
        // 내 명령이 처리될 때까지 대기
        while (announce[myId] != processed) { /* spin */ }
        return result[myId]
    }
}
```

이게 wait-free의 비용 — N 스레드가 있으면 모든 작업이 O(N) 단위로 동작한다.

## 6.5 실용성 — Universal vs 실제

Universal Construction이 보여 주는 것은 **이론적 가능성**이다. 실제로는 다음 문제들이 있다.

**1. 성능**

매 작업마다 전체 로그를 재생한다 — O(history length). 비효율적.

**2. 메모리**

명령 로그가 무한히 자란다. 가비지 컬렉션 / 압축 필요.

**3. 직접 구현 어려움**

복잡한 자료구조(우선순위 큐, 스킵 리스트 등)는 직접 lock-free 구현이 훨씬 빠르다.

실용성을 위해서는 **자료구조별 특화 lock-free 알고리즘**을 짠다. Universal Construction은 "이론상 가능" 증명용.

## 6.6 정리 — 이 챕터의 의미

이론적 결론.

> **CAS만 있으면 어떤 자료구조든 wait-free로 만들 수 있다.**

이게 lock-free / wait-free 연구의 토대다. 모든 문제가 풀릴 수 있다는 보장.

실용적 결론.

> **그러나 universal construction을 직접 쓰진 않는다. 자료구조별 특화 알고리즘을 짠다.**

7-15장이 자료구조별 특화 알고리즘을 다룬다. Universal construction은 가능성의 증명이다.

## 6.7 Lock-Free vs Wait-Free 다시

Universal Construction 맥락에서 진행 조건의 의미가 명확해진다.

- **Wait-free**: 모든 스레드가 유한 시간 안에 진행 (helping 필요)
- **Lock-free**: 적어도 한 스레드가 진행 (CAS만으로 가능)
- **Obstruction-free**: 다른 스레드가 멈춰 있을 때만 진행

실용적으로는 **lock-free**가 가장 자주 쓰인다. Wait-free는 helping 비용이 크고, obstruction-free는 보장이 너무 약하다.

## 정리

- **CAS는 universal** — 어떤 순차 객체든 wait-free 동시 객체로 변환 가능
- 메커니즘 — **명령을 로그에 CAS로 추가**, 순서 합의
- **Wait-free**를 위해서는 **helping** 필요
- 비용 — 작업당 O(history) 또는 O(N)
- 실용적으로는 자료구조별 특화 알고리즘 사용
- **존재성 증명**으로서의 가치 — 모든 문제가 해결 가능함을 보장

## 다음 장 예고

다음 장부터 실용적 자료구조 — **스핀 락**과 contention 관리.

## 관련 항목

- [Ch 5: Consensus Number](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization)
- [C++ Concurrency in Action Ch 7: Lock-free 자료구조](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
