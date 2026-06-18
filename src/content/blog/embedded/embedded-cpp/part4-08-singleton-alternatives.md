---
title: "Singleton 대안 패턴 — Service Locator·Static Init·Phantom"
date: 2026-05-01T09:36:00
description: "임베디드의 DI 패턴 — Construct-On-First-Use, static dependency injection, service locator."
series: "Embedded C++ for Real Systems"
seriesOrder: 36
tags: [cpp, embedded, singleton, dependency-injection, static-di, service-locator]
type: tech
---

## 한 줄 요약

> **"Singleton은 임베디드에서도 안티패턴입니다."** Static DI, Construct-On-First-Use, service locator가 세 가지 대안입니다.

## 어떤 문제를 푸는가

Singleton에는 다음과 같은 문제가 있습니다(GoF조차 권장하지 않습니다).

- 전역 상태라서 테스트가 어렵습니다.
- 의존성이 시그니처에 드러나지 않아 암묵적입니다.
- 서로 다른 TU의 static 초기화 순서가 꼬이는 Static Initialization Order Fiasco가 생깁니다.
- Multi-thread 환경에서 atomic getInstance가 필요합니다.
- Mock이 어렵습니다.

임베디드도 예외가 아닙니다. 다만 제약된 환경이라 대안의 선택지가 조금 다릅니다.

이 글에서는 세 가지 Singleton 대안을 살펴봅니다.

## 대안 1 — Construct-On-First-Use

C++11의 thread-safe magic static을 활용합니다.

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

장점은 다음과 같습니다.

- 첫 호출 시 생성되므로 Static Init Order Fiasco가 해결됩니다.
- C++11 이상에서 thread-safe입니다.
- 코드가 간단합니다.

단점은 다음과 같습니다.

- 여전히 전역이라 테스트에서 mock하기 어렵습니다.
- thread-safe guard 비용이 들며, `-fno-threadsafe-statics`로 끄면 코드가 더 작아집니다.

## 대안 2 — Static DI (생성자 주입)

의존성을 명시적으로 받고 Singleton을 쓰지 않습니다.

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

장점은 다음과 같습니다.

- 의존성이 시그니처에 그대로 드러납니다.
- fake logger를 주입해 테스트가 쉽습니다.
- 전역 상태가 없습니다.
- static initialization fiasco가 없습니다.

단점은 다음과 같습니다.

- 모든 객체가 의존성을 매개변수로 받으므로 매개변수 수가 늘어납니다.
- 큰 시스템에서는 wiring 코드가 길어집니다.

```cpp
// main.cpp — composition root
Logger logger;
Sensor sensor(logger);
Display display(logger);
DataCache cache(logger);
EventBus bus(logger);
System system(sensor, display, cache, bus, logger);
```

dependency wiring이 한 곳에 모입니다. 명확하지만 길어집니다.

## 대안 3 — Service Locator (조심)

전역 registry에 service를 등록하고 객체가 id로 검색하는 방식입니다.

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

장점은 다음과 같습니다.

- 의존성 wiring이 가볍습니다.
- 테스트에서 fake를 등록할 수 있습니다.

단점은 다음과 같습니다.

- 여전히 전역이라 Singleton과 거의 같습니다.
- register를 누락하면 nullptr이 되는 순서 의존이 있습니다.
- anti-pattern으로 보는 시각도 있습니다.

대부분 Singleton보다 약간 나은 정도입니다. Static DI를 더 권장합니다.

## 임베디드 — Static DI 실용

임베디드에서는 시스템 wiring을 main에서 한 번만 하므로 부담이 크지 않습니다.

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

linear한 흐름으로 모든 의존성이 명시됩니다. Mock 테스트에서는 다음과 같이 씁니다.

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

runtime 비용이 0이며 의존성이 컴파일 타임에 결정됩니다.

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

장점은 다음과 같습니다.

- zero runtime cost입니다.
- virtual 호출이 없습니다.

단점은 다음과 같습니다.

- template instantiation으로 type이 늘어납니다.
- Sensor 클래스가 logger의 type을 알고 있어야 합니다.

CRTP나 static polymorphism의 응용이며 [Part 2-08](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)에서 다룹니다.

## 진짜 Singleton이 옳은 경우

드물지만 있습니다. 시스템에 물리적으로 하나뿐인 하드웨어 자원입니다.

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

이 경우에도 interface를 분리하는 편이 좋습니다.

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

interface를 통한 의존성을 둡니다. 운영 환경에서는 `Uart0::instance()`를 주입하고 테스트에서는 `FakeUart`를 주입합니다.

## 자주 보는 함정과 안티패턴

### 1. Singleton 남용
"전역 접근이 편하다"는 이유로 모든 service를 singleton으로 만들면 테스트가 지옥이 됩니다. DI를 우선합니다.

### 2. Singleton의 destructor 의존
임베디드는 main이 끝나지 않으므로 destructor가 호출되지 않습니다. destructor에 중요한 로직을 두지 않습니다.

### 3. thread-safe 비활성화
```cpp
#pragma push_options
// -fno-threadsafe-statics
static Logger inst;
```

single-task RTOS면 괜찮습니다. multi-task에서는 thread-safe를 유지합니다.

### 4. Construct-On-First-Use의 destructor 순서
여러 singleton의 destructor 호출 순서는 unspecified입니다. 의존성이 있으면 위험하지만, 임베디드는 main이 끝나지 않으므로 보통 무관합니다.

### 5. Service Locator의 register 순서
register하지 않은 service를 사용하면 nullptr로 crash가 납니다. 순서를 명시합니다.

### 6. Mock 못 하는 객체
모든 의존성이 concrete singleton이면 mock이 불가능합니다. interface를 통해 주입합니다.

## 임베디드 — Hardware Singleton 패턴

UART0 같은 hardware singleton은 DI와 factory를 조합해서 다룹니다.

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

하드웨어는 singleton으로 두고 application은 DI로 받는 균형입니다.

## DI Container — overkill?

대규모 desktop SW에서는 Spring이나 Guice 같은 DI framework를 씁니다. 임베디드에서는 manual wiring으로 충분합니다.

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

대부분 불필요합니다. 임베디드에서는 명시적 wiring이 더 깨끗합니다.

## 측정 — Singleton vs DI

5개 service 시스템의 코드 크기 비교입니다.

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

DI가 약간 작고 더 빠릅니다. 의존성이 명확해지는 가치도 함께 얻습니다.

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
- GoF 5: Singleton (avoid)
- TDD Pattern 43: Singleton (avoid)

## 다음 글 (Part 5 시작)

[Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction) — MMIO를 type-safe하게. Memory-mapped register의 C++ 표현.
