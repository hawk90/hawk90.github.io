---
title: "항목 37: 모든 경로에서 std::thread를 unjoinable하게 만들라"
date: 2025-01-10T12:00:00
description: "joinable thread가 소멸되면 std::terminate — RAII wrapper로 안전하게."
tags: [C++, Concurrency, std::thread, RAII, Modern C++]
series: "Effective Modern C++"
seriesOrder: 37
draft: true
---

> **초안** — 정리 진행 중

## 개요

`std::thread` 객체가 **joinable 상태로 소멸**되면 `std::terminate`가 호출됩니다. 예외, 조기 return 등 모든 경로에서 `join` 또는 `detach`를 보장해야 합니다.

## joinable / unjoinable

- **joinable**: 실제 OS 스레드와 연결된 상태
- **unjoinable**: 기본 생성된 thread, move된 후의 원본, `join()` 또는 `detach()` 호출 후

```cpp
{
    std::thread t(work);
    if (somethingFails()) return;   // ← join 안 한 채 소멸 → terminate!
    t.join();
}
```

## 왜 자동 join하지 않나?

표준이 의도적으로 결정. 각 옵션이 모두 위험:

- 자동 **join** → 스레드 끝까지 무한 대기 가능 (성능 함정)
- 자동 **detach** → 소멸된 자원 참조 가능 (UB)

→ 명시적 처리를 강제.

## 해결: RAII Thread Wrapper

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

    ThreadRAII(ThreadRAII&&) = default;
    ThreadRAII& operator=(ThreadRAII&&) = default;

    std::thread& get() { return t; }

private:
    DtorAction  action;
    std::thread t;
};

// 사용
{
    ThreadRAII tr(std::thread(work), ThreadRAII::DtorAction::join);
    // 어떤 경로로든 빠져나가도 join 보장
}
```

## C++20: `std::jthread`

C++20부터는 `std::jthread`가 표준에 포함 — 소멸자가 자동으로 join. RAII wrapper 직접 만들 필요 없어짐.

```cpp
{
    std::jthread t(work);
}   // 자동 join — 안전
```

추가로 cooperative cancellation(`std::stop_token`)도 지원.

## 핵심 정리

1. joinable thread 소멸 = `std::terminate`
2. 모든 경로에서 join 또는 detach 보장 필요
3. C++11/14: RAII wrapper로 보장
4. C++20: `std::jthread` 사용
