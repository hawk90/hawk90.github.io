---
title: "항목 11: operator=에서 자기 대입을 처리하라"
date: 2025-02-02T16:00:00
description: "x = x; 같은 자기 대입에서 자원 누수·이중 해제를 막는 패턴."
tags: [C++, Effective C++, Operator Overloading, Exception Safety]
series: "Effective C++"
seriesOrder: 11
draft: true
---

> **초안** — 정리 진행 중

## 개요

`x = x`나 별칭(alias)을 통한 자기 대입은 흔하지 않아 보이지만, 포인터/참조를 통하면 종종 발생합니다. 자원 관리 클래스에서 처리 안 하면 **이중 해제**나 **자원 손실**.

## 위험한 코드

```cpp
class Bitmap;
class Widget {
    Bitmap* pb;
public:
    Widget& operator=(const Widget& rhs) {
        delete pb;                  // 1) 기존 pb 해제
        pb = new Bitmap(*rhs.pb);   // 2) rhs.pb 복사
        return *this;
    }
};

Widget w;
w = w;   // 1) delete w.pb
         // 2) new Bitmap(*w.pb) ← 이미 해제된 메모리 접근! UB
```

## 해결 1: 자기 대입 검사

```cpp
Widget& operator=(const Widget& rhs) {
    if (this == &rhs) return *this;   // 자기 대입이면 그냥 반환
    delete pb;
    pb = new Bitmap(*rhs.pb);
    return *this;
}
```

단순하지만 — `new`가 예외를 던지면 `pb`가 댕글링 상태로 남는 **예외 안전성 문제**가 여전히 있음.

## 해결 2: 순서 변경 (예외 안전)

```cpp
Widget& operator=(const Widget& rhs) {
    Bitmap* pOrig = pb;
    pb = new Bitmap(*rhs.pb);   // 새 거 먼저 만들고
    delete pOrig;               // 옛 거 나중에 해제
    return *this;
}
```

자기 대입이라도 정상 동작하고, `new`가 throw해도 `pb`는 원본 그대로. **자기 대입 검사 없이도** 안전.

## 해결 3: copy-and-swap

```cpp
class Widget {
    void swap(Widget& other) noexcept {
        std::swap(pb, other.pb);
    }

    Widget& operator=(Widget rhs) {   // pass by value!
        swap(rhs);                     // 자기와 swap
        return *this;
    }                                  // rhs 소멸 → 옛 pb 해제
};
```

매개변수를 by-value로 받아 복사 비용을 호출자 측에 위임, swap으로 교체. 가장 깔끔하고 예외-안전.

## 핵심 정리

1. 자기 대입은 별칭으로 흔히 발생 — `a[i] = a[j]`도 케이스
2. 단순 검사(`if (this == &rhs)`)는 예외 안전성 부족
3. 순서 변경 또는 copy-and-swap이 권장 패턴
4. 멤버가 단순한 클래스(자원 관리 X)는 신경 쓸 필요 없음
