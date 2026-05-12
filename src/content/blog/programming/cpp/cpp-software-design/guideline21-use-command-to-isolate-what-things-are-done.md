---
title: "가이드라인 21: 무엇을 하는가의 격리에 Command를 사용하라"
date: 2026-05-14T17:00:00
description: "Command 패턴 — 동작을 객체로. undo / redo / queue / log / async — std::function이 모던 구현."
tags: [C++, Software Design, Command, Design Patterns]
series: "C++ Software Design"
seriesOrder: 21
---

## 왜 이 가이드라인이 중요한가?

가이드라인 19 — Strategy는 **"어떻게"(how)** 격리. 이번은 — **"무엇을"(what)** 격리.

```cpp
void save_document() { /* save */ }
void delete_file()   { /* delete */ }
void send_email()    { /* email */ }
```

함수 호출 — 즉시 실행. 그러나:
- **나중에 실행** (queue, scheduler)?
- **undo / redo** 가능?
- **로그**에 기록?
- **다른 스레드**에서 실행?
- **다시 실행** (replay)?

함수 호출만으론 — 어려움. 동작을 **객체**로 만들면 — 모든 게 가능.

**Command 패턴** — 동작을 객체로 캡슐화. 큐 / undo / async / log 등 일반 동작 처리.

모던 C++ — `std::function`이 — Command의 표준 구현.

## 핵심 내용

- **Command 패턴** — 동작(연산)을 객체로 캡슐화
- 본질 — **"무엇을"(what)**을 캡슐화 (Strategy의 "how"와 대비)
- 활용 — undo/redo, 큐, async, log, replay, scheduling
- 모던 C++ 구현 — **`std::function`** (대다수)
- 가이드라인 23 — value-based Command 추가

## 비교 — 함수 호출 vs Command

### Bad: 직접 함수 호출

```cpp
void save_document();
void delete_file();
void send_email();

void on_user_action(Action a) {
    switch (a) {
        case Save:   save_document(); break;
        case Delete: delete_file(); break;
        case Email:  send_email(); break;
    }
}

// 큐로 만들고 싶다 — 어떻게?
// undo 가능하게 만들고 싶다 — 어떻게?
```

각 동작 — 함수 직접 호출. 큐 / undo / log 등 — 불가.

### Good: Command 객체

```cpp
// 모던 — std::function
class CommandQueue {
    std::queue<std::function<void()>> commands_;
public:
    void enqueue(std::function<void()> cmd) {
        commands_.push(std::move(cmd));
    }
    
    void execute_all() {
        while (!commands_.empty()) {
            commands_.front()();
            commands_.pop();
        }
    }
};

CommandQueue q;
q.enqueue([]() { save_document(); });
q.enqueue([]() { send_email(); });
q.enqueue([]() { /* 람다 — 임의 동작 */ });

// 나중에 한꺼번에 실행
q.execute_all();
```

동작이 — **객체**. 큐에 담고, 나중에 실행, 로그, 등 자유.

## Undo / Redo

Command의 가장 흔한 활용:

```cpp
class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

class InsertTextCommand : public Command {
    Document& doc_;
    std::string text_;
    int position_;
public:
    InsertTextCommand(Document& d, std::string t, int p)
        : doc_(d), text_(std::move(t)), position_(p) {}
    
    void execute() override { doc_.insert(position_, text_); }
    void undo() override { doc_.remove(position_, text_.size()); }
};

class UndoManager {
    std::stack<std::unique_ptr<Command>> history_;
public:
    void execute(std::unique_ptr<Command> cmd) {
        cmd->execute();
        history_.push(std::move(cmd));
    }
    
    void undo() {
        if (!history_.empty()) {
            history_.top()->undo();
            history_.pop();
        }
    }
};
```

각 동작 — Command 객체. UndoManager가 — stack에 보관. 모든 동작 — undo 가능.

## std::function 기반 — 모던

```cpp
struct CommandWithUndo {
    std::function<void()> execute;
    std::function<void()> undo;
};

class UndoManager {
    std::stack<CommandWithUndo> history_;
public:
    void execute(CommandWithUndo cmd) {
        cmd.execute();
        history_.push(std::move(cmd));
    }
    
    void undo() {
        if (!history_.empty()) {
            history_.top().undo();
            history_.pop();
        }
    }
};

// 사용
UndoManager mgr;

mgr.execute({
    [&doc]() { doc.insert(5, "hello"); },     // execute
    [&doc]() { doc.remove(5, 5); }            // undo
});
```

상속 / 가상 함수 없이 — 람다로 Command. value semantics.

## Async Command

```cpp
class AsyncExecutor {
    std::queue<std::function<void()>> queue_;
    std::mutex mu_;
    std::thread worker_;
public:
    AsyncExecutor() {
        worker_ = std::thread([this]() {
            while (running_) {
                std::function<void()> cmd;
                {
                    std::lock_guard lock(mu_);
                    if (queue_.empty()) continue;
                    cmd = std::move(queue_.front());
                    queue_.pop();
                }
                cmd();     // 다른 스레드에서 실행
            }
        });
    }
    
    void enqueue(std::function<void()> cmd) {
        std::lock_guard lock(mu_);
        queue_.push(std::move(cmd));
    }
};
```

Command — 다른 스레드에서 실행. Producer-Consumer 패턴.

## Command 로깅

```cpp
class LoggedCommand {
    std::function<void()> command_;
    std::string description_;
public:
    LoggedCommand(std::function<void()> c, std::string d)
        : command_(std::move(c)), description_(std::move(d)) {}
    
    void execute() {
        log("Executing: " + description_);
        command_();
        log("Completed: " + description_);
    }
};

LoggedCommand cmd{
    []() { save_document(); },
    "Save document"
};
cmd.execute();
```

각 명령 — 로그 동반. 디버깅 / 감사 친화.

## Replay 시스템

```cpp
class CommandRecorder {
    std::vector<std::function<void()>> recorded_;
public:
    void record(std::function<void()> cmd) {
        cmd();     // 실행
        recorded_.push_back(std::move(cmd));     // 기록
    }
    
    void replay() {
        for (auto& cmd : recorded_) cmd();     // 다시 실행
    }
    
    void serialize_to_disk() { /* ... */ }     // 저장
};
```

게임의 replay, 시뮬레이션, 테스트 자동화 등.

## Macro Command (Composite)

```cpp
class MacroCommand {
    std::vector<std::function<void()>> commands_;
public:
    void add(std::function<void()> cmd) {
        commands_.push_back(std::move(cmd));
    }
    
    void execute() {
        for (auto& cmd : commands_) cmd();
    }
};

MacroCommand save_all;
save_all.add([&]() { save_doc1(); });
save_all.add([&]() { save_doc2(); });
save_all.add([&]() { save_doc3(); });

save_all.execute();     // 모두 실행
```

여러 Command — 한 단위로. Composite + Command.

## GUI — Command 모범 사용

```cpp
class Button {
    std::function<void()> on_click_;
public:
    void set_action(std::function<void()> cmd) {
        on_click_ = std::move(cmd);
    }
    
    void click() {
        if (on_click_) on_click_();
    }
};

Button save_btn;
save_btn.set_action([]() { save_document(); });

Button cancel_btn;
cancel_btn.set_action([]() { discard_changes(); });
```

각 버튼 — 자기 Command. GUI 프레임워크의 표준.

## Command vs Strategy

```
Strategy — "어떻게"(how) 격리
  알고리즘 자체를 교체
  예: sort 알고리즘, 압축 방법, 비교 방식

Command — "무엇을"(what) 격리
  동작 자체를 객체로
  예: undo, queue, replay, async
```

**상호 보완**. 함께 사용도 흔함.

## GoF Command 구조

```cpp
// Receiver — 실제 동작 수행
class Light {
public:
    void on();
    void off();
};

// Command 인터페이스
class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
};

// Concrete Commands
class LightOnCommand : public Command {
    Light& light_;
public:
    explicit LightOnCommand(Light& l) : light_(l) {}
    void execute() override { light_.on(); }
};

class LightOffCommand : public Command {
    Light& light_;
public:
    explicit LightOffCommand(Light& l) : light_(l) {}
    void execute() override { light_.off(); }
};

// Invoker
class RemoteControl {
    std::unique_ptr<Command> command_;
public:
    void set_command(std::unique_ptr<Command> c) { command_ = std::move(c); }
    void press_button() { if (command_) command_->execute(); }
};
```

GoF 패턴 — Receiver / Command / Invoker / Client 구조.

## 모던 — std::function이 거의 모든 것

```cpp
class RemoteControl {
    std::function<void()> action_;
public:
    void set_action(std::function<void()> a) { action_ = std::move(a); }
    void press_button() { if (action_) action_(); }
};

Light light;
RemoteControl rc;
rc.set_action([&light]() { light.on(); });
rc.press_button();
```

람다로 — Command 즉시. 클래스 hierarchy 없음.

## Command + 결과 반환

```cpp
template<typename Result>
class CommandWithResult {
    std::function<Result()> command_;
public:
    template<typename F>
    explicit CommandWithResult(F f) : command_(std::move(f)) {}
    
    Result execute() { return command_(); }
};

CommandWithResult<int> add{[]() { return 1 + 2; }};
int r = add.execute();     // 3
```

또는 — `std::future` / `std::packaged_task`:

```cpp
std::packaged_task<int()> task{[]() { return 42; }};
auto future = task.get_future();
task();
int result = future.get();
```

`std::packaged_task` — Command + async result. C++ 표준.

## std::function의 한계

```cpp
std::function<void()> cmd;
cmd();      // 호출
```

Type erasure 비용:
- Small Buffer Optimization (SBO) — 작은 람다는 inline (보통 16~32 byte)
- 큰 람다 — heap 할당
- 호출 — 간접 (vtable과 비슷)

핫 패스 — 측정 권장. 대안: 템플릿:

```cpp
template<typename F>
class CommandQueue {
    std::vector<F> commands_;     // F는 단일 타입
public:
    void enqueue(F f) { commands_.push_back(std::move(f)); }
};
```

단일 타입 람다만 — type erasure 비용 X. 다양한 타입은 X.

## Command + 의존성 주입

```cpp
class Service {
    ILogger& logger_;
    IDatabase& db_;
public:
    Service(ILogger& l, IDatabase& d) : logger_(l), db_(d) {}
    
    void enqueue_save(std::function<void(ILogger&, IDatabase&)> cmd) {
        queue_.push([this, cmd = std::move(cmd)]() {
            cmd(logger_, db_);
        });
    }
};
```

Command가 — 의존성 받음. 테스트 가능.

## Functional Programming — Command 자연

```cpp
// 함수형: 함수 자체가 1급 시민
auto cmd = []() { /* ... */ };
auto cmd2 = compose(cmd, []() { /* ... */ });
auto cmd3 = delay(cmd, 1s);
```

함수형 언어 — Command 자연. C++도 — 람다 + `std::function`으로 가능.

## C++23 — std::function 개선

C++23:
- `std::function_ref` — non-owning function reference (lightweight)
- `std::move_only_function` — move-only callable

```cpp
std::move_only_function<void()> cmd = [p = std::make_unique<int>(42)]() {
    // unique_ptr 캡처 — std::function은 복사 가능해야 해서 X
    // move_only_function은 OK
    use(*p);
};
```

`std::function`은 — copyable 요구 (캡처 제한). `std::move_only_function`은 — move-only.

## 함정 — Command의 라이프타임

```cpp
void schedule() {
    auto local = std::make_unique<Widget>();
    queue.enqueue([&local]() {     // ⚠️ 참조 캡처 — 함수 종료 후 dangling
        local->doStuff();
    });
}
```

람다가 — 외부 변수 참조 캡처 → 함수 종료 후 사용 시 UB.

해결:

```cpp
void schedule() {
    auto local = std::make_shared<Widget>();
    queue.enqueue([local]() {     // 값 캡처 — shared_ptr 복사
        local->doStuff();
    });
}
```

`shared_ptr` 캡처 — 라이프타임 안전.

## 함정 — 동기 vs 비동기

```cpp
queue.enqueue([&]() { save_doc(); });
// queue.execute_all() 호출 후 — save_doc 완료 보장?
// 동기 큐 → 보장
// 비동기 큐 → 보장 X
```

호출 시점과 실행 시점 분리 — 명시적 동기화 필요. `std::future` 등.

## 함정 — Command 실패 처리

```cpp
queue.enqueue([]() {
    throw std::runtime_error("failed");
});

queue.execute_all();     // ⚠️ 예외 전파? 누가 처리?
```

Command 실행 중 예외 — 정책 결정:
- 무시 (log)
- 큐 정지
- caller에 전파
- 재시도

`std::expected<void, Error>` 반환으로 — 에러 명시:

```cpp
using FailableCommand = std::function<std::expected<void, Error>()>;
```

## Command for State Machines

```cpp
class StateMachine {
    std::unordered_map<Event, std::function<void()>> transitions_;
public:
    void add_transition(Event e, std::function<void()> action) {
        transitions_[e] = std::move(action);
    }
    
    void trigger(Event e) {
        if (auto it = transitions_.find(e); it != transitions_.end()) {
            it->second();
        }
    }
};
```

상태 전이 — Command로. State 패턴과 결합.

## 함정 — Command 직렬화

```cpp
struct Command {
    int type;
    std::vector<std::byte> args;
};

// std::function — 직렬화 어려움 (람다 캡처 직렬화 X)
```

Command를 — 디스크 / 네트워크에 보존하려면 — `std::function` 안 됨. 명시적 데이터:

```cpp
struct SaveCommand {
    std::string filename;
    void execute() { /* ... */ }
};

struct DeleteCommand {
    std::string path;
    void execute() { /* ... */ }
};

using Command = std::variant<SaveCommand, DeleteCommand>;
// variant — 직렬화 가능 (구체 타입)
```

variant + 직렬화 — 게임 replay, 네트워크 protocol 등에 적합.

## C++ 표준 — std::packaged_task

```cpp
std::packaged_task<int(int, int)> task{
    [](int a, int b) { return a + b; }
};
auto future = task.get_future();

task(3, 5);     // 다른 스레드 또는 같은 스레드

int result = future.get();     // 8
```

Command + Future. async 결과.

## std::async — Command 자동 비동기

```cpp
auto future = std::async(std::launch::async, []() {
    return expensive_calc();
});

// 다른 일
int result = future.get();
```

람다 = Command. async가 — 자동으로 비동기 실행.

## 모던 변형 — std::variant Command

```cpp
struct SaveCommand   { void execute(Doc&); };
struct DeleteCommand { void execute(Doc&); };
struct InsertCommand { void execute(Doc&); };

using Command = std::variant<SaveCommand, DeleteCommand, InsertCommand>;

void execute(Doc& doc, const Command& cmd) {
    std::visit([&doc](const auto& c) { c.execute(doc); }, cmd);
}
```

variant + visit — closed set, value semantics. 직렬화 가능. 가이드라인 23.

## Command 패턴 사용처 — 체크리스트

언제 Command가 적합?

- [ ] **Undo / Redo** 필요?
- [ ] 동작을 **큐**에 담아야?
- [ ] **비동기** 실행?
- [ ] **로그**에 기록?
- [ ] **Replay** / 시뮬레이션?
- [ ] **Macro** (여러 동작 묶음)?
- [ ] **다른 시점**에 실행?
- [ ] **다른 스레드**에서?

위 중 하나라도 — Command 검토.

## 실무 가이드 — Command 적용

```
"무엇을"(what)을 격리 — Command?
├── 단순 즉시 호출 — 함수 직접
├── 큐 / 지연 / 비동기 → std::function
├── undo / redo → Command 클래스 또는 std::function 쌍
├── 로그 / 감사 → Logged wrapper
├── 직렬화 / replay → variant 기반
└── 결과 반환 → std::packaged_task, std::future
```

## 실무 가이드 — 체크리스트

- [ ] 정말 동작 객체화 필요? (YAGNI)
- [ ] `std::function` — 충분한 경우 (대다수)
- [ ] 단일 람다 타입 + 성능 → 템플릿
- [ ] 결과 반환 → `std::packaged_task`
- [ ] 직렬화 → variant
- [ ] 라이프타임 — shared_ptr 캡처 또는 value 캡처

## 정리

**Command 패턴** — 동작을 객체로 캡슐화.

활용:
- Undo / Redo
- Queue / Scheduling
- Async / Threading
- Logging / Auditing
- Replay / Simulation
- Macro (Composite Commands)

모던 C++ 구현 — **`std::function`** 우선:
- 람다로 즉시 정의
- value semantics
- 표준 도구 (`std::packaged_task`, `std::async`)

직렬화 / value semantics 강조 — **`std::variant` 기반** (가이드라인 23).

## 관련 항목

- [가이드라인 19: Strategy](/blog/programming/cpp/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — "어떻게" 격리
- [가이드라인 22: value semantics](/blog/programming/cpp/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — Command의 가치
- [가이드라인 23: value-based Command](/blog/programming/cpp/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — variant 구현
- [GoF Command](/blog/programming/design/gof-design-patterns/item17-command) — 원본
