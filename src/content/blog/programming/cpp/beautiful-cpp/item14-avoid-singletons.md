---
title: "항목 14: 싱글턴을 피하라"
date: 2026-05-08T14:00:00
description: "싱글턴 = 전역 변수 + OOP 위장. 의존성 주입으로 결합도·테스트·동시성 모두 해결."
tags: [C++, Design Patterns, Dependency Injection]
series: "Beautiful C++"
seriesOrder: 14
draft: true
---

## 왜 이 항목이 중요한가?

싱글턴은 GoF 디자인 패턴 중 가장 자주 인용되고 — **가장 자주 후회**되는 패턴이다. "전역으로 하나만 있게" 라는 자연스러운 요구는 종종 잘못된 해결책으로 이어진다.

진짜 문제는 "하나만 있어야 함"이 아니라 — **"누가 그 하나를 만들고, 누가 사용하고, 라이프타임은 어떻게 관리되나"** 라는 질문에 답이 없을 때다. 싱글턴은 이 질문들을 호출 그래프 바깥에 숨겨버린다 — 그래서 테스트가 어려워지고, 결합도가 보이지 않게 늘어나고, 초기화 순서가 깨진다.

## 핵심 내용

- 싱글턴은 **숨겨진 전역 상태** — 호출 그래프에 안 나타나서 결합도를 보이지 않게 한다
- **테스트가 어렵다** (mock 주입 불가, 테스트 간 상태 공유)
- 멀티스레드에서 **초기화 순서·동기화 함정**이 많다
- 대부분의 경우 **의존성 주입(DI)** 으로 같은 효과
- "단 하나만 필요해서 싱글턴"은 보통 잘못된 추론 — **"누구도 둘을 만들지 않는다"** 와 **"둘을 못 만들게 강제한다"** 는 다른 책임

## 비교 — 싱글턴 vs 의존성 주입

### Bad: 싱글턴 — 숨겨진 의존성

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger inst;
        return inst;
    }
    void log(const std::string& msg);
private:
    Logger() = default;
};

void do_work() {
    Logger::instance().log("working");      // 어디서 의존성이 오는지 시그니처에 안 보임
}
```

문제:
- `do_work()` 시그니처만 보면 — Logger 의존이 안 드러남
- 테스트에서 MockLogger를 주입할 방법 없음
- 다른 Logger 구현을 사용하려면 코드 수정
- 멀티스레드에서 log() 호출 동기화 책임 미정

### Good: 명시적 의존성 주입

```cpp
class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(const std::string& msg) = 0;
};

void do_work(Logger& log) {              // 의존성이 시그니처에 드러남
    log.log("working");
}

// 프로덕션
ConsoleLogger console_log;
do_work(console_log);

// 테스트
MockLogger mock;
do_work(mock);
EXPECT_EQ(mock.last_message(), "working");
```

각 함수가 필요한 의존성을 **매개변수로** 받음 — 결합도가 시그니처에 드러나고, 테스트 친화적.

## 싱글턴의 진짜 문제들

### 1) 테스트 격리 깨짐

```cpp
TEST(WorkerTest, Logs) {
    do_work();
    EXPECT_EQ(Logger::instance().count(), 1);
}

TEST(WorkerTest, Twice) {
    do_work();
    do_work();
    EXPECT_EQ(Logger::instance().count(), 2);   // ⚠️ 이전 테스트의 1 + 현재 2 = 3?
}
```

싱글턴의 상태가 테스트 간 누적. 순서 의존, fragile 테스트.

### 2) 초기화 순서 — Static Initialization Order Fiasco

```cpp
// FileA.cpp
class Database {
public:
    Database() { Logger::instance().log("DB created"); }
};
Database global_db;     // static 초기화

// FileB.cpp
class Logger { /* singleton */ };
```

두 static 객체 — 어느 게 먼저 초기화될지 표준이 정하지 않음 (translation unit 간). `Database` 생성자가 `Logger::instance()`를 부를 때 Logger가 아직 초기화 안 됐을 수 있음 → UB.

Meyers' singleton (function-local static)은 이 문제 해결:

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger inst;     // 첫 호출 시 초기화 — 결정적
        return inst;
    }
};
```

C++11+ magic static으로 thread-safe. 그러나 다른 문제(테스트, 결합도)는 여전.

### 3) 멀티스레드 안전성

```cpp
class Counter {
public:
    static Counter& instance() {
        static Counter c;
        return c;
    }
    void inc() { ++count_; }            // ⚠️ race
private:
    int count_ = 0;
};
```

instance() 자체는 thread-safe(C++11+)이지만 — 멤버 메서드는 별개. 사용자가 동기화 책임.

### 4) "단 하나"의 진정한 의미

```cpp
class Database {
    static Database& instance();
};
```

질문: 정말 시스템에 Database가 단 하나여야 하나? 보통은 **하나만 만들면 충분**한 거지, **둘 이상 만들면 안 되는** 게 아님.

- 테스트에서 인메모리 DB 따로
- 통합 테스트에서 두 DB 동시 (마이그레이션)
- 사용자가 정말 둘 만들고 싶을 때

싱글턴은 이 가능성을 미리 차단. 보통 과도한 제한.

## 의존성 주입 — 패턴들

### 1) 생성자 주입

```cpp
class Worker {
    Logger& log_;
public:
    explicit Worker(Logger& log) : log_(log) {}
    void process() { log_.log("processing"); }
};

ConsoleLogger log;
Worker w(log);
```

가장 일반적 — 의존성을 객체 생성 시 결정.

### 2) 메서드 주입

```cpp
class Worker {
public:
    void process(Logger& log) { log.log("processing"); }
};
```

호출마다 다른 의존성 가능. 짧은 라이프타임 의존성에 적합.

### 3) Setter 주입

```cpp
class Worker {
    Logger* log_ = nullptr;
public:
    void setLogger(Logger& log) { log_ = &log; }
};
```

라이프사이클 분리. 부분 초기화 위험 — 잘 안 쓰임.

### 4) 컨테이너/팩토리

```cpp
class ServiceContainer {
public:
    Logger& logger();
    Database& database();
};

void do_work(ServiceContainer& services) {
    services.logger().log("...");
}
```

여러 의존성을 묶음. 점진적으로 DI 프레임워크로 발전 가능.

## "정말 싱글턴이 필요한 경우" — 매우 드물게

진짜 시스템 자원이 하나뿐인 경우:
- 하드웨어 리소스 (GPU, 사운드 카드)
- 프로세스 단일 자원 (stdout, current working directory)

그래도 **싱글턴 패턴 대신 모듈 함수**가 더 단순한 경우 많음:

```cpp
namespace logger {
    void log(const std::string& msg);   // 자유 함수 — 글로벌 상태 묶기
}

logger::log("...");
```

C 라이브러리 스타일 — 명시적 글로벌, 숨김 없음.

## 함정 — 싱글턴 안의 싱글턴

```cpp
class Database {
    static Database& instance() {
        static Database d;
        return d;
    }
    Database() {
        Logger::instance().log("DB created");     // 또 다른 싱글턴
        Config::instance().get_db_url();          // 또 또 다른 싱글턴
    }
};
```

싱글턴 사슬 — 한 클래스가 여러 글로벌 상태에 의존. 테스트 불가, 의존성 그래프 폭발.

## 함정 — DI 프레임워크 남용

C++에선 Java/C# 스타일의 DI 컨테이너(Spring, Guice)가 잘 어울리지 않음. **수동 생성자 주입**이 보통 더 명확.

```cpp
// 간단한 composition root
int main() {
    ConsoleLogger log;
    PostgresDatabase db(log);
    OrderService orders(db, log);
    PaymentService payments(db, log);
    
    HttpServer server(orders, payments);
    server.run();
}
```

`main()`에서 모든 의존성 명시적 조립. 작은~중간 규모 프로젝트에 충분.

## 함정 — interface 강제 vs concrete 타입

```cpp
// Interface (다형성)
class Logger { virtual void log(...) = 0; };
class ConsoleLogger : public Logger { ... };

void worker(Logger& log);       // ← 인터페이스 받기

// 또는 구체 타입 (테스트 friend, fake)
void worker(ConsoleLogger& log);
```

테스트에 mock이 필요하면 interface. 단일 구현이면 concrete + fake 객체 직접 작성. 과도한 추상화 X.

## 모던 변형 — `std::shared_ptr<Logger>` 주입

```cpp
class Worker {
    std::shared_ptr<Logger> log_;
public:
    explicit Worker(std::shared_ptr<Logger> log) : log_(std::move(log)) {}
};
```

라이프타임 책임을 객체에 — 단, 정말 공유 소유 의미 있을 때. 항목 11 참고.

## 실무 가이드 — 결정 트리

```
"하나만 있으면 되는" 자원?
├── 진짜 시스템 단일 자원 (GPU, stdout) → 모듈 함수 or singleton
├── 보통은 하나면 충분 (Database, Logger) → 의존성 주입 + 1개 인스턴스 생성
├── "Just convenience" → 의존성 주입, 절대 singleton X
└── 테스트가 어려우면 → 의존성 주입 의무
```

## 실무 가이드 — 체크리스트

- [ ] 정말 시스템에 인스턴스가 둘 이상이면 깨지는가?
- [ ] 테스트에서 mock/fake 주입이 필요한가?
- [ ] 다른 구현을 갈아끼울 가능성?
- [ ] 멀티스레드 안전성을 별도 동기화로 보장?
- [ ] 초기화 순서를 의식하고 있는가? (Meyers' singleton 또는 명시적 init)
- [ ] composition root에서 명시적 의존성 조립?

## 정리

싱글턴은 **"전역 변수 + OOP 위장"** 일 뿐이다. 의존성을 명시적 인자로 주입하면 결합도·테스트·동시성이 모두 좋아진다.

대안 사다리:
1. **생성자 주입** — 가장 일반적
2. **메서드 주입** — 짧은 라이프타임 의존
3. **서비스 컨테이너** — 여러 의존 묶음
4. **모듈 함수** — 정말 글로벌 상태가 의미 있을 때 (싱글턴 클래스 아님)

## 관련 항목

- [항목 11: 명시적 공유 최소화](/blog/programming/cpp/beautiful-cpp/item11-minimize-explicit-data-sharing) — 전역 가변 상태의 문제
- [항목 17: 전역 상태 에러 처리](/blog/programming/cpp/beautiful-cpp/item17-avoid-global-state-error-handling) — 전역 상태의 다른 형태
- [Effective C++ 항목 4: 객체 초기화](/blog/programming/cpp/effective-cpp/item04-make-sure-objects-are-initialized-before-use) — Meyers' singleton
