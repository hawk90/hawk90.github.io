---
title: "Part 11-01: LOG, VLOG, CHECK"
date: 2026-05-25T13:00:00
description: "Abseil logging 기본 매크로 — severity, verbose level, fatal check. glog의 후속이자 Google 표준."
series: "Abseil Code Review"
seriesOrder: 59
tags: [cpp, abseil, log, check, vlog]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## absl::log의 위치

Google은 오랜 기간 *glog* 를 사용해 왔다. Abseil의 `absl/log/`는 glog의 후속이며 인터페이스가 거의 동일하다.

```cpp
#include "absl/log/log.h"
#include "absl/log/check.h"

LOG(INFO) << "user " << user_id << " logged in";
LOG(WARNING) << "slow query: " << elapsed;
LOG(ERROR) << "failed to send: " << status;

CHECK(ptr != nullptr) << "ptr must be set";
CHECK_EQ(actual, expected) << "mismatch";
```

스트림 인터페이스(`operator<<`)가 표준이다. 인자가 `absl::AlphaNum` 호환이면(거의 모든 primitive·string·`absl::Time` 등) 자동 변환.

## Severity 레벨

| 매크로 | 의미 | 보통 동작 |
|--------|------|----------|
| `LOG(INFO)` | 정보 | stderr/파일 |
| `LOG(WARNING)` | 경고 | stderr/파일 |
| `LOG(ERROR)` | 에러 | stderr/파일 + alert |
| `LOG(FATAL)` | 치명 | 로그 후 *abort* |
| `LOG(QFATAL)` | 조용한 fatal | stack trace 없이 종료 |
| `LOG(DFATAL)` | debug=FATAL, release=ERROR | 개발 중에만 abort |

`FATAL`은 *반드시 종료*. 절대 호출 후 코드가 실행되지 않는다고 가정한다(`noreturn` 표시).

## 초기화 — InitializeLog

`main`에서 한 번 호출.

```cpp
#include "absl/log/initialize.h"

int main(int argc, char** argv) {
    absl::ParseCommandLine(argc, argv);
    absl::InitializeLog();
    // ... 이후 LOG 사용 가능
}
```

호출 전에는 `LOG`가 안전히 *raw fallback*으로 동작(stderr에 단순 출력)한다. 그러나 sink·level 설정이 적용되지 않으므로 production 코드는 초기화를 잊지 말 것.

## 출력 포맷

기본 출력은 다음과 같은 한 줄이다.

```text
I20260525 13:00:00.123456 12345 file.cc:42] user 123 logged in
```

- `I` — severity 첫 글자 (I/W/E/F)
- 타임스탬프 — UTC, ms 정밀도
- thread id
- 소스 파일 + 라인
- 본문

`--log_format`/`--stderrthreshold` 같은 flag로 조절 가능.

## VLOG — verbose level

INFO보다 자세한 정보를 *조건부* 로 남긴다.

```cpp
VLOG(1) << "step 1 details";
VLOG(2) << "step 1 inner detail";
VLOG(3) << "raw payload: " << payload;
```

`--v=2` 같은 flag로 활성화. 2 이하 레벨만 출력. 비활성 상태에서는 *인자 평가도 안 일어남* (`if (VLOG_IS_ON(2))` 등가).

```cpp
VLOG(2) << "expensive: " << ComputeDump();   // ComputeDump 호출 안 됨 — --v < 2
```

이 lazy evaluation 덕에 production에서 자유롭게 VLOG를 뿌려도 비용 없음.

## CHECK — runtime assertion

`assert`보다 강한 invariant. *release 빌드에서도* 활성화.

```cpp
CHECK(ptr != nullptr) << "ptr required";
CHECK_EQ(a, b) << "expected a == b, got " << a << " vs " << b;
CHECK_NE(x, 0);
CHECK_LT(idx, size);
CHECK_GE(count, 0);
```

실패 시 `LOG(FATAL)` → stack trace + abort. 메시지는 *실패 직전에만* 평가되어 lazy.

```cpp
CHECK(x.IsValid()) << "x=" << x.DebugDump();   // DebugDump는 실패 시에만 호출
```

## DCHECK — debug 한정

CHECK의 debug-only 버전. release 빌드에서는 *완전히 사라진다*.

```cpp
DCHECK(invariant) << "...";    // -DNDEBUG에서 no-op
DCHECK_EQ(size, expected);
```

성능에 민감한 hot path에서 *비싼* invariant 검증에 적합.

## QCHECK — quiet check

QFATAL의 짝. 실패 시 stack trace 없이 종료.

```cpp
QCHECK(absl::ParseFlag(input, &v, &err)) << "bad input: " << err;
```

flag·configuration 검증처럼 *사용자 입력* 에러는 stack trace가 노이즈가 되므로 QCHECK가 깔끔하다.

## LOG_EVERY_N / LOG_FIRST_N

쏟아지는 로그를 *제한*.

```cpp
LOG_EVERY_N(WARNING, 100) << "rare event";   // 100번에 한 번
LOG_FIRST_N(INFO, 5) << "first 5 only";      // 처음 5번만
LOG_EVERY_N_SEC(INFO, 10) << "every 10s";    // 10초에 한 번
```

내부적으로 *thread-local counter*. 멀티스레드에서는 정확한 N마다가 아니라 *근사*. 디버그 dump 용도면 충분.

## 매크로의 효율

`LOG(INFO)`는 `if (Enabled(INFO))` 검사를 인라인으로 한다. 비활성 severity면 *분기 한 번* 이면 끝나고 메시지 인자 평가도 일어나지 않는다.

```cpp
LOG(VERBOSE) << ExpensiveDump();   // VERBOSE 비활성이면 ExpensiveDump 호출 안 됨
```

## 작은 예시 — 요청 핸들러

```cpp
absl::Status HandleRequest(const Request& req) {
    VLOG(1) << "request: " << req.DebugString();

    CHECK(!req.user_id().empty()) << "user_id required";

    auto user = LookupUser(req.user_id());
    if (!user.ok()) {
        LOG(WARNING) << "lookup failed for " << req.user_id() << ": " << user.status();
        return user.status();
    }

    auto resp = Process(*user, req);
    if (!resp.ok()) {
        LOG(ERROR) << "process failed: " << resp.status();
        return resp.status();
    }

    LOG_EVERY_N(INFO, 1000) << "processed " << req.user_id();
    return absl::OkStatus();
}
```

## 회피 패턴

```cpp
// 회피 — std::cerr / printf
std::cerr << "error: " << status << "\n";   // ❌ thread-unsafe interleaving
printf("%s\n", msg.c_str());                // ❌ format 안 맞을 수 있음

// Good
LOG(ERROR) << "error: " << status;
```

```cpp
// 회피 — LOG가 비싼 경우에도 항상 평가
LOG(INFO) << "dump: " << ExpensiveDump();   // INFO 비활성이면 낭비

// Good — VLOG로 lazy
VLOG(1) << "dump: " << ExpensiveDump();
```

```cpp
// 회피 — CHECK 대신 if + return
if (!ptr) return absl::InternalError("null");   // ⚠️ invariant 위반인데 복구?

// Good — invariant이면 CHECK
CHECK(ptr != nullptr) << "internal invariant";
```

CHECK는 *불변식 위반은 곧 버그* 라는 의미. 사용자 입력 검증은 `Status`로.

## 정리

- `LOG(severity)`로 스트림 인터페이스. severity별 destination.
- `VLOG(N)` + `--v=N` — 조건부 verbose. 비활성 시 인자 평가 안 됨.
- `CHECK`/`CHECK_EQ`/`CHECK_NE` 등 — release 빌드에서도 활성. invariant 위반 시 abort.
- `DCHECK` — debug 한정. release에서 사라짐.
- `LOG_EVERY_N` 계열로 로그 스팸 억제.

## 다음 장 예고

[Part 11-02: LogSink](/blog/programming/code-review/abseil/part11-02-log-sink) — 출력 대상 커스터마이징.

## 관련 항목

- [Part 2-07: raw_logging](/blog/programming/code-review/abseil/part2-07-raw-logging) — 초기화 전·재진입 안전 logging
- [Part 3-01: absl::Status](/blog/programming/code-review/abseil/part3-01-status)
- [Part 11-04: Stack trace / failure_signal_handler](/blog/programming/code-review/abseil/part11-04-stack-trace-handler)
- [원문 — Abseil Log](https://abseil.io/docs/cpp/guides/logging)
