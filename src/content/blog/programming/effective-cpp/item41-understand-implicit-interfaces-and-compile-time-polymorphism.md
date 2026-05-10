---
title: "항목 41: 암묵 인터페이스와 컴파일 타임 다형성을 이해하라"
date: 2025-02-07T10:00:00
description: "OOP의 명시적 인터페이스 + 런타임 다형성 vs 템플릿의 암묵 인터페이스 + 컴파일 타임 다형성."
tags: [C++, Effective C++, Template, Polymorphism]
series: "Effective C++"
seriesOrder: 41
draft: true
---

> **초안** — 정리 진행 중

## 개요

OOP와 템플릿은 다형성에 다른 모델을 사용합니다:

- **OOP**: 명시적 인터페이스(virtual 함수 시그니처) + 런타임 다형성(가상 호출)
- **템플릿**: 암묵 인터페이스(컴파일러가 추론) + 컴파일 타임 다형성(인스턴스화)

## 명시적 인터페이스 (OOP)

```cpp
class Widget {
public:
    virtual std::size_t size() const;
    virtual void normalize();
    void swap(Widget& other);
};

void doStuff(Widget& w) {     // w의 인터페이스가 명시적으로 보임
    w.size();
    w.normalize();
    w.swap(other);
}
```

`Widget` 헤더만 보면 호출 가능 함수가 모두 보임 — 명시적.

## 암묵 인터페이스 (템플릿)

```cpp
template<typename T>
void doStuff(T& w) {
    if (w.size() > 10 && w != someNastyWidget) {
        T temp(w);
        temp.normalize();
        temp.swap(w);
    }
}
```

`T`가 만족해야 할 인터페이스는 암묵적:
- `.size()`가 `> 10` 비교 가능한 값을 반환
- `operator!=` 가 `T`와 `someNastyWidget` 사이에 있음
- 복사 생성 가능
- `.normalize()` 호출 가능
- `.swap()` 호출 가능

컴파일러가 컴파일 시점에 검사. **런타임 vtable 비용 없음**.

## 트레이드오프

| 측면 | OOP (virtual) | 템플릿 |
| --- | --- | --- |
| 인터페이스 | 명시적 | 암묵적 |
| 다형성 시점 | 런타임 | 컴파일 타임 |
| 비용 | vtable lookup | 0 (인라인 가능) |
| 코드 부피 | 함수당 1개 | 인스턴스마다 |
| 에러 메시지 | 명확 | 종종 혼란스러움 (C++20 concepts로 개선) |
| 다중 타입 처리 | 같은 컨테이너에 | 각각 별도 |

## C++20: concepts로 명시화

```cpp
template<typename T>
concept Widget = requires(T t) {
    t.size();
    t.normalize();
};

template<Widget T>
void doStuff(T& w) { /* ... */ }
```

암묵 인터페이스를 명시화 — 에러 메시지·문서화 모두 향상.

## 핵심 정리

1. OOP = 명시적 인터페이스 + 런타임 다형성
2. 템플릿 = 암묵 인터페이스 + 컴파일 타임 다형성
3. 두 가지 모두 다형성 — 다른 트레이드오프
4. C++20 concepts로 템플릿 인터페이스도 명시화 가능
