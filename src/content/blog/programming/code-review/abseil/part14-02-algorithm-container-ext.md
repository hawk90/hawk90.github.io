---
title: "Part 14-02: algorithm container 확장 — c_sort, c_find_if, c_count_if"
date: 2026-05-26T02:00:00
description: "absl::c_* algorithm wrapper — container 전체를 받아 begin/end 자동 처리, STL algorithm의 한 줄 boilerplate를 제거."
series: "Abseil Code Review"
seriesOrder: 70
tags: [cpp, abseil, algorithm, container, ranges]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 한 줄 요약

`absl::c_*` 함수군은 STL algorithm의 *container 받는 버전*이다. `std::sort(v.begin(), v.end())` 대신 `absl::c_sort(v)`로 적는다. C++20 `std::ranges`의 사전 버전에 해당하며 C++17 이하 빌드에서 동일한 효용을 제공한다.

## 동기

STL algorithm은 iterator 두 개를 받는다. 의도는 "container 일부에도 적용할 수 있어야 한다"이지만 실제 사용의 95%는 container 전체다.

```cpp
// 회피 — boilerplate 반복
std::sort(v.begin(), v.end());
auto it = std::find_if(v.begin(), v.end(), pred);
int n = std::count_if(v.begin(), v.end(), pred);
std::transform(v.begin(), v.end(), out.begin(), fn);
```

`v.begin(), v.end()`는 글자 수도 늘리고 타이포 위험도 만든다. `v1.begin(), v2.end()`처럼 *서로 다른 container의 begin/end를 섞는* 버그가 실제로 발생한다.

`absl::c_*`은 container 한 개를 받아 `begin/end`를 자동으로 풀어 준다.

```cpp
// Good
absl::c_sort(v);
auto it = absl::c_find_if(v, pred);
int n = absl::c_count_if(v, pred);
absl::c_transform(v, out.begin(), fn);
```

## API와 사용법

대부분의 `<algorithm>` 함수에 `c_` 접두사 버전이 있다.

```cpp
#include "absl/algorithm/container.h"

// 정렬
absl::c_sort(v);
absl::c_sort(v, std::greater<>());
absl::c_stable_sort(v);

// 검색
auto it = absl::c_find(v, target);
auto it2 = absl::c_find_if(v, [](int x) { return x > 10; });
bool yes = absl::c_any_of(v, IsPositive);
bool all = absl::c_all_of(v, IsPositive);
bool none = absl::c_none_of(v, IsNegative);

// 카운트
int n = absl::c_count(v, target);
int m = absl::c_count_if(v, IsPositive);

// 변형
absl::c_transform(v, out.begin(), [](int x) { return x * 2; });
absl::c_copy(src, std::back_inserter(dst));
absl::c_copy_if(src, std::back_inserter(dst), pred);
absl::c_fill(v, 0);

// 집계
int sum = absl::c_accumulate(v, 0);
int prod = absl::c_accumulate(v, 1, std::multiplies<>());

// set 연산
std::vector<int> out;
absl::c_set_intersection(a, b, std::back_inserter(out));
absl::c_set_union(a, b, std::back_inserter(out));

// 순서·정렬 확인
bool sorted = absl::c_is_sorted(v);
absl::c_reverse(v);
absl::c_unique(v);   // 정렬된 container에서 인접 중복 제거
```

## 내부 구현

`absl/algorithm/container.h`의 구현은 *얇은 어댑터*다.

```cpp
namespace absl {

template <typename C>
void c_sort(C& c) {
  std::sort(container_algorithm_internal::c_begin(c),
            container_algorithm_internal::c_end(c));
}

template <typename C, typename Compare>
void c_sort(C& c, Compare&& comp) {
  std::sort(container_algorithm_internal::c_begin(c),
            container_algorithm_internal::c_end(c),
            std::forward<Compare>(comp));
}

template <typename C, typename Pred>
typename container_algorithm_internal::ContainerIter<C> c_find_if(C& c, Pred&& pred) {
  return std::find_if(container_algorithm_internal::c_begin(c),
                      container_algorithm_internal::c_end(c),
                      std::forward<Pred>(pred));
}

}  // namespace absl
```

`c_begin`/`c_end`는 `std::begin`/`std::end`의 ADL-safe wrapper다. `C-style array`도 그대로 받는다.

```cpp
int arr[5] = {3, 1, 4, 1, 5};
absl::c_sort(arr);   // OK — C 배열도 동작
```

오버헤드는 없다. inline 호출 한 번이 컴파일러에 의해 사라진다.

## std::ranges와의 비교

C++20 `std::ranges`는 동일한 컨셉을 표준으로 제공한다.

```cpp
// C++20 std::ranges
std::ranges::sort(v);
auto it = std::ranges::find_if(v, pred);
int n = std::ranges::count_if(v, pred);

// abseil
absl::c_sort(v);
auto it = absl::c_find_if(v, pred);
int n = absl::c_count_if(v, pred);
```

| 항목 | absl::c_* | std::ranges |
|---|---|---|
| C++ 표준 | — (C++14+ 동작) | C++20 |
| projection (`&Foo::id`) | × | O |
| sentinel(불일치 begin/end) | × | O |
| view·composition (`v \| filter`) | × | O |
| iterator concept | duck typing | 엄격 |
| 컴파일 오류 메시지 | 평이 | template + concept 폭발 |

`absl::c_*`은 *C++17 이하에서 ranges의 가장 일반적인 사용 케이스*를 메운다. C++20 빌드면 표준 ranges를 우선 검토하되, projection이나 view composition을 쓰지 않는다면 차이가 거의 없다. Google 내부 코드는 일관성 차원에서 `absl::c_*`을 유지한다.

## 코드 리뷰 포인트

**1. `v.begin(), v.end()` 보면 자동 치환 후보**

```cpp
// before
std::sort(v.begin(), v.end());
// after
absl::c_sort(v);
```

이 패턴은 거의 mechanical refactor다. C++20 ranges를 쓸 환경이면 그쪽으로 바로 가도 좋다.

**2. iterator를 명시적으로 들고 다닐 때는 그대로 두자**

```cpp
auto mid = v.begin() + v.size() / 2;
std::sort(v.begin(), mid);  // 부분 정렬 — c_sort로 줄일 수 없다
```

`c_*`은 container 전체용이다. 일부분만 다루면 STL을 그대로 쓴다.

**3. associative container 주의**

```cpp
absl::flat_hash_map<int, int> m;
absl::c_sort(m);  // 컴파일 에러 — hash map은 정렬 불가
```

`c_sort`/`c_unique`는 random-access iterator를 요구한다. 컴파일러가 잡아 주지만 에러 메시지가 길다.

**4. projection 필요하면 ranges**

```cpp
struct User { int id; std::string name; };
std::vector<User> users;

// c_*에서는 lambda 필요
absl::c_sort(users, [](const User& a, const User& b) { return a.id < b.id; });

// ranges는 projection 한 줄
std::ranges::sort(users, {}, &User::id);
```

projection이 자주 등장하는 코드라면 ranges가 더 짧다.

## 자주 보는 안티패턴

**서로 다른 container 섞기**

```cpp
// 회피 — STL이라면 컴파일은 되지만 UB 가능
std::sort(v1.begin(), v2.end());
```

`c_*`은 container 한 개만 받으므로 이 실수가 원천 차단된다. *그래서* `c_*`을 선호하는 이유 중 하나다.

**lambda 안에서 `it++` 오용**

```cpp
// 회피 — for 루프를 algorithm으로 위장
absl::c_for_each(v, [&](int x) {
  if (x == target) { /* break를 흉내내려 시도 */ }
});
```

`c_for_each`는 break가 없다. early exit이 필요하면 `c_any_of` / `c_find_if`가 옳다.

**`c_sort` 이후 binary_search 누락**

```cpp
absl::c_sort(v);
// 회피 — linear search
if (absl::c_find(v, x) != v.end()) { ... }

// Good — sorted vector면 binary
if (absl::c_binary_search(v, x)) { ... }
```

정렬 비용을 들였으면 검색도 binary로 받는다.

## 정리

- `absl::c_*`은 container 한 개를 받는 algorithm wrapper.
- `begin/end` 반복을 제거하고 *다른 container 섞기* 실수를 차단한다.
- 구현은 inline 어댑터로 런타임 오버헤드 0.
- C++20 ranges와 효용은 겹치지만 projection·view·sentinel은 ranges만의 영역.
- C++17 이하 또는 Google 일관성을 유지할 코드베이스에서 표준 도구.

## 다음 편

[Part 14-03 — function_ref와 any_invocable](/blog/programming/code-review/abseil/part14-03-function-ref-any-invocable)에서 함수 객체 전달의 두 축을 본다.

## 관련 항목

- [Part 14-03 — function_ref / any_invocable](/blog/programming/code-review/abseil/part14-03-function-ref-any-invocable)
- [Part 14-01 — Cleanup](/blog/programming/code-review/abseil/part14-01-cleanup)
- [Part 5-01 — flat_hash_map](/blog/programming/code-review/abseil/part5-01-flat-hash-map)
- [Folly Part 8-01 — small_vector](/blog/programming/code-review/folly/part8-01-small-vector)
- [Tip of the Week #152: AbslHashValue](https://abseil.io/tips/152)
