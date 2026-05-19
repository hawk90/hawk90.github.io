---
title: "Part 3-01: absl::Status — exception-free error handling"
date: 2026-05-23T14:00:00
description: "Part 3-01: absl::Status — Google이 exception 없이 production C++ 에러를 다루는 방법. canonical error code, payload, 내부 표현."
series: "Abseil Code Review"
seriesOrder: 14
tags: [cpp, abseil, status, error-handling, no-exception]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

> **한 줄 요약**: `absl::Status`는 Google의 사내 표준 에러 타입이다. exception 없이 에러를 값으로 전달하고, 17개의 canonical code로 종류를 분류하며, ok 경로에서는 포인터 한 개의 크기만 차지하도록 설계되었다.

## 어떤 문제를 푸는가

Google의 C++ 코드베이스는 exception을 거의 쓰지 않는다. 이유는 여러 가지가 있다.

- **성능 예측 가능성** — exception은 throw 비용이 비대칭적으로 크다.
- **ABI 호환** — `-fno-exceptions` 빌드가 일부 환경에서 필수.
- **history** — sub-second latency를 요구하는 시스템에서 exception이 부담.
- **명시성** — 함수 시그니처에서 에러 가능성이 드러남.

대안이 필요했다. `int errno` 같은 C 스타일은 type-safe가 부족하고 메시지를 담을 수 없다. `std::error_code`는 가볍지만 디버깅에 필요한 컨텍스트가 없다. `absl::Status`는 그 사이를 메운다.

## 기본 사용

```cpp
#include "absl/status/status.h"

absl::Status ValidateInput(const Request& req) {
    if (req.name().empty()) {
        return absl::InvalidArgumentError("name must not be empty");
    }
    if (req.age() < 0) {
        return absl::OutOfRangeError(
            absl::StrCat("age must be non-negative, got ", req.age()));
    }
    return absl::OkStatus();
}

void Handle(const Request& req) {
    absl::Status s = ValidateInput(req);
    if (!s.ok()) {
        LOG(ERROR) << s;
        return;
    }
    // ok path
    Process(req);
}
```

핵심 패턴.

1. **성공은 `OkStatus()`**.
2. **실패는 `XxxError(msg)`** 형태의 factory.
3. **호출자는 `s.ok()`로 검사** 또는 매크로(다음 편)로 자동 전파.

## 17개의 Canonical Code

17개 코드를 색으로 분류해 보면 다음과 같다.

![Status canonical codes](/images/blog/abseil/diagrams/part3-01-status-codes.svg)

```cpp
namespace absl {
enum class StatusCode : int {
    kOk = 0,
    kCancelled = 1,
    kUnknown = 2,
    kInvalidArgument = 3,
    kDeadlineExceeded = 4,
    kNotFound = 5,
    kAlreadyExists = 6,
    kPermissionDenied = 7,
    kResourceExhausted = 8,
    kFailedPrecondition = 9,
    kAborted = 10,
    kOutOfRange = 11,
    kUnimplemented = 12,
    kInternal = 13,
    kUnavailable = 14,
    kDataLoss = 15,
    kUnauthenticated = 16,
};
}  // namespace absl
```

이 코드는 gRPC의 error code와 1:1로 일치한다. 같은 분류 체계.

### 각 코드의 의미

| 코드 | 언제 |
|---|---|
| `OK` | 성공 |
| `Cancelled` | 호출자가 취소 (CTRL+C, deadline) |
| `Unknown` | 분류 불가 (다른 시스템에서 변환 시 fallback) |
| `InvalidArgument` | 입력이 형식상 잘못 (검증 실패) |
| `DeadlineExceeded` | 시간 초과 |
| `NotFound` | 요청한 리소스가 없음 |
| `AlreadyExists` | 만들려는 리소스가 이미 있음 |
| `PermissionDenied` | 권한 부족 (인증은 OK, 권한이 부족) |
| `ResourceExhausted` | quota, rate limit 등 |
| `FailedPrecondition` | 시스템 상태가 잘못 (전제 위반) |
| `Aborted` | 동시성 충돌, 트랜잭션 abort |
| `OutOfRange` | 값이 범위 밖 (validation의 하위) |
| `Unimplemented` | 기능 미구현 |
| `Internal` | 내부 invariant 위반 (보통 버그) |
| `Unavailable` | 일시적 장애, retry 가능 |
| `DataLoss` | 데이터 손상/유실 |
| `Unauthenticated` | 인증 실패 |

코드 선택은 의외로 미묘하다. `FailedPrecondition` vs `InvalidArgument` vs `OutOfRange`의 차이가 자주 헷갈린다. gRPC 문서가 가이드라인을 제공한다.

## API 메서드

```cpp
absl::Status s = SomeOp();

// 검사
bool ok = s.ok();
absl::StatusCode code = s.code();
absl::string_view msg = s.message();

// 출력 — 디버깅용
LOG(INFO) << s;  // "INVALID_ARGUMENT: name must not be empty"
std::string str = s.ToString();

// 비교
if (s.code() == absl::StatusCode::kNotFound) { /*...*/ }
```

## 내부 구현 — 8바이트만으로

```cpp
// absl/status/status.h 의사 코드
class Status {
public:
    // ...
private:
    uintptr_t rep_;
    // 하위 비트로 ok/error 구분
    // ok이면 특수 값 (0 또는 특정 마커)
    // error이면 heap-allocated payload를 가리키는 포인터
};

static_assert(sizeof(Status) == sizeof(void*));
```

가장 중요한 최적화. **ok status는 heap 할당 없이 stack에 그대로**. 8바이트.

```cpp
inline Status OkStatus() {
    return Status();  // rep_ = 0 (또는 ok marker)
}

inline bool Status::ok() const {
    return rep_ == kOkRep;  // 단순 비교
}
```

성공 경로가 hot path인 대부분의 코드에서, Status는 사실상 비용이 없다. error 경로에서만 heap 할당이 일어난다.

### error 경로

error status를 만들면 다음이 일어난다.

```cpp
absl::Status MakeError(StatusCode code, absl::string_view msg) {
    // 1. heap allocation
    auto* rep = new StatusRep{
        code,
        std::string(msg),
        // payload map (보통 비어 있음)
    };
    // 2. rep_에 포인터 저장 (low bit로 error 표시)
    return Status(reinterpret_cast<uintptr_t>(rep) | 1);
}
```

`StatusRep`는 reference-counted. status를 복사해도 같은 payload를 가리킨다.

## Factory 함수

각 canonical code에 대응하는 factory가 있다.

```cpp
absl::Status absl::OkStatus();
absl::Status absl::CancelledError(absl::string_view msg);
absl::Status absl::UnknownError(absl::string_view msg);
absl::Status absl::InvalidArgumentError(absl::string_view msg);
absl::Status absl::DeadlineExceededError(absl::string_view msg);
absl::Status absl::NotFoundError(absl::string_view msg);
absl::Status absl::AlreadyExistsError(absl::string_view msg);
absl::Status absl::PermissionDeniedError(absl::string_view msg);
absl::Status absl::ResourceExhaustedError(absl::string_view msg);
absl::Status absl::FailedPreconditionError(absl::string_view msg);
absl::Status absl::AbortedError(absl::string_view msg);
absl::Status absl::OutOfRangeError(absl::string_view msg);
absl::Status absl::UnimplementedError(absl::string_view msg);
absl::Status absl::InternalError(absl::string_view msg);
absl::Status absl::UnavailableError(absl::string_view msg);
absl::Status absl::DataLossError(absl::string_view msg);
absl::Status absl::UnauthenticatedError(absl::string_view msg);
```

대응되는 predicate도 있다.

```cpp
bool absl::IsCancelled(const Status&);
bool absl::IsInvalidArgument(const Status&);
bool absl::IsNotFound(const Status&);
// ... 모든 코드에 대해
```

## 코드 리뷰 포인트

### 적절한 code 선택

```cpp
// 회피 — 모든 에러를 Internal로
return absl::InternalError("something failed");

// Good — 의미 있는 분류
if (input.empty()) return absl::InvalidArgumentError("input is empty");
if (!exists) return absl::NotFoundError(absl::StrCat("not found: ", key));
if (!has_permission) return absl::PermissionDeniedError("admin only");
```

`Internal`은 "이건 진짜 내부 버그"일 때만. 외부 입력으로 인한 에러는 `InvalidArgument` / `OutOfRange` / `FailedPrecondition`.

### 메시지에 충분한 컨텍스트

```cpp
// 회피 — 정보 부족
return absl::NotFoundError("not found");

// Good — 무엇이 어디서 누락됐는지
return absl::NotFoundError(
    absl::StrCat("user not found: id=", user_id, " in table=", table));
```

### Status를 무시하지 말 것

```cpp
// 회피
SomeOp();  // Status 반환값을 버림 — 경고도 안 남

// Good
absl::Status s = SomeOp();
if (!s.ok()) {
    LOG(ERROR) << s;
    return s;
}
```

`absl::Status`는 `[[nodiscard]]`이므로 컴파일러가 무시를 경고한다. 그래도 명시적 처리가 권장.

## 자주 보는 안티패턴

```cpp
// 회피 — bool 반환 + 별도 에러 메시지
bool DoIt(std::string* err_msg);
if (!DoIt(&msg)) {
    LOG(ERROR) << msg;
}
// Status가 둘을 한 번에 표현.

// Good
absl::Status DoIt();
if (auto s = DoIt(); !s.ok()) LOG(ERROR) << s;
```

```cpp
// 회피 — exception을 catch 후 Status로 변환을 매번
try {
    DoExternal();
} catch (const std::exception& e) {
    return absl::InternalError(e.what());
}
// catch는 Abseil 코드의 끝(public API boundary)에서만.

// Good — 가능하면 exception 안 던지는 라이브러리 선택
// 어쩔 수 없으면 wrapper에서 한 번만 변환
```

```cpp
// 회피 — Status를 const Status&가 아닌 값으로 받아 modify
absl::Status TryIt() {
    absl::Status s = SomeOp();
    s = absl::OkStatus();  // 원본 무시
    return s;
}

// Good
absl::Status TryIt() {
    if (auto s = SomeOp(); !s.ok()) {
        // 처리
    }
    return absl::OkStatus();
}
```

## std와의 비교

| 도구 | 장점 | 단점 |
|---|---|---|
| `std::error_code` | 가벼움 (16바이트), 표준 | 메시지 없음, error category 등록 복잡 |
| C++ exception | 컴파일러 통합 | runtime 비용, ABI 영향 |
| `bool` + out param | 단순 | 메시지·코드 분리 |
| `absl::Status` | 메시지·코드·payload 통합, OK 경로 zero-overhead | Abseil 의존 |

`std::expected` (C++23)이 일부 역할을 대체할 수 있지만, canonical code 체계와 payload 시스템은 Abseil 고유.

## 정리

- `absl::Status`는 exception 없는 Google 표준 에러 타입.
- ok 경로는 8바이트 stack, error 경로는 heap-allocated payload.
- 17개의 canonical code (gRPC와 일치).
- factory 함수와 predicate가 모든 코드에 대해 제공.
- `Internal`은 진짜 내부 버그일 때만. 외부 입력 에러는 `InvalidArgument`/`NotFound` 등.

## 다음 편

Part 3-02에서 `absl::StatusOr<T>`를 본다. "값이거나 에러"를 한 type으로 표현하는 패턴이고, 함수가 보통 반환하는 값과 에러를 합쳐서 다룬다.

## 관련 항목

- [Part 3-02: StatusOr&lt;T&gt;](/blog/programming/code-review/abseil/part3-02-status-or)
- [Part 3-03: status_macros](/blog/programming/code-review/abseil/part3-03-status-macros)
- [Part 3-04: Status payload](/blog/programming/code-review/abseil/part3-04-status-payload)
- [Part 3-05: Status ↔ exception](/blog/programming/code-review/abseil/part3-05-status-exception-conversion)
- [Part 2-07: raw_logging](/blog/programming/code-review/abseil/part2-07-raw-logging) — Status 출력 경로
- [Effective Modern C++: Item 4 — return types](/blog/programming/cpp/effective-modern-cpp)
- [원문 — absl::Status](https://abseil.io/docs/cpp/guides/status)
- [gRPC error codes](https://grpc.io/docs/guides/status-codes/)
