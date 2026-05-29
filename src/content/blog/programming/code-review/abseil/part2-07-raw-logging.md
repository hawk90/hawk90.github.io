---
title: "Part 2-07: raw_logging — heap-free 로깅"
date: 2026-05-23T12:00:00
description: "Part 2-07: raw_logging — heap, exception, mutex 없이 동작하는 로깅. signal handler, ASan early init, OOM 경로."
series: "Abseil Code Review"
seriesOrder: 12
tags: [cpp, abseil, raw-logging, signal-handler, no-dependency, base]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

> **한 줄 요약**: `ABSL_RAW_LOG`는 heap·exception·mutex 없이 동작하는 로깅이다. signal handler, OOM 경로, ASan early init 같은 "일반 로깅이 깨질 수 있는" 상황을 위해 만들어졌다.

## 어떤 문제를 푸는가

일반 로깅 시스템은 다음에 의존한다.

- **heap 할당** — 메시지 buffer, sink 관리
- **mutex** — 멀티스레드 동기화
- **exception** — 일부 실패 경로
- **static initialization** — sink 등록

대부분의 시간엔 문제없다. 그러나 몇 가지 경로에서는 이 의존성이 깨진다.

| 시나리오 | 깨지는 것 |
|---|---|
| signal handler 안 | mutex (async-signal-safety 위반) |
| OOM 상황 | heap |
| static 초기화 중 | 다른 static에 대한 의존 |
| ASan/MSan 초기화 중 | 모든 라이브러리 |
| 어셈블리·아주 낮은 레벨 코드 | 모두 |

이런 곳에서 안전한 로깅이 `ABSL_RAW_LOG`다.

## API

```cpp
#include "absl/base/internal/raw_logging.h"

ABSL_RAW_LOG(INFO, "message");
ABSL_RAW_LOG(ERROR, "failed: %d", error_code);
ABSL_RAW_LOG(FATAL, "fatal: %s", msg);

ABSL_RAW_CHECK(condition, "assertion message");
```

C-style format string을 쓴다. C++ stream-style이 아닌 이유는 stream 객체가 heap 할당을 할 수 있기 때문이다.

## 내부 구현

`raw_logging`은 다음 함수에만 의존한다.

```cpp
// 의사 코드
namespace absl::raw_log_internal {

void RawLog(LogSeverity severity, const char* file, int line,
            const char* format, ...);

void RawLogDoLog(LogSeverity severity, const char* file, int line,
                 const char* format, va_list args) {
    char buffer[kLogBufSize];  // stack에 fixed-size buffer
    int n = vsnprintf(buffer, kLogBufSize, format, args);
    
    // 단순 write() syscall — heap, exception, mutex 없음
    write(STDERR_FILENO, buffer, std::min(n, kLogBufSize - 1));
    write(STDERR_FILENO, "\n", 1);
    
    if (severity == LogSeverity::kFatal) {
        std::abort();
    }
}

}  // namespace absl::raw_log_internal
```

세 가지 핵심 결정.

1. **stack buffer** — heap 할당 없음. 메시지 크기 제한 (대략 1KB).
2. **write() syscall 직접 호출** — fprintf 같은 buffered I/O 안 씀.
3. **mutex 없음** — 다른 스레드의 raw_log와 메시지가 섞일 수 있음. 정확성보다 안전성 우선.

## 사용 시나리오

### Signal handler 안

```cpp
void SegvHandler(int sig) {
    // signal handler는 async-signal-safe 함수만 호출 가능
    // 일반 LOG는 mutex 잡으므로 unsafe
    ABSL_RAW_LOG(ERROR, "SIGSEGV at pid %d", getpid());
    abort();
}

signal(SIGSEGV, SegvHandler);
```

### OOM 경로

```cpp
void* AllocateOrDie(size_t n) {
    void* p = malloc(n);
    if (ABSL_PREDICT_FALSE(!p)) {
        // 일반 LOG가 heap을 더 쓸 수 있다. RAW_LOG가 안전.
        ABSL_RAW_LOG(FATAL, "OOM: failed to allocate %zu bytes", n);
    }
    return p;
}
```

### Static 초기화

```cpp
namespace {
// global static 객체의 ctor
struct InitOnStartup {
    InitOnStartup() {
        // 다른 static 객체의 초기화 순서 보장 안 됨
        // 일반 LOG는 자기 초기화에 의존하므로 깨질 수 있음
        ABSL_RAW_LOG(INFO, "Module X initializing");
    }
} init_x;
}
```

### ASan early init

ASan 같은 sanitizer는 자신의 초기화 과정에서 메모리 할당을 후크한다. 사용자 코드의 일반 로깅이 그 시점에 동작하지 않을 수 있다. ASan 자체가 RAW_LOG에 의존하는 사례가 있다.

## ABSL_RAW_CHECK

assertion 매크로의 RAW 버전.

```cpp
ABSL_RAW_CHECK(ptr != nullptr, "ptr must not be null");
// 조건이 false면 RAW_LOG(FATAL) + abort()
```

`CHECK` 매크로가 일반 로깅에 의존하는 반면, `RAW_CHECK`는 위 경로 어디서나 안전하다.

## 의도적으로 빠진 기능

`raw_logging`이 일반 로깅보다 단순한 만큼 못 하는 것이 많다.

- **sink 미지원** — 항상 stderr로만.
- **structured log 미지원** — key-value 페어 없음.
- **C++ stream syntax 미지원** — `<<` 연산자 없음.
- **filter 미지원** — severity 기반 컷오프만.
- **rate limit 미지원** — 같은 메시지가 폭주할 수 있음.

이 모든 미지원은 의도된 것이다. 더 적은 의존성을 위한 트레이드오프.

## 코드 리뷰 포인트

```cpp
// 회피 — signal handler에서 일반 LOG
void Handler(int sig) {
    LOG(ERROR) << "got signal " << sig;  // unsafe
    abort();
}

// Good
void Handler(int sig) {
    ABSL_RAW_LOG(ERROR, "got signal %d", sig);
    abort();
}
```

```cpp
// 회피 — RAW_LOG를 일상적으로 사용
void Process() {
    ABSL_RAW_LOG(INFO, "processing");  // sink, formatting 등 못 씀
}

// Good — 일반 코드는 일반 LOG
void Process() {
    LOG(INFO) << "processing";
}
```

```cpp
// 회피 — RAW_LOG에 stream syntax
ABSL_RAW_LOG(INFO, "value: " << x);  // 컴파일 에러
// RAW_LOG는 printf-style.

// Good
ABSL_RAW_LOG(INFO, "value: %d", x);
```

리뷰에서:

1. **signal handler 안에서 일반 LOG를 쓰는가** — async-signal-safety 검토.
2. **OOM/static-init 경로에서 일반 LOG를 쓰는가** — RAW_LOG로 옮길지.
3. **RAW_LOG를 unnecessary하게 쓰는가** — 일반 코드는 LOG이 적합.

## 자주 보는 안티패턴

```cpp
// 회피 — RAW_LOG에 std::string
std::string msg = absl::StrCat("value: ", x);
ABSL_RAW_LOG(INFO, "%s", msg.c_str());
// std::string 자체가 heap을 쓸 수 있다. RAW의 의도와 모순.

// Good — char buffer
char buf[64];
snprintf(buf, sizeof(buf), "value: %d", x);
ABSL_RAW_LOG(INFO, "%s", buf);
// 또는 format string에 직접
ABSL_RAW_LOG(INFO, "value: %d", x);
```

```cpp
// 회피 — RAW_LOG를 hot path에
for (int i = 0; i < 1000000; ++i) {
    ABSL_RAW_LOG(INFO, "iter %d", i);  // syscall * 1M회
}
// stderr buffered I/O이 아니므로 매우 느림.

// Good — 일반 LOG이거나 logging 자체를 제거
```

```cpp
// 회피 — large message
char buf[10000];
snprintf(buf, sizeof(buf), "...");
ABSL_RAW_LOG(INFO, "%s", buf);
// RAW_LOG의 내부 buffer는 보통 1KB. 잘림.

// Good — 짧은 핵심만 RAW_LOG
ABSL_RAW_LOG(ERROR, "OOM at module %s", module_name);
```

## std와의 비교

표준 C++에는 비교할 만한 것이 없다.

- `std::cerr` — buffered, mutex 잡힘.
- `fprintf(stderr, ...)` — buffer가 있을 수 있음. heap 미사용은 보장.
- `write(STDERR_FILENO, ...)` — RAW_LOG의 기반. format을 직접 처리해야 함.

`ABSL_RAW_LOG`는 `write()` syscall에 format string 처리만 얹은 가장 얇은 계층이다.

## 다른 라이브러리의 유사 도구

- **glog의 RAW_LOG** — Abseil이 거의 그대로 이어받음.
- **Folly의 `folly::log_to_stderr_async_safe`** — async-signal-safe 보장.
- **Linux 커널의 `printk`** — 비슷한 철학(분리된 ring buffer + 단순 write).

## 정리

- `ABSL_RAW_LOG`는 heap·mutex·exception 없이 동작하는 로깅.
- signal handler, OOM, static init, ASan early init 같은 곳에서만 사용.
- C-style format string만. C++ stream syntax 없음.
- 일반 코드는 일반 LOG가 적합. RAW_LOG의 트레이드오프는 안전성을 위해 기능을 포기한 것.

## 다음 편

Part 2-08에서 `thread_annotations`를 본다. clang의 thread safety analysis가 mutex 사용을 어떻게 컴파일 시점에 검사하는지, `ABSL_GUARDED_BY` 같은 매크로의 효과를 다룬다.

## 관련 항목

- [Part 2-03: absl::LogSeverity](/blog/programming/code-review/abseil/part2-03-log-severity)
- [Part 2-08: thread_annotations](/blog/programming/code-review/abseil/part2-08-thread-annotations)
- [Part 11-01: LOG, VLOG, CHECK](/blog/programming/code-review/abseil/part11-01-log-vlog-check)
- [Part 11-04: Stack trace / failure_signal_handler](/blog/programming/code-review/abseil/part11-04-stack-trace-handler)
- [원문 — absl/base/internal/raw_logging.h](https://github.com/abseil/abseil-cpp/blob/master/absl/base/internal/raw_logging.h)
