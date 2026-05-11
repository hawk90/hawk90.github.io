---
title: "항목 38: thread handle 소멸자의 동작 차이를 인식하라"
date: 2025-01-10T13:00:00
description: "std::thread vs std::future 소멸자 동작 비교 — async future가 block하는 경우."
tags: [C++, Concurrency, std::future, std::thread, Modern C++]
series: "Effective Modern C++"
seriesOrder: 38
---

## 개요

`std::thread`와 `std::future`는 모두 비동기 작업의 핸들이지만 **소멸자 동작이 다릅니다**. 특히 `future`는 특정 조건에서 **block** — 의도치 않은 동기화.

## 필수 개념: 두 핸들의 차이

> **초보자를 위한 배경 지식**

<br>

| | `std::thread` | `std::future` |
| --- | --- | --- |
| 표현 | OS 스레드 자체 | 비동기 작업의 결과 회수기 |
| 결과 | ❌ | ✅ (`get()`) |
| 예외 전파 | ❌ | ✅ |
| 소멸자 | joinable면 terminate | (다음에 자세히) |

## thread 소멸자 ([항목 37 복습](/blog/programming/effective-modern-cpp/item37-make-std-threads-unjoinable-on-all-paths))

```cpp
{
    std::thread t(work);
}   // joinable이면 std::terminate
```

→ 명시적 join/detach 강제.

## future 소멸자 — 보통은 단순

대부분의 future는 단순히 자기 상태만 정리.

```cpp
{
    std::future<int> fut = ...;
}   // 보통은 그냥 소멸 — 작업에 영향 X
```

## ⚠️ 예외 — `std::async(std::launch::async, ...)`로 만든 future

`std::launch::async`로 만든 future가 **공유 상태(shared state)의 마지막 참조**라면, 소멸자가 **block**해서 작업이 끝날 때까지 기다림 — 사실상 **암묵적 join**.

```cpp
{
    auto fut = std::async(std::launch::async, longTask);
}   // ← 여기서 longTask 끝까지 기다림 (block!)
```

기대: future 소멸 = 단순 정리. 실제: 5초 task면 5초 block.

### 더 위험 — 임시 future

```cpp
{
    std::async(std::launch::async, longTask);
    //  ↑ 임시 future, 즉시 소멸 → block 발생
}
```

위 코드는 **비동기로 보이지만 동기 동작**합니다. 임시 future가 그 자리에서 소멸하며 작업 완료를 기다림.

## 왜 future만 다른가?

표준 위원회의 결정:

- **thread**는 OS 스레드와 연결 — 소멸 시 자원 누수 위험이 명확 → terminate로 강제
- **future**는 보통 가벼운 핸들 — 공유 상태가 다른 곳에 살아있으면 문제없음
- 그러나 **`async`로 만든 future가 마지막 핸들**이면, 누군가는 작업 결과를 받아야 한다고 가정 → 자동 join (block)

→ 이게 안 되면 `async`로 시작한 작업이 "어디로도 안 가는" 좀비가 됨.

## 정확한 규칙

future 소멸자가 block하는 조건:
1. **공유 상태에 대한 마지막 참조**
2. **공유 상태가 비-deferred 작업에서 옴** (`std::launch::async`로 시작)
3. **작업이 아직 실행 중**

위 3가지 모두 만족 시 — block.

그 외엔 단순 소멸.

## 다른 future 종류는 block 안 함

### `std::launch::deferred`로 만든 future

```cpp
{
    auto fut = std::async(std::launch::deferred, work);
}   // block X — work는 시작도 안 함
```

deferred 작업은 호출 안 되면 그냥 사라짐 (또는 future 소멸 시 정리).

### `std::packaged_task`로 만든 future

```cpp
std::packaged_task<int()> task(work);
auto fut = task.get_future();
std::thread t(std::move(task));
t.join();
{
    auto local_fut = std::move(fut);
}   // block X — packaged_task는 다름
```

packaged_task는 thread를 명시 관리 → future는 단순 결과 채널.

### `std::promise`로 만든 future

```cpp
std::promise<int> p;
auto fut = p.get_future();
{
    auto local_fut = std::move(fut);
}   // block X
```

마찬가지.

## 함의 — 의도치 않은 동기화

```cpp
void process() {
    std::async(std::launch::async, longTask);   // 의도: 비동기
    std::async(std::launch::async, anotherTask);
    // 두 번째 async도 첫 번째 임시 future가 block 끝나야 시작?
    
    // 사실: 첫 번째 async의 임시 future가 ; 에서 소멸하며 block
    //      → longTask 끝나야 두 번째 async 시작
}
```

→ **의도와 정반대** — 순차 실행이 됨.

해결 — 명시 변수:

```cpp
void process() {
    auto f1 = std::async(std::launch::async, longTask);
    auto f2 = std::async(std::launch::async, anotherTask);
    // 두 작업 병렬 시작
    // 함수 끝에서 f2, f1 순으로 소멸 — 모두 block (그러나 병렬 진행 후)
}
```

## 우회

### 1. future 보관

```cpp
std::vector<std::future<void>> futures;
futures.push_back(std::async(std::launch::async, longTask));
// 컨테이너 수명까지 future 생존 — 명시적 관리
```

### 2. detach-like 의도 — `std::thread::detach`

```cpp
std::thread(longTask).detach();   // 진짜 fire-and-forget
                                   // (그러나 자원·캡처 댕글링 위험)
```

### 3. 진짜 처리 패턴

```cpp
auto fut = std::async(std::launch::async, longTask);
// ... 다른 일
fut.wait();   // 또는 fut.get()
              // 명시적 동기화
```

## 표 — handle 소멸자 동작

| Handle | 소멸자 동작 |
| --- | --- |
| `std::thread` (joinable) | `std::terminate` |
| `std::thread` (unjoinable) | 단순 소멸 |
| `std::future` (보통) | 단순 소멸 |
| `std::future` (`std::launch::async` + 마지막 참조 + 진행 중) | **block** until 완료 |
| `std::shared_future` | 마지막 인스턴스가 위 조건이면 block |
| `std::packaged_task` | 단순 소멸 (작업은 별도 스레드) |

## 모던 C++의 약점

`std::future`의 소멸자 동작은 표준 위원회에서도 논쟁의 여지. 일부는 "잘못된 설계" 비판. C++ 표준의 future는 다른 언어의 future·promise보다 기능이 적음.

→ 라이브러리 (`Boost.Future`, Folly `Future`, HPX `future`)가 더 풍부 — `then` 콜백, when_all 등.

C++20에 `std::jthread` 추가됐지만 future 자체는 큰 변화 없음.

## 핵심 정리

1. **`thread` (joinable) 소멸 = terminate**
2. **`future` 소멸은 보통 단순**
3. **`std::async(std::launch::async)` future가 마지막 참조 + 진행 중이면 → block** (암묵 join)
4. **임시 future 함정** — 의도치 않은 동기화
5. 명시 future 변수로 보관 또는 wait/get 명시
6. C++ 표준 future는 기능이 제한적 — 라이브러리 활용 검토

## 관련 항목

- [항목 35: task vs thread](/blog/programming/effective-modern-cpp/item35-prefer-task-based-programming-to-thread-based)
- [항목 36: launch policy](/blog/programming/effective-modern-cpp/item36-specify-launch-async-if-asynchronicity-is-essential)
- [항목 37: jthread](/blog/programming/effective-modern-cpp/item37-make-std-threads-unjoinable-on-all-paths)
- [항목 39: void future](/blog/programming/effective-modern-cpp/item39-consider-void-futures-for-one-shot-event-communication)
