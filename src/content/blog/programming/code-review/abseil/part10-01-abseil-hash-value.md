---
title: "Abseil AbslHashValue 분석"
date: 2026-06-12T09:08:00
description: "AbslHashValue — std::hash 특수화 대신 ADL 기반 friend 함수로 hash를 정의하는 Abseil의 방식."
series: "Abseil Code Review"
seriesOrder: 56
tags: [cpp, abseil, hash, adl, customization]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## std::hash의 불편

`std::hash`를 사용자 타입에 적용하려면 *std namespace에 specialization* 을 추가해야 한다.

```cpp
// 회피 — std namespace 침범
namespace std {
template <>
struct hash<MyPoint> {
    size_t operator()(const MyPoint& p) const {
        return hash<int>{}(p.x) ^ hash<int>{}(p.y);   // 약한 해시
    }
};
}
```

문제 두 가지:
- 외부 namespace에 코드를 추가해야 함(어느 헤더에 둘지 골치).
- `int`별 해시를 XOR로 섞는 *직접 합성* 은 충돌이 잦다.

Abseil은 *멤버처럼 정의하는 friend 함수* 를 통해 이 둘을 모두 해결한다.

friend 함수 → HashState chain의 흐름은 다음과 같다.

![AbslHashValue friend 패턴](/images/blog/abseil/diagrams/part10-01-absl-hash-value.svg)

## AbslHashValue — friend ADL 기반

```cpp
#include "absl/hash/hash.h"

struct MyPoint {
    int x, y;

    template <typename H>
    friend H AbslHashValue(H h, const MyPoint& p) {
        return H::combine(std::move(h), p.x, p.y);
    }
};

absl::flat_hash_set<MyPoint> set;
set.insert({1, 2});
```

핵심 패턴:
1. `friend` 함수로 클래스 안에 정의.
2. 첫 인자가 *HashState* 템플릿(`H`).
3. `H::combine(std::move(h), fields...)`로 필드 chaining.
4. 결과 H를 반환.

이름이 `AbslHashValue`로 고정되어 있고 ADL로 찾아진다. namespace를 침범하지 않는다.

## 왜 friend인가

`friend`로 클래스 안에 두면:
- 클래스와 함께 정의·유지·삭제됨.
- private 필드에 접근 가능.
- 헤더의 한 곳에 모여 검색·리뷰 쉬움.

```cpp
class User {
public:
    User(std::string n, int a) : name_(std::move(n)), age_(a) {}

    template <typename H>
    friend H AbslHashValue(H h, const User& u) {
        return H::combine(std::move(h), u.name_, u.age_);   // private OK
    }

    friend bool operator==(const User& a, const User& b) {
        return a.name_ == b.name_ && a.age_ == b.age_;
    }

private:
    std::string name_;
    int age_;
};
```

해시 + 동등 비교가 함께 정의되므로 *해시 컨테이너 호환성*이 한 클래스에 박힌다.

## absl::Hash<T>로 사용

직접 부르려면 `absl::Hash<T>`를 인스턴스화.

```cpp
absl::Hash<MyPoint> hasher;
size_t h = hasher(MyPoint{1, 2});
```

`absl::flat_hash_map`, `absl::flat_hash_set`은 기본적으로 `absl::Hash`를 쓰므로 `AbslHashValue` 정의만 있으면 그대로 동작.

## std::hash와의 호환

Abseil은 *std 컨테이너 호환을 위해* `std::hash` 특수화를 자동으로 만들지 않는다. `std::unordered_map<MyPoint>`를 쓰려면 여전히 std::hash 특수화가 필요하다.

```cpp
// std 컨테이너 호환을 원한다면 함께 작성
namespace std {
template <>
struct hash<MyPoint> {
    size_t operator()(const MyPoint& p) const {
        return absl::Hash<MyPoint>{}(p);   // AbslHashValue로 위임
    }
};
}
```

`std::hash`가 `absl::Hash`를 부르도록 해 두면 *해시 알고리즘이 한 곳에서 정의* 된다.

## randomization — 같은 입력, 다른 출력

`absl::Hash`는 *프로세스마다 다른 시드*를 사용한다. 같은 객체도 프로세스를 재시작하면 해시값이 다르다.

```cpp
// run 1
absl::Hash<int>{}(42) == 0x12345678'abcdef00ULL;

// run 2 (다른 프로세스)
absl::Hash<int>{}(42) == 0xfedcba98'76543210ULL;
```

이는 *hash flooding DoS 방어* 다. 공격자가 충돌하는 키를 미리 계산할 수 없다. 단점: 직렬화하면 다른 머신에서 의미 없음(분산 해싱에는 별도 algorithm 필요).

## 회피 패턴

```cpp
// 회피 — XOR로 직접 합성
template <typename H>
friend H AbslHashValue(H h, const MyPoint& p) {
    return H::combine(std::move(h),
                      std::hash<int>{}(p.x) ^ std::hash<int>{}(p.y));   // ❌ 약함
}

// Good — H::combine에 그대로 위임
template <typename H>
friend H AbslHashValue(H h, const MyPoint& p) {
    return H::combine(std::move(h), p.x, p.y);
}
```

```cpp
// 회피 — std::hash 특수화만 (absl 컨테이너 사용 불가)
namespace std {
template <> struct hash<MyPoint> { ... };
}

// Good — AbslHashValue 우선, std 호환은 위임
```

```cpp
// 회피 — operator== 빠짐
struct Bad {
    int x;
    template <typename H> friend H AbslHashValue(H h, const Bad& b) {
        return H::combine(std::move(h), b.x);
    }
    // ❌ operator==이 없으면 unordered 컨테이너에서 비교 실패
};
```

## 작은 예시 — composite key

```cpp
struct OrderKey {
    int64_t user_id;
    absl::Time when;
    std::string region;

    template <typename H>
    friend H AbslHashValue(H h, const OrderKey& k) {
        return H::combine(std::move(h), k.user_id, k.when, k.region);
    }

    friend bool operator==(const OrderKey& a, const OrderKey& b) {
        return a.user_id == b.user_id && a.when == b.when && a.region == b.region;
    }
};

absl::flat_hash_map<OrderKey, Order> orders;
orders[{123, absl::Now(), "us-east"}] = ...;
```

`absl::Time`, `std::string`, `int64_t` 모두 `AbslHashValue`가 기본 정의되어 있으므로 `combine`에 그대로 넘긴다.

## 정리

- `AbslHashValue` — friend ADL 기반 hash 정의. std namespace 침범 없음.
- `H::combine(std::move(h), fields...)`이 표준 합성. 직접 XOR 회피.
- `absl::Hash<T>`가 `AbslHashValue`를 찾아 부른다. ADL 자동.
- 프로세스마다 다른 시드 → hash flooding 방어. 직렬화에는 부적합.
- std 컨테이너 호환을 원하면 `std::hash<T>` 특수화에서 `absl::Hash`로 위임.

## 다음 장 예고

[Part 10-02: HashState chaining](/blog/programming/code-review/abseil/part10-02-hash-state-chaining) — combine의 내부 동작.

## 관련 항목

- [Part 5-01: flat_hash_map](/blog/programming/code-review/abseil/part5-01-flat-hash-map)
- [Part 5-07: Swiss table internals](/blog/programming/code-review/abseil/part5-07-swiss-table-internals)
- [Part 10-03: Custom hashable](/blog/programming/code-review/abseil/part10-03-custom-hashable)
- [원문 — Abseil Hash Framework](https://abseil.io/docs/cpp/guides/hash)
