---
title: "항목 46: 타입 변환이 필요하면 비-멤버 함수를 템플릿 안에 정의하라"
date: 2025-02-07T15:00:00
description: "템플릿 매개변수 추론은 암묵 변환을 거치지 않는다 — 양쪽 변환이 필요하면 클래스 안 friend 함수."
tags: [C++, Effective C++, Template, friend]
series: "Effective C++"
seriesOrder: 46
---

## 왜 이 항목이 중요한가?

[항목 24](/blog/programming/cpp/effective-cpp/item24-declare-non-member-functions-when-type-conversions-should-apply)의 템플릿 버전이다. `Rational` 같은 수치 타입을 템플릿으로 만들면 한 가지 문제가 더해진다.

```cpp
template<typename T>
class Rational { /* ... */ };

template<typename T>
const Rational<T> operator*(const Rational<T>& a, const Rational<T>& b);

Rational<int> r;
r * 2;     // ❌ T 추론 실패 — int를 Rational<int>로 자동 변환 못 함
2 * r;     // ❌ 마찬가지
```

이유는 **템플릿 매개변수 추론이 암묵 변환을 거치지 않기 때문**이다. 비-템플릿 비-멤버 함수면 변환이 적용되지만, 템플릿이면 추론이 먼저 실패한다.

해결책은 **클래스 안에 `friend` 함수로 정의**하는 것이다. 인스턴스화 시 함께 생성되는 **비-템플릿 함수**라 통상 변환이 적용된다. 이 항목은 그 메커니즘과 활용을 정리한다.

## 개요

항목 24의 템플릿 버전이다. 비-템플릿 함수에선 양쪽 인자 변환이 필요하면 비-멤버 함수로 만들면 됐지만, **템플릿에선 매개변수 추론이 암묵 변환을 거치지 않는다**. 단순한 비-멤버 템플릿 함수로는 양쪽 변환이 불가하다. 해결책은 **클래스 안에 friend 함수**로 정의하는 것이다. 인스턴스화 시 함께 만들어지는 **비-템플릿 함수**라 통상 변환이 적용된다.

## 필수 개념: 템플릿 매개변수 추론은 변환 안 거침

> **초보자를 위한 배경 지식**

<br>

```cpp
void f(int x);

f(3.14);          // ✅ double → int 암묵 변환

template<typename T>
void g(T x);

g(3.14);          // T = double로 추론
g<int>(3.14);     // T = int 명시 — 변환 OK
```

매개변수 추론 단계에서 — 컴파일러는 **암묵 변환을 시도하지 않습니다**. 추론 후에야 호출 시점에 변환이 적용. 그래서:

```cpp
template<typename T>
void g(T x, T y);    // 양쪽 T 같아야

g(1, 2.0);           // ❌ T = int? double? — 추론 실패
                     //    (변환을 거쳐 일치시키지 않음)
```

이 규칙이 함정의 원인.

## 함정 — 양쪽 변환이 안 됨

```cpp
template<typename T>
class Rational {
public:
    Rational(const T& numerator = 0, const T& denominator = 1);    // 변환 가능
    T numerator() const;
    T denominator() const;
};

template<typename T>
const Rational<T> operator*(const Rational<T>& lhs, const Rational<T>& rhs) {
    return Rational<T>(
        lhs.numerator() * rhs.numerator(),
        lhs.denominator() * rhs.denominator()
    );
}

Rational<int> oneHalf(1, 2);
Rational<int> result = oneHalf * 2;       // ⚠️ 컴파일 에러!
```

**왜 에러?**:
1. `oneHalf * 2` 호출 — `operator*<int>(Rational<int>, Rational<int>)` 시도
2. 추론: lhs에서 T = int OK
3. 추론: rhs에서 T = int? — `2`는 `int`이지 `Rational<int>` 아님 — 추론 실패
4. 변환은 추론 후라 — `2 → Rational<int>(2)` 변환 시도 안 함
5. 다른 후보 없음 → 에러

`Rational<int> r2 = 2 * oneHalf;` 도 같은 에러.

비-템플릿 버전이라면 통상 변환이 적용되어 OK였을 텐데.

## 해결 — 클래스 안의 friend 함수

```cpp
template<typename T>
class Rational {
public:
    Rational(const T& numerator = 0, const T& denominator = 1);
    T numerator() const;
    T denominator() const;

    // ✅ 클래스 안의 friend — 비-템플릿 함수
    friend const Rational operator*(const Rational& lhs, const Rational& rhs) {
        return Rational(
            lhs.numerator() * rhs.numerator(),
            lhs.denominator() * rhs.denominator()
        );
    }
};

Rational<int> oneHalf(1, 2);
Rational<int> result = oneHalf * 2;       // ✅
Rational<int> result2 = 2 * oneHalf;      // ✅
```

**작동 원리**:
1. `Rational<int>`이 인스턴스화될 때 — `operator*(const Rational<int>&, const Rational<int>&)`도 함께 **비-템플릿 함수**로 생성
2. `oneHalf * 2` 호출 — 비-템플릿 함수 후보 발견
3. lhs는 `Rational<int>` 그대로, rhs는 `2 → Rational<int>(2)` **통상 변환**
4. 호출 성공

**핵심**: 클래스 안의 friend 함수는 — 클래스가 인스턴스화될 때 같이 **비-템플릿 함수로** 생성됨. 그래서 통상 변환이 적용.

## 두 가지 형태 비교

```cpp
// 형태 1 — 비-멤버 템플릿 (함정)
template<typename T>
const Rational<T> operator*(const Rational<T>& lhs, const Rational<T>& rhs);

// 형태 2 — 클래스 안 friend (해결)
template<typename T>
class Rational {
public:
    friend const Rational operator*(const Rational& lhs, const Rational& rhs) {
        // 본문 — 인스턴스화될 때 함께 정의
    }
};
```

| 측면 | 비-멤버 템플릿 | 클래스 안 friend |
| --- | --- | --- |
| 양쪽 변환 | ❌ 안 됨 | ✅ |
| 본문 위치 | 헤더 (또는 별도 정의) | 클래스 안 (헤더) |
| 함수의 종류 | 템플릿 | 비-템플릿 (인스턴스마다 1개) |
| 코드 부피 | 인스턴스마다 별도 (실제론 동일하므로 컴파일러가 통합 가능) | 인스턴스마다 별도 |

## 본문은 헤더에 (또는 작게)

friend 함수의 본문을 클래스 외부에 두려면:

```cpp
template<typename T>
class Rational {
    friend const Rational operator*<>(const Rational&, const Rational&);   // 선언만
};

template<typename T>
const Rational<T> operator*(const Rational<T>& lhs, const Rational<T>& rhs) {
    // 본문 — 별도 정의
}
```

그러나 — friend 선언이 비-템플릿 함수를 가리키므로, 외부 본문이 일치하는 비-템플릿 함수여야 함. 보통 복잡해서 — **본문을 클래스 안에 직접 두는 게 일반적**.

## helper 함수로 본문 단순화

```cpp
template<typename T>
class Rational {
public:
    friend const Rational operator*(const Rational& lhs, const Rational& rhs) {
        return doMultiply(lhs, rhs);     // 외부 비-멤버 템플릿에 위임
    }
};

template<typename T>
const Rational<T> doMultiply(const Rational<T>& lhs, const Rational<T>& rhs) {
    return Rational<T>(
        lhs.numerator() * rhs.numerator(),
        lhs.denominator() * rhs.denominator()
    );
}
```

friend는 **얇은 wrapper** — 통상 변환 통과 후 helper에 위임. 본문 로직은 외부 템플릿에 — 컴파일 단위에서 한 번만.

이 패턴이 가장 우아한 방식: friend의 변환 + 외부의 코드 공유.

## 흔한 함정 — friend 안에서 private 접근

```cpp
template<typename T>
class Rational {
    T n, d;
public:
    friend const Rational operator*(const Rational& lhs, const Rational& rhs) {
        return Rational(lhs.n * rhs.n, lhs.d * rhs.d);    // private 접근 OK
                                                            //  (friend니까)
    }
};
```

friend는 private 멤버 접근 가능 — public 접근자 없어도 OK. 그러나 캡슐화 측면에서 — 가능하면 public 접근자로 (항목 23).

## 표준 라이브러리의 예 — `std::complex`

```cpp
template<typename T>
class complex {
public:
    // 클래스 안에 일부 operator 정의
    friend complex operator+(const complex& lhs, const complex& rhs) {
        return complex(lhs.real() + rhs.real(),
                       lhs.imag() + rhs.imag());
    }
};

std::complex<double> c1(1.0, 2.0);
auto c2 = c1 + 3.0;       // 3.0 → complex<double>(3.0, 0) 변환 OK
auto c3 = 3.0 + c1;       // 마찬가지 — 양쪽 변환 OK
```

표준은 이 패턴을 사용해 자연스러운 산술을 제공.

## 비교 — 멤버 함수 vs 클래스 안 friend

```cpp
// 멤버 함수
template<typename T>
class Rational {
public:
    const Rational operator*(const Rational& rhs) const;    // lhs = *this
};
// r * 2 → r.operator*(Rational(2)) — rhs 변환 OK
// 2 * r → 2.operator*(r)? — int에 operator* 없음 ❌
```

```cpp
// 클래스 안 friend
template<typename T>
class Rational {
public:
    friend const Rational operator*(const Rational& lhs, const Rational& rhs);
};
// r * 2 → operator*(r, Rational(2)) — rhs 변환 OK
// 2 * r → operator*(Rational(2), r) — lhs 변환 OK ✅
```

멤버는 lhs 변환 안 됨, friend는 양쪽 가능.

## 흔한 함정 — `template<>` 자격

```cpp
template<typename T>
class Rational {
    friend const Rational operator*(const Rational&, const Rational&);    // 비-템플릿
    // 또는
    friend const Rational<T> operator*<T>(const Rational<T>&, const Rational<T>&);   // 템플릿 specialization
};
```

`<T>` 없으면 — 비-템플릿 함수 friend. 있으면 — 외부 템플릿 함수의 특정 instance를 friend로. 의도에 따라 선택. 양쪽 변환을 원하면 **비-템플릿 형태**(without `<T>`).

## 함정 — implicit instantiation 시점

```cpp
template<typename T>
class Rational {
public:
    friend const Rational operator*(const Rational&, const Rational&) {
        // 본문
    }
};

// Rational<int>가 인스턴스화되지 않으면 — operator*도 생성 안 됨
// 사용 시점에 첫 인스턴스화 발생
```

friend 함수는 그 클래스가 인스턴스화될 때만 함께 생성. 다른 시나리오에선 못 찾을 수 있음. 보통 문제 안 됨 — 인스턴스를 사용하면 자동.

## 모던 변형 — concepts와 결합

C++20:

```cpp
template<typename T>
class Rational {
public:
    template<std::convertible_to<T> U>
    friend const Rational operator*(const Rational& lhs, const U& rhs) {
        return /* ... */;
    }
};
```

concepts로 변환 가능한 타입 명시 — 잘못된 호출에서 더 좋은 에러 메시지.

## 실무 가이드 — 결정

```
템플릿 클래스에 이항 연산자 정의 — 양쪽 변환 필요?
├── 양쪽 변환 필요 → 클래스 안 friend 함수
│   ├── 본문 작으면 → 직접 정의
│   └── 본문 크면 → friend는 wrapper, 외부 템플릿 helper
├── 한쪽만 변환 (좌변은 항상 클래스 자기) → 멤버 함수
└── 양쪽 모두 변환 X → 비-멤버 템플릿 함수도 OK
```

## 실무 가이드 — 체크리스트

- [ ] 이항 연산자의 양쪽 변환이 필요한가?
- [ ] 클래스 안 friend로 정의?
- [ ] 본문이 작으면 in-class, 크면 helper로 위임?
- [ ] 본문이 헤더에 노출되는 영향 고려?
- [ ] private 접근이 정말 필요한가, public 인터페이스로 가능?
- [ ] 멤버 함수로 충분한 경우 — friend 남발 X

## 핵심 정리

1. **템플릿 매개변수 추론은 암묵 변환 안 거침** — 양쪽 변환 시 함정
2. **클래스 안 friend** 함수 — 인스턴스화 시 비-템플릿 함수로 생성, 통상 변환 OK
3. friend 함수가 **얇은 wrapper**이고 외부 helper에 위임이 우아
4. private 접근이 필요하면 friend, 아니면 public 인터페이스로
5. 표준 `std::complex` 등에서 이 패턴 사용

## 관련 항목

- [항목 24: 양쪽 변환 시 비-멤버](/blog/programming/cpp/effective-cpp/item24-declare-non-member-functions-when-type-conversions-should-apply) — 비-템플릿 버전
- [항목 45: 멤버 함수 템플릿](/blog/programming/cpp/effective-cpp/item45-use-member-function-templates-to-accept-all-compatible-types) — generalized ctor
- [항목 47: traits 클래스](/blog/programming/cpp/effective-cpp/item47-use-traits-classes-for-information-about-types) — 컴파일 타임 검증
