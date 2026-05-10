---
title: "GoF 8: Composite"
date: 2026-02-02T12:00:00
description: "객체를 트리로 구성 — 단일 객체와 복합 객체를 동일하게 다룸."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 8
draft: true
---

## 의도

객체들을 **트리 구조**로 구성해 부분-전체 계층을 표현합니다. 클라이언트가 **단일 객체와 복합 객체를 동일하게** 다룰 수 있도록 합니다.

## 동기

- 파일 시스템: File + Directory (Directory는 File과 다른 Directory 보유)
- GUI: 단일 위젯 + 컨테이너
- 표현식 트리: 리터럴 + 연산자 (피연산자가 또 다른 표현식)
- 그래픽: 도형 + 도형 그룹

같은 인터페이스를 가지므로 클라이언트는 leaf와 composite를 구분 없이 처리.

## 적용 가능성

- 부분-전체 계층을 표현하고 싶을 때
- 클라이언트가 복합 객체와 단일 객체의 차이를 무시할 수 있어야 할 때
- 트리 구조의 재귀적 처리가 자연스러울 때

## 구조

```
   Component
   + operation()*
   + add(Component)*    (선택적 — 안전성 vs 투명성 결정)
        △
        │
   ┌────┴────┐
  Leaf    Composite
   + op()    + op()
             ◇──► Component[]
```

## 참여자

- **Component** — leaf와 composite의 공통 인터페이스
- **Leaf** — 자식이 없는 객체. 기본 동작 정의
- **Composite** — 자식을 가지는 객체. 자식들에게 위임하며 자기 동작 추가
- **Client** — Component 인터페이스로 트리 조작

## 안전성 vs 투명성 — 인터페이스 결정

`add`/`remove` 같은 자식 관리 메서드를 어디 둘지:

- **투명**: Component에 둠 — Leaf도 add 호출 가능 (런타임 에러 가능)
- **안전**: Composite에만 둠 — Leaf에는 그 메서드 없음 (타입 캐스팅 필요)

GoF는 투명성을 선호 (모든 객체를 동일하게 다루기 위해).

## C++ 구현

```cpp
class FsNode {
public:
    virtual ~FsNode() = default;
    virtual std::size_t size() const = 0;
    virtual void print(int indent = 0) const = 0;
};

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
        for (const auto& c : children) total += c->size();
        return total;     // 재귀 위임
    }

    void print(int indent) const override {
        std::cout << std::string(indent, ' ') << name << "/\n";
        for (const auto& c : children) c->print(indent + 2);
    }
};

// 사용 — 단일 vs 복합 동일하게
auto root = std::make_unique<Directory>("/");
root->add(std::make_unique<File>("readme.md", 100));

auto src = std::make_unique<Directory>("src");
src->add(std::make_unique<File>("main.cpp", 500));
src->add(std::make_unique<File>("util.cpp", 300));
root->add(std::move(src));

root->print();
std::cout << "Total: " << root->size() << '\n';
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

void dir_add(Directory* d, FsNode* child) {
    if (d->count == d->capacity) {
        d->capacity = d->capacity ? d->capacity * 2 : 4;
        d->children = realloc(d->children, d->capacity * sizeof(FsNode*));
    }
    d->children[d->count++] = child;
}
```

## 결과 (트레이드오프)

**장점**
- 클라이언트가 트리 구조 편하게 다룸 (재귀 위임)
- 새 노드 타입 추가 쉬움 (Component 인터페이스 구현)
- 복잡한 트리 동작을 단순 코드로 표현

**단점**
- 인터페이스가 너무 넓어질 수 있음 (Leaf에 의미 없는 add/remove?)
- 타입 안전성 약화 (모든 노드를 동일하게 다루므로 leaf에 자식 추가 시도 가능)

## 변형

- **Caching** — Composite의 비용 큰 연산(size, count) 캐싱, 변경 시 invalidate
- **Iterator 통합** — Composite에 standard iterator 인터페이스 (item 16)
- **Visitor 통합** — 노드별 다른 연산은 Visitor로 분리 (item 23)

## 알려진 사용 사례

- 파일 시스템 — 거의 모든 OS
- 모든 GUI 위젯 트리 (Qt, GTK, JavaFX)
- DOM (Document Object Model)
- 컴파일러 AST
- `std::filesystem::path`의 일부 동작

## 관련 패턴

- **[Decorator (item 9)](/blog/programming/gof-design-patterns/item09-decorator)** — 둘 다 재귀 구조. Composite는 자식이 여러 개, Decorator는 하나만 (그러나 적층)
- **[Iterator (item 16)](/blog/programming/gof-design-patterns/item16-iterator)** — Composite를 순회할 때 Iterator 사용
- **[Visitor (item 23)](/blog/programming/gof-design-patterns/item23-visitor)** — Composite에 새 연산을 추가할 때 Visitor 활용
- **[Chain of Responsibility (item 13)](/blog/programming/gof-design-patterns/item13-chain-of-responsibility)** — Composite + 부모 포인터로 chain 구현 (위로 올라가며 처리자 찾기)
- **[Flyweight (item 11)](/blog/programming/gof-design-patterns/item11-flyweight)** — Composite의 leaf가 많으면 Flyweight로 공유 가능
