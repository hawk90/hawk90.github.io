---
title: "folly JSON conversion — toJson·parseJson"
date: 2026-06-06T09:14:00
description: "Part 11-02: toJson / parseJson — folly::dynamic ↔ JSON 문자열. parse 옵션, 성능, schema-less 처리."
series: "Folly Code Review"
seriesOrder: 50
tags: [cpp, folly, dynamic, json, parsing]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::toJson(dynamic)`과 `folly::parseJson(string)`은 **schema-less JSON 직렬화/역직렬화**의 한 줄짜리 API다. 옵션으로 trailing comma, comment, NaN/Infinity 같은 비표준 확장을 허용할 수 있다. SIMD 가속이 들어간 fast path가 있어 production 서비스에서 RPC payload 파싱에 자주 쓰인다.

## 동기 — 왜 또 JSON 파서인가

C++ JSON 파서는 많다. nlohmann::json, rapidjson, simdjson 등. Folly가 자기 것을 둔 이유는 단순히 의존성 격리 때문만이 아니다.

- **dynamic과 1:1 매핑** — 변환 비용이 거의 0.
- **Folly 옵션** (예: relaxed mode for human-edited JSON config) 내장.
- **fbcode 빌드 표준** — 외부 lib에 의존하지 않음.
- **production validated** — Meta의 모든 service config가 이 파서를 거침.

성능은 simdjson만큼 빠르진 않지만, nlohmann보다는 빠르고 dynamic 변환까지 포함하면 가장 직선적이다.

## API

```cpp
#include <folly/json.h>

// Serialize
folly::dynamic obj = folly::dynamic::object("k", 1)("v", "hello");
std::string j = folly::toJson(obj);
// {"k":1,"v":"hello"}

// Deserialize
auto parsed = folly::parseJson(R"({"a": [1,2,3]})");
LOG(INFO) << parsed["a"][1].asInt(); // 2

// Pretty-print
folly::json::serialization_opts opts;
opts.pretty_formatting = true;
opts.sort_keys = true;
auto pretty = folly::json::serialize(obj, opts);

// Relaxed parse (trailing comma, comment 허용)
folly::json::serialization_opts ropts;
ropts.allow_trailing_comma = true;
auto cfg = folly::json::parseJsonWithMetadata(text, ropts).value;
```

### serialization_opts 주요 옵션

| 옵션 | 의미 |
|------|------|
| `pretty_formatting` | indent + newline |
| `sort_keys` | object 키 알파벳 순 |
| `allow_nan_inf` | NaN/Infinity 출력 (비표준 JSON) |
| `javascript_safe` | JS BigInt 안전 |
| `encode_non_ascii` | non-ASCII를 \uXXXX로 |

### parse 옵션

| 옵션 | 의미 |
|------|------|
| `allow_trailing_comma` | `[1,2,3,]` 허용 |
| `allow_non_string_keys` | object 키가 number/bool도 허용 |
| `validate_utf8` | UTF-8 검증 (느려짐) |
| `recursion_limit` | 깊이 제한 (DoS 방어) |

## 내부 구현 — parser

```cpp
// folly/json.cpp (개념)
class Parser {
  const char* p_;
  const char* end_;

  dynamic parseValue() {
    skipWhitespace();
    char c = *p_;
    switch (c) {
      case '{': return parseObject();
      case '[': return parseArray();
      case '"': return parseString();
      case 't': case 'f': return parseBool();
      case 'n': return parseNull();
      default:  return parseNumber();
    }
  }
  // ...
};
```

전형적인 recursive descent. 한 글자 lookahead로 분기한다. number와 string 파싱은 SIMD로 가속된 fast path가 있다.

### number parse — fastFloat

`folly::parseTo<double>`가 내부적으로 fast_float 라이브러리를 호출한다. `strtod` 대비 3-5배 빠르다. 큰 JSON 배열(예: timeseries 데이터)에서 차이가 크다.

### string parse — escape 처리

```cpp
std::string parseString() {
  // " 다음부터 다음 " 까지 스캔
  // 중간에 \ 나오면 escape 처리
  // ASCII fast path: \가 없으면 memcpy 한 방
}
```

대부분의 string은 escape가 없다(`"hello"`). 그 fast path는 SIMD로 `\`와 `"`를 동시에 찾는다.

## std / abseil 비교

| 라이브러리 | 속도 | API 편의 | 비고 |
|-----------|------|----------|------|
| `nlohmann::json` | 보통 | 매우 좋음 | header-only |
| `rapidjson` | 빠름 | 거침 | SAX/DOM 둘 다 |
| `simdjson` | 가장 빠름 | DOM 변환 별도 | parse만 빠름 |
| `folly::toJson/parseJson` | 빠름 | 보통 | dynamic과 직접 |
| Abseil JSON | 없음 | — | Abseil 자체엔 JSON 없음 |

Abseil은 JSON을 안 만든다(Google 내부는 protobuf). Meta는 RPC도 thrift지만, config·log·feature flag가 모두 JSON이라 folly::dynamic + parseJson이 표준이 됐다.

## 코드 리뷰 포인트

### 1. parseJson은 throw

```cpp
// 회피
auto d = folly::parseJson(untrusted_input); // 형식 오류시 throw

// Good
try {
  auto d = folly::parseJson(input);
} catch (const folly::json::parse_error& e) {
  LOG(ERROR) << "JSON parse failed: " << e.what();
  return Status::InvalidArgument;
}

// Better — Try로 wrap
auto t = folly::makeTryWith([&]{ return folly::parseJson(input); });
if (t.hasException()) { /* ... */ }
```

외부 입력에서 throw가 흘러나오지 않게 가두는 게 production 패턴이다.

### 2. recursion_limit 설정

```cpp
folly::json::serialization_opts opts;
opts.recursion_limit = 64;
auto d = folly::json::parseJson(input, opts);
```

untrusted JSON은 깊이 무한이 가능 → stack overflow DoS. recursion_limit으로 방어.

### 3. encode 시 sort_keys

```cpp
opts.sort_keys = true;
auto j = folly::json::serialize(obj, opts);
```

같은 dynamic을 매번 같은 string으로 직렬화하려면 key sorting이 필요(F14Map은 stable order가 아님). hash나 cache 키로 쓸 JSON이라면 sort 필수.

### 4. 매우 큰 JSON은 streaming 고려

```cpp
// 회피 — 100MB JSON을 dynamic 한 덩어리로
auto d = folly::parseJson(huge_text);
```

dynamic은 모든 데이터를 메모리에 올린다. 100MB JSON이면 dynamic 자체로 수백 MB 사용. streaming 파싱이 필요하면 `folly::json::SemanticEventHandler` 또는 SAX 스타일 외부 lib.

## 안티패턴

### 1. RPC 핫패스에서 매번 parseJson

```cpp
// 회피 — 핫패스마다 parse
void handleRequest(string body) {
  auto d = folly::parseJson(body); // 매 request마다 풀파싱
  process(d);
}
```

RPC 트래픽이 높으면 thrift나 protobuf 같은 binary protocol이 압도적으로 빠르다. JSON은 human-edit이 필요한 config나 admin API에 한정.

### 2. toJson 한 결과를 다시 parseJson

```cpp
// 회피
auto j = folly::toJson(obj);
auto d = folly::parseJson(j); // copy하려는 의도? 그냥 obj copy하라
```

object copy가 필요하면 `auto copy = obj;`. JSON round-trip은 비싸고 의미 손실 가능(double 정밀도).

### 3. relaxed mode를 공개 API에

```cpp
// 회피
opts.allow_trailing_comma = true;
opts.allow_non_string_keys = true;
// 공개 API라면 표준 JSON만 받아야 한다
```

relaxed mode는 사람이 직접 편집하는 config에만. 외부 client가 보내는 JSON에 허용하면 호환성 함정.

## 정리

- toJson/parseJson은 **dynamic ↔ JSON string** 한 줄짜리 API.
- recursive descent parser + SIMD fast path(number/string).
- serialization_opts로 pretty, sort_keys, NaN 허용 등 조정.
- relaxed mode(trailing comma, comment)는 config 용도에만.
- parse는 throw 가능 → try/Try로 감싸기.
- recursion_limit으로 DoS 방어. 큰 JSON은 streaming 고려.

## 다음 편

[Part 11-03 Dynamic ↔ struct](/blog/programming/code-review/folly/part11-03-dynamic-struct) — dynamic을 strongly-typed struct로 옮기는 패턴. type safety의 boundary를 어디에 그을지.

## 관련 항목

- [Part 11-01 folly::dynamic](/blog/programming/code-review/folly/part11-01-dynamic) — JSON 타입 모델
- [Part 6-01 to / tryTo](/blog/programming/code-review/folly/part6-01-to-try-to) — number 파싱 토대
- [Part 13-01 ExceptionWrapper](/blog/programming/code-review/folly/part13-01-exception-wrapper) — parse error를 throw 없이 옮기기
