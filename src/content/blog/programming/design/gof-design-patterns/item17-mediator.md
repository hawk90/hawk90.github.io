---
title: "GoF 17: Mediator"
date: 2026-02-01T17:00:00
description: "객체들의 상호작용을 중재자에 캡슐화 — N×N 결합을 N으로."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 17
draft: false
---

## 한 줄 요약

> **"동료들이 서로 직접 말 안 하고 중재자를 통해 협력"** — 채팅방의 중앙 서버처럼.

## 비유 — 공항 관제탑

공항에 *수십 대의 비행기*가 동시에 이착륙합니다. 만약 *각 비행기가 다른 모든 비행기와 직접 통신*해서 *충돌을 피하려* 한다면 — N대일 때 *N(N-1)/2개*의 통신 채널이 필요합니다. 끔찍합니다.

대신 *관제탑*이 있습니다. 모든 비행기는 *관제탑하고만* 통신합니다. 관제탑이 *전체를 보고 지시*합니다. 비행기들은 *서로를 모릅니다*.

Mediator가 이 *관제탑*입니다.

- *비행기* = Colleague 객체
- *관제탑* = Mediator
- *직접 통신 없음* = Colleague끼리 참조 안 함
- *N×N → N* = 결합 폭발 해소

GUI 다이얼로그(버튼이 다른 필드에 영향), 채팅방, 워크플로우 엔진이 같은 구조입니다.

## 어떤 문제를 푸는가

객체 N개가 서로 직접 통신하면 — *N×N 결합*. 한 객체 변경이 다른 모든 객체에 영향.

- **GUI 다이얼로그** — 라디오 버튼이 다른 위젯의 활성/비활성에 영향
- **채팅방** — 사용자들이 서로 직접 알지 않고 채팅방을 통해 통신
- **항공 관제** — 비행기들이 직접 통신 X, 관제탑이 중재
- **워크플로우 엔진** — 각 단계가 서로를 모르고 엔진이 흐름 관리
- **트레이딩 시스템** — 매수/매도 주문이 직접 매칭 X, 매칭 엔진이 중재

→ **중재자**(Mediator)를 두고, 모든 협력을 그곳을 통해. N개 동료, 각자는 mediator만 알면 됨 → **N+1 결합**.

## 결합도 비교

| 구조 | 결합도 (edges) |
| --- | --- |
| 모두 직접 통신 | O(N²) |
| Mediator | O(N) |

N=10이면 직접 100, Mediator 10. *Mediator 자체*가 *N 차원에서 비대해지지만* 시스템 전체 결합은 감소.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item17-mediator.svg" alt="Mediator 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

동료들은 서로를 모르고, **mediator만** 안다.

## 언제 쓰면 좋은가

- 객체 집합이 **잘 정의되어 있지만 복잡하게 통신**할 때
- 객체 재사용이 어려운 이유가 *다른 객체들과의 강한 결합* 때문일 때
- 여러 클래스에 분산된 동작을 *서브클래싱 없이* 커스터마이즈하고 싶을 때
- *협력 규칙이 자주 바뀜* — Mediator만 수정
- *외부에서 협력을 관찰·로깅* (감사 추적 필요)

## 언제 쓰면 안 되나

> ⚠️ **Mediator가 god class**가 될 위험. 책임이 너무 모이면 분리 검토.

> ⚠️ **단순 1:1 통신**엔 과도. 직접 호출이 명확.

> ⚠️ **성능 hot path** — 모든 호출이 mediator를 거치면 추가 indirection.

> ⚠️ **동료들의 *공통 인터페이스가 자연스럽지 않으면*** — Mediator가 *type switch* 가득. 그러면 [Observer](/blog/programming/design/gof-design-patterns/item19-observer)가 나음.

## 헷갈리는 패턴과의 차이

| 비교 대상 | 무엇이 다른가 |
| --- | --- |
| [Facade](/blog/programming/design/gof-design-patterns/item10-facade) | Facade는 *외부 클라이언트를 위한 단방향 단순화*. Mediator는 *내부 객체들의 양방향 협력*. |
| [Observer](/blog/programming/design/gof-design-patterns/item19-observer) | Observer는 *주체 → 관찰자들에게 단방향 broadcast*. Mediator는 *N대N의 협력을 중재*. 종종 Observer가 *Mediator 구현에 사용*됨. |
| [Command](/blog/programming/design/gof-design-patterns/item14-command) | Command는 *요청 자체를 객체화*. Mediator는 *객체 간 협력 흐름*. |

판별 한 줄: *"객체들이 서로를 너무 많이 알고 있어 결합이 폭발한다"*면 Mediator.

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

GoF 책의 *대표 예*.

```cpp
class DialogMediator {
public:
    virtual ~DialogMediator() = default;
    virtual void widgetChanged(Widget* sender) = 0;
};

class FontDialog : public DialogMediator {
    ListBox*  fontList;
    EditBox*  sizeBox;
    Button*   okButton;
public:
    void widgetChanged(Widget* sender) override {
        if (sender == fontList) {
            sizeBox->setEnabled(fontList->hasSelection());
            okButton->setEnabled(fontList->hasSelection() && sizeBox->isValid());
        } else if (sender == sizeBox) {
            okButton->setEnabled(fontList->hasSelection() && sizeBox->isValid());
        }
        // 협력 규칙 한 곳에
    }
};

class Widget {
protected:
    DialogMediator* mediator;
public:
    void changed() { mediator->widgetChanged(this); }
};
```

→ 각 위젯은 *다른 위젯을 모름*. 다이얼로그 규칙이 *Mediator 1곳*에 집중.

## C 구현

```c
typedef struct ChatRoom {
    User** users;
    size_t count;
    size_t capacity;
} ChatRoom;

void chat_broadcast(ChatRoom* room, User* sender, const char* msg) {
    for (size_t i = 0; i < room->count; ++i) {
        if (room->users[i] != sender)
            user_receive(room->users[i], sender, msg);
    }
}

void chat_private(ChatRoom* room, User* sender, const char* target, const char* msg) {
    for (size_t i = 0; i < room->count; ++i) {
        if (strcmp(user_name(room->users[i]), target) == 0) {
            user_receive(room->users[i], sender, msg);
            return;
        }
    }
}
```

## 흔한 함정 — Anti-patterns

### 1. **God Mediator**

```cpp
class GameMediator {
public:
    void widgetChanged(Widget*);
    void networkMessage(...);
    void aiDecision(...);
    void physicsCollision(...);
    void audioEvent(...);
    void scoreUpdate(...);
    void achievementUnlocked(...);
    void renderFrame(...);
    // 50+ 메서드...
};
```

→ 책임 분리. *GUI Mediator*, *Network Mediator*, *Game Logic Mediator* 등.

### 2. **Mediator가 *동료의 detail*에 의존**

```cpp
class DialogMediator {
    void widgetChanged(Widget* sender) {
        if (sender == fontList) {
            // ❌ private 멤버에 접근, internal state 알아야 함
            if (fontList->m_internal_cache.size() > 0) ...
        }
    }
};
```

→ Mediator가 *동료의 public API*만 사용해야. 그러지 않으면 *변경 cascade*.

### 3. **동료들이 *mediator를 우회***

```cpp
// 회피
void Button::onClick() {
    fontList->refresh();    // ❌ 직접 다른 동료 호출
    mediator->widgetChanged(this);    // 또 mediator도
}
```

→ 모든 협력은 *mediator를 통해서만*. 우회 시작하면 패턴 의미 없음.

### 4. **Mediator를 *동료가 알 필요 없는 정보*로 오염**

```cpp
class DialogMediator {
    // 회피 — 비즈니스 로직까지
    void widgetChanged(Widget* sender) {
        if (sender == saveButton) {
            db.transaction([&] { ... });    // ❌ DB 트랜잭션이 mediator에
            sendEmail(...);                  // ❌ 알림이 mediator에
        }
    }
};
```

→ Mediator는 *위젯 간 협력*만. DB·네트워크는 *별도 service*에.

### 5. **2개 동료뿐인데 Mediator 도입**

```cpp
// 회피
class TwoButtonMediator {
    Button* a;
    Button* b;
    void changed(Widget*) { /* 단순 동기화 */ }
};
```

→ 2개면 *직접 호출*이 단순. 3개 이상 + 양방향이면 Mediator.

## Modern C++ 변형

### 1. *Event bus + std::function*

핸들러를 *함수 객체*로 등록.

```cpp
class EventBus {
    std::unordered_map<std::string, std::vector<std::function<void(const Event&)>>> subscribers;
public:
    void subscribe(const std::string& topic, std::function<void(const Event&)> handler) {
        subscribers[topic].push_back(std::move(handler));
    }

    void publish(const std::string& topic, const Event& e) {
        for (auto& h : subscribers[topic]) h(e);
    }
};
```

→ Mediator + Observer 결합 형태. *느슨한 topic 기반 협력*.

### 2. *Signals & Slots* (Qt 스타일)

```cpp
// Boost.Signals2
boost::signals2::signal<void(int)> sliderChanged;

label->connect(sliderChanged, [&](int v) { label->setText(std::to_string(v)); });
display->connect(sliderChanged, [&](int v) { display->update(v); });

sliderChanged(42);    // 모든 슬롯 호출
```

→ 본질적으로 Observer지만 *signal*이 mediator 역할을 일부.

### 3. *coroutine 기반 협력*

비동기 협력을 *coroutine으로 직접 표현*.

```cpp
Task<void> dialogFlow(Mediator& m) {
    auto choice = co_await m.waitForUserChoice();
    co_await m.validateInput(choice);
    co_await m.submitForm(choice);
}
```

→ 순차적 협력을 *flat code*로.

## Mediator vs Observer vs Facade

| | Mediator | Observer | Facade |
| --- | --- | --- | --- |
| 방향 | **양방향** | 단방향 (subject→observer) | 단방향 (client→subsystem) |
| 통신 | 중앙 집중 | 분산 알림 | 진입점 |
| 동료가 *mediator/subject*를 알아야? | ✅ (mediator) | ✅ (subject) | ❌ |
| 동료 간 *명시적 협력*? | ✅ | ❌ (느슨한 알림만) | N/A |
| 인스턴스 수 | 보통 1 | 1 subject + N observer | 1 |

## 트레이드오프 — 한눈에

| 차원 | Mediator |
| --- | --- |
| 동료 결합도 | ✅ ↓ (서로 안 알아도 됨) |
| 협력 로직 한 곳에 | ✅ 이해·변경 쉬움 |
| Colleague 재사용 | ✅ (다른 dialog에 동일 위젯 재사용 가능) |
| 외부에서 협력 관찰·로깅 | ✅ |
| Mediator 비대 위험 | ⚠️ god class |
| 단일 장애점 | ⚠️ Mediator 깨지면 전체 중단 |
| 협력 흐름 추적 | ⚠️ 모든 통신이 mediator 거침 |
| 성능 hot path | ⚠️ 추가 indirection |
| Mediator 자체 테스트 | ⚠️ 많은 동료 mock 필요 |

## 실제 사례

### GUI

- **모든 GUI 라이브러리의 다이얼로그 컨트롤러**
- **Smalltalk MVC의 Controller**
- **iOS UIViewController** — view들의 협력 mediator
- **Android Activity / Fragment**

### 통신 / 메시징

- **채팅 시스템** (Slack, Discord 백엔드)
- **메시지 브로커** (Kafka, RabbitMQ — *느슨한 mediator*)
- **gRPC interceptor chain**

### 게임 / 시뮬레이션

- **Game Manager** (Unity, Unreal)
- **항공 관제 시스템**
- **트래픽 시뮬레이션** — 신호등 mediator

### 시스템

- **Workflow engine** (Airflow, Temporal)
- **트레이딩 시스템 매칭 엔진**
- **DI 컨테이너** (광의의 mediator)

## 관련 패턴

- **[Observer (item 19)](/blog/programming/design/gof-design-patterns/item19-observer)** — Mediator가 Observer로 동료 변경 받음 (자주 결합)
- **[Facade (item 10)](/blog/programming/design/gof-design-patterns/item10-facade)** — Facade는 *단방향*, Mediator는 *양방향*
- **[Singleton (item 5)](/blog/programming/design/gof-design-patterns/item05-singleton)** — Mediator는 보통 단 하나
- **[Command (item 14)](/blog/programming/design/gof-design-patterns/item14-command)** — Mediator가 동료에게 Command로 명령
- **[item 24 — 전체 관계도](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — Mediator ↔ Observer는 *complex dependency management* 관계
