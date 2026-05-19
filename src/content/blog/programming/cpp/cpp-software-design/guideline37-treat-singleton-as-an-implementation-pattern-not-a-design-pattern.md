---
title: "가이드라인 37: Singleton을 디자인 패턴이 아닌 구현 패턴으로 다루어라"
date: 2026-05-02T13:00:00
description: "Singleton은 디자인 패턴인가 안티패턴인가. 글로벌 상태의 본질과 의존성 추상화로의 분리를 짚어 본다."
tags: [C++, Software Design, Singleton, Anti-pattern]
series: "C++ Software Design"
seriesOrder: 37
draft: true
---

## 왜 이 가이드라인이 중요한가?

GoF의 Singleton은 23개 패턴 가운데 **가장 논란이 큰** 항목이다.

```cpp
class Logger {
    static Logger& instance() {
        static Logger inst;
        return inst;
    }
};

Logger::instance().log("...");
```

흔히 나오는 반응은 두 갈래다.

- "당연한 패턴이다" (전통적인 OO 시각)
- "안티패턴이다" (의존성·테스트 시각)

Iglberger의 입장은 **둘 다 맞다, 그래서 조심해야 한다**이다.

- 디자인 패턴이란 문제를 풀고 변경에 대비하기 위한 도구다
- Singleton은 글로벌 상태를 강제해 변경에 적대적이다

그래서 Singleton을 **구현 패턴**(implementation pattern)으로 다시 분류하자고 제안한다. 디자인이 아니라 "**인스턴스는 하나**"라는 기술적 사실의 표현으로 보는 것이다.

## 디자인 패턴 vs 구현 패턴

| | 디자인 패턴 | 구현 패턴 |
|---|---|---|
| 의도 | 변경 격리, 의존 관리 | 기술적 제약 표현 |
| 예 | Strategy, Visitor, Bridge | Pimpl, NVI, RAII |
| 결정 시점 | 설계 | 구현 |

Iglberger는 Singleton을 후자로 본다. 인스턴스가 하나라는 결정은 기술적인 사실이며 디자인 차원의 문제가 아니라는 관점이다.

## 핵심 문제 — 글로벌 상태

```cpp
class Database {
    static Database& instance() {
        static Database db;
        return db;
    }
    void save(const Record&);
};

// 사용 코드
void process_user(User u) {
    Database::instance().save(u.toRecord());
}
```

문제는 다음과 같다.

- `process_user`가 Database에 **숨겨진 의존성**을 가진다
- 함수 시그니처만 봐서는 의존성이 보이지 않는다
- 테스트할 때 Mock을 주입하기 어렵다
- 멀티스레드 환경에서는 락이 필요하다
- 초기화 순서 fiasco가 발생할 수 있다

이것이 디자인 차원의 문제다. Singleton 메커니즘 자체가 아니라 **글로벌 접근이라는 본질**이 문제다.

## 안티패턴 시각

```cpp
// 보이지 않는 의존성
void process() {
    Logger::instance().log("...");                  // 의존
    Database::instance().query("...");              // 의존
    Config::instance().get("...");                  // 의존
    EventBus::instance().publish("...");            // 의존
}

// 시그니처만 보면 의존성이 없는 것처럼 보인다
void process();
```

- 의존성 그래프가 코드를 읽지 않으면 드러나지 않는다
- 테스트할 때 어떤 글로벌이 영향을 주는지 알기 어렵다
- 변경이 어디에 파급되는지 추적이 까다롭다

디자인의 본질은 가이드라인 1과 9에서 강조했듯이 **의존성 관리**다. Singleton은 그 의존성을 숨긴다.

## 정당화 시도 — "유일성"

```
"Database는 진짜 하나야"
"Logger도 하나야"
```

이런 정당화에는 반박이 있다.

- 테스트에서는 격리된 Database가 필요할 수 있다
- 멀티 인스턴스가 미래 요구로 나타날 수 있다
- "유일성"이 진짜 불변인지, 우연인지 구분이 필요하다

Iglberger의 지적대로 **유일성은 보통 가정이다**. 신중히 검토해야 한다.

## 더 큰 문제 — 변경에 적대적

```cpp
class Logger {
    static Logger& instance() { static Logger l; return l; }
};

// 모든 사용처에서 Logger::instance()
```

다음과 같은 변경 시나리오를 생각해 보자.

- Logger 구현을 다른 것으로 바꾸려면 모든 호출처를 수정해야 한다
- 두 Logger를 동시에 쓰고 싶다면 (테스트나 다른 환경) 패턴 자체와 충돌한다
- Mock으로 교체하기 어렵다

디자인 패턴은 **변경을 격리**하는 게 목적이다. Singleton은 그와 반대로 변경에 강하게 결합한다.

## Singleton의 진짜 의도 — 유일성 vs 글로벌 접근

GoF Singleton은 두 가지를 한 묶음으로 다룬다.

1. 한 인스턴스만 존재한다 (유일성)
2. 어디서나 접근할 수 있다 (글로벌 접근)

이 둘을 분리해서 보면 다음과 같다.

- 유일성은 정당한 요구일 수 있다
- 글로벌 접근은 거의 항상 잘못이다

```cpp
// 유일성만 — 글로벌 접근은 없다
class Database {
public:
    Database() = default;
    // 누가 인스턴스화? 한 곳에서만 한다
};

// main 또는 composition root에서 한 번만 만든다
auto db = std::make_unique<Database>();
// 다른 클래스는 의존성 주입(DI)으로 받는다
class UserService {
    Database* db_;
public:
    UserService(Database* db) : db_(db) {}
};
```

**의존성 주입**은 Singleton의 "안티"가 아니라 **정상적인 디자인**이다. Singleton은 의존성을 게으르게 처리한 결과일 뿐이다.

## DI로 분리하기

```cpp
// Singleton 방식
class UserService {
    void create(User u) {
        Logger::instance().log("creating user");
        Database::instance().save(u);
    }
};

// DI 방식
class UserService {
    Logger& logger_;
    Database& db_;
public:
    UserService(Logger& l, Database& db) : logger_(l), db_(db) {}
    
    void create(User u) {
        logger_.log("creating user");
        db_.save(u);
    }
};
```

효과는 다음과 같다.

- 의존성이 시그니처에 명시된다
- 테스트할 때 Mock을 주입할 수 있다
- 다른 인스턴스도 자유롭게 쓸 수 있다

## 함수형 시각 — pure function

```cpp
// 글로벌 의존
void process(User u) {
    Logger::instance().log("...");        // 사이드 이펙트
}

// 명시적 의존
void process(User u, Logger& l) {
    l.log("...");        // 의존성이 시그니처에 드러난다
}
```

함수 시그니처가 의존성을 보여 주는 코드는 추론하기 쉽다.

## C++의 Singleton 구현 — Meyers' Singleton

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger inst;        // C++11 — magic statics로 thread-safe
        return inst;
    }
    
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
    
private:
    Logger() = default;
};
```

장점은 다음과 같다.

- C++11 이상에서 thread-safe하다
- 지연 초기화가 된다
- 소멸 순서가 깔끔하다 (역순)

기술적으로는 우수하다. 다만 디자인 차원의 문제는 그대로 남는다.

## 모던 변형 — 의존성 그래프를 명시한다

```cpp
// composition root — main 가까이
int main() {
    Logger logger;
    Database db;
    EventBus bus;
    
    UserService user_svc{logger, db, bus};
    OrderService order_svc{logger, db, bus};
    
    Application app{user_svc, order_svc};
    app.run();
}
```

효과는 다음과 같다.

- 의존성 그래프가 main에서 한눈에 보인다
- 테스트할 때 main 대신 다른 grouping으로 구성할 수 있다
- 인스턴스를 여러 개 갖는 것도 자유롭다

DI 컨테이너(Boost.DI 등)도 선택지지만, 가독성과 마법 사이의 트레이드오프가 있다.

## 함정 — Static Initialization Order Fiasco

```cpp
// 파일 A
class Logger { static Logger& instance() { ... } };

// 파일 B
Logger& g_logger = Logger::instance();    // namespace scope — 초기화 순서가 보장되지 않는다
                                          // Logger보다 먼저 초기화되면 미정의 동작이다
```

전역 변수와 다른 TU의 Singleton이 얽히면 위험하다. Meyers' Singleton의 lazy init이 이 문제를 어느 정도 완화한다.

## 함정 — 멀티스레드 + lazy

C++11 이전에는 다음과 같은 구현이 흔했다.

```cpp
static Logger& instance() {
    static Logger* inst = nullptr;
    if (!inst) {                            // 경쟁 조건
        std::lock_guard l(mutex);
        if (!inst) {
            inst = new Logger;
        }
    }
    return *inst;
}
```

Double-checked locking은 C++11 이전에는 이론적으로 깨질 수 있었다. C++11에서 magic statics가 도입되면서 해결됐다.

## 함정 — Singleton + 상태 변경

```cpp
class Config {
    int level_;
public:
    static Config& instance() { ... }
    void setLevel(int l) { level_ = l; }
    int level() const { return level_; }
};

// 테스트 1 — level을 3으로 설정한다
// 테스트 2 — level이 0이라고 가정하고 실패한다
// → 테스트 간 의존성이 생긴다
```

글로벌 mutable 상태는 테스트의 적이다. 격리가 어렵다.

## Static factory와의 혼동

```cpp
// Singleton
class Logger {
    static Logger& instance() { static Logger l; return l; }
};

// Static factory — 다르다
class Logger {
public:
    static std::unique_ptr<Logger> create() {
        return std::make_unique<Logger>();
    }
};
```

후자는 호출할 때마다 새 인스턴스를 반환한다. 단순 생성자의 대안일 뿐 Singleton이 아니다.

## Pragmatic — 언제 받아들일까

Singleton이 정당화될 수 있는 경우는 다음과 같다.

- 진정한 자원 (`std::cout` 자체가 일종이다)
- 디자인을 단순화하고 싶을 때 (작은 도구, 짧은 수명)
- 라이브러리 인터페이스에서 사용자가 인스턴스화를 신경 쓰지 않도록 할 때
- 지연 초기화의 가치가 분명한 성능 요구

다만 이런 경우에도 **명시적인 의존성 주입이 가능하다면 그쪽을 우선**한다.

## 실무 가이드 — 결정 트리

```
"하나만 있어야 한다"는 요구를 받았을 때
├── 진짜 유일한가? (테스트, 다른 환경 등)
│   ├── 예 → 그래도 DI로 분리 — Singleton 회피
│   └── 아니오 (가정) → 일반 객체로 시작
├── 글로벌 접근이 정말 필요한가?
│   ├── 예 → composition root에서 인스턴스화 + 의존 주입
│   └── 아니오 → 일반 객체
└── 진정한 자원인가? (std::cout 수준)
    └── 예 → Meyers' Singleton 검토
```

## 실무 가이드 — 체크리스트

- [ ] 유일성이 진짜인가, 가정인가?
- [ ] 글로벌 접근이 정말 필요한가? DI 대안을 검토했는가?
- [ ] 의존성을 명시적으로 주입할 수 있는가?
- [ ] 테스트에서 Mock 주입은 어떻게 할 것인가?
- [ ] 멀티스레드 환경의 락이나 atomic을 검토했는가?
- [ ] 초기화 순서 fiasco를 피할 방법이 있는가?

## 핵심 정리

1. **Singleton**은 디자인 패턴이 아니라 구현 패턴이라는 게 Iglberger의 관점이다
2. **두 책임** — 유일성과 글로벌 접근을 분리해야 한다
3. **글로벌 접근**은 보통 안티패턴이다 (의존성 숨김, 변경 적대)
4. **DI로 대체**하면 의존성이 명시되고 테스트가 쉬워진다
5. **Composition root**에서 의존성 그래프를 구성한다
6. **Meyers' Singleton**은 구현은 깔끔하지만 디자인 문제는 별개다
7. 정 써야 한다면 어떻게 디자인할지는 다음 가이드라인에서 다룬다

## 관련 항목

- [GoF Singleton](/blog/programming/design/gof-design-patterns/item04-singleton) — GoF 측면
- [가이드라인 38: Singleton 디자인](/blog/programming/cpp/cpp-software-design/guideline38-design-singletons-for-change-and-testability) — 정 써야 할 때
- [가이드라인 9: Ownership of Abstractions](/blog/programming/cpp/cpp-software-design/guideline09-pay-attention-to-the-ownership-of-abstractions) — DIP
- [가이드라인 4: Design for Testability](/blog/programming/cpp/cpp-software-design/guideline04-design-for-testability) — Mock 주입
