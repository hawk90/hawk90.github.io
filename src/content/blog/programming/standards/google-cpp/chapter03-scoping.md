---
title: "Ch 3: Scoping"
date: 2025-05-13T03:00:00
description: "Namespaces / Internal Linkage / Nonmember-Static / Local Variables / Static-Global / thread_local."
tags: [Google, C++, Style-Guide, Scoping, Namespace]
series: "Google C++ Style"
seriesOrder: 3
draft: false
---

스코프는 식별자의 수명과 가시 범위를 결정한다. 잘못된 스코프는 이름 충돌, 자원 누출, 정적 초기화 순서 문제로 이어진다. 이 장은 namespace부터 thread\_local까지 차례로 다룬다.

## Namespaces

모든 코드는 named namespace 안에 들어가야 한다. 글로벌 스코프에 식별자를 놓는 것은 거대 코드베이스에서 충돌의 원천이다.

```cpp
// 회피 — 글로벌 스코프
class Cache { /* ... */ };
void Initialize();

// Good — namespace 안
namespace myproject {
namespace cache {

class Cache { /* ... */ };
void Initialize();

}  // namespace cache
}  // namespace myproject
```

namespace를 닫을 때 주석으로 어떤 namespace를 닫는지 적는 것이 관례다. 깊은 중첩에서 시각적으로 도움이 된다.

### Using-Directive는 금지

`using namespace`를 글로벌 스코프나 헤더에서 쓰는 것은 금지된다.

```cpp
// 금지
using namespace std;            // 어디서 무엇이 왔는지 추적 불가
using namespace absl::strings;
```

다음과 같은 코드가 한 파일에 있다고 가정하자.

```cpp
using namespace foo;
using namespace bar;

// foo::String과 bar::String이 모두 정의돼 있다면?
String s;   // 컴파일 에러, 어느 쪽?
```

새 심볼이 라이브러리에 추가되는 순간 멀쩡하던 코드가 깨질 수 있다.

### Using-Declaration은 함수 안에서만

함수 안의 좁은 스코프라면 using-declaration이 허용된다. 헤더에서는 금지다.

```cpp
// .cc 파일의 함수 안 — OK
void DoWork() {
    using std::string;
    using std::vector;
    string s = "hello";
    vector<string> v;
}

// foo.h — 금지
using std::string;   // 이 헤더를 include하는 모든 곳에 영향
```

### Namespace Alias

`.cc` 파일 안이나 한 namespace 안에서는 alias가 OK다.

```cpp
// .cc 파일
namespace abi = absl::base_internal;
namespace strings = absl::strings;

void Func() {
    auto s = strings::StrCat("a", "b");
    // ...
}
```

```cpp
// 헤더의 namespace 안 — OK
namespace myproject {
namespace ssl = third_party::openssl;   // 한 namespace 안에서만 유효
}  // namespace myproject
```

### Inline Namespace는 회피

`inline namespace`는 ABI 버저닝 같은 특수 목적이 있는 기능이다. 일반 코드에서는 쓰지 않는다.

```cpp
// 회피
namespace mylib {
inline namespace v2 {
    class Foo { /* ... */ };
}
}
```

## Internal Linkage

`.cc` 파일 안에서만 쓰는 헬퍼는 외부에서 보이지 않게 한다. 두 가지 방법이 있다.

```cpp
// 방법 1 — unnamed namespace (C++ 권장)
namespace {

constexpr int kMaxRetries = 3;

void LogAttempt(int attempt) {
    // ...
}

class Worker { /* ... */ };

}  // namespace

void PublicFunction() {
    LogAttempt(1);   // 같은 파일에서 호출 OK
}
```

```cpp
// 방법 2 — static (C 스타일, 함수에만)
static void LogAttempt(int attempt) {
    // ...
}
```

Google은 unnamed namespace를 우선 권장한다. 클래스와 변수에도 적용할 수 있고, C++의 일반적인 관용이기 때문이다.

헤더 안의 unnamed namespace는 금지다. 헤더는 여러 번역 단위에서 포함되므로 각 단위마다 별개의 객체가 만들어진다.

```cpp
// 헤더 — 금지
namespace {
int kCounter = 0;   // foo.cc, bar.cc 등에 각각 별개의 kCounter가 생긴다
}
```

## Nonmember, Static Member, and Global Functions

함수를 어디에 둘지는 단순한 기준으로 결정한다.

- 클래스의 비공개 데이터에 접근해야 → **멤버 함수**
- 그 외 → **namespace 안의 nonmember 함수**
- **글로벌 함수** → 회피

다음은 같은 동작을 세 위치에 두었을 때를 비교한 예다.

```cpp
// 회피 — 글로벌
int Add(int a, int b) { return a + b; }

// Good — namespace 안 nonmember
namespace math {
int Add(int a, int b) { return a + b; }
}

// 멤버일 이유가 있는 경우 (멤버 데이터 접근)
class Vector {
public:
    int Dot(const Vector& other) const {
        return x_ * other.x_ + y_ * other.y_;
    }
private:
    int x_, y_;
};
```

`Cross`는 두 벡터의 공개 인터페이스만 쓰면 충분하므로 nonmember가 더 자연스럽다.

```cpp
namespace geometry {
Vector Cross(const Vector& a, const Vector& b);
}
```

상태 없는 헬퍼를 어디 둘지 고민될 때는 nonmember 함수가 기본이다. 클래스와 의미적으로 결합된 것이 명백할 때만 static 멤버로 둔다.

```cpp
// Good
class Date {
public:
    static Date FromString(absl::string_view s);   // 의미적으로 Date에 결합
    static int DaysInMonth(int year, int month);
};
```

## Local Variables

지역 변수는 가능한 좁은 스코프에 두고, 선언과 동시에 초기화한다.

```cpp
// 회피 — 위에서 한꺼번에 선언
void Process(const std::vector<int>& data) {
    int i, sum;
    int max;
    // ... 50줄 후 ...
    for (i = 0; i < data.size(); ++i) {
        sum += data[i];
    }
}

// Good — 사용 직전 선언, 좁은 스코프
void Process(const std::vector<int>& data) {
    // ... 다른 로직 ...
    int sum = 0;
    for (size_t i = 0; i < data.size(); ++i) {
        sum += data[i];
    }
    // i와 sum은 여기서 끝
}
```

미초기화 변수는 디버깅을 어렵게 만든다. 가능하면 항상 초기값을 준다.

```cpp
// 회피
int x;
if (cond) x = 1;
Use(x);   // cond가 false면 미초기화 사용

// Good
int x = 0;
if (cond) x = 1;
Use(x);
```

C++11의 brace-init은 narrowing을 막아 주는 추가 이점이 있다.

```cpp
int x{};        // 0으로 초기화
int y{3.14};    // 컴파일 에러 — narrowing 차단
int z(3.14);    // 3으로 silent narrowing
```

비싼 객체를 루프 안에서 매번 만드는 패턴은 피한다. 한 번 만들고 재사용하는 방식이 더 빠르다.

```cpp
// 회피 — 매 반복마다 새 vector
for (int i = 0; i < n; ++i) {
    std::vector<int> buf;
    Build(&buf);
    Process(buf);
}

// Good — 재사용
std::vector<int> buf;
for (int i = 0; i < n; ++i) {
    buf.clear();
    Build(&buf);
    Process(buf);
}
```

## Static and Global Variables

정적 저장 기간을 가진 변수는 *trivially destructible*인 것만 허용된다. 그렇지 않은 객체는 종료 시 소멸자 호출 순서가 정해지지 않아 미정의 동작을 일으킬 수 있다.

```cpp
// Good — trivially destructible
constexpr int kMaxRetries = 3;
constexpr double kPi = 3.14159;
static const int* kPtr = &SomeGlobal;

// 회피 — 소멸자가 있는 정적 객체
static std::string kGreeting = "Hello";
static std::vector<int> kDefaults = {1, 2, 3};
static std::map<std::string, int> kRegistry;
```

소멸자가 있는 정적 객체가 필요하다면 *Construct On First Use* 관용으로 회피한다.

```cpp
// 함수 지역 정적 — 첫 호출 시 한 번만 초기화, 안전
const std::string& Greeting() {
    static const std::string* kGreeting = new std::string("Hello");
    return *kGreeting;
}

// 또는 C++11 이상 — function-local static (스레드 안전)
const std::string& Greeting() {
    static const std::string kGreeting = "Hello";
    return kGreeting;
}
```

C++20의 `constinit`을 쓰면 정적 초기화 fiasco를 컴파일 시점에 방지할 수 있다.

```cpp
constinit static int kCounter = 0;            // OK
constinit static std::string kName = "Foo";   // 컴파일 시 초기화 보장
```

### 초기화 순서의 문제

같은 번역 단위 안의 정적 객체는 선언 순서대로 초기화된다. 그러나 번역 단위 사이의 순서는 정해지지 않는다.

```cpp
// a.cc
extern int b_value;
int a_value = b_value + 1;   // b_value가 아직 0일 수 있다

// b.cc
int b_value = 42;
```

이 코드는 빌드마다 결과가 달라질 수 있다. function-local static이나 `constinit`이 해결책이다.

## thread_local Variables

`thread_local`은 사용 가능하지만, 정적 변수와 같은 주의가 따른다. trivially destructible이거나 함수 지역이어야 한다.

```cpp
// Good — 함수 지역
void Log(absl::string_view msg) {
    thread_local std::string buffer;
    buffer.clear();
    buffer.append(msg);
    Write(buffer);
}

// Good — trivially destructible
thread_local int g_request_id = 0;
```

전역 thread\_local 객체에는 `ABSL_CONST_INIT`을 붙이면 컴파일 시 초기화가 보장된다.

```cpp
ABSL_CONST_INIT thread_local int g_counter = 0;
```

스레드별 컨텍스트를 표현할 때 유용하지만, 라이브러리 코드에서 무분별하게 쓰면 디버깅이 어려워진다. 함수 인자나 명시적 객체로 컨텍스트를 넘기는 쪽이 보통 더 명확하다.

## 작은 예시 — Scoping 적용

지금까지의 규칙을 적용한 가상의 파일 한 장이다.

```cpp
// myproject/util/url_parser.cc
#include "myproject/util/url_parser.h"

#include <string>

#include "absl/strings/string_view.h"

namespace myproject {
namespace util {

namespace {   // 내부 헬퍼들

constexpr int kMaxLength = 2048;

bool IsValidScheme(absl::string_view s) {
    // ...
}

}  // namespace

bool ParseUrl(absl::string_view input, Url* out) {
    if (input.size() > kMaxLength) {
        return false;
    }

    const auto colon = input.find(':');         // 좁은 스코프
    if (colon == absl::string_view::npos) {
        return false;
    }

    if (!IsValidScheme(input.substr(0, colon))) {
        return false;
    }

    // ...
    return true;
}

}  // namespace util
}  // namespace myproject
```

named namespace가 외부 API를 묶고, unnamed namespace가 내부 헬퍼를 숨긴다. 지역 변수는 모두 좁고 초기화되어 있다.

## 정리

- 모든 코드는 named namespace에. using-directive는 글로벌/헤더에서 금지.
- `.cc` 파일 안의 헬퍼는 unnamed namespace로 숨긴다. 헤더의 unnamed는 금지.
- 함수의 기본 위치는 namespace 안의 nonmember다. 데이터 접근이 필요할 때만 멤버.
- 지역 변수는 좁은 스코프, 선언과 동시 초기화.
- 정적/전역 객체는 trivially destructible만. 그 외에는 function-local static이나 `constinit`.
- thread\_local은 함수 지역 또는 `ABSL_CONST_INIT`으로.

## 다음 장 예고

다음은 **Classes**다. 생성자, implicit 변환, copy/move, 상속, 연산자 오버로딩, 선언 순서를 다룬다.

## 관련 항목

- [Ch 2: Header Files](/blog/embedded/standards/google-cpp/chapter02-header-files)
- [Ch 4: Classes](/blog/embedded/standards/google-cpp/chapter04-classes)
