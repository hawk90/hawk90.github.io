---
title: "absl::StatusOr<T> — 값 또는 에러"
date: 2026-06-09T09:15:00
description: "Part 3-02: absl::StatusOr<T> — 값과 에러를 한 type에 묶는 패턴, 내부 메모리 레이아웃, monadic 스타일."
series: "Abseil Code Review"
seriesOrder: 15
tags: [cpp, abseil, statusor, error-handling, monadic]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

> **한 줄 요약**: `absl::StatusOr<T>`는 "값 T 또는 에러 Status"를 한 type에 묶는다. 함수가 의미 있는 결과를 반환할 때 에러도 함께 표현할 수 있다. C++23의 `std::expected`의 선구적 패턴.

## 어떤 문제를 푸는가

`absl::Status`만으로는 값을 반환할 수 없다.

```cpp
// 두 단계 패턴 — 어색
User user;
absl::Status s = GetUser(42, &user);
if (!s.ok()) return s;
// user 사용
```

out parameter는 다음 문제를 가진다.

- **호출자가 default 생성 가능한 type만 사용 가능** — `User`가 default ctor 없으면?
- **에러 시 user의 상태 불명확** — 부분 초기화? 그대로?
- **call site가 장황** — return type만 보고 의도를 알기 어려움.

`StatusOr<T>`는 결과와 에러를 함께 묶어 이 문제를 해결한다.

상태 전이를 그림으로 보면 다음과 같다.

![StatusOr 상태 다이어그램](/images/blog/abseil/diagrams/part3-02-status-or-states.svg)

```cpp
absl::StatusOr<User> GetUser(int id);

// 호출
auto result = GetUser(42);
if (!result.ok()) {
    LOG(ERROR) << result.status();
    return;
}
User user = *result;  // 또는 std::move(*result)
```

## 기본 사용

```cpp
#include "absl/status/statusor.h"

absl::StatusOr<int> ParseInt(absl::string_view s) {
    int v;
    if (!absl::SimpleAtoi(s, &v)) {
        return absl::InvalidArgumentError(
            absl::StrCat("not a number: ", s));
    }
    return v;
}

void Demo() {
    auto r = ParseInt("42");
    if (!r.ok()) {
        LOG(ERROR) << r.status();
        return;
    }
    int n = *r;
    LOG(INFO) << "parsed: " << n;
}
```

생성 패턴.

```cpp
// 성공 — 값으로 암묵 변환
absl::StatusOr<int> ok = 42;

// 실패 — Status로 암묵 변환
absl::StatusOr<int> err = absl::InvalidArgumentError("...");

// 명시적
absl::StatusOr<int> x(42);
absl::StatusOr<int> y(absl::Status(absl::StatusCode::kNotFound, "..."));
```

## API

```cpp
absl::StatusOr<User> r = GetUser(42);

// 검사
bool ok = r.ok();
absl::Status s = r.status();
absl::StatusCode code = r.status().code();

// 값 접근
User u1 = *r;                          // dereference (unchecked)
User u2 = r.value();                   // ok이 아니면 LOG(FATAL) 또는 throw
User* p = &r.value();
User u3 = std::move(r).value();        // 효율적 이동
User u4 = *std::move(r);

// member access
r->member;
(*r).member;
```

`operator*`와 `operator->`는 ok을 가정한다. ok이 아니면 UB(release) 또는 LOG(FATAL)(debug). 안전한 접근은 `value()`.

## 내부 레이아웃

```cpp
// 의사 코드
template <typename T>
class StatusOr {
public:
    // ...
private:
    union {
        Status status_;
        T value_;
    };
    bool has_value_;
};
```

union으로 둘 중 하나만 들고 있다. `has_value_` 비트로 어느 쪽인지 판별. 실제 구현은 더 정교하다 — `Status`의 ok 표현을 활용해 추가 비트를 안 쓰는 트릭이 있다.

크기:

```cpp
sizeof(absl::StatusOr<int>)         // sizeof(int) + sizeof(void*) + alignment
sizeof(absl::StatusOr<std::string>) // sizeof(std::string) + sizeof(void*) + alignment
```

`T`가 크면 stack 부담이 커질 수 있다. 일반적으로 작은 T(POD, smart pointer, string)에 적합.

## Move semantics

```cpp
absl::StatusOr<std::vector<int>> GetData();

void Process() {
    auto r = GetData();
    if (!r.ok()) return;
    
    // 값 이동 — vector를 복사하지 않음
    std::vector<int> v = std::move(r).value();
    
    // 또는
    std::vector<int> v2 = *std::move(r);
}
```

`std::move(r).value()` 패턴이 자주 보인다. rvalue로 변환해 내부 값을 이동.

## 안 좋은 케이스

```cpp
// 회피 — reference를 담은 StatusOr
absl::StatusOr<User&> GetUser(int id);
// reference의 lifetime 문제

// Good — pointer 또는 value
absl::StatusOr<User*> GetUser(int id);
absl::StatusOr<User> GetUserCopy(int id);
```

```cpp
// 회피 — void에 StatusOr
absl::StatusOr<void> DoIt();  // 컴파일 에러
// void는 값이 없음. Status 단독으로.

// Good
absl::Status DoIt();
```

`StatusOr<void>` 대신 `Status`. 너무 자주 보는 실수.

## Chaining

여러 단계를 거치는 코드.

```cpp
absl::StatusOr<Config> LoadConfig(const std::string& path);
absl::StatusOr<Server> CreateServer(const Config& c);
absl::Status RunServer(Server* s);

absl::Status BootUp(const std::string& path) {
    auto config = LoadConfig(path);
    if (!config.ok()) return config.status();
    
    auto server = CreateServer(*config);
    if (!server.ok()) return server.status();
    
    return RunServer(&*server);
}
```

장황하다. 다음 편의 `ASSIGN_OR_RETURN` 매크로로 단축된다.

### Monadic 흐름 — 그림

이 패턴은 함수형 언어에서 `map` / `flat_map` / `Result` 모나드라고 부른다. happy path는 흐르고, error는 단락(short-circuit)된다.

![Monadic StatusOr / Expected](/images/blog/cpp-concepts/diagrams/monadic-status-or.svg)

`ASSIGN_OR_RETURN`이 하는 일은 이 그림의 error path를 *언어 매크로*로 흉내내는 것이다. C++23 `std::expected`의 `.and_then()` / `.transform()`은 같은 모델을 메서드로 노출한다.

## 코드 리뷰 포인트

```cpp
// 회피 — value()로 직접 dereference, ok 확인 없음
User u = GetUser(42).value();
// ok이 아니면 LOG(FATAL) 또는 throw. 비정상 종료.

// Good
auto r = GetUser(42);
if (!r.ok()) {
    LOG(ERROR) << r.status();
    return;
}
User u = *r;
```

```cpp
// 회피 — 큰 T를 값으로 반환 후 복사
absl::StatusOr<std::vector<HugeStruct>> GetData();
auto r = GetData();
auto data = r.value();  // 복사

// Good — 이동
auto data = std::move(r).value();
```

```cpp
// 회피 — StatusOr<T*>와 Owner의 혼동
absl::StatusOr<User*> CreateUser();
// 호출자가 delete 해야 하는지 모름.

// Good — unique_ptr 사용
absl::StatusOr<std::unique_ptr<User>> CreateUser();
```

리뷰에서:

1. **value() 전에 ok() 확인했는가**.
2. **큰 type에 대해 move 사용했는가**.
3. **소유권이 분명한가** — pointer 대신 unique_ptr.

## 자주 보는 안티패턴

```cpp
// 회피 — 항상 성공인데 StatusOr
absl::StatusOr<int> Identity(int x) {
    return x;
}
// 그냥 int 반환.

// Good
int Identity(int x) { return x; }
```

```cpp
// 회피 — StatusOr를 out param으로
void GetUser(int id, absl::StatusOr<User>* out);
// StatusOr는 return value용.

// Good
absl::StatusOr<User> GetUser(int id);
```

```cpp
// 회피 — Status로 충분한데 StatusOr<bool>
absl::StatusOr<bool> Exists(int id);
// NotFound가 false, OK가 true로 표현 가능.

// Good — bool 자체가 의미 있는 정보면 OK
absl::StatusOr<bool> WasModified(int id);  // 진짜 bool 결과
```

```cpp
// 회피 — 함수 깊은 곳에서 StatusOr를 풀고 다시 묶음
absl::StatusOr<Config> Load(...) {
    auto r = ParseConfig();
    if (!r.ok()) return r.status();
    Config c = *r;
    // ...
    return c;
}
// 풀었다 묶는 비용. ASSIGN_OR_RETURN으로 단축 가능.

// Good — 다음 편 참조
```

## std::expected와의 비교

C++23의 `std::expected<T, E>`가 비슷한 역할.

```cpp
// C++23
std::expected<int, std::string> ParseInt(std::string_view s);

// Abseil
absl::StatusOr<int> ParseInt(absl::string_view s);
```

차이:

| 항목 | std::expected | absl::StatusOr |
|---|---|---|
| 에러 type | 임의 (E) | absl::Status 고정 |
| 표준 | C++23 | Abseil 의존 |
| canonical code | 사용자 정의 | 17개 표준 |
| payload | 사용자 정의 | URL-based payload |
| monadic | `transform`, `and_then` | (매크로로 대체) |
| 마이그레이션 | 간단 | StatusOr → expected는 매핑 필요 |

C++23이 사용 가능하고 canonical code가 필요 없으면 `std::expected`가 깔끔하다. canonical code, payload, gRPC 통합이 필요하면 `StatusOr`.

## 정리

- `StatusOr<T>`는 값과 에러를 한 type으로 묶는 패턴.
- 내부는 union + flag. ok 경로에서 T를 직접 들고 있음.
- `value()`는 ok 확인 후에. `*` operator는 unchecked.
- 큰 type은 move로 추출.
- `StatusOr<void>`는 없다. `Status` 단독으로.
- C++23의 `std::expected`가 일부 역할 대체. canonical code 필요하면 `StatusOr`.

## 다음 편

Part 3-03에서 `ASSIGN_OR_RETURN`, `RETURN_IF_ERROR` 매크로를 본다. chaining 코드의 장황함을 매크로로 어떻게 줄이고, 내부 expansion이 어떻게 작동하는지.

## 관련 항목

- [Part 3-01: absl::Status](/blog/programming/code-review/abseil/part3-01-status)
- [Part 3-03: status_macros](/blog/programming/code-review/abseil/part3-03-status-macros)
- [Part 3-04: Status payload](/blog/programming/code-review/abseil/part3-04-status-payload)
- [Part 3-05: Status ↔ exception](/blog/programming/code-review/abseil/part3-05-status-exception-conversion)
- [Part 9-03: absl::optional](/blog/programming/code-review/abseil/part9-03-optional)
- [Effective Modern C++: pass by value](/blog/programming/cpp/effective-modern-cpp/item01-understand-template-type-deduction)
- [원문 — absl/status/statusor.h](https://github.com/abseil/abseil-cpp/blob/master/absl/status/statusor.h)
