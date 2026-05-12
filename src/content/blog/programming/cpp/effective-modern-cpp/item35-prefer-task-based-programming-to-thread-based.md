---
title: "항목 35: 스레드 기반보다 태스크 기반 프로그래밍을 선호하라"
date: 2025-01-10T10:00:00
description: "std::async가 std::thread보다 안전·유연 — 결과 받기, 예외 전파, 자원 관리."
tags: [C++, Concurrency, std::async, std::thread, Modern C++]
series: "Effective Modern C++"
seriesOrder: 35
---

## 개요

`std::thread`로 직접 스레드를 만드는 것보다, `std::async`로 **태스크**를 시작하는 게 거의 모든 면에서 우월 — **자원 관리**, **결과 받기**, **예외 전파** 모두.

## 필수 개념: thread vs task

> **초보자를 위한 배경 지식**

<br>

### thread 기반 — `std::thread`

```cpp
#include <thread>

void compute();

std::thread t(compute);
t.join();   // 또는 t.detach()
```

OS 스레드와 직접 매핑. 결과 받기 어렵고, 예외 처리 별도 메커니즘 필요.

### task 기반 — `std::async`

```cpp
#include <future>

int compute();

auto fut = std::async(compute);   // future 반환
int result = fut.get();           // 결과 (또는 예외)
```

태스크를 시작하고 future로 결과·예외 회수. **추상화 한 단계 위**.

## 비교 — 핵심 이점

### 1. 결과 / 예외 자동 처리

`std::thread`는 결과 반환 메커니즘 없음:

```cpp
int result;
std::thread t([&] { result = compute(); });   // shared variable + 동기화
t.join();
// result 사용 — race condition 위험
```

`std::async`는 future:

```cpp
auto fut = std::async(compute);
int result = fut.get();   // 동기화·반환 자동
```

예외도 future 통해 전파:

```cpp
auto fut = std::async([]() {
    throw std::runtime_error("error!");
    return 42;
});

try {
    int x = fut.get();   // 예외가 여기서 다시 던져짐
} catch (const std::exception& e) {
    std::cerr << e.what();
}
```

`std::thread`는 예외가 잡히지 않으면 → `std::terminate`. async는 future에 보관해 사용자에게 전달.

### 2. 자원 고갈 시 안전한 처리

`std::thread`는 시스템 한계(스레드 수)에 도달하면 즉시 예외 (`std::system_error`).

`std::async`는 기본 정책으로 **동기 실행**으로 후퇴할 수 있음 — 새 스레드 못 만들면 호출자 스레드에서 실행.

→ 시스템 자원에 더 적응적.

### 3. 부하 분산을 런타임에 맡김

`async`는 표준 스케줄러를 통해 워커 풀에서 실행될 수 있음 (구현마다 다름).

→ 매번 새 OS 스레드 생성보다 효율적 (구현에 따라).

### 4. 약속된 추상화 — 변화에 적응

표준 라이브러리·언어가 진화하면 `async`는 그 이점 자동 흡수. 직접 thread 다루면 옛 패턴에 묶임.

## thread를 직접 써야 할 때

- **운영체제 스레드 API에 직접 접근** 필요 (priority, affinity)
- **무한 루프 같은 자체 제어 스레드** (백그라운드 워커)
- 표준 동시성 라이브러리 외부 (custom scheduler)
- 스레드의 **수명을 명시적으로 제어**해야 할 때

```cpp
std::thread t([] {
    while (running) { /* event loop */ }
});

#ifdef __linux__
auto handle = t.native_handle();
pthread_setname_np(handle, "worker");
// CPU affinity 설정 등
#endif

t.detach();   // 무한 워커
```

## ⚠️ thread의 위험 — joinable

```cpp
{
    std::thread t(compute);
    // join 또는 detach 안 하고 t 소멸 → std::terminate
}
```

자세한 건 [항목 37](/blog/programming/cpp/effective-modern-cpp/item37-make-std-threads-unjoinable-on-all-paths). C++20 `std::jthread`가 자동 join.

## std::async의 launch policy

```cpp
auto fut = std::async(compute);   // 기본 정책 — 시스템에 위임
auto fut2 = std::async(std::launch::async, compute);   // 명시 비동기
auto fut3 = std::async(std::launch::deferred, compute); // 지연 (sync)
```

기본은 `async | deferred` — 실용적 함정 있음 ([항목 36](/blog/programming/cpp/effective-modern-cpp/item36-specify-launch-async-if-asynchronicity-is-essential)).

## 비교 표

| 측면 | `std::thread` | `std::async` |
| --- | --- | --- |
| 결과 회수 | 수동 (shared var) | future로 자동 |
| 예외 전파 | 별도 메커니즘 | future로 자동 |
| 자원 부족 시 | system_error 즉시 | 동기 실행 후퇴 가능 |
| OS 제어 | ✅ native_handle | ❌ 추상화 |
| 수명 관리 | 수동 (join/detach) | future로 자동 |
| 학습 곡선 | 높음 | 낮음 |

## 패턴 — task가 적합

```cpp
auto fut = std::async([] {
    return computeExpensiveValue();
});

// 다른 작업
doOther();

// 결과 필요할 때
auto val = fut.get();
```

**개념적으로 단순** — "이거 비동기로 해주고 결과 알려줘".

## 패턴 — thread가 적합

```cpp
std::thread worker([] {
    while (!shutdown) {
        processQueue();
    }
});

// shutdown 시
shutdown = true;
worker.join();
```

수명을 명시적으로 제어하는 long-running 워커.

## std::async + std::shared_future

future는 한 번만 `get()` 가능. `shared_future`는 여러 번 / 여러 스레드:

```cpp
std::shared_future<int> sf = std::async(compute).share();

std::thread t1([sf] { auto v = sf.get(); /* 사용 */ });
std::thread t2([sf] { auto v = sf.get(); /* 사용 */ });
```

## 핵심 정리

1. **태스크 기반 = `std::async` + future**
2. **결과·예외 전파, 자원 안전, 스케줄러 위임** — 모두 무료
3. `thread`는 **OS 수준 제어 / 무한 워커**가 필요할 때만
4. **`async`의 launch policy** 함정에 주의 ([항목 36](/blog/programming/cpp/effective-modern-cpp/item36-specify-launch-async-if-asynchronicity-is-essential))
5. C++20 `std::jthread` — thread + 자동 join + cancellation

## 관련 항목

- [항목 36: launch policy](/blog/programming/cpp/effective-modern-cpp/item36-specify-launch-async-if-asynchronicity-is-essential)
- [항목 37: jthread / unjoinable](/blog/programming/cpp/effective-modern-cpp/item37-make-std-threads-unjoinable-on-all-paths)
- [항목 38: future destructor](/blog/programming/cpp/effective-modern-cpp/item38-be-aware-of-varying-thread-handle-destructor-behavior)
