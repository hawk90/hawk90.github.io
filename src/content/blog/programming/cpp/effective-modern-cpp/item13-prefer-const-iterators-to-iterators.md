---
title: "항목 13: iterator보다 const_iterator를 선호하라"
date: 2025-01-06T16:00:00
description: "수정 의도가 없는 자리에는 const_iterator. C++11/14의 cbegin/cend로 사용성 개선."
tags: [C++, Iterator, const, Modern C++]
series: "Effective Modern C++"
seriesOrder: 13
---

## 왜 이 항목이 중요한가?

const는 "가능한 곳에 모두 적용한다"가 좋은 관행이다. 그런데 C++98에서는 const_iterator 사용이 너무 번거로워서 다들 피했다. 결과적으로 read-only 코드인데 `iterator`로 작성되어 의도가 명확히 드러나지 않았다.

C++11이 `cbegin`/`cend`를 도입하고, C++14가 비-멤버 `std::cbegin`/`std::cend`를 추가하면서 const_iterator를 일상에서 자연스럽게 쓸 수 있게 되었다. 이 항목은 그 사용법과 제네릭 코드에서 비-멤버 `cbegin`이 유용한 이유를 정리한다.

## 개요

`const_iterator`는 가리키는 값을 수정할 수 없는 반복자다. const 적용을 가능한 모든 자리에 적용하는 것이 좋은 관행이지만, C++98에선 사용이 매우 번거로웠다. C++11이 `cbegin`/`cend`를 도입하고, C++14가 비-멤버 `std::cbegin`/`std::cend`를 추가하면서 일상에서 자연스럽게 쓸 수 있게 됐다.

## 필수 개념: iterator vs const_iterator

> **초보자를 위한 배경 지식**

<br>

| | iterator | const_iterator |
| --- | --- | --- |
| 가리키는 값 수정 | ✅ `*it = 5` | ❌ — read-only |
| 컨테이너 자체 수정 (insert/erase) | iterator로 위치 지정 | (C++11+) const_iterator로도 OK |

```cpp
std::vector<int> v;

auto it  = v.begin();   // iterator
auto cit = v.cbegin();  // const_iterator
*it  = 5;   // OK
*cit = 5;   // 에러
```

**의도**: "이 함수에서 컨테이너 내용 수정 안 해" → const_iterator로 표현 = const 적용 정신.

## C++98의 불편함

C++98엔 `cbegin`/`cend`가 없었다. const_iterator를 얻기가 번거로웠다.

```cpp
std::vector<int> v;

// const_iterator 얻기
typedef std::vector<int>::iterator       IterT;
typedef std::vector<int>::const_iterator ConstIterT;

ConstIterT ci = std::find(static_cast<ConstIterT>(v.begin()),
                          static_cast<ConstIterT>(v.end()),
                          1983);

// insert 시 const_iterator → iterator 변환 필요
v.insert(static_cast<IterT>(ci), 1998);   // 컴파일 에러!
                                          // C++98: insert는 iterator만 받는다
```

해결책은 pointer arithmetic이었다.

```cpp
v.insert(v.begin() + (ci - v.cbegin()), 1998);   // verbose
```

const_iterator를 안 쓰는 게 차라리 단순했다.

## C++11의 개선 — `cbegin`/`cend`

`cbegin`/`cend`는 컨테이너가 const가 아니어도 `const_iterator`를 반환한다.

```cpp
auto it = std::find(v.cbegin(), v.cend(), 1983);  // const_iterator
v.insert(it, 1998);                                // C++11+: insert가 const_iterator 받음
```

C++11부터 모든 컨테이너 멤버 함수(`insert`, `erase` 등)가 `const_iterator`를 받도록 시그니처가 통일됐다. 변환 트릭이 불필요해졌다.

## C++14의 추가 — 비-멤버 `std::cbegin`/`std::cend`

C++11엔 비-멤버 `std::begin`/`std::end`만 있고, 비-멤버 `cbegin`/`cend`는 빠져 있었다. C++14부터 추가됐다.

### 왜 비-멤버 cbegin이 좋은가 — 제네릭 코드

```cpp
template<typename C, typename V>
void findAndInsert(C& container, const V& target, const V& insertValue) {
    using std::cbegin;    // ADL 활용
    using std::cend;

    auto it = std::find(cbegin(container), cend(container), target);
    container.insert(it, insertValue);
}
```

배열·사용자 정의 컨테이너 모두 동작한다. `cbegin(arr)`도 OK다 (`std::cbegin`이 raw 배열을 처리한다).

```cpp
int arr[] = {1, 2, 3, 4, 5};
findAndInsert(arr, 3, 99);   // 배열도 OK
```

### C++11에서 비-멤버 cbegin 직접 만들기

C++11만 쓴다면 이렇게 한다.

```cpp
template<typename C>
auto cbegin_(const C& container) -> decltype(std::begin(container)) {
    return std::begin(container);   // const C& → const_iterator 반환
}
```

`const C&`로 받으면 `std::begin(container)`가 자동으로 `const_iterator`를 반환한다. `cbegin` 효과다.

C++14면 그냥 `std::cbegin`을 쓰면 된다.

## 권장 패턴

### 1. 수정 의도가 없으면 const_iterator

```cpp
// Bad
for (auto it = v.begin(); it != v.end(); ++it) { /* read only */ }

// Good
for (auto it = v.cbegin(); it != v.cend(); ++it) { /* read only */ }

// Better — range-for + auto&
for (const auto& x : v) { /* read only */ }
```

### 2. 함수 매개변수도 const&

```cpp
void process(const std::vector<int>& v) {
    auto it = v.begin();   // 자동 const_iterator (v가 const)
    // ...
}
```

const 컨테이너는 `begin()`이 자동으로 `const_iterator`를 반환한다.

### 3. STL 알고리즘은 cbegin/cend

```cpp
auto it = std::find(v.cbegin(), v.cend(), target);   // 의도: 찾기만
```

## 일관성 — `cbegin`/`cend` 항상

스타일 가이드 측면에서, 수정하지 않을 거면 무조건 `c`를 붙인다. 일관성이 의도 표현이 된다.

```cpp
auto count = std::count(v.cbegin(), v.cend(), target);   // 항상
```

## 컨테이너별 cbegin/cend

C++11 표준 컨테이너는 모두 멤버 `cbegin`/`cend`를 가지고 있다.

```cpp
std::vector<int>            v;   v.cbegin();
std::list<int>              l;   l.cbegin();
std::set<int>               s;   s.cbegin();
std::map<int, int>          m;   m.cbegin();
std::unordered_set<int>     us;  us.cbegin();
std::array<int, 5>          a;   a.cbegin();
std::deque<int>             d;   d.cbegin();
```

C++17부터 `std::initializer_list`, `std::valarray`, `std::filesystem::path` 등 더 많은 곳에 추가됐다.

## 비-const 컨테이너에서 const_iterator 얻기

```cpp
std::vector<int> v;   // non-const

auto it1 = v.cbegin();           // const_iterator
auto it2 = std::cbegin(v);       // C++14
auto it3 = v.begin();            // iterator
const auto& cv = v;
auto it4 = cv.begin();           // const_iterator (cv가 const)
```

`cbegin`이 가장 간결하다.

## 함정 — `auto`와 결합

```cpp
auto it = v.begin();   // v 종류에 따라 iterator OR const_iterator
```

`v`가 `const std::vector<int>`면 `const_iterator`다. `v`가 `std::vector<int>`면 `iterator`다.

명시적으로 const를 원하면 `cbegin`을 쓴다.

```cpp
auto it = v.cbegin();   // 항상 const_iterator
```

## 핵심 정리

1. 수정 의도가 없으면 **const_iterator**를 쓴다. const 정신 적용이다.
2. C++11 `cbegin`/`cend`로 const_iterator 얻기가 단순해졌다.
3. C++14 비-멤버 `std::cbegin`/`std::cend`로 제네릭 코드가 친화적이 된다 (배열도 OK).
4. C++11에서 비-멤버 cbegin은 직접 작성할 수 있다 (한 줄).
5. 일관성을 위해 read-only 코드엔 항상 `c` 형태를 쓴다.

## 관련 항목

- [항목 5: `auto` 선호](/blog/programming/cpp/effective-modern-cpp/item05-prefer-auto) — `auto`가 const 보존 여부
- [항목 12: 재정의 함수에는 override를 선언하라](/blog/programming/cpp/effective-modern-cpp/item12-declare-overriding-functions-override) — const성 검증
- Effective C++ item 3 — const whenever possible
