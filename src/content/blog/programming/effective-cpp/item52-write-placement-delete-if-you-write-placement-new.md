---
title: "항목 52: placement new를 작성하면 placement delete도 작성하라"
date: 2025-02-08T13:00:00
description: "생성자 throw 시 메모리 누수 방지 — 짝 맞는 placement delete가 필요."
tags: [C++, Effective C++, new, delete, Placement]
series: "Effective C++"
seriesOrder: 52
draft: true
---

> **초안** — 정리 진행 중

## 개요

`new` 표현식은 두 단계 — `operator new`로 메모리 할당, 그 후 생성자 호출. 생성자가 throw하면 **컴파일러가 자동으로 메모리 해제**해야 하는데, 이때 **시그니처가 매칭되는 `operator delete`**를 호출. 사용자 정의 `operator new`(placement)가 있고 매칭되는 delete가 없으면 **메모리 누수**.

## placement new 예제

```cpp
class Widget {
public:
    static void* operator new(std::size_t size, std::ostream& log) {
        log << "allocating " << size << " bytes\n";
        return ::operator new(size);
    }
};

Widget* w = new (std::cerr) Widget;   // placement new 사용
```

`std::ostream&`이 추가 인자 — placement.

## 함정 — 짝 delete 없음

```cpp
Widget* w = new (std::cerr) Widget;
// 1. operator new(size, std::cerr) 호출 — 메모리 할당
// 2. Widget() 생성자 호출 — 만약 throw하면?
//    컴파일러는 매칭 placement delete를 찾음:
//    operator delete(void*, std::ostream&) — 없으면 아무 것도 호출 안 함
//    → 메모리 누수!
```

## 해결 — placement delete도 정의

```cpp
class Widget {
public:
    static void* operator new(std::size_t size, std::ostream& log) { /* ... */ }

    // 생성자 throw 시 컴파일러가 자동 호출
    static void operator delete(void* p, std::ostream& log) noexcept {
        ::operator delete(p);
    }

    // 정상 delete (코드에서 명시적 delete 호출 시)
    static void operator delete(void* p) noexcept {
        ::operator delete(p);
    }
};
```

매칭 시그니처는 `(void*, [추가 인자들])` — `operator new`의 `std::size_t`만 빼고 같음.

## 두 가지 delete 모두 필요

- **placement delete**: 생성자 throw 시 컴파일러가 호출
- **일반 delete**: 사용자가 `delete w;` 호출 시

둘 중 하나만 있으면 다른 시나리오에서 누수.

## 이름 가리기 함정

`operator new`를 클래스 안에 정의하면 같은 클래스의 `operator delete`도 가려짐 — 표준 `::operator new/delete`도 마찬가지. 필요하면 `using` 또는 명시 호출.

## 핵심 정리

1. placement new = 추가 인자를 받는 `operator new` 오버로드
2. 생성자 throw 시 매칭 placement delete 호출 — 없으면 누수
3. 짝 맞는 placement delete + 일반 delete 모두 정의
4. operator new를 클래스에 두면 base/global의 다른 버전 가려짐
