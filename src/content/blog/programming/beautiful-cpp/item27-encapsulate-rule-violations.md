---
title: "항목 27: 규칙 위반을 캡슐화하라"
date: 2026-05-10T16:00:00
description: "어쩔 수 없이 규칙을 어겨야 할 때 위반을 한 곳에 가두는 법"
tags: [C++, Encapsulation]
series: "Beautiful C++"
seriesOrder: 27
draft: false
---


## 핵심 내용

- 가끔은 가이드라인을 **어겨야** 하는 경우가 있다 (성능, 외부 API, 저수준 비트 조작)
- 그럴 때는 **위반을 한 곳에 가두고** 안전한 인터페이스로 외부에 노출하라
- 위반 코드는 **명확하게 표시**(주석·이름·정적 분석 억제 지시)하고, 단위 테스트로 보호하라
- 대표 예: `reinterpret_cast`, `const_cast`, 원시 메모리 조작, 스레드 안전 우회 등
- 외부 코드는 위반의 존재를 **모른 채** 안전한 API만 보면 된다

## 예제 코드

```cpp
// Bad: reinterpret_cast가 호출부 곳곳에 흩어짐
void send(const Packet& p) {
    auto* raw = reinterpret_cast<const std::byte*>(&p);
    socket.write(raw, sizeof(p));
}
void log(const Packet& p) {
    auto* raw = reinterpret_cast<const std::byte*>(&p);
    file.write(raw, sizeof(p));
}

// Good: 위반은 한 곳에 캡슐화
class PacketBytes {
    const std::byte* data_;
    std::size_t      size_;
public:
    // 여기서만 reinterpret_cast — 안전성을 보증할 책임도 여기에 집중
    explicit PacketBytes(const Packet& p)
        : data_(reinterpret_cast<const std::byte*>(&p))
        , size_(sizeof(p)) {}

    const std::byte* data() const { return data_; }
    std::size_t      size() const { return size_; }
};

void send(const Packet& p) { PacketBytes b{p}; socket.write(b.data(), b.size()); }
void log (const Packet& p) { PacketBytes b{p}; file  .write(b.data(), b.size()); }
```

## 정리

규칙은 어길 수 있다. 단, **한 군데에 가두고 이름을 붙여라**. 위반 코드가 흩어지면 추적·테스트·교체가 모두 어려워진다.
