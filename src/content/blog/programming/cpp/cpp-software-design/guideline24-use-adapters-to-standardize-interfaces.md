---
title: "가이드라인 24: 인터페이스 표준화에 Adapter를 사용하라"
date: 2026-05-14T20:00:00
description: "Adapter 패턴 — 호환 안 되는 인터페이스를 연결. 표준 인터페이스로 외부 API/legacy 코드 통합."
tags: [C++, Software Design, Adapter, Design Patterns]
series: "C++ Software Design"
seriesOrder: 24
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

ExternalLib을 — 우리 코드가 그대로 사용할 수 없음. 인터페이스 불일치.

**Adapter 패턴** — 두 호환 안 되는 인터페이스를 연결.

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

우리 코드 — ILogger만 의존. Adapter가 — 외부 라이브러리와 우리 인터페이스의 다리.

## 핵심 내용

- **Adapter 패턴** — 호환 안 되는 인터페이스 연결
- 본질 — **두 인터페이스의 다리** (변환자)
- 활용: 외부 라이브러리 통합, legacy 코드, 표준화
- C++ 구현 — 가상 함수 / 템플릿 / `std::function` / `std::variant`
- 표준 라이브러리 — `std::stack`, stream iterator, etc.

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

// Adapter — Target 인터페이스 구현, Adaptee를 사용
class Adapter : public ITarget {
    Adaptee& adaptee_;
public:
    explicit Adapter(Adaptee& a) : adaptee_(a) {}
    
    void request() override {
        adaptee_.specific_request();     // 변환
    }
};
```

GoF 표준 — Object Adapter (composition). Class Adapter (private 상속) — C++에서 가능하지만 less common.

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
        unsigned long out_size = data.size() * 2 + 12;     // zlib 권장
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

// 사용자 코드 — ICompressor만 의존
void backup(ICompressor& c, std::span<const std::byte> data) {
    auto compressed = c.compress(data);
    // save compressed
}

ZlibAdapter zlib;
backup(zlib, data);
```

zlib의 C API — 우리 OOP 인터페이스로 변환. 사용자 코드 — zlib 디테일 모름.

## 다양한 Adaptee 지원

```cpp
class ZlibAdapter : public ICompressor { /* ... */ };
class ZstdAdapter : public ICompressor { /* ... */ };
class LzmaAdapter : public ICompressor { /* ... */ };

// 사용자 코드 — Adapter 교체 가능
ICompressor& compressor = some_factory.create();
backup(compressor, data);
```

표준 인터페이스 — 다양한 구현 통합.

## Adapter vs Wrapper

| 개념 | 의도 |
| --- | --- |
| **Adapter** | 인터페이스 변환 — 호환 안 되는 API를 표준에 맞춤 |
| **Wrapper** | 일반 용어 — 객체를 감쌈 (목적 다양) |
| **Decorator** | 기능 추가 — 같은 인터페이스 (가이드라인 35) |
| **Proxy** | 접근 제어 — 같은 인터페이스 (lazy, security 등) |

Adapter — **인터페이스 변환이 본질**. 다른 wrapping 패턴과 구분.

## 표준 라이브러리의 Adapter

### Container Adapter

```cpp
std::stack<int>;           // std::deque를 stack 인터페이스로 adapt
std::queue<int>;
std::priority_queue<int>;

// 내부 컨테이너 — 다양
std::stack<int, std::vector<int>>;     // vector를 stack으로 adapt
```

`stack`, `queue`, `priority_queue` — 내부 컨테이너를 — 자기 인터페이스로 adapt.

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

각 iterator adapter — iterator를 다른 의미로 변환.

### Function Adapter

```cpp
auto greater = std::greater<int>{};
auto less = std::not_fn(greater);     // adapter — not_fn으로 반대

auto bound = std::bind_front(some_function, arg1);     // C++20
```

`std::not_fn`, `std::bind` — 함수 객체 adapter.

## 모던 — Type Erasure Adapter

```cpp
// 어떤 callable이든 ICompressor 같이
using Compressor = std::function<std::vector<std::byte>(std::span<const std::byte>)>;

void backup(Compressor c, std::span<const std::byte> data) {
    auto compressed = c(data);
    // ...
}

// 어떤 callable이든
backup([](auto data) { return /* zlib */; }, my_data);
backup(ZstdLib{}, my_data);     // functor
backup(zstd_compress, my_data);  // 함수 포인터
```

`std::function` — type erasure adapter. 가상 함수 hierarchy 없이.

## Stream Adapter — C++ 모범

```cpp
std::ifstream file{"data.txt"};
std::stringstream buffer;
buffer << file.rdbuf();     // file의 stream buffer를 string으로 변환
std::string content = buffer.str();
```

stream — 여러 source/sink의 통합 인터페이스. stream adapter로 — file, memory, network 등.

## C++23 Range Adapter

```cpp
auto evens = numbers
    | std::views::filter([](int x) { return x % 2 == 0; })
    | std::views::transform([](int x) { return x * x; })
    | std::views::take(10);
```

ranges view — adapter chain. 각 view가 — 이전 range를 다른 인터페이스로 변환.

## 함정 — Adapter의 비용

```cpp
class Adapter : public ITarget {
    Adaptee adaptee_;
public:
    void request() override {
        // 변환 로직 — 종종 비싼 연산
        std::string converted = convert(...);
        adaptee_.specific_request(converted);
    }
};
```

매 호출 — 변환 비용. 핫 패스 — 측정.

해결: 변환을 — adapter ctor에 (한 번만), 또는 캐싱.

## Adapter + DI

```cpp
class Service {
    ICompressor& compressor_;
public:
    explicit Service(ICompressor& c) : compressor_(c) {}
};

// 실제 — Adapter 주입
ZlibAdapter zlib;
Service svc{zlib};

// 테스트 — Mock 또는 다른 Adapter
class FakeCompressor : public ICompressor { /* ... */ };
FakeCompressor fake;
Service test_svc{fake};
```

Adapter는 — DI의 자연.

## Class Adapter (private 상속)

```cpp
class ZlibAdapter : private ZlibCompressor, public ICompressor {
    // private 상속 — ZlibCompressor 인터페이스 숨김
    // public 상속 — ICompressor 노출
public:
    std::vector<std::byte> compress(std::span<const std::byte> data) override {
        return ZlibCompressor::compress(data);     // private base 호출
    }
};
```

private 상속 — composition의 대안 (가이드라인 39 EC++). 다만 — composition (object adapter)이 보통 단순.

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

variant — value semantics + closed adapter set.

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

// Adapter chain — 호출 비용 누적
```

너무 많은 adapter — 단순화 검토. 직접 사용 또는 단일 adapter로.

## Adapter의 명확한 의도

```cpp
class LoggerAdapter { /* ... */ };       // ⚠️ 모호 — 무엇을 무엇으로?
class SpdlogAdapter { /* ... */ };       // ✅ spdlog를 ILogger로
class ToConsoleLogger { /* ... */ };     // ⚠️ adapter? wrapper? decorator?
```

이름이 — adapter 의도 명시. 가이드라인 14.

## 양방향 Adapter

```cpp
class ILoggerOld { virtual void log_old(const char*) = 0; };
class ILoggerNew { virtual void log_new(const std::string&) = 0; };

class BidirectionalAdapter : public ILoggerOld, public ILoggerNew {
    // Old → New 또는 New → Old 양방향
};
```

매우 드뭄. 보통 단방향 adapter.

## Adapter for Legacy Code

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

Legacy C API — 모던 C++ 인터페이스로. 가이드라인 7 (Beautiful C++ — 지저분한 struct 캡슐화).

## Adapter for Network / API

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

다양한 통신 프로토콜 — 같은 인터페이스로. 핵심 비즈니스 코드 — 통신 디테일 모름.

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

테스트용 fake — adapter의 한 형태.

## Adapter vs Bridge

```
Adapter — 기존 호환 안 되는 인터페이스 연결
Bridge — 추상과 구현 분리 (디자인 시점)
```

Adapter는 — **기존**에 적용. Bridge는 — **새 디자인**. 가이드라인 28-29.

## 함정 — Adapter의 인터페이스 차이가 너무 큼

```cpp
class ITarget { virtual void simple_operation() = 0; };

class Adaptee {
    // 50 메서드, 복잡한 상태, 콜백
};

class Adapter : public ITarget {
    Adaptee& adaptee_;
public:
    void simple_operation() override {
        // 50개 호출 + 복잡한 변환
    }
};
```

인터페이스 차이가 — 너무 크면 adapter 자체가 복잡. **adapter** 대신 — **facade** (단순 인터페이스 제공) + refactor.

## 표준 라이브러리에서의 Adapter

```cpp
// std::stack — 컨테이너 어댑터
std::stack<int> s;             // 기본 std::deque
std::stack<int, std::vector<int>> s2;     // vector를 adapt
std::stack<int, std::list<int>> s3;        // list를 adapt

// 같은 stack 인터페이스 — 다른 underlying
```

`stack` — top, push, pop만 노출. Underlying 컨테이너의 부가 메서드 — 숨김. 표준 Adapter 패턴.

## C++20 Concepts — Adapter 인터페이스

```cpp
template<typename T>
concept Compressor = requires(T& c, std::span<const std::byte> data) {
    { c.compress(data) } -> std::convertible_to<std::vector<std::byte>>;
};

// 명시적 Adapter 없이도 — concept으로 인터페이스 명세
template<Compressor C>
void backup(C& c, std::span<const std::byte> data);

backup(ZlibLib{}, my_data);     // ZlibLib이 compress 메서드 가지면 OK
```

concept = 인터페이스 명세. duck typing이 — adapter 역할.

## Adapter의 라이프타임

```cpp
class Adapter : public ITarget {
    Adaptee& adaptee_;     // 참조 — adaptee 라이프타임 보장 필요
public:
    explicit Adapter(Adaptee& a) : adaptee_(a) {}
};

{
    Adaptee a;
    Adapter ad{a};
    // 사용
}     // a, ad 둘 다 소멸 — OK

// 또는
Adaptee* a = new Adaptee;
Adapter ad{*a};
delete a;     // ⚠️ ad는 dangling
```

라이프타임 — 신중. `shared_ptr`로 명시:

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
    // 한 객체가 — 여러 인터페이스 adapt
};
```

다중 상속. 가능하지만 — 보통 — 각 책임별 별도 adapter.

## 마이그레이션 — Adapter로

```cpp
// 옛 시스템 — old API 가득
// 새 시스템 — 표준 인터페이스로 점진 전환

class NewService { /* 새 인터페이스 */ };

// Adapter로 — 새 시스템이 옛 API 호출
class OldApiAdapter : public NewService {
    OldSystem& old_;
public:
    // 새 인터페이스를 옛 API로 변환
};

// 점진적 마이그레이션 — 사용처를 NewService로 옮김
```

레거시 시스템 마이그레이션 — adapter가 핵심.

## 빠른 결정 — Adapter 적용

```
인터페이스 호환 안 됨 — Adapter?
├── 외부 라이브러리 통합 → Adapter ✅
├── Legacy 코드 wrapping → Adapter
├── 표준 인터페이스로 다양 구현 → Adapter
├── 점진적 마이그레이션 → Adapter
└── 인터페이스 변환 본질이 아니면 — 다른 패턴 (Wrapper, Decorator, Facade)
```

## 실무 가이드 — 체크리스트

Adapter 적용 시:

- [ ] **인터페이스 변환**이 본질? (다른 wrapper와 구분)
- [ ] **이름이 의도 명시**? (`SpdlogAdapter`)
- [ ] **단방향**? (보통)
- [ ] 라이프타임 보장? (참조 / shared_ptr)
- [ ] 변환 비용 — 측정?
- [ ] C++20 concept으로 — adapter 없이 가능?

## 정리

**Adapter 패턴** — 호환 안 되는 인터페이스 연결.

활용:
- 외부 라이브러리 통합
- Legacy 코드 wrapping
- 표준화 (다양한 구현 → 한 인터페이스)
- Test fake / mock
- 마이그레이션

표준 라이브러리:
- `std::stack`, `std::queue`, `std::priority_queue` — container adapter
- `std::reverse_iterator`, `std::back_insert_iterator` — iterator adapter
- `std::not_fn`, `std::bind` — function adapter
- ranges views — pipeline adapter

C++20 concepts — adapter 역할 일부 (duck typing).

## 관련 항목

- [가이드라인 19: Strategy](/blog/programming/cpp/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — Adapter도 strategy로 주입
- [가이드라인 28: Bridge](/blog/programming/cpp/cpp-software-design/guideline28-build-bridges-to-remove-physical-dependencies) — 새 디자인의 추상화
- [가이드라인 35: Decorator](/blog/programming/cpp/cpp-software-design/guideline35-use-decorators-to-add-customization-hierarchically) — 같은 인터페이스 + 기능 추가
- [GoF Adapter](/blog/programming/design/gof-design-patterns/item07-adapter) — 원본
- [Beautiful C++ 항목 7: 지저분한 struct 캡슐화](/blog/programming/cpp/beautiful-cpp/item07-encapsulate-messy-structs) — C API wrap
