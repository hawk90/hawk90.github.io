---
title: "Abseil Memory utilities 분석"
date: 2026-06-09T09:11:00
description: "Part 2-06: absl::memory — make_unique polyfill, allocator_traits, RawPtr, uninitialized helpers."
series: "Abseil Code Review"
seriesOrder: 11
tags: [cpp, abseil, memory, smart-pointer, allocator, base]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

> **한 줄 요약**: `absl::memory`는 `std::make_unique`, `allocator_traits` 같은 표준 도구의 polyfill과 보완을 제공한다. 현대 C++(14+)에서는 대부분 std로 옮겨갔지만, allocator-aware 구현에 필요한 일부 helper는 여전히 가치가 있다.

## 어떤 문제를 푸는가

C++11은 `std::unique_ptr`을 도입했지만 `std::make_unique`를 빠뜨렸다. C++14에서 추가됐다. Abseil은 C++11 시절부터 `absl::make_unique`를 제공해 사용자가 직접 `new`를 쓸 필요가 없게 했다.

이제 C++14 이상이 표준이므로 `absl::make_unique`는 사실상 `std::make_unique`의 alias다. 그러나 allocator 관련 helper, uninitialized memory 다루기, raw pointer wrapping 같은 부분은 std에 부족하다.

## absl::make_unique

```cpp
// absl/memory/memory.h
template <typename T, typename... Args>
typename std::enable_if<!std::is_array<T>::value, std::unique_ptr<T>>::type
make_unique(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}
```

C++14의 `std::make_unique`와 동등. 새 코드는 std를 쓰는 것이 권장된다.

```cpp
// 권장
auto p = std::make_unique<MyClass>(arg1, arg2);

// C++11 호환이 필요한 코드에서만
auto p = absl::make_unique<MyClass>(arg1, arg2);
```

배열 버전도 제공.

```cpp
template <typename T>
typename std::enable_if<std::is_array<T>::value && std::extent<T>::value == 0,
                       std::unique_ptr<T>>::type
make_unique(size_t n) {
    return std::unique_ptr<T>(new typename std::remove_extent<T>::type[n]());
}

// 사용
auto arr = absl::make_unique<int[]>(100);
```

## absl::WrapUnique

raw pointer를 `unique_ptr`로 감싸는 명시적 함수.

```cpp
template <typename T>
std::unique_ptr<T> WrapUnique(T* ptr) {
    static_assert(!std::is_array<T>::value, "array types are unsupported");
    static_assert(std::is_object<T>::value, "non-object types are unsupported");
    return std::unique_ptr<T>(ptr);
}
```

왜 필요한가. `std::unique_ptr<T>(p)` 생성자는 explicit이지만, factory 함수에서 일관된 표현이 도움 된다.

```cpp
// C 라이브러리 함수가 raw pointer 반환
extern Widget* CreateWidget();

// 안전한 wrapping
std::unique_ptr<Widget> w = absl::WrapUnique(CreateWidget());

// new와 함께 쓰는 경우 — make_unique를 못 쓸 때
class Foo {
private:
    Foo();  // private constructor
    friend std::unique_ptr<Foo> CreateFoo();
};

std::unique_ptr<Foo> CreateFoo() {
    // make_unique는 private constructor 호출 못 함
    return absl::WrapUnique(new Foo());
}
```

`WrapUnique`의 이점은 ownership transfer를 코드에서 명확히 드러내는 것. `new` 다음에 바로 `WrapUnique`를 호출하는 패턴은 "이 pointer가 unique_ptr에 들어간다"는 의도를 명시한다.

## absl::PointerTraits 등

C++17의 `std::pointer_traits`를 보완하는 도구는 거의 없다. 대부분 std를 그대로 쓴다.

## allocator_traits 보완

Abseil의 컨테이너(`flat_hash_map` 등) 구현은 `std::allocator_traits`를 적극 활용한다. 일부 helper는 internal namespace에서만 노출되어 있다.

```cpp
// 의사 코드 — Abseil 내부
namespace container_internal {

template <typename Alloc, typename T, typename... Args>
void Construct(Alloc* alloc, T* ptr, Args&&... args) {
    std::allocator_traits<Alloc>::construct(*alloc, ptr,
        std::forward<Args>(args)...);
}

template <typename Alloc, typename T>
void Destroy(Alloc* alloc, T* ptr) {
    std::allocator_traits<Alloc>::destroy(*alloc, ptr);
}

}  // namespace container_internal
```

이 helper들은 public API가 아니다. 사용자 코드가 직접 부르지 말 것. 컨테이너를 만들 때는 표준 `std::allocator_traits`를 직접 사용한다.

## absl::nullopt 등의 관련 utility

엄밀히는 type utility지만 memory와 함께 자주 쓰인다.

```cpp
absl::optional<MyClass> opt;
opt = absl::nullopt;

absl::optional<MyClass> opt2 = absl::make_optional<MyClass>(arg1, arg2);
```

C++17 이상에서는 std로 옮긴다.

```cpp
std::optional<MyClass> opt = std::nullopt;
auto opt2 = std::make_optional<MyClass>(arg1, arg2);
```

## absl::Cleanup — RAII helper

C++20의 `std::scope_guard`와 비슷한 역할. (Abseil이 먼저 만들었고 표준이 따라잡은 케이스)

```cpp
#include "absl/cleanup/cleanup.h"

void ProcessFile(const std::string& path) {
    FILE* f = fopen(path.c_str(), "r");
    if (!f) return;
    auto close = absl::MakeCleanup([f]() { fclose(f); });

    // 사용
    Read(f);
    // close가 scope 끝에서 자동 호출
}
```

명시적 destructor 없이 RAII를 추가할 수 있다. 짧은 함수 안에서 한두 개의 자원을 깔끔하게 처리하기 위한 도구. unique_ptr를 쓸 정도로 정형화되지 않은 자원에 적합.

### 취소 가능한 cleanup

```cpp
auto cleanup = absl::MakeCleanup([&] { Rollback(); });

if (CommitWasSuccessful()) {
    std::move(cleanup).Cancel();  // cleanup 비활성화
}
// 성공이면 Rollback() 안 호출
```

이 패턴은 "성공할 때만 cleanup을 건너뛰기" 즉 transactional 코드에서 유용하다.

## std::pmr과의 관계

C++17이 도입한 polymorphic allocator는 Abseil이 별도로 다루지 않는다. `std::pmr::*`를 그대로 사용한다. Abseil의 컨테이너는 `std::pmr::polymorphic_allocator`도 사용할 수 있다.

```cpp
std::pmr::monotonic_buffer_resource pool;
absl::flat_hash_map<int, std::string,
    absl::Hash<int>,
    std::equal_to<int>,
    std::pmr::polymorphic_allocator<std::pair<const int, std::string>>>
    map{&pool};
```

## std와의 비교

| Abseil | std | 권장 |
|---|---|---|
| `absl::make_unique` | `std::make_unique` (C++14) | std |
| `absl::WrapUnique` | (없음) | absl — factory에서 명시적 ownership |
| `absl::make_optional` | `std::make_optional` (C++17) | std |
| `absl::nullopt` | `std::nullopt` (C++17) | std |
| `absl::MakeCleanup` | `std::experimental::scope_exit` (TS) | absl — 표준화 안 됨 |

## 코드 리뷰 포인트

```cpp
// 회피 — make_unique 대신 new
auto p = std::unique_ptr<MyClass>(new MyClass(args));

// Good
auto p = std::make_unique<MyClass>(args);

// new가 꼭 필요할 때만 WrapUnique
auto p = absl::WrapUnique(new MyClass());  // private ctor 등 특수 상황
```

```cpp
// 회피 — 수동 cleanup
FILE* f = fopen(path, "r");
if (!f) return;
// ... 여러 줄 ...
fclose(f);  // 중간에 return 있으면 누수

// Good
FILE* f = fopen(path, "r");
if (!f) return;
auto close = absl::MakeCleanup([f] { fclose(f); });
// ... return이 어디서든 close 자동 호출
```

```cpp
// 회피 — absl::make_optional을 C++17 코드에서 사용
auto opt = absl::make_optional<MyClass>(args);

// Good
auto opt = std::make_optional<MyClass>(args);
```

## 자주 보는 안티패턴

```cpp
// 회피 — unique_ptr 대신 raw new/delete
MyClass* p = new MyClass();
// ... 여러 줄 ...
delete p;  // 예외 또는 early return 시 누수

// Good
auto p = std::make_unique<MyClass>();
```

```cpp
// 회피 — Cleanup을 변수 이름 없이 사용
absl::MakeCleanup([f] { fclose(f); });
// 이 표현식의 결과는 임시 객체. 다음 줄에서 destructor 호출됨.
// 즉시 cleanup 실행.

// Good — 변수에 바인딩
auto close = absl::MakeCleanup([f] { fclose(f); });
```

```cpp
// 회피 — WrapUnique를 make_unique 대신
auto p = absl::WrapUnique(new MyClass(args));
// 작동하지만 make_unique가 더 안전. exception-safe.

// Good
auto p = std::make_unique<MyClass>(args);
```

## 정리

- `absl::make_unique`는 C++14의 `std::make_unique`로 사실상 대체됨.
- `absl::WrapUnique`는 raw pointer를 unique_ptr로 명시적으로 wrapping할 때 유용.
- `absl::MakeCleanup`은 RAII가 정형화되지 않은 자원에 대한 가벼운 helper. Cancel 가능.
- allocator_traits 관련 internal helper는 사용자가 직접 부르지 말 것.

## 다음 편

Part 2-07에서 `raw_logging`을 본다. 일반 로깅 시스템이 초기화되기 전이나 heap을 쓸 수 없는 환경에서 어떻게 안전하게 로그를 남기는지.

## 관련 항목

- [Part 2-01: ABSL_HAVE_* / ABSL_ATTRIBUTE_*](/blog/programming/code-review/abseil/part2-01-abseil-macros)
- [Part 2-07: raw_logging](/blog/programming/code-review/abseil/part2-07-raw-logging)
- [Part 9-03: absl::optional](/blog/programming/code-review/abseil/part9-03-optional)
- [Effective Modern C++: Item 21 — make_unique/make_shared](/blog/programming/cpp/effective-modern-cpp/item01-understand-template-type-deduction)
- [원문 — absl/memory/memory.h](https://github.com/abseil/abseil-cpp/blob/master/absl/memory/memory.h)
- [원문 — absl/cleanup/cleanup.h](https://github.com/abseil/abseil-cpp/blob/master/absl/cleanup/cleanup.h)
