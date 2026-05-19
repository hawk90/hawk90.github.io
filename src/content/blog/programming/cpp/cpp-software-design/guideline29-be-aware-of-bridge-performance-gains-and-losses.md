---
title: "가이드라인 29: Bridge의 성능 이득과 손실을 인식하라"
date: 2026-05-02T05:00:00
description: "Bridge와 Pimpl은 캐시 미스, 포인터 간접, 힙 할당이라는 비용을 지불한다. 그러나 컴파일 시간 단축과 ABI 안정성이라는 이득이 그만한 가치가 있다."
tags: [C++, Software Design, Bridge, Pimpl, Performance]
series: "C++ Software Design"
seriesOrder: 29
draft: true
---

## 왜 이 가이드라인이 중요한가?

가이드라인 28의 Bridge / Pimpl은 의존성을 끊는 강력한 도구다. 그러나 **공짜는 없다**.

성능 측면의 비용은 다음과 같다.

- 멤버 접근마다 포인터 간접 참조가 한 번씩 추가된다
- 객체마다 힙 할당이 더해진다
- 데이터가 떨어진 위치에 놓여 캐시 미스가 늘어난다
- virtual을 함께 쓰면 동적 dispatch 비용이 겹친다

반대로 성능 측면의 이득도 분명하다.

- 헤더가 가벼워져 컴파일 시간이 줄어든다
- 헤더를 그대로 두고 구현을 바꿀 수 있어 ABI가 안정된다
- 객체 크기가 포인터 하나로 고정되어 메모리가 절약되기도 한다

언제 쓸지는 결국 **트레이드오프 인식**의 문제다. Pimpl은 무조건 좋지도 나쁘지도 않다.

## 핵심 비용 — 포인터 간접

```cpp
class Widget {
public:
    void draw() const;
    int width() const;
private:
    class Impl;
    std::unique_ptr<Impl> pimpl_;
};

// 호출 비용 분석
widget.draw();
// 1. pimpl_ load (포인터)
// 2. pimpl_ 위치로 dereference
// 3. Impl::draw 호출

widget.width();
// 1. pimpl_ load
// 2. dereference
// 3. Impl::width_ 반환
```

비용은 다음과 같다.

- 모든 메서드 호출에 dereference가 한 번 더해진다
- 구현이 다른 TU에 있으므로 인라이닝이 불가능하다
- Widget과 Impl이 떨어진 메모리에 있어 캐시 미스가 생긴다

대부분의 경우 **무시할 만한** 수준이다(보통 한 사이클 정도). 다만 **hot path**라면 측정이 필요하다.

## 핵심 비용 — 힙 할당

```cpp
Widget::Widget()
    : pimpl_(std::make_unique<Impl>()) {}    // 힙 할당
```

문제는 다음과 같다.

- 객체를 만들 때마다 힙 할당이 일어난다 (느리다)
- 라이프타임이 짧은 객체라면 할당 비용이 사용 시간을 넘길 수도 있다
- 멀티 스레드 환경에서는 allocator 경합까지 발생한다

```cpp
for (int i = 0; i < 1000000; ++i) {
    Widget w;        // 매번 힙 할당 — 매우 느리다
    w.draw();
}
```

스택 객체와 비교하면 차이가 분명히 드러난다.

```cpp
class WidgetSimple {
    int width_;
    int height_;
    // ... 멤버
};

for (int i = 0; i < 1000000; ++i) {
    WidgetSimple w;        // 스택 — 거의 무료
    w.draw();
}
```

## 핵심 비용 — 캐시 미스

```cpp
// 메모리 레이아웃
// Widget on stack:   [pimpl_ pointer (8 bytes)]
//                    
// Impl on heap:      [width][height][color][...]
```

Widget 배열을 순회할 때 문제가 두드러진다.

```cpp
std::vector<Widget> widgets;
// 메모리:
// widgets[0]: [ptr0] → heap: [data0]
// widgets[1]: [ptr1] → heap: [data1]
// widgets[2]: [ptr2] → heap: [data2]

for (auto& w : widgets) {
    w.draw();    // 매번 다른 heap 위치 — 캐시 미스
}
```

일반 객체 배열은 정반대다.

```cpp
std::vector<WidgetSimple> widgets;
// 메모리: 연속된 [data0][data1][data2]...

for (auto& w : widgets) {
    w.draw();    // 캐시 친화적 — prefetcher가 효과를 낸다
}
```

자연스럽게 SOA(structure of arrays)와 AOS(array of structures) 논의로 이어진다.

## 이득 — 컴파일 시간 단축

실무에서 가장 크게 체감되는 이득이다.

```cpp
// 헤더 (Pimpl 적용 전)
#include <vector>
#include <memory>
#include <string>
#include <complex_dependency.h>

class Widget {
    std::vector<int> data_;
    std::shared_ptr<Helper> helper_;
    Complex obj_;
public:
    void render();
};

// 이 헤더를 include할 때마다 모든 의존 헤더를 파싱해야 한다
```

```cpp
// 헤더 (Pimpl 적용)
#include <memory>

class Widget {
    class Impl;
    std::unique_ptr<Impl> pimpl_;
public:
    Widget();
    ~Widget();
    void render();
};
```

효과는 다음과 같다.

- 헤더가 가벼워진다 — `std::vector`, `shared_ptr` 같은 의존을 떨어낼 수 있다
- Impl만 수정하면 다른 TU는 영향을 받지 않아 재컴파일이 최소화된다
- **대형 프로젝트**에서는 빌드 시간이 절반으로 줄어드는 사례도 흔하다

LLVM, Chromium 같은 대형 프로젝트가 Pimpl을 광범위하게 활용하는 이유이기도 하다.

## 이득 — ABI 안정성

```cpp
// 라이브러리 1.0 헤더
class Widget {
    class Impl;
    std::unique_ptr<Impl> pimpl_;
};

// 라이브러리 2.0 — Impl에 멤버 추가
// 헤더는 그대로 → 클라이언트 재컴파일 불필요
```

ABI 안정성이 만들어 내는 가치는 다음과 같다.

- Qt, Boost처럼 Pimpl을 통해 ABI 호환성을 유지하는 사례가 많다
- 클라이언트는 새 버전과 링크만 다시 하면 되고, 재컴파일은 필요 없다
- 라이브러리는 사용자에게 부담을 주지 않고 진화할 수 있다

자세한 내용은 [Effective Modern C++ 항목 22](/blog/programming/cpp/effective-modern-cpp/item22-when-using-the-pimpl-idiom-define-special-member-functions-in-the-implementation-file)에서 다룬다.

## 측정 — 실제 벤치마크

```cpp
// 단순 접근 비교
class Direct {
    int value_;
public:
    int get() const { return value_; }
};

class PimplVer {
    class Impl;
    std::unique_ptr<Impl> pimpl_;
public:
    PimplVer();
    int get() const;
};

// 결과 (가상의 수치)
// Direct::get()      — 0.5 ns
// PimplVer::get()    — 1.5 ns
// 차이 — 1 ns × 호출 횟수
```

해석은 호출 빈도에 따라 갈린다.

- 한 번 호출이면 무시할 만하다
- 100만 번이면 약 1 ms이며 보통은 무시한다
- 10억 번이라면 약 1초가 되어 측정할 가치가 있다

## 최적화 — SBO (Small Buffer Optimization)

Pimpl의 힙 할당을 제거하는 변형이다.

```cpp
template<typename T, size_t N = 64>
class FastPimpl {
    alignas(T) std::byte buffer_[N];
public:
    template<typename... Args>
    FastPimpl(Args&&... args) {
        new (buffer_) T(std::forward<Args>(args)...);
    }
    
    ~FastPimpl() {
        ptr()->~T();
    }
    
    T* operator->() { return ptr(); }
    
private:
    T* ptr() { return reinterpret_cast<T*>(buffer_); }
};
```

효과는 분명하다.

- 힙 할당이 0이다
- 버퍼가 클래스 내부에 있어 캐시 친화적이다
- 단점은 `sizeof(T)`를 알아야 한다는 점이다 — 헤더에 N을 명시해야 한다

다만 그 대가로 Pimpl이 주는 컴파일 시간 단축이나 ABI 안정성 같은 이득의 일부는 잃는다. 트레이드오프가 또 한 번 바뀌는 셈이다.

## 최적화 — 객체 풀

```cpp
class WidgetPool {
    std::vector<std::unique_ptr<Widget::Impl>> pool_;
public:
    Widget acquire() {
        if (pool_.empty()) {
            return Widget{std::make_unique<Widget::Impl>()};
        }
        auto impl = std::move(pool_.back());
        pool_.pop_back();
        return Widget{std::move(impl)};
    }
    
    void release(Widget&& w) {
        pool_.push_back(std::move(w.pimpl_));
    }
};
```

힙 할당을 한곳에 모아 비용을 분산시키는 방식이다.

## 함정 — 성능 측정 없이 Pimpl을 제거

```cpp
// 추정으로만 결정한 경우
// "Pimpl이 느릴 거야, 일반 클래스로 바꾸자"

// 결과
// 컴파일 시간 — 30% 증가
// 런타임      — 측정조차 어려움 (보통 0%)
// 결론        — 잘못된 최적화
```

Pimpl을 제거하기 전에 측정이 반드시 선행돼야 한다. premature optimization의 전형적인 사례다.

## 함정 — virtual 추가 비용

Pimpl과 Bridge가 결합된 경우다.

```cpp
class Widget {
    class Impl;
    std::unique_ptr<Impl> pimpl_;
public:
    void draw() {
        pimpl_->draw();    // 1. pimpl_ deref
                           // 2. Impl::draw가 virtual이면 vtable 조회
                           // 3. 실제 함수 호출
    }
};
```

이중 간접 참조가 된다. 측정해 보면 virtual의 영향이 Pimpl보다 더 크게 나타나는 경우가 많다.

## 비교 표

| 측면 | 일반 클래스 | Pimpl |
|---|---|---|
| 메서드 호출 | 직접 | dereference 1회 추가 |
| 객체 생성 | 스택 | 힙 + 스택 |
| sizeof | 멤버 합 | 포인터 크기 |
| 캐시 친화성 | 좋음 | 나쁨 (산재) |
| 컴파일 시간 | 헤더 무거움 | 헤더 가벼움 |
| ABI 안정성 | 약함 | 강함 |
| 인라이닝 가능성 | 가능 | 불가 (분리 컴파일) |

## 결정 — 언제 Pimpl을 쓸까?

Pimpl 사용을 검토할 만한 경우는 다음과 같다.

- 라이브러리나 API에서 ABI 안정성이 필요할 때
- 헤더가 무거워 컴파일 시간이 문제일 때
- 대형 프로젝트에서 TU 의존을 끊어야 할 때
- 멤버가 자주 바뀌어 재컴파일 부담이 클 때

반대로 피해야 할 경우는 다음과 같다.

- 매 사이클이 중요한 성능 핵심 hot path
- 라이프타임이 매우 짧은 객체 — 힙 할당이 부담
- 작은 객체 — 멤버 합보다 포인터가 더 클 수도 있다
- 인라이닝이 꼭 필요한 getter / setter

## 모던 변형 — C++20 modules

```cpp
// widget.cppm
export module widget;

export class Widget {
    int width_;
    int height_;
public:
    void draw() const;
};
```

효과는 다음과 같다.

- 헤더 의존 문제는 module 시스템이 직접 해결한다
- Pimpl을 쓰는 동기의 상당 부분이 사라진다
- 다만 ABI 안정성 측면에서는 여전히 Pimpl이 더 강하다

## 실무 가이드 — 결정 트리

```
Pimpl을 쓸까?
├── 라이브러리 API + 외부 노출 → 예 (ABI)
├── 컴파일 시간이 문제 → 예 (TU 절단)
├── hot path 클래스 → 아니오 (간접 비용)
├── 라이프타임이 짧음 → 아니오 (힙 비용)
└── 일반 비즈니스 로직 → 측정 후 결정
```

## 실무 가이드 — 체크리스트

- [ ] Pimpl 도입을 측정으로 정당화했는가?
- [ ] 컴파일 시간 단축 효과를 실제로 확인했는가?
- [ ] hot path에서 추가 간접 비용을 측정하고 수용했는가?
- [ ] SBO로 힙을 제거하는 FastPimpl을 고려했는가?
- [ ] 빈번한 생성이 있다면 객체 풀을 고려했는가?
- [ ] virtual과 결합될 때 이중 간접 비용을 측정했는가?

## 핵심 정리

1. **포인터 간접** — 메서드 호출마다 dereference 한 번
2. **힙 할당** — 객체 생성 시 추가 비용
3. **캐시 미스** — 멤버가 분산되어 AOS 손해
4. **컴파일 시간 단축** — 가장 큰 실질적 이득
5. **ABI 안정성** — 라이브러리에 결정적인 가치
6. **SBO** — Pimpl의 힙 비용을 피하는 방법
7. **측정 우선** — premature optimization을 경계할 것

## 관련 항목

- [가이드라인 28: Bridge 패턴](/blog/programming/cpp/cpp-software-design/guideline28-build-bridges-to-remove-physical-dependencies) — 동기와 구조
- [EMC++ 항목 22: Pimpl 특수 멤버 함수](/blog/programming/cpp/effective-modern-cpp/item22-when-using-the-pimpl-idiom-define-special-member-functions-in-the-implementation-file) — 구현 세부
- [Beautiful C++ 항목 23: 템플릿 추상화](/blog/programming/cpp/beautiful-cpp/item23-use-templates-for-abstraction) — 컴파일 타임 대안
- [가이드라인 22: 값 의미론](/blog/programming/cpp/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — 일반 객체의 이점
