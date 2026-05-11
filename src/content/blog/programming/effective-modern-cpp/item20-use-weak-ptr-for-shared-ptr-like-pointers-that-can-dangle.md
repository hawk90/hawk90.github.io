---
title: "항목 20: 댕글링이 가능한 shared_ptr류 포인터에는 weak_ptr를 사용하라"
date: 2025-01-07T12:00:00
description: "관찰만 하는 shared_ptr — 캐싱, 옵저버 패턴, 순환 참조 끊기."
tags: [C++, Smart Pointer, weak_ptr, RAII, Modern C++]
series: "Effective Modern C++"
seriesOrder: 20
---

## 개요

`std::weak_ptr`는 shared_ptr가 가리키는 객체를 **소유하지 않고 관찰**합니다. 객체가 살아있는지 확인 후 안전하게 접근하고, 순환 참조도 끊어줍니다.

## 필수 개념: 약한 참조

> **초보자를 위한 배경 지식**

<br>

### 강한 참조 (strong) vs 약한 참조 (weak)

| | strong (`shared_ptr`) | weak (`weak_ptr`) |
| --- | --- | --- |
| 카운트 영향 | strong count ++ | weak count ++ (자원 수명에 영향 X) |
| 자원 직접 접근 | `*sp`, `sp->` | ❌ — `lock()`으로 변환 후 |
| 자원이 살아있는지 검사 | 자기가 살리니 의미 없음 | `expired()` |

→ weak_ptr는 **소유권 없는 관찰자**.

### control block의 weak count

[항목 19의 control block](/blog/programming/effective-modern-cpp/item19-use-shared-ptr-for-shared-ownership)에 weak count도 — weak_ptr 수.

- strong count = 0 → 자원 해제
- weak count = 0 → control block 해제

→ weak_ptr가 살아있는 동안엔 control block 유지 (객체 메모리는 strong에 의해 결정).

## 기본 사용

```cpp
auto sp = std::make_shared<Widget>();
std::weak_ptr<Widget> wp = sp;

// wp는 카운트 증가시키지 않음
// sp가 사라지면 wp는 expired
```

### `lock()` — shared_ptr로 잠금 시도

```cpp
if (auto locked = wp.lock()) {   // shared_ptr 반환 (또는 nullptr if expired)
    locked->doSomething();        // 살아있을 때만
}                                 // locked는 임시 shared_ptr — 안전
```

`lock()`이 atomic — 다른 스레드가 사이에 자원 해제해도 안전.

### `expired()` — 만료 검사

```cpp
if (!wp.expired()) {
    auto sp2 = wp.lock();   // 그러나 사이에 expire될 수도
}
```

`expired()` + 사용은 **race condition** 가능. **`lock()` 한 번으로 처리**가 안전.

```cpp
auto sp = wp.lock();
if (sp) sp->doSomething();
```

## 활용 1 — 캐싱

```cpp
std::shared_ptr<Widget> getCached(int id) {
    static std::unordered_map<int, std::weak_ptr<Widget>> cache;

    auto it = cache.find(id);
    if (it != cache.end()) {
        if (auto sp = it->second.lock()) {
            return sp;   // 캐시 히트
        }
    }

    auto sp = loadWidget(id);
    cache[id] = sp;
    return sp;
}
```

캐시는 객체 수명을 연장하지 않음 → 진짜 사용자가 모두 떠나면 자동 해제. 캐시는 **자동 정리** 안 됨 (만료된 weak_ptr 그대로) — 주기적 청소 별도 필요.

## 활용 2 — 옵저버 패턴

옵저버는 관찰 대상을 소유하지 않아야 — `weak_ptr`.

```cpp
class Subject;

class Observer {
public:
    virtual ~Observer() = default;
    virtual void onUpdate(const Subject&) = 0;
};

class Subject {
    std::vector<std::weak_ptr<Observer>> observers;
public:
    void attach(std::shared_ptr<Observer> o) {
        observers.push_back(o);
    }

    void notify() const {
        for (auto& wp : observers) {
            if (auto sp = wp.lock()) {
                sp->onUpdate(*this);
            }
            // expired면 그냥 건너뜀
        }
    }
};
```

→ Observer가 사라지면 자동으로 알림에서 제외 — 깔끔.

## 활용 3 — 순환 참조 끊기

[항목 19](/blog/programming/effective-modern-cpp/item19-use-shared-ptr-for-shared-ownership)의 사이클 함정:

```cpp
struct Node {
    std::vector<std::shared_ptr<Node>> children;
    std::weak_ptr<Node>                parent;   // ← weak로 — 순환 방지
};

auto root = std::make_shared<Node>();
auto child = std::make_shared<Node>();
root->children.push_back(child);
child->parent = root;   // weak_ptr — 카운트 안 늘림
```

부모-자식이 모두 shared_ptr면 카운트가 영원히 0 안 됨 → 메모리 누수. 한쪽을 weak로.

### 트리 구조

| 관계 | 추천 |
| --- | --- |
| 부모 → 자식 (소유) | `shared_ptr` 또는 `unique_ptr` |
| 자식 → 부모 (역참조) | `weak_ptr` 또는 raw pointer |
| 형제·이웃 | `weak_ptr` (소유 의도 없음) |

## 활용 4 — `enable_shared_from_this` 내부

`enable_shared_from_this` ([항목 19](/blog/programming/effective-modern-cpp/item19-use-shared-ptr-for-shared-ownership)) 내부엔 `weak_ptr`:

```cpp
template<typename T>
class enable_shared_from_this {
    weak_ptr<T> weak_this;   // 자기 자신에 대한 weak
public:
    shared_ptr<T> shared_from_this() {
        return weak_this.lock();   // weak → shared 변환
    }
};
```

생성 시 weak_this 설정. `shared_from_this()`는 `lock()`으로 shared 반환.

## 비용

`weak_ptr`도 control block의 **약한 카운트**를 증감해야 — atomic 연산. shared_ptr만큼은 아니지만 공짜 X.

```cpp
sizeof(std::weak_ptr<Widget>);   // 16 byte (보통)
```

## 함정 — 만료 검사와 사용 사이

```cpp
if (!wp.expired()) {
    sp = wp.lock();
    if (sp) sp->doIt();   // 사이에 expire될 수도? lock() 후엔 안전
}
```

**`lock()` 호출 후엔 안전** — 만약 lock이 sp 반환했다면 carrier가 살아있고, sp가 그 strong reference 보유.

그러나 `expired()` + 그 다음 `lock()` 사이엔 race — **그냥 `lock()` 한 번**으로:

```cpp
if (auto sp = wp.lock()) sp->doIt();
```

## weak_ptr → shared_ptr 변환 (`std::shared_ptr` 생성자)

```cpp
std::weak_ptr<Widget> wp = ...;
std::shared_ptr<Widget> sp(wp);   // 생성자 — expired면 std::bad_weak_ptr 예외
```

`lock()`은 nullptr, 생성자는 예외 — 의도에 따라 선택.

## 비교 — 한눈에

| | `shared_ptr` | `weak_ptr` |
| --- | --- | --- |
| 자원 수명 | 영향 (소유) | 영향 X (관찰만) |
| 자원 접근 | 직접 (`*sp`, `sp->`) | `lock()` 후 |
| 만료 검사 | 자기가 살리니 X | `expired()`, `lock()` |
| 사이클 회피 | ❌ — 사이클 만들 수 있음 | ✅ |
| 비용 | 강한+약한 카운트 atomic | 약한 카운트 atomic |

## 핵심 정리

1. **`weak_ptr` = "관찰만 하는 shared_ptr"**
2. **`lock()`로 안전하게 접근** — atomic
3. **캐싱, 옵저버, 순환 참조 끊기**에 사용
4. control block의 weak count도 atomic — 공짜 X
5. **`expired()` + 사용은 race** — `lock()` 한 번으로
6. weak_ptr → shared_ptr 변환은 lock() (nullptr) 또는 ctor (예외)

## 관련 항목

- [항목 19: shared_ptr](/blog/programming/effective-modern-cpp/item19-use-shared-ptr-for-shared-ownership) — control block, enable_shared_from_this
- [항목 21: `make_*` 함수](/blog/programming/effective-modern-cpp/item21-prefer-make-unique-and-make-shared-to-direct-new) — make_shared의 weak 함정
