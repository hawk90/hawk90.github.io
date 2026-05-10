---
title: "GoF 8: Composite"
date: 2026-02-02T12:00:00
description: "객체를 트리로 구성 — 단일 객체와 복합 객체를 동일하게 다룸."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 8
draft: true
---

> **초안** — 정리 진행 중

## 의도

객체들을 **트리 구조**로 구성해 부분-전체 계층을 표현. 클라이언트가 **단일 객체와 복합 객체를 동일하게** 다룰 수 있도록.

## 동기

- 파일 시스템 (파일 + 디렉터리)
- GUI 위젯 (버튼 + 컨테이너)
- 표현식 트리 (리터럴 + 연산자)

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
        return total;
    }

    void print(int indent) const override {
        std::cout << std::string(indent, ' ') << name << "/\n";
        for (const auto& c : children) c->print(indent + 2);
    }
};

// 사용 — 단일 vs 복합 동일하게
auto root = std::make_unique<Directory>("/");
root->add(std::make_unique<File>("readme.md", 100));
auto sub = std::make_unique<Directory>("src");
sub->add(std::make_unique<File>("main.cpp", 500));
root->add(std::move(sub));

root->print();
std::cout << "Total: " << root->size() << '\n';
```

## C 구현

```c
typedef struct FsNode {
    enum { FILE, DIR } type;
    size_t (*size)(struct FsNode*);
    void   (*print)(struct FsNode*, int);
} FsNode;

typedef struct {
    FsNode base;
    char name[64];
    size_t file_size;
} File;

typedef struct {
    FsNode base;
    char name[64];
    FsNode** children;
    size_t count;
} Directory;
```

## 트레이드오프

- **장점**: 클라이언트가 트리 구조 편하게 다룸, 새 노드 타입 추가 쉬움
- **단점**: 인터페이스가 너무 넓어질 수 있음 (Leaf가 add/remove 필요?)
