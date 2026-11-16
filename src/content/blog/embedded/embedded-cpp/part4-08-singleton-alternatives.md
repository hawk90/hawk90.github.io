---
title: "Singleton 대안 패턴 — Service Locator·Static Init·Phantom"
slug: "embedded/embedded-cpp/part4-08-singleton-alternatives"
date: 2026-05-01T09:36:00
description: "임베디드의 DI 패턴 — Construct-On-First-Use, static dependency injection, service locator."
series: "Embedded C++ for Real Systems"
seriesOrder: 36
tags: [cpp, embedded, singleton, dependency-injection, static-di, service-locator]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **전역 접근과 객체의 유일성, 초기화 순서, 소유권은 따로 판단합니다.** 생성자 주입·template injection·제한된 locator를 비교하고, Construct-On-First-Use는 초기화 시점만 바꾸는 기법임을 구분합니다.

## 어떤 문제를 푸는가

전역 Singleton을 여러 곳에서 직접 참조하는 설계에는 다음 비용이 생길 수 있습니다. 특정 패턴 이름만으로 폐기하기보다 실제 수명·교체·동시성 요구를 확인합니다.

- 전역 상태라서 테스트가 어렵습니다.
- 의존성이 시그니처에 드러나지 않아 암묵적입니다.
- 서로 다른 TU의 static 초기화 순서가 꼬이는 Static Initialization Order Fiasco가 생깁니다.
- thread-safe 초기화와 이후 객체 member의 동시 접근 안전성은 별도로 확인해야 합니다.
- Mock이 어렵습니다.

임베디드도 예외가 아닙니다. 다만 제약된 환경이라 대안의 선택지가 조금 다릅니다.

이 글에서는 초기화 지연, 생성자 주입, locator, template injection을 비교합니다. 앞의 코드 조각들은 각각 독립적인 설계 대안이며 한 파일에 합치는 완성 프로그램이 아닙니다.

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

- 필요한 객체를 최초 진입 시 초기화하므로 TU 사이의 비지역 초기화 의존을 줄일 수 있습니다. 재귀 진입과 파괴 시점 의존은 별도입니다.
- C++11 이후 정상 구현은 초기화 완료에 대한 동시 진입을 동기화합니다. log 같은 이후 member 함수까지 thread-safe가 되지는 않습니다.
- 코드가 간단합니다.

단점은 다음과 같습니다.

- 여전히 전역이라 테스트에서 mock하기 어렵습니다.
- 생성자가 하는 일에 따라 비용이 갈립니다. arm-none-eabi-g++ 16.2.0 `-mcpu=cortex-m4 -Os`에서 위 `Logger`(멤버 없음, `= default` 생성자)의 `instance()`는 상수 초기화로 끝나 주소를 돌려주는 2명령(8바이트)이었습니다. 생성자에서 `uart_init()`을 부르는 `Uart0::instance()`는 guard 검사·`dmb ish`·`__cxa_guard_acquire`/`__cxa_guard_release` 호출이 붙어 44바이트였습니다([Part 1-02](/blog/embedded/embedded-cpp/part1-02-compiler-flags#-fno-threadsafe-statics--magic-static-끄기)). guard를 옵션으로 끄는 것은 size 최적화가 아니라 동기화 계약 변경입니다.

## 대안 2 — Static DI (생성자 주입)

의존성을 명시적으로 받고 Singleton을 쓰지 않습니다.

```cpp
class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(const char* msg) { (void)msg; }
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

// automatic local wiring: global 초기화 순서와 분리
void application() {
    Logger logger;
    Sensor sensor(logger);
    sensor.read();
}
```

장점은 다음과 같습니다.

- 의존성이 시그니처에 그대로 드러납니다.
- fake logger를 주입해 테스트가 쉽습니다.
- wiring한 객체가 local이고 다른 전역 접근이 없다면 전역 registry 없이 사용할 수 있습니다.
- main 이후 local 순서로 생성하면 비지역 dynamic initialization 의존을 피할 수 있습니다. 전역으로 wiring하면 이 장점이 자동 성립하지 않습니다.

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
    if (auto* logger = ServiceLocator::logger()) logger->log("hello");
    else { /* 미등록 service 처리 */ }
}
```

장점은 다음과 같습니다.

- 의존성 wiring이 가볍습니다.
- 테스트에서 fake를 등록할 수 있습니다.

단점은 다음과 같습니다.

- 여전히 전역이라 Singleton과 거의 같습니다.
- register를 누락하면 nullptr이 되는 순서 의존이 있습니다.
- 사용하는 쪽의 시그니처만 봐서는 어떤 service가 필요한지 알 수 없습니다. 위 `some_function()`이 logger를 쓴다는 사실은 본문을 읽어야 드러납니다.

locator는 global registry라는 의존을 남깁니다. 교체 가능성의 이점과 등록·해제 순서·동시성 비용을 비교하고, 의존성을 드러낼 수 있는 경로는 생성자 주입을 사용합니다.

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

linear한 흐름으로 모든 의존성이 명시됩니다. 위 두 인자 Sensor와 FakeLogger/FakeBus는 이 설계 조각의 별도 interface 구현을 전제로 합니다. 앞의 concrete Logger 예제에 그대로 붙이는 코드는 아니며, 아래 재현 절은 실제 공통 interface와 fake를 완성해 검사합니다. Mock 테스트의 모양은 다음과 같습니다.

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

구체 의존 type이 컴파일 타임에 결정되어 virtual dispatch를 피할 수 있습니다. 단 template 인자로 넣은 타입 자체가 virtual 함수를 가지면 그대로 virtual 호출입니다. arm-none-eabi-g++ 16.2.0 `-Os`로 `read()`를 비교하면 이렇습니다.

| 주입 방식 | `read()`의 `log` 호출 |
| --- | --- |
| `ILogger&` 생성자 주입 | vtable load 2번 + `bx r3` (간접) |
| `Sensor<UartLogger>`, `UartLogger`가 `ILogger` 구현 (final 아님) | vtable load 2번 + `bx r3` (간접) |
| `Sensor<FinalUart>`, `final` 클래스 | `b.w FinalUart::log` (직접) |
| `Sensor<PlainUart>`, virtual 없는 클래스 | `b.w PlainUart::log` (직접) |

`UartLogger`를 더 파생할 수 있으므로 컴파일러는 `Sensor<UartLogger>` 안에서도 실제 타입을 모릅니다. 직접 호출을 원하면 주입할 타입을 `final`로 두거나 interface 상속 없이 만듭니다.

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

sensor.read();   // UartLogger가 final이거나 virtual이 없을 때 직접 호출
```

장점은 다음과 같습니다.

- 주입 타입이 final이거나 virtual이 없으면 직접 호출이 되고, 정의가 보이면 인라인될 수 있습니다.
- 위 표처럼 이 조건을 어기면 virtual 호출이 남습니다.

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
"전역 접근이 편하다"는 이유로 모든 service를 singleton으로 만들면, 테스트마다 전역 상태를 되돌려야 하고 fake로 바꿀 방법이 없습니다. DI를 우선합니다.

### 2. Singleton의 destructor 의존
전원 차단·reset 또는 종료 없는 loop에서는 정상 종료 소멸자를 기대할 수 없습니다. local scope의 RAII 소멸자는 별도이며, 중요 영속화와 하드웨어 안전 처리는 제품 종료·오류 프로토콜로 설계합니다.

### 3. thread-safe 비활성화
```cpp
#pragma push_options
// -fno-threadsafe-statics
static Logger inst;
```

task가 하나여도 ISR이나 재귀 초기화 진입이 있으면 안전하다고 단정할 수 없습니다. 동시 진입이 없다는 초기화 프로토콜을 보장하지 못하면 초기화 동기화 옵션을 유지합니다.

### 4. Construct-On-First-Use의 destructor 순서
C++의 정상 종료에서는 완료된 초기화 순서에 따른 파괴 순서 규칙이 있습니다. 이를 단순 unspecified라고 해석하면 안 됩니다. 이미 파괴된 객체를 다른 소멸자가 재사용하는 의존은 위험하며, reset·전원 차단·비정상 종료에는 정상 종료 소멸자 보장이 적용되지 않습니다.

### 5. Service Locator의 register 순서
register하지 않은 service를 검사 없이 쓰면 null 포인터 역참조입니다. 위 예처럼 `nullptr`을 검사하거나, main의 wiring 순서에서 register를 사용보다 먼저 둡니다.

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

## Static local factory와 객체 수명

다음처럼 create<T,Args...> 안에 static T를 두면 각 template specialization의 최초 인자만 반영됩니다. Container 객체 두 개가 서로 다른 instance를 소유하는 DI container가 아니며, 같은 specialization으로 다시 호출해 새 설정을 적용할 수도 없습니다.

```cpp
template<typename T, typename... Args>
T& create_once(Args&&... args) {
    static T instance(std::forward<Args>(args)...);
    return instance;
}
```

저장 정책과 수명이 필요한 요구를 먼저 정하고, 단순한 main local 객체와 참조로 표현할 수 있으면 명시적으로 wiring합니다. service가 사용자보다 먼저 파괴되거나 locator가 수명이 끝난 객체를 가리키지 않도록 해야 합니다.

## 재현 — Fake 주입과 phantom tag

phantom tag는 값의 runtime kind field를 추가하지 않고 서로 다른 용도를 type으로 구분합니다. 아래 RoleRef는 로깅용 UART와 진단용 UART를 섞지 못하게 하지만 실제 UART를 소유하거나 초기화하지는 않습니다.

```cpp title="di-check.cpp"
#include <cassert>
#include <string>
#include <iostream>
struct ILogger { virtual ~ILogger() = default; virtual void log(const char*) = 0; };
struct FakeLogger : ILogger { std::string last; void log(const char* text) override { last = text; } };
class Sensor {
    ILogger& logger_;
public:
    explicit Sensor(ILogger& logger) : logger_(logger) {}
    void read() { logger_.log("read done"); }
};
struct LoggingTag; struct DiagnosticTag;
template<typename Tag, typename T> struct RoleRef { T& object; };
using LoggingRef = RoleRef<LoggingTag, ILogger>;
using DiagnosticRef = RoleRef<DiagnosticTag, ILogger>;
void write_log(LoggingRef ref) { ref.object.log("tagged"); }
struct Locator {
    inline static ILogger* logger = nullptr;
    static bool try_log(const char* text) {
        if (!logger) return false;
        logger->log(text); return true;
    }
};
int main() {
    assert(!Locator::try_log("unregistered"));
    FakeLogger fake;
    Sensor sensor(fake); sensor.read(); assert(fake.last == "read done");
    Locator::logger = &fake;
    assert(Locator::try_log("registered") && fake.last == "registered");
    Locator::logger = nullptr;
    assert(!Locator::try_log("cleared"));
    write_log(LoggingRef{fake}); assert(fake.last == "tagged");
#ifdef BAD_PHANTOM_TAG
    write_log(DiagnosticRef{fake});
#endif
    std::cout << "fake injection/locator lifetime/phantom tag checks passed\n";
}
```

Homebrew Clang 23.1.5와 g++-16에서 C++17·ASan·UBSan으로 실행해 둘 다 `fake injection/locator lifetime/phantom tag checks passed`를 출력했습니다. `-DBAD_PHANTOM_TAG`는 g++-16에서 `error: could not convert 'DiagnosticRef{...}' from 'RoleRef<DiagnosticTag,[...]>' to 'RoleRef<LoggingTag,[...]>'`로 거부됩니다. concrete Logger를 받던 예제와 다른 Fake를 억지로 섞지 않고, 둘이 같은 ILogger interface를 구현하도록 맞췄습니다. BAD_PHANTOM_TAG는 서로 다른 role type 때문에 컴파일 실패합니다. fake의 std::string 할당은 host 검사 용도이며 no-heap target 구현이라고 주장하지 않습니다.

## 1차 자료와 한계

- [C++ block variable initialization](https://eel.is/c++draft/stmt.dcl) — 최초 진입·동시 초기화·재귀 경계
- [C++ termination](https://eel.is/c++draft/basic.start.term) — 초기화와 정상 종료의 파괴 순서
- [GCC C++ dialect options](https://gcc.gnu.org/onlinedocs/gcc/C_002b_002b-Dialect-Options.html) — thread-safe static guard 옵션

위 실행은 의존성 교체와 수명 경계의 host 기능 검사입니다. hardware singleton 초기화·RTOS/ISR 재진입·board code size를 실행하지 않았으므로 DI가 언제나 더 작거나 빠르다고 결론내리지 않습니다.

## 정리

- 전역 접근·유일성·초기화·소유권을 구분하고 실제 테스트와 수명 비용으로 판단합니다.
- Construct-On-First-Use는 지연 초기화이며, 생성자 주입·template injection·locator는 의존성 접근 방식을 바꿉니다.
- Static DI를 권장합니다. main에서 wiring하고 의존성을 명시합니다.
- Template injection은 주입 타입이 final이거나 virtual이 없을 때 직접 호출이 됩니다(Cortex-M4 `-Os` 측정).
- 진짜 hardware singleton도 interface를 거쳐 DI합니다.
- 객체 그래프가 main에서 한 번 만들어지고 바뀌지 않는 firmware에서는 DI framework 없이 main의 manual wiring으로 충분합니다.

## 관련 항목

- [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code) — Static Init Order Fiasco
- [Part 3-10: 소유권 모델](/blog/embedded/embedded-cpp/part3-10-ownership-model) — DI와 ownership
- [C++ 객체 수명](https://eel.is/c++draft/basic.life) — 주입한 참조와 실제 객체의 수명 계약

## 다음 글 (Part 5 시작)

[Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction) — MMIO를 type-safe하게. Memory-mapped register의 C++ 표현.
