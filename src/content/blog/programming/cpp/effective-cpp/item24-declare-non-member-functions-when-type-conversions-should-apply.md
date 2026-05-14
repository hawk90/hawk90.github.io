---
title: "항목 24: 모든 매개변수에 타입 변환이 필요하면 비-멤버 함수로 선언하라"
date: 2025-02-02T00:00:00
description: "operator*의 양쪽 피연산자 변환 — 멤버 함수로는 lhs 변환 불가. 비-멤버로 대칭성 확보."
tags: [C++, Effective C++, Operator Overloading, Implicit Conversion]
series: "Effective C++"
seriesOrder: 24
draft: true
---

## 왜 이 항목이 중요한가?

`Rational` 같은 수치 타입을 만들면 사용자는 자연스럽게 정수와 섞어 쓰고 싶어한다. `r * 2`도 `2 * r`도 모두 동작하기를 기대한다. 그런데 `operator*`를 **멤버 함수**로 만들면 두 번째 형태가 컴파일되지 않는다.

이유는 단순하다. 멤버 함수의 좌변(`*this`)은 **암묵 변환 대상이 아니기 때문**이다. `2 * r`은 `2.operator*(r)`이 되어야 하는데 `int`엔 그런 멤버가 없고, 컴파일러가 `Rational(2)`로 변환을 시도하지도 않는다.

해결책은 **비-멤버 함수**로 만드는 것이다. 그러면 양쪽 피연산자가 모두 동등하게 변환 후보가 된다. 이 항목은 그 메커니즘과 표준 라이브러리의 패턴을 정리한다.

## 개요

이항 연산자(`+`, `-`, `*` 등)에서 **양쪽 피연산자 모두 암묵 변환이 적용되어야 한다면**, 멤버 함수로는 불가능하다. 멤버의 좌변(`*this`)은 변환 대상이 아니기 때문이다. 비-멤버 함수로 만들어야 양쪽이 모두 동등하게 변환 후보가 된다. 이 항목은 `Rational`처럼 정수와 자연스럽게 섞이는 타입에서 흔히 등장하는 함정이다.

## 함정 — 멤버 함수로 연산자 정의

```cpp
class Rational {
    int n, d;
public:
    Rational(int numerator = 0, int denominator = 1)     // 1개 인자 ctor → 암묵 변환 가능
        : n(numerator), d(denominator) {}

    const Rational operator*(const Rational& rhs) const {     // 멤버
        return Rational(n * rhs.n, d * rhs.d);
    }
};

Rational r(1, 2);
Rational result1 = r * 2;     // ✅ r.operator*(2)
                              //    2 → Rational(2) 암묵 변환 → 인자
Rational result2 = 2 * r;     // ❌ 컴파일 에러
                              //    2.operator*(r)? int에는 operator* 없음
```

**왜 `2 * r`이 에러?**

`a * b`를 컴파일러는 다음 순서로 해석:
1. `a.operator*(b)` — 멤버 함수 찾기
2. `operator*(a, b)` — 비-멤버 함수 찾기

`r * 2`의 경우 — `r.operator*(...)`이 존재, `2`를 `Rational`로 변환해서 호출. OK.

`2 * r`의 경우 — `2.operator*(r)`? `int`엔 멤버 함수 자체가 없음. 비-멤버 `operator*` 도 없음 → 에러.

**핵심**: 멤버 함수에서 좌변(`*this`)은 객체 자체 — 변환되지 않음.

## 해결 — 비-멤버 함수

```cpp
class Rational {
    int n, d;
public:
    Rational(int numerator = 0, int denominator = 1)
        : n(numerator), d(denominator) {}

    int numerator()   const { return n; }
    int denominator() const { return d; }
};

const Rational operator*(const Rational& lhs, const Rational& rhs) {
    return Rational(
        lhs.numerator() * rhs.numerator(),
        lhs.denominator() * rhs.denominator()
    );
}

Rational r(1, 2);
Rational result1 = r * 2;     // ✅ operator*(r, Rational(2))
Rational result2 = 2 * r;     // ✅ operator*(Rational(2), r)
Rational result3 = 2 * 3;     // ❌ Rational(2)와 Rational(3)? — 자동 변환은
                              //    "한 쪽이라도 Rational" 일 때만 트리거
                              //    여기선 int*int → int (의도된 동작)
```

비-멤버 함수에서는 **두 인자가 모두 동등한 위치** — 둘 다 변환 후보. 대칭적인 연산자에는 자연스러운 패턴.

## 같은 패턴이 적용되는 연산자

대칭적 binary 연산자는 모두 같은 함정:

```cpp
// ✅ 비-멤버
const Rational operator+(const Rational&, const Rational&);
const Rational operator-(const Rational&, const Rational&);
const Rational operator*(const Rational&, const Rational&);
const Rational operator/(const Rational&, const Rational&);

bool operator==(const Rational&, const Rational&);
bool operator!=(const Rational&, const Rational&);
bool operator< (const Rational&, const Rational&);

std::ostream& operator<<(std::ostream&, const Rational&);     // 비-멤버 강제
std::istream& operator>>(std::istream&, Rational&);
```

`<<`와 `>>`는 좌변이 `std::ostream` — 우리가 멤버를 정의할 수 없음. 비-멤버 강제.

## 멤버로 두어도 OK인 연산자

**좌변이 항상 클래스 타입 자기 자신**이면 멤버가 자연스러움:

```cpp
class Rational {
public:
    Rational& operator*=(const Rational& rhs);     // 좌변은 this
    Rational& operator+=(const Rational& rhs);
    Rational& operator=(const Rational& rhs);

    // 다음은 표준이 멤버로 강제
    Rational& operator=(const Rational&);
    Rational  operator[](size_t i);                 // (있다면)
    Rational& operator++();                          // 전위
};
```

**compound assignment**(`+=`, `*=` 등)는 좌변이 자신을 변경 — `2 += r`은 의미 없음. 멤버가 자연스러움.

## binary + compound 패턴

표준 관습은:

```cpp
class Rational {
public:
    Rational& operator+=(const Rational& rhs) {     // 멤버 — 자기 수정
        n = n * rhs.d + rhs.n * d;
        d = d * rhs.d;
        return *this;
    }
};

const Rational operator+(const Rational& lhs, const Rational& rhs) {
    Rational result(lhs);
    result += rhs;       // 멤버 호출
    return result;
}
```

`operator+=`를 멤버로 구현하고, `operator+`는 비-멤버로 += 재사용. 표준 라이브러리도 이 패턴.

## friend는 필요한가?

비-멤버 함수가 private 멤버에 접근해야 하면 friend.

```cpp
class Rational {
private:
    int n, d;
public:
    // ...
    friend const Rational operator*(const Rational&, const Rational&);
};

const Rational operator*(const Rational& lhs, const Rational& rhs) {
    return Rational(lhs.n * rhs.n, lhs.d * rhs.d);     // private 접근
}
```

**그러나** — public 접근자(`numerator()`, `denominator()`)로 충분하면 friend 불필요(항목 23). 캡슐화 측면에서 더 좋음.

```cpp
// friend 없이
const Rational operator*(const Rational& lhs, const Rational& rhs) {
    return Rational(
        lhs.numerator() * rhs.numerator(),
        lhs.denominator() * rhs.denominator()
    );
}
```

## C++20 spaceship — `<=>` 와의 관계

C++20부터 `operator<=>` 하나로 모든 비교 연산자 자동 생성:

```cpp
class Rational {
    int n, d;
public:
    auto operator<=>(const Rational&) const = default;     // 멤버 OK
    // 자동: <, <=, >, >=, ==, !=
};

Rational a, b;
a < b;      // 멤버 호출 OK
2 < a;      // ⚠️ 멤버라 lhs 변환 X — 함정
```

`<=>`도 멤버로 두면 같은 함정. 양쪽 변환 필요하면 **비-멤버 `<=>`**:

```cpp
auto operator<=>(const Rational& lhs, const Rational& rhs) {
    return /* ... */;
}
```

## explicit 생성자로 함정 회피

만약 `int → Rational` 변환을 의도하지 않았다면 — `explicit`으로 차단:

```cpp
class Rational {
public:
    explicit Rational(int n, int d = 1) : /* ... */ {}    // explicit
};

Rational r;
r * 2;        // ❌ 2 → Rational 암묵 변환 차단
r * Rational(2);   // ✅ 명시 변환
2 * r;        // ❌ 같음
```

암묵 변환을 허용할 것인가는 설계 결정 — 허용하면 비-멤버 + 둘 다 변환, 차단하면 멤버 OK + 사용자가 명시 변환.

## 흔한 함정 — 멤버와 비-멤버 둘 다 있는 경우

```cpp
class Rational {
public:
    const Rational operator*(const Rational& rhs) const;     // 멤버
};

const Rational operator*(const Rational& lhs, const Rational& rhs);    // 비-멤버

Rational a, b;
a * b;        // ⚠️ ambiguous? 둘 다 매칭 가능
```

같은 시그니처에 멤버와 비-멤버 — 컴파일러 혼란. 하나만 정의.

## 실무 가이드

| 연산자 | 멤버 / 비-멤버 |
| --- | --- |
| `=`, `[]`, `()`, `->` | 멤버 (표준 강제) |
| `+=`, `-=`, `*=` ... | 멤버 (좌변 자기 수정) |
| `++`, `--` | 멤버 (좌변 자기 수정) |
| `+`, `-`, `*`, `/` (양쪽 변환 가능) | **비-멤버** |
| `==`, `!=`, `<`, `<=>` (양쪽 변환 가능) | **비-멤버** |
| `<<`, `>>` (stream) | **비-멤버** (좌변 std::ostream/istream) |

## 실무 가이드 — 체크리스트

연산자를 정의할 때:

- [ ] 좌변이 항상 클래스 자기 자신인가? → 멤버 가능
- [ ] 양쪽 인자 모두 변환 가능해야 하는가? → 비-멤버 필수
- [ ] compound (`+=`)와 binary (`+`)를 모두 정의? → += 멤버, + 비-멤버 (재사용)
- [ ] private 접근이 정말 필요? → friend; 아니면 public 인터페이스로
- [ ] explicit 생성자로 암묵 변환 차단하는 게 의도와 일치?

## 핵심 정리

1. **양쪽 피연산자 모두 변환 가능해야** → 비-멤버 함수
2. 멤버 함수의 좌변(`*this`)은 **변환 대상이 아님**
3. compound assignment(`+=`)는 멤버, 대응 binary(`+`)는 비-멤버 — 표준 패턴
4. `<<`, `>>`는 좌변이 std 타입 — 비-멤버 강제
5. friend는 최소화 — public 인터페이스로 가능하면 그쪽

## 관련 항목

- [항목 23: 비-멤버 비-friend 선호](/blog/programming/cpp/effective-cpp/item23-prefer-non-member-non-friend-functions-to-member-functions) — 캡슐화 측면
- [항목 18: 인터페이스는 쓰기 쉽게](/blog/programming/cpp/effective-cpp/item18-make-interfaces-easy-to-use-correctly-and-hard-to-use-incorrectly) — explicit 변환과의 균형
- [항목 25: non-throwing swap](/blog/programming/cpp/effective-cpp/item25-consider-support-for-a-non-throwing-swap) — 비-멤버 + ADL의 또 다른 사례
