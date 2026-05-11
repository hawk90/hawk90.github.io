---
title: "항목 19: 공유 소유 자원 관리에는 std::shared_ptr를 사용하라"
date: 2025-01-07T11:00:00
description: "참조 카운팅 + control block — 비용과 함정 (control block 중복, enable_shared_from_this)."
tags: [C++, Smart Pointer, shared_ptr, RAII, Modern C++]
series: "Effective Modern C++"
seriesOrder: 19
---

## 개요

`std::shared_ptr`는 **공유 소유**(shared ownership) — 마지막 참조가 사라질 때 자원 해제. 비용도 그만큼 큼: **2배 크기**, **참조 카운트 atomic 연산**, **control block 힙 할당**.

## 필수 개념: 참조 카운팅과 control block

> **초보자를 위한 배경 지식**

<br>

### shared_ptr의 메모리 구조

<img src="/images/blog/emc/diagrams/item19-shared-ptr-layout.svg" alt="shared_ptr 메모리 레이아웃" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

- 객체 포인터 + control block 포인터 → **shared_ptr 자체가 16 byte** (포인터 2개)
- control block은 힙에 따로 할당
- 참조 카운트 증감은 **atomic** → 단일 스레드 unique_ptr보다 느림

### control block의 내용

| 필드 | 의미 |
| --- | --- |
| **strong count** | 이 자원을 소유하는 shared_ptr 수 |
| **weak count** | 이 자원을 가리키는 weak_ptr 수 |
| **deleter** | 자원 해제 함수 (type-erased) |
| **allocator** | 메모리 할당기 |

strong count가 0이 되면 자원 해제. weak count가 0이 되면 control block 자체 해제.

## 비용 모델

### 1. 객체 크기

```cpp
sizeof(std::shared_ptr<Widget>);   // 16 byte (보통 — 포인터 2개)
sizeof(std::unique_ptr<Widget>);   //  8 byte
sizeof(Widget*);                    //  8 byte
```

→ shared_ptr는 raw pointer 두 배.

### 2. control block 메모리

별도 힙 할당. `make_shared`는 객체와 함께 한 번에 할당 — 효율적 ([항목 21](/blog/programming/effective-modern-cpp/item21-prefer-make-unique-and-make-shared-to-direct-new)).

### 3. atomic 연산

참조 카운트 ++/-- 가 atomic — 단일 스레드 사용에서도 비용. 일반 변수의 ++ 보다 수십 배 느림.

→ **공유 소유 진짜 필요할 때만**. 그렇지 않으면 unique_ptr.

## control block의 생성 시점

control block은 **단 한 번**만 생성되어야 — 잘못하면 같은 객체에 두 개 생기고 → **이중 해제** → UB.

### 안전한 생성 — `make_shared` 또는 한 번만 wrap

```cpp
auto sp = std::make_shared<Widget>();   // 권장 — control block과 객체를 한 번에
auto sp2 = sp;                          // 카운트 증가만
```

### ❌ 위험 — 원시 포인터에서 두 번 wrap

```cpp
auto* p = new Widget;
std::shared_ptr<Widget> s1(p);   // control block 1
std::shared_ptr<Widget> s2(p);   // control block 2 — 같은 객체에!
                                 // 두 개가 각자 delete 시도 → UB
```

→ **raw pointer는 한 번만 shared_ptr로 wrap**. 또는 처음부터 `make_shared`.

### 함정 — `this`로 shared_ptr 만들기

```cpp
class Widget {
public:
    void process() {
        std::shared_ptr<Widget> sp(this);   // 위험! 새 control block 생성
    }
};

auto w = std::make_shared<Widget>();
w->process();   // 두 번째 control block — 이중 해제
```

해결 — `enable_shared_from_this`.

## `enable_shared_from_this`

`this`로부터 안전하게 shared_ptr 얻기:

```cpp
class Widget : public std::enable_shared_from_this<Widget> {
public:
    void process() {
        auto sp = shared_from_this();   // 같은 control block의 shared_ptr
    }
};

auto w = std::make_shared<Widget>();
w->process();   // OK
```

> ⚠️ **`Widget`이 이미 shared_ptr로 관리되고 있어야 함**. 그렇지 않으면 `bad_weak_ptr` 예외 (C++17+) 또는 UB.

→ **객체를 항상 shared_ptr로 만들도록 강제**. `private` 생성자 + `static create()` 패턴.

```cpp
class Widget : public std::enable_shared_from_this<Widget> {
public:
    static std::shared_ptr<Widget> create() {
        return std::shared_ptr<Widget>(new Widget);
    }
private:
    Widget();   // private — 외부에서 직접 생성 금지
};
```

## 커스텀 deleter

`unique_ptr`와 달리 deleter 타입이 shared_ptr 타입에 박히지 않음 — type erasure 덕분.

```cpp
auto del = [](Widget* p) { /* ... */ };
std::shared_ptr<Widget> p1(new Widget, del);   // 타입은 그냥 shared_ptr<Widget>
std::shared_ptr<Widget> p2(new Widget);        // 같은 타입
```

같은 컨테이너에 함께 보관 가능:
```cpp
std::vector<std::shared_ptr<Widget>> v = {p1, p2};
```

deleter는 control block에 보관 — sizeof(shared_ptr)는 그대로.

## 흔한 함정 — 사이클 (Cycles)

```cpp
struct Node {
    std::shared_ptr<Node> next;
};

auto a = std::make_shared<Node>();
auto b = std::make_shared<Node>();
a->next = b;
b->next = a;   // 사이클!
              // a, b의 strong count가 영원히 0 안 됨 → 메모리 누수
```

해결: 한쪽을 **`weak_ptr`** ([항목 20](/blog/programming/effective-modern-cpp/item20-use-weak-ptr-for-shared-ptr-like-pointers-that-can-dangle)).

```cpp
struct Node {
    std::shared_ptr<Node> next;
    std::weak_ptr<Node>   prev;   // weak — 카운트 증가 X
};
```

## `make_shared` vs `shared_ptr<T>(new T)`

```cpp
auto sp1 = std::make_shared<Widget>();          // 권장
std::shared_ptr<Widget> sp2(new Widget);         // 두 번 할당 (객체 + control block)
```

`make_shared`는 객체와 control block을 **한 메모리 블록**으로 — 두 번 할당 → 한 번. 자세한 건 [항목 21](/blog/programming/effective-modern-cpp/item21-prefer-make-unique-and-make-shared-to-direct-new).

## shared_ptr → unique_ptr 변환?

❌ **불가**. unique_ptr → shared_ptr만 가능 (자연스러운 방향).

```cpp
auto u = std::make_unique<Widget>();
std::shared_ptr<Widget> s = std::move(u);   // OK

std::shared_ptr<Widget> sp = std::make_shared<Widget>();
std::unique_ptr<Widget> up = sp;   // 에러 — 공유 → 독점 안 됨
```

## 함정 — multiple shared_ptr from one raw

```cpp
auto* raw = new Widget;
std::shared_ptr<Widget> s1(raw);
std::shared_ptr<Widget> s2(raw);   // ⚠️ 두 control block

// 또는 함수 인자로 두 번
void f(std::shared_ptr<Widget>);
f(std::shared_ptr<Widget>(raw));
f(std::shared_ptr<Widget>(raw));   // 같은 문제
```

→ **`make_shared`가 가장 안전**.

## 메모리 함정 — `make_shared`의 단점

`make_shared`는 객체 + control block 한 덩어리 → **weak_ptr가 살아있으면 객체 메모리도 못 해제**.

```cpp
auto sp = std::make_shared<HugeObject>();
std::weak_ptr<HugeObject> wp = sp;
sp.reset();              // 객체는 소멸자 호출되지만 메모리는 안 해제
                          // (control block + HugeObject 자리 모두 weak 카운트 동안 보유)
```

큰 객체 + 긴 weak_ptr 수명이면 `shared_ptr<T>(new T)` 형태가 나을 수도.

## 비교 — 한눈에

| | `unique_ptr` | `shared_ptr` |
| --- | --- | --- |
| 소유 | 독점 | 공유 |
| 크기 | sizeof(ptr) | 2 × sizeof(ptr) |
| control block | 없음 | 별도 힙 |
| 참조 카운트 | 없음 | atomic |
| 복사 | ❌ | ✅ |
| 이동 | ✅ | ✅ |
| 사이클 | 자연 회피 | weak_ptr 필요 |
| deleter 타입 | 타입에 박힘 | type-erased |
| 변환 | → shared_ptr OK | → unique_ptr X |

## 핵심 정리

1. **shared_ptr = 객체 ptr + control block ptr** (16 byte)
2. **참조 카운트는 atomic** — 비용
3. **control block은 객체당 단 한 번** — `make_shared` 권장
4. 커스텀 deleter는 **type-erased** (타입에 안 박힘)
5. **사이클은 `weak_ptr`로 끊기** ([항목 20](/blog/programming/effective-modern-cpp/item20-use-weak-ptr-for-shared-ptr-like-pointers-that-can-dangle))
6. `enable_shared_from_this`로 `this`로부터 shared_ptr
7. 진짜 공유 소유에만 — 그렇지 않으면 unique_ptr

## 관련 항목

- [항목 18: unique_ptr](/blog/programming/effective-modern-cpp/item18-use-unique-ptr-for-exclusive-ownership)
- [항목 20: weak_ptr](/blog/programming/effective-modern-cpp/item20-use-weak-ptr-for-shared-ptr-like-pointers-that-can-dangle)
- [항목 21: `make_*` 함수](/blog/programming/effective-modern-cpp/item21-prefer-make-unique-and-make-shared-to-direct-new)
