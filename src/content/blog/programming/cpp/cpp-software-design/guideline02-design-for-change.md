---
title: "가이드라인 2: 변화를 위한 디자인"
date: 2026-05-13T02:00:00
description: "변화의 축을 찾아 캡슐화한다. Single Responsibility와 DRY, 변경 가능성이 디자인의 목표라는 이야기."
tags: [C++, Software Design, SOLID, SRP, DRY]
series: "C++ Software Design"
seriesOrder: 2
draft: true
---

## 왜 이 가이드라인이 중요한가?

> "**The only constant in software development is change.**"

소프트웨어는 한 번 쓰고 끝나지 않는다. 6개월 뒤에는 새 결제 수단이 들어오고, 1년 뒤에는 데이터베이스를 바꾸고, 2년 뒤에는 새 플랫폼이 붙는다. 처음 작성한 코드는 결국 **변경된다**.

문제는 따로 있다. 어떤 코드는 변경하기 쉬운 반면, 어떤 코드는 한 줄을 손대면 엉뚱한 곳에서 깨진다. 차이는 변화의 축(axes of change)을 미리 식별해 캡슐화해 두었는가에 달려 있다.

Iglberger의 메시지는 이렇다. *"디자인의 가장 큰 목표는 변경 가능성을 보존하는 것이다."* 이 가이드라인은 그 보존을 위한 두 가지 원칙인 SRP와 DRY를 모던 C++ 관점에서 정리한다.

## 핵심 내용

- 소프트웨어는 변한다. 디자인의 본질은 변경 가능성을 보존하는 데 있다.
- 변화의 축을 식별하고 캡슐화하라.
- 한 변화는 한 클래스 혹은 한 모듈 안에 갇혀야 한다.
- **Single Responsibility Principle(SRP)** — "한 가지 이유로만 변경되는 클래스"를 만든다.
- **DRY(Don't Repeat Yourself)** — 같은 지식은 한 곳에만 둔다.
- 잘못 그은 추상화는 오히려 변화를 막는다. 가이드라인 1에서 본 "과도한 디자인"의 함정이다.

## 비교 — 변화에 약한 디자인과 변화에 강한 디자인

### Bad — 변화의 축이 한 클래스에 다 박혀 있다

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

문제는 명확하다.

- 한 클래스에 세 가지 변화의 축(저장, 출력, 전송)이 함께 묶여 있다.
- 저장 방식을 추가하든, 출력 형식을 추가하든, 전송 방식을 추가하든 결국 `Document`를 수정해야 한다.
- 한 축의 변경이 다른 기능에 잠재적으로 영향을 준다.
- 테스트하려면 DB, 이메일, 클라우드를 모두 모킹해야 한다.

### Good — 변화의 축마다 클래스를 따로 둔다

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

이제 새 저장 방식은 `DocumentStore` 파생 클래스 하나를 추가하면 끝이다. 출력 형식과 전송 방식도 마찬가지다. 각 축이 독립적으로 진화한다.

## 변화의 축을 찾는 법

변화의 축은 시간이 흐를 때 **서로 다른 속도로 변하는 것들**이다.

| 무엇 | 빠른 변화 | 느린 변화 |
| --- | --- | --- |
| 비즈니스 로직 vs 인프라 | 비즈니스 자주 | 인프라 천천히 |
| UI vs 데이터 모델 | UI 자주 | 모델 천천히 |
| 표시 형식 vs 핵심 데이터 | 형식 자주 | 데이터 안정 |
| 외부 API 통신 vs 내부 알고리즘 | 외부 자주 | 알고리즘 안정 |

자주 변하는 부분을 잘 변하지 않는 부분과 분리하라. 그리고 자주 변하는 쪽이 안 변하는 쪽에 의존하게 두지, 그 반대로 두지는 말자.

### Dependency Inversion Principle

```
잘 안 변함 (high-level policy)  ←──┐
                                     │ depends on
                                     │
잘 변함 (low-level details)  ────────┘
```

이것이 SOLID의 D, Dependency Inversion이다. 추상에 의존하고 구체 구현에는 의존하지 않는다.

## Single Responsibility Principle (SRP)

> "**A class should have one, and only one, reason to change.**"

Robert C. Martin의 정의이지만, 자주 오해된다. SRP는 "한 가지 일만 한다"가 아니라 "한 가지 이유로만 변경된다"는 원칙이다.

```cpp
class Order {
    // 한 가지 책임 — 주문의 라이프사이클
public:
    void place();
    void cancel();
    void confirm();
};
```

`Order`는 주문 자체의 라이프사이클이 바뀔 때만 수정한다. 이메일 발송 방식이 바뀌어도, 저장 방식이 바뀌어도 `Order`는 손대지 않아도 된다.

### SRP 위반 신호

- 한 클래스 안에 여러 actor(사용자, 시스템, 외부 API)의 변경이 함께 영향을 준다.
- 클래스 이름에 "And"나 "Or"가 들어간다. 예: `UserManagerAndLogger`.
- 메서드 그룹이 서로 다른 멤버 변수만 건드린다.

### "응집도가 높다 = SRP에 가깝다"

```cpp
// 응집도가 높다 — 모든 멤버가 같은 책임에 묶인다
class FileWriter {
    std::string path_;
    std::ofstream stream_;
public:
    void open();
    void write(const std::string& data);
    void close();
};

// 응집도가 낮다 — 멤버끼리 무관하다
class UserUtility {
    std::string user_name_;           // user 정보
    std::vector<int> file_handles_;   // 파일 정보, 무관
    Connection db_conn_;              // DB 정보, 무관
    // 책임이 어디까지인가?
};
```

응집도를 가늠하는 간단한 방법이 있다. 한 클래스의 메서드들이 같은 멤버 변수를 공유하는지 본다. 메서드별로 쓰는 멤버가 거의 겹치지 않는다면 책임이 둘 이상이라는 신호다.

## Don't Repeat Yourself (DRY)

> "**Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.**" — Pragmatic Programmer

같은 정보가 두 곳에 존재하면, 변경할 때 두 곳을 모두 손대야 한다. 한 곳을 잊어 버리면 곧장 불일치가 생기고 버그로 이어진다.

### 흔한 DRY 위반

```cpp
// Bad: 같은 검증 로직이 두 곳에
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
        // 똑같다. 한 곳을 바꾸면 다른 곳은?
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

검증 로직이 한 곳에 모였다. 바꿀 때 한 곳만 손대면 된다.

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

식은 둘 다 `* 0.1`로 같다. 하지만 도메인 개념은 다르다. 매출세와 소득세는 별개이며, 미래에 매출세만 바뀔 수도 있다.

잘못된 DRY를 적용해 두 코드를 강제로 한 함수로 묶으면 다음과 같은 모양이 된다.

```cpp
double calculate_tax(double base) { return base * 0.1; }     // ⚠️ 도메인 의미가 사라진다
```

미래에 두 세금이 따로 바뀌면 결국 다시 분리해야 한다. DRY는 **같은 지식의 중복**일 때만 적용한다. **우연히 같은 모양**인 코드까지 묶으려 들면 안 된다.

규칙으로 쓰자면 이렇다. *"Three strikes and you refactor."* 세 번 반복된 다음에야 추상화를 꺼낸다.

## 변화를 위한 디자인 — 다섯 가지 신호

새 코드를 작성하거나 리뷰할 때 다음 질문을 던져 보자.

### 1) 새로운 변형(variant)이 추가될 가능성이 있는가?

```cpp
enum class Format { HTML, JSON };

void render(Doc& d, Format f) {
    if (f == Format::HTML) /* ... */;
    else if (f == Format::JSON) /* ... */;
    // 새 형식을 더하려면 enum과 모든 if 분기를 고쳐야 한다
}
```

새 형식이 자주 추가될 듯하다면 다형성이나 Strategy로 풀어 두자.

```cpp
class Formatter { virtual std::string format(const Doc&) = 0; };
class HtmlFormatter : public Formatter { /* ... */ };
class JsonFormatter : public Formatter { /* ... */ };
```

### 2) 외부 의존성이 바뀔 가능성이 있는가?

DB, 외부 API, 라이브러리, OS API 모두 언젠가 바뀐다. 인터페이스로 격리해 둔다.

```cpp
class Repository { virtual User find(int) = 0; };
class PostgresRepo : public Repository { /* ... */ };
// 나중에 MongoDB로 옮긴다면 MongoRepo를 추가한다. 사용자 코드는 그대로다.
```

### 3) 비즈니스 정책이 바뀔 가능성이 있는가?

```cpp
double calculate_discount(Order& order) {
    if (order.total() > 100) return 0.1;     // ⚠️ 정책이 코드에 박혀 있다
    return 0;
}
```

정책은 자주 바뀐다. 데이터로 분리해 두자.

```cpp
class DiscountPolicy { virtual double calculate(Order&) = 0; };
class TenPercentOverHundred : public DiscountPolicy { /* ... */ };
class BlackFridaySpecial    : public DiscountPolicy { /* ... */ };
```

### 4) UI나 표시 형태가 바뀔 가능성이 있는가?

UI는 코드에서 가장 자주 바뀌는 부분이다. 비즈니스 로직과 강하게 묶이지 않도록 둔다.

### 5) 성능 요구사항이 바뀔 가능성이 있는가?

```cpp
class Cache {
    std::map<Key, Value> data_;     // 처음에는 이걸로 충분하다
    // 나중에 LRU가 필요해진다면? 분산 캐시가 필요해진다면?
};
```

캐시 구현이 바뀔 여지가 있다면 인터페이스로 분리해 둔다.

## 함정 — 과도한 추상화

```cpp
// 단순 정수 카운터를 만든다고
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

// 정작 카운터는 한 종류만 쓰고, 동작은 int++뿐
```

가이드라인 1에서도 짚은 **YAGNI(You Aren't Gonna Need It)** 의 함정이다.

원칙은 이렇다.

- 지금 알려진 변화의 축에만 디자인을 그어 둔다.
- 미래의 가능성을 위해 추상화를 미리 만들지 않는다.
- 세 번 반복된 다음에야 추상화한다(Rule of Three).
- 처음에는 가장 단순한 구현으로 시작하고, 변화가 실제로 오면 리팩토링한다.

Iglberger가 말하는 균형은 이렇다.

> "Design for change — but not for changes that may never come."

## 함정 — 너무 늦은 디자인

반대 극단도 있다. *"일단 돌아가게, 디자인은 나중에."* 그 '나중'은 거의 오지 않는다.

스타트업, 임베디드 펌웨어, 게임 프로토타입 같은 환경에서 특히 흔하다. 결국 리팩토링 비용이 처음 디자인을 잘 했을 때의 비용보다 훨씬 커진다.

원칙은 다음과 같다.

- 시작할 때부터 합리적인 수준의 디자인을 가져간다. 완벽주의는 따로 두자.
- 새 기능을 추가할 때마다 리팩토링 기회로 활용한다(Boy Scout Rule).
- 자주 바뀌는 부분이 드러나는 순간 그 부분을 추상화한다.

## 모던 C++ 도구 — 변화를 받아 내는 장치들

### `std::function`과 type erasure

```cpp
class EventBus {
    std::vector<std::function<void(Event)>> listeners_;
public:
    void subscribe(std::function<void(Event)> cb);
    void publish(Event e);
};

// listener의 형태가 어떻든 무관 — lambda든 함수 포인터든 멤버 함수든 functor든
bus.subscribe([](Event e) { /* ... */ });
```

`std::function`이 다양한 callable을 같은 타입으로 묶어 준다. 새 listener 형태가 생겨도 `EventBus`는 손대지 않는다.

### `std::variant` — 닫힌 sum type

```cpp
using Shape = std::variant<Circle, Square, Triangle>;

double area(const Shape& s) {
    return std::visit([](const auto& x) { return x.area(); }, s);
}
```

새 도형을 더하면 `variant`에 추가하고 `visit`에서 다루기만 하면 된다. 누락된 분기는 컴파일러가 잡아 준다. **타입을 자주 더하는 도메인**에 어울리는 도구다.

이와 대조적으로, 새 연산을 자주 더하는 도메인에는 가상 함수 기반의 열린 계층이 어울린다.

```cpp
class Shape { virtual double area() = 0; };
class Circle : public Shape { /* ... */ };
```

같은 추상화도 변화의 축이 어느 쪽이냐에 따라 다른 도구를 골라야 한다.

### C++20 concepts

```cpp
template<typename T>
concept Printable = requires(const T& t) {
    { t.print() } -> std::same_as<void>;
};

template<Printable T>
void render(const T& t) { t.print(); }
```

타입 계층 없이 인터페이스를 명시할 수 있다. 새 타입이 `print()`만 가지면 자동으로 호환된다.

## 실무 가이드 — 변화의 축을 식별하는 절차

새 기능을 작성하기 전에 다음을 따라가 보자.

1. *"이 코드는 6개월 뒤에 어떻게 바뀔 가능성이 있나?"* 라고 자문한다.
2. 가능한 변화의 종류를 늘어놓는다.
   - 새 데이터 형식?
   - 새 알고리즘?
   - 새 외부 통합?
   - 새 비즈니스 정책?
3. 변화 종류마다 별도의 클래스나 모듈로 가른다.
4. 자주 바뀌는 쪽이 잘 안 바뀌는 쪽에 의존하게 둔다.

## 실무 가이드 — 체크리스트

- [ ] 클래스가 한 가지 이유로만 바뀌는가? (SRP)
- [ ] 같은 정보가 여러 곳에 중복되어 있지는 않은가? (DRY)
- [ ] 변화의 축이 별도 클래스나 인터페이스로 분리되어 있는가?
- [ ] 자주 바뀌는 쪽이 안 바뀌는 쪽에 의존하는가? (DIP)
- [ ] 과도한 추상화로 단순한 일을 복잡하게 만들지는 않았는가? (YAGNI)
- [ ] 세 번 반복되기 전에 미리 추상화하지는 않았는가? (Rule of Three)

## 정리

소프트웨어는 변한다. 디자인의 본질은 그 변화 가능성을 보존하는 데 있다.

기억해 둘 원칙은 다음과 같다.

1. **변화의 축을 식별한다** — 자주 바뀌는 것과 안 바뀌는 것을 분리한다.
2. **SRP** — 한 가지 이유로만 바뀌는 클래스를 만든다.
3. **DRY** — 같은 지식은 한 곳에 둔다.
4. **YAGNI** — 미래의 변화를 추측해 미리 짓지 않는다. 실제로 발생하면 그때 리팩토링한다.
5. **Rule of Three** — 세 번 반복되면 그제야 추상화한다.

## 관련 항목

- [가이드라인 1: 디자인의 중요성](/blog/programming/cpp/cpp-software-design/guideline01-understand-the-importance-of-software-design) — 디자인의 본질
- [가이드라인 3: 인터페이스 분리](/blog/programming/cpp/cpp-software-design/guideline03-separate-interfaces-to-avoid-artificial-coupling) — SRP의 인터페이스 측면
- [Effective C++ 항목 23: 비-멤버 비-friend 함수](/blog/programming/cpp/effective-cpp/item23-prefer-non-member-non-friend-functions-to-member-functions) — 캡슐화
- [Beautiful C++ 항목 14: 싱글톤 피하기](/blog/programming/cpp/beautiful-cpp/item14-avoid-singletons) — 변화에 약한 디자인의 사례
