---
title: "항목 27: 캐스팅을 최소화하라"
date: 2025-02-05T11:00:00
description: "C++ 4가지 캐스트의 용도, 흔한 함정(슬라이싱, 다중 상속 오프셋), dynamic_cast 비용과 대안."
tags: [C++, Effective C++, Casting]
series: "Effective C++"
seriesOrder: 27
draft: true
---

## 왜 이 항목이 중요한가?

캐스팅은 "**나는 컴파일러보다 더 잘 안다**"는 선언이다. 강력하지만 그만큼 위험하다. 코드에 캐스트가 자주 등장한다는 것은 보통 **설계 문제의 신호**다.

C++은 C 시절의 모호한 `(T)x` 문법을 버리고 네 가지 캐스트로 의도를 구분하게 했다.

- `const_cast` — const 제거.
- `dynamic_cast` — 다형성 타입의 안전한 다운캐스트 (RTTI 비용).
- `reinterpret_cast` — 비트 재해석 (구현 정의 동작).
- `static_cast` — 그 외 명시적 변환.

각각이 다른 함정을 만든다. 슬라이싱, 다중 상속 오프셋 오류, RTTI 비용, UB. 이 항목은 네 캐스트의 정확한 용도와 캐스트를 피하는 설계 대안을 정리한다.

## 개요

캐스팅은 타입 시스템을 의도적으로 우회하는 도구다. 강력하지만 위험하다. C++은 4가지 캐스트로 의도를 명확히 구분하도록 했지만(`const_cast`, `dynamic_cast`, `reinterpret_cast`, `static_cast`), **캐스트가 등장한다는 것은 보통 설계 문제의 신호**다. 잘못된 캐스트는 슬라이싱, 다중 상속의 오프셋 오류, RTTI 비용 등 실전 함정을 만든다.

## 필수 개념: C-style cast의 문제

> **초보자를 위한 배경 지식**

<br>

C 시절의 캐스트 문법:

```cpp
(T)expr           // C-style
T(expr)           // 함수 호출 스타일 (같은 의미)
```

이 두 형태는 **컴파일러가 가능한 모든 캐스트를 시도** — `static_cast`, `const_cast`, `reinterpret_cast`까지 — 의도가 무엇인지 코드에 드러나지 않습니다.

```cpp
int*       p = ...;
const int* cp = (const int*)p;        // const_cast인가, static_cast인가?
char*      bp = (char*)p;             // reinterpret_cast인가?
double     d = (double)42;            // static_cast?
```

코드만 봐선 의도를 알 수 없고, grep으로 "위험한 캐스트"를 찾기도 어렵습니다.

## C++ 4가지 캐스트

```cpp
const_cast<T>(expr)           // const 제거 (또는 추가)
dynamic_cast<T>(expr)         // 다형적 down-cast (RTTI 사용)
reinterpret_cast<T>(expr)     // 비트 재해석 (포인터 ↔ 정수 등)
static_cast<T>(expr)          // 일반 변환 (암묵 변환의 명시화)
```

각각 정확한 의도:

| 캐스트 | 용도 | 비용 | 위험성 |
| --- | --- | --- | --- |
| `static_cast` | 컴파일 타임 가능한 변환 (`int→double`, base↔derived) | 0 | 낮음 |
| `dynamic_cast` | 런타임 안전한 down-cast | RTTI 검사 | 중간 (실패 시 nullptr/예외) |
| `const_cast` | const 제거 | 0 | 높음 (원본이 정말 non-const여야) |
| `reinterpret_cast` | 비트 재해석 | 0 | 매우 높음 (이식성·UB 위험) |

### static_cast 예

```cpp
double d = 3.14;
int n = static_cast<int>(d);           // 3, 명시적 잘림

Base* b = static_cast<Base*>(derived);    // up-cast (암묵도 가능, 명시는 옵션)
Derived* d = static_cast<Derived*>(b);    // down-cast — 컴파일러가 신뢰
                                           // 잘못된 객체면 UB
```

### dynamic_cast 예

```cpp
Base* b = ...;
if (auto* d = dynamic_cast<Derived*>(b)) {
    // d가 nullptr 아니면 진짜 Derived
    d->derivedMethod();
}

// 참조 형태 — 실패 시 std::bad_cast
try {
    Derived& d = dynamic_cast<Derived&>(*b);
} catch (const std::bad_cast& e) {
    // ...
}
```

RTTI를 사용하므로 클래스에 적어도 하나의 virtual 함수가 있어야 합니다.

### const_cast 예

```cpp
void legacy(char* p);                  // C API — const 매개변수 없음

const char* s = "hello";
legacy(const_cast<char*>(s));          // ⚠️ legacy가 정말 수정 안 하면 OK
                                        //    수정하면 UB (s는 literal!)
```

const_cast는 마지막 수단 — 보통 API 설계의 결함.

### reinterpret_cast 예

```cpp
int* p = ...;
uintptr_t addr = reinterpret_cast<uintptr_t>(p);    // 포인터 → 정수

void* buf = ...;
Header* h = reinterpret_cast<Header*>(buf);          // 비트 재해석
                                                      // alignment, strict aliasing 위험
```

저수준 코드, 시스템 프로그래밍에서만. 이식성 X.

## 함정 1 — 임시 객체 생성 (슬라이싱 with 캐스트)

```cpp
class Window {
public:
    virtual void onResize();
};

class SpecialWindow : public Window {
public:
    void onResize() override {
        static_cast<Window>(*this).onResize();    // ⚠️ 임시 Window 객체 생성!
        // 의도: base의 onResize 호출
        // 실제: 1) *this를 Window로 캐스트 → 임시 Window 생성
        //       2) 임시에 onResize 호출
        //       3) *this의 base 부분은 변경 없음
        //
        // SpecialWindow specific code...
    }
};
```

**해결** — base 함수를 명시적으로 호출:

```cpp
void onResize() override {
    Window::onResize();    // ✅ 올바름 — *this의 base 부분에 호출
    // SpecialWindow specific...
}
```

`static_cast`로 base 타입 객체를 만든다 ≠ "base로 보기". 후자는 `static_cast<Window&>(*this)` 또는 그냥 `Window::onResize()`.

## 함정 2 — 다중 상속과 포인터 오프셋

```cpp
class A { int a; };
class B { int b; };
class Derived : public A, public B {};

Derived d;
A* pa = &d;        // 보통 &d 그대로 (오프셋 0)
B* pb = &d;        // ⚠️ &d + sizeof(A) — 컴파일러가 자동 조정
                   // (A 부분이 먼저, B 부분이 sizeof(A) byte 뒤)
```

다중 상속에서 **포인터 값은 base에 따라 다름**. 컴파일러가 자동으로 오프셋 조정. `reinterpret_cast`는 이 조정 안 함 — UB.

```cpp
B* bad = reinterpret_cast<B*>(&d);    // ⚠️ A 부분을 B로 잘못 해석
bad->b = 10;                           // 사실은 A의 a를 건드림!
```

down-cast가 필요하면 `dynamic_cast` — 오프셋 조정 포함.

## 함정 3 — dynamic_cast의 비용과 남용

```cpp
for (auto* ptr : container) {
    if (auto* d = dynamic_cast<Derived*>(ptr)) {
        d->doSomething();
    }
}
```

매 iteration마다 RTTI 검사 — 클래스 이름 비교, 상속 트리 탐색. hot loop에선 비쌈.

**대안 1**: 가상 함수로 다형성 정상화

```cpp
class Base {
public:
    virtual void doSomething() {}     // 기본은 아무것도 안 함
};

class Derived : public Base {
public:
    void doSomething() override { /* ... */ }
};

for (auto* ptr : container) {
    ptr->doSomething();    // 가상 함수 — 알아서 디스패치
}
```

**대안 2**: type-safe 컨테이너 분리

```cpp
std::vector<Derived*> derivedOnly;     // dynamic_cast 불필요
std::vector<Base*>    others;
```

`dynamic_cast`가 자주 등장하면 — **설계가 다형성을 활용 못 하고 있다는 신호**.

## 함정 4 — const_cast 후 수정

```cpp
const char* s = "hello";              // string literal — 읽기 전용 메모리
char* p = const_cast<char*>(s);
p[0] = 'H';                            // ⚠️ UB — 읽기 전용 메모리 수정

const std::string s = "hello";
char* p = const_cast<char*>(s.data());
p[0] = 'H';                            // ⚠️ 마찬가지 UB
```

const_cast는 **컴파일러 검사를 우회만** 함 — 원본이 정말 mutable이 아니면 UB. 정말 필요한 경우는 거의 없음.

## 캐스트 없이 풀 수 있는 경우

```cpp
// ❌ 캐스트
if (Animal* a = dynamic_cast<Animal*>(thing)) {
    a->speak();
}

// ✅ 가상 함수
class Thing {
public:
    virtual void speak() = 0;       // 모든 Thing이 speak 가능
};
```

```cpp
// ❌ 캐스트
const_cast<Widget&>(w).modify();

// ✅ API 수정 — non-const 메서드를 별도 인터페이스로
```

```cpp
// ❌ reinterpret_cast — 비트 비교
if (reinterpret_cast<uintptr_t>(p1) < reinterpret_cast<uintptr_t>(p2)) ...

// ✅ std::less<T*>
if (std::less<T*>{}(p1, p2)) ...      // 모든 포인터에 대해 strict weak ordering
```

## 모던 변형 — `std::bit_cast` (C++20)

`reinterpret_cast`보다 안전한 비트 재해석:

```cpp
float f = 3.14f;
auto bits = std::bit_cast<std::uint32_t>(f);    // C++20
                                                  // 타입 크기 일치 + trivially copyable 검사
```

`memcpy`로 풀던 옛 패턴의 표준화. strict aliasing 위반 없음.

## 흔한 패턴 — `const_cast`로 코드 중복 제거 (항목 3)

```cpp
class TextBlock {
public:
    const char& operator[](size_t i) const { /* 본문 */ }
    char& operator[](size_t i) {
        return const_cast<char&>(
            static_cast<const TextBlock&>(*this)[i]
        );
    }
};
```

이건 **안전한 const_cast 사용** — 호출자가 원래 non-const라는 걸 알기 때문. 항목 3.

## 실무 가이드 — 결정 트리

```
캐스트가 필요한가?
├── 컴파일 타임 변환 (int↔double, 명시적 잘림) → static_cast
├── base ↔ derived 안전한 down-cast → dynamic_cast (또는 가상 함수 재설계)
├── const 제거 (원본이 mutable 보장) → const_cast (드물게)
├── 비트 재해석, 포인터↔정수 → reinterpret_cast (시스템 코드만)
└── 비트 재해석 + 타입 안전 → std::bit_cast (C++20)
```

## 실무 가이드 — 체크리스트

- [ ] C-style cast 대신 C++ 캐스트 사용?
- [ ] `dynamic_cast`가 핫 패스에 있는가? → 가상 함수로 재설계
- [ ] `const_cast`는 정말 마지막 수단인가?
- [ ] `reinterpret_cast`는 시스템 코드/검증된 패턴에만?
- [ ] 임시 객체 생성 의도가 아닌가? (`static_cast<Window>(*this)` 함정)
- [ ] 다중 상속 환경에서 down-cast는 dynamic_cast?

## 핵심 정리

1. **C++ 4가지 캐스트로 의도 명시** — C-style cast 피하기
2. 캐스팅은 **설계 문제의 신호** — 가상 함수, 인터페이스로 우회 가능?
3. **`dynamic_cast`는 비싸다** — 빈번하면 재설계
4. `const_cast`, `reinterpret_cast`는 **마지막 수단** — 대부분 UB 위험
5. 다중 상속의 down-cast는 항상 `dynamic_cast` (오프셋 조정)
6. C++20 **`std::bit_cast`** — 안전한 비트 재해석

## 관련 항목

- [항목 7: 다형성 base에 virtual 소멸자](/blog/programming/cpp/effective-cpp/item07-declare-destructors-virtual-in-polymorphic-base-classes) — RTTI 활성 조건
- [항목 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — 캐스트 없이 다형성
- [항목 35: 가상 함수의 대안](/blog/programming/cpp/effective-cpp/item35-consider-alternatives-to-virtual-functions) — 캐스트 회피 도구들
