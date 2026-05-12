---
title: "항목 22: 컴파일 타임에 계산할 수 있는 값은 constexpr를 사용하라"
date: 2026-05-10T11:00:00
description: "런타임 비용 0의 컴파일 타임 계산을 활용하는 법"
tags: [C++, constexpr, consteval]
series: "Beautiful C++"
seriesOrder: 22
draft: false
---


## 핵심 내용

- `constexpr`로 표시한 값/함수는 **가능하면 컴파일 타임에 평가**된다
- 런타임 비용 0, 상수 표현식이 필요한 곳(배열 크기, 템플릿 인자, `switch` 라벨)에 그대로 사용 가능
- `const`는 "수정 못 함"일 뿐, **컴파일 타임 계산을 보장하지 않는다**
- C++20부터 `consteval`(반드시 컴파일 타임), `constinit`(정적 초기화 보장)도 활용
- 마법 숫자를 `#define` 대신 `constexpr` 변수로 바꾸면 타입·스코프·디버깅 모두 좋아진다

## 예제 코드

```cpp
// Bad: #define 또는 단순 const
#define MAX_USERS 100
const int max_users = 100;          // 컴파일 타임 보장 X (상황에 따라)

// Good: constexpr — 컴파일 타임 상수가 보장됨
constexpr int MaxUsers = 100;

constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

constexpr int sz = factorial(5);    // 컴파일 타임에 120
int arr[sz];                        // 배열 크기로 사용 가능

// C++20: 강제 컴파일 타임
consteval int square(int n) { return n * n; }
constexpr int x = square(7);        // OK
// int y = square(runtime_value);   // 컴파일 에러
```

## 정리

런타임에 안 변하는 값과 계산은 **`constexpr`**로 옮겨라. 성능·타입 안전성·표현력이 동시에 좋아진다.
