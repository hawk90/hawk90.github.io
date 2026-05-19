---
title: "Part 6-04: BlockingCounter / Barrier — 다중 thread 조율"
date: 2026-05-24T14:00:00
description: "Part 6-04: absl::BlockingCounter와 absl::Barrier — N개 작업 완료 대기, N개 thread 동기 합류, fanout-fanin 패턴."
series: "Abseil Code Review"
seriesOrder: 37
tags: [cpp, abseil, sync, barrier, counter]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: false
---

## 한 줄 요약

`BlockingCounter`는 **N개 작업이 모두 완료될 때까지 대기**한다 (fanout-fanin). `Barrier`는 **N개 thread가 모두 도착하면 모두 동시에 진행**시킨다 (rendezvous). 둘 다 한 번만 동작하며, parallel coordination의 두 주요 패턴을 직접 표현한다.

## 동기

병렬 작업 분배 후 합류는 흔한 패턴이다.

- map-reduce의 map 단계 완료 대기
- 여러 worker가 결과를 모은 후 다음 단계 진입
- 테스트에서 여러 thread가 같은 시점에 시작하도록 동기화

표준 도구 조합으로 구현 가능하지만 코드가 늘어진다. `BlockingCounter`/`Barrier`는 의미를 명시한다.

## BlockingCounter — fanout-fanin

```cpp
#include "absl/synchronization/blocking_counter.h"

void DoWork(absl::BlockingCounter* counter, int i) {
  // ...
  counter->DecrementCount();
}

void Run() {
  constexpr int kN = 10;
  absl::BlockingCounter counter(kN);

  for (int i = 0; i < kN; ++i) {
    std::thread([&counter, i] { DoWork(&counter, i); }).detach();
  }

  counter.Wait();   // 모든 worker가 DecrementCount할 때까지
}
```

흐름:

1. `BlockingCounter(N)`으로 카운터 초기화.
2. N개 worker가 각자 일 후 `DecrementCount()`.
3. main이 `Wait()`. 카운터가 0이 되면 반환.

## API

```cpp
namespace absl {
class BlockingCounter {
 public:
  explicit BlockingCounter(int initial_count);
  bool DecrementCount();   // counter==0이 되면 true 반환
  void Wait();
};

class Barrier {
 public:
  explicit Barrier(int num_threads);
  bool Block();   // 마지막 도착 thread가 true, 나머지는 false
};
}
```

두 API 모두 의도가 분명하다.

## Barrier — rendezvous

```cpp
#include "absl/synchronization/barrier.h"

void Worker(absl::Barrier* barrier, int id) {
  Prepare(id);
  if (barrier->Block()) {
    // 마지막 도착자 — cleanup 책임
    LOG(INFO) << "all workers arrived";
  }
  // 여기서부터 모두 동시에 진행
  Process(id);
}

void Run() {
  constexpr int kN = 8;
  absl::Barrier b(kN);
  std::vector<std::thread> threads;
  for (int i = 0; i < kN; ++i) {
    threads.emplace_back([&b, i] { Worker(&b, i); });
  }
  for (auto& t : threads) t.join();
}
```

`Block()`은 N개 thread가 모두 도착할 때까지 막는다. 마지막 도착자는 true를 반환 — *정확히 한 thread*가 cleanup/logging 책임을 진다는 의미.

`Barrier`는 자기 자신을 소멸시킨다. 마지막 thread가 `Block()`을 떠난 후 barrier 객체는 더 이상 유효하지 않다. 반복 사용 X.

## BlockingCounter vs Notification vs Barrier

| primitive | 신호자 수 | 대기자 수 | 사용 |
|---|---|---|---|
| `Notification` | 1 | 다수 | 1회 이벤트 알림 |
| `BlockingCounter` | N | 1 (또는 다수) | N개 작업 완료 대기 |
| `Barrier` | N | N | N thread 동시 진행 |

이 표를 머리에 두고 워크로드 형태에 맞춰 고르면 된다.

## 내부 구현

`BlockingCounter`는 mutex + counter다.

```cpp
// absl/synchronization/blocking_counter.cc (요약)
class BlockingCounter {
  absl::Mutex lock_;
  int count_;
  int num_waiting_;
  bool done_;
};

void BlockingCounter::Wait() {
  absl::MutexLock l(&lock_);
  lock_.Await(absl::Condition(&done_));
}

bool BlockingCounter::DecrementCount() {
  absl::MutexLock l(&lock_);
  if (--count_ <= 0) done_ = true;
  return done_;
}
```

`Await`로 자동 wake. notify 의무 없음. `Barrier`도 비슷한 구조 — counter + flag로 모두 도착 검출.

## std::latch / std::barrier (C++20) 비교

C++20에 동일 목적의 표준이 들어왔다.

| std (C++20) | absl |
|---|---|
| `std::latch` | `BlockingCounter` |
| `std::barrier` | `Barrier` (재사용 가능 X, C++ std는 가능) |

`std::barrier`는 reusable barrier(generation 개념)지만 `absl::Barrier`는 1회용. abseil이 LTS 호환을 위해 더 보수적이다.

C++20을 쓸 수 있다면 `std::latch`/`std::barrier`가 선택지에 들어온다. 다만 같은 코드베이스 안에서 동기화 도구를 일관시키기 위해 abseil을 유지하는 게 흔하다.

## 코드 리뷰 포인트

**1. atomic counter + wait loop → BlockingCounter**

```cpp
// 회피 — busy wait
std::atomic<int> remaining{N};
for (int i = 0; i < N; ++i) {
  std::thread([&] { Work(); remaining.fetch_sub(1); }).detach();
}
while (remaining.load() > 0) std::this_thread::yield();

// Good
absl::BlockingCounter counter(N);
for (int i = 0; i < N; ++i) {
  std::thread([&counter] { Work(); counter.DecrementCount(); }).detach();
}
counter.Wait();
```

**2. 테스트에서 동시 시작**

```cpp
TEST(Race, RareCondition) {
  constexpr int kN = 16;
  absl::Barrier start(kN);
  std::vector<std::thread> threads;
  for (int i = 0; i < kN; ++i) {
    threads.emplace_back([&] {
      start.Block();   // 모두 도착할 때까지 대기 — 정확히 같은 시점에 진행
      DoRaceyOp();
    });
  }
  for (auto& t : threads) t.join();
}
```

race condition 재현 테스트의 표준 패턴.

**3. fanout 후 결과 수집**

```cpp
std::vector<Result> results(N);
absl::BlockingCounter c(N);
for (int i = 0; i < N; ++i) {
  pool->Schedule([&, i] {
    results[i] = ComputeShard(i);
    c.DecrementCount();
  });
}
c.Wait();
Result merged = Merge(results);
```

## 안티패턴

**Barrier 재사용**

```cpp
// 회피 — Barrier는 1회용
absl::Barrier b(N);
for (round : rounds) {
  // ...
  b.Block();   // 첫 라운드 OK, 두 번째부터 UB
}
```

반복 동기화는 새 `Barrier` 또는 `std::barrier`(C++20) 사용.

**DecrementCount 누락**

```cpp
// 회피 — worker가 예외로 die하면 counter는 N에서 멈춤 → Wait 영원
std::thread([&] { Work(); counter.DecrementCount(); }).detach();
```

Work이 throw 가능하면 RAII로 보호.

```cpp
std::thread([&] {
  absl::Cleanup dec = [&counter] { counter.DecrementCount(); };
  Work();   // throw 해도 dec가 호출됨
}).detach();
```

(`absl::Cleanup`은 [Part 14](/blog/programming/code-review/abseil) 또는 별도 글 참조.)

**count 0으로 초기화**

```cpp
absl::BlockingCounter c(0);
c.Wait();   // 즉시 반환 — 의미 없음
```

쓸모 없는 코드. linter가 잡지 않으니 리뷰에서.

## 정리

- `BlockingCounter`: N개 완료 대기 (fanout-fanin).
- `Barrier`: N thread 동시 진행 (rendezvous), 1회용.
- `Notification`: 1회 이벤트 (전편).
- C++20 `std::latch`/`std::barrier`로 대체 가능.
- DecrementCount 누락 방지를 위해 `absl::Cleanup` RAII.

## 다음 편

[Part 6-05 — Mutex annotations](/blog/programming/code-review/abseil/part6-05-mutex-annotations)에서 clang `-Wthread-safety`로 lock 누락을 컴파일 타임에 잡는 방법을 본다.

## 관련 항목

- [Part 6-01 — absl::Mutex](/blog/programming/code-review/abseil/part6-01-mutex)
- [Part 6-03 — Notification](/blog/programming/code-review/abseil/part6-03-notification)
- [Part 6-05 — Mutex annotations](/blog/programming/code-review/abseil/part6-05-mutex-annotations)
