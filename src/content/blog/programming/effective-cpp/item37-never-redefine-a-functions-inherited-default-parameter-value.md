---
title: "항목 37: 상속받은 함수의 기본 매개변수 값을 재정의하지 말라"
date: 2025-02-06T15:00:00
description: "기본값은 정적 바인딩, 함수 본문은 동적 바인딩 — 어긋나는 함정."
tags: [C++, Effective C++, Virtual, Default Arguments]
series: "Effective C++"
seriesOrder: 37
draft: true
---

> **초안** — 정리 진행 중

## 개요

가상 함수의 기본 매개변수 값은 **정적 바인딩** — 호출자의 타입으로 결정. 그런데 함수 본문은 **동적 바인딩** — 객체의 실제 타입으로 결정. 둘이 어긋나면 derived의 본문이 base의 기본값으로 호출되는 이상한 일이 발생.

## 함정

```cpp
enum Color { Red, Green };

class Shape {
public:
    virtual void draw(Color c = Red) const = 0;
};

class Circle : public Shape {
public:
    void draw(Color c = Green) const override {   // 기본값 변경
        std::cout << "Color: " << c << '\n';
    }
};

Shape* p = new Circle;
p->draw();     // 호출되는 함수: Circle::draw() (동적 바인딩)
               // 사용되는 기본값: Red (Shape의 기본값 — 정적 바인딩)
               // → "Color: 0" 출력 (Red)
               // Circle 사용자는 Green을 기대했을 텐데!
```

## 왜?

기본 매개변수는 **컴파일 타임에** 호출 측에 끼워 넣어짐. 효율을 위함이지만 동적 바인딩과 어긋남.

## 해결 1 — 기본값 재정의 안 하기

```cpp
class Circle : public Shape {
public:
    void draw(Color c) const override {    // 기본값 없음
        // ...
    }
};
```

호출 시 `circle.draw(Red);` — 명시 필요. base의 기본값과 일관됨.

## 해결 2 — NVI 패턴으로 기본값 제거

```cpp
class Shape {
public:
    void draw(Color c = Red) const {    // non-virtual, 기본값 여기만
        doDraw(c);
    }
private:
    virtual void doDraw(Color c) const = 0;   // virtual, 기본값 없음
};

class Circle : public Shape {
private:
    void doDraw(Color c) const override { /* ... */ }
};
```

기본값은 한 곳(base의 NVI 함수)에만, 다형적 본문은 derived 자유.

## 핵심 정리

1. 가상 함수의 기본값은 정적 바인딩 — 본문은 동적 바인딩
2. derived에서 기본값 다르게 두면 함정 발생
3. 기본값을 derived에서 재정의하지 않거나
4. NVI 패턴으로 기본값을 한 곳에만
