---
title: "가이드라인 38: Singleton은 변경과 테스트 가능성을 위해 설계하라"
date: 2026-05-15T09:00:00
description: "Singleton이 불가피하다면 — Strategy로 알고리즘 격리, DI 인터페이스 주입, Locator로 테스트성 확보."
tags: [C++, Software Design, Singleton, DI, Testability]
series: "C++ Software Design"
seriesOrder: 38
---

## 왜 이 가이드라인이 중요한가?

가이드라인 37 — Singleton 회피 권장. 그러나 — 현실에선 **불가피한** 경우 있음:
- 외부 라이브러리가 강제
- 기존 코드 — 점진적 개선만 가능
- 진정한 자원 (스레드 풀, 로깅 시스템)

이때 — **변경 대비**, **테스트 가능**하게 설계.

```cpp
// 일반 Singleton — 변경 적대적
class Logger {
    static Logger& instance() { static Logger l; return l; }
    void log(const std::string&) { /* 콘솔에 출력 */ }
};

// 개선된 Singleton — Strategy 격리, 테스트 가능
class Logger {
public:
    static Logger& instance() { static Logger l; return l; }
    void setSink(std::unique_ptr<LogSink> s) { sink_ = std::move(s); }
    void log(const std::string& msg) { sink_->write(msg); }
private:
    std::unique_ptr<LogSink> sink_ = std::make_unique<ConsoleSink>();
};
```

핵심 — **변경 가능한 부분을 분리**. 의존성을 인터페이스로 추상.

## 패턴 1 — Strategy 격리

```cpp
// 인터페이스 — 변경 축
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

// Singleton — Strategy 보유
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

**효과**:
- Logger 자체 — Singleton (글로벌 접근)
- 출력 방식 — 인터페이스로 분리 (변경 가능)
- 테스트 — NullSink 또는 mock 주입

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
    
    Logger(Logger&&) = default;        // 교체 가능하게
private:
    std::unique_ptr<LogSink> sink_;
};
```

또는 함수 추가:

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

**장점** — Logger 클래스조차 불필요. 그러나 — 글로벌 상태의 모든 문제는 그대로.

## 패턴 4 — Inversion (의존성 역전)

원래:
```cpp
class UserService {
    void create(User u) {
        Logger::instance().log("creating");        // 의존성 숨김
    }
};
```

개선:
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

Singleton 완전 제거. 가능하면 — 이게 최선.

## 비교 — 패턴별 trade-off

| 패턴 | 변경 가능 | 테스트 가능 | 글로벌 접근 | 복잡도 |
|---|---|---|---|---|
| 원시 Singleton | ❌ | ❌ | ✅ | 낮음 |
| Strategy 격리 | ✅ (sink) | ✅ | ✅ | 중간 |
| DI 주입 | ✅ | ✅ | ✅ (선택) | 중간 |
| Service Locator | ✅ | ✅ | ✅ | 중간 |
| 인버전 (DI 전면) | ✅ | ✅ | ❌ | 높음 |

전면 DI가 이상. Singleton 잔재 — 점진적 개선 단계로.

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

**테스트 격리** — 글로벌 상태 후 정리:

```cpp
class LoggerTest : public ::testing::Test {
    void SetUp() override {
        // 이전 상태 백업 or default sink로 reset
        Logger::instance().setSink(std::make_unique<NullSink>());
    }
};
```

매 테스트 — 깨끗한 sink. 글로벌 상태 위험 완화.

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

비동기 + 스레드 안전. Singleton 패턴은 그대로 — 내부 구현 완성도 ↑.

## 함정 — 부분 Strategy

```cpp
class Logger {
    static Logger& instance() { static Logger l; return l; }
    
    // 일부만 Strategy
    void setSink(std::unique_ptr<LogSink> s) { sink_ = std::move(s); }
    
    // 그러나 — 시간 포맷, 로그 레벨, 필터 등 — 하드코딩
    void log(const std::string& msg) {
        auto time = std::format("{:%H:%M:%S}", std::chrono::system_clock::now());
        sink_->write(time + " | " + msg);
    }
};
```

테스트 — 시간이 매번 달라 — 출력 일관성 검증 어려움.

**완전 Strategy**:

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

DI — 항상 우선. 그러나 — 매 클래스 ctor에 모든 의존성 — 부담. 도구로 완화:
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

표준이 — 글로벌 자원을 set/get 패턴으로 — 교체 가능하게 설계. Singleton의 모범 사례.

## 모던 변형 — std::source_location 로깅

```cpp
template<typename... Args>
void log(std::format_string<Args...> fmt, Args&&... args,
         std::source_location loc = std::source_location::current()) {
    auto msg = std::format(fmt, std::forward<Args>(args)...);
    Logger::instance().log(std::format("{}:{}: {}", loc.file_name(), loc.line(), msg));
}
```

호출 위치 자동 — 디버깅 편의. C++20.

## 실무 가이드 — 결정 트리

```
Singleton 사용해야 할 때:
├── 진정한 자원이고 글로벌 접근 정당화
│   ├── 변경 축 식별 → Strategy 격리
│   ├── 테스트 격리 필요 → set/replace 메서드
│   └── 멀티스레드 → 스레드 안전 (mutex/atomic)
├── 외부 라이브러리 강제 → adapter로 캡슐화
└── 점진적 개선 → DI로 단계적 이전
```

## 실무 가이드 — 체크리스트

- [ ] 변경 축 식별 — Strategy로 격리?
- [ ] 테스트 — set/replace 메서드 또는 mock 주입?
- [ ] 스레드 안전성 — 락 / atomic 적용?
- [ ] 글로벌 상태 — 테스트 격리 (SetUp/TearDown)?
- [ ] 점진적 DI 이전 계획?
- [ ] 진정한 유일성인가, 가정인가 — 재확인?

## 핵심 정리

1. **Singleton이 불가피** — 변경 / 테스트 가능성 설계
2. **Strategy 격리** — 변경 축을 인터페이스로 분리
3. **set/replace 메서드** — 테스트에서 Mock 주입
4. **DI로 점진적 이전** — 궁극 목표
5. **표준 모범** — std::pmr::set_default_resource
6. **테스트 격리** — SetUp/TearDown으로 글로벌 상태 reset

## 관련 항목

- [가이드라인 37: Singleton은 구현 패턴](/blog/programming/cpp-software-design/guideline37-treat-singleton-as-an-implementation-pattern-not-a-design-pattern) — 본질
- [가이드라인 19: Strategy](/blog/programming/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — 변경 격리
- [가이드라인 4: Design for Testability](/blog/programming/cpp-software-design/guideline04-design-for-testability) — Mock 주입
- [GoF Singleton](/blog/programming/gof-design-patterns/item04-singleton) — GoF 측면
