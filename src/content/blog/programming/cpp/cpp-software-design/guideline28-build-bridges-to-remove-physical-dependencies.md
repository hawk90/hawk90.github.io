---
title: "가이드라인 28: 물리적 의존성 제거에 Bridge를 사용하라"
date: 2026-05-14T04:00:00
description: "Bridge와 Pimpl 패턴은 추상과 구현을 분리해 헤더 의존성을 격리하고 ABI를 안정화한다. 컴파일 시간을 줄이고 빌드 자유도를 높이는 핵심 도구다."
tags: [C++, Software Design, Bridge, Pimpl]
series: "C++ Software Design"
seriesOrder: 28
draft: true
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

`widget.h`를 include하는 모든 파일은 그 무거운 헤더까지 함께 컴파일한다. 무엇 하나라도 바뀌면 전부 재컴파일이다. 컴파일 시간이 폭발한다.

**Bridge / Pimpl**은 추상과 구현을 분리해 이 문제를 끊어낸다.

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

이제 `widget.h`는 가볍다. include 비용이 떨어지고, 구현이 바뀌어도 `.cpp`만 다시 컴파일하면 된다.

이 가이드라인은 Bridge와 Pimpl 패턴을 통해 컴파일 시간과 ABI 안정성을 함께 잡는 방법을 다룬다.

## 핵심 내용

- **Bridge / Pimpl**: 추상과 구현을 분리한다
- 본질은 헤더에 **포인터만** 두고 실제 구현은 `.cpp`로 미루는 것
- 이점
  - **헤더 의존성 격리**로 컴파일 시간이 줄어든다
  - **ABI 안정성**이 확보돼 구현 변경이 사용자에게 영향을 주지 않는다
  - 구현이 숨겨져 라이브러리 인터페이스가 안정된다
- 비용: 간접 참조와 heap 할당이 더해진다
- 성능 트레이드오프는 가이드라인 29에서 분석한다

## Bridge vs Pimpl

```
Bridge (GoF) — 추상 hierarchy를 구현 hierarchy와 분리
              일반 디자인 패턴
Pimpl        — C++ 특화 idiom
              Bridge의 1:1 단순 형태
              헤더 의존성 격리가 주 목적
```

본질은 같다. Pimpl이 주로 단일 구현을 다룬다면, Bridge는 다양한 구현을 전제로 한다.

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

여기에는 두 개의 hierarchy가 있다.

- Shape (추상) — Circle, Square, ...
- RendererImpl (구현) — OpenGL, Vulkan, ...

두 축이 서로 독립적으로 진화할 수 있다는 점이 핵심이다.

## Pimpl 패턴 — 단순한 Bridge

```cpp
// widget.h — 가볍다
#include <memory>

class Widget {
    class Impl;
    std::unique_ptr<Impl> impl_;
public:
    Widget();
    ~Widget();     // ⚠️ .cpp에 정의해야 한다 — Impl의 완전 타입이 필요
    
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

`widget.h`는 단순해지고 무거운 헤더는 `.cpp`로만 흘러간다.

## 함정 — 소멸자와 이동 연산의 위치

```cpp
// widget.h
class Widget {
    std::unique_ptr<Impl> impl_;
    // 소멸자를 명시하지 않으면 컴파일러가 자동 생성한다
};
```

컴파일러가 자동 생성한 소멸자는 **헤더에 인라인**으로 들어간다. 그 시점에 `Impl`이 완전 타입이어야 하는데, 헤더에는 전방 선언만 있으므로 컴파일 에러가 난다.

해결책은 소멸자를 `.cpp`에 직접 정의하는 것이다.

```cpp
// widget.h
class Widget {
public:
    ~Widget();     // 선언만
};

// widget.cpp
Widget::~Widget() = default;     // 이 시점에 Impl이 완전 타입이다
```

복사·이동 생성자, 대입 연산자도 같은 원칙으로 `.cpp`에 정의해야 한다.

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
    
    // Move-only (또는 5개 모두)
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

Effective Modern C++ 항목 22가 Pimpl의 함정을 자세히 다룬다.

## 헤더 의존성이 끼치는 영향

```
변경 전:
  widget.h 수정 → widget.h를 include한 모든 파일 재컴파일

Pimpl 적용 후:
  widget.cpp 수정 → widget.cpp만 재컴파일 후 relink
  widget.h 수정 (드물게)  → 사용자 재컴파일
```

규모가 큰 프로젝트에서는 빌드 시간이 5분에서 30초로 줄어드는 일도 드물지 않다.

## ABI 안정성

```cpp
// 라이브러리 v1
class Widget {
    int data_;
public:
    void doSomething();
};

// 라이브러리 v2 — 멤버 추가
class Widget {
    int data_;
    int new_data_;     // 추가 — 객체 크기가 바뀐다
public:
    void doSomething();
    void newMethod();
};
```

ABI가 바뀌면 사용자는 재컴파일을 피할 수 없다. 단순한 패치 하나로도 호환성이 깨진다.

Pimpl을 쓰면 다음과 같이 막을 수 있다.

```cpp
// v1 — widget.h
class Widget {
    std::unique_ptr<Impl> impl_;
public:
    void doSomething();
};

// v2 — widget.h는 그대로
class Widget {
    std::unique_ptr<Impl> impl_;
public:
    void doSomething();
    void newMethod();     // 메서드 추가 — Impl만 변경
};
```

`Impl`의 내부가 바뀌어도 사용자 입장의 ABI는 그대로다. 단순 relink만으로 충분하다.

라이브러리를 작성한다면 Pimpl이 사실상 표준이다.

## C++20 modules — Pimpl을 일부 대체

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

C++20 modules는 헤더 시스템 자체를 개선해 include 의존성을 격리한다.

다만 modules를 도입하려면 컴파일러 지원과 빌드 시스템 변경이 함께 필요하므로 보급은 점진적으로 이뤄지고 있다.

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

같은 Shape를 다른 Renderer로 그릴 수 있고, 그 결정은 런타임에 내릴 수 있다. 다양한 백엔드 지원이 Bridge의 전형적인 활용처다.

## Bridge vs Strategy

```
Bridge   — 두 hierarchy를 분리한다 (디자인 시점)
Strategy — 알고리즘을 교체한다 (런타임)
```

겉모습은 닮았지만 의도가 다르다. Bridge는 **추상화 축**을 분리하고, Strategy는 **동작 축**을 교체한다.

## 함정 — heap 할당 비용

```cpp
class Widget {
    std::unique_ptr<Impl> impl_;
public:
    Widget() : impl_(std::make_unique<Impl>()) {}     // ⚠️ heap 할당
};
```

Widget을 만들 때마다 heap 할당이 일어난다. 핫 패스에서는 부담이 된다.

대안은 다음과 같다.

- 객체 풀
- 작은 Impl이라면 small buffer optimization
- 성능 분석은 가이드라인 29에서 자세히 다룬다

## SBO Pimpl — 메모리 최적화

```cpp
class Widget {
    static constexpr size_t SBO_SIZE = 64;
    alignas(alignof(std::max_align_t)) std::byte buffer_[SBO_SIZE];
    Impl* impl_;     // buffer_를 가리키거나 heap을 가리킨다
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

작은 Impl이라면 버퍼에 직접 배치해서 heap 할당을 피한다. 구현은 복잡해지지만 `std::function`도 비슷한 패턴을 쓴다.

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

복사 시에는 Impl을 깊은 복사로 처리한다. 사용자가 Widget을 값 의미론으로 다루기를 기대한다면 이 방식이 자연스럽다.

copy-on-write로 비용을 줄일 수도 있다.

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

자세한 내용은 가이드라인 30(Prototype)을 참고하라.

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

variant 기반 Bridge는 closed set이다. heap 할당이 없고 값 의미론을 그대로 유지한다.

단점은 사용자가 새 구현을 추가하는 확장이 불가능하다는 점이다. open hierarchy가 필요하면 가상 함수로 가야 한다.

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

`std::function`은 type erasure다. 비용은 가상 함수와 heap에 가깝지만 값 의미론을 보존한다.

## 함정 — 지나치게 많은 forwarding

```cpp
class Widget {
    std::unique_ptr<Impl> impl_;
public:
    void method1() { impl_->method1(); }
    void method2() { impl_->method2(); }
    void method3() { impl_->method3(); }
    // ... 50개 메서드 ...
};
```

Pimpl은 forwarding boilerplate를 만든다. 메서드가 50개라면 wrapping도 50줄이다.

대안은 인터페이스를 직접 노출하거나, helper macro 혹은 코드 생성 도구를 쓰는 것이다.

## 표준 라이브러리의 Pimpl 패턴

```cpp
// std::fstream 일부 구현
class std::fstream {
    class Impl;
    std::unique_ptr<Impl> impl_;
public:
    // ...
};
```

표준 라이브러리도 일부 클래스에서 Pimpl을 활용해 구현 디테일을 숨긴다.

## Qt — Pimpl 모범 사례

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

Qt는 라이브러리 전반에 걸쳐 Pimpl을 적극 사용한다. ABI 안정성이 절실한 환경에서 검증된 선택이다.

## 함정 — 모든 클래스에 Pimpl

```cpp
class Point {
    std::unique_ptr<Impl> impl_;     // ⚠️ Point에 Pimpl?
    // Point는 정수 두 개뿐 — heap 할당이 과하다
};
```

작은 값 객체에는 Pimpl이 어울리지 않는다. **공개 라이브러리 인터페이스나 큰 클래스**에 한해 쓰는 것이 맞다.

## 함정 — Pimpl의 복사 정책 모호함

```cpp
class Widget {
    std::unique_ptr<Impl> impl_;
public:
    // 복사 가능한가? unique_ptr는 복사할 수 없다
};
```

복사 정책은 사용자가 명시적으로 결정해야 한다.

- 복사 가능: `std::unique_ptr<Impl>`을 두되 deep copy를 직접 구현
- 복사 불가 (move only): `unique_ptr` 그대로 두고 복사를 막는다
- 공유: `std::shared_ptr<Impl>`로 공유 의미론을 부여

각각 의미가 다르므로 의도를 분명히 드러내야 한다.

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

크기를 컴파일 타임에 알 수 있다면 heap 없는 Pimpl을 만들 수 있다. 인터페이스 안정성을 유지하면서 heap 비용을 0으로 만든다.

## Compilation Firewall

Pimpl의 또 다른 이름이 **컴파일 방화벽**이다.

```
헤더 (가벼움) ─── 사용자가 의존
     ↓
     │  방화벽 (Pimpl)
     ↓
구현 (.cpp, 무거움)
```

방화벽 안쪽에서 구현이 어떻게 바뀌든 사용자에게는 보이지 않는다. 빌드 의존성도 자연스럽게 격리된다.

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

modules와 Pimpl의 조합은 강력하다. 미래에는 이 둘이 함께 쓰이는 모습이 더 자주 보일 것이다.

## 함정 — Static 멤버

```cpp
class Widget::Impl {
    static int counter_;     // ⚠️ 정의는 어디에?
};

// .cpp에 정의가 필요하다
int Widget::Impl::counter_ = 0;
```

Pimpl 내부의 static 멤버는 정의 위치를 신중히 골라야 한다.

## 디자인 결정 — Bridge / Pimpl 적용

```
이 클래스에 Bridge / Pimpl을 쓸까?
├── 공개 라이브러리 인터페이스 → Pimpl ✅ (ABI 안정성)
├── 무거운 헤더 의존 → Pimpl ✅ (빌드 시간)
├── 구현이 자주 바뀐다 → Pimpl ✅
├── 다양한 백엔드 (OpenGL/Vulkan/...) → Bridge
├── 작은 값 객체 → Pimpl 불필요
└── 핫 패스 → 측정 후 결정 (heap 비용)
```

## 실무 가이드 — 체크리스트

Bridge / Pimpl을 적용할 때 점검할 항목이다.

- [ ] 무거운 헤더 의존이 헤더에 노출돼 있는가?
- [ ] ABI 안정성이 필요한가? (공개 라이브러리)
- [ ] 런타임에 다양한 구현을 선택해야 하는가? (Bridge)
- [ ] 소멸자와 이동 연산을 `.cpp`에 정의했는가?
- [ ] 복사 정책을 명확히 정했는가?
- [ ] heap 비용을 측정했는가?
- [ ] C++20 modules가 대안이 될 수 있는가?

## 정리

**Bridge / Pimpl**은 추상과 구현을 분리한다.

이점은 다음과 같다.

- 헤더 의존성 격리
- 빌드 시간 단축
- ABI 안정성
- 구현 숨김 (라이브러리에 특히 유용)

비용도 분명하다.

- 간접 참조 (포인터)
- heap 할당
- forwarding 보일러플레이트

성능 트레이드오프는 가이드라인 29에서 본격적으로 다룬다.

선택할 수 있는 도구도 여러 가지다.

- `std::unique_ptr<Impl>` — 표준 Pimpl
- `std::variant` — closed set Bridge
- `fast_pimpl` — heap 없는 Pimpl
- C++20 modules — 미래의 대안

## 관련 항목

- [가이드라인 9: 추상화 소유권](/blog/programming/cpp/cpp-software-design/guideline09-pay-attention-to-the-ownership-of-abstractions) — Bridge의 추상화
- [가이드라인 29: Bridge 성능](/blog/programming/cpp/cpp-software-design/guideline29-be-aware-of-bridge-performance-gains-and-losses) — 트레이드오프
- [가이드라인 30: Prototype](/blog/programming/cpp/cpp-software-design/guideline30-apply-prototype-for-abstract-copy-operations) — clone 패턴
- [Effective Modern C++ 항목 22: Pimpl](/blog/programming/cpp/effective-modern-cpp/item22-when-using-pimpl-define-special-members-in-impl-file) — Pimpl의 함정
- [Effective C++ 항목 31: 컴파일 의존성](/blog/programming/cpp/effective-cpp/item31-minimize-compilation-dependencies-between-files) — 헤더 의존성
