---
title: "Part 10-02: MPMCQueue (multi-producer multi-consumer)"
date: 2026-05-24T23:00:00
description: "Part 10-02: MPMCQueue — ticket 기반 lock-free 큐. CAS 없이 여러 producer/consumer를 안전하게 처리한다."
series: "Folly Code Review"
seriesOrder: 46
tags: [cpp, folly, queue, mpmc, lock-free]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::MPMCQueue<T>`는 N명의 producer와 M명의 consumer를 가정한 **ticket-based lock-free 큐**다. push/pop마다 fetch_add로 ticket을 발급하고, 슬롯별 sequence 비교로 wait/notify를 흉내낸다. 한 슬롯당 mutex 하나 없이 strict FIFO를 보장한다.

## 동기 — 왜 ticket인가

SPSC와 달리 MPMC는 본질적으로 경쟁이 있다. 단순히 mutex로 잠그면 producer 수와 throughput이 반비례한다. CAS 루프로 head/tail을 갱신하는 방식도 있지만, CAS 실패가 누적되면 thundering herd가 생긴다.

ticket-based 알고리즘은 다른 접근이다. 모든 producer가 `fetch_add(1)`로 자기 ticket(슬롯 인덱스)을 받고, 받은 슬롯에 단독으로 쓴다. 다른 producer와 같은 슬롯에서 충돌하지 않으므로 CAS 루프가 없다. 슬롯이 비어 있는지(consumer가 비웠는지)만 슬롯 내부의 sequence 카운터로 확인한다.

이 알고리즘은 Vyukov의 bounded MPMC queue로 잘 알려져 있고, Folly는 그것을 cache-line 정렬과 적응형 spin/block까지 더해 production-ready로 다듬었다.

### Producer/Consumer 그림

MPMC는 producer N + consumer M의 가장 일반적인 형태다.

![Producer / consumer queue](/images/blog/cpp-concepts/diagrams/producer-consumer-queue.svg)

여러 생산자/소비자가 공유 큐를 두고 경쟁한다. capacity가 차면 producer가 block, 비면 consumer가 block — 양방향 backpressure가 자연스럽게 생긴다.

## API

```cpp
#include <folly/MPMCQueue.h>

folly::MPMCQueue<Task> q(1024);

// Producer (N명)
q.blockingWrite(task);    // 큐 가득 차면 대기
q.write(task);            // non-blocking, false on full
q.writeIfNotFull(task);   // 같음

// Consumer (M명)
Task t;
q.blockingRead(t);        // 비었으면 대기
q.read(t);                // non-blocking, false on empty
```

`folly::DynamicBoundedQueue`와 `folly::UnboundedQueue`도 같은 가족인데, MPMCQueue는 그 중 가장 단순한 **bounded** 버전이다.

## 내부 구현 — slot의 sequence

![MPMC ticket-based queue](/images/blog/folly/diagrams/part10-02-mpmc-queue.svg)

```cpp
struct Slot {
  std::atomic<uint32_t> sequence;
  T data;
};

Slot* slots_;
size_t capacity_;

alignas(cacheline) std::atomic<uint64_t> pushTicket_;
alignas(cacheline) std::atomic<uint64_t> popTicket_;
```

각 슬롯에 `sequence`가 있다. 초기값은 슬롯 인덱스다(slot[0].sequence = 0, slot[1].sequence = 1, ...).

`alignas(cacheline)`이 *왜* 필요한지 짚어 보자. push 쪽과 pop 쪽이 같은 cache line에 있으면:

![False sharing on cache line](/images/blog/cpp-concepts/diagrams/false-sharing-cacheline.svg)

producer가 `pushTicket_++`만 해도 consumer의 cache line이 invalidate되어 `popTicket_` 읽기에 cache miss가 난다 — 두 변수가 *독립*인데도 그렇다. cache-line aligned로 두 변수를 분리하면 ping-pong이 사라진다.

### enqueue 알고리즘

```cpp
void blockingWrite(T&& v) {
  auto ticket = pushTicket_.fetch_add(1, std::memory_order_acq_rel);
  auto idx = ticket % capacity_;
  auto& slot = slots_[idx];

  // 이 슬롯의 sequence가 ticket과 같아질 때까지 대기
  while (slot.sequence.load(std::memory_order_acquire) != ticket) {
    spin_or_park();
  }

  new (&slot.data) T(std::move(v));
  slot.sequence.store(ticket + 1, std::memory_order_release);
}
```

해석하자면.

1. `pushTicket_`에서 자기 ticket을 받는다. 이건 fetch_add라 절대 충돌 안 한다.
2. ticket % capacity로 슬롯을 정한다.
3. 슬롯의 sequence == ticket이면 "내가 쓸 차례". 그렇지 않으면 이전 round의 consumer가 아직 안 비웠다는 뜻이라 기다린다.
4. 데이터 쓰고 sequence를 ticket+1로 올린다 → consumer에게 "여기 데이터 있음" 신호.

### dequeue

```cpp
void blockingRead(T& v) {
  auto ticket = popTicket_.fetch_add(1, std::memory_order_acq_rel);
  auto idx = ticket % capacity_;
  auto& slot = slots_[idx];

  // sequence가 ticket+1이 될 때까지 대기 (producer 완료 신호)
  while (slot.sequence.load(std::memory_order_acquire) != ticket + 1) {
    spin_or_park();
  }

  v = std::move(slot.data);
  slot.data.~T();
  slot.sequence.store(ticket + capacity_, std::memory_order_release);
}
```

consumer는 ticket+1을 기다리고, 다 읽으면 sequence를 ticket+capacity로 올린다. 그러면 다음 round의 producer가 그 슬롯에 쓸 수 있다.

### 적응형 spin

`spin_or_park`은 처음 몇 번은 spin(`_mm_pause`), 그 후에도 안 풀리면 `Baton::wait`로 park한다. 짧은 경합은 spin이 빠르고, 긴 경합은 park가 CPU를 살린다. tuning constant(`SpinCount`)는 워크로드별로 조정 가능하다.

## std / abseil 비교

| 큐 | 동시성 | 락 | 크기 | 비고 |
|-----|-------|-----|------|------|
| `std::queue` + mutex + cv | MPMC | yes | 동적 | 단순. baseline. |
| `boost::lockfree::queue` | MPMC | no | 둘 다 | CAS-based. ABA 카운터 |
| `folly::MPMCQueue` | MPMC | no | bounded | ticket-based, 더 빠름 |
| `folly::DynamicBoundedQueue` | MPMC | no | bounded | MPMCQueue + 동적 capacity |
| `folly::UnboundedQueue` | MPMC | no | unbounded | 다음 절 |

표준에는 lock-free MPMC가 없다. boost::lockfree::queue는 CAS-based여서 경합 시 retry가 발생한다. Folly의 ticket 방식은 retry가 없고, 슬롯별 spin/park만 있어 throughput이 안정적이다. Meta의 RPC 백엔드 큐는 거의 모두 MPMCQueue로 통일되어 있다.

## 코드 리뷰 포인트

### 1. capacity는 2의 거듭제곱일 필요는 없다

내부 구현은 `ticket % capacity`로 인덱스를 정한다. capacity가 2^n이면 컴파일러가 `& (capacity-1)`로 최적화하지만, 그게 아니라도 동작한다. 메모리 사용량이 더 중요하면 정확한 capacity를 잡는다.

### 2. blockingWrite vs writeIfNotFull

```cpp
// blockingWrite: 가득 차면 영원히 대기
q.blockingWrite(task);

// writeIfNotFull: 가득 차면 즉시 false
if (!q.writeIfNotFull(task)) {
  rejectTask(task);
}
```

production 시스템에서 `blockingWrite`는 위험하다. consumer가 죽으면 producer가 그대로 멈춘다. **backpressure 정책을 명시**하고 가능하면 `writeIfNotFull` + 명시적 reject로 처리한다.

### 3. 큐 이름과 capacity로 메모리 추정

```cpp
folly::MPMCQueue<LargeStruct> q(100000);
// 메모리 = 100000 * (sizeof(LargeStruct) + sizeof(uint32_t)) + 알파
```

bounded 큐는 생성 시점에 전체 메모리를 확보한다. T가 크고 capacity가 크면 수백 MB를 한 번에 잡는다. PR 리뷰에서 capacity 숫자가 적절한지 확인한다.

### 4. fairness — strict FIFO

ticket 알고리즘은 FIFO를 정확히 보장한다. 어떤 producer도 추월할 수 없고, 어떤 consumer도 새치기할 수 없다. 이게 장점이지만, ticket을 받은 후에 죽거나 멈춘 스레드가 있으면 그 슬롯에서 모든 후속 작업이 막힐 수 있다. consumer가 hang하지 않도록 watchdog 필요.

## 안티패턴

### 1. capacity를 작게 잡고 backpressure 없이 blockingWrite

```cpp
// 회피
folly::MPMCQueue<Task> q(16); // 너무 작음
for (auto& task : tasks_1000) {
  q.blockingWrite(std::move(task)); // 17번째부터 모두 block
}
```

producer가 consumer를 추월하는 워크로드에서 capacity 부족 + blocking은 thread starvation을 만든다. 큐 사용량 모니터링 + writeIfNotFull로 reject path를 둔다.

### 2. consumer 쪽에서 무거운 작업

```cpp
// 회피
Task t;
q.blockingRead(t);
heavy_cpu_work(t); // 다음 read 차례인 ticket 보유자가 영원히 대기
```

consumer가 read 후 무거운 작업을 동기로 하면 다른 consumer가 자기 ticket 슬롯에 들어가지 못한다. read는 빠르게 마치고 작업은 별도 executor로 보낸다.

### 3. MPMCQueue를 SPSC 자리에 쓰기

```cpp
// 회피 — 동작은 하지만 5배 느림
folly::MPMCQueue<int> q(1024);
// producer 1명, consumer 1명만
```

SPSC 패턴이 확실하면 ProducerConsumerQueue가 훨씬 빠르다.

## 정리

- MPMCQueue는 **ticket-based lock-free** MPMC 큐다.
- 슬롯별 sequence로 wait/notify를 흉내낸다. CAS 루프가 없다.
- 짧은 경합은 spin, 긴 경합은 Baton park로 자동 전환.
- bounded이므로 capacity 정책과 backpressure를 항상 함께 설계한다.
- strict FIFO 보장. consumer hang은 큐 전체를 막을 수 있다.
- SPSC 패턴이면 ProducerConsumerQueue로 다운그레이드한다.

## 다음 편

[Part 10-03 UnboundedQueue](/blog/programming/code-review/folly/part10-03-unbounded-queue) — capacity 고정 없는 동적 lock-free 큐. linked segment로 어떻게 성장하는지 본다.

## 관련 항목

- [Part 10-01 ProducerConsumerQueue](/blog/programming/code-review/folly/part10-01-producer-consumer-queue) — SPSC 버전
- [Part 9-03 Baton](/blog/programming/code-review/folly/part9-03-baton) — spin/park hybrid의 토대
- [Part 3-02 CPUThreadPoolExecutor](/blog/programming/code-review/folly/part3-02-cpu-thread-pool-executor) — executor 내부에서 MPMCQueue 사용
