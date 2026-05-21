---
title: "항목 21: new보다 std::make_unique와 std::make_shared를 선호하라"
date: 2026-05-04T21:00:00
description: "make 함수가 안전·효율·가독성 모두 우월. 사용 못 하는 예외 케이스도."
tags: [C++, Smart Pointer, make_unique, make_shared, Modern C++]
series: "Effective Modern C++"
seriesOrder: 21
draft: true
---

## 왜 이 항목이 중요한가?

smart pointer를 만드는 방법은 두 가지다. 직접 `new`로 만들고 wrap하거나, `make_*` 함수를 쓰거나. 둘 다 같은 결과처럼 보이지만 세 가지 자리에서 결정적으로 다르다.

- **예외 안전** — 함수 인자에서 `new`와 다른 함수를 함께 평가하면 누수가 일어날 수 있다.
- **효율** — `make_shared`는 객체와 control block을 한 번에 할당해 메모리 할당 횟수를 절반으로 줄인다.
- **가독성** — 타입을 한 번만 쓴다. `auto`와 자연스럽게 짝을 이룬다.

다만 `make_*`가 모든 자리에서 쓰일 수는 없다. 커스텀 deleter, `{}` 초기화 리스트, 큰 객체 + 긴 weak_ptr 수명 등 직접 `new`가 더 나은 케이스가 있다.

## 개요

`std::make_unique`(C++14)와 `std::make_shared`(C++11)는 **예외 안전**, **효율**, **가독성** 모두에서 직접 `new`보다 낫다. 이 항목은 세 가지 이유와 사용 못 하는 예외 케이스를 본다.

## 필수 개념: `make_*` 함수의 정의

> **초보자를 위한 배경 지식**

<br>

```cpp
template<typename T, typename... Ts>
std::unique_ptr<T> std::make_unique(Ts&&... params);

template<typename T, typename... Ts>
std::shared_ptr<T> std::make_shared(Ts&&... params);
```

내부 동작은 이렇다.

- 인자를 perfect forward.
- 새 T를 생성.
- 적절한 smart pointer로 wrap해 반환.

```cpp
auto p = std::make_unique<Widget>(arg1, arg2);
// 내부:
//   return std::unique_ptr<Widget>(new Widget(arg1, arg2));
```

## 이유 1 — 예외 안전

### 함정 — C++17 이전

```cpp
processWidget(std::shared_ptr<Widget>(new Widget), computePriority());
//             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^
//             ① new Widget                          ③ computePriority()
//             ② shared_ptr 생성                     사이에서 예외가 나면?
```

C++14 이전 평가 순서로는 이렇다.

1. `new Widget`.
2. `computePriority()` 호출 — **여기서 예외 발생**.
3. `shared_ptr` 생성 (도달 못 함).

raw pointer **누수**다.

### 해결 — `make_shared`

```cpp
processWidget(std::make_shared<Widget>(), computePriority());
```

`make_shared`는 한 함수 호출이라 평가 순서 함정이 없다. 누수가 없다.

### C++17 변경

C++17부터 함수 인자 평가 순서는 여전히 미지정이지만, 같은 인자 안의 부속 표현식들은 **인터리브가 안 된다**(non-interleaved). 위 패턴이 안전해졌지만, **여전히 권장은 `make_*`** 다 (가독성·효율).

## 이유 2 — 효율 (`make_shared`의 단일 할당)

### `shared_ptr<T>(new T)`는 두 번 할당

```cpp
std::shared_ptr<Widget> sp(new Widget);
// 1. new Widget        — 객체 할당
// 2. shared_ptr 생성자 — control block 할당
```

**두 번의 메모리 할당**이다.

### `make_shared`는 한 번

```cpp
auto sp = std::make_shared<Widget>();
// 객체 + control block을 한 메모리 블록에 함께 할당
```

```
[객체 메모리][control block]   ← 한 덩어리
```

장점은 이렇다.

- **할당 횟수가 절반**이다. 빠르다.
- **캐시 지역성이 좋아진다**. 객체와 카운트가 가까이 있다.
- 메모리 단편화가 줄어든다.

### `make_unique`는 효율 차이 X

`unique_ptr`는 control block이 없다. `make_unique`는 효율 측면에서 차이가 없다 (안전·가독성 위주).

## 이유 3 — 가독성 + 타입 중복 제거

```cpp
std::shared_ptr<Widget> sp(new Widget);   // Widget 두 번 등장
auto                    sp = std::make_shared<Widget>();   // 한 번
```

`auto` + `make_*` = DRY (Don't Repeat Yourself).

## 사용 못 하는 케이스 — 4가지

### 1. 커스텀 deleter

```cpp
auto del = [](Widget* p) { /* 특별 해제 */ };

std::unique_ptr<Widget, decltype(del)> p(new Widget, del);   // make 불가
std::shared_ptr<Widget> sp(new Widget, del);                  // 같음

// make_unique / make_shared는 deleter 인자 없음
```

직접 `new`가 필요하다.

### 2. `{}` 초기화 리스트

`make_*`는 `()`로 인자를 전달한다. `{}` 리스트 생성자 호출은 불가하다.

```cpp
auto p = std::make_shared<std::vector<int>>(10, 20);  // size 10, value 20
auto q = std::make_shared<std::vector<int>>({10, 20}); // 에러!
```

해결책으로 우회할 수 있다.

```cpp
auto initList = {10, 20};
auto p = std::make_shared<std::vector<int>>(initList);
```

또는 직접 `new`를 쓴다.

```cpp
std::shared_ptr<std::vector<int>> sp(new std::vector<int>{10, 20});
```

### 3. 클래스가 자체 `operator new`/`delete` 정의

```cpp
class Widget {
public:
    static void* operator new(std::size_t);
    static void  operator delete(void*);
};
```

이 클래스에 `make_shared`를 쓰면 control block과 함께 **한 메모리 블록**으로 할당된다. 클래스 자체의 operator new와 충돌한다 (보통 자체 operator new는 객체 크기를 정확히 가정한다).

사용자 정의 메모리 관리 클래스엔 `make_shared` 사용을 금지한다.

### 4. `make_shared`의 메모리 보유 함정

`make_shared`는 객체 + control block을 한 덩어리로 만든다. **weak_ptr가 살아있으면 객체 메모리도 해제할 수 없다.**

```cpp
auto sp = std::make_shared<HugeObject>();
std::weak_ptr<HugeObject> wp = sp;
sp.reset();              // 객체 소멸자 호출되지만 메모리는 안 해제
                          // (weak count 살아있어 control block 유지 → 같은 블록의 HugeObject 자리도 유지)
```

큰 객체 + 긴 weak_ptr 수명이면 `shared_ptr<T>(new T)` 형태가 메모리 절약이 가능하다 (객체와 control block이 별도 메모리).

trade-off다. 보통 `make_shared`가 더 좋지만 큰 객체는 검토가 필요하다.

## `make_unique`의 한계 (C++14)

C++11엔 `make_unique`가 없다 (표준 누락). C++14에 추가됐다.

C++11에서는 직접 작성한다.

```cpp
template<typename T, typename... Ts>
std::unique_ptr<T> make_unique(Ts&&... params) {
    return std::unique_ptr<T>(new T(std::forward<Ts>(params)...));
}
```

## 두 함수 차이 요약

| | `make_unique` | `make_shared` |
| --- | --- | --- |
| C++ 버전 | C++14 | C++11 |
| 예외 안전 | ✅ | ✅ |
| 단일 할당 | (control block 없음) | ✅ — 객체 + cb |
| 가독성 | ✅ 타입 한 번 | ✅ |
| 커스텀 deleter | ❌ | ❌ |
| `{}` 초기화 | ❌ | ❌ |
| 메모리 함정 (weak) | (해당 X) | ⚠️ 큰 객체 |

## 권장

### 기본은 `make_*`

```cpp
auto sp = std::make_shared<Widget>(args);
auto up = std::make_unique<Widget>(args);
```

### 직접 `new`가 필요한 경우

- 커스텀 deleter.
- `{}` 초기화 리스트.
- 사용자 정의 `operator new`/`delete` 클래스.
- 큰 객체 + weak_ptr 수명이 긴 케이스.

```cpp
std::unique_ptr<Widget, Deleter> up(new Widget, deleter);
```

## perfect forwarding 이슈

`make_shared`/`make_unique`는 인자를 forward한다. 그러나 보편 참조라 `{}` 추론에 실패한다 ([항목 30](/blog/programming/cpp/effective-modern-cpp/item30-familiarize-yourself-with-perfect-forwarding-failure-cases)).

## 핵심 정리

1. **기본은 `make_unique` / `make_shared`** 다.
2. **예외 안전 + 효율 (`make_shared`) + 가독성**이다.
3. **커스텀 deleter, `{}` 초기화는 직접 `new`** 가 필요하다.
4. `make_shared`는 weak_ptr 수명까지 메모리를 보유한다. 큰 객체엔 trade-off가 있다.
5. C++11엔 `make_unique`가 없다. 직접 작성할 수 있다.

## 관련 항목

- [항목 18: unique_ptr](/blog/programming/cpp/effective-modern-cpp/item18-use-unique-ptr-for-exclusive-ownership-for-exclusive-ownership)
- [항목 19: shared_ptr](/blog/programming/cpp/effective-modern-cpp/item19-use-shared-ptr-for-shared-ownership)
- [항목 20: weak_ptr](/blog/programming/cpp/effective-modern-cpp/item20-use-weak-ptr-for-shared-ptr-like-pointers-that-can-dangle)
- [항목 30: forwarding 실패](/blog/programming/cpp/effective-modern-cpp/item30-familiarize-yourself-with-perfect-forwarding-failure-cases)
