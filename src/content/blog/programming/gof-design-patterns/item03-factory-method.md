---
title: "GoF 3: Factory Method"
date: 2026-02-01T12:00:00
description: "객체 생성을 서브클래스에 위임 — 어떤 구체 타입을 만들지 derived가 결정한다."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 3
draft: true
---

## 의도

객체 생성을 위한 **인터페이스를 정의**하되, **어떤 클래스를 인스턴스화할지는 서브클래스가 결정**하도록 합니다. 클래스가 자신의 인스턴스화를 서브클래스에 위임하는 패턴.

## 동기

프레임워크가 사용자 정의 객체를 만들어야 할 때 — 프레임워크는 어떤 구체 클래스를 만들어야 할지 모릅니다. "이 자리에서 객체를 만들어라"는 가상 메서드를 두고 사용자가 derived 클래스에서 override하도록 합니다.

GUI 프레임워크의 `Application`이 `Document`를 만드는 상황 — 어떤 종류의 Document(Text, PDF, Image)인지는 사용자가 결정.

## 적용 가능성

- 클래스가 자신이 만들 객체의 구체 클래스를 미리 알 수 없을 때
- 서브클래스가 만들 객체의 종류를 결정해야 할 때
- 책임을 헬퍼 서브클래스 중 하나에 위임하고, 어떤 헬퍼인지를 동적으로 결정하고 싶을 때
- 클래스 라이브러리에서 사용자 확장점을 제공할 때

## Abstract Factory와의 차이

- **Abstract Factory**: 객체 **군** 생성 — 별도 팩토리 객체로 캡슐화
- **Factory Method**: 객체 **하나** 생성 — Creator 클래스 안의 메서드

Abstract Factory는 보통 내부적으로 Factory Method를 사용해 구현됩니다.

## 구조

```
   Creator                Product
   + create()*  ◇────────► (interface)
                                △
   △                            │
   │                  ConcreteProduct
ConcreteCreator
   + create() ─────► returns ConcreteProduct
```

## 참여자

- **Product** — 만들어지는 객체의 인터페이스
- **ConcreteProduct** — Product의 구체 구현
- **Creator** — Factory Method를 선언, 기본 구현 제공 가능
- **ConcreteCreator** — Factory Method를 override해 ConcreteProduct 반환

## C++ 구현 — 전통 형태

```cpp
class Document {
public:
    virtual ~Document() = default;
    virtual void open() = 0;
    virtual void save() = 0;
};

class TextDocument : public Document {
public:
    void open() override { /* ... */ }
    void save() override { /* ... */ }
};

class PdfDocument : public Document {
public:
    void open() override { /* ... */ }
    void save() override { /* ... */ }
};

// Creator
class Application {
public:
    virtual ~Application() = default;
    virtual std::unique_ptr<Document> createDocument() = 0;   // factory method

    void newDocument() {
        auto doc = createDocument();
        doc->open();
        // 프레임워크 코드는 어떤 Document인지 모름
    }
};

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

`Application::newDocument()`는 추상 메서드만 사용 — 어떤 Document인지 모릅니다. ConcreteCreator가 결정.

## C++ 구현 — 매개변수화 (parameterized) 형태

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

새 타입 추가 시 switch 수정 필요 (OCP 위반). 그러나 단순.

## C++ 구현 — 등록(registry) 기반

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

// 사용 — 런타임에 새 타입 등록 가능
DocumentFactory f;
f.registerType("text", [] { return std::make_unique<TextDocument>(); });
f.registerType("pdf",  [] { return std::make_unique<PdfDocument>(); });
auto doc = f.create("text");
```

플러그인 시스템·DLL 동적 로드에 적합.

## C 구현

```c
typedef struct Document {
    void (*open)(struct Document*);
    void (*save)(struct Document*);
} Document;

// 팩토리 함수
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

## 결과 (트레이드오프)

**장점**
- 구체 타입과 클라이언트 코드 분리
- 프레임워크 확장점 제공 (Hollywood Principle)
- 추가 타입 도입이 derived 추가만으로 가능

**단점**
- 새 ConcreteProduct마다 새 ConcreteCreator 필요 (전통 형태)
- 단순 케이스엔 과도

## 변형

- **매개변수화 팩토리** — switch/if로 분기, 한 클래스로 처리
- **레지스트리 팩토리** — 런타임 등록, 플러그인에 적합
- **`std::function` + 람다** — 간단한 경우엔 클래스 계층 불필요

## 알려진 사용 사례

- Java Collections의 `iterator()` (각 컨테이너가 자신의 iterator 반환)
- C++ 표준의 `std::make_unique`, `std::make_shared`
- Qt의 `QWidget::create()` 패턴
- 스트림 라이브러리에서 stream의 createBuffer 류

## 관련 패턴

- **[Abstract Factory (item 1)](/blog/programming/gof-design-patterns/item01-abstract-factory)** — Abstract Factory의 메서드들은 보통 Factory Method로 구현
- **[Template Method (item 22)](/blog/programming/gof-design-patterns/item22-template-method)** — Factory Method는 종종 Template Method 안의 단계로 사용 (Creator의 알고리즘이 factory method를 호출)
- **[Prototype (item 4)](/blog/programming/gof-design-patterns/item04-prototype)** — 새 객체를 매번 만드는 대신 prototype 복제로 대체 가능
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** — 레지스트리 팩토리는 보통 Singleton
