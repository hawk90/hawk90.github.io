---
title: "항목 17: new로 만든 객체는 독립 문장에서 스마트 포인터에 담아라"
date: 2025-02-03T14:00:00
description: "함수 인자 평가 순서 함정과 자원 누수 방지."
tags: [C++, Effective C++, Smart Pointer, Exception Safety]
series: "Effective C++"
seriesOrder: 17
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++17 이전에는 함수 인자의 평가 순서가 정해져 있지 않았습니다. `new`로 만든 raw pointer를 같은 호출의 다른 인자와 섞어 쓰면 **누수 가능성**이 있습니다.

## 함정 (C++14 이전)

```cpp
processWidget(std::shared_ptr<Widget>(new Widget), priority());
//             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^
//             ① new Widget                         ③ priority()
//             ② shared_ptr 생성                    사이에서 예외 시?
```

가능한 평가 순서:
1. `new Widget`
2. `priority()` 호출 — **여기서 예외 발생**
3. `shared_ptr` 생성 (도달 못 함)

→ raw pointer **누수**.

## 해결: 독립 문장으로 분리

```cpp
std::shared_ptr<Widget> p(new Widget);    // 독립 문장 — 평가 순서 모호함 없음
processWidget(p, priority());
```

`new`와 wrapping이 한 줄에 끝나면 사이에 다른 작업이 끼어들 수 없음.

## 더 좋은 방법: `make_shared` / `make_unique`

```cpp
processWidget(std::make_shared<Widget>(), priority());
```

함수 호출 한 번이라 평가 순서 모호함 자체가 없음. 게다가 한 번의 메모리 할당으로 효율 ↑ (EMC++ item 21).

## C++17 이후

C++17에서 함수 인자 평가 순서는 **여전히 미지정**이지만, 같은 인자 안의 부속 표현식들은 **인터리브 안 됨**(non-interleaved). 위 패턴이 안전해졌지만, **여전히 권장 패턴은 `make_*`**.

## 핵심 정리

1. `new` 결과를 같은 호출의 다른 인자와 섞지 말 것 (C++14 이전)
2. 독립 문장에 wrapping
3. 가장 좋은 방법: `make_shared` / `make_unique`
