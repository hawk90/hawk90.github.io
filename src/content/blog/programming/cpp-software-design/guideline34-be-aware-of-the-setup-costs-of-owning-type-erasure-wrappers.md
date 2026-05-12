---
title: "가이드라인 34: 소유 Type Erasure Wrapper의 설정 비용을 인식하라"
date: 2026-05-15T05:00:00
description: "Owning vs non-owning Type Erasure. 빈번한 생성·복사의 비용. std::function_ref, view 변형의 가치."
tags: [C++, Software Design, Type Erasure, Performance]
series: "C++ Software Design"
seriesOrder: 34
---

## 왜 이 가이드라인이 중요한가?

`std::function`은 — **소유**(owning) wrapper:

```cpp
void process(std::function<int(int)> f);    // f를 복사/이동 — 비용 발생

auto lambda = [](int x) { return x; };
process(lambda);            // lambda를 std::function 안에 복사
                            // — 힙 할당 + Model<F> 생성 가능
```

매 호출마다 — 잠재적 힙 할당. 핫 패스에선 — **상당한 비용**.

**비-소유 wrapper** — view 변형:

```cpp
// 가상의 std::function_ref (제안)
void process(std::function_ref<int(int)> f);

auto lambda = [](int x) { return x; };
process(lambda);            // view — 비용 거의 0
```

언제 owning, 언제 view 쓸지 — **수명 분석**과 **성능 요구**가 결정.

## 비용 분석 — owning TE

```cpp
std::function<int(int)> f = [data = big_vec](int x) {
    return data[x];
};
// 1. lambda 생성 (big_vec 복사)
// 2. std::function 생성:
//    - sizeof(lambda) 측정
//    - SBO 가능? — 그러나 big_vec capture로 크기 큼 → 힙 할당
//    - Model<F> 생성, lambda 이동
// 3. f 사용
// 4. f 소멸 — Model 소멸, big_vec 해제
```

**비용**:
- lambda 캡처 비용
- TE wrapper 생성 (힙 할당 + 복사/이동)
- 소멸 (힙 해제 + 캡처 데이터 해제)

빈번한 호출 — 누적.

## std::function_ref — non-owning 대안

```cpp
// C++26 제안 (또는 자체 구현)
template<typename Sig>
class function_ref;

template<typename R, typename... Args>
class function_ref<R(Args...)> {
    void* obj_;
    R (*fn_)(void*, Args...);
    
public:
    template<typename F>
    function_ref(F& f)
        : obj_(&f)
        , fn_([](void* p, Args... args) {
              return (*static_cast<F*>(p))(std::forward<Args>(args)...);
          }) {}
    
    R operator()(Args... args) const {
        return fn_(obj_, std::forward<Args>(args)...);
    }
};
```

**특징**:
- 함수 포인터 + void* — sizeof = 16 bytes
- 힙 할당 0
- 소유 안 함 — F가 살아있어야 함
- 복사 가능 — 단순 비트 복사

## 비교 표

| 항목 | std::function | function_ref |
|---|---|---|
| 소유 | ✅ | ❌ (view) |
| 힙 할당 | 가능 | 0 |
| 복사 비용 | 큼 (캡처 + 힙) | 0 (포인터 2개) |
| 수명 관리 | 안전 | 사용자 책임 |
| sizeof | ~32-64 bytes | 16 bytes |
| 추천 사용처 | 저장 | 함수 인자 |

## 사용 패턴 — 함수 인자

**비효율**:

```cpp
template<typename Func>
void for_each(const std::vector<int>& v, std::function<void(int)> fn) {
    for (int x : v) fn(x);
}

std::vector<int> v = ...;
for_each(v, [](int x) { /* ... */ });    // fn 생성 비용
```

매 호출 — std::function 생성. lambda 크면 힙 할당.

**효율 — 템플릿**:

```cpp
template<typename Func>
void for_each(const std::vector<int>& v, Func fn) {
    for (int x : v) fn(x);
}

for_each(v, [](int x) { /* ... */ });    // 인라인 가능, 0 비용
```

템플릿 — 컴파일 시간 ↑, 헤더 노출 필요.

**중간 — function_ref**:

```cpp
void for_each(const std::vector<int>& v, function_ref<void(int)> fn) {
    for (int x : v) fn(x);
}

for_each(v, [](int x) { /* ... */ });    // 빠름, 헤더 의존 없음
```

비-템플릿 함수, 빠른 호출 — 균형.

## std::function — 언제 좋은가

**저장** — 컬렉션이나 멤버 변수:

```cpp
class EventManager {
    std::vector<std::function<void()>> handlers_;
public:
    void registerHandler(std::function<void()> h) {
        handlers_.push_back(std::move(h));
    }
};
```

- 핸들러의 lifetime — EventManager가 관리해야 함 → 소유 필수
- function_ref 쓰면 — 사용자가 lifetime 보장해야 → 안전성 ↓

**비동기 작업**:

```cpp
std::future<int> async_compute(std::function<int()> task);
```

- task가 스레드 풀에서 — 호출자 함수 끝나도 살아있어야 → 소유

## 함정 — 인자에 std::function 남용

```cpp
// 일반적 코드 — 성능 의식 없음
void sort_by(std::vector<T>& v, std::function<bool(T,T)> cmp);

sort_by(v, [](T a, T b) { return a.x < b.x; });
// std::function 생성 — 일회용인데 비용 ↑
```

**개선**:

```cpp
template<typename Cmp>
void sort_by(std::vector<T>& v, Cmp cmp);
// — 인라인 가능

// 또는
void sort_by(std::vector<T>& v, function_ref<bool(T,T)> cmp);
// — view, 빠름
```

`std::sort` — 템플릿. `std::function` 안 쓰는 이유.

## 함정 — 람다 복사 비용

```cpp
std::function<void()> f = [big_data = std::vector<int>(10000)]() { 
    /* ... */ 
};

std::function<void()> g = f;    // 깊은 복사 — big_data 10000개 복사
```

람다 캡처 — std::function 복사 시 깊은 복사 발생.

**완화**:

```cpp
std::shared_ptr<std::vector<int>> data = ...;
std::function<void()> f = [data]() { /* use *data */ };
// shared_ptr 캡처 — std::function 복사 시 ref count만 증가
```

## std::move_only_function (C++23)

```cpp
std::move_only_function<void()> f = [p = std::make_unique<int>(42)]() {
    std::cout << *p;
};

auto g = std::move(f);        // OK — 이동
// auto h = f;                  // ❌ 컴파일 에러 — copy 안 됨
```

- std::function 요구사항 (CopyConstructible) — 일부 캡처 못 받음
- move_only_function — 이동만 — 유연

## 측정 사례

```cpp
// 작은 lambda, 캡처 없음
auto lambda = [](int x) { return x + 1; };

// 직접 호출
lambda(5);                   // ~0.5 ns

// std::function 변환 + 호출
std::function<int(int)> sf = lambda;    // ~50 ns (SBO 가능)
sf(5);                                    // ~2 ns

// function_ref
function_ref<int(int)> fr = lambda;     // ~1 ns
fr(5);                                    // ~1 ns
```

수치 추정. SBO 효과로 std::function도 빠를 수 있음. 측정 필수.

## 모던 가이드 — function vs ref

```
콜백 보관 / 저장 → std::function (소유)
일회용 인자 → function_ref / 템플릿
이동 전용 캡처 → std::move_only_function
컴파일 타임 결정 → 템플릿 (가장 빠름)
```

## std::function의 SBO 미세조정

표준 — 라이브러리 구현마다 다름:
- libstdc++ — 보통 16-24 bytes
- libc++ — 보통 24 bytes
- MSVC — 보통 64 bytes (큰 buffer)

큰 capture — libc++에선 힙 할당, MSVC에선 SBO. 환경별 차이 — 측정.

## 함정 — 너무 작은 SBO

```cpp
// 16 bytes buffer
std::function<int()> f = [](){ return 42; };    // 캡처 없음 — OK

std::function<int()> g = [counter = 0]() mutable { return ++counter; };
// sizeof(lambda) = 4 + 함수 포인터 등 — buffer 초과 가능 → 힙
```

캡처 늘면 — SBO 효과 무력. 캡처 최소화 권장.

## std::function 대체재 검토

```
빠른 함수 인자 — function_ref / function2 (서드파티)
큰 buffer 보장 — fast_function (서드파티)
이동 전용 — std::move_only_function (C++23)
저장 + 다형성 — std::function (표준)
가장 빠름 — 템플릿 + auto (헤더 분리 어려움)
```

## 실무 가이드 — 결정 트리

```
콜백 / 함수 인터페이스 필요한 경우:
├── 저장 (멤버, 컨테이너) → std::function
│   ├── 이동만 → std::move_only_function (C++23)
│   └── 크기 보장 → 서드파티 fast_function
├── 일회용 인자 → function_ref (C++26) 또는 템플릿
└── 컴파일 타임 결정 → 템플릿 (가장 빠름)
```

## 실무 가이드 — 체크리스트

- [ ] 함수가 콜백을 **소유**해야 하는가? (lifetime 분석)
- [ ] 일회용 인자라면 — function_ref 또는 템플릿 고려?
- [ ] lambda 캡처 — 큰 객체 — shared_ptr로 래핑?
- [ ] 핫 패스 — 측정으로 std::function 비용 확인?
- [ ] C++23 이상 — move_only_function 활용?
- [ ] 보관 vs 사용 — 패턴별 wrapper 선택?

## 핵심 정리

1. **owning vs view** — std::function (소유), function_ref (비-소유)
2. **owning 비용** — 힙 할당, 캡처 복사, sizeof 큼
3. **view** — 함수 포인터 + void* — 거의 0 비용
4. **사용 가이드** — 저장은 owning, 인자는 view/템플릿
5. **lifetime** — view 사용 시 사용자 책임
6. **C++23 move_only_function** — 이동 전용 캡처 가능

## 관련 항목

- [가이드라인 33: TE 최적화](/blog/programming/cpp-software-design/guideline33-be-aware-of-the-optimization-potential-of-type-erasure) — SBO, vtable
- [가이드라인 32: Type Erasure](/blog/programming/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 기본 구조
- [가이드라인 23: 값 기반 Strategy](/blog/programming/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — std::function 활용
- [가이드라인 21: Command](/blog/programming/cpp-software-design/guideline21-use-command-to-isolate-what-things-are-done) — 콜백 저장 패턴
