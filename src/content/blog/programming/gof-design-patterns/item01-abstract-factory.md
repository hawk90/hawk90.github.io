---
title: "GoF 1: Abstract Factory"
date: 2026-02-01T10:00:00
description: "관련 객체 군을 생성하는 인터페이스 — 구체 클래스 없이 호환되는 객체 묶음 만들기."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 1
draft: true
---

> **초안** — 정리 진행 중

## 의도

서로 관련되거나 의존하는 객체 **군**(family)을 생성하는 인터페이스를 제공 — 구체 클래스를 명시하지 않고도 호환되는 객체 묶음을 만들어냄.

## 언제 쓰나

- 시스템이 어떻게 만들어지는지 클라이언트가 몰라야 할 때
- 같은 군의 객체들끼리만 함께 동작해야 할 때 (예: macOS UI vs Windows UI)
- 라이브러리가 인터페이스만 노출하고 구현은 숨기고 싶을 때

## 구조

```
AbstractFactory  <-- ConcreteFactoryA, ConcreteFactoryB
   createA()
   createB()
       │
       ▼
   AbstractA, AbstractB  <-- ConcreteA1/A2, ConcreteB1/B2
```

## C++ 구현 (main)

```cpp
// 추상 제품
class Button { public: virtual ~Button() = default; virtual void render() = 0; };
class Window { public: virtual ~Window() = default; virtual void render() = 0; };

// 구체 제품 — macOS
class MacButton : public Button { public: void render() override { /* ... */ } };
class MacWindow : public Window { public: void render() override { /* ... */ } };

// 구체 제품 — Windows
class WinButton : public Button { public: void render() override { /* ... */ } };
class WinWindow : public Window { public: void render() override { /* ... */ } };

// 추상 팩토리
class GUIFactory {
public:
    virtual ~GUIFactory() = default;
    virtual std::unique_ptr<Button> createButton() = 0;
    virtual std::unique_ptr<Window> createWindow() = 0;
};

// 구체 팩토리
class MacFactory : public GUIFactory {
public:
    std::unique_ptr<Button> createButton() override { return std::make_unique<MacButton>(); }
    std::unique_ptr<Window> createWindow() override { return std::make_unique<MacWindow>(); }
};

// 클라이언트
void run(GUIFactory& f) {
    auto btn = f.createButton();
    auto win = f.createWindow();
    btn->render();
    win->render();
}
```

## C 구현 (sub) — 함수 포인터 vtable

```c
// 추상 제품 = 함수 포인터 테이블
typedef struct Button {
    void (*render)(struct Button*);
} Button;

// 추상 팩토리 = 함수 포인터 묶음
typedef struct GUIFactory {
    Button* (*create_button)(void);
    Window* (*create_window)(void);
} GUIFactory;

// macOS 구현
static void mac_button_render(Button* self) { /* ... */ }
static Button* mac_create_button(void) {
    Button* b = malloc(sizeof(Button));
    b->render = mac_button_render;
    return b;
}

static const GUIFactory mac_factory = {
    .create_button = mac_create_button,
    .create_window = mac_create_window,
};

// 클라이언트
void run(const GUIFactory* f) {
    Button* btn = f->create_button();
    btn->render(btn);
    free(btn);
}
```

## 트레이드오프

- **장점**: 구체 클래스 격리, 일관된 군, 교체 쉬움
- **단점**: 새 제품 종류 추가 시 모든 팩토리 수정 필요
