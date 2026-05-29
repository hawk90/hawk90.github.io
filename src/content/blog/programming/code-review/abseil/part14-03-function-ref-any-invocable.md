---
title: "Part 14-03: function_ref와 any_invocable — 함수 객체 전달의 두 축"
date: 2026-05-26T03:00:00
description: "absl::FunctionRef는 non-owning callable view, absl::AnyInvocable는 std::function 대체 movable owner. 둘의 차이와 선택 기준."
series: "Abseil Code Review"
seriesOrder: 71
tags: [cpp, abseil, function-ref, any-invocable, std-function]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 한 줄 요약

`absl::FunctionRef<R(Args...)>`는 *함수 객체를 빌려 보는* non-owning 참조다. `absl::AnyInvocable<R(Args...)>`는 movable-only callable owner로 `std::function`의 한계(copy 강제, 큰 SBO)를 해소한 대체품이다. 콜백을 *호출만* 할 거면 `FunctionRef`, *저장*하면 `AnyInvocable`이 기본이다.

## 동기

callable을 매개변수로 받는 인터페이스는 흔하다. 표준 도구 두 개가 있지만 각각 문제가 있다.

- `template <class F>` — 헤더에 구현을 노출해야 하고 컴파일 시간이 늘어난다.
- `std::function<R(Args...)>` — copy 생성자를 *요구*하고 type erasure를 위한 heap alloc이 잦다.

이를 정리하면:

```cpp
// 회피 1 — 헤더 의존 강제
template <typename Pred>
void ForEach(Pred p);

// 회피 2 — copy 가능 강제 + alloc
void ForEach(std::function<void(int)> p);
```

`std::function`은 `std::move_only_function`이 C++23에 들어오기 전까지 *움직임만 되는* lambda (예: `unique_ptr` 캡처)를 받을 수 없다. 동기 콜백에 대해 callable을 복사할 이유가 없는데도 복사 비용을 지불한다.

## FunctionRef — 호출만 할 거면 충분하다

`FunctionRef`는 두 워드(callable* + invoker*)만 갖는 view다.

```cpp
#include "absl/functional/function_ref.h"

void ForEach(absl::FunctionRef<void(int)> visit);

ForEach([](int x) { LOG(INFO) << x; });
ForEach(std::function<void(int)>(SomeFreeFn));
ForEach(SomeFreeFn);
```

호출자 lambda는 *호출 동안*만 살아 있으면 된다. heap alloc 없다.

```cpp
// absl/functional/function_ref.h (요약)
template <typename R, typename... Args>
class FunctionRef<R(Args...)> {
  using Invoker = R (*)(intptr_t, Args...);

  intptr_t ptr_;
  Invoker invoker_;

 public:
  template <typename F>
  FunctionRef(F&& f) noexcept {
    ptr_ = reinterpret_cast<intptr_t>(std::addressof(f));
    invoker_ = [](intptr_t p, Args... args) -> R {
      return (*reinterpret_cast<F*>(p))(std::forward<Args>(args)...);
    };
  }

  R operator()(Args... args) const {
    return invoker_(ptr_, std::forward<Args>(args)...);
  }
};
```

*caller에서 만든 lambda의 주소*를 들고 있다가 호출 시 invoker를 통해 trampoline한다. 16바이트, alloc 0, 호출 1 indirect.

**제약**: lifetime이 호출 동안만 유효해야 하므로 *저장 금지*. 멤버 변수에 넣으면 거의 확실히 dangling.

```cpp
// 회피
class Worker {
  absl::FunctionRef<void()> cb_;  // 곧 dangling
};

// Good — 보관할 거면 AnyInvocable 또는 std::function
class Worker {
  absl::AnyInvocable<void()> cb_;
};
```

## AnyInvocable — std::function의 대체

`AnyInvocable`은 callable을 *소유*하지만 `std::function`이 강제하는 *복사 가능* 요구를 없앤다.

```cpp
#include "absl/functional/any_invocable.h"

absl::AnyInvocable<void()> task = [up = std::make_unique<int>(42)] {
  LOG(INFO) << *up;
};

scheduler.Post(std::move(task));
```

`std::function`이라면 위 lambda를 받지 못한다(`unique_ptr` 캡처 → non-copyable). `AnyInvocable`은 movable만 요구한다.

### `const`, `noexcept`, `&` qualifier 지원

`AnyInvocable`은 호출 qualifier를 시그니처에 인코딩한다.

```cpp
absl::AnyInvocable<int() const>            f1;  // const-callable만
absl::AnyInvocable<int() &&>               f2;  // 한 번만 호출 (소비)
absl::AnyInvocable<int() noexcept>         f3;  // noexcept callable만
absl::AnyInvocable<int(int) const noexcept> f4;
```

특히 `R() &&`는 *한 번 실행하고 소비*하는 일회성 task를 안전하게 표현한다. `std::function`은 이를 표현할 수 없다.

### SBO

`AnyInvocable`은 작은 callable을 내부 버퍼에 in-place로 저장한다 (보통 3 워드, 24 바이트). 그 이상은 heap alloc.

```cpp
// 무료 — SBO 적용
absl::AnyInvocable<void()> f = [] { ... };

// alloc — 캡처가 큼
absl::AnyInvocable<void()> g = [v = std::vector<int>(100)] { use(v); };
```

`std::function`도 SBO를 가지지만 표준이 크기를 규정하지 않아 구현 의존이다. `AnyInvocable`은 *명시된* 크기를 갖는다.

## 비교 표

| 항목 | function_ref | any_invocable | std::function | std::move_only_function (C++23) |
|---|---|---|---|---|
| 소유 | × | O | O | O |
| copy | — | × | O | × |
| move | — | O | O | O |
| 비용 | 16B view | 24B SBO + alloc | 32B SBO + alloc | 32B SBO + alloc |
| const/noexcept qualifier | × | O | × | O |
| 표준 | — | — | C++11 | C++23 |

## 코드 리뷰 포인트

**1. "호출만" 매개변수면 FunctionRef**

```cpp
// 회피 — alloc + copy 강제
void Each(std::function<void(int)> visit);

// Good
void Each(absl::FunctionRef<void(int)> visit);
```

`Each`가 callback을 저장하지 않고 호출만 한다면 alloc할 이유가 없다.

**2. 저장은 AnyInvocable, std::function 권장 회피**

```cpp
// 회피 — copy 강제 + 큰 SBO
class TaskQueue {
  std::vector<std::function<void()>> queue_;
};

// Good — move-only OK, 작은 SBO
class TaskQueue {
  std::vector<absl::AnyInvocable<void() &&>> queue_;
};
```

`&&` qualifier로 *한 번만 호출* 의도를 시그니처에 표시한다.

**3. template parameter 회피하고 싶을 때**

```cpp
// 회피 — 모든 호출자가 헤더로
template <typename Pred>
inline void ForEachLine(Pred p);

// Good — .cc로 이동
void ForEachLine(absl::FunctionRef<void(absl::string_view)> p);
```

template 폭증을 막는 가장 가벼운 도구.

**4. lifetime은 호출자가 책임**

```cpp
absl::FunctionRef<void()> Cache() {
  return [] { LOG(INFO) << "cached"; };  // dangling — lambda는 임시
}
```

`FunctionRef`는 절대 반환 타입으로 쓰지 않는다.

## std::function과 무엇이 진짜 다른가

`std::function`은 1990년대 Boost에서 출발한 디자인이다. 그 시절의 결정이 굳어 있다.

- copy 요구는 message passing 이전의 가정.
- type erasure에 대한 SBO 크기 표준이 없다.
- `const`, `noexcept` qualifier를 시그니처에 인코딩하지 못한다.

`absl::AnyInvocable`은 이 셋을 모두 해결한 *Google이 사내에서 권장하는 표준 교체*다. `std::move_only_function`(C++23)이 일부 격차를 메우지만 `noexcept` qualifier와 SBO 크기 명시는 여전히 `AnyInvocable`이 앞선다.

## 자주 보는 안티패턴

**FunctionRef 멤버 저장**

```cpp
class Worker {
  absl::FunctionRef<void()> cb_;
  void Run() { cb_(); }   // ❌ 거의 확실히 dangling
};
```

생성자에서 받은 `FunctionRef`는 곧 호출 컨텍스트가 끝나면 무효. 저장하려면 `AnyInvocable`.

**`std::function`을 `FunctionRef`로 받아 복사 회피 의도**

```cpp
// 호출자는 std::function을 들고 있고
std::function<void()> f = ...;
SomeAPI(f);   // SomeAPI는 absl::FunctionRef<void()>

// 의도와 다르게 SomeAPI 내부에서 f를 저장하려 하면 망가짐
```

API 인터페이스가 `FunctionRef`라면 *저장하지 않겠다*는 약속이다. 약속을 깨면 dangling.

**AnyInvocable에 lambda 매번 alloc**

```cpp
for (;;) {
  scheduler.Post(absl::AnyInvocable<void()>([v = std::vector<int>(1000)] {...}));
}
```

대용량 캡처는 매 호출 alloc. 가능하면 pool 또는 shared state로 이동.

## 정리

- `FunctionRef`는 *호출만 할 매개변수*. 16바이트 view, alloc 0.
- `AnyInvocable`은 *저장하는 callable owner*. movable, `const`/`noexcept`/`&&` qualifier 지원.
- `std::function`은 copy 요구·SBO 미규정의 옛 디자인. `AnyInvocable`로 갈아탄다.
- `FunctionRef`는 절대 멤버 변수·반환 타입 금지.

## 다음 편

[Part 14-04 — bind_front와 Overload](/blog/programming/code-review/abseil/part14-04-bind-front-overload)에서 보조 함수 객체 도구를 본다.

## 관련 항목

- [Part 14-04 — bind_front / Overload](/blog/programming/code-review/abseil/part14-04-bind-front-overload)
- [Part 14-01 — Cleanup](/blog/programming/code-review/abseil/part14-01-cleanup)
- [Part 9-04 — absl::variant](/blog/programming/code-review/abseil/part9-04-variant)
- [Folly Part 4-03 — folly::Function](/blog/programming/code-review/folly/part4-03-folly-function) — Meta의 move-only callable
- [EMC++ Item 34 — std::bind 회피](/blog/programming/cpp/effective-modern-cpp/item34)
