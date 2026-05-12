---
title: "항목 36: 비동기성이 필수라면 std::launch::async를 명시하라"
date: 2025-01-10T11:00:00
description: "std::async의 기본 정책이 가져오는 미묘한 함정 — deferred로 떨어지면 polling 무한 루프."
tags: [C++, Concurrency, std::async, launch policy, Modern C++]
series: "Effective Modern C++"
seriesOrder: 36
---

## 개요

`std::async`의 기본 launch policy는 `async | deferred` — 시스템이 결정. 이게 종종 동기 실행으로 떨어져 의도와 다른 동작을 일으킵니다 — thread_local 변수, polling, `wait_for` timeout 등.

## 필수 개념: launch policy

> **초보자를 위한 배경 지식**

<br>

### 두 가지 정책

```cpp
std::launch::async      // 새 스레드에서 즉시 실행
std::launch::deferred   // .get() / .wait() 호출 시점까지 지연 (호출 스레드에서 실행)
```

기본값은 두 정책의 OR — `std::launch::async | std::launch::deferred`. 시스템이 자유롭게 선택.

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

→ 사실상 lazy evaluation. 새 스레드 안 만듦.

## 기본 정책의 함정 4가지

기본 `async | deferred`는 시스템이 결정 — 어느 쪽이 될지 모름. 이게 다음 시나리오에서 문제.

### 함정 1 — work가 시작 안 될 수도

```cpp
auto fut = std::async(work);   // 기본 정책
                                // deferred로 결정되면 work는 .get() 전까진 시작도 안 함
```

기대: 백그라운드에서 진행 중. 실제: deferred면 아직 시작 X.

### 함정 2 — thread_local 변수

```cpp
thread_local int x = 0;

auto fut = std::async([] {
    x = 42;   // 어느 스레드의 x?
});
```

- `async`로 결정 → 새 스레드의 x
- `deferred`로 결정 → 호출 스레드의 x (`.get()` 호출 시점)

→ thread_local 변수 의존 코드는 **결정적이지 않음**.

### 함정 3 — polling 무한 루프

```cpp
auto fut = std::async(work);

while (fut.wait_for(100ms) != std::future_status::ready) {
    // 다른 일 ...
}
```

기대: work 끝날 때까지 wait_for 폴링.

실제: deferred면 work가 시작도 안 했으니 **`wait_for`가 절대 ready 안 됨** → **무한 루프**.

이유: `wait_for`는 deferred 태스크에 대해 **타이머 만료 무한** (deferred는 호출 시점에만 실행).

### 함정 4 — 작업 보장 없음

`async`로 결정되리란 보장이 없음 — 시스템 자원 부족 시 deferred로 후퇴.

## 비동기 보장 — 명시

```cpp
auto fut = std::async(std::launch::async, work);
```

이러면:
- ✅ 반드시 새 스레드에서 즉시 실행
- ✅ thread_local은 새 스레드의 것
- ✅ `wait_for` 폴링이 의미 있게 동작
- ⚠️ 시스템 자원 부족 시 `system_error` 예외 (후퇴 X)

## 일반화 헬퍼

매번 정책 적기 귀찮으면 wrapper:

```cpp
template<typename F, typename... Ts>
inline auto reallyAsync(F&& f, Ts&&... params) {
    return std::async(std::launch::async,
                      std::forward<F>(f),
                      std::forward<Ts>(params)...);
}

auto fut = reallyAsync(work);
```

C++14 generic — 모든 호출 가능 객체 OK.

## 명시적 선택 가이드

| 상황 | 정책 |
| --- | --- |
| 백그라운드 진행 필요 | `std::launch::async` |
| polling으로 진행 검사 | `std::launch::async` (deferred는 폴링 무한) |
| thread_local 의존 | 명시 — 어느 스레드인지 결정적 |
| lazy 평가 OK | `std::launch::deferred` |
| 그냥 결과만 필요 (백그라운드 무관) | 기본 정책 |

## deferred의 정당한 활용

- **lazy 계산** — 결과 필요할 때만
- **메모이제이션** — 한 번만 평가, 결과 캐시
- **단순 콜백** — 비동기성 불필요

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

`wait_for(0ms)`는 deferred에 대해 즉시 `deferred` 반환 — 검출 가능.

## 함정 — std::async future의 소멸자

`std::launch::async`로 만든 future가 마지막 참조면, 소멸자가 **block**:

```cpp
{
    auto fut = std::async(std::launch::async, longTask);
}   // ← 여기서 longTask 끝까지 기다림 (block!)
```

자세한 건 [항목 38](/blog/programming/cpp/effective-modern-cpp/item38-be-aware-of-varying-thread-handle-destructor-behavior).

## 핵심 정리

1. `std::async` **기본 정책은 시스템에 위임** — `async | deferred`
2. **deferred로 떨어지면**:
   - work 시작 안 함 (.get() 전까지)
   - thread_local 호출자 스레드의 것
   - `wait_for` 폴링 무한 루프
3. **비동기성 필요 → `std::launch::async` 명시**
4. **`reallyAsync` wrapper**로 일관성
5. lazy 평가 의도면 `std::launch::deferred` 명시

## 관련 항목

- [항목 35: task vs thread](/blog/programming/cpp/effective-modern-cpp/item35-prefer-task-based-programming-to-thread-based)
- [항목 38: future destructor](/blog/programming/cpp/effective-modern-cpp/item38-be-aware-of-varying-thread-handle-destructor-behavior)
