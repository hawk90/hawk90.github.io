---
title: "항목 20: 단순 열거형보다는 클래스 열거형을 택하라"
date: 2026-05-09T19:00:00
description: "enum class — 스코프 안에 갇히고, 정수 변환은 명시적. 새 코드에서 일반 enum을 쓸 이유는 거의 없다."
tags: [C++, Enums, Type Safety]
series: "Beautiful C++"
seriesOrder: 20
draft: false
---

## 왜 이 항목이 중요한가?

C에서 물려받은 `enum`은 — 같은 스코프의 다른 모든 이름과 경쟁한다. 두 enum이 같은 이름을 가지면 충돌. 그리고 enum 값은 정수와 암묵적으로 상호 변환 — `Color::Red + 1`이 컴파일되고, 의미 없는 결과를 만든다.

```cpp
enum Color { Red, Green, Blue };
enum Status { Red, OK };      // ⚠️ Red 충돌
```

C++11 **`enum class`** 가 두 문제를 한 번에 해결한다 — 이름을 스코프에 가두고, 정수 변환은 명시적 캐스트 필요. 모던 C++에서 일반 `enum`을 쓸 이유는 거의 없다.

## 핵심 내용

- C 스타일 `enum`은 **이름이 둘러싼 스코프로 새어 나온다** → 이름 충돌 빈발
- `enum`은 **암시적으로 정수로 변환** → 의도치 않은 산술·비교 가능
- `enum class`(C++11)는 두 문제 모두 해결 — 스코프 안에 갇히고, 정수 변환은 명시적
- 기반 타입을 명시할 수 있어 **ABI / 직렬화에도 안전**: `enum class Color : uint8_t`

## 비교 — 일반 enum vs enum class

### Bad: 일반 enum

```cpp
enum Color  { Red, Green, Blue };
enum Status { Red, OK };       // ⚠️ Red 이름 충돌 — 컴파일 에러
```

이름이 enum 내부에 갇히지 않고 — 같은 스코프(예: namespace 또는 전역)에 그대로 나옴. 두 다른 도메인의 enum이 만나면 즉시 충돌.

```cpp
int x = Red + 1;      // 의도? Red(0) + 1 = 1 = Green
if (Color::Red == Status::Red) { /* ... */ }    // ⚠️ 둘 다 0 — 항상 true
```

정수 변환이 — 도메인이 다른 두 enum 값을 비교하게 함. 의미상 잘못이지만 컴파일러는 침묵.

### Good: enum class

```cpp
enum class Color  : uint8_t { Red, Green, Blue };
enum class Status : uint8_t { Red, OK };       // 충돌 없음 — 각자 스코프

Color c = Color::Red;
// int x = c + 1;                              // ❌ 컴파일 에러 — 변환 X
int x = static_cast<int>(c) + 1;                // 명시적 캐스트 필요

// if (Color::Red == Status::Red);             // ❌ 다른 타입
```

각 enum이 자기 스코프에 갇힘 — `Color::Red`로 명시. 정수 변환은 `static_cast` 강제.

## 기반 타입 명시

```cpp
enum class Priority : uint8_t {     // 1 byte
    Low = 1,
    Medium = 2,
    High = 3
};

enum class Flag : int {             // 4 byte
    None = 0,
    Read = 1,
    Write = 2,
    Execute = 4
};

enum class TimestampType : int64_t {     // 8 byte
    UnixEpoch = 0,
    // ...
};
```

이점:
- **메모리 크기 명시** — 직렬화·ABI에 중요
- **컴파일러가 보장** — 추측 안 함
- forward declaration 가능:
  ```cpp
  enum class Color : uint8_t;     // 정의 없이도 OK (기반 타입 알면)
  ```

## 함정 — bool 매개변수 대체

`enum class`의 가장 흔한 활용 — boolean 매개변수의 의미 명시:

```cpp
// Bad: bool 매개변수 — 의미 불명
void save(const std::string& path, bool compress, bool overwrite);

save("data.bin", true, false);    // 무엇이 무엇?
```

```cpp
// Good: enum class
enum class Compression { Off, On };
enum class Overwrite   { Forbid, Allow };

void save(const std::string& path, Compression c, Overwrite o);

save("data.bin", Compression::On, Overwrite::Forbid);     // 명확
```

호출 지점에서 의미가 코드로 표현 — bool 함정 회피.

## 함정 — 비트마스크 패턴

```cpp
enum class Flag : int {
    None  = 0,
    Read  = 1,
    Write = 2,
    Exec  = 4
};

Flag f = Flag::Read | Flag::Write;     // ❌ 컴파일 에러 — enum class에 | 없음
```

`enum class`는 정수 변환이 명시적이라 비트 연산도 차단. 비트마스크용으로는 — 연산자 오버로드 필요:

```cpp
constexpr Flag operator|(Flag a, Flag b) {
    return static_cast<Flag>(static_cast<int>(a) | static_cast<int>(b));
}

constexpr Flag operator&(Flag a, Flag b) {
    return static_cast<Flag>(static_cast<int>(a) & static_cast<int>(b));
}

constexpr bool any(Flag f) {
    return static_cast<int>(f) != 0;
}

Flag f = Flag::Read | Flag::Write;    // ✅
if (any(f & Flag::Read)) { /* ... */ }
```

또는 한 곳에 헬퍼 클래스:

```cpp
template<typename E>
class FlagSet {
    std::underlying_type_t<E> bits_ = 0;
public:
    FlagSet& set(E e) { bits_ |= static_cast<std::underlying_type_t<E>>(e); return *this; }
    bool has(E e) const { return bits_ & static_cast<std::underlying_type_t<E>>(e); }
};
```

## C++20 `using enum` — 좁은 범위에서 풀기

```cpp
enum class Color { Red, Green, Blue };

void process(Color c) {
    using enum Color;       // C++20 — 함수 안에서만 풀림
    
    switch (c) {
        case Red:   /* ... */ break;     // Color:: 생략 가능
        case Green: /* ... */ break;
        case Blue:  /* ... */ break;
    }
}
```

`enum class`의 명시성 + 좁은 범위의 편리함. switch 안에서 특히 유용.

## 함정 — 일반 enum의 underlying type

```cpp
enum Color { Red, Green, Blue };
sizeof(Color);     // 구현 정의 — 보통 int (4 byte)
```

일반 enum의 크기는 구현 정의 — 직렬화나 ABI에 위험. `enum class : type`로 명시.

## 함정 — `enum class`와 switch의 default

```cpp
enum class Direction { North, South, East, West };

void move(Direction d) {
    switch (d) {
        case Direction::North: /* ... */; break;
        case Direction::South: /* ... */; break;
        // East, West 빠뜨림 — 컴파일러가 경고할 수도
    }
}
```

`-Wswitch` 활성화 시 — 처리 안 한 case 경고. 모든 enum 값을 명시하거나 `default:`. **default를 두지 말고** 모든 case 명시가 — 새 enum 값 추가 시 빠뜨리기 어려움 (컴파일러가 알려줌).

## C++23 `std::to_underlying`

```cpp
enum class Code : int { OK = 0, Error = -1 };

auto v = std::to_underlying(Code::OK);     // C++23 — 0
// 이전: static_cast<int>(Code::OK)
```

`enum class` → 기반 정수 변환을 짧게.

## 모던 변형 — reflection 기반 enum-to-string

```cpp
// magic_enum 라이브러리 (third-party)
constexpr auto name = magic_enum::enum_name(Color::Red);     // "Red"
```

C++26 reflection이 표준화 예정. 현재는 third-party 또는 manual mapping.

## 정당한 일반 enum 사용처

```cpp
// 비트마스크에 종종 일반 enum 사용 (가독성)
namespace flags {
    enum : uint32_t {
        None    = 0,
        Active  = 1 << 0,
        Hidden  = 1 << 1,
        Locked  = 1 << 2
    };
}

uint32_t f = flags::Active | flags::Hidden;     // OK — 자동 정수
```

비트마스크 + 의도적으로 정수 의미 — 일반 enum도 OK. 단, **anonymous enum** 또는 **enum 내부의 namespace**로 충돌 방지.

## C 호환

```cpp
// C 헤더에서 정의된 enum과 인터페이스
extern "C" {
    enum Status { OK = 0, ERROR = -1 };
    int do_something(enum Status* out);
}

// C++ 코드에서 사용
enum Status s = OK;     // C 스타일
```

C 코드와 인터페이스할 땐 — 일반 enum 그대로 사용. C에는 enum class 없음.

## 표준 라이브러리의 `enum class` 사용

```cpp
std::byte b{0xff};          // C++17 std::byte — enum class : unsigned char
std::launch::async;          // std::async 정책
std::memory_order::relaxed;  // atomic 메모리 순서
std::ios::failbit;           // stream 상태
std::filesystem::file_type::regular;
```

표준이 새 enum을 추가할 때 — 거의 항상 `enum class`. C++ 모던 코드의 표준.

## 실무 가이드 — 결정 트리

```
새 enum이 필요하다 — 어떤 형태?
├── 일반 도메인 (Color, Status 등) → enum class
├── bool 매개변수 대체 → enum class
├── 비트마스크 + 가독성 우선 → 일반 enum (anonymous) 또는 enum class + 연산자 정의
├── C 호환 → 일반 enum
└── 기반 타입 중요 (ABI, 직렬화) → enum class : type
```

## 실무 가이드 — 체크리스트

- [ ] 새 enum은 `enum class`로?
- [ ] 기반 타입(`: uint8_t` 등) 명시?
- [ ] forward declaration 가능?
- [ ] bool 매개변수 대신 `enum class`로 명시?
- [ ] switch에 `-Wswitch` 활성화?
- [ ] 비트마스크는 연산자 오버로드 또는 helper?
- [ ] C++20+: `using enum`으로 좁은 범위 단축?

## 정리

`enum class`는 **스코프와 타입 안전성**을 동시에 준다. 새 코드에서 일반 `enum`을 쓸 이유는 거의 없다.

규칙:
- **`enum class`가 기본**
- **`: type`으로 기반 타입 명시** — 직렬화·ABI 안전
- **`using enum`** (C++20) — 좁은 범위 단축
- **비트마스크** — 연산자 오버로드 또는 helper 클래스
- 일반 enum은 — C 호환 또는 정의 의도된 정수 변환에만

## 관련 항목

- [항목 8: 인자 적게 유지](/blog/programming/beautiful-cpp/item08-keep-function-arguments-minimal) — bool 매개변수 → enum class
- [항목 25: 정적 타입 안전성](/blog/programming/beautiful-cpp/item25-static-type-safety) — 강 타입 패턴
- [Effective Modern C++ 항목 10: scoped enums 선호](/blog/programming/effective-modern-cpp/item10-prefer-scoped-enums-to-unscoped-enums) — 같은 주제 심층
