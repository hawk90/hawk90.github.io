---
title: "항목 8: 0과 NULL보다 nullptr를 선호하라"
date: 2025-01-05T08:00:00
description: "nullptr가 왜 안전하고, 0과 NULL은 어떤 미묘한 함정을 만드는지 — 오버로드와 템플릿."
tags: [C++, nullptr, Modern C++]
series: "Effective Modern C++"
seriesOrder: 8
draft: true
---

## 왜 이 항목이 중요한가?

`0`과 `NULL`은 코드에 너무 자연스럽게 녹아 있어서, 이게 함정이라는 사실조차 인식하기 어렵다. 그런데 두 가지 자리에서 조용히 잘못된 함수가 호출된다.

- **오버로드** — `f(int)`와 `f(void*)` 중 `f(0)`은 무조건 `f(int)`로 간다.
- **템플릿 추론** — 템플릿은 암묵 변환을 하지 않으므로 `template<typename T> f(T)`에 `0`을 넘기면 `T = int`로 추론되어 포인터 매칭이 실패한다.

C++11의 `nullptr`는 별도 타입(`std::nullptr_t`)을 가지고 있어 이 모호함이 없다. 이 항목은 그 차이를 정확히 짚는다.

## 개요

`0`과 `NULL`은 **정수 타입**이다. 포인터 타입이 아니다. 컴파일러가 문맥상 포인터로 변환해 주지만, **오버로드 해석**과 **템플릿 추론**에서는 종종 의도와 다른 함수가 호출된다. C++11의 `nullptr`는 진짜 포인터 의미를 가진 별도 타입(`std::nullptr_t`)이라 이런 모호함이 없다.

## 필수 개념: `0`, `NULL`, `nullptr`의 정확한 타입

> **초보자를 위한 배경 지식**

<br>

### `0`의 타입

`0`은 **`int`** 타입의 정수 리터럴이다. C++의 특수 규칙으로 "널 포인터 상수"로 변환 가능하지만 본 타입은 정수다.

### `NULL`의 정의

`NULL`의 정의는 **구현 정의**다. C와 C++가 다르고, 컴파일러마다도 다르다.

```cpp
// 흔한 구현 중 하나
#define NULL 0           // C++ 옛 컴파일러
#define NULL ((void*)0)  // C 표준
#define NULL nullptr     // C++11+ 일부 구현
```

Linux의 `<cstddef>`에서 보통 이렇다.

```cpp
#ifdef __cplusplus
    #define NULL 0
#else
    #define NULL ((void*)0)
#endif
```

C++에선 `NULL`이 보통 `0` (정수)이다. 일부 컴파일러는 `0L`(long)을 쓴다.

### `nullptr`의 타입

`nullptr`는 **`std::nullptr_t`** 타입의 prvalue다. 이 타입은 다음 성질을 가진다.

- **모든 포인터 타입으로 암묵 변환** 가능 (raw, member, function 포인터 모두).
- **정수 타입과는 변환되지 않는다.**
- 인스턴스가 하나뿐이다. `nullptr`.

```cpp
int*           p1 = nullptr;     // OK
void (*fn)()   = nullptr;        // OK — 함수 포인터
int Widget::*  m  = nullptr;     // OK — 멤버 포인터
std::shared_ptr<Widget> sp = nullptr;   // OK — smart pointer

int n = nullptr;     // 에러! nullptr_t → int 변환 불가
bool b = nullptr;    // 에러
```

## `0`과 `NULL`의 함정 — 오버로드

### 단순 오버로드

```cpp
void f(int);
void f(bool);
void f(void*);

f(0);        // f(int) — int 정확히 매칭
f(NULL);     // 구현에 따라 다름:
             //   NULL == 0  → f(int)
             //   NULL == 0L → f(int) — long → int 변환
             //   NULL == ((void*)0) → C++에선 보통 컴파일 에러
f(nullptr);  // f(void*) — nullptr_t → void* 자연스러운 변환
```

포인터 의도였더라도 `0`/`NULL`은 정수 함수로 간다.

### 실제 시나리오

```cpp
class Widget;
int  findRecord(int recordId);     // (a)
void findRecord(Widget* widget);   // (b) — 같은 이름 오버로드

findRecord(0);        // (a) 호출 — recordId=0
findRecord(nullptr);  // (b) 호출 — Widget* 인자
```

`0`을 "널 포인터 의도"로 썼다면 함수가 잘못 불린다.

## 템플릿 추론에서 더 위험

### 단순 함수 호출 시는 변환이 일어남

```cpp
void process(Widget* w);

process(0);       // OK — 0이 Widget*로 변환된다
process(NULL);    // OK
process(nullptr); // OK
```

위는 모두 동작한다. 함수 호출 시점에 컴파일러가 변환을 해 주기 때문이다.

### 템플릿 매개변수 추론 시 변환 안 됨

```cpp
template<typename FuncType, typename PtrType>
auto call(FuncType f, PtrType p) -> decltype(f(p)) {
    return f(p);
}

void process(Widget* w);

call(process, 0);        // 에러! PtrType = int로 추론 → process(int) 없음
call(process, NULL);     // 에러! 마찬가지 (NULL이 0이면 PtrType = int)
call(process, nullptr);  // OK — PtrType = nullptr_t → process(Widget*) 매칭
```

**왜 다른가?** 템플릿 추론은 인자의 본 타입을 그대로 받는다. 변환이 일어나지 않는다. `0`은 `int`로 추론된다.

이게 **lock-free 자료구조**, **mutex API** 등 템플릿 wrapping이 흔한 코드에서 골치다.

```cpp
std::mutex f1m, f2m;

using Locker = std::unique_lock<std::mutex>;

bool doSomething(Locker, Widget*);   // 함수

// 잘못된 사용
auto fact1 = std::async([] {
    Locker l(f1m);
    return doSomething(std::move(l), 0);   // 일반 호출 — 0이 변환됨, OK
});

// 그러나 template wrapping은:
template<typename F, typename Ptr>
auto invokeWith(F f, std::mutex& m, Ptr p) {
    Locker l(m);
    return f(std::move(l), p);
}

invokeWith(doSomething, f1m, 0);        // 에러
invokeWith(doSomething, f1m, nullptr);  // OK
```

## `nullptr`의 추가 이점

### 1. 코드 가독성

```cpp
auto result = findRecord(/* ... */);
if (result == 0) { /* ... */ }       // result가 정수? 포인터? 모호
if (result == nullptr) { /* ... */ }  // 명백히 포인터 비교
```

### 2. `auto`와 잘 어울림

```cpp
auto result = findRecord(/* ... */);
if (result == 0) { /* ... */ }   // result가 무엇인지 모르면 의미 모호

if (result == nullptr) { /* ... */ }   // 분명히 포인터
```

### 3. 함수 포인터·멤버 포인터 일관

```cpp
// raw pointer
int* p = nullptr;

// 함수 포인터
typedef void (*Callback)(int);
Callback cb = nullptr;

// 멤버 포인터
int Widget::*member = nullptr;

// smart pointer
std::shared_ptr<int> sp = nullptr;
std::unique_ptr<int> up{nullptr};
```

모두 같은 nullptr다. 일관성이 있다.

## `nullptr_t`의 활용

함수가 명시적으로 "널 포인터만 받음"을 표현할 수 있다.

```cpp
class Widget {
public:
    Widget(std::nullptr_t) {}   // 명시적으로 nullptr만
    Widget(Widget*) = delete;   // raw pointer 차단
};

Widget w1(nullptr);   // OK
Widget w2(somePtr);   // 에러
```

## C++ Standard에서의 정확한 정의 (요약)

- `nullptr`는 `std::nullptr_t` 타입의 prvalue (Section 7.6.2.1).
- `nullptr_t`는 다음으로 변환 가능하다.
  - 모든 포인터 타입 (object, function, member).
  - bool (`if (nullptr)` → false).
- 다음으로는 변환 **불가**하다.
  - 정수 타입 (`int`, `long`, `char` 등).
  - 실수 타입.

## 마이그레이션 — `0`/`NULL` → `nullptr`

기존 코드의 `0`을 모두 `nullptr`로 바꾸는 게 **항상 안전한가?**

**보통 안전하지만**, 다음을 확인해야 한다.

- `0`이 진짜 정수 0 의미였다면 (카운터, 인덱스, 산술) → 그대로 둔다.
- `0`이 포인터·핸들·함수 포인터 의미였다면 → `nullptr`로 바꾼다.
- 매크로 `NULL`이 정수 0 의미로 쓰인 자리 → 거의 없으나 검토한다.

```cpp
// 정수 0 — 그대로
int count = 0;
for (int i = 0; i < n; ++i) ...

// 포인터 0 → nullptr
Widget* w = 0;          // → nullptr
Widget* w = NULL;       // → nullptr
*p = 0;                 // 포인터에 0 할당이면 → nullptr
                        // 정수 멤버에 0이면 그대로
```

## 핵심 정리

1. `0`과 `NULL`은 **정수 타입**이다. 포인터 의미가 약하고 오버로드/템플릿에서 함정이 된다.
2. `nullptr`는 **`std::nullptr_t`** 타입이다. 포인터로만 변환되며 모호함이 없다.
3. **단순 호출**에선 `0`/`NULL`도 변환되지만, **템플릿 추론**에선 변환되지 않는다.
4. `0`/`NULL` 코드의 `0`이 포인터 의미라면 `nullptr`로 마이그레이션한다.
5. 가독성, `auto` 호환, 함수 포인터 등 일관성이 모두 향상된다.

## 관련 항목

- [항목 1: 템플릿 타입 추론](/blog/programming/cpp/effective-modern-cpp/item01-understand-template-type-deduction) — 템플릿 추론은 변환을 거의 하지 않는다
- [항목 7: 객체 생성 시 ()와 {}를 구분하라](/blog/programming/cpp/effective-modern-cpp/item07-distinguish-paren-and-brace-when-creating-objects) — `Widget(std::nullptr_t)` 같은 패턴과 초기화 문법
- [항목 27: 보편 참조 오버로딩 대안](/blog/programming/cpp/effective-modern-cpp/item27-familiarize-yourself-with-alternatives-to-overloading-on-universal-references) — 오버로드 함정의 일반화
