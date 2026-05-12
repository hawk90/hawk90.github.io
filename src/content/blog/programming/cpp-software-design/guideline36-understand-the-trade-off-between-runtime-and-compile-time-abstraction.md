---
title: "가이드라인 36: 런타임과 컴파일 타임 추상화의 트레이드오프를 이해하라"
date: 2026-05-15T07:00:00
description: "런타임 다형성(virtual)과 컴파일 타임 다형성(템플릿/concept) — 각 비용과 이득의 명확한 비교."
tags: [C++, Software Design, Polymorphism, Trade-off]
series: "C++ Software Design"
seriesOrder: 36
---

## 왜 이 가이드라인이 중요한가?

C++ — **2개의 다형성**:

1. **런타임 다형성** — virtual, base class
2. **컴파일 타임 다형성** — template, concept, CRTP

각각 — 다른 비용 / 이득. 한쪽이 항상 우수하지 않음. **선택 기준**을 명확히 알아야.

```cpp
// 런타임
class Shape { virtual void draw() = 0; };

void render(const Shape& s) { s.draw(); }

// 컴파일 타임
template<typename T>
void render(const T& s) { s.draw(); }
```

같은 코드 — 다른 메커니즘. 결과도 다름.

## 컴파일 타임 다형성

**장점**:
- **0 비용** — 인라인 가능, virtual 비용 없음
- 컴파일 에러로 — 잘못된 사용 차단
- 최적화 — 컴파일러가 모든 정보 가짐
- duck typing — 인터페이스 강제 약함

**단점**:
- **타입 집합 고정** — 컴파일 타임에 결정
- 헤더 노출 — 구현이 헤더에
- 컴파일 시간 ↑ — 인스턴스마다 코드 생성
- 에러 메시지 (전통적) — 끔찍
- 컨테이너 동질성 — 어려움 (`vector<Shape>` 못 만듦)

```cpp
template<typename T>
void render(const T& s) { s.draw(); }

render(Circle{});        // 컴파일 시 Circle::draw 호출 인라인
render(Square{});        // 컴파일 시 Square::draw 호출 인라인
```

## 런타임 다형성

**장점**:
- **동질 컨테이너** — `vector<unique_ptr<Shape>>`
- 새 derived — 런타임 추가 가능 (플러그인, DLL)
- 헤더 깔끔 — 인터페이스만 노출
- 컴파일 시간 — 빠름
- 에러 메시지 — 명확 (인터페이스 미준수)

**단점**:
- **virtual 비용** — vtable 조회, 인라인 불가 (보통)
- 힙 할당 — 보통 unique_ptr 필요
- 값 의미론 — 복잡 (clone() 등)
- 침습적 — 기존 타입 수정 강요

```cpp
class Shape { 
public: 
    virtual void draw() const = 0; 
    virtual ~Shape() = default; 
};

void render(const Shape& s) { s.draw(); }
// 매번 virtual dispatch
```

## 비교 표 — 종합

| 측면 | 런타임 (virtual) | 컴파일 타임 (template) |
|---|---|---|
| dispatch 비용 | 1-3 ns | 0 (인라인) |
| 메모리 | 힙 (보통) | 스택 가능 |
| 타입 집합 | 열림 (런타임) | 닫힘 (컴파일) |
| 동질 컨테이너 | ✅ | ❌ (variant/TE 필요) |
| 컴파일 시간 | 빠름 | 느림 |
| 에러 메시지 | 명확 | (concept 전엔 끔찍) |
| 헤더 노출 | 인터페이스만 | 구현 전체 |
| 플러그인 | 가능 (dlopen) | 불가 |
| 값 의미론 | clone() 필요 | 자연스러움 |

## 비용 분석 — virtual

```cpp
class Shape {
public:
    virtual void draw() const = 0;        // vtable에
};
```

- 객체에 vtable 포인터 (보통 8 bytes 추가)
- 호출 시 — vtable 로드 + 함수 포인터 dereference
- 인라인 — 컴파일러가 정확한 타입 추적 못 하면 불가
- 현대 CPU — branch predictor가 자주 본 타입 캐시 (속도 향상)

**측정 일반**:
- non-virtual call — ~0.5 ns
- virtual call — ~2-5 ns
- 차이 — hot path 아니면 무시 가능

## 비용 분석 — template

```cpp
template<typename T>
void draw_all(const std::vector<T>& items) {
    for (const auto& item : items) item.draw();
}
```

- T마다 — 별도 함수 컴파일
- 인라인 — 컴파일러가 모든 정보 가짐
- 그러나 — 바이너리 크기 증가 (template bloat)
- 컴파일 시간 — 크게 증가

**Bloat 완화** — 공통 부분 추출:

```cpp
namespace detail {
    void draw_impl(const void* p, void (*draw_fn)(const void*));    // 공통
}

template<typename T>
void draw_all(const std::vector<T>& items) {
    for (const auto& item : items) {
        detail::draw_impl(&item, +[](const void* p) {
            static_cast<const T*>(p)->draw();
        });
    }
}
```

복잡 — 일반적이지 않음. 측정 후 결정.

## 혼합 — variant / Type Erasure

**두 세계의 절충**:

```cpp
// std::variant — 닫힌 집합 + 값 의미론 + 컴파일 타임 dispatch
std::variant<Circle, Square, Triangle> shape = Circle{};
std::visit([](auto& s) { s.draw(); }, shape);
// switch에 가까운 dispatch — 인라인 가능

// Type Erasure — 열린 집합 + 값 의미론 + 런타임 dispatch
Shape s = Circle{};
s.draw();    // virtual
```

| 기법 | 타입 집합 | dispatch | 값 의미론 |
|---|---|---|---|
| virtual | 열림 | 런타임 | 어려움 |
| template | 닫힘 (코드별) | 컴파일 | 자연 |
| variant | 닫힘 (선언) | 컴파일 (visit) | 자연 |
| Type erasure | 열림 | 런타임 (virtual) | 자연 |

## 결정 — 인터페이스 안정성

```
인터페이스가 안정 + 자주 호출 → 템플릿 (성능)
인터페이스가 자주 변경 → virtual (재컴파일 부담 ↓)
플러그인 / 동적 로딩 필요 → virtual (필수)
컨테이너에 동질로 모음 → virtual 또는 variant
```

## 결정 — 컴파일 시간

```
대형 프로젝트 + 자주 변경 → virtual (헤더 안정)
작은 프로젝트 + 성능 핵심 → template
헤더에 노출 거부 → virtual / Pimpl
```

## 표준 라이브러리 — 두 방식 모두

```cpp
// 컴파일 타임
template<typename Iter, typename Pred>
Iter find_if(Iter begin, Iter end, Pred p);    // 인라인 가능

// 런타임
class std::ostream { ... };
void log(std::ostream& os);    // virtual dispatch
```

표준 — 알고리즘은 template (성능), I/O는 virtual (다형 스트림).

## 비교 — 함수 디스패치

```cpp
// 정적 함수 호출
foo(5);                                          // direct call

// 함수 포인터
void (*fn)(int) = &foo;
fn(5);                                            // indirect call (포인터)

// virtual 메서드
shape->draw();                                    // vtable → 함수 포인터

// std::function
std::function<void()> f = lambda;
f();                                              // SBO + 함수 포인터 또는 virtual

// 템플릿 + lambda
template<typename F> void run(F f) { f(); }
run([]{ ... });                                  // 인라인 (보통)
```

비용 — 일반 경향:
- 정적 호출 ≤ 템플릿 ≤ 함수 포인터 ≈ virtual ≤ std::function

## 함정 — 추정으로 결정

```cpp
// "Virtual 느릴 거야, 다 템플릿으로"
// → 컴파일 시간 폭발, 바이너리 크기 증가
//   measured difference: 없음 (hot path 아니라서)

// "템플릿 복잡해, 다 virtual로"
// → 핫 loop 30% 느려짐
//   measured difference: 큼
```

**측정 우선**. premature optimization or pessimization 둘 다 피하기.

## 함정 — 헤더에 템플릿 노출

```cpp
// shape.h
template<typename T>
class ShapeRenderer {
public:
    void render(const T& s) { s.draw(); }    // 정의 헤더에
    // ... 200 lines
};
```

매 #include — 전체 코드 컴파일. 컴파일 시간 누적.

**완화**:
- 명시적 인스턴스화 — 흔한 T만 미리 컴파일
- 또는 — 런타임 다형성 사용

## 모던 변형 — C++20 Concepts

컴파일 타임의 단점 (에러 메시지) 완화:

```cpp
template<typename T>
concept Drawable = requires(const T& t) { t.draw(); };

template<Drawable T>
void render(const T& s) { s.draw(); }

render(Circle{});      // OK
render(42);            // 에러: int does not satisfy Drawable — 명확
```

C++17 이전엔 — "no matching function call" 같은 끔찍한 에러. concept으로 — 인터페이스 명시.

## 흔한 패턴 — 컴파일 + 런타임 결합

```cpp
// 인터페이스 — 런타임 (다형)
class Renderer {
public:
    virtual ~Renderer() = default;
    virtual void render(const std::vector<Shape*>& shapes) = 0;
};

// 구현 — 컴파일 타임 (성능)
template<typename Backend>
class RendererImpl : public Renderer {
    Backend backend_;
public:
    void render(const std::vector<Shape*>& shapes) override {
        for (auto* s : shapes) backend_.draw(*s);    // 컴파일 타임 inlining
    }
};
```

API는 안정 (virtual) — 구현은 빠름 (template). 좋은 절충.

## 결정 표 — 가이드라인

```
| 시나리오 | 추천 |
|---|---|
| 인터페이스 핫 패스 | template + concept |
| 다양한 객체 컨테이너 | variant (닫힘) 또는 Type Erasure |
| 플러그인 시스템 | virtual + DLL |
| 인터페이스 자주 변경 | virtual (재컴파일 부담 ↓) |
| 헤더에 구현 노출 거부 | virtual + Pimpl |
| 알고리즘 라이브러리 | template (성능) |
| 비-핫 비즈니스 로직 | 무엇이든 (편한 것) |
```

## 실무 가이드 — 결정 트리

```
다형성 필요한가?
├── 닫힌 집합 → std::variant (best of both)
├── 핫 패스 + 인라인 결정 → template + concept
├── 동질 컨테이너 + 값 의미론 → Type Erasure
├── 플러그인 / 동적 로딩 → virtual
└── 비-핫 + 단순 → virtual (코드 깔끔)
```

## 실무 가이드 — 체크리스트

- [ ] 측정으로 다형성 비용 확인?
- [ ] 헤더 노출 vs 컴파일 시간 vs 성능 — 우선순위?
- [ ] 타입 집합 — 닫혀 있나, 열려 있나?
- [ ] 동질 컨테이너 필요?
- [ ] concept으로 컴파일 타임 에러 명확화?
- [ ] 인터페이스 = virtual, 핫 패스 = template — 혼합 검토?

## 핵심 정리

1. **두 다형성** — 런타임 (virtual), 컴파일 타임 (template)
2. **virtual** — 동질 컨테이너, 플러그인, 인터페이스 안정
3. **template** — 0 비용, 컴파일 최적화, 닫힌 집합
4. **variant** — 닫힌 + 값 + 컴파일 dispatch
5. **Type Erasure** — 열린 + 값 + 런타임 dispatch
6. **측정 우선** — 추정 아닌 데이터로 결정
7. **혼합** — 인터페이스는 virtual, 구현은 template

## 관련 항목

- [가이드라인 7: 기본 클래스와 concept](/blog/programming/cpp-software-design/guideline07-understand-the-similarities-between-base-classes-and-concepts) — 두 추상 도구
- [가이드라인 17: std::variant](/blog/programming/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 닫힌 집합
- [가이드라인 32: Type Erasure](/blog/programming/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 열린 집합 + 값
- [가이드라인 33: TE 최적화](/blog/programming/cpp-software-design/guideline33-be-aware-of-the-optimization-potential-of-type-erasure) — 성능 측면
