---
title: "항목 39: 일회성 이벤트 통신에는 void future를 고려하라"
date: 2025-01-10T14:00:00
description: "condition_variable, atomic flag, void future — 일회성 통보의 세 가지 선택."
tags: [C++, Concurrency, std::future, std::condition_variable, Modern C++]
series: "Effective Modern C++"
seriesOrder: 39
draft: true
---

> **초안** — 정리 진행 중

## 개요

"한 스레드가 다른 스레드에게 한 번만 신호를 보낸다"는 흔한 패턴. 표준 도구는 세 가지 — 각각 트레이드오프가 있습니다.

## 옵션 1: `std::condition_variable`

가장 전통적이지만 함정 많음.

```cpp
std::condition_variable cv;
std::mutex              m;
bool                    flag = false;

// 통보 측
{
    std::lock_guard<std::mutex> g(m);
    flag = true;
}
cv.notify_one();

// 대기 측
{
    std::unique_lock<std::mutex> l(m);
    cv.wait(l, [] { return flag; });
}
```

**단점**: spurious wakeup 처리 필요, mutex+flag 보일러플레이트, 통보가 대기보다 먼저 오면 놓침.

## 옵션 2: `std::atomic<bool>` + busy-wait

```cpp
std::atomic<bool> flag{false};

// 통보 측
flag = true;

// 대기 측
while (!flag) { /* spin */ }
```

**장점**: 단순, mutex 불필요
**단점**: CPU를 계속 태움 (busy-wait)

## 옵션 3: `std::promise<void>` + `std::future<void>`

```cpp
std::promise<void> p;
auto fut = p.get_future();

// 통보 측
p.set_value();

// 대기 측
fut.wait();   // 값 자체는 의미 없음 — "set_value 호출됨" 신호만
```

**장점**:
- 보일러플레이트 없음
- 통보가 먼저 와도 OK (future가 상태 보존)
- block 가능 (CPU 안 태움)

**단점**:
- **단 한 번만** 통보 가능 (promise는 한 번만 set)
- 내부에 힙 할당 (작업 비용)
- 다수 대기자에 통보하려면 `shared_future` 필요

## 다수 대기자

```cpp
std::promise<void> p;
auto sf = p.get_future().share();   // shared_future

// 여러 스레드가 sf 복사본을 보유
for (auto& t : workers) {
    t = std::thread([sf] { sf.wait(); /* ... */ });
}

// 한 번에 모두 깨움
p.set_value();
```

## 선택 기준

| 상황 | 권장 |
| --- | --- |
| 반복 통보 | `condition_variable` (또는 C++20 `latch`/`barrier`) |
| 단발 통보, 단순 | `atomic<bool>` busy-wait (짧은 대기) |
| 단발 통보, block 원함 | `promise<void>` + `future<void>` |
| 단발 통보, 다수 대기자 | `promise<void>` + `shared_future<void>` |

## 핵심 정리

1. 일회성 통보엔 `void future` 패턴이 깔끔
2. `condition_variable`은 반복 통보에 적합
3. `atomic` busy-wait은 매우 짧은 대기에만
4. 다수 대기자는 `shared_future`로 일괄 통보
