---
title: "항목 47: 타입 정보 획득에는 traits 클래스를 사용하라"
date: 2025-02-07T16:00:00
description: "iterator_traits 같은 traits 패턴 — 컴파일 타임에 타입별 분기."
tags: [C++, Effective C++, Template, Traits]
series: "Effective C++"
seriesOrder: 47
draft: true
---

> **초안** — 정리 진행 중

## 개요

타입에 대한 정보(반복자 카테고리, 값 타입 등)를 컴파일 타임에 알아내는 패턴이 **traits 클래스**입니다. 표준 라이브러리의 `std::iterator_traits`가 대표 예.

## 동기 — 반복자 카테고리별 advance 구현

```cpp
template<typename Iter, typename Dist>
void advance(Iter& iter, Dist d);
// random access iterator: iter += d (O(1))
// bidirectional iterator: while (d--) ++iter (O(d))
```

반복자 카테고리에 따라 효율이 다름. 컴파일 타임에 분기하고 싶음.

## traits — 카테고리 정보 매핑

```cpp
namespace std {
    template<typename Iter>
    struct iterator_traits {
        using iterator_category = typename Iter::iterator_category;
        using value_type        = typename Iter::value_type;
        using difference_type   = typename Iter::difference_type;
        // ...
    };

    // 포인터 부분 특수화
    template<typename T>
    struct iterator_traits<T*> {
        using iterator_category = random_access_iterator_tag;
        using value_type        = T;
        using difference_type   = ptrdiff_t;
    };
}
```

표준 컨테이너의 반복자는 `iterator_category` 멤버 typedef를 정의 → traits가 그대로 노출. 포인터는 부분 특수화로 처리.

## tag dispatch로 분기

```cpp
template<typename Iter, typename Dist>
void doAdvance(Iter& iter, Dist d, std::random_access_iterator_tag) {
    iter += d;
}

template<typename Iter, typename Dist>
void doAdvance(Iter& iter, Dist d, std::bidirectional_iterator_tag) {
    if (d >= 0) while (d--) ++iter;
    else        while (d++) --iter;
}

template<typename Iter, typename Dist>
void advance(Iter& iter, Dist d) {
    doAdvance(iter, d,
              typename std::iterator_traits<Iter>::iterator_category());
}
```

컴파일러가 iterator 카테고리에 맞는 오버로드 선택 — **컴파일 타임 분기, 0 비용**.

## traits 클래스 만들기 — 패턴 요약

1. 알고 싶은 정보 결정 (예: 카테고리, 사이즈, 자원 타입)
2. 그 정보 이름 선택 (예: `iterator_category`)
3. primary template (typedef를 그대로 노출)
4. 특수화로 사용자 정의/내장 타입 처리

## 핵심 정리

1. traits = 컴파일 타임에 타입 정보 추출하는 클래스 패턴
2. 부분 특수화로 내장 타입 등 특수 처리
3. tag dispatch로 컴파일 타임 분기 — 비용 0
4. 표준: `iterator_traits`, `numeric_limits`, `<type_traits>` 모두 같은 패턴
