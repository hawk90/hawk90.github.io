---
title: "Chapter 2: Functional Programming"
date: 2026-05-22T02:00:00
description: "불변성으로 동시성 문제를 *제거*. Haskell/Clojure의 pure 함수, parallel reduce, futures."
series: "Seven Concurrency Models in Seven Weeks"
seriesOrder: 2
tags: [parallel, concurrency, book-review, functional, haskell, clojure]
type: book-review
bookTitle: "Seven Concurrency Models in Seven Weeks"
bookAuthor: "Paul Butcher"
draft: true
---

> **Seven Concurrency Models in Seven Weeks** Chapter 2 요약

## 2.1 FP가 동시성에 좋은 이유

함수형 프로그래밍의 두 가지 핵심.

```
1. Immutability — 값은 변하지 않는다
2. Pure functions — 같은 입력 → 같은 출력, 부수 효과 없음
```

이 두 가지로 **동시성 문제 자체가 사라진다**.

```
변경 가능 상태 없음 → race condition 없음
공유 상태 없음     → 락 필요 없음
부수 효과 없음     → 순서 문제 없음
```

## 2.2 Pure Function의 힘

```haskell
-- Pure: 입력만 결과를 결정
double :: Int -> Int
double x = x * 2

-- Impure: 외부 상태에 의존
counter = 0
increment_counter():  -- 같은 호출이지만 매번 다른 결과
    counter += 1
    return counter
```

Pure 함수는 *어디서든 안전하게 호출*할 수 있다. 병렬화는 *그냥 호출*하기.

## 2.3 Immutability

```clojure
;; Clojure
(def numbers [1 2 3 4 5])
(def doubled (map #(* 2 %) numbers))

;; numbers는 그대로
;; doubled는 새 컬렉션
```

```haskell
-- Haskell
let xs = [1, 2, 3]
let ys = map (*2) xs
-- xs는 변하지 않음, ys는 새 리스트
```

**복사가 비싸지 않나?** 영속 자료구조(persistent data structure)로 *공유 + 부분 갱신*. 변경된 부분만 새로 할당.

## 2.4 Parallel Map / Reduce

```clojure
;; 순차
(reduce + (map slow-fn data))

;; 병렬
(reduce + (pmap slow-fn data))
;; pmap = parallel map, 자동 분배
```

```haskell
-- Control.Parallel.Strategies
import Control.Parallel.Strategies

result = parMap rdeepseq slow_fn data
```

Pure 함수라서 *순서 무관*. 자동 병렬화 가능.

## 2.5 Reduce는 결합법칙 필요

```
foldl: (((a + b) + c) + d)        — 순차
foldr: (a + (b + (c + d)))        — 역순
parallel: (a + b) + (c + d)       — 병렬 (결합법칙 필요)
```

병렬 reduce는 *결합법칙(associativity)*을 만족해야 한다.

```haskell
-- OK: 덧셈, 곱셈, max, min, concat
parallel_sum xs = parMap (+) xs

-- 잘못: 뺄셈
-- (1 - 2) - 3 = -4
-- 1 - (2 - 3) = 2
```

## 2.6 Lazy Evaluation

```haskell
take 10 [1..]    -- 무한 리스트에서 10개
-- 무한대로 실행되지 않음. 필요할 때만 계산.
```

Lazy + Pure의 조합이 강력하다 — 무한 자료구조, 무한 스트림. 동시성에서는 *값 강제* 시점의 통제가 중요.

## 2.7 Future / Promise

Pure 환경에서도 비동기 결과 표현.

```clojure
(def f (future (slow-computation)))
;; 백그라운드에서 실행

;; 다른 일 하다가
(println @f)  ; deref, 완료까지 대기
```

```haskell
import Control.Concurrent.Async

main = do
    a <- async slowComputation
    b <- async anotherSlow
    resultA <- wait a
    resultB <- wait b
    print (resultA + resultB)
```

## 2.8 Pure FP의 한계 — I/O

```haskell
-- I/O는 pure가 아니다
readFile "data.txt"  -- 매번 다른 결과 가능

-- Haskell의 해법: IO monad로 분리
main :: IO ()
main = do
    contents <- readFile "data.txt"  -- IO
    let parsed = parse contents       -- pure
    print parsed                       -- IO
```

I/O는 *프로그램 가장자리*에. 안쪽은 모두 pure. 동시성 안전성을 *컴파일 타임*에 보장.

## 2.9 Clojure — 실용적 FP

Lisp 방언. JVM 위에서 실행. *Pure를 강요하지 않지만 권장*.

```clojure
;; 함수 정의
(defn square [x] (* x x))

;; 컬렉션
(def nums [1 2 3 4 5])
(map square nums)         ; (1 4 9 16 25)
(filter odd? nums)        ; (1 3 5)
(reduce + nums)           ; 15

;; 병렬
(reduce + (pmap square nums))
```

```clojure
;; 상태가 필요할 때 — 명시적 (3장에서 더)
(def counter (atom 0))
(swap! counter inc)
```

## 2.10 함수형 데이터 변환 파이프라인

```clojure
(->> orders
     (filter active?)
     (map :total)
     (filter pos?)
     (reduce +))
```

각 단계가 pure → 어느 단계든 병렬화 가능 (`pmap` 등). *흐름이 곧 구조*.

## 2.11 한계와 비용

| 측면 | 비용 |
|---|---|
| 메모리 | 영속 자료구조 오버헤드 |
| 성능 | 변경이 매우 잦으면 느림 |
| 학습 | 명령형 사고에서 큰 전환 |
| 디버깅 | lazy 평가로 스택 트레이스 어려움 |

그러나 *동시성 안전성*과의 트레이드오프가 보통 가치 있다.

## 정리

- **Pure + Immutable**이 동시성 문제를 *제거*
- **Parallel map/reduce**가 자동 병렬화
- **결합법칙** 만족하는 연산이 reduce 가능
- **I/O는 가장자리에** (Haskell IO monad)
- **Clojure**가 실용적 진입점
- 메모리/성능 트레이드오프는 보통 *동시성 안전성*으로 보상

## 한국 개발자의 함정

```
1. *함수형은 학술적*이라는 회피
   - Clojure / Scala가 실무에 충분히 쓰임
   - 데이터 파이프라인엔 거의 표준

2. *Java 8 stream = 함수형*
   - 람다 + map/filter는 함수형 *문법*
   - 변경 가능 객체를 다루면 진짜 FP 아님
   - `forEach`로 상태 변경하면 race 위험

3. *영속 자료구조는 느림*이라는 단정
   - O(log N) 갱신, 실용적으로 빠름
   - JVM JIT으로 매우 최적화
   - 측정 후 판단

4. *Pure는 I/O 못함*이라는 오해
   - Haskell IO monad가 해법
   - Functional core / imperative shell 패턴

5. *parallel map = pmap*이라는 단순화
   - 작업 단위가 작으면 오버헤드 큼
   - 적절한 chunking 필요
```

## 실무 적용

```
이론 → 실무:
- Pure functions       → Java Stream, Kotlin let/also, Rust iterators
- Immutability         → Java record, Kotlin data class, Rust 기본
- Persistent ds        → Clojure, Scala 표준, Java vavr
- Parallel reduce      → Java parallelStream, Spark RDD
- Future/Promise       → CompletableFuture, Scala Future, JS Promise
- IO monad             → Haskell, Scala ZIO/Cats Effect

언어별:
- Haskell: 순수 함수형, 학습 곡선 가파름
- Clojure: 실용적, JVM, JS도 가능 (ClojureScript)
- Scala: FP + OOP 혼합
- F#: .NET 함수형
- Elixir: 함수형 + Actor

데이터 처리:
- Spark / Flink → 함수형 변환이 기본
- Kafka Streams → 함수형 API
- Pandas → 함수형 비슷한 API
```

## 자기 점검

```
□ Pure function의 정의?
□ Immutability가 동시성에 주는 이득?
□ Parallel reduce의 결합법칙 요구?
□ Lazy evaluation과 동시성의 상호작용?
□ Haskell IO monad가 *함수형*을 어떻게 유지?
□ 영속 자료구조의 시간/공간 복잡도?
```

## 다음 장 예고

Ch 3 — **The Clojure Way**. 변경 가능 상태가 필요할 때, *어떻게* 안전하게 다룰까. Clojure의 ref/agent/atom.

## 관련 항목

- [Ch 1: Threads and Locks](/blog/parallel/seven-concurrency-models/ch01-threads-and-locks)
- [Ch 3: The Clojure Way](/blog/parallel/seven-concurrency-models/ch03-the-clojure-way)
- [AMP Ch 18: Transactional Memory](/blog/parallel/parallel-principles/ch18-transactional-memory) — Haskell STM
