---
title: "Part 10-03: Custom hashable"
date: 2026-05-25T12:00:00
description: "실전 사용자 타입을 hashable로 만들기 — value class, enum, pair, raw 바이트 등 흔한 패턴 정리."
series: "Abseil Code Review"
seriesOrder: 58
tags: [cpp, abseil, hash, custom, user-type]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

## 표준 hashable과 보너스

Abseil의 `absl::Hash`는 다음 타입을 *기본*으로 hashable로 인식한다.

- 모든 정수·실수·포인터
- `bool`, `char`, `wchar_t` 등 문자형
- `std::string`, `absl::string_view`
- `std::pair`, `std::tuple` (요소가 hashable)
- `std::vector`, `std::array`, `std::set`, `std::map` 등 표준 컨테이너
- `absl::flat_hash_set`, `absl::node_hash_set` (`combine_unordered`)
- `absl::optional`, `absl::variant`
- `absl::Time`, `absl::Duration`

이 위에 사용자 타입만 `AbslHashValue`를 추가하면 된다.

## 패턴 1 — 단순 value class

```cpp
struct UserId {
    int64_t value;

    template <typename H>
    friend H AbslHashValue(H h, const UserId& id) {
        return H::combine(std::move(h), id.value);
    }

    friend bool operator==(UserId a, UserId b) { return a.value == b.value; }
};

absl::flat_hash_map<UserId, User> users;
users[UserId{42}] = ...;
```

내부 타입(`int64_t`)이 hashable이므로 한 줄.

## 패턴 2 — 다중 필드

```cpp
struct CompositeKey {
    std::string region;
    int64_t user_id;
    absl::CivilDay date;

    template <typename H>
    friend H AbslHashValue(H h, const CompositeKey& k) {
        return H::combine(std::move(h), k.region, k.user_id, k.date);
    }

    friend bool operator==(const CompositeKey& a, const CompositeKey& b) {
        return a.region == b.region && a.user_id == b.user_id && a.date == b.date;
    }
};
```

`CivilDay`도 Abseil이 기본 hashable로 제공.

## 패턴 3 — enum class

`enum class`는 기본 hashable이지만 *intentional하게* friend 함수를 두면 가독성이 좋다.

```cpp
enum class Region : int { kUS, kEU, kAP };

template <typename H>
H AbslHashValue(H h, Region r) {
    return H::combine(std::move(h), static_cast<int>(r));
}
```

`absl::Hash`는 enum class를 underlying type으로 자동 처리하므로 *작성 불필요* 하지만, namespace 안의 의도 표현용으로 쓸 수 있다.

## 패턴 4 — bytes / raw data

이미지 hash, 바이너리 키 등 raw 바이트:

```cpp
struct Bytes {
    std::vector<uint8_t> data;

    template <typename H>
    friend H AbslHashValue(H h, const Bytes& b) {
        return H::combine_contiguous(std::move(h), b.data.data(), b.data.size());
    }
};
```

`combine_contiguous`로 trivial 타입 N개를 *바이트 묶음으로* 처리. 일반 `combine(h, vec)`보다 빠르다.

## 패턴 5 — set-like (순서 무관)

```cpp
class TagSet {
public:
    absl::flat_hash_set<std::string> tags;

    template <typename H>
    friend H AbslHashValue(H h, const TagSet& t) {
        return H::combine_unordered(std::move(h), t.tags.begin(), t.tags.end());
    }

    friend bool operator==(const TagSet& a, const TagSet& b) {
        return a.tags == b.tags;
    }
};
```

`combine_unordered`가 순서를 흡수 — `{"a", "b"}` 와 `{"b", "a"}` 가 같은 해시.

## 패턴 6 — 비공개 필드 (friend)

```cpp
class Money {
public:
    Money(int64_t cents, std::string currency)
        : cents_(cents), currency_(std::move(currency)) {}

    template <typename H>
    friend H AbslHashValue(H h, const Money& m) {
        return H::combine(std::move(h), m.cents_, m.currency_);
    }

    friend bool operator==(const Money& a, const Money& b) {
        return a.cents_ == b.cents_ && a.currency_ == b.currency_;
    }

private:
    int64_t cents_;
    std::string currency_;
};
```

`friend`라 private 멤버 접근 가능. 외부 namespace 침범 없음.

## 패턴 7 — std::hash 호환 추가

std 컨테이너도 함께 받으려면:

```cpp
struct MyKey {
    int x, y;

    template <typename H>
    friend H AbslHashValue(H h, const MyKey& k) {
        return H::combine(std::move(h), k.x, k.y);
    }

    friend bool operator==(MyKey a, MyKey b) { return a.x == b.x && a.y == b.y; }
};

// std::unordered_map<MyKey, V> 사용을 위해
namespace std {
template <>
struct hash<MyKey> {
    size_t operator()(const MyKey& k) const noexcept {
        return absl::Hash<MyKey>{}(k);
    }
};
}
```

`absl::Hash`로 위임하므로 알고리즘은 한 곳에서만 정의된다.

## 회피 패턴

```cpp
// 회피 — 일부 필드만 hash + 다른 필드까지 ==
struct Bad {
    int id;
    std::string name;
    int version;   // hash에는 안 들어가지만 ==에는 들어감

    template <typename H>
    friend H AbslHashValue(H h, const Bad& b) {
        return H::combine(std::move(h), b.id, b.name);   // version 빠짐
    }

    friend bool operator==(const Bad& a, const Bad& b) {
        return a.id == b.id && a.name == b.name && a.version == b.version;
        // ❌ a == b 이지만 hash 다를 수 있음 — 해시 컨테이너 invariant 위반
    }
};
```

규칙: **`a == b` ⇒ `hash(a) == hash(b)`**. 두 함수의 필드 집합은 *동일* 해야 한다. 차이가 나면 해시 컨테이너에서 조회 실패가 일어난다.

```cpp
// 회피 — 부동소수 hash
struct Bad {
    double x;
    template <typename H>
    friend H AbslHashValue(H h, const Bad& b) {
        return H::combine(std::move(h), b.x);
        // ❌ NaN != NaN인데 같은 비트면 hash 같음 — operator==의 의미와 충돌
    }
};
```

부동소수를 해시 키로 쓰는 것 자체가 보통 설계 실수다. 필요하면 NaN 정규화 + 부동소수 비교 정책을 명시.

## 큰 객체에 대한 해시 캐싱

해시 계산이 무거우면 *캐싱* 을 고려한다.

```cpp
class HugeKey {
public:
    HugeKey(std::string s) : s_(std::move(s)), h_(absl::Hash<std::string>{}(s_)) {}

    template <typename H>
    friend H AbslHashValue(H h, const HugeKey& k) {
        return H::combine(std::move(h), k.h_);   // 미리 계산
    }

    friend bool operator==(const HugeKey& a, const HugeKey& b) {
        return a.h_ == b.h_ && a.s_ == b.s_;   // hash 같지 않으면 빠른 fail
    }

private:
    std::string s_;
    size_t h_;   // cached
};
```

*객체가 immutable*일 때만 안전. 멤버 변경 시 캐시 동기화가 어렵다.

## 정리

- 사용자 타입은 `AbslHashValue` friend 함수 한 줄로 hashable.
- `operator==`와 *같은 필드 집합* 을 covering 해야 한다.
- `combine`/`combine_contiguous`/`combine_unordered` 셋 중 의도에 맞춰 선택.
- enum class는 자동 처리 — 명시 정의 불필요.
- std 컨테이너 호환은 `std::hash` 특수화에서 `absl::Hash`로 위임.

## 다음 장 예고

[Part 11-01: LOG, VLOG, CHECK](/blog/programming/code-review/abseil/part11-01-log-vlog-check) — Abseil logging.

## 관련 항목

- [Part 10-01: AbslHashValue](/blog/programming/code-review/abseil/part10-01-abseil-hash-value)
- [Part 10-02: HashState chaining](/blog/programming/code-review/abseil/part10-02-hash-state-chaining)
- [Part 5-01: flat_hash_map](/blog/programming/code-review/abseil/part5-01-flat-hash-map)
- [원문 — User-Defined Types](https://abseil.io/docs/cpp/guides/hash#extending-the-hash-framework-for-user-defined-types)
