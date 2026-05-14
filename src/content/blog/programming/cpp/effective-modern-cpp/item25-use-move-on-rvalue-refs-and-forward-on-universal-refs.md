---
title: "항목 25: rvalue 참조에는 std::move를, 보편 참조에는 std::forward를 사용하라"
date: 2025-01-06T01:00:00
description: "참조 종류별 올바른 캐스팅 — RVO/NRVO와 충돌 회피하는 return 패턴까지."
tags: [C++, std::move, std::forward, RVO, Move Semantics, Modern C++]
series: "Effective Modern C++"
seriesOrder: 25
draft: true
---

## 왜 이 항목이 중요한가?

`std::move`와 `std::forward`는 각각 다른 참조 종류와 짝을 이룬다. 짝을 잘못 맞추면 두 가지 사고가 난다.

- **보편 참조에 `std::move`** — lvalue로 들어온 호출자의 객체가 강제로 약탈된다. 호출자는 그저 함수를 호출했을 뿐인데 자기 변수가 망가져 있다.
- **rvalue 반환에 `std::move`** — `return std::move(w)`는 RVO/NRVO를 깨뜨려 오히려 *더 느려진다*.

이 항목은 두 가지 짝을 정확히 정리하고, 특히 `return`문에서 자주 빠지는 함정을 본다.

## 개요

`std::move`와 `std::forward`는 각각 **rvalue 참조**와 **보편 참조**에 매칭된다. 잘못 쓰면 의도와 다른 일이 일어난다. 게다가 `return`문에서 잘못 쓰면 **RVO를 무력화**한다.

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

lvalue도 강제로 이동되어 호출자의 객체가 망가진다.

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

이게 위험한 진짜 이유는 이렇다. 호출자는 본인 코드만 본다. `wrapper(s)`라고 적은 줄에서 `s`가 약탈당했다는 신호가 *어디에도 없다*. 다음 줄에서 `s`를 다시 쓰면 — `wrapper`의 정의가 멀리 떨어진 헤더에 있다면 — 디버깅이 한참 어려워진다.

> 🟡 **유일한 예외**: 인자가 wrapper 호출 *이후* 더 이상 쓰이지 않음을 보장할 수 있다면 `T&&`에 `std::move`도 안전하다. 보장이 안 되면 (즉 일반 라이브러리 코드라면) 무조건 `std::forward<T>`다.

### rvalue 참조에 `std::forward`

동작은 맞지만 매번 `<T>`를 적어야 한다. 가독성 손해에 헷갈리기까지 한다.

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

같은 매개변수를 함수 안에서 여러 번 쓴다면, **마지막에만** move/forward한다.

```cpp
template<typename T>
void process(T&& arg) {
    log(arg);                      // 사용 1
    validate(arg);                 // 사용 2
    sink(std::forward<T>(arg));    // 마지막 — 여기서 forward
}
```

먼저 move/forward를 해 버리면 이후 `arg`는 moved-from 상태가 된다. UB다.

## 값 반환 — RVO/NRVO와 충돌 주의

### RVO/NRVO 복습

```cpp
Widget makeWidget() {
    Widget w;
    return w;        // ✅ NRVO 가능 — copy/move 모두 생략
}
```

컴파일러는 반환할 객체를 **직접 호출자의 자리에 만든다**. 0 비용이다.

### ❌ `return std::move(w)` — RVO 깨뜨림

```cpp
Widget makeWidget() {
    Widget w;
    return std::move(w);   // RVO 깨짐 — 강제로 move 발생
}
```

`std::move(w)`는 더 이상 `w`(이름 있는 지역 변수) 그대로가 아니다. NRVO 조건을 위반하므로 컴파일러는 move ctor를 호출한다.

**명시적 std::move가 더 느려진다.**

### 표준 규칙 (간략)

`return` 문이 **이름 있는 지역 변수**(자동 객체)를 그대로 반환하면 이렇다.

- C++ 표준이 NRVO 또는 implicit move를 보장한다.
- 명시적 `std::move`가 불필요하다.

`return std::move(w)`를 쓰지 마라.

### 예외 — 매개변수의 rvalue/보편 참조 반환

```cpp
template<typename T>
Fraction reduceAndCopy(T&& frac) {
    frac.reduce();
    return std::forward<T>(frac);   // ✅ 명시적 forward 필요
}
```

매개변수는 **이름 있는 객체**라 자동으로 lvalue다. forward가 없으면 lvalue 반환이 되어 copy가 호출된다.

**매개변수(rvalue/보편 참조) 반환은 명시적 move/forward가 필요**하다.

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

매개변수는 자동 객체다. implicit move가 적용된다. `std::move`를 명시할 필요가 없다 (안 적어도 move가 호출된다).

## 다중 인자 forwarding

```cpp
template<typename Func, typename... Args>
auto invoke(Func&& f, Args&&... args)
    -> decltype(std::forward<Func>(f)(std::forward<Args>(args)...))
{
    return std::forward<Func>(f)(std::forward<Args>(args)...);
}
```

각 인자에 forward한다. 카테고리를 보존한다. `make_unique` 등 표준 패턴이다.

## 함정 — `noexcept` 누락

move 생성자에 `noexcept`를 안 붙이면 `vector::push_back`이 move를 안 쓴다 ([항목 14](/blog/programming/cpp/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions)).

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

`const T&&`는 보통 **잘못 작성한 코드** 신호다.

## 핵심 정리

1. **rvalue 참조 → `std::move`, 보편 참조 → `std::forward<T>`** 다.
2. 매개변수의 **마지막 사용 시점에만** move/forward한다.
3. **지역 변수 반환에 `std::move` 금지**다. RVO/NRVO를 깨뜨린다.
4. **매개변수(rvalue/보편 참조) 반환은 명시적 move/forward가 필요**하다.
5. **by-value 매개변수**는 자동 implicit move다 (C++11+).
6. move ctor엔 **`noexcept`** 를 붙인다 ([항목 14](/blog/programming/cpp/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions)).

## 관련 항목

- [항목 14: noexcept](/blog/programming/cpp/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions)
- [항목 23: move/forward 정체](/blog/programming/cpp/effective-modern-cpp/item23-understand-std-move-and-std-forward)
- [항목 24: 두 종류 구분](/blog/programming/cpp/effective-modern-cpp/item24-distinguish-universal-references-from-rvalue-references)
- [항목 41: pass by value](/blog/programming/cpp/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params)
