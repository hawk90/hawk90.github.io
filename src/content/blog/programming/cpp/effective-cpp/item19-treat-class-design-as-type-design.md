---
title: "항목 19: 클래스 설계는 타입 설계로 다루라"
date: 2025-02-04T11:00:00
description: "새 클래스 = 새 타입. 생성·소멸·복사·연산자·변환·상속까지 점검해야 할 12가지 질문."
tags: [C++, Effective C++, API Design]
series: "Effective C++"
seriesOrder: 19
---

## 왜 이 항목이 중요한가?

C++에서 새 클래스를 만든다는 것은 **새 타입을 정의**한다는 의미다. `int`나 `std::string`처럼 컴파일러와 표준 라이브러리가 동등하게 다루는 타입이다. 그러므로 설계 수준도 그에 걸맞아야 한다.

대부분의 클래스 설계 사고는 **점검을 빠뜨려서** 일어난다. 생성자만 적고 복사 의미론을 안 정하거나, 멤버 함수만 짜고 비-멤버 연산자를 잊거나, 단일 스레드 가정을 안 적어서 사용자가 멀티스레드로 호출하거나.

이 항목은 새 클래스를 만들 때 **반드시 점검해야 할 12가지 질문**을 정리한다. 체크리스트로 두고 클래스 설계 리뷰에 활용하면 한 부류의 사고를 통째로 막을 수 있다.

## 개요

C++에서 새 클래스를 정의하는 것은 **새 타입을 만드는 것**이다. 기존 내장 타입(`int`, `double`)이나 표준 라이브러리 타입(`std::string`)과 같은 수준의 설계가 요구된다. 생성, 소멸, 복사·이동, 연산자, 변환, 상속, 예외 보장까지 — 한 측면이라도 미진하면 사용자가 발견하는 함정이 된다. 이 항목은 **새 클래스를 만들 때 점검해야 할 12가지 질문**을 정리한다.

## 12가지 설계 점검 질문

### 1. 객체는 어떻게 생성·소멸되나?

- 어떤 생성자를 제공할 것인가? (기본, 복사, 이동, 변환, 기타)
- 사용자 정의 vs `= default`?
- 메모리 할당 방식은? — heap, stack, custom allocator
- 소멸자는 virtual이어야 하는가? (다형성 base인지)

```cpp
class C {
public:
    C() = default;                        // 기본
    C(int);                                // 변환 (explicit?)
    C(const C&);                           // 복사
    C(C&&) noexcept;                       // 이동
    virtual ~C();                          // 다형성이면 virtual
};
```

### 2. 객체 초기화와 대입의 차이는?

생성자(초기화)와 `operator=`(대입)는 **다른 함수**. 둘이 같은 동작이라고 가정하면 함정.

- 초기화: 객체가 아직 없음 → 만든다
- 대입: 객체가 있음 → 기존 자원 정리 + 새 값으로

```cpp
C a;            // 기본 생성자
C b = a;        // 복사 생성자 — 초기화
b = a;          // 복사 대입 — 다른 동작
```

### 3. 값으로 전달될 때 무엇이 일어나나?

복사 생성자가 정의 — **얕은 복사인가 깊은 복사인가**.

```cpp
void f(C value);     // ← 복사 생성자 호출
f(c);
```

자원을 직접 관리하는 클래스는 보통 깊은 복사 또는 복사 금지. 멤버가 모두 RAII면 rule of zero.

### 4. 합법적 값 범위는?

`Date`의 `month`는 1~12, `Speedometer::speed`는 음수 X 등 **불변식**(invariant) 존재.

- 생성자에서 검증
- mutator에서 검증
- 잘못된 값 입력 시 — 예외? 클램프? assertion?

```cpp
class Month {
    int val;
public:
    explicit Month(int m) {
        if (m < 1 || m > 12) throw std::invalid_argument("Month");
        val = m;
    }
};
```

### 5. 기존 타입 계층에 들어맞나?

- base가 있다면 — public/protected/private 상속 중 어느 의미?
- derived가 가능하면 — virtual 함수 설계
- final 클래스인가?

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

class Circle final : public Shape {     // final — 더 이상 상속 X
    double r;
public:
    double area() const override { return M_PI * r * r; }
};
```

### 6. 어떤 변환을 허용하나?

- 암묵 변환을 허용할 것인가, `explicit`로 차단할 것인가?
- 변환 연산자(`operator T()`)는 정의할 것인가?

```cpp
class Rational {
public:
    Rational(int num, int den = 1);    // ⚠️ 암묵 변환 가능 (int → Rational)

    explicit operator double() const;   // double로 명시 변환만
};

Rational r = 5;       // OK (의도?)
double d = r;         // ❌ explicit이라 차단
double d2 = (double)r; // ✅
```

`explicit`을 안 붙이면 `5 → Rational(5)`이 자동 — 의도된 동작인지 점검.

### 7. 어떤 연산자와 함수가 의미 있나?

- `==`, `!=`, `<`, `<=`, `>`, `>=`, `<=>`(C++20)
- 산술: `+`, `-`, `*`, `/`, 그리고 compound `+=` 등
- 입출력: `<<`, `>>`
- 첨자: `[]`
- 함수 호출: `()`

도메인에 의미 없는 연산자는 정의하지 말 것. `Date + Date`는 의미 없음(`Date - Date`는 duration이라 의미 있음).

### 8. 컴파일러 자동 생성 함수를 거절해야 하나?

- 복사 금지인가? → `= delete`
- 이동 금지인가? → `= delete`
- 일부 생성자만 노출? → private + factory function

```cpp
class Singleton {
public:
    static Singleton& instance();
private:
    Singleton() = default;
    Singleton(const Singleton&) = delete;
    Singleton& operator=(const Singleton&) = delete;
};
```

### 9. 누가 접근할 권한을 가지나?

- public / protected / private 멤버 분류
- friend 함수/클래스 — **최소화**가 캡슐화에 유리

```cpp
class Widget {
public:
    void publicMethod();        // 인터페이스
protected:
    void hookForDerived();      // 상속자만
private:
    int internal_state_;        // 외부 차단
    friend class Tester;        // 의도적 — 테스트
};
```

### 10. 암묵 인터페이스(보장)는 무엇인가?

- **불변식**(class invariant): "객체가 항상 만족하는 조건"
- **예외 보장**: basic / strong / nothrow (항목 29)
- **스레드 안전성**: 어느 메서드가 동시에 안전한가?
- 성능 보장: O(1) / O(log n) / O(n)?

이런 사항은 헤더 주석이나 별도 문서에 명시. 사용자에게는 **인터페이스의 일부**.

### 11. 타입이 얼마나 일반화되어야 하나?

- 한 클래스로 충분한가?
- 템플릿으로 만들어야 하는가?

```cpp
class IntStack { /* int 전용 */ };           // 일반화 X

template<typename T>
class Stack { /* 모든 타입 */ };              // 일반화

template<typename T, typename Allocator = std::allocator<T>>
class Stack { /* 더 일반 */ };
```

일반화는 가치만큼 비용 — 컴파일 시간, 디버깅, 에러 메시지. 균형.

### 12. 정말 새 타입이 필요한가?

- 기존 클래스에 비-멤버 함수 추가로 충분?
- typedef/using으로 alias만으로 충분?
- 별도 클래스 만들 만큼 도메인 개념이 명확?

```cpp
// 별도 클래스? — 과도할 수 있음
class UserID {
    int id;
};

// using으로 충분할 수도
using UserID = int;     // 단점: 컴파일러 타입 검사 약함

// strong typedef — 함수 단위로 구분
struct UserID { int value; };   // 보일러플레이트 약간
```

도메인에 명확한 개념이 있고 검증이나 동작이 따라온다면 — 클래스. 단순 alias라면 typedef/using.

## 점검의 흐름

이 12 질문은 **순서대로** 답하지 않습니다 — 한 답이 다른 답에 영향을 줍니다. 보통 흐름:

```
1. 도메인 개념 정의 (12)
2. 라이프사이클 결정 (1, 8, 11)
3. 인터페이스 (6, 7, 9, 10)
4. 상속 관계 (5)
5. 자원 관리 (2, 3, 4)
```

반복적으로 다듬어 가는 과정 — 한 번에 완성되지 않음.

## 도구 — IDE / 정적 분석

clang-tidy, cppcheck 같은 도구가 일부를 잡아냄:

```
warning: class has implicit but no explicit copy assignment operator
note: consider explicitly declaring or deleting it
```

자동화로 모두 잡진 못해도 체크리스트로 활용.

## 실무 가이드 — 사용자 페르소나

API를 받을 사용자 관점에서:

- [ ] 1분 안에 객체를 만들고 쓸 수 있는가?
- [ ] 흔한 오용을 컴파일러가 잡는가?
- [ ] 표준 라이브러리와 일관된가?
- [ ] 문서 없이도 의도를 추측 가능한가?

## 핵심 정리

1. 새 클래스 = **새 타입의 정의** — 기존 타입과 같은 깊이로 설계
2. **12가지 질문** 점검 — 생성, 복사, 변환, 상속, 연산자, 권한, 불변식
3. **암묵 인터페이스**(예외 보장, 스레드 안전성)도 인터페이스의 일부
4. **점진적 다듬기** — 한 번에 완성되지 않음
5. 정말 새 타입이 필요한지 자문 — using/비-멤버 함수로 충분할 수도

## 관련 항목

- [항목 18: 인터페이스는 쓰기 쉽게](/blog/programming/cpp/effective-cpp/item18-make-interfaces-easy-to-use-correctly-and-hard-to-use-incorrectly) — 사용자 측면 안전성
- [항목 22: 데이터 멤버는 private](/blog/programming/cpp/effective-cpp/item22-declare-data-members-private) — 캡슐화의 시작
- [항목 32: public 상속은 is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — 상속 관계의 의미
