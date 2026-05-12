---
title: "가이드라인 2: 변화를 위한 디자인"
date: 2026-05-13T12:00:00
description: "변화의 축을 찾아 캡슐화 — Single Responsibility, Don't Repeat Yourself, 변경 가능성이 디자인의 목표."
tags: [C++, Software Design, SOLID, SRP, DRY]
series: "C++ Software Design"
seriesOrder: 2
---

## 왜 이 가이드라인이 중요한가?

> "**The only constant in software development is change.**"

소프트웨어는 — 한 번 작성하고 끝나지 않는다. 6개월 후 새 결제 수단, 1년 후 새 데이터베이스, 2년 후 새 플랫폼. 처음 코드는 결국 — **변경된다**.

문제는 — 어떤 코드는 **변경하기 쉽고**, 어떤 코드는 **변경할 때마다 다른 곳이 깨진다**. 차이는 — "**변화의 축**(axes of change)을 미리 식별하고 캡슐화**"했는지 여부.

Iglberger의 메시지: **"디자인의 가장 큰 목표는 변경 가능성을 보존하는 것"**. 이 가이드라인은 — 그 보존을 위한 두 가지 원칙 (SRP, DRY)을 모던 C++ 관점에서 정리.

## 핵심 내용

- 소프트웨어는 **변한다** — 디자인의 본질은 변경 가능성 보존
- **변화의 축(axes of change)을 식별**하고 **캡슐화**하라
- 한 변화가 — **한 클래스/모듈** 안에 한정되게
- **Single Responsibility Principle**(SRP): "**한 가지 이유로만 변경되는 클래스**"
- **DRY**(Don't Repeat Yourself): 변화의 정보를 **한 곳**에만
- 잘못된 추상화는 — 변화를 막음 (가이드라인 1의 "과도한 디자인" 함정)

## 비교 — 변화 못 받는 디자인 vs 받는 디자인

### Bad: 변화의 축이 한 클래스에 모두 박힘

```cpp
class Document {
public:
    void save_to_file(const std::string& path);     // 저장 방식 1
    void save_to_db(Connection& db);                  // 저장 방식 2
    void save_to_cloud(CloudClient& c);              // 저장 방식 3
    
    void format_as_html();                            // 출력 형식 1
    void format_as_json();                            // 출력 형식 2
    void format_as_xml();                             // 출력 형식 3
    
    void send_via_email(const std::string& to);      // 전송 방식 1
    void send_via_sms(const std::string& number);    // 전송 방식 2
};
```

문제:
- **3가지 다른 변화의 축**: 저장 방식 / 출력 형식 / 전송 방식
- 새 저장 방식 추가 → Document 수정
- 새 출력 형식 추가 → Document 수정
- 새 전송 방식 추가 → Document 수정
- 어느 한 변화가 — 다른 모든 기능에 잠재적 영향
- 테스트 어려움 — DB, 이메일, 클라우드 모두 모의화 필요

### Good: 변화의 축마다 별도 클래스

```cpp
class Document {
public:
    std::string content() const;
};

// 변화의 축 1: 저장 방식
class DocumentStore {
public:
    virtual ~DocumentStore() = default;
    virtual void save(const Document& doc) = 0;
};

class FileStore   : public DocumentStore { /* ... */ };
class DbStore     : public DocumentStore { /* ... */ };
class CloudStore  : public DocumentStore { /* ... */ };

// 변화의 축 2: 출력 형식
class DocumentFormatter {
public:
    virtual ~DocumentFormatter() = default;
    virtual std::string format(const Document& doc) = 0;
};

class HtmlFormatter : public DocumentFormatter { /* ... */ };
class JsonFormatter : public DocumentFormatter { /* ... */ };

// 변화의 축 3: 전송 방식
class DocumentSender {
public:
    virtual ~DocumentSender() = default;
    virtual void send(const std::string& payload, const std::string& addr) = 0;
};

class EmailSender : public DocumentSender { /* ... */ };
class SmsSender   : public DocumentSender { /* ... */ };
```

이제:
- 새 저장 방식 → `DocumentStore` 상속 클래스 1개 추가, 기존 코드 무변화
- 새 출력 형식 → 마찬가지
- 새 전송 방식 → 마찬가지
- 각 축이 — 독립적으로 진화

## 변화의 축 찾기

변화의 축은 — 시간이 지나면서 **다른 속도로 변하는 것들**.

| 무엇 | 빠른 변화 | 느린 변화 |
| --- | --- | --- |
| 비즈니스 로직 vs 인프라 | 비즈니스 자주 | 인프라 천천히 |
| UI vs 데이터 모델 | UI 자주 | 모델 천천히 |
| 표시 형식 vs 핵심 데이터 | 형식 자주 | 데이터 안정 |
| 외부 API 통신 vs 내부 알고리즘 | 외부 자주 | 알고리즘 안정 |

**자주 변하는 부분**을 — **잘 안 변하는 부분**과 분리. 자주 변하는 부분이 잘 안 변하는 부분에 **의존**해야지, 반대로는 X.

### Dependency Inversion Principle

```
잘 안 변함 (high-level policy)  ←──┐
                                     │ depends on
                                     │
잘 변함 (low-level details)  ────────┘
```

이게 SOLID의 D — Dependency Inversion. 추상화에 의존, 구체 구현에 의존 X.

## Single Responsibility Principle (SRP)

> "**A class should have one, and only one, reason to change.**"

Robert C. Martin의 정의 — 자주 오해됨. **"한 가지 일만 한다"**가 아니라 **"한 가지 이유로만 변경된다"**.

```cpp
class Order {
    // 한 가지 책임 — 주문 라이프사이클
public:
    void place();
    void cancel();
    void confirm();
};
```

`Order`는 — 주문 자체의 라이프사이클이 변할 때만 수정. 이메일 발송 방식이 변해도, 저장 방식이 변해도 — `Order` 수정 X.

### SRP 위반 신호

- 한 클래스 안에 — **여러 actor**(사용자, 시스템, 외부 API)가 영향받는 코드
- 클래스 이름에 — "**And**" 또는 "**Or**" (예: `UserManagerAndLogger`)
- 메서드 그룹이 — 서로 무관한 멤버 변수만 사용

### "Cohesion이 높다 = SRP 만족"

```cpp
// 높은 응집도 — 모든 멤버가 같은 책임
class FileWriter {
    std::string path_;
    std::ofstream stream_;
public:
    void open();
    void write(const std::string& data);
    void close();
};

// 낮은 응집도 — 멤버끼리 무관
class UserUtility {
    std::string user_name_;          // user 정보
    std::vector<int> file_handles_;   // 파일 정보 — 무관
    Connection db_conn_;              // DB 정보 — 무관
    // 어디까지 책임?
};
```

응집도(cohesion) 검사: 한 클래스의 메서드가 — 같은 멤버 변수들을 사용하는가? 메서드별로 사용하는 멤버가 — 거의 겹치지 않으면 → 책임이 둘 이상.

## Don't Repeat Yourself (DRY)

> "**Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.**" — Pragmatic Programmer

**같은 정보가 두 곳에 존재**하면 — 변경 시 두 곳 모두 수정. 한 곳 잊으면 → 불일치 → 버그.

### DRY 위반 — 흔한 형태

```cpp
// Bad: 같은 검증 로직 두 곳
class CreateUserRequest {
public:
    void validate() {
        if (name.empty()) throw "name required";
        if (email.find('@') == std::string::npos) throw "invalid email";
        if (age < 18) throw "must be adult";
    }
};

class UpdateUserRequest {
public:
    void validate() {
        if (name.empty()) throw "name required";
        if (email.find('@') == std::string::npos) throw "invalid email";
        if (age < 18) throw "must be adult";
        // 똑같은 코드 — 한 군데 바꾸면 다른 곳도?
    }
};
```

### DRY 적용

```cpp
class UserValidation {
public:
    static void validate(const std::string& name,
                         const std::string& email,
                         int age) {
        if (name.empty()) throw "name required";
        if (email.find('@') == std::string::npos) throw "invalid email";
        if (age < 18) throw "must be adult";
    }
};

class CreateUserRequest {
public:
    void validate() { UserValidation::validate(name, email, age); }
};

class UpdateUserRequest {
public:
    void validate() { UserValidation::validate(name, email, age); }
};
```

검증 로직 한 곳에 — 변경 시 한 곳만.

### DRY의 함정 — "겉모습만 같은 코드"

```cpp
class Order {
    double calculate_tax() {
        return amount_ * 0.1;     // 매출세 10%
    }
};

class Employee {
    double calculate_tax() {
        return salary_ * 0.1;     // 소득세 10%
    }
};
```

같은 식 — `* 0.1`. 그러나 — **다른 도메인 개념** (매출세 vs 소득세). 미래에 — 매출세는 변하고 소득세는 안 변할 수 있음.

**잘못된 DRY** — 두 코드를 강제로 한 함수로 묶으면:

```cpp
double calculate_tax(double base) { return base * 0.1; }     // ⚠️ 도메인 의미 손실
```

미래에 두 세금이 따로 변하면 — 다시 갈라야 함. DRY는 **같은 지식의 중복**일 때만 적용. **우연히 같은 모양**의 코드에는 X.

원칙: **"Three strikes and you refactor"** — 3번 반복되면 그제야 추상화.

## 변화를 위한 디자인 — 5가지 신호

새 코드 작성 / 리뷰 시 자문:

### 1) 새 변형(variant)이 추가될 가능성?

```cpp
enum class Format { HTML, JSON };

void render(Doc& d, Format f) {
    if (f == Format::HTML) /* ... */;
    else if (f == Format::JSON) /* ... */;
    // 새 형식 추가 → enum 수정 + 모든 if 수정
}
```

새 형식 추가가 — 자주 일어날 가능성 있으면, 다형성 또는 strategy로:

```cpp
class Formatter { virtual std::string format(const Doc&) = 0; };
class HtmlFormatter : public Formatter { /* ... */ };
class JsonFormatter : public Formatter { /* ... */ };
```

### 2) 외부 의존성이 변할 가능성?

DB, 외부 API, 라이브러리, OS API — 모두 변함. 인터페이스로 격리:

```cpp
class Repository { virtual User find(int) = 0; };
class PostgresRepo : public Repository { /* ... */ };
// 나중에 MongoDB로 마이그레이션 — MongoRepo 추가, 사용자 코드는 변경 X
```

### 3) 비즈니스 정책이 변할 가능성?

```cpp
double calculate_discount(Order& order) {
    if (order.total() > 100) return 0.1;     // ⚠️ 정책이 코드에 박힘
    return 0;
}
```

정책은 **자주 변함**. 데이터로 분리:

```cpp
class DiscountPolicy { virtual double calculate(Order&) = 0; };
class TenPercentOverHundred : public DiscountPolicy { /* ... */ };
class BlackFridaySpecial    : public DiscountPolicy { /* ... */ };
```

### 4) UI/표시가 변할 가능성?

UI는 — 코드에서 가장 자주 변하는 부분. 비즈니스 로직과 강결합 안 되게.

### 5) 성능 요구사항이 변할 가능성?

```cpp
class Cache {
    std::map<Key, Value> data_;     // 처음엔 충분
    // 나중에 — LRU 필요? distributed cache 필요?
};
```

캐시 구현이 변할 수 있게 — 인터페이스 분리.

## 함정 — Over-Engineering (과도한 추상화)

```cpp
// 단순 정수 카운터를 위해
class ICounter {
public:
    virtual ~ICounter() = default;
    virtual int get() const = 0;
    virtual void increment() = 0;
    virtual void reset() = 0;
};

class ICounterFactory { virtual std::unique_ptr<ICounter> create() = 0; };
class CounterStrategy { /* ... */ };
class CounterObserver { /* ... */ };

// 정작 카운터는 어디나 한 가지 — 단순 int++
```

가이드라인 1의 함정 다시 — **YAGNI** (You Aren't Gonna Need It).

규칙:
- **현재 알려진 변화의 축**만 디자인
- 미래의 가능성을 위해 — 미리 추상화 X
- **3번 반복되면** 그제야 추상화 (Rule of Three)
- 처음엔 simplest implementation, 변화가 실제로 오면 refactor

Iglberger의 균형 메시지:
> "Design for change — but not for changes that may never come."

## 함정 — 너무 늦은 디자인

반대 극단. "**일단 동작하게, 디자인은 나중에**" → "나중에"는 안 옴.

특히 — startup, embedded firmware, game prototypes에서 흔함. 결국 — refactor 비용이 처음 디자인 비용보다 훨씬 큼.

**원칙**:
- 시작할 때 — **합리적**으로 디자인 (perfectionism X)
- 새 기능 추가 시 — refactor 기회로 활용 (Boy Scout Rule)
- 자주 변하는 부분이 명확해지면 — 그때 추상화

## 모던 C++ 도구 — 변화를 받기

### `std::function` / type erasure

```cpp
class EventBus {
    std::vector<std::function<void(Event)>> listeners_;
public:
    void subscribe(std::function<void(Event)> cb);
    void publish(Event e);
};

// 어떤 형태의 listener든 OK — lambda, free function, member function, functor
bus.subscribe([](Event e) { /* ... */ });
```

`std::function`이 — 다양한 callable을 한 타입으로. 새 listener 형태가 추가돼도 EventBus 수정 X.

### `std::variant` — 닫힌 sum type

```cpp
using Shape = std::variant<Circle, Square, Triangle>;

double area(const Shape& s) {
    return std::visit([](const auto& x) { return x.area(); }, s);
}
```

새 도형 추가 — variant에 추가 + visit에서 다루기. 컴파일러가 — 누락된 케이스 잡음. **타입 추가**가 잦은 도메인에 적합.

vs 가상 함수 (open hierarchy):

```cpp
class Shape { virtual double area() = 0; };
class Circle : public Shape { /* ... */ };
```

**새 연산 추가**가 잦은 도메인에 적합. 변화의 축이 다름.

### C++20 concepts

```cpp
template<typename T>
concept Printable = requires(const T& t) {
    { t.print() } -> std::same_as<void>;
};

template<Printable T>
void render(const T& t) { t.print(); }
```

타입 계층 없이 — **인터페이스 명시**. 새 타입이 `print()` 가지면 자동 호환.

## 실무 가이드 — 변화의 축 식별

새 기능 작성 전:

1. **"이 코드는 6개월 후 어떻게 변할 가능성이 있나?"** 자문
2. 변화의 종류 나열:
   - 새 데이터 형식?
   - 새 알고리즘?
   - 새 외부 통합?
   - 새 비즈니스 정책?
3. 변화 종류별로 — **다른 클래스/모듈**로
4. 자주 변하는 것이 — 안 변하는 것에 의존

## 실무 가이드 — 체크리스트

- [ ] 클래스가 **한 가지 이유로만** 변경되나? (SRP)
- [ ] 같은 정보가 **여러 곳에 중복**되어 있지 않나? (DRY)
- [ ] 변화의 축이 — **별도 클래스/인터페이스**로 분리되어 있나?
- [ ] 자주 변하는 부분이 — 잘 안 변하는 부분에 의존하나? (DIP)
- [ ] 과도한 추상화로 — 단순한 일을 복잡하게 만들지 않았나? (YAGNI)
- [ ] **3번 반복**되기 전에 추상화하지 않았나? (Rule of Three)

## 정리

소프트웨어는 **변한다**. 디자인의 본질은 — **변경 가능성 보존**.

원칙:
1. **변화의 축 식별** — 자주 변하는 것과 안 변하는 것 분리
2. **SRP** — 한 가지 이유로만 변경되는 클래스
3. **DRY** — 같은 지식은 한 곳에
4. **YAGNI** — 미래의 변화는 추측 X, 실제 발생 시 refactor
5. **Rule of Three** — 3번 반복되면 추상화

## 관련 항목

- [가이드라인 1: 디자인의 중요성](/blog/programming/cpp-software-design/guideline01-understand-the-importance-of-software-design) — 디자인의 본질
- [가이드라인 3: 인터페이스 분리](/blog/programming/cpp-software-design/guideline03-separate-interfaces-to-avoid-artificial-coupling) — SRP의 인터페이스 측면
- [Effective C++ 항목 23: 비-멤버 비-friend](/blog/programming/effective-cpp/item23-prefer-non-member-non-friend-functions-to-member-functions) — 캡슐화
- [Beautiful C++ 항목 14: 싱글톤 피하기](/blog/programming/beautiful-cpp/item14-avoid-singletons) — 변화 못 받는 디자인 사례
