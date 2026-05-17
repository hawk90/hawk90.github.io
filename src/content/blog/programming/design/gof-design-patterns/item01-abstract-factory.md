---
title: "GoF 1: Abstract Factory"
date: 2026-02-01T01:00:00
description: "관련된 객체 군을 한 번에 만들기 — 클라이언트는 어떤 OS·테마인지 알 필요가 없다."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 1
draft: false
---

## 한 줄 요약

> **"같이 어울려야 하는 객체들을 묶어서 만들어주는 공장"** — 클라이언트는 macOS인지 Windows인지 신경 쓰지 않고도 일관된 위젯 세트를 받습니다.

## 어떤 문제를 푸는가

크로스플랫폼 GUI를 만든다고 해봅시다.

- macOS에선 macOS 스타일의 버튼·창·메뉴
- Windows에선 Windows 스타일의 버튼·창·메뉴

그런데 두 스타일을 **섞으면 안 됩니다**. macOS 버튼 옆에 Windows 창은 어색합니다.

순진한 접근:

```cpp
// Bad: 매번 분기
void renderUI() {
    if (currentOS == OS::Mac) {
        MacButton b; b.render();
        MacWindow w; w.render();
    } else {
        WinButton b; b.render();
        WinWindow w; w.render();
    }
}
```

문제는 명확합니다.
- 새 부품마다 `if/else` 추가
- 새 OS 군이 들어오면 모든 if를 손봐야 함
- 한 곳에서 `Mac`이고 다른 곳에서 `Win`이면 시각적 불일치

클라이언트 입장에서 원하는 건 단순합니다.

- "어떤 플랫폼인지 신경 쓰지 않고 GUI 부품을 만들고 싶다"
- "한 번 정해진 군의 부품들이 자동으로 어울렸으면 좋겠다"

Abstract Factory는 **"GUI 팩토리"라는 인터페이스**를 정의하고, 플랫폼별로 그 구현(MacFactory, WinFactory)을 둡니다. 클라이언트는 팩토리 한 개만 받으면 그 군의 부품을 자유롭게 꺼내 쓸 수 있습니다.

## 한눈에 보는 구조

![Abstract Factory 구조](/images/blog/gof/diagrams/item01-abstract-factory.svg)

두 평행 계층이 핵심입니다.

- **팩토리 계층** (위) — `AbstractFactory` 인터페이스 + 군별 `MacFactory` / `WinFactory`. 어떤 군의 부품을 만들지 책임.
- **제품 계층** (아래) — `Button`/`Window` 인터페이스 + 각 군의 구현(`MacButton`, `WinButton`, ...). 부품 자체.

두 계층이 **나란히** 있어야 한다는 점이 Abstract Factory의 시그니처 — 어느 한쪽만 있으면 그건 그냥 [Factory Method](/blog/programming/design/gof-design-patterns/item03-factory-method)에 가깝습니다.

화살표 의미:
- 빈 삼각형(`△`) = **상속** (구현)
- 점선 화살표 = **생성**(팩토리가 어떤 제품을 만들어 반환하는지)

빌드/시작 시점에 `MacFactory` 또는 `WinFactory` 중 하나를 골라 클라이언트에 주면, 클라이언트는 어느 군인지 모르고도 일관된 부품 세트를 받습니다.

## 언제 쓰면 좋은가

- 시스템이 어떻게 만들어지는지 클라이언트가 **몰라야** 할 때
- **같은 군의 객체들끼리만** 함께 동작해야 할 때 (스킨, OS, DB driver 등)
- 객체 군의 구체 클래스를 노출하지 않고 인터페이스만 라이브러리로 제공할 때

## 언제 쓰면 안 되나

> ⚠️ **새 제품 종류가 자주 추가되는 도메인엔 부적합**

새 제품 종류(예: Menu)를 추가하려면 **모든 팩토리**(MacFactory, WinFactory, ...)에 `createMenu()`를 추가해야 합니다. OCP 위반.

이 패턴이 잘 어울리는 시점은 "**제품 종류는 거의 안 늘고, 제품 군만 가끔 늘어나는**" 상황입니다.

> ⚠️ **군이 단 하나뿐**이라면 그냥 직접 생성. Abstract Factory는 *최소 2개* 군이 있을 때 가치.

## C++ 구현

### 1. 추상 제품

```cpp
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
```

### 2. 구체 제품 — 군별로

```cpp
// macOS 군
class MacButton : public Button {
public:
    void render() override   { /* macOS 스타일 버튼 */ }
    void onClick() override  { /* ... */ }
};

class MacWindow : public Window {
public:
    void render() override { /* macOS 스타일 창 */ }
};

// Windows 군
class WinButton : public Button { /* Windows 스타일 */ };
class WinWindow : public Window { /* Windows 스타일 */ };
```

### 3. 추상 팩토리 + 구체 팩토리

```cpp
class GUIFactory {
public:
    virtual ~GUIFactory() = default;
    virtual std::unique_ptr<Button> createButton() = 0;
    virtual std::unique_ptr<Window> createWindow() = 0;
};

class MacFactory : public GUIFactory {
public:
    std::unique_ptr<Button> createButton() override {
        return std::make_unique<MacButton>();
    }
    std::unique_ptr<Window> createWindow() override {
        return std::make_unique<MacWindow>();
    }
};

class WinFactory : public GUIFactory {
public:
    std::unique_ptr<Button> createButton() override {
        return std::make_unique<WinButton>();
    }
    std::unique_ptr<Window> createWindow() override {
        return std::make_unique<WinWindow>();
    }
};
```

### 4. 클라이언트 — 팩토리만 알면 됨

```cpp
class Application {
    GUIFactory& factory;   // 어떤 팩토리인지는 모름
public:
    explicit Application(GUIFactory& f) : factory(f) {}

    void run() {
        auto btn = factory.createButton();
        auto win = factory.createWindow();
        btn->render();   // 자동으로 같은 스타일
        win->render();
    }
};
```

### 5. 시작점에서 한 번만 결정

```cpp
int main() {
    #ifdef __APPLE__
        MacFactory factory;
    #else
        WinFactory factory;
    #endif

    Application app(factory);
    app.run();   // OS-인지 코드는 여기뿐
}
```

이게 핵심입니다 — **OS-인지 코드가 `main`에만 존재**합니다. 나머지 모든 코드는 `GUIFactory&`만 봅니다.

## 자주 보는 안티패턴

### 1. 군이 1개뿐인데 Abstract Factory

```cpp
// Bad: WinFactory만 있는데 굳이 abstract
class GUIFactory { virtual Button* create() = 0; };
class WinFactory : public GUIFactory { /* ... */ };
// Mac, Linux는 영영 안 만들 예정
```

**문제**: 두 번째 군이 영영 안 오면 그냥 직접 생성보다 비용만 큼. YAGNI.

**해결**: 군이 실제로 둘 이상이거나 *곧* 둘 이상이 될 때만 적용.

### 2. 군별 일관성 보장 안 함 (cross-family mixing)

```cpp
// Bad: 클라이언트가 팩토리 두 개를 동시에
MacFactory mac;
WinFactory win;
auto btn = mac.createButton();
auto win_dlg = win.createWindow();   // ◄── 시각적 불일치
```

**문제**: Abstract Factory의 핵심 가치(일관성)가 무너짐.

**해결**: 팩토리는 한 곳(`main` 또는 DI container)에서만 선택하고 클라이언트엔 *하나만* 주입.

### 3. 제품 종류를 빈번히 추가 (OCP 폭발)

```cpp
class GUIFactory {
    virtual Button* createButton() = 0;
    virtual Window* createWindow() = 0;
    virtual Menu*   createMenu()   = 0;     // 새로 추가
    virtual Toolbar* createToolbar() = 0;   // 또 추가
    // ... 5개 군 × 새 메서드 = 5곳 수정
};
```

**문제**: 새 부품 하나마다 모든 팩토리 구현 수정. 부품 종류가 자주 늘면 부적합.

**해결**: 부품이 자주 늘면 [Prototype](/blog/programming/design/gof-design-patterns/item04-prototype) 기반(매핑 테이블)으로 전환. 또는 [Factory Method](/blog/programming/design/gof-design-patterns/item03-factory-method)로.

### 4. 팩토리가 자기 결과물을 알아봄 (downcast)

```cpp
// Bad: 추상 인터페이스 깨기
auto btn = factory.createButton();
auto* mac = dynamic_cast<MacButton*>(btn.get());
if (mac) mac->setShadow(...);   // ◄── 추상화 깨짐
```

**문제**: 클라이언트가 다시 구체 타입을 알게 됨 → Abstract Factory의 목적 무산.

**해결**: 차이가 인터페이스에 드러나야 하면 `Button` 인터페이스를 확장. 정말 군 특유면 별도 메서드(`MacGUIFactory::createMacButton`).

### 5. 팩토리 안에 비싼 초기화

```cpp
// Bad
class MacFactory : public GUIFactory {
public:
    MacFactory() { loadAllImages(); registerFonts(); initOpenGL(); }
};

// 매 호출 시 새로 만들면 ...
auto btn = MacFactory().createButton();   // 매번 비싼 초기화
```

**문제**: 팩토리 인스턴스화 자체가 무거우면 Singleton 또는 lazy init 필요.

**해결**: Meyers' Singleton 또는 전역 1개 인스턴스. 또는 초기화를 별도 `init()` 메서드로 분리.

### 6. abstract factory의 abstract factory (메타 팩토리)

```cpp
// Bad: 한 단계 더 추상화
class FactoryFactory {
    virtual GUIFactory* createFactory() = 0;
};
```

**문제**: 거의 항상 과설계. 두 번째 추상화 레벨은 진짜 다양한 팩토리 생성 전략이 있을 때만.

**해결**: 단순 분기로 충분.

## Modern C++ 변형

### 1. `std::variant` (C++17) — closed type set

군이 컴파일 타임에 정해져 있고 더 추가될 일 없다면 가상 함수 없이 표현 가능.

```cpp
struct MacButton { void render(); };
struct WinButton { void render(); };

using ButtonV = std::variant<MacButton, WinButton>;

ButtonV makeButton(OS os) {
    return os == OS::Mac ? ButtonV{MacButton{}} : ButtonV{WinButton{}};
}

void render(const ButtonV& b) {
    std::visit([](const auto& x) { x.render(); }, b);
}
```

가상 함수 호출 없음, 컴파일 타임 타입 체크.

### 2. `std::function` + 람다 팩토리

```cpp
struct GUIFactory {
    std::function<std::unique_ptr<Button>()> makeButton;
    std::function<std::unique_ptr<Window>()> makeWindow;
};

GUIFactory macFactory() {
    return {
        [] { return std::make_unique<MacButton>(); },
        [] { return std::make_unique<MacWindow>(); }
    };
}
```

상속 계층 없이 데이터로 팩토리 구성.

### 3. Template-based static factory

```cpp
template <typename OS>
struct GUIFactory;

template <>
struct GUIFactory<MacOS> {
    using Button = MacButton;
    using Window = MacWindow;
};

template <typename OS>
class Application {
    typename GUIFactory<OS>::Button btn;
    typename GUIFactory<OS>::Window win;
};
```

가상 호출 0, 컴파일러가 직접 인라인. OS가 컴파일 타임에 결정되는 임베디드에 적합.

### 4. Registry-based factory

```cpp
class FactoryRegistry {
    std::unordered_map<std::string,
        std::function<std::unique_ptr<GUIFactory>()>> creators;
public:
    void registerFactory(const std::string& name, auto creator) {
        creators[name] = creator;
    }
    std::unique_ptr<GUIFactory> create(const std::string& name) {
        return creators.at(name)();
    }
};
```

플러그인 시스템처럼 *런타임에 새 군이 추가*되는 경우.

### 5. Prototype 기반

매번 `new` 대신 미리 등록된 prototype을 clone — [Prototype 패턴](/blog/programming/design/gof-design-patterns/item04-prototype) 참고.

```cpp
class PrototypeFactory {
    std::unordered_map<std::string, std::unique_ptr<Button>> protos;
public:
    void register_(const std::string& key, std::unique_ptr<Button> p) {
        protos[key] = std::move(p);
    }
    std::unique_ptr<Button> create(const std::string& key) {
        return protos.at(key)->clone();
    }
};
```

런타임 종류 추가 가능 + 구현 클래스 노출 최소.

## C 구현

C에는 가상 함수가 없으므로 **함수 포인터 테이블(vtable)**로 흉내 냅니다.

```c
// 추상 제품 = vtable
typedef struct Button {
    void (*render)(struct Button* self);
    void (*on_click)(struct Button* self);
} Button;

typedef struct Window {
    void (*render)(struct Window* self);
} Window;

// 추상 팩토리 = 함수 포인터 묶음
typedef struct GUIFactory {
    Button* (*create_button)(struct GUIFactory* self);
    Window* (*create_window)(struct GUIFactory* self);
} GUIFactory;
```

macOS 구체 구현:

```c
static void mac_button_render(Button* self)   { /* ... */ }
static void mac_button_on_click(Button* self) { /* ... */ }

static Button* mac_create_button(GUIFactory* self) {
    Button* b   = malloc(sizeof(Button));
    b->render   = mac_button_render;
    b->on_click = mac_button_on_click;
    return b;
}

static Window* mac_create_window(GUIFactory* self) { /* ... */ }

GUIFactory mac_factory = {
    .create_button = mac_create_button,
    .create_window = mac_create_window,
};
```

클라이언트는 팩토리만 받으면 됨:

```c
void run(GUIFactory* factory) {
    Button* btn = factory->create_button(factory);
    btn->render(btn);
    free(btn);
}
```

## 성능 — 가상 호출 vs variant vs template

100만 번 `Button::render()` 호출.

| 방식 | 시간 | 메모리 | 비고 |
| --- | --- | --- | --- |
| 가상 함수 | 4ms | heap | 동적 dispatch + 캐시 미스 |
| `std::variant + visit` | 2ms | stack | 정적 dispatch, branch table |
| Template specialization | 1ms | inline | 컴파일 타임 |
| `std::function` | 5ms | heap | 함수 객체 오버헤드 |

성능 중요하면 variant 또는 template. 일반 GUI는 가상 호출이 충분.

## 트레이드오프 — 한눈에

| 차원 | Abstract Factory |
| --- | --- |
| 새 제품 **군** 추가 | ✅ 쉬움 (새 ConcreteFactory 하나만) |
| 새 제품 **종류** 추가 | ❌ 어려움 (모든 팩토리 수정) |
| 객체 군의 일관성 | ✅ 자동 보장 |
| 클라이언트 결합도 | ✅ 매우 낮음 (인터페이스만 봄) |
| 코드 양 | ⚠️ 늘어남 (인터페이스 + 구현) |
| Cross-family mixing 방지 | ⚠️ 클라이언트 규율 필요 |

**핵심 한 줄**: "**종류는 닫혀있고 군은 열려있는**" 도메인에 적합합니다.

## 실제 사례

- **Java AWT/Swing**의 `Toolkit` — `Toolkit.getDefaultToolkit()`이 OS별 팩토리 반환
- **Qt**의 `QStyle` 계층 — Fusion, Windows, macOS 스타일 군
- 옛 **MFC**의 plugin factory
- **C++ 표준 라이브러리**의 `std::pmr::memory_resource` — 할당기 군
- **JDBC DriverManager** — DB 종류별 Connection 팩토리
- **OpenGL 컨텍스트** — 플랫폼별 컨텍스트 생성 (`wglCreateContext`, `glXCreateContext`)
- **게임 엔진의 RHI** — Vulkan, D3D12, Metal 백엔드 군

## 관련 패턴

- **[Factory Method (item 3)](/blog/programming/design/gof-design-patterns/item03-factory-method)** — Abstract Factory의 각 `createXxx()`는 보통 Factory Method로 구현
- **[Prototype (item 4)](/blog/programming/design/gof-design-patterns/item04-prototype)** — `new` 대신 등록된 prototype을 clone하는 형태로 대체 가능
- **[Singleton (item 5)](/blog/programming/design/gof-design-patterns/item05-singleton)** — ConcreteFactory는 보통 인스턴스 하나로 충분 → Singleton과 자주 결합
- **[Builder (item 2)](/blog/programming/design/gof-design-patterns/item02-builder)** — Abstract Factory는 "어떤 군의 객체"를 만들지에 집중 / Builder는 "복잡한 객체를 단계적으로"에 집중
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — 5가지 생성 패턴의 관계 — Abstract Factory가 가장 큰 그림
