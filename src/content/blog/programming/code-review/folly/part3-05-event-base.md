---
title: "Part 3-05: EventBase — libevent 이벤트 루프의 핵심"
date: 2026-05-23T17:00:00
description: "EventBase는 libevent의 event_base를 wrap한 단일 thread event loop. file descriptor, timer, cross-thread message를 한 번에 처리한다."
series: "Folly Code Review"
seriesOrder: 17
tags: [cpp, folly, executor, eventbase, libevent]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: false
---

> **한 줄 요약**: `EventBase`는 libevent의 `event_base`를 wrap한 *single-threaded event loop*다. fd 이벤트, timer, cross-thread message를 한 thread 안에서 처리하고, `folly::Executor`를 구현해 Future와 직접 통합된다.

## 동기 — event loop 위에 Executor를 얹다

`libevent`는 C 라이브러리로 file descriptor 이벤트와 timer를 처리한다. epoll/kqueue를 추상화한다. 그러나 *비동기 컴포넌트 구성*은 사용자 몫이다.

Folly의 `EventBase`는 그 위에 다음을 더한다.

1. **`folly::Executor` 구현** — Future `.via(eb)`로 직접 schedule
2. **cross-thread message** — `runInEventBaseThread(fn)`으로 다른 thread에서 lambda 던지기
3. **TimekeeperWheel** — 효율적 timer
4. **observer/preLoopCallback** — loop 단계 hook

## API 한눈에

```cpp
#include <folly/io/async/EventBase.h>

folly::EventBase evb;

// 1) loop 시작
std::thread t([&] { evb.loopForever(); });

// 2) schedule (cross-thread OK)
evb.runInEventBaseThread([] { std::cout << "in EB thread\n"; });
evb.runInEventBaseThreadAndWait([] { ... });   // blocking

// 3) timer
evb.runAfterDelay([] { LOG(INFO) << "5s"; }, 5000);

// 4) Future
sf.via(&evb).thenValue([](auto x) { ... });

// 5) loop 종료
evb.terminateLoopSoon();
t.join();
```

## loop 종류

![EventBase loop iteration](/images/blog/folly/diagrams/part3-05-eventbase-loop.svg)

```cpp
class EventBase {
 public:
  bool loop();           // 한 iteration
  bool loopOnce();       // 한 event 처리 후 return
  void loopForever();    // 영원히
  void terminateLoopSoon();
};
```

`loopForever`는 *terminate가 호출되거나 모든 event가 떠날 때까지* 돈다. 일반적으로 server는 `loopForever`로 운영한다.

## runInEventBaseThread

다른 thread에서 EventBase로 lambda를 보낸다.

```cpp
std::thread other([&] {
  // 다른 thread에서
  evb.runInEventBaseThread([] {
    // EventBase loop thread에서 실행
    sock->write(buf);   // race 없이 안전
  });
});
```

내부적으로 `eventfd` 또는 pipe로 cross-thread notification을 보낸다. queue에 쌓고 EventBase가 *자기 thread에서* dispatch한다.

```cpp
// folly/io/async/EventBase.cpp (개념)
void EventBase::runInEventBaseThread(Func fn) {
  if (inRunningEventBaseThread()) {
    queue_->add(std::move(fn));   // 같은 thread면 직접 큐에
  } else {
    notificationQueue_->add(std::move(fn));   // cross-thread
    notifyFd_->signal();                        // EventBase loop 깨우기
  }
}
```

## Future와의 통합

```cpp
// EventBase는 folly::Executor를 구현
class EventBase : public folly::Executor {
 public:
  void add(Func f) override {
    runInEventBaseThread(std::move(f));
  }
};

// 사용
fetchAsync(url).via(&evb).thenValue([](Response r) {
  // EventBase thread에서 실행
});
```

`.via(&evb)`는 continuation을 *해당 EventBase의 thread*에서 돌게 한다. socket state에 접근하는 callback을 안전하게 짤 수 있다.

## Timer — TimekeeperWheel

```cpp
evb.runAfterDelay([] { ... }, 100);   // 100ms 후
```

내부는 *hierarchical timer wheel*이다. O(1)로 millisecond timer를 등록한다.

```cpp
// folly/io/async/HHWheelTimer.h (개념)
class HHWheelTimer {
  // 8 + 4 levels의 wheel — 256ms ~ 수십일 범위
  std::array<TimeoutList, 256> buckets_[4];
  std::chrono::milliseconds tickInterval_;
};
```

수백만 개의 timer를 등록해도 *O(1) insertion + O(1) cancel*이다. RPC timeout 추적의 표준 구현이다.

## Observer — loop hook

```cpp
class MyObserver : public folly::EventBase::LoopCallback {
  void runLoopCallback() noexcept override {
    LOG(INFO) << "loop iteration";
  }
};

MyObserver o;
evb.runInLoop(&o);
```

`runInLoop`은 *다음 loop iteration*의 시작에 callback을 건다. logging, metrics, deferred cleanup에 활용된다.

## EventBase Manager

```cpp
folly::EventBaseManager* m = folly::EventBaseManager::get();
folly::EventBase* eb = m->getEventBase();
```

`EventBaseManager`는 *thread-local EventBase*를 관리한다. 같은 thread에서 여러 컴포넌트가 동일 EventBase를 공유한다.

`IOThreadPoolExecutor`는 내부적으로 EventBaseManager를 통해 각 worker thread의 EventBase를 등록한다.

## 단일 thread vs 다중 thread

```cpp
// Single threaded
folly::EventBase evb;
std::thread t([&] { evb.loopForever(); });
// 모든 callback이 t에서 실행 — race 없음

// Multi threaded
folly::IOThreadPoolExecutor io(4);
auto* eb = io.getEventBase();   // 4개 중 하나 (round-robin)
// 같은 fd는 같은 EventBase로 pin
```

단일 EventBase의 *모든 callback은 같은 thread*다. 이게 EventBase의 가장 큰 장점이다. *lock 없는 state* 관리가 가능하다.

## std와 비교

표준에는 없다. `boost::asio::io_context`가 비슷한 위치다.

| 항목 | folly::EventBase | boost::asio::io_context |
|------|------------------|--------------------------|
| backend | libevent | platform-specific (epoll/kqueue/IOCP) |
| Executor 통합 | folly::Future | asio::execution::executor |
| timer wheel | HHWheelTimer (O(1)) | asio::steady_timer (O(log n)) |
| cross-thread | runInEventBaseThread | post() |

asio가 표준 영향력에서 앞서지만, *Future 통합*은 folly::EventBase가 더 매끄럽다.

## 코드 리뷰 포인트

- **loop이 도는가?** `loopForever()` 호출이 누락되면 callback이 영원히 실행 안 됨.
- **state에 외부 thread가 직접 접근하는가?** `runInEventBaseThread`로 옮긴다.
- **timer가 너무 많이 cancel되는가?** HHWheelTimer는 cancel도 O(1)지만 메모리는 든다.
- **EventBase 안에서 blocking call?** loop 전체가 멈춘다.

## 자주 보는 안티패턴

```cpp
// 1. loop 안에서 blocking
evb.runInEventBaseThread([] {
  std::this_thread::sleep_for(std::chrono::seconds(1));   // loop 멈춤
});

// 2. EventBase state를 다른 thread에서 직접 수정
class Conn {
  folly::AsyncSocket* sock_;
  void close() { sock_->close(); }   // 어느 thread에서 호출?
};
// 옳음:
void close() {
  evb_->runInEventBaseThread([this] { sock_->close(); });
}

// 3. EventBase가 destruct되기 전에 loop 종료 안 함
folly::EventBase evb;
std::thread t([&] { evb.loopForever(); });
// evb destruct — t는 dangling reference로 SEGV
// terminateLoopSoon() + t.join() 먼저

// 4. 한 thread에서 두 EventBase loop
folly::EventBase eb1, eb2;
eb1.loopForever();   // 두 번째는 실행 안 됨
eb2.loopForever();
```

## 정리

- `EventBase`는 libevent의 event_base를 wrap한 single-threaded event loop다.
- fd 이벤트, timer, cross-thread message를 한 thread 안에서 처리한다.
- `folly::Executor`를 구현해 Future `.via(&evb)`로 직접 통합된다.
- 같은 EventBase의 모든 callback은 같은 thread에서 실행되어 *lock-free state*가 가능하다.
- 다른 thread에서는 반드시 `runInEventBaseThread`로 message를 보낸다.
- HHWheelTimer로 O(1) timer 등록/취소를 제공한다.

## 다음 편

Part 4부터 IOBuf를 본다. [Part 4-01: IOBuf](/blog/programming/code-review/folly/part4-01-iobuf)에서 zero-copy buffer chain의 기본 단위를 시작한다.

## 관련 항목

- [Folly Part 3-03 — IOThreadPoolExecutor](/blog/programming/code-review/folly/part3-03-io-thread-pool-executor)
- [Folly Part 2-07 — fibers](/blog/programming/code-review/folly/part2-07-fibers)
- [Folly Part 2-01 — Future](/blog/programming/code-review/folly/part2-01-future-overview)
