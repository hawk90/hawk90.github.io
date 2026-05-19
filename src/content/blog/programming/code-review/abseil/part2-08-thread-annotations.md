---
title: "Part 2-08: thread_annotations — clang TSA"
date: 2026-05-23T13:00:00
description: "Part 2-08: ABSL_GUARDED_BY, ABSL_LOCKS_EXCLUDED — clang의 thread safety analysis로 mutex 사용을 컴파일 시점에 검증."
series: "Abseil Code Review"
seriesOrder: 13
tags: [cpp, abseil, thread-safety, clang, annotations, mutex]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

> **한 줄 요약**: `ABSL_GUARDED_BY`, `ABSL_LOCKS_EXCLUDED` 같은 매크로는 clang의 thread safety analysis(TSA)를 활성화해 mutex 보호가 누락된 변수 접근을 컴파일 시점에 잡는다. runtime race detector가 따라잡지 못하는 종류의 버그를 미리 차단한다.

## 어떤 문제를 푸는가

멀티스레드 코드에서 가장 흔한 버그는 "이 변수는 어느 mutex로 보호되는가"를 사람이 기억해야 한다는 점에서 온다.

```cpp
class Server {
public:
    void HandleRequest() {
        // queue_를 손대는데 lock 잡았나?
        queue_.push(request);  // 깜빡하면 race
    }

private:
    absl::Mutex mu_;
    std::queue<Request> queue_;  // 어떤 mutex로 보호되는지 헤더만 봐서는 모름
};
```

ThreadSanitizer는 runtime에 race를 잡지만, race가 *실제로 발생한 케이스*만 본다. 코드가 race를 일으킬 *수* 있어도 테스트에서 발생 안 했으면 놓친다.

clang TSA는 정적 분석으로 컴파일 시점에 잡는다. mutex와 변수의 관계를 annotation으로 명시하면 컴파일러가 모든 사용 경로를 검사한다.

## ABSL_GUARDED_BY

변수가 특정 mutex의 보호를 받음을 선언.

```cpp
#include "absl/base/thread_annotations.h"

class Server {
public:
    void HandleRequest(const Request& req) {
        absl::MutexLock lock(&mu_);
        queue_.push(req);  // OK — mu_ 잡고 있음
    }

    void Unsafe(const Request& req) {
        queue_.push(req);  // 컴파일 경고: must hold mu_
    }

private:
    absl::Mutex mu_;
    std::queue<Request> queue_ ABSL_GUARDED_BY(mu_);
};
```

`ABSL_GUARDED_BY(mu_)`는 컴파일러가 보는 메타데이터다. 코드 동작에는 영향 없다. clang TSA가 분석할 때만 의미를 가진다.

`-Wthread-safety` 옵션이 켜져 있으면 위반을 경고로 알린다.

## ABSL_PT_GUARDED_BY

포인터를 통한 접근을 보호. 포인터 자체가 아니라 포인터가 가리키는 데이터.

```cpp
class Server {
private:
    absl::Mutex mu_;
    int* data_ ABSL_PT_GUARDED_BY(mu_);
    // data_ 변수 자체는 누구나 읽을 수 있음
    // *data_ 또는 data_[i]는 mu_가 필요
};
```

차이를 정리하면.

```cpp
int* p1 ABSL_GUARDED_BY(mu_);    // p1 자체에 접근하려면 mu_ 필요
int* p2 ABSL_PT_GUARDED_BY(mu_); // p2가 가리키는 값에 접근하려면 mu_ 필요
```

## ABSL_LOCKS_EXCLUDED

함수가 특정 mutex를 *잡지 않은 상태*에서 호출되어야 함을 선언.

```cpp
class Server {
public:
    void Process() ABSL_LOCKS_EXCLUDED(mu_) {
        // 이 함수 진입 시점에 mu_가 unlocked여야 함
        absl::MutexLock lock(&mu_);
        DoWork();
    }
};

void BadCaller(Server* s) {
    absl::MutexLock lock(&s->mu_);  // 잡고
    s->Process();                    // 호출 — 경고: re-entrant lock 시도
}
```

재진입(re-entrant) lock 시도를 막는 용도다. `absl::Mutex`는 non-recursive이므로 deadlock이 일어난다.

## ABSL_EXCLUSIVE_LOCKS_REQUIRED / ABSL_SHARED_LOCKS_REQUIRED

함수가 특정 mutex를 *이미 잡은 상태*로 호출되어야 함을 선언.

```cpp
class Server {
private:
    absl::Mutex mu_;
    int counter_ ABSL_GUARDED_BY(mu_);

    void IncrementLocked() ABSL_EXCLUSIVE_LOCKS_REQUIRED(mu_) {
        ++counter_;  // OK — caller가 mu_를 잡은 걸 보장
    }

public:
    void Increment() {
        absl::MutexLock lock(&mu_);
        IncrementLocked();
    }
};
```

private helper에 자주 붙인다. caller에게 "이 mutex를 잡고 와라"를 강제한다.

## ABSL_NO_THREAD_SAFETY_ANALYSIS

분석을 끄는 escape hatch.

```cpp
void Hack() ABSL_NO_THREAD_SAFETY_ANALYSIS {
    // 이 함수 안의 mutex 사용은 분석 대상에서 제외
}
```

언제 쓰는가. TSA가 추론할 수 없는 복잡한 패턴 — 다른 객체에 mutex 소유권을 넘기는 상황 등. escape hatch는 신중히. 가능하면 다른 annotation으로 해결할 것.

## 더 정교한 annotation

### ABSL_ACQUIRED_AFTER / ABSL_ACQUIRED_BEFORE

mutex 획득 순서를 강제. deadlock 방지.

```cpp
class A {
private:
    absl::Mutex mu_a_;
    absl::Mutex mu_b_ ABSL_ACQUIRED_AFTER(mu_a_);
    // mu_a_ 먼저, 그 다음 mu_b_

    void Bad() {
        absl::MutexLock l_b(&mu_b_);
        absl::MutexLock l_a(&mu_a_);  // 경고: order 위반
    }
};
```

### ABSL_LOCK_RETURNED

함수가 mutex를 반환함을 선언.

```cpp
class Container {
public:
    absl::Mutex* GetMutex() ABSL_LOCK_RETURNED(mu_) {
        return &mu_;
    }
private:
    absl::Mutex mu_;
    int value_ ABSL_GUARDED_BY(mu_);
};

void User(Container* c) {
    absl::MutexLock lock(c->GetMutex());
    // TSA가 이 lock이 c->mu_와 같음을 안다
    c->value_ = 1;  // OK
}
```

## clang TSA 활성화

CMake에서.

```cmake
target_compile_options(my_lib PRIVATE
    -Wthread-safety
    -Wthread-safety-beta  # 일부 실험적 기능
)
```

GCC는 TSA를 지원하지 않는다. clang 전용. GCC 빌드에서는 매크로가 no-op이 되어 컴파일은 통과하지만 검사는 안 된다.

## 동작 메커니즘

```cpp
// 실제 매크로 정의
#if defined(__clang__) && (!defined(SWIG))
    #define ABSL_GUARDED_BY(x) __attribute__((guarded_by(x)))
    #define ABSL_LOCKS_EXCLUDED(...) __attribute__((locks_excluded(__VA_ARGS__)))
#else
    #define ABSL_GUARDED_BY(x)
    #define ABSL_LOCKS_EXCLUDED(...)
#endif
```

clang에서만 활성화된다. clang의 `__attribute__((guarded_by(...)))`로 확장.

분석기는 attribute를 보고 모든 함수 호출 경로를 따라가며 lock 상태를 추적한다. control flow가 복잡해도 (if-else, switch 등) 보수적으로 잡는다.

## std::mutex와의 호환

표준 `std::mutex`에 대해서는 TSA가 직접 동작하지 않는다. Abseil은 `ABSL_LOCKABLE` 등의 매크로로 `absl::Mutex`에 annotation을 붙여 분석 가능하게 만든다.

```cpp
// absl/synchronization/mutex.h에서 발췌
class ABSL_LOCKABLE Mutex {
public:
    void Lock() ABSL_EXCLUSIVE_LOCK_FUNCTION();
    void Unlock() ABSL_UNLOCK_FUNCTION();
    bool TryLock() ABSL_EXCLUSIVE_TRYLOCK_FUNCTION(true);
    // ...
};
```

`std::mutex`에 TSA를 쓰려면 사용자가 직접 wrapping해야 한다. Abseil의 `absl::Mutex`는 처음부터 TSA-friendly.

## 코드 리뷰 포인트

```cpp
// 회피 — mutex로 보호되는 변수에 annotation 없음
class Server {
private:
    absl::Mutex mu_;
    std::queue<int> queue_;  // 어느 mutex가 보호?
};

// Good
class Server {
private:
    absl::Mutex mu_;
    std::queue<int> queue_ ABSL_GUARDED_BY(mu_);
};
```

```cpp
// 회피 — private helper에 lock 요구 명시 없음
class Server {
private:
    void IncrementUnsafe() {  // caller가 lock 잡았는지 모름
        ++counter_;
    }
    int counter_ ABSL_GUARDED_BY(mu_);
};

// Good
class Server {
private:
    void IncrementLocked() ABSL_EXCLUSIVE_LOCKS_REQUIRED(mu_) {
        ++counter_;
    }
};
```

```cpp
// 회피 — NO_THREAD_SAFETY_ANALYSIS 남용
void Process() ABSL_NO_THREAD_SAFETY_ANALYSIS {
    // ...
}
// 안전성 검사를 꺼버림. 정말 필요한지 검토.
```

리뷰에서:

1. **mutex로 보호되는 모든 변수에 `GUARDED_BY` 있는가**.
2. **`_Locked` 접미사가 붙은 helper는 `EXCLUSIVE_LOCKS_REQUIRED`도 있는가**.
3. **`NO_THREAD_SAFETY_ANALYSIS`는 명확한 사유와 함께 쓰였는가**.
4. **clang 빌드에서 `-Wthread-safety`가 켜져 있는가**.

## 자주 보는 안티패턴

```cpp
// 회피 — GUARDED_BY인데 mutex 안 잡고 접근
class Server {
private:
    absl::Mutex mu_;
    int counter_ ABSL_GUARDED_BY(mu_);

public:
    int GetCounter() const { return counter_; }  // 경고: must hold mu_
};

// Good
int GetCounter() const ABSL_LOCKS_EXCLUDED(mu_) {
    absl::MutexLock lock(&mu_);
    return counter_;
}
```

```cpp
// 회피 — public method에서 mutex를 잡고 다른 public method 호출
void A() ABSL_LOCKS_EXCLUDED(mu_) {
    absl::MutexLock lock(&mu_);
    B();  // B도 mu_를 잡으려 함 → deadlock
}

void B() ABSL_LOCKS_EXCLUDED(mu_) {
    absl::MutexLock lock(&mu_);
    // ...
}

// Good — internal helper로 분리
void A() ABSL_LOCKS_EXCLUDED(mu_) {
    absl::MutexLock lock(&mu_);
    BLocked();
}

void B() ABSL_LOCKS_EXCLUDED(mu_) {
    absl::MutexLock lock(&mu_);
    BLocked();
}

void BLocked() ABSL_EXCLUSIVE_LOCKS_REQUIRED(mu_) {
    // ...
}
```

## 정리

- `ABSL_GUARDED_BY`는 변수가 특정 mutex의 보호를 받음을 선언.
- `LOCKS_EXCLUDED` / `EXCLUSIVE_LOCKS_REQUIRED` / `SHARED_LOCKS_REQUIRED`로 함수의 lock 요구사항 표시.
- clang TSA가 컴파일 시점에 모든 사용 경로 검사. runtime race detector보다 먼저 잡음.
- `absl::Mutex`는 처음부터 TSA-friendly. `std::mutex`는 직접 wrapping 필요.
- `NO_THREAD_SAFETY_ANALYSIS`는 escape hatch. 신중히.

## 다음 편

Part 3로 넘어간다. Part 3-01에서 `absl::Status`를 본다. Google이 exception 없이 어떻게 production C++ 에러 처리를 하는지, canonical error code 체계가 어떻게 구성되어 있는지 다룬다.

## 관련 항목

- [Part 2-01: ABSL_HAVE_* / ABSL_ATTRIBUTE_*](/blog/programming/code-review/abseil/part2-01-abseil-macros)
- [Part 2-07: raw_logging](/blog/programming/code-review/abseil/part2-07-raw-logging)
- [Part 6-01: absl::Mutex vs std::mutex](/blog/programming/code-review/abseil/part6-01-mutex)
- [Part 6-05: Mutex annotations](/blog/programming/code-review/abseil/part6-05-mutex-annotations)
- [원문 — absl/base/thread_annotations.h](https://github.com/abseil/abseil-cpp/blob/master/absl/base/thread_annotations.h)
- [원문 — Clang Thread Safety Analysis](https://clang.llvm.org/docs/ThreadSafetyAnalysis.html)
