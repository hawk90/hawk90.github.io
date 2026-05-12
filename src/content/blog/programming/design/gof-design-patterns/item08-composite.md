---
title: "GoF 8: Composite"
date: 2026-02-02T12:00:00
description: "객체를 트리로 구성 — 단일과 복합을 같은 인터페이스로."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 8
---

## 한 줄 요약

> **"파일과 폴더를 같은 인터페이스로"** — leaf와 composite 노드가 같은 `Component` 타입.

## 어떤 문제를 푸는가

부분-전체 계층(트리)을 표현해야 합니다.

- **파일 시스템**: File + Directory (Directory는 File과 다른 Directory를 보유)
- **GUI**: 단일 위젯 + 컨테이너 위젯
- **표현식 트리**: 리터럴 + 연산자 (피연산자가 또 표현식)
- **그래픽**: 도형 + 도형 그룹

같은 인터페이스를 가지면 클라이언트는 leaf와 composite를 **구분 없이** 처리.

```cpp
node->size();   // File이든 Directory든 OK
```

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item08-composite.svg" alt="Composite 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

Composite의 `operation()`은 자식들에게 재귀 위임 → 트리 전체가 자연스럽게 처리됨.

## 안전성 vs 투명성 — 인터페이스 결정

`add`/`remove` 같은 자식 관리 메서드를 어디 둘지가 핵심 설계 결정.

| 방식 | Component에 둠 (투명) | Composite에만 둠 (안전) |
| --- | --- | --- |
| 모든 노드 동일하게 다룸 | ✅ | ❌ 캐스팅 필요 |
| Leaf에 add 호출 시 | ⚠️ 런타임 에러 | ✅ 컴파일 에러 |
| GoF 추천 | ✅ 투명성 | |

GoF는 투명성 선호 — "모든 노드를 동일하게"가 패턴 핵심.

## 언제 쓰면 좋은가

- 부분-전체 계층을 표현하고 싶을 때
- 클라이언트가 **복합과 단일의 차이를 무시**할 수 있어야 할 때
- 트리 구조의 **재귀적 처리**가 자연스러울 때

## 언제 쓰면 안 되나

> ⚠️ **leaf만 있는 평탄한 컬렉션**이라면 그냥 `vector` / `list`.

> ⚠️ **leaf와 composite가 의미상 매우 다르면** 인터페이스 통합이 부자연스러움.

## C++ 구현

### 1. Component 인터페이스

```cpp
class FsNode {
public:
    virtual ~FsNode() = default;
    virtual std::size_t size() const = 0;
    virtual void print(int indent = 0) const = 0;
};
```

### 2. Leaf — File

```cpp
class File : public FsNode {
    std::string name;
    std::size_t fileSize;
public:
    File(std::string n, std::size_t s) : name(std::move(n)), fileSize(s) {}

    std::size_t size() const override { return fileSize; }
    void print(int indent) const override {
        std::cout << std::string(indent, ' ') << name << " (" << fileSize << ")\n";
    }
};
```

### 3. Composite — Directory (재귀 위임)

```cpp
class Directory : public FsNode {
    std::string name;
    std::vector<std::unique_ptr<FsNode>> children;
public:
    explicit Directory(std::string n) : name(std::move(n)) {}

    void add(std::unique_ptr<FsNode> child) {
        children.push_back(std::move(child));
    }

    std::size_t size() const override {
        std::size_t total = 0;
        for (const auto& c : children) total += c->size();   // 재귀 위임
        return total;
    }

    void print(int indent) const override {
        std::cout << std::string(indent, ' ') << name << "/\n";
        for (const auto& c : children) c->print(indent + 2);
    }
};
```

`size()`와 `print()`가 **leaf든 composite든 같은 코드**로 동작.

### 4. 사용

```cpp
auto root = std::make_unique<Directory>("/");
root->add(std::make_unique<File>("readme.md", 100));

auto src = std::make_unique<Directory>("src");
src->add(std::make_unique<File>("main.cpp", 500));
src->add(std::make_unique<File>("util.cpp", 300));
root->add(std::move(src));

root->print();
std::cout << "Total: " << root->size() << '\n';   // 트리 전체 합산
```

## C 구현

```c
typedef enum { NODE_FILE, NODE_DIR } NodeType;

typedef struct FsNode {
    NodeType type;
    size_t (*size)(struct FsNode*);
    void   (*print)(struct FsNode*, int);
} FsNode;

typedef struct {
    FsNode base;
    char   name[64];
    size_t file_size;
} File;

typedef struct {
    FsNode    base;
    char      name[64];
    FsNode**  children;
    size_t    count;
    size_t    capacity;
} Directory;

size_t dir_size(FsNode* self) {
    Directory* d = (Directory*)self;
    size_t total = 0;
    for (size_t i = 0; i < d->count; ++i)
        total += d->children[i]->size(d->children[i]);
    return total;
}
```

## 트레이드오프 — 한눈에

| 차원 | Composite |
| --- | --- |
| 트리 구조 클라이언트 코드 | ✅ 단순 (재귀 위임) |
| 새 노드 타입 추가 | ✅ Component 구현만 |
| 복잡한 트리 동작 표현 | ✅ |
| 인터페이스 너무 넓어질 위험 | ⚠️ Leaf에 의미 없는 add/remove? |
| 타입 안전성 | ⚠️ 모든 노드를 동일하게 → leaf에 잘못된 호출 가능 |

## 실제 사례

- **파일 시스템** — 거의 모든 OS
- **GUI 위젯 트리** (Qt, GTK, JavaFX, SwiftUI)
- **DOM** (Document Object Model)
- **컴파일러 AST**
- `std::filesystem::path`의 일부

## 관련 패턴

- **[Decorator (item 9)](/blog/programming/design/gof-design-patterns/item09-decorator)** — 둘 다 재귀 구조. Composite는 자식이 여러 개, Decorator는 하나만 (그러나 적층)
- **[Iterator (item 16)](/blog/programming/design/gof-design-patterns/item16-iterator)** — Composite를 순회할 때 Iterator
- **[Visitor (item 23)](/blog/programming/design/gof-design-patterns/item23-visitor)** — Composite에 새 연산을 추가할 때 Visitor
- **[Chain of Responsibility (item 13)](/blog/programming/design/gof-design-patterns/item13-chain-of-responsibility)** — Composite + 부모 포인터로 chain (위로 올라가며 처리자 찾기)
- **[Flyweight (item 11)](/blog/programming/design/gof-design-patterns/item11-flyweight)** — Composite의 leaf가 많으면 Flyweight으로 공유
