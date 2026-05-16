---
title: "Ch 7: Other Features II — const / Numbers / Macros"
date: 2025-05-13T07:00:00
description: "Preincrement / const / constexpr / Integer / 64-bit / Preprocessor Macros / nullptr / sizeof."
tags: [Google, C++, Style-Guide, const, constexpr, Macro, nullptr]
series: "Google C++ Style"
seriesOrder: 7
draft: false
---

이 장은 상수, 수치 타입, preprocessor 같은 *작지만 자주 마주치는* 결정들을 모았다. 하나하나는 사소해 보여도 코드베이스 전체에 일관되게 적용되면 가독성이 크게 달라진다.

## Preincrement and Predecrement

iterator를 증가시킬 때는 `++it`을 쓴다. `it++`은 임시 복사본을 만들어 반환하므로 작은 비용이 더 든다.

```cpp
// Good
for (auto it = v.begin(); it != v.end(); ++it) {
    Process(*it);
}

// 회피 (관용에서 벗어남)
for (auto it = v.begin(); it != v.end(); it++) {
    Process(*it);
}
```

정수 타입에서는 컴파일러가 최적화로 차이를 없애지만 관용을 따라 `++i`를 쓴다.

```cpp
for (int i = 0; i < n; ++i) {
    // ...
}
```

후위 형식이 *의미상* 필요한 경우는 그대로 쓴다.

```cpp
int x = arr[i++];   // i를 쓰고 나서 증가
```

## Use of const

가능한 모든 자리에 `const`를 붙인다. 의도를 코드에 박는 가장 가벼운 방법이다.

```cpp
// 함수 매개변수
void Process(const std::string& input);
void Visit(const Tree& tree, int depth);

// 메서드 (상태를 바꾸지 않음을 보장)
class Counter {
public:
    int Value() const;     // const
    void Increment();       // non-const
};

// 지역 변수와 멤버 (불변)
const int max_retries = config_.max_retries;
const auto start = absl::Now();
```

`const`는 타입의 왼쪽에 둔다(*West const*). Google 가이드의 일관성이다.

```cpp
// Good
const int x = 10;
const std::string& s = ref;
const Foo* p = nullptr;

// 회피 — East const
int const x = 10;
```

포인터에 붙는 `const`는 위치에 따라 의미가 다르다. 두 형태를 정확히 구분해 쓴다.

```cpp
const Foo* p;          // p가 가리키는 Foo는 const, p 자체는 변경 가능
Foo* const p = &foo;   // p는 변경 불가, 가리키는 Foo는 변경 가능
const Foo* const p = &foo;   // 둘 다 const
```

멤버 함수의 `const`는 객체의 *논리적 상태*가 변하지 않음을 약속한다. 캐시 같은 mutable 멤버를 통한 변경은 허용된다.

```cpp
class Hasher {
public:
    size_t Hash() const {
        if (!cached_hash_.has_value()) {
            cached_hash_ = ComputeHash();   // mutable 멤버 변경
        }
        return *cached_hash_;
    }
private:
    mutable std::optional<size_t> cached_hash_;
};
```

## constexpr / constinit / consteval

컴파일 시 계산이 가능한 함수와 변수는 `constexpr`로 표시한다. 런타임 비용이 없어진다.

```cpp
constexpr int Square(int x) { return x * x; }
constexpr int kArea = Square(10);     // 컴파일 시 계산
constexpr double kPi = 3.14159;
constexpr int kBufferSize = 1 << 14;
```

C++20의 `constinit`은 변수의 *초기화*만 컴파일 시에 강제한다. 변수 자체는 const가 아니어도 된다.

```cpp
constinit static int g_counter = 0;            // OK — 초기화는 컴파일 시
constinit thread_local int g_request_id = 0;   // 정적 초기화 fiasco 방지
```

`consteval`은 함수가 *반드시* 컴파일 시에 평가되어야 함을 강제한다.

```cpp
consteval int CompileTimeOnly(int x) { return x * 2; }

constexpr int v = CompileTimeOnly(10);   // OK
int runtime_x = ReadInput();
int v2 = CompileTimeOnly(runtime_x);     // 컴파일 에러
```

`constexpr` 함수는 가능하면 컴파일 시, 그렇지 않으면 런타임으로 동작한다. `consteval`은 한쪽으로 못 박는다.

## Integer Types

폭이 중요한 자리에는 명시적 폭의 타입을 쓴다. `int`는 보통의 카운터·인덱스용이다.

```cpp
// 폭이 중요한 자리 — 명시
int32_t version;
int64_t timestamp_micros;
uint64_t hash;
uint8_t flags;

// 일반 카운터 — int
for (int i = 0; i < n; ++i) { /* ... */ }

// 크기 — size_t
size_t length = data.size();
```

`unsigned` 타입은 *모듈러 산술*이나 *bitmask*처럼 의미가 명백한 자리에만 쓴다. 일반 카운터에 unsigned를 쓰면 silent underflow 위험이 있다.

```cpp
// 회피 — unsigned 카운터
for (unsigned i = 0; i < v.size(); ++i) {
    if (some_condition) {
        --i;   // i가 0일 때 underflow → 거대한 수
    }
}

// Good — int (또는 ssize_t)
for (int i = 0; i < static_cast<int>(v.size()); ++i) { /* ... */ }
```

signed/unsigned 비교는 컴파일러 경고를 잘 보고 캐스트로 명시한다.

```cpp
int a = -1;
size_t b = 10;
if (a < b) { /* a가 -1 < 10인데, unsigned로 승격되어 거짓 */ }   // 버그
if (a < static_cast<int>(b)) { /* OK */ }
```

`long`이나 `long long`은 플랫폼마다 폭이 다르므로 직접 쓰지 않는다.

```cpp
// 회피
long bytes;        // 32-bit 또는 64-bit
long long ns;      // 64-bit이지만 명시적 폭이 더 분명

// Good
int64_t bytes;
int64_t ns;
```

## 64-bit Portability

데이터를 직렬화하거나 플랫폼을 넘나드는 코드에서는 폭과 정렬을 명시한다.

```cpp
// 회피 — 플랫폼 의존
printf("%ld", static_cast<long>(x));   // long이 32-bit인 플랫폼에서는 끊김

// Good
printf("%" PRId64, x);                  // <cinttypes>
absl::StrFormat("%d", x);               // 타입 추론
```

`sizeof`나 정렬에 가정을 두지 않는다.

```cpp
struct Record {
    int32_t a;
    int64_t b;   // 정렬 8바이트 — 32+패딩+64 = 16
};
static_assert(sizeof(Record) == 16);   // 검증
```

64비트 리터럴은 접미사를 명시한다.

```cpp
// 회피
int64_t x = 1'000'000'000'000;   // 일부 컴파일러에서 int overflow 가능

// Good
int64_t x = 1'000'000'000'000LL;
int64_t x = INT64_C(1'000'000'000'000);
```

## Preprocessor Macros

매크로는 가능한 한 피한다. `inline` 함수, `constexpr`, 템플릿이 거의 모든 매크로의 자리를 대신한다.

```cpp
// 회피
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define SQUARE(x) ((x) * (x))

// 사이드 이펙트가 두 번 평가되는 함정
int x = MAX(i++, j++);   // i와 j가 두 번 증가할 수 있음
```

```cpp
// Good
template <typename T>
constexpr T Max(T a, T b) { return a > b ? a : b; }

template <typename T>
constexpr T Square(T x) { return x * x; }
```

매크로가 정당한 자리는 좁다. 조건부 컴파일, 표준화된 패턴(`ARRAYSIZE`), 헤더 가드 정도다.

```cpp
// OK
#ifdef DEBUG
#define LOG_DEBUG(msg) LOG(INFO) << msg
#else
#define LOG_DEBUG(msg) ((void)0)
#endif

#define ARRAYSIZE(a) (sizeof(a) / sizeof((a)[0]))
```

매크로 이름은 모두 `UPPER_SNAKE_CASE`로 적어 매크로임을 시각적으로 알린다.

```cpp
#define MY_BUFFER_SIZE 1024
#define LIKELY(x) __builtin_expect(!!(x), 1)
```

## 0 and `nullptr` / `NULL`

포인터는 `nullptr`, 정수는 `0`, 문자는 `'\0'`, 실수는 `0.0`을 쓴다.

```cpp
// Good
int* p = nullptr;
int n = 0;
char c = '\0';
double d = 0.0;
float f = 0.0f;
```

`NULL`은 C에서 온 매크로로 보통 `0`으로 정의된다. C++에서는 `nullptr`이 항상 정답이다. 오버로딩이 있는 경우 `nullptr`만이 의도를 정확히 표현한다.

```cpp
void Send(int x);
void Send(const char* msg);

Send(0);         // Send(int) 호출
Send(NULL);      // 컴파일러에 따라 Send(int) (NULL이 정수)
Send(nullptr);   // Send(const char*) 호출 — 명확
```

템플릿 추론에서도 차이가 난다.

```cpp
template <typename T>
void Take(T value) { /* ... */ }

Take(NULL);      // T = int (또는 long)
Take(nullptr);   // T = std::nullptr_t
```

## sizeof

`sizeof`는 *변수*에 대해 쓴다. 타입에 대해 쓰면 변수 타입을 바꿀 때 일치가 깨질 위험이 있다.

```cpp
// 회피
struct Header { /* ... */ };
Header h;
memcpy(&h, src, sizeof(Header));   // h 타입을 바꾸면 어긋남

// Good
memcpy(&h, src, sizeof(h));        // h 타입과 자동으로 동기화
```

배열 크기를 구하는 일반적인 패턴은 다음과 같다.

```cpp
int arr[100];
size_t n = sizeof(arr) / sizeof(arr[0]);   // 100

// 또는 C++17 std::size
size_t n = std::size(arr);
```

`sizeof`가 의미 있는 자리는 메모리 조작(`memcpy`, `memset`, `read`/`write` 시스템 호출 등)이다. C++ 컨테이너에서는 `size()`/`empty()` 메서드를 쓴다.

```cpp
// 회피
if (sizeof(s) == 0) { /* ... */ }   // 컴파일 시 상수, 의미 없음

// Good
if (s.empty()) { /* ... */ }
```

## 작은 예시 — 전체 적용

이 장의 규칙을 모은 가상의 파일 한 장이다.

```cpp
// myproject/util/buffer.h
#ifndef MYPROJECT_UTIL_BUFFER_H_
#define MYPROJECT_UTIL_BUFFER_H_

#include <cstdint>
#include <cstring>

#include "absl/types/span.h"

namespace myproject::util {

constexpr size_t kDefaultBufferSize = 4 * 1024;
constexpr uint32_t kMagicHeader = 0xDEADBEEF;

class Buffer {
public:
    explicit Buffer(size_t size = kDefaultBufferSize)
        : data_(nullptr), size_(size) {}
    ~Buffer() { delete[] data_; }

    size_t size() const { return size_; }
    const uint8_t* data() const { return data_; }

    void Clear() {
        if (data_ != nullptr) {
            std::memset(data_, 0, size_);
        }
    }

    void CopyFrom(absl::Span<const uint8_t> src) {
        const size_t n = std::min(src.size(), size_);
        std::memcpy(data_, src.data(), n);
    }

private:
    uint8_t* data_;
    size_t size_;
};

}  // namespace myproject::util

#endif  // MYPROJECT_UTIL_BUFFER_H_
```

명시적 폭의 타입, `constexpr` 상수, `const` 메서드, `nullptr`, 변수에 대한 `sizeof`/`memcpy`가 일관되게 적용되어 있다.

## 정리

- iterator는 `++it`, 정수도 `++i`를 관용으로.
- 가능한 모든 자리에 `const`. 위치는 왼쪽(West const).
- 컴파일 시 계산은 `constexpr`. 초기화 강제는 `constinit`. 컴파일 시 평가 강제는 `consteval`.
- 폭이 중요하면 `int32_t`/`int64_t`. `unsigned`는 의미 있는 자리에만.
- `long`/`long long` 직접 사용은 피한다.
- 64비트 포맷은 `PRId64`나 `absl::StrFormat`. 64비트 리터럴은 `LL`/`INT64_C`.
- 매크로는 회피. `inline`/`constexpr`/template로 대체.
- 포인터 0은 항상 `nullptr`.
- `sizeof`는 변수에 대해, 컨테이너는 `empty()`/`size()`.

## 다음 장 예고

다음은 **Type Deduction / Templates / Lambdas / Aliases**다. `auto`, 구조분해, lambda, 템플릿 메타프로그래밍, concept, alias를 다룬다.

## 관련 항목

- [Ch 6: Memory / Exceptions](/blog/embedded/automotive/google-cpp/chapter06-features-memory-exceptions)
- [Ch 8: Type Deduction / Templates](/blog/embedded/automotive/google-cpp/chapter08-deduction-templates-lambdas)
