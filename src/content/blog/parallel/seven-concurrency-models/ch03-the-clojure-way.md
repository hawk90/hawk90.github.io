---
title: "Chapter 3: The Clojure Way — Identity와 State 분리"
date: 2026-05-06T03:00:00
description: "Clojure의 atom / ref (STM) / agent — identity와 value의 명시적 분리. 합성 가능한 동시성."
series: "Seven Concurrency Models in Seven Weeks"
seriesOrder: 3
tags: [parallel, concurrency, book-review, clojure, stm, identity]
type: book-review
bookTitle: "Seven Concurrency Models in Seven Weeks"
bookAuthor: "Paul Butcher"
draft: false
---

> **Seven Concurrency Models in Seven Weeks** Chapter 3 요약

이 장은 Clojure의 동시성 도구 네 가지를 다룹니다. **atom**, **agent**, **ref**(STM), 그리고 그 토대가 되는 **persistent data structure**입니다. 핵심 주장은 한 문장으로 요약할 수 있습니다. 가변 상태를 관리하기 어려운 진짜 이유는 *값과 정체성이 뒤섞여 있기 때문*이고, 이 둘을 분리하면 동시성이 훨씬 다루기 쉬워집니다.

**왜 Clojure는 identity와 state를 분리할까.** 조금 더 일상적인 비유로 시작해 봅니다. 내 이름은 어제도 오늘도 "Alice"로 같습니다. 하지만 어제의 나(value)와 오늘의 나(value)는 다른 사람입니다. 머리카락 길이가 다르고, 어제 점심을 먹은 기억도 오늘에야 생겼습니다. "Alice"라는 identity는 변하지 않고, 그저 *시간에 따라 다른 value를 가리킬* 뿐입니다.

전통적인 OOP는 이 둘을 하나로 묶습니다. `alice.age = 31`은 "Alice라는 객체를 *직접* 바꾼다"는 뜻입니다. 어제의 Alice를 알고 있던 다른 스레드가 보면, 그 Alice는 갑자기 한 살 더 먹어 있습니다. 동시 접근이 일어나면 우리가 본 스냅샷이 *진짜로* 그 시점의 모습이라고 믿을 수 없습니다. 그래서 락이 필요해집니다.

Clojure는 다르게 말합니다. 값은 *절대 변하지 않는 사진*이고, identity는 *지금은 어느 사진을 가리키는지*를 보여 주는 손가락입니다. 손가락이 가리키는 사진을 바꿔도, 이전 사진을 들고 있던 다른 스레드의 손에서는 아무 일도 일어나지 않습니다. 이것이 이 장 전체의 출발점입니다.

세 도구는 이 손가락을 *누가 어떻게* 움직이는지에 따라 갈립니다.

- **atom** — 한 사람이 자기 상태를 *혼자, 즉시* 갱신합니다.
- **agent** — 한 사람이 자기 상태를 *나중에, 비동기로* 갱신합니다.
- **ref + STM** — 여러 사람이 함께 갱신해야 할 때, *마치 한 명이 한 번에* 한 것처럼 보이게 합니다.

Butcher는 세 일자에 걸쳐 이 분리가 어떻게 도구로 구체화되는지 보여 줍니다. Day 1은 atom과 persistent collection으로 단일 변수 갱신을 처리합니다. Day 2는 agent로 비동기 작업을, ref·STM으로 여러 변수의 조정된 변경을 다룹니다. Day 3은 validator, watch, history, `ensure` 같은 세부와 dining philosophers 구현으로 들어갑니다. 마지막 Wrap-Up은 락 기반 모델과 비교해 강점과 약점을 정리합니다.

| Day | 다루는 도구 | 보장 |
|---|---|---|
| Day 1 | atom, persistent data structures | uncoordinated, synchronous |
| Day 2 | agent, ref + STM | uncoordinated async / coordinated sync |
| Day 3 | validator, watcher, history, ensure | refinement |

## Day 1 — Atoms and Persistent Data Structures

### 3.1 Identity와 Value의 분리

Rich Hickey가 *Are We There Yet?* 발표에서 강조한 아이디어가 이 장의 출발점입니다. 우리는 일상에서 "내일의 나"라는 표현을 자연스럽게 씁니다. 어제의 나와 내일의 나는 서로 다른 *값*이지만, 같은 *정체성*을 공유합니다. 프로그래밍에서도 이 둘은 본래 다른 개념입니다.

- **Value** — 어떤 시점의 *스냅샷*. 그 자체로는 변하지 않습니다.
- **Identity** — 시간에 따라 다른 값을 가지는 *논리적 실체*.

![Identity와 Value 분리 — 같은 identity가 시간에 따라 다른 불변 값을 가리킨다](/images/blog/seven-concurrency-models/diagrams/ch03-identity-vs-value.svg)

전통적 OOP는 둘을 하나의 객체에 묶습니다. 그래서 객체에 락을 걸어 보호하고, 동시 접근을 직렬화합니다.

```java
// Java — Person 객체가 identity와 value를 같이 들고 있다
class Person {
    String name;
    int age;
}
synchronized (alice) {
    alice.age = 31;
}
```

Clojure는 둘을 분리합니다. 값은 *immutable*하고, identity는 *어느 값을 가리키는지*를 들고 있는 참조입니다.

```clojure
;; 값 자체는 그냥 map. 절대 변하지 않는다.
(def snapshot {:name "Alice" :age 30})

;; identity는 atom으로 만든다. 시점마다 다른 값을 가리킨다.
(def alice (atom snapshot))

@alice                       ;; => {:name "Alice" :age 30}
(swap! alice update :age inc)
@alice                       ;; => {:name "Alice" :age 31}
```

위 코드에서 `snapshot`은 끝까지 그대로입니다. `swap!`이 한 일은 `alice`라는 identity가 가리키는 *값*을 새 map으로 바꾼 것뿐입니다. 다른 스레드가 이전에 받은 스냅샷을 들고 있어도, 그 값은 여전히 자신이 본 시점의 모습으로 *고정*되어 있습니다.

### 3.2 Persistent Data Structures

이 분리가 성립하려면 값을 갱신하는 비용이 합리적이어야 합니다. 1만 개짜리 vector에서 한 원소만 바꾸려고 전체를 복사한다면 실용성이 사라집니다. Clojure의 vector, map, set은 **persistent data structure**로 구현되어, 기존 값을 공유하면서 변경분만 새 노드로 만듭니다.

map과 vector의 내부는 **HAMT** — Hash Array Mapped Trie입니다. 분기 폭이 32인 트리에 데이터를 분산시킵니다. 깊이가 `log32(N)`이라 1억 개 원소라도 5~6단계면 도달합니다. 한 키의 값을 바꿀 때 루트부터 해당 리프까지의 *경로상 노드*만 새로 만들고, 나머지 형제 노드는 이전 트리와 그대로 공유합니다.

![HAMT 구조적 공유 — 변경 경로 노드만 새로 만들고 나머지는 v1과 공유](/images/blog/seven-concurrency-models/diagrams/ch03-hamt-sharing.svg)

구조 공유를 가계도로 떠올리면 직관적입니다. 한 사람이 결혼하면 그 가지 아래에 새 후손이 생기지만, *나머지 가계도는 그대로*입니다. 새 가지를 그리려고 가문 전체를 다시 그릴 필요가 없습니다. HAMT는 같은 방식으로 동작합니다. 한 키가 바뀌면 그 키까지 내려가는 경로만 새 노드로 다시 만들고, 다른 모든 가지는 옛 트리와 *물리적으로 같은 메모리*를 공유합니다. v1과 v2가 동시에 살아 있어도 비용은 변경 경로 5~6개 노드뿐입니다.

| 자료 구조 | 구현 | 변경 비용 | 공유 |
|---|---|---|---|
| `vector` (clojure) | 32-way trie | O(log32 N) ≈ O(1) | 변경 경로 외 모든 노드 |
| `hash-map` | HAMT | O(log32 N) ≈ O(1) | 동일 |
| `sorted-map` | red-black tree | O(log N) | 경로상 노드 |
| `list` | linked list | O(1) prepend | tail 공유 |

```clojure
(def v1 (vec (range 10000)))
(def v2 (assoc v1 5000 :changed))

;; v1과 v2는 거의 모든 내부 노드를 공유한다.
;; v2를 만드는 데 새로 할당된 노드는 변경 경로의 5~6개뿐.
(nth v1 5000)  ;; => 5000
(nth v2 5000)  ;; => :changed
```

이 덕에 "값을 통째로 다시 전달한다"는 사고가 성능 부담 없이 성립합니다. 동시성 코드를 짤 때, 한 스레드가 들고 있는 스냅샷은 *진짜로 안 변한다*는 약속이 공짜에 가깝습니다.

### 3.3 atom — uncoordinated, synchronous

atom은 단일 변수를 위한 가장 단순한 도구입니다. 내부적으로 CAS(compare-and-set) 루프로 동작합니다.

CAS 재시도를 자판기로 떠올려 봅니다. 동전을 넣고 음료수 버튼을 누르려는데, 같은 순간 다른 사람이 한 발 먼저 마지막 캔을 가져갑니다. 자판기는 내 동전을 돌려주고 "다시 골라 주세요"라고 말합니다. 나는 화나지 않고 다시 시도합니다. atom의 `swap!`이 정확히 이렇게 동작합니다. 내가 본 값(`old`)이 이미 다른 사람이 바꿔 놨다면, 내 갱신은 조용히 폐기되고 새 값으로 다시 시도됩니다.

다음 코드는 *atom의 세 가지 갱신 방식*을 한자리에 보여 줍니다.

```clojure
(def counter (atom 0))

(swap! counter inc)        ;; 1
(swap! counter inc)        ;; 2
(swap! counter + 10)       ;; 12
(reset! counter 0)         ;; 0

@counter                   ;; deref, 현재 값
```

세 가지 변형의 의미는 다음과 같습니다.

| 함수 | 의미 | 사용 |
|---|---|---|
| `swap! a f & args` | 현재 값에 `f`를 적용해 CAS | 일반적인 갱신 |
| `reset! a v` | 무조건 새 값으로 교체 | 값이 이전과 무관할 때 |
| `compare-and-set! a old new` | `old`일 때만 `new`로 교체, bool 반환 | 저수준 제어 |

`swap!`은 내부적으로 다음을 반복합니다.

**loop:**

- old = @atom
- new = (f old args...)

**if compare-and-set!(atom, old, new):**

- return new

**else:**

- retry

![atom CAS 루프 — 실패 시 read부터 다시 시도, f는 여러 번 호출됨](/images/blog/seven-concurrency-models/diagrams/ch03-atom-cas-loop.svg)

CAS 루프가 회전한다는 사실에서 한 가지 규칙이 따라옵니다. **`swap!`에 전달하는 함수는 부수 효과가 없어야 합니다**. 재시도될 수 있기 때문입니다.

```clojure
;; 회피 — println이 여러 번 찍힐 수 있다
(swap! counter (fn [n] (println "increment") (inc n)))

;; Good — 순수 함수
(swap! counter inc)
```

### 3.4 책의 사례 — sequence와 함수의 짝

Butcher가 Day 1에서 반복하는 패턴은 *Clojure sequence 함수가 곧 atom의 갱신 함수가 된다*는 점입니다. `update`, `assoc`, `conj`, `dissoc` 같은 함수는 모두 "기존 값을 받아 새 값을 돌려주는" 시그니처이므로, `swap!`의 두 번째 인자로 그대로 들어갑니다.

```clojure
(def board (atom {:snake [[0 0] [1 0] [2 0]]
                  :food [5 5]
                  :score 0}))

;; 점수 증가
(swap! board update :score inc)

;; snake 머리 추가
(swap! board update :snake conj [3 0])

;; food 위치 교체
(swap! board assoc :food [7 8])
```

순수 함수의 합성으로 상태 변경을 표현하므로, 같은 함수를 단일 스레드 테스트에도, 멀티 스레드 실행에도 그대로 씁니다. 책의 snake / citi-bike 류 예제는 이 패턴을 변주합니다.

여기서 한 가지 흥미로운 사실이 따라옵니다. *상태 갱신 코드와 순수 계산 코드를 따로 둘 필요가 없습니다*. 같은 `update :score inc` 표현이 `(update game-board :score inc)`로 쓰면 순수 함수 호출이고, `(swap! board update :score inc)`로 쓰면 동시성 갱신입니다. 테스트는 순수 호출로, 실행은 atom으로 — 한 함수가 두 자리에 모두 들어맞습니다.

## Day 2 — Agents and Software Transactional Memory

### 3.5 agent — uncoordinated, asynchronous

atom이 "지금 즉시 동기적으로 바꾼다"라면, agent는 "변경 함수를 큐에 넣고 비동기로 처리한다"는 도구입니다. 호출자는 곧바로 반환합니다.

비서에게 일을 맡기는 모습을 떠올려 봅니다. "이 편지 우편함에 넣어 줘"라고 말한 뒤, 내가 답을 기다리지 않고 다음 일로 넘어갑니다. 비서는 자기 일정대로 처리하고, 같은 비서에게 부탁한 다른 일들과 *순서대로* 묶어서 진행합니다. agent가 정확히 이 비서 역할입니다. 작업을 큐에 넣고 즉시 돌아오는 동시에, 한 agent에 보낸 작업들은 *결코 서로 동시에* 실행되지 않습니다.

다음 코드는 *agent에 두 작업을 보낸 뒤 결과를 기다리는 방법*을 보여 줍니다.

```clojure
(def logger (agent []))

(send logger conj "first entry")
(send logger conj "second entry")
;; 두 send 모두 즉시 반환. 실제 실행은 agent 내부 큐에서 순차적으로 일어난다.

@logger          ;; 그 시점의 스냅샷 (둘 다 반영됐을 수도, 아닐 수도)
(await logger)   ;; 큐가 빌 때까지 블록
@logger          ;; ["first entry" "second entry"]
```

agent의 보장은 두 가지입니다. 첫째, 한 agent에 보낸 작업은 *순차적*으로 실행됩니다. 둘째, 작업 함수는 *재시도되지 않습니다*. 그래서 atom의 `swap!`과 달리, agent의 작업 함수 안에서는 I/O 같은 부수 효과를 써도 안전합니다.

`send`와 `send-off`는 같은 의미를 가지지만, 실행되는 스레드 풀이 다릅니다.

| 함수 | 풀 | 용도 |
|---|---|---|
| `send` | 고정 크기 풀 (CPU 코어 수 기반) | CPU bound 작업 |
| `send-off` | 무제한 확장 풀 | blocking I/O |

```clojure
;; 파일 쓰기는 블록될 수 있으므로 send-off
(def file-logger (agent (clojure.java.io/writer "log.txt")))
(send-off file-logger
          (fn [w]
            (.write w "log line\n")
            (.flush w)
            w))
```

agent는 *데이터*에 메시지 큐를 붙인 모델이라, 다음 장에서 만날 actor와 닮았지만 다릅니다. actor는 *행위 주체*가 큐를 가집니다. agent는 *값*이 큐를 가집니다.

차이를 사람으로 비유하면 이렇습니다. actor는 *자기 의지*가 있는 비서입니다. 메시지를 받으면 *자기가 다음에 무엇이 될지*까지 결정합니다. agent는 *서류 보관함*에 가까운 비서입니다. 보관함 자체에는 의지가 없고, 누군가가 "다음에 이 함수를 적용해 줘"라고 일을 큐에 넣으면 그 함수가 보관함 안의 값을 바꿉니다. 값과 행위가 분리되어 있다는 사실이 agent를 *합성과 검사*에 유리하게 만듭니다.

### 3.6 ref와 STM — coordinated, synchronous

여러 변수를 *함께* 바꿔야 할 때 atom은 부족합니다. 두 계좌 사이의 송금처럼, A에서 빼고 B에 더하는 두 갱신이 어느 외부 관찰자에게도 *동시에 일어난 것처럼* 보여야 합니다. 이때 쓰는 것이 **ref**와 **STM**(Software Transactional Memory)입니다.

은행 송금을 떠올리면 STM의 보장이 분명해집니다. 내 계좌에서 50,000원을 빼는 단계와, 친구 계좌에 50,000원을 더하는 단계가 *둘 다 성공하거나 둘 다 취소*되어야 합니다. 중간에 시스템이 멈춰 내 계좌에서는 빠졌는데 친구 계좌에는 안 들어가면 50,000원이 사라집니다. 반대로 친구 쪽에만 들어가면 돈이 *복제*됩니다. 어느 쪽도 일어나면 안 됩니다. `dosync` 블록은 이 "전부 아니면 전무" 약속을 메모리 안에서 그대로 재현합니다.

아래 코드는 *송금 트랜잭션이 두 ref를 어떻게 묶는지* 보여 줍니다.

```clojure
(def account-a (ref 100))
(def account-b (ref 200))

(defn transfer [from to amount]
  (dosync
    (alter from - amount)
    (alter to   + amount)))

(transfer account-a account-b 50)
;; @account-a => 50
;; @account-b => 250
```

`dosync` 블록 안에서 일어난 모든 ref 변경은 *하나의 트랜잭션*입니다. 데이터베이스 트랜잭션과 같은 의미입니다.

ref 조작 함수는 세 가지입니다.

| 함수 | 의미 |
|---|---|
| `ref-set r v` | 현재 값과 무관하게 새 값으로 |
| `alter r f & args` | `(f current args)`로 갱신, 충돌 시 재시도 |
| `commute r f & args` | `alter`와 비슷하나 *교환 가능한* 연산이라고 약속 — 충돌 검사 완화 |
| `ensure r` | 읽기 일관성 보장 (3.10에서) |

### 3.7 STM의 보장 — ACI (no D)

DB 트랜잭션의 ACID에서 STM은 D(durability)를 제외한 ACI를 제공합니다.

| 속성 | 의미 | STM 제공 |
|---|---|---|
| Atomicity | 트랜잭션 전체가 성공하거나 전체가 실패 | O |
| Consistency | 트랜잭션 전후로 invariant 유지 (validator 활용) | O |
| Isolation | 다른 트랜잭션의 중간 상태가 보이지 않음 | O |
| Durability | 디스크에 영속 | X (메모리 모델이므로) |

durability가 없는 이유는 단순합니다. STM은 메모리 안의 동시성 문제를 풉니다. 디스크에 남기고 싶으면 따로 직렬화해야 합니다.

### 3.8 트랜잭션 내부 동작 — MVCC와 재시도

Clojure STM은 **MVCC**(Multi-Version Concurrency Control)로 구현됩니다. 각 트랜잭션은 *시작 시점의 스냅샷*을 보고 작업합니다.

MVCC를 도서관 책 대출로 떠올려 봅니다. 인기 있는 책에는 *여러 사본*이 있어서, 한 사람이 한 권을 빌려가도 다른 사람은 다른 사본을 그 자리에서 읽을 수 있습니다. 누군가가 책 안에 메모를 적어 새 판(version)을 만들어도, 다른 독자가 들고 있는 옛 사본의 내용은 영향을 받지 않습니다. STM의 ref가 정확히 이렇게 동작합니다. 한 트랜잭션이 ref를 deref하면, 그 트랜잭션 *시작 시점에 유효했던 사본*을 빌려 봅니다. 다른 트랜잭션이 commit해 새 사본이 생겨도, 내 손에 있는 사본은 그대로 자기 시점의 모습입니다.

다음 흐름을 따릅니다.

1. 트랜잭션이 시작되면 시작 시각 `t_start`를 기록합니다.
2. ref를 deref하면 `t_start` 시점에 유효했던 값을 봅니다.
3. ref를 alter하면 *로컬 사본*에 새 값을 기록합니다.
4. commit 시점에, 읽거나 쓴 ref들 중 누구라도 `t_start` 이후에 다른 트랜잭션이 commit했으면 abort합니다.
5. abort되면 트랜잭션 전체를 *처음부터 재시도*합니다.

![STM 트랜잭션 흐름 — Tx B가 먼저 commit하면 Tx A는 conflict 감지 후 처음부터 retry](/images/blog/seven-concurrency-models/diagrams/ch03-stm-transaction.svg)

이 구조가 가져오는 결과는 두 가지입니다. 하나는 *낙관적 동시성*입니다. 충돌이 드물 것이라고 가정하고, 충돌이 발생했을 때만 다시 합니다. 다른 하나는 *부수 효과 금지*입니다. 재시도되므로, `dosync` 안의 부수 효과는 여러 번 실행될 수 있습니다.

```clojure
;; 회피 — println이 여러 번 찍힐 수 있다
(dosync
  (alter account-a - 100)
  (println "withdrawn 100")
  (alter account-b + 100))

;; Good — 부수 효과는 트랜잭션 밖으로
(let [result (dosync
               (alter account-a - 100)
               (alter account-b + 100)
               :ok)]
  (println "withdrawn 100"))
```

I/O뿐 아니라 *변경 가능한 외부 자원*에 대한 모든 변경이 금지입니다. atom을 `dosync` 안에서 `swap!`하는 것도 좋지 않습니다. atom은 트랜잭션 의식이 없습니다.

### 3.9 STM이 합성 가능한 이유

락 기반 모델의 가장 큰 약점은 *합성*입니다. 두 함수가 각자 자기 락을 잡고 동작할 때, 두 함수를 한 번에 atomic하게 호출하는 새 연산을 만들려면 두 함수의 락 순서를 모두 알아야 합니다. 잘못된 순서로 잡으면 데드락이 발생합니다.

조금 더 구체적으로 떠올려 봅니다. 라이브러리 A의 `transfer(x, y)`는 *x → y* 순서로 락을 잡고, 라이브러리 B의 `transfer(p, q)`는 *p → q* 순서로 락을 잡는다고 합시다. 두 함수를 같은 트랜잭션에 묶고 싶다면, 락 네 개의 *전역 순서*를 직접 정해 두 함수의 내부를 다시 짜야 합니다. 라이브러리가 닫혀 있으면 그것조차 불가능합니다.

STM은 이 문제가 없습니다. 트랜잭션은 *중첩*되며, 안쪽 `dosync`는 바깥 트랜잭션에 흡수됩니다.

```clojure
(defn transfer [from to amount]
  (dosync
    (alter from - amount)
    (alter to   + amount)))

(defn deposit [account amount]
  (dosync (alter account + amount)))

;; 자유롭게 합성 — 모두 하나의 큰 트랜잭션이 된다
(dosync
  (transfer account-a account-b 100)
  (deposit  account-c 50)
  (transfer account-d account-a 30))
```

세 호출 전체가 *원자적*으로 실행됩니다. 데드락은 발생할 수 없습니다. STM에는 락이 없습니다.

## Day 3 — In Depth

### 3.10 ensure — 읽기 일관성

`dosync` 안에서 ref를 단순히 deref하면 시작 시점의 스냅샷을 봅니다. 그런데 그 ref가 다른 트랜잭션에 의해 변경되어도, 우리 트랜잭션은 그 변경을 *감지하지 않습니다*. 우리는 쓰지 않았기 때문입니다.

write skew라고 부르는 문제가 여기서 나옵니다. 두 트랜잭션이 각각 서로 다른 ref를 쓰면서, 서로의 ref를 읽기만 한다면, 둘 다 invariant를 위반하지 않은 *것처럼 보이는* 결정을 내리고 둘 다 commit할 수 있습니다.

```clojure
;; 회피 — write skew
;; invariant: account-a + account-b >= 0
(dosync
  (when (>= (+ @account-a @account-b) 100)
    (alter account-a - 100)))

;; Good — ensure로 account-b의 안정성을 잠근다
(dosync
  (ensure account-b)
  (when (>= (+ @account-a @account-b) 100)
    (alter account-a - 100)))
```

`ensure`는 ref에 *읽기 잠금*을 겁니다. 트랜잭션이 끝날 때까지 그 ref가 다른 트랜잭션에 의해 변경되지 않음을 보장합니다. 쓰기보다 가볍지만 충돌 가능성은 만들어 냅니다.

### 3.11 Validators — invariant 강제

ref나 atom에 validator를 붙이면, 모든 변경 후의 값이 그 조건을 만족해야 합니다. 만족하지 못하면 변경이 거부됩니다.

```clojure
(def account (ref 0 :validator #(>= % 0)))

(dosync (alter account + 100))   ;; OK, account = 100
(dosync (alter account - 200))   ;; IllegalStateException — validator 실패
;; 트랜잭션 전체 abort, account 그대로 100
```

validator는 트랜잭션이 commit하기 *전*에 호출됩니다. 위반이 발생하면 트랜잭션이 abort되고, 호출자에게 예외가 전파됩니다. STM의 C(consistency)를 구현하는 도구입니다.

### 3.12 Watchers — 변경 알림

`add-watch`는 ref / atom / agent의 값이 바뀔 때 호출되는 콜백을 등록합니다.

```clojure
(def counter (atom 0))

(add-watch counter :logger
  (fn [key reference old-value new-value]
    (println "counter:" old-value "->" new-value)))

(swap! counter inc)
;; counter: 0 -> 1
```

watch 콜백은 변경이 *완료된 뒤* 호출됩니다. 그래서 콜백 안에서 I/O를 해도 안전합니다. 트랜잭션 안에서 일으키지 못하는 부수 효과를, watch 단계로 옮겨 처리하는 패턴이 자주 쓰입니다.

### 3.13 Ref histories — snapshot 부족 대응

ref는 기본적으로 최신 값과 가까운 과거 몇 개의 버전만 보관합니다. 오래 도는 트랜잭션이 시작 시점의 스냅샷을 요구할 때, 그 시점의 값이 이미 폐기되어 있으면 시도가 실패합니다.

```clojure
(def stock (ref 0
                :min-history 5
                :max-history 50))
```

읽기만 하는 긴 트랜잭션이 자주 abort된다면 `:min-history`를 늘리는 것이 해법입니다. 메모리를 더 쓰는 대신, 과거 스냅샷을 더 오래 보관합니다.

### 3.14 Atom / Ref / Agent의 결합

세 도구는 같은 시스템 안에서 역할을 나눠 씁니다.

- 단일 카운터 — atom
- 여러 변수의 조정된 갱신 — ref + STM
- 비동기 부수 효과 (로깅, 알림 전송) — agent
- 부수 효과를 트랜잭션 commit 후로 미루기 — `dosync` 안에서 `send`

마지막 패턴이 특히 유용합니다. `dosync` 안에서 `(send agent f)`를 호출하면, 그 send는 *트랜잭션이 commit된 뒤*에 실제로 발송됩니다. 재시도되어도 한 번만 발송됩니다.

```clojure
(def transactions (agent []))

(defn transfer [from to amount]
  (dosync
    (alter from - amount)
    (alter to   + amount)
    (send transactions conj {:from from :to to :amount amount})))
;; 로깅은 트랜잭션이 정말 commit됐을 때만 일어난다.
```

### 3.15 Dining Philosophers — STM 버전

책의 Day 3은 식사하는 철학자 문제를 STM으로 구현합니다. 각 포크를 ref로 표현합니다. 철학자는 두 포크를 동시에 잡으려 시도하고, STM이 충돌과 재시도를 알아서 처리합니다.

아래 코드의 핵심은 *두 포크를 한 트랜잭션 안에서 한꺼번에 집는다*는 것 한 줄입니다.

```clojure
(defn make-fork []
  (ref true))   ;; true = 놓여 있음

(defn make-philosopher [name forks food-amount]
  (ref {:name name
        :forks forks
        :food food-amount
        :eating false}))

(defn start-eating [p]
  (dosync
    (let [forks (:forks @p)]
      (when (every? deref forks)            ;; 두 포크 다 놓여 있나?
        (doseq [f forks] (ref-set f false)) ;; 둘 다 집는다 — atomic
        (alter p assoc :eating true)
        true))))

(defn stop-eating [p]
  (dosync
    (let [forks (:forks @p)]
      (doseq [f forks] (ref-set f true))    ;; 둘 다 내려놓는다
      (alter p assoc :eating false)
      (alter p update :food dec))))

(defn dine [p]
  (while (pos? (:food @p))
    (when (start-eating p)
      (Thread/sleep 100)
      (stop-eating p))))
```

전통적인 락 버전이라면 포크 두 개를 잡는 순서를 모든 철학자가 똑같이 유지해야 합니다. 그렇지 않으면 데드락이 발생합니다. STM 버전은 그런 합의가 필요 없습니다. `(every? deref forks)` 검사가 *commit 시점에* 다른 트랜잭션과의 충돌로 판정되면, 그냥 재시도됩니다. 합성도 마찬가지로 자유롭습니다. 한 식탁을 둘 합치고 싶다면 그냥 두 식탁의 트랜잭션을 한 `dosync`에 묶으면 됩니다.

### 3.16 현실 시스템 — Datomic과 Haskell STM

이 장의 아이디어가 책의 예제 안에서만 사는 것이 아닙니다. 실제 시스템 두 가지가 같은 사고를 다른 무대에서 보여 줍니다.

**Datomic** — Clojure를 만든 Rich Hickey가 직접 설계한 데이터베이스입니다. 핵심 결정 한 줄로 요약됩니다. *데이터는 절대 지우지 않는다*. 모든 사실(fact)이 시간축 위의 새 버전으로 추가될 뿐이고, 과거 시점의 데이터베이스 상태가 *영원히* 보존됩니다. 그래서 "어제 오후 3시 기준으로 이 쿼리를 다시 돌려 줘" 같은 요청이 그냥 됩니다. 이 장의 persistent data structure 사고를 *디스크 영속 저장*으로 끌어올린 것입니다. identity는 entity ID, value는 시점별 사실의 집합 — Clojure의 atom과 정확히 같은 구분입니다.

**Haskell STM** — GHC가 언어 차원에서 제공하는 STM입니다. `STM` 모나드 안에서만 `TVar`를 읽고 쓸 수 있어서, *부수 효과를 트랜잭션에 넣을 수 없다*는 규칙이 타입으로 강제됩니다. Clojure에서는 "넣지 않는 게 좋다"인 부분이 Haskell에서는 "컴파일이 거부"입니다. 같은 ACI 보장, 같은 합성 가능성을, 더 엄격한 타입 시스템 위에서 누립니다.

| 시스템 | identity | value | 특징 |
|---|---|---|---|
| Clojure atom/ref | reference | immutable map/vector | 한 JVM 메모리 |
| Datomic | entity ID | 사실의 시점별 집합 | 영속 + 시간 여행 쿼리 |
| Haskell STM | `TVar` | immutable Haskell 값 | 타입 시스템으로 부수 효과 차단 |

세 시스템이 모두 *immutable value + atomic identity*라는 같은 뼈대 위에 서 있습니다.

## Wrap-Up

### 3.17 atom · agent · ref 결정 트리

Butcher가 책 끝에 정리한 결정 트리는 다음 두 축에 따라 갈립니다.

![atom · ref · agent 결정 트리 — coordinated와 sync/async 두 축으로 선택](/images/blog/seven-concurrency-models/diagrams/ch03-decision-tree.svg)

| 도구 | 변경 단위 | 동기성 | 조정 | 재시도 | 부수 효과 허용 |
|---|---|---|---|---|---|
| `atom` | 한 ref | sync | uncoordinated | CAS 루프 | X (변경 함수) |
| `ref` + STM | 여러 ref | sync | coordinated | 트랜잭션 재시도 | X (트랜잭션 본체) |
| `agent` | 한 ref | async | uncoordinated | 없음 | O (작업 함수) |

각 도구는 *자기 한계*에서 최선이 되도록 설계되어 있습니다. 한 도구로 모든 상황을 처리하려 들면 어색해집니다.

### 3.18 강점

- **합성 가능성** — STM 트랜잭션은 중첩되고 자유롭게 합쳐집니다. 락 순서를 외울 필요가 없습니다.
- **데드락 없음** — STM은 락을 쓰지 않습니다. 재시도로 해결합니다.
- **identity / value 분리** — 스냅샷 의미가 명확해, 추론이 단순합니다.
- **persistent data structure** — 값 공유가 공짜에 가까우므로, "통째로 새 값" 사고가 실용적입니다.
- **도구의 선택지** — uncoordinated / coordinated, sync / async를 명시적으로 고릅니다.

### 3.19 약점

- **transaction retry 비용** — 충돌이 잦으면 락보다 느립니다. STM은 *낙관적*입니다.
- **side-effect 격리 필요** — `dosync` 안 부수 효과는 위험합니다. 트랜잭션 밖이나 watch / agent로 옮겨야 합니다.
- **단일 JVM** — Clojure STM은 한 JVM 안의 메모리만 다룹니다. 분산 트랜잭션이 아닙니다.
- **D(durability) 부재** — 디스크 영속성은 별도 책임입니다.
- **충돌 hotspot** — 모든 트랜잭션이 같은 ref를 쓰면, 그 ref가 직렬화 지점이 됩니다.
- **언어 의존성** — 다른 언어에서 같은 수준의 합성을 누리기 어렵습니다.

### 3.20 다음 장으로의 다리

이 장의 모델은 *공유 가변 상태*를 안전하게 다루는 데 집중했습니다. 상태를 *공유하되 immutable하게*, *합성 가능한 트랜잭션*으로 관리합니다.

다음 장은 정반대 방향입니다. 상태를 아예 *공유하지 않습니다*. 각 actor가 자기 안의 가변 상태를 가지고, 메시지 패싱으로만 통신합니다. Erlang의 *let it crash* 철학과 supervisor 트리를 만나게 됩니다.

| 모델 | 가변 상태 | 통신 |
|---|---|---|
| Ch 2 — Functional | 없음 | 함수 합성 |
| **Ch 3 — Clojure** | **immutable value + atomic reference** | **공유 STM** |
| Ch 4 — Actors | 각 actor 내부에만 | 메시지 패싱 |

## 정리

- **Identity와 Value 분리**가 이 장의 핵심입니다.
- Value는 *immutable*하며, identity가 *어느 value를 가리키는지*만 시간에 따라 바뀝니다.
- persistent data structure(HAMT)가 값 공유를 사실상 공짜로 만듭니다.
- **atom**은 단일 변수의 동기 갱신을, CAS 루프로 처리합니다.
- **ref**는 여러 변수의 조정된 갱신을, STM(MVCC + 재시도)로 처리합니다.
- **agent**는 단일 변수의 비동기 갱신을, 작업 큐로 처리합니다.
- STM은 ACI를 보장하며 D는 없습니다.
- 트랜잭션 본체에는 부수 효과를 두지 않습니다. watch나 commit 후 send로 옮깁니다.
- `ensure`는 write skew를 막는 읽기 잠금입니다. validator는 invariant를 강제합니다.
- STM은 데드락이 없고 *합성 가능*합니다. 락 모델의 가장 큰 약점을 푼 도구입니다.

## 한국 개발자의 함정

1. ***Clojure만 가능하다*는 한정** — 패턴 자체는 다른 언어에도 적용됩니다. Java는 `AtomicReference<Immutable>`, Rust는 `Arc<RwLock<Im<T>>>` 같은 식입니다.
2. ***STM은 항상 락보다 좋다*** — 충돌이 적을 때 좋습니다. hot ref가 있으면 락보다 느려집니다.
3. ***atom으로 모든 동시성 처리*** — 단일 변수만 동기적으로 다룹니다. 여러 변수의 atomic은 ref + `dosync`입니다.
4. ***`dosync` 안에 I/O*** — 재시도되면 I/O가 반복됩니다. `println`도 위험합니다.
5. ***agent와 actor 혼동*** — agent는 *값*에 작업 큐를 붙입니다. actor는 *행위 주체*가 메시지 큐를 가집니다.
6. ***swap!의 함수에 부수 효과*** — CAS 루프 재시도에서 여러 번 실행될 수 있습니다.

## 실무 적용

**언어별 패턴 대응**

| 개념 | Clojure | 다른 언어로 |
|---|---|---|
| atom | `atom` + `swap!` | Java `AtomicReference<Immutable>` |
| ref + STM | `ref` + `dosync` | Haskell `STM`, Scala STM 라이브러리 |
| agent | `agent` + `send` | 작업 큐 + 단일 worker |
| persistent data | HAMT 기반 `vector`/`map` | Java `ImmutableList`, Scala 표준 |
| `ensure` | 읽기 잠금 | DB `SELECT ... FOR SHARE` |

**설계 패턴**

- 함수형 코어와 *경계의 가변 상태*를 분리한 다음, 경계에서만 atom / ref / agent를 씁니다.
- 부수 효과는 *트랜잭션 밖*이나 watch / agent에 배치합니다.
- 같은 ref에 트래픽이 몰리면 분할을 고민합니다. STM은 hotspot을 좋아하지 않습니다.
- 값을 통째로 전달하는 사고 — persistent data structure 덕에 비용이 작습니다.

## 자기 점검

- [ ] Identity와 Value 분리는 어떤 문제를 해결합니까?
- [ ] persistent data structure는 *왜* 공유를 가능하게 합니까?
- [ ] atom / ref / agent 중 무엇을 언제 고릅니까?
- [ ] STM이 락보다 *합성 가능*한 이유는 무엇입니까?
- [ ] `dosync` 본체에 부수 효과를 두면 왜 위험합니까?
- [ ] `ensure`가 필요한 시나리오를 한 줄로 설명할 수 있습니까?
- [ ] STM이 ACID 중 D를 제공하지 않는 이유는 무엇입니까?
- [ ] dining philosophers를 STM으로 풀면 데드락이 사라지는 이유는 무엇입니까?

## 다음 장 예고

Ch 4 — **Actors**. 격리된 가변 상태와 메시지 패싱입니다. Erlang의 *let it crash*와 supervisor 트리가 무대에 오릅니다. Clojure의 *공유 + immutable* 사고와 정반대 방향에서, 같은 문제를 다르게 풉니다.

## 관련 항목

- [Ch 2: Functional Programming](/blog/parallel/seven-concurrency-models/ch02-functional-programming)
- [Ch 4: Actors](/blog/parallel/seven-concurrency-models/ch04-actors)
- [AMP Ch 18: Transactional Memory](/blog/parallel/parallel-principles/ch18-transactional-memory)
- [AMP Ch 5: Synchronization Power](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization)
