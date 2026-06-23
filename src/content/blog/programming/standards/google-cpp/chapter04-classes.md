---
title: "Ch 4: Classes"
date: 2026-05-18T04:00:00
description: "Constructors / Implicit Conversion / Copyable-Movable / Struct vs Class / Inheritance / Operator Overloading / Access / Declaration Order."
tags: [Google, C++, Style-Guide, Class, Inheritance]
series: "Google C++ Style"
seriesOrder: 4
draft: true
---

클래스는 추상화의 기본 단위다. Google 가이드는 클래스 설계에서 *명시성*과 *단순함*을 일관되게 강조한다. 이 장은 생성자에서 선언 순서까지 클래스의 모든 면을 다룬다.

## Doing Work in Constructors

생성자는 객체를 사용 가능한 상태로 만드는 일에만 집중한다. 복잡하거나 실패할 수 있는 작업은 별도 메서드로 빼야 한다.

Google이 예외를 쓰지 않기 때문에 생성자에서 실패를 알릴 길이 없다는 점이 가장 큰 이유다.

```cpp
// 회피 — 생성자에서 실패 가능 작업
class FileReader {
public:
    FileReader(const std::string& path) {
        fd_ = ::open(path.c_str(), O_RDONLY);
        if (fd_ < 0) {
            // 어떻게 실패를 알리지?
            // throw는 못 쓰고, 객체는 이미 만들어졌다.
        }
    }
private:
    int fd_;
};
```

해결은 빈 생성자와 `Init` 메서드로 분리하는 것이다.

```cpp
// Good
class FileReader {
public:
    FileReader() = default;
    ~FileReader();

    absl::Status Init(const std::string& path) {
        fd_ = ::open(path.c_str(), O_RDONLY);
        if (fd_ < 0) {
            return absl::NotFoundError(
                absl::StrCat("Cannot open: ", path));
        }
        return absl::OkStatus();
    }
private:
    int fd_ = -1;
};

// 호출
FileReader reader;
RETURN_IF_ERROR(reader.Init(path));
```

또 다른 함정은 생성자 안에서 가상 함수를 호출하는 것이다. 그 시점의 vtable은 아직 파생 클래스가 아니라 자신의 것이다.

```cpp
class Base {
public:
    Base() {
        SetUp();   // 위험! Base::SetUp이 호출된다
    }
    virtual void SetUp();
};

class Derived : public Base {
public:
    void SetUp() override;   // Base 생성자에서는 호출되지 않음
};

Derived d;   // Derived::SetUp이 호출될 거라고 기대하면 버그
```

생성자에서는 명시적으로 `Base::SetUp()`만 호출하거나, 외부에서 `Init`을 호출하도록 설계한다.

## Implicit Conversions

단일 인자 생성자는 항상 `explicit`을 붙인다. 단일 인자 변환 연산자도 마찬가지다.

```cpp
class MyString {
public:
    MyString(const char* s);              // 회피 — implicit
    explicit MyString(const char* s);     // Good
};
```

`explicit`이 없으면 다음과 같은 코드가 무성의하게 컴파일된다.

```cpp
void Print(MyString s);

Print("hello");   // implicit이면 OK — MyString이 자동 생성된다
Print("hello");   // explicit이면 컴파일 에러
Print(MyString("hello"));   // explicit이면 명시적으로 호출
```

문자열 리터럴을 함수에 넘기는 게 의도였는지, 아니면 그냥 잘못 쓴 건지 코드만으로는 모른다. `explicit`은 이런 의도를 강제로 드러내게 한다.

복사·이동 생성자는 implicit이어야 동작하므로 예외다.

```cpp
class Vec {
public:
    Vec(int x, int y);              // 다중 인자 — explicit 불필요
    Vec(const Vec& other);          // 복사 생성자 — explicit 금지
    Vec(Vec&& other) noexcept;      // 이동 생성자 — explicit 금지
};
```

변환 연산자도 `explicit`을 붙인다.

```cpp
class Handle {
public:
    explicit operator bool() const { return ptr_ != nullptr; }
};

Handle h = MakeHandle();
if (h) { /* OK — bool로 명시적 변환 */ }

bool flag = h;   // 컴파일 에러 — explicit이라 직접 대입 안 됨
bool flag = static_cast<bool>(h);   // OK
```

## Copyable and Movable Types

복사 가능성과 이동 가능성은 명시적으로 결정한다. C++ 컴파일러가 자동으로 생성해 주는 경우가 많아서 그냥 두면 의도가 드러나지 않는다.

```cpp
// 회피 — 의도가 보이지 않음
class Manager {
public:
    Manager();
    ~Manager();
    // 복사 가능? 이동 가능? 직접 정의 안 함 → 컴파일러가 결정
};
```

다음 세 가지 패턴 중 하나를 명시적으로 선택한다.

```cpp
// 1. 값 타입 — copy + move 모두
class Point {
public:
    Point(double x, double y);

    Point(const Point&) = default;
    Point& operator=(const Point&) = default;
    Point(Point&&) = default;
    Point& operator=(Point&&) = default;
private:
    double x_, y_;
};
```

```cpp
// 2. Move-only — 자원 소유
class FileHandle {
public:
    explicit FileHandle(int fd);
    ~FileHandle();

    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;
    FileHandle(FileHandle&& other) noexcept;
    FileHandle& operator=(FileHandle&& other) noexcept;
private:
    int fd_;
};
```

```cpp
// 3. Non-copyable, non-movable — 매니저, 싱글톤
class GlobalRegistry {
public:
    GlobalRegistry();

    GlobalRegistry(const GlobalRegistry&) = delete;
    GlobalRegistry& operator=(const GlobalRegistry&) = delete;
    // 이동도 막힘 (delete된 복사가 있으면 이동도 자동 생성 안 됨)
};
```

`= default`와 `= delete`를 명시하면 의도가 코드에 박힌다. 컴파일러의 변덕에 기대지 않는다.

## Structs vs. Classes

`struct`는 *passive data carrier*, `class`는 *불변식을 가진 객체*다.

```cpp
// struct — 데이터를 묶기만
struct UrlComponents {
    std::string scheme;
    std::string host;
    int port;
    std::string path;
};

// class — 동작과 불변식
class Counter {
public:
    void Increment();
    int Value() const { return value_; }
private:
    int value_ = 0;   // 불변식: 절대 음수가 되지 않는다
};
```

`struct`라면 모든 멤버가 public이고, trivial 생성자 외에는 메서드가 없어야 한다. setter/getter나 검증 로직이 필요하다는 신호가 보이면 `class`로 바꾼다.

```cpp
// struct로 시작했지만 검증이 필요해진 경우
struct Email {
    std::string address;   // 형식 검증은 어디서?
};

// class로 옮긴다
class Email {
public:
    static absl::StatusOr<Email> Parse(absl::string_view input);
    const std::string& address() const { return address_; }
private:
    explicit Email(std::string address) : address_(std::move(address)) {}
    std::string address_;
};
```

## Structs vs. Pairs and Tuples

여러 값을 묶을 때 `std::pair`나 `std::tuple`보다 명명된 멤버를 가진 struct가 낫다.

```cpp
// 회피 — pair
std::pair<std::string, int> GetNameAndAge();

auto p = GetNameAndAge();
std::cout << p.first << " " << p.second;   // first가 이름? 나이?
```

```cpp
// Good — 명명된 struct
struct PersonInfo {
    std::string name;
    int age;
};
PersonInfo GetPersonInfo();

auto info = GetPersonInfo();
std::cout << info.name << " " << info.age;
```

tuple도 같은 이유로 회피한다. 구조분해(structured bindings)로 가독성을 어느 정도 살릴 수 있지만, 이름이 호출지점에 의존한다는 단점이 남는다.

```cpp
// 가독성은 좋아지지만 이름이 호출자에게 달려 있다
auto [name, age, salary] = GetEmployeeData();
```

struct를 쓰면 이름이 정의에 묶이므로 잘못 부를 일이 없다.

```cpp
struct EmployeeData {
    std::string name;
    int age;
    double salary;
};
auto emp = GetEmployeeData();
emp.salary;   // 정의가 곧 문서
```

## Inheritance

상속은 *is-a* 관계가 명확할 때만 쓴다. 형태는 `public` 상속만 허용된다.

```cpp
// Good — is-a 관계
class Animal {
public:
    virtual void MakeSound() const = 0;
    virtual ~Animal() = default;
};

class Dog : public Animal {
public:
    void MakeSound() const override { /* ... */ }
};
```

`private`/`protected` 상속은 *구현 재사용*을 표현하지만, 합성(composition)이 거의 항상 더 명확하다.

```cpp
// 회피 — private 상속으로 구현 재사용
class Cache : private std::unordered_map<Key, Value> { /* ... */ };

// Good — 합성
class Cache {
private:
    std::unordered_map<Key, Value> map_;
};
```

가상 메서드를 override할 때는 `override` 키워드를 반드시 붙인다. 더 이상 override를 허용하지 않을 때는 `final`을 붙인다.

```cpp
class Base {
public:
    virtual void Method();
    virtual void Frozen();
};

class Derived : public Base {
public:
    void Method() override;             // 필수
    void Frozen() final override;       // 더는 override 못 함
    void New() override;                // 컴파일 에러 — base에 없음
};
```

`override`/`final`을 강제하면 base 시그니처 변경에 따른 silent 미스매치를 컴파일러가 잡아 준다.

```cpp
// base에서 시그니처 변경
class Base { virtual void Method(int) { /* ... */ } };

// Derived가 옛 시그니처로 override
class Derived : public Base {
public:
    void Method() override;   // 컴파일 에러 — base에 (int)가 있음
};
```

### 다중 상속

다중 상속은 모든 base 중 최대 하나만 구현을 가질 때만 허용된다. 즉 *인터페이스 다중 상속*은 OK, *구체 다중 상속*은 회피.

```cpp
// Good — pure interfaces + 최대 한 개의 구현 클래스
class Drawable {
public:
    virtual void Draw() const = 0;
    virtual ~Drawable() = default;
};
class Serializable {
public:
    virtual void Serialize(std::string* out) const = 0;
    virtual ~Serializable() = default;
};

class Widget : public Drawable, public Serializable {
public:
    void Draw() const override;
    void Serialize(std::string* out) const override;
};
```

```cpp
// 회피 — 구체 클래스 다중 상속
class Widget : public ConcreteA, public ConcreteB { /* ... */ };
```

## Operator Overloading

연산자 오버로딩은 의미가 명백할 때만 한다. `+`, `==`, `<<` 같은 익숙한 의미를 유지해야 한다.

```cpp
// Good — 의미 명백
class Vector {
public:
    Vector operator+(const Vector& other) const;
    Vector& operator+=(const Vector& other);
    bool operator==(const Vector& other) const;
};

// 회피 — 의미 모호
class HashMap {
public:
    HashMap& operator,(const Pair& p);    // 쉼표 연산자에 무슨 의미?
    bool operator&&(const HashMap& other); // && — 단락 평가가 깨진다
};
```

비교 연산자는 대칭과 일관성을 갖춰야 한다. C++20의 `<=>`(spaceship)를 쓰면 한 번에 정의할 수 있다.

```cpp
// C++17 이전 — 모두 직접
class Date {
public:
    bool operator==(const Date& other) const;
    bool operator!=(const Date& other) const;
    bool operator<(const Date& other) const;
    bool operator<=(const Date& other) const;
    bool operator>(const Date& other) const;
    bool operator>=(const Date& other) const;
};

// C++20
class Date {
public:
    auto operator<=>(const Date& other) const = default;
    bool operator==(const Date& other) const = default;
};
```

스트림 출력 연산자는 자유 함수로 두는 게 관례다.

```cpp
class Point {
    double x_, y_;
public:
    friend std::ostream& operator<<(std::ostream& os, const Point& p) {
        return os << "(" << p.x_ << ", " << p.y_ << ")";
    }
};
```

## Access Control

데이터 멤버는 `private`이 기본이다. 외부에서 필요하면 접근자(`Get`/`Set`)를 제공한다. `struct`는 예외다.

```cpp
// Good — class의 데이터는 private
class Foo {
public:
    int value() const { return value_; }
    void set_value(int v) { value_ = v; }
private:
    int value_;
};

// Good — struct는 public 데이터
struct Point {
    double x;
    double y;
};
```

`protected` 데이터 멤버는 캡슐화를 약하게 만든다. 파생 클래스가 부모의 내부 표현에 직접 손대게 되기 때문이다. `protected` 접근자만 두는 편이 낫다.

```cpp
// 회피 — protected 데이터
class Base {
protected:
    std::vector<int> data_;
};

// Good — protected 접근자
class Base {
protected:
    const std::vector<int>& data() const { return data_; }
    void AppendData(int x) { data_.push_back(x); }
private:
    std::vector<int> data_;
};
```

## Declaration Order

클래스 안의 선언은 정해진 순서를 따른다. 모든 클래스에서 일관성이 유지되면 어디에 무엇이 있는지 빠르게 찾을 수 있다.

```cpp
class MyClass {
public:
    // 1. Types and type aliases
    using Iterator = std::vector<int>::iterator;
    enum class Status { kOk, kError };

    // 2. Static constants
    static constexpr int kMaxItems = 100;

    // 3. Factory functions
    static MyClass Create(absl::string_view name);

    // 4. Constructors, assignment, destructor
    MyClass();
    explicit MyClass(int initial);
    MyClass(const MyClass&) = default;
    MyClass& operator=(const MyClass&) = default;
    ~MyClass();

    // 5. Member functions (그룹별)
    void DoWork();
    int GetValue() const;
    void SetValue(int v);

protected:
    // 같은 순서 (있다면)

private:
    // 같은 순서

    // 6. Data members (마지막)
    int value_ = 0;
    std::vector<int> items_;
};
```

큰 클래스에서는 관련 메서드끼리 그룹을 짓고 빈 줄로 구분하면 더 읽기 좋다.

```cpp
class HttpClient {
public:
    // Construction
    HttpClient();
    ~HttpClient();

    // Connection
    absl::Status Connect(absl::string_view url);
    void Disconnect();

    // Requests
    absl::StatusOr<Response> Get(absl::string_view path);
    absl::StatusOr<Response> Post(absl::string_view path,
                                  absl::string_view body);

    // Configuration
    void SetTimeout(absl::Duration d);
    void SetMaxRetries(int n);

private:
    // ...
};
```

## 작은 예시 — 클래스 한 장

지금까지의 규칙을 적용한 예다.

```cpp
// myproject/cache/timed_cache.h
namespace myproject::cache {

class TimedCache {
public:
    // Types
    using Clock = std::chrono::steady_clock;

    // Constants
    static constexpr absl::Duration kDefaultTtl = absl::Seconds(60);

    // Factory
    static absl::StatusOr<TimedCache> Create(size_t capacity,
                                             absl::Duration ttl);

    // Special member functions
    TimedCache(const TimedCache&) = delete;
    TimedCache& operator=(const TimedCache&) = delete;
    TimedCache(TimedCache&&) noexcept = default;
    TimedCache& operator=(TimedCache&&) noexcept = default;
    ~TimedCache();

    // Operations
    void Put(absl::string_view key, std::string value);
    std::optional<std::string> Get(absl::string_view key);

    // Configuration
    size_t size() const { return entries_.size(); }
    size_t capacity() const { return capacity_; }

private:
    TimedCache(size_t capacity, absl::Duration ttl);

    struct Entry {
        std::string value;
        Clock::time_point expiry;
    };

    size_t capacity_;
    absl::Duration ttl_;
    absl::flat_hash_map<std::string, Entry> entries_;
};

}  // namespace myproject::cache
```

`explicit`은 없지만 단일 인자 생성자가 private이므로 implicit 변환 위험이 없다. copy는 막혔고 move만 허용된다. 데이터는 모두 private이며 짧은 inline 접근자가 따로 있다.

## 정리

- 생성자는 가볍게. 실패 가능 작업은 `Init`/`Create`로 분리.
- 생성자에서 가상 함수 호출 금지.
- 단일 인자 생성자와 변환 연산자는 항상 `explicit`.
- copy/move를 `= default` 또는 `= delete`로 명시.
- `struct`는 passive 데이터, `class`는 불변식.
- `pair`/`tuple`보다 명명된 struct.
- `public` 상속만. 다중 상속은 인터페이스만.
- override는 `override` 키워드 강제, 닫을 거면 `final`.
- 데이터는 `private`, `protected` 데이터는 피한다.
- 선언 순서는 type → const → factory → ctor → method → data.

## 다음 장 예고

다음은 **Functions**다. 입출력, 함수 길이, 오버로딩, 기본 인자, trailing return을 다룬다.

## 관련 항목

- [Ch 3: Scoping](/blog/programming/standards/google-cpp/chapter03-scoping)
- Ch 5: Functions
