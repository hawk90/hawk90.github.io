---
title: "folly::fibers::Channel — Go-like channel"
date: 2026-06-06T09:12:00
description: "Part 10-04: fibers::Channel — fiber 간 producer/consumer 채널. Go의 channel과 비슷한 sync 점."
series: "Folly Code Review"
seriesOrder: 48
tags: [cpp, folly, fibers, channel, async]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::fibers::Channel<T>`는 **fiber 간 메시지 전달용 buffered/unbuffered 채널**이다. Go의 `chan T`와 형태가 유사하다. send/receive가 fiber를 suspend/resume시켜, 콜백 없이 동기적으로 보이는 코드로 fiber-safe producer/consumer를 만든다.

## 동기 — 왜 fiber 전용 채널이 따로 있나

OS 스레드용 MPMCQueue를 fiber에서 그대로 쓰면 문제가 생긴다.

- `blockingRead`가 OS 스레드를 park한다 → 그 스레드가 돌리던 다른 fiber도 함께 멈춤.
- fiber scheduler가 다른 fiber를 실행할 기회를 잃음.

fiber-safe 채널은 OS 스레드를 park하지 않고 **fiber만 suspend**한다. fiber scheduler가 같은 스레드에서 다른 fiber를 즉시 실행할 수 있다.

Go의 channel이 goroutine을 suspend하듯, folly fibers::Channel은 fiber를 suspend한다. 익숙한 비유 그대로 동작한다.

## API

```cpp
#include <folly/fibers/Channel.h>

folly::fibers::Channel<std::string> ch{4 /*capacity*/}; // buffered
folly::fibers::Channel<int> sync_ch{0};                  // unbuffered (rendezvous)

// fiber A
ch.send("hello"); // 버퍼 가득이면 fiber suspend

// fiber B
auto msg = ch.receive(); // Optional<T>, channel closed면 nullopt

// 채널 닫기
ch.close();
```

기본 사용법은 Go와 거의 동일하다. 차이는 select가 native syntax가 아니라 `folly::fibers::await` + multi-channel helper로 흉내내는 점.

## 내부 구현

```cpp
template <typename T>
class Channel {
  folly::MPMCQueue<T> queue_;
  folly::fibers::Baton readBaton_;
  folly::fibers::Baton writeBaton_;
  std::atomic<bool> closed_;
};
```

핵심은 두 가지.

1. `MPMCQueue`로 데이터 저장 — 일반 큐.
2. `fibers::Baton`으로 fiber suspend/resume — OS thread를 park하지 않고 fiber scheduler에게 양보.

### send 구현 개념

```cpp
void send(T v) {
  while (!queue_.writeIfNotFull(std::move(v))) {
    writeBaton_.wait(); // fiber suspend, scheduler에게 양보
  }
  readBaton_.post();    // receiver를 깨움
}
```

`writeBaton_.wait()`은 OS thread는 그대로 두고 현재 fiber만 suspend한다. scheduler가 다른 ready fiber를 실행한다. consumer가 receive하면 `writeBaton_.post()`로 producer fiber가 다시 runnable이 된다.

### receive 구현 개념

```cpp
Optional<T> receive() {
  T v;
  while (!queue_.read(v)) {
    if (closed_.load()) return std::nullopt;
    readBaton_.wait();
  }
  writeBaton_.post();
  return v;
}
```

대칭적이다. queue가 비어 있으면 fiber만 suspend하고, producer가 send하면 깨어난다.

### unbuffered (rendezvous)

capacity=0이면 send와 receive가 같은 시점에 만나야 한다(rendezvous). 구현은 buffered와 살짝 달라서, send가 receive를 대기한다. Go의 unbuffered channel과 의미가 같다.

## std / abseil 비교

| 통신 수단 | 동시성 단위 | 비고 |
|----------|------------|------|
| `std::queue` + mutex | thread | 가장 일반적, 콜백 패턴 없음 |
| `std::condition_variable` | thread | 직접 구현 필요 |
| `folly::MPMCQueue` | thread | lock-free, blocking은 thread park |
| `folly::fibers::Channel` | fiber | fiber만 suspend, scheduler-friendly |
| Go `chan T` | goroutine | 비교 대상. 가장 가까운 모델 |

표준 C++에는 fiber 자체가 없으므로 fiber-safe channel도 없다. C++20 coroutine으로 비슷한 걸 만들 수 있지만 별도 라이브러리(cppcoro, asio)에 의존해야 한다.

## 코드 리뷰 포인트

### 1. 정말 fiber 컨텍스트인가

```cpp
// 회피
folly::fibers::Channel<int> ch{4};
std::thread([&]{
  ch.receive(); // UB — fiber context 밖
}).detach();
```

`fibers::Channel`은 fiber context에서만 동작한다. OS 스레드에서 호출하면 Baton wait가 의도와 다르게 동작한다. **반드시 `FiberManager::addTask` 안에서 사용**.

### 2. close 안 하면 fiber leak

```cpp
// 회피
auto ch = std::make_shared<folly::fibers::Channel<int>>(4);
fm.addTask([ch]{
  while (auto v = ch->receive()) {
    process(*v);
  }
});
// producer 어디서도 close 안 함 → consumer fiber 영원히 대기
```

Go에서도 같다. producer가 끝나면 `ch.close()`를 호출해야 consumer가 `nullopt`로 빠져나간다.

### 3. capacity 선택

- **0 (unbuffered)**: producer와 consumer가 lock-step으로 진행. 동기화 보장이 강하지만 throughput 낮음.
- **1~수십 (buffered)**: 약간의 burst 흡수. 일반적 선택.
- **큼**: 메모리 부담 + latency 증가 위험.

burst 패턴을 보고 정한다. 모르면 4~16으로 시작.

### 4. multiple consumer/producer

Channel은 N:M을 지원한다. 그러나 fiber 수가 많아지면 baton 경합이 늘어난다. 정말 N:M이 필요한지 확인하고, 1:N 또는 N:1이면 그 사실을 주석으로 명시.

## 안티패턴

### 1. fiber 안에서 OS thread용 큐를 blocking 호출

```cpp
// 회피
fm.addTask([&]{
  Task t;
  mpmcQueue.blockingRead(t); // OS thread 통째로 park → 같은 스레드의 모든 fiber 멈춤
});

// Good
fm.addTask([&]{
  auto t = fibersChannel.receive();
});
```

fiber 안에서 OS thread API를 blocking으로 호출하는 것은 fiber model의 가장 흔한 실수다.

### 2. close 후 send

```cpp
ch.close();
ch.send(42); // exception 또는 무시
```

Go와 동일하게 close 후 send는 오류다. producer 종료 신호로만 close 사용.

### 3. select 없이 다중 채널 polling

```cpp
// 회피 — 한 채널만 받음
auto v = ch1.receive();
```

여러 채널을 모니터링하려면 `folly::fibers::await`로 양쪽 baton을 합쳐야 한다. native select가 없으므로 helper로 처리.

## 정리

- fibers::Channel은 **fiber-safe** producer/consumer 채널이다.
- send/receive가 OS thread를 park하지 않고 fiber만 suspend.
- 내부는 MPMCQueue + fiber Baton 조합.
- Go의 `chan T`와 사용법이 유사. buffered/unbuffered 모두 지원.
- 반드시 fiber context 안에서 사용, close로 cleanup 신호 보내야 한다.
- 다중 채널 select는 native syntax 없이 await + helper로.

## 다음 편

[Part 11-01 folly::dynamic](/blog/programming/code-review/folly/part11-01-dynamic) — Part 11 시작. JSON-like 동적 타입 시스템을 다룬다.

## 관련 항목

- [Part 2-07 Fibers](/blog/programming/code-review/folly/part2-07-fibers) — fiber 기본 모델
- [Part 9-03 Baton](/blog/programming/code-review/folly/part9-03-baton) — Channel의 wait/notify 토대
- [Part 10-02 MPMCQueue](/blog/programming/code-review/folly/part10-02-mpmc-queue) — 내부 저장소
