---
title: "GoF 1: Abstract Factory"
date: 2026-02-01T10:00:00
description: "관련된 객체 군을 생성하는 인터페이스 — 구체 클래스를 명시하지 않고 호환되는 객체 묶음을 만든다."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 1
draft: true
---

## 의도

서로 관련되거나 의존하는 객체들의 **군**(family)을 생성하는 인터페이스를 제공합니다. 클라이언트는 구체 클래스를 명시하지 않고도 호환되는 객체 묶음을 받을 수 있습니다.

## 동기

크로스플랫폼 GUI 라이브러리를 생각해봅시다. macOS는 macOS 스타일의 버튼·창·메뉴를 사용해야 하고, Windows는 Windows 스타일을 사용해야 합니다. **같은 군의 위젯들끼리만 어울려야** 합니다 — macOS 버튼과 Windows 창을 섞으면 어색합니다.

클라이언트 코드는 다음을 원합니다:
- "어떤 플랫폼인지 신경 쓰지 않고 GUI를 만들고 싶다"
- "한 군의 위젯들이 자동으로 매칭되었으면 좋겠다"

Abstract Factory는 "GUI 팩토리" 인터페이스를 제공하고, 플랫폼별로 그 인터페이스의 구체 구현을 둡니다.

## 적용 가능성

- 시스템이 어떻게 만들어지는지 클라이언트가 몰라야 할 때
- 같은 군의 객체들끼리만 함께 동작해야 할 때
- 객체 군의 구체 클래스를 노출하지 않고 인터페이스만 노출하고 싶을 때
- 라이브러리에서 구현은 숨기고 인터페이스만 제공해야 할 때

**부적합한 경우**: 객체 종류가 자주 추가되는 도메인. 새 제품 종류가 늘면 모든 팩토리를 수정해야 함 (OCP 위반).

## 구조

```
        AbstractFactory
        ├ createButton()
        └ createWindow()
              △
              │
   ┌──────────┴──────────┐
   MacFactory       WinFactory
   ├ createButton()  ├ createButton()
   └ createWindow()  └ createWindow()


        Button         Window
          △              △
   ┌──────┴──────┐   ┌───┴────┐
   MacButton  WinButton  MacWindow  WinWindow
```

## 참여자

- **AbstractFactory** — 추상 제품 군 생성 인터페이스 선언
- **ConcreteFactory** — 한 군에 속하는 구체 제품 객체들을 생성
- **AbstractProduct** — 한 종류의 제품 객체에 대한 인터페이스
- **ConcreteProduct** — ConcreteFactory가 생성하는 실제 제품
- **Client** — AbstractFactory와 AbstractProduct만 사용

## 협력 방식

1. 보통 런타임에 한 번만 ConcreteFactory를 생성 (Singleton인 경우 흔함)
2. Client는 AbstractFactory에게 제품 생성을 요청
3. ConcreteFactory가 동일 군에 속하는 ConcreteProduct를 반환

## C++ 구현

```cpp
// 추상 제품
class Button {
public:
    virtual ~Button() = default;
    virtual void render() = 0;
    virtual void onClick() = 0;
};

class Window {
public:
    virtual ~Window() = default;
    virtual void render() = 0;
};

// 구체 제품 — macOS 군
class MacButton : public Button {
public:
    void render() override   { /* macOS 스타일 버튼 */ }
    void onClick() override  { /* ... */ }
};

class MacWindow : public Window {
public:
    void render() override { /* macOS 스타일 창 */ }
};

// 구체 제품 — Windows 군
class WinButton : public Button { /* Windows 스타일 */ };
class WinWindow : public Window { /* Windows 스타일 */ };

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

class WinFactory : public GUIFactory {
public:
    std::unique_ptr<Button> createButton() override { return std::make_unique<WinButton>(); }
    std::unique_ptr<Window> createWindow() override { return std::make_unique<WinWindow>(); }
};

// 클라이언트
class Application {
    GUIFactory& factory;
public:
    explicit Application(GUIFactory& f) : factory(f) {}
    void run() {
        auto btn = factory.createButton();
        auto win = factory.createWindow();
        btn->render();
        win->render();
    }
};

// 시작점에서만 어떤 팩토리인지 결정
int main() {
    #ifdef __APPLE__
        MacFactory factory;
    #else
        WinFactory factory;
    #endif

    Application app(factory);
    app.run();    // 어느 OS인지 알 필요 없음
}
```

## C 구현

C에는 다형성이 없으므로 함수 포인터로 가상 함수 테이블을 흉내 냅니다.

```c
// 추상 제품 (vtable + 데이터)
typedef struct Button {
    void (*render)(struct Button* self);
    void (*on_click)(struct Button* self);
} Button;

typedef struct Window {
    void (*render)(struct Window* self);
} Window;

// 추상 팩토리
typedef struct GUIFactory {
    Button* (*create_button)(struct GUIFactory* self);
    Window* (*create_window)(struct GUIFactory* self);
} GUIFactory;

// macOS 구체 구현
static void mac_button_render(Button* self)   { /* ... */ }
static void mac_button_on_click(Button* self) { /* ... */ }

static Button* mac_create_button(GUIFactory* self) {
    Button* b = malloc(sizeof(Button));
    b->render   = mac_button_render;
    b->on_click = mac_button_on_click;
    return b;
}

static Window* mac_create_window(GUIFactory* self) { /* ... */ }

GUIFactory mac_factory = {
    .create_button = mac_create_button,
    .create_window = mac_create_window,
};

// 클라이언트
void run(GUIFactory* factory) {
    Button* btn = factory->create_button(factory);
    btn->render(btn);
    free(btn);
}
```

## 결과 (트레이드오프)

**장점**
- 구체 클래스를 클라이언트와 격리
- 객체 군의 일관성 보장 (다른 군의 객체와 섞이지 않음)
- 군 자체를 통째로 교체하기 쉬움 (런타임/빌드타임)

**단점**
- 새 제품 **종류**(예: Menu) 추가가 어려움 — 모든 ConcreteFactory와 AbstractFactory 수정 필요
- 새 제품 **군** 추가는 쉬움 — 새 ConcreteFactory만 추가

이 trade-off — "종류는 닫혀있고 군은 열려있는" — 가 도메인에 맞는지 검토.

## 변형

- **C++17 `std::variant`** — 컴파일 타임에 결정되는 닫힌 군이라면 variant + visit으로 가상 함수 없이 표현 가능
- **Prototype 기반** — Abstract Factory 메서드 안에서 미리 등록된 prototype을 clone (item 4)
- **함수 포인터 / 람다** — 단일 제품이라면 `std::function` 하나로 대체

## 알려진 사용 사례

- Java AWT/Swing의 `Toolkit`
- Qt의 `QStyle` 계층
- 옛 MFC의 `CCommandLineInfo` 패밀리
- 표준 라이브러리의 `std::pmr::memory_resource` (할당기 군)

## 관련 패턴

- **[Factory Method (item 3)](/blog/programming/gof-design-patterns/item03-factory-method)** — Abstract Factory의 각 `createXxx()` 메서드는 보통 Factory Method 패턴으로 구현됨
- **[Prototype (item 4)](/blog/programming/gof-design-patterns/item04-prototype)** — Abstract Factory가 직접 `new` 대신 등록된 prototype을 clone하는 형태로 구현 가능
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** — ConcreteFactory는 보통 단 한 번만 인스턴스화 → Singleton과 결합 빈번
- **[Builder (item 2)](/blog/programming/gof-design-patterns/item02-builder)** — Abstract Factory는 "어떤 객체"를 만들지에 집중, Builder는 "어떻게 단계적으로" 만들지에 집중
