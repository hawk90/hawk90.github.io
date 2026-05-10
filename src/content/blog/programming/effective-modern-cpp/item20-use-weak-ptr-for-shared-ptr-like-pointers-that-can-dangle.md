---
title: "항목 20: 댕글링이 가능한 shared_ptr류 포인터에는 weak_ptr를 사용하라"
date: 2025-01-07T12:00:00
description: "weak_ptr의 역할 — 캐싱, 옵저버 패턴, 순환 참조 끊기."
tags: [C++, Smart Pointer, weak_ptr, Modern C++]
series: "Effective Modern C++"
seriesOrder: 20
draft: true
---

> **초안** — 정리 진행 중

## 개요

`std::weak_ptr`는 shared_ptr가 가리키는 객체를 **소유하지 않고 관찰**합니다. 객체가 살아있는지 확인 후 안전하게 접근할 수 있고, 순환 참조도 끊어줍니다.

## 기본 사용

```cpp
auto sp = std::make_shared<Widget>();
std::weak_ptr<Widget> wp = sp;

// wp는 카운트를 증가시키지 않음
if (auto locked = wp.lock()) {   // shared_ptr로 잠금 시도
    locked->doSomething();        // 살아있을 때만 실행
}                                 // locked는 임시 shared_ptr — 안전

// 또는 expired() 검사
if (!wp.expired()) {
    auto sp2 = wp.lock();        // 같은 효과
}
```

`expired()` + 사용은 **race condition**이 있어 `lock()` 한 번으로 처리하는 게 안전합니다.

## 활용 1: 캐싱

```cpp
std::shared_ptr<Widget> getCached(int id) {
    static std::unordered_map<int, std::weak_ptr<Widget>> cache;

    auto it = cache.find(id);
    if (it != cache.end()) {
        if (auto sp = it->second.lock()) {
            return sp;   // 캐시 히트
        }
    }

    auto sp = loadWidget(id);
    cache[id] = sp;
    return sp;
}
```

캐시는 객체 수명을 연장하지 않음 → 진짜 사용자가 모두 떠나면 자동 해제.

## 활용 2: 옵저버 패턴

옵저버는 관찰 대상을 소유하지 않아야 함 → weak_ptr.

```cpp
class Subject {
    std::vector<std::weak_ptr<Observer>> observers;

    void notify() {
        for (auto& wp : observers) {
            if (auto sp = wp.lock()) {
                sp->update();
            }
        }
    }
};
```

## 활용 3: 순환 참조 끊기

```cpp
class Node {
    std::vector<std::shared_ptr<Node>> children;
    std::weak_ptr<Node>                parent;   // ← weak로 — 순환 방지
};
```

부모-자식이 모두 shared_ptr면 카운트가 영원히 0이 안 됨 → 메모리 누수.

## 비용

`weak_ptr`도 control block의 **약한 카운트**를 증감해야 하므로 atomic 연산이 있습니다 — shared_ptr만큼은 아니지만 공짜가 아닙니다.

## 핵심 정리

1. `weak_ptr` = "관찰만 하는 shared_ptr"
2. `lock()`으로 안전하게 접근
3. 캐싱, 옵저버, 순환 참조 끊기에 사용
4. control block을 통해 expired 여부를 알지만 atomic 비용 존재
