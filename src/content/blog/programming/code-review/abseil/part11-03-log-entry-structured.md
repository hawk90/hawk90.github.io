---
title: "Part 11-03: LogEntry / structured logging"
date: 2026-05-25T15:00:00
description: "absl::LogEntry — 한 로그 항목의 메타데이터(severity, timestamp, source location, message). 구조화 로깅의 기반."
series: "Abseil Code Review"
seriesOrder: 61
tags: [cpp, abseil, log, structured, entry]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## LogEntry — Sink가 보는 인터페이스

`LogSink::Send`가 받는 `absl::LogEntry`는 *한 로그 호출의 모든 메타데이터*를 노출한다.

```cpp
class LogEntry {
public:
    absl::LogSeverity log_severity() const;
    int verbosity() const;                 // VLOG 레벨, LOG는 kNoVerbosityLevel
    absl::Time timestamp() const;
    absl::LogEntry::tid_t tid() const;     // thread id
    absl::string_view source_filename() const;
    absl::string_view source_basename() const;
    int source_line() const;
    bool prefix() const;                   // 헤더 포함 여부

    absl::string_view text_message() const;             // 본문만
    absl::string_view text_message_with_prefix() const; // "Iyyyymmdd ..." 포함

    // 구조화 (future-friendly)
    bool is_perror() const;
    absl::string_view text_message_with_prefix_and_newline() const;
};
```

이걸 활용해 다음을 자동 추출한다.

- `severity`로 alert 라우팅
- `source_filename + line`으로 검색 키
- `timestamp`로 시계열 인덱스
- `tid`로 thread별 trace

## JSON 변환 예

```cpp
class JsonSink : public absl::LogSink {
public:
    void Send(const absl::LogEntry& entry) override {
        absl::flat_hash_map<std::string, std::string> kv = {
            {"severity", absl::LogSeverityName(entry.log_severity())},
            {"ts", absl::FormatTime(absl::RFC3339_full, entry.timestamp(), absl::UTCTimeZone())},
            {"file", std::string(entry.source_basename())},
            {"line", absl::StrCat(entry.source_line())},
            {"tid", absl::StrCat(entry.tid())},
            {"msg", std::string(entry.text_message())},
        };
        std::cerr << ToJson(kv) << "\n";
    }
};
```

ELK·Loki·CloudWatch 등 *JSON 한 줄* 입력을 받는 시스템에 그대로 송신 가능.

## 구조화 로깅의 진짜 의미

전통적 텍스트 로그:

```text
I20260525 13:00:00 12345 user.cc:42] user 123 logged in from 10.0.0.5
```

이 한 줄에서 `user_id`, `ip`를 *정규식으로 파싱* 해야 한다. 메시지 형식이 바뀌면 파서가 깨진다.

구조화 로깅은 *key-value를 처음부터 분리*.

```json
{"severity":"INFO","ts":"2026-05-25T13:00:00Z","file":"user.cc","line":42,
 "msg":"user logged in","user_id":123,"ip":"10.0.0.5"}
```

Abseil의 `LogEntry`는 기본 metadata만 분리한다. *사용자 페이로드의 key-value*는 직접 인코딩해야 한다.

## 커스텀 field 추가 — 메시지에 인코딩

가장 단순한 방법은 *메시지 본문에 구조화 토큰*을 박는 것.

```cpp
LOG(INFO) << "user_login user_id=" << user.id << " ip=" << client_ip;
```

sink에서 메시지를 파싱(`absl::StrSplit`)해 KV 추출. 표준화가 안 된 만큼 *팀 컨벤션* 이 중요.

더 형식적인 접근은 `absl::Cord`나 protobuf 페이로드를 직렬화해 메시지에 담는 것. 하지만 Abseil은 직접적인 structured 필드 API를 아직 노출하지 않는다.

## 코드 리뷰 패턴

```cpp
// 회피 — 문자열 보간으로 KV
LOG(INFO) << "user " << id << " from " << ip << " action " << action;
// 파싱이 어려움 (key가 명시 안 됨)

// Good — key=value 형식 통일
LOG(INFO) << "user_login user_id=" << id << " ip=" << ip << " action=" << action;
```

```cpp
// 회피 — 메시지를 동적으로 만들어 검색이 어려움
LOG(INFO) << absl::StrCat("user ", id, " ", action_string);

// Good — 고정 prefix + 동적 부분 분리
LOG(INFO) << "audit event=" << action_string << " user_id=" << id;
```

prefix가 *grep 가능한 고정 토큰* 이어야 운영 중 검색이 쉽다.

## logging 레벨 활용

`LogEntry::log_severity()`를 보고 destination을 나눈다.

```cpp
void Send(const absl::LogEntry& entry) override {
    switch (entry.log_severity()) {
        case absl::LogSeverity::kError:
        case absl::LogSeverity::kFatal:
            SendToAlerts(entry);
            break;
        default:
            SendToLogs(entry);
    }
}
```

ERROR 이상만 PagerDuty, 나머지는 일반 로그 시스템.

## source location 활용

```cpp
void Send(const absl::LogEntry& entry) override {
    // file:line을 자동 태그로
    std::string tag = absl::StrCat(entry.source_basename(), ":", entry.source_line());
    metrics->Increment("log_count", {{"location", tag}});
}
```

자주 발생하는 ERROR의 *위치* 가 자동으로 metric label이 된다. 운영 중 hotspot 발견에 유용.

## 시간 정밀도

`entry.timestamp()`는 `absl::Time`. 나노초 정밀도지만 *RFC3339_full* 출력 시 ns까지 포함된다. 분산 trace 상관관계에 충분.

```cpp
absl::FormatTime(absl::RFC3339_full, entry.timestamp(), absl::UTCTimeZone());
// "2026-05-25T13:00:00.123456789+00:00"
```

## 작은 예시 — Loki/Cloud-friendly JSON sink

```cpp
class LokiSink : public absl::LogSink {
public:
    LokiSink(std::string service, std::string env)
        : service_(std::move(service)), env_(std::move(env)) {}

    void Send(const absl::LogEntry& entry) override {
        absl::Time ts = entry.timestamp();
        std::string line = absl::StrCat(
            "{\"ts\":\"", absl::FormatTime(absl::RFC3339_full, ts, absl::UTCTimeZone()), "\",",
            "\"service\":\"", service_, "\",",
            "\"env\":\"", env_, "\",",
            "\"severity\":\"", absl::LogSeverityName(entry.log_severity()), "\",",
            "\"file\":\"", entry.source_basename(), ":", entry.source_line(), "\",",
            "\"tid\":", entry.tid(), ",",
            "\"msg\":\"", EscapeJson(entry.text_message()), "\"}\n");

        queue_.Push(std::move(line));   // 비동기 worker가 HTTP POST
    }

    void Flush() override { queue_.Drain(); }

private:
    std::string service_;
    std::string env_;
    AsyncQueue queue_;
};

// 등록
LokiSink loki("user-svc", "prod");
absl::AddLogSink(&loki);
```

## 정리

- `LogEntry`는 한 로그 호출의 모든 메타데이터(severity, ts, file/line, tid, msg) 노출.
- JSON·protobuf 직렬화로 구조화 로깅 가능. *사용자 KV*는 메시지에 직접 인코딩.
- `severity`로 destination 분기, `source_basename:line`으로 자동 metric label.
- 시간은 ns 정밀도 — RFC3339_full로 분산 trace 상관 가능.
- 검색 친화적 prefix(`audit event=...` 형식) 컨벤션이 중요.

## 다음 장 예고

[Part 11-04: Stack trace / failure_signal_handler](/blog/programming/code-review/abseil/part11-04-stack-trace-handler) — crash 진단.

## 관련 항목

- [Part 11-01: LOG, VLOG, CHECK](/blog/programming/code-review/abseil/part11-01-log-vlog-check)
- [Part 11-02: LogSink](/blog/programming/code-review/abseil/part11-02-log-sink)
- [Part 7-02: Format / Parse](/blog/programming/code-review/abseil/part7-02-format-parse) — RFC3339 timestamp
- [원문 — LogEntry](https://abseil.io/docs/cpp/guides/logging#log-entries)
