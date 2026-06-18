---
title: "absl::Status payload — 구조화된 에러 컨텍스트"
date: 2026-06-10T09:01:00
description: "Part 3-04: Status payload — URL-based key로 구조화된 컨텍스트를 첨부, gRPC error_details와 연동."
series: "Abseil Code Review"
seriesOrder: 17
tags: [cpp, abseil, status, payload, debugging, grpc]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

> **한 줄 요약**: `absl::Status`의 payload는 메시지 외에 구조화된 데이터를 첨부하는 메커니즘이다. URL-based key로 namespace를 분리해 라이브러리 간 충돌을 막고, gRPC error_details와의 연동을 위해 설계되었다.

## 어떤 문제를 푸는가

에러 메시지만으로는 부족한 경우가 있다.

```cpp
return absl::FailedPreconditionError(
    "rate limit exceeded; retry after 5 seconds; user=alice");
```

- **읽기 어려움** — 사람이 파싱해야 함.
- **자동 처리 불가** — UI가 "5초 후 재시도" 카운트다운 표시 못 함.
- **확장 어려움** — 새 정보 추가하려면 메시지 형식 합의 필요.

구조화된 데이터가 필요하다. Status payload가 그것이다.

```cpp
auto s = absl::FailedPreconditionError("rate limit exceeded");
s.SetPayload(
    "type.googleapis.com/google.rpc.RetryInfo",
    SerializeRetryInfo({.retry_after = absl::Seconds(5)}));
// 호출자는 payload를 꺼내 자동 처리 가능
```

## API

```cpp
class Status {
public:
    // payload 설정
    void SetPayload(absl::string_view type_url, absl::Cord payload);
    
    // payload 조회
    absl::optional<absl::Cord> GetPayload(absl::string_view type_url) const;
    
    // 모든 payload 순회
    void ForEachPayload(
        absl::FunctionRef<void(absl::string_view, const absl::Cord&)> visitor
    ) const;
    
    // payload 제거
    bool ErasePayload(absl::string_view type_url);
};
```

`absl::Cord`는 큰 string을 효율적으로 다루는 type. payload는 보통 직렬화된 protobuf다.

## URL-based key

key가 string이 아니라 *URL*인 것이 핵심이다.

```cpp
// 잘 정의된 namespace
"type.googleapis.com/google.rpc.RetryInfo"
"type.googleapis.com/google.rpc.DebugInfo"
"type.googleapis.com/google.rpc.QuotaFailure"

// 사용자 정의
"myorg.example.com/MyError"
"github.com/myproject/internal/error_type"
```

이유는 충돌 방지. 라이브러리 A가 "rate_limit"이라는 key를 쓰고 라이브러리 B도 같은 key를 쓰면 곱하기. URL은 자연스럽게 namespace를 분리한다.

Google은 `type.googleapis.com/<protobuf message name>` 형식을 표준으로 정했다. protobuf의 `Any` type과 같은 컨벤션.

## gRPC error_details와의 통합

gRPC는 status에 구조화된 에러 정보를 담는 방법으로 [google.rpc.Status](https://github.com/googleapis/googleapis/blob/master/google/rpc/status.proto)를 정의한다. `details` 필드가 임의의 protobuf를 담는다.

```protobuf
message Status {
    int32 code = 1;
    string message = 2;
    repeated google.protobuf.Any details = 3;
}
```

Abseil의 Status payload는 이 `details`와 1:1 매핑된다.

```cpp
// gRPC에서 받은 status를 Abseil status로 변환
absl::Status FromGrpcStatus(const grpc::Status& gs) {
    absl::Status s(static_cast<absl::StatusCode>(gs.error_code()),
                   gs.error_message());
    
    // details를 payload로 옮김
    google::rpc::Status proto_status;
    if (proto_status.ParseFromString(gs.error_details())) {
        for (const auto& detail : proto_status.details()) {
            s.SetPayload(detail.type_url(), absl::Cord(detail.value()));
        }
    }
    return s;
}
```

## 표준 protobuf 메시지

Google이 제공하는 표준 error detail은 [google.rpc.error_details](https://github.com/googleapis/googleapis/tree/master/google/rpc) 정의에 있다.

| Type URL | 용도 |
|---|---|
| `RetryInfo` | 재시도 권장 시간 |
| `DebugInfo` | 디버깅용 stack trace, detail |
| `QuotaFailure` | quota 초과 항목 목록 |
| `PreconditionFailure` | 전제 위반의 종류 |
| `BadRequest` | 잘못된 필드 목록 |
| `RequestInfo` | 원래 요청 식별자 |
| `ResourceInfo` | 영향받은 리소스 |
| `Help` | 도움말 링크 |
| `LocalizedMessage` | 사용자에게 보여줄 다국어 메시지 |

이 protobuf들을 사용하면 gRPC ecosystem 전체와 호환된다.

## 사용 예시

### RetryInfo

```cpp
#include "google/rpc/error_details.pb.h"

absl::Status MakeRateLimitError() {
    auto s = absl::ResourceExhaustedError("rate limit exceeded");
    
    google::rpc::RetryInfo retry;
    retry.mutable_retry_delay()->set_seconds(5);
    s.SetPayload(
        "type.googleapis.com/google.rpc.RetryInfo",
        absl::Cord(retry.SerializeAsString()));
    
    return s;
}

void HandleError(const absl::Status& s) {
    auto retry_data = s.GetPayload("type.googleapis.com/google.rpc.RetryInfo");
    if (retry_data) {
        google::rpc::RetryInfo retry;
        retry.ParseFromString(std::string(*retry_data));
        absl::Duration delay = absl::Seconds(retry.retry_delay().seconds())
                             + absl::Nanoseconds(retry.retry_delay().nanos());
        // 자동 재시도 스케줄링
        ScheduleRetry(delay);
    }
}
```

### BadRequest — 필드 검증

```cpp
absl::Status ValidateUser(const User& u) {
    if (u.name().empty() && u.email().empty()) {
        google::rpc::BadRequest bad;
        if (u.name().empty()) {
            auto* v = bad.add_field_violations();
            v->set_field("name");
            v->set_description("must not be empty");
        }
        if (u.email().empty()) {
            auto* v = bad.add_field_violations();
            v->set_field("email");
            v->set_description("must not be empty");
        }
        
        auto s = absl::InvalidArgumentError("validation failed");
        s.SetPayload("type.googleapis.com/google.rpc.BadRequest",
                     absl::Cord(bad.SerializeAsString()));
        return s;
    }
    return absl::OkStatus();
}
```

UI는 어느 필드가 잘못됐는지 정확히 알 수 있다.

## 내부 구현

```cpp
// 의사 코드
class StatusRep {
    StatusCode code;
    std::string message;
    
    // payload는 보통 없음 — error의 일부 시나리오에서만
    std::unique_ptr<absl::flat_hash_map<std::string, absl::Cord>> payloads;
};
```

payload는 lazy. 첫 SetPayload 호출 시점에 hash map 할당. payload가 없는 status는 추가 메모리 비용 없음.

이 lazy 구조는 "대부분의 error는 payload 없음"이라는 관측을 활용한다. payload는 RPC boundary나 자동 처리가 필요한 특수 케이스에서만 쓰이고, 일상적인 validation error에는 message만 충분하다.

## 코드 리뷰 포인트

```cpp
// 회피 — 그냥 string으로 구조화된 정보 인코딩
return absl::FailedPreconditionError(
    absl::StrCat("retry_after=", 5, "; user=", user));

// Good — payload 사용
auto s = absl::FailedPreconditionError("rate limit");
google::rpc::RetryInfo r;
r.mutable_retry_delay()->set_seconds(5);
s.SetPayload("type.googleapis.com/google.rpc.RetryInfo",
             absl::Cord(r.SerializeAsString()));
return s;
```

```cpp
// 회피 — URL 형식 안 지킴
s.SetPayload("my_error", payload);
// 충돌 위험. 다른 라이브러리도 "my_error"를 쓸 수 있음.

// Good — namespace 명시
s.SetPayload("myorg.example.com/MyError", payload);
```

```cpp
// 회피 — payload에 raw binary 직접 넣기
s.SetPayload("...", absl::Cord(reinterpret_cast<const char*>(&data), sizeof(data)));
// portability, versioning, language compatibility 문제.

// Good — protobuf 또는 다른 명시적 직렬화
s.SetPayload("...", absl::Cord(my_message.SerializeAsString()));
```

리뷰에서:

1. **메시지에 구조화 정보를 인코딩하지 않았는가** — payload로 옮길 것.
2. **URL이 namespace 분리되어 있는가**.
3. **payload가 protobuf 같은 portable 형식인가**.

## 자주 보는 안티패턴

```cpp
// 회피 — payload를 너무 자주 사용
return absl::NotFoundError("user not found").SetPayload(...);
// 단순한 NotFound는 message만으로 충분.
// payload는 자동 처리가 필요할 때만.
```

```cpp
// 회피 — payload type을 caller마다 다르게
// Server A: SetPayload("retry_info_v1", ...);
// Server B: SetPayload("RetryInfo", ...);
// 표준 URL을 모르고 각자 정의.

// Good — Google 표준 URL 사용
"type.googleapis.com/google.rpc.RetryInfo"
```

```cpp
// 회피 — payload를 message에도 중복 인코딩
auto s = absl::InvalidArgumentError(
    absl::StrCat("validation failed: field=", field));
s.SetPayload("...", SerializeBadRequest({field}));
// message는 사람용 요약, payload는 기계용 구조. 분리.

// Good
auto s = absl::InvalidArgumentError("validation failed");
s.SetPayload("...", SerializeBadRequest({field}));
```

## std와의 비교

표준 C++에는 비교할 만한 것이 없다. `std::error_code`에는 message조차 첨부할 수 없다. `std::exception`은 message 하나뿐.

언어 비교:

| 언어 | 메커니즘 |
|---|---|
| Rust | `Error::source()` chain |
| Go | `errors.Wrap`, `error.As()` |
| Java | exception chain |
| Python | `__cause__`, custom attributes |
| C++ (Abseil) | URL-keyed payload map |

Abseil의 URL key는 protobuf `Any` type에서 차용. cross-language portability를 노린 설계다.

## 정리

- `absl::Status::SetPayload`는 메시지 외에 구조화된 데이터를 첨부.
- key는 URL 형식. namespace 충돌 방지.
- gRPC `error_details`와 1:1 매핑.
- Google이 표준 error_details protobuf 제공 (RetryInfo, BadRequest 등).
- 일상적인 에러에는 불필요. RPC boundary, 자동 처리 시에 사용.

## 다음 편

Part 3-05에서 Status와 exception 사이 변환을 본다. exception을 던지는 라이브러리와 Status 기반 코드를 어떻게 묶고, gRPC status / std::error_code와는 어떻게 변환하는지.

## 관련 항목

- [Part 3-01: absl::Status](/blog/programming/code-review/abseil/part3-01-status)
- [Part 3-02: StatusOr&lt;T&gt;](/blog/programming/code-review/abseil/part3-02-status-or)
- [Part 3-03: status_macros](/blog/programming/code-review/abseil/part3-03-status-macros)
- [Part 3-05: Status ↔ exception](/blog/programming/code-review/abseil/part3-05-status-exception-conversion)
- [원문 — google.rpc.error_details](https://github.com/googleapis/googleapis/tree/master/google/rpc)
- [원문 — absl/status/status.h SetPayload](https://github.com/abseil/abseil-cpp/blob/master/absl/status/status.h)
- [gRPC Richer Error Model](https://grpc.io/docs/guides/error/#richer-error-model)
