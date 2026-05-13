---
title: "항목 7: 객체 생성 시 ()와 {}를 구분하라"
date: 2025-01-06T10:00:00
description: "C++의 4가지 초기화 문법 — uniform init {}의 강점, initializer_list 함정, 선택 기준."
tags: [C++, Initialization, Modern C++]
series: "Effective Modern C++"
seriesOrder: 7
---

## 왜 이 항목이 중요한가?

`vector<int> v(10, 20)`과 `vector<int> v{10, 20}`이 완전히 다른 벡터를 만든다. 같은 두 인자, 같은 클래스인데 결과가 다르다. C++11이 `{}`를 도입하면서 생긴 이 미묘한 차이는 매일 작성하는 코드에 숨어 있다.

이 항목은 다음을 정리한다.

- C++의 4가지 초기화 문법과 그 차이.
- `{}`의 네 가지 장점 — narrowing 차단, MVP 회피, 일관성, 비복사 객체 초기화.
- `{}`의 한 가지 함정 — `initializer_list` 생성자가 다른 생성자를 잡아먹는다.
- `()`와 `{}` 중 어느 쪽을 default로 쓸지에 대한 실무 가이드.

## 개요

C++11이 도입한 **uniform initialization**(`{}`)는 거의 모든 자리에서 사용할 수 있는 강력한 문법이다. 다만 `()`와는 미묘하게 다른 결과를 낳을 수 있다. 어떤 경우엔 의도와 정반대로 동작한다. 이 항목은 두 문법의 차이와 어느 쪽을 default로 쓸지를 다룬다.

## 필수 개념: C++의 4가지 초기화 문법

> **초보자를 위한 배경 지식**

<br>

C++에서 객체를 만드는 문법은 네 가지다. 보기엔 비슷해도 호출되는 함수와 변환 규칙이 다를 수 있다.

```cpp
int x(0);     // 1) parens — direct
int y = 0;    // 2) =      — copy
int z{0};     // 3) braces — direct (uniform init, C++11+)
int w = {0};  // 4) =,{}   — copy with braces
```

값 타입(int 등)에서는 결과가 같지만, **클래스 객체**에서는 달라진다.

### 분류

| 분류 | 형태 | 호출 |
| --- | --- | --- |
| **Direct initialization** | `T x(args)`, `T x{args}` | 모든 생성자 후보 (explicit 포함) |
| **Copy initialization** | `T x = arg`, `T x = {args}` | non-explicit 생성자만 |

```cpp
class Widget {
public:
    explicit Widget(int n);
};

Widget w1(10);     // OK — direct
Widget w2{10};     // OK — direct
Widget w3 = 10;    // 에러! explicit이라 copy init 불가
Widget w4 = {10};  // 에러! 마찬가지 (copy-list-init도 explicit 차단)
```

이게 첫 번째 미묘함이다. `explicit` 생성자는 `=`를 쓴 형태로는 호출되지 않는다.

## C++11 이전의 답답함

C++03까지는 위 네 가지가 자리마다 다르게 적용됐다.

```cpp
int x(0);           // OK
int x = 0;          // OK
int x{0};           // C++11부터

std::vector<int> v;
v.push_back(1);     // 객체 생성 후 push
std::vector<int> v(1);   // size 1
std::vector<int> v = {1, 2, 3};   // C++11부터 가능

class Widget {
    int data[3] = {1, 2, 3};   // 멤버 기본값 — C++11부터
};
```

**uniform initialization**이 이 문법을 통일했다.

## `{}`의 장점 — 4가지

### 1. 거의 모든 자리에서 사용 가능

`{}`는 문맥 무관이다. 어디서든 OK다.

```cpp
int          x{0};
std::vector  v{1, 2, 3};
class Widget {
    int x{0};                          // 멤버 기본값
    std::vector<int> data{1, 2, 3};
};
std::atomic<int> a{0};                 // 비복사 객체 (atomic은 copy 불가)

// 함수 반환
std::vector<int> make() { return {1, 2, 3}; }
```

`()`는 사용하지 못하는 자리(클래스 멤버 기본값)가 있고, `=`는 explicit을 차단한다.

### 2. Narrowing 변환 금지

`{}` 안에서 정밀도 손실이 일어나는 변환은 **컴파일 에러**다.

```cpp
double d = 3.14;

int x(d);     // OK: 3으로 잘림 (경고만)
int y = d;    // OK: 잘림
int z{d};     // 에러! double → int는 narrowing
int w = {d};  // 에러! 마찬가지

char c{1000}; // 에러! 1000은 char 범위 초과
char c2(1000); // OK이지만 의도치 않은 잘림
```

안전성이 확보된다. 의도된 잘림이라면 `static_cast<int>(d)`로 명시한다.

### 3. C++의 가장 짜증나는 파싱(Most Vexing Parse) 회피

```cpp
Widget w1();    // ❌ 함수 선언으로 해석된다!
                //    "인자 없이 Widget을 반환하는 함수 w1"
Widget w2{};    // ✅ 객체 — 명백
Widget w3;      // ✅ 객체 — 기본 생성자
```

`Widget w1()`이 **함수 선언으로 파싱**되는 게 C++의 가장 유명한 함정이다. `{}`는 이 함정을 회피한다.

### 4. 비복사 가능 멤버 초기화

```cpp
class Container {
    std::atomic<int> counter{0};   // OK — direct init
    // std::atomic<int> counter = 0;  // 에러! atomic은 copy ctor 없음
};
```

## `{}`의 함정 — `initializer_list` 우선

여기가 본 항목의 핵심이다. `{}`로 호출할 때 컴파일러는 **`std::initializer_list` 생성자를 최우선**으로 찾는다.

### 결정적 차이 — `vector<int> v(10, 20)` vs `v{10, 20}`

```cpp
std::vector<int> v1(10, 20);   // (size_t, value) 생성자
                               // → 20이 10개 들어있는 벡터: {20, 20, 20, ..., 20}

std::vector<int> v2{10, 20};   // initializer_list<int> 생성자
                               // → 원소가 두 개인 벡터: {10, 20}
```

같은 두 인자 `(10, 20)`인데 **완전히 다른 vector**가 나온다.

`vector`는 두 형태의 생성자를 모두 가지고 있는데, `{}`를 쓰면 컴파일러는 `initializer_list` 쪽으로 직진한다.

### 더 미묘한 케이스 — initializer_list가 변환을 통해서라도 매칭되면 이긴다

```cpp
class Widget {
public:
    Widget(int i, bool b);                   // (a)
    Widget(int i, double d);                 // (b)
    Widget(std::initializer_list<long> il);  // (c)
};

Widget w1(10, true);    // (a) 호출 — 일반 매칭
Widget w2{10, true};    // (c) 호출!
                        //     int → long, bool → long 변환이 가능하면
                        //     컴파일러는 (c)를 우선시한다
Widget w3{10, 5.0};     // (c) 호출! double → long도 가능
                        //     ⚠️ narrowing — 컴파일 에러
```

심지어 변환이 **narrowing**(정밀도 손실)이라 결국 에러가 나도, 컴파일러는 다른 생성자로 후퇴하지 않고 **그냥 에러**를 낸다. (a)나 (b)로 만족되었을 케이스가 (c)로 가서 깨진다.

### 빈 `{}`는 기본 생성자 — initializer_list 호출 아님

```cpp
class W {
public:
    W();                                 // 기본
    W(std::initializer_list<int> il);    // initializer_list
};

W w1;       // 기본 생성자
W w2{};     // 기본 생성자 (빈 list가 아니다!)
W w3();     // 함수 선언 (most vexing parse)
W w4({});   // 빈 initializer_list로 호출
W w5{{}};   // 빈 initializer_list로 호출
```

빈 `{}`는 예외다. initializer_list 우선 규칙에서 빠진다.

## 실무 가이드 — 어느 쪽을 default로?

C++ 커뮤니티에서 의견이 갈리는 주제다. 두 진영이 있다.

### 진영 A — "`{}`를 default로"

근거

- **narrowing 차단** — 안전성.
- **MVP 회피** — `Widget w()` 함정이 없다.
- **모든 자리에서 동일 문법** — 일관성.

가이드

- 기본은 `{}`.
- vector·map처럼 initializer_list 의도가 있으면 그대로 `{}`.
- 초기 size를 만들고 싶으면 `vector<int>(10)` (괄호 명시).

### 진영 B — "`()`를 default로, `{}`는 list 의도일 때만"

근거

- **initializer_list 우선이 위험** — 의도치 않은 호출.
- 표준 라이브러리에 list 생성자 있는 클래스가 많다. `vector`, `list`, `set`, `map` 등.

가이드

- 일반 객체는 `()`.
- 명시적 list가 의도일 때만 `{}`.

### 권장 (실용)

| 상황 | 권장 |
| --- | --- |
| 단순 값 타입 (`int`, `double`) | 어느 쪽이든 — `{}` 약간 우위 (narrowing) |
| 클래스 멤버 기본값 | `{}` (`=` 사용 시 일부 제약) |
| `vector` 같은 list 생성자 의미 있는 컨테이너 | 의도에 따라 — `(10)` vs `{10}` 차이를 인식 |
| 비복사 객체 (`atomic`, `unique_ptr` 등) | `{}` |
| 표준이 아닌 사용자 클래스 | 신중히 — 두 형태 모두 시도해 의도를 확인 |

## 템플릿 안에서의 함정

같은 코드가 `()` 또는 `{}` 어느 쪽을 사용해야 할지 미리 정할 수 없을 때가 있다.

```cpp
template<typename T, typename... Ts>
auto make(Ts&&... args) {
    return T(std::forward<Ts>(args)...);   // () 형태
    // 또는
    return T{std::forward<Ts>(args)...};   // {} 형태
}

auto v1 = make<std::vector<int>>(10, 20);   // () → size 10
auto v2 = make<std::vector<int>>({10, 20}); // {} → 원소 두 개
```

`std::make_unique`, `std::make_shared`는 `()`를 사용한다. 의도치 않은 list 호출을 회피하기 위해서다.

## 모던 변형

### C++20 designated initializers

집합체(aggregate)에 대해 멤버 이름을 명시할 수 있다.

```cpp
struct Point { double x; double y; double z; };

Point p1{1.0, 2.0, 3.0};                 // 위치 — 순서 외우기
Point p2{.x = 1.0, .y = 2.0, .z = 3.0};  // 이름 명시 — 명확
Point p3{.x = 1.0, .z = 3.0};            // .y는 0 (값 초기화)
```

Builder 패턴 없이도 깔끔하다. 단 **선언 순서대로** 작성해야 한다.

### C++17 — 단일 원소 `auto x{1}`

[항목 2](/blog/programming/cpp/effective-modern-cpp/item02-understand-auto-type-deduction)에서 다뤘다. `auto x{1}`이 C++17부터 `int`로 추론된다.

## 핵심 정리

1. **`{}`의 장점**: narrowing 차단, MVP 회피, 거의 모든 자리에서 사용 가능.
2. **`{}`의 함정**: `initializer_list` 생성자가 다른 생성자를 잡아먹는다.
3. **`vector<int>(10)` vs `{10}`** 처럼 의미가 완전히 달라지는 케이스를 인식한다.
4. **빈 `{}`는 기본 생성자** (빈 list가 아니다).
5. 템플릿에서 둘 중 어느 게 호출자 의도인지 알 수 없다. `make_*` 류는 `()`를 사용한다.

## 관련 항목

- [항목 2: `auto` 추론](/blog/programming/cpp/effective-modern-cpp/item02-understand-auto-type-deduction) — `auto x{1}` 케이스
- [항목 5: auto를 선호하라](/blog/programming/cpp/effective-modern-cpp/item05-prefer-auto) — `auto`의 장점
- [항목 21: `make_unique`/`make_shared` 선호](/blog/programming/cpp/effective-modern-cpp/item21-prefer-make-unique-and-make-shared-to-direct-new) — `()` 사용 이유
