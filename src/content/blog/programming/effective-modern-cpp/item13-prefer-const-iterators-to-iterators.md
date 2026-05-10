---
title: "항목 13: iterator보다 const_iterator를 선호하라"
date: 2025-01-06T16:00:00
description: "수정하지 않는 자리에는 const_iterator를 — C++11/14가 가져온 사용성 개선과 함께."
tags: [C++, Iterator, const, Modern C++]
series: "Effective Modern C++"
seriesOrder: 13
draft: true
---

> **초안** — 정리 진행 중

## 개요

`const_iterator`는 가리키는 값을 수정할 수 없는 반복자입니다. C++98에서는 사용이 번거로웠지만, C++11이 `cbegin`/`cend`를 도입하면서 일반 사용도 자연스러워졌습니다. 수정 의도가 없는 자리에는 항상 `const_iterator`를 쓰는 것이 권장됩니다.

## C++98의 불편함

```cpp
std::vector<int> v;

// const_iterator를 얻기가 번거로움
typedef std::vector<int>::iterator       IterT;
typedef std::vector<int>::const_iterator ConstIterT;

ConstIterT ci = std::find(static_cast<ConstIterT>(v.begin()),
                          static_cast<ConstIterT>(v.end()),
                          1983);
v.insert(static_cast<IterT>(ci), 1998);  // 컴파일 에러!
                                         // const_iterator → iterator 변환 불가
```

## C++11의 개선

`cbegin`/`cend`는 컨테이너가 const가 아니어도 `const_iterator`를 반환합니다.

```cpp
auto it = std::find(v.cbegin(), v.cend(), 1983);
v.insert(it, 1998);   // OK — C++11에서 insert는 const_iterator를 받음
```

C++11부터 모든 컨테이너 멤버 함수(`insert`, `erase` 등)가 `const_iterator`를 받도록 시그니처가 바뀌어, 변환 트릭이 필요 없습니다.

## C++14: 비-멤버 `cbegin`/`cend`

C++14는 비-멤버 `std::cbegin`, `std::cend`도 표준에 추가했습니다. 컨테이너든 배열이든 일관되게 사용 가능합니다.

```cpp
template<typename C, typename V>
void findAndInsert(C& container, const V& target, const V& value) {
    using std::cbegin;
    using std::cend;

    auto it = std::find(cbegin(container), cend(container), target);
    container.insert(it, value);
}
```

C++11만 쓴다면 비-멤버 cbegin은 직접 만들 수 있습니다.

```cpp
template<typename C>
auto cbegin_(const C& container) -> decltype(std::begin(container)) {
    return std::begin(container);  // const C& → const_iterator 반환
}
```

## 핵심 정리

1. 수정 의도가 없으면 `const_iterator`
2. `cbegin`/`cend`로 const가 아닌 컨테이너에서도 쉽게 얻음
3. C++14의 `std::cbegin`/`std::cend`를 비-멤버 형태로 사용
4. 제네릭 코드에서 `using std::cbegin; cbegin(c)` 패턴이 가장 유연
