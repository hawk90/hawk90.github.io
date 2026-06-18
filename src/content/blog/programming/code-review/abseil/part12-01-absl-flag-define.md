---
title: "ABSL_FLAG 정의 분석"
date: 2026-06-12T09:15:00
description: "ABSL_FLAG — gflags의 후속이자 Abseil 표준 command-line flag. type-safe definition과 GetFlag/SetFlag 접근."
series: "Abseil Code Review"
seriesOrder: 63
tags: [cpp, abseil, flags, command-line, definition]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 매크로 한 줄로 flag 정의

```cpp
#include "absl/flags/flag.h"

ABSL_FLAG(int32_t, port, 8080, "HTTP listen port");
ABSL_FLAG(std::string, name, "world", "greeting target");
ABSL_FLAG(absl::Duration, timeout, absl::Seconds(30), "request timeout");
ABSL_FLAG(bool, verbose, false, "enable verbose logging");
```

매크로 형식은 `ABSL_FLAG(type, name, default, help)`. 컴파일 시 글로벌 변수 `FLAGS_name`이 생성되고 런타임에 *Flag Registry*에 자동 등록.

## 접근 — GetFlag / SetFlag

```cpp
int32_t port = absl::GetFlag(FLAGS_port);
absl::Duration t = absl::GetFlag(FLAGS_timeout);

absl::SetFlag(&FLAGS_port, 9090);
```

직접 `FLAGS_port` 변수에 접근하지 *않는다*. `GetFlag`/`SetFlag`를 통해야 thread-safe하다.

```cpp
// 회피 — gflags 시절 관행
if (FLAGS_verbose) { ... }   // ❌ Abseil에서는 안 됨

// Good
if (absl::GetFlag(FLAGS_verbose)) { ... }
```

`ABSL_FLAG`로 정의된 변수는 *opaque holder* 라 직접 읽기를 막아 둔다. 이는 런타임에 atomic 갱신을 보장하기 위함이다.

## 지원 타입

기본 지원:

| 타입 | 예 |
|------|-----|
| `bool`, `int{8,16,32,64}_t`, `uint{8,16,32,64}_t` | `ABSL_FLAG(int32_t, n, 0, "")` |
| `float`, `double` | `ABSL_FLAG(double, rate, 1.0, "")` |
| `std::string` | `ABSL_FLAG(std::string, name, "x", "")` |
| `std::vector<std::string>` | comma-separated |
| `absl::Duration` | `"30s"`, `"500ms"` |
| `absl::Time` | RFC3339 |
| `absl::CivilSecond` 등 | RFC3339 |
| `std::optional<T>` | 값 또는 unset |

다른 타입은 *AbslParseFlag*/*AbslUnparseFlag*를 정의해 확장(다음 챕터).

## Duration / Time flag

```cpp
ABSL_FLAG(absl::Duration, timeout, absl::Seconds(30),
          "Request timeout (e.g. 500ms, 5s, 1h)");
ABSL_FLAG(absl::Time, deadline, absl::InfiniteFuture(),
          "Absolute deadline (RFC3339)");
```

명령행에서 자연스러운 표기.

```bash
$ ./myapp --timeout=500ms --deadline=2026-05-25T20:00:00Z
```

`int seconds`/`int ms` flag로 받지 말고 *Duration flag*를 쓴다(Part 7-01의 단위 안전과 같은 정신).

## --help 자동 생성

flag 등록 시 *help 문자열* 이 함께 보존된다.

```bash
$ ./myapp --help

  Flags from myapp.cc:
    --port (HTTP listen port); default: 8080;
    --timeout (request timeout); default: 30s;
    --verbose (enable verbose logging); default: false;
```

`absl::ParseCommandLine`이 `--help`를 본 즉시 출력 후 종료.

## ABSL_DECLARE_FLAG — 헤더에 선언

flag를 다른 파일에서도 읽으려면 *헤더에 declare*.

```cpp
// flags.h
ABSL_DECLARE_FLAG(int32_t, port);
ABSL_DECLARE_FLAG(absl::Duration, timeout);

// main.cc
ABSL_FLAG(int32_t, port, 8080, "HTTP port");
ABSL_FLAG(absl::Duration, timeout, absl::Seconds(30), "timeout");
```

declare는 *extern과 동등*. define은 한 곳에서만.

## scope — global

`ABSL_FLAG`는 *전역 변수* 다. namespace 안에 둘 수 없고, 클래스 멤버로도 불가.

```cpp
// 회피
namespace mylib {
ABSL_FLAG(int, x, 0, "");   // ❌ 컴파일 에러
}

class Foo {
    ABSL_FLAG(int, x, 0, "");   // ❌ 불가
};

// Good — 파일 스코프 한정
ABSL_FLAG(int, x, 0, "");
namespace mylib {
int Get() { return absl::GetFlag(FLAGS_x); }
}
```

이 제약 때문에 *flag 이름이 전역 namespace를 공유* 한다. 라이브러리는 prefix(`mylib_x`)를 두는 게 좋다.

## 의존성 주입 vs flag

`GetFlag` 호출이 *코드 곳곳에 흩어지면* 테스트가 어렵다. 권장 패턴:

```cpp
// 회피
void HandleRequest() {
    if (absl::GetFlag(FLAGS_timeout) < absl::Seconds(1)) { ... }   // ❌ 직접 호출
}

// Good — 구조체로 캡슐화
struct Config {
    absl::Duration timeout;
    int32_t port;
};
Config LoadConfig() {
    return {
        .timeout = absl::GetFlag(FLAGS_timeout),
        .port = absl::GetFlag(FLAGS_port),
    };
}

void HandleRequest(const Config& cfg) {
    if (cfg.timeout < absl::Seconds(1)) { ... }
}
```

flag는 *경계 한 곳*에서 읽고, 그 결과를 구조체로 전달. 테스트는 구조체만 만들면 끝.

## 작은 예시 — 서버 부팅

```cpp
ABSL_FLAG(int32_t, port, 8080, "Listen port");
ABSL_FLAG(std::string, host, "0.0.0.0", "Bind address");
ABSL_FLAG(absl::Duration, shutdown_grace, absl::Seconds(10),
          "Grace period for in-flight requests on SIGTERM");
ABSL_FLAG(std::vector<std::string>, allowed_origins, {},
          "CORS allowed origins (comma-separated)");

int main(int argc, char** argv) {
    absl::ParseCommandLine(argc, argv);
    absl::InitializeLog();

    Config cfg{
        .port = absl::GetFlag(FLAGS_port),
        .host = absl::GetFlag(FLAGS_host),
        .grace = absl::GetFlag(FLAGS_shutdown_grace),
        .origins = absl::GetFlag(FLAGS_allowed_origins),
    };

    LOG(INFO) << "starting on " << cfg.host << ":" << cfg.port;
    RunServer(cfg);
    return 0;
}
```

```bash
$ ./server --port=9090 --shutdown_grace=30s --allowed_origins=a.com,b.com
```

## 회피 패턴

```cpp
// 회피 — int로 시간 표현
ABSL_FLAG(int, timeout_ms, 5000, "timeout in ms");

// Good — Duration
ABSL_FLAG(absl::Duration, timeout, absl::Seconds(5), "request timeout");
```

```cpp
// 회피 — 매 호출 GetFlag (atomic load 누적)
for (int i = 0; i < kHotLoop; ++i) {
    if (absl::GetFlag(FLAGS_verbose)) Log(...);   // ❌ hot path
}

// Good — 시작 시 한 번 캡처
const bool verbose = absl::GetFlag(FLAGS_verbose);
for (int i = 0; i < kHotLoop; ++i) {
    if (verbose) Log(...);
}
```

```cpp
// 회피 — 직접 변수 읽기
int p = FLAGS_port;   // ❌ 컴파일 안 됨 또는 비추천

// Good
int p = absl::GetFlag(FLAGS_port);
```

## 정리

- `ABSL_FLAG(type, name, default, help)` 한 줄로 type-safe flag.
- `GetFlag(FLAGS_x)` / `SetFlag(&FLAGS_x, v)` 통해서만 접근. 직접 변수 읽기 금지.
- 기본 지원 타입: 정수·실수·string·Duration·Time·vector\<string>·optional 등.
- 전역 namespace 공유 — 라이브러리는 prefix 권장.
- production 코드는 *경계 한 곳에서* GetFlag 호출, 결과는 구조체로 전달.

## 다음 장 예고

[Part 12-02: ParseCommandLine](/blog/programming/code-review/abseil/part12-02-parse-command-line) — flag 파싱.

## 관련 항목

- [Part 7-04: TimeZone](/blog/programming/code-review/abseil/part7-04-time-zone) — `--service_timezone` 같은 명시 TZ flag
- [Part 12-02: ParseCommandLine](/blog/programming/code-review/abseil/part12-02-parse-command-line)
- [Part 12-03: Flag introspection / validation](/blog/programming/code-review/abseil/part12-03-flag-introspection)
- [원문 — Abseil Flags](https://abseil.io/docs/cpp/guides/flags)
