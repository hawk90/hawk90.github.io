---
title: "항목 18: 독점 소유 자원 관리에는 std::unique_ptr를 사용하라"
date: 2025-01-07T10:00:00
description: "unique_ptr의 사용법, 커스텀 deleter, 그리고 팩토리 함수 패턴."
tags: [C++, Smart Pointer, unique_ptr, Modern C++]
series: "Effective Modern C++"
seriesOrder: 18
draft: true
---

> **초안** — 정리 진행 중

## 개요

`std::unique_ptr`는 **독점 소유**(exclusive ownership)를 표현하는 스마트 포인터입니다. 일반 포인터와 거의 같은 크기·속도이면서 자동 해제를 보장합니다. **팩토리 함수의 기본 반환 타입**으로 가장 적합합니다.

## 기본 사용

```cpp
auto p = std::make_unique<Widget>(args...);   // 권장
std::unique_ptr<Widget> q(new Widget(args...)); // 동등하지만 권장 X (item 21)

p->doSomething();
*p = something;
// p가 스코프를 벗어나면 자동으로 delete
```

## 독점 소유의 의미

- **복사 불가**: copy 생성자/대입 = `delete`
- **이동 가능**: 소유권을 다른 unique_ptr로 넘김

```cpp
auto p1 = std::make_unique<Widget>();
auto p2 = p1;            // 에러! 복사 불가
auto p3 = std::move(p1); // OK — p1은 nullptr
```

## 팩토리 함수 패턴

```cpp
template<typename... Ts>
std::unique_ptr<Investment> makeInvestment(Ts&&... params);

auto inv = makeInvestment(/* ... */);
inv->doStuff();
// 자동 해제
```

`shared_ptr`로 바꾸기도 쉬움 — `unique_ptr`는 `shared_ptr`로 암묵 변환됩니다.

## 커스텀 deleter

```cpp
auto delInv = [](Investment* p) {
    log_destroy(p);
    delete p;
};

std::unique_ptr<Investment, decltype(delInv)> inv(new Stock(...), delInv);
```

deleter 타입이 unique_ptr 타입의 일부가 되므로 시그니처가 길어집니다. 람다 deleter는 캡처 없으면 객체 크기 영향 없음.

## 배열 버전

```cpp
std::unique_ptr<int[]> arr(new int[10]);   // T[] 특수화
arr[0] = 1;                                 // operator[]
```

다만 `std::array`, `std::vector` 같은 표준 컨테이너가 거의 항상 더 나은 선택.

## 핵심 정리

1. 독점 소유 RAII의 표준 도구
2. 일반 포인터와 거의 동일한 비용
3. `make_unique`(C++14)로 생성, `unique_ptr<T> p(new T)`는 피하기 (item 21)
4. `shared_ptr`로 한 줄 변환 가능 — 팩토리 반환 타입으로 적합
5. 커스텀 deleter는 타입에 박힘 — 시그니처 주의
