---
title: "항목 29: move 연산이 없거나, 저렴하지 않거나, 사용되지 않는다고 가정하라"
date: 2025-01-08T16:00:00
description: "C++11 move semantics가 항상 성능 향상은 아닌 4가지 이유."
tags: [C++, Move Semantics, Performance, Modern C++]
series: "Effective Modern C++"
seriesOrder: 29
---

## 개요

C++11의 move semantics가 모든 곳에서 자동으로 성능을 올려준다는 인식은 **틀렸습니다**. 실제로는 다음 4가지 이유로 효과가 없을 때가 많음.

## 필수 개념: move의 기대와 현실

> **초보자를 위한 배경 지식**

<br>

C++11 move semantics의 약속:
- 큰 객체를 **포인터 swap 정도의 비용**으로 옮김
- copy 대신 move → 메모리 할당·복사 회피
- 함수 반환값, 컨테이너 재할당, swap 모두 빨라짐

→ 사실 — 그러나 **조건부**. 항상 그런 게 아님.

## 이유 1 — 이동 연산이 없는 타입

C++98에 작성된 클래스, 또는 명시적으로 copy를 정의해 자동 move 생성이 막힌 클래스 ([항목 17](/blog/programming/effective-modern-cpp/item17-understand-special-member-function-generation)).

```cpp
class Legacy {
public:
    Legacy(const Legacy&) {}    // copy 명시 → 자동 move 막힘
};

Legacy a;
Legacy b = std::move(a);   // copy 호출 (move 없음) — std::move도 도움 X
```

표준 라이브러리에도 일부는 move가 단순 copy:
- `std::array<T, N>` (값을 직접 보유)
- 작은 trivial 타입
- C 스타일 구조체

## 이유 2 — 이동이 copy보다 별로 안 빠름

### 작은 객체

```cpp
struct Small {
    int a, b, c;   // 12 byte
};

Small s1, s2;
s2 = std::move(s1);   // move == copy (작은 값)
```

### `std::array`

```cpp
std::array<int, 100> a, b;
b = std::move(a);   // 여전히 100개 정수 복사 — 힙 데이터가 없으니
```

**`std::array`는 요소가 배열로 객체 안에 직접 저장** — move도 결국 복사.

vs `std::vector` — 힙에 데이터 → move가 포인터 swap.

### SSO(Small String Optimization)된 string

```cpp
std::string s = "short";
auto t = std::move(s);   // 짧은 string은 SSO 버퍼 안에 있어 그냥 복사
                          // 힙 할당 없으니 move도 의미 X
```

C++ 표준은 SSO 의무화 안 했지만 모든 주요 구현은 사용. 짧은 string(보통 ≤ 15 byte)은 객체 안에 직접 보관 → move = copy.

→ **긴 string만** 진짜 move 효과.

## 이유 3 — move가 noexcept가 아닌 경우

`std::vector::push_back`이 재할당할 때, move 생성자가 `noexcept`이어야만 move 사용 ([항목 14](/blog/programming/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions)). 그렇지 않으면 copy로 떨어짐.

```cpp
class Widget {
public:
    Widget(Widget&&);   // noexcept 아님 → vector는 copy 사용
};

std::vector<Widget> v;
v.push_back(...);   // 재할당 시 — copy (move 못 씀)
```

→ **move 생성자에 noexcept 필수**.

## 이유 4 — 호출자가 lvalue를 넘김

```cpp
template<typename T>
void process(T x);    // by-value

Widget w;
process(w);           // copy
process(std::move(w)); // move (호출자가 명시)
```

함수 내부에서 자동으로 move가 일어나는 게 아닙니다 — 호출자가 rvalue를 넘겨야 함.

코드 작성자가 매번 의식하지 않으면 그냥 copy.

## 함의 — move semantics 효과를 본다는 건

다음이 모두 성립할 때만 move의 진짜 이득:

1. **객체에 move 생성자/대입이 있다** (자동 또는 사용자 정의)
2. **move가 진짜 빠르다** (힙 데이터·자원 보유)
3. **move가 `noexcept`** (표준 컨테이너가 사용)
4. **호출 시점에 rvalue로 전달됨**

→ 4가지 모두 충족이 의외로 까다로움.

## 어디서 move가 진짜 효과 있나

### 분명한 효과

- `std::vector<std::string>` resize — string이 긴 경우
- `std::string` 함수 반환·전달 (긴 string)
- `std::unique_ptr` 전달·소유권 이전
- 사용자 정의 RAII 클래스 (큰 자원)

### 효과 없거나 거의 없음

- `std::array` — 데이터 인-line
- 작은 POD 구조체
- SSO된 string
- C 구조체
- `std::tuple<int, int>` 같은 작은 값들

## 결론 — 측정하라

> 성능을 가정하지 말고 **측정**하라.

실제 사용 시나리오에서:
- 사용 중인 타입이 진짜 move semantics 지원하는지
- move가 진짜 빠른지 (작은 객체는 차이 없음)
- noexcept 붙어 있는지
- 호출자가 rvalue 보내는 시나리오인지

## 측정 도구

- **Google Benchmark** — micro-benchmark
- **`std::is_nothrow_move_constructible_v<T>`** — noexcept 검사
- **`std::is_trivially_copyable_v<T>`** — trivial이면 move = copy

```cpp
static_assert(std::is_nothrow_move_constructible_v<Widget>);
```

## 함정 — moved-from 객체

move 후의 객체는 **유효하지만 미정의 상태** (valid but unspecified).

```cpp
std::string s = "hello";
std::string t = std::move(s);
// s 사용 가능? — 표준에 따라 가능 (그러나 내용은 미정의)
s.clear();   // OK
s.size();    // OK (보통 0)
s == "hello"; // 정의 X
```

→ moved-from 객체는 **소멸·재할당만** 안전. 그 외 사용은 신중.

## 핵심 정리

1. C++11 타입이라도 **move가 효율적이리란 보장 없음**
2. **작은 객체·SSO·`std::array`** 는 move ≈ copy
3. **`noexcept` 없으면** 표준 컨테이너가 copy 선택
4. **lvalue 인자**에선 자동 move 안 됨 — 명시적 `std::move` 필요
5. **측정** — 가정하지 말 것
6. moved-from 객체는 유효하지만 미정의 — 신중

## 관련 항목

- [항목 14: noexcept](/blog/programming/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions)
- [항목 17: 특수 멤버 자동 생성](/blog/programming/effective-modern-cpp/item17-understand-special-member-function-generation)
- [항목 23: move/forward](/blog/programming/effective-modern-cpp/item23-understand-std-move-and-std-forward)
- [항목 41: pass by value](/blog/programming/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params)
