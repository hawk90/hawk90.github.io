---
title: "항목 49: new-handler의 동작을 이해하라"
date: 2025-02-08T10:00:00
description: "operator new 실패 시 호출되는 핸들러 — 설치, 동작, 클래스별 핸들러 패턴."
tags: [C++, Effective C++, new, Memory]
series: "Effective C++"
seriesOrder: 49
draft: true
---

> **초안** — 정리 진행 중

## 개요

`operator new`가 메모리를 못 구하면 **new-handler**가 호출됩니다. 핸들러는 사용자가 설치 가능 — 메모리를 더 확보, 다른 핸들러로 교체, `std::bad_alloc` throw, 또는 종료할 수 있음.

## 기본 사용

```cpp
#include <new>

void outOfMem() {
    std::cerr << "Out of memory\n";
    std::abort();
}

int main() {
    std::set_new_handler(outOfMem);   // 핸들러 설치 → 이전 핸들러 반환
    int* p = new int[100000000000UL]; // 실패 시 outOfMem 호출
}
```

## 핸들러가 해야 할 일

`operator new`는 **루프**로 핸들러를 반복 호출 — 핸들러는 다음 중 하나를 해야 합니다:

1. **메모리 확보** — 다른 곳에서 메모리 풀을 만들어 두고 release
2. **다른 핸들러 설치** — 다음 호출은 새 핸들러
3. **핸들러 제거** (`set_new_handler(nullptr)`) — `bad_alloc` throw 됨
4. **`bad_alloc` throw** — 명시적
5. **`abort` / `exit`** — 프로그램 종료

이 중 하나를 안 하면 무한 루프.

## 클래스별 new-handler 패턴

특정 클래스의 메모리 부족만 따로 처리하고 싶을 때.

```cpp
class Widget {
public:
    static std::new_handler set_new_handler(std::new_handler p) noexcept {
        std::new_handler old = currentHandler;
        currentHandler = p;
        return old;
    }

    static void* operator new(std::size_t size) {
        // 1. Widget 핸들러를 전역 핸들러로 임시 설치
        NewHandlerHolder h(std::set_new_handler(currentHandler));
        // 2. 일반 new 호출
        return ::operator new(size);
        // 3. h 소멸 → 원래 전역 핸들러 복원
    }

private:
    static std::new_handler currentHandler;
};

std::new_handler Widget::currentHandler = nullptr;

// RAII 핸들러
class NewHandlerHolder {
    std::new_handler handler;
public:
    explicit NewHandlerHolder(std::new_handler h) : handler(h) {}
    ~NewHandlerHolder() { std::set_new_handler(handler); }
    NewHandlerHolder(const NewHandlerHolder&) = delete;
    NewHandlerHolder& operator=(const NewHandlerHolder&) = delete;
};
```

CRTP로 일반화 가능.

## nothrow new

```cpp
Widget* p = new (std::nothrow) Widget;
if (p == nullptr) { /* 실패 */ }
```

`std::nothrow` 버전은 실패 시 `nullptr` 반환 (handler는 그래도 호출됨; 단 throw 안 함). 그러나 클래스 안에서 자체 메모리 할당은 throw할 수 있음 — "nothrow"가 완전 보장은 아님.

## 핵심 정리

1. `set_new_handler`로 메모리 부족 시 호출 함수 등록
2. 핸들러는 종료/throw/메모리 확보 등 명확한 행동 필수 (안 하면 무한 루프)
3. 클래스별 핸들러 패턴 가능
4. `new (std::nothrow)`는 nullptr 반환 — 그러나 완전 throw-free 아님
