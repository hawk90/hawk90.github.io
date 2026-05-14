---
title: "항목 39: 일회성 이벤트 통신에는 void future를 고려하라"
date: 2025-01-06T15:00:00
description: "condition_variable·atomic·void future — 일회성 통보의 세 옵션 비교."
tags: [C++, Concurrency, std::future, std::condition_variable, Modern C++]
series: "Effective Modern C++"
seriesOrder: 39
draft: true
---

## 왜 이 항목이 중요한가?

"한 스레드가 다른 스레드에게 한 번만 신호를 보낸다." 흔한 패턴이다. 초기화 완료 신호, 시작 신호, 셧다운 신호 등이다.

표준 도구는 세 가지가 있다.

- **`std::condition_variable`** — 가장 전통적이지만 mutex + flag + predicate 보일러플레이트가 따라온다.
- **`std::atomic<bool>` + busy-wait** — 매우 단순하고 빠르지만 CPU를 태운다.
- **`std::promise<void>` + `std::future<void>`** — 깔끔하고 block 가능. 단 일회성에 한정된다.

이 항목은 세 옵션의 트레이드오프와 C++20에서 등장한 더 좋은 도구(`std::latch`, `std::barrier`)를 정리한다.

## 개요

"한 스레드가 다른 스레드에게 한 번만 신호를 보낸다"는 흔한 패턴이다. 표준 도구는 세 가지가 있고, 각 트레이드오프가 다르다.

## 필수 개념: 일회성 통보 패턴

> **초보자를 위한 배경 지식**

<br>

흔한 시나리오는 이렇다.

- "초기화 끝났어" — 메인이 워커에게.
- "데이터 준비됐어" — 생산자가 소비자에게.
- "셧다운 시작" — 일회성 종료 신호.

**한 번만** 발생하는 이벤트다. 반복적인 producer-consumer가 아니다.

## 옵션 1 — `std::condition_variable`

가장 전통적이고 일반적이지만 함정이 많다.

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

**단점**

- spurious wakeup 처리가 필요하다 (predicate 형태).
- mutex+flag 보일러플레이트가 있다.
- 통보가 대기보다 먼저 오면 **놓친다**. 그래서 flag가 필요하다.
- `notify_one()` 호출 시 대기 중인 스레드가 없으면 사라진다.

일회성엔 좀 무겁다.

## 옵션 2 — `std::atomic<bool>` + busy-wait

```cpp
std::atomic<bool> flag{false};

// 통보 측
flag = true;

// 대기 측
while (!flag) { /* spin */ }
```

**장점**: 단순하다. mutex가 불필요하다. 매우 빠르다 (짧은 대기).

**단점**

- CPU를 계속 태운다 (busy-wait).
- 긴 대기엔 부적합하다.

**마이크로초 대기**에만 사용한다.

## 옵션 3 — `std::promise<void>` + `std::future<void>`

`void` future = "값 없이 신호만"이다.

```cpp
std::promise<void> p;
auto fut = p.get_future();

// 통보 측
p.set_value();   // 값 자체는 의미 X — 신호만

// 대기 측
fut.wait();   // block until set_value 호출
```

**장점**

- 보일러플레이트가 거의 없다.
- 통보가 먼저 와도 OK다 (future가 상태 보존).
- block이 가능하다 (CPU를 안 태운다).
- 예외 전달이 가능하다 (`set_exception`).

**단점**

- **단 한 번만** 통보가 가능하다 (promise는 한 번만 set).
- 내부에 힙 할당이 있다 (작은 비용).
- 다수 대기자에 통보하려면 `shared_future`가 필요하다.

## 다수 대기자 — `shared_future`

```cpp
std::promise<void> p;
auto sf = p.get_future().share();   // shared_future

std::vector<std::thread> workers;
for (int i = 0; i < N; ++i) {
    workers.emplace_back([sf] {
        sf.wait();   // 모든 worker가 같은 신호 대기
        // ... 시작
    });
}

p.set_value();   // 한 번에 모두 깨움

for (auto& t : workers) t.join();
```

**broadcast 효과**다. `notify_all`과 비슷하지만 더 깔끔하다.

## 비교 — 한눈에

| | condition_variable | atomic busy-wait | void future |
| --- | --- | --- | --- |
| 단순성 | ⚠️ mutex+flag+predicate | ✅ 매우 | ✅ |
| 늦은 대기 OK | ⚠️ flag 필요 | ✅ | ✅ |
| 다수 대기자 | ✅ `notify_all` | ❌ 모든 스레드 spin | ✅ `shared_future` |
| 반복 통보 | ✅ | ⚠️ flag 리셋 | ❌ — 한 번만 |
| CPU 사용 (대기) | ✅ block | ❌ spin | ✅ block |
| 짧은 대기 (μs) | ⚠️ 컨텍스트 스위치 | ✅ 빠름 | ⚠️ |
| 예외 전파 | ❌ | ❌ | ✅ |

## 선택 기준

| 상황 | 권장 |
| --- | --- |
| **반복 통보** | `condition_variable` (또는 C++20 `latch`/`barrier`) |
| **단발 통보, 단순** | `atomic<bool>` busy-wait (짧은 대기만) |
| **단발 통보, block 원함** | `promise<void>` + `future<void>` |
| **단발 통보, 다수 대기자** | `promise<void>` + `shared_future<void>` |

## C++20 — 더 좋은 도구들

### `std::latch` — count-down 신호

```cpp
std::latch start{1};   // count 1

std::vector<std::thread> workers;
for (int i = 0; i < N; ++i) {
    workers.emplace_back([&] {
        start.wait();   // count 0 될 때까지
        // ... 시작
    });
}

start.count_down();   // 모든 worker 깨움
```

void future + shared_future보다 깔끔하다. count > 1로 N번 통보가 가능하다.

### `std::barrier` — 반복 사이클

매 사이클마다 모든 스레드를 동기화한다.

### `std::counting_semaphore`

전통 semaphore다. 권한 N개를 관리한다.

**C++20 이상이면 latch/barrier를 권장**한다.

## 함정 — promise는 한 번만

```cpp
std::promise<void> p;
p.set_value();
p.set_value();   // ⚠️ std::future_error 예외!
```

같은 promise에 두 번 set은 X다. 한 번 신호용이다.

## 함정 — promise·future 수명

```cpp
{
    std::promise<void> p;
    auto fut = p.get_future();
}   // p 소멸 — 그러나 set 안 했으면 fut.get()이 future_error

// 또는
std::promise<void> p;
auto fut = p.get_future();
// p 어디 사라짐 (move 또는 소멸)
fut.wait();   // 영원히 대기 (또는 broken_promise)
```

**promise 수명 관리에 신중**해야 한다. 보통 main에서 보관한다.

## 핵심 정리

1. **일회성 통보**엔 **`void future` 패턴**이 깔끔하다.
2. **`condition_variable`** 은 반복 통보·전통적이다.
3. **`atomic` busy-wait**는 매우 짧은 대기에만 쓴다.
4. **다수 대기자**는 `shared_future`로 일괄 통보한다.
5. **C++20 `latch`/`barrier`** 가 더 좋다. 사용 가능하면 우선 쓴다.

## 관련 항목

- [항목 35: task vs thread](/blog/programming/cpp/effective-modern-cpp/item35-prefer-task-based-programming-to-thread-based)
- [항목 38: future destructor](/blog/programming/cpp/effective-modern-cpp/item38-be-aware-of-varying-thread-handle-destructor-behavior)
- [항목 40: atomic vs volatile](/blog/programming/cpp/effective-modern-cpp/item40-use-std-atomic-for-concurrency-volatile-for-special-memory)
