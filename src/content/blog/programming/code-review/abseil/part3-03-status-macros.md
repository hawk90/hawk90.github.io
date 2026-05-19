---
title: "Part 3-03: status_macros — ASSIGN_OR_RETURN / RETURN_IF_ERROR"
date: 2026-05-23T16:00:00
description: "Part 3-03: RETURN_IF_ERROR와 ASSIGN_OR_RETURN — 에러 전파를 한 줄로. 매크로 expansion 분석과 안전한 사용법."
series: "Abseil Code Review"
seriesOrder: 16
tags: [cpp, abseil, status, macros, error-handling]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

> **한 줄 요약**: `RETURN_IF_ERROR`와 `ASSIGN_OR_RETURN`은 Status/StatusOr의 장황한 에러 전파를 한 줄로 줄인다. Google 사내에서는 사실상 표준 패턴이고, 매크로 expansion에 몇 가지 미묘한 트릭이 들어 있다.

## 어떤 문제를 푸는가

`absl::Status` / `absl::StatusOr<T>`를 그대로 쓰면 코드의 절반이 에러 검사가 된다.

```cpp
absl::Status Process(const std::string& path) {
    absl::Status s1 = ValidatePath(path);
    if (!s1.ok()) return s1;
    
    auto r1 = LoadConfig(path);
    if (!r1.ok()) return r1.status();
    Config config = *std::move(r1);
    
    auto r2 = CreateServer(config);
    if (!r2.ok()) return r2.status();
    Server server = *std::move(r2);
    
    return RunServer(&server);
}
```

매크로로 단축.

```cpp
absl::Status Process(const std::string& path) {
    RETURN_IF_ERROR(ValidatePath(path));
    ASSIGN_OR_RETURN(Config config, LoadConfig(path));
    ASSIGN_OR_RETURN(Server server, CreateServer(config));
    return RunServer(&server);
}
```

같은 의미. 노이즈가 4분의 1.

## RETURN_IF_ERROR

```cpp
#define RETURN_IF_ERROR(expr) \
    do { \
        const absl::Status _absl_status_ = (expr); \
        if (ABSL_PREDICT_FALSE(!_absl_status_.ok())) return _absl_status_; \
    } while (0)
```

핵심 구조.

1. `do { ... } while (0)` 패턴 — if-else 안에서 안전하게 쓸 수 있게.
2. `const Status _absl_status_` 임시 변수에 캐싱 — 인자가 함수 호출이면 두 번 평가되지 않음.
3. `ABSL_PREDICT_FALSE` — ok 경로가 hot path임을 컴파일러에 힌트.

매크로 이름은 내부 식별자(`_absl_status_`)를 쓴다. 사용자 코드의 변수와 충돌하지 않게.

### 사용 예시

```cpp
RETURN_IF_ERROR(DoStep1());
RETURN_IF_ERROR(DoStep2());

if (cond) RETURN_IF_ERROR(DoIfCond());  // do-while로 안전

for (int i = 0; i < n; ++i) {
    RETURN_IF_ERROR(DoOne(i));
}
```

## ASSIGN_OR_RETURN

StatusOr 버전. 값 추출과 에러 전파를 동시에.

```cpp
// 기본 형태
ASSIGN_OR_RETURN(Config config, LoadConfig(path));

// 풀면
auto _absl_tmp_ = LoadConfig(path);
if (!_absl_tmp_.ok()) return _absl_tmp_.status();
Config config = *std::move(_absl_tmp_);
```

매크로 expansion의 진짜 모습은 더 복잡하다.

```cpp
// 의사 코드
#define ASSIGN_OR_RETURN(lhs, rexpr) \
    ASSIGN_OR_RETURN_IMPL(\
        ABSL_INTERNAL_CONCAT(_status_or_, __LINE__), lhs, rexpr)

#define ASSIGN_OR_RETURN_IMPL(statusor, lhs, rexpr) \
    auto statusor = (rexpr); \
    if (ABSL_PREDICT_FALSE(!statusor.ok())) return statusor.status(); \
    lhs = *std::move(statusor)
```

`__LINE__`을 활용해 같은 함수 안에서 여러 번 호출해도 변수 이름이 충돌하지 않게 한다.

### 사용 예시

```cpp
// 단순
ASSIGN_OR_RETURN(int n, ParseInt("42"));

// 객체 멤버 접근
ASSIGN_OR_RETURN(Config config, LoadConfig(path));
LOG(INFO) << "loaded: " << config.name();

// 기존 변수에 할당 — auto 없이
Config config;
ASSIGN_OR_RETURN(config, LoadConfig(path));  // 컴파일 에러
// 매크로가 `auto`로 가정하지 않음. 새 변수 선언이 보통.
```

### 두 매크로의 조합

```cpp
absl::Status Pipeline(const std::string& path) {
    RETURN_IF_ERROR(ValidatePath(path));
    ASSIGN_OR_RETURN(Config config, LoadConfig(path));
    RETURN_IF_ERROR(config.Validate());
    ASSIGN_OR_RETURN(Server server, CreateServer(config));
    RETURN_IF_ERROR(server.Init());
    return RunServer(&server);
}
```

선형 흐름이 그대로 드러난다. 에러 처리는 컴파일러가 자동으로.

## Abseil 외부 정의

흥미롭게도 `ASSIGN_OR_RETURN`은 Abseil 공식에 포함되지 않는다. Google 사내에는 있지만 오픈소스 Abseil에는 없다. 이유는 코드베이스마다 약간씩 다른 변형이 있기 때문이라고 알려져 있다.

다음과 같이 직접 정의하는 것이 일반적이다.

```cpp
// 사용자 프로젝트의 status_macros.h
#define RETURN_IF_ERROR(expr) \
    do { \
        const absl::Status _absl_status_ = (expr); \
        if (ABSL_PREDICT_FALSE(!_absl_status_.ok())) return _absl_status_; \
    } while (0)

#define ASSIGN_OR_RETURN_IMPL(statusor, lhs, rexpr) \
    auto statusor = (rexpr); \
    if (ABSL_PREDICT_FALSE(!statusor.ok())) return statusor.status(); \
    lhs = *std::move(statusor)

#define ASSIGN_OR_RETURN(lhs, rexpr) \
    ASSIGN_OR_RETURN_IMPL(STATUS_MACROS_CONCAT(_statusor_, __COUNTER__), lhs, rexpr)

#define STATUS_MACROS_CONCAT_IMPL(x, y) x##y
#define STATUS_MACROS_CONCAT(x, y) STATUS_MACROS_CONCAT_IMPL(x, y)
```

gRPC, TensorFlow, Envoy 등 큰 프로젝트가 각자 정의해 쓴다. 표준화되지 않은 이유가 일종의 사회적 합의로 받아들여진다.

## 추가 변형

### RETURN_IF_ERROR with prefix

에러 메시지에 컨텍스트 추가.

```cpp
#define RETURN_IF_ERROR_PREFIX(expr, prefix) \
    do { \
        absl::Status _s = (expr); \
        if (ABSL_PREDICT_FALSE(!_s.ok())) { \
            return absl::Status(_s.code(), \
                absl::StrCat(prefix, ": ", _s.message())); \
        } \
    } while (0)

// 사용
RETURN_IF_ERROR_PREFIX(LoadConfig(path), "loading config");
// 에러: "loading config: file not found"
```

### ASSIGN_OR_RETURN with stream

`RETURN_IF_ERROR(expr) << "context";` 형태로 stream syntax를 지원하는 변형도 있다. 구현은 더 복잡해진다.

## 코드 리뷰 포인트

```cpp
// 회피 — 매크로 안의 인자가 부작용 있는 함수
RETURN_IF_ERROR(IncrementAndCheck());
// 보통은 안전 — _absl_status_에 캐싱됨. 한 번만 호출.
// 다만 매크로 정의에 따라 다를 수 있으니 확인.
```

```cpp
// 회피 — 매크로 안의 인자가 너무 길어 가독성 떨어짐
ASSIGN_OR_RETURN(auto result,
                 SomeVeryLongFunctionName(argument1, argument2,
                                          argument3, argument4));
// 한 줄에 모든 게 들어가 읽기 힘듦.

// Good — 호출을 분리
auto temp = SomeVeryLongFunctionName(arg1, arg2, arg3, arg4);
ASSIGN_OR_RETURN(auto result, std::move(temp));
// 또는 그냥 풀어서
auto r = SomeVeryLongFunctionName(...);
if (!r.ok()) return r.status();
auto result = *std::move(r);
```

```cpp
// 회피 — 매크로를 if 조건 안에
if (RETURN_IF_ERROR(...)) { ... }  // 컴파일 에러
// do-while로 감싸진 매크로는 expression이 아님.
```

리뷰에서:

1. **에러 컨텍스트가 충분한가** — prefix 매크로 사용 검토.
2. **매크로 안의 표현식이 너무 길지 않은가**.
3. **에러를 silent하게 swallow하지 않는가** — 매크로 사용은 그 자체로 전파.

## 자주 보는 안티패턴

```cpp
// 회피 — 매크로를 안 쓰고 매번 손으로
auto r = Op();
if (!r.ok()) return r.status();
auto v = *r;
// 자주 반복되면 매크로 사용 검토.

// Good
ASSIGN_OR_RETURN(auto v, Op());
```

```cpp
// 회피 — 매크로 안에서 추가 처리 시도
ASSIGN_OR_RETURN(int x, Parse(s) + 1);  // 어색
// `Parse(s) + 1`이 StatusOr<int>를 반환? operator+ 정의 안 됨.

// Good
ASSIGN_OR_RETURN(int x, Parse(s));
int y = x + 1;
```

```cpp
// 회피 — 매크로 매번 작성
absl::Status MyFunc() {
    auto s = ...;
    if (!s.ok()) return s;
    // 5번 더 반복
}
// 매번 손으로. 매크로로 옮길 것.
```

```cpp
// 회피 — 매크로 안의 변수 이름과 사용자 변수 충돌
absl::Status _absl_status_ = ...;  // 매크로 내부 이름과 충돌
RETURN_IF_ERROR(Op());  // 일부 구현에서 깨질 수 있음
// 매크로 내부 이름을 모르면 충돌 위험. _ 접두사 변수는 보통 reserved.
```

## std::expected의 monadic operations와 비교

매크로와 monadic 메서드는 *같은 그림*을 다르게 표현한 것이다.

![Monadic StatusOr / Expected](/images/blog/cpp-concepts/diagrams/monadic-status-or.svg)

C++23의 `std::expected`는 매크로 대신 monadic operations를 제공한다.

```cpp
// std::expected — C++23
std::expected<int, MyError> r = ParseInt(s)
    .transform([](int n) { return n * 2; })
    .and_then([](int n) { return Validate(n); });
```

Abseil은 매크로 길을 택했다. 이유는 두 가지로 추정.

1. **C++14 호환** — lambda overhead, generic lambda 등.
2. **early return의 명시성** — `RETURN_IF_ERROR`는 코드에 return이 보임.

C++23 이후로는 expected의 monadic이 더 깔끔할 수 있다. 그러나 StatusOr를 쓰는 코드베이스에서는 매크로가 사실상 표준.

## 정리

- `RETURN_IF_ERROR`와 `ASSIGN_OR_RETURN`은 Status/StatusOr 에러 전파의 표준 매크로.
- 오픈소스 Abseil에는 포함되어 있지 않음. 프로젝트별로 정의하는 것이 일반적.
- 내부적으로 `do-while(0)`, `__LINE__`/`__COUNTER__` 활용으로 안전성 확보.
- `ABSL_PREDICT_FALSE`로 ok 경로 hot path 힌트.
- 표현식이 길어지면 매크로 분리하거나 풀어 쓸 것.

## 다음 편

Part 3-04에서 Status payload를 본다. 에러 메시지 외에 구조화된 컨텍스트를 어떻게 추가하는지, URL-based key 시스템이 어떻게 충돌을 방지하는지.

## 관련 항목

- [Part 3-01: absl::Status](/blog/programming/code-review/abseil/part3-01-status)
- [Part 3-02: StatusOr&lt;T&gt;](/blog/programming/code-review/abseil/part3-02-status-or)
- [Part 3-04: Status payload](/blog/programming/code-review/abseil/part3-04-status-payload)
- [Part 3-05: Status ↔ exception](/blog/programming/code-review/abseil/part3-05-status-exception-conversion)
- [Part 2-02: ABSL_PREDICT_TRUE/FALSE](/blog/programming/code-review/abseil/part2-02-predict-branch-hint)
- [Effective Modern C++: Item 7 — uniform initialization](/blog/programming/cpp/effective-modern-cpp)
- [원문 — TensorFlow status_macros](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/core/platform/status_macros.h)
- [원문 — gRPC status_macros](https://github.com/grpc/grpc/blob/master/src/core/lib/iomgr/error.h)
