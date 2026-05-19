---
title: "Chapter 5: Communicating Sequential Processes (CSP)"
date: 2026-05-06T05:00:00
description: "Hoare의 CSP — 채널 중심, identity 없는 메시지. Go goroutine, Clojure core.async."
series: "Seven Concurrency Models in Seven Weeks"
seriesOrder: 5
tags: [parallel, concurrency, book-review, csp, go, channels, core-async]
type: book-review
bookTitle: "Seven Concurrency Models in Seven Weeks"
bookAuthor: "Paul Butcher"
draft: false
---

이번 장은 Paul Butcher의 책에서 다섯 번째로 다루는 모델인 **Communicating Sequential Processes**입니다. 4장 Actor와 같은 메시지 기반 모델이지만, 결정적인 차이가 하나 있습니다. Actor에서는 메시지가 *수신자*에게 직접 전달됩니다. CSP에서는 메시지가 *채널*로 보내지고, 누가 그것을 받든 sender는 알 필요가 없습니다. 이 작은 결합도의 차이가 시스템 설계 전반을 바꿉니다.

책은 Clojure의 `core.async` 라이브러리를 가지고 사흘에 걸쳐 CSP를 풀어 놓습니다. Day 1에 채널과 go block의 기본, Day 2에 다중 채널과 IO 통합, Day 3에 ClojureScript로 옮겨가 브라우저 UI까지 같은 모델로 다룹니다. 이 글은 그 흐름을 그대로 따라갑니다.

**3일 흐름 한눈에**

| Day | 주제 | 핵심 도구 | 대표 예제 |
|---|---|---|---|
| 1 | 채널과 go block | `chan`, `go`, `>!`, `<!`, `close!` | ping-pong |
| 2 | 다중 채널과 IO | `alts!`, `timeout`, `thread`, `pipeline` | web crawler |
| 3 | 클라이언트-사이드 CSP | ClojureScript, `mult`, `pub`/`sub` | typeahead suggestion |

세 날의 공통점은 **같은 어휘**입니다. 서버에서 worker pool을 짤 때 쓰는 `<!`과 브라우저에서 클릭 이벤트를 처리할 때 쓰는 `<!`이 똑같습니다. 이 *어휘의 통일*이 책이 강조하는 core.async의 가장 큰 미덕입니다.

## 5.1 CSP의 기원 — Hoare 1978

CSP는 C. A. R. Hoare가 1978년 동명의 논문에서 제안한 **프로세스 대수**입니다. 책이 강조하는 핵심 개념은 두 가지입니다.

첫째, 시스템은 독립적으로 실행되는 *순차 프로세스*들의 모임입니다. 각 프로세스는 자신만의 상태를 가지며, 다른 프로세스의 상태를 들여다보지 않습니다. 둘째, 프로세스끼리의 상호작용은 *동기적 메시지 전달*로만 이루어집니다. 공유 메모리는 없습니다.

Hoare의 원래 모델에서는 메시지를 보낼 때 sender가 *수신 프로세스의 이름*을 직접 지정했습니다. 이는 Actor 모델과 같은 모양입니다. 그러나 그 후의 CSP 변형과 책이 다루는 core.async / Go 모두 한 단계 더 추상화합니다. 메시지는 *프로세스가 아니라 채널*로 보내집니다. Hoare 자신도 이후 논문에서 이 방향으로 모델을 다듬었습니다.

```text
Actor:    P1 ──message──▶ P2     (P1은 P2를 알아야 한다)

CSP:      P1 ──▶ [channel] ◀── P2  (서로를 모른다)
```

이 차이가 만드는 효과는 명확합니다. Actor 모델에서 sender와 receiver는 *동일한 단위*입니다. 두 액터를 분리하면 메시지 경로도 바뀝니다. CSP에서는 채널이라는 *제3의 객체*가 있으므로 sender와 receiver 양쪽을 자유롭게 교체할 수 있습니다. 책이 자주 사용하는 표현으로 "first-class channels"입니다.

## 5.2 core.async — JVM 위의 CSP

책은 CSP를 설명하는 도구로 Clojure의 `core.async`를 고릅니다. 이유는 두 가지입니다. 하나는 Clojure가 JVM 위에서 돌아가므로 Java thread를 자유롭게 사용할 수 있다는 점, 다른 하나는 같은 라이브러리가 ClojureScript를 통해 브라우저에서도 동작한다는 점입니다. Day 3의 클라이언트-사이드 CSP가 이 위에 얹힙니다.

기본 도입은 단순합니다.

```clojure
(require '[clojure.core.async
           :refer [chan go <! >! <!! >!! close! thread alts! timeout]])

(def ch (chan))

(go (>! ch "hello"))
(go (println (<! ch)))
;; 출력: hello
```

`chan`이 채널을 만들고, `go`가 가벼운 프로세스를 띄우고, `>!`와 `<!`이 채널에 값을 넣고 빼는 연산입니다. 이게 CSP의 전부에 가깝습니다. 나머지는 이 네 가지의 조합입니다.

## 5.3 채널 — buffered vs unbuffered

`chan` 함수는 기본적으로 **unbuffered** 채널을 만듭니다. 책이 강조하는 unbuffered 채널의 의미는 *rendezvous*입니다. sender가 `>!`로 값을 넣어도, 받는 쪽이 `<!`로 가져갈 준비가 될 때까지 sender는 진행하지 못합니다. 정확히 그 반대도 성립합니다.

```clojure
(def ch (chan))                ;; unbuffered

(def ch10 (chan 10))           ;; fixed-size buffer (10)

(def ch-drop (chan (dropping-buffer 10)))   ;; 차면 새 값을 *버린다*
(def ch-slide (chan (sliding-buffer 10)))   ;; 차면 *오래된* 값을 버린다
```

세 가지 buffer 정책은 책이 다루는 핵심 도구입니다.

| 채널 종류 | 동작 | 사용 예 |
|---|---|---|
| Unbuffered | 양쪽이 만나야 통과 (synchronous rendezvous) | 동기화, lock-step 흐름 |
| Fixed buffer | 가득 차면 sender 블록 | 백프레셔가 필요한 producer / consumer |
| Dropping buffer | 가득 차면 *새 값* drop | 텔레메트리, 로그 sampling |
| Sliding buffer | 가득 차면 *오래된 값* drop | UI 이벤트, latest-wins |

`dropping-buffer`와 `sliding-buffer`는 책에서 특히 강조되는데, *producer가 절대 블록되어선 안 되는* 상황에서 안전하게 데이터 손실을 결정합니다.

**buffer 선택 가이드**

| 질문 | 권장 |
|---|---|
| 두 프로세스가 *정확히 동시에* 만나야 하는가 | unbuffered |
| producer가 잠깐 빨라도 괜찮은가 | fixed buffer |
| producer가 *절대* 멈추면 안 되는가 + 손실 허용 | dropping / sliding |
| latest-wins 의미가 자연스러운가 | sliding |

책은 unbuffered를 기본으로 두고, 백프레셔가 명확히 필요할 때만 fixed buffer를 도입하라고 권합니다. 가장 단순한 채널이 가장 분석하기 쉽기 때문입니다.

## 5.4 parking과 blocking — 네 개의 연산자

core.async가 Go와 다른 가장 큰 점은 **macroexpansion으로 상태 머신을 만든다**는 것입니다. `go` 블록 안의 코드는 컴파일 타임에 변환됩니다. 채널 연산을 만나면 콜백 기반 상태 머신으로 풀려서, 진짜 Java thread를 점유하지 않고 *parking*만 하다가 깨어납니다.

이를 위해 같은 연산이 두 형태로 존재합니다.

| 연산 | 어디서 쓰는가 | 동작 |
|---|---|---|
| `>!` / `<!` | `go` 블록 안에서만 | *park* — thread를 놓아준다 |
| `>!!` / `<!!` | 일반 Java thread에서 | *block* — thread를 점유한 채 대기 |

```clojure
;; go 블록 — parking
(go
  (let [v (<! ch)]
    (println "got" v)))

;; 일반 스레드 — blocking
(let [v (<!! ch)]
  (println "got" v))
```

`go` 블록 안에서 실수로 `<!!`를 쓰면 Java thread를 통째로 점유하게 됩니다. core.async의 dispatch thread pool은 보통 매우 작기 때문에 (CPU 코어 수 * 2 + 42 같은 작은 수), 이런 실수가 몇 번 쌓이면 전체 시스템이 멎습니다. 책은 이 함정을 반복해서 경고합니다.

이 두 어휘의 분리는 core.async의 가장 큰 디자인 선택입니다. Go에서는 *모든* goroutine이 진짜 thread 위에서 도므로, blocking과 parking의 구분이 필요하지 않습니다. Clojure는 Java thread가 비싸므로, *go 블록 안에서는 절대 thread를 잡지 않는다*는 약속을 코드 형태로 강제합니다. macro 변환이 채널 연산을 만나면 콜백을 등록한 뒤 함수에서 *return*해 버리므로, 그 자리에서 thread는 풀려납니다. 다음 채널 이벤트가 도착하면 다른 thread가 같은 상태 머신을 이어서 실행합니다.

```text
일반 호출:   thread ── code ── code ── code ──▶ return
go 블록:     thread ── code ──(park)            (다른 thread)── code ──(park)
             └ 같은 thread가 다른 일을 함         └ 깨어날 때 thread 재할당
```

이 모델은 thread를 *비싼 자원으로 다루는* 모든 환경에 일반화됩니다. 책은 JavaScript의 단일 thread 환경에서도 같은 macro가 그대로 동작한다는 점을 Day 3에서 다시 짚습니다.

## 5.5 ping-pong — 가장 단순한 예제

책의 Day 1 첫 예제는 두 프로세스가 ping-pong을 주고받는 것입니다. 같은 채널 위에서 양방향 rendezvous가 어떻게 일어나는지 보여주기 위해서입니다.

```clojure
(defn ping-pong [n]
  (let [ping (chan)
        pong (chan)]
    (go (loop [i 0]
          (when (< i n)
            (>! ping i)
            (let [reply (<! pong)]
              (println "ping got" reply)
              (recur (inc i))))))
    (go (loop []
          (when-let [v (<! ping)]
            (println "pong got" v)
            (>! pong (* v 10))
            (recur))))))

(ping-pong 3)
```

이 코드의 핵심은 두 go 블록이 *어느 쪽이 먼저 스케줄되든* 결과가 같다는 점입니다. unbuffered 채널의 rendezvous 의미상 한 쪽이 준비될 때까지 다른 쪽은 진행할 수 없으므로, 순서가 자동으로 결정됩니다. 락도 없고, 명시적 신호도 없습니다.

이 사례는 또 한 가지를 보여 줍니다. `ping`과 `pong` 두 채널은 *역할이 다른 두 방향*을 나타냅니다. 한 채널을 양방향으로 쓰면 책이 경고하는 *self-deadlock*이 쉽게 발생합니다. 자신이 보낸 값을 자신이 받아 버리는 상황이 그 예입니다. 책은 이 시점에 "방향마다 채널을 따로 두라"는 관용을 권합니다. 채널의 수가 늘어나는 대신 흐름이 그래프에서 명확해집니다.

## 5.6 channel direction과 close

core.async에서 채널의 *닫기*는 의미상 중요한 사건입니다. `close!`을 호출한 뒤로는 더 이상 값을 넣을 수 없고, buffer에 남아 있는 값을 모두 빼고 나면 receiver는 `nil`을 받습니다.

```clojure
(let [c (chan)]
  (go
    (loop []
      (if-let [v (<! c)]              ;; nil이면 false → loop 종료
        (do (println "got" v) (recur))
        (println "done"))))
  (>!! c 1)
  (>!! c 2)
  (close! c))
```

`if-let`과 `when-let`이 receiver 쪽 관용구입니다. `nil`을 *채널이 끝났다는 표시*로 활용하므로, 별도 sentinel을 정의할 필요가 없습니다. 단, `nil` 자체를 정상 값으로 보낼 수는 없습니다. core.async는 `nil`을 *예약된 종료 토큰*으로 다루기 때문입니다. 정상 데이터에 `nil`이 섞일 가능성이 있다면 `:done` 키워드나 wrapped 옵션을 별도로 정의해야 합니다.

또 하나의 규칙은 *close의 책임은 producer에게 있다*는 것입니다. consumer가 close하면 아직 보내려던 producer가 IllegalStateException을 만날 수 있습니다. 책은 이 규칙을 Day 1에서 짚고, Day 2의 pipeline 패턴에서 다시 강조합니다.

## 5.7 Day 2 — alts!와 timeout

Day 2의 출발은 **여러 채널을 동시에 기다리는 것**입니다. Go의 `select`에 해당하는 것이 `alts!`입니다.

```clojure
(let [c1 (chan)
      c2 (chan)]
  (go
    (let [[v ch] (alts! [c1 c2])]
      (condp = ch
        c1 (println "c1 said" v)
        c2 (println "c2 said" v))))
  (go (>! c1 "hello")))
```

`alts!`는 채널들의 벡터를 받고, 가장 먼저 준비되는 채널의 값과 채널 자신을 함께 돌려줍니다. 두 개 이상이 동시에 준비되어 있으면 *무작위로* 하나를 고릅니다. 이 비결정성은 의도된 것입니다. 특정 채널이 우선되는 starvation을 막습니다. 우선순위가 필요하면 `:priority true` 옵션을 줍니다.

타임아웃은 *전용 채널*로 표현됩니다.

```clojure
(let [c (chan)]
  (go
    (let [[v ch] (alts! [c (timeout 1000)])]
      (if (= ch c)
        (println "got" v)
        (println "timed out")))))
```

`timeout`은 지정한 밀리초 후에 *닫히는* 채널을 만듭니다. 닫힌 채널에서 `<!`은 즉시 `nil`을 돌려주므로, `alts!`의 한 가지로 끼워 넣으면 timeout이 자연스럽게 표현됩니다. 책은 이를 "everything is a channel"의 한 단면으로 소개합니다.

## 5.8 alts!의 세부 동작

`alts!`는 단순히 "준비된 채널 하나"를 고르는 도구가 아닙니다. 책의 Day 2가 자세히 다루는 세부 동작이 몇 가지 있습니다.

먼저, `alts!`에는 *put 연산도 섞을 수 있습니다*. 받기와 보내기가 한 곳에서 함께 다중화됩니다.

```clojure
(alts! [c1                      ;; c1에서 받기
        [c2 :hello]              ;; c2에 :hello 보내기
        (timeout 1000)])         ;; 1초 후 timeout
```

벡터 안에 채널만 있으면 받기, `[채널 값]` 형태면 그 채널에 값을 보내는 후보가 됩니다. 어느 쪽이 먼저 가능해지든 그것이 선택됩니다. 이 한 가지 연산만으로 *receive-or-send-or-timeout* 같은 패턴을 일관되게 표현할 수 있습니다.

둘째, 기본 동작은 무작위 선택이지만 `:priority true` 옵션을 주면 *벡터 순서대로* 우선순위를 평가합니다.

| 옵션 | 동작 | 사용 예 |
|---|---|---|
| 기본 | 동시 가능 시 무작위 | starvation 방지 |
| `:priority true` | 벡터 앞쪽 우선 | 긴급 신호 채널을 위로 |
| `:default v` | 어느 것도 준비 안 됨 → 즉시 v | 폴링, non-blocking 시도 |

`:default`는 특히 유용합니다. *블록하지 않고 한 번 시도*하는 패턴을 한 줄로 만들어 줍니다.

```clojure
(let [[v ch] (alts! [c] :default :nothing)]
  (if (= ch :default)
    (println "channel empty right now")
    (println "got" v)))
```

## 5.9 IO 통합 — thread 매크로

`go` 블록은 절대 *진짜로 블록되어선 안 됩니다*. 그러나 실세계의 IO는 블록을 피할 수 없습니다. core.async는 이를 위해 **`thread` 매크로**를 제공합니다.

```clojure
(defn fetch-page [url]
  (thread
    (slurp url)))                ;; 일반 Java thread에서 실행

(go
  (let [body (<! (fetch-page "http://example.com"))]
    (println (count body) "bytes")))
```

`thread`는 진짜 Java thread 하나를 띄워 본문을 실행한 뒤, 결과를 채널로 돌려줍니다. `go` 쪽에서는 그 채널을 `<!`로 받기만 하면 됩니다. *IO 블록을 channel-level의 대기로 바꾸어 주는 어댑터*입니다.

이 패턴은 책의 Day 2 web crawler 예제의 골격입니다.

```clojure
(defn crawl [seed n]
  (let [urls    (chan 100)
        results (chan 100)]
    (>!! urls seed)
    (dotimes [_ n]
      (go-loop []
        (when-let [u (<! urls)]
          (let [body (<! (thread (slurp u)))]
            (>! results {:url u :body body})
            (doseq [link (extract-links body)]
              (>! urls link))
            (recur)))))
    results))
```

n개의 worker가 같은 `urls` 채널에서 일을 빼가고, `thread`로 HTTP 호출을 IO 풀에 위임합니다. fetch 결과는 `results` 채널로 모입니다. 채널이 어느 worker로 일을 분배할지 결정하므로, 코드는 *작업 분배 로직을 따로 쓸 필요가 없습니다*.

## 5.10 pipeline — 함수형 흐름

여러 단계로 이어지는 변환은 직접 go 블록으로 쓸 수도 있고, core.async가 제공하는 `pipeline` 류 함수를 쓸 수도 있습니다.

```clojure
(defn pipe-stage [in xf]
  (let [out (chan)]
    (go-loop []
      (if-let [v (<! in)]
        (do (>! out (xf v)) (recur))
        (close! out)))
    out))

;; 직접 합성
(def in   (chan))
(def sq   (pipe-stage in #(* % %)))
(def even (pipe-stage sq #(when (even? %) %)))
```

`pipeline`, `pipeline-blocking`, `pipeline-async`는 같은 모양의 단계를 *transducer*로 표현하게 해줍니다.

| 함수 | 단계 본문 형태 | 적합한 경우 |
|---|---|---|
| `pipeline` | 순수 transducer | CPU 변환 |
| `pipeline-blocking` | blocking 함수 OK | DB / 파일 IO |
| `pipeline-async` | 콜백 / future 반환 | 비동기 HTTP |

```clojure
(let [in  (chan 100)
      out (chan 100)]
  (pipeline 4 out (map #(* % %)) in)
  (onto-chan!! in (range 10))
  (loop []
    (when-let [v (<!! out)]
      (println v) (recur))))
```

병렬도(4)와 변환(`map …`), 입력 채널, 출력 채널을 한 줄로 묶습니다. 이것이 책의 Day 2 후반이 강조하는 "pipeline-oriented" 설계입니다.

## 5.11 Day 3 — ClojureScript와 클라이언트 CSP

같은 core.async가 ClojureScript로 컴파일되어 브라우저에서 돌아갑니다. JavaScript는 단일 스레드이므로 *진짜 동시성*은 없지만, `go` 블록의 상태 머신 변환은 그대로 동작합니다. 즉 CSP는 여기서 **콜백 지옥에 대한 대안**으로 쓰입니다.

핵심 아이디어는 단순합니다. *UI 이벤트를 채널로 변환*합니다.

```clojure
(defn listen [el type]
  (let [out (chan)]
    (.addEventListener el type
      (fn [e] (put! out e)))
    out))

(let [clicks (listen (js/document.getElementById "btn") "click")]
  (go-loop []
    (when-let [_ (<! clicks)]
      (println "clicked!")
      (recur))))
```

이렇게 만들면 키 입력, 마우스 클릭, AJAX 응답 모두가 채널이 됩니다. 모두 같은 단어 (`<!`, `alts!`, `timeout`)로 다룰 수 있습니다. 책의 Day 3 핵심 예제인 **typeahead suggestion**이 이 위에 얹힙니다.

```clojure
(defn typeahead [input]
  (let [keys (listen input "keyup")
        out  (chan)]
    (go-loop []
      (let [_ (<! keys)
            [v ch] (alts! [keys (timeout 250)])]
        (if (= ch keys)
          (recur)                          ;; 250ms 안에 또 입력 — 무시
          (let [q (.-value input)
                r (<! (xhr-channel (str "/search?q=" q)))]
            (>! out r)
            (recur)))))
    out))
```

이 코드 한 토막에 *debouncing*, *cancellation*, *async IO*가 모두 들어 있습니다. 250ms 안에 다시 키가 눌리면 쿼리를 보내지 않습니다. 그동안 모인 요청은 자동으로 폐기됩니다. 같은 일을 Promise나 콜백으로 쓰면 코드가 두세 배로 부풀어 오릅니다.

## 5.12 broadcast — mult와 pub/sub

채널은 기본적으로 *각 값이 한 번만* 소비됩니다. 같은 값을 여러 consumer에게 보내려면 broadcast 도구가 필요합니다.

```clojure
;; mult — 하나의 입력을 여러 tap으로 복제
(let [src (chan)
      m   (mult src)
      a   (chan)
      b   (chan)]
  (tap m a)
  (tap m b)
  (go (println "A got" (<! a)))
  (go (println "B got" (<! b)))
  (>!! src "hello"))

;; pub / sub — 토픽 기반 라우팅
(let [src (chan)
      p   (pub src :topic)
      ch  (chan)]
  (sub p :alerts ch)
  (go-loop []
    (when-let [m (<! ch)]
      (println "alert:" m) (recur)))
  (>!! src {:topic :alerts :msg "fire!"}))
```

`mult`는 한 채널을 N개로 *복제*하고, `pub`/`sub`는 키 함수에 따라 토픽별로 라우팅합니다. 이 두 가지로 *Observer 패턴*과 *Event bus*가 같은 라이브러리 위에서 만들어집니다.

## 5.13 transducer와 채널

core.async 채널은 생성 시 transducer를 받을 수 있습니다.

```clojure
(def ch (chan 10 (comp (map inc) (filter even?))))
```

이 채널에 보내는 값들은 채널 안에서 `(filter even? (map inc …))` 변환을 거친 뒤 buffer에 들어갑니다. 변환 로직이 *채널의 일부*가 되므로, 단계마다 새 채널을 만들지 않아도 되는 장점이 생깁니다. 책은 이를 짧게 언급하면서, Clojure 1.7 이후의 *transducer 일반화*가 core.async를 어떻게 단순하게 만들었는지 보여 줍니다.

## 5.14 CSP vs Actor — 다시 정리

책의 Wrap-Up은 4장 Actor와 5장 CSP의 직접 비교에 상당한 분량을 할애합니다. 표 하나로 압축하면 다음과 같습니다.

| 측면 | Actor | CSP |
|---|---|---|
| 메시지 대상 | 특정 actor (identity) | 채널 (anonymous) |
| 첫 번째 시민 | actor reference | channel |
| 결합도 | sender가 receiver를 안다 | 양쪽이 서로 모른다 |
| 분산 | 자연스러움 (Erlang/Akka) | 채널은 보통 노드 내 |
| 큐 | actor 하나당 mailbox | 채널 하나당 buffer |
| 패턴 매칭 | 가능 (Erlang receive) | `alts!`로 표현 |
| 장애 처리 | supervisor 트리 | 명시적, built-in 없음 |
| 분석 가능성 | 동적, 메일박스 의존 | 채널 그래프로 *정적* 추론 가능 |

CSP의 강점은 **decoupling**과 **정적 분석 가능성**입니다. 채널이 first-class이므로 시스템의 데이터 흐름을 그래프로 그릴 수 있고, deadlock 분석도 (이론적으로) 가능합니다. 반면 약점은 두 가지입니다. 하나는 *channel proliferation*입니다. 큰 시스템에서는 채널 수가 빠르게 늘어나서, 누가 어느 채널을 닫아야 하는지 추적하기 어렵습니다. 다른 하나는 *supervision의 부재*입니다. Actor에서는 supervisor가 자식의 실패를 처리하지만, CSP에는 그런 내장 모델이 없습니다.

## 5.15 강점과 약점 — Butcher의 평가

책의 Wrap-Up이 정리하는 항목들입니다.

**강점**

- **decoupled producers/consumers** — 누가 어디서 값을 만들고 누가 받는지가 서로의 코드에 드러나지 않습니다.
- **flow 중심 설계** — 데이터 흐름이 채널 그래프로 직접 표현됩니다.
- **다양한 모델로의 적용** — 같은 라이브러리가 server-side (Clojure)와 client-side (ClojureScript) 양쪽에서 동작합니다.
- **debouncing, throttling, timeout** 같은 시간 기반 패턴이 채널 한두 개로 표현됩니다.

**약점**

- **channel proliferation** — 채널 수가 곧 *상태 변수의 수*입니다. 큰 시스템에서 추적이 어려워집니다.
- **debugging difficulty** — go 블록의 상태 머신 변환 때문에 스택 트레이스가 본래 코드 위치와 안 맞을 때가 있습니다.
- **no built-in supervision** — 채널을 사용하던 go 블록이 예외로 죽으면 채널은 *영원히 닫히지 않은 채* 남습니다.
- **분산 환경 부적합** — 채널은 in-process 추상입니다. 노드를 가로지르려면 별도 통신층이 필요합니다.

책의 Wrap-Up은 "어느 모델을 선택해야 하는가"라는 질문에 한 가지 잣대를 제시합니다. *시스템의 본질이 흐름인가, 격리인가*를 묻습니다. 데이터가 여러 단계를 거치며 변환되는 시스템, 입력의 종류가 많고 시간 기반 조합이 필요한 시스템에는 CSP가 맞습니다. 반대로 독립된 엔티티들이 각자의 상태를 가지고 장애를 견뎌야 하는 시스템에는 Actor가 맞습니다. 둘이 동시에 필요하면 *각 노드 안은 CSP, 노드 간은 Actor* 같은 조합도 가능합니다.

## 5.16 흔히 빠지는 함정

책과 실무 경험에서 반복되는 함정 다섯 가지입니다.

1. **`<!!` in `go`** — go 블록 안에서 blocking 연산자를 쓰면 dispatch thread를 점유합니다. 두세 번 쌓이면 시스템이 멎습니다.
2. **닫지 않은 채널** — sender가 더 보낼 게 없는데 close를 안 하면, `<!`로 기다리던 go 블록이 영원히 park된 채 남습니다.
3. **receiver가 close** — 닫기 책임은 *producer 쪽*입니다. consumer가 close하면 다른 sender가 IllegalStateException을 받습니다.
4. **buffer 미지정** — `chan`은 unbuffered입니다. 단순한 fire-and-forget이 의도라면 buffer를 명시해야 합니다.
5. **mutex로 충분한 곳에 채널** — 짧은 임계 영역, 단일 atomic 카운터는 channel보다 `atom` 또는 `swap!`가 더 명확합니다.

## 5.17 다른 CSP 구현과의 비교

책 본문이 짧게 언급하는 다른 구현들과의 위치 관계입니다.

| 구현 | 언어 | 특징 |
|---|---|---|
| core.async | Clojure / ClojureScript | macro로 상태 머신 변환, JVM + JS |
| occam | 별도 언어 | CSP를 *언어 차원에서* 직접 구현 (1980s) |
| Plan 9 `libthread` | C | OS 수준 코루틴 + channel |
| Java BlockingQueue | Java | 채널과 유사하지만 alts! 부재 |

책은 core.async의 macro 기반 접근이 *기존 언어*에 CSP를 끼워 넣는 한 가지 방법을 보여 준다는 점을 강조합니다. 언어를 새로 만들 필요 없이 매크로 한 겹으로 충분합니다.

## 5.18 web crawler 다시 보기 — channel 그래프

Day 2의 web crawler 예제를 책이 강조하는 *channel 그래프* 관점에서 다시 봅니다. 노드는 go 블록이고, 엣지는 채널입니다.

```text
        ┌──── urls ────┐
seed ──▶│              ▼
        │      worker × N   ──── thread (HTTP) ──── back to worker
        │              │
        └──◀ extract ──┘
                       │
                       ▼
                    results
```

이 그래프에서 *모든 결합점이 채널*입니다. worker의 수는 그래프의 모양을 바꾸지 않고 *N만 늘려서* 조정합니다. HTTP가 느린 사이트와 빠른 사이트가 섞여 있어도, 빠른 worker가 자연히 `urls` 채널에서 더 많은 일을 빼갑니다. 작업 분배가 채널의 의미상 자동입니다.

같은 그래프에 *rate limit*을 끼워 넣고 싶다면 한 단계를 추가하면 됩니다.

```clojure
(defn throttled [src per-ms]
  (let [out (chan)]
    (go-loop []
      (when-let [v (<! src)]
        (>! out v)
        (<! (timeout per-ms))
        (recur)))
    out))
```

`throttled`는 입력 채널을 받아 *지연을 추가한* 출력 채널을 돌려줍니다. crawler의 `urls` 채널을 이 함수에 통과시키기만 하면 fetch 속도가 자동으로 조절됩니다. 다른 코드는 한 줄도 바뀌지 않습니다. *흐름을 함수 합성으로 다루는* 사고가 책 전체를 관통합니다.

## 5.19 자기 점검

같은 챕터를 다 읽고 나면 다음을 자기 언어로 설명할 수 있어야 합니다.

- Hoare의 CSP가 4장의 Actor 모델과 다른 한 줄 짜리 핵심은 무엇인가
- unbuffered 채널의 rendezvous 의미는 어떻게 동기화를 만드는가
- `>!`/`<!`과 `>!!`/`<!!`이 같은 기호를 둘로 나눈 이유는 무엇인가
- `alts!`가 timeout과 폴링을 한 어휘로 통합하는 방식은 어떠한가
- `thread` 매크로가 IO를 channel 어휘로 끌어들이는 메커니즘은 무엇인가
- pipeline / mult / pub-sub이 어떤 종류의 흐름을 표현하는가
- ClojureScript의 typeahead 예제에서 debounce가 단 몇 줄로 표현되는 이유는 무엇인가
- 채널이 닫히지 않을 때 일어나는 일과 그 회피 방법은 무엇인가

## 정리

- **CSP**는 Hoare가 1978년 제안한 모델로, 채널이 first-class이고 메시지는 *identity 없이* 채널로 흐릅니다.
- **core.async**는 Clojure의 매크로로 go 블록을 상태 머신으로 변환합니다. Java thread를 점유하지 않고 수만 개의 프로세스를 띄울 수 있습니다.
- **Day 1**은 `chan`, `go`, `>!`/`<!`, parking vs blocking, rendezvous 의미를 다룹니다.
- **Day 2**는 `alts!`로 다중 채널 다중화, `timeout` 채널, `thread` 매크로로 IO 통합, `pipeline` 류 함수로 흐름 설계입니다.
- **Day 3**은 같은 모델을 ClojureScript에서 UI 이벤트와 AJAX에 적용해 typeahead 같은 패턴을 짧은 코드로 표현합니다.
- **mult / pub / sub**가 broadcast와 토픽 라우팅을 제공합니다.
- Actor와의 차이는 *identity 유무*와 *분산 친화성*입니다. CSP는 흐름 설계와 정적 분석에 강하고, Actor는 분산과 격리에 강합니다.

## 다음 장 예고

6장은 **Data Parallelism**입니다. CSP까지가 "여러 *서로 다른* 일을 동시에"였다면, 6장은 "*같은* 일을 수많은 데이터에 동시에" 하는 모델입니다. GPU와 SIMD가 무대 위로 올라옵니다. CSP가 흐름 설계의 모델이었다면, 데이터 병렬은 *물리적 동시 실행 폭*을 최대로 활용하는 모델입니다.

## 관련 항목

- [Ch 4: Actors](/blog/parallel/seven-concurrency-models/ch04-actors) — identity 기반 메시지 모델과 비교
- [Ch 6: Data Parallelism](/blog/parallel/seven-concurrency-models/ch06-data-parallelism) — 다음 장
- [AMP Ch 10: Concurrent Queues](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem) — 채널 구현의 기반
- [C++ Concurrency in Action Ch 4: Synchronization](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations) — 다른 언어에서의 같은 문제
