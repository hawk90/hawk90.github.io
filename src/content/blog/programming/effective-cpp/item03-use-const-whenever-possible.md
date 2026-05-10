---
title: "항목 3: 가능한 모든 곳에 const를 사용하라"
date: 2025-02-01T12:00:00
description: "const 위치별 의미, 멤버 함수의 const, bitwise vs logical const."
tags: [C++, Effective C++, const]
series: "Effective C++"
seriesOrder: 3
draft: true
---

> **초안** — 정리 진행 중

## 개요

`const`는 **의미를 컴파일러에 박는 도구** — 사용자와 컴파일러 모두에게 "수정 안 됨"을 약속합니다. 변수, 매개변수, 반환값, 멤버 함수 — 가능한 모든 자리에.

## 포인터와 const

```cpp
char greeting[] = "Hello";

char* p1 = greeting;             // non-const pointer, non-const data
const char* p2 = greeting;       // non-const pointer, const data
char* const p3 = greeting;       // const pointer, non-const data
const char* const p4 = greeting; // const pointer, const data
```

**규칙**: `*` 왼쪽 = 가리키는 데이터의 const, `*` 오른쪽 = 포인터 자체의 const.

## 반복자와 const

```cpp
std::vector<int> v;

const std::vector<int>::iterator it = v.begin();   // T* const — 포인터가 const
*it = 10;        // OK
++it;            // 에러

std::vector<int>::const_iterator cit = v.begin();   // const T* — 데이터가 const
*cit = 10;       // 에러
++cit;           // OK
```

## 반환값에 const

```cpp
class Rational { /* ... */ };
const Rational operator*(const Rational& a, const Rational& b);

Rational a, b, c;
(a * b) = c;     // const 반환이면 컴파일 에러로 잡힘 — 의도치 않은 대입 방지
```

## const 멤버 함수

```cpp
class TextBlock {
    std::string text;
public:
    const char& operator[](std::size_t i) const { return text[i]; }
    char&       operator[](std::size_t i)       { return text[i]; }
};
```

const 객체에서는 const 버전, non-const 객체에서는 non-const 버전 호출 — 오버로드.

## bitwise const vs logical const

**bitwise const**(C++ 표준 정의): 객체의 비트가 변경되지 않음.
**logical const**(우리가 보통 원하는 것): 사용자 관점에서 객체 상태가 변경되지 않음.

```cpp
class CTextBlock {
    char* pText;
public:
    char& operator[](std::size_t pos) const {
        return pText[pos];   // bitwise const는 OK (pText 포인터는 안 바뀜)
                             // 하지만 호출자는 *pText를 수정할 수 있게 됨
                             // → logical const는 깨짐
    }
};
```

`mutable` 키워드로 일부 멤버를 const 멤버 함수에서도 수정 가능하게 만들 수 있음.

```cpp
class Cache {
    mutable bool cacheValid;
    mutable int cacheValue;
public:
    int getValue() const {
        if (!cacheValid) {
            cacheValue = compute();   // mutable이므로 가능
            cacheValid = true;
        }
        return cacheValue;
    }
};
```

## non-const 버전이 const 버전을 호출하는 패턴

코드 중복 제거:

```cpp
class TextBlock {
public:
    const char& operator[](std::size_t i) const { /* 본문 */ }
    char& operator[](std::size_t i) {
        return const_cast<char&>(
            static_cast<const TextBlock&>(*this)[i]
        );
    }
};
```

const 멤버에 본문을 두고, non-const는 캐스팅으로 위임. 반대 방향(const → non-const)은 안전하지 않으니 금지.

## 핵심 정리

1. 가능한 모든 자리에 `const` — 매개변수, 반환값, 멤버 함수
2. 포인터의 `const`는 위치에 따라 의미가 다름
3. 멤버 함수 `const`는 오버로드 가능 — const/non-const 객체에 다른 동작
4. 코드 중복은 const 멤버에 본문, non-const가 캐스팅으로 위임
