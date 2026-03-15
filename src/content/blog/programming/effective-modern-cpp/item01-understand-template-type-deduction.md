---
title: "항목 1: 템플릿 타입 추론 규칙을 이해하라"
date: 2025-01-05T10:00:00
description: "C++의 템플릿 타입 추론 규칙을 세 가지 경우로 나누어 명확하게 이해합니다."
tags: [C++, Template, Type Deduction]
series: "Effective Modern C++"
seriesOrder: 1
---

## 개요

C++의 템플릿 타입 추론(template type deduction)은 복잡해 보이지만, 세 가지 경우로 나누어 생각하면 명확해집니다. `auto` 타입 추론도 거의 동일한 규칙을 따르므로, 이 규칙을 확실히 이해하는 것이 중요합니다.

## 템플릿 함수 기본 형태

```cpp
template<typename T>
void f(ParamType param);

f(expr);  // expr로 T와 ParamType을 추론
```

## 필수 개념: const와 volatile

> **초보자를 위한 배경 지식**

<br>

템플릿 타입 추론을 이해하려면 먼저 타입 한정자(type qualifier)를 알아야 합니다.

### const - "변경 금지"

**const = 상수 = 한 번 정하면 바꿀 수 없는 값**

```cpp
int age = 25;
age = 26;        // OK: 일반 변수는 변경 가능

const int birth_year = 1998;
birth_year = 1999;  // 에러! const는 절대 수정 불가
```

**const와 포인터 - 무엇이 const인가?**

```cpp
// 1. const가 * 앞에 있으면 → 가리키는 값이 const
const int* ptr1 = &x;      // "ptr1이 가리키는 int가 const"
int const* ptr1 = &x;      // 위와 완전히 동일!

*ptr1 = 30;                 // 에러! 가리키는 값 수정 불가
ptr1 = &y;                  // OK! 포인터는 다른 곳을 가리킬 수 있음

// 2. const가 * 뒤에 있으면 → 포인터 자체가 const
int* const ptr2 = &x;      // "ptr2라는 포인터가 const"

*ptr2 = 40;                 // OK! 가리키는 값은 변경 가능
ptr2 = &y;                  // 에러! 포인터는 다른 곳을 가리킬 수 없음

// 3. 둘 다 const
const int* const ptr3 = &x; // 포인터도, 가리키는 값도 모두 const
```

**암기법: "const는 바로 오른쪽 것을 const로 만든다"**
```cpp
int const *     // int가 const
int * const     // *(포인터)가 const
```

### volatile - "최적화 금지"

**volatile = 변덕스러운 = 언제든 바뀔 수 있는 값**

컴파일러는 코드를 더 빠르게 실행하기 위해 똑똑한 변경(최적화)를 합니다:

```cpp
int x = 5;
int y = x * 2;
int z = x * 2;  // 컴파일러: "x * 2를 두 번? y값 재사용하자!"
```

하지만 때로는 이런 최적화가 문제가 됩니다:

```cpp
// volatile 없을 때
int flag = 1;
while (flag) {
    // flag를 바꾸는 코드가 없네?
}
// 컴파일러: "flag는 안 바뀌니까 while(true)로 바꾸자!"
// 결과: 무한 루프! (다른 스레드가 flag를 바꿔도 모름)

// volatile 있을 때
volatile int flag = 1;
while (flag) {
    // 매번 메모리에서 flag 값을 다시 읽음
}
// 컴파일러: "volatile이니까 최적화하면 안 돼. 매번 읽어야 해"
// 결과: 다른 스레드가 flag를 0으로 바꾸면 루프 종료!
```

**언제 쓰나요?**
- 하드웨어가 바꾸는 메모리 (임베디드 시스템)
- 여러 스레드가 공유하는 변수 (하지만 std::atomic이 더 나음)

### cv-qualifiers

const와 volatile을 함께 사용할 수도 있습니다:

```cpp
const volatile int cv_val = 42;
// const: 우리 코드에서 수정 불가
// volatile: 외부에서 바뀔 수 있으니 최적화 금지
```

**템플릿 타입 추론에서 중요한 점:**
- 값 전달(pass-by-value)에서는 const와 volatile이 무시됩니다
- 참조나 포인터 전달에서는 const가 유지됩니다

## 필수 개념: Value Categories (값 분류)

> **초보자를 위한 배경 지식**

<br>

C++11부터 값(expression)의 분류가 더 세밀해졌습니다. 템플릿 타입 추론을 이해하려면 이 개념이 필수입니다.

### C++11의 값 분류 체계

![C++ Value Categories](/images/blog/cpp-value-categories.svg)

### 1. lvalue (Left Value)
**특징:**
- 이름이 있는 객체
- 주소를 구할 수 있음 (&연산자 사용 가능)
- 여러 번 접근 가능

```cpp
int x = 42;              // x는 lvalue
int* ptr = &x;           // OK: 주소를 구할 수 있음

int& getRef();
getRef() = 10;           // getRef()의 반환값도 lvalue

const int y = 5;         // const도 lvalue (수정 불가능하지만)
```

### 2. prvalue (Pure Right Value)
**특징:**
- 리터럴이나 임시 객체
- 주소를 구할 수 없음
- 표현식이 끝나면 사라짐

```cpp
42;                      // 숫자 리터럴은 prvalue
int getValue();
getValue();              // 반환값은 prvalue

int x = 10 + 20;         // (10 + 20)은 prvalue
```

### 3. xvalue (eXpiring Value)
**특징:**
- 곧 소멸할 객체 (move 가능)
- rvalue 참조를 반환하는 함수 호출
- std::move()의 결과

```cpp
int&& getRvalueRef();
getRvalueRef();          // xvalue

std::vector<int> v;
std::move(v);            // xvalue - v를 이동시킬 수 있음

static_cast<int&&>(x);   // x를 xvalue로 변환
```

### 4. glvalue (Generalized Left Value)
**설명:** lvalue + xvalue
- 실제 객체를 가리킴
- 다형성 타입일 수 있음

### 5. rvalue
**설명:** prvalue + xvalue
- move 연산의 대상이 될 수 있음
- 임시 객체나 이동 가능한 객체

### 실용적인 구분법

**간단한 규칙:**
1. 이름이 있으면? → **lvalue**
2. 리터럴이나 임시 객체? → **prvalue**
3. std::move()의 결과? → **xvalue**

```cpp
int x = 10;              // x: lvalue, 10: prvalue
int&& rr = std::move(x); // rr: lvalue (이름이 있음!)
                         // std::move(x): xvalue

void process(int& lr);   // lvalue만 받음
void process(int&& rr);  // rvalue만 받음

int y = 20;
process(y);              // lvalue → 첫 번째 오버로드
process(30);             // prvalue → 두 번째 오버로드
process(std::move(y));   // xvalue → 두 번째 오버로드
```

**주의사항:**
```cpp
int&& rref = 10;         // rref는 rvalue 참조 타입이지만
                         // rref 자체는 lvalue! (이름이 있음)
process(rref);           // 첫 번째 오버로드 호출됨!
process(std::move(rref));// 두 번째 오버로드를 원한다면 move 필요
```

## 기본 형태

템플릿 함수의 일반적인 형태:

```cpp
template<typename T>
void f(ParamType param);

f(expr);  // expr로부터 T와 ParamType을 추론
```

컴파일러는 `expr`을 통해 두 가지 타입을 추론합니다:
- `T`의 타입
- `ParamType`의 타입

이 둘은 종종 다릅니다. `ParamType`에는 const나 참조(&) 같은 한정자가 포함될 수 있기 때문입니다.

## 세 가지 경우

### 경우 1: ParamType이 참조 또는 포인터 (보편 참조는 제외)

**규칙:**
1. `expr`이 참조 타입이면, 참조 부분을 무시합니다
2. `expr`의 타입과 `ParamType`을 패턴 매칭하여 `T`를 결정합니다

```cpp
template<typename T>
void f(T& param);    // param은 참조

int x = 27;
const int cx = x;
const int& rx = x;

f(x);   // T는 int,       param의 타입은 int&
f(cx);  // T는 const int, param의 타입은 const int&
f(rx);  // T는 const int, param의 타입은 const int&
        // (rx의 참조성은 무시됨)
```

const 참조 파라미터의 경우:

```cpp
template<typename T>
void f(const T& param);  // param은 const 참조

int x = 27;
const int cx = x;
const int& rx = x;

f(x);   // T는 int, param의 타입은 const int&
f(cx);  // T는 int, param의 타입은 const int&
f(rx);  // T는 int, param의 타입은 const int&
```

포인터의 경우도 동일한 규칙이 적용됩니다:

```cpp
template<typename T>
void f(T* param);

int x = 27;
const int* px = &x;

f(&x);  // T는 int,       param의 타입은 int*
f(px);  // T는 const int, param의 타입은 const int*
```

### 경우 2: ParamType이 보편 참조(Universal Reference)

#### 보편 참조란?
보편 참조(Universal Reference) 또는 전달 참조(Forwarding Reference)는 `T&&` 형태로 선언되는 특별한 참조입니다.

**왜 특별한가요?**
- 일반적인 `&&`는 rvalue 참조만 받지만
- 템플릿에서 `T&&`는 lvalue와 rvalue를 **모두** 받을 수 있습니다!

```cpp
void f(Widget&& param);        // rvalue 참조 - rvalue만 받음
template<typename T>
void f(T&& param);             // 보편 참조 - lvalue, rvalue 모두 받음!
```

**규칙:**
- `expr`이 lvalue면 → `T`와 `ParamType` 모두 lvalue 참조로 추론
- `expr`이 rvalue면 → 일반 규칙(경우 1)을 적용

```cpp
template<typename T>
void f(T&& param);   // param은 보편 참조

int x = 27;
const int cx = x;
const int& rx = x;

f(x);   // x는 lvalue  → T는 int&,       param은 int&
f(cx);  // cx는 lvalue → T는 const int&, param은 const int&
f(rx);  // rx는 lvalue → T는 const int&, param은 const int&
f(27);  // 27은 rvalue → T는 int,        param은 int&&
```

이것이 유일하게 `T`가 참조 타입으로 추론되는 경우입니다!

#### 참조 축약(Reference Collapsing) 규칙

보편 참조가 작동하는 이유는 "참조 축약" 때문입니다:

```cpp
template<typename T>
void f(T&& param);

int x = 10;
f(x);  // x는 lvalue
```

위 호출에서 무슨 일이 일어날까요?

1. `x`는 lvalue이므로 `T`는 `int&`로 추론
2. `param`의 타입은 `int& &&`가 되어야 하는데...
3. C++의 참조 축약 규칙이 적용됩니다!

**참조 축약 규칙:**
```cpp
T& &   → T&     // 참조에 대한 참조
T& &&  → T&     // lvalue 참조에 대한 rvalue 참조
T&& &  → T&     // rvalue 참조에 대한 lvalue 참조
T&& && → T&&    // rvalue 참조에 대한 rvalue 참조
```

**실제 적용 예시:**
```cpp
template<typename T>
void f(T&& param);

int x = 10;
const int cx = x;

f(x);    // T = int&,       param = int& && → int&
f(cx);   // T = const int&, param = const int& && → const int&
f(10);   // T = int,        param = int&&
```

#### std::move와 std::forward의 이해

보편 참조를 제대로 활용하려면 이 두 함수를 이해해야 합니다:

**std::move**
- lvalue를 rvalue로 캐스팅 (실제로 이동하지 않음!)
- "이 객체는 이동해도 된다"는 신호

```cpp
template<typename T>
typename std::remove_reference<T>::type&& move(T&& t) noexcept {
    return static_cast<typename std::remove_reference<T>::type&&>(t);
}

// 사용 예시
std::string str = "hello";
std::string str2 = std::move(str);  // str을 rvalue로 캐스팅
// 이제 str은 "moved-from" 상태 (사용하면 안됨)
```

**std::forward (Perfect Forwarding)**
- 조건부 캐스팅: lvalue는 lvalue로, rvalue는 rvalue로 전달
- 보편 참조와 함께 사용하여 원래 값 카테고리 유지

```cpp
template<typename T>
T&& forward(typename std::remove_reference<T>::type& t) noexcept {
    return static_cast<T&&>(t);
}

// 보편 참조와 함께 사용
template<typename T>
void wrapper(T&& arg) {
    // arg는 이름이 있으므로 항상 lvalue!
    // forward를 사용해 원래 카테고리 유지
    process(std::forward<T>(arg));
}

int x = 10;
wrapper(x);        // forward는 lvalue로 전달
wrapper(20);       // forward는 rvalue로 전달
```

**언제 무엇을 사용?**
```cpp
template<typename T>
void func(T&& param) {
    // rvalue로 이동하고 싶을 때
    process(std::move(param));

    // 원래 값 카테고리를 유지하고 싶을 때
    process(std::forward<T>(param));

    // 주의: param 자체는 항상 lvalue! (이름이 있으므로)
    process(param);  // 항상 lvalue로 전달됨
}
```

**실전 예제: 팩토리 함수**
```cpp
template<typename T, typename... Args>
std::unique_ptr<T> make_unique_wrong(Args&&... args) {
    return std::unique_ptr<T>(new T(args...));  // 잘못됨! 모두 lvalue로 전달
}

template<typename T, typename... Args>
std::unique_ptr<T> make_unique_correct(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));  // 정답!
}

// 사용시
struct Widget {
    Widget(std::string&& s) { /* move constructor */ }
};

auto w = make_unique_correct<Widget>("temp");  // rvalue가 제대로 전달됨
```

### 경우 3: ParamType이 참조도 포인터도 아닌 경우

값 전달(pass-by-value)입니다:

**규칙:**
1. `expr`이 참조면, 참조 부분을 무시
2. 참조를 무시한 후, `expr`이 const면 const도 무시
3. volatile이면 그것도 무시

```cpp
template<typename T>
void f(T param);     // param은 값 전달

int x = 27;
const int cx = x;
const int& rx = x;

f(x);   // T와 param의 타입 모두 int
f(cx);  // T와 param의 타입 모두 int (const 무시됨!)
f(rx);  // T와 param의 타입 모두 int (const와 참조 무시됨!)
```

**중요:** const는 무시되지만, const 포인터가 가리키는 대상의 const는 유지됩니다:

```cpp
const char* const ptr = "Fun with pointers";

f(ptr);  // param의 타입은 const char*
         // 포인터 자체의 const는 무시되지만,
         // 가리키는 대상의 const는 유지됨
```

## 배열 인수

배열은 특별한 처리가 필요합니다:

```cpp
const char name[] = "J. P. Briggs";  // 타입: const char[13]

template<typename T>
void f(T param);

f(name);  // T는 const char*로 추론 (배열이 포인터로 decay)

template<typename T>
void f(T& param);

f(name);  // T는 const char[13]으로 추론!
          // param의 타입은 const char(&)[13]
```

이를 활용하면 컴파일 타임에 배열 크기를 구할 수 있습니다:

```cpp
template<typename T, std::size_t N>
constexpr std::size_t arraySize(T (&)[N]) noexcept {
    return N;
}

int keyVals[] = { 1, 3, 5, 7, 9, 11, 22, 35 };
std::array<int, arraySize(keyVals)> mappedVals;
```

## 함수 인수

함수도 함수 포인터로 decay됩니다:

```cpp
void someFunc(int, double);

template<typename T>
void f1(T param);

template<typename T>
void f2(T& param);

f1(someFunc);  // param은 함수 포인터: void(*)(int, double)
f2(someFunc);  // param은 함수 참조: void(&)(int, double)
```

## 핵심 정리

1. **참조 파라미터**: expr의 참조성은 무시되지만, const는 타입 추론에 포함됨
2. **보편 참조 파라미터**: lvalue는 특별하게 처리되어 T가 참조 타입으로 추론됨
3. **값 전달 파라미터**: const와 volatile이 무시됨 (포인터가 가리키는 대상의 const는 유지)
4. **배열과 함수**: 참조가 아닌 파라미터에서는 포인터로 decay됨

템플릿 타입 추론을 이해하면 `auto`, `decltype`, 그리고 Modern C++의 많은 기능들을 더 잘 활용할 수 있습니다.