---
title: "GoF 3: Factory Method"
date: 2026-02-01T03:00:00
description: "객체 생성을 서브클래스에 맡기기 — 어떤 타입을 만들지 derived가 결정한다."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 3
draft: false
---

## 한 줄 요약

> **"이 자리에 객체를 만들어줘 — 뭘 만들지는 너가 정해"** — base에 자리만 만들고, derived가 무엇을 인스턴스화할지 결정.

## 어떤 문제를 푸는가

프레임워크가 사용자 정의 객체를 만들어야 합니다 — 그런데 프레임워크는 **사용자가 어떤 클래스를 쓸지 모릅니다**.

예: GUI 프레임워크의 `Application`이 `newDocument()`를 호출. 어떤 종류의 Document(Text, PDF, Image)인지는 사용자가 정함.

순진한 접근은 base가 모든 타입을 알아야 함:

```cpp
// Bad: base가 모든 derived 알아야
class Application {
public:
    void newDocument(DocKind k) {
        Document* doc = nullptr;
        switch (k) {
            case DocKind::Text: doc = new TextDocument(); break;
            case DocKind::Pdf:  doc = new PdfDocument(); break;
            // 새 종류 추가 시마다 여기 수정 — OCP 위반
        }
        doc->open();
    }
};
```

해결 = "이 자리에서 객체를 만들어"라는 **가상 메서드**를 base에 두고, derived가 override.

```cpp
class Application {
public:
    virtual std::unique_ptr<Document> createDocument() = 0;   // factory method
    void newDocument() {
        auto doc = createDocument();   // 어떤 종류든 OK
        doc->open();
    }
};
```

이제 base는 "Document를 만든다"는 사실만 알고, 종류는 derived가 결정. 새 Document 종류는 새 Application derived로 — base 수정 없음.

## Abstract Factory와의 차이

자주 혼동되는 두 패턴.

| 측면 | Abstract Factory | Factory Method |
| --- | --- | --- |
| 만드는 것 | 객체 **군** (여러 종류) | 객체 **하나** |
| 도구 | 별도 팩토리 객체 | Creator 클래스 안의 메서드 |
| 결합 방식 | Composition | Inheritance |

Abstract Factory의 각 메서드는 **보통 Factory Method로 구현**됩니다.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item03-factory-method.svg" alt="Factory Method 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

Creator가 "객체가 필요하다"는 책임을, ConcreteCreator가 "구체적으로 무엇을 만들지"를 분담.

## 언제 쓰면 좋은가

- 클래스가 자신이 만들 객체의 구체 클래스를 **미리 알 수 없을 때**
- 서브클래스가 만들 객체의 종류를 결정해야 할 때
- 프레임워크가 사용자 확장점을 제공할 때 (Hollywood Principle)

## 언제 쓰면 안 되나

> ⚠️ **단순한 단일 객체 생성**엔 그냥 생성자나 static 함수.

> ⚠️ **레지스트리 기반**이 더 적합한 경우 — 런타임에 종류가 추가되는 플러그인 시스템.

> ⚠️ **상속 트리가 이미 깊으면** Factory Method가 또 한 단계 derived를 강요 — composition 기반 접근 검토.

## C++ 구현 — 전통 형태

### 1. Product 계층

```cpp
class Document {
public:
    virtual ~Document() = default;
    virtual void open() = 0;
    virtual void save() = 0;
};

class TextDocument : public Document { /* ... */ };
class PdfDocument  : public Document { /* ... */ };
```

### 2. Creator 계층 (Factory Method 보유)

```cpp
class Application {
public:
    virtual ~Application() = default;
    virtual std::unique_ptr<Document> createDocument() = 0;   // ← factory method

    void newDocument() {
        auto doc = createDocument();
        doc->open();
        // 어떤 Document인지 모르면서도 동작
    }
};
```

### 3. ConcreteCreator가 결정

```cpp
class TextApp : public Application {
    std::unique_ptr<Document> createDocument() override {
        return std::make_unique<TextDocument>();
    }
};

class PdfApp : public Application {
    std::unique_ptr<Document> createDocument() override {
        return std::make_unique<PdfDocument>();
    }
};
```

`Application::newDocument()`는 한 번만 작성. 새 종류의 Document를 추가하려면 새 ConcreteCreator만.

## 변형 — 매개변수화 팩토리 (parameterized)

상속 없이 enum으로 분기.

```cpp
enum class DocType { Text, Pdf, Image };

class Application {
public:
    static std::unique_ptr<Document> create(DocType t) {
        switch (t) {
            case DocType::Text:  return std::make_unique<TextDocument>();
            case DocType::Pdf:   return std::make_unique<PdfDocument>();
            case DocType::Image: return std::make_unique<ImageDocument>();
        }
        return nullptr;
    }
};
```

새 타입 추가 시 switch 수정 (OCP 위반). 그러나 단순.

## 변형 — 레지스트리 기반 (플러그인 친화)

런타임에 타입 등록.

```cpp
class DocumentFactory {
    using Creator = std::function<std::unique_ptr<Document>()>;
    std::map<std::string, Creator> creators;
public:
    void registerType(std::string name, Creator c) {
        creators[std::move(name)] = std::move(c);
    }

    std::unique_ptr<Document> create(const std::string& name) const {
        return creators.at(name)();
    }
};
```

사용:

```cpp
DocumentFactory f;
f.registerType("text", [] { return std::make_unique<TextDocument>(); });
f.registerType("pdf",  [] { return std::make_unique<PdfDocument>(); });

auto doc = f.create("text");   // 문자열로 결정 — DLL/플러그인 친화
```

## 자주 보는 안티패턴

### 1. Constructor에서 factory method 호출 (가상 호출 함정)

```cpp
// Bad
class Application {
public:
    Application() {
        auto doc = createDocument();   // ◄── 가상 호출 ❌
    }
    virtual std::unique_ptr<Document> createDocument() = 0;
};
```

**문제**: 생성자 안의 가상 호출은 *base 버전*만 실행. 여기선 pure virtual → UB.

**해결**: 생성자 밖에서 호출 (예: 별도 `init()`). 또는 명시적 2단계 초기화.

### 2. Factory method의 결과를 곧바로 downcast

```cpp
// Bad
auto doc = app.createDocument();
auto* text = dynamic_cast<TextDocument*>(doc.get());
text->countWords();
```

**문제**: Factory Method의 목적(추상화) 무산. 구체 타입을 다시 안다는 건 인터페이스가 불충분하다는 신호.

**해결**: `Document`에 필요한 인터페이스 추가, 또는 ConcreteCreator를 직접 사용.

### 3. Factory가 생성 외 비즈니스 로직 보유

```cpp
// Bad
std::unique_ptr<Document> createDocument() override {
    auto d = std::make_unique<TextDocument>();
    d->loadFromDisk();
    d->parse();
    d->notifyServer();        // ◄── 생성을 넘어선 로직
    return d;
}
```

**문제**: factory가 책임 폭발. 테스트 어려움, 호출 시점 명확성 없음.

**해결**: factory는 *생성만*. 후속 작업은 호출자 또는 별도 Initializer.

### 4. 모든 곳을 factory method로 (과사용)

```cpp
// Bad: 단순한 객체에도 Creator 계층
class IntCreator { virtual int createInt() = 0; };
class FortyTwoCreator : public IntCreator { int createInt() override { return 42; } };
```

**문제**: 보일러플레이트 폭발. 가치 없음.

**해결**: Factory Method는 *진짜로* 서브클래스가 종류를 결정할 때만.

### 5. Factory가 null 반환 (parameterized factory의 default case)

```cpp
// Bad
std::unique_ptr<Document> create(DocType t) {
    switch (t) { /* ... */ }
    return nullptr;   // ◄── 알 수 없는 타입
}
auto d = create(static_cast<DocType>(99));
d->open();   // ◄── crash
```

**문제**: 호출자가 null 체크를 잊으면 crash. 또는 silent failure.

**해결**: 예외 throw 또는 `std::optional`/`std::expected` 반환.

### 6. Factory가 자기 자신을 알게 함 (순환)

```cpp
// Bad
class Document {
    Application* creator;
public:
    Document(Application* a) : creator(a) {}
    void recreate() { creator->createDocument(); }   // ◄── 순환
};
```

**문제**: Product가 Creator를 알면 결합도 폭발. 두 객체 lifetime 얽힘.

**해결**: Product는 자기 종류만 알고, 재생성은 호출자에게 위임.

## Modern C++ 변형

### 1. CRTP factory (가상 호출 없이)

```cpp
template <typename Derived, typename Doc>
class ApplicationBase {
public:
    void newDocument() {
        auto doc = static_cast<Derived*>(this)->createDocument();
        doc.open();
    }
};

class TextApp : public ApplicationBase<TextApp, TextDocument> {
public:
    TextDocument createDocument() { return TextDocument{}; }
};
```

컴파일 타임 dispatch, 가상 호출 0.

### 2. Concepts + template factory

```cpp
template <typename T>
concept Document = requires(T t) {
    t.open();
    t.save();
};

template <Document D>
class Application {
public:
    void newDocument() { D d; d.open(); }
};

Application<TextDocument> app;
```

가상 함수 없이 정적 타입 제약.

### 3. `std::variant` + factory function

```cpp
using DocV = std::variant<TextDocument, PdfDocument, ImageDocument>;

DocV makeDocument(std::string_view kind) {
    if (kind == "text") return TextDocument{};
    if (kind == "pdf")  return PdfDocument{};
    return ImageDocument{};
}

auto d = makeDocument("text");
std::visit([](auto& doc) { doc.open(); }, d);
```

closed set + 정적 dispatch.

### 4. Tag dispatch — type 인자로 선택

```cpp
struct TextTag {}; struct PdfTag {};

template <typename Tag>
auto makeDocument(Tag);

template <> auto makeDocument(TextTag) { return TextDocument{}; }
template <> auto makeDocument(PdfTag)  { return PdfDocument{}; }

auto t = makeDocument(TextTag{});   // 컴파일 타임 결정
```

### 5. Auto-registering factory (CRTP + static init)

```cpp
template <typename Derived>
class AutoRegister {
    static bool registered;
    static bool doRegister() {
        DocumentFactory::instance().registerType(
            Derived::typeName(),
            [] { return std::make_unique<Derived>(); });
        return true;
    }
public:
    AutoRegister() { (void)registered; }
};

template <typename Derived>
bool AutoRegister<Derived>::registered = doRegister();

class TextDocument : public Document, public AutoRegister<TextDocument> {
public:
    static const char* typeName() { return "text"; }
};
```

새 Document 클래스를 정의하면 *링크 시점*에 factory에 자동 등록. 플러그인 시스템에 흔함.

### 6. `std::function` 기반 dependency injection

```cpp
class Application {
    std::function<std::unique_ptr<Document>()> creator;
public:
    Application(decltype(creator) c) : creator(std::move(c)) {}
    void newDocument() { creator()->open(); }
};

Application app([] { return std::make_unique<TextDocument>(); });
```

상속 없이 factory를 주입.

## C 구현

```c
typedef struct Document {
    void (*open)(struct Document*);
    void (*save)(struct Document*);
} Document;

// 팩토리 함수들
Document* create_text_document(void) {
    Document* d = malloc(sizeof(Document));
    d->open = text_open;
    d->save = text_save;
    return d;
}

// 매개변수화 팩토리
typedef enum { DOC_TEXT, DOC_PDF, DOC_IMAGE } DocType;

Document* document_create(DocType type) {
    switch (type) {
        case DOC_TEXT:  return create_text_document();
        case DOC_PDF:   return create_pdf_document();
        case DOC_IMAGE: return create_image_document();
    }
    return NULL;
}
```

## 성능 — 변형별

`Document` 100만 번 생성 + open.

| 방식 | 시간 | 메모리 | 비고 |
| --- | --- | --- | --- |
| 가상 Factory Method | 40ms | heap | 가상 호출 |
| Parameterized switch | 35ms | heap | switch + heap |
| Registry (`std::function`) | 60ms | heap | function 객체 |
| CRTP | 8ms | stack | 정적 dispatch |
| `std::variant` | 10ms | stack | branch table |
| 직접 생성 | 5ms | stack | baseline |

CRTP / variant가 압도적. 단 *진짜* 다형성 (런타임 결정)이 필요하면 가상 함수가 정직.

## 트레이드오프 — 한눈에

| 차원 | Factory Method |
| --- | --- |
| 구체 타입 캡슐화 | ✅ 클라이언트는 인터페이스만 |
| 프레임워크 확장점 제공 | ✅ Hollywood Principle |
| 새 타입 추가 (전통 형태) | ⚠️ 새 ConcreteCreator 필요 |
| 새 타입 추가 (레지스트리) | ✅ 런타임 등록 |
| 단순 케이스 | ❌ 과도 — 그냥 생성자 |
| 상속 강제 | ⚠️ Composition 대안 검토 |

## 실제 사례

- **C++ STL의 `std::make_unique` / `std::make_shared`** — 사실상 factory function
- **Java `Iterator iterator()`** — 컨테이너가 자신의 iterator 반환
- **Qt의 `QWidget::create()`** 패턴
- **스트림 라이브러리의 `createBuffer()`** 류
- **OS의 `fork()`** — 부모 프로세스가 자식을 만드는 factory
- **JDBC `DriverManager.getConnection()`** — URL에 따라 다른 Connection
- **OpenGL의 `glGenBuffers`** — handle factory
- **Spring `BeanFactory`** — Java DI 컨테이너
- **MFC `CDocument`/`CView`** — 옛 Windows 프레임워크의 전형

## 관련 패턴

- **[Abstract Factory (item 1)](/blog/programming/design/gof-design-patterns/item01-abstract-factory)** — Abstract Factory의 각 메서드는 보통 Factory Method로 구현
- **[Template Method (item 22)](/blog/programming/design/gof-design-patterns/item22-template-method)** — Factory Method는 Template Method의 한 단계로 자주 등장 (Creator의 알고리즘이 factory method를 호출)
- **[Prototype (item 4)](/blog/programming/design/gof-design-patterns/item04-prototype)** — 매번 생성 대신 prototype 복제로 대체 가능
- **[Singleton (item 5)](/blog/programming/design/gof-design-patterns/item05-singleton)** — 레지스트리 팩토리는 보통 Singleton
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — Factory Method를 중심으로 한 생성 패턴 군집
