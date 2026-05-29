---
title: "Part 10-01: ProducerConsumerQueue (SPSC)"
date: 2026-05-24T22:00:00
description: "Part 10-01: ProducerConsumerQueue — SPSC lock-free ring buffer. cache line padding, acquire/release만으로 RTT을 줄이는 패턴."
series: "Folly Code Review"
seriesOrder: 45
tags: [cpp, folly, queue, spsc, lock-free]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::ProducerConsumerQueue<T>`는 한 명의 producer와 한 명의 consumer만을 가정한 **SPSC(single-producer single-consumer) lock-free ring buffer**다. 락이 없고 CAS도 없다. write/read 인덱스를 각각의 스레드만 갱신하며, 두 인덱스를 서로 다른 캐시 라인에 둬서 false sharing을 막는다.

## 동기 — 왜 SPSC인가

MPMC(multi-producer multi-consumer) 큐는 보편적이지만 비싸다. 매 push가 CAS이고, 모든 producer가 같은 tail을 두고 경쟁한다. 그러나 실제 시스템에서 "producer 1명, consumer 1명" 패턴은 굉장히 자주 나타난다.

- 네트워크 RX 인터럽트 스레드 → 워커 스레드
- 메인 스레드 → 렌더링 스레드 (frame queue)
- 오디오 콜백 → 오디오 디코더
- IOThreadPool의 한 EventBase → 다음 단계 큐

이런 경우 MPMC를 쓰는 것은 낭비다. SPSC를 쓰면 **CAS 없이 단순 load/store + memory barrier**만으로 충분하다. Folly의 측정으로 동일 메시지 크기 기준 MPMC 대비 RTT가 3-5배 줄어든다.

### Producer/Consumer 일반 패턴

SPSC, MPSC, MPMC 모두 이 일반 형태의 *변종*이다.

![Producer / consumer queue](/images/blog/cpp-concepts/diagrams/producer-consumer-queue.svg)

생산자가 큐에 enqueue, 소비자가 dequeue. capacity가 차면 backpressure — 생산자가 block / fail / drop. 변종은 producer/consumer 수와 blocking 정책(blocking vs lock-free, bounded vs unbounded)으로 갈린다.

## API

```cpp
#include <folly/ProducerConsumerQueue.h>

folly::ProducerConsumerQueue<int> q(1024); // 용량은 생성 시 고정

// Producer 스레드
if (!q.write(42)) {
  // queue가 가득 참 (non-blocking)
}

// Consumer 스레드
int v;
if (q.read(v)) {
  // v에 값이 들어옴
}
```

핵심 제약은 세 가지다.

1. **용량은 생성자에서 고정**. 동적 확장은 없다.
2. **단일 producer, 단일 consumer**. 두 명 이상이 동시에 write/read를 호출하면 UB.
3. **non-blocking**. queue가 가득/비어 있으면 write/read가 즉시 false를 돌려준다. busy wait은 호출자가 처리한다.

## 내부 구현 — read/write index의 분리

![SPSC ring buffer](/images/blog/folly/diagrams/part10-01-spsc-queue-ring.svg)

```cpp
template <class T>
struct ProducerConsumerQueue {
  const uint32_t size_;
  T* const records_;

  alignas(folly::cacheline_align_v) std::atomic<unsigned int> readIndex_;
  alignas(folly::cacheline_align_v) std::atomic<unsigned int> writeIndex_;
};
```

- `readIndex_`는 consumer만 store, producer는 load만 한다.
- `writeIndex_`는 producer만 store, consumer는 load만 한다.
- 두 인덱스 사이에 `alignas(cacheline)`를 박아 **false sharing**을 차단한다.

false sharing이 왜 문제인가. 두 인덱스가 같은 캐시 라인(64B)에 있으면, producer가 writeIndex_를 갱신할 때 consumer 코어의 readIndex_ 캐시 라인이 무효화된다. read는 캐시에서 가져올 수 있는 값을 매번 메모리에서 다시 가져온다. cacheline_align_v 하나로 RTT가 절반이 된다.

### write 구현

```cpp
template <class... Args>
bool write(Args&&... recordArgs) noexcept {
  auto const currentWrite = writeIndex_.load(std::memory_order_relaxed);
  auto nextRecord = currentWrite + 1;
  if (nextRecord == size_) nextRecord = 0;

  if (nextRecord != readIndex_.load(std::memory_order_acquire)) {
    new (&records_[currentWrite]) T(std::forward<Args>(recordArgs)...);
    writeIndex_.store(nextRecord, std::memory_order_release);
    return true;
  }
  return false; // full
}
```

핵심은 메모리 순서다.

- `readIndex_` load는 **acquire** — consumer가 끝까지 읽은 슬롯의 가시성을 보장.
- `writeIndex_` store는 **release** — 위 placement-new가 consumer에게 보이도록 publish.

이 두 fence만으로 happens-before가 성립한다. mutex도 CAS도 필요 없다.

### read 구현

```cpp
bool read(T& record) noexcept {
  auto const currentRead = readIndex_.load(std::memory_order_relaxed);
  if (currentRead == writeIndex_.load(std::memory_order_acquire)) {
    return false; // empty
  }

  auto nextRecord = currentRead + 1;
  if (nextRecord == size_) nextRecord = 0;

  record = std::move(records_[currentRead]);
  records_[currentRead].~T();
  readIndex_.store(nextRecord, std::memory_order_release);
  return true;
}
```

대칭적이다. `writeIndex_` acquire로 producer의 publish를 보고, `readIndex_` release로 슬롯이 비었음을 producer에게 알린다.

### 실용 크기 — size_ - 1

생성자가 `size_ = capacity + 1`로 잡는 이유가 있다. ring buffer에서 "가득 참"과 "비었음"을 구분하려면 한 슬롯을 비워둬야 한다. 1024개를 담고 싶다면 1025로 잡힌다.

## std / abseil 비교

| 큐 | 동시성 모델 | 락 | 동적 크기 | 비고 |
|-----|------------|-----|----------|------|
| `std::queue` + mutex | MPMC | yes | yes | 가장 단순. 대부분 충분 |
| `boost::lockfree::spsc_queue` | SPSC | no | no | 거의 동일한 설계 |
| `folly::ProducerConsumerQueue` | SPSC | no | no | cacheline 패딩이 명시적 |
| `folly::MPMCQueue` | MPMC | no | no | ticket-based, 다음 절 |

표준 라이브러리에는 SPSC 전용이 없다. boost::lockfree가 가장 가까운데, Folly와 거의 같은 구조다. 차이는 Folly가 jemalloc·cache-line 정렬·placement-new 같은 production 디테일을 더 노골적으로 드러낸다는 점이다.

## 코드 리뷰 포인트

### 1. capacity는 정말 충분한가

`write`가 false를 돌려주면 호출자가 처리해야 한다. 보통 두 가지 선택이다.

```cpp
// A) drop (실시간 시스템에서 자주 쓴다)
if (!q.write(sample)) {
  ++drops_;
}

// B) backoff
while (!q.write(sample)) {
  std::this_thread::yield();
}
```

backoff 패턴이 잦다면 capacity가 부족한 신호다. 큐 사용량을 측정하고 P99 기준으로 잡는다.

### 2. T의 소멸자 비용

read는 `records_[currentRead].~T()`로 명시 소멸을 호출한다. T가 무거우면(예: `std::string`을 가진 struct) consumer 핫 패스에서 비용이 발생한다. 가능하면 작은 POD나 `unique_ptr<Heavy>`로 감싸 소멸 비용을 producer 측으로 옮긴다.

### 3. emplace 대신 write의 가변 인자

```cpp
q.write(arg1, arg2, arg3); // T를 in-place 생성
```

`write(T&&)`만 있는 게 아니다. `write(Args&&...)`이 placement-new로 in-place 생성한다. 큰 객체를 큐에 넣을 때 이동·복사 비용을 한 번 더 줄인다.

### 4. producer/consumer 동일성 검증

런타임에 single-producer/single-consumer 제약을 강제하지 않는다. **테스트에서** 두 명 이상이 write를 호출하면 UB가 조용히 발생한다. PR 리뷰 시 "이 큐에 write는 어느 스레드만 하는가" 명시 주석을 요구한다.

```cpp
// 회피
folly::ProducerConsumerQueue<Frame> q(1024);
// 누가 write 하는지 코드만 봐서는 모름

// Good
// PRODUCER: AudioCallbackThread only
// CONSUMER: DecoderThread only
folly::ProducerConsumerQueue<Frame> q(1024);
```

## 안티패턴

### 1. wait 루프에서 sleep 없이 spin

```cpp
// 회피
int v;
while (!q.read(v)) {} // 100% CPU
```

empty 상태에서 read가 false면 코어가 통째로 타버린다. backoff 전략이 필요하다.

```cpp
// Good
int v;
while (!q.read(v)) {
  std::this_thread::yield(); // 또는 pause/sleep
}

// Better — Baton/EventFd로 wakeup
```

진짜 busy wait이 필요한 워크로드(예: 오디오 callback)는 spin이 의도된 것이고, 그 외에는 wakeup 메커니즘을 함께 둔다.

### 2. T가 noexcept move를 보장하지 않음

`read`가 `record = std::move(records_[currentRead]);`를 한다. T의 move가 throw하면 큐 상태가 망가진다. T는 noexcept-movable이어야 한다.

```cpp
static_assert(std::is_nothrow_move_assignable_v<T>);
```

### 3. ProducerConsumerQueue를 여러 producer에 공유

```cpp
// 회피 — UB
folly::ProducerConsumerQueue<int> q(1024);
std::thread p1([&]{ q.write(1); });
std::thread p2([&]{ q.write(2); }); // UB
```

이 경우는 다음 절의 `MPMCQueue`를 써야 한다.

## 정리

- ProducerConsumerQueue는 **SPSC 전용** lock-free ring buffer다.
- read/write index를 서로 다른 캐시 라인에 둬서 false sharing을 막는다.
- 메모리 순서는 producer release / consumer acquire 한 쌍이면 충분하다.
- capacity 고정, non-blocking, T는 noexcept-movable이어야 한다.
- "한 producer, 한 consumer" 패턴이 정확히 맞으면 MPMC보다 3-5배 빠르다.
- 한 명이 더 추가되는 순간 UB이므로 코드 주석으로 명시한다.

## 다음 편

[Part 10-02 MPMCQueue](/blog/programming/code-review/folly/part10-02-mpmc-queue) — multi-producer multi-consumer 버전. ticket-based 알고리즘으로 어떻게 락 없이 다자간 동시 접근을 처리하는지 본다.

## 관련 항목

- [Part 9-01 Synchronized](/blog/programming/code-review/folly/part9-01-synchronized) — 데이터에 락을 묶는 일반 패턴
- [Part 3-05 EventBase](/blog/programming/code-review/folly/part3-05-event-base) — EventBase 간 메시지 전달에 SPSC 자주 사용
- [Effective Modern C++ Item 41](/blog/programming/cpp/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params) — move semantics와 noexcept
