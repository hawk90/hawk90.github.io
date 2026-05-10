---
title: "항목 8: 소멸자에서 예외가 나가지 않게 하라"
date: 2025-02-02T13:00:00
description: "예외 발생 중 소멸자에서 또 예외 → terminate. 해결 패턴."
tags: [C++, Effective C++, Destructor, Exception]
series: "Effective C++"
seriesOrder: 8
draft: true
---

> **초안** — 정리 진행 중

## 개요

소멸자에서 예외가 빠져나가면 **이미 다른 예외가 진행 중일 때 `std::terminate`**가 호출됩니다. 자원 정리(파일 close, DB 연결 close 등)에서 예외 가능성이 있으면 안에서 처리해야 합니다.

## 함정

```cpp
class DBConn {
    DBConnection db;
public:
    ~DBConn() { db.close(); }   // close()가 예외를 던지면?
};

void f() {
    DBConn c1, c2;
    // c1, c2 소멸 중 c1.close()가 throw → c2 소멸자가 또 throw → terminate
}
```

## 해결 1: 소멸자에서 삼키기

```cpp
~DBConn() {
    try {
        db.close();
    } catch (...) {
        // 로깅만 — 예외는 삼킴
    }
}
```

조용히 실패하므로 사용자가 모를 수 있음. 적어도 로깅 권장.

## 해결 2: terminate

```cpp
~DBConn() {
    try {
        db.close();
    } catch (...) {
        std::abort();   // 정리 실패는 치명적이라 보고 종료
    }
}
```

자원 정리 실패가 진짜 치명적일 때만.

## 권장 패턴 — 사용자가 명시적으로 close 호출

```cpp
class DBConn {
    DBConnection db;
    bool closed = false;
public:
    void close() {
        db.close();    // 여기서 예외 → 사용자가 처리
        closed = true;
    }

    ~DBConn() {
        if (!closed) {
            try { db.close(); }
            catch (...) { /* 로깅 */ }
        }
    }
};
```

명시적 `close()`를 권장하면 사용자가 예외를 처리할 기회를 가짐. 깜빡 잊으면 소멸자가 fallback.

## C++11+ 기본 noexcept

C++11부터 소멸자는 기본적으로 `noexcept`. 명시적으로 `noexcept(false)`를 달지 않는 한 throw하면 즉시 terminate.

## 핵심 정리

1. 소멸자에서 예외 빠져나가면 위험 — 다른 예외 진행 중이면 terminate
2. 소멸자 안에서 try/catch로 처리 (삼키거나 abort)
3. 더 좋은 방법: 사용자가 명시적 close 호출하도록 API 설계
4. C++11+ 소멸자는 기본 noexcept
