---
title: "항목 39: private 상속을 신중하게 사용하라"
date: 2025-02-06T17:00:00
description: "private 상속의 의미와 composition과의 차이 — EBO와 protected 접근이 정당화 사유."
tags: [C++, Effective C++, Inheritance, Private]
series: "Effective C++"
seriesOrder: 39
draft: true
---

## 왜 이 항목이 중요한가?

`private` 상속은 의미상 **composition과 같다** — "is-implemented-in-terms-of"다. is-a가 아니라 "이 클래스의 기능을 빌려쓴다"는 의미다.

그렇다면 항상 composition을 쓰면 되지 않나? 거의 그렇다. 다만 두 가지 자리에서 private 상속이 우위다.

- **base의 protected 멤버나 virtual 함수에 접근**해야 할 때 — composition으론 못 한다.
- **EBO(Empty Base Optimization)** 로 메모리 절약 — 빈 base는 derived 안에서 자리를 차지하지 않는다. `std::tuple`, allocator 어댑터 같은 자리에서 핵심 도구다.

이 두 경우 외에는 composition이 더 단순하고 명확하다. 이 항목은 private 상속의 정당화 사유와 EBO 메커니즘을 정리한다.

## 개요

`private` 상속은 IS-A가 아닌 **is-implemented-in-terms-of** 관계를 표현한다. composition과 같은 의미다. 대부분의 경우 composition이 더 단순하고 명확하지만, **두 가지 경우엔 private 상속이 우위**다. base의 protected 멤버 또는 virtual 함수에 접근해야 할 때, 그리고 **EBO**(Empty Base Optimization)로 메모리를 절약해야 할 때다.

## 필수 개념: 상속의 종류와 의미

> **초보자를 위한 배경 지식**

<br>

C++의 상속은 접근 지정자에 따라 의미가 달라집니다.

| 형태 | 의미 | base의 public 멤버 | 외부에서 derived → base 변환 |
| --- | --- | --- | --- |
| `public` | **IS-A** | derived의 public | 가능 |
| `protected` | (드물게 사용) | derived의 protected | derived와 friend만 |
| `private` | **IS-IMPLEMENTED-IN-TERMS-OF** | derived의 private | 외부 불가 |

`private` 상속은 — 상속의 문법만 빌리고 IS-A 의미는 갖지 않음. composition과 같은 의미.

## private 상속의 동작

```cpp
class Person {
public:
    void breathe();
};

class Student : private Person {
public:
    void study() {
        breathe();    // ✅ 내부에선 base의 public 사용 가능 (private이 됨)
    }
};

Student s;
s.breathe();          // ❌ Student의 private이라 외부 차단

void eat(const Person&);
eat(s);               // ❌ private 상속이라 외부에서 IS-A 변환 안 됨
```

base의 public 멤버는 derived의 private으로 변환 — 외부엔 안 보임. 외부에서 derived를 base로 변환도 차단.

## composition과의 동등성

```cpp
// 옵션 A: composition
class Widget {
    Timer t;             // 멤버로 보유
public:
    void onEvent() {
        t.startCountdown();
    }
};

// 옵션 B: private 상속
class Widget : private Timer {
public:
    void onEvent() {
        startCountdown();    // base 멤버 직접 접근
    }
};
```

두 옵션 모두 "Widget is implemented in terms of Timer". 외부 사용자에겐 동일한 인터페이스 — Widget의 public 멤버만 보임.

## 언제 private 상속을 쓰나 — composition보다 유리한 두 경우

### 경우 1) base의 protected 멤버 / virtual 함수 접근 필요

```cpp
class Timer {
public:
    virtual void onTick() const;
};

void scheduleTimer(Timer* t);    // 외부 API

// composition으로는 onTick의 derived 동작 못 만듦
class Widget {
    Timer t;
    // t.onTick은 Timer::onTick — Widget의 코드 호출 불가
};

// private 상속으로 virtual 재정의 가능
class Widget : private Timer {
    virtual void onTick() const override {
        // Widget 전용 작업
    }
};
```

**왜 composition으로 안 되나**: composition은 멤버 객체의 외부에서 멤버 함수를 부르는 형태 — 그 함수가 virtual이라도 그 객체의 실제 타입(Timer)의 함수만 호출됨. Widget의 virtual override가 불가능.

private 상속이면 — Widget이 Timer 자체이므로 Widget이 virtual 재정의 가능.

### 경우 2) EBO (Empty Base Optimization)

```cpp
class Empty {};       // 빈 클래스 — 표준상 sizeof >= 1

class HoldsInt {
    int  x;
    Empty e;          // 멤버 — 1 byte + 패딩 (보통 8 byte 객체로 정렬)
};

sizeof(HoldsInt);     // 8 (또는 16 — 컴파일러/아키텍처에 따라)

class HoldsInt2 : private Empty {     // EBO — Empty가 자리 차지 X
    int x;
};

sizeof(HoldsInt2);    // 4 (또는 8)
```

**EBO 메커니즘**: 빈 base 클래스는 derived 객체 안에서 **0 byte**를 차지할 수 있습니다(컴파일러 최적화). 멤버로 두면 표준이 0이 아닌 크기를 요구하므로 패딩 발생, base로 두면 회피.

표준 라이브러리 활용:
- `std::unique_ptr<T, Deleter>` — Deleter가 빈 람다/펑크터면 EBO로 추가 메모리 0
- `std::allocator`를 가진 컨테이너 — allocator가 stateless면 0 byte
- `std::tuple` 일부 구현

```cpp
// 함수 객체가 stateless (보통)
struct MyDeleter {
    void operator()(T* p) const { delete p; }
};

sizeof(std::unique_ptr<T, MyDeleter>);    // 8 byte (포인터만, Deleter는 EBO)

sizeof(std::unique_ptr<T, std::function<void(T*)>>);    // 16+ byte (function 자체가 큼)
```

## composition을 우선 — private 상속은 정당화 사유 있을 때

```
private 상속 vs composition
├── 위 두 경우(EBO / protected·virtual) → private 상속
├── 그 외 → composition (더 명확)
└── 의심되면 → composition
```

## 흔한 패턴 — Mixin via private 상속

```cpp
class Counter {
protected:
    void increment() { ++count; }
    int  count = 0;
};

class Loggable : private Counter {
protected:
    using Counter::increment;
    using Counter::count;
public:
    void log() {
        increment();
        std::cout << "Logged: " << count << '\n';
    }
};
```

작은 기능을 별도 클래스로 분리해 private 상속으로 결합 — Mixin 패턴.

## 함정 — public 상속을 private으로 강등

```cpp
class Animal {
public:
    void breathe();
};

class Robot : private Animal {     // 잘못된 의도 — "로봇은 동물이지만 외부에 숨김"
public:
    using Animal::breathe;          // 다시 노출?? — 그러면 public 상속과 차이가
};
```

private 상속의 의도는 "**구현 위임**"이지 "**IS-A인데 숨김**"이 아닙니다. 잘못된 사용 — 다시 검토.

## using 선언으로 선택적 노출

```cpp
class Stack : private std::vector<int> {
public:
    using std::vector<int>::push_back;    // push만 노출 (rename: push)
    using std::vector<int>::pop_back;
    using std::vector<int>::back;
    using std::vector<int>::size;
    using std::vector<int>::empty;
    // operator[], at, iterator 등은 안 노출
};

Stack s;
s.push_back(42);     // ✅
s[0];                // ❌ private 상속 — 노출 안 됨
```

private 상속의 장점 중 하나 — base의 멤버를 **선택적으로** public에 노출. composition으로는 wrapping 함수를 일일이 작성해야 함.

## 다중 상속과 EBO

```cpp
class EmptyA {};
class EmptyB {};
class C : private EmptyA, private EmptyB {
    int x;
};

sizeof(C);     // 보통 4 — 두 빈 base 모두 EBO
```

여러 빈 클래스를 private 상속해도 EBO 적용. mixin 결합에 유용.

## 표준 라이브러리에서 보는 EBO

```cpp
// 일부 구현의 std::unique_ptr<T, D>
template<typename T, typename D = std::default_delete<T>>
class unique_ptr {
    // pointer + deleter 공간 — D가 빈 클래스면 EBO로 0 byte
    // compressed_pair 또는 비슷한 트릭 사용
};
```

`compressed_pair`(Boost) — 두 멤버 중 한쪽이 빈 클래스면 EBO를 활용해 합치는 utility. 표준에 없어 직접 또는 Boost 사용.

## 모던 변형 — `[[no_unique_address]]` (C++20)

```cpp
template<typename T, typename D>
class unique_ptr {
    T* ptr;
    [[no_unique_address]] D deleter;     // C++20: 빈 클래스면 0 byte
};
```

C++20 attribute로 EBO를 멤버에 적용 — private 상속 없이도 EBO 효과. 컴파일러가 지원하면 권장.

```cpp
struct Empty {};

struct C {
    [[no_unique_address]] Empty e;
    int x;
};

sizeof(C);    // 4 (C++20 + 지원 컴파일러)
```

private 상속의 EBO 사용 사유가 약해짐 — C++20+ 환경에선 `[[no_unique_address]]` 우선.

## 실무 가이드 — 결정

```
is-implemented-in-terms-of 관계인가?
├── base의 protected/virtual 접근 필요 → private 상속
├── 빈 클래스이고 메모리 절약 필요
│   ├── C++20+ → [[no_unique_address]] 멤버
│   └── 이전 → private 상속 (EBO)
└── 그 외 → composition
```

## 실무 가이드 — 체크리스트

- [ ] private 상속의 의도는 is-implemented-in-terms-of인가? (IS-A 아님)
- [ ] base의 protected 멤버 / virtual 함수가 정말 필요한가?
- [ ] 빈 클래스 + 메모리 critical?
- [ ] C++20 사용 가능? → `[[no_unique_address]]` 멤버
- [ ] using 선언으로 base 멤버 선택적 노출?
- [ ] 외부에서 IS-A 의미로 사용하는 코드 없는가?

## 핵심 정리

1. **private 상속 = is-implemented-in-terms-of** (composition과 같은 의미)
2. **대부분 composition이 더 단순** — 의미가 명확
3. **정당한 사유**:
   - base의 protected 멤버 / virtual 함수 접근
   - EBO (빈 클래스 + 메모리 절약)
4. **using 선언**으로 base 멤버 선택적 노출 가능
5. C++20 **`[[no_unique_address]]`** — EBO를 멤버에 적용, private 상속 대체

## 관련 항목

- [항목 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — public/private 상속의 차이
- [항목 38: composition](/blog/programming/cpp/effective-cpp/item38-model-has-a-or-implemented-in-terms-of-through-composition) — private 상속의 대안
- [항목 40: 다중 상속](/blog/programming/cpp/effective-cpp/item40-use-multiple-inheritance-judiciously) — private 상속의 다중 활용
