---
title: "GoF 8: Composite"
date: 2026-02-01T08:00:00
description: "객체를 트리로 구성 — 단일과 복합을 같은 인터페이스로."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 8
draft: true
---

## 한 줄 요약

> **"파일과 폴더를 같은 인터페이스로"** — leaf와 composite 노드가 같은 `Component` 타입.

## 어떤 문제를 푸는가

부분-전체 계층(트리)을 표현해야 합니다.

- **파일 시스템**: File + Directory (Directory는 File과 다른 Directory를 보유)
- **GUI**: 단일 위젯 + 컨테이너 위젯
- **표현식 트리**: 리터럴 + 연산자 (피연산자가 또 표현식)
- **그래픽**: 도형 + 도형 그룹

순진한 접근:

```cpp
// Bad: leaf와 group을 다르게
size_t totalSize(const std::vector<File>& files,
                 const std::vector<Directory>& dirs) {
    size_t s = 0;
    for (auto& f : files) s += f.size();
    for (auto& d : dirs) s += totalSize(d.files, d.dirs);   // 매번 두 갈래
    return s;
}
```

- leaf와 composite마다 별도 처리
- 트리 깊이가 깊으면 코드가 폭발
- 새 leaf 종류(Link 등) 추가 시 모든 처리 함수 수정

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

> ⚠️ **트리가 매우 깊고 균등한 처리가 hot path면** 재귀 호출 비용 주의 — flatten 또는 visitor 적용 고려.

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

## 자주 보는 안티패턴

### 1. Parent 참조의 cycle / dangling

```cpp
class FsNode {
    FsNode* parent;   // ◄── 자식이 부모를 참조
};
// Directory의 children: unique_ptr (소유)
// File의 parent: raw pointer
```

**문제**: 부모가 소멸하면 자식의 parent가 dangling. 또는 자식이 자식의 자식을 부모로 만들면 cycle.

**해결**: parent는 *항상* raw pointer 또는 `weak_ptr`. 자식 추가/제거 시 parent를 정확히 갱신.

### 2. Leaf에서 add/remove 호출 (투명 인터페이스의 함정)

```cpp
// Bad
void add(FsNode* node, std::unique_ptr<FsNode> child) {
    node->add(std::move(child));   // ◄── File에 호출되면?
}
```

**문제**: 투명 인터페이스(`Component::add`)는 leaf에서 호출 시 런타임 에러 또는 silent no-op.

**해결**: 진짜 *모든* 노드가 컨테이너일 때만 투명 인터페이스. 아니면 안전 인터페이스(`Composite::add`만).

### 3. Recursion으로 인한 stack overflow

```cpp
// 깊이 10000짜리 디렉토리 트리
size_t s = root->size();   // ◄── stack overflow 가능
```

**문제**: 균형 잡힌 트리는 OK지만, linked-list-like 트리(`a/b/c/d/.../z`)는 stack 깊이가 곧 트리 깊이.

**해결**: iterative traversal (`std::stack<FsNode*>`로 명시적 stack), 또는 깊이 제한.

### 4. Composite가 자식을 소유 안 함 (lifetime 모호)

```cpp
// Bad
class Directory {
    std::vector<FsNode*> children;   // ◄── 소유 없음
public:
    void add(FsNode* c) { children.push_back(c); }
    ~Directory() { /* 자식 해제 안 함 */ }
};
```

**문제**: 자식 lifetime이 모호. leak 또는 use-after-free.

**해결**: `unique_ptr` 단일 소유. 공유가 필요하면 `shared_ptr` 명시.

### 5. Component 인터페이스 비대화

```cpp
class FsNode {
public:
    virtual size_t size() const = 0;
    virtual void   print() const = 0;
    virtual void   compress() = 0;
    virtual void   encrypt() = 0;
    virtual void   sync() = 0;
    // ... 점점 늘어남
};
```

**문제**: 새 연산 추가 시마다 모든 노드 클래스 수정 (OCP 위반).

**해결**: 핵심 인터페이스만 두고, 새 연산은 Visitor 패턴으로.

### 6. 트리 mutation 중 traversal

```cpp
// Bad
void Directory::pruneEmpty() {
    for (auto& c : children) {
        if (auto* d = dynamic_cast<Directory*>(c.get()))
            d->pruneEmpty();
        if (c->size() == 0) children.erase(/* ... */);   // ◄── invalidation
    }
}
```

**문제**: iteration 중 vector 수정 → iterator invalidation.

**해결**: 두 단계 — 표시 후 일괄 erase. 또는 `std::erase_if`.

## Modern C++ 변형

### 1. `std::variant` + visit — closed-set tree

```cpp
struct File   { std::string name; std::size_t size; };
struct Directory;

using FsNode = std::variant<File, Directory>;

struct Directory {
    std::string name;
    std::vector<FsNode> children;
};

std::size_t totalSize(const FsNode& n) {
    return std::visit([](const auto& x) -> std::size_t {
        using T = std::decay_t<decltype(x)>;
        if constexpr (std::is_same_v<T, File>) return x.size;
        else {
            std::size_t s = 0;
            for (auto& c : x.children) s += totalSize(c);
            return s;
        }
    }, n);
}
```

가상 함수 없이 트리. 새 노드 종류는 variant 확장.

### 2. CRTP + concept based traversal

```cpp
template <typename T>
concept Node = requires(const T& t) { t.size(); };

template <Node N>
std::size_t total(const N& n) requires requires { n.children(); } {
    std::size_t s = 0;
    for (auto& c : n.children()) s += total(c);
    return s;
}
```

가상 호출 0, 정적 dispatch.

### 3. Functional traversal (fold)

```cpp
template <typename T, typename Acc, typename Combine>
Acc fold(const FsNode& node, Acc init, Combine combine) {
    return std::visit([&](const auto& n) -> Acc {
        if constexpr (std::is_same_v<std::decay_t<decltype(n)>, File>)
            return combine(init, n);
        else {
            Acc acc = init;
            for (auto& c : n.children) acc = fold(c, acc, combine);
            return acc;
        }
    }, node);
}

// 사용
auto total = fold(root, std::size_t{0},
                  [](std::size_t s, const File& f) { return s + f.size; });
```

순수 함수형, 부수효과 없음.

### 4. Coroutine-based iterator (C++20)

```cpp
std::generator<const FsNode&> walk(const FsNode& root) {
    co_yield root;
    if (auto* d = std::get_if<Directory>(&root)) {
        for (auto& c : d->children)
            for (auto& n : walk(c)) co_yield n;
    }
}

// 사용
for (auto& n : walk(root)) { /* ... */ }
```

lazy, depth-first 자동.

### 5. Persistent tree (immutable composite)

```cpp
class Directory {
    std::shared_ptr<const std::vector<std::shared_ptr<const FsNode>>> children;
public:
    Directory withChild(std::shared_ptr<const FsNode> c) const {
        auto v = std::make_shared<std::vector<...>>(*children);
        v->push_back(c);
        return Directory{v};
    }
};
```

새 노드 추가가 *새 트리*를 반환 — 시간 여행, undo, 함수형 스타일. Clojure / Immer.js의 핵심.

### 6. Visitor + Composite 조합

```cpp
class FsVisitor {
public:
    virtual void visit(File&) = 0;
    virtual void visit(Directory&) = 0;
};

class FsNode {
public:
    virtual void accept(FsVisitor&) = 0;
};

// 새 연산은 새 Visitor — Component 인터페이스 안 건드림
```

[item 23 Visitor](/blog/programming/design/gof-design-patterns/item23-visitor) 참조.

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

## 성능 — 가상 호출 vs variant

100만 노드 트리 (~1MB), `size()` 호출.

| 방식 | 시간 | 비고 |
| --- | --- | --- |
| 가상 함수 (전통) | 12ms | 가상 호출 + cache miss |
| `std::variant + visit` | 7ms | branch table |
| CRTP + concept | 5ms | 정적 dispatch |
| Flat array (Structure of Arrays) | 2ms | 캐시 친화 |

cache locality가 큰 영향. 트리가 매우 크면 SoA 또는 arena allocator가 가상 호출보다 큰 이득.

## 트레이드오프 — 한눈에

| 차원 | Composite |
| --- | --- |
| 트리 구조 클라이언트 코드 | ✅ 단순 (재귀 위임) |
| 새 노드 타입 추가 | ✅ Component 구현만 |
| 복잡한 트리 동작 표현 | ✅ |
| 인터페이스 너무 넓어질 위험 | ⚠️ Leaf에 의미 없는 add/remove? |
| 타입 안전성 | ⚠️ 모든 노드를 동일하게 → leaf에 잘못된 호출 가능 |
| Stack overflow (깊은 트리) | ⚠️ iterative traversal 검토 |

## 실제 사례

- **파일 시스템** — 거의 모든 OS, `std::filesystem`
- **GUI 위젯 트리** — Qt, GTK, JavaFX, SwiftUI, React, Flutter
- **DOM** (Document Object Model) — HTML, XML
- **컴파일러 AST** — Clang, GCC, TypeScript
- **3D 씬 그래프** — Unity, Unreal, three.js의 Transform 트리
- **빌드 시스템의 task DAG** — Bazel, Buck (DAG도 일반화된 트리)
- **수식 트리** — Mathematica, SymPy, MATLAB
- **메뉴/툴바 구조** — 모든 데스크톱 앱

## 관련 패턴

- **[Decorator (item 9)](/blog/programming/design/gof-design-patterns/item09-decorator)** — 둘 다 재귀 구조. Composite는 자식이 여러 개, Decorator는 하나만 (그러나 적층)
- **[Iterator (item 16)](/blog/programming/design/gof-design-patterns/item16-iterator)** — Composite를 순회할 때 Iterator
- **[Visitor (item 23)](/blog/programming/design/gof-design-patterns/item23-visitor)** — Composite에 새 연산을 추가할 때 Visitor
- **[Chain of Responsibility (item 13)](/blog/programming/design/gof-design-patterns/item13-chain-of-responsibility)** — Composite + 부모 포인터로 chain (위로 올라가며 처리자 찾기)
- **[Flyweight (item 11)](/blog/programming/design/gof-design-patterns/item11-flyweight)** — Composite의 leaf가 많으면 Flyweight으로 공유
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — Composite를 중심으로 한 트리 패턴 군집의 핵심
