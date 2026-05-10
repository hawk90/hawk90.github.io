---
title: "항목 32: public 상속은 'is-a'를 모델링해야 한다"
date: 2025-02-06T10:00:00
description: "Liskov Substitution — derived는 어디서든 base를 대체할 수 있어야."
tags: [C++, Effective C++, Inheritance, LSP]
series: "Effective C++"
seriesOrder: 32
draft: true
---

> **초안** — 정리 진행 중

## 개요

`class D : public B`는 "D는 B의 일종이다(is-a)"를 의미합니다. **B가 사용되는 모든 곳에서 D를 사용할 수 있어야** 합니다 (Liskov Substitution Principle).

## 함정 — 직관적이지만 틀린 상속

**"펭귄은 새다, 새는 난다"** 같은 자연어 분류는 IS-A 상속에 안 맞을 때가 많음.

```cpp
class Bird {
public:
    virtual void fly();
};

class Penguin : public Bird {  // 컴파일은 되지만...
    void fly() override { throw std::logic_error("can't fly"); }
};

void makeItFly(Bird& b) { b.fly(); }
Penguin p;
makeItFly(p);    // 런타임 에러 — 코드는 Bird이면 다 날 거라 가정
```

LSP 위반: 사용자가 `Bird`에 가질 수 있는 합리적 기대(날 수 있음)를 `Penguin`이 깨뜨림.

해결: 분류 자체 재고 — `class FlyingBird : public Bird`, `class NonFlyingBird : public Bird` 등으로 분리.

## 함정 — 정사각형은 직사각형?

```cpp
class Rectangle {
public:
    virtual void setWidth(int w);
    virtual void setHeight(int h);
};

class Square : public Rectangle {
    void setWidth(int w) override { width = height = w; }   // 정사각형 유지
    void setHeight(int h) override { width = height = h; }
};

void makeBigger(Rectangle& r) {
    int oldHeight = r.height();
    r.setWidth(r.width() + 10);
    assert(r.height() == oldHeight);   // Rectangle의 합리적 기대
                                        // Square엔 깨짐 — height도 바뀜
}
```

수학적으로 "정사각형 ⊂ 직사각형"이지만, **변경 가능한 객체 모델**에선 Square가 Rectangle의 계약을 깨뜨림. 객체 지향 IS-A는 "교체 가능"의 의미.

## 다른 관계는 다른 도구로

- **has-a** → composition (멤버로 보유)
- **is-implemented-in-terms-of** → private 상속 또는 composition

자세한 건 항목 38, 39.

## 핵심 정리

1. public 상속 = IS-A = LSP
2. derived는 base가 쓰이는 모든 곳에서 동작해야
3. 자연어 분류는 종종 IS-A 상속과 다름
4. 다른 관계는 composition / private 상속으로
