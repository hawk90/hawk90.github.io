---
title: "항목 22: 데이터 멤버는 private으로 선언하라"
date: 2025-02-04T14:00:00
description: "캡슐화의 첫걸음 — public 데이터의 단점과 protected의 함정."
tags: [C++, Effective C++, Encapsulation]
series: "Effective C++"
seriesOrder: 22
draft: true
---

> **초안** — 정리 진행 중

## 개요

데이터 멤버를 `private`으로 두면 **캡슐화**가 가능합니다. 접근은 멤버 함수로만 — 변경 시 클라이언트 코드를 깨뜨리지 않고 내부를 바꿀 수 있음.

## public 데이터의 단점

### 1. 일관성 없는 접근 문법

```cpp
struct Point { int x; int y; };
Point p;
p.x = 10;     // 직접
```

함수와 데이터의 접근 방식이 달라 사용자가 매번 기억해야 함. 모두 함수로 통일하면 일관됨.

### 2. 정밀한 제어 불가

```cpp
class Speedometer {
    int currentSpeed;
public:
    int getSpeed() const { return currentSpeed; }
    void setSpeed(int s) {
        if (s < 0 || s > MAX) throw std::invalid_argument("");
        currentSpeed = s;
    }
};
```

setter에서 검증, 로깅, 동기화 등 추가 가능. public 데이터는 이게 불가능.

### 3. 캡슐화

내부 표현을 바꾸고 싶을 때:
- public 데이터: **모든 클라이언트 코드 수정 필요**
- private + 함수: **함수 본문만 수정**

```cpp
// 나중에 currentSpeed를 m/s에서 km/h로 바꾸기로 결정
class Speedometer {
    int currentSpeedKmh;     // 내부 표현 변경
public:
    int getSpeed() const { return currentSpeedKmh * 1000 / 3600; }   // 인터페이스 유지
};
```

## protected는 public보다 캡슐화가 더 나은가?

**아니오.** protected 데이터는 모든 derived 클래스가 의존 → public과 마찬가지로 변경 시 깨질 코드가 많아짐. 가능하면 protected 데이터도 private + protected 접근자.

## struct vs class

문법적으로는 기본 접근 권한만 다름 (`struct` = public, `class` = private). 컨벤션:

- **순수 데이터 묶음 (POD-like)** → `struct`, public 멤버 OK
- **불변식이 있는 객체** → `class`, private 데이터

## 핵심 정리

1. 데이터 멤버는 기본 `private`
2. 접근 검증·로깅·동기화 추가 가능
3. 내부 표현 변경이 클라이언트를 깨뜨리지 않음
4. protected도 캡슐화 측면에선 public과 같음 — 신중히
