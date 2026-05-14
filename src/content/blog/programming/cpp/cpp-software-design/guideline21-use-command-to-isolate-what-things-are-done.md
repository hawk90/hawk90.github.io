---
title: "가이드라인 21: 무엇을 하는가의 격리에 Command를 사용하라"
date: 2026-05-13T21:00:00
description: "Command 패턴은 동작을 객체로 만든다. undo / redo / queue / log / async 모두 std::function이 모던 구현이다."
tags: [C++, Software Design, Command, Design Patterns]
series: "C++ Software Design"
seriesOrder: 21
draft: true
---

## 왜 이 가이드라인이 중요한가?

가이드라인 19에서 Strategy는 **"어떻게(how)"** 를 격리한다고 했다. 이번 가이드라인은 그 짝이 되는 **"무엇을(what)"** 격리다.

```cpp
void save_document() { /* save */ }
void delete_file()   { /* delete */ }
void send_email()    { /* email */ }
```

함수를 직접 부르면 즉시 실행된다. 그런데 다음과 같은 요구가 들어오면 곤란해진다.

- **나중에 실행**(queue, scheduler)
- **undo / redo** 가능하게
- **로그**에 기록
- **다른 스레드**에서 실행
- **다시 실행**(replay)

함수 호출만으로는 이런 일이 어렵다. 동작 자체를 **객체**로 만들면 길이 열린다.

**Command 패턴**은 동작을 객체로 캡슐화한다. 큐, undo, async, log 같은 일반 동작 처리에 쓰는 도구다.

모던 C++에서는 `std::function`이 Command의 표준 구현이다.

## 핵심 내용

- **Command 패턴** — 동작(연산)을 객체로 캡슐화한다.
- 본질은 **"무엇을(what)"** 의 캡슐화다(Strategy의 "how"와 짝이다).
- 활용은 undo/redo, 큐, async, log, replay, scheduling 등 다양하다.
- 모던 C++ 구현은 대부분 **`std::function`** 이다.
- 가이드라인 23에서 값 기반 Command를 더 다룬다.

## 비교 — 함수 호출과 Command

### Bad — 함수를 그대로 부른다

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

// 큐로 만들고 싶다면? 어떻게?
// undo가 필요하다면? 어떻게?
```

동작이 즉시 함수 호출로 끝난다. 큐, undo, log 같은 기능을 붙일 자리가 없다.

### Good — Command 객체로 만든다

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

// 나중에 한꺼번에 실행한다
q.execute_all();
```

동작이 객체가 됐다. 큐에 담고, 나중에 실행하고, 로그를 붙이는 모든 일이 자유로워진다.

## Undo / Redo

Command의 가장 흔한 활용이다.

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

각 동작이 Command 객체로 묶이고, UndoManager가 stack에 보관한다. 모든 동작을 되돌릴 수 있다.

## std::function 기반 — 모던 스타일

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

상속과 가상 함수 없이 람다로 Command를 만든다. 값 의미론을 유지한다.

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
                cmd();     // 다른 스레드에서 실행한다
            }
        });
    }

    void enqueue(std::function<void()> cmd) {
        std::lock_guard lock(mu_);
        queue_.push(std::move(cmd));
    }
};
```

Command를 다른 스레드에서 실행한다. Producer-Consumer 패턴이다.

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

각 명령에 로그가 함께 따라간다. 디버깅과 감사에 친화적이다.

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

게임의 replay, 시뮬레이션, 테스트 자동화에 쓴다.

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

save_all.execute();     // 모두 실행한다
```

여러 Command를 한 단위로 묶는다. Composite와 Command의 결합이다.

## GUI — Command의 모범 사용

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

각 버튼이 자기 Command를 가진다. GUI 프레임워크의 표준 패턴이다.

## Command와 Strategy

```
Strategy — "어떻게(how)" 격리
  알고리즘 자체를 갈아 끼운다
  예: sort 알고리즘, 압축 방법, 비교 방식

Command — "무엇을(what)" 격리
  동작 자체를 객체로 만든다
  예: undo, queue, replay, async
```

두 패턴은 서로 보완한다. 함께 쓰는 경우도 흔하다.

## GoF Command 구조

```cpp
// Receiver — 실제 동작을 수행한다
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

GoF 패턴은 Receiver / Command / Invoker / Client의 4요소 구조다.

## 모던 — std::function이 거의 모든 것을 해준다

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

람다 하나로 Command가 끝난다. 클래스 hierarchy가 필요 없다.

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

`std::future`나 `std::packaged_task`로 풀 수도 있다.

```cpp
std::packaged_task<int()> task{[]() { return 42; }};
auto future = task.get_future();
task();
int result = future.get();
```

`std::packaged_task`는 Command와 async result를 함께 다루는 C++ 표준 도구다.

## std::function의 한계

```cpp
std::function<void()> cmd;
cmd();      // 호출
```

type erasure 비용이 있다.

- Small Buffer Optimization(SBO) — 작은 람다는 인라인으로 들어간다(보통 16~32 byte).
- 큰 람다는 heap 할당이 따라온다.
- 호출이 간접 호출이다(vtable과 비슷한 형태).

핫 패스라면 측정해 봐야 한다. 대안은 템플릿이다.

```cpp
template<typename F>
class CommandQueue {
    std::vector<F> commands_;     // F는 단일 타입
public:
    void enqueue(F f) { commands_.push_back(std::move(f)); }
};
```

단일 타입 람다만 받으면 type erasure 비용이 없다. 다양한 타입은 받지 못한다.

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

Command가 의존성을 받는다. 테스트도 쉬워진다.

## 함수형 사고 — Command와 자연스럽다

```cpp
// 함수형에서는 함수가 1급 시민이다
auto cmd = []() { /* ... */ };
auto cmd2 = compose(cmd, []() { /* ... */ });
auto cmd3 = delay(cmd, 1s);
```

함수형 언어에서는 Command가 자연스럽다. C++도 람다와 `std::function`으로 같은 사고를 한다.

## C++23 — std::function 개선

C++23에는 다음이 새로 들어왔다.

- `std::function_ref` — 비-소유 function reference(가볍다).
- `std::move_only_function` — 이동 전용 callable.

```cpp
std::move_only_function<void()> cmd = [p = std::make_unique<int>(42)]() {
    // std::function은 copyable이라 unique_ptr 캡처가 제한된다
    // move_only_function은 OK
    use(*p);
};
```

`std::function`은 copyable을 요구해서 캡처에 제한이 있다. `std::move_only_function`은 move-only다.

## 함정 — Command의 라이프타임

```cpp
void schedule() {
    auto local = std::make_unique<Widget>();
    queue.enqueue([&local]() {     // ⚠️ 참조 캡처 — 함수가 끝나면 dangling
        local->doStuff();
    });
}
```

람다가 외부 변수를 참조로 캡처하면 함수가 끝난 뒤에 사용할 때 UB가 발생한다.

해법은 값으로 캡처하는 것이다.

```cpp
void schedule() {
    auto local = std::make_shared<Widget>();
    queue.enqueue([local]() {     // 값 캡처 — shared_ptr이 복사된다
        local->doStuff();
    });
}
```

`shared_ptr` 캡처가 라이프타임을 안전하게 만든다.

## 함정 — 동기와 비동기의 구분

```cpp
queue.enqueue([&]() { save_doc(); });
// queue.execute_all() 호출 후에 save_doc이 끝났음을 보장하는가?
// 동기 큐라면 보장된다.
// 비동기 큐라면 보장되지 않는다.
```

호출 시점과 실행 시점이 분리되면 명시적 동기화가 필요하다. `std::future` 등을 쓴다.

## 함정 — Command 실패 처리

```cpp
queue.enqueue([]() {
    throw std::runtime_error("failed");
});

queue.execute_all();     // ⚠️ 예외가 전파되나? 누가 잡나?
```

Command 실행 중에 예외가 발생하면 정책을 정해야 한다.

- 무시한다(log만 남긴다).
- 큐를 정지한다.
- caller에게 전파한다.
- 재시도한다.

`std::expected<void, Error>` 반환으로 에러를 명시적으로 다룰 수도 있다.

```cpp
using FailableCommand = std::function<std::expected<void, Error>()>;
```

## State Machine과 Command

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

상태 전이가 Command로 풀린다. State 패턴과 결합한다.

## 함정 — Command 직렬화

```cpp
struct Command {
    int type;
    std::vector<std::byte> args;
};

// std::function은 직렬화하기 어렵다 (람다 캡처를 직렬화할 수 없다)
```

Command를 디스크나 네트워크로 보내려면 `std::function`은 부족하다. 명시적 데이터로 풀어야 한다.

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
// variant는 직렬화가 가능하다 (구체 타입이다)
```

variant 기반은 게임 replay, 네트워크 protocol에 어울린다.

## std::packaged_task

```cpp
std::packaged_task<int(int, int)> task{
    [](int a, int b) { return a + b; }
};
auto future = task.get_future();

task(3, 5);     // 다른 스레드에서든 같은 스레드에서든

int result = future.get();     // 8
```

Command와 Future가 함께 풀린다. async 결과를 다루기 좋다.

## std::async — Command를 자동으로 비동기로

```cpp
auto future = std::async(std::launch::async, []() {
    return expensive_calc();
});

// 다른 일을 한다
int result = future.get();
```

람다가 Command다. `async`가 자동으로 비동기 실행을 맡는다.

## 모던 변형 — std::variant 기반 Command

```cpp
struct SaveCommand   { void execute(Doc&); };
struct DeleteCommand { void execute(Doc&); };
struct InsertCommand { void execute(Doc&); };

using Command = std::variant<SaveCommand, DeleteCommand, InsertCommand>;

void execute(Doc& doc, const Command& cmd) {
    std::visit([&doc](const auto& c) { c.execute(doc); }, cmd);
}
```

variant + visit으로 닫힌 집합과 값 의미론을 함께 갖춘다. 직렬화도 가능하다. 가이드라인 23에서 더 다룬다.

## Command 패턴이 어울리는지 체크리스트

다음 중 하나라도 해당된다면 Command를 검토한다.

- [ ] undo / redo가 필요한가?
- [ ] 동작을 큐에 담아야 하는가?
- [ ] 비동기 실행이 필요한가?
- [ ] 로그에 기록해야 하는가?
- [ ] replay나 시뮬레이션이 필요한가?
- [ ] macro(여러 동작 묶음)가 필요한가?
- [ ] 다른 시점에 실행해야 하는가?
- [ ] 다른 스레드에서 실행해야 하는가?

## 실무 가이드 — Command 적용

```
"무엇을(what)"을 격리하려는가? — Command?
├── 단순히 즉시 호출이면 → 함수를 그대로 부른다
├── 큐 / 지연 / 비동기 → std::function
├── undo / redo → Command 클래스 또는 std::function 쌍
├── 로그 / 감사 → Logged wrapper
├── 직렬화 / replay → variant 기반
└── 결과 반환 → std::packaged_task, std::future
```

## 실무 가이드 — 체크리스트

- [ ] 정말 동작을 객체화할 필요가 있는가? (YAGNI)
- [ ] 대부분의 경우 `std::function`이면 충분한가?
- [ ] 단일 람다 타입에 성능이 critical하다면 템플릿으로 가는가?
- [ ] 결과 반환이 필요하면 `std::packaged_task`인가?
- [ ] 직렬화가 필요하면 variant인가?
- [ ] 라이프타임을 `shared_ptr` 캡처나 값 캡처로 보장하는가?

## 정리

**Command 패턴**은 동작을 객체로 캡슐화한다.

활용은 다음과 같다.

- Undo / Redo
- Queue / Scheduling
- Async / Threading
- Logging / Auditing
- Replay / Simulation
- Macro(Composite Commands)

모던 C++에서는 **`std::function`** 을 우선한다.

- 람다로 즉시 정의한다.
- 값 의미론을 갖는다.
- 표준 도구(`std::packaged_task`, `std::async`)와 잘 어울린다.

직렬화나 값 의미론을 더 강조한다면 **`std::variant` 기반**으로 간다(가이드라인 23).

## 관련 항목

- [가이드라인 19: Strategy](/blog/programming/cpp/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — "어떻게" 격리
- [가이드라인 22: 값 의미론](/blog/programming/cpp/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — Command의 가치
- [가이드라인 23: 값 기반 Command](/blog/programming/cpp/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — variant 구현
- [GoF Command](/blog/programming/design/gof-design-patterns/item17-command) — 원본
