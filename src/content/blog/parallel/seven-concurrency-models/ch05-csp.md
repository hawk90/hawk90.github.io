---
title: "Chapter 5: Communicating Sequential Processes (CSP)"
date: 2026-05-22T05:00:00
description: "Hoare의 CSP — 채널 중심, identity 없는 메시지. Go goroutine, Clojure core.async."
series: "Seven Concurrency Models in Seven Weeks"
seriesOrder: 5
tags: [parallel, concurrency, book-review, csp, go, channels, core-async]
type: book-review
bookTitle: "Seven Concurrency Models in Seven Weeks"
bookAuthor: "Paul Butcher"
draft: true
---

> **Seven Concurrency Models in Seven Weeks** Chapter 5 요약

## 5.1 CSP — 채널 중심 동시성

C.A.R. Hoare가 1978년 제안. *Communicating Sequential Processes*.

**핵심 차이 — Actor vs CSP**:

```
Actor: 메시지는 *receiver actor*에게 보낸다
       (receiver의 identity가 중요)

CSP:   메시지는 *channel*로 보낸다
       (sender도 receiver도 모름)
```

```
Actor:
  Sender ──msg──▶ Receiver

CSP:
  Sender ──▶ [Channel] ──▶ Receiver
              ↑              ↑
           쪽 모름        쪽 모름
```

## 5.2 Go — CSP의 현대 구현

Go의 슬로건: *Don't communicate by sharing memory; share memory by communicating*.

```go
ch := make(chan int)

go func() {
    ch <- 42  // 채널에 보냄
}()

value := <-ch  // 채널에서 받음
fmt.Println(value)  // 42
```

- `chan T` — 채널 타입
- `<- ch` — 받기
- `ch <- x` — 보내기
- `go fn()` — goroutine 시작 (가벼운 스레드)

## 5.3 Goroutine — 가벼운 스레드

```go
go func() {
    fmt.Println("running")
}()
```

```
OS Thread:  수 MB 스택
Goroutine:  ~8 KB 시작, 동적 확장

→ 수십만 개 동시 가능
```

Go runtime이 M:N 스케줄링 — N개 goroutine을 M개 OS thread에 매핑. work-stealing.

## 5.4 Buffered vs Unbuffered

```go
ch1 := make(chan int)        // unbuffered
ch2 := make(chan int, 10)    // buffered, capacity 10

// Unbuffered: sender와 receiver가 *만남* (rendezvous)
ch1 <- 1  // receiver가 받을 때까지 블록
v := <-ch1  // sender가 보낼 때까지 블록

// Buffered: 큐처럼
ch2 <- 1  // 버퍼 안 차면 즉시
ch2 <- 2
v := <-ch2  // 즉시 (1 받음)
```

Unbuffered는 *동기화*, buffered는 *비동기 큐*.

## 5.5 Select — 다중 채널

```go
select {
case msg1 := <-ch1:
    fmt.Println("from ch1:", msg1)
case msg2 := <-ch2:
    fmt.Println("from ch2:", msg2)
case ch3 <- value:
    fmt.Println("sent to ch3")
default:
    fmt.Println("none ready")
}
```

여러 채널 중 *준비된 것*을 선택. CSP의 가장 강력한 기능.

## 5.6 흔한 패턴 — Producer/Consumer

```go
func producer(ch chan<- int) {
    for i := 0; i < 10; i++ {
        ch <- i
    }
    close(ch)  // 더 이상 안 보냄
}

func consumer(ch <-chan int) {
    for v := range ch {  // 채널 닫힐 때까지
        fmt.Println(v)
    }
}

func main() {
    ch := make(chan int)
    go producer(ch)
    consumer(ch)
}
```

`chan<-` 보내기 전용, `<-chan` 받기 전용 — *타입으로 방향 제약*.

## 5.7 Pipeline 패턴

```go
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

func main() {
    // 1, 4, 9, 16, 25
    for v := range square(generate(1, 2, 3, 4, 5)) {
        fmt.Println(v)
    }
}
```

함수형의 map / filter / reduce를 *채널로* 표현. 각 단계가 독립 goroutine.

## 5.8 Fan-out / Fan-in

```go
// Fan-out: 한 채널 → 여러 worker
func worker(id int, in <-chan int, out chan<- int) {
    for n := range in {
        out <- process(n)
    }
}

// Fan-in: 여러 채널 → 한 채널
func merge(channels ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup
    for _, c := range channels {
        wg.Add(1)
        go func(ch <-chan int) {
            for v := range ch {
                out <- v
            }
            wg.Done()
        }(c)
    }
    go func() { wg.Wait(); close(out) }()
    return out
}
```

워크 분산 + 결과 수합. 분산 데이터 처리의 전형.

## 5.9 Context — 취소와 타임아웃

```go
import "context"

func work(ctx context.Context) error {
    ch := slowOperation()
    select {
    case v := <-ch:
        return process(v)
    case <-ctx.Done():
        return ctx.Err()  // canceled or deadline exceeded
    }
}

ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()
work(ctx)
```

`context.Context`가 Go의 *cancel signal* 표준. 모든 I/O 함수가 받는 게 관례.

## 5.10 Clojure core.async

JVM/JS에서 CSP.

```clojure
(require '[clojure.core.async :as a :refer [chan go <! >! close!]])

(def ch (chan))

(go (>! ch "hello"))  ;; goroutine-like
(go (println (<! ch)))  ;; "hello"
```

매크로 변환으로 *호출 스택을 상태 머신*으로 변환. Java 스레드를 절약.

## 5.11 CSP의 함정

```
1. Channel deadlock — A는 B 기다리고 B는 A 기다림
2. Goroutine leak — 채널이 영원히 안 닫혀 goroutine이 멈춤
3. 무한 buffer 채널 — 메모리 폭발
4. Channel을 lock처럼 쓰는 오용 — mutex가 더 명확한 경우 많음
```

```go
// Lock 패턴이 더 명확한 경우
mu := sync.Mutex{}
mu.Lock()
counter++
mu.Unlock()

// channel로 흉내내면 오버킬
ch := make(chan struct{}, 1)
ch <- struct{}{}
counter++
<-ch
```

Go 문서 자체가 *적절한 도구 사용*을 권장.

## 5.12 Actor vs CSP — 깊은 비교

| 측면 | Actor | CSP |
|---|---|---|
| 메시지 대상 | 특정 actor | 채널 |
| 결합도 | sender가 receiver 식별 | 결합 없음 |
| 분산 | 자연스러움 (Erlang) | 채널은 보통 노드 내 |
| 큐 | actor 하나당 mailbox | 채널 하나당 큐 |
| 패턴 매칭 | 가능 (Erlang) | select |
| Fault tolerance | supervisor | 명시적 처리 |

CSP는 *흐름 설계*에 명확. Actor는 *분산 + 격리*에 강점.

## 정리

- **CSP** — Hoare의 모델, *채널*이 중심
- **Goroutine** — Go의 가벼운 스레드, work-stealing
- **Buffered vs Unbuffered** — 비동기 큐 vs 동기 rendezvous
- **select** — 여러 채널 다중화
- **Pipeline / Fan-out / Fan-in** — 데이터 흐름 패턴
- **Context** — cancel / timeout 표준
- Actor와 다른 점 — *identity 없는 메시지*

## 한국 개발자의 함정

```
1. *Go = goroutine + channel*이라는 단순화
   - 짧은 임계 영역은 sync.Mutex가 더 명확
   - 표준 도구도 함께 사용

2. *Buffered channel = 무한 큐*라는 오해
   - 용량 지정 필수
   - 미지정은 unbuffered

3. *Channel close는 sender만*이라는 규칙
   - receiver가 닫으면 panic
   - 책임 분명히

4. *Goroutine leak*에 대한 무관심
   - 안 닫힌 채널 → 영원히 대기
   - context로 cancel 전파

5. *CSP가 Actor 대체*라는 단순화
   - 분산은 actor가 강점
   - 단일 노드 흐름 설계는 CSP
```

## 실무 적용

```
이론 → 실무:
- Goroutine + channel  → Go (사실상 표준)
- core.async           → Clojure / ClojureScript
- occam                → 학술 / 임베디드
- libthread            → Plan 9
- Kotlin coroutines    → Go-like + JVM

설계 패턴:
- API 서버 → goroutine per request
- Pipeline → producer → worker → aggregator
- Worker pool → fan-out + fan-in
- Timeout → context.WithTimeout + select
- Pub/sub → channel broadcaster

언제 CSP:
- 데이터 흐름이 명확
- 단일 머신 동시성
- I/O 다중화

언제 Actor:
- 분산 시스템
- 격리된 상태 관리
- Fault tolerance 우선

언제 락:
- 짧은 임계 영역
- 단일 변수 보호
```

## 자기 점검

```
□ Actor와 CSP의 핵심 차이?
□ Buffered vs Unbuffered channel?
□ select의 multiplexing 역할?
□ Pipeline 패턴의 단계 구성?
□ Goroutine leak 방지 방법?
□ context의 cancel propagation?
```

## 다음 장 예고

Ch 6 — **Data Parallelism**. GPU / SIMD — 한 명령으로 수천 데이터.

## 관련 항목

- [Ch 4: Actors](/blog/parallel/seven-concurrency-models/ch04-actors)
- [Ch 6: Data Parallelism](/blog/parallel/seven-concurrency-models/ch06-data-parallelism)
- [AMP Ch 10: Concurrent Queues](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem) — 채널 구현 기반
- [C++ Concurrency in Action Ch 4: Synchronization](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations)
