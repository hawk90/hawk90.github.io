---
title: "absl::compare — three-way 비교"
date: 2026-06-12T09:06:00
description: "absl::weak_ordering, strong_ordering, partial_ordering — C++20 spaceship의 polyfill과 비교 helper."
series: "Abseil Code Review"
seriesOrder: 54
tags: [cpp, abseil, utility, compare, three-way]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## three-way comparison이 푸는 문제

C++20 이전에는 비교 가능 타입이 *최소 6개*의 연산자를 정의해야 했다(`==`, `!=`, `<`, `<=`, `>`, `>=`). 매번 boilerplate.

```cpp
// 회피 — 6개 연산자 수동
struct Point {
    int x, y;
    bool operator==(const Point& o) const { return x == o.x && y == o.y; }
    bool operator!=(const Point& o) const { return !(*this == o); }
    bool operator<(const Point& o) const  { return std::tie(x, y) < std::tie(o.x, o.y); }
    bool operator<=(const Point& o) const { return !(o < *this); }
    bool operator>(const Point& o) const  { return o < *this; }
    bool operator>=(const Point& o) const { return !(*this < o); }
};
```

C++20 `operator<=>`는 한 번에 처리한다.

```cpp
// C++20
struct Point {
    int x, y;
    auto operator<=>(const Point&) const = default;
};
```

Abseil은 C++17 이하 환경에 *세 가지 ordering 카테고리*를 제공해서 spaceship-스러운 디자인을 가능하게 한다(단 spaceship 자체는 컴파일러 지원이 필요해 직접 polyfill하지 않는다).

```cpp
#include "absl/types/compare.h"

absl::weak_ordering    wo = absl::weak_ordering::less;
absl::strong_ordering  so = absl::strong_ordering::equal;
absl::partial_ordering po = absl::partial_ordering::unordered;
```

## 세 가지 ordering 카테고리

| 카테고리 | 의미 | 예 |
|---------|------|-----|
| `strong_ordering` | 동등 = 구별 불가 | int, std::string |
| `weak_ordering` | 동등 = 같은 동치 클래스 | 대소문자 무시 문자열 |
| `partial_ordering` | 일부는 비교 불가 | float (NaN), 부분 순서 집합 |

`strong` ⊆ `weak` ⊆ `partial` 관계. strong은 weak으로, weak은 partial로 변환 가능.

## 값 종류

각 카테고리는 가능한 값이 정해져 있다.

```cpp
// strong_ordering: less, equal, greater
absl::strong_ordering::less;
absl::strong_ordering::equal;
absl::strong_ordering::greater;

// weak_ordering: less, equivalent, greater
absl::weak_ordering::less;
absl::weak_ordering::equivalent;
absl::weak_ordering::greater;

// partial_ordering: less, equivalent, greater, unordered
absl::partial_ordering::less;
absl::partial_ordering::equivalent;
absl::partial_ordering::greater;
absl::partial_ordering::unordered;   // NaN 같은 경우
```

## 0과의 비교

`<=>` 결과는 *0과 비교*해 의미를 본다.

```cpp
auto r = a <=> b;
if (r < 0)       std::cout << "less";
else if (r == 0) std::cout << "equal/equiv";
else             std::cout << "greater";
```

`absl::strong_ordering`/`weak_ordering`/`partial_ordering`도 동일 인터페이스.

```cpp
absl::weak_ordering r = CompareCaseInsensitive("Hello", "hello");
if (r == 0) {
    // equivalent
}
```

## 비교 함수의 권장 시그니처

라이브러리 helper를 만들 때 *three-way*가 효율적이다(< 한 번, == 한 번 두 번 부르는 대신 한 번).

```cpp
// 회피 — 두 번 비교
template <typename T>
int Cmp(const T& a, const T& b) {
    if (a < b) return -1;
    if (b < a) return 1;
    return 0;
}

// Good — 한 번에 의미 추출
template <typename T>
absl::weak_ordering ThreeWay(const T& a, const T& b);
```

## 호환성 — std::strong_ordering으로 변환

C++20 컴파일러에서는 `absl::*_ordering`이 `std::*_ordering`의 별칭이다(C++20 이상 빌드).

```cpp
// C++20 빌드
static_assert(std::is_same_v<absl::strong_ordering, std::strong_ordering>);
```

따라서 다음과 같은 자연스러운 마이그레이션이 가능.

```cpp
// before — C++17 코드
absl::strong_ordering Compare(const T&, const T&);

// after — C++20에서도 그대로 컴파일, std와 호환
absl::strong_ordering Compare(const T&, const T&);
```

## absl::compare가 spaceship을 구현하나?

직접 구현하지 않는다. `operator<=>`는 컴파일러 빌트인이라 폴리필이 불가능하다. Abseil이 제공하는 것은 *결과 타입*과 *비교 helper*뿐.

C++17 코드는 여전히 `operator<` 등 개별 연산자를 정의해야 한다. 다만 *내부 비교 함수*를 `weak_ordering` 반환으로 통일해 두면 C++20 마이그레이션 시 매끄럽다.

## 작은 예시 — version comparison

```cpp
struct Version {
    int major, minor, patch;
    std::string prerelease;   // 빈 문자열이 stable

    absl::weak_ordering CompareTo(const Version& o) const {
        if (auto r = absl::compare_three_way{}(major, o.major); r != 0) return r;
        if (auto r = absl::compare_three_way{}(minor, o.minor); r != 0) return r;
        if (auto r = absl::compare_three_way{}(patch, o.patch); r != 0) return r;

        // prerelease 있음 < prerelease 없음 (semver 규칙)
        if (prerelease.empty() != o.prerelease.empty()) {
            return prerelease.empty() ? absl::weak_ordering::greater
                                       : absl::weak_ordering::less;
        }
        return absl::compare_three_way{}(prerelease, o.prerelease);
    }

    bool operator<(const Version& o) const  { return CompareTo(o) < 0; }
    bool operator==(const Version& o) const { return CompareTo(o) == 0; }
    // 나머지 연산자는 < 와 ==에서 파생
};
```

## 회피 패턴

```cpp
// 회피 — 비교 함수가 bool 반환만
bool LessVersion(const Version& a, const Version& b);   // < 만 표현 가능

// Good — three-way
absl::weak_ordering CompareVersion(const Version& a, const Version& b);
```

```cpp
// 회피 — float에 strong_ordering
absl::strong_ordering Cmp(float a, float b);   // NaN 처리 모호

// Good — partial_ordering
absl::partial_ordering Cmp(float a, float b);
```

## 정리

- `absl::strong_ordering`/`weak_ordering`/`partial_ordering` — 비교 결과 카테고리.
- C++20에서 `std::*_ordering`의 별칭, C++17에서 polyfill.
- `operator<=>`는 컴파일러 빌트인이라 polyfill 불가 — *결과 타입*만 제공.
- three-way 비교는 한 번 비교로 끝 — 효율적.
- float·부분 순서는 `partial_ordering`, 일반적 정렬은 `strong_ordering`.

## 다음 장 예고

[Part 9-08: utility](/blog/programming/code-review/abseil/part9-08-utility) — apply, in_place 등 작은 utility.

## 관련 항목

- [Part 5-04: btree_map](/blog/programming/code-review/abseil/part5-04-btree-map) — comparator 사용
- [Part 9-04: absl::variant](/blog/programming/code-review/abseil/part9-04-variant) — variant 비교
- [원문 — absl::compare](https://abseil.io/docs/cpp/guides/types#three-way-comparison)
