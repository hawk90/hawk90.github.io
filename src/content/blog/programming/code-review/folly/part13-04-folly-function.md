---
title: "Part 13-04: folly::Function (vs std::function)"
date: 2026-05-25T13:00:00
description: "Part 13-04: folly::Function — move-only callable. unique_ptr capture, const-correctness, exec policy를 갖춘 std::function 대체."
series: "Folly Code Review"
seriesOrder: 59
tags: [cpp, folly, function, callable, move-only]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::Function<Sig>`는 **move-only callable wrapper**다. `std::function`이 callable에 CopyConstructible를 요구해 `unique_ptr` 캡처를 못 받는 문제를 해결한다. 추가로 const-correctness와 exec policy(once/non-once)를 명시할 수 있다.

## 동기 — std::function의 두 가지 한계

### 1. CopyConstructible 요구

```cpp
auto ptr = std::make_unique<HeavyState>();

std::function<void()> f = [ptr = std::move(ptr)]() {
  ptr->doWork();
};
// 컴파일 에러 — std::function은 callable이 CopyConstructible여야 함
// unique_ptr capture는 copy 불가
```

`std::function`은 type erasure 안에서 callable을 copy할 수 있어야 한다. unique_ptr 같은 move-only state는 못 담는다. 우회하려면 `shared_ptr`로 감싸야 하는데 atomic refcount 비용.

### 2. const-correctness 부족

```cpp
std::function<void()> f = [state](mutable) { state.modify(); };
// const std::function&으로 받아도 operator()는 non-const로 호출 가능
// → const-correctness 깨짐
```

`std::function::operator()`가 const 메서드라 const ref로 받아도 호출되는데, 내부 callable이 mutable이면 실제로 상태가 변한다.

## folly::Function

```cpp
#include <folly/Function.h>

auto ptr = std::make_unique<HeavyState>();
folly::Function<void()> f = [ptr = std::move(ptr)]() {
  ptr->doWork();
}; // OK — folly::Function은 move-only

// const-correctness
folly::Function<void() const> cf = [](){ /* must not mutate */ };
// folly::Function<void()>와 다른 타입
```

API.

```cpp
folly::Function<Ret(Args...)>           // non-const, callable mutable OK
folly::Function<Ret(Args...) const>     // const, callable must not mutate
folly::Function<Ret(Args...) &&>        // once-only, exec 후 self consume
```

`std::function`처럼 type erasure이지만 move-only.

## 내부 구현 — SBO

```cpp
template <typename Sig>
class Function {
  union {
    char inline_buf_[sizeof(void*) * 6]; // SBO
    void* heap_;
  };
  // dispatch table
  struct VTable {
    Ret (*invoke)(Function*, Args...);
    void (*move)(Function*, Function*);
    void (*destroy)(Function*);
  };
  const VTable* vtable_;
};
```

callable이 작으면 inline_buf_에 in-place (SBO, ~48 bytes), 크면 heap에 alloc. std::function과 거의 같은 SBO 크기.

VTable은 invoke/move/destroy만 — copy가 없다. 이게 move-only의 핵심.

## once-only — `&&` qualifier

```cpp
folly::Function<void() &&> once = [&]() {
  // self를 소비하고 끝 (한 번만 호출 가능)
};

std::move(once)(); // OK
once();            // 컴파일 에러
std::move(once)(); // 런타임 abort (이미 호출됨)
```

callback이 한 번만 실행됨이 type level에서 보장된다. Future의 thenValue 콜백이 이 패턴.

## std::function와 비교

| 항목 | std::function | folly::Function |
|------|---------------|-----------------|
| CopyConstructible 요구 | yes | no |
| unique_ptr capture | x | o |
| const callable 구분 | x | o (`Sig const`) |
| once-only | x | o (`Sig &&`) |
| SBO 크기 | 구현마다 다름, ~32B | ~48B (6 ptr) |
| std 호환 변환 | — | std::function ← folly::Function 변환 가능 |

## 코드 리뷰 포인트

### 1. callback API는 folly::Function 우선

```cpp
// 회피 — unique_ptr capture 불가
void addCallback(std::function<void()> cb);

// Good — move-only 받음
void addCallback(folly::Function<void()> cb);

addCallback([p = std::make_unique<X>()]() { p->run(); });
```

특히 비동기 API는 move-only가 자연스럽다.

### 2. const 명시

```cpp
// 회피 — 의도가 const-readonly인데 non-const
folly::Function<void()> f;

// Good — readonly임을 명시
folly::Function<void() const> f;
```

내부 callable이 state를 안 바꾼다면 const로 표시. type 시스템이 보장.

### 3. once-only 명시

```cpp
// 회피 — Promise.set 콜백, 한 번만 호출되는데 일반 Function
folly::Function<void(Result)> cb;

// Good — once-only 명시
folly::Function<void(Result) &&> cb;
```

콜백이 한 번만 실행됨을 type으로 알리면 caller가 잘못 보관 불가.

### 4. std::function로 변환

```cpp
folly::Function<int()> ff = []{ return 1; };
std::function<int()> sf = std::move(ff).asSharedProxy(); // copy 가능하게 변환
```

외부 API가 std::function을 요구하면 변환 helper 사용. asSharedProxy는 내부에서 shared_ptr로 감싸 copyable로.

## 성능 비교

| | std::function | folly::Function |
|---|--------------|-----------------|
| empty 생성 | ~1ns | ~1ns |
| SBO 호출 | ~3ns | ~3ns |
| heap callable 호출 | ~5ns | ~5ns |
| copy | yes (callable copy) | n/a (move-only) |
| move | swap | swap |

성능은 사실상 동일. 차이는 표현력(move-only, const, once-only).

## 안티패턴

### 1. shared_ptr로 우회

```cpp
// 회피 — folly::Function 쓰면 됨
auto ptr = std::make_shared<HeavyState>();
std::function<void()> f = [ptr] { ptr->doWork(); };
```

shared_ptr atomic 비용 + 의미 불명확(왜 shared인지). folly::Function이 명료.

### 2. once-only를 일반 Function으로

```cpp
// 회피
folly::Function<void()> cb = [&]() { /* 한 번만 */ };
runner.setCallback(std::move(cb));
runner.setCallback(std::move(cb)); // 한 번 후 호출, 미정의
```

once-only면 `&&` qualifier로 명시.

### 3. const Function&으로 받아 mutate

```cpp
// 회피
void run(const folly::Function<void()>& f) {
  f(); // const Function의 callable은 non-const일 수도? Folly는 type level 구분
}

// Good
void run(folly::Function<void() const>& f); // 명확
```

const Function vs non-const Function vs Function<void() const>의 구분을 의식.

## 정리

- folly::Function은 **move-only callable**.
- unique_ptr 같은 move-only state를 캡처 가능.
- const qualifier(`Sig const`)로 callable의 const-correctness.
- `&&` qualifier로 once-only 콜백 명시.
- SBO 약 48B, 그 외 heap alloc.
- std::function과 호환 변환 (asSharedProxy).
- async/콜백 API는 folly::Function이 기본.

## 다음 편

[Part 13-05 Lazy](/blog/programming/code-review/folly/part13-05-lazy) — 지연 초기화 wrapper. once_flag 패턴을 type level로.

## 관련 항목

- [Part 2-04 thenValue / thenError](/blog/programming/code-review/folly/part2-04-then-value-error) — once-only 콜백 사용
- [Effective Modern C++ Item 33](/blog/programming/cpp/effective-modern-cpp/item33-init-capture-for-move) — init capture와 move-only lambda
- [Effective Modern C++ Item 34](/blog/programming/cpp/effective-modern-cpp/item34-lambdas-over-bind) — std::function 한계
