---
title: "항목 7: 객체 생성 시 ()와 {}를 구분하라"
date: 2025-01-06T10:00:00
description: "C++의 4가지 초기화 문법 — uniform init {}의 강점, initializer_list 함정, 선택 기준."
tags: [C++, Initialization, Modern C++]
series: "Effective Modern C++"
seriesOrder: 7
---

## 개요

C++11이 도입한 **uniform initialization**(`{}`)는 거의 모든 자리에서 사용 가능한 강력한 문법입니다. 그러나 `()`와는 미묘하게 다른 결과를 낳을 수 있어 — 어떤 경우엔 의도와 정반대 동작. 이 항목은 두 문법의 차이와 어느 쪽을 default로 쓸지를 다룹니다.

## 필수 개념: C++의 4가지 초기화 문법

> **초보자를 위한 배경 지식**

<br>

C++ 객체를 만드는 문법은 4가지입니다 — 보기엔 비슷해도 호출되는 함수와 변환 규칙이 다를 수 있습니다.

```cpp
int x(0);     // 1) parens — direct
int y = 0;    // 2) =      — copy
int z{0};     // 3) braces — direct (uniform init, C++11+)
int w = {0};  // 4) =,{}   — copy with braces
```

값 타입(int 등)에서는 결과가 같지만, **클래스 객체**에서는 달라집니다.

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

이게 첫 번째 미묘함 — `explicit` 생성자는 `=`를 쓴 형태로는 호출되지 않습니다.

## C++11 이전의 답답함

C++03까지는 위 4개가 자리마다 다르게 적용:

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

→ **uniform initialization**이 통일.

## `{}`의 장점 — 4가지

### 1. 거의 모든 자리에서 사용 가능

`{}`는 문맥 무관 — 어디서든 OK.

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

`()`는 사용 못 하는 자리(클래스 멤버 기본값)도 있고, `=`는 explicit 차단 등.

### 2. Narrowing 변환 금지

`{}` 안에서 정밀도 손실이 일어나는 변환은 **컴파일 에러**.

```cpp
double d = 3.14;

int x(d);     // OK: 3으로 잘림 (경고만)
int y = d;    // OK: 잘림
int z{d};     // 에러! double → int는 narrowing
int w = {d};  // 에러! 마찬가지

char c{1000}; // 에러! 1000은 char 범위 초과
char c2(1000); // OK이지만 의도치 않은 잘림
```

→ 안전성 확보. 의도된 잘림이라면 `static_cast<int>(d)`로 명시.

### 3. C++의 가장 짜증나는 파싱(Most Vexing Parse) 회피

```cpp
Widget w1();    // ❌ 함수 선언으로 해석됨!
                //    "인자 없이 Widget을 반환하는 함수 w1"
Widget w2{};    // ✅ 객체 — 명백
Widget w3;      // ✅ 객체 — 기본 생성자
```

`Widget w1()`이 **함수 선언으로 파싱**되는 게 C++의 가장 유명한 함정. `{}`는 이 함정 회피.

### 4. 비복사 가능 멤버 초기화

```cpp
class Container {
    std::atomic<int> counter{0};   // OK — direct init
    // std::atomic<int> counter = 0;  // 에러! atomic은 copy ctor 없음
};
```

## `{}`의 함정 — `initializer_list` 우선

여기가 본 항목의 핵심입니다. `{}`로 호출 시 컴파일러는 **`std::initializer_list` 생성자를 최우선**으로 찾습니다.

### 결정적 차이 — `vector<int> v(10, 20)` vs `v{10, 20}`

```cpp
std::vector<int> v1(10, 20);   // (size_t, value) 생성자
                               // → 20이 10개 들어있는 벡터: {20, 20, 20, ..., 20}

std::vector<int> v2{10, 20};   // initializer_list<int> 생성자
                               // → 원소가 두 개인 벡터: {10, 20}
```

같은 두 인자 `(10, 20)`인데 **완전히 다른 vector**가 나옵니다.

`vector`는 두 형태의 생성자를 모두 가지고 있는데, `{}`를 쓰면 컴파일러는 `initializer_list` 쪽으로 직진합니다.

### 더 미묘한 케이스 — initializer_list가 변환을 통해서라도 매칭되면 이김

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
                        //     컴파일러는 (c)를 우선
Widget w3{10, 5.0};     // (c) 호출! double → long도 가능
                        //     ⚠️ narrowing — 컴파일 에러
```

심지어 변환이 **narrowing**(정밀도 손실)이라 결국 에러가 나도, 컴파일러는 다른 생성자로 후퇴하지 않고 **그냥 에러**를 냅니다. (a)나 (b)로 만족되었을 케이스가 (c)로 가서 깨짐.

### 빈 `{}`는 기본 생성자 — initializer_list 호출 아님

```cpp
class W {
public:
    W();                                 // 기본
    W(std::initializer_list<int> il);    // initializer_list
};

W w1;       // 기본 생성자
W w2{};     // 기본 생성자 (빈 list가 아님!)
W w3();     // 함수 선언 (most vexing parse)
W w4({});   // 빈 initializer_list로 호출
W w5{{}};   // 빈 initializer_list로 호출
```

빈 `{}`는 예외 — initializer_list 우선 규칙에서 빠집니다.

## 실무 가이드 — 어느 쪽을 default로?

C++ 커뮤니티에서 의견이 갈리는 주제입니다. 두 진영:

### 진영 A — "`{}`를 default로"

근거:
- **narrowing 차단** — 안전성
- **MVP 회피** — `Widget w()` 함정 없음
- **모든 자리에서 동일 문법** — 일관성

가이드:
- 기본은 `{}`
- vector·map처럼 initializer_list 의도가 있으면 그대로 `{}`
- 초기 size를 만들고 싶으면 `vector<int>(10)` (괄호 명시)

### 진영 B — "`()`를 default로, `{}`는 list 의도일 때만"

근거:
- **initializer_list 우선이 위험** — 의도치 않은 호출
- 표준 라이브러리에 list 생성자 있는 클래스 多 — `vector`, `list`, `set`, `map` 등

가이드:
- 일반 객체는 `()`
- 명시적 list가 의도일 때만 `{}`

### 권장 (실용)

| 상황 | 권장 |
| --- | --- |
| 단순 값 타입 (`int`, `double`) | 어느 쪽이든 — `{}` 약간 우위 (narrowing) |
| 클래스 멤버 기본값 | `{}` (`=` 사용 시 일부 제약) |
| `vector` 같은 list 생성자 의미 있는 컨테이너 | 의도에 따라 — `(10)` vs `{10}` 차이 인식 |
| 비복사 객체 (`atomic`, `unique_ptr` 등) | `{}` |
| 표준이 아닌 사용자 클래스 | 신중히 — 두 형태 모두 시도해 의도 확인 |

## 템플릿 안에서의 함정

같은 코드가 `()` 또는 `{}` 어느 쪽을 사용해야 할지 미리 정할 수 없을 때:

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

`std::make_unique`, `std::make_shared`는 `()`를 사용 — 의도치 않은 list 호출 회피.

## 모던 변형

### C++20 designated initializers

집합체(aggregate)에 대해 멤버 이름 명시:

```cpp
struct Point { double x; double y; double z; };

Point p1{1.0, 2.0, 3.0};                 // 위치 — 순서 외우기
Point p2{.x = 1.0, .y = 2.0, .z = 3.0};  // 이름 명시 — 명확
Point p3{.x = 1.0, .z = 3.0};            // .y는 0 (값 초기화)
```

→ Builder 패턴 없이도 깔끔. 단 **선언 순서대로** 작성해야 함.

### C++17 — 단일 원소 `auto x{1}`

[item02](/blog/programming/cpp/effective-modern-cpp/item02-understand-auto-type-deduction)에서 다룸 — `auto x{1}`이 C++17부터 `int`로 추론.

## 핵심 정리

1. **`{}`의 장점**: narrowing 차단, MVP 회피, 거의 모든 자리에서 사용
2. **`{}`의 함정**: `initializer_list` 생성자가 다른 생성자를 잡아먹음
3. **`vector<int>(10)` vs `{10}`** 처럼 의미가 완전히 달라지는 케이스 인식
4. **빈 `{}`는 기본 생성자** (빈 list 아님)
5. 템플릿에서 둘 중 어느 게 호출자 의도인지 알 수 없음 — `make_*` 류는 `()` 사용

## 관련 항목

- [항목 2: `auto` 추론](/blog/programming/cpp/effective-modern-cpp/item02-understand-auto-type-deduction) — `auto x{1}` 케이스
- [항목 21: `make_unique`/`make_shared` 선호](/blog/programming/cpp/effective-modern-cpp/item21-prefer-make-unique-and-make-shared-to-direct-new) — `()` 사용 이유
