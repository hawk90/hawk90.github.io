---
title: "Part 11-03: Dynamic ↔ struct (manual marshaling)"
date: 2026-05-25T05:00:00
description: "Part 11-03: dynamic을 strongly-typed struct로. type safety boundary를 어디에 그을지, marshaling 패턴 비교."
series: "Folly Code Review"
seriesOrder: 51
tags: [cpp, folly, dynamic, struct, conversion]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::dynamic`은 외부 boundary 전용이고, 내부에서는 **strongly-typed struct**로 옮기는 게 정석이다. Folly 자체는 자동 reflection이 없으므로 **manual marshaling 함수**를 작성한다. 일관된 규칙(fromDynamic / toDynamic 정적 함수)을 세우면 보일러플레이트가 줄어든다.

## 동기 — type safety의 한계선

dynamic을 코드 깊숙이 흘려보내면 다음이 발생한다.

- 컴파일 타임에 키 오타가 안 잡힘 (`obj["nmae"]`).
- 타입 mismatch가 런타임 throw로만 잡힘.
- IDE/refactor 도구가 못 따라감.
- 성능: 모든 접근이 enum dispatch.

해법은 boundary에서 한 번 parse해서 struct로 넘기는 것이다. 이후는 모두 type-safe 코드.

```
[ JSON string ]
        ↓ parseJson
[ dynamic ]                  ← 여기까지가 boundary
        ↓ fromDynamic
[ User struct ]              ← 이후는 type-safe
        ↓ business logic
[ User struct ]
        ↓ toDynamic
[ dynamic ]
        ↓ toJson
[ JSON string ]
```

## 기본 패턴 — fromDynamic / toDynamic

```cpp
struct User {
  std::string name;
  int age;
  std::vector<std::string> roles;
};

User userFromDynamic(const folly::dynamic& d) {
  User u;
  u.name = d["name"].asString();
  u.age  = d["age"].asInt();
  for (const auto& r : d["roles"]) {
    u.roles.push_back(r.asString());
  }
  return u;
}

folly::dynamic userToDynamic(const User& u) {
  folly::dynamic arr = folly::dynamic::array;
  for (auto& r : u.roles) arr.push_back(r);
  return folly::dynamic::object
    ("name", u.name)
    ("age", u.age)
    ("roles", std::move(arr));
}
```

이게 가장 단순한 변환 패턴이다. 모든 struct에 대해 이 두 함수를 작성한다. 보일러플레이트지만 한 번 쓰면 모든 후속 코드가 type-safe.

## defensive parsing

외부 JSON은 신뢰할 수 없다. 각 필드에서 키 존재, 타입, 범위를 검증한다.

```cpp
folly::Expected<User, std::string> tryUserFromDynamic(const folly::dynamic& d) {
  if (!d.isObject()) return folly::makeUnexpected("not object");
  if (!d.count("name")) return folly::makeUnexpected("missing name");

  const auto& nameD = d["name"];
  if (!nameD.isString()) return folly::makeUnexpected("name not string");

  User u;
  u.name = nameD.getString();

  // age는 optional, default 0
  u.age = d.getDefault("age", 0).asInt();

  // roles는 optional, default []
  if (d.count("roles")) {
    if (!d["roles"].isArray()) return folly::makeUnexpected("roles not array");
    for (const auto& r : d["roles"]) {
      if (!r.isString()) return folly::makeUnexpected("role not string");
      u.roles.push_back(r.getString());
    }
  }
  return u;
}
```

`asInt`(coercion) 대신 `getInt`/`isInt`(strict)를 쓰면 silent type drift를 막을 수 있다.

## helper로 보일러플레이트 줄이기

```cpp
template <typename T>
T getOrThrow(const folly::dynamic& d, const std::string& key);

template <>
std::string getOrThrow(const folly::dynamic& d, const std::string& key) {
  if (!d.count(key)) throw std::runtime_error("missing: " + key);
  const auto& v = d[key];
  if (!v.isString()) throw std::runtime_error("type: " + key);
  return v.getString();
}

template <>
int64_t getOrThrow(const folly::dynamic& d, const std::string& key) {
  if (!d.count(key)) throw std::runtime_error("missing: " + key);
  const auto& v = d[key];
  if (!v.isInt()) throw std::runtime_error("type: " + key);
  return v.getInt();
}

// 사용
User u;
u.name = getOrThrow<std::string>(d, "name");
u.age  = getOrThrow<int64_t>(d, "age");
```

함수 한 개로 키 누락 + 타입 검사가 일관되게 처리된다.

## reflection 라이브러리

Meta 내부는 thrift가 자동 marshaling을 제공한다. 외부 코드는 다음 옵션.

- **boost::pfr** (C++17 reflection-like): aggregate struct에 대해 멤버 순회 가능. 키 이름은 따로 매핑 필요.
- **rfl** (reflectcpp): macro 없이 field 이름까지 가져오는 reflection.
- **macro 기반 등록** (`REFLECT(User, name, age, roles)`): nlohmann의 NLOHMANN_DEFINE_TYPE_INTRUSIVE.

Folly는 이 영역에 표준 솔루션을 두지 않는다. 큰 프로젝트면 reflection lib 도입을 검토, 작으면 manual이 명료하다.

## 코드 리뷰 포인트

### 1. boundary 명확히 한 곳에

```cpp
// 회피 — 여러 곳에서 dynamic ↔ struct 변환
void handlerA(folly::dynamic d) {
  auto u = parseUser(d);
  ...
}
void handlerB(folly::dynamic d) {
  // 또 parsing
}

// Good — boundary 한 군데
User parseUser(const folly::dynamic& d);  // 한 군데서 정의
void handlerA(const User& u);             // 이후는 struct만
void handlerB(const User& u);
```

변환은 한 함수에 모아 두면 검증·로깅·error mapping이 일관된다.

### 2. coercion vs strict

```cpp
// 회피 — 외부 JSON에 asInt
u.age = d["age"].asInt();   // "30"도 30으로 받아들임 (silent drift)

// Good — strict
if (!d["age"].isInt()) throw ...;
u.age = d["age"].getInt();
```

production에서는 strict가 디버깅을 쉽게 한다. coercion은 사람이 편집한 config 용도.

### 3. unknown field 처리

```cpp
// 옵션 1 — silent ignore (포워드 호환 위해)
auto u = parseUser(d); // d에 unknown 키 있어도 무시

// 옵션 2 — strict (오타 잡기 위해)
for (auto& k : d.keys()) {
  if (!known_keys.count(k.asString())) {
    throw "unknown key: " + k.asString();
  }
}
```

API 호환성 정책에 따라 선택. 일반 RPC는 silent ignore, internal config는 strict.

### 4. Optional 필드 명시

```cpp
struct User {
  std::string name;
  int age;
  std::optional<std::string> email; // optional
};

User parseUser(const folly::dynamic& d) {
  User u;
  u.name = getOrThrow<std::string>(d, "name");
  u.age  = getOrThrow<int64_t>(d, "age");
  if (d.count("email") && d["email"].isString()) {
    u.email = d["email"].getString();
  }
  return u;
}
```

dynamic에선 missing key가 nullptr type. struct에서는 `std::optional`로 명시.

## 안티패턴

### 1. dynamic을 함수 인자로 깊숙이 전달

```cpp
// 회피
void deepInnerLogic(folly::dynamic d) {
  // 5단계 깊은 곳에서도 d["x"]["y"] 접근
}
```

테스트 어렵고, 타입 미스매치가 늦게 드러남.

### 2. 매번 parsing

```cpp
// 회피 — 같은 dynamic을 반복 parsing
for (auto& req : requests) {
  auto u = parseUser(req.body); // 매번 throw 가능
  process(u);
}

// 변환 실패 처리 명확화
for (auto& req : requests) {
  auto userOrErr = tryParseUser(req.body);
  if (userOrErr.hasError()) { /* log */ continue; }
  process(*userOrErr);
}
```

`folly::Expected`로 변환을 감싸 부분 실패에 강하게.

### 3. struct → dynamic 후 다시 struct

```cpp
// 회피
auto d = userToDynamic(u);
auto u2 = userFromDynamic(d); // copy 의도면 그냥 auto u2 = u;
```

JSON round-trip은 비싸다 + 정보 손실 가능(double 정밀도, optional이 null vs missing 구분 등).

## 정리

- dynamic은 boundary에만, 내부는 struct로 변환.
- 각 struct마다 `fromDynamic`/`toDynamic` 한 쌍.
- 외부 JSON은 strict(`isInt`+`getInt`)로 검증, silent coercion 회피.
- `folly::Expected`로 변환 결과 wrap → 부분 실패 처리.
- Optional 필드는 `std::optional<T>`로 명시.
- 큰 코드베이스면 reflection lib(boost::pfr, rfl) 검토.

## 다음 편

[Part 11-04 Visitor pattern](/blog/programming/code-review/folly/part11-04-dynamic-visitor) — dynamic의 type별 분기를 `std::visit`처럼 처리하는 helper.

## 관련 항목

- [Part 11-01 folly::dynamic](/blog/programming/code-review/folly/part11-01-dynamic) — 타입 모델
- [Part 11-02 JSON conversion](/blog/programming/code-review/folly/part11-02-json-conversion) — string ↔ dynamic
- [Part 6-01 to / tryTo](/blog/programming/code-review/folly/part6-01-to-try-to) — 안전한 타입 변환의 일반 패턴
