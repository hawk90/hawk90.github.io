---
title: "항목 41: 복사 가능하고 이동 비용이 저렴하며 항상 복사되는 매개변수는 값 전달을 고려하라"
date: 2026-05-04T17:00:00
description: "pass by value + std::move 패턴이 lvalue/rvalue 오버로드보다 나은 시점."
tags: [C++, Performance, Move Semantics, Modern C++]
series: "Effective Modern C++"
seriesOrder: 41
draft: true
---

## 왜 이 항목이 중요한가?

setter나 매개변수를 멤버에 저장하는 함수에서, 전통적 접근은 **lvalue/rvalue 두 오버로드**를 만드는 것이었다. 보편 참조도 한 가지 옵션이다. 그런데 매개변수가 많아지면 오버로드 수가 2^N으로 폭발하고, 보편 참조는 헤더에 노출되며 함정이 많다.

세 번째 옵션이 있다. **값 전달 + `std::move`**다. 함수 한 개로 단순하면서 거의 동등한 성능을 낸다. lvalue 호출 시 추가 move 한 번이 더 들지만, `std::string`이나 `std::vector` 같은 move-cheap 타입에선 무시할 만하다.

단, 세 조건이 필요하다.

- 복사 가능한 타입이어야 한다.
- 이동 비용이 저렴해야 한다.
- 함수가 **항상** 매개변수를 복사/저장해야 한다 (조건부 저장이면 손해).

이 항목은 세 패턴(오버로드, 보편 참조, by-value)을 비교하고 by-value가 적합한 자리를 정리한다.

## 개요

setter나 멤버에 저장하는 함수에서, 전통적인 접근은 **lvalue/rvalue 오버로드 두 개**를 만드는 것이다. 보편 참조도 한 가지 옵션이다. 그러나 세 번째 옵션 — **값 전달 + `std::move`** — 이 단순하면서 거의 동등한 성능을 제공한다.

단, 조건이 있다. 복사 가능 + 이동 저렴 + 항상 복사되는 매개변수다.

## 필수 개념: 값 전달의 비용

> **초보자를 위한 배경 지식**

<br>

### 함수 매개변수 전달 방식

| 방식 | 문법 | 비용 |
| --- | --- | --- |
| `const T&` | reference | 0 (참조만 전달) |
| `T&&` | rvalue ref | 0 (rvalue 결합) |
| `T` | by value | 복사 또는 이동 한 번 |
| `T&` | non-const lvalue ref | 0 (수정용) |

### by-value의 통념과 현실

**오해**: by-value는 무조건 복사라 비효율이다.

**현실**: 인자가 rvalue면 by-value도 **이동**된다. 복사가 아니다.

```cpp
void f(std::string s);

f("hello");           // 임시 string → s로 이동 (move 1번)
std::string str;
f(str);               // str → s로 복사 (copy 1번)
f(std::move(str));    // str → s로 이동 (move 1번)
```

by-value는 **카테고리에 따라 적합한 연산을 한다**.

### setter 패턴

자주 등장하는 패턴이다.

```cpp
class Widget {
    std::vector<std::string> names;
public:
    void addName(/* ??? */ name) {
        names.push_back(/* name */);
    }
};
```

매개변수는 **항상 멤버에 저장**된다. 어떻게 전달할지가 문제다.

## 세 가지 후보 패턴

### A. lvalue/rvalue 오버로드

```cpp
class Widget {
    std::vector<std::string> names;
public:
    void addName(const std::string& n) {        // lvalue
        names.push_back(n);                      // copy
    }
    void addName(std::string&& n) {              // rvalue
        names.push_back(std::move(n));           // move
    }
};
```

**장점**

- 최적의 성능이다. 각 카테고리에 맞는 연산을 한다.
- 복사 1번 (lvalue) / 이동 1번 (rvalue).

**단점**

- **함수 두 개**가 필요하다. 본문이 중복된다.
- 유지보수 비용이 있다 (매개변수 추가 시 둘 다 수정).
- 인자 N개면 2^N개 오버로드가 필요하다 (조합 폭발).

### B. 보편 참조 (universal reference)

```cpp
class Widget {
    std::vector<std::string> names;
public:
    template<typename T>
    void addName(T&& n) {
        names.push_back(std::forward<T>(n));
    }
};
```

**장점**

- 함수 하나다.
- 효율적이다 (lvalue → copy, rvalue → move).
- N 인자도 가변 인자 템플릿으로 처리된다.

**단점**

- 템플릿이라 **헤더에 노출**된다 (구현 분리 X).
- 컴파일 시간이 증가한다.
- 오버로드 함정이 있다 ([항목 26](/blog/programming/cpp/effective-modern-cpp/item26-avoid-overloading-on-universal-references), [27](/blog/programming/cpp/effective-modern-cpp/item27-familiarize-yourself-with-alternatives-to-overloading-on-universal-references)).
- 호출자에게 의도가 불명하다 (template params이 보인다).

### C. 값 전달 + `std::move`

```cpp
class Widget {
    std::vector<std::string> names;
public:
    void addName(std::string n) {                // by-value
        names.push_back(std::move(n));           // move from local
    }
};
```

**장점**

- 함수 하나다.
- 헤더에 정의를 안 해도 된다 (.cpp로 분리 가능).
- 단순하다. 의도가 명확하다.
- 컴파일 시간이 정상이다.

**단점**

- lvalue 호출 시 추가 move 한 번이 든다 (`copy + move`).

## 비용 비교 — `addName` 호출

| 호출 형태 | A. 오버로드 | B. 보편 참조 | C. by-value |
| --- | --- | --- | --- |
| `addName("hi")` (rvalue) | move 1회 | move 1회 | move 1회 |
| `addName(s)` (lvalue) | copy 1회 | copy 1회 | **copy 1회 + move 1회** |

C는 lvalue 호출에서 추가 이동 한 번이 든다. **`string`, `vector` 같은 move-cheap 타입에선 미미**하다. 포인터 swap 수준이다.

### 실제 의미

`std::string` 이동 비용 ≈ 3-4 포인터 복사 ≈ ~10ns다. 데이터 복사 (긴 문자열)는 ~100ns 이상이다.

"추가 move 한 번"은 보통 무시 가능한 비용이다.

## 사용 권장 조건

C(by-value)가 가장 단순하고 충분히 효율적인 경우는 다음 모두를 만족할 때다.

### 조건 1: 복사 가능한 타입

`unique_ptr` 같은 move-only 타입은 by-value도 사실상 강제 move다. A/B와 의미는 동일하지만 의도가 모호해진다.

```cpp
void take(std::unique_ptr<T> p);   // 반드시 move로 호출 — 이건 by-value 정상
```

### 조건 2: 이동 비용이 저렴

| 타입 | move 비용 | by-value 추천? |
| --- | --- | --- |
| `std::string`, `std::vector`, `std::unique_ptr` | 매우 저렴 | ✅ |
| `std::array<T, N>` | element 개별 move | ❌ (대형이면) |
| 사용자 정의 — POD 멀티멤버 | 멤버별 복사 | ❌ |
| 트리비얼 타입 (int, double) | move = copy | ✅ (단 ref가 더 빠를 수도) |

### 조건 3: 함수가 **항상** 매개변수를 복사/저장

조건부 저장이면 C는 손해다. 무조건 한 번 복사가 일어나기 때문이다.

```cpp
// ❌ C 손해 — 짧은 이름은 저장 안 함
void addName(std::string n) {
    if (n.length() >= MIN_LEN) {
        names.push_back(std::move(n));
    }
    // n이 짧으면 by-value 비용은 낭비
}

// ✅ A/B 이득 — lvalue ref면 ref만 받고 검사
void addName(const std::string& n) {
    if (n.length() >= MIN_LEN) names.push_back(n);
}
```

조건부 패턴엔 ref 패턴이 더 효율적이다.

## 함정 — 슬라이싱 (slicing)

```cpp
class Base {
public:
    virtual void f() { /* base */ }
};

class Derived : public Base {
    int extra;
public:
    void f() override { /* derived */ }
};

void process(Base b);   // ⚠️ by-value!

Derived d;
process(d);             // 슬라이싱! Base 부분만 복사 — Derived 정보 손실
```

**다형성 타입은 절대 by-value 금지**다. ref/pointer만 사용한다.

## 함정 — 매개변수 변경 가능

by-value 매개변수는 함수 안에서 **수정 가능**하다 (지역 변수처럼). const를 안 붙이면 된다.

```cpp
void normalize(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), ::tolower);
    process(std::move(s));
}
```

이 또한 by-value의 자연스러운 장점이다.

## 함정 — 할당 vs 생성 비용

```cpp
class Password {
    std::string text;
public:
    void changeTo(std::string newPwd) {
        text = std::move(newPwd);    // 할당 — 기존 text 메모리 재사용 가능
    }
};
```

vs

```cpp
class Password {
    std::string text;
public:
    void changeTo(const std::string& newPwd) {
        text = newPwd;               // 할당 — 동일하게 재사용
    }
};
```

`std::string` 할당은 buffer 재사용이 가능하다 (capacity 충분 시). by-value 패턴은 **매개변수 생성** 시 새 buffer가 할당되어 기존 재사용 기회를 잃는다.

**할당 위주** setter는 ref 패턴이 더 효율적일 수 있다.

## 함정 — 이동이 저렴하지 않은 타입

```cpp
struct Big {
    std::array<int, 1000> data;   // move도 element-wise 복사
};

void take(Big b);   // ⚠️ "추가 move 한 번"이 큰 비용
```

이동 비용 검사가 필수다.

## 함정 — 가상 함수 매개변수

가상 함수는 시그니처 일치가 필요하다. by-value/ref 변경은 다른 함수가 된다.

```cpp
class Base {
public:
    virtual void f(const std::string& s) = 0;
};

class Derived : public Base {
public:
    void f(std::string s) override;   // ❌ override 안 됨 (시그니처 다름)
};
```

가상 함수 인터페이스 변경 시 신중해야 한다.

## 비교 요약 — 한눈에

| 패턴 | 함수 수 | 코드 복잡도 | 헤더 노출 | 성능 (lvalue) | 성능 (rvalue) | 권장 |
| --- | --- | --- | --- | --- | --- | --- |
| A. lvalue/rvalue 오버로드 | 2 | ⚠️ 중복 | 가능 | copy 1 | move 1 | 핵심 hot path |
| B. 보편 참조 | 1 (template) | ⚠️ 함정 | ✅ 강제 | copy 1 | move 1 | 라이브러리 일반 |
| C. by-value + move | 1 | ✅ 단순 | 분리 가능 | copy 1 + move 1 | move 1 | 일반 setter |

## 진짜 사용 예

### 생성자 멤버 초기화

```cpp
class Widget {
    std::string name;
    std::vector<int> data;
public:
    Widget(std::string n, std::vector<int> d)
        : name(std::move(n)), data(std::move(d)) {}
};

Widget w1("hello", {1, 2, 3});           // 둘 다 move
std::string s; std::vector<int> v;
Widget w2(s, v);                          // 둘 다 copy + move
Widget w3(std::move(s), std::move(v));    // 둘 다 move
```

생성자에서 매우 깔끔하다.

### 다중 매개변수

오버로드 패턴이라면 2^N이다. by-value면 1개로 끝난다.

```cpp
// A: 2*2 = 4개
void f(const A&, const B&);
void f(const A&, B&&);
void f(A&&, const B&);
void f(A&&, B&&);

// C: 1개
void f(A a, B b);
```

매개변수가 많을수록 by-value가 우위다.

## 핵심 정리

1. setter 패턴은 by-value + `std::move` 한 함수로 단순화가 가능하다.
2. **세 조건 모두** 만족 시 권장한다.
   - 복사 가능한 타입.
   - 이동 비용 저렴.
   - 항상 복사/저장.
3. lvalue 호출 시 추가 move 한 번이 든다. 보통 미미하다 (string·vector 등).
4. **다형성 타입은 절대 by-value 금지**다 (슬라이싱).
5. 할당 위주 setter는 ref 패턴이 buffer 재사용에 유리할 수 있다.
6. 다중 매개변수일수록 by-value 단순성의 이득이 크다.

## 관련 항목

- [항목 23: std::move와 std::forward](/blog/programming/cpp/effective-modern-cpp/item23-understand-std-move-and-std-forward)
- [항목 25: rvalue ref와 universal ref](/blog/programming/cpp/effective-modern-cpp/item25-use-move-on-rvalue-refs-and-forward-on-universal-refs)
- [항목 29: 이동 비용 가정](/blog/programming/cpp/effective-modern-cpp/item29-assume-move-operations-are-not-present-not-cheap-and-not-used)
- [항목 42: emplacement](/blog/programming/cpp/effective-modern-cpp/item42-consider-emplacement-instead-of-insertion)
