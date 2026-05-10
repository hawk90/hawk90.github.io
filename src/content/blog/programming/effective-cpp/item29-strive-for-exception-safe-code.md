---
title: "항목 29: 예외-안전 코드를 작성하라"
date: 2025-02-05T13:00:00
description: "기본·강력·noexcept 보증 세 단계와 copy-and-swap 패턴."
tags: [C++, Effective C++, Exception Safety]
series: "Effective C++"
seriesOrder: 29
draft: true
---

> **초안** — 정리 진행 중

## 개요

예외-안전(exception-safe) 코드는 두 가지를 보장:
1. **자원 누수 없음** (RAII로 자동 해결)
2. **데이터 구조 일관성 유지** (예외 후에도 객체가 망가지지 않음)

세 단계 보증이 있으며, 강할수록 좋음.

## 세 단계 예외 보증

### 1. 기본 보증 (basic guarantee)
예외 후에도 객체는 **유효한 상태**(어떤 상태인지는 미정). 자원 누수 없음.

```cpp
class Widget {
    void changeBackground(Image* newImg) {
        delete bg;
        bg = newImg;     // newImg를 받기 전에 delete — 다음 줄에서 throw 시 bg는 댕글링
    }
};
```

위 코드는 기본 보증조차 없음.

### 2. 강력 보증 (strong guarantee)
예외 발생 시 **호출 전 상태로 롤백**. 트랜잭션과 같음.

```cpp
void changeBackground(Image* newImg) {
    Image* oldBg = bg;
    bg = newImg;       // 새 거 먼저
    delete oldBg;      // 옛 거 나중 — delete가 던지지 않으면 강력 보증 (throw하는 delete는 거의 없음)
}
```

### 3. noexcept (no-throw guarantee)
예외 절대 안 던짐. 가장 강력한 보증. 멤버가 모두 noexcept 연산만 사용해야 함.

## copy-and-swap 패턴 (강력 보증)

```cpp
void Widget::changeBackground(const Image& newImg) {
    auto temp = std::make_unique<Image>(newImg);   // 1) 사본 생성 — 실패해도 *this 무관
    swap(bg, temp);                                // 2) 교환 (noexcept)
                                                   // 3) temp 소멸 → 옛 bg 정리
}
```

- 사본 만드는 단계에서 예외 → `*this`는 변경 없음 (롤백)
- swap이 noexcept면 그 이후엔 예외 없음

## 함수의 보증은 가장 약한 부분에 의해 결정

```cpp
void f() {
    op1();    // 강력
    op2();    // 강력
}
```

`op1()` 후 `op2()`가 throw하면, 시스템은 `op1`의 변화는 그대로인 상태 — 즉 `f()` 전체로는 강력 보증 ❌.

여러 작업을 하나의 강력 보증으로 만들려면 트랜잭션 객체에 모든 변화를 모았다가 마지막에 한 번에 적용 (copy-and-swap의 일반화).

## 핵심 정리

1. 모든 함수는 적어도 **기본 보증**
2. 가능하면 **강력 보증** — copy-and-swap 패턴
3. 사용자에게 **어떤 보증을 제공하는지 문서화**
4. 한 함수의 보증은 가장 약한 단계에 의해 제한됨
