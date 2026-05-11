---
title: "GoF 17: Mediator"
date: 2026-02-03T14:00:00
description: "객체들의 상호작용을 중재자에 캡슐화 — N×N 결합을 N으로."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 17
---

## 한 줄 요약

> **"동료들이 서로 직접 말 안 하고 중재자를 통해 협력"** — 채팅방의 중앙 서버처럼.

## 어떤 문제를 푸는가

객체 N개가 서로 직접 통신하면 — N×N 결합. 한 객체 변경이 다른 모든 객체에 영향.

- **GUI 다이얼로그** — 라디오 버튼이 다른 위젯의 활성/비활성에 영향
- **채팅방** — 사용자들이 서로 직접 알지 않고 채팅방을 통해 통신
- **항공 관제** — 비행기들이 직접 통신 X, 관제탑이 중재

→ **중재자**(Mediator)를 두고, 모든 협력을 그곳을 통해. N개 동료, 각자는 mediator만 알면 됨.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item17-mediator.svg" alt="Mediator 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

동료들은 서로를 모르고, **mediator만** 안다.

## 언제 쓰면 좋은가

- 객체 집합이 **잘 정의되어 있지만 복잡하게 통신**할 때
- 객체 재사용이 어려운 이유가 다른 객체들과의 강한 결합 때문일 때
- 여러 클래스에 분산된 동작을 서브클래싱 없이 커스터마이즈하고 싶을 때

## 언제 쓰면 안 되나

> ⚠️ **Mediator가 god class**가 될 위험. 책임이 너무 모이면 분리 검토.

> ⚠️ **단순 1:1 통신**엔 과도. 직접 호출이 명확.

## C++ 구현 — 채팅방

### 1. Mediator 클래스 (ChatRoom)

```cpp
class User;

class ChatRoom {
    std::vector<User*> users;
public:
    void addUser(User* u) { users.push_back(u); }
    void broadcast(const User* sender, const std::string& msg);
    void privateMsg(const User* sender, const std::string& target, const std::string& msg);
};
```

### 2. Colleague (User)

```cpp
class User {
    std::string name;
    ChatRoom*   room;
public:
    User(std::string n, ChatRoom* r) : name(std::move(n)), room(r) {
        room->addUser(this);
    }

    void send(const std::string& msg) {
        room->broadcast(this, msg);     // ◄── mediator를 통해
    }

    void sendTo(const std::string& target, const std::string& msg) {
        room->privateMsg(this, target, msg);
    }

    void receive(const User* sender, const std::string& msg) {
        std::cout << name << " got from " << sender->name << ": " << msg << '\n';
    }

    const std::string& getName() const { return name; }
};
```

### 3. Mediator의 협력 로직

```cpp
void ChatRoom::broadcast(const User* sender, const std::string& msg) {
    for (User* u : users)
        if (u != sender) u->receive(sender, msg);
}

void ChatRoom::privateMsg(const User* sender, const std::string& target, const std::string& msg) {
    for (User* u : users)
        if (u->getName() == target) { u->receive(sender, msg); break; }
}
```

User들은 ChatRoom만 안다 — **서로 모름**. 결합도 ↓.

## C++ 구현 — GUI 다이얼로그

```cpp
class DialogMediator {
public:
    virtual ~DialogMediator() = default;
    virtual void widgetChanged(Widget* sender) = 0;
};

class FontDialog : public DialogMediator {
    ListBox*  fontList;
    Button*   okButton;
public:
    void widgetChanged(Widget* sender) override {
        if (sender == fontList) {
            okButton->enable();    // 폰트 선택되면 OK 활성
        }
        // ... 다른 위젯들의 협력 규칙
    }
};

class Widget {
protected:
    DialogMediator* mediator;
public:
    void changed() { mediator->widgetChanged(this); }
};
```

## C 구현

```c
typedef struct ChatRoom {
    User** users;
    size_t count;
} ChatRoom;

void chat_broadcast(ChatRoom* room, User* sender, const char* msg) {
    for (size_t i = 0; i < room->count; ++i) {
        if (room->users[i] != sender)
            user_receive(room->users[i], sender, msg);
    }
}
```

## 트레이드오프 — 한눈에

| 차원 | Mediator |
| --- | --- |
| 동료 결합도 | ✅ ↓ (서로 안 알아도 됨) |
| 협력 로직 한 곳에 | ✅ 이해·변경 쉬움 |
| Colleague 재사용 | ✅ |
| Mediator 비대 위험 | ⚠️ god class |
| 단일 장애점 | ⚠️ Mediator 깨지면 전체 중단 |

## Mediator vs Observer vs Facade

| | Mediator | Observer | Facade |
| --- | --- | --- | --- |
| 방향 | 양방향 | 단방향 (subject→observer) | 단방향 (client→subsystem) |
| 통신 | 중앙 집중 | 분산 알림 | 진입점 |

## 실제 사례

- 모든 **GUI 라이브러리의 다이얼로그 컨트롤러**
- **채팅 시스템**
- **Smalltalk MVC**의 Controller
- **게임의 game manager**
- **항공 관제 시스템**

## 관련 패턴

- **[Observer (item 19)](/blog/programming/gof-design-patterns/item19-observer)** — Mediator가 Observer로 동료 변경 받음 (자주 결합)
- **[Facade (item 10)](/blog/programming/gof-design-patterns/item10-facade)** — Facade는 단방향, Mediator는 양방향
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** — Mediator는 보통 단 하나
- **[Command (item 14)](/blog/programming/gof-design-patterns/item14-command)** — Mediator가 동료에게 Command로 명령
