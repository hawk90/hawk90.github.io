---
title: "항목 13: 원시 포인터나 참조로 소유권을 넘기지 말라"
date: 2026-05-09T12:00:00
description: "소유권을 타입으로 표현하기: unique_ptr, shared_ptr, 관찰 포인터"
tags: [C++, Ownership, Smart Pointers]
series: "Beautiful C++"
seriesOrder: 13
draft: false
---


## 핵심 내용

- `T*` / `T&`는 **소유 의도를 표현하지 못한다** — 호출자가 delete해야 하나? 안 해야 하나?
- 누군가 매뉴얼/주석을 안 보면 **이중 해제**나 **누수**로 직결된다
- 소유권 이전은 **`std::unique_ptr<T>` 반환** 또는 인자 인 경우 by-value 이동(`unique_ptr<T>&&`)으로 표현하라
- 소유권 공유가 필요하면 `std::shared_ptr<T>`
- 원시 포인터/참조는 **non-owning**(잠시 빌려본다)일 때만 사용하라

## 예제 코드

```cpp
// Bad: 호출자가 delete해야 하는지 시그니처만으로는 모름
Widget* create_widget();
void take(Widget* w);   // 보관? 일회용?

// Good: 소유권이 시그니처에 드러난다
std::unique_ptr<Widget> create_widget();      // 호출자가 소유
void take(std::unique_ptr<Widget> w);         // 소유권 이전 (이동)
void use(const Widget& w);                    // 빌려보기 (non-owning)
void observe(Widget* w);                      // 빌려보기 + nullable
```

## 정리

소유권은 **타입으로** 말해야 한다. `unique_ptr`/`shared_ptr`로 소유를, 원시 포인터·참조로 관찰을 표현하면 누수와 이중 해제가 사라진다.
