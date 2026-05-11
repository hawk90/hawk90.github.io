---
title: "항목 18: 독점 소유 자원 관리에는 std::unique_ptr를 사용하라"
date: 2025-01-07T10:00:00
description: "독점 소유의 표준 — 일반 포인터 크기, 자동 해제, 팩토리 함수 반환의 default."
tags: [C++, Smart Pointer, unique_ptr, RAII, Modern C++]
series: "Effective Modern C++"
seriesOrder: 18
---

## 개요

`std::unique_ptr`는 **독점 소유**(exclusive ownership)를 표현하는 스마트 포인터. 일반 포인터와 거의 같은 크기·속도이면서 자동 해제 보장. **팩토리 함수의 기본 반환 타입**으로 가장 적합.

## 필수 개념: 소유권 모델

> **초보자를 위한 배경 지식**

<br>

스마트 포인터는 자원의 **소유권**을 명시적으로 표현:

| 모델 | 표현 | 의미 |
| --- | --- | --- |
| **독점 소유** | `unique_ptr<T>` | 한 객체만 보유 — 사라지면 자원 해제 |
| **공유 소유** | `shared_ptr<T>` | 여러 객체가 공유 — 마지막 사라지면 해제 |
| **약한 참조** | `weak_ptr<T>` | shared_ptr를 관찰만 — 소유권 X |

→ **독점 = 가장 단순 + 가장 효율적**. 거의 모든 동적 자원 보유의 default.

## 기본 사용

```cpp
auto p = std::make_unique<Widget>(args...);   // 권장
std::unique_ptr<Widget> q(new Widget(args...)); // 동등 (그러나 권장 X — item 21)

p->doSomething();
*p = something;
// p가 스코프 벗어나면 자동 delete
```

## 독점 소유의 의미

- **복사 불가** — copy ctor/assignment = `delete`
- **이동 가능** — 소유권을 다른 unique_ptr로 넘김

```cpp
auto p1 = std::make_unique<Widget>();
auto p2 = p1;            // 에러! 복사 불가
auto p3 = std::move(p1); // OK — p1은 nullptr가 됨
```

이게 "독점"의 핵심 — 동시에 두 ptr가 같은 자원 못 가짐.

## 크기 — 일반 포인터와 거의 같음

```cpp
sizeof(std::unique_ptr<Widget>);   // 보통 sizeof(Widget*) — 8 byte (64-bit)
```

오버헤드 거의 없음. 호출도 인라인 — raw pointer와 같은 코드 생성.

(예외: 커스텀 deleter 보유하면 deleter 크기만큼 추가.)

## 팩토리 함수 패턴

```cpp
class Investment {
public:
    virtual ~Investment() = default;
    virtual void doStuff() = 0;
};

class Stock : public Investment { /* ... */ };
class Bond : public Investment { /* ... */ };

template<typename... Ts>
std::unique_ptr<Investment> makeInvestment(Ts&&... params) {
    if (/* condition */) return std::make_unique<Stock>(/* ... */);
    else                 return std::make_unique<Bond>(/* ... */);
}

// 사용
auto inv = makeInvestment(/* ... */);
inv->doStuff();
// 자동 해제
```

`shared_ptr`로 바꾸기도 쉬움 — `unique_ptr`는 `shared_ptr`로 **암묵 변환**:

```cpp
std::shared_ptr<Investment> shared = makeInvestment(/* ... */);
                                      // unique_ptr → shared_ptr 자동 변환
```

→ **팩토리는 unique_ptr 반환**이 가장 유연.

## 커스텀 deleter

```cpp
auto delInv = [](Investment* p) {
    log_destroy(p);
    delete p;
};

std::unique_ptr<Investment, decltype(delInv)> inv(new Stock(...), delInv);
```

deleter **타입이 unique_ptr 타입의 일부**가 되므로 시그니처가 길어짐.

### 함수 포인터 deleter — 객체 크기 ↑

```cpp
void deleteInv(Investment* p) { delete p; }

std::unique_ptr<Investment, void(*)(Investment*)> inv(new Stock, deleteInv);

sizeof(inv);   // sizeof(Investment*) + sizeof(function pointer) = 16 byte
```

### 람다 deleter (캡처 없음) — 크기 같음

```cpp
auto delInv = [](Investment* p) { delete p; };

std::unique_ptr<Investment, decltype(delInv)> inv(new Stock, delInv);

sizeof(inv);   // 8 byte — 캡처 없는 람다는 stateless
```

→ **함수 포인터보다 람다 권장**.

### 캡처 있는 람다 — 크기 ↑

```cpp
auto delInv = [logger](Investment* p) { logger->log(p); delete p; };
                                      // logger 캡처 → 람다가 상태 보유

std::unique_ptr<Investment, decltype(delInv)> inv(/* ... */);

sizeof(inv);   // sizeof(Investment*) + sizeof(logger 캡처) = ?
```

## 배열 버전 — `std::unique_ptr<T[]>`

```cpp
std::unique_ptr<int[]> arr(new int[10]);   // T[] 특수화
arr[0] = 1;                                 // operator[]
                                            // operator-> / operator* 없음
```

다만 `std::array`, `std::vector`가 거의 항상 더 나은 선택. `unique_ptr<T[]>`는 C API 호환 같은 특수 경우만.

## 표준 라이브러리에서

`unique_ptr`는 표준 곳곳에:

- **Pimpl**의 표준 ([항목 22](/blog/programming/effective-modern-cpp/item22-when-using-pimpl-define-special-members-in-impl-file))
- 팩토리 함수 표준 반환 타입
- `std::function`이 큰 함수 객체 보유할 때

## `unique_ptr`의 두 형태 (요약)

| | `unique_ptr<T>` | `unique_ptr<T[]>` |
| --- | --- | --- |
| 사용 | 단일 객체 | 동적 배열 |
| `operator*`, `->` | ✅ | ❌ |
| `operator[]` | ❌ | ✅ |
| 권장 | ✅ 자주 | ⚠️ 드물게 (vector 권장) |

## `make_unique` (C++14) 권장

```cpp
auto p = std::make_unique<Widget>(args);     // 권장
std::unique_ptr<Widget> q(new Widget(args)); // 권장 X
```

이유 ([항목 21](/blog/programming/effective-modern-cpp/item21-prefer-make-unique-and-make-shared-to-direct-new) 참고):
1. **예외 안전**
2. **타입 중복 제거** (`Widget` 한 번만)
3. **shared_ptr와 일관성**

C++11엔 `make_unique` 없음 — 직접 작성:

```cpp
template<typename T, typename... Ts>
std::unique_ptr<T> make_unique(Ts&&... params) {
    return std::unique_ptr<T>(new T(std::forward<Ts>(params)...));
}
```

## 함정 — `release()` vs `reset()`

```cpp
auto p = std::make_unique<Widget>();

Widget* raw = p.release();   // 소유권 포기 — p는 nullptr, raw 사용자가 책임
delete raw;                   // 직접 해제

p.reset(new Widget);          // 기존 자원 해제 + 새 자원 보유
p.reset();                    // 자원 해제 + nullptr
```

`release()`는 자원 해제 안 함 — 호출자에게 책임 넘김.

## 함정 — 사이클 (cycles)

`unique_ptr`만으로는 사이클 안 만들어짐 (한 ptr만 가능). 대신 raw pointer로 부모를 가리키는 패턴:

```cpp
struct Node {
    std::unique_ptr<Node> child;
    Node*                 parent;   // raw — 소유 X
};
```

`shared_ptr` 사이클은 `weak_ptr`로 ([항목 19, 20](/blog/programming/effective-modern-cpp/item19-use-shared-ptr-for-shared-ownership)).

## 핵심 정리

1. **독점 소유 RAII의 표준 도구** — 일반 포인터와 거의 같은 비용
2. **`make_unique`로 생성** ([항목 21](/blog/programming/effective-modern-cpp/item21-prefer-make-unique-and-make-shared-to-direct-new))
3. **shared_ptr로 한 줄 변환** 가능 — 팩토리 반환 타입으로 적합
4. 커스텀 deleter는 타입에 박힘 — 람다(stateless) 권장
5. 배열은 `vector`/`array`가 보통 더 나음

## 관련 항목

- [항목 19: shared_ptr](/blog/programming/effective-modern-cpp/item19-use-shared-ptr-for-shared-ownership) — 공유 소유
- [항목 21: `make_unique`/`make_shared`](/blog/programming/effective-modern-cpp/item21-prefer-make-unique-and-make-shared-to-direct-new)
- [항목 22: Pimpl](/blog/programming/effective-modern-cpp/item22-when-using-pimpl-define-special-members-in-impl-file)
