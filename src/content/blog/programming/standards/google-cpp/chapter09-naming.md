---
title: "Ch 9: Naming"
date: 2026-05-18T09:00:00
description: "File / Type / Variable / Constant / Function / Namespace / Enum / Macro / Aliases — 모든 식별자의 명명 규칙."
tags: [Google, C++, Style-Guide, Naming]
series: "Google C++ Style"
seriesOrder: 9
draft: true
---

명명 규칙은 가이드 중에서 가장 가시적이다. 한 줄 코드를 봐도 변수인지 함수인지 상수인지가 형태로 드러나는 것이 목적이다. Google은 일관된 식별자 형태로 *읽는 사람의 인지 부담*을 줄인다.

## 한눈에 보는 요약

| 종류 | 스타일 | 예 |
|------|--------|-----|
| 파일 | `snake_case.cc/.h` | `url_parser.cc` |
| 타입 | `PascalCase` | `UrlParser`, `HttpStatus` |
| 변수 (지역/매개변수) | `snake_case` | `request_count` |
| 멤버 (class) | `snake_case_` | `request_count_` |
| 멤버 (struct) | `snake_case` | `width` |
| 상수 | `kCamelCase` | `kMaxRetries` |
| 함수 | `PascalCase` | `Compute`, `IsValid` |
| Namespace | `snake_case` | `myproject`, `internal` |
| Enumerator | `kCamelCase` | `kRed`, `kOk` |
| 매크로 | `UPPER_SNAKE_CASE` | `MY_MACRO` |

이 한 표를 머리에 새겨 두면 코드의 80%는 일관되게 쓸 수 있다.

## General Naming Rules

가이드의 출발점은 *풀어 쓰기*다. 약어보다 명확한 이름을 우선한다.

```cpp
// 회피 — 약어 / 압축
int n;
int nerr;
int n_comp_conns;
int wgcConnections;
int *pNumErrors;

// Good — 풀어 쓰기
int num_errors;
int num_completed_connections;
int num_dns_connections;
int* num_errors_ptr;
```

널리 알려진 약어는 풀지 않아도 된다.

```cpp
// 알려진 약어 — OK
int num_dns_connections;
std::string url_text;
int http_status_code;

// 모호한 약어 — 풀어 쓴다
int prio;            → int priority;
int conf;            → int config (또는 configuration)
int proc;            → int process (또는 processed)
```

타입과 변수의 형태가 다르면 한눈에 구분된다.

```cpp
class UrlParser { /* PascalCase — 타입 */ };
UrlParser url_parser; /* snake_case — 변수 */
```

## File Names

파일 이름은 `snake_case.cc`와 `snake_case.h`다. 클래스 이름에서 파생하더라도 모두 소문자로.

```cpp
// 좋은 예
my_useful_class.h
my_useful_class.cc
url_table_test.cc        // 단위 테스트
http_client_benchmark.cc // 벤치마크

// 회피
MyUsefulClass.h          // PascalCase
my-useful-class.h        // 하이픈
myUsefulClass.h          // camelCase
```

테스트와 벤치마크는 접미사 관용이 있다.

- `my_class.h` — 인터페이스
- `my_class.cc` — 구현
- `my_class_test.cc` — 단위 테스트
- `my_class_benchmark.cc` — 벤치마크

## Type Names

타입은 모두 `PascalCase`로. 클래스, struct, enum class, typedef, alias 전부.

```cpp
class UrlParser;
struct UserInfo;
enum class HttpMethod;
using NodeList = std::vector<Node>;

template <typename T>
class CircularBuffer { /* ... */ };
```

Java/.NET 스타일의 `I` 접두사는 쓰지 않는다.

```cpp
// 회피
class IRenderer { /* 인터페이스 */ };
class ConcreteRenderer : public IRenderer { /* ... */ };

// Good — 인터페이스도 그냥 PascalCase
class Renderer { /* 추상 인터페이스 */ };
class OpenGlRenderer : public Renderer { /* ... */ };
```

## Variable Names

지역 변수, 매개변수, struct 멤버는 `snake_case`다.

```cpp
// 지역 변수
std::string table_name;
int counter;
double max_value;

// 매개변수
void Process(int input_count, absl::string_view source_name);
```

### 클래스 멤버

`class`의 비공개 데이터 멤버는 끝에 언더스코어를 붙인다. 멤버임을 시각적으로 알리는 동시에 매개변수와 이름 충돌도 피한다.

```cpp
class Foo {
public:
    Foo(int x, int y) : x_(x), y_(y) {}   // 매개변수 x와 멤버 x_ 구분
private:
    int x_;
    int y_;
    std::string name_;
};
```

`struct`의 멤버는 *데이터 컨테이너*라는 의미에서 언더스코어 없이 쓴다.

```cpp
struct Point {
    double x;     // 끝 _ 없음
    double y;
};

struct Config {
    int max_retries;
    absl::Duration timeout;
};
```

### 정적 멤버

정적 데이터 멤버는 보통 멤버처럼, 정적 상수는 상수 명명 규칙(`k...`)을 쓴다.

```cpp
class IdGenerator {
public:
    static constexpr int kInitialId = 1000;   // 상수
    static int Next();
private:
    static int next_id_;   // non-const 정적 — 일반 멤버 명명
};
```

### Boolean 변수

boolean에는 `is_`, `has_`, `can_`, `should_` 같은 접두사를 활용한다.

```cpp
bool is_ready = false;
bool has_loaded = true;
bool can_retry = false;
const bool should_log = config_.verbose;
```

## Constant Names

컴파일 시 상수와 변경되지 않는 상수에는 `k` + `PascalCase`를 쓴다.

```cpp
constexpr int kMaxRetries = 3;
constexpr double kPi = 3.14159;
constexpr absl::string_view kDefaultHost = "localhost";

class HttpClient {
public:
    static constexpr int kDefaultPort = 8080;
    static constexpr absl::Duration kDefaultTimeout = absl::Seconds(30);
};

// 글로벌 상수도 동일
constexpr int kBufferSize = 4 * 1024;
const std::string kAppName = "MyApp";   // 함수 지역 또는 trivially destructible 권장
```

`UPPER_SNAKE_CASE`는 매크로 전용이므로 상수에 쓰지 않는다.

```cpp
// 회피 — 매크로처럼 보임
const int MAX_RETRIES = 3;
#define MAX_RETRIES 3    // 진짜 매크로

// Good
constexpr int kMaxRetries = 3;
```

## Function Names

함수는 `PascalCase`로, 보통 동사로 시작한다.

```cpp
void DoWork();
void AddItem(const Item& item);
bool IsValid() const;
bool HasNext() const;
int GetCount() const;
void SetName(absl::string_view name);
absl::StatusOr<User> FindUser(int id);
void OpenFile(absl::string_view path);
```

질문형 함수는 `Is`/`Has`/`Can`/`Should` 접두사를 자주 쓴다.

```cpp
bool IsEmpty() const;
bool HasParent() const;
bool CanRetry() const;
bool ShouldLog(LogLevel level) const;
```

### Getter의 예외

아주 짧은 inline accessor는 변수 이름과 똑같이 적는 관용이 있다(Abseil 등에서 흔하다).

```cpp
class Foo {
public:
    int count() const { return count_; }      // 짧은 inline — 소문자
    const std::string& name() const { return name_; }

private:
    int count_;
    std::string name_;
};
```

이 형태는 std/Abseil 인터페이스와 일관되어 표준 컨테이너처럼 보이게 한다. 일반 함수에는 `GetCount`/`GetName`을 쓰는 코드베이스도 많은데, 코드베이스 안에서 한 가지로 통일하는 것이 핵심이다.

## Namespace Names

namespace는 `snake_case`다. 짧고 명확하게.

```cpp
namespace google {
namespace protobuf {
// ...
}}

namespace myproject {
namespace cache { /* ... */ }
namespace network { /* ... */ }
namespace internal { /* 비공개 구현 디테일 */ }
}
```

`internal`은 구현 디테일임을 알리는 관용이다. 외부 사용자가 의존하면 안 된다는 신호다.

```cpp
namespace mylib {

class PublicApi { /* 외부에서 사용 OK */ };

namespace internal {
class Helper { /* 외부 사용 금지 */ };
}

}  // namespace mylib
```

## Enumerator Names

enum 값은 상수와 같이 `k` + `PascalCase`를 쓴다. `enum class`를 우선한다.

```cpp
// Good
enum class HttpStatus {
    kOk = 200,
    kNotFound = 404,
    kInternalServerError = 500,
};

enum class Color { kRed, kGreen, kBlue };
```

```cpp
// 회피 — unscoped enum (글로벌 오염)
enum Color { RED, GREEN, BLUE };
// 사용: Color c = RED;   // 어디서 왔는지 모호, 다른 RED와 충돌 위험
```

`enum class`는 스코프와 타입 안전성을 모두 챙긴다.

```cpp
enum class Color { kRed };
enum class Fruit { kApple };

Color c = Color::kRed;
Fruit f = Fruit::kApple;

c = Fruit::kApple;   // 컴파일 에러
int n = Color::kRed; // 컴파일 에러 (암묵 변환 없음)
```

## Macro Names

매크로는 가능한 한 쓰지 않지만, 써야 한다면 `UPPER_SNAKE_CASE`로 표시한다.

```cpp
#define MYPROJECT_LIKELY(x) __builtin_expect(!!(x), 1)
#define MYPROJECT_UNUSED(x) (void)(x)
#define MYPROJECT_RETURN_IF_ERROR(s) /* ... */
```

매크로 이름은 충돌 가능성이 높으므로 프로젝트 접두사를 붙이는 것이 안전하다.

```cpp
// 충돌 위험 — 흔한 이름
#define MAX(a, b) ...
#define LIKELY(x) ...

// Good — 접두사
#define MYPROJECT_MAX(a, b) ...
#define MYPROJECT_LIKELY(x) ...
```

## Exceptions to Naming Rules

### STL 호환

표준 라이브러리 인터페이스를 흉내 내야 할 때는 STL 스타일을 따른다. 예를 들어 커스텀 컨테이너를 만든다면 `begin()`/`end()`/`size_type`처럼 STL이 기대하는 이름이어야 range-for 같은 기능이 동작한다.

```cpp
template <typename T>
class FlatVector {
public:
    using value_type = T;            // STL 스타일
    using iterator = T*;
    using const_iterator = const T*;
    using size_type = size_t;

    iterator begin();
    iterator end();
    size_type size() const;
    bool empty() const;
};

// range-for가 동작
FlatVector<int> v;
for (int x : v) { /* ... */ }
```

### 기존 코드와의 일관성

오래된 모듈이 다른 스타일을 따르고 있다면, 그 모듈 안에 새 코드를 추가할 때는 모듈의 스타일을 따른다. 가이드의 일반 원칙(*기존 코드 일관성 우선*)이 명명에도 적용된다.

```cpp
// 오래된 클래스 (camelCase 스타일)
class OldStyleClass {
public:
    void doWork();
    int getValue();
};

// 같은 클래스에 새 메서드 추가
class OldStyleClass {
public:
    void doWork();
    int getValue();
    void doNewWork();     // 기존 스타일 따름 (가이드 어겨도 일관성 우선)
};
```

새 파일이나 새 모듈은 가이드 표준을 따른다.

## 작은 예시 — 명명 규칙 적용

```cpp
// myproject/order/order_processor.h
#ifndef MYPROJECT_ORDER_ORDER_PROCESSOR_H_
#define MYPROJECT_ORDER_ORDER_PROCESSOR_H_

#include <string>

#include "absl/status/statusor.h"

#include "myproject/order/order.h"

namespace myproject::order {

enum class ProcessingStage {
    kValidation,
    kPricing,
    kPayment,
    kFulfillment,
};

class OrderProcessor {
public:
    static constexpr int kMaxRetries = 3;
    static constexpr absl::Duration kDefaultTimeout = absl::Seconds(30);

    OrderProcessor();
    ~OrderProcessor();

    absl::StatusOr<OrderResult> Process(const Order& order);

    bool IsBusy() const { return is_busy_; }
    int processed_count() const { return processed_count_; }

private:
    absl::Status ValidateOrder(const Order& order);
    absl::Status ComputePricing(const Order& order, OrderResult* result);

    bool is_busy_ = false;
    int processed_count_ = 0;
    std::string last_error_;
};

namespace internal {

bool IsAllowedRegion(absl::string_view region);

}  // namespace internal
}  // namespace myproject::order

#endif  // MYPROJECT_ORDER_ORDER_PROCESSOR_H_
```

파일 / namespace / 클래스 / 상수 / 메서드 / 멤버 / enum이 각자의 스타일로 한눈에 구분된다.

## 정리

- 파일 `snake_case`, 타입 `PascalCase`, 변수/매개변수 `snake_case`.
- class 멤버는 `snake_case_`, struct 멤버는 `snake_case`.
- 상수는 `kCamelCase`, 함수는 `PascalCase`, namespace는 `snake_case`.
- enum class를 쓰고, enumerator는 `kCamelCase`.
- 매크로는 `UPPER_SNAKE_CASE`, 접두사로 충돌 방지.
- 약어보다 풀어 쓰기. 알려진 약어는 OK.
- STL 호환이나 기존 코드 일관성을 위해 스타일을 깰 때는 의도적으로.

## 다음 장 예고

마지막 장은 **Comments / Formatting / Closing**이다. 주석, 형식, 가이드의 마무리 메시지를 다룬다.

## 관련 항목

- [Ch 8: Type Deduction / Templates](/blog/embedded/automotive/google-cpp/chapter08-deduction-templates-lambdas)
- [Ch 10: Comments / Formatting](/blog/embedded/automotive/google-cpp/chapter10-comments-formatting-closing)
