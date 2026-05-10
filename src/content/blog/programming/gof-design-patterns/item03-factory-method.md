---
title: "GoF 3: Factory Method"
date: 2026-02-01T12:00:00
description: "객체 생성을 서브클래스에 위임 — 어떤 타입을 만들지 derived가 결정."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 3
draft: true
---

> **초안** — 정리 진행 중

## 의도

객체 생성을 위한 인터페이스를 정의하되, **어떤 클래스를 인스턴스화할지는 서브클래스가 결정**하도록 함. 클래스가 생성을 자신의 서브클래스에 위임.

## Abstract Factory와의 차이

- **Abstract Factory**: 객체 **군**(여러 종류) 생성 — 별도의 팩토리 객체
- **Factory Method**: 객체 **하나** 생성 — 메서드 하나 (보통 클래스 안)

## C++ 구현

```cpp
// 제품
class Document {
public:
    virtual ~Document() = default;
    virtual void open() = 0;
};

class TextDocument : public Document { public: void open() override { /* ... */ } };
class PdfDocument  : public Document { public: void open() override { /* ... */ } };

// 생성자 (Creator)
class Application {
public:
    virtual ~Application() = default;
    virtual std::unique_ptr<Document> createDocument() = 0;   // factory method

    void newDocument() {
        auto doc = createDocument();
        doc->open();
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

`Application::newDocument()`는 추상 메서드만 사용 — 어떤 Document인지 모름. derived가 결정.

## 변형 — 매개변수화 팩토리

```cpp
enum class DocType { Text, Pdf };

class Application {
public:
    static std::unique_ptr<Document> create(DocType t) {
        switch (t) {
            case DocType::Text: return std::make_unique<TextDocument>();
            case DocType::Pdf:  return std::make_unique<PdfDocument>();
        }
        return nullptr;
    }
};
```

스위치 안에서 결정 — 새 타입 추가 시 수정 필요 (OCP 위반). 그러나 단순.

## C 구현

```c
typedef struct Document {
    void (*open)(struct Document*);
} Document;

// 팩토리 함수
Document* create_text_document(void) {
    Document* d = malloc(sizeof(Document));
    d->open = text_open;
    return d;
}

// 매개변수화 팩토리
typedef enum { DOC_TEXT, DOC_PDF } DocType;

Document* document_create(DocType type) {
    switch (type) {
        case DOC_TEXT: return create_text_document();
        case DOC_PDF:  return create_pdf_document();
    }
    return NULL;
}
```

## 트레이드오프

- **장점**: 구체 타입과 클라이언트 분리, 확장 가능
- **단점**: 새 제품마다 새 서브클래스 필요 (전통 형태)
