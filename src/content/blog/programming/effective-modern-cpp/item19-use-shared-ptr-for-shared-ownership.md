---
title: "항목 19: 공유 소유 자원 관리에는 std::shared_ptr를 사용하라"
date: 2025-01-07T11:00:00
description: "shared_ptr의 참조 카운팅 비용, control block, 그리고 흔한 함정."
tags: [C++, Smart Pointer, shared_ptr, Modern C++]
series: "Effective Modern C++"
seriesOrder: 19
draft: true
---

> **초안** — 정리 진행 중

## 개요

`std::shared_ptr`는 **공유 소유**(shared ownership)를 표현합니다 — 마지막 참조가 사라질 때 자원을 해제. 비용도 그만큼 큽니다 — 일반 포인터의 **2배 크기**, **참조 카운트의 atomic 연산**.

## 메모리 구조

```
shared_ptr (16 byte):  [객체 ptr] [control block ptr]
                                       |
                                       v
                           [참조 카운트] [약한 카운트] [deleter] [allocator]
```

- 객체 포인터 + control block 포인터 → **shared_ptr 자체가 16 byte (포인터 2개)**
- control block은 힙에 따로 할당
- 참조 카운트 증감은 **atomic** → 단일 스레드 unique_ptr보다 느림

## control block의 생성 시점

control block은 **단 한 번**만 생성되어야 합니다. 잘못 만들면 같은 객체에 대해 두 개의 카운트가 생기고 → 이중 해제 → UB.

**위험한 패턴: 원시 포인터에서 두 번 wrap**

```cpp
auto* p = new Widget;
std::shared_ptr<Widget> s1(p);   // control block 1
std::shared_ptr<Widget> s2(p);   // control block 2 — 같은 객체에!
                                 // 두 개가 각자 delete 시도 → UB
```

**해결**: `make_shared` 사용 또는 원시 포인터를 한 번만 wrap.

```cpp
auto s = std::make_shared<Widget>();   // control block과 객체를 한 번에
auto t = s;                             // 카운트 증가만
```

## `enable_shared_from_this`

`this`로부터 안전하게 shared_ptr를 얻고 싶을 때.

```cpp
class Widget : public std::enable_shared_from_this<Widget> {
public:
    void process() {
        auto sp = shared_from_this();   // 이미 shared_ptr로 관리되어야 함
        // ...
    }
};
```

주의: `Widget`이 이미 shared_ptr로 관리되고 있어야 함. 그렇지 않으면 UB.

## 커스텀 deleter

unique_ptr와 달리 deleter 타입이 shared_ptr 타입에 박히지 않습니다 — type erasure가 control block 안에 들어가기 때문.

```cpp
auto del = [](Widget* p) { /* ... */ };
std::shared_ptr<Widget> p1(new Widget, del);  // 타입은 그냥 shared_ptr<Widget>
std::shared_ptr<Widget> p2(new Widget);       // 같은 타입
```

## 함정

- 같은 원시 포인터에서 여러 shared_ptr 만들기 → control block 중복
- 순환 참조 → 카운트가 0이 안 되어 메모리 누수 (item 20의 weak_ptr로 해결)
- `make_shared`는 객체+control block을 한 덩어리로 할당 → 객체 메모리가 weak 카운트 살아있는 동안 해제 안 됨 (큰 객체 + 긴 weak_ptr 수명이면 메모리 보유 시간 길어짐)

## 핵심 정리

1. shared_ptr = 객체 ptr + control block ptr (16 byte)
2. 참조 카운트는 atomic — 비싸고 thread-safe
3. control block은 객체당 단 한 번 — `make_shared` 사용
4. 커스텀 deleter는 type-erased
5. 순환 참조 위험 → `weak_ptr`로 끊기 (item 20)
