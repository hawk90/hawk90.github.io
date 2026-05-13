---
title: "항목 36: 비동기성이 필수라면 std::launch::async를 명시하라"
date: 2025-01-10T11:00:00
description: "std::async의 기본 정책이 가져오는 미묘한 함정 — deferred로 떨어지면 polling 무한 루프."
tags: [C++, Concurrency, std::async, launch policy, Modern C++]
series: "Effective Modern C++"
seriesOrder: 36
draft: true
---

## 왜 이 항목이 중요한가?

`std::async(work)`는 직관적으로 "백그라운드에서 work를 실행한다"는 의미로 보인다. 그런데 기본 launch policy는 `async | deferred`다. 시스템이 둘 중 무엇이든 선택할 수 있다. deferred로 결정되면 work는 `.get()` 시점까지 **시작도 안 한다**.

이게 네 가지 자리에서 미묘한 함정을 만든다.

- thread_local 변수가 어느 스레드의 것인지 결정적이지 않다.
- `wait_for` 기반 polling이 deferred면 **무한 루프**에 빠진다.
- 백그라운드 진행을 가정한 로직이 깨진다.
- 시스템 자원 부족 시 조용히 deferred로 떨어진다.

해결책은 단순하다. **비동기가 필요하면 `std::launch::async`를 명시**한다.

## 개요

`std::async`의 기본 launch policy는 `async | deferred`다. 시스템이 결정한다. 이게 종종 동기 실행으로 떨어져 의도와 다른 동작을 일으킨다. thread_local 변수, polling, `wait_for` timeout 등이 영향을 받는다.

## 필수 개념: launch policy

> **초보자를 위한 배경 지식**

<br>

### 두 가지 정책

```cpp
std::launch::async      // 새 스레드에서 즉시 실행
std::launch::deferred   // .get() / .wait() 호출 시점까지 지연 (호출 스레드에서 실행)
```

기본값은 두 정책의 OR — `std::launch::async | std::launch::deferred`다. 시스템이 자유롭게 선택한다.

```cpp
auto fut = std::async(work);                              // 기본 정책
auto fut2 = std::async(std::launch::async, work);          // 명시 비동기
auto fut3 = std::async(std::launch::deferred, work);       // 명시 지연
```

### deferred의 의미

```cpp
auto fut = std::async(std::launch::deferred, work);
// 여기까진 work 실행 X

fut.get();   // ◄── 여기서 work 실행 (동기)
```

사실상 lazy evaluation이다. 새 스레드를 안 만든다.

## 기본 정책의 함정 4가지

기본 `async | deferred`는 시스템이 결정한다. 어느 쪽이 될지 모른다. 이게 다음 시나리오에서 문제가 된다.

### 함정 1 — work가 시작 안 될 수도

```cpp
auto fut = std::async(work);   // 기본 정책
                                // deferred로 결정되면 work는 .get() 전까진 시작도 안 함
```

기대는 백그라운드에서 진행 중. 실제는 deferred면 아직 시작이 안 됐다.

### 함정 2 — thread_local 변수

```cpp
thread_local int x = 0;

auto fut = std::async([] {
    x = 42;   // 어느 스레드의 x?
});
```

- `async`로 결정되면 → 새 스레드의 x다.
- `deferred`로 결정되면 → 호출 스레드의 x다 (`.get()` 호출 시점).

thread_local 변수에 의존하는 코드는 **결정적이지 않다**.

### 함정 3 — polling 무한 루프

```cpp
auto fut = std::async(work);

while (fut.wait_for(100ms) != std::future_status::ready) {
    // 다른 일 ...
}
```

기대는 work가 끝날 때까지 wait_for로 폴링하는 것이다.

실제는 deferred면 work가 시작도 안 했으니 **`wait_for`가 절대 ready가 안 된다**. **무한 루프**다.

이유는 `wait_for`가 deferred 태스크에 대해 **타이머 만료 무한**으로 반환하기 때문이다 (deferred는 호출 시점에만 실행).

### 함정 4 — 작업 보장 없음

`async`로 결정되리란 보장이 없다. 시스템 자원이 부족하면 deferred로 후퇴한다.

## 비동기 보장 — 명시

```cpp
auto fut = std::async(std::launch::async, work);
```

이러면 다음이 보장된다.

- ✅ 반드시 새 스레드에서 즉시 실행된다.
- ✅ thread_local은 새 스레드의 것이다.
- ✅ `wait_for` 폴링이 의미 있게 동작한다.
- ⚠️ 시스템 자원 부족 시 `system_error` 예외다 (후퇴 X).

## 일반화 헬퍼

매번 정책을 적기가 귀찮으면 wrapper를 쓴다.

```cpp
template<typename F, typename... Ts>
inline auto reallyAsync(F&& f, Ts&&... params) {
    return std::async(std::launch::async,
                      std::forward<F>(f),
                      std::forward<Ts>(params)...);
}

auto fut = reallyAsync(work);
```

C++14 generic이다. 모든 호출 가능 객체에 OK다.

## 명시적 선택 가이드

| 상황 | 정책 |
| --- | --- |
| 백그라운드 진행 필요 | `std::launch::async` |
| polling으로 진행 검사 | `std::launch::async` (deferred는 폴링 무한) |
| thread_local 의존 | 명시 — 어느 스레드인지 결정적 |
| lazy 평가 OK | `std::launch::deferred` |
| 그냥 결과만 필요 (백그라운드 무관) | 기본 정책 |

## deferred의 정당한 활용

- **lazy 계산** — 결과가 필요할 때만.
- **메모이제이션** — 한 번만 평가, 결과 캐시.
- **단순 콜백** — 비동기성이 불필요할 때.

```cpp
auto fut = std::async(std::launch::deferred, expensiveCompute);

if (someCondition) {
    auto val = fut.get();   // 여기서 처음 실행
} else {
    // 결과 안 쓰면 expensiveCompute 호출 안 됨
}
```

## 함정 검사 — 정책 확인

```cpp
auto fut = std::async(work);

if (fut.wait_for(0ms) == std::future_status::deferred) {
    fut.get();   // 동기 호출
} else {
    // async — 폴링 또는 다른 처리
}
```

`wait_for(0ms)`는 deferred에 대해 즉시 `deferred`를 반환한다. 검출이 가능하다.

## 함정 — std::async future의 소멸자

`std::launch::async`로 만든 future가 마지막 참조면, 소멸자가 **block**된다.

```cpp
{
    auto fut = std::async(std::launch::async, longTask);
}   // ← 여기서 longTask 끝까지 기다림 (block!)
```

자세한 건 [항목 38](/blog/programming/cpp/effective-modern-cpp/item38-be-aware-of-varying-thread-handle-destructor-behavior)에서 다룬다.

## 핵심 정리

1. `std::async`의 **기본 정책은 시스템에 위임**된다. `async | deferred`다.
2. **deferred로 떨어지면** 다음이 일어난다.
   - work가 시작 안 한다 (.get() 전까지).
   - thread_local이 호출자 스레드의 것이다.
   - `wait_for` 폴링이 무한 루프가 된다.
3. **비동기성이 필요하면 `std::launch::async`를 명시**한다.
4. **`reallyAsync` wrapper**로 일관성을 확보한다.
5. lazy 평가가 의도면 `std::launch::deferred`를 명시한다.

## 관련 항목

- [항목 35: task vs thread](/blog/programming/cpp/effective-modern-cpp/item35-prefer-task-based-programming-to-thread-based)
- [항목 37: thread unjoinable](/blog/programming/cpp/effective-modern-cpp/item37-make-std-threads-unjoinable-on-all-paths)
- [항목 38: future destructor](/blog/programming/cpp/effective-modern-cpp/item38-be-aware-of-varying-thread-handle-destructor-behavior)
