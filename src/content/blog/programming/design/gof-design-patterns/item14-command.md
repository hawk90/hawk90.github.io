---
title: "GoF 14: Command"
date: 2026-05-01T14:00:00
description: "요청을 객체로 — undo/redo, 큐, 매크로, 로깅이 가능해진다."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 14
draft: false
---

## 한 줄 요약

> **"동작을 객체로 만들면 뒤집고 큐에 넣고 기록할 수 있다"** — undo/redo의 토대.

## 비유 — 식당 주문서

식당에서 *주문서*가 어떻게 흐르는지 봅시다. 손님이 주문하면 *주문서가 종이로* 작성됩니다. 종이가 *주방에 전달*되어 조리됩니다. *순서대로 쌓아 두고*, 바쁘면 *나중에 처리*하고, *취소도 가능*합니다.

만약 손님이 *주방에 직접 요리하라*고 외친다면 — 순서, 큐, 취소가 *불가능*합니다. *주문서라는 객체*가 있기 때문에 가능한 일들입니다.

Command가 이 *주문서*입니다.

- *손님* = Invoker (요청 발생)
- *주문서* = Command 객체
- *주방* = Receiver (실제 일 수행)
- *주문 큐* = command queue
- *취소* = undo
- *기록* = audit log

*요청을 객체로 만들면* 메모리에 *저장*되어 *나중*에, *순서대로*, *되돌리기 가능*하게 처리됩니다.

## 어떤 문제를 푸는가

요청·동작을 그냥 함수 호출로 처리하면:
- **undo 못함** — 이미 일어난 일
- **나중에 실행 못함** — 큐에 못 넣음
- **로깅·재실행 못함** — 객체가 아님

```cpp
// Bad: 즉시 호출 — 되돌릴 수 없음
button.onClick = [&] { editor.insert(0, "Hello"); };
// 사용자가 Ctrl-Z 눌렀을 때 뭘 되돌리지?
```

이걸 **객체로** 만들면 — 저장·전달·역실행이 모두 가능.

```cpp
auto cmd = std::make_unique<InsertCommand>(editor, 0, "Hello");
cmd->execute();
cmd->undo();    // ◄── 객체이기 때문에 가능
```

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item14-command.svg" alt="Command 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

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

> ⚠️ **명령이 너무 많아지면** 각 명령마다 클래스 — composition/람다로 평탄화.

## 헷갈리는 패턴과의 차이

| 비교 대상 | 무엇이 다른가 |
| --- | --- |
| [Strategy](/blog/programming/design/gof-design-patterns/item21-strategy) | Strategy는 *알고리즘 객체화*. Command는 *요청 객체화*. Strategy는 "어떻게", Command는 "무엇을". |
| [Memento](/blog/programming/design/gof-design-patterns/item18-memento) | Memento는 *상태 snapshot 저장*. Command는 *동작 자체 저장*. Undo 구현에 보통 함께 결합. |
| [Chain of Responsibility](/blog/programming/design/gof-design-patterns/item13-chain-of-responsibility) | CoR은 *요청을 핸들러 체인에 흘림*. Command는 *요청을 객체로 보관·실행*. |

판별 한 줄: *"동작을 저장, 큐, undo, 매크로로 다루고 싶다"*면 Command.

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

## 자주 보는 안티패턴

### 1. undo가 비대칭 (execute 후 상태 못 복원)

```cpp
// Bad
class SaveFileCommand : public Command {
public:
    void execute() override { file.save(); /* OS write */ }
    void undo() override { /* ??? */ }   // ◄── 디스크 쓰기를 어떻게 되돌려?
};
```

**문제**: 외부 부수효과는 undo 불가능. 명령에 undo가 있는 척하면 silent breakage.

**해결**: undo 불가능한 명령은 *구분* (예: `class IrreversibleCommand`). UI에서 "마지막 저장을 되돌릴 수 없음" 안내.

### 2. Receiver의 lifetime을 invoker가 모름

```cpp
// Bad
class History {
    std::vector<std::unique_ptr<Command>> stack;   // Command가 Receiver& 보유
};
TextEditor* e = new TextEditor;
history.execute(std::make_unique<InsertCommand>(*e, ...));
delete e;
history.undo();   // ◄── dangling reference
```

**문제**: Command가 raw reference로 Receiver를 보유 → Receiver 소멸 후 use-after-free.

**해결**: `shared_ptr`로 Receiver 공유. 또는 Receiver lifetime이 history보다 길다는 invariant 명시.

### 3. Command가 mutable 외부 상태 (재실행 불가)

```cpp
// Bad
class ConnectCommand : public Command {
    static int nextId;   // ◄── 호출마다 증가
public:
    void execute() override { connect(nextId++); }
    void undo() override { disconnect(nextId - 1); }
};
// 재실행 시: 다른 id로 connect → 의미 다름
```

**문제**: 같은 명령을 다시 실행하면 다른 결과.

**해결**: 명령 안에 모든 필요한 상태를 capture. id는 첫 execute 시점에 결정 후 멤버 저장.

### 4. 무한 undo 스택 (메모리 누수)

```cpp
class History {
    std::vector<std::unique_ptr<Command>> stack;   // 끝없이 증가
};
```

**문제**: 장시간 편집 시 OOM.

**해결**: 깊이 제한 또는 LRU 또는 *checkpoint* 후 옛 명령 압축.

### 5. redo 후 새 명령 시 redo 스택 안 비움

```cpp
class History {
    std::vector<...> undoStack, redoStack;
public:
    void execute(...) {
        cmd->execute();
        undoStack.push_back(...);
        // ◄── redoStack 안 비움 → "redo" 후 새 명령 했는데 옛 redo가 살아있음
    }
};
```

**문제**: 사용자 직관 위배 — undo 후 새 작업하면 redo 히스토리는 사라져야 함.

**해결**: 새 명령 실행 시 `redoStack.clear()`.

### 6. Command가 비즈니스 로직을 다 가짐 (Receiver가 빈 껍데기)

```cpp
// Bad
class InsertCommand : public Command {
    void execute() override {
        // 텍스트 처리, validation, network sync, ...
        // Receiver는 그냥 데이터 보관소
    }
};
```

**문제**: SRP 위반. 명령은 *호출 캡슐화*이지 *로직의 집*이 아님.

**해결**: 로직은 Receiver, Command는 어느 method를 어떤 인자로 호출할지 기록.

## Modern C++ 변형

### 1. `std::function` 람다 command

undo 없는 단순 명령은 클래스 없이 람다로.

```cpp
std::queue<std::function<void()>> taskQueue;
taskQueue.push([] { /* 작업 */ });

// undo가 필요하면 (do, undo) 쌍
struct UndoableCommand {
    std::function<void()> doIt;
    std::function<void()> undoIt;
};

std::vector<UndoableCommand> history;
history.push_back({
    [&] { editor.insert(0, "Hello"); },
    [&] { editor.erase(0, 5); }
});
```

### 2. `std::variant` + visit (sum type command)

```cpp
struct Insert { std::size_t pos; std::string text; };
struct Delete { std::size_t pos; std::string saved; };
using Cmd = std::variant<Insert, Delete>;

void execute(TextEditor& e, Cmd& c) {
    std::visit(overloaded{
        [&](Insert& i) { e.insert(i.pos, i.text); },
        [&](Delete& d) { d.saved = e.getText().substr(d.pos, d.saved.size()); e.erase(...); }
    }, c);
}

void undo(TextEditor& e, const Cmd& c) {
    std::visit(overloaded{
        [&](const Insert& i) { e.erase(i.pos, i.text.size()); },
        [&](const Delete& d) { e.insert(d.pos, d.saved); }
    }, c);
}
```

가상 함수 없이 closed-set command.

### 3. Coroutine command (long-running)

```cpp
auto longCommand() -> std::generator<Progress> {
    co_yield {.percent = 0};
    // ... step 1
    co_yield {.percent = 50};
    // ... step 2
    co_yield {.percent = 100};
}

// Invoker가 step별 yield 받아 UI 갱신
```

진행 표시 + cancel 가능한 명령.

### 4. Event sourcing (모든 명령을 append-only log)

```cpp
class EventLog {
    std::vector<Cmd> log;
public:
    void apply(TextEditor& e, Cmd c) {
        execute(e, c);
        log.push_back(std::move(c));
    }
    TextEditor replay(TextEditor initial) const {
        for (auto& c : log) execute(initial, c);
        return initial;
    }
};
```

모든 변경을 명령으로 기록 → 어느 시점이든 재구성. Git, Kafka, Redux의 핵심.

### 5. Concept-based command

```cpp
template <typename C, typename R>
concept ReversibleCommand = requires(C cmd, R& receiver) {
    cmd.execute(receiver);
    cmd.undo(receiver);
};

template <typename R, ReversibleCommand<R>... Cs>
class TypedHistory { /* ... */ };
```

가상 호출 없이 타입 안전.

### 6. CQRS — Command와 Query 분리

```cpp
// Command: 상태 변경 (반환값 없음)
struct CreateOrder { OrderId id; CustomerId customer; };

// Query: 상태 조회 (변경 없음)
struct GetOrderById { OrderId id; };
```

쓰기/읽기 모델 분리 → 확장성, audit log, 시간 여행. Marten, EventStore의 패턴.

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

## 성능 — Command 객체 비용

`insert(0, "x")` 1억 번.

| 방식 | 시간 | 메모리 | 비고 |
| --- | --- | --- | --- |
| 직접 호출 | 0.2s | 0 | baseline |
| `Command` 가상 | 1.5s | heap | 가상 + heap alloc |
| `std::function` 람다 | 1.2s | heap | function 객체 |
| `std::variant` + visit | 0.8s | stack | 정적 dispatch |
| Concept + template | 0.3s | stack | 거의 baseline |
| 메모리 풀 command | 0.8s | pool | heap alloc 회피 |

매 키 입력마다 command면 1.5s/1억 = 15ns/입력 — 사람 입력 속도엔 무의미. 그러나 게임 input handler 같은 hot path에는 variant/template 고려.

## 트레이드오프 — 한눈에

| 차원 | Command |
| --- | --- |
| undo/redo | ✅ |
| 큐잉, 매크로, 로깅 | ✅ |
| Invoker↔Receiver 결합도 | ✅ ↓ |
| 새 명령 추가 (OCP) | ✅ |
| 명령마다 클래스 | ⚠️ 단순 동작에 과도 |
| undo 구현 (메모리·역연산) | ⚠️ 까다로움 |
| 외부 부수효과 명령의 undo | ❌ 종종 불가능 |

## 실제 사례

- **모든 텍스트 에디터**의 undo/redo — VS Code, Sublime, vim
- **GUI 라이브러리**의 actions / menu items — Qt `QAction`, WPF `ICommand`
- **작업 큐, 스레드 풀** — `std::async`, ThreadPoolExecutor
- **트랜잭션 시스템** — SQL `BEGIN`/`COMMIT`/`ROLLBACK`
- **Redux** — 모든 state change가 dispatched action (Command)
- **Git** — 각 commit이 command (`revert`로 undo)
- **macOS NSUndoManager** — system-wide undo
- **Photoshop의 History** — 모든 작업이 Command
- **CQRS / Event Sourcing** — 분산 시스템 패턴
- **wayland/X11의 input events** — 이벤트 = command

## 관련 패턴

- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — MacroCommand는 Composite + Command
- **[Memento (item 18)](/blog/programming/design/gof-design-patterns/item18-memento)** — Command의 undo가 Memento에 상태 저장
- **[Prototype (item 4)](/blog/programming/design/gof-design-patterns/item04-prototype)** — 큐의 Command를 prototype에서 복제
- **[Strategy (item 21)](/blog/programming/design/gof-design-patterns/item21-strategy)** — 둘 다 객체화된 동작. Command는 요청·작업, Strategy는 알고리즘
- **[Chain of Responsibility (item 13)](/blog/programming/design/gof-design-patterns/item13-chain-of-responsibility)** — CoR이 Command를 라우팅하기도
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — Command를 중심으로 한 객체화된 동작 패턴 군집
