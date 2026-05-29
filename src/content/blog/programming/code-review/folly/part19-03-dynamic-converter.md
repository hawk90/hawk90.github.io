---
title: "Part 19-03: DynamicConverter — dynamic ↔ struct"
date: 2026-05-28T06:00:00
description: "DynamicConverter의 역할 — folly::dynamic과 user struct 사이 boilerplate 없는 양방향 변환."
series: "Folly Code Review"
seriesOrder: 82
tags: [cpp, folly, dynamic, converter, json]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `DynamicConverter`는 `folly::dynamic`과 사용자 struct 사이를 변환하는 traits 기반 framework다. JSON → struct, struct → JSON을 boilerplate 없이 처리하기 위해 만들어졌다.

## 동기

JSON ↔ struct 변환을 직접 짜면 매번 같은 boilerplate가 쌓인다.

```cpp
struct User {
  std::string name;
  int         age;
  std::vector<std::string> emails;
};

User FromDynamic(const folly::dynamic& d) {
  User u;
  u.name = d["name"].asString();
  u.age  = d["age"].asInt();
  for (const auto& e : d["emails"]) u.emails.push_back(e.asString());
  return u;
}

folly::dynamic ToDynamic(const User& u) {
  auto d = folly::dynamic::object;
  d["name"] = u.name;
  d["age"]  = u.age;
  d["emails"] = folly::dynamic::array;
  for (const auto& e : u.emails) d["emails"].push_back(e);
  return d;
}
```

50% 코드가 "필드를 베껴라". 더구나 nested struct, optional, variant 등이 등장하면 폭발.

`DynamicConverter`는 *traits 특수화*로 변환 규칙을 등록하면 `folly::convertTo<T>(dyn)` / `folly::toDynamic(obj)` 한 줄로 끝난다.

```cpp
auto u = folly::convertTo<User>(d);
auto d = folly::toDynamic(u);
```

조건: User의 변환 규칙을 *어딘가에 한 번* 정의해야.

## API

```cpp
#include <folly/DynamicConverter.h>

// built-in 타입은 즉시 변환
folly::dynamic d = 42;
int i = folly::convertTo<int>(d);   // 42

folly::dynamic arr = folly::dynamic::array(1, 2, 3);
std::vector<int> v = folly::convertTo<std::vector<int>>(arr);   // [1,2,3]

folly::dynamic obj = folly::dynamic::object("a", 1)("b", 2);
std::map<std::string, int> m = folly::convertTo<std::map<std::string, int>>(obj);
```

기본적으로 `int`, `double`, `string`, `vector`, `map`, `set`, `pair`, `tuple` 같은 STL 타입이 지원된다.

### 사용자 타입 등록

```cpp
struct Point {
  int x, y;
};

namespace folly {

template <>
struct DynamicConverter<Point> {
  static Point convert(const dynamic& d) {
    return Point{
      convertTo<int>(d["x"]),
      convertTo<int>(d["y"]),
    };
  }
};

template <>
struct DynamicConstructor<Point> {
  static dynamic construct(const Point& p) {
    return dynamic::object("x", p.x)("y", p.y);
  }
};

}

void Use() {
  Point p{3, 4};
  auto d = folly::toDynamic(p);
  auto p2 = folly::convertTo<Point>(d);
}
```

두 traits.

- `DynamicConverter<T>::convert(const dynamic&)` — dynamic → T.
- `DynamicConstructor<T>::construct(const T&)` — T → dynamic.

`convertTo<T>(d)`와 `toDynamic(obj)`는 각각 이 traits를 호출.

## Nested 타입 자동 처리

```cpp
struct Address { std::string city; int zip; };
struct User    { std::string name; Address addr; };

// Address, User 모두 traits 정의됐다면
auto d = folly::toDynamic(user);
auto u2 = folly::convertTo<User>(d);
```

Address가 등록되면 User의 `addr` 필드도 자동 변환. `convertTo<User>`가 내부에서 `convertTo<Address>`를 호출.

`std::vector<User>`, `std::map<std::string, User>` 같은 컨테이너도 traits 합성으로 처리.

## 내부 구현

```cpp
// folly/DynamicConverter.h 약식
template <class T>
struct DynamicConverter {
  static T convert(const dynamic& d) {
    return T(d);  // default — T가 dynamic 받는 생성자가 있으면
  }
};

// vector 부분 특수화
template <class T>
struct DynamicConverter<std::vector<T>> {
  static std::vector<T> convert(const dynamic& d) {
    std::vector<T> out;
    out.reserve(d.size());
    for (const auto& e : d) {
      out.push_back(convertTo<T>(e));   // 재귀
    }
    return out;
  }
};

template <class K, class V>
struct DynamicConverter<std::map<K, V>> {
  static std::map<K, V> convert(const dynamic& d) {
    std::map<K, V> out;
    for (const auto& kv : d.items()) {
      out.emplace(convertTo<K>(kv.first), convertTo<V>(kv.second));
    }
    return out;
  }
};

// 사용자가 특수화하는 자리
// template <> struct DynamicConverter<MyType> { ... };
```

핵심 idea는 *컨테이너 trait + element trait의 재귀 합성*. Boost.Hana나 reflection 라이브러리와 같은 모델.

## Optional / Variant

```cpp
template <class T>
struct DynamicConverter<std::optional<T>> {
  static std::optional<T> convert(const dynamic& d) {
    if (d.isNull()) return std::nullopt;
    return convertTo<T>(d);
  }
};
```

`optional`은 *null*이면 `nullopt`, 아니면 inner T 변환. `null` 처리가 명시적.

`variant`는 어떤 alternative인지 추론이 필요해 사용자가 직접 traits를 짜야 한다.

## std와의 비교

| 항목 | std (없음) | folly::DynamicConverter | nlohmann::json | Boost.PFR |
|------|------------|--------------------------|-----------------|--------------|
| JSON 인터페이스 | N/A | folly::dynamic | 자체 json | N/A |
| 사용자 타입 | N/A | traits 특수화 | ADL (from_json/to_json) | 자동 reflection (구조체만) |
| boilerplate | N/A | traits 한 번 | from_json/to_json 한 번 | 0 (자동) |
| optional/variant | N/A | optional 자동 | optional 자동 | 어려움 |
| 표준 | N/A | folly | 외부 | 외부 |

`nlohmann::json`은 ADL 기반이라 더 친숙. `folly::DynamicConverter`는 fbcode 내부 dynamic 생태계에 맞춰진 형태. *기능은 비슷*.

Boost.PFR (Precise Reflection)은 단순 구조체에 한해 *자동* 변환 (C++26 reflection의 미리보기). 복잡한 타입은 traits가 여전히 필요.

## 실전 — config struct

```cpp
struct ServerConfig {
  std::string host;
  int port;
  std::vector<std::string> allowedOrigins;
  std::map<std::string, int> rateLimits;
};

namespace folly {
template <> struct DynamicConverter<ServerConfig> {
  static ServerConfig convert(const dynamic& d) {
    return ServerConfig{
      convertTo<std::string>(d["host"]),
      convertTo<int>(d["port"]),
      convertTo<std::vector<std::string>>(d["allowed_origins"]),
      convertTo<std::map<std::string, int>>(d["rate_limits"]),
    };
  }
};
}

void LoadConfig() {
  std::string text = ReadFile("config.json");
  auto d = folly::parseJson(text);
  auto cfg = folly::convertTo<ServerConfig>(d);
}
```

config 로딩 패턴. JSON → struct가 한 줄.

## 코드 리뷰 포인트

- 사용자 traits를 *같은 namespace*에 두지 않으면 ADL/특수화 매칭 실패.
- nested struct 변환이 매번 새 dynamic을 만들고 다시 변환 → 성능 hot path면 직접 처리.
- traits에 `noexcept`를 안 붙여 변환 실패 시 throw 흐름이 다를 수 있음.
- field 이름 typo는 *runtime 발견* (`d["hsot"]`이 null로 반환). reflection 없는 만큼 신중.
- C++23 reflection이 들어오면 traits boilerplate가 사라진다 — 미래 마이그레이션 가능성.

## 자주 보는 안티패턴

```cpp
// 1. dynamic→struct 변환을 매번 매뉴얼로
User FromDyn(const dynamic& d) { /* 10 라인 */ }
// → DynamicConverter traits로 한 번 정의 후 convertTo<User>(d)

// 2. dynamic을 멤버로 보관
struct Config {
  folly::dynamic raw;   // type-erased 채로 사용
};
// → struct로 변환 후 type-safe 사용이 옳음

// 3. dynamic 변환을 hot path에서 매번
for (auto& obj : list) {
  auto u = folly::convertTo<User>(obj);   // 매번 traits dispatch
  Process(u);
}
// → 가능하면 한 번에 vector<User>로 변환 후 iterate

// 4. field 누락 시 default 처리 안 함
auto port = convertTo<int>(d["port"]);   // port key 없으면 throw
// → optional 또는 d.getDefault("port", 8080) 명시
```

## 정리

- `DynamicConverter`는 dynamic ↔ struct 양방향 변환 traits framework.
- `convertTo<T>(d)`, `toDynamic(obj)` 한 줄로 사용.
- STL 컨테이너 자동, 사용자 타입은 traits 특수화 한 번.
- `optional` 자동, `variant`는 수동 traits.
- C++26 reflection이 들어오면 traits boilerplate가 줄어들 가능성.

## 다음 편

Part 20으로 넘어가 RecordIO, Compression, AsyncIO, CancellationToken을 본다.

## 관련 항목

- [Folly Part 11-01 — dynamic](/blog/programming/code-review/folly/part11-01-dynamic)
- [Folly Part 11-02 — JSON conversion](/blog/programming/code-review/folly/part11-02-json-conversion)
- [Folly Part 11-03 — dynamic ↔ struct](/blog/programming/code-review/folly/part11-03-dynamic-struct)
- [원문 — folly/DynamicConverter.h](https://github.com/facebook/folly/blob/main/folly/DynamicConverter.h)
