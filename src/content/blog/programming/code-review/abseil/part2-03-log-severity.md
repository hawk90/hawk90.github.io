---
title: "Part 2-03: absl::LogSeverity"
date: 2026-05-23T08:00:00
description: "Part 2-03: absl::LogSeverity — INFO/WARNING/ERROR/FATAL 4단계, NormalizeLogSeverity, 외부 시스템 연동."
series: "Abseil Code Review"
seriesOrder: 8
tags: [cpp, abseil, log, severity, base]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

> **한 줄 요약**: `absl::LogSeverity`는 4단계 로그 심각도를 표현하는 enum이고, 로깅 시스템의 다른 모든 부분이 이 type 위에 서 있다. `NormalizeLogSeverity`는 외부 시스템의 정수 코드를 안전하게 변환한다.

## 어떤 문제를 푸는가

로그 심각도는 "어디서나 같은 것"처럼 보이지만 실제로는 라이브러리·시스템마다 다르다. syslog는 0~7의 8단계, log4j는 6단계, Python logging은 5단계. Abseil은 가장 단순한 4단계로 정한다.

```cpp
namespace absl {
enum class LogSeverity : int {
    kInfo = 0,
    kWarning = 1,
    kError = 2,
    kFatal = 3,
};
}
```

왜 4단계인가. Google의 경험상 더 많은 단계는 일관되게 쓰이지 않는다. DEBUG 같은 추가 단계는 `VLOG`라는 별도 메커니즘으로 분리된다.

## 4단계의 의미

| 단계 | 의미 | 처리 |
|---|---|---|
| `kInfo` | 일상적인 정보 | 기록만, 알람 없음 |
| `kWarning` | 잠재적 문제 | 기록, 일부 시스템에서 알람 |
| `kError` | 명확한 실패 | 기록, 알람, 메트릭 |
| `kFatal` | 회복 불가 | 기록 후 `abort()` |

`kFatal`이 특별하다. 로그를 남긴 직후 프로세스를 종료한다. `LOG(FATAL)` 이후의 코드는 실행되지 않는다.

```cpp
LOG(INFO) << "Server started on port " << port;
LOG(WARNING) << "Retry attempt " << n;
LOG(ERROR) << "Failed to connect: " << s;
LOG(FATAL) << "Invariant violated";  // 이 후로 코드 실행 안 됨
```

## API

### enum과 utility 함수

```cpp
#include "absl/base/log_severity.h"

absl::LogSeverity s = absl::LogSeverity::kError;

// 이름 얻기
const char* name = absl::LogSeverityName(s);  // "ERROR"

// 외부 정수를 안전하게 변환
int external_code = 2;
absl::LogSeverity normalized = absl::NormalizeLogSeverity(external_code);
// out-of-range는 가장 가까운 valid 값으로 clamp
```

### LogSeverityAtLeast

특정 임계값 이상의 심각도만 통과시키는 enum.

```cpp
enum class LogSeverityAtLeast : int {
    kInfo = static_cast<int>(LogSeverity::kInfo),
    kWarning = static_cast<int>(LogSeverity::kWarning),
    kError = static_cast<int>(LogSeverity::kError),
    kFatal = static_cast<int>(LogSeverity::kFatal),
    kInfinity = 1000,
};
```

`kInfinity`가 추가되어 있어 "어떤 로그도 통과시키지 않음"을 표현할 수 있다.

```cpp
// FLAGS_minloglevel 같은 설정
absl::SetMinLogLevel(absl::LogSeverityAtLeast::kWarning);
// 이제 INFO 로그는 무시됨
```

### LogSeverityAtMost

반대 방향.

```cpp
enum class LogSeverityAtMost : int {
    kNegativeInfinity = -1000,
    kInfo = static_cast<int>(LogSeverity::kInfo),
    kWarning = static_cast<int>(LogSeverity::kWarning),
    kError = static_cast<int>(LogSeverity::kError),
    kFatal = static_cast<int>(LogSeverity::kFatal),
};
```

특정 임계값 이하만 처리. testing에서 유용. "FATAL은 죽이지 말고 WARNING으로 다뤄라" 같은 패턴.

## NormalizeLogSeverity의 역할

외부 시스템과 통합할 때 정수 값을 받게 된다.

```cpp
// 외부 protobuf에서 받은 enum 정수
int proto_severity = proto.log_severity();  // 0, 1, 2, 3 또는 invalid

// 직접 cast하면 위험
absl::LogSeverity bad = static_cast<absl::LogSeverity>(proto_severity);
// proto_severity가 99라면? — UB 가능성

// Good
absl::LogSeverity good = absl::NormalizeLogSeverity(proto_severity);
// 0~3 범위 밖이면 kInfo(아래) 또는 kFatal(위)로 clamp
```

구현은 단순하다.

```cpp
// 의사 코드
constexpr LogSeverity NormalizeLogSeverity(int s) {
    if (s < static_cast<int>(LogSeverity::kInfo))    return LogSeverity::kInfo;
    if (s > static_cast<int>(LogSeverity::kFatal))   return LogSeverity::kFatal;
    return static_cast<LogSeverity>(s);
}
```

오버로드도 있다.

```cpp
constexpr LogSeverity NormalizeLogSeverity(LogSeverity s);  // identity
constexpr LogSeverity NormalizeLogSeverity(int s);          // clamp
```

## 왜 `LogSeverity::kInfo`인가 — naming

Abseil은 enum class를 쓰면서 멤버 이름에 `k` 접두사를 붙인다. Google C++ Style Guide의 enum 멤버 명명 규칙.

```cpp
// Abseil 스타일
enum class LogSeverity {
    kInfo,
    kWarning,
    kError,
    kFatal,
};

// 다른 라이브러리에서 흔히 보는 스타일
enum class Severity {
    INFO,
    WARNING,
    ERROR,
    FATAL,
};
```

대문자 매크로(`INFO`, `ERROR`)와의 충돌을 피하기 위해서다. Windows.h가 `ERROR`를 매크로로 정의해 두기 때문에 그냥 `Severity::ERROR`는 일부 환경에서 깨진다. `k` 접두사가 이 충돌을 우회한다.

호환을 위해 별칭이 제공된다.

```cpp
// LogSeverity::kInfo도 가능, INFO 매크로 호환도 LOG(INFO)에서 처리
LOG(INFO) << "...";  // 내부적으로 absl::LogSeverity::kInfo로 변환
```

## 외부 시스템과의 매핑

대표적인 매핑 예시.

### syslog와의 매핑

```cpp
int ToSyslog(absl::LogSeverity s) {
    switch (s) {
        case absl::LogSeverity::kInfo:    return 6;  // LOG_INFO
        case absl::LogSeverity::kWarning: return 4;  // LOG_WARNING
        case absl::LogSeverity::kError:   return 3;  // LOG_ERR
        case absl::LogSeverity::kFatal:   return 2;  // LOG_CRIT
    }
}
```

### glog와의 매핑 (호환)

Abseil 로깅이 glog의 후속이므로 glog 사용자는 거의 그대로 마이그레이션 가능하다.

```cpp
// glog
google::INFO   // == 0
google::WARNING // == 1
google::ERROR  // == 2
google::FATAL  // == 3

// Abseil — 같은 정수 값
absl::LogSeverity::kInfo     // 0
absl::LogSeverity::kWarning  // 1
absl::LogSeverity::kError    // 2
absl::LogSeverity::kFatal    // 3
```

### Python logging과의 매핑

```cpp
int ToPython(absl::LogSeverity s) {
    switch (s) {
        case absl::LogSeverity::kInfo:    return 20;  // INFO
        case absl::LogSeverity::kWarning: return 30;  // WARNING
        case absl::LogSeverity::kError:   return 40;  // ERROR
        case absl::LogSeverity::kFatal:   return 50;  // CRITICAL
    }
}
```

DEBUG(10) 단계는 별도로 처리한다. Abseil은 `VLOG(level)`로 매핑한다.

## 코드 리뷰 포인트

```cpp
// 회피 — 외부 정수를 직접 cast
auto s = static_cast<absl::LogSeverity>(user_input);

// Good — Normalize
auto s = absl::NormalizeLogSeverity(user_input);
```

```cpp
// 회피 — LogSeverity를 int로 비교
if (static_cast<int>(severity) >= 2) {
    // 매직 넘버. 의도 불명확.
}

// Good
if (severity >= absl::LogSeverity::kError) {
    // enum class의 operator>= 사용
}
```

```cpp
// 회피 — switch에 default를 두고 새 case 추가를 잊는 코드
switch (s) {
    case absl::LogSeverity::kInfo: return Handle(s);
    default: return HandleDefault();
}
// LogSeverity가 5단계가 되면? — default가 silent하게 잡아먹음

// Good — 모든 case 명시, default 없음
switch (s) {
    case absl::LogSeverity::kInfo:    return HandleInfo();
    case absl::LogSeverity::kWarning: return HandleWarning();
    case absl::LogSeverity::kError:   return HandleError();
    case absl::LogSeverity::kFatal:   return HandleFatal();
}
// 컴파일러가 -Wswitch로 누락된 case 경고
```

## 자주 보는 안티패턴

```cpp
// 회피 — LOG(FATAL) 이후의 코드
LOG(FATAL) << "Bad state";
DoCleanup();  // 실행 안 됨
return 0;     // 도달 불가능

// Good — FATAL이 abort한다는 걸 명시
LOG(FATAL) << "Bad state";  // [[noreturn]] 효과
// 함수 끝
```

```cpp
// 회피 — LOG(FATAL)을 control flow에 의존
if (something_bad) {
    LOG(FATAL) << "...";
} else {
    DoNormal();
}
return Result();
// FATAL은 unrecoverable. 정상 종료 경로에 두지 말 것.
// CHECK 매크로가 더 적합할 때가 많다.
```

```cpp
// 회피 — LogSeverity를 enum이 아니라 string으로
std::string severity = "ERROR";
if (severity == "ERROR") { ... }
// 오타에 취약. enum class를 쓰자.
```

## 정리

- `absl::LogSeverity`는 4단계 enum class. INFO/WARNING/ERROR/FATAL.
- `kFatal`은 abort를 동반. 그 뒤의 코드는 실행되지 않음.
- 외부 정수는 `NormalizeLogSeverity`로 clamp.
- enum 멤버에 `k` 접두사. Windows.h의 `ERROR` 매크로 충돌 회피.
- glog와 ABI 호환되는 정수 값.

## 다음 편

Part 2-04에서 Abseil의 type_traits를 본다. C++17에서 표준화된 `negation`, `conjunction`, `void_t` 같은 utility를 C++14에서도 쓰기 위한 polyfill이 무엇이고, 어떻게 구현되어 있는지.

## 관련 항목

- [Part 2-01: ABSL_HAVE_* / ABSL_ATTRIBUTE_*](/blog/programming/code-review/abseil/part2-01-abseil-macros)
- [Part 2-04: type_traits](/blog/programming/code-review/abseil/part2-04-type-traits)
- [Part 2-07: raw_logging](/blog/programming/code-review/abseil/part2-07-raw-logging)
- [Part 11-01: LOG, VLOG, CHECK](/blog/programming/code-review/abseil/part11-01-log-vlog-check)
- [원문 — absl/base/log_severity.h](https://github.com/abseil/abseil-cpp/blob/master/absl/base/log_severity.h)
