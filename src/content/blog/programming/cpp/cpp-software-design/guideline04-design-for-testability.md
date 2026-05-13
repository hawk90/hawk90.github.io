---
title: "가이드라인 4: 테스트 가능성을 위한 디자인"
date: 2026-05-13T14:00:00
description: "테스트 가능성은 디자인 품질의 척도다. 의존성 주입, 인터페이스 분리, 그리고 private 멤버는 테스트 대상이 아니다."
tags: [C++, Software Design, Testing, Dependency Injection]
series: "C++ Software Design"
seriesOrder: 4
draft: true
---

## 왜 이 가이드라인이 중요한가?

코드를 작성할 때의 자세는 "나중에 테스트할 수 있게 만들자"가 아니다. 처음부터 **테스트가 자연스럽게 작성되는 디자인**을 노려야 한다.

테스트하기 어려운 코드는 디자인이 잘못됐다는 신호다.

- 의존성이 강하게 묶여 있어 mock을 주입할 수 없다.
- 책임이 너무 큰 클래스다(SRP 위반).
- 숨겨진 전역 상태가 있어 테스트가 격리되지 않는다.
- 시간, 랜덤, 외부 API 같은 비결정적 동작에 직접 의존한다.

테스트 가능성은 결과가 아니라 **디자인 품질의 신호**다. 테스트가 쉽다면 디자인이 좋다는 뜻이고, 테스트가 어렵다면 디자인을 다시 봐야 한다는 뜻이다.

Iglberger의 핵심 주장은 단호하다. *"private 멤버는 테스트하지 마라."* 좋은 테스트는 public 인터페이스를 통해 한다. private을 테스트해야 한다면 책임을 잘못 묶은 것이다.

## 핵심 내용

- 테스트하기 어려운 코드는 디자인 자체가 잘못됐다는 신호다.
- 테스트 가능성의 근간은 **의존성 주입(DI)** 이다.
- private 멤버는 테스트하지 않는다. public 인터페이스만으로 충분해야 한다.
- 테스트 가능성이 떨어지면 책임을 분리하거나 추상화한다.
- 모킹 도구가 디자인 문제를 가리고 있지는 않은지 점검한다.

## 비교 — 테스트 불가와 테스트 가능

### Bad — 강결합과 숨겨진 의존성

```cpp
class OrderService {
public:
    void process(Order& order) {
        Database db;                          // 직접 생성 — DI 없음
        db.connect("prod.db.example.com");    // 하드코딩

        if (!Logger::instance().is_enabled()) // 싱글톤 — 숨겨진 의존성
            return;

        if (std::chrono::system_clock::now() // 비결정적 — 시간 의존
                > order.deadline()) {
            order.expire();
        }

        db.save(order);
        EmailSender::send(order.email());     // 또 싱글톤
    }
};
```

테스트를 작성해 보면 곧장 막힌다.

```cpp
TEST(OrderServiceTest, Process) {
    OrderService svc;
    Order order;
    svc.process(order);
    // 실제 DB에 연결한다 — 실패
    // 실제 이메일이 나간다 — 또 실패
    // 시간 의존 — 매번 결과가 달라진다
}
```

문제는 다음과 같다.

- DB에 직접 의존하므로 테스트할 때도 실제 DB가 필요하다.
- 싱글톤인 Logger와 EmailSender는 mock할 수 없다.
- `system_clock::now()` 때문에 결정적 테스트가 불가능하다.
- 한 함수가 너무 많은 책임을 진다.

### Good — 의존성 주입과 추상화

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

테스트가 자연스럽게 풀린다.

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

각 의존성이 인터페이스이므로 테스트에서 mock이나 fake를 주입할 수 있다. 결정적이고 격리된 테스트가 된다.

## 의존성 주입의 세 가지 형태

### 1) 생성자 주입 (가장 일반적)

```cpp
class Service {
    Dependency& dep_;
public:
    explicit Service(Dependency& d) : dep_(d) {}
};
```

객체의 생명 동안 같은 의존성을 쓴다. 불변 의존성에 가장 자연스러운 형태다.

### 2) 메서드 주입

```cpp
class Service {
public:
    void process(Order& order, ILogger& log);     // 호출마다 다른 logger 가능
};
```

호출마다 다른 의존성을 받을 수 있다. 라이프타임이 짧은 의존성에 적합하다.

### 3) Setter 주입

```cpp
class Service {
    ILogger* log_ = nullptr;
public:
    void setLogger(ILogger& log) { log_ = &log; }
};
```

부분 초기화 상태를 만들 위험이 있다. 잘 쓰지 않는다.

기본은 생성자 주입이다.

## "Private 멤버를 테스트하지 마라"

흔히 보이는 잘못된 패턴은 이렇다.

```cpp
class Calculator {
    int internal_state_ = 0;

    int compute_step(int x) { return x * 2; }     // private

public:
    int compute(int x) { return compute_step(x) + 1; }
};

// 테스트
TEST(CalculatorTest, ComputeStep) {
    // private에 접근하려고 friend를 추가? 아니면 #define private public?
    // ⚠️ 잘못된 접근이다
}
```

이유는 분명하다.

- private은 구현 디테일이다. 자유롭게 바꿀 수 있어야 한다.
- private을 테스트한다는 건 구현에 결합된 테스트라는 뜻이다. 그러면 리팩토링이 막힌다.
- 테스트가 진짜 검증해야 하는 건 외부에서 관찰 가능한 동작이지 내부 상태가 아니다.

해법은 public 인터페이스로 검증하는 것이다.

```cpp
TEST(CalculatorTest, ComputesCorrectly) {
    Calculator c;
    EXPECT_EQ(c.compute(5), 11);     // 외부에서 관찰되는 동작만 검증
    EXPECT_EQ(c.compute(0), 1);
}
```

만약 public 인터페이스로 private 동작을 확인할 수 없다면, 그 private이 너무 많은 책임을 짊어진 신호다. 독립 클래스로 가르자.

```cpp
class StepComputer {     // private 멤버였던 것을 독립 클래스로
public:
    int step(int x) { return x * 2; }     // 이제 public이다
};

class Calculator {
    StepComputer stepper_;
public:
    int compute(int x) { return stepper_.step(x) + 1; }
};

// StepComputer는 독립적으로 테스트할 수 있다
TEST(StepComputerTest, ...) {
    StepComputer s;
    EXPECT_EQ(s.step(5), 10);
}
```

테스트가 필요한 로직은 독립 클래스의 public 메서드로 끌어낸다.

## Mock, Fake, Stub의 구분

테스트용 의존성 대체에는 네 가지 용어가 있다.

| 종류 | 정의 | 예 |
| --- | --- | --- |
| **Dummy** | 호출하지 않고 매개변수만 채운다 | nullptr 같은 객체 |
| **Stub** | 미리 정해진 응답을 돌려준다 | `bool is_enabled() { return true; }` |
| **Fake** | 단순화된 진짜 구현을 둔다 | InMemoryDatabase (실제 DB 대신) |
| **Mock** | 호출 자체를 검증할 수 있다 | `EXPECT_CALL(mock, method(...))` |

선택 기준은 이렇게 보면 된다.

- 호출 횟수나 인자 같은 동작을 검증해야 한다면 **Mock**.
- 단순한 반환값만 있으면 된다면 **Stub**.
- 진짜처럼 동작해야 한다면 **Fake**.
- 인터페이스 자리만 채우면 된다면 **Dummy**.

Iglberger는 **Fake를 Mock보다 선호하라**고 권한다. Mock은 테스트와 구현을 강하게 묶기 쉽다. Fake가 일반적으로 더 견고하다.

## 함정 — 모든 걸 mock으로

```cpp
TEST(ServiceTest, ...) {
    MockA mockA;
    MockB mockB;
    MockC mockC;
    MockD mockD;
    MockE mockE;
    // mock 다섯 개를 설정하다 보면 테스트가 코드 자체보다 길어진다

    Service svc{mockA, mockB, mockC, mockD, mockE};
    svc.process();
}
```

mock이 다섯 개라는 건 의존성이 너무 많다는 뜻이다. 책임이 너무 큰 클래스라는 신호고, SRP 위반이다. 분리가 필요하다.

매개변수를 묶어 보는 것도 임시 방편은 된다.

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

그래도 의존성이 다섯이라면 결국 책임 자체를 다시 봐야 한다.

## 시간과 랜덤은 추상화

```cpp
// Bad — 시간 의존성에 직접 묶인다
void process(Order& order) {
    auto now = std::chrono::system_clock::now();     // ⚠️ 매번 다르다
    if (now > order.deadline()) order.expire();
}

// Good — clock을 추상화한다
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

랜덤 생성기나 UUID 생성기도 마찬가지로 외부 인터페이스로 감싼다.

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

테스트에서는 `InMemoryFileSystem`을 주입한다. 빠르고 결정적이다.

## 함정 — 정적 함수와 namespace 함수

```cpp
namespace logger {
    void log(const std::string& msg);     // 자유 함수 — mock을 어떻게 할까?
}

class Service {
public:
    void process() {
        logger::log("starting");           // ⚠️ 테스트에서 가짜 logger를 주입할 수 없다
    }
};
```

자유 함수는 테스트 부담이 된다. 대안은 다음과 같다.

```cpp
// 옵션 1 — 인터페이스로 추상화한다
class ILogger { virtual void log(const std::string&) = 0; };

// 옵션 2 — 함수 포인터나 std::function을 주입한다
class Service {
    std::function<void(const std::string&)> log_;
public:
    explicit Service(std::function<void(const std::string&)> log = logger::log)
        : log_(std::move(log)) {}
};
```

다만 자유 함수를 무조건 추상화할 필요는 없다. `std::sin`이나 `std::accumulate` 같은 결정적 표준 함수는 그대로 둔다.

## 함정 — virtual destructor를 빠뜨린다

```cpp
class IDatabase {
public:
    // ⚠️ virtual destructor가 없다
    virtual void save(const Order&) = 0;
};

class MockDatabase : public IDatabase { /* ... */ };

IDatabase* p = new MockDatabase;
delete p;     // ⚠️ partial destruction — UB
```

인터페이스에는 늘 `virtual ~Class() = default`를 둔다(Effective C++ 항목 7).

## C++20 concepts와 테스트

가상 함수 없이 concept으로 묶을 수도 있다.

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

vtable 비용이 없고 컴파일 타임에 다형성이 풀린다. 단, `Service`가 템플릿이 되므로 정의가 헤더로 옮겨진다.

## 테스트 가능성 체크리스트

새 클래스를 작성할 때 다음을 확인하자.

- [ ] 외부 의존성을 인터페이스로 추상화했는가?
- [ ] 의존성을 생성자나 메서드로 주입하는가?
- [ ] 싱글톤이나 전역 변수를 쓰고 있지는 않은가?
- [ ] 시간, 랜덤, UUID를 추상화했는가?
- [ ] private 메서드를 public 인터페이스만으로 충분히 검증할 수 있는가?
- [ ] 한 클래스의 의존성이 다섯 개 이하인가?
- [ ] 인터페이스에 virtual destructor가 있는가?

## Iglberger의 권고 — 다섯 가지

1. 테스트 작성이 어렵다면 디자인을 다시 봐라.
2. private은 테스트하지 마라. 분리 신호다.
3. 의존성 주입과 작은 인터페이스를 함께 쓴다.
4. 보통은 Fake가 Mock보다 낫다.
5. 시간이나 I/O 같은 외부 세계도 추상화한다. 결정적 테스트가 가능해진다.

## 테스트 가능성은 곧 변화 가능성이다

이 가이드라인이 말하려는 더 깊은 메시지가 있다. 테스트 가능성은 그 자체로 가치가 있다기보다 **변화 가능성의 신호**라는 점이다.

- 의존성 주입이 가능하다는 건 다른 구현으로 갈아 끼울 수 있다는 뜻이다.
- 인터페이스가 분리되어 있다는 건 일부만 바꿀 수 있다는 뜻이다.
- private이 격리되어 있다는 건 구현을 자유롭게 바꿀 수 있다는 뜻이다.

테스트하기 좋은 코드는 곧 바꾸기 좋은 코드다. 가이드라인 2의 "변화를 위한 디자인"과 그대로 이어진다.

## 실무 가이드 — 결정 트리

```
이 코드를 어떻게 테스트할까?
├── 외부 의존성이 있나? → 인터페이스 + 의존성 주입
├── 시간/랜덤 의존? → Clock / RandomGen 추상화
├── 자유 함수에 의존? → 함수 포인터나 std::function
├── 싱글톤/전역? → 의존성 주입으로 대체
├── private에 복잡한 로직? → 별도 클래스로 분리
└── 결정적이고 격리된 테스트를 작성할 수 있는가?
```

## 정리

테스트 가능성은 디자인 품질의 신호다. 테스트하기 어려운 코드는 디자인을 다시 봐야 한다.

도구의 사다리는 다음과 같다.

1. **의존성 주입** — 생성자 주입을 우선한다.
2. **인터페이스 추상화** — 외부 의존을 감싼다.
3. **C++20 concepts** — 컴파일 타임 다형성을 활용한다.
4. **Fake** — 단순한 구현이 mock보다 견고한 경우가 많다.
5. **시간과 랜덤도 추상화** — 결정적 테스트로 간다.

private은 테스트하지 않는다. 그 안에 복잡한 로직이 있다면 분리 신호다.

## 관련 항목

- [가이드라인 2: 변화를 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline02-design-for-change) — 테스트 가능성과 변화의 관계
- [가이드라인 3: 인터페이스 분리](/blog/programming/cpp/cpp-software-design/guideline03-separate-interfaces-to-avoid-artificial-coupling) — 작은 인터페이스
- [Beautiful C++ 항목 14: 싱글톤 피하기](/blog/programming/cpp/beautiful-cpp/item14-avoid-singletons) — 테스트 불가의 주범
- [Effective C++ 항목 31: 컴파일 의존성 최소화](/blog/programming/cpp/effective-cpp/item31-minimize-compilation-dependencies-between-files) — 추상화 헤더 분리
