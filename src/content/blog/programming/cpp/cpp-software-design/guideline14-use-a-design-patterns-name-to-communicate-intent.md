---
title: "가이드라인 14: 패턴 이름을 의도 전달에 사용하라"
date: 2026-05-14T10:00:00
description: "이름이 어휘 — Strategy / Observer / Factory가 코드에 드러나면 의도가 즉시 전달. 패턴 인식의 정점."
tags: [C++, Software Design, Naming, Communication]
series: "C++ Software Design"
seriesOrder: 14
---

## 왜 이 가이드라인이 중요한가?

```cpp
class SortHelper { /* ... */ };           // 의미 없는 이름
class SortStrategy { /* ... */ };          // 패턴 이름 — 의도 즉시 전달
class SortByLength { /* ... */ };          // 도메인 이름 + 패턴 의도
```

이름은 — 코드의 **첫 문서**. 좋은 이름이 — 주석 100줄보다 효과적. 패턴 이름이 — 디자인 의도를 한 단어로:

- `SortStrategy` → "다른 정렬 알고리즘으로 교체 가능"
- `EventObserver` → "이벤트를 구독"
- `ConfigBuilder` → "복잡한 설정을 단계적 구성"
- `WidgetFactory` → "Widget 생성 위임"

이 가이드라인 — 패턴 어휘를 **이름으로 명시**하는 원칙.

## 핵심 내용

- 패턴 이름이 — 코드에 드러나면 의도가 즉시 전달
- 표준 패턴 이름 사용 — 팀 / 커뮤니티 공유 어휘
- **이름 = 도메인 + 패턴**의 결합이 이상적 (`OrderRepository`, `PaymentStrategy`)
- 잘못된 이름 — 디자인을 가림
- ADR 문서와 함께 — 코드 + 문서 양쪽에 패턴 명시

## 비교 — 의미 없는 이름 vs 패턴 이름

### Bad: 의미 없음

```cpp
class XYZManager { /* ... */ };
class XYZHelper { /* ... */ };
class XYZUtility { /* ... */ };
class XYZProcessor { /* ... */ };
class XYZHandler { /* ... */ };
```

"Manager", "Helper", "Utility", "Handler", "Processor" — **거의 의미 없는 이름**. 무엇을 하는지 보려면 코드를 다 읽어야.

특히 "Manager" — Java/C# 영향. C++에서도 흔하지만 — 책임이 불명확한 신호.

### Good: 패턴 + 도메인 명시

```cpp
class PaymentStrategy { /* ... */ };        // 패턴 (Strategy)
class OrderObserver { /* ... */ };           // 패턴 (Observer)
class UserRepository { /* ... */ };          // 패턴 (Repository)
class HttpRequestBuilder { /* ... */ };      // 패턴 (Builder)
class ImageDecorator { /* ... */ };          // 패턴 (Decorator)
class LoggerProxy { /* ... */ };             // 패턴 (Proxy)
```

이름만 봐도 — 디자인 의도. 문서 안 봐도 OK.

## 표준 패턴 이름

GoF + 모던 패턴 — 표준 어휘:

| 패턴 | 이름 사용 예 |
| --- | --- |
| Strategy | `SortStrategy`, `CompressionStrategy` |
| Factory | `WidgetFactory`, `ConnectionFactory` |
| Builder | `RequestBuilder`, `ConfigBuilder` |
| Observer | `EventObserver`, `StateObserver` |
| Subject | `EventSubject`, `EventBus` |
| Visitor | `ASTVisitor`, `ShapeVisitor` |
| Adapter | `IteratorAdapter`, `StreamAdapter` |
| Decorator | `LoggingDecorator`, `CachingDecorator` |
| Proxy | `RemoteProxy`, `LazyProxy` |
| Singleton | `~~Manager~~` (안티) |
| Repository | `UserRepository`, `OrderRepository` |
| Service | `OrderService`, `PaymentService` |
| Controller | `OrderController` (Web) |
| Command | `UndoCommand`, `SaveCommand` |
| State | `IdleState`, `RunningState` |
| Iterator | (보통 표준 사용) |

## "수식어 + 패턴" 패턴

이름 형식:

```
[도메인] + [패턴]
[도메인] + [수식어] + [패턴]
```

예:

```cpp
class UserRepository                   // 도메인 + 패턴
class PostgresUserRepository           // 도메인 + 수식어 + 패턴
class CachingUserRepository            // 수식어 + 도메인 + 패턴
class HttpRequestBuilder               // 도메인 + 패턴
class JsonRequestBuilder
```

이름이 — **도메인 의미 + 디자인 의도** 모두 전달.

## 인터페이스 vs 구현 — 명명

```cpp
// 인터페이스 — 추상
class ILogger { /* virtual */ };
class IRepository { /* virtual */ };

// 또는 prefix 없이 (C++ 컨벤션)
class Logger;     // abstract
class Repository;

// 구현 — 구체
class FileLogger : public Logger { /* ... */ };
class StdoutLogger : public Logger { /* ... */ };
class PostgresRepository : public Repository { /* ... */ };
```

C++ 커뮤니티 — `I` prefix 사용 빈도가 Java/C#보다 낮음. 대신 — 구체 클래스에 명시(`FileLogger`, `PostgresRepository`).

## 패턴 이름의 어휘 — 5가지

### 1) 변형(variant)에 패턴 이름 묶음

```cpp
// 옵션 A: prefix
class SortStrategy { virtual void sort(...) = 0; };
class QuickSortStrategy : public SortStrategy { };
class MergeSortStrategy : public SortStrategy { };
class HeapSortStrategy : public SortStrategy { };

// 옵션 B: 그냥 도메인 (Strategy 패턴은 명시적 X)
class QuickSort { };
class MergeSort { };
class HeapSort { };
```

옵션 A — 패턴 명시. 옵션 B — 도메인만. 도메인 코드에는 옵션 B가 보통 적절(`std::sort`도 그냥 Comparator).

### 2) Factory의 이름

```cpp
class WidgetFactory {
public:
    virtual std::unique_ptr<Widget> create() = 0;     // "create" 표준
};

class StandardWidgetFactory : public WidgetFactory { };
class PremiumWidgetFactory : public WidgetFactory { };

// 또는 함수형 Factory
auto factory = []() { return std::make_unique<Widget>(); };
```

`create()`, `make_*` — Factory 표준 어휘.

### 3) Observer의 이름

```cpp
class EventBus {     // Subject
    std::vector<EventObserver*> observers_;
public:
    void subscribe(EventObserver*);     // 또는 attach, add_listener
    void unsubscribe(EventObserver*);   // 또는 detach, remove_listener
    void publish(Event);                // 또는 notify, dispatch
};

class EventObserver {
public:
    virtual void on_event(Event) = 0;     // 또는 update, handle
};
```

`subscribe / publish` — 모던 Observer 어휘. `attach / notify` — GoF 원본.

### 4) Builder의 이름

```cpp
class HttpRequestBuilder {
public:
    HttpRequestBuilder& method(...);
    HttpRequestBuilder& url(...);
    HttpRequestBuilder& header(...);
    HttpRequest         build();          // 표준 "build"
};
```

`build()` — Builder 표준 종료 메서드.

### 5) Strategy의 이름

```cpp
class CompressionStrategy {
public:
    virtual std::vector<std::byte> compress(...) = 0;
};

class GzipCompression : public CompressionStrategy { };
class ZstdCompression : public CompressionStrategy { };
```

도메인 단어 — `Gzip`, `Zstd`. 패턴 이름 — 인터페이스에.

## 안티패턴 이름

피해야 할 이름:

### 1) `Manager` — 책임 불명

```cpp
class UserManager { /* ... */ };
```

UserManager가 — 무엇을 하나? CRUD? 검증? 알림? 통계? 모두? 책임이 불명확.

대안:

```cpp
class UserRepository { /* CRUD */ };
class UserAuthenticator { /* 인증 */ };
class UserNotifier { /* 알림 */ };
```

SRP 적용 — 각 클래스가 한 책임.

### 2) `Util`, `Helper` — junk drawer

```cpp
class StringUtil {
    static std::string trim(...);
    static std::string upper(...);
    static int parse_int(...);
    // 무관한 정적 메서드 가득
};
```

Util 클래스 — 자주 SRP 위반의 신호. **자유 함수**가 더 적절:

```cpp
namespace string_ops {
    std::string trim(std::string_view);
    std::string upper(std::string_view);
}

namespace parsing {
    std::optional<int> parse_int(std::string_view);
}
```

### 3) `Handler`, `Processor` — 모호

```cpp
class OrderHandler { /* ... */ };
class OrderProcessor { /* ... */ };
```

"무엇을 처리?" — 보기 전엔 모름.

대안 — 동사 명시:

```cpp
class OrderValidator { /* 검증 */ };
class OrderSubmitter { /* 제출 */ };
class OrderFulfiller { /* 이행 */ };
```

각 클래스가 — 명확한 책임.

### 4) `Data`, `Info` — 의미 없음

```cpp
class UserData { /* ... */ };
class UserInfo { /* ... */ };
```

"Data of what? Info about what?" — 자명. 그냥 `User`로.

```cpp
class User { /* ... */ };
```

### 5) `Base`, `Abstract` prefix

```cpp
class BaseWidget { virtual void draw() = 0; };
class AbstractShape { virtual double area() = 0; };
```

C++ 컨벤션 — `Base` / `Abstract` prefix 안 씀. derived가 — `Widget`, `Shape` 같이 일반 이름. 추상은 — pure virtual로 표시.

```cpp
class Shape {     // 추상 — 이름에 표시 안 함
    virtual double area() = 0;
};

class Circle : public Shape { /* ... */ };
```

## 클래스 이름 vs 함수 이름

```cpp
// 클래스 = 명사
class OrderRepository { };
class PaymentStrategy { };
class HttpRequest { };

// 함수 = 동사
void save_order(...);
double calculate_discount(...);
bool is_valid(...);
```

표준 컨벤션. 메서드도 동사:

```cpp
class Order {
public:
    void place();        // 동사
    void cancel();
    double total() const;
    bool is_pending() const;
};
```

## 함수형 패턴의 이름

```cpp
// std::function 기반 Strategy — 클래스 안 만들고 함수
using PriceCalculator = std::function<double(const Order&)>;

PriceCalculator standard = [](const Order& o) { return o.subtotal(); };
PriceCalculator with_tax = [](const Order& o) { return o.subtotal() * 1.1; };
PriceCalculator with_discount = [](const Order& o) {
    return o.subtotal() * 0.9;
};
```

`using` alias로 — 함수형 패턴에도 이름. 도메인 의도 전달.

## 패턴 이름과 ADR

가이드라인 10 (ADR)과 결합:

```markdown
# ADR-007: Use Strategy Pattern for Payment Processing

## Context
Multiple payment providers (Stripe, PayPal, Cash) needed.

## Decision
Use Strategy pattern. Define IPaymentStrategy interface, 
concrete strategies for each provider.

## Naming
- Interface: `IPaymentStrategy` or `PaymentStrategy`
- Concrete: `StripePaymentStrategy`, `PaypalPaymentStrategy`, ...
```

코드 + 문서 — 같은 어휘. 검색 / 추적 쉬움.

## C++ namespace로 패턴 묶음

```cpp
namespace payment {
    class Strategy { /* abstract */ };
    
    class StripeStrategy : public Strategy { };
    class PaypalStrategy : public Strategy { };
}

// 사용
payment::StripeStrategy stripe;
```

namespace로 — 응집도 표현. 도메인 그룹화.

## 함정 — 표준에서 벗어난 이름

```cpp
class PaymentMethodologyEnactor : public PaymentStrategy { };
// ⚠️ "Enactor"? — 표준 아님
```

`Methodology Enactor` — 표준 패턴 어휘 아님. 표준 이름 우선:

```cpp
class StripePaymentStrategy : public PaymentStrategy { };
```

## 함정 — 동의어 남발

```cpp
class EventBus { };           // 한 곳
class EventDispatcher { };    // 다른 곳, 같은 의미
class EventBroker { };         // 또 다른 곳
class MessageQueue { };        // 같은 의미?
class PubSub { };              // 같은 의미!
```

같은 패턴 — 다른 이름. 팀이 혼란. **하나로 통일**:

```cpp
class EventBus { };     // 팀 전체에서 이 이름만
```

## 모던 C++ — 람다와 이름

```cpp
// 익명 람다 — 패턴 이름 없음
std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });

// 명명된 람다 — 의도 명시
auto descending = [](int a, int b) { return a > b; };
std::sort(v.begin(), v.end(), descending);

// 표준 functor
std::sort(v.begin(), v.end(), std::greater<int>{});     // 표준 어휘
```

람다도 — 의도를 이름으로 명시.

## 함정 — 너무 길거나 짧은 이름

```cpp
class CompressionStrategyForLargeBinaryFilesWithSpeedPriority { };     // 너무 김

class CS { };     // 너무 짧음
```

균형:

```cpp
class FastCompressionStrategy { };     // 적당
```

## ADL과 이름

가이드라인 8의 customization point:

```cpp
namespace mylib {
    class Widget { };
    void swap(Widget& a, Widget& b) { /* ... */ }     // 표준 이름 "swap"
}
```

`swap` — 표준 이름. ADL이 이 이름으로 찾음. 다른 이름이면 — customization point로 작동 X.

## 이름 짓기 — 6 원칙

1. **표준 패턴 이름** 우선 (`Strategy`, `Observer`, `Factory`)
2. **도메인 명사** 결합 (`OrderRepository`, `PaymentStrategy`)
3. **`Manager` / `Helper` 회피** — 책임 불명
4. **prefix 자제** (`I`, `Abstract`, `Base`)
5. **동의어 통일** — 팀 전체 일관
6. **약자 X** — 풀어쓰기 (`Repo` → `Repository`)

## 이름과 검색

```bash
# 좋은 이름 — 검색 쉬움
grep -r "Repository" src/         # 모든 Repository 찾기
grep -r "Strategy" src/           # 모든 Strategy

# 나쁜 이름 — 검색 어려움
grep -r "Manager" src/            # 너무 많은 결과
```

코드베이스에서 — **패턴 별로 grep** 가능해야. 일관된 이름이 가능하게.

## 함정 — namespace + class 이름 중복

```cpp
namespace strategy {
    class StripePaymentStrategy { };    // ⚠️ namespace + class 둘 다 "strategy"
}

// 사용
strategy::StripePaymentStrategy s;     // 어색
```

해결:

```cpp
namespace payment {
    class StripeStrategy { };
}

payment::StripeStrategy s;     // 깔끔
```

namespace로 — 그룹화. 클래스 이름은 — 그 안에서 짧게.

## 표준 라이브러리의 이름 모범

```cpp
std::function<...>           // type erasure (단순 "function")
std::shared_ptr<T>           // shared ownership
std::unique_ptr<T>           // unique ownership
std::weak_ptr<T>             // weak observation
std::variant<...>            // sum type
std::optional<T>             // maybe
std::any                     // any type
std::span<T>                 // 배열 view
std::string_view             // string view
```

각 이름이 — 짧고 의미 명확. C++ 표준이 — 이름 짓기 모범.

## 추상화 단계와 이름

```
원칙 (SOLID, DRY)
   ↓
디자인 속성 (변경 가능성)
   ↓
패턴 (Strategy, Observer)
   ↓
도메인 적용 (PaymentStrategy)
   ↓
코드 (StripePaymentStrategy 클래스)
```

각 단계 — 적절한 이름.

## 다국어 환경 — 영어 우선

```cpp
class 주문저장소 { };     // ⚠️ Unicode identifier — 가능하지만 자제
class OrderRepository { };  // 표준
```

C++ — Unicode identifier 허용. 그러나 — 영어가 표준 어휘. 다른 언어 사용자 / 라이브러리 호환에 부담.

도메인 용어는 — 영어 또는 transliteration (`UserId`, `OrderId`).

## 실무 가이드 — 이름 결정 시

새 클래스 / 함수 작성 시:

1. **무엇을 하는가?** (책임)
2. **어떤 패턴 적용했는가?** (디자인)
3. **도메인 어휘는?** (비즈니스)
4. **표준 어휘로?** (`Repository`, `Strategy`, ...)
5. **팀이 합의한 어휘?** (일관성)

## 실무 가이드 — 체크리스트

- [ ] 이름이 — **책임을 즉시 전달**하는가?
- [ ] **패턴 어휘** 사용?
- [ ] **도메인 명사** 결합?
- [ ] **표준 컨벤션** 따름?
- [ ] **팀 일관성** 유지?
- [ ] `Manager`, `Helper`, `Util` 피했는가?
- [ ] 너무 길거나 짧지 않은가?

## 정리

이름이 — **코드의 첫 문서**. 패턴 이름을 명시하면 — 디자인 의도가 즉시 전달.

원칙:
1. **표준 패턴 이름** 우선
2. **도메인 + 패턴** 결합
3. **`Manager` / `Helper` 회피**
4. **팀 일관성**
5. **표준 라이브러리 모범**

도구:
- ADR과 결합 — 코드 + 문서 같은 어휘
- namespace로 — 패턴 그룹화
- grep / IDE — 패턴별 검색

## 관련 항목

- [가이드라인 10: 아키텍처 문서](/blog/programming/cpp/cpp-software-design/guideline10-consider-creating-an-architectural-document) — ADR과 이름
- [가이드라인 11: 패턴의 목적](/blog/programming/cpp/cpp-software-design/guideline11-understand-the-purpose-of-design-patterns) — 어휘의 가치
- [가이드라인 13: 패턴은 어디에나](/blog/programming/cpp/cpp-software-design/guideline13-design-patterns-are-everywhere) — 패턴 인식
- [Beautiful C++ 항목 5: 한 선언 한 이름](/blog/programming/cpp/beautiful-cpp/item05-one-declaration-per-name) — 변수 명명
