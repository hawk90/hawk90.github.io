---
title: "GoF 17: Mediator"
date: 2026-02-03T14:00:00
description: "객체들의 상호작용을 중재자에 캡슐화 — 객체 간 직접 결합 제거."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 17
draft: true
---

> **초안** — 정리 진행 중

## 의도

객체들이 서로 직접 통신하지 않고 **중재자 객체를 통해서만** 상호작용. N×N 결합을 N개로 줄임.

## 동기

- GUI 다이얼로그 (위젯들 사이의 활성/비활성 의존)
- 채팅방 (사용자 ↔ 채팅방 ↔ 다른 사용자)
- ATC (각 비행기는 다른 비행기와 직접 통신 X, 관제탑이 중재)

## C++ 구현 — 채팅방

```cpp
class User;

class ChatRoom {
    std::vector<User*> users;
public:
    void addUser(User* u) { users.push_back(u); }
    void broadcast(const User* sender, const std::string& msg);
};

class User {
    std::string name;
    ChatRoom*   room;
public:
    User(std::string n, ChatRoom* r) : name(std::move(n)), room(r) {
        room->addUser(this);
    }
    void send(const std::string& msg) { room->broadcast(this, msg); }
    void receive(const User* sender, const std::string& msg) {
        std::cout << name << " got from " << sender << ": " << msg << '\n';
    }

    const std::string& getName() const { return name; }
};

void ChatRoom::broadcast(const User* sender, const std::string& msg) {
    for (User* u : users)
        if (u != sender) u->receive(sender, msg);
}
```

User들은 ChatRoom만 알면 됨. 서로 모름.

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

## Mediator vs Observer

- **Mediator**: 객체들이 mediator를 호출 (능동적)
- **Observer**: subject가 observer들에게 알림 (수동적)

자주 결합 사용.

## 트레이드오프

- **장점**: 결합도 ↓, 상호작용 캡슐화
- **단점**: mediator가 god class 될 위험
