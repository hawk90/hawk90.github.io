---
title: "항목 27: 보편 참조 오버로딩 대안에 익숙해져라"
date: 2025-01-08T14:00:00
description: "tag dispatch, enable_if, pass by value, concepts — 보편 참조 함정 회피 5가지 기법."
tags: [C++, Universal Reference, SFINAE, Tag Dispatch, Modern C++]
series: "Effective Modern C++"
seriesOrder: 27
---

## 개요

[항목 26](/blog/programming/effective-modern-cpp/item26-avoid-overloading-on-universal-references)에서 본 함정 — 보편 참조와 다른 오버로드 함께 두기. 이 항목은 그 함정을 피하면서도 보편 참조의 효율을 누리는 **다섯 가지 대안**.

## 대안 1 — 오버로드 자체를 포기

가장 단순. 함수 이름을 분리하거나 하나의 시그니처만 사용.

```cpp
template<typename T>
void logAndAddName(T&& name);   // 보편 참조 — 다른 오버로드 없음
```

생성자에선 이름 못 바꿈 → 다른 대안 필요.

## 대안 2 — `const T&`만 사용

C++98 스타일. 추가 복사 비용은 있지만 단순.

```cpp
class Person {
public:
    explicit Person(const std::string& n);   // 단일
    explicit Person(int idx);
};
```

장점:
- 보편 참조 함정 없음
- copy/move 자동 생성

단점:
- rvalue 호출 시 추가 copy 비용 (1회)

## 대안 3 — Pass by Value

C++11+에서 의외로 효율적. `std::move`로 멤버에 옮김.

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

자세한 분석은 [항목 41](/blog/programming/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params).

장점:
- 단순
- copy/move 비용 적정
- 보편 참조 함정 없음

## 대안 4 — Tag Dispatch

추가 매개변수(tag)로 어떤 구현에 갈지 결정.

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

호출:
```cpp
logAndAdd("hello");   // T=const char*, false_type → impl(const char*&&, false_type)
logAndAdd(42);        // T=int, true_type → impl(int, true_type)
```

장점:
- 명확
- SFINAE보다 단순

단점:
- impl 함수 분기 필요
- 생성자에 적용 어려움 (생성자 위임 등 트릭)

## 대안 5 — `enable_if`로 보편 참조 제한 (SFINAE)

특정 타입 조건 만족할 때만 보편 참조가 후보.

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

`enable_if_t<조건>`이 false면 SFINAE로 후보에서 제외. → Person 또는 정수에는 매칭 안 됨, 그 외에만.

### `std::decay_t` 왜?

`T`가 `const Person&`이라면 `is_base_of<Person, const Person&>`는 false (참조 때문) — 잘못된 검사. `decay_t`로 참조·cv 제거.

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

`is_base_of`는 derived도 포함 — Person·SpecialPerson 모두 제외.

장점:
- 매우 정밀
- 표준 (`<type_traits>`)
- 모든 호환 타입에 보편 참조 적용

단점:
- 가독성 ❌ (이중 부정, 매크로처럼 보임)
- 에러 메시지 난해
- C++20 concepts가 더 깔끔

## C++20 — `requires` (concepts)

`enable_if`보다 가독성·에러 메시지 우수.

```cpp
template<typename T>
    requires (!std::derived_from<std::decay_t<T>, Person>) &&
             (!std::integral<std::remove_reference_t<T>>)
explicit Person(T&& n);
```

또는 named concept:

```cpp
template<typename T>
concept NotPersonOrInt =
    !std::derived_from<std::decay_t<T>, Person> &&
    !std::integral<std::remove_reference_t<T>>;

template<NotPersonOrInt T>
explicit Person(T&& n);
```

훨씬 읽기 쉬움.

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

보편 참조 + perfect forwarding은 강력하지만:

- **컴파일 시간 ↑** — 모든 호출 인자별 인스턴스화
- **에러 메시지 ❌** — 깊은 인스턴스화로 메시지 난해
- **디버깅 ❌** — 어느 오버로드 호출됐는지 추적 어려움
- **실제로 forward 못 되는 케이스** ([항목 30](/blog/programming/effective-modern-cpp/item30-familiarize-yourself-with-perfect-forwarding-failure-cases))

→ **간단한 케이스엔 비-템플릿이 낫다**.

## 핵심 정리

1. 보편 참조 오버로딩 대안 **5가지** — 상황에 맞게
2. 단순한 경우엔 **pass by value나 const T&**도 충분
3. 정밀 제어가 필요하면 **tag dispatch 또는 enable_if**
4. **C++20 concepts**가 SFINAE보다 가독성 우수
5. perfect forwarding의 비용 (컴파일·디버깅) 인지

## 관련 항목

- [항목 26: 오버로딩 함정](/blog/programming/effective-modern-cpp/item26-avoid-overloading-on-universal-references)
- [항목 30: forwarding 실패](/blog/programming/effective-modern-cpp/item30-familiarize-yourself-with-perfect-forwarding-failure-cases)
- [항목 41: pass by value](/blog/programming/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params)
