---
title: "항목 26: 가변 데이터보다는 불변 데이터를 택하라"
date: 2026-05-10T15:00:00
description: "불변 데이터가 주는 추론·동시성·테스트의 이점"
tags: [C++, Immutability, const]
series: "Beautiful C++"
seriesOrder: 26
draft: false
---


## 핵심 내용

- 변하지 않는 데이터는 **추론·테스트·동시성**에서 모두 유리하다
- 변경 가능 멤버는 모두 **상태 전이**의 출처가 된다 — 줄일수록 버그가 줄어든다
- 가능한 한 `const`/`constexpr`로 선언하고, 멤버 함수도 기본을 `const`로
- 멀티스레드에서 **불변 객체는 공짜로 thread-safe**다
- "수정"이 필요하면 **새 객체로 만들어라** (값 의미론, 함수형 스타일)

## 예제 코드

```cpp
// Bad: 가변 멤버 가득 — 누가 언제 바꿨는지 추적 어려움
struct Point {
    int x, y;
    void set(int nx, int ny) { x = nx; y = ny; }
};

// Good: 불변 값 객체 — "변경"은 새 인스턴스 생성
class Point {
    const int x_;
    const int y_;
public:
    constexpr Point(int x, int y) : x_(x), y_(y) {}
    constexpr int x() const { return x_; }
    constexpr int y() const { return y_; }

    constexpr Point translated(int dx, int dy) const {
        return Point{x_ + dx, y_ + dy};
    }
};

// 멀티스레드에서 락 없이 안전하게 공유
const Point origin{0, 0};
```

## 정리

불변 데이터는 **공짜 동시성, 안정적 추론, 테스트 용이성**을 준다. 변경이 정말 필요한 곳만 가변으로 두고, 나머지는 `const`로 잠가라.
