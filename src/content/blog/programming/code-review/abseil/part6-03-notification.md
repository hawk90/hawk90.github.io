---
title: "absl::Notification — once-only signal"
date: 2026-06-11T09:04:00
description: "Part 6-03: absl::Notification — 한 번만 발생하는 이벤트를 위한 가벼운 signal primitive. atomic flag보다 안전, condition variable보다 단순."
series: "Abseil Code Review"
seriesOrder: 36
tags: [cpp, abseil, sync, notification, signaling]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true
---

## 한 줄 요약

`absl::Notification`은 **한 번만 발생하는 이벤트**(서버 초기화 완료, shutdown 요청 등)를 표현하는 primitive다. `Notify()`를 한 번 호출하면 `WaitForNotification()`이 즉시 반환되고, 이후의 `HasBeenNotified()`는 항상 true. `atomic<bool>`보다 안전하고 `condition_variable`보다 단순하다.

## 동기

"한 번만 일어나는 이벤트"는 매우 흔하다.

- 서버 시작 완료
- shutdown 요청
- 비동기 작업 완료
- 첫 데이터 도착

이를 표준 도구로 표현하는 세 가지 방법:

1. `std::atomic<bool>` — busy wait 또는 sleep loop. 비효율적.
2. `std::condition_variable` + bool + mutex — 보일러플레이트 많음. 신호 후 condition variable 재사용은 안 됨.
3. `std::promise<void>` / `std::future<void>` — 가능하나 의미가 약함, 한 번만 wait 가능.

`absl::Notification`은 이 정확한 use case에 맞춰진다.

## API와 사용법

```cpp
#include "absl/synchronization/notification.h"

namespace absl {
class Notification {
 public:
  Notification();
  bool HasBeenNotified() const;
  void WaitForNotification() const;
  bool WaitForNotificationWithTimeout(absl::Duration timeout) const;
  bool WaitForNotificationWithDeadline(absl::Time deadline) const;
  void Notify();
};
}
```

상태가 매우 단순하다 — *not notified* → *notified*. 한 방향. `Notify()`를 두 번 호출하면 ABORT.

```cpp
// 서버 초기화 패턴
class Server {
 public:
  void Start() {
    std::thread([this] {
      Initialize();
      ready_.Notify();   // 초기화 완료 알림
    }).detach();
  }

  void WaitReady() { ready_.WaitForNotification(); }
  bool IsReady() const { return ready_.HasBeenNotified(); }

 private:
  absl::Notification ready_;
};
```

```cpp
// shutdown 요청 패턴
class Worker {
 public:
  void Shutdown() { shutdown_.Notify(); }

  void Run() {
    while (!shutdown_.HasBeenNotified()) {
      auto task = TryGetTask();
      if (task) Process(*task);
      else shutdown_.WaitForNotificationWithTimeout(absl::Milliseconds(100));
    }
  }

 private:
  absl::Notification shutdown_;
};
```

## 내부 구현

`Notification`은 mutex + 단일 bool로 구현된다.

```cpp
// absl/synchronization/notification.h (요약)
class Notification {
  mutable absl::Mutex mutex_;
  std::atomic<bool> notified_yet_;

 public:
  bool HasBeenNotified() const {
    return notified_yet_.load(std::memory_order_acquire);
  }

  void WaitForNotification() const {
    if (!HasBeenNotified()) {
      absl::MutexLock l(&mutex_);
      mutex_.Await(absl::Condition(&HasBeenNotifiedInternal, this));
    }
  }

  void Notify() {
    absl::MutexLock l(&mutex_);
    ABSL_CHECK(!notified_yet_.exchange(true, std::memory_order_release));
  }
};
```

핵심은 **fast path**다. `WaitForNotification`은 먼저 atomic load로 확인하고, 이미 notified면 mutex를 잡지 않고 즉시 반환. 한 번 신호된 후의 wait는 사실상 비용 0.

`Notify()`는 `exchange` 결과로 이전 값을 확인한다. 이전이 이미 true면 두 번 notify — ABORT.

## std atomic + cv 비교

```cpp
// 회피 — atomic + busy wait
std::atomic<bool> ready{false};

void Wait() {
  while (!ready.load(std::memory_order_acquire)) {
    std::this_thread::yield();   // CPU 낭비
  }
}
```

```cpp
// 회피 — cv 패턴 (보일러플레이트 많음)
std::mutex mu;
std::condition_variable cv;
bool ready = false;

void Wait() {
  std::unique_lock l(mu);
  cv.wait(l, [&] { return ready; });
}

void Signal() {
  {
    std::lock_guard l(mu);
    ready = true;
  }
  cv.notify_all();
}
```

```cpp
// Good — Notification
absl::Notification n;

void Wait() { n.WaitForNotification(); }
void Signal() { n.Notify(); }
```

의미가 명확하다 — *한 번만 일어나는 이벤트다*라는 의도가 타입에 박혀 있다.

## 코드 리뷰 포인트

**1. atomic<bool> + spin → Notification**

```cpp
// 회피
std::atomic<bool> done{false};
while (!done.load()) std::this_thread::sleep_for(1ms);

// Good
absl::Notification done;
done.WaitForNotification();
```

**2. one-shot signal에 condition_variable**

condition_variable은 *반복 신호*용. 한 번만 일어나는 이벤트에는 과한 도구다.

```cpp
// 회피
std::mutex mu; std::condition_variable cv; bool ready = false;

// Good
absl::Notification ready;
```

**3. 멤버 변수로 자연스럽게**

```cpp
class JobRunner {
  absl::Notification cancelled_;
 public:
  void Cancel() { cancelled_.Notify(); }
  bool IsCancelled() const { return cancelled_.HasBeenNotified(); }
};
```

타입 이름이 코드를 설명한다.

**4. timeout이 있는 wait**

```cpp
if (!server_ready_.WaitForNotificationWithTimeout(absl::Seconds(30))) {
  LOG(ERROR) << "server didn't start in 30s";
  return absl::DeadlineExceededError("startup timeout");
}
```

이 한 줄이 startup 단계 디버깅에 결정적인 정보를 준다.

## 안티패턴

**두 번 Notify**

```cpp
n.Notify();
n.Notify();   // ABORT — Notification 모델 위반
```

`Notification`은 한 번만 신호. 반복 신호가 필요하면 다른 primitive(`BlockingCounter`, `Mutex::Await`).

**reset 시도**

`Notification`에는 reset이 없다. 새 라운드가 필요하면 새 `Notification` 객체.

```cpp
// 회피
absl::Notification n;
n.Notify(); n.WaitForNotification();
// 두 번째 라운드 — 새 n이 필요
```

**Wait이 짧을 거라 가정 + busy spin**

`Notification`이 이미 fast path를 제공한다(이미 notified면 mutex 안 잡음). 외부 busy spin은 불필요.

## BlockingCounter / Barrier와의 차이

| primitive | 의미 |
|---|---|
| `Notification` | 1회 신호 |
| `BlockingCounter` | N개 decrement이 모두 끝나면 wait 해제 |
| `Barrier` | N개 thread가 모두 도착하면 모두 진행 |

상세는 [Part 6-04 — BlockingCounter / Barrier](/blog/programming/code-review/abseil/part6-04-blocking-counter-barrier)에서.

## 정리

- `Notification`은 한 번 일어나는 이벤트의 표준 표현.
- `Notify`는 1회만 가능, 2회는 ABORT.
- `HasBeenNotified`는 lock 없는 빠른 경로.
- atomic flag보다 안전, condition variable보다 단순.
- reset 없음 — 반복 신호는 다른 primitive.

## 다음 편

[Part 6-04 — BlockingCounter / Barrier](/blog/programming/code-review/abseil/part6-04-blocking-counter-barrier)에서 다중 thread 동기화 primitive를 본다.

## 관련 항목

- [Part 6-01 — absl::Mutex](/blog/programming/code-review/abseil/part6-01-mutex)
- [Part 6-02 — Conditional Critical Section](/blog/programming/code-review/abseil/part6-02-conditional-critical-section)
- [Part 6-04 — BlockingCounter / Barrier](/blog/programming/code-review/abseil/part6-04-blocking-counter-barrier)
