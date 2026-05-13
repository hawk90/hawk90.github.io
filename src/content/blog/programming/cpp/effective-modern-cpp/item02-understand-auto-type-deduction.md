---
title: "항목 2: auto의 타입 추론 규칙을 이해하라"
date: 2025-01-05T11:00:00
description: "auto 타입 추론은 템플릿 타입 추론과 거의 같다. 단 하나의 예외 — 중괄호 초기화."
tags: [C++, auto, Type Deduction]
series: "Effective Modern C++"
seriesOrder: 2
---

## 왜 이 항목이 중요한가?

`auto`는 Modern C++에서 가장 자주 쓰는 키워드 중 하나다. 변수 선언, 함수 반환, 람다 매개변수에 두루 쓰이는 만큼 추론 규칙을 정확히 알아야 한다. 다행히 항목 1의 템플릿 추론 규칙을 거의 그대로 따른다.

문제는 **단 하나의 예외**다. 중괄호 초기화 `{...}`를 만나면 `auto`는 템플릿과 다르게 동작한다. 이 한 가지 차이가 다음과 같은 함정을 낳는다.

- `auto x = {27};`이 왜 `int`가 아니라 `std::initializer_list<int>`인가.
- `auto x{27};`이 C++11/14와 C++17에서 다르게 동작한다.
- 함수 반환·람다에선 또 다른 규칙이 적용된다.

이 항목 하나만 정리해 두면 이후 모든 `auto` 사용에서 헷갈릴 일이 없다.

## 개요

좋은 소식이 있다. `auto` 타입 추론은 템플릿 타입 추론과 거의 같다. 항목 1을 이해했다면 이미 대부분을 아는 셈이다. 다만 한 가지 특별한 예외가 있다.

## auto = 템플릿 타입 추론 (거의)

`auto`를 사용하면 컴파일러가 템플릿처럼 타입을 추론한다.

```cpp
auto x = 27;        // int
const auto cx = x;  // const int
const auto& rx = x; // const int&

// 이건 마치 이런 템플릿과 같다
template<typename T>
void func_for_x(T param);   // auto x = 27과 같은 추론

template<typename T>
void func_for_cx(const T param);  // const auto cx = x와 같은 추론

template<typename T>
void func_for_rx(const T& param); // const auto& rx = x와 같은 추론
```

## auto와 템플릿의 세 가지 경우

항목 1에서 본 세 가지 경우가 그대로 적용된다.

### 경우 1: auto에 참조나 포인터가 있을 때

```cpp
int x = 27;
const int cx = x;
const int& rx = x;

auto& v1 = x;   // int&
auto& v2 = cx;  // const int&
auto& v3 = rx;  // const int& (rx의 참조성은 무시)

const auto& v4 = x;  // const int&

auto* v5 = &x;  // int*
auto* v6 = &cx; // const int*
```

### 경우 2: auto&& (보편 참조)

```cpp
auto&& uref1 = x;   // x는 lvalue → int&
auto&& uref2 = cx;  // cx는 lvalue → const int&
auto&& uref3 = 27;  // 27은 rvalue → int&&
```

#### 왜 `auto&&`가 보편 참조인가

항목 1에서 본 보편 참조의 두 조건을 그대로 만족한다.

1. **타입 추론**이 일어나는 자리 — `auto`는 정의상 추론이다.
2. **정확히 `auto&&` 형태** — `const auto&&`나 `auto*&&` 같은 변형은 보편 참조가 아니다.

```cpp
auto&& a = x;          // ✅ 보편 참조
const auto&& b = 42;   // ❌ rvalue 참조 (const가 붙어 보편 X)
```

내부적으로는 템플릿과 동일한 **참조 축약**이 일어난다.

```cpp
int x = 10;
auto&& r = x;
// 1) x는 lvalue → auto는 int&로 추론
// 2) auto&& = int& && → 참조 축약 → int&
// 결과: r은 int&

auto&& s = 42;
// 1) 42는 rvalue → auto는 int로 추론
// 2) auto&& = int&&
// 결과: s는 int&&
```

#### 가장 흔한 실전 활용: range-for

`auto&&`는 range-for에서 **컨테이너 element가 무엇이든 안전하게 받는 만능 형태**다.

```cpp
std::vector<int>  vi  = {1, 2, 3};
std::vector<bool> vb  = {true, false};   // 프록시 타입 함정 (item 6)
const std::vector<int>& cvi = vi;

for (auto& e : vi)  { /* int& */ }
for (auto& e : vb)  { /* 에러! vector<bool>은 프록시(rvalue) 반환 */ }
for (auto& e : cvi) { /* const int& */ }

for (auto&& e : vi)  { /* int&        — lvalue 받음 */ }
for (auto&& e : vb)  { /* 프록시 객체 — rvalue 받음 OK! */ }
for (auto&& e : cvi) { /* const int&  — const 보존 */ }
```

요점은 이렇다. `for (auto&& e : container)`는 **컨테이너가 무엇이든**, **원소가 lvalue든 rvalue든**, **수정 가능하든 const든** 거의 항상 잘 동작한다. 단, 안에서 element를 다른 함수로 넘길 때 원래 카테고리를 유지하고 싶다면 `std::forward<decltype(e)>(e)`를 사용한다.

#### 제네릭 람다의 매개변수 `auto&&`

C++14 제네릭 람다도 `auto&&`로 모든 인자 카테고리를 받을 수 있다.

```cpp
auto print = [](auto&& x) {
    std::cout << std::forward<decltype(x)>(x) << '\n';
};

int a = 1;
print(a);        // lvalue
print(42);       // rvalue
print(std::move(a));  // xvalue
// 모두 OK — 카테고리 보존
```

이 패턴이 perfect forwarding의 람다 버전이며, 표준 알고리즘과 함께 가장 자주 쓰인다.

### 경우 3: auto만 (값 복사)

```cpp
auto v1 = x;   // int (const 무시)
auto v2 = cx;  // int (const 무시)
auto v3 = rx;  // int (참조와 const 모두 무시)
```

## 특별한 예외: 중괄호 초기화

**여기가 템플릿과 다른 유일한 부분이다.**

```cpp
auto x1 = 27;      // int
auto x2(27);       // int
auto x3 = {27};    // std::initializer_list<int> (!)
auto x4{27};       // ← 여기가 C++17에서 바뀜
```

### C++17 변경의 정확한 규칙

C++17부터 `auto x{...}` 형태(direct-list-initialization)의 규칙이 더 정교해졌다. 단순히 "auto x{1}이 int로 바뀌었다"가 전부가 아니다. **원소 개수**에 따라 다르다.

| 형태 | C++11/14 | C++17 이후 |
| --- | --- | --- |
| `auto x = {27};` (copy-list-init) | `initializer_list<int>` | `initializer_list<int>` (변화 없음) |
| `auto x = {1, 2, 3};` (copy-list-init) | `initializer_list<int>` | `initializer_list<int>` (변화 없음) |
| `auto x{27};` (direct-list-init, **단일 원소**) | `initializer_list<int>` | **`int`** ← 바뀜 |
| `auto x{1, 2, 3};` (direct-list-init, **다중 원소**) | `initializer_list<int>` | **컴파일 에러** ← 바뀜 |

```cpp
// C++17 기준
auto a = {1};        // initializer_list<int>
auto b = {1, 2, 3};  // initializer_list<int>
auto c{1};           // int           ← 단일 원소만 OK
auto d{1, 2, 3};     // 에러!         ← 다중 원소는 직접 초기화 금지
auto e{1, 2.0};      // 에러!         ← 타입도 섞이면 당연히 에러
```

핵심은 한 줄로 요약된다. **`= {}`는 항상 `initializer_list`, `{}`는 단일이면 직접 추론·다중이면 에러.**

### copy-init vs direct-init — 왜 차이가 나나?

C++ 초기화 문법은 등호(`=`) 유무로 두 가지 범주로 나뉜다.

```cpp
auto x = {27};   // copy-list-initialization
auto y{27};      // direct-list-initialization
```

- **copy-list-init (`= {}`)** — 항상 `initializer_list`로 처리된다. `auto`의 일관된 특수 규칙이다.
- **direct-list-init (`{}`)** — C++17부터는 **"진짜 단일 값을 직접 초기화한다"**는 더 흔한 의도를 우선시한다. 단일 원소면 그 타입으로 추론하고, 여러 원소면 에러로 실수를 방지한다.

이 구분은 다른 곳에서도 영향을 준다(예: `T x = {}` vs `T x{}` — explicit 생성자 호출 가능 여부).

**템플릿은 중괄호를 추론하지 못한다.**

```cpp
template<typename T>
void f(T param);

f({11, 23, 9});    // 에러! T를 추론할 수 없다

// 하지만 auto는 가능하다
auto x = {11, 23, 9};  // std::initializer_list<int>
```

**실제 사용 시 주의사항**

```cpp
// 실수하기 쉬운 경우
std::vector<int> v;
auto resetV = [&v](const auto& newValue) {
    v = newValue;  // newValue가 뭘까?
};

resetV({1, 2, 3});  // 에러! auto는 중괄호 추론 불가

// 해결책: std::initializer_list를 명시
auto resetV = [&v](std::initializer_list<int> newValue) {
    v = newValue;
};
```

### 왜 중괄호 초기화는 함정이 되는가?

`auto`의 중괄호 특수 규칙뿐만 아니라, **중괄호 초기화 자체**가 일반 초기화와 다르게 동작하는 경우가 있어 같이 알아 둘 가치가 있다.

#### 1. `initializer_list` 생성자가 다른 생성자를 덮어쓴다

`{}`로 초기화하면 컴파일러는 **`initializer_list`를 받는 생성자를 최우선**으로 찾는다. 같은 인자라도 괄호와 중괄호가 완전히 다른 결과를 낳는다.

```cpp
std::vector<int> v1(10, 20);   // (size_t, value) 생성자
                               // → 20이 10개 들어있는 벡터: {20, 20, ..., 20}

std::vector<int> v2{10, 20};   // initializer_list<int> 생성자
                               // → 원소가 두 개인 벡터: {10, 20}
```

`vector`는 두 형태의 생성자를 모두 가지고 있는데, `{}`를 쓰는 순간 컴파일러는 `initializer_list` 쪽으로 직진한다. 이게 때로는 의도와 다르다.

#### 2. 변환 가능성이 조금만 있어도 `initializer_list`가 이긴다

```cpp
class Widget {
public:
    Widget(int i, bool b);                   // (a)
    Widget(int i, double d);                 // (b)
    Widget(std::initializer_list<long> il);  // (c)
};

Widget w1(10, true);    // (a) 호출 — 일반 매칭
Widget w2{10, true};    // (c) 호출!
                        //     int → long, bool → long 변환이 가능하면
                        //     컴파일러는 (c)를 우선시한다
```

심지어 변환이 **narrowing**(좁아지는 변환)이라 결국 에러가 나도, 컴파일러는 다른 생성자로 후퇴하지 않고 그냥 에러를 낸다.

#### 3. `{}` 안에서는 narrowing 변환이 금지

일반 초기화는 허용하는 변환을 `{}`는 거부한다. 안전하지만 가끔 놀라움을 준다.

```cpp
double d = 3.14;

int x1 = d;      // OK: 암묵적으로 잘림 (3)
int x2(d);       // OK: 동일
int x3{d};       // 에러! double → int는 narrowing
int x4 = {d};    // 에러! 동일
```

#### 4. 빈 중괄호 `{}`는 기본 초기화 — `initializer_list` 호출 아님

빈 중괄호는 예외적으로 `initializer_list` 우선 규칙에서 빠진다.

```cpp
class Widget {
public:
    Widget();                                 // 기본 생성자
    Widget(std::initializer_list<int> il);
};

Widget w1;       // 기본 생성자
Widget w2{};     // 기본 생성자 (빈 list가 아니다!)
Widget w3({});   // 빈 initializer_list 생성자 — 이 형태가 list 호출
Widget w4{{}};   // 빈 initializer_list 생성자
```

#### 정리: `{}` 사용의 트레이드오프

- **장점**: narrowing 차단, 가장 일관된 초기화 문법(객체·배열·집합체 모두), 모호한 함수 선언(`Widget w();` 함정) 회피.
- **단점**: `initializer_list` 생성자가 있으면 우선시되어 의도와 다른 호출이 일어날 수 있다.

`auto`와 결합하면 이 단점이 더 두드러진다. 그래서 항목 7에서 `()` vs `{}` 선택을 따로 다룬다.

## 함수 반환 타입에서의 auto

C++14부터 함수 반환 타입에 `auto`를 쓸 수 있다. 다만 여기서는 **템플릿 타입 추론**을 사용한다.

```cpp
auto createInitList() {
    return {1, 2, 3};  // 에러! 중괄호 추론 불가
}

// 해결책: 명시적 타입
std::initializer_list<int> createInitList() {
    return {1, 2, 3};  // OK
}

// 또는 일반 컨테이너 사용
auto createVector() {
    return std::vector<int>{1, 2, 3};  // OK
}
```

### 모든 `return`문은 같은 타입을 반환해야 한다

함수에 `return`이 여러 개 있을 때, **모두 같은 타입으로 추론되어야** 한다. 하나라도 다르면 컴파일 에러다.

```cpp
auto choose(bool flag) {
    if (flag) return 1;       // int
    else      return 2.0;     // double
    // 에러! 추론된 반환 타입이 일관되지 않는다
}
```

해결은 두 가지다.

```cpp
// 방법 1: 명시적 변환으로 타입 통일
auto choose(bool flag) {
    if (flag) return 1.0;     // double로 통일
    else      return 2.0;
}

// 방법 2: 명시적 반환 타입 지정
double choose(bool flag) {
    if (flag) return 1;       // 1 → 1.0 변환
    else      return 2.0;
}
```

### 첫 번째 `return`이 타입을 결정한다

여러 `return`이 있으면 **소스 코드 순서상 첫 번째 `return`** 이 타입을 정하고, 이후 `return`들은 그 타입과 일치하는지 검사받는다.

```cpp
auto f(int x) {
    if (x < 0) return -1;     // ← 이 return이 반환 타입을 int로 확정
    return x * 1.5;           // 에러! double은 int와 불일치
}
```

### 재귀 함수의 함정

`auto` 반환 타입은 **재귀 호출이 첫 번째 `return`보다 앞에 있으면** 추론할 수 없다. 그 시점에 컴파일러는 함수의 반환 타입을 아직 모르기 때문이다.

```cpp
auto factorial(int n) {
    if (n <= 1) return 1;     // 먼저 등장 → 반환 타입 = int 확정
    return n * factorial(n - 1);  // OK: 이 시점엔 반환 타입을 안다
}

// 반대로 하면?
auto bad(int n) {
    if (n > 1) return n * bad(n - 1);  // 에러! bad의 반환 타입을 아직 추론 못함
    return 1;
}
```

규칙은 이렇다. **재귀 호출보다 비-재귀 `return`이 먼저** 와야 한다.

### `auto` vs `decltype(auto)` — 함수 반환에서

함수 반환에서 `auto`를 쓰면 **항상 값으로 복사**된다 (참조와 const가 깎인다). 참조를 그대로 돌려주려면 `decltype(auto)`가 필요하다. 자세한 건 항목 3에서 다룬다.

```cpp
template<typename Container, typename Index>
auto access(Container& c, Index i) {
    return c[i];              // c[i]가 int& 라도 → int (복사)
}

template<typename Container, typename Index>
decltype(auto) access2(Container& c, Index i) {
    return c[i];              // int& 그대로 유지
}
```

## 람다에서의 auto

C++14 람다 매개변수에서도 마찬가지다.

```cpp
// C++14
auto lambda = [](const auto& x) { /* ... */ };

// 이건 템플릿과 같다
class Lambda {
    template<typename T>
    void operator()(const T& x) const { /* ... */ }
};

// 따라서
lambda({1, 2, 3});  // 에러! 중괄호 추론 불가
```

## 정리하면

**auto 타입 추론 = 템플릿 타입 추론.**
단 하나의 예외: **중괄호 초기화는 `std::initializer_list`로 추론된다.**

```cpp
// 요약
auto x = 27;       // int (템플릿과 같음)
auto y = {27};     // std::initializer_list<int> (auto만의 특별 규칙!)

template<typename T>
void f(T param);
f(27);             // T는 int
f({27});           // 에러! (템플릿은 중괄호 추론 불가)
```

## 실전 팁

1. **중괄호 초기화 조심하기**

   ```cpp
   auto x = {1};   // std::initializer_list<int> — 의도한 건가?
   int x = {1};    // int — 아마 이걸 원했을 것이다
   ```

2. **C++17 변경사항 인지**

   ```cpp
   auto x{1};      // C++11/14: std::initializer_list<int>
                   // C++17:    int
   ```

3. **함수 반환·람다는 템플릿 규칙**

   ```cpp
   auto f() { return {1, 2, 3}; }  // 에러!
   // 템플릿 타입 추론이므로 중괄호 불가
   ```

`auto`는 편리하지만 중괄호 초기화의 함정을 조심해야 한다.

## 관련 항목

- [항목 1: 템플릿 타입 추론 규칙을 이해하라](/blog/programming/cpp/effective-modern-cpp/item01-understand-template-type-deduction) — 세 가지 경우와 보편 참조
- [항목 3: decltype의 작동 방식을 이해하라](/blog/programming/cpp/effective-modern-cpp/item03-understand-decltype) — `decltype(auto)`까지
- [항목 5: auto를 선호하라](/blog/programming/cpp/effective-modern-cpp/item05-prefer-auto) — 언제 `auto`를 쓰면 좋은가
- [항목 6: auto가 원치 않는 타입을 추론할 때는 명시 타입을 사용하라](/blog/programming/cpp/effective-modern-cpp/item06-use-explicit-typed-initializer) — 프록시 타입 함정
- [항목 7: 객체 생성 시 괄호와 중괄호 구분](/blog/programming/cpp/effective-modern-cpp/item07-distinguish-paren-and-brace-when-creating-objects) — `()` vs `{}` 선택
