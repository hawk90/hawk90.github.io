---
title: "항목 12: 객체의 모든 부분을 복사하라"
date: 2025-02-02T17:00:00
description: "복사 함수에서 base 부분과 새로 추가된 멤버를 빠뜨리지 않는 법."
tags: [C++, Effective C++, Copy Constructor]
series: "Effective C++"
seriesOrder: 12
draft: true
---

> **초안** — 정리 진행 중

## 개요

복사 생성자와 복사 대입 연산자를 직접 작성하면, **모든 멤버**와 **base 클래스 부분**을 복사해야 합니다. 멤버를 추가했는데 복사 함수를 안 업데이트하면 컴파일러는 경고하지 않고 **부분 복사**가 발생합니다.

## 함정 — 새 멤버 추가 후

```cpp
class Customer {
    std::string name;
public:
    Customer(const Customer& rhs) : name(rhs.name) {}
    Customer& operator=(const Customer& rhs) {
        name = rhs.name;
        return *this;
    }
};

// 나중에 멤버 추가
class Customer {
    std::string name;
    Date lastTransaction;     // 새 멤버
public:
    // 복사 함수는 그대로 — lastTransaction 복사 빠짐!
    // 컴파일러는 침묵
};
```

## 함정 — 상속 시 base 부분

```cpp
class PriorityCustomer : public Customer {
    int priority;
public:
    PriorityCustomer(const PriorityCustomer& rhs)
        : priority(rhs.priority) {}     // Customer 부분 복사 누락!
                                        // Customer의 기본 생성자가 호출됨
    PriorityCustomer& operator=(const PriorityCustomer& rhs) {
        priority = rhs.priority;        // Customer::operator= 호출 누락!
        return *this;
    }
};
```

## 해결

```cpp
class PriorityCustomer : public Customer {
public:
    PriorityCustomer(const PriorityCustomer& rhs)
        : Customer(rhs),                // base 명시적 호출
          priority(rhs.priority) {}

    PriorityCustomer& operator=(const PriorityCustomer& rhs) {
        Customer::operator=(rhs);        // base 명시적 호출
        priority = rhs.priority;
        return *this;
    }
};
```

## 복사 생성자와 복사 대입 사이의 코드 중복

비슷한 코드가 두 번 등장하는데, **하나가 다른 하나를 호출하지 말 것** (논리적으로 어색하고 잠재적 버그). 공통 로직을 `private` 멤버 함수(예: `init()`)로 추출.

```cpp
class Widget {
    void init();   // 공통 초기화

    Widget(const Widget& rhs) { init(); /* 복사 로직 */ }
    Widget& operator=(const Widget& rhs) { /* 자기대입 처리 + 복사 */ return *this; }
};
```

## 핵심 정리

1. 복사 함수는 모든 멤버를 복사
2. 멤버 추가 시 복사 함수도 업데이트
3. 상속 시 base 부분도 명시적으로 복사 (`Base(rhs)`, `Base::operator=(rhs)`)
4. 복사 생성자와 복사 대입 사이 공통 로직은 `private init()`으로 추출
