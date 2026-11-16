---
title: "C++20 Concepts 활용 — 템플릿 제약과 가독성 개선"
slug: "embedded/embedded-cpp/part2-10-concepts"
date: 2026-04-29T09:18:00
description: "Template 제약을 명시 — SFINAE의 가독성 개선, 에러 메시지 명확화, 자체 문서화."
series: "Embedded C++ for Real Systems"
seriesOrder: 18
tags: [cpp, embedded, concepts, cpp20, templates, constraints]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"Concepts = templates의 type safety."** — 어떤 type을 받는지 함수 시그니처에 명시되며, 에러가 템플릿 본문이 아니라 호출 위치에서 어느 조건이 깨졌는지와 함께 보고됩니다.

## 어떤 문제를 푸는가

C++20 이전의 template은 받을 수 있는 type 제약이 코드에 드러나지 않습니다.

```cpp
template<typename T>
T add(T a, T b) {
    return a + b;
}

add(1, 2);        // OK
add(1.5, 2.5);    // OK
add(std::string("a"), std::string("b"));   // OK
add(MyStruct{}, MyStruct{});               // ERROR — operator+ 없으면 컴파일 에러
```

`add(MyStruct{}, MyStruct{})`를 컴파일하면 오류는 템플릿 본문의 `a + b`에서 납니다. g++-16의 출력입니다(전체 7줄, 소스 인용 줄 생략).

```text
add.cpp: In instantiation of 'T add(T, T) [with T = MyStruct]':
add.cpp:11:26:   required from here
add.cpp:10:28: error: no match for 'operator+' (operand types are 'MyStruct' and 'MyStruct')
```

이 예는 짧습니다. 문제는 템플릿이 깊어질 때입니다. [Part 2-06](/blog/embedded/embedded-cpp/part2-06-templates-basics#4-template-error-message-폭증)의 `std::sort(list)`처럼 오류가 라이브러리 내부 줄을 가리키고, 사용자는 어떤 조건을 어겼는지 거꾸로 추적해야 합니다. C++20의 **concepts**는 제약을 시그니처에 명시해 오류를 호출 위치로 끌어옵니다.

## Concept 정의

```cpp
#include <concepts>

template<typename T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::same_as<T>;
};

template<Addable T>
T add(T a, T b) {
    return a + b;
}

add(1, 2);                  // OK
add(MyStruct{}, MyStruct{});  // ERROR — 호출 위치에서 거부
```

Clang 23.1.5의 출력입니다(note 줄만, 전체 13줄).

```text
add.cpp:11:23: error: no matching function for call to 'add'
add.cpp:10:3: note: candidate template ignored: constraints not satisfied [with T = MyStruct]
add.cpp:6:10: note: because 'MyStruct' does not satisfy 'Addable'
add.cpp:5:65: note: because 'a + b' would be invalid: invalid operands to binary expression ('MyStruct' and 'MyStruct')
```

오류 위치가 `add`의 본문(10행)에서 호출(11행)로 옮겨 왔고, "Addable을 만족하지 않는다"와 그 이유가 순서대로 나옵니다. 줄 수는 오히려 늘었습니다. 같은 파일을 g++-16으로 컴파일하면 concept 없는 버전이 7줄, concept 버전이 29줄이었습니다. concept의 이득은 짧은 메시지가 아니라 조건이 이름으로 보인다는 점입니다.

이 `Addable`은 `std::int8_t`도 거부합니다. `int8_t + int8_t`는 정수 승격으로 `int`가 되므로 `-> std::same_as<T>`가 거짓이고, Clang은 `because 'std::same_as<int, signed char>' evaluated to false`라고 알려 줍니다. 임베디드 코드에서 흔한 작은 정수 타입을 받으려면 `-> std::convertible_to<T>`처럼 조건을 고릅니다.

## Concept syntax 세 가지

### 1. `requires` clause

```cpp
template<typename T>
requires std::integral<T>
T square(T x) {
    return x * x;
}
```

### 2. 짧은 form

```cpp
template<std::integral T>
T square(T x) {
    return x * x;
}
```

### 3. abbreviated function template

```cpp
auto square(std::integral auto x) {
    return x * x;
}
```

가장 짧고, 함수 시그니처 자체가 제약을 표현합니다. 다만 `T`라는 이름이 없으므로 본문에서 타입이 필요하면 `decltype(x)`를 써야 하고, 두 매개변수가 같은 타입이어야 한다는 조건은 시그니처만으로 표현할 수 없고(`std::integral auto a, std::integral auto b`는 서로 다른 타입을 허용합니다), `requires std::same_as<decltype(a), decltype(b)>`를 따로 붙여야 합니다.

## 표준 concepts (`<concepts>`·`<compare>`·`<ranges>`)

```cpp
// 기본 type
std::integral<T>
std::signed_integral<T>
std::unsigned_integral<T>
std::floating_point<T>

// 관계
std::same_as<T, U>
std::derived_from<Derived, Base>
std::convertible_to<From, To>
std::common_with<T, U>

// 비교
std::equality_comparable<T>
std::totally_ordered<T>
std::three_way_comparable<T>

// 호출 가능
std::invocable<F, Args...>
std::predicate<F, Args...>

// 생성/이동
std::default_initializable<T>
std::copy_constructible<T>
std::move_constructible<T>
std::movable<T>
std::copyable<T>

// 범위 (ranges)
std::ranges::range<R>
std::ranges::input_range<R>
std::ranges::random_access_range<R>
```

필요한 계약을 제공하는 표준 concept이 있는지 먼저 확인합니다. 비교용 `three_way_comparable`은 `<compare>`, 범위 concept은 `<ranges>`의 선언을 사용합니다.

## `requires` expression

custom concept 정의의 기본 도구입니다.

```cpp
template<typename T>
concept Container = requires(T c) {
    typename T::value_type;        // 1. nested type 존재
    typename T::iterator;
    { c.begin() } -> std::same_as<typename T::iterator>;   // 2. method 시그니처
    { c.end() } -> std::same_as<typename T::iterator>;
    { c.size() } -> std::convertible_to<std::size_t>;     // 3. 변환 가능 반환
};
```

requires 안에는 4가지 표현이 있습니다.

1. **Simple requirement** — `expr;`로, expr이 valid해야 합니다.
2. **Type requirement** — `typename T::xxx;`로, nested type이 존재해야 합니다.
3. **Compound requirement** — `{ expr } -> Concept;`로, expr의 결과가 concept을 만족해야 합니다.
4. **Nested requirement** — `requires Concept<T>;`로, 또 다른 concept을 적용합니다.

## 임베디드 — Driver concept

```cpp
template<typename T>
concept Driver = requires(T d) {
    { d.init() }       -> std::same_as<bool>;
    { d.reset() }      -> std::same_as<void>;
    { d.is_ready() }   -> std::convertible_to<bool>;
};

template<Driver D>
void register_driver(D& driver) {
    if (!driver.init()) {
        log_error("driver init failed");
        return;
    }
    // ...
}
```

Driver를 만족하지 않는 type은 시그니처에서 거부되므로 function body 안에서 검사를 할 필요가 없습니다.

## 임베디드 — 컴파일 타임 dispatch with concepts

`if constexpr`과 concept을 함께 씁니다.

```cpp
template<typename T>
concept HasUserDeserialize = requires(T t, const uint8_t* buf, size_t len) {
    { t.deserialize(buf, len) } -> std::same_as<bool>;
};

template<typename T>
bool decode(T& obj, const uint8_t* buf, size_t len) {
    if constexpr (HasUserDeserialize<T>) {
        return obj.deserialize(buf, len);
    } else if constexpr (std::is_same_v<T, std::array<std::uint8_t, 4>>) {
        if (len < sizeof(T)) return false;
        std::memcpy(&obj, buf, sizeof(T));
        return true;
    } else {
        static_assert(sizeof(T) == 0,
                      "Type must have deserialize() or be a four-byte array");
    }
}
```

`<array>`, `<cstdint>`, `<cstring>`, `<type_traits>`가 필요합니다. raw byte fallback은 바이트 배열로 제한했습니다. trivially copyable인 임의 struct도 포인터·padding·잘못된 enum/bool 표현을 포함할 수 있어 외부 입력을 검증 없이 memcpy해도 안전하다는 뜻은 아닙니다.

## Concept 조합

`&&`(and)와 `||`(or)로 조합합니다.

```cpp
template<typename T>
concept NumericSerializable =
    std::integral<T> ||
    std::floating_point<T>;

template<typename T>
concept LightweightNumeric =
    NumericSerializable<T> &&
    sizeof(T) <= 4;

template<LightweightNumeric T>
void write_field(T value) {
    // ...
}

write_field(int8_t(5));        // OK
write_field(float(1.5f));      // OK
write_field(double(1.5));      // ERROR — double은 8 byte
write_field(std::string());    // ERROR — not numeric
```

`double` 호출에 Clang 23.1.5는 `note: because 'double' does not satisfy 'LightweightNumeric'`과 `note: because 'sizeof(double) <= 4' (8 <= 4) evaluated to false`를 내, 조합된 concept의 어느 항이 깨졌는지까지 보여 줬습니다.

## CRTP + Concepts — 강력한 결합

[Part 2-08](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)의 CRTP를 concept으로 명확하게 만듭니다.

```cpp
template<typename T>
concept LoggerImpl = requires(T t, const char* msg) {
    { t.log_impl(msg) } -> std::same_as<void>;
};

template<typename Derived>
class LoggerBase {
public:
    void log(const char* msg) requires LoggerImpl<Derived> {
        static_cast<Derived*>(this)->log_impl(msg);
    }
};

class UartLogger : public LoggerBase<UartLogger> {
public:
    void log_impl(const char* msg) { /* */ }
};

class BadLogger : public LoggerBase<BadLogger> {
public:
    // 이 선언 자체는 가능; BadLogger{}.log("x") 호출 때 제약 실패
};
```

아래 `concept-check.cpp`에서 같은 구조의 `Bad`에 `log()`를 부르면 Clang 23.1.5는 `error: invalid reference to function 'log': constraints not satisfied`, `note: because 'Bad' does not satisfy 'LoggerImpl'`, `note: because 't.log_impl()' would be invalid: no member named 'log_impl' in 'Bad'`를 냅니다.

base를 지정할 때 Derived는 불완전하므로 class template 매개변수에 멤버 검사 concept을 적용하지 않습니다. Derived 정의가 끝난 뒤 멤버 호출의 제약을 평가하며, 정상 구현은 호출되고 누락된 구현의 호출만 거부됩니다.

## Concept으로 SFINAE 대체

```cpp
// SFINAE (C++17)
template<typename T,
         std::enable_if_t<std::is_integral_v<T>, int> = 0>
T abs(T x) {
    return x < 0 ? -x : x;
}

// Concept (C++20)
template<std::integral T>
T abs(T x) {
    return x < 0 ? -x : x;
}

// abbreviated (C++20)
auto abs(std::integral auto x) {
    return x < 0 ? -x : x;
}
```

C++20 쪽은 제약을 시그니처에 직접 표현합니다. 위 abs는 signed 최솟값의 부호 반전을 처리하지 않은 문법 비교용 예이므로 완전한 산술 API는 아닙니다.

## 임베디드 — Range-based 알고리즘

```cpp
#include <ranges>

template<std::ranges::input_range R>
auto sum(R&& range) {
    typename std::ranges::range_value_t<R> total{};
    for (auto&& val : range) total += val;
    return total;
}

int arr[] = {1, 2, 3, 4, 5};
auto s = sum(arr);   // 15

std::array<float, 3> floats = {1.0f, 2.0f, 3.0f};
auto sf = sum(floats);   // 6.0f
```

input_range는 반복 가능성만 검사합니다. 실제로는 값 타입의 기본 생성과 `total += val`도 유효해야 하고 overflow·정밀도 계약도 필요합니다. 숫자 합 전용 API라면 `std::integral<std::ranges::range_value_t<R>>` 같은 추가 제약을 둡니다.

## Concept 오버로드 — 더 specific 우선

```cpp
template<std::integral T>
void print(T value) { /* integer 전용 */ }

template<std::floating_point T>
void print(T value) { /* float 전용 */ }

template<typename T>
void print(T value) { /* fallback */ }

print(1);       // integer 버전
print(1.5);     // float 버전
print("str");   // fallback
```

이 예제는 integral/floating_point 후보가 fallback보다 우선합니다. 제약된 템플릿은 제약 없는 템플릿보다 더 제약된 것으로 순서가 정해지기 때문입니다([temp.constr.order]). 두 제약된 후보 사이의 순서는 조건의 개수가 아니라 atomic constraint가 같은 식인지와 subsumption으로 정해지며, 한쪽이 다른 쪽을 포함하지 않으면 호출이 모호해집니다.

## 자주 보는 함정과 안티패턴

### 1. concept이 너무 복잡함
```cpp
template<typename T>
concept Foo = requires(T t) {
    { t.method1() } -> std::convertible_to<int>;
    { t.method2() } -> std::same_as<void>;
    { t.method3(int(0), float(0.0f)) } -> std::same_as<bool>;
    typename T::value_type;
    typename T::iterator;
    requires std::integral<typename T::value_type>;
    // ... 20 more
};
```
조건이 많으면 하나가 실패했을 때 진단이 그 많은 조건을 따라가며 길어집니다. 작은 concept으로 분해해 `&&`로 조합하면 위 `LightweightNumeric`처럼 어느 부분 concept이 실패했는지 진단에 이름으로 나옵니다.

### 2. requires 표현이 의도와 어긋남
```cpp
template<typename T>
concept Foo = requires(T t) {
    t.bar();   // 호출만 됨 (반환 타입 무관)
    { t.baz() } -> std::same_as<int>;   // 반환 정확히 int
    { t.qux() } -> std::convertible_to<int>;   // int로 변환 가능
};
```
표현마다 의미가 다르므로 의도에 맞게 골라 씁니다.

### 3. concept 없이 그냥 template
```cpp
template<typename T>
T process(T x);   // 어떤 T든 받음
```
문서성과 사용자 친화성이 떨어집니다. concept으로 제약을 명시합니다.

### 4. concept과 macro 혼동
concept은 type system이고 macro는 텍스트 치환이므로 둘은 전혀 다릅니다.

### 5. toolchain 미지원
설치한 컴파일러 버전의 언어 모드와 `__cpp_concepts`를 확인합니다. 벤더 제품군 이름만으로 지원 여부를 단정하지 않고 최소 예제를 컴파일합니다.

### 6. 직접 만든 concept 과용
표준 concept이 이미 있는데도 직접 정의하는 경우가 있습니다. `std::integral` 대신 `MyInt`를 새로 만드는 식이 그 예입니다.

## 작은 예제 — CRTP 검사를 호출 시점으로 미루기

```cpp title="concept-check.cpp"
#include <cassert>
#include <concepts>
template<class T> concept LoggerImpl = requires(T& t) {
    { t.log_impl() } -> std::same_as<void>;
};
template<class D> struct LoggerBase {
    void log() requires LoggerImpl<D> { static_cast<D*>(this)->log_impl(); }
};
struct Good : LoggerBase<Good> {
    int calls=0; void log_impl() { ++calls; }
};
struct Bad : LoggerBase<Bad> {};
static_assert(LoggerImpl<Good>);
static_assert(!LoggerImpl<Bad>);
template<std::integral T> constexpr int choose(T) { return 1; }
template<class T> constexpr int choose(T) { return 0; }
static_assert(choose(1)==1 && choose(1.5)==0);
int main() {
    Good g; g.log(); assert(g.calls==1);
#ifdef BAD_CALL
    Bad b; b.log();
#endif
}
```

Homebrew Clang 23.1.5, arm64 macOS에서 `clang++ -std=c++20 -Wall -Wextra -pedantic-errors concept-check.cpp -o concept-check && ./concept-check`가 exit 0이었습니다. `-DBAD_CALL`은 위의 `constraints not satisfied` 진단으로, g++-16에서는 `error: no matching function for call to 'Bad::log()'`로 거부됩니다. 제약을 base 템플릿 매개변수로 옮기면 `Good`의 base 지정 시점에 검사가 실패한다는 것은 [Part 2-08](/blog/embedded/embedded-cpp/part2-08-static-polymorphism#c20-concepts--crtp)에서 두 컴파일러로 확인했습니다.

[atomic constraint 규칙](https://eel.is/c++draft/temp.constr.atomic)과 [제약의 부분 순서 규칙](https://eel.is/c++draft/temp.constr.order)을 참고합니다. concept은 오버로드 후보를 고르는 컴파일 타임 장치라 생성 코드를 바꾸지 않습니다.

## C++20 concepts의 실용 가치

1. **에러 메시지** — 호출 위치에서 어떤 계약을 만족하지 않는지 드러냅니다. 위 측정처럼 메시지가 짧아지지는 않습니다.
2. **자체 문서화** — 함수 시그니처가 제약을 명시합니다.
3. **오버로드 명확화** — 더 specific한 concept이 우선합니다.
4. **SFINAE 대체** — 짧고 읽기 좋습니다.

## 정리

- Concepts는 template 제약을 시그니처에 명시하는 C++20 기능입니다.
- 표준 concepts는 `<concepts>`와 `<ranges>`에 풍부하게 준비돼 있습니다.
- 3가지 syntax를 지원합니다 — `requires`, `template<Concept T>`, `auto func(Concept auto x)`.
- CRTP와 concept을 함께 쓰면 interface가 명확해지고 누락된 멤버는 명확한 에러로 드러납니다.
- SFINAE를 대체하며, 진단이 실패한 concept과 그 이유를 이름으로 보여 줍니다.
- toolchain 버전·언어 모드·최소 예제로 실제 지원을 확인합니다.

## 관련 항목

- [Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics)
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP
- [Part 2-09: Type Traits](/blog/embedded/embedded-cpp/part2-09-type-traits) — SFINAE
- [Part 1-08: C++ 표준 선택](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice) — C++20 채택 결정

## 다음 글 (Part 3 시작)

[Part 3-01: 동적 할당 없이 C++ 쓰기](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc) — 임베디드의 첫 번째 원칙입니다. `new`, `malloc` 없이 modern C++를 쓰는 패턴을 다룹니다.
