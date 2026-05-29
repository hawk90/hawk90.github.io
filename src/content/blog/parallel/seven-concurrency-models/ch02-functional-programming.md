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

### 왜 함수형이 동시성의 답인가

동시성 버그가 발생하는 *원인*을 한 줄로 줄이면, "둘 이상의 스레드가 *같은 메모리*를 *서로 다른 시점*에 *다른 값*으로 쓰기 때문"입니다. 락은 이 상황에서 *순서*를 강제하는 도구입니다. 그런데 락은 잡는 사람의 실수에 취약합니다. 빠뜨리면 race, 순서가 어긋나면 deadlock, scope를 놓치면 가시성 문제. 즉 락은 *공유 가변 상태라는 원인을 그대로 두고*, 그 위에 규율을 얹는 방식입니다.

함수형은 한 단계 아래로 내려가 *원인 자체*를 제거합니다. 값이 한 번 만들어지면 *절대 변하지 않는다*면, 두 스레드가 같은 값을 동시에 봐도 충돌이 없습니다. 같은 입력을 받는 함수가 항상 같은 출력을 낸다면, 그 함수는 *어느 스레드에서 몇 번을 호출해도* 안전합니다. 락이 필요한 자리가 사라지는 것이 아니라, *애초에 락을 걸 대상이 없는* 세계로 옮겨 갑니다.

비유하자면 책의 인쇄본과 같습니다. 같은 책을 백 명이 동시에 읽어도 문제가 없는 이유는, 인쇄된 종이를 *그 자리에서 수정할 수 없기* 때문입니다. 누군가가 책 내용을 바꾸고 싶다면 *새 판본*을 찍어야 합니다. 그 사이 다른 독자들은 이전 판본을 계속 읽고 있습니다. immutable 자료구조가 정확히 이렇게 동작합니다.

## Day 1 — Programming Without Mutable State

Day 1의 목표는 *값이 변하지 않는다*는 명제가 만드는 사고 전환을 체득하는 것입니다.

명령형 코드에서 변수는 *시간에 따라 값이 바뀌는 상자*입니다. `x = x + 1`이 자연스럽고, 같은 변수를 여러 스레드에서 쓰면 *덮어쓰기 순서*에 따라 결과가 달라집니다. 이것이 race condition의 정의입니다. 두 스레드가 동시에 `counter`를 읽고, 각자 `+1`을 한 뒤 다시 써 넣으면, 두 번의 증가가 한 번으로 줄어드는 잘 알려진 버그입니다. 락이 필요한 이유가 바로 *상자의 내용물이 시간에 따라 변하기 때문*입니다.

immutable 세계에서는 변수가 *값에 붙인 이름표*입니다. 이름표를 새 값에 옮겨 붙일 수는 있지만, *값 자체*를 바꿀 수는 없습니다. `x`가 가리키는 `[1 2 3]`이라는 vector는 다른 누군가가 `[1 2 3 4]`를 만들든 말든 영원히 `[1 2 3]`입니다. 두 스레드가 같은 vector를 읽어도 충돌할 자리가 없습니다. *읽기만 가능한 값*에는 race가 정의되지 않습니다.

## Day 1.1 Clojure의 기본 자료구조

Clojure는 Lisp 방언이고 JVM 위에서 돌아갑니다. 네 가지 핵심 컬렉션 — list, vector, map, set — 이 모두 *immutable*입니다. 다음 네 줄은 각 자료구조의 리터럴 표기를 보여 줍니다. 괄호 모양만 다를 뿐 형태는 익숙한 컬렉션들입니다.

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

흔히 받는 첫 번째 의문은 "1000만 개짜리 vector에서 한 원소를 바꿀 때마다 전체를 복사하면 끝난 거 아닌가?"입니다. 영속 자료구조의 답은 *복사하지 않는다*입니다. 새 버전은 *이전 버전과 공유 가능한 부분을 그대로 가리키고*, 바뀐 경로의 노드들만 새로 만듭니다. 마치 책의 새 판본을 찍을 때 *바뀐 챕터만 다시 조판하고* 나머지는 기존 활자판을 그대로 쓰는 것과 같습니다. 결과적으로 옛 버전과 새 버전이 *동시에* 살아 있고, 두 버전을 동시에 보는 스레드가 있어도 누구의 데이터가 깨지지 않습니다.

## Day 1.2 Pure Function과 Referential Transparency

Pure function을 자판기에 비유할 수 있습니다. 1000원을 넣고 콜라 버튼을 누르면 콜라가 나옵니다. 어제 누가 어떤 음료를 뽑았는지, 옆 자판기에 무엇이 들었는지, 지금이 오전인지 저녁인지 — 어느 것도 결과에 영향을 주지 않습니다. *같은 입력*에는 *같은 출력*. 외부 상태와 완전히 분리되어 있습니다. 함수가 이런 자판기처럼 동작하면, 그것을 pure하다고 부릅니다.

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

![pure vs impure 함수 흐름](/images/blog/seven-concurrency-models/diagrams/ch02-pure-vs-impure.svg)

## Day 1.3 책의 word-count 예제

지금까지의 immutability와 pure function이 *실제 코드에서 어떻게 만나는지*를 보여 주는 가장 친숙한 예제가 단어 빈도 세기입니다. 명령형이라면 머릿속에 *카운터 변수*가 먼저 떠오르겠지만, 함수형은 같은 문제를 *변환의 연쇄*로 봅니다. 텍스트라는 입력을 받아 lowercase → 단어 시퀀스 → 빈도 맵이라는 세 단계로 *흘려 보내는* 그림입니다.

Butcher가 Day 1에서 가장 먼저 쌓아 올리는 예제는 텍스트에서 단어 빈도를 세는 함수입니다. 명령형이라면 `Map<String, Integer>`를 만들고 루프를 돌며 카운터를 증가시키겠지만, Clojure에서는 *변환의 파이프라인*으로 표현합니다. 다음 코드는 텍스트를 받아 lowercase로 정규화하고, 단어로 쪼개고, 각 단어의 빈도를 맵으로 모으는 세 단계를 그대로 함수 합성으로 표현합니다.

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

immutable 세계에서 반복은 *재귀*로 표현합니다. 그런데 일반 재귀는 호출 스택을 쌓아 큰 입력에서 stack overflow를 일으킵니다. Clojure는 JVM 한계로 자동 tail-call optimization을 제공하지 않으므로, *명시적인* tail call 형식인 `recur`를 씁니다. 아래 두 예제는 같은 합산을 일반 재귀와 `recur` 버전으로 비교합니다.

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

이 세 함수가 익숙해 보여도, 함수형의 시각에서는 의미가 조금 다릅니다. 명령형의 `for`는 *각 항목에 대해 무엇을 할지*를 기술하지만, `map`은 *컬렉션을 다른 컬렉션으로 변환하는 한 단계*입니다. 변환의 *결과물*에 초점이 있지, *순회의 절차*가 핵심이 아닙니다. 이 시점의 차이가 Day 2에서 `map`을 `pmap`으로 바꾸는 일이 *자연스러운 한 글자 차이*가 되는 이유를 만들어 줍니다. 절차가 아니라 변환이라면, 어느 스레드에서 어떤 순서로 일어나는지는 *세부 사항*에 불과합니다.

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

Day 1에서 `map`/`filter`/`reduce`로 쌓아 올린 변환 파이프라인이 있다고 합시다. 이 파이프라인의 각 단계는 pure function이고, 한 항목의 변환이 다른 항목의 변환에 *영향을 주지 않습니다*. 그렇다면 1000개의 항목을 처리할 때 굳이 한 스레드에서 순서대로 돌릴 이유가 없습니다. 두 스레드에서 500개씩, 또는 네 스레드에서 250개씩 처리해도 결과가 같아야 합니다. 함수형이 만든 *간단한 사실* 하나가 병렬화를 거의 공짜로 만들어 줍니다.

이것이 데이터 병렬성(data parallelism)의 본질입니다. *같은 함수*를 *서로 다른 데이터*에 적용하는 작업은 함수가 pure이기만 하면 자동으로 병렬화 후보입니다. 알고리즘을 다시 짤 필요도, 락을 추가할 필요도 없습니다. `map`을 `pmap`으로, `reduce`를 `r/fold`로 바꾸는 *한 글자 차이*가 전부일 수 있습니다.

## Day 2.1 `pmap` — Parallel Map

`pmap`은 시그니처가 `map`과 같습니다. 차이는 각 항목을 *별도 스레드*에서 평가하고, 결과를 lazy 시퀀스로 모은다는 점입니다.

직관적으로 `pmap`은 공장의 컨베이어 벨트가 여러 라인으로 늘어난 모습입니다. `map`이 한 작업자가 부품을 하나씩 처리하는 단일 라인이라면, `pmap`은 같은 작업을 N개의 라인이 동시에 수행합니다. 라인끼리 *공유하는 도구*가 없으니 서로 간섭하지 않고, 각 라인이 끝낸 결과를 순서대로 모으기만 하면 됩니다. *왜 안전한가*에 답하자면, 각 항목의 변환 함수가 pure이므로 *다른 항목의 처리 상태를 보지도, 바꾸지도 않기* 때문입니다. 락이 없는데도 race가 나지 않는 이유가 여기 있습니다.

다음 코드는 1초 걸리는 가짜 작업을 다섯 번 수행하면서 `map`과 `pmap`의 wall-clock 차이를 직접 측정합니다.

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

다시 컨베이어 벨트 비유로 돌아오면, 라인을 늘리는 것 자체에 *설치 비용*과 *작업물 이동 비용*이 듭니다. 부품 하나를 만드는 데 1초가 걸리면 라인을 늘릴 가치가 있지만, 1 밀리초짜리 작업이라면 라인 사이 이동 시간이 작업 시간을 압도합니다. `pmap`도 마찬가지로, 항목당 처리 비용이 *스레드 생성·스케줄·결과 수집 비용*을 충분히 넘어야 이득입니다. 이 손익분기를 직관적으로 파악하지 못하면 `pmap`을 무턱대고 썼다가 오히려 느려진 결과만 만나게 됩니다.

![pmap 데이터 흐름 — 항목별 future가 결과 lazy seq를 만든다](/images/blog/seven-concurrency-models/diagrams/ch02-pmap-dataflow.svg)

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

Day 1의 word-count를 여러 문서로 확장하면 자연스럽게 병렬화 문제가 됩니다. 책은 위키피디아 dump 같은 대형 텍스트를 chunk로 잘라 각 chunk를 병렬로 처리하는 예제를 보입니다. 핵심 아이디어는 "부분의 빈도 맵을 따로 만들고, 마지막에 합치자"입니다.

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

reducers의 fold tree는 토너먼트를 떠올리면 됩니다. 16강에서 8강, 8강에서 4강, 4강에서 결승으로 올라가듯 컬렉션을 절반씩 *나눠* 부분 결과를 만들고, 부분 결과끼리 *합쳐* 다시 더 큰 결과를 만듭니다. 각 매치(부분 reduce)는 독립적이라 병렬로 진행되고, 라운드가 끝날 때 결과만 모아 다음 라운드로 넘깁니다. 토너먼트가 공정하려면 매치의 *승부 규칙*이 어느 짝과 붙느냐와 무관해야 하듯, 병렬 reduce가 정확하려면 결합 함수가 *결합법칙*을 만족해야 합니다.

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

![r/fold의 병렬 reduction tree — 분할, reducef, combinef](/images/blog/seven-concurrency-models/diagrams/ch02-reducers-fold-tree.svg)

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

work-stealing이 무엇인지 한 줄로 말하면, *일을 빨리 끝낸 일꾼이 아직 일하는 동료의 작업 큐에서 작업을 훔쳐 오는* 방식입니다. 단순히 N개의 큐에 작업을 균등 분배하고 끝내는 게 아니라, 동적으로 부하를 재분배합니다. 어떤 청크가 예상보다 빨리 끝났다면 그 스레드는 놀지 않고 다른 스레드의 일을 가져옵니다. 이런 미세 조정은 직접 구현하면 손이 많이 가지만, `ForkJoinPool`이 이미 해 둔 일입니다. reducers는 그 위에 *함수형 API*를 한 겹 얹었을 뿐입니다.

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

Day 2의 `pmap`/`r/fold`가 *같은 함수를 여러 데이터에* 적용하는 데이터 병렬이었다면, Day 3은 *서로 다른 일*을 동시에 진행하는 작업 병렬입니다. 예를 들어 화면을 그리는 동안 백그라운드에서 파일을 읽고, 또 다른 스레드에서 HTTP 호출을 날리는 상황입니다. 이런 일들은 같은 함수의 반복이 아니므로 `pmap`으로 표현이 어색합니다. 대신 *언제 시작하고, 언제 결과를 받을지*를 분리해서 다룰 도구가 필요합니다.

## Day 3.1 `future` — 비동기 계산

식당에서 음식을 주문하면 진동벨을 건네받습니다. 음식이 준비되는 동안 자리에 앉아 다른 일을 하다가, 벨이 울리면 카운터에 가서 받습니다. *주문 시점*과 *수령 시점*이 분리되어 있고, 그 사이에 다른 활동을 끼워 넣을 수 있다는 점이 핵심입니다. `future`가 정확히 같은 모델입니다. `(future expr)`이 주문서 제출, deref(`@`)가 진동벨을 들고 카운터에 가는 행위입니다.

이 관점에서 `future`는 *스레드를 직접 다루지 않으면서도* 비동기를 표현하는 방법이 됩니다. 사용자는 *무엇을* 계산할지만 적고, 어떤 스레드에서 언제 시작할지, 어떻게 결과를 전달할지는 런타임이 결정합니다. 1장처럼 `Thread`를 만들고 `join`하고 결과를 어디에 저장할지 고민할 필요가 없습니다. *값에 대한 약속*이라는 추상화 한 겹이 그 모든 잡일을 가립니다.

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

`future`가 *백그라운드 계산의 약속*이라면, `promise`는 *값을 누군가가 나중에 채워 넣을 약속*입니다. 콜백 기반 API를 동기 인터페이스로 감싸거나, 한 스레드의 이벤트를 다른 스레드에 신호로 보낼 때 씁니다. `future`가 자판기처럼 *자동으로 값을 만든다*면, `promise`는 *누가 직접 값을 가져다 채워 주기를 기다리는 빈 상자*입니다.

```clojure
(def p (promise))

;; 어디선가 (다른 스레드에서)
(deliver p 100)

;; 받는 쪽
@p   ; 100
```

`deliver`는 한 번만 성공합니다. 두 번째 호출은 무시됩니다. promise의 값도 일단 채워지면 immutable입니다.

![future와 promise의 상태 다이어그램](/images/blog/seven-concurrency-models/diagrams/ch02-future-promise-states.svg)

| 구분 | `future` | `promise` |
|------|----------|-----------|
| 계산 시작 | 자동 (생성 시) | 없음 — 외부에서 `deliver` |
| 다중 deliver | N/A | 첫 번째만 적용 |
| 적합 | CPU/I/O 작업 비동기 | 콜백 → 동기, 스레드 간 시그널 |

## Day 3.3 `pcalls`와 `pvalues`

같은 함수를 여러 인자에 적용하는 게 아니라 *전혀 다른 일 세 가지*를 동시에 해야 할 때가 있습니다. 캐시를 조회하면서 동시에 DB를 쿼리하고 한쪽에서는 외부 API를 호출하는 식입니다. 각각 `future`로 묶고 deref하는 보일러플레이트가 반복되니, Clojure가 이를 짧게 줄여 둔 형태가 `pcalls`와 `pvalues`입니다.

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

Day 3에서 책이 가장 자주 인용하는 예제는 여러 도시의 날씨 데이터를 외부 API에서 *동시에* 받아오는 코드입니다. 순차로 받으면 도시 수만큼 latency가 누적되지만, 병렬이면 가장 느린 API 하나의 latency만큼 걸립니다. 다음 코드는 같은 작업을 세 가지 스타일 — 순차, `future`로 명시 병렬, `pmap` — 으로 짜서 비교합니다.

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

책은 Day 3 말미에 Haskell의 software transactional memory(STM)를 짧게 언급합니다. Clojure도 STM이 있지만 다음 장에서 다루고, 여기서는 *함수형 + STM*이 어떻게 결합되는지의 맛만 보여 줍니다. 아래 Haskell 예제는 두 계좌 사이의 송금을 *데이터베이스 트랜잭션처럼* 묶는 모습입니다.

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

## Wrap-Up.0 현업에서의 함수형 — 작은 시스템 사례

함수형이 학술적이라는 인상은 오래된 편견입니다. 대규모 동시성을 다루는 실제 시스템 다수가 함수형 또는 함수형의 핵심 아이디어 위에 서 있습니다.

WhatsApp이 *수억 명의 동시 연결*을 단 수십 명의 엔지니어로 운영한 사례는 종종 Erlang의 공으로 돌아갑니다. Erlang은 *공유 메모리가 아니라 메시지 전달*과 *불변 데이터*를 전제로 한 함수형 언어입니다. 프로세스 사이에 가변 상태를 공유하지 않으니 락이 필요 없고, 한 프로세스가 죽어도 격리되어 있어 시스템 전체에 영향을 주지 않습니다. 7장에서 다룰 actor 모델의 원형이지만, 그 밑에는 *불변성*이라는 함수형의 기반이 깔려 있습니다.

Twitter는 트래픽 폭증 시기에 Ruby 기반 백엔드의 한계에 부딪혀 *Scala*로 핵심 서비스를 옮긴 것으로 유명합니다. Scala는 JVM 위에서 함수형과 OOP를 결합한 언어로, immutable case class, pattern matching, `Future`, `Akka` 등 함수형 도구를 적극 사용합니다. *수평 확장이 잘되는 코드*가 함수형 쪽에서 더 쉽게 나온다는 판단이 있었습니다. Facebook의 React 생태계에서 Redux와 Immutable.js, 더 최근의 Immer가 표준이 된 것도 같은 맥락입니다. UI 상태를 *변하지 않는 값의 연속*으로 다루면 디버깅과 시간 여행이 단순해지고, 동시 렌더링에서 데이터 충돌이 사라집니다.

작은 규모로 내려와도 사정은 같습니다. Apache Spark, Kafka Streams, Flink 같은 데이터 파이프라인 프레임워크는 *대량 데이터에 pure 변환을 적용하는* 함수형 모델을 그대로 채택했습니다. `map`/`filter`/`reduce`를 클러스터 위에서 돌릴 뿐, 사용자가 보는 API는 Day 1에서 본 그 형태입니다. 한 머신의 `pmap`/`r/fold`를 *수십 대 머신으로 확장*한 셈입니다.

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
