---
title: "가이드라인 37: Singleton을 디자인 패턴이 아닌 구현 패턴으로 다루어라"
date: 2026-05-15T08:00:00
description: "Singleton — 디자인 패턴인가 안티패턴인가. 글로벌 상태의 본질, 의존성 추상화로의 분리."
tags: [C++, Software Design, Singleton, Anti-pattern]
series: "C++ Software Design"
seriesOrder: 37
---

## 왜 이 가이드라인이 중요한가?

GoF의 Singleton — 23 패턴 중 가장 **논란이 큰** 패턴.

```cpp
class Logger {
    static Logger& instance() {
        static Logger inst;
        return inst;
    }
};

Logger::instance().log("...");
```

흔한 반응:
- "당연한 패턴" (전통 OO 시각)
- "안티패턴" (의존성 / 테스트 시각)

Iglberger의 입장 — **양쪽 다 맞음, 조심해야**:

- 디자인 패턴 = 문제 해결 / 변경에 대비
- Singleton = 글로벌 상태 제약 = 변경에 적대적

**구현 패턴**(implementation pattern)으로 — 분류 재고. 디자인이 아닌 — "**한 인스턴스만**"이라는 기술적 사실의 표현.

## 디자인 패턴 vs 구현 패턴

| | 디자인 패턴 | 구현 패턴 |
|---|---|---|
| 의도 | 변경 격리, 의존 관리 | 기술적 제약 표현 |
| 예 | Strategy, Visitor, Bridge | Pimpl, NVI, RAII |
| 결정 시점 | 설계 | 구현 |

Iglberger — **Singleton은 후자**. 인스턴스가 하나라는 기술 결정 — 디자인 차원은 아님.

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

**문제**:
- `process_user` — Database에 **숨겨진 의존성**
- 함수 시그니처 — 의존성 안 보임
- 테스트 — Mock 주입 어려움
- 멀티스레드 — 락 필요
- 초기화 순서 — fiasco

이게 디자인 문제. Singleton의 메커니즘 자체가 아니라 — **글로벌 접근의 본질**.

## 안티패턴 시각

```cpp
// 보이지 않는 의존성
void process() {
    Logger::instance().log("...");                // 의존
    Database::instance().query("...");             // 의존
    Config::instance().get("...");                  // 의존
    EventBus::instance().publish("...");            // 의존
}

// 시그니처 — 의존 없어 보임
void process();
```

- 의존성 그래프 — 코드 읽지 않으면 모름
- 테스트 — 어떤 글로벌이 영향?
- 변경 — 어디 영향 가는지 추적 어려움

**디자인의 본질 = 의존성 관리**(가이드라인 1, 9). Singleton — 의존성 숨김.

## 정당화 시도 — "유일성"

```
"Database는 진짜 하나야"
"Logger도 하나야"
```

**반박**:
- 테스트 — 격리된 Database 필요
- 멀티 인스턴스 — 미래 요구사항 가능
- "유일성" — 진짜 불변 / 우연?

Iglberger — **유일성은 보통 가정**. 신중히 검토.

## 더 큰 문제 — 변경 적대

```cpp
class Logger {
    static Logger& instance() { static Logger l; return l; }
};

// 모든 사용처에서 Logger::instance()
```

**변경 시나리오**:
- 다른 Logger 구현으로 — 모든 호출처 수정
- 두 Logger 동시 사용 (테스트, 다른 환경) — 패턴 자체와 충돌
- Mock으로 교체 — 어려움

디자인 패턴은 **변경 격리**가 목적. Singleton — 변경 강력 결합.

## Singleton의 진짜 의도 — 유일성 vs 글로벌 접근

GoF Singleton — 두 가지를 묶음:
1. 한 인스턴스만 존재 (유일성)
2. 어디서나 접근 가능 (글로벌 접근)

**분리**:
- 유일성 — 정당한 요구일 수 있음
- 글로벌 접근 — 거의 항상 잘못

```cpp
// 유일성만 — 글로벌 접근 X
class Database {
public:
    Database() = default;
    // 누가 인스턴스화? — 한 곳에서만
};

// main 또는 composition root에서 한 번
auto db = std::make_unique<Database>();
// 다른 클래스 — 의존성 주입 (DI)
class UserService {
    Database* db_;
public:
    UserService(Database* db) : db_(db) {}
};
```

**의존성 주입** — Singleton의 "안티"가 아님. **정상적인 디자인**. Singleton은 — 게으른 의존성 처리.

## DI로 분리

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

**효과**:
- 의존성 명시 — 시그니처에
- 테스트 — Mock 주입
- 다른 인스턴스 — 자유

## 함수형 시각 — pure function

```cpp
// 글로벌 의존
void process(User u) {
    Logger::instance().log("...");        // 사이드 이펙트
}

// 명시
void process(User u, Logger& l) {
    l.log("...");        // 의존성 가시
}
```

함수 시그니처 — 의존성 명시. 추론 가능한 코드.

## C++의 Singleton 구현 — Meyers' Singleton

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger inst;        // C++11 — thread-safe (magic statics)
        return inst;
    }
    
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
    
private:
    Logger() = default;
};
```

**장점**:
- thread-safe (C++11+)
- 지연 초기화
- 깨끗한 소멸 순서 (역순)

기술적으론 우수. 그러나 — 디자인 문제는 그대로.

## 모던 변형 — 의존성 그래프 명시

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

**효과**:
- 의존성 그래프 — main에서 한눈에
- 테스트 — main 대신 다른 grouping
- 인스턴스 다수 — 자유

DI 컨테이너(Boost.DI 등)도 옵션. 그러나 가독성 vs 마법.

## 함정 — Static Initialization Order Fiasco

```cpp
// 파일 A
class Logger { static Logger& instance() { ... } };

// 파일 B
Logger& g_logger = Logger::instance();    // namespace scope — 초기화 순서 보장 X
                                          // Logger보다 먼저 초기화될 수 있음 → 미정의 동작
```

global 변수 + 다른 TU의 Singleton — 위험. Meyers' Singleton의 lazy init이 일부 완화.

## 함정 — 멀티스레드 + lazy

C++11 이전:

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

Double-checked locking — C++11 이전에 깨짐 (이론적). C++11 — magic statics로 해결.

## 함정 — Singleton + 상태 변경

```cpp
class Config {
    int level_;
public:
    static Config& instance() { ... }
    void setLevel(int l) { level_ = l; }
    int level() const { return level_; }
};

// 테스트 1 — level 3로 설정
// 테스트 2 — level 0 가정, 실패
// → 테스트 간 의존성 발생
```

글로벌 mutable 상태 — 테스트의 적. 격리 어려움.

## Static factory와의 혼동

```cpp
// Singleton
class Logger {
    static Logger& instance() { static Logger l; return l; }
};

// Static factory — 다름
class Logger {
public:
    static std::unique_ptr<Logger> create() {
        return std::make_unique<Logger>();
    }
};
```

후자 — 매번 새 인스턴스. 단순 ctor 대안. Singleton 아님.

## Pragmatic — 언제 받아들이나

**Singleton 정당화 가능한 경우**:
- 진정한 자원 (예: 표준 출력 — std::cout 자체가 일종)
- 디자인 단순화 (작은 도구, 짧은 수명)
- 라이브러리 인터페이스 (사용자가 인스턴스화 신경 안 쓰게)
- 성능 (지연 초기화 가치)

**그러나** — 위 모든 경우도, **명시적 의존 주입이 가능하면 우선**.

## 실무 가이드 — 결정 트리

```
"하나만 있어야 한다" 요구 받음
├── 진짜 유일한가? (테스트, 다른 환경 등)
│   ├── 예 → 그래도 DI로 분리 — Singleton 회피
│   └── 아니오 (가정) → 일반 객체로 시작
├── 글로벌 접근 정말 필요한가?
│   ├── 예 → composition root에서 인스턴스 + 의존 주입
│   └── 아니오 → 일반 객체
└── 진정한 자원 (std::cout 수준)?
    └── 예 → Meyers' Singleton 검토
```

## 실무 가이드 — 체크리스트

- [ ] 유일성 — 진짜인가, 가정인가?
- [ ] 글로벌 접근 — 정말 필요? DI 대안 검토?
- [ ] 의존성 — 명시적 주입이 가능?
- [ ] 테스트 — Mock 주입 어떻게?
- [ ] 멀티스레드 — 락 / atomic 검토?
- [ ] 초기화 순서 — fiasco 회피?

## 핵심 정리

1. **Singleton** — 디자인 패턴 아닌 구현 패턴 (Iglberger)
2. **두 책임** — 유일성 + 글로벌 접근 — 분리해야
3. **글로벌 접근** — 보통 안티패턴 (의존성 숨김, 변경 적대)
4. **DI로 대체** — 의존성 명시, 테스트 용이
5. **Composition root** — main 근처에서 그래프 구성
6. **Meyers' Singleton** — 구현은 깔끔, 디자인은 별개
7. **다음 가이드라인** — 정 Singleton 쓴다면 어떻게 디자인할지

## 관련 항목

- [GoF Singleton](/blog/programming/gof-design-patterns/item04-singleton) — GoF 측면
- [가이드라인 38: Singleton 디자인](/blog/programming/cpp-software-design/guideline38-design-singletons-for-change-and-testability) — 정 쓸 거면
- [가이드라인 9: Ownership of Abstractions](/blog/programming/cpp-software-design/guideline09-pay-attention-to-the-ownership-of-abstractions) — DIP
- [가이드라인 4: Design for Testability](/blog/programming/cpp-software-design/guideline04-design-for-testability) — Mock 주입
