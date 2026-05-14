---
title: "Chapter 3: The Clojure Way — Identity와 State 분리"
date: 2026-05-22T03:00:00
description: "Clojure의 atom / ref (STM) / agent — identity와 value의 명시적 분리. 합성 가능한 동시성."
series: "Seven Concurrency Models in Seven Weeks"
seriesOrder: 3
tags: [parallel, concurrency, book-review, clojure, stm, identity]
type: book-review
bookTitle: "Seven Concurrency Models in Seven Weeks"
bookAuthor: "Paul Butcher"
draft: true
---

> **Seven Concurrency Models in Seven Weeks** Chapter 3 요약

## 3.1 Identity vs Value

Clojure의 핵심 통찰.

```
Identity: "변하는 것" — 시간에 따라 다른 값을 가질 수 있음
Value:    "변하지 않는 것" — 특정 시점의 스냅샷
```

전통적 OOP는 둘을 *혼동*한다.

```java
// Java: Person 객체가 identity + value 둘 다
class Person {
    String name;
    int age;
}
p.age = 31;  // 같은 객체, 값 변경
```

```clojure
;; Clojure: 분리
(def alice (atom {:name "Alice" :age 30}))
;; alice는 identity
;; @alice가 현재 value (immutable map)

(swap! alice update :age inc)
;; identity는 같지만 새 value를 가리킴
```

값 자체는 *불변*. identity가 *어느 값을 가리키는지*만 바뀐다.

## 3.2 네 가지 참조 타입

| 타입 | 용도 | 동기 / 비동기 | 조정 / 독립 |
|---|---|---|---|
| **atom** | 단일 변수 | 동기 | 독립 |
| **ref** | 여러 변수 동시 | 동기 (STM) | 조정 |
| **agent** | 단일 변수 비동기 | 비동기 | 독립 |
| **var** | 스레드 로컬 | — | — |

## 3.3 Atom — 가장 단순

CAS 기반. 단일 변수.

```clojure
(def counter (atom 0))

(swap! counter inc)  ;; 1
(swap! counter inc)  ;; 2
(swap! counter + 10) ;; 12

@counter  ;; deref, 현재 값
```

`swap!`이 내부적으로 CAS 루프. 함수가 *pure*여야 함 (재시도 가능).

## 3.4 Ref — STM

여러 ref를 *atomic*하게 변경.

```clojure
(def account-a (ref 100))
(def account-b (ref 200))

(defn transfer [from to amount]
  (dosync
    (alter from - amount)
    (alter to + amount)))

(transfer account-a account-b 50)
;; account-a: 50, account-b: 250 — atomic
```

`dosync` 블록 안의 모든 변경이 *하나의 트랜잭션*. 충돌 시 자동 재시도.

### STM의 매력 — 합성 가능

```clojure
(defn transfer [from to amount] ... )
(defn deposit [account amount] ...)
(defn withdraw [account amount] ...)

;; 자유로운 조합
(dosync
  (transfer a b 100)
  (deposit c 50)
  (withdraw d 30))
;; 모두 하나의 atomic 블록
```

락에서 *불가능*했던 것. STM은 합성 가능.

## 3.5 Ref 사용 시 주의

```clojure
;; ❌ 부수 효과는 STM 블록 안에 X
(dosync
  (alter account - 100)
  (println "Withdrawn 100"))  ;; 재시도 시 여러 번 출력!

;; ✓ 부수 효과는 밖으로
(let [result (dosync (alter account - 100))]
  (println "Withdrawn"))
```

트랜잭션은 *재시도*되므로 I/O / 변경 가능 자원에 대한 부수 효과는 금지.

## 3.6 Agent — 비동기 변경

```clojure
(def logger (agent []))

(send logger conj "log message 1")
(send logger conj "log message 2")
;; 비동기 — 즉시 반환
;; agent 내부에서 순차 실행

@logger  ;; 현재 값 (불완전할 수 있음)
(await logger)  ;; 완료까지 대기
```

Agent는 *비동기 + 순차*. 여러 send가 큐에 쌓여 순서대로 실행.

```clojure
;; I/O 안전: agent 작업은 재시도 없음
(send logger
      (fn [log]
        (println "logging")  ;; OK
        (conj log "entry")))
```

## 3.7 STM의 실제 동작

```
1. 트랜잭션 시작 — read snapshot
2. ref를 deref / alter — 로컬 사본에서 작업
3. commit 시도 — 다른 트랜잭션이 변경했나 검사
4. 충돌 없음 → 커밋
5. 충돌 있음 → abort, 재시도
```

낙관적 동시성. 충돌이 *드물다는 가정*. 충돌 잦으면 락보다 느릴 수 있음.

## 3.8 ensure — 읽기 잠금

읽기만 하는데도 *값이 변하지 않음*을 보장하고 싶을 때.

```clojure
(dosync
  (ensure account)  ;; account를 다른 트랜잭션이 변경 못함
  (if (> @account 100)
    (alter other + 50)))
```

`ensure`는 ref에 *읽기 잠금*을 건다. write skew 방지.

## 3.9 Watchers — 변경 알림

```clojure
(def counter (atom 0))

(add-watch counter :logger
  (fn [key ref old new]
    (println "Changed from" old "to" new)))

(swap! counter inc)
;; "Changed from 0 to 1"
```

이벤트 기반 프로그래밍과 결합.

## 3.10 Validators

```clojure
(def positive-counter (atom 0 :validator pos-int?))

(swap! positive-counter inc)  ;; OK
(swap! positive-counter (constantly -1))  ;; throws
```

상태 진입 조건을 *컴파일러처럼* 검증.

## 3.11 Identity의 일반적 가치

Clojure 외에서도 적용 가능.

```rust
// Rust
let counter = Arc::new(AtomicI32::new(0));
counter.fetch_add(1, Ordering::SeqCst);
// AtomicI32가 identity 역할
```

```java
// Java
AtomicReference<ImmutableState> state = 
    new AtomicReference<>(ImmutableState.initial());

state.updateAndGet(s -> s.withAge(31));
// Immutable state + atomic reference = Clojure atom 패턴
```

핵심 아이디어 — **immutable value + atomic reference**.

## 정리

- **Identity와 Value 분리**가 핵심
- Value는 *불변*, identity가 어느 value를 가리키는지만 변함
- **atom** — 단일 변수, 동기, CAS
- **ref** — 여러 변수, 동기, STM
- **agent** — 단일 변수, 비동기, 큐
- **STM이 합성 가능** — 락의 가장 큰 문제 해결
- 부수 효과는 트랜잭션 *밖*으로

## 한국 개발자의 함정

```
1. *Clojure만 가능하다*는 한정
   - 패턴은 어디서나 적용 가능
   - Java AtomicReference + ImmutableX

2. *STM은 항상 락보다 좋다*
   - 충돌 적을 때 좋음
   - 충돌 잦으면 락이 더 빠름

3. *Atom으로 모든 동시성 처리*
   - 단일 변수만 가능
   - 여러 변수 atomic은 ref + dosync

4. *dosync 안에 I/O*
   - 재시도 시 I/O 반복
   - println도 위험
   - 부수 효과는 *밖으로*

5. *agent와 actor 혼동*
   - agent: 데이터 자체에 작업 큐
   - actor: 객체에 메시지 큐
   - 비슷하지만 다름
```

## 실무 적용

```
이론 → 실무:
- Atom              → Java AtomicReference<Immutable>
- Ref + STM         → Haskell STM, Clojure ref
- Agent             → Akka Typed Actor 유사
- Identity/Value    → Rust ownership 모델과 호환
- ensure            → Database SELECT FOR UPDATE

언어별:
- Clojure: 직접 지원 (atom/ref/agent/var)
- Java: AtomicReference + immutable objects
- Scala: Akka, Cats Effect Ref
- Rust: Arc<Mutex<T>> 또는 Arc<AtomicX>
- C++: std::atomic<std::shared_ptr<T>>

설계 패턴:
- 함수형 코어 + atom으로 상태
- 여러 entity 변경 = STM/dosync
- 비동기 + 순차 = agent / 큐
- DB 트랜잭션과 유사한 사고
```

## 자기 점검

```
□ Identity와 Value 분리 의미?
□ atom / ref / agent 선택 기준?
□ STM이 락보다 *합성 가능*한 이유?
□ dosync 안에 부수 효과 금지 이유?
□ ensure가 필요한 시나리오?
□ Java로 atom 패턴 구현 방법?
```

## 다음 장 예고

Ch 4 — **Actors**. 격리된 상태 + 메시지 패싱. Erlang의 *let it crash*.

## 관련 항목

- [Ch 2: Functional Programming](/blog/parallel/seven-concurrency-models/ch02-functional-programming)
- [Ch 4: Actors](/blog/parallel/seven-concurrency-models/ch04-actors)
- [AMP Ch 18: Transactional Memory](/blog/parallel/parallel-principles/ch18-transactional-memory)
- [AMP Ch 5: Synchronization Power](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization)
