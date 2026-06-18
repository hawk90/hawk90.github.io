---
title: "folly::ManualExecutor — 결정적 테스트를 위한 수동 진행"
date: 2026-06-04T09:16:00
description: "ManualExecutor는 schedule된 task를 자동 실행하지 않고 run()/drive() 호출 시점에만 진행한다. 비동기 코드의 단위 테스트에 결정성을 부여한다."
series: "Folly Code Review"
seriesOrder: 16
tags: [cpp, folly, executor, manual, testing]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true
---

> **한 줄 요약**: `ManualExecutor`는 task를 *queue에 쌓아두고* `run()` 호출 시에만 실행한다. 비동기 Future 체인의 진행을 *step-by-step*으로 검증하는 테스트 도구다.

## 동기 — 비동기 코드의 결정적 테스트

비동기 코드의 테스트는 race로 깨지기 쉽다. `CPUThreadPoolExecutor`로 schedule하면 *언제 실행되는지* 테스트가 통제할 수 없다.

```cpp
TEST(Worker, ProcessesQueue) {
  folly::CPUThreadPoolExecutor pool(2);
  Worker w(&pool);
  w.enqueue(1);
  w.enqueue(2);
  // sleep으로 기다림 — flaky
  std::this_thread::sleep_for(std::chrono::milliseconds(100));
  EXPECT_EQ(w.processed(), 2);
}
```

위 테스트는 CI 부하에 따라 깨진다. `ManualExecutor`는 *callback이 도는 시점을 테스트가 통제*하게 한다.

## API

```cpp
#include <folly/executors/ManualExecutor.h>

folly::ManualExecutor exec;

exec.add([] { std::cout << "task 1\n"; });
exec.add([] { std::cout << "task 2\n"; });

// 아직 출력 없음 — queue에만 쌓임

exec.run();   // 1번 schedule된 만큼 실행
// "task 1"
// "task 2"
```

추가 메서드.

```cpp
class ManualExecutor : public DrivableExecutor, public ScheduledExecutor {
 public:
  void add(Func) override;
  void scheduleAt(Func, TimePoint) override;

  size_t run();           // ready task 모두 실행, 갯수 반환
  size_t drain();         // run을 더 이상 task가 없을 때까지
  size_t step();          // ready task 1개만 실행
  void drive();           // run + nothing to do면 wait

  bool empty() const;
  size_t numPending() const;

  void advance(Duration);   // 가상 시간 진행 — scheduled task 실행
};
```

## 결정적 step-by-step 테스트

```cpp
TEST(FutureChain, RunsInOrder) {
  folly::ManualExecutor exec;
  std::vector<int> log;

  folly::makeSemiFuture(1)
    .via(&exec)
    .thenValue([&](int x) { log.push_back(x); return x + 1; })
    .thenValue([&](int x) { log.push_back(x); return x + 1; })
    .thenValue([&](int x) { log.push_back(x); });

  EXPECT_EQ(exec.numPending(), 1);   // 첫 callback만 ready

  exec.step();
  EXPECT_EQ(log, std::vector<int>{1});

  exec.step();
  EXPECT_EQ(log, std::vector<int>{1, 2});

  exec.run();   // 나머지 모두
  EXPECT_EQ(log, (std::vector{1, 2, 3}));
}
```

체인의 각 단계가 *언제 실행되는지* 명시적으로 통제된다. race가 없으므로 어떤 환경에서도 동일하게 동작한다.

## 가상 시간 — advance

```cpp
TEST(Timer, FiresAtCorrectTime) {
  folly::ManualExecutor exec;
  std::atomic<bool> fired{false};

  exec.scheduleAt(
      [&] { fired = true; },
      exec.now() + std::chrono::seconds(5));

  exec.run();
  EXPECT_FALSE(fired);   // 아직 5초 안 지남

  exec.advance(std::chrono::seconds(4));
  EXPECT_FALSE(fired);

  exec.advance(std::chrono::seconds(1));
  EXPECT_TRUE(fired);
}
```

`advance(d)`는 *가상 시간을 d만큼 앞으로* 옮기고 그 사이 expire된 schedule을 실행한다. 실제로 5초 wait 하지 않는다.

## drive — Future가 완료될 때까지 진행

```cpp
auto sf = computeAsync();
auto f = std::move(sf).via(&exec);

// Future 완료까지 진행
while (!f.isReady()) {
  exec.drive();
}
auto v = std::move(f).get();
```

`drive()`는 *ready task를 실행*하고 *없으면 short wait* 후 다시 본다. `loopOnce()`와 비슷한 의미다.

## 내부 구현

```cpp
// folly/executors/ManualExecutor.h (요약)
class ManualExecutor : public DrivableExecutor, public ScheduledExecutor {
 public:
  void add(Func f) override {
    std::lock_guard<std::mutex> lock(lock_);
    funcs_.push(std::move(f));
    sem_.post();
  }

  size_t run() {
    size_t count = 0;
    std::vector<Func> funcs;
    {
      std::lock_guard<std::mutex> lock(lock_);
      funcs_.swap_to_vec(funcs);   // 현재 시점의 ready만
    }
    for (auto& f : funcs) {
      f();
      ++count;
    }
    return count;
  }

 private:
  std::mutex lock_;
  std::queue<Func> funcs_;
  std::priority_queue<ScheduledFunc> scheduledFuncs_;
  TimePoint now_;
  folly::LifoSem sem_;
};
```

queue + scheduled queue + virtual clock의 단순한 조합이다.

## InlineExecutor와의 차이

| 항목 | InlineExecutor | ManualExecutor |
|------|----------------|----------------|
| 실행 시점 | add() 즉시 | run()/drive() 호출 시 |
| 결정성 | 있음 (즉시) | 있음 (수동) |
| 가상 시간 | 없음 | advance() 지원 |
| 사용 사례 | 단순 동기 테스트 | 비동기 시퀀스 테스트 |

InlineExecutor는 *비동기성을 제거*하지만 ManualExecutor는 *비동기성을 시각화*한다. 후자가 *비동기 시나리오*의 테스트에 더 적합하다.

## 실전 — RPC 테스트

```cpp
TEST(RpcClient, RetriesOnTimeout) {
  folly::ManualExecutor exec;
  MockServer server;
  RpcClient client(&exec, &server);

  auto sf = client.call("foo");
  auto f = std::move(sf).via(&exec);

  // 첫 시도
  exec.run();
  EXPECT_EQ(server.callCount(), 1);

  // 5초 후 timeout
  exec.advance(std::chrono::seconds(5));
  exec.run();
  EXPECT_EQ(server.callCount(), 2);   // 재시도

  // 응답 도착
  server.respond(2, "ok");
  exec.run();
  EXPECT_TRUE(f.isReady());
  EXPECT_EQ(std::move(f).get(), "ok");
}
```

`advance`로 *타이머 발화 시점*을 직접 제어한다. 5초를 *실제로 기다리지 않고* 타임아웃 시나리오를 검증한다.

## 코드 리뷰 포인트

- **테스트에서 `sleep_for`를 쓰고 있는가?** ManualExecutor + advance로 대체한다.
- **production code에 ManualExecutor가 들어가지 않았는가?** 테스트 전용이다.
- **`run()` vs `drain()` 사용 의도?** 부분 진행이면 step/run, 끝까지면 drain.
- **`drive()` 무한 루프?** Future가 영원히 ready가 안 되는 버그를 가린다. timeout을 둔다.

## 자주 보는 안티패턴

```cpp
// 1. ManualExecutor + 실제 sleep
exec.add([] { ... });
std::this_thread::sleep_for(std::chrono::seconds(1));
exec.run();   // sleep은 의미 없음 — ManualExecutor가 시간 통제

// 2. production에서 ManualExecutor
folly::ManualExecutor exec;
server.setExecutor(&exec);   // 누군가 run()을 안 부르면 영원히 진행 안 함

// 3. step()을 부르지 않고 .get()
auto f = compute().via(&exec);
f.get();   // ManualExecutor는 자동 실행 안 함 — deadlock

// 4. advance 없이 timer 테스트
exec.scheduleAt([&] { fired = true; }, exec.now() + std::chrono::seconds(5));
exec.run();   // 가상 시간 안 옮김 — 아무 일도 안 일어남
```

## 정리

- `ManualExecutor`는 task를 큐에 쌓고 `run()`/`step()` 호출 시에만 실행한다.
- 비동기 Future 체인의 *진행 시점*을 테스트가 통제한다.
- `advance(d)`로 가상 시간을 옮겨 timer/timeout 시나리오를 결정적으로 테스트한다.
- production 코드에 들어가면 *callback이 영원히 실행되지 않을* 위험이 있다.
- race 없는 단위 테스트의 핵심 도구다.

## 다음 편

[Part 3-05: EventBase](/blog/programming/code-review/folly/part3-05-event-base)에서 libevent loop의 핵심을 본다.

## 관련 항목

- [Folly Part 3-01 — InlineExecutor](/blog/programming/code-review/folly/part3-01-inline-executor)
- [Folly Part 3-03 — IOThreadPoolExecutor](/blog/programming/code-review/folly/part3-03-io-thread-pool-executor)
- [Folly Part 2-04 — thenValue / thenError](/blog/programming/code-review/folly/part2-04-then-value-error)
