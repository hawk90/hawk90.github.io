---
title: "항목 4: 추론된 타입을 확인하는 방법을 알아두라"
date: 2025-01-05T13:00:00
description: "IDE, 컴파일러 진단, 런타임 출력 등 추론된 타입을 확인하는 다양한 방법을 알아봅니다."
tags: [C++, Type Deduction, Debugging]
series: "Effective Modern C++"
seriesOrder: 4
---

## 개요

`auto`나 템플릿을 쓰다 보면 "도대체 이게 무슨 타입으로 추론됐지?" 싶을 때가 있습니다. 다행히 확인하는 방법이 여러 가지 있어요. IDE부터 런타임까지, 상황에 맞는 방법을 골라 쓰세요.

## 방법 1: IDE의 도움

가장 쉬운 방법입니다. 마우스를 올려보세요!

```cpp
const int theAnswer = 42;
auto x = theAnswer;  // 마우스 호버 → "int"
auto y = &theAnswer; // 마우스 호버 → "const int*"
```

**장점:** 빠르고 편리함
**단점:** 복잡한 타입은 보기 어려울 수 있음

## 방법 2: 컴파일러 에러 메시지 활용

**정의하지 않은 템플릿으로 에러 유발:**

```cpp
template<typename T>  // 선언만!
class TD;

int main() {
    const int theAnswer = 42;
    auto x = theAnswer;
    auto y = &theAnswer;

    TD<decltype(x)> xType;  // 에러: TD<int> 정의 없음
    TD<decltype(y)> yType;  // 에러: TD<const int*> 정의 없음
}
```

컴파일러 에러 메시지:
```
error: incomplete type 'TD<int>' used in nested name specifier
error: incomplete type 'TD<const int*>' used in nested name specifier
```

**장점:** 컴파일 시점에 정확한 타입 확인
**단점:** 프로그램이 컴파일되지 않음

## 방법 3: typeid와 std::type_info::name

런타임에 타입을 확인하는 표준 방법:

```cpp
#include <iostream>
#include <typeinfo>

template<typename T>
void f(const T& param) {
    std::cout << "T = " << typeid(T).name() << '\n';
    std::cout << "param = " << typeid(param).name() << '\n';
}

int main() {
    const int theAnswer = 42;
    f(theAnswer);
}
```

**문제: 컴파일러마다 다른 출력!**

```cpp
// GNU/Clang 출력
T = i         // i = int
param = i

// MSVC 출력
T = int
param = int
```

**더 큰 문제: 정확하지 않음!**

```cpp
template<typename T>
void f(const T& param) {
    std::cout << "T = " << typeid(T).name() << '\n';
    std::cout << "param = " << typeid(param).name() << '\n';
}

const int* px = nullptr;
f(px);

// 출력:
// T = PKi (pointer to const int)
// param = PKi (잘못됨! 실제로는 const PKi&여야 함)
```

`std::type_info::name`은 참조(&)와 const를 무시합니다!

### 왜 `typeid`가 타입을 깎을까?

이건 typeid의 버그가 아니라 **표준이 그렇게 정한 동작**입니다. 정확한 메커니즘은 두 단계로 이해하면 명확합니다.

**1단계: `typeid(T).name()`은 함수가 아니라 표현식이지만, 인자가 by-value 매개변수처럼 처리됨**

```cpp
template<typename T>
void f(const T& param) {
    typeid(param).name();
    // 표준에 의해, typeid의 인자는
    // "값으로 전달되는 함수 매개변수처럼" 타입이 깎임
    //  → const, volatile, & 모두 제거된 타입을 보고
}
```

이는 항목 1의 **세 번째 경우(값 전달 템플릿 추론)**와 정확히 같은 규칙입니다.

```cpp
const int* px = nullptr;
f(px);
// param의 실제 타입: const int* const &
// typeid가 보는 타입: const int* (값 전달 추론으로 const, & 제거)
```

**2단계: `name()`은 구현 정의 문자열을 반환**

이름 형식이 컴파일러마다 다른 이유도 표준이 형식을 규정하지 않기 때문입니다 (GCC/Clang은 mangled name, MSVC는 사람이 읽을 만한 이름).

**왜 표준이 이렇게 정했을까?**

`typeid`는 원래 **다형성 타입의 런타임 식별**(예: `Base*`가 실제로 `Derived`인지)을 위한 도구였고, 컴파일 타임 타입 검사용으로 설계된 것이 아닙니다. 그래서 reference/cv 정보가 보존될 필요가 없다고 본 것입니다.

**실용적 결론**: 정확한 타입을 알고 싶으면 `decltype` + `static_assert`나 Boost.TypeIndex를 쓰세요. `typeid`는 "런타임에 어떤 다형성 타입인지" 정도에만 의지.

## 방법 4: Boost.TypeIndex 사용

가장 정확한 런타임 방법:

```cpp
#include <boost/type_index.hpp>

template<typename T>
void f(const T& param) {
    using boost::typeindex::type_id_with_cvr;  // cvr = const, volatile, reference

    std::cout << "T = "
              << type_id_with_cvr<T>().pretty_name() << '\n';
    std::cout << "param = "
              << type_id_with_cvr<decltype(param)>().pretty_name() << '\n';
}

const int* px = nullptr;
f(px);

// 정확한 출력:
// T = int const*
// param = int const* const&
```

**장점:** 정확하고 읽기 쉬운 출력
**단점:** Boost 라이브러리 필요

## 방법 4.5: `__PRETTY_FUNCTION__` / `__FUNCSIG__` 트릭

컴파일러가 자동으로 채워주는 함수 시그니처 매크로를 이용하면 **Boost 없이도** 정확한 타입을 한 줄로 출력할 수 있습니다.

```cpp
#include <iostream>

template<typename T>
void show_type() {
#if defined(__clang__) || defined(__GNUC__)
    std::cout << __PRETTY_FUNCTION__ << '\n';
#elif defined(_MSC_VER)
    std::cout << __FUNCSIG__ << '\n';
#endif
}

int main() {
    const int* p = nullptr;
    show_type<decltype(p)>();
}
```

**출력 예시 (Clang):**
```
void show_type() [T = const int *]
```

**출력 예시 (MSVC):**
```
void __cdecl show_type<const int *>(void)
```

함수 이름 안에 `T = const int *`처럼 컴파일러가 추론한 타입이 그대로 박혀 나옵니다. const, &, 포인터 모두 보존됩니다.

**더 깔끔하게 — 타입만 추출:**

```cpp
template<typename T>
constexpr auto type_name() {
    std::string_view name;
#if defined(__clang__)
    name = __PRETTY_FUNCTION__;
    name.remove_prefix(name.find('=') + 2);
    name.remove_suffix(1);
#elif defined(__GNUC__)
    name = __PRETTY_FUNCTION__;
    name.remove_prefix(name.find('=') + 2);
    name.remove_suffix(name.size() - name.rfind(']'));
#elif defined(_MSC_VER)
    name = __FUNCSIG__;
    name.remove_prefix(name.find('<') + 1);
    name.remove_suffix(name.size() - name.rfind('>'));
#endif
    return name;
}

// 사용
std::cout << type_name<decltype(p)>() << '\n';   // "const int *"
```

**장점:** 외부 라이브러리 없음, 임베디드/제한 환경에서도 사용 가능
**단점:** 컴파일러별 분기 필요

## 방법 4.6: Compiler Explorer (godbolt.org)

타입 하나 확인하려고 코드를 컴파일·실행하는 게 번거롭다면, 브라우저에서 즉시 확인할 수 있습니다.

**[godbolt.org](https://godbolt.org)**에 위 `type_name<T>()` 패턴이나 `TD<decltype(x)>` 트릭을 붙여넣고 컴파일하면, 에러 메시지나 출력에서 추론된 타입을 바로 봅니다.

추가 팁:
- 동일 코드를 GCC, Clang, MSVC 여러 버전에서 한 번에 비교 가능
- 어셈블리 출력으로 **inline 여부, 최적화 결과**까지 같이 확인
- `-std=c++20` 등 옵션으로 표준 버전별 동작 차이 검증

타입 추론 학습·디버깅에서 **가장 실용적인 도구**입니다. IDE 호버보다 정확하고, Boost보다 가벼우며, 다중 컴파일러 비교까지 됩니다.

## 방법 5: 직접 만든 타입 출력 함수

컴파일러별 demangle 함수 활용:

```cpp
#include <cxxabi.h>  // GCC/Clang
#include <memory>
#include <iostream>

template<typename T>
std::string type_name() {
    int status;
    std::unique_ptr<char, void(*)(void*)> result{
        abi::__cxa_demangle(typeid(T).name(), 0, 0, &status),
        std::free
    };
    return result.get() ? std::string(result.get()) : "error";
}

// 사용
auto x = 42;
std::cout << type_name<decltype(x)>() << '\n';  // "int"
```

## 실전 예제: 복잡한 타입 추론

```cpp
#include <vector>

// 어떤 타입일까요?
const auto vw = std::vector<int>{1, 2, 3};
auto lambda = [](const auto& x) { return x * 2; };

// 컴파일러 에러로 확인
template<typename T> class TD;

TD<decltype(vw)> vwType;      // const std::vector<int>
TD<decltype(lambda)> lambdaType;  // 람다는 유일한 클로저 타입

// Boost로 확인
using boost::typeindex::type_id_with_cvr;
std::cout << type_id_with_cvr<decltype(vw)>().pretty_name() << '\n';
// 출력: std::vector<int, std::allocator<int> > const
```

## 각 방법의 사용 시기

| 상황 | 추천 방법 |
|------|----------|
| 코드 작성 중 빠른 확인 | IDE 호버 |
| 정확한 타입이 필요할 때 | 컴파일러 에러 메시지 |
| 런타임 디버깅 | Boost.TypeIndex |
| Boost 없이 런타임 확인 | typeid (부정확함 주의) |
| 템플릿 개발 중 | TD 템플릿 트릭 |

## 실용적인 팁

**1. 매크로로 편하게:**
```cpp
#define SHOW_TYPE(x) \
    template<typename T> class TD; \
    TD<decltype(x)> td;

auto x = {1, 2, 3};
SHOW_TYPE(x);  // 에러: TD<std::initializer_list<int>>
```

**2. static_assert + is_same로 컴파일 타임 단언:**

가장 확실한 방법 — 코드 안에 "이 변수는 이 타입이어야 한다"를 박아두면 추론 결과가 바뀌는 순간 컴파일이 깨집니다.

```cpp
#include <type_traits>

auto x = 42;
static_assert(std::is_same_v<decltype(x), int>);    // OK
static_assert(std::is_same_v<decltype(x), double>); // 컴파일 에러

// const, & 까지 정확히 검증
const int a = 0;
auto&          b = a;
decltype(auto) c = (a);

static_assert(std::is_same_v<decltype(b), const int&>);
static_assert(std::is_same_v<decltype(c), const int&>);
```

**유용한 trait 동반자들:**

```cpp
std::is_reference_v<T>           // 참조인지
std::is_lvalue_reference_v<T>    // lvalue 참조인지
std::is_rvalue_reference_v<T>    // rvalue 참조인지
std::is_const_v<T>               // const인지
std::is_pointer_v<T>             // 포인터인지
std::remove_cvref_t<T>           // const, volatile, & 모두 제거 (C++20)
```

```cpp
template<typename T>
void check(T&& param) {
    static_assert(std::is_lvalue_reference_v<T>);  // lvalue만 받겠다는 보증
}
```

**3. C++20 Concepts로 카테고리 검증:**

`is_same`이 정확한 타입 비교라면, concepts는 **타입 카테고리·역량**을 검증합니다.

```cpp
#include <concepts>

auto x = 42;
static_assert(std::integral<decltype(x)>);              // 정수 타입인지
static_assert(std::floating_point<decltype(3.14)>);     // 부동소수인지
static_assert(std::same_as<decltype(x), int>);          // 정확한 타입
static_assert(std::convertible_to<int, double>);        // 변환 가능한지
static_assert(std::derived_from<Derived, Base>);        // 상속 관계인지
```

**함수 매개변수 자리에서 직접 제약:**

```cpp
template<std::integral T>
T add(T a, T b) { return a + b; }

add(1, 2);      // OK
add(1.0, 2.0);  // 에러: floating_point는 integral concept 미충족
                //       — 에러 메시지가 추론 실패 원인을 명확히 알려줌
```

Concepts는 **에러 메시지 가독성**까지 개선해주므로 타입 디버깅에 특히 유용합니다.

## 핵심 정리

1. **IDE가 가장 편함** - 하지만 항상 정확하진 않음
2. **컴파일러 에러가 가장 정확함** - TD 템플릿 트릭 활용
3. **typeid는 조심** - const, volatile, & 무시됨
4. **Boost.TypeIndex 추천** - 런타임에 정확한 타입 확인

**기억하세요:** 타입 추론이 헷갈릴 때는 확인하는 습관을 들이세요. 추측보다는 확인이 낫습니다!