---
title: "GoF 18: Memento"
date: 2026-02-01T18:00:00
description: "객체 상태를 캡슐화해 외부에 저장 — undo/snapshot 가능."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 18
draft: false
---

## 한 줄 요약

> **"불투명한 상태 봉투"** — 외부에 보관하지만 안은 원래 객체만 볼 수 있다.

## 비유 — 게임 세이브 파일

RPG 게임에서 *세이브 포인트*에 도달하면 *세이브 파일*이 생성됩니다. 캐릭터의 *위치·체력·인벤토리·퀘스트 진행도*가 모두 *한 파일*에 담깁니다.

세이브 파일은 *밀봉된 봉투* 같습니다. *외부에서 읽으면 의미를 알 수 없지만*, *게임에 다시 넣으면* 정확히 그 상태로 복원됩니다.

Memento가 이 *세이브 파일*입니다.

- *캐릭터* = Originator (원본 객체)
- *세이브 파일* = Memento (불투명한 상태 봉투)
- *세이브 슬롯 목록* = Caretaker (보관자, 내용은 모름)
- *복원* = Originator가 자기 Memento로부터 상태 되돌리기

핵심은 *Caretaker는 Memento를 보관만* 하고 *내용은 못 봅니다*. *캡슐화 유지*.

## 어떤 문제를 푸는가

undo/redo, 체크포인트, 게임 세이브 — 모두 **객체 상태를 어딘가 저장했다가 복원**해야 합니다.

그런데 객체 내부를 외부에 노출하면 캡슐화가 깨집니다.

```cpp
// Bad: 캡슐화 깨짐
class TextEditor {
public:
    std::string text;      // public — 외부에서 마음대로
    std::size_t cursorPos;
};

void undoSomething() {
    TextEditor editor;
    std::string savedText = editor.text;       // 노출
    std::size_t savedCursor = editor.cursorPos;
    // ... 수정 ...
    editor.text = savedText;                   // 외부에서 복원
    editor.cursorPos = savedCursor;
}
```

이 코드의 문제:
- `text`, `cursorPos`가 외부에 그대로 노출 → 누구나 수정 가능
- 나중에 필드가 늘면 저장 로직 모든 곳을 수정해야 함
- 저장 형식이 바뀌면 모든 호출처가 깨짐

→ **Memento**: 상태를 **불투명 객체**로 봉투 처리. Originator(원본 객체)만 내용을 볼 수 있고, Caretaker(보관자)는 그냥 보관만.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item18-memento.svg" alt="Memento 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

3개 역할:

| 역할 | 책임 |
| --- | --- |
| **Originator** | 상태를 가진 객체. memento 생성·복원 |
| **Memento** | 상태 스냅샷 — Originator만 내부 접근 |
| **Caretaker** | memento 보관 (내용 X) |

## 언제 쓰면 좋은가

- 객체 상태의 일부 또는 전부를 저장 → 나중에 복원
- 직접 상태를 노출하면 **캡슐화가 깨질** 때
- 상태 저장/복원이 객체 자체의 책임이 되면 안 될 때 (관심사 분리)

## 언제 쓰면 안 되나

> ⚠️ **큰 상태**는 메모리 비용 — incremental memento(delta만 저장) 검토.

> ⚠️ **명확한 역연산이 있는 동작**이라면 [Command](/blog/programming/design/gof-design-patterns/item14-command) 패턴이 더 효율적.

> ⚠️ **상태가 자주 바뀌고 undo가 드물면** snapshot 비용이 본전을 못 뽑습니다.

## 헷갈리는 패턴과의 차이

| 비교 대상 | 무엇이 다른가 |
| --- | --- |
| [Command](/blog/programming/design/gof-design-patterns/item14-command) | Command는 *동작 자체 저장* + undo 메서드. Memento는 *상태 snapshot 저장* + 통째 복원. Undo 구현에서 두 패턴이 *함께 사용*되거나 *대안*으로 선택. |
| [Prototype](/blog/programming/design/gof-design-patterns/item04-prototype) | Prototype도 *상태 복제*. Prototype은 *새 인스턴스 생성용*, Memento는 *기존 인스턴스 복원용*. |
| [Iterator](/blog/programming/design/gof-design-patterns/item16-iterator) | Iterator의 *현재 위치를 Memento로 저장*하는 패턴 결합. |
| 직접 deep copy | deep copy는 *외부에서 모든 멤버 복사*. Memento는 *객체 자신*이 봉투 생성 — 캡슐화 보호. |

판별 한 줄: *"객체 상태를 캡슐화 보호하면서 외부에 저장하고 싶다"*면 Memento.

## C++ 구현

### 1. Originator (TextEditor) — friend로 캡슐화

```cpp
class TextEditor {
    std::string text;
    std::size_t cursorPos = 0;
public:
    // Memento — friend로 캡슐화
    class Memento {
        std::string state;
        std::size_t cursor;
        Memento(std::string s, std::size_t c) : state(std::move(s)), cursor(c) {}
        friend class TextEditor;   // ◄── Originator만 접근
    };

    void type(const std::string& s) {
        text.insert(cursorPos, s);
        cursorPos += s.size();
    }

    Memento save() const { return Memento(text, cursorPos); }
    void restore(const Memento& m) { text = m.state; cursorPos = m.cursor; }
};
```

`Memento`의 생성자가 private + Originator가 friend → **외부에서 상태 못 봄**.

### 2. Caretaker (History)

```cpp
class History {
    std::vector<TextEditor::Memento> stack;
public:
    void save(const TextEditor& e) { stack.push_back(e.save()); }
    void undo(TextEditor& e) {
        if (!stack.empty()) {
            e.restore(stack.back());
            stack.pop_back();
        }
    }
};
```

History는 **memento를 들고만 있을 뿐** 내용을 모름.

### 3. 사용

```cpp
TextEditor editor;
History    history;

history.save(editor);
editor.type("Hello");
history.save(editor);
editor.type(" World");

history.undo(editor);    // "Hello"로 돌아감
history.undo(editor);    // ""로 돌아감
```

## Wide vs Narrow Interface

- **Wide** (Originator용): 모든 상태 접근 — friend 활용
- **Narrow** (Caretaker용): 보관만, 내용 X — public 인터페이스 최소화

C++의 friend로 자연스럽게 표현.

## 자주 보는 안티패턴

### 1. Public 필드 Memento

```cpp
// Bad: 모든 게 노출
struct Memento {
    std::string text;       // 누구나 읽고 쓸 수 있음
    std::size_t cursor;
};
```

**문제**: Caretaker가 내용을 수정해버리면 복원이 일관성 없음.

**해결**: 위 `friend class TextEditor` 패턴, 또는 PIMPL로 숨김.

### 2. Originator 책임 누락 (외부에서 직렬화)

```cpp
// Bad: Caretaker가 직접 상태를 들여다봄
void save(const TextEditor& e, std::ostream& os) {
    os << e.getText() << "\n" << e.getCursor();
}
```

**문제**: 새 필드가 추가될 때마다 직렬화 코드 수정. 캡슐화는 깨졌고 변경 비용만 늘었음.

**해결**: `save()`/`restore()`를 Originator의 책임으로.

### 3. 거대 메멘토 (전체 상태를 매번 복사)

```cpp
// Bad: 100MB 도큐먼트의 매 타이핑마다 전체 복사
class Document {
public:
    Memento save() const {
        return Memento(content);   // 100MB 복사
    }
private:
    std::string content;           // 거대
};
```

**문제**: 메모리 폭발, O(N) 복사 비용이 매 키 입력마다.

**해결**: Incremental memento(delta만 저장) — 아래 변형 참조.

### 4. 메멘토 무한 누적 (메모리 누수)

```cpp
class History {
    std::vector<Memento> stack;   // 끝없이 증가
public:
    void save(const Editor& e) { stack.push_back(e.save()); }
};
```

**문제**: 장시간 편집 시 OOM. undo 깊이 제한이 없음.

**해결**: 링 버퍼 또는 깊이 제한.

```cpp
void save(const Editor& e) {
    if (stack.size() >= 100) stack.erase(stack.begin());
    stack.push_back(e.save());
}
```

### 5. 메멘토에 raw pointer 보관 (suspended reference)

```cpp
// Bad: 원본이 사라지면 무효
class Memento {
    Editor* original;   // ◄── 위험
    int     savedValue;
};
```

**문제**: Originator가 소멸하면 메멘토가 dangling. undo 시 UB.

**해결**: 값 복사 또는 `shared_ptr` 보관.

## Modern C++ 변형

### 1. Incremental Memento (delta 저장)

거대 상태에서 매번 전체 복사를 피하기.

```cpp
struct EditOp {
    enum Type { Insert, Delete } type;
    std::size_t pos;
    std::string text;
};

class Document {
    std::string content;
    std::vector<EditOp> ops;          // 적용된 연산 history
public:
    void apply(const EditOp& op) {
        if (op.type == EditOp::Insert) content.insert(op.pos, op.text);
        else content.erase(op.pos, op.text.size());
        ops.push_back(op);
    }
    // 메멘토 = "현재 ops 길이"만
    std::size_t mark() const { return ops.size(); }
    void rollback(std::size_t mark) {
        while (ops.size() > mark) {
            auto inv = inverse(ops.back());
            content = inv.apply(content);
            ops.pop_back();
        }
    }
};
```

메멘토가 단순 `std::size_t` — 메모리 거의 0.

### 2. Copy-on-write로 큰 상태 공유

```cpp
class Document {
    std::shared_ptr<const std::string> content;
public:
    auto save() const { return content; }   // 포인터만 복사
    void restore(std::shared_ptr<const std::string> m) { content = std::move(m); }
    void edit(/* ... */) {
        // 수정 시에만 새 buffer 생성
        auto fresh = std::make_shared<std::string>(*content);
        // ... 수정 ...
        content = std::move(fresh);
    }
};
```

undo 100번이라도 같은 buffer를 가리키면 메모리 1배.

### 3. std::variant — 형 안전한 다중 상태

```cpp
using EditorMemento = std::variant<TextState, GraphicsState, AudioState>;

class Editor {
    EditorMemento save() const { /* ... */ }
    void restore(const EditorMemento& m) {
        std::visit([this](const auto& s) { applyState(s); }, m);
    }
};
```

타입별로 다른 상태를 같은 컨테이너에 저장.

### 4. Concepts — 메멘토를 가진 객체 일반화

```cpp
template <typename T>
concept Memorable = requires(const T& t, typename T::Memento m) {
    { t.save() } -> std::same_as<typename T::Memento>;
    t.restore(m);
};

template <Memorable T>
class GenericHistory {
    std::vector<typename T::Memento> stack;
public:
    void save(const T& obj) { stack.push_back(obj.save()); }
    void undo(T& obj) {
        if (!stack.empty()) { obj.restore(stack.back()); stack.pop_back(); }
    }
};
```

History를 한 번 작성하면 어떤 Memorable 객체에도 적용.

## C 구현

```c
typedef struct {
    char        text[1024];
    size_t      cursor_pos;
} EditorMemento;

typedef struct {
    char    text[1024];
    size_t  cursor_pos;
} TextEditor;

EditorMemento editor_save(const TextEditor* e) {
    EditorMemento m;
    strcpy(m.text, e->text);
    m.cursor_pos = e->cursor_pos;
    return m;
}

void editor_restore(TextEditor* e, const EditorMemento* m) {
    strcpy(e->text, m->text);
    e->cursor_pos = m->cursor_pos;
}
```

C에는 캡슐화 강제 수단이 없어 **관습 의존** (헤더에 안 노출 등).

## 성능 — 메모리 비교

100KB 도큐먼트, 1000번 undo 깊이 가정.

| 전략 | 메모리 | 저장 시간 | 복원 시간 |
| --- | --- | --- | --- |
| Full snapshot | ~100MB | O(N) per save | O(N) per restore |
| Incremental (delta) | ~1MB | O(1) per save | O(K) — K = 되돌릴 단계 |
| Copy-on-write | ~100KB + delta | O(1) shared_ptr | O(1) swap |
| Compressed snapshot | ~10MB | O(N) + compress | O(N) + decompress |

Photoshop·VS Code 등 실제 에디터는 **delta + 주기적 full snapshot** 조합 — 복원 시간 균형.

## 트레이드오프 — 한눈에

| 차원 | Memento |
| --- | --- |
| 캡슐화 유지 | ✅ 외부에 상태 노출 X |
| undo·체크포인트 | ✅ 단순 구현 |
| Originator 인터페이스 단순화 | ✅ |
| 큰 상태 메모리 비용 | ⚠️ 직렬화 비용 |
| deep copy 처리 | ⚠️ 자원·포인터 신중히 |
| Caretaker 메모리 관리 | ⚠️ 정리 시점 책임 |

## Memento vs Command — undo 두 방식

| | Memento | Command |
| --- | --- | --- |
| 저장하는 것 | 전체 상태 스냅샷 | 작업 자체 |
| undo 방법 | 상태 복원 | 역연산 실행 |
| 메모리 | 크다 (상태) | 작다 (인자만) |
| 복잡도 | 단순 | 역연산 구현 필요 |
| 적합 | 작은 객체, 복잡한 상태 변화 | 큰 객체, 명확한 역연산 |

실무에서는 **혼합** — Command의 `undo()`가 내부적으로 Memento를 저장하는 형태가 가장 흔합니다.

## 실제 사례

- **모든 텍스트 에디터의 undo** — VS Code, Sublime, vim
- **IDE의 refactoring undo** — IntelliJ, CLion
- **데이터베이스 트랜잭션**의 savepoint — SQL `SAVEPOINT`/`ROLLBACK TO`
- **게임의 save/load** — 체크포인트, quick save
- **시뮬레이션 체크포인트** — long-running simulation 복구
- **브라우저의 뒤로가기** — DOM 상태 + 스크롤 위치
- **Git의 stash** — 작업 상태를 봉투에 넣어두기

## 관련 패턴

- **[Command (item 14)](/blog/programming/design/gof-design-patterns/item14-command)** — Command의 undo 구현에 Memento 활용
- **[Iterator (item 16)](/blog/programming/design/gof-design-patterns/item16-iterator)** — Iterator의 위치를 Memento로 저장 (외부 보관)
- **[Prototype (item 4)](/blog/programming/design/gof-design-patterns/item04-prototype)** — 둘 다 객체 상태 보존. Prototype은 새 인스턴스, Memento는 기존 인스턴스 복원
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — Memento·Command·Prototype의 상태 보존 삼각형
