---
title: "항목 10: 대입 연산자는 *this의 참조를 반환하라"
date: 2026-05-04T10:00:00
description: "체인 대입(x = y = z) 지원을 위한 표준 관용구 — 모든 compound assignment에 적용."
tags: [C++, Effective C++, Operator Overloading]
series: "Effective C++"
seriesOrder: 10
draft: true
---

## 왜 이 항목이 중요한가?

`x = y = z = 15` 같은 체인 대입은 단순해 보이지만, 동작하려면 `=`이 **lvalue를 반환**해야 한다. 표준 라이브러리와 거의 모든 사용자 코드는 사용자 정의 타입의 `operator=`도 같은 관용구를 따른다고 가정한다.

이 관용구를 어기면 컴파일은 통과하지만 사용자가 자연스럽게 기대하는 사용 패턴이 깨진다. STL 알고리즘, 표준 컨테이너, 다른 라이브러리와의 상호운용에서 미묘한 문제가 일어난다.

표준 관용구는 `return *this;`다. 이 항목은 그 관용구와 변형들을 정리한다.

## 개요

`x = y = z = 15` 같은 **체인 대입**을 자연스럽게 지원하려면 `=`이 lvalue를 반환해야 한다. C++ 표준 관용구는 `*this`를 참조로 반환한다. 강제는 아니지만 모든 표준 라이브러리와 사용자 코드가 이 관용구를 가정한다.

## 필수 개념: 체인 대입은 어떻게 작동하나

> **초보자를 위한 배경 지식**

<br>

C/C++에서 `=`은 **우결합(right-associative)** 연산자이며 값을 반환하는 **표현식**입니다.

```cpp
int x, y, z;
x = y = z = 15;
// 파싱 순서 (우결합):
//   x = (y = (z = 15))
// 평가 순서:
//   1) (z = 15)     → z의 lvalue 참조 반환
//   2) y = (z의 참조) → y의 lvalue 참조 반환
//   3) x = (y의 참조) → x의 lvalue 참조 반환
```

각 `=`의 결과가 **다음 `=`의 좌변**으로 쓰여야 하므로, 반환은 **lvalue 참조**여야 함.

## 표준 패턴

```cpp
class Widget {
public:
    Widget& operator=(const Widget& rhs) {     // ← 참조 반환
        // ... 복사 로직 ...
        return *this;                          // ← *this를 참조로 반환
    }
};
```

**핵심 두 가지**:
- 반환 타입 `Widget&` (참조)
- 본문 끝 `return *this;`

이 관용구가 **모든 형태의 대입 연산자**에 적용됩니다.

```cpp
class Widget {
public:
    Widget& operator= (const Widget& rhs);     // 복사 대입
    Widget& operator= (Widget&& rhs) noexcept; // 이동 대입
    Widget& operator+=(const Widget& rhs);     // 복합 대입
    Widget& operator-=(const Widget& rhs);
    Widget& operator*=(int factor);
    Widget& operator++();                       // 전위 ++ (대입 류)
    // 모두 *this 참조 반환
};
```

## 잘못된 반환 — 무엇이 깨지는가

### 1) `void` 반환

```cpp
class Bad {
public:
    void operator=(const Bad&) { /* ... */ }
};

Bad a, b, c;
a = b = c;     // ❌ 컴파일 에러
               //    (b = c)가 void → a에 void 대입 불가
```

### 2) 값 반환

```cpp
class Slow {
public:
    Slow operator=(const Slow& rhs) {     // 값 반환 (참조 X)
        // ... 복사 ...
        return *this;                      // 임시 객체 생성
    }
};

Slow a, b, c;
a = b = c;     // 컴파일은 통과 — 그러나
               // 1) (b = c) → 임시 Slow 객체
               // 2) a = (임시) → 다시 임시
               // → 불필요한 복사 비용
```

C++17 이후엔 RVO/copy elision으로 비용이 줄지만, 의미상으로도 어색 — `a = b`의 결과가 `b`가 아닌 임시.

### 3) 다른 타입 반환

```cpp
class Weird {
public:
    int operator=(const Weird&) { return 0; }
};

Weird a, b;
int x = a = b;     // 동작은 — 의도 명확하지 않음
```

표준 관용구를 벗어남. 라이브러리·제네릭 코드와의 호환성 잃음.

## 비-멤버 형식

```cpp
Widget& operator=(Widget& lhs, const Widget& rhs);  // ❌ — operator=는 멤버여야
```

`operator=`는 멤버로만 정의 가능 (`= delete` 포함). 다른 binary operator(`+`, `-` 등)는 비-멤버 가능하지만 대입류는 항상 멤버.

## 표준 라이브러리에서의 가정

표준 라이브러리는 사용자 타입이 이 관용구를 따른다고 가정합니다.

```cpp
template<typename T>
class Buffer {
    T data[N];
public:
    Buffer& operator=(const Buffer& other) {
        for (size_t i = 0; i < N; ++i)
            data[i] = other.data[i];   // T의 operator=가 자기 자신 참조 반환 가정
        return *this;
    }
};
```

`vector::operator=`, `std::sort`의 swap, 알고리즘 내부의 대입 — 모두 표준 관용구 가정. 따르지 않으면 코드는 동작해도 라이브러리 코드와 마찰 가능.

## C++11+ 자동 생성 함수

`= default`로 생성된 복사/이동 대입은 **표준 관용구를 따름** — 항상 `*this` 참조 반환.

```cpp
class Widget {
public:
    Widget& operator=(const Widget&) = default;    // 자동: 표준 관용구 준수
    Widget& operator=(Widget&&) noexcept = default;
};
```

사용자가 직접 작성할 때만 신경 쓰면 됨.

## 흔한 변형 — copy-and-swap

```cpp
class Widget {
public:
    Widget& operator=(Widget rhs) noexcept {     // 값으로 받음 (복사·이동)
        swap(rhs);
        return *this;                              // 여전히 *this 반환
    }

    void swap(Widget& other) noexcept;
};
```

copy-and-swap 패턴(항목 11)도 `*this` 참조 반환을 유지.

## 참조 반환의 위험 — dangling

생성자에서 반환하는 패턴과 혼동하지 말 것. `operator=`의 `return *this`는 **호출자가 존재하는 한 객체도 존재**하므로 dangling이 아님.

```cpp
Widget& foo() {
    Widget local;
    return local;     // ⚠️ dangling — local은 함수 끝나면 사라짐
}

Widget& Widget::operator=(const Widget& rhs) {
    return *this;     // ✅ — *this는 호출자가 들고 있는 객체
}
```

## 실무 가이드 — 체크리스트

`operator=` 작성 시:

- [ ] 반환 타입은 `T&` (참조)?
- [ ] 본문 마지막에 `return *this;`?
- [ ] `+=`, `-=` 등 compound assignment도 같은 관용구?
- [ ] 자기 대입 처리 (항목 11)?
- [ ] 예외 안전성 (강력한 보증 또는 최소한 자원 누수 없음)?

## 핵심 정리

1. **모든 대입 연산자**(`=`, `+=`, `-=` 등)는 `T&`를 반환 — `*this` 참조
2. 본문 끝에 `return *this;`
3. 강제는 아니지만 **표준 관용구** — 라이브러리/제네릭 코드 호환을 위해 따르라
4. `= default`로 자동 생성된 함수는 이 관용구를 자동 따름
5. `operator=`는 **멤버 함수만** 가능

## 관련 항목

- [항목 11: operator=에서 자기 대입 처리](/blog/programming/cpp/effective-cpp/item11-handle-assignment-to-self-in-operator-equals) — 대입의 또 다른 정석
- [항목 12: 객체의 모든 부분을 복사](/blog/programming/cpp/effective-cpp/item12-copy-all-parts-of-an-object) — 대입 본문의 책임
- [항목 23: 비-멤버·비-friend 함수 선호](/blog/programming/cpp/effective-cpp/item23-prefer-non-member-non-friend-functions-to-member-functions) — operator=가 예외인 이유
