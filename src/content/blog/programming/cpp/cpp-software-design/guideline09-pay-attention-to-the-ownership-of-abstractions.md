---
title: "가이드라인 9: 추상화의 소유권에 주의하라"
date: 2026-05-13T19:00:00
description: "추상화의 소유 = 누가 인터페이스를 정의하나. high-level이 소유해야 — Dependency Inversion의 핵심."
tags: [C++, Software Design, SOLID, DIP, Architecture]
series: "C++ Software Design"
seriesOrder: 9
---

## 왜 이 가이드라인이 중요한가?

```cpp
// 시나리오 1: 비즈니스 로직이 데이터베이스에 의존
class OrderService {
    PostgresDatabase db_;     // 구체 구현 의존
public:
    void process(Order& o) {
        db_.save(o);
    }
};
```

이 코드 — 보기엔 합리적이지만 **Dependency Inversion**을 위반. 이유:

- `OrderService` (high-level 비즈니스) — `PostgresDatabase` (low-level 인프라)에 의존
- DB 교체 → `OrderService` 수정
- DB 모듈을 — 비즈니스 모듈이 알아야

**누가 인터페이스를 소유하나?** — `IDatabase`라는 추상이 있다면, 그게 누구 namespace / 누구 모듈에 정의되나? 답은 — **high-level 모듈** (비즈니스 측). DB는 그 인터페이스를 **구현**할 뿐.

이게 — **추상화의 소유권** (ownership of abstractions). 의존성 방향을 결정. Iglberger가 이 가이드라인에서 강조하는 핵심.

## 핵심 내용

- 추상화의 **소유권** = 누가 인터페이스를 정의하는가
- **High-level 모듈이 소유** — low-level은 구현만 제공
- **Dependency Inversion Principle**(DIP) — 양쪽 모두 추상화에 의존
- 디렉토리 / namespace / 모듈 — 의존성 방향이 코드 구조에 반영
- 잘못된 소유 → 의존성 방향 역전, 결합도 증가

## 비교 — 잘못된 소유 vs 올바른 소유

### Bad: 비즈니스가 DB에 의존

```cpp
// db/postgres_database.h
namespace db {
    class IDatabase { virtual void save(const Order&) = 0; };     // ⚠️ DB가 인터페이스 정의
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
business ─→ db   (잘못)
```

문제:
- 비즈니스가 DB 인터페이스 — db namespace 의존
- DB 모듈 변경 → 비즈니스 영향
- 비즈니스가 — DB 구현의 어휘 ("save")에 묶임

### Good: 비즈니스가 인터페이스 소유

```cpp
// business/order_repository.h
namespace business {
    // 비즈니스가 인터페이스 정의 — 비즈니스 어휘로
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
#include "business/order_repository.h"     // ⚠️ db가 business 의존

namespace db {
    class PostgresOrderRepository : public business::IOrderRepository {
        // 비즈니스 인터페이스를 — DB가 구현
    public:
        void persist(const Order&) override { /* SQL */ }
        std::optional<Order> find_by_id(OrderId) override { /* SQL */ }
    };
}
```

```
의존성 방향:
business ←── db   (올바름 — db가 business에 의존)
```

비즈니스는 — DB가 무엇인지 모름. DB가 — 비즈니스 인터페이스를 구현.

## Dependency Inversion Principle (DIP)

> "**High-level modules should not depend on low-level modules. Both should depend on abstractions.**"
> "**Abstractions should not depend on details. Details should depend on abstractions.**"

전통적 (잘못된) 의존:

```
[High-level Policy]    ← 자주 변하는 비즈니스
       ↓ depends on
[Low-level Detail]     ← 인프라 (DB, file, API)
```

비즈니스 정책이 — 인프라에 묶임. 인프라 변경 → 정책 변경.

DIP 적용:

```
[High-level Policy]
       ↓
  [Abstraction]    ← 비즈니스가 정의
       ↑
[Low-level Detail] ← 인프라가 구현
```

양쪽 다 — **추상화에 의존**. 인프라가 정책 모름, 정책이 인프라 모름. 둘이 합의한 — 추상 인터페이스만.

## 소유권의 표지

추상화를 **누가 소유**하는지 알 수 있는 방법:

### 1) 어디에 정의되었나?

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

namespace / 모듈 / 디렉토리 — 소유를 표시.

### 2) 어떤 어휘를 사용하나?

```cpp
// DB 어휘 — 인프라가 소유한 인터페이스
class IDatabase {
    void execute_sql(const std::string&);     // SQL — DB 용어
    void commit();
};

// 도메인 어휘 — 비즈니스가 소유
class IOrderRepository {
    void persist(const Order&);                // 도메인 용어
    std::optional<Order> find_by_id(OrderId);
};
```

어휘가 — 도메인 측이면 비즈니스 소유, 기술 측이면 인프라 소유.

### 3) 누구의 변경에 영향받나?

비즈니스 요구 변경 → 인터페이스 진화 (소유자는 비즈니스).
DB 종류 변경 → 인터페이스 영향 X (소유자가 비즈니스).

소유자 = **인터페이스의 진화 방향을 결정**.

## Plug-in 패턴

DIP의 자연스러운 결과 — **plug-in 아키텍처**:

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

새 plug-in 추가 — Core 무수정. Core가 명시한 인터페이스만 따르면 어떤 구현도 가능.

## 함정 — 인터페이스를 잘못된 측에 정의

```cpp
// db/idatabase.h
namespace db {
    class IDatabase {     // ⚠️ DB가 인터페이스 소유
        virtual void save(const Order&) = 0;
        virtual void load(OrderId) = 0;
    };
}
```

문제:
- `Order`가 — db namespace에 노출됨? 또는 business namespace? 의존 방향 모호
- `IDatabase`의 메서드가 — 도메인 어휘인가 DB 어휘인가?
- 비즈니스 모듈이 db namespace 의존 — 잘못된 방향

해결: business namespace로 옮김 + 도메인 어휘로 재명명.

## 함정 — Anemic abstraction

```cpp
namespace business {
    class IDatabase {
        virtual void save(const Order&) = 0;     // DB 어휘 그대로
        virtual void load(int id) = 0;
    };
}
```

이름은 `business`인데 — 인터페이스가 DB 어휘. **이름만 옮긴** anemic abstraction.

진짜 비즈니스 추상화:

```cpp
namespace business {
    class IOrderRepository {
        virtual void persist(const Order&) = 0;
        virtual std::optional<Order> find_by_id(OrderId) = 0;
        virtual std::vector<Order> find_by_customer(CustomerId) = 0;
    };
}
```

도메인이 — **어떻게 데이터를 다루는지** 표현. SQL이 아닌 도메인 언어.

## 함정 — 너무 일반화된 인터페이스

```cpp
namespace business {
    class IRepository {
        virtual void save(void*) = 0;     // ⚠️ 모든 entity?
        virtual void* find(int id) = 0;
    };
}
```

너무 일반 — 도메인 의미 없음. 타입 안전성 X. **각 도메인 객체별로** 인터페이스:

```cpp
namespace business {
    class IOrderRepository { /* ... */ };
    class ICustomerRepository { /* ... */ };
    class IProductRepository { /* ... */ };
}
```

또는 — 템플릿:

```cpp
template<typename T>
class IRepository {
    virtual void persist(const T&) = 0;
    virtual std::optional<T> find_by_id(typename T::Id) = 0;
};

class IOrderRepository : public IRepository<Order> { /* 도메인 특화 메서드 추가 */ };
```

## Clean Architecture / Hexagonal Architecture

DIP의 거대 적용 — **Clean Architecture** (Robert Martin), **Hexagonal Architecture** (Alistair Cockburn).

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

의존성: 항상 바깥 → 안쪽
```

각 레이어가 — **자기 추상화 소유**. 안쪽 레이어는 — 바깥을 모름. 바깥 레이어가 안쪽의 추상을 구현.

## 디렉토리 / 모듈 구조

코드 구조에 — 소유권 반영:

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
│   ├── order_service.h                  ← 도메인 사용
│   └── customer_service.h
│
├── infrastructure/
│   ├── persistence/
│   │   ├── postgres_order_repository.h  ← 도메인 인터페이스 구현
│   │   └── mongo_order_repository.h
│   └── ...
│
└── main.cpp                              ← 모든 것을 wire up
```

의존성:
```
infrastructure → application → domain
```

domain 모듈 — 아무도 의존 안 함. infrastructure는 domain을 의존하지만 — domain의 **인터페이스만**. 구체 클래스 X.

## C++20 modules와 소유권

C++20 `modules`로 — 소유권을 더 명시:

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

모듈 import 방향 — 의존성 방향 명시. 잘못된 의존은 컴파일 에러.

## 함정 — Bidirectional dependency

```cpp
namespace business {
    class IDatabase;     // 전방 선언만
    class OrderService { /* IDatabase 사용 */ };
}

namespace db {
    class PostgresDatabase : public business::IDatabase { /* ... */ };
    void utility_function() {
        business::OrderService svc{...};     // ⚠️ db가 business 사용?
    }
}
```

`business ↔ db` 양방향 의존 — 순환 의존. Build 어려움, 추론 어려움.

해결: **단방향 의존** 엄격히. db는 business를 — 인터페이스로만 의존.

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

DLL/SO 경계 — virtual 인터페이스로 격리. ABI 안정성. 가이드라인 9의 인프라적 적용.

## 함정 — Interface segregation 부족

```cpp
namespace business {
    class IOrderRepository {
        // 50개 메서드 — 검색, 저장, 통계, 보고 등
    };
}
```

소유는 — business이지만, 인터페이스가 뚱뚱. ISP 위반 (가이드라인 3).

해결:

```cpp
namespace business {
    class IOrderPersistence { /* 저장 */ };
    class IOrderQuery       { /* 검색 */ };
    class IOrderReporting   { /* 통계 */ };
}
```

각 책임별로 — 작은 인터페이스. 비즈니스가 모두 소유.

## 빌드 시간 — 소유권의 효과

```
잘못된 의존:
  domain 헤더가 db 헤더 include
  db.h 한 줄 수정 → domain 재빌드 → 모든 의존자 재빌드

올바른 의존:
  domain 헤더는 자기 인터페이스만
  db.h 수정 → db 모듈만 재빌드
```

코드 구조가 — 컴파일 시간에 직접 영향.

## 함정 — 잘못된 인터페이스 추상화 수준

```cpp
// 너무 낮은 수준
class IDatabase {
    virtual void execute_sql(const std::string&) = 0;   // ⚠️ SQL이 인터페이스에
};
```

이 인터페이스 — DB가 아닌 다른 저장소(파일, REST API)를 구현하기 어려움. SQL이 — 추상화 누설.

```cpp
// 적절한 수준
class IOrderRepository {
    virtual void persist(const Order&) = 0;
    // DB든 파일이든 REST든 — 구현
};
```

## 사용 예 — main이 wire up

```cpp
// main.cpp
#include "domain/repositories/iorder_repository.h"
#include "application/order_service.h"
#include "infrastructure/persistence/postgres_order_repository.h"

int main() {
    // 인프라 객체 생성
    auto repo = std::make_unique<db::PostgresOrderRepository>(...);
    
    // 비즈니스 객체에 주입
    business::OrderService service{*repo};
    
    service.process(Order{});
}
```

main 함수가 — 유일하게 모든 것을 알 수 있는 곳. composition root.

## 테스트와 소유권

올바른 소유 → 테스트 자연:

```cpp
TEST(OrderServiceTest, ...) {
    InMemoryOrderRepository fake_repo;     // 비즈니스 인터페이스 구현 (fake)
    business::OrderService service{fake_repo};
    
    service.process(Order{...});
    
    EXPECT_EQ(fake_repo.persisted_orders.size(), 1);
}
```

가이드라인 4 (테스트 가능성)와 직결.

## 실무 가이드 — 인터페이스 소유 결정

새 인터페이스 정의 시:

1. **누가 이 추상을 정의해야 하나?** (high-level 측)
2. **어떤 어휘로?** (도메인 vs 기술)
3. **어디에 둘 것인가?** (namespace, directory)
4. **누가 변경 권한 가지나?** (소유자가)
5. **누가 구현 책임?** (low-level 측)

## 실무 가이드 — 체크리스트

- [ ] 인터페이스가 — high-level 측에 있는가?
- [ ] 도메인 어휘를 사용하는가?
- [ ] low-level (인프라)이 — high-level 인터페이스를 구현하는가?
- [ ] 의존성 방향이 — 코드 구조(namespace, directory)에 반영?
- [ ] 인터페이스가 너무 일반화되지 않았나?
- [ ] composition root(main)에서 wire up?

## 정리

**추상화의 소유권** — 누가 인터페이스를 정의하는가. 답은 — **high-level 모듈**.

**Dependency Inversion Principle**:
- 양쪽 모두 추상화에 의존
- 추상화는 — high-level이 소유
- 인프라는 — 그 인터페이스를 구현

표지:
- **어디 namespace에?**
- **어떤 어휘로?**
- **누가 진화 결정?**

이게 — Clean Architecture, Hexagonal Architecture의 핵심. 큰 시스템의 핵심 디자인 원칙.

## 관련 항목

- [가이드라인 1: 디자인의 중요성](/blog/programming/cpp/cpp-software-design/guideline01-understand-the-importance-of-software-design) — 의존성 관리의 본질
- [가이드라인 2: 변화를 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline02-design-for-change) — DIP의 깊은 적용
- [가이드라인 10: 아키텍처 문서](/blog/programming/cpp/cpp-software-design/guideline10-consider-creating-an-architectural-document) — 소유권 명시
- [Beautiful C++ 항목 14: 싱글톤 피하기](/blog/programming/cpp/beautiful-cpp/item14-avoid-singletons) — 의존성 주입
