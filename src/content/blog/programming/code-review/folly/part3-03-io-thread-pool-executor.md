---
title: "Part 3-03: IOThreadPoolExecutor — libevent 기반 I/O pool"
date: 2026-05-23T15:00:00
description: "IOThreadPoolExecutor는 각 worker thread에 EventBase를 두어 libevent 기반 I/O와 timer를 처리한다."
series: "Folly Code Review"
seriesOrder: 15
tags: [cpp, folly, executor, io, libevent]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true
---

> **한 줄 요약**: `IOThreadPoolExecutor`는 worker thread마다 `EventBase`를 두어 *file descriptor 이벤트와 timer*를 처리한다. 동일 pool 안의 다른 thread에 dispatch도 지원한다.

## 동기 — I/O가 CPU와 다른 이유

CPU 작업은 *thread를 점유*하다 완료된다. I/O 작업은 *대기 시간이 길다*. read/write가 1ms 이내에 끝나더라도 그동안 CPU thread를 들고 있을 이유가 없다.

해법은 두 가지다.

1. **blocking I/O + 많은 thread** — thread 수 = 동시 연결 수
2. **non-blocking I/O + event loop** — thread 수 = CPU 코어

Folly는 (2)를 택했다. `IOThreadPoolExecutor`의 각 worker는 *libevent 기반 event loop*을 돈다. 동시에 수천 연결을 *몇 개의 thread*로 처리한다.

## 기본 사용

```cpp
#include <folly/executors/IOThreadPoolExecutor.h>
#include <folly/io/async/EventBase.h>

folly::IOThreadPoolExecutor io(4);   // 4 EventBase, 각 thread당 1개

// EventBase 직접 가져오기
auto* evb = io.getEventBase();   // round-robin으로 선택

evb->runInEventBaseThread([] {
  // 이 lambda는 EventBase loop 안에서 실행됨
  registerSocket(...);
});

// 또는 add()로 단순 schedule
io.add([] { doIoWork(); });
```

## 구조

```cpp
// folly/executors/IOThreadPoolExecutor.h (요약)
class IOThreadPoolExecutor : public IOExecutor, public ThreadPoolExecutor {
 public:
  IOThreadPoolExecutor(
      size_t numThreads,
      std::shared_ptr<ThreadFactory> threadFactory =
          std::make_shared<NamedThreadFactory>("IOThreadPool"),
      folly::EventBaseManager* ebm = folly::EventBaseManager::get(),
      Options options = {});

  EventBase* getEventBase() override;   // round-robin
  std::vector<EventBase*> getAllEventBases();
  void add(Func) override;
};
```

`getEventBase()`는 round-robin으로 worker를 고른다. 같은 connection은 *같은 EventBase에 pin*하는 게 권장이다(cache locality + lock-free state).

## EventBase per thread 모델

```text
Pool (4 threads)
├── Thread 0 ── EventBase 0 ── [event_base_loop()]
├── Thread 1 ── EventBase 1 ── [event_base_loop()]
├── Thread 2 ── EventBase 2 ── [event_base_loop()]
└── Thread 3 ── EventBase 3 ── [event_base_loop()]
```

각 thread는 *자기 EventBase의 loop만 돈다*. 다른 EventBase의 state에 직접 접근하면 race다. 반드시 `evb->runInEventBaseThread(fn)`으로 cross-thread message를 보낸다.

## CPU vs IO pool — 분리의 이유

```cpp
// 안티패턴 — 같은 pool로 CPU + I/O
folly::CPUThreadPoolExecutor pool(8);
pool.add([] {
  auto data = read(fd, ...);   // blocking I/O → CPU thread starve
  process(data);
});

// 권장 — 분리
folly::IOThreadPoolExecutor io(2);
folly::CPUThreadPoolExecutor cpu(8);

io.getEventBase()->runInEventBaseThread([&] {
  auto data = readAsync(fd);    // non-blocking
  data.via(&cpu).thenValue(process);
});
```

I/O thread는 *대부분 idle*이지만 *수많은 event를 처리*해야 한다. CPU thread는 *항상 busy*이지만 *blocking이 없어야* 한다. 분리하면 둘 다 효율적이다.

## EventBase와의 관계

`IOThreadPoolExecutor`는 EventBase들을 *소유*한다. 단일 EventBase를 직접 만들어 single-threaded I/O loop을 돌릴 수도 있다.

```cpp
// 단일 EventBase — single thread
folly::EventBase evb;
std::thread t([&] { evb.loopForever(); });

evb.runInEventBaseThread([] { ... });

evb.terminateLoopSoon();
t.join();
```

`IOThreadPoolExecutor`는 이를 *N개 thread로 확장*한 모양이다.

## 사용 패턴

### 1. Socket 등록

```cpp
class MyClient : public folly::AsyncSocket::ConnectCallback {
  void connectSuccess() noexcept override { ... }
  void connectErr(folly::AsyncSocketException const&) noexcept override { ... }
};

io.getEventBase()->runInEventBaseThread([&] {
  auto sock = folly::AsyncSocket::newSocket(io.getEventBase());
  sock->connect(&client, addr);
});
```

### 2. Timer

```cpp
io.getEventBase()->runAfterDelay(
    [] { LOG(INFO) << "5s elapsed"; },
    5000);
```

### 3. Future continuation

```cpp
fetchAsync(url)
  .via(io.getEventBase())     // EventBase는 Executor 인터페이스 구현
  .thenValue([](Response r) { ... });
```

`EventBase`는 `folly::Executor`를 구현하므로 `.via(eb)`로 직접 바인딩된다.

## Connection pinning

```cpp
// 같은 connection은 같은 EventBase에 pin
class Connection {
  folly::EventBase* evb_;   // 생성 시 한 번 정함

 public:
  Connection(folly::IOThreadPoolExecutor& pool)
      : evb_(pool.getEventBase()) {}

  void send(Msg m) {
    evb_->runInEventBaseThread([this, m = std::move(m)]() mutable {
      writeImpl(std::move(m));
    });
  }
};
```

연결마다 다른 EventBase를 쓰면 *state lock*이 필요하다. 같은 EventBase로 pin하면 *모든 I/O가 single-threaded* 의미가 되어 lock이 사라진다.

## 코드 리뷰 포인트

- **CPU 작업이 IO pool에서 도는가?** `.via(&cpu_pool)`로 옮긴다.
- **EventBase state에 외부 thread가 직접 접근하는가?** `runInEventBaseThread` 사용.
- **connection이 매번 다른 EventBase로 흩어지는가?** pin 패턴 검토.
- **thread 수가 CPU 코어 수와 일치하는가?** I/O pool은 보통 *CPU 코어 수의 절반*으로 충분하다.

## 자주 보는 안티패턴

```cpp
// 1. IOThreadPoolExecutor에서 blocking call
io.add([] {
  std::this_thread::sleep_for(std::chrono::seconds(1));   // EventBase loop 멈춤
});

// 2. 다른 EventBase의 socket을 직접 조작
auto* other = io.getAllEventBases()[1];
sock->setEventBase(other);   // race — other가 loop 중일 수 있음

// 3. EventBase loop이 안 도는데 schedule
folly::EventBase evb;
evb.runAfterDelay([] { ... }, 1000);
// evb.loopForever() 호출 안 함 — callback 실행 안 됨

// 4. IO pool에서 expensive computation
io.add([&] {
  for (auto& item : million_items) compute(item);   // 다른 connection이 처리 안 됨
});
```

## std와 비교

표준에는 없다. C++26 `std::execution`의 `std::execution::io_context`(가칭)가 등장할 가능성이 있다. asio의 `io_context`와 개념적으로 유사하다.

```text
folly::EventBase            ≈ asio::io_context
folly::IOThreadPoolExecutor ≈ multi-threaded io_context pool
runInEventBaseThread        ≈ post() / dispatch()
```

## 정리

- `IOThreadPoolExecutor`는 worker thread마다 EventBase를 두어 libevent 기반 I/O를 처리한다.
- 각 EventBase의 state는 *해당 thread에서만* 접근한다. cross-thread는 `runInEventBaseThread`로.
- I/O와 CPU 작업을 *별도 pool로 분리*해 starvation을 피한다.
- 같은 connection은 같은 EventBase에 pin해 lock을 제거한다.
- `EventBase`는 `Executor` 인터페이스를 구현해 Future `.via(eb)`로 바인딩 가능하다.
- C++26 표준이 도착하면 `std::execution::io_context`로 대체 가능한 영역이다.

## 다음 편

[Part 3-04: ManualExecutor](/blog/programming/code-review/folly/part3-04-manual-executor)에서 결정적 테스트를 위한 수동 진행 executor를 본다.

## 관련 항목

- [Folly Part 3-02 — CPUThreadPoolExecutor](/blog/programming/code-review/folly/part3-02-cpu-thread-pool-executor)
- [Folly Part 3-05 — EventBase](/blog/programming/code-review/folly/part3-05-event-base)
- [Folly Part 2-07 — fibers](/blog/programming/code-review/folly/part2-07-fibers)
