---
title: "항목 31: 기본 캡처 모드를 피하라"
date: 2025-01-09T10:00:00
description: "[&]와 [=]가 댕글링 참조와 의외의 캡처를 만드는 메커니즘."
tags: [C++, Lambda, Capture, Modern C++]
series: "Effective Modern C++"
seriesOrder: 31
draft: true
---

> **초안** — 정리 진행 중

## 개요

람다의 기본 캡처 모드 `[&]`(모두 참조 캡처)과 `[=]`(모두 값 캡처)는 편하지만 **댕글링 참조**와 **의도치 않은 캡처**를 만듭니다. 명시적으로 캡처할 변수를 적는 게 안전합니다.

## `[&]`의 함정 — 댕글링 참조

```cpp
std::vector<std::function<bool(int)>> filters;

void addFilter() {
    auto divisor = computeDivisor();
    filters.emplace_back(
        [&](int v) { return v % divisor == 0; }
        //  ↑ divisor는 참조 캡처
    );
}   // ← 함수 종료 시 divisor 소멸
    //   filters의 람다는 댕글링 참조 보유
```

람다가 **자신의 캡처를 만든 스코프보다 오래 사는 순간** 위험.

## `[=]`의 함정 — 멤버 변수는 사실 `this` 캡처

```cpp
class Widget {
    int divisor;
public:
    void addFilter() const {
        filters.emplace_back(
            [=](int v) { return v % divisor == 0; }
            //   ↑ divisor가 캡처되는 게 아니라 this가 캡처됨!
            //     실제로는 this->divisor 접근
        );
    }
};
```

`this`가 댕글링이 되면 같은 문제 발생.

**C++20 해결**: `[=, this]`(C++20에선 `[this]`만 명시 권장), 또는 `[*this]`로 객체를 값 캡처.

## `[=]`의 함정 — 정적 변수는 캡처되지 않음

```cpp
void process() {
    static int divisor = 5;
    auto f = [=](int v) { return v % divisor == 0; };
    //  ↑ divisor는 static이라 캡처 X — 직접 참조됨
    //    [=]가 적혀 있어 "캡처 됐겠지" 오해 유발
}
```

값을 복사한 것처럼 보이지만 실제로는 매번 같은 static을 읽음.

## 권장: 명시적 캡처

```cpp
filters.emplace_back(
    [divisor](int v) { return v % divisor == 0; }   // 명시적 값 캡처
);

filters.emplace_back(
    [&divisor](int v) { return v % divisor == 0; }  // 명시적 참조 캡처
);
```

각 변수의 캡처 의도가 코드에 적혀 있어 함정을 피하기 쉬움.

## 핵심 정리

1. `[&]`는 댕글링 참조 위험 — 람다가 캡처 스코프보다 오래 살면 UB
2. `[=]`는 `this`를 캡처해 멤버 접근이 의외의 동작
3. `[=]`는 static 변수를 캡처하지 않음 — 오해 유발
4. 명시적 캡처 리스트가 안전 — 의도가 코드에 드러남
