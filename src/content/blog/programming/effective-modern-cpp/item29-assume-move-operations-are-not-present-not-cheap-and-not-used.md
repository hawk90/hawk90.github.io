---
title: "항목 29: 이동 연산이 없거나, 저렴하지 않거나, 사용되지 않는다고 가정하라"
date: 2025-01-08T16:00:00
description: "move semantics가 항상 성능 향상을 가져다주지 않는 이유."
tags: [C++, Move Semantics, Performance, Modern C++]
series: "Effective Modern C++"
seriesOrder: 29
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++11의 move semantics가 모든 곳에서 자동으로 성능을 올려준다는 인식은 **틀렸습니다**. 실제로는 다음 세 가지 이유로 효과가 없을 때가 많습니다.

## 1. 이동 연산이 없는 타입

C++98에 작성된 클래스, 또는 명시적으로 copy를 정의해 자동 move 생성이 막힌 클래스. (항목 17)

```cpp
class Legacy {
    Legacy(const Legacy&);    // 자동 move 막힘
    // move 생성자 없음 → std::move(legacy)는 copy로 떨어짐
};
```

표준 라이브러리에도 일부는 move가 단순 copy.

## 2. 이동이 copy보다 별로 안 빠른 경우

### 작은 객체

```cpp
std::array<int, 100> a, b;
b = std::move(a);   // 여전히 100개 정수 복사 — 힙 데이터가 없으니
```

`std::array`는 **요소가 배열로 객체 안에 직접 저장**되어 있어 이동도 결국 복사.

### SSO(Small String Optimization)된 string

```cpp
std::string s = "short";
auto t = std::move(s);   // 짧은 string은 SSO 버퍼 안에 있어 그냥 복사
```

힙 할당된 긴 string만 진짜 이동 효과를 봅니다.

## 3. move가 noexcept가 아닌 경우

`std::vector::push_back`이 재할당할 때, move 생성자가 `noexcept`이어야만 move를 사용 (항목 14). 그렇지 않으면 copy로 떨어짐.

```cpp
class Widget {
    Widget(Widget&&);   // noexcept 아님 → vector는 copy 사용
};
```

## 4. 호출자가 lvalue를 넘김

```cpp
template<typename T>
void process(T x);    // by-value

Widget w;
process(w);           // copy
process(std::move(w)); // move (호출자가 명시)
```

함수 내부에서 자동으로 move가 일어나는 게 아닙니다 — 호출자가 rvalue를 넘겨야 함.

## 결론

성능을 가정하지 말고 **측정하라**. 실제 사용 시나리오에서:

- 사용 중인 타입이 진짜 move semantics를 지원하는지
- move가 진짜 빠른지 (작은 객체라면 차이 없음)
- noexcept가 붙어 있는지
- 호출자가 rvalue를 보내는 시나리오인지

## 핵심 정리

1. C++11 타입이라도 move가 효율적이리란 보장 없음
2. 작은 객체·SSO·`std::array`는 move ≈ copy
3. `noexcept` 없으면 표준 컨테이너가 copy 선택
4. lvalue 인자에선 자동 move 안 됨 — 명시적 `std::move` 필요
