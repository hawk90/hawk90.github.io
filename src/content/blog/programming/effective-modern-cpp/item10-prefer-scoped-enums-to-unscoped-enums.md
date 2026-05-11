---
title: "항목 10: 범위 없는 enum보다 범위 있는 enum(`enum class`)을 선호하라"
date: 2025-01-06T13:00:00
description: "enum class가 unscoped enum의 3가지 문제(이름 오염, 암묵 정수 변환, 전방 선언 불가)를 모두 해결."
tags: [C++, Enum, Modern C++, Scoped Enum]
series: "Effective Modern C++"
seriesOrder: 10
---

## 개요

C++11의 `enum class`(scoped enum)는 unscoped enum의 세 가지 문제를 모두 해결합니다:
1. **이름 오염** (namespace pollution)
2. **암묵적 정수 변환** (implicit integer conversion)
3. **전방 선언 불가** (no forward declaration)

→ 새 코드는 거의 항상 `enum class`. `enum`은 특수한 경우만.

## 필수 개념: enum의 두 종류

> **초보자를 위한 배경 지식**

<br>

### 전통 enum (unscoped, C-style)

```cpp
enum Color { black, white, red };

Color c = red;       // 암묵적으로 enum 값에 직접 접근
int   i = red;       // 암묵적으로 정수로 변환
```

C에서 그대로 옴. 열거자(black, white, red)가 **enum 정의된 스코프에 노출**.

### enum class (scoped, C++11+)

```cpp
enum class Color { black, white, red };

Color c = Color::red;    // 명시적 자격
int   i = Color::red;    // 에러! 암묵 변환 X
int   j = static_cast<int>(Color::red);   // 명시 캐스팅 OK
```

스코프 안에 갇혀 있고, 정수와 분리.

## 문제 1 — 이름 오염

### unscoped — 같은 스코프에 충돌

```cpp
enum Color { black, white, red };
auto white = false;   // 에러! white는 이미 enum 값

// 또 다른 헤더에:
enum Status { ok, error, white };   // 에러! white 중복
```

전역 이름공간을 더럽힘.

### scoped — 안에 갇힘

```cpp
enum class Color { black, white, red };
auto white = false;        // OK — 다른 white
Color c = Color::white;    // 명시 자격

enum class Status { ok, error, white };   // OK — Status::white와 Color::white 다름
```

## 문제 2 — 암묵적 정수 변환

### unscoped — 정수와 자유롭게 섞임

```cpp
enum Color { black, white, red };

Color c = red;
if (c < 14.5) { /* ... */ }     // OK?! Color → int → double 변환
                                 // → 의미가 무엇인가?

void process(int x);
process(c);                      // OK — Color → int 변환
                                 // 의도?

std::vector<bool> v;
v[Color::red];                   // 인덱스로 사용?
```

이런 변환이 가능하니 enum 본래 의도(범주형 타입)가 흐려집니다.

### scoped — 명시적 변환 필요

```cpp
enum class Color { black, white, red };

Color c = Color::red;
if (c < 14.5) { /* ... */ }                 // 에러! 변환 X
if (static_cast<double>(c) < 14.5) ...      // 명시 — 의도 분명

process(c);                                 // 에러
process(static_cast<int>(c));               // 명시
```

→ "Color는 정수가 아니다"가 코드에 강제됨.

## 문제 3 — 전방 선언 (Forward Declaration)

### unscoped — 어려움

```cpp
enum Color;            // C++03/대부분 컴파일러: 에러
enum Color : int;      // C++11에서만 OK (underlying type 명시)
```

unscoped enum은 컴파일러가 underlying type을 자동 선택 (값에 맞는 가장 작은 정수). 그러므로 **정의를 봐야** 크기·범위를 앎 → 전방 선언 어려움.

이게 컴파일 의존성을 늘림 — enum 정의가 헤더에 있어야 사용 가능.

### scoped — 자유롭게

```cpp
enum class Status;                    // OK — underlying type 기본 int
enum class Code : std::uint32_t;      // 명시도 가능
```

`enum class`는 underlying type 기본 `int` — 컴파일러가 크기 알 수 있음. **헤더에 forward declaration**, **정의는 .cpp**에 분리 가능.

→ **컴파일 의존성 ↓**.

```cpp
// status.h
enum class Status;   // 정의 안 보고도 OK
void f(Status s);

// status.cpp
enum class Status { ok, error, pending };

void f(Status s) { /* ... */ }
```

`status.h`만 include하는 다른 파일은 Status 정의 변경에도 재컴파일 안 됨.

## Underlying Type 명시

`enum class`도 underlying type을 명시 가능 — 메모리 절약, ABI 호환.

```cpp
enum class Code : std::uint8_t {     // 1 byte 강제
    success = 0,
    error   = 1,
    pending = 2
};

static_assert(sizeof(Code) == 1);
```

unscoped도 C++11부터 명시 가능:

```cpp
enum Color : std::uint16_t { black, white, red };
```

→ **메모리 절약** (대량 enum 객체 보관 시).

## unscoped enum이 유용한 경우

### `std::tuple` 인덱싱

`std::tuple`/`std::get<I>`은 컴파일 타임 정수 인덱스. unscoped enum이 자연스러움:

```cpp
using UserInfo = std::tuple<std::string, std::string, std::size_t>;

enum UserInfoFields { uiName, uiEmail, uiReputation };

UserInfo info = ...;
auto val = std::get<uiEmail>(info);    // 자동 변환 — 깔끔
```

scoped enum이라면:

```cpp
enum class UserInfoFields { uiName, uiEmail, uiReputation };

auto val = std::get<static_cast<std::size_t>(UserInfoFields::uiEmail)>(info);
                                        // verbose
```

C++14에서 `std::get<>` 호출 줄이는 헬퍼 작성 가능:

```cpp
template<typename E>
constexpr auto toUType(E e) noexcept {
    return static_cast<std::underlying_type_t<E>>(e);
}

auto val = std::get<toUType(UserInfoFields::uiEmail)>(info);
```

여전히 unscoped가 짧음.

### 비트 플래그

비트 OR로 결합하는 플래그:

```cpp
enum FileMode {
    Read   = 1,
    Write  = 2,
    Exec   = 4
};

FileMode mode = static_cast<FileMode>(Read | Write);   // OR — 정수처럼 동작
```

`enum class`는 `|`/`&`/`^` 안 됨 (정수 변환 X). 직접 오버로드:

```cpp
enum class FileMode { Read = 1, Write = 2, Exec = 4 };

inline FileMode operator|(FileMode a, FileMode b) {
    return static_cast<FileMode>(
        static_cast<int>(a) | static_cast<int>(b));
}

auto mode = FileMode::Read | FileMode::Write;
```

→ scoped + 직접 연산자 오버로드가 안전 + 모던.

## 비교 — 한눈에

| 측면 | `enum` (unscoped) | `enum class` (scoped) |
| --- | --- | --- |
| 이름 노출 | 정의 스코프에 노출 | 안에 갇힘 |
| 정수 변환 | ✅ 암묵 | ❌ 명시 필요 |
| 전방 선언 | 어려움 (underlying 명시 시만) | ✅ 자유 |
| 비트 OR | ✅ 자연 | 직접 오버로드 |
| 학습 친화 | C 출신엔 자연 | 모던 C++ 표준 |

## 권장

- **기본은 `enum class`**
- **비트 플래그**는 unscoped 또는 scoped + 연산자 오버로드 (취향)
- **`std::tuple` 인덱싱**처럼 정수 변환 의도된 자리만 unscoped

## 호환성 / 마이그레이션

`enum`을 `enum class`로 바꾸면 — **모든 사용처에서 명시 자격 필요** + 정수 변환 자리 캐스팅 필요. 큰 코드베이스라면 단계적:

1. 새 enum은 모두 `enum class`
2. 기존 enum은 그대로 두되, 핫스팟만 변환
3. `enum class`로 바꾸면 `Color::white` 형태로 모두 수정

## 핵심 정리

1. `enum class`는 **이름 오염 방지, 정수 변환 방지, 전방 선언 가능**
2. **기본으로 `enum class`** — 명시적 자격이 코드 의도 분명
3. unscoped는 `std::tuple` 인덱싱·비트 플래그 같은 특수 케이스만
4. underlying type을 `: T`로 명시 가능 (메모리 절약)
5. 마이그레이션은 단계적

## 관련 항목

- [항목 9: alias declaration](/blog/programming/effective-modern-cpp/item09-prefer-alias-declarations-to-typedefs) — `using`으로 트레이트 쉽게
