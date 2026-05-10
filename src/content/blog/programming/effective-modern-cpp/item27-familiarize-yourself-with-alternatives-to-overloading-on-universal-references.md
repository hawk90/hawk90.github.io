---
title: "항목 27: 보편 참조 오버로딩 대안에 익숙해져라"
date: 2025-01-08T14:00:00
description: "tag dispatch, enable_if, pass by value, 태그된 디스패치 등 우회 기법."
tags: [C++, Universal Reference, SFINAE, Modern C++]
series: "Effective Modern C++"
seriesOrder: 27
draft: true
---

> **초안** — 정리 진행 중

## 개요

항목 26에서 본 함정을 피하면서도 보편 참조의 효율을 누리고 싶을 때 쓸 수 있는 **다섯 가지 대안**.

## 1. 오버로드 자체를 포기

가장 단순. 함수 이름을 분리하거나 하나의 시그니처만 사용.

```cpp
template<typename T>
void logAndAddName(T&& name);   // 보편 참조 — 다른 오버로드 없음
```

## 2. `const T&`만 사용

C++98 스타일 — 추가 복사 비용은 있지만 단순.

```cpp
void logAndAdd(const std::string& name);  // 한 가지 시그니처만
```

## 3. Pass by value

C++11에선 의외로 효율적인 선택. `std::move`로 멤버에 옮김.

```cpp
class Person {
    std::string name;
public:
    explicit Person(std::string n) : name(std::move(n)) {}
};
```

자세한 분석은 항목 41.

## 4. Tag Dispatch

추가 매개변수(tag)로 어떤 구현에 갈지 결정.

```cpp
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

## 5. `enable_if`로 보편 참조 제한 (SFINAE)

특정 타입 조건을 만족할 때만 보편 참조 후보가 되도록 제한.

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

`Person`이나 정수에는 매칭 안 되고, 그 외 타입에만 매칭. copy/move의 자연스러운 동작 유지.

## C++20: `requires`로 더 깔끔하게

```cpp
template<typename T>
    requires (!std::derived_from<std::decay_t<T>, Person>) &&
             (!std::integral<std::remove_reference_t<T>>)
explicit Person(T&& n);
```

## 트레이드오프

| 기법 | 장점 | 단점 |
| --- | --- | --- |
| 1. 오버로드 포기 | 단순 | 유연성 손실 |
| 2. `const T&` | 단순 | rvalue 효율 손실 |
| 3. pass by value | 깔끔, move 활용 | 복사 가능 타입에만 |
| 4. tag dispatch | 명확 | 코드 분기 필요 |
| 5. `enable_if` | 정밀 제어 | 가독성 낮음 |

## 핵심 정리

1. 보편 참조 오버로딩 대안은 다섯 가지 — 상황에 맞게 선택
2. 단순한 경우에는 pass by value나 `const T&`도 충분
3. 정밀 제어가 필요하면 tag dispatch 또는 `enable_if`
4. C++20의 concepts/requires가 SFINAE보다 가독성 우수
