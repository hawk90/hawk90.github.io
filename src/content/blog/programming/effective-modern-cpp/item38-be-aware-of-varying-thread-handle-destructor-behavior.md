---
title: "항목 38: thread handle 소멸자의 동작 차이를 인식하라"
date: 2025-01-10T13:00:00
description: "std::thread vs std::future의 소멸자 동작 비교 — 그리고 future가 block하는 경우."
tags: [C++, Concurrency, std::future, Modern C++]
series: "Effective Modern C++"
seriesOrder: 38
draft: true
---

> **초안** — 정리 진행 중

## 개요

`std::thread`와 `std::future`는 모두 비동기 작업의 핸들이지만 **소멸자 동작이 다릅니다.** 특히 `future`는 특정 조건에서 **block**하므로 주의.

## thread 소멸자 (항목 37 복습)

```cpp
{
    std::thread t(work);
}   // joinable이면 std::terminate
```

명시적 join/detach 강제.

## future 소멸자

대부분의 future는 단순히 자기 상태만 정리하고 끝납니다.

```cpp
{
    std::future<int> fut = ...;
}   // 보통은 그냥 소멸
```

**예외**: `std::async(std::launch::async, ...)`로 만든 future는, **공유 상태(shared state)의 마지막 참조**라면 소멸자가 **block**해서 작업이 끝날 때까지 기다립니다 — 사실상 암묵적 join.

```cpp
{
    auto fut = std::async(std::launch::async, longTask);
}   // ← 여기서 longTask 끝까지 기다림 (block!)
```

## 왜 future만 다른가?

- thread는 OS 스레드와 연결 — 소멸 시 자원 누수 위험이 명확
- future는 보통 가벼운 핸들 — 공유 상태가 다른 곳에 살아있으면 문제없음
- 그러나 `async`로 만든 future가 마지막 핸들이면, 누군가는 작업 결과를 받아야 한다고 가정 → 자동 join

## 실용적 함의

```cpp
{
    std::async(std::launch::async, longTask);
    //  ← 임시 future, 즉시 소멸 → block 발생 (의도와 다를 수 있음)
}
```

위 코드는 비동기로 보이지만 **동기 동작**합니다 — 임시 future가 그 자리에서 소멸하며 작업 완료를 기다림.

## 우회

- `std::launch::deferred`로 만든 future는 block 안 함
- `std::packaged_task`로 직접 future 만들면 동작 다름
- C++20에서는 새로운 동시성 도구(`std::jthread`, `std::latch`) 활용 권장

## 핵심 정리

1. `thread`: joinable 소멸 = terminate
2. `future`: 보통은 단순 소멸
3. `std::async(launch::async)`로 만든 future가 마지막 참조면 → 소멸 시 block
4. 의도치 않은 동기화를 만들기 쉬우니 future 보관 위치 주의
