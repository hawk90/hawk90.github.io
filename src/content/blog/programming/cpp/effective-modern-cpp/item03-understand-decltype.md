---
title: "항목 3: decltype의 작동 방식을 이해하라"
date: 2025-01-05T12:00:00
description: "decltype의 작동 방식과 decltype(auto)의 활용법을 이해합니다."
tags: [C++, decltype, Type Deduction]
series: "Effective Modern C++"
seriesOrder: 3
---

## 개요

`decltype`은 주어진 이름이나 표현식의 타입을 **있는 그대로** 알려줍니다. `auto`와 달리 추론 규칙이 없어서 더 예측 가능합니다. 하지만 하나의 함정이 있죠.

## decltype의 기본 동작

**decltype = "이것의 타입이 뭐야?"**

```cpp
const int i = 0;           // decltype(i)는 const int

bool f(const Widget& w);   // decltype(f)는 bool(const Widget&)
                           // decltype(w)는 const Widget&

Widget w;                   // decltype(w)는 Widget

if (f(w)) ...              // decltype(f(w))는 bool

vector<int> v;             // decltype(v)는 vector<int>
if (v[0] == 0) ...         // decltype(v[0])는 int&
```

보시다시피 `decltype`은 타입을 그대로 보고합니다. const도, 참조(&)도 모두 유지됩니다.

## C++11: 함수 반환 타입에 사용

C++11에서는 후행 반환 타입(trailing return type)과 함께 사용됩니다:

```cpp
// 문제: c[i]의 타입을 어떻게 표현할까?
template<typename Container, typename Index>
auto authAndAccess(Container& c, Index i) -> decltype(c[i]) {
    authenticateUser();
    return c[i];
}

// decltype(c[i])가 필요한 이유:
// - vector<int>의 operator[]는 int& 반환
// - deque<bool>의 operator[]는 bool& 반환
// - 타입을 미리 알 수 없음!
```

### 왜 후행 반환 타입(`-> decltype(...)`) 문법이 필요했나

전통 문법으로는 위 코드를 쓸 수 없습니다 — **반환 타입 자리에서는 `c`와 `i`가 아직 보이지 않기 때문**입니다.

```cpp
// 전통 문법 — 이건 컴파일 에러!
template<typename Container, typename Index>
decltype(c[i])                        // 에러: 'c'와 'i'가 무엇?
authAndAccess(Container& c, Index i);  //       매개변수는 아직 선언 전
{
    return c[i];
}
```

C++ 함수 선언은 위에서 아래로 파싱됩니다. 반환 타입을 적는 시점에는 매개변수 이름이 아직 도입되지 않았습니다. 후행 반환 타입은 **반환 타입 자리를 함수 시그니처 뒤로 밀어서**, 매개변수가 이미 가시 범위에 들어온 뒤에 `decltype(c[i])`를 평가할 수 있게 합니다.

```cpp
// 후행 반환 타입 — 매개변수 c, i를 사용 가능
template<typename Container, typename Index>
auto authAndAccess(Container& c, Index i) -> decltype(c[i]);
//                                          ^^^^^^^^^^^^^^^
//                                          여기선 c, i가 보임
```

C++14의 `auto` 반환 타입 추론과 `decltype(auto)`가 등장하면서 후행 반환 타입은 일상에서는 덜 쓰지만, 람다·복잡한 SFINAE·구식 컴파일러 호환에서는 여전히 유용합니다.

## C++14: decltype(auto)

C++14에서는 더 편해졌습니다:

```cpp
// C++14 버전
template<typename Container, typename Index>
decltype(auto) authAndAccess(Container& c, Index i) {
    authenticateUser();
    return c[i];  // decltype(c[i])를 반환 타입으로
}
```

**decltype(auto) = "auto처럼 추론하되, decltype 규칙을 사용해"**

```cpp
Widget w;
const Widget& cw = w;

auto myWidget1 = cw;           // Widget (const와 & 제거)
decltype(auto) myWidget2 = cw; // const Widget& (그대로 유지)
```

### 함수 반환 외에도 — 변수 선언에 쓸 수 있다

`decltype(auto)`는 함수 반환에서만 쓰는 게 아닙니다. 일반 변수 선언에서 **표현식의 카테고리·const까지 모두 보존**하고 싶을 때 유용합니다.

```cpp
std::vector<int> v = {1, 2, 3};

auto           a = v[0];   // int  — 복사본
auto&          b = v[0];   // int& — 참조
decltype(auto) c = v[0];   // int& — v[0]의 정확한 타입 그대로
                           //        (operator[]가 int&를 반환하므로)

const int x = 0;
auto           d = x;      // int        — const 깎임
decltype(auto) e = x;      // const int  — 그대로
decltype(auto) f = (x);    // const int& — (x)는 lvalue 표현식!
```

**언제 쓰나요?**

함수의 반환 타입을 그대로 받아서 다른 곳에 넘기는 **포워딩 wrapper**나, **제네릭 캐싱** 코드처럼 "원래 타입을 잃지 않고 보관"해야 할 때.

```cpp
template<typename Container, typename Index>
decltype(auto) cache_call(Container& c, Index i) {
    decltype(auto) result = c[i];   // c[i]의 정확한 타입 그대로 보관
                                    // (참조면 참조, 값이면 값)
    log_access(i);
    return result;
}
```

**주의사항** — 변수 선언에서도 `(x)` 함정은 그대로 적용됩니다. 의도하지 않게 참조 변수가 되거나, 임시 객체에 묶이면 댕글링 위험이 있습니다.

```cpp
decltype(auto) bad = (some_local);  // 지역 변수의 참조!
```

## 왜 decltype(auto)가 필요한가?

**auto만 쓰면 참조가 사라집니다:**

```cpp
template<typename Container, typename Index>
auto authAndAccess(Container& c, Index i) {  // auto만 사용
    authenticateUser();
    return c[i];  // int& → int로 복사됨!
}

std::vector<int> v = {1, 2, 3};
authAndAccess(v, 1) = 10;  // 에러! rvalue에 대입 불가
```

**decltype(auto)를 쓰면 참조가 유지됩니다:**

```cpp
template<typename Container, typename Index>
decltype(auto) authAndAccess(Container& c, Index i) {
    authenticateUser();
    return c[i];  // int& 그대로 반환
}

authAndAccess(v, 1) = 10;  // OK! 참조를 통해 수정 가능
```

## 보편 참조와 완벽한 전달

rvalue 컨테이너도 받고 싶다면?

```cpp
template<typename Container, typename Index>
decltype(auto) authAndAccess(Container&& c, Index i) {  // 보편 참조
    authenticateUser();
    return std::forward<Container>(c)[i];  // 완벽한 전달
}

// 이제 임시 객체도 가능
auto val = authAndAccess(makeVector(), 5);  // rvalue 컨테이너 OK
```

## decltype의 함정

**주의: decltype은 이름과 표현식을 다르게 처리합니다!**

```cpp
int x = 0;

decltype(x)    // int (이름)
decltype((x))  // int& (표현식!)
```

### 정확한 규칙: id-expression vs 그 외 모든 lvalue 표현식

decltype의 동작은 인자가 어떤 **문법 범주**에 속하느냐로 정확히 두 갈래로 나뉩니다.

**규칙 1: 인자가 "이름 그 자체"(id-expression)이거나 "멤버 접근 표현식"이면**
→ 그 이름의 **선언된 타입** 그대로 (참조든 아니든 적힌 그대로)

**규칙 2: 그 외 모든 표현식이면 (값 카테고리에 따라)**
- lvalue 표현식 → `T&`
- xvalue 표현식 → `T&&`
- prvalue 표현식 → `T`

```cpp
int  i = 0;
int& r = i;
int* p = &i;

// 규칙 1 (id-expression 또는 멤버 접근)
decltype(i)        // int       — i의 선언된 타입
decltype(r)        // int&      — r의 선언된 타입 (참조 그대로!)
decltype(p->member) // 멤버의 선언된 타입

// 규칙 2 (그 외 모든 표현식)
decltype((i))      // int&      — (i)는 lvalue 표현식
decltype(*p)       // int&      — *p는 lvalue 표현식
decltype(i + 1)    // int       — i+1은 prvalue
decltype(std::move(i)) // int&& — std::move(i)는 xvalue
```

**왜 `(x)`는 "그 외 표현식"으로 분류되나?**

C++ 문법에서 **그냥 `x`는 id-expression**(이름 그 자체)이지만, **`(x)`는 괄호로 감싼 표현식**입니다. 의미상 같은 객체를 가리키더라도 문법 범주가 다릅니다. id-expression이 아니면 규칙 1이 적용되지 않고 규칙 2(값 카테고리 기반)로 떨어집니다 — `(x)`는 lvalue 표현식이므로 `int&`.

```cpp
int x = 0;
decltype(x)    // 규칙 1 적용: int
decltype((x))  // id-expression 아님 → 규칙 2: lvalue → int&
decltype(((x)))// 마찬가지: int& (괄호 개수 무관)
```

### `decltype(auto)`와 합쳐지면 진짜 함정

`decltype(auto)`는 추론할 때 **decltype 규칙**을 사용합니다. 함수 반환에서 별 생각 없이 `(x)`를 쓰면 지역 변수의 참조가 반환되어 댕글링이 됩니다.

```cpp
decltype(auto) f1() {
    int x = 0;
    return x;     // id-expression → int (값 반환)
}

decltype(auto) f2() {
    int x = 0;
    return (x);   // (x)는 lvalue 표현식 → int& (지역 변수 참조!)
}                 // 함수 종료 시 x 소멸 → 댕글링 참조 반환
```

**겉보기엔 사소한 괄호가 의미를 완전히 뒤집습니다.**

```cpp
int& ref = f2();  // 지역 변수 x의 참조 — 이미 소멸됨
ref = 10;         // 정의되지 않은 동작 (UB)
```

### 자주 마주치는 lvalue 표현식 패턴

다음은 모두 "이름이 아닌 lvalue 표현식"이라 `decltype`이 참조를 붙입니다.

```cpp
int  arr[10];
int* p   = arr;
int  i   = 0;

decltype(arr[0])      // int& — 배열 첨자
decltype(*p)          // int& — 역참조
decltype(++i)         // int& — 전위 증감
decltype(i = 0)       // int& — 대입식
decltype((i))         // int& — 괄호로 감싸인 변수
decltype(std::cout)   // std::ostream& — 멤버 아닌 객체 식별자라도 이름이면 규칙 1

// 반대로
decltype(i++)         // int  — 후위 증감은 prvalue
decltype(i + 0)       // int  — 산술식은 prvalue
decltype(42)          // int  — 리터럴은 prvalue
decltype(std::move(i)) // int&& — xvalue
```

### 한눈에 보는 결정 트리

<img src="/images/blog/emc/diagrams/item03-decltype-flow.svg" alt="decltype 결정 흐름도" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

**기억할 한 줄:** 이름은 "선언된 그대로", 그 외는 "값 카테고리에 따라".

## 실전 예제

**컨테이너 접근자 완성본:**

```cpp
template<typename Container, typename Index>
decltype(auto) authAndAccess(Container&& c, Index i) {
    authenticateUser();
    return std::forward<Container>(c)[i];
}

// 사용
std::vector<std::string> makeVec();

auto s = authAndAccess(makeVec(), 5);  // rvalue 컨테이너

std::vector<int> v = {1, 2, 3};
authAndAccess(v, 1) = 42;              // lvalue 컨테이너 수정
```

## decltype은 표현식을 "평가"하지 않는다

이건 자주 간과되지만 실전에서 매우 유용한 성질입니다. `decltype(E)`는 **`E`의 타입만 검사하고, 절대로 실행하지 않습니다.** `sizeof`, `noexcept`, `typeid`(다형성 객체 제외)와 함께 **unevaluated context**(평가되지 않는 문맥)에 속합니다.

### 부작용은 일어나지 않는다

```cpp
int counter = 0;
int next() { ++counter; return counter; }

decltype(next())  // 타입은 int — 하지만 next()는 호출되지 않음
                  // counter는 여전히 0!

sizeof(next())    // 마찬가지 — 호출 없이 타입 크기만 평가
```

### 정의가 없는 함수도 사용 가능

함수 **선언만** 있어도 `decltype`은 반환 타입을 알아낼 수 있습니다. 정의가 링크되지 않아도 됩니다.

```cpp
int compute();              // 선언만 — 정의 없음

decltype(compute())   x;    // OK — int x;
decltype(compute()) + 1;    // 컴파일 OK (어차피 호출 안 함)

int main() {
    int y = compute();      // 링크 에러 — 진짜 호출하면 정의 필요
}
```

### 객체가 존재하지 않아도 OK

`decltype` 안에서는 객체를 진짜로 만들 필요가 없습니다. 이게 **`std::declval`**의 존재 이유입니다.

```cpp
struct Heavy {
    Heavy() = delete;          // 생성 불가
    int compute() const;
};

// Heavy 인스턴스 없이 compute()의 반환 타입을 알아내고 싶다면?
// 이건 안 됨:
decltype(Heavy().compute())  // 에러! Heavy() 생성자 = delete

// std::declval 사용:
decltype(std::declval<Heavy>().compute())  // OK — int
```

`std::declval<T>()`는 "마치 `T`의 인스턴스가 있는 것처럼 lvalue/rvalue를 반환한다"고 가정하는 도구입니다. **decltype 안에서만 의미가 있고, 실행되지 않으니** 실제 인스턴스는 필요 없습니다.

### 표현식 SFINAE에서의 활용

`decltype`이 평가되지 않는다는 점을 이용하면, **컴파일 타임에 어떤 표현식이 유효한지** 검사할 수 있습니다 (= "이 타입에 이 멤버가 있나?").

```cpp
#include <type_traits>

// has_size<T>: T에 .size() 멤버 함수가 있는지
template<typename T, typename = void>
struct has_size : std::false_type {};

template<typename T>
struct has_size<T, std::void_t<decltype(std::declval<T>().size())>>
    : std::true_type {};

static_assert(has_size<std::vector<int>>::value);   // OK
static_assert(!has_size<int>::value);                // int에는 .size() 없음
```

`std::declval<T>().size()`는 **타입 검사만** 됩니다 — 실제 호출이 일어나지 않으므로 `T`가 생성 불가능해도, `size()`가 부작용이 있어도 안전합니다.

### C++20: `requires` 식과 비교

C++20부터는 같은 검사를 더 읽기 쉽게 쓸 수 있습니다 — 동작 원리는 동일하게 평가되지 않는 문맥입니다.

```cpp
template<typename T>
concept HasSize = requires(T t) {
    t.size();           // 이 표현식이 유효한가? 평가는 안 함
};

static_assert(HasSize<std::vector<int>>);
```

### 정리

- `decltype(E)`, `sizeof(E)`, `noexcept(E)`, `requires { E; }` — 모두 `E`를 **타입 검사만 하고 실행하지 않음**
- 부작용 없음, 정의 없는 함수 OK, 생성 불가능한 객체 OK
- `std::declval<T>()`는 unevaluated context에서 "있는 셈 치는" 표준 도구
- 표현식 SFINAE / Concepts의 토대

## 핵심 정리

1. **decltype은 타입을 그대로 알려줌**
   ```cpp
   const int& x = 42;
   decltype(x)  // const int&
   ```

2. **decltype(auto)는 decltype 규칙으로 추론**
   ```cpp
   decltype(auto) x = 42;      // int
   decltype(auto) y = (42);    // int (prvalue)
   int z = 0;
   decltype(auto) r1 = z;      // int
   decltype(auto) r2 = (z);    // int& (lvalue 표현식!)
   ```

3. **이름 vs 표현식 구분 중요**
   ```cpp
   int x;
   decltype(x)    // int (이름)
   decltype((x))  // int& (표현식)
   ```

4. **함수 반환 타입에 유용**
   ```cpp
   template<typename Container, typename Index>
   decltype(auto) getElement(Container&& c, Index i) {
       return std::forward<Container>(c)[i];
   }
   ```

**기억하세요:** decltype은 거짓말을 하지 않습니다. 하지만 괄호 하나가 큰 차이를 만들 수 있어요!