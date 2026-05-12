---
title: "항목 4: 자명한 getter와 setter는 피하라"
date: 2026-05-08T13:00:00
description: "자명한 접근자는 캡슐화의 환상 — 진짜 불변식을 보호하는 인터페이스를 설계하라."
tags: [C++, Encapsulation, Class Design]
series: "Beautiful C++"
seriesOrder: 4
draft: false
---

## 왜 이 항목이 중요한가?

Java/C# 영향을 받은 C++ 개발자가 가장 자주 양산하는 코드는 **모든 멤버에 getter/setter**:

```cpp
class Person {
    std::string name_;
    int age_;
public:
    std::string getName() const { return name_; }
    void setName(const std::string& n) { name_ = n; }
    int getAge() const { return age_; }
    void setAge(int a) { age_ = a; }
};
```

이 클래스는 형식상 private이지만 — **public 멤버와 다를 게 없다**. 검증도, 로깅도, 동기화도 없는 단순 통로. "캡슐화"의 본질은 데이터를 숨기는 것이 아니라 **불변식을 보호**하는 것이다. 보호할 불변식이 없으면 그냥 데이터 묶음(`struct`)으로 두는 게 정직하다.

## 핵심 내용

- 단순히 멤버를 그대로 읽고 쓰는 getter/setter는 **캡슐화의 환상**일 뿐
- 진짜 캡슐화는 **불변식(invariant)** 을 보호할 때 의미가 있다
- 자명한 접근자만 가득한 클래스는 사실상 `struct`의 우회 표현 → 그냥 public 멤버로 두거나 책임을 다시 설계하라
- setter가 필요하다면 그 객체의 **책임 분리가 잘못됐을** 수 있다 — 도메인 의도를 가진 메서드로

## 자명한 접근자 vs 진짜 캡슐화

### Bad: 의미 없는 getter/setter

```cpp
class Point {
    int x_, y_;
public:
    int getX() const { return x_; }
    int getY() const { return y_; }
    void setX(int x) { x_ = x; }
    void setY(int y) { y_ = y; }
};
```

문제:
- public 멤버와 동등한 노출 — 캡슐화 가치 0
- 코드는 4배 길고 읽기 어려움
- 사용자가 `p.setX(10); p.setY(20);` 같은 2단계 호출 — 잘못된 중간 상태 가능

### Better: 책임이 단순한 값 객체라면 struct

```cpp
struct Point {
    int x;
    int y;
};
```

도메인이 "**좌표 한 쌍**"이면 끝. 멤버에 직접 접근 OK.

### Good: 불변식이 있다면 setter는 검증 책임을 진다

```cpp
class Temperature {
    double kelvin_;
public:
    explicit Temperature(double k) { set(k); }
    
    double kelvin() const { return kelvin_; }
    
    void set(double k) {
        if (k < 0) throw std::invalid_argument("Kelvin cannot be negative");
        kelvin_ = k;
    }
    
    // 도메인 친화적 변환
    double celsius() const   { return kelvin_ - 273.15; }
    double fahrenheit() const { return celsius() * 9.0 / 5.0 + 32; }
};
```

`set()`은 **검증**을 한다 — 음수 절대온도는 물리적으로 불가능. 이게 진짜 setter의 가치.

## 도메인 메서드 vs setter

자명한 setter는 종종 **도메인 의도가 빠진 신호**다. 같은 동작을 도메인 메서드로 표현하면 코드가 훨씬 명확해진다.

```cpp
// 자명한 setter — 의도 불명
class Person {
public:
    void setName(const std::string& n);
    void setEmail(const std::string& e);
    void setActive(bool a);
    void setLastLogin(Date d);
};

person.setName("Alice");
person.setEmail("a@example.com");
person.setActive(true);
person.setLastLogin(Date::now());
```

```cpp
// 도메인 메서드 — 의도 명확
class Person {
public:
    void rename(const std::string& newName);                 // "이름 변경"의 의미
    void changeEmail(const std::string& newEmail);            // 이메일 검증 + 통지
    void login();                                              // active = true + lastLogin 갱신
    void logout();                                             // active = false
};

person.rename("Alice");
person.changeEmail("a@example.com");
person.login();      // 한 번의 호출로 일관된 상태
```

`login()`이 `setActive(true) + setLastLogin(now)`을 묶어 — 두 동작 중간의 잘못된 상태 자체가 존재 못 함. 도메인 의도가 코드에 박힌다.

## 함정 — getter도 마찬가지

```cpp
class Order {
    std::vector<Item> items_;
public:
    std::vector<Item>& getItems() { return items_; }    // ⚠️ 내부 컨테이너 노출
};

Order o;
o.getItems().push_back(item);     // 캡슐화 우회 — Order의 invariant 깨질 수 있음
o.getItems().clear();              // ...
```

자명한 getter가 내부 컨테이너에 대한 mutable reference를 반환하면 — 사용자가 객체 상태를 마음대로 변경. **항목 28**에서 자세히.

해결:

```cpp
class Order {
    std::vector<Item> items_;
public:
    // 읽기 전용 뷰
    const std::vector<Item>& items() const { return items_; }
    
    // 도메인 메서드로 변경
    void addItem(const Item& item);
    void removeItem(int id);
    void clear();
};
```

또는 C++20 `std::span<const Item>` 같은 view 타입으로 정말 read-only 보장.

## 자동화된 가짜 캡슐화 — IDE의 함정

```
[Right-click] → Generate Getter/Setter for all members
```

IDE가 자동 생성하는 boilerplate 30줄 — 도메인 의도 0. 이걸 작성한다는 건 **"내가 디자인을 안 했다"**의 신호. 작성하기 전 자문:

1. 이 멤버를 정말 외부에 노출할 필요가 있는가?
2. setter라면 — 어떤 검증/효과가 따라오는가? 그게 없다면 도메인 메서드로 묶을 수 있나?
3. getter라면 — 사용자가 그 값으로 무엇을 할 것인가? 그 동작 자체를 클래스의 메서드로 옮길 수 있나?

세 질문 다 "그냥 노출"이면 — `struct`로.

## 흔한 변형 — fluent setter (builder 패턴)

```cpp
class Config {
public:
    Config& withHost(const std::string& h) { host_ = h; return *this; }
    Config& withPort(int p)                { port_ = p; return *this; }
    Config& withTimeout(int t)             { timeout_ = t; return *this; }
    
private:
    std::string host_   = "localhost";
    int         port_   = 8080;
    int         timeout_ = 5000;
};

auto config = Config{}.withHost("example.com").withPort(9000);
```

체이닝되는 fluent setter는 **builder 패턴**의 일부. setter라기보다 "구성 단계" — 의미가 있다. 다만 builder가 끝나면 `build()` 또는 immutable로 만들어 변경 차단:

```cpp
class Config {
    // private setter들
public:
    static Builder build() { return Builder{}; }
    // const getter만 노출
};
```

C++20 designated initializers는 builder 없이도 비슷한 효과:

```cpp
auto config = Config{.host = "example.com", .port = 9000};
```

## 함정 — 외부 라이브러리/직렬화 요구

직렬화 라이브러리(ORM, JSON, protobuf 등)가 getter/setter를 요구하면 — 어쩔 수 없이 작성. 그러나 그 클래스를 도메인 객체로 쓰지 말 것 — 별도의 **DTO(Data Transfer Object)** 로 분리.

```cpp
// DTO — 직렬화 전용 (getter/setter 가득)
struct UserDTO {
    int id;
    std::string name;
    std::string email;
};

// 도메인 객체 — 도메인 메서드
class User {
    // ...
public:
    static User fromDTO(const UserDTO& dto);
    UserDTO toDTO() const;
    
    void rename(const std::string& newName);
    // 도메인 메서드들
};
```

## 모던 변형 — `const` 멤버 + 불변 객체

```cpp
class Point {
    const int x_;
    const int y_;
public:
    Point(int x, int y) : x_(x), y_(y) {}
    int x() const { return x_; }
    int y() const { return y_; }
    // setter 없음 — 한 번 만들면 변경 X
};
```

`const` 멤버로 만들면 — setter가 컴파일러에 의해 차단. 불변 객체. 단, 복사 대입 자동 생성 불가(항목 3 함정 참고).

## 실무 가이드 — 결정 트리

```
이 멤버를 외부에서 접근해야 하는가?
├── 검증/효과/도메인 의미 있음
│   └── private 멤버 + 도메인 메서드 (login(), rename() 등)
├── 단순 값 읽기만 (검증 X)
│   ├── 데이터 묶음이면 → struct
│   └── 보호할 다른 멤버 있으면 → const getter
└── 외부 라이브러리 요구 (직렬화 등)
    └── 별도 DTO로 분리
```

## 실무 가이드 — 체크리스트

- [ ] getter/setter를 일괄 자동 생성하지 않는가?
- [ ] setter에 검증 또는 부작용이 있는가? — 없으면 도메인 메서드로
- [ ] getter가 내부 mutable 참조를 반환하지 않는가?
- [ ] 단순 데이터 묶음이면 `struct`로?
- [ ] 직렬화 요구는 별도 DTO로 격리?
- [ ] 불변 객체(`const` 멤버)가 도메인에 더 맞는 경우 검토?

## 정리

**getter/setter는 불변식을 지키기 위한 도구이지 의례가 아니다.** 검증할 게 없다면 데이터 클래스로 두고, 설정이 필요하다면 도메인 의미가 담긴 메서드로 표현하라.

자명한 접근자가 가득한 클래스는:
- 캡슐화 X (사실상 public 멤버)
- 코드만 길어짐
- 도메인 의도 없음

진짜 캡슐화는 — **"이 클래스는 무엇을 책임지는가"** 의 답이다.

## 관련 항목

- [항목 3: 기본 멤버 초기화자](/blog/programming/cpp/beautiful-cpp/item03-use-default-member-initializers) — struct 패턴과 결합
- [항목 7: 지저분한 struct 캡슐화](/blog/programming/cpp/beautiful-cpp/item07-encapsulate-messy-structs) — struct가 적절한 경우
- [항목 27: 규칙 위반 캡슐화](/blog/programming/cpp/beautiful-cpp/item27-encapsulate-rule-violations) — 캡슐화의 다른 측면
