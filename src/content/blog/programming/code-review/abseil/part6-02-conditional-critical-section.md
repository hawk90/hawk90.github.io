---
title: "Part 6-02: Conditional Critical Section — Mutex::Await로 condition variable 없애기"
date: 2026-05-24T12:00:00
description: "Part 6-02: Mutex::Await로 함수형 condition을 정의해 condition_variable, notify, spurious wakeup 관용구를 모두 제거."
series: "Abseil Code Review"
seriesOrder: 35
tags: [cpp, abseil, sync, condition, mutex]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: false
---

## 한 줄 요약

`absl::Mutex::Await(Condition)`은 condition variable + notify + predicate while loop이라는 3단 관용구를 한 줄로 압축한다. condition을 *predicate 함수*로 표현하면, mutex가 unlock될 때마다 abseil이 자동 재평가하므로 producer가 `notify`를 호출할 필요가 없다.

## 표준 condition variable의 함정

```cpp
std::mutex mu;
std::condition_variable cv;
std::deque<Task> q;

// producer
void Push(Task t) {
  {
    std::lock_guard<std::mutex> l(mu);
    q.push_back(std::move(t));
  }
  cv.notify_one();   // ① 누락하면 consumer 영원히 대기
}

// consumer
Task Pop() {
  std::unique_lock<std::mutex> l(mu);
  cv.wait(l, [&] { return !q.empty(); });   // ② predicate while 의무
  Task t = std::move(q.front()); q.pop_front();
  return t;
}
```

함정 셋:

- ① **notify 누락**: producer가 wake 호출을 잊으면 consumer가 영원히 대기.
- ② **predicate while loop**: spurious wakeup 때문에 if가 아니라 while.
- 추가: **notify_one vs notify_all** 선택의 미묘함. 잘못 고르면 thundering herd 또는 lost wakeup.

## Mutex::Await의 모델

abseil의 모델은 다르다.

```cpp
// API
class Mutex {
 public:
  void Await(const Condition& cond);
  bool AwaitWithTimeout(const Condition& cond, absl::Duration timeout);
  bool AwaitWithDeadline(const Condition& cond, absl::Time deadline);

  bool LockWhen(const Condition& cond);
  bool LockWhenWithTimeout(const Condition& cond, absl::Duration timeout);
};
```

`Await(cond)`는 *cond가 true가 될 때까지 대기*한다. 내부적으로 mutex가 unlock될 때마다 cond를 재평가한다. producer는 notify를 호출할 필요가 없다.

```cpp
absl::Mutex mu;
std::deque<Task> q;

void Push(Task t) {
  absl::MutexLock l(&mu);
  q.push_back(std::move(t));
  // notify 없음
}

Task Pop() {
  absl::MutexLock l(&mu);
  mu.Await(absl::Condition(+[](std::deque<Task>* q) {
    return !q->empty();
  }, &q));
  Task t = std::move(q.front()); q.pop_front();
  return t;
}
```

코드가 단순해진다. 빠뜨릴 곳이 줄어든다.

## Condition 객체

`absl::Condition`은 predicate 함수를 캡슐화한다. 세 가지 형태가 있다.

```cpp
// 1) 멤버 함수 + this
class Server {
  bool IsReady() const ABSL_EXCLUSIVE_LOCKS_REQUIRED(mu_);
  void Wait() {
    absl::MutexLock l(&mu_);
    mu_.Await(absl::Condition(this, &Server::IsReady));
  }
};

// 2) bool* 직접
bool flag = false;
mu.Await(absl::Condition(&flag));   // *flag == true가 될 때까지

// 3) 함수 포인터 + 인자
mu.Await(absl::Condition(+[](Queue* q) { return !q->empty(); }, &queue));
```

predicate는 *순수*해야 한다. mutex가 잡힌 상태에서 자주 호출되므로 부수효과나 다른 lock 획득은 금지.

## LockWhen — lock과 condition 동시

`Lock` + `Await`을 합친 단축형.

```cpp
mu.LockWhen(absl::Condition(&ready));
// ready가 true가 된 시점에 lock 보유
DoWork();
mu.Unlock();
```

`MutexLockWhen`이라는 RAII도 있다.

```cpp
absl::MutexLockWhen l(&mu, absl::Condition(&ready));
DoWork();
// 자동 unlock
```

## Timeout / Deadline

```cpp
absl::MutexLock l(&mu);
if (mu.AwaitWithTimeout(cond, absl::Seconds(5))) {
  // 조건 만족
} else {
  // timeout
}
```

`absl::Duration`, `absl::Time` 사용. 표준 `std::chrono`보다 표현력이 강하다 ([Part 7](/blog/programming/code-review/abseil/part7-01-time-duration-overview)에서 다룬다).

## 내부 동작

`Await`은 wake-on-unlock 메커니즘이다. mutex가 unlock될 때마다 wait queue를 순회해 cond를 평가한다. true가 된 waiter는 wake.

```cpp
// 의사 코드
void Mutex::Unlock() {
  while (!wait_queue.empty()) {
    Waiter* w = wait_queue.front();
    if (w->cond.Eval()) {        // cond 평가 (mu lock 보유)
      w->Wake();
      wait_queue.pop_front();
    }
    break;   // 다음 waiter는 다음 unlock 때
  }
  ReleaseLock();
}
```

이 모델의 비용: producer가 wake할 의무는 없지만, *unlock마다 cond 평가*가 일어난다. cond가 비싸면 contention이 증가한다. 그래서 cond는 가벼워야 한다.

## std::condition_variable과의 비교

| 측면 | condition_variable | Mutex::Await |
|---|---|---|
| notify 호출 | producer 의무 | 자동 |
| spurious wakeup | while loop 필수 | 없음 |
| predicate 위치 | 호출 측 람다 | Condition 객체 |
| 코드 라인 | 많음 | 적음 |
| 성능 | wakeup 적게 | unlock마다 cond 평가 |

성능 트레이드오프가 있다. wake 패턴이 분명하고 predicate가 가벼우면 condition_variable이 약간 빠를 수 있다. 일반 코드는 `Await`의 명료함을 선택한다.

## 코드 리뷰 포인트

**1. cv.notify + cv.wait 패턴 → Await**

```cpp
// 회피
{
  std::lock_guard l(mu);
  ready = true;
}
cv.notify_one();
// ...
std::unique_lock l(mu);
cv.wait(l, [&] { return ready; });
```

```cpp
// Good
{
  absl::MutexLock l(&mu);
  ready = true;
}
// ...
absl::MutexLock l(&mu);
mu.Await(absl::Condition(&ready));
```

**2. predicate는 멤버 함수로**

람다 + 캡처는 thread-safety 어노테이션이 잘 안 잡힌다. 멤버 함수 + `ABSL_EXCLUSIVE_LOCKS_REQUIRED`가 컴파일러 검증을 통과한다.

```cpp
class Server {
  bool ShouldStop() const ABSL_EXCLUSIVE_LOCKS_REQUIRED(mu_);
  void Run() {
    absl::MutexLock l(&mu_);
    while (!ShouldStop()) {
      mu_.Await(absl::Condition(this, &Server::HasWork));
      DoWork();
    }
  }
};
```

**3. Condition 객체 재사용**

같은 condition을 여러 번 쓰면 미리 만들어 둔다.

```cpp
const absl::Condition has_work_(this, &Server::HasWork);
// ...
mu_.Await(has_work_);
```

## 안티패턴

**predicate에서 lock 획득**

```cpp
// 회피
mu.Await(absl::Condition(+[] {
  other_mu.Lock();   // deadlock 위험
  // ...
}));
```

predicate는 mutex가 잡힌 상태에서 호출된다. 다른 lock 획득은 lock 순서 위반을 부른다.

**무거운 predicate**

```cpp
// 회피 — DB 쿼리, network 호출 등
mu.Await(absl::Condition(+[](DB* db) { return db->RowCount() > 0; }, &db));
```

unlock마다 평가되므로 contention 시 hot spot. 가벼운 메모리 검사로 한정.

**Await 안에서 외부 상태 변경**

predicate는 *판정만* 한다. 안에서 state mutation은 race 위험.

## 정리

- `Mutex::Await(Condition)`은 wait + notify + while loop을 한 줄로.
- producer는 `notify` 의무가 없다.
- `Condition`은 멤버 함수 / bool* / 함수 포인터 + 인자로 표현.
- `LockWhen` / `MutexLockWhen`으로 lock-then-await 단축.
- predicate는 *가벼움*, *순수*, *다른 lock 없음*.

## 다음 편

[Part 6-03 — Notification](/blog/programming/code-review/abseil/part6-03-notification)에서 한 번만 발생하는 signal에 특화된 primitive를 본다.

## 관련 항목

- [Part 6-01 — absl::Mutex](/blog/programming/code-review/abseil/part6-01-mutex)
- [Part 6-03 — Notification](/blog/programming/code-review/abseil/part6-03-notification)
- [Part 6-05 — Mutex annotations](/blog/programming/code-review/abseil/part6-05-mutex-annotations)
- [Tip of the Week #188: from condition_variable to Mutex::Await](https://abseil.io/tips/188)
