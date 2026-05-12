---
title: "항목 29: 예외-안전 코드를 작성하라"
date: 2025-02-05T13:00:00
description: "기본·강력·noexcept 보증 세 단계, copy-and-swap 패턴, 가장 약한 단계가 함수 전체 보증을 결정."
tags: [C++, Effective C++, Exception Safety]
series: "Effective C++"
seriesOrder: 29
---

## 개요

예외-안전(exception-safe) 코드는 두 가지를 보장합니다:
1. **자원 누수 없음** (RAII로 해결)
2. **데이터 구조의 일관성** (예외 후에도 객체가 깨지지 않음)

세 단계 보증 — **basic**, **strong**, **nothrow** — 이 있으며, 강할수록 사용자 코드가 단순해집니다. copy-and-swap 같은 패턴이 강력 보증을 단순하게 구현하는 핵심 도구.

## 필수 개념: 예외가 일으키는 상황

> **초보자를 위한 배경 지식**

<br>

함수 안에서 예외가 발생하면:
- 스택 unwinding — 호출 체인을 거꾸로 올라감
- 만들어진 로컬 객체의 소멸자 자동 호출
- 함수에서 빠져나가는 도중 — **객체가 부분적으로 변경된 상태일 수 있음**

```cpp
void unsafeChange() {
    delete pBg;                          // 1) 이전 자원 해제
    pBg = nullptr;                       // 2) 잠시 null
    pBg = new Background("new.png");     // 3) 새 자원 — 예외 던지면?
}
```

3번에서 예외 발생 → `pBg`가 nullptr인 상태로 남음. 객체가 **일관성 없는 중간 상태**.

## 세 단계 예외 보증

### 1) 기본 보증 (basic guarantee)

예외 후에도 객체는 **유효한 상태**(어떤 상태인지는 미정 — 그러나 사용 가능).

- 자원 누수 없음
- invariants 유지
- 정확한 상태는 미정 — 사용자가 검사해 적절히 다뤄야

```cpp
class Widget {
    Image* bg;
public:
    void changeBackground(Image* newImg) {
        delete bg;
        bg = newImg;     // delete가 throw하면? newImg는 어디로?
                         // → newImg 누수 가능 — 기본 보증조차 X
    }
};
```

기본 보증을 갖춘 버전:

```cpp
void changeBackground(Image* newImg) {
    std::unique_ptr<Image> hold(newImg);    // 즉시 RAII
    delete bg;
    bg = hold.release();
}
```

RAII로 자원 누수 차단 — 최소한 객체는 유효한 상태(이전 bg는 사라졌지만 새 bg가 nullptr이거나 newImg). 

### 2) 강력 보증 (strong guarantee)

예외 발생 시 **호출 전 상태로 정확히 롤백**. 트랜잭션 같은 의미.

- 함수가 성공 ⇒ 의도된 결과
- 함수가 실패(예외) ⇒ **호출 전과 동일**

```cpp
void changeBackground(Image* newImg) {
    Image* hold = newImg;          // newImg 캡처
    Image* oldBg = bg;
    bg = hold;                     // 새 거 먼저 설정
    delete oldBg;                  // 옛 거 나중 해제
}
```

지점:
- `delete`는 보통 throw하지 않음 — 마지막 단계가 안전
- 만약 `delete`가 throw해도 `bg`는 이미 새 값으로 설정 — 객체는 유효, 옛 자원 누수 가능 (basic 보증)

### 3) nothrow (no-throw guarantee)

예외를 절대 던지지 않음. 가장 강력한 보증.

```cpp
int& at(size_t i) noexcept;     // 항상 성공 — 인자 검증된 후
                                 // (실패 시 std::terminate)
```

내장 타입 연산, 일부 표준 함수가 nothrow. 사용자 함수는 명시적 `noexcept`.

### 보증 표

| 보증 | 자원 누수 | 데이터 일관성 | 사용자 부담 |
| --- | --- | --- | --- |
| **없음** | 가능 | 깨질 수 있음 | 매우 큼 |
| **basic** | X | 유효, 상태 미정 | 검사 필요 |
| **strong** | X | 호출 전 상태 또는 결과 | 작음 |
| **nothrow** | X | 정확한 결과 | 없음 |

## copy-and-swap — 강력 보증 패턴

```cpp
class Widget {
    std::unique_ptr<Image> bg;
public:
    void changeBackground(const Image& newImg) {
        auto temp = std::make_unique<Image>(newImg);   // 1) 사본 생성
                                                        //    실패 시 *this 변경 없음
        std::swap(bg, temp);                            // 2) noexcept swap
                                                        // 3) temp 소멸 → 옛 bg 정리
    }
};
```

**왜 강력 보증?**:
- 1단계 — 새 객체 생성. throw 가능. throw하면 — `*this`는 손도 안 댐.
- 2단계 — swap. **noexcept**. 절대 throw 안 함.
- 결과: 1단계 통과하면 끝까지 안전 = 호출 전 상태 또는 의도된 결과.

`std::swap` 또는 사용자 정의 swap이 noexcept인 것이 핵심 (항목 25).

## 약점 — 보증의 합성

```cpp
void f1();    // 강력 보증
void f2();    // 강력 보증

void compound() {
    f1();
    f2();     // f1 후 f2가 throw하면?
              // → f1의 변화는 그대로 — 객체는 f1과 f2 사이 상태
              // → "호출 전 상태" 아님 — 강력 보증 ❌
              // → 기본 보증은 유지
}
```

**여러 작업의 강력 보증은 자동으로 합성되지 않음**. 강력 보증을 유지하려면:

1. **모든 변화를 임시에 모음** (copy-and-swap)
2. **트랜잭션 클래스로 atomicity 보장**
3. **롤백 가능한 단일 swap으로 commit**

```cpp
void compound() {
    State backup = *this;        // 백업
    try {
        f1();
        f2();
    } catch (...) {
        *this = backup;          // 롤백 (단, dtor가 noexcept여야 안전)
        throw;
    }
}
```

비용은 백업 — 작은 객체면 OK, 큰 자원이면 다른 방법(트랜잭션 객체) 필요.

## 강력 보증이 항상 가능한 건 아님

```cpp
class Container {
public:
    void clearAll() {
        for (auto& item : items) item.cleanup();   // 일부가 throw하면?
        items.clear();
    }
};
```

여러 객체의 cleanup이 각자 throw 가능 — 중간에 throw가 일어나면 일부만 정리. 강력 보증 어려움.

이런 경우엔 **기본 보증**으로 만족 — 모든 객체가 유효 상태, 자원 누수 없음.

## nothrow 함수 식별

```cpp
class C {
public:
    int get() const noexcept;       // 명시
    void swap(C& other) noexcept;   // 명시
    ~C() noexcept;                  // C++11+ 기본 noexcept
};

template<typename T>
void process(T x) noexcept(noexcept(T(x))) { /* ... */ }    // 조건부 noexcept
```

C++11+ `noexcept` 키워드로 명시. 컴파일러도 함수 본문이 nothrow인지 일부 추론.

## 표준 라이브러리의 보증

표준 라이브러리는 일반적으로:

| 함수 | 보증 |
| --- | --- |
| `std::vector::push_back` | strong (이동이 noexcept일 때) 또는 basic |
| `std::vector::insert` | strong (단일 원소) |
| `std::vector::clear` | nothrow |
| `std::sort` | basic (요소 비교/이동이 정상이면) |
| `std::swap` | T의 이동에 따라 추론 |
| 컨테이너 소멸자 | nothrow (요소 dtor가 nothrow면) |

자세한 보증은 표준 문서 — API마다 다름.

## 보증 문서화

함수의 보증은 **인터페이스의 일부**:

```cpp
class Container {
public:
    /// @exceptsafety strong — newImg 생성 실패 시 컨테이너 변경 없음
    void addImage(const Image& newImg);

    /// @exceptsafety nothrow
    void swap(Container& other) noexcept;

    /// @exceptsafety basic — 어떤 원소까지 처리됐는지 미정
    void processAll();
};
```

사용자는 이 문서를 보고 자신의 코드가 어느 수준 안전인지 결정.

## 모던 변형 — strong guarantee via std::move_if_noexcept

```cpp
template<typename T>
void resize(std::vector<T>& v, size_t newSize) {
    for (size_t i = 0; i < newSize; ++i) {
        v[i] = std::move_if_noexcept(source[i]);    // 이동 noexcept면 move, 아니면 copy
    }
}
```

`std::vector`의 재할당이 정확히 이 패턴 — 이동이 noexcept면 strong 보증 유지하며 효율적, 아니면 copy로 fallback.

## 흔한 함정 — 자기 대입 + 예외

```cpp
Widget& operator=(const Widget& rhs) {
    if (this == &rhs) return *this;
    delete pData;
    pData = new Data(*rhs.pData);    // 예외 시 *this 손상 (강력 X)
    return *this;
}
```

해결: copy-and-swap (항목 11).

## 실무 가이드 — 결정

```
이 함수의 예외 보증은?
├── 자원만 다루나 → RAII로 basic 보증 자동 달성
├── 단일 객체 변경 + swap 가능 → copy-and-swap으로 strong
├── 단순 연산만 (내장 타입, 이동) → nothrow 명시
├── 여러 객체 협력 → 트랜잭션 또는 basic으로 만족
└── 합성 함수 → 가장 약한 단계가 결정 — 명시적 백업/롤백 필요
```

## 실무 가이드 — 체크리스트

- [ ] 모든 자원이 RAII로 관리되는가? (basic 보증 자동)
- [ ] 강력 보증이 의미 있는 함수에 copy-and-swap?
- [ ] nothrow 가능한 함수에 `noexcept` 명시?
- [ ] swap이 noexcept인가? (copy-and-swap의 전제)
- [ ] 함수의 보증을 헤더 주석에 명시?
- [ ] 합성 함수의 보증은 가장 약한 단계 — 의식하고 있는가?

## 핵심 정리

1. **모든 함수는 적어도 basic 보증** — RAII로 거의 자동
2. 가능하면 **strong 보증** — copy-and-swap 패턴
3. **nothrow** 함수에 `noexcept` 명시 — 표준 라이브러리 효율
4. 함수의 보증은 **가장 약한 호출의 보증에 의해 제한**
5. 보증은 **인터페이스의 일부** — 문서화

## 관련 항목

- [항목 8: 소멸자 예외](/blog/programming/cpp/effective-cpp/item08-prevent-exceptions-from-leaving-destructors) — nothrow의 적용
- [항목 11: 자기 대입](/blog/programming/cpp/effective-cpp/item11-handle-assignment-to-self-in-operator-equals) — copy-and-swap의 다른 측면
- [항목 13: RAII](/blog/programming/cpp/effective-cpp/item13-use-objects-to-manage-resources) — basic 보증의 기반
- [항목 25: non-throwing swap](/blog/programming/cpp/effective-cpp/item25-consider-support-for-a-non-throwing-swap) — copy-and-swap의 핵심 도구
