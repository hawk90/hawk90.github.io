---
title: "항목 27: 캐스팅을 최소화하라"
date: 2025-02-05T11:00:00
description: "C++ 4가지 캐스트의 용도, 흔한 함정(slicing, 다중 상속)."
tags: [C++, Effective C++, Casting]
series: "Effective C++"
seriesOrder: 27
draft: true
---

> **초안** — 정리 진행 중

## 개요

캐스팅은 타입 시스템을 우회하는 도구 — 강력하지만 위험. C++의 4가지 캐스트는 각자 의도가 명확하므로 C-style cast 대신 사용해야 합니다.

## 4가지 C++ 캐스트

```cpp
const_cast<T>(expr)       // const 제거
dynamic_cast<T>(expr)     // 다형적 down-cast (RTTI 사용, 실패 시 nullptr/예외)
reinterpret_cast<T>(expr) // 비트 재해석 (포인터/정수 변환 등)
static_cast<T>(expr)      // 일반 변환 (암묵 변환의 역, 명시 강제)
```

C-style cast(`(T)expr`)는 위 네 가지 중 무엇이든 시도하므로 의도 불명확. C++ 캐스트가 더 안전하고 검색하기 쉬움.

## 캐스팅의 함정 1 — 임시 객체 생성

```cpp
class Window { /* ... */ };
class SpecialWindow : public Window {
public:
    void onResize() {
        static_cast<Window>(*this).onResize();   // 임시 Window 객체 생성!
        // 의도: base의 onResize 호출
        // 실제: Window 임시에 onResize 호출 — 원본 *this는 변경 없음
    }
};
```

해결: 명시적으로 base 함수 호출.

```cpp
void onResize() {
    Window::onResize();    // 올바름
}
```

## 캐스팅의 함정 2 — 다중 상속과 포인터 오프셋

```cpp
Derived* d = ...;
Base*    b = d;     // 다중 상속이면 b의 주소는 d와 다를 수 있음
                    // (컴파일러가 자동으로 오프셋 조정)

// reinterpret_cast로 강제 변환 시 → 오프셋 안 맞아서 UB
Base* bad = reinterpret_cast<Base*>(d);
```

down-cast가 필요하면 항상 `dynamic_cast` 사용.

## `dynamic_cast`의 비용

RTTI(Run-Time Type Information) 사용 — 클래스 이름 비교 등으로 느릴 수 있음. 빈번한 호출이라면 design 재고:

- 가상 함수로 다형성 활용
- type-safe 컨테이너 (별도 컨테이너 두 개)

## 핵심 정리

1. C++ 4가지 캐스트로 의도 명시 — C-style cast 피하기
2. 캐스팅은 보통 design 문제의 신호 — 가능하면 가상 함수로
3. `dynamic_cast`는 비싸므로 빈번하면 재설계
4. 캐스트 없이 풀 수 있는지 항상 검토
