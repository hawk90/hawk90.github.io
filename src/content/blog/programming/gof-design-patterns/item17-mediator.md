---
title: "GoF 17: Mediator"
date: 2026-02-03T14:00:00
description: "객체들의 상호작용을 중재자에 캡슐화 — 객체 간 직접 결합 제거."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 17
draft: true
---

## 의도

객체들이 서로 직접 통신하지 않고 **중재자 객체를 통해서만** 상호작용하도록. N개 객체의 N×N 결합을 N으로 줄입니다.

## 동기

- GUI 다이얼로그 — 라디오 버튼 선택이 다른 위젯의 활성/비활성에 영향
- 채팅방 — 사용자들이 서로 직접 알지 않고 채팅방을 통해 통신
- 항공 관제(ATC) — 비행기들은 서로 직접 통신 X, 관제탑이 중재

## 적용 가능성

- 객체 집합이 잘 정의된 그러나 복잡한 방식으로 통신할 때
- 객체 재사용이 어려운 이유가 다른 객체들과의 강한 결합 때문일 때
- 여러 클래스에 분산된 동작을 서브클래싱 없이 커스터마이즈하고 싶을 때

## 구조

```
   Colleague (interface)
        △
        │
   ┌────┴────────┬───────────┐
   ColA  ColB  ColC ◇──► Mediator (interface)
                                △
                                │
                          ConcreteMediator
```

## 참여자

- **Mediator** — Colleague 통신 인터페이스
- **ConcreteMediator** — 동료들 사이 협력 구현, Colleague들 보유
- **Colleague** — Mediator를 알고 있고, 다른 colleague와 통신해야 할 때 mediator에 요청

## C++ 구현 — 채팅방

```cpp
class User;

class ChatRoom {
    std::vector<User*> users;
public:
    void addUser(User* u) { users.push_back(u); }
    void broadcast(const User* sender, const std::string& msg);
    void privateMsg(const User* sender, const std::string& target, const std::string& msg);
};

class User {
    std::string name;
    ChatRoom*   room;
public:
    User(std::string n, ChatRoom* r) : name(std::move(n)), room(r) {
        room->addUser(this);
    }

    void send(const std::string& msg)             { room->broadcast(this, msg); }
    void sendTo(const std::string& target, const std::string& msg) {
        room->privateMsg(this, target, msg);
    }

    void receive(const User* sender, const std::string& msg) {
        std::cout << name << " got from " << sender->name << ": " << msg << '\n';
    }

    const std::string& getName() const { return name; }
};

void ChatRoom::broadcast(const User* sender, const std::string& msg) {
    for (User* u : users)
        if (u != sender) u->receive(sender, msg);
}

void ChatRoom::privateMsg(const User* sender, const std::string& target, const std::string& msg) {
    for (User* u : users)
        if (u->getName() == target) { u->receive(sender, msg); break; }
}
```

User들은 ChatRoom만 알면 됨. 서로 모름 — 결합도 ↓.

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
            okButton->enable();    // 폰트 선택되면 OK 버튼 활성
        }
        // ...
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

## 결과 (트레이드오프)

**장점**
- 결합도 ↓ — 객체들이 서로 직접 알지 않음
- 상호작용을 한 곳(mediator)에 캡슐화 → 이해·변경 쉬움
- Colleague 재사용 ↑

**단점**
- Mediator가 god class 될 위험 — 모든 협력이 한 곳에 모여 비대
- 중앙 집중 — 단일 장애점

## Mediator vs Observer

- **Mediator**: 중앙 집중, 동료들이 mediator를 호출
- **Observer**: 분산, subject가 observer들에게 알림

자주 결합 — Mediator 안에서 Observer로 동료 변경 받기.

## Facade vs Mediator

- **Facade**: 클라이언트→서브시스템 (단방향 단순화)
- **Mediator**: 동료↔동료 (양방향 중재)

## 변형

- **Event bus / pub-sub** — Mediator의 일반화 (중앙 메시지 버스)
- **Observer 결합** — Mediator가 Observer 구독

## 알려진 사용 사례

- 모든 GUI 라이브러리의 다이얼로그 컨트롤러
- 채팅 시스템
- Smalltalk MVC의 Controller
- 게임의 game manager
- 항공 관제 시스템

## 관련 패턴

- **[Observer (item 19)](/blog/programming/gof-design-patterns/item19-observer)** — Mediator가 Observer로 동료 상태 변경 받음 (자주 결합)
- **[Facade (item 10)](/blog/programming/gof-design-patterns/item10-facade)** — Facade는 단방향 진입점, Mediator는 양방향 중재
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** — Mediator는 보통 단 하나만 필요
- **[Command (item 14)](/blog/programming/gof-design-patterns/item14-command)** — Mediator가 동료에게 명령을 Command 객체로 보내는 형태도 있음
