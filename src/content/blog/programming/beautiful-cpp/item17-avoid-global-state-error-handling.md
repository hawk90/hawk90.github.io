---
title: "항목 17: 전역 상태에 따른 에러 처리는 피하라"
date: 2026-05-09T16:00:00
description: "errno 같은 전역 에러 채널 대신 타입에 에러를 담아 반환 — optional, expected, 예외."
tags: [C++, Error Handling]
series: "Beautiful C++"
seriesOrder: 17
draft: false
---

## 왜 이 항목이 중요한가?

C 라이브러리의 전통 — 결과는 반환값, 에러는 전역 `errno`. 사용자는 호출 후 매번 `errno`를 검사해야 한다. 하나라도 빠뜨리면 — 에러가 **조용히 사라짐**. 다음 호출이 `errno`를 덮어쓰고, 잘못된 결과를 정상인 양 처리.

```cpp
double x = std::strtod(s, nullptr);
// errno 검사 안 하면 → range error를 놓침 → 잘못된 값 사용
```

이게 시스템 전반에 누적된 결과 — Unix 명령행 도구가 종종 silent failure 후 잘못된 출력을 내는 이유 중 하나. C++에는 더 나은 도구가 있다 — **에러를 반환값에 묶기**.

## 핵심 내용

- `errno` 같은 전역 에러 상태는 **호출 후 반드시 검사**해야 의미 있다 — 빠뜨리면 조용히 사라진다
- 에러는 **반환값에 담아 호출자가 거부할 수 없게** 만들어라
- 현대 C++ 선택지: `std::optional<T>`, `std::expected<T, E>` (C++23), 예외, `tl::expected`
- 멀티스레드에서 `errno`는 thread-local이라도 여전히 깨지기 쉬운 패턴

## 비교 — errno vs 타입에 에러

### Bad: 결과는 반환값, 에러는 errno

```cpp
double parse_double(const char* s) {
    char* end;
    errno = 0;
    double v = std::strtod(s, &end);
    // 호출자가 errno를 안 보면 ERANGE를 놓침
    return v;
}

double x = parse_double("999e999");
// 호출자: x를 그냥 사용 → 무한대 또는 잘못된 값
// errno 검사 안 함
```

문제:
- `errno` 검사 강제 메커니즘 없음
- 다음 함수 호출이 `errno` 덮어쓸 수 있음
- 멀티스레드에서 다른 스레드의 `errno`와 혼동
- 호출 코드가 산만해짐 (`errno = 0` 후 검사)

### Good: 에러를 타입에 담아 반환

```cpp
enum class ParseError { Invalid, OutOfRange };

std::expected<double, ParseError> parse_double(std::string_view s) {
    // ...
    if (out_of_range) return std::unexpected(ParseError::OutOfRange);
    if (no_digits)    return std::unexpected(ParseError::Invalid);
    return value;
}

// 호출자가 에러를 무시할 수 없음
auto r = parse_double("3.14");
if (!r) {
    handle(r.error());
    return;
}
use(*r);
```

`std::expected` (C++23) — 성공 값 또는 에러 둘 중 하나. 사용자가 `*r` 또는 `r.value()`로 값에 접근하기 전에 자연스럽게 검사하게 됨.

## 모던 도구들 — 비교

### `std::optional<T>` (C++17)

```cpp
std::optional<User> find_user(int id) {
    auto it = users.find(id);
    if (it == users.end()) return std::nullopt;
    return it->second;
}

if (auto u = find_user(42)) {
    use(*u);
} else {
    // not found
}
```

성공/실패만 — **에러 정보 없음**. 단순한 lookup에 적합.

### `std::expected<T, E>` (C++23)

```cpp
std::expected<User, DbError> fetch_user(int id) {
    if (!connected())   return std::unexpected(DbError::NoConnection);
    if (!id_valid(id))  return std::unexpected(DbError::InvalidId);
    return User{/* ... */};
}

auto result = fetch_user(42);
if (!result) {
    log_error(result.error());
    return;
}
auto user = *result;
```

성공 값 + 에러 정보 둘 다. 가장 풍부한 표현.

### 예외 (Exceptions)

```cpp
User fetch_user(int id) {
    if (!connected())  throw DbConnectionError{};
    if (!id_valid(id)) throw InvalidIdError{id};
    return User{/* ... */};
}

try {
    auto user = fetch_user(42);
    use(user);
} catch (const DbError& e) {
    handle(e);
}
```

스택 unwinding으로 자동 전파. **정상 경로 코드는 깔끔**, 에러 처리는 catch에 집중.

### 어느 것을 쓸까

| 시나리오 | 권장 |
| --- | --- |
| 단순 lookup, 실패가 정상 흐름 | `std::optional` |
| 다양한 실패 이유, 정보 필요 | `std::expected` |
| 예외적 상황(메모리 부족, 시스템 에러) | 예외 |
| 핫 패스 + 자주 실패 | `std::expected` / `std::optional` (예외 비용 회피) |
| API 경계, C 호환 | 에러 코드 반환 (`int`) |

## 함정 — 반환 코드 + out 파라미터

```cpp
// Bad: out 파라미터 + 반환 코드
int parse_int(const char* s, int* out);   // 0 성공, 음수 에러

int value;
int rc = parse_int("42", &value);
if (rc != 0) {
    // error
} else {
    use(value);
}
```

C 스타일. C++에서는 `std::expected` 또는 `std::optional`이 더 명확.

## 함정 — bool 반환

```cpp
bool try_parse(const char* s, int& out);

int value;
if (try_parse("42", value)) {
    use(value);
}
```

성공/실패만 — `std::optional`과 동일하지만 out parameter 사용. C++17 이전엔 흔했으나, 현재는 `std::optional` 권장.

## `noexcept` 함수에서 에러 처리

```cpp
class Container {
public:
    auto at(size_t i) const -> std::expected<T, OutOfRange> {
        if (i >= size_) return std::unexpected(OutOfRange{i, size_});
        return data_[i];
    }
};
```

`noexcept`로 만들고 싶은데 실패 가능한 함수 — `std::expected`가 정답. 예외 던지지 않고 에러 표현.

## 함정 — errno 보존

```cpp
// 라이브러리 코드
void log_error() {
    int saved = errno;     // ⚠️ 다른 함수 호출 전 보존
    std::cerr << "error: " << std::strerror(errno) << '\n';
    errno = saved;
}
```

C API와 상호작용 시 — `errno`가 다른 호출에 의해 변경되지 않도록 보존 필요. 그러나 이 자체가 — C API의 한계.

## 흔한 패턴 — 체인 에러 처리

```cpp
auto result = fetch_user(id)
    .and_then([](User u) { return validate(u); })       // C++23 monadic
    .or_else([](DbError e) { return fallback_user(e); });
```

`std::expected`의 monadic operations — 에러 처리를 함수형 스타일로 체이닝. 깊은 if-else 회피.

## 성능 — 예외 vs 반환값

```
정상 경로:
  예외: 거의 비용 0 (zero-cost exceptions)
  반환값 (expected): 약간의 분기 비용

에러 경로:
  예외: 스택 unwinding (느림, 100~1000ns)
  반환값: 즉시 반환 (빠름)
```

**예외는 정말 예외적**일 때 사용. 자주 발생하는 실패(파싱 에러, 사용자 입력)는 `expected`/`optional`.

## 함정 — 너무 많은 에러 타입

```cpp
std::expected<T, std::variant<NetworkError, ParseError, AuthError, ...>>
```

에러 타입이 너무 다양하면 — 사용자가 모두 처리하기 부담. **에러 카테고리화** 또는 **공통 base 클래스**(예외인 경우).

```cpp
struct AppError {
    enum class Code { Network, Parse, Auth };
    Code code;
    std::string message;
};

std::expected<T, AppError> operation();
```

## 라이브러리 boundaries에서 — 예외와 expected 변환

```cpp
// 라이브러리 내부 — expected 사용 (성능)
std::expected<T, Error> internal_op();

// 라이브러리 외부 API — 예외 throw (사용자 편의)
T public_api() {
    auto r = internal_op();
    if (!r) throw std::runtime_error(to_string(r.error()));
    return *r;
}
```

내부/외부 인터페이스가 다른 에러 표현을 가질 수 있음.

## 모던 변형 — `std::system_error`

```cpp
void connect(const std::string& host) {
    auto rc = ::connect_socket(host);
    if (rc != 0) {
        throw std::system_error(errno, std::generic_category(), 
                                 "connect failed");
    }
}
```

OS/시스템 호출의 에러 — `errno`를 예외로 변환. `<system_error>` 표준 라이브러리.

## 실무 가이드 — 결정 트리

```
함수가 실패할 수 있나?
├── 자주 발생하는 정상적 실패 (not found, invalid input)
│   ├── 정보 불필요 → std::optional
│   └── 에러 정보 필요 → std::expected (C++23) or tl::expected (이전)
├── 예외적 상황 (out of memory, invariant violation)
│   └── 예외 throw
├── C API 호환
│   └── 에러 코드 반환 (int)
└── noexcept 강제 (이동 ctor 등)
    └── std::expected 또는 sentinel value
```

## 실무 가이드 — 체크리스트

- [ ] `errno` 의존 안 하는가?
- [ ] 실패가 정상 흐름이면 `optional` / `expected`?
- [ ] 진짜 예외적 상황만 예외 throw?
- [ ] 에러 정보가 풍부한 타입(`expected<T, E>`) 사용?
- [ ] 호출자가 에러를 무시할 수 없게 강제?
- [ ] 라이브러리 경계에서 에러 표현 변환?

## 정리

에러는 **결과와 함께 한 채널에서** 흐르게 하라. 전역 상태는 잊혀지기 쉽고 멀티스레드에서 깨지기 쉽다.

도구 사다리:
1. **`std::optional`** — 성공/실패만 (단순 lookup)
2. **`std::expected`** (C++23) — 성공 값 + 에러 정보
3. **예외** — 정말 예외적 상황
4. **에러 코드** — C API 호환만

`errno`는 — C API와 인터페이스할 때만 의식적으로.

## 관련 항목

- [항목 6: 단일 반환 X](/blog/programming/beautiful-cpp/item06-dont-insist-on-single-return) — 가드 절 + 이른 반환
- [항목 11: 전역 상태 최소화](/blog/programming/beautiful-cpp/item11-minimize-explicit-data-sharing) — 전역 상태 일반
- [Effective C++ 항목 29: 예외 안전](/blog/programming/effective-cpp/item29-strive-for-exception-safe-code) — 예외 처리
