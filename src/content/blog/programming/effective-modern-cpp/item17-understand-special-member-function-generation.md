---
title: "항목 17: 특수 멤버 함수의 자동 생성 규칙을 이해하라"
date: 2025-01-06T20:00:00
description: "C++11 이후 특수 멤버 함수(생성자, 대입, 소멸자, move) 자동 생성 규칙의 미묘함."
tags: [C++, Special Member Functions, Move Semantics, Modern C++]
series: "Effective Modern C++"
seriesOrder: 17
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++11은 특수 멤버 함수에 **move 생성자**와 **move 대입**을 추가했습니다. 자동 생성 규칙이 더 복잡해졌는데, 핵심은 **"하나를 직접 선언하면 다른 것의 자동 생성이 막힌다"**는 점입니다.

## C++11의 특수 멤버 함수 6종

1. 기본 생성자
2. 소멸자
3. 복사 생성자
4. 복사 대입 연산자
5. **move 생성자** (신규)
6. **move 대입 연산자** (신규)

## 자동 생성 규칙 요약

| 직접 선언한 것 | 자동 생성되는 것 |
| --- | --- |
| 아무것도 (모두 자동) | 모두 자동 생성 (사용 시점에 정의) |
| **사용자 정의 소멸자** | move 자동 생성 **막힘**, copy는 생성 (deprecated) |
| **사용자 정의 복사 생성자/대입** | move 자동 생성 **막힘** |
| **사용자 정의 move 생성자/대입** | copy 자동 생성 **막힘**(`= delete`) |

가장 중요한 결과:

- **소멸자나 copy를 직접 정의하면 → move 자동 생성 안 됨** → 객체가 항상 copy됨 (성능 손실)
- **move를 정의하면 → copy 자동 생성 안 됨** → 명시적으로 복사 필요

## "Rule of Five / Zero"

C++11+ 시대의 가이드:

- **Rule of Zero**: 자원 관리는 RAII에 위임하고 특수 멤버는 모두 자동 생성에 맡긴다 (가장 권장)
- **Rule of Five**: 하나를 정의하면 5개 모두를 의도적으로 정의한다 (명시적 자원 관리 시)

```cpp
// Rule of Zero — 자원은 멤버 RAII가 관리
class Widget {
    std::vector<int>     data;
    std::unique_ptr<int> ptr;
    // 특수 멤버 자동 생성 — 모두 잘 동작
};

// Rule of Five — 직접 자원 관리
class Buffer {
    int* data;
    size_t size;
public:
    Buffer();
    ~Buffer();
    Buffer(const Buffer&);
    Buffer& operator=(const Buffer&);
    Buffer(Buffer&&) noexcept;
    Buffer& operator=(Buffer&&) noexcept;
};
```

## 명시적으로 자동 생성 요청 — `= default`

자동 생성을 막은 상태에서도 명시적으로 다시 요청할 수 있습니다.

```cpp
class Widget {
    Widget(const Widget&);  // copy 정의 → move 자동 생성 막힘

public:
    Widget(Widget&&) = default;             // 다시 자동 생성
    Widget& operator=(Widget&&) = default;
};
```

## 템플릿 멤버 함수는 특수 멤버를 막지 않음

```cpp
class Widget {
public:
    template<typename T>
    Widget(const T& other);   // copy처럼 보이지만 템플릿
                              // → 진짜 copy 생성자는 여전히 자동 생성됨
};
```

이 점이 항목 26의 perfect forwarding 함정과 연결됩니다.

## 핵심 정리

1. C++11에 move 생성자/대입이 특수 멤버에 추가됨
2. **소멸자나 copy를 정의하면 move 자동 생성이 막힘**
3. Rule of Zero가 기본 — 자원은 RAII에 위임
4. 직접 정의 시 `= default`로 명시 가능
5. 템플릿 생성자는 특수 멤버 자동 생성을 막지 않음
