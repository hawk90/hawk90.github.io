---
title: "Part 17-02: folly::Uri — URL 파서"
date: 2026-05-27T15:00:00
description: "Uri의 RFC 3986 파싱, query string 추출, scheme/host/path 분해 — 표준에 없는 빈자리."
series: "Folly Code Review"
seriesOrder: 73
tags: [cpp, folly, uri, url, parser]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

> **한 줄 요약**: `folly::Uri`는 RFC 3986 기반 URL 파서다. C++ 표준에는 URL 파서가 없어 fbcode·외부 모두 같은 빈자리를 채우는 도구가 필요했다.

## 동기

C++ 표준 라이브러리에는 URL 파서가 없다. WHATWG URL Spec 구현은 *옵션*이지만 모든 라이브러리가 fbcode 패턴(`scheme://user:pass@host:port/path?query#fragment`)을 정확히 다뤄야 한다.

매번 `strtok`나 `regex`로 짜는 건 위험하다. percent-encoding, IPv6 bracket, IDN, default port 같은 함정이 많다. Boost.URL도 비교적 최근(2022). Folly는 일찍 자체 파서를 만들어 fbcode 내부 RPC client·log 전체가 사용한다.

```cpp
folly::Uri u("https://user:pw@api.example.com:8080/v1/items?id=42#section");

u.scheme();    // "https"
u.username();  // "user"
u.password();  // "pw"
u.host();      // "api.example.com"
u.port();      // 8080
u.path();      // "/v1/items"
u.query();     // "id=42"
u.fragment();  // "section"
```

## API

```cpp
#include <folly/Uri.h>

folly::Uri u("https://example.com/path?a=1&b=2");

u.scheme();              // "https"
u.host();                // "example.com"
u.path();                // "/path"
u.query();               // "a=1&b=2"

// query parameter 분해
auto params = u.getQueryParams();
// std::vector<std::pair<std::string, std::string>>
//   { {"a", "1"}, {"b", "2"} }

// authority 재조립
u.authority();           // "example.com"

// 전체 재조립
u.toString();            // "https://example.com/path?a=1&b=2"
```

URI parsing은 *생성자에서* 일어난다. 잘못된 URI면 `std::invalid_argument` throw.

```cpp
try {
  folly::Uri u("not a valid url");
} catch (const std::invalid_argument& e) {
  LOG(ERROR) << e.what();
}
```

## Query string 처리

```cpp
folly::Uri u("https://api/search?q=hello+world&limit=10&page=1");

auto params = u.getQueryParams();
for (const auto& [k, v] : params) {
  std::cout << k << " = " << v << "\n";
}
// q = hello world      ← + 가 space로 변환됨
// limit = 10
// page = 1
```

`+`/`%20` → space, `%XX` percent-encoding 처리가 표준대로. 잘못된 encoding은 ignore 또는 verbatim 보존 (구현 정책).

### 직접 query 조작

```cpp
folly::Uri u("https://api/search");
u.setQuery("q=foo&limit=20");
auto s = u.toString();   // "https://api/search?q=foo&limit=20"
```

setter도 있다. 단 setter 호출 후 내부 파싱이 다시 일어나야 일관성이 유지된다.

## 내부 구현 — 정규식

```cpp
// folly/Uri.cpp 약식
const boost::regex uriRegex(
  "([a-zA-Z][a-zA-Z0-9+.-]*):"          // scheme
  "(?://"                                // ://
    "(?:([^@/?#]*)@)?"                   // userinfo
    "([^:/?#]+)"                         // host
    "(?::(\\d+))?"                       // port
  ")?"
  "([^?#]*)"                              // path
  "(?:\\?([^#]*))?"                       // query
  "(?:#(.*))?"                            // fragment
);

Uri::Uri(folly::StringPiece s) {
  boost::cmatch m;
  if (!boost::regex_match(s.begin(), s.end(), m, uriRegex)) {
    throw std::invalid_argument("invalid URI");
  }
  scheme_   = m[1];
  username_ = ...;   // userinfo split
  host_     = m[3];
  port_     = m[4].matched ? std::stoi(m[4]) : 0;
  path_     = m[5];
  query_    = m[6];
  fragment_ = m[7];
}
```

내부적으로 `boost::regex`(또는 std::regex)로 한 번에 파싱. RFC 3986의 grammar가 거의 그대로 regex가 된다. percent-decode는 별도 단계.

성능이 critical하면 hand-rolled parser가 낫지만 fbcode use case는 *RPC URL 한 번 파싱*이라 regex로 충분.

## RFC 3986과의 충실도

```text
URI = scheme ":" hier-part [ "?" query ] [ "#" fragment ]
hier-part = "//" authority path-abempty
          / path-absolute
          / path-rootless
          / path-empty
authority = [ userinfo "@" ] host [ ":" port ]
```

folly는 위 grammar 대부분을 다룬다. 단 다음은 *완벽하진 않다*.

- **IPv6 host with bracket** — `[::1]:8080` 형태 — 지원하나 일부 corner case가 다를 수 있음.
- **IDN (international domain)** — punycode 변환은 안 함. raw 문자열로 보관.
- **Percent-decoding** — query에서는 한다. path는 raw 보관(decode는 호출자 책임).
- **Relative URI 해석** — base URI에 대한 resolution은 별도 API 필요.

WHATWG URL Spec(브라우저용)과는 다른 RFC 3986 grammar 기반. 브라우저용 URL을 완벽히 처리해야 한다면 별도 라이브러리(Boost.URL, ada-url 등).

## std와의 비교

| 항목 | 표준 | folly::Uri | Boost.URL | ada-url |
|------|------|-------------|------------|----------|
| C++ 표준 | 없음 | folly 내부 | Boost 1.81+ | 외부 |
| RFC 3986 | N/A | 거의 충실 | 충실 | 충실 |
| WHATWG URL | N/A | 부분 | 부분 | 완전 |
| IDN punycode | N/A | 안 함 | 안 함 | 함 |
| 성능 | N/A | regex 기반 (보통) | hand-rolled (빠름) | SIMD (가장 빠름) |
| 의존성 | N/A | folly | boost | 없음 |

fbcode 내부 RPC는 percent-encoded ASCII 위주라 `folly::Uri`로 충분. 브라우저 fidelity가 필요하면 ada-url.

## 코드 리뷰 포인트

- 입력 URL의 신뢰성 — 사용자 입력이면 catch `std::invalid_argument` 필수.
- `port()`가 0을 반환하면 URI에 port가 없다는 뜻 (default port resolution은 호출자).
- query parameter가 *순서를 유지해야 하면* `getQueryParams()`(`vector<pair>`) 사용. unordered map 변환은 정보 손실.
- path가 percent-encoded인 채로 반환됨 — 사용 전 decode 필요할 수 있다.
- HTTPS/HTTP 같은 scheme 비교는 case-insensitive (RFC). 직접 `==` 비교 전 lower-case 정규화.

## 자주 보는 안티패턴

```cpp
// 1. regex로 직접 URL 파싱
std::regex r(R"(^(https?)://([^/]+))");
// → 표준 도구로 percent-encoding/IPv6 처리 누락 가능

// 2. port 비교 없이 host만 비교
if (u.host() == "api.example.com") { ... }
// → 같은 host의 다른 port가 다른 서비스일 수 있음

// 3. percent-encoded path 직접 file system에 사용
auto path = u.path();
std::ifstream f(path);   // %20 같은 인코딩이 그대로 들어감

// 4. setter 후 내부 일관성 무시
folly::Uri u("https://a/p");
u.setHost("[::1");   // 잘못된 IPv6 — setter가 throw하지 않을 수 있음
```

## 실전 예 — RPC client URL 처리

```cpp
folly::Uri ParseEndpoint(const std::string& raw) {
  folly::Uri u(raw);   // throw if invalid

  if (u.scheme() != "http" && u.scheme() != "https") {
    throw std::invalid_argument("unsupported scheme: " + u.scheme().str());
  }

  if (u.host().empty()) {
    throw std::invalid_argument("missing host");
  }

  // default port
  if (u.port() == 0) {
    u_port = (u.scheme() == "https") ? 443 : 80;
  }

  return u;
}
```

scheme 검증, host 존재 확인, default port 채우기 — RPC client에서 매번 하는 작업.

## 정리

- C++ 표준에 URL 파서가 없어 folly가 그 자리를 채운다.
- RFC 3986 grammar 기반, regex로 한 번 파싱.
- scheme/userinfo/host/port/path/query/fragment 모두 추출.
- query parameter는 vector<pair>로 순서 보존.
- 브라우저 fidelity가 필요하면 ada-url, RPC 정도면 `folly::Uri`로 충분.

## 다음 편

[Part 17-03: folly::hash::Fingerprint](/blog/programming/code-review/folly/part17-03-hash-fingerprint)에서 분산 hash 함수를 본다.

## 관련 항목

- [Folly Part 5-03 — StringPiece](/blog/programming/code-review/folly/part5-03-string-piece) — Uri 입력 타입
- [Folly Part 17-01 — Range](/blog/programming/code-review/folly/part17-01-range)
- [원문 — folly/Uri.h](https://github.com/facebook/folly/blob/main/folly/Uri.h)
