---
title: "항목 49: new-handler의 동작을 이해하라"
date: 2025-02-08T10:00:00
description: "operator new 실패 시 호출되는 핸들러 — 설치, 동작 규칙, 클래스별 핸들러, nothrow 패턴."
tags: [C++, Effective C++, new, Memory]
series: "Effective C++"
seriesOrder: 49
---

## 개요

`operator new`가 메모리를 못 구하면 — 곧바로 `std::bad_alloc`을 던지지 않습니다. 먼저 등록된 **new-handler**(함수)를 호출하고, 그 핸들러가 적절한 조치를 한 후 다시 할당을 시도합니다. 사용자는 이 핸들러를 설치해서 — 메모리 풀에서 release, 다른 핸들러로 교체, `bad_alloc` 던지기, 종료 등 — 다양한 정책을 구현할 수 있습니다.

## 기본 사용 — `std::set_new_handler`

```cpp
#include <new>
#include <iostream>
#include <cstdlib>

void outOfMem() {
    std::cerr << "Unable to satisfy request for memory\n";
    std::abort();
}

int main() {
    std::set_new_handler(outOfMem);     // 핸들러 설치

    int* p = new int[100'000'000'000UL];     // 메모리 부족
    // → outOfMem 호출 → abort
}
```

`std::set_new_handler` 시그니처:

```cpp
namespace std {
    using new_handler = void (*)();
    new_handler set_new_handler(new_handler p) noexcept;     // 이전 핸들러 반환
}
```

이전 핸들러를 반환 — 백업/복원 패턴에 사용.

## `operator new`의 처리 루프

표준 `operator new`의 대략적 동작:

```cpp
void* operator new(std::size_t size) {
    while (true) {
        void* p = std::malloc(size);
        if (p) return p;                          // 성공

        // 메모리 부족 — 핸들러 호출
        std::new_handler h = std::set_new_handler(nullptr);
        std::set_new_handler(h);                   // 다시 설치 (조회만 한 셈)

        if (h)
            (*h)();                                // 핸들러 호출
        else
            throw std::bad_alloc();                // 핸들러 없으면 throw
    }
}
```

**루프** — 핸들러가 메모리를 확보했을 가능성에 다시 시도. 핸들러가 종료/throw 하지 않으면 무한 루프.

## 핸들러가 해야 할 일 — 다섯 가지 옵션

핸들러는 다음 중 하나를 **반드시** 수행해야 함:

### 1) 메모리 확보

미리 잡아둔 풀에서 release.

```cpp
class Pool {
    static char buffer[BIG_SIZE];
    static bool released;
public:
    static void release() {
        // 사용 가능한 메모리로 풀 등록
        // (예: 전역 할당기에 추가)
        released = true;
    }
};

void handlerWithPool() {
    if (!Pool::released) {
        Pool::release();
        return;     // 다시 시도 — 풀 메모리 사용 가능
    }
    std::abort();
}
```

### 2) 다른 핸들러 설치

```cpp
void firstHandler() {
    std::set_new_handler(strictHandler);     // 더 강력한 핸들러로
    // 또는 reset
}

void strictHandler() {
    std::abort();
}
```

상황별 다른 정책 적용.

### 3) 핸들러 제거

```cpp
void giveUp() {
    std::set_new_handler(nullptr);     // 다음 할당은 bad_alloc throw
}
```

### 4) `bad_alloc` 명시 throw

```cpp
void throwBadAlloc() {
    throw std::bad_alloc();
}
```

기본 동작과 동일하지만 명시적.

### 5) 종료

```cpp
void terminate() {
    std::abort();
    // 또는 std::exit(1);
}
```

이 다섯 중 **아무것도 안 하면 무한 루프** — 핸들러가 반환 → operator new가 다시 호출 → 또 핸들러 ... 영원히.

## 클래스별 new-handler 패턴

특정 클래스의 메모리 부족만 별도 처리하고 싶을 때.

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
        // 2. 일반 new 호출 — 실패하면 currentHandler 호출됨
        return ::operator new(size);
        // 3. h 소멸 → 원래 전역 핸들러 복원
    }

private:
    static std::new_handler currentHandler;
};

std::new_handler Widget::currentHandler = nullptr;
```

RAII로 핸들러 복원:

```cpp
class NewHandlerHolder {
    std::new_handler handler;
public:
    explicit NewHandlerHolder(std::new_handler h) : handler(h) {}
    ~NewHandlerHolder() { std::set_new_handler(handler); }

    NewHandlerHolder(const NewHandlerHolder&) = delete;
    NewHandlerHolder& operator=(const NewHandlerHolder&) = delete;
};
```

사용:

```cpp
void widgetHandler() {
    // Widget의 풀에서 메모리 확보 시도
}

int main() {
    Widget::set_new_handler(widgetHandler);
    Widget* w = new Widget;     // 실패 시 widgetHandler 호출
                                 // 다른 new는 전역 핸들러 사용
}
```

## CRTP로 일반화

여러 클래스에 동일 패턴 적용:

```cpp
template<typename T>
class NewHandlerSupport {
public:
    static std::new_handler set_new_handler(std::new_handler p) noexcept {
        std::new_handler old = currentHandler;
        currentHandler = p;
        return old;
    }

    static void* operator new(std::size_t size) {
        NewHandlerHolder h(std::set_new_handler(currentHandler));
        return ::operator new(size);
    }

private:
    static std::new_handler currentHandler;
};

template<typename T>
std::new_handler NewHandlerSupport<T>::currentHandler = nullptr;

class Widget : public NewHandlerSupport<Widget> {
    // Widget::set_new_handler, Widget::operator new 자동
};
```

각 derived 클래스가 자신만의 `currentHandler`를 가짐.

## `nothrow` new — 다른 실패 모델

```cpp
Widget* p = new (std::nothrow) Widget;
if (p == nullptr) {
    // 실패 처리
}
```

`std::nothrow` 버전:
- 실패 시 `nullptr` 반환 (throw 안 함)
- 생성자 자체가 throw하면 그대로 전파 — "nothrow"는 `operator new`만의 의미

```cpp
class Throwing {
public:
    Throwing() { throw std::runtime_error("oops"); }
};

auto* p = new (std::nothrow) Throwing;     // ⚠️ 생성자가 throw — 그대로 전파
                                            //    nothrow는 operator new 한정
```

`nothrow` 사용 시:
- new가 메모리 실패 → nullptr 반환
- 메모리는 OK, 생성자 실패 → 정상 throw

미묘한 차이 — `nothrow` ≠ "절대 throw 안 함".

## C++11+ 추가 변형

```cpp
// 글로벌 set_new_handler (single)
void  setH() { std::set_new_handler(myHandler); }

// std::get_new_handler() — 현재 등록된 핸들러 조회 (C++11+)
auto h = std::get_new_handler();
```

`get_new_handler`로 set 후 한 번 더 호출하는 우회 없이 직접 조회.

## 흔한 함정

### 핸들러 무한 루프

```cpp
void buggy() {
    std::cerr << "Out of memory, trying again...\n";
    // 아무 조치도 안 함 → 메모리 상태 그대로
}
// → operator new 재시도 → 또 실패 → 또 buggy → ... 무한 루프
```

### 핸들러 안에서 메모리 할당

```cpp
void allocates() {
    std::vector<int> v(1000);     // ⚠️ 핸들러 안에서 또 메모리 할당!
                                   //    실패 시 또 핸들러 호출 — 재귀
}
```

핸들러 안에서는 추가 할당을 피해야 함 — pre-allocated 자원만 사용.

### 핸들러의 thread safety

```cpp
std::new_handler globalH = myHandler;

void otherThread() {
    std::set_new_handler(otherH);     // ⚠️ 다른 스레드의 핸들러 교체
}
```

`set_new_handler`는 단일 글로벌 상태 — 멀티스레드에서 신중. C++11+ `noexcept` 보장은 있지만 정책 충돌 가능.

## 모던 변형 — `std::pmr` (C++17)

C++17 polymorphic memory resource 도구로 — 핸들러보다 더 세밀한 메모리 제어:

```cpp
std::pmr::monotonic_buffer_resource pool(1024 * 1024);
std::pmr::vector<int> v(&pool);
// 풀에서 메모리 — new-handler 불필요
```

용도가 다르지만 — 메모리 관리의 모던 도구.

## 실무 가이드 — 결정

```
메모리 부족 시 어떻게 처리할 것인가?
├── 단순 종료 → 기본 동작 (std::bad_alloc) 또는 abort 핸들러
├── 미리 잡아둔 풀에서 release → handler에서 release + 재시도
├── 특정 클래스만 다른 정책 → 클래스별 new-handler (CRTP)
├── 실패를 정상 흐름으로 → new (std::nothrow) + nullptr 검사
└── 모던 메모리 풀 → std::pmr (C++17)
```

## 실무 가이드 — 체크리스트

- [ ] 핸들러가 다섯 옵션 중 하나를 명확히 수행하는가?
- [ ] 핸들러 안에서 추가 메모리 할당하지 않는가?
- [ ] 클래스별 핸들러 — RAII로 복원 보장?
- [ ] thread safety — 단일 글로벌 상태 인지?
- [ ] `nothrow` 사용 시 — 생성자 throw도 처리?
- [ ] 정말 핸들러가 필요한가, 표준 동작으로 충분한가?

## 핵심 정리

1. **`std::set_new_handler`** 로 메모리 부족 시 호출 함수 등록
2. **핸들러는 다섯 옵션 중 하나 수행 필수** — 아니면 무한 루프
3. **클래스별 핸들러** — `operator new` 오버로드 + RAII 복원
4. CRTP로 패턴 일반화
5. `new (std::nothrow)` — 메모리 실패만 nullptr, 생성자 throw는 그대로
6. C++17 `std::pmr` — 모던 메모리 풀 대안

## 관련 항목

- [항목 50: new/delete 교체 시기](/blog/programming/effective-cpp/item50-understand-when-it-makes-sense-to-replace-new-and-delete) — 사용자 정의 할당
- [항목 51: new/delete 규약](/blog/programming/effective-cpp/item51-adhere-to-convention-when-writing-new-and-delete) — 직접 작성 규칙
- [항목 52: placement delete](/blog/programming/effective-cpp/item52-write-placement-delete-if-you-write-placement-new) — 짝 맞춤
