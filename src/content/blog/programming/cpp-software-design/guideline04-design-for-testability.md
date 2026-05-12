---
title: "가이드라인 4: 테스트 가능성을 위한 디자인"
date: 2026-05-13T14:00:00
description: "테스트 가능성은 디자인 품질의 척도 — 의존성 주입, 인터페이스 분리, private 멤버는 테스트 X."
tags: [C++, Software Design, Testing, Dependency Injection]
series: "C++ Software Design"
seriesOrder: 4
---

## 왜 이 가이드라인이 중요한가?

코드를 작성할 때 — "**나중에 테스트 짤 수 있게 만들자**"가 아니라, **테스트가 자연스럽게 작성되는 디자인**을 처음부터 추구해야 한다.

테스트하기 어려운 코드는 — 디자인 자체가 잘못된 신호:
- 의존성이 강결합 (mock 주입 불가)
- 책임이 너무 큰 클래스 (SRP 위반)
- 숨겨진 전역 상태 (테스트 격리 불가)
- 비결정적 동작 (시간, 랜덤, 외부 API)

테스트 가능성(testability)은 — **결과**가 아니라 **디자인 품질의 신호**다. 테스트가 쉬우면 — 디자인이 좋은 것. 테스트가 어려우면 — 디자인을 다시 보라.

Iglberger의 핵심 주장: **"private 멤버는 테스트하지 마라."** 좋은 테스트는 **public 인터페이스를 통해**서 한다. private 테스트가 필요하면 — 책임을 잘못 묶은 것.

## 핵심 내용

- 테스트하기 어려운 코드는 — **디자인 자체가 잘못된 신호**
- **의존성 주입**(DI)이 테스트 가능성의 근간
- **private 멤버는 테스트 X** — public 인터페이스로 충분해야
- 테스트 가능성이 떨어지면 — 책임을 **분리**하거나 **추상화**
- 모킹(mocking) 도구가 — 디자인 문제를 가리는 게 아닌가 점검

## 비교 — 테스트 불가 vs 가능

### Bad: 강결합 + 숨겨진 의존성

```cpp
class OrderService {
public:
    void process(Order& order) {
        Database db;                          // 직접 생성 — DI X
        db.connect("prod.db.example.com");    // 하드코딩
        
        if (!Logger::instance().is_enabled()) // 싱글톤 — 숨겨진 의존성
            return;
        
        if (std::chrono::system_clock::now() // 비결정적 — 시간
                > order.deadline()) {
            order.expire();
        }
        
        db.save(order);
        EmailSender::send(order.email());     // 또 싱글톤
    }
};
```

테스트 작성 시도:

```cpp
TEST(OrderServiceTest, Process) {
    OrderService svc;
    Order order;
    svc.process(order);
    // 실제 DB에 연결 — 실패
    // 실제 이메일 발송 — 또 실패
    // 시간 의존 — 매번 결과 다름
}
```

문제:
- DB 의존 — 테스트가 실제 DB 필요
- 싱글톤 Logger, EmailSender — mock 불가
- `system_clock::now()` — 결정적 테스트 불가
- 한 함수가 — 너무 많은 책임

### Good: 의존성 주입 + 추상화

```cpp
class IDatabase {
public:
    virtual ~IDatabase() = default;
    virtual void save(const Order&) = 0;
};

class ILogger {
public:
    virtual ~ILogger() = default;
    virtual bool is_enabled() const = 0;
};

class IEmailSender {
public:
    virtual ~IEmailSender() = default;
    virtual void send(const std::string& to, const std::string& body) = 0;
};

class IClock {
public:
    virtual ~IClock() = default;
    virtual std::chrono::system_clock::time_point now() const = 0;
};

class OrderService {
    IDatabase&    db_;
    ILogger&      log_;
    IEmailSender& email_;
    IClock&       clock_;
public:
    OrderService(IDatabase& db, ILogger& log, IEmailSender& email, IClock& clock)
        : db_(db), log_(log), email_(email), clock_(clock) {}
    
    void process(Order& order) {
        if (!log_.is_enabled()) return;
        
        if (clock_.now() > order.deadline()) {
            order.expire();
        }
        
        db_.save(order);
        email_.send(order.email(), "Order received");
    }
};
```

테스트:

```cpp
TEST(OrderServiceTest, ExpiresOrderPastDeadline) {
    MockDatabase    db;
    MockLogger      log;
    MockEmailSender email;
    FakeClock       clock{some_future_time};
    
    OrderService svc{db, log, email, clock};
    Order order{some_deadline_before_clock};
    
    svc.process(order);
    
    EXPECT_TRUE(order.is_expired());
    EXPECT_CALL(db, save(order));
}
```

각 의존성이 — 인터페이스. 테스트에서 mock/fake 주입 가능. 결정적, 격리됨.

## 의존성 주입의 3가지 형태

### 1) 생성자 주입 (가장 일반적)

```cpp
class Service {
    Dependency& dep_;
public:
    explicit Service(Dependency& d) : dep_(d) {}
};
```

객체 생명 동안 같은 의존성. **불변 의존성**에 가장 자연스러움.

### 2) 메서드 주입

```cpp
class Service {
public:
    void process(Order& order, ILogger& log);     // 매번 다른 logger 가능
};
```

호출마다 다른 의존성 가능. **짧은 라이프타임** 의존에 적합.

### 3) Setter 주입

```cpp
class Service {
    ILogger* log_ = nullptr;
public:
    void setLogger(ILogger& log) { log_ = &log; }
};
```

부분 초기화 위험. 잘 안 쓰임.

**기본**: 생성자 주입.

## "Private 멤버를 테스트하지 마라"

흔한 잘못된 패턴:

```cpp
class Calculator {
    int internal_state_ = 0;
    
    int compute_step(int x) { return x * 2; }     // private
    
public:
    int compute(int x) { return compute_step(x) + 1; }
};

// 테스트
TEST(CalculatorTest, ComputeStep) {
    // private에 접근하기 위해 friend 추가? 또는 #define private public?
    // ⚠️ 잘못된 접근
}
```

문제:
- private은 **구현 디테일** — 변경할 자유 보장
- private 테스트 = 구현에 결합된 테스트 = 리팩토링 못 함
- 테스트가 진짜 검증하는 건 — **외부 동작**(observable behavior), 내부 상태 X

해결: **public 인터페이스로 검증**.

```cpp
TEST(CalculatorTest, ComputesCorrectly) {
    Calculator c;
    EXPECT_EQ(c.compute(5), 11);     // 외부 동작만 검증
    EXPECT_EQ(c.compute(0), 1);
}
```

만약 — public 인터페이스로 private 동작을 확인할 수 없다면? → **private이 너무 많은 책임**을 짊어진 신호. 별도 클래스로 분리.

```cpp
class StepComputer {     // private 멤버였던 것을 독립 클래스로
public:
    int step(int x) { return x * 2; }     // 이제 public
};

class Calculator {
    StepComputer stepper_;
public:
    int compute(int x) { return stepper_.step(x) + 1; }
};

// StepComputer를 독립적으로 테스트 가능
TEST(StepComputerTest, ...) {
    StepComputer s;
    EXPECT_EQ(s.step(5), 10);
}
```

진짜 테스트가 필요한 로직 — 독립 클래스의 public 메서드로.

## Mock vs Fake vs Stub

테스트용 의존성 대체 — 4가지 용어:

| 종류 | 정의 | 예 |
| --- | --- | --- |
| **Dummy** | 호출 안 함, 매개변수만 채움 | nullptr-equivalent object |
| **Stub** | 미리 정해진 응답 반환 | `bool is_enabled() { return true; }` |
| **Fake** | 단순화된 진짜 구현 | InMemoryDatabase (실제 DB 대신) |
| **Mock** | 호출 검증 가능 | `EXPECT_CALL(mock, method(...))` |

**선택 기준**:
- 동작 검증 필요 (호출 횟수, 인자) — **Mock**
- 단순 반환만 — **Stub**
- 진짜처럼 동작 필요 — **Fake**
- 호출 안 함 (인터페이스 채움) — **Dummy**

Iglberger의 권장 — **Fake > Mock**. Mock은 테스트와 구현이 강결합. Fake가 일반적으로 더 견고.

## 함정 — 모든 것을 mock

```cpp
TEST(ServiceTest, ...) {
    MockA mockA;
    MockB mockB;
    MockC mockC;
    MockD mockD;
    MockE mockE;
    // 5개 mock 설정 — 테스트가 코드 자체보다 길어짐
    
    Service svc{mockA, mockB, mockC, mockD, mockE};
    svc.process();
}
```

mock 5개 — 의존성이 너무 많음. 책임이 너무 큰 클래스 (SRP 위반). 분리 필요.

또는 — 매개변수 묶음으로:

```cpp
struct Dependencies {
    IDatabase&    db;
    ILogger&      log;
    IEmailSender& email;
};

class Service {
    Dependencies deps_;
public:
    explicit Service(Dependencies d) : deps_(d) {}
};
```

여전히 5개 의존이면 — 책임 자체 재검토.

## 시간 / 랜덤 — 결정적 테스트

```cpp
// Bad: 시간 의존성 직접
void process(Order& order) {
    auto now = std::chrono::system_clock::now();     // ⚠️ 매번 다름
    if (now > order.deadline()) order.expire();
}

// Good: clock 추상화
class IClock {
public:
    virtual std::chrono::system_clock::time_point now() const = 0;
};

class SystemClock : public IClock {
public:
    std::chrono::system_clock::time_point now() const override {
        return std::chrono::system_clock::now();
    }
};

class FakeClock : public IClock {
    std::chrono::system_clock::time_point time_;
public:
    void set(std::chrono::system_clock::time_point t) { time_ = t; }
    std::chrono::system_clock::time_point now() const override { return time_; }
};
```

마찬가지로 — random number generator, UUID generator 등. 모두 외부 인터페이스로.

## I/O — 메모리 fake

```cpp
class IFileSystem {
public:
    virtual std::string read(const std::string& path) = 0;
    virtual void write(const std::string& path, const std::string& content) = 0;
};

class RealFileSystem : public IFileSystem { /* std::fstream */ };

class InMemoryFileSystem : public IFileSystem {
    std::map<std::string, std::string> files_;
public:
    std::string read(const std::string& path) override { return files_.at(path); }
    void write(const std::string& path, const std::string& content) override {
        files_[path] = content;
    }
};
```

테스트는 — InMemoryFileSystem 주입. 빠르고 결정적.

## 함정 — 정적 함수 / namespace 함수

```cpp
namespace logger {
    void log(const std::string& msg);     // 자유 함수 — 어떻게 mock?
}

class Service {
public:
    void process() {
        logger::log("starting");           // ⚠️ 테스트에서 가짜 logger 주입 불가
    }
};
```

자유 함수 — 테스트 부담. 대안:

```cpp
// 옵션 1: 인터페이스로 추상화
class ILogger { virtual void log(const std::string&) = 0; };

// 옵션 2: 함수 포인터 또는 std::function 주입
class Service {
    std::function<void(const std::string&)> log_;
public:
    explicit Service(std::function<void(const std::string&)> log = logger::log)
        : log_(std::move(log)) {}
};
```

**단**, 모든 자유 함수를 추상화할 필요는 X. `std::sin`, `std::accumulate` 같은 결정적 표준 함수는 그대로.

## 함정 — virtual destructor 잊음

```cpp
class IDatabase {
public:
    // ⚠️ virtual destructor 없음
    virtual void save(const Order&) = 0;
};

class MockDatabase : public IDatabase { /* ... */ };

IDatabase* p = new MockDatabase;
delete p;     // ⚠️ partial destruction — UB
```

interface는 항상 — `virtual ~Class() = default` (Effective C++ 항목 7).

## C++20 concepts와 테스트

가상 함수 없이 — concept으로:

```cpp
template<typename T>
concept Database = requires(T& db, const Order& order) {
    { db.save(order) } -> std::same_as<void>;
};

template<Database DB>
class Service {
    DB& db_;
public:
    explicit Service(DB& db) : db_(db) {}
    void process(Order o) { db_.save(o); }
};

// 테스트
struct FakeDb {
    std::vector<Order> saved;
    void save(const Order& o) { saved.push_back(o); }
};

TEST(...) {
    FakeDb db;
    Service<FakeDb> svc{db};
    svc.process(order);
    EXPECT_EQ(db.saved.size(), 1);
}
```

vtable 비용 0, 컴파일 타임 다형성. 단 — Service가 template이 됨 (헤더에 정의).

## 테스트 가능성 체크리스트

새 클래스 작성 시:

- [ ] 외부 의존성을 — **인터페이스로 추상화**?
- [ ] 의존성을 — **생성자/메서드로 주입**?
- [ ] 싱글톤 / 전역 변수 사용 안 함?
- [ ] 시간 / 랜덤 / UUID — 추상화?
- [ ] private 메서드 — public 인터페이스로 충분히 검증 가능?
- [ ] 한 클래스의 의존성이 **5개 이하**?
- [ ] virtual destructor 있는가? (interface)

## Iglberger의 권고 — 5가지

1. **테스트 작성이 어려우면 — 디자인을 다시 보라**
2. **private을 테스트하지 마라** — 분리 신호
3. **의존성 주입 + 작은 인터페이스**
4. **Fake > Mock** (보통)
5. **외부 세계(시간, IO)도 추상화** — 결정적 테스트

## 테스트 가능성 = 변화 가능성

이 가이드라인의 깊은 메시지 — 테스트 가능성은 그 자체로 가치가 아니라 — **변화 가능성의 신호**:

- 의존성 주입 가능 → 다른 구현으로 교체 가능
- 인터페이스 분리 → 부분만 변경 가능
- private 격리 → 구현 자유

테스트하기 좋은 코드 = **변경하기 좋은 코드**. 가이드라인 2의 변화 디자인과 직결.

## 실무 가이드 — 결정

```
이 코드를 어떻게 테스트할까?
├── 외부 의존성이 있나? → 인터페이스 + 의존성 주입
├── 시간/랜덤 의존? → Clock/RandomGen 추상화
├── 자유 함수에 의존? → 함수 포인터 / std::function
├── 싱글톤/전역? → 의존성 주입으로 대체
├── private에 복잡한 로직? → 별도 클래스로 분리
└── 결정적 / 격리된 테스트 작성 가능?
```

## 정리

테스트 가능성은 — **디자인 품질의 신호**. 테스트하기 어려운 코드는 디자인을 다시 봐야 한다.

도구 사다리:
1. **의존성 주입** — 생성자 우선
2. **인터페이스 추상화** — 외부 의존
3. **C++20 concepts** — 컴파일 타임 다형성
4. **Fake** — 단순 구현, mock보다 견고
5. **시간/랜덤도 추상화** — 결정적 테스트

private은 테스트 X. 거기에 복잡한 로직이 있다면 — 분리 신호.

## 관련 항목

- [가이드라인 2: 변화를 위한 디자인](/blog/programming/cpp-software-design/guideline02-design-for-change) — 테스트 가능성과 변화의 관계
- [가이드라인 3: 인터페이스 분리](/blog/programming/cpp-software-design/guideline03-separate-interfaces-to-avoid-artificial-coupling) — 작은 인터페이스
- [Beautiful C++ 항목 14: 싱글톤 피하기](/blog/programming/beautiful-cpp/item14-avoid-singletons) — 테스트 불가의 주범
- [Effective C++ 항목 31: 컴파일 의존성](/blog/programming/effective-cpp/item31-minimize-compilation-dependencies-between-files) — 추상화 헤더 분리
