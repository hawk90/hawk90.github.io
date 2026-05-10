---
title: "항목 34: std::bind보다 람다를 선호하라"
date: 2025-01-09T13:00:00
description: "std::bind의 단점과 람다가 거의 항상 더 나은 선택인 이유."
tags: [C++, Lambda, std::bind, Modern C++]
series: "Effective Modern C++"
seriesOrder: 34
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++11 이전에는 `std::bind`가 클로저를 만드는 표준 도구였지만, C++14 람다(특히 제네릭 람다)가 등장한 후로는 거의 항상 람다가 우월합니다.

## 1. 가독성

```cpp
auto setSoundB = std::bind(setAlarm, _1,
                           std::chrono::steady_clock::now() + 1h,
                           1s);

auto setSoundL = [](Sound s) {
    setAlarm(s, std::chrono::steady_clock::now() + 1h, 1s);
};
```

람다는 호출 형태가 그대로 보임 — `bind`는 placeholder와 함께 함수 호출 구조가 가려짐.

## 2. 평가 시점의 명확성

```cpp
// bind: 인자가 즉시 평가 — bind 호출 시점에 now()가 한 번
auto bad = std::bind(setAlarm, _1,
                     std::chrono::steady_clock::now() + 1h, 1s);

// 람다: 인자가 호출 시점에 평가 — 매번 호출할 때 now()
auto good = [](Sound s) {
    setAlarm(s, std::chrono::steady_clock::now() + 1h, 1s);
};
```

`bind` 함정 — 의도와 다르게 시간이 고정될 수 있음.

## 3. 오버로드 처리

```cpp
void setAlarm(Sound, Time, Duration);
void setAlarm(Sound, Time, Duration, Volume);   // 오버로드 추가

std::bind(setAlarm, ...);   // 에러! 어느 오버로드?
[](auto... args) { setAlarm(args...); };   // 람다는 호출 시점에 결정
```

람다는 호출 시점에 오버로드 해석이 일어나 자연스럽게 처리.

## 4. 인라이닝 / 성능

람다는 컴파일러가 본문을 직접 보고 인라이닝 가능. `bind`는 함수 포인터/멤버 포인터를 통한 간접 호출이 발생할 수 있어 성능이 떨어짐.

## 5. 디버깅

람다 본문은 평범한 함수 본문 — 디버거에서 step-into 가능. `bind`는 내부 구현 안으로 들어가 디버깅이 어려움.

## `bind`가 여전히 유용한 경우

- C++11에서 perfect forwarding 캡처 (move-only 객체) — 항목 32
- 지금은 거의 init capture로 대체

## 핵심 정리

1. C++14+ 환경에선 람다가 `bind`보다 거의 항상 우월
2. 가독성, 평가 시점, 오버로드 처리, 인라이닝, 디버깅 모두 이점
3. `bind`는 C++11에서 move-only 캡처 등 일부 특수 용도만
4. 새 코드에서 `bind`를 보면 람다로 리팩토링 검토
