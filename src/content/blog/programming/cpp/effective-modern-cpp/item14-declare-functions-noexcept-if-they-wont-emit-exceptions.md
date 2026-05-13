---
title: "항목 14: 예외를 방출하지 않을 함수는 noexcept로 선언하라"
date: 2025-01-06T17:00:00
description: "noexcept는 단순 문서가 아니라 컴파일러·라이브러리 활용 — 특히 vector::push_back의 강력한 예외 보증."
tags: [C++, noexcept, Exception, Move Semantics, Modern C++]
series: "Effective Modern C++"
seriesOrder: 14
---

## 왜 이 항목이 중요한가?

`noexcept`는 "이 함수는 예외를 던지지 않는다"는 단순한 문서 같아 보인다. 그런데 사실은 **컴파일러와 표준 라이브러리가 활용하는 인터페이스 계약**이다. 특히 `std::vector::push_back`의 강력한 예외 보증은 move 생성자가 `noexcept`인지에 따라 다른 알고리즘을 선택한다. 큰 객체라면 수십 배 성능 차이가 난다.

이 항목은 다음을 정리한다.

- `noexcept`의 두 의미 (명세 vs 표현식 검사).
- vector의 재할당에서 noexcept가 결정적인 이유.
- 자동으로 noexcept가 되는 함수들 (소멸자 등).
- 조건부 noexcept 패턴.
- noexcept를 약속할 때의 트레이드오프.

## 개요

`noexcept`는 단순 주석이 아니라 **컴파일러가 활용하는 인터페이스 계약**이다. 표준 라이브러리는 함수가 `noexcept`인지에 따라 다른 알고리즘을 선택한다. 특히 `vector::push_back`의 **강력한 예외 보증**이 move 생성자의 `noexcept` 여부에 의존한다.

## 필수 개념: noexcept의 두 의미

> **초보자를 위한 배경 지식**

<br>

### `noexcept`의 두 역할

`noexcept`는 두 곳에서 등장한다.

**1. 함수 명세 (specifier)**

```cpp
int f() noexcept;        // 이 함수는 예외를 던지지 않는다
int g() noexcept(true);  // 동일
int h() noexcept(false); // 던질 수 있다 (default)
```

**2. 표현식 검사 (operator)**

```cpp
constexpr bool b = noexcept(f());   // f()가 noexcept인지 컴파일 타임에 검사
```

이 항목은 주로 **명세** 의미를 다룬다.

### `noexcept` vs `throw()` (C++98)

```cpp
int f() throw();      // C++98 — 예외 X (deprecated)
int f() noexcept;     // C++11+ — 예외 X (권장)
```

`noexcept`가 우월한 이유는 두 가지다.

- 더 간결하다.
- 컴파일러 최적화가 더 강력하다. `throw()`는 위반 시 stack unwinding 후 `unexpected_handler`를 호출하지만, `noexcept`는 즉시 `terminate`를 호출한다 (옛 stack frame을 정리하지 않아도 OK → 더 작은 코드).

## noexcept가 의미하는 것

`noexcept` 함수가 예외를 던지면 **`std::terminate`** 가 호출된다. 컴파일러는 이를 알기에 다음과 같은 영향을 받는다.

| 영향 | 비-noexcept | noexcept |
| --- | --- | --- |
| stack unwinding 코드 생성 | ✅ | ❌ — 생략 |
| 예외 처리 분기 | ✅ | ❌ — 제거 |
| 인라인·최적화 | 부분적 | 더 적극적 |
| 호출자에서 try 블록 | 필요할 수도 | 불필요 |

**코드 크기는 줄어들고 속도는 올라간다.**

## move 연산과 vector의 강력한 예외 보증

### vector::push_back의 재할당

`std::vector::push_back`이 용량 부족 시 하는 일은 다음과 같다.

1. 새 (더 큰) 메모리 할당.
2. 기존 원소들을 새 메모리로 복사 또는 move.
3. 옛 메모리 해제.

C++98 시절에는 **복사**만 했다. 한 원소 복사가 실패해도 옛 메모리는 무사했다 (강력 예외 보증).

C++11에는 move도 가능해졌다. 한 원소 move가 실패하면 **옛 메모리도 망가진다** (강력 보증 위반).

### 표준 라이브러리의 결정

> `vector` 등 표준 컨테이너는 다음 규칙으로 move/copy를 선택한다.
> 
> - move 생성자가 **`noexcept`** 라면 → **move 사용** (빠름).
> - 그렇지 않으면 → **copy 사용** (느리지만 강력 보증 유지).

### 함의 — move 생성자에 noexcept 안 붙이면 성능 손실

```cpp
class Widget {
public:
    Widget(Widget&&);   // noexcept 없음
};

std::vector<Widget> v;
v.push_back(...);       // 재할당 시 — copy 사용 (move 못 씀)
```

```cpp
class Widget {
public:
    Widget(Widget&&) noexcept;   // noexcept 명시
};

std::vector<Widget> v;
v.push_back(...);       // 재할당 시 — move 사용 ✅
```

큰 객체라면 **수십 배 차이**가 난다. **move 생성자에 noexcept는 거의 항상 권장된다.**

## 자동으로 noexcept인 함수

C++11+ 다음 함수는 자동으로 `noexcept`다.

| 함수 | 기본 |
| --- | --- |
| 소멸자 | **`noexcept`** (사용자가 `noexcept(false)` 명시 안 하면) |
| 컴파일러 자동 생성 (default ctor, copy ctor, move ctor 등) | **`noexcept` if 멤버들이 모두 noexcept** |
| 메모리 해제 함수 (`operator delete`) | `noexcept` |

**소멸자에서 throw는 금지**다. 자동 noexcept를 깨면 terminate된다.

## 조건부 noexcept

함수의 noexcept 여부가 다른 표현식에 의존할 때 쓴다.

```cpp
template<typename T>
void swap(T& a, T& b) noexcept(noexcept(T(std::move(a))) &&
                               noexcept(a = std::move(b))) {
    T temp(std::move(a));
    a = std::move(b);
    b = std::move(temp);
}
```

읽는 법은 이렇다.

- 바깥 `noexcept(...)` — 이 함수의 noexcept 여부 결정.
- 안의 `noexcept(...)` — 표현식이 noexcept인지 검사.

"이 안에서 호출하는 연산이 모두 noexcept면 이 함수도 noexcept"라는 의미다.

`std::swap`, `std::pair::swap` 등이 모두 이 패턴이다.

## `noexcept`로 만들 수 있는 함수

다음 부류는 `noexcept`가 안전하다.

| 부류 | 이유 |
| --- | --- |
| 메모리 해제 (`free`, `delete`) | 표준이 `noexcept` 보장 |
| 정수·포인터 산술 | 예외 없음 |
| **소멸자** | C++11+ 기본 noexcept |
| **swap** (일부) | move·copy가 noexcept면 |
| 단순 조건/분기 | 보통 |
| `std::abort` 호출 | 종료 |

다음은 보통 **noexcept로 만들 수 없다**.

- `new` (`std::bad_alloc`을 던질 수 있다).
- 파일 I/O (`std::ios_base::failure`).
- `std::throw` 명시.
- 사용자 코드 호출 (사용자가 던질 수 있다).

## 표준 라이브러리의 noexcept 보장

| 함수 | 보장 |
| --- | --- |
| `std::move`, `std::forward` | ✅ noexcept |
| `std::swap` for built-in | ✅ |
| `std::vector::swap`, `clear`, `pop_back` | ✅ |
| `std::vector::push_back` | move/copy에 따라 다름 |
| `std::vector::emplace_back` | 마찬가지 |

표준 컨테이너 작성자의 의도가 보인다. **자기 클래스도 noexcept를 보장하면 표준이 더 잘 활용**한다.

## ⚠️ 주의 — noexcept는 인터페이스 계약

한번 약속하면 **사용자가 의존**한다. 깨기 어렵다.

```cpp
void f() noexcept;   // 약속

// 사용자
static_assert(noexcept(f()));   // 검사
if constexpr (noexcept(f())) { /* 다른 경로 */ }
```

나중에 `noexcept`를 떼면 사용자 코드가 깨진다.

**확실하지 않으면 noexcept를 안 붙이는 게 안전**하다.

## noexcept 잘못 사용 — terminate

```cpp
void f() noexcept {
    throw std::runtime_error("!");   // terminate!
}
```

stack unwinding 없이 즉시 종료된다. 디버깅이 어렵다.

**정말 던지지 않을 함수에만 붙인다.** `try`-`catch`로 함수 안에서 다 잡거나, 예외가 발생하지 않는다고 보장할 수 있는 코드에만 붙인다.

## 마이그레이션 — 기존 함수에 noexcept

원칙은 다음과 같다.

1. **먼저 move 생성자/대입**부터. 표준 컨테이너 성능에 큰 차이가 있다.
2. **소멸자**는 기본 noexcept라 검증 정도만 한다.
3. **swap**은 조건부 noexcept 패턴을 쓴다.
4. **단순 getter**는 안전하면 추가한다.
5. **나머지**는 신중히, 의심되면 안 붙인다.

## 흔한 패턴

### move ctor

```cpp
class Widget {
public:
    Widget(Widget&& rhs) noexcept
        : data(std::move(rhs.data)) {}   // string·vector move는 noexcept
    
    Widget& operator=(Widget&& rhs) noexcept {
        data = std::move(rhs.data);
        return *this;
    }
};
```

### swap

```cpp
class Widget {
public:
    void swap(Widget& other) noexcept {
        using std::swap;
        swap(data, other.data);
    }
};

void swap(Widget& a, Widget& b) noexcept { a.swap(b); }
```

### 소멸자

```cpp
~Widget() {       // 자동 noexcept — 명시 X도 OK
    // 내부에서 던질 가능성 없음 보장
}
```

## 핵심 정리

1. `noexcept`는 **인터페이스 계약**이다. 컴파일러와 표준 라이브러리가 활용한다.
2. **move 연산은 가능하면 `noexcept`** 로 만든다. vector 성능에 큰 차이가 난다.
3. **소멸자는 기본 noexcept** (C++11+)다. 던지면 terminate된다.
4. **조건부 noexcept** (`noexcept(noexcept(...))`) 는 템플릿에 적합하다.
5. 한번 약속한 noexcept는 깨기 어렵다. **신중히** 결정해야 한다.

## 관련 항목

- [항목 13: iterator보다 const_iterator를 선호하라](/blog/programming/cpp/effective-modern-cpp/item13-prefer-const-iterators-to-iterators) — 인터페이스 계약 표현
- [항목 17: 특수 멤버 자동 생성](/blog/programming/cpp/effective-modern-cpp/item17-understand-special-member-function-generation) — move 자동 생성과 noexcept
- [항목 29: move 가정](/blog/programming/cpp/effective-modern-cpp/item29-assume-move-operations-are-not-present-not-cheap-and-not-used) — noexcept 없으면 move가 안 쓰인다
