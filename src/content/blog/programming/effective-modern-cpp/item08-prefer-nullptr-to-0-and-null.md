---
title: "항목 8: 0과 NULL보다 nullptr를 선호하라"
date: 2025-01-06T11:00:00
description: "nullptr가 왜 안전하고, 0과 NULL은 어떤 미묘한 함정을 만드는지."
tags: [C++, nullptr, Modern C++]
series: "Effective Modern C++"
seriesOrder: 8
draft: true
---

> **초안** — 정리 진행 중

## 개요

`0`과 `NULL`은 정수 타입입니다 — 포인터 타입이 아닙니다. 컴파일러가 문맥상 포인터로 변환해주지만, **오버로드 해석**과 **템플릿 추론**에서 종종 의도와 다른 함수가 호출됩니다. `nullptr`는 진짜 포인터 의미를 가진 별도 타입(`std::nullptr_t`)이라 이런 모호함이 없습니다.

## 0과 NULL의 함정

```cpp
void f(int);
void f(bool);
void f(void*);

f(0);      // f(int) 호출 — 포인터 의도였더라도
f(NULL);   // 구현 정의: 보통 f(int) 또는 모호함 에러
f(nullptr); // f(void*) 호출 — 명확
```

`NULL`의 정의는 구현에 따라 `0`, `0L`, `(void*)0` 등이라 동작이 일정하지 않습니다.

## 템플릿 추론에서 더 위험

```cpp
template<typename FuncType, typename PtrType>
auto call(FuncType f, PtrType p) -> decltype(f(p)) {
    return f(p);
}

void process(Widget* w);

call(process, 0);        // 에러! 0은 int로 추론 → process(int) 없음
call(process, NULL);     // 에러! 마찬가지
call(process, nullptr);  // OK: nullptr_t → Widget* 변환
```

추론 단계에서는 "필요하면 포인터로 변환"이 적용되지 않아 `0`/`NULL`이 그대로 정수 타입으로 박힙니다.

## `nullptr`의 정확한 타입

`nullptr`는 `std::nullptr_t` 타입의 prvalue입니다. 이 타입은 **모든 포인터 타입(원시·멤버·함수 포인터)으로 암묵 변환** 가능하지만 정수 타입과는 변환되지 않습니다.

```cpp
int* p = nullptr;             // OK
void (*fn)() = nullptr;       // OK
int Widget::*member = nullptr;// OK
int n = nullptr;              // 에러 — 정수로 변환 안 됨
```

## 핵심 정리

1. `0`과 `NULL`은 정수 타입 — 포인터 의미가 약하고 오버로드/템플릿에서 함정
2. `nullptr`는 `std::nullptr_t` 타입 — 포인터로만 변환되며 모호함 없음
3. 코드 가독성도 향상 — "여기는 포인터"라는 의도가 명확
