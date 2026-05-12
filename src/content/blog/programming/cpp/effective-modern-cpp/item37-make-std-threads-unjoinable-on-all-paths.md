---
title: "항목 37: 모든 경로에서 std::thread를 unjoinable하게 만들라"
date: 2025-01-10T12:00:00
description: "joinable thread 소멸 = std::terminate. RAII wrapper / C++20 std::jthread로 해결."
tags: [C++, Concurrency, std::thread, RAII, jthread, Modern C++]
series: "Effective Modern C++"
seriesOrder: 37
---

## 개요

`std::thread` 객체가 **joinable 상태로 소멸**되면 `std::terminate`가 호출됨. 예외, 조기 return 등 모든 경로에서 `join` 또는 `detach`를 보장해야.

## 필수 개념: joinable / unjoinable

> **초보자를 위한 배경 지식**

<br>

### thread의 두 상태

| 상태 | 의미 |
| --- | --- |
| **joinable** | 실제 OS 스레드와 연결, join() 또는 detach() 호출 안 됨 |
| **unjoinable** | OS 스레드와 연결 안 됨 |

unjoinable 케이스:
- 기본 생성된 thread (`std::thread t;`)
- move된 후의 원본
- `join()` 또는 `detach()` 호출 후

```cpp
std::thread t1;                   // unjoinable (기본 생성)
std::thread t2(work);             // joinable
std::thread t3 = std::move(t2);   // t2는 unjoinable, t3 joinable
t3.join();                         // 이후 t3 unjoinable
```

### joinable 소멸 = terminate

```cpp
{
    std::thread t(work);
    if (somethingFails()) return;   // ← join 안 한 채 소멸 → std::terminate!
    t.join();
}
```

→ **모든 경로에서** join 또는 detach 보장 필요.

## 왜 자동 join하지 않나?

표준이 의도적으로 결정. 각 옵션 모두 위험:

| 옵션 | 위험 |
| --- | --- |
| 자동 **join** | 스레드 끝까지 무한 대기 가능 (성능 함정, 명시 안 한 deadlock 가능) |
| 자동 **detach** | 소멸된 자원 참조 가능 (UB) |
| 자동 **terminate** | 명시적 처리 강제 (현재 표준 선택) |

→ 명시적 처리를 강제 — terminate는 사용자가 무시 못 하게.

## 해결 — RAII Thread Wrapper

```cpp
class ThreadRAII {
public:
    enum class DtorAction { join, detach };

    ThreadRAII(std::thread&& t, DtorAction a)
        : action(a), t(std::move(t)) {}

    ~ThreadRAII() {
        if (t.joinable()) {
            if (action == DtorAction::join) t.join();
            else                            t.detach();
        }
    }

    // move only
    ThreadRAII(ThreadRAII&&) = default;
    ThreadRAII& operator=(ThreadRAII&&) = default;

    std::thread& get() { return t; }

private:
    DtorAction  action;
    std::thread t;   // ◄── thread를 마지막에 (소멸 순서)
};
```

> ⚠️ **`std::thread` 멤버를 마지막에** — C++ 멤버 소멸 순서는 **선언 역순**. thread가 가장 먼저 만들어지면 마지막에 소멸 → 다른 멤버가 먼저 사라져 race 위험.

```cpp
{
    ThreadRAII tr(std::thread(work), ThreadRAII::DtorAction::join);
    // 어떤 경로로든 빠져나가도 join 보장
}
```

## C++20: `std::jthread`

C++20부터 `std::jthread`가 표준 — **소멸자가 자동으로 join**.

```cpp
{
    std::jthread t(work);
    // 자동 join — 안전
}
```

추가로 cooperative cancellation:

```cpp
std::jthread t([](std::stop_token st) {
    while (!st.stop_requested()) {
        // 작업
    }
});

t.request_stop();   // cancellation 요청
// 소멸자가 stop_requested + join
```

→ **C++20 이상이면 jthread 사용**.

## 정책 — join vs detach

### join 권장

- 스레드 결과·완료가 의미 있을 때
- 자원 정리가 필요할 때
- 일반적인 워커 스레드

### detach 권장

- "fire-and-forget" 백그라운드 작업
- 데몬 스레드
- 완전히 독립적인 작업

> ⚠️ **detach는 위험** — 스레드가 자기 코드의 자원(스택의 캡처 등)을 참조하면 댕글링.

```cpp
{
    int x = 42;
    std::thread t([&] { use(x); });   // x 참조 캡처
    t.detach();
    // x 소멸 → t의 람다는 댕글링!
}
```

→ **join이 안전**. detach는 매우 신중히.

## 흐름 제어 패턴

### 패턴 1 — RAII (RAII)

```cpp
{
    ThreadRAII t(std::thread(work), ThreadRAII::DtorAction::join);
    // 자동 정리
}
```

### 패턴 2 — try/finally 류

C++엔 try/finally 없으니 RAII가 표준.

### 패턴 3 — `std::async` (가장 권장)

```cpp
auto fut = std::async(std::launch::async, work);
// future 소멸자가 자동 처리 ([항목 38])
```

`std::async`가 보통 더 간단 + 안전.

## C++20 `std::jthread` 추가 기능

```cpp
#include <thread>
#include <stop_token>

void worker(std::stop_token st, int data) {
    while (!st.stop_requested()) {
        process(data);
    }
}

{
    std::jthread t(worker, 42);
    // ... 다른 일
    // 소멸 시: request_stop() 호출 + join
}
```

→ 우아한 cancellation + 자동 join. **모던 C++ 권장**.

## 함정 — thread 소유권

`std::thread`는 move-only. copy 불가.

```cpp
std::thread t1(work);
std::thread t2 = t1;            // 에러
std::thread t3 = std::move(t1); // OK
```

→ 함수 매개변수·반환에 신중.

## 비교 — 한눈에

| | `std::thread` (raw) | `ThreadRAII` | `std::async` | `std::jthread` (C++20) |
| --- | --- | --- | --- | --- |
| 자동 join/detach | ❌ | ✅ | ✅ (future) | ✅ |
| 결과 회수 | ❌ | ❌ | ✅ | ❌ |
| Cancellation | ❌ | ❌ | ❌ | ✅ |
| 권장 | C++17 이전 + 명시 관리 | C++17 이전 + 결과 X | 결과 필요 | C++20+ |

## 핵심 정리

1. **joinable thread 소멸 = `std::terminate`**
2. **모든 경로에서 join 또는 detach 보장**
3. **C++17 이전: RAII wrapper** — 멤버 선언 순서 주의 (thread 마지막)
4. **C++20+ `std::jthread`** — 자동 join + cancellation
5. 보통 **`std::async`가 더 안전** — future가 관리

## 관련 항목

- [항목 35: task vs thread](/blog/programming/cpp/effective-modern-cpp/item35-prefer-task-based-programming-to-thread-based)
- [항목 38: future 소멸자](/blog/programming/cpp/effective-modern-cpp/item38-be-aware-of-varying-thread-handle-destructor-behavior)
