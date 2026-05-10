---
title: "항목 35: 스레드 기반보다 태스크 기반 프로그래밍을 선호하라"
date: 2025-01-10T10:00:00
description: "std::async로 만드는 task가 std::thread보다 안전하고 유연한 이유."
tags: [C++, Concurrency, std::async, Modern C++]
series: "Effective Modern C++"
seriesOrder: 35
draft: true
---

> **초안** — 정리 진행 중

## 개요

`std::thread`로 직접 스레드를 만드는 것보다, `std::async`로 **태스크**를 시작하는 게 거의 모든 면에서 우월합니다 — 자원 관리, 결과 받기, 예외 전파 모두.

## thread vs async

```cpp
int compute();

// thread 기반
std::thread t(compute);   // 결과 받기 어려움, 예외 전파 안 됨
t.join();

// task 기반
auto fut = std::async(compute);   // future로 결과·예외 받기 쉬움
int result = fut.get();
```

## task 기반의 이점

### 1. 결과 / 예외 자동 처리

```cpp
auto fut = std::async([]() {
    throw std::runtime_error("error!");
    return 42;
});

try {
    int x = fut.get();   // 예외가 여기서 다시 던져짐
} catch (const std::exception& e) {
    // 처리 가능
}
```

### 2. 자원 고갈 시 안전한 처리

`std::thread`는 시스템 한계(스레드 수)에 도달하면 즉시 예외 (`std::system_error`). `std::async`는 기본 정책으로 **동기 실행**으로 후퇴할 수 있습니다.

### 3. 부하 분산을 런타임에 맡김

`async`는 표준 스케줄러를 통해 워커 풀에서 실행될 수 있음 (구현마다 다름).

## thread를 직접 써야 할 때

- 운영체제 스레드 API에 직접 접근해야 할 때 (priority, affinity)
- 무한 루프 같은 자체 제어 스레드
- 표준 동시성 라이브러리 외부 (custom scheduler)

## 핵심 정리

1. 태스크 기반 = `std::async` + future
2. 결과·예외 전파, 자원 안전, 스케줄러 위임 — 모두 무료
3. `thread`는 OS 수준 제어가 필요할 때만
4. `async`의 launch policy(다음 항목)에 주의
