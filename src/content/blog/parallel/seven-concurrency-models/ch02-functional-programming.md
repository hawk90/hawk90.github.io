---
title: "Chapter 2: Functional Programming"
date: 2026-05-06T02:00:00
description: "불변성으로 동시성 문제를 *제거*. Haskell/Clojure의 pure 함수, parallel reduce, futures."
series: "Seven Concurrency Models in Seven Weeks"
seriesOrder: 2
tags: [parallel, concurrency, book-review, functional, haskell, clojure]
type: book-review
bookTitle: "Seven Concurrency Models in Seven Weeks"
bookAuthor: "Paul Butcher"
draft: true
---

> **Seven Concurrency Models in Seven Weeks** Chapter 2 요약 — Day 1·Day 2·Day 3 구조로 Clojure 위에서 함수형 동시성을 본다.

1장의 threads-and-locks는 *공유 가변 상태*를 정면으로 다루는 모델이었습니다. 락을 빼먹으면 race, 락을 잘못 잡으면 deadlock, 메모리 모델을 잊으면 가시성 문제. Butcher는 2장에서 정반대 방향으로 갑니다. 공유 가변 상태 자체를 *제거*해 버리면 어떨까. 그 답이 함수형 프로그래밍이고, 이 장의 도구는 Clojure입니다.

세 가지 Day로 진행합니다. Day 1은 단일 스레드에서 immutability와 pure function의 감각을 익힙니다. Day 2는 `pmap`과 reducers로 데이터 병렬성을 봅니다. Day 3은 `future`/`promise`로 작업 병렬성을 다루고, 마지막에 Haskell STM을 잠깐 비교합니다. Wrap-Up에서 강점과 약점을 정리하고 3장 The Clojure Way로 다리를 놓습니다.

## Day 1 — Programming Without Mutable State

Day 1의 목표는 *값이 변하지 않는다*는 명제가 만드는 사고 전환을 체득하는 것입니다.

## Day 1.1 Clojure의 기본 자료구조

Clojure는 Lisp 방언이고 JVM 위에서 돌아갑니다. 네 가지 핵심 컬렉션 — list, vector, map, set — 이 모두 *immutable*입니다.

```clojure
;; list — 괄호, prepend 친화적
(def stooges '("Moe" "Larry" "Curly"))

;; vector — 대괄호, indexed access
(def primes [2 3 5 7 11 13])

;; map — 키-값
(def language {:name "Clojure" :paradigm "functional" :host "JVM"})

;; set — 중복 없음
(def vowels #{\a \e \i \o \u})
```

"수정"으로 보이는 연산은 *항상 새 컬렉션*을 반환합니다.

```clojure
(def v [1 2 3])
(def v2 (conj v 4))    ; v2는 [1 2 3 4]
;; v는 여전히 [1 2 3]

(def m {:a 1 :b 2})
(def m2 (assoc m :c 3)) ; m2는 {:a 1 :b 2 :c 3}
;; m은 그대로
```

| 자료구조 | 리터럴 | 추가 | 접근 |
|---------|--------|------|------|
| list | `'(a b c)` | `(cons x lst)` | `(first lst)`, `(rest lst)` |
| vector | `[a b c]` | `(conj v x)` | `(nth v i)`, `(v i)` |
| map | `{:a 1}` | `(assoc m k v)` | `(get m k)`, `(m k)` |
| set | `#{a b}` | `(conj s x)` | `(contains? s x)` |

영속 자료구조(persistent data structure) 덕분에 *복사 비용*이 폭발하지 않습니다. 내부적으로 트리 구조를 공유해 변경된 경로만 새로 할당합니다. vector와 map의 갱신은 실용적으로 $O(\log_{32} N)$, 거의 상수에 가깝습니다.

## Day 1.2 Pure Function과 Referential Transparency

Pure function은 두 조건을 만족합니다.

1. *같은 입력에는 항상 같은 출력*을 반환한다.
2. *부수 효과가 없다* — 외부 상태를 바꾸지 않고 I/O도 하지 않는다.

```clojure
;; Pure
(defn square [x] (* x x))
(defn add [a b] (+ a b))

;; Impure — 시간에 의존
(defn now-impure [] (System/currentTimeMillis))

;; Impure — println은 부수 효과
(defn log-and-double [x]
  (println "doubling" x)
  (* 2 x))
```

Pure function은 *참조 투명성(referential transparency)*을 가집니다. 표현식을 그 결과 값으로 *치환*해도 프로그램 의미가 바뀌지 않습니다. `(square 4)`는 어디서 호출되든 `16`이고, `(+ (square 4) (square 4))`는 `(+ 16 16)`으로 자유롭게 바꿔도 됩니다.

이 성질이 동시성과 직결됩니다. Pure function은 *언제, 어느 스레드에서, 몇 번을* 호출해도 결과가 같습니다. race condition이 발생할 *지점 자체가 없다*는 뜻입니다.

## Day 1.3 책의 word-count 예제

Butcher가 Day 1에서 가장 먼저 쌓아 올리는 예제는 텍스트에서 단어 빈도를 세는 함수입니다. 명령형이라면 `Map<String, Integer>`를 만들고 루프를 돌며 카운터를 증가시키겠지만, Clojure에서는 *변환의 파이프라인*으로 표현합니다.

```clojure
(require '[clojure.string :as str])

(defn words [text]
  (re-seq #"\w+" (str/lower-case text)))

(defn count-words [text]
  (frequencies (words text)))

(count-words "The quick brown fox jumps over the lazy dog the fox")
;; => {"the" 3, "quick" 1, "brown" 1, "fox" 2, "jumps" 1,
;;     "over" 1, "lazy" 1, "dog" 1}
```

`frequencies`는 표준 라이브러리 함수로, 시퀀스를 받아 빈도 맵을 반환합니다. 내부적으로는 reduce 한 번입니다.

```clojure
;; frequencies의 구현 핵심
(defn frequencies* [coll]
  (reduce (fn [acc x]
            (assoc acc x (inc (get acc x 0))))
          {}
          coll))
```

이 코드는 *어떻게 카운터를 안전하게 증가시킬까*가 아니라 *어떤 변환의 연속인가*를 묻습니다. mutation은 없고, 각 단계는 pure이며, 결과는 입력만으로 결정됩니다.

## Day 1.4 Recursion과 `loop`/`recur`

immutable 세계에서 반복은 *재귀*로 표현합니다. 그런데 일반 재귀는 호출 스택을 쌓아 큰 입력에서 stack overflow를 일으킵니다. Clojure는 JVM 한계로 자동 tail-call optimization을 제공하지 않으므로, *명시적인* tail call 형식인 `recur`를 씁니다.

```clojure
;; 일반 재귀 — 스택 위험
(defn sum-naive [coll]
  (if (empty? coll)
    0
    (+ (first coll) (sum-naive (rest coll)))))

;; loop/recur — 상수 스택
(defn sum-fast [coll]
  (loop [acc 0
         remaining coll]
    (if (empty? remaining)
      acc
      (recur (+ acc (first remaining))
             (rest remaining)))))
```

`loop`는 재귀 진입점을 만들고, `recur`는 그 지점으로 *점프*합니다. JVM 바이트코드 수준에서 goto에 가깝게 컴파일되어 스택을 쌓지 않습니다. tail position이 아니면 컴파일러가 거부하므로 의도가 명확합니다.

## Day 1.5 Higher-Order Functions — map, filter, reduce

함수를 *값*으로 다루는 것이 함수형의 또 다른 축입니다. 책은 `map`/`filter`/`reduce`를 동시성 이야기를 시작하기 전에 충분히 깔아 둡니다.

```clojure
(map inc [1 2 3 4 5])
;; => (2 3 4 5 6)

(filter even? [1 2 3 4 5 6])
;; => (2 4 6)

(reduce + 0 [1 2 3 4 5])
;; => 15

;; thread-last 매크로로 파이프라인 표현
(->> [1 2 3 4 5 6 7 8 9 10]
     (map #(* % %))
     (filter odd?)
     (reduce +))
;; => 165
```

`->>`는 각 표현식의 결과를 다음 표현식의 *마지막 인자*로 흘려보냅니다. 명령형의 임시 변수 사슬이 사라지고, 데이터 변환의 계보만 남습니다.

이 파이프라인의 모든 단계가 pure라는 점이 핵심입니다. 어느 단계든 *그대로 병렬화 후보*입니다. Day 2가 시작되는 이유입니다.

## Day 2 — Functional Parallelism

Day 2는 같은 코드를 *건드리지 않고* 병렬로 돌리는 방법을 봅니다. 핵심 도구는 `pmap`과 reducers 라이브러리입니다.

## Day 2.1 `pmap` — Parallel Map

`pmap`은 시그니처가 `map`과 같습니다. 차이는 각 항목을 *별도 스레드*에서 평가하고, 결과를 lazy 시퀀스로 모은다는 점입니다.

```clojure
(defn slow-square [x]
  (Thread/sleep 1000)
  (* x x))

;; 순차 — 약 5초
(time (doall (map slow-square (range 1 6))))

;; 병렬 — 약 1초 (코어 충분히 있다면)
(time (doall (pmap slow-square (range 1 6))))
```

`pmap`은 내부적으로 chunked sequence와 `future`를 결합합니다. 각 항목마다 `future`를 만들어 별도 스레드에서 평가하고, 결과를 순서대로 deref합니다. 책은 여기서 한 가지 함정을 짚습니다. *작업 단위가 너무 작으면* 스레드 코디네이션 비용이 계산 비용보다 커져 오히려 느려집니다.

```clojure
;; 안티패턴 — 너무 작은 작업 단위
(pmap inc (range 1000000))   ; map보다 느림

;; 패턴 — 청크로 묶어 작업 단위 키우기
(defn chunked-pmap [f n coll]
  (->> coll
       (partition-all n)
       (pmap #(doall (map f %)))
       (apply concat)))
```

## Day 2.2 책의 단어 빈도 병렬화

Day 1의 word-count를 여러 문서로 확장하면 자연스럽게 병렬화 문제가 됩니다. 책은 위키피디아 dump 같은 대형 텍스트를 chunk로 잘라 각 chunk를 병렬로 처리하는 예제를 보입니다.

```clojure
(defn count-words-chunk [chunk]
  (frequencies (words chunk)))

(defn merge-counts [& maps]
  (apply merge-with + maps))

;; 순차
(defn word-frequency-seq [chunks]
  (apply merge-counts (map count-words-chunk chunks)))

;; 병렬
(defn word-frequency-par [chunks]
  (apply merge-counts (pmap count-words-chunk chunks)))
```

`merge-with +`가 핵심입니다. 같은 키가 양쪽에 있으면 두 값을 *합*합니다. 부분 결과끼리의 합이 전체 결과와 같습니다. 즉 *결합법칙*을 만족하는 reduce여야 합니다.

| 연산 | 결합법칙 | 병렬 reduce 가능 |
|------|---------|----------------|
| `+`, `*` | O | O |
| `max`, `min` | O | O |
| `concat`, `merge-with +` | O | O |
| `-`, `/` | X | X |
| 첫 원소 의존 reduce | X | X |

## Day 2.3 Reducers 라이브러리

`pmap`은 lazy 시퀀스의 *한 항목 단위*로 작업을 분배합니다. 더 큰 데이터셋에는 부족합니다. Clojure 1.5부터 들어온 `clojure.core.reducers`는 *컬렉션을 통째로* 받아 *fork/join 기반*으로 병렬 reduce를 수행합니다.

```clojure
(require '[clojure.core.reducers :as r])

;; r/map과 r/filter는 reducer를 반환 — lazy 시퀀스가 아님
;; r/fold가 실제 평가 + 병렬 실행

(defn sum-of-squares [coll]
  (r/fold +
          (fn [acc x] (+ acc (* x x)))
          coll))

(sum-of-squares (vec (range 1000000)))
```

`r/fold`는 두 단계로 동작합니다. 컬렉션을 *분할*해 각 부분을 sequential reduce(`reducef`)로 합치고, 부분 결과들을 *결합*(`combinef`)합니다. `combinef`의 0인자 호출이 identity(중립원) 역할을 합니다.

```clojure
;; 시그니처
;; (r/fold combinef reducef coll)
;; combinef와 reducef가 같을 수 있다 — 둘 다 + 같은 경우

(r/fold + (vec (range 1 101)))
;; => 5050
```

내부 분할 크기는 기본 512입니다. 이보다 작은 컬렉션은 단일 스레드 reduce로 처리됩니다. 분할 임계값은 옵션으로 조정 가능합니다.

```clojure
;; 분할 크기 1024로 조정
(r/fold 1024 + + (vec (range 1000000)))
```

## Day 2.4 Java Fork/Join 위에서

reducers는 처음부터 새로 만든 스케줄러가 아닙니다. *Java 7의 `ForkJoinPool`* 위에 얹혀 있습니다. JVM에 이미 잘 튜닝된 work-stealing 스케줄러가 있기 때문에 그것을 재사용합니다.

| 계층 | 역할 |
|------|------|
| `r/fold` | 컬렉션을 절반씩 잘라 RecursiveTask로 변환 |
| `ForkJoinPool` | work-stealing으로 task 분배 |
| `ForkJoinWorkerThread` | 실제 reduce 수행 |

reducers를 쓰면 *동시성 코드를 한 줄도 안 쓰고* fork/join을 활용합니다. 책은 이 지점을 함수형 접근의 결정적인 매력으로 강조합니다. 사용자는 *무엇을 reduce할지*만 말하고, 런타임이 *어떻게 분배할지*를 책임집니다.

## Day 2.5 `pmap` vs reducers 정리

| 측면 | `pmap` | `r/fold` (reducers) |
|------|-------|-----|
| 입력 | lazy seq | foldable collection (vector, map) |
| 결과 | lazy seq | reduced value |
| 분배 단위 | 항목 1개 | 분할(기본 512) |
| 백엔드 | `future` 풀 | `ForkJoinPool` |
| 적합 | 항목당 비싼 계산 (I/O 아님) | 큰 인메모리 데이터 reduce |

## Day 3 — Functional Concurrency

Day 3은 데이터 병렬이 아니라 *작업 병렬* 입니다. 비동기 작업을 어떻게 표현하고 결과를 어떻게 받을지 — `future`, `promise`, `pcalls`, `pvalues`로 봅니다.

## Day 3.1 `future` — 비동기 계산

`future`는 표현식을 받아 *별도 스레드에서 즉시 실행*을 시작합니다. 결과가 필요할 때까지 호출자는 다른 일을 할 수 있고, deref(`@`)로 결과를 받습니다.

```clojure
(defn long-calc []
  (Thread/sleep 3000)
  42)

(def f (future (long-calc)))

;; 다른 일 하다가
(println "doing other work...")

;; 결과 필요할 때
(println "result:" @f)   ; 완료 안 됐으면 블로킹
```

`future` 안의 표현식은 *pure가 아니어도* 됩니다. I/O, HTTP 호출, 파일 읽기 모두 가능합니다. 다만 *결과 값 자체*는 일단 만들어지면 변하지 않습니다. immutable한 *snapshot*을 비동기로 받는 셈입니다.

상태 확인 함수.

```clojure
(realized? f)   ; 완료됐는지
(future-done? f)
(future-cancel f)
```

## Day 3.2 `promise` + `deliver` — 수동 완료

`future`가 *백그라운드 계산의 약속*이라면, `promise`는 *값을 누군가가 나중에 채워 넣을 약속*입니다. 콜백 기반 API를 동기 인터페이스로 감싸거나, 한 스레드의 이벤트를 다른 스레드에 신호로 보낼 때 씁니다.

```clojure
(def p (promise))

;; 어디선가 (다른 스레드에서)
(deliver p 100)

;; 받는 쪽
@p   ; 100
```

`deliver`는 한 번만 성공합니다. 두 번째 호출은 무시됩니다. promise의 값도 일단 채워지면 immutable입니다.

| 구분 | `future` | `promise` |
|------|----------|-----------|
| 계산 시작 | 자동 (생성 시) | 없음 — 외부에서 `deliver` |
| 다중 deliver | N/A | 첫 번째만 적용 |
| 적합 | CPU/I/O 작업 비동기 | 콜백 → 동기, 스레드 간 시그널 |

## Day 3.3 `pcalls`와 `pvalues`

여러 *독립적인 표현식*을 동시에 실행할 때의 편의 함수입니다.

```clojure
;; pcalls — 0-arg 함수들을 병렬로 호출
(pcalls
  #(slow-fetch "url1")
  #(slow-fetch "url2")
  #(slow-fetch "url3"))
;; => lazy seq of results

;; pvalues — 표현식들을 병렬로 평가
(pvalues
  (slow-fetch "url1")
  (slow-fetch "url2")
  (slow-fetch "url3"))
```

둘 다 내부적으로 `future`를 만들어 각각 별도 스레드에서 평가하고, lazy 시퀀스로 결과를 반환합니다. `pmap`이 *같은 함수를 여러 인자에* 적용하는 데 반해, `pcalls`/`pvalues`는 *서로 다른 표현식*을 동시에 평가합니다.

## Day 3.4 책의 weather-fetcher 예제

Day 3에서 책이 가장 자주 인용하는 예제는 여러 도시의 날씨 데이터를 외부 API에서 *동시에* 받아오는 코드입니다. 순차로 받으면 도시 수만큼 latency가 누적되지만, 병렬이면 가장 느린 API 하나의 latency만큼 걸립니다.

```clojure
(defn fetch-weather [city]
  ;; HTTP GET — slow
  (slurp (str "https://api.example.com/weather?city=" city)))

;; 순차 — N개 도시면 N * latency
(defn weather-seq [cities]
  (mapv fetch-weather cities))

;; 병렬 — 가장 느린 호출 하나의 latency
(defn weather-par [cities]
  (let [futures (mapv #(future (fetch-weather %)) cities)]
    (mapv deref futures)))

;; 또는 pmap
(defn weather-pmap [cities]
  (doall (pmap fetch-weather cities)))
```

세 가지 방식 모두 결과는 같지만 의미는 다릅니다. `future` 명시 버전은 *언제 시작하고 언제 받을지*를 분리해서 보여 줍니다. 중간에 다른 일을 끼워 넣을 자리가 있습니다.

```clojure
(defn weather-with-other-work [cities]
  (let [futures (mapv #(future (fetch-weather %)) cities)]
    (do-something-else)              ; 동시에 진행
    (println "still waiting...")
    (mapv deref futures)))           ; 마지막에 모음
```

I/O를 다루지만 *공유 가변 상태가 없습니다*. 각 future는 독립적인 HTTP 호출이고, 결과는 immutable 문자열입니다. 락도 condition variable도 필요 없습니다.

## Day 3.5 Haskell STM 잠깐

책은 Day 3 말미에 Haskell의 software transactional memory(STM)를 짧게 언급합니다. Clojure도 STM이 있지만 다음 장에서 다루고, 여기서는 *함수형 + STM*이 어떻게 결합되는지의 맛만 보여 줍니다.

```haskell
import Control.Concurrent.STM

transfer :: TVar Int -> TVar Int -> Int -> STM ()
transfer from to amount = do
    f <- readTVar from
    t <- readTVar to
    writeTVar from (f - amount)
    writeTVar to   (t + amount)

main = atomically (transfer accountA accountB 100)
```

`atomically`로 묶인 블록은 *모두 성공하거나 모두 롤백*됩니다. lock-free이고, type 시스템이 STM 안에서는 일반 I/O를 금지해 *순수한 트랜잭션*을 강제합니다.

Clojure는 같은 아이디어를 ref/dosync로 구현했고, *I/O 금지를 런타임에서* 검사합니다(부작용 함수에 명시적 `io!` 표시). 3장에서 본격적으로 다룹니다.

## Wrap-Up

## Wrap-Up.1 강점

함수형 모델의 가장 큰 미덕은 *동시성 문제가 발생할 자리 자체를 없앤다*는 점입니다.

- **No shared mutable state** — race condition이 정의상 불가능합니다.
- **Composability** — pure function은 자유롭게 조합되고, 조합도 pure입니다.
- **Debuggability** — 같은 입력은 같은 출력이라 *재현 가능*합니다. 1장의 비결정적 race 디버깅과 정반대입니다.
- **Refactoring** — 표현식을 값으로 치환해도 의미가 같으니 변환이 안전합니다.
- **Parallelization is mechanical** — `map` → `pmap`, `reduce` → `r/fold`. 알고리즘을 다시 짤 필요가 없습니다.

## Wrap-Up.2 약점

- **Memory overhead** — 영속 자료구조는 공간을 추가로 씁니다. 일반적으로 트리 깊이만큼의 노드 복사 비용. 대부분의 경우 무시할 만하지만 GC 압력이 커지면 보입니다.
- **Learning curve** — 명령형 사고에서 *값 변환*으로 전환은 큽니다. for/while → map/reduce, 변수 갱신 → 새 값 바인딩으로 머리를 바꿔야 합니다.
- **Legacy integration** — 자바 라이브러리는 대부분 mutable. Clojure에서 호출은 가능하지만 immutable 경계를 침범합니다. interop 시 *방어적 복사*가 필요할 때가 있습니다.
- **Hot-path performance** — 갱신이 극단적으로 잦은 경우(예: 게임 inner loop) immutable 비용이 보입니다. Clojure는 `transient`로 *일시적인 mutable* 출구를 제공하지만 사용은 신중해야 합니다.
- **I/O는 여전히 어렵다** — pure 영역 밖은 결국 부수 효과. Haskell IO monad나 *functional core / imperative shell* 같은 패턴이 필요합니다.

## Wrap-Up.3 다음 장으로의 다리

함수형은 동시성 문제의 80%를 해결합니다. 그런데 *근본적으로 mutable해야 하는* 상태가 남습니다. 은행 계좌 잔고, 게임 점수, 캐시 — 시간에 따라 변하는 값을 표현해야 합니다.

순수 함수만으로는 부족합니다. 그렇다고 다시 락으로 돌아가고 싶지도 않습니다. 3장 The Clojure Way는 이 문제를 *값과 정체성을 분리*한 다음 *변경 메커니즘을 명시적으로 선택*하는 방식으로 푼다고 예고합니다.

- **atom** — 동기, 비조정 변경
- **ref** + **STM** — 동기, 조정된 다중 변경
- **agent** — 비동기 변경

함수형이 *외부* 모델이라면, Clojure Way는 *내부* 가변 상태를 다루는 모델입니다.

## 정리

- **Day 1**: immutable 컬렉션, pure function, 재귀와 higher-order function으로 단일 스레드 함수형의 감각을 잡았습니다.
- **Day 2**: `pmap`으로 데이터 병렬, reducers의 `r/fold`로 fork/join 기반 큰 데이터 reduce를 봤습니다.
- **Day 3**: `future`/`promise`로 작업 병렬, `pcalls`/`pvalues`로 다중 표현식 동시 평가, weather-fetcher가 대표 예제였습니다.
- **결합법칙**을 만족하는 reduce만 안전하게 병렬화됩니다.
- **공유 가변 상태가 없으면** 동시성 문제 대부분이 사라집니다.
- **함수형은 만능이 아닙니다** — 진짜 mutable한 도메인은 3장에서.

## 한국 개발자의 함정

1. ***함수형은 학술적*이라는 회피** — Clojure와 Scala는 실무 데이터 파이프라인에서 거의 표준입니다.
2. ***Java Stream = 함수형*** — 람다와 `map`/`filter`는 문법일 뿐입니다. mutable 객체를 `forEach`로 수정하면 race가 그대로 돌아옵니다.
3. ***영속 자료구조는 느림*이라는 단정** — $O(\log_{32} N)$이라 실용적으로 거의 상수입니다. JVM JIT이 잘 최적화합니다. 측정 후 판단합시다.
4. ***`pmap` = 항상 빠름*** — 작업 단위가 작으면 코디네이션 비용이 더 큽니다. chunking이나 reducers를 고려합니다.
5. ***`future`는 그냥 Thread*** — `future`는 *값에 대한 약속*이고, deref가 한 번만 의미를 가집니다. 결과 자체는 immutable snapshot입니다.

## 실무 적용

| 개념 | 도구 |
|------|------|
| Pure functions | Java Stream, Kotlin `let`/`also`, Rust iterators |
| Immutability | Java `record`, Kotlin `data class`, Rust 기본 |
| Persistent data structures | Clojure, Scala 표준, Java vavr, Immer (JS) |
| Parallel map | Clojure `pmap`, Java `parallelStream` |
| Parallel reduce | Clojure `r/fold`, Java `parallelStream().reduce` |
| Fork/Join 백엔드 | `ForkJoinPool` (Java 7+), reducers가 그 위 |
| Future/Promise | Clojure `future`/`promise`, `CompletableFuture`, JS `Promise` |

## 자기 점검

- [ ] Clojure의 네 가지 immutable 컬렉션은?
- [ ] referential transparency가 동시성에 주는 이득은?
- [ ] `loop`/`recur`가 일반 재귀와 다른 점은?
- [ ] `pmap`과 `r/fold`의 적합한 입력 차이는?
- [ ] reducers가 어느 JVM 기능 위에 얹혀 있는가?
- [ ] 결합법칙이 병렬 reduce에 왜 필요한가?
- [ ] `future`와 `promise`의 의미적 차이는?
- [ ] weather-fetcher 예제에서 순차 대비 병렬의 latency 이득은?

## 다음 장 예고

Ch 3 — **The Clojure Way**. 변경 가능 상태가 *진짜로* 필요할 때, 어떻게 안전하게 다룰지. atom, ref + STM, agent의 세 가지 메커니즘과 *각각이 어떤 종류의 변화에 맞는지*를 봅니다.

## 관련 항목

- [Ch 1: Threads and Locks](/blog/parallel/seven-concurrency-models/ch01-threads-and-locks) — 함수형이 *제거*한 그 문제들
- [Ch 3: The Clojure Way](/blog/parallel/seven-concurrency-models/ch03-the-clojure-way) — immutable로 부족한 영역
- [AMP Ch 18: Transactional Memory](/blog/parallel/parallel-principles/ch18-transactional-memory) — Haskell STM의 이론적 배경
