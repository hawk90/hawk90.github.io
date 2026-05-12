---
title: "항목 25: rvalue 참조에는 std::move를, 보편 참조에는 std::forward를 사용하라"
date: 2025-01-08T12:00:00
description: "참조 종류별 올바른 캐스팅 — RVO/NRVO와 충돌 회피하는 return 패턴까지."
tags: [C++, std::move, std::forward, RVO, Move Semantics, Modern C++]
series: "Effective Modern C++"
seriesOrder: 25
---

## 개요

`std::move`와 `std::forward`는 각각 **rvalue 참조**와 **보편 참조**에 매칭. 잘못 쓰면 의도와 다른 일 — 게다가 `return`문에서 잘못 쓰면 **RVO를 무력화**.

## 필수 개념: 매칭 규칙

> **초보자를 위한 배경 지식**

<br>

| 매개변수 종류 | 사용 도구 | 이유 |
| --- | --- | --- |
| **rvalue 참조** (`T&&`, T 결정) | `std::move` | 호출자가 이미 rvalue 약속 |
| **보편 참조** (`T&&`, T 추론) | `std::forward<T>` | 카테고리 보존 |

## 기본 규칙

```cpp
class Widget {
public:
    Widget(Widget&& rhs) {                  // rvalue 참조
        name = std::move(rhs.name);         // ✅ move
    }

    template<typename T>
    void setName(T&& newName) {             // 보편 참조
        name = std::forward<T>(newName);    // ✅ forward
    }
};
```

## 잘못된 조합의 결과

### 보편 참조에 `std::move`

→ lvalue도 강제로 이동 → 호출자의 객체를 망가뜨림.

```cpp
template<typename T>
void wrapper(T&& arg) {
    sink(std::move(arg));   // arg가 lvalue여도 무조건 move
}

std::string s = "hello";
wrapper(s);   // s가 망가짐 — 호출자가 expect한 동작 아님
              // (호출자는 단순 함수 호출 의도였음)
              // wrapper(s) 호출 이후 s의 내용은 *unspecified* —
              // 코드를 보고 호출자는 "그저 함수 호출"로만 인식한다.
```

이게 위험한 진짜 이유: 호출자는 본인 코드만 본다. `wrapper(s)`라고 적은 줄에서 `s`가 약탈당했다는 신호가 *어디에도 없다*. 다음 줄에서 `s`를 다시 쓰면 — `wrapper`의 정의가 멀리 떨어진 헤더에 있다면 — 디버깅이 한참 어려워진다.

> 🟡 **유일한 예외**: 인자가 wrapper 호출 *이후* 더 이상 쓰이지 않음을 보장할 수 있다면 `T&&`에 `std::move`도 안전하다. 보장이 안 되면 — 즉 일반 라이브러리 코드라면 — 무조건 `std::forward<T>`.

### rvalue 참조에 `std::forward`

동작은 맞지만 매번 `<T>`를 적어야 — 가독성 손해 + 헷갈림.

```cpp
class Widget {
public:
    Widget(Widget&& rhs) {                              // rvalue 참조
        name = std::forward<std::string>(rhs.name);     // 동작 OK이지만 verbose
                                                        // std::move가 더 명확
    }
};
```

## 마지막 사용 시점에만

같은 매개변수를 함수 안에서 여러 번 쓴다면, **마지막에만** move/forward.

```cpp
template<typename T>
void process(T&& arg) {
    log(arg);                      // 사용 1
    validate(arg);                 // 사용 2
    sink(std::forward<T>(arg));    // 마지막 — 여기서 forward
}
```

먼저 move/forward 해버리면 이후 `arg`는 moved-from 상태 — UB.

## 값 반환 — RVO/NRVO와 충돌 주의

### RVO/NRVO 복습

```cpp
Widget makeWidget() {
    Widget w;
    return w;        // ✅ NRVO 가능 — copy/move 모두 생략
}
```

컴파일러는 반환할 객체를 **직접 호출자의 자리에 만듦** → 0 비용.

### ❌ `return std::move(w)` — RVO 깨뜨림

```cpp
Widget makeWidget() {
    Widget w;
    return std::move(w);   // RVO 깨짐 — 강제로 move 발생
}
```

`std::move(w)`는 더 이상 `w`(이름 있는 지역 변수) 그대로가 아님 → NRVO 조건 위반 → 컴파일러는 move ctor 호출.

→ **명시적 std::move가 더 느림**.

### 표준 규칙 (간략)

`return` 문이 **이름 있는 지역 변수**(자동 객체)를 그대로 반환:
- C++ 표준이 NRVO 또는 implicit move 보장
- 명시적 `std::move` 불필요

`return std::move(w)` 쓰지 마라.

### 예외 — 매개변수의 rvalue/보편 참조 반환

```cpp
template<typename T>
Fraction reduceAndCopy(T&& frac) {
    frac.reduce();
    return std::forward<T>(frac);   // ✅ 명시적 forward 필요
}
```

매개변수는 **이름 있는 객체** — 자동으로 lvalue. forward 없으면 lvalue 반환 → copy 호출.

→ **매개변수(rvalue/보편 참조) 반환은 명시적 move/forward 필요**.

### return 정리

| 상황 | 권장 |
| --- | --- |
| 지역 변수 그대로 반환 | 그냥 `return w;` (RVO/NRVO) |
| rvalue 참조 매개변수 반환 | `return std::move(arg);` |
| 보편 참조 매개변수 반환 | `return std::forward<T>(arg);` |

## 매개변수가 by-value인 경우

```cpp
Widget reduceAndCopy(Widget w) {   // by-value
    w.reduce();
    return w;          // RVO 가능 — 그러나 w는 매개변수
                       // C++ 규칙상 매개변수의 implicit move OK (C++11+)
}
```

매개변수는 자동 객체 — implicit move 적용. `std::move` 명시 불필요 (안 적어도 move 호출).

## 다중 인자 forwarding

```cpp
template<typename Func, typename... Args>
auto invoke(Func&& f, Args&&... args)
    -> decltype(std::forward<Func>(f)(std::forward<Args>(args)...))
{
    return std::forward<Func>(f)(std::forward<Args>(args)...);
}
```

각 인자에 forward — 카테고리 보존. `make_unique` 등 표준 패턴.

## 함정 — `noexcept` 누락

move 생성자에 `noexcept` 안 붙이면 `vector::push_back`이 move 안 씀 ([항목 14](/blog/programming/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions)).

```cpp
class Widget {
public:
    Widget(Widget&& rhs) noexcept   // noexcept 명시
        : name(std::move(rhs.name)) {}
};
```

## 함정 — `const` 매개변수에 move

```cpp
void f(const Widget&& w) {       // ⚠️ const rvalue 참조 — 거의 의미 없음
    Widget w2(std::move(w));      // const라 copy 호출 (move 안 됨)
}
```

`const T&&`는 보통 **잘못 작성한 코드** 신호.

## 핵심 정리

1. **rvalue 참조 → `std::move`, 보편 참조 → `std::forward<T>`**
2. 매개변수의 **마지막 사용 시점에만** move/forward
3. **지역 변수 반환에 `std::move` 금지** — RVO/NRVO를 깸
4. **매개변수(rvalue/보편 참조) 반환은 명시적 move/forward 필요**
5. **by-value 매개변수**는 자동 implicit move (C++11+)
6. move ctor엔 **`noexcept`** ([항목 14](/blog/programming/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions))

## 관련 항목

- [항목 23: move/forward 정체](/blog/programming/effective-modern-cpp/item23-understand-std-move-and-std-forward)
- [항목 24: 두 종류 구분](/blog/programming/effective-modern-cpp/item24-distinguish-universal-references-from-rvalue-references)
- [항목 14: noexcept](/blog/programming/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions)
- [항목 41: pass by value](/blog/programming/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params)

## 참고 자료

- [[Modern C++] std::move 와 std::forward 정리 - (1) — sheld2.blog.naver](https://blog.naver.com/sheld2/222654277182) — "T&& 에 std::move 쓰지 마라"의 호출자 시점 직관과 예외 조건
