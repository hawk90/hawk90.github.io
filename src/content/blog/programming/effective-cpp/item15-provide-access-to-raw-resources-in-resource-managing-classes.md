---
title: "항목 15: 자원 관리 클래스에서 원시 자원에 대한 접근을 제공하라"
date: 2025-02-03T12:00:00
description: "RAII 객체에서 raw pointer/handle을 꺼내는 두 방식 — 명시적 vs 암묵적."
tags: [C++, Effective C++, RAII, API Design]
series: "Effective C++"
seriesOrder: 15
draft: true
---

> **초안** — 정리 진행 중

## 개요

자원 관리 클래스가 감싸는 raw 자원은 **C 스타일 API**에 전달해야 할 때가 자주 있습니다. 접근 제공 방식은 명시적(명시 호출)과 암묵적(변환 연산자) 두 가지 — 트레이드오프가 있음.

## 명시적 접근 — `.get()` 메서드

```cpp
class FontHandle {
    Font f;
public:
    Font get() const { return f; }
};

void useC API(Font f);

FontHandle h(getFont());
useCAPI(h.get());     // 명시적
```

표준 스마트 포인터의 `.get()`이 같은 패턴.

**장점**: 의도가 명확, 실수 방지
**단점**: 호출이 verbose

## 암묵적 접근 — 변환 연산자

```cpp
class FontHandle {
    Font f;
public:
    operator Font() const { return f; }
};

useCAPI(h);     // 자동 변환
```

**장점**: 자연스러운 사용
**단점**: 의도치 않은 변환 가능

```cpp
FontHandle h1(getFont());
Font f = h1;     // OK — 의도된 변환
Font f2 = h1;    // 같은 자원의 두 별칭? UB 위험
```

## 무엇을 선택할까?

- **표준 패턴 따라** `.get()` 명시 방식이 안전 — 표준 스마트 포인터, lock_guard 등 모두 이 방식
- 변환 연산자는 매우 빈번한 사용·실수 위험 낮을 때만

## 핵심 정리

1. RAII 객체는 원시 자원 접근 방법 제공해야 함
2. 명시적 `.get()` 또는 암묵적 변환 연산자
3. 표준 패턴(`.get()`)이 더 안전
4. 어느 쪽이든, 사용자가 raw 핸들을 보유해 RAII가 깨지지 않도록 주의
