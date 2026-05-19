---
title: "Part 4-08: Escape — CEscape, HexEscape, Base64 variants"
date: 2026-05-24T03:00:00
description: "Part 4-08: absl::CEscape / CHexEscape / Base64Escape / WebSafeBase64Escape — 안전한 문자열 이스케이프와 base64 인코딩의 모든 변형."
series: "Abseil Code Review"
seriesOrder: 26
tags: [cpp, abseil, strings, escape, base64]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: false
---

## 한 줄 요약

문자열을 *안전한 표현*으로 바꾸는 두 갈래가 있다. 사람이 읽을 표현(`CEscape`, `HexEscape`)과 전송용 인코딩(`Base64Escape`). Abseil은 모두 `absl/strings/escaping.h` 한 헤더에 통합 제공하며, web-safe variant, padding 옵션, in-place reverse 함수까지 지원한다.

## 동기

log 출력, 디버깅 dump, 직렬화. 임의 바이트 문자열을 사람이 읽거나 텍스트 전송하려면 escape가 필요하다. 표준 라이브러리에는 명확한 helper가 없다 — `iomanip`의 `std::hex`는 단일 정수용이고, base64는 표준에 없다.

```cpp
// 회피 — 로그에 raw bytes
LOG(INFO) << "buffer: " << raw_data;  // 제어 문자, NUL, non-printable이 그대로

// Good
LOG(INFO) << "buffer: " << absl::CEscape(raw_data);
// "buffer: hello\x00world\n"
```

## API와 사용법

```cpp
#include "absl/strings/escaping.h"

namespace absl {
// C-style escape: \n, \t, \xHH, \\
std::string CEscape(absl::string_view src);
std::string CHexEscape(absl::string_view src);   // 모든 non-printable을 \x로
bool CUnescape(absl::string_view src, std::string* dest, std::string* error = nullptr);

// 16진 문자열
std::string BytesToHexString(absl::string_view from);
std::string HexStringToBytes(absl::string_view from);

// Base64 (RFC 4648 표준 alphabet)
void Base64Escape(absl::string_view src, std::string* dest);
std::string Base64Escape(absl::string_view src);
bool Base64Unescape(absl::string_view src, std::string* dest);

// Web-safe Base64 (URL/filename 안전 alphabet)
void WebSafeBase64Escape(absl::string_view src, std::string* dest);
std::string WebSafeBase64Escape(absl::string_view src);
bool WebSafeBase64Unescape(absl::string_view src, std::string* dest);
}
```

## CEscape — C 스타일 이스케이프

```cpp
std::string s = absl::CEscape("hello\x01world\n");
// "hello\\x01world\\n"
```

규칙은 다음과 같다.

- `\n`, `\r`, `\t`, `\\`, `\"`, `\'`는 backslash 이스케이프.
- printable ASCII는 그대로.
- non-printable은 `\xHH`(2자리 16진).

`CHexEscape`는 더 엄격하다. printable이라도 8진 escape 가능 character까지 모두 `\xHH`로 출력한다. 디버깅/binary dump에 적합.

```cpp
absl::CEscape("\x07ABC");     // "\\aABC"      (\\a = BEL)
absl::CHexEscape("\x07ABC");  // "\\x07ABC"
```

`CUnescape`는 역변환. 파싱 에러는 `error` 문자열에 담아 반환한다.

```cpp
std::string out, err;
if (!absl::CUnescape("hello\\x01world", &out, &err)) {
  LOG(ERROR) << "unescape failed: " << err;
}
```

## HexString — 단순 16진

```cpp
std::string hex = absl::BytesToHexString("\x00\xff\x10");
// "00ff10"

std::string bytes = absl::HexStringToBytes("DEADBEEF");
// "\xde\xad\xbe\xef"  (소문자/대문자 모두 허용)
```

체크섬, hash 값, 메모리 dump 등 *완전 16진*이 필요할 때 쓴다. `CHexEscape`는 사람이 읽기 위해 printable과 섞이고, `BytesToHexString`은 *순수* 16진이다.

## Base64

```cpp
std::string encoded;
absl::Base64Escape("hello world", &encoded);
// "aGVsbG8gd29ybGQ="
```

표준 alphabet `A–Z a–z 0–9 + /`와 `=` padding. RFC 4648 준수.

```cpp
std::string decoded;
if (!absl::Base64Unescape(encoded, &decoded)) {
  // invalid base64
}
```

엄격하다. 잘못된 문자, 패딩 누락, 길이 mismatch는 false. raw 바이트가 임의 0x00을 포함해도 안전.

## WebSafeBase64 — URL/filename 안전

표준 base64의 `+`와 `/`는 URL/filename에서 escape가 필요하다. WebSafe variant는 alphabet을 바꾼다.

```text
표준:    A-Z a-z 0-9 + / =
WebSafe: A-Z a-z 0-9 - _ =
```

```cpp
std::string token;
absl::WebSafeBase64Escape(raw_uuid_bytes, &token);
// URL safe — query string, path, cookie에 그대로 사용 가능
```

`WebSafeBase64Unescape`도 대칭. 표준 base64로 인코딩된 문자열을 web-safe로 디코딩하려고 하면 false다(`+` `/` 미허용).

padding `=` 처리 차이도 알아두면 좋다. JWT 등 일부 protocol은 *padding 없는* WebSafeBase64를 쓴다 — `absl::WebSafeBase64Unescape`는 padding 있음/없음 모두 허용한다(`Escape` 측은 padding을 붙인다).

## 내부 구현

Base64는 6-bit 단위 lookup table로 동작한다. 핵심 인코더는 다음과 같은 구조다.

```cpp
// absl/strings/escaping.cc (요약)
constexpr char kBase64Chars[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

constexpr char kWebSafeBase64Chars[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

size_t Base64EscapeInternal(const unsigned char* src, size_t slen,
                            char* dest, size_t szdest,
                            const char* base64, bool do_padding) {
  // 3 bytes → 4 chars 반복
  // 마지막 1~2 bytes 처리 + 옵션 padding
}
```

알고리즘은 같고 alphabet과 padding만 다르다. 두 함수 모두 한 번의 alloc(또는 dest reserve)으로 끝난다.

CEscape는 byte 단위 상태 머신이다. lookup 없이 단순 if 분기로 처리. 작은 입력에서 가장 빠른 경로다.

## 코드 리뷰 포인트

**1. log/error message의 raw bytes**

```cpp
// 회피 — 제어 문자가 터미널을 깨뜨림, NUL이 잘림
LOG(ERROR) << "got: " << buffer;

// Good
LOG(ERROR) << "got: " << absl::CEscape(buffer);
```

**2. URL token 생성**

```cpp
// 회피 — 표준 base64는 URL에 부적합
std::string token;
absl::Base64Escape(secret_bytes, &token);
// "+/" 등이 들어가면 URL escape가 또 필요

// Good
std::string token;
absl::WebSafeBase64Escape(secret_bytes, &token);
// 그대로 URL에 사용
```

**3. config dump**

```cpp
// 사람이 읽기 좋은 형식
for (const auto& [k, v] : config) {
  LOG(INFO) << absl::StrCat("  ", k, " = \"", absl::CEscape(v), "\"");
}
```

## 안티패턴

**HexString vs CHexEscape 혼동**

| 함수 | 출력 | 용도 |
|---|---|---|
| `BytesToHexString("AB")` | `"4142"` | 순수 16진 (해시값, 체크섬) |
| `CHexEscape("AB")` | `"AB"` | C 리터럴 호환 (printable은 그대로) |
| `CHexEscape("\x01")` | `"\\x01"` | 디버깅 dump |

두 API의 의미가 다르다. 항상 의도와 일치하는 쪽을 고른다.

**unsafe alphabet 가정**

base64 결과를 *문자열 그대로* SQL/HTML/log에 넣을 때 검증 없이 그러지 않는다. 표준 base64는 SQL injection 측면에서는 안전한 문자만 쓰지만, `/`가 path traversal 위험이 있는 환경(파일명 등)에서는 위험할 수 있다. WebSafe를 쓴다.

**padding 처리 가정**

```cpp
// 회피 — padding 형식 가정
assert(encoded.size() % 4 == 0);

// Good — Unescape 결과만 검증
std::string out;
if (!absl::WebSafeBase64Unescape(encoded, &out)) {
  return InvalidInput();
}
```

## 정리

- escape는 두 갈래 — *읽기*용(CEscape, HexEscape)과 *전송*용(Base64).
- `CEscape`는 printable + `\xHH`, `CHexEscape`는 모두 16진.
- `BytesToHexString` / `HexStringToBytes`는 순수 16진 변환.
- `Base64Escape`는 표준 alphabet, `WebSafeBase64Escape`는 URL/filename 안전 alphabet.
- 모든 Unescape는 검증 실패 시 `bool false`. silent 무시 금지.

## 다음 편

Part 4가 끝났다. [Part 5-01 — flat_hash_map](/blog/programming/code-review/abseil/part5-01-flat-hash-map)에서 Swiss Table 기반 컨테이너로 넘어간다.

## 관련 항목

- [Part 4-06 — StrFormat](/blog/programming/code-review/abseil/part4-06-str-format)
- [Part 4-07 — ASCII 함수](/blog/programming/code-review/abseil/part4-07-ascii-functions)
- [Part 5-01 — flat_hash_map](/blog/programming/code-review/abseil/part5-01-flat-hash-map)
- [RFC 4648 — Base16/32/64](https://datatracker.ietf.org/doc/html/rfc4648)
