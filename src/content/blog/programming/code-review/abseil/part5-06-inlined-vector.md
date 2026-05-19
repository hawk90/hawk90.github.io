---
title: "Part 5-06: InlinedVector — small buffer optimization"
date: 2026-05-24T09:00:00
description: "Part 5-06: absl::InlinedVector — std::vector + 작으면 stack, 커지면 heap. SBO 패턴의 표준 도구."
series: "Abseil Code Review"
seriesOrder: 32
tags: [cpp, abseil, container, inlined-vector, sbo]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: false
---

## 한 줄 요약

`absl::InlinedVector<T, N>`은 N개까지는 **객체 내부 inline buffer**에 저장하고, 이를 넘으면 자동으로 heap으로 전환되는 vector다. `std::vector`의 인터페이스를 그대로 두면서 *흔한 작은 크기*에서 alloc을 피한다. small-buffer optimization(SBO)의 표준 구현.

## 동기

`std::vector`는 항상 heap을 쓴다. 빈 vector는 alloc이 없을 수 있지만 첫 push_back에서 alloc이 일어난다. 그러나 많은 워크로드의 vector는 *짧다*.

- HTTP 헤더 컬렉션 (대부분 ~10개)
- 함수 인자 리스트 (대부분 ~4개)
- DOM tree의 children (대부분 ~0~3개)
- log entry의 fields (대부분 ~5개)

`FixedArray`는 크기 변경이 안 된다. `vector`는 alloc이 강제다. 그 사이가 `InlinedVector`다.

작은 경우와 큰 경우의 저장 위치를 그림으로 보면 다음과 같다.

![InlinedVector 인라인 vs 힙](/images/blog/abseil/diagrams/part5-06-inlined-vector-soo.svg)

```cpp
absl::InlinedVector<int, 4> v;
v.push_back(1); v.push_back(2); v.push_back(3);
// 여기까지 alloc 없음 — inline buffer 안

v.push_back(4); v.push_back(5);
// 5번째에서 heap 전환
```

## API와 사용법

```cpp
#include "absl/container/inlined_vector.h"

namespace absl {
template <typename T, size_t N, typename A = std::allocator<T>>
class InlinedVector {
 public:
  // std::vector와 동일 인터페이스 (대부분)
  void push_back(const T& v);
  void push_back(T&& v);
  template <typename... Args> void emplace_back(Args&&... args);
  void pop_back();
  iterator insert(const_iterator pos, const T& v);
  iterator erase(const_iterator pos);
  void clear();
  void resize(size_t n);
  void reserve(size_t n);

  T& operator[](size_t i);
  T* data();
  size_t size() const;
  size_t capacity() const;
  bool empty() const;
};
}
```

`std::vector`의 drop-in 가까운 인터페이스. 대부분의 코드 변경은 typedef 하나.

```cpp
// before
std::vector<int> v;
// after
absl::InlinedVector<int, 4> v;
```

## 내부 구현

`InlinedVector`는 union으로 두 상태를 표현한다.

```cpp
// absl/container/inlined_vector.h (요약, internal 구조)
template <typename T, size_t N, typename A>
class InlinedVector {
  union Storage {
    struct {
      T* data;
      size_t capacity;
    } heap;
    alignas(T) char inline_[N * sizeof(T)];
  };

  Storage storage_;
  size_t size_;
  bool is_inline_;   // 실제로는 tag bit가 size_/capacity에 packed
};
```

`is_inline_`이 true면 `inline_` buffer 사용, false면 `heap.data`. 객체의 sizeof는 다음과 같다.

- N = 4, T = int: ~24 바이트 (inline 4*4 + size + tag).
- inline buffer가 클수록 객체 자체가 커진다.

heap 전환은 `capacity()`가 `N`을 초과할 때 일어난다. 한 번 heap이 되면 다시 inline으로 돌아가지 않는다.

```cpp
v.reserve(100);   // heap 전환
v.clear();        // size=0, 그러나 여전히 heap
v.shrink_to_fit();// heap 해제, inline으로 복귀 (size ≤ N이면)
```

## std::vector / FixedArray 비교

| 항목 | std::vector | FixedArray | InlinedVector |
|---|---|---|---|
| 크기 변경 | O | X | O |
| 첫 alloc | 첫 push 시 | 생성 시 (큰 N) | 크기 초과 시 |
| 작은 경우 alloc | 1회 | 0 | 0 |
| 객체 sizeof | 3 포인터 | N*sizeof(T) + 헤더 | N*sizeof(T) + 헤더 |
| std API 호환 | full | 부분 (resize 없음) | 대부분 |

## 코드 리뷰 포인트

**1. push_back 평균이 작은 vector**

profiling으로 평균 크기가 N 이하인 vector를 식별 → `InlinedVector<T, N>`. 작은 워크로드에서 alloc을 0으로 만든다.

```cpp
// 회피
std::vector<Field> fields;
for (...) fields.push_back(...);   // 대부분 alloc

// Good
absl::InlinedVector<Field, 8> fields;
for (...) fields.push_back(...);   // 8개 이하면 alloc 0
```

**2. struct 멤버**

```cpp
struct HttpRequest {
  // 대부분 헤더가 ~10개
  absl::InlinedVector<Header, 12> headers;
};
```

객체 자체가 커지는 트레이드오프. `sizeof(HttpRequest)`가 늘어나니 cache 영향 인지.

**3. 매개변수 전달**

`InlinedVector`는 *복사 가능*하나 *이동 비용이 N에 비례*한다. 큰 N + 자주 이동이면 비효율적.

```cpp
// 회피 — N=64 + 함수 호출마다 이동
void Process(absl::InlinedVector<int, 64> v);

// Good
void Process(absl::Span<const int> v);   // view로 받기
```

## 안티패턴

**너무 큰 N**

```cpp
absl::InlinedVector<BigStruct, 100> v;
// sizeof(v) ≥ 100 * sizeof(BigStruct)
// vector를 멤버로 갖는 객체가 모두 커진다
```

inline buffer는 객체 sizeof에 직접 들어간다. N은 *흔한 작은 크기*로.

**heap 전환 후 빈번 clear**

```cpp
absl::InlinedVector<int, 4> v;
v.reserve(1000);   // heap
for (...) {
  v.clear();       // size=0이지만 capacity=1000 (heap)
  // 사용
}
```

inline 복귀 의도라면 `shrink_to_fit`. 그러나 매번 `shrink_to_fit`이 빈번한 alloc/dealloc을 부른다. 패턴을 다시 본다.

**move semantics 가정**

`std::vector` move는 포인터 swap이라 O(1)이다. `InlinedVector`가 *inline 상태*에서 move하면 각 원소를 개별 move해야 한다 — O(N). hot path move가 잦으면 신중히.

## 정리

- `InlinedVector<T, N>`은 N 이하면 inline buffer, 초과면 heap.
- `std::vector` 인터페이스 호환.
- 평균 크기가 작은 vector의 alloc을 0으로 줄인다.
- 객체 sizeof가 inline buffer만큼 커진다.
- 큰 N + 자주 move는 비효율.

## 다음 편

[Part 5-07 — Swiss Table internals](/blog/programming/code-review/abseil/part5-07-swiss-table-internals)에서 `flat_hash_map`/`flat_hash_set`의 내부 구현을 자세히 본다.

## 관련 항목

- [Part 5-05 — FixedArray](/blog/programming/code-review/abseil/part5-05-fixed-array)
- [Part 5-07 — Swiss Table internals](/blog/programming/code-review/abseil/part5-07-swiss-table-internals)
- [Folly Part 8-x — small_vector](/blog/programming/code-review/folly) — Meta의 유사 컨테이너
