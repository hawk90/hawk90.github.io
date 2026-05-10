---
title: "항목 40: 다중 상속을 신중하게 사용하라"
date: 2025-02-06T18:00:00
description: "ambiguity, diamond, virtual base — 다중 상속의 함정과 정당한 활용."
tags: [C++, Effective C++, Multiple Inheritance]
series: "Effective C++"
seriesOrder: 40
draft: true
---

> **초안** — 정리 진행 중

## 개요

다중 상속은 강력하지만 복잡성도 큽니다 — ambiguity, diamond, virtual base. 그러나 인터페이스 + 구현 분리 같은 정당한 패턴도 있습니다.

## 함정 1 — Ambiguity

```cpp
class A { public: void f(); };
class B { public: void f(); };
class C : public A, public B {};

C c;
c.f();           // 모호! A::f? B::f?
c.A::f();        // 명시 필요
```

이름이 같으면 컴파일러가 결정 못 함.

## 함정 2 — Diamond Inheritance

```cpp
class Person { /* name 등 */ };
class Student : public Person {};
class Athlete : public Person {};
class StudentAthlete : public Student, public Athlete {};
//                            \______/  \______/
//                             둘 다 Person 부분 가짐
//                             → StudentAthlete에 Person 데이터가 두 개
```

`StudentAthlete` 객체에 `Person` 데이터가 두 벌. `name`을 두 번 저장.

## 해결 — virtual 상속

```cpp
class Student : virtual public Person {};
class Athlete : virtual public Person {};
class StudentAthlete : public Student, public Athlete {};
//                                                  → Person 한 번만
```

`virtual` 상속으로 공유. 다만 비용 발생 (객체 크기 증가, 멤버 접근 간접).

## 정당한 활용 — 인터페이스 + 구현

```cpp
class IPerson {                                     // 추상 인터페이스
public:
    virtual ~IPerson() = default;
    virtual std::string name() const = 0;
};

class PersonInfo {                                   // 구현 helper (private)
protected:
    std::string getName() const;
};

class Person : public IPerson, private PersonInfo {  // 인터페이스 + 구현
public:
    std::string name() const override { return getName(); }
};
```

`IPerson`은 public IS-A, `PersonInfo`는 private 구현 위임. 다중 상속의 자연스러운 활용.

## 핵심 정리

1. 다중 상속은 단일 상속보다 복잡 — 신중히
2. ambiguity는 명시 호출로 해결, diamond는 virtual 상속
3. virtual 상속은 비용 — 꼭 필요할 때만
4. 인터페이스 + private 구현 패턴은 다중 상속의 정당한 활용
