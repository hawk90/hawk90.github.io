---
title: "가이드라인 34: 소유 Type Erasure Wrapper의 설정 비용을 인식하라"
date: 2026-05-14T10:00:00
description: "owning과 non-owning Type Erasure는 비용 구조가 다르다. 빈번한 생성과 복사가 잦다면 std::function_ref 같은 view 변형이 큰 가치를 발휘한다."
tags: [C++, Software Design, Type Erasure, Performance]
series: "C++ Software Design"
seriesOrder: 34
draft: true
---

## 왜 이 가이드라인이 중요한가?

`std::function`은 **소유**(owning) wrapper다.

```cpp
void process(std::function<int(int)> f);    // f를 복사·이동 — 비용이 든다

auto lambda = [](int x) { return x; };
process(lambda);            // lambda를 std::function 안으로 복사한다
                            // 힙 할당과 Model<F> 생성이 일어날 수 있다
```

매 호출마다 잠재적으로 힙 할당이 발생한다. 핫 패스에서는 **상당한 비용**이 된다.

**비-소유 wrapper**는 view 형태로 이 비용을 피한다.

```cpp
// 가상의 std::function_ref (제안)
void process(std::function_ref<int(int)> f);

auto lambda = [](int x) { return x; };
process(lambda);            // view — 비용이 거의 0이다
```

owning과 view 중 무엇을 쓸지는 **수명 분석**과 **성능 요구**가 함께 결정한다.

## 비용 분석 — owning TE

```cpp
std::function<int(int)> f = [data = big_vec](int x) {
    return data[x];
};
// 1. lambda 생성 시 big_vec이 복사된다
// 2. std::function 생성:
//    - sizeof(lambda)를 확인한다
//    - SBO가 가능한가? big_vec 캡처로 크기가 크면 힙 할당이 일어난다
//    - Model<F>를 만들고 lambda를 이동한다
// 3. f 사용
// 4. f 소멸 — Model 소멸, big_vec 해제
```

비용은 다음과 같이 쌓인다.

- lambda 캡처 자체의 비용
- TE wrapper 생성 (힙 할당 + 복사·이동)
- 소멸 (힙 해제 + 캡처 데이터 해제)

호출이 빈번할수록 이 비용이 누적된다.

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

특징은 다음과 같다.

- 함수 포인터와 void*만으로 구성되어 sizeof는 16 bytes다
- 힙 할당이 0이다
- 소유하지 않으므로 F가 살아 있어야 한다
- 복사가 가능하며 단순 비트 복사다

## 비교 표

| 항목 | std::function | function_ref |
|---|---|---|
| 소유 | ✅ | ❌ (view) |
| 힙 할당 | 가능 | 0 |
| 복사 비용 | 크다 (캡처 + 힙) | 0 (포인터 2개) |
| 수명 관리 | 안전 | 사용자 책임 |
| sizeof | ~32~64 bytes | 16 bytes |
| 추천 사용처 | 저장 | 함수 인자 |

## 사용 패턴 — 함수 인자

비효율적인 예다.

```cpp
template<typename Func>
void for_each(const std::vector<int>& v, std::function<void(int)> fn) {
    for (int x : v) fn(x);
}

std::vector<int> v = ...;
for_each(v, [](int x) { /* ... */ });    // 호출마다 fn 생성 비용
```

매 호출마다 `std::function`을 만든다. lambda가 크면 힙 할당까지 따른다.

가장 효율적인 방법은 템플릿이다.

```cpp
template<typename Func>
void for_each(const std::vector<int>& v, Func fn) {
    for (int x : v) fn(x);
}

for_each(v, [](int x) { /* ... */ });    // 인라이닝 가능, 비용 0
```

다만 컴파일 시간이 늘고 헤더에 노출돼야 한다.

`function_ref`는 그 중간 지점이다.

```cpp
void for_each(const std::vector<int>& v, function_ref<void(int)> fn) {
    for (int x : v) fn(x);
}

for_each(v, [](int x) { /* ... */ });    // 빠르고 헤더 의존이 없다
```

비-템플릿 함수이면서도 빠른 호출이 가능한 균형 잡힌 선택이다.

## std::function이 어울리는 경우

저장이 필요한 경우다. 컬렉션이나 멤버 변수로 들고 있어야 할 때다.

```cpp
class EventManager {
    std::vector<std::function<void()>> handlers_;
public:
    void registerHandler(std::function<void()> h) {
        handlers_.push_back(std::move(h));
    }
};
```

핸들러의 수명은 EventManager가 관리해야 하므로 소유가 필수다. function_ref를 쓰면 수명 보장을 사용자가 떠안게 돼 안전성이 떨어진다.

비동기 작업도 같은 맥락이다.

```cpp
std::future<int> async_compute(std::function<int()> task);
```

task가 스레드 풀에서 실행되어 호출자 함수가 끝난 뒤에도 살아 있어야 하므로 소유가 자연스럽다.

## 함정 — 인자에 std::function을 남용

```cpp
// 성능을 의식하지 않은 일반적인 코드
void sort_by(std::vector<T>& v, std::function<bool(T,T)> cmp);

sort_by(v, [](T a, T b) { return a.x < b.x; });
// 일회용인데 std::function 생성 비용이 추가된다
```

개선책은 다음과 같다.

```cpp
template<typename Cmp>
void sort_by(std::vector<T>& v, Cmp cmp);
// 인라이닝 가능

// 또는
void sort_by(std::vector<T>& v, function_ref<bool(T,T)> cmp);
// view라서 빠르다
```

`std::sort`가 템플릿으로 설계된 이유도 여기에 있다. `std::function`을 쓰지 않는다.

## 함정 — 람다 복사 비용

```cpp
std::function<void()> f = [big_data = std::vector<int>(10000)]() { 
    /* ... */ 
};

std::function<void()> g = f;    // 깊은 복사 — big_data 10000개를 복사한다
```

람다가 캡처를 들고 있으면 `std::function` 복사 시 깊은 복사가 일어난다.

완화책으로는 `shared_ptr`로 캡처를 감싸는 방식이 있다.

```cpp
std::shared_ptr<std::vector<int>> data = ...;
std::function<void()> f = [data]() { /* use *data */ };
// shared_ptr 캡처 — std::function 복사 시 ref count만 증가한다
```

## std::move_only_function (C++23)

```cpp
std::move_only_function<void()> f = [p = std::make_unique<int>(42)]() {
    std::cout << *p;
};

auto g = std::move(f);        // OK — 이동
// auto h = f;                  // ❌ 컴파일 에러 — copy 불가
```

- `std::function`은 CopyConstructible을 요구해서 일부 캡처를 받을 수 없다
- `move_only_function`은 이동만 허용하므로 유연하다

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

위 수치는 추정이다. SBO 효과로 `std::function`도 빠를 수 있다. 결국 측정이 필수다.

## 모던 가이드 — function vs ref

```
콜백 보관 / 저장 → std::function (소유)
일회용 인자 → function_ref / 템플릿
이동 전용 캡처 → std::move_only_function
컴파일 타임 결정 → 템플릿 (가장 빠름)
```

## std::function의 SBO 미세조정

표준은 라이브러리 구현에 따라 다르다.

- libstdc++ — 보통 16~24 bytes
- libc++ — 보통 24 bytes
- MSVC — 보통 64 bytes (큰 buffer)

캡처가 크면 libc++에서는 힙 할당, MSVC에서는 SBO로 처리되는 식이다. 환경별 차이는 측정으로 확인한다.

## 함정 — 너무 작은 SBO

```cpp
// 16 bytes buffer
std::function<int()> f = [](){ return 42; };    // 캡처 없음 — OK

std::function<int()> g = [counter = 0]() mutable { return ++counter; };
// sizeof(lambda) = 4 + 함수 포인터 등 — buffer를 넘으면 힙으로 간다
```

캡처가 늘어나면 SBO 효과가 사라진다. 캡처를 최소화하는 편이 안전하다.

## std::function 대체재 검토

```
빠른 함수 인자  — function_ref / function2 (서드파티)
큰 buffer 보장  — fast_function (서드파티)
이동 전용        — std::move_only_function (C++23)
저장 + 다형성    — std::function (표준)
가장 빠름        — 템플릿 + auto (헤더 분리 어려움)
```

## 실무 가이드 — 결정 트리

```
콜백 / 함수 인터페이스가 필요한 경우
├── 저장 (멤버, 컨테이너) → std::function
│   ├── 이동만 → std::move_only_function (C++23)
│   └── 크기 보장 → 서드파티 fast_function
├── 일회용 인자 → function_ref (C++26) 또는 템플릿
└── 컴파일 타임 결정 → 템플릿 (가장 빠름)
```

## 실무 가이드 — 체크리스트

- [ ] 함수가 콜백을 **소유**해야 하는가? (수명 분석)
- [ ] 일회용 인자라면 function_ref나 템플릿을 고려했는가?
- [ ] lambda 캡처에 큰 객체가 있다면 shared_ptr로 감쌌는가?
- [ ] 핫 패스에서 std::function 비용을 측정했는가?
- [ ] C++23 이상이라면 move_only_function을 활용했는가?
- [ ] 보관과 사용의 패턴에 맞는 wrapper를 골랐는가?

## 핵심 정리

1. **owning vs view** — `std::function`(소유)과 `function_ref`(비-소유)
2. **owning 비용** — 힙 할당, 캡처 복사, 큰 sizeof
3. **view**는 함수 포인터 + void*로 거의 0 비용이다
4. **사용 가이드** — 저장에는 owning, 인자에는 view나 템플릿
5. **수명 관리**는 view를 쓸 때 사용자 책임이다
6. **C++23 move_only_function**은 이동 전용 캡처를 가능하게 한다

## 관련 항목

- [가이드라인 33: TE 최적화](/blog/programming/cpp/cpp-software-design/guideline33-be-aware-of-the-optimization-potential-of-type-erasure) — SBO, vtable
- [가이드라인 32: Type Erasure](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 기본 구조
- [가이드라인 23: 값 기반 Strategy](/blog/programming/cpp/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — std::function 활용
- [가이드라인 21: Command](/blog/programming/cpp/cpp-software-design/guideline21-use-command-to-isolate-what-things-are-done) — 콜백 저장 패턴
