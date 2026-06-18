---
title: "folly::demangle — typeid 디망글링"
date: 2026-06-08T09:09:00
description: "folly::demangle의 역할 — C++ mangled name을 읽기 쉬운 형식으로, crash log와 typeid 출력에 필수."
series: "Folly Code Review"
seriesOrder: 81
tags: [cpp, folly, demangle, debug, typeid]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `typeid(T).name()`이 토해내는 mangled name (`_ZN3foo3BarE`)을 사람 읽기 쉬운 `foo::Bar`로 바꾼다. crash stacktrace, log, debug 출력의 *읽기 가능성*을 결정한다.

## 동기

C++ name mangling은 컴파일러가 namespace, template, overload, calling convention을 한 식별자에 인코딩하는 방식이다.

```text
C++ source           Itanium ABI mangled
─────────────────    ──────────────────────────────
foo::Bar             N3foo3BarE
std::vector<int>     St6vectorIiSaIiEE
my_func(int, char)   _Z7my_funciC
```

mangled name은 ABI 통일을 위해 필수지만 사람이 못 읽는다. `typeid(T).name()`이 *plat-specific* mangled name을 반환 (libstdc++/clang) — `abi::__cxa_demangle`로 복원해야 사람이 읽는다.

`folly::demangle`이 그 wrapper다.

```cpp
#include <folly/Demangle.h>

std::cout << folly::demangle(typeid(std::vector<int>));
// → "std::vector<int, std::allocator<int> >"

std::cout << folly::demangle("_ZN3foo3BarE");
// → "foo::Bar"
```

## API

```cpp
namespace folly {

// 1. typeid(T) 또는 std::type_info에서
fbstring demangle(const std::type_info& ti);

// 2. mangled name string에서
fbstring demangle(const char* mangled);

// 3. 사용자 buffer에 — alloc 회피
size_t demangle(const char* mangled, char* out, size_t outSize);

}
```

세 가지 형태. 사용자 buffer 변형은 stack-allocated array에 쓸 때 — signal handler처럼 alloc이 위험한 곳에서 쓴다.

## 내부 구현

```cpp
// folly/Demangle.cpp 약식
fbstring demangle(const char* mangled) {
#if FOLLY_HAS_CXXABI_H
  int status;
  size_t length = 0;
  // __cxa_demangle은 malloc된 buffer 반환
  char* demangled = abi::__cxa_demangle(mangled, nullptr, &length, &status);
  if (status == 0 && demangled) {
    fbstring result(demangled);
    free(demangled);
    return result;
  }
#endif
  return fbstring(mangled);   // demangle 실패 시 mangled 그대로
}
```

핵심은 `abi::__cxa_demangle`. Itanium C++ ABI 표준 함수 (libstdc++/libc++가 제공). 결과는 malloc된 buffer로 *호출자가 free*해야 한다.

`folly::demangle`이 그 alloc/free를 RAII로 묶고 fbstring으로 반환.

### Signal handler-safe variant

```cpp
size_t demangle(const char* mangled, char* out, size_t outSize) {
  // __cxa_demangle을 호출하되 user buffer를 passthrough
  size_t bufSize = outSize;
  int status;
  char* demangled = abi::__cxa_demangle(mangled, out, &bufSize, &status);
  if (status == 0) {
    // demangled가 out이거나 새로 alloc된 buffer
    if (demangled != out) {
      std::strncpy(out, demangled, outSize);
      free(demangled);
    }
    return std::strlen(out);
  }
  return 0;
}
```

`__cxa_demangle`이 buffer가 부족하면 새로 alloc한다 (혹은 reuse) — *signal handler에선 malloc 금지*라 buffer가 충분한지 미리 검증해야. fbcode의 signal handler가 큰 stack-array를 미리 잡고 호출.

## 사용 예 — type info

```cpp
template <class T>
void Inspect(const T& v) {
  std::cout << "type: " << folly::demangle(typeid(T)) << "\n";
  std::cout << "value: " << v << "\n";
}

Inspect(std::vector<std::string>{});
// type: std::vector<std::string, std::allocator<std::string> >
```

generic code에서 *어떤 타입이 추론됐는지* 확인하기에 편리. CTAD, auto, template 디버깅의 단골.

## 사용 예 — exception type

```cpp
try {
  // ...
} catch (const std::exception& e) {
  LOG(ERROR) << "exception of type "
             << folly::demangle(typeid(e))
             << ": " << e.what();
}
```

exception 타입을 로그에 남길 때. `typeid(e).name()`은 mangled — demangle 안 거치면 가독성이 떨어진다.

## 사용 예 — stacktrace

```cpp
// folly/symbolizer의 stack frame symbolization
void DumpFrame(uintptr_t addr) {
  Dl_info info;
  if (dladdr(reinterpret_cast<void*>(addr), &info) && info.dli_sname) {
    std::cerr << folly::demangle(info.dli_sname) << "\n";
  }
}
```

`dladdr`이 반환하는 symbol name도 mangled. demangle 거쳐야 `foo::Bar::baz(int)` 형태로 본다. folly의 `Symbolizer`가 이 경로를 자동.

## std와의 비교

| 항목 | 표준 (없음) | folly::demangle | absl (없음) |
|------|------------|-------------------|-------------|
| 표준 함수 | 없음 (typeid().name()은 implementation-defined) | wrapper | N/A |
| Itanium ABI | __cxa_demangle 사용 | wrapper | 직접 호출 가능 |
| MSVC | __unDName 사용 | 미지원 (Itanium only) | N/A |
| signal-safe | N/A | buffer variant | N/A |
| 표준화 가능성 | reflection 후보 | N/A | N/A |

C++ 표준에는 demangle이 없다. `std::type_info::name()`이 plat-specific이라 *표준 raw text*조차 없는 상황. C++26 reflection이 들어오면 이 문제가 일부 해소된다.

MSVC는 다른 mangling scheme이라 `__unDName`이 필요하다. fbcode는 주로 Linux + Itanium ABI라 folly는 Linux/macOS 중심.

## 코드 리뷰 포인트

- `typeid(T).name()`을 그대로 log/exception message에 사용 → demangle 거쳐야.
- log hot path에서 매번 demangle → demangle은 비싼 연산 (malloc + parse). 한 번 계산 후 캐시.
- signal handler에서 `folly::demangle(typeid(T))` 호출 → malloc 금지. user buffer variant.
- generic logging utility가 type을 자동 보고하면 *대량의 demangle* 발생. opt-in 또는 캐시.

## 자주 보는 안티패턴

```cpp
// 1. hot path log
void Process(const auto& v) {
  VLOG(2) << "type: " << folly::demangle(typeid(v));   // 매번 demangle
  // → 같은 type이면 static 캐시
}

// 2. signal handler에서 fbstring 반환 variant 호출
void SignalHandler(int) {
  auto s = folly::demangle("_Z...");   // malloc — UB in signal handler
}

// 3. demangle 실패를 가정하지 않음
auto name = folly::demangle(mangled);   // 실패 시 mangled 그대로 반환
// → 그게 expected 동작. 별도 분기 보통 불필요.
```

## fbcode 패턴 — type 캐시

```cpp
template <class T>
const std::string& TypeName() {
  static const std::string kName = folly::demangle(typeid(T)).toStdString();
  return kName;
}

void LogType(auto const& v) {
  using V = std::decay_t<decltype(v)>;
  LOG(INFO) << "type: " << TypeName<V>();
}
```

template parameter로 분기되어 *T마다 한 번*만 demangle. static initialization으로 lock-free.

## 정리

- `folly::demangle`은 mangled name을 사람 읽기 쉬운 형식으로.
- 내부적으로 `abi::__cxa_demangle` 호출 + RAII wrap.
- signal handler용 user buffer variant 별도 제공.
- crash log, exception, type debugging의 가독성을 결정.
- 표준에 없는 자리 — C++26 reflection이 일부 해소 후보.

## 다음 편

[Part 19-03: DynamicConverter](/blog/programming/code-review/folly/part19-03-dynamic-converter)에서 dynamic ↔ struct 변환을 본다.

## 관련 항목

- [Folly Part 13-01 — exception_wrapper](/blog/programming/code-review/folly/part13-01-exception-wrapper)
- [원문 — folly/Demangle.h](https://github.com/facebook/folly/blob/main/folly/Demangle.h)
- [Itanium C++ ABI — Name mangling](https://itanium-cxx-abi.github.io/cxx-abi/abi.html#mangling)
