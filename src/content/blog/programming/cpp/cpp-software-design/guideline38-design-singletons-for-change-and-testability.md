---
title: "가이드라인 38: Singleton은 변경과 테스트 가능성을 위해 설계하라"
date: 2026-05-02T14:00:00
description: "Singleton이 불가피하다면 Strategy로 알고리즘을 격리하고, DI로 인터페이스를 주입하며, Locator로 테스트성을 확보해야 한다."
tags: [C++, Software Design, Singleton, DI, Testability]
series: "C++ Software Design"
seriesOrder: 38
draft: true
---

## 왜 이 가이드라인이 중요한가?

가이드라인 37은 Singleton 회피를 권한다. 그러나 현실에서는 **피하기 어려운** 경우가 있다.

- 외부 라이브러리가 강제하는 경우
- 기존 코드라 점진적 개선만 가능한 경우
- 진정한 자원(스레드 풀, 로깅 시스템 등)인 경우

이때는 **변경에 대비**하고 **테스트 가능**하게 설계해야 한다.

```cpp
// 일반 Singleton — 변경에 적대적이다
class Logger {
    static Logger& instance() { static Logger l; return l; }
    void log(const std::string&) { /* 콘솔에 출력 */ }
};

// 개선된 Singleton — Strategy로 격리하고 테스트 가능하게 한다
class Logger {
public:
    static Logger& instance() { static Logger l; return l; }
    void setSink(std::unique_ptr<LogSink> s) { sink_ = std::move(s); }
    void log(const std::string& msg) { sink_->write(msg); }
private:
    std::unique_ptr<LogSink> sink_ = std::make_unique<ConsoleSink>();
};
```

핵심은 **변경 가능한 부분을 분리**하는 것이다. 의존성은 인터페이스로 추상화한다.

## 패턴 1 — Strategy 격리

```cpp
// 인터페이스 — 변경 축이다
class LogSink {
public:
    virtual ~LogSink() = default;
    virtual void write(const std::string&) = 0;
};

class ConsoleSink : public LogSink {
public:
    void write(const std::string& msg) override { std::cout << msg << "\n"; }
};

class FileSink : public LogSink {
    std::ofstream file_;
public:
    FileSink(const std::string& path) : file_(path) {}
    void write(const std::string& msg) override { file_ << msg << "\n"; }
};

class NullSink : public LogSink {        // 테스트용
public:
    void write(const std::string&) override {}
};

// Singleton은 Strategy를 보유한다
class Logger {
public:
    static Logger& instance() { static Logger l; return l; }
    
    void setSink(std::unique_ptr<LogSink> s) { sink_ = std::move(s); }
    void log(const std::string& msg) { sink_->write(msg); }
    
private:
    Logger() : sink_(std::make_unique<ConsoleSink>()) {}
    std::unique_ptr<LogSink> sink_;
};
```

효과는 다음과 같다.

- Logger 자체는 Singleton으로 글로벌 접근을 유지한다
- 출력 방식은 인터페이스로 분리되어 자유롭게 바꿀 수 있다
- 테스트에서는 NullSink나 mock을 주입할 수 있다

## 패턴 2 — DI로 인터페이스 주입

```cpp
class Logger {
public:
    Logger(std::unique_ptr<LogSink> sink) : sink_(std::move(sink)) {}
    void log(const std::string& msg) { sink_->write(msg); }
    
    static Logger& instance() {
        static Logger l{std::make_unique<ConsoleSink>()};
        return l;
    }
    
    Logger(Logger&&) = default;        // 교체 가능하게 둔다
private:
    std::unique_ptr<LogSink> sink_;
};
```

교체용 함수를 따로 두는 방식도 있다.

```cpp
class Logger {
public:
    static Logger& instance() { static Logger l; return l; }
    static void replace(std::unique_ptr<LogSink> sink);    // 교체
};

// 테스트
TEST_F(MyTest, ...) {
    Logger::replace(std::make_unique<MockSink>());
    // ... 테스트
    Logger::replace(std::make_unique<ConsoleSink>());        // 복원
}
```

## 패턴 3 — Service Locator (변형)

```cpp
class ServiceLocator {
public:
    static void provide(std::unique_ptr<LogSink> s) {
        instance().sink_ = std::move(s);
    }
    static LogSink& sink() { return *instance().sink_; }
    
private:
    static ServiceLocator& instance() { static ServiceLocator s; return s; }
    std::unique_ptr<LogSink> sink_ = std::make_unique<ConsoleSink>();
};

// 사용
ServiceLocator::sink().write("...");

// 테스트
ServiceLocator::provide(std::make_unique<MockSink>());
```

Logger 클래스조차 필요 없어진다는 장점이 있지만, 글로벌 상태에 따르는 문제는 그대로 남는다.

## 패턴 4 — Inversion (의존성 역전)

원래 코드는 다음과 같다.

```cpp
class UserService {
    void create(User u) {
        Logger::instance().log("creating");        // 의존성을 숨긴다
    }
};
```

개선된 형태는 다음과 같다.

```cpp
class UserService {
    LogSink& logger_;
public:
    UserService(LogSink& l) : logger_(l) {}
    void create(User u) {
        logger_.write("creating");
    }
};

// main
ConsoleSink sink;
UserService svc{sink};
```

Singleton을 완전히 제거한다. 가능하다면 이것이 최선이다.

## 비교 — 패턴별 trade-off

| 패턴 | 변경 가능 | 테스트 가능 | 글로벌 접근 | 복잡도 |
|---|---|---|---|---|
| 원시 Singleton | ❌ | ❌ | ✅ | 낮다 |
| Strategy 격리 | ✅ (sink) | ✅ | ✅ | 중간 |
| DI 주입 | ✅ | ✅ | ✅ (선택) | 중간 |
| Service Locator | ✅ | ✅ | ✅ | 중간 |
| Inversion (DI 전면) | ✅ | ✅ | ❌ | 높다 |

전면 DI가 이상이고, Singleton의 잔재는 점진적 개선의 단계로 본다.

## 테스트 — Strategy 격리 활용

```cpp
class MockSink : public LogSink {
public:
    std::vector<std::string> messages;
    void write(const std::string& msg) override { messages.push_back(msg); }
};

TEST(UserService, CreatesLogged) {
    auto mock = std::make_unique<MockSink>();
    auto* mock_ptr = mock.get();
    Logger::instance().setSink(std::move(mock));
    
    UserService svc;
    svc.create(User{"alice"});
    
    EXPECT_EQ(mock_ptr->messages.size(), 1);
    EXPECT_TRUE(mock_ptr->messages[0].contains("creating"));
}
```

테스트 격리를 위해 글로벌 상태는 매번 정리해 줘야 한다.

```cpp
class LoggerTest : public ::testing::Test {
    void SetUp() override {
        // 이전 상태를 backup하거나 default sink로 reset한다
        Logger::instance().setSink(std::make_unique<NullSink>());
    }
};
```

매 테스트에서 깨끗한 sink로 시작하면 글로벌 상태의 위험을 어느 정도 완화할 수 있다.

## 패턴 — Async-friendly Singleton

```cpp
class Logger {
    std::mutex m_;
    std::vector<std::string> buffer_;
    std::thread worker_;
    std::atomic<bool> stop_{false};
    
    Logger() : worker_([this]{ run(); }) {}
    ~Logger() { stop_ = true; worker_.join(); }
    
    void run() {
        while (!stop_) {
            std::vector<std::string> local;
            {
                std::lock_guard l(m_);
                local.swap(buffer_);
            }
            for (auto& msg : local) sink_->write(msg);
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
        }
    }
    
public:
    static Logger& instance() { static Logger l; return l; }
    
    void log(std::string msg) {
        std::lock_guard l(m_);
        buffer_.push_back(std::move(msg));
    }
    
    void setSink(std::unique_ptr<LogSink> s) {
        std::lock_guard l(m_);
        sink_ = std::move(s);
    }
};
```

비동기 처리에 스레드 안전까지 더한 형태다. Singleton 패턴은 유지하면서 내부 구현의 완성도를 끌어올렸다.

## 함정 — 부분 Strategy

```cpp
class Logger {
    static Logger& instance() { static Logger l; return l; }
    
    // 일부만 Strategy로 분리한다
    void setSink(std::unique_ptr<LogSink> s) { sink_ = std::move(s); }
    
    // 그러나 시간 포맷, 로그 레벨, 필터 등은 하드코딩되어 있다
    void log(const std::string& msg) {
        auto time = std::format("{:%H:%M:%S}", std::chrono::system_clock::now());
        sink_->write(time + " | " + msg);
    }
};
```

테스트에서는 시간이 매번 달라져 출력 일관성을 검증하기 어렵다.

완전한 Strategy는 다음과 같이 분리한다.

```cpp
class LogFormatter {
public:
    virtual ~LogFormatter() = default;
    virtual std::string format(const std::string& msg) = 0;
};

class Logger {
    std::unique_ptr<LogFormatter> formatter_;
    std::unique_ptr<LogSink> sink_;
public:
    void log(const std::string& msg) {
        sink_->write(formatter_->format(msg));
    }
};

// 테스트
class FixedTimeFormatter : public LogFormatter {
    std::string format(const std::string& m) override { return "00:00:00 | " + m; }
};
```

## 함정 — Singleton 구현 패턴 vs DI

```cpp
// Singleton (글로벌)
auto& l = Logger::instance();

// DI (명시)
class UserService {
    Logger& logger_;
public:
    UserService(Logger& l) : logger_(l) {}
};
```

DI를 우선해야 한다. 다만 매 클래스 생성자에 모든 의존성을 받는 게 부담스럽다면 도구로 완화할 수 있다.

- Boost.DI
- 빌더 패턴
- 작은 service container

## 모던 변형 — std::pmr (메모리 자원)

```cpp
// 글로벌 default
std::pmr::memory_resource* def = std::pmr::get_default_resource();
std::pmr::set_default_resource(custom_resource);

// 테스트
auto* old = std::pmr::set_default_resource(test_resource);
// ... 테스트
std::pmr::set_default_resource(old);
```

표준 라이브러리가 글로벌 자원을 set/get 패턴으로 교체 가능하게 설계한 사례다. Singleton의 모범적인 변형이라 할 만하다.

## 모던 변형 — std::source_location 로깅

```cpp
template<typename... Args>
void log(std::format_string<Args...> fmt, Args&&... args,
         std::source_location loc = std::source_location::current()) {
    auto msg = std::format(fmt, std::forward<Args>(args)...);
    Logger::instance().log(std::format("{}:{}: {}", loc.file_name(), loc.line(), msg));
}
```

호출 위치가 자동으로 들어가 디버깅이 편해진다. C++20 기능이다.

## 실무 가이드 — 결정 트리

```
Singleton을 써야 할 때
├── 진정한 자원이고 글로벌 접근이 정당화되는가?
│   ├── 변경 축 식별 → Strategy 격리
│   ├── 테스트 격리 필요 → set/replace 메서드
│   └── 멀티스레드 → 스레드 안전 (mutex/atomic)
├── 외부 라이브러리가 강제 → adapter로 캡슐화
└── 점진적 개선 → DI로 단계적으로 이전
```

## 실무 가이드 — 체크리스트

- [ ] 변경 축을 Strategy로 격리했는가?
- [ ] 테스트를 위한 set/replace 메서드나 mock 주입을 마련했는가?
- [ ] 스레드 안전성을 위해 락이나 atomic을 적용했는가?
- [ ] 글로벌 상태를 SetUp/TearDown으로 테스트 간에 격리했는가?
- [ ] 점진적으로 DI로 이전할 계획이 있는가?
- [ ] 진정한 유일성인지, 단지 가정인지 재확인했는가?

## 핵심 정리

1. **Singleton이 불가피하다면** 변경과 테스트 가능성을 함께 설계한다
2. **Strategy 격리**로 변경 축을 인터페이스로 분리한다
3. **set/replace 메서드**로 테스트에서 Mock을 주입한다
4. **DI로 점진적 이전**이 궁극의 목표다
5. **표준 모범**으로 `std::pmr::set_default_resource`가 있다
6. **테스트 격리**는 SetUp/TearDown으로 글로벌 상태를 reset해 확보한다

## 관련 항목

- [가이드라인 37: Singleton은 구현 패턴](/blog/programming/cpp/cpp-software-design/guideline37-treat-singleton-as-an-implementation-pattern-not-a-design-pattern) — 본질
- [가이드라인 19: Strategy](/blog/programming/cpp/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — 변경 격리
- [가이드라인 4: Design for Testability](/blog/programming/cpp/cpp-software-design/guideline04-design-for-testability) — Mock 주입
- [GoF Singleton](/blog/programming/design/gof-design-patterns/item04-prototype) — GoF 측면
