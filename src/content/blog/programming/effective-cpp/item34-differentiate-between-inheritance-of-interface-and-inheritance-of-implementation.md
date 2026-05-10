---
title: "항목 34: 인터페이스 상속과 구현 상속을 구분하라"
date: 2025-02-06T12:00:00
description: "pure virtual / virtual / non-virtual 함수가 각각 표현하는 의도."
tags: [C++, Effective C++, Inheritance, Virtual]
series: "Effective C++"
seriesOrder: 34
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++의 함수 종류는 base 클래스가 derived에 무엇을 강제·제공하는지 다른 의미를 가집니다:

- **pure virtual** — 인터페이스만 상속, 구현은 derived가 제공
- **simple virtual** — 인터페이스 상속 + 기본 구현 제공
- **non-virtual** — 인터페이스 상속 + 강제된 구현

## pure virtual

```cpp
class Shape {
public:
    virtual void draw() const = 0;
};
```

derived는 반드시 구현. 추상 클래스 — 인스턴스화 불가.

**팁**: pure virtual에도 정의를 둘 수 있음 — derived가 명시적으로 호출 가능.

```cpp
class Shape {
public:
    virtual void draw() const = 0;
};
void Shape::draw() const { /* 기본 동작 — 명시 호출 시만 */ }

class Circle : public Shape {
    void draw() const override { Shape::draw(); /* 추가 */ }
};
```

## simple virtual

```cpp
class Airplane {
public:
    virtual void fly(const Airport& dest) {
        // 기본 비행 로직
    }
};

class ModelC : public Airplane { /* fly 재정의 안 함 — 기본 사용 */ };
class ModelX : public Airplane {
    void fly(const Airport& dest) override { /* 다른 비행 */ }
};
```

기본 구현 제공 + 재정의 허용. 다만 derived가 깜빡 잊으면 base 동작 — 위험할 때도.

**안전 패턴**: pure virtual + 기본 구현을 별도 protected 함수로.

```cpp
class Airplane {
public:
    virtual void fly(const Airport&) = 0;
protected:
    void defaultFly(const Airport&) { /* 기본 동작 */ }
};

class ModelC : public Airplane {
    void fly(const Airport& dest) override { defaultFly(dest); }    // 의식적 선택
};
```

## non-virtual

```cpp
class Shape {
public:
    int objectID() const { /* 모든 Shape이 동일 동작 */ }
};
```

derived는 재정의 안 함 — 모든 derived에 강제된 동작. 항목 36 참고 (재정의 시도하면 함정).

## 흔한 실수

- **모두 non-virtual** — 다형성 활용 못함
- **모두 virtual** — 효율 손실 + 의도 불명확

## 핵심 정리

1. **pure virtual** = "이 인터페이스를 가져라, 구현은 너가"
2. **simple virtual** = "기본 구현 줄게, 필요하면 바꿔라"
3. **non-virtual** = "이 동작은 모든 derived가 동일"
4. simple virtual의 함정: 깜빡 잊으면 base 동작 — pure virtual + protected 기본 함수가 안전
