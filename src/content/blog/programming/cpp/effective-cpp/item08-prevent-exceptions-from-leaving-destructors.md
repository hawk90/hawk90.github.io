---
title: "항목 8: 소멸자에서 예외가 나가지 않게 하라"
date: 2025-02-02T13:00:00
description: "예외 진행 중 소멸자에서 또 예외 → terminate. 자원 정리 실패 처리 패턴과 C++11 noexcept 기본."
tags: [C++, Effective C++, Destructor, Exception]
series: "Effective C++"
seriesOrder: 8
draft: true
---

## 왜 이 항목이 중요한가?

소멸자는 자원 정리의 마지막 단계다. 파일 close, DB 연결 close, 네트워크 disconnect 모두 **실패 가능한 작업**이다. 이 실패를 어떻게 처리할 것인지가 문제다.

소멸자에서 예외를 던지면 두 가지 자리에서 사고가 난다.

- **이미 다른 예외가 stack unwinding 중**이면 `std::terminate`가 즉시 호출된다. 프로그램이 죽는다.
- **C++11부터 소멸자는 기본 `noexcept`** 다. 명시하지 않아도 throw 시 terminate다.

해결책은 소멸자 안에서 예외를 잡고, 외부에 알려야 할 정리 실패는 별도 메서드(`close()` 등)로 분리하는 것이다. 이 항목은 그 패턴들과 C++11 noexcept의 함의를 정리한다.

## 개요

소멸자에서 예외가 빠져나가면 **이미 다른 예외가 stack unwinding 중일 때 `std::terminate`** 가 호출된다. 자원 정리(파일 close, DB 연결 close, 네트워크 disconnect)는 실패 가능성이 있는 작업이어서, 소멸자 안에서 안전하게 처리해야 합니다. C++11부터 소멸자는 **기본 `noexcept`** — 명시하지 않으면 throw 시 즉시 terminate.

## 필수 개념: stack unwinding 중의 예외

> **초보자를 위한 배경 지식**

<br>

예외가 발생하면 catch될 때까지 호출 스택을 거꾸로 풀어 나갑니다 — 이 과정에서 **로컬 객체의 소멸자가 호출**됩니다.

```cpp
void f() {
    LocalA a;          // 1) a 생성
    LocalB b;          // 2) b 생성
    throw std::runtime_error("oops");
    // ↑ unwinding 시작:
    //   3) b의 소멸자 호출 (역순)
    //   4) a의 소멸자 호출
    //   5) f의 catch로 점프
}
```

이때 `b`나 `a`의 소멸자가 **또 다른 예외를 던지면** — 한 시점에 두 개의 예외가 진행 중이 됨. C++ 표준은 이 경우 `std::terminate`를 호출(프로그램 종료). 표준 라이브러리는 이를 일관되게 다룰 메커니즘을 갖고 있지 않다.

## 함정 — close가 throw할 수 있는 자원

```cpp
class DBConn {
    DBConnection db;
public:
    ~DBConn() {
        db.close();    // ⚠️ close()가 throw하면?
    }
};

void useConns() {
    DBConn c1, c2, c3;
    doStuff();         // 여기서 예외 발생 가능
    // c3 → c2 → c1 순으로 소멸
    // c3 소멸 중 close()가 throw → terminate
}
```

이 상황은 추상적이지 않다. DB 연결 종료, 파일 flush + close, 네트워크 graceful disconnect 모두 실패 가능 동작.

## 해결 1 — 소멸자에서 삼키기

```cpp
~DBConn() {
    try {
        db.close();
    } catch (...) {
        // 로깅 정도 — 예외는 흡수
        logError("DBConn close failed");
    }
}
```

장점: 단순. 항상 안전.
단점: **조용한 실패** — 호출자는 정리 실패를 모름. 적어도 로깅 권장.

## 해결 2 — abort

```cpp
~DBConn() {
    try {
        db.close();
    } catch (...) {
        logError("DBConn close failed — aborting");
        std::abort();
    }
}
```

장점: 명시적인 종료 — 데이터 손상 가능성보다 즉시 종료가 안전한 경우.
단점: 모든 곳에 절절한 정책은 아님. 정말 치명적인 자원 정리 실패에만.

## 해결 3 — 사용자에게 명시적 close 기회 제공

가장 권장되는 패턴:

```cpp
class DBConn {
    DBConnection db;
    bool closed = false;
public:
    void close() {
        db.close();        // 여기서 예외 → 사용자가 처리
        closed = true;
    }

    ~DBConn() {
        if (!closed) {     // 사용자가 close 잊었다면 — fallback
            try {
                db.close();
            } catch (...) {
                logError("DBConn dtor fallback close failed");
            }
        }
    }
};
```

```cpp
void useConn() {
    DBConn c;
    // ... 사용 ...
    c.close();             // 사용자가 명시적으로 호출 — 예외를 직접 처리할 기회
}
```

장점:
- 사용자가 close 결과를 알 수 있음 — 정상 경로에선 예외 전파.
- close를 깜빡해도 소멸자가 fallback.
- 의도가 명확: "예외 가능한 정리는 명시적 호출로".

이 패턴은 std::ofstream`이 정확히 따릅니다 (`close()` 명시 호출 권장, 소멸자는 silent close).

## C++11+ 소멸자의 기본 `noexcept`

```cpp
class C {
public:
    ~C() { /* implicit noexcept */ }
};
```

C++11부터 소멸자는 **기본 `noexcept(true)`** — 명시적으로 `noexcept(false)`를 달지 않는 한 throw 시 즉시 terminate.

```cpp
class CMayThrow {
public:
    ~CMayThrow() noexcept(false) {     // 명시적으로 throw 허용
        if (cond) throw std::runtime_error("oh no");
    }
};
```

명시 안 하면 default가 `noexcept` — throw 가능한 코드를 본문에 두면 컴파일러 경고/에러가 나거나 런타임에 terminate.

### 왜 기본 noexcept인가

표준 라이브러리 컨테이너는 소멸자가 throw하지 않는다고 가정합니다 — `std::vector`가 요소를 지울 때, 한 요소의 소멸이 throw하면 다른 요소들의 처리가 불명확해짐. 컨테이너 보장(strong exception safety 등)이 깨짐.

→ C++11은 모든 소멸자를 기본 noexcept로 두어 "throw 안 함"을 가정하기 쉽게 했음.

## 흔한 실수 — 멤버의 소멸자가 throw할 수 있음

```cpp
class Container {
    std::vector<Risky> items;     // Risky::~Risky가 throw할 수 있다면?
};
```

`Container`의 소멸자는 자동 생성되며 `noexcept(true)`로 추론됨. `Risky::~Risky`가 throw하면 — terminate.

해결: 멤버 클래스의 소멸자가 throw하지 않도록 보장하거나, 정말 throw가 필요하면 `~Risky() noexcept(false)`로 명시 + 컨테이너의 사용 제한.

## 모던 변형 — `std::uncaught_exceptions()`

C++17부터 "현재 unwinding 진행 중인 예외 개수"를 알 수 있음:

```cpp
class Tx {
    int uncaughtOnEntry;
public:
    Tx() : uncaughtOnEntry(std::uncaught_exceptions()) {}

    ~Tx() noexcept(false) {
        if (std::uncaught_exceptions() > uncaughtOnEntry) {
            // 예외 진행 중 — 정리만, throw 금지
            rollback();
        } else {
            commit();                  // throw 가능
        }
    }
};
```

스코프 진입 시의 예외 수와 비교 — 진행 중이면 conservative, 아니면 throw 허용.
(이 패턴은 정밀하지만 복잡 — 대부분의 경우 단순한 삼키기/명시 close가 더 안전.)

## 실무 가이드 — 결정 트리

```
이 자원의 정리(close/release)가 throw할 수 있는가?
├── 아니오 → 소멸자에 그대로 호출 (대부분의 경우)
└── 예
    ├── 호출자가 예외 처리할 기회를 줘야 하는가?
    │   ├── 예 → 명시적 close() 멤버 + 소멸자는 fallback (catch all)
    │   └── 아니오 (silent 정리) → 소멸자에서 try/catch로 삼킴
    └── 정리 실패가 데이터 무결성을 위협하는가?
        └── 예 → catch에서 abort()
```

## 실무 가이드 — 체크리스트

- [ ] 소멸자에서 예외 가능한 호출이 있는가?
- [ ] 있다면 try/catch로 감싸 throw가 빠져나가지 않게?
- [ ] 사용자가 정리 결과를 알아야 하면 명시적 close() 제공?
- [ ] noexcept(false)가 필요한 경우엔 명시?
- [ ] 멤버 객체의 소멸자도 throw 안전한가? (컨테이너에 담을 때 특히)

## 핵심 정리

1. 소멸자에서 예외 빠져나가면 — 다른 예외 진행 중이면 **terminate**
2. **소멸자 안에서 처리**: try/catch로 삼키거나 abort
3. **권장 패턴**: 사용자에게 명시적 `close()` 제공 + 소멸자는 fallback
4. **C++11+ 소멸자는 기본 `noexcept`** — throw하려면 `noexcept(false)` 명시
5. 표준 라이브러리 컨테이너는 요소 소멸자가 throw 안 함을 가정

## 관련 항목

- [항목 7: 다형성 base에 virtual 소멸자](/blog/programming/cpp/effective-cpp/item07-declare-destructors-virtual-in-polymorphic-base-classes) — 소멸자의 또 다른 결정
- [항목 13: 자원 관리에는 객체](/blog/programming/cpp/effective-cpp/item13-use-objects-to-manage-resources) — RAII의 소멸자가 핵심
- [항목 29: 예외 안전 코드](/blog/programming/cpp/effective-cpp/item29-strive-for-exception-safe-code) — 강력한 예외 보증의 한 축
