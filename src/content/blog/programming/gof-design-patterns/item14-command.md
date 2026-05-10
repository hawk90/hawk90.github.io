---
title: "GoF 14: Command"
date: 2026-02-03T11:00:00
description: "요청을 객체로 캡슐화 — undo/redo, 큐, 매크로, 로깅 가능."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 14
draft: true
---

> **초안** — 정리 진행 중

## 의도

요청을 **객체로 캡슐화** — 매개변수화, 큐잉, 로깅, undo 등이 가능해짐.

## 동기

- undo/redo (각 명령이 자기 역연산을 알기)
- 매크로 (명령 시퀀스를 객체로)
- 작업 큐 (스레드 풀에 던질 객체)
- 트랜잭션 (모아서 한 번에)

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

// 히스토리
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

## 모던 변형 — `std::function`

단순 명령은 람다 + `std::function<void()>` 으로 충분.

```cpp
std::queue<std::function<void()>> taskQueue;
taskQueue.push([] { /* ... */ });
```

undo가 필요하면 `std::pair<std::function<void()>, std::function<void()>>` 으로 (do, undo).

## C 구현

```c
typedef struct Command {
    void (*execute)(struct Command*);
    void (*undo)(struct Command*);
} Command;

typedef struct {
    Command base;
    TextEditor* editor;
    size_t pos;
    char   text[256];
} InsertCommand;
```

## 트레이드오프

- **장점**: undo/redo, 큐잉, 로깅, 매크로
- **단점**: 명령마다 클래스, 단순 동작에 과도
