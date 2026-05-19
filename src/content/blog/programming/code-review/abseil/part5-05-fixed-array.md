---
title: "Part 5-05: FixedArray — 런타임 크기를 가진 stack 배열"
date: 2026-05-24T08:00:00
description: "Part 5-05: absl::FixedArray — 런타임 결정 크기지만 작으면 stack, 크면 heap. VLA의 안전한 대체."
series: "Abseil Code Review"
seriesOrder: 31
tags: [cpp, abseil, container, fixed-array, stack]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: false
---

## 한 줄 요약

`absl::FixedArray<T, N>`은 *생성 시점 크기*는 결정되지만 *그 이후 변경되지 않는* 배열이다. 임계값 N 이하면 **stack**에 inline 저장, 초과하면 **heap**으로. C99 VLA(variable-length array)의 안전한 C++ 대체이며, `std::vector`의 자동 alloc을 피하고 싶은 짧은 수명 버퍼에 적합하다.

## 동기

함수 안에서 임시 버퍼가 필요한데 크기가 런타임에 결정되는 경우가 흔하다.

```cpp
void Process(absl::string_view input) {
  std::vector<char> buf(input.size());  // 항상 heap alloc
  // 버퍼 사용
}
```

대부분의 입력이 짧다면 매 호출마다 alloc이 발생하는 것은 낭비다. `alloca` 또는 C99 VLA로 stack 할당을 시도할 수도 있지만 둘 다 안전 문제가 있다 — 큰 크기에서 stack overflow.

`FixedArray`는 *크기에 따라 분기*한다. 작으면 stack, 크면 heap.

```cpp
void Process(absl::string_view input) {
  absl::FixedArray<char, 256> buf(input.size());
  // input.size() ≤ 256이면 stack, 아니면 heap
}
```

두 경우의 메모리 배치를 그림으로 보면 다음과 같다.

![FixedArray stack vs heap](/images/blog/abseil/diagrams/part5-05-fixed-array-stack.svg)

## API와 사용법

```cpp
#include "absl/container/fixed_array.h"

namespace absl {
template <typename T, size_t N = inline_default, typename A = std::allocator<T>>
class FixedArray {
 public:
  explicit FixedArray(size_t n);
  FixedArray(size_t n, const T& fill);
  FixedArray(std::initializer_list<T> init);
  template <typename Iter> FixedArray(Iter first, Iter last);

  T& operator[](size_t i);
  T& at(size_t i);
  T* data();
  size_t size() const;
  bool empty() const;
  T* begin(); T* end();
  // ...
};
}
```

크기는 생성 시 한 번 결정된다. resize, push_back, insert는 없다.

```cpp
absl::FixedArray<int, 16> a(n);              // 0으로 초기화되지 않음 (trivial T)
absl::FixedArray<int, 16> b(n, 0);           // 0으로 채움
absl::FixedArray<int, 16> c{1, 2, 3, 4};     // 4 원소

for (int& x : a) x = compute();
```

## inline 임계값 N

기본 N은 `kInlineBytesDefault`(헤더에 정의)를 `sizeof(T)`로 나눈 값. 보통 inline 저장 공간이 256바이트 정도다. 명시적으로 지정 가능.

```cpp
// 64개까지 stack
absl::FixedArray<int, 64> a(n);

// 0개 — 항상 heap
absl::FixedArray<int, 0> b(n);
```

N=0으로 명시하면 항상 heap. `std::vector`와 비슷하나, 크기 고정이 명시되는 장점.

## 내부 구현

`FixedArray`는 union 같은 구조다.

```cpp
// absl/container/fixed_array.h (요약)
template <typename T, size_t N, typename A>
class FixedArray {
  size_t size_;
  T* data_;

  union {
    char inline_storage_[N * sizeof(T)];
    // heap-alloc 시 사용하지 않음
  };

 public:
  explicit FixedArray(size_t n) : size_(n) {
    if (n <= N) {
      data_ = reinterpret_cast<T*>(inline_storage_);
    } else {
      data_ = AllocateHeap(n);
    }
    ConstructDefault(data_, n);
  }

  ~FixedArray() {
    DestroyAll();
    if (size_ > N) DeallocateHeap();
  }
};
```

`data_`가 inline buffer 또는 heap을 가리킨다. 사용 쪽은 분기 인지 없이 `data()`, `operator[]`로 접근한다.

stack 할당이라도 *생성자에서 T를 초기화*한다. trivial T는 비초기화 옵션이 있지만, 일반적으로 호출 분기 시 명시 초기화 자리에 채우는 패턴.

## std::vector / std::array 비교

| 항목 | std::array | std::vector | absl::FixedArray |
|---|---|---|---|
| 크기 결정 | compile time | runtime | runtime |
| 크기 변경 | X | O | X |
| storage | stack | heap | stack(if ≤N) / heap |
| alloc-free fast path | O | X | O |
| 초기화 강제 | X (uninit OK) | O (zero) | trivial은 uninit, non-trivial은 default |

`std::array`는 크기가 컴파일 타임. `std::vector`는 항상 heap. `FixedArray`는 그 사이.

## 코드 리뷰 포인트

**1. 짧은 임시 버퍼**

```cpp
// 회피 — 매 호출 heap alloc
void Encode(absl::string_view in, std::string* out) {
  std::vector<char> tmp(in.size() * 2);
  // ...
}

// Good
void Encode(absl::string_view in, std::string* out) {
  absl::FixedArray<char, 1024> tmp(in.size() * 2);
  // 대부분 입력에서 stack 사용
}
```

**2. fanout 버퍼**

```cpp
// N개 worker로 분배
void Dispatch(const Task& t, size_t worker_count) {
  absl::FixedArray<TaskPart, 16> parts(worker_count);
  for (size_t i = 0; i < worker_count; ++i) {
    parts[i] = MakePart(t, i, worker_count);
  }
  // 보통 worker_count ≤ 16, stack 경로
}
```

**3. C API의 out 버퍼**

```cpp
ssize_t needed = some_c_function(nullptr, 0);
absl::FixedArray<char, 256> buf(needed);
some_c_function(buf.data(), needed);
```

작은 경우 stack, 큰 경우 heap. VLA보다 안전.

## 안티패턴

**resize 가정**

`FixedArray`는 resize/push_back이 없다. 크기 변경이 필요하면 `std::vector` 또는 `absl::InlinedVector` ([Part 5-06](/blog/programming/code-review/abseil/part5-06-inlined-vector)).

**과도하게 큰 N**

```cpp
absl::FixedArray<int, 100000> a(n);   // sizeof(FixedArray) ≥ 400 KB
```

stack frame이 400KB 이상이 된다. 깊은 호출 stack에서 위험. N은 *대부분 입력이 들어가는 작은 값*으로.

**stack overflow 가능성 인지 부족**

```cpp
absl::FixedArray<int, 256> a(n);
// n이 256 이하면 stack
// 그런데 sizeof(int)*256 = 1KB가 매 호출 stack 사용
// 재귀 함수면 깊이 1000에서 1MB
```

`FixedArray`도 stack frame을 차지한다. 재귀나 깊은 호출 안에서는 신중히.

## 정리

- `FixedArray<T, N>`은 *생성 시 결정, 이후 고정* 크기 배열.
- 크기 ≤ N이면 stack, 초과면 heap.
- VLA의 안전한 C++ 대체. resize 없음.
- 짧은 임시 버퍼, fanout, C API 버퍼에 적합.
- N은 *흔한 입력*이 들어가는 작은 값으로.

## 다음 편

[Part 5-06 — InlinedVector](/blog/programming/code-review/abseil/part5-06-inlined-vector)에서 크기 변경이 가능한 small-buffer optimization 버전을 본다.

## 관련 항목

- [Part 5-06 — InlinedVector](/blog/programming/code-review/abseil/part5-06-inlined-vector)
- [Part 5-01 — flat_hash_map](/blog/programming/code-review/abseil/part5-01-flat-hash-map)
