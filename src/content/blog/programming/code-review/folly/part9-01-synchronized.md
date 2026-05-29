---
title: "Part 9-01: Synchronized (lock wrapper)"
date: 2026-05-24T17:00:00
description: "folly::Synchronized<T> — 데이터와 lock을 한 객체에 묶어 잠금 누락을 컴파일 타임에 막는다."
series: "Folly Code Review"
seriesOrder: 40
tags: [cpp, folly, sync, synchronized, raii]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::Synchronized<T>`는 데이터 `T`와 lock을 묶어 *lock 없이는 데이터 접근 자체가 불가*하게 만든다. `.wlock()`/`.rlock()`로 RAII handle을 얻고, handle의 lifetime이 critical section.

## 동기

mutex와 데이터를 별도 변수로 들고 있는 코드는 *잠금 누락* 버그가 잦다.

```cpp
// 흔한 버그 패턴
std::mutex mu;
std::vector<int> data;

void Bad() {
  data.push_back(1);   // mu 안 잡음! race
}
```

리뷰로도 잡기 어렵다. 컴파일러가 강제하면 좋겠다. abseil의 `Mutex` annotation(`GUARDED_BY`)이 이런 문제를 해결하지만 clang 한정에 macro 식.

folly는 *데이터를 mutex 안에 가둔다*. 잠금 없이 데이터에 접근 자체가 안 되는 type.

```cpp
folly::Synchronized<std::vector<int>> data;
data.wlock()->push_back(1);    // wlock 안에서만 가능
```

### lock 위에 올라간 비용을 시각화

`Synchronized`는 *어떤 lock을 어디서 잡았는가*를 명시할 뿐, contention 비용은 그대로다. 같은 critical section을 두고 여러 스레드가 다투면 직렬화된다.

![Lock contention timeline](/images/blog/cpp-concepts/diagrams/lock-contention-timeline.svg)

CS는 동시에 1 스레드만 들어간다. 짧은 CS, lock-free 자료구조, fine-grained lock으로 wait 영역을 줄이는 것이 핵심이다. `folly::Synchronized`의 통계 훅으로 wait time을 직접 측정할 수 있다.

## API & 사용법

```cpp
#include <folly/Synchronized.h>

folly::Synchronized<std::vector<int>> data;

// 1. wlock — exclusive write
{
  auto locked = data.wlock();
  locked->push_back(1);
  locked->push_back(2);
}   // unlock

// 2. rlock — shared read (SharedMutex 사용 시)
{
  auto locked = data.rlock();
  size_t n = locked->size();
}

// 3. withWLock — 람다로 더 짧게
data.withWLock([](auto& v) {
  v.push_back(3);
});

// 4. withRLock
auto n = data.withRLock([](const auto& v) {
  return v.size();
});

// 5. SynchronizedPtr — 명시적 pointer-like
folly::Synchronized<int> n;
*n.wlock() = 42;

// 6. 직접 ctor에 args 전달
folly::Synchronized<std::string> s{"hello"};
folly::Synchronized<std::vector<int>, std::mutex> v;   // mutex type 선택
```

기본 mutex는 `folly::SharedMutex`(reader-writer). `std::mutex`, `std::recursive_mutex` 등도 template parameter로 지정 가능.

## 내부 구현

![Synchronized RAII lock guard](/images/blog/folly/diagrams/part9-01-synchronized-wrapper.svg)

```cpp
// 약식 — folly/Synchronized.h
template <class T, class Mutex = SharedMutex>
class Synchronized {
  mutable Mutex mu_;
  T             data_;

public:
  template <class... Args>
  Synchronized(Args&&... args) : data_(std::forward<Args>(args)...) {}

  auto wlock() {
    return LockedPtr<T, Mutex, LockMode::EXCLUSIVE>(this);
  }

  auto rlock() const {
    return LockedPtr<const T, Mutex, LockMode::SHARED>(this);
  }
};

template <class T, class Mutex, LockMode Mode>
class LockedPtr {
  Synchronized<T, Mutex>* parent_;
  // ctor에서 lock, dtor에서 unlock
public:
  LockedPtr(Synchronized<T, Mutex>* p) : parent_(p) {
    if constexpr (Mode == EXCLUSIVE) parent_->mu_.lock();
    else                              parent_->mu_.lock_shared();
  }
  ~LockedPtr() {
    if (parent_) {
      if constexpr (Mode == EXCLUSIVE) parent_->mu_.unlock();
      else                              parent_->mu_.unlock_shared();
    }
  }
  T* operator->() { return &parent_->data_; }
  T& operator*()  { return  parent_->data_; }
};
```

`LockedPtr`는 movable, copy 안 됨. `operator->`로 직접 멤버 접근. lifetime이 critical section을 정의.

### 두 객체 동시 lock

```cpp
folly::Synchronized<X> a;
folly::Synchronized<Y> b;

// 동시 lock — deadlock 방지 위해 항상 같은 순서
auto [la, lb] = folly::acquireLocked(a, b);
la->doX();
lb->doY();
```

`acquireLocked`는 deadlock 회피 알고리즘(주소 정렬 또는 try-lock 백오프) 사용. 직접 두 wlock 호출하면 다른 순서로 lock 잡힐 위험.

## std/abseil 비교

```cpp
// std + 직접 작성
std::mutex mu;
std::vector<int> v;
{ std::lock_guard g(mu); v.push_back(1); }

// abseil — annotation 기반
ABSL_MUST_USE_RESULT absl::MutexLock l(&mu_);   // 잡지만 데이터 직접 보호 X
// 또는
class MyClass {
  absl::Mutex mu_;
  std::vector<int> v_ ABSL_GUARDED_BY(mu_);    // clang annotation
};

// folly
folly::Synchronized<std::vector<int>> v;
v.wlock()->push_back(1);
```

| 항목 | std | absl annotation | folly::Synchronized |
|------|-----|------------------|----------------------|
| Lock 누락 검출 | 없음 | clang annotation (warning) | 컴파일 에러 |
| API | 외부 lock | 외부 lock + annotation | 데이터에 통합 |
| Lock 종류 | mutex만 외부 지정 | 외부 | template parameter |
| 두 lock 동시 | std::lock | absl::WriterMutexLock | acquireLocked |

folly의 강점: *컴파일 타임에 enforce*. 데이터 접근 path가 lock acquire와 같은 expression.

## 코드 리뷰 포인트

```cpp
// Bad — LockedPtr를 다른 함수에 전달
void Helper(auto& locked_ptr) {  // mutex가 계속 잡힌 채로
  locked_ptr->Process();
}
data.withWLock([&](auto& v) {
  Helper(v);   // OK
});
auto l = data.wlock();
Helper(l);    // 위험 — lock 유효 시간이 모호해짐
```

`LockedPtr`는 wlock/rlock 호출과 같은 scope에서 즉시 사용. 다른 함수에 long-live로 넘기지 않는다.

```cpp
// Bad — 중첩 lock
folly::Synchronized<X> a;
folly::Synchronized<Y> b;

void f() {
  auto la = a.wlock();
  auto lb = b.wlock();   // deadlock 가능 — 다른 thread가 b→a 순서면
}

// Good
void f() {
  auto [la, lb] = folly::acquireLocked(a, b);
  // ...
}
```

```cpp
// Good — withWLock으로 critical section 명시
data.withWLock([](auto& v) {
  if (v.size() > kMax) v.resize(kMax);
  v.push_back(item);
});
// 람다 끝 = lock release. critical section 한눈에.
```

람다 폼이 가장 안전. lifetime을 람다 scope로 못박는다.

## 안티패턴

- **`*data.wlock()`을 reference에 받기**: `auto& v = *data.wlock();`는 LockedPtr가 즉시 destruct → lock 해제 → reference dangling. `auto l = data.wlock(); auto& v = *l;`처럼 LockedPtr 살리기.
- **wlock 안에서 외부 콜백 호출**: blocking I/O가 lock을 끄지 않으면 다른 thread가 무한 대기. critical section은 짧게.
- **`std::mutex` 와 `folly::Synchronized` 혼용**: 두 lock이 다른 객체에 걸리면 동시 lock 시 deadlock 회피 로직이 안 통한다. 한 가지로 통일.

## 정리

- `Synchronized<T, Mutex>`는 데이터에 lock을 통합 — 무잠금 접근 컴파일 차단.
- `wlock()`/`rlock()` 또는 `withWLock`/`withRLock` 두 형태.
- LockedPtr의 lifetime이 critical section.
- `acquireLocked`로 두 객체 동시 lock 안전.
- 람다 형(`withWLock`)이 의도 가장 명확.

## 다음 편

`Synchronized`의 default mutex인 `folly::SharedMutex`의 내부를 본다. std::shared_mutex와 무엇이 다른가.

## 관련 항목

- [Part 9-02: SharedMutex](/blog/programming/code-review/folly/part9-02-shared-mutex) — default mutex 상세
- [Part 8-04: ConcurrentHashMap](/blog/programming/code-review/folly/part8-04-concurrent-hash-map) — shard별 lock의 응용
- [Part 1-02: Folly vs Abseil 철학](/blog/programming/code-review/folly/part1-02-folly-vs-abseil-philosophy) — annotation vs encapsulation
- [원문 — folly/Synchronized.h](https://github.com/facebook/folly/blob/main/folly/Synchronized.h)
