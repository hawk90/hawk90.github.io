---
title: "항목 29: 최적화할 수 있도록 설계하라"
date: 2026-05-10T18:00:00
description: "컴파일러가 최적화할 여지를 남기는 설계 — 값 의미론, 연속 메모리, 작은 함수, 가상 함수 신중."
tags: [C++, Performance, Design]
series: "Beautiful C++"
seriesOrder: 29
draft: false
---

## 왜 이 항목이 중요한가?

성능 최적화의 격언 — "**측정하기 전에 최적화하지 마라**". 옳다. 그러나 — **최적화의 여지를 처음부터 막아버리는 설계**도 흔하다.

```cpp
class IShape {
    virtual void render(Canvas&) const = 0;
};
std::list<std::unique_ptr<IShape>> shapes;     // 가상 호출 + 캐시 비효율 + 동적 할당
```

이 설계로 — 나중에 최적화하려면 거의 전체 재작성. 측정해서 "느리다"고 발견해도 — 고칠 곳이 사방.

대안 설계:

```cpp
struct Shape { /* 데이터만 */ };
std::vector<Shape> shapes;        // 연속 메모리, 캐시 친화
```

같은 도메인 — 다른 설계. 후자가 **최적화 여지가 큼**. 이 항목은 그런 설계 원칙들.

## 핵심 내용

- "성능은 마지막에 측정하고 고친다"가 원칙이지만, **최적화의 여지를 막지 않는 설계**는 처음부터 가능하다
- 컴파일러가 최적화할 수 있도록 **별칭(aliasing)·전역 상태·가상 호출**을 줄여라
- **값 의미론**을 선호 — 컴파일러가 이동·인라이닝·NRVO를 적용하기 쉬움
- 인터페이스는 **연속된 데이터**를 다루도록(범위/스팬) → 캐시·SIMD 친화적
- "필요할 때 최적화"가 가능하려면 **측정 가능한 구조**여야 한다 (작은 함수, 명확한 경계)

## 비교 — 최적화 차단 vs 여지 남김

### Bad: 가상 호출 + 동적 할당 + 리스트

```cpp
class IShape {
public:
    virtual void render(Canvas&) const = 0;
    virtual ~IShape() = default;
};

std::list<std::unique_ptr<IShape>> shapes;

for (const auto& s : shapes) {
    s->render(canvas);     // vtable lookup + 간접 호출
}
```

성능 문제:
- **vtable 디스패치** — 인라이닝 불가, 분기 예측 어려움
- **`std::list`** — 노드마다 별도 할당, 캐시 미스
- **`unique_ptr`** — 또 한 단계 간접 참조
- 메모리 — 객체가 힙 곳곳에 흩어짐

### Good: 값 타입 + 연속 메모리 + 비-가상

```cpp
struct Shape {
    // 데이터만 — 가상 함수 X
    Type type;
    Position pos;
    // ...
};

void render(const Shape& s, Canvas& c);   // 자유 함수, 비-가상

std::vector<Shape> shapes;

for (const auto& s : shapes) {
    render(s, canvas);     // 인라이닝 가능
}
```

- **vector** — 연속 메모리, 캐시 친화, SIMD 가능
- **비-가상 호출** — 인라이닝 + 컴파일러 최적화 풀
- **값 타입** — 이동, NRVO 적용
- 측정 가능 — 분명한 경계, 작은 함수

## 컴파일러가 좋아하는 것

### 1) 인라이닝 — 작은 함수

```cpp
constexpr int square(int x) { return x * x; }
```

`constexpr`, 작은 본문 — 컴파일러가 인라이닝. 호출 비용 0.

### 2) 연속 메모리 — 캐시

```cpp
std::vector<Particle> particles(10000);
for (auto& p : particles) {
    p.update();      // 캐시 라인 효율적 사용
}
```

vs

```cpp
std::list<Particle> particles;     // ⚠️ 노드 흩어짐
```

캐시 라인이 64 byte. 연속 메모리면 — 한 번 로드로 여러 객체 처리. linked list는 매 요소마다 캐시 미스.

### 3) 값 의미론 — NRVO / 이동

```cpp
std::vector<int> compute() {
    std::vector<int> result;
    // ... fill ...
    return result;     // NRVO — 복사 없음
}

auto v = compute();    // 무복사
```

값 반환이 — 포인터/참조보다 컴파일러가 좋아함. NRVO, 이동 모두 적용.

### 4) 비-가상 함수 — 정적 호출

```cpp
class Widget {
public:
    int compute() const { /* ... */ }    // 비-가상 — 정적 호출
};

auto* w = get_widget();
int x = w->compute();    // 인라이닝 가능
```

가상 함수는 — vtable lookup. 비-가상이면 — 컴파일러가 직접 호출 또는 인라이닝.

## 함정 — 추상화 비용

```cpp
class Calculator {
public:
    virtual int add(int a, int b) const = 0;
    virtual int sub(int a, int b) const = 0;
    virtual int mul(int a, int b) const = 0;
};
```

`add`, `sub`, `mul`처럼 **간단한 연산**에 — 가상 함수는 과한 비용. 인라이닝 못 함, 매 호출에 디스패치.

해결: 비-가상 자유 함수 또는 namespace 함수.

```cpp
namespace math {
    constexpr int add(int a, int b) { return a + b; }
    constexpr int sub(int a, int b) { return a - b; }
    constexpr int mul(int a, int b) { return a * b; }
}
```

가상 함수는 — **진짜 다형성이 필요할 때만**.

## 별칭(aliasing) — 컴파일러 최적화 방해

```cpp
void process(int* a, int* b, int* result, size_t n) {
    for (size_t i = 0; i < n; ++i) {
        result[i] = a[i] + b[i];
        // 컴파일러: a, b, result가 같은 메모리 가리킬 수도? 보수적 코드 생성
    }
}
```

C++의 strict aliasing 규칙 — 같은 타입이면 alias 가능. 컴파일러가 SIMD나 reorder 못 함.

해결: `__restrict` (비표준이지만 GCC/Clang/MSVC 지원):

```cpp
void process(int* __restrict a, int* __restrict b, int* __restrict result, size_t n);
```

"이 포인터들은 서로 alias 안 함" 보장 — 강한 최적화 가능.

또는 — 인터페이스 자체를 명확히:

```cpp
void process(std::span<const int> a, std::span<const int> b, std::span<int> result);
```

`std::span<const T>` vs `std::span<T>` 분리로 alias 가능성 줄임.

## 전역 가변 상태 — 최적화 방해

```cpp
int global_counter = 0;

void process() {
    ++global_counter;     // 함수마다 전역 변수 변경
    // 컴파일러: global_counter가 또 어디서 변경될지 모름
    // → 매번 메모리 읽기/쓰기 (레지스터 캐싱 안 됨)
}
```

전역 가변 상태 — 컴파일러가 보수적. 매 호출 후 메모리 동기화.

해결: 지역 변수, 매개변수 전달.

```cpp
int process(int counter) {
    return counter + 1;     // 순수 함수 — 컴파일러 자유롭게 최적화
}
```

## 작은 함수 — 측정과 최적화의 단위

```cpp
// Bad: 거대 함수
void megaProcess() {
    // 500줄
    // 측정 불가 — 어느 부분이 느린지?
}

// Good: 작은 함수
void load();
void filter();
void transform();
void save();

void process() {
    load();
    filter();
    transform();
    save();
}
```

각 작은 함수 — 측정 가능, 인라이닝 가능, 교체 가능.

## SoA vs AoS — 데이터 레이아웃

**Array of Structures** (AoS):

```cpp
struct Particle {
    float x, y, z;
    float vx, vy, vz;
    int id;
};

std::vector<Particle> particles;
```

**Structure of Arrays** (SoA):

```cpp
struct ParticleSystem {
    std::vector<float> x, y, z;
    std::vector<float> vx, vy, vz;
    std::vector<int>   id;
};
```

SoA가 SIMD 친화 — 같은 필드만 처리할 때 캐시 효율 + 벡터화. 게임 엔진의 ECS, 수치 계산에 사용.

도메인에 따라 선택. 보통 AoS가 코드 자연스러움, SoA는 핫 패스만.

## 함정 — 너무 일찍 최적화

```cpp
// "캐시 친화적으로!" — 측정 없이
struct Optimized {
    alignas(64) int a;
    char padding[60];     // false sharing 방지 (멀티스레드만 의미)
    alignas(64) int b;
};
```

측정 없이 — 의미 없는 복잡도. 일반 코드를 먼저, 측정 후 핫 패스만 최적화.

## 함정 — 최적화로 안전성 희생

```cpp
// "성능을 위해 raw pointer"
void process(Widget* w);     // unique_ptr보다 빠를까?
```

대부분 — 측정해 보면 **차이 없음**. unique_ptr는 단순 포인터 래퍼. 안전성 손실의 의미 없는 거래.

## 측정 도구

```bash
# Linux perf
perf record ./myapp
perf report

# clang -O2 -pg + gprof
# Valgrind callgrind
# Intel VTune
# 자체 timing
```

**측정 → 핫스팟 식별 → 최적화 → 재측정**의 사이클. 코드 어디나 최적화 X.

## 컴파일러 옵션 — 기본 최적화

```bash
g++ -O2          # 일반 권장
g++ -O3          # 더 공격적 (가끔 코드 크기 증가)
g++ -O2 -flto    # Link-Time Optimization
g++ -Ofast       # IEEE 754 일부 무시 (속도 우선)
```

`-O2`나 `-O3` 기본. LTO로 — 전체 프로그램 인라이닝.

## 모던 도구 — `[[likely]]` / `[[unlikely]]` (C++20)

```cpp
if (x > 0) [[likely]] {
    // 자주 발생하는 경로
} else [[unlikely]] {
    // 드문 경로
}
```

분기 예측 힌트. 핫 패스의 가지에 명시.

## 표준 라이브러리 — 최적화 친화

```cpp
std::sort(v.begin(), v.end());           // 인라이닝 + 알고리즘 최적화
std::accumulate(v.begin(), v.end(), 0);
std::transform(in.begin(), in.end(), out.begin(), f);
```

표준 알고리즘 — 손 루프보다 종종 빠름. 컴파일러가 SIMD, 병렬 등 적용 가능.

C++17+ `std::execution`:

```cpp
std::sort(std::execution::par, v.begin(), v.end());     // 병렬
```

## 함정 — 너무 큰 매개변수

```cpp
void process(std::array<int, 10000> arr);     // ⚠️ 큰 객체 복사
```

큰 객체는 const 참조로 (항목 20):

```cpp
void process(const std::array<int, 10000>& arr);
```

또는 `std::span` (C++20).

## 실무 가이드 — 결정 트리

```
이 코드를 최적화하기 쉬울까?
├── 가상 함수가 핫 패스에 있나? → 비-가상 또는 CRTP
├── 데이터가 연속 메모리인가? → vector, array (list X)
├── 작은 함수로 분리되어 있나? → 측정·교체 쉬움
├── 전역 가변 상태? → 매개변수로
├── 별칭 가능성? → __restrict 또는 명확한 타입 분리
└── 너무 일찍 최적화하지 않는가? → 측정 우선
```

## 실무 가이드 — 체크리스트

- [ ] 핫 패스에 가상 함수 적은가?
- [ ] 데이터가 연속 메모리(`vector`, `array`)?
- [ ] 작은 함수로 분리 → 측정·인라이닝 가능?
- [ ] 전역 가변 상태 줄였는가?
- [ ] 값 의미론 + NRVO/이동 활용?
- [ ] `-O2 -flto` 또는 동등 옵션?
- [ ] 측정 후 최적화 (premature optimization X)?

## 정리

최적화는 **여지를 남겨두는 설계**에서 출발한다. 가상 호출, 흩뿌려진 할당, 숨은 전역 상태를 줄이면 나중에 측정-수정 사이클이 훨씬 쉬워진다.

원칙:
1. **값 의미론** — NRVO, 이동, 인라이닝
2. **연속 메모리** — `vector`, `array`
3. **작은 함수** — 측정과 인라이닝의 단위
4. **비-가상 우선** — 정말 다형성 필요할 때만 virtual
5. **명시적 인터페이스** — `std::span`, `std::string_view`
6. **측정 후 최적화** — 추측 X

## 관련 항목

- [항목 11: 명시적 공유 최소화](/blog/programming/beautiful-cpp/item11-minimize-explicit-data-sharing) — 가변 공유의 비용
- [항목 23: 템플릿 추상화](/blog/programming/beautiful-cpp/item23-use-templates-for-abstraction) — 가상 함수의 정적 대안
- [항목 30: RAII 누수 방지](/blog/programming/beautiful-cpp/item30-use-raii-to-prevent-leaks) — 안전성과 성능의 결합
