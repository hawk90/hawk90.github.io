---
title: "folly::dynamic — JSON-like dynamic type 분석"
date: 2026-06-06T09:13:00
description: "Part 11-01: folly::dynamic — JSON-like 동적 타입. std::any와 무엇이 다른지, 왜 Meta는 별도 타입을 만들었는지."
series: "Folly Code Review"
seriesOrder: 49
tags: [cpp, folly, dynamic, json, type]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::dynamic`은 **JSON과 1:1 대응되는 동적 타입 컨테이너**다. null, bool, int, double, string, array, object 여섯 가지를 한 타입에 담는다. `std::any`나 `std::variant`와는 목적이 다르다 — JSON serialization과 schema-less 데이터를 직접 다루는 것이 출발점이다.

## 동기 — std::any로는 부족하다

C++에서 "타입을 모르는 값을 담는 통"이 필요할 때 std는 세 가지를 제공한다.

- `std::any`: 어떤 타입이든. 그러나 꺼낼 때 타입을 정확히 알아야 한다(`any_cast<T>`).
- `std::variant<Ts...>`: 미리 정해진 타입 집합 중 하나.
- `std::optional<T>`: T 또는 없음.

JSON 데이터를 다룰 때 셋 다 어색하다.

- `any`는 동적 검색이 불가능 — `obj["user"]["name"]` 같은 path 접근을 못 함.
- `variant`는 타입 집합을 미리 정해야 함 — JSON의 6가지 타입을 매번 variant로 적기 번거롭다.
- recursive 정의(JSON array가 또 JSON object를 담음) 표현이 까다롭다.

`folly::dynamic`은 이 6가지 타입을 hard-code하고, `operator[]`, `at`, `keys` 같은 path 접근 API를 직접 제공한다.

## API

```cpp
#include <folly/dynamic.h>

// 생성
folly::dynamic obj = folly::dynamic::object;
obj["name"] = "Alice";
obj["age"] = 30;
obj["scores"] = folly::dynamic::array(95, 87, 92);
obj["address"] = folly::dynamic::object("city", "Seoul");

// 접근
auto name = obj["name"].asString();    // "Alice"
auto age  = obj["age"].asInt();        // 30
auto firstScore = obj["scores"][0].asInt();  // 95

// 타입 검사
if (obj["age"].isInt()) {
  // ...
}

// 순회
for (auto& [k, v] : obj.items()) {
  LOG(INFO) << k << " = " << v;
}

// JSON 변환
auto json = folly::toJson(obj);
auto parsed = folly::parseJson(json);
```

CamelCase의 `obj["scores"]`가 array를, `obj["address"]`가 object를 가지면서도 type erasure 비용은 한 번의 enum check다.

## 내부 구현

```cpp
class dynamic {
  enum Type : uint8_t {
    NULLT, BOOL, INT64, DOUBLE, STRING, ARRAY, OBJECT
  };

  Type type_;
  union Data {
    bool b;
    int64_t i;
    double d;
    std::string s;
    std::vector<dynamic> arr;
    folly::F14NodeMap<dynamic, dynamic> obj;
  } u_;
};
```

핵심은 tagged union이다.

- `type_`이 현재 어느 variant인지 명시.
- `u_`에 실제 데이터.
- string, array, object는 heap에 보관(union 안에서 placement-new).

object의 키도 `dynamic`이다. 즉 키가 string뿐 아니라 int, bool 등도 가능하다(JSON spec엔 안 맞지만 in-memory에선 허용).

### 생성/소멸

union 내부는 trivial 타입이 아닌 게 있으므로(string, vector, map), copy/move/destroy를 type_에 따라 분기해야 한다.

```cpp
dynamic(const dynamic& other) : type_(other.type_) {
  switch (type_) {
    case STRING: new (&u_.s) std::string(other.u_.s); break;
    case ARRAY:  new (&u_.arr) std::vector<dynamic>(other.u_.arr); break;
    case OBJECT: new (&u_.obj) F14NodeMap<dynamic,dynamic>(other.u_.obj); break;
    default: u_ = other.u_;
  }
}

~dynamic() {
  switch (type_) {
    case STRING: u_.s.~basic_string(); break;
    case ARRAY:  u_.arr.~vector(); break;
    case OBJECT: u_.obj.~F14NodeMap(); break;
    default: break;
  }
}
```

`std::variant`와 비슷한 패턴이지만 타입 집합이 fixed라서 더 간결하다.

## std / abseil 비교

| 타입 | 목적 | 동적 접근 | JSON 변환 |
|------|------|-----------|-----------|
| `std::any` | type-erase 단일 값 | x | x |
| `std::variant<Ts...>` | 미리 정한 타입 집합 | visitor 필요 | x |
| `nlohmann::json` | JSON 데이터 모델 | o | o |
| `folly::dynamic` | JSON 데이터 모델 | o | o |
| `absl::Cord` | 큰 string fragment | x | x |

`folly::dynamic`의 자리는 `nlohmann::json`과 같다. 둘은 거의 1:1 호환 사용처이고, Folly는 jemalloc·F14·SmallVector 같은 Folly 생태계와의 통합이 더 자연스럽다는 게 차별점이다.

## 코드 리뷰 포인트

### 1. asInt vs getInt

```cpp
obj["age"].asInt();  // 변환 가능하면 변환 (string "30" → 30)
obj["age"].getInt(); // 정확히 INT64 타입일 때만, 아니면 throw
```

`as*`는 coercion을 시도한다(string → number 등). `get*`은 strict.

PR 리뷰에서 의도를 명확히. 외부 JSON 파싱이라면 `as*`가 관대해서 편하지만 silent type drift를 만들 수 있다. 내부 계산이라면 `get*`이 안전.

### 2. operator[] 부작용

```cpp
folly::dynamic obj = folly::dynamic::object;
auto x = obj["missing"]; // missing 키를 nullptr로 *생성*함
```

object에 `operator[]`로 접근하면 키가 없으면 자동 생성된다. read-only 접근이 의도라면 `at` 또는 `getDefault` 사용.

```cpp
// Good
if (obj.count("missing")) {
  auto v = obj["missing"];
}
auto v = obj.getDefault("missing", folly::dynamic());
```

### 3. dynamic을 함수 인자로 const&

```cpp
// 회피
void process(folly::dynamic d); // 매번 deep copy (object/array는 비쌈)

// Good
void process(const folly::dynamic& d);
```

dynamic은 object/array에서 무거운 deep copy를 한다. 항상 reference 또는 move로 전달.

### 4. 키가 정말 string이면 string으로 명시

```cpp
// 회피
obj[42] = "value"; // 키가 int (in-memory만 가능, JSON 변환 시 string화)

// Good
obj["42"] = "value";
```

JSON spec은 object 키가 string이다. int 키는 toJson 시 string 변환이 강제되고, 외부 시스템과의 호환에 혼선을 부른다.

## 안티패턴

### 1. 모든 데이터를 dynamic으로

```cpp
// 회피 — 내부 데이터까지 dynamic
folly::dynamic User; // type-safe struct가 더 나음
```

dynamic은 외부 boundary(JSON parsing, RPC payload)에서만 사용. 내부 데이터는 struct로 변환해 type safety를 확보한다. 다음 절(part 11-03)에서 변환 패턴.

### 2. 깊은 path 접근에서 throw 누락

```cpp
// 회피
auto city = obj["user"]["address"]["city"].asString();
// user나 address가 없으면 그 단계에서 throw
```

외부 JSON이면 각 단계에서 키 존재 여부를 확인하거나 try/catch로 감싼다.

### 3. dynamic을 hashmap의 키로

```cpp
// 회피
folly::F14FastMap<folly::dynamic, int> m;
```

dynamic은 hash를 지원하지만 비교 비용이 비싸고 의미가 불분명. string 또는 정확한 struct 키 사용.

## 정리

- folly::dynamic은 **JSON 6가지 타입을 담는 tagged union**이다.
- `std::any`/`variant`와 달리 path 접근 API와 JSON 변환을 직접 제공.
- 내부적으로 union + enum tag. string/array/object는 heap.
- `asInt`(coercion) vs `getInt`(strict) 구분.
- `operator[]`로 read하면 missing 키가 자동 생성됨에 주의.
- 외부 boundary에서만 사용, 내부는 struct로 변환.

## 다음 편

[Part 11-02 JSON conversion](/blog/programming/code-review/folly/part11-02-json-conversion) — `toJson`/`parseJson`. parse 옵션과 성능 특성을 본다.

## 관련 항목

- [Part 11-03 Dynamic ↔ struct](/blog/programming/code-review/folly/part11-03-dynamic-struct) — type-safe 변환
- [Part 7-01 F14ValueMap](/blog/programming/code-review/folly/part7-01-f14-value-map) — object의 내부 저장소
- [Effective Modern C++ Item 18](/blog/programming/cpp/effective-modern-cpp/item18-use-unique-ptr-for-exclusive-ownership) — type erasure 패턴
