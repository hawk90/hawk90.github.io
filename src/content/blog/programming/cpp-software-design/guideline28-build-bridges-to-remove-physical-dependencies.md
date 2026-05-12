---
title: "가이드라인 28: 물리적 의존성 제거에 Bridge를 사용하라"
date: 2026-05-15T10:00:00
description: "Bridge / Pimpl — 추상과 구현 분리, 헤더 의존성 격리, ABI 안정성. 컴파일 시간 ↓, 빌드 자유."
tags: [C++, Software Design, Bridge, Pimpl]
series: "C++ Software Design"
seriesOrder: 28
---

## 왜 이 가이드라인이 중요한가?

```cpp
// widget.h
#include <heavy_header_1.h>
#include <heavy_header_2.h>
#include <heavy_header_3.h>

class Widget {
    HeavyType1 a_;
    HeavyType2 b_;
    HeavyType3 c_;
public:
    void doSomething();
};
```

`widget.h` include하는 모든 파일 — 무거운 헤더 모두 컴파일. 변경 시 — 모두 재컴파일. 컴파일 시간 폭발.

**Bridge / Pimpl** — 추상과 구현 분리:

```cpp
// widget.h
class WidgetImpl;     // 전방 선언만

class Widget {
    std::unique_ptr<WidgetImpl> impl_;
public:
    Widget();
    ~Widget();
    void doSomething();
};

// widget.cpp
#include <heavy_header_1.h>
#include <heavy_header_2.h>
#include <heavy_header_3.h>

class WidgetImpl {
    HeavyType1 a_;
    HeavyType2 b_;
    HeavyType3 c_;
};
```

이제 `widget.h` — 가벼움. include 비용 ↓. 구현 변경 시 — `.cpp`만 재컴파일.

이 가이드라인 — Bridge / Pimpl 패턴 + 컴파일 시간 + ABI 안정성.

## 핵심 내용

- **Bridge / Pimpl** — 추상과 구현 분리
- 본질 — 헤더에 — **포인터만**, 실제 구현 — `.cpp`에
- 이점:
  - **헤더 의존성 격리** — 컴파일 시간 ↓
  - **ABI 안정성** — 구현 변경이 사용자 영향 X
  - **구현 숨김** — 라이브러리 인터페이스 안정
- 비용 — 간접 참조 + heap 할당
- 가이드라인 29 — 성능 트레이드오프

## Bridge vs Pimpl

```
Bridge (GoF) — 추상 hierarchy를 구현 hierarchy와 분리
              일반 디자인 패턴

Pimpl — C++ 특화 idiom
       Bridge의 단순 형태 (1:1)
       헤더 의존성 격리가 주 목적
```

본질 같음. Pimpl — 보통 단일 구현, Bridge — 다양한 구현.

## GoF Bridge 구조

```cpp
// Implementation interface (옛 "Implementor")
class RendererImpl {
public:
    virtual ~RendererImpl() = default;
    virtual void draw_circle(double x, double y, double r) = 0;
    virtual void draw_line(double x1, double y1, double x2, double y2) = 0;
};

// Concrete implementations
class OpenGLRenderer : public RendererImpl { /* ... */ };
class VulkanRenderer : public RendererImpl { /* ... */ };

// Abstraction
class Shape {
    std::unique_ptr<RendererImpl> renderer_;
public:
    explicit Shape(std::unique_ptr<RendererImpl> r) : renderer_(std::move(r)) {}
    virtual void draw() = 0;
};

// Refined abstraction
class Circle : public Shape {
    double x_, y_, r_;
public:
    void draw() override {
        renderer_->draw_circle(x_, y_, r_);
    }
};
```

두 hierarchy:
- Shape (추상) — Circle, Square, ...
- RendererImpl (구현) — OpenGL, Vulkan, ...

각자 독립 진화.

## Pimpl 패턴 — 단순 Bridge

```cpp
// widget.h — 가벼움
#include <memory>

class Widget {
    class Impl;
    std::unique_ptr<Impl> impl_;
public:
    Widget();
    ~Widget();     // ⚠️ .cpp에 정의 — Impl 완전 타입 필요
    
    Widget(const Widget&) = delete;     // 또는 .cpp에서 정의
    Widget& operator=(const Widget&) = delete;
    Widget(Widget&&) noexcept;
    Widget& operator=(Widget&&) noexcept;
    
    void doSomething();
};

// widget.cpp
#include "widget.h"
#include <heavy_header_1.h>
#include <heavy_header_2.h>

class Widget::Impl {
    HeavyType1 a_;
    HeavyType2 b_;
public:
    void doSomething() { /* ... */ }
};

Widget::Widget() : impl_(std::make_unique<Impl>()) {}
Widget::~Widget() = default;
Widget::Widget(Widget&&) noexcept = default;
Widget& Widget::operator=(Widget&&) noexcept = default;

void Widget::doSomething() { impl_->doSomething(); }
```

`widget.h` — 단순. `heavy_header` — `.cpp`에만.

## 함정 — 소멸자 / 이동 정의

```cpp
// widget.h
class Widget {
    std::unique_ptr<Impl> impl_;
    // 소멸자 명시 안 함 — 컴파일러 자동 생성
};
```

컴파일러 자동 생성 소멸자 — **헤더에 인라인**. 그 시점에 — `Impl`의 완전 타입 필요. 헤더에 — 전방 선언만 있으면 컴파일 에러.

해결: 소멸자를 `.cpp`에 명시:

```cpp
// widget.h
class Widget {
public:
    ~Widget();     // 선언만
};

// widget.cpp
Widget::~Widget() = default;     // 여기서 Impl 완전 타입
```

복사·이동 ctor / 대입도 — 마찬가지 (.cpp에).

## EMC++ 항목 22 — Pimpl Idiom

```cpp
// 표준 Pimpl 패턴

// widget.h
class Widget {
    struct Impl;
    std::unique_ptr<Impl> impl_;
public:
    Widget();
    ~Widget();
    
    // Move-only (또는 모든 5)
    Widget(Widget&&) noexcept;
    Widget& operator=(Widget&&) noexcept;
    
    void doSomething();
};

// widget.cpp
struct Widget::Impl {
    // ... 멤버 ...
};

Widget::Widget() : impl_(std::make_unique<Impl>()) {}
Widget::~Widget() = default;
Widget::Widget(Widget&&) noexcept = default;
Widget& Widget::operator=(Widget&&) noexcept = default;
```

Effective Modern C++ 항목 22 — 자세한 Pimpl 가이드.

## 헤더 의존성 — 효과

```
변경 전:
  widget.h 수정 → 모든 widget.h include 파일 재컴파일

변경 후 (Pimpl):
  widget.cpp 수정 → widget.cpp만 재컴파일 + relink
  widget.h 수정 (드물게) → 사용자 재컴파일
```

큰 프로젝트 — **빌드 시간 대폭 감소**. 5분 → 30초 변화 가능.

## ABI 안정성

```cpp
// 라이브러리 v1
class Widget {
    int data_;
public:
    void doSomething();
};

// 라이브러리 v2 — 새 멤버 추가
class Widget {
    int data_;
    int new_data_;     // 추가 — 객체 크기 변경
public:
    void doSomething();
    void newMethod();
};
```

ABI 변경 — 사용자 재컴파일 필수. 단순 패치도 — 호환 깨짐.

Pimpl로:

```cpp
// v1 — widget.h
class Widget {
    std::unique_ptr<Impl> impl_;
public:
    void doSomething();
};

// v2 — widget.h 그대로
class Widget {
    std::unique_ptr<Impl> impl_;
public:
    void doSomething();
    void newMethod();     // 추가 — Impl 변경
};
```

`Impl`의 내부 변경 — 사용자에게 ABI 영향 X. 단순 relink 충분.

라이브러리 작성 — Pimpl 표준.

## C++20 modules — Pimpl 일부 대체

```cpp
// widget.cppm
export module widget;

import <heavy_header_1>;
import <heavy_header_2>;

export class Widget {
    HeavyType1 a_;
    HeavyType2 b_;
public:
    void doSomething();
};
```

C++20 modules — 헤더 시스템 자체 개선. include 의존성 격리.

그러나 — modules 도입 — 컴파일러 지원 + build system 변화 필요. 점진적.

## Bridge의 다양한 구현

```cpp
class Renderer {
public:
    virtual ~Renderer() = default;
    virtual void draw_circle(...) = 0;
};

class OpenGLRenderer : public Renderer { /* ... */ };
class VulkanRenderer : public Renderer { /* ... */ };
class SoftwareRenderer : public Renderer { /* ... */ };

class Shape {
    std::unique_ptr<Renderer> renderer_;
public:
    Shape(std::unique_ptr<Renderer> r) : renderer_(std::move(r)) {}
    virtual void draw() = 0;
};
```

같은 Shape — 다른 Renderer로 그릴 수 있음. 런타임 결정.

다양한 백엔드 지원 — Bridge.

## Bridge vs Strategy

```
Bridge — 두 hierarchy 분리 (디자인 시점)
Strategy — 알고리즘 교체 (런타임)
```

겉보기 비슷 — 의도 다름. Bridge는 — **추상화 측면**에서 분리, Strategy는 — **동작 측면**.

## 함정 — heap 할당 비용

```cpp
class Widget {
    std::unique_ptr<Impl> impl_;
public:
    Widget() : impl_(std::make_unique<Impl>()) {}     // ⚠️ heap 할당
};
```

매 Widget 생성 — heap 할당. 핫 패스 — 비쌈.

해결책:
- 객체 풀
- 작은 Impl은 — small buffer optimization
- 가이드라인 29 — 성능 분석

## SBO Pimpl — 메모리 최적화

```cpp
class Widget {
    static constexpr size_t SBO_SIZE = 64;
    alignas(alignof(std::max_align_t)) std::byte buffer_[SBO_SIZE];
    Impl* impl_;     // buffer_를 가리키거나 heap
public:
    Widget() {
        if constexpr (sizeof(Impl) <= SBO_SIZE) {
            impl_ = new (buffer_) Impl;     // placement new
        } else {
            impl_ = new Impl;     // heap
        }
    }
    ~Widget() {
        if (impl_ == reinterpret_cast<Impl*>(buffer_)) {
            impl_->~Impl();
        } else {
            delete impl_;
        }
    }
};
```

작은 Impl — buffer에 직접. heap 할당 회피.

복잡. `std::function`이 — 비슷한 패턴 사용.

## 함정 — Impl 복사

```cpp
class Widget {
    std::unique_ptr<Impl> impl_;
public:
    Widget(const Widget& other) : impl_(std::make_unique<Impl>(*other.impl_)) {}
    Widget& operator=(const Widget& other) {
        *impl_ = *other.impl_;     // deep copy
        return *this;
    }
};
```

복사 — Impl 깊은 복사. 사용자 — Widget을 — value semantic으로 다룸.

또는 copy-on-write:

```cpp
class Widget {
    std::shared_ptr<const Impl> impl_;     // 공유 가능 (const)
public:
    void modify() {
        if (impl_.use_count() > 1) {
            impl_ = std::make_shared<Impl>(*impl_);     // CoW
        }
        // ...
    }
};
```

가이드라인 30 (Prototype) 참고.

## std::variant 기반 Bridge

```cpp
class OpenGLRenderer { void draw_circle(...); };
class VulkanRenderer { void draw_circle(...); };

using Renderer = std::variant<OpenGLRenderer, VulkanRenderer>;

class Shape {
    Renderer renderer_;
public:
    Shape(Renderer r) : renderer_(std::move(r)) {}
    void draw_circle(...) {
        std::visit([&](auto& r) { r.draw_circle(...); }, renderer_);
    }
};
```

variant — closed set Bridge. heap 할당 X. value semantics.

단 — 사용자 확장 X (open hierarchy 필요하면 가상 함수).

## std::function 기반 Bridge

```cpp
class Shape {
    std::function<void(double, double, double)> draw_circle_fn_;
public:
    template<typename Renderer>
    Shape(Renderer r) : draw_circle_fn_(
        [r = std::move(r)](double x, double y, double rr) mutable {
            r.draw_circle(x, y, rr);
        }
    ) {}
};
```

`std::function` — type erasure. 가상 함수 + heap 비슷한 비용 + value semantics.

## 함정 — 너무 많은 forwarding

```cpp
class Widget {
    std::unique_ptr<Impl> impl_;
public:
    void method1() { impl_->method1(); }
    void method2() { impl_->method2(); }
    void method3() { impl_->method3(); }
    // ... 50 메서드 ...
};
```

Pimpl — boilerplate forwarding. 50개 메서드 → 50줄 wrapping.

대안 — 직접 사용 또는 helper macro / 도구.

## 표준 라이브러리 — Pimpl 패턴

```cpp
// std::fstream 일부 구현
class std::fstream {
    class Impl;
    std::unique_ptr<Impl> impl_;
public:
    // ...
};
```

표준 라이브러리 일부 — Pimpl 활용. 구현 디테일 숨김.

## Qt — Pimpl 모범

```cpp
// QString.h (단순화)
class QString {
    QStringPrivate* d;
public:
    QString();
    ~QString();
    // ...
};
```

Qt — Pimpl 광범위. 라이브러리 ABI 안정성.

## 함정 — 모든 클래스에 Pimpl

```cpp
class Point {
    std::unique_ptr<Impl> impl_;     // ⚠️ Point에 Pimpl?
    // Point — 2개 정수만 — heap 할당 부담
};
```

작은 값 객체 — Pimpl 불필요. **공개 라이브러리 인터페이스 / 큰 클래스**에만.

## 함정 — Pimpl의 deep copy 모호

```cpp
class Widget {
    std::unique_ptr<Impl> impl_;
public:
    // 복사 가능? unique_ptr는 복사 X
};
```

사용자 결정:
- 복사 가능 — `std::unique_ptr<Impl>`로 두면 사용자가 직접 deep copy 정의
- 복사 불가 (move only) — `unique_ptr` 그대로
- 공유 — `std::shared_ptr<Impl>`

각자 — 의미 다름. 명시.

## 모던 변형 — fast_pimpl

```cpp
template<typename T, size_t Size, size_t Align>
class FastPimpl {
    alignas(Align) std::byte storage_[Size];
public:
    template<typename... Args>
    FastPimpl(Args&&... args) {
        new (&storage_) T(std::forward<Args>(args)...);
    }
    ~FastPimpl() { reinterpret_cast<T*>(&storage_)->~T(); }
    
    T* operator->() { return reinterpret_cast<T*>(&storage_); }
};
```

heap 없는 Pimpl — 컴파일 타임 알려진 크기. 인터페이스 안정 + 0 heap.

## Compilation Firewall

Pimpl의 또 다른 이름 — **컴파일 방화벽**:

```
헤더 (가벼움) ─── 사용자가 의존
     ↓
     │  방화벽 (Pimpl)
     ↓
구현 (.cpp, 무거움)
```

구현 변경 — 사용자에게 영향 X. 빌드 의존성 격리.

## C++20 Modules + Pimpl

```cpp
// widget.cppm
export module widget;

class WidgetImpl;     // 전방 선언

export class Widget {
    std::unique_ptr<WidgetImpl> impl_;
public:
    Widget();
    ~Widget();
    void doSomething();
};

// widget_impl.cppm — internal module
module widget;

import <heavy_header>;

class WidgetImpl {
    // ...
};

Widget::Widget() : impl_(std::make_unique<WidgetImpl>()) {}
```

modules + Pimpl — 강력한 조합. 미래.

## 함정 — Static 멤버

```cpp
class Widget::Impl {
    static int counter_;     // ⚠️ 정의 어디에?
};

// .cpp에 정의 필요
int Widget::Impl::counter_ = 0;
```

Pimpl 안의 static — 정의 위치 신중.

## 디자인 결정 — Bridge / Pimpl 적용

```
이 클래스에 Bridge / Pimpl 적용?
├── 공개 라이브러리 인터페이스 → Pimpl ✅ (ABI 안정성)
├── 무거운 헤더 의존 → Pimpl ✅ (빌드 시간)
├── 자주 변하는 구현 → Pimpl ✅
├── 다양한 백엔드 (OpenGL/Vulkan/...) → Bridge
├── 작은 값 객체 → Pimpl X
└── 핫 패스 → 측정 후 결정 (heap 비용)
```

## 실무 가이드 — 체크리스트

Bridge / Pimpl 적용 시:

- [ ] 무거운 헤더 의존이 — 헤더에 노출?
- [ ] ABI 안정성 필요? (공개 라이브러리)
- [ ] 다양한 구현 — 런타임 선택? (Bridge)
- [ ] 소멸자 / 이동 — `.cpp`에 정의?
- [ ] 복사 정책 — 명시?
- [ ] heap 비용 — 측정?
- [ ] C++20 modules — 대안 검토?

## 정리

**Bridge / Pimpl** — 추상과 구현 분리.

이점:
- 헤더 의존성 격리
- 빌드 시간 ↓
- ABI 안정성
- 구현 숨김 (라이브러리)

비용:
- 간접 참조 (포인터)
- heap 할당
- 보일러플레이트 (forwarding)

가이드라인 29 — 성능 트레이드오프 분석.

도구:
- `std::unique_ptr<Impl>` — 표준 Pimpl
- `std::variant` — closed set Bridge
- `fast_pimpl` — heap 없는 Pimpl
- C++20 modules — 미래

## 관련 항목

- [가이드라인 9: 추상화 소유권](/blog/programming/cpp-software-design/guideline09-pay-attention-to-the-ownership-of-abstractions) — Bridge의 추상화
- [가이드라인 29: Bridge 성능](/blog/programming/cpp-software-design/guideline29-be-aware-of-bridge-performance-gains-and-losses) — 트레이드오프
- [가이드라인 30: Prototype](/blog/programming/cpp-software-design/guideline30-apply-prototype-for-abstract-copy-operations) — clone
- [Effective Modern C++ 항목 22: Pimpl](/blog/programming/effective-modern-cpp/item22-when-using-pimpl-define-special-members-in-impl-file) — Pimpl 함정
- [Effective C++ 항목 31: 컴파일 의존성](/blog/programming/effective-cpp/item31-minimize-compilation-dependencies-between-files) — 헤더 의존성
