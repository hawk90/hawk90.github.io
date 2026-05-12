---
title: "GoF 18: Memento"
date: 2026-02-03T15:00:00
description: "객체 상태를 캡슐화해 외부에 저장 — undo/snapshot 가능."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 18
---

## 한 줄 요약

> **"불투명한 상태 봉투"** — 외부에 보관하지만 안은 원래 객체만 볼 수 있다.

## 어떤 문제를 푸는가

undo/redo, 체크포인트, 게임 세이브 — 모두 **객체 상태를 어딘가 저장했다가 복원**해야 합니다.

그런데 객체 내부를 외부에 노출하면 캡슐화가 깨집니다.

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

## 실제 사례

- 모든 **텍스트 에디터의 undo**
- **IDE의 refactoring undo**
- **데이터베이스 트랜잭션**의 savepoint
- **게임의 save/load**
- **시뮬레이션 체크포인트**

## 관련 패턴

- **[Command (item 14)](/blog/programming/design/gof-design-patterns/item14-command)** — Command의 undo 구현에 Memento 활용
- **[Iterator (item 16)](/blog/programming/design/gof-design-patterns/item16-iterator)** — Iterator의 위치를 Memento로 저장 (외부 보관)
- **[Prototype (item 4)](/blog/programming/design/gof-design-patterns/item04-prototype)** — 둘 다 객체 상태 보존. Prototype은 새 인스턴스, Memento는 기존 인스턴스 복원
