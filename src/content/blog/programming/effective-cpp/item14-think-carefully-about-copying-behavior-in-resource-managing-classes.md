---
title: "항목 14: 자원 관리 클래스의 복사 동작을 신중히 결정하라"
date: 2025-02-03T11:00:00
description: "복사 금지·참조 카운트·깊은 복사·소유권 이전 — 네 가지 복사 정책."
tags: [C++, Effective C++, RAII, Copy]
series: "Effective C++"
seriesOrder: 14
draft: true
---

> **초안** — 정리 진행 중

## 개요

자원 관리 클래스를 만들 때 "복사하면 어떻게 되어야 하는가?"는 신중한 결정. 네 가지 흔한 정책 중 도메인에 맞는 걸 골라야 합니다.

## 4가지 복사 정책

### 1. 복사 금지 (uncopyable)

뮤텍스, 파일 핸들 등 — 복사 의미가 없는 자원.

```cpp
class Lock {
    Mutex* mu;
public:
    explicit Lock(Mutex* m) : mu(m) { lock(*mu); }
    ~Lock() { unlock(*mu); }

    Lock(const Lock&) = delete;
    Lock& operator=(const Lock&) = delete;
};
```

C++11+ `= delete`. 이전엔 private 트릭.

### 2. 참조 카운트

마지막 사용자가 떠날 때 해제. `shared_ptr` 패턴.

```cpp
class Lock {
    std::shared_ptr<Mutex> mu;
public:
    explicit Lock(Mutex* m)
        : mu(m, unlock) {}    // shared_ptr의 deleter로 unlock
    // 복사 자동 — shared_ptr가 카운트
};
```

마지막 Lock 소멸 시 unlock. 생성자에서 lock 호출 누락에 주의.

### 3. 깊은 복사 (deep copy)

자원 자체를 복제. `std::string`처럼.

```cpp
class Buffer {
    char* data;
    size_t size;
public:
    Buffer(const Buffer& rhs)
        : data(new char[rhs.size]), size(rhs.size) {
        std::copy(rhs.data, rhs.data + rhs.size, data);
    }
};
```

복사 비용 큼 → move 연산도 같이 정의 권장.

### 4. 소유권 이전

`std::unique_ptr`처럼 — 한 객체만 보유.

```cpp
class Owner {
    Resource* r;
public:
    Owner(Owner&& other) noexcept
        : r(other.r) { other.r = nullptr; }

    Owner(const Owner&) = delete;
};
```

C++98의 `auto_ptr`가 이 모델이었지만 의외성 있어 C++11에서 `unique_ptr`로 대체.

## 결정 기준

- **공유 가능한 자원인가?** → 참조 카운트 or 깊은 복사
- **공유 불가/단일 책임?** → 복사 금지 or 소유권 이전
- **자원 자체가 가벼운가?** → 깊은 복사
- **자원이 무겁고 다수 사용자가 있나?** → 참조 카운트

## 핵심 정리

1. 자원 관리 클래스의 복사 정책은 4가지 중 선택
2. 컴파일러 자동 생성 함수에 의존하지 말 것 — 의도와 다를 가능성
3. C++11+ 에선 move 연산도 함께 고려
