---
title: "Part 10-03: UnboundedQueue (동적 크기 lock-free)"
date: 2026-05-25T01:00:00
description: "Part 10-03: UnboundedQueue — linked segment 기반 동적 크기 lock-free 큐. SPSC 모드에선 거의 무비용으로 성장한다."
series: "Folly Code Review"
seriesOrder: 47
tags: [cpp, folly, queue, unbounded, lock-free]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::UnboundedQueue<T, ...>`는 **고정 크기가 없는** lock-free MPMC 큐다. 내부적으로 고정 크기 segment를 linked list로 연결하고, 한 segment가 가득 차면 새 segment를 alloc해서 이어붙인다. 동시성 모드(SPSC/MPSC/SPMC/MPMC)를 템플릿 인자로 선택할 수 있다.

## 동기 — bounded의 한계

MPMCQueue는 빠르지만 capacity를 미리 정해야 한다. capacity가 작으면 backpressure, 크면 메모리 낭비. workload가 burst-y하면 어느 값을 잡아도 어색하다.

UnboundedQueue는 "평소엔 작게, 필요할 때만 크게"의 정신이다.

- 평소엔 segment 한두 개로 운영.
- burst가 오면 segment가 자동 추가되어 producer가 막히지 않음.
- consumer가 따라잡으면 빈 segment는 자동 회수.

대가는 segment 경계에서 한 번의 atomic CAS와, 동적 할당 비용이다. 그러나 segment 크기가 충분하면 amortized 비용이 매우 낮다.

## API

```cpp
#include <folly/concurrency/UnboundedQueue.h>

// 템플릿 파라미터: T, SingleProducer, SingleConsumer, MayBlock, LgSegmentSize
folly::UMPMCQueue<Task, true /*MayBlock*/> q;       // MPMC + blocking 지원
folly::USPSCQueue<Task, false> q_spsc;              // SPSC, non-blocking

// Producer
q.enqueue(task);

// Consumer
auto t = q.dequeue();         // blocking
auto t = q.try_dequeue();     // non-blocking, returns Optional
auto t = q.try_dequeue_for(std::chrono::milliseconds(100));
```

별칭이 많다.

| alias | mode |
|-------|------|
| `USPSCQueue` | single producer, single consumer |
| `UMPSCQueue` | multi producer, single consumer |
| `USPMCQueue` | single producer, multi consumer |
| `UMPMCQueue` | multi producer, multi consumer |

mode가 더 제한적일수록 내부 path가 더 단순해진다. SPSC mode는 CAS 거의 없이 동작한다.

## 내부 구현 — segment chain

```cpp
struct Segment {
  std::array<Slot, kSegmentSize> slots;
  std::atomic<Segment*> next;
  uint64_t baseTicket;
};

alignas(cacheline) std::atomic<Segment*> head_;  // consumer 측
alignas(cacheline) std::atomic<Segment*> tail_;  // producer 측
alignas(cacheline) std::atomic<uint64_t> producerTicket_;
alignas(cacheline) std::atomic<uint64_t> consumerTicket_;
```

큐 전체는 MPMCQueue처럼 ticket으로 슬롯을 받는다. ticket의 상위 bit가 segment index, 하위 bit가 segment 내부 슬롯.

### enqueue

```cpp
void enqueue(T&& v) {
  auto ticket = producerTicket_.fetch_add(1);
  auto segIdx = ticket / kSegmentSize;
  auto slotIdx = ticket % kSegmentSize;

  Segment* seg = findOrAllocSegment(segIdx); // tail_을 따라가며 필요시 alloc
  seg->slots[slotIdx].store(std::move(v));
}
```

`findOrAllocSegment`가 핵심이다. tail_이 가리키는 segment를 따라가서, 필요하면 새 segment를 alloc해 next에 CAS로 연결한다. CAS 한 번이 segment 경계에서만 발생하므로 segment_size가 1024라면 1024 enqueue당 한 번꼴.

### dequeue

```cpp
T dequeue() {
  auto ticket = consumerTicket_.fetch_add(1);
  auto segIdx = ticket / kSegmentSize;
  auto slotIdx = ticket % kSegmentSize;

  Segment* seg = waitForSegment(segIdx); // head_부터 따라감
  return seg->slots[slotIdx].load();
}
```

consumer는 head_부터 segment chain을 따라가며 자기 segment를 찾는다. 이전 segment가 완전히 비면 GC 후보가 된다.

### Hazard pointer로 GC

segment 회수는 까다롭다. 어떤 consumer가 아직 segment를 참조 중일 수 있기 때문에 free하면 use-after-free. Folly는 `folly::hazptr`로 이를 처리한다. consumer가 segment를 참조하는 동안 hazard pointer에 등록하고, 모든 hazard에서 빠진 segment만 GC.

## std / abseil 비교

| 큐 | 동시성 모드 | bounded | 비고 |
|-----|------------|---------|------|
| `std::queue` + mutex | MPMC | unbounded | mutex 단일 hotspot |
| `folly::MPMCQueue` | MPMC만 | bounded | 가장 빠름, capacity 고정 |
| `folly::UnboundedQueue` | 4가지 | unbounded | segment chain |
| `concurrentqueue (moodycamel)` | MPMC | unbounded | 비슷한 설계, 외부 lib |

Meta 내부에선 burst workload(예: log ingestion)는 UnboundedQueue, 안정 load(예: RPC dispatch)는 MPMCQueue로 나눠 쓴다.

## 코드 리뷰 포인트

### 1. 적절한 동시성 mode 선택

```cpp
// 회피 — MPMC가 default라 안전해 보이지만 SPSC보다 5-10배 느림
folly::UMPMCQueue<int> q;

// Good — 알고 있다면 정확히 명시
folly::USPSCQueue<int> q;
```

mode가 더 제한적일수록 내부 atomic 연산이 줄어든다. "혹시나"라며 MPMC를 고르면 그만큼 비용을 낸다.

### 2. segment size 선택

`LgSegmentSize` 템플릿 파라미터(log2)가 segment 크기를 결정한다. default는 보통 8(=256슬롯)이나 9(=512).

- segment가 작으면: 새 segment alloc/free가 잦아진다 → CAS 비용 증가.
- segment가 크면: 메모리 fragmentation 줄어들지만, 마지막 segment가 partial 사용일 때 낭비.

burst 크기와 메모리 budget에 맞춰 조정.

### 3. MayBlock 의미

```cpp
folly::UMPMCQueue<T, true /*MayBlock*/> q;
```

MayBlock=true면 dequeue가 비어 있을 때 Baton으로 park한다. false면 try만 가능. blocking semantics이 필요 없으면 false가 더 가벼움.

### 4. 메모리 사용량 추정

```cpp
// 가득 찼을 때 메모리
peak_memory = peak_segment_count * (segment_size * sizeof(T) + overhead)
```

burst가 끝나도 segment는 GC가 들어와야 회수된다. metric으로 peak segment 수를 모니터링.

## 안티패턴

### 1. SPSC가 명확한데 UMPMCQueue를 default로

```cpp
// 회피
folly::UMPMCQueue<Frame> frameQ; // network thread → render thread
```

mode를 정확히 지정하면 thread 수만큼 throughput이 늘어난다.

### 2. unbounded라고 backpressure 없이 마구 enqueue

```cpp
// 회피
for (;;) {
  q.enqueue(make_log()); // consumer가 못 따라가면 메모리 폭주
}
```

unbounded는 OOM의 ticking bomb이다. queue size를 metric으로 보내고, threshold 넘으면 drop 또는 source throttle.

### 3. T가 큰 객체

```cpp
// 회피
folly::UMPMCQueue<LargeStruct> q; // 매 dequeue가 큰 복사
```

segment에 직접 저장되므로 큰 T는 segment alloc 비용을 키운다. `unique_ptr<LargeStruct>`로 감싸 포인터만 큐에 둔다.

## 정리

- UnboundedQueue는 **segment chain 기반** lock-free 동적 큐다.
- 동시성 mode(SPSC/MPSC/SPMC/MPMC)를 템플릿 인자로 선택해 내부 path를 최적화.
- segment 경계에서만 CAS가 발생하므로 amortized 비용 낮음.
- hazard pointer로 segment GC 처리.
- burst 워크로드에 적합. 안정 load는 MPMCQueue가 더 빠르다.
- unbounded는 backpressure 정책이 외부에 있어야 한다.

## 다음 편

[Part 10-04 fibers::Channel](/blog/programming/code-review/folly/part10-04-fibers-channel) — fiber 간 채널. Go의 channel과 비교하며 본다.

## 관련 항목

- [Part 10-02 MPMCQueue](/blog/programming/code-review/folly/part10-02-mpmc-queue) — bounded 사촌
- [Part 8-04 ConcurrentHashMap](/blog/programming/code-review/folly/part8-04-concurrent-hash-map) — hazard pointer 사용 다른 사례
- [Part 9-03 Baton](/blog/programming/code-review/folly/part9-03-baton) — MayBlock 모드의 wait 원리
