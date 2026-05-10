---
title: "GoF 18: Memento"
date: 2026-02-03T15:00:00
description: "객체 상태를 캡슐화해 외부에 저장 — undo/snapshot 가능."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 18
draft: true
---

## 의도

객체의 **내부 상태를 캡슐화**해서 외부에 저장하고, 나중에 그 상태로 복원할 수 있게 합니다 — **캡슐화를 깨지 않고**.

## 동기

undo/redo, 체크포인트, 트랜잭션 롤백, 게임 세이브 — 모두 객체 상태를 어딘가 저장해뒀다가 복원해야 함. 그러나 객체 내부를 외부에 노출하면 캡슐화가 깨짐.

Memento는 **Originator만 내용을 볼 수 있고, Caretaker는 보관만** 하는 불투명 객체.

## 적용 가능성

- 객체의 상태를 일부 또는 전부 저장해서 나중에 복원해야 할 때
- 직접 상태를 노출하면 캡슐화가 깨질 때
- 상태 저장/복원이 객체 자체의 책임이 되면 안 될 때

## 구조

```
   Caretaker        Originator
   ◇──► Memento ◄──── createMemento()
                   ──► restore(Memento)
                            │
                            ▼
                          (Memento의 private 멤버)
```

## 참여자

- **Originator** — 상태를 가진 객체. memento 만들고 복원
- **Memento** — 상태 스냅샷 — Originator만 내부 접근 가능 (friend, nested class 등)
- **Caretaker** — memento 보관, 내용은 모름

## C++ 구현

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
        friend class TextEditor;
    };

    void type(const std::string& s) {
        text.insert(cursorPos, s);
        cursorPos += s.size();
    }

    void moveCursor(std::size_t pos) { cursorPos = pos; }

    const std::string& getText() const { return text; }

    Memento save() const { return Memento(text, cursorPos); }
    void restore(const Memento& m) { text = m.state; cursorPos = m.cursor; }
};

// Caretaker — 히스토리
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

// 사용
TextEditor editor;
History    history;

history.save(editor);
editor.type("Hello");
history.save(editor);
editor.type(" World");

history.undo(editor);    // "Hello"로 돌아감
history.undo(editor);    // ""로 돌아감
```

`Memento` 생성자가 private + Originator가 friend → 외부에서 상태 못 봄. 캡슐화 유지.

## Wide vs Narrow Interface

- **Wide interface (Originator용)**: 모든 상태 접근 가능 (friend 또는 nested)
- **Narrow interface (Caretaker용)**: 보관만 가능, 내용 X

C++의 friend로 자연스럽게 표현 가능.

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

C에는 캡슐화 강제 수단이 없어 관습 의존.

## 결과 (트레이드오프)

**장점**
- 캡슐화 유지 (외부에 상태 노출 X)
- undo·체크포인트 단순 구현
- Originator의 인터페이스 단순화

**단점**
- 큰 상태는 메모리 비용
- deep copy 처리 신중히 (포인터·자원)
- caretaker가 메모리 관리 책임 (정리 시점)

## 변형

- **Incremental memento** — 전체 상태가 아닌 변경분만 (delta)
- **Persistent memento** — 디스크에 직렬화 (game save)

## Command와의 비교

- **Command**: 작업 자체를 객체로 — undo는 역연산 알고리즘
- **Memento**: 전체 상태 스냅샷 — undo는 상태 복원

큰 객체 / 복잡한 상태에선 memento가 메모리 부담이지만 단순. 작은 객체 / 명확한 역연산이 있는 경우엔 Command가 효율적.

## 알려진 사용 사례

- 모든 텍스트 에디터의 undo
- IDE의 refactoring undo
- 데이터베이스 트랜잭션의 savepoint
- 게임의 save/load 시스템
- 시뮬레이션 체크포인트

## 관련 패턴

- **[Command (item 14)](/blog/programming/gof-design-patterns/item14-command)** — Command의 undo 구현에 Memento 활용
- **[Iterator (item 16)](/blog/programming/gof-design-patterns/item16-iterator)** — Iterator의 위치를 Memento로 저장 (외부에서 보관)
- **[Prototype (item 4)](/blog/programming/gof-design-patterns/item04-prototype)** — 둘 다 객체 상태를 어떤 형태로든 보존, Prototype은 새 인스턴스 생성, Memento는 기존 인스턴스 복원
