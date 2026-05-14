---
title: "가이드라인 24: 인터페이스 표준화에 Adapter를 사용하라"
date: 2026-05-14T00:00:00
description: "Adapter 패턴은 호환되지 않는 인터페이스를 연결한다. 외부 API와 legacy 코드를 표준 인터페이스로 통합한다."
tags: [C++, Software Design, Adapter, Design Patterns]
series: "C++ Software Design"
seriesOrder: 24
draft: true
---

## 왜 이 가이드라인이 중요한가?

```cpp
// 우리 시스템 — 표준 Logger 인터페이스
class ILogger {
public:
    virtual void log(const std::string& msg) = 0;
};

// 외부 라이브러리 — 다른 인터페이스
class ExternalLib {
public:
    void write_log(int level, const char* msg);     // 다른 시그니처
};
```

ExternalLib을 우리 코드에서 그대로 쓸 수 없다. 인터페이스가 맞지 않는다.

**Adapter 패턴**이 두 호환되지 않는 인터페이스를 잇는다.

```cpp
class ExternalLibAdapter : public ILogger {
    ExternalLib& external_;
public:
    explicit ExternalLibAdapter(ExternalLib& e) : external_(e) {}
    void log(const std::string& msg) override {
        external_.write_log(0, msg.c_str());     // 변환
    }
};
```

우리 코드는 `ILogger`에만 의존한다. Adapter가 외부 라이브러리와 우리 인터페이스를 잇는 다리가 된다.

## 핵심 내용

- **Adapter 패턴** — 호환되지 않는 인터페이스를 연결한다.
- 본질은 **두 인터페이스의 다리**(변환자)다.
- 활용은 외부 라이브러리 통합, legacy 코드 wrapping, 표준화 등이다.
- C++ 구현은 가상 함수, 템플릿, `std::function`, `std::variant` 모두 가능하다.
- 표준 라이브러리에 `std::stack`, stream iterator 등 예가 풍부하다.

## GoF Adapter 구조

```cpp
// 우리 시스템의 표준 인터페이스 (Target)
class ITarget {
public:
    virtual ~ITarget() = default;
    virtual void request() = 0;
};

// 외부 라이브러리 (Adaptee)
class Adaptee {
public:
    void specific_request();
};

// Adapter — Target 인터페이스를 구현하고, 내부에서 Adaptee를 사용한다
class Adapter : public ITarget {
    Adaptee& adaptee_;
public:
    explicit Adapter(Adaptee& a) : adaptee_(a) {}

    void request() override {
        adaptee_.specific_request();     // 변환
    }
};
```

GoF 표준은 Object Adapter(composition)다. Class Adapter(private 상속)는 C++에서 가능은 하지만 흔히 쓰지 않는다.

## 실전 — 외부 라이브러리 wrapping

```cpp
// 우리 시스템 — Compression 추상화
class ICompressor {
public:
    virtual ~ICompressor() = default;
    virtual std::vector<std::byte> compress(std::span<const std::byte>) = 0;
};

// 외부 zlib (C API)
extern "C" {
    int compress(unsigned char* dest, unsigned long* destLen,
                 const unsigned char* source, unsigned long sourceLen);
}

// Adapter
class ZlibAdapter : public ICompressor {
public:
    std::vector<std::byte> compress(std::span<const std::byte> data) override {
        unsigned long out_size = data.size() * 2 + 12;     // zlib 권장 크기
        std::vector<std::byte> result(out_size);

        ::compress(
            reinterpret_cast<unsigned char*>(result.data()),
            &out_size,
            reinterpret_cast<const unsigned char*>(data.data()),
            data.size()
        );

        result.resize(out_size);
        return result;
    }
};

// 사용자 코드는 ICompressor에만 의존한다
void backup(ICompressor& c, std::span<const std::byte> data) {
    auto compressed = c.compress(data);
    // save compressed
}

ZlibAdapter zlib;
backup(zlib, data);
```

zlib의 C API가 OOP 인터페이스로 들어왔다. 사용자 코드는 zlib의 디테일을 알 필요가 없다.

## 다양한 Adaptee 지원

```cpp
class ZlibAdapter : public ICompressor { /* ... */ };
class ZstdAdapter : public ICompressor { /* ... */ };
class LzmaAdapter : public ICompressor { /* ... */ };

// 사용자 코드는 Adapter를 갈아 끼울 수 있다
ICompressor& compressor = some_factory.create();
backup(compressor, data);
```

표준 인터페이스 한 자리에 다양한 구현을 통합한다.

## Adapter vs Wrapper

| 개념 | 의도 |
| --- | --- |
| **Adapter** | 인터페이스 변환 — 호환되지 않는 API를 표준에 맞춘다 |
| **Wrapper** | 일반 용어 — 객체를 감싼다(목적은 다양하다) |
| **Decorator** | 기능 추가 — 같은 인터페이스에 동작을 더한다(가이드라인 35) |
| **Proxy** | 접근 제어 — 같은 인터페이스(lazy, security 등) |

Adapter는 **인터페이스 변환이 본질**이다. 다른 wrapping 패턴과 구분한다.

## 표준 라이브러리의 Adapter

### Container Adapter

```cpp
std::stack<int>;           // std::deque를 stack 인터페이스로 adapt
std::queue<int>;
std::priority_queue<int>;

// 내부 컨테이너는 다양하게 고를 수 있다
std::stack<int, std::vector<int>>;     // vector를 stack으로 adapt
```

`stack`, `queue`, `priority_queue`가 내부 컨테이너를 자기 인터페이스로 adapt한다.

### Iterator Adapter

```cpp
std::reverse_iterator;
std::back_insert_iterator;
std::ostream_iterator;
std::istream_iterator;

// 사용
std::vector<int> v;
std::copy(v.rbegin(), v.rend(), std::back_inserter(other));
//          ↑                     ↑
//          reverse adapter       insert adapter
```

각 iterator adapter가 iterator를 다른 의미로 변환한다.

### Function Adapter

```cpp
auto greater = std::greater<int>{};
auto less = std::not_fn(greater);     // not_fn — 반대로 만든다

auto bound = std::bind_front(some_function, arg1);     // C++20
```

`std::not_fn`이나 `std::bind`가 함수 객체 adapter다.

## 모던 — Type Erasure Adapter

```cpp
// 어떤 callable이든 ICompressor처럼 다룬다
using Compressor = std::function<std::vector<std::byte>(std::span<const std::byte>)>;

void backup(Compressor c, std::span<const std::byte> data) {
    auto compressed = c(data);
    // ...
}

// 어떤 callable이든 받는다
backup([](auto data) { return /* zlib */; }, my_data);
backup(ZstdLib{}, my_data);     // functor
backup(zstd_compress, my_data);  // 함수 포인터
```

`std::function`이 type erasure adapter다. 가상 함수 hierarchy 없이 같은 효과를 낸다.

## Stream Adapter — C++의 모범

```cpp
std::ifstream file{"data.txt"};
std::stringstream buffer;
buffer << file.rdbuf();     // file의 stream buffer를 string으로 옮긴다
std::string content = buffer.str();
```

stream은 다양한 source/sink를 한 인터페이스로 통합한다. stream adapter로 file, memory, network를 같은 흐름에 둔다.

## C++20 Range Adapter

```cpp
auto evens = numbers
    | std::views::filter([](int x) { return x % 2 == 0; })
    | std::views::transform([](int x) { return x * x; })
    | std::views::take(10);
```

ranges view가 adapter chain이다. 각 view가 이전 range를 다른 인터페이스로 변환한다.

## 함정 — Adapter의 비용

```cpp
class Adapter : public ITarget {
    Adaptee adaptee_;
public:
    void request() override {
        // 변환 로직 — 종종 비싸다
        std::string converted = convert(...);
        adaptee_.specific_request(converted);
    }
};
```

매 호출마다 변환 비용이 든다. 핫 패스라면 측정해 본다.

해법은 ctor에서 한 번만 변환하거나 결과를 캐싱하는 것이다.

## Adapter + DI

```cpp
class Service {
    ICompressor& compressor_;
public:
    explicit Service(ICompressor& c) : compressor_(c) {}
};

// 실제 — Adapter를 주입한다
ZlibAdapter zlib;
Service svc{zlib};

// 테스트 — Mock 또는 다른 Adapter
class FakeCompressor : public ICompressor { /* ... */ };
FakeCompressor fake;
Service test_svc{fake};
```

Adapter는 DI에 자연스럽다.

## Class Adapter (private 상속)

```cpp
class ZlibAdapter : private ZlibCompressor, public ICompressor {
    // private 상속으로 ZlibCompressor 인터페이스를 숨긴다
    // public 상속으로 ICompressor를 노출한다
public:
    std::vector<std::byte> compress(std::span<const std::byte> data) override {
        return ZlibCompressor::compress(data);     // private base 호출
    }
};
```

private 상속은 composition의 대안이다(EC++ 항목 39). 보통은 composition(object adapter)이 더 단순하다.

## 모던 변형 — std::variant Adapter

```cpp
struct ZlibCompressor { /* compress 메서드 */ };
struct ZstdCompressor { /* compress 메서드 */ };

using Compressor = std::variant<ZlibCompressor, ZstdCompressor>;

std::vector<std::byte> compress(const Compressor& c, std::span<const std::byte> data) {
    return std::visit([data](const auto& impl) {
        return impl.compress(data);
    }, c);
}
```

variant 기반은 값 의미론과 닫힌 adapter 집합을 함께 가져간다.

## 함정 — Adapter 남용

```cpp
class Adapter1 : public Interface1 {
    Adapter2& adapter2_;
};

class Adapter2 : public Interface2 {
    Adapter3& adapter3_;
};

class Adapter3 : public Interface3 {
    /* ... */
};

// Adapter chain — 호출 비용이 누적된다
```

Adapter가 너무 많이 쌓이면 단순화를 검토한다. 직접 사용하거나 하나의 adapter로 합친다.

## Adapter의 명확한 의도

```cpp
class LoggerAdapter { /* ... */ };       // ⚠️ 모호하다 — 무엇을 무엇으로 변환하는가?
class SpdlogAdapter { /* ... */ };       // ✅ spdlog를 ILogger로
class ToConsoleLogger { /* ... */ };     // ⚠️ adapter? wrapper? decorator?
```

이름이 adapter의 의도를 드러내야 한다(가이드라인 14).

## 양방향 Adapter

```cpp
class ILoggerOld { virtual void log_old(const char*) = 0; };
class ILoggerNew { virtual void log_new(const std::string&) = 0; };

class BidirectionalAdapter : public ILoggerOld, public ILoggerNew {
    // Old → New와 New → Old를 모두 지원한다
};
```

매우 드물게 쓴다. 보통은 단방향 adapter면 충분하다.

## Legacy Code를 위한 Adapter

```cpp
// Legacy C 코드
void old_initialize(int* config, char* name);
int old_process(void* data, int size);

// 모던 C++ Adapter
class ModernSystem {
    int config_[10];
    char name_[256];
public:
    ModernSystem(Config cfg, std::string n) {
        // 변환
        std::copy(cfg.values.begin(), cfg.values.end(), config_);
        std::strncpy(name_, n.c_str(), sizeof(name_));

        old_initialize(config_, name_);
    }

    int process(std::span<const std::byte> data) {
        return old_process(const_cast<std::byte*>(data.data()), data.size());
    }
};
```

Legacy C API를 모던 C++ 인터페이스로 감싼다(Beautiful C++ 항목 7과 같은 결).

## 네트워크 / API를 위한 Adapter

```cpp
class IUserService {
public:
    virtual User get_user(int id) = 0;
};

// REST API Adapter
class RestUserService : public IUserService {
    HttpClient& http_;
public:
    User get_user(int id) override {
        auto resp = http_.get("/users/" + std::to_string(id));
        return User::from_json(resp.body);
    }
};

// gRPC Adapter
class GrpcUserService : public IUserService {
    GrpcChannel& channel_;
public:
    User get_user(int id) override {
        // gRPC 호출
    }
};
```

다양한 통신 프로토콜을 같은 인터페이스로 통합한다. 핵심 비즈니스 코드는 통신 디테일을 알지 못한다.

## Test Adapter

```cpp
class InMemoryUserService : public IUserService {
    std::unordered_map<int, User> users_;
public:
    User get_user(int id) override {
        return users_.at(id);
    }
    void add(User u) { users_[u.id] = u; }
};

// 테스트
InMemoryUserService fake;
fake.add(User{1, "Alice"});

Service svc{fake};
ASSERT_EQ(svc.process(1).name, "Alice");
```

테스트용 fake도 adapter의 한 형태다.

## Adapter vs Bridge

```
Adapter — 이미 존재하는 호환되지 않는 인터페이스를 잇는다
Bridge — 추상과 구현을 처음부터 분리한다 (디자인 시점)
```

Adapter는 **기존 코드**에 적용한다. Bridge는 **새 디자인**에서 시작한다(가이드라인 28~29).

## 함정 — Adapter의 인터페이스 차이가 너무 크다

```cpp
class ITarget { virtual void simple_operation() = 0; };

class Adaptee {
    // 메서드 50개, 복잡한 상태, 콜백
};

class Adapter : public ITarget {
    Adaptee& adaptee_;
public:
    void simple_operation() override {
        // 50개 호출과 복잡한 변환
    }
};
```

인터페이스 차이가 너무 크면 adapter 자체가 복잡해진다. **Adapter** 대신 **Facade**(단순 인터페이스를 제공)와 함께 리팩토링을 고려한다.

## 표준 라이브러리에서의 Adapter

```cpp
// std::stack — 컨테이너 어댑터
std::stack<int> s;             // 기본 std::deque
std::stack<int, std::vector<int>> s2;     // vector를 adapt
std::stack<int, std::list<int>> s3;        // list를 adapt

// 같은 stack 인터페이스 — 다른 underlying
```

`stack`은 top, push, pop만 노출한다. underlying의 부가 메서드는 숨긴다. 표준 Adapter 패턴이다.

## C++20 Concepts — Adapter 인터페이스

```cpp
template<typename T>
concept Compressor = requires(T& c, std::span<const std::byte> data) {
    { c.compress(data) } -> std::convertible_to<std::vector<std::byte>>;
};

// 명시적 Adapter 없이도 concept으로 인터페이스를 명세할 수 있다
template<Compressor C>
void backup(C& c, std::span<const std::byte> data);

backup(ZlibLib{}, my_data);     // ZlibLib이 compress 메서드를 가지면 OK
```

concept이 인터페이스 명세 역할을 한다. duck typing이 adapter의 일부 역할을 대신한다.

## Adapter의 라이프타임

```cpp
class Adapter : public ITarget {
    Adaptee& adaptee_;     // 참조 — adaptee의 라이프타임이 보장돼야 한다
public:
    explicit Adapter(Adaptee& a) : adaptee_(a) {}
};

{
    Adaptee a;
    Adapter ad{a};
    // 사용
}     // a와 ad가 함께 소멸 — OK

// 또는
Adaptee* a = new Adaptee;
Adapter ad{*a};
delete a;     // ⚠️ ad가 dangling이 된다
```

라이프타임을 신중히 다룬다. `shared_ptr`로 명시할 수도 있다.

```cpp
class Adapter : public ITarget {
    std::shared_ptr<Adaptee> adaptee_;
public:
    explicit Adapter(std::shared_ptr<Adaptee> a) : adaptee_(std::move(a)) {}
};
```

## Multi-target Adapter

```cpp
class MultiAdapter : public ICompressor, public IEncryptor {
    // 한 객체가 여러 인터페이스를 adapt한다
};
```

다중 상속이라 가능하지만, 보통은 책임별로 adapter를 가르는 편이 깔끔하다.

## 마이그레이션 — Adapter로

```cpp
// 옛 시스템에는 old API가 가득하다
// 새 시스템은 표준 인터페이스로 점진적으로 전환한다

class NewService { /* 새 인터페이스 */ };

// Adapter로 — 새 시스템이 옛 API를 호출한다
class OldApiAdapter : public NewService {
    OldSystem& old_;
public:
    // 새 인터페이스를 옛 API로 변환한다
};

// 점진적 마이그레이션 — 사용처를 NewService로 옮긴다
```

레거시 시스템 마이그레이션에서 adapter가 핵심 도구가 된다.

## 빠른 결정 — Adapter 적용

```
인터페이스가 호환되지 않는다 — Adapter?
├── 외부 라이브러리 통합 → Adapter ✅
├── Legacy 코드 wrapping → Adapter
├── 표준 인터페이스로 다양한 구현 모음 → Adapter
├── 점진적 마이그레이션 → Adapter
└── 인터페이스 변환이 본질이 아니라면 다른 패턴 (Wrapper, Decorator, Facade)
```

## 실무 가이드 — 체크리스트

Adapter를 적용할 때 다음을 점검한다.

- [ ] **인터페이스 변환**이 본질인가? (다른 wrapper와 구분되는가)
- [ ] 이름이 의도를 드러내는가? (예: `SpdlogAdapter`)
- [ ] 보통 단방향인가?
- [ ] 라이프타임이 보장되는가? (참조 / shared_ptr)
- [ ] 변환 비용을 측정했는가?
- [ ] C++20 concept으로 adapter 없이 풀 수 있지는 않은가?

## 정리

**Adapter 패턴**은 호환되지 않는 인터페이스를 연결한다.

활용은 다음과 같다.

- 외부 라이브러리 통합
- Legacy 코드 wrapping
- 표준화(다양한 구현을 한 인터페이스로)
- Test fake / mock
- 마이그레이션

표준 라이브러리의 사례는 풍부하다.

- `std::stack`, `std::queue`, `std::priority_queue` — container adapter
- `std::reverse_iterator`, `std::back_insert_iterator` — iterator adapter
- `std::not_fn`, `std::bind` — function adapter
- ranges views — pipeline adapter

C++20 concept이 duck typing으로 adapter의 일부 역할을 대신한다.

## 관련 항목

- [가이드라인 19: Strategy](/blog/programming/cpp/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — Adapter도 strategy로 주입할 수 있다
- [가이드라인 28: Bridge](/blog/programming/cpp/cpp-software-design/guideline28-build-bridges-to-remove-physical-dependencies) — 새 디자인에서의 추상화
- [가이드라인 35: Decorator](/blog/programming/cpp/cpp-software-design/guideline35-use-decorators-to-add-customization-hierarchically) — 같은 인터페이스 + 기능 추가
- [GoF Adapter](/blog/programming/design/gof-design-patterns/item07-adapter) — 원본
- [Beautiful C++ 항목 7: 지저분한 struct 캡슐화](/blog/programming/cpp/beautiful-cpp/item07-encapsulate-messy-structs) — C API wrap
