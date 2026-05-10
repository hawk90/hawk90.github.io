---
title: "항목 4: 사용 전에 객체를 반드시 초기화하라"
date: 2025-02-01T13:00:00
description: "내장 타입의 함정, 멤버 초기화 리스트, static 객체의 초기화 순서 함정."
tags: [C++, Effective C++, Initialization]
series: "Effective C++"
seriesOrder: 4
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++에서 객체 초기화 규칙은 복잡하고 예외가 많습니다 — 초기화되지 않은 변수에서 읽으면 UB. **모든 객체를 사용 전에 초기화**하는 습관을 들여야 합니다.

## 내장 타입은 자동 초기화 안 됨

```cpp
int x;           // 쓰레기 값
double pi;       // 쓰레기 값
int* p;          // 쓰레기 포인터

// 클래스 안의 내장 타입 멤버도 마찬가지
class Point {
    int x, y;
public:
    Point() {}   // x, y는 쓰레기!
};
```

해결: **항상 초기치를 명시**.

```cpp
int x = 0;
double pi = 3.14;
int* p = nullptr;
```

## 생성자: 대입 vs 초기화 리스트

```cpp
// 대입 — 비효율
class PhoneBook {
    std::string name;
    std::vector<std::string> phones;
public:
    PhoneBook(const std::string& n, const std::vector<std::string>& ps) {
        name = n;       // 1. 기본 생성자 호출 → 2. 대입
        phones = ps;    // 같음
    }
};

// 초기화 리스트 — 효율적
class PhoneBook {
public:
    PhoneBook(const std::string& n, const std::vector<std::string>& ps)
        : name(n), phones(ps) {}    // 복사 생성자 한 번만
};
```

내장 타입이라도 멤버 초기화 리스트로 초기화하는 게 일관성 측면에서 좋습니다.

## 멤버 초기화 순서

멤버는 **선언 순서**대로 초기화됨 — 초기화 리스트 순서와 무관.

```cpp
class Buffer {
    int size;
    char* data;
public:
    Buffer(int s)
        : data(new char[size]),   // 위험! size는 아직 초기화 전
          size(s) {}                // 선언 순서상 size가 먼저인데 리스트에선 나중
};
```

**규칙**: 초기화 리스트도 **선언 순서대로** 적기.

## 다른 컴파일 단위(translation unit)의 static 객체 — 초기화 순서

다른 .cpp 파일의 static 객체들 사이의 초기화 순서는 **정의되지 않음**.

```cpp
// FileA.cpp
extern Database db;            // 어딘가에 정의됨

// FileB.cpp
Database db;                   // 정의

// FileA.cpp의 static 초기화에서 db 참조 → 아직 초기화 안 됐을 수도 있음!
```

해결: **함수 안의 static**으로 (Meyers' Singleton).

```cpp
Database& getDatabase() {
    static Database db;        // 첫 호출 시 초기화 — 항상 안전
    return db;
}
```

이러면 사용 시점에 보장된 초기화. 단 멀티스레드 환경에선 C++11+의 thread-safe static 보장이 필요 (대부분 컴파일러 지원).

## 핵심 정리

1. 내장 타입은 자동 초기화 안 됨 — 명시적 초기치
2. 생성자에선 초기화 리스트 사용 (대입보다 효율적)
3. 초기화 리스트는 멤버 **선언 순서**대로 작성
4. 다른 컴파일 단위 static 의존성은 함수 안 static으로 우회
