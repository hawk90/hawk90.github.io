---
title: "folly::ScopeGuard·SCOPE_EXIT — RAII cleanup"
date: 2026-06-07T09:03:00
description: "Part 13-02: ScopeGuard / SCOPE_EXIT — RAII로 cleanup 보장. C에서 넘어온 코드 정리에 강력하다."
series: "Folly Code Review"
seriesOrder: 57
tags: [cpp, folly, scope-guard, raii, cleanup]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`SCOPE_EXIT`는 **scope가 끝날 때(정상이든 예외든) 람다를 실행**하는 매크로다. C API를 감싸거나 unique_ptr를 만들기 부담스러운 일회성 cleanup에 가장 잘 맞는다. RAII class를 매번 만드는 보일러플레이트를 한 줄로 줄인다.

## 동기 — C API와 cleanup 보일러플레이트

C API를 C++에서 쓰면 cleanup이 까다롭다.

```cpp
// 회피
FILE* f = fopen("data", "rb");
if (!f) return;
char* buf = (char*)malloc(1024);
if (!buf) { fclose(f); return; } // cleanup 중복
auto n = fread(buf, 1, 1024, f);
if (n == 0) { free(buf); fclose(f); return; } // 또 중복
// ...
free(buf);
fclose(f);
```

cleanup 코드가 모든 early return마다 반복된다. 잊으면 leak. 예외라도 던지면 더 복잡.

전통적 해법.

- **unique_ptr with custom deleter**: 깔끔하지만 type 정의가 매번 필요.
- **RAII wrapper class**: 일회성이라면 과한 보일러플레이트.

ScopeGuard는 그 중간이다. 한 줄의 람다로 정리.

## API

```cpp
#include <folly/ScopeGuard.h>

FILE* f = fopen("data", "rb");
if (!f) return;
SCOPE_EXIT { fclose(f); };

char* buf = (char*)malloc(1024);
if (!buf) return; // SCOPE_EXIT가 fclose(f)
SCOPE_EXIT { free(buf); };

// ... 작업
// scope 끝: free → fclose 순서로 자동
```

`SCOPE_EXIT { ... };`는 매크로다. 등록 시점부터 scope 종료까지 람다를 보관하다가, 종료 시점(정상/예외 모두) 실행.

### RAII 원리 — 그림

`SCOPE_EXIT`는 익명 RAII 객체를 만드는 macro다. 동작은 일반 RAII와 같다.

![RAII scope guard](/images/blog/cpp-concepts/diagrams/raii-scope-guard.svg)

정상 return이든 throw든 scope를 빠져나가면 destructor가 호출된다 — 그래서 `goto cleanup` 사다리가 필요 없다.

### dismissible variant — makeGuard

```cpp
auto guard = folly::makeGuard([&]{ rollback(); });
doStep1();
doStep2();
guard.dismiss(); // 모든 step 성공 → rollback 취소
```

명시적으로 dismiss할 수 있는 guard. 트랜잭션 패턴에 유용.

### SCOPE_FAIL / SCOPE_SUCCESS

```cpp
SCOPE_FAIL    { rollback(); };  // 예외로 종료 시만
SCOPE_SUCCESS { commit(); };    // 정상 종료 시만
```

내부적으로 `std::uncaught_exceptions()`로 종료 경로를 구분.

## 내부 구현

```cpp
template <typename F>
class ScopeGuardImpl {
  F func_;
  bool dismissed_ = false;
public:
  ScopeGuardImpl(F&& f) : func_(std::move(f)) {}
  ~ScopeGuardImpl() noexcept {
    if (!dismissed_) {
      try { func_(); }
      catch (...) { /* swallow */ }
    }
  }
  void dismiss() { dismissed_ = true; }
};

#define SCOPE_EXIT \
  auto SCOPE_EXIT_VAR(__LINE__) = ::folly::detail::ScopeGuardOnExit() + [&]() noexcept
```

매크로의 `+`가 트릭이다. ScopeGuardOnExit이라는 dummy 객체에 람다를 `operator+`로 결합 → 결과를 auto 변수에 저장. 변수가 scope 끝에 소멸하며 람다 실행.

### 예외 안전

`~ScopeGuardImpl`은 `noexcept(true)` 안에서 try-catch로 람다 예외를 삼킨다. 람다가 throw해도 stack unwinding 중 또 다른 예외가 안 됨. C++의 "소멸자에서 throw 금지" 원칙 준수.

## 사용 패턴

### 자원 해제

```cpp
auto* socket = create_socket();
SCOPE_EXIT { destroy_socket(socket); };

auto* mmap = ::mmap(...);
SCOPE_EXIT { ::munmap(mmap, size); };
```

### lock 해제 (mutex 외 케이스)

```cpp
hardware_lock();
SCOPE_EXIT { hardware_unlock(); };
```

mutex라면 `lock_guard`가 더 낫다. 일회성 lock API에 SCOPE_EXIT.

### 트랜잭션 rollback

```cpp
auto guard = folly::makeGuard([&]{ db.rollback(); });
db.begin();
db.execute(query1);
db.execute(query2);
db.commit();
guard.dismiss();
```

commit 후 dismiss. 중간에 예외나 early return이면 rollback 자동.

### 디버그 로깅

```cpp
LOG(INFO) << "entering critical section";
SCOPE_EXIT { LOG(INFO) << "leaving critical section"; };
```

enter/leave가 한 곳에 있어 가독성 좋음.

## std / abseil 비교

| 기능 | std | folly |
|------|-----|--------|
| RAII helper | manual class | ScopeGuard |
| scope-exit | C++23 stdlib에 없음 | SCOPE_EXIT |
| dismiss | manual | makeGuard.dismiss() |
| exit/fail/success 구분 | 없음 | SCOPE_FAIL / SCOPE_SUCCESS |
| Abseil | `absl::Cleanup` | 동일 개념 |

`absl::Cleanup`이 가장 가까운 비교 대상이다. `auto c = absl::MakeCleanup([&]{ ... });` 패턴으로 folly의 makeGuard와 같다. SCOPE_EXIT 같은 매크로 단축형은 Abseil에 없다.

C++26에 `std::scope_exit` 제안이 있지만 표준화는 미정.

## 코드 리뷰 포인트

### 1. unique_ptr vs SCOPE_EXIT

```cpp
// unique_ptr — type 정의 가능, 반복 사용
struct FileCloser { void operator()(FILE* f) { fclose(f); } };
std::unique_ptr<FILE, FileCloser> f(fopen(...));

// SCOPE_EXIT — 일회성, 짧음
FILE* f = fopen(...);
SCOPE_EXIT { fclose(f); };
```

같은 cleanup을 여러 곳에서 쓰면 unique_ptr custom deleter, 일회성이면 SCOPE_EXIT.

### 2. SCOPE_EXIT 안에서 throw

```cpp
// 회피
SCOPE_EXIT { mayThrow(); }; // 람다가 throw하면 ScopeGuard가 삼킴
```

람다는 noexcept로 작성. throw 가능성이 있으면 try-catch 안에서.

### 3. 캡처 by-reference 주의

```cpp
// 회피
{
  std::string s = "data";
  SCOPE_EXIT { LOG(INFO) << s; }; // s는 SCOPE_EXIT 실행 시점에 유효
} // scope 끝 — SCOPE_EXIT 먼저, 그다음 s 소멸. 안전.

// 회피 — 더 큰 scope의 reference
SCOPE_EXIT { LOG(INFO) << *ptr; }; // ptr이 어디서 살아있는지?
```

scope 안 local에 대한 reference는 안전. 그 밖은 lifetime 확인.

### 4. dismiss 안 한 makeGuard

```cpp
// 회피
auto g = folly::makeGuard([&]{ rollback(); });
// dismiss 없음 → 항상 rollback
// → commit 후 rollback도 호출됨
```

makeGuard는 commit/dismiss를 잊으면 무조건 cleanup 실행. SCOPE_FAIL이 더 적합.

## 안티패턴

### 1. SCOPE_EXIT 안에서 무거운 작업

```cpp
// 회피
SCOPE_EXIT {
  flushAllBuffers();
  uploadToS3();
  notifyMonitoring();
};
```

scope 끝(특히 예외 경로)에서 무거운 작업이 도는 건 디버깅 어렵게 만든다. cleanup은 가볍게.

### 2. SCOPE_EXIT 중첩 의존

```cpp
// 회피
SCOPE_EXIT { unlock(); }; // first
SCOPE_EXIT { releaseBuf(); }; // second
```

실행 순서는 등록 역순(LIFO). 의도와 다르면 코드 깨짐. 의존성 있는 cleanup은 한 람다에 모으거나 단일 RAII class.

### 3. early return 후 SCOPE_EXIT

```cpp
// 회피
if (cond) return; // SCOPE_EXIT 등록 전
SCOPE_EXIT { cleanup(); };
```

자원 획득 직후 등록 — early return 전에.

## 정리

- SCOPE_EXIT은 scope 종료 시 람다 실행, 정상/예외 모두.
- SCOPE_FAIL/SCOPE_SUCCESS로 경로별 분기.
- `makeGuard` + dismiss는 트랜잭션 패턴.
- C API 일회성 cleanup에 가장 잘 맞음.
- 반복 사용 자원은 unique_ptr custom deleter가 더 명확.
- 람다는 noexcept로, 의존 순서는 LIFO.
- absl::Cleanup이 가장 가까운 대안.

## 다음 편

[Part 13-03 folly::Optional vs std::optional](/blog/programming/code-review/folly/part13-03-folly-optional) — 왜 Folly에 자체 Optional이 있고 어떻게 다른가.

## 관련 항목

- [Part 13-01 ExceptionWrapper](/blog/programming/code-review/folly/part13-01-exception-wrapper) — SCOPE_FAIL과 함께 쓰기
- [Effective Modern C++ Item 14](/blog/programming/cpp/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions) — 소멸자 noexcept
- GoF Decorator — wrap 패턴 일반론
