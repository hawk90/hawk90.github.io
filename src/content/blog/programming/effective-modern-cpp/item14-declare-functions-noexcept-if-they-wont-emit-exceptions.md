---
title: "항목 14: 예외를 방출하지 않을 함수는 noexcept로 선언하라"
date: 2025-01-06T17:00:00
description: "noexcept가 인터페이스 계약과 최적화에 미치는 영향, 그리고 move 연산과의 관계."
tags: [C++, noexcept, Exception, Modern C++]
series: "Effective Modern C++"
seriesOrder: 14
draft: true
---

> **초안** — 정리 진행 중

## 개요

`noexcept`는 단순 문서 주석이 아니라 **컴파일러가 활용하는 인터페이스 계약**입니다. 표준 라이브러리는 함수가 `noexcept`인지에 따라 다른 알고리즘을 선택하기도 합니다 — 특히 `vector::push_back`의 강력한 예외 보증.

## `noexcept`가 의미하는 것

```cpp
int f(int x) throw();    // C++98 — deprecated
int f(int x) noexcept;   // C++11 — 권장
```

`noexcept` 함수가 예외를 던지면 `std::terminate`가 호출됩니다. 컴파일러는 이를 알기에:

- **stack unwinding 코드 생성을 생략** → 코드 크기·속도 이득
- **호출자에서 예외 처리 분기 제거** → 인라인·최적화 더 적극적

## move 연산과 `vector`의 강력한 예외 보증

`vector::push_back`이 재할당할 때, 기존 원소를 새 메모리로 옮겨야 합니다. C++11 이전엔 복사밖에 없어 안전했지만, move는 한 번 실패하면 원본도 소실됩니다.

표준 라이브러리는 다음 규칙을 씁니다:

- move 생성자가 **`noexcept`이면 → move 사용**
- 그렇지 않으면 → **copy 사용** (예외 시 원본 유지 가능)

```cpp
class Widget {
    Widget(Widget&&) noexcept;          // ← noexcept → vector가 move 사용
    Widget(const Widget&);
};
```

`noexcept`가 빠지면 vector는 move를 포기하고 copy를 선택해, 잠재적 성능 손실이 큽니다.

## 항상 `noexcept`로 보장 가능한 함수

- 메모리 해제 함수 (`operator delete`, `delete []`)
- 소멸자 (C++11부터 기본 `noexcept`)
- 단순 정수·포인터 산술

## 조건부 `noexcept`

함수의 noexcept 여부가 다른 표현식에 의존할 때.

```cpp
template<typename T>
void swap(T& a, T& b) noexcept(noexcept(T(std::move(a))) &&
                               noexcept(a = std::move(b)));
```

복잡해 보이지만 의미는 "이 안에서 호출하는 연산이 모두 noexcept면 이 함수도 noexcept".

## 주의

- `noexcept`는 **인터페이스 계약** — 한번 약속하면 깨기 어려움 (사용자가 의존)
- 정말 던지지 않을 함수에만 사용
- 의심스러우면 붙이지 않는 게 안전

## 핵심 정리

1. `noexcept`는 최적화 + 라이브러리 동작 분기점
2. move 생성자/대입은 가능하면 `noexcept` (vector 성능)
3. 소멸자는 자동 `noexcept` (C++11+)
4. 한번 약속한 `noexcept`는 깨기 어려움 — 신중히
