---
title: "가이드라인 33: Type Erasure의 최적화 잠재력을 인식하라"
date: 2026-05-15T04:00:00
description: "Type Erasure는 SBO, 매뉴얼 vtable, 인라이닝으로 비용을 크게 낮출 수 있다. std::function의 실제 구현을 통해 그 패턴을 살펴본다."
tags: [C++, Software Design, Type Erasure, Performance]
series: "C++ Software Design"
seriesOrder: 33
draft: true
---

## 왜 이 가이드라인이 중요한가?

가이드라인 32의 기본 Type Erasure에는 세 가지 비용이 따른다.

- Model<T>를 만들 때마다 힙 할당이 일어난다
- 모든 호출이 virtual dispatch를 거친다
- pimpl_을 통해 한 번 더 간접 참조한다

`std::function` 같은 표준 라이브러리 컴포넌트는 이 비용을 **공격적으로 최적화**한다. 직접 Type Erasure를 만든다면 이 기법들을 알아 둘 필요가 있다.

대표적인 **3대 최적화**는 다음과 같다.

1. **SBO (Small Buffer Optimization)** — 힙 할당을 피한다
2. **매뉴얼 vtable** — virtual 비용을 줄인다
3. **작은 함수 인라이닝** — 가능한 곳에서 인라이닝을 끌어낸다

표준이 어떻게 처리하는지 알면 자신의 구현에서 어디까지 최적화할지 판단하기 쉬워진다.

## 최적화 1 — SBO (Small Buffer Optimization)

기본 Type Erasure는 매번 힙을 잡는다.

```cpp
class Shape {
    std::unique_ptr<Concept> pimpl_;
public:
    template<typename T>
    Shape(T t) : pimpl_(std::make_unique<Model<T>>(std::move(t))) {}    // 힙
};
```

SBO를 적용하면 다음과 같이 바뀐다.

```cpp
class Shape {
    static constexpr size_t buffer_size_ = 32;
    
    alignas(std::max_align_t) std::byte buffer_[buffer_size_];
    Concept* pimpl_;        // buffer를 가리키거나 힙을 가리킨다
    bool small_;
    
public:
    template<typename T>
    Shape(T t) {
        if constexpr (sizeof(Model<T>) <= buffer_size_) {
            pimpl_ = new (buffer_) Model<T>{std::move(t)};        // SBO — 스택 buffer
            small_ = true;
        } else {
            pimpl_ = new Model<T>{std::move(t)};                    // 힙
            small_ = false;
        }
    }
    
    ~Shape() {
        if (small_) pimpl_->~Concept();
        else delete pimpl_;
    }
};
```

효과는 다음과 같다.

- 작은 T(예: Circle 8 bytes)는 힙 할당이 0이다
- 큰 T는 일반 힙 할당으로 처리한다
- 트레이드오프는 `sizeof(Shape)`가 buffer만큼 커진다는 점이다

`std::function`은 보통 24~32 bytes 버퍼를 둬서 작은 lambda를 거기에 넣는다.

## SBO의 trade-off

| 항목 | 작은 buffer | 큰 buffer |
|---|---|---|
| `sizeof(Wrapper)` | 작다 | 크다 |
| 힙 할당 빈도 | 자주 | 드물게 |
| 스택 사용 | 적다 | 많다 |
| 캐시 친화 | 좋다 (작을 때) | 좋다 (스택 hit 시) |

선택은 보통 다음 기준을 따른다.

- 일반 — 24~32 bytes
- 작은 객체 위주 — 16 bytes
- 큰 함수 객체 위주 — 64 bytes

## 최적화 2 — 매뉴얼 vtable

기본 방식은 컴파일러의 virtual을 그대로 쓴다.

```cpp
struct Concept {
    virtual ~Concept() = default;
    virtual void draw() const = 0;
    virtual std::unique_ptr<Concept> clone() const = 0;
};
```

**매뉴얼 vtable**은 함수 포인터를 직접 관리한다.

```cpp
class Shape {
    struct VTable {
        void (*draw)(const void*);
        void* (*clone)(const void*);
        void (*destroy)(void*);
    };
    
    template<typename T>
    static const VTable vtable_for_;
    
    const VTable* vtable_;
    void* data_;
    
public:
    template<typename T>
    Shape(T t) 
        : vtable_(&vtable_for_<T>)
        , data_(new T(std::move(t))) {}
    
    void draw() const { vtable_->draw(data_); }
};

template<typename T>
const Shape::VTable Shape::vtable_for_ = {
    [](const void* p) { static_cast<const T*>(p)->draw(); },
    [](const void* p) { return new T(*static_cast<const T*>(p)); },
    [](void* p) { delete static_cast<T*>(p); }
};
```

효과는 다음과 같다.

- 컴파일러 virtual보다 메모리 레이아웃을 직접 통제할 수 있다
- vtable 포인터를 한 개로 유지할 수 있다 (다중 상속 없음)
- 컴파일러가 함수 포인터를 추적할 수 있으면 인라이닝 가능성도 열린다

`std::function`의 일부 구현이 이 매뉴얼 vtable 방식을 따른다.

## 매뉴얼 vtable 패턴 — 함수 포인터를 객체에 직접

```cpp
class Shape {
    using DrawFn = void(*)(const void*);
    using CloneFn = void*(*)(const void*);
    using DestroyFn = void(*)(void*);
    
    DrawFn draw_fn_;
    CloneFn clone_fn_;
    DestroyFn destroy_fn_;
    void* data_;
    
public:
    template<typename T>
    Shape(T t)
        : draw_fn_([](const void* p) { 
              static_cast<const T*>(p)->draw(); 
          })
        , clone_fn_([](const void* p) { 
              return static_cast<void*>(new T(*static_cast<const T*>(p))); 
          })
        , destroy_fn_([](void* p) { 
              delete static_cast<T*>(p); 
          })
        , data_(new T(std::move(t))) {}
    
    void draw() const { draw_fn_(data_); }
};
```

함수 포인터를 객체 안에 직접 두면 간접 참조가 한 단계 줄어든다.

## SBO + 매뉴얼 vtable의 결합

`std::function`의 실제 구현이 따르는 패턴이다.

```cpp
template<typename Sig>
class Function;

template<typename R, typename... Args>
class Function<R(Args...)> {
    static constexpr size_t buffer_size_ = 32;
    
    struct VTable {
        R (*invoke)(void*, Args...);
        void (*copy)(void* dst, const void* src);
        void (*move)(void* dst, void* src);
        void (*destroy)(void*);
    };
    
    alignas(std::max_align_t) std::byte buffer_[buffer_size_];
    const VTable* vtable_ = nullptr;
    
    template<typename F>
    static const VTable vtable_for_;
    
public:
    template<typename F>
    Function(F f) {
        if constexpr (sizeof(F) <= buffer_size_) {
            new (buffer_) F(std::move(f));
        } else {
            *reinterpret_cast<F**>(buffer_) = new F(std::move(f));
        }
        vtable_ = &vtable_for_<F>;
    }
    
    R operator()(Args... args) {
        return vtable_->invoke(buffer_, std::forward<Args>(args)...);
    }
};
```

복잡해 보이지만 작은 객체에 대해서는 힙 할당 없이 단순 함수 포인터 호출만 남는다.

## 최적화 3 — 인라이닝 가능성

```cpp
std::function<int(int)> f = [](int x) { return x + 1; };
int y = f(5);
```

컴파일러가 `f`의 vtable과 람다를 추적할 수 있다면 `invoke` 함수 호출이 인라이닝될 여지가 생긴다. 다만 vtable 포인터가 런타임에 결정되는 일반적인 경우에는 인라이닝이 제한된다.

비교해 보면 다음과 같다.

- `auto f = lambda;` — 완전히 인라이닝된다 (zero cost)
- `std::function<int(int)> f = lambda;` — vtable 호출 (인라이닝 가능하지만 제한적)
- `auto f = std::variant<L1, L2>{...};` — switch 후 인라이닝 가능

값 의미론 wrapper는 lambda보다 호출 비용이 크지만 virtual class와는 비슷하거나 더 작다.

## 벤치마크 — 실제 비교

```cpp
// 벤치 1 — 직접 함수
auto fn = [](int x) { return x + 1; };
for (int i = 0; i < N; ++i) fn(i);
// ~0.5 ns / call

// 벤치 2 — std::function
std::function<int(int)> fn = [](int x) { return x + 1; };
for (int i = 0; i < N; ++i) fn(i);
// ~2-3 ns / call (SBO 적용 시)

// 벤치 3 — 가상 함수
struct Base { virtual int call(int) = 0; };
std::unique_ptr<Base> p = ...;
for (int i = 0; i < N; ++i) p->call(i);
// ~3-4 ns / call

// 벤치 4 — std::variant
std::variant<L1, L2> v = ...;
for (int i = 0; i < N; ++i) std::visit(fn, v);
// ~1 ns / call (compile-time dispatch)
```

수치는 환경에 따라 달라지지만 일반적인 경향은 다음과 같다.

직접 호출 > variant > Type Erasure ≈ virtual

## SBO의 한계 — 캡처가 큰 lambda

```cpp
std::vector<int> data(1000);
std::function<int()> f = [data]() { return data.size(); };
// sizeof(lambda) = sizeof(vector) ≈ 24 bytes — buffer에 들어가는 경우가 많다

std::function<int()> g = [data, str=std::string{}]() { return ...; };
// sizeof(lambda) ≈ 32 bytes 이상 — buffer 초과 → 힙 할당
```

캡처가 크면 SBO 효과가 사라진다. 캡처를 최소화하는 편이 좋다.

## 최적화 — SBO 크기 조정

```cpp
template<typename Sig, size_t BufferSize = 32>
class Function;

Function<int(int), 64> f;        // 64 bytes — 큰 lambda 수용
Function<int(int), 16> g;        // 16 bytes — 작은 람다만
```

C++23의 `std::move_only_function`이 크기 측면에서 더 유연하다. fast_function 같은 서드파티 라이브러리도 함께 검토할 만하다.

## 함정 — 함수 포인터 vs 람다 vs std::function

```cpp
void register_callback(std::function<void()>);
void register_callback(void(*)());
template<typename F> void register_callback(F&&);

register_callback([]{ /* 캡처 없음 */ });
// 컴파일러는 어느 오버로드를 고를까?
//   void(*)()      — 캡처 없는 람다는 함수 포인터로 변환 가능
//   template       — 가장 정확
//   std::function  — 변환이 필요하다
```

선택지는 상황에 따라 다음과 같이 갈린다.

- 함수 포인터 — 캡처가 없을 때만 가능하고 빠르다
- 템플릿 — 인라이닝 가능하지만 컴파일 시간이 늘어난다
- `std::function` — 다형성이 필요할 때 쓴다

## 모던 변형 — std::move_only_function (C++23)

```cpp
std::move_only_function<void()> f = [p = std::make_unique<int>(42)]() {
    std::cout << *p;
};
// std::function은 copyable을 요구해 unique_ptr 캡처를 막는다
// move_only_function은 이동만 가능하므로 더 유연하다
```

제안된 `std::function_ref`는 소유하지 않으며, 가장 가벼운 변형이다.

## 측정 — 언제 최적화가 가치 있나

```cpp
// 1초에 1,000번 호출 — Type Erasure 비용은 무시할 만하다
// 1초에 10,000,000번 — 측정 후 결정한다
// 1초에 1,000,000,000번 — Type Erasure 회피를 고려한다
```

핫 패스에서는 직접 함수 호출이나 variant를 우선시한다. Type Erasure는 인터페이스 유연성을 사는 데 들이는 가격이다.

## 비교 — 다양한 TE 구현

| 구현 | 힙 할당 | dispatch | 메모리 |
|---|---|---|---|
| 단순 (unique_ptr<Concept>) | 항상 | virtual | 작다 |
| SBO + virtual | 작은 객체는 X | virtual | 크다 |
| 매뉴얼 vtable | 작은 객체는 X | 함수 포인터 | 크다 |
| Dyno (Louis Dionne) | 설정 가능 | 매뉴얼 vtable | 설정 가능 |

## 실무 가이드 — 결정 트리

```
Type Erasure를 쓰는데 성능 문제가 있는가?
├── 측정해 보았는가? 진짜 핫 패스인가, 아니면 직관인가?
├── 작은 함수 객체 위주라면 → SBO 적용
├── 다양한 큰 객체 → 힙 + 매뉴얼 vtable
├── 한 인터페이스 + 닫힌 집합 → variant로 전환 검토
└── 비-핫 패스 → 단순 구현 유지 (premature optimization 회피)
```

## 실무 가이드 — 체크리스트

- [ ] SBO 크기를 일반적인 lambda 크기에 맞췄는가?
- [ ] 매뉴얼 vtable의 보일러플레이트 부담 대비 성능 이득을 측정했는가?
- [ ] 캡처를 최소화해 SBO 효과를 유지하고 있는가?
- [ ] 핫 패스라면 `auto`/템플릿/variant를 먼저 검토했는가?
- [ ] 비-핫 패스라면 단순 `std::function`으로 충분하지 않은가?
- [ ] 추정이 아닌 측정 데이터로 결정했는가?

## 핵심 정리

1. **SBO**가 작은 객체를 스택 버퍼에 두어 힙 할당을 피한다
2. **매뉴얼 vtable**은 함수 포인터를 직접 두어 인라이닝 가능성을 높인다
3. **`std::function`**은 보통 SBO와 매뉴얼 vtable을 결합한다
4. 트레이드오프는 `sizeof(Wrapper)` 증가와 할당 회피 사이의 균형이다
5. **인라이닝**은 컴파일러가 vtable을 추적할 수 있을 때 가능하다
6. **측정 우선** — 추정 대신 데이터로 결정한다

## 관련 항목

- [가이드라인 32: Type Erasure](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 기본 구조
- [가이드라인 34: TE Wrapper 설정 비용](/blog/programming/cpp/cpp-software-design/guideline34-be-aware-of-the-setup-costs-of-owning-type-erasure-wrappers) — 생성 비용
- [가이드라인 23: 값 기반 Strategy](/blog/programming/cpp/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — std::function 활용
- [가이드라인 17: std::variant](/blog/programming/cpp/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 닫힌 집합 대안
