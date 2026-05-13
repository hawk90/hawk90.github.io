---
title: "가이드라인 14: 패턴 이름을 의도 전달에 사용하라"
date: 2026-05-14T10:00:00
description: "이름이 어휘다. Strategy, Observer, Factory가 코드에 드러나면 의도가 즉시 전달된다."
tags: [C++, Software Design, Naming, Communication]
series: "C++ Software Design"
seriesOrder: 14
---

## 왜 이 가이드라인이 중요한가?

```cpp
class SortHelper { /* ... */ };           // 의미 없는 이름
class SortStrategy { /* ... */ };          // 패턴 이름이 의도를 즉시 전달한다
class SortByLength { /* ... */ };          // 도메인 이름이 패턴 의도와 함께 드러난다
```

이름은 코드의 첫 문서다. 좋은 이름이 주석 100줄보다 강하다. 패턴 이름은 디자인 의도를 한 단어에 담는다.

- `SortStrategy` → "다른 정렬 알고리즘으로 갈아 끼울 수 있다."
- `EventObserver` → "이벤트를 구독한다."
- `ConfigBuilder` → "복잡한 설정을 단계적으로 구성한다."
- `WidgetFactory` → "Widget 생성을 위임한다."

이 가이드라인은 패턴 어휘를 이름에 그대로 드러내는 원칙을 다룬다.

## 핵심 내용

- 패턴 이름이 코드에 드러나면 의도가 즉시 전달된다.
- 표준 패턴 이름을 쓰면 팀과 커뮤니티의 공유 어휘가 된다.
- 이상적인 이름은 **도메인 + 패턴**의 결합이다(`OrderRepository`, `PaymentStrategy`).
- 잘못된 이름은 디자인을 가린다.
- ADR 문서와 함께 두면 코드와 문서 양쪽에 같은 패턴 어휘가 남는다.

## 비교 — 의미 없는 이름과 패턴 이름

### Bad — 의미가 비어 있다

```cpp
class XYZManager { /* ... */ };
class XYZHelper { /* ... */ };
class XYZUtility { /* ... */ };
class XYZProcessor { /* ... */ };
class XYZHandler { /* ... */ };
```

"Manager", "Helper", "Utility", "Handler", "Processor"는 거의 의미가 없는 이름이다. 무엇을 하는지 보려면 코드를 다 읽어야 한다.

특히 "Manager"는 Java/C# 영향이 강한데, C++에서도 흔하지만 책임이 불명확하다는 신호다.

### Good — 패턴과 도메인이 함께 드러난다

```cpp
class PaymentStrategy { /* ... */ };        // 패턴: Strategy
class OrderObserver { /* ... */ };           // 패턴: Observer
class UserRepository { /* ... */ };          // 패턴: Repository
class HttpRequestBuilder { /* ... */ };      // 패턴: Builder
class ImageDecorator { /* ... */ };          // 패턴: Decorator
class LoggerProxy { /* ... */ };             // 패턴: Proxy
```

이름만 봐도 디자인 의도가 보인다. 문서를 따로 보지 않아도 된다.

## 표준 패턴 이름

GoF와 모던 패턴이 만들어 둔 표준 어휘는 다음과 같다.

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
| Iterator | (보통 표준 iterator를 사용) |

## "수식어 + 패턴" 모양

이름의 표준 형식은 다음과 같다.

```
[도메인] + [패턴]
[도메인] + [수식어] + [패턴]
```

예시는 이렇다.

```cpp
class UserRepository                   // 도메인 + 패턴
class PostgresUserRepository           // 도메인 + 수식어 + 패턴
class CachingUserRepository            // 수식어 + 도메인 + 패턴
class HttpRequestBuilder               // 도메인 + 패턴
class JsonRequestBuilder
```

이름이 도메인 의미와 디자인 의도를 함께 전달한다.

## 인터페이스와 구현의 명명

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

C++ 커뮤니티는 Java/C#만큼 `I` prefix를 자주 쓰지 않는다. 대신 구체 클래스의 이름에 의미를 드러낸다(`FileLogger`, `PostgresRepository`).

## 패턴 이름의 어휘 — 다섯 가지

### 1) 변형에 패턴 이름을 묶을지

```cpp
// 옵션 A — prefix 형태
class SortStrategy { virtual void sort(...) = 0; };
class QuickSortStrategy : public SortStrategy { };
class MergeSortStrategy : public SortStrategy { };
class HeapSortStrategy : public SortStrategy { };

// 옵션 B — 도메인만 (Strategy 패턴은 명시하지 않음)
class QuickSort { };
class MergeSort { };
class HeapSort { };
```

옵션 A는 패턴을 명시한다. 옵션 B는 도메인만 둔다. 도메인 코드에서는 옵션 B가 보통 더 자연스럽다. `std::sort`도 Comparator라는 이름만 쓴다.

### 2) Factory의 이름

```cpp
class WidgetFactory {
public:
    virtual std::unique_ptr<Widget> create() = 0;     // "create"가 표준이다
};

class StandardWidgetFactory : public WidgetFactory { };
class PremiumWidgetFactory : public WidgetFactory { };

// 또는 함수형 Factory
auto factory = []() { return std::make_unique<Widget>(); };
```

`create()`나 `make_*`가 Factory의 표준 어휘다.

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

`subscribe / publish`가 모던 Observer 어휘다. `attach / notify`는 GoF 원본 어휘다.

### 4) Builder의 이름

```cpp
class HttpRequestBuilder {
public:
    HttpRequestBuilder& method(...);
    HttpRequestBuilder& url(...);
    HttpRequestBuilder& header(...);
    HttpRequest         build();          // 표준 종료 메서드 "build"
};
```

`build()`가 Builder의 표준 종료 메서드다.

### 5) Strategy의 이름

```cpp
class CompressionStrategy {
public:
    virtual std::vector<std::byte> compress(...) = 0;
};

class GzipCompression : public CompressionStrategy { };
class ZstdCompression : public CompressionStrategy { };
```

도메인 단어는 `Gzip`, `Zstd`. 패턴 이름은 인터페이스에 둔다.

## 안티패턴 이름

피해야 할 이름의 목록이다.

### 1) `Manager` — 책임이 비어 있다

```cpp
class UserManager { /* ... */ };
```

`UserManager`가 무엇을 하는가? CRUD인가, 검증인가, 알림인가, 통계인가, 모두인가? 책임이 불분명하다.

대안은 책임을 가르는 것이다.

```cpp
class UserRepository { /* CRUD */ };
class UserAuthenticator { /* 인증 */ };
class UserNotifier { /* 알림 */ };
```

SRP를 따른다. 각 클래스에 한 책임을 둔다.

### 2) `Util`, `Helper` — junk drawer

```cpp
class StringUtil {
    static std::string trim(...);
    static std::string upper(...);
    static int parse_int(...);
    // 무관한 정적 메서드가 가득하다
};
```

Util 클래스는 SRP 위반의 신호일 때가 많다. 자유 함수가 더 잘 맞는다.

```cpp
namespace string_ops {
    std::string trim(std::string_view);
    std::string upper(std::string_view);
}

namespace parsing {
    std::optional<int> parse_int(std::string_view);
}
```

### 3) `Handler`, `Processor` — 모호하다

```cpp
class OrderHandler { /* ... */ };
class OrderProcessor { /* ... */ };
```

무엇을 처리하는가? 보지 않으면 알 수 없다. 대안은 동사를 명시하는 것이다.

```cpp
class OrderValidator { /* 검증 */ };
class OrderSubmitter { /* 제출 */ };
class OrderFulfiller { /* 이행 */ };
```

각 클래스의 책임이 분명해진다.

### 4) `Data`, `Info` — 의미가 비어 있다

```cpp
class UserData { /* ... */ };
class UserInfo { /* ... */ };
```

"무엇의 데이터인가? 무엇의 정보인가?" — 자명하다. 그냥 `User`로 두자.

```cpp
class User { /* ... */ };
```

### 5) `Base`, `Abstract` prefix

```cpp
class BaseWidget { virtual void draw() = 0; };
class AbstractShape { virtual double area() = 0; };
```

C++ 컨벤션은 `Base`나 `Abstract` prefix를 쓰지 않는다. derived가 `Widget`, `Shape` 같은 일반 이름을 그대로 가져간다. 추상은 pure virtual로 표시한다.

```cpp
class Shape {     // 추상이라는 사실은 이름에 표시하지 않는다
    virtual double area() = 0;
};

class Circle : public Shape { /* ... */ };
```

## 클래스와 함수의 이름

```cpp
// 클래스는 명사
class OrderRepository { };
class PaymentStrategy { };
class HttpRequest { };

// 함수는 동사
void save_order(...);
double calculate_discount(...);
bool is_valid(...);
```

메서드도 동사로 짓는다.

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
// std::function 기반 Strategy — 클래스 없이 함수로 둔다
using PriceCalculator = std::function<double(const Order&)>;

PriceCalculator standard = [](const Order& o) { return o.subtotal(); };
PriceCalculator with_tax = [](const Order& o) { return o.subtotal() * 1.1; };
PriceCalculator with_discount = [](const Order& o) {
    return o.subtotal() * 0.9;
};
```

`using` alias로 함수형 패턴에도 이름을 붙인다. 도메인 의도가 드러난다.

## 패턴 이름과 ADR

가이드라인 10(ADR)과 결합하면 더 효과적이다.

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

코드와 문서가 같은 어휘를 쓴다. 검색과 추적이 쉬워진다.

## C++ namespace로 패턴을 묶는다

```cpp
namespace payment {
    class Strategy { /* abstract */ };

    class StripeStrategy : public Strategy { };
    class PaypalStrategy : public Strategy { };
}

// 사용
payment::StripeStrategy stripe;
```

namespace로 응집도를 표현한다. 도메인 그룹화의 자연스러운 도구다.

## 함정 — 표준에서 벗어난 이름

```cpp
class PaymentMethodologyEnactor : public PaymentStrategy { };
// ⚠️ "Enactor"? — 표준 어휘가 아니다
```

`Methodology Enactor`는 표준 패턴 어휘가 아니다. 표준 이름을 우선한다.

```cpp
class StripePaymentStrategy : public PaymentStrategy { };
```

## 함정 — 동의어 남발

```cpp
class EventBus { };           // 한 곳에서는 이렇게 부르고
class EventDispatcher { };    // 다른 곳에서는 같은 의미를 이렇게 부른다
class EventBroker { };         // 또 다른 곳에서는 이렇게
class MessageQueue { };        // 같은 의미인가?
class PubSub { };              // 결국 같다
```

같은 패턴에 다른 이름을 붙이면 팀이 혼란해진다. 하나로 통일하자.

```cpp
class EventBus { };     // 팀 전체에서 이 이름만 쓴다
```

## 모던 C++ — 람다와 이름

```cpp
// 익명 람다 — 패턴 이름이 없다
std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });

// 명명된 람다 — 의도를 이름에 둔다
auto descending = [](int a, int b) { return a > b; };
std::sort(v.begin(), v.end(), descending);

// 표준 functor — 표준 어휘
std::sort(v.begin(), v.end(), std::greater<int>{});
```

람다에도 의도를 이름에 드러내자.

## 함정 — 너무 길거나 짧은 이름

```cpp
class CompressionStrategyForLargeBinaryFilesWithSpeedPriority { };     // 너무 길다

class CS { };     // 너무 짧다
```

균형 잡힌 형태를 노린다.

```cpp
class FastCompressionStrategy { };     // 적당하다
```

## ADL과 이름

가이드라인 8의 customization point는 이름이 곧 약속이다.

```cpp
namespace mylib {
    class Widget { };
    void swap(Widget& a, Widget& b) { /* ... */ }     // 표준 이름 "swap"
}
```

`swap`은 표준 이름이다. ADL이 이 이름으로 함수를 찾는다. 다른 이름이면 customization point로 작동하지 않는다.

## 이름 짓기 — 여섯 원칙

1. 표준 패턴 이름을 우선한다 (`Strategy`, `Observer`, `Factory`).
2. 도메인 명사와 결합한다 (`OrderRepository`, `PaymentStrategy`).
3. `Manager`, `Helper`, `Util`은 피한다. 책임이 불명확해진다.
4. prefix를 자제한다 (`I`, `Abstract`, `Base`).
5. 동의어를 통일한다. 팀 전체가 같은 어휘를 쓴다.
6. 약자를 피한다(`Repo` → `Repository`).

## 이름과 검색

```bash
# 좋은 이름 — 검색이 쉽다
grep -r "Repository" src/         # 모든 Repository를 찾는다
grep -r "Strategy" src/           # 모든 Strategy

# 나쁜 이름 — 검색이 막힌다
grep -r "Manager" src/            # 결과가 너무 많다
```

코드베이스에서 패턴별로 grep할 수 있어야 한다. 일관된 이름이 그것을 가능하게 한다.

## 함정 — namespace와 클래스 이름이 중복된다

```cpp
namespace strategy {
    class StripePaymentStrategy { };    // ⚠️ namespace도 "strategy", 클래스에도 "Strategy"
}

// 사용
strategy::StripePaymentStrategy s;     // 어색하다
```

해법은 다음과 같다.

```cpp
namespace payment {
    class StripeStrategy { };
}

payment::StripeStrategy s;     // 깔끔하다
```

namespace로 그룹화하고, 클래스 이름은 그 안에서 짧게 둔다.

## 표준 라이브러리의 이름 모범

```cpp
std::function<...>           // type erasure (단순히 "function")
std::shared_ptr<T>           // shared ownership
std::unique_ptr<T>           // unique ownership
std::weak_ptr<T>             // weak observation
std::variant<...>            // sum type
std::optional<T>             // maybe
std::any                     // any type
std::span<T>                 // 배열 view
std::string_view             // string view
```

각 이름이 짧고 의미가 분명하다. C++ 표준이 이름 짓기의 모범이다.

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

각 단계에 맞는 이름을 둔다.

## 다국어 환경 — 영어를 우선한다

```cpp
class 주문저장소 { };     // ⚠️ Unicode identifier — 가능하지만 자제한다
class OrderRepository { };  // 표준
```

C++은 Unicode identifier를 허용한다. 그러나 영어가 표준 어휘다. 다른 언어 사용자나 라이브러리 호환에 부담이 된다.

도메인 용어는 영어나 transliteration으로 둔다(`UserId`, `OrderId`).

## 실무 가이드 — 이름을 결정할 때

새 클래스나 함수를 만들 때 다음을 자문하자.

1. 무엇을 하는가? (책임)
2. 어떤 패턴을 적용했는가? (디자인)
3. 도메인 어휘는 무엇인가? (비즈니스)
4. 표준 어휘를 쓰고 있는가? (`Repository`, `Strategy` 등)
5. 팀이 합의한 어휘인가? (일관성)

## 실무 가이드 — 체크리스트

- [ ] 이름이 책임을 즉시 전달하는가?
- [ ] 패턴 어휘를 쓰고 있는가?
- [ ] 도메인 명사가 결합되어 있는가?
- [ ] 표준 컨벤션을 따르는가?
- [ ] 팀의 일관성을 유지하는가?
- [ ] `Manager`, `Helper`, `Util`을 피했는가?
- [ ] 너무 길거나 짧지는 않은가?

## 정리

이름은 코드의 첫 문서다. 패턴 이름을 명시하면 디자인 의도가 즉시 전달된다.

원칙은 다음과 같다.

1. 표준 패턴 이름을 우선한다.
2. 도메인과 패턴을 결합한다.
3. `Manager`, `Helper` 같은 이름을 피한다.
4. 팀 안에서 일관성을 유지한다.
5. 표준 라이브러리의 명명을 모범으로 삼는다.

도구는 다음과 같다.

- ADR과 결합 — 코드와 문서가 같은 어휘를 쓴다.
- namespace — 패턴을 그룹화한다.
- grep / IDE — 패턴별로 검색할 수 있다.

## 관련 항목

- [가이드라인 10: 아키텍처 문서](/blog/programming/cpp/cpp-software-design/guideline10-consider-creating-an-architectural-document) — ADR과 이름
- [가이드라인 11: 패턴의 목적](/blog/programming/cpp/cpp-software-design/guideline11-understand-the-purpose-of-design-patterns) — 어휘의 가치
- [가이드라인 13: 패턴은 어디에나 있다](/blog/programming/cpp/cpp-software-design/guideline13-design-patterns-are-everywhere) — 패턴 인식
- [Beautiful C++ 항목 5: 한 선언에 한 이름](/blog/programming/cpp/beautiful-cpp/item05-one-declaration-per-name) — 변수 명명
