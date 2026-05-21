---
title: "항목 26: 보편 참조에 대한 오버로딩을 피하라"
date: 2026-05-04T02:00:00
description: "보편 참조 함수가 다른 오버로드를 압도 — copy/move 생성자도 가로챔."
tags: [C++, Universal Reference, Overloading, Modern C++]
series: "Effective Modern C++"
seriesOrder: 26
draft: true
---

## 왜 이 항목이 중요한가?

보편 참조는 너무 잘 매칭된다. **거의 모든 인자에 정밀 매칭**되어 다른 오버로드를 압도한다. 무엇보다 무서운 건 **copy/move 생성자도 가로챈다**는 점이다.

```cpp
class Person {
    template<typename T>
    explicit Person(T&& n);
    Person(const Person& rhs);   // 이게 안 불린다
};

Person p("Nancy");
auto cloneP = p;   // copy ctor? — NO! 보편 참조 ctor 호출 → 컴파일 에러
```

자연스러운 `auto cloneP = p;`마저 컴파일이 안 된다. derived 클래스의 copy/move도 base의 보편 참조 ctor로 떨어진다. 이 항목은 이 함정과 해결책 5가지를 정리한다.

## 개요

보편 참조 매개변수를 받는 함수는 **거의 모든 인자에 매칭**되는 강력한 후보다. 다른 오버로드와 함께 두면 의도한 함수가 호출되지 않는 일이 자주 일어난다. **copy/move 생성자도 가로챈다**. 매우 위험하다.

## 필수 개념: 보편 참조의 매칭 정밀도

> **초보자를 위한 배경 지식**

<br>

### 보편 참조는 "정확한 매칭"을 만듦

```cpp
template<typename T>
void f(T&& param);   // 보편 참조

f(x);    // T = int& 추론 → int& 정밀 매칭 (참조 그대로)
f(42);   // T = int   → int&& 정밀 매칭
```

**참조 + cv-qualifier까지 정확히 보존**한다. 다른 오버로드(변환 필요)보다 거의 항상 우위다.

## 함정 예제 1 — 함수 오버로드

```cpp
std::multiset<std::string> names;

void logAndAdd(const std::string& name) {     // (a)
    names.emplace(name);
}

template<typename T>
void logAndAdd(T&& name) {                    // (b) 보편 참조 오버로드
    names.emplace(std::forward<T>(name));
}

logAndAdd("Patty Dog");   // 어느 게 호출될까?
```

답은 **(b) 템플릿이 호출**된다.

이유는 이렇다. `"Patty Dog"`는 `const char[10]&`다. 보편 참조 (b)는 `T = const char[10]&`로 매칭된다. **정확**하다. (a)는 `const char*` → `std::string` 변환이 필요하다. **덜 정확**하다.

호출자는 (a)를 의도했을 수도 있는데 (b)가 호출된다. emplace는 string을 만드므로 결과는 같지만, **호출 흐름은 다르다**.

## 함정 예제 2 — 생성자 (가장 위험)

```cpp
class Person {
public:
    template<typename T>
    explicit Person(T&& n) : name(std::forward<T>(n)) {}   // (1) 보편 참조

    explicit Person(int idx);                              // (2) int
    Person(const Person& rhs);                             // (3) copy
    Person(Person&& rhs);                                  // (4) move

private:
    std::string name;
};

Person p("Nancy");

auto cloneP = p;       // copy 생성자 호출? — NO!
                       // (1)이 Person&로 인스턴스화 → 더 정밀 매칭
                       // → 생성자 (1) 호출 → name(p) → string(Person) 컴파일 에러!
```

`auto cloneP = p;` 같은 자연스러운 복사도 보편 참조 생성자에 가로채여 컴파일 에러다.

심지어 **derived 클래스의 copy/move도 base의 보편 참조 생성자**로 떨어진다.

```cpp
class SpecialPerson : public Person {
public:
    SpecialPerson(const SpecialPerson& rhs)
        : Person(rhs) {}   // ⚠️ Person의 보편 참조 생성자 호출!
                           // (rhs가 SpecialPerson& — Person&로 정확 매칭 안 됨)
};
```

## 왜 이렇게 되나

### 오버로드 해석 우선순위

C++ 오버로드 해석 규칙은 이렇다.

1. **정밀한 매칭** > 변환 필요한 매칭.
2. **비-템플릿** > 템플릿 (정확도 같으면).

그러나 보편 참조는 **항상 정밀**하다. 변환이 없다. (1)이 우선이 된다.

### copy/move도 가로챔

```cpp
Person p;
auto p2 = p;   // copy ctor 의도

// 후보:
//   (3) Person(const Person&)         — Person → const Person& 매칭
//   (1) Person(Person&)               — 보편 참조 인스턴스화, 더 정밀!
// → (1) 호출
```

`p`는 `Person`(non-const)다. `const&`보다 `&`가 정밀하다. 보편 참조가 `&`로 인스턴스화 가능하므로 우위다.

## 결론 — 보편 참조 함수와 다른 오버로드를 같이 두지 말 것

이게 핵심이다. 같이 두면 거의 항상 보편 참조가 이긴다.

## 해결책 1 — 함수 이름 분리

같은 의미를 다른 방식으로 처리하고 싶다면 **다른 이름의 함수**로 분리한다.

```cpp
void logAndAddByName(const std::string& name);
void logAndAddByIndex(int idx);

template<typename T>
void logAndAdd(T&& name);   // 단일 — 오버로드 X
```

생성자에선 이름을 못 바꾼다. [항목 27](/blog/programming/cpp/effective-modern-cpp/item27-familiarize-yourself-with-alternatives-to-overloading-on-universal-references)의 디스패치 기법으로 간다.

## 해결책 2 — 보편 참조 안 쓰고 단일 시그니처

```cpp
class Person {
public:
    explicit Person(const std::string& n) : name(n) {}
    // 보편 참조 X — copy/move도 자동 생성 그대로
};
```

C++98 스타일이다. 추가 복사 비용은 있지만 단순하다.

## 해결책 3 — Pass by Value ([항목 41](/blog/programming/cpp/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params-for-copyable-cheap-to-move-always-copied-params))

```cpp
class Person {
public:
    explicit Person(std::string n) : name(std::move(n)) {}
    // 보편 참조 X — by-value
};
```

C++11+ 스타일이다. lvalue 호출 시 추가 move가 한 번 일어난다.

## 해결책 4 — Tag Dispatch ([항목 27](/blog/programming/cpp/effective-modern-cpp/item27-familiarize-yourself-with-alternatives-to-overloading-on-universal-references))

추가 매개변수(tag)로 어떤 구현에 갈지 결정한다.

## 해결책 5 — `enable_if`로 보편 참조 제한 ([항목 27](/blog/programming/cpp/effective-modern-cpp/item27-familiarize-yourself-with-alternatives-to-overloading-on-universal-references))

특정 타입 조건을 만족할 때만 보편 참조가 후보가 된다.

```cpp
class Person {
public:
    template<typename T,
             typename = std::enable_if_t<
                 !std::is_base_of_v<Person, std::decay_t<T>> &&
                 !std::is_integral_v<std::remove_reference_t<T>>>>
    explicit Person(T&& n);   // Person이나 정수에는 매칭 안 됨

    explicit Person(int idx);
    // copy/move는 자동 — 보편 참조 후보에서 제외됨
};
```

복잡하지만 정밀하다. 자세한 건 [항목 27](/blog/programming/cpp/effective-modern-cpp/item27-familiarize-yourself-with-alternatives-to-overloading-on-universal-references)에서 다룬다.

## 함정 — 보편 참조 + completely-defaulted ctor

```cpp
class Widget {
public:
    template<typename T>
    Widget(T&& t);   // 보편 참조 ctor

    Widget()  = default;   // 기본 생성자
};

Widget w;   // 의도: 기본 ctor — 그러나 보편 참조도 인자 0개로 인스턴스화 가능?
            // → 0개 인자 함수 자동 매칭은 default가 우선 (정확)
```

기본 생성자가 정확 매칭이다. 그러나 1개 이상 인자엔 보편 참조가 우위다.

## 함정 — 보편 참조 + 상속

```cpp
class Base {
public:
    template<typename T>
    Base(T&& t);   // 보편 참조
};

class Derived : public Base {
public:
    Derived(const Derived& rhs)
        : Base(rhs) {}    // ⚠️ Base의 보편 참조 호출! (Derived&로 인스턴스화)
};
```

Base에 보편 참조 ctor를 두면 **derived의 자연스러운 copy도 깨진다**. 매우 위험하다.

## 핵심 정리

1. 보편 참조 함수는 **거의 모든 인자에 더 정밀 매칭**된다.
2. **copy/move 생성자도 가로챈다**. 매우 위험하다.
3. 오버로드를 피하거나 **함수 이름을 분리**한다.
4. 진짜 필요하면 [항목 27의 디스패치 기법](/blog/programming/cpp/effective-modern-cpp/item27-familiarize-yourself-with-alternatives-to-overloading-on-universal-references)을 쓴다.
5. 생성자에선 특히 위험하다. 단일 시그니처 또는 by-value를 권장한다.

## 관련 항목

- [항목 17: 특수 멤버 자동 생성](/blog/programming/cpp/effective-modern-cpp/item17-understand-special-member-function-generation) — 보편 참조 ctor와 자동 생성의 상호작용
- [항목 24: 보편 참조 식별](/blog/programming/cpp/effective-modern-cpp/item24-distinguish-universal-references-from-rvalue-references)
- [항목 27: 오버로딩 대안](/blog/programming/cpp/effective-modern-cpp/item27-familiarize-yourself-with-alternatives-to-overloading-on-universal-references)
- [항목 41: pass by value](/blog/programming/cpp/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params-for-copyable-cheap-to-move-always-copied-params)
