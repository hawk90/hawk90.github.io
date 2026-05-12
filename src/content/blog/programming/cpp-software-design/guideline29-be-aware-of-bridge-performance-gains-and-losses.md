---
title: "가이드라인 29: Bridge의 성능 이득과 손실을 인식하라"
date: 2026-05-15T00:00:00
description: "Bridge/Pimpl의 성능 — 캐시 미스, 포인터 간접, 힙 할당. 그러나 컴파일 시간 단축, ABI 안정성의 가치."
tags: [C++, Software Design, Bridge, Pimpl, Performance]
series: "C++ Software Design"
seriesOrder: 29
---

## 왜 이 가이드라인이 중요한가?

Bridge/Pimpl(가이드라인 28) — 강력한 dependency 절단 도구. 그러나 **공짜는 없음**.

**성능 비용**:
- 포인터 간접 — 모든 멤버 접근에 한 번
- 힙 할당 — 객체마다 추가 메모리
- 캐시 미스 — 데이터가 떨어진 위치
- 동적 dispatch — virtual 사용 시

**성능 이득** (가능):
- 컴파일 시간 단축 — header가 가벼움
- ABI 안정성 — 헤더 수정 없이 구현 변경
- 메모리 절약 — sizeof가 포인터 크기

언제 사용할지 — **trade-off 인식**. 무조건 좋지도, 나쁘지도 않음.

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

// 호출 비용 분석:
widget.draw();
// 1. pimpl_ load (포인터)
// 2. pimpl_ 위치로 dereference
// 3. Impl::draw 호출

widget.width();
// 1. pimpl_ load
// 2. dereference
// 3. Impl::width_ 반환
```

**비용**:
- 모든 메서드 호출 — 추가 dereference 한 번
- 인라인 불가능 — 구현이 다른 TU에 있음
- 캐시 미스 — Widget과 Impl이 떨어진 메모리

**보통은 무시할 만함** — 한 사이클 정도. 그러나 **hot path**에선 측정 필요.

## 핵심 비용 — 힙 할당

```cpp
Widget::Widget()
    : pimpl_(std::make_unique<Impl>()) {}    // 힙 할당
```

**문제**:
- 객체 생성마다 — 힙 할당 (느림)
- 짧은 라이프타임 객체 — 할당 비용이 사용 시간 초과 가능
- Allocator 경합 — 멀티 스레드 환경에서

```cpp
for (int i = 0; i < 1000000; ++i) {
    Widget w;        // 매번 힙 할당 — 매우 느림
    w.draw();
}
```

**대조** — 스택 객체:

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
// 메모리 레이아웃:
// Widget on stack:   [pimpl_ pointer (8 bytes)]
//                    
// Impl on heap:      [width][height][color][...]
```

**문제** — Widget 객체 array 순회 시:

```cpp
std::vector<Widget> widgets;
// 메모리:
// widgets[0]: [ptr0] → heap: [data0]
// widgets[1]: [ptr1] → heap: [data1]
// widgets[2]: [ptr2] → heap: [data2]

for (auto& w : widgets) {
    w.draw();    // 각각 다른 heap 위치 → 캐시 미스
}
```

**대조** — 일반 객체 array:

```cpp
std::vector<WidgetSimple> widgets;
// 메모리: 연속 [data0][data1][data2]...

for (auto& w : widgets) {
    w.draw();    // 캐시 친화적 — prefetcher 효과
}
```

**SOA vs AOS**(structure of arrays vs array of structures) 논의로 연결.

## 이득 — 컴파일 시간 단축

가장 큰 실질적 이득:

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

// 매번 #include 시 — 모든 의존 헤더 파싱
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

**효과**:
- header 가벼움 — std::vector, shared_ptr 등 의존 제거
- 변경 시 재컴파일 최소화 — Impl 수정해도 다른 TU 영향 없음
- **대형 프로젝트** — 빌드 시간 절반 절감 사례 흔함

LLVM, Chromium 등 대형 프로젝트 — Pimpl 광범위 사용.

## 이득 — ABI 안정성

```cpp
// 라이브러리 1.0 헤더
class Widget {
    class Impl;
    std::unique_ptr<Impl> pimpl_;
};

// 라이브러리 2.0 — Impl에 멤버 추가
// 헤더 동일 → 클라이언트 재컴파일 불필요
```

**ABI 안정성의 가치**:
- Qt, Boost 등 — Pimpl로 ABI 호환성 유지
- 클라이언트 — 새 버전과 링크만 — 재컴파일 안 함
- 라이브러리 진화 — 사용자에게 부담 없이

자세한 내용 — [Effective Modern C++ 항목 22](/blog/programming/effective-modern-cpp/item22-when-using-the-pimpl-idiom-define-special-member-functions-in-the-implementation-file).

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

**해석**:
- 한 번 호출 — 무시할 만
- 1,000,000번 호출 — 1 ms — 보통 무시
- 1,000,000,000번 호출 — 1초 — 측정 가치

## 최적화 — SBO (Small Buffer Optimization)

Pimpl의 힙 할당 제거:

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

**효과**:
- 힙 할당 0
- 캐시 친화적 — buffer가 클래스 내부
- 단점 — sizeof(T) 알아야 함 — 헤더에 N 명시 필요

**trade-off** — Pimpl의 일부 이득(컴파일 시간, ABI)을 잃지만 — 성능은 회복.

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

**효과** — 힙 할당을 한 번에 모음.

## 함정 — 성능 측정 없이 Pimpl 제거

```cpp
// 추정으로 결정
// "Pimpl 느릴 거야, 일반 클래스로 바꾸자"

// 결과
// 컴파일 시간 — 30% 증가
// 런타임 — 측정 어려움 (보통 0%)
// 결론 — 잘못된 최적화
```

**Pimpl 제거 전** — 측정 필수. Premature optimization 함정.

## 함정 — virtual 추가 비용

Pimpl + Bridge 결합:

```cpp
class Widget {
    class Impl;
    std::unique_ptr<Impl> pimpl_;
public:
    void draw() {
        pimpl_->draw();    // 1. pimpl_ deref
                           // 2. Impl::draw (virtual) — vtable 조회
                           // 3. 실제 함수 호출
    }
};
```

이중 간접 — Pimpl + virtual. 측정 시 — virtual의 영향이 더 큼.

## 비교 표

| 측면 | 일반 클래스 | Pimpl |
|---|---|---|
| 메서드 호출 | 직접 | 1 deref |
| 객체 생성 | 스택 | 힙 + 스택 |
| sizeof | 멤버 합 | 포인터 크기 |
| 캐시 친화성 | 좋음 | 나쁨 (산재) |
| 컴파일 시간 | 헤더 무거움 | 헤더 가벼움 |
| ABI 안정성 | 약함 | 강함 |
| 인라인 가능성 | 가능 | 불가 (분리 컴파일) |

## 결정 — 언제 Pimpl?

**Pimpl 사용 검토**:
- 라이브러리 / API — ABI 안정성 필요
- 헤더가 무거움 — 컴파일 시간 단축
- 대형 프로젝트 — TU 의존 절단
- 멤버 자주 변경 — 재컴파일 부담

**Pimpl 피하기**:
- 성능 핵심 hot path — 매 사이클 중요
- 짧은 라이프타임 객체 — 힙 할당 부담
- 작은 객체 — sizeof보다 ptr이 더 큼
- 인라인 필수 — getter/setter

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

**효과**:
- 헤더 의존 절단 — module 시스템이 해결
- Pimpl 동기의 상당 부분 제거
- 그러나 — ABI 안정성은 여전히 Pimpl이 더 강

## 실무 가이드 — 결정 트리

```
Pimpl 사용?
├── 라이브러리 API + 외부 노출 → 예 (ABI)
├── 컴파일 시간이 문제 → 예 (TU 절단)
├── hot path 클래스 → 아니오 (간접 비용)
├── 짧은 lifecycle → 아니오 (힙 비용)
└── 일반 비즈니스 로직 → 측정 후 결정
```

## 실무 가이드 — 체크리스트

- [ ] Pimpl 도입 전 — 측정으로 정당화?
- [ ] 컴파일 시간 단축 효과 확인?
- [ ] hot path 측정 — 추가 간접 비용 수용 가능?
- [ ] FastPimpl 고려 — SBO로 힙 제거?
- [ ] 객체 풀 고려 — 빈번한 생성 시?
- [ ] virtual 결합 시 — 이중 간접 측정?

## 핵심 정리

1. **포인터 간접** — 메서드마다 1 deref
2. **힙 할당** — 생성 시 비용
3. **캐시 미스** — 멤버 분산 → AOS 손해
4. **컴파일 시간 단축** — 가장 큰 실질적 이득
5. **ABI 안정성** — 라이브러리에 큰 가치
6. **SBO** — Pimpl의 힙 비용 회피
7. **측정 우선** — premature optimization 피하기

## 관련 항목

- [가이드라인 28: Bridge 패턴](/blog/programming/cpp-software-design/guideline28-build-bridges-to-remove-physical-dependencies) — 동기와 구조
- [EMC++ 항목 22: Pimpl 특수 멤버 함수](/blog/programming/effective-modern-cpp/item22-when-using-the-pimpl-idiom-define-special-member-functions-in-the-implementation-file) — 구현 세부
- [Beautiful C++ 항목 23: 템플릿 추상화](/blog/programming/beautiful-cpp/item23-use-templates-for-abstraction) — 컴파일 타임 대안
- [가이드라인 22: 값 의미론](/blog/programming/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — 일반 객체의 이점
