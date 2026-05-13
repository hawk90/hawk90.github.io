---
title: "GoF 3: Factory Method"
date: 2026-02-01T12:00:00
description: "객체 생성을 서브클래스에 맡기기 — 어떤 타입을 만들지 derived가 결정한다."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 3
draft: true
---

## 한 줄 요약

> **"이 자리에 객체를 만들어줘 — 뭘 만들지는 너가 정해"** — base에 자리만 만들고, derived가 무엇을 인스턴스화할지 결정.

## 어떤 문제를 푸는가

프레임워크가 사용자 정의 객체를 만들어야 합니다 — 그런데 프레임워크는 **사용자가 어떤 클래스를 쓸지 모릅니다**.

예: GUI 프레임워크의 `Application`이 `newDocument()`를 호출. 어떤 종류의 Document(Text, PDF, Image)인지는 사용자가 정함.

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

## 트레이드오프 — 한눈에

| 차원 | Factory Method |
| --- | --- |
| 구체 타입 캡슐화 | ✅ 클라이언트는 인터페이스만 |
| 프레임워크 확장점 제공 | ✅ Hollywood Principle |
| 새 타입 추가 (전통 형태) | ⚠️ 새 ConcreteCreator 필요 |
| 새 타입 추가 (레지스트리) | ✅ 런타임 등록 |
| 단순 케이스 | ❌ 과도 — 그냥 생성자 |

## 실제 사례

- C++ STL의 `std::make_unique` / `std::make_shared` (사실상 factory function)
- Java `Iterator iterator()` — 컨테이너가 자신의 iterator 반환
- Qt의 `QWidget::create()` 패턴
- 스트림 라이브러리의 `createBuffer()` 류

## 관련 패턴

- **[Abstract Factory (item 1)](/blog/programming/design/gof-design-patterns/item01-abstract-factory)** — Abstract Factory의 각 메서드는 보통 Factory Method로 구현
- **[Template Method (item 22)](/blog/programming/design/gof-design-patterns/item22-template-method)** — Factory Method는 Template Method의 한 단계로 자주 등장 (Creator의 알고리즘이 factory method를 호출)
- **[Prototype (item 4)](/blog/programming/design/gof-design-patterns/item04-prototype)** — 매번 생성 대신 prototype 복제로 대체 가능
- **[Singleton (item 5)](/blog/programming/design/gof-design-patterns/item05-singleton)** — 레지스트리 팩토리는 보통 Singleton
