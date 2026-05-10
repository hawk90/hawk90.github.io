---
title: "항목 7: 다형성 base 클래스에는 가상 소멸자를 선언하라"
date: 2025-02-02T12:00:00
description: "non-virtual 소멸자가 부분 파괴(UB)를 일으키는 메커니즘."
tags: [C++, Effective C++, Inheritance, Virtual]
series: "Effective C++"
seriesOrder: 7
draft: true
---

> **초안** — 정리 진행 중

## 개요

base 포인터로 derived 객체를 `delete`할 때, base 소멸자가 non-virtual이면 derived 부분이 소멸되지 않아 **부분 파괴**(partial destruction) — UB·자원 누수.

## 함정 예제

```cpp
class TimeKeeper {
public:
    ~TimeKeeper() {}     // non-virtual!
};

class AtomicClock : public TimeKeeper {
    BigClock* clockData;
public:
    ~AtomicClock() { delete clockData; }
};

TimeKeeper* p = new AtomicClock;
delete p;    // TimeKeeper의 소멸자만 호출!
             // AtomicClock 부분 + clockData 누수
```

## 해결 — virtual 소멸자

```cpp
class TimeKeeper {
public:
    virtual ~TimeKeeper() {}    // virtual
};
```

이제 `delete p`가 동적으로 derived의 소멸자를 호출 → 정상 파괴.

## "다형성 base 클래스"란?

base 포인터/참조를 통해 derived 객체를 다형적으로 사용할 의도가 있는 클래스. 그렇지 않은 클래스(예: standalone utility class, mixin)는 **virtual 소멸자 불필요**.

## non-virtual 소멸자의 비용

객체에 vtable 포인터(보통 4 또는 8 byte) 추가. 작은 POD-like 타입이라면 부피가 늘어 효율 악화.

```cpp
class Point {
    int x, y;     // 8 byte
public:
    virtual ~Point() {}   // → 객체가 16 byte (vtable ptr 추가)
};
```

다형성 의도가 없는 클래스에 virtual 소멸자를 무지성으로 추가하지 말 것.

## 추상 base 클래스에서 패턴

```cpp
class AWOV {     // Abstract Without Other Virtuals
public:
    virtual ~AWOV() = 0;     // pure virtual 소멸자
};

AWOV::~AWOV() {}    // 그러나 정의 필수 — derived 소멸자가 부를 것이므로
```

소멸자만으로 추상 클래스를 만들고 싶을 때 사용.

## 핵심 정리

1. 다형성 base 클래스 = **virtual 소멸자**
2. 그렇지 않은 클래스에는 추가하지 말 것 (vtable 비용)
3. base 포인터로 derived `delete` 시 non-virtual은 UB
4. pure virtual 소멸자도 정의 필수 (derived가 호출)
