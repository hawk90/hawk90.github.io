---
title: "GoF 18: Memento"
date: 2026-02-03T15:00:00
description: "객체 상태를 캡슐화해 외부에 저장 — undo/snapshot 가능."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 18
draft: true
---

> **초안** — 정리 진행 중

## 의도

객체의 **내부 상태를 캡슐화**해서 외부에 저장 — 캡슐화를 깨지 않고. 나중에 그 상태로 복원 가능.

## 역할

- **Originator**: 상태를 가진 객체. memento 만들고 복원
- **Memento**: 상태 스냅샷 — Originator만 내부 접근 가능
- **Caretaker**: memento 보관 (내용은 모름)

## C++ 구현

```cpp
class TextEditor {
    std::string text;
public:
    class Memento {
        std::string state;
        explicit Memento(std::string s) : state(std::move(s)) {}
        friend class TextEditor;
    };

    void type(const std::string& s) { text += s; }
    const std::string& getText() const { return text; }

    Memento save() const { return Memento(text); }
    void restore(const Memento& m) { text = m.state; }
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
```

`Memento`의 생성자가 private + Originator가 friend → 외부에서 상태 못 봄. 캡슐화 유지.

## Command와의 비교

- **Command**: 작업 자체를 객체로 — undo는 역연산 알고리즘
- **Memento**: 전체 상태 스냅샷 — undo는 상태 복원

큰 객체에선 memento가 메모리 부담. 작은 객체나 정확한 undo가 어려운 경우 memento.

## C 구현

```c
typedef struct {
    char text[1024];
} EditorMemento;

typedef struct {
    char text[1024];
} TextEditor;

EditorMemento editor_save(TextEditor* e) {
    EditorMemento m;
    strcpy(m.text, e->text);
    return m;
}

void editor_restore(TextEditor* e, const EditorMemento* m) {
    strcpy(e->text, m->text);
}
```

C에는 친구 개념이 없어 캡슐화는 관습 의존.

## 트레이드오프

- **장점**: 캡슐화 유지하며 상태 외부화, undo 단순
- **단점**: 큰 상태는 메모리 비용, deep copy 처리 신중히
