---
layout: post
title: "항목 2: auto의 타입 추론 규칙을 이해하라"
date: 2025-01-05
categories: [C++, Effective Modern C++]
tags: [C++, auto, Type Deduction]
---

## 개요

좋은 소식! `auto` 타입 추론은 템플릿 타입 추론과 거의 같습니다. 항목 1을 이해했다면 이미 대부분을 아는 셈이죠. 하지만 한 가지 특별한 예외가 있습니다.

## auto = 템플릿 타입 추론 (거의)

`auto`를 사용하면 컴파일러가 템플릿처럼 타입을 추론합니다:

```cpp
auto x = 27;        // int
const auto cx = x;  // const int
const auto& rx = x; // const int&

// 이건 마치 이런 템플릿과 같습니다:
template<typename T>
void func_for_x(T param);   // auto x = 27과 같은 추론

template<typename T>
void func_for_cx(const T param);  // const auto cx = x와 같은 추론

template<typename T>
void func_for_rx(const T& param); // const auto& rx = x와 같은 추론
```

## auto와 템플릿의 세 가지 경우

항목 1에서 배운 세 가지 경우가 그대로 적용됩니다:

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

### 경우 3: auto만 (값 복사)

```cpp
auto v1 = x;   // int (const 무시)
auto v2 = cx;  // int (const 무시)
auto v3 = rx;  // int (참조와 const 모두 무시)
```

## 특별한 예외: 중괄호 초기화

**여기가 템플릿과 다른 유일한 부분입니다!**

```cpp
// C++11/14에서
auto x1 = 27;      // int
auto x2(27);       // int
auto x3 = {27};    // std::initializer_list<int> (!)
auto x4{27};       // std::initializer_list<int> (!)

// C++17부터
auto x3 = {27};    // std::initializer_list<int>
auto x4{27};       // int (바뀜!)
```

**템플릿은 중괄호를 추론할 수 없습니다:**

```cpp
template<typename T>
void f(T param);

f({11, 23, 9});    // 에러! T를 추론할 수 없음

// 하지만 auto는 가능
auto x = {11, 23, 9};  // std::initializer_list<int>
```

**실제 사용 시 주의사항:**

```cpp
// 실수하기 쉬운 경우
std::vector<int> v;
auto resetV = [&v](const auto& newValue) {
    v = newValue;  // newValue가 뭘까요?
};

resetV({1, 2, 3});  // 에러! auto는 중괄호 추론 불가

// 해결책: std::initializer_list를 명시
auto resetV = [&v](std::initializer_list<int> newValue) {
    v = newValue;
};
```

## 함수 반환 타입에서의 auto

C++14부터 함수 반환 타입에 `auto`를 쓸 수 있지만, 여기서는 **템플릿 타입 추론**을 사용합니다:

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

## 람다에서의 auto

C++14 람다 매개변수에서도 마찬가지:

```cpp
// C++14
auto lambda = [](const auto& x) { /* ... */ };

// 이건 템플릿과 같음
class Lambda {
    template<typename T>
    void operator()(const T& x) const { /* ... */ }
};

// 따라서
lambda({1, 2, 3});  // 에러! 중괄호 추론 불가
```

## 정리하면

**auto 타입 추론 = 템플릿 타입 추론**
단 하나의 예외: **중괄호 초기화는 std::initializer_list로 추론**

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
   auto x = {1};   // std::initializer_list<int> - 의도한 건가요?
   int x = {1};    // int - 아마 이걸 원했을 듯
   ```

2. **C++17 변경사항 인지**
   ```cpp
   auto x{1};      // C++11/14: std::initializer_list<int>
                   // C++17: int
   ```

3. **함수 반환/람다는 템플릿 규칙**
   ```cpp
   auto f() { return {1, 2, 3}; }  // 에러!
   // 템플릿 타입 추론이므로 중괄호 불가
   ```

auto는 편리하지만 중괄호 초기화의 함정을 조심하세요!