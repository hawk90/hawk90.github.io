---
title: "가이드라인 33: Type Erasure의 최적화 잠재력을 인식하라"
date: 2026-05-15T04:00:00
description: "Type Erasure 최적화 — SBO, 매뉴얼 vtable, 작은 함수 인라인. std::function 구현 분석."
tags: [C++, Software Design, Type Erasure, Performance]
series: "C++ Software Design"
seriesOrder: 33
---

## 왜 이 가이드라인이 중요한가?

기본 Type Erasure(가이드라인 32) — 비용:
- 힙 할당 — Model<T> 매번
- virtual dispatch — 모든 호출
- 포인터 간접 — pimpl_

`std::function` 등 표준 라이브러리 — 이 비용을 **공격적으로 최적화**. 직접 구현 시도 알아야 함.

**3대 최적화**:
1. **SBO (Small Buffer Optimization)** — 힙 할당 회피
2. **매뉴얼 vtable** — virtual 비용 절감
3. **작은 함수 인라인** — 가능한 곳에서

표준이 어떻게 하는지 알면 — 직접 구현 시 어디까지 최적화할지 판단 가능.

## 최적화 1 — SBO (Small Buffer Optimization)

기본 Type Erasure — 매번 힙 할당:

```cpp
class Shape {
    std::unique_ptr<Concept> pimpl_;
public:
    template<typename T>
    Shape(T t) : pimpl_(std::make_unique<Model<T>>(std::move(t))) {}    // 힙
};
```

**SBO 적용**:

```cpp
class Shape {
    static constexpr size_t buffer_size_ = 32;
    
    alignas(std::max_align_t) std::byte buffer_[buffer_size_];
    Concept* pimpl_;        // buffer 또는 힙 가리킴
    bool small_;
    
public:
    template<typename T>
    Shape(T t) {
        if constexpr (sizeof(Model<T>) <= buffer_size_) {
            pimpl_ = new (buffer_) Model<T>{std::move(t)};        // SBO — 스택 buffer에
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

**효과**:
- 작은 T (예: Circle 8 bytes) — 힙 할당 0
- 큰 T — 일반 힙 할당
- 트레이드오프 — `sizeof(Shape)` 증가 (buffer 만큼)

`std::function` — 보통 24-32 bytes 버퍼. 작은 lambda는 거기에.

## SBO의 trade-off

| 항목 | 작은 buffer | 큰 buffer |
|---|---|---|
| `sizeof(Wrapper)` | 작음 | 큼 |
| 힙 할당 빈도 | 자주 | 드물게 |
| 스택 사용 | 적음 | 많음 |
| 캐시 친화 | 좋음 (작을 때) | 좋음 (스택 hit 시) |

**선택**:
- 일반 — 24-32 bytes
- 작은 객체 위주 — 16 bytes
- 큰 함수 객체 — 64 bytes

## 최적화 2 — 매뉴얼 vtable

기본 — 컴파일러 virtual 사용:

```cpp
struct Concept {
    virtual ~Concept() = default;
    virtual void draw() const = 0;
    virtual std::unique_ptr<Concept> clone() const = 0;
};
```

**매뉴얼 vtable** — 함수 포인터 직접 관리:

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

**효과**:
- 컴파일러 virtual보다 — 메모리 레이아웃 통제
- vtable 포인터 1개만 (다중 상속 X)
- 인라이닝 가능성 — compiler가 함수 포인터 추적 시

`std::function` 일부 구현 — 매뉴얼 vtable.

## 매뉴얼 vtable 패턴 — 함수 포인터

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

함수 포인터를 객체 내에 직접 — 추가 간접 1단계 줄임.

## SBO + 매뉴얼 vtable 결합

`std::function`의 실제 구현 패턴:

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

복잡하지만 — 작은 객체는 무할당 + 단순 함수 포인터 호출.

## 최적화 3 — 인라인 가능성

```cpp
std::function<int(int)> f = [](int x) { return x + 1; };
int y = f(5);
```

컴파일러가 `f`의 vtable과 람다 추적 시 — `invoke` 함수 호출이 인라인 가능. 그러나 — vtable 포인터가 런타임에 결정되면 — 인라인 제한.

**비교**:
- `auto f = lambda;` — 완전 인라인 (zero cost)
- `std::function<int(int)> f = lambda;` — vtable 호출 (인라인 가능하지만 제한)
- `auto f = std::variant<L1, L2>{...};` — switch 후 인라인 가능

값 의미론 wrapper는 — 호출 비용이 lambda보다 크지만 — virtual class보다는 작거나 비슷.

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

수치는 환경 따라 다름. 일반 경향:
- 직접 호출 > variant > Type Erasure (TE) ≈ virtual

## SBO의 한계 — 캡처 큰 lambda

```cpp
std::vector<int> data(1000);
std::function<int()> f = [data]() { return data.size(); };
// sizeof(lambda) = sizeof(vector) = ~24 bytes — buffer에 들어감? 보통 OK

std::function<int()> g = [data, str=std::string{}]() { return ...; };
// sizeof(lambda) = ~32+ bytes — buffer 초과 → 힙 할당
```

큰 캡처 — SBO 효과 무력화. 캡처 최소화 권장.

## 최적화 — SBO 크기 조정

```cpp
template<typename Sig, size_t BufferSize = 32>
class Function;

Function<int(int), 64> f;        // 64 bytes — 큰 lambda 수용
Function<int(int), 16> g;        // 16 bytes — 작은 람다만
```

`std::move_only_function` (C++23) — 더 유연한 크기. fast_function 등 서드파티도 검토.

## 함정 — 함수 포인터 vs 람다 vs std::function

```cpp
void register_callback(std::function<void()>);
void register_callback(void(*)());
template<typename F> void register_callback(F&&);

register_callback([]{ /* nothing captured */ });
// 컴파일러는 어느 오버로드 고르나?
//   void(*)()    — 람다는 함수 포인터로 변환 가능 (캡처 없을 때)
//   template     — 가장 정확
//   std::function — 변환 필요
```

**선택지**:
- 함수 포인터 — 캡처 없는 경우만, 빠름
- 템플릿 — 인라인 가능, 컴파일 시간 증가
- std::function — 다형성 필요할 때

## 모던 변형 — std::move_only_function (C++23)

```cpp
std::move_only_function<void()> f = [p = std::make_unique<int>(42)]() {
    std::cout << *p;
};
// std::function — copyable 요구 → unique_ptr 캡처 안 됨
// move_only_function — 이동만 가능 → 더 유연
```

`std::function_ref` (제안) — 소유 안 함, 가장 가벼움.

## 측정 — 언제 최적화 가치 있나

```cpp
// 1초에 1,000번 호출 — TE 비용 무시
// 1초에 10,000,000번 — 측정 후 결정
// 1초에 1,000,000,000번 — TE 회피 고려
```

핫 패스에선 — 직접 함수 호출 또는 variant 우선. TE는 — 인터페이스 유연성을 사는 가격.

## 비교 — 다양한 TE 구현

| 구현 | 힙 할당 | dispatch | 메모리 |
|---|---|---|---|
| 단순 (unique_ptr<Concept>) | 항상 | virtual | 작음 |
| SBO + virtual | 작은 객체는 X | virtual | 큼 |
| 매뉴얼 vtable | 작은 객체는 X | 함수 포인터 | 큼 |
| Dyno (Louis Dionne) | 설정 가능 | 매뉴얼 vtable | 설정 가능 |

## 실무 가이드 — 결정 트리

```
Type Erasure 사용 중 + 성능 문제?
├── 측정 후 — 진짜 핫 패스인가? 아니면 직관?
├── 작은 함수 객체 위주 → SBO 적용
├── 다양한 큰 객체 → 힙 + 매뉴얼 vtable
├── 한 인터페이스 + 닫힌 집합 → variant로 전환 고려
└── 비-핫 패스 → 단순 구현 유지 (premature opt 회피)
```

## 실무 가이드 — 체크리스트

- [ ] SBO 크기 — 일반적 lambda 크기에 맞춰?
- [ ] 매뉴얼 vtable — boilerplate 부담 vs 성능 이득 측정?
- [ ] 캡처 최소화 — SBO 효과 유지?
- [ ] 핫 패스 — `auto`/템플릿/variant 우선 검토?
- [ ] 비-핫 패스 — 단순 std::function 사용?
- [ ] 측정 후 — 추정 아닌 데이터로 결정?

## 핵심 정리

1. **SBO** — 작은 객체 스택 buffer에 — 힙 할당 회피
2. **매뉴얼 vtable** — 함수 포인터 직접 — 인라인 가능성 ↑
3. **`std::function`** — 보통 SBO + 매뉴얼 vtable 결합
4. **trade-off** — `sizeof(Wrapper)` 증가 vs 할당 회피
5. **인라인** — 컴파일러가 vtable 추적 시 가능
6. **측정 우선** — 추정 말고 데이터 기반

## 관련 항목

- [가이드라인 32: Type Erasure](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 기본 구조
- [가이드라인 34: TE Wrapper 설정 비용](/blog/programming/cpp/cpp-software-design/guideline34-be-aware-of-the-setup-costs-of-owning-type-erasure-wrappers) — 생성 비용
- [가이드라인 23: 값 기반 Strategy](/blog/programming/cpp/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — std::function 활용
- [가이드라인 17: std::variant](/blog/programming/cpp/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 닫힌 집합 대안
