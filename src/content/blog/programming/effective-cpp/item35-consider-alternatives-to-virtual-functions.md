---
title: "항목 35: 가상 함수의 대안을 고려하라"
date: 2025-02-06T13:00:00
description: "NVI, Strategy 패턴, std::function 등 다형성 구현의 다른 방법들."
tags: [C++, Effective C++, Virtual, Design Pattern]
series: "Effective C++"
seriesOrder: 35
draft: true
---

> **초안** — 정리 진행 중

## 개요

다형적 동작 구현에 가상 함수만 있는 게 아닙니다. **NVI**, **Strategy** 패턴, **`std::function`**, **template** 등 각자 트레이드오프가 있는 대안.

## 1. NVI (Non-Virtual Interface)

public은 non-virtual, 내부에서 private virtual을 호출.

```cpp
class GameCharacter {
public:
    int healthValue() const {
        // 사전 처리 (mutex 잠금, 로깅 등)
        int retVal = doHealthValue();
        // 사후 처리
        return retVal;
    }
private:
    virtual int doHealthValue() const { /* 기본 구현 */ }
};
```

base가 호출 시점의 사전·사후 처리를 통제. derived는 핵심 로직만 변경.

## 2. Strategy 패턴 — 함수 포인터

```cpp
class GameCharacter;
int defaultHealthCalc(const GameCharacter&);

class GameCharacter {
    using HealthCalcFunc = int (*)(const GameCharacter&);
    HealthCalcFunc healthFunc;
public:
    GameCharacter(HealthCalcFunc f = defaultHealthCalc) : healthFunc(f) {}
    int healthValue() const { return healthFunc(*this); }
};
```

런타임에 함수 교체 가능. 객체별로 다른 전략.

## 3. Strategy + `std::function`

```cpp
class GameCharacter {
    std::function<int(const GameCharacter&)> healthFunc;
public:
    template<typename F>
    GameCharacter(F f) : healthFunc(std::move(f)) {}
};
```

함수 포인터, 람다, 함수 객체, 멤버 함수 — 무엇이든 받을 수 있음. 비용은 type erasure (EMC++ item 5).

## 4. Strategy + 다른 클래스 계층 (전통적 Strategy)

```cpp
class HealthCalcFunc {
public:
    virtual int calc(const GameCharacter&) const;
};

class GameCharacter {
    HealthCalcFunc* pHealthCalc;
public:
    int healthValue() const { return pHealthCalc->calc(*this); }
};
```

다형적 전략 객체. 가장 유연하지만 객체 생성/관리 복잡.

## 5. 템플릿 (compile-time polymorphism)

```cpp
template<typename HealthCalc>
class GameCharacter {
    HealthCalc healthCalc;
public:
    int healthValue() const { return healthCalc(*this); }
};
```

런타임 비용 0, 인라인 가능. 단 같은 템플릿 인스턴스끼리만 호환.

## 트레이드오프 비교

| 방식 | 런타임 비용 | 유연성 | 코드 복잡도 |
| --- | --- | --- | --- |
| 가상 함수 | vtable 디스패치 | 클래스 단위 | 단순 |
| NVI | + 일반 호출 비용 | 클래스 단위 + 사전·사후 | 단순 |
| 함수 포인터 | 간접 호출 | 객체별 가능 | 단순 |
| `std::function` | type erasure | 매우 유연 | 단순 |
| Strategy 클래스 | 가상 호출 | 매우 유연 | 복잡 |
| 템플릿 | 0 | 컴파일 타임만 | 단순~복잡 |

## 핵심 정리

1. 가상 함수만이 다형성의 답이 아니다
2. NVI는 base가 사전·사후 통제 가능
3. Strategy(함수 포인터/`std::function`)는 객체별 다른 동작
4. 템플릿은 비용 0이지만 런타임 다형성은 안 됨
