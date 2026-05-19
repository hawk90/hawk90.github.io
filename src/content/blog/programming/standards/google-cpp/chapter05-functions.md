---
title: "Ch 5: Functions"
date: 2026-05-18T05:00:00
description: "Inputs and Outputs / Short Functions / Overloading / Default Arguments / Trailing Return Type."
tags: [Google, C++, Style-Guide, Function]
series: "Google C++ Style"
seriesOrder: 5
draft: false
---

함수는 코드의 가장 작은 추상화 단위다. 잘 만든 함수는 이름만으로도 무엇을 하는지 알리고, 호출자가 인자와 반환값만 보고도 안전하게 쓸 수 있게 한다. 이 장의 규칙들은 그런 함수를 만드는 다섯 가지 원칙이다.

## Inputs and Outputs

함수가 결과를 돌려주는 방법은 여러 가지지만 Google은 반환값을 강하게 선호한다. 출력 매개변수(pointer로 결과를 채워 주는 방식)는 가능하면 피한다.

```cpp
// 회피 — 출력 매개변수
void GetUser(int id, User* out_user);

User u;
GetUser(42, &u);
```

```cpp
// Good — 반환값
User GetUser(int id);

User u = GetUser(42);
```

반환값이 명확한 가장 큰 이유는 호출자가 그 결과를 무시할 수 없다는 점이다. 출력 매개변수는 호출자가 빈 객체를 넘기고 결과를 안 받아도 컴파일러가 막을 길이 없다.

### 여러 값을 돌려줄 때

여러 값을 함께 돌려줘야 한다면 명명된 struct가 가장 깔끔하다.

```cpp
// 회피 — 두 개의 출력 매개변수
void GetMinMax(const std::vector<int>& data, int* out_min, int* out_max);
```

```cpp
// Good — 명명된 struct
struct MinMax {
    int min;
    int max;
};
MinMax GetMinMax(const std::vector<int>& data);

auto mm = GetMinMax(data);
LOG(INFO) << "min=" << mm.min << " max=" << mm.max;
```

`std::pair`나 `std::tuple`은 가능하지만 가독성이 떨어진다. C++17 구조분해로 어느 정도 만회되지만, struct 정의가 정답에 더 가깝다.

```cpp
// 차선
std::pair<int, int> GetMinMax(...);
auto [min, max] = GetMinMax(data);   // 구조분해
```

오류 가능성이 있으면 `absl::StatusOr<T>`나 `std::optional<T>`로 표현한다.

```cpp
absl::StatusOr<User> FindUser(int id);

auto user_or = FindUser(42);
if (!user_or.ok()) {
    return user_or.status();
}
User& user = *user_or;
```

### 입력 매개변수의 타입

읽기만 하는 입력은 `const T&`, 읽고 쓰는 출력은 `T*`, 소유하지 않는 뷰는 `absl::Span`이나 `string_view`로 받는다.

```cpp
// 읽기 전용
void Process(const std::vector<int>& data);
void Print(absl::string_view text);
void Visit(absl::Span<const Node> nodes);

// 읽기 + 쓰기 (수정한다는 의도를 pointer로 명시)
void Normalize(std::vector<int>* data);
void Append(std::string* out, absl::string_view suffix);

// 소유권 이전 (move-in)
void Take(std::unique_ptr<Foo> foo);

// 빌려서 보관 (drop-in raw pointer)
void Hold(Foo* foo);   // 호출자가 lifetime 보장
```

매개변수 순서는 입력 먼저, 출력은 뒤에 둔다.

```cpp
// Good
void Compute(int a, int b, int* result);

// 회피
void Compute(int* result, int a, int b);
```

새 매개변수가 추가될 때 출력은 항상 뒤로 가도록 두면 시그니처 변경이 일관된다.

## Write Short Functions

함수의 본문은 40줄을 넘기지 않는 것이 권장이다. 길어진 함수는 보통 여러 책임이 섞여 있다는 신호다.

```cpp
// 회피 — 100줄짜리 함수
void ProcessOrder(const Order& order) {
    // (1) 검증 — 20줄
    if (order.customer_id < 0) { /* ... */ }
    if (order.items.empty()) { /* ... */ }
    // ...

    // (2) 가격 계산 — 30줄
    double subtotal = 0;
    for (const auto& item : order.items) { /* ... */ }
    // ...

    // (3) DB 저장 — 25줄
    // ...

    // (4) 알림 — 25줄
    // ...
}
```

각 단계는 자기 함수로 빼면 본 함수가 짧아지고, 단계별 테스트도 가능해진다.

```cpp
// Good
void ProcessOrder(const Order& order) {
    if (auto status = Validate(order); !status.ok()) {
        LOG(ERROR) << status;
        return;
    }
    const double total = ComputeTotal(order);
    SaveOrder(order, total);
    NotifyCustomer(order.customer_id, total);
}
```

40줄이 절대적 기준은 아니다. 큰 lookup 테이블이나 단순한 거대 switch처럼 분해해도 의미가 없는 경우는 길어도 받아들인다.

```cpp
// OK — switch가 길지만 분해할 의미가 없다
const char* StatusName(Status s) {
    switch (s) {
        case Status::kOk: return "OK";
        case Status::kNotFound: return "NOT_FOUND";
        case Status::kPermissionDenied: return "PERMISSION_DENIED";
        // ...
    }
}
```

## Function Overloading

같은 동작을 여러 타입에 대해 제공할 때만 오버로딩을 쓴다. 의미가 다른 함수를 같은 이름으로 묶으면 호출자가 혼란스럽다.

```cpp
// Good — 같은 동작, 다른 입력 타입
class StringBuilder {
public:
    void Append(int value);
    void Append(double value);
    void Append(absl::string_view value);
};
```

```cpp
// 회피 — 의미가 다른 두 함수
class Service {
public:
    void Process();              // 전체 처리
    void Process(int item_id);   // 단일 항목 처리?
                                 // 호출자는 두 함수가 같은 일을 한다고 오해할 수 있다
};
```

후자는 이름을 다르게 짓는 편이 안전하다.

```cpp
// Good
class Service {
public:
    void ProcessAll();
    void ProcessItem(int item_id);
};
```

오버로딩이 모호한 호출을 만들 수 있는 경우도 피한다.

```cpp
void Func(int x);
void Func(long x);

Func(42);            // 보통은 int지만, 플랫폼에 따라 long이 더 맞을 수도?
Func(int{42});       // 명시 호출 — 호출자에게 부담
```

포인터 오버로딩과 정수 오버로딩이 섞이면 `0`이나 `NULL`이 호출하는 함수가 의외다.

```cpp
void Send(int x);
void Send(const char* msg);

Send(0);         // int 버전 (Send(int))
Send(NULL);      // 컴파일러에 따라 다름
Send(nullptr);   // const char* 버전
```

`nullptr`을 항상 쓰는 것이 답이지만, 이런 시그니처 자체를 피하는 게 더 안전하다.

## Default Arguments

기본 인자는 non-virtual 함수에서만 쓴다. virtual 함수에서는 호출자의 정적 타입에 따라 기본값이 결정되기 때문에 직관과 어긋난다.

```cpp
// 회피 — virtual에 기본 인자
class Base {
public:
    virtual void Func(int x = 10);
};
class Derived : public Base {
public:
    void Func(int x = 20) override;
};

Base* p = new Derived;
p->Func();
// 어느 기본값이 쓰일까? Base의 10이 정적으로 적용되고,
// 호출은 Derived::Func로 동적 디스패치된다. → Derived::Func(10)
// 거의 항상 버그다.
```

해결은 오버로드로 명시하는 것이다.

```cpp
// Good
class Base {
public:
    void Func() { Func(10); }
    virtual void Func(int x);
};
```

기본 인자는 함수 포인터에도 전달되지 않는다.

```cpp
void Greet(const std::string& name, const std::string& greeting = "Hello");

void (*fp)(const std::string&) = &Greet;   // 컴파일 에러 — 시그니처 불일치
auto bound = [](const std::string& n) { Greet(n); };   // 우회
```

비교적 안전한 쓰임은 단순 non-virtual 함수에서의 옵션 인자다.

```cpp
// OK
void Print(const std::string& msg, bool with_timestamp = false);

Print("Hello");
Print("Hello", true);
```

## Trailing Return Type Syntax

후행 반환 타입(`auto f() -> T`)은 템플릿이나 `decltype`가 필요한 경우에만 쓴다. 일반 함수에서는 전통 형식을 따른다.

```cpp
// 회피 — 일반 함수에 후행 반환
auto Add(int a, int b) -> int { return a + b; }

// Good — 일반 형식
int Add(int a, int b) { return a + b; }
```

후행 반환이 합당한 경우는 반환 타입이 매개변수에 의존할 때다.

```cpp
// 매개변수 타입에 따라 반환 타입이 달라짐
template <typename T, typename U>
auto Add(T a, U b) -> decltype(a + b) {
    return a + b;
}

// C++14 이후 auto 반환만으로도 충분한 경우가 많다
template <typename T, typename U>
auto Add(T a, U b) {
    return a + b;
}
```

람다에서는 반환 타입을 명시하고 싶을 때 후행 형식이 자연스럽다.

```cpp
// Good
auto cmp = [](int a, int b) -> bool { return a > b; };

// 추론으로 충분할 때는 생략
auto cmp = [](int a, int b) { return a > b; };
```

## 작은 예시 — 함수 한 묶음

지금까지의 규칙을 적용한 가상의 헤더다.

```cpp
// myproject/order/processor.h
namespace myproject::order {

struct Totals {
    double subtotal;
    double tax;
    double total;
};

// 입력만, 반환값으로 결과 + Status
absl::StatusOr<Totals> ComputeTotals(const Order& order);

// 짧고 단일 책임
bool IsValidOrderId(int id);

// 오버로드 — 같은 동작, 다른 입력 타입
void LogOrder(const Order& order);
void LogOrder(int order_id);

// 기본 인자 — non-virtual
void SaveOrder(const Order& order, bool with_timestamp = true);

// move-in으로 소유권 이전
absl::Status Submit(std::unique_ptr<Order> order);

}  // namespace myproject::order
```

## 정리

- 출력은 반환값으로. 출력 매개변수는 회피.
- 여러 값은 명명된 struct. `pair`/`tuple`은 차선.
- 오류는 `absl::StatusOr<T>` 또는 `std::optional<T>`.
- 입력 매개변수 타입은 의도에 따라 `const T&`, `T*`, `Span`, `string_view`.
- 매개변수 순서는 입력 먼저, 출력 뒤.
- 본문은 40줄 이하를 목표로, 책임이 섞이면 분해.
- 오버로딩은 같은 동작의 타입 변형에 한정.
- 기본 인자는 non-virtual에서만.
- 후행 반환은 템플릿/`decltype`/람다에서만.

## 다음 장 예고

다음은 **Other Features I**다. 스마트 포인터, 예외 금지, RTTI 제한, 캐스팅 규칙을 다룬다.

## 관련 항목

- [Ch 4: Classes](/blog/embedded/automotive/google-cpp/chapter04-classes)
- [Ch 6: Memory / Exceptions](/blog/embedded/automotive/google-cpp/chapter06-features-memory-exceptions)
