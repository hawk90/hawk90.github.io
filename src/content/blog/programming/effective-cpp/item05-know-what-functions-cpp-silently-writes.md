---
title: "항목 5: C++가 자동으로 작성·호출하는 함수들을 알아두라"
date: 2025-02-02T10:00:00
description: "기본 생성자, 복사/이동 생성자, 복사/이동 대입, 소멸자 — 컴파일러가 언제 자동 생성하는가."
tags: [C++, Effective C++, Special Member Functions]
series: "Effective C++"
seriesOrder: 5
---

## 개요

빈 클래스를 적어도 컴파일러는 그것을 "정말 빈 것"으로 두지 않습니다. 필요할 때 **특수 멤버 함수**(special member functions)를 자동 작성하고, 객체 생성/복사/소멸 시점에 호출합니다. 어떤 함수가 언제 자동 생성되는지를 알지 못하면 의도와 다른 복사·이동·자원 누수가 일어납니다.

## 필수 개념: 특수 멤버 함수의 6가지

> **초보자를 위한 배경 지식**

<br>

C++11 이후 컴파일러가 자동 생성할 수 있는 함수는 6가지입니다.

| 함수 | C++98 | C++11+ |
| --- | --- | --- |
| 기본 생성자 | ✓ | ✓ |
| 소멸자 | ✓ | ✓ |
| 복사 생성자 | ✓ | ✓ |
| 복사 대입 연산자 | ✓ | ✓ |
| **이동 생성자** | — | ✓ (C++11) |
| **이동 대입 연산자** | — | ✓ (C++11) |

이 6개를 합쳐 "the big 6" 또는 "the rule of 5/6"이라 부릅니다. 자동 생성 규칙은 서로 얽혀 있어, 한 함수를 명시하면 다른 함수의 자동 생성이 영향을 받습니다.

## 자동 생성 예시 — 빈 클래스

```cpp
class Empty {};
```

컴파일러가 만드는 것:

```cpp
class Empty {
public:
    Empty()                    noexcept = default;   // 기본 생성자
    ~Empty()                   noexcept = default;   // 소멸자 (non-virtual)
    Empty(const Empty&)        = default;            // 복사 생성자
    Empty& operator=(const Empty&) = default;        // 복사 대입
    Empty(Empty&&)             noexcept = default;   // 이동 생성자 (C++11+)
    Empty& operator=(Empty&&)  noexcept = default;   // 이동 대입 (C++11+)
};
```

이 함수들은 **사용될 때만** 생성됩니다. 예를 들어 클래스를 한 번도 복사한 적이 없으면 컴파일러는 복사 생성자를 만들지 않습니다 — 그래서 단순 컴파일은 통과해도 호출하려는 순간 에러가 나는 경우가 있습니다.

## 무엇을 자동으로 하는가 — 멤버별 복사

```cpp
class NamedObject {
    std::string nameValue;
    int         objectValue;
};

NamedObject a;
NamedObject b = a;     // 자동 생성된 복사 생성자
                       // → nameValue: string의 복사 생성자 호출
                       //   objectValue: int를 비트 복사
```

규칙: **각 멤버에 대해 그 멤버 타입의 복사 생성자를 호출**. 내장 타입은 비트 복사. 이게 "**memberwise copy**".

## 자동 생성이 안 되는 경우

### 1) 참조 멤버 — 복사 대입 불가

```cpp
class NamedObject {
    std::string& nameRef;      // 참조 — 한 번 묶이면 끝
public:
    NamedObject(std::string& s) : nameRef(s) {}
};

NamedObject a(str1), b(str2);
b = a;     // ⚠️ 컴파일 에러 — 참조는 다른 것을 가리키게 할 수 없음
```

참조는 "**대입**"의 의미가 없으므로 컴파일러는 복사 대입 연산자를 자동 생성하지 못합니다.

### 2) const 멤버 — 복사 대입 불가

```cpp
class C {
    const std::string name;
};
C a("x"), b("y");
b = a;     // ⚠️ const 멤버는 대입 불가
```

같은 이유. 복사 **생성자**는 OK(초기화는 되니까), 복사 **대입**은 불가능.

### 3) Base가 복사 대입을 private/deleted

```cpp
class Base {
private:
    Base& operator=(const Base&);     // private
};

class Derived : public Base {
    // 컴파일러는 Derived의 복사 대입을 만들려 함
    // 그런데 Base::operator=를 호출할 수 없음 → 자동 생성 실패
};
```

derived의 자동 생성은 base 호출 가능성에 의존. base가 막아두면 derived도 자동 생성 안 됨.

### 4) 멤버 자체가 복사 불가

```cpp
class Container {
    std::unique_ptr<Resource> r;     // unique_ptr는 복사 불가
};
// Container의 복사 생성자/대입 자동 생성 안 됨 (move는 OK)
```

## 어떤 선언이 다른 자동 생성을 막는가 (rule of 0/5)

### C++11+ 규칙 표

| 사용자가 명시한 것 | 자동 생성되는 것 |
| --- | --- |
| 아무것도 명시 안 함 | 6개 모두 자동 (필요 시) |
| 임의의 생성자 | 기본 생성자 ❌, 나머지 자동 |
| 복사 생성자 | 이동 ops ❌ (deprecated 자동) |
| 복사 대입 | 이동 ops ❌ |
| 이동 생성자/대입 | 복사 ops도 자동이지만 deleted로 |
| 소멸자 | 이동 ops 자동 X (deprecated 자동) |

**rule of zero**: 컴파일러 자동 생성이 정확히 의도와 같다면 — 사용자가 아무것도 안 적는 게 가장 안전.

**rule of five**(또는 rule of three for C++98): 셋(또는 다섯) 중 하나라도 작성하면 나머지도 명시적으로 결정하라.

### 예시 — 소멸자를 적으면 이동이 사라진다

```cpp
class Buffer {
    char* data;
    size_t size;
public:
    ~Buffer() { delete[] data; }    // 소멸자 명시
    // 이동 생성자/대입은 자동 생성 안 됨 (deprecated)
    // 복사 생성자/대입은 자동 생성 (deprecated)
};

Buffer a, b;
b = std::move(a);     // 복사 대입 호출! — 이동 의도가 사라짐
                      // → ⚠️ a와 b가 같은 data를 가리킴 → 이중 해제
```

소멸자가 자원 해제를 하는 클래스에 사용자가 이동 ops를 명시하지 않으면, `std::move`를 써도 복사가 호출됨 — 의도가 무너집니다.

### 해결 — 명시적으로 작성하거나 `= default`

```cpp
class Buffer {
    char* data;
    size_t size;
public:
    ~Buffer() { delete[] data; }

    Buffer(const Buffer&) = delete;             // 복사 금지 (또는 작성)
    Buffer& operator=(const Buffer&) = delete;

    Buffer(Buffer&& other) noexcept
        : data(other.data), size(other.size) {
        other.data = nullptr;
        other.size = 0;
    }
    Buffer& operator=(Buffer&& other) noexcept {
        if (this != &other) {
            delete[] data;
            data = other.data;
            size = other.size;
            other.data = nullptr;
            other.size = 0;
        }
        return *this;
    }
};
```

## 자동 생성된 함수의 특징

- **public, inline, noexcept(가능하면)**
- **non-virtual** — 소멸자도 non-virtual로 자동 생성. 다형성 base 클래스라면 사용자가 명시적으로 virtual 선언 필요 (항목 7).
- **본문은 memberwise** — 멤버에 그 타입의 해당 함수를 위임.

## 흔한 함정 — pointer 멤버

```cpp
class Naive {
    Resource* r;
public:
    Naive() : r(new Resource) {}
    ~Naive() { delete r; }
    // 복사 생성자/대입 자동 생성 — 포인터 비트 복사
};

Naive a, b;
b = a;     // 두 객체가 같은 r을 가리킴 → 이중 해제 / dangling
```

자동 생성 복사는 **포인터 자체를 비트 복사** — 두 객체가 같은 자원을 공유. 한쪽이 먼저 소멸하면 다른 쪽은 dangling.

해결책: 항목 13(RAII로 unique_ptr/shared_ptr 사용), 항목 14(복사 정책 명확화), 또는 명시적으로 deep copy 작성.

## 모던 변형 — `= default`, `= delete`

```cpp
class Polymorphic {
public:
    virtual ~Polymorphic() = default;        // virtual + 자동 본문
    Polymorphic(const Polymorphic&) = delete;  // 복사 금지
    Polymorphic& operator=(const Polymorphic&) = delete;
    Polymorphic(Polymorphic&&) = default;    // 이동 OK
    Polymorphic& operator=(Polymorphic&&) = default;
};
```

`= default`: 자동 생성을 명시적으로 요청 (가독성 + rule of 5 충족).
`= delete`: 사용 금지 — 호출하면 컴파일 에러.

## 실무 가이드

| 상황 | 작성 정책 |
| --- | --- |
| 모든 멤버가 RAII (스마트 포인터, 컨테이너) | **rule of zero** — 아무것도 적지 마 |
| raw 포인터/자원을 직접 관리 | **rule of five** — 6개 명시 |
| 다형성 base | virtual 소멸자, 복사 금지 권장 |
| 단순 값 타입 | rule of zero |

## 핵심 정리

1. 컴파일러는 필요할 때 **6가지 특수 멤버 함수**를 자동 생성 (C++11+)
2. 자동 생성 = **memberwise** (멤버별 복사/이동)
3. 참조·const 멤버·deleted base는 자동 생성 차단
4. 한 함수를 명시하면 다른 함수의 자동 생성에 **영향** — rule of 5 따르기
5. **raw 포인터 멤버 + 자동 복사 = 이중 해제 위험** — RAII로 우회
6. C++11+ `= default`, `= delete`로 명시적 제어

## 관련 항목

- [항목 6: 자동 생성 함수가 싫으면 명시적으로 금지](/blog/programming/effective-cpp/item06-explicitly-disallow-compiler-generated-functions) — `= delete` 패턴
- [항목 11: 자기 대입 처리](/blog/programming/effective-cpp/item11-handle-assignment-to-self-in-operator-equals) — 직접 작성한 operator=의 안전성
- [항목 12: 객체의 모든 부분을 복사](/blog/programming/effective-cpp/item12-copy-all-parts-of-an-object) — 직접 작성한 복사 함수의 함정
- [항목 14: 자원 관리 클래스의 복사 동작](/blog/programming/effective-cpp/item14-think-carefully-about-copying-behavior-in-resource-managing-classes) — 복사 정책 결정
