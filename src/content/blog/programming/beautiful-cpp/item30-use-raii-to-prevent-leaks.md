---
title: "항목 30: 메모리 누수를 방지하려면 RAII를 사용하라"
date: 2026-05-10T19:00:00
description: "RAII로 누수와 자원 해제 누락을 막는 법"
tags: [C++, RAII, Resource Management]
series: "Beautiful C++"
seriesOrder: 30
draft: false
---


## 핵심 내용

- **RAII** (Resource Acquisition Is Initialization): 자원의 수명을 **객체의 수명**에 묶는다
- 생성자에서 획득, 소멸자에서 해제 → 예외·이른 반환·복잡한 흐름에서도 자동 정리
- C++의 핵심 자원 관리 도구: `std::unique_ptr`, `std::shared_ptr`, `std::lock_guard`, `std::fstream`...
- 새 자원 종류가 생기면 **새 RAII 클래스**를 만들어라 — `new`/`delete`, `lock`/`unlock`을 코드에 직접 쓰지 마라
- RAII는 **메모리뿐 아니라** 락, 파일, 소켓, GPU 핸들 등 모든 자원에 적용된다

## 예제 코드

```cpp
// Bad: 수동 해제 — 예외나 이른 반환에서 누수
void process(const char* path) {
    FILE* f = std::fopen(path, "r");
    Buffer* b = new Buffer(1024);

    if (!f) { delete b; return; }    // 이 줄을 빠뜨리면 누수
    if (read_failed(f, b)) {
        std::fclose(f);              // 한 곳에서만 처리하면 위험
        delete b;
        return;
    }
    // throw 발생하면? 어떤 게 누수?
    std::fclose(f);
    delete b;
}

// Good: RAII — 흐름이 어떻게 끝나든 자동 정리
struct FileCloser { void operator()(FILE* f) const { if (f) std::fclose(f); } };
using FilePtr = std::unique_ptr<FILE, FileCloser>;

void process(const char* path) {
    FilePtr f{std::fopen(path, "r")};
    auto    b = std::make_unique<Buffer>(1024);

    if (!f) return;                       // unique_ptr/FilePtr 자동 정리
    if (read_failed(f.get(), b.get())) return;

    // 정상/예외/이른 반환 모두 안전
}
```

## 정리

C++에서 자원 관리는 **객체 수명에 위임**하는 것이 정답이다. 생/소멸자에 한 번 책임을 적어두면, 호출부의 모든 흐름에서 정리가 자동으로 보장된다 — 이것이 C++이 가진 가장 강력한 무기다.
