---
title: "항목 51: new와 delete를 작성할 때 규약을 따르라"
date: 2025-02-08T12:00:00
description: "operator new/delete 구현 시 지켜야 할 표준 규약 — handler 호출, 0 처리, 정렬."
tags: [C++, Effective C++, new, delete]
series: "Effective C++"
seriesOrder: 51
draft: true
---

> **초안** — 정리 진행 중

## 개요

`operator new`와 `operator delete`를 직접 작성한다면 지켜야 할 **규약**이 있습니다.

## `operator new` 규약

1. **올바른 반환값** — 성공 시 메모리 포인터, 실패 시 `bad_alloc` throw
2. **handler 호출 루프** — 메모리 부족 시 `new_handler`를 부르고 다시 시도
3. **0-byte 요청 처리** — 표준은 0 byte 요청에도 유효 포인터 반환 의무
4. **상속 시 sized 요청 처리** — derived의 `new`로 base 크기 요청 시 표준 `::operator new`로 위임

```cpp
void* operator new(std::size_t size) {
    if (size == 0) size = 1;     // 0-byte를 1-byte로
    while (true) {
        void* p = ::malloc(size);
        if (p) return p;

        std::new_handler h = std::set_new_handler(nullptr);
        std::set_new_handler(h);

        if (h) (*h)();           // handler 호출
        else throw std::bad_alloc();
    }
}
```

## 클래스 멤버 `operator new` 규약

```cpp
class Base {
public:
    static void* operator new(std::size_t size) {
        if (size != sizeof(Base))
            return ::operator new(size);   // derived의 큰 요청은 글로벌로
        // Base 전용 처리
    }
};
```

`Base`의 `operator new`를 derived가 상속해도, derived 객체 크기는 다름 → 위임 필요.

## `operator delete` 규약

1. **null 포인터는 OK** — `delete nullptr`는 합법 동작 (no-op)
2. **비-멤버: 표준 `::operator delete` 시그니처 일치**
3. **클래스 멤버: 잘못된 크기는 글로벌로 위임**

```cpp
void operator delete(void* p) noexcept {
    if (p == nullptr) return;
    ::free(p);
}

class Base {
    static void operator delete(void* p, std::size_t size) noexcept {
        if (p == nullptr) return;
        if (size != sizeof(Base)) {
            ::operator delete(p);
            return;
        }
        // Base 전용 처리
    }
};
```

## 짝 맞춤

`operator new`를 정의하면 **짝이 되는 `operator delete`도** 정의해야 함. 한쪽만 있으면 메모리 누수 또는 mismatch.

## C++17+: align-aware 오버로드

```cpp
void* operator new(std::size_t size, std::align_val_t alignment);
void  operator delete(void* p, std::align_val_t alignment) noexcept;
```

엄격한 정렬이 필요한 타입에 대해 컴파일러가 이 버전을 호출.

## 핵심 정리

1. `operator new`는 handler 루프, 0-byte 처리, 잘못된 크기 위임
2. `operator delete`는 null 처리, mismatch 위임
3. new/delete는 짝으로
4. C++17 align-aware 버전도 고려
