---
title: "GoF 14: Command"
date: 2026-02-03T11:00:00
description: "요청을 객체로 캡슐화 — undo/redo, 큐, 매크로, 로깅 가능."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 14
draft: true
---

## 의도

요청을 **객체로 캡슐화**해서 매개변수화·큐잉·로깅·undo가 가능하도록 합니다.

## 동기

- **undo/redo** — 각 명령이 자기 역연산을 알기
- **매크로** — 명령 시퀀스를 객체로 묶어 재실행
- **작업 큐** — 스레드 풀에 던질 객체
- **트랜잭션** — 모아서 한 번에
- **GUI 버튼/메뉴** — 클릭 시 실행할 명령을 동적으로 바인딩

## 적용 가능성

- 동작을 매개변수화하고 싶을 때 (콜백을 객체로)
- 요청을 다른 시간에 실행·큐에 넣어야 할 때
- undo를 지원해야 할 때
- 로깅·트랜잭션을 위해 변경을 기록해야 할 때

## 구조

```
   Client ──► Command (interface)
                  + execute()*
                  + undo()*
                       △
                       │
                ConcreteCommand ◇──► Receiver
                                       + action()

   Invoker ──► Command       (저장만, execute 호출)
```

## 참여자

- **Command** — 동작 인터페이스 (execute, undo)
- **ConcreteCommand** — Receiver 참조 + 동작 구현
- **Receiver** — 실제 동작 수행
- **Invoker** — Command를 보유·실행 (메뉴, 버튼, 큐)
- **Client** — ConcreteCommand를 만들어 Invoker에 등록

## C++ 구현

```cpp
class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo()    = 0;
};

class TextEditor {
    std::string text;
public:
    void insert(std::size_t pos, const std::string& s) { text.insert(pos, s); }
    void erase(std::size_t pos, std::size_t n)         { text.erase(pos, n); }
    const std::string& getText() const { return text; }
};

class InsertCommand : public Command {
    TextEditor& editor;
    std::size_t pos;
    std::string text;
public:
    InsertCommand(TextEditor& e, std::size_t p, std::string t)
        : editor(e), pos(p), text(std::move(t)) {}

    void execute() override { editor.insert(pos, text); }
    void undo()    override { editor.erase(pos, text.size()); }
};

class DeleteCommand : public Command {
    TextEditor& editor;
    std::size_t pos;
    std::size_t length;
    std::string deletedText;     // undo를 위해 저장
public:
    DeleteCommand(TextEditor& e, std::size_t p, std::size_t n)
        : editor(e), pos(p), length(n) {}

    void execute() override {
        deletedText = editor.getText().substr(pos, length);
        editor.erase(pos, length);
    }
    void undo() override { editor.insert(pos, deletedText); }
};

// Invoker — 히스토리 보유
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

// 사용
TextEditor editor;
History history;

history.execute(std::make_unique<InsertCommand>(editor, 0, "Hello"));
history.execute(std::make_unique<InsertCommand>(editor, 5, " World"));
history.undo();    // " World" 제거
```

## 모던 변형 — `std::function` + 람다

단순 명령은 클래스 없이 람다로 충분.

```cpp
std::queue<std::function<void()>> taskQueue;
taskQueue.push([] { /* 작업 */ });

// undo가 필요하면 (do, undo) 쌍
struct UndoableCommand {
    std::function<void()> doIt;
    std::function<void()> undoIt;
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

## 매크로 명령 (Composite와 결합)

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

## 결과 (트레이드오프)

**장점**
- undo/redo
- 큐잉, 매크로, 로깅, 트랜잭션
- Invoker가 Receiver를 모름 (결합도 ↓)
- 새 명령 추가가 기존 코드 수정 없이 (OCP)

**단점**
- 명령마다 클래스 (단순 동작에 과도)
- undo 구현이 까다로움 (역연산이 항상 가능한지, 메모리 비용)

## 변형

- **`std::function` 명령** — undo 불필요한 단순 케이스
- **Memento와 결합** — undo가 어려운 동작은 실행 전 상태 스냅샷
- **Macro Command** (Composite + Command)

## 알려진 사용 사례

- 모든 텍스트 에디터의 undo/redo
- GUI 라이브러리의 actions/menu items
- 작업 큐, 스레드 풀
- 트랜잭션 시스템

## 관련 패턴

- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — MacroCommand는 Composite + Command
- **[Memento (item 18)](/blog/programming/gof-design-patterns/item18-memento)** — Command의 undo가 Memento에 상태 저장
- **[Prototype (item 4)](/blog/programming/gof-design-patterns/item04-prototype)** — 큐에 들어갈 Command를 prototype에서 복제하는 경우
- **[Strategy (item 21)](/blog/programming/gof-design-patterns/item21-strategy)** — 둘 다 객체화된 동작이지만 Command는 요청·작업, Strategy는 알고리즘 선택
