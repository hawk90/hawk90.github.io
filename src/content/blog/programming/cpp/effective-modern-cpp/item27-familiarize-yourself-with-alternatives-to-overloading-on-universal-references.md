---
title: "항목 27: 보편 참조 오버로딩 대안에 익숙해져라"
date: 2026-05-04T03:00:00
description: "tag dispatch, enable_if, pass by value, concepts — 보편 참조 함정 회피 5가지 기법."
tags: [C++, Universal Reference, SFINAE, Tag Dispatch, Modern C++]
series: "Effective Modern C++"
seriesOrder: 27
draft: true
---

## 왜 이 항목이 중요한가?

[항목 26](/blog/programming/cpp/effective-modern-cpp/item26-avoid-overloading-on-universal-references)에서 본 함정이 있다. 보편 참조와 다른 오버로드를 함께 두면 거의 항상 보편 참조가 이긴다. copy/move 생성자까지 가로챈다.

그렇다고 보편 참조를 포기하면 perfect forwarding의 효율도 잃는다. 이 항목은 함정을 피하면서도 보편 참조의 이득을 누리는 **다섯 가지 대안**을 정리한다. 각 대안의 트레이드오프와 의사결정 기준까지 함께 본다.

## 개요

[항목 26](/blog/programming/cpp/effective-modern-cpp/item26-avoid-overloading-on-universal-references)에서 본 함정 — 보편 참조와 다른 오버로드를 함께 두는 것 — 을 피하면서도 보편 참조의 효율을 누리는 **다섯 가지 대안**을 다룬다.

## 대안 1 — 오버로드 자체를 포기

가장 단순한 방법이다. 함수 이름을 분리하거나 하나의 시그니처만 사용한다.

```cpp
template<typename T>
void logAndAddName(T&& name);   // 보편 참조 — 다른 오버로드 없음
```

생성자에선 이름을 못 바꾼다. 다른 대안이 필요하다.

## 대안 2 — `const T&`만 사용

C++98 스타일이다. 추가 복사 비용은 있지만 단순하다.

```cpp
class Person {
public:
    explicit Person(const std::string& n);   // 단일
    explicit Person(int idx);
};
```

장점은 이렇다.

- 보편 참조 함정이 없다.
- copy/move가 자동 생성된다.

단점은 이렇다.

- rvalue 호출 시 추가 copy 비용이 든다 (1회).

## 대안 3 — Pass by Value

C++11+에서 의외로 효율적이다. `std::move`로 멤버에 옮긴다.

```cpp
class Person {
    std::string name;
public:
    explicit Person(std::string n)    // by-value
        : name(std::move(n)) {}
};

Person p1("hello");                // rvalue → move
std::string s = "world";
Person p2(s);                      // lvalue → copy + move
```

자세한 분석은 [항목 41](/blog/programming/cpp/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params)에서 다룬다.

장점은 이렇다.

- 단순하다.
- copy/move 비용이 적정하다.
- 보편 참조 함정이 없다.

## 대안 4 — Tag Dispatch

추가 매개변수(tag)로 어떤 구현에 갈지 결정한다.

```cpp
std::multiset<std::string> names;

template<typename T>
void logAndAddImpl(T&& name, std::false_type) {  // 정수 아닌 경우
    names.emplace(std::forward<T>(name));
}

void logAndAddImpl(int idx, std::true_type) {    // 정수인 경우
    names.emplace(nameFromIdx(idx));
}

template<typename T>
void logAndAdd(T&& name) {
    logAndAddImpl(std::forward<T>(name),
                  std::is_integral<std::remove_reference_t<T>>{});
}
```

호출은 이렇게 된다.

```cpp
logAndAdd("hello");   // T=const char*, false_type → impl(const char*&&, false_type)
logAndAdd(42);        // T=int, true_type → impl(int, true_type)
```

장점은 이렇다.

- 명확하다.
- SFINAE보다 단순하다.

단점은 이렇다.

- impl 함수 분기가 필요하다.
- 생성자에 적용이 어렵다 (생성자 위임 등 트릭).

## 대안 5 — `enable_if`로 보편 참조 제한 (SFINAE)

특정 타입 조건을 만족할 때만 보편 참조가 후보가 된다.

```cpp
class Person {
public:
    template<
        typename T,
        typename = std::enable_if_t<
            !std::is_base_of_v<Person, std::decay_t<T>> &&
            !std::is_integral_v<std::remove_reference_t<T>>
        >
    >
    explicit Person(T&& n);

    explicit Person(int idx);
    // copy/move는 자동 생성 (보편 참조 후보에서 제외됨)
};
```

`enable_if_t<조건>`이 false면 SFINAE로 후보에서 제외된다. Person 또는 정수에는 매칭이 안 되고, 그 외에만 매칭된다.

### `std::decay_t` 왜?

`T`가 `const Person&`이라면 `is_base_of<Person, const Person&>`는 false다 (참조 때문). 잘못된 검사다. `decay_t`로 참조·cv를 제거한다.

```cpp
std::is_base_of_v<Person, Person>             // true
std::is_base_of_v<Person, const Person&>      // false! — 함정
std::is_base_of_v<Person, std::decay_t<const Person&>>   // true ✅
```

### 더 정교 — derived도 제외

```cpp
typename = std::enable_if_t<
    !std::is_base_of_v<Person, std::decay_t<T>> &&
    !std::is_integral_v<std::remove_reference_t<T>>
>
```

`is_base_of`는 derived도 포함한다. Person·SpecialPerson 모두 제외된다.

장점은 이렇다.

- 매우 정밀하다.
- 표준이다 (`<type_traits>`).
- 모든 호환 타입에 보편 참조가 적용된다.

단점은 이렇다.

- 가독성이 떨어진다 (이중 부정, 매크로처럼 보인다).
- 에러 메시지가 난해하다.
- C++20 concepts가 더 깔끔하다.

## C++20 — `requires` (concepts)

`enable_if`보다 가독성·에러 메시지가 우수하다.

```cpp
template<typename T>
    requires (!std::derived_from<std::decay_t<T>, Person>) &&
             (!std::integral<std::remove_reference_t<T>>)
explicit Person(T&& n);
```

또는 named concept를 쓴다.

```cpp
template<typename T>
concept NotPersonOrInt =
    !std::derived_from<std::decay_t<T>, Person> &&
    !std::integral<std::remove_reference_t<T>>;

template<NotPersonOrInt T>
explicit Person(T&& n);
```

훨씬 읽기 쉽다.

## 트레이드오프 — 한눈에

| 기법 | 장점 | 단점 |
| --- | --- | --- |
| 1. 오버로드 포기 | 단순 | 유연성 손실 |
| 2. `const T&` | 단순 | rvalue 효율 손실 |
| 3. pass by value | 깔끔, move 활용 | 복사 가능 타입에만 |
| 4. tag dispatch | 명확 | 코드 분기 필요 |
| 5. `enable_if` | 정밀 제어 | 가독성 ❌ |
| 5'. C++20 concepts | 가독성 ↑ | C++20 필요 |

## 의사결정 가이드

<img src="/images/blog/emc/diagrams/item27-decision-tree.svg" alt="보편 참조 오버로드 회피 결정 트리" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

## 함정 — perfect forwarding의 비용

보편 참조 + perfect forwarding은 강력하지만 비용이 있다.

- **컴파일 시간 ↑**. 모든 호출 인자별로 인스턴스화된다.
- **에러 메시지 ❌**. 깊은 인스턴스화로 메시지가 난해하다.
- **디버깅 ❌**. 어느 오버로드가 호출됐는지 추적이 어렵다.
- **실제로 forward 못 되는 케이스**가 있다 ([항목 30](/blog/programming/cpp/effective-modern-cpp/item30-familiarize-yourself-with-perfect-forwarding-failure-cases)).

**간단한 케이스엔 비-템플릿이 낫다.**

## 핵심 정리

1. 보편 참조 오버로딩 대안 **5가지**가 있다. 상황에 맞게 쓴다.
2. 단순한 경우엔 **pass by value나 const T&**도 충분하다.
3. 정밀 제어가 필요하면 **tag dispatch 또는 enable_if**를 쓴다.
4. **C++20 concepts**가 SFINAE보다 가독성이 우수하다.
5. perfect forwarding의 비용 (컴파일·디버깅)을 인지한다.

## 관련 항목

- [항목 26: 오버로딩 함정](/blog/programming/cpp/effective-modern-cpp/item26-avoid-overloading-on-universal-references)
- [항목 28: 참조 축약](/blog/programming/cpp/effective-modern-cpp/item28-understand-reference-collapsing)
- [항목 30: forwarding 실패](/blog/programming/cpp/effective-modern-cpp/item30-familiarize-yourself-with-perfect-forwarding-failure-cases)
- [항목 41: pass by value](/blog/programming/cpp/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params)
