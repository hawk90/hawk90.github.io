---
title: "absl::StrJoin — 컨테이너 결합과 Formatter"
date: 2026-06-10T09:07:00
description: "Part 4-05: absl::StrJoin — 임의 컨테이너를 구분자로 합치기, Formatter 커스터마이즈, PairFormatter / DereferenceFormatter."
series: "Abseil Code Review"
seriesOrder: 23
tags: [cpp, abseil, strings, strjoin, container]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true
---

## 한 줄 요약

`absl::StrJoin`은 *임의 컨테이너*를 *임의 변환*으로 *한 구분자*로 합치는 표현식이다. 기본 변환은 `AlphaNum` 호환이고, Formatter를 지정하면 원소를 임의 string으로 직렬화할 수 있다.

## 동기

문자열 join은 `StrSplit`의 거울이다. log 한 줄, SQL `IN (...)`, URL 쿼리스트링, CSV row 등 컨테이너를 텍스트로 묶는 일은 흔하다.

```cpp
// 회피 — 매 iteration alloc + 마지막 구분자 처리
std::string r;
for (size_t i = 0; i < parts.size(); ++i) {
  if (i > 0) r += ",";
  r += parts[i];
}
```

`StrJoin`은 한 번의 alloc과 일관된 구분자 처리를 보장한다.

## API와 사용법

```cpp
#include "absl/strings/str_join.h"

namespace absl {
template <typename Container>
std::string StrJoin(const Container& c, string_view sep);

template <typename Container, typename Formatter>
std::string StrJoin(const Container& c, string_view sep, Formatter f);

template <typename Iter>
std::string StrJoin(Iter first, Iter last, string_view sep);
}
```

기본 사용.

```cpp
std::vector<std::string> v = {"a","b","c"};
std::string s = absl::StrJoin(v, ", ");          // "a, b, c"

std::vector<int> ns = {1,2,3};
std::string s2 = absl::StrJoin(ns, "-");          // "1-2-3" (AlphaNum)

std::set<int> uniq = {3,1,4,1,5};
std::string s3 = absl::StrJoin(uniq, ",");        // "1,3,4,5" (정렬)

int arr[] = {10,20,30};
std::string s4 = absl::StrJoin(arr, "|");         // "10|20|30"
```

원소가 정수/부동소수점/string_view 같은 `AlphaNum` 호환 타입이면 별도 Formatter가 필요 없다.

## Formatter — 사용자 정의 직렬화

원소가 사용자 구조체이거나 특수 포맷이 필요하면 Formatter를 넘긴다. 시그니처는 `void(std::string* out, const T& v)`다.

```cpp
struct User { int64_t id; std::string name; };
std::vector<User> users = {{1,"Alice"}, {2,"Bob"}};

std::string s = absl::StrJoin(users, ", ",
    [](std::string* out, const User& u) {
      absl::StrAppend(out, u.name, "(", u.id, ")");
    });
// "Alice(1), Bob(2)"
```

핵심은 *appender*다. 새 string을 *반환*하지 않고, 주어진 `out`에 `StrAppend`로 쓴다. 이로써 결과 버퍼는 한 번만 만들어진다.

## 기본 제공 Formatter

```cpp
absl::AlphaNumFormatter()      // 기본 (생략 시 사용)
absl::PairFormatter("=")       // pair를 "k=v" 형식으로
absl::DereferenceFormatter()   // 포인터/optional 역참조
absl::StreamFormatter()        // ostream operator<< 호출
```

```cpp
// map → "k1=v1, k2=v2"
absl::flat_hash_map<std::string,int> m = {{"a",1},{"b",2}};
std::string s = absl::StrJoin(m, ", ", absl::PairFormatter("="));

// 포인터 컨테이너
std::vector<std::unique_ptr<User>> ptrs = /*...*/;
std::string s2 = absl::StrJoin(ptrs, ", ", absl::DereferenceFormatter(
    [](std::string* out, const User& u) {
      absl::StrAppend(out, u.name);
    }));
```

## 내부 구현

`StrJoin`은 두 단계로 동작한다.

```cpp
// absl/strings/str_join.h (요약)
template <typename Container, typename Formatter>
std::string JoinAlgorithm(const Container& c, string_view sep, Formatter f) {
  std::string result;
  auto it = c.begin();
  if (it != c.end()) {
    f(&result, *it);
    ++it;
    for (; it != c.end(); ++it) {
      result.append(sep.data(), sep.size());
      f(&result, *it);
    }
  }
  return result;
}
```

원소를 미리 string으로 만들지 않는다. 매 step마다 Formatter가 `result`에 직접 append한다. 따라서 임시 string 객체가 생기지 않는다.

문자열 미리 합계 길이를 계산하지는 않는다(원소 string 길이를 알기 어렵기 때문). 대신 `std::string::append`의 amortized 재할당이 처리한다. `result.reserve(estimate)`를 미리 호출하면 더 좋다.

## std::string 비교

C++에는 표준 join이 없다. `std::accumulate`로 흉내낼 수 있으나 매번 임시 string을 만들거나 첫 구분자 처리를 수동으로 해야 한다. `<ranges>`의 `views::join_with`는 C++23부터.

## 코드 리뷰 포인트

**1. 수동 join 루프 → StrJoin**

```cpp
// 회피
std::string ids;
for (size_t i = 0; i < users.size(); ++i) {
  if (i > 0) ids += ",";
  ids += absl::StrCat(users[i].id);
}

// Good
std::string ids = absl::StrJoin(users, ",",
    [](std::string* out, const User& u) {
      absl::StrAppend(out, u.id);
    });
```

**2. SQL IN-clause 생성**

```cpp
std::string clause = absl::StrCat(
    "WHERE user_id IN (",
    absl::StrJoin(user_ids, ","),
    ")");
```

값에 따옴표가 필요하면 Formatter로 감싼다.

```cpp
auto quote = [](std::string* out, const std::string& s) {
  absl::StrAppend(out, "'", s, "'");  // 실제 SQL은 escape 필요
};
absl::StrJoin(names, ",", quote);
```

(실제 SQL에는 escape/parameterized query를 써야 한다. 데모용.)

**3. URL query string**

```cpp
absl::flat_hash_map<std::string, std::string> params = {/*...*/};
std::string q = absl::StrJoin(params, "&",
    [](std::string* out, const auto& kv) {
      absl::StrAppend(out, kv.first, "=", kv.second);
    });
```

`absl::WebSafeBase64Escape`를 적용해야 한다면 [Part 4-08](/blog/programming/code-review/abseil/part4-08-escaping-base64) 참조.

## 안티패턴

**Formatter에서 새 string 반환**

```cpp
// 회피 — 매 호출 alloc
auto bad = [](const User& u) -> std::string {
  return absl::StrCat(u.name, "(", u.id, ")");
};
absl::StrJoin(users, ", ", [&](std::string* out, const User& u) {
  *out += bad(u);  // 임시 string alloc
});

// Good
auto good = [](std::string* out, const User& u) {
  absl::StrAppend(out, u.name, "(", u.id, ")");
};
```

appender 시그니처를 정확히 따른다.

**huge container without reserve**

수십만 개 원소면 `result.reserve(approx)`를 미리 호출해 재할당을 줄인다.

## 정리

- `StrJoin`은 임의 컨테이너 + 임의 변환 + 단일 구분자.
- Formatter는 `void(std::string*, const T&)` appender. 새 string 반환 X.
- `PairFormatter`, `DereferenceFormatter` 등 기본 제공.
- map, set, vector, 배열, iterator 범위 모두 동일 인터페이스.
- 큰 컨테이너는 `reserve`로 재할당 절감.

## 다음 편

[Part 4-06 — StrFormat](/blog/programming/code-review/abseil/part4-06-str-format)에서 printf 호환 type-safe 포맷팅을 본다.

## 관련 항목

- [Part 4-03 — StrCat](/blog/programming/code-review/abseil/part4-03-str-cat)
- [Part 4-04 — StrSplit](/blog/programming/code-review/abseil/part4-04-str-split)
- [Part 4-06 — StrFormat](/blog/programming/code-review/abseil/part4-06-str-format)
- [Tip of the Week #36: StrJoin](https://abseil.io/tips/36)
