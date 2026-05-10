---
title: "항목 21: new보다 std::make_unique와 std::make_shared를 선호하라"
date: 2025-01-07T13:00:00
description: "make 함수가 안전하고 효율적인 이유, 그리고 사용 못하는 예외 케이스."
tags: [C++, Smart Pointer, make_unique, make_shared, Modern C++]
series: "Effective Modern C++"
seriesOrder: 21
draft: true
---

> **초안** — 정리 진행 중

## 개요

`std::make_unique`(C++14)와 `std::make_shared`(C++11)는 **예외 안전성**, **효율성**, **가독성** 모두에서 직접 `new`보다 낫습니다.

## 이유 1: 예외 안전성

```cpp
processWidget(std::shared_ptr<Widget>(new Widget), computePriority());
//             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^
//             ① new Widget                          ③ computePriority()
//             ② shared_ptr 생성                     사이에서 예외가 나면?
```

C++17 이전 평가 순서로는 `new Widget` → `computePriority()` → shared_ptr 생성 순서가 가능. `computePriority()`가 예외를 던지면 **새로 할당된 Widget 누수**.

```cpp
// 안전한 형태
processWidget(std::make_shared<Widget>(), computePriority());
```

`make_shared`는 한 함수 호출이라 평가 순서 함정이 없음.

## 이유 2: 효율성 (`make_shared`)

`make_shared`는 객체와 control block을 **하나의 메모리 블록**으로 할당합니다.

```cpp
std::shared_ptr<Widget> sp1(new Widget);   // 두 번 할당: Widget, control block
auto                    sp2 = std::make_shared<Widget>();  // 한 번 할당
```

할당 횟수 절반, 캐시 지역성 개선.

## 이유 3: 가독성 + 타입 중복 제거

```cpp
std::shared_ptr<Widget> sp(new Widget);   // Widget 두 번 등장
auto                    sp = std::make_shared<Widget>();   // 한 번
```

## `make` 함수를 못 쓰는 경우

### 1. 커스텀 deleter

```cpp
auto del = [](Widget* p) { /* ... */ };
std::unique_ptr<Widget, decltype(del)> p(new Widget, del);  // make 불가
```

### 2. `{}` 초기화 리스트

`make` 함수는 `()`로 인자를 전달 → `{}` 리스트 생성자 호출 불가.

```cpp
auto p = std::make_shared<std::vector<int>>(10, 20);  // size 10, value 20
auto q = std::make_shared<std::vector<int>>({10, 20}); // 에러!

// 우회: 임시 list 만들고 perfect forwarding
auto initList = {10, 20};
auto p = std::make_shared<std::vector<int>>(initList);
```

### 3. `make_shared`의 메모리 보유 함정

`make_shared`는 객체 + control block 한 덩어리 → **weak_ptr가 살아있으면 객체 메모리도 해제 못 함**.

```cpp
auto sp = std::make_shared<HugeObject>();
std::weak_ptr<HugeObject> wp = sp;
sp.reset();              // 객체는 소멸되지만 메모리는 안 해제
                         // (control block + HugeObject 자리 모두 weak count 동안 보유)
```

큰 객체 + 긴 weak_ptr 수명 조합이면 `make_shared` 대신 `shared_ptr<T>(new T)`가 나을 수도.

## 핵심 정리

1. 기본은 `make_unique` / `make_shared`
2. 예외 안전 + 효율성(make_shared) + 가독성
3. 커스텀 deleter, `{}` 초기화는 직접 `new` 필요
4. `make_shared`는 weak_ptr 수명까지 메모리 보유 — 큰 객체에선 trade-off
