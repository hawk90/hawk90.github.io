---
title: "항목 4: 자명한 getter와 setter는 피하라"
date: 2026-05-08T13:00:00
description: "자명한 접근자 대신 진짜 불변식을 보호하는 인터페이스 설계"
tags: [C++, Encapsulation, Class Design]
series: "Beautiful C++"
seriesOrder: 4
draft: false
---


## 핵심 내용

- 단순히 멤버를 그대로 읽고 쓰는 getter/setter는 **캡슐화의 환상**일 뿐이다
- 진짜 캡슐화는 **불변식(invariant)**을 보호할 때 의미가 있다
- 자명한 접근자만 가득한 클래스는 사실상 `struct`의 우회 표현 → 그냥 public 멤버로 두거나 책임을 다시 설계하라
- setter가 필요하다면 그 객체의 책임 분리가 잘못됐을 수 있다

## 예제 코드

```cpp
// Bad: 의미 없는 getter/setter — public 멤버와 다를 게 없다
class Point {
    int x_, y_;
public:
    int getX() const { return x_; }
    int getY() const { return y_; }
    void setX(int x) { x_ = x; }
    void setY(int y) { y_ = y; }
};

// Better: 책임이 단순한 값 객체라면 그냥 struct
struct Point { int x; int y; };

// Good: 불변식이 있을 때 setter는 검증 책임을 진다
class Temperature {
    double kelvin_;
public:
    explicit Temperature(double k) { set(k); }
    double kelvin() const { return kelvin_; }
    void set(double k) {
        if (k < 0) throw std::invalid_argument("Kelvin < 0");
        kelvin_ = k;
    }
};
```

## 정리

getter/setter는 **불변식을 지키기 위한 도구**이지 의례가 아니다. 검증할 게 없다면 데이터 클래스로 두고, 설정이 필요하다면 도메인 의미가 담긴 메서드로 표현하라.
