---
title: "folly::ExceptionWrapper — type-erased exception holder"
date: 2026-06-07T09:02:00
description: "Part 13-01: ExceptionWrapper — exception을 throw 없이 옮기는 holder. async 콜백·thread 경계에서 핵심."
series: "Folly Code Review"
seriesOrder: 56
tags: [cpp, folly, exception, wrapper, utility]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::exception_wrapper`는 **exception을 throw 없이 holding/copying/inspecting**할 수 있는 type-erased 컨테이너다. `std::exception_ptr`보다 가볍고 효율적이며, throw 없이 type 정보를 검사할 수 있다. Future, Try, 모든 비동기 API의 error 통로다.

## 동기 — std::exception_ptr의 한계

C++11의 `std::exception_ptr`는 exception을 capture해서 옮길 수 있다.

```cpp
std::exception_ptr ep;
try { throw std::runtime_error("oops"); }
catch (...) { ep = std::current_exception(); }

// 다른 스레드에서
try { std::rethrow_exception(ep); }
catch (const std::exception& e) { LOG(ERROR) << e.what(); }
```

문제.

1. **type 검사 불가** — what을 얻거나 type을 알려면 rethrow + catch 필요. throw가 비싸다(100us 단위).
2. **string 메시지 직접 추출 불가** — what() 호출하려면 catch 안에 있어야 함.
3. **copy 비용** — exception_ptr는 atomic refcount의 shared_ptr 비슷한 구조.

비동기 코드(Future chain)는 error를 자주 옮기고 검사한다. 매번 throw하면 너무 느리다.

## exception_wrapper

```cpp
#include <folly/ExceptionWrapper.h>

folly::exception_wrapper ew = folly::make_exception_wrapper<std::runtime_error>("oops");

// throw 없이 검사
if (ew.is_compatible_with<std::runtime_error>()) {
  LOG(ERROR) << ew.class_name() << ": " << ew.what();
}

// 핸들러로 분기 (throw 없이)
ew.handle(
  [](const std::runtime_error& e) { handleRuntime(e); },
  [](const std::exception& e) { handleStd(e); },
  [] { handleUnknown(); }
);

// 필요하면 throw
ew.throw_exception();
```

핵심.

- type 정보를 wrapper 안에 저장 → throw 없이 검사.
- what()도 throw 없이 호출.
- `handle()` 헬퍼로 type별 분기.
- 진짜 throw가 필요한 경계에서만 `throw_exception()`.

## 내부 구현 — 3가지 저장 모드

```cpp
class exception_wrapper {
  enum Mode { Empty, Inline, Exception_Ptr };
  Mode mode_;

  union {
    InlineStorage inline_;       // SBO — 작은 exception은 인라인
    std::exception_ptr eptr_;    // 큰 경우 fallback
  };

  const std::type_info* type_;   // type 정보
  std::string what_;             // 미리 추출
};
```

- **Inline mode**: `std::runtime_error` 같은 작은 표준 예외는 wrapper 안에 직접 저장(SBO). copy가 단순 memcpy.
- **Exception_Ptr mode**: 큰 사용자 정의 예외는 exception_ptr로.
- **Empty mode**: 예외 없음.

type 정보와 what string을 미리 뽑아 두므로 검사가 빠르다.

## 사용 패턴

### Try / Future error 통로

```cpp
folly::Future<int> compute() {
  return folly::makeFuture<int>(folly::exception_wrapper(
    std::runtime_error("bad")));
}

future.thenTry([](folly::Try<int> t) {
  if (t.hasException()) {
    auto& ew = t.exception(); // exception_wrapper&
    LOG(ERROR) << ew.what();
  }
});
```

### handle로 type별 분기

```cpp
ew.handle(
  [](const std::system_error& e) { /* OS error */ },
  [](const std::runtime_error& e) { /* logic error */ },
  [](const std::exception& e) { /* generic */ },
  [] { /* non-std exception */ }
);
```

순서대로 매칭, 첫 일치 핸들러 실행. 마지막 빈 람다는 catch(...)에 해당.

### with_exception — 한 type만

```cpp
ew.with_exception([](const std::runtime_error& e) {
  LOG(ERROR) << e.what();
}); // 다른 type이면 false 반환
```

## std::exception_ptr 비교

| | exception_ptr | exception_wrapper |
|---|--------------|---------------------|
| copy 비용 | atomic refcount | inline mode면 memcpy |
| type 검사 | rethrow 필요 | throw 없이 |
| what() | rethrow + catch | 직접 호출 |
| 핸들러 매칭 | rethrow + catch | handle()로 표 매칭 |
| empty 표현 | nullptr | Empty mode |

## 코드 리뷰 포인트

### 1. async error 통로는 exception_wrapper 사용

```cpp
// 회피 — async에서 throw
folly::Future<int> f = doAsync().then([] {
  throw std::runtime_error("oops"); // future가 잡아 exception_ptr로 변환
});

// Good — exception_wrapper로 직접
folly::Future<int> f = folly::makeFuture<int>(
  folly::make_exception_wrapper<std::runtime_error>("oops"));
```

직접 wrapper로 만들면 throw 비용이 안 듦.

### 2. handle 사용 시 base type을 마지막에

```cpp
// 회피 — base가 먼저
ew.handle(
  [](const std::exception& e) { ... },     // 모든 std::exception 매칭
  [](const std::runtime_error& e) { ... }  // 절대 도달 안 함
);

// Good — derived가 먼저
ew.handle(
  [](const std::runtime_error& e) { ... },
  [](const std::exception& e) { ... }
);
```

위에서 아래로 매칭하므로 더 구체적인 type을 먼저.

### 3. with_exception 결과 무시

```cpp
// 회피
ew.with_exception([](const std::runtime_error& e) { ... });
// runtime_error가 아니면 silent

// Good
if (!ew.with_exception(...)) {
  LOG(WARNING) << "Unexpected exception: " << ew.class_name();
}
```

특정 type만 처리하면 나머지 type을 어떻게 할지 명시.

### 4. throw_exception을 마지막 boundary에서만

```cpp
// API boundary
int doWork() {
  auto result = futureWork().get(); // Try<int>
  if (result.hasException()) {
    result.exception().throw_exception(); // 여기서만 throw
  }
  return result.value();
}
```

내부는 wrapper로 들고 다니다가 caller에게 던질 때만 throw.

## 안티패턴

### 1. catch에서 매번 exception_wrapper 생성

```cpp
// 회피 — 콜백마다 wrapper 생성
.thenTry([](folly::Try<int> t) {
  if (t.hasException()) {
    auto ew = folly::exception_wrapper(t.exception()); // 이미 wrapper인데 wrap
  }
});

// Good
.thenTry([](folly::Try<int> t) {
  if (t.hasException()) {
    auto& ew = t.exception(); // 이미 wrapper
  }
});
```

### 2. wrapper에서 throw → catch → wrapper로 복사

```cpp
// 회피 — 왕복
try { ew.throw_exception(); }
catch (...) { auto ew2 = folly::exception_wrapper(); ... }
```

wrapper로 들고 가면 throw/catch가 필요 없다. round-trip은 정확히 wrapper가 피하려는 비용.

### 3. 모든 예외를 std::exception base로 처리

```cpp
// 회피
ew.with_exception([](const std::exception& e) { ... });
// 사용자 정의 비-std 예외 누락
```

비-std 예외(예: int, 사용자 클래스)는 base가 std::exception이 아니라 매칭 실패. `handle`로 catch-all 명시.

## 정리

- exception_wrapper는 **throw 없이 type 검사 가능한 exception holder**.
- 작은 표준 예외는 inline (SBO), 큰 건 exception_ptr fallback.
- handle()로 type별 분기, with_exception()으로 단일 type 처리.
- async/thread 경계에서 throw 비용을 피한다.
- 진짜 throw는 마지막 API boundary에서.
- Try, Future의 error path가 모두 wrapper 위에서 동작.

## 다음 편

[Part 13-02 ScopeGuard](/blog/programming/code-review/folly/part13-02-scope-guard) — SCOPE_EXIT 매크로로 cleanup을 RAII로.

## 관련 항목

- [Part 6-01 to / tryTo](/blog/programming/code-review/folly/part6-01-to-try-to) — exception_wrapper로 error 반환
- [Part 2-03 SemiFuture vs Future](/blog/programming/code-review/folly/part2-03-semi-future-vs-future) — Try의 error 통로
- [Effective Modern C++ Item 14](/blog/programming/cpp/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions) — noexcept 설계
