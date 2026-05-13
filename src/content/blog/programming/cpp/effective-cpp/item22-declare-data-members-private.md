---
title: "항목 22: 데이터 멤버는 private으로 선언하라"
date: 2025-02-04T14:00:00
description: "캡슐화의 첫걸음 — public 데이터의 4가지 단점, protected의 함정, struct vs class 컨벤션."
tags: [C++, Effective C++, Encapsulation]
series: "Effective C++"
seriesOrder: 22
draft: true
---

## 왜 이 항목이 중요한가?

`public` 데이터 멤버는 편해 보이지만 **클래스의 모든 내부 표현을 클라이언트에 노출**한다. 이게 네 가지 자리에서 문제를 만든다.

- **불변성 강제 불가** — 누가 언제 어떻게 멤버를 바꾸는지 통제할 수 없다.
- **검증/로깅 추가 불가** — setter 함수가 없으면 변경 시점에 코드를 끼워넣을 수 없다.
- **동기화 추가 불가** — 멀티스레드 안전성을 나중에 추가하려면 멤버 접근 자체를 막아야 한다.
- **내부 표현 변경 불가** — 멤버 이름·타입을 바꾸면 모든 클라이언트가 깨진다.

`private`으로 두면 이 모든 것을 **나중에도 추가**할 수 있다. 캡슐화의 핵심 가치다.

추가로 이 항목은 **`protected`가 사실 `public`만큼 노출**된다는 점과, `struct` vs `class` 컨벤션을 다룬다.

## 개요

데이터 멤버를 `private`으로 두는 것은 OOP의 **캡슐화** 원칙의 출발점이다. 접근을 멤버 함수로 한정하면 검증·로깅·동기화·내부 표현 변경이 클라이언트를 깨뜨리지 않고 가능해진다. 이 항목은 public 데이터의 4가지 단점, **protected가 public과 같다**는 핵심, 그리고 `struct` vs `class` 컨벤션을 다룬다.

## 필수 개념: 캡슐화는 무엇을 보호하는가

> **초보자를 위한 배경 지식**

<br>

캡슐화는 두 가지를 보호합니다.

1. **불변식**(invariant) — 객체가 항상 만족하는 조건. 외부에서 임의로 데이터 변경하면 불변식이 깨짐.
2. **변경의 자유**(change freedom) — 내부 표현을 바꿔도 클라이언트 코드를 깨지 않을 자유.

```cpp
class Speedometer {
    int currentSpeed;     // 0 ~ MAX_SPEED만 의미 있음
public:
    void setSpeed(int s) {
        if (s < 0 || s > MAX_SPEED)
            throw std::invalid_argument("Invalid speed");
        currentSpeed = s;     // 검증된 값만 설정
    }
};
```

데이터를 직접 노출하면 — 검증 우회 + 외부 의존성 굳어짐.

## public 데이터의 4가지 단점

### 1) 일관성 없는 접근 문법

```cpp
struct Point { int x; int y; };
Point p;
p.x = 10;       // 직접 접근

class Speedometer { /* ... */ };
Speedometer s;
s.setSpeed(60);     // 함수 호출
```

사용자가 매번 "이건 함수, 저건 데이터"를 외워야 함. 모든 접근을 함수로 통일하면 일관됨 — 같은 문법으로 접근 가능.

### 2) 정밀한 제어 불가

함수 안에서 할 수 있는 것을 데이터로는 못 함:

```cpp
class Speedometer {
    int speed;
public:
    void setSpeed(int s) {
        validateSpeed(s);                   // 검증
        logSpeedChange(speed, s);           // 로깅
        std::lock_guard lock(mu);            // 동기화
        speed = s;
        notifyObservers();                   // 이벤트
    }

    int getSpeed() const {
        std::lock_guard lock(mu);
        return speed;
    }
};
```

이 모든 일을 **단 한 곳에서** 처리. public 데이터라면 모든 접근 지점에 흩어져야 함.

### 3) 캡슐화 — 내부 표현 변경의 자유

```cpp
// 첫 버전 — int로 km/h 저장
class Speedometer {
    int speedKmh;
public:
    int getSpeed() const { return speedKmh; }
};

// 6개월 후 — 내부적으로 m/s로 바꾸기로 결정
class Speedometer {
    double speedMs;     // 내부 표현 변경
public:
    int getSpeed() const { return speedMs * 3.6; }   // 인터페이스는 그대로
};
```

데이터를 private으로 두면 **인터페이스(`getSpeed`)와 표현(`speedKmh` / `speedMs`)이 독립**. 클라이언트 코드는 그대로.

public 데이터였다면 — 모든 `s.speedKmh` 사용 지점을 찾아 고쳐야 함. 라이브러리 사용자에겐 **breaking change**.

### 4) 잠재적 멤버 추가 시 깨짐

```cpp
class Window {
public:
    int x, y;            // public — 사용자가 직접 변경
    int width, height;
};

Window w;
w.x = 100;               // 윈도우 이동
                         // ⚠️ 화면 redraw는? 위치 invalidation은?

// 나중에 동기화·이벤트 추가하고 싶어도 — public 데이터라 후크 불가
```

함수라면 set 호출에 동작을 묶을 수 있는데, public 데이터는 "단순 메모리"로 보이므로 사용자가 그 의미를 모름.

## protected는 public과 같다 — 캡슐화 측면에서

```cpp
class Base {
protected:
    int data;          // ⚠️ 모든 derived가 의존 가능
};

class Derived1 : public Base { void f() { data = 10; } };
class Derived2 : public Base { void g() { data = 20; } };
// ... 수많은 derived ...
```

`data`의 표현을 바꾸려면 — **모든 derived 클래스를 수정**해야 함. derived가 라이브러리 외부에 있으면 사용자 코드도 깨짐.

캡슐화 척도: "**이 멤버가 사라지거나 이름이 바뀌면 깨질 코드의 양**".

- **public**: 모든 클라이언트 코드 — 무한대
- **protected**: 모든 derived 클래스 — 잠재적으로 외부
- **private**: 클래스 자체와 friend — 통제 가능

**결론**: protected ≠ encapsulated. derived도 결국 외부.

```cpp
class Base {
protected:
    int getData() const { return data_; }     // 더 나음 — 함수
    void setData(int x) { /* 검증 */ data_ = x; }
private:
    int data_;
};
```

protected는 **함수**로 derived에게 인터페이스만 노출.

## struct vs class — 컨벤션

C++은 문법적으로 `struct`와 `class`가 기본 접근 권한만 다름:

```cpp
struct S {
    int x;             // 기본 public
};

class C {
    int x;             // 기본 private
};
```

C++ 커뮤니티의 컨벤션:

| 사용 | 의미 |
| --- | --- |
| `struct` | 순수 데이터 묶음, public 멤버, 불변식 없음 (POD-like) |
| `class` | 불변식이 있는 객체, private 데이터, 멤버 함수로 인터페이스 |

```cpp
// struct — 단순 데이터 묶음
struct Point2D { double x, y; };
struct HttpResponse { int status; std::string body; };

// class — 불변식 + 인터페이스
class BankAccount {
    double balance;        // 음수 안 됨, 통화 단위 일관
public:
    void deposit(double amount);
    void withdraw(double amount);
    double getBalance() const;
};
```

표준 라이브러리도 일관:
- `struct std::pair`, `struct std::tuple` — public 멤버 (`.first`, `.second`)
- `class std::string`, `class std::vector` — 인터페이스 + private 데이터

## 흔한 함정 — 게터/세터 양산

```cpp
class Bad {
    int x, y, z;
public:
    int  getX() const { return x; }
    void setX(int v) { x = v; }
    int  getY() const { return y; }
    void setY(int v) { y = v; }
    int  getZ() const { return z; }
    void setZ(int v) { z = v; }
};
```

이 클래스는 형식상 private이지만 사실상 public — **검증·로깅 없는 단순 통로**. 사용자 입장에선 데이터를 직접 노출한 것과 다를 바 없음. 진짜 게터/세터로 두려면 **이유가 있어야 함**(검증, 로깅, 표현 분리). 그 이유가 없다면 — `struct`로.

```cpp
struct Point3D { double x, y, z; };    // ← 정직한 데이터 묶음
```

## "set/get 패턴은 캡슐화가 아니다"

```cpp
class Person {
    std::string name;
    int age;
public:
    void setName(const std::string& n) { name = n; }
    std::string getName() const { return name; }
    void setAge(int a) { age = a; }
    int getAge() const { return age; }
};
```

이건 결국 데이터 노출 + 함수 포장. 진짜 캡슐화는:

```cpp
class Person {
    // ... 데이터 ...
public:
    void renameDueToMarriage(const std::string& newName);   // 도메인 의도
    void celebrateBirthday();                                 // age + 1, 이벤트 발생
};
```

**도메인 의도**를 함수에 박으면 캡슐화. 단순 데이터 통로는 그냥 `struct`.

## 모던 변형 — public 멤버 + 불변식

C++20 designated initializers를 활용한 패턴:

```cpp
struct Config {
    int    port    = 8080;
    bool   verbose = false;
    std::string host = "localhost";
};

Config cfg{.port = 9000, .verbose = true};
```

설정 객체 같은 경우 — public 멤버 + default 값. 불변식이 없거나 약하다면 `struct`로 충분.

## 실무 가이드

| 상황 | 권장 |
| --- | --- |
| 불변식 있는 객체 (BankAccount, Date) | `class` + private 데이터 |
| 단순 데이터 묶음 (Point2D, HttpResponse) | `struct` + public 멤버 |
| 검증/로깅/동기화 필요 | private 데이터 + 멤버 함수 |
| 상속 가능한 base | protected 함수 인터페이스, 데이터는 private |
| 거의 항상 단순 get/set만 | `struct` 고려 |

## 실무 가이드 — 체크리스트

- [ ] 이 멤버에 불변식이 있는가? → private
- [ ] 접근 시 검증·로깅·동기화가 필요한가? → private + 함수
- [ ] 단순 데이터 묶음인가? → struct + public
- [ ] derived에 노출이 필요하면 → protected **함수**, private 데이터
- [ ] get/set만 있다면 — 정말 private이 필요한지 자문

## 핵심 정리

1. **데이터 멤버는 기본 private** — 캡슐화의 출발
2. private + 멤버 함수: **검증·로깅·동기화·표현 변경** 의 자유
3. **protected도 캡슐화 측면에선 public과 같음** — derived 의존을 줄여야
4. **`struct`** — 단순 데이터 묶음 (public OK), **`class`** — 불변식 있는 객체
5. 단순 get/set 양산은 캡슐화가 아님 — 도메인 의도를 함수로

## 관련 항목

- [항목 18: 인터페이스는 쓰기 쉽게](/blog/programming/cpp/effective-cpp/item18-make-interfaces-easy-to-use-correctly-and-hard-to-use-incorrectly) — public 인터페이스 설계
- [항목 23: 비-멤버 비-friend 선호](/blog/programming/cpp/effective-cpp/item23-prefer-non-member-non-friend-functions-to-member-functions) — 캡슐화 한 걸음 더
- [항목 28: 객체 내부 핸들 반환 금지](/blog/programming/cpp/effective-cpp/item28-avoid-returning-handles-to-object-internals) — 데이터 노출의 다른 형태
