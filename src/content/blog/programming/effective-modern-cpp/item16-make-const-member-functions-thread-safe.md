---
title: "항목 16: const 멤버 함수는 스레드 안전하게 만들라"
date: 2025-01-06T19:00:00
description: "캐싱·mutable 상태가 있는 const 멤버 함수에서 데이터 경쟁 — mutex/atomic으로 보호."
tags: [C++, const, Thread Safety, Modern C++]
series: "Effective Modern C++"
seriesOrder: 16
---

## 개요

C++에서 `const` 멤버 함수는 "관찰자(observer)" 역할 — 사용자는 멀티스레드에서 자유롭게 호출할 수 있다고 가정. 그러나 내부에 **캐싱**이나 **`mutable` 상태**가 있으면 동기화 없이는 **데이터 경쟁(data race)** — UB.

## 필수 개념: const와 mutable, 그리고 동시성

> **초보자를 위한 배경 지식**

<br>

### const 멤버 함수의 약속

```cpp
class Widget {
public:
    int value() const { return val; }   // const — 객체 상태 변경 X
private:
    int val;
};
```

`const` 멤버는 **객체의 논리적 상태**를 변경 안 함 — 사용자에게 보이는 면에서.

### mutable — const에서도 변경 허용

```cpp
class Cache {
    mutable bool cacheValid = false;
    mutable int  cacheValue;
public:
    int get() const {
        if (!cacheValid) {
            cacheValue = compute();    // mutable이라 const에서도 OK
            cacheValid = true;
        }
        return cacheValue;
    }
};
```

→ "내부 캐시는 객체의 본질적 상태가 아니다" — mutable로 표현.

### 사용자의 가정

C++ 커뮤니티 관행: **`const` 멤버 함수는 thread-safe**가 default. 사용자는 멀티스레드에서 자유롭게 호출 가능하다고 가정.

→ const 멤버에 mutable이 있으면 **동시성 처리 책임이 작성자에게**.

## 함정 예제 — 데이터 경쟁

```cpp
class Polynomial {
    mutable std::vector<double> rootsCache;
    mutable bool                cacheValid = false;

public:
    using RootsType = std::vector<double>;

    RootsType roots() const {
        if (!cacheValid) {
            rootsCache = computeRoots();   // ◄── 변경
            cacheValid = true;             // ◄── 변경
        }
        return rootsCache;
    }
};
```

`roots()`는 const지만 내부 상태 변경. **두 스레드가 동시 호출**하면:

```
Thread 1: cacheValid 검사 → false
Thread 2: cacheValid 검사 → false
Thread 1: rootsCache 쓰기 시작
Thread 2: rootsCache 쓰기 시작 — 데이터 경쟁! UB
```

→ **단일 스레드만 안전**.

## 해결 1 — `std::mutex`

가장 일반적·안전.

```cpp
class Polynomial {
    mutable std::mutex          m;
    mutable std::vector<double> rootsCache;
    mutable bool                cacheValid = false;

public:
    RootsType roots() const {
        std::lock_guard<std::mutex> g(m);   // 락
        if (!cacheValid) {
            rootsCache = computeRoots();
            cacheValid = true;
        }
        return rootsCache;
    }
};
```

`mutex`는 `mutable` (const 메서드에서 사용해야).

### ⚠️ 부작용 — `mutex`는 복사·이동 불가

`std::mutex`는 copy/move ctor 없음 → `Polynomial`이 자동으로 **비복사·비이동** 클래스가 됨.

```cpp
Polynomial p1, p2;
p1 = p2;   // 에러 — copy assignment 자동 생성 안 됨
```

객체 자체가 복사 가능해야 한다면 다른 방법 (참조 카운트된 mutex pointer 등 — 복잡).

## 해결 2 — `std::atomic` (단일 변수만 보호하면)

```cpp
class Counter {
    mutable std::atomic<unsigned> callCount{0};
public:
    int compute() const {
        ++callCount;   // atomic
        return /* ... */;
    }
};
```

`mutex`보다 가벼움 — 단일 atomic 연산이면.

`std::atomic`도 복사·이동 불가 → 같은 부작용.

## ⚠️ 함정 — atomic 여러 개로 합성 연산

```cpp
class Polynomial {
    mutable std::atomic<bool>   valid{false};
    mutable std::vector<double> cache;   // ◄── atomic 아님!

    auto roots() const {
        if (!valid) {
            cache = compute();   // ⚠️ 데이터 경쟁 — cache는 atomic 아님
            valid = true;
        }
        return cache;
    }
};
```

`valid`만 atomic이면 두 스레드 동시 호출 시 — **`cache` 쓰기가 race**. 위 예 깨짐.

→ **여러 변수 보호엔 mutex**, **단일 변수면 atomic**.

## 표준의 atomic 패턴 — DCLP 변형

```cpp
class Polynomial {
    mutable std::atomic<bool>   valid{false};
    mutable std::mutex          m;
    mutable std::vector<double> cache;

    auto roots() const {
        if (!valid.load(std::memory_order_acquire)) {
            std::lock_guard g(m);
            if (!valid.load(std::memory_order_relaxed)) {
                cache = compute();
                valid.store(true, std::memory_order_release);
            }
        }
        return cache;
    }
};
```

DCLP(Double-Checked Locking Pattern) — 빠른 path는 atomic 검사, 느린 path만 mutex. 정확한 메모리 순서가 중요.

복잡 — 보통 단순 `std::mutex` 권장.

## 단일 스레드 사용 명시

내부에서 절대 멀티스레드 사용 안 됨이라면 동기화 비용 회피 가능 — 그러나 **인터페이스에 명시 필수**.

```cpp
class Polynomial {
    // ...
public:
    /**
     * @warning Not thread-safe.
     * Caller must ensure single-thread access.
     */
    auto roots() const { /* ... */ }
};
```

사용자가 const 멤버를 thread-safe로 가정하므로, **다르다면 명시**.

## thread_local 활용 — 스레드별 캐시

각 스레드가 자기 캐시:

```cpp
class Polynomial {
public:
    auto roots() const {
        thread_local std::vector<double> cache;
        thread_local bool                valid = false;
        if (!valid) {
            cache = compute();
            valid = true;
        }
        return cache;
    }
};
```

데이터 경쟁 없음 (스레드별 분리). 스레드 수 만큼 메모리 사용 — 트레이드오프.

## 인터페이스 결정

| 패턴 | 구현 |
| --- | --- |
| **thread-safe + 객체 복사 가능 가정 X** | mutex (보통) |
| **thread-safe + 단일 변수** | atomic |
| **thread-safe + 객체 복사 가능** | shared_ptr<mutex> 멤버 (복잡) |
| **thread-safe X (명시)** | 동기화 X, 인터페이스 명시 |
| **각 스레드가 독립 캐시** | thread_local |

## 모던 C++ 변형 — `std::shared_mutex`

읽기 多, 쓰기 少 — `std::shared_mutex` 활용 (C++17+):

```cpp
class Polynomial {
    mutable std::shared_mutex   m;
    mutable std::vector<double> cache;
    mutable bool                valid = false;

public:
    auto roots() const {
        {
            std::shared_lock g(m);   // 읽기 락 — 동시 가능
            if (valid) return cache;
        }
        std::unique_lock g(m);   // 쓰기 락 — 독점
        if (!valid) {
            cache = compute();
            valid = true;
        }
        return cache;
    }
};
```

읽기 동시성 ↑.

## 핵심 정리

1. **const 멤버 = thread-safe가 기본 가정** — 사용자 기대
2. mutable·캐시 있으면 **데이터 경쟁** — UB
3. **여러 변수 보호 → `std::mutex`**
4. **단일 atomic 변수 → `std::atomic`** (그러나 여러 atomic 합성은 위험)
5. mutex/atomic 멤버는 클래스를 **비복사·비이동**으로 만듦
6. thread-safe X면 **인터페이스에 명시**
7. C++17 `std::shared_mutex` — 읽기 多 케이스

## 관련 항목

- [항목 14: noexcept](/blog/programming/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions) — 인터페이스 계약 정신
- [항목 17: 특수 멤버 자동 생성](/blog/programming/effective-modern-cpp/item17-understand-special-member-function-generation) — mutex/atomic이 copy 막음
