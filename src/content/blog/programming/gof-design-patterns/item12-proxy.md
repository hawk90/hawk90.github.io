---
title: "GoF 12: Proxy"
date: 2026-02-02T16:00:00
description: "다른 객체에 대한 대리/접근 제어 — virtual, remote, protection, smart proxy."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 12
draft: true
---

> **초안** — 정리 진행 중

## 의도

다른 객체에 대한 **대리자** 또는 **자리지킴이**를 제공해 그 객체에 대한 접근을 제어.

## 종류

- **Virtual Proxy** — 비싼 객체의 지연 생성 (lazy load)
- **Remote Proxy** — 원격 객체의 로컬 대리 (RPC)
- **Protection Proxy** — 접근 권한 제어
- **Smart Proxy** — 참조 카운트, 락, 로깅 (= `shared_ptr`이 일종의 smart proxy)

## C++ — Virtual Proxy

```cpp
class Image {
public:
    virtual ~Image() = default;
    virtual void display() = 0;
};

class RealImage : public Image {
    std::string filename;
    std::vector<char> pixels;
public:
    explicit RealImage(std::string f) : filename(std::move(f)) {
        loadFromDisk();    // 비쌈
    }
    void display() override { /* 픽셀 출력 */ }
private:
    void loadFromDisk() { /* ... */ }
};

class ImageProxy : public Image {
    std::string filename;
    mutable std::unique_ptr<RealImage> real;
public:
    explicit ImageProxy(std::string f) : filename(std::move(f)) {}
    void display() override {
        if (!real) real = std::make_unique<RealImage>(filename);   // 첫 호출 때 로드
        real->display();
    }
};

// 사용 — 안 보이는 이미지는 로드 안 됨
std::vector<std::unique_ptr<Image>> gallery;
gallery.push_back(std::make_unique<ImageProxy>("a.jpg"));
gallery.push_back(std::make_unique<ImageProxy>("b.jpg"));
// ...
gallery[0]->display();    // a.jpg만 로드
```

## C++ — Protection Proxy

```cpp
class ProtectedFile : public File {
    File& real;
    User& user;
public:
    void write(const std::string& data) override {
        if (!user.canWrite()) throw AccessDenied();
        real.write(data);
    }
};
```

## C++ — Smart Pointer (built-in proxy)

`shared_ptr`, `unique_ptr` 모두 일종의 smart proxy — 대상 객체를 감싸 자동 해제·참조 카운트 제공.

## C 구현

```c
typedef struct Image {
    void (*display)(struct Image*);
} Image;

typedef struct {
    Image base;
    char filename[256];
    RealImage* real;    // lazy
} ImageProxy;

void proxy_display(Image* self) {
    ImageProxy* p = (ImageProxy*)self;
    if (!p->real) p->real = real_image_load(p->filename);
    real_image_display(p->real);
}
```

## Decorator vs Proxy

- **Decorator**: 책임을 *추가*하는 데 초점
- **Proxy**: *접근 제어*에 초점

구조는 비슷하지만 의도가 다름.

## 트레이드오프

- **장점**: 추가 동작 투명하게 삽입, lazy load·접근 제어
- **단점**: 응답성 ↓ (proxy 통과), 코드 복잡
