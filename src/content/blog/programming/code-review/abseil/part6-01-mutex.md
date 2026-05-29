---
title: "Part 6-01: absl::Mutex — reader-writer, fairness, deadlock 검출"
date: 2026-05-24T11:00:00
description: "Part 6-01: absl::Mutex — std::mutex/shared_mutex 통합, contention profiler, deadlock 검출, fairness 정책."
series: "Abseil Code Review"
seriesOrder: 34
tags: [cpp, abseil, sync, mutex, threading]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true
---

## 한 줄 요약

`absl::Mutex`는 exclusive/shared lock을 한 타입에 통합하고, **Conditional Critical Section**, **deadlock 검출**, **contention profiling**, **thread-safety 어노테이션**을 모두 갖춘 동기화 primitive다. 표준의 `std::mutex` + `std::shared_mutex` + `std::condition_variable`을 한 묶음으로 대체한다.

## 동기

표준 동기화는 책임이 흩어져 있다.

- `std::mutex` — exclusive only
- `std::shared_mutex` — reader-writer (C++17)
- `std::condition_variable` — wait/notify (predicate를 외부 변수로 표현)
- `std::condition_variable_any` — 다른 mutex와도

이들의 조합은 코드를 복잡하게 만든다. condition variable의 spurious wakeup, predicate loop 같은 함정도 매번 직접 처리.

`absl::Mutex`는 하나의 타입에서 모두 처리한다. 추가로 *함수형 조건 표현*(Await)을 지원해 `condition_variable` 패턴을 단순화한다.

표준 mutex 대비 acquire 지연을 시나리오별로 비교하면 다음과 같다.

![absl::Mutex vs std::mutex 성능](/images/blog/abseil/diagrams/part6-01-mutex-vs-std-perf.svg)

## API와 사용법

```cpp
#include "absl/synchronization/mutex.h"

absl::Mutex mu;

// exclusive
mu.Lock();
// ...
mu.Unlock();

// RAII
{
  absl::MutexLock lock(&mu);
  // ...
}

// shared (read)
mu.ReaderLock();
mu.ReaderUnlock();

// 또는
{
  absl::ReaderMutexLock lock(&mu);
  // ...
}
```

`MutexLock`은 exclusive RAII, `ReaderMutexLock`은 shared RAII. `std::lock_guard`/`std::shared_lock`을 mutex 종류와 맞춰 골라 쓰는 일이 없다.

## Conditional Critical Section

진정한 차별점은 `Await` 함수다.

```cpp
class Queue {
 public:
  void Push(int x) {
    absl::MutexLock l(&mu_);
    items_.push_back(x);
  }

  int PopWaiting() {
    absl::MutexLock l(&mu_);
    mu_.Await(absl::Condition(this, &Queue::HasItem));
    int x = items_.front();
    items_.pop_front();
    return x;
  }

 private:
  bool HasItem() const ABSL_EXCLUSIVE_LOCKS_REQUIRED(mu_) {
    return !items_.empty();
  }

  absl::Mutex mu_;
  std::deque<int> items_ ABSL_GUARDED_BY(mu_);
};
```

`Await(Condition)`는 condition이 true가 될 때까지 대기한다. predicate가 mutex 안에서 평가되므로 *spurious wakeup이 없고* *while loop이 필요 없다*. condition variable 관용구가 완전히 사라진다.

상세는 [Part 6-02 — Conditional Critical Section](/blog/programming/code-review/abseil/part6-02-conditional-critical-section)에서.

## std 비교

```cpp
// std — condition variable 관용구
std::mutex mu;
std::condition_variable cv;
std::deque<int> q;

void Push(int x) {
  {
    std::lock_guard<std::mutex> l(mu);
    q.push_back(x);
  }
  cv.notify_one();
}

int Pop() {
  std::unique_lock<std::mutex> l(mu);
  cv.wait(l, [&] { return !q.empty(); });   // predicate while loop
  int x = q.front(); q.pop_front();
  return x;
}
```

```cpp
// absl — Await로 같은 동작
absl::Mutex mu;
std::deque<int> q;

void Push(int x) {
  absl::MutexLock l(&mu);
  q.push_back(x);
  // notify 불필요 — Await가 자동
}

int Pop() {
  absl::MutexLock l(&mu);
  mu.Await(absl::Condition(+[](std::deque<int>* q) {
    return !q->empty();
  }, &q));
  int x = q.front(); q.pop_front();
  return x;
}
```

`notify` 호출이 사라진다. `Await`는 mutex가 unlock될 때마다 조건을 자동으로 재평가한다.

## thread-safety annotation

`absl::Mutex`는 clang의 `-Wthread-safety`와 결합된 매크로를 제공한다.

```cpp
class Cache {
 public:
  std::string Get(absl::string_view key) ABSL_LOCKS_EXCLUDED(mu_);

 private:
  std::string LookupLocked() ABSL_EXCLUSIVE_LOCKS_REQUIRED(mu_);

  absl::Mutex mu_;
  absl::flat_hash_map<std::string, std::string> data_ ABSL_GUARDED_BY(mu_);
};
```

`ABSL_GUARDED_BY(mu_)`는 멤버 접근에 mu_ lock이 필요함을 컴파일러에 알린다. 위반은 컴파일 경고. 상세는 [Part 6-05 — Mutex annotations](/blog/programming/code-review/abseil/part6-05-mutex-annotations).

## deadlock 검출

`-DABSL_INTERNAL_USE_NONPROD_MUTEX` 같은 빌드 옵션으로 lock 순서 그래프를 추적해 cycle을 검출한다. 일반적으로는 debug 빌드에서 켜고, release에서는 끈다.

```text
ASSERTION FAILED: lock cycle detected:
  thread T1: acquired mu_a then waited on mu_b
  thread T2: acquired mu_b then waited on mu_a
```

production 추적은 contention profiler와 결합해 lock graph를 dump하기도 한다.

## contention profiler

abseil은 mutex contention을 sampling profile로 모은다.

```cpp
absl::RegisterMutexProfiler(&MyProfiler);
// MyProfiler가 매 contention 이벤트에서 호출됨
```

production에서 hot mutex를 식별하는 데 쓴다. `std::mutex`로는 직접 wrapping 없이는 불가능.

### contention이 무엇을 의미하는가

profiler가 보여 주는 *contention*은 결국 wait 시간이다.

![Lock contention timeline](/images/blog/cpp-concepts/diagrams/lock-contention-timeline.svg)

CS 자체는 짧아도 자주 호출되면 대기 행렬이 길어진다. profiler의 hot mutex는 보통 *CS가 긴 것*이 아니라 *호출 빈도가 너무 높은 것*이다. 그래서 fix는 CS를 줄이는 게 아니라 *lock을 쪼개거나 lock-free 자료구조로 옮기는* 방향이 된다.

## fairness

`absl::Mutex`는 **부분 fair** 정책이다. 굶주린 writer가 너무 오래 대기하지 않도록 reader를 일정 시점 후에 막는다. 기본 `std::shared_mutex`는 fairness를 표준이 규정하지 않아 구현마다 다르다.

## 코드 리뷰 포인트

**1. std::mutex + std::condition_variable 패턴 → absl::Mutex + Await**

```cpp
// 회피 — notify 누락, spurious wakeup 함정
std::mutex mu;
std::condition_variable cv;
bool ready = false;

// producer
{
  std::lock_guard<std::mutex> l(mu);
  ready = true;
}
cv.notify_one();   // ← 누락하면 deadlock

// consumer
std::unique_lock<std::mutex> l(mu);
cv.wait(l, [&] { return ready; });
```

```cpp
// Good
absl::Mutex mu;
bool ready = false;

// producer
{
  absl::MutexLock l(&mu);
  ready = true;
  // notify 불필요
}

// consumer
absl::MutexLock l(&mu);
mu.Await(absl::Condition(&ready));
```

**2. shared lock 적극 활용**

read 빈도 >> write 빈도면 ReaderLock으로 처리량 증대.

```cpp
class ConfigCache {
 public:
  std::string Get(absl::string_view key) {
    absl::ReaderMutexLock l(&mu_);
    auto it = data_.find(key);
    return it == data_.end() ? "" : it->second;
  }

  void Set(std::string k, std::string v) {
    absl::MutexLock l(&mu_);
    data_[std::move(k)] = std::move(v);
  }

 private:
  absl::Mutex mu_;
  absl::flat_hash_map<std::string, std::string> data_ ABSL_GUARDED_BY(mu_);
};
```

**3. annotation 일관 적용**

annotation 한 군데만 적용하면 효과가 적다. 클래스 전체를 annotate.

## 안티패턴

**MutexLock 객체 무시**

```cpp
// 회피 — 임시 객체가 즉시 소멸, lock 해제됨
absl::MutexLock(&mu_);  // 변수 이름 없음
DoWork();                // unlocked
```

```cpp
// Good
absl::MutexLock l(&mu_);
DoWork();
```

`MutexLock` 같은 RAII 객체는 *반드시 변수에 binding*. clang `-Wunused-variable`로 잡힌다.

**Await 안에서 lock acquire**

```cpp
mu_.Await(absl::Condition([&] {
  other_mu_.Lock();    // 회피 — Await predicate 안에서 다른 lock
  // ...
}));
```

`Await` predicate는 mutex가 잡힌 상태에서 *자주* 호출된다. 안에서 다른 lock을 잡으면 deadlock 위험.

**`Unlock` 잊음**

raw `Lock`/`Unlock`은 RAII 없이는 위험. 항상 `MutexLock`/`ReaderMutexLock`.

## 정리

- `absl::Mutex` = exclusive + shared + condition variable + annotation + profiler 통합.
- `Await(Condition)`로 condition variable 관용구 제거.
- thread-safety 매크로로 컴파일 타임 검증.
- contention profiler, deadlock 검출 기본 제공.
- shared/exclusive 모두 RAII는 `MutexLock`/`ReaderMutexLock`.

## 다음 편

[Part 6-02 — Conditional Critical Section](/blog/programming/code-review/abseil/part6-02-conditional-critical-section)에서 `Await` 패턴을 더 자세히 본다.

## 관련 항목

- [Part 6-02 — Conditional Critical Section](/blog/programming/code-review/abseil/part6-02-conditional-critical-section)
- [Part 6-05 — Mutex annotations](/blog/programming/code-review/abseil/part6-05-mutex-annotations)
- [Folly Part 9-01 — Synchronized](/blog/programming/code-review/folly/part9-01-synchronized) — Meta의 동기화 wrapper
- [Tip of the Week #88: condition_variable to Mutex::Await](https://abseil.io/tips/188)
