---
title: "Part 11-02: LogSink"
date: 2026-05-25T14:00:00
description: "absl::LogSink — 출력 destination 커스터마이징. 파일·syslog·원격 collector·테스트 캡처."
series: "Abseil Code Review"
seriesOrder: 60
tags: [cpp, abseil, log, sink, customization]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## LogSink의 자리

`LOG(INFO) << "..."`이 stderr뿐 아니라 파일·syslog·원격 시스템으로 가게 하려면 *LogSink*를 등록한다.

```cpp
#include "absl/log/log_sink.h"
#include "absl/log/log_sink_registry.h"

class MySink : public absl::LogSink {
public:
    void Send(const absl::LogEntry& entry) override {
        // 한 줄 로그가 들어올 때마다 호출
        std::cerr << "[CUSTOM] " << entry.text_message() << "\n";
    }
};

MySink my_sink;
absl::AddLogSink(&my_sink);
// ... LOG 호출들 ...
absl::RemoveLogSink(&my_sink);
```

여러 sink가 동시에 등록 가능. 각 LOG 한 번에 모든 sink의 `Send`가 호출된다.

## 기본 sink

Abseil은 다음을 기본 제공.

| Sink | 용도 |
|------|------|
| stderr sink | `--stderrthreshold` 이상 로그를 stderr로 |
| file sink (옵션) | `--log_dir` 지정 시 파일에 기록 |

stderr sink는 자동 활성. 파일 sink는 *명시적으로 만들거나 flag로 활성* 한다.

## LogSink 인터페이스

```cpp
class LogSink {
public:
    virtual ~LogSink() = default;

    // 주된 메서드 — 매 로그 entry마다 호출
    virtual void Send(const absl::LogEntry& entry) = 0;

    // 선택적 — Send 후 flush 보장 필요 시
    virtual void Flush() {}
};
```

`Send`는 *동기적* 으로 호출되며 호출자 스레드 안에서 실행된다. 비싼 작업(네트워크 전송)은 큐로 분리.

## 비동기 큐 sink — 표준 패턴

network sink는 보통 다음과 같이 구성.

```cpp
class AsyncSink : public absl::LogSink {
public:
    void Send(const absl::LogEntry& entry) override {
        // 1. 동기적으로 가벼운 직렬화
        Record r{
            .severity = entry.log_severity(),
            .timestamp = entry.timestamp(),
            .message = std::string(entry.text_message()),
        };
        // 2. 락 한 번 + queue push
        absl::MutexLock lock(&mu_);
        queue_.push_back(std::move(r));
        cv_.SignalAll();
    }

    void Flush() override {
        absl::MutexLock lock(&mu_);
        while (!queue_.empty()) cv_.Wait(&mu_);
    }

private:
    void Worker() {
        // 별도 스레드에서 큐를 비우고 네트워크로 전송
    }

    absl::Mutex mu_;
    std::deque<Record> queue_ ABSL_GUARDED_BY(mu_);
    absl::CondVar cv_;
};
```

`Send`는 *짧게* 끝내고, 실제 네트워크 IO는 worker 스레드. LOG 호출이 IO 지연으로 막히지 않게 한다.

## 등록 / 해제

```cpp
absl::AddLogSink(&my_sink);     // 등록
absl::RemoveLogSink(&my_sink);  // 해제
```

등록·해제는 thread-safe. 다만 `RemoveLogSink` 호출 후 `Send`가 한 번 더 일어날 수 있다(`RemoveLogSink`는 이전 호출의 완료를 보장하지 않음). 안전한 종료는 다음 패턴.

```cpp
absl::RemoveLogSink(&my_sink);
my_sink.Flush();   // 진행 중 Send 완료 보장
absl::FlushLogSinks();   // 전역 flush
// 이제 my_sink 파괴 가능
```

## ScopedMockLog — 테스트 캡처

테스트에서 *특정 로그가 일어났는지* 검증.

```cpp
#include "absl/log/scoped_mock_log.h"

TEST(MyTest, LogsWarning) {
    absl::ScopedMockLog log;
    EXPECT_CALL(log, Log(absl::LogSeverity::kWarning, ::testing::_,
                         ::testing::HasSubstr("slow")));
    log.StartCapturingLogs();

    DoSlowOperation();   // LOG(WARNING) << "slow ..." 발생 예상
}
```

`ScopedMockLog`는 destructor에서 자동 해제. gmock의 `EXPECT_CALL` 패턴과 호환.

## File sink — 직접 만들기

Abseil은 file sink를 *기본 노출하지 않는다*(설계상 사용자가 정책 결정). 간단한 직접 구현:

```cpp
class FileSink : public absl::LogSink {
public:
    explicit FileSink(absl::string_view path) : f_(std::fopen(std::string(path).c_str(), "a")) {}
    ~FileSink() { if (f_) std::fclose(f_); }

    void Send(const absl::LogEntry& entry) override {
        absl::MutexLock lock(&mu_);
        if (!f_) return;
        std::string formatted = absl::StrCat(
            entry.text_message_with_prefix(), "\n");
        std::fwrite(formatted.data(), 1, formatted.size(), f_);
    }

    void Flush() override {
        absl::MutexLock lock(&mu_);
        if (f_) std::fflush(f_);
    }

private:
    absl::Mutex mu_;
    std::FILE* f_ ABSL_GUARDED_BY(mu_);
};
```

production에서는 rotation·crash-safety 등을 고려한 lib(예: spdlog) 위에 sink wrapper를 두는 게 보통.

## 다중 destination 통합

```cpp
StderrSink stderr_sink;       // 콘솔
FileSink file_sink("/var/log/svc.log");
AsyncSink remote_sink(...);   // Loki, Splunk 등

absl::AddLogSink(&stderr_sink);
absl::AddLogSink(&file_sink);
absl::AddLogSink(&remote_sink);
```

각 sink는 *모든* 로그를 받는다. 특정 severity만 받고 싶으면 sink 안에서 분기.

```cpp
void Send(const absl::LogEntry& entry) override {
    if (entry.log_severity() < absl::LogSeverity::kWarning) return;
    // ...
}
```

## 회피 패턴

```cpp
// 회피 — Send 안에서 비싼 IO
void Send(const absl::LogEntry& entry) override {
    HttpPost("/log", absl::StrCat(...));   // ❌ LOG 호출자가 네트워크 대기
}

// Good — 큐 + worker
```

```cpp
// 회피 — sink 안에서 다시 LOG 호출
void Send(const absl::LogEntry& entry) override {
    LOG(ERROR) << "sink error: " << ...;   // ❌ 재진입 — 데드락 가능
}

// Good — std::cerr 또는 raw_logging
ABSL_RAW_LOG(ERROR, "sink error: %s", ...);
```

```cpp
// 회피 — sink lifetime 관리 부주의
{
    MySink s;
    absl::AddLogSink(&s);
}   // ❌ s 소멸 후에도 등록 상태
// → 다음 LOG에서 댕글링
```

스택 변수를 sink로 쓸 때는 destructor에서 반드시 `RemoveLogSink`.

## 정리

- `absl::LogSink`를 상속해 `Send(const LogEntry&)`만 구현하면 새 destination.
- `AddLogSink`/`RemoveLogSink`로 동적 등록·해제. 여러 sink 동시 가능.
- 비싼 IO는 *큐 + worker* 패턴. `Send`는 짧게.
- sink 안에서 LOG 재호출 금지 — 데드락. `raw_logging` 사용.
- 테스트에는 `ScopedMockLog`로 매처 기반 검증.

## 다음 장 예고

[Part 11-03: LogEntry / structured logging](/blog/programming/code-review/abseil/part11-03-log-entry-structured) — 메타데이터 활용.

## 관련 항목

- [Part 11-01: LOG, VLOG, CHECK](/blog/programming/code-review/abseil/part11-01-log-vlog-check)
- [Part 6-01: absl::Mutex](/blog/programming/code-review/abseil/part6-01-mutex) — sink의 동기화
- [Part 2-07: raw_logging](/blog/programming/code-review/abseil/part2-07-raw-logging)
- [원문 — LogSink](https://abseil.io/docs/cpp/guides/logging#sinks)
