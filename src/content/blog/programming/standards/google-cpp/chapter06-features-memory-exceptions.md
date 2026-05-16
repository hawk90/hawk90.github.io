---
title: "Ch 6: Other Features I — Memory / Exceptions"
date: 2025-05-13T06:00:00
description: "Ownership / Smart Pointers / Rvalue / Friends / Exceptions / noexcept / RTTI / Casting / Streams."
tags: [Google, C++, Style-Guide, Smart-Pointer, Exception, RTTI, Casting]
series: "Google C++ Style"
seriesOrder: 6
draft: false
---

이 장은 Google 가이드에서 가장 강한 의견이 모인 자리다. 예외 금지, RTTI 제한, C 스타일 캐스트 금지처럼 다른 표준과 가장 크게 갈리는 결정들이 여기에 있다.

## Ownership and Smart Pointers

소유권은 타입으로 표현한다. `unique_ptr`이 단일 소유, `shared_ptr`이 공유 소유, 그리고 비소유 참조는 원시 포인터나 참조다.

기본은 `unique_ptr`이다.

```cpp
// Good — 단일 소유
std::unique_ptr<Database> OpenDatabase(absl::string_view path) {
    auto db = std::make_unique<Database>();
    if (!db->Open(path)) {
        return nullptr;
    }
    return db;
}

// 사용
auto db = OpenDatabase("/data/main.db");
if (db) { db->Query("..."); }
```

`new`를 직접 쓰지 않고 `make_unique`/`make_shared`를 쓰는 것이 관례다. 예외 안전성과 가독성 둘 다 좋아진다.

```cpp
// 회피
std::unique_ptr<Foo> p(new Foo(a, b, c));

// Good
auto p = std::make_unique<Foo>(a, b, c);
```

`shared_ptr`은 *진짜 공유 소유*가 의미를 가질 때만 쓴다. 참조 카운트의 원자적 갱신은 비용이 있고, 순환 참조는 누출의 원인이 된다.

```cpp
// 회피 — 한 명의 소유자가 자명한데 shared로 잡음
std::shared_ptr<Logger> logger = std::make_shared<Logger>();
Service service(logger);   // 사실은 unique로 충분

// Good — 진짜 공유 (immutable cache 등)
class ImageCache {
public:
    std::shared_ptr<const Image> Get(absl::string_view key);
private:
    absl::flat_hash_map<std::string, std::shared_ptr<const Image>> entries_;
};
```

비소유 참조에는 원시 포인터나 참조를 쓴다. 함수 시그니처에서 *빌리기*를 명시하는 관용이다.

```cpp
// 비소유 — 함수가 잠시 본다
void Render(const Image* image);          // null 가능성 인정
void Render(const Image& image);          // null 불가
void Render(absl::Nullable<const Image*> image);   // Abseil annotation
```

순환 참조 위험이 있는 경우는 `weak_ptr`을 쓴다.

```cpp
class Node {
    std::shared_ptr<Node> child_;
    std::weak_ptr<Node> parent_;   // 순환을 끊는다
};
```

## Rvalue References

`&&`(rvalue reference)는 두 가지 용도로만 쓴다. 이동 의미를 표현할 때와, 템플릿에서 forwarding reference로 쓸 때다.

이동 생성자/대입은 거의 모든 자원 보유 클래스에 정의한다.

```cpp
class Buffer {
public:
    Buffer(size_t size) : data_(new char[size]), size_(size) {}
    ~Buffer() { delete[] data_; }

    Buffer(Buffer&& other) noexcept
        : data_(other.data_), size_(other.size_) {
        other.data_ = nullptr;
        other.size_ = 0;
    }
    Buffer& operator=(Buffer&& other) noexcept {
        if (this != &other) {
            delete[] data_;
            data_ = other.data_;
            size_ = other.size_;
            other.data_ = nullptr;
            other.size_ = 0;
        }
        return *this;
    }

    // Copy는 금지
    Buffer(const Buffer&) = delete;
    Buffer& operator=(const Buffer&) = delete;
private:
    char* data_;
    size_t size_;
};
```

이동 생성자는 가능한 한 `noexcept`로 표시한다. `std::vector`가 재할당 시 이동 vs 복사를 결정할 때 `noexcept`를 본다.

forwarding reference는 템플릿에서 인자의 value category를 보존할 때 쓴다.

```cpp
template <typename T>
void EnqueueWrapper(MessageQueue* q, T&& message) {
    q->Enqueue(std::forward<T>(message));   // lvalue면 lvalue로, rvalue면 rvalue로
}

std::string s = "hi";
EnqueueWrapper(&q, s);              // lvalue로 전달
EnqueueWrapper(&q, std::move(s));   // rvalue로 전달
```

이동과 forwarding 외에서 `&&`를 쓸 일은 거의 없다. 매개변수 타입을 `T&&`로 받는 것은 의도가 모호하므로 피한다.

```cpp
// 회피
void Process(Widget&& w);   // rvalue만 받는다? 왜?

// Good — 보통은 const 참조나 by-value가 충분하다
void Process(const Widget& w);
void Process(Widget w);   // sink 함수면 by-value
```

## Friends

`friend` 선언은 같은 파일 안의 친구에게만 허용된다. 다른 파일에 정의된 클래스를 `friend`로 두는 것은 캡슐화를 광범위하게 깨뜨린다.

```cpp
// foo.h
class Foo {
public:
    int value() const { return value_; }
private:
    int value_;
    friend class FooHelper;        // 같은 파일에 정의될 클래스
    friend bool IsValid(const Foo&); // 같은 파일에 정의될 함수
};

class FooHelper { /* Foo의 private에 접근 */ };
bool IsValid(const Foo& f) { return f.value_ >= 0; }
```

테스트 클래스에 friend를 주는 것은 일반적인 관용이다.

```cpp
class OrderProcessor {
public:
    absl::Status Process(const Order& order);
private:
    bool IsEligible(const Order& order) const;
    friend class OrderProcessorTest;   // 테스트에서 private 검증
};
```

## Exceptions

Google은 새 코드에서 C++ 예외를 쓰지 않는다. 이는 가이드 전체에서 가장 자주 질문받는 결정이다.

```cpp
// 회피
void DoSomething() {
    if (failed) {
        throw std::runtime_error("...");
    }
}
```

```cpp
// Good — Status 반환
absl::Status DoSomething() {
    if (failed) {
        return absl::InternalError("...");
    }
    return absl::OkStatus();
}
```

이유는 기술적 우열보다 호환성 비용이다. Google 코드베이스 대부분이 exception-unsafe하기 때문에 새로 예외를 도입하면 모든 코드를 재검토해야 한다. 그 비용이 비현실적이다.

대안은 `absl::Status`와 `absl::StatusOr<T>`다. 두 타입은 짝을 이뤄 오류와 값을 표현한다.

```cpp
// 값 없이 성공/실패만
absl::Status Initialize() {
    RETURN_IF_ERROR(LoadConfig());
    RETURN_IF_ERROR(ConnectToDatabase());
    return absl::OkStatus();
}

// 성공 시 값을 함께
absl::StatusOr<User> FindUser(int id) {
    auto* user = LookupInCache(id);
    if (user != nullptr) {
        return *user;
    }
    auto from_db = LoadFromDatabase(id);
    if (!from_db.ok()) {
        return from_db.status();
    }
    return *from_db;
}

// 호출자
auto user_or = FindUser(42);
if (!user_or.ok()) {
    return user_or.status();
}
User user = std::move(*user_or);
```

`RETURN_IF_ERROR`/`ASSIGN_OR_RETURN` 매크로는 Status 흐름을 try/catch 흐름만큼 짧게 만들어 준다.

```cpp
absl::Status Process() {
    ASSIGN_OR_RETURN(User user, FindUser(42));
    ASSIGN_OR_RETURN(Order order, GetActiveOrder(user.id));
    RETURN_IF_ERROR(SubmitOrder(order));
    return absl::OkStatus();
}
```

외부 라이브러리가 예외를 던지면 경계에서 잡아 Status로 변환한다.

```cpp
absl::Status WrapThirdParty(absl::string_view input) {
    try {
        third_party::Parse(input);
        return absl::OkStatus();
    } catch (const third_party::ParseError& e) {
        return absl::InvalidArgumentError(e.what());
    } catch (const std::exception& e) {
        return absl::InternalError(e.what());
    }
}
```

## `noexcept`

`noexcept`는 의미가 있는 자리에만 쓴다. 이동 생성자/대입에 붙이는 것이 가장 흔하다.

```cpp
class Vector {
public:
    Vector(Vector&& other) noexcept;
    Vector& operator=(Vector&& other) noexcept;
};
```

`std::vector`가 재할당할 때 원소를 이동할지 복사할지는 이동 생성자의 `noexcept` 여부로 결정된다. `noexcept`가 없으면 보수적으로 복사한다.

```cpp
std::vector<MyClass> v;
v.reserve(1000);
for (int i = 0; i < 1000; ++i) {
    v.emplace_back();   // MyClass의 이동이 noexcept면 빠르다
}
```

그 외의 함수에 `noexcept`를 무차별로 붙이면 나중에 예외(또는 `absl::Status`)를 던지는 동작을 추가할 때 시그니처를 바꿔야 한다. 정말 던지지 않는 것이 확실한 함수에만 붙인다.

## Run-Time Type Information (RTTI)

`dynamic_cast`와 `typeid`로 런타임 타입을 보는 일은 제한된다. 대부분의 경우 가상 함수로 풀 수 있다.

```cpp
// 회피 — 타입에 따라 분기
void Draw(Shape* s) {
    if (auto* c = dynamic_cast<Circle*>(s)) {
        DrawCircle(c);
    } else if (auto* r = dynamic_cast<Rectangle*>(s)) {
        DrawRectangle(r);
    }
}
```

```cpp
// Good — 다형성
class Shape {
public:
    virtual void Draw() const = 0;
    virtual ~Shape() = default;
};

class Circle : public Shape {
public:
    void Draw() const override { /* ... */ }
};

void Draw(const Shape* s) { s->Draw(); }
```

다형성으로 풀기 어려운 경우는 `std::variant`와 `std::visit`을 쓴다. 닫힌 집합의 타입을 안전하게 다룰 수 있다.

```cpp
using Event = std::variant<MouseClick, KeyPress, Resize>;

void Handle(const Event& e) {
    std::visit([](const auto& specific) {
        // 각 타입에 대한 처리
    }, e);
}
```

RTTI가 허용되는 자리는 테스트(특정 타입이 들어왔는지 검증), 디버그 출력, type-erased 컨테이너 내부 등으로 좁다.

```cpp
// 테스트에서는 OK
TEST(RendererTest, UsesCircleRenderer) {
    auto renderer = factory.Create(ShapeKind::kCircle);
    EXPECT_NE(dynamic_cast<CircleRenderer*>(renderer.get()), nullptr);
}
```

## Casting

C 스타일 캐스트는 금지다. 어떤 변환이 일어나는지가 코드에 드러나지 않기 때문이다.

```cpp
// 회피
int x = (int)floor(y);
Foo* p = (Foo*)ptr;
```

```cpp
// Good — 변환 종류가 코드에 드러남
int x = static_cast<int>(std::floor(y));
auto* p = static_cast<Foo*>(ptr);
```

각 캐스트의 용도는 다음과 같다.

```cpp
// static_cast — 값 변환, 상속 계층 down-cast
double d = 3.14;
int i = static_cast<int>(d);

Base* b = ...;
auto* d = static_cast<Derived*>(b);   // RTTI 검증 없이

// reinterpret_cast — 비트 패턴 재해석 (위험)
auto* bytes = reinterpret_cast<char*>(&value);

// const_cast — const 제거 (정말 필요할 때만)
void LegacyApi(char* buf);
void Wrapper(const char* buf) {
    LegacyApi(const_cast<char*>(buf));   // LegacyApi가 수정 안 하는 것이 확실해야 함
}

// dynamic_cast — RTTI 기반 down-cast (제한)
auto* derived = dynamic_cast<Derived*>(base);
```

C++20의 `std::bit_cast`는 비트 패턴 변환을 안전하게 한다. `reinterpret_cast`보다 항상 우선이다.

```cpp
// 회피
float f = 3.14f;
int bits = *reinterpret_cast<int*>(&f);   // strict aliasing 위반 가능

// Good
int bits = std::bit_cast<int>(f);
```

## Streams

`std::cout`/`std::cerr` 같은 스트림은 *사람이 읽는 출력*에만 쓴다. 로그, 직렬화, 파싱, 포매팅은 모두 다른 도구로 대체한다.

```cpp
// 회피 — 로그
std::cerr << "Error: " << msg << std::endl;

// Good — LOG 매크로
LOG(ERROR) << "Error: " << msg;
```

```cpp
// 회피 — 문자열 만들기
std::stringstream ss;
ss << "user_id=" << id << " age=" << age;
std::string s = ss.str();

// Good — absl::StrFormat / StrCat
std::string s = absl::StrFormat("user_id=%d age=%d", id, age);
std::string s = absl::StrCat("user_id=", id, " age=", age);
```

```cpp
// 회피 — 파싱
std::stringstream ss(input);
int x; ss >> x;

// Good — absl 변환 함수
int x;
if (!absl::SimpleAtoi(input, &x)) {
    return absl::InvalidArgumentError("not a number");
}
```

스트림이 문제인 이유는 무겁고 (locale, manipulator로 상태가 많음), 오류 처리가 어색하며 (stream state를 직접 점검), 포맷 변경이 어디서 일어났는지 추적하기 어렵기 때문이다.

사용자에게 직접 보여 주는 `std::cout` 출력 정도는 그대로 둔다.

```cpp
// OK
std::cout << "Welcome, " << user_name << "!\n";
```

## 정리

- 단일 소유는 `unique_ptr`, 공유 소유는 `shared_ptr`, 비소유는 raw pointer/reference.
- `new` 직접 사용보다 `make_unique`/`make_shared`.
- `&&`는 이동과 forwarding에만. 이동은 `noexcept` 표시.
- `friend`는 같은 파일 안에서만.
- 예외 금지. `absl::Status`/`StatusOr<T>` + `RETURN_IF_ERROR`/`ASSIGN_OR_RETURN`.
- `noexcept`는 이동 등 의미 있는 자리에만.
- RTTI 제한. 가상 함수 또는 `std::variant`로 대체.
- C 스타일 캐스트 금지. `static_cast`, `reinterpret_cast`, `const_cast`, `dynamic_cast`, `bit_cast`를 명시.
- 스트림은 사용자 출력에만. 로그·포매팅·파싱은 다른 도구.

## 다음 장 예고

다음은 **Other Features II**다. `const`/`constexpr`, 정수 타입, 매크로, `nullptr`, `sizeof`를 다룬다.

## 관련 항목

- [Ch 5: Functions](/blog/embedded/automotive/google-cpp/chapter05-functions)
- [Ch 7: const / Numbers / Macros](/blog/embedded/automotive/google-cpp/chapter07-features-const-macros)
