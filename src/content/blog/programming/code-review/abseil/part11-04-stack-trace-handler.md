---
title: "Abseil Stack trace·failure_signal_handler"
date: 2026-06-12T09:14:00
description: "absl::Symbolize, GetStackTrace, InstallFailureSignalHandler — crash 시점에 stack을 찍어 남기는 진단 인프라."
series: "Abseil Code Review"
seriesOrder: 62
tags: [cpp, abseil, log, stack-trace, signal]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 왜 crash 시 stack trace인가

production에서 SIGSEGV·SIGABRT가 일어났을 때 *어디서* 죽었는지 알 수 없으면 디버깅이 불가능하다. core dump가 있더라도 분석에 시간이 걸린다. Abseil의 failure signal handler는 *프로세스가 죽기 직전에 stack을 찍어 stderr/로그에 남긴다*.

```cpp
#include "absl/debugging/failure_signal_handler.h"
#include "absl/debugging/symbolize.h"

int main(int argc, char** argv) {
    absl::InitializeSymbolizer(argv[0]);
    absl::FailureSignalHandlerOptions opts;
    absl::InstallFailureSignalHandler(opts);

    // ... 이후 SIGSEGV·CHECK 실패 등이 일어나면 stack trace 출력
}
```

두 줄로 production crash diagnostic이 켜진다.

## 어떤 signal을 처리하나

기본적으로 다음 signal에 hooked.

| Signal | 의미 |
|--------|------|
| `SIGSEGV` | invalid memory access |
| `SIGILL` | invalid instruction |
| `SIGFPE` | floating point error |
| `SIGABRT` | abort (CHECK 실패) |
| `SIGTERM` | termination (옵션) |
| `SIGBUS` | bus error |
| `SIGTRAP` | trap |

각 signal에 대해 *signal handler가 stack을 찍고 *원래 handler*에게 위임* → 정상 종료 흐름 유지.

## InitializeSymbolizer — 심볼 매핑

`InitializeSymbolizer(argv[0])`는 실행 파일을 읽어 *address → 함수 이름* 매핑을 준비한다. 호출하지 않으면 stack trace에 raw 주소(`0x12345678`)만 남는다.

```cpp
// 회피
absl::InstallFailureSignalHandler({});
// SIGSEGV 시: "0x7f8a3c1b2d40" — 의미 없음

// Good
absl::InitializeSymbolizer(argv[0]);
absl::InstallFailureSignalHandler({});
// SIGSEGV 시: "myapp::Server::HandleRequest(Request const&)" 같이 풀림
```

stripped binary는 함수 이름이 일부만 풀린다. release 빌드에서도 *디버그 정보 분리* (`-g + objcopy --only-keep-debug`) 패턴이면 풀 수 있다.

## GetStackTrace — 직접 호출

crash 외에도 임의 시점에 stack을 캡처할 수 있다.

```cpp
#include "absl/debugging/stacktrace.h"

void DumpStack() {
    constexpr int kMax = 64;
    void* frames[kMax];
    int n = absl::GetStackTrace(frames, kMax, /*skip_count=*/1);

    for (int i = 0; i < n; ++i) {
        char buf[256];
        if (absl::Symbolize(frames[i], buf, sizeof(buf))) {
            LOG(INFO) << "  " << buf;
        } else {
            LOG(INFO) << "  " << frames[i];
        }
    }
}
```

leak 진단, race 발견 시 누가 호출했는지 등 임의 진단에 활용.

## FailureSignalHandlerOptions

```cpp
struct FailureSignalHandlerOptions {
    bool symbolize_stacktrace = true;
    bool use_alternate_stack = true;   // signal handler가 별도 스택 사용
    int alarm_on_failure_secs = 3;      // 핸들러가 hang하면 N초 후 abort

    void (*writerfn)(const char*) = nullptr;   // 출력 함수 커스터마이즈
    void (*call_previous_handler)(int signo) = nullptr;
};
```

| 옵션 | 권장값 | 비고 |
|------|--------|------|
| `symbolize_stacktrace` | true | 함수 이름 풀이 |
| `use_alternate_stack` | true | stack overflow 후에도 작동 |
| `alarm_on_failure_secs` | 3~10 | 무한 hang 방지 |
| `writerfn` | nullptr (기본 stderr) | custom logger로 보낼 때만 |

## use_alternate_stack — stack overflow 대비

stack overflow로 SIGSEGV가 나면 *기존 스택이 가득 차서 핸들러도 못 돈다*. `use_alternate_stack = true`는 별도 페이지에 핸들러 전용 스택을 둬서 이걸 막는다.

## CHECK 실패와의 연동

`CHECK(...)` 실패 시 내부적으로 `abort()` → SIGABRT → 우리가 등록한 handler. 따라서 *CHECK 실패도 자동으로 stack trace*가 함께 남는다.

```cpp
CHECK(ptr != nullptr) << "internal";
// 실패 시:
// F20260525 13:00:00 12345 myfile.cc:42] Check failed: ptr != nullptr internal
// *** Check failure stack trace: ***
//   absl::log_internal::LogMessage::Flush()
//   MyClass::Init()
//   main
```

## 출력 라우팅 — writerfn

기본은 stderr. file/syslog로 보내려면 `writerfn`을 등록.

```cpp
void WriteToFile(const char* s) {
    static int fd = ::open("/var/log/crash.log", O_CREAT | O_WRONLY | O_APPEND, 0644);
    ::write(fd, s, strlen(s));
}

absl::FailureSignalHandlerOptions opts;
opts.writerfn = WriteToFile;
absl::InstallFailureSignalHandler(opts);
```

`writerfn`은 *async-signal-safe* 해야 한다. malloc·printf·LOG 등은 금지. `write(2)` 직접 호출만 안전.

## 멀티스레드 환경

failure handler는 *죽은 스레드*만 stack을 찍는다. 다른 스레드의 상태는 모름. 추가 thread state가 필요하면:

```cpp
opts.call_previous_handler = ExtendedDumper;   // 이전 handler 호출 후 추가 작업
```

라이브러리 함수와 충돌하지 않도록 가능한 *최소한* 만.

## 작은 예시 — server boot

```cpp
int main(int argc, char** argv) {
    absl::ParseCommandLine(argc, argv);

    // 1. symbolizer 먼저 — failure handler가 의존
    absl::InitializeSymbolizer(argv[0]);

    // 2. failure handler
    absl::FailureSignalHandlerOptions opts;
    opts.use_alternate_stack = true;
    opts.alarm_on_failure_secs = 5;
    absl::InstallFailureSignalHandler(opts);

    // 3. 로그 초기화
    absl::InitializeLog();

    LOG(INFO) << "boot complete";
    RunServer();
    return 0;
}
```

순서 중요: symbolize → failure handler → log.

## 회피 패턴

```cpp
// 회피 — argv[0] 안 넘김
absl::InitializeSymbolizer("");   // ❌ 심볼 풀이 안 됨

// Good
absl::InitializeSymbolizer(argv[0]);
```

```cpp
// 회피 — handler 안에서 LOG
opts.writerfn = [](const char* s) { LOG(ERROR) << s; };   // ❌ async-signal-unsafe

// Good — write 직접
opts.writerfn = [](const char* s) { ::write(STDERR_FILENO, s, strlen(s)); };
```

```cpp
// 회피 — release 빌드에서 디버그 정보 모두 strip
// strip myapp   # ❌ 함수 이름 못 풉
// → debug symbol 분리 패턴 사용
```

## 정리

- `InitializeSymbolizer(argv[0])` + `InstallFailureSignalHandler(opts)` — production crash diagnostic.
- SIGSEGV/SIGABRT/SIGFPE 등 자동 hook. CHECK 실패도 함께 처리.
- `use_alternate_stack` — stack overflow 대비. `alarm_on_failure_secs` — hang 방지.
- `GetStackTrace`/`Symbolize`로 임의 시점 stack 캡처 가능.
- `writerfn`은 async-signal-safe 해야 함 — write(2)만.

## 다음 장 예고

[Part 12-01: ABSL_FLAG 정의](/blog/programming/code-review/abseil/part12-01-absl-flag-define) — command-line flag.

## 관련 항목

- [Part 11-01: LOG, VLOG, CHECK](/blog/programming/code-review/abseil/part11-01-log-vlog-check) — CHECK 실패
- [Part 11-02: LogSink](/blog/programming/code-review/abseil/part11-02-log-sink)
- [Part 2-07: raw_logging](/blog/programming/code-review/abseil/part2-07-raw-logging) — async-signal-safe logging
- [원문 — Failure Signal Handler](https://abseil.io/docs/cpp/guides/logging#failure-signal-handlers)
