---
title: "항목 15: memset과 memcpy 대신 생성자와 할당 연산자를 사용하라"
date: 2026-05-09T14:00:00
description: "객체에 바이트 단위 연산을 적용했을 때의 위험과 올바른 대안"
tags: [C++, Constructor, Undefined Behavior]
series: "Beautiful C++"
seriesOrder: 15
draft: false
---


## 핵심 내용

- `memset`/`memcpy`는 **바이트 단위 복사**일 뿐 — 타입의 의미를 무시한다
- vtable 포인터, 가상 베이스, `std::string`·`std::vector` 같은 타입을 `memset`으로 0 초기화하면 **즉시 UB**
- 생성자/대입 연산자는 **불변식·소유권·자원 관리**를 책임진다
- `memset`은 진짜 trivially copyable한 POD에만, 그것도 의식적으로 사용하라

## 예제 코드

```cpp
// Bad: 객체를 memset으로 0 클리어 — vtable·string 망가짐
class Widget {
    std::string name_;
    std::vector<int> data_;
};

Widget w;
std::memset(&w, 0, sizeof(w));  // UB! string/vector 내부 포인터 박살

// Bad: 객체 복사를 memcpy로
Widget src, dst;
std::memcpy(&dst, &src, sizeof(Widget));  // UB! 두 객체가 같은 힙 버퍼 소유

// Good: 생성자/대입 연산자 사용
Widget w{};                       // 값 초기화
Widget dst = src;                 // 복사 생성자 호출
dst = src;                        // 복사 대입 호출
```

## 정리

C++ 객체는 **생성자가 만들고 소멸자가 끝낸다**. 바이트 복사는 생명주기를 우회하므로, 진짜 POD가 아니라면 절대 쓰지 마라.
