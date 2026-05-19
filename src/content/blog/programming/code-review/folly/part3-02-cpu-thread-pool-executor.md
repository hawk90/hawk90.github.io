---
title: "Part 3-02: CPUThreadPoolExecutor — CPU-bound 작업의 표준 thread pool"
date: 2026-05-23T14:00:00
description: "CPUThreadPoolExecutor는 CPU 집약 작업을 위한 thread pool. priority queue, blocking queue, thread factory를 조합한다."
series: "Folly Code Review"
seriesOrder: 14
tags: [cpp, folly, executor, threadpool, cpu]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: false
---

> **한 줄 요약**: `CPUThreadPoolExecutor`는 fixed-size thread pool로 *CPU-bound 작업*을 실행한다. priority/queue/factory가 모두 교체 가능한 라이브러리급 구현이다.

## 동기 — 표준에 thread pool이 없다

C++ 표준에는 thread pool이 없다. `std::async(std::launch::async)`가 매번 새 thread를 만들 수도 안 만들 수도 있다는 점이 모호하고, `std::thread`는 직접 manage해야 한다.

Folly는 production thread pool을 정확히 두 모양으로 제공한다.

- `CPUThreadPoolExecutor` — CPU 집약 작업 (parse, compute, serialize)
- `IOThreadPoolExecutor` — I/O 작업 (libevent EventBase 기반)

두 pool의 분리는 *blocking 작업이 CPU 작업을 starve하지 못하게* 한다.

## 기본 사용

```cpp
#include <folly/executors/CPUThreadPoolExecutor.h>

folly::CPUThreadPoolExecutor pool(8);   // 8 threads

pool.add([] {
  doExpensiveWork();
});

// Future와 통합
computeSemi()
  .via(&pool)
  .thenValue([](int x) { return process(x); });
```

constructor의 첫 인자는 thread 개수다. 일반적으로 `std::thread::hardware_concurrency()` 또는 그 절반/배수를 쓴다.

## 구조

```cpp
// folly/executors/CPUThreadPoolExecutor.h (요약)
class CPUThreadPoolExecutor : public ThreadPoolExecutor {
 public:
  CPUThreadPoolExecutor(
      size_t numThreads,
      std::unique_ptr<BlockingQueue<CPUTask>> taskQueue =
          std::make_unique<UnboundedBlockingQueue<CPUTask>>(),
      std::shared_ptr<ThreadFactory> threadFactory =
          std::make_shared<NamedThreadFactory>("CPUThreadPool"));

  void add(Func) override;
  void add(Func, std::chrono::milliseconds timeout, Func expireCallback);
  void addWithPriority(Func, int8_t priority) override;

  size_t numActiveThreads() const;
  size_t numPendingTasks() const;
};
```

세 부분이 조합 가능하다.

1. **BlockingQueue** — 어떤 큐 정책 (unbounded / bounded / priority)
2. **ThreadFactory** — thread 생성/이름/affinity
3. **CPUTask** — task 자체

### 모델 위치

CPUThreadPoolExecutor는 *Fixed thread pool* 모델 — 공유 큐 + N 워커.

![Executor models compared](/images/blog/cpp-concepts/diagrams/executor-models.svg)

평행성을 얻고 스레드 수를 bounded로 유지하는 균형점이다. 단일 큐가 hot이면 work-stealing(또는 priority queue로 분리)으로 contention을 분산할 수 있다.

## Queue 선택

```cpp
// 무제한 — 메모리 폭발 가능
auto q1 = std::make_unique<folly::UnboundedBlockingQueue<CPUTask>>();

// 제한 — 가득 차면 add()가 block
auto q2 = std::make_unique<folly::LifoSemMPMCQueue<CPUTask>>(1000);

// priority queue
auto q3 = std::make_unique<folly::PriorityLifoSemMPMCQueue<CPUTask>>(
    3,        // 3 priority levels
    1000);    // capacity per level

folly::CPUThreadPoolExecutor pool(8, std::move(q3));

pool.addWithPriority([] { ... }, folly::Executor::HI_PRI);
pool.addWithPriority([] { ... }, folly::Executor::LO_PRI);
```

priority queue는 *latency-sensitive task*와 *background batch*를 분리할 때 유용하다.

## ThreadFactory

```cpp
auto factory = std::make_shared<folly::NamedThreadFactory>("Parser");
folly::CPUThreadPoolExecutor pool(4, factory);

// 생성된 thread는 "Parser-0", "Parser-1", ... 이름을 가짐
```

`top -H -p <pid>` 또는 perf trace에서 thread 이름이 보이면 디버깅이 한층 쉬워진다. 모든 thread pool에 *명시적 이름*을 주는 게 권장이다.

```cpp
// 사용자 정의 factory — CPU affinity
class AffinityThreadFactory : public folly::ThreadFactory {
 public:
  std::thread newThread(folly::Func&& f) override {
    return std::thread([f = std::move(f)]() mutable {
      cpu_set_t set;
      CPU_ZERO(&set);
      CPU_SET(specificCore_, &set);
      pthread_setaffinity_np(pthread_self(), sizeof(set), &set);
      f();
    });
  }
};
```

## Task — work + metadata

```cpp
// folly/executors/CPUThreadPoolExecutor.h
struct CPUTask {
  Func func;
  std::chrono::steady_clock::time_point enqueueTime;
  std::chrono::milliseconds expireTime{0};
  Func expireCallback;
  int8_t priority{Executor::MID_PRI};
};
```

`enqueueTime`은 *queue에서 대기한 시간*을 측정한다. tail latency 분석에 핵심이다.

```cpp
pool.add(
    [] { doWork(); },                       // task
    std::chrono::milliseconds(100),         // 100ms 내에 시작 안 되면 expire
    [] { LOG(WARN) << "task expired"; });   // expireCallback
```

## stop / join 정책

```cpp
class ThreadPoolExecutor {
 public:
  void stop();                  // 즉시 신규 task 거절, in-flight task는 진행
  void join();                  // 모든 in-flight 끝날 때까지 wait
  void setNumThreads(size_t);   // dynamic resize
};

// destructor가 자동 join
{
  folly::CPUThreadPoolExecutor pool(8);
  pool.add(...);
}   // ← 여기서 join (in-flight task 끝날 때까지)
```

destructor가 *모든 task가 끝날 때까지* block한다. 이를 모르면 *원치 않게 block*되는 경우가 있다.

## std::thread / std::async와 비교

```cpp
// std::thread — 직접 manage
std::vector<std::thread> threads;
for (int i = 0; i < N; ++i) {
  threads.emplace_back([] { work(); });
}
for (auto& t : threads) t.join();

// std::async — launch policy 모호
auto f = std::async(std::launch::async, [] { return work(); });
int v = f.get();   // thread 생성/파괴 비용

// folly::CPUThreadPoolExecutor — pool reuse
static folly::CPUThreadPoolExecutor pool(8);
pool.add([] { work(); });   // thread 재사용
```

`std::async`는 *매번 thread를 만들* 수 있다(implementation defined). pool은 fixed thread를 재사용한다.

## InlineExecutor와의 차이

| 항목 | InlineExecutor | CPUThreadPoolExecutor |
|------|----------------|-----------------------|
| 실행 | caller thread | pool worker thread |
| 비동기성 | 없음 | 있음 |
| 메모리 | 0 | thread당 stack + queue |
| 사용 사례 | test, 단축 | production |

## 코드 리뷰 포인트

- **thread 수가 hardcoded인가?** `std::thread::hardware_concurrency()` 또는 config로 받자.
- **queue가 unbounded인가?** burst 트래픽에서 메모리 폭발 가능. bounded + expire 정책 고려.
- **thread 이름이 적절한가?** "Pool-0"보다 "Parser-0", "Encoder-0"이 디버깅에 좋다.
- **여러 pool이 있는가?** I/O와 CPU 분리, latency-sensitive와 batch 분리.

## 자주 보는 안티패턴

```cpp
// 1. 매 함수 호출마다 새 pool 생성
void handle() {
  folly::CPUThreadPoolExecutor pool(4);   // thread 생성/파괴 — 매우 비쌈
  pool.add([] { work(); });
}   // destructor가 join

// 2. unbounded queue + slow consumer
folly::CPUThreadPoolExecutor pool(2);   // 2 thread
for (int i = 0; i < 1'000'000; ++i) {
  pool.add([] { sleep(1); });   // 큐가 무한정 자람
}

// 3. pool 안에서 .get() 호출
pool.add([&] {
  auto v = anotherSemi().via(&pool).get();   // deadlock 위험
  // pool worker 가 자기 자신을 wait
});

// 4. CPU pool에서 blocking I/O
pool.add([] {
  read(fd, buf, n);   // CPU thread 가 I/O로 block — pool starve
});
```

(3)은 *pool 크기가 작을 때* 모든 worker가 서로를 wait해 deadlock한다. CPU pool에서 같은 CPU pool에 schedule된 결과를 wait하지 마라.

## 정리

- `CPUThreadPoolExecutor`는 fixed-size pool로 CPU 집약 작업을 실행한다.
- Queue/ThreadFactory/Task가 모두 교체 가능한 모듈식 구조다.
- priority queue로 latency-sensitive와 batch를 분리한다.
- thread 이름을 명시해 디버깅 가능성을 높인다.
- destructor가 join하므로 *원치 않는 block*에 주의한다.
- I/O 작업은 별도의 `IOThreadPoolExecutor`로 분리한다.

## 다음 편

[Part 3-03: IOThreadPoolExecutor](/blog/programming/code-review/folly/part3-03-io-thread-pool-executor)에서 libevent 기반 I/O pool을 본다.

## 관련 항목

- [Folly Part 3-01 — InlineExecutor](/blog/programming/code-review/folly/part3-01-inline-executor)
- [Folly Part 3-03 — IOThreadPoolExecutor](/blog/programming/code-review/folly/part3-03-io-thread-pool-executor)
- [Folly Part 3-05 — EventBase](/blog/programming/code-review/folly/part3-05-event-base)
