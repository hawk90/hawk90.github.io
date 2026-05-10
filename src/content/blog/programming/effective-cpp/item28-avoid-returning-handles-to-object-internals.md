---
title: "항목 28: 객체 내부 핸들 반환을 피하라"
date: 2025-02-05T12:00:00
description: "내부 데이터의 참조/포인터/반복자 반환은 캡슐화를 깨고 댕글링을 만든다."
tags: [C++, Effective C++, Encapsulation, Dangling]
series: "Effective C++"
seriesOrder: 28
draft: true
---

> **초안** — 정리 진행 중

## 개요

객체 내부 데이터에 대한 **참조·포인터·반복자**를 반환하면, 사용자가 우회로 캡슐화를 깨뜨리거나 객체 소멸 후 댕글링 핸들을 보유하게 됩니다.

## 캡슐화 위반

```cpp
class Rectangle {
    Point ulhc, lrhc;
public:
    Point& upperLeft() const { return ulhc; }   // 내부 참조 반환
};

Rectangle r;
r.upperLeft().setX(50);    // const 메서드인데 내부 데이터가 수정됨!
                            // const의 의미가 깨짐
```

해결: const 반환.

```cpp
const Point& upperLeft() const { return ulhc; }
```

## 댕글링 함정

```cpp
class GUIObject { /* ... */ };
const Rectangle bounds(const GUIObject& obj);

GUIObject* pgo = ...;
const Point* p = &(bounds(*pgo).upperLeft());
//               ^^^^^^^^^^^^^^ 임시 Rectangle
//                              upperLeft()의 참조 — 임시 안의 Point
// 표현식 끝에서 임시 Rectangle 소멸 → p는 댕글링!
```

내부 핸들 반환은 임시 객체와 결합하면 댕글링이 흔히 발생.

## 그래도 반환해야 한다면

- **`const` 참조/포인터**로 — 수정 차단
- 사용자에게 **수명 책임을 명확히 문서화**
- **소유권 이전**(unique_ptr 반환)이라면 안전

## 표준 라이브러리 예외

`vector::operator[]`, `string::data()` 등 표준 라이브러리도 내부 참조를 반환합니다 — 효율을 위해. 사용자가 컨테이너 수명을 잘 관리한다는 가정.

## 핵심 정리

1. 내부 데이터의 핸들 반환은 가능한 한 피하기
2. 어쩔 수 없으면 `const`로 — 수정 차단
3. 임시 객체에서 핸들 꺼내기는 댕글링 위험
4. 사용자에게 수명 책임 문서화
