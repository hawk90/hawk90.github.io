---
title: "Abseil Flag introspection·validation"
date: 2026-06-13T09:01:00
description: "Flag validator, custom type AbslParseFlag/AbslUnparseFlag, introspection API — flag 정확성과 동적 조회."
series: "Abseil Code Review"
seriesOrder: 65
tags: [cpp, abseil, flags, validation, introspection]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 검증 — Validator

flag 값이 *합법한 범위*인지 자동 검증.

```cpp
#include "absl/flags/flag.h"

ABSL_FLAG(int32_t, port, 8080, "HTTP port");

static const auto port_validator = []() {
    int32_t p = absl::GetFlag(FLAGS_port);
    if (p <= 0 || p > 65535) {
        LOG(FATAL) << "invalid --port: " << p;
    }
    return true;
}();
```

또는 더 형식적인 *AbslParseFlag* 단계에서 검증(아래).

## Custom type — AbslParseFlag / AbslUnparseFlag

내장 타입 외에는 두 함수를 정의해 flag 시스템에 등록.

```cpp
struct LogLevel {
    enum Value { kDebug, kInfo, kWarn, kError } value;
};

bool AbslParseFlag(absl::string_view text, LogLevel* out, std::string* error) {
    if (text == "debug")      { out->value = LogLevel::kDebug; return true; }
    if (text == "info")       { out->value = LogLevel::kInfo; return true; }
    if (text == "warn")       { out->value = LogLevel::kWarn; return true; }
    if (text == "error")      { out->value = LogLevel::kError; return true; }
    *error = absl::StrCat("expected debug/info/warn/error, got ", text);
    return false;
}

std::string AbslUnparseFlag(LogLevel level) {
    switch (level.value) {
        case LogLevel::kDebug: return "debug";
        case LogLevel::kInfo: return "info";
        case LogLevel::kWarn: return "warn";
        case LogLevel::kError: return "error";
    }
    return "?";
}

ABSL_FLAG(LogLevel, log_level, LogLevel{LogLevel::kInfo}, "logging level");
```

`Parse`는 *유효성 검증을 포함* — 잘못된 값이면 `false` 반환하고 `error`에 메시지. `ParseCommandLine`이 이 에러를 표시한다.

```bash
$ ./app --log_level=trace
ERROR: --log_level=trace: expected debug/info/warn/error, got trace
```

## Enum flag — 흔한 패턴

```cpp
enum class Verbosity { kQuiet, kNormal, kVerbose, kDebug };

bool AbslParseFlag(absl::string_view text, Verbosity* v, std::string* err) {
    static const auto kMap = absl::flat_hash_map<absl::string_view, Verbosity>{
        {"quiet", Verbosity::kQuiet},
        {"normal", Verbosity::kNormal},
        {"verbose", Verbosity::kVerbose},
        {"debug", Verbosity::kDebug},
    };
    auto it = kMap.find(text);
    if (it == kMap.end()) {
        *err = absl::StrCat("unknown verbosity: ", text);
        return false;
    }
    *v = it->second;
    return true;
}

std::string AbslUnparseFlag(Verbosity v) {
    switch (v) {
        case Verbosity::kQuiet: return "quiet";
        case Verbosity::kNormal: return "normal";
        case Verbosity::kVerbose: return "verbose";
        case Verbosity::kDebug: return "debug";
    }
    return "?";
}

ABSL_FLAG(Verbosity, verbosity, Verbosity::kNormal, "logging verbosity");
```

`int` flag보다 *이름이 명령행에 노출* 되어 readability가 좋다.

## Range validation — Parse 안에서

```cpp
struct PortNumber {
    uint16_t value;
};

bool AbslParseFlag(absl::string_view text, PortNumber* p, std::string* err) {
    int n;
    if (!absl::SimpleAtoi(text, &n)) {
        *err = absl::StrCat("not a number: ", text);
        return false;
    }
    if (n <= 0 || n > 65535) {
        *err = absl::StrCat("out of range [1, 65535]: ", n);
        return false;
    }
    p->value = static_cast<uint16_t>(n);
    return true;
}

std::string AbslUnparseFlag(PortNumber p) { return absl::StrCat(p.value); }

ABSL_FLAG(PortNumber, port, PortNumber{8080}, "HTTP port");
```

`absl::SimpleAtoi`로 안전 파싱. 잘못된 값이면 `false`로 거부.

## ReflectionFlag / introspection

런타임에 flag 메타데이터를 조회.

```cpp
#include "absl/flags/reflection.h"

const absl::CommandLineFlag* f = absl::FindCommandLineFlag("port");
if (f) {
    LOG(INFO) << "name: " << f->Name();
    LOG(INFO) << "help: " << f->Help();
    LOG(INFO) << "type: " << f->Typename();
    LOG(INFO) << "current: " << f->CurrentValue();
    LOG(INFO) << "default: " << f->DefaultValue();
}
```

모든 flag 순회:

```cpp
absl::flags_internal::ForEachFlag([](absl::CommandLineFlag& f) {
    LOG(INFO) << f.Name() << " = " << f.CurrentValue();
});
```

debug endpoint(`/_/flags`)로 노출하면 운영 중 현재 설정 확인 가능.

## SetFlag — 런타임 변경

```cpp
absl::SetFlag(&FLAGS_port, 9090);
absl::SetFlagByName("port", "9090");   // 문자열 인터페이스
```

`SetFlag` / `SetFlagByName` 모두 thread-safe. 다만 *이미 캡처된 값*은 안 바뀐다.

```cpp
const bool verbose = absl::GetFlag(FLAGS_verbose);   // 캡처
absl::SetFlag(&FLAGS_verbose, true);
if (verbose) { ... }   // 여전히 이전 값
```

런타임 변경을 감지하려면 매번 `GetFlag` 호출(atomic load — 가볍지만 hot path는 회피).

## Admin endpoint 예 — HTTP로 flag 변경

```cpp
void HandleSetFlag(absl::string_view name, absl::string_view value) {
    auto* f = absl::FindCommandLineFlag(std::string(name));
    if (!f) {
        Respond(404, "no such flag");
        return;
    }
    std::string err;
    if (!f->ParseFrom(value, &err)) {
        Respond(400, absl::StrCat("invalid value: ", err));
        return;
    }
    LOG(INFO) << "flag changed: " << name << " = " << value;
    Respond(200, "ok");
}
```

운영 중 디버그·실험 토글에 활용. *prod 전용 권한* 필수.

## 회피 패턴

```cpp
// 회피 — custom type validation 누락
bool AbslParseFlag(absl::string_view text, MyType* m, std::string* err) {
    m->value = ParseSomething(text);   // ❌ 항상 true 반환
    return true;
}

// Good — 검증
bool AbslParseFlag(absl::string_view text, MyType* m, std::string* err) {
    if (!Validate(text, err)) return false;
    m->value = ParseSomething(text);
    return true;
}
```

```cpp
// 회피 — int flag로 enum 표현
ABSL_FLAG(int, log_level, 2, "0=debug, 1=info, 2=warn, 3=error");   // ❌ 의미 모호

// Good — enum + custom parser
ABSL_FLAG(LogLevel, log_level, LogLevel::kWarn, "...");
```

```cpp
// 회피 — 런타임 변경에 의존하면서 캡처
int worker_count = absl::GetFlag(FLAGS_workers);
StartPool(worker_count);
// 이후 SetFlag(workers, ...) 해도 풀 크기 안 바뀜
```

## 정리

- 내장 타입 외 — `AbslParseFlag`/`AbslUnparseFlag` 한 쌍으로 custom 등록.
- `Parse` 안에서 *검증 + 변환* 모두. 잘못된 값은 `false` + `err`.
- enum flag는 *이름이 CLI에 노출* — int magic number 회피.
- `absl::FindCommandLineFlag` + `ForEachFlag`로 런타임 introspection.
- `SetFlag`/`SetFlagByName`으로 동적 변경. 캡처된 값은 안 바뀌므로 hot path 주의.

## 다음 장 예고

[Part 13-01: Google 스타일의 Abseil 사용 패턴](/blog/programming/code-review/abseil/part13-01-google-style-patterns) — 코드 리뷰 정리.

## 관련 항목

- [Part 12-01: ABSL_FLAG 정의](/blog/programming/code-review/abseil/part12-01-absl-flag-define)
- [Part 12-02: ParseCommandLine](/blog/programming/code-review/abseil/part12-02-parse-command-line)
- [Part 4-03: StrCat](/blog/programming/code-review/abseil/part4-03-str-cat) — `SimpleAtoi`
- [원문 — Custom Flag Types](https://abseil.io/docs/cpp/guides/flags#defining-custom-flag-types)
