---
title: "항목 38: composition으로 'has-a'나 'is-implemented-in-terms-of'를 모델링하라"
date: 2025-02-06T16:00:00
description: "composition의 두 의미 — 어플리케이션 도메인의 has-a, 구현 도메인의 implementation."
tags: [C++, Effective C++, Composition]
series: "Effective C++"
seriesOrder: 38
draft: true
---

> **초안** — 정리 진행 중

## 개요

composition(다른 클래스의 객체를 멤버로 보유)은 두 가지 의미:

- **어플리케이션 도메인**: has-a (Person *has-a* Address)
- **구현 도메인**: is-implemented-in-terms-of (Set *is implemented in terms of* List)

상속(IS-A)과 명확히 구분해 사용해야 합니다.

## has-a 예제

```cpp
class Address { /* ... */ };
class Phone   { /* ... */ };

class Person {
    std::string name;
    Address     addr;       // Person has-a Address
    Phone       phone;      // Person has-a Phone
};
```

자연스러운 모델링.

## is-implemented-in-terms-of 예제

`Set`을 `List`로 구현하고 싶다고 IS-A 상속을 쓰면 LSP 위반(set은 중복 X, list는 중복 OK).

```cpp
// 잘못 — IS-A 상속
template<typename T>
class Set : public std::list<T> { /* ... */ };

// 올바름 — composition으로 위임
template<typename T>
class Set {
    std::list<T> rep;
public:
    bool member(const T& item) const {
        return std::find(rep.begin(), rep.end(), item) != rep.end();
    }
    void insert(const T& item) {
        if (!member(item)) rep.push_back(item);
    }
    // ...
};
```

`Set`은 `List`가 아니지만 내부에서 활용. composition으로 정확히 표현.

## 결정 트리

- 둘이 IS-A 관계? → public 상속
- has-a 또는 implementation 관계? → composition
- IS-A 인데 일부만 노출? → private 상속 (item 39)

## 핵심 정리

1. composition = has-a (도메인) 또는 is-implemented-in-terms-of (구현)
2. 상속(IS-A)과 혼동하지 말 것
3. 의심되면 composition — 결합도 낮음, LSP 위반 위험 없음
