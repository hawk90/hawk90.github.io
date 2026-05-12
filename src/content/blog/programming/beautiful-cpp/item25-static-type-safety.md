---
title: "항목 25: 프로그램은 최대한 정적으로 타입에 안전해야 한다"
date: 2026-05-10T14:00:00
description: "타입 시스템에 의미를 담아 컴파일러에게 검사를 맡기는 법 — strong types, std::optional, enum class."
tags: [C++, Type Safety, Strong Types]
series: "Beautiful C++"
seriesOrder: 25
draft: false
---

## 왜 이 항목이 중요한가?

`int`는 — 시간(ms), 거리(m), ID, 카운트, 인덱스 등 모든 정수 의미를 한 타입에 다 담는다. 결과:

```cpp
void transfer(int from, int to, int amount);

transfer(amount, fromId, toId);     // ⚠️ 순서 실수 — 컴파일러 침묵
```

같은 `int`라 — 컴파일러가 잡지 못함. 런타임에 잘못된 송금. 이건 **타입 시스템을 활용 못 한** 코드. C++의 가장 큰 장점은 — 정적 타입 시스템. 더 많은 의미를 타입에 담을수록 컴파일러가 더 많은 버그를 잡는다.

이 항목은 — **strong types**(의미별 타입 분리), **`std::optional`** (nullable 명시), **`enum class`** (도메인 enum) 등으로 의도를 타입에 박는 패턴.

## 핵심 내용

- **타입 시스템에 더 많은 정보를 담을수록** 컴파일러가 더 많은 버그를 잡아준다
- `void*`, 무차별 캐스트, 원시 정수 ID는 **타입 시스템을 우회**하는 행위
- 같은 `int`라도 `UserId`와 `OrderId`를 **strong typedef**로 분리하면 혼동이 사라짐
- C 스타일 캐스트 대신 `static_cast` / `dynamic_cast` — 의도가 시그니처에 드러남
- `std::variant` / `std::optional`로 **"있을 수도 / 없을 수도"를 타입으로 표현**

## 비교 — 원시 int vs 강 타입

### Bad: int가 모든 의미

```cpp
void transfer(int from, int to, int amount);

int fromId = 100, toId = 200, amount = 50;
transfer(amount, fromId, toId);     // ⚠️ 순서 실수 — 컴파일러 침묵
```

문제:
- 매개변수 모두 `int` — 순서 실수에 컴파일러 무력
- 음수 amount? 자기 자신에게 전송?
- 모두 런타임에서야 발견

### Good: 의미별 타입 분리 (strong types)

```cpp
struct AccountId {
    int value;
    explicit AccountId(int v) : value(v) {}
    bool operator==(const AccountId&) const = default;
};

struct Money {
    int cents;
    explicit Money(int c) : cents(c) {
        if (c < 0) throw std::invalid_argument("Money cannot be negative");
    }
};

void transfer(AccountId from, AccountId to, Money amount);

AccountId from(100), to(200);
Money     amount(50);

transfer(from, to, amount);       // ✅
transfer(amount, from, to);       // ❌ 컴파일 에러 — 타입 불일치
```

각 매개변수가 **자기 타입** — 순서 실수 즉시 컴파일 차단.

## strong typedef 패턴

```cpp
template<typename T, typename Tag>
class StrongTypedef {
    T value_;
public:
    explicit StrongTypedef(T v) : value_(v) {}
    T value() const { return value_; }
    
    bool operator==(const StrongTypedef&) const = default;
};

using UserId   = StrongTypedef<int, struct UserIdTag>;
using OrderId  = StrongTypedef<int, struct OrderIdTag>;

UserId u(1);
OrderId o(1);
// u == o;     // ❌ 다른 타입 — 컴파일 에러
```

각 ID가 별개 타입. Tag struct로 — 같은 `int` 기반이지만 구분.

라이브러리: `boost::strong_typedef`, `NamedType` (third-party), 또는 직접 구현.

## std::optional — nullable 명시

```cpp
// Bad: raw pointer로 nullable
Widget* find(std::string_view name);

auto* w = find("foo");
w->method();      // ⚠️ nullptr 체크 잊으면 crash

// Good: std::optional
std::optional<Widget> find(std::string_view name);

if (auto w = find("foo")) {
    w->method();        // 자동 nullptr 차단
}
```

타입 자체가 — "없을 수도 있음"을 표현. 사용자가 자연스럽게 검사.

## std::variant — sum type

```cpp
// Bad: 여러 타입을 하나의 union 또는 pointer로
struct Event {
    int  type;          // 1 = click, 2 = key
    union {
        ClickEvent click;
        KeyEvent   key;
    };
};

// Good: variant
using Event = std::variant<ClickEvent, KeyEvent, MoveEvent>;

void handle(const Event& e) {
    std::visit([](const auto& specific) {
        // 컴파일러가 각 타입에 맞는 코드 생성
    }, e);
}
```

`variant`는 — **여러 타입 중 하나**임을 타입으로 표현. visit 시 누락된 타입을 컴파일러가 잡음.

## enum class — 도메인 의미 (항목 20 연결)

```cpp
// Bad: bool 또는 int
void connect(const std::string& host, bool secure);
connect("api.com", true);     // true가 secure? 다른 의미?

// Good: enum class
enum class Security { Insecure, TLS };
void connect(const std::string& host, Security s);
connect("api.com", Security::TLS);     // 명확
```

## 캐스트 — 의도 시그니처에 표현

```cpp
// Bad: C 스타일
int n = (int)3.14;           // truncation? rounding?
char* p = (char*)something;   // 무엇으로 해석?

// Good: C++ 캐스트
int n = static_cast<int>(3.14);                         // 명시적 변환
char* p = reinterpret_cast<char*>(something);           // 비트 재해석
const_cast<Widget&>(w);                                  // const 제거 (의도)
auto* d = dynamic_cast<Derived*>(base);                  // 안전한 down-cast
```

각 캐스트가 — 다른 의도. grep으로 찾기도 쉬움 (`reinterpret_cast`만 검색).

## std::span — 배열 view

```cpp
// Bad: 포인터 + 크기
void process(int* data, size_t count);

// Good: std::span (C++20)
void process(std::span<int> data);

std::array<int, 5> arr;
std::vector<int> vec;
int raw[10];

process(arr);    // ✅ span<int> 자동 생성
process(vec);    // ✅
process(raw);    // ✅
```

`span`은 — "**연속 메모리의 view**"라는 의미. 포인터+크기 쌍을 한 타입으로.

## std::string_view — 문자열 view

```cpp
// Bad: char* — null-terminated 가정, owner 모호
void log(const char* msg);

// Good: string_view
void log(std::string_view msg);

log("literal");                  // ✅
log(std::string{"dynamic"});     // ✅
log(some_string);                // ✅
```

string-like 타입을 — owner 없이 받음. C++17.

## 함정 — implicit 변환

```cpp
struct Money {
    Money(int cents) : cents_(cents) {}     // ⚠️ implicit ctor
    int cents_;
};

void process(Money m);
process(42);     // 의도 — Money(42)? 아니면 실수?
```

`explicit` 키워드 — 의도된 변환만:

```cpp
struct Money {
    explicit Money(int cents) : cents_(cents) {}
};

process(42);          // ❌ 컴파일 에러 — 명시 필요
process(Money(42));    // ✅
```

생성자에는 보통 `explicit`. 변환이 정말 자연스러울 때만 생략.

## 함정 — int에서 size_t로

```cpp
void process(std::vector<int>& v) {
    for (int i = 0; i < v.size(); ++i) {     // ⚠️ int vs size_t
        // ...
    }
}
```

`v.size()`는 `size_t` (unsigned), `i`는 `int` (signed) — 비교에 경고. 해결:

```cpp
for (std::size_t i = 0; i < v.size(); ++i) { /* ... */ }

// 또는 C++20
for (int i = 0; std::cmp_less(i, v.size()); ++i) { /* ... */ }

// 가장 깔끔
for (const auto& x : v) { /* ... */ }     // range-based
```

## 함정 — 잘못된 단위

```cpp
// Bad: int로 시간 표현
void sleep(int duration);
sleep(100);     // 100 ms? sec? min?

// Good: chrono
void sleep(std::chrono::milliseconds duration);
sleep(100ms);     // 명확
sleep(std::chrono::seconds(5));     // 자동 변환 가능
```

`std::chrono` — 시간 단위를 타입으로 표현. 컴파일 타임에 단위 변환.

```cpp
auto duration = 5s + 100ms;     // 자동 단위 합산
```

## 비-static 시간 도구 — chrono::duration

```cpp
using Speed = std::chrono::duration<double, std::ratio<1>>;   // m/s

void move(Speed velocity, std::chrono::milliseconds time);
```

도메인 단위 자체를 타입에. 잘못된 단위는 컴파일 에러.

## 컴파일러 경고로 검출

```bash
-Wconversion      # 잠재 narrowing
-Wsign-conversion # signed/unsigned 변환
-Wfloat-conversion
-Wuseless-cast    # 불필요한 캐스트
```

타입 안전성 관련 경고 적극 활성화.

## 함정 — 너무 많은 strong type

```cpp
struct PixelX { int value; };
struct PixelY { int value; };
struct ScreenX { int value; };
struct ScreenY { int value; };
struct WindowX { int value; };
// ...
```

타입 폭발 — 사용자 부담. 진짜 의미적 차이가 있는 경우만 strong type. 같은 도메인의 X, Y는 — `struct Point2D { int x, y; }` 같이 묶기.

## C++26 reflection

(미래) — strong typedef 자동 생성, enum-to-string 등 reflection 기반 도구. 현재는 third-party 또는 manual.

## 실무 가이드 — 결정 트리

```
이 매개변수의 의미는?
├── 같은 도메인의 ID 여러 개 → strong typedef (UserId, OrderId)
├── 단위(시간/거리/금액) → std::chrono / 사용자 타입
├── nullable → std::optional
├── 여러 타입 중 하나 → std::variant
├── 도메인 enum → enum class
├── 배열 view → std::span (C++20)
├── 문자열 view → std::string_view (C++17)
└── 단순 int OK → 일반 int (남용 X)
```

## 실무 가이드 — 체크리스트

- [ ] 같은 `int` 매개변수 여러 개 — strong type 분리?
- [ ] nullable 의미 — `std::optional`?
- [ ] bool 매개변수 — `enum class`?
- [ ] 캐스트 — C++ 캐스트 사용?
- [ ] 시간/거리/금액 — 단위 타입?
- [ ] `explicit` ctor로 implicit 변환 차단?
- [ ] 컴파일러 경고 (`-Wconversion` 등) 활성?

## 정리

런타임 검사보다 **컴파일 타임 검사**가 항상 싸고 안전하다. 의도를 타입으로 적으면 버그가 발생하기 전에 사라진다.

도구 사다리:
1. **strong typedef** — 같은 기반 타입의 의미 분리
2. **`std::optional`** — nullable 명시
3. **`std::variant`** — sum type
4. **`enum class`** — 도메인 enum
5. **`std::chrono`** — 시간 단위
6. **`std::span` / `std::string_view`** — view 타입
7. **`explicit`** — implicit 변환 차단

타입 안전성은 — **C++의 본질적 강점**.

## 관련 항목

- [항목 8: 인자 적게 유지](/blog/programming/beautiful-cpp/item08-keep-function-arguments-minimal) — strong type 활용
- [항목 20: enum class](/blog/programming/beautiful-cpp/item20-prefer-enum-class) — bool/int 대체
- [항목 24: 콘셉트](/blog/programming/beautiful-cpp/item24-specify-concepts-for-template-args) — 템플릿의 타입 안전성
