---
title: "Part 8-01: SmallVector (inline storage)"
date: 2026-05-24T12:00:00
description: "SmallVector — N개까지 inline 저장, overflow는 heap, std::vector 호환 인터페이스."
series: "Folly Code Review"
seriesOrder: 35
tags: [cpp, folly, container, smallvector, sbo]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::small_vector<T, N>`은 첫 N개 원소를 객체 내부 inline buffer에 두고, N을 초과하면 heap으로 전환한다. 작은 vector 사용이 잦은 hot path에서 heap 할당을 제거한다.

## 동기

`std::vector`는 항상 heap을 사용한다. 평균 size가 0-3개인 vector조차 `new[]`를 한다.

```text
파이프라인 단계 N개를 매 요청마다 vector에 넣었다 비우는 코드
  per request:  malloc + free  (수십~수백 ns)
  per second 100K req:  10ms 가량의 allocator overhead
```

이런 use case에서 stack에 fixed buffer를 두면 할당이 사라진다. LLVM의 `SmallVector`, boost의 `static_vector`/`small_vector`, abseil의 `InlinedVector`가 모두 같은 답.

```cpp
folly::small_vector<int, 4> v;   // 4개까지 inline
v.push_back(1); v.push_back(2);  // heap 할당 0
v.resize(10);                    // 이때 heap으로 spill
```

### 어디에 살게 되는가

`small_vector<T, N>`은 N개까지 stack(또는 그 객체가 사는 곳), 그 이상은 heap. 메모리 영역 자체의 차이를 짚고 가자.

![Heap vs stack vs arena](/images/blog/cpp-concepts/diagrams/heap-vs-stack-vs-arena.svg)

stack은 LIFO + 자동 해제, heap은 임의 위치 + 명시 free, arena는 bump + bulk free. small_vector는 *stack에 머무는 한* 할당 비용이 0이고, spill되는 순간 heap의 모든 비용을 전부 짊어진다.

## API & 사용법

`std::vector`와 같은 인터페이스 + template 파라미터.

```cpp
#include <folly/small_vector.h>

// 기본 — N개까지 inline
folly::small_vector<int, 8> v;

// pretty-print용 SmallVecPolicy
using Names = folly::small_vector<std::string, 4,
                                  folly::small_vector_policy::policy_in_situ_only<true>>;
// in_situ_only=true → heap 사용 불가, capacity 초과 시 throw

// LLVM 스타일 — heap 폴백 허용
folly::small_vector<int, 16> tokens;

// 사용
tokens.push_back(42);
tokens.emplace_back(7);
for (auto x : tokens) Use(x);
```

`policy_in_situ_only`로 *heap 자체를 금지*할 수 있다. 임베디드/no-heap 환경에서 유용. capacity 초과 시 `std::length_error`.

## 내부 구현

### Layout

![SmallVector inline vs heap](/images/blog/folly/diagrams/part8-01-small-vector-inline.svg)

```cpp
// 약식
template <typename T, size_t N>
class small_vector {
  union Storage {
    // inline (N개 만큼)
    alignas(T) std::byte inlineBuf[sizeof(T) * N];
    // 또는 heap
    struct {
      T*       data_;
      size_t   capacity_;
    } heap;
  } u_;

  size_t   size_ : sizeof(size_t)*8 - 1;
  size_t   isHeap_ : 1;
};
```

객체 크기는 `max(sizeof(T)*N, sizeof(T*) + sizeof(size_t))`. inline buffer를 사용 안 할 때는 heap pointer를 같은 union 영역에 저장.

`isHeap_`로 분기. inline에서 heap으로 전환 시 모든 원소를 새 heap 영역으로 move.

### Push back

```cpp
// 약식
void push_back(T v) {
  if (size_ < capacity()) {
    new (data() + size_) T(std::move(v));
    ++size_;
  } else {
    growAndPush(std::move(v));
  }
}

void growAndPush(T v) {
  size_t new_cap = capacity() * 2;
  T* new_data = static_cast<T*>(malloc(new_cap * sizeof(T)));
  // 모든 기존 원소 move
  for (size_t i = 0; i < size_; ++i) {
    new (new_data + i) T(std::move(data()[i]));
    data()[i].~T();
  }
  if (isHeap_) free(u_.heap.data_);
  u_.heap.data_ = new_data;
  u_.heap.capacity_ = new_cap;
  isHeap_ = 1;
  // push
  new (new_data + size_) T(std::move(v));
  ++size_;
}
```

inline → heap 전환은 한 번만 일어난다. 이후는 일반 `std::vector` grow와 동일.

### TriviallyRelocatable 최적화

T가 `folly::IsRelocatable`이면 element move를 `memcpy`로 대체.

```cpp
if constexpr (folly::is_trivially_relocatable_v<T>) {
  std::memcpy(new_data, old_data, size_ * sizeof(T));
  // destructor 호출 안 함 (relocate 의미)
} else {
  // move + destruct
}
```

primitive, POD, `unique_ptr` 등 대부분의 type이 이 path. push_back이 더 빠르다.

## 다른 라이브러리 비교

```cpp
// LLVM SmallVector
llvm::SmallVector<int, 4> llv;

// boost
boost::container::small_vector<int, 4> bv;
boost::container::static_vector<int, 4> sv;  // heap 금지

// abseil
absl::InlinedVector<int, 4> iv;

// std (C++23?)
// std::inplace_vector<T, N> — heap 없음, in-situ만
```

| 항목 | LLVM | boost::small | boost::static | absl::Inlined | folly::small_vector |
|------|------|---------------|----------------|---------------|-----------------------|
| Heap 폴백 | O | O | X | O | O (policy로 disable 가능) |
| 표준 vector 호환 | 대체로 | O | O | O | O |
| Relocate 최적화 | 일부 | O | O | O | O |
| ABI 안정 | LLVM 내부 | 좋음 | 좋음 | 비보장 | 비보장 |

기능 면에서는 다 비슷. fbcode는 자체 IsRelocatable trait과 다른 folly type과의 통합 때문에 folly variant 사용.

## 코드 리뷰 포인트

```cpp
// Bad — N이 너무 큼
folly::small_vector<int, 1024> v;   // sizeof = 4KB
// stack 폭발, 함수 인자 전달 비용 증가

// Good — 일반적 사용 size에 맞춤
folly::small_vector<int, 8> v;
```

inline N은 사용량의 *95th percentile*에 맞춘다. 너무 크면 stack/object 메모리 낭비, 너무 작으면 heap 폴백 빈번.

```cpp
// Good — 명시적 reserve로 inline 활용
folly::small_vector<std::string, 4> args;
args.reserve(args.size() + N);   // N≤4면 여전히 inline
```

`reserve(n)`이 inline capacity를 초과하면 즉시 heap으로 간다. *예측 가능한 capacity*면 그만큼 reserve.

```cpp
// 주의 — pointer/iterator 안정성
folly::small_vector<int, 4> v;
auto* p = &v[0];                 // inline buffer 안 포인터
v.push_back(...); v.push_back(...); ...
// inline → heap 전환 시 데이터 옮김, p invalid
```

`std::vector`보다 더 자주 invalidate. inline 안 포인터를 외부로 노출 금지.

## 안티패턴

- **return value로 큰 N의 small_vector**: NRVO가 동작해도 inline buffer copy 비용이 크다. `unique_ptr<small_vector>` 또는 일반 `std::vector` 반환.
- **`small_vector`를 map의 value로**: rehash 시 move하는데 inline buffer가 크면 비용 증가. `std::vector` 또는 작은 N.
- **`reserve` 후 inline 가정**: reserve가 inline N을 초과하면 무조건 heap. inline 보존 의도면 `if (n <= N) ...` 분기.

## 정리

- `folly::small_vector<T, N>`은 N개까지 inline, 초과 시 heap.
- 작은 vector의 heap 할당 제거가 목적.
- `IsRelocatable` 타입은 grow가 `memcpy` 최적화.
- `policy_in_situ_only`로 heap 금지 가능 (no-heap 환경).
- inline buffer 크기는 객체 sizeof에 영향 — N을 신중하게.

## 다음 편

`FixedString`은 compile-time에 알려진 문자열을 `constexpr`로 다룬다. SmallVector의 string 버전 + constexpr.

## 관련 항목

- [Part 8-02: FixedString](/blog/programming/code-review/folly/part8-02-fixed-string) — string 변형
- [Part 5-01: FBString](/blog/programming/code-review/folly/part5-01-fbstring) — heap 기반 string
- [Part 7-04: F14FastMap](/blog/programming/code-review/folly/part7-04-f14-fast-map) — Relocatable trait 같이 사용
- [원문 — folly/small_vector.h](https://github.com/facebook/folly/blob/main/folly/small_vector.h)
