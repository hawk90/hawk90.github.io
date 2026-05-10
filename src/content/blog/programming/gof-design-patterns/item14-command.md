---
title: "GoF 14: Command"
date: 2026-02-03T11:00:00
description: "요청을 객체로 — undo/redo, 큐, 매크로, 로깅이 가능해진다."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 14
draft: true
---

## 한 줄 요약

> **"동작을 객체로 만들면 뒤집고 큐에 넣고 기록할 수 있다"** — undo/redo의 토대.

## 어떤 문제를 푸는가

요청·동작을 그냥 함수 호출로 처리하면:
- **undo 못함** — 이미 일어난 일
- **나중에 실행 못함** — 큐에 못 넣음
- **로깅·재실행 못함** — 객체가 아님

이걸 **객체로** 만들면 — 저장·전달·역실행이 모두 가능.

```cpp
auto cmd = std::make_unique<InsertCommand>(editor, 0, "Hello");
cmd->execute();
cmd->undo();    // ◄── 객체이기 때문에 가능
```

## 한눈에 보는 구조

```
   Client ──► Command (interface)
                  ─ execute()*
                  ─ undo()*
                       △
                       │
                ConcreteCommand ◇──► Receiver
                                       ─ action()

   Invoker ──► Command   (저장만, execute 호출)
```

- **Receiver**: 실제 동작 수행
- **Command**: Receiver 호출을 캡슐화
- **Invoker**: Command 보유·실행 (메뉴, 버튼, 큐)

## 언제 쓰면 좋은가

- **undo/redo** 지원
- 동작을 **매개변수화** (콜백을 객체로)
- 요청을 **다른 시간에 실행**·큐에 넣기
- **로깅·트랜잭션**을 위해 변경 기록

## 언제 쓰면 안 되나

> ⚠️ **단순 함수 호출**이라면 람다 + `std::function`로 충분.

> ⚠️ **undo가 어려운 동작** (외부 효과, I/O) — Memento와 결합 검토.

## C++ 구현

### 1. Command 인터페이스

```cpp
class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo()    = 0;
};
```

### 2. Receiver — 실제 동작

```cpp
class TextEditor {
    std::string text;
public:
    void insert(std::size_t pos, const std::string& s) { text.insert(pos, s); }
    void erase(std::size_t pos, std::size_t n)         { text.erase(pos, n); }
    const std::string& getText() const { return text; }
};
```

### 3. ConcreteCommand — execute + undo

```cpp
class InsertCommand : public Command {
    TextEditor& editor;
    std::size_t pos;
    std::string text;
public:
    InsertCommand(TextEditor& e, std::size_t p, std::string t)
        : editor(e), pos(p), text(std::move(t)) {}

    void execute() override { editor.insert(pos, text); }
    void undo()    override { editor.erase(pos, text.size()); }    // ◄── 역연산
};

class DeleteCommand : public Command {
    TextEditor& editor;
    std::size_t pos;
    std::size_t length;
    std::string deletedText;     // ◄── undo를 위해 저장
public:
    DeleteCommand(TextEditor& e, std::size_t p, std::size_t n)
        : editor(e), pos(p), length(n) {}

    void execute() override {
        deletedText = editor.getText().substr(pos, length);   // 저장 후
        editor.erase(pos, length);                            // 삭제
    }
    void undo() override { editor.insert(pos, deletedText); }
};
```

### 4. Invoker — 히스토리

```cpp
class History {
    std::vector<std::unique_ptr<Command>> stack;
public:
    void execute(std::unique_ptr<Command> cmd) {
        cmd->execute();
        stack.push_back(std::move(cmd));
    }

    void undo() {
        if (!stack.empty()) {
            stack.back()->undo();
            stack.pop_back();
        }
    }
};
```

### 5. 사용

```cpp
TextEditor editor;
History    history;

history.execute(std::make_unique<InsertCommand>(editor, 0, "Hello"));
history.execute(std::make_unique<InsertCommand>(editor, 5, " World"));
history.undo();    // " World" 제거
```

## 모던 변형 — `std::function` + 람다

undo 없는 단순 명령은 클래스 없이 람다로.

```cpp
std::queue<std::function<void()>> taskQueue;
taskQueue.push([] { /* 작업 */ });

// undo가 필요하면 (do, undo) 쌍
struct UndoableCommand {
    std::function<void()> doIt;
    std::function<void()> undoIt;
};
```

## 매크로 명령 (Composite + Command)

명령들을 묶어 하나의 명령처럼.

```cpp
class MacroCommand : public Command {
    std::vector<std::unique_ptr<Command>> commands;
public:
    void add(std::unique_ptr<Command> cmd) { commands.push_back(std::move(cmd)); }

    void execute() override {
        for (auto& c : commands) c->execute();
    }

    void undo() override {
        for (auto it = commands.rbegin(); it != commands.rend(); ++it)
            (*it)->undo();    // 역순으로
    }
};
```

## C 구현

```c
typedef struct Command {
    void (*execute)(struct Command*);
    void (*undo)(struct Command*);
    void (*destroy)(struct Command*);
} Command;

typedef struct {
    Command       base;
    TextEditor*   editor;
    size_t        pos;
    char          text[256];
} InsertCommand;

void insert_execute(Command* self) {
    InsertCommand* c = (InsertCommand*)self;
    editor_insert(c->editor, c->pos, c->text);
}

void insert_undo(Command* self) {
    InsertCommand* c = (InsertCommand*)self;
    editor_erase(c->editor, c->pos, strlen(c->text));
}
```

## 트레이드오프 — 한눈에

| 차원 | Command |
| --- | --- |
| undo/redo | ✅ |
| 큐잉, 매크로, 로깅 | ✅ |
| Invoker↔Receiver 결합도 | ✅ ↓ |
| 새 명령 추가 (OCP) | ✅ |
| 명령마다 클래스 | ⚠️ 단순 동작에 과도 |
| undo 구현 (메모리·역연산) | ⚠️ 까다로움 |

## 실제 사례

- **모든 텍스트 에디터**의 undo/redo
- **GUI 라이브러리**의 actions / menu items
- **작업 큐, 스레드 풀**
- **트랜잭션 시스템**

## 관련 패턴

- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — MacroCommand는 Composite + Command
- **[Memento (item 18)](/blog/programming/gof-design-patterns/item18-memento)** — Command의 undo가 Memento에 상태 저장
- **[Prototype (item 4)](/blog/programming/gof-design-patterns/item04-prototype)** — 큐의 Command를 prototype에서 복제
- **[Strategy (item 21)](/blog/programming/gof-design-patterns/item21-strategy)** — 둘 다 객체화된 동작. Command는 요청·작업, Strategy는 알고리즘
