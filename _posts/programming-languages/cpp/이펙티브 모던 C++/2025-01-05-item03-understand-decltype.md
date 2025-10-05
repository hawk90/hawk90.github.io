---
layout: post
title: "항목 3: decltype의 작동 방식을 이해하라"
date: 2025-01-05
categories: [C++, Effective Modern C++]
tags: [C++, decltype, Type Deduction]
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

**규칙:**
- **이름**에 대한 decltype → 선언된 타입
- **표현식**에 대한 decltype → lvalue면 T&, rvalue면 T

```cpp
decltype(auto) f1() {
    int x = 0;
    return x;     // decltype(x) → int
}

decltype(auto) f2() {
    int x = 0;
    return (x);   // decltype((x)) → int& (지역 변수 참조!)
}
```

**위험한 실수:**
```cpp
decltype(auto) dangerous() {
    int x = 0;
    return (x);  // int& 반환 - 지역 변수의 참조!
}                // x는 소멸됨

int& ref = dangerous();  // 댕글링 참조!
ref = 10;               // 정의되지 않은 동작
```

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