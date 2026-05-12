---
title: "항목 25: 예외를 던지지 않는 swap 지원을 고려하라"
date: 2025-02-04T17:00:00
description: "사용자 정의 swap의 효율과 ADL 패턴 — 멤버 swap, 같은 네임스페이스 비-멤버 swap, std::swap 특수화."
tags: [C++, Effective C++, Exception Safety, swap]
series: "Effective C++"
seriesOrder: 25
---

## 개요

`std::swap`의 기본 구현은 **세 번의 복사** — 자원 관리 클래스에선 비효율. `pimpl` 패턴처럼 내부 포인터만 교환하면 되는 경우엔 사용자 정의 swap이 훨씬 빠릅니다. 더 중요한 건 — copy-and-swap 패턴(항목 11), 강력한 예외 보증(항목 29) 등의 **이디엄이 swap에 의존**한다는 점. 효율적이고 `noexcept`인 swap을 제공하는 게 표준 라이브러리와의 매끄러운 결합을 위한 핵심.

## 기본 `std::swap`의 비용

```cpp
namespace std {
    template<typename T>
    void swap(T& a, T& b) noexcept(...) {
        T tmp(std::move(a));       // 또는 T tmp(a);
        a = std::move(b);          // 또는 a = b;
        b = std::move(tmp);
    }
}
```

C++11+ 에선 이동 의미론 활용 — 이동 가능한 타입은 `std::swap`도 빠름. 그러나 **`pimpl`처럼 내부에 큰 자료 구조를 둔 wrapper 타입**은 더 빠를 수 있음.

```cpp
class Widget {
    WidgetImpl* pImpl;     // 모든 실제 데이터
public:
    // ... 멤버 함수들이 pImpl에 위임 ...
};

Widget a, b;
std::swap(a, b);          // C++03: 3 번의 복사 (큰 객체)
                           // C++11+: 3 번의 이동 (각 이동 = 포인터 교환)
                           //         → 6번의 포인터 이동
```

**더 빠른 방법**: `pImpl` 자체만 교환 — 단 한 번의 포인터 교환.

## 패턴 1 — 멤버 swap

```cpp
class Widget {
    WidgetImpl* pImpl;
public:
    void swap(Widget& other) noexcept {
        using std::swap;         // ADL 활성화 (멤버 내부에서도)
        swap(pImpl, other.pImpl);   // 포인터만 교환 — O(1)
    }
};

Widget a, b;
a.swap(b);     // ✅ 효율적
```

`noexcept` 명시 — 강력한 예외 보증을 위해 swap은 절대 throw하면 안 됨.

## 패턴 2 — 비-멤버 swap, 같은 네임스페이스

```cpp
namespace MyNS {
    class Widget { /* ... */ };

    void swap(Widget& a, Widget& b) noexcept {   // 비-멤버 swap
        a.swap(b);
    }
}
```

**왜 비-멤버도?** — 일반 코드(템플릿)에서 swap을 호출할 때 ADL(Argument-Dependent Lookup)이 찾아주기 위해. 멤버 swap만 있으면 `using std::swap;` + `swap(a, b)` 호출 시 `MyNS::swap`이 발견 안 됨.

```cpp
template<typename T>
void doSomething(T& a, T& b) {
    using std::swap;     // std::swap 후보로 등록
    swap(a, b);          // ADL이 MyNS::swap 찾음 (T가 MyNS의 타입이면)
                         // 없으면 std::swap fallback
}
```

이게 **모던 C++의 표준 swap 호출 idiom**.

## 패턴 3 (선택) — `std::swap` 특수화

C++98 시절 일부 케이스에서 사용:

```cpp
namespace std {
    template<>     // 전체 특수화
    void swap<MyNS::Widget>(MyNS::Widget& a, MyNS::Widget& b) noexcept {
        a.swap(b);
    }
}
```

**왜 권장 안 함**:
- 전체 특수화는 OK, **부분 특수화는 표준에서 금지** — 템플릿 클래스에 사용 불가
- 일반 코드는 `using std::swap;` + unqualified 호출 사용 — ADL 트리거됨
- 패턴 2(비-멤버 swap)가 더 일반적

```cpp
namespace MyNS {
    template<typename T>
    class Widget { /* ... */ };

    template<typename T>
    void swap(Widget<T>& a, Widget<T>& b) noexcept {   // 부분 특수화 X — 함수 오버로드 O
        a.swap(b);
    }
}
```

비-멤버 swap은 함수 오버로드(특수화가 아니라 일반 함수) — 템플릿 클래스에도 적용 가능.

## 호출자 측 — `using std::swap` 후 unqualified

```cpp
template<typename T>
void doSomething(T& a, T& b) {
    using std::swap;       // ✅ std::swap 후보 등록 + ADL 활성화
    swap(a, b);            // 사용자 정의가 있으면 그걸, 없으면 std::swap
}
```

`std::swap(a, b)`로 **명시적**으로 호출하면 ADL이 작동 안 함:

```cpp
template<typename T>
void doSomethingWrong(T& a, T& b) {
    std::swap(a, b);     // ❌ std::swap 강제 — 사용자 정의 swap 못 찾음
}
```

## `noexcept`의 중요성

swap이 `noexcept`여야 하는 이유:
- **강력한 예외 보증**(strong exception safety) 구현에 핵심 — copy-and-swap이 swap에 의존
- `std::vector` 등 표준 컨테이너의 효율적 동작 — 재할당 시 이동 vs 복사 선택이 noexcept에 의존

```cpp
class Widget {
public:
    void swap(Widget& other) noexcept {        // noexcept!
        using std::swap;
        swap(pImpl, other.pImpl);
    }
};
```

C++11+ 에선 swap이 noexcept면 — `std::vector::push_back` 같은 동작에서 strong exception safety 보장 + 이동 활용.

## copy-and-swap 패턴 (항목 11) 의 핵심

```cpp
class Widget {
public:
    Widget& operator=(Widget rhs) noexcept {   // 값으로 받음
        swap(rhs);                              // swap만 호출
        return *this;
    }
};
```

`operator=`가 단일 함수로 자기 대입 처리·강력한 예외 보증 동시 달성 — **swap이 noexcept라는 전제**가 핵심. swap이 throw 가능하면 이 idiom 깨짐.

## std::vector::swap — 표준 라이브러리 예

표준 라이브러리는 모든 컨테이너에 멤버 `swap`을 제공:

```cpp
std::vector<int> a, b;
a.swap(b);         // 멤버 — O(1) (포인터/크기 교환만)

// 또는 비-멤버 std::swap(a, b);  — 같은 결과 (특수화됨)
```

내부적으로 capacity 포인터·size·allocator만 교환 — 요소 복사·이동 X.

## 흔한 함정 — std::swap 특수화 안에 비싼 작업

```cpp
namespace std {
    template<>
    void swap(MyType& a, MyType& b) {     // ⚠️ noexcept 누락
        MyType tmp = std::move(a);         // 이동이 throw할 수 있다면?
        a = std::move(b);
        b = std::move(tmp);
    }
}
```

표준 라이브러리는 swap이 noexcept일 거라 가정 — 깨지면 정의되지 않은 동작.

## 모던 변형 — `std::swap`의 noexcept 추론

C++11+ `std::swap`은:

```cpp
namespace std {
    template<typename T>
    void swap(T& a, T& b)
        noexcept(std::is_nothrow_move_constructible_v<T> &&
                 std::is_nothrow_move_assignable_v<T>)
    {
        T tmp(std::move(a));
        a = std::move(b);
        b = std::move(tmp);
    }
}
```

타입의 이동이 noexcept면 std::swap도 noexcept. 사용자 정의 swap은 항상 명시적으로 `noexcept`.

## 실무 가이드 — swap 작성 체크리스트

자원을 직접 관리하는 클래스라면:

- [ ] **멤버 `swap`** 정의 — `noexcept`, 내부 포인터/핸들만 교환
- [ ] **같은 네임스페이스의 비-멤버 `swap`** — `a.swap(b)`로 위임
- [ ] `std::swap` 특수화는 보통 불필요
- [ ] 멤버 swap 본문에서도 `using std::swap;` (subobject swap에 ADL 활용)
- [ ] copy-and-swap 패턴 사용 시 swap noexcept 확인
- [ ] 호출자 측에선 `using std::swap; swap(a, b);` idiom

## 핵심 정리

1. 큰 wrapper 객체(`pImpl`, RAII)는 **효율적 swap** 제공 — 내부 포인터 교환
2. 멤버 `swap` + 같은 네임스페이스의 **비-멤버 `swap`** (ADL 지원)
3. **`noexcept` 표시** — 강력한 예외 보증, 표준 라이브러리 효율
4. 호출자 측은 `using std::swap;` + unqualified `swap(a, b)` idiom
5. `std::swap` 특수화는 일반 함수 오버로드(비-멤버 swap)로 대체

## 관련 항목

- [항목 11: 자기 대입 처리](/blog/programming/cpp/effective-cpp/item11-handle-assignment-to-self-in-operator-equals) — copy-and-swap idiom
- [항목 23: 비-멤버 비-friend 선호](/blog/programming/cpp/effective-cpp/item23-prefer-non-member-non-friend-functions-to-member-functions) — ADL의 활용
- [항목 29: 예외 안전 코드](/blog/programming/cpp/effective-cpp/item29-strive-for-exception-safe-code) — 강력한 예외 보증의 도구
