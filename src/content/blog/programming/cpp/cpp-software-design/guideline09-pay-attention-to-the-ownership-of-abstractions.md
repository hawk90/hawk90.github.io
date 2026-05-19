---
title: "가이드라인 9: 추상화의 소유권에 주의하라"
date: 2026-05-02T09:00:00
description: "추상화의 소유는 누가 인터페이스를 정의하느냐의 문제다. high-level이 소유해야 한다는, Dependency Inversion의 핵심."
tags: [C++, Software Design, SOLID, DIP, Architecture]
series: "C++ Software Design"
seriesOrder: 9
draft: true
---

## 왜 이 가이드라인이 중요한가?

```cpp
// 시나리오 — 비즈니스 로직이 데이터베이스에 의존한다
class OrderService {
    PostgresDatabase db_;     // 구체 구현에 의존한다
public:
    void process(Order& o) {
        db_.save(o);
    }
};
```

언뜻 합리적으로 보이지만 **Dependency Inversion**을 위반한 코드다. 이유는 이렇다.

- `OrderService`(high-level 비즈니스)가 `PostgresDatabase`(low-level 인프라)에 의존한다.
- DB를 갈아 끼우려면 `OrderService`까지 손대야 한다.
- DB 모듈을 비즈니스 모듈이 알아야 한다.

질문은 단순하다. **누가 인터페이스를 소유하는가?** `IDatabase`라는 추상이 있다면 그것을 어느 namespace나 어느 모듈에 두느냐다. 답은 **high-level 모듈**(비즈니스 측)이다. DB는 그 인터페이스를 **구현**할 뿐이다.

이것이 **추상화의 소유권(ownership of abstractions)** 이다. 의존성 방향을 결정하는 문제다. Iglberger가 이 가이드라인에서 강조하는 핵심이기도 하다.

## 핵심 내용

- 추상화의 소유권은 누가 인터페이스를 정의하느냐의 문제다.
- High-level 모듈이 소유하고, low-level은 구현만 제공한다.
- **Dependency Inversion Principle(DIP)** — 양쪽 모두 추상화에 의존한다.
- 의존성 방향은 디렉토리, namespace, 모듈 구조에 그대로 반영된다.
- 잘못된 소유는 의존성 방향을 역전시키고 결합도를 키운다.

## 비교 — 잘못된 소유와 올바른 소유

### Bad — 비즈니스가 DB에 의존한다

```cpp
// db/postgres_database.h
namespace db {
    class IDatabase { virtual void save(const Order&) = 0; };     // ⚠️ DB가 인터페이스를 정의
    class PostgresDatabase : public IDatabase { /* ... */ };
}

// business/order_service.h
#include "db/postgres_database.h"     // ⚠️ business → db 의존

namespace business {
    class OrderService {
        db::IDatabase& db_;
    public:
        OrderService(db::IDatabase& db) : db_(db) {}
        void process(Order& o) { db_.save(o); }
    };
}
```

```
의존성 방향:
business ─→ db   (잘못됐다)
```

문제는 다음과 같다.

- 비즈니스가 DB 인터페이스를 위해 db namespace에 의존한다.
- DB 모듈이 바뀌면 비즈니스가 영향을 받는다.
- 비즈니스가 DB의 어휘("save")에 묶인다.

### Good — 비즈니스가 인터페이스를 소유한다

```cpp
// business/order_repository.h
namespace business {
    // 비즈니스가 인터페이스를 비즈니스 어휘로 정의한다
    class IOrderRepository {
    public:
        virtual ~IOrderRepository() = default;
        virtual void persist(const Order&) = 0;      // 비즈니스 용어 "persist"
        virtual std::optional<Order> find_by_id(OrderId) = 0;
    };
}

// business/order_service.h
#include "business/order_repository.h"

namespace business {
    class OrderService {
        IOrderRepository& repo_;
    public:
        OrderService(IOrderRepository& r) : repo_(r) {}
        void process(Order& o) { repo_.persist(o); }
    };
}

// db/postgres_order_repository.h
#include "business/order_repository.h"     // ⚠️ db가 business에 의존한다

namespace db {
    class PostgresOrderRepository : public business::IOrderRepository {
        // 비즈니스 인터페이스를 DB가 구현한다
    public:
        void persist(const Order&) override { /* SQL */ }
        std::optional<Order> find_by_id(OrderId) override { /* SQL */ }
    };
}
```

```
의존성 방향:
business ←── db   (올바르다 — db가 business에 의존한다)
```

비즈니스는 DB가 무엇인지 모른다. DB가 비즈니스 인터페이스를 구현한다.

## Dependency Inversion Principle (DIP)

> "**High-level modules should not depend on low-level modules. Both should depend on abstractions.**"
> "**Abstractions should not depend on details. Details should depend on abstractions.**"

전통적인 잘못된 의존은 이렇게 생겼다.

```
[High-level Policy]    ← 자주 바뀌는 비즈니스
       ↓ depends on
[Low-level Detail]     ← 인프라 (DB, file, API)
```

비즈니스 정책이 인프라에 묶인다. 인프라가 바뀌면 정책이 바뀐다.

DIP를 적용한 모양은 다음과 같다.

```
[High-level Policy]
       ↓
  [Abstraction]    ← 비즈니스가 정의한다
       ↑
[Low-level Detail] ← 인프라가 구현한다
```

양쪽 모두 추상화에 의존한다. 인프라는 정책을 모르고, 정책도 인프라를 모른다. 둘이 합의한 추상 인터페이스만 가운데 있다.

## 소유권의 표지

추상화를 누가 소유하는지는 다음으로 알 수 있다.

### 1) 어디에 정의되어 있나

```cpp
// 잘못된 소유
namespace db {
    class IDatabase { ... };
}

// 올바른 소유
namespace business {
    class IOrderRepository { ... };
}
```

namespace, 모듈, 디렉토리가 소유를 표시한다.

### 2) 어떤 어휘로 표현되어 있나

```cpp
// DB 어휘 — 인프라가 소유한 인터페이스
class IDatabase {
    void execute_sql(const std::string&);     // SQL — DB 용어
    void commit();
};

// 도메인 어휘 — 비즈니스가 소유한 인터페이스
class IOrderRepository {
    void persist(const Order&);                // 도메인 용어
    std::optional<Order> find_by_id(OrderId);
};
```

어휘가 도메인 쪽이면 비즈니스가, 기술 쪽이면 인프라가 소유한다.

### 3) 누구의 변경에 영향을 받나

- 비즈니스 요구가 바뀌면 인터페이스가 진화한다 → 소유자는 비즈니스다.
- DB 종류가 바뀌어도 인터페이스가 영향을 받지 않는다 → 소유자가 비즈니스라는 증거다.

소유자는 인터페이스의 진화 방향을 결정한다.

## Plug-in 패턴

DIP의 자연스러운 결과는 plug-in 아키텍처다.

```
┌────────────────────────────┐
│     Core / Business        │  ← 인터페이스 소유
│   (정책, 비즈니스 로직)     │
└───────────┬────────────────┘
            │ 인터페이스
            ↑
            │
┌───────────┴────────────────┐
│      Plug-ins              │
│  Postgres  MongoDB  File   │  ← 구현 제공
└────────────────────────────┘
```

새 plug-in을 더해도 Core는 손대지 않는다. Core가 명시한 인터페이스만 따르면 어떤 구현도 가능하다.

## 함정 — 인터페이스를 잘못된 쪽에 둔다

```cpp
// db/idatabase.h
namespace db {
    class IDatabase {     // ⚠️ DB가 인터페이스를 소유한다
        virtual void save(const Order&) = 0;
        virtual void load(OrderId) = 0;
    };
}
```

문제는 다음과 같다.

- `Order`가 db namespace에 노출되어야 하는가? 아니면 business에? 의존 방향이 모호하다.
- `IDatabase`의 메서드는 도메인 어휘인가, DB 어휘인가?
- 비즈니스 모듈이 db namespace에 의존하는 잘못된 방향이 만들어진다.

해법은 business namespace로 옮기고 도메인 어휘로 다시 명명하는 것이다.

## 함정 — Anemic Abstraction

```cpp
namespace business {
    class IDatabase {
        virtual void save(const Order&) = 0;     // DB 어휘를 그대로 들고 왔다
        virtual void load(int id) = 0;
    };
}
```

이름은 `business`인데 인터페이스의 어휘는 DB다. **이름만 옮긴** anemic abstraction이다.

진짜 비즈니스 추상화는 다음과 같다.

```cpp
namespace business {
    class IOrderRepository {
        virtual void persist(const Order&) = 0;
        virtual std::optional<Order> find_by_id(OrderId) = 0;
        virtual std::vector<Order> find_by_customer(CustomerId) = 0;
    };
}
```

도메인이 데이터를 어떻게 다루는지를 도메인의 언어로 표현한다. SQL이 아니라 도메인 언어다.

## 함정 — 너무 일반화된 인터페이스

```cpp
namespace business {
    class IRepository {
        virtual void save(void*) = 0;     // ⚠️ 모든 entity?
        virtual void* find(int id) = 0;
    };
}
```

너무 일반적이라 도메인 의미가 사라진다. 타입 안전성도 없다. **도메인 객체별로** 인터페이스를 가른다.

```cpp
namespace business {
    class IOrderRepository { /* ... */ };
    class ICustomerRepository { /* ... */ };
    class IProductRepository { /* ... */ };
}
```

혹은 템플릿으로 묶을 수도 있다.

```cpp
template<typename T>
class IRepository {
    virtual void persist(const T&) = 0;
    virtual std::optional<T> find_by_id(typename T::Id) = 0;
};

class IOrderRepository : public IRepository<Order> { /* 도메인 특화 메서드 추가 */ };
```

## Clean Architecture / Hexagonal Architecture

DIP를 대형으로 적용한 결과가 **Clean Architecture**(Robert Martin)와 **Hexagonal Architecture**(Alistair Cockburn)다.

```
┌─────────────────────────────────────┐
│      Entities (도메인 객체)         │  ← 가장 안쪽
├─────────────────────────────────────┤
│      Use Cases (비즈니스 로직)      │
├─────────────────────────────────────┤
│   Interface Adapters (변환)         │
├─────────────────────────────────────┤
│   Frameworks / Drivers (인프라)     │  ← 가장 바깥
└─────────────────────────────────────┘

의존성: 항상 바깥에서 안쪽으로
```

각 레이어가 자기 추상화를 소유한다. 안쪽 레이어는 바깥을 모르고, 바깥 레이어가 안쪽의 추상을 구현한다.

## 디렉토리와 모듈 구조

코드 구조에 소유권을 그대로 반영한다.

```
project/
├── domain/
│   ├── order.h
│   ├── customer.h
│   └── repositories/
│       ├── iorder_repository.h          ← 도메인이 소유
│       └── icustomer_repository.h
│
├── application/
│   ├── order_service.h                  ← 도메인을 사용
│   └── customer_service.h
│
├── infrastructure/
│   ├── persistence/
│   │   ├── postgres_order_repository.h  ← 도메인 인터페이스를 구현
│   │   └── mongo_order_repository.h
│   └── ...
│
└── main.cpp                              ← 모든 것을 wire up
```

의존성 방향은 이렇다.

```
infrastructure → application → domain
```

domain 모듈은 아무것도 의존하지 않는다. infrastructure는 domain을 의존하되, domain의 **인터페이스만** 의존한다. 구체 클래스는 알지 않는다.

## C++20 modules와 소유권

C++20 `modules`로 소유권을 더 분명히 만들 수 있다.

```cpp
// domain.cppm
export module domain;

export class Order { /* ... */ };
export class IOrderRepository { /* ... */ };

// infrastructure.cppm
export module infrastructure;
import domain;

export class PostgresOrderRepository : public IOrderRepository { /* ... */ };
```

모듈 import 방향이 곧 의존성 방향이다. 잘못된 의존은 컴파일 에러로 막힌다.

## 함정 — 양방향 의존

```cpp
namespace business {
    class IDatabase;     // 전방 선언
    class OrderService { /* IDatabase 사용 */ };
}

namespace db {
    class PostgresDatabase : public business::IDatabase { /* ... */ };
    void utility_function() {
        business::OrderService svc{...};     // ⚠️ db가 business를 사용한다고?
    }
}
```

`business ↔ db` 양방향 의존은 순환 의존이다. 빌드가 어렵고, 추론도 어렵다.

해법은 단방향 의존을 엄격히 지키는 것이다. db는 business를 인터페이스로만 의존한다.

## ABI 경계 — DLL / SO

```cpp
// public_api.h (라이브러리 사용자가 보는 헤더)
class IBusinessService {
public:
    virtual ~IBusinessService() = default;
    virtual void execute(...) = 0;
};

extern "C" IBusinessService* create_service();
```

DLL/SO 경계는 virtual 인터페이스로 격리한다. ABI 안정성을 확보한다. 가이드라인 9를 인프라 차원에 적용한 예다.

## 함정 — Interface Segregation 부족

```cpp
namespace business {
    class IOrderRepository {
        // 메서드가 쉰 개 — 검색, 저장, 통계, 보고 등이 한 인터페이스에
    };
}
```

소유는 business가 맞지만 인터페이스가 뚱뚱하다. ISP 위반이다(가이드라인 3).

```cpp
namespace business {
    class IOrderPersistence { /* 저장 */ };
    class IOrderQuery       { /* 검색 */ };
    class IOrderReporting   { /* 통계 */ };
}
```

책임별로 인터페이스를 가른다. 비즈니스가 모두 소유한다.

## 빌드 시간 — 소유권의 효과

```
잘못된 의존
  domain 헤더가 db 헤더를 include한다
  db.h 한 줄을 수정하면 → domain이 재빌드되고, 그 의존자가 모두 재빌드된다

올바른 의존
  domain 헤더는 자기 인터페이스만 둔다
  db.h를 수정해도 → db 모듈만 재빌드된다
```

코드 구조가 컴파일 시간에 곧장 영향을 준다.

## 함정 — 잘못된 추상화 수준

```cpp
// 너무 낮은 수준
class IDatabase {
    virtual void execute_sql(const std::string&) = 0;   // ⚠️ SQL이 인터페이스에 노출됐다
};
```

이 인터페이스로는 DB가 아닌 다른 저장소(파일, REST API)를 구현하기 어렵다. SQL이 추상화 누수다.

```cpp
// 적절한 수준
class IOrderRepository {
    virtual void persist(const Order&) = 0;
    // DB든 파일이든 REST든 다 구현 가능하다
};
```

## main이 모든 것을 wire up한다

```cpp
// main.cpp
#include "domain/repositories/iorder_repository.h"
#include "application/order_service.h"
#include "infrastructure/persistence/postgres_order_repository.h"

int main() {
    // 인프라 객체를 생성하고
    auto repo = std::make_unique<db::PostgresOrderRepository>(...);

    // 비즈니스 객체에 주입한다
    business::OrderService service{*repo};

    service.process(Order{});
}
```

main이 유일하게 모든 것을 알아도 되는 자리다. composition root다.

## 테스트와 소유권

소유권이 올바르면 테스트가 자연스러워진다.

```cpp
TEST(OrderServiceTest, ...) {
    InMemoryOrderRepository fake_repo;     // 비즈니스 인터페이스를 구현한 fake
    business::OrderService service{fake_repo};

    service.process(Order{...});

    EXPECT_EQ(fake_repo.persisted_orders.size(), 1);
}
```

가이드라인 4(테스트 가능성)와 그대로 연결된다.

## 실무 가이드 — 인터페이스 소유를 결정할 때

새 인터페이스를 정의하기 전에 다음을 짚는다.

1. 누가 이 추상을 정의해야 하는가? (high-level 측)
2. 어떤 어휘로 정의할 것인가? (도메인 vs 기술)
3. 어디에 둘 것인가? (namespace, directory)
4. 누가 변경 권한을 가지는가? (소유자)
5. 누가 구현 책임을 지는가? (low-level 측)

## 실무 가이드 — 체크리스트

- [ ] 인터페이스가 high-level 측에 있는가?
- [ ] 도메인 어휘를 쓰고 있는가?
- [ ] low-level(인프라)이 high-level 인터페이스를 구현하는가?
- [ ] 의존성 방향이 코드 구조(namespace, directory)에 그대로 드러나는가?
- [ ] 인터페이스가 지나치게 일반화되어 있지는 않은가?
- [ ] composition root(main)에서 모든 것을 wire up하는가?

## 정리

추상화의 소유권은 누가 인터페이스를 정의하느냐의 문제다. 답은 **high-level 모듈**이다.

Dependency Inversion Principle을 다시 짚으면 다음과 같다.

- 양쪽 모두 추상화에 의존한다.
- 추상화는 high-level이 소유한다.
- 인프라는 그 인터페이스를 구현한다.

소유의 표지는 세 가지다.

- 어디 namespace에 있는가?
- 어떤 어휘로 표현되어 있는가?
- 누가 진화를 결정하는가?

이것이 Clean Architecture와 Hexagonal Architecture의 핵심이고, 큰 시스템을 떠받치는 디자인 원칙이다.

## 관련 항목

- [가이드라인 1: 디자인의 중요성](/blog/programming/cpp/cpp-software-design/guideline01-understand-the-importance-of-software-design) — 의존성 관리의 본질
- [가이드라인 2: 변화를 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline02-design-for-change) — DIP의 깊은 적용
- [가이드라인 10: 아키텍처 문서](/blog/programming/cpp/cpp-software-design/guideline10-consider-creating-an-architectural-document) — 소유권을 명시한다
- [Beautiful C++ 항목 14: 싱글톤 피하기](/blog/programming/cpp/beautiful-cpp/item14-avoid-singletons) — 의존성 주입
