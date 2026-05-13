---
title: "가이드라인 36: 런타임과 컴파일 타임 추상화의 트레이드오프를 이해하라"
date: 2026-05-15T07:00:00
description: "런타임 다형성(virtual)과 컴파일 타임 다형성(템플릿/concept)은 비용과 이득이 다르다. 어느 쪽도 절대적으로 우월하지 않으며 선택 기준을 명확히 알아야 한다."
tags: [C++, Software Design, Polymorphism, Trade-off]
series: "C++ Software Design"
seriesOrder: 36
draft: true
---

## 왜 이 가이드라인이 중요한가?

C++은 **두 종류의 다형성**을 제공한다.

1. **런타임 다형성** — virtual, base class
2. **컴파일 타임 다형성** — template, concept, CRTP

각각 비용과 이득이 다르다. 어느 한쪽이 항상 우수하지는 않다. 선택 기준을 명확히 아는 게 중요하다.

```cpp
// 런타임
class Shape { virtual void draw() = 0; };

void render(const Shape& s) { s.draw(); }

// 컴파일 타임
template<typename T>
void render(const T& s) { s.draw(); }
```

겉으로 비슷해 보여도 메커니즘과 결과가 다르다.

## 컴파일 타임 다형성

장점은 다음과 같다.

- **비용이 0**에 가깝다 (인라이닝이 가능하고 virtual 비용이 없다)
- 잘못된 사용이 컴파일 에러로 차단된다
- 컴파일러가 모든 정보를 가지므로 최적화 여지가 크다
- duck typing이라 인터페이스 강제가 약하다

단점도 분명하다.

- 타입 집합이 컴파일 타임에 고정된다
- 구현이 헤더에 노출된다
- 인스턴스마다 코드가 생성되어 컴파일 시간이 늘어난다
- 전통적인 에러 메시지가 끔찍하다
- `vector<Shape>` 같은 동질 컨테이너를 만들기 어렵다

```cpp
template<typename T>
void render(const T& s) { s.draw(); }

render(Circle{});        // 컴파일 시 Circle::draw 호출을 인라이닝한다
render(Square{});        // 컴파일 시 Square::draw 호출을 인라이닝한다
```

## 런타임 다형성

장점은 다음과 같다.

- **동질 컨테이너**가 자연스럽다 — `vector<unique_ptr<Shape>>`
- 런타임에 새 derived를 추가할 수 있다 (플러그인, DLL)
- 헤더에는 인터페이스만 드러나므로 깔끔하다
- 컴파일 시간이 빠르다
- 에러 메시지가 명확하다 (인터페이스 미준수가 즉시 드러난다)

단점은 다음과 같다.

- **virtual 비용** — vtable 조회가 있고 인라이닝이 어렵다
- 보통 `unique_ptr`이 필요해 힙 할당이 따른다
- 값 의미론을 만들려면 `clone()` 같은 장치가 필요하다
- 침습적이라 기존 타입을 수정해야 한다

```cpp
class Shape { 
public: 
    virtual void draw() const = 0; 
    virtual ~Shape() = default; 
};

void render(const Shape& s) { s.draw(); }
// 호출마다 virtual dispatch
```

## 비교 표 — 종합

| 측면 | 런타임 (virtual) | 컴파일 타임 (template) |
|---|---|---|
| dispatch 비용 | 1~3 ns | 0 (인라이닝) |
| 메모리 | 힙 (보통) | 스택 가능 |
| 타입 집합 | 열림 (런타임) | 닫힘 (컴파일) |
| 동질 컨테이너 | ✅ | ❌ (variant/TE 필요) |
| 컴파일 시간 | 빠르다 | 느리다 |
| 에러 메시지 | 명확하다 | concept 이전에는 끔찍하다 |
| 헤더 노출 | 인터페이스만 | 구현 전체 |
| 플러그인 | 가능 (dlopen) | 불가 |
| 값 의미론 | clone() 필요 | 자연스럽다 |

## 비용 분석 — virtual

```cpp
class Shape {
public:
    virtual void draw() const = 0;        // vtable에 들어간다
};
```

- 객체마다 vtable 포인터가 추가된다 (보통 8 bytes)
- 호출 시 vtable을 로드하고 함수 포인터를 dereference한다
- 컴파일러가 정확한 타입을 추적하지 못하면 인라이닝이 불가능하다
- 현대 CPU의 branch predictor가 자주 본 타입을 캐시해서 어느 정도 보완해 준다

일반적인 측정값은 다음과 같다.

- non-virtual call — 약 0.5 ns
- virtual call — 약 2~5 ns
- 차이는 hot path가 아니라면 무시할 만하다

## 비용 분석 — template

```cpp
template<typename T>
void draw_all(const std::vector<T>& items) {
    for (const auto& item : items) item.draw();
}
```

- T마다 별도 함수가 컴파일된다
- 컴파일러가 모든 정보를 갖고 인라이닝할 수 있다
- 다만 바이너리 크기가 커진다 (template bloat)
- 컴파일 시간이 크게 늘어난다

bloat 완화책은 공통 부분을 추출하는 방식이다.

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

복잡한 기법이고 일반적이지는 않다. 측정 후 결정한다.

## 혼합 — variant와 Type Erasure

두 세계의 절충안이다.

```cpp
// std::variant — 닫힌 집합 + 값 의미론 + 컴파일 타임 dispatch
std::variant<Circle, Square, Triangle> shape = Circle{};
std::visit([](auto& s) { s.draw(); }, shape);
// switch에 가까운 dispatch — 인라이닝 가능

// Type Erasure — 열린 집합 + 값 의미론 + 런타임 dispatch
Shape s = Circle{};
s.draw();    // virtual
```

| 기법 | 타입 집합 | dispatch | 값 의미론 |
|---|---|---|---|
| virtual | 열림 | 런타임 | 어렵다 |
| template | 닫힘 (코드별) | 컴파일 | 자연 |
| variant | 닫힘 (선언) | 컴파일 (visit) | 자연 |
| Type erasure | 열림 | 런타임 (virtual) | 자연 |

## 결정 — 인터페이스 안정성

```
인터페이스가 안정 + 자주 호출 → 템플릿 (성능)
인터페이스가 자주 변경     → virtual (재컴파일 부담 ↓)
플러그인 / 동적 로딩 필요    → virtual (필수)
동질 컨테이너 필요          → virtual 또는 variant
```

## 결정 — 컴파일 시간

```
대형 프로젝트 + 자주 변경   → virtual (헤더 안정)
작은 프로젝트 + 성능 핵심  → template
헤더에 노출 거부            → virtual / Pimpl
```

## 표준 라이브러리는 두 방식 모두 사용한다

```cpp
// 컴파일 타임
template<typename Iter, typename Pred>
Iter find_if(Iter begin, Iter end, Pred p);    // 인라이닝 가능

// 런타임
class std::ostream { ... };
void log(std::ostream& os);    // virtual dispatch
```

알고리즘은 template으로 성능을 추구하고, I/O는 virtual로 다형 스트림을 표현한다.

## 비교 — 함수 디스패치

```cpp
// 정적 함수 호출
foo(5);                                          // direct call

// 함수 포인터
void (*fn)(int) = &foo;
fn(5);                                            // 포인터 통한 indirect call

// virtual 메서드
shape->draw();                                    // vtable → 함수 포인터

// std::function
std::function<void()> f = lambda;
f();                                              // SBO + 함수 포인터 또는 virtual

// 템플릿 + lambda
template<typename F> void run(F f) { f(); }
run([]{ ... });                                  // 인라이닝 (보통)
```

일반적인 비용 경향은 다음과 같다.

정적 호출 ≤ 템플릿 ≤ 함수 포인터 ≈ virtual ≤ std::function

## 함정 — 추정으로 결정하기

```cpp
// "Virtual이 느릴 거야, 다 템플릿으로"
// → 컴파일 시간 폭발, 바이너리 크기 증가
//   측정된 성능 차이는 없음 (hot path가 아니었다)

// "템플릿이 복잡해, 다 virtual로"
// → 핫 루프가 30% 느려진다
//   측정 차이가 크다
```

**측정 우선** 원칙이 가장 중요하다. premature optimization도, pessimization도 모두 피해야 한다.

## 함정 — 헤더에 템플릿 노출

```cpp
// shape.h
template<typename T>
class ShapeRenderer {
public:
    void render(const T& s) { s.draw(); }    // 정의가 헤더에 있다
    // ... 200 lines
};
```

이 헤더를 include할 때마다 전체 코드가 컴파일된다. 컴파일 시간이 누적된다.

완화책은 다음과 같다.

- 자주 쓰는 T만 명시적으로 인스턴스화한다
- 또는 런타임 다형성으로 전환한다

## 모던 변형 — C++20 Concepts

컴파일 타임 다형성의 단점이던 에러 메시지가 한층 개선된다.

```cpp
template<typename T>
concept Drawable = requires(const T& t) { t.draw(); };

template<Drawable T>
void render(const T& s) { s.draw(); }

render(Circle{});      // OK
render(42);            // 에러: int이 Drawable을 만족하지 않는다 — 명확하다
```

C++17 이전에는 "no matching function call" 같은 끔찍한 에러가 흔했다. concept으로 인터페이스를 명시적으로 표현할 수 있다.

## 흔한 패턴 — 컴파일 타임과 런타임의 결합

```cpp
// 인터페이스는 런타임 (다형)
class Renderer {
public:
    virtual ~Renderer() = default;
    virtual void render(const std::vector<Shape*>& shapes) = 0;
};

// 구현은 컴파일 타임 (성능)
template<typename Backend>
class RendererImpl : public Renderer {
    Backend backend_;
public:
    void render(const std::vector<Shape*>& shapes) override {
        for (auto* s : shapes) backend_.draw(*s);    // 컴파일 타임 인라이닝
    }
};
```

API는 virtual로 안정성을 잡고 구현은 template으로 속도를 잡는다. 실무에서 자주 보이는 절충이다.

## 결정 표 — 가이드라인

```
| 시나리오 | 추천 |
|---|---|
| 인터페이스가 핫 패스 | template + concept |
| 다양한 객체를 한 컨테이너에 | variant (닫힘) 또는 Type Erasure |
| 플러그인 시스템 | virtual + DLL |
| 인터페이스가 자주 변경 | virtual (재컴파일 부담 ↓) |
| 헤더에 구현 노출 거부 | virtual + Pimpl |
| 알고리즘 라이브러리 | template (성능) |
| 비-핫 비즈니스 로직 | 무엇이든 (편한 쪽) |
```

## 실무 가이드 — 결정 트리

```
다형성이 필요한가?
├── 닫힌 집합 → std::variant (best of both)
├── 핫 패스 + 인라이닝 결정 → template + concept
├── 동질 컨테이너 + 값 의미론 → Type Erasure
├── 플러그인 / 동적 로딩 → virtual
└── 비-핫 + 단순 → virtual (코드가 깔끔하다)
```

## 실무 가이드 — 체크리스트

- [ ] 측정으로 다형성 비용을 확인했는가?
- [ ] 헤더 노출, 컴파일 시간, 성능 중 우선순위를 정했는가?
- [ ] 타입 집합이 닫혀 있는가 열려 있는가?
- [ ] 동질 컨테이너가 필요한가?
- [ ] concept으로 컴파일 타임 에러를 명확히 했는가?
- [ ] 인터페이스는 virtual, 핫 패스는 template처럼 혼합을 검토했는가?

## 핵심 정리

1. **두 가지 다형성** — 런타임(virtual)과 컴파일 타임(template)
2. **virtual**은 동질 컨테이너, 플러그인, 인터페이스 안정성에 강하다
3. **template**은 0 비용, 컴파일러 최적화, 닫힌 집합에 적합하다
4. **variant**는 닫힌 + 값 + 컴파일 dispatch의 결합이다
5. **Type Erasure**는 열린 + 값 + 런타임 dispatch의 결합이다
6. **측정 우선** — 추정이 아니라 데이터로 결정한다
7. **혼합**으로 인터페이스는 virtual, 구현은 template으로 가져갈 수 있다

## 관련 항목

- [가이드라인 7: 기본 클래스와 concept](/blog/programming/cpp/cpp-software-design/guideline07-understand-the-similarities-between-base-classes-and-concepts) — 두 추상 도구
- [가이드라인 17: std::variant](/blog/programming/cpp/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 닫힌 집합
- [가이드라인 32: Type Erasure](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 열린 집합 + 값
- [가이드라인 33: TE 최적화](/blog/programming/cpp/cpp-software-design/guideline33-be-aware-of-the-optimization-potential-of-type-erasure) — 성능 측면
