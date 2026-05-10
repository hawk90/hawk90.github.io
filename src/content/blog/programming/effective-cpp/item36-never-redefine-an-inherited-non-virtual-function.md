---
title: "항목 36: 상속받은 non-virtual 함수를 재정의하지 말라"
date: 2025-02-06T14:00:00
description: "static binding vs dynamic binding — 같은 객체에서 다른 동작이 호출되는 함정."
tags: [C++, Effective C++, Inheritance, Virtual]
series: "Effective C++"
seriesOrder: 36
draft: true
---

> **초안** — 정리 진행 중

## 개요

non-virtual 함수는 **정적 바인딩** — 호출되는 함수는 **포인터/참조의 타입**으로 결정. 같은 객체라도 어떤 타입으로 보느냐에 따라 다른 함수가 호출되어 매우 헷갈리는 코드가 됩니다.

## 함정

```cpp
class B {
public:
    void f();    // non-virtual
};

class D : public B {
public:
    void f();    // base의 f를 가림 (재정의 시도)
};

D d;
B* pb = &d;
D* pd = &d;

pb->f();    // B::f() 호출 — pb의 타입이 B*
pd->f();    // D::f() 호출 — pd의 타입이 D*
            // 같은 객체인데 다른 함수가!
```

virtual 함수라면 둘 다 `D::f()` 호출 — 일관됨.

## 왜 문제인가

- 사용자는 객체의 동작이 일관될 것이라 기대
- 같은 객체에 같은 함수 호출이 다른 결과? 코드 신뢰도 ↓
- non-virtual의 의미 자체가 "모든 derived가 동일 동작" — 재정의는 그 약속 깨기

## 해결

- 다형성을 원하면 → **virtual로 선언**
- 모든 derived가 동일 동작이어야 한다면 → **재정의 금지**

```cpp
class D : public B {
    // B::f() 그대로 사용 — 재정의 안 함
};
```

C++11+ `final`로 강제할 수도:

```cpp
class B {
public:
    virtual void f() final;    // derived 재정의 금지
};
```

## 핵심 정리

1. non-virtual = "모든 derived가 동일" — 재정의하면 약속 깸
2. 정적 바인딩 때문에 같은 객체에 다른 동작 발생
3. 다형성 원하면 virtual, 아니면 그대로 두기
4. `final` 키워드로 강제 가능
