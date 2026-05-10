---
title: "항목 42: 삽입(insertion) 대신 안치(emplacement)를 고려하라"
date: 2025-01-11T11:00:00
description: "emplace_back 등 emplace API가 push_back보다 효율적인 시점과 주의점."
tags: [C++, Container, Performance, Modern C++]
series: "Effective Modern C++"
seriesOrder: 42
draft: true
---

> **초안** — 정리 진행 중

## 개요

`std::vector::push_back(x)`는 `x`를 컨테이너에 **복사/이동**합니다. `emplace_back(args...)`는 컨테이너 안에서 **직접 객체를 생성**합니다 — 임시 객체가 사라집니다.

## push vs emplace

```cpp
std::vector<std::string> v;

v.push_back("hello");
// 1. const char* → std::string 임시 생성
// 2. 임시를 v 안으로 move
// 3. 임시 소멸

v.emplace_back("hello");
// 1. v 안에서 직접 std::string("hello") 생성
//    임시 객체 0개
```

## emplace가 이기는 조건

세 가지 조건을 모두 만족할 때 emplace가 진짜 이득:

1. **추가하려는 값이 컨테이너의 element 타입과 다름** — 변환이 필요
   ```cpp
   v.push_back(std::string("x"));   // 이미 string이면 push도 동일
   v.emplace_back("x");             // const char*에서 직접 생성 — 이득
   ```

2. **컨테이너가 중복을 거부하지 않음** (또는 거부해도 거의 추가 성공)
   ```cpp
   std::set<Widget> s;
   s.emplace(args...);   // Widget 만들고 검사 → 중복이면 즉시 폐기 (낭비)
   s.insert(w);          // 이미 있는 Widget 객체는 추가 실패해도 만들 필요 없음
   ```

3. **추가 방식이 컨테이너의 거부 사유와 무관** — 매번 일관되게 들어감

## emplace의 주의점

### 1. explicit 생성자 호출 가능

```cpp
struct Widget { explicit Widget(int); };

std::vector<Widget> v;
v.push_back(10);     // 에러 — 암묵 변환 막힘
v.emplace_back(10);  // OK — direct init이라 explicit도 호출
```

`emplace`는 **direct initialization** → explicit 생성자도 호출. 의도와 다른 객체 생성 위험.

### 2. resource leak 가능 (생성 중 예외 발생)

```cpp
std::list<std::shared_ptr<Widget>> l;

l.push_back({ new Widget, customDel });
// 임시 shared_ptr 생성 → push 도중 예외 나도 임시는 정리됨

l.emplace_back(new Widget, customDel);
// new Widget으로 raw pointer 만들고 → 컨테이너 안에서 shared_ptr 생성
// 그 사이에 예외 나면 raw pointer 누수!
```

`make_unique`/`make_shared`처럼 **자원 즉시 wrap** 패턴이 더 안전.

## 핵심 정리

1. emplace는 임시 객체 없이 컨테이너 안에서 직접 생성
2. 변환이 필요한 인자, 중복 거의 없는 컨테이너에서 이득
3. **explicit 생성자도 호출** — 의도치 않은 객체 생성 주의
4. raw resource(`new`) 직접 전달 시 예외-안전성 손실 위험
5. 무지성 emplace 치환 X — 조건 확인 후 적용
