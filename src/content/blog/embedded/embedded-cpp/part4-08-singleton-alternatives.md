---
title: "Part 4-08: Singleton 대안"
date: 2026-05-16T08:00:00
description: "임베디드의 DI 패턴 — Construct-On-First-Use, static dependency injection, service locator."
series: "Embedded C++ for Real Systems"
seriesOrder: 36
tags: [cpp, embedded, singleton, dependency-injection, static-di, service-locator]
type: tech
---

## 한 줄 요약

> **"Singleton은 *임베디드에서도 안티패턴*."** — Static DI, Construct-On-First-Use, service locator가 *3가지 대안*.

## 어떤 문제를 푸는가

Singleton의 문제 (GoF조차 권장 안 함):

- *전역 상태* — 테스트 어려움
- *암묵 의존성* — 시그니처에 안 보임
- *Static Initialization Order Fiasco* — 다른 TU의 static 초기화 순서
- *Multi-thread* — atomic getInstance 필요
- *Mock 어려움*

임베디드도 *예외 없음*. 다만 *제약 환경*에서 *대안 선택지가 다름*.

이 글은 *3가지 Singleton 대안*입니다.

## 대안 1 — Construct-On-First-Use

C++11의 *thread-safe magic static*.

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger inst;   // C++11 — 최초 호출 시 1번 생성
        return inst;
    }

    void log(const char* msg) { /* */ }

private:
    Logger() = default;
};

Logger::instance().log("hello");
```

장점:
- *Static Init Order Fiasco 해결* — 첫 호출 시 생성
- *thread-safe* (C++11+)
- 코드 *간단*

단점:
- *여전히 전역* — 테스트에서 mock 어려움
- *thread-safe guard 비용*: `-fno-threadsafe-statics` 끄면 더 작음

## 대안 2 — Static DI (생성자 주입)

*명시적 의존성*. Singleton 안 씀.

```cpp
class Logger {
public:
    void log(const char* msg) { /* */ }
};

class Sensor {
public:
    Sensor(Logger& logger) : logger_(logger) {}

    void read() {
        // ...
        logger_.log("read done");
    }

private:
    Logger& logger_;
};

// main에서 한 번 wiring
Logger logger;
Sensor sensor(logger);
```

장점:
- *의존성 명시* — 시그니처에 보임
- *테스트 쉬움* — fake logger 주입
- *전역 상태 없음*
- *static initialization fiasco* 없음

단점:
- *모든 객체가 의존성 받음* — 매 객체 매개변수 증가
- *큰 시스템에 wiring 코드 길어짐*

```cpp
// main.cpp — composition root
Logger logger;
Sensor sensor(logger);
Display display(logger);
DataCache cache(logger);
EventBus bus(logger);
System system(sensor, display, cache, bus, logger);
```

*depencency wiring*이 한 곳에 모임. 명확하지만 *길음*.

## 대안 3 — Service Locator (조심)

*전역 registry*에 service 등록. 객체가 *id로 검색*.

```cpp
class ServiceLocator {
    static inline Logger* logger_ = nullptr;
    static inline Database* db_ = nullptr;

public:
    static void register_logger(Logger* l) { logger_ = l; }
    static Logger* logger() { return logger_; }

    static void register_db(Database* d) { db_ = d; }
    static Database* db() { return db_; }
};

// main
Logger logger;
ServiceLocator::register_logger(&logger);

// 다른 곳
void some_function() {
    ServiceLocator::logger()->log("hello");
}
```

장점:
- *의존성 wiring 가벼움*
- *test에서 fake 등록 가능*

단점:
- *여전히 전역* — Singleton과 거의 같음
- *순서 의존* — register 누락 시 nullptr
- *anti-pattern 시각도*

대부분 *Singleton보다 약간 나은* 정도. Static DI가 더 권장.

## 임베디드 — Static DI 실용

embedded는 *시스템 wiring*이 *main에서 한 번*. 큰 부담 아님.

```cpp
// main.cpp
int main() {
    // 1. peripheral 초기화
    SystemClock_Init();
    GPIO_Init();
    UART_Init();

    // 2. service 객체 생성 (stack 또는 static)
    static UartLogger logger;
    static FlashStore store;
    static EventBus bus;

    // 3. application 객체 wiring
    Sensor sensor(logger, bus);
    Controller controller(sensor, store, logger);

    // 4. 실행
    controller.run();

    return 0;
}
```

*linear 흐름*. *모든 의존성 명시*. Mock에서는:

```cpp
TEST(SensorTest, ReadDoesNotCrash) {
    FakeLogger logger;
    FakeBus bus;
    Sensor sensor(logger, bus);

    sensor.read();
    EXPECT_EQ(logger.last_message(), "read done");
}
```

## 대안 4 — Template Injection (compile-time)

*runtime 비용 0*. 컴파일 타임에 의존성 박힘.

```cpp
template<typename Logger>
class Sensor {
    Logger& logger_;
public:
    Sensor(Logger& l) : logger_(l) {}
    void read() { logger_.log("read"); }
};

// 사용
UartLogger logger;
Sensor<UartLogger> sensor(logger);

sensor.read();   // logger_.log 직접 호출 — inline 가능
```

장점:
- *zero runtime cost*
- *virtual 호출 없음*

단점:
- *type 폭증* (template 인스턴스화)
- *Sensor 클래스가 logger type을 알아야*

CRTP / static polymorphism의 응용. [Part 2-08](/blog/embedded/embedded-cpp/part2-08-static-polymorphism).

## 진짜 Singleton이 *옳은 경우*

드물지만 있음.

- *진정한 하드웨어 자원* — 시스템에 *물리적으로 하나*
  - Serial port (UART0)
  - Display controller
  - 특정 ADC

```cpp
class Uart0 {
public:
    static Uart0& instance() {
        static Uart0 inst;
        return inst;
    }

    void send(uint8_t b) { /* */ }

private:
    Uart0() { /* hw init */ }
};
```

이 경우에도 *interface 분리*가 좋음:

```cpp
class IUart {
public:
    virtual ~IUart() = default;
    virtual void send(uint8_t) = 0;
};

class Uart0 : public IUart {
    Uart0() = default;
public:
    static IUart& instance() {
        static Uart0 inst;
        return inst;
    }

    void send(uint8_t b) override { /* */ }
};

// 테스트
class FakeUart : public IUart {
public:
    std::vector<uint8_t> sent;
    void send(uint8_t b) override { sent.push_back(b); }
};
```

*interface 통한 의존성*. 운영에선 *Uart0::instance()*, 테스트에선 *FakeUart 주입*.

## 자주 보는 함정과 안티패턴

### 1. *Singleton 남용*
"전역 접근 편함" → 모든 service singleton → *test 지옥*. *DI 우선*.

### 2. *Singleton의 destructor 의존*
임베디드는 *main 안 끝남* — *destructor 호출 안 됨*. *destructor에 중요 로직 두지 마*.

### 3. *thread-safe 비활성*
```cpp
#pragma push_options
// -fno-threadsafe-statics
static Logger inst;
```
single-task RTOS면 OK. multi-task는 *thread-safe 유지*.

### 4. *Construct-On-First-Use의 destructor 순서*
여러 singleton의 *destructor 호출 순서 unspecified*. 의존성 있으면 *위험*. 임베디드는 *main 끝 안 남* 보통 무관.

### 5. *Service Locator의 register 순서*
register 안 한 service 사용 → nullptr crash. *순서 명시*.

### 6. *Mock 못 할 객체*
모든 *concrete singleton* → mock 불가. *interface 통한 의존성*.

## 임베디드 — Hardware Singleton 패턴

UART0 같은 *hardware singleton*은 *DI + factory* 조합.

```cpp
// 1. Interface
class IUart {
public:
    virtual ~IUart() = default;
    virtual void send(uint8_t) = 0;
    virtual int receive() = 0;
};

// 2. Concrete impl
class Uart0 : public IUart {
    Uart0() { init_hw(); }
public:
    static Uart0& get() {
        static Uart0 inst;
        return inst;
    }
    void send(uint8_t b) override { USART0->DR = b; }
    int receive() override { return USART0->DR; }
};

// 3. 사용 — interface 받음
class Logger {
public:
    Logger(IUart& uart) : uart_(uart) {}
    void log(const char* msg) {
        while (*msg) uart_.send(*msg++);
    }
private:
    IUart& uart_;
};

// main
Logger logger(Uart0::get());

// 테스트
class FakeUart : public IUart { /* */ };
FakeUart fake;
Logger test_logger(fake);
```

*Hardware는 singleton*, *application은 DI*. 균형.

## DI Container — overkill?

대규모 desktop SW에서는 *Spring, Guice 같은 DI framework*. 임베디드는 *manual wiring으로 충분*.

```cpp
// 가벼운 DI container — 직접 작성
class Container {
public:
    template<typename T, typename... Args>
    T& create(Args&&... args) {
        static T instance(std::forward<Args>(args)...);
        return instance;
    }
};

Container c;
auto& logger = c.create<Logger>();
auto& sensor = c.create<Sensor>(logger);
```

대부분 *unnecessary*. *명시적 wiring*이 *임베디드에선 깨끗*.

## 측정 — Singleton vs DI

코드 크기 (5 service 시스템).

```text
# Singleton everywhere
.text: 4.2 KB
.bss: 120 B (singleton instances)
runtime: thread-safe guards

# Static DI (main에서 wiring)
.text: 3.8 KB
.bss: 120 B (named instances)
runtime: 0 (no guards)
```

*DI가 약간 작음 + 더 빠름*. *명확한 의존성* 추가 가치.

## 정리

- Singleton은 임베디드에서도 회피합니다. 전역 상태, 테스트 난이도, init order 문제가 따라옵니다.
- 대안은 세 가지입니다 — Construct-On-First-Use, Static DI, Service Locator.
- Static DI를 권장합니다. main에서 wiring하고 의존성을 명시합니다.
- Template injection은 zero-cost입니다.
- 진짜 hardware singleton도 interface를 거쳐 DI합니다.
- DI framework는 임베디드에 overkill이므로 manual wiring을 사용합니다.

## 관련 항목

- [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code) — Static Init Order Fiasco
- [Part 3-10: 소유권 모델](/blog/embedded/embedded-cpp/part3-10-ownership-model) — DI와 ownership
- [GoF 5: Singleton (avoid)](/blog/programming/design/gof-design-patterns/item05-singleton)
- [TDD Pattern 43: Singleton (avoid)](/blog/programming/engineering/tdd-patterns/pattern43-singleton)

## 다음 글 (Part 5 시작)

[Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction) — *MMIO를 type-safe하게*. Memory-mapped register의 C++ 표현.
