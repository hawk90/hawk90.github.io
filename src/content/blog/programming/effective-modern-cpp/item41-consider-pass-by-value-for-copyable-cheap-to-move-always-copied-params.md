---
title: "항목 41: 복사 가능하고 이동 비용이 저렴하며 항상 복사되는 매개변수는 값 전달을 고려하라"
date: 2025-01-11T10:00:00
description: "pass by value + std::move 패턴이 lvalue/rvalue 오버로드보다 나은 시점."
tags: [C++, Performance, Move Semantics, Modern C++]
series: "Effective Modern C++"
seriesOrder: 41
draft: true
---

> **초안** — 정리 진행 중

## 개요

setter나 멤버에 저장하는 함수에서, **lvalue/rvalue 오버로드 두 개**를 작성하는 대신 **값 전달 + `std::move`** 한 함수로도 충분히 효율적입니다. 단, 조건이 있습니다.

## 세 가지 후보 패턴

### A. lvalue/rvalue 오버로드

```cpp
class Widget {
    std::vector<std::string> names;
public:
    void addName(const std::string& n) { names.push_back(n); }       // lvalue: copy
    void addName(std::string&& n)      { names.push_back(std::move(n)); } // rvalue: move
};
```

**장점**: 최적의 성능 (각 카테고리에 맞는 연산)
**단점**: 함수 두 개 — 본문 중복, 유지보수 비용

### B. 보편 참조

```cpp
template<typename T>
void addName(T&& n) { names.push_back(std::forward<T>(n)); }
```

**장점**: 함수 하나, 효율적
**단점**: 헤더에 노출되어야 함, 오버로드 함정(항목 26), 컴파일 시간 증가

### C. 값 전달 + `std::move`

```cpp
void addName(std::string n) { names.push_back(std::move(n)); }
```

**장점**: 함수 하나, 단순, 직관적
**단점**: lvalue 호출 시 추가 move 한 번 (copy + move)

## 비교 (`addName` 호출 비용)

| 호출 형태 | A. 오버로드 | B. 보편 참조 | C. by-value |
| --- | --- | --- | --- |
| `addName("hi")` (rvalue) | move 1회 | move 1회 | move 1회 |
| `addName(s)` (lvalue) | copy 1회 | copy 1회 | **copy 1회 + move 1회** |

C는 lvalue 호출에서 move 한 번이 추가 — 그러나 `string` 같은 move-cheap 타입에선 미미.

## 사용 권장 조건

다음 모두를 만족할 때 C가 가장 단순하고 충분히 효율적:

1. **복사 가능**한 타입 (move-only는 by-value가 사실상 강제 move라 의미 다름)
2. **이동 비용이 저렴**할 것 (string, vector 등)
3. 함수가 매개변수를 **항상 복사/저장**할 것 (조건부면 불필요한 작업)

조건부 복사라면 C는 손해 — 무조건 한 번 복사가 일어나기 때문.

## 함정 — 슬라이싱

```cpp
class Base { /* ... */ };
class Derived : public Base { /* ... */ };

void process(Base b);   // by-value!

Derived d;
process(d);             // 슬라이싱! Derived 정보 손실
```

다형성 타입에는 by-value 절대 금지.

## 핵심 정리

1. setter 패턴에서 lvalue/rvalue 오버로드는 by-value + `std::move`로 단순화 가능
2. 단, **복사 가능 + move 저렴 + 항상 복사** 조건 충족 시
3. lvalue 호출 시 추가 move 한 번이 비용 — 보통 미미
4. 다형성 타입은 절대 by-value 금지
