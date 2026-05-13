---
title: "Ch 6: Other Features I — Memory / Exceptions"
date: 2025-05-13T06:00:00
description: "Ownership / Smart Pointers / Rvalue / Friends / Exceptions / noexcept / RTTI / Casting / Streams."
tags: [Google, C++, Style-Guide, Smart-Pointer, Exception, RTTI, Casting]
series: "Google C++ Style"
seriesOrder: 6
draft: false
---

> Google 가이드의 가장 강한 의견이 모인 장. *예외 금지 / RTTI 제한*은 다른 표준과 가장 다른 결정.

## Ownership and Smart Pointers

### 규칙

> *Single ownership* 선호. `unique_ptr`로 표현.

```cpp
// 좋음 — 명확한 소유:
std::unique_ptr<Foo> CreateFoo() {
    return std::make_unique<Foo>();
}

// 회피 — 소유권 모호:
Foo* CreateFoo() {
    return new Foo();   // 누가 delete?
}
```

### Shared Ownership — 신중히

```cpp
// 신중:
std::shared_ptr<Foo> shared = std::make_shared<Foo>();
```

이유:
- 참조 카운트 비용
- 소유자가 — 누구인지 모호 (모두?)
- 순환 참조 위험

**사용 시기** — *진짜 공유*가 의미 있을 때만 (e.g., immutable shared cache).

### Raw Pointer

```cpp
void Process(Foo* foo);   // non-owning — *빌려 쓰기만*
```

규칙:
- 소유 — `unique_ptr` / `shared_ptr`
- 빌림 — raw pointer 또는 reference
- 일시적 (non-owning) — `T*`

### `std::make_unique` / `make_shared`

```cpp
// 좋음:
auto p = std::make_unique<Foo>(args);

// 회피:
std::unique_ptr<Foo> p(new Foo(args));   // 명시적 new
```

## Rvalue References

### 규칙

> *Move semantics* 또는 *forwarding*에 한정.

```cpp
// 좋음 — Move:
class Vector {
public:
    Vector(Vector&& other) noexcept;            // move 생성자
    Vector& operator=(Vector&& other) noexcept; // move 대입
};

// 좋음 — Forwarding:
template <typename T>
void Wrapper(T&& arg) {
    Inner(std::forward<T>(arg));
}
```

### 회피 사례

```cpp
// 회피 — 명확한 이유 없이:
void Process(Vector&& v);   // 왜 rvalue만?
```

대개 — `const Vector&` 또는 `Vector` (by value)가 충분.

## Friends

### 규칙

> 같은 파일에서만. 다른 파일의 `friend` — 회피.

```cpp
// foo.h:
class Foo {
private:
    int value_;
    friend class FooHelper;   // 같은 파일 OK
};

class FooHelper { /* ... */ };
```

이유 — `friend`는 *캡슐화 깨기*. 가능한 좁게.

### Unit Test의 `friend`

```cpp
class Foo {
private:
    int value_;
    friend class FooTest;   // 테스트 클래스 — OK
};
```

테스트 — 일반적 패턴.

## Exceptions

### 규칙

> **금지.** 새 코드는 예외 안 씀.

```cpp
// 회피 — 예외:
void DoSomething() {
    if (failed) throw std::runtime_error("...");
}

// 좋음 — Status 반환:
absl::Status DoSomething() {
    if (failed) return absl::InternalError("...");
    return absl::OkStatus();
}
```

### 진짜 이유

Google 가이드 — 가장 길게 정당화하는 결정.

```
"예외가 나빠서"가 아니라:
- Google 코드 1억 줄+ — 대부분 exception-unsafe
- 예외 도입 → 모든 코드 재검토 필요
- 비용이 — 비현실적
```

**기술적 우열보다 — 호환성 비용**.

### `absl::Status` / `absl::StatusOr`

```cpp
// Status:
absl::Status Init() {
    RETURN_IF_ERROR(SubInit());
    return absl::OkStatus();
}

// 값 + Status:
absl::StatusOr<Foo> CreateFoo() {
    if (failed) return absl::InvalidArgumentError("...");
    return Foo();
}

// 사용:
auto foo_or = CreateFoo();
if (!foo_or.ok()) return foo_or.status();
Foo foo = std::move(*foo_or);
```

### 예외 — *외부 라이브러리*에서는?

- 외부 라이브러리가 예외를 던지면 — 경계에서 잡아 Status로 변환

```cpp
absl::Status WrapThirdPartyCall() {
    try {
        third_party::Func();
        return absl::OkStatus();
    } catch (const std::exception& e) {
        return absl::InternalError(e.what());
    }
}
```

## `noexcept`

### 규칙

> 의미 있을 때만 사용. 특히 — *Move 생성자 / Move 대입*.

```cpp
class Vector {
public:
    Vector(Vector&& other) noexcept;   // 권장 (vector 안에서 효율적)
};
```

### 이유

- `std::vector` 등 — move 생성자가 `noexcept`면 — 효율적 사용 (move vs copy 선택)
- 그 외 — 거의 효과 없음

## Run-Time Type Information (RTTI)

### 규칙

> **제한.** 테스트 / 특수 상황 외 회피.

```cpp
// 회피:
if (Derived* d = dynamic_cast<Derived*>(base)) {
    // ...
}

// 좋음 — virtual method:
class Base {
public:
    virtual void DoSpecificThing();
};
class Derived : public Base {
public:
    void DoSpecificThing() override;
};

base->DoSpecificThing();   // 다형성
```

### 왜 회피?

```
- 타입에 따른 분기 = 다형성 안 쓰는 신호
- 새 타입 추가 → 모든 분기 코드 수정
- 캡슐화 위반
```

다형성 / Visitor 패턴 / `std::variant`로 대체.

### 허용 사례

- 테스트 (`dynamic_cast`로 — 특정 타입 확인)
- 디버그 출력
- Type-erased 컨테이너 내부

## Casting

### 규칙

> *C 스타일 캐스트 금지*. C++ 스타일 명시.

```cpp
// 회피:
int x = (int)y;
Foo* p = (Foo*)q;

// 좋음:
int x = static_cast<int>(y);
Foo* p = static_cast<Foo*>(q);
auto f = reinterpret_cast<float*>(buffer);
const_cast<Foo*>(constFoo);   // const 제거 (드물게)
```

### 각 캐스트의 용도

```
static_cast      — 일반 변환 (값, 포인터 계층, void*)
reinterpret_cast — 비트 재해석 (위험)
const_cast       — const 제거 (회피, 정말 필요할 때만)
dynamic_cast     — RTTI (제한)
```

### `bit_cast` (C++20)

```cpp
// 좋음 — 안전한 bit reinterpretation:
int bits = std::bit_cast<int>(some_float);
```

## Streams

### 규칙

> *사용자 입출력*에만. 로그 / 파싱 / 직렬화 — 회피.

```cpp
// OK — 사용자 입출력:
std::cout << "Hello, " << name << std::endl;

// 회피 — 로그:
std::cerr << "Error: " << msg << std::endl;
// 대신 — LOG(ERROR) << "..." 사용

// 회피 — 포매팅:
std::stringstream ss;
ss << "x=" << x;
// 대신 — absl::StrFormat("x=%d", x);

// 회피 — 파싱:
std::stringstream ss(input);
int x; ss >> x;
// 대신 — absl::SimpleAtoi 등
```

### 이유

- 스트림 — 느림, 무거움
- 로케일 / 포맷 변경의 — 상태 누설
- 모던 alternative — `absl::StrFormat`, `LOG` 매크로, ...

## 정리

- **Smart pointer** — `unique_ptr` 우선, `shared_ptr` 신중
- **Rvalue ref** — move / forwarding에만
- **Friends** — 같은 파일만
- **예외** — **금지**, `absl::Status`
- **noexcept** — move에 표시
- **RTTI** — 제한
- **C 캐스트 금지** — `static_cast` / `reinterpret_cast` / `const_cast` 명시
- **Streams** — 사용자 IO만

## 다음 장 예고

다음 — **Other Features II**. const / 정수 / 매크로.

## 관련 항목

- [Ch 5: Functions](/blog/embedded/standards/google-cpp/chapter05-functions)
- [Ch 7: const / Numbers / Macros](/blog/embedded/standards/google-cpp/chapter07-features-const-macros)
