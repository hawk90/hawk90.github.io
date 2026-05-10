---
title: "항목 12: 재정의 함수에는 override를 선언하라"
date: 2025-01-06T15:00:00
description: "override 키워드로 가상 함수 재정의의 미묘한 실수를 컴파일 타임에 잡아내는 법."
tags: [C++, virtual, override, Modern C++]
series: "Effective Modern C++"
seriesOrder: 12
draft: true
---

> **초안** — 정리 진행 중

## 개요

가상 함수를 재정의(override)할 때 시그니처가 조금이라도 어긋나면 **새로운 가상 함수**가 만들어집니다 — 컴파일러는 경고하지 않습니다. C++11의 `override` 키워드는 "이건 재정의여야 한다"고 컴파일러에게 알려 실수를 막아줍니다.

## 재정의가 깨지기 쉬운 이유

base의 가상 함수와 derived의 함수가 일치하려면 다음이 모두 맞아야 합니다:

- 함수 이름
- 매개변수 타입
- const성
- 참조 한정자(`&`, `&&`)
- 반환 타입(공변 반환 허용)
- 예외 명세 호환

하나라도 어긋나면 재정의가 아니라 **새 함수**입니다.

## 함정 예제

```cpp
class Base {
public:
    virtual void f1() const;
    virtual void f2(int);
    virtual void f3() &;
    void f4() const;             // virtual 아님
};

class Derived : public Base {
public:
    virtual void f1();           // const 빠짐 — 새 함수
    virtual void f2(unsigned);   // 매개변수 타입 다름 — 새 함수
    virtual void f3() &&;        // 한정자 다름 — 새 함수
    virtual void f4() const;     // base에 virtual 없음 — 새 가상 함수
};
```

위 네 함수 모두 **재정의가 아닌데** 컴파일러는 침묵합니다.

## 해결: `override`

```cpp
class Derived : public Base {
public:
    virtual void f1() override;        // 에러! const 빠짐
    virtual void f2(unsigned) override;// 에러! 시그니처 불일치
    virtual void f3() && override;     // 에러
    virtual void f4() const override;  // 에러! base에 virtual 없음
};
```

컴파일러가 모두 잡아냅니다.

## `override`가 주는 추가 이점

- **의도 표현**: "이 함수는 base를 재정의하는 것"이 코드에 명시
- **base 변경 시 깨짐**: base의 가상 함수 시그니처가 바뀌면 derived에서 즉시 컴파일 에러 — 잠잠히 기능을 잃지 않음

## 참조 한정자 멤버 함수 — 잠깐 짚기

```cpp
class Widget {
public:
    void doWork() &;     // *this가 lvalue일 때만 호출 가능
    void doWork() &&;    // *this가 rvalue일 때만 호출 가능
};

Widget w;
w.doWork();              // & 버전
makeWidget().doWork();   // && 버전
```

기존 코드와의 호환성을 위해 일부러 만든 기능 — 임시 객체에 대해서는 다른 동작을 주고 싶을 때 유용.

## 핵심 정리

1. 재정의는 시그니처가 정확히 맞아야 — 어긋나면 새 가상 함수가 됨
2. `override`로 컴파일러에게 검증 위임
3. base 변경 시 회귀 방지 효과
4. `final`(C++11)도 같이 활용 — "더는 재정의 금지"
