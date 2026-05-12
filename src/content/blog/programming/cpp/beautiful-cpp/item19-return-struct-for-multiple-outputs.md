---
title: "항목 19: 출력값을 여러 개로 반환하려면 구조체로 반환하라"
date: 2026-05-09T18:00:00
description: "out 파라미터·pair·tuple 대신 이름 있는 구조체 + 구조적 바인딩 — 의도가 호출 지점에서 명확."
tags: [C++, Function Design, Structured Bindings]
series: "Beautiful C++"
seriesOrder: 19
draft: false
---

## 왜 이 항목이 중요한가?

C 시절엔 함수가 여러 값을 돌려주려면 — out 파라미터(`int* out`)가 유일한 방법이었다. 호출 지점에서는:

```cpp
int quotient, remainder;
divide(17, 5, &quotient, &remainder);
```

`&quotient`가 입력인지 출력인지 시그니처만으로는 모호. 사용자가 자기 변수를 미초기화 상태로 넘기는 게 정상인지, 초기값이 의미 있는지 불명확.

C++ 모던 도구로 — **구조체 반환 + 구조적 바인딩**(C++17)이 표준 idiom. 의도가 호출 지점에서 명확하고, NRVO/이동으로 비용도 거의 0. 이 항목은 그 패턴.

## 핵심 내용

- out 파라미터(`int& out`)는 호출부에서 **무엇이 입력이고 무엇이 출력인지** 알 수 없다
- 여러 값을 묶어 반환하려면 **이름이 있는 구조체**가 가장 명확
- `std::pair` / `std::tuple`은 짧지만 `.first` / `std::get<0>`이 의미를 잃게 함
- C++17 **구조적 바인딩**과 결합하면 호출부도 깔끔
- 반환 비용이 걱정되면 **NRVO / 이동**이 처리

## 비교 — out 파라미터 vs 구조체

### Bad: out 파라미터

```cpp
void divide(int a, int b, int& quotient, int& remainder);

int q, r;
divide(17, 5, q, r);     // q, r이 입력인지 출력인지?
```

문제:
- 변수 미리 선언 + 미초기화
- 시그니처에서 입력/출력 구분 안 됨
- 함수 호출의 의도가 코드에서 안 보임
- 임시 변수 강제

### OK but not great: std::pair

```cpp
std::pair<int, int> divide(int a, int b);

auto p = divide(17, 5);
use(p.first);     // 몫? 나머지?
use(p.second);    // 헷갈림
```

- 임시 변수 불필요
- 그러나 `.first` / `.second`가 의미 없음
- 두 값 이상이면 nested pair 또는 tuple — 더 끔찍

### Good: 이름 있는 구조체

```cpp
struct DivResult {
    int quotient;
    int remainder;
};

DivResult divide(int a, int b) {
    return {a / b, a % b};
}

DivResult r = divide(17, 5);
use(r.quotient);
use(r.remainder);
```

각 필드가 도메인 의미를 가진 이름. 의도 명확.

### Better: 구조체 + 구조적 바인딩 (C++17)

```cpp
auto [q, r] = divide(17, 5);     // 한 줄로 분해
                                  // 각 이름이 함수 시그니처와 일치
```

호출 지점에서 **이름 명시 + 의도 명확**. C++ 모던 코드의 정석.

## std::tuple — 임시방편

```cpp
std::tuple<int, double, std::string> getInfo();

auto t = getInfo();
auto x = std::get<0>(t);      // 어느 값?
auto y = std::get<1>(t);
auto s = std::get<2>(t);
```

- 인덱스 기반 접근 — 의미 손실
- 잘못된 인덱스 사용 가능 (`std::get<5>` 가능)
- 구조체보다 컴파일 시간 길음

C++17 구조적 바인딩으로 약간 나음:

```cpp
auto [x, y, s] = getInfo();
```

그러나 tuple 자체는 — 도메인 의미가 없는 자료구조. **2-3개 반환** 같은 짧은 경우만, 사용 자제.

## 구조체 반환의 비용

C++17부터 — `return {a, b}`가 RVO로 최적화. 구조체 생성 비용 거의 0.

```cpp
struct LargeResult {
    std::vector<int> data;
    std::string description;
    int count;
};

LargeResult compute() {
    return {std::vector<int>(1000), "result", 42};
    // → 호출자 위치에 직접 생성 (NRVO)
}

auto result = compute();     // 무복사
```

이전 C++ 표준에서도 NRVO/move semantics로 — 대부분 무비용. **"비용 걱정"은 더 이상 out 파라미터를 정당화 안 함**.

## 출력 + 상태 (성공/실패)

성공/실패 + 출력값을 함께 반환하고 싶을 때:

```cpp
// 옵션 1: optional
std::optional<DivResult> safe_divide(int a, int b) {
    if (b == 0) return std::nullopt;
    return DivResult{a / b, a % b};
}

if (auto r = safe_divide(17, 5)) {
    use(r->quotient, r->remainder);
}

// 옵션 2: expected (C++23)
std::expected<DivResult, DivError> safe_divide(int a, int b) {
    if (b == 0) return std::unexpected(DivError::DivByZero);
    return DivResult{a / b, a % b};
}
```

`optional` / `expected`로 — 출력값 + 실패 모두 표현.

## 함정 — 너무 많은 출력

```cpp
struct LookupResult {
    bool         found;
    User         user;
    Permission   permission;
    Group        group;
    LastLogin    login;
    AccessLevel  level;
    // ... 10개 필드 ...
};
```

함수가 너무 많은 정보를 반환 — **함수 책임이 너무 큰** 신호. 분리:

```cpp
class UserRepo {
public:
    std::optional<User>     find_user(int id);
    Permission              get_permission(const User& u);
    Group                   get_group(const User& u);
    // ...
};
```

각 메서드가 단일 책임.

## 구조적 바인딩 — 변형

### 1) 일반 분해

```cpp
auto [a, b, c] = getThree();
```

### 2) reference로

```cpp
auto& [a, b, c] = getThree();     // tie없이 reference
```

### 3) const reference

```cpp
const auto& [a, b, c] = getThree();
```

### 4) 무시할 값

C++17엔 무시 placeholder가 없음 — 변수 이름을 그냥 두고 사용 안 함 (warning 가능):

```cpp
auto [used, _unused] = getTwo();    // 컨벤션: 언더스코어 prefix
```

C++26 `_`이 표준 placeholder 예정.

### 5) 컨테이너 순회

```cpp
std::map<int, std::string> m;
for (const auto& [key, value] : m) {     // C++17
    use(key, value);
}
```

가장 흔한 사용처 — map 순회.

## struct의 멤버 이름 — 도메인 친화

```cpp
// Bad: 일반 이름
struct Result {
    int x;
    int y;
};

// Good: 도메인 이름
struct Coordinates {
    int latitude;
    int longitude;
};

struct DivResult {
    int quotient;
    int remainder;
};
```

호출 지점에서 `c.latitude`가 — `r.x`보다 훨씬 명확.

## C++17+ aggregate + designated init

```cpp
struct Config {
    std::string host = "localhost";
    int         port = 8080;
    bool        secure = false;
};

Config make_config() {
    return {.host = "example.com", .port = 9000};     // C++20
}
```

구조체 반환을 — designated init으로 더 명확하게.

## 함정 — public 멤버 vs setter

```cpp
struct Result {
    int quotient;     // public 멤버 OK — 단순 데이터 묶음
    int remainder;
};
```

값 반환용 구조체에는 보통 `class` + 게터/세터 X. `struct` + public 멤버가 정직.

불변식이 있으면 다름:

```cpp
class Percentage {
    int value_;
public:
    explicit Percentage(int v) {
        if (v < 0 || v > 100) throw std::invalid_argument("0-100");
        value_ = v;
    }
    int value() const { return value_; }
};
```

## 표준 라이브러리의 패턴

```cpp
// std::map::insert — 구조적 바인딩 사용
auto [it, inserted] = map.insert({key, value});
//        ↑           ↑
//   iterator        bool — 새로 삽입됐는지

// std::lock_guard 변환
// std::async, std::future ...
```

표준 라이브러리가 이 패턴을 적극 활용. C++ 모던 코드의 backbone.

## 모던 변형 — `std::ranges::subrange`

```cpp
auto range = std::ranges::subrange(begin, end);
auto [first, last] = range;       // 분해
```

range 라이브러리의 view를 구조적 바인딩으로.

## 실무 가이드 — 결정 트리

```
함수가 여러 값을 돌려주려고 한다 — 어떻게?
├── 2-3개 (의미적으로 짝지어진) → struct + 구조적 바인딩
├── 의미 없는 짝 (key, value 등 명확한 의미) → std::pair
├── 4개 이상 → struct (멤버 이름이 의미)
├── 성공/실패 + 값 → std::optional / std::expected
├── 출력값이 너무 많음 → 함수 분리
└── out 파라미터는 보통 X → 그나마 큰 객체 in-place 변경할 때
```

## 실무 가이드 — 체크리스트

- [ ] out 파라미터 대신 구조체 반환?
- [ ] 구조체 멤버 이름이 도메인 의미를 가지는가?
- [ ] tuple/pair 대신 명명 구조체?
- [ ] 호출 지점에서 구조적 바인딩으로 분해?
- [ ] 성공/실패는 optional/expected?
- [ ] 출력이 너무 많으면 함수 분리?

## 정리

여러 값을 돌려줄 때는 **타입에 이름**을 붙여라. `pair` / `tuple`은 임시방편, **구조체 반환 + 구조적 바인딩**이 현대 C++의 정석이다.

핵심:
- **구조체 반환** — 멤버 이름이 도메인 의미
- **구조적 바인딩**(C++17) — 호출 지점에서 분해
- **NRVO / 이동** — 비용 거의 0
- **optional / expected** — 실패 가능성 포함

## 관련 항목

- [항목 8: 인자 적게 유지](/blog/programming/cpp/beautiful-cpp/item08-keep-function-arguments-minimal) — 입력에도 같은 원리
- [항목 17: 에러 처리](/blog/programming/cpp/beautiful-cpp/item17-avoid-global-state-error-handling) — optional/expected
- [항목 5: 한 선언 한 이름](/blog/programming/cpp/beautiful-cpp/item05-one-declaration-per-name) — 변수 선언 일반
