---
title: "Abseil HashState chaining"
date: 2026-06-12T09:09:00
description: "H::combine의 진짜 동작 — HashState로 필드를 chain해 한 번에 좋은 분포를 얻는 방법."
series: "Abseil Code Review"
seriesOrder: 57
tags: [cpp, abseil, hash, composition, state]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## HashState의 정체

`AbslHashValue` 함수가 받는 `H`는 *HashState concept*을 만족하는 타입이다. Abseil 내부에서는 `absl::hash_internal::MixingHashState` 같은 구체 구현이 들어오지만 사용자는 *추상 인터페이스*만 본다.

```cpp
template <typename H>
friend H AbslHashValue(H h, const MyType& v) {
    // h: HashState — 누적된 해시 상태
    // 반환: 새 HashState
    return H::combine(std::move(h), v.field1, v.field2);
}
```

HashState는 *immutable*에 가까운 모델 — `combine`은 새 상태를 반환한다.

## combine — 기본 chaining

```cpp
template <typename H>
friend H AbslHashValue(H h, const Order& o) {
    return H::combine(std::move(h), o.id, o.user_id, o.amount, o.timestamp);
}
```

`combine(h, x1, x2, ..., xN)`은 *순차적으로* 각 인자를 누적한다. 내부적으로는 다음과 동등.

```cpp
h = AbslHashValue(std::move(h), x1);
h = AbslHashValue(std::move(h), x2);
...
return h;
```

각 인자에 대해 그 타입의 `AbslHashValue`를 ADL로 찾아 호출.

## combine_contiguous — 연속 메모리 최적화

같은 타입의 N개를 한 번에 hash할 때.

```cpp
template <typename H>
friend H AbslHashValue(H h, const Histogram& hg) {
    return H::combine_contiguous(std::move(h), hg.bins.data(), hg.bins.size());
}
```

`combine_contiguous`는 trivially-hashable 타입(int, char, float 등)이면 *바이트 단위 묶어 한 번에* 처리한다. 일반 `combine`을 N번 부르는 것보다 빠르다.

## combine_unordered — set·map 친화

set·unordered_map의 hash는 *순서에 무관* 해야 한다.

```cpp
template <typename H>
friend H AbslHashValue(H h, const Bag& b) {
    return H::combine_unordered(std::move(h), b.items.begin(), b.items.end());
}
```

내부적으로 각 원소의 hash를 *commutative*하게 결합(XOR가 아닌 안전한 방식). 같은 원소집합이면 어떤 순서로 들어와도 같은 결과.

`absl::flat_hash_set`·`absl::flat_hash_map`의 hash가 이걸 쓴다.

## H::combine의 의미론

`combine`은 다음을 약속한다.

1. **결정적** — 같은 시드, 같은 입력이면 같은 결과.
2. **분포 좋음** — 약한 비트가 없도록 mixing 함수 적용.
3. **순서 의존** — `combine(h, a, b)`와 `combine(h, b, a)`는 다른 결과(원하면 `combine_unordered` 사용).
4. **타입 의존** — `int 0`과 `string ""`이 같은 결과를 내지 않음.

마지막 항목이 중요하다. 사용자가 직접 `h = h * 31 + x` 같은 코드를 짜면 `(0, "")`와 `("", 0)`이 같은 결과를 낼 수 있다. `combine`은 *타입 인코딩*을 포함해 이런 충돌을 막는다.

## 가변 alternative — variant

variant의 hash는 *index + active value* 를 함께 섞는다.

```cpp
template <typename H>
friend H AbslHashValue(H h, const absl::variant<int, std::string>& v) {
    return H::combine(std::move(h), v.index(), absl::visit([](auto&& x) {
        return absl::Hash<std::decay_t<decltype(x)>>{}(x);
    }, v));
}
```

Abseil이 variant에 대해 기본 `AbslHashValue`를 제공하므로 사용자는 보통 직접 짤 일이 없다. 단, *자체 sum type*에 hash가 필요하면 같은 패턴.

## 작은 예시 — nested struct

```cpp
struct Address {
    std::string street;
    std::string city;

    template <typename H>
    friend H AbslHashValue(H h, const Address& a) {
        return H::combine(std::move(h), a.street, a.city);
    }
};

struct Person {
    std::string name;
    Address address;
    std::vector<std::string> phones;

    template <typename H>
    friend H AbslHashValue(H h, const Person& p) {
        // address: 그 자체로 AbslHashValue 정의 → combine이 위임
        // phones: vector<string>은 std로 제공된 hash 사용
        return H::combine(std::move(h), p.name, p.address, p.phones);
    }
};
```

`combine`이 각 인자의 `AbslHashValue`를 ADL로 찾아 *재귀적으로* 합성한다. 사용자는 평탄한 한 줄만 쓴다.

## 회피 패턴

```cpp
// 회피 — 직접 mixing
template <typename H>
friend H AbslHashValue(H h, const Bad& b) {
    size_t s = std::hash<int>{}(b.x);
    s ^= std::hash<std::string>{}(b.y) << 1;   // ❌ 약한 분포
    return H::combine(std::move(h), s);
}

// Good
template <typename H>
friend H AbslHashValue(H h, const Bad& b) {
    return H::combine(std::move(h), b.x, b.y);
}
```

```cpp
// 회피 — set hash인데 순서 의존
template <typename H>
friend H AbslHashValue(H h, const MySet& s) {
    return H::combine_contiguous(std::move(h), s.items.data(), s.items.size());
    // ❌ {1,2,3}과 {3,2,1}이 다른 해시
}

// Good — unordered 헬퍼
template <typename H>
friend H AbslHashValue(H h, const MySet& s) {
    return H::combine_unordered(std::move(h), s.items.begin(), s.items.end());
}
```

```cpp
// 회피 — std::move 누락
template <typename H>
friend H AbslHashValue(H h, const X& x) {
    return H::combine(h, x.a);   // ❌ rvalue 권장
}

// Good
return H::combine(std::move(h), x.a);
```

`H`는 *가벼운 값 타입* 으로 설계되어 move가 cheap하지만, 관례적으로 `std::move`를 명시한다.

## 표 — combine 변형

| 메서드 | 용도 |
|--------|------|
| `combine(h, x1, x2, ...)` | 순서 있는 필드 chaining |
| `combine_contiguous(h, ptr, n)` | 같은 타입 연속 — 빠름 |
| `combine_unordered(h, it1, it2)` | 순서 무관 (set·map) |

## 정리

- `H::combine`은 *순차적으로 각 필드를 누적*. 약한 mixing은 알아서 처리.
- 같은 타입 연속 메모리 → `combine_contiguous` (성능).
- 순서 무관 집합 → `combine_unordered` (의미).
- HashState는 이동 친화 — `std::move(h)`로 관례적 전달.
- `combine`은 타입 인코딩을 포함 → 다른 타입의 같은 비트값이 충돌하지 않음.

## 다음 장 예고

[Part 10-03: Custom hashable](/blog/programming/code-review/abseil/part10-03-custom-hashable) — 실전 사용자 타입 hash 패턴.

## 관련 항목

- [Part 10-01: AbslHashValue](/blog/programming/code-review/abseil/part10-01-abseil-hash-value)
- [Part 5-07: Swiss table internals](/blog/programming/code-review/abseil/part5-07-swiss-table-internals) — Swiss table이 hash bits를 어떻게 쓰는지
- [원문 — Hash State](https://abseil.io/docs/cpp/guides/hash#the-hashstate-concept)
