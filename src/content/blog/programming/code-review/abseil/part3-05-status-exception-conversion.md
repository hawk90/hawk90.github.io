---
title: "absl::Status ↔ exception 변환 패턴"
date: 2026-06-10T09:02:00
description: "Part 3-05: Status와 exception/std::error_code/gRPC status 사이 변환 — 라이브러리 경계에서의 안전한 처리."
series: "Abseil Code Review"
seriesOrder: 18
tags: [cpp, abseil, status, exception, error-code, grpc, interop]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

> **한 줄 요약**: Status 기반 코드와 exception 기반 외부 라이브러리, gRPC status, `std::error_code` 사이 변환은 라이브러리 *경계*에서만 일어나야 한다. 변환이 코드 곳곳에서 일어나면 디버깅도 성능도 잃는다.

## 어떤 문제를 푸는가

Google 스타일은 exception 없음. 그러나 실제 코드베이스는 exception을 던지는 외부 라이브러리(`std::filesystem`, `nlohmann::json`, 일부 third-party)와 공존해야 한다. 동시에 gRPC, std::error_code, 시스템 errno와도 통신해야 한다.

변환 규칙이 필요하다.

1. **언제 변환하는가** — 라이브러리 경계에서 한 번.
2. **어느 방향으로** — 내부는 Status, 경계에서 변환.
3. **정보 손실 최소화** — 양쪽의 추가 정보 보존.

## 원칙: 경계에서만

```cpp
// 회피 — 함수마다 변환
std::string ReadFile(const std::string& path) {
    try {
        return std::filesystem::read_file(path);
    } catch (const std::filesystem::filesystem_error& e) {
        throw std::runtime_error(e.what());
    }
}

absl::StatusOr<std::string> Process() {
    try {
        return ReadFile("...");
    } catch (...) {
        return absl::InternalError("...");
    }
}

// Good — 한 경계에서만
absl::StatusOr<std::string> ReadFileSafe(const std::string& path) {
    try {
        return std::filesystem::read_file(path);
    } catch (const std::filesystem::filesystem_error& e) {
        return absl::Status(ToStatusCode(e.code()), e.what());
    }
}

// 그 이후로는 Status 흐름
absl::StatusOr<std::string> Process() {
    return ReadFileSafe("...");
}
```

`try-catch`를 한 함수에 캡슐화하고, 그 외에는 Status 흐름.

## exception → Status

표준 exception을 Status로 매핑.

```cpp
absl::Status ToStatus(const std::exception& e) {
    // 가장 안전한 fallback
    return absl::InternalError(e.what());
}

absl::Status ToStatus(const std::system_error& e) {
    return absl::Status(ToStatusCode(e.code()), e.what());
}

absl::Status ToStatus(const std::filesystem::filesystem_error& e) {
    return absl::Status(ToStatusCode(e.code()), e.what());
}

absl::Status ToStatus(const std::bad_alloc&) {
    return absl::ResourceExhaustedError("out of memory");
}

absl::Status ToStatus(const std::out_of_range& e) {
    return absl::OutOfRangeError(e.what());
}

absl::Status ToStatus(const std::invalid_argument& e) {
    return absl::InvalidArgumentError(e.what());
}
```

catch all 패턴.

```cpp
template <typename F>
auto CallSafely(F&& f) -> absl::StatusOr<decltype(f())> {
    try {
        return f();
    } catch (const std::exception& e) {
        return ToStatus(e);
    } catch (...) {
        return absl::InternalError("unknown exception");
    }
}

// 사용
absl::StatusOr<int> result = CallSafely([] {
    return external_library::do_something();  // throws
});
```

`void` 반환의 경우 SFINAE로 분기. 또는 두 overload.

## Status → exception

`-fexceptions` 빌드에서 Status를 exception으로 변환해야 할 때.

```cpp
class StatusException : public std::exception {
public:
    explicit StatusException(absl::Status s) : status_(std::move(s)) {}
    const char* what() const noexcept override {
        return status_.message().data();
    }
    const absl::Status& status() const { return status_; }
private:
    absl::Status status_;
};

void ThrowIfNotOk(const absl::Status& s) {
    if (!s.ok()) throw StatusException(s);
}
```

`-fno-exceptions` 빌드에서는 throw 대신 LOG(FATAL).

```cpp
void DieIfNotOk(const absl::Status& s) {
    if (!s.ok()) {
        LOG(FATAL) << "operation failed: " << s;
    }
}
```

CHECK 매크로의 변형도 있다.

```cpp
#define CHECK_OK(expr) \
    do { \
        absl::Status _s = (expr); \
        if (ABSL_PREDICT_FALSE(!_s.ok())) { \
            LOG(FATAL) << "CHECK_OK failed: " << #expr << ": " << _s; \
        } \
    } while (0)

CHECK_OK(DoCriticalOp());
```

## std::error_code ↔ Status

POSIX errno 기반.

```cpp
absl::Status FromErrno(int err) {
    return absl::ErrnoToStatus(err, "");
}

absl::Status FromErrnoMessage(int err, absl::string_view ctx) {
    return absl::ErrnoToStatus(err, ctx);
}
```

`absl::ErrnoToStatus`는 Abseil이 제공. errno를 canonical code로 매핑.

```cpp
// 의사 코드
absl::Status ErrnoToStatus(int err, absl::string_view msg) {
    auto code = [err]() {
        switch (err) {
            case EACCES: case EPERM: return absl::StatusCode::kPermissionDenied;
            case EEXIST:              return absl::StatusCode::kAlreadyExists;
            case ENOENT:              return absl::StatusCode::kNotFound;
            case EINVAL:              return absl::StatusCode::kInvalidArgument;
            case ENOMEM:              return absl::StatusCode::kResourceExhausted;
            case ETIMEDOUT:           return absl::StatusCode::kDeadlineExceeded;
            case ENOSYS:              return absl::StatusCode::kUnimplemented;
            default:                  return absl::StatusCode::kUnknown;
        }
    }();
    return absl::Status(code,
        absl::StrCat(msg, msg.empty() ? "" : ": ", strerror(err)));
}
```

`std::error_code`도 비슷하게.

```cpp
absl::Status FromErrorCode(const std::error_code& ec) {
    if (!ec) return absl::OkStatus();
    if (ec.category() == std::generic_category()) {
        return ErrnoToStatus(ec.value(), "");
    }
    return absl::UnknownError(ec.message());
}
```

## gRPC Status ↔ Abseil Status

gRPC의 status code는 Abseil의 canonical code와 1:1 일치.

```cpp
#include <grpcpp/grpcpp.h>

absl::Status FromGrpcStatus(const grpc::Status& gs) {
    return absl::Status(
        static_cast<absl::StatusCode>(gs.error_code()),
        gs.error_message());
}

grpc::Status ToGrpcStatus(const absl::Status& s) {
    return grpc::Status(
        static_cast<grpc::StatusCode>(s.code()),
        std::string(s.message()));
}
```

payload까지 변환하는 경우.

```cpp
absl::Status FromGrpcStatusWithDetails(const grpc::Status& gs) {
    auto s = FromGrpcStatus(gs);
    
    google::rpc::Status proto;
    if (proto.ParseFromString(gs.error_details())) {
        for (const auto& detail : proto.details()) {
            s.SetPayload(detail.type_url(), absl::Cord(detail.value()));
        }
    }
    return s;
}
```

## 코드 리뷰 포인트

```cpp
// 회피 — 매 함수마다 try-catch
absl::StatusOr<X> MyFunc() {
    try {
        return ExternalLib::DoIt();
    } catch (...) {
        return absl::InternalError("...");
    }
}
// 호출 chain 전체에서 반복.

// Good — wrapper에서 한 번
absl::StatusOr<X> ExternalLibSafe::DoIt() {
    try { ... }
    catch (...) { ... }
}
absl::StatusOr<X> MyFunc() {
    return ExternalLibSafe::DoIt();  // 이미 Status 흐름
}
```

```cpp
// 회피 — Status를 silent하게 throw로 변환
void Process() {
    auto s = SomeOp();
    if (!s.ok()) throw std::runtime_error(s.message());  // 정보 손실
}

// Good — StatusException 사용
void Process() {
    auto s = SomeOp();
    if (!s.ok()) throw StatusException(s);  // Status 전체 보존
}
```

```cpp
// 회피 — errno를 직접 노출
int err = ...;
return absl::InternalError(absl::StrCat("errno=", err));

// Good — ErrnoToStatus
return absl::ErrnoToStatus(err, "while reading file");
```

리뷰에서:

1. **try-catch가 함수마다 반복되지 않는가** — wrapper로 통합.
2. **변환 시 정보 손실이 없는가** — canonical code, payload 보존.
3. **errno/error_code를 raw로 노출하지 않는가**.

## 자주 보는 안티패턴

```cpp
// 회피 — exception을 catch해서 OK Status로
try {
    DoSomething();
    return absl::OkStatus();
} catch (...) {
    return absl::OkStatus();  // 에러를 silent하게 삼킴
}

// Good
try {
    DoSomething();
    return absl::OkStatus();
} catch (const std::exception& e) {
    return ToStatus(e);
}
```

```cpp
// 회피 — Status code 무시
absl::Status s = SomeOp();
if (!s.ok()) {
    return absl::InternalError(std::string(s.message()));  // canonical code 잃음
}

// Good — 원본 status 그대로 전파
absl::Status s = SomeOp();
if (!s.ok()) return s;
```

```cpp
// 회피 — exception을 abort로
void Foo() {
    try {
        ExternalLib::DoIt();
    } catch (...) {
        std::abort();  // 너무 폭력적
    }
}

// Good — 분류 가능하면 status, 진짜 invariant 위반이면 LOG(FATAL)
void Foo() {
    try {
        ExternalLib::DoIt();
    } catch (const std::bad_alloc&) {
        LOG(FATAL) << "OOM";  // 회복 불가
    } catch (const std::exception& e) {
        LOG(ERROR) << "operation failed: " << e.what();
        // 호출자에게 전파 가능하면 status로
    }
}
```

## 변환 매트릭스

| from | to | 함수 |
|---|---|---|
| `errno` | `absl::Status` | `absl::ErrnoToStatus(err, ctx)` |
| `std::error_code` | `absl::Status` | 사용자 정의 (위 예시) |
| `grpc::Status` | `absl::Status` | 사용자 정의 (위 예시) |
| `std::exception` | `absl::Status` | `ToStatus(e)` 사용자 정의 |
| `absl::Status` | `grpc::Status` | 사용자 정의 |
| `absl::Status` | `std::exception` | `StatusException(s)` |
| `absl::Status` | abort | `CHECK_OK(s)` |

## 정리

- 변환은 라이브러리 *경계*에서만. 코드 내부는 한 종류 (Status 또는 exception)로 통일.
- `absl::ErrnoToStatus`는 errno → Status 표준.
- gRPC status는 1:1 매핑. payload는 별도 처리.
- exception → Status는 fallback으로 `InternalError`. 가능하면 분류.
- Status → exception은 `StatusException` 같은 wrapper로 정보 보존.

## 다음 편

Part 3을 마치고 Part 4로 넘어간다. Part 4-01에서 `absl::string_view`를 본다. C++17의 `std::string_view`와 어떻게 다른지, lifetime 함정은 어떻게 피하는지 다룬다.

## 관련 항목

- [Part 3-01: absl::Status](/blog/programming/code-review/abseil/part3-01-status)
- [Part 3-02: StatusOr&lt;T&gt;](/blog/programming/code-review/abseil/part3-02-status-or)
- [Part 3-03: status_macros](/blog/programming/code-review/abseil/part3-03-status-macros)
- [Part 3-04: Status payload](/blog/programming/code-review/abseil/part3-04-status-payload)
- [Part 4-01: string_view 개요](/blog/programming/code-review/abseil/part4-01-string-view)
- [Part 11-01: LOG, VLOG, CHECK](/blog/programming/code-review/abseil/part11-01-log-vlog-check)
- [Effective Modern C++: noexcept](/blog/programming/cpp/effective-modern-cpp)
- [원문 — absl/status/status.h ErrnoToStatus](https://github.com/abseil/abseil-cpp/blob/master/absl/status/status.h)
- [원문 — gRPC status codes](https://grpc.io/docs/guides/status-codes/)
