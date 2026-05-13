---
title: "Ch 3: Scoping"
date: 2025-05-13T03:00:00
description: "Namespaces / Internal Linkage / Nonmember-Static / Local Variables / Static-Global / thread_local."
tags: [Google, C++, Style-Guide, Scoping, Namespace]
series: "Google C++ Style"
seriesOrder: 3
draft: false
---

> 스코프 = 식별자의 *수명과 가시 범위*. 잘못된 스코프 — 충돌, 누출, 정적 초기화 fiasco.

## Namespaces

### 규칙

> 모든 코드를 — *named namespace*에. 비공개 코드는 — *unnamed*.

```cpp
// myfile.h:
namespace myproject {
namespace util {

class Foo { ... };

}  // namespace util
}  // namespace myproject
```

이름 — 프로젝트 / 모듈을 따른다. 보통 — `myproject::module::Class`.

### Using-Directive 금지

```cpp
// 금지:
using namespace std;            // global scope에서
using namespace absl::strings;  // global scope에서
```

이유 — 어디서 `string`이 왔는지 — 추적 불가. 충돌 가능.

### Using-Declaration — 신중히

```cpp
// .cc 파일 내부 함수 안에서는 OK:
void Foo() {
    using std::string;   // 함수 안 — 좁은 스코프
    string s = "...";
}

// 헤더에서는 금지:
// foo.h:
using std::string;   // 헤더에 — 금지 (모든 include에 영향)
```

### Namespace Alias

```cpp
// .cc 파일 내부 — OK:
namespace abi = absl::base_internal;

// 헤더의 namespace 안 — OK:
namespace myproject {
namespace abi = absl::base_internal;   // 한 namespace 안에서만
}
```

### Inline Namespace — 회피

```cpp
namespace foo {
inline namespace v2 {   // 회피
    class Bar { ... };
}
}
```

ABI 버저닝 등 — 특수 목적 외 사용 금지.

## Internal Linkage

### 규칙

> `.cc` 파일 내부에서만 쓰는 — *unnamed namespace* 또는 `static`.

```cpp
// myfile.cc:
namespace {   // unnamed namespace
    constexpr int kMaxRetries = 3;

    void HelperFunction() {
        // ...
    }
}  // namespace

void PublicFunction() {
    HelperFunction();   // 같은 파일에서 호출 OK
}
```

다른 `.cc` 파일에서 — 보이지 않음.

### `static` 함수

```cpp
// 또는:
static void HelperFunction() { /* ... */ }
```

C 스타일. C++에서는 — unnamed namespace 권장.

### 헤더에서는 금지

```cpp
// 헤더 (foo.h):
namespace {   // 금지!
    int kValue = 42;
}
```

헤더 — 여러 TU에 include. 각 TU마다 — 별개의 `kValue` 생김. 혼란.

## Nonmember, Static Member, and Global Functions

### 규칙

> Global 함수 회피. *namespace 안의 nonmember function* 선호.

```cpp
// Bad — 글로벌:
int Add(int a, int b) { return a + b; }

// Good — namespace 안:
namespace math {
int Add(int a, int b) { return a + b; }
}  // namespace math
```

### Class 멤버 vs. nonmember

```
- 데이터에 직접 접근 필요 → 멤버
- 그 외 → nonmember (namespace 안)
```

```cpp
class Vector {
public:
    int Dot(const Vector& other);   // 데이터 접근 → 멤버
};

namespace math {
// Cross는 두 객체의 공개 인터페이스만 — nonmember OK:
Vector Cross(const Vector& a, const Vector& b);
}
```

### Static 멤버 함수

```cpp
class Calculator {
public:
    static int Compute(int x);   // 클래스 상태 안 씀
};
```

상태 없는 — 헬퍼. namespace에 nonmember로도 가능. *클래스와 의미 관계 있을 때만* static 멤버.

## Local Variables

### 규칙

> 가능한 *좁은 스코프*에. 선언 시 *초기화*.

```cpp
// 좋음:
for (int i = 0; i < n; ++i) {   // 루프 안에 — 좁음
    int sum = a[i] + b[i];      // 사용 직전 선언
    Process(sum);
}

// 회피:
int i;             // 위에서 선언
int sum;
for (i = 0; i < n; ++i) {
    sum = a[i] + b[i];
    Process(sum);
}
```

### 초기화

```cpp
int x;        // 회피 — 미초기화
int x = 0;    // 좋음
int x{};      // 좋음 (zero-init)
```

### 선언 위치 — 사용 직전

```cpp
// 좋음:
ReadInput();
int result = Compute();   // 사용 직전 선언
Output(result);
```

선언과 사용 — 가까이.

### 객체의 비용 큰 생성

```cpp
// 회피:
std::vector<int> v;
for (int i = 0; i < n; ++i) {
    v.clear();   // 루프 안에서 — 매번 비움
    Build(v);
    Process(v);
}

// 더 좋음 — 외부에 두고 reset:
std::vector<int> v;
for (int i = 0; i < n; ++i) {
    v.clear();   // 메모리 재사용
    Build(v);
    Process(v);
}
```

(여기서는 두 코드가 같지만, 본질은 — 비싼 생성은 루프 밖에 두고 reset)

## Static and Global Variables

### 규칙

> *Trivially destructible* 타입만. 그 외 — 정적 초기화 / 종료 순서 문제.

```cpp
// 좋음:
constexpr int kMaxRetries = 3;
constexpr double kPi = 3.14159;

// 좋음:
static const int* kPtr = &SomeVar;   // 포인터는 OK

// 회피:
static std::string kGreeting = "Hello";   // string은 — destructor 있음
static std::vector<int> kData = {1, 2, 3};
```

### Static Initialization Fiasco

```
TU1의 static 객체 — TU2의 static 객체에 의존
↓
초기화 순서 — 정해지지 않음
↓
재앙 (Static Initialization Order Fiasco)
```

해결 — *Construct On First Use* / function-local static.

### Function-Local Static

```cpp
const std::string& GetGreeting() {
    static const std::string kGreeting = "Hello";   // OK
    return kGreeting;
}
```

함수 첫 호출 시 — 한 번만 초기화. 안전.

### `constexpr` / `constinit`

```cpp
constinit static std::string kGreeting = "...";   // C++20
```

`constinit` — *컴파일 시 초기화* 보장. 동적 초기화 회피.

## thread_local Variables

### 규칙

> `thread_local`은 — 사용 가능. 단, *trivially destructible* 또는 함수-local.

```cpp
thread_local int counter = 0;   // OK

void Func() {
    thread_local std::string buffer;   // OK (함수-local)
}
```

### `ABSL_CONST_INIT`

```cpp
ABSL_CONST_INIT thread_local int counter = 0;
```

Abseil 매크로 — *컴파일 시 초기화* 보장.

## 정리

- **Namespace** — named로 모든 코드, using-directive 금지
- **Internal linkage** — `.cc` 파일에 unnamed namespace
- **Nonmember function** — namespace 안 권장
- **Local var** — 좁은 스코프, 초기화 동시
- **Static/global** — trivially destructible만
- **thread_local** — OK, `ABSL_CONST_INIT`로 안전 초기화

## 다음 장 예고

다음 — **Classes**. 생성자, implicit conversion, 상속, 멤버 순서.

## 관련 항목

- [Ch 2: Header Files](/blog/embedded/standards/google-cpp/chapter02-header-files)
- [Ch 4: Classes](/blog/embedded/standards/google-cpp/chapter04-classes)
